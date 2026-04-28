---
module: A09
title: Postgres Deep — MVCC, Indexes, Query Planner, Replication
stage: apprentice
prereqs: [N04]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# A09 — Postgres Deep

## 1. Problema de Engenharia

Postgres é o DB relacional mais respeitado em backend moderno. ORMs e cloud providers o tornam acessível, e por isso desenvolvedores tratam ele como caixa-preta — escrevem queries que "funcionam" e descobrem em produção que escaneiam tabelas inteiras, que transações bloqueiam workers, que migrations matam tráfego, que `count(*)` é caro, que índices errados crescem o disco sem ajudar.

Este módulo é Postgres em camadas: storage físico (heap, pages, TOAST), MVCC (a chave de quase tudo), índices (B-Tree, GIN, BRIN, expression, partial), query planner (statistics, EXPLAIN ANALYZE), transações e isolation levels reais, lock granularity, replication, autovacuum, e operação. Ao final você sabe ler `EXPLAIN` e fazer schema decisions com base.

---

## 2. Teoria Hard

### 2.1 Storage físico

Postgres armazena dados em **heap files** (arquivos por tabela), divididos em **pages** de 8 KB (default). Cada page tem header, item pointers, e tuples.

- Cada **tuple** (linha) tem header com `xmin` (xid de inserção), `xmax` (xid de delete/update), `ctid` (page + offset).
- **Free Space Map (FSM)** rastreia espaço disponível.
- **Visibility Map (VM)** marca pages com tuples todos visíveis (otimização de vacuum).
- Tabelas grandes podem ter **TOAST** (The Oversized-Attribute Storage Technique) — colunas grandes (text, bytea) movidas pra tabela secundária com compressão.

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
- `Buffers: shared hit/read/written` (`EXPLAIN (ANALYZE, BUFFERS)`) — quanto veio de cache vs disco.

Use `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)` como padrão.

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
- **Discriminator** (`tenant_id` em cada tabela) — simples, ok pra tenants similares.
- **Schema per tenant** — médio isolamento, gerenciamento mais complexo.
- **Database per tenant** — máximo isolamento, mas operação pesada com muitos tenants.

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
   - `orders(tenant_id, status, created_at desc)` — listagem por tenant filtrando status.
   - `order_events(order_id, created_at)` — histórico por pedido.
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
   - Migration `003_add_priority_column.sql` adiciona `orders.priority int NOT NULL DEFAULT 0` — explique por que ele não trava prod no Postgres 11+.
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
- Configure pgBouncer em transaction mode na frente, e demonstre limitação (tente prepared statements e veja quebrar — depois ajuste).
- Use `pg_repack` pra eliminar bloat numa tabela inflada de propósito.
- Implemente full-text search com tsvector + trigger pra `orders.customer_name` e GIN index.

---

## 5. Extensões e Conexões

- Liga com **N04** (data structures): B-Tree real, hash table, heap.
- Liga com **N02** (OS): Postgres é multi-process, fsync, file descriptors, page cache do kernel.
- Liga com **A07** (Node): pool de conexões, drivers `pg`, behavior em event loop.
- Liga com **A08** (frameworks): integration via plugins (`@fastify/postgres`).
- Liga com **A10** (ORMs): Drizzle/Prisma geram SQL — você precisa saber ler o que sai.
- Liga com **A11** (Redis): cache de queries pesadas, rate limit store.
- Liga com **P02/P05** (Docker, AWS): rodar PG em RDS/Aurora vs container; PG operator no Kubernetes.
- Liga com **P10** (perf backend): EXPLAIN ANALYZE é base.
- Liga com **S01** (sistemas distribuídos): replication consistency, CAP.
- Liga com **S03** (event-driven): logical replication como base de CDC pro outbox.

---

## 6. Referências

- **Postgres docs** ([postgresql.org/docs/current](https://www.postgresql.org/docs/current/)) — leia chapters 11 (indexes), 13 (concurrency), 14 (performance), 25 (backups), 27 (replication).
- **"PostgreSQL Internals"** — Egor Rogov (e-book gratuito da Postgres Pro). Excelente.
- **"The Art of PostgreSQL"** — Dimitri Fontaine.
- **"Designing Data-Intensive Applications"** (DDIA) — Martin Kleppmann, capítulos 3 (storage), 7 (transactions).
- **Use The Index, Luke** ([use-the-index-luke.com](https://use-the-index-luke.com/)) — Markus Winand, indexação em SQL.
- **PostgreSQL Wiki**: páginas sobre Don't, Slow Query Questions, Lock Monitoring.
- **`explain.depesz.com`** — visualizador de EXPLAIN.
- **Bruce Momjian's talks** ([momjian.us/presentations](https://momjian.us/main/presentations/)).
