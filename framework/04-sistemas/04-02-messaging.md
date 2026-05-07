---
module: 04-02
title: Messaging, Kafka, RabbitMQ, NATS, SQS
stage: sistemas
prereqs: [04-01]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 04-02, Messaging

## 1. Problema de Engenharia

Sistema síncrono escala até dor: latência cresce com cada hop, falha encadeia. Messaging desacopla. Mas escolher errado é caro: Kafka pra workload trivial vira sledgehammer; RabbitMQ pra event log de altíssima volume estrangula; SQS sem partições força workarounds. Cada broker tem semantics próprias, durability, ordering, delivery guarantees, ack model, e treats de operação distintos.

Este módulo dissecca os principais brokers (Kafka, RabbitMQ, NATS, SQS) com profundidade técnica: como armazenam, como replicam, como deliver, custos operacionais. Você sai sabendo escolher e operar.

---

## 2. Teoria Hard

### 2.1 Modelos básicos

- **Queue (point-to-point)**: 1 message → 1 consumer. RabbitMQ classic, SQS.
- **Topic (pub/sub)**: 1 message → N consumers. Kafka, NATS.
- **Hybrid**: consumer group em Kafka divide topic entre members; cada partition vai a 1 consumer do group. Mistura.

### 2.2 Kafka

LinkedIn 2011, Apache. Distributed log:

- **Topic**: log particionado.
- **Partition**: log append-only ordenado, replicated em N brokers.
- **Producer**: appends a partition (escolhendo via key hash ou round-robin).
- **Consumer Group**: consumers compartilhando offset; cada partition vai a 1 consumer; group rebalanceia em entrada/saída.
- **Offset**: posição em log; consumer commit pra DB próprio Kafka (`__consumer_offsets`).

**ZooKeeper-less** (KRaft mode, 3.3+, default 3.5+): Kafka usa Raft próprio em vez de ZK.

**Replication**:
- ISR (In-Sync Replicas): replicas que estão caught up.
- `acks=all` espera ISR todos.
- `min.insync.replicas`: garante mínimo de ISR ack pra writes serem durables.

**Retention**: dias, semanas, ou compactado (último valor por key, tipo "table"). Compaction permite Kafka como source of truth de state.

**Throughput**: clusters pequenos sustentam centenas de MB/s; grandes (LinkedIn) vão pra TB/s.

**Quando usar**:
- Event log persistente (event sourcing, CDC, analytics).
- Stream processing (Kafka Streams, Flink).
- Throughput muito alto.
- Múltiplos consumers independentes lendo mesma data.

**Quando não**:
- Tarefas simples request/reply.
- Filas pequenas com poucos consumers.
- Times sem expertise (Kafka é não-trivial pra operar).

### 2.3 Kafka exactly-once semantics

EOS via:
- Idempotent producer (sequence number per partition).
- Transactions: producer + consumer + offset commit em transação atômica.
- "Read-process-write" pattern.

Mesmo assim, "EOS" requer acordos consumer-side (idempotente em sink). Sempre verifique.

### 2.4 RabbitMQ

AMQP-based, 2007. Mais flexível em routing.

- **Exchanges**: tipos direct, topic, fanout, headers. Routing baseado em rules.
- **Queues**: FIFO, com bindings a exchanges via routing keys.
- **Bindings**: regras "exchange X manda pra queue Y se key match Z".

**Acks**: consumer confirma processamento; sem ack, message volta a queue (após disconnect ou requeue manual).

**DLQ** (Dead Letter Queue): messages com falha repetida ou TTL expirado vão pra outra queue.

**Mirroring / Quorum Queues**: replication. Quorum queues (3.8+) usam Raft, mais robustas.

**Throughput**: dezenas-centenas de milhares msgs/s. Não sustent multi-MB/s sustained como Kafka.

**Quando usar**:
- Routing rico (headers, topic patterns).
- Tasks com prioridade.
- Workflows onde mensagens são consumidas e descartadas.
- Time confortável com AMQP.

**Quando não**:
- Throughput máximo.
- Replay/event sourcing (RabbitMQ não é log).
- Múltiplos consumers independentes lendo mesma data.

### 2.5 NATS

Lightweight, fast, simples. Pub/sub puro, request/reply, opcionalmente JetStream pra durability.

- **Core NATS**: efêmero. Sub não vê messages anteriores. Latency ultra-baixa.
- **JetStream**: persistence layer. Streams, consumers (push/pull), retention policies. Compete com Kafka em casos pequenos-médios.

**Subjects**: hierárquicos (`orders.created`, `orders.>`). Wildcards.

**Throughput**: alto (hundreds of MB/s+ em clusters pequenos).

**Quando usar**:
- Microservices communication com baixa latência.
- IoT, edge.
- Quando ops simples > features ricas.

### 2.6 AWS SQS

Managed queue service.

- **Standard**: at-least-once, sem ordering garantido. Throughput ilimitado.
- **FIFO**: ordering por message group id, exactly-once com dedup window 5 min, throughput limitado (3k/s com batching).

**Visibility Timeout**: ao receive, message ficou invisible por T; se processada e deleted, OK; senão, volta visible.

**DLQ**: configura Redrive Policy.

**Quando usar**:
- AWS-native, ops zero.
- Tasks decoupled.
- Spike absorption.

**Quando não**:
- Pub/sub pra múltiplos consumers (use SNS+SQS fanout).
- Ordering global (FIFO é por group, não global).
- Retention longa (max 14 dias).

### 2.7 Outros, Pulsar, Redpanda, NATS JetStream deep

Em 2025-2026 esses três viraram alternativas sérias a Kafka pra cenários específicos. Vale conhecer pra escolher consciente.

#### Apache Pulsar

Arquitetura **separada de storage e serving**: brokers stateless, **BookKeeper** (Apache) é o storage layer (segments). Brokers podem cair sem perder dados.

- **Multi-tenancy first-class**: tenants → namespaces → topics. Quotas, isolation, separação real.
- **Geo-replication built-in**: replicação cross-region como configuração, não DIY.
- **Tiered storage**: dados antigos vão pra 04-03/GCS automatically. Reduz custo storage drasticamente.
- **Functions**: serverless inside Pulsar, process events sem deploy externo (similar a Kafka Streams mas in-process no broker).
- **Kafka API compatibility**: Pulsar oferece KoP (Kafka-on-Pulsar), clients Kafka conectam direto.

**Quando vale Pulsar:**
- Setup multi-tenant pesado (B2B SaaS multi-customer com isolation real).
- Workload com retenção longa que ficaria caro em Kafka (tiered storage).
- Times que valorizam separação storage/compute pra elasticidade.

**Trade-off:**
- Mais peças (brokers + bookies + ZK ou OxiaCoord). Operação mais complexa que Kafka single-component.
- Comunidade menor; vendor lock-in com StreamNative/DataStax pra hosting maduro.

#### Redpanda

**Kafka-compatible** binary-único em **C++**. Sem JVM, sem ZooKeeper, sem KRaft. Implementação from-scratch do protocolo Kafka.

- **Latência muito menor**: sub-ms p99 vs Kafka ~5-50ms. Atinge 10x throughput em mesmo hardware em vários benchmarks (mantidos pela própria Redpanda, verificar com cuidado, mas tendência é real).
- **Single binary**: deploy trivial. SystemD service ou container. Sem 50 JVM flags.
- **Tiered storage** com 04-03.
- **Schema Registry compatível** integrado.

**Quando vale Redpanda:**
- Latência crítica (financial trading, real-time bidding, gaming).
- Times que adoraram Kafka API mas operam Kafka mal, custo operacional cai.
- Edge / on-prem com hardware limitado (sem JVM ajuda).

**Trade-off:**
- Source available license (Business Source License), não é open source pure. Free pra uso comum, restricted em certos casos comerciais. Ler license.
- Ecossistema (Kafka Connect, ksqlDB) funciona mas com asterisks. Verificar caso a caso.
- Vendor (Redpanda Data) é único. Comunidade de contribuição menor que Kafka.

#### NATS JetStream

NATS Core é pub/sub efêmero ultra-rápido. **JetStream** (2021+) adiciona persistence, streams + consumers + retention.

- **Streams**: subject filter, retention policy (limits, work queue, interest-based), replication (RAFT entre N nodes).
- **Consumers**: durable ou ephemeral, push ou pull, com ack semantics (none, all, explicit).
- **Subject hierarchy**: `orders.>` consome todo subtree. Padrão poderoso pra event taxonomy.
- **Geo-replication**: leaf nodes + super-cluster pra topology multi-region nativa.
- **Key-Value e Object Store** built-in (em cima de streams).

**Quando vale NATS JetStream:**
- Setup small-to-medium (pra throughput muito alto, Kafka domina).
- Dev experience prioridade, `nats-server` single binary, CLI excelente, latência sub-ms.
- Microservices internal communication onde você não precisa retention longa nem replay massivo.
- Edge / IoT, leaf nodes funcionam disconnected e sync quando reconectam.
- Serverless, consumir mensagem é HTTP-like simples, não precisa client lib heavy Kafka.

**Trade-off:**
- Throughput max menor que Kafka tunado (Kafka dedicado top-tier ainda vence em pure ingest >1M msg/s).
- Ferramental third-party menor. Connect-style integrations existem mas não são tão maduros.

#### Tabela de decisão

| Caso | Escolha 1 | Escolha 2 | Por quê |
|---|---|---|---|
| High-throughput pipeline (>500k msg/s sustentado) | Kafka | Redpanda | Ecossistema vs latency |
| Multi-tenant SaaS B2B com isolation | Pulsar | Kafka + custom | Multi-tenancy nativa |
| Microservices internos, latency-sensitive | NATS JetStream | Redpanda | Simplicidade / DX |
| AWS-native, ops zero | SQS / Kinesis | EventBridge | Managed |
| Event sourcing com long retention barata | Pulsar (tiered) | Kafka + tiered | Tiered storage built-in |
| IoT/edge | NATS | MQTT brokers | Leaf nodes, footprint baixo |
| Você já tem time com expertise Kafka | Kafka | Redpanda | Reusar conhecimento |

#### Outros menos comuns

- **Redis Streams** (vimos em 02-11): light, mas dataset cabe em RAM.
- **Google Pub/Sub**: managed. Push or pull. Generous limits.
- **Azure Event Hubs / Service Bus**.
- **EventBridge** (AWS): event bus + rules; serverless.

### 2.8 Ordering guarantees

- **Kafka**: ordering dentro de partition; cross-partition não.
- **RabbitMQ**: ordering por queue; consumer concurrency >1 quebra ordering.
- **NATS Core**: best-effort.
- **NATS JetStream**: ordering por consumer.
- **SQS Standard**: nenhum.
- **SQS FIFO**: por message group.

Implicação: ordenação **global** entre eventos é raro (e caro). Ordene **dentro de uma chave** (orderId, userId).

### 2.9 Delivery guarantees

Como em 04-01: at-most, at-least, "exactly-once processing".

- **At-most-once**: producer manda fire-and-forget; sem retry. Aceito em metrics.
- **At-least-once**: producer retries; consumer dedup. Padrão pra business events.
- **Exactly-once processing**: at-least + idempotency consumer-side.

Kafka transactions ajudam, mas você ainda precisa idempotência.

### 2.10 Backpressure

Producer rápido + consumer lento = build-up.

Kafka: log retention; older messages descartadas conforme política.
RabbitMQ: queue cresce; max-length policy ou quorum queue overflow.
SQS: dequeue rate limit; messages ficam até 14 dias.

App-level: respeitar lag; alertar; scale consumer; throttle producer.

### 2.11 Schema management

Eventos sem schema versioned → consumers quebram quando producer evolui.

- **Schema Registry** (Confluent, Apicurio): schemas versionados, compatibilidade verificada (backward, forward, full).
- **Avro / Protobuf**: tipos formais. Avro popular no Kafka.
- **JSON Schema** + lib enforcement.
- **CloudEvents**: spec CNCF pra envelope event-padrão.

Sem schema, eventos viram contrato implícito frágil.

### 2.12 Outbox pattern (visão de transporte)

Problema clássico: app escreve em DB + emite evento. Se app crashar entre os dois, inconsistency.

Solução resumida: na mesma transação DB, escreva em tabela `outbox`. Worker separado lê e publica no broker. CDC (Debezium lendo Postgres logical replication slot) é a alternativa zero-touch pelo lado da aplicação.

Aqui interessa o **lado messaging**: garantia de **at-least-once** end-to-end exige outbox + idempotência no consumer (§2.10). Sem outbox, "publish após commit" perde eventos em crash; "publish antes do commit" emite eventos fantasma.

Padrão completo (semantics, falhas, projeções, integração com saga) é dono de **04-03 §2.8**. Aqui é só o gancho com broker.

### 2.13 Consumer scaling

Kafka: max consumers em group = partitions. Pra mais paralelismo, mais partitions (cuidado com over-partition).

RabbitMQ: múltiplos consumers em mesma queue dividem messages (round-robin).

SQS: muitos consumers concorrem.

Workers idle vs busy: monitore lag (Kafka) ou queue depth (RabbitMQ/SQS).

### 2.14 DLQ e poison messages

Mensagem que sempre falha bloqueia consumer ou repete forever. DLQ separa pra investigação humana.

- Retry com backoff (em-queue ou via delayed queues).
- Após N retries, manda pra DLQ.
- Monitor DLQ; alerta se cresce.

### 2.15 Operação Kafka

- **Partitions**: sizing, cada partition é arquivo no disk; muitas partitions = file descriptor pressure.
- **Brokers**: 3+ pra HA. Disk IOPS importa.
- **Compaction**: pra topics como state log.
- **Retention**: storage cost.
- **Monitoring**: lag, ISR, broker leaders, throughput.
- **Upgrades**: rolling, com Inter-Broker Protocol version.

Operar Kafka self-managed é trabalho. Use Confluent Cloud, MSK, Aiven, Redpanda Cloud.

### 2.16 Quando NÃO usar broker

Tudo broker tem custo de:
- Latency adicional.
- Operational overhead.
- Schema evolution discipline.
- Debugging complexity (event flow rastreado em N hops).

Em sistemas onde acoplamento síncrono é OK (1-3 services, latency budget tight), HTTP direto vence.

### 2.17 Eventual consistency em apps

Eventos significam: "logo, o sistema vai estar coerente". UX precisa lidar com:
- Delays (segundos a minutos).
- Out-of-order arrival (handle).
- Duplicates.

Read-your-writes UX pattern: após escrita, mostra optimistic UI imediato; backend confirma async.

### 2.18 Idempotent consumer + deduplication strategies — message ID tracking, inbox pattern, exactly-once

"Exactly-once delivery" não existe em sistemas distribuídos (FLP impossibility). O que existe é "at-least-once delivery + idempotent consumer = effectively exactly-once". Sem idempotência, retry de broker (RabbitMQ requeue, Kafka rebalance, SQS visibility timeout) processa mesma mensagem 2x → cobrança duplicada, email duplicado, estoque negativo. Esta seção entrega 4 strategies em código pra Logística + decision tree.

**Foundation: por que retries acontecem**:
- **Network**: ack do consumer perde antes de chegar no broker. Broker reentrega.
- **Crash**: consumer processa, antes do ack crasha. Broker reentrega.
- **Rebalance**: Kafka rebalance move partition mid-batch; novo owner reprocessa offsets não-committados.
- **Visibility timeout**: SQS visibility timeout expira durante processamento longo; outro worker recebe.
- **Manual replay**: dev replays de DLQ pra debug; production consumer também recebe.

**Strategy 1: Idempotency table (canonical)**:

```sql
CREATE TABLE processed_messages (
  message_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  result JSONB
);

CREATE INDEX ON processed_messages (processed_at);   -- pra cleanup
```

```typescript
async function handleMessage(msg: Message) {
  await db.transaction(async (tx) => {
    const existing = await tx.processedMessages.findFirst({
      where: { messageId: msg.id },
    });
    if (existing) {
      log.info({ msgId: msg.id }, 'duplicate, skipping');
      return existing.result;
    }

    const result = await processOrderEvent(msg.payload, tx);

    await tx.processedMessages.insert({
      messageId: msg.id,
      result,
    });
    return result;
  });
}
```

- Mesma transação atomica: idempotency record + side effect. Crash entre eles = retry pega "not processed" e reprocessa.
- **Cleanup**: `DELETE FROM processed_messages WHERE processed_at < now() - INTERVAL '30 days'` em cron. Sem cleanup, table cresce infinito.
- **Pegadinha**: side effect EXTERNO (call API, send email) NÃO é transactional com DB. Ver Strategy 4.

**Strategy 2: Natural idempotency via UPSERT/conditional update**:

```typescript
// Para messages cujo state é absorvable
async function handleStatusChange(msg: { orderId: string; toStatus: string; eventTime: number }) {
  // UPSERT com condição: só atualiza se evento é mais recente
  await db.execute(sql`
    UPDATE orders
    SET status = ${msg.toStatus},
        status_updated_at = to_timestamp(${msg.eventTime})
    WHERE id = ${msg.orderId}
      AND status_updated_at < to_timestamp(${msg.eventTime})
  `);
}
```

- Não precisa idempotency table — operação em si é idempotente.
- Funciona pra: status updates (LWW), counter increments (com event_id check), set membership.
- NÃO funciona pra: side effects (email), transactional debit/credit (use Strategy 1 ou 3).

**Strategy 3: Inbox pattern (transactional dedup + handoff)**:

```sql
-- Inbox table: receives messages, decoupled from processing
CREATE TABLE inbox (
  message_id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT
);

CREATE INDEX ON inbox (processed_at) WHERE processed_at IS NULL;
```

```typescript
// Receiver: insert atomic; commit ack só após insert ok
async function receiveMessage(msg: Message) {
  try {
    await db.inbox.insert({
      messageId: msg.id,
      payload: msg.payload,
    });
    await msg.ack();
  } catch (err) {
    if (isUniqueViolation(err)) {
      await msg.ack();   // duplicate; já temos
      return;
    }
    await msg.nack();
  }
}

// Processor: separate worker, FOR UPDATE SKIP LOCKED
async function processInbox() {
  while (true) {
    const rows = await db.execute(sql`
      SELECT message_id, payload FROM inbox
      WHERE processed_at IS NULL
      ORDER BY received_at
      LIMIT 10
      FOR UPDATE SKIP LOCKED
    `);

    for (const row of rows) {
      try {
        await handlePayload(row.payload);
        await db.inbox.update(row.messageId, {
          processedAt: new Date(),
        });
      } catch (err) {
        await db.inbox.update(row.messageId, {
          attempts: sql`attempts + 1`,
          lastError: String(err),
        });
      }
    }
    await sleep(100);
  }
}
```

- **Vantagem**: receiver e processor desacoplados. Receiver é fast (só INSERT). Processor pode ter retry policy independente.
- **`FOR UPDATE SKIP LOCKED`**: 10 workers paralelos sem step on each other.
- Combina com Outbox no producer (cruza com 04-03 §2.8) pra exactly-once via dual-write evitado.

**Strategy 4: External side effect com saga compensação**:

```typescript
async function handlePaymentEvent(msg: PaymentEvent) {
  return db.transaction(async (tx) => {
    const existing = await tx.processedMessages.findFirst({
      where: { messageId: msg.id },
    });
    if (existing) return existing.result;

    // Step 1: idempotent external call com idempotency key
    const charge = await stripe.paymentIntents.create({
      amount: msg.amount,
      currency: 'brl',
      customer: msg.customerId,
    }, {
      idempotencyKey: msg.id,    // Stripe garante: 2x mesma key = mesma resposta
    });

    // Step 2: persist + record processed atomic
    await tx.payments.insert({ orderId: msg.orderId, stripeId: charge.id });
    await tx.processedMessages.insert({
      messageId: msg.id,
      result: { stripeId: charge.id },
    });

    return { stripeId: charge.id };
  });
}
```

- **Idempotency key obrigatória** em todas APIs externas que fazem state change (Stripe, Twilio, Shippo, payment gateways). Reuse `msg.id` ou hash determinístico de payload.
- Sem isso, retry executa side effect 2x; cobra cliente 2x.

**Decision tree**:

| Cenário | Strategy |
|---|---|
| State update (status, counter, set) | Strategy 2 (UPSERT condicional) |
| Side effect interno (DB write only) | Strategy 1 (idempotency table) |
| Receiver overwhelmed por processing time | Strategy 3 (inbox pattern, fast ack) |
| External API com state change | Strategy 4 (idempotency key + Strategy 1) |
| Multiple consumers competing | Strategy 1 + Strategy 3 com FOR UPDATE SKIP LOCKED |

**DLQ + poison messages handling**:

```typescript
const MAX_ATTEMPTS = 5;

async function processWithRetry(msg: Message) {
  try {
    await handleMessage(msg);
    await msg.ack();
  } catch (err) {
    const attempts = (msg.headers['x-attempts'] as number) ?? 0;

    if (attempts >= MAX_ATTEMPTS) {
      await sendToDLQ(msg, err);
      await msg.ack();   // ack original; DLQ é separate queue
      alertOps({ msgId: msg.id, err, attempts });
      return;
    }

    await msg.nack({
      requeue: true,
      headers: { ...msg.headers, 'x-attempts': attempts + 1 },
    });
  }
}
```

- DLQ retém pra inspeção manual; não processa automatico.
- Replay de DLQ tem que assumir mensagem PODE ter sido parcialmente processada (Strategy 1 protege).
- Alert critical em entry pra DLQ; investigation prioritária.

**Logística — Order Outbox + Inbox end-to-end**:

```
API Order Service:
  POST /orders → DB transaction:
    INSERT orders (...)
    INSERT outbox (event_type='OrderCreated', payload, message_id=uuid())

Outbox Relay (Debezium/polling):
  SELECT FROM outbox WHERE published=false → publish to Kafka → mark published

Notification Service Consumer (Kafka):
  Receive msg → Strategy 3 (inbox) → ack Kafka
  Worker reads inbox (FOR UPDATE SKIP LOCKED):
    Strategy 4 → call Twilio with idempotencyKey=message_id → mark processed
```

**Anti-patterns observados**:
- **Trust em "exactly-once" do broker**: Kafka, NATS JetStream marketing diz "exactly-once" mas é escopo limitado (within Kafka ↔ Kafka via transactions). Cross-system NÃO. Idempotência sempre.
- **Ack ANTES de processar**: perde mensagem em crash. Ack DEPOIS de commit.
- **Idempotency check FORA de transação**: race window. Check + insert atomic na mesma transaction.
- **Sem cleanup de processed_messages**: table cresce infinito; lookup degrada.
- **DLQ sem alert**: poison messages acumulam silenciosamente; descobre 6 meses depois.
- **Reprocessar DLQ sem assumir partial processing**: pode duplicar side effect.
- **`message_id` derivado de timestamp**: 2 mensagens em mesmo ms colidem. Use UUID v7 (timestamp-prefixed) ou ULID.
- **External call sem idempotency key**: 2x Stripe charge.

Cruza com **04-02 §2.14** (DLQ foundation), **04-03 §2.8** (outbox pattern producer-side), **04-04 §2.4** (idempotency em retry geral), **04-09 §2.20** (backpressure em consumer), **04-13 §2.16** (exactly-once semantics em pipelines analíticos).

### 2.19 Kafka Streams + ksqlDB practical (windowing, joins, exactly-once, state stores)

Versions: Kafka 3.7+, Kafka Streams 3.7+, ksqlDB 0.29+ (Confluent Platform). Apache Flink é alternativa para workloads que excedem JVM single-process (stateful aggregations >100GB, complex CEP).

**Quando usar stream processing (vs simple consumer)**:

- **Simple consumer**: reage a evento → side effect (DB write, API call). Stateless ou estado externo.
- **Stream processing**: reage + transforma + agrega (windowed counts, joins, enrichment) com estado local materializado.
- **Use cases Logística**: real-time dashboard (orders/min per tenant), fraud detection (suspicious courier patterns), enrichment (join order events com courier profile), alerting (courier offline > 10min).

**Kafka Streams architecture**:

- **Library** (NÃO cluster separado): roda dentro do JVM consumer; deploy como serviço regular (K8s deployment).
- **Topology**: DAG de operações (`source → filter → groupBy → aggregate → sink`).
- **State stores**: RocksDB-backed local key-value (joins, aggregations); replicados via changelog topics em Kafka.
- **Tasks**: unidade de paralelismo (1 task por input partition); auto-scale adicionando consumers no mesmo `application.id`.
- **EOS v2**: `processing.guarantee=exactly_once_v2` (Kafka 2.5+, recomendado em 3.7+).

**Stream vs KTable mental model**:

- **KStream**: append-only event stream; cada evento independente ("OrderPlaced").
- **KTable**: changelog → estado corrente por key; latest value per key. Conceitualmente = `SELECT key, last(value) GROUP BY key`.
- **GlobalKTable**: replicada em todas instâncias (joins sem co-partitioning); apenas para reference data pequeno (<1GB).

**Windowing fundamentals**:

- **Tumbling** (fixo, non-overlapping): `TimeWindows.of(Duration.ofMinutes(5))` → 0–5min, 5–10min.
- **Hopping** (fixo, overlapping): `TimeWindows.of(Duration.ofMinutes(5)).advanceBy(Duration.ofMinutes(1))` → janelas de 5min deslizando 1min.
- **Session** (gap-based): `SessionWindows.with(Duration.ofMinutes(30))` → agrupa eventos dentro de 30min entre si.
- **Sliding**: evento dispara inclusão na janela (CEP-style).
- Sempre configurar `grace(Duration.ofMinutes(5))` para tolerar late events sem drop silencioso.

**Pattern Logística — orders/min per tenant (windowed count)**:

```java
StreamsBuilder builder = new StreamsBuilder();

KStream<String, OrderEvent> orders = builder.stream("orders.events");

KTable<Windowed<String>, Long> ordersPerMinute = orders
  .filter((k, v) -> v.getType().equals("OrderPlaced"))
  .map((k, v) -> KeyValue.pair(v.getTenantId(), v))
  .groupByKey()
  .windowedBy(TimeWindows.of(Duration.ofMinutes(1)).grace(Duration.ofMinutes(5)))
  .count(Materialized.as("orders-per-minute-store"));

ordersPerMinute.toStream()
  .map((wk, count) -> KeyValue.pair(
    wk.key() + "_" + wk.window().start(),
    new MetricEvent(wk.key(), wk.window().start(), count)
  ))
  .to("dashboard.orders-per-minute");
```

**Stream-Stream join (windowed)** — order placed + courier assigned dentro de 5min:

```java
KStream<String, OrderEvent> orders = builder.stream("orders.events");
KStream<String, AssignmentEvent> assigns = builder.stream("assignments.events");

orders
  .selectKey((k, v) -> v.getOrderId())
  .join(
    assigns.selectKey((k, v) -> v.getOrderId()),
    (order, assign) -> new EnrichedOrder(order, assign),
    JoinWindows.of(Duration.ofMinutes(5)).grace(Duration.ofMinutes(1))
  )
  .to("orders.enriched");
```

Co-partitioning obrigatório: ambos topics com mesmo número de partitions e mesma partitioning strategy (key hash). Mismatch → silent data loss.

**Stream-KTable join (always-on enrichment)** — courier profile mutável:

```java
KTable<String, CourierProfile> couriers = builder.table("couriers.state");

orders
  .selectKey((k, v) -> v.getCourierId())
  .join(couriers, (order, profile) -> new OrderWithCourier(order, profile))
  .to("orders.with-courier");
```

KTable lookup é local (RocksDB); zero network hop. Updates em `couriers.state` propagam via changelog.

**ksqlDB — SQL on streams**: high-level abstraction sobre Kafka Streams; SQL-like syntax para streaming queries. `CREATE STREAM` (event log) vs `CREATE TABLE` (compacted, latest-per-key).

```sql
CREATE STREAM orders_stream (
  order_id VARCHAR KEY,
  tenant_id VARCHAR,
  status VARCHAR,
  price_cents BIGINT,
  created_at TIMESTAMP
) WITH (KAFKA_TOPIC='orders.events', VALUE_FORMAT='JSON');

CREATE TABLE tenant_revenue_per_hour AS
  SELECT tenant_id,
    WINDOWSTART AS hour,
    SUM(price_cents) AS revenue_cents,
    COUNT(*) AS order_count
  FROM orders_stream
  WINDOW TUMBLING (SIZE 1 HOUR, GRACE PERIOD 5 MINUTES)
  WHERE status = 'delivered'
  GROUP BY tenant_id
  EMIT CHANGES;
```

**EMIT CHANGES** (push, contínuo) vs **EMIT FINAL** (apenas quando window fecha; menos data, mais latência). Pull queries (`SELECT * FROM tenant_revenue_per_hour WHERE tenant_id='X'`) vs push queries (`EMIT CHANGES`): pull queries têm latency 50–200ms, evitar em hot path.

**Exactly-once em Kafka Streams (EOS v2)**:

- Configuração: `processing.guarantee=exactly_once_v2` no `StreamsConfig`.
- Mecanismo: transactional producer + consumer offset commit na mesma transaction (atomicity Kafka-internal).
- Custo: 5–10% throughput overhead; latency +20–50ms por commit (commit interval default 100ms).
- **Pegadinha**: side effects FORA do Kafka (HTTP calls, DB writes em sistema externo) NÃO são exactly-once. Combina com idempotent consumer (§2.18) para end-to-end correctness.

**Logística applied stack**:

- **Source topics**: `orders.events`, `assignments.events`, `tracking.pings`, `couriers.state` (compacted).
- **Streams app** (Java, 3 replicas em K8s):
  - `tenant_revenue_per_minute` (windowed agg).
  - `enriched_orders` (stream-KTable join com courier profile).
  - `late_delivery_alerts` (filter ETA exceeded → alert topic).
- **ksqlDB**: ad-hoc analytical queries pelo ops team; queries materializadas reutilizadas pelo dashboard.
- **Output topics** consumidos por dashboard service (real-time UI via WebSocket) + alert service (PagerDuty integration).
- **Cost**: 1 topic × 12 partitions × 7d retention; 3-node Kafka cluster ~$300/mês; Streams app on K8s ~3 replicas $150/mês; ksqlDB server $100/mês.

**Anti-patterns observados**:

- **Stream processing em workload simples**: overengineered; consumer + DB write resolve. Adote Streams quando agregação/join estiverem no caminho.
- **Stream-Stream join sem window**: unbounded state; OOM em horas.
- **State store sem changelog**: rebuild from scratch em rebalance; downtime de minutos a horas.
- **EOS v2 ativo mas side effects HTTP não idempotentes**: ainda double-effect external. Cruza com §2.18.
- **ksqlDB pull queries em hot path**: latency 50–200ms; pre-materialize via `EMIT CHANGES` + serve from materialized view.
- **Tumbling window aligned to wall clock**: Sunday midnight = batch effects; use event time + watermarks.
- **Co-partitioning ignorado em Stream-Stream join**: silent data loss; partitions não alinham → eventos perdidos.
- **GlobalKTable para large reference data**: replicada em todas instâncias; memory blowup. >1GB use KTable + co-partitioning.
- **Late events sem grace period**: out-of-order events dropados; configure `windowedBy(...).grace(Duration.ofMinutes(5))`.
- **Single-instance Streams app**: zero HA; failover via re-deploy (minutos). Deploy ≥ 2 replicas com `num.standby.replicas=1`.

Cruza com **04-13** (streaming/batch, dbt + lakehouse alternative), **04-02 §2.18** (idempotent consumer para side effects externos), **03-13** (analytics DBs, ksqlDB pull queries vs ClickHouse), **04-09** (scaling, Kafka Streams horizontal via partitions), **04-04** (resilience, EOS v2 transactional guarantees).

---

### 2.20 Kafka 4.0 + NATS JetStream + RabbitMQ Streams 2026 — KRaft GA, Tiered Storage, Share Groups, Super Streams

O landscape de brokers mudou estruturalmente entre 2024 e 2026. **Kafka 4.0** (Q1 2025) marcou KRaft GA e remoção definitiva do ZooKeeper (KIP-833), trouxe **share groups** (KIP-932) que adicionam consumo queue-like ao Kafka — competindo direto com RabbitMQ em cenários transacionais — e Tiered Storage GA (KIP-405) que separa hot data (SSD broker) de cold data (S3/GCS), reduzindo TCO 60–80% em tópicos com retenção >7d. **NATS JetStream 2.10+** (Q1 2024, estável em 2.10.20+ Q3 2025) consolidou KV bucket e ObjectStore como primitivas first-class, viabilizando NATS como stack único pra core messaging + state. **RabbitMQ 4.0** (Q3 2024) removeu mirrored queues (deprecated desde 3.8), tornou **quorum queues** (Raft-based) o default e introduziu **Streams 4 super streams** (partitioned streams) — RabbitMQ deixou de ser só broker AMQP pra competir em event log. Escolher broker em 2026 sem entender essas mudanças é decidir com mapa de 2020.

#### Kafka 4.0 — KRaft GA + queues + tiered storage

**KRaft cluster** (controller.quorum.voters) — sem ZooKeeper:

```properties
# server.properties (Kafka 4.0 — KRaft mode, combined controller+broker)
process.roles=broker,controller
node.id=1
controller.quorum.voters=1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093
listeners=PLAINTEXT://:9092,CONTROLLER://:9093
inter.broker.listener.name=PLAINTEXT
controller.listener.names=CONTROLLER
log.dirs=/var/kafka-logs

# Tiered Storage (KIP-405 GA Kafka 4.0)
remote.log.storage.system.enable=true
remote.log.storage.manager.class.name=org.apache.kafka.server.log.remote.storage.S3RemoteStorageManager
remote.log.storage.manager.impl.prefix=rsm.config.
rsm.config.s3.bucket.name=fathom-kafka-tier
rsm.config.s3.region=sa-east-1

# Per-topic: hot 24h local, cold S3 até 90d
# kafka-configs.sh --alter --topic order_events \
#   --add-config remote.storage.enable=true,local.retention.ms=86400000,retention.ms=7776000000
```

KRaft cluster sobe ~5x mais rápido que ZooKeeper-backed (controller election em <500ms vs 2–5s). Mínimo 3 controllers pra quorum (tolera 1 falha); 5 pra tolerar 2.

**Share groups (KIP-932)** — queue-like consumption, per-message ack, sem partition affinity:

```java
// Kafka 4.0 — Share consumer (queue semantics, alternativa ao RabbitMQ)
Properties props = new Properties();
props.put("bootstrap.servers", "kafka:9092");
props.put("group.id", "courier-assignment-share-group");
props.put("group.type", "share"); // KIP-932
props.put("share.acknowledgement.mode", "explicit");

try (KafkaShareConsumer<String, String> consumer = new KafkaShareConsumer<>(props)) {
    consumer.subscribe(List.of("courier_assignment"));
    while (true) {
        ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
        for (ConsumerRecord<String, String> r : records) {
            try {
                processAssignment(r.value());
                consumer.acknowledge(r, AcknowledgeType.ACCEPT); // ack individual
            } catch (TransientException e) {
                consumer.acknowledge(r, AcknowledgeType.RELEASE); // requeue
            } catch (PoisonException e) {
                consumer.acknowledge(r, AcknowledgeType.REJECT); // DLQ
            }
        }
        consumer.commitSync();
    }
}
```

Diferença consumer group vs share group: **consumer group** = ordering per-partition, throughput limitado por #partitions, rebalance custoso; **share group** = round-robin per message, ack individual, scaling sem reparticionamento, MAS sem ordering global. Use share group pra task queues (assignment, billing, notifications); consumer group pra event sourcing + ordering per-aggregate.

**Tiered Storage economics** — exemplo Stack Logística: tópico `order_events`, 50k msg/s × 1KB = 50MB/s × 86400s × 90d = ~388TB. SSD broker a USD 0.10/GB/mês = USD 38.8k/mês. Tiered (24h local + 89d S3 Standard a USD 0.023/GB/mês): SSD ~432GB = USD 43 + S3 ~387TB = USD 8.9k. Total USD 8.95k vs USD 38.8k — **77% economia**. ATENÇÃO: S3 GET/PUT custa em high-throughput re-reads (consumer lag, replay); calcule USD 0.0004/1k GET (S3 Standard) × volume de fetch antes de migrar.

#### NATS JetStream 2.10+ — KV + ObjectStore production

```typescript
// NATS JetStream 2.10 — stream + Pull consumer (Node.js)
import { connect, AckPolicy, DeliverPolicy } from 'nats';

const nc = await connect({ servers: 'nats://nats:4222' });
const jsm = await nc.jetstreamManager();

await jsm.streams.add({
  name: 'ORDERS',
  subjects: ['order.>'],
  retention: 'limits',
  max_age: 7 * 24 * 3600 * 1_000_000_000, // 7d em ns
  storage: 'file',
  num_replicas: 3,
});

await jsm.consumers.add('ORDERS', {
  durable_name: 'fulfillment-worker',
  ack_policy: AckPolicy.Explicit, // NUNCA None em produção
  ack_wait: 30 * 1_000_000_000,    // 30s redelivery
  max_ack_pending: 1000,
  filter_subject: 'order.created',
  deliver_policy: DeliverPolicy.All,
});

const js = nc.jetstream();
const consumer = await js.consumers.get('ORDERS', 'fulfillment-worker');
const msgs = await consumer.consume({ max_messages: 100 });

for await (const m of msgs) {
  try {
    await processOrder(JSON.parse(m.string()));
    m.ack();
  } catch (e) {
    m.nak(5_000); // retry em 5s
  }
}

// KV bucket — Redis-like com replay e watch
const kvm = await js.views.kv('courier_presence', { history: 5, ttl: 60_000 });
await kvm.put('courier:42', JSON.stringify({ lat: -23.5, lng: -46.6, ts: Date.now() }));
const entry = await kvm.get('courier:42');

// ObjectStore — S3-compat embedded
const os = await js.views.os('order_attachments');
await os.put({ name: 'invoice-123.pdf' }, fileStream);
```

**Pull vs Push consumers**: Pull (consumer.consume) = back-pressure natural, recomendado >1k msg/s; Push = broker empurra, simples mas overflow risk em consumer lento. Em 2026 sempre Pull pra workloads sérios. **AckPolicy.None** = fire-and-forget (logs, metrics); **All** = ack acumulativo (batch processing); **Explicit** = ack individual (default pra business logic).

#### RabbitMQ 4.0 — quorum queues + super streams

```bash
# Quorum queue (Raft-based, replaces mirrored queues)
rabbitmqadmin declare queue name=billing.tasks \
  durable=true arguments='{"x-queue-type":"quorum","x-quorum-initial-group-size":3,"x-dead-letter-exchange":"dlx.billing"}'

# Super stream (partitioned stream — RabbitMQ Streams 4)
rabbitmq-streams add_super_stream order_events \
  --partitions 6 \
  --binding-keys "BR-SP,BR-RJ,BR-MG,BR-RS,BR-PR,BR-BA"
```

```typescript
// RabbitMQ Streams 4 — super stream producer + Single Active Consumer
import { connect } from 'rabbitmq-stream-js-client';

const client = await connect({ hostname: 'rabbit', port: 5552, username: 'admin', password: '...' });
const producer = await client.declareSuperStreamPublisher(
  { superStream: 'order_events' },
  (order) => order.region, // routing key → partition
);
await producer.send(Buffer.from(JSON.stringify({ id: 'o1', region: 'BR-SP', total: 99.9 })));

// Single Active Consumer — só 1 consumer ativo por partition (failover automático)
const consumer = await client.declareSuperStreamConsumer({
  superStream: 'order_events',
  consumerRef: 'fulfillment-sac',
  singleActive: true,
  offset: Offset.first(),
}, async (msg) => {
  await processOrder(JSON.parse(msg.content.toString()));
});
```

Mirrored queues **foram removidas** em 4.0 — migration obrigatória pra quorum (`rabbitmq-diagnostics check_if_any_deprecated_features_are_used`). Quorum queues custam ~30% mais latência que classic mas dão durability real (Raft replication, no message loss em network partition).

#### Decision matrix 2026

| Workload | Broker | Por quê |
|---|---|---|
| Event sourcing + CDC + analytics pipeline | **Kafka 4.0 KRaft** | Tiered storage barato, EOS v2, Streams/ksqlDB ecosystem |
| Task queue (notifications, billing, jobs) | **Kafka share groups** OU **RabbitMQ quorum** | Share groups se já tem Kafka; RabbitMQ se precisa AMQP routing complexo |
| IoT / edge / low-latency RPC + KV | **NATS JetStream 2.10** | <1ms latency, KV embedded, leaf nodes pra edge |
| Legacy AMQP 0.9.1 partner integrations | **RabbitMQ** | Único com AMQP 0.9 maduro, exchanges (direct/topic/headers/fanout) |
| Multi-tenant SaaS com isolation | **Pulsar** OU **NATS accounts** | Pulsar tenants/namespaces; NATS accounts isolam credentials |

#### Stack Logística aplicada

- **Kafka 4.0 KRaft + Tiered Storage**: `order_events` (90d retention, hot 24h SSD + cold S3), `delivery_telemetry` (30d), `payment_events` (7y compliance — tier 99% em S3 Glacier IR)
- **Kafka share group**: `courier_assignment_queue` (round-robin assignment, ack individual, sem ordering)
- **NATS JetStream KV**: `courier_presence` (TTL 60s, watch pra dashboard real-time), `cart_state` (session)
- **NATS JetStream stream**: `device_telemetry` (IoT scanners, 1M msg/s peak, leaf node em CD)
- **RabbitMQ 4.0 quorum queue**: integração com partner ERPs legados via AMQP 0.9.1 (NF-e, EDI)

#### Anti-patterns

- **ZooKeeper-backed cluster em greenfield 2026**: Kafka 3.3+ deprecated ZK; 4.0 removeu. Migre via KIP-866 (rolling) ou greenfield direto KRaft.
- **Tiered Storage sem cost analysis**: S3 GET cost (USD 0.0004/1k) × replay/lag pode superar economia. Modele worst-case (full topic re-read) antes.
- **Share groups onde precisa ordering per-key**: share group faz round-robin global, perde ordering. Use consumer group + partition key.
- **NATS Push consumer em high-throughput**: consumer lento overflow; sempre Pull (consume API) acima de 1k msg/s.
- **NATS AckPolicy.None em business logic**: mensagens perdidas silenciosamente. None só pra metrics/logs descartáveis.
- **RabbitMQ classic mirrored queue em 4.0**: foi removido; cluster não sobe. Migre pra quorum antes do upgrade (`rabbitmqctl list_queues type`).
- **KRaft com 1 controller**: zero quorum, downtime garantido em falha. Mínimo 3, ideal 5 em produção multi-AZ.
- **Single-region tiered storage**: S3 cross-region GET cost surpresa (USD 0.02/GB) se broker em us-east-1 e bucket em sa-east-1. Co-localize.
- **Super stream sem routing key estável**: rebalanceia partitions, perde Single Active Consumer affinity. Routing key = atributo imutável (region, tenant_id).
- **MaxAckPending=0 (unlimited) no NATS**: consumer trava memória até OOM em redelivery storm. Sempre limite (1k–10k típico).

Cruza com **04-02 §2.2-§2.5** (broker intros), **04-02 §2.7** (Pulsar/Redpanda/NATS deep), **04-02 §2.13** (consumer scaling), **04-02 §2.15** (operação Kafka), **04-02 §2.18** (idempotent consumer), **04-02 §2.19** (Kafka Streams + ksqlDB), **04-13 §2.2** (streaming engines consume), **04-13 §2.20** (Iceberg sink), **03-05** (AWS MSK + S3 tiered), **04-09 §2.4** (sharding via partitions), **04-04 §2.30** (multi-region MirrorMaker).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Diferenciar Kafka, RabbitMQ, NATS, SQS em modelo, ordering, retention.
- Justificar Kafka vs RabbitMQ pra 3 cenários.
- Explicar Kafka partition + consumer group e implicação em paralelismo.
- ISR e `acks=all` e `min.insync.replicas` impacto em durability.
- Outbox pattern: porquê e como.
- DLQ e tratamento de poison messages.
- Schema registry e por que vale.
- Sagas com choreography vs orchestration.
- Eventual consistency e UX patterns pra acomodar.
- Quando você NÃO deve introduzir broker.

---

## 4. Desafio de Engenharia

Adicionar **camada de eventos** ao Logística com Kafka (ou Redpanda) + outbox + CDC.

### Especificação

1. **Setup**:
   - Redpanda local (single-binary Kafka-compat) ou Kafka via Strimzi em K8s.
   - Schema Registry (Confluent ou Apicurio).
   - Avro ou Protobuf schemas.
2. **Domain events**:
   - Topic `orders.events` (compacted? ou retention timed): `OrderCreated`, `OrderAssigned`, `OrderStatusChanged`, `OrderDelivered`.
   - Topic `couriers.events`: `CourierLocationUpdated`, `CourierStatusChanged`.
   - Schemas versionados, compatibility forward.
3. **Outbox pattern**:
   - Tabela `outbox_events` em Postgres.
   - Endpoint `POST /orders` escreve `orders` + `outbox_events` na mesma transação.
   - Worker (Go ou Node) lê outbox, publica em Kafka, marca processed.
   - Garanta at-least-once, idempotency consumer-side.
4. **CDC alternativa**:
   - Configure Debezium consumindo logical replication slot do Postgres.
   - Tabela `orders` mudanças viram events.
   - Compare com outbox: qual escolheu como primário e por quê.
5. **Consumers**:
   - **Notification service** (Node): consumes `OrderStatusChanged` → push pra cliente via SSE/WS.
   - **Analytics service** (Go ou Node): consumes events → escreve em ClickHouse ou Postgres analytical schema.
   - **Webhook fanout**: para tenants com webhook configurado, consumer envia HTTP outbound (idempotency key).
6. **Saga**:
   - Saga "AssignOrderToCourier": reserve courier → bill platform fee → notify courier.
   - Choreography: cada serviço reage a event próprio.
   - 1 step com falha simulada → compensations rodam (release courier, void fee).
7. **Schema evolution**:
   - Adicione campo opcional em schema; demonstre que consumers antigos continuam funcionando.
   - Tente breaking change; verifique que registry rejeita.
8. **Operação**:
   - Métricas de lag por consumer group.
   - Alerta em lag > threshold.
   - DLQ pra messages que falham N vezes.

### Restrições

- Sem usar broker como "DB substitute"; Postgres ainda é fonte de verdade pra orders.
- Sem global ordering cross-tenant (ordene por orderId).
- Sem eventos sem schema versioned.

### Threshold

- README documenta:
  - Diagrama: producers, broker, consumers.
  - Decisão outbox vs CDC.
  - 1 caso saga com compensation rodando.
  - Schema evolution scenario passando + breaking sendo rejeitado.
  - Lag observado em load test e como reagiu (consumer scaled? Manual?).
  - Eventual consistency UX: tempo médio do click "create" até cliente ver no SSE.

### Stretch

- ksqlDB ou Flink: stream processing real (calcular agregados em janela).
- Multi-tenant em Kafka: como? Topic per tenant? Header? Trade-offs.
- Migração: trocar Redpanda por Kafka real, comparar ops.
- NATS JetStream alternativo: mesmo cenário com NATS, contraste.
- Replay: re-process events em consumer grupo new pra reconstruir read model do zero.

---

## 5. Extensões e Conexões

- Liga com **02-11** (Redis): Streams como light alternative.
- Liga com **02-12** (Mongo): Change Streams como CDC light.
- Liga com **03-03** (K8s): Strimzi Operator pra Kafka.
- Liga com **03-05** (AWS): MSK, Kinesis, EventBridge.
- Liga com **03-07** (observability): consumer lag como SLO.
- Liga com **04-01** (theory): consensus em controllers, ISR, ordering.
- Liga com **04-03** (event-driven): patterns sobre essa fundação.
- Liga com **04-04** (resilience): retry, DLQ, circuit breakers ao consumer.
- Liga com **04-08** (services): broker é veículo de microservices comm.

---

## 6. Referências

- **"Kafka: The Definitive Guide"**: Narkhede, Shapira, Palino.
- **Confluent docs** ([docs.confluent.io](https://docs.confluent.io/)).
- **Redpanda docs** ([docs.redpanda.com](https://docs.redpanda.com/)).
- **RabbitMQ docs** ([rabbitmq.com/docs](https://www.rabbitmq.com/docs)).
- **NATS docs** ([docs.nats.io](https://docs.nats.io/)).
- **Debezium docs** ([debezium.io](https://debezium.io/)).
- **CloudEvents spec** ([cloudevents.io](https://cloudevents.io/)).
- **"Microservices Patterns"**: Chris Richardson (sagas, CQRS).
- **"Designing Event-Driven Systems"**: Ben Stopford (Confluent ebook).
- **DDIA** capítulos 11 (stream processing).
