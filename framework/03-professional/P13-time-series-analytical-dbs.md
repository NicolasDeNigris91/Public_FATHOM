---
module: P13
title: Time-Series & Analytical Databases — TimescaleDB, ClickHouse, Columnar, OLAP
stage: professional
prereqs: [A09, P07]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# P13 — Time-Series & Analytical Databases

## 1. Problema de Engenharia

OLTP e OLAP são problemas diferentes. Postgres (A09) é otimizado pra row-wise transactional: leitura/escrita de rows individuais, joins em PKs, alta concorrência. **Analytics**, observability e time-series têm shape oposto: bilhões de rows, queries sobre **muitas linhas com poucas colunas**, agregações (SUM, AVG, percentiles), filtros temporais, retention policies.

Tentar fazer dashboards Grafana ou agregações de billing em Postgres puro vai funcionar até dezenas de milhões — depois você sente. **Columnar storage** muda regras: ler só as colunas usadas, comprimir agressivamente (delta-of-delta, dictionary, RLE), agregação vetorizada. ClickHouse, DuckDB, BigQuery, Snowflake, Druid, Pinot, Apache Doris vivem nesse espaço. **TimescaleDB** atravessa: extensão Postgres com hypertables + columnar compressão pra dados antigos.

Este módulo é **OLAP por dentro**: row-vs-column store, vectorized execution, columnar compression, time-series specifics (downsampling, retention, continuous aggregates), OLAP cubes vs columnar, particionamento, e quando manter dados em OLTP vs separar.

---

## 2. Teoria Hard

### 2.1 OLTP vs OLAP

- **OLTP** (Online Transactional Processing): muitas transações curtas, alta concorrência, foco em correctness e latency. Postgres, MySQL, Oracle.
- **OLAP** (Online Analytical Processing): poucas queries grandes, throughput-oriented, scan/aggregate sobre histórico. ClickHouse, BigQuery, Snowflake, Redshift, DuckDB.

Dimensões: row vs column, normalized vs star schema, indexed access vs full scan, point queries vs aggregations.

Tentar OLAP em OLTP DB falha em scale. Tentar OLTP em OLAP falha em latency e concorrência.

### 2.2 Row-store vs column-store

Row-store (Postgres): linhas armazenadas contiguamente. `SELECT * WHERE id=...` é fast (lê 1 page).

Column-store: cada coluna armazenada separadamente. Queries que tocam poucas colunas leem pouco disco. `SELECT SUM(amount) WHERE date>...` lê apenas `amount` e `date`, não toda row.

Trade-offs:
- Column-store: muito melhor compressão (valores similares juntos), vectorized exec, leituras seletivas.
- Row-store: writes/updates simples, transações OLTP boas.

### 2.3 Vectorized execution

CPU moderna usa SIMD (AVX2, AVX-512). Vectorized engines processam **batches de valores** por operação. Em vez de "loop por row, pra cada row faça op", "loop por column chunk, aplique op em 1024 valores".

Cache friendly + SIMD friendly. Aceleração 10-100x em scans/aggregations. ClickHouse e DuckDB são exemplos canônicos.

### 2.4 Compressão columnar

Por colunas tipadas, técnicas baratas funcionam:
- **Dictionary**: valores únicos em dicionário, dados viram índices.
- **RLE** (Run-Length Encoding): runs de valor repetido como `(value, count)`.
- **Delta**: diferenças sucessivas (timestamps quase ordenados → deltas pequenos).
- **Delta-of-delta**: ótimo pra timestamps de monitoring (intervalo regular).
- **Bit packing**: usar só bits necessários.
- **LZ4 / ZSTD**: aplicado por bloco.

Compressão típica em time-series: 5-10x. Dados de monitoring chegam a 20x.

### 2.5 ClickHouse: arquitetura

ClickHouse (Yandex) é column-store distribuído.
- **MergeTree** family de engines. Dados em **parts** (arquivos imutáveis) que merge em background (LSM-style).
- **PRIMARY KEY** (ORDER BY) define ordenação física; sparse primary index (1 entry / 8192 rows). Skip indexes (min/max, set, bloom) por bloco.
- Sharding por hash; replication via Keeper (ZooKeeper-compat).
- **Materialized views** updam em insert. Útil pra agregações pré-computadas.

Queries: SQL-like. Funções analíticas ricas (`uniqHLL12` HLL approx, percentiles via t-digest, arrays nativas).

Forças: ingestão maciça, queries de agregação rapidíssimas. Fraquezas: updates/deletes caros (ALTER TABLE UPDATE é mutation pesada), point-lookups menos rápidos que OLTP.

### 2.6 TimescaleDB

Extensão Postgres. **Hypertable**: tabela "lógica" segmentada em **chunks** por tempo (ex: 1 chunk por dia). Cada chunk é tabela Postgres regular. Queries com filtro de tempo só tocam chunks relevantes (chunk pruning).

Recursos:
- **Compressão columnar** em chunks antigos (transparente).
- **Continuous aggregates**: materialized views que mantêm agregação por bucket de tempo, refreshed incrementally.
- **Retention policies**: drop chunks > N dias.
- **Hyperfunctions**: `time_bucket`, `histogram`, `percentile_cont`, gap-fill.
- Compatível com tudo Postgres (ORM, drivers, FK).

Trade-off: integra bem com app Postgres existente; menos performance bruta que ClickHouse em grande scale (10B+ rows). Bom até dezenas de bilhões.

### 2.7 DuckDB

In-process columnar (como SQLite, mas analytical). Lê Parquet, CSV, Arrow. Sem servidor — embed em app.

Use cases: ETL local, analytics dentro de notebook, query Parquet em S3 sem subir cluster, Logística analytics offline.

### 2.8 Star schema vs wide tables

OLAP clássico: **star schema** (fact table central + dimensions). Joins resolvidos em query.

OLAP moderno: **wide denormalized table**. Joins evitados; storage é barato; compressão lida com redundância. ClickHouse e BigQuery favorecem.

Snowflake (data warehouse) escolhe estilo conforme team.

### 2.9 Particionamento

Particionar tabelas por chave (tempo, tenant, hash). Postgres declarative partitioning, TimescaleDB chunks, ClickHouse PARTITION BY.

Benefícios: pruning (só toca partições relevantes), retention barata (drop partition), vacuum local.

Anti-pattern: partition key sem cardinalidade (1 partição) ou explosão (10k partições pequenas). Tipicamente partition por dia/semana.

### 2.10 Time-series specifics

Padrões:
- **Downsampling**: agregar resolução fina pra grosseira (1s → 1min → 1h) com retention diferente.
- **Gap filling**: timestamps faltando → interpolar/forward-fill.
- **Continuous aggregates** (Timescale) / **Materialized views with refresh** (Postgres).
- **Hot/Warm/Cold storage**: dados recentes em SSD, antigos em S3.

### 2.11 Data lakes e lakehouse

Parquet em S3 + catalog (Iceberg, Delta Lake, Hudi) = **lakehouse**. Engines (Trino, Spark, DuckDB, ClickHouse external) consultam.

Vantagens: cheap storage, separation of compute/storage, multi-engine acesso.

Iceberg: tabelas ACID em data lake (snapshots, time travel). Adoção crescendo (Databricks, Snowflake adicionaram). Padrão emergente.

### 2.12 Cardinality e sketches

Em analytics, queries `COUNT(DISTINCT x)` em bilhões de rows são caros. **Approximate**:
- **HyperLogLog (HLL)**: count distinct com erro ~2%, memory log log.
- **t-digest / Q-digest**: percentiles approximate.
- **Bloom filters**: existência aproximada.
- **Count-Min Sketch**: top-K aproximado.

ClickHouse tem `uniqHLL12`, `quantilesTDigest`. Postgres extension `hll`. Indispensável em high-cardinality.

### 2.13 Query optimization analítico

- **Predicate pushdown**: filtros perto do scan.
- **Projection pushdown**: lê só colunas necessárias.
- **Partition pruning**.
- **Bloom/min-max skip indexes**.
- **Bitmap indexes** (em algumas DBs).
- **Pre-aggregation**: materialized views, summary tables.

Você raramente otimiza no nível baixo; conhecer ajuda diagnosticar quando query é lenta.

### 2.14 Ingest patterns

OLAP ingere via batch (preferido) ou stream:
- **Batch insert grandes** (10k-1M rows): otimal (compressão, merges menores).
- **Bulk loaders**: ClickHouse `clickhouse-client --query=...`, COPY em Postgres/Timescale.
- **Streaming via Kafka**: ClickHouse Kafka engine, Confluent connectors. Buffer e flush.
- **CDC** de OLTP pra OLAP: Debezium → Kafka → sink.

Anti-pattern: 1 row por insert no ClickHouse. Mata performance.

### 2.15 Quando NÃO usar columnar

- Workload OLTP típico (CRUD, joins por PK).
- Dados pequenos (< 1M rows): Postgres faz.
- Necessidade de updates/deletes frequentes em rows individuais.

Regra: se queries são "point lookup ou small range" → OLTP. Se são "scan e agregue muito" → OLAP. Misto: replica OLTP → OLAP via CDC.

### 2.16 Druid e Pinot

Real-time OLAP otimizado pra dashboards interativos com latency baixa. Apache Druid (Imply), Apache Pinot (LinkedIn). Dimensão de tempo central; segmentos em hot tier; queries via SQL/JSON.

Use case: dashboards user-facing com SLA sub-segundo em bilhões de rows. Mais complexo de operar que ClickHouse.

### 2.17 OLAP em produto real

Logística analytics:
- **Métricas de operação**: tempo médio de entrega por região por dia.
- **Receita**: revenue per tenant, take rate, ARPU.
- **Funnels**: % pedidos que viram entrega completa.
- **Cohorts**: retention de lojistas.

Esses queries não cabem bem em OLTP. Pipeline: Postgres OLTP → CDC → ClickHouse/Timescale → dashboards. Mantém OLTP performante; analytics tem palco próprio.

---

## 3. Repeating threshold dropped

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Diferenciar OLTP e OLAP por shape de query.
- Explicar por que column-store comprime mais que row-store.
- Listar 4 técnicas de compressão columnar.
- Explicar vectorized execution e SIMD em uma frase.
- Diferenciar ClickHouse e TimescaleDB; quando cada um.
- Justificar partition pruning e dar exemplo (filtro temporal).
- Explicar HyperLogLog e quando usar approximate counting.
- Diferenciar star schema vs wide denormalized table; trade-off.
- Justificar batch ingest vs row-by-row em ClickHouse.
- Explicar continuous aggregates do Timescale.
- Justificar pipeline OLTP → CDC → OLAP em vez de unified storage.

---

## 4. Desafio de Engenharia

Adicionar **camada analítica** à Logística com TimescaleDB + ClickHouse para diferentes domínios.

### Especificação

1. **TimescaleDB** (mesma instância Postgres + extension):
   - Hypertable `delivery_metrics(tenant_id, courier_id, started_at, finished_at, distance_km, fuel_cost, status)`.
   - Hypertable `location_pings(courier_id, ts, lat, lng, speed)`.
   - Continuous aggregates: `daily_metrics_per_tenant`, `hourly_courier_throughput`.
   - Retention: drop pings > 30d; metrics > 2 anos.
   - Compression policy em chunks > 7d.
2. **ClickHouse** (Docker):
   - Table `events_log` ingerindo todos eventos (`order_created`, `assigned`, `picked_up`, ...).
   - PARTITION BY toYYYYMM(ts), ORDER BY (tenant_id, ts, event_type).
   - Materialized view `revenue_daily_mv` agregando GMV/take rate por tenant por dia.
3. **Pipeline**:
   - Postgres CDC (Debezium ou logical replication slot custom) → Kafka → consumer Node que insere em batch (10k rows / 5s) no ClickHouse.
   - Idempotency via offset por partition.
4. **Dashboards**:
   - Grafana com 2 datasources (Timescale + ClickHouse).
   - Painéis: P50/P95 tempo entrega por região, GMV diário, % entregas no SLA, top 10 lojistas, heatmap de demanda por hora-do-dia.
5. **Queries de produto**:
   - "Lojista X tem retention M+1 / M+2 / M+3 dos últimos 6 meses?" — SQL com cohorts.
   - "Distribuição de tempos de entrega no último mês com percentis P50/P75/P90/P99 via t-digest."
6. **Bench**:
   - Simule 100M de location pings ingest.
   - Compare latência de query "throughput por hora últimos 30d" em (a) Postgres puro, (b) Timescale com continuous agg, (c) ClickHouse. Documente em `bench.md`.

### Restrições

- Pipeline **idempotente** (re-ingestão não duplica).
- Uso de approximate functions (HLL, t-digest) onde apropriado.
- Retention/compression policies declarativas.
- Sem `SELECT *`; sempre projection.

### Threshold

- Dashboard rendering < 2s em queries de 30 dias com 100M rows.
- `bench.md` mostra ClickHouse > Timescale > Postgres pra agregação grande, com números.
- Pipeline reprocessa últimos 24h sem duplicates após reset.

### Stretch

- **Apache Iceberg**: snapshot de events_log em S3 (MinIO local), query via DuckDB.
- **Real-time** dashboard com WebSocket pull do ClickHouse cada 5s; usuário vê GMV ao vivo.
- **Anomaly detection**: rule-based alerts (entregas P95 > X mins → Slack).
- **Cost simulation**: estimar custo de manter ClickHouse vs BigQuery pro mesmo workload.

---

## 5. Extensões e Conexões

- Liga com **N04** (data structures): B-Tree, LSM, sketches.
- Liga com **A09** (Postgres): base; Timescale é extension.
- Liga com **A11** (Redis): cache de query OLAP em apps user-facing.
- Liga com **P02** (Docker): rodar ClickHouse local.
- Liga com **P07** (observability): métricas/logs/traces vão pra time-series store.
- Liga com **P10** (backend perf): profilagem com base em data.
- Liga com **S02** (messaging): Kafka como backbone do pipeline.
- Liga com **S03** (event-driven): events são fonte primária do warehouse.
- Liga com **S10** (AI/LLM): vector DB + analytics pra contexto.
- Liga com **S16** (product): unit economics dependem desses dashboards.

---

## 6. Referências

- **"Designing Data-Intensive Applications"** — Kleppmann, capítulo 3 (storage), 10 (batch).
- **ClickHouse docs** ([clickhouse.com/docs](https://clickhouse.com/docs)).
- **TimescaleDB docs**.
- **DuckDB docs**.
- **"Apache Iceberg: The Definitive Guide"** — Tomer Shiran et al.
- **"Building a Data Warehouse"** — William Inmon (clássico).
- **"The Data Warehouse Toolkit"** — Ralph Kimball (star schema bíblia).
- **HyperLogLog paper** — Flajolet, Fusy, Gandouet, Meunier.
- **"t-digest" paper** — Ted Dunning.
- **Materialize, RisingWave docs** — streaming SQL alternatives.
