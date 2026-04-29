---
module: 02-05
title: Next.js — App Router, RSC, Caching Layers, Edge vs Node
stage: plataforma
prereqs: [02-04]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 02-05 — Next.js

## 1. Problema de Engenharia

Next.js é o framework de fato pra apps React em produção. Mas o que ele faz vai além de "React com SSR" — é um sistema de roteamento, render híbrido (server/client/edge), múltiplas camadas de cache, otimização automática de assets, primitivas de RSC. Cada uma dessas peças tem regras sutis, e times perdem dias debugando comportamento esperado de cache, hydration mismatches, ou diferenças entre runtimes.

Este módulo não é "tutorial Next". É o modelo mental do que acontece em cada request, como o cache decide servir HTML estático ou re-renderizar, e quando vale o trade-off de Edge runtime vs Node.

---

## 2. Teoria Hard

### 2.1 App Router vs Pages Router

Pages Router (`/pages`) foi o padrão até 2022. Modelo: cada arquivo em `pages/` é uma rota; `getStaticProps`/`getServerSideProps`/`getStaticPaths` controlam fetch.

App Router (`/app`, default desde Next 13.4 stable) é uma reescrita baseada em RSC. Mudanças principais:
- **Server components por default** — componentes são server-only a menos que marcados `'use client'`.
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
- `page.tsx` — UI da rota.
- `layout.tsx` — wrapper. `children` é a rota.
- `loading.tsx` — Suspense fallback automático.
- `error.tsx` — Error boundary.
- `not-found.tsx` — 404.
- `template.tsx` — como layout mas re-cria a cada navegação (perde state).
- `route.ts` — API endpoint (GET, POST, etc. exportados).
- `middleware.ts` (na raiz, não em app/) — roda antes de todo request.

Parênteses (`(group)`) agrupam sem afetar URL. Colchetes duplos (`[[...slug]]`) são catch-all opcional.

### 2.3 Server Components em Next

Cada componente em `app/` é Server Component por default. Comportamento:
- Roda no servidor (Node ou Edge runtime, depende da config).
- Pode ser `async` e usar `await`.
- Tem acesso a env vars, FS, DB drivers direto.
- Não vai pro bundle do cliente — só seu output (RSC payload) viaja.
- Não pode usar hooks de state (`useState`, `useEffect`) nem listeners (`onClick`).

Pra ser Client Component, **a primeira linha** do arquivo deve ter:
```tsx
'use client';
```

Marca o componente e tudo o que ele importa como client. RSCs podem importar Client Components; o inverso só via `children` ou props serializáveis.

**Regra: empurre Client Components o mais pra fora possível.** Se uma página é só Client porque tem um botão interativo no canto, você está mandando código demais ao cliente.

### 2.4 Caching layers (a parte que mais dói)

Next 14/15 tem várias camadas de cache. Em Next 15, Turbopack/refactor mudou defaults — sempre confirme version. Os layers são:

1. **Request Memoization**: dentro de uma única request (server-side), `fetch` com mesma URL retorna cache. Mecanismo do React, não Next.

2. **Data Cache** (server): `fetch` é wrapped por Next pra cachear baseado em opções (`cache`, `next.revalidate`, `next.tags`). Default em Next 14 era cached ("static"); Next 15 mudou pra "no cache by default". **Sempre cheque versão**.

3. **Full Route Cache** (build): rotas estáticas são pré-renderizadas em build e servidas como HTML. Rotas dinâmicas não.

4. **Router Cache** (client): segmentos de rota cacheados no cliente em memória. Acelera back/forward e revisits.

5. **CDN/edge cache** (deployment): Vercel/Cloudflare/etc. cacheiam respostas conforme headers.

Como controlar:
- `fetch(url, { cache: 'force-cache' | 'no-store' })` — Data Cache.
- `fetch(url, { next: { revalidate: 60, tags: ['orders'] } })` — TTL e tag-based invalidation.
- `export const dynamic = 'force-dynamic' | 'force-static' | 'auto'` em layout/page — força comportamento da rota.
- `export const revalidate = 60` — TTL pra rota inteira.
- `revalidatePath('/orders')` ou `revalidateTag('orders')` em Server Action — invalida.
- `cookies()`, `headers()` em RSC — torna a rota dinâmica.

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
- Sem drivers nativos Postgres (`pg`) — use HTTP-based (`@vercel/postgres`, `@neondatabase/serverless`, Supabase REST, etc.).
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
- `images.domains` ou `remotePatterns` — quais hosts são permitidos pra `next/image`.
- `experimental` flags — features pré-stable.
- `headers()`, `redirects()`, `rewrites()` — configuração de routing fora do file system.
- `output` — `'standalone'` pra Docker images mínimas.

Build:
- `next build` gera `.next/`.
- Output mostra cada rota e tipo (`○ Static`, `λ Dynamic`, `ƒ ISR`, `Middleware`, etc.). **Sempre revise build output** — entender o que ficou estático vs dinâmico evita surpresas em produção.

### 2.12 Padrões em projetos reais

- **`fetch` com `next: { revalidate, tags }`** em RSC pra cache controlado.
- **React Query no client** pra dados que mudam frequentemente, com SSR initial state.
- **Server Actions pra forms** com `useActionState` (React 19) pra status pendente.
- **Middleware pra auth check** + redirect; rota usa `cookies()` pra ler session.
- **Parallel routes** (`@modal`) pra modais que persistem em URL.
- **Intercepting routes** pra modal sobre outra rota (Instagram-like photo viewer).
- **`generateStaticParams`** + `revalidate` pra híbrido SSG + ISR.

### 2.13 Server Components mental model — limite client/server

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

### 2.14 RSC payload — o que viaja entre servidor e client

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

### 2.16 Server Actions deep — revalidation, optimistic, transitions

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

Mismatches comuns: `dynamic = 'force-dynamic'` desliga Data Cache, mas Router Cache ainda existe — user pode ver dado antigo até `router.refresh()`.

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
   - `/` — landing.
   - `/dashboard` — server-side aggregations (mockadas com sleep pra forçar streaming).
   - `/orders` — lista server-side com Suspense progressivo.
   - `/orders/[id]` — detalhe via `await` em RSC.
   - `/orders/new` — form com Server Action.
   - `/settings/(account|preferences)` — parallel/intercepting opcional.
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

- **Next.js docs** ([nextjs.org/docs](https://nextjs.org/docs)) — leia App Router e Caching inteiro. Mude para versão atual antes de aplicar.
- **Vercel blog** — explica decisões de arquitetura.
- **React docs** sobre RSC.
- **"Understanding React Server Components"** — Lee Robinson e outros explicações longas.
- **Lee Robinson's blog** ([leerob.io](https://leerob.io/)) — Vercel, Next deep dives.
- **Theo's YouTube** (t3.gg) — análises de Next + alternativas.
- **OpenNext** ([open-next.js.org](https://open-next.js.org/)) — deploy Next em AWS sem Vercel.
