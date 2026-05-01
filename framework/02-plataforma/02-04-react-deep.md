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
