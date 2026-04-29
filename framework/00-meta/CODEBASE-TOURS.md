# CODEBASE-TOURS, Guided Reading de Repos Canônicos

> Ler **código de produção de classe mundial** é uma das atividades de maior alavancagem em engineering. Mas repos grandes são intimidantes, V8 tem 5M+ linhas; Linux kernel tem 30M+. Sem mapa, abrir GitHub é overwhelming.
>
> Este doc é o **mapa**: para cada repo canônico, exatamente quais arquivos abrir, em qual ordem, e o que procurar. Cada tour estima 4-12 horas de leitura ativa (não passive scroll).
>
> **Como usar**: 1 repo por mês ao longo de cada estágio. Não tente ler tudo. Cada tour é satisfatório standalone.

---

## Como ler código de produção

Antes de qualquer tour:

1. **Não leia linearmente.** Comece pelo ponto de entrada (main, server.start), siga o fluxo de uma operação real.
2. **Tenha pergunta específica**: "como esse engine faz X?" Sem pergunta, leitura é entretenimento.
3. **Anote em journal**: pattern visto, surpresa, dúvida. Entries pra Anki + journal de descobertas.
4. **Compile e rode local** quando possível. Quebra mental "código mágico" → "código que roda no meu PC".
5. **Use IDE com goto-definition**, não browser. Navigation matters em codebase grande.
6. **Assista talks** dos autores antes/depois, frequentemente explicam por que decisions, que código não diz.
7. **Não leia testes em vez de código** (tests são specs, não implementation).
8. **Aceite buracos**: você não vai entender 80% do repo. Pega 20% que importa.

---

## Tour 1: V8 (engine JavaScript), para 01-07, 01-13, 01-14

**Repo**: [github.com/v8/v8](https://github.com/v8/v8)
**Linguagem**: C++, alguns assembly.
**Tamanho**: ~5M LOC.
**Tour estimate**: 8-12 horas.

**Pergunta orientadora**: como V8 transforma `function add(a,b){return a+b}` em código de máquina e otimiza?

### Path:

1. **`src/parsing/parser.cc`** (parser top-level). Skim. Identifique recursive descent. Compare com 01-13.
2. **`src/parsing/scanner.cc`** (lexer). Veja state machine de tokens.
3. **`src/ast/ast.h`** (AST nodes). Hierarchy.
4. **`src/interpreter/interpreter.cc`** + **`bytecode/bytecode-generator.cc`** (Ignition, interpretador bytecode). Como AST → bytecode.
5. **`src/objects/objects.h`** + **`map.h`** (V8 hidden classes ≡ Maps). Where shapes live. Crítico pra 01-14 perf.
6. **`src/compiler/turbofan.cc`** (otimizador). Não tente entender; só veja escala. JIT optimizing tier.
7. **`src/heap/heap.cc`** + **`mark-compact.cc`** (GC). Generational + mark-compact. Connecta com 01-13 §2.10.

### What to look for:
- Tipos de IC (Inline Cache) em `src/ic/`.
- Como `Object.foo` acessa hidden class.
- O que dispara **deopt** em TurboFan.
- Generational hypothesis em código.

### Talks complementares:
- "Inside V8", Franziska Hinkelmann.
- "V8 internals: Things you do not want to forget", Sigmund Cherem.

### Notes pra journal:
- Hidden class transitions tracked como Map → Map links.
- Inline cache hit / miss distinction.
- Bytecode handlers em assembly (template tail call).

---

## Tour 2: PostgreSQL, para 02-09, 03-13, 04-09, 04-14

**Repo**: [github.com/postgres/postgres](https://github.com/postgres/postgres)
**Linguagem**: C.
**Tamanho**: ~2M LOC.
**Tour estimate**: 12-20 horas (Postgres é denso).

**Pergunta orientadora**: como Postgres executa `SELECT * FROM users WHERE email = $1`?

### Path:

1. **`src/backend/tcop/postgres.c`** (`PostgresMain`): main loop por backend process. Recebe query, dispatch.
2. **`src/backend/parser/`**: parser SQL. `gram.y` é Bison grammar.
3. **`src/backend/optimizer/`** (planner): `plan/planmain.c` start. Cost-based.
4. **`src/backend/executor/execMain.c`**: volcano-style iterators.
5. **`src/backend/access/heap/heapam.c`**: heap access (tuples, MVCC core). xmin/xmax visíveis.
6. **`src/backend/access/nbtree/`**: B-Tree implementation. Postgres é referência canônica.
7. **`src/backend/storage/buffer/bufmgr.c`**: shared buffer pool.
8. **`src/backend/access/transam/xlog.c`**: WAL implementation.
9. **`src/backend/storage/lmgr/`**: lock manager.
10. **`src/backend/utils/mmgr/aset.c`**: Postgres memory allocator (memory contexts).

### What to look for:
- Tuple visibility check: `HeapTupleSatisfiesMVCC`.
- ANALYZE collecting stats: `src/backend/commands/analyze.c`.
- Vacuum: `src/backend/commands/vacuum.c`.
- Logical replication: `src/backend/replication/logical/`.
- pg_stat_statements: `contrib/pg_stat_statements/`.

### Talks complementares:
- Bruce Momjian, series sobre Postgres internals.
- Egor Rogov "PostgreSQL 14 Internals" book (gratuito).

### Notes pra journal:
- Tuple header layout (xmin, xmax, ctid).
- Plan tree pra simple SELECT.
- Como WAL é flushed em commit.

---

## Tour 3: Redis, para 02-11

**Repo**: [github.com/redis/redis](https://github.com/redis/redis)
**Linguagem**: C.
**Tamanho**: ~150k LOC. **Compacto**.
**Tour estimate**: 4-8 horas. Mais acessível que Postgres.

**Pergunta orientadora**: como Redis processa `ZADD myset 5 hello` em < 1ms?

### Path:

1. **`src/server.c`** (`main`, `serverCron`, `processCommand`). Single-threaded event loop.
2. **`src/networking.c`**: client connection handling.
3. **`src/dict.c`**: hash table implementation (incremental rehashing!). Beautiful code.
4. **`src/t_zset.c`**: sorted set (skip list + dict). Reference implementation skip list.
5. **`src/t_hash.c`**, `src/t_string.c`, `src/t_list.c`, `src/t_set.c`: data types.
6. **`src/aof.c`**: AOF persistence.
7. **`src/rdb.c`**: snapshot persistence.
8. **`src/cluster.c`**: clustering (gossip).
9. **`src/replication.c`**: master-replica.

### What to look for:
- Como event loop (`ae.c`) implementa epoll/kqueue.
- Skip list implementation (clássica).
- Incremental rehash: hash table grows sem stop-the-world.
- LRU eviction approximation.

### Notes pra journal:
- Single-threaded design e implications.
- Como AOF rewrite acontece sem block.
- Sorted set = skip list + hash side-by-side, why both.

---

## Tour 4: libuv, para 02-07, 01-02

**Repo**: [github.com/libuv/libuv](https://github.com/libuv/libuv)
**Linguagem**: C.
**Tamanho**: ~80k LOC.
**Tour estimate**: 4-6 horas.

**Pergunta orientadora**: como Node executa `fs.readFile(path, callback)` sem bloquear?

### Path:

1. **`docs/src/design.rst`**: doc oficial design.
2. **`src/unix/core.c`** (`uv_run`): event loop.
3. **`src/unix/async.c`**: async handles.
4. **`src/unix/threadpool.c`**: thread pool pra fs/DNS/work.
5. **`src/unix/fs.c`**: fs operations.
6. **`src/unix/tcp.c`**, **`udp.c`**: network.
7. **`src/unix/poll.c`**: poll handle.
8. **`src/unix/timer.c`**: timers (binary heap).

### What to look for:
- 7 phases do event loop (timers, pending callbacks, idle/prepare, poll, check, close).
- Como threadpool work é signaled de volta ao loop main.
- Timer heap.
- File watcher.

### Talks complementares:
- "What the heck is the event loop anyway?", Philip Roberts.
- "In The Loop", Jake Archibald.

---

## Tour 5: React reconciler (Fiber), para 02-04

**Repo**: [github.com/facebook/react](https://github.com/facebook/react)
**Linguagem**: JS (Flow types).
**Tamanho**: ~500k LOC.
**Tour estimate**: 6-10 horas.

**Pergunta orientadora**: como React decide o que re-render quando state muda?

### Path:

1. **`packages/react/src/ReactHooks.js`**: hooks API.
2. **`packages/react-reconciler/src/ReactFiber.js`**: fiber node structure.
3. **`packages/react-reconciler/src/ReactFiberWorkLoop.js`**: work loop.
4. **`packages/react-reconciler/src/ReactFiberBeginWork.js`**: render phase.
5. **`packages/react-reconciler/src/ReactFiberCommitWork.js`**: commit phase.
6. **`packages/react-reconciler/src/ReactFiberHooks.js`**: hooks state internamente.
7. **`packages/react-reconciler/src/ReactFiberLane.js`**: lane prioritization (concurrent).
8. **`packages/scheduler/src/forks/Scheduler.js`**: scheduling.

### What to look for:
- Fiber as work unit.
- Reconciliation diff algorithm.
- Suspense / lazy in `ReactFiberThrow.js`.
- Concurrent mode lanes.
- Como hook state é stored (linked list per fiber).

### Talks:
- "A Cartoon Intro to Fiber", Lin Clark.
- "React Without Memo", Xuan Huang.

---

## Tour 6: CockroachDB, para 04-01, 04-09, 04-14

**Repo**: [github.com/cockroachdb/cockroach](https://github.com/cockroachdb/cockroach)
**Linguagem**: Go.
**Tamanho**: ~3M LOC.
**Tour estimate**: 10-15 horas.

**Pergunta orientadora**: como Cockroach faz consistent distributed SQL com Raft?

### Path:

1. **`docs/RFCS/`**: leia 3-5 RFCs antigos. Stupid important pra ver decisions.
2. **`pkg/sql/`**: SQL layer.
3. **`pkg/kv/`**: KV layer abstraction.
4. **`pkg/storage/`**: Pebble (LSM) storage.
5. **`pkg/kv/kvserver/replica.go`**: Raft replica.
6. **`pkg/raft/`**: Raft implementation (etcd-io/raft fork).
7. **`pkg/server/`**: node lifecycle.
8. **`pkg/util/timeutil/`** + clock: HLC (Hybrid Logical Clock).

### What to look for:
- Range = unit of replication. ~512MB.
- Lease holder e proposal flow.
- Distributed transactions com 2PC + parallel commits.
- Schema changes online.
- TPC-C benchmark code.

### Talks:
- "Cockroach Labs Engineering YouTube", series.
- Aphyr Jepsen analysis (revealing).

---

## Tour 7: Kubernetes scheduler, para 03-03, 05-01

**Repo**: [github.com/kubernetes/kubernetes](https://github.com/kubernetes/kubernetes)
**Linguagem**: Go.
**Tamanho**: ~2M LOC.
**Tour estimate**: 8-12 horas.

**Pergunta orientadora**: como K8s decide em qual node colocar pod?

### Path:

1. **`pkg/scheduler/`**: scheduler main.
2. **`pkg/scheduler/framework/`**: scheduling framework (extension points).
3. **`pkg/scheduler/scheduler.go`** (`scheduleOne`): main loop.
4. **`pkg/scheduler/framework/plugins/`**: filter + score plugins.
5. **`pkg/controller/`**: control loops (deployment, replicaset).
6. **`pkg/kubelet/`**: node agent (PLEG, etc.).
7. **`pkg/apis/core/v1/types.go`**: schema central.

### What to look for:
- Filter (predicate) → Score (priority) flow.
- Preemption logic.
- Volume binding.
- Scheduling profiles.
- PriorityClass.

### Notes:
- Scheduler é replaceable. Plugins.
- Custom schedulers em `pkg/scheduler/framework/plugins/`.

---

## Tour 8: Linux Kernel (mini-tour), para 01-02

**Repo**: [github.com/torvalds/linux](https://github.com/torvalds/linux)
**Linguagem**: C.
**Tamanho**: ~30M LOC. **Não tente ler tudo**.
**Tour estimate**: 6-10 horas pra mini-tour.

**Pergunta orientadora**: como kernel faz process scheduling e syscall dispatch?

### Path:

1. **`Documentation/scheduler/`**: docs.
2. **`kernel/sched/core.c`** (`schedule`, `__schedule`): scheduler entry.
3. **`kernel/sched/fair.c`**: CFS (Completely Fair Scheduler).
4. **`kernel/sched/sched.h`**: rq struct.
5. **`fs/read_write.c`** (`ksys_read`): syscall implementation.
6. **`kernel/fork.c`** (`do_fork`): process creation.
7. **`mm/page_alloc.c`**: page allocator.
8. **`kernel/futex.c`**: futex (revisita 01-11).

### What to look for:
- CFS rb-tree.
- Context switch (`__switch_to`).
- Page fault handler em `mm/memory.c`.
- O_DIRECT path bypassing page cache.

### Talks:
- "Linux scheduler internals", Brendan Gregg.
- Linux Foundation talks.

---

## Tour 9: Apache Kafka, para 04-02, 04-13

**Repo**: [github.com/apache/kafka](https://github.com/apache/kafka)
**Linguagem**: Scala (legacy) + Java (newer).
**Tamanho**: ~700k LOC.
**Tour estimate**: 8-12 horas.

**Pergunta orientadora**: como Kafka mantém append-only log distribuído com partições?

### Path:

1. **`docs/`**: papers e design docs Kafka.
2. **`core/src/main/scala/kafka/server/`**: KafkaServer.
3. **`core/src/main/scala/kafka/log/`**: log impl (segments).
4. **`core/src/main/scala/kafka/cluster/`**: partition + ISR.
5. **`raft/src/main/java/org/apache/kafka/raft/`**: KRaft (replacement for ZK).
6. **`clients/src/main/java/org/apache/kafka/clients/producer/`**: producer client.
7. **`clients/src/main/java/org/apache/kafka/clients/consumer/`**: consumer client.

### What to look for:
- Log segment structure.
- Index files (sparse).
- ISR (In-Sync Replicas) manager.
- Group coordinator (consumer group).
- Exactly-once via transactional producer.

### Talks:
- "Kafka Internals", Jun Rao + others.
- Confluent blog deep dives.

---

## Tour 10: TigerBeetle (financial DB), para 02-18, 04-14

**Repo**: [github.com/tigerbeetle/tigerbeetle](https://github.com/tigerbeetle/tigerbeetle)
**Linguagem**: Zig.
**Tamanho**: ~50k LOC. Compacto.
**Tour estimate**: 4-8 horas.

**Pergunta orientadora**: como TigerBeetle faz double-entry ledger seguro a 1M+ TPS?

### Path:

1. **`README.md`** + design docs.
2. **`src/state_machine.zig`**: ledger logic.
3. **`src/vsr/`**: Viewstamped Replication.
4. **`src/tigerbeetle/`**: client.
5. **`src/lsm/`**: LSM storage custom.

### What to look for:
- Static memory allocation (zero malloc em hot path).
- Determinism strict.
- Deterministic simulation testing.
- VSR consensus.

### Talks:
- TigerBeetle YouTube, Joran Dirk Greef explica devirtualization.
- Will Wilson "Why Are You Lying?" (DST).

---

## Tour 11: Bevy ECS, para 05-10

**Repo**: [github.com/bevyengine/bevy](https://github.com/bevyengine/bevy)
**Linguagem**: Rust.
**Tamanho**: ~250k LOC.
**Tour estimate**: 6-10 horas.

**Pergunta orientadora**: como ECS torna game engine cache-friendly + parallel?

### Path:

1. **`crates/bevy_ecs/src/world/`**: World struct.
2. **`crates/bevy_ecs/src/storage/`**: archetype storage (table-based).
3. **`crates/bevy_ecs/src/query/`**: queries.
4. **`crates/bevy_ecs/src/system/`**: systems + scheduling.
5. **`crates/bevy_app/`**: App lifecycle.
6. **`crates/bevy_render/`**: renderer.

### What to look for:
- Archetypes (component combinations) optimization.
- Schedule graph (parallel execution).
- Change detection.
- Reflection.

---

## Tour 12: Stripe SDK Node, para 02-18

**Repo**: [github.com/stripe/stripe-node](https://github.com/stripe/stripe-node)
**Linguagem**: TypeScript.
**Tamanho**: ~30k LOC.
**Tour estimate**: 2-4 horas.

**Pergunta orientadora**: como SDK lida com idempotency, retries, error mapping?

### Path:

1. **`src/Stripe.ts`**: client constructor.
2. **`src/StripeResource.ts`**: base resource pra retry, error mapping.
3. **`src/Webhooks.ts`**: signature verification.
4. **`src/resources/`**: per-resource clients (PaymentIntents, etc.).

### What to look for:
- Idempotency-Key auto-injection.
- Exponential backoff retry.
- Stripe-Account header pra Connect.
- Webhook signature verification timing-safe.

---

## Tour 13: TLA+ Examples, para 04-14

**Repo**: [github.com/tlaplus/Examples](https://github.com/tlaplus/Examples)
**Linguagem**: TLA+, PlusCal.
**Tamanho**: ~50 specs reais.
**Tour estimate**: 6-10 horas.

**Path por tema**:

- **`specifications/Paxos/`**: Paxos completo.
- **`specifications/Raft/`**: Raft.
- **`specifications/MissionariesAndCannibals/`**: PlusCal intro.
- **`specifications/distributed_systems/`**: protocolos.
- **`specifications/byzantine/`**: Byzantine fault.
- **`specifications/cassandra/`**: real-world DB spec.

### What to look for:
- Como Init e Next são definidos.
- Invariantes safety vs liveness.
- Counter-examples gerados por TLC.

---

## Tour 14: Tokio (Rust async runtime), para 03-11, 01-11

**Repo**: [github.com/tokio-rs/tokio](https://github.com/tokio-rs/tokio)
**Linguagem**: Rust.
**Tamanho**: ~150k LOC.
**Tour estimate**: 6-10 horas.

**Path**:

1. **`tokio/src/runtime/scheduler/`**: scheduler (work-stealing).
2. **`tokio/src/sync/`**: sync primitives.
3. **`tokio/src/io/`**: async I/O.
4. **`tokio/src/task/`**: task management.

### What to look for:
- Work-stealing scheduler.
- Cooperative scheduling.
- IO-driver integration com epoll/kqueue/io_uring.
- Mutex async vs std blocking.

---

## Tour 15: Caddy / nginx, para 02-14, 04-05

Para entender HTTP server e reverse proxy real.

**Caddy** ([github.com/caddyserver/caddy](https://github.com/caddyserver/caddy)), Go, mais legível.
**nginx** ([github.com/nginx/nginx](https://github.com/nginx/nginx)), C, classic.

**Pergunta**: como reverse proxy multiplexa connections, cache, terminação TLS?

**Estimate**: 4-6 horas Caddy; 8-12 nginx.

---

## Tour 16: Excalidraw, para 05-02 (CRDT capstone)

**Repo**: [github.com/excalidraw/excalidraw](https://github.com/excalidraw/excalidraw)
**Linguagem**: TypeScript.
**Tour estimate**: 4-6 horas.

**Path**:
1. `src/excalidraw-app/collab/`: collaboration logic.
2. `src/components/App.tsx`: top-level app.
3. `src/element/`: shape model.
4. `src/scene/Scene.ts`: rendering loop.

### What to look for:
- WS sync flow.
- Conflict resolution simple.
- Pointer-based collaboration.

---

## Tour 17: SQLite (mini-DB), para 05-01, 02-09

**Repo**: [sqlite.org](https://sqlite.org/) (não GitHub direto; trunk em fossil).
**Linguagem**: C.
**Tamanho**: ~150k LOC.
**Tour estimate**: 8-12 horas.

**Path**:
1. `src/main.c`: API entry.
2. `src/btree.c`: B-Tree.
3. `src/pager.c`: page management.
4. `src/wal.c`: WAL mode.
5. `src/vdbe.c`: virtual machine bytecode.

SQLite é referência **mais legível** que Postgres pra entender DB internals. Pra 05-01 build-from-scratch.

---

## Tour 18: io_uring / Linux async, para 03-10, 01-02 advanced

**Repo**: [github.com/axboe/liburing](https://github.com/axboe/liburing) + linux kernel `io_uring/`.
**Linguagem**: C.
**Tour estimate**: 6-10 horas.

**Path**:
- liburing examples first.
- Kernel `io_uring/io_uring.c`, submission queue, completion queue.

io_uring é onde Linux async vai. Vale entender.

---

## Tour 19: Bun runtime, para 02-07, 01-13

**Repo**: [github.com/oven-sh/bun](https://github.com/oven-sh/bun)
**Linguagem**: Zig + JS.
**Tour estimate**: 6-10 horas.

**Path**:
1. `src/bun.js/`: JavaScript runtime.
2. `src/bundler/`: bundler.
3. `src/install/`: package manager.

Bun mostra alternative architecture pra Node, JavaScriptCore vs V8, Zig vs C++.

---

## Tour 20: Anthropic Cookbook + LangGraph, para 04-10

**Repos**:
- [github.com/anthropics/anthropic-cookbook](https://github.com/anthropics/anthropic-cookbook)
- [github.com/langchain-ai/langgraph](https://github.com/langchain-ai/langgraph)

**Tour estimate**: 4-8 horas combined.

### What to look for:
- Tool use patterns.
- RAG implementation real.
- Agent loops.
- Token counting + cost tracking.

---

## Cadência sugerida

- **1 tour por mês**: 12 anuais. Após 12, você cobriu maior parte da ecosystem.
- **Pair com módulo do framework**: tour só faz sentido após módulo conceitual passar.
- **Journal entries**: 3-5 frases por tour, "o que mais surpreendeu".

---

## Dicas finais

- **Forke e clone**: faça anotações in-tree. `// NICOLAS: aqui é onde MVCC vive`.
- **Compare versões**: `git log` velho mostra evolução. "Como era em 2014?" é educativo.
- **Issues e PRs antigos** são tesouros. Decisions documentadas.
- **Tests** completam visão. `tests/` reveals invariants oficiais.
- **Não fique frustrado** com 80% incompreensível. Pega 20% que importa.
- **Leia código bom até virar reflexo**. Você reconhece "esse código é production-grade" depois.

Tour é skill. Skill cresce com uso.
