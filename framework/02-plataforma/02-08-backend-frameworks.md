---
module: 02-08
title: Backend Frameworks, Express, Fastify, Hono, NestJS, Elysia
stage: plataforma
prereqs: [02-07]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
quiz:
  - q: "Qual a diferença chave entre Hono e Fastify em decisão de runtime?"
    options:
      - "Hono é mais lento que Fastify em todos os benchmarks"
      - "Hono é Web-Standard-first (Request/Response nativos), roda em Node, Bun, Deno, Cloudflare Workers e Lambda; Fastify é Node-native otimizado para prod tradicional"
      - "Fastify só funciona em Node 18+"
      - "Hono não suporta validação de schema"
    correct: 1
    explanation: "Hono usa Web Standard APIs (Request/Response) e roda em qualquer runtime moderno, com bundle pequeno ideal para edge. Fastify é Node-otimizado com plugin ecosystem maduro e schema-driven."
  - q: "Por que NestJS frequentemente é overhead injustificado em microservices simples?"
    options:
      - "NestJS é mais lento que outros frameworks em qualquer cenário"
      - "Adiciona ~1k+ linhas de boilerplate (DI container, decorators, modules) que Fastify/Hono resolvem direto; vence apenas em equipes grandes vindas de Java/.NET com app complexo"
      - "Não suporta TypeScript"
      - "Apenas funciona com MongoDB"
    correct: 1
    explanation: "NestJS é opinionated com DI container, decorators, módulos. Em microservices simples, esse boilerplate é peso desnecessário. Vence em times grandes ou apps muito complexos onde estrutura forte vale a complexidade."
  - q: "No modelo de encapsulation do Fastify, qual a diferença entre `fastify-plugin` (`fp(fn)`) e um plugin sem wrapper?"
    options:
      - "São equivalentes; é apenas estilo"
      - "Plugin sem wrapper roda em contexto encapsulado (decorators/hooks ficam isolados); `fastify-plugin` desabilita encapsulation, expondo decorators ao parent scope"
      - "`fastify-plugin` é deprecated em Fastify 5"
      - "Sem wrapper, hooks executam em ordem aleatória"
    correct: 1
    explanation: "Por default, plugins Fastify rodam em own context. `fastify-plugin` (`fp`) desabilita encapsulation para que decorators (`fastify.db`) fiquem visíveis ao parent. Use `fp` para plugins de infraestrutura, sem wrapper para sub-routers."
  - q: "Em RFC 9457 Problem Details, qual status HTTP corresponde a 'autenticado mas sem permissão'?"
    options:
      - "401 Unauthorized"
      - "403 Forbidden"
      - "404 Not Found"
      - "422 Unprocessable Entity"
    correct: 1
    explanation: "401 é não-autenticado (sem credenciais válidas). 403 é autenticado mas sem permissão para o recurso. 404 é recurso não existe; 422 é entidade processável mas inválida (validation)."
  - q: "Qual a pegadinha clássica de CORS com `Access-Control-Allow-Origin: *`?"
    options:
      - "Não funciona em browsers modernos"
      - "Combinado com requests com `credentials: 'include'`, browser bloqueia; é necessário listar origin explícita para credentials"
      - "Bloqueia automaticamente todos requests POST"
      - "Causa erro 500 no servidor"
    correct: 1
    explanation: "Wildcard `*` em `Access-Control-Allow-Origin` é incompatível com requests credentialed. Para enviar cookies/auth headers, é obrigatório especificar origin explícita (`https://app.example.com`)."
---

# 02-08, Backend Frameworks

## 1. Problema de Engenharia

`http` puro de Node é spartano. Você manualmente parseia URL, body, multipart, escreve roteamento, lida com errors. Em produção real, frameworks tomam conta dessa fundação. Mas há diferença real entre eles: throughput, ergonomia, modelo de plugins, type safety, edge-readiness, ecosystem. Escolher errado é dor cara, refactor de framework em projeto vivo é trabalho de meses.

Este módulo dissecca os principais. Não é "qual é o melhor". É: **como cada um foi desenhado, que problema ele optou por resolver, que problema ele empurrou pra você, e como escolher conforme o contexto**.

---

## 2. Teoria Hard

### 2.1 O que um framework HTTP entrega

Em essência, todos resolvem:
- **Routing**: mapear método+path pra handler.
- **Request parsing**: query string, body (JSON, urlencoded, multipart), headers, cookies.
- **Response helpers**: status, headers, JSON, redirects, file responses.
- **Middleware**: pipeline antes/depois do handler.
- **Error handling**: capturar throws, transformar em response.
- **Plugin/extension model**: como adicionar capacidades.

Diferenças nascem em: ergonomia, performance, schema validation, tipagem fim-a-fim, runtime targets (Node, Edge, Bun, Deno).

### 2.2 Express

Lançado em 2010. Mais antigo, mais usado, mais ecosystem. Modelo:

```js
import express from 'express';
const app = express();
app.use(express.json());
app.get('/orders/:id', async (req, res) => {
  const order = await findById(req.params.id);
  res.json(order);
});
app.listen(3000);
```

Pontos:
- Middleware-driven (`app.use`, `(req, res, next) => {}`).
- Imperativo, simples.
- Performance: razoável, não excelente. Routing baseado em regex string parsing.
- Sem schema validation built-in.
- Em Express 4 (clássico), errors em async middleware precisavam de `next(err)`. **Express 5** (estável agora) trata async automaticamente.
- Ecosystem gigante: `passport`, `helmet`, `cors`, `morgan`, etc.

Quando vence: time já sabe; projeto pequeno-médio; cargas baixas-médias; integrar com plugin específico que só Express tem.

### 2.3 Fastify

Lançado em 2017, foco em performance e schema validation:

```ts
import Fastify from 'fastify';
const fastify = Fastify({ logger: true });

fastify.get('/orders/:id', {
  schema: {
    params: { type: 'object', properties: { id: { type: 'string' } } },
    response: {
      200: { type: 'object', properties: { id: { type: 'string' }, total: { type: 'number' } } }
    }
  }
}, async (req) => findById(req.params.id));

await fastify.listen({ port: 3000 });
```

Pontos:
- **Schema-driven**: JSON Schema pra request e response. Compila pra validator otimizado e fast-json-stringify (serializer 2-5x mais rápido que `JSON.stringify`).
- **Plugins encapsulados**: cada plugin tem escopo, pode declarar deps. Modelo robusto pra grandes apps.
- **Hooks**: `onRequest`, `preParsing`, `preValidation`, `preHandler`, `onSend`, `onResponse`, `onError`.
- Performance: ~2-5x Express em benchmarks comuns.
- Logger built-in (`pino`) por default.

Quando vence: você quer performance e estrutura disciplinada; precisa validar schemas; vai escalar pra time grande.

### 2.4 Hono

Lançado em 2022. Framework moderno desenhado pra rodar **em qualquer runtime**: Node, Bun, Deno, Cloudflare Workers, Vercel Edge, AWS Lambda. Web Standard APIs (Request, Response, fetch).

```ts
import { Hono } from 'hono';
const app = new Hono();

app.get('/orders/:id', async (c) => {
  const id = c.req.param('id');
  const order = await findById(id);
  return c.json(order);
});

export default app;  // funciona em Workers, Bun, Deno
// adapter pra Node:
import { serve } from '@hono/node-server';
serve(app);
```

Pontos:
- **Web Standard primeiro**: `Request`/`Response` nativos.
- **Bundle pequeno**: ideal pra edge runtime (cold start).
- Routing rápido (RegExpRouter / TrieRouter).
- **`@hono/zod-validator`** pra schema validation.
- **`@hono/zod-openapi`** pra OpenAPI auto.
- Pode ser usado em Next.js como handler, em Lambda, em Workers, mesmo código.

Quando vence: edge/multi-runtime, microservices serverless, projetos modernos onde você quer não estar preso a Node.

### 2.5 NestJS

Lançado em 2017, inspirado em Angular. **Framework opinado, full-featured**.

```ts
@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
```

Pontos:
- **DI container**, decorators, módulos, controllers, providers, guards, interceptors, pipes.
- Sob o hood roda Express ou Fastify (você escolhe).
- Aborda DDD e Clean Architecture out of the box.
- TS-first, estrutura forte.
- **Pesado**: muita abstração, curva de aprendizado, tudo é decorator. Bundle e startup maiores.

Quando vence: empresa grande, time grande, time vindo de Java/.NET/C#, app complexo (microservices, GraphQL, WebSocket gateways) onde estrutura forte vale mais que leveza.

### 2.6 Elysia

Lançado em 2023, primeiro feito pra **Bun**. Foca em DX e tipagem fim-a-fim:

```ts
import { Elysia, t } from 'elysia';
new Elysia()
  .get('/orders/:id', ({ params }) => findById(params.id), {
    params: t.Object({ id: t.String() })
  })
  .listen(3000);
```

Pontos:
- TypeBox-based schemas com inferência completa.
- **Eden Treaty / Eden Fetch**: cliente fetch tipado a partir do server (estilo tRPC mas REST-friendly).
- Performance forte em Bun.
- Funciona em Node via adapter mas brilha em Bun.

Quando vence: projetos novos em Bun com foco em DX e tipagem.

### 2.7 tRPC e GraphQL (vale considerar mesmo nesse módulo)

Não são "frameworks HTTP" tradicionais, são camadas:

**tRPC**: RPC type-safe entre TS client e TS server. Você define procedures no server, client tem tipos automáticos. Roda sobre Express, Fastify, Next, Hono.

**GraphQL**: schema separado, query language. Apollo, Yoga, Mercurius (Fastify-based).

Decisão entre REST, tRPC, GraphQL:
- **REST**: integração externa, contratos públicos, cache HTTP fácil, polyglot clients.
- **tRPC**: monorepo TS, time pequeno-médio, evolução rápida, sem cache HTTP automático.
- **GraphQL**: clients heterogêneos com necessidades de fetch divergentes, federation (microservices), evolutivo.

### 2.8 Middleware: o conceito comum

Pipeline. Cada middleware recebe `(req, res, next)` (Express) ou retorna funções com `next` (Koa/Hono). Pode:
- Mutar req (parsing, decoding).
- Curto-circuitar resposta (auth fail → 401).
- Encadear próxima.
- Pós-processar (medir tempo, logar).

Comum a todos:
- Logging
- CORS
- Body parser
- Rate limit
- Auth
- Compression
- Helmet (security headers)

### 2.9 Validation: zod, valibot, TypeBox, AJV

- **Zod**: schemas TS-first, inferência forte, ecosystem gigante (tRPC, t3, Hono, Next). Um pouco mais lenta em alguns benchmarks.
- **Valibot**: alternativa modular, bundle muito pequeno (importa só o que usa). Boa pra edge.
- **TypeBox**: gera JSON Schema; ideal pra Fastify e Elysia. Performance forte.
- **AJV**: validator JSON Schema clássico. Performance forte.

Padrão emergente: definir schema (zod/valibot/TypeBox), validar em entrada, derivar TS types e OpenAPI. Single source of truth.

### 2.10 OpenAPI auto

OpenAPI/Swagger é a spec pra documentar APIs REST. Geração automática a partir do código:
- **Fastify**: `@fastify/swagger` lê schemas e gera spec.
- **Hono**: `@hono/zod-openapi`.
- **NestJS**: `@nestjs/swagger` baseado em decorators e DTOs.
- **Express**: `swagger-jsdoc` ou tsoa (TS Annotation, controller-first).

Sem OpenAPI, integração externa vira documentação manual desatualizada. **Sempre gere.**

### 2.11 Logging estruturado

- **pino** (default Fastify), JSON, super rápido, child loggers.
- **winston**: clássico, mais flexível mas mais lento.
- **bunyan**: ainda em uso.
- **console.log**: nunca em produção (sem nível, sem structured fields).

Padrão: structured logs (JSON) com:
- timestamp
- level
- message
- requestId (via AsyncLocalStorage)
- userId/tenantId
- erro (com stack)

Logs vão pra stdout. Coletor (Loki, CloudWatch, Datadog) recolhe.

### 2.12 Error handling

Erros devem virar respostas HTTP previsíveis:
- 400, input inválido (validation).
- 401, não autenticado.
- 403, autenticado mas sem permissão.
- 404, recurso não existe.
- 409, conflito (ex: duplicate key).
- 422, entidade processável mas inválida (subjective; alguns usam 400).
- 500, erro do servidor.
- 503, overload/dependência fora.

Erros específicos do domínio: subclasses de Error com `code`, `status`, `details`. Middleware central traduz pra response. Evite expor stacks em prod.

**Problem Details** (RFC 9457) é formato padronizado pra error responses. Considere.

### 2.13 Rate limiting

Lib: `express-rate-limit`, `@fastify/rate-limit`, `hono-rate-limiter`, ou Redis-based pra distribuído.

Algoritmos:
- Fixed window
- Sliding window
- Token bucket
- Leaky bucket

Em backend distribuído (múltiplas instâncias), você precisa store compartilhado (Redis). Em single instance, in-memory basta. CDN/proxy pode aplicar antes de chegar (Cloudflare, AWS WAF).

### 2.14 Compression e caching HTTP

`Content-Encoding: gzip` ou `br` (Brotli). Lib: `compression` (Express), `@fastify/compress`, etc.

Cache headers:
- `Cache-Control: public, max-age=3600`
- `ETag` + `If-None-Match` → 304
- `Last-Modified` + `If-Modified-Since` → 304
- `Vary` pra negociação (Accept-Language, Accept-Encoding).

Em backend de API frequentemente você faz `Cache-Control: private, no-store` ou tags específicas. CDN ainda pode cachear se você marca explicitamente.

### 2.15 CORS

Cross-Origin Resource Sharing. Browser bloqueia por default; server precisa explicitar `Access-Control-Allow-Origin`, `-Methods`, `-Headers`, etc.

Cuidado com:
- `Access-Control-Allow-Origin: *` + credentials → bloqueado pelo browser. Pra credentials você lista origin explícita.
- Preflight (`OPTIONS`) pra requests não-simple.

### 2.16 Multi-tenant: separação por header, subdomain ou path

Logística é multi-tenant (lojistas, entregadores, clientes). Padrões:
- **Subdomain**: `acme.api.example.com` → middleware identifica tenant.
- **Header**: `X-Tenant-Id: acme`.
- **Path**: `/t/acme/orders`.
- **JWT claim**: token carrega tenant id.

Onde tenant fica no contexto: AsyncLocalStorage, ou objeto de request anotado.

### 2.17 Reverse proxy considerations

Nginx, Caddy, Traefik, Cloudflare na frente. Backend recebe `X-Forwarded-For`, `X-Forwarded-Proto`, etc. Frameworks têm `trust proxy` setting, habilite quando atrás de proxy.

`req.ip` real só é confiável se trust proxy estiver configurado e proxy injetar headers.

### 2.18 Backend frameworks 2026 — comparação Fastify/Hono/Elysia/Bun routes com benchmarks, decisão por uso

Cenário backend Node/TS 2026 mudou: Express maduro mas slow + sem types nativos; Fastify domina prod tradicional; Hono explode em edge runtimes; Elysia (Bun-native) pivot pra TypeScript-first; Next.js Route Handlers cobrem casos full-stack. Esta seção entrega benchmarks reais (sem hype), decision tree por workload, e migration paths concretos.

**Performance benchmarks 2026** (req/s em "hello world", Node 22 single core, M2 Pro):

| Framework | RPS | Latency p99 | Notes |
|---|---|---|---|
| **Bun + Bun.serve** | ~250k | 0.4ms | Bun runtime nativo |
| **Hono + Bun** | ~240k | 0.5ms | Same runtime, slim wrapper |
| **Elysia + Bun** | ~220k | 0.6ms | TypeScript-first DX |
| **Fastify + Node** | ~85k | 1.8ms | Best Node-native |
| **Hono + Node** | ~80k | 1.9ms | Universal runtime |
| **Hono + Cloudflare Workers** | edge-distributed | 2-15ms (por região) | Não comparable diretamente |
| **Express + Node** | ~25k | 4.5ms | Maduro, slow |
| **Next.js Route Handler** | ~20k | 6ms | Bundled com Next; overhead RSC pipeline |

**Disclaimer**: hello-world não reflete prod. Fastify ≈ Hono em prod real (db queries dominate). Use perf como tiebreaker, não driver primário.

**Fastify — opção default 2026 pra Node tradicional**:

```typescript
import Fastify from 'fastify';
import { z } from 'zod';
import { fastifyZod } from 'fastify-type-provider-zod';

const app = Fastify({ logger: true });
app.setValidatorCompiler(fastifyZod.validatorCompiler);
app.setSerializerCompiler(fastifyZod.serializerCompiler);

const orderSchema = z.object({
  items: z.array(z.object({ productId: z.string().uuid(), qty: z.number().int().positive() })),
  courierId: z.string().uuid().optional(),
});

app.post('/orders', {
  schema: { body: orderSchema, response: { 200: z.object({ id: z.string().uuid() }) } },
}, async (req) => {
  const order = await db.orders.insert({ ...req.body, tenantId: req.tenantId });
  return { id: order.id };
});

await app.listen({ port: 8080, host: '0.0.0.0' });
```

- **Strengths**: schema-first com Zod/TypeBox, hooks lifecycle, plugin ecosystem grande, OpenAPI auto-gen.
- **Quando**: Node prod tradicional, K8s deploy, equipe já em Node.
- **Limita**: não TypeScript-first nativo (precisa fastify-type-provider-zod).

**Hono — universal runtime winner**:

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono();

app.post('/orders',
  zValidator('json', z.object({ items: z.array(z.object({ productId: z.string().uuid(), qty: z.number().int().positive() })), courierId: z.string().uuid().optional() })),
  async (c) => {
    const body = c.req.valid('json');
    const order = await db.orders.insert({ ...body, tenantId: c.var.tenantId });
    return c.json({ id: order.id });
  }
);

export default app;   // funciona em Cloudflare Workers, Bun, Deno, Node, AWS Lambda
```

- **Strengths**: roda em Workers/Bun/Deno/Node/Lambda sem mudança; small bundle (12KB); Web Standards (Request/Response).
- **Quando**: edge deploy (Workers, Vercel Edge), multi-runtime portability, microservices small.
- **Limita**: ecosystem menor que Fastify (mas crescendo rápido).

**Elysia — TypeScript-first em Bun**:

```typescript
import { Elysia, t } from 'elysia';

new Elysia()
  .post('/orders', async ({ body, set }) => {
    const order = await db.orders.insert(body);
    return { id: order.id };
  }, {
    body: t.Object({
      items: t.Array(t.Object({ productId: t.String({ format: 'uuid' }), qty: t.Integer({ minimum: 1 }) })),
      courierId: t.Optional(t.String({ format: 'uuid' })),
    }),
  })
  .listen(8080);
```

- **Strengths**: end-to-end TypeScript inferência (req body, response, sem zod cast); Bun native (fast); Swagger auto.
- **Quando**: time já adotou Bun; greenfield TypeScript-first.
- **Limita**: Bun-only (oficialmente); ecosystem ainda menor.

**Next.js Route Handlers (full-stack)**:

```typescript
// app/api/orders/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  items: z.array(z.object({ productId: z.string().uuid(), qty: z.number().int().positive() })),
  courierId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const order = await db.orders.insert(parsed.data);
  return NextResponse.json({ id: order.id });
}
```

- **Strengths**: zero infra split (UI + API mesma deploy); React Server Components integration; edge runtime opt-in.
- **Quando**: app fullstack onde frontend + API são owned pelo mesmo time; Vercel deploy.
- **Limita**: monolítico; multi-region distinta = fork da app.

**Decision tree por workload**:

| Workload | Framework |
|---|---|
| API CRUD em Node K8s, equipe Node experiente | Fastify + Zod |
| Edge deploy Cloudflare Workers / Vercel Edge | Hono |
| Microservices small com possível port pra Workers depois | Hono em Node primeiro |
| Greenfield Bun + TypeScript-first DX | Elysia |
| App fullstack React + simples API endpoints | Next.js Route Handlers |
| Migration de Express com low risk | Fastify (similar API) |
| Realtime WebSockets heavy | Fastify + websocket plugin OR Hono + Bun.serve |
| gRPC | Connect-RPC (separate) — fora desta lista |

**Migration patterns**:

*Express → Fastify*:
- Compatibility shim: `@fastify/express` permite middleware Express usar Fastify gradualmente.
- Replace `app.use(...)` por `app.register(...)` com hook lifecycle.
- Estimate: 1 mês pra app médio (300 endpoints).

*Express → Hono*:
- Quase rewrite — APIs Web Standards muda pattern.
- Vantagem: ganha portabilidade edge.
- Estimate: 2-3 meses; melhor pra greenfield ou refactor radical.

*Node → Bun*:
- Drop-in para muitas codebases (Node API compat ~95% em 2026).
- Pegadinhas: native modules nem todos compilam; algumas APIs Buffer divergem; cluster API diferente.
- Estimate: 1-2 semanas testing em staging antes prod.

**Plugins ecosystem comparison (essential libs)**:

| Need | Fastify | Hono | Elysia |
|---|---|---|---|
| Auth JWT | `@fastify/jwt` | `hono/jwt` | `@elysiajs/jwt` |
| CORS | `@fastify/cors` | `hono/cors` | `@elysiajs/cors` |
| Rate limit | `@fastify/rate-limit` | `hono-rate-limiter` | `@elysiajs/rate-limit` |
| OpenAPI | `@fastify/swagger` | `hono-openapi` | `@elysiajs/swagger` |
| WebSocket | `@fastify/websocket` | `hono/ws` | built-in |
| Static files | `@fastify/static` | `hono/serve-static` | `@elysiajs/static` |
| Multipart | `@fastify/multipart` | `hono/body` | built-in |

**Anti-patterns observados**:
- **Escolher por benchmark synthetic**: prod latency dominado por DB; framework choice é 5%.
- **Express em greenfield 2026**: maduro mas obsoleto (TypeScript bolt-on, slow); use Fastify.
- **Next.js Route Handlers pra API standalone**: bundle Next inteiro só pra API = waste; use Hono.
- **Hono em Node sem motivo edge**: ganho marginal sobre Fastify; troque ecosystem maturity.
- **Bun em prod sem testing extensivo**: native module compatibility ainda surprising em 2026.
- **Elysia + Node**: oficialmente Bun-only; runs em Node mas perde optimizations.
- **Migrar tudo de uma vez**: framework migration em prod = risk. Strangler pattern: novo endpoints em new framework, legacy em Express até decommission.

Cruza com **02-08 §2.10** (OpenAPI auto-gen é feature comum), **02-08 §2.17** (reverse proxy serve qualquer framework), **02-07 §2.17** (Node vs Bun vs Deno runtime decision), **02-05 §2.21** (Next.js cache layers se for Route Handlers), **04-08 §2.21** (Saga orchestration via Temporal — agnostic ao framework HTTP).

### 2.19 Plugin authoring deep — Fastify encapsulation, Hono middleware composition, type-safe DI patterns

**Por que plugin systems importam**: código modular exige encapsulation, reuse entre serviços e boundaries claros. Sem plugin pattern, surge "god `app.ts`" com 500 routes + middleware globais misturados — mudança em auth quebra orders, swap Postgres → SQLite (testes) requer rewrite. Plugin system entrega: swap implementations por env, conditional features (admin-only routes), multi-tenant module boundaries.

**Fastify encapsulation model (Fastify 5+)**: cada plugin roda em **own context** — hooks, decorators, schemas registrados não vazam pro parent scope. **`fastify-plugin` 5+** (`fp(fn, opts)`) wrappa o plugin pulando encapsulation; decorators ficam visíveis ao parent. **Hooks lifecycle**: `onRequest` → `preParsing` → `preValidation` → `preHandler` → `preSerialization` → `onSend` → `onResponse` (+ `onError`).

**Plugin Logística — `db.plugin.ts`**:
```ts
import fp from 'fastify-plugin';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { FastifyPluginAsync } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    db: ReturnType<typeof drizzle>;
  }
}

const dbPlugin: FastifyPluginAsync<{ url: string }> = async (fastify, opts) => {
  const sql = postgres(opts.url, { max: 20 });
  const db = drizzle(sql);
  fastify.decorate('db', db);
  fastify.addHook('onClose', async () => { await sql.end(); });
};

export default fp(dbPlugin, { name: 'db', dependencies: [] });
```
Module augmentation (`declare module 'fastify'`) entrega tipagem `fastify.db.select()...` em todo lugar. `onClose` hook fecha pool no graceful shutdown.

**Plugin com dependencies (auth depende de db)**:
```ts
const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('user', null);
  fastify.addHook('preHandler', async (req) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return;
    const user = await fastify.db.query.users.findFirst({
      where: eq(users.token, token),
    });
    (req as any).user = user;
  });
};

export default fp(authPlugin, { name: 'auth', dependencies: ['db'] });
```
`dependencies: ['db']` garante load order; runtime error se db não foi registrado antes.

**Encapsulated routes (sub-app pattern)**:
```ts
// routes/orders.ts
const orderRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => fastify.db.select().from(orders));
  fastify.post('/', { schema: createOrderSchema }, async (req) => { /* ... */ });
};

// app.ts
await app.register(orderRoutes, { prefix: '/orders' });
await app.register(adminRoutes, { prefix: '/admin' }); // auth hook só aqui
```
Cada prefix registrado fica encapsulated — auth hook em `adminRoutes` não atinge `/orders`.

**Typed schemas com Zod (alternativa TypeBox) — `fastify-zod` 1+**:
```ts
import { z } from 'zod';

const orderSchema = {
  body: z.object({ items: z.array(z.string()).min(1) }),
  response: { 200: z.object({ id: z.string() }) },
};

fastify.post('/orders', { schema: orderSchema }, async (req) => {
  // req.body fully typed
  return { id: 'order-123' };
});
```
Compile-time + runtime validation + auto OpenAPI via `@fastify/swagger`.

**Hono middleware composition (Hono 4+)**:
```ts
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';

const app = new Hono<{ Variables: { user: User } }>();

app.use('*', logger());
app.use('/api/*', cors({ origin: 'https://logistica.example.com' }));

const adminApp = new Hono<{ Variables: { user: User } }>();
adminApp.use('*', jwt({ secret: process.env.JWT_SECRET! }));
adminApp.use('*', async (c, next) => {
  const user = c.get('user');
  if (!user.isAdmin) return c.json({ error: 'Forbidden' }, 403);
  await next();
});
adminApp.get('/users', async (c) => c.json(await db.select().from(users)));

app.route('/admin', adminApp);
```
**Type-safe Variables**: `c.set('user', user)` + `c.get('user')` tipados via generic na construção.

**Hono custom middleware authoring**:
```ts
import { createMiddleware } from 'hono/factory';

export const tenantMiddleware = createMiddleware<{ Variables: { tenantId: string } }>(
  async (c, next) => {
    const subdomain = c.req.header('host')?.split('.')[0];
    if (!subdomain) return c.json({ error: 'Tenant required' }, 400);
    c.set('tenantId', subdomain);
    await next();
  },
);

app.use('/api/*', tenantMiddleware);
```

**Type-safe DI alternativas 2026**:
- **Awilix**: vanilla JS DI, registration explícita, runtime resolution, sem decorators.
- **tsyringe** (Microsoft): TypeScript decorators + reflect-metadata.
- **NestJS**: full framework batteries-included (DI + lifecycle + modules); opinionated.
- **Fastify decorators + Hono Variables**: framework-native, minimal, sem DI library.

Decisão: framework-native vence até ~50 routes; Awilix em scale; NestJS apenas quando time prefere framework-driven (custo: 1k+ linhas extra de boilerplate).

**Plugin testing (vitest + `app.inject()`)**:
```ts
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import dbPlugin from '../src/plugins/db';
import orderRoutes from '../src/routes/orders';

describe('orders routes', () => {
  let app: FastifyInstance;
  beforeEach(async () => {
    app = Fastify({ logger: false });
    await app.register(dbPlugin, { url: process.env.TEST_DB_URL! });
    await app.register(orderRoutes, { prefix: '/orders' });
    await app.ready();
  });
  afterEach(async () => { await app.close(); });

  it('GET /orders returns list', async () => {
    const res = await app.inject({ method: 'GET', url: '/orders' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual([]);
  });
});
```
`app.inject()` faz request in-process sem HTTP overhead; `afterEach` com `app.close()` evita state leak entre tests.

**Logística applied stack**:
- **Fastify plugins**: `db`, `auth`, `tenant`, `audit`, `metrics`, `errorHandler`.
- **Encapsulated routes**: `/orders`, `/couriers`, `/admin`, `/webhooks`.
- **Hono alternative** (edge functions): `tenantMiddleware` + JWT verify + Drizzle direct.
- **Tests**: `app.inject()` para routes; Testcontainers Postgres para db plugin integration.
- **OpenAPI**: auto-gerado de Zod schemas via `@fastify/swagger` + `@fastify/swagger-ui`.

**Anti-patterns observados**:
- Plugin sem `fastify-plugin` wrapper quando precisa expor decorators (encapsulation esconde; "decorator not found" em runtime).
- `fastify-plugin` em route plugins (defeats encapsulation; routes vazam pro escopo global).
- Decorate sem `declare module` augmentation (sem types; runtime funciona, dev experience péssimo).
- Hook `onRequest` em hot path com sync DB call (bloqueia event loop; use async + cache).
- Hono `c.set('user', x)` sem typed Variables generic (runtime ok; tipos perdidos).
- Plugin sem `dependencies: [...]` declarado (race condition; depende da registration order).
- DI container instanciando per-request em hot endpoint (overhead; use singleton ou app-scoped).
- NestJS overhead em microservice simples (1k+ linhas de boilerplate; Fastify resolve direto).
- `app.inject()` em integration tests sem cleanup (tests subsequentes herdam state; `afterEach(app.close())`).
- Custom middleware com `await next()` esquecido (request hangs; ESLint rule `hono/no-missing-next`).

Cruza com **02-09 §2.x** (Postgres + Drizzle integration via plugin), **02-13 §2.x** (auth plugins JWT/session), **03-01 §2.x** (testing strategy via `app.inject()`), **02-19 §2.x** (i18n middleware composition), **03-07 §2.x** (observability hooks `onRequest`/`onResponse`).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Comparar Express, Fastify, Hono, NestJS, Elysia em 4 dimensões: performance, ergonomia, runtime targets, schema/types.
- Justificar com 3 casos onde Hono vence Fastify e 3 onde Fastify vence Hono.
- Escrever middleware de logging com requestId via AsyncLocalStorage.
- Implementar error handler central que distingue erros de domínio, validation, e internal.
- Explicar trust proxy e quando você precisa.
- Escolher entre REST, tRPC, GraphQL com critérios técnicos.
- Configurar rate limit distribuído usando Redis store.
- Distinguir Zod, Valibot e TypeBox e quando cada faz sentido.
- Explicar OpenAPI auto-gen e por que vale.
- Diagnosticar request lento: que hook/log você instala pra entender em qual fase travou.

---

## 4. Desafio de Engenharia

Reescrever **Logística API** sobre framework, duas implementações paralelas: **Fastify** e **Hono**. Comparar.

### Especificação

1. **Endpoints comuns** (ambos):
   - `POST /auth/login` → JWT mockado.
   - `GET /orders` lista paginada (auth obrigatória).
   - `POST /orders` cria pedido (auth + validation).
   - `GET /orders/:id` detalhe.
   - `POST /orders/:id/events` registra evento.
   - `GET /orders/export.csv` streaming.
   - `GET /healthz`, `GET /metrics`.
2. **Multi-tenant**:
   - Header `X-Tenant-Id`.
   - Middleware injeta tenant em AsyncLocalStorage.
   - Logger inclui tenant em todas linhas.
3. **Validation**:
   - Fastify: TypeBox schemas.
   - Hono: Zod schemas.
   - Mesmas regras: `customerName` obrigatório, `total` > 0, `items` array não vazio.
4. **OpenAPI**:
   - Auto-gerado em `/docs` em ambos.
5. **Rate limit**:
   - 100 req/min por IP+tenant. In-memory por enquanto (próximo módulo, Redis).
6. **Error handling**:
   - Erros de domínio (`OrderNotFound`, `OrderAlreadyDelivered`) viram 404/409 com Problem Details.
   - Validation erra → 400 com lista de issues.
7. **Logger**:
   - pino em ambos. Logs JSON com `requestId`, `tenantId`, `method`, `path`, `status`, `latency_ms`.
8. **Graceful shutdown** (do 02-07).

### Restrições

- Sem ORM (queries SQL direto, mock store ou SQLite).
- Sem `console.log` em código de produção.
- Cada implementação em pasta separada (`server-fastify/`, `server-hono/`).

### Threshold

- Load test com `autocannon` em ambos. Reportar:
  - Throughput (req/s) em `GET /orders`.
  - Latência p50/p99.
  - Memória pico.
- README compara: ergonomia, decisões que diferiram, qual você escolheria pra Logística e por quê.
- Demonstrar OpenAPI funcionando em ambos (`/docs`).

### Stretch

- Adicionar tRPC router sobrepondo Fastify e fazer cliente TS consumindo com tipo inferido.
- Variant Hono no Cloudflare Workers (sem DB conectado, mockando), provando portabilidade.
- Plugin Fastify encapsulado pra módulo de pedidos (escopo isolado, deps declaradas).

---

## 5. Extensões e Conexões

- Liga com **02-07**: framework é camada sobre módulo `http`. Hooks e plugins refletem fases do processamento que vimos.
- Liga com **02-09** (Postgres): pool de conexões compartilhada por handlers; cuidado em serverless.
- Liga com **02-10** (ORMs): Prisma/Drizzle integram com qualquer framework.
- Liga com **02-13** (auth): JWT middleware, session middleware, OAuth callbacks.
- Liga com **02-14** (real-time): WebSocket integrations (Fastify-WS, ws + Express, Hono with @hono/websocket).
- Liga com **03-01** (testes): supertest / fastify.inject / Hono test API; integration tests.
- Liga com **03-07** (observability): structured logging, metrics endpoints, tracing instrumentation.
- Liga com **03-08** (security): helmet, CORS, rate limit, input validation.
- Liga com **04-05** (API design): REST maturity, versioning, pagination, error formats.

---

## 6. Referências

- **Express docs** ([expressjs.com](https://expressjs.com/)).
- **Fastify docs** ([fastify.dev](https://fastify.dev/)), leia plugins, lifecycle, schema.
- **Hono docs** ([hono.dev](https://hono.dev/)).
- **NestJS docs** ([docs.nestjs.com](https://docs.nestjs.com/)).
- **Elysia docs** ([elysiajs.com](https://elysiajs.com/)).
- **tRPC docs** ([trpc.io](https://trpc.io/)).
- **"RESTful Web APIs"**: Leonard Richardson, Mike Amundsen.
- **RFC 9457** (Problem Details for HTTP APIs).
- **OpenAPI Spec 3.1** ([spec.openapis.org/oas/v3.1.0](https://spec.openapis.org/oas/v3.1.0)).
