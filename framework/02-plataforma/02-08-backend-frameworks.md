---
module: 02-08
title: Backend Frameworks — Express, Fastify, Hono, NestJS, Elysia
stage: plataforma
prereqs: [02-07]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 02-08 — Backend Frameworks

## 1. Problema de Engenharia

`http` puro de Node é spartano. Você manualmente parseia URL, body, multipart, escreve roteamento, lida com errors. Em produção real, frameworks tomam conta dessa fundação. Mas há diferença real entre eles: throughput, ergonomia, modelo de plugins, type safety, edge-readiness, ecosystem. Escolher errado é dor cara — refactor de framework em projeto vivo é trabalho de meses.

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

Não são "frameworks HTTP" tradicionais — são camadas:

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

- **pino** (default Fastify) — JSON, super rápido, child loggers.
- **winston** — clássico, mais flexível mas mais lento.
- **bunyan** — ainda em uso.
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
- 400 — input inválido (validation).
- 401 — não autenticado.
- 403 — autenticado mas sem permissão.
- 404 — recurso não existe.
- 409 — conflito (ex: duplicate key).
- 422 — entidade processável mas inválida (subjective; alguns usam 400).
- 500 — erro do servidor.
- 503 — overload/dependência fora.

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

Nginx, Caddy, Traefik, Cloudflare na frente. Backend recebe `X-Forwarded-For`, `X-Forwarded-Proto`, etc. Frameworks têm `trust proxy` setting — habilite quando atrás de proxy.

`req.ip` real só é confiável se trust proxy estiver configurado e proxy injetar headers.

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

Reescrever **Logística API** sobre framework — duas implementações paralelas: **Fastify** e **Hono**. Comparar.

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
- **Fastify docs** ([fastify.dev](https://fastify.dev/)) — leia plugins, lifecycle, schema.
- **Hono docs** ([hono.dev](https://hono.dev/)).
- **NestJS docs** ([docs.nestjs.com](https://docs.nestjs.com/)).
- **Elysia docs** ([elysiajs.com](https://elysiajs.com/)).
- **tRPC docs** ([trpc.io](https://trpc.io/)).
- **"RESTful Web APIs"** — Leonard Richardson, Mike Amundsen.
- **RFC 9457** (Problem Details for HTTP APIs).
- **OpenAPI Spec 3.1** ([spec.openapis.org/oas/v3.1.0](https://spec.openapis.org/oas/v3.1.0)).
