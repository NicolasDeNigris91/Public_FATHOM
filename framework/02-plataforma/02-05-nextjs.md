---
module: 02-05
title: Next.js, App Router, RSC, Caching Layers, Edge vs Node
stage: plataforma
prereqs: [02-04]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 02-05, Next.js

## 1. Problema de Engenharia

Next.js é o framework de fato pra apps React em produção. Mas o que ele faz vai além de "React com SSR", é um sistema de roteamento, render híbrido (server/client/edge), múltiplas camadas de cache, otimização automática de assets, primitivas de RSC. Cada uma dessas peças tem regras sutis, e times perdem dias debugando comportamento esperado de cache, hydration mismatches, ou diferenças entre runtimes.

Este módulo não é "tutorial Next". É o modelo mental do que acontece em cada request, como o cache decide servir HTML estático ou re-renderizar, e quando vale o trade-off de Edge runtime vs Node.

---

## 2. Teoria Hard

### 2.1 App Router vs Pages Router

Pages Router (`/pages`) foi o padrão até 2022. Modelo: cada arquivo em `pages/` é uma rota; `getStaticProps`/`getServerSideProps`/`getStaticPaths` controlam fetch.

App Router (`/app`, default desde Next 13.4 stable) é uma reescrita baseada em RSC. Mudanças principais:
- **Server components por default**: componentes são server-only a menos que marcados `'use client'`.
- **Layouts compartilhados** persistem entre navigations no mesmo segmento.
- **Streaming SSR** com Suspense.
- **Loading e Error boundaries** automáticos por convenção (`loading.tsx`, `error.tsx`).
- **Server Actions** pra mutations.
- **Caching multi-layer** explicitamente designed in.

Pages Router ainda funciona, ainda é mantido, e ainda tem casos onde é a escolha certa (apps simples, projetos antigos sem urgência de migrar). App Router é o caminho pra projetos novos.

### 2.2 File system routing

Em App Router, estrutura define rotas:

```
app/
  layout.tsx                    → root layout, abrange tudo
  page.tsx                      → /
  about/
    page.tsx                    → /about
  orders/
    layout.tsx                  → layout pra /orders/*
    page.tsx                    → /orders
    [id]/
      page.tsx                  → /orders/:id
      edit/
        page.tsx                → /orders/:id/edit
  (dashboard)/                  → group, sem afetar URL
    settings/
      page.tsx                  → /settings
    profile/
      page.tsx                  → /profile
  api/
    orders/
      route.ts                  → API endpoint
```

Convenções de arquivos:
- `page.tsx`, UI da rota.
- `layout.tsx`, wrapper. `children` é a rota.
- `loading.tsx`, Suspense fallback automático.
- `error.tsx`, Error boundary.
- `not-found.tsx`, 404.
- `template.tsx`, como layout mas re-cria a cada navegação (perde state).
- `route.ts`, API endpoint (GET, POST, etc. exportados).
- `middleware.ts` (na raiz, não em app/), roda antes de todo request.

Parênteses (`(group)`) agrupam sem afetar URL. Colchetes duplos (`[[...slug]]`) são catch-all opcional.

### 2.3 Server Components em Next

Cada componente em `app/` é Server Component por default. Comportamento:
- Roda no servidor (Node ou Edge runtime, depende da config).
- Pode ser `async` e usar `await`.
- Tem acesso a env vars, FS, DB drivers direto.
- Não vai pro bundle do cliente, só seu output (RSC payload) viaja.
- Não pode usar hooks de state (`useState`, `useEffect`) nem listeners (`onClick`).

Pra ser Client Component, **a primeira linha** do arquivo deve ter:
```tsx
'use client';
```

Marca o componente e tudo o que ele importa como client. RSCs podem importar Client Components; o inverso só via `children` ou props serializáveis.

**Regra: empurre Client Components o mais pra fora possível.** Se uma página é só Client porque tem um botão interativo no canto, você está mandando código demais ao cliente.

### 2.4 Caching layers (a parte que mais dói)

Next 14/15 tem várias camadas de cache. Em Next 15, Turbopack/refactor mudou defaults, sempre confirme version. Os layers são:

1. **Request Memoization**: dentro de uma única request (server-side), `fetch` com mesma URL retorna cache. Mecanismo do React, não Next.

2. **Data Cache** (server): `fetch` é wrapped por Next pra cachear baseado em opções (`cache`, `next.revalidate`, `next.tags`). Default em Next 14 era cached ("static"); Next 15 mudou pra "no cache by default". **Sempre cheque versão**.

3. **Full Route Cache** (build): rotas estáticas são pré-renderizadas em build e servidas como HTML. Rotas dinâmicas não.

4. **Router Cache** (client): segmentos de rota cacheados no cliente em memória. Acelera back/forward e revisits.

5. **CDN/edge cache** (deployment): Vercel/Cloudflare/etc. cacheiam respostas conforme headers.

Como controlar:
- `fetch(url, { cache: 'force-cache' | 'no-store' })`, Data Cache.
- `fetch(url, { next: { revalidate: 60, tags: ['orders'] } })`, TTL e tag-based invalidation.
- `export const dynamic = 'force-dynamic' | 'force-static' | 'auto'` em layout/page, força comportamento da rota.
- `export const revalidate = 60`, TTL pra rota inteira.
- `revalidatePath('/orders')` ou `revalidateTag('orders')` em Server Action, invalida.
- `cookies()`, `headers()` em RSC, torna a rota dinâmica.

Mental model: **toda decisão de cache é "qual camada serve essa response, e quando ela invalida"**. Se você não consegue responder isso pra cada rota, vai apanhar.

### 2.5 Streaming SSR com Suspense

Em App Router, o servidor manda HTML em pedaços. Suspense boundaries definem onde a stream pode "esperar" sem bloquear o resto:

```tsx
<>
  <Header />
  <Suspense fallback={<Loading />}>
    <Posts />  {/* fetch demorado */}
  </Suspense>
  <Footer />
</>
```

User vê Header, Footer e Loading imediatamente; Posts aparece quando o fetch resolve. Tempo até primeiro byte (TTFB) muito melhor que SSR clássico.

`loading.tsx` em App Router é shorthand: arquivo é automaticamente envolvido em `<Suspense>` pelo Next.

### 2.6 Server Actions

Server Actions são funções server-side chamadas direto do client (sem você escrever endpoint). Sintaxe:

```tsx
async function createOrder(formData: FormData) {
  'use server';
  const order = await db.order.create({ ... });
  revalidatePath('/orders');
  return { id: order.id };
}

// no JSX:
<form action={createOrder}>
  <input name="customer" />
  <button>Create</button>
</form>
```

Por baixo: Next gera endpoint, RPC client, deserialization. Tipagem se mantém porque você importa a função.

Use cases: forms, mutations simples, "fire and forget" actions. Pra fluxos complexos (com validação rica, optimistic updates), libs como **TanStack Form**, **React Hook Form** + **next-safe-action** ajudam.

### 2.7 Middleware

`middleware.ts` na raiz roda em **Edge runtime** antes de cada request matched.

Use cases típicos:
- Auth check + redirect.
- Geo-based rewrites.
- A/B testing via cookie.
- Rate limiting básico.

Limitações: Edge runtime é restrito (não tem todas APIs de Node, deve ser leve, sem `fs`, sem `child_process`). Rode lógica pesada em RSC, não em middleware.

### 2.8 Edge vs Node runtime

Cada rota pode escolher runtime via `export const runtime = 'nodejs' | 'edge'`.

**Node runtime**:
- API completa de Node.
- Mais memória, mais CPU.
- Cold start mais lento (~100ms-1s).
- Boa pra workloads pesados (DB queries, file processing).

**Edge runtime**:
- Subset Web Standard (V8 isolates, sem Node APIs).
- Cold start instantâneo (~0-5ms).
- Distribuído globalmente (Cloudflare, Vercel Edge Network).
- Boa pra middleware, geo-routing, streaming responses simples.

Limitações Edge:
- Sem drivers nativos Postgres (`pg`), use HTTP-based (`@vercel/postgres`, `@neondatabase/serverless`, Supabase REST, etc.).
- Sem libs Node-only (`fs`, `crypto` clássico, etc.).
- Bundle size limit (~1 MB).

Decisão: comece em Node. Mude pra Edge quando o gargalo for cold start ou latência geográfica E a rota é compatível.

### 2.9 Route handlers vs Server Actions

Route handler (`route.ts`):
```ts
export async function GET(req: Request) { ... }
export async function POST(req: Request) { ... }
```
APIs RESTful tradicionais. Quando você quer endpoint público, integração com webhook, etc.

Server Action: chamada interna de UI Next pra Next. Sintaxe mais ergonômica, sem precisar de fetch manual.

Não são mutuamente exclusivos. Use route handlers pra integrações externas; Server Actions pra mutations da própria UI.

### 2.10 Image, Font, Script optimization

Next otimiza assets automaticamente:

- **`next/image`**: lazy load, srcset responsive, format conversion (AVIF/WebP). Reduz LCP drasticamente. **Sempre use** sobre `<img>`.
- **`next/font`**: download de Google Fonts ou local. Self-hosted, com `font-display: swap` correto, sem layout shift.
- **`next/script`**: load async, defer, depois de hydration, etc. Pra third-party scripts.

Otimização que mais impacta Core Web Vitals em projetos típicos.

### 2.11 Configuração e build

`next.config.js` (ou `.ts`) configura tudo. Pontos importantes:
- `images.domains` ou `remotePatterns`, quais hosts são permitidos pra `next/image`.
- `experimental` flags, features pré-stable.
- `headers()`, `redirects()`, `rewrites()`, configuração de routing fora do file system.
- `output`, `'standalone'` pra Docker images mínimas.

Build:
- `next build` gera `.next/`.
- Output mostra cada rota e tipo (`○ Static`, `λ Dynamic`, `ƒ ISR`, `Middleware`, etc.). **Sempre revise build output**: entender o que ficou estático vs dinâmico evita surpresas em produção.

### 2.12 Padrões em projetos reais

- **`fetch` com `next: { revalidate, tags }`** em RSC pra cache controlado.
- **React Query no client** pra dados que mudam frequentemente, com SSR initial state.
- **Server Actions pra forms** com `useActionState` (React 19) pra status pendente.
- **Middleware pra auth check** + redirect; rota usa `cookies()` pra ler session.
- **Parallel routes** (`@modal`) pra modais que persistem em URL.
- **Intercepting routes** pra modal sobre outra rota (Instagram-like photo viewer).
- **`generateStaticParams`** + `revalidate` pra híbrido SSG + ISR.

### 2.13 Server Components mental model, limite client/server

A separação entre Server e Client Components é o conceito central do App Router:

- **Server Components (default)**: rodam no servidor, **nunca** vão pro bundle JS do cliente. Podem `await` direto, acessar DB, fs, secrets. Não podem usar hooks, event handlers, browser APIs.
- **Client Components** (`"use client"`): rodam server (initial render) + client (hydration + subsequent). São JS shipped. Podem usar hooks, eventos, browser APIs.

Boundary é **importação**: Server Component que importa Client → ok. Client que importa Server → erro. Mas você pode passar Server Component **como children** pra Client Component:

```tsx
// ServerWrapper.tsx (server)
export default function Page() {
  return <ClientShell><ServerData /></ClientShell>;
}

// ClientShell.tsx
'use client';
export default function ClientShell({ children }) {
  const [open, setOpen] = useState(false);
  return open ? children : <button onClick={() => setOpen(true)}>open</button>;
}
```

`children` é serialized e shipped. `ServerData` foi rendered no servidor; ClientShell é interactive no client.

**Regras**:
- Pass props que são serializable (JSON-safe + Date, Map, Set, BigInt, Promise, FormData).
- **Não** pass functions de Server pra Client (exceto Server Actions).
- **Não** pass class instances; use plain objects.

### 2.14 RSC payload, o que viaja entre servidor e client

RSC produz **árvore serializada** especial (não HTML, não JSON puro):
- Server Components renderizados em uma representação posicional + props.
- Referências a Client Components (não código deles, só pointer).
- Suspense boundaries marcadas.

Browser recebe HTML inicial + RSC payload. Hidratação combina ambos. Em navigation subsequent (link click), só RSC payload é fetched + diff aplicado.

Implicações:
- **Tamanho de payload importa**. Server Components com mil items é payload grande. Mitigation: paginação, virtualization, summarization.
- **Streaming**: Suspense boundaries deixam payload chegar incremental.
- **Caching**: `cache()` (React) e `revalidateTag` (Next) controlam cache de fetch interno.

### 2.15 Streaming, Suspense, parallel routes profundo

`loading.tsx` em uma rota = wrapper Suspense automático. Substitui durante load.

```
app/
  layout.tsx
  loading.tsx           # ← UI fallback enquanto rota carrega
  page.tsx
  @modal/
    default.tsx
    (..)photos/[id]/page.tsx    # intercepting
```

**Parallel routes** (`@slot`): múltiplos slots renderizando em paralelo. Use case clássico: dashboard com sidebar + main + analytics independentes.

**Intercepting routes** (`(.)`, `(..)`, `(...)`): override de rota baseado em from-where-came. Modal sobre photo grid em vez de full page.

**Streaming patterns**:
- **Stream chunks of UI**: top of page renderiza imediatamente, conteúdo pesado em Suspense.
- **Sequential await em RSC**: cuidado, await encadeado serializa. Use `Promise.all`.
- **Out-of-order streaming**: Suspense permite que children resolvam fora de ordem.

### 2.16 Server Actions deep, revalidation, optimistic, transitions

Server Action é função `async` marcada com `'use server'`. Pode ser invocada de:
- Form `action={fn}`.
- Button `formAction={fn}`.
- Programaticamente em event handler client.

Após execução, **invalidate caches**:
```tsx
'use server';
export async function createOrder(data) {
  const order = await db.orders.create(data);
  revalidatePath('/orders');
  revalidateTag('orders');
  return order;
}
```

**Optimistic UI** com `useOptimistic` (React 19):
```tsx
'use client';
function Likes({ postId, count }) {
  const [optimisticCount, addOptimistic] = useOptimistic(count);
  return (
    <form action={async () => {
      addOptimistic(optimisticCount + 1);
      await likePost(postId);
    }}>
      <button>{optimisticCount}</button>
    </form>
  );
}
```

**Transitions** com `useTransition` impedem UI lock durante action. `isPending` mostra spinner sem block input.

**Validation**: Zod no server side é padrão. Erro retornado, exibido via `useActionState`.

**Rate limiting**: Server Actions são endpoints públicos sob disfarce. Apply rate limit + auth check sempre.

### 2.17 Edge runtime constraints

Edge runtime usa Vercel Edge Functions (V8 isolates), não Node.js. Restrições:
- **Sem Node.js APIs**: `fs`, `child_process`, `crypto.randomBytes` (use `crypto.subtle`).
- **Sem libs nativas**: `bcrypt` no, `argon2` no. Use Web Crypto API.
- **Postgres driver**: `pg` no (TCP raw), use `@neondatabase/serverless` ou `@vercel/postgres` (HTTP-based).
- **Tempo limit**: ~25-50s typical, varies provider.
- **Memória limit**: ~128MB typical.

Quando usar Edge: SEO-critical pages, geo-distributed APIs, low-latency redirects.
Quando NÃO usar: heavy compute, libs nativas, long-running.

### 2.18 ISR e cache invalidation strategies

ISR = Incremental Static Regeneration. Build estático + revalidação background.

```tsx
export const revalidate = 60; // segundos
```

Comportamento: primeira request após 60s dispara regen background; user vê stale; após regen, próximo user vê fresh.

**On-demand revalidation** mais responsivo:
```ts
revalidatePath('/products/[slug]');
revalidateTag('products');
```

Patterns:
- **Tag-based** pra collections (`revalidateTag('orders')` invalida todas pages com fetch tagged 'orders').
- **Path-based** pra páginas específicas.
- **Cron** + `/api/revalidate?secret=...` pra rebuild scheduled.

**Cache layer interaction** (recall §2.4):
- Request memoization: dedup duplicates dentro de single render.
- Data Cache: persistente entre requests, controled por `revalidate`/`tags`.
- Full Route Cache: build-time HTML stored.
- Router Cache: client-side, in-memory.

Mismatches comuns: `dynamic = 'force-dynamic'` desliga Data Cache, mas Router Cache ainda existe, user pode ver dado antigo até `router.refresh()`.

### 2.19 Turbopack vs Webpack

- **Webpack** (legacy default): maduro, slow em large codebases.
- **Turbopack** (Rust-based, default em Next 15+ dev): 10-50x faster cold start, incremental rebuilds quase instantâneos.
- Production builds ainda Webpack default (Turbopack production em GA process).

Cold start típico Next 14:
- Webpack: 3-10s pra primeiro render.
- Turbopack: 0.5-2s.

Bun + Next: alternativa de runtime; vale testar mas suporte oficial parcial.

### 2.20 Errors e instrumentation

`error.tsx` em rota = error boundary. `not-found.tsx` = 404.

```tsx
'use client';
export default function Error({ error, reset }) {
  return (
    <div>
      <p>Erro: {error.message}</p>
      <button onClick={reset}>Tentar novamente</button>
    </div>
  );
}
```

**Instrumentation** (`instrumentation.ts`):
```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./otel');
  }
}
```
Setup OpenTelemetry, Sentry, etc.

**`onRequestError`** (Next 15+) captura errors no servidor com request context.

### 2.21 Partial Pre-Rendering (PPR) + cache layers — Data Cache, Router Cache, Full Route Cache, fetch deduplication

Next.js 15+ tem 4 cache layers distintas + Partial Pre-Rendering (PPR) — modelo híbrido entre static e dynamic em mesma rota. Time que não entende cada layer recebe stale data, sees revalidation que não dispara, ou vê CPU explode com falsos cache hits. Esta seção mapeia comportamento real, código copy-paste, e armadilhas de produção.

**The 4 cache layers — mental model**:

| Layer | Escopo | TTL default | Storage | Invalidação |
|---|---|---|---|---|
| **Request Memoization** | Por request HTTP | Request lifetime | RAM do server | Auto end-of-request |
| **Data Cache** | Cross-request, cross-deployment opcional | `Infinity` (manual) | Filesystem `.next/cache/fetch-cache` ou KV/Redis | `revalidateTag`, `revalidatePath`, `revalidate: N` |
| **Full Route Cache** | Cross-request | Build-time pra static | `.next/server/app/<route>/.html` | Re-deploy ou ISR revalidate |
| **Router Cache (Client)** | Por session do browser | 5min static, 30s dynamic | Browser memory | `router.refresh()`, navegação `router.push()` com staleTime |

**Layer 1: Request Memoization (deduplicação automática)**:
```typescript
// app/order/[id]/page.tsx
import { getOrder } from '@/lib/data/orders';

export default async function Page({ params }: { params: { id: string } }) {
  const order = await getOrder(params.id);
  return <><Summary id={params.id} /><h1>{order.id}</h1></>;
}

async function Summary({ id }: { id: string }) {
  const order = await getOrder(id);   // mesma cached promise: 0 fetches extra
  return <p>Total: {order.total}</p>;
}
```
- Aplicado a `fetch()` nativo + funções com `cache()` wrapper.
- **Pegadinha**: NÃO funciona com bibliotecas que não usam `fetch` nativo (axios, @aws-sdk antigo). Wrap com `cache()` manualmente.

**Layer 2: Data Cache — controle explícito**:
```typescript
// Cache por 60s
await fetch(url, { next: { revalidate: 60 } });

// Cache for-ever, invalidate por tag
await fetch(url, { next: { tags: ['orders'] } });

// No cache (skip Data Cache)
await fetch(url, { cache: 'no-store' });

// Tag-based invalidation (em Server Action ou Route Handler)
import { revalidateTag, revalidatePath } from 'next/cache';
await db.orders.update({ id, status: 'shipped' });
revalidateTag('orders');           // invalidate específico
revalidatePath('/dashboard', 'layout');   // invalidate route
```
- **Pegadinha**: `revalidate: 0` ≠ `cache: 'no-store'`. `revalidate: 0` ainda cacheia mas re-valida cada request. Mude pra `cache: 'no-store'` quando quer skip total.
- **Multi-tag**: combine fine-grained + coarse: `tags: ['order:' + id, 'orders']`. Update single order revalida tag específica + lista.

**Layer 3: Full Route Cache (FRC)**:
- Static pages (sem `cookies()`/`headers()`/dynamic functions): pre-rendered em build, servidas como HTML.
- Trigger dynamic: `cookies()`, `headers()`, `searchParams`, `cache: 'no-store'`, `revalidate: 0`.
- Force estático: `export const dynamic = 'force-static'`.
- Force dynamic: `export const dynamic = 'force-dynamic'`.

**Layer 4: Router Cache (client-side)**:
- Browser memory; sobrevive entre navegações `router.push`.
- `staleTime`: 5min pra layout/loading static; 30s pra page dynamic.
- **Update**: `router.refresh()` re-fetcha da rota atual e atualiza Router Cache + Server Components renderizados.
- Próxima navegação `router.push('/path')` pega de Router Cache se válido — **não bate no servidor**, mesmo após `revalidateTag`.
- **Mitigação**: `router.refresh()` após mutation, OU `revalidatePath` no Server Action que retorna no client.

**Partial Pre-Rendering (PPR) — híbrido static/dynamic**:
```typescript
// next.config.ts
export default {
  experimental: { ppr: 'incremental' },  // 'incremental' permite opt-in por rota
};

// app/dashboard/page.tsx
export const experimental_ppr = true;

import { Suspense } from 'react';

export default function Dashboard() {
  return (
    <>
      <StaticHeader />
      <StaticNav />
      <Suspense fallback={<DynamicShell />}>
        <DynamicMetrics />
      </Suspense>
      <StaticFooter />
    </>
  );
}

async function DynamicMetrics() {
  const metrics = await fetch('https://api/metrics', { cache: 'no-store' });
  return <Metrics data={await metrics.json()} />;
}
```
- PPR pré-renderiza shell static (`StaticHeader`, `StaticFooter`, `<DynamicShell />` placeholder) em build → CDN serve TTFB ~30ms.
- Dynamic part streama do server depois.
- **Antes de PPR**: única dynamic call força rota inteira dynamic (TTFB 200ms+).

**Logística — exemplo real de cache stack completo**:
```typescript
// app/orders/[id]/page.tsx
import { Suspense } from 'react';
import { unstable_cache } from 'next/cache';

export const experimental_ppr = true;

const getOrderCached = unstable_cache(
  async (id: string) => db.orders.findById(id),
  ['order-by-id'],
  { revalidate: 30, tags: ['order:' + 'placeholder'] }   // tag dynamic abaixo
);

export default async function OrderPage({ params }: { params: { id: string } }) {
  return (
    <>
      <StaticBreadcrumb />
      <Suspense fallback={<OrderShell />}>
        <OrderContent id={params.id} />
      </Suspense>
    </>
  );
}

async function OrderContent({ id }: { id: string }) {
  const order = await getOrderCached(id);
  return <OrderDetails order={order} />;
}

// Server Action pra mutation
export async function updateOrderStatus(id: string, status: string) {
  'use server';
  await db.orders.update(id, { status });
  revalidateTag('order:' + id);
}
```
- **Stack ativo**: Request Memoization (dedupe), Data Cache (`unstable_cache` com 30s revalidate + tag), Full Route Cache (PPR static shell), Router Cache (client navigation).

**Cache observability — staging vs prod surprises**:
- `Cache-Control` header em responses: prod retorna `s-maxage=N, stale-while-revalidate`; staging pode retornar `private` se `cookies()` foi tocado.
- **Debug**: `next build` log mostra `○` (static) `●` (SSG) `ƒ` (dynamic) por rota — confere expectativa.
- Em runtime: `headers().get('x-nextjs-cache')` retorna `HIT/MISS/STALE/REVALIDATING`.
- Vercel: log `cache-status` em function logs. Self-host: cache em filesystem `.next/cache/fetch-cache/` (inspecionável).

**Distributed cache em produção (multi-instance)**:
```typescript
// next.config.ts — cache handler customizado (Next 14+)
export default {
  cacheHandler: require.resolve('./cache-handler.js'),
  cacheMaxMemorySize: 0,   // disable in-memory; use só Redis
};

// cache-handler.js
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

module.exports = class CacheHandler {
  async get(key) {
    const data = await redis.get(`next:${key}`);
    return data ? JSON.parse(data) : null;
  }
  async set(key, data, ctx) {
    const ttl = ctx?.revalidate ?? 3600;
    await redis.set(`next:${key}`, JSON.stringify(data), 'EX', ttl);
    if (ctx?.tags) {
      for (const tag of ctx.tags) {
        await redis.sadd(`next:tag:${tag}`, key);
      }
    }
  }
  async revalidateTag(tag) {
    const keys = await redis.smembers(`next:tag:${tag}`);
    if (keys.length) await redis.del(...keys.map(k => `next:${k}`));
    await redis.del(`next:tag:${tag}`);
  }
};
```
- Sem custom cache handler em multi-instance: cada pod tem cache local; revalidateTag em pod A não invalida pod B → users veem versões inconsistentes.

**Anti-patterns observados**:
- **`fetch` em loop sem cache wrapper**: cada call hits backend; Request Memoization ajuda mas só dentro da request.
- **`router.refresh()` esquecido pós-mutation**: client mostra stale data até next navigation.
- **`revalidate: 60` em endpoint que muda 100x/seg**: 60s window mostra stale; ou diminua revalidate ou use `cache: 'no-store'` + edge cache.
- **Multi-instance sem cache handler**: revalidateTag fragmenta consistency.
- **`cookies()` em layout root**: força toda a árvore dynamic; quebra PPR. Mova `cookies()` pra component leaf dentro de `<Suspense>`.
- **`unstable_cache` sem keyParts**: chave só pelo nome, args ignorados. Sempre passe `[functionName, ...argsArray]` no segundo parâmetro.
- **Tag genérica `'data'` pra tudo**: revalidateTag('data') invalida o app inteiro. Tag granular: `'order:' + id`.
- **Build-time fetch de API que muda**: `generateStaticParams` busca lista que stale em 1h; rotas pre-rendered desatualizadas.

Cruza com **02-05 §2.16** (Server Actions com revalidation), **02-05 §2.18** (ISR fundamentos), **02-04 §2.9** (RSC mental model), **02-04 §2.9.2** (use() + cache() em RSC), **02-11** (Redis como cache handler distribuído).

### 2.22 Parallel routes + intercepting routes + advanced middleware patterns

Next.js 15+ App Router (stable; Server Actions stable; Turbopack default) expõe três primitivos que o resto dos frameworks não tem: parallel routes pra renderizar múltiplas páginas em paralelo no mesmo layout, intercepting routes pra modais com deep linking real, e middleware Edge pra request lifecycle antes da rota. Domine os três ou fica no nível "fiz Next.js mas não conheço o App Router".

**Parallel routes — `@slot` convention**. Renderiza múltiplas pages simultâneas no mesmo layout (dashboard com `@analytics` + `@team` + `@notifications`). Cada slot é file-system folder prefixada com `@`:
```
app/
  dashboard/
    layout.tsx
    @analytics/
      page.tsx
      default.tsx     // fallback obrigatório
    @team/
      page.tsx
      default.tsx
    @notifications/
      page.tsx
      default.tsx
```
Layout recebe slots como props nomeados (além de `children`):
```tsx
export default function DashboardLayout({
  children,
  analytics,
  team,
  notifications,
}: {
  children: React.ReactNode;
  analytics: React.ReactNode;
  team: React.ReactNode;
  notifications: React.ReactNode;
}) {
  return (
    <div className="grid">
      <main>{children}</main>
      <aside>{analytics}</aside>
      <aside>{team}</aside>
      <aside>{notifications}</aside>
    </div>
  );
}
```
`default.tsx` em sub-routes é mandatory. Sem ele, navegação pra outra subroute quebra o slot silently (Next renderiza 404 só naquele slot).

**Independent loading + error boundaries per slot**. Cada slot tem própria `loading.tsx` + `error.tsx`. Streaming independente: `@courierMap` lento não bloqueia `@recentOrders`. Pattern Logística:
```
dashboard/
  @recentOrders/
    loading.tsx   // Skeleton order list
    error.tsx     // RetryButton
    page.tsx
  @courierMap/
    loading.tsx   // Skeleton map
    error.tsx
    page.tsx
```

**Conditional slot rendering**. Layout pode renderizar `null` baseado em condição (role, feature flag):
```tsx
export default async function Layout({ children, admin }: any) {
  const session = await auth();
  return (
    <>
      {children}
      {session.role === 'admin' && admin}
    </>
  );
}
```

**Intercepting routes — `(.)`, `(..)`, `(...)`**. Override de navigation pra renderizar route X no context atual (típico: modal). Convention: `(.)folder` intercepta mesmo nível; `(..)folder` intercepta um up; `(...)folder` from root. Estrutura clássica photos modal:
```
app/
  photos/
    [id]/
      page.tsx           // full page acesso direto
  feed/
    @modal/
      (..)photos/[id]/
        page.tsx         // modal quando navegado from feed
      default.tsx
    page.tsx
```
From `/feed` → click photo → URL muda pra `/photos/123` mas renderiza MODAL em cima do feed. Direct nav `/photos/123` (refresh, share link) → full page. Deep linking funciona porque a URL é real.

**Pattern Logística — order detail modal**. Lista orders em `/orders`. Click row → URL `/orders/123` mas modal sobrepõe a lista. Refresh `/orders/123` → full page:
```
app/
  orders/
    [id]/
      page.tsx
    @modal/
      (.)/[id]/
        page.tsx
      default.tsx
    page.tsx
```

**Advanced middleware patterns** (`middleware.ts` em root). Edge Runtime by default (Cloudflare Workers-like; subset Node API). Lifecycle: middleware → route → response. Manipulações: rewrite, redirect, headers, cookies.

**Multi-tenant middleware Logística** (subdomain tenant + locale negotiation + auth gate + tenant header injection):
```ts
// middleware.ts
import { NextResponse, NextRequest } from 'next/server';
import { match as matchLocale } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

const LOCALES = ['pt-BR', 'es-419', 'en'];
const DEFAULT_LOCALE = 'pt-BR';

export async function middleware(req: NextRequest) {
  const { pathname, host } = req.nextUrl;

  // 1. Tenant resolution from subdomain
  const subdomain = host.split('.')[0];
  const tenantId = subdomain === 'app' ? null : subdomain;

  // 2. Locale negotiation
  const pathnameLocale = LOCALES.find(l => pathname.startsWith(`/${l}/`));
  if (!pathnameLocale) {
    const headers = { 'accept-language': req.headers.get('accept-language') ?? '' };
    const negotiator = new Negotiator({ headers });
    const locale = matchLocale(negotiator.languages(), LOCALES, DEFAULT_LOCALE);
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, req.url));
  }

  // 3. Auth gate em /app/* routes
  if (pathname.includes('/app/')) {
    const token = req.cookies.get('session')?.value;
    if (!token) return NextResponse.redirect(new URL('/login', req.url));
  }

  // 4. Headers passados pro app
  const res = NextResponse.next();
  if (tenantId) res.headers.set('x-tenant-id', tenantId);
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health).*)'],
};
```

**Middleware limitations 2026**. Edge Runtime constraints: zero Node APIs (`fs`, `crypto.scrypt`), zero native modules. Bundle size cap: 1MB compressed (Vercel; 4MB Cloudflare). Latency: middleware roda em CADA request matched — heavy logic é latency tax direto. Cap < 50ms. Use `waitUntil` API pra fire-and-forget (analytics, log) sem bloquear response.

**Server Actions advanced patterns**. Form action progressive enhancement: `<form action={action}>` funciona SEM JS (form post fallback). `useFormState` (React 18) → `useActionState` (React 19; coberto em wave 21). Revalidation: `revalidatePath('/orders')` invalida route + Data Cache; `revalidateTag('orders')` granular. Security: actions são POSTs, CSRF protected via Next.js, argument validation via Zod sempre. Encrypted action IDs (Next.js 14+): client invocation IDs encriptados; backend valida origin.

**Logística applied stack**. Parallel routes: dashboard com `@metrics` + `@orders` + `@couriers` streaming independente. Intercepting routes: order detail modal sobre lista (`/orders/123` modal; refresh = full page). Middleware: tenant subdomain resolution + locale negotiation + auth gate + `x-tenant-id` header injection. Cache strategy: Server Components fetch com `next: { tags: ['orders', `tenant-${id}`] }`; Server Action `revalidateTag('orders')` invalida granular.

**Anti-patterns observados**:
- Parallel route sem `default.tsx` em sub-routes (navegação quebra silently; slot vira 404).
- Modal via state global em vez de intercepting route (perde deep linking + browser back/forward).
- Middleware com `console.log` em hot path (Edge Runtime CPU budget consumed; cobra por invocation).
- Middleware fazendo DB query (Edge não conecta direct via TCP; use route handler em Node runtime).
- Heavy bundle em middleware (1MB limit estoura silently em prod; build local não detecta).
- `revalidatePath('/')` em todo write (full cache flush; use granular tags `revalidateTag('orders')`).
- Server Action sem Zod validation (any client posta arbitrary; type erased em runtime — TS é compile-time).
- Subdomain tenant resolution em route handler em vez de middleware (latency adicional + duplicate logic em N rotas).
- `waitUntil` ausente em fire-and-forget (response blocked esperando analytics endpoint responder).
- Intercepting route sem fallback `default.tsx` em slot (deep link refresh quebra).

Cruza com **02-04** (React 19, `useActionState` em forms), **02-08** (backend frameworks, Server Actions ≈ POST endpoints com type safety), **02-13** (auth, middleware-based gating), **02-19** (i18n, locale negotiation em middleware), **03-10** (CDN/edge, middleware === edge runtime).

---

### 2.23 Next.js 15+ production 2026 — async dynamic APIs, dynamicIO, after(), instrumentation, Form

Next.js 15.0 (Q4 2024) quebrou contrato: `cookies()`, `headers()`, `params`, `searchParams` viraram `Promise<>`. Codemod `npx @next/codemod@latest next-async-request-api .` migra automaticamente; chamadas síncronas legadas emitem warning em 15.x e quebram em 16. Next 15.5 (Q3 2025) estabilizou `dynamicIO` + diretiva `'use cache'` — substitui `fetch({ next: { revalidate } })` + `unstable_cache` por modelo unificado. Next 16 RC (Q1 2026) traz Turbopack production stable e partial route caching v2. React 19.1 (Q1 2025) é peer dependency mínima. Vercel Functions runtime: Node 22 default, Edge para middleware.

Padrão production 2026: `dynamicIO` ligado, `'use cache'` em data layer com `cacheTag` por entidade, `after()` para audit/telemetria fire-and-forget pós-response, `instrumentation.ts` com OTel + `onRequestError` para Sentry unificado Node + Edge, Form component (`next/form`) para SSR-friendly submit com prefetch, Taint API para impedir leak de PII Server→Client.

#### Async dynamic APIs

```ts
// app/dashboard/page.tsx — Next 15+
import { cookies, headers } from 'next/headers'

export default async function DashboardPage() {
  const cookieStore = await cookies()        // Promise<ReadonlyRequestCookies>
  const headerStore = await headers()         // Promise<ReadonlyHeaders>

  const tenantId = cookieStore.get('tenant_id')?.value
  const userAgent = headerStore.get('user-agent')

  if (!tenantId) throw new Error('tenant missing')
  return <Dashboard tenantId={tenantId} ua={userAgent} />
}

// app/orders/[orderId]/page.tsx — params/searchParams também Promise
type Props = {
  params: Promise<{ orderId: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function OrderPage({ params, searchParams }: Props) {
  const { orderId } = await params
  const { tab = 'summary' } = await searchParams
  return <OrderView id={orderId} tab={tab} />
}
```

Chamada síncrona em Next 15 → `TypeError: cookies()... should be awaited`. Em RSC com muitos awaits, paralelize: `const [c, h] = await Promise.all([cookies(), headers()])`.

#### dynamicIO + 'use cache'

```ts
// next.config.ts
import type { NextConfig } from 'next'

const config: NextConfig = {
  experimental: {
    dynamicIO: true,
    cacheLife: {
      orders: { stale: 60, revalidate: 300, expire: 3600 },
    },
  },
}
export default config

// lib/orders.ts — data layer
import { unstable_cacheLife as cacheLife, unstable_cacheTag as cacheTag } from 'next/cache'

export async function getOrders(tenantId: string) {
  'use cache'
  cacheLife('orders')                    // preset config'd ou 'minutes'/'hours'/'days'
  cacheTag('orders', `tenant:${tenantId}`)

  const rows = await db.order.findMany({ where: { tenantId } })
  return rows
}

// app/actions/createOrder.ts — invalidação
'use server'
import { revalidateTag } from 'next/cache'

export async function createOrder(input: OrderInput) {
  const order = await db.order.create({ data: input })
  revalidateTag(`tenant:${input.tenantId}`)  // mata cache de getOrders pra esse tenant
  return order
}
```

Defaults: `cacheLife('default')` = stale 5min + revalidate 1h + expire 1d. Presets nativos: `seconds`, `minutes`, `hours`, `days`, `weeks`, `max`. Custom via `next.config.ts`. Sem `cacheTag`, invalidação só por TTL — anti-pattern em multi-tenant.

#### after() para fire-and-forget

```ts
// app/api/checkout/route.ts
import { after } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json()
  const order = await processOrder(body)

  after(async () => {
    // Roda APÓS response enviada ao cliente
    await Promise.all([
      auditLog.write({ action: 'order.created', orderId: order.id }),
      analytics.track({ event: 'checkout_complete', revenue: order.total }),
      sendOrderEmail(order),
    ])
  })

  return Response.json({ orderId: order.id })
}
```

`after()` (estável em 15.0, ex-`unstable_after`) substitui `waitUntil` em hot paths: garante execução pós-response sem bloquear TTFB. Não use para trabalho cuja confirmação precisa estar na response — use `await` normal.

#### instrumentation.ts

```ts
// instrumentation.ts (raiz do projeto)
import { registerOTel } from '@vercel/otel'

export async function register() {
  registerOTel({ serviceName: 'logistica-api' })

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation.node')   // Sentry Node SDK
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./instrumentation.edge')   // Sentry Edge SDK
  }
}

export async function onRequestError(
  err: unknown,
  request: { path: string; method: string; headers: Record<string, string> },
  context: { routerKind: 'Pages Router' | 'App Router'; routePath: string; routeType: 'render' | 'route' | 'action' | 'middleware' }
) {
  const Sentry = await import('@sentry/nextjs')
  Sentry.captureException(err, {
    tags: { route: context.routePath, kind: context.routerKind, type: context.routeType },
    extra: { path: request.path, method: request.method },
  })
}
```

`register()` chamado uma vez no startup (Node) ou por isolate (Edge). `onRequestError` unifica error reporting Server Components + route handlers + Server Actions + middleware — substitui wrapping manual por boundary.

#### Form component (next/form)

```tsx
// app/search/page.tsx
import Form from 'next/form'

export default function SearchPage() {
  return (
    <Form action="/search/results" scroll={false}>
      <input name="q" placeholder="buscar pedido" />
      <button type="submit">Buscar</button>
    </Form>
  )
}
```

`<Form>` faz prefetch da rota target ao montar, submit via client-side navigation (preserva estado React, sem full reload), e degrada para `<form>` HTML padrão se JS falhar — SSR-friendly. Para Server Actions, use `<form action={serverAction}>` normal (não `next/form`).

#### Taint API (PII protection)

```ts
// lib/users.ts
import { experimental_taintObjectReference as taintObject, experimental_taintUniqueValue as taintValue } from 'react'

export async function getUser(id: string) {
  const user = await db.user.findUnique({ where: { id } })
  if (!user) return null

  taintObject('Não passe o objeto User completo ao client', user)
  taintValue('Não exponha CPF', user, user.cpf)
  taintValue('Não exponha email', user, user.email)

  return user
}

// page.tsx
const user = await getUser(id)
return <ClientCard user={user} />        // throws em build/render — impede leak
return <ClientCard name={user.name} />   // ok — campo escolhido explicitamente
```

Habilita via `experimental.taint: true`. Defesa em profundidade — não substitui pick explícito de campos seguros.

#### ServerComponentsHMRCache

```ts
// next.config.ts
const config: NextConfig = {
  experimental: {
    serverComponentsHmrCache: true,   // dev-only — preserva fetch cache entre HMR
  },
}
```

Dev-only: edits em RSC não refazem `fetch()` upstream. No-op em prod build. Habilitar em CI/build confunde mas não quebra.

#### Stack Logística aplicada

- Multi-tenant resolver: `await cookies()` lê `tenant_id`, propagado em todo data layer; `cacheTag('orders', tenant:${id})` isola invalidação por tenant.
- `after()` para audit log de mutations (criar pedido, cancelar entrega) — escreve em event store sem latência percebida.
- `instrumentation.ts` registra OTel exporter para Tempo + Sentry para erros; `onRequestError` captura Server Action failures com `routePath` tag pra alerting por endpoint.
- `<Form>` em busca de pedidos (input + filtros) — prefetch da página de resultados ao focar input acelera percepção.
- Taint API em `getDriver()` impede CPF/CNH vazar para client component de mapa.

#### 10 anti-patterns

1. `cookies()` síncrono em Next 15 — `TypeError` em runtime; rode codemod `next-async-request-api`.
2. `await params` esquecido em dynamic route — TS aceita (params é `any` se mistipado), runtime quebra ou retorna `[object Promise]`.
3. `after()` em request crítico cuja response precisa confirmar o trabalho — use `await` ou `waitUntil` com semântica clara; `after()` não bloqueia mas também não garante delivery em edge cases (timeout do isolate).
4. `dynamicIO` sem `cacheTag` em entidade mutável — invalidação impossível, depende só de TTL; queries stale após mutation.
5. `'use cache'` em função com side effects (escrita em DB, log, mutação de objeto compartilhado) — re-execução silenciosa em revalidation quebra invariantes.
6. `<Form>` (next/form) sem `action` — vira `<form>` regular sem prefetch nem SSR fallback, perde o ponto.
7. `instrumentation.ts` sem `export function register()` — silent fail; sem warning, sem OTel, sem Sentry.
8. `taintObjectReference` aplicado em algumas paths mas não todas (cache hit retorna objeto pre-taint) — PII leak permanece; taint deve estar no construtor da entidade ou no único getter.
9. `serverComponentsHmrCache: true` em config production-shared — no-op mas confunde reviewers; isole em `next.config.dev.ts` ou condicional `process.env.NODE_ENV`.
10. `revalidateTag` chamado dentro de `'use cache'` function — circular invalidation, comportamento indefinido; `revalidateTag` é exclusivo de Server Actions / route handlers.

#### Cruza com

**02-05 §2.6** (Server Actions foundation), **§2.16** (Server Actions deep — `useActionState` + validation), **§2.21** (PPR + cache layers — `'use cache'` é a evolução), **§2.22** (parallel/intercepting routes + middleware), **§2.13–§2.14** (RSC mental model — async APIs só fazem sentido em RSC), **§2.17** (edge runtime constraints — `instrumentation.edge.ts` separado), **02-04 §2.13** (React 19 forms + `useActionState`), **03-07 §2.21** (instrumentation = OTel hook unificado), **02-13** (auth via middleware + `cookies()` async em RSC), **03-08** (Taint API = PII protection em defesa em profundidade), **03-09 §2.21** (image optimization 2026 — Next 15 `<Image>` component + `next.config.js` remote patterns Cloudflare Images + dynamic OG via `@vercel/og`), **03-17 §2.22** (a11y testing 2026).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Distinguir Pages Router e App Router e dizer quando ainda usar Pages.
- Listar as 5 caching layers e explicar quando cada uma age.
- Reproduzir caso onde `cookies()` torna rota dinâmica e como intencionalmente forçar isso ou evitar.
- Escrever Server Action com `revalidatePath` ou `revalidateTag` e justificar a escolha entre os dois.
- Explicar streaming SSR via Suspense com diagrama.
- Distinguir Edge runtime e Node runtime com 3 casos onde cada vence.
- Justificar quando usar `route.ts` vs Server Action.
- Decifrar build output do Next: ○, λ, ƒ.
- Diagnosticar hydration mismatch (causa comum: `Date.now()`, `Math.random()`, `localStorage` em RSC, conditional client-only).
- Explicar por que Client Components devem ficar nas folhas da árvore.

---

## 4. Desafio de Engenharia

Migrar **Logística (versão 02-01/02-02 vanilla)** pra Next.js App Router, com cache controlado, Server Actions, e streaming.

### Especificação

1. **Setup**:
   - Next 15+ com App Router.
   - TypeScript strict.
   - Tailwind config compartilhado com versão 02-01.
2. **Rotas**:
   - `/`, landing.
   - `/dashboard`, server-side aggregations (mockadas com sleep pra forçar streaming).
   - `/orders`, lista server-side com Suspense progressivo.
   - `/orders/[id]`, detalhe via `await` em RSC.
   - `/orders/new`, form com Server Action.
   - `/settings/(account|preferences)`, parallel/intercepting opcional.
3. **Caching**:
   - `/dashboard`: rota com `revalidate: 60`, tag `dashboard`.
   - `/orders`: força dynamic (lista pode mudar a qualquer momento).
   - `/orders/[id]`: cached com tag `order:{id}`, invalidada pela Server Action de update.
4. **Auth (mock)**:
   - Middleware checa cookie `session`. Sem session → redirect a `/login`.
   - `/login` faz Server Action que set cookie.
5. **Streaming**:
   - Cards do dashboard em Suspense individual com fallback skeleton.
   - User sente que página renderiza progressivamente.
6. **Performance**:
   - `next/image` em qualquer foto.
   - `next/font` carregando fonte só uma vez.
   - Bundle do cliente com nada que possa ficar no servidor.

### Restrições

- Sem `getServerSideProps` (App Router only).
- Sem React Query nesta fase (foco no que Next dá nativamente; 02-11 introduz cache externo se quiser).
- DB pode ser SQLite local pra dev, ou mocks em memória.

### Threshold

- Lighthouse: Performance ≥ 90 em todas rotas (mobile).
- Bundle do cliente em `/dashboard` < 200 KB JS.
- README explica:
  - Mapa de cada rota e qual caching layer aplicada.
  - Decisão de quais componentes são Server vs Client (com diagrama).
  - 1 hydration mismatch real que apareceu e como você consertou.
  - Como você invalidou cache após Server Action e por que escolheu `revalidatePath` ou `revalidateTag`.

### Stretch

- Edge runtime em rotas que usem só DB HTTP.
- Parallel routes pra modal de detalhe.
- ISR com `generateStaticParams` pra detalhes de pedidos populares.
- A/B test via middleware com cookie persistente.

---

## 5. Extensões e Conexões

- Liga com **02-04**: RSC, Suspense, Server Actions são features do React. Next só orquestra.
- Liga com **02-03** (Web APIs): cookies, headers, Web Streams.
- Liga com **02-07/02-08** (Node): route handlers/Server Actions rodam em Node ou Edge.
- Liga com **02-09** (Postgres): queries em RSC; cuidado com pool em serverless (use serverless driver ou Postgres com connection pooling como pgBouncer/Supavisor).
- Liga com **02-13** (auth): middleware com sessions.
- Liga com **03-02** (Docker): `output: 'standalone'` simplifica imagem Docker.
- Liga com **03-05** (AWS): hospedar Next em AWS via OpenNext, ECS, Lambda. Vercel é mais simples mas vendor lock-in.
- Liga com **03-09** (perf): Next entrega Web Vitals decentes por default; você refina.

---

## 6. Referências

- **Next.js docs** ([nextjs.org/docs](https://nextjs.org/docs)), leia App Router e Caching inteiro. Mude para versão atual antes de aplicar.
- **Vercel blog**: explica decisões de arquitetura.
- **React docs** sobre RSC.
- **"Understanding React Server Components"**: Lee Robinson e outros explicações longas.
- **Lee Robinson's blog** ([leerob.io](https://leerob.io/)), Vercel, Next deep dives.
- **Theo's YouTube** (t3.gg), análises de Next + alternativas.
- **OpenNext** ([open-next.js.org](https://open-next.js.org/)), deploy Next em AWS sem Vercel.
