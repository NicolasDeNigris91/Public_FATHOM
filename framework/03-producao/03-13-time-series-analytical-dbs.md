---
module: 03-13
title: Time-Series & Analytical Databases, TimescaleDB, ClickHouse, Columnar, OLAP
stage: producao
prereqs: [02-09, 03-07]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 03-13, Time-Series & Analytical Databases

## 1. Problema de Engenharia

OLTP e OLAP são problemas diferentes. Postgres (02-09) é otimizado pra row-wise transactional: leitura/escrita de rows individuais, joins em PKs, alta concorrência. **Analytics**, observability e time-series têm shape oposto: bilhões de rows, queries sobre **muitas linhas com poucas colunas**, agregações (SUM, AVG, percentiles), filtros temporais, retention policies.

Tentar fazer dashboards Grafana ou agregações de billing em Postgres puro vai funcionar até dezenas de milhões, depois você sente. **Columnar storage** muda regras: ler só as colunas usadas, comprimir agressivamente (delta-of-delta, dictionary, RLE), agregação vetorizada. ClickHouse, DuckDB, BigQuery, Snowflake, Druid, Pinot, Apache Doris vivem nesse espaço. **TimescaleDB** atravessa: extensão Postgres com hypertables + columnar compressão pra dados antigos.

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

In-process columnar (como SQLite, mas analytical). Lê Parquet, CSV, Arrow. Sem servidor, embed em app.

Use cases: ETL local, analytics dentro de notebook, query Parquet em 04-03 sem subir cluster, Logística analytics offline.

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
- **Hot/Warm/Cold storage**: dados recentes em SSD, antigos em 04-03.

### 2.11 Data lakes e lakehouse

Parquet em 04-03 + catalog (Iceberg, Delta Lake, Hudi) = **lakehouse**. Engines (Trino, Spark, DuckDB, ClickHouse external) consultam.

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

#### Decision tree analytics 2026 — Logística como exemplo

Cenário: Logística v2 precisa analytics — daily revenue por lojista, courier utilization, time-to-delivery por região, cohort de clientes. Volume cresce de 1M pings/dia em v1 pra 100M pings/dia em v3. Decision tree por estágio:

**Cenário 1: < 1M rows agregadas/dia, < 1k MAU dashboard**
- **Postgres com índices BRIN + materialized views**. Custos zero (DB já existe). BRIN indexes em colunas time-ordered (`created_at`, `delivered_at`) consomem ~0.01% do espaço de B-Tree e queries de agregação por range são 10-100x mais rápidas.
- Refresh materialized views via cron (Airflow / Dagster overkill aqui — `pg_cron` ou GitHub Actions cron HTTP).
- Quando vira dor: dashboard demora > 5s, ou refresh excede janela noturna.

**Cenário 2: 1M-100M rows/dia, < 100 dashboards concurrent**
- **TimescaleDB** (Postgres extension): hypertables (sharding automático por tempo), continuous aggregates (materialized views auto-refreshed em insert), compression em chunks antigos (10-100x reduction).
- DX praticamente igual a Postgres puro: mesmo SQL, mesmo driver, mesma transação. Migration suave de §2.14.
- Custos: Timescale Cloud ~$30-300/mês pra Logística médio; self-host em Postgres existente é ~zero.
- Quando vira dor: queries agregadas de billion+ rows demoram, ou throughput de insert satura write workers.

**Cenário 3: 100M+ rows/dia, dashboards complexos com joins, multi-tenant SaaS**
- **ClickHouse**: column-store distribuído state-of-art. Insert throughput 100k-1M rows/s/node. Queries em billion-row tables em < 1s com índices skipping certos.
- Curva de aprendizado: é DB diferente (não-Postgres). MergeTree engine variants, materialized views como pipelines de ingestion. ALTER caro; schema evolution exige planejamento.
- ClickHouse Cloud (~$200-2k/mês) ou self-host (3-node em ARM Graviton ~$300/mês). Comparação Snowflake/BigQuery: ClickHouse vence em $/query absoluto, perde em "managed completo + access control + integrations".
- Quando vira dor: você precisa transactional (ACID com strong consistency em writes) — então ClickHouse não cabe; volta pra Timescale ou Postgres.

**Cenário 4: ad-hoc analytics interno, dataset cabe em laptop ou single-node**
- **DuckDB** embedded. Lê Parquet/CSV/JSON direto, query SQL Postgres-compatible, zero infra.
- Use case Logística: `analyst.duckdb` carrega dump diário do Postgres + S3 logs, gera relatórios em 30s.
- Integra com Python/notebook (`pandas.read_sql_query(... duckdb ...)`).
- Limitação: single-node; dataset > RAM precisa estratégia (lazy scan + limits).

**Cenário 5: SaaS analítico managed, time prefere zero-ops**
- **BigQuery**, **Snowflake**, **Athena** (S3 + Iceberg/Hive metastore).
- Pricing por query (BigQuery on-demand) ou compute warehouse (Snowflake): pode explodir. **Always set query cost cap**.
- Vence quando: time pequeno, sem infra eng dedicado, OK com lock-in cloud, queries complex com governança / row-level security nativa.
- Anti-padrão comum: começar com Snowflake "porque é fácil"; em 2 anos, $50k/mês de bill que ClickHouse self-managed faria com $2k.

**Cenário 6: real-time interactive dashboards (sub-segundo)**
- **Apache Druid** (Imply Polaris managed) ou **Apache Pinot** (StarTree managed). Streaming ingest direto de Kafka, queries < 100ms em dashboards com filtros.
- Use case: Logística "métricas em tempo real do supply chain" — SLA < 1s pra dashboard com 50 widgets.
- Custo operacional alto self-managed; Druid/Pinot têm 10+ services pra rodar.

**Cenário 7: lakehouse (data lake + warehouse semantics)**
- **Iceberg** + ClickHouse / Trino / Spark. Tabelas Iceberg em S3, metadata em catalog (AWS Glue, Nessie). Multi-engine: ClickHouse query mesma tabela que Spark batch.
- 2026 é ano de adoção mainstream (Snowflake, Databricks, BigQuery suportam Iceberg native).
- Use case: dados do Logística viram lake (auditoria + ML training data); ClickHouse + DuckDB consomem mesmo lake.

#### Matriz resumida pra Logística

| Estágio Logística | Volume | Recomendação |
|---|---|---|
| v1 (CAPSTONE-plataforma) | < 100k pedidos | Postgres + BRIN + matviews |
| v2 (CAPSTONE-producao) | 1-10M pedidos/mês | Postgres OLTP + TimescaleDB pra tracking pings + DuckDB pra ad-hoc |
| v3 (CAPSTONE-sistemas) | 100M+ pings/dia | OLTP Postgres + ClickHouse via CDC pra analytics + Iceberg pra histórico |
| v4 (CAPSTONE-amplitude) | + ML pipeline + multi-region | Adiciona Druid/Pinot pra real-time supply chain dashboard |

Cruza com **02-09 §2.13.1** (CDC alimenta o pipeline OLTP → OLAP), **04-13** (streaming engines fazem transformação no caminho), **04-09 §2.14** (custo cloud quando volume cresce).

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

### 2.18 ClickHouse query optimization deep — skip indexes, projections, materialized views

Decisão "ClickHouse" só vence se schema + queries são otimizados. Default de `ORDER BY (timestamp)` em fact table de 10B rows com WHERE em outra coluna = full scan, mesma latência que Postgres pesado. ClickHouse vence quando você usa primary key (sorting key) certo + skip indexes + projections + materialized views — patterns operacionais com código.

**Foundation: sorting key (PRIMARY KEY) escolhido como filtro frequente.**

```sql
-- Bad: sort por timestamp; queries comuns filtram por tenant
CREATE TABLE events (
  event_at DateTime,
  tenant_id UUID,
  event_type LowCardinality(String),
  payload String
) ENGINE = MergeTree
ORDER BY (event_at);

-- Good: tenant-first, queries WHERE tenant_id = X filtram blocos cedo
CREATE TABLE events (
  event_at DateTime,
  tenant_id UUID,
  event_type LowCardinality(String),
  payload String
) ENGINE = MergeTree
ORDER BY (tenant_id, event_type, event_at)
PARTITION BY toYYYYMM(event_at)
SETTINGS index_granularity = 8192;
```

- Sorting key ≠ unique key. ClickHouse não enforces uniqueness em MergeTree.
- Order columns: most-selective filter primeiro (tenant_id), then secondary (event_type), then time (event_at) pra range scans.
- `index_granularity = 8192` (default): 1 mark por 8192 rows. Mais granular = mark file maior + lookup mais rápido. Tune só se medir.

**Skip indexes — segundo filtro embutido.**

```sql
-- Skip index pra coluna NÃO no sorting key
ALTER TABLE events ADD INDEX idx_event_type event_type TYPE set(100) GRANULARITY 4;
ALTER TABLE events ADD INDEX idx_user_id user_id TYPE bloom_filter(0.01) GRANULARITY 1;
ALTER TABLE events ADD INDEX idx_payload_kw payload TYPE tokenbf_v1(8192, 3, 0) GRANULARITY 1;
```

Tipos:
- `minmax`: armazena min/max por granule. Vence em range queries.
- `set(N)`: armazena set de até N values por granule. Vence em equality em coluna low-cardinality.
- `bloom_filter(p)`: probabilistic, p = false positive rate. Vence em equality em high-cardinality.
- `tokenbf_v1(size, k, seed)`: bloom filter sobre tokens. Vence em LIKE/IN textual.
- `ngrambf_v1(n, size, k, seed)`: bloom de n-grams. Vence em LIKE substring.

Pegadinha: skip index NÃO acelera nada se query JÁ filtra granules via sorting key bem. Skip index brilha em queries que NÃO casam com sorting key.

Validate via:

```sql
EXPLAIN indexes = 1
SELECT count() FROM events WHERE user_id = 'abc';
-- Procure: "Skip" sections; "Granules: 12/8000" = pulou 99.85%.
```

**Projections — segunda cópia ordenada do dado, transparente.**

```sql
-- Tabela base ordenada por (tenant_id, event_at)
-- Mas tem dashboard que agrupa por user_id em jornal diário
ALTER TABLE events ADD PROJECTION p_user_daily (
  SELECT
    toDate(event_at) as day,
    user_id,
    count() as events_count,
    countIf(event_type = 'click') as clicks
  GROUP BY day, user_id
);

ALTER TABLE events MATERIALIZE PROJECTION p_user_daily;
```

- ClickHouse 22+ feature. Stored em part dirs, atualizado automaticamente em INSERT.
- Query `SELECT day, user_id, sum(events_count)` automaticamente roteia pra projection (transparente).
- Custo: 2x storage; 2x write amplification. Use APENAS quando ROI compensa (dashboard rodando 100x/dia).

**Materialized views — pipeline de transformação on-insert.**

```sql
-- MV agrega events em métricas hourly em tabela separada
CREATE TABLE metrics_hourly (
  hour DateTime,
  tenant_id UUID,
  event_type LowCardinality(String),
  count UInt64,
  unique_users AggregateFunction(uniq, UUID)
) ENGINE = AggregatingMergeTree
ORDER BY (tenant_id, event_type, hour);

CREATE MATERIALIZED VIEW mv_metrics_hourly TO metrics_hourly AS
SELECT
  toStartOfHour(event_at) as hour,
  tenant_id,
  event_type,
  count() as count,
  uniqState(user_id) as unique_users
FROM events
GROUP BY hour, tenant_id, event_type;
```

- MV ≠ Postgres MV: ClickHouse MV é trigger ON INSERT — recebe BLOCO de novos rows, não tabela inteira.
- `AggregateFunction(uniq, UUID)` + `uniqState`/`uniqMerge` permite incremental aggregation correta (HyperLogLog state).
- Query final: `SELECT hour, sum(count), uniqMerge(unique_users) FROM metrics_hourly WHERE tenant_id = X GROUP BY hour`.
- Pegadinha: MV não roda em backfill — só em INSERTs futuros. Pra backfill: `INSERT INTO metrics_hourly SELECT toStartOfHour(event_at), ..., FROM events WHERE event_at < now()`.

**Logística caso real — fact_tracking_pings.**

```sql
CREATE TABLE fact_tracking_pings (
  ping_at DateTime64(3),
  tenant_id UUID,
  courier_id UUID,
  order_id UUID,
  lat Float64,
  lng Float64,
  speed_kmh Float32,
  accuracy_m Float32
) ENGINE = MergeTree
ORDER BY (tenant_id, courier_id, ping_at)
PARTITION BY toYYYYMM(ping_at)
TTL ping_at + INTERVAL 90 DAY DELETE,
    ping_at + INTERVAL 7 DAY TO VOLUME 'cold'
SETTINGS storage_policy = 'hot_cold';

-- Skip pra queries ad-hoc por order
ALTER TABLE fact_tracking_pings ADD INDEX idx_order order_id TYPE bloom_filter(0.01) GRANULARITY 4;

-- Projection pra trajetória de ordem (queried pelo customer support)
ALTER TABLE fact_tracking_pings ADD PROJECTION p_by_order (
  SELECT * ORDER BY (order_id, ping_at)
);
```

- TTL com tier cold (S3 backed): hot 7 dias em SSD, depois move pra S3 automatic.
- Bloom filter resolve "find pings de uma order específica" sem alterar sorting key.
- Projection `p_by_order`: replica ordenada por `order_id`; query de trajetória usa-a transparente.

**Query rewrite patterns que ganham ordens de magnitude.**

PREWHERE — filtro avaliado ANTES de ler colunas não-filtradas:

```sql
-- ClickHouse já faz auto, mas pode hint
SELECT lat, lng FROM fact_tracking_pings
PREWHERE tenant_id = '...' AND ping_at > now() - INTERVAL 1 HOUR
WHERE speed_kmh > 80;
```

PREWHERE: filtro cheap (sorted columns), evita ler colunas pesadas.

`SAMPLE` — query estatística aproximada usando subset:

```sql
SELECT avg(speed_kmh) FROM fact_tracking_pings
SAMPLE 0.1
WHERE tenant_id = '...';
```

10x menos data, ~3% erro estatístico. Use em dashboards exploratórios. Requer `SAMPLE BY` definido em CREATE TABLE.

`LIMIT N BY` — top-N por grupo sem subquery:

```sql
-- Top 5 ordens com mais pings por courier
SELECT courier_id, order_id, count() as pings
FROM fact_tracking_pings
GROUP BY courier_id, order_id
ORDER BY courier_id, pings DESC
LIMIT 5 BY courier_id;
```

**Anti-patterns observados.**

- `SELECT *` em wide table: lê todas colunas mesmo precisando 2. ClickHouse columnar: lista colunas explícitas.
- JOIN heavy em fact tables: ClickHouse JOIN é build-side broadcast por padrão; fact-fact JOIN destrói perf. Use `joinGet`, dictionary, ou denormalize.
- Skip index sem `EXPLAIN indexes=1` validation: cria índice "porque achei que ajudaria" mas nunca é usado. Sempre validate.
- Sorting key com 10 colunas: índice mark file enorme; mark lookup lento. Cap em 3-4 colunas.
- Update/delete frequente: ClickHouse não é OLTP. `ALTER TABLE ... UPDATE` é assíncrono via mutation; lento + perigoso. Use ReplacingMergeTree + `FINAL` ou ReplaceableMergeTree.
- `ORDER BY` sem `LIMIT`: streams full result; pode quebrar memory limit. Set `max_bytes_before_external_sort` se preciso ordenar muito.
- Sem PARTITION BY: full-table scan em filter por mês quando podia pular partitions inteiras.

**Diagnostic toolbox.**

- `system.query_log`: query history com type, duration, memory, read_rows.
- `system.parts`: partições por tabela; busque parts grandes não-merged (`active = 1`, `level` baixo).
- `system.mutations`: mutations em-flight; órfãs travam space.
- `clickhouse-benchmark` pra repro testing.
- `EXPLAIN PIPELINE` pra ver vectorized execution.

Cruza com **03-13 §2.13** (query optimization geral), **03-13 §2.15** (decision tree onde ClickHouse cabe), **04-13 §2.9.1** (dbt incremental + ClickHouse), **04-13 §2.11** (Iceberg como fonte external table).

### 2.19 Time-series storage decision matrix 2026 (Prometheus, VictoriaMetrics, Mimir, ClickHouse, TimescaleDB)

Time-series é guarda-chuva pra workloads bem distintos. Tratar tudo com a mesma ferramenta = 10-100x cost overhead. Categorize antes de escolher.

**Workload categorization.**

- **Operational metrics** (Prometheus-style, RED + USE): low cardinality (1k-100k series active), sub-minute scrape, alerting + dashboards. Storage 30 dias quente + 1 ano frio.
- **Application analytics** (events, user actions, business metrics): high cardinality (1M+ series), per-event granularity, ad-hoc queries.
- **IoT / sensor data**: moderate cardinality, high write rate (1M+ rows/sec), retention years.
- **APM traces** (cobre §2.18 do 03-07): per-span data, very high cardinality, retention 7-30 dias.
- **Logs**: line-based, schemaless ou semi-structured (cobre 03-07 §2.20).

**Decision matrix 2026.**

| Tool | Best fit | Cost @ 1M series, 1mo retention | Pain points |
|---|---|---|---|
| **Prometheus** (vanilla) | Low cardinality (<500k series), single instance | Free OSS; ~16GB RAM/$50/mo node | Federation pain; long retention costly |
| **Thanos** | Multi-cluster Prometheus + cheap S3 long-retention | OSS; +25% Prom cost | Query latency over old data |
| **Cortex** | Multi-tenant Prom-as-a-service (older) | OSS; ops complex | Mostly replaced by Mimir |
| **Mimir** (Grafana, 2.13+) | High-scale (1M-1B series), multi-tenant Prom | OSS or Grafana Cloud $0.16/MM samples | Operationally complex self-host |
| **VictoriaMetrics** (1.95+) | Drop-in Prom replacement, 5-10x storage efficiency | OSS; ~30% Prom cost @ same scale | Smaller community |
| **InfluxDB 3.0** (Edge) | Lakehouse pattern, Iceberg + Apache Arrow | Cloud $0.25/GB; OSS Edge MIT | Migration from 1.x/2.x painful |
| **TimescaleDB** (2.16+) | Postgres extension, joins relational + time-series | OSS Postgres + extension | Series cardinality scales worse than columnar |
| **ClickHouse** (24.x) | Application analytics, high cardinality, ad-hoc | OSS; ~$0.05/GB/mo S3-backed; ~$200/mo modest | Operational overhead self-host |
| **DataDog Metrics** | Managed Prom-compat | $5/host/mo + ~$0.20/MM custom metrics | Vendor lock-in, $$$ at scale |

**Cardinality é o #1 cost driver.** Series = unique combination de metric + label values. `http_requests_total{path="/orders/123"}` com path concreto por orderId = explosão. Numbers reais 2026: 1M series = ~16GB RAM Prometheus; 100M series = ~16TB; 1B series = self-host impractical, Mimir/VM cluster obrigatório. Mitigação: template path (`/orders/:id` não `/orders/123`); aggregate por tenant_id NÃO user_id; histograms pré-agregados NÃO raw observations.

**VictoriaMetrics deep — drop-in Prometheus.**

```yaml
# docker-compose.yml — single binary, 1M+ active series
services:
  victoriametrics:
    image: victoriametrics/victoria-metrics:v1.95.1
    ports: ["8428:8428"]
    volumes: ["./vm-data:/storage"]
    command:
      - "-storageDataPath=/storage"
      - "-retentionPeriod=12"        # months
      - "-memory.allowedPercent=80"
```

```yaml
# prometheus.yml — keep Prom como scraper, remote_write pra VM
remote_write:
  - url: http://victoriametrics:8428/api/v1/write
    queue_config: { max_samples_per_send: 10000, capacity: 100000 }
```

5-10x storage efficiency vs Prometheus mesma retention (compressão melhor). PromQL + MetricsQL extensions (`rollup_increase`, `label_replace`). Cluster mode (`vmselect` + `vminsert` + `vmstorage`) só acima de 50M series — single binary resolve antes.

**Mimir deep — high-scale multi-tenant.**

Architecture: distributor → ingester → querier → store-gateway. S3 backend pra blocks. Multi-tenant nativo via header HTTP `X-Scope-OrgID: tenant-X`. **Compactor** merges blocks e downsampleia: 5min-aggregated após 1 dia; 1h-aggregated após 1 semana. 5-15 services pra rodar; vale a pena APENAS em > 10M series ou multi-tenant managed prod.

```bash
# Push amostras pra tenant específico
curl -H "X-Scope-OrgID: logistica-prod" \
  --data-binary @samples.pb \
  http://mimir:9009/api/v1/push
```

**ClickHouse pra application analytics** (ver §2.18 query opt; aqui storage decision). Não é time-series puro mas dominant em high-cardinality. Partition by date + sorting key por series tag.

```sql
-- Application events em ClickHouse — courier pings em escala Logística
CREATE TABLE courier_events (
  ts DateTime64(3),
  tenant_id UUID,
  courier_id UUID,
  event_type LowCardinality(String),
  payload String CODEC(ZSTD(3))
) ENGINE = MergeTree
PARTITION BY toYYYYMM(ts)
ORDER BY (tenant_id, courier_id, ts)
TTL ts + INTERVAL 365 DAY;
```

Stack 2026: ClickHouse + Vector pra ingest + Grafana pra dashboards. Cost ~$0.05/GB/mo S3-backed. Logística use case: ~10M events/dia × 365 dias = 3.6B rows; ~50GB compressed.

**TimescaleDB — quando faz sentido (2.16+).**

Vence: workloads onde JOIN com data relational (metric + dimension table) + time-series. Perde: > 100M series active (Postgres index pressure). Logística use case: courier earnings dashboard que joins delivery events + courier profile + tenant subscription = TimescaleDB elegante (hypertable + continuous aggregate + JOIN normal).

**InfluxDB 3.0 (Edge / Cloud) 2026.** Rewrite em Rust + Apache Arrow + Iceberg. Tagless cardinality (substitui o problema de "series cardinality" do 1.x/2.x). SQL primary; InfluxQL legacy supported. Cloud Serverless ~$0.25/GB query + storage S3 cheap. Migration 1.x/2.x → 3.0 NÃO é trivial; tagless model = re-think schema.

**Long-retention strategy.**

- **Tiered storage**: hot 7-30 dias (NVMe); warm 30-90 dias (SSD/object); cold 1-5 anos (S3 Glacier).
- **Downsampling**: 5min averages após 1 dia; 1h após 7 dias; 1d após 30 dias. Saves 99% storage.
- **Continuous aggregates** TimescaleDB / **materialized views** ClickHouse / **Mimir compactor** auto.

```sql
-- TimescaleDB: continuous aggregate + downsampling policy
CREATE MATERIALIZED VIEW pings_5min
WITH (timescaledb.continuous) AS
SELECT time_bucket('5 minutes', ts) AS bucket,
       courier_id,
       avg(speed_kmh) AS avg_speed,
       count(*) AS pings
FROM location_pings
GROUP BY bucket, courier_id;

SELECT add_continuous_aggregate_policy('pings_5min',
  start_offset => INTERVAL '1 day',
  end_offset   => INTERVAL '1 hour',
  schedule_interval => INTERVAL '5 minutes');

SELECT add_retention_policy('location_pings', INTERVAL '30 days');
```

**Logística applied stack.**

- **Operational metrics**: VictoriaMetrics single-node 32GB → cluster acima de 50M series.
- **Application analytics**: ClickHouse pra delivery events, courier pings, ad-hoc queries.
- **APM traces**: Tempo + S3 backend (Grafana stack).
- **Logs**: Loki + S3 backend.
- **Cost real 2026 prod modesta** (1k workloads): ~$300/mês total observability self-hosted vs ~$3k/mês Datadog equivalente.

**Anti-patterns observados.**

- High cardinality labels em Prometheus (`user_id`, `request_id`) — RAM blowup imediato.
- Prometheus single instance > 1M series (espera-se Mimir/VM cluster).
- VictoriaMetrics cluster pra 100k series (single binary resolve; cluster overhead injustificado).
- ClickHouse pra operational metrics (Prom-compat ausente; arquiteturas desencaixam).
- TimescaleDB pra > 100M series (index pressure; columnar escolha melhor).
- Sem downsampling em retention > 30 dias (storage 100x sobreescala).
- Mimir self-host pra 1M series (overhead operacional só vale em > 10M).
- Datadog em SaaS B2C com 100M custom metrics ($20k+/mês surprises).
- InfluxDB 1.x mantido em 2026 (sem manutenção; migrar pra 3.0 ou abandon).
- Same DB pra metrics + traces + logs (workloads diferentes; tools especializados ganham).

Cruza com **03-07** (observability, full stack), **03-05** (AWS, S3 backend cost), **04-09** (scaling, observability cost @ scale), **02-09** (Postgres, TimescaleDB extension), **02-08** (frameworks, scrape endpoints).

---

### 2.20 ClickHouse 24.x + DuckDB 1.x deep 2026

ClickHouse e DuckDB venceram 2024-2026 nos seus nichos. **ClickHouse** dominou OLAP at scale (>10TB) com ClickHouse Cloud GA (Dec 2022) consolidando o managed serverless tier sobre object storage. **DuckDB** virou padrão de embedded analytics: 1.0 GA Q2 2024, 1.1 (Q3), 1.2 (Q4 — encryption + extensions). Polars 1.x (Q3 2024) substituiu Pandas em pipelines Python sérios. Lance/LanceDB (v0.18 Q4 2024) emergiu como columnar format ML-native. Decisão 2026 não é mais "ClickHouse vs Snowflake" mas "qual nicho do stack analytics" — managed warehouse, embedded ad-hoc, ML embeddings, batch ETL — cada um tem ferramenta dedicada.

**ClickHouse 24.x deep** (24.3 LTS Q1 2024, 24.10 Q4 2024 trouxe refreshable MVs e JSON object type GA):

`ReplicatedMergeTree` é default em prod self-hosted desde sempre. Em **ClickHouse Cloud**, `SharedMergeTree` (GA 2023) substitui Replicated: storage compartilhado em S3, replicas são compute stateless, scaling horizontal trivial. Self-hosted continua Replicated com ZooKeeper/Keeper.

```sql
-- Self-hosted: ReplicatedMergeTree clássico
CREATE TABLE orders_local ON CLUSTER prod_cluster (
    order_id UUID,
    user_id UInt64,
    courier_id UInt64,
    created_at DateTime64(3) CODEC(Delta, ZSTD(3)),
    amount_cents UInt32 CODEC(T64, ZSTD(3)),
    status LowCardinality(String),
    payload JSON
)
ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/orders', '{replica}')
PARTITION BY toYYYYMM(created_at)
ORDER BY (user_id, created_at, order_id)
TTL created_at + INTERVAL 365 DAY DELETE
SETTINGS index_granularity = 8192,
         allow_experimental_json_type = 1;

-- Cloud: SharedMergeTree (object storage backed, scale-to-zero)
CREATE TABLE orders_cloud (
    order_id UUID,
    user_id UInt64,
    created_at DateTime64(3) CODEC(Delta, ZSTD),
    amount_cents UInt32 CODEC(T64, ZSTD),
    payload JSON
)
ENGINE = SharedMergeTree
PARTITION BY toYYYYMM(created_at)
ORDER BY (user_id, created_at);
```

**Codecs por column type**: `Delta + ZSTD` para sequential numerics (timestamps, IDs incrementais), `T64 + ZSTD` para integers com magnitudes variadas, `LowCardinality(String)` para enums/status (dictionary encoding automático), `ZSTD(level)` default geral, `LZ4` quando latência > compressão.

**Refreshable Materialized Views** (24.4+) substituem cron externo:

```sql
CREATE MATERIALIZED VIEW orders_daily_agg
REFRESH EVERY 1 HOUR
ENGINE = ReplacingMergeTree
ORDER BY (day, courier_id)
AS SELECT
    toDate(created_at) AS day,
    courier_id,
    count() AS orders_count,
    sum(amount_cents) AS revenue_cents,
    quantileTDigest(0.95)(delivery_seconds) AS p95_delivery
FROM orders
WHERE created_at >= now() - INTERVAL 7 DAY
GROUP BY day, courier_id;
```

MV incremental clássica continua via `AggregatingMergeTree` para pre-agg em insert, `ReplacingMergeTree` para latest-version dedup. Refreshable é **batch-style**, ideal para BI compatibility (Metabase/Superset esperam tabelas materializadas estáveis).

**JSON Object type GA** (24.8+): typing dinâmico sem schema upfront. Use `SETTINGS schema_inference_make_columns_nullable = 1` se ingerir JSON com fields opcionais — sem isso, NULL silencioso vira default value.

**ClickHouse Cloud** (managed serverless):
- **Separation compute/storage**: storage em S3 (region-local), compute em pods Kubernetes managed
- **Scale-to-zero**: idle services suspendem após 15min default. Cold start ~30s
- **Multi-region replication** built-in (extra cost)
- **Throughput**: single-node 1B rows/sec scan agregação típica; cluster scale linear até centenas de billions
- **Cost**: managed = 2-3x mais caro que self-hosted equivalente, mas zero ops (sem ZooKeeper/Keeper, sem upgrades, sem capacity planning). Tier "Production" desde ~$200/mês minimum

**DuckDB 1.x deep** — embedded analytics, no server:

Process-embedded (single binary, in-process). Single-writer (multi-process write **corrompe**). Reads concurrent OK. Throughput: ~500M rows/sec single-thread Parquet scan em hardware moderno.

```sql
-- Install + load extensions (one-time per session)
INSTALL httpfs;
LOAD httpfs;
INSTALL iceberg;
LOAD iceberg;

-- S3 credentials via SECRET (DuckDB 1.x pattern)
CREATE SECRET s3_logistics (
    TYPE S3,
    KEY_ID 'AKIA...',
    SECRET 'xxx',
    REGION 'us-east-1'
);

-- Federated query: S3 Parquet JOIN local table
ATTACH 'logistics_local.duckdb' AS local;

SELECT
    o.user_id,
    sum(o.amount_cents) AS revenue,
    u.tier
FROM read_parquet('s3://logistics-lake/orders/year=2026/*.parquet') o
JOIN local.users u ON u.id = o.user_id
WHERE o.created_at >= '2026-04-01'
GROUP BY o.user_id, u.tier
ORDER BY revenue DESC
LIMIT 100;

-- Iceberg: read latest snapshot
SELECT count(*)
FROM iceberg_scan('s3://lake/warehouse/orders', allow_moved_paths = true);
```

**Extensions GA**: `httpfs` (S3/HTTP/Azure direct read), `iceberg` (Iceberg table format), `delta` (Delta Lake), `parquet` (built-in), `postgres_scanner` (federated to Postgres). **MotherDuck** é DuckDB Cloud variant — hybrid local+cloud query, mesma sintaxe.

**Polars + Lance ecosystem**:

```python
# Polars LazyFrame — Rust-backed, Arrow native, 5-10x mais rápido que Pandas
import polars as pl

df = (
    pl.scan_parquet("s3://logistics-lake/orders/year=2026/*.parquet")
    .filter(pl.col("created_at") >= pl.datetime(2026, 4, 1))
    .group_by("courier_id")
    .agg([
        pl.col("amount_cents").sum().alias("revenue"),
        pl.col("delivery_seconds").quantile(0.95).alias("p95"),
    ])
    .sort("revenue", descending=True)
    .collect(streaming=True)  # streaming = larger-than-memory
)
```

**Lance** é columnar format optimizado para ML: pyarrow-compatible, vector indexes (IVF_PQ, HNSW) built-in, versioned (time-travel via snapshots). LanceDB é o KV+vector store sobre Lance. Diferencial vs Parquet: random access barato (importante pra ML training shuffles), vector search nativo sem index externo (Pinecone/Weaviate alternative).

**Decision matrix 2026**:

| Caso de uso | Ferramenta |
|---|---|
| Dashboards low-latency (p95 < 100ms), >10TB | ClickHouse self-hosted |
| Mesmo, sem ops | ClickHouse Cloud |
| Embedded SQL em CLI tool / IDE / app | DuckDB |
| Ad-hoc analytics em S3 lakehouse, sem warehouse cost | DuckDB + httpfs/iceberg |
| ETL Python, DataFrame ergonomics | Polars |
| ML embeddings + vector search dominante | Lance + LanceDB |
| Time-series + Postgres compatibility | TimescaleDB (§2.6) |
| Lakehouse curated, Spark/Flink heavy | Iceberg + Trino (04-13) |

**Stack Logística aplicado**: ClickHouse Cloud para `orders` + `courier_locations` (365d retention TTL) + dashboards executivos p95 < 100ms via refreshable MVs hourly. DuckDB embedded em CLI tool de SRE — `logi-cli query "SELECT ... FROM read_parquet('s3://logs/...')"` substitui Athena para investigação ad-hoc (zero infra, query starts em <1s vs Athena ~5-10s). Polars em ETL Python jobs (reconciliação financeira, batch fraud features). Lance como vector store de order embeddings (similarity search "pedidos similares" sem rodar Pinecone/pgvector dedicado).

**10 anti-patterns**:
1. ClickHouse `ALTER TABLE ... UPDATE` em hot path — mutations são async + rewrite parts inteiros, lock IO. Use `ReplacingMergeTree` com versioning column ou `CollapsingMergeTree`.
2. MaterializedView com `ORDER BY` diferente da query consumidora — sem index pruning, full scan da MV.
3. ClickHouse Cloud sem auto-suspend habilitado — idle service queima crédito 24/7.
4. DuckDB embedded em multi-process write workload — single-writer assumption, corrompe DB file. Use Postgres ou ClickHouse pra concurrent write.
5. Iceberg via DuckDB sem pin de snapshot — race condition durante compaction do writer (Spark/Flink).
6. Polars `.collect()` eager em dataset >RAM — use `streaming=True` ou continue lazy.
7. Lance sem version control em schema changes — overwrite destrutivo, sem rollback.
8. ClickHouse JSON Object type sem `schema_inference_make_columns_nullable = 1` — campos ausentes viram default silently, agregações erradas.
9. ClickHouse `ORDER BY` começando com `created_at` (high cardinality timestamp) ao invés de coluna de filtro principal — sparse index inútil. Ordem certa: filter column → sort column → tiebreaker.
10. SharedMergeTree (Cloud) usado em self-hosted — engine não disponível fora do Cloud. Self-hosted = `ReplicatedMergeTree` + Keeper.

**Cruza com**: §2.5 (ClickHouse arquitetura base), §2.6 (TimescaleDB compare), §2.7 (DuckDB intro), §2.11 (lakehouse Iceberg/Delta), §2.18 (ClickHouse query optimization deep), §2.19 (time-series storage 2026), [02-09 §2.23](../02-plataforma/02-09-postgres-deep.md) (TimescaleDB deep), [04-13 §2.20](../04-sistemas/04-13-streaming-batch-processing.md) (Iceberg + REST catalogs), [02-15 §2.20](../02-plataforma/02-15-search-engines.md) (vector search — Lance native alternative), [03-05](./03-05-aws-core.md) (S3 backend para ClickHouse Cloud + DuckDB).

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
   - "Lojista X tem retention M+1 / M+2 / M+3 dos últimos 6 meses?", SQL com cohorts.
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

- **Apache Iceberg**: snapshot de events_log em 04-03 (MinIO local), query via DuckDB.
- **Real-time** dashboard com WebSocket pull do ClickHouse cada 5s; usuário vê GMV ao vivo.
- **Anomaly detection**: rule-based alerts (entregas P95 > X mins → Slack).
- **Cost simulation**: estimar custo de manter ClickHouse vs BigQuery pro mesmo workload.

---

## 5. Extensões e Conexões

- Liga com **01-04** (data structures): B-Tree, LSM, sketches.
- Liga com **02-09** (Postgres): base; Timescale é extension.
- Liga com **02-11** (Redis): cache de query OLAP em apps user-facing.
- Liga com **03-02** (Docker): rodar ClickHouse local.
- Liga com **03-07** (observability): métricas/logs/traces vão pra time-series store.
- Liga com **03-10** (backend perf): profilagem com base em data.
- Liga com **04-02** (messaging): Kafka como backbone do pipeline.
- Liga com **04-03** (event-driven): events são fonte primária do warehouse.
- Liga com **04-10** (AI/LLM): vector DB + analytics pra contexto.
- Liga com **04-16** (product): unit economics dependem desses dashboards.

---

## 6. Referências

- **"Designing Data-Intensive Applications"**: Kleppmann, capítulo 3 (storage), 10 (batch).
- **ClickHouse docs** ([clickhouse.com/docs](https://clickhouse.com/docs)).
- **TimescaleDB docs**.
- **DuckDB docs**.
- **"Apache Iceberg: The Definitive Guide"**: Tomer Shiran et al.
- **"Building a Data Warehouse"**: William Inmon (clássico).
- **"The Data Warehouse Toolkit"**: Ralph Kimball (star schema bíblia).
- **HyperLogLog paper**: Flajolet, Fusy, Gandouet, Meunier.
- **"t-digest" paper**: Ted Dunning.
- **Materialize, RisingWave docs**: streaming SQL alternatives.
