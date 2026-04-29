---
module: S01
title: Distributed Systems Theory — CAP, Consensus, Time, Consistency
stage: senior
prereqs: [A09, P07]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# S01 — Distributed Systems Theory

## 1. Problema de Engenharia

A maioria dos engenheiros que se diz "distributed systems engineer" sabe usar Kafka e Postgres replicado — não entende os teoremas que governam o comportamento desses sistemas. Quando o sistema falha de forma sutil (split brain, replication lag aparecendo como bug, message loss aparente), a falta de modelo mental cobra preço. O engenheiro chuta, troca tecnologia, ou aceita "é bug do Postgres". Não.

Este módulo é teoria pra engenharia distribuída. Não é PhD; é o **subset que você precisa pra projetar e debugar sistemas distribuídos sem se enganar**: CAP/PACELC, modelos de consistência, time e ordering (Lamport, vector clocks, hybrid logical clocks), quorum, consensus (Paxos/Raft em alto nível), failure detectors, replication models, e como tudo isso aparece no Postgres, Kafka, Redis, S3 que você já usa.

---

## 2. Teoria Hard

### 2.1 Por que distribuído é difícil

Em sistema único (1 process, 1 host), você assume:
- Tempo coerente (um relógio).
- Comunicação confiável (memória).
- Falha total ou nada (host vivo ou morto).
- Ordering trivial (sequencial).

Em sistema distribuído:
- Cada node tem clock próprio, drift entre eles.
- Mensagens podem perder, duplicar, atrasar, reordenar.
- Falhas parciais: node responde lento, alguns mas não outros, partitions de rede.
- Ordering é negociado, não garantido.

Isso não é detalhe — é a fonte de toda complexidade.

### 2.2 Modelos de falha

- **Crash-stop**: node para de responder e nunca volta. Ideal mas irrealista.
- **Crash-recovery**: node para, depois volta, possivelmente perdendo state.
- **Byzantine**: node mente, manda dados errados maliciosamente. Cobertura em consensus blockchain (S11).
- **Omission**: messages são perdidas.
- **Timing**: mensagens chegam atrasadas.

Em sistemas internos, você assume "fail-stop com recovery". Em sistemas adversariais (blockchain), Byzantine.

### 2.3 Modelo de rede

- **Synchronous**: bound conhecido em delivery time. Não existe na prática.
- **Asynchronous**: sem bound. Realidade.
- **Partially synchronous**: bounded after some unknown GST (Global Stabilization Time). Modelo de Paxos/Raft.

Em network real, partitions acontecem (cabo cortado, switch cai). Tempo, sempre.

### 2.4 Falha parcial

"Servidor lento" é mais perigoso que "servidor morto". Cliente espera, timeout, retry. Recursos consumidos. Cascade.

Detector de falha:
- Heartbeat com timeout.
- Φ (phi) accrual failure detector (mais nuance).
- Em qualquer caso, detecções podem ser falso positivos. Comportamento do sistema deve tolerar.

### 2.5 CAP theorem

Brewer, 2000. Em sistema distribuído com **partição de rede (P)**, você escolhe entre:
- **C**onsistency: todo node retorna mesmo valor.
- **A**vailability: cada request recebe resposta.

Não pode ter ambos durante partition. CAP não é "escolha 2 de 3" — partições acontecem; você escolha CP ou AP no momento de partition.

Exemplos:
- Postgres com synchronous replication → CP (rejeita writes durante partition).
- DynamoDB → AP (responde com possivelmente stale).
- ZooKeeper → CP.

### 2.6 PACELC

Daniel Abadi extendeu: PAC**ELC**:
- Em **P**artition: choose **A**vailability ou **C**onsistency.
- **E**lse (sem partition): choose **L**atency ou **C**onsistency.

Mais útil que CAP. Postgres sync rep: PC + EC (sempre consistente, paga latência). DynamoDB: PA + EL (sempre disponível, latência baixa, paga consistency).

### 2.7 Consistency models

Spectrum (do mais forte ao mais fraco):

- **Linearizability**: execução parece serial real-time. Forte. Custo: round-trips a quorum.
- **Sequential consistency**: execução serial, mas não real-time. Operações de cada cliente aparecem na ordem do cliente.
- **Causal consistency**: causally-related ops são seen em ordem. Concurrent ops podem variar.
- **Eventual consistency**: dado tempo, todos convergem. Sem garantia de quando.
- **Read-your-writes**: você sempre vê seus próprios writes.
- **Monotonic reads**: você nunca regride.
- **Bounded staleness**: stale por no máximo T segundos.

Postgres (single-leader): linearizable em writes; reads de réplica podem ser stale. DynamoDB strong read: linearizable. DynamoDB eventual read: eventual. Cassandra: tunable (QUORUM, ONE, ALL).

### 2.8 Time e ordering

**Wall clock** (NTP): drift entre nodes, pode ir pra trás. Não use pra ordering.

**Lamport clock**: counter monotônico por node; em qualquer mensagem recebida, atualiza pra `max(local, received) + 1`. Garante: se A causally precede B, então `L(A) < L(B)`. **Não** vice-versa.

**Vector clock**: array com counter por node. Captura concurrency: `V(A) < V(B)` se cada coord ≤. Ordena causally; detecta concurrents.

**Hybrid Logical Clock (HLC)**: combina wall clock + logical counter. Dá ordem total ≈ tempo real, robusto a clock skew. Usado em CockroachDB, Citus.

**TrueTime** (Google Spanner): clocks com bound de uncertainty (`now()` retorna `[earliest, latest]`). Permite linearizable global usando hardware (GPS + atomic). Comum em datacenter Google; pra resto, HLC ou consensus pra ordering.

### 2.9 Replication

**Single-leader**: 1 primary aceita writes, replicas seguem. Postgres, MySQL, MongoDB.
- Sync rep: leader espera replicas.
- Async rep: leader confirma sem esperar; risco de loss em failover.
- Semi-sync: espera 1 replica.

**Multi-leader**: múltiplos nodes aceitam writes; mergiam. Conflict resolution problemático. Casos: multi-region active-active, offline-capable.

**Leaderless**: qualquer node aceita; client lê de N nodes, escreve em M. Quorum: R + W > N garante read sees most recent write. Cassandra, DynamoDB.

### 2.10 Quorum

`R + W > N`: read quorum + write quorum > replicas total → reads see most recent writes (eventual converge depende de implementação).

`N=3, W=2, R=2`: comum, tolera 1 falha em cada operação.

Quorum em consensus: `N/2 + 1` ("majority"). 5 nodes → 3 forma majority. Tolera até 2 falhas.

### 2.11 Consensus: Paxos e Raft

Problema: N nodes concordam num valor, tolerando minority de falhas.

**Paxos** (Lamport, 1989): hard, mas referência.
- **Multi-Paxos**: extensão pra log de comandos.
- **Phases**: prepare (acquire promise), accept (propose value), learn (commit).

**Raft** (Ongaro, Stanford 2014): didaticamente acessível.
- **Leader election**: timeouts random, candidatura, voto.
- **Log replication**: leader replica entries pra majority.
- **Safety**: only leader with most up-to-date log can be elected.

Raft é base de etcd, Consul, CockroachDB, MongoDB (com variações). Em apps você usa via essas tools, não implementa.

### 2.12 FLP impossibility

Fischer, Lynch, Paterson (1985): em rede async com 1 falha, **não há algoritmo determinístico de consensus garantido a terminar**.

Isso não bloqueia consensus — Paxos/Raft conseguem **liveness** sob suposições parciais (eventually synchronous network, leader stable). Mas explica por que consensus sempre tem riscos em casos extremos (pode entrar em loop de election).

### 2.13 Two Generals Problem

Dois generais querem coordenar ataque mandando mensageiros. Cada mensagem pode perder. **Não há protocolo finito que garanta acordo perfeito.**

Implicação: **at-most-once delivery + ack** não basta pra acordo perfeito; sempre há janela onde sender não sabe se receiver tem mensagem.

Solução prática: idempotência. Receiver dedupa; sender pode retry sem efeito colateral.

### 2.14 Two-Phase Commit (2PC)

Coordenador + N participants. Phase 1: coordenador pergunta "prepare". Cada participant escreve em log (durable) e responde. Phase 2: se todos OK, "commit"; senão "abort".

Falha: se coordenador morre depois de "prepare" e antes de "commit", participants ficam blocked.

3PC tenta resolver mas adiciona round trip e tem outras falhas.

Em prática: 2PC raramente é certo. Use sagas, outbox pattern (S03).

### 2.15 Sagas

Transação distribuída como sequência de local transactions, cada uma com **compensation**. Se step N falha, rollback executa compensations dos steps 1..N-1.

Exemplos:
- Reserve hotel (cancel se fail).
- Charge cartão (refund se fail).
- Send email (no-compensate ou apologetic).

Patterns:
- **Choreography**: serviços reagem a events, sem coordenador central. Distributed.
- **Orchestration**: coordinator central executa steps.

### 2.16 Idempotência

Operação que pode ser repetida sem efeito adicional. Crucial em sistemas distribuídos com retry.

- HTTP GET, PUT, DELETE são idempotent. POST, PATCH não.
- Idempotency keys (cliente envia chave; servidor dedup).
- Database constraints (unique).

### 2.17 Exactly-once delivery: mito

Em rede async, "exactly-once delivery" não existe. O que existe:
- At-most-once (no-retry; pode perder).
- At-least-once (retry com idempotency; pode duplicar mas dedup).
- "Exactly-once processing" (at-least-once delivery + idempotent processing).

Kafka claims "exactly-once" via transações across producer + consumer + offset commit. Mesmo assim, é "exactly-once processing".

### 2.18 CRDT — Conflict-free Replicated Data Types (deep)

CRDTs são estruturas de dados onde **merge é automatic e determinístico** — independente de ordem ou duplicação de mensagens, todas as réplicas convergem pro mesmo state. Strong eventual consistency sem coordination.

**Por que importam em 2026:**
- **Linear, Figma, Notion** sync collaboration via CRDT (cada um com variant). Não é academic — é production de billion-dollar product.
- Edge-first apps (Local-first software, Ink & Switch): CRDT viabiliza apps que funcionam offline e sync sem central server.
- Multi-region writes sem leader election: write em qualquer região, eventual converge.

**Famílias:**

**State-based (CvRDT)** — replicas trocam state inteiro; merge é função associativa, comutativa, idempotente (ACI).
- **G-Counter**: vetor de counters per-replica, increment-only. Merge = element-wise max.
- **PN-Counter**: 2 G-Counters (positive, negative). Permite decrement.
- **G-Set**: union-only set. Merge = set union.
- **2P-Set**: G-Set "added" + G-Set "removed". Tombstone limita re-add.
- **LWW-Element-Set**: cada elemento tem timestamp; merge mantém o de timestamp maior. Requer wall-clock sane.
- **OR-Set (Observed-Remove)**: cada add carrega tag única; remove só remove tags observadas. Permite re-add limpo. Mais complexa, mais correta.

**Operation-based (CmRDT)** — replicas propagam operações. Exige causal delivery (geralmente via vector clock).
- Mais eficiente em bandwidth (não manda state inteiro).
- Mais frágil: ops podem ser duplicadas/perdidas; channel precisa garantir.

**Delta-state CRDTs** (modernas) — estado mas só **delta** desde último sync. Mistura vantagens.

**Sequence/Text CRDTs** — gerenciam ordering em streams editáveis.
- **Treedoc**: árvore de IDs hierárquicos.
- **Logoot**: posições densas (entre cada par de elementos cabe outro).
- **WOOT**: 1ª geração, lenta.
- **RGA (Replicated Growable Array)**: timestamp-based ordering, usa em Figma e similar.
- **Yjs / Automerge** (libs): RGA-like otimizado, primary choice em 2025-2026 pra apps colaborativos.

**Yjs em particular** dominou — biblioteca JS que serializa CRDT pra binary compact, integra com WebRTC/WebSocket pra sync, e tem bindings pra ProseMirror, Quill, Slate, etc. Linear e várias ferramentas SaaS usam.

**Limitações reais:**
- **State cresce**: tombstones de removes (em OR-Set, RGA) acumulam. Garbage collection precisa de coordination — perde "pure" CRDT-ness.
- **Merge é commutativo, não comutativo em significado**: se replicas concorrentes editam mesmo objeto de forma "incompatível semanticamente", CRDT converge pra **algum** state, não necessariamente o **certo** semanticamente. Ex: 2 users movem um item pro mesmo slot — quem ganha? CRDT decide via tiebreaker (lexicographic ID); user pode ver inconsistência.
- **Performance**: sync em árvore-de-mil-elementos tem overhead. Não é zero-cost.

**Calm Theorem** (relacionado): programa é monotônico (set-only-grows) → pode ser implementado sem coordination. CRDTs são corollary prático.

**Quando usar CRDT vs alternatives:**
- **Multi-master multi-region writes**: CRDT vence sobre conflict resolution manual.
- **Apps colaborativos realtime**: Yjs/Automerge é estado da arte.
- **Apps com modo offline-first**: CRDT permite long offline + merge sane.
- **Sistemas com leader único viável**: leader + Raft/Paxos é mais simples e dá strong consistency. CRDT só vale se coordination custa caro.

Refs canônicas:
- "A comprehensive study of Convergent and Commutative Replicated Data Types" (Shapiro et al, 2011) — paper original.
- "CRDTs: The Hard Parts" (Martin Kleppmann talks).
- crdt.tech — catálogo curado.

### 2.19 Backpressure cross-system

Em sistema distribuído, fast producer + slow consumer = queue cresce. Memory blowup ou drops.

Padrões:
- Acks por message. Consumer controla rate.
- Bounded buffers com block/drop.
- Reactive Streams spec.

### 2.20 Mental model

Ao desenhar sistema distribuído, perguntar:
1. Qual modelo de falha eu assumo?
2. Que tipo de consistency cada operação precisa?
3. Onde está o single point que define ordering (leader, consensus group)?
4. Como detectar falha vs lentidão?
5. O que acontece em partition?
6. Como retries são idempotent?

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Distinguir CAP e PACELC.
- 5 modelos de consistency em ordem de força.
- Lamport vs vector vs HLC: o que cada captura.
- Por que single-leader é mais simples e suas limitações.
- Quorum: R+W>N intuitivo e o que acontece se R+W=N.
- Raft em 3 fases.
- Por que FLP não bloqueia uso de Raft em produção.
- Two Generals e como idempotência contorna.
- 2PC e por que sagas são alternativa pragmática.
- O que "exactly-once" realmente significa em Kafka.

---

## 4. Desafio de Engenharia

Construir uma **simulação de sistema distribuído** explorando os conceitos.

### Especificação

1. **Cluster local de 5 nodes**:
   - Node em Node ou Go (escolha; Go pode ser mais didático aqui).
   - Comunicação via TCP/HTTP.
   - Inject latency e failures controlados (Toxiproxy ou simulado).
2. **Implemente Raft (do zero, sem libs)**:
   - Leader election com timeouts random.
   - Log replication.
   - Persistence em disco.
   - Snapshot opcional.
   - Safety properties testadas (jepsen-style scenarios).
3. **Aplicação sobre Raft**:
   - KV store distribuído com `PUT`, `GET`, `DELETE`.
   - Cliente conecta a qualquer node; non-leader redireciona.
   - Read consistency level (linearizable via leader, ou stale via local).
4. **Test scenarios**:
   - Mate o leader durante write — write deve completar (em majority surviving) ou abortar.
   - Particione minoria — minoria deve recusar writes.
   - Partição completa (split brain) — verifique que apenas majority commits.
   - Recover node — deve catch up via log replication.
5. **Time and ordering**:
   - Compare Lamport clock e HLC em log de eventos.
   - Demonstre cenário onde wall clock falharia (clock skew) e HLC funciona.
6. **Sagas**:
   - Modele "atribuir pedido a courier + cobrar fee + notificar" como saga choreography.
   - 1 step propositalmente falha → compensations rodam.
7. **CRDT toy**:
   - Implemente G-counter (counter incrementável, merge associativo/comutativo).
   - 3 réplicas convergem após qualquer ordem de merges.

### Restrições

- Sem libs de Raft (etcd/raft, hashicorp/raft).
- Sem clusters managed.
- Tudo local, reproduzível em laptop.

### Threshold

- README documenta:
  - Diagrama do Raft state machine implementado.
  - Logs de cada cenário de falha (eleition, partition, etc.).
  - 1 caso onde wall clock daria resposta errada vs HLC certa.
  - Demonstração saga compensation.
  - CRDT G-counter convergindo após permutações de merges.
  - 3 surpresas que apareceram durante implementação.

### Stretch

- Implementar Paxos (single-decree) ao lado pra comparar.
- Vector clock implementado e usado pra detectar concurrent writes em KV store.
- Linearizability checker: gravar history e verificar com Knossos-style.
- 2PC implementado pra entender por que falha em failures de coordenador.
- Network partitions automated via netem/Toxiproxy.

---

## 5. Extensões e Conexões

- Liga com **A09** (Postgres): replication, MVCC.
- Liga com **A11** (Redis): Sentinel, Cluster, Redlock críticas.
- Liga com **A12** (Mongo): replica set é Raft-ish.
- Liga com **P03** (K8s): etcd usa Raft; controllers reagem a state.
- Liga com **P05** (AWS): DynamoDB consistency models.
- Liga com **S02** (messaging): Kafka replication, ISR, exactly-once.
- Liga com **S03** (event-driven): outbox, sagas.
- Liga com **S04** (resilience): retries, idempotência, timeouts.
- Liga com **S07/S08** (architecture, services): consequences em design.
- Liga com **S11** (blockchain): Byzantine consensus.

---

## 6. Referências

- **"Designing Data-Intensive Applications"** — Martin Kleppmann. Bíblia.
- **"Distributed Systems"** — Maarten van Steen e Andrew Tanenbaum (livre online).
- **MIT 6.824 lectures** ([pdos.csail.mit.edu/6.824](https://pdos.csail.mit.edu/6.824/)) — labs em Go.
- **"Time, Clocks, and the Ordering of Events"** — Leslie Lamport (paper original).
- **"Paxos Made Simple"** — Lamport.
- **"In Search of an Understandable Consensus Algorithm"** — Ongaro, Ousterhout (Raft).
- **"Spanner: Google's Globally-Distributed Database"** (paper).
- **Jepsen** ([jepsen.io](https://jepsen.io/)) — analyses de DBs reais.
- **The Raft visualization** ([thesecretlivesofdata.com/raft](https://thesecretlivesofdata.com/raft/)).
- **Distributed Systems for Fun and Profit** — Mikito Takada (livre online).
