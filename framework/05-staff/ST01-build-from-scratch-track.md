---
module: ST01
title: Build-from-Scratch Track — Toy Database, Queue, Cache, Runtime, Compiler
stage: staff
prereqs: [senior-complete]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# ST01 — Build-from-Scratch Track

## 1. Problema de Engenharia

Senior generalista construiu **aplicação completa**: o que está acima da linha de abstração. Staff/Principal entende **o que está abaixo** porque construiu pelo menos uma vez. Não precisa ter feito todos: ter feito UM toy DB, UM toy Kafka, UM toy interpretador, UM toy K8s scheduler — o salto de entendimento é qualitativo.

A diferença prática aparece em design review: Staff pega bug em proposta de outro engineer porque já implementou storage engine. Identifica trade-off em escolha de broker porque já fez retention policy. Sabe quando vendor é caro e quando é barato porque já implementou alternativa.

Este módulo é a **disciplina de implementar coisas que já existem** — não pra produção, mas pra entender. SQLite-clone (B-Tree + WAL + transactions), Redis-clone (KV + LRU + AOF + replication), Kafka-clone (log + partitions + consumer groups), Lua/Mini-runtime (parser + bytecode + GC), mini-K8s scheduler (pod placement + bin packing + reschedule).

Staff não tem tempo de fazer tudo. Escolhe **2 dos 5** que conectam com seu eixo de especialização. Faz com profundidade. Documenta lessons.

---

## 2. Teoria Hard

### 2.1 Por que construir o que já existe

- **Mental models concretos**: leitura de código de SQLite-clone próprio é diferente de ler doc do Postgres.
- **Confidence em edge cases**: ler RFC sobre TLS não é igual a implementar handshake.
- **Authority em design review**: decisões pesam diferente quando autor já fez.
- **Hire signal**: portfólio com toy DB pesa em entrevista Staff/Principal.

Anti-pattern: construir tudo. Staff tem outras responsabilidades. Escolha estratégico.

### 2.2 Toy database (target: SQLite-like single-file)

Componentes essenciais:
- **Pager**: arquivo dividido em pages (4-8KB), cache LRU.
- **B+ tree**: nodes em pages, split/merge, leaf-linked.
- **Tuples / record format**: type-tagged.
- **WAL**: redo log pra crash recovery.
- **Transactions**: begin/commit/rollback, locking single-writer ou MVCC.
- **SQL parser**: subset (CREATE, INSERT, SELECT WHERE, simple JOIN).
- **Query planner**: rule-based, usa índices.
- **Executor**: volcano-style iterators.

Out of scope: sharding, query optimizer custo-based, full SQL standard.

Linguagem sugerida: Rust ou Go. C se quer pain didático.

Referência: SQLite source (~150k LOC mas legível). "Build Your Own Database" tutorials.

### 2.3 Toy queue / log (target: Kafka-like)

Componentes:
- **Append-only log** com segments rotativos.
- **Index** por offset (sparse).
- **Producer**: write APIs com batch + ack.
- **Consumer**: pull-based read, offset commit.
- **Partitions**: log dividido por hash key.
- **Consumer groups**: rebalance, offset por group.
- **Replication** (stretch): leader/follower, ISR, ack levels.

Out of scope: KRaft / ZooKeeper-like coordination, exactly-once transactions.

Referência: "Apache Kafka: The Definitive Guide", Pulsar arch docs.

### 2.4 Toy cache (target: Redis-like)

Componentes:
- **Server TCP** com protocolo custom (RESP-like).
- **Hash table** de strings.
- **Linked list, sorted set, hash, set** (data types).
- **Eviction**: LRU/LFU/random.
- **Expiry**: TTL com lazy + active expiration.
- **Persistence**: AOF (append-only file) + snapshot RDB-like.
- **Pub/sub**: channels.
- **Replication** (stretch): master-replica.

Single-threaded event loop (epoll/kqueue) é didático.

### 2.5 Toy language runtime

Spectrum:
- **Tree-walking interpreter** (lower bar): N13 challenge era isso.
- **Bytecode VM**: stack-based ou register-based, com GC simples (mark-sweep).
- **Native via LLVM**: front-end emitting LLVM IR.
- **Native via JIT** (high bar): generate machine code at runtime.

Componentes (bytecode VM):
- Lexer/parser (já em N13).
- AST → bytecode compiler.
- VM: stack ops, calls, frames.
- GC: pelo menos mark-sweep com triggers.
- Standard library: fns built-in.

Referências: Crafting Interpreters (Lox), Writing An Interpreter In Go (Monkey).

### 2.6 Toy scheduler / orchestrator (target: K8s-like)

Componentes:
- **Resource model**: nodes (cpu, mem), pods (requests, limits).
- **Bin-packing**: best-fit, first-fit, score-based.
- **Watch-act loop**: reconcile actual vs desired.
- **Node disconnect handling**: pod reschedule.
- **Affinity / anti-affinity / taints**.
- **Storage volumes** mock.

Out of scope: full K8s API, full networking (CNI), all controllers. Implementar o **scheduler** + um controller (deployment) é lição.

Referência: K8s sched source, "Kubernetes Patterns".

### 2.7 Toy distributed consensus

Implementar **Raft** mínimo:
- Leader election.
- Log replication.
- Safety (term, log matching).
- Cluster membership change (stretch).

Linguagem: Go (channels) ou Rust (async). Use `raft.rs` de TiKV ou `etcd-io/raft` como referência **conceitual**, não copy.

Test com simulação determinística (network partitions, message drops). MIT 6.5840 lab tem boilerplate.

### 2.8 Toy network proxy / load balancer

Componentes:
- **TCP** proxy (L4) com connection multiplexing.
- **HTTP** proxy (L7) com routing por host/path.
- **Health check** active.
- **Load balancing**: round-robin, least conn, consistent hash.
- **Rate limit** (token bucket).
- **TLS termination** com SNI.

Referências: HAProxy, nginx, Envoy docs.

### 2.9 Toy container runtime

Linux: namespaces (pid, net, mnt, user, ipc, uts), cgroups (resource limits), filesystem layers (overlayfs ou copy).

Implementação:
- Fork + clone com flags.
- Mount root.
- chroot ou pivot_root.
- exec.
- Cleanup.

500-1000 LOC em Go. "Build a container in 500 lines of Python" é baseline.

### 2.10 Documentação do projeto

Cada toy precisa:
- README com goals e non-goals (importante: explicit non-goals).
- Architecture doc (diagrama, módulos).
- Design decisions log.
- Lessons learned (o que surpreendeu).

Sem docs, projeto é só artifact privado. Doc transforma em learning compartilhável.

### 2.11 Testes em toys

Unit tests + integration. Property-based pra invariants (BST in-order, Raft safety).

Bench vs real (pra aprender humility): redis-benchmark, sysbench.

### 2.12 Quando parar

Toy é didático. Ir além de "single-machine + happy path + alguns edge cases" começa a custar muito retorno. Saiba parar quando lições principais foram absorvidas.

Anti-pattern: ferment a project pra "lançar como produto OSS". Toys são tools de aprendizado; não confunda com lib séria.

### 2.13 Selection criteria

Escolha 2 toys. Critérios:
- **Conexão com eixo de carreira**: backend pesado → DB+queue. Frontend → runtime+codecs. Platform → scheduler+proxy.
- **Gap pessoal**: o que mais te confunde hoje.
- **Tempo disponível**: 4-12 semanas por toy.

Não escolher 5 e fazer 0.

### 2.14 Como medir "feito"

- Cobre features definidas em README.
- Test suite passa.
- Bench básico vs canonical alternative.
- Doc completa.
- Apresentado a um colega que conseguiu rodar.

### 2.15 Showcase

Após pronto:
- Blog post explicando design.
- Talk em meetup interno ou conferência.
- Open source com expectativas claras de não-suporte.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Justificar build-from-scratch pra Staff.
- Listar componentes essenciais de toy DB SQLite-like.
- Listar componentes de toy Kafka-like.
- Diferenciar toys de produção (single-machine, happy-path, non-goals explícitos).
- Selecionar 2 toys para si com justificativa de eixo.
- Estimar effort em weeks.
- Listar critérios de "feito".

---

## 4. Desafio de Engenharia

Construir **2 toys** dos 5 listados acima.

### Especificação

1. Escolha 2 com justificativa em `SELECTION.md`.
2. Para cada toy:
   - Repo separado.
   - README com goals + non-goals.
   - Implementation seguindo §2 do tipo escolhido.
   - Test suite (unit + integration + property where apt).
   - Benchmark vs canonical (ex: toy Redis vs real Redis em GET/SET small KV).
   - Architecture doc com diagrama e module breakdown.
   - Decision log (3+ decisões com pros/cons).
   - Lessons learned.
3. Apresentação:
   - Blog post (público) por toy.
   - 30-min talk gravada (interna ok) explicando design.
4. Doc cross-toy `THEMES.md`: lições comuns aprendidas (ex: WAL + crash recovery aparece em DB e queue).

### Restrições

- Linguagem coerente com seu eixo (Rust, Go, ou C).
- Escopo single-machine (cluster é stretch).
- Não copiar código de implementations existentes; ler como referência ok.
- Evitar dependencies pesadas (idealmente std lib + minimal deps).
- Cada toy < 5k LOC ideally; > 10k tá grande.

### Threshold

- 2 toys completos.
- Tests + bench rodando.
- Docs públicas.
- Talk gravada.

### Stretch

- 3º toy (eu sei, é dor).
- Cluster mode em 1 dos toys.
- Submeter talk pra conf real (RustConf, GopherCon, NodeConf).
- Open source em condições de aceitar contributors curiosos (mesmo cuidado de S15).

---

## 5. Extensões e Conexões

- Liga com **N04** (data structures): toy DB usa B-Tree e LRU.
- Liga com **N05** (algorithms): scheduling, consensus, hashing.
- Liga com **N11** (concurrency): cada toy enfrenta concorrência.
- Liga com **N13** (compilers): toy runtime extende N13.
- Liga com **A09/A11** (Postgres/Redis): toys são de-mistificadores.
- Liga com **P02/P03** (Docker/K8s): toys de runtime e scheduler.
- Liga com **S01** (distributed): consensus, replication.
- Liga com **S02** (messaging): toy queue.
- Liga com **S14** (formal methods): pode especificar Raft em TLA+ enquanto implementa.
- Liga com **S15** (OSS): publicação responsável.

---

## 6. Referências

- **"Crafting Interpreters"** — Robert Nystrom (toy interpreter end-to-end).
- **"Build Your Own Redis with C/C++"** — James Smith (build-your-own.org).
- **"Designing Data-Intensive Applications"** — base teórica.
- **"Database Internals"** — Alex Petrov.
- **"Database Design and Implementation"** — Edward Sciore (toy DB tutorial).
- **MIT 6.5840 (Distributed Systems) labs** — Raft, KV server.
- **"Writing an OS in Rust"** — Philipp Oppermann.
- **"500 Lines or Less"** — collection of small implementations.
- **CMU 15-445 Database Systems** course materials.
- **Will Wilson @ FoundationDB talks** — deterministic simulation testing.
- **Nikita Sobolev's "build your own X"** lists.
