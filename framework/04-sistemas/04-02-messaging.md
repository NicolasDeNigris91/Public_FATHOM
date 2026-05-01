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
