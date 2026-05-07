---
module: 04-03
title: Event-Driven Patterns, Event Sourcing, CQRS, Outbox, Saga
stage: sistemas
prereqs: [04-02]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 04-03, Event-Driven Patterns

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

### 2.7 Saga (já tocou em 04-01/04-02)

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

Eventos são contratos, evolução exige cuidado.

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

Pattern: "read your writes", após write, cliente caches imediato; backend confirma async; UI consistent enough.

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

### 2.18 Event sourcing operacional (versioning, snapshots, projection rebuild)

Subseção §2.4 introduziu ES conceitualmente. Aqui está o operacional: schema do event store, 5 estratégias de versioning, snapshot pattern, rebuild de projection sem downtime, optimistic concurrency, e anti-patterns que corrompem audit log.

**Event store schema (Postgres canonical)**:

```sql
CREATE TABLE events (
  stream_id   UUID        NOT NULL,
  version     INT         NOT NULL,
  type        TEXT        NOT NULL,
  payload     JSONB       NOT NULL,
  metadata    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  ts          TIMESTAMPTZ NOT NULL DEFAULT now(),
  global_seq  BIGSERIAL,
  PRIMARY KEY (stream_id, version)
);
CREATE INDEX events_global_seq_idx ON events (global_seq);
CREATE INDEX events_type_ts_idx    ON events (type, ts);
```

`PRIMARY KEY (stream_id, version)` garante optimistic concurrency: append duplicado falha. `global_seq BIGSERIAL` dá ordem global monotônica para projection consumers. Index `(type, ts)` serve audit ad-hoc; nada além disso — event store é append-only log, não tabela query-driven.

Append idempotente:

```sql
INSERT INTO events (stream_id, version, type, payload, metadata)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (stream_id, version) DO NOTHING
RETURNING global_seq;
```

0 rows retornadas = optimistic conflict. Reload events, recompute aggregate, retry command. Sempre attach `command_id` em `metadata` para dedup; retry sem idempotency key vira double-issue se command processou parcialmente. Falha após X tentativas → 409 ao client.

**Versioning — 5 estratégias**:

1. **Weak schema (additive only)**: novo campo opcional, consumers antigos ignoram. Cobre ~70% dos casos. Quebra quando shape muda.
2. **Upcast on read**: evento V1 lido, transformado para V2 em memória pelo aggregate. Stream NÃO mutado. Aggregate só conhece V2.
3. **Lazy migration**: background job re-escreve old events em stream paralelo V2. Cutover via feature flag. Custoso mas elimina upcast permanente.
4. **Multiple events per change**: deprecate `OrderConfirmedV1`, emite `OrderConfirmedV2` para writes novos. Consumers handlam ambos.
5. **Snapshot schema bump**: incrementar `schema_version` invalida snapshots; hydration força reload from events com upcasting.

Decision tree: event store < 1M events e migration cheap → lazy migration. Event store grande, breaking change → upcast on read. Hot path com muito throughput → multiple events.

**Snapshot pattern**:

```sql
CREATE TABLE snapshots (
  stream_id      UUID        PRIMARY KEY,
  version        INT         NOT NULL,
  schema_version INT         NOT NULL,
  payload        JSONB       NOT NULL,
  ts             TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Hydration de aggregate com 10k events é proibitivo. Snapshot a cada N=50–100 events:

```typescript
async function loadOrder(streamId: string): Promise<Order> {
  const snap = await db.oneOrNone(
    `SELECT version, schema_version, payload FROM snapshots WHERE stream_id = $1`,
    [streamId]
  );
  const fromVersion = snap && snap.schema_version === Order.SCHEMA_VERSION ? snap.version : 0;
  const events = await db.manyOrNone(
    `SELECT version, type, payload FROM events
     WHERE stream_id = $1 AND version > $2 ORDER BY version ASC`,
    [streamId, fromVersion]
  );
  const base = fromVersion > 0 ? Order.fromSnapshot(snap.payload) : Order.empty(streamId);
  return events.reduce((agg, e) => agg.apply(upcast(e)), base);
}
```

Snapshot é cache derivado, NUNCA source of truth. Consumer que lê snapshot está bug. Schema migration de aggregate sem bumping `schema_version` aplica V2 events em V1 state — silent corruption. Logística: `Order` com 200+ status events ao longo de delivery; snapshot a cada 50 reduz hydration de 200ms → 5ms.

**Projection rebuild sem downtime**:

```typescript
async function runProjection(name: string, handler: (e: Event) => Promise<void>) {
  let cursor = await getCursor(name); // 0 para greenfield
  while (true) {
    const batch = await db.manyOrNone(
      `SELECT * FROM events WHERE global_seq > $1 ORDER BY global_seq ASC LIMIT 1000`,
      [cursor]
    );
    if (batch.length === 0) { await sleep(100); continue; }
    for (const e of batch) await handler(e); // idempotent UPSERT
    cursor = batch[batch.length - 1].global_seq;
    await setCursor(name, cursor);
  }
}
```

Catch-up: consumer parte de `global_seq=0`, processa histórico até alcançar tip, segue realtime. Numbers reais: 10M events × ~1ms cada = ~3h single-threaded. Paraleliza shardando por `hash(stream_id) % N`. Cutover safe: nova projection roda em paralelo, compara reads com antiga, switch read traffic, drop antiga.

**Lag monitoring** (cruza com 04-02, outbox + idempotent consumer):

```sql
SELECT name, (SELECT MAX(global_seq) FROM events) - last_processed_seq AS lag
FROM projection_cursors;
```

SLO: lag p99 < 500ms healthy. Aggregate persist + outbox = TX atômica; consumer idempotente via UPSERT no projection table.

**Event design — 5 regras**:

- **Past tense + entity**: `OrderShipped`, nunca `ShipOrder`.
- **Immutable**: nunca mutar pós-write. Correção = compensating event (`OrderCancellationRequested`).
- **Self-contained**: payload tem tudo que consumer precisa. Sem lookup externo.
- **Bounded context naming**: `Sales.OrderPlaced` ≠ `Fulfillment.OrderPlaced` em microservices.
- **No domain coupling**: NÃO inclua FK para outro aggregate (race com consumer); inline data necessária como snapshot inline.

**Logística end-to-end**: `Order` aggregate emite `OrderPlaced`, `CourierAssigned`, `PickedUp`, `OutForDelivery`, `Delivered`, `CancellationRequested`, `Cancelled`. Snapshot a cada 50. Três projections: `orders_view` (lista por tenant), `dashboard_aggregate` (counts por status), `delivery_eta` (window de 24h para ML). Versioning real: `CourierAssignedV1` (`courier_id`) → `CourierAssignedV2` (adiciona `vehicle_type`); aggregate upcasta V1 inferindo `vehicle_type='unknown'`.

**Anti-patterns observados**:

1. Mutating events post-write (corrupting audit log).
2. Aggregate hydration sem snapshot em streams grandes (latency 200ms+ em hot read).
3. Snapshot sem `schema_version` (load aplica V2 events em V1 state).
4. Projection consumer sem idempotency (replay duplica reads).
5. Event payload com FK em vez de inline snapshot (race com outro aggregate).
6. Event nomeado com command verb (`ShipOrder` em vez de `OrderShipped`).
7. `ON CONFLICT DO NOTHING` sem retry loop (silent loss em concurrent write).
8. Consumer reads from snapshot (snapshot deriva de events, NÃO source of truth).
9. Schema evolution via mutate em events antigos (data loss; use upcast on read ou parallel stream).

Cruza com: `04-02` (outbox + idempotent consumer), `04-01` (logical clocks, ordering em multi-shard), `04-06` (DDD, aggregate + invariants), `02-09` (Postgres, event store schema + indexing), `04-13` (streaming, projection compute via Kafka Streams/Flink).

---

### 2.19 Outbox + Inbox + Saga production deep 2026

Atomic write to DB e publish to broker é o problema distribuído canônico. Sem 2PC (lento, frágil, indisponível em maioria dos brokers modernos), a única resposta production-grade é **transactional outbox**: business write e event row na mesma transação Postgres; relay process separado publica para o broker. Saga estende: processo multi-step sem 2PC, cada step com **compensating action** explícita. 2026 trouxe maturidade: Debezium 2.7+ estável para CDC outbox, Temporal 1.25+ TS SDK production, Restate 1.x como alternativa Rust mais leve, Inngest 3.x para times serverless-first.

#### Outbox implementation deep

Schema mínimo:

```sql
CREATE TABLE outbox (
  id           BIGSERIAL PRIMARY KEY,
  aggregate_id TEXT      NOT NULL,
  event_type   TEXT      NOT NULL,
  payload      JSONB     NOT NULL,
  headers      JSONB     NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);
CREATE INDEX outbox_unpublished_idx ON outbox (id) WHERE published_at IS NULL;
CREATE INDEX outbox_partition_idx   ON outbox (aggregate_id, id);
```

Business write + outbox no mesmo BEGIN:

```sql
BEGIN;
  UPDATE orders SET status = 'paid' WHERE id = $1;
  INSERT INTO outbox (aggregate_id, event_type, payload, headers)
  VALUES ($1, 'OrderPaid',
          jsonb_build_object('orderId', $1, 'amount', $2, 'paidAt', now()),
          jsonb_build_object('message_id', gen_random_uuid()::text,
                             'trace_id', $3));
COMMIT;
```

Atomicity garantida: se transação rollback, evento não existe; se commit, evento existe e será publicado. **Nunca** insira outbox em conexão/transação separada da business write — anula a invariante.

#### CDC outbox (Debezium / pgrecvlogical)

Debezium connector lê WAL via logical replication slot, transforma cada INSERT em outbox em evento Kafka. Latência ~100ms p99. Config (Debezium 2.7+):

```json
{
  "name": "logistica-outbox",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "plugin.name": "pgoutput",
    "slot.name": "logistica_outbox_slot",
    "publication.name": "logistica_outbox_pub",
    "table.include.list": "public.outbox",
    "transforms": "outbox",
    "transforms.outbox.type": "io.debezium.transforms.outbox.EventRouter",
    "transforms.outbox.route.by.field": "event_type",
    "transforms.outbox.table.field.event.key": "aggregate_id",
    "transforms.outbox.table.field.event.payload": "payload",
    "transforms.outbox.table.fields.additional.placement": "headers:header"
  }
}
```

Trade-offs CDC: latência baixa, sem worker para operar; **mas** replication slot precisa monitoring (`pg_replication_slots.confirmed_flush_lsn` lag); slot abandonado retém WAL → disco enche → DB trava. Set `wal_keep_size = 1GB` mínimo (5-10GB para resiliência), alerte em slot lag > 500MB.

#### Polling outbox

Worker simples, latência 500ms-5s, scale horizontal por partition:

```sql
-- Worker loop
BEGIN;
  SELECT id, aggregate_id, event_type, payload, headers
  FROM outbox
  WHERE published_at IS NULL
  ORDER BY id
  LIMIT 100
  FOR UPDATE SKIP LOCKED;
  -- publish each row to Kafka with key = aggregate_id (preserves ordering per aggregate)
  UPDATE outbox SET published_at = now() WHERE id = ANY($1::bigint[]);
COMMIT;
```

`SKIP LOCKED` permite N workers sem contenção. `LISTEN/NOTIFY` no commit reduz latência: worker bloqueia em `LISTEN outbox_new`, trigger after insert faz `NOTIFY outbox_new`. Sem LISTEN/NOTIFY, polling interval 200-500ms. Polling vence CDC quando: time não tem capacidade ops Debezium/Connect, throughput < 1k events/s, ou DB não pode habilitar logical replication.

#### Inbox pattern (consumer dedup)

Broker entrega at-least-once. Consumer precisa dedup. Tabela inbox no consumer:

```sql
CREATE TABLE inbox (
  message_id  TEXT PRIMARY KEY,
  topic       TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- TTL via partition drop ou vacuum job
CREATE INDEX inbox_processed_at_idx ON inbox (processed_at);
```

Handler:

```typescript
async function handle(msg: KafkaMessage) {
  const messageId = msg.headers.message_id;
  await pg.transaction(async (tx) => {
    const ins = await tx.query(
      `INSERT INTO inbox (message_id, topic) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING message_id`,
      [messageId, msg.topic]
    );
    if (ins.rowCount === 0) return; // already processed
    await applyBusinessEffect(tx, msg.payload);
  });
}
```

UNIQUE constraint em `message_id` é a invariante. TTL: 24-72h cobre janela de retry típica; jobs de vacuum diário evitam crescimento infinito.

#### Saga orchestrators 2026 — matriz

| Orchestrator | Stack / Maturidade | Forte em | Fraco em |
|---|---|---|---|
| **Temporal 1.25+** | Java/Go core, TS/Python/.NET SDKs, self-host ou Cloud | Workflows complexos longos (dias-meses), signals + queries, history replay | Setup pesado (Cassandra/Postgres + frontend + worker), curva |
| **Restate 1.x** | Rust core, JS/TS/Java/Kotlin SDKs (Q4 2024 estável) | RPC-style durable handlers, ops simples, latência baixa, virtual objects | Ecosistema novo, menos battle-tested em > 1M execuções/dia |
| **Inngest 3.x** | Hosted-first (self-host Q4 2024), JS/TS/Python/Go | DX altíssimo, step functions, flow control + concurrency limits, retries declarativos | Hosted = vendor; debug de step graph complexo |
| **AWS Step Functions** | JSON ASL, Standard + Express | Serverless puro, integração nativa AWS, observability | AWS lock-in, cost explosion em high-frequency (use Express, < 5min) |
| **Camunda 8 / Zeebe 8.7** | BPMN visual, Java-first | Workflows com stakeholder não-dev, auditoria regulatória | Heavy ops, BPMN learning curve |

#### Temporal — saga compensation

```typescript
// activities.ts
export async function chargePayment(orderId: string, amount: number): Promise<string> { /* ... */ }
export async function refundPayment(chargeId: string): Promise<void> { /* idempotent */ }
export async function reserveCourier(orderId: string): Promise<string> { /* ... */ }
export async function releaseCourier(reservationId: string): Promise<void> { /* idempotent */ }
export async function notifyCustomer(orderId: string, status: string): Promise<void> { /* ... */ }

// workflow.ts
import { proxyActivities, ActivityFailure } from '@temporalio/workflow';
const acts = proxyActivities<typeof activities>({
  startToCloseTimeout: '30s',
  retry: { initialInterval: '1s', backoffCoefficient: 2, maximumAttempts: 5 },
});

export async function fulfillOrderWorkflow(orderId: string, amount: number) {
  const compensations: Array<() => Promise<void>> = [];
  try {
    const chargeId = await acts.chargePayment(orderId, amount);
    compensations.unshift(() => acts.refundPayment(chargeId));

    const reservationId = await acts.reserveCourier(orderId);
    compensations.unshift(() => acts.releaseCourier(reservationId));

    await acts.notifyCustomer(orderId, 'fulfilled');
  } catch (err) {
    for (const comp of compensations) {
      await comp().catch((e) => { /* log; comp idempotente reentra */ });
    }
    await acts.notifyCustomer(orderId, 'failed');
    throw err;
  }
}
```

Workflow start latency Temporal ~50-100ms p99. **Crítico**: side effects (HTTP, DB write) só dentro de activity — workflow code é replayed deterministicamente; activity tem at-least-once semantics, então toda activity deve ser idempotente.

#### Restate — durable handler

```typescript
import { service, handlers } from '@restatedev/restate-sdk';

export const fulfillment = service({
  name: 'fulfillment',
  handlers: {
    fulfill: async (ctx, req: { orderId: string; amount: number }) => {
      const chargeId = await ctx.run('charge', () => chargePayment(req.orderId, req.amount));
      try {
        const resId = await ctx.run('reserve', () => reserveCourier(req.orderId));
        await ctx.run('notify', () => notifyCustomer(req.orderId, 'fulfilled'));
        return { chargeId, resId };
      } catch (e) {
        await ctx.run('refund', () => refundPayment(chargeId));
        await ctx.run('notify-fail', () => notifyCustomer(req.orderId, 'failed'));
        throw e;
      }
    },
  },
});
```

`ctx.run` persiste resultado; replay pula side effects já executados. Modelo mais próximo de "código normal + durabilidade", menos cerimônia que Temporal, mas ecosistema 2026 ainda maturando.

#### Inngest — flow control declarativo

```typescript
import { Inngest } from 'inngest';
const inngest = new Inngest({ id: 'logistica' });

export const fulfillOrder = inngest.createFunction(
  {
    id: 'fulfill-order',
    retries: 5,
    concurrency: { limit: 50, key: 'event.data.region' },
    rateLimit: { limit: 100, period: '1m' },
  },
  { event: 'order/paid' },
  async ({ event, step }) => {
    const charge = await step.run('charge', () => chargePayment(event.data.orderId, event.data.amount));
    try {
      const res = await step.run('reserve', () => reserveCourier(event.data.orderId));
      await step.sendEvent('notify', { name: 'order/fulfilled', data: { orderId: event.data.orderId } });
      return { charge, res };
    } catch (e) {
      await step.run('refund', () => refundPayment(charge));
      throw e;
    }
  },
);
```

#### Choreography vs Orchestration

- **Choreography**: cada serviço reage a eventos e emite eventos. Sem coordenador. Bom para 2-3 serviços; > 5-6 vira investigação forense (qual evento causou qual? onde travou?).
- **Orchestration**: state machine central (Temporal/Restate/Inngest/Step Functions) chama cada step e gerencia compensation. Debug e monitoring centralizados. Vence acima de 4 serviços ou quando regulatório exige rastreabilidade.

Regra: começou com choreography e tem 5+ serviços envolvidos no mesmo processo de negócio? Migre para orchestration.

#### Compensation patterns

- Toda step de saga tem compensation **idempotente** (chamada N vezes = mesmo efeito que 1).
- Compensation pode falhar; retry indefinido com backoff + alerta SRE em N tentativas.
- Mapear cenários de falha parcial: `[charge OK, reserve OK, notify FAIL]` → retry notify; `[charge OK, reserve FAIL]` → refund charge + notify failure.
- Compensation **não** desfaz mundo real (email enviado, courier despachado fisicamente); compensa via ação inversa (email de cancelamento, recall).

#### Stack Logística aplicada

- Postgres `outbox` table no `orders-service`; INSERT na mesma transação do `UPDATE orders SET status='paid'`.
- Debezium 2.7+ connector lê outbox via slot `logistica_outbox_slot`; publica em Kafka topic `orders.events`. Latência commit → Kafka ~150ms p99.
- `fulfillment-service` consome `orders.events`; inbox dedup table com TTL 24h via partition drop diário.
- Temporal workflow `fulfillOrderWorkflow`: activities `chargePayment` → `reserveCourier` → `notifyCustomer`; compensations `refundPayment`, `releaseCourier`, `notifyFailure`. Cada activity verifica idempotency_key na business table antes de side effect externo.
- DLQ: poison pill após 5 retries vai para topic `orders.events.dlq`; alerta SRE; manual replay via tool interno.

#### 10 anti-patterns

1. **Outbox INSERT em transação separada do business write** — perde atomicidade; surge orphan event ou business write sem evento.
2. **Polling sem `FOR UPDATE SKIP LOCKED`** — workers contendem na mesma row; throughput colapsa.
3. **CDC sem monitoring de replication slot** — slot retém WAL; disco enche; Postgres trava em writes.
4. **Side effect em workflow Temporal fora de activity** — workflow é replayed; HTTP call duplica a cada replay.
5. **Saga choreography com 8+ serviços** — debug impossível; orchestrate ou refatore o domínio.
6. **Compensation não-idempotente** — retry double-refunds, double-releases; cliente vê estorno duplicado.
7. **Inbox dedup table sem TTL/vacuum** — cresce infinitamente; lookups degradam; disco esgota.
8. **AWS Step Functions Standard para workflow < 1min, > 100/s** — billing por state transition explode (use Express).
9. **Restate em workload massive (1M+ exec/dia) sem benchmark próprio** — ecosistema novo, edge cases ainda emergindo.
10. **`message_id` gerado no consumer em vez de no producer** — dedup vira no-op (cada consumer gera id distinto para mesma mensagem reentregue).

Cruza com: `04-03` §2.4 (event sourcing), §2.7 (saga intro), §2.8 (outbox revisited), §2.13 (anti-corruption layer), §2.15 (outbox + idempotency consumer), §2.16 (saga design), §2.18 (event sourcing operacional), `04-02` §2.18 (idempotent consumer + dedup), §2.20 (Kafka 4.0 + share groups), `02-09` §2.13 (Postgres logical replication), `04-08` §2.21 (saga patterns deep — Temporal/Cadence), `04-13` §2.12 (CDC), `04-04` §2.30 (compensations + DR), `04-01` §2.21 (logical clocks for ordering).

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
   - Read model `orders_view` (tabela Postgres), atualizada por consumer de events.
   - Read model `dashboard_aggregate` (Postgres ou Redis), counts por tenant.
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

- Liga com **02-09** (Postgres): event store, MVCC pra concurrency.
- Liga com **02-12** (Mongo): poderia ser event store; trade-offs.
- Liga com **02-11** (Redis): read models cached; Streams como event log light.
- Liga com **03-07** (observability): tracing cross-event, lag.
- Liga com **04-01** (theory): ordering, consistency em projections.
- Liga com **04-02** (messaging): infra de broker.
- Liga com **04-04** (resilience): retries, idempotency, compensation.
- Liga com **04-06** (DDD): aggregate, bounded context, event storming.
- Liga com **04-07/04-08** (architecture): EDA modular vs microservices.

---

## 6. Referências

- **"Designing Event-Driven Systems"**: Ben Stopford (free Confluent).
- **"Event Sourcing"**: Martin Fowler ([martinfowler.com/eaaDev/EventSourcing.html](https://martinfowler.com/eaaDev/EventSourcing.html)).
- **"Microservices Patterns"**: Chris Richardson (sagas, CQRS, outbox).
- **"Implementing Domain-Driven Design"**: Vaughn Vernon.
- **"Versioning in an Event Sourced System"**: Greg Young (livro/posts).
- **Temporal docs** ([docs.temporal.io](https://docs.temporal.io/)).
- **Camunda docs**.
- **Vlingo, EventStoreDB** ([eventstore.com](https://www.eventstore.com/)).
- **Debezium docs** (CDC).
- **DDIA** capítulos 11 (stream processing).
