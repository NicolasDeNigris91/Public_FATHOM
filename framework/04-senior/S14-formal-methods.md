---
module: S14
title: Formal Methods — TLA+, Model Checking, Invariants, Specification
stage: senior
prereqs: [S01]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# S14 — Formal Methods (TLA+)

## 1. Problema de Engenharia

Sistemas distribuídos têm bugs que **testes nunca pegam**. Race conditions em cenários raros, perda de evento em network partition específica, livelock de retry, violações de invariants num caminho que ninguém pensou em testar. Quando AWS cita TLA+ em S3, DynamoDB, EBS; quando MongoDB, Cosmos DB, Tendermint, Tezos publicam specs em TLA+/Coq/Isabelle — não é academia. É a única ferramenta confiável pra **provar propriedades** sobre design distribuído antes de escrever código.

Formal methods não substituem testes nem code review. Substituem **whiteboard sessions vagas** ("acho que essa fila funciona") por modelos executáveis que o computador checa exaustivamente. Você desenha o sistema, escreve invariants ("todo pedido finalizado tem pagamento confirmado"), e o model checker explora todos os interleavings possíveis dentro do bound — finds counterexamples impossíveis de encontrar manualmente.

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

### 2.7 P language (Microsoft)

P: linguagem state-machine pra distribuído. Compila pra C#. State machines comunicam via mensagens. P checker faz exhaustive explore + simulation.

USP: write spec **e** generate código de teste. Microsoft usa em Service Fabric e outros sistemas.

### 2.8 Alloy

Alloy (MIT, Daniel Jackson): structural specification. Linguagem com objects + relations, model finder (Kodkod) tenta achar contraexemplo dentro de bound.

Útil pra modelar **schemas/data structures**: invariants em árvores, grafos, schemas. Menos popular que TLA+ pra distributed.

### 2.9 Coq, Isabelle, Lean: theorem provers

Diferente de model checking. **Theorem prover** ajuda a escrever **prova** de teorema; sistema valida cada passo.

CompCert (compilador C verificado em Coq), seL4 microkernel (Isabelle), Lean (mathlib).

Cost altíssimo (semanas/meses por theorem). Reservado a sistemas crítica de vida ou criptografia.

### 2.10 Onde formal methods agregam

AWS publicou: TLA+ em DynamoDB, S3, EBS, Aurora. "Found subtle bugs that would have taken months in production." MongoDB usa em replica set protocol. Tendermint, Cosmos, Ethereum 2.0 spec em K, Coq, Lean.

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

Não precisa TLA+ pra todo problema. **Property-based testing** (P01) cobre subset; Hypothesis (Python), QuickCheck (Haskell), fast-check (JS). Defina property, lib gera inputs aleatórios, falha em contraexemplo.

Não exhaustive como TLA+, mas catches muitos bugs com pouco esforço.

### 2.17 Formal methods e ML / cripto

- Smart contracts: K Framework, Certora Prover, formal verification importante (cripto + dinheiro).
- ML formal verification: incipient (robustness proofs sob input perturbations).
- Crypto protocols: ProVerif, Tamarin pra protocol verification (Signal, TLS).

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

**1. Outbox pattern (S03 conexão)**
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
5. Conecte com código real: aponte onde no codebase do CAPSTONE-senior cada protocolo vive e como spec corresponde.

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
- **Fórum / blog**: escreva post explicando TLA+ pra publicização (S15 conexão).

---

## 5. Extensões e Conexões

- Liga com **N06** (paradigms): formal logic, declarative.
- Liga com **N11** (concurrency): TLA+ é a ferramenta canônica pra raciocinar.
- Liga com **A18** (payments): idempotency formalmente verificável.
- Liga com **S01** (distributed): consensus, replication, CAP modelados.
- Liga com **S02** (messaging): exactly-once, retries.
- Liga com **S03** (event-driven): outbox pattern.
- Liga com **S04** (resilience): retry/timeout protocols.
- Liga com **S11** (Web3): smart contracts demand formal proof.
- Liga com **CAPSTONE-senior**: spec dos protocolos críticos antes de implementar.

---

## 6. Referências

- **"Specifying Systems"** — Leslie Lamport. Bíblia TLA+, gratuito.
- **"Practical TLA+"** — Hillel Wayne. Mais hands-on.
- **Hillel Wayne's blog** ([learntla.com](https://learntla.com/), [hillelwayne.com](https://hillelwayne.com/)).
- **Marc Brooker's blog** — AWS engineer escrevendo sobre formal em produção.
- **"How Amazon Web Services Uses Formal Methods"** — paper Newcombe et al.
- **TLA+ video course** — Lamport.
- **P language repo & paper** — Microsoft Research.
- **Alloy book** — Daniel Jackson, "Software Abstractions".
- **"Formal Verification of Distributed Systems"** — comprehensive reading list.
- **"Software Foundations"** — Coq tutorial (Pierce et al, gratuito).
