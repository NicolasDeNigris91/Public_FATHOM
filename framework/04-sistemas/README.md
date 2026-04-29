# Estágio 4 — Sistemas (Arquitetura Distribuída & Trade-offs)

## Por que esse estágio existe

Senior não é "Pleno com mais experiência". Senior é **outra forma de pensar**. É a transição de **construir o sistema** pra **decidir como o sistema deve ser construído**.

Aqui você aprende:
- A teoria que sustenta tudo: **CAP, PACELC, consistency models, fallacies of distributed computing**
- **Mensageria** (Kafka, RabbitMQ) — entendendo trade-offs, não só APIs
- **Patterns event-driven** (Event Sourcing, CQRS, Saga, Outbox, Idempotência)
- **Patterns de resiliência** (rate limiting, circuit breakers, bulkheads, retries com jitter)
- **API design avançado** (REST maduro, GraphQL federation, gRPC)
- **DDD** (bounded contexts, aggregates, ubiquitous language)
- **Arquiteturas** (hexagonal, clean, vertical slice, modular monolith)
- **Microserviços vs monólito vs serverless** — quando, por quê, quais custos reais
- **Escala** (sharding, replicação, multi-region)
- **AI/LLM em sistemas de produção** (RAG, embeddings, vector DBs, custo de tokens)
- **Web3** (Ethereum, smart contracts, segurança Web3)
- **Liderança técnica** (RFC, ADR, code review, mentoria, career frameworks)

**Promessa de saída:** você consegue **desenhar e justificar** uma arquitetura distribuída pra um problema novo, prevendo trade-offs, modos de falha, custos operacionais. Você consegue mentorar pleitos. Você lê e escreve papers/RFCs.

---

## Ordem dos módulos (dependências)

| Ordem | ID | Módulo | Prereqs |
|-------|----|--------|---------|
| 1 | [04-01](04-01-distributed-systems-theory.md) | Distributed Systems Theory (CAP, PACELC) | estágio 3 completo |
| 2 | [04-02](04-02-messaging.md) | Messaging (Kafka/RabbitMQ) | 04-01 |
| 3 | [04-03](04-03-event-driven-patterns.md) | Event-Driven Patterns (ES, CQRS, Saga, Outbox) | 04-02 |
| 4 | [04-04](04-04-resilience-patterns.md) | Resilience Patterns | 04-01 |
| 5 | [04-05](04-05-api-design.md) | API Design Avançado (REST/GraphQL/gRPC) | 02-08 |
| 6 | [04-06](04-06-domain-driven-design.md) | Domain-Driven Design | 02-08 |
| 7 | [04-07](04-07-architectures.md) | Arquiteturas (Hexagonal, Clean, Vertical Slice) | 04-06 |
| 8 | [04-08](04-08-services-monolith-serverless.md) | Services vs Monolith vs Serverless | 04-07, 03-05 |
| 9 | [04-09](04-09-scaling.md) | Scaling (sharding, replicação, multi-region) | 04-01, 02-09 |
| 10 | [04-10](04-10-ai-llm.md) | AI/LLM em Sistemas | 04-05, 02-09 |
| 11 | [04-11](04-11-web3.md) | Web3 / Blockchain | 01-04 (Merkle), 03-08 (security), 01-12 (crypto) |
| 12 | [04-12](04-12-tech-leadership.md) | Tech Leadership (RFC, ADR, mentoria) | (qualquer ponto avançado) |
| 13 | [04-13](04-13-streaming-batch-processing.md) | Streaming & Batch (Spark/Flink/dbt/Airflow/Lakehouse) | 04-02 |
| 14 | [04-14](04-14-formal-methods.md) | Formal Methods (TLA+, model checking) | 04-01 |
| 15 | [04-15](04-15-oss-maintainership.md) | Open Source Maintainership | 04-12 |
| 16 | [04-16](04-16-product-business-economics.md) | Product, Business & Unit Economics | 04-12 |

**Trilhas paralelas:**
- Núcleo distribuído: 04-01 → 04-02 → 04-03 → 04-04 → 04-09 → 04-13
- Design: 04-05 → 04-06 → 04-07 → 04-08
- Rigor: 04-14 (formal methods em paralelo com distribuído)
- Avançados: 04-10, 04-11, 04-12 (pode ser intercalado)
- Carreira/influência: 04-15 → 04-16 → 05-05 (já no estágio 5)

04-12 pode (e deve) ser estudado em paralelo desde o início desse estágio — escrever RFCs e ADRs **enquanto** você aprende ajuda a internalizar. **04-13-04-16** alargam cobertura pra streaming, formal methods, OSS e business — gaps que cobrem o que falta pra Amplitude.

---

## Capstone do estágio 4

[CAPSTONE-sistemas.md](CAPSTONE-sistemas.md) — **Logística v3**: redesenhar a v2 como **sistema distribuído escalável**.

Entregas obrigatórias:
- **Bounded contexts** explícitos: Pedidos, Entregas, Pagamentos, Tracking, Identidade
- Cada bounded context vira **microserviço** (ou módulo no monolito modular — sua decisão, com ADR)
- **Mensageria Kafka** entre serviços (eventos: `OrderCreated`, `DeliveryAssigned`, `OrderDelivered`)
- **CQRS + Event Sourcing** no contexto de Pedidos (write side: stream de eventos; read side: projeções otimizadas)
- **Sharding** de Postgres por região geográfica (regiões = shards)
- **Multi-region read replicas**
- **Rate limiting** (token bucket) por tenant
- **Circuit breakers** com fallback nos calls inter-service
- **ADR escrito** pra cada decisão arquitetural (mínimo 8 ADRs)
- **Carga simulada** com `k6`: cenários de baseline, spike, kill broker, kill shard, latência alta — relatório de comportamento

**Opcionais (alta alavancagem):**
- **RAG pra suporte ao cliente**: embeddings dos eventos do pedido em pgvector, perguntas como "onde está meu pedido?" respondidas via LLM com contexto recuperado
- **Smart contract** pra liquidação de pagamento entre lojistas e entregadores em rede de teste (Sepolia/Goerli)

**Threshold:** simulação de carga sob falha demonstrada com gráficos + ADRs aprovados em code review architectural por peer experiente ou self-review estruturado com checklist do módulo.

---

## Postura recomendada para este estágio

- **Leia DDIA inteiro.** Não pule capítulos. Volte a ele toda decisão arquitetural.
- **Leia papers**: GFS, MapReduce, Dynamo, Raft, "Time, Clocks". Faça anotações Q&A.
- **Faça [Jepsen reads](https://jepsen.io/analyses)** — Aphyr destruindo DBs distribuídas. É como você aprende como sistemas falham de verdade.
- **Escreva RFCs e ADRs** desde o começo. Mesmo que pra você mesmo. A clareza de pensamento aparece quando você precisa escrever.
- **Pratique whiteboard interview.** Pegue um problema (ex: "design Twitter timeline"), dê 45min, desenhe arquitetura, defenda escolhas, identifique gargalos.
- **Comece a mentorar alguém em Plataforma/Produção.** Ensinar é onde você descobre o que ainda não entendeu.

---

## Sobre Railway nesse estágio

**Railway não suporta este estágio arquiteturalmente.** Sem K8s real exposto, sem multi-region, Kafka como single broker (não dá pra praticar partições de verdade).

**Estratégia obrigatória:**
- **Tudo local com Docker Compose ou kind multi-cluster** simulando regiões
- **Kafka cluster local** com 3 brokers via Compose
- **Postgres com sharding** simulado via 2-3 instâncias
- **Carga simulada local com k6** — sem precisar pagar provedor

Custo: $0. Aprendizado: máximo.

---

## Próximo passo

Estágio 5 (Amplitude) cobre especialização declarada, output público, mentoria, papers e business — dimensões que código sozinho não ensina. Ou você pode parar aqui e ir direto **especializar** — Distributed Systems, Platform, Tech Lead, Founding Engineer — ou começar suas próprias coisas.
