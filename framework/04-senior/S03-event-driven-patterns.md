---
module: S03
title: Event-Driven Patterns — Event Sourcing, CQRS, Outbox, Saga
stage: senior
prereqs: [S02]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# S03 — Event-Driven Patterns

## 1. Problema de Engenharia

Times adotam "event-driven architecture" e descobrem que cada feature vira investigação forense em N consumers. Eventos sem schema, sem versioning, sem ordering claro, sem dead letter. Saga sem compensation. CQRS aplicado em CRUD trivial. Event sourcing onde simples table seria melhor.

Este módulo separa conceito de cargo cult. Quando cada padrão vence, quando custa mais que entrega, e como combinar: events as integration, event sourcing, CQRS, outbox, sagas (choreography vs orchestration), idempotency design, projection rebuilds, schema evolution.

---

## 2. Teoria Hard

### 2.1 Niveis de event-driven

Andreas Tobias et al. distinguem:
1. **Event-notification**: "algo aconteceu, vai ver detalhe via API". Lightweight.
2. **Event-carried state transfer**: evento carrega state suficiente; consumer não precisa callback.
3. **Event-sourcing**: estado é derivado completamente de event log. Source of truth é log.
4. **CQRS**: separação read/write com possivelmente diferentes models.

Cada nível adiciona complexidade. Use o mínimo necessário.

### 2.2 Event-notification

- Service A faz mudança, emite event leve (`OrderPaid {orderId, ts}`).
- Service B consume, faz callback `GET /orders/{id}` pra detalhe.

Pros: simple, freshest data.
Cons: callback chatter; A precisa estar disponível pra B agir.

### 2.3 Event-carried state transfer

- Event carrega todos campos relevantes: `OrderPaid {orderId, customerId, amount, items: [...]}`.
- Consumer não precisa callback.

Pros: serviços desacoplados de A's availability.
Cons: events maiores; schema crescente; data dup entre services.

### 2.4 Event sourcing

State é derivado de log de eventos. Não há "tabela de orders" canonical; há `OrderEvents` log. Current state = fold dos eventos.

Pros:
- Audit log completo nativo.
- Replay pra novos read models.
- Time-travel queries.
- Aceita evolução: novo read model é só consumer novo.

Cons:
- Storage cresce.
- Queries diretas trickier (precisa projeção).
- Schema evolution de eventos não é trivial (eventos são imutáveis; novos types convivem).
- Snapshots needed pra performance (rebuild N eventos é caro).

Quando vence: domínios com alto valor de auditoria/regulação (financeiro, médico), domínios com lógica complexa que beneficia retro-thinking.

### 2.5 CQRS

Command Query Responsibility Segregation. Models separados pra write (commands) e read (queries).

Write side: aggregate, normalização, integridade.
Read side: projetions otimizadas pra queries (denormalized, search-friendly).

Pros:
- Reads fast (read model especializado).
- Scale read e write independent.
- Evolução de read sem afetar write.

Cons:
- Eventual consistency entre models.
- Sincronização (events ou CDC).
- Mais código.

CQRS sem ES é viável: escreva no Postgres normalized, projete pra ElasticSearch via worker.

CQRS + ES é o stack puro.

### 2.6 Aggregate

Conceito DDD: cluster de objetos consistentes. Aggregate root é entry point. Transações alteram 1 aggregate por vez.

Em event sourcing: aggregate's state = fold de seus events. Commands geram events.

Pra Logística: `Order` é aggregate. Eventos `OrderCreated`, `OrderAssigned`, `OrderDelivered` modificam. `Customer` outro aggregate.

Cross-aggregate transactions = saga (não txn ACID).

### 2.7 Saga (já tocou em S01/S02)

Choreography vs orchestration:
- **Choreography**: cada service reage a events. Distribuído, sem coordenador.
  - Pros: loose coupling.
  - Cons: hard to follow flow ("where does step 3 happen?").
- **Orchestration**: coordinator central. Workflow engine.
  - Pros: explicit flow, easier debug.
  - Cons: coordinator é sintético point of complexity.

Engines: **Temporal**, **Camunda**, **Orkes Conductor**, **AWS Step Functions**. Code workflows com retries, timeouts, persistence.

Em greenfield com flows complexos (5+ steps), orchestration via Temporal é altamente produtivo.

### 2.8 Outbox revisited

Padrão central que vimos. Detalhes operacionais:
- Outbox table com `id, aggregate_type, aggregate_id, payload, created_at, processed_at, attempts`.
- Worker processo separado, polling ou pgnotify.
- Em Postgres, `pg_notify` pode reduzir polling latency.
- Idempotency: producer deve usar `id` como producer key/dedup.
- Cleanup: depois de N dias, archive ou drop.

CDC alternativa via Debezium: source of truth é Postgres directly. Sem outbox; events derivados de WAL.

### 2.9 Schema evolution

Eventos são contratos — evolução exige cuidado.

Padrões:
- **Additive only**: adicionar campo opcional. Consumers antigos ignoram.
- **Versioning**: `OrderCreatedV1`, `OrderCreatedV2`. Consumers escolhem.
- **Upcasters**: convert old version → new on read.
- **Schema Registry** com compatibility checks.

Nunca:
- Renomear campo silenciosamente.
- Mudar tipo (int → string).
- Remover campo required.

Em ES, eventos antigos no log são imutáveis. Você convive com 5 versões eternamente. Disciplina vira crítica.

### 2.10 Projections

Read models construídos consumindo events. Cada projection é um consumer (group, position).

Operations:
- **Build new projection**: reset offset to 0, consume tudo, build read model.
- **Rebuild**: swap projection sem downtime (dual-write pra ambas, switch reads).
- **Backfill**: nova projection após eventos antigos passados.

Snapshots:
- Pra aggregate com N eventos, fold N é caro. Snapshot every M events.
- Read = load snapshot + apply events depois.

### 2.11 Event design

- **Past tense**: `OrderCreated`, não `CreateOrder`.
- **Domain language**: nomes que stakeholders entendem.
- **Self-contained o suficiente**: include keys de joining (orderId, customerId).
- **Immutable**: nunca rewrite.
- **Versioned**.
- **Granularity**: 1 evento por mudança domain-significativa, não por field.

Anti-padrões:
- Eventos como "ChangeRow" técnicos sem semântica de domínio.
- Eventos enormes carregando tudo "just in case".
- Events em série temporal sem agregação domain.

### 2.12 Eventual consistency UX

UI precisa lidar com:
- Optimistic updates (cliente assume sucesso, recovery em failure).
- Polling pra confirmação.
- WS/SSE pra push de novidade.
- Loading states durante delay.

Pattern: "read your writes" — após write, cliente caches imediato; backend confirma async; UI consistent enough.

### 2.13 Anti-corruption layer (ACL)

Quando integrando com sistema externo (legacy, third-party API), ACL traduz model externo pra model interno. Eventos podem ser veículo: ACL consome events externos e emite events internos limpos.

Mantém domain core imune a model alheio.

### 2.14 Event-driven monolith (modular)

Você não precisa K microservices pra adotar EDA. **Modular monolith com in-process events** é poderoso:
- Modules trocam events via in-memory bus.
- Mesma transação DB.
- Quando precisar separar serviço, events viram cross-process.

Vince Knight, Vaughn Vernon e outros pregam isso. Em projetos médios, é o sweet spot.

### 2.15 Outbox + idempotência consumer

Producer outbox + idempotent consumer = "exactly-once processing":
- Producer escreve em DB + outbox em txn.
- Worker publica em broker; broker garante at-least-once.
- Consumer dedupa por evento id ou por business key.
- Repetir é safe.

### 2.16 Saga design

Step list:
1. `ReserveCourier` → reserve em DB de courier; compensation `ReleaseCourier`.
2. `ChargeFee` → invoke billing API; compensation `RefundFee`.
3. `NotifyCourier` → push to mobile; compensation: nothing or apologetic notification.

Estados: started, compensating, succeeded, failed.

Workflow engine torna isso código declarativo. Sem engine, você implementa via state machine + events; mais trabalho, mais ad-hoc.

### 2.17 Stream processing

Além de "consumer reagindo": agregações em janela.

- Kafka Streams, Flink, ksqlDB.
- Counts, sums, joins por janela (tumbling, hopping, session).
- Materialized views.

Use case: dashboard real-time de orders/min por tenant; alerta de courier offline > 10 min.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- 4 níveis de event-driven com caso pra cada.
- Distinguir event sourcing e CQRS.
- Justificar quando ES vence row-based.
- Padrão outbox em 5 etapas.
- Saga choreography vs orchestration; quando cada vence.
- Schema evolution rules em events.
- Projection rebuild estratégia.
- Event design: 5 boas práticas.
- Eventual consistency UX patterns.
- Modular monolith com events vs microservices.

---

## 4. Desafio de Engenharia

Aplicar **CQRS + Event Sourcing parcial** em um subdomain do Logística.

### Especificação

1. **Subdomain alvo**: `Order` aggregate.
   - Event sourcing pro lifecycle de Order: events são fonte de verdade.
   - Read models: lista de orders, dashboard agregado, view detalhe.
2. **Event store**:
   - Tabela Postgres `order_events(stream_id, version, type, payload, ts)`.
   - Concurrency control via `version` (optimistic).
   - Compaction de snapshots a cada 50 events por stream.
3. **Aggregate**:
   - Code TS: `Order.create`, `Order.assign`, `Order.markPickedUp`, `Order.markDelivered`. Cada um valida invariants e emite event.
   - Reconstrução: `Order.fromEvents(events)`.
4. **Projections**:
   - Read model `orders_view` (tabela Postgres) — atualizada por consumer de events.
   - Read model `dashboard_aggregate` (Postgres ou Redis) — counts por tenant.
   - 1 projection nova adicionada APÓS deploy: rebuild from start, sem downtime.
5. **Saga**:
   - Implementar saga "AssignOrderToCourier" via **orchestration** (Temporal local ou state machine própria).
   - Steps: ReserveCourier, ChargeFee, NotifyCourier.
   - 1 step com falha simulada → compensations rodam.
6. **Outbox**:
   - Eventos publicados no broker (Kafka/Redpanda) via outbox pattern.
   - Worker que lê outbox idempotently.
7. **Schema evolution**:
   - Adicionar campo opcional em `OrderAssigned V2`.
   - Demonstre que consumers V1 ainda funcionam.
8. **Modular monolith approach**:
   - Mantenha tudo no mesmo deployable. Events in-process pra alguns paths, broker pra cross-tenant ou high-fanout.

### Restrições

- Sem ES em todo o domínio: apenas no subdomain Order. Customers, tenants etc. continuam normalized.
- Sem CQRS em CRUD trivial.
- Sem rewriting events (eventos imutáveis).

### Threshold

- README documenta:
  - Decisão de aplicar ES só em Order (e por que outros aggregates não).
  - Schema do event store + diagrama de flow (command → event → projection).
  - 1 saga executando + 1 compensating.
  - Rebuild de projection ao vivo (com lag durante e catching up).
  - Schema evolution V1 → V2 funcionando.
  - 1 caso onde ES revelou bug histórico que normalized DB esconderia (audit power).

### Stretch

- Time-travel query: estado do Order em data X.
- Snapshots automated; rebuild de aggregate com 10k events em < 100ms.
- Stream processing: Flink/ksqlDB calculando KPIs em janela e expondo via Grafana.
- Mass projection rebuild (offset rewind cluster Kafka) pra construir read model totalmente novo de events anos.
- Migração: substituir orchestration interna por Temporal real, mostrando ganhos.

---

## 5. Extensões e Conexões

- Liga com **A09** (Postgres): event store, MVCC pra concurrency.
- Liga com **A12** (Mongo): poderia ser event store; trade-offs.
- Liga com **A11** (Redis): read models cached; Streams como event log light.
- Liga com **P07** (observability): tracing cross-event, lag.
- Liga com **S01** (theory): ordering, consistency em projections.
- Liga com **S02** (messaging): infra de broker.
- Liga com **S04** (resilience): retries, idempotency, compensation.
- Liga com **S06** (DDD): aggregate, bounded context, event storming.
- Liga com **S07/S08** (architecture): EDA modular vs microservices.

---

## 6. Referências

- **"Designing Event-Driven Systems"** — Ben Stopford (free Confluent).
- **"Event Sourcing"** — Martin Fowler ([martinfowler.com/eaaDev/EventSourcing.html](https://martinfowler.com/eaaDev/EventSourcing.html)).
- **"Microservices Patterns"** — Chris Richardson (sagas, CQRS, outbox).
- **"Implementing Domain-Driven Design"** — Vaughn Vernon.
- **"Versioning in an Event Sourced System"** — Greg Young (livro/posts).
- **Temporal docs** ([docs.temporal.io](https://docs.temporal.io/)).
- **Camunda docs**.
- **Vlingo, EventStoreDB** ([eventstore.com](https://www.eventstore.com/)).
- **Debezium docs** (CDC).
- **DDIA** capítulos 11 (stream processing).
