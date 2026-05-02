---
module: 04-01
title: Distributed Systems Theory, CAP, Consensus, Time, Consistency
stage: sistemas
prereqs: [02-09, 03-07]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 04-01, Distributed Systems Theory

## 1. Problema de Engenharia

A maioria dos engenheiros que se diz "distributed systems engineer" sabe usar Kafka e Postgres replicado, não entende os teoremas que governam o comportamento desses sistemas. Quando o sistema falha de forma sutil (split brain, replication lag aparecendo como bug, message loss aparente), a falta de modelo mental cobra preço. O engenheiro chuta, troca tecnologia, ou aceita "é bug do Postgres". Não.

Este módulo é teoria pra engenharia distribuída. Não é PhD; é o **subset que você precisa pra projetar e debugar sistemas distribuídos sem se enganar**: CAP/PACELC, modelos de consistência, time e ordering (Lamport, vector clocks, hybrid logical clocks), quorum, consensus (Paxos/Raft em alto nível), failure detectors, replication models, e como tudo isso aparece no Postgres, Kafka, Redis, 04-03 que você já usa.

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

Isso não é detalhe, é a fonte de toda complexidade.

### 2.2 Modelos de falha

- **Crash-stop**: node para de responder e nunca volta. Ideal mas irrealista.
- **Crash-recovery**: node para, depois volta, possivelmente perdendo state.
- **Byzantine**: node mente, manda dados errados maliciosamente. Cobertura em consensus blockchain (04-11).
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

Não pode ter ambos durante partition. CAP não é "escolha 2 de 3", partições acontecem; você escolha CP ou AP no momento de partition.

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

Isso não bloqueia consensus, Paxos/Raft conseguem **liveness** sob suposições parciais (eventually synchronous network, leader stable). Mas explica por que consensus sempre tem riscos em casos extremos (pode entrar em loop de election).

### 2.13 Two Generals Problem

Dois generais querem coordenar ataque mandando mensageiros. Cada mensagem pode perder. **Não há protocolo finito que garanta acordo perfeito.**

Implicação: **at-most-once delivery + ack** não basta pra acordo perfeito; sempre há janela onde sender não sabe se receiver tem mensagem.

Solução prática: idempotência. Receiver dedupa; sender pode retry sem efeito colateral.

### 2.14 Two-Phase Commit (2PC)

Coordenador + N participants. Phase 1: coordenador pergunta "prepare". Cada participant escreve em log (durable) e responde. Phase 2: se todos OK, "commit"; senão "abort".

Falha: se coordenador morre depois de "prepare" e antes de "commit", participants ficam blocked.

3PC tenta resolver mas adiciona round trip e tem outras falhas.

Em prática: 2PC raramente é certo. Use sagas, outbox pattern (04-03).

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

### 2.18 CRDT, Conflict-free Replicated Data Types (deep)

CRDTs são estruturas de dados onde **merge é automatic e determinístico**: independente de ordem ou duplicação de mensagens, todas as réplicas convergem pro mesmo state. Strong eventual consistency sem coordination.

**Por que importam em 2026:**
- **Linear, Figma, Notion** sync collaboration via CRDT (cada um com variant). Não é academic, é production de billion-dollar product.
- Edge-first apps (Local-first software, Ink & Switch): CRDT viabiliza apps que funcionam offline e sync sem central server.
- Multi-region writes sem leader election: write em qualquer região, eventual converge.

**Famílias:**

**State-based (CvRDT)**: replicas trocam state inteiro; merge é função associativa, comutativa, idempotente (ACI).
- **G-Counter**: vetor de counters per-replica, increment-only. Merge = element-wise max.
- **PN-Counter**: 2 G-Counters (positive, negative). Permite decrement.
- **G-Set**: union-only set. Merge = set union.
- **2P-Set**: G-Set "added" + G-Set "removed". Tombstone limita re-add.
- **LWW-Element-Set**: cada elemento tem timestamp; merge mantém o de timestamp maior. Requer wall-clock sane.
- **OR-Set (Observed-Remove)**: cada add carrega tag única; remove só remove tags observadas. Permite re-add limpo. Mais complexa, mais correta.

**Operation-based (CmRDT)**: replicas propagam operações. Exige causal delivery (geralmente via vector clock).
- Mais eficiente em bandwidth (não manda state inteiro).
- Mais frágil: ops podem ser duplicadas/perdidas; channel precisa garantir.

**Delta-state CRDTs** (modernas), estado mas só **delta** desde último sync. Mistura vantagens.

**Sequence/Text CRDTs**: gerenciam ordering em streams editáveis.
- **Treedoc**: árvore de IDs hierárquicos.
- **Logoot**: posições densas (entre cada par de elementos cabe outro).
- **WOOT**: 1ª geração, lenta.
- **RGA (Replicated Growable Array)**: timestamp-based ordering, usa em Figma e similar.
- **Yjs / Automerge** (libs): RGA-like otimizado, primary choice em 2025-2026 pra apps colaborativos.

**Yjs em particular** dominou, biblioteca JS que serializa CRDT pra binary compact, integra com WebRTC/WebSocket pra sync, e tem bindings pra ProseMirror, Quill, Slate, etc. Linear e várias ferramentas SaaS usam.

**Exemplo real Logística** (notas colaborativas em pedido editadas por lojista + suporte simultaneamente):

```typescript
// Server (Node + y-websocket)
import { setupWSConnection } from 'y-websocket/bin/utils';
import { WebSocketServer } from 'ws';
import { LeveldbPersistence } from 'y-leveldb';

const persistence = new LeveldbPersistence('./yjs-storage');
const wss = new WebSocketServer({ port: 1234 });

wss.on('connection', (ws, req) => {
  const docName = new URL(req.url, 'http://x').pathname.slice(1); // ex: order-abc123
  setupWSConnection(ws, req, { docName, gc: true });
  // persistence carrega/salva doc automaticamente
});
```

```typescript
// Client (lojista dashboard)
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { yCollab } from 'y-codemirror.next';

const ydoc = new Y.Doc();
const provider = new WebsocketProvider(
  'wss://rt.logistica.com', `order-${orderId}`, ydoc,
  { params: { token: jwt } }                         // auth no upgrade (02-13)
);
const ynotes = ydoc.getText('notes');                // CRDT text type

// awareness = presença + cursor (não persiste, só p2p ephemeral)
provider.awareness.setLocalStateField('user', {
  name: currentUser.name, color: '#3b82f6', role: 'lojista'
});

// Liga ao editor (CodeMirror, ProseMirror, plain textarea via y-textarea)
const view = new EditorView({
  state: EditorState.create({
    extensions: [yCollab(ynotes, provider.awareness)]
  }),
  parent: document.querySelector('#notes')
});
```

Resultado em produção: lojista edita "Cliente solicita troco de R$ 50" enquanto suporte adiciona "Tentou contato 14h, sem resposta" simultaneamente. Ambos veem updates em tempo real, sem conflict, sem locking, com cursor presence.

**Pegadinhas em produção:**
- **Garbage collection**: `gc: true` no provider; tombstones senão crescem indefinidamente. Mas GC pode quebrar undo distante; trade-off por feature.
- **Auth no upgrade**: WebSocket protocol não suporta header `Authorization`; passe via query param, valide no `setupWSConnection` antes de aceitar.
- **Permissões**: Yjs sync não tem authz nativo. Server precisa filtrar diff por role (suporte vê tudo; cliente externo vê só campos públicos). Implementar via `y-protocols` custom message types, não trivial.
- **Storage scaling**: LevelDB local ok pra ~1k docs; em escala maior, Postgres com `bytea` por doc, ou Redis com TTL pra docs cold.
- **Yjs vs Automerge**: Yjs mais maduro em web/text editing; Automerge melhor em ergonomia JSON-like + history, mas overhead maior. Pra Logística (text + collaboration leve) → Yjs.

**Limitações reais:**
- **State cresce**: tombstones de removes (em OR-Set, RGA) acumulam. Garbage collection precisa de coordination, perde "pure" CRDT-ness.
- **Merge é commutativo, não comutativo em significado**: se replicas concorrentes editam mesmo objeto de forma "incompatível semanticamente", CRDT converge pra **algum** state, não necessariamente o **certo** semanticamente. Ex: 2 users movem um item pro mesmo slot, quem ganha? CRDT decide via tiebreaker (lexicographic ID); user pode ver inconsistência.
- **Performance**: sync em árvore-de-mil-elementos tem overhead. Não é zero-cost.

**Calm Theorem** (relacionado): programa é monotônico (set-only-grows) → pode ser implementado sem coordination. CRDTs são corollary prático.

**Quando usar CRDT vs alternatives:**
- **Multi-master multi-region writes**: CRDT vence sobre conflict resolution manual.
- **Apps colaborativos realtime**: Yjs/Automerge é estado da arte.
- **Apps com modo offline-first**: CRDT permite long offline + merge sane.
- **Sistemas com leader único viável**: leader + Raft/Paxos é mais simples e dá strong consistency. CRDT só vale se coordination custa caro.

Refs canônicas:
- "A comprehensive study of Convergent and Commutative Replicated Data Types" (Shapiro et al, 2011), paper original.
- "CRDTs: The Hard Parts" (Martin Kleppmann talks).
- crdt.tech, catálogo curado.

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

### 2.21 Logical clocks deep — Lamport, vector clocks, hybrid logical clocks (HLC)

Wall-clock time (NTP) é mentira em sistemas distribuídos: clock skew de centenas de ms entre nodes, leap second drama, virtualização com VMs cujo clock pula minutos após migration. "Quem aconteceu primeiro?" não pode usar `Date.now()`. Logical clocks resolvem o problema com 3 técnicas progressivas: Lamport timestamps (ordering total mas perde causalidade), vector clocks (causalidade exata mas O(N) bytes), hybrid logical clocks (HLC, melhor dos dois, 2014). CockroachDB, Spanner-like systems e CRDTs todos usam variantes.

**Foundation: o problema de "happened-before"**:

Lamport (1978) define: evento A → B se A precede B na mesma máquina, OU A é send de mensagem que B recebe, OU transitividade via cadeia. Sem ordering causal: cliente A escreve `saldo = 100`, cliente B escreve `saldo = 50`. Qual venceu? NTP timestamp pode dizer A vence quando na verdade B foi causado por A (leu 100, descontou 50). Resultado errado: 100 sobrescreve a operação derivada.

**Lamport timestamp — total ordering, simples**:

```typescript
class LamportClock {
  private counter = 0;

  // Antes de evento local
  now(): number {
    return ++this.counter;
  }

  // Ao receber evento de outro node com timestamp T
  receive(T: number): number {
    this.counter = Math.max(this.counter, T) + 1;
    return this.counter;
  }
}

// Uso:
const clock = new LamportClock();
const event1 = clock.now();              // 1
sendMessage({ data: 'foo', ts: clock.now() });   // 2
// Outro node:
const ts = clock.receive(2);             // max(0, 2) + 1 = 3
```

**Garantia**: se A → B causally, então `lamport(A) < lamport(B)`. **Limite**: `lamport(A) < lamport(B)` NÃO implica A → B (eventos concorrentes podem ter ordem arbitrária). Usado em Cassandra (timestamps de write), Kafka (offsets dentro de partition), Riak.

**Vector clocks — causalidade exata**:

```typescript
type VectorClock = Record<string, number>;   // nodeId → counter

class VClock {
  private vc: VectorClock;
  constructor(private nodeId: string, initial: VectorClock = {}) {
    this.vc = { ...initial, [nodeId]: initial[nodeId] ?? 0 };
  }

  tick(): VectorClock {
    this.vc[this.nodeId]++;
    return { ...this.vc };
  }

  receive(remote: VectorClock): VectorClock {
    for (const [node, count] of Object.entries(remote)) {
      this.vc[node] = Math.max(this.vc[node] ?? 0, count);
    }
    this.vc[this.nodeId]++;
    return { ...this.vc };
  }

  // Compare two VCs
  static compare(a: VectorClock, b: VectorClock): 'before' | 'after' | 'concurrent' | 'equal' {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    let aLessOrEq = true, bLessOrEq = true;
    for (const k of keys) {
      const av = a[k] ?? 0, bv = b[k] ?? 0;
      if (av > bv) bLessOrEq = false;
      if (av < bv) aLessOrEq = false;
    }
    if (aLessOrEq && bLessOrEq) return 'equal';
    if (aLessOrEq) return 'before';
    if (bLessOrEq) return 'after';
    return 'concurrent';
  }
}
```

`compare(a, b) === 'concurrent'` = eventos genuinamente paralelos sem causalidade entre. **Custo**: O(N) bytes por timestamp; N = number of nodes que já tocaram o dado. Em sistema com 1000 clients, VC vira 8KB+ por write. Usado em Riak (sibling resolution), Voldemort, classic CRDTs.

**Vector clock pruning — o trick em produção**:

Estratégia: keep só top-K most recent nodes; TTL para nodes inativos.

```typescript
function prune(vc: VectorClock, lastSeenAt: Record<string, number>, maxAgeMs = 7 * 86400_000) {
  const now = Date.now();
  const pruned: VectorClock = {};
  for (const [node, count] of Object.entries(vc)) {
    if (now - (lastSeenAt[node] ?? 0) < maxAgeMs) {
      pruned[node] = count;
    }
  }
  return pruned;
}
```

Trade-off: pruning agressivo causa false-concurrent (loss of causality info); conservador cresce indefinidamente.

**Hybrid Logical Clocks (HLC) — best of both worlds**:

Kulkarni & Demirbas, 2014. Combina wall-clock + logical counter em 64-bit.

```typescript
type HLC = { wallTime: number; logical: number };

class HybridLogicalClock {
  private last: HLC = { wallTime: 0, logical: 0 };

  now(): HLC {
    const wall = Date.now();
    if (wall > this.last.wallTime) {
      this.last = { wallTime: wall, logical: 0 };
    } else {
      this.last = { ...this.last, logical: this.last.logical + 1 };
    }
    return { ...this.last };
  }

  receive(remote: HLC): HLC {
    const wall = Date.now();
    const newWall = Math.max(wall, this.last.wallTime, remote.wallTime);
    let logical: number;
    if (newWall === this.last.wallTime && newWall === remote.wallTime) {
      logical = Math.max(this.last.logical, remote.logical) + 1;
    } else if (newWall === this.last.wallTime) {
      logical = this.last.logical + 1;
    } else if (newWall === remote.wallTime) {
      logical = remote.logical + 1;
    } else {
      logical = 0;
    }
    this.last = { wallTime: newWall, logical };
    return { ...this.last };
  }

  static compare(a: HLC, b: HLC): -1 | 0 | 1 {
    if (a.wallTime !== b.wallTime) return a.wallTime < b.wallTime ? -1 : 1;
    if (a.logical !== b.logical) return a.logical < b.logical ? -1 : 1;
    return 0;
  }
}
```

**Garantia**: monotônico mesmo com clock skew; close to wall-clock (good pra debugging); 64-bit fits. **Limite**: não detecta concurrency (Lamport-like, não vetor). Pra concurrency precisa MVCC + version vectors. Usado em CockroachDB (default), MongoDB (clusterTime), YugabyteDB.

**Logística — escolha por uso**:

| Cenário | Clock |
|---|---|
| Order status updates (LWW); ordering total OK | HLC ou Lamport |
| Multi-master replication com sibling resolution | Vector clock |
| Audit log; precisa wall-clock próximo (humans readable) | HLC |
| Operational counter sob race | Lamport sufficient |
| CRDT (Yjs, Automerge) com causality | Vector clock interno |

**Production gotchas**:
- **NTP skew**: HLC é resiliente a alguns segundos de skew, mas drift de horas quebra (max wall-time monotônico fica preso no future). Set `chronyd` ou alike monitoring.
- **Leap seconds**: smear NTP (Google approach) é safer que step.
- **VM migration**: clock pode pular minutos. HLC absorve melhor que wall-clock raw.
- **Persistence**: clock state precisa ser persisted entre restarts. Log último HLC em durable storage; ao boot, `last + 1`.

**Code: integração com message broker**:

```typescript
// Cada message envia HLC
const hlc = new HybridLogicalClock();

producer.send({
  topic: 'orders',
  messages: [{
    value: JSON.stringify(order),
    headers: { hlc: JSON.stringify(hlc.now()) },
  }],
});

consumer.run({
  eachMessage: async ({ message }) => {
    const remoteHlc: HLC = JSON.parse(message.headers!.hlc!.toString());
    const newHlc = hlc.receive(remoteHlc);
    // Process com newHlc atribuído ao evento downstream
  },
});
```

**Anti-patterns observados**:
- **`Date.now()` pra ordering em distributed system**: clock skew NTP entre nodes destroi correctness.
- **Lamport como "wall-clock equivalent"**: não é. Sem ordem real ou tempo real significativo.
- **Vector clock sem pruning**: cresce indefinidamente; bytes overhead engole storage.
- **HLC não persisted**: restart pode regredir wall-time → causality breakage.
- **Mistura de clocks** (parte do sistema usa Lamport, parte HLC): comparação cross-component impossível.
- **`now()` chamado N vezes em mesmo handler**: micro-incrementos sem semantic; gera "timestamps" sequenciais sem causality real.
- **Sem unit test de causality compare**: edge cases (concurrent vs equal vs before) raramente cobertos.

Cruza com **04-01 §2.16** (idempotência precisa ordering), **04-01 §2.18** (CRDT usa vector internally), **04-02 §2.18** (idempotent consumer + HLC pra ordering), **04-13 §2.16** (exactly-once delivery semântica), **02-09 §2.13** (Postgres logical replication usa LSN, conceito relacionado).

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
   - Mate o leader durante write, write deve completar (em majority surviving) ou abortar.
   - Particione minoria, minoria deve recusar writes.
   - Partição completa (split brain), verifique que apenas majority commits.
   - Recover node, deve catch up via log replication.
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

- Liga com **02-09** (Postgres): replication, MVCC.
- Liga com **02-11** (Redis): Sentinel, Cluster, Redlock críticas.
- Liga com **02-12** (Mongo): replica set é Raft-ish.
- Liga com **03-03** (K8s): etcd usa Raft; controllers reagem a state.
- Liga com **03-05** (AWS): DynamoDB consistency models.
- Liga com **04-02** (messaging): Kafka replication, ISR, exactly-once.
- Liga com **04-03** (event-driven): outbox, sagas.
- Liga com **04-04** (resilience): retries, idempotência, timeouts.
- Liga com **04-07/04-08** (architecture, services): consequences em design.
- Liga com **04-11** (blockchain): Byzantine consensus.

---

## 6. Referências

- **"Designing Data-Intensive Applications"**: Martin Kleppmann. Bíblia.
- **"Distributed Systems"**: Maarten van Steen e Andrew Tanenbaum (livre online).
- **MIT 6.824 lectures** ([pdos.csail.mit.edu/6.824](https://pdos.csail.mit.edu/6.824/)), labs em Go.
- **"Time, Clocks, and the Ordering of Events"**: Leslie Lamport (paper original).
- **"Paxos Made Simple"**: Lamport.
- **"In Search of an Understandable Consensus Algorithm"**: Ongaro, Ousterhout (Raft).
- **"Spanner: Google's Globally-Distributed Database"** (paper).
- **Jepsen** ([jepsen.io](https://jepsen.io/)), analyses de DBs reais.
- **The Raft visualization** ([thesecretlivesofdata.com/raft](https://thesecretlivesofdata.com/raft/)).
- **Distributed Systems for Fun and Profit**: Mikito Takada (livre online).
