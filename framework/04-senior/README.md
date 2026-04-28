# Estágio 4 — Senior (Arquitetura Distribuída & Trade-offs)

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

**Promessa de saída do Senior:** você consegue **desenhar e justificar** uma arquitetura distribuída pra um problema novo, prevendo trade-offs, modos de falha, custos operacionais. Você consegue mentorar pleitos. Você lê e escreve papers/RFCs.

---

## Ordem dos módulos (dependências)

| Ordem | ID | Módulo | Prereqs |
|-------|----|--------|---------|
| 1 | [S01](S01-distributed-systems-theory.md) | Distributed Systems Theory (CAP, PACELC) | Professional completo |
| 2 | [S02](S02-messaging.md) | Messaging (Kafka/RabbitMQ) | S01 |
| 3 | [S03](S03-event-driven-patterns.md) | Event-Driven Patterns (ES, CQRS, Saga, Outbox) | S02 |
| 4 | [S04](S04-resilience-patterns.md) | Resilience Patterns | S01 |
| 5 | [S05](S05-api-design.md) | API Design Avançado (REST/GraphQL/gRPC) | A08 |
| 6 | [S06](S06-domain-driven-design.md) | Domain-Driven Design | A08 |
| 7 | [S07](S07-architectures.md) | Arquiteturas (Hexagonal, Clean, Vertical Slice) | S06 |
| 8 | [S08](S08-services-monolith-serverless.md) | Services vs Monolith vs Serverless | S07, P05 |
| 9 | [S09](S09-scaling.md) | Scaling (sharding, replicação, multi-region) | S01, A09 |
| 10 | [S10](S10-ai-llm.md) | AI/LLM em Sistemas | S05, A09 |
| 11 | [S11](S11-web3.md) | Web3 / Blockchain | N04 (Merkle), P08 (security), N12 (crypto) |
| 12 | [S12](S12-tech-leadership.md) | Tech Leadership (RFC, ADR, mentoria) | (qualquer ponto avançado) |
| 13 | [S13](S13-streaming-batch-processing.md) | Streaming & Batch (Spark/Flink/dbt/Airflow/Lakehouse) | S02 |
| 14 | [S14](S14-formal-methods.md) | Formal Methods (TLA+, model checking) | S01 |
| 15 | [S15](S15-oss-maintainership.md) | Open Source Maintainership | S12 |
| 16 | [S16](S16-product-business-economics.md) | Product, Business & Unit Economics | S12 |

**Trilhas paralelas:**
- Núcleo distribuído: S01 → S02 → S03 → S04 → S09 → S13
- Design: S05 → S06 → S07 → S08
- Rigor: S14 (formal methods em paralelo com distribuído)
- Avançados: S10, S11, S12 (pode ser intercalado)
- Carreira/influência: S15 → S16 → ST05 (já no Staff)

S12 pode (e deve) ser estudado em paralelo desde o início do Senior — escrever RFCs e ADRs **enquanto** você aprende ajuda a internalizar. **S13-S16** alargam cobertura pra streaming, formal methods, OSS e business — gaps que separam Senior consolidado de Staff/Principal.

---

## Capstone do Senior

[CAPSTONE-senior.md](CAPSTONE-senior.md) — **Logística v3**: redesenhar a v2 como **sistema distribuído escalável**.

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

**Threshold:** simulação de carga sob falha demonstrada com gráficos + ADRs aprovados em code review architectural por peer Senior+ ou self-review estruturado com checklist do módulo.

---

## Postura recomendada para este estágio

- **Leia DDIA inteiro.** Não pule capítulos. Volte a ele toda decisão arquitetural.
- **Leia papers**: GFS, MapReduce, Dynamo, Raft, "Time, Clocks". Faça anotações Q&A.
- **Faça [Jepsen reads](https://jepsen.io/analyses)** — Aphyr destruindo DBs distribuídas. É como você aprende como sistemas falham de verdade.
- **Escreva RFCs e ADRs** desde o começo. Mesmo que pra você mesmo. A clareza de pensamento aparece quando você precisa escrever.
- **Pratique whiteboard interview.** Pegue um problema (ex: "design Twitter timeline"), dê 45min, desenhe arquitetura, defenda escolhas, identifique gargalos.
- **Comece a mentorar alguém em Apprentice/Professional.** Ensinar é onde você descobre o que ainda não entendeu.

---

## Sobre Railway no Senior

**Railway não suporta este estágio arquiteturalmente.** Sem K8s real exposto, sem multi-region, Kafka como single broker (não dá pra praticar partições de verdade).

**Estratégia obrigatória:**
- **Tudo local com Docker Compose ou kind multi-cluster** simulando regiões
- **Kafka cluster local** com 3 brokers via Compose
- **Postgres com sharding** simulado via 2-3 instâncias
- **Carga simulada local com k6** — sem precisar pagar provedor

Custo: $0. Aprendizado: máximo. Esse é o último estágio onde você fecha o framework.

---

## Próximo passo (depois do Senior)

Não há "Estágio 5". Depois do Senior, você está pronto pra **especializar** — Distributed Systems Engineer, Platform Engineer, Staff Engineer, Tech Lead, Founding Engineer. Ou começar suas próprias coisas. O framework te entregou as ferramentas; o que você constrói com elas é seu.
