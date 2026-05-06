---
module: 02-09
title: Postgres Deep, MVCC, Indexes, Query Planner, Replication
stage: plataforma
prereqs: [01-04]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 02-09, Postgres Deep

## 1. Problema de Engenharia

Postgres é o DB relacional mais respeitado em backend moderno. ORMs e cloud providers o tornam acessível, e por isso desenvolvedores tratam ele como caixa-preta, escrevem queries que "funcionam" e descobrem em produção que escaneiam tabelas inteiras, que transações bloqueiam workers, que migrations matam tráfego, que `count(*)` é caro, que índices errados crescem o disco sem ajudar.

Este módulo é Postgres em camadas: storage físico (heap, pages, TOAST), MVCC (a chave de quase tudo), índices (B-Tree, GIN, BRIN, expression, partial), query planner (statistics, EXPLAIN ANALYZE), transações e isolation levels reais, lock granularity, replication, autovacuum, e operação. Ao final você sabe ler `EXPLAIN` e fazer schema decisions com base.

---

## 2. Teoria Hard

### 2.1 Storage físico

Postgres armazena dados em **heap files** (arquivos por tabela), divididos em **pages** de 8 KB (default). Cada page tem header, item pointers, e tuples.

- Cada **tuple** (linha) tem header com `xmin` (xid de inserção), `xmax` (xid de delete/update), `ctid` (page + offset).
- **Free Space Map (FSM)** rastreia espaço disponível.
- **Visibility Map (VM)** marca pages com tuples todos visíveis (otimização de vacuum).
- Tabelas grandes podem ter **TOAST** (The Oversized-Attribute Storage Technique), colunas grandes (text, bytea) movidas pra tabela secundária com compressão.

Implicação: row update **não atualiza in-place**. Cria nova versão, marca antiga como expirada, volta vacuum pra limpar. Isso é base do MVCC.

### 2.2 MVCC (Multi-Version Concurrency Control)

Em vez de bloquear leitores enquanto escritor escreve, Postgres mantém múltiplas versões. Cada transação tem `xid` e snapshot que define quais versões enxerga.

- **Readers don't block writers, writers don't block readers.**
- DELETE não remove a row imediatamente; marca xmax. Vacuum depois libera espaço.
- UPDATE = DELETE + INSERT (em termos de versão).
- **Bloat** acumula com churn. Sem vacuum periódico, tabela e índices crescem mesmo se row count é estável.

**Autovacuum** é daemon que aciona vacuum em tabelas com mudanças significativas. Configurável por tabela (`autovacuum_vacuum_scale_factor`). Em workloads write-heavy, **monitor lag de autovacuum** ou tabelas crescem sem freio.

### 2.3 Transactions e isolation levels

Postgres implementa SQL standard isolation levels (com diferenças):

- **Read Uncommitted**: na prática, comporta-se como Read Committed (Postgres não tem dirty read).
- **Read Committed** (default): cada statement vê snapshot fresco. Pode ter non-repeatable reads.
- **Repeatable Read**: snapshot fixo da primeira query. Pode ter serialization failures em update concorrente.
- **Serializable**: SSI (Serializable Snapshot Isolation), garante equivalência a alguma execução serial. Pode abortar txns ("could not serialize access").

Default é Read Committed. Em workloads onde correctness importa (transferências, contas), use Repeatable Read ou Serializable e trate retries.

### 2.4 Locks: granularidade

Postgres tem locks em vários níveis:
- **Table locks**: ACCESS SHARE (SELECT), ROW SHARE (SELECT FOR UPDATE), ROW EXCLUSIVE (INSERT/UPDATE/DELETE), SHARE (CREATE INDEX), SHARE ROW EXCLUSIVE, EXCLUSIVE (REFRESH MAT VIEW), ACCESS EXCLUSIVE (DROP TABLE, ALTER TABLE certos).
- **Row locks**: implementados via xmax na tuple, sem entry em lock table.
- **Advisory locks**: locks aplicação-controlados (`pg_advisory_lock`).

Lock matrix: ACCESS EXCLUSIVE bloqueia tudo (incluindo SELECT). Por isso `ALTER TABLE ADD COLUMN NOT NULL DEFAULT x` em tabela grande **trava produção** (Postgres 11+ otimiza alguns casos).

`pg_locks` view mostra locks atuais. Em incidentes, é a primeira query.

### 2.5 Indexes: B-Tree

Default é **B-Tree**. Suporta `=`, `<`, `<=`, `>`, `>=`, `BETWEEN`, `IN`, `IS NULL`, `LIKE 'prefix%'`.

Pontos:
- Index scan vs index-only scan vs bitmap scan: planner escolhe.
- **Index-only scan** quando todos os campos da query estão no índice e Visibility Map indica que é seguro.
- `INCLUDE` (covering index) adiciona colunas no leaf sem fazer key (Postgres 11+).
- Multi-column index: ordem importa. `(a, b, c)` ajuda queries que filtram por `a` ou `a+b` ou `a+b+c`, **não** por `b` sozinho.
- Índice em coluna que está em `WHERE` quase sempre vence sequential scan se seletividade < ~5%; senão sequential scan ganha.

### 2.6 Outros tipos de index

- **Hash**: igualdade exata. Em Postgres moderno, raramente vale (B-Tree é igualmente bom).
- **GIN** (Generalized Inverted Index): pra arrays, jsonb, full-text. Cada elemento mapeia pra lista de rows. Updates lentos (custo de manter posting lists), reads rápidos.
- **GiST** (Generalized Search Tree): genérico, suporta `@>`, geometry, ranges.
- **SP-GiST**: variante non-balanced, pra dados que partem bem.
- **BRIN** (Block Range Index): metadata por bloco (min/max). Tiny, ótimo pra time-series ou dados naturalmente ordenados (logs com timestamp). Ineficaz se ordem física é random.
- **Bloom**: probabilístico, queries de igualdade em muitas colunas.

### 2.7 Indexes especiais: partial, expression, unique

- **Partial index**: `CREATE INDEX ON orders(customer_id) WHERE status = 'pending'`. Só indexa subset, menor e mais focado.
- **Expression index**: `CREATE INDEX ON users (lower(email))` permite query `WHERE lower(email) = ?` usar índice.
- **Unique index**: garante unicidade. Backed por B-Tree.

#### Partial index — quando vence

Custo de índice = espaço + write amplification. Se 95% das queries filtram por subset (`status = 'pending'`, `deleted_at IS NULL`, `tenant_id = current_tenant`), partial cobre 100% dessas queries com 5% do tamanho.

```sql
-- Bad: full index (10M rows, 600MB)
CREATE INDEX ON orders (created_at DESC);

-- Good: partial covers só active orders (50k rows, ~3MB)
CREATE INDEX ON orders (created_at DESC) WHERE status IN ('pending', 'in_transit');
```

**Pegadinha**: planner só usa partial se `WHERE` da query é **subset lógico** do `WHERE` do índice. `WHERE status = 'pending'` usa o partial acima; `WHERE status = 'delivered'` não usa (e nem deveria).

Audit em prod:
```sql
-- Partial indexes vs full em mesma coluna
SELECT indexname, indexdef, pg_size_pretty(pg_relation_size(indexname::regclass))
FROM pg_indexes WHERE tablename = 'orders';
```

### 2.7.1 JSONB indexing patterns

JSONB é poderoso mas mal-indexado vira full table scan disfarçado. Padrões essenciais:

**`jsonb_path_ops` (containment-only, 2-3x menor que default):**
```sql
-- Default GIN: indexa cada key + value
CREATE INDEX ON events USING gin (payload);

-- Otimizado pra @> (containment): apenas hash de path-value pairs
CREATE INDEX ON events USING gin (payload jsonb_path_ops);

-- Query usa quando: WHERE payload @> '{"type":"OrderCreated","tenant_id":"abc"}'
```

`jsonb_path_ops` cobre **só containment (`@>`)**, não `?` (key exists), `?|`, `?&`. Se você só faz containment queries (caso comum), use; ganha 2-3x perf de write + index size menor.

**Expression index sobre path específico (vence GIN em queries point):**
```sql
-- Query frequente: payload->>'tenant_id'
CREATE INDEX ON events ((payload->>'tenant_id'));

-- Postgres trata column-like; planner pega quando WHERE for igual
SELECT * FROM events WHERE payload->>'tenant_id' = 'abc';
```

B-tree comum sobre expression é **MUITO** mais rápido que GIN pra equality em path conhecido. Use quando você sabe quais paths importam.

**Composite expression + partial:**
```sql
-- Eventos pendentes de processamento, indexed por tenant
CREATE INDEX ON events ((payload->>'tenant_id'))
  WHERE payload->>'status' = 'pending';
```

**`gin_trgm_ops` pra fuzzy search em JSONB:**
```sql
CREATE EXTENSION pg_trgm;
-- Trigram em path específico
CREATE INDEX ON products USING gin ((metadata->>'name') gin_trgm_ops);
-- Query: WHERE metadata->>'name' ILIKE '%cell%' OR metadata->>'name' % 'celular'
```

**Decisão de index pra JSONB:**

| Query pattern | Index ideal |
|---|---|
| `payload @> '{"k":"v"}'` (containment) | GIN com `jsonb_path_ops` |
| `payload->>'k' = 'v'` (equality em path conhecido) | B-tree expression |
| `payload->>'k' ILIKE '%foo%'` (fuzzy) | GIN trigram em expression |
| `payload ? 'k'` (key exists) | GIN default (`jsonb_ops`) |
| Range em path: `(payload->>'amount')::numeric > 100` | B-tree expression com cast |

#### Caso real Logística — events table

Schema:
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Queries comuns:
1. Last 50 events por tenant: `WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50`.
2. Events de tipo específico em janela: `WHERE tenant_id = $1 AND payload->>'type' = 'OrderCreated' AND created_at > now() - interval '1 day'`.
3. Search containment: `WHERE payload @> '{"order_id":"xyz"}'`.

Stack de índices ótimo:
```sql
-- Cobre (1) e (2) com sorting eliminado
CREATE INDEX ON events (tenant_id, created_at DESC);

-- Cobre (2) com filter no path; partial reduz espaço
CREATE INDEX ON events (tenant_id, (payload->>'type'), created_at DESC)
  WHERE created_at > now() - interval '90 days';   -- só hot data

-- Cobre (3) com containment-only path ops
CREATE INDEX ON events USING gin (payload jsonb_path_ops);
```

**Anti-patterns observados:**
- Único `CREATE INDEX ON events USING gin (payload)` pra "cobrir tudo" → grande, lento em write, e planner às vezes prefere Seq Scan mesmo assim.
- Sem partial em time-series → índice cresce com tabela; após anos vira maior que dados quentes.
- B-tree em `payload` direto (nem é tipo válido pra B-tree default; precisa cast).

**Maintenance:**
```sql
-- Index bloat audit
SELECT indexrelid::regclass, pg_size_pretty(pg_relation_size(indexrelid)) AS size,
       100 * (1 - (pg_relation_size(indexrelid)::float / GREATEST(1, pg_total_relation_size(tablename::regclass)))) AS pct_of_total
FROM pg_indexes JOIN pg_class ON oid = indexname::regclass
WHERE schemaname = 'public' ORDER BY pg_relation_size(indexrelid) DESC;

-- Reindex concurrently (Postgres 12+) sem lock prolongado
REINDEX INDEX CONCURRENTLY events_tenant_payload_idx;
```

Cruza com **02-09 §2.9** (EXPLAIN forensic em queries JSONB), **02-09 §2.13.1** (CDC de events table feed pipelines analíticos), **04-03 §2.4** (event-carried state com JSONB schema).

### 2.8 Query planner

Postgres tem planner baseado em custo. Pra cada query:
1. Parse AST.
2. Rewrite (views, rules).
3. Plan: avalia múltiplas estratégias, escolhe menor custo (baseado em `pg_class.reltuples`, `pg_stats`).
4. Execute.

Custos: `seq_page_cost`, `random_page_cost`, `cpu_tuple_cost`, etc. Você raramente toca.

**Estatísticas** vêm de `ANALYZE` (manual ou automático). Sem stats atualizadas, planner escolhe mal. Após bulk insert, sempre `ANALYZE`.

### 2.9 EXPLAIN e EXPLAIN ANALYZE

`EXPLAIN <query>`: mostra plano estimado. `EXPLAIN ANALYZE <query>`: roda e mostra reais.

Ler:
```
Seq Scan on orders  (cost=0.00..1543.00 rows=10000 width=80) (actual time=0.020..15.421 rows=9876 loops=1)
  Filter: (status = 'pending'::text)
  Rows Removed by Filter: 124
```

Sinais a procurar:
- `Seq Scan` em tabela grande com filtro seletivo → falta índice.
- `actual rows` muito diferente de `rows` (estimado) → stats desatualizadas.
- `Nested Loop` com loop count enorme → join sem índice.
- `Sort` em memória vs `Sort Method: external merge Disk` → work_mem baixo demais.
- `Buffers: shared hit/read/written` (`EXPLAIN (ANALYZE, BUFFERS)`), quanto veio de cache vs disco.

Use `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)` como padrão.

#### Forensic guide — como ler plan sem chutar

Plan é **árvore lida bottom-up, inside-out**: nodes mais indentados executam primeiro; output sobe pro pai. Tempo `actual time=A..B` é **A = startup time** (até primeira row), **B = total time**. **`actual rows × loops`** é volume real movido pelo nó.

**Workflow forense em 5 passos:**

1. **Identificar o nó dominante**: aquele com maior `actual time × loops` no caminho crítico. Não é sempre a raiz; pode ser um Nested Loop interno.
2. **Comparar `rows` (estimado) vs `actual rows`**: ratio > 10x → stats erradas; rode `ANALYZE <tabela>` ou aumente `default_statistics_target`.
3. **Conferir `Buffers`**: `shared read=N` significa N páginas (8KB cada) lidas do disco. Disco = lento; se `shared hit` predominar, dado quente em cache.
4. **Olhar `Filter` vs `Index Cond`**: `Filter` filtra após scan (caro); `Index Cond` filtra usando índice (barato). Filter com `Rows Removed by Filter` alto = índice mal-escolhido.
5. **Comparar com plano "esperado"**: você sabe que existe índice em `(tenant_id, status)` mas planner usa Seq Scan? Stats sugerem que filtro é pouco seletivo, ou `enable_seqscan` foi desabilitado, ou tabela é tão pequena que Seq Scan vence.

#### Caso real Logística — query lenta diagnosticada

Query reportada: "dashboard do lojista demora 4-8s para listar últimos 50 pedidos com courier name."

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT o.id, o.created_at, o.total, c.name AS courier_name
FROM orders o
LEFT JOIN couriers c ON c.id = o.courier_id
WHERE o.tenant_id = 'abc-123'
  AND o.status IN ('pending', 'in_transit')
ORDER BY o.created_at DESC
LIMIT 50;
```

Plan diagnóstico simplificado:
```
Limit  (actual time=4823.142..4823.156 rows=50 loops=1)
  ->  Sort  (actual time=4823.140..4823.149 rows=50 loops=1)
        Sort Key: o.created_at DESC
        Sort Method: top-N heapsort  Memory: 32kB
        ->  Hash Left Join  (actual time=98.214..4811.532 rows=287943 loops=1)
              Hash Cond: (o.courier_id = c.id)
              ->  Seq Scan on orders o  (actual time=0.018..4302.819 rows=287943 loops=1)
                    Filter: ((tenant_id = 'abc-123'::uuid) AND (status = ANY ('{pending,in_transit}')))
                    Rows Removed by Filter: 12_345_678
                    Buffers: shared read=412_891
              ->  Hash  (actual time=97.821..97.821 rows=523 loops=1)
                    Buckets: 1024 ...
Planning Time: 0.392 ms
Execution Time: 4823.234 ms
```

Diagnóstico:
- **`Seq Scan on orders` removeu 12M+ rows** pelo filtro → falta índice apropriado.
- **`shared read=412_891`** = 412k páginas × 8KB = ~3.2 GB do disco → cold read da tabela inteira. Painel de monitoring não é só lento, é I/O-disruptivo pra outras queries.
- Sort `top-N heapsort` ok pro LIMIT, não é gargalo.
- Hash join secundário; courier table é pequeno, ok.

Fix em ordem de impacto:

```sql
-- Composite index alinhado ao filtro + ORDER BY + LIMIT.
-- Critical: status, tenant_id em primeiro pra seletividade boa; created_at DESC pra evitar Sort.
CREATE INDEX CONCURRENTLY orders_active_by_tenant_idx
  ON orders (tenant_id, status, created_at DESC)
  INCLUDE (id, total, courier_id)            -- Index-Only Scan possible
  WHERE status IN ('pending', 'in_transit'); -- partial index, ~3% da tabela
```

Re-EXPLAIN após index:
```
Limit  (actual time=0.082..0.157 rows=50 loops=1)
  ->  Index Only Scan using orders_active_by_tenant_idx on orders o  (...rows=50 loops=1)
        Index Cond: (tenant_id = 'abc-123'::uuid)
        Heap Fetches: 0
  -> ... (Hash join trivial pelo Couriers)
Execution Time: 0.421 ms
```

**4823 ms → 0.4 ms** (= ~12000x). Index-only scan elimina heap fetch (necessita VACUUM frequente pra `visibility map` ficar atualizado, senão `Heap Fetches > 0`).

#### Anti-patterns observados em produção

- **EXPLAIN sem ANALYZE**: planner estima; pode estar errado por order de magnitude. Sempre ANALYZE em diagnóstico (cuidado em `INSERT/UPDATE/DELETE`: rode dentro de transação + ROLLBACK).
- **Otimizar pelo `cost`**: cost é heuristic; `actual time` é verdade. Compare actual vs actual entre planos.
- **Adicionar índice sem `CONCURRENTLY` em prod**: lock exclusive em escrita por minutos. Use `CREATE INDEX CONCURRENTLY` sempre em produção (mais lento, mas não bloqueia DML).
- **Index "pra todo filter"**: índice tem custo (write amplification, vacuum, espaço). Audit `pg_stat_user_indexes` mensal; remova `idx_scan = 0` há 30+ dias.

#### Ferramentas pra acelerar análise

- **explain.dalibo.com**: visualizador gráfico do plan, identifica nodes problemáticos automaticamente.
- **explain.depesz.com**: análise textual com colorização por severidade.
- **pg_stat_statements**: `SELECT * FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 20` revela top consumers no histórico.
- **auto_explain**: log automático de plans de queries lentas (set `log_min_duration_statement = 1000` + carregue `auto_explain` em `shared_preload_libraries`).

### 2.10 Joins: nested loop, hash, merge

- **Nested Loop**: pra cada row de A, busca em B. Bom se A pequeno e B indexado.
- **Hash Join**: build hash table de B, sonda com cada row de A. Bom pra joins com A médio e B médio, onde igualdade é usada.
- **Merge Join**: ambos ordenados pelo join key, scaneados em paralelo. Bom quando os dois já estão ordenados ou índices ajudam.

Planner escolhe; você normalmente confia. Quando der errado, força via `enable_*` flags em sessão de debug.

### 2.11 Vacuum e bloat

- **VACUUM**: marca tuples mortas como reusáveis. Não devolve disco.
- **VACUUM FULL**: rebuilda tabela, **trava completamente** (ACCESS EXCLUSIVE). Em prod só com janela.
- **REINDEX**: rebuilda índice. Versões modernas suportam `CONCURRENTLY` pra evitar lock pesado.
- **pg_repack** / **pg_squeeze**: extensão pra rebuild sem lock pesado.

Bloat se mede por extensions (`pgstattuple`) ou queries via `pg_stat_user_tables`.

### 2.12 Connection pooling

Cada conexão Postgres = processo OS (fork model). 200 conexões = 200 processos = RAM e file descriptors substanciais.

Apps web abrem muitas. Solução: **pooler** entre app e Postgres:
- **PgBouncer**: clássico, modos `session`, `transaction`, `statement`. Transaction mode reusa conexões entre transações; cuidado com features que dependem de session state (prepared statements, advisory locks, SET).
- **pgcat**: alternativa moderna em Rust com sharding, load balancing.
- **Supavisor** (Supabase): pooler escalável.

Em serverless, sem pooler, cada Lambda invoca conexão nova → conexão storm → DB cai. Sempre pooler.

### 2.13 Replication

- **Streaming replication**: WAL streaming pra réplica. Réplica fica em "hot standby" (read-only).
- **Logical replication**: publica/subscreve em nível de tabela; usa WAL decoding. Útil pra zero-downtime upgrades, multi-region partial replication, CDC (Change Data Capture).
- **Synchronous replication**: commit espera WAL replicado em ≥ 1 réplica antes de retornar. Maior latência, melhor RPO.
- **Asynchronous** (default): commit retorna assim que WAL local está flushed.

Failover manual ou via tools (Patroni, repmgr, cloud manager). RPO/RTO depende dos SLAs.

### 2.13.1 Logical replication deep, uso real

Streaming replication é simples: réplica é cópia exata. Logical é onde Senior real distingue de Pleno, habilita patterns que streaming não permite.

**Como funciona internamente:**
1. WAL é decodificado por **logical decoder** num formato lógico (INSERT/UPDATE/DELETE com valores).
2. **Publication** declara quais tabelas/operações expor: `CREATE PUBLICATION mypub FOR TABLE orders, payments;`
3. **Subscription** consome no consumidor: `CREATE SUBSCRIPTION mysub CONNECTION '...' PUBLICATION mypub;`
4. Apply worker no consumer aplica as mudanças.

**Patterns viabilizados:**
- **Zero-downtime major version upgrade**: Postgres 15 → 17 sem dump/restore. Logical replication mantém réplica nova em sync; cutover é segundos.
- **CDC pra event bus**: Debezium consome `pgoutput` plugin (logical decoding) e empurra pra Kafka. Base de outbox pattern (04-03). Sem dual-write, single source of truth.
- **Multi-region partial**: réplica regional só com tabelas relevantes. Streaming não consegue (cópia bit-a-bit, all-or-nothing).
- **Database-per-tenant consolidation**: agregar N DBs lógicas pra um warehouse via subscriptions seletivas.

**Pegadinhas críticas:**
- **DDL não replica**. `ALTER TABLE` no publisher exige aplicar manualmente no subscriber **antes** do data com a nova schema chegar.
- **Sequences não replicam**. Em failover lógico, você reseta sequences manualmente. Postgres 16+ pode replicar sequences via opção, mas com ressalvas.
- **Replication slot lag = WAL retido**. Se subscriber morre e ninguém percebe, slot mantém WAL no disco do publisher e enche o `pg_wal/`. Monitor `pg_replication_slots.confirmed_flush_lsn` SEMPRE.
- **DELETE/UPDATE de linhas sem REPLICA IDENTITY** (PK ou FULL) silenciosamente quebra. Verifique `relreplident` em todas as tabelas publicadas.
- **Conflict resolution**: subscriber recebe linha que já existe → erro, replication para. Postgres 16+ tem `subscription disable_on_error`.

**Postgres 17 (set/2024) features novas:**
- **Failover de logical slots**: réplica streaming preserva logical slots pra failover automatic. Antes era manual.
- **`pg_createsubscriber`**: converte streaming standby em subscriber de logical replication com 1 comando, mata o gap "preciso ressincar tudo do zero pra mudar pra logical".

**Aplicação concreta em Logística v2 → v3 (CDC pra event bus):**

Logística v2 grava `orders`, `payments`, `couriers` em Postgres direto (monolito modular). Em v3 (Estágio 4), CDC expõe esses writes como eventos Kafka sem dual-write:

```yaml
# Debezium connector config (Kafka Connect) pra outbox padrão
{
  "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
  "database.hostname": "postgres-rw.production",
  "plugin.name": "pgoutput",
  "publication.name": "outbox_pub",
  "slot.name": "outbox_slot",
  "table.include.list": "public.outbox",
  "transforms": "outbox",
  "transforms.outbox.type": "io.debezium.transforms.outbox.EventRouter",
  "transforms.outbox.table.field.event.type": "event_type",
  "transforms.outbox.route.topic.replacement": "logistics.${routedByValue}"
}
```

Schema da tabela `outbox` mínima:
```sql
CREATE TABLE outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type TEXT NOT NULL,    -- "Order", "Payment"
  aggregate_id UUID NOT NULL,
  event_type TEXT NOT NULL,        -- "OrderCreated", "PaymentCaptured"
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE outbox REPLICA IDENTITY FULL;  -- DELETE replication
CREATE PUBLICATION outbox_pub FOR TABLE outbox;
```

App grava em transação atômica:
```sql
BEGIN;
INSERT INTO orders (...) VALUES (...);
INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload)
  VALUES ('Order', $1, 'OrderCreated', $2);
COMMIT;
```

Debezium consume, publica em Kafka topic `logistics.OrderCreated`, deleta linha do outbox. Workers downstream (notifications, analytics, search index) consumem evento. Cruza com **04-03 §2.8** (outbox pattern completo) e **04-02** (Kafka).

**Monitoramento crítico em produção:**
```sql
-- Slot lag em bytes (alarmar > 1GB)
SELECT slot_name, pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn) AS lag_bytes
FROM pg_replication_slots WHERE active;

-- Idade do slot (alarmar > 1h sem progresso)
SELECT slot_name, EXTRACT(EPOCH FROM (now() - last_msg_receipt_time)) AS idle_seconds
FROM pg_stat_replication;
```

Alertas Prometheus: `pg_replication_slot_retained_bytes > 1e9` ou `pg_replication_lag_seconds > 60`. Slot abandonado enche `pg_wal/` em horas; evento real visto em produção (tools: pgwatch2, postgres_exporter).

**HA com Patroni (padrão 2026 pra Postgres self-managed):**
- **Patroni** (Zalando) coordena via **etcd/Consul/ZK** quem é primary, gerencia failover automático.
- **Synchronous standby names**: `synchronous_standby_names = 'ANY 1 (replica1, replica2)'` exige 1 réplica syncada antes de commit (RPO ≈ 0, latência +1-3ms).
- **Async** default: RPO de segundos, latência igual single-node.
- **PgBouncer** na frente do VIP do Patroni; failover é invisível pra app (poucos segundos de connection drop).
- Gerenciados (Aiven, Crunchy Bridge, Neon, Supabase) já fazem isso por você. Em managed cloud, paga premium pra não pensar nisso.

### 2.14 Postgres 17/18, features que mudam o jogo

Postgres ciclo anual; vale acompanhar releases recentes porque mudam patterns operacionais.

**Postgres 17 (set/2024):**
- **JSON_TABLE (SQL standard)**: query JSON como se fosse tabela relacional. Substitui parsing custom no app.
  ```sql
  SELECT * FROM JSON_TABLE(events, '$[*]'
    COLUMNS (id INT PATH '$.id', user_id INT PATH '$.user'));
  ```
- **Incremental backup** via `pg_basebackup --incremental`: backups baseados em WAL summaries em vez de full snapshot. Reduz custo de storage e tempo de backup em DBs grandes (>1TB).
- **MERGE com RETURNING**: ergonomia em upsert workflows.
- **Streaming I/O**: read-ahead em sequential scan reduz IOPS em queries OLAP.
- **Vacuum melhorado**: usa 1/4 da memória com new memory layout (importante pra DBs com muitas tabelas).
- **Logical replication failover** (acima).

**Postgres 18 (set/2025):**
- **Skip locked em WITH RECURSIVE**: ergonomia em queues SQL.
- **OAuth2/OIDC client authentication** built-in.
- **Optimizações em planner** pra queries com `IN (subquery)` e correlated subqueries.
- **`pg_stat_io`** mais detalhado (visibilidade fina de operação por tablespace/relation).
- **Connection pinning melhorado**: facilita session-level pooling em PgBouncer transaction mode.

**Como acompanhar:**
- Release notes oficiais (`https://www.postgresql.org/docs/current/release.html`), leia mesmo, são curtos.
- **Postgres Weekly** newsletter.
- Posts da Crunchy Data, Cybertec, EDB pra deep dives.

### 2.14 WAL e checkpoints

**WAL** (Write-Ahead Log) registra cada mudança antes de aplicar. Garante durabilidade e replication.

- `fsync` em commit garante que WAL chegou a disco. Desabilitar = não-durável (só em testes).
- **Checkpoints** flushan dirty buffers do shared buffer pool pra heap. Período controlado (`checkpoint_timeout`, `max_wal_size`).
- Picos de I/O em checkpoint podem aparecer como latência. `checkpoint_completion_target = 0.9` espalha trabalho.

### 2.15 Common types and JSON

- **`text`** (sem limite, exceto 1 GB), **`varchar(n)`** (com limite). Geralmente prefira `text`.
- **`numeric(p, s)`** pra dinheiro/decimais; nunca `float`.
- **`timestamp with time zone`** (`timestamptz`) sempre que envolve tempo. Armazena em UTC, interpreta na timezone do client.
- **`jsonb`** vs `json`: jsonb é binário, indexável, mais usado. `json` preserva ordem de keys e whitespace.
- **`uuid`** com extensions (`pgcrypto`, `uuid-ossp`).
- **`enum`**: tipos enumerados. Adicionar valor exige `ALTER TYPE`.

### 2.16 Schema design

- **Normalização** primeiro (3NF). Denormalize com motivo claro.
- **Foreign keys**: garanta integridade. Default ON. Indexe sempre a coluna FK (não vira índice automático).
- **Unique constraints**: definam invariantes. Backed por unique index.
- **Check constraints**: validações simples, persistidas no schema.
- **Generated columns** (Postgres 12+): valores computados.
- **Domains**: tipos custom (ex: email com check).

Multi-tenant em Postgres:
- **Discriminator** (`tenant_id` em cada tabela), simples, ok pra tenants similares.
- **Schema per tenant**: médio isolamento, gerenciamento mais complexo.
- **Database per tenant**: máximo isolamento, mas operação pesada com muitos tenants.

### 2.17 Migrations seguras

Mudanças de schema em prod:
- `ALTER TABLE ADD COLUMN NOT NULL DEFAULT x` em Postgres 11+ é fast (default registrado, não rewrite).
- Adicionar constraint `NOT NULL` numa coluna existente: `ALTER ... ADD CONSTRAINT ... NOT VALID`, depois `VALIDATE CONSTRAINT`. Sem isso, scan completo bloqueia.
- Criar índice grande: `CREATE INDEX CONCURRENTLY` evita ACCESS EXCLUSIVE.
- Renomes/drops: cuidado com clientes ainda usando schema antigo. Padrão: dual write, migrar leitores, dropar.

Toolings: **Drizzle Kit**, **Prisma Migrate**, **Atlas**, **sqitch**, **Flyway**. Eles geram diffs; você revisa SQL antes de aplicar.

### 2.18 Extensions

- **`pgcrypto`**: hashing, UUIDs.
- **`pg_stat_statements`**: estatísticas por query (top N por tempo). Indispensável em prod.
- **`pgvector`**: vetores e similarity search (AI/embeddings).
- **`pg_trgm`**: trigram, fuzzy match.
- **`postgis`**: geoespacial.
- **`timescaledb`**: time-series (hypertables).

### 2.19 Backups e PITR

- **`pg_dump`**: dump lógico. Útil pra backups pequenos, não pra DBs grandes.
- **`pg_basebackup`**: dump físico de cluster. Base pra streaming replication e PITR.
- **WAL archiving** (`archive_command`): copia WAL pra storage durável. Permite Point-in-Time Recovery.
- **wal-g**, **pgBackRest**: ferramentas que automatizam backup+PITR.

RPO depende de WAL archiving frequency. RTO depende de tamanho do basebackup + WAL replay time.

### 2.20 Postgres tuning sob carga — shared_buffers, work_mem, autovacuum, max_connections

Postgres "default" config sai do Debian/Ubuntu otimizado pra rodar em laptop. Em produção com 32GB RAM, default `shared_buffers = 128MB` deixa 99% de RAM ociosa. Tuning é ALAVANCA com 5-50x impact em latency p99 — mas tunar errado (`work_mem` alto + 200 connections) → OOM kill recorrente. Esta seção dá mapa: o que tunar, em que ordem, com que numbers, validados em prod.

**Foundation: 4 categorias de tuning**:

- **Memory** (`shared_buffers`, `work_mem`, `maintenance_work_mem`, `effective_cache_size`).
- **Connection** (`max_connections`, pgbouncer).
- **Write/checkpoint** (`wal_buffers`, `checkpoint_*`, `wal_compression`).
- **Autovacuum** (`autovacuum_*` family).

**Memory tuning — formula pragmática (32GB RAM dedicated server)**:

```ini
# postgresql.conf
shared_buffers = 8GB                    # 25% RAM (sweet spot Postgres docs)
effective_cache_size = 24GB             # 75% RAM (hint pra planner)
work_mem = 16MB                         # POR operação (sort/hash). Conn × ops × work_mem = total
maintenance_work_mem = 2GB              # VACUUM/REINDEX/CREATE INDEX standalone
wal_buffers = 64MB                      # default (-1 = 1/32 shared_buffers, max 16MB) é baixo demais
```

- **Pegadinha `work_mem`**: 100 connections × 5 ops/query × 16MB = 8GB potencial. Não é por backend; é por NÓ na query plan. Set conservador primeiro, override por session quando precisa: `SET work_mem = '256MB'` antes de query analytical pesada.
- **`effective_cache_size`**: NÃO aloca; só hint pro planner sobre OS page cache. Set alto pra planner preferir Index Scan sobre Seq Scan.
- Em K8s pod com `requests.memory = 16GB`: shared_buffers 4GB, effective_cache_size 12GB. Calcule sobre limit, NÃO sobre node total.

**Connection tuning — pgbouncer obrigatório**:

Postgres backend = OS process com ~10MB shared + ~8MB private per connection. 500 connections = ~4GB só de overhead.

**Regra pragmática**: `max_connections` baixo (50-100), pgbouncer transaction-mode na frente.

```ini
# postgresql.conf
max_connections = 100                   # baixo + pgbouncer scale
superuser_reserved_connections = 5

# pgbouncer.ini
pool_mode = transaction                 # transaction (não session) pra max throughput
max_client_conn = 5000
default_pool_size = 25
reserve_pool_size = 5
reserve_pool_timeout = 3
server_idle_timeout = 600
```

- **Pegadinha transaction-mode**: NÃO suporta `LISTEN/NOTIFY`, prepared statements (Postgres < 14), session-level `SET`, advisory locks session-scoped. Usa session-mode pra esses.
- Postgres 14+: `pgbouncer` + prepared statements via `track_prepared_statements`.

**Autovacuum tuning — onde 90% das production failures vivem**:

Default autovacuum é tunado pra DB pequeno. Em fact tables 100M+ rows com churn alto, default vacuum demora horas, deixa bloat acumular, query plans ficam errados (estatísticas stale).

```ini
# postgresql.conf
autovacuum = on
autovacuum_max_workers = 6              # default 3; aumenta pra DB com muitas tables
autovacuum_naptime = 30s                # check interval; default 1min
autovacuum_vacuum_scale_factor = 0.05   # default 0.2 = 20% changed; baixe pra tabelas grandes
autovacuum_vacuum_threshold = 50
autovacuum_analyze_scale_factor = 0.02  # baixe pra estatísticas frescas
autovacuum_vacuum_cost_limit = 2000     # default 200; aumenta pra vacuum não morrer
autovacuum_vacuum_cost_delay = 10ms     # default 20ms
```

**Per-table override pra hot tables**:

```sql
ALTER TABLE tracking_pings SET (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_analyze_scale_factor = 0.01,
  autovacuum_vacuum_cost_limit = 4000,
  fillfactor = 90                       -- HOT updates win
);
```

**Bloat detection + fix**:

```sql
-- Tables com mais bloat (% wasted space)
SELECT schemaname, tablename,
       pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS size,
       n_dead_tup, n_live_tup,
       ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct,
       last_autovacuum, last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC LIMIT 20;

-- Bloat estimado por extensão pgstattuple
CREATE EXTENSION pgstattuple;
SELECT * FROM pgstattuple_approx('public.orders');
```

Fix:

```bash
# VACUUM FULL = lock exclusivo (don't in prod)
# Em prod: pg_repack (extension) faz online
pg_repack -h db -d logistics -t orders -j 4
```

**Checkpoint tuning — write spike protection**:

```ini
checkpoint_timeout = 15min              # default 5min; aumenta pra menos checkpoint pressure
max_wal_size = 8GB                      # default 1GB; sobe pra absorver write spike
min_wal_size = 1GB
checkpoint_completion_target = 0.9      # spread writes em 90% do timeout window
wal_compression = on                    # CPU < disk IO trade
```

- **Sintoma de checkpoint pressure**: latency spike a cada 5min em monitoring. `pg_stat_bgwriter.checkpoints_timed` vs `checkpoints_req` — req >> timed = pressure.
- `wal_compression = on`: trade ~5% CPU por 30-50% menos WAL bytes. Vence em network-attached storage.

**Tuning observability — queries diagnostics**:

```sql
-- Top queries por tempo total (precisa pg_stat_statements)
SELECT query, calls, total_exec_time, mean_exec_time, rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC LIMIT 20;

-- Cache hit ratio (deve ser > 99% pra working set caber em shared_buffers)
SELECT sum(heap_blks_read) AS read, sum(heap_blks_hit) AS hit,
       100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) AS hit_pct
FROM pg_statio_user_tables;

-- Wait events em tempo real
SELECT wait_event_type, wait_event, count(*)
FROM pg_stat_activity
WHERE state = 'active'
GROUP BY wait_event_type, wait_event
ORDER BY count DESC;

-- Connections em uso
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
```

**Logística production config (32GB RAM, 8 vCPU, 1TB SSD)**:

```ini
# Memory
shared_buffers = 8GB
effective_cache_size = 24GB
work_mem = 32MB
maintenance_work_mem = 2GB
wal_buffers = 64MB

# Connection
max_connections = 100

# Write/Checkpoint
checkpoint_timeout = 15min
max_wal_size = 8GB
checkpoint_completion_target = 0.9
wal_compression = on
wal_writer_delay = 200ms

# Query planner
random_page_cost = 1.1                  # SSD; default 4 assume HDD
effective_io_concurrency = 200          # SSD high; HDD = 2
default_statistics_target = 250         # default 100; melhora plans

# Autovacuum
autovacuum_max_workers = 6
autovacuum_naptime = 30s
autovacuum_vacuum_scale_factor = 0.05
autovacuum_vacuum_cost_limit = 2000

# Logging (pra slow query forensics)
log_min_duration_statement = 1000       # log queries > 1s
log_lock_waits = on
log_temp_files = 0                      # log toda spillage pra disk
log_autovacuum_min_duration = 1000
```

\+ pgbouncer transaction-mode com pool_size 25.

**Anti-patterns observados**:

- **`shared_buffers > 40% RAM`**: contention double-buffering com OS cache; perf piora.
- **`work_mem` alto global** (256MB) com 100 connections: 1 query complexa por conn × 256MB = 25GB potencial → OOM.
- **`max_connections = 500` sem pgbouncer**: backend overhead come 4GB de RAM ociosos.
- **Autovacuum desligado** "porque incomoda": bloat compound; query plans rotting; eventual `VACUUM FULL` em manutenção emergencial com lock global.
- **`checkpoint_timeout = 30min` sem `max_wal_size` aumentado**: WAL enche disco, DB para de aceitar writes.
- **Sem `log_min_duration_statement`**: slow query investigation cega.
- **Tunar via blog post genérico sem medir**: aplica config do "PG tuning calculator" que assume workload OLTP, mas você tem analytical mixed.

**Validation toolkit**:

- **`pgbench`** pra workload sintético baseline.
- **`pg_stat_statements`** + Grafana dashboard pra continuous monitoring.
- **`auto_explain`** loga plan de queries lentas automaticamente.
- **`pgbadger`** parse logs em report HTML — visualiza query patterns.
- **`PgHero`** dashboard quick wins (missing indexes, dead tup, slow queries).

Cruza com **02-09 §2.7** (índices), **02-09 §2.9** (EXPLAIN forensic), **02-09 §2.13** (replication tem implicações de wal_*), **02-09 §2.18** (extensions tipo pg_stat_statements/pgstattuple), **04-09 §2.x** (connection pooling escalando).

---

### 2.21 Logical replication + table partitioning + read replicas production deep

Postgres 17 (stable Sept 2024) consolidou logical replication como mecanismo first-class pra cross-region read replicas, zero-downtime major upgrades e CDC pra lakehouse. Native partitioning entrega 10-100x ganho em queries time-series quando combinada com partition pruning + per-partition indexes. Esta seção cobre arquitetura, DDL copy-paste e routing patterns que sustentam Logística com 50M tracking_pings/mês cross-region.

**Physical vs logical replication — quando usar cada**:

- **Physical (streaming)**: byte-level WAL stream; entire cluster replicado; standby NÃO writeable; use pra HA + read scaling same-region.
- **Logical**: row-level changes via decoded WAL (publication/subscription); selective tables; replica writeable em outros tables; cross-version + cross-architecture; use pra multi-region, major upgrade, CDC.
- **Pegadinha 17**: DDL not replicated. `CREATE TABLE` no master = NÃO aparece na replica. Aplica DDL nos dois lados via migration tool (Drizzle, Flyway). Postgres 17 trouxe melhorias em `publish_via_partition_root` pra partitioned tables.

**Logical replication — pattern básico**:

```sql
-- primary:
ALTER SYSTEM SET wal_level = logical;
SELECT pg_reload_conf();
CREATE PUBLICATION orders_pub FOR TABLE orders, order_items;

-- subscriber (replica):
CREATE SUBSCRIPTION orders_sub
  CONNECTION 'host=primary.example.com dbname=logistica user=replicator password=...'
  PUBLICATION orders_pub;
```

- **Conflicts handling**: subscriber recebe INSERT que viola PK em local data → subscription para. Resolve via custom logic ou skip: `ALTER SUBSCRIPTION orders_sub SKIP (lsn = '0/12345')`.
- **Initial sync**: subscriber faz `COPY` de cada table (slow em tables grandes — horas pra 100GB). Use `copy_data = false` se já fez snapshot manual + advance LSN via `pg_replication_origin_advance`.
- **Monitoring obrigatório**: `pg_stat_subscription` no subscriber + `pg_replication_slots` no primary. Alert se `confirmed_flush_lsn` lag > 1min.

**Use cases logical replication 2026**:

- **Multi-region read replicas**: writes central, reads regionais (latency-sensitive).
- **Major version upgrade** (16 → 17): replication-then-cutover sem downtime.
- **Data warehouse sync**: Postgres OLTP → analytics replica + ClickHouse via separate CDC.
- **Multi-tenant per-tenant DB**: replicate selective tables to tenant-specific DB.

**Native partitioning — 4 estratégias**:

- **PARTITION BY RANGE**: time-series (date, id sequencial).
- **PARTITION BY LIST**: categorical (tenant_id values, region codes).
- **PARTITION BY HASH**: uniform distribution sem natural key; reduz lock contention em high-write.
- **Sub-partitioning**: RANGE by date + LIST by tenant_id (warehouse multi-tenant).

**Range partitioning by date — Logística `tracking_pings`**:

```sql
CREATE TABLE tracking_pings (
  id BIGSERIAL,
  courier_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  PRIMARY KEY (ts, id)
) PARTITION BY RANGE (ts);

CREATE TABLE tracking_pings_2026_05 PARTITION OF tracking_pings
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE tracking_pings_2026_06 PARTITION OF tracking_pings
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

-- Indexes per partition (NÃO globais em Postgres):
CREATE INDEX ON tracking_pings_2026_05 (courier_id, ts DESC);
CREATE INDEX ON tracking_pings_2026_05 (tenant_id, ts DESC);
```

- **`pg_partman` 5+**: auto-create future partitions + auto-drop retention. Cron job: `SELECT partman.run_maintenance()`.
- **Partition pruning**: `EXPLAIN ANALYZE SELECT * FROM tracking_pings WHERE ts > '2026-05-15'` mostra só `tracking_pings_2026_05` scanned.

**Detach + drop pattern (retention)**:

```sql
-- Move 2024 partition out of active table (lock leve):
ALTER TABLE tracking_pings DETACH PARTITION tracking_pings_2024_01 CONCURRENTLY;
-- Standalone agora. Archive ou drop:
DROP TABLE tracking_pings_2024_01;
-- OR: pg_dump tracking_pings_2024_01 | aws s3 cp - s3://cold-storage/...
```

- `CONCURRENTLY` (Postgres 14+) reduz lock de `AccessExclusiveLock` pra `ShareLock`. Sem `CONCURRENTLY` em prod = stalls de minutos.

**Hash partitioning — high-write workloads**:

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  payload JSONB
) PARTITION BY HASH (tenant_id);

CREATE TABLE events_h0 PARTITION OF events FOR VALUES WITH (modulus 16, remainder 0);
CREATE TABLE events_h1 PARTITION OF events FOR VALUES WITH (modulus 16, remainder 1);
-- ... 16 partitions total
```

- Reduz lock contention em high-concurrency INSERTs (cada partition tem própria heap + indexes + WAL lock).
- **Numbers reais**: 16-64 hash partitions é sweet spot pra 1k-100k inserts/sec. Acima de 128 partitions, planner overhead começa a doer.

**Read replicas + connection routing**:

- **Hot standby** (physical): replica read-only; reads regulares funcionam.
- **Streaming lag**: < 1ms LAN; cross-region 50-200ms; alert `pg_last_wal_replay_lsn` lag > 5s.
- **Routing patterns**:
  - **Server-side**: app lê de replica via separate connection string.
  - **Middleware**: PgBouncer transaction-mode + custom routing (read = replica, write = primary).
  - **Library-level**: Drizzle/Prisma `replicaUrl` config (route automático).
- **Read-after-write consistency**: write no primary → read na replica pode ver stale. Pattern: writes + recent-reads (TTL 5s) ao primary; cold reads à replica.

**PgBouncer production**:

```ini
# pgbouncer.ini
pool_mode = transaction      # default 2026; reuse conn after commit
pool_size = 50               # per database
max_client_conn = 1000
server_idle_timeout = 600
```

- **Transaction mode**: NÃO suporta prepared statements LRU sem patches; quebra silently com Drizzle/Prisma se `prepare = true`. Set `prepare = false` ou usa **PgCat** (Rust, multi-tenant aware) ou **Supavisor** (Supabase, Elixir, 2026 stable).
- **Session mode**: conn dedicada per client; suporta prepared statements; menos eficiente.
- **Statement mode**: conn per statement; drops transactions; rare use case.

**Vacuum strategy com partitions**:

- Autovacuum roda per-partition. Override `autovacuum_vacuum_scale_factor = 0.02` na partition ativa (current month).
- Old partitions read-only: `VACUUM (FREEZE) tracking_pings_2024_05` uma vez + leave alone (não acumula bloat).
- Pegadinha: `VACUUM` em partitioned root rola pelos children — heavy; evita peak hours.

**Logística applied stack**:

- **Primary**: Railway Postgres 17 master (write workload).
- **Read replicas**: 1 per region (US-East, EU-West, BR-São Paulo) via Railway replica feature OU manual logical subscription.
- **Partitioning**: `tracking_pings` RANGE by month (~10M rows/mo); `events` HASH by tenant_id (16 partitions); `audit_log` RANGE by year.
- **Retention**: pg_partman auto-drop tracking_pings > 6 meses; events > 1 ano.
- **PgBouncer**: pool_size 50 per DB, transaction mode + `prepare = false`; ~500 active connections per replica.
- **App routing**: Drizzle `replicaUrl` config; reads automatic; writes always primary.

**Anti-patterns observados (10 itens)**:

- Single un-partitioned table > 100GB com queries `WHERE date > X` (sequential scan; partition by date).
- Logical replication SUBSCRIPTION sem error monitoring (subscriber para silently; lag growth invisible).
- Replica reads sem replica-lag check (returns stale data; user "just made order" não vê em refresh).
- `enable_partition_pruning = off` deixado em prod após debug.
- Indexes NÃO replicados em partitions filhas (forgotten indexes em new partitions criadas por pg_partman).
- `wal_level = replica` em primary mas `logical` necessário pra logical replication (silent fail subscription).
- `ADD COLUMN NOT NULL` em partitioned table (rewrite massive; use NULLABLE + backfill + add NOT NULL).
- PgBouncer transaction mode + prepared statements ativos = silent break (use session mode, PgCat, ou `prepare = false`).
- Replica failover sem connection string switch logic (writes erram até manual intervention).
- `pg_dump` em primary durante peak (heavy I/O; usa replica pra backups).

Cruza com **02-10** (ORMs, replicaUrl config); **03-05** (AWS RDS Postgres + Aurora replicas); **04-09** (scaling, replica strategy, regional routing); **04-13** (CDC pra lakehouse via logical replication source); **02-11** (Redis, cache aside on top of replicas).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Explicar MVCC: o que xmin/xmax fazem, por que UPDATE não é in-place, papel do vacuum.
- Distinguir Read Committed, Repeatable Read e Serializable e dar caso onde cada falha.
- Listar 4 tipos de index além de B-Tree e dar caso pra cada.
- Ler `EXPLAIN ANALYZE` e identificar: scan type, join type, sort method, estimativa vs real.
- Explicar por que `ALTER TABLE ADD COLUMN NOT NULL DEFAULT` clássico travava produção e como Postgres 11+ resolveu parcialmente.
- Justificar PgBouncer transaction mode: que features quebram e por quê.
- Explicar streaming vs logical replication com 1 caso pra cada.
- Diagnosticar tabela com bloat: como medir, opções pra reduzir.
- Distinguir `text`, `varchar(n)`, `varchar` e dizer qual usar.
- Estratégia segura pra criar índice numa tabela com 100M rows.

---

## 4. Desafio de Engenharia

Construir o **schema Postgres da Logística** + provar entendimento via análise.

### Especificação

1. **Setup**:
   - Postgres 16+ local (Docker ou Railway dev DB).
   - Conexão com `psql` direta. Migrations escritas em SQL puro (sem ORM nesse módulo).
2. **Schema** (mínimo):
   - `tenants(id uuid pk, name, created_at)`.
   - `users(id uuid pk, tenant_id fk, email unique by tenant, role enum: lojista|entregador|cliente, password_hash, created_at)`.
   - `orders(id uuid pk, tenant_id fk, customer_user_id fk, status enum, total numeric(12,2), pickup_address jsonb, delivery_address jsonb, created_at, updated_at)`.
   - `order_events(id bigserial pk, order_id fk, event_type, payload jsonb, created_by_user_id fk, created_at)`.
   - `couriers(user_id fk pk, vehicle_type enum, current_location point, last_seen_at)`.
3. **Indexes**:
   - `orders(tenant_id, status, created_at desc)`, listagem por tenant filtrando status.
   - `order_events(order_id, created_at)`, histórico por pedido.
   - GIN em `orders.delivery_address` (queries em jsonb).
   - Partial index em `orders(courier_user_id) WHERE status IN ('picked_up','en_route')`.
4. **Constraints**:
   - FKs com `ON DELETE` apropriado.
   - Check `orders.total > 0`.
   - Unique constraint `users(tenant_id, email)`.
5. **Seed data**:
   - Script gera 3 tenants, 100 users por tenant, 100k orders distribuídos, 500k events.
6. **Análise**:
   - Documente em `analysis.md`:
     - 5 queries representativas (lista pedidos pendentes do tenant, histórico de pedido, pedidos atribuídos a um courier, etc.) com `EXPLAIN ANALYZE` antes e depois de criar índices.
     - 1 caso onde índice **não** ajudou (seq scan venceu) e por quê.
     - Tamanho de cada tabela e índice (`pg_total_relation_size`).
7. **Migrations**:
   - Cada mudança em arquivo numerado (`001_initial.sql`, `002_add_courier.sql`, ...).
   - Migration `003_add_priority_column.sql` adiciona `orders.priority int NOT NULL DEFAULT 0`, explique por que ele não trava prod no Postgres 11+.
8. **Operação**:
   - Configure `pg_stat_statements`. Após gerar load, mostre top 5 queries.
   - Mostre saída de `pg_stat_user_tables` e identifique tabelas com bloat ou n_dead_tup alto.

### Restrições

- Nada de ORM. SQL puro.
- Nada de "criar tudo via GUI". Migrations versionadas.

### Threshold

- README documenta:
  - ER diagram do schema.
  - Decisão por cada índice criado, com `EXPLAIN ANALYZE` antes e depois.
  - 1 query que você imaginou útil mas o planner ignorou e por quê.
  - Comparação `random_page_cost` default vs ajustado pra SSD (1.1) e impacto no planner.

### Stretch

- Configure réplica streaming local e mostre lag.
- Configure pgBouncer em transaction mode na frente, e demonstre limitação (tente prepared statements e veja quebrar, depois ajuste).
- Use `pg_repack` pra eliminar bloat numa tabela inflada de propósito.
- Implemente full-text search com tsvector + trigger pra `orders.customer_name` e GIN index.

---

## 5. Extensões e Conexões

- Liga com **01-04** (data structures): B-Tree real, hash table, heap.
- Liga com **01-02** (OS): Postgres é multi-process, fsync, file descriptors, page cache do kernel.
- Liga com **02-07** (Node): pool de conexões, drivers `pg`, behavior em event loop.
- Liga com **02-08** (frameworks): integration via plugins (`@fastify/postgres`).
- Liga com **02-10** (ORMs): Drizzle/Prisma geram SQL, você precisa saber ler o que sai.
- Liga com **02-11** (Redis): cache de queries pesadas, rate limit store.
- Liga com **03-02/03-05** (Docker, AWS): rodar PG em RDS/Aurora vs container; PG operator no Kubernetes.
- Liga com **03-10** (perf backend): EXPLAIN ANALYZE é base.
- Liga com **04-01** (sistemas distribuídos): replication consistency, CAP.
- Liga com **04-03** (event-driven): logical replication como base de CDC pro outbox.

---

## 6. Referências

- **Postgres docs** ([postgresql.org/docs/current](https://www.postgresql.org/docs/current/)), leia chapters 11 (indexes), 13 (concurrency), 14 (performance), 25 (backups), 27 (replication).
- **"PostgreSQL Internals"**: Egor Rogov (e-book gratuito da Postgres Pro). Excelente.
- **"The Art of PostgreSQL"**: Dimitri Fontaine.
- **"Designing Data-Intensive Applications"** (DDIA), Martin Kleppmann, capítulos 3 (storage), 7 (transactions).
- **Use The Index, Luke** ([use-the-index-luke.com](https://use-the-index-luke.com/)), Markus Winand, indexação em SQL.
- **PostgreSQL Wiki**: páginas sobre Don't, Slow Query Questions, Lock Monitoring.
- **`explain.depesz.com`**: visualizador de EXPLAIN.
- **Bruce Momjian's talks** ([momjian.us/presentations](https://momjian.us/main/presentations/)).
