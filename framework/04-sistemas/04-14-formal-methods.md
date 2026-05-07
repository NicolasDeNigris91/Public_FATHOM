---
module: 04-14
title: Formal Methods, TLA+, Model Checking, Invariants, Specification
stage: sistemas
prereqs: [04-01]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 04-14, Formal Methods (TLA+)

## 1. Problema de Engenharia

Sistemas distribuídos têm bugs que **testes nunca pegam**. Race conditions em cenários raros, perda de evento em network partition específica, livelock de retry, violações de invariants num caminho que ninguém pensou em testar. Quando AWS cita TLA+ em 04-03, DynamoDB, EBS; quando MongoDB, Cosmos DB, Tendermint, Tezos publicam specs em TLA+/Coq/Isabelle, não é academia. É a única ferramenta confiável pra **provar propriedades** sobre design distribuído antes de escrever código.

Formal methods não substituem testes nem code review. Substituem **whiteboard sessions vagas** ("acho que essa fila funciona") por modelos executáveis que o computador checa exaustivamente. Você desenha o sistema, escreve invariants ("todo pedido finalizado tem pagamento confirmado"), e o model checker explora todos os interleavings possíveis dentro do bound, finds counterexamples impossíveis de encontrar manualmente.

Senior de sistemas sérios deve **saber escrever TLA+ pra problemas críticos**: protocolo de consensus custom, fila de outbox com retries, reconciliation de pagamento, escalonador de jobs. Não vai usar todo dia, mas vai usar quando o custo de bug é alto.

Este módulo é formal methods aplicado: TLA+ + TLC, PlusCal, P language (Microsoft), Alloy. Specifications, invariants, temporal properties, refinement, e quando NÃO usar (cost > benefit em código simples).

---

## 2. Teoria Hard

### 2.1 Por que formal methods

Testes mostram presença de bugs, não ausência. Em sistema distribuído com N processos e mensagens out-of-order, número de interleavings cresce combinatorialmente. Testes hit menos de 0.0001% deles.

Model checking explora **todos** os states alcançáveis (até bound). Encontra contraexemplo se invariant viola.

Ganho real: especificar é onde você descobre o bug. 80% dos benefícios vêm de **escrever** a spec (forças clarity), 20% de rodar TLC.

### 2.2 TLA+ overview

TLA+ (Temporal Logic of Actions, Lamport): linguagem de especificação formal. Componentes:
- **Variables**: estado.
- **Init**: predicado inicial.
- **Next**: predicado de transição (relação entre estado atual e próximo).
- **Spec**: `Init /\ [][Next]_vars /\ Liveness`.
- **Invariants**: predicados sempre verdadeiros.
- **Temporal properties**: eventually, always, leads-to.

Sintaxe matemática (`/\`, `\/`, `\E`, `\A`, `=>`). Estado primed (`x'`) é next-state.

### 2.3 PlusCal

DSL imperativa que compila pra TLA+. Mais legível pra começar.

```
--algorithm Counter
variables x = 0;
begin
  Loop:
    while x < 10 do
      x := x + 1;
    end while;
end algorithm;
```

Tradução automática gera TLA+. Use PlusCal pra protótipo, refine pra TLA+ puro se precisar.

### 2.4 TLC: model checker

TLC explora state space exhaustivamente. Você define **model** (valores concretos pras constantes; ex: "3 servers, 5 mensagens"). TLC enumera estados reachable, checks invariants, reports contraexemplo.

State explosion é o limite. Specs de 5 processes com 10 events explodem rápido. Strategies:
- **Symmetry reduction**: collapsa estados isomorfos.
- **State constraint**: limita exploração.
- **TLAPS** (theorem prover): prova manual em vez de check exhaustive.

### 2.5 Invariants vs temporal properties

- **Safety invariant**: "nunca acontece X". Sempre verdadeiro em todo estado reachable. Ex: "nunca dois leaders".
- **Liveness**: "eventualmente Y acontece". Reflete progresso. Ex: "toda mensagem é eventualmente entregue (sob fairness)".

Liveness exige fairness (ações habilitadas eventualmente acontecem). Sem fairness, nada precisa progredir.

### 2.6 Refinement

Specification high-level (abstract) → low-level (mais detalhada). Refinement: low-level **implementa** high-level (toda execução de low é também execução de high).

Útil pra conectar spec abstrata ("consensus") com algoritmo concreto (Paxos).

### 2.7 P language (Microsoft), deep

P (Microsoft Research, 2013+) é linguagem **state-machine first** pra modelagem de sistemas event-driven assíncronos. Diferente de TLA+ (specification language puro), P é executável: você escreve spec **e** gera código de teste pra implementação real.

**Modelo conceitual:**
- Cada componente é uma **state machine** com handlers de mensagem.
- Componentes comunicam via **messaging assíncrono** (semantics actor-like).
- **Modular checker** explora todas interleavings de mensagens dentro de bound.
- Tem **simulation mode** + **stress testing** + **systematic exploration**.

**Exemplo conceitual:**
```p
machine Replica {
  start state Init {
    on PrepareReq do (req: PrepareReq) {
      // logic
      send req.from, PrepareAck;
      goto Active;
    }
  }
  state Active { ... }
}
```

**Onde P brilha:**
- **Distributed protocol design**: Paxos, Raft, 2PC, custom protocols.
- **Async event-driven systems**: actors, message queues, async APIs.
- **Generates test harness**: state machines viram testes unitários executáveis em C# (ou em runtimes que P alvo).
- **Microsoft uso real**: Service Fabric, Azure Storage. Bug-find em prod publicado.

**Vs TLA+:**
- TLA+: matemática elegante, melhor pra invariants e temporal logic abstrato.
- P: imperativo, código-like. Time de devs aceita mais fácil.
- TLA+: spec só. P: spec + executável + test harness.
- TLA+ tem comunidade maior, mais resources educacionais (Hillel Wayne).
- P é mais novo, comunidade menor. Cresceu post-2020.

### 2.8 Alloy, deep

Alloy (MIT, Daniel Jackson): **structural specification language**. Você define objects + relations, declara invariants e operations, e Alloy Analyzer (Kodkod backend) busca contraexemplo via SAT solver dentro de bound finito ("small scope hypothesis": bugs aparecem em modelos pequenos se aparecem).

**Exemplo conceitual:**
```alloy
sig User { friends: set User }
fact NoSelfFriend { all u: User | u not in u.friends }
fact Symmetric { friends = ~friends }

pred AddFriend [u, v: User, u', v': User] {
  u'.friends = u.friends + v
  v'.friends = v.friends + u
}

assert NoSelfAfterAdd { all u, v, u', v' | AddFriend[u,v,u',v'] => u not in u'.friends }
check NoSelfAfterAdd for 5
```

**Onde Alloy brilha:**
- **Schema design**: modelar invariants em árvores, grafos, schemas relacionais.
- **Permission systems**: ACL, RBAC, ABAC, relations + quantificação.
- **Data structure invariants**: red-black tree properties, B-tree balancing.
- **Specification de protocolo de simples a médio**.

**Trade-offs:**
- Bound finito: não prova pra todos os tamanhos. Confidence é "checked up to N".
- Não tem temporal logic forte como TLA+. Versão Electrum/Alloy 6 adicionou temporal mas TLA+ ainda mais maduro.
- Ferramenta IDE (Alloy Analyzer) é bom mas dated.

**Quando escolher:** modelagem de **structures/data invariants** > distributed protocols. Pra distributed, TLA+ ou P são primeira escolha.

### 2.9 Coq, Isabelle, Lean: theorem provers, deep

Diferente de model checking. **Theorem prover** ajuda a escrever **prova** de teorema; sistema valida cada passo. Não busca contraexemplo automaticamente, você guia a prova.

**Coq**: clássico. Prova interativa em Gallina. CompCert (compilador C verificado), Software Foundations (curso), CertiKOS (microkernel).

**Isabelle/HOL**: mais popular em ambientes acadêmicos europeus. seL4 microkernel formalmente verificado. Mathlib alternativa em Lean.

**Lean 4** (Leonardo de Moura, **emergente em 2023+**):
- Linguagem **dual**: prover **e** linguagem de programação compilada (gera C). Tração crescendo em 2025-2026, ainda **não-production-default** pra engenharia industrial.
- **mathlib4**: maior biblioteca de matemática formalizada do mundo (~1M+ lines), liderada por Kevin Buzzard. Foco matemático; aplicabilidade direta em sistemas distribuídos é menor que TLA+.
- **Tactic language** moderno (`Mathlib.Tactic`) reduz boilerplate vs Coq.
- Adoção em produção: Amazon usou pra **provar propriedades** de Cedar (policy language) — não pra implementar Cedar. É o padrão: prover ↔ implementação separada, prova garante propriedade.
- **Risco**: ecosystem de tooling (IDE, libs de sistemas) ainda imaturo vs Coq/Isabelle. Não aposte carreira; acompanhe.

**Onde theorem provers agregam (em sistemas, não academic):**
- **Compilers** (CompCert, CakeML).
- **Microkernels** (seL4, CertiKOS).
- **Cryptographic primitives** (HACL*, fiat-crypto).
- **Smart contracts** (alguns DeFi protocols têm specs em Coq).
- **Security policies** (Amazon Cedar via Lean 4).
- **Consensus protocols** (Tendermint, Cosmos partes).

**Cost altíssimo**: semanas/meses por theorem em sistemas reais. Reservado a:
1. Crítica de vida (avionics, medical devices).
2. Cryptography (correctness é pré-requisito).
3. Componente de OS / kernel onde bug = root.
4. Smart contracts $$$ que viraram targets de attack.

**Em 2026 vale acompanhar Lean 4**, mas sem hype: ainda é ferramenta de pesquisa madura para matemática + nichos específicos (Cedar, alguns componentes), não substituto generalista de TLA+/Alloy/PBT.

**Antes de subir em theorem provers ou TLA+**: domine **property-based testing** (Hypothesis em Python, fast-check em TS, PropEr em Erlang). PBT cobre 30-50% do benefício de formal methods com 5-10% do custo cognitivo. É o ponto de entrada saudável: invariants em código, shrinker descobre minimal counterexample. Só depois disso, escale a TLA+ pra protocolos onde o custo de bug justifique semanas escrevendo spec.

### 2.10 Onde formal methods agregam

AWS publicou: TLA+ em DynamoDB, 04-03, EBS, Aurora. "Found subtle bugs that would have taken months in production." MongoDB usa em replica set protocol. Tendermint, Cosmos, Ethereum 2.0 spec em K, Coq, Lean.

Patterns onde se justifica:
- Consensus protocols (Raft, Paxos variantes).
- Coordination (locks distribuídos, leases).
- Reconciliation (idempotent batch jobs).
- State machines críticas (payment, inventory).
- Migration de schema (downtime zero).
- Rate limiting / token bucket sob retries.

### 2.11 Quando NÃO usar

- Código sequencial simples: tests batem.
- Time não tem buy-in: spec abandonada após primeiro draft.
- Problema mal definido: spec espelha confusão.

ROI: se bug custa > 1 mês em produção, vale formal. CRUD app, raramente.

### 2.12 Exemplo: outbox pattern em TLA+

Outbox: write transaction insere row em `outbox`; worker lê e publica. Invariants:
- Toda row publicada existe na tabela source.
- Toda row source eventualmente publicada (se worker live).
- Não há publish duplicado (effective-once).

Modelar: states = outbox table + published log + worker state. Actions = insert (write txn), pick (worker reads), publish (worker emits to broker), ack (commit position). Invariant `Consistent` checa.

TLC explora interleaving worker crash mid-publish → worker restart → re-emit. Detecta se invariant breaks. Você corrige protocol se sim.

### 2.13 Workflow de formal methods

1. **Define problem**: que invariants importam.
2. **Spec abstrata**: minimal model das ações e estado.
3. **Roda TLC** em modelo pequeno; corrige até passar.
4. **Aumenta modelo**: mais processos / mensagens.
5. **Refinement**: spec mais detalhada se precisa.
6. **Implementa código** alinhado com spec.
7. **Teste**: integration tests confirmam empiricamente.

### 2.14 PlusCal patterns úteis

- **Atomic actions**: cada labeled step.
- **Process types**: `process (W \in Workers)`.
- **Channels**: variables + actions de send/receive.
- **Failures**: process termina ou crashes (modelo de unreliable).

### 2.15 Output: counterexample traces

TLC report:
```
Invariant violated: NoTwoLeaders
1: Init: replica1.role = Follower, ...
2: replica1 timeout, becomes Candidate, ...
...
17: replica1.role = Leader, replica2.role = Leader  -- VIOLATION
```

Você lê trace, entende cenário, ajusta protocol.

### 2.16 Lightweight formal methods

Não precisa TLA+ pra todo problema. **Property-based testing** (03-01) cobre subset; Hypothesis (Python), QuickCheck (Haskell), fast-check (JS). Defina property, lib gera inputs aleatórios, falha em contraexemplo.

Não exhaustive como TLA+, mas catches muitos bugs com pouco esforço.

### 2.17 Formal methods e ML / cripto

- Smart contracts: K Framework, Certora Prover, formal verification importante (cripto + dinheiro).
- ML formal verification: incipient (robustness proofs sob input perturbations).
- Crypto protocols: ProVerif, Tamarin pra protocol verification (Signal, TLS).

### 2.18 TLA+ vs Alloy vs P language — choosing the right tool

Três ferramentas, três filosofias. Senior escolhe baseado em natureza do problema, não em moda.

**TLA+** (Lamport, Microsoft Research): high-level state-transition specs, math-heavy, temporal logic forte. Industry-proven em AWS S3, DynamoDB, EBS, Cosmos DB consistency levels, MongoDB Raft, Confluent Kafka exactly-once. Toolbox + TLC model checker + Apalache (SMT-based symbolic alternative, type-check estrito).

**Alloy** (MIT, Daniel Jackson): relational logic declarativa, focus em structural invariants. Lower learning curve (< 5min pra spec básico rodando), instant counter-example via SAT. Best pra schemas, permissões, ACL, data structure invariants. Alloy Analyzer 6 adicionou temporal mas não chega ao nível TLA+.

**P language** (Microsoft, formerly P#): event-driven state machines, message-passing actors com model checking integrado. Industry use: Azure Storage frontend, USB driver verification, Service Fabric. Tem **code generation** pra C#/Go/Java actors mantendo verified semantics — único do trio que entrega executável.

**Decision tree:**

- **Distributed protocol** (consensus, replication, choreography Saga, leader election) → **TLA+**. AWS valida Paxos/MultiPaxos; Cosmos DB 5 níveis de consistency.
- **Schema/permission/structural model** ("pode user X chegar a resource Y via N hops?") → **Alloy**. Responde em segundos.
- **Event-driven actor system** (microservices, Erlang-style, event-sourced) → **P**.
- **Fast PoC ou validação de invariant estrutural** → **Alloy**.
- **Production-grade rigor, protocolo crítico** → **TLA+**.
- **Code generation + verified actors** → **P**.

**TLA+/PlusCal exemplo (Logística — Saga AssignOrderToCourier com compensation):**

```tla
---- MODULE AssignOrder ----
EXTENDS Naturals, Sequences, FiniteSets

CONSTANTS Couriers, Orders
VARIABLES order_state, courier_state, log

Init ==
  /\ order_state = [o \in Orders |-> "pending"]
  /\ courier_state = [c \in Couriers |-> "idle"]
  /\ log = <<>>

ReserveCourier(o, c) ==
  /\ order_state[o] = "pending"
  /\ courier_state[c] = "idle"
  /\ order_state' = [order_state EXCEPT ![o] = "reserved"]
  /\ courier_state' = [courier_state EXCEPT ![c] = "reserved"]
  /\ log' = Append(log, [order |-> o, courier |-> c, action |-> "reserve"])

ChargeFee(o, c) ==
  /\ order_state[o] = "reserved"
  /\ \/ /\ order_state' = [order_state EXCEPT ![o] = "assigned"]
        /\ UNCHANGED courier_state
        /\ log' = Append(log, [order |-> o, courier |-> c, action |-> "assign"])
     \/ \* charge fail compensation:
        /\ order_state' = [order_state EXCEPT ![o] = "pending"]
        /\ courier_state' = [courier_state EXCEPT ![c] = "idle"]
        /\ log' = Append(log, [order |-> o, courier |-> c, action |-> "compensate"])

Next == \E o \in Orders, c \in Couriers: ReserveCourier(o, c) \/ ChargeFee(o, c)
Spec == Init /\ [][Next]_<<order_state, courier_state, log>>

\* Safety: courier reserved nunca atribuído a 2 orders simultaneamente
NoDoubleAssignment ==
  \A c \in Couriers:
    Cardinality({o \in Orders: order_state[o] = "reserved" \/ order_state[o] = "assigned"
                 /\ \E i \in 1..Len(log): log[i].courier = c /\ log[i].action = "reserve"}) <= 1
====
```

Run via TLC: `tlc AssignOrder.tla -workers auto -deadlock`. TLC explora state space e reporta counter-example se invariant violado. Apalache alternativa quando state space explode.

**Alloy exemplo (Logística — multi-tenant access control, cruza com 02-09 RLS):**

```alloy
sig Tenant {}
abstract sig Role {}
one sig Admin, Manager, Driver extends Role {}
sig User { tenant: one Tenant, role: one Role }
sig Order { tenant: one Tenant, owner: one User }

pred canRead[u: User, o: Order] {
  u.tenant = o.tenant and (u.role in Admin + Manager or u = o.owner)
}

// Property: cross-tenant access impossible
assert NoCrossTenantRead {
  all u: User, o: Order | canRead[u, o] implies u.tenant = o.tenant
}
check NoCrossTenantRead for 5
```

Alloy Analyzer 6 retorna counterexample em segundos quando regra inconsistente. Use case: validate sob refactor que rules de access control NÃO permitem leak cross-tenant.

**P language exemplo (Logística — distributed lock acquire/release):**

```p
event eAcquire: machine;
event eAcquireResp: bool;
event eRelease: machine;

machine LockServer {
  var holder: machine;
  start state Free {
    on eAcquire do (req: machine) {
      holder = req;
      send req, eAcquireResp, true;
      goto Held;
    }
  }
  state Held {
    on eAcquire do (req: machine) {
      send req, eAcquireResp, false;
    }
    on eRelease do (req: machine) {
      assert(req == holder);
      goto Free;
    }
  }
}

spec MutualExclusion observes eAcquireResp {
  var holders: int;
  start state NoHolder {
    on eAcquireResp do (granted: bool) {
      if (granted) { holders = holders + 1; assert(holders <= 1); }
    }
  }
}
```

P checker explora interleavings; spec machine `MutualExclusion` valida invariant. Code-gen: P → C# actors mantendo verified semantics.

**Workflow integrado (formal methods em CI):**

- Specs vivem em `formal/` directory do repo.
- CI step: `tlc Spec.tla -workers auto -deadlock` em PR que muda concurrency-critical code.
- Counterexample = blocking review.
- Pegadinha: TLA+ specs ficam stale rápido sem disciplina; pair specification + code review como ADRs.

**State explosion mitigation:**

- **Symmetry reduction**: declare `SYMMETRY` set (Couriers indistinguíveis) → 100x state space reduction.
- **Bound model**: `CONSTANT Orders <- {o1, o2}, Couriers <- {c1, c2, c3}` em config.cfg pequeno; expand pra full set após smoke-check.
- **Apalache symbolic**: SMT solver explora state spaces maiores que TLC enumerativo.
- **State constraint**: `Len(log) <= 10` pra cap log growth durante check.

**Quando NÃO usar formal methods:**

- CRUD/business logic simples — property-based testing basta.
- Time-pressure feature — formal spec demora 1-2 semanas pra protocol não-trivial.
- Time sem competência — barreira de entrada > 2 sprints aprendizado.
- Sem disciplina de manter spec sync com código — vira documentation lie.

**Industry success cases:**

- **AWS DynamoDB**: TLA+ encontrou bug em multi-region replication antes de prod (Marc Brooker, "Why TLA+ Just Won").
- **Cosmos DB**: TLA+ valida 5 levels of consistency (strong, bounded staleness, session, consistent prefix, eventual).
- **MongoDB**: TLA+ pra Raft replication.
- **Azure Storage**: P pra distributed protocols + frontend code generation.
- **Confluent Kafka**: TLA+ pra exactly-once semantics design.

**Logística applied — 3 protocolos validáveis:**

- **Outbox + idempotent consumer** (cruza com 04-02): TLA+ valida `at-least-once delivery + idempotent consumer` resulta em exactly-once business effect.
- **Saga AssignOrderToCourier** (cruza com [04-08](04-08-services-monolith-serverless.md)): TLA+ valida compensations rodam em ordem reversa, courier nunca duplo-reservado.
- **Multi-tenant access** (cruza com [02-09](../02-plataforma/02-09-postgres-deep.md)): Alloy valida zero cross-tenant leak sob qualquer permissão policy.

**Anti-patterns observados:**

1. TLA+ spec gigante sem invariant clara (model check passa mas não prova nada útil).
2. Spec fora de sync com code (formal proof do código que não existe mais).
3. State space sem symmetry/constraints (TLC OOM em horas).
4. Alloy assert sem `for N` scope (default 3 muito small; falha em scope 4+).
5. P language usado pra structural model (Alloy é melhor; P pra event-driven).
6. Formal method sem CI integration (rot inevitável; specs viram folklore).
7. Counterexample ignorado ("must be impossible em prod") em vez de investigated.
8. TLA+ adotado por 1 dev sem buy-in time (bus factor; especificação morre quando dev sai).

**Cruza com:** [04-01](04-01-distributed-systems-theory.md) (FLP/CAP), [04-02](04-02-messaging.md) (outbox idempotency proof), [04-08](04-08-services-monolith-serverless.md) (Saga compensation correctness), [02-09](../02-plataforma/02-09-postgres-deep.md) (multi-tenant RLS), [04-12](04-12-tech-leadership.md) (formal methods em ADR de decisões significativas).

---

### 2.19 Formal methods em produção 2026 — TLA+ + Apalache + Lean 4 + property testing como FM-lite

**Contexto 2026.** Formal methods deixaram de ser tema de PhD e viraram ferramenta seletiva: AWS usa TLA+ para DynamoDB, S3 e EBS desde 2014; Microsoft especifica Azure Storage com P; FoundationDB e TigerBeetle constroem sistemas distribuídos sobre deterministic simulation testing; Lean 4 atravessa de prova matemática (Mathlib 4) para verificação de hardware em Intel/AMD. Mas continua sendo ROI-driven — escrever spec TLA+ para CRUD comum é teatro caro. O playbook 2026: classificar o subsistema por blast radius, aplicar lightweight FM (property tests + simulation) por padrão, e escalar para TLA+/Apalache/Lean apenas onde bug silencioso = perda irreversível (consenso, ledger financeiro, cripto, replicação).

**TLA+ production deep — TLC (explicit-state).** TLA+ 1.8+ continua mantido por Lamport. TLC enumera estados explicitamente — rápido para state space pequeno, exausto em sistemas grandes. Caso de uso: protocolos distribuídos com state space limitado (Raft, Paxos, leader election, distributed lock). PlusCal traduz pseudocódigo imperativo para TLA+ — adoção mais fácil para devs vindos de imperativo.

```tla
---- MODULE DistributedLock ----
EXTENDS Naturals, Sequences
CONSTANTS Clients
VARIABLES owner, queue

Init == owner = NULL /\ queue = <<>>

Acquire(c) ==
  /\ owner = NULL
  /\ owner' = c
  /\ queue' = queue

Enqueue(c) ==
  /\ owner # NULL
  /\ owner # c
  /\ c \notin Range(queue)
  /\ queue' = Append(queue, c)
  /\ owner' = owner

Release(c) ==
  /\ owner = c
  /\ IF queue = <<>>
       THEN owner' = NULL /\ queue' = queue
       ELSE owner' = Head(queue) /\ queue' = Tail(queue)

Next == \E c \in Clients : Acquire(c) \/ Enqueue(c) \/ Release(c)

\* Safety: cliente nunca aparece duas vezes na fila
NoDuplicateInQueue == \A c \in Clients : Cardinality({i \in DOMAIN queue : queue[i] = c}) <= 1

\* Liveness: todo cliente enfileirado eventualmente vira owner
Fairness == \A c \in Clients : []<>(c \notin Range(queue) \/ owner = c)
====
```

Config TLC (`DistributedLock.cfg`):

```
SPECIFICATION Spec
INVARIANT NoDuplicateInQueue
PROPERTY Fairness
CONSTANTS Clients = {c1, c2, c3}
```

CI integration (GitHub Actions):

```yaml
- name: TLC model check
  run: |
    java -jar tla2tools.jar -workers auto -config DistributedLock.cfg DistributedLock.tla
```

Counterexample trace do TLC é o produto principal — ler o trace conta exatamente como invariante quebra, sequência de ações que leva ao erro. Spec sem CI apodrece em 6 meses.

**Apalache symbolic checker.** Apalache 0.45+ (Q3 2024 — paralelismo + IRDL melhorado) substitui enumeração explícita por SMT solving (Z3/CVC5). Trade-off: Apalache lida com state space infinito (inteiros não-bounded, conjuntos arbitrários) que TLC não consegue, mas é mais lento em state spaces pequenos onde TLC explícito ganha. IRDL (Intermediate Representation for Data Layouts) é o subset de TLA+ que Apalache aceita — exige type annotations.

```bash
# Bounded model checking até depth 20
apalache-mc check --length=20 --inv=NoDuplicateInQueue DistributedLock.tla

# Symbolic execution com array encoding (escala melhor em sets grandes)
apalache-mc check --length=50 --inv=NoDuplicateInQueue --smt-encoding=arrays DistributedLock.tla
```

Regra prática: começar com TLC, mover para Apalache quando state space explode (mensagens com IDs grandes, timestamps, contadores monotônicos).

**Lean 4 modern.** Lean 4 (release estável 2023) com Mathlib 4 thriving — biblioteca matemática community-driven cobre álgebra, topologia, análise. Adoção em hardware verification (Intel formal verification team, AMD em partes do pipeline FP) e cripto (Lean para provas sobre primitivas criptográficas). Substitui Coq (rebrand para Rocq em 2025, versão 8.20 Q4 2024) gradualmente em projetos novos pela ergonomia superior. Isabelle 2024 (Q4 2024) continua dominante em verificação de SO (seL4) e provas educacionais.

```lean
-- Lean 4: prova de comutatividade da soma sobre Nat
theorem add_comm_nat (a b : Nat) : a + b = b + a := by
  induction a with
  | zero => simp
  | succ n ih => simp [Nat.add_succ, Nat.succ_add, ih]

-- Refinement type via subtype: head total sobre lista não-vazia
def head! {α : Type} : (xs : List α) → xs ≠ [] → α
  | x :: _, _ => x
```

Lean para SW genérico = overkill. Reserve para cripto, safety-critical (avionics, medical), provas matemáticas que sustentam protocolo.

**P language (Microsoft).** P estável, foco em event-driven state machines — modelo natural para mensageria assíncrona, atores, protocolos. Usado para Azure Storage spec. Diferente de TLA+ porque é executável (gera C/C# para deployment) e checa via systematic exploration de schedules.

**Property-based testing — gateway drug para FM.** fast-check 3.x (TS) e Hypothesis 6.x (Python) geram entradas aleatoriamente + shrinking automático para counterexample mínimo. Custo entry-level baixo, ROI alto — força o dev a articular invariantes explicitamente.

```ts
// fast-check 3.x: ledger invariants
import fc from 'fast-check';

test('ledger sum is invariant under reordering', () => {
  fc.assert(
    fc.property(fc.array(fc.integer({ min: -1000, max: 1000 })), (entries) => {
      const sum1 = entries.reduce((a, b) => a + b, 0);
      const sum2 = [...entries].reverse().reduce((a, b) => a + b, 0);
      return sum1 === sum2;
    }),
    { numRuns: 1000, seed: 42 }, // seed pinado para CI determinístico
  );
});

test('saga step is idempotent', () => {
  fc.assert(
    fc.property(fc.uuid(), async (orderId) => {
      const r1 = await applyCompensation(orderId);
      const r2 = await applyCompensation(orderId);
      return r1.state === r2.state;
    }),
    { numRuns: 200, seed: 1337 },
  );
});
```

Anti-pattern: `numRuns: 100` sem seed pinado em CI = flake. Pin seed + numRuns alto OU mover suite property para nightly.

**Deterministic simulation testing (DST).** FoundationDB pioneirou (talk pública de 2014+); TigerBeetle (DB financeiro 2024) construiu produção em cima. Princípio: substituir relógio real, IO real e rede real por versões injetadas — toda execução é função pura de seed. Bug encontrado = replay 100% reproduzível. Roda 10⁶+ simulações com fault injection (network partition, disk corruption, clock skew) em CI nightly.

```ts
// padrão DST simplificado
class SimulatedNode {
  constructor(private clock: SimClock, private net: SimNet, private disk: SimDisk) {}
}

function runSimulation(seed: number, faultRate: number) {
  const rng = mulberry32(seed);
  const clock = new SimClock(rng);
  const net = new SimNet(rng, faultRate);
  const disk = new SimDisk(rng, faultRate);
  const cluster = createCluster({ clock, net, disk });
  for (let tick = 0; tick < 100_000; tick++) {
    cluster.step();
    assertInvariants(cluster); // ledger balanced, no duplicate writes, etc.
  }
}

// CI: rodar 10000 seeds, falha = print seed + replay manual com mesmo seed
for (const seed of generateSeeds(10_000)) runSimulation(seed, 0.01);
```

Anti-pattern crítico: dependência não-determinística (`Date.now()`, `Math.random()` sem seed, `crypto.randomUUID()` real, syscall) destrói determinismo — bug irrepetível é pior que bug conhecido.

**Hyperproperty checking.** Propriedades sobre múltiplos traces (não single trace). Non-interference: low-security observer não distingue execução com input high-security A vs B — base formal de timing-side-channel resistance e isolamento multi-tenant. Ferramentas: HyperLTL, Apalache (com extensões). Reservado para sistemas com ameaça side-channel real (cripto, multi-tenant database). Anti-pattern: claim "we don't leak" sem checker é hyperproperty teatro.

**Decision matrix 2026.**

| Subsistema | Ferramenta | Justificativa |
|---|---|---|
| Consensus protocol (Raft/Paxos) | TLA+ + TLC | State space limitado; literatura existente; AWS-style |
| Event-driven state machine | P language | Gera código + checa schedules |
| State space infinito (counters, timestamps) | Apalache | SMT lida com unbounded |
| Cripto / safety-critical math | Lean 4 / Coq | Refinement + dependent types |
| Distributed DB (replicação, txn) | DST (FoundationDB/TigerBeetle pattern) | High-cardinality + replay |
| Domain logic (ledger, saga) | Property-based (fast-check / Hypothesis) | Cheap entry, alto ROI |
| Side-channel / multi-tenant isolation | Hyperproperty checker | Único método sound |
| CRUD comum / UI | Nada formal — testes integração | ROI negativo |

**Stack Logística aplicada.**

- **TLA+:** spec do outbox idempotency + saga compensation correctness (consumer ack + retry under network partition). Subsistema crítico, blast radius = perda de evento financeiro. CI roda TLC weekly em nightly job.
- **fast-check 3.x:** invariantes de domínio core — ledger sums balanced, saga steps idempotent, CPF/CNPJ round-trip serialize, pricing engine commutativity. Roda em CI a cada PR com seed pinado.
- **DST (TigerBeetle-inspired):** algoritmo de courier matching (high-cardinality, race conditions reais). 1000 simulações nightly com fault injection (driver disconnect mid-match).
- **Lean 4:** não usado — overkill para domínio logístico (sem cripto custom, sem hardware). Adoção seria FM theater.
- **P language:** considerado para fleet state machine, descartado — fast-check + DST cobrem com ROI melhor.

**10 anti-patterns 2026.**

1. TLA+ spec sem CI integration — apodrece em 6 meses; spec vira folclore.
2. Apalache assumido sempre mais rápido que TLC — depende workload; TLC ganha em state space pequeno, Apalache em infinito.
3. Lean 4 adotado para SW genérico onde property tests bastam — custo massivo; reserve para cripto/safety-critical.
4. fast-check `numRuns: 100` sem seed pinado em CI — flake garantido; pin seed + numRuns alto, OU mover para nightly.
5. Deterministic simulation com dependências não-determinísticas (real clock, real network, `randomUUID()` real) — defeats determinismo, bug irrepetível.
6. Hyperproperty assumida via claim ("não vazamos dados") sem checker — theater, falsa confiança.
7. Counterexample do model checker explicado away ("must be impossible em prod") em vez de investigado — bug em prod 6 meses depois.
8. Bus factor 1 — único expert sai, FM morre, spec apodrece, ninguém atualiza.
9. FM theater — escrever spec para parecer rigoroso, nunca rodar checker, spec não reflete código.
10. FM aplicado em layer de baixo impacto (UI, CRUD) com ROI negativo enquanto sistema crítico (consenso, ledger) fica sem proteção.

**Cruza com:** [04-14 §2.2-§2.4](04-14-formal-methods.md) (TLA+/PlusCal/TLC foundation), [§2.5](04-14-formal-methods.md) (invariants), [§2.7](04-14-formal-methods.md) (P language), [§2.8](04-14-formal-methods.md) (Alloy), [§2.9](04-14-formal-methods.md) (Coq/Isabelle/Lean intro), [§2.16](04-14-formal-methods.md) (lightweight FM intro), [§2.18](04-14-formal-methods.md) (TLA+ vs Alloy vs P), [04-01 §2.11](04-01-distributed-systems-theory.md) (consensus Raft/Paxos), [§2.22](04-01-distributed-systems-theory.md) (consensus applied), [04-02 §2.18](04-02-messaging.md) (idempotent consumer — formal proof candidate), [04-03 §2.19](04-03-event-driven-patterns.md) (Outbox + Saga — TLA+ candidate), [03-01 §2.10](../03-producao/03-01-testing.md) (property-based testing intro), [§2.20](../03-producao/03-01-testing.md) (Vitest 3 + fast-check), [04-04 §2.30](04-04-resilience-patterns.md) (DR — formal proof of failover correctness).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Justificar formal methods sobre testes em sistema distribuído.
- Definir safety vs liveness invariant; dar exemplo.
- Listar componentes de TLA+ Spec: Init, Next, Spec, invariants.
- Diferenciar TLA+ e PlusCal.
- Explicar state explosion e técnicas de mitigação.
- Diferenciar model checker (TLC) e theorem prover (Coq).
- Listar 4 problemas onde formal methods retornam ROI.
- Modelar outbox pattern em alto nível.
- Explicar fairness em liveness.
- Justificar refinement: spec abstrata → low-level.
- Comparar property-based testing e formal methods.

---

## 4. Desafio de Engenharia

Modelar **3 protocolos críticos** da Logística em TLA+/PlusCal e validar invariants.

### Especificação

Protocolos:

**1. Outbox pattern (04-03 conexão)**
- Modelo: tabela `orders` com txn writes + outbox row; worker que polls outbox e emite pra Kafka; broker entrega; consumer aplica.
- Invariants:
  - **Source-implies-published**: toda order finalizada `[]` (sob fairness) tem evento `OrderCreated` publicado.
  - **No-orphan-publish**: todo evento publicado tem order correspondente em `orders`.
  - **At-least-once**: invariant que não exige exactly (exatamente uma vez é detalhe de consumer).
- Acionar TLC com 3 orders, 1 worker que pode crash.
- Counterexample: worker publish-then-crash before commit offset → re-publish ok (consumer dedupe).

**2. Idempotent payment retry**
- Cliente faz POST `/charge` com idempotency key. Server cria PaymentIntent. Network falha; cliente retry. Server detecta key, retorna mesmo result.
- Invariants:
  - **At-most-once-charge**: toda key gera ≤ 1 charge no ledger.
  - **Eventually-charged-or-failed**: toda request eventualmente termina (sob fairness).
- Modelo: 2 clients, 1 server, 1 PSP. Mensagens podem perder ou duplicar.

**3. Courier dispatch (single-assignment)**
- N orders, M couriers. Dispatcher assigna. Garantir 1 courier por order.
- Invariants:
  - **Single-assignment**: toda order tem ≤ 1 courier.
  - **Capacity**: courier ocupado não recebe outro até liberar.
  - **Eventual assignment**: toda order pending eventualmente assigned (se courier disponível).

Para cada:
1. Spec em PlusCal ou TLA+.
2. Model com constants concretos.
3. Run TLC; verifique invariants.
4. **Force a bug**: modifique spec retirando uma proteção (ex: skip dedupe). TLC produz counterexample. Documente em `findings.md`.
5. Conecte com código real: aponte onde no codebase do CAPSTONE-sistemas cada protocolo vive e como spec corresponde.

### Restrições

- Use TLA+ Toolbox ou VS Code TLA+ plugin.
- Models small enough pra TLC terminar em < 5 min.
- `findings.md` documenta cada invariant + counterexample reproduzido.

### Threshold

- 3 specs rodando, invariants verificadas em modelo legítimo.
- 3 counterexamples produzidos intencionalmente (em versão buggy).
- Mapeamento spec ↔ código real.

### Stretch

- **Refinement**: spec abstrata "consensus" + spec concreta "Paxos" mostrando refinement (raríssimo, exige prática).
- **TLAPS proof** de invariant em vez de check.
- **P language**: rewrite outbox em P, gere mock C#.
- **Property-based** (fast-check) tests no código real, comparando coverage com formal methods.
- **Fórum / blog**: escreva post explicando TLA+ pra publicização (04-15 conexão).

---

## 5. Extensões e Conexões

- Liga com **01-06** (paradigms): formal logic, declarative.
- Liga com **01-11** (concurrency): TLA+ é a ferramenta canônica pra raciocinar.
- Liga com **02-18** (payments): idempotency formalmente verificável.
- Liga com **04-01** (distributed): consensus, replication, CAP modelados.
- Liga com **04-02** (messaging): exactly-once, retries.
- Liga com **04-03** (event-driven): outbox pattern.
- Liga com **04-04** (resilience): retry/timeout protocols.
- Liga com **04-11** (Web3): smart contracts demand formal proof.
- Liga com **CAPSTONE-sistemas**: spec dos protocolos críticos antes de implementar.

---

## 6. Referências

- **"Specifying Systems"**: Leslie Lamport. Bíblia TLA+, gratuito.
- **"Practical TLA+"**: Hillel Wayne. Mais hands-on.
- **Hillel Wayne's blog** ([learntla.com](https://learntla.com/), [hillelwayne.com](https://hillelwayne.com/)).
- **Marc Brooker's blog**: AWS engineer escrevendo sobre formal em produção.
- **"How Amazon Web Services Uses Formal Methods"**: paper Newcombe et al.
- **TLA+ video course**: Lamport.
- **P language repo & paper**: Microsoft Research.
- **Alloy book**: Daniel Jackson, "Software Abstractions".
- **"Formal Verification of Distributed Systems"**: comprehensive reading list.
- **"Software Foundations"**: Coq tutorial (Pierce et al, gratuito).
