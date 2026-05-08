---
module: 04-07
title: Architectures, Hexagonal, Clean, Onion, Vertical Slices
stage: sistemas
prereqs: [04-06]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
quiz:
  - q: "Qual é a Dependency Rule fundamental em Clean Architecture?"
    options:
      - "Toda dependência deve ser injetada via container"
      - "Dependências apontam para dentro: inner layer (entities) nunca importa outer (frameworks/DB/UI)"
      - "Domain pode importar infrastructure se necessário"
      - "Use cases dependem diretamente do framework HTTP"
    correct: 1
    explanation: "Dependency Rule: deps fluem do exterior pro interior. Entities (núcleo) e Use Cases não conhecem DB/HTTP. Inversão via interfaces (ports) permite testes sem infra e troca de adapters."
  - q: "Quando vertical slices vencem horizontal layers?"
    options:
      - "Em CRUD trivial sem regras de negócio"
      - "Quando mudanças por feature são frequentes e atravessam várias camadas; cada slice é coeso e isolado"
      - "Apenas em projetos .NET com MediatR"
      - "Sempre que há mais de 3 desenvolvedores"
    correct: 1
    explanation: "Vertical slices organizam por feature (CreateOrder/, AssignCourier/), evitando shared model que pune evolução. Mudança por feature toca 1 pasta. CQRS encaixa naturalmente. Trade-off: leve duplicação entre slices similares."
  - q: "Qual sintoma indica que um modular monolith está pronto para ser dividido em serviços?"
    options:
      - "O time decidiu seguir tendência da indústria"
      - "Build > 10min, conflitos de PR semanais, deploy assustador, time evita refactor por medo"
      - "O codebase passou de 10k linhas"
      - "Há mais de uma função em src/"
    correct: 1
    explanation: "Sinais reais: cycle time alto, conflitos crônicos, medo de deploy, refactor evitado. Sem esses sinais, modular monolith ainda é ROI superior. Microservices prematuro impõe overhead distribuído sem ganho."
  - q: "Por que adicionar 7 camadas em um endpoint GET /products é considerado anti-pattern?"
    options:
      - "Lentidão em runtime"
      - "Overhead de mapping em CRUD trivial sem regras complexas; over-engineering pragmático"
      - "Clean Architecture proíbe explicitamente"
      - "Quebra dependency inversion"
    correct: 1
    explanation: "Hexagonal/Clean valem quando há domain core complexo. CRUD simples (`SELECT *` + JSON) com 7 layers (DTO → Controller → UseCase → Entity → Repository → ORM → DB) é puro overhead. Pragmatic: short-circuit em casos simples."
  - q: "Em modular monolith production, qual o papel das ferramentas de boundary enforcement (eslint-plugin-boundaries, dep-cruiser, ts-arch)?"
    options:
      - "Documentação opcional do projeto"
      - "Bloquear PR em CI quando módulos importam internals de outros, prevenindo drift e habilitando split futuro"
      - "Substituir testes unitários"
      - "Gerar OpenAPI automaticamente"
    correct: 1
    explanation: "Boundary enforcement automatizado em CI gate impede que módulos vazem internals (compila mas drifta). Sem isso, modular monolith degrada lentamente em ball of mud, e split futuro em microservices vira impossível."
---

# 04-07, Architectures

## 1. Problema de Engenharia

"Clean Architecture" virou desculpa pra adicionar 4 camadas de mapeamento entre HTTP e DB pra fazer um CRUD. Times leem Uncle Bob, copiam diagrama de cebola, e entregam codebase com 30% mais código sem maior maintainability. Outros vão pro extremo oposto: tudo no controller, lógica grudada em ORM models, refactor é remendo. Nenhum dos dois é resposta default.

Este módulo é arquitetura de aplicação com sobriedade: hexagonal/ports-adapters, clean architecture, onion, vertical slices, MVC tradicional, transaction script. Quando cada um vence, quando custa mais que entrega. Você sai sabendo decidir baseado em contexto, não em fé.

---

## 2. Teoria Hard

### 2.1 Spectrum de complexidade arquitetural

Do mais simples ao mais elaborado:
1. **Transaction Script** (Fowler): handler executa lógica direto, talk-to-DB. Trivial, ok pra CRUD.
2. **Active Record**: model = row + behavior. Rails-style. Simples, acopla DB e domínio.
3. **MVC tradicional**: Model + View + Controller. Web frameworks default.
4. **Service Layer**: lógica em services entre controller e data. Reduz fat controllers.
5. **Hexagonal / Ports-Adapters**: domain inner, adapters fora.
6. **Clean / Onion**: layers concêntricas, dependências apontam pra dentro.
7. **DDD tactical**: aggregates, repos, domain events.
8. **Vertical Slices**: feature como unit, atravessa camadas verticalmente.

Não existe "melhor". Existe ajuste a domínio + time + maturity.

### 2.2 Hexagonal (Ports and Adapters)

Alistair Cockburn, ~2005. Inverte dependência:
- **Domain core** no centro, sem deps externas.
- **Ports** definem interfaces (in: comandos, queries; out: persistência, message bus, etc.).
- **Adapters** implementam ports: HTTP adapter, DB adapter, Kafka adapter, mock adapter pra test.

Domain não importa lib HTTP, lib DB. **Tudo flui através de ports**. Adapters são plug-and-play.

Permite testar domain sem subir HTTP/DB. Trocar DB sem mudar domain (hipótese atraente; raramente acontece em prática).

### 2.3 Clean Architecture (Uncle Bob)

Camadas concêntricas:
- **Entities** (núcleo): regras enterprise, sem deps.
- **Use Cases**: orquestração; depende de entities.
- **Interface Adapters**: controllers, presenters, gateways.
- **Frameworks & Drivers**: web, DB, devices.

**Dependency Rule**: deps apontam pra dentro. Inner layer nunca importa outer.

Boilerplate típico: Request DTO → Controller → Use Case → Entity → Repository → DB. Mapping entre cada camada.

Em projetos pequenos: overkill. Em projetos grandes com lógica core complexa: estrutura útil.

### 2.4 Onion Architecture

Jeffrey Palermo. Quase sinônimo com Clean. Layers:
- Domain Model (center).
- Domain Services.
- Application Services.
- Infrastructure (DB, UI, externals).

Mesmo princípio: deps pra dentro.

Diferenças com Clean são detalhes; tratamento equivalente em prática.

### 2.5 Vertical Slices

Jimmy Bogard (Mediator pattern, MediatR em .NET).

Em vez de horizontal layers, organize por feature:
```
features/
  CreateOrder/
    CreateOrderCommand.ts
    CreateOrderHandler.ts
    CreateOrderValidator.ts
    CreateOrderEndpoint.ts
  AssignCourier/
    ...
```

Cada slice cross-cuts layers; mudança de feature toca 1 pasta.

Pros:
- Mudanças coesas.
- Sem "shared model" que pune evolução.
- Tests por feature.

Cons:
- Duplicação leve entre slices similares.
- Sem central domain model é fácil drift.

CQRS encaixa naturalmente: command slices vs query slices.

### 2.6 MVC e fat controllers

Express/Rails MVC clássico. Funciona até controllers ficarem 500 linhas com lógica + validation + DB call + email send + saga.

Refactor incremental:
1. Extract validation (Zod schema).
2. Extract domain logic pra service/use case.
3. Extract DB calls pra repository.
4. Controller fica thin.

Não força hexagonal full; só aplique camada onde dor justifica.

### 2.7 Anemic vs Rich Domain Model

- **Anemic**: entities = data classes só getters/setters; lógica em services. Common em ORMs.
- **Rich**: entities têm comportamento (`order.markPaid()` valida invariants e muda state).

Rich exige cuidado: entity não deve depender de DB; lógica fica em domain pure.

### 2.8 Application service vs Domain service

- **Domain service**: lógica que pertence ao domínio mas não cabe em 1 entity. `RoutingService.findBestCourier(order, fleet)`.
- **Application service / Use case**: orquestra workflow, transactions, eventos. `AssignCourierUseCase.execute(orderId)` busca order, chama domain service, persiste, emite event.

Use case = fluxo de aplicação; domain service = lógica de domínio.

### 2.9 Hexagonal aplicada em Node/TS

Estrutura típica:
```
src/
  domain/
    Order.ts             # entity com behavior
    OrderRepository.ts   # PORT (interface)
    AssignCourierService.ts  # domain service
  application/
    AssignCourierUseCase.ts  # use case
  infrastructure/
    DrizzleOrderRepository.ts  # ADAPTER
    HttpController.ts          # ADAPTER
    KafkaPublisher.ts          # ADAPTER
  composition.ts            # wire-up
```

DI manual ou via lib (`tsyringe`, `awilix`). Em greenfield, injeção manual fácil de seguir.

### 2.10 Vertical Slices aplicada em Node/TS

```
src/
  features/
    create-order/
      schema.ts
      handler.ts
      route.ts
    assign-courier/
      ...
  shared/
    db.ts
    auth.ts
```

Sem layers globais. Cada feature traz seu pacote.

Fastify/Hono encaixam bem; cada slice registra plugin.

### 2.11 Quando hexagonal vale

- Core domain complexo, com regras que mudam frequentemente.
- Múltiplas formas de input (HTTP, CLI, queue, scheduled).
- Test isolation domain sem infra.
- Time experiente que entende o cost.

### 2.12 Quando não vale

- CRUD trivial.
- MVP com requirements em flux.
- Time pequeno.
- Time sem maturity pra manter abstrações.

Adicione layer quando dor justifica. Don't pre-architect.

### 2.13 Hexagonal vs DDD

DDD strategic é ortogonal a hexagonal: você pode aplicar bounded contexts sem hexagonal interno.

DDD tactical (aggregate, repository) encaixa naturalmente em hexagonal: aggregate é domain entity; repository é port.

Em projeto sério: bounded contexts (DDD strategic) + dentro de cada, hexagonal (DDD tactical) ou simpler dependendo de complexity.

### 2.14 BFF, Backend for Frontend

Pattern: cada frontend (web, mobile, partner) tem backend agregador próprio. Cada BFF orquestra microservices internos.

Pros: cliente recebe data shaped pra suas necessidades; evolução independente.
Cons: mais services pra operar.

### 2.15 Modular Monolith concretizado

Combinação prática:
- Single deployable.
- N modules = N bounded contexts (04-06).
- Cada module pode internamente usar style adequado (hexagonal pra core, transaction script pra simples).
- Cross-module via public API ou events.

Em 2026, modular monolith é "default sane" pra projetos médios. Microservices só quando demanda justifica.

### 2.16 Frontend architectures

Front também tem patterns:
- **Component-based**: default React/Vue.
- **Atomic Design**: atoms → molecules → organisms.
- **Feature-Sliced Design** (FSD): pastas por feature. Vertical slices no front.
- **MVP / MVVM**: clássicos, raramente mantidos puros em SPA.
- **Clean Architecture** mobile (Robert Martin's), adopted em iOS/Android.

Em Next/React modernos, mix entre componentização + features-sliced é comum.

### 2.17 Polyglot architecture revisited

Logística:
- Core TS modular monolith com bounded contexts.
- Routing engine: Rust separado, hexagonal interno (port pro algorithm core, adapters HTTP/gRPC).
- Webhook ingestor: Go com transaction-script-style (CRUD básico, sem over-engineering).

Padrão arquitetura por contexto.

### 2.18 Architecture decision por estágio — modular monolith → microservices → serverless com Logística v1→v4

"Microservices vs monolith" é debate falso em 2026. Resposta correta = "depende do estágio". Logística começa modular monolith (1 deploy, fast iteration), evolui pra serviços extraídos quando dor real aparece (org scale, scale técnico independente), serverless para edges (cron, image processing). Decisão por estágio: v1 (PMF), v2 (scale), v3 (multi-team), v4 (regional). Esta seção entrega decision tree concreto + signals que indicam evoluir.

**Stage v1 — modular monolith (PMF, 0-50k MAU, equipe 2-8)**:

```
logistica-monorepo/
├── apps/
│   ├── web/           Next.js
│   ├── mobile/        Expo
│   └── api/           Fastify monolith
├── packages/
│   ├── core/          Domain logic (shared)
│   ├── db/            Drizzle schema + queries
│   ├── auth/          Auth flows
│   ├── notifications/ Email/SMS/push
│   └── billing/       Stripe integration
└── infra/
    ├── docker-compose.yml  (dev)
    └── railway.json        (deploy single VM)
```

- **API**: 1 process, in-process module boundaries via TypeScript imports.
- **DB**: 1 Postgres com schemas por module (`auth.users`, `orders.orders`, `billing.invoices`).
- **Deploy**: 1 Dockerfile, 1 binary, push to Railway/Render/Fly.
- **Iteration speed**: 5min from commit to prod; toda mudança é refactor visível IDE-wide.
- **Quando NÃO funciona mais**: build > 10min, deploy assusta time inteiro, feature em conflito constantes between PRs.

**Stage v2 — modular monolith + extracted edges (50k-500k MAU, equipe 8-25)**:

- Extrai serviços que SOFREM por estarem no monolito:
  - **Notifications** (high-volume async): vira service separado consumindo Kafka/RabbitMQ.
  - **Image processing** (CPU-heavy): serverless function (Lambda/Cloud Run) on-demand.
  - **Cron jobs** (batch): separate worker pod, sem affecting API latency.
- **API ainda monolítico**: 80% das features. Não force microservices prematuro.
- **DB**: começa read replica; same schema.
- **Deploy**: 3-4 services (api, web, notifications, workers); cada um tem own deploy pipeline.
- **Org structure**: 2-3 squads, mas todos podem PR no API monolith (ownership por module).

**Stage v3 — service-oriented (500k-5M MAU, equipe 25-100)**:

- Bounded contexts (cruza com 04-06 DDD) extraídos em serviços:
  - **Identity Service** (auth, users, sessions).
  - **Orders Service** (CRUD, lifecycle).
  - **Dispatch Service** (courier matching, routing).
  - **Notifications Service** (multi-channel).
  - **Billing Service** (subscriptions, invoices, taxes).
  - **Analytics Service** (events ingestion, dashboards).
- **API Gateway** (Kong, Apollo Router, AWS API GW): routing + rate limit + auth.
- **DB per service**: cada service own DB; cross-service via API/events, NÃO shared schema.
- **Eventos**: Kafka como spinal cord; outbox pattern (cruza com 04-03 §2.8) pra exactly-once.
- **Deploy**: 8-15 services; cada team own deploy pipeline.
- **Quando vale**: time > 25; cada squad ships independently > 1x/dia; bounded contexts são claros (não chumbado).

**Stage v4 — multi-region + edge (5M+ MAU, equipe 100+)**:

- **Regional deployments**: SaaS replicado em US-East, EU-West, BR-São Paulo. Data residency compliance.
- **Edge functions** (Cloudflare Workers, Vercel Edge): auth checks, rate limit, A/B test routing — sub-50ms global.
- **Serverless** (Lambda/Cloud Run): bursty workloads (image processing, ML inference, report gen).
- **Multi-cluster K8s**: cada região cluster separado; service mesh cross-region opcional.
- **Quando vale**: latency global é vantagem competitiva; compliance regional (GDPR, LGPD); MAU concentrado em > 2 continents.

**Decision tree — quando extrair serviço do monolito**:

```
Para cada module candidato:
  1. Tem traffic profile diferente? (high-volume notifications vs low-volume admin)
     → SIM: candidato.
  2. Tem scale axis diferente? (CPU-bound image processing vs I/O-bound API)
     → SIM: candidato.
  3. Squad dedicada quer deploy independente?
     → SIM: candidato.
  4. Tem dependency externa risky? (3rd-party API down derruba monolith)
     → SIM: isolar pra fault-tolerance.
  5. Tem compliance/audit boundary? (PII processing isolado)
     → SIM: extrair pra reduce blast radius.

Se 0-1 sim: NÃO extrair. Custo > benefício.
Se 2+ sim: candidato; evaluate cost (build, deploy, observability, ops).
```

**Signals que indicam estágio errado**:

Monolítico estagnado em v1 quando deveria ser v2:
- Build > 10min.
- PR conflicts toda semana.
- Deploy "assustador" (uma feature errada derruba tudo).
- Time evita refactor por medo.

Microservices prematuro em v2 quando deveria ser v1+extracted:
- 8 services pra 5 devs (overhead de deploy/observability/contracts).
- Mudança simples requer PR em 3 repos.
- Distributed tracing é único jeito de debug.
- "Distributed monolith": services tightly coupled em events, não escalam isoladamente.

Microservices estagnado em v3 quando deveria ser v4:
- Latency global > 500ms p99 em mercados secundários.
- Compliance forcing data residency mas tudo em US.
- Single region outage = global outage.

**Logística — caminho real recomendado**:

```
v1 (Year 1, MVP): Monorepo Next.js + Fastify monolith + Postgres + Railway. 5 devs.
v2 (Year 2, growth): Extract notifications + image processing. Add Redis. Read replica. 12 devs.
v3 (Year 3-4, scale): Identity + Orders + Dispatch + Billing + Analytics services. K8s. Kafka. 35 devs.
v4 (Year 5+, global): Multi-region (US, EU, BR). Edge auth. Serverless ML inference. 80+ devs.
```

**Custo de cada transição (estimativa real)**:

- **v1 → v2** (extract 2-3 services): 2-3 meses, 3-4 devs. Investment em CI/CD, observability básica.
- **v2 → v3** (full SOA): 9-12 meses, time inteiro. Heavy investment em platform team, service contracts, distributed tracing.
- **v3 → v4** (multi-region): 6-12 meses, focus team. Database replication strategy, edge infra, compliance work.

**Anti-patterns observados**:

- **Microservices em v1 "porque escalável"**: 6 services antes do PMF; 90% morre ou pivota; refactor desperdiçado.
- **Monolith em v3 "porque é simples"**: time de 50 devs em 1 repo = PR queue de horas, deploys conflitantes.
- **Extract por moda, não dor**: "vamos extrair billing" sem signal técnico/org real; cria overhead.
- **DB compartilhado em microservices**: "soft" microservices; cada service sabe schema do outro; violation de bounded context.
- **Service mesh em v2 sem necessidade**: Istio em 5 services = ops overhead 4x maior que ganho.
- **Edge functions em v1**: time perde 1 mês otimizando latency global enquanto produto não tem PMF.
- **Serverless tudo em v3**: cold start mata p99; bills imprevisíveis em scale; debugging fragmentado.
- **Zero migration plan**: stage transitions improvisadas; outage durante extract.

Cruza com **04-07 §2.15** (modular monolith concretizado), **04-08 §2.20** (services-monolith-serverless decisão geral), **04-06 §2.3** (bounded contexts são pré-requisito pra service extraction), **04-12 §2.14** (Conway's Law alinha org com arquitetura), **04-09 §2.x** (scale axes informam decisão).

### 2.19 Hexagonal vs Clean vs Onion architecture — comparison + when each wins

Três arquiteturas, três filosofias, mesmo princípio raiz: **Dependency Inversion** (high-level modules não dependem de low-level; ambos dependem de abstractions).

**Origens**:

- **Hexagonal Architecture** (Alistair Cockburn, 2005): aka "Ports and Adapters". Domain core + interfaces (ports) + implementations (adapters). Simétrico — driving e driven são equally adapters.
- **Onion Architecture** (Jeffrey Palermo, 2008): círculos concêntricos; dependências apontam INWARD only. Domain no centro; infrastructure outermost.
- **Clean Architecture** (Robert C. Martin, 2012): refinamento que combina DDD + Hexagonal + Onion. Use cases como camada central explícita.

**Hexagonal — anatomia**:

- **Domain core**: business logic pura, zero I/O.
- **Primary ports** (driving): interfaces que UI/API chamam (use cases).
- **Secondary ports** (driven): interfaces pra DB, queue, external APIs.
- **Adapters**: implementações concretas; troca livre.

```ts
// Domain (pure, no I/O)
class Order {
  constructor(public id: string, public status: OrderStatus) {}
  markDelivered() {
    if (this.status !== 'in_transit') throw new InvalidTransition();
    this.status = 'delivered';
  }
}

// Primary port (driving)
interface OrderUseCase {
  markDelivered(orderId: string, courierId: string): Promise<void>;
}

// Secondary ports (driven)
interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  save(order: Order): Promise<void>;
}
interface NotificationPort {
  notifyDelivered(order: Order): Promise<void>;
}

// Application layer (orchestrates domain via ports)
class OrderApplicationService implements OrderUseCase {
  constructor(private repo: OrderRepository, private notifier: NotificationPort) {}
  async markDelivered(orderId: string, courierId: string) {
    const order = await this.repo.findById(orderId);
    if (!order) throw new OrderNotFound(orderId);
    order.markDelivered();
    await this.repo.save(order);
    await this.notifier.notifyDelivered(order);
  }
}

// Primary adapter (REST controller)
app.post('/orders/:id/delivered', async (req, res) => {
  await orderUseCase.markDelivered(req.params.id, req.user.courierId);
  res.json({ ok: true });
});

// Secondary adapter (Postgres repo)
class PostgresOrderRepository implements OrderRepository {
  async findById(id: string): Promise<Order | null> {
    const row = await db.select().from(orders).where(eq(orders.id, id)).get();
    return row ? new Order(row.id, row.status) : null;
  }
  async save(order: Order): Promise<void> {
    await db.update(orders).set({ status: order.status }).where(eq(orders.id, order.id));
  }
}
```

**Onion — anatomia** (4 anéis, dependência só pra dentro):

- **Centro**: Domain Model (entities, value objects, invariants).
- **Anel 2**: Domain Services (lógica que não cabe em entity única).
- **Anel 3**: Application Services (use cases, orchestration).
- **Outermost**: Infrastructure (DB, external APIs, UI, frameworks).
- **Regra**: Domain tem zero `import` de infrastructure. Test sem nada externo rodando.

**Clean Architecture — anatomia** (4 camadas explícitas):

- **Centro**: Entities (enterprise business rules — invariantes core do negócio).
- **Camada 2**: Use Cases (application business rules — orquestração).
- **Camada 3**: Interface Adapters (controllers, presenters, gateways — translation layer).
- **Camada 4**: Frameworks & Drivers (DB, web, devices, UI — outermost).
- **Boundary classes** (interfaces) cruzam camadas via Dependency Inversion.

**Comparison matrix**:

| Aspect | Hexagonal | Onion | Clean |
|---|---|---|---|
| **Year** | 2005 | 2008 | 2012 |
| **Layers** | Domain + Application + Adapters | Domain + Domain Svc + App Svc + Infra | Entities + Use Cases + Adapters + Frameworks |
| **Symmetry** | Yes (driving/driven equal) | No (inward only) | No (inward only) |
| **Use case explicit** | Implicit | Implicit | Explicit layer |
| **Best for** | Apps com many integrations | Domain-heavy apps | Mix domain + use case modeling |
| **Verbosity** | Low-Medium | Medium | High (more layers) |
| **Test ease** | Excellent (mock adapters) | Excellent | Excellent |

**When each wins**:

- **Hexagonal**: app integra com many systems (APIs, queues, files, multiple DBs); want easy swap. Logística com Postgres → CockroachDB future migration: Hexagonal vence.
- **Onion**: domain rico com many entities + business rules + few integrations. Banking core, ERP modules. Logística catalog (products + variants + categories) é onion-friendly.
- **Clean**: large team precisa explicit use case boundaries; novos devs onboard via layered structure. Verbose mas teaches enterprise patterns.

**Common pitfalls (across all three)**:

- **Anemic domain model**: entities sem comportamento (apenas getters/setters); business logic em services. Defeats DDD/Hexagonal/Clean purpose.
- **Over-abstraction em CRUD**: 7 layers pra simple `GET /products` é absurdo. Pragmatic: simple CRUD pode pular layers.
- **Domain importing infrastructure**: `import { db } from 'infra'` em Domain → cycle dependency, defeats inversion.
- **Use Case classes que viram thin wrappers**: `OrderUseCase.create()` que apenas chama `repo.save()` sem business logic = wasted abstraction.
- **Ports per CRUD operation**: `CreateOrderPort`, `FindOrderPort`, `UpdateOrderPort` separados = explosão. Combine em `OrderRepository`.

**Pragmatic application Logística**:

- **MVP (v1)**: Modular Monolith + Hexagonal lite (Application Service + Repository interface; skip Use Case layer até ter dor real).
- **Growth (v2)**: adicione Use Case classes em modules complex (Orders, Routing, Billing); Domain Services pra invariants cross-entity.
- **Scale (v3)**: extract bounded contexts em services; cada service Hexagonal/Clean conforme sua complexity.

```
src/
  orders/
    domain/         # Order entity, OrderStatus VO, invariants
    application/    # OrderApplicationService, use cases
    infrastructure/ # PostgresOrderRepo, KafkaPublisher
    interface/      # REST controllers, GraphQL resolvers
```

**Testing implications** (layer-based test pyramid):

- **Domain**: pure unit tests, no I/O, fast (~ms).
- **Application**: unit tests com mocked ports (fast).
- **Infrastructure**: integration tests com real Postgres/Redis (Testcontainers).
- **Interface**: E2E tests com full stack (Playwright).
- Numbers reais Logística target: 2000+ unit tests <30s; 200+ integration tests <2min; 50 E2E <5min.

**Anti-patterns observados**:

- 7 layers em todo CRUD operation (over-engineered; pragmatic: short-circuit pra simple ops).
- Domain importing ORM types (Drizzle/Prisma model leaks); use VO + mapper.
- Use Case class chamando outro Use Case directly (cycle; orchestrate em controller ou domain service).
- Anemic Domain Model (entities = data bags); business logic em services derrota purpose.
- "Application Service" que só chama repo (no business logic) = unnecessary indirection.
- Repository com 20 métodos custom (`findByEmailAndStatusAndCreatedAt`) viola SRP; use Specification pattern (cobre 04-06 §2.17).
- Hexagonal "ports per CRUD" (`CreateOrderPort`, `UpdateOrderPort`) explosão; combine em Repository.
- Same Domain class em frontend e backend (frontend pollui domain pra rendering needs); use VO mapping.
- Clean Architecture book-strict em CRUD-heavy app (1000% overhead; pragmatic mix).
- Hexagonal sem DI container (manual wiring 50 lines em `main.ts`; use NestJS/tsyringe/awilix).

Cruza com **04-06** (DDD, building blocks, Specification pattern), **04-08** (services/monolith, modular structure), **04-03** (event-driven, ports as event consumers), **02-04** (React, frontend hexagonal pra testability), **03-01** (testing, layer-based test strategy).

---

### 2.20 Modular Monolith production patterns 2026 — Spring Modulith, .NET Aspire, Encore.ts, Helidon, monorepo TS, boundary enforcement

Modular monolith virou default 2024-2026 para projetos médios (5-15 devs, 8-12 módulos). Microservices premature custa coordenação distribuída sem ganho organizacional. Framework support across ecosystems matured: Spring Modulith 1.3+ (Q4 2024, Spring Boot 3.4 compat), .NET Aspire 9.0+ (Nov 2024 GA), Encore.ts 1.x (Q4 2024, TS-native), Helidon 4.1+ (Oracle, virtual threads). Monorepo TS via Turborepo 2.x / Nx 20+ / Rush. Boundary enforcement automated via ESLint plugin-boundaries, dep-cruiser 16+, ts-arch. §2.15 introduziu modular monolith conceitual; §2.20 é o **2026 framework deep**.

**Spring Modulith 1.3+**: extension oficial do Spring Boot. Module = package + sub-packages internos. Public API exposto via top-level package; internals em `internal/` package-private (Java compiler enforce).

```java
// orders/package-info.java
@ApplicationModule(
    displayName = "Orders",
    allowedDependencies = { "shared", "payments::events" }  // só shared + events de payments
)
package com.logistica.orders;

import org.springframework.modulith.ApplicationModule;

// orders/internal/OrderRepository.java — package-private, invisível fora do módulo
package com.logistica.orders.internal;

class OrderRepository { /* ... */ }

// orders/OrderService.java — public API
package com.logistica.orders;

@Service
public class OrderService {
    // expõe DTOs, esconde entities
}

// Boundary test (build-time)
class ModularityTest {
    @Test
    void verifiesModularStructure() {
        ApplicationModules.of(LogisticaApplication.class).verify();
    }

    @Test
    void documentsModules() {
        new Documenter(ApplicationModules.of(LogisticaApplication.class))
            .writeDocumentation();  // gera C4 PlantUML por módulo
    }
}
```

Observability built-in (Micrometer per-module metrics, traces). Events via `ApplicationEventPublisher` — in-process, type-safe, `@ApplicationModuleListener` async + transactional.

**.NET Aspire 9.0+ (Nov 2024 GA)**: distributed application orchestration. AppHost.cs declara serviços; orquestra SQL/Redis/RabbitMQ + microservices em dev. OTel out-of-the-box. Deploy targets Azure Container Apps, AWS ECS, K8s.

```csharp
// AppHost/Program.cs
var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("pg")
    .WithDataVolume()
    .AddDatabase("logistica");

var redis = builder.AddRedis("redis");
var rabbit = builder.AddRabbitMQ("rabbit");

var orders = builder.AddProject<Projects.Orders_Api>("orders")
    .WithReference(postgres)
    .WithReference(rabbit);

builder.AddProject<Projects.Couriers_Api>("couriers")
    .WithReference(postgres)
    .WithReference(orders);  // service discovery automático

builder.Build().Run();
// Dashboard em localhost:18888 — traces + metrics + logs por serviço
```

Production secrets externalize via `builder.AddParameter("ConnectionString", secret: true)` + Azure Key Vault / AWS Secrets Manager — AppHost é dev orchestration, não production runtime.

**Encore.ts 1.x**: TypeScript-native services framework. Service = pasta com `encore.service.ts`. RPC type-safe cross-service em mesmo monolith. Auto-OpenAPI. Cron + secrets + DB declarative. Deploy single binary OU split em microservices sem rewrite.

```typescript
// orders/encore.service.ts
import { Service } from "encore.dev/service";
export default new Service("orders");

// orders/api.ts
import { api } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import { secret } from "encore.dev/config";

const db = new SQLDatabase("orders", { migrations: "./migrations" });
const stripeKey = secret("StripeSecretKey");

export const create = api(
  { method: "POST", path: "/orders", expose: true },
  async (req: { items: Item[] }): Promise<{ id: string }> => {
    const id = await db.queryRow<{ id: string }>`
      INSERT INTO orders ... RETURNING id
    `;
    return { id: id.id };
  }
);

// couriers/api.ts — cross-service call type-safe
import { create as createOrder } from "~encore/clients/orders";
const order = await createOrder({ items });  // compile-time typed, runtime RPC

// orders/cron.ts
import { CronJob } from "encore.dev/cron";
export const cleanup = new CronJob("cleanup-stale", {
  title: "Cleanup stale orders",
  every: "1h",
  endpoint: cleanupHandler,
});
```

**Java Helidon 4.1+ (Oracle)**: MicroProfile-based. Helidon Nima — virtual threads (Loom) ready, sync programming model com escalabilidade async. Alternativa Quarkus / Micronaut quando Spring é overkill.

**Monorepo TS modular**: Turborepo 2.x (Vercel — task pipelines + remote cache; turbo.json declara dependências entre packages); Nx 20+ (generators + module boundaries via tags + module federation improvements); Rush (Microsoft, monorepo at scale com phantom-dep prevention).

```json
// turbo.json
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "test": { "dependsOn": ["build"] },
    "lint": {}
  }
}

// nx.json — boundaries via tags
{
  "targetDefaults": {
    "build": { "dependsOn": ["^build"] }
  },
  "implicitDependencies": {}
}

// .eslintrc — Nx enforce tags
{
  "@nx/enforce-module-boundaries": ["error", {
    "depConstraints": [
      { "sourceTag": "scope:orders", "onlyDependOnLibsWithTags": ["scope:orders", "scope:shared"] },
      { "sourceTag": "type:feature", "onlyDependOnLibsWithTags": ["type:ui", "type:data-access", "type:util"] }
    ]
  }]
}
```

**Boundary enforcement automated** (CI gate, não advisory):

```javascript
// .eslintrc — eslint-plugin-boundaries
module.exports = {
  plugins: ["boundaries"],
  settings: {
    "boundaries/elements": [
      { type: "feature", pattern: "src/features/*" },
      { type: "shared", pattern: "src/shared/*" },
      { type: "api", pattern: "src/features/*/api/*" },
    ],
  },
  rules: {
    "boundaries/element-types": ["error", {
      default: "disallow",
      rules: [
        { from: "feature", allow: ["shared", "api"] },
        { from: "shared", allow: ["shared"] },
      ],
    }],
  },
};

// .dependency-cruiser.cjs
module.exports = {
  forbidden: [
    { name: "no-domain-to-infra",
      from: { path: "^src/domain" },
      to: { path: "^src/infrastructure" } },
    { name: "no-cross-feature",
      from: { path: "^src/features/([^/]+)" },
      to: { path: "^src/features/(?!$1)([^/]+)" } },  // regex back-ref
  ],
};
```

```typescript
// arch.test.ts — ts-arch
import { filesOfProject } from "tsarch";

test("domain doesn't import infrastructure", async () => {
  const violations = await filesOfProject()
    .inFolder("src/domain")
    .shouldNot()
    .dependOnFiles()
    .inFolder("src/infrastructure")
    .check();
  expect(violations).toEqual([]);
});
```

**In-process events**: publish to internal event bus (Spring `ApplicationEventPublisher`, MediatR .NET, EventEmitter Node). Consumers same process — sub-ms latency vs Kafka. Mesma boundary enforcement: módulo só publica/consome eventos declarados em `events.ts` API. Para cross-process, outbox + Kafka (cruza com **04-03 §2.19**).

**Decision matrix 2026**:

| Stack | Default 2026 |
|-------|--------------|
| Java/Kotlin team | Spring Modulith 1.3+ (zero ceremony, observability built-in) |
| C#/.NET team | .NET Aspire 9.0 (orchestration dev + production targets) |
| Greenfield TS, future split possível | Encore.ts (single binary now, microservices later) |
| Monorepo TS já existente | Turborepo + ESLint plugin-boundaries + dep-cruiser |
| Polyglot ou heterogêneo | Raw modular monolith + boundary tests |

**Stack Logística aplicada**: Encore.ts modular monolith — services orders / couriers / payments / notifications / auth. RPC cross-service type-safe. In-process events (`OrderCreated` publicado em orders, consumido por notifications + couriers). Outbox pattern + Kafka para cross-process com analytics service (separado por scaling profile diferente). Turborepo para shared packages (`@logistica/types`, `@logistica/utils`). ESLint plugin-boundaries em CI gate (PR fail se feature importa internal de outra feature). Threshold split: ao atingir 12 módulos / 15 devs, módulos `analytics` + `ml-pricing` saem para serviços dedicados (scaling + team boundary Conway).

**10 anti-patterns**:
1. Modular monolith **sem boundary enforcement automatizado** — compila, drift inevitável, microservices later impossível (cada módulo importa internals de outros).
2. Spring Modulith **sem `@ApplicationModule` annotations** — zero benefit sobre plain Spring; verifica nada.
3. .NET Aspire AppHost com **production secrets hardcoded** — AppHost é dev orchestration; externalize via Key Vault / Secrets Manager em deploy.
4. Encore.ts services tratados como **microservices em greenfield** — deploy single binary primeiro; split quando scaling/team justificar (default deploy mode existe por razão).
5. Turborepo **sem remote cache** configurado — CI cold every run, perde 80% do valor (Vercel Remote Cache ou self-hosted).
6. Nx tags configurados mas **não enforced via CI** — `lint` rodando local advisory; PR merge ignora; instale gate em pipeline.
7. **Cross-module direct DB access** — bypass modular boundary (módulo A faz SELECT em tabela do módulo B); use module public API ou eventos.
8. In-process event consumer crash **derruba whole monolith** — sem error boundary + retry + DLQ; @TransactionalEventListener async + DLQ table mandatory.
9. **Shared kernel module com 50% dos types** — vira coupling spine; mantenha tiny (só value objects universais e cross-cutting concerns como `Money`, `UserId`).
10. Modular monolith escalado pra **30+ devs sem split** — coordination cost domina (deploy contention, code review bottleneck, single point of failure); split por team boundary (Conway, **04-12 §2.24**).

Cruza com **04-07 §2.10** (vertical slices applied), **§2.15** (modular monolith concretizado intro), **§2.18** (architecture decision per stage), **§2.19** (hex vs clean vs onion), **04-06 §2.19** (DDD ACL/OHS/PL — boundary integration patterns), **04-06 §2.10** (modular monolith with BCs DDD), **04-08 §2.2** (modular monolith intro), **§2.7** (Strangler Fig from monolith), **04-03 §2.19** (Outbox + Saga production), **03-04** (CI/CD — boundary tests as PR gate), **04-12 §2.24** (Conway's Law — team topology drives module boundaries).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Spectrum de complexidade arquitetural com 1 caso pra cada.
- Hexagonal: ports vs adapters vs domain.
- Clean Architecture's Dependency Rule.
- Vertical slices vs horizontal layers; quando cada vence.
- Anemic vs rich domain model.
- Domain service vs application service/use case.
- Quando hexagonal NÃO vale.
- BFF pattern.
- Modular monolith vs microservices.
- Mix arquitetural por bounded context.

---

## 4. Desafio de Engenharia

Refatorar **Order Management** (do 04-06) com hexagonal puro; manter outros bounded contexts mais simples. Mostrar mix consciente.

### Especificação

1. **Order Management, hexagonal**:
   - Domain core sem deps externas (sem `pg`, sem `fastify`).
   - Ports: `OrderRepository`, `EventPublisher`, `Clock`, `IdGenerator`.
   - Adapters: `DrizzleOrderRepository`, `KafkaEventPublisher`, `SystemClock`, `UuidGenerator`.
   - Use cases: `CreateOrderUseCase`, `AssignCourierUseCase`, `MarkOrderDeliveredUseCase`.
   - HTTP adapter: Fastify routes que invocam use cases.
   - Tests: domain pure + use case com mocks; integration com adapter real (03-01).
2. **Courier Management, vertical slices**:
   - Cada feature em pasta:
     - `register-courier/`
     - `update-location/`
     - `set-availability/`
   - Cada slice tem schema, handler, route, test em pasta própria.
   - Sem global "courier service".
3. **Tenant Settings, transaction script**:
   - CRUD trivial; controllers chamam DB direto.
   - Documente decisão de NÃO usar tactical patterns.
4. **Composição**:
   - 1 root composition wire-up: cria adapters concretos, injeta em use cases.
   - Em test, troca adapters por mocks.
5. **Trade-offs documentados**:
   - `ARCHITECTURE.md` (continuação do 04-06):
     - Por que Order Management ganhou hexagonal.
     - Por que Courier Management ganhou vertical slices.
     - Por que Tenant Settings ficou simples.
     - Custo de cada estilo (lines of code, mapping overhead, test setup).
6. **Frontend, Feature-Sliced Design**:
   - Reorganize app Next em layers FSD: `app/`, `pages/`, `widgets/`, `features/`, `entities/`, `shared/`.
   - Imports respeitam direction (camada superior pode importar inferior, não inverso).
   - Lint rule pra enforcement.

### Restrições

- Sem importar Drizzle dentro de domain Order.
- Sem entity anêmica em Order (lógica deve estar nele).
- Sem mapping desnecessário em CRUD trivial.

### Threshold

- README documenta:
  - Diagrama de Order Management hexagonal.
  - Estrutura de pastas Courier Management slices.
  - Comparação code metrics: LoC, file count, test setup time entre os 3 estilos.
  - 1 caso de mudança de feature: quanto tocou em cada estilo.
  - Trade-off claro: quando você arrependeria de adopt hexagonal em CRUD; quando do oposto.

### Stretch

- Application Layer com Mediator pattern (CQRS): cada use case é command ou query.
- DI container (tsyringe) vs manual; comparação.
- Ports adicionais: `Logger`, `MetricsCollector` injetados.
- CLI adapter: rode use case via comando line, sem HTTP.
- Frontend BFF separado pra mobile.

---

## 5. Extensões e Conexões

- Liga com **02-08** (frameworks): plugin model encaixa em hexagonal/slices.
- Liga com **03-01** (testes): hexagonal facilita unit test.
- Liga com **04-03** (event-driven): use cases emit domain events.
- Liga com **04-06** (DDD): tactical patterns aplicados.
- Liga com **04-08** (services): bounded context extract → service.
- Liga com **04-12** (tech leadership): arquitetura é decisão coletiva.

---

## 6. Referências

- **"Clean Architecture"**: Robert C. Martin.
- **"Patterns of Enterprise Application Architecture"**: Martin Fowler.
- **"Implementing Domain-Driven Design"**: Vaughn Vernon (capítulos sobre architecture).
- **Alistair Cockburn, "Hexagonal Architecture"** ([alistair.cockburn.us/hexagonal-architecture](https://alistair.cockburn.us/hexagonal-architecture/)).
- **Jimmy Bogard, "Vertical Slice Architecture"** ([jimmybogard.com](https://www.jimmybogard.com/vertical-slice-architecture/)).
- **Feature-Sliced Design** ([feature-sliced.design](https://feature-sliced.design/)).
- **Mark Seemann, ploeh.dk**: DI, architecture.
- **"Software Architecture: The Hard Parts"**: Neal Ford et al.
- **"Fundamentals of Software Architecture"**: Mark Richards, Neal Ford.
