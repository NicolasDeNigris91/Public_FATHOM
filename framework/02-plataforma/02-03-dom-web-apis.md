---
module: 02-03
title: DOM e Web APIs, Eventos, Storage, Workers, Observers
stage: plataforma
prereqs: [02-01]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 02-03, DOM e Web APIs

## 1. Problema de Engenharia

A "web platform" virou enorme. O browser hoje oferece umas 500 APIs, fetch, eventos, storage, workers, observers, streaming, crypto, audio, gamepad, push notifications, web bluetooth, file system access, etc. Entender DOM e Web APIs significa parar de tratar o browser como mistério e começar a usar de verdade o que ele já te dá de graça.

Frameworks (React, Vue, Svelte) abstraem boa parte do DOM, mas vazam constantemente. Quando o ref não funciona, quando o effect roda em ordem errada, quando um listener não dispara, quando IntersectionObserver dispara duplicado, você precisa do modelo abaixo do framework. E vários problemas têm solução muito mais limpa em Web API nativa do que no nível do framework.

---

## 2. Teoria Hard

### 2.1 DOM como API

O DOM (Document Object Model) é a representação em árvore do documento, exposta como objetos JS. Cada elemento HTML vira um Node do tipo Element, com propriedades, métodos, eventos.

Operações cruciais:
- `document.querySelector(sel)`, `querySelectorAll(sel)`, selectors CSS retornando elemento(s).
- `element.closest(sel)`, sobe ancestrais até match.
- `element.matches(sel)`, testa selector.
- `element.children`, `firstElementChild`, `nextElementSibling`, navegação.
- `element.append(child)` (modern), `appendChild(child)` (legacy, pode adicionar 1 só), `before/after/replaceWith/remove`, manipulação.
- `element.classList.add/remove/toggle/contains`, classes.
- `element.dataset`, `data-*` attributes como objeto. `<div data-user-id="42">` → `el.dataset.userId === "42"`.

DOM e CSSOM se cruzam em `element.getBoundingClientRect()` (posição/tamanho calculado), `getComputedStyle(el)` (todos os estilos resolvidos). Ambos forçam **layout sync**: se você ler bbox depois de escrever style, browser tem que recalcular layout no meio do JS, penalidade real. Padrão é separar leitura (read) de escrita (write) em frames diferentes.

### 2.2 Eventos

Modelo de eventos do browser tem três fases:
1. **Capture**: do root descendo até o target.
2. **Target**: no elemento que disparou.
3. **Bubble**: do target subindo até root.

`addEventListener(type, handler, options)`:
- `options.capture` (default false), registra na capture phase.
- `options.once`, auto-remove após primeiro fire.
- `options.passive`, promete que handler não vai chamar `preventDefault`. Crítico em scroll/touch, habilita scroll suave em mobile.
- `options.signal: AbortSignal`, cancelamento moderno (vinculável a AbortController).

`event.preventDefault()`, cancela ação default (submit do form, link navegando, scroll).
`event.stopPropagation()`, para bubble. Use raríssimo, geralmente é cheiro de mal arquitetar.
`event.stopImmediatePropagation()`, para outros listeners no mesmo target também.

**Event delegation** é padrão valioso: em vez de N listeners (1 por linha de tabela), 1 listener no parent. Bubble traz o evento, você usa `event.target.closest('.row')` pra identificar:

```js
table.addEventListener('click', (e) => {
  const row = e.target.closest('tr[data-id]');
  if (row) handleRowClick(row.dataset.id);
});
```

Tipos importantes pra dominar: `click`, `pointerdown/move/up`, `keydown/keyup`, `input`, `change`, `submit`, `focus/blur` (não bubble; tem versões `focusin/focusout` que sim), `scroll`, `resize`, `wheel`, `touchstart/move/end`, `dragstart/over/drop`, `visibilitychange`, `beforeunload`, `online/offline`.

`pointer*` events unificam mouse + touch + caneta, prefira sobre `mouse*`/`touch*` em código novo.

### 2.3 Custom events e EventTarget

Você pode emitir e ouvir eventos próprios, útil pra desacoplar componentes vanilla.

```js
const ev = new CustomEvent('order:created', { detail: { id: 42 }, bubbles: true });
element.dispatchEvent(ev);
```

`EventTarget` é a base, qualquer objeto pode estender e virar um event emitter no estilo browser. Útil pra design de SDKs JS.

### 2.4 Fetch e ergonomia moderna

`fetch(url, init)` é a API HTTP do browser (e Node moderno). Returns Promise<Response>.

```js
const res = await fetch('/api/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
  credentials: 'include', // envia cookies
  signal: controller.signal, // cancellation
});
if (!res.ok) throw new HttpError(res.status);
const json = await res.json();
```

Detalhes importantes:
- `fetch` **não** rejeita em status 4xx/5xx, só em erro de rede. Cheque `res.ok` ou `res.status`.
- `credentials: 'omit' | 'same-origin' (default) | 'include'`, controla envio de cookies.
- `mode: 'cors' | 'no-cors' | 'same-origin'`, controle de CORS.
- `Response.body` é um ReadableStream, você pode consumir incremental (importante pra streaming de LLMs).

**AbortController**:
```js
const c = new AbortController();
fetch(url, { signal: c.signal });
c.abort(); // cancela em qualquer momento
```

`AbortSignal.timeout(5000)` é shorthand pra cancelamento por timeout. `AbortSignal.any([...])` combina sinais.

### 2.5 Storage APIs

- **Cookies**: ~4 KB, vão em cada request. Use pra session token (`HttpOnly; Secure; SameSite=Lax`), sem JS access. Detalhes em [01-03](../01-fundamentos/01-03-networking.md) e [02-13](02-13-auth.md).
- **localStorage**: ~5-10 MB, sync, pares string-string, persiste indefinidamente. Não use pra dados sensíveis (XSS rouba). Não use pra dados grandes (sync = bloqueia main thread).
- **sessionStorage**: igual a localStorage mas dura só a session da aba.
- **IndexedDB**: KV store assíncrono, suporta transações, índices, ~50 MB+ (varia). Pra dados estruturados grandes em offline-first apps. API verbose, use wrapper como [`idb`](https://github.com/jakearchibald/idb).
- **Cache API** (relacionada a Service Worker): cache de requests/responses HTTP. Foundation de PWAs offline.

Limitações de quota: browsers podem evictar storage de origens não-utilizadas. `navigator.storage.persist()` pede persistência permanente (browser pode aceitar ou não baseado em uso).

### 2.6 Web Workers

JavaScript é single-threaded por origin. Pra rodar código pesado sem travar UI, você precisa de **Web Worker**: outra thread, sem acesso a DOM, comunicação por message passing.

```js
// main.js
const w = new Worker('worker.js', { type: 'module' });
w.postMessage({ kind: 'compute', data });
w.onmessage = (e) => console.log('result:', e.data);

// worker.js
self.onmessage = (e) => {
  const result = heavy(e.data);
  self.postMessage(result);
};
```

`postMessage` faz **structured clone** dos dados (deep copy). Pra evitar copy de buffers grandes, use **transferable objects**:
```js
w.postMessage(arrayBuffer, [arrayBuffer]); // transfer ownership; original fica detached
```

`SharedArrayBuffer` permite memória compartilhada entre threads, mas exige cabeçalhos de cross-origin isolation (`COOP`/`COEP`).

**Service Workers** são variante: ficam entre seu app e a rede. Implementam offline (Cache API), push notifications, background sync. Foundation de PWAs.

**Worklets** (Audio Worklet, Paint Worklet, Animation Worklet) são threads especializadas pra audio em tempo real, custom paint em CSS, animações declarativas.

### 2.7 Observers, substitutos modernos de hacks de scroll/resize

Quatro observers pra dominar. Todos têm pattern semelhante: criar com callback, observar elementos, callback é chamado em batch.

**IntersectionObserver**: notifica quando elemento entra/sai do viewport (ou de outro elemento). Substitui hacks de `getBoundingClientRect` em scroll listener.

```js
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) loadMore();
  });
}, { rootMargin: '200px', threshold: [0, 0.5, 1] });
io.observe(loadMoreSentinel);
```

Use cases: lazy load imagens (já é nativo via `loading="lazy"`, mas IO dá mais controle), infinite scroll, reveal on scroll, viewport-aware tracking.

**ResizeObserver**: dispara quando tamanho do elemento muda (não só viewport). Substitui listeners de window resize pra elementos individuais. Usar pra responsivos baseados em container ou pra reagir a mudanças via flexbox/grid.

**MutationObserver**: dispara quando DOM muda (filhos adicionados, attrs alterados). Caro, use só quando precisa observar mudanças de terceiros. Em código próprio, geralmente você sabe quando muda.

**PerformanceObserver**: notifica eventos de performance (LCP, FID, CLS, long tasks, fetch entries). Pra observabilidade frontend. Veremos mais em [03-09](../03-producao/03-09-frontend-performance.md).

### 2.8 Streaming, ReadableStream

Browsers (e Node moderno) suportam streams nativos no estilo Web Streams API. `Response.body` é um `ReadableStream<Uint8Array>`.

```js
const res = await fetch('/large');
const reader = res.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  process(value);
}
```

`TransformStream` pra pipelines (parse SSE de stream de LLM, decode UTF-8, etc.). Esse é o foundation pra streaming de RSC, edge runtime, server-sent events.

### 2.9 URL e History API

`URL` constructor é ferramenta poderosa:
```js
const u = new URL('/orders/42?view=detail', location.origin);
u.searchParams.set('debug', '1');
u.toString();
```

History API:
- `history.pushState(state, '', '/new-url')`, muda URL sem reload.
- `history.replaceState(...)`, substitui entry atual.
- `popstate` event, dispara em back/forward.

Esse é o motor de SPAs vanilla. Frameworks usam por baixo.

`location.assign(url)` faz navegação (reload). `location.replace(url)` substitui sem entry no history.

### 2.10 Outras APIs que vale ter no radar

- **Clipboard API**: `navigator.clipboard.readText()` / `writeText()`. Async, com permissions.
- **File API**: `<input type="file">` + `File`/`Blob` + `FileReader`. Drag-and-drop integra.
- **Crypto API**: `crypto.subtle`, hash, encrypt, sign. Use pra ETags client-side, key derivation.
- **Web Push**: notificações push em PWA via service worker.
- **Geolocation**: `navigator.geolocation.getCurrentPosition`, só com user gesture + permissions.
- **WebRTC**: comunicação peer-to-peer, video/audio + DataChannel. Detalhes em [02-14](02-14-realtime.md).
- **WebSocket / EventSource (SSE)**: real-time. Também em 02-14.
- **WebAuthn**: autenticação por chave assimétrica (passkeys). Vale leitura conforme passkeys virarem padrão.
- **Web Locks API**: coordenação entre tabs (uma elege "líder", outras esperam).
- **BroadcastChannel**: pub/sub entre tabs do mesmo origin.
- **Page Visibility API**: `document.visibilityState`, `visibilitychange` event. Pause animation/poll em background.

### 2.11 Forced reflow e devtools

Sequência problemática:
```js
el.style.width = '100px';
const w = el.offsetWidth; // força layout aqui
el.style.height = '100px';
```

Lendo `offsetWidth` força browser a re-calcular layout porque sabe que mudou. Loop de N elementos com escrita-leitura-escrita = N reflows. Solução: **batch reads, depois batch writes**.

DevTools Performance tab mostra forced reflow como warning. Pratique abrir Performance tab, gravar 5s de uso da app, e ler o flame graph.

`requestAnimationFrame(cb)` agenda cb pra próximo frame, ajuda batching. `requestIdleCallback(cb)` roda em idle entre frames, bom pra trabalho não-urgente (analytics, prefetch).

### 2.12 Service Workers e PWA

Service Worker é **proxy programável entre app e network** rodando em thread separada. Foundation pra Progressive Web Apps (PWA): offline, install, push, background sync.

#### Lifecycle

```
register → installing → installed (waiting) → activating → activated → idle ↔ fetching/working
```

- **install** (`self.addEventListener('install', e => ...)`)`: pre-cache assets críticos via `caches.open('v1').then(c => c.addAll([...]))`.
- **activate**: limpa caches antigos. `clients.claim()` força controle de tabs já abertas.
- **fetch**: intercepta toda request da página controlada. `e.respondWith(...)` substitui resposta.
- **message**: comunicação com page via `postMessage`.
- **push**: notificação chegou (vide §abaixo).
- **sync**: background sync trigger.

#### Caching strategies (decisão por tipo de recurso)

| Strategy | Comportamento | Quando |
|---|---|---|
| **Cache-first** | Cache → fallback network | Assets estáticos versionados (CSS, JS hash) |
| **Network-first** | Network → fallback cache | HTML de página (sempre fresh quando online) |
| **Stale-while-revalidate** | Retorna cache imediato + revalida async | API de dados que toleram 1 versão stale |
| **Network-only** | Sempre network | POST, PUT, payments — nunca cache |
| **Cache-only** | Sempre cache | Asset offline-first conhecido |

Lib canônica: **Workbox** (Google). Abstração production-ready com strategies, cleanup, precaching.

```js
import {registerRoute} from 'workbox-routing';
import {CacheFirst, NetworkFirst, StaleWhileRevalidate} from 'workbox-strategies';

registerRoute(({request}) => request.destination === 'image',
  new CacheFirst({cacheName: 'images'}));
registerRoute(({url}) => url.pathname.startsWith('/api/'),
  new StaleWhileRevalidate({cacheName: 'api'}));
```

#### Web Push notifications

Permite engagement quando page fechada (PWA-only em iOS 16.4+, sempre em Android/desktop):

1. App pede `Notification.requestPermission()`.
2. Subscribe via `pushManager.subscribe({applicationServerKey: VAPID_PUBLIC})`.
3. Subscription enviado pro backend (endpoint URL, p256dh, auth keys).
4. Backend envia push via Web Push Protocol (RFC 8030 + VAPID RFC 8292) — libs: `web-push` (Node), `pywebpush` (Py).
5. Service Worker recebe `push` event, mostra `self.registration.showNotification(...)`.

Privacy: usuários odeiam push spam. Peça permission só após value clearly demonstrated; deixe opt-out fácil.

#### Background Sync e Periodic Background Sync

- **Background Sync** (`registration.sync.register('tag')`): quando user offline, registra; quando volta online, SW dispara `sync` event. Use pra POSTs que falharam.
- **Periodic Background Sync** (`registration.periodicSync.register('news', {minInterval: ...})`): browser agenda fetch periódico. Suporte limitado (Chrome só, com PWA installed). Valor questionável.

#### App installation (PWA install prompt)

`beforeinstallprompt` event fires quando navegador acha PWA instalável (Manifest válido + SW registered + critérios engagement). Capture, mostre UI custom, depois `e.prompt()`. Manifest mínimo:

```json
{
  "name": "Fathom Logística",
  "short_name": "Logística",
  "start_url": "/",
  "display": "standalone",
  "icons": [{"src":"/icon-512.png","sizes":"512x512","type":"image/png"}]
}
```

#### Pegadinhas reais

- **SW versionado é mandatório**: cache antigo segura asset velho. Pre-cache key deve incluir hash/build version. Sem isso, deploy "não chega" pra users com SW.
- **Update flow**: SW novo fica `waiting` até todas tabs fecharem. Force update via `skipWaiting()` + `clients.claim()` em activate, ou aviso UI "nova versão disponível, reload".
- **Debug**: Chrome DevTools → Application → Service Workers. Use "Update on reload" durante dev.
- **Scope**: SW em `/sw.js` controla todo origin; SW em `/app/sw.js` controla só `/app/*`. Erro comum.
- **iOS limitações**: Web Push só funciona em PWA installed (16.4+); no install prompt nativo (user precisa "Add to Home Screen" manual via Share Sheet).

#### Quando NÃO usar PWA

- App é puro consumo passivo de conteúdo, sem necessidade offline → web normal.
- Você não quer manter SW versionado (overhead operacional).
- Stack já tem app nativo + web; PWA paralelo é redundância.

Cruza com **02-05** (Next.js next-pwa plugin), **02-14** (push real-time), **03-09** (PWA acelera perceived perf).

### 2.13 Modern Web APIs 2026 (View Transitions, Popover, @starting-style, Web Locks)

Quatro APIs cruzaram pra Baseline 2024 e mudam código que antes exigia lib. Saiba usar nativo antes de instalar dependência.

#### View Transitions API (CSS View Transitions Module Level 1)

Same-document (Chromium 111+, Safari 18, Firefox 129+ flagged): `document.startViewTransition` tira snapshot do DOM antes, executa callback, tira snapshot depois, faz cross-fade automático no compositor.

```tsx
function navigateToOrder(id: string) {
  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    router.push(`/orders/${id}`);
    return;
  }
  const vt = document.startViewTransition(() => router.push(`/orders/${id}`));
  vt.ready.then(() => analytics.mark('vt-ready'));
  vt.finished.catch(() => {}); // skipped/aborted, não warne
}
```

Cross-document (MPA, Chromium 126+) habilita transição entre full reloads same-origin:

```css
@view-transition { navigation: auto; }

/* Hero do pedido na lista vira hero do detalhe */
.order-card[data-id="42"] img { view-transition-name: order-42-hero; }
.order-detail img { view-transition-name: order-42-hero; }

::view-transition-old(order-42-hero),
::view-transition-new(order-42-hero) { animation-duration: 240ms; }
::view-transition-group(order-42-hero) { animation-timing-function: cubic-bezier(.2,.8,.2,1); }

@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*) { animation: none; }
}
```

Pegadinhas: `view-transition-name` duplicado em página = browser pula transition silently; layout shifts dentro do callback animam suavemente (FLIP grátis); `vt.updateCallbackDone` resolve quando DOM update termina, `vt.ready` quando pseudo-elements montaram, `vt.finished` quando animation acabou. Cross-document só funciona same-origin.

#### Popover API (HTML popover spec, Baseline 2024)

Atributo nativo. Browser gerencia top-layer, light-dismiss, focus, ESC. Substitui ~90% de Floating UI / Radix Popover.

```html
<!-- Tooltip: auto = ESC + click-outside fecham -->
<button popovertarget="tip-eta">ETA</button>
<div id="tip-eta" popover="auto">Estimativa baseada em Haversine + tráfego.</div>

<!-- Menu dropdown: manual = só fecha programaticamente -->
<button popovertarget="menu-courier">Courier</button>
<menu id="menu-courier" popover="manual">
  <li><button onclick="this.closest('[popover]').hidePopover()">Atribuir</button></li>
</menu>

<!-- Modal substitute -->
<div id="confirm" popover="manual">Confirmar entrega?</div>
```

```css
[popover]:popover-open { opacity: 1; transform: translateY(0); }
[popover] { opacity: 0; transform: translateY(-4px); transition: opacity .15s, transform .15s, display .15s allow-discrete; }
[popover]::backdrop { background: rgb(0 0 0 / .4); backdrop-filter: blur(2px); }

@starting-style {
  [popover]:popover-open { opacity: 0; transform: translateY(-4px); }
}
```

Comparação: `popover="auto"` = tooltip/menu (light-dismiss); `popover="manual"` = control total (use pra modal crítico, nunca `auto` aí senão click-outside descarta confirm); `<dialog>` = modal com `showModal()` + form integration; Floating UI = só pra positioning complexo (collision, virtual elements) onde anchor positioning CSS ainda não cobre.

#### `@starting-style` (CSS Transitions Level 2, Baseline 2024)

Define estado inicial de element entrando na DOM. Sem isso, transition de `display: none → block` pulava porque não havia "from state". Combine com `transition-behavior: allow-discrete` pra animar `display` e `overlay` (top-layer) discretely. Vide bloco acima.

#### Web Locks API (W3C Web Locks)

Mutex cross-tab same-origin. Resolve "duas tabs abertas, qual sincroniza WebSocket de courier tracking".

```ts
async function leaderTab(): Promise<void> {
  await navigator.locks.request('logistica:courier-ws', { mode: 'exclusive' }, async (lock) => {
    if (!lock) return; // ifAvailable retornou null
    const ws = openCourierSocket();
    await new Promise<void>((resolve) => { ws.addEventListener('close', () => resolve()); });
  });
}
leaderTab(); // tabs subsequentes esperam; quando líder fecha, próxima assume

// Inspect held/pending
const snapshot = await navigator.locks.query();
console.log(snapshot.held, snapshot.pending);
```

Modes: `exclusive` (default) bloqueia outras requests; `shared` permite múltiplas leituras concorrentes. `steal: true` força tomada (use só pra recovery de tab travada). Sempre passe `signal: AbortSignal.timeout(30_000)` em request crítico — sem timeout, tab freezada deadlock outras.

#### Origin Private File System (File System Access Level 2, Baseline 2024)

Filesystem sandboxed por origin, invisível em OS file picker, performant. Backend ideal pra SQLite WASM (sql.js-httpvfs / wa-sqlite) e blobs grandes.

```ts
// Worker context (sync API só roda em worker)
const root = await navigator.storage.getDirectory();
const fh = await root.getFileHandle('orders.sqlite', { create: true });
const sync = await fh.createSyncAccessHandle(); // SYNC, throws fora de worker
sync.write(buffer, { at: 0 });
sync.flush();
sync.close();
```

Vs IndexedDB: OPFS é byte-stream/file-handle (mmap-friendly, melhor pra SQLite e blobs >10 MB); IndexedDB é structured data com índices. OPFS sync API só dentro de Worker — chamar de main thread throws `InvalidStateError`.

#### Anti-patterns observados

- View Transitions sem `prefers-reduced-motion` check, viola WCAG 2.3.3.
- `view-transition-name` duplicado, browser cancela transition sem warning.
- Popover API + Floating UI no mesmo component, focus trap conflita.
- `@starting-style` sem `transition-behavior: allow-discrete`, `display` pula sem animar.
- `navigator.locks.request` sem `signal`/timeout, tab travada deadlock cross-tab.
- OPFS `createSyncAccessHandle` fora de Worker, throws.
- `popover="auto"` em modal de confirm de pagamento, click-outside descarta sem feedback.
- View Transitions cross-document em domínios diferentes, spec só cobre same-origin.
- `IntersectionObserver` em hero LCP com `rootMargin: '0px'` e `threshold: 1`, callback dispara depois do paint, perde a janela de pre-fetch e degrada LCP em vez de melhorar.
- `MutationObserver` em `document.body` com `{ childList: true, subtree: true, attributes: true }` sem debounce em SPA grande, callback dispara milhares de vezes por segundo durante hydration; restrinja `subtree: false` ou observe nó específico + `requestIdleCallback` pra batchar.

Cruza com **02-01** (CSS, `view-transition-name` + container queries), **02-02** (a11y, `prefers-reduced-motion` + popover focus management nativo), **02-04** (React 19 `useTransition` + View Transitions integration via `flushSync`), **02-05** (Next.js cross-document VT em App Router com `unstable_ViewTransition`), **03-09** (View Transitions roda no compositor, evitam relayout custom em JS).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Distinguir capture / target / bubble com exemplo de event delegation.
- Implementar fetch com timeout + AbortController.
- Citar 4 storage APIs com prós e contras de cada.
- Explicar por que `localStorage` é ruim em hot path.
- Implementar infinite scroll com IntersectionObserver.
- Explicar quando ResizeObserver supera listener de window resize.
- Distinguir Web Worker, Service Worker e Worklet.
- Demonstrar uso de transferable objects pra evitar copy de buffer grande.
- Construir SPA simples vanilla (3 rotas) usando History API.
- Identificar forced reflow num código dado.

---

## 4. Desafio de Engenharia

Construa uma **mini-PWA "Logística Offline-First"** vanilla, sem framework.

### Especificação

A app permite registrar entregas localmente quando offline e sincronizar com servidor (mock) quando volta online.

1. UI vanilla com Web Components (use `customElements.define`):
   - `<delivery-list>`, `<delivery-form>`, `<delivery-item>`.
   - Roteamento via History API: `/`, `/new`, `/delivery/:id`.

2. Storage:
   - **IndexedDB** pra persistir entregas offline (use lib `idb` se quiser, é wrapper fino).
   - Schema: `deliveries` store com `id`, `address`, `status`, `createdAt`, `syncedAt`.

3. Sync:
   - Quando online, **Service Worker** intercepta POST `/api/deliveries` e tenta enviar.
   - Se offline, salva em fila no IndexedDB e marca pra sync depois.
   - **Background Sync API** (com fallback pra polling baseado em `online` event) pra retry quando voltar conectividade.

4. UX:
   - **Skeleton loading** com IntersectionObserver pra lazy load de detalhes.
   - **Toast notifications** com `<dialog>` ou custom element + live region.
   - **Offline indicator**: bandeira quando `navigator.onLine === false`.

5. Workers:
   - **Web Worker** pra calcular ETA das entregas baseado em dist (use Haversine; off-main-thread porque pode ser lista grande).
   - Mensagem postada como structured clone OU como ArrayBuffer transferível.

### Restrições

- Sem React, Vue, framework algum. Web Components nativos.
- Sem libs além de `idb` (opcional).
- TS estrito.

### Threshold

- Funciona offline real (Chrome DevTools → Network → Offline).
- Sync acontece quando volta online.
- Lighthouse PWA installable (manifest + service worker correto).
- README explica:
  - Decisão de IndexedDB vs localStorage (justificada).
  - Estratégia do Service Worker (cache-first, network-first, etc.).
  - Trade-offs de Web Components vs framework.
  - Bug real que apareceu na sync (deduplica? race? como você resolveu).

### Stretch

- Push Notifications via Service Worker quando uma entrega é atualizada server-side.
- File API drag-and-drop pra anexar fotos da entrega.
- WebRTC pra "live tracking" entre app e dashboard.

---

## 5. Extensões e Conexões

- Liga com **01-07**: Web APIs disparam eventos no event loop. `requestAnimationFrame` é macrotask especial. Microtasks (Promise) precedem rAF.
- Liga com **02-04** (React): React abstrai DOM mas eventos sintéticos têm comportamento próprio (event pooling histórico, delegação no root). Refs vazam pra DOM real. Effects rodam após paint.
- Liga com **02-05** (Next): Service Worker em RSC tem nuances de hydration. PWA com Next exige plugin (`next-pwa`).
- Liga com **02-07** (Node): Node moderno tem `fetch`, `URL`, `WebStreams`, `AbortController`, mesma API. Reuso de conhecimento.
- Liga com **03-09** (perf): observers + DevTools Performance + Web Vitals dependem deste módulo.

---

## 6. Referências

- **MDN Web APIs**: fonte primária pra qualquer API. Aprenda a buscar lá direto.
- **High Performance Browser Networking** (Ilya Grigorik), referência ainda válida pra como browser, rede e APIs interagem.
- **Resilient Web Design** (Jeremy Keith), princípios.
- **PWA Builder** ([pwabuilder.com](https://www.pwabuilder.com/)), checks + scaffolding.
- **Jake Archibald's blog** ([jakearchibald.com](https://jakearchibald.com/)), Service Worker, streams, offline. Leitura obrigatória.
- **web.dev** ([web.dev](https://web.dev/)), Google's playbook moderno.
- **whatwg specs**: quando precisar do detalhe.
- **Surma's blog** ([surma.dev](https://surma.dev/)), Web Workers, performance, low-level web.
