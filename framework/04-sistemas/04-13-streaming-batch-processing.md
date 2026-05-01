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
