---
module: 04-06
title: Domain-Driven Design, Bounded Contexts, Aggregates, Tactical
stage: sistemas
prereqs: [04-03]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 04-06, Domain-Driven Design

## 1. Problema de Engenharia

DDD virou buzzword. Times "fazem DDD" e produzem CRUD com vocabulário pomposo (Repository, ValueObject, Entity em todo lado) e pouco da disciplina real, modelo do domínio que reflete realidade, ubiquitous language, bounded contexts, refinamento contínuo via conversa com stakeholders. O resultado: código verbose, abstrações errôneas, e times que confundem padrões táticos com a essência.

Este módulo separa estrátégia (bounded contexts, context mapping, ubiquitous language) de tática (aggregates, value objects, domain events, repositories). Você sai sabendo aplicar DDD com sobriedade e identificar onde NÃO vale.

---

## 2. Teoria Hard

### 2.1 Eric Evans, 2003

Livro "Domain-Driven Design: Tackling Complexity in the Heart of Software". Premissa:
- Software complexo lida com realidade complexa do domínio.
- Modelar o domínio bem é tarefa central.
- O modelo emerge de conversa entre devs e domain experts.
- O modelo é refinado continuamente.

DDD não é estilo de código. É **disciplina de modelagem**.

### 2.2 Ubiquitous language

Vocabulário compartilhado entre devs e domain experts. Termos do código = termos da conversa.

Anti-padrão:
- Stakeholder fala "entrega", código fala "shipment".
- Stakeholder fala "cliente", código fala "user".

Fonte de bug latente: traduções implícitas. Padrão: glossário no repo, refinado em sprints.

### 2.3 Bounded Context

Modelo é coerente dentro de um contexto. Um termo significa coisas diferentes em contextos diferentes.

Em Logística:
- Contexto **Order Management**: `Order` é entidade central com status pipeline, items, total.
- Contexto **Routing**: `Order` é um stop com lat/lng e priority.
- Contexto **Billing**: `Order` é evento monetário.

Mesmo "Order" mapeando dados similares mas com perspective distinta. Não force "1 modelo to rule them all".

Bounded context dá **autonomia**: cada um pode evoluir, scale, choose stack independente.

### 2.4 Context map

Diagrama relações entre bounded contexts:

- **Shared kernel**: 2 contexts compartilham subset (cuidado).
- **Customer/Supplier**: upstream / downstream.
- **Conformist**: downstream copia upstream sem traduzir.
- **Anti-corruption layer**: downstream traduz upstream em domain próprio (defesa).
- **Open Host Service**: upstream expõe API estável.
- **Published Language**: schema canônico (events, OpenAPI).
- **Separate Ways**: contexts não interagem.
- **Big Ball of Mud**: anti-pattern, sem boundaries claros.

Discutir context map evita arquitetura acidental.

### 2.5 Strategic vs tactical

- **Strategic DDD**: identification de bounded contexts, language, context map, distillation de core domain. Modelagem de alto nível.
- **Tactical DDD**: padrões de implementação dentro de um bounded context.

**Strategic é o que mais importa**. Tactical sem strategic é cargo cult.

### 2.6 Core, Supporting, Generic subdomains

Não todo domínio tem mesmo valor:

- **Core**: diferencial competitivo. Onde investir engenharia.
- **Supporting**: necessário, único do biz, sem diferencial.
- **Generic**: pronto, comoditizado (auth, billing, email).

Em Logística, **routing inteligente** é core (você compete com isso). Auth é generic (use Auth0 ou implemente sem inovar). Billing é supporting (regras próprias mas sem rocket science).

DDD investe profundo em core; supporting com cuidado; generic compra ou usa pronto.

### 2.7 Tactical patterns

Aggregate (já vimos): cluster consistente. Aggregate root é única entry. Transações dentro de 1 aggregate. Cross-aggregate via events/saga.

**Entity**: identity persistente (`Order` tem id; identidade é o id, não os atributos).
**Value Object**: identidade pelos atributos. Imutável. (`Address` com street/city, 2 addresses iguais são "iguais", sem id).
**Domain Service**: lógica que não cabe naturalmente em entity/VO. Stateless.
**Domain Event**: algo que aconteceu, com significado de domínio (`OrderDelivered`).
**Repository**: abstração pra persistência. "Like a in-memory collection". Hide DB details.
**Factory**: encapsula criação complex de aggregate.
**Specification**: encapsula query/filter como objeto.

Em projetos JS/TS modernos, "Repository" pode ser exagero, `db.query` em camada simples cobre. Não force pattern; use quando complexidade emerge.

### 2.8 Aggregate design rules

- Pequeno é bom. Aggregate inteiro carregado em memory; transação encompasses-o.
- 1 aggregate per transaction. Cross-aggregate via events.
- Reference outros aggregates por **id** (não navegação direta).
- Invariants enforced no aggregate root.
- Em N+1 reads, considere CQRS read models.

Anti-padrão: aggregate gigantesco abrange domínio inteiro. Lock contention, slow loads.

#### Heurísticas concretas pra dimensionamento

Como decidir o que entra ou sai de um aggregate é onde Senior se diferencia. Critérios em ordem de peso:

1. **Invariant boundary** (peso máximo): se 2 entidades compartilham regra de consistência **transacional** ("soma de items = total do pedido"), ficam no mesmo aggregate. Se a regra tolera eventual ("notificação enviada após pedido criado"), separa.
2. **Lifecycle alinhado**: criado/deletado juntos? Mesmo aggregate. Lifecycles independentes? Separe.
3. **Co-modificação**: análise de últimos 6 meses de PRs — se duas entidades sempre mudam juntas, possivelmente mesmo aggregate. Se cada uma evolui isolada, separe.
4. **Tamanho carregado**: aggregate com >50 entities carregadas em transação típica = red flag. Latência de fetch + lock contention vão doer.
5. **Concurrency contention**: alta probabilidade de 2+ users editando concurrent? Subdivide pra reduzir contenção.

**Sinais que aggregate ficou grande demais:**

- Repository tem método `loadXWithFullDependencies` que joina 5+ tabelas.
- 1 update no aggregate trava locks em rows não relacionadas semanticamente.
- Você adiciona campos só pra evitar fetch de outro aggregate ("vou guardar courierName no Order pra não precisar carregar Courier").
- Testes do domínio precisam construir fixture de 200 linhas pra qualquer cenário.
- Over 500 lines de código no `Order.java` / `order.ts`.

**Caso real Logística — refactor de Order:**

V1 (anti-padrão, common em apps imaturos):
```typescript
class Order {
  id: OrderId; tenantId: TenantId; status: OrderStatus;
  customer: Customer;                        // entidade carregada
  items: OrderItem[];                        // 1-50 items
  payments: Payment[];                       // histórico de tentativas
  shipments: Shipment[];                     // múltiplos splits
  trackingPings: TrackingPing[];             // N pings GPS (centenas)
  notes: Note[];                             // notas colaborativas

  addPing(p: TrackingPing) { this.trackingPings.push(p); /* save aggregate inteiro */ }
}
```

Cada GPS ping (1/30s) re-salva pedido inteiro. Lock contention enorme; latência subindo.

V2 (refactor com critérios acima):

| Aggregate | Entities root | Invariants protegidos |
|---|---|---|
| **Order** | Order + OrderItems + OrderTotal | sum(items.price) = order.total; status state machine |
| **PaymentLedger** (separado) | PaymentAttempt list | idempotency keys, total captured ≤ authorized |
| **Shipment** (separado) | Shipment + ShipmentItems | splits válidos cobrem all OrderItems |
| **TrackingHistory** (separado, time-series, não DDD aggregate) | TrackingPing append-only stream | nenhum (write-only stream) |
| **OrderNotes** (CRDT, ver 04-01) | Y.Doc per order | convergência eventual |

Cross-aggregate: events. `OrderCreated` → notification + analytics. `PaymentCaptured` → atualiza Order status via handler que **carrega Order, atualiza, salva** — NÃO joga payment dentro do aggregate Order.

#### Quando aggregate é "grande demais" mas você não pode quebrar agora

Migração incremental:
1. Identifique campo/coleção de alta contention.
2. Crie repository separado pra ele com `id_aggregate_pai` como FK.
3. Migra writes (queue jobs) sem mexer em reads ainda.
4. Migra reads (CQRS read model que junta).
5. Remove código no aggregate antigo.

Cada passo deployable, reversível. Nunca faça big-bang refactor de aggregate em produção sem feature flag + canary.

Cruza com **04-03** (events cross-aggregate via outbox), **02-09 §2.13.1** (CDC viabiliza views derivadas sem dual-write), **04-08 §2.20** (extract criteria; mesma lógica pra serviços).

### 2.9 Domain events

Eventos do domínio comunicam mudanças significativas:
- Past tense, domain-vocabulary.
- Imutáveis.
- Carry minimum info (event-notification) ou state (event-carried).
- Emitidos pelo aggregate.

Diferença com integration events:
- **Domain event**: dentro do bounded context. In-process bus.
- **Integration event**: cross context. Broker (Kafka/etc.).

Map: domain event no aggregate → publisher transforma em integration event quando relevante a outros contexts (com schema versioned).

### 2.10 Modular monolith with bounded contexts

Você não precisa microservices pra fazer DDD. **Modular monolith com módulos = bounded contexts** é poderoso:
- 1 deployable.
- Módulos comunicam via in-process events / public APIs claras.
- Refactor pra serviço só quando dor justifica.

Java tem Spring Modulith; .NET tem similar; em TS, convenção via package monorepo + lint rules.

### 2.11 Onde DDD não vale

- CRUD trivial sem regras complexas. Apenas tabelas e endpoints.
- Pre-domain-clarity (early startup pivoting); fica difícil refatorar abstrações boas se domain ainda é incerto.
- Time pequeno + domain simples.

Adopt-when-pain-justifies.

### 2.12 Event Storming

Método pra descobrir domínio coletivamente. Walls com sticky notes:
- Orange: domain events.
- Blue: commands.
- Yellow: aggregates.
- Pink: hot spots / dúvidas.
- Purple: policies.

Workshops com stakeholders + devs. Descobre bounded contexts, ubiquitous language, processo real.

Vlingo, Alberto Brandolini popularizaram.

### 2.13 Refactoring toward DDD

Codebase legacy:
- 1: identifique bounded contexts (dores frequentes, mudanças que sempre tocam mesma área).
- 2: estabeleça module boundaries.
- 3: dependa por interfaces, não by import direto.
- 4: ubiquitous language refresh: renomeie pra match domain.
- 5: aggregate emerge naturalmente quando você nota grupo de tabelas que sempre transaciona junto.

Não pare tudo pra "fazer DDD"; refactor incremental.

### 2.14 DDD com event sourcing

ES + DDD são amigos: aggregates emit events; events são domain-language artifacts; replay reconstruct aggregate.

Greg Young, Vaughn Vernon: combinação canônica.

### 2.15 Antipadrões comuns

- **Anemic domain model**: entities só getters/setters; lógica em "service" externo. Perde encapsulamento.
- **Tactical-only DDD**: aplica padrões sem strategic. Codebase pesado sem benefit.
- **Aggregate gigante**: contention.
- **Naming hipster**: `OrderEntityFactoryProvider`. Use linguagem do domínio.
- **Repository pattern em CRUD trivial**: adds layer sem benefit.

### 2.16 Aplicação no Logística

Bounded contexts candidates:
- **Order Management**: lifecycle de pedido, status.
- **Routing & Dispatch**: matching courier-pedido, optimization.
- **Courier Management**: profile, status, location.
- **Billing**: cobrança, payouts.
- **Notifications**: push, email, SSE.
- **Analytics**: read-side de tudo.

Cada um com modelo próprio. Order em Routing é diferente de Order em Billing.

### 2.17 Specification pattern e invariants no código

Specification pattern encapsula regra de negócio como objeto de primeira classe — combinável, reusável e testável isoladamente. Sem ele, a mesma regra ("este courier pode aceitar este pickup?") aparece duplicada em controller, service, query filter, UI e batch job. Cada cópia drifta no seu próprio ritmo; bug fix em um lugar não propaga. Specification força single source of truth da regra e ainda traduz para SQL — o mesmo predicate roda em-memória (validação de candidate único) e como `WHERE` clause (query de batch).

#### Interface base e composição

```typescript
interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
  and(other: Specification<T>): Specification<T>;
  or(other: Specification<T>): Specification<T>;
  not(): Specification<T>;
}

abstract class CompositeSpecification<T> implements Specification<T> {
  abstract isSatisfiedBy(candidate: T): boolean;
  and(other: Specification<T>) { return new AndSpecification(this, other); }
  or(other: Specification<T>) { return new OrSpecification(this, other); }
  not() { return new NotSpecification(this); }
}

class AndSpecification<T> extends CompositeSpecification<T> {
  constructor(private left: Specification<T>, private right: Specification<T>) { super(); }
  isSatisfiedBy(c: T) { return this.left.isSatisfiedBy(c) && this.right.isSatisfiedBy(c); }
}
// OrSpecification, NotSpecification idem.
```

Specs concretas no Logística:

```typescript
class CourierIsAvailable extends CompositeSpecification<Courier> {
  isSatisfiedBy(c: Courier) { return c.status === 'available' && c.activeOrders < c.maxConcurrent; }
}

class CourierIsInRadius extends CompositeSpecification<Courier> {
  constructor(private lat: number, private lng: number, private radiusM: number) { super(); }
  isSatisfiedBy(c: Courier) { return haversine(c.lat, c.lng, this.lat, this.lng) <= this.radiusM; }
}

class CourierMeetsVehicleRequirement extends CompositeSpecification<Courier> {
  constructor(private required: VehicleType) { super(); }
  isSatisfiedBy(c: Courier) { return c.vehicleType === this.required; }
}

const eligible = new CourierIsAvailable()
  .and(new CourierIsInRadius(order.lat, order.lng, 5000))
  .and(new CourierMeetsVehicleRequirement(order.requiredVehicle));
```

#### Tradução para SQL — o killer feature

```typescript
interface SqlSpecification<T> extends Specification<T> {
  toSqlClause(paramOffset: number): { sql: string; params: unknown[] };
}

class CourierIsAvailableSql extends CourierIsAvailable implements SqlSpecification<Courier> {
  toSqlClause(offset: number) {
    return { sql: `status = $${offset} AND active_orders < max_concurrent`, params: ['available'] };
  }
}
```

Composite traduz `and()` para `AND` SQL, indexando params em ordem. Resultado: a mesma `eligible.toSqlClause()` vira `WHERE status = $1 AND active_orders < max_concurrent AND ST_DWithin(location, ST_MakePoint($2, $3)::geography, $4) AND vehicle_type = $5`. Sem isso, querer paridade entre validação in-memory e query batch obriga manter duas cópias da regra — drift garantido em 6 meses.

#### Invariant vs precondition vs validation

Distinção operacional, não acadêmica:

- **Invariant**: condição que o aggregate sempre satisfaz (`Order.total >= 0`, `sum(items.subtotal) === total`). Enforced no constructor e no fim de todo método mutador. Violação é bug — lança `InvariantViolation` (não recuperável). Coberto por unit test do aggregate.
- **Precondition**: estado necessário para uma operação (`Order.confirm()` requer `status === 'pending'`). Violação é fluxo legítimo — retorna `Result<_, PreconditionFailed>` com razão explícita. API responde 422 com mensagem.
- **Validation**: input cru de boundary (HTTP body, form). Validar com Zod / class-validator no controller. Aggregate confia que inputs já vieram tipados e válidos; nunca repete validação de formato.

Misturar os três é fonte de bug clássica: validação de email no aggregate (deveria ser no boundary), precondition tratada como invariant (crash em vez de 422), invariant silenciada com `if` defensivo (corrompe estado aos poucos).

#### Encoding patterns

- Constructor privado + smart constructor `Order.create(...)` retornando `Result<Order, InvariantViolation>`. Caller é forçado a tratar falha; impossível instanciar Order inválido.
- Sem setters públicos. Mutação só por método de domínio (`confirm`, `cancel`, `addItem`) que valida precondition e re-checa invariant.
- Value objects (`Money`, `Email`, `OrderId`) validam uma vez na criação; aggregate consome sem re-validar.
- `assertInvariants()` privado chamado no fim de todo método mutador. Centraliza checks; não dispersa.

#### Aggregate completo com pattern

```typescript
class Order {
  private constructor(
    readonly id: OrderId,
    private status: OrderStatus,
    private items: ReadonlyArray<OrderItem>,
    private total: Money,
  ) {
    this.assertInvariants();
  }

  static create(items: OrderItem[], currency: Currency): Result<Order, InvariantViolation> {
    if (items.length === 0) return Err(new InvariantViolation('Order must have at least 1 item'));
    const total = items.reduce((acc, i) => acc.add(i.subtotal), Money.zero(currency));
    return Ok(new Order(OrderId.new(), OrderStatus.Pending, items, total));
  }

  confirm(): Result<void, PreconditionFailed> {
    if (this.status !== OrderStatus.Pending) return Err(new PreconditionFailed('Order is not pending'));
    this.status = OrderStatus.Confirmed;
    this.assertInvariants();
    return Ok();
  }

  private assertInvariants() {
    if (this.total.isNegative()) throw new InvariantViolation('Order total cannot be negative');
    if (this.items.length === 0) throw new InvariantViolation('Order cannot have zero items');
    const sum = this.items.reduce((acc, i) => acc.add(i.subtotal), Money.zero(this.total.currency));
    if (!sum.equals(this.total)) throw new InvariantViolation('Order total mismatch with items sum');
  }
}
```

#### Anti-padrões observados

- **Anemic domain model**: setter em tudo, lógica em `OrderService` externo. Aggregate vira DTO; invariant vaza para múltiplos services e drifta.
- **Specification só in-memory, sem `toSqlClause()`**: para filtrar 50k couriers elegíveis, código resgata todos do banco e filtra em JavaScript. OOM em produção. Specification com SQL força paridade e empurra o trabalho para o índice.
- **Validação duplicada controller + aggregate**: Zod no boundary E `if (!email.includes('@'))` dentro do aggregate. Decida: aggregate trusts (boundary valida) OU aggregate é o boundary (sem validation layer). Não os dois.
- **`if (status === 'pending') ... else if (...)` espalhado**: substitua por specification com `toSqlClause()` que reusa em query e em código.
- **Testar specification via mock de aggregate**: testa **specification standalone** com POJOs. Aggregate test cobre só composição (que ele consome a spec correta).

#### Quando specification pattern é overkill

- CRUD trivial sem regras combináveis (admin panel, settings).
- Regras puramente de UI (form validation visual). Use Zod direto no componente.
- Time de 2 devs em MVP: cerimônia sem ROI até regras se multiplicarem.
- Roll-out incremental: comece com 2-3 specs nas regras mais espalhadas (courier eligibility, order confirmation, refund policy). Expanda só quando padrão prova valor.

Cruza com **04-06 §2.7** (tactical patterns são fundação), **04-06 §2.8** (aggregates carregam invariants), **[04-03 §2.4](../04-sistemas/04-03-event-driven-patterns.md)** (event sourcing precisa invariants explícitas para replay determinístico), **[02-09 §2.7.1](../02-plataforma/02-09-postgres-deep.md)** (specifications viram queries SQL com índices apropriados).

### 2.18 Bounded contexts identification + Event Storming workshop deep

Identificar bounded contexts (BC) errado é a falha mais cara em DDD: borders no lugar errado produzem distributed monolith — services com cardinalidade alta de chamadas síncronas entre si, deploy acoplado, 5x complexidade operacional sem ganho de autonomy. Borders certos entregam deploy independente, autonomy de team e linguistic consistency interna (cada context com ubiquitous language coerente; mesmo termo significa coisa única dentro do context). Eric Evans, canônico: "A bounded context is the conditions under which a particular model is defined and applicable." Fora desse range, o modelo deixa de valer — e tentar esticá-lo é o caminho mais rápido pro Big Ball of Mud.

#### Heuristics pra identificar BC borders

- **Linguistic shifts**: o mesmo termo significando coisas diferentes em parts da organização. "Order" pra Sales = quote/contract draft pré-pagamento; "Order" pra Fulfillment = caixa sendo embalada/expedida. Mesma palavra, model diferente — fronteira de context detectada.
- **Team/org boundaries** (Conway's Law inevitável): teams que cooperam sustentavelmente convergem num BC; teams dispersos em conflito perpétuo viram BCs separados. Fingir o oposto produz integração que ninguém mantém.
- **Lifecycle differences**: Customer registration (long-lived, baixa frequência de mudança) vs Order processing (alto volume, mudança rápida) → cadências divergentes, BCs separados. Misturar força ritmo de deploy do mais lento sobre o mais rápido.
- **Stakeholder alignment**: BCs com business owners distintos (Sales VP vs Ops VP) divergem em prioridade e roadmap; reconhecer cedo evita disputa de backlog crônica.
- **Data ownership**: tabela com 47 colunas onde 12 servem Sales e 30 servem Fulfillment é o sintoma clássico de 2 contexts entrelaçados num único schema.

#### Context Map types (Eric Evans)

- **Partnership**: dois contexts cooperam mutuamente; APIs evoluem coordenadas. Exige relacionamento real entre teams.
- **Shared Kernel**: subset de model compartilhado entre 2 contexts. Cuidado: sem governance compartilhado vira coupling tóxico de facto.
- **Customer-Supplier**: upstream provê API; downstream tem influence pra priorizar features. Relação saudável quando upstream aceita backlog do downstream.
- **Conformist**: downstream apenas adapta-se ao upstream sem influence. Aceitável só quando upstream é estável e o custo de ACL não compensa.
- **Anti-corruption Layer (ACL)**: downstream protege seu model via translation layer (detalhado em §2.13). Padrão default ao integrar legacy.
- **Open Host Service**: upstream publica protocolo público estável (REST/GraphQL/Events). Investimento alto inicial, payoff em N consumers.
- **Published Language**: schema acordado entre múltiplos contexts (OpenAPI, AsyncAPI, Avro). Reduz N×M tradução pra N+M.
- **Separate Ways**: 2 contexts não interagem; decisão deliberada pra evitar integração de baixo valor.
- **Big Ball of Mud**: existência reconhecida explicitamente; isolar atrás de ACL e nunca expor downstream.

#### Event Storming — origem e variantes

Alberto Brandolini, ~2013. Workshop colaborativo pra discover business processes via timeline of events em past tense. Três variantes operacionais:

- **Big Picture Event Storming** (1-2 dias): explora o domínio inteiro; output = mapa de eventos + candidate BCs.
- **Process Modelling** (4-8h): zoom em sub-process específico; adiciona policies, read models, external systems.
- **Software Design Event Storming** (multi-week): refina pra implementação; identifica aggregates, commands, sagas.

#### Big Picture — passo-a-passo operacional

Materiais: parede de 5-10m em papel kraft, post-its laranja (events), roxo (policies/processes), amarelo (actors), azul (commands), rosa (hot spots/problems), verde (read models), Sharpies pretos. Sem laptops abertos.

- **Step 1 — Chaotic exploration** (30min): todos jogam events em ordem temporal aproximada, sem coordenação. Past tense obrigatório: `OrderPlaced`, `CourierAssigned`, `OrderShipped`, `PaymentFailed`. Linguagem do business, nunca técnica (`RowInserted` é ruído).
- **Step 2 — Enforce timeline** (45min): reorder cronológico, dedup, identificar pivotal events (com major business consequence: legal, financial, customer-facing).
- **Step 3 — Hot spots** (rosa): "Quando X falha?", "Quem decide?", "Onde acontece race condition?". Visíveis pra business stakeholders — geram conversa que nunca aconteceria em reunião normal.
- **Step 4 — Pivotal events**: marcar com barreira vertical na parede; viram candidatos óbvios pra BC borders.
- **Step 5 — Walking the timeline**: contar a story start-to-finish em voz alta. Gaps na narrativa = events faltando.
- **Step 6 — Identify BCs**: clusters de events ao redor de pivotal events. Domínio médio resolve em 5-9 BCs (Sales, Fulfillment, Inventory, Billing, Identity, etc.).

#### Process Modelling — refinement

Foco em 1 sub-process (e.g., `AssignOrderToCourier`). Adiciona:

- **Policies** (roxo): "Whenever order placed AND courier idle in radius, assign". Reativas a events.
- **Read models** (verde): "Available couriers list", "Order tracking dashboard". Projeções pra decisão humana ou de policy.
- **External systems** (rosa peg): "Mapbox routing API", "Stripe charge". Marca dependency externa explícita.

Output: candidate aggregate borders, command handlers, projections — input direto pra Software Design.

#### Software Design — outputs concretos

Flow canônico: **Command** (azul) → **Aggregate** (yellow background, agrupa events emitidos) → **Events** (laranja). Policies (roxo) reagem a events e emitem commands, iniciando sagas. Read models (verde) consomem events e expõem projeções pra UI/queries.

#### Logística — output do Event Storming

BCs identificados:

- **Catalog**: lojista cadastra produtos/SKUs; baixo volume, baixa frequência de mudança.
- **Orders**: ciclo pickup → delivery; high volume, source of truth do estado da entrega.
- **Routing**: alocação courier ↔ order, otimização VRP, real-time matching.
- **Tracking**: real-time location, status updates, projection consumida por app do customer.
- **Billing**: lojista paga subscription + per-delivery; courier recebe payout. Compliance financeiro isolado.
- **Identity**: auth, tenants, users, roles. Stable, reused por todos os outros BCs via JWT claims.

Pivotal events: `OrderPlaced` (cross-BC, dispara Routing), `CourierAssigned` (Routing → Orders), `Delivered` (cross-BC, fecha Order e dispara Billing).

Context Map:

- **Orders ←ACL→ Catalog**: traduz SKU details pra value object interno do Order; mudança de schema em Catalog não vaza.
- **Orders ←Customer/Supplier→ Routing**: Routing publica `CourierAssigned`; Orders prioriza features no backlog do Routing (latência de match, retry policy).
- **Orders →Open Host (events)→ Billing**: events `Delivered` no broker; Billing consome com schema versionado (Published Language em AsyncAPI).
- **Tracking ←Conformist→ Orders**: apenas reage a events; aceita schema do Orders sem negociação.
- **Identity →Open Host (REST)→ todos**: stable, baixa cadência de mudança; consumers conformistas são aceitáveis aqui.

Aggregate borders: `Order` (per pickup-delivery cycle), `Courier` (per courier, com status e capacidade), `Subscription` (per tenant, ciclo de billing).

#### Workshop facilitation — regras não-negociáveis

- **Mix de participants**: 1-2 senior devs, product manager, business expert, ops, 1 designer. Sem hierarchy: tech lead NÃO domina; business expert tem voice igual.
- **Standing only**: sentar mata workshop em 30min. Energia cai, post-its param de aparecer.
- **Time-box rigoroso**: 30min chaotic, 45min reorder, etc. Sem cronômetro, expande pra 12h sem outcome.
- **Photo-document constantemente**: parede será desmontada; photos viram artifact de decisão referenciado meses depois.
- **NÃO codar durante workshop**: "abrir laptop pra checar uma coisa" mata momentum; agenda follow-up técnico separado.

#### Refactoring legacy → DDD bounded contexts

- **Strangler Fig**: novo context substitui slice de legacy gradualmente; ACL traduz entre old/new durante transição. Nunca big-bang rewrite.
- **Modularize before split**: extrair module dentro do monolith antes de extrair service. Module boundary é cheaper to refactor — erros custam horas, não semanas.
- **Database per context**: separar schemas Postgres antes de databases físicas. Foreign keys cross-schema viram red flag explícito.
- **Numbers reais**: refactor monolith → 5 contexts geralmente leva 6-12 **meses**, não 6-12 semanas. Roadmap que promete o contrário está mentindo pra stakeholder.

#### Anti-padrões observados

- BC borders desenhados em whiteboard antes de Event Storming — premature decisions baseadas em assumption de quem fala mais alto.
- Event Storming sem business participants — só dev na sala vira exercise técnico, perde a discovery real.
- Shared Kernel mantido sem governance compartilhado — coupling tóxico de facto, ninguém dono.
- "Common" library compartilhada entre contexts com domain types — ACL invertido, mudança em um context quebra todos.
- BC com 1 aggregate — overkill; BC é design unit, não org chart.
- BC com 30 aggregates — granularity errada; provável que sejam 3-5 contexts merged à força.
- Event names em present tense ou imperative (`CreateOrder` em vez de `OrderCreated`) — revela confusão command vs event.
- Policy implementada dentro do aggregate — acopla aggregate a regras out-of-context, quebra single responsibility.
- Conformist aceito sem questionar — downstream livre de adaptar, mas frequentemente ACL é o pattern correto.
- Workshop documentado só em fotos sem session notes estruturadas — artifacts perdem context após 6 meses, decisões viram folclore.

Cruza com **[04-03 §2.1](../04-sistemas/04-03-event-driven-patterns.md)** (events em DDD são building blocks de Event Storming → implementation), **[04-08](../04-sistemas/04-08-services-monolith-serverless.md)** (modular monolith com BCs antes de split físico), **[04-12](../04-sistemas/04-12-tech-leadership.md)** (Conway's Law inevitável; team topology dita BC viability), **[02-09 §2.7.1](../02-plataforma/02-09-postgres-deep.md)** (schema-per-BC em Postgres antes de database físico separado), **[04-02](../04-sistemas/04-02-messaging.md)** (Published Language como AsyncAPI entre contexts).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Distinguir strategic e tactical DDD.
- Definir bounded context com 1 caso real.
- Listar 4 patterns de context mapping.
- Diferenciar core, supporting, generic subdomains.
- Aggregate design rules em 4 pontos.
- Domain event vs integration event.
- 3 anti-padrões DDD.
- Quando NÃO usar DDD.
- Event Storming basics.
- Modular monolith + bounded contexts vs microservices.

---

## 4. Desafio de Engenharia

Refatorar **Logística** rumo a modular monolith DDD.

### Especificação

1. **Strategic discovery**:
   - Conduza Event Storming (sozinho ou com 1-2 amigos): liste events do domínio (sticky-style em Miro/Excalidraw).
   - Identifique bounded contexts (mínimo 4: Order Management, Routing, Courier, Billing).
   - Documente ubiquitous language (glossário), pelo menos 20 termos.
2. **Modularização**:
   - Reorganize código em módulos por bounded context (`src/order-management/`, `src/routing/`, etc.).
   - Public API por módulo (export limitado); internal não escapa.
   - ESLint rule: módulo X só importa de módulo Y se permitido.
3. **Ubiquitous language**:
   - Renomeie nomes que divergiam do domínio.
   - Documente vocabulário em README do módulo.
4. **Tactical em Order Management**:
   - `Order` aggregate com root + events.
   - Methods invariant-enforcing (`order.markPickedUp(courierId, ts)`, checa status, courier assigned).
   - Domain events (`OrderPickedUp`) emitted.
   - Repository abstrai persist, retorna fully-loaded aggregate.
5. **Cross-context comunication**:
   - In-process event bus pra domain events em mesmo deployment.
   - Order Management publica `OrderAssigned` → Courier Management reage atualizando status courier; Notifications reage emitindo push.
   - Integration events (em broker, 04-02/04-03) só onde cross-deploy.
6. **Anti-corruption layer**:
   - Module Routing recebe `Order` de Order Management mas tem próprio `RoutableStop` (mapeia campo necessários, ignora o resto).
7. **Strategic decisions documented**:
   - `ARCHITECTURE.md` com:
     - Context map.
     - Subdomain classification (core/supporting/generic).
     - Decisões: por que Routing é candidato a serviço separado (03-11 Rust)? Por que Auth é generic (poderia trocar Auth0 sem dor)?
8. **Refactor non-DDD areas**:
   - Algumas áreas (CRUD de tenant settings) ficam simples. Documente que NÃO valem tactical patterns.

### Restrições

- Sem dividir tudo em microservices. Modular monolith.
- Sem aggregates gigantes (limite ~5 entities por aggregate).
- Sem repository em CRUD trivial.

### Threshold

- README documenta:
  - Context map diagrammed.
  - Glossário ubiquitous language.
  - Decisão core/supporting/generic.
  - 1 antes/depois: módulo refactorado mostrando ganho de clareza.
  - 1 cross-context flow seguido (event published → consumed).
  - 1 caso onde você decidiu NÃO usar DDD pattern.

### Stretch

- Spring Modulith-style module check em CI.
- Event Storming workshop real com 2-3 amigos não-técnicos.
- 1 bounded context extracted pra serviço separado (Routing → Rust do 03-11). Demonstre ACL.
- Hexagonal/Ports-Adapters dentro de bounded context.
- Event sourcing in Order context (04-03).

---

## 5. Extensões e Conexões

- Liga com **02-08** (frameworks): hexagonal app structure.
- Liga com **02-09** (Postgres): aggregates → tables; transactions per aggregate.
- Liga com **04-03** (event-driven): domain events ↔ integration events.
- Liga com **04-05** (API): API = published language do bounded context.
- Liga com **04-07** (architectures): hexagonal, clean, onion.
- Liga com **04-08** (services vs monolith): bounded context é unidade candidata a serviço.
- Liga com **04-12** (tech leadership): DDD requires conversa stakeholders.

---

## 6. Referências

- **"Domain-Driven Design"**: Eric Evans (2003).
- **"Implementing Domain-Driven Design"**: Vaughn Vernon (2013).
- **"Domain-Driven Design Distilled"**: Vaughn Vernon (curto).
- **"Learning Domain-Driven Design"**: Vlad Khononov (mais moderno, 2021).
- **"Domain-Driven Design Quickly"**: InfoQ free.
- **Alberto Brandolini, "Introducing EventStorming"**.
- **"Patterns, Principles, and Practices of Domain-Driven Design"**: Scott Millett, Nick Tune.
- **Vaughn Vernon's blog and talks**.
- **DDD Crew** ([github.com/ddd-crew](https://github.com/ddd-crew)), collected resources.
