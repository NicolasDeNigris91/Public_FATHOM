---
module: 02-04
title: React Profundo, Virtual DOM, Fiber, Hooks, Suspense, RSC
stage: plataforma
prereqs: [02-03, 01-07]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 02-04, React Profundo

## 1. Problema de Engenharia

A maior parte dos devs React opera num modelo mental simplificado: "componente é função, hooks são state". Funciona pra fazer features triviais. Quebra na hora de:

- Decidir entre `useMemo` e `useState`.
- Saber por que um effect roda 2 vezes.
- Lidar com lista grande sem virtualizar.
- Entender por que `key` é crítica (e por que index como key dá bug sutil).
- Escrever lib React que funciona em SSR + RSC + cliente.
- Diagnosticar por que UI trava (sem culpar "JS é lento").

A diferença entre Pleno e Senior em React é profundidade do modelo: como o reconciler decide o que re-renderizar, o que Fiber permite, o que mudou com Concurrent Mode, o que RSC realmente é. Sem isso, você é refém do framework.

---

## 2. Teoria Hard

### 2.1 Modelo declarativo: UI = f(state)

A premissa do React: você descreve **o que** deve aparecer dado um estado, não **como** chegar lá. Quando o estado muda, React reconcilia (descobre o diff) e atualiza o DOM minimamente.

Esse é um dos paradigmas mais importantes do frontend moderno, e tem custo. React precisa **comparar** estado anterior vs novo pra calcular o diff. Esse processo é a "reconciliação", e é onde a maior parte das otimizações vive.

### 2.2 Virtual DOM, mais ou menos

"Virtual DOM" é o nome popular pra: representação em memória da árvore de UI. Em React, isso são objetos JS chamados **elementos** (criados via JSX → `React.createElement` → objetos `{ type, props, key, ref }`).

Em cada render, sua função componente retorna **uma nova árvore de elements**. React compara com a árvore anterior, calcula o diff, e aplica ao DOM real (ou a outro renderer, React Native, Ink, etc.).

A palavra "virtual" sugere mágica que não existe. É só **representação intermediária**.

### 2.3 Fiber, a árvore real do reconciler

Fiber é a estrutura interna que React mantém pra cada nó da árvore. Cada Fiber contém:
- `type`, `key`, `props`, `state`
- ponteiros pra `child`, `sibling`, `return` (parent), **linked tree**
- `alternate`, versão "atual" vs "work-in-progress"
- effects pendentes (commit), priority, lanes

A linked tree em vez de tree-recursivo permite **interrupção e retomada**: React pode pausar a meio de um render se algo mais prioritário chega (input do usuário, p.ex.), e voltar depois. Isso é a base do **Concurrent Mode**.

Fases do trabalho:
1. **Render phase** (pode ser interrompida): chama componentes, reconcilia, calcula effects pendentes. **Sem efeito colateral visível.**
2. **Commit phase** (não interrompível): aplica mudanças ao DOM, dispara effects e refs.

Por isso effects rodam **depois** do paint, e por isso `useState` setter durante render é problemático (você está dentro da render phase, mexendo em state que React ainda não terminou de processar).

### 2.4 Reconciliação e key

Algoritmo de diff é heurístico, O(n) (vs O(n³) ótimo). Premissas:
- **Tipos diferentes** geram árvores diferentes, descarta tudo, recria.
- **Mesmo tipo** atualiza props.
- **Listas** dependem de `key` pra identificar mesma "entidade lógica" entre renders.

Sem key (ou com index como key) em lista mutável, React assume "mesmo elemento na mesma posição", bug clássico: você reordena, mas state interno (input value, focus) acompanha o índice, não o item.

Use **key estável e única do domínio** (`order.id`, não `index`). Index como key só está OK em listas estáticas que nunca reordenam.

### 2.5 Render, re-render, e quando

Um componente re-renderiza quando:
- Seu state muda (`setX`).
- Sua prop muda (referência diferente).
- O parent re-renderiza (a menos que memoizado).
- Context que ele consome muda.

`useState`, `useReducer` triggeram. `setState(v)` agenda render. Múltiplos `setState` dentro do mesmo handler/effect são **batched** (um único render).

`React.memo(Component)` pula re-render se props (shallow comparison) não mudaram. Atalho que parece grátis mas pode não ser:
- Se props sempre mudam por referência (objeto inline), memo não ajuda.
- Custo da comparação em si pode bater custo do render.
- **Use seletivamente**, com profiling, não em tudo.

### 2.6 Hooks, modelo mental real

Hooks dependem de **ordem de chamada estável**. Internamente, React mantém uma **linked list de hooks** por componente. Cada `useState` é uma "slot" na lista. Por isso:
- Hooks só em top level (nunca dentro de if/for/return condicional).
- Hooks só em function components ou custom hooks.

`useState`:
- Lazy initial: `useState(() => expensive())`, função roda só no mount.
- Functional setter: `setX(prev => prev + 1)`, evita stale closures.

`useEffect`:
- Roda **após** commit (paint).
- Dependency array, empty `[]` é "uma vez no mount", `[a, b]` é "quando a ou b mudam".
- Cleanup function, roda antes do próximo effect ou no unmount.
- **Strict Mode** dispara mount-cleanup-mount em dev, força você a escrever cleanup correto.

`useLayoutEffect`:
- Roda **antes** do paint, sincronamente após DOM update.
- Use só quando precisa medir DOM e modificar antes do user ver. Caso contrário use `useEffect` (não bloqueia paint).

`useMemo`, `useCallback`:
- Cache shallow baseado em deps.
- `useMemo(() => compute(), [deps])`, pra cálculo caro **ou** referência estável (passar pra `React.memo` filho).
- `useCallback(fn, [deps])`, açúcar pra `useMemo(() => fn, [deps])`.
- Não memoize tudo. **Profile primeiro.**

`useRef`:
- Container mutável que sobrevive renders. `ref.current` é reescrevível sem re-render.
- Usos: ref a DOM (`<div ref={ref}>`), valor mutável que não dispara render (timers, last value, cancellation tokens).

`useReducer`:
- State com transitions explícitas. Bom pra UI com vários estados relacionados.

`useContext`:
- Lê context. Re-renderiza quando o **valor** do provider muda. Cuidado: object inline no provider muda toda render.

`useTransition`, `useDeferredValue` (Concurrent):
- Marcar updates como **transitions**: não-urgentes. React pode interromper se chegar input urgente.

`useSyncExternalStore`, para integrar stores externos (Redux, Zustand) com Concurrent Mode corretamente.

### 2.7 Compiler (React Compiler), deep

React Compiler (RC 2024, GA 2025-2026) automatiza memoization estática. Vale entender o **modelo mental** novo porque muda profundamente como você escreve componentes.

**O que ele faz:**
- Analisa cada função/componente como **black box puro** (rules of React).
- Detecta dependências reais via análise estática (sem runtime overhead extra de `useMemo` chains).
- Insere caches de valores derivados e closures **automaticamente**, em build time.
- Output é JS normal, não é runtime; é transformação.

**Antes do compiler:**
```tsx
const Card = memo(function Card({ user, onSelect }) {
  const fullName = useMemo(() => `${user.first} ${user.last}`, [user.first, user.last]);
  const handleClick = useCallback(() => onSelect(user.id), [onSelect, user.id]);
  return <button onClick={handleClick}>{fullName}</button>;
});
```

**Com compiler:**
```tsx
function Card({ user, onSelect }) {
  const fullName = `${user.first} ${user.last}`;
  return <button onClick={() => onSelect(user.id)}>{fullName}</button>;
}
```

Compiler detecta que `fullName` depende só de `user.first/.last`, que `onClick` depende de `onSelect/user.id`, e gera memoization equivalente. **Sem React.memo, sem useMemo, sem useCallback.** O código fica como você escreveria sem otimização, performance vem grátis.

**Rules of React (compiler-friendly):**
- Componentes/hooks são **idempotentes** dado mesmas props/state.
- **Sem mutação de props/state durante render**. Spread + retorno novo, sempre.
- **Sem chamada de hooks condicional** (a regra antiga vale igual).
- **Refs lidas/setadas em event handlers ou effects, nunca durante render**.
- **Props/state tratados como imutáveis**.

`eslint-plugin-react-compiler` (build-time) avisa quando código viola e o compiler vai pular esse arquivo (bail-out).

**Bail-out behavior:**
- Compiler decide **per-component** se compila. Se viola regras, pula esse componente, código segue funcionando, só sem otimização.
- DevTools mostra ✨ "compiled" badge nos otimizados (em React 19+).

**Migrações práticas:**
- **Não rip out `useMemo` em massa**. Compiler é resiliente, manter useMemos antigos não quebra.
- **Remova primeiro o `React.memo` redundante** depois de auditar, compiler memoiza componentes shallow-equal-prop automaticamente.
- **Lints novos**: `react-compiler/cannot-be-compiled` flagsa razão exata da bail-out.

**Quando ainda escrever useMemo manualmente:**
- Computação **muito** cara (parsing de mil linhas de JSON) onde você quer garantia de cache via referência shallow comparada.
- Identidade referencial **necessária** pra deps de hook downstream que **não** está sendo compilado (lib externa, custom hook bail-out).
- A maioria dos casos: **deixe o compiler decidir**.

**O que muda em interview/review:**
- Pergunta clássica "useMemo vs useCallback, quando usar?" passa a ser "como compiler decide quando memoizar; quando você ainda precisa intervir manualmente?".
- Code review: ver `useMemo`/`useCallback` em código novo é sinal de "não confia no compiler", questione, não copie.

### 2.8 Suspense e streaming

Suspense é mecanismo pra **componentes esperarem** algo (data, código lazy-loaded) sem você precisar gerenciar loading state manualmente.

```tsx
<Suspense fallback={<Spinner />}>
  <Comments />
</Suspense>
```

Quando algo dentro de Comments "throw a Promise" (convenção), React intercepta, mostra fallback, e re-tenta render quando promise resolve.

Use cases:
- `lazy()` pra code splitting: `const Comments = lazy(() => import('./Comments'))`.
- Data fetching com libs Suspense-aware (`React Query` com `suspense: true`, RSC, Relay).

Streaming SSR em React 18+: o servidor manda HTML em pedaços conforme suspense boundaries resolvem. Cliente hydrata progressivamente. UX melhor (TTFB rápido, conteúdo não-crítico depois).

#### Suspense + Error Boundaries — recovery em produção

Suspense sozinho captura **pending**; Error Boundary captura **rejected**. Pareados, são contrato completo de async UI. Em produção, app sem error boundary leva white screen no primeiro erro de fetch — inaceitável.

**Hierarquia de boundaries pra Logística dashboard:**

```tsx
// app/dashboard/page.tsx — granular boundaries por widget
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Cada widget tem own boundary — falha localizada não derruba página */}
      <Widget title="Pedidos hoje">
        <ErrorBoundary FallbackComponent={WidgetErrorFallback} onReset={() => /* refetch */}>
          <Suspense fallback={<WidgetSkeleton />}>
            <OrdersTodayCount />
          </Suspense>
        </ErrorBoundary>
      </Widget>

      <Widget title="Couriers ativos">
        <ErrorBoundary FallbackComponent={WidgetErrorFallback}>
          <Suspense fallback={<WidgetSkeleton />}>
            <ActiveCouriers />
          </Suspense>
        </ErrorBoundary>
      </Widget>

      <Widget title="Receita semanal">
        <ErrorBoundary FallbackComponent={WidgetErrorFallback}>
          <Suspense fallback={<ChartSkeleton />}>
            <WeeklyRevenue />
          </Suspense>
        </ErrorBoundary>
      </Widget>
    </div>
  );
}

function WidgetErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div role="alert" className="p-4 border-red-300 rounded">
      <p className="text-red-700">Não foi possível carregar este painel.</p>
      <button onClick={resetErrorBoundary} className="text-blue-600 underline">
        Tentar novamente
      </button>
      {process.env.NODE_ENV === 'development' && (
        <pre className="text-xs mt-2">{error.message}</pre>
      )}
    </div>
  );
}
```

**Retry com React Query reset (pattern canônico):**

```tsx
'use client';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

export function DashboardWithReset({ children }: { children: React.ReactNode }) {
  const { reset } = useQueryErrorResetBoundary();
  return (
    <ErrorBoundary
      onReset={reset}                      // limpa cache + dispara refetch
      FallbackComponent={WidgetErrorFallback}
    >
      <Suspense fallback={<DashboardSkeleton />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}
```

#### Transitions — UI responsivo durante mudança de estado

`useTransition` marca update como **non-urgent**: usuário pode clicar em outra coisa enquanto componente carrega. Não trava input.

```tsx
'use client';
import { useTransition, useState } from 'react';

export function TenantSwitcher({ tenants }: { tenants: Tenant[] }) {
  const [selectedId, setSelectedId] = useState(tenants[0].id);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <select
        value={selectedId}
        onChange={(e) => {
          startTransition(() => setSelectedId(e.target.value));
        }}
        disabled={false}                   // não bloqueia mesmo durante pending
      >
        {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <span className={isPending ? 'opacity-50' : ''}>
        <Suspense fallback={<DashboardSkeleton />}>
          <Dashboard tenantId={selectedId} />
        </Suspense>
      </span>
    </>
  );
}
```

Sem transition: select trava 200-800ms enquanto Dashboard carrega. Com transition: select responde imediato; Dashboard fica "stale + dim" até next data chegar.

#### `useDeferredValue` — defer derivação cara

Diferente de transition (que defere setState), `useDeferredValue` pega valor já-mudado e atrasa render do dependente:

```tsx
function SearchableOrderList({ search }: { search: string }) {
  const deferredSearch = useDeferredValue(search);
  // Lista re-filtra com deferred; input continua snappy
  const filtered = useMemo(() =>
    expensiveFilter(deferredSearch),
    [deferredSearch]
  );
  return <List items={filtered} />;
}
```

Usuário digita rápido → `search` atualiza imediato (input responsive); `filtered` atualiza atrasado (sem trava).

#### Pegadinhas em produção

- **Error boundary não pega**: erros em event handlers, async (sem throw em render), SSR. Para event handlers use try/catch + setState; para async, libs Suspense-aware fazem isso.
- **`onReset` sem `useQueryErrorResetBoundary`**: cache stale persiste; reset visual mas data não recarrega.
- **Boundary too broad**: 1 boundary no root = 1 erro tudo cai. Granular > coarse, sempre.
- **Skeleton vs Spinner**: layout shift quando spinner sai. Use skeleton com mesmas dimensões do conteúdo final.
- **Streaming SSR + Error Boundary**: erro durante stream pode resultar em half-rendered HTML; configure Next.js `error.tsx` per route segment como segunda linha.
- **Sentry / observability**: error boundary deve reportar pra observability stack. `componentDidCatch(error, info)` ou `onError` em react-error-boundary → `Sentry.captureException(error, { contexts: { react: info } })`.

Cruza com **03-09 §2.7** (hydration cost de streaming SSR), **03-07 §2.19** (error tracking em frontend), **02-04 §2.9.1** (Server Actions também precisam error boundary no client).

### 2.9 Server Components (RSC)

RSC é uma mudança fundamental no modelo. Componentes podem rodar **só no servidor**, não enviam JS pro cliente, podem `await` direto (assíncronos).

```tsx
// app/orders/page.tsx (server component por default em Next.js App Router)
async function OrdersPage() {
  const orders = await db.query('SELECT ...');
  return <OrderList orders={orders} />;
}
```

Características:
- Bundle zero pro client (componente nunca vai pro browser).
- Pode acessar DB, env vars, FS direto.
- Não pode usar hooks de state (`useState`, `useEffect`) nem refs nem eventos.
- Output é "RSC payload", formato serializado entre server e client.

Componentes client (com `'use client'`) coexistem. RSC pode importar e usar Client Components; o inverso só via children/props.

Modelo de "ilhas": página é majoritariamente HTML estático (RSC), com ilhas de interatividade (Client Components) onde precisa.

Implicação: muito do que se fazia com `useEffect` pra carregar data agora é `await` direto no server. `getServerSideProps` é history.

### 2.9.1 Server Actions, deep

Server Actions (estável Next.js 14+, padrão em Next.js 16) são funções com `'use server'` chamáveis do client como mutations. Substituem o ritual REST/tRPC para cenários CRUD do mesmo app.

**Modelo mental:**
- Server Component renderiza form ou button → declara handler com `'use server'`.
- Next gera **endpoint encrypted automatic** + cliente fetch transparente; React serializa args e response.
- Server Action é **mutation**: invalida cache (revalidatePath / revalidateTag) e dispara re-render do RSC dependente.

```tsx
// app/orders/new/page.tsx (Server Component)
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import { auth } from '@/auth';

const CreateOrderSchema = z.object({
  customer_email: z.string().email(),
  items: z.array(z.object({ sku: z.string(), qty: z.number().int().positive() })).min(1),
  notes: z.string().max(500).optional(),
});

async function createOrder(prevState: unknown, formData: FormData) {
  'use server';                                       // marker — NÃO vai pro client bundle
  const user = await auth();
  if (!user) return { error: 'unauthorized' };

  const parsed = CreateOrderSchema.safeParse({
    customer_email: formData.get('email'),
    items: JSON.parse(formData.get('items') as string),
    notes: formData.get('notes'),
  });
  if (!parsed.success) return { error: 'invalid', issues: parsed.error.flatten() };

  // Tenant isolation — RLS via Postgres role/setting
  const order = await db.transaction(async tx => {
    await tx.execute(`SET LOCAL app.tenant_id = '${user.tenantId}'`);
    return tx.insert(orders).values({ ...parsed.data, tenant_id: user.tenantId }).returning();
  });

  revalidatePath('/orders');                          // RSC list re-renders sem manual mutation
  return { ok: true, id: order[0].id };
}

export default function NewOrderPage() {
  return <NewOrderForm action={createOrder} />;       // Client Component imports server action
}
```

```tsx
// components/new-order-form.tsx (Client Component)
'use client';
import { useActionState, useFormStatus } from 'react';

export function NewOrderForm({ action }: { action: any }) {
  const [state, formAction] = useActionState(action, null);
  const { pending } = useFormStatus();
  return (
    <form action={formAction}>
      <input name="email" type="email" required />
      <input name="items" type="hidden" defaultValue="[]" />
      <textarea name="notes" />
      <button disabled={pending}>{pending ? 'Criando…' : 'Criar pedido'}</button>
      {state?.error && <p className="error">{state.error}</p>}
      {state?.ok && <p>Pedido {state.id} criado.</p>}
    </form>
  );
}
```

**Optimistic UI** com `useOptimistic`:

```tsx
'use client';
import { useOptimistic } from 'react';

function OrderList({ orders, deleteAction }) {
  const [optimistic, addOptimistic] = useOptimistic(orders, (state, id) =>
    state.filter(o => o.id !== id)
  );
  return optimistic.map(o => (
    <button key={o.id} onClick={async () => {
      addOptimistic(o.id);                  // UI atualiza imediato
      await deleteAction(o.id);             // server action async
      // se falhar, useOptimistic reverte; combine com toast de erro
    }}>Cancelar pedido {o.id}</button>
  ));
}
```

**Pegadinhas reais que mordem:**
- **Args são serializados**: você não pode passar function, Date sem cuidado, Map/Set, ou anything non-serializable. FormData ou plain objects.
- **Encryption keys**: Next gera key por build — em deploy multi-instance, todas as instâncias precisam mesma key (env `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`). Sem isso, "Failed to find Server Action" em mismatched routes.
- **CSRF protection**: built-in via origin header check. Custom fetch fora de `<form action>` ou `useActionState` pode bypass — sempre prefer abstractions oficiais.
- **Validação obrigatória server-side**: client `<input required>` é UX, não security. **Sempre** Zod ou similar no server action.
- **Long-running actions**: > 30s vão estourar function timeout em serverless. Use queue (Inngest, Trigger.dev, BullMQ) e Server Action só dispara o job.
- **Tenant isolation**: Server Action tem mesmo escopo de auth que page. Mas RLS no DB é defesa final — não confie só em check em código.
- **Type safety**: action retorna `Promise<unknown>` por default. Use `ServerActionState<T>` pattern com Zod schemas pra type-safe round-trip.

**Quando NÃO usar Server Actions:**
- API pública consumida por mobile app / 3rd party → use REST/tRPC/GraphQL com versioning explícito.
- Operações que precisam middleware customizado (rate limit per-route, custom headers) → API route.
- Read-heavy (data fetching) → Server Components diretos, não actions.

Server Actions são pra **mutations do same-app**. Para tudo mais, fica em padrões anteriores.

#### 2.9.2 React 19 — `use()` hook e `cache()` em RSC patterns

React 19 (stable 2024) e React Compiler RC (2025) consolidam `use()` e `cache()` como primitivas centrais pra Server Components. `use()` lê promessas/contextos dentro de render conditional; `cache()` deduplica chamadas dentro de uma request. Sem entender, devs escrevem RSC com waterfall N+1, ou client components que poderiam ser server.

**`use()` hook — o que é e o que NÃO é:**
- Função especial que aceita `Promise<T>` ou `Context<T>` e retorna o valor unwrapped.
- **Pode ser chamada conditionally e dentro de loops** (diferente de `useState`/`useEffect`). Essa é a feature crítica.
- Server Component: `use(promise)` suspende até resolve, integra com `<Suspense>` pai.
- Client Component: `use(promise)` também funciona, mas a promise tem que vir de server (passada como prop ou de cached source) — criar promise inline em client cria loop infinito.

```tsx
// app/order/[id]/page.tsx (Server Component)
import { use } from 'react';
import { db } from '@/lib/db';

export default function OrderPage({ params }: { params: { id: string } }) {
  const order = use(db.orders.findById(params.id));
  return (
    <article>
      <h1>Order #{order.id}</h1>
      <Status status={order.status} />
    </article>
  );
}
```

Sem `await`. `use()` permite usar a promise como valor. Suspende automaticamente até resolve; `<Suspense>` boundary acima mostra fallback.

**`use()` conditional — impossível com hooks tradicionais:**

```tsx
import { use } from 'react';

export function CourierBadge({
  courierId,
  loadDetails,
  courierPromise,
}: {
  courierId: string;
  loadDetails: boolean;
  courierPromise: Promise<Courier>;
}) {
  if (!loadDetails) return <span>{courierId}</span>;
  const courier = use(courierPromise);   // OK: dentro do if
  return <span>{courier.name} ({courier.rating})</span>;
}
```

Ganho: lazy-loading sem re-architecture. Componente decide se precisa do dado em render time. Constraint: `courierPromise` é estável (não recriada a cada render). Geralmente passada de server component pai.

**`cache()` — request-scoped memoization:**
- **Server-only** (não funciona em client; ele lança em build).
- Memoiza retorno de função pelo hash dos args, escopo é uma server request.
- Múltiplos componentes na mesma render tree chamando `getOrder(id)` resultam em UMA query DB.
- Não persiste entre requests (≠ SWR ou React Query); pra cross-request use Next.js `unstable_cache` ou `revalidateTag`.

```tsx
// lib/data/orders.ts
import { cache } from 'react';
import { db } from '@/lib/db';

export const getOrder = cache(async (id: string) => {
  return db.orders.findById(id);
});

export const getCourier = cache(async (id: string) => {
  return db.couriers.findById(id);
});
```

```tsx
// app/order/[id]/page.tsx
import { getOrder, getCourier } from '@/lib/data/orders';
import { use } from 'react';

export default function Page({ params }: { params: { id: string } }) {
  const order = use(getOrder(params.id));
  return (
    <>
      <OrderSummary id={params.id} />
      <AssignedCourier orderId={params.id} />
      <h2>Order #{order.id}</h2>
    </>
  );
}

function OrderSummary({ id }: { id: string }) {
  const order = use(getOrder(id));   // mesma cached promise
  return <p>Total: {order.total}</p>;
}

function AssignedCourier({ orderId }: { orderId: string }) {
  const order = use(getOrder(orderId));   // mesma cached promise; sem 2ª query
  const courier = use(getCourier(order.courier_id));
  return <p>Courier: {courier.name}</p>;
}
```

Sem `cache()`: 3 queries na DB (uma por componente). Com `cache()`: 1 query pra Order + 1 pra Courier.

**Pegadinha — preload pattern pra evitar waterfall:**

```tsx
// Bad: waterfall (Page espera Order pra renderizar Items, Items espera Courier...)
const order = use(getOrder(id));
const items = use(getOrderItems(id));      // só inicia depois
const courier = use(getCourier(order.courier_id));   // depende do order

// Good: preload + parallel
getOrderItems(id);                          // fire-and-forget; promise cached
const order = use(getOrder(id));
const items = use(getOrderItems(id));      // promise já em flight; race resolves fast
```

Pattern oficial: chamar a função (não awaitar) early pra warm o cache; depois `use()` quando precisa. Documentado em https://react.dev/reference/react/cache (preload pattern).

**Combinando use() + cache() + Suspense em Logística:**

```tsx
// app/dashboard/page.tsx
import { Suspense, use } from 'react';
import { getActiveOrders, getCourierStats, preloadCouriers } from '@/lib/data';

export default function Dashboard() {
  // Preload pra warm cache; render imediato
  preloadCouriers();
  return (
    <>
      <h1>Operations dashboard</h1>
      <Suspense fallback={<OrdersListSkeleton />}>
        <ActiveOrders />
      </Suspense>
      <Suspense fallback={<CourierStatsSkeleton />}>
        <CourierStats />
      </Suspense>
    </>
  );
}

function ActiveOrders() {
  const orders = use(getActiveOrders());
  return <ul>{orders.map(o => <OrderRow key={o.id} order={o} />)}</ul>;
}

function CourierStats() {
  const stats = use(getCourierStats());
  return <StatsTable stats={stats} />;
}
```

Cada `<Suspense>` streama independente; user vê skeleton + primeiro card que resolve, depois o segundo.

**Anti-patterns observados:**
- `use()` no client component com promise criada inline (`use(fetch(url))`): re-renderiza, recria promise, loop infinito. Use só com promise estável (passada de server, ou de `cache()`-d source, ou de React Query).
- `cache()` em client component: throws no build. Server-only.
- `cache()` esperando deduplicar entre requests: não, é por request. Pra cross-request use `unstable_cache` (Next) com tags + `revalidateTag`.
- Esquecer preload: cada `use()` espera sequencial, vira waterfall N+1. Preload no topo da árvore + cache resolve.
- Misturar `await` e `use()` no mesmo server component: funciona mas fica confuso. Padrão: server component com `async` usa `await`; nested server components usam `use()` de cached promises pra não criar waterfalls.
- `cache()` keying em objeto inline: `cache(fn)({ id: x })` cria hash novo a cada render porque objeto é nova reference. Use args primitivos.

**`use(Context)` — bonus:** `use(MyContext)` é equivalente a `useContext(MyContext)` mas pode ser conditional. Útil em árvores que entram/saem de provider.

**Quando NÃO usar use() / cache():**
- SPA pura sem Server Components (CRA, Vite SPA, RN sem RSC): `cache()` não faz sentido (sem request boundary). Use React Query / SWR.
- Data que muda em client (ações de user): mantenha hooks tradicionais ou Server Actions com revalidate.
- App pequena sem performance issues: padrão `async`/`await` em server component basta.

Cruza com **02-04 §2.8** (Suspense é o partner natural de `use()`), **02-04 §2.9** (RSC fundamentos), **02-04 §2.9.1** (Server Actions são o complemento mutation-side), **04-09 §2.x** (deduplication padrão também aplica em GraphQL DataLoader).

### 2.10 Padrões de gerenciamento de state

Estado local: `useState`/`useReducer`.
Estado de form: bibliotecas (`React Hook Form`, `formik`) ou primitivas + Zod schema.
Estado de servidor (queries, mutations): **`React Query`** (TanStack Query) ou **SWR**. Raramente Redux pra isso.
Estado global (UI): `Context` simples, ou **Zustand**, **Jotai**. Redux Toolkit pra times maiores.
URL state: `searchParams`. Em Next App Router é nativo.

Rule of thumb moderna: **maior parte do "estado global" é estado de servidor**. React Query resolve isso com cache, refetch, optimistic updates. Reduz drasticamente código de state global custom.

### 2.11 Performance e profiling

Ferramentas:
- **React DevTools Profiler**: grava render, mostra qual componente renderizou e por quê (precisa habilitar "Why did this render?").
- **Browser Performance tab**: tempos reais, includes paint/layout.

Patterns úteis:
- **Virtualização** (`react-virtual`, `tanstack/react-virtual`) pra listas grandes.
- **Code splitting** com `lazy()` + Suspense.
- **`startTransition`** pra inputs que filtram listas pesadas.
- **`React.memo`** seletivo (pós-profiling).
- **Estabilizar referencias** de props passadas a memoized children (`useCallback`/`useMemo`).
- **`key` correta** em listas.

Anti-patterns:
- `React.memo` por todo lado sem medir.
- `useCallback` por todo lado.
- Effects pra tudo (muitos casos não precisam de effect, pode derivar de props/state direto).
- Estado global pra tudo (faça local primeiro).

### 2.12 Padrões de composição

- **Children pattern**: passe children em vez de prop drilling. Server Component passa client component como children pra outro client component evita re-render desnecessário.
- **Compound components**: pattern de UI library (`<Tabs><Tabs.List>...</Tabs.List></Tabs>`). Usa Context interno.
- **Render props / function-as-children**: pré-hooks. Hoje hooks substituem na maioria dos casos.
- **Higher-Order Components (HOC)**: também pré-hooks. Use raramente em código novo.
- **Slot pattern**: Radix UI `asChild`, similar.
- **Container / Presentational**: valor diminuiu com hooks; ainda útil em times grandes.

### 2.13 React 19 Forms + Actions + concurrent rendering deep (useActionState, useOptimistic, useTransition)

React 19 stable (Maio 2025+, RC fim 2024) reescreve o modelo de formulário e introduz primitives de concurrent rendering production-ready. `<form action={fn}>` aceita função (server action OU client function) — não só URL string. Auto-pending state, auto-reset, integração com ErrorBoundary. Substitui ~80% dos use cases de form libraries; `react-hook-form` ainda relevante em forms complexas (field arrays, validação cross-field reativa).

**`useActionState` (antes `useFormState`)** — signature: `const [state, dispatch, isPending] = useActionState(action, initialState);`. Action recebe `(prevState, formData)` e retorna `Promise<NewState>`. Pattern Logística — criar pedido:

```tsx
'use client';
import { useActionState } from 'react';
import { createOrderAction } from './actions';

export function CreateOrderForm() {
  const [state, dispatch, isPending] = useActionState(createOrderAction, {
    error: null, order: null,
  });
  return (
    <form action={dispatch}>
      <input name="pickup" required />
      <input name="dropoff" required />
      <button disabled={isPending}>{isPending ? 'Criando...' : 'Criar pedido'}</button>
      {state.error && <p role="alert">{state.error}</p>}
      {state.order && <p>Pedido #{state.order.id} criado</p>}
    </form>
  );
}
```

```ts
'use server';
export async function createOrderAction(prev: State, fd: FormData): Promise<State> {
  const parsed = OrderSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.message, order: null };
  try {
    const order = await db.orders.insert(parsed.data);
    revalidatePath('/orders');
    return { error: null, order };
  } catch (e) {
    return { error: e.message, order: null };
  }
}
```

**`useFormStatus`** — lê pending state do form ancestral. Substitui prop drilling de `isPending`. Pattern: `<SubmitButton />` componente independente que sabe sozinho quando submit está em flight. Restrição: deve ser CHILD do `<form>`, não o form em si — usar no parent throws.

**`useOptimistic`** — optimistic UI antes do server response. Signature: `const [optimistic, addOptimistic] = useOptimistic(serverState, reducer);`. Pattern Logística — "marcar entregue":

```tsx
export function OrderActions({ order }: { order: Order }) {
  const [optimisticOrder, applyOptimistic] = useOptimistic(
    order,
    (curr, action: 'delivered') => ({ ...curr, status: action })
  );
  async function handleDelivered() {
    applyOptimistic('delivered');
    await markDeliveredAction(order.id); // se falhar, React reverte automaticamente
  }
  return (
    <div>
      <span>Status: {optimisticOrder.status}</span>
      <form action={handleDelivered}><button>Marcar entregue</button></form>
    </div>
  );
}
```

Pegadinha crítica: `useOptimistic` reverte automaticamente quando action throws. Não precisa rollback manual; não usar try/catch pra reverter state.

**`useTransition` (concurrent rendering)** — `const [isPending, startTransition] = useTransition();` marca update como non-urgent. URGENT updates (typing input, click feedback) NÃO são suspended; transition updates SIM. Pattern Logística — search filter list:

```tsx
const [filter, setFilter] = useState('');
const [isPending, startTransition] = useTransition();
return (
  <>
    <input value={filter} onChange={e => {
      setFilter(e.target.value); // urgent: input feedback instant
      startTransition(() => {
        router.push(`/orders?q=${e.target.value}`); // non-urgent: list re-render
      });
    }} />
    {isPending && <Spinner />}
    <OrdersList query={filter} />
  </>
);
```

Concurrent rendering = React pode pause/resume/abandon work em transition. Tearing prevention em external stores (Zustand/Jotai/Redux) via `useSyncExternalStore`.

**Suspense boundaries production** — granularity: 1 boundary por unit de loading independente. Skeleton bem placed > spinner page-level. Pattern Logística dashboard:

```tsx
<Dashboard>
  <Suspense fallback={<MetricsSkeleton />}>
    <Metrics tenantId={id} />
  </Suspense>
  <Suspense fallback={<OrdersListSkeleton />}>
    <OrdersList tenantId={id} />
  </Suspense>
</Dashboard>
```

Metrics e OrdersList carregam em paralelo, cada uma streams independente — Next.js 15+ App Router faz streaming HTTP por boundary.

**Error boundaries integration** — React 19 ErrorBoundary catches errors em renders, actions, sync code. Async errors de `<form action>` quando action throws: caught by parent ErrorBoundary OU retornados como state via `useActionState`. Pattern: ErrorBoundary fora do form (errors inesperados, network down); `useActionState` dentro (errors esperados, validation). Não confunde categorias.

**`useDeferredValue` vs `useTransition`** — `useTransition` envolve setState (você controla); `useDeferredValue` marca um VALUE como non-urgent (React decide). Use `useDeferredValue` quando consome value do parent que não controla: `const deferredQuery = useDeferredValue(query);`. Não combinar com `useTransition` na mesma value (redundante).

**Logística applied stack**:

- Form criar pedido: `useActionState` + Server Action + Zod + `revalidatePath`.
- "Marcar entregue" lista: `useOptimistic` + Server Action; revert auto se erro.
- Search filter: `useTransition` mantém input responsive enquanto re-render lista.
- Dashboard: nested Suspense boundaries pra paralelizar fetches por widget.

**Anti-patterns observados**:

- `react-hook-form` em form simples já resolvido por `useActionState` (overhead injustificado).
- `useActionState` com função sync (perde benefit; use direct setState).
- `useOptimistic` sem action async (hook é noop pra sync work).
- `useTransition` em todo setState (perde urgência de reactions; use só pra non-urgent).
- Suspense boundary page-level (perde granularity; skeleton 1 por unit independente).
- Server action sem `revalidatePath` ou `revalidateTag` (UI fica stale após mutação).
- Form action que throws sem ErrorBoundary OU `useActionState` catch (UI quebra).
- `useFormStatus` no parent do form em vez de child (throws).
- `useState` para state que vem de URL (use `searchParams` + transition em search/filter).
- `useDeferredValue` + `useTransition` na mesma value (pick one).

**Cruza com**: `02-05` (Next.js 15+, Server Actions integration), `02-08` (backend frameworks, server actions ≈ POST endpoints), `03-09` (frontend perf, transition prevents jank), `02-10` (ORMs Drizzle/Prisma em server actions), `02-19` (i18n, `useActionState` + locale validation).

### 2.14 React Compiler (RC) + state management 2026 — Zustand vs Jotai vs Valtio vs Redux Toolkit

**React Compiler (RC) — what changes 2026**: stable desde late 2024 / 2025; default-enabled em new Next.js 15+/Remix projects 2026. Compiler detecta quando components/values são pure e auto-wraps em `memo()` / `useMemo()` / `useCallback()` equivalents. Resultado: 90%+ das annotations manuais (`useMemo`, `useCallback`, `React.memo`) tornam-se desnecessárias. Migration: opt-in via Babel plugin; codemod oficial remove redundant memos.

**Configuration (Next.js 15+ + React Compiler)**:
```ts
// next.config.ts
import type { NextConfig } from 'next';
const config: NextConfig = {
  experimental: {
    reactCompiler: true,  // Enable React Compiler
  },
};
export default config;
```
```bash
# Manual: babel-plugin-react-compiler
npm install babel-plugin-react-compiler
```
```jsonc
// .babelrc
{ "plugins": ["babel-plugin-react-compiler"] }
```

**Mental model RC**: tracks dependencies (sabe de que cada value depende; recompute apenas quando deps mudam); component memoization (auto-memoiza children quando props inalteradas); stable callbacks (function identity preservada cross-render quando closure values estáveis). Pattern Logística (before vs after RC):
```tsx
// BEFORE — manual memo
const OrderRow = React.memo(({ order, onSelect }: Props) => {
  const handleClick = useCallback(() => onSelect(order.id), [order.id, onSelect]);
  const total = useMemo(() => calculateTotal(order.items), [order.items]);
  return <div onClick={handleClick}>{total}</div>;
});

// AFTER — RC handles it
function OrderRow({ order, onSelect }: Props) {
  const handleClick = () => onSelect(order.id);
  const total = calculateTotal(order.items);
  return <div onClick={handleClick}>{total}</div>;
}
```

**O que RC NÃO faz (ainda manual)**: side effects (`useEffect` deps continuam responsabilidade sua); external state subscriptions (`useSyncExternalStore` inalterado); async operations (data fetching, mutations inalterados); component identity para refs/`forwardRef` (manual); edge cases violando Rules of React (ESLint plugin `eslint-plugin-react-compiler` flagga).

**State management 2026 — landscape**:
- `useState` / `useReducer` (built-in): single component ou shallow tree; default.
- Context API: cross-component limitado a subtree; re-render todos os consumers em update.
- Zustand (~3KB; vanilla store): pragmático; sem Provider; selector-based subscriptions.
- Jotai (~10KB; atoms): atomic granular subscriptions; sucessor de Recoil.
- Valtio (~5KB; proxy-based): mutate-style API; reactive proxy.
- Redux Toolkit (RTK): enterprise; time-travel debug; ecosystem amplo.
- TanStack Query / SWR: server state caching (NÃO general state mgmt; complementar).

**Zustand 5+ pattern Logística**:
```ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface OrdersStore {
  orders: Order[];
  selectedId: string | null;
  selectOrder: (id: string) => void;
  fetchOrders: () => Promise<void>;
}

export const useOrdersStore = create<OrdersStore>()(
  devtools(
    persist(
      (set) => ({
        orders: [],
        selectedId: null,
        selectOrder: (id) => set({ selectedId: id }),
        fetchOrders: async () => {
          const res = await fetch('/api/orders');
          const orders = await res.json();
          set({ orders });
        },
      }),
      { name: 'orders-store' }  // localStorage key
    )
  )
);

// Component
function OrdersList() {
  const orders = useOrdersStore((s) => s.orders);  // selector
  const select = useOrdersStore((s) => s.selectOrder);
  return orders.map(o => <button onClick={() => select(o.id)}>{o.id}</button>);
}
```

**Jotai 2.10+ pattern (atoms)**:
```ts
import { atom, useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

const ordersAtom = atom<Order[]>([]);
const selectedIdAtom = atomWithStorage<string | null>('selectedId', null);

// Derived atom (auto-computed from base atoms)
const selectedOrderAtom = atom((get) => {
  const orders = get(ordersAtom);
  const id = get(selectedIdAtom);
  return orders.find(o => o.id === id);
});

function OrderDetail() {
  const [selected] = useAtom(selectedOrderAtom);  // re-renders only when selected changes
  return selected ? <div>{selected.id}</div> : null;
}
```

**Valtio 2+ pattern (proxy mutate-style)**:
```ts
import { proxy, useSnapshot } from 'valtio';

const state = proxy({
  orders: [] as Order[],
  selectedId: null as string | null,
});

// Mutate directly (proxy tracks)
function selectOrder(id: string) {
  state.selectedId = id;
}
async function fetchOrders() {
  state.orders = await (await fetch('/api/orders')).json();
}

function OrdersList() {
  const snap = useSnapshot(state);  // immutable snapshot; re-renders on access changes
  return snap.orders.map(o => <button onClick={() => selectOrder(o.id)}>{o.id}</button>);
}
```

**Decision matrix 2026**:

| Lib | Best for | Bundle | API style | DevTools |
|---|---|---|---|---|
| `useState` | Local component | 0 | Hooks | React DevTools |
| Context | Subtree config (theme, auth) | 0 | Hooks | React DevTools |
| Zustand | App-wide pragmático | ~3KB | Selector hooks | Redux DevTools middleware |
| Jotai | Granular atoms + derived | ~10KB | Hooks per atom | Jotai DevTools |
| Valtio | Mutate-style preference | ~5KB | Proxy | Valtio DevTools |
| RTK | Enterprise + time-travel | ~30KB | Slices + reducers | Redux DevTools full |
| TanStack Query | Server state | ~13KB | Hook per query | TQ DevTools |

**Server state vs UI state — separation rígida**: server state (orders fetched from API) → TanStack Query 5.60+ / SWR (auto-refetch + cache + invalidation). UI state (filter selected, modal open) → Zustand/Jotai/`useState`. Anti-pattern: armazenar server state em Redux/Zustand sem invalidation logic explícita (replica responsabilidade que TQ resolve gratuitamente).

**Logística applied stack**:
- Server state: TanStack Query 5.60+ pra `/orders`, `/couriers`, `/dashboard`; auto-invalidate via mutation `onSuccess` + `queryClient.invalidateQueries`.
- UI state global: Zustand 5+ stores per feature (orders filter, selected courier, modal state); persist middleware para filter persistence.
- Atomic UI state: Jotai 2.10+ pra theme + locale + sidebar collapse (re-render granular por atom).
- Form state: `useActionState` (cobre §2.13) pra forms simples; React Hook Form pra wizards multi-step.
- React Compiler: enabled em `next.config.ts` (`experimental.reactCompiler: true`); codemod removeu 80% dos memos manuais; ESLint plugin enforce Rules of React.

**Anti-patterns observados (10 itens)**:
- Manual `useMemo`/`useCallback` everywhere (RC handle 90%; remove via codemod oficial).
- RC enabled mas violando Rules of React (mutation in render, conditional hooks); ESLint plugin pega.
- Storing server data em Redux/Zustand sem invalidation logic (use TanStack Query).
- Context API pra app-wide state (every consumer re-renderiza; use Zustand/Jotai).
- Zustand store > 30 fields em single store (split per feature; reduz coupling).
- Jotai sem `atomWithStorage` ou `Suspense` boundary (sem persistence; flash on load).
- Valtio mutating proxy fora de snapshot read scope (perde reactivity).
- RTK pra app simples (boilerplate explosion; Zustand/Jotai resolvem).
- Server state stale forever (sem `staleTime` configurado em TQ; data outdated silenciosamente).
- 3+ state libraries misturadas sem boundary clara (cognitive load brutal; pick 2 max: server + UI).

**Cruza com**: `02-05` (Next.js + RC integration), `02-04` §2.7 (RC introduction inicial), `02-04` §2.13 (React 19 Forms + `useActionState`), `03-09` (frontend perf, RC reduz re-renders), `02-19` (i18n state via context vs atom).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Explicar o que é Fiber e por que linked tree em vez de recursão pura.
- Distinguir render phase de commit phase.
- Reproduzir o bug de "index as key" em lista reordenável e explicar.
- Explicar quando `useEffect` roda e por que Strict Mode dispara duas vezes.
- Diferenciar `useEffect` vs `useLayoutEffect` com case onde escolher cada.
- Explicar Suspense em termos de "componente throw uma Promise".
- Distinguir Server Component, Client Component, e como eles compõem.
- Listar 4 anti-patterns de performance comuns.
- Demonstrar uso de `startTransition` e quando ele ganha de simplesmente atualizar state.
- Justificar por que React Query (ou similar) substitui maior parte de "state global".

---

## 4. Desafio de Engenharia

Construir um **mini-React** funcional o suficiente pra rodar uma TodoApp.

### Especificação

Implementar do zero, em TS:

1. **`createElement(type, props, ...children)`**: equivalente a `React.createElement`. Retorna objeto `{ type, props, children }`.
2. **JSX support**: configure `tsconfig` `jsxFactory: 'createElement'` ou pragma similar pra JSX virar suas chamadas.
3. **Reconciler simples**:
   - `render(element, container)`, mount inicial.
   - Diff entre nova árvore e árvore anterior (mantenha referência).
   - Apply minimo ao DOM.
4. **Function components** com:
   - **`useState`**: list de hooks por componente, ordem importa.
   - **`useEffect`**: roda após commit, com cleanup.
   - **`useRef`**.
5. **Reconciliação com keys**: lista com keys preserva instâncias.
6. **Eventos**: `onClick`, `onInput`, etc. Adicionar/remover listeners corretamente em diff.
7. **TodoApp** que usa seu mini-React, com:
   - Lista de todos com add/remove/toggle.
   - Filter (all/active/done).
   - Persistência em localStorage via useEffect.

### Restrições

- Sem React real. Sem libs de UI.
- Pode usar TS, Vite (só pra dev server e JSX), sem outras deps.

### Threshold

- Funciona: TodoApp interativa.
- Reorder de items via drag não perde focus de input editado.
- README explica:
  - Diferenças entre seu mini-React e o real (ex: você fez síncrono; React real é Concurrent).
  - Estrutura interna que você usou (algo como Fiber simplificada).
  - Por que ordem dos hooks importa, demonstrado com código.
  - Limitações: sem Suspense, sem Concurrent, sem batching, sem fragments avançados, etc.

### Stretch

- **Concurrent rendering** (interrupção via `requestIdleCallback` + chunked work, à lá Fiber).
- **Suspense** simplificado (catching de Promise throw).
- Render alternativo a outro target (canvas, terminal via blessed, etc.).

---

## 5. Extensões e Conexões

- Liga com **01-07** (JS deep): hooks dependem de closures. Effects rodam em microtasks ou após paint. `Object.is` é base de comparação shallow.
- Liga com **01-08** (TS): tipagem de hooks com generics, `Children` tipos, polymorphic components.
- Liga com **02-03** (DOM): React abstrai DOM mas vaza. Refs, eventos sintéticos, focus.
- Liga com **02-05** (Next.js): App Router é puramente RSC + Client. Caching layers do Next interagem com Suspense.
- Liga com **02-06** (React Native): mesmas APIs de React (hooks, suspense), renderer diferente. Conhecimento transfere.
- Liga com **03-09** (perf): Core Web Vitals impactados por hydration cost, RSC payload, code splitting.

---

## 6. Referências

- **react.dev**: docs novas. Leia "You Might Not Need an Effect", "Synchronizing with Effects", "Sharing State Between Components", inteiro.
- **Dan Abramov's blog (overreacted.io)**: esp. "A Complete Guide to useEffect", "Algebraic Effects for Library Authors", "Before You memo()".
- **Acdlite (Andrew Clark)'s tweets/threads**: ele é um dos arquitetos. Discussões técnicas profundas.
- **"Inside Fiber"** ([github.com/acdlite/react-fiber-architecture](https://github.com/acdlite/react-fiber-architecture)), escrito por ele.
- **React Server Components RFC** ([github.com/reactjs/rfcs](https://github.com/reactjs/rfcs)), leia o original.
- **TkDodo's blog**: bom conteúdo sobre React Query e estado.
- **Build your own React** ([pomb.us/build-your-own-react/](https://pomb.us/build-your-own-react/)), bom guia pro desafio.
- **React source**: `packages/react-reconciler/src/ReactFiberWorkLoop.js` é o coração. Leia.
