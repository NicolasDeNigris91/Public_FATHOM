---
module: 04-08
title: Services vs Monolith vs Serverless
stage: sistemas
prereqs: [04-06, 04-07]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 04-08 — Services vs Monolith vs Serverless

## 1. Problema de Engenharia

Decidir entre monolito, microservices e serverless é a decisão que mais frequentemente é tomada por **moda** em vez de necessidade. Em 2014, "microservices everywhere". Em 2020, "monolith first". Em 2026, "modular monolith + targeted services + edge functions". A verdade não muda: **arquitetura serve ao contexto** (time, domain, scale, ops capacity, business stage).

Este módulo é o framework de decisão. Quando dividir, quando juntar, e como reverter erro. Custo operacional real de cada modelo, não apenas o discurso de talks.

---

## 2. Teoria Hard

### 2.1 Monolith

1 deployable, 1 codebase, geralmente 1 DB.

Pros:
- Refactor cross-feature trivial (toolchain única).
- Transactions ACID dentro do app.
- Testing simples.
- Deploy 1 unidade.
- Latency entre componentes = function call.
- Operação simples: 1 binary, 1 logs stream, 1 dashboard.

Cons:
- Scale = scale tudo. Componente lento penaliza tudo.
- Single deploy: 1 mudança crítica afeta tudo.
- Tech stack uniforme; single language.
- Boundaries fáceis de violar.
- Conway's Law: 1 codebase pode dificultar múltiplos times working independent.

### 2.2 Modular Monolith

Monolith + module boundaries fortes:
- Bounded contexts isolados.
- Public API por module (sem cross-import direto).
- DB schemas separados ou shared com cuidado.
- Pode escalar horizontalmente (réplicas idênticas).

**Default em 2026 pra projetos médios.** Maioria das vantagens monolith + facilita future split.

### 2.3 Microservices

N services independentes:
- Cada um com codebase, deploy, DB próprio.
- Comunicam via API/events.
- Diferentes stacks possíveis.

Pros:
- Scale individual.
- Tech polyglot.
- Times autônomos (Conway's Law a favor).
- Falha contida (com resilience).
- Deploys independentes.

Cons:
- Operação custa: N CI/CD, N dashboards, N pagers.
- Distributed systems hard (consistency, transactions, debugging).
- Latency entre serviços (network).
- Testing E2E mais complexo.
- Schema evolution cross-service.
- Initial overhead enorme.

### 2.4 Serverless / FaaS

Function-as-a-Service. Lambda, Cloud Run, Cloudflare Workers.

Pros:
- Zero ops servidor.
- Pay-per-use.
- Auto-scale instantâneo (até limites).
- Edge deployment fácil.
- Cold start sub-ms (Wasm/Workers) ou 100ms-1s (Lambda Node).

Cons:
- Stateless: sem long-lived connection.
- Vendor lock-in (Lambda triggers, IAM, etc.).
- Debug harder.
- Limits (timeout, memory, concurrent).
- Cost imprevisível em volumes altos.
- Cold start em workloads infrequentes.

### 2.5 Decision matrix

| Critério | Monolith | Modular Mon | Microservices | Serverless |
|---|---|---|---|---|
| Time | 1-3 devs | 3-15 | 15+ | qualquer |
| Domain complexity | low-med | med-high | high | low-med |
| Traffic | low-med | med-high | high | spiky/low |
| Ops capacity | low | med | high | very low |
| Stack diversity | low | low | high | low-med |
| Latency budget | tight | tight | flexible | flexible |
| Vendor lock-in concern | low | low | low | high |

Use isso pra orientar conversa, não regra absoluta.

### 2.6 "Monolith first"

Sam Newman: comece monolith, extract services quando dor justifica.

Razões:
- Bounded contexts não estão claros early. Erra fronteiras → service hell.
- Operação custa imediato; valor microservice diferido.
- Refactor é mais barato em monolith.

Anti-padrão: greenfield com microservices "preparando pra escala". Você não tem usuário ainda.

### 2.7 Strangler Fig pattern

Refactor monolith → microservices:
1. Identifique bounded context candidato.
2. Adicione proxy na frente do monolith.
3. Implemente service novo paralelo.
4. Direcione tráfego pra novo via proxy gradualmente.
5. Quando 100%, remove código antigo.

Martin Fowler popularizou. Padrão pra migração segura.

### 2.8 Service granularity

"Microservice" não significa "tiny". Tamanho:
- 1 bounded context (DDD): geralmente certo.
- 1 team owns: bom proxy.
- 1 release cadence: serviço.

"Nanoservices" (1 endpoint por service) é anti-pattern: operação domina valor.

### 2.9 Database per service

Padrão microservices: each service owns DB próprio. Cross-service via API/events.

Pros: encapsulation, evolução independente.
Cons: cross-service queries impossíveis em SQL; reporting via materialized views ou data warehouse.

Em modular monolith: 1 DB com schemas separados pode trabalhar (Postgres schemas), mantendo isolation.

### 2.10 Distributed transactions: você não tem

Cross-service ACID = sagas (04-03). Não 2PC.

Trade-off: complexity exposta. Em monolith, transação local resolve.

Critério pra dividir: você tolera eventual consistency entre esses contexts? Se não, mantenha juntos.

### 2.11 Service mesh e platform engineering

Microservices em escala precisam:
- Service mesh (Istio, Linkerd, Cilium): mTLS, traffic, observability.
- Platform team: tooling, golden paths, paved roads.
- Service catalog (Backstage).
- Standardized observability.

Sem platform, microservices = chaos.

### 2.12 Serverless trade-offs concretos

Vince Vance: "serverless first" pra alguns workloads:
- Webhooks com tráfico irregular.
- Image processing on-demand.
- Cron jobs.
- Simple CRUD APIs com low traffic.

Anti-padrão: backend principal de SaaS sério em Lambda. Cold start, conn pool problems, cost em volume.

### 2.13 Edge functions

Variant serverless: roda em edge (Cloudflare Workers, Vercel Edge). Zero cold start (V8 isolates), distribuído globalmente.

Vence em:
- Auth pre-checks.
- A/B testing routing.
- Static API responses dinâmicas.
- Geo-personalization.

Limites: bundle 1MB+, sem long-lived state, sem Node APIs completas.

### 2.14 Event-driven escolha de arquitetura

EDA (04-03) é ortogonal a monolith vs microservices. Você pode ter:
- Monolith com in-process events.
- Microservices com Kafka entre.
- Hybrid: modular monolith + targeted services consuming events.

Domain events permitem extrair service depois sem mudar emissor.

### 2.15 Conway's Law

"Organizations design systems mirroring communication structures."

- 1 time = monolith natural.
- N times sem coordenação = N services.
- Inverse Conway maneuver: design org para arquitetura desejada.

### 2.16 Deploy strategies por modelo

- Monolith: rolling deploy. Canary se sofisticado.
- Microservices: cada service tem cadence. Coordination via versioning, contract testing.
- Serverless: deploy = upload. Versioning via aliases.

### 2.17 Cost reality

Operacional:
- Monolith small: $50-200/mo.
- Monolith médio (high traffic, RDS, Redis, CDN): $500-2000/mo.
- Microservices: K8s + ops + observability stack: $2000+/mo só de baseline.
- Serverless small: $0-50/mo.
- Serverless heavy: imprevisível; pode custar mais que ECS equivalente.

Em 2026, projetos pequenos NÃO devem fazer microservices.

### 2.18 Anti-patterns

- **Distributed monolith**: serviços que compartilham DB e devem deployar juntos. Pior dos dois mundos.
- **Chatty services**: 1 user request → 50 inter-service calls → latency e fragility.
- **Magic glue**: API Gateway com mil rules orchestrating microservices que deveriam orchestrar via events.
- **Service that doesn't own data**: read-only "service" que faz pass-through pro DB de outro. Vira API gateway zumbi.

### 2.19 Como decidir

Perguntas:
1. Time atual e expectativa próximos 12-24 meses?
2. Bounded contexts identificados?
3. SLO requirements e scale alvo?
4. Capacidade ops?
5. Latency budget aceitável de network entre componentes?
6. Tech stack uniformity vs diversity necessário?

Default: comece monolith modular. Extract services quando dor real (não imaginária) bate.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Pros e cons de monolith, modular monolith, microservices, serverless.
- Decision matrix com 4+ critérios.
- "Monolith first" raciocínio.
- Strangler fig pattern em 5 etapas.
- Service granularity heurísticas.
- Por que database-per-service é regra microservices.
- Anti-pattern distributed monolith.
- Conway's Law.
- 3 cenários onde serverless é certo, 3 onde é errado.
- Como decidir extract de bounded context pra service.

---

## 4. Desafio de Engenharia

**Decision document + 1 extraction real** no Logística.

### Especificação

1. **Decision Document — `ARCHITECTURE-DECISION.md`**:
   - Análise honesta: quantos devs hipotéticos? Tráfego alvo? Bounded contexts?
   - Decision matrix preenchido pra Logística.
   - Justificativa final: modular monolith principal + 2 extractions justificadas (Routing → Rust, Webhook ingestor → Go).
2. **Strangler Fig real**:
   - Webhook ingestor (Go, 03-11) já existe.
   - Coloque Caddy/Nginx ou Traefik na frente.
   - Roteia `/webhooks/*` pro Go service; resto pro monolith.
   - Demonstre traffic shifting via header (canary).
3. **Cross-service comm**:
   - Backend principal e Routing engine via gRPC ou HTTP.
   - Eventos via Kafka quando relevant.
   - Documente protocol e por que escolheu.
4. **Database boundaries**:
   - Monolith: 1 Postgres com schemas separados por bounded context (`order_management.orders`, `courier.couriers`, `billing.invoices`).
   - Routing: stateless (não precisa DB próprio; recebe data per request).
   - Webhook ingestor: schema `external_events` próprio, isolado.
5. **Serverless slice**:
   - 1 endpoint serverless (CloudFront Function ou Cloudflare Worker): `/v1/track/{token}` (status público read-only) servindo ETag/cache forte da edge.
   - Justifique: read-heavy global, cacheable, zero state.
6. **Deploy independence**:
   - Monolith deploy não requer Routing ou Webhook deploy.
   - Versionamento de protocolos cross-service (gRPC compat checks; OpenAPI compat checks).
7. **Failure containment**:
   - Routing offline → backend continua, retorna 503 só no endpoint que precisa Routing.
   - Webhook ingestor offline → eventos enfileirados em retry.
   - Demonstre.
8. **Cost analysis**:
   - Custo mensal estimado de cada componente.
   - Comparação com hipótese "tudo monolith" e "tudo microservices em K8s".

### Restrições

- Sem fragmentar mais do que justifica.
- Sem distributed monolith disfarçado.
- Sem extrair service que não corresponde a bounded context.

### Threshold

- README documenta:
  - ARCHITECTURE-DECISION.md completo.
  - Diagrama de componentes com deployment unit highlighted.
  - Demo strangler fig: traffic shifting via header.
  - Demo failure containment: kill 1 service, sistema degrada graciosamente.
  - 1 reflection: que erro de arquitetura você cometeu em projetos anteriores e o que aprendeu.

### Stretch

- Backstage (service catalog) instalado, com docs de cada service.
- Service mesh entre os 3 (Linkerd local) com mTLS demonstrado.
- BFF separado pra mobile vs web vs partner API.
- Migração reversa: extract algo, perceba que foi erro, rejoin (documente humildemente).

---

## 5. Extensões e Conexões

- Liga com **03-02-03-05** (containers, K8s, AWS): platforms suportando cada estilo.
- Liga com **03-03** (K8s): mesh em microservices.
- Liga com **04-01** (theory): consistência cross-service.
- Liga com **04-02** (messaging): cross-service comm.
- Liga com **04-04** (resilience): bulkhead, circuit breaker entre services.
- Liga com **04-06** (DDD): bounded context = candidato a service.
- Liga com **04-07** (architectures): style interno vs externa.
- Liga com **04-09** (scaling): scale horizontalmente cada deployable.
- Liga com **04-12** (tech leadership): Conway's law.

---

## 6. Referências

- **"Building Microservices"** — Sam Newman (2nd ed).
- **"Monolith to Microservices"** — Sam Newman.
- **"Microservices Patterns"** — Chris Richardson.
- **Martin Fowler, "Microservices"** ([martinfowler.com/microservices](https://martinfowler.com/microservices/)).
- **Martin Fowler, "Strangler Fig"** ([martinfowler.com/bliki/StranglerFigApplication.html](https://martinfowler.com/bliki/StranglerFigApplication.html)).
- **DDIA** capítulos sobre distributed systems.
- **"Team Topologies"** — Skelton, Pais (Conway's Law moderno).
- **"Software Architecture: The Hard Parts"** — Neal Ford et al.
- **AWS Well-Architected — Serverless Lens**.
- **Charity Majors blog** — operational reality.
