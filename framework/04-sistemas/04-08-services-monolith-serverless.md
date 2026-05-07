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

# 04-08, Services vs Monolith vs Serverless

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

### 2.19 Multi-tenancy: o eixo silencioso de Logística

Logística é multi-tenant (lojistas isolados). Decisão arquitetural ortogonal a "monolith vs services": **3 modelos de isolation**, com consequências em custo, blast radius e compliance.

| Modelo | Isolation | Custo | Quando |
|---|---|---|---|
| **Pool (shared)** | `tenant_id` discriminator + Postgres RLS | Baixo | SMB SaaS, milhares de tenants pequenos |
| **Bridge (silo parcial)** | Schema-per-tenant no mesmo DB | Médio | Mid-market, customização leve por tenant |
| **Silo (full)** | DB / cluster / VPC dedicado | Alto | Enterprise, regulatório (HIPAA, on-prem) |

**Pool com Row-Level Security**:
```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```
Cada conexão seta `app.tenant_id` no início; queries filtram automaticamente. Vantagem: impossível "esquecer o `WHERE tenant_id`". Limite: queries cross-tenant (analytics admin) precisam role privilegiado bypassando RLS.

**Noisy neighbor** é o demônio do pool: 1 tenant gigante lockando tabela ou esgotando connection pool degrada todos. Mitigação:
- **Connection pool partitioning** por tenant tier (premium tem N conexões dedicadas, free compartilha).
- **Rate limit por tenant**, não global (token bucket per `tenant_id` em Redis — ver 04-04).
- **Bulkheads**: workers/queues separados por tier.
- **Shard hot tenant**: mover tenant gigante pra silo dedicado (extração on-demand).

**Custos cross-cutting** que aparecem em multi-tenant escalado:
- Backups com PITR per-tenant (compliance pede isolation).
- Tenant deletion com retention legal (GDPR Article 17 + 30-90 dias retention).
- Per-tenant rate limit observability (quem está abusando?).
- Per-tenant cost allocation (showback / chargeback — ver 04-16).

**Game day obrigatório no v3 de Logística**: derrubar 1 tenant fictício de propósito (consumir 100% do pool, lockar tabela, gerar 10x throughput). Confirmar que demais tenants permanecem dentro do SLO. Se não permanecem, multi-tenancy é teatro.

Cruza com **02-09** (RLS), **04-04** (bulkheads, rate limit), **04-09** (sharding by tenant), **03-15** (per-tenant SLO).

### 2.20 Como decidir

Perguntas:
1. Time atual e expectativa próximos 12-24 meses?
2. Bounded contexts identificados?
3. SLO requirements e scale alvo?
4. Capacidade ops?
5. Latency budget aceitável de network entre componentes?
6. Tech stack uniformity vs diversity necessário?

Default: comece monolith modular. Extract services quando dor real (não imaginária) bate.

**Critérios objetivos pra extrair serviço** (todos, não 1 só):
1. Bounded context tem time owner dedicado.
2. Cadência de deploy diverge (1x/dia vs 1x/semana).
3. Requisitos de scale ou latência divergem (read-heavy vs write-heavy).
4. Modelo de dado se manteve estável por 6+ meses.

Sem 3+ desses, modular monolith é ROI superior.

### 2.21 Saga patterns deep — choreography vs orchestration, Temporal/Cadence, compensating transactions

Distributed transaction (2PC) é morta em microservices — performance ruim, dependência hard de coordinator, locks distribuídos travam o sistema sob carga. Saga é o substituto: long-running transaction modelada como sequência de local transactions com compensações em caso de falha. Duas variantes — choreography (event-driven) e orchestration (central coordinator) — com trade-offs claros. Temporal/Cadence/Step Functions são as runtimes 2026 production-ready pra durable workflow.

**Foundation: o problema concreto**

```
PlaceOrder envolve:
  1. ReserveInventory (Inventory service)
  2. ChargePayment (Payment service)
  3. AssignCourier (Dispatch service)
  4. SendNotification (Notification service)

Se step 3 falha, precisa:
  - Refund payment (compensate step 2)
  - Release inventory (compensate step 1)
```

**Choreography (event-driven)**

Cada serviço escuta events e emite events; sem coordinator central.

```
API → emite OrderRequested
Inventory consumer → reserva → emite InventoryReserved | InventoryFailed
Payment consumer (escuta InventoryReserved) → cobra → emite PaymentCharged | PaymentFailed
Dispatch consumer (escuta PaymentCharged) → assign → emite CourierAssigned | DispatchFailed
Notification consumer (escuta CourierAssigned) → send

Se DispatchFailed:
  Payment consumer escuta DispatchFailed → refund → emite PaymentRefunded
  Inventory consumer escuta PaymentRefunded → release → emite InventoryReleased
```

```typescript
// Inventory consumer (Kafka)
await consumer.run({
  eachMessage: async ({ topic, message }) => {
    const event = JSON.parse(message.value!.toString());
    if (topic === 'order-events' && event.type === 'OrderRequested') {
      try {
        await reserveInventory(event.orderId, event.items);
        await producer.send({
          topic: 'order-events',
          messages: [{ value: JSON.stringify({ type: 'InventoryReserved', orderId: event.orderId, sagaId: event.sagaId }) }],
        });
      } catch (reason) {
        await producer.send({
          topic: 'order-events',
          messages: [{ value: JSON.stringify({ type: 'InventoryFailed', orderId: event.orderId, sagaId: event.sagaId, reason: String(reason) }) }],
        });
      }
    }
    if (event.type === 'PaymentRefunded') {
      await releaseInventory(event.orderId);
      await producer.send({
        topic: 'order-events',
        messages: [{ value: JSON.stringify({ type: 'InventoryReleased', orderId: event.orderId, sagaId: event.sagaId }) }],
      });
    }
  },
});
```

- **Pros**: serviços loosely coupled; sem central point of failure; cada team owns its events.
- **Cons**: business logic distribuída entre N consumers — "where is the saga?" é difícil de saber. Debug exige traçar event chain. Cyclic listening é fácil de escrever mal (deadlock event loop).

**Orchestration (central coordinator)**

Um Saga Orchestrator é serviço que invoca steps explicitamente e compensações.

```typescript
class PlaceOrderSaga {
  async execute(input: { orderId: string; items: Item[]; userId: string }) {
    const compensations: Array<() => Promise<void>> = [];

    try {
      await inventory.reserve(input.orderId, input.items);
      compensations.unshift(() => inventory.release(input.orderId));

      const charge = await payment.charge(input.userId, computeTotal(input.items));
      compensations.unshift(() => payment.refund(charge.id));

      const assignment = await dispatch.assignCourier(input.orderId);
      compensations.unshift(() => dispatch.unassignCourier(assignment.id));

      await notification.send(input.userId, { type: 'OrderConfirmed', orderId: input.orderId });

      return { success: true };
    } catch (err) {
      for (const compensate of compensations) {
        try {
          await compensate();
        } catch (compErr) {
          alertOps({ sagaFailed: true, compErr, originalErr: err });
        }
      }
      throw err;
    }
  }
}
```

- **Pros**: business logic visível em um lugar; debug fácil; explicit dependencies.
- **Cons**: orchestrator vira tight coupling; coordinator é SPOF se mal-arquitetado; vira "god service" antipattern se overgrowth.

**Temporal/Cadence — saga como código durable**

```typescript
// Workflow definition (Temporal SDK)
import { proxyActivities, ApplicationFailure, workflowInfo } from '@temporalio/workflow';
import type * as activities from './activities';

const { reserveInventory, releaseInventory, chargePayment, refundPayment, assignCourier, unassignCourier, sendNotification } =
  proxyActivities<typeof activities>({
    startToCloseTimeout: '30 seconds',
    retry: { maximumAttempts: 3 },
  });

export async function placeOrderWorkflow(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const compensations: Array<() => Promise<void>> = [];

  try {
    await reserveInventory(input.orderId, input.items);
    compensations.unshift(() => releaseInventory(input.orderId));

    const charge = await chargePayment(input.userId, computeTotal(input.items));
    compensations.unshift(() => refundPayment(charge.id));

    const assignment = await assignCourier(input.orderId);
    compensations.unshift(() => unassignCourier(assignment.id));

    await sendNotification(input.userId, { type: 'OrderConfirmed' });

    return { sagaId: workflowInfo().workflowId, status: 'completed' };
  } catch (err) {
    for (const c of compensations) {
      await c(); // Temporal retries automatic
    }
    throw ApplicationFailure.create({ message: 'Saga compensated', type: 'SagaFailed' });
  }
}
```

- **Temporal garante**: workflow state persistido entre crashes; retry de activity automatic com backoff; código se parece com transação síncrona mas dura horas/dias.
- **Activity = side effect** (DB write, API call). Workflow é código determinístico (no random, no `Date.now()` direto, no I/O).
- Production-ready: Anthropic, Stripe, Snap, Datadog usam.

**Compensating transactions — design rules**

- **Compensation deve ser idempotente**: pode ser called 2x sem efeito duplicado (pode crash mid-compensation).
- **Order REVERSO**: compensate em LIFO order — last operation compensated first.
- **Compensation NÃO é "undo perfeito"**: refund de pagamento NÃO é exatamente "uncharge" (pode haver delay, fee). Documente semântica: "best-effort compensation", "eventual reversal", etc.
- **Não-compensable steps**: send email NÃO pode ser compensated. Posicione last (após all reversible steps).
- **Pivotal step**: o ponto onde "no turning back" — se passa, completa custo do que vier (ou degrada gracefully). Em PlaceOrder: charge bem-sucedido geralmente é pivotal.

**State machine vs free-form workflow**

- **State machine** (Step Functions, AWS): JSON spec declarativo de states + transitions. Bom pra workflows simples 5-10 steps; visualizável em UI.
- **Free-form code** (Temporal, Restate): full programming language; loops, conditionals, dynamic compensations. Bom pra workflows complexos, branching dinâmico.

**Choreography vs orchestration — decisão pragmática**

| Critério | Choreography | Orchestration |
|---|---|---|
| Steps independentes | Sim | OK |
| Debug facility | Hard | Easy |
| Time to onboard new dev | Slow (precisa entender event flow) | Fast (1 service) |
| Adicionar new step | Edita N consumers | Edita 1 orchestrator |
| Performance (latency end-to-end) | Igual ou melhor (parallel possível) | Sequencial por default |
| Fault tolerance | Excelente (loosely coupled) | Boa, mas orchestrator é crítico |
| When | 3-5 services com clear ownership | > 5 services ou business logic complexa |

**Logística decision**

- PlaceOrder: orchestration via Temporal — too many compensations + business critical visibility.
- StatusUpdate propagation: choreography via Kafka events — many consumers, parallel, decoupled.
- **Híbrido**: orchestrator publica events em key transition pra outros services consumirem (analytics, audit, ML).

**Anti-patterns observados**

- **Distributed monolith**: 5 services com tight coupling de events; mudança em qualquer um quebra todos. Sinal: PR toca > 2 services.
- **Saga sem timeout**: workflow stuck por dias/semanas se 1 step nunca completa. Set timeout per step + global.
- **Compensation que falha em silêncio**: "best effort" virando "no effort". Compensation falha = page humano.
- **Coordinator com state em-memória**: crash perde sagas em-flight. Use durable storage (Temporal, DB, ou similar).
- **Sem saga ID em logs**: impossível correlacionar steps em distributed trace. Propague `sagaId` em event headers + log fields.
- **Choreography com cyclic event dependencies**: A escuta B, B escuta C, C escuta A → infinite loop. Sequence diagram obrigatório.
- **Refund-then-charge-again** em vez de charge condicional: doubles fee, complica reconciliação. Pivotal step design.

**Tooling 2026**

- **Temporal (TypeScript/Go/Java/Python)**: market leader pra durable workflows.
- **Restate** (Rust-based, 2024): newer, lightweight, sem Cassandra dependency.
- **AWS Step Functions**: serverless, JSON spec, integrado com 200+ AWS services.
- **Camunda 8 / Zeebe**: BPMN-based, melhor pra workflows business-side com BPMN visual.
- **Inngest**: dev experience focused, queue + workflow combo.

Cruza com **04-08 §2.14** (event-driven escolha), [**04-02 §2.18**](../04-sistemas/04-02-messaging.md) (idempotent consumer é fundação), [**04-03 §2.8**](../04-sistemas/04-03-event-driven-patterns.md) (outbox pattern alimenta choreography), [**04-04**](../04-sistemas/04-04-resilience-patterns.md) (resilience patterns aplicam a saga steps), [**03-15**](../03-producao/03-15-incident-response.md) (incident response em saga stuck).

### 2.22 Strangler Fig migration deep — extracting services from monolith without downtime

**Strangler Fig pattern** (Martin Fowler, 2004). Nome vem do Strangler Fig vine — cipó que cresce ao redor da árvore hospedeira até substituí-la. Novo serviço roda lado a lado com legacy; funcionalidade migra gradualmente; legacy é retirado no final. Big-bang rewrites falham (~70% taxa de fracasso citada por Joel Spolsky em "Things You Should Never Do"); migração incremental é a única opção segura. Use cases: monolith → microservices, legacy stack → modern, vendor migration (Heroku → Railway, on-prem → cloud).

**Anatomia das 5 fases**

1. **Façade** — routing layer entre client e legacy (proxy / API Gateway).
2. **Extract** — build new service; subset de tráfego via façade.
3. **Verify** — shadow traffic / canary; diff outputs legacy vs new.
4. **Cutover** — 100% no new service; legacy dormante.
5. **Retire** — delete legacy code/resources após wait period.

**Phase 1 — Façade pattern**

Routing-only, zero business logic. Tools 2026: nginx, Caddy, AWS API Gateway, Cloudflare Workers, Envoy.

```nginx
# nginx façade routing
upstream legacy_monolith { server legacy.internal:8080; }
upstream orders_service  { server orders.internal:3000; }

server {
  listen 80;
  # New service handles /orders/* (subset)
  location /api/orders/ { proxy_pass http://orders_service; }
  # Legacy still handles everything else
  location /api/        { proxy_pass http://legacy_monolith; }
}
```

Legacy não sofre alteração nenhuma — façade é puro roteamento. Permite rollback instantâneo (flip route back).

**Phase 2 — Extract com dual-write**

Legacy escreve no próprio DB E publica evento / chama new service. Eventual consistency (lag pequeno legacy ↔ new) é aceitável. Better: outbox pattern (cruza com [**04-02 §2.18**](../04-sistemas/04-02-messaging.md)) pra dual-write confiável.

```ts
// In legacy monolith — naive dual-write
async function createOrderLegacy(data: OrderData) {
  const tx = await db.transaction();
  try {
    const order = await tx.orders.insert(data);
    // Dual-write to new service (substituir por outbox em prod)
    await fetch('http://orders.internal/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    });
    await tx.commit();
    return order;
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}
```

**Phase 3 — Verify (shadow + canary + diff)**

Shadow traffic: copia request pro new service, ignora response. Canary: 1-5% de tráfego real, monitora errors + latency. Diff testing: compara responses legacy vs new pro mesmo input.

```ts
// Shadow request middleware (fire-and-forget)
app.use(async (req, res, next) => {
  newOrdersService
    .fetch(req.url, req.method, req.body)
    .catch((e) => log.warn('shadow failed', e));
  next();
});
```

Tool: **GitHub Scientist** (Ruby; ports Node `node-scientist`) codifica "old vs new" diff testing — executa ambos, retorna old, loga divergências.

**Phase 4 — Cutover**

Option A — Big bang: flip façade pra 100% new service, rollback pronto. Option B — Gradual: 10% → 25% → 50% → 100% via traffic split. Argo Rollouts (cobre [**03-04 §2.20**](../03-producao/03-04-cicd.md)) pra K8s gradual cutover. Validar: error rate, p95/p99 latency, business metrics (orders/min unchanged).

**Phase 5 — Retire**

Wait period 2-4 semanas após cutover antes de deletar legacy code (rollback safety). Code archaeology: identificar todos entry points, deletar tests, remover do build. Database: legacy tables read-only primeiro; deprecation notice; eventually drop. Erro comum: deixar legacy rodando "just in case" pra sempre — dead weight + security risk.

**Anti-corruption Layer (ACL)** (cruza com [**04-06 §2.18**](../04-sistemas/04-06-domain-driven-design.md))

New service não deve herdar legacy schema warts. ACL traduz entre legacy data model e new domain model. Logística — legacy `tbl_pedido` (Portuguese, snake_case, denormalized) → new `Order` aggregate:

```ts
// ACL — adapter pattern
class LegacyOrderAdapter {
  static fromLegacy(row: TblPedidoRow): Order {
    return new Order({
      id: row.cod_pedido,
      customerId: row.cod_cliente,
      items: this.parseItems(row.itens_json),
      status: this.mapStatus(row.status_str),
      createdAt: new Date(row.dt_criacao),
    });
  }

  static toLegacy(order: Order): TblPedidoRow {
    return {
      cod_pedido: order.id,
      cod_cliente: order.customerId,
      itens_json: JSON.stringify(order.items),
      status_str: this.unmapStatus(order.status),
      dt_criacao: order.createdAt.toISOString(),
    };
  }

  private static mapStatus(s: string): OrderStatus {
    const map: Record<string, OrderStatus> = {
      PEND: 'placed',
      EM_TRANS: 'in_transit',
      ENT: 'delivered',
      CANC: 'cancelled',
    };
    return map[s] ?? 'unknown';
  }

  private static unmapStatus(s: OrderStatus): string {
    const inv: Record<OrderStatus, string> = {
      placed: 'PEND',
      in_transit: 'EM_TRANS',
      delivered: 'ENT',
      cancelled: 'CANC',
      unknown: 'PEND',
    };
    return inv[s];
  }
}
```

ACL bidirecional (fromLegacy + toLegacy) é obrigatório quando dual-write está ativo.

**Database migration patterns**

- **Same database, separate schemas**: legacy + new services compartilham Postgres com schemas isolados. Cheap, mas coupling de migrations.
- **Database per service**: full isolation; dual-write necessário; cleaner long-term.
- **CDC sync**: Debezium → CDC stream → new service consome → builds materialized view própria (cobre [**04-13 §2.18**](../04-sistemas/04-13-streaming-batch-processing.md)).
- **Logical replication subset**: Postgres native; só tables relevantes (cobre [**02-09 §2.21**](../02-plataforma/02-09-postgres-deep.md)).

**Logística applied — extracting `orders` from monolith**

- **Phase 1 (Week 1-2)**: nginx façade roteia `/api/orders/*` (read-only) pra new service mock.
- **Phase 2 (Week 3-6)**: build new orders service; legacy dual-writes via outbox.
- **Phase 3 (Week 7-10)**: shadow traffic; diff testing pega 5 schema mismatches; ACL corrige.
- **Phase 4 (Week 11-14)**: canary 5% → 25% → 100% over 3 weeks; metrics monitoradas.
- **Phase 5 (Week 15-18)**: 4-week wait; remove legacy `OrdersController` do monolith.
- **Total: 4-5 meses**; team 2-3 engineers; zero downtime.

**Anti-patterns observados**

- Big-bang rewrite "vai dar 3 meses" (70% fail rate; Joel Spolsky, "Things You Should Never Do, Part I", 2000).
- Phase 2 sem ACL → new service herda legacy schema warts (status strings PT-BR, snake_case, denormalização).
- Phase 3 skipped → no verification; cutover surpreende em prod.
- Dual-write sem outbox / transaction guarantee → orphan writes; data inconsistency.
- Façade com business logic → defeats purpose; deve ser routing-only.
- Phase 5 nunca executado → legacy persiste anos; dead code + security debt + cognitive load.
- Cutover sem rollback plan → one-way door; new service falha = prod down.
- Database compartilhado legacy + new → coupling; legacy schema migration quebra new service.
- ACL one-way (new → legacy missing) → dual-write incompleto; corrupção em writes do legacy.
- Migration team isolado de operations → stakeholders surpresos; comms críticos.

**Tooling 2026**

- **Façade**: nginx, Caddy, AWS API Gateway, Cloudflare Workers, Envoy.
- **Diff testing**: GitHub Scientist (Ruby), `node-scientist`, `scientist-py`.
- **Canary / traffic split**: Argo Rollouts, Flagger, AWS App Mesh, Istio VirtualService.
- **CDC**: Debezium, AWS DMS, Postgres logical replication.
- **Outbox**: Debezium outbox SMT, custom workers consuming `outbox_events`.

Cruza com [**04-06 §2.18**](../04-sistemas/04-06-domain-driven-design.md) (DDD ACL), [**04-07**](../04-sistemas/04-07-architectures.md) (architectures), [**04-02 §2.18**](../04-sistemas/04-02-messaging.md) (outbox pattern), [**04-13 §2.18**](../04-sistemas/04-13-streaming-batch-processing.md) (CDC sync), [**03-04 §2.20**](../03-producao/03-04-cicd.md) (CI/CD canary), [**02-09 §2.21**](../02-plataforma/02-09-postgres-deep.md) (Postgres logical replication).

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

1. **Decision Document, `ARCHITECTURE-DECISION.md`**:
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

- **"Building Microservices"**: Sam Newman (2nd ed).
- **"Monolith to Microservices"**: Sam Newman.
- **"Microservices Patterns"**: Chris Richardson.
- **Martin Fowler, "Microservices"** ([martinfowler.com/microservices](https://martinfowler.com/microservices/)).
- **Martin Fowler, "Strangler Fig"** ([martinfowler.com/bliki/StranglerFigApplication.html](https://martinfowler.com/bliki/StranglerFigApplication.html)).
- **DDIA** capítulos sobre distributed systems.
- **"Team Topologies"**: Skelton, Pais (Conway's Law moderno).
- **"Software Architecture: The Hard Parts"**: Neal Ford et al.
- **AWS Well-Architected, Serverless Lens**.
- **Charity Majors blog**: operational reality.
