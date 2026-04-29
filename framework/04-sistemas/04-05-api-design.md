---
module: 04-05
title: API Design Avançado — REST, GraphQL, gRPC, OpenAPI, Versioning
stage: sistemas
prereqs: [02-08, 04-03]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 04-05 — API Design Avançado

## 1. Problema de Engenharia

API mal desenhada vira dívida que não some. Endpoints inconsistentes, status codes inventados, paginação por offset em tabelas grandes, filtros com query strings sem schema, versioning ausente, breaking changes sem deprecation, GraphQL adotado pra projeto que não precisa, gRPC obrigando time inteiro a virar polyglot. Cada decisão tem custo de longo prazo.

Este módulo é design API com profundidade: REST com maturity, paginação, filtragem, idempotência, versioning, documentation, evolução, GraphQL trade-offs, gRPC casos de uso, JSON:API spec, OpenAPI, REST hypermedia, Problem Details. Você sai sabendo desenhar API que sobrevive 3+ anos sem rewrite.

---

## 2. Teoria Hard

### 2.1 REST maturity (Richardson)

- **Level 0**: HTTP como transporte (SOAP-style RPC over HTTP).
- **Level 1**: resources (URLs separadas por entidade).
- **Level 2**: HTTP verbs (GET/POST/PUT/DELETE com semantics) e status codes (200/201/204/4xx/5xx).
- **Level 3**: HATEOAS — responses com links pra ações próximas.

Maioria dos APIs "REST" estão em Level 2. Level 3 raro mas robusto pra discovery.

### 2.2 Verb semantics e idempotência

- **GET**: safe (sem efeito) e idempotent.
- **HEAD**: idem GET sem body.
- **OPTIONS**: descrever recurso (CORS preflight).
- **POST**: cria. **Não idempotent** sem idempotency key.
- **PUT**: substitui. Idempotent.
- **PATCH**: atualiza parcial. **Não necessariamente idempotent**.
- **DELETE**: remove. Idempotent.

Status codes (RFC 9110):
- 200 OK, 201 Created, 202 Accepted, 204 No Content.
- 301 Moved Permanently, 302 Found, 304 Not Modified.
- 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 412 Precondition Failed, 422 Unprocessable Entity, 429 Too Many Requests.
- 500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout.

Cada um carrega significado. **Não invente** ou abuse 200 com error body.

### 2.3 Resource design

- **Plural** consistente: `/orders`, não `/order`.
- **Hierarchy**: `/orders/{id}/events`.
- **Filtering** via query: `/orders?status=pending&tenant=acme`.
- **Action endpoints** quando recurso não modela: `/orders/{id}/cancel` (POST). Não force tudo em CRUD puro.

Anti-padrões:
- Verb em path: `/getOrder`.
- Inconsistência: `/orders` e `/userList`.
- POST pra leitura por preferência (CSRF excuse — use cookie SameSite ou JWT).

### 2.4 Pagination

- **Offset/limit**: `?offset=20&limit=10`. Simples mas problema em offsets grandes (DB skip lento) e instabilidade durante mudanças.
- **Cursor-based**: `?after=<cursor>&limit=10`. Cursor é opaco (ID + timestamp encoded base64). Estável e fast.
- **Keyset pagination**: cursor é PK + sort key. Mesma idéia.

Sempre retorne metadata: `{ data: [...], nextCursor: "..." }` ou via `Link` header (RFC 5988).

Em Logística com 100k pedidos por tenant, cursor é obrigatório.

### 2.5 Filtering, sorting

- Conventions:
  - `?status=pending` (igualdade).
  - `?createdAt[gte]=2026-01-01` (operadores).
  - `?sort=-createdAt,name` (descendente, asc).
  - `?fields=id,name` (sparse fieldsets).
- JSON:API spec normalizes isso.

GraphQL elimina query string complexity. REST com convention forte pode chegar perto.

### 2.6 Idempotency keys

API que aceita header `Idempotency-Key`:
- Server stores `{key, response, ttl}`.
- Mesma key → retorna response anterior.
- Stripe popularizou pattern.

### 2.7 Versioning

Estratégias:
- **URL**: `/v1/orders`, `/v2/orders`. Visível, simples.
- **Header**: `Accept: application/vnd.api.v2+json`. Cleaner URLs, harder to discover.
- **Query param**: `?version=2`. Anti-pattern fraco.
- **Não versionar**: APIs que evoluem aditivamente sem breaking. Stripe famously avoids URL versioning, lets clients pin via dated header.

Em B2B / public APIs: versionado obrigatório.

Deprecation:
- Header `Deprecation: true` + `Sunset: <date>` (RFC 8594).
- Documentation explícita.
- Comunicação com consumers.

### 2.8 Breaking changes

Que muda quebra cliente:
- Removing endpoint, field, status code.
- Renaming.
- Changing type of field.
- Tightening validation (rejecting input previously accepted).

Não-breaking (geralmente):
- Adicionar campo opcional.
- Adicionar endpoint.
- Adicionar status code aceito (cliente bem-feito ignora desconhecidos).

Política: aditivo é safe; tudo mais é breaking.

### 2.9 Error responses

**Problem Details** (RFC 9457):
```json
{
  "type": "https://example.com/probs/order-locked",
  "title": "Order is currently locked",
  "status": 409,
  "detail": "Order #123 is being processed by another courier",
  "instance": "/orders/123",
  "errors": [...]
}
```

Padrão emergente. Estável. Use.

Evite:
- 200 OK com `{success: false}`.
- Strings de erro inconsistentes.
- Stack traces em prod.

### 2.10 OpenAPI / spec-first

OpenAPI 3.1 (JSON Schema 2020-12 compatible) é o standard.

Workflows:
- **Code-first**: gerar OpenAPI a partir do código (Fastify schemas, NestJS, FastAPI).
- **Spec-first**: escrever OpenAPI YAML primeiro, gerar code stubs ou validate em runtime.

Code-first é mais ergonômico. Spec-first dá controle e disciplina mais forte.

Tools: Stoplight, Swagger UI, Redoc, Spectral (linter), Schemathesis (testing).

### 2.11 GraphQL

Trade-offs:
- **Pro**: client query exatamente o que precisa; tipos forte; subscriptions; schema discovery.
- **Con**: cache HTTP harder (mutations e queries no mesmo POST geralmente); N+1 surface (DataLoader); learning curve; security (depth limits).

Quando vence:
- Clients heterogêneos com necessidades distintas (web + mobile + partners).
- Federation entre microservices (Apollo Federation, Hot Chocolate).
- Evolução: deprecate field individual sem versioning.

Quando perde:
- 1 client, 1 server.
- API públicos com cache HTTP necessário.
- Time pequeno.

### 2.12 gRPC

RPC sobre HTTP/2 + Protobuf:
- **Pro**: performance, streaming bidirecional, contratos fortes via .proto, multi-language tooling.
- **Con**: browser support via grpc-web (not full); not human-readable; debug harder.

Quando: backend ↔ backend perf-sensitive (microservices). Mobile pode usar.

Padrão moderno: gRPC interno + REST/GraphQL externo.

### 2.13 tRPC e Connect-RPC — type-safe sem schema

Duas alternativas modernas a REST/gRPC quando você controla cliente e servidor.

**tRPC (TS-only)**

Define procedures em TS, infere tipos no client por type-level magic. Sem code generation, sem schema separado.

```ts
// server
export const appRouter = router({
  user: router({
    byId: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(({ input }) => db.user.findUnique({ where: { id: input.id } })),
    update: protectedProcedure
      .input(updateSchema)
      .mutation(({ input, ctx }) => db.user.update({ ... })),
  }),
});
export type AppRouter = typeof appRouter;

// client
const user = await trpc.user.byId.query({ id: 'abc' });  // tipado!
```

- Validation runtime via Zod (ou Yup, Valibot).
- Transport HTTP normal — pode usar batching, links, custom headers.
- Sem code gen, sem rebuild quando muda schema.
- Adapters: Next.js, Express, Fastify, Lambda, etc.

**Trade-offs:**
- **TS-only** literalmente. Cliente não-TS = você reverte pra REST/OpenAPI.
- **Acoplamento monorepo**: cliente importa `AppRouter` type do server. Não funciona em deploys cross-repo sem ginástica.
- **Public API ruim**: sem schema externo legível, terceiros não consumem fácil.
- **Sem caching HTTP automático** — você implementa via React Query / TanStack Query (que tRPC integra).

**Quando vale tRPC:**
- App full-stack TS (Next.js, Remix) com cliente próprio.
- Time pequeno, monorepo, iteração rápida.
- API privada, não exposta externally.

**Connect-RPC (Buf)**

Sucessor moderno de gRPC-Web. Mantém **Protocol Buffers** como schema mas suporta **JSON sobre HTTP/1.1** e **gRPC sobre HTTP/2**, no mesmo endpoint.

```proto
service UserService {
  rpc GetUser(GetUserRequest) returns (User);
}
```

- Client gerado pode chamar via HTTP normal (debugar com curl) ou gRPC binary (perf).
- **Cross-language** real: Go, TS, Swift, Python, Java, Rust, C++ — protobuf gera tudo.
- **`buf` tooling** (Buf Build): linting, breaking-change detection, schema registry, CI integration.
- **Sem dependência de gRPC runtime pesado** em browser — funciona com `fetch` plain.

```ts
// client TS gerado
const client = createPromiseClient(UserService, transport);
const user = await client.getUser({ id: 'abc' });
```

**Trade-offs:**
- Schema separado (.proto). Refactor menos fluido que tRPC.
- Code gen step. CI precisa rodar `buf generate`.
- Curva de aprendizado de protobuf — vale o investimento se você vai consumir cross-language.

**Quando vale Connect-RPC:**
- Multi-language clients (mobile native + web + serviços internos em Go/Java).
- Você já tem cultura de schema-first.
- Quer migrar de gRPC tradicional sem perder schema mas ganhar HTTP/JSON debugability.
- Public API que vai ter vendor SDKs em várias linguagens.

**Comparação rápida:**

| Aspecto | tRPC | Connect-RPC | gRPC clássico | REST + OpenAPI |
|---|---|---|---|---|
| Schema | Type-level TS | .proto | .proto | OpenAPI YAML |
| Cross-language | Não | Sim | Sim | Sim |
| Code gen | Não | Sim | Sim | Opcional |
| HTTP/JSON debug | Sim | Sim | Não (binary) | Sim |
| Setup overhead | Mínimo | Médio | Alto | Médio |
| Refactor velocity | Excelente | Bom | OK | Manual |
| Public API | Ruim | OK | Ruim (binary) | Excelente |
| Browser support | Nativo | Nativo (Connect-Web) | gRPC-Web (envoy proxy) | Nativo |

**Em monorepo TS médio, tRPC é game-changer.** Em sistema multi-language ou API pública, Connect-RPC é o moderno; gRPC clássico ainda vence em latency-extreme.

### 2.14 JSON:API spec

Especificação concreta pra REST com:
- Resource shape: `{type, id, attributes, relationships, links}`.
- Filtering, sorting, sparse fields, includes.
- Errors padronizados.

Pesado mas consistent. Algumas APIs públicos adotam.

### 2.15 HATEOAS

Hypermedia: response inclui links pra próximas ações.
```json
{
  "id": "123", "status": "pending",
  "links": {
    "cancel": "/orders/123/cancel",
    "self": "/orders/123"
  }
}
```

Permite client descobrir transições válidas. Raramente adotado, mas elegante quando regras são complexas (workflow state machines).

### 2.16 Multi-tenancy em API

Padrões:
- Subdomain: `acme.api.example.com`.
- Header: `X-Tenant-Id`.
- Path: `/t/acme/orders`.
- JWT claim → server resolve.

Decisão deve ser stable; mudar quebra all integrations.

### 2.17 Webhooks

API outbound (server → cliente). Protocolo:
- POST com JSON event.
- Signature header (HMAC) pra verify.
- Retries com backoff.
- Idempotency hint (event ID).

Cliente exposto a internet, recebendo. Documente:
- Event types e schemas.
- Retry policy.
- Replay process.
- Signature scheme.

Best practices: Stripe, GitHub APIs são references.

### 2.18 Consumer experience

Boa API:
- README com examples.
- OpenAPI live (Swagger UI).
- SDK nas linguagens-alvo (gerado de OpenAPI).
- Postman collection.
- Sandbox env.
- Status page.
- Changelog.

API pública sem isso = atrito alto.

### 2.19 API governance

Em organizações grandes:
- API guidelines (Google, Microsoft, Zalando publicaram).
- Lint pre-merge (Spectral rules).
- Review boards.
- Backwards-compatibility tests (Pact, contract).

### 2.20 GraphQL Federation v2 — distribuído

Fragmentation problem: GraphQL monolithic vira gargalo. Federation resolve: schema unified composto de subgraphs, cada subgraph owned por team.

**Apollo Federation v2**:
- Cada subgraph declara entities (types com `@key(fields: "id")`).
- Gateway compõe schema, dispatcha queries pra subgraphs apropriados.
- `@external`, `@requires`, `@provides`, `@override` controlam ownership.

```graphql
# Orders subgraph
type Order @key(fields: "id") {
  id: ID!
  total: Float!
}

# Users subgraph
type User @key(fields: "id") {
  id: ID!
  orders: [Order]   # resolved cross-subgraph
}
```

**Schema stitching** (deprecated em favor de Federation v2): juntava schemas via runtime delegation. Mais frágil; problemas de schema conflict.

**Quando Federation faz sentido**:
- 5+ teams ownership distinct.
- Bounded contexts em DDD claros.
- Tooling pra subgraph CI ready.

**Quando Federation é overkill**:
- Time pequeno: schema monolithic é mais simples.
- Mudanças cross-team raras.

Alternativas: GraphQL Mesh, Hasura, mantém-monolith.

### 2.21 gRPC streaming bidirectional

gRPC suporta 4 modos:
- Unary: request → response.
- Server streaming: request → stream of responses.
- Client streaming: stream of requests → response.
- **Bidirectional streaming**: dois streams independentes.

Use cases bidirectional:
- Chat / pub-sub low-latency.
- Telemetry com server pushes.
- Game state sync.

```proto
service Chat {
  rpc Connect(stream ClientMessage) returns (stream ServerMessage);
}
```

Client e server podem write/read independente. Multiplexed sobre HTTP/2.

**Trade-offs vs WebSocket**:
- gRPC: schema (Proto), code-gen, type-safety, headers/trailers/metadata.
- WebSocket: navegador-native, simpler, untyped messages.

Em web app, gRPC-Web limita streams (only server stream); use WS pra bidirectional. Em backend-to-backend ou mobile-to-backend, gRPC bidirectional é elegante.

### 2.22 BFF pattern (Backend for Frontend)

BFF = layer de API dedicada per-frontend (web, mobile, partner). Reduz over/under-fetch.

```
Mobile App → Mobile BFF → Order Service
                       → User Service
                       → Recommendation Service

Web App → Web BFF → mesmas downstream services
```

BFF agrega, formata, filtra pra cliente específico. Diferente de API Gateway (gateway é generic; BFF é client-specific).

**Benefits**:
- Mobile vê resposta otimizada (campos limitados, payload pequeno).
- Web vê resposta rica (mais fields, joined).
- Partners vêm versão estável separada de web.
- Auth + rate limit per-client.

**Costs**:
- N BFFs = N codebases.
- Frontend team frequentemente own BFF (Conway).
- Duplicação se não cuidado.

Stripe usa internamente. Netflix popularizou.

### 2.23 API gateway placement e função

API Gateway é layer entre clients e backend services:

**Funções**:
- Auth + token validation.
- Rate limiting + quota.
- Request routing.
- Protocol translation (REST ↔ gRPC).
- Response transformation.
- Request/response logging.
- Caching (CDN-ish).

**Implementations**:
- AWS API Gateway, Cloud API Gateway (managed).
- Kong, Tyk (self-hosted).
- Envoy (mesh-native).
- Nginx + Lua.

**Patterns**:
- **Edge gateway**: terminação TLS, WAF, geo routing.
- **Service mesh sidecar**: Istio, Linkerd (proxy per pod).
- **API gateway** clássico: layer único, reverse proxy.

**Anti-patterns**:
- Gateway com lógica de negócio (vira monolítico hidden).
- Gateway que conhece schema interno detalhado (acoplamento).

### 2.24 Versioning evolution real — Stripe blog case

Stripe não quebra API. Versioning:

- **Date-based**: `2024-04-15` é versão. `Stripe-Version` header opt-in.
- **Forever-stable**: nunca remove campo, só adiciona ou marca deprecated em new version.
- **Internal middleware** translates entre versões: client pede 2020-08-27 → middleware traduz response do current code pra format 2020-08-27.
- Customer pinned em versão original; **upgrade voluntário**.

Trade-off:
- Massive complexity em código (every change considera impact em N versões).
- Customer trust máximo (no surprises).

Lições:
- Backward compatibility é product feature.
- "Não aviso, deprecate" destrói confiança.
- Migration guides claros + tools (codemod) reduzem fricção.

### 2.25 RFC 7807 — Problem Details for HTTP APIs

Standard pra error response shape:

```json
{
  "type": "https://api.example.com/probs/insufficient-funds",
  "title": "Insufficient Funds",
  "status": 403,
  "detail": "Your balance is R$ 12.34, but charge requires R$ 50.00.",
  "instance": "/account/12345/charges/abc"
}
```

Campos:
- `type`: URI identificando tipo do erro (semantic, ideal apontar pra docs).
- `title`: human-readable curto.
- `status`: HTTP status duplicado.
- `detail`: human-readable longo, this instance.
- `instance`: URI da ocorrência específica.
- `+ extensões`: campos custom.

`Content-Type: application/problem+json`.

Vantagens:
- Schema consistente cross-API.
- Tools (OpenAPI generators) reconhecem.
- Field `type` permite client lógica programática (não regex em string).

### 2.26 API design comparison side-by-side

Mesma operação "criar pedido" em 4 estilos:

**REST** (level 3):
```
POST /v1/orders
Content-Type: application/json
Idempotency-Key: abc-123

{ "items": [...], "address": {...} }

→ 201 Created
   Location: /v1/orders/ord_xyz
   { "id": "ord_xyz", "_links": { "self": "...", "cancel": "..." } }
```

**GraphQL**:
```graphql
mutation CreateOrder($input: CreateOrderInput!) {
  createOrder(input: $input) {
    order { id total status }
    errors { field message }
  }
}
```

**gRPC**:
```proto
service Orders {
  rpc CreateOrder(CreateOrderRequest) returns (Order);
}
```

**tRPC** (TS-only):
```ts
trpc.orders.create.mutate({ items, address });
```

Trade-offs práticos:
- **REST**: ubíquo, browser-native, cacheable, learnable. Verbo dispute eternal. Pagination heterogêneo.
- **GraphQL**: client cherry-picks fields, evita over-fetch. N+1 risk em resolvers (DataLoader resolve). Caching mais complex (cada query é unique).
- **gRPC**: rápido (Proto + HTTP/2), strict typing, code gen 9 linguagens. Não browser-native (gRPC-Web limitado). Tooling enterprise.
- **tRPC**: type-safety total ts → ts. Acoplamento absoluto (mesmo monorepo). Não cross-language.

Padrão maduro: gRPC entre serviços, REST público (com OpenAPI), GraphQL pra agregação BFF, tRPC em monorepo TS controlado.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Listar Richardson maturity levels com 1 caso de cada.
- Verb idempotency rules e quando POST precisa idempotency-key.
- Cursor pagination vs offset com prós/contras.
- Versioning trade-offs (URL vs header vs dateado).
- Problem Details RFC 9457.
- Code-first vs spec-first OpenAPI.
- GraphQL vs REST decisão pra 3 cenários.
- gRPC: quando vence, quando perde.
- Webhooks: 4 práticas críticas.
- Breaking change: identifique e proponha rollout não-disruptivo.

---

## 4. Desafio de Engenharia

Redesign API pública do **Logística v2** com profundidade.

### Especificação

1. **API consistente**:
   - Audit todos os endpoints existentes. Padronize: plurais, hierarchy, action endpoints onde fizer sentido.
   - Status codes consistentes; Problem Details body em erros.
2. **Pagination**:
   - Migrar listas pra cursor-based.
   - Cursor opaque (base64 com checksum).
   - `Link` header + body metadata.
3. **Filtering & sorting**:
   - Convention documentada (`?status=&createdAt[gte]=&sort=-createdAt`).
   - Inputs validated com Zod.
4. **Versioning**:
   - URL `/v1/...` em todas rotas externas.
   - Deprecation headers em endpoints marcados deprecated.
5. **Idempotency**:
   - Header `Idempotency-Key` em todos `POST` críticos. Redis-backed.
6. **OpenAPI**:
   - Code-first via Fastify/Hono → OpenAPI 3.1.
   - Hosted em `/v1/docs` + Redoc.
   - Spectral lint em CI; PR comentando issues.
7. **Webhook delivery**:
   - Outbound webhook endpoints pra tenant que configurou (URL custom).
   - Signed (HMAC SHA-256).
   - Retries: 5 tentativas com backoff exp + jitter; DLQ se persist.
   - Replay endpoint: `POST /v1/webhooks/{eventId}/replay` (admin).
   - Tabela `webhook_deliveries` com history e status.
8. **GraphQL alternative (avaliação)**:
   - Implemente 1 query GraphQL alternative (`viewer` retornando dashboard).
   - Use Mercurius (Fastify) ou Yoga.
   - Documente trade-offs vs REST equivalent.
9. **gRPC interno**:
   - Routing engine (03-11 Rust) exposto via gRPC.
   - Backend principal consome via tonic-generated client (Rust) ou via grpc-js (Node).
10. **SDK gerado**:
    - Pelo menos 1 SDK gerado a partir do OpenAPI: TS client publicado em monorepo `@logistica/sdk`.

### Restrições

- Sem 200 OK com body de erro.
- Sem breaking change sem deprecation header + comunicação.
- Sem invenção de status codes (não-padrão).

### Threshold

- README documenta:
  - API guidelines (interno) — 1-2 páginas.
  - OpenAPI hospedado e live demonstrável.
  - Comparação GraphQL vs REST pra mesmo caso.
  - gRPC entre backend e routing engine; benchmark vs HTTP.
  - Webhook delivery: simulação de cliente flaky, retries observados.
  - SDK TS sendo usado pelo front Next em pelo menos 1 endpoint.

### Stretch

- HATEOAS em endpoint workflow-heavy (status transitions).
- API gateway na frente (Kong, Tyk, ou AWS API Gateway): rate limit, auth, caching.
- Federation GraphQL: 2 services federated, cliente unified.
- Schema breaking change rollout: mantenha v1 e v2 em paralelo, migre clients incrementally, aposentar v1.
- AsyncAPI spec pra eventos/webhooks (counterpart de OpenAPI pra event-driven).

---

## 5. Extensões e Conexões

- Liga com **02-08** (frameworks): plugins, schema, error handling.
- Liga com **02-13** (auth): JWT em headers, scope-based authz.
- Liga com **03-04** (CI/CD): Spectral lint, contract tests.
- Liga com **03-07** (observability): trace request through API gateway.
- Liga com **03-08** (security): OWASP API top 10 já tocou.
- Liga com **04-02** (messaging): webhooks são event-driven outbound.
- Liga com **04-03** (event-driven): events públicos vs internos; AsyncAPI.
- Liga com **04-06** (DDD): bounded context = API boundary.
- Liga com **04-08** (services): per-service vs gateway BFF.

---

## 6. Referências

- **"REST API Design Rulebook"** — Mark Massé.
- **"RESTful Web APIs"** — Leonard Richardson, Mike Amundsen.
- **OpenAPI Specification 3.1** ([spec.openapis.org/oas/v3.1.0](https://spec.openapis.org/oas/v3.1.0)).
- **JSON:API spec** ([jsonapi.org](https://jsonapi.org/)).
- **GraphQL spec** ([spec.graphql.org](https://spec.graphql.org/)).
- **gRPC docs** ([grpc.io/docs](https://grpc.io/docs/)).
- **AsyncAPI** ([asyncapi.com](https://www.asyncapi.com/)).
- **RFC 9110** (HTTP semantics), **RFC 9457** (Problem Details), **RFC 8594** (Sunset header), **RFC 5988** (Web Linking).
- **Stripe API docs** — referência de API design.
- **Zalando Restful API Guidelines** ([opensource.zalando.com/restful-api-guidelines](https://opensource.zalando.com/restful-api-guidelines/)).
- **Google AIP** (API Improvement Proposals) ([google.aip.dev](https://google.aip.dev/)).
