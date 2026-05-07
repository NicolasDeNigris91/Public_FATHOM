---
module: 04-13
title: Streaming & Batch Data Processing, Spark, Flink, dbt, Airflow, Lakehouse
stage: sistemas
prereqs: [04-02]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 04-13, Streaming & Batch Data Processing

## 1. Problema de Engenharia

Logística produz toneladas de eventos: pings de localização, mudanças de status, métricas operacionais, transações financeiras. Postgres OLTP guarda *o agora*; ClickHouse/Timescale (03-13) guarda *agregados*. Mas quando você precisa de **transformações declarativas em pipeline** (limpar, deduplicar, joinar com dimensões, alimentar ML, gerar relatórios contábeis), entra a categoria de **data engineering** com ferramentas próprias: Spark, Flink, dbt, Airflow, Dagster, Beam, Materialize.

Diferença chave: **batch** vs **streaming**. Batch processa snapshots periódicos (diário, hourly). Streaming processa eventos contínuos com windows (5 min sliding, sessions, etc). Real-time analytics, fraud detection ao vivo, dashboards user-facing exigem streaming. Reportes financeiros mensais são batch.

Este módulo é **data processing por dentro**: lambda vs kappa architectures, streaming engines (Flink, Spark Structured Streaming), batch tools (Spark, dbt, Airflow), consistency em streaming (exactly-once, watermarks, late events), e como integrar tudo via lakehouse (Iceberg/Delta/Hudi) sem virar mil-pipelines spaghetti.

---

## 2. Teoria Hard

### 2.1 Lambda vs Kappa

**Lambda** (Marz): dois caminhos paralelos, batch layer (correto, lento) + speed layer (rápido, aproximado), unidos em serving layer. Complexidade alta (dois codebases).

**Kappa** (Kreps): só streaming. Re-process via re-read do log. Reprocessing batch-style sobre stream histórico.

Kappa simplifica e tem ganho com Kafka log retention longa. Lambda persiste em algumas orgs.

### 2.2 Streaming engines: Flink, Kafka Streams, Spark Structured

- **Apache Flink**: stateful, exactly-once, low latency (ms). State backends (RocksDB), savepoints, event-time semantics. Padrão pra streaming sério.
- **Kafka Streams**: lib JVM, embeds em app. Sem cluster separado. Ok pra apps simples.
- **Spark Structured Streaming**: micro-batch (default) ou continuous (alpha). Mesma API que batch, vantagem.
- **Apache Beam**: SDK unificado batch+stream; runners (Flink, Spark, Dataflow, Direct).
- **ksqlDB**: SQL streaming sobre Kafka.
- **Materialize / RisingWave**: streaming SQL incremental.

Flink é "default sério"; ksqlDB e Materialize ganham em DX.

### 2.2.1 Streaming SQL incremental, Materialize, RisingWave

Categoria que cresceu 2023-2025: você escreve SQL como em Postgres, engine mantém **materialized view incrementalmente atualizada** conforme dados chegam. Não é micro-batch, é update real-time conforme cada change.

**Modelo conceitual:**
- Conecta **sources** (Kafka, Postgres CDC via Debezium, Kinesis, 04-03).
- Define **CREATE MATERIALIZED VIEW** com SQL.
- Engine descobre dataflow incremental (timely dataflow / differential dataflow).
- Cada source change propaga; view atualiza com latência sub-segundo.
- **SELECT** retorna sempre o estado atual da view (não scan, é cache).

**Exemplo em Materialize:**
```sql
CREATE SOURCE orders FROM KAFKA BROKER 'kafka:9092' TOPIC 'orders'
  FORMAT AVRO USING CONFLUENT SCHEMA REGISTRY 'http://sr:8081';

CREATE MATERIALIZED VIEW revenue_per_user AS
  SELECT user_id, SUM(amount) AS total
  FROM orders
  WHERE status = 'paid'
  GROUP BY user_id;

-- agora SELECT retorna em ms, sempre fresco
SELECT * FROM revenue_per_user WHERE user_id = 42;
```

**Materialize:**
- Construído em Rust sobre **timely dataflow** (Naiad paper, Frank McSherry).
- SQL Postgres-compatible (~85%). Drivers Postgres funcionam.
- Strong consistency garantida (linearizable views).
- Cloud + self-hosted.
- Trade-off: cluster precisa caber state em memory + disk; não escala pra petabytes.

**RisingWave:**
- Open-source streaming database em Rust.
- SQL Postgres-compatible.
- State em **shared storage** (04-03) com cache local, escala melhor que Materialize em workloads grandes.
- Apache 2.0 license.
- Maturidade crescendo; menos battle-tested que Flink em 2026.

**Quando vale streaming SQL incremental sobre Flink:**
- Time não tem expertise JVM/Flink, SQL é universal.
- Queries são predominantemente **agregação + join + filter** (não custom Java function complexa).
- Latência sub-segundo importa, não ms.
- Você quer **interactive**: `psql` no engine, descobrir queries iterativamente.

**Quando NÃO vale:**
- Custom processing complex (ML inference, custom enrichment com APIs externas), Flink dá flexibility.
- Throughput extremo (10M events/s sustained), Flink ainda vence em workloads massive.
- Stack já tem Flink expert e roda bem.

**Padrões de uso emergentes:**
- **Operational analytics**: dashboard de business em real-time substituindo cron-job-em-warehouse.
- **CDC + materialized views**: replica Postgres pra Materialize via Debezium, deriva views ricas que seriam caras em Postgres OLTP.
- **Feature stores incrementais** pra ML: features atualizadas em real-time, sem batch overnight.

### 2.3 Event-time vs processing-time

- **Event time**: quando evento aconteceu no mundo.
- **Processing time**: quando engine viu.

Late events (chegam minutos depois): comum (mobile offline, network). Engine precisa lidar com out-of-order.

**Watermark**: heurística "vi todos os eventos com event_time ≤ T". Permite fechar windows. Sempre tradeoff entre latência de fechar e completude.

### 2.4 Windows

- **Tumbling**: não overlap, fixos (5min cada).
- **Sliding**: overlap (5min advancing 1min).
- **Session**: agrupa por inactividade gap (entrega completou após 30s sem ping).
- **Global**: tudo (raro em streaming).

Aggregations (count, sum, percentiles) por window. Late events disparam **side outputs** ou updates.

### 2.5 Exactly-once em streaming

Difícil de ser estritamente exactly-once em sistema distribuído. **Effectively-once** via:
- **Checkpointing** (Flink): snapshot consistente do state distribuído (Chandy-Lamport).
- **Transactional sinks**: outputs commit junto com checkpoint (Kafka transactions).
- **Idempotent sinks**: dedupe via key.

Spark Structured uses similar approach (offset tracking + idempotent writes).

### 2.6 State management em streaming

State pode ser enorme (terabytes). Backends:
- **In-memory** (Heap): rápido, OOM risk.
- **RocksDB** (Flink): on-disk LSM, suporta state grande.

Operações: keyed state (por key), operator state, broadcast.

State migration entre versões é desafio (savepoints permitem upgrade).

### 2.7 Backpressure em streaming

Producer mais rápido que consumer. Engines lidam:
- **Flink**: pressure se propaga pra source; source slows.
- **Kafka**: consumer lag visível; decisão é da app (slow consumer ou scale).
- **Reactive Streams API** em libs (Akka Streams, Reactor): demand-driven.

Sem backpressure, OOM ou lag explosivo.

### 2.8 Batch processing: Spark

Apache Spark: distributed compute. Core abstraction RDD (legado), DataFrame/Dataset API (preferido), SQL.

Execução: query → optimized plan (Catalyst) → physical plan → tasks. Distribuído via cluster manager (YARN, K8s, standalone).

Forças: scale (TB+), expressivo (SQL + UDF + ML), Delta Lake integration. Fraquezas: latency (segundos+), JVM overhead.

### 2.9 dbt: transformations declarativas

dbt (data build tool): SQL templated com Jinja, dependências entre modelos, tests, documentação.

Use case: data warehouse transformations. SQL → SQL (não move dados; gera tabelas/views no warehouse).

```sql
-- models/orders_daily.sql
{{ config(materialized='table') }}
SELECT date_trunc('day', created_at) as d, count(*) as orders
FROM {{ ref('orders') }}
GROUP BY 1
```

Dependências (`ref`) montam DAG. `dbt run` executa. `dbt test` valida (not_null, unique, custom).

dbt = padrão modern de transformations em warehouse (Snowflake, BigQuery, Redshift, ClickHouse).

#### 2.9.1 Incremental strategies, decisão e código real

dbt incremental models são onde times param de "rodar tudo full-refresh" e começam a ter pipelines escaláveis. Mas escolha errada de strategy = registros duplicados, deletes silenciosos, ou full table rewrite mascarado. Quatro strategies oficiais: `append`, `merge`, `delete+insert`, `insert_overwrite`. Cada uma resolve cenário diferente e quebra de jeito específico se aplicada errado.

| Strategy | Como funciona | Quando usa | DB suportado | Custo write | Race conditions |
|---|---|---|---|---|---|
| `append` | INSERT só novas rows | Append-only event stream sem updates | Todos | Mínimo | Nenhum (no conflicts) |
| `merge` | MERGE ON unique_key (UPDATE if exists, INSERT if not) | SCD type 1, dimensões mutáveis | Snowflake, BigQuery, Databricks, Postgres 15+ | Médio | Resolve via merge atomic |
| `delete+insert` | DELETE rows com `unique_key IN (...)` + INSERT | Postgres < 15, Redshift, fact reload por janela | Todos | Alto (delete cost) | Window de inconsistência entre DELETE e INSERT |
| `insert_overwrite` | DROP+REPLACE partition específica | Particionado por dia/hora; reload janela completa | BigQuery, Spark, Databricks | Baixo (atomic per partition) | Atomic em partition level |

**`append` deep — o mais simples e mais traiçoeiro.** Bom: page_views, clickstream, raw events. Mau: qualquer source com retries no upstream → duplica. Sempre adicione `dbt_utils.deduplicate` downstream se source tem retry semantics.

```sql
{{ config(materialized='incremental', incremental_strategy='append') }}

select * from {{ source('events', 'page_views') }}
{% if is_incremental() %}
  where event_at > (select max(event_at) from {{ this }})
{% endif %}
```

Pegadinha: `event_at > max(event_at)` perde events com `=` exato. Use `>=` + dedupe downstream OU watermark com cushion (`event_at > max(event_at) - interval '1 hour'` + dedupe). Trade-off: cushion captura late-arriving data ao custo de reprocessar window e exigir dedupe explícito.

**`merge` deep — escolha default em modern warehouses.** Snowflake/BigQuery/Databricks: MERGE é atomic, performante, não tem janela de inconsistência. Postgres 15+: também tem MERGE nativo (antes era CTE-com-UPDATE-ou-INSERT trick). `unique_key` é obrigatório e tem que ter unique constraint OU índice unique pra evitar full table scan no MERGE source side.

```sql
{{ config(
    materialized='incremental',
    incremental_strategy='merge',
    unique_key='order_id',
    on_schema_change='sync_all_columns'
) }}

select
  order_id,
  customer_id,
  status,
  total,
  updated_at,
  _airbyte_emitted_at as ingested_at
from {{ source('app_db', 'orders') }}
{% if is_incremental() %}
  where _airbyte_emitted_at > (select max(ingested_at) from {{ this }})
{% endif %}
```

Sub-pegadinha: SCD type 2 (history) pede pattern diferente — `dbt_snapshot` ou snapshot table custom; merge sozinho perde history.

**`delete+insert` deep — quando precisa em Postgres < 15 ou window reload.** Cenário: reprocessar últimos 7 dias de fact_sales porque corrigiu source data.

```sql
{{ config(
    materialized='incremental',
    incremental_strategy='delete+insert',
    unique_key='sale_id'
) }}

select * from {{ ref('stg_sales') }}
{% if is_incremental() %}
  where sale_at >= dateadd('day', -7, current_date)
{% endif %}
```

Pegadinha crítica: a window entre DELETE e INSERT (mesmo em transação) tem outras queries lendo zero rows em isolation levels mais frouxos. Read-replica downstream pode renderizar dashboard com 0 rows. Mitigação: rodar em horário de baixa leitura OU usar materialized view sobre snapshot. Custo: 7 dias de DELETE em fact com 100M rows = scan + lock. `unique_key` precisa estar indexado.

**`insert_overwrite` deep — partição particionada vence.** BigQuery / Databricks / Spark com partitioned tables. dbt detecta partições afetadas, dropa, recria.

```sql
{{ config(
    materialized='incremental',
    incremental_strategy='insert_overwrite',
    partition_by={'field': 'sale_date', 'data_type': 'date', 'granularity': 'day'}
) }}

select * from {{ ref('stg_sales') }}
{% if is_incremental() %}
  where sale_date in ({{ partitions_to_replace() | join(', ') }})
{% endif %}
```

Macro `partitions_to_replace()`: define quais partições reprocessar (últimos N dias, ou `var('reload_dates')`). Vantagem: atomic per partition, custo proporcional à window, não scan tabela inteira. Pegadinha: schema change em coluna não-partition pode falhar — força full-refresh.

**Decision tree (operacional)**:
- Source é append-only, sem retries duplicados? → `append`.
- Warehouse moderno (Snowflake/BigQuery/Databricks/PG15+) e source pode ter updates? → `merge`.
- Postgres < 15, Redshift sem MERGE bom, ou precisa janela específica reprocessada? → `delete+insert`.
- Tabela particionada e reload é por partition unit? → `insert_overwrite`.

**Operational hardening**:
- **Late-arriving data**: defina `lookback_window` (`var('lookback_hours', 24)`) — sempre reprocesse last N hours pra cobrir events atrasados. Não confie só em `max(event_at)`.
- **Backfill**: `dbt run --full-refresh -s model_name` recria tudo. Pra backfill por janela, use `--vars '{start_date: 2026-01-01, end_date: 2026-01-31}'` + lógica condicional no model.
- **Idempotency**: model deve poder rodar 2x mesma janela sem produzir resultados diferentes. Test com `dbt run --vars '{lookback_hours: 48}'` rodado 2x — assertion: row count idêntico.
- **Monitoring**: `dbt source freshness` + Elementary Data ou re_data pra dashboard de incremental health (last_run_rows_added, model_lag).

**Anti-patterns observados**:
- `materialized='incremental'` sem `is_incremental()` no SQL → silenciosamente roda full-refresh todo dia mascarado.
- `unique_key` sem unique constraint na warehouse → MERGE faz full scan; perf degrada com tabela.
- Misturar `append` com source que retry duplica → registros duplos descobertos 3 meses depois em audit financeiro.
- Ignorar late-arriving data → events de minutos atrás caem no buraco e nunca são contabilizados.
- `delete+insert` em horário de pico → dashboards mostram 0 momentaneamente; suporte enche de tickets.

Cruza com **04-13 §2.12** (CDC alimenta merge incremental), **04-13 §2.14** (data quality tests devem cobrir uniqueness e completeness pós-incremental), **03-13 §2.15** (decisão lakehouse vs warehouse afeta strategies disponíveis), **04-13 §2.16** (exactly-once semantics na ingestão é pré-requisito pra append).

#### 2.9.2 Pipeline real Logística — dbt + Iceberg + ClickHouse

Cenário concreto: CDC do Postgres OLTP (02-09 §2.13.1) escreve raw events em S3 (formato Parquet, table format Iceberg). dbt transforma raw → staging → marts em ClickHouse. Stack 2026-canônica.

**Estrutura de projeto:**
```
logistics-analytics/
├── dbt_project.yml
├── models/
│   ├── sources.yml          # raw tables em Iceberg via ClickHouse external table
│   ├── staging/
│   │   ├── stg_orders.sql
│   │   ├── stg_payments.sql
│   │   └── stg_tracking_pings.sql
│   ├── intermediate/
│   │   └── int_order_with_payments.sql
│   └── marts/
│       ├── fct_daily_revenue.sql
│       ├── fct_courier_utilization.sql
│       └── dim_lojista.sql
├── tests/
│   └── assert_revenue_positive.sql
├── snapshots/
│   └── snap_lojista_tier.sql
└── seeds/
    └── tier_pricing.csv
```

**Sources com Iceberg:**
```yaml
# models/sources.yml
version: 2
sources:
  - name: raw_logistics
    schema: iceberg.lakehouse.logistics
    description: "CDC events from Postgres OLTP via Debezium → S3 Iceberg"
    tables:
      - name: orders_cdc
        identifier: orders_cdc
        description: "Append-only stream of order changes"
        loaded_at_field: cdc_ts
        freshness:
          warn_after: { count: 30, period: minute }
          error_after: { count: 2, period: hour }
      - name: payments_cdc
        identifier: payments_cdc
      - name: tracking_pings
        identifier: tracking_pings
        meta:
          retention_days: 90       # custom meta pra lifecycle policy
```

**Modelo staging (parse + dedup CDC):**
```sql
-- models/staging/stg_orders.sql
{{ config(
    materialized='incremental',
    unique_key='order_id',
    on_schema_change='append_new_columns',
    incremental_strategy='delete+insert'
) }}

WITH ranked AS (
  SELECT
    after.id           AS order_id,
    after.tenant_id    AS tenant_id,
    after.status       AS status,
    after.total::numeric(12,2) AS total,
    after.created_at   AS created_at,
    cdc_ts             AS updated_at,
    op,
    ROW_NUMBER() OVER (PARTITION BY after.id ORDER BY cdc_ts DESC) AS rn
  FROM {{ source('raw_logistics', 'orders_cdc') }}
  {% if is_incremental() %}
    WHERE cdc_ts > (SELECT MAX(updated_at) FROM {{ this }})
  {% endif %}
)
SELECT order_id, tenant_id, status, total, created_at, updated_at
FROM ranked
WHERE rn = 1 AND op != 'd'    -- mantém só última versão; descarta deletes do mart
```

**Mart com facto agregado:**
```sql
-- models/marts/fct_daily_revenue.sql
{{ config(
    materialized='table',
    engine='SummingMergeTree(revenue)',
    order_by='(tenant_id, day)',
    partition_by='toYYYYMM(day)'
) }}

SELECT
  date_trunc('day', o.created_at)::date AS day,
  o.tenant_id,
  COUNT(*)                              AS orders,
  SUM(o.total)                          AS revenue,
  AVG(o.total)                          AS avg_ticket
FROM {{ ref('stg_orders') }} o
WHERE o.status IN ('delivered', 'in_transit')
GROUP BY 1, 2
```

**Tests + freshness:**
```yaml
# models/marts/schema.yml
version: 2
models:
  - name: fct_daily_revenue
    description: "Daily revenue per tenant for finance dashboards"
    tests:
      - dbt_utils.unique_combination_of_columns:
          combination_of_columns: [day, tenant_id]
    columns:
      - name: tenant_id
        tests: [not_null]
      - name: revenue
        tests:
          - not_null
          - dbt_utils.expression_is_true:
              expression: ">= 0"
```

**Snapshot pra dimensão SCD Type 2:**
```sql
-- snapshots/snap_lojista_tier.sql
{% snapshot snap_lojista_tier %}
{{ config(target_schema='snapshots', unique_key='tenant_id',
          strategy='check', check_cols=['tier', 'plan']) }}
SELECT tenant_id, tier, plan, updated_at FROM {{ source('raw_logistics', 'tenants') }}
{% endsnapshot %}
```

#### Iceberg em produção 2026 — o que vale saber

- **Multi-engine**: mesma tabela Iceberg lida por ClickHouse, Trino, Spark, DuckDB, Snowflake. Padrão sem lock-in (Apache Iceberg 1.5+, 2024).
- **Time travel**: `SELECT ... FROM table FOR VERSION AS OF '<snapshot_id>'`. Útil pra auditoria + replay.
- **Schema evolution sem rewrite**: add column, drop column, rename — sem reprocessar arquivos.
- **Partition evolution**: muda partition spec sem migration. Hive não tem.
- **Metadata catalog**: AWS Glue, Nessie (versioned, git-like), Polaris (Apache, 2024+), Tabular (commercial). Polaris emergiu como neutral default em 2025-2026.
- **Compaction**: pequenos arquivos viram problema; rode `OPTIMIZE table` periodicamente (ClickHouse) ou Iceberg `rewrite_data_files` action.
- **Vacuum**: snapshots antigos consomem storage; expire snapshots > N dias.

#### Orquestração no exemplo

dbt jobs em **Dagster** (recomendado 2026 sobre Airflow pra novos projetos): cada model é asset; dependências automáticas; freshness checks built-in.

```python
# dagster definitions
from dagster_dbt import DbtCliResource, dbt_assets

@dbt_assets(manifest='target/manifest.json')
def logistics_dbt_assets(context, dbt: DbtCliResource):
    yield from dbt.cli(['build'], context=context).stream()
```

Schedule: hourly pra staging, daily pra marts. Failure alert pra Slack via Dagster sensors.

Cruza com **02-09 §2.13.1** (CDC fonte do pipeline), **03-13 §2.15** (decision tree de OLAP onde dbt + Iceberg cabe), **02-09 §2.13** (Materialize alternativa real-time pra alguns marts).

### 2.10 Orchestration: Airflow, Dagster, Prefect

Pipelines têm dependências, schedules, retries, alerts.

- **Airflow** (Apache, AirBnB origin): DAGs em Python, operators (BashOperator, PythonOperator, KubernetesPodOperator). Maturíssimo, monolítico.
- **Dagster**: software-defined assets, asset lineage central, melhor DX.
- **Prefect**: focused em modern Python, hybrid execution.
- **Temporal**: workflow orchestration genérica (não só data).

Cada DAG: tasks, dependencies, schedule, retry policy, sensors (espera condição).

### 2.11 Lakehouse: Delta / Iceberg / Hudi

Lakehouse = data lake (Parquet em 04-03) + metadados ACID. Tabelas com snapshots, time travel, schema evolution, ACID concurrent writes.

- **Delta Lake** (Databricks). Spark-native; recente abriu mais.
- **Apache Iceberg** (Netflix). Multi-engine (Trino, Spark, Flink, ClickHouse). Padrão emergente.
- **Apache Hudi** (Uber). Upserts e CDC otimizados.

Operações: `MERGE INTO`, `UPDATE`, `DELETE` em data lake. Time travel: query estado de 30 dias atrás.

Compaction periódica funde arquivos pequenos. Vacuum remove versões antigas.

### 2.12 CDC (Change Data Capture)

Pegar mudanças do OLTP em real-time:
- **Log-based**: lê WAL/binlog. Debezium é padrão (Kafka Connect connector). Postgres logical replication, MySQL binlog.
- **Trigger-based**: triggers na DB. Mais invasivo.
- **Query-based**: poll com `updated_at`. Não captura deletes.

Pipeline: Postgres → Debezium → Kafka topic per table → consumers (data warehouse, search index, cache invalidation).

CDC é cola entre OLTP e analytics em arquiteturas event-driven (04-03).

### 2.13 Schema management em pipelines

- **Schema registry** (Confluent, Apicurio): JSON Schema, Avro, Protobuf. Versioning, compatibility (backward/forward/full).
- **Evolução**: adicionar campo opcional → backward compat. Deletar required → break.
- **Schema-on-read** (data lake) vs **schema-on-write** (warehouse): trade-off flexibility vs guarantees.

Schema breakages em produção custam horas. Discipline schema reviews.

### 2.14 Data quality

- **Tests** (dbt): not_null, unique, accepted_values.
- **Expectations** (Great Expectations): suite de validações.
- **Contracts** (DataDog data contracts, Soda): producer commits a schema/quality.
- **Anomaly detection**: drift em distribuição.

Data sem qualidade leva a decisões erradas. Dashboards com NaN minam confidence.

### 2.15 Streaming joins

Stream-stream join: dois streams em window (last 5min de orders × last 5min de payments).
Stream-table join: enriquece stream com lookup (events × user dimension).
**Temporal join**: junta com state válido **at event time** (versioned dimension).

Implementation cuida de state (stream join precisa state ambos lados durante window).

### 2.16 Exactly-once delivery e effective semantics

Um evento processado só uma vez. Impossível em puro distribuído sem cooperação. Soluções:
- Idempotent operations.
- Dedupe por event ID.
- Transactions atravessam producer-broker-consumer (Kafka transactional API).

Maioria production aceita "at-least-once + idempotent".

### 2.17 Cost economics

Stream sempre rodando custa. Otimizações:
- **Auto-scale** consumers em demanda.
- **Tier hot/cold**: streaming pra real-time + batch nightly pra histórico.
- **Snapshots** raros pra deep history; daily compaction.
- **Spot instances** em batch.

BigQuery cobra por bytes scanned; particionamento e clustering são economicamente mandatory.

### 2.18 Lakehouse 2026 deep (Iceberg vs Delta vs Hudi, CDC pipelines, time travel + branching)

**Status 2026.** Apache Iceberg dominou enterprise adoption 2024-2026: Snowflake, Databricks, AWS, Google, Microsoft, Cloudflare R2 todos suportam nativamente. Delta Lake mantém dominância em Databricks ecosystems; OSS Delta UniForm (2024+) entrega compatibility com Iceberg readers. Apache Hudi mantém niche em CDC-heavy workloads + indexing nativo. AWS S3 Tables (re:Invent 2024) entrega Iceberg-native storage AWS-managed, ~3x faster query vs raw S3. Cloudflare R2 Iceberg (2025+): zero egress fees + Iceberg native = compelling pra multi-cloud.

**Decision matrix:**

| Feature | Iceberg | Delta Lake | Hudi |
|---|---|---|---|
| **Engine support** | Spark/Flink/Trino/DuckDB/Snowflake/Databricks/Athena/BigQuery/ClickHouse | Spark/Databricks/Trino/DuckDB | Spark/Flink/Presto |
| **Schema evolution** | Robust (column add/drop/rename/reorder) | Robust (Delta 3+) | Limited (rewrite) |
| **Time travel** | Snapshot-based + tag/branch | Version-based | Commit-based |
| **Branching** | Tag + branch (Iceberg 1.4+) | Limited (Delta 4+) | No |
| **Streaming** | Flink-friendly | Spark Structured Streaming native | Best CDC |
| **Compaction** | Manual (write_audit_publish) ou auto-managed | Auto-optimize (Databricks) | Built-in |
| **OSS health** | Apache Foundation, vendor-neutral | Linux Foundation, Databricks-driven | Apache, Uber-driven |

**Iceberg architecture deep.** Catalog (metadata): REST catalog (recommended 2026), Glue, Hive Metastore, Nessie (git-like). Metadata file (JSON): tracks schema, partitioning, snapshots. Manifest list: list of manifest files per snapshot. Manifest file: list of data files (Parquet) com partition stats. Data files (Parquet/ORC/Avro): actual data. Pattern: writer atomic commit by writing new metadata pointing ao new manifest list; readers see consistent snapshot.

**CDC pipeline (Postgres → Iceberg).** Stack 2026: Postgres logical replication → Debezium → Kafka → Flink/Spark Structured Streaming → Iceberg table. Alternativa: PeerDB (Postgres → Iceberg/ClickHouse direct, sem Kafka), Estuary Flow (managed CDC). MERGE INTO em Iceberg pra upserts:

```sql
MERGE INTO orders_iceberg t
USING orders_cdc_stream s
ON t.order_id = s.order_id
WHEN MATCHED AND s.op = 'd' THEN DELETE
WHEN MATCHED AND s.op = 'u' THEN UPDATE SET * = s.*
WHEN NOT MATCHED AND s.op IN ('c', 'r') THEN INSERT *;
```

Latency real: Debezium → Iceberg via Flink minibatch 1-5min; via Spark microbatch 30s-2min; PeerDB direct 10-30s.

**Time travel + branching (Iceberg 1.4+).** Snapshot-based time travel:

```sql
SELECT * FROM orders FOR TIMESTAMP AS OF '2026-05-01 10:00:00';
SELECT * FROM orders FOR VERSION AS OF 12345;
```

Tags: stable references pra snapshots (audit/compliance):

```sql
ALTER TABLE orders CREATE TAG `release-v1.5` AS OF VERSION 12345;
```

Branches: experimental writes sem affecting main:

```sql
ALTER TABLE orders CREATE BRANCH `experiment` AS OF VERSION 12345;
-- writes em main_branch são isolated;
ALTER TABLE orders FAST FORWARD `main` `experiment`;  -- merge
```

Use case Logística: backfill historical tracking data em branch; validate row counts + schema; FAST FORWARD para main atomically.

**WAP (Write-Audit-Publish) pattern.** Write to staging branch. Audit queries verify quality (count, schema, business rules: ex. `assert sum(amount) > 0`). Publish via FAST FORWARD branch to main. Stack: Apache Airflow + Iceberg branches + dbt-iceberg adapter.

**Schema evolution patterns.** Add column: instant em Iceberg/Delta; readers see NULL pra old data. Rename column: Iceberg supports nativamente (column ID-based); Delta 3+ via columnMapping. Drop column: soft drop em Iceberg (column hidden but data preserved); hard drop requires file rewrite. Reorder columns: trivial em Iceberg/Delta (logical names independent of file order). Type promotion: int → bigint OK; bigint → int requires rewrite.

**Compaction + maintenance.** Streaming writes geram 1000s of small files; query performance degrada. Iceberg procedures:

```sql
CALL system.rewrite_data_files('db.orders');
CALL system.expire_snapshots('db.orders', TIMESTAMP '2026-04-01');
CALL system.remove_orphan_files('db.orders');
```

Schedule (cron via Airflow/Dagster): compaction nightly; expiration weekly; orphan cleanup monthly.

**Logística applied stack.** Source: Postgres OLTP (Orders, Couriers, Tracking). CDC: PeerDB → Iceberg em S3 (latency ~30s). Tables: `orders_iceberg`, `couriers_iceberg`, `tracking_pings_iceberg` (high volume, partitioned by date). Catalog: REST catalog self-hosted (Tabular before Databricks acquisition; ou Apache Polaris OSS 2024+). Query: Trino pra ad-hoc; ClickHouse pra dashboards (Iceberg engine 24.x+). Maintenance: Airflow nightly compaction + weekly expiration + monthly orphan cleanup. Cost real: 100GB Iceberg em S3 = $2.30/mo storage; query cost depende engine. Em Trino self-host ~$300/mo total stack.

**Anti-patterns observados:**
- Hive ACID em greenfield (deprecated; use Iceberg).
- Iceberg sem REST catalog (Hive Metastore = single point failure + slow).
- Streaming write Iceberg sem compaction schedule (small files explode; query 100x slower).
- Snapshot expiration policy ausente (storage cresce infinitamente).
- Column rename via DROP + ADD em Delta < 3 (data loss; use columnMapping).
- CDC via Debezium → S3 raw → batch ETL (latency 24h; use Iceberg + MERGE INTO).
- Time travel queries em hot path (slow vs current data; use snapshots strategically).
- Branch sem TTL (branches acumulam; cleanup process necessário).
- WAP publish sem audit step (corrupt data merged to main).
- Iceberg + Delta na mesma platform (UniForm trick existe mas overhead operacional; pick one).

**Cruza com:** [`02-09`](../02-plataforma/02-09-postgres-deep.md) (Postgres, source para CDC); [`02-12`](../02-plataforma/02-12-mongodb.md) (Mongo, alternative source); [`03-13`](../03-producao/03-13-time-series-analytical-dbs.md) (analytical DBs, query layer); [`04-02`](./04-02-messaging.md) (messaging, Kafka pra CDC); [`04-09`](./04-09-scaling.md) (scaling, lakehouse storage cost economics); [`03-05`](../03-producao/03-05-aws-core.md) (AWS, S3 Tables managed).

### 2.19 Apache Flink stateful streaming deep — watermarks, savepoints, CEP, exactly-once

**Status 2026.** Flink 1.20 (LTS, lançado 08/2024) consolidou-se como runtime padrão pra low-latency stateful streaming + CEP em workloads onde Kafka Streams não escala (cross-key state, complex joins) e Spark Structured Streaming sofre com micro-batch latency. Flink Kubernetes Operator 1.10+ entrega lifecycle declarativo (CRDs `FlinkDeployment`, `FlinkSessionJob`); savepoints automáticos antes de upgrade. Stack maduro: Flink 1.20 + Kafka 3.7+ + RocksDB state backend + S3 checkpoint storage.

**Flink vs Kafka Streams vs Spark Structured Streaming.**

| Dimensão | Flink 1.20 | Kafka Streams 3.7 | Spark Struct. Streaming 3.5 |
|---|---|---|---|
| **Modelo** | Dedicated streaming runtime | Library embedded em app JVM | Micro-batch sobre Spark engine |
| **Latency** | Sub-100ms (sub-ms tunável) | 50-500ms | 100ms-2s (continuous mode experimental) |
| **State** | ValueState/ListState/MapState; RocksDB; petabyte-scale | RocksDB local; bounded by app heap | Stateful ops via state store (HDFSBackedStateStore/RocksDB) |
| **CEP** | Native CEP library | Manual (no library) | Manual |
| **Languages** | Java/Scala/Python (PyFlink) | Java/Scala only | Polyglot (Scala/Java/Python/R/SQL) |
| **Sources/sinks** | Kafka, Kinesis, Pulsar, JDBC, Iceberg, S3 | Kafka-only | Kafka, Kinesis, files, JDBC, Delta/Iceberg |
| **Decision** | Low-latency + complex state + CEP | Kafka-only + simplicity (cobre [`04-02`](./04-02-messaging.md) §2.19) | Batch+stream unified + ML pipelines |

**Flink core concepts 2026.** **DataStream API**: typed stream operators (Java/Scala/Python). **Table API + SQL**: declarative; planner converts em DataStream. **State**: ValueState (single value per key), ListState (append-only list), MapState (keyed map); todos keyed; backed by RocksDB. **Watermarks**: track event-time progress; trigger window closures. **Checkpoints**: periodic state snapshots to S3/HDFS; recovery on failure (interval típico 30-60s). **Savepoints**: manual checkpoints pra upgrades; preservam state across job versions.

**Watermark fundamentals.** Event time = quando evento ocorreu (no device/source); processing time = quando sistema vê. Watermark `W(t)` = assertion "todos eventos com event_time < t já foram observados". Late events = chegam após watermark passar; dropped ou roteados pra side output. Allowed lateness: window permanece aberto após watermark por grace period. Logística: courier ping `event_time` from device; watermark = max(event_time) - 30s; tolera 30s de GPS lag em túneis/áreas sem cobertura.

**Watermark generation:**

```java
DataStream<TrackingPing> pings = env.fromSource(
  KafkaSource.<TrackingPing>builder()
    .setBootstrapServers("kafka:9092")
    .setTopics("tracking.pings")
    .setGroupId("flink-tracking")
    .setStartingOffsets(OffsetsInitializer.committedOffsets())
    .setDeserializer(KafkaRecordDeserializationSchema.valueOnly(TrackingPingDeserializer.class))
    .build(),
  WatermarkStrategy.<TrackingPing>forBoundedOutOfOrderness(Duration.ofSeconds(30))
    .withTimestampAssigner((ping, ts) -> ping.eventTimeMillis())
    .withIdleness(Duration.ofMinutes(1)),
  "Tracking Pings"
);
```

`forBoundedOutOfOrderness`: most common; tolera late events até N segundos. `forMonotonousTimestamps`: assume strict ordering; faster mas error-prone em streams reais. `withIdleness`: marca partition idle quando sem dados, evita stalled watermark global.

**Stateful operator com keyed state + event-time timer:**

```java
public class CourierIdleDetector extends KeyedProcessFunction<String, TrackingPing, IdleAlert> {
  private transient ValueState<Long> lastPingTime;

  @Override
  public void open(Configuration parameters) {
    lastPingTime = getRuntimeContext().getState(
      new ValueStateDescriptor<>("lastPingTime", Long.class)
    );
  }

  @Override
  public void processElement(TrackingPing ping, Context ctx, Collector<IdleAlert> out) throws Exception {
    lastPingTime.update(ping.eventTimeMillis());
    ctx.timerService().registerEventTimeTimer(ping.eventTimeMillis() + 10 * 60 * 1000L);
  }

  @Override
  public void onTimer(long timestamp, OnTimerContext ctx, Collector<IdleAlert> out) throws Exception {
    Long last = lastPingTime.value();
    if (last != null && timestamp - last >= 10 * 60 * 1000L) {
      out.collect(new IdleAlert(ctx.getCurrentKey(), timestamp));
    }
  }
}

pings
  .keyBy(p -> p.courierId)
  .process(new CourierIdleDetector()).uid("courier-idle-detector")
  .sinkTo(alertsSink);
```

**CEP (Complex Event Processing).** Use case: detectar sequências (fraud, multi-step user journey, anomalies). Logística — fraud detection: 3 cancellations dentro de 5min:

```java
Pattern<OrderEvent, ?> fraudPattern = Pattern.<OrderEvent>begin("first")
  .where(SimpleCondition.of(e -> e.type.equals("OrderCancelled")))
  .followedBy("second")
  .where(SimpleCondition.of(e -> e.type.equals("OrderCancelled")))
  .followedBy("third")
  .where(SimpleCondition.of(e -> e.type.equals("OrderCancelled")))
  .within(Time.minutes(5));

PatternStream<OrderEvent> patternStream = CEP.pattern(
  events.keyBy(e -> e.tenantId),
  fraudPattern
);

DataStream<FraudAlert> alerts = patternStream.select(matches -> {
  OrderEvent first = matches.get("first").get(0);
  return new FraudAlert(first.tenantId, first.eventTime, "3 cancellations em 5 min");
});
```

`keyBy` antes de `CEP.pattern` é mandatório; sem isso, matches cruzam tenants (alerts sem sentido).

**Exactly-once (Flink + Kafka via 2PC).** Two-phase commit: Flink JobManager coordena com Kafka producer transacional. Pre-commit: producer escreve batch mas não commita. Commit: após checkpoint barrier completar, Flink chama producer commit. Recovery: from last checkpoint; uncommitted batch é replayed. Config crítico: `transaction.timeout.ms` no producer < `transaction.max.timeout.ms` no broker (default 15min); checkpoint interval < transaction timeout. Sink config:

```java
KafkaSink<AlertEvent> sink = KafkaSink.<AlertEvent>builder()
  .setBootstrapServers("kafka:9092")
  .setRecordSerializer(...)
  .setDeliveryGuarantee(DeliveryGuarantee.EXACTLY_ONCE)
  .setTransactionalIdPrefix("flink-alerts-")
  .setProperty("transaction.timeout.ms", "600000")
  .build();
```

**Savepoints — upgrade preservando state:**

```bash
# Trigger savepoint (job continua rodando)
flink savepoint <jobId> s3://logistica-savepoints/sp-2026-05-06

# Cancel job
flink cancel <jobId>

# Deploy nova versão, restore from savepoint
flink run -s s3://logistica-savepoints/sp-2026-05-06 \
  -c com.logistica.flink.OrdersJob \
  orders-job-v2.jar
```

**Operator UID** é mandatório pra state migration: `myOperator.uid("courier-idle-detector")`. Sem UID, Flink gera hash from operator chain; qualquer mudança no DAG quebra restore. Schema evolution: ValueState com Avro/JSON Schema-typed state sobrevive schema add (defaults aplicados); rename/drop requer custom migration.

**Logística applied stack.** Sources: Kafka topics (`orders.events`, `tracking.pings`, `payments.events`). Flink jobs: `CourierIdleDetector` (alert se courier offline > 10min); `FraudPatternDetector` (CEP 3-cancellation pattern); `OrderJoinEnrichment` (stream-stream join order + courier profile, windowed 1h); `RealtimeMetrics` (windowed counts → ClickHouse sink). State backend: RocksDB; checkpoints to S3 a cada 60s; savepoints nightly + antes de cada deploy. Cluster: 3-node TaskManager (4 vCPU, 16GB cada) ~$300/mês em K8s; Flink Kubernetes Operator 1.10+ gerencia lifecycle (HA via K8s ConfigMap, sem ZooKeeper).

**Anti-patterns observados:**
- Watermark `forMonotonousTimestamps` em real-world stream (bursts causam infinite waits; use `forBoundedOutOfOrderness`).
- ValueState sem `.update(null)` cleanup quando key terminal (state cresce unbounded; use TTL ou explicit clear).
- Savepoint sem operator UID em new operators (state migration falha em upgrade; sempre `.uid("nome-estavel")`).
- Checkpoint interval < 30s em high-throughput job (overhead dominates; tune por throughput, não por intuição).
- CEP `within` sem `keyBy` (matches cruzam keys; alerts nonsense).
- Stream-stream join sem windowed join (unbounded state; OOM em horas).
- Flink JobManager single instance em prod (SPOF; HA mode com K8s ConfigMap ou ZooKeeper).
- `forBoundedOutOfOrderness(Duration.ofMinutes(5))` arbitrário (mede actual lateness P99 antes; tune accordingly).
- Allowed lateness + watermark grace combinados em downstream com aggregation (double counting).
- Operator parallelism > Kafka partitions (slots idle; rebalance até match).

**Cruza com:** [`04-02`](./04-02-messaging.md) §2.19 (Kafka Streams alternative); §2.18 acima (lakehouse Iceberg sink); [`03-13`](../03-producao/03-13-time-series-analytical-dbs.md) (analytical DBs como sink, ClickHouse); [`04-09`](./04-09-scaling.md) (parallelism, Kafka partition alignment); [`04-04`](./04-04-resilience-patterns.md) (resilience, exactly-once via 2PC).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Diferenciar Lambda e Kappa; quando cada.
- Diferenciar event-time e processing-time; explicar watermark.
- Listar window types e dar caso pra cada.
- Explicar exactly-once via checkpointing (Flink Chandy-Lamport informal).
- Justificar dbt em warehouse vs Spark transform.
- Comparar Airflow / Dagster / Prefect em 2 dimensões.
- Diferenciar Delta / Iceberg / Hudi.
- Explicar CDC log-based via Debezium.
- Listar 3 estratégias de data quality (tests, expectations, contracts).
- Explicar stream-stream join e desafio de state.
- Justificar at-least-once + idempotent em vez de strict exactly-once.

---

## 4. Desafio de Engenharia

Adicionar **pipeline de processamento full** à Logística: streaming real-time + batch nightly + lakehouse + dashboards.

### Especificação

1. **Streaming layer** (Flink ou ksqlDB local):
   - Source: Kafka topics (`orders`, `events`, `pings`).
   - Jobs:
     - **Real-time SLA monitor**: window 5min, alert se >5% pedidos late.
     - **Stream join**: pings × orders ativos para detectar courier off-route.
     - **Anomaly detection**: deviation de tempo médio de entrega por região.
   - Sink: Kafka tópicos de output + ClickHouse.
2. **CDC**:
   - Debezium captura mudanças `orders` e `users` Postgres → Kafka.
   - Propaga pra search index (02-15) e ClickHouse (03-13).
3. **Lakehouse** (Iceberg sobre MinIO):
   - Tabela `events_history` particionada por dia.
   - Compaction nightly.
   - Time-travel: query estado de 7 dias atrás.
4. **Batch transformations** (dbt + DuckDB ou Spark local):
   - Models: staging (raw clean) → intermediate (joined with dimensions) → marts (`fact_deliveries`, `dim_courier`, `dim_tenant`, `revenue_daily`).
   - Tests: not_null em PK, unique, custom test pra revenue match (sum diário == sum lojista + entregador + plataforma).
   - Docs auto-gerados.
5. **Orchestration** (Dagster ou Airflow):
   - DAG nightly: ingest CDC → run dbt → publish to ClickHouse → run quality checks → notify.
   - Sensors: trigger quando partition do dia anterior está completa.
   - Retry policy + on-failure callback (Slack).
6. **Dashboards consumindo**:
   - Real-time SLA (do streaming output).
   - Daily revenue / cohort (do dbt mart).
   - Time-travel: comparação operação hoje vs 30 dias atrás.

### Restrições

- Schema registry + Avro/Protobuf nos topics (não JSON livre).
- Effective-once (idempotent sinks + dedupe por event_id).
- DAG tem retry + alert.
- Watermark configurado realisticamente (5 min late tolerance).

### Threshold

- Streaming: SLA monitor reage em < 1 min em demo.
- Batch: dbt mart `revenue_daily` valida tests.
- Lakehouse: time-travel demo (`SELECT ... TIMESTAMP AS OF '...'`).
- Orchestration: 3 noites consecutivas sem intervenção; falha simulada cai em alert.

### Stretch

- **Materialize** ou **RisingWave** pra streaming SQL incremental.
- **Beam** com runner Flink trocado por Direct em testes.
- **Delta Lake** comparison side-by-side com Iceberg em mesmo workload.
- **Data contracts** com Soda Core ou Great Expectations integrado em CI.
- **Vector embeddings stream**: cada novo pedido tem embedding gerado por job e indexado em pgvector.
- **ML model serving**: predição de tempo de entrega via job streaming inferindo modelo treinado em batch.

---

## 5. Extensões e Conexões

- Liga com **01-04** (data structures): LSM, B-Tree, watermark heaps.
- Liga com **02-09** (Postgres): origem do CDC.
- Liga com **02-15** (search): index update via CDC.
- Liga com **03-02/03-03** (Docker/K8s): rodar Flink/Spark cluster.
- Liga com **03-07** (observability): metrics dos pipelines.
- Liga com **03-13** (analytical DBs): destino dos transforms.
- Liga com **04-01** (distributed): consistency, exactly-once.
- Liga com **04-02** (messaging): Kafka como backbone.
- Liga com **04-03** (event-driven): mesmo paradigm.
- Liga com **04-10** (AI/LLM): embeddings + pipelines de feature.
- Liga com **04-16** (product): unit economics requerem warehouse.

---

## 6. Referências

- **"Designing Data-Intensive Applications"**: Kleppmann, capítulos 10-12.
- **"Streaming Systems"**: Akidau, Chernyak, Lax. Bíblia do streaming.
- **"Fundamentals of Data Engineering"**: Reis, Housley.
- **Apache Flink docs** + **"Stream Processing with Apache Flink"**: Hueske, Kalavri.
- **dbt docs** + **"The dbt Book"**: Tristan Handy et al.
- **"Apache Iceberg: The Definitive Guide"**: Tomer Shiran et al.
- **Confluent blog**: exactly-once, schema registry.
- **Netflix Tech Blog**: data platform posts.
- **Materialize blog**: streaming SQL deep dives.
- **MIT 6.5840 (Distributed Systems)** course.
