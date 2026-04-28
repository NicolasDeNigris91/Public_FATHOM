---
module: S07
title: Architectures — Hexagonal, Clean, Onion, Vertical Slices
stage: senior
prereqs: [S06]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# S07 — Architectures

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

### 2.14 BFF — Backend for Frontend

Pattern: cada frontend (web, mobile, partner) tem backend agregador próprio. Cada BFF orquestra microservices internos.

Pros: cliente recebe data shaped pra suas necessidades; evolução independente.
Cons: mais services pra operar.

### 2.15 Modular Monolith concretizado

Combinação prática:
- Single deployable.
- N modules = N bounded contexts (S06).
- Cada module pode internamente usar style adequado (hexagonal pra core, transaction script pra simples).
- Cross-module via public API ou events.

Em 2026, modular monolith é "default sane" pra projetos médios. Microservices só quando demanda justifica.

### 2.16 Frontend architectures

Front também tem patterns:
- **Component-based**: default React/Vue.
- **Atomic Design**: atoms → molecules → organisms.
- **Feature-Sliced Design** (FSD): pastas por feature. Vertical slices no front.
- **MVP / MVVM**: clássicos, raramente mantidos puros em SPA.
- **Clean Architecture** mobile (Robert Martin's) — adopted em iOS/Android.

Em Next/React modernos, mix entre componentização + features-sliced é comum.

### 2.17 Polyglot architecture revisited

Logística:
- Core TS modular monolith com bounded contexts.
- Routing engine: Rust separado, hexagonal interno (port pro algorithm core, adapters HTTP/gRPC).
- Webhook ingestor: Go com transaction-script-style (CRUD básico, sem over-engineering).

Padrão arquitetura por contexto.

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

Refatorar **Order Management** (do S06) com hexagonal puro; manter outros bounded contexts mais simples. Mostrar mix consciente.

### Especificação

1. **Order Management — hexagonal**:
   - Domain core sem deps externas (sem `pg`, sem `fastify`).
   - Ports: `OrderRepository`, `EventPublisher`, `Clock`, `IdGenerator`.
   - Adapters: `DrizzleOrderRepository`, `KafkaEventPublisher`, `SystemClock`, `UuidGenerator`.
   - Use cases: `CreateOrderUseCase`, `AssignCourierUseCase`, `MarkOrderDeliveredUseCase`.
   - HTTP adapter: Fastify routes que invocam use cases.
   - Tests: domain pure + use case com mocks; integration com adapter real (P01).
2. **Courier Management — vertical slices**:
   - Cada feature em pasta:
     - `register-courier/`
     - `update-location/`
     - `set-availability/`
   - Cada slice tem schema, handler, route, test em pasta própria.
   - Sem global "courier service".
3. **Tenant Settings — transaction script**:
   - CRUD trivial; controllers chamam DB direto.
   - Documente decisão de NÃO usar tactical patterns.
4. **Composição**:
   - 1 root composition wire-up: cria adapters concretos, injeta em use cases.
   - Em test, troca adapters por mocks.
5. **Trade-offs documentados**:
   - `ARCHITECTURE.md` (continuação do S06):
     - Por que Order Management ganhou hexagonal.
     - Por que Courier Management ganhou vertical slices.
     - Por que Tenant Settings ficou simples.
     - Custo de cada estilo (lines of code, mapping overhead, test setup).
6. **Frontend — Feature-Sliced Design**:
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

- Liga com **A08** (frameworks): plugin model encaixa em hexagonal/slices.
- Liga com **P01** (testes): hexagonal facilita unit test.
- Liga com **S03** (event-driven): use cases emit domain events.
- Liga com **S06** (DDD): tactical patterns aplicados.
- Liga com **S08** (services): bounded context extract → service.
- Liga com **S12** (tech leadership): arquitetura é decisão coletiva.

---

## 6. Referências

- **"Clean Architecture"** — Robert C. Martin.
- **"Patterns of Enterprise Application Architecture"** — Martin Fowler.
- **"Implementing Domain-Driven Design"** — Vaughn Vernon (capítulos sobre architecture).
- **Alistair Cockburn, "Hexagonal Architecture"** ([alistair.cockburn.us/hexagonal-architecture](https://alistair.cockburn.us/hexagonal-architecture/)).
- **Jimmy Bogard, "Vertical Slice Architecture"** ([jimmybogard.com](https://www.jimmybogard.com/vertical-slice-architecture/)).
- **Feature-Sliced Design** ([feature-sliced.design](https://feature-sliced.design/)).
- **Mark Seemann, ploeh.dk** — DI, architecture.
- **"Software Architecture: The Hard Parts"** — Neal Ford et al.
- **"Fundamentals of Software Architecture"** — Mark Richards, Neal Ford.
