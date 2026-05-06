---
module: 03-09
title: Frontend Performance, Web Vitals, Bundle, Rendering, Network
stage: producao
prereqs: [02-04, 02-05]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 03-09, Frontend Performance

## 1. Problema de Engenharia

Performance front é onde mais devs se enganam. "Está rápido na minha máquina", em MacBook M3 com fibra. Em Moto G4 com 3G, sua landing page é 14s. Lighthouse 65. Conversões caem. Você descobre quando alguém do produto reclama. Aí começa cargo cult: lazy load tudo, code split tudo, `React.memo` em todo componente, sem entender o que está custando.

Este módulo é perf front com método: Web Vitals (LCP, INP, CLS), Network waterfall, JS bundle, render path, hydration cost, image/font loading, caching, edge. Você sai sabendo medir, identificar bottleneck verdadeiro, e otimizar com prioridade. 03-10 cobre backend perf.

---

## 2. Teoria Hard

### 2.1 Web Vitals

Métricas Google que padronizam UX perf:
- **LCP (Largest Contentful Paint)**: tempo até maior elemento visível render. Threshold: < 2.5s "good".
- **INP (Interaction to Next Paint)**: latência max de qualquer interação do user durante a sessão. Substituiu FID em 2024. < 200ms "good".
- **CLS (Cumulative Layout Shift)**: shifts visuais. < 0.1 "good".

Métricas adicionais úteis:
- **FCP (First Contentful Paint)**: primeiro pixel não-vazio.
- **TTFB (Time To First Byte)**: server-side latency.
- **TBT (Total Blocking Time)**: lab metric correlacionada com INP.

Coleta:
- **Lab**: Lighthouse, WebPageTest. Sintético.
- **Field (RUM)**: real users. Chrome UX Report, Sentry, Datadog RUM, Grafana Faro.

Field > lab pra decisão. Lab pra detectar regressões em PR.

### 2.2 Loading model

Página HTML chega → parser começa → encontra CSS → bloqueia render até CSS chegar. Encontra JS sync → bloqueia parser. Encontra `<img>` → fetch paralelo. Encontra `<script defer>` → fetch paralelo, executa após HTML done. `<script async>` → fetch paralelo, executa quando chegar (pode bloquear parser).

Critical render path:
1. HTML parse.
2. CSS download + parse.
3. Render tree.
4. Layout.
5. Paint.
6. Composite.

Em SSR (Next), HTML chega completo; CSS in-head; user vê algo. Em SPA puro CSR, HTML é shell vazio + bundle JS gigante; user espera JS executar.

### 2.3 Recursos críticos vs não-críticos

- **Crítico**: HTML, CSS above-the-fold, fonte primária.
- **Não-crítico**: imagens below-fold, fonts secundárias, analytics, chat widgets.

Otimização:
- Inline CSS critical (Critical CSS extraction).
- Preload fontes críticas (`<link rel="preload" as="font">`).
- Defer/async scripts non-critical.
- Lazy load images below fold (`loading="lazy"`).

### 2.4 Bundle size

JS é caro: download, parse, compile, execute, GC. Em Moto G4, parse de 500 KB JS leva segundos.

Reduzir:
- **Tree shaking**: ESM imports unused removed por bundler. Funciona se libs são ESM e side-effect free.
- **Code splitting**: route-based, lazy components. Next/Vite fazem por default.
- **Dynamic imports**: `import('./heavy').then(...)` carrega on-demand.
- **Replace heavy libs**: moment.js (300 KB) → date-fns (per-function) → Temporal API quando estável.
- **Avoid polyfills**: target browsers modernos; `@babel/preset-env` com `targets` certo.
- **Minify, gzip/brotli** (build tooling cuida).
- **Bundle analyzer**: `next/bundle-analyzer`, `vite-bundle-visualizer`.

Meta: bundle inicial JS ≤ 100-150 KB gzipped pra apps normais. Acima disso, justificar.

### 2.5 React perf

- **Re-render**: React reconcilia árvore quando state muda. Custoso em árvores grandes.
- **`memo`, `useMemo`, `useCallback`**: skipam recálculos. Não use cego, só onde profile mostra valor.
- **`useTransition`** (React 18+): marca update como não-urgente, pode ser interrompido por urgentes.
- **`useDeferredValue`**: defer derived value.
- **List virtualization**: renderize só items visíveis. `react-window`, `tanstack/virtual`.

React DevTools Profiler: identifica componentes lentos, re-renders desnecessários.

### 2.6 RSC e edge para perf

RSC (React Server Components) move render pro servidor: client recebe HTML + RSC payload (sem JS pra esses componentes). Reduz bundle.

Edge runtime executa perto do user: TTFB baixo. Pra rotas que não dependem de DB pesado, edge ganha.

Static generation (SSG) > SSR > CSR em TTFB e LCP, when possible. Cache HTML no CDN.

### 2.6.1 Edge functions e edge rendering, deep

Edge é a tendência dominante 2024-2026 pra UX-critical paths. Plataformas usam **V8 isolates** (não containers Lambda-style) — runtime sandboxado de ~5MB que sobe em ~5-50ms cold (vs Lambda Node ~200-1000ms cold).

**Players principais:**

| Plataforma | Runtime | Limite CPU/req | Cold start | Pricing model | Forte em |
|---|---|---|---|---|---|
| **Cloudflare Workers** | V8 isolate (workerd) | 50ms (Bundled) / 30s (Unbound) | < 5ms | Por requisição + duration | Edge global, KV, R2, D1 |
| **Vercel Edge Functions** | Vercel Edge Runtime (V8) | ~30s | ~10-50ms | Por GB-hour + invocations | Integração Next.js |
| **Deno Deploy** | Deno (V8 + Rust) | 50ms-isolate | ~10ms | Por request + GB | Standards-aligned, Web APIs |
| **Bun edge runtimes** (emerging) | Bun (JSC) | varia | ~ms | Provider-dependent | Throughput, npm compat |
| **AWS Lambda@Edge / CloudFront Functions** | Node container / V8 | 5s / 1ms | 100-1000ms / sub-ms | AWS pricing | AWS-native, custom logic |

**Constraints reais que mordem:**
- **Sem Node APIs**: `fs`, `child_process`, native modules não funcionam. Use Web Standards (`fetch`, `crypto.subtle`, `URL`, Streams).
- **Sem long-running connections**: pool de DB tradicional (pg/mysql2) não roda. Use **Hyperdrive** (Cloudflare), **Neon serverless driver**, **Planetscale serverless**, **Supabase REST**.
- **Memory cap baixo** (~128MB típico) — não cabem libs gigantes (FFmpeg, headless Chrome).
- **CPU time bilhado** — loops pesados em hot path destroem custo.
- **Bundle size cap**: Cloudflare Workers free 1MB / paid 10MB compressed; Vercel Edge ~4MB.

**Quando edge ganha:**
- TTFB crítico em geo distribuído (e-commerce, mídia, marketplaces) — distribuição de 200+ POPs vence latência.
- Auth / JWT verify / rate limit no path antes do origin.
- A/B testing rewrites, redirects, header manipulation.
- Image optimization on-the-fly.
- Edge config / feature flags em microsegundos.

**Quando edge perde:**
- Heavy DB queries com transactions complexas (use origin).
- Workloads que precisam de Node APIs ou native modules.
- Sub-rotas que dependem de cache local quente (Lambda warm container vence).

**Padrão arquitetural Logística**: edge **handle auth + rate limit + i18n routing**, encaminha pra origin (Railway/Fastify) só pra rotas dinâmicas com DB. Pages estáticas + API leve em edge; transactional API em origin. Latência p99 cai pra metade ou menos em users distantes do origin region.

Cruza com **02-05** (Next.js routing edge runtime), **02-07** (porque Node APIs não estão lá), **04-09** (latência ao escalar).

### 2.7 Hydration cost

Após HTML render, React precisa "hidratar", anexar event listeners. Bundle JS executa em main thread. Em apps grandes, hydration de página inteira trava interação por segundos.

Soluções:
- **Streaming SSR + Suspense**: hidrate em pedaços.
- **Selective hydration**: prioridade pro que user interage primeiro.
- **Islands architecture** (Astro, Qwik): só hidrate ilhas interativas; resto é HTML estático.
- **Qwik**: serializa estado completo pro HTML; resumes sem hydration custosa.

### 2.8 Imagens

Geralmente o gargalo de LCP.

- Use formatos modernos: WebP, AVIF.
- Responsive: `srcset` + `sizes`.
- Compressão adequada (não 100% quality).
- Lazy load below fold.
- `<img>` com `width` e `height` (evita CLS).
- Next/Image, Astro Image: pipelines automáticos.
- CDN com transformação on-the-fly (Cloudflare Images, Imgix, Cloudinary).

Pra hero image: preload (`<link rel="preload" as="image" imagesrcset="...">`).

### 2.9 Fonts

- **`font-display: swap`** evita invisibilidade durante load.
- Self-host (next/font, fontsource), Google Fonts via CDN custa round-trip + privacy.
- Subset (latin only se for o caso).
- Preload critical font files.
- Variable fonts: 1 file vs N.

### 2.10 CSS

- **Avoid unused CSS**: PurgeCSS / Tailwind extracted. Tailwind faz por default.
- **CSS-in-JS** runtime (styled-components classic): caro em hydration. Migration em projetos sérios pra zero-runtime (linaria, vanilla-extract, Tailwind).
- **`content-visibility: auto`**: skip render off-screen.
- **`will-change`**: hint pra browser otimizar.

### 2.11 Network

- **HTTP/2 ou HTTP/3** (default em CDNs sérias), multiplexing reduz overhead.
- **Brotli > gzip** quando disponível.
- **CDN**: cache estático, edge perto do user.
- **Preconnect / DNS-prefetch** pra origins críticas (`<link rel="preconnect" href="https://api.example.com">`).
- **Service Worker**: offline-first, custom caching. Útil pra PWA.
- **HTTP cache**: `Cache-Control` properly. Hash em filenames pra cache busting.

### 2.12 Caching strategies

- **`Cache-Control: public, max-age=31536000, immutable`** pra assets com hash em nome.
- **`Cache-Control: no-cache`** pra HTML, força revalidate, ETag pra 304.
- **stale-while-revalidate**: serve stale + refetch in background.

### 2.13 Third-party scripts

Analytics, chat, ads, A/B test scripts são frequentemente os maiores ofensores de perf.

- **`async` ou `defer`**.
- **Self-host quando possível** (analytics tipo Plausible self-hosted).
- **Partytown** (Google): runs third-party scripts em web worker.
- **Quantifique impacto**: se chat widget custa 2s LCP, talvez não vale.

### 2.14 INP e long tasks

INP = pior interação. Long tasks (> 50ms) bloqueiam main thread, pioram INP.

Detecte:
- Long Task API (`PerformanceObserver`).
- React Profiler interactions.
- Chrome DevTools Performance tab.

Mitigações:
- Quebra trabalho em chunks (`requestIdleCallback`, `scheduler.postTask`).
- Web Workers pra cálculo CPU-bound.
- Debounce/throttle handlers.
- `useTransition` pra updates não-urgentes.

### 2.15 Mobile considerations

- 3G simulado em DevTools, execute pelo menos 1 vez.
- Battery: animations heavy custam.
- Memory: SPAs grandes vazam, Chrome closes tab em low-mem.
- Touch latency: passive listeners (`{ passive: true }`).

### 2.16 Performance budget

Definir hard limits:
- JS bundle inicial ≤ 150 KB gz.
- LCP ≤ 2.5s em 75th percentile.
- INP ≤ 200ms.

CI gate: build falha se exceder. Tools: bundlesize, size-limit, Lighthouse CI.

### 2.17 Lighthouse vs reality

Lighthouse roda 1 user em 1 cenário. Não é verdade absoluta. Field data sempre prevalece. Mas Lighthouse pega regressões em PR.

Lighthouse CI: roda em PR, falha em regression de score.

### 2.18 Frameworks novos

- **Astro**: islands. HTML primeiro, JS only onde necessário.
- **Qwik**: resumability, no hydration cost.
- **SvelteKit**: compiler-time, runtime menor.
- **SolidStart**: signals, fine-grained reactivity.

Em projeto crítico de perf (landing pages, content sites), avaliar.

### 2.19 Real User Monitoring (RUM) deep — web-vitals, INP measurement, attribution

Lighthouse/PageSpeed mede em lab (single device, single network). Real User Monitoring (RUM) mede no campo — devices reais, network reais, edge cases reais. Sem RUM, time otimiza pra Lighthouse mas users em Android low-end com 3G veem 12s de LCP enquanto dashboard mostra "all green". §2.19 cobre stack RUM moderna 2026: web-vitals lib v4 com INP correto, attribution data, sampling, custos reais, integração com OTel/Sentry/Datadog/SpeedCurve.

#### Core Web Vitals 2026 — métricas e thresholds

| Metric | What | Good | Needs improvement | Poor |
|---|---|---|---|---|
| **LCP** | Largest Contentful Paint | ≤ 2.5s | 2.5-4s | > 4s |
| **INP** | Interaction to Next Paint (replaced FID em 2024) | ≤ 200ms | 200-500ms | > 500ms |
| **CLS** | Cumulative Layout Shift | ≤ 0.1 | 0.1-0.25 | > 0.25 |
| **FCP** | First Contentful Paint (diagnostic) | ≤ 1.8s | 1.8-3s | > 3s |
| **TTFB** | Time to First Byte (diagnostic) | ≤ 800ms | 800ms-1.8s | > 1.8s |

- **INP** substituiu FID em 2024-03 como Core Web Vital. INP captura WORST interaction (98º percentile), não first apenas. Mais brutal mas correlaciona melhor com sensação de "site travado".
- Thresholds aplicam ao p75 das page views por origin no CrUX.

#### web-vitals v4 — código copy-paste-pronto

```typescript
// src/lib/rum.ts
import { onLCP, onINP, onCLS, onFCP, onTTFB, type Metric } from 'web-vitals';

type AttributedMetric = Metric & {
  attribution: Record<string, unknown>;
};

function sendToAnalytics(metric: AttributedMetric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    id: metric.id,
    navigationType: metric.navigationType,
    page: location.pathname,
    attribution: metric.attribution,
    device: {
      deviceMemory: (navigator as any).deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      connection: (navigator as any).connection?.effectiveType,
    },
    userId: window.__userId,
    sessionId: window.__sessionId,
  });

  // sendBeacon não bloqueia unload; fallback fetch keepalive
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/rum', body);
  } else {
    fetch('/api/rum', { body, method: 'POST', keepalive: true });
  }
}

export function initRum() {
  onLCP(sendToAnalytics, { reportAllChanges: false });
  onINP(sendToAnalytics, { reportAllChanges: false });
  onCLS(sendToAnalytics, { reportAllChanges: false });
  onFCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}
```

- **`reportAllChanges: false`** (default): só reporta valor final no page hide / unload. `true` reporta cada update — útil em dashboards real-time mas inflate volume 10x.
- **`sendBeacon`**: API designed pra envio em unload sem bloquear navigation. Limite 64KB por call.

#### Attribution — onde está o gargalo

web-vitals v4 inclui `attribution` por métrica:

```typescript
onLCP((metric) => {
  // metric.attribution.element: HTMLElement do LCP
  // metric.attribution.url: src/href
  // metric.attribution.timeToFirstByte: TTFB sub-component
  // metric.attribution.resourceLoadDelay: tempo entre FCP e início load
  // metric.attribution.resourceLoadDuration: download time
  // metric.attribution.elementRenderDelay: tempo de download a render
});

onINP((metric) => {
  // metric.attribution.eventTarget: HTMLElement clicado
  // metric.attribution.eventType: 'click' | 'pointerdown' | 'keydown' | ...
  // metric.attribution.inputDelay: entre input e processing start
  // metric.attribution.processingDuration: handler runtime
  // metric.attribution.presentationDelay: entre handler end e paint
  // metric.attribution.longestScript: script src + duration > 50ms
});

onCLS((metric) => {
  // metric.attribution.largestShiftTarget: HTMLElement do shift maior
  // metric.attribution.largestShiftTime, largestShiftValue
  // metric.attribution.loadState: pre/post load
});
```

Sem attribution: dashboard mostra "INP 600ms p75". Action item? Nenhum. Com attribution: "INP 600ms causado por click em `.checkout-button`, processing 450ms via `vendor.js:7234`". Action item: investigate `vendor.js:7234`.

#### Backend — recebimento + ingestão

```typescript
// app/api/rum/route.ts (Next.js Edge runtime)
import { Pool } from 'pg';
const pool = new Pool();

export const runtime = 'edge';

export async function POST(req: Request) {
  const text = await req.text();
  const m = JSON.parse(text);

  await pool.query(
    `INSERT INTO rum_events
       (event_at, name, value, rating, page, attribution, device, user_id, session_id)
     VALUES (now(), $1, $2, $3, $4, $5, $6, $7, $8)`,
    [m.name, m.value, m.rating, m.page, m.attribution, m.device, m.userId, m.sessionId]
  );

  return new Response(null, { status: 204 });
}
```

Em scale: NÃO escreva direto Postgres. Use Cloudflare Workers Analytics Engine, Snowplow, or queue (Kafka) → ClickHouse pra análise.

#### Sampling — controlando custo em scale

- 1M page views/dia × 5 metrics = 5M events/dia. ClickHouse $0.05/1M ingestion + $0.10/GB storage. Manageable.
- 100M page views/dia × 5 metrics = 500M events/dia. SaaS RUM (Datadog $0.5/1k events) → $250/dia = $7500/mês.
- Sampling client-side:
  ```typescript
  export function initRum() {
    const sampleRate = 0.1;  // 10%
    if (Math.random() > sampleRate) return;
    onLCP(sendToAnalytics);
    // ...
  }
  ```
- **Pegadinha sampling**: low traffic pages perdem visibility. Tier sampling (high traffic 10%, low traffic 100%) ou per-user persistent sampling (sample once per session, persist).

#### Dashboards — 3 visualizações essenciais

- **p75 trend over time** por metric (LCP/INP/CLS) — Core Web Vitals threshold rule.
- **Distribution histogram** — vê cauda longa que p75 esconde.
- **Attribution heatmap** — top 10 elements/URLs causando worst metric. Esse é o action driver.

#### Logística — RUM por user journey

- Sem journey: "INP 350ms" — não acionável.
- Com journey: "INP 350ms na flow de pickup-confirm; courier mobile 4G; INP 120ms em homepage desktop" — segmenta correção por user impact.
- Adicione `journey` field:
  ```typescript
  window.__journey = 'pickup-confirm';  // set on route change
  ```
- Dashboard com filter por journey + device + connection → priorização real.

#### Stack 2026 — comparação SaaS vs self-host

| Tool | Modelo | Strengths | Custo (1M PV/mês) |
|---|---|---|---|
| **SpeedCurve LUX** | SaaS RUM-only | Best UX dashboards; budget alerts; CrUX comparison | ~$1k/mês |
| **Datadog RUM** | SaaS APM + RUM | Correlação RUM ↔ backend traces | ~$3k/mês |
| **Sentry Performance** | SaaS error + perf | Boa pra times já em Sentry | ~$500/mês |
| **Cloudflare Web Analytics** | SaaS, free | Web Vitals out-of-box; sem attribution profunda | $0 |
| **OpenTelemetry + ClickHouse** | Self-host | Full ownership; integra com OTel backend | infra cost ~$200/mês |

#### Anti-patterns observados

- **Lighthouse-driven optimization sem RUM**: passa Lighthouse, cai em produção pra users low-end.
- **Sem attribution**: métricas sem ação possível.
- **CrUX como única fonte**: agregado origin-level mensal; sem visibility per-page ou pre-deploy regression detection.
- **Sampling sem persistência por session**: same user reportado parcialmente; aggregations desviam.
- **Send sem `sendBeacon` ou `keepalive`**: requests cancelados em unload, perde 30-50% das métricas.
- **`reportAllChanges: true` em produção**: 10x volume + custo desnecessário.
- **RUM sem device/connection metadata**: dashboard mistura iPhone 15 Pro com Android Go; mediana enganosa.
- **CLS sem attribution.loadState**: confunde initial render shift (esperado, accept) com mid-session shift (real bug).

#### Performance budget enforcement no CI

```yaml
# .github/workflows/perf-budget.yml
- name: Lighthouse CI
  run: npx lhci autorun --upload.target=temporary-public-storage
- name: Compare RUM trend
  run: |
    node scripts/check-rum-regression.js \
      --baseline=last-7d-p75 \
      --current=last-1d-p75 \
      --threshold-lcp=200 \
      --threshold-inp=50
```

PR que aumenta p75 LCP > 200ms ou p75 INP > 50ms → block ou label `perf-regression`.

Cruza com **03-09 §2.14** (INP foundation), **03-09 §2.16** (performance budget), **03-09 §2.17** (Lighthouse vs reality), **03-07 §2.x** (OTel browser SDK feeds RUM into observability stack), **03-15 §2.18** (RUM data alimenta SLO de UX).

---

### 2.20 Speculation Rules API + INP optimization 2026 + Long Animation Frames

§2.19 mede; §2.20 otimiza. Stack moderna 2026 pra esmagar INP e acelerar navigation: Speculation Rules API (Baseline Chrome 2024+, Safari/Firefox WIP) declara prefetch/prerender via JSON; `scheduler.yield()` (Baseline 2024+) quebra long tasks; Long Animation Frames API (LoAF, Baseline 2024+) substitui Long Tasks com attribution por script. INP substituiu FID em 2024-03 como Core Web Vital — threshold p75 ≤ 200ms no CrUX.

#### Speculation Rules API — prefetch + prerender declarativo

Substitui `<link rel="prerender">` (deprecated) e `<link rel="prefetch">` (limited). Prefetch baixa HTML pra navigation futura (~300ms TTFB savings); prerender renderiza FULL page off-screen (HTML + CSS + JS execute) — click vira instant nav.

```html
<script type="speculationrules">
{
  "prerender": [{
    "where": {
      "and": [
        { "href_matches": "/orders/*" },
        { "not": { "selector_matches": ".no-prerender" } }
      ]
    },
    "eagerness": "moderate"
  }],
  "prefetch": [{
    "where": { "href_matches": "/api/*" },
    "eagerness": "conservative"
  }]
}
</script>
```

- **`eagerness` levels**: `immediate` (start now), `eager` (high prob), `moderate` (hover/touchstart trigger ~200ms hold), `conservative` (mousedown trigger). Trade-off: `immediate`/`eager` = mais bandwidth + battery drain; `conservative` = less savings mas safer em mobile data.
- **Pegadinha**: prerender executa scripts + APIs (`fetch`, `localStorage`, analytics) off-screen; pode disparar pageview duplicado. Use `document.prerendering` flag:

```js
if (document.prerendering) {
  document.addEventListener('prerenderingchange', () => sendAnalytics(), { once: true });
} else {
  sendAnalytics();
}
```

#### INP — causes + production playbook

INP mede WORST interaction latency em entire session (input delay + processing duration + presentation delay). Threshold p75 CrUX: ≤ 200ms good, ≤ 500ms needs improvement, > 500ms poor.

Causes comuns de high INP:

- Long synchronous JS handler (> 50ms blocking main thread).
- Layout thrashing (`element.offsetHeight` após style write força sync layout).
- Hydration mid-interaction (React 18 partial; React 19 melhor mas ainda custa).
- Forced layout em `ResizeObserver` / `IntersectionObserver` callbacks.

Optimizing — copy-paste primitives:

```js
// scheduler.yield() — Baseline 2024+. Pausa e deixa input handlers rodarem.
async function processItems(items) {
  for (const item of items) {
    await scheduler.yield();
    doExpensive(item);
  }
}

// scheduler.postTask() — priority hints (Chrome 94+).
scheduler.postTask(criticalWork, { priority: 'user-blocking' });   // 16ms slot
scheduler.postTask(uiUpdate, { priority: 'user-visible' });        // default
scheduler.postTask(prefetchData, { priority: 'background' });      // idle

// React 18+ — useTransition marca update non-urgent; React interrompe pra input.
const [isPending, startTransition] = useTransition();
startTransition(() => setFilteredOrders(expensiveFilter(orders, query)));
```

Padrões adicionais: pre-compute results durante idle (`requestIdleCallback`), debounce/throttle handlers de typing (lodash.debounce 100ms), evitar synchronous IPC (workers pra heavy compute).

#### Long Animation Frames API (LoAF) — attribution por script

LoAF substitui Long Tasks API: mede frame total > 50ms + breakdown (script, style, layout, paint, render-blocking) + attribution por script com sourceLocation.

```js
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 100) {
      navigator.sendBeacon('/api/loaf', JSON.stringify({
        duration: entry.duration,
        blockingDuration: entry.blockingDuration,
        renderStart: entry.renderStart,
        styleAndLayoutStart: entry.styleAndLayoutStart,
        scripts: entry.scripts.map((s) => ({
          name: s.name,
          src: s.sourceURL,
          dur: s.duration,
          forcedStyleAndLayoutDuration: s.forcedStyleAndLayoutDuration,
        })),
        url: location.href,
      }));
    }
  }
});
observer.observe({ type: 'long-animation-frame', buffered: true });
```

Sem LoAF, INP alto fica invisível — dashboard mostra 600ms p75 sem culpado. Com LoAF, attribution aponta `OrderDetail.tsx:124` no handler de `markDelivered` bloqueando 200ms.

#### View Transitions, bundles, fonts — quick wins 2026

- **View Transitions API** (cruza com `02-03` §2.13): cross-fade declarativo via CSS pseudo-elements; compositor GPU = 60fps em low-end mobile. Pegadinha: interaction-blocking até `viewTransition.finished` — cap duration < 250ms.
- **Tree-shaking**: route-based splitting automatic em Next.js App Router; component-level `lazy(() => import('./Modal'))` pra heavy modals; bundle analyzer (`@next/bundle-analyzer`) em CI bloqueia regressão. ESLint regra `no-restricted-imports` proíbe `import _ from 'lodash'` (200KB+) — força `import debounce from 'lodash/debounce'`. Selective re-export: `from 'date-fns/format'` não `from 'date-fns'`.
- **Critical CSS + fonts**: above-the-fold CSS inline em `<style>` no `<head>` pra zero-FOUC; `font-display: swap` (FOUT acceptable) ou `optional` (no FOUT, fallback if not loaded < 100ms — nunca `block` em hero text); `<link rel="preload" as="font" crossorigin>` pra fontes críticas; variable fonts (1 file substitui 8 weights, 30-40KB savings); self-host fonts via Cloudflare/CDN > Google Fonts (privacy + perf).

#### Logística — stack aplicada

- **Speculation Rules**: hover row em `/orders` → moderate eagerness prerender `/orders/:id` → click instant. Numbers reais 2026: 95% navegação interna prerendered hits → INP p75 ~50ms (vs ~200ms cold nav).
- **INP**: handler `markDelivered` refatorado pra `scheduler.yield()` chunks; `useTransition` em search filter de orders.
- **LoAF**: PerformanceObserver coleta → batch sendBeacon → backend Postgres → dashboard Grafana top scripts blocking.
- **Bundle**: route-based + dynamic import modais; bundle analyzer em CI bloqueia PR > +10KB; ESLint banning lodash full.
- **Fonts**: Atkinson Hyperlegible variable self-hosted Cloudflare CDN; `font-display: swap`.

#### Anti-patterns observados

- Speculation Rules com `immediate` em todos links — battery + bandwidth drain; use `moderate` default.
- Prerender executa analytics sem listener `prerenderingchange` — pageviews duplicados.
- INP medido só em DevTools throttling (idealização); production exige RUM CrUX p75.
- `scheduler.yield()` ausente em loops > 100ms — handler bloqueia input, INP > 500ms.
- LoAF API not observed — high INP causes invisíveis em dashboard.
- Bundle analyzer não roda em CI — large dep imports passam silenciosamente.
- `import _ from 'lodash'` em vez de selective imports (200KB+ deadweight).
- Google Fonts via `<link>` 3rd party — privacy + render-blocking + extra DNS lookup.
- `font-display: block` em hero — FOIT 3s reduz perceived perf.
- Hydration mid-scroll (React 17 / partial sem PPR) — INP terrível em /dashboard.

Cruza com **02-04** (React 19, useTransition + concurrent rendering), **02-05** (Next.js, Speculation Rules em App Router), **03-07** (observability, RUM + LoAF integration), **02-03** (Web APIs, View Transitions), **02-19** (i18n, font subsetting per locale).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Definir LCP, INP, CLS com thresholds.
- Distinguir lab vs field metrics, e qual decide.
- Diagrama do critical render path.
- Estratégias pra reduzir JS bundle (≥ 5).
- Diferenciar `useMemo`, `useCallback`, `memo`, `useTransition` em propósito.
- Explicar custo de hydration e 3 mitigações.
- Otimizar imagem hero pra LCP.
- Configurar Cache-Control corretamente pra HTML vs assets imutáveis.
- Identificar long tasks e propor 2 mitigações.
- Definir performance budget sensato pra projeto típico.

---

## 4. Desafio de Engenharia

Auditar e otimizar **front lojista do Logística v1**.

### Especificação

1. **Baseline**:
   - Lighthouse Mobile (slow 4G simulated) em 5 rotas: `/`, `/login`, `/dashboard`, `/orders`, `/orders/[id]`.
   - Capture: Performance score, LCP, INP/TBT, CLS, total JS, image bytes.
2. **RUM**:
   - Configure Web Vitals reporting (Grafana Faro, Vercel Analytics, ou custom em `/api/rum`).
   - Coleta por rota, p75 e p95.
3. **Bundle analysis**:
   - `@next/bundle-analyzer`. Identifique top 5 contributors.
   - Substitua ou tree-shake pelo menos 2 deps.
4. **Server-Client boundary**:
   - Reveja cada Client Component. Mova pra Server quando possível.
   - Justifique o que ficou Client (interações reais).
5. **Imagens**:
   - Todas via `next/image` com `priority` em LCP image.
   - WebP/AVIF automático.
   - Sizes corretos pra responsive.
6. **Fonts**:
   - `next/font` self-hosting.
   - Subset latin.
   - Preload primary.
7. **Streaming SSR**:
   - Dashboard com Suspense boundaries pra cards individuais.
   - Skeleton loading.
8. **Caching**:
   - HTML estático onde possível (`generateStaticParams`).
   - Revalidate em rotas dinâmicas com tags.
   - Assets imutáveis com hash em nome (Next default).
   - CDN configurado (CloudFront ou Vercel/Cloudflare native).
9. **Third party**:
   - Analytics carregada via Partytown ou next/script `lazyOnload`.
10. **Performance budget**:
    - Lighthouse CI integrado em GitHub Actions.
    - Falha PR se regredir > 5 pontos ou exceder budget definido.
11. **INP work**:
    - Identifique 1 long task e refatore (web worker, useTransition, ou debounce).

### Restrições

- Sem `useEffect` pra fetch quando server fetch resolve.
- Sem CSS-in-JS runtime (styled-components classic).
- Sem `dangerouslySetInnerHTML` sem sanitization (cruzamento com 03-08).

### Threshold

- README documenta:
  - Tabela baseline vs after pra todas as métricas.
  - Bundle analysis antes/depois com top contributors removidos.
  - Decisões Server/Client com diagrama.
  - 1 antes/depois de imagem ou font (waterfall network mostrando ganho).
  - Performance budget sets configurados.
  - 1 long task identificada e mitigada com profile evidence.

### Stretch

- Migrar 1 rota pra Astro como teste de comparação.
- Service Worker pra offline-aware com Workbox.
- Speculation Rules API pra prefetch inteligente.
- Compare LCP em edge runtime vs Node runtime na mesma rota.

---

## 5. Extensões e Conexões

- Liga com **02-01** (HTML/CSS): critical CSS, fonts, semantic HTML.
- Liga com **02-02** (a11y): `prefers-reduced-motion`, focus management.
- Liga com **02-03** (Web APIs): PerformanceObserver, IntersectionObserver.
- Liga com **02-04** (React): memo, useTransition, profiler.
- Liga com **02-05** (Next): RSC, streaming, caching layers.
- Liga com **03-02** (Docker): image size = cold start em SSR/SSG.
- Liga com **03-03** (K8s): edge deployment.
- Liga com **03-04** (CI/CD): Lighthouse CI gate.
- Liga com **03-07** (observability): RUM como source of truth.
- Liga com **03-10** (backend perf): TTFB depende de backend.
- Liga com **04-05** (API design): respostas concisas, pagination.

---

## 6. Referências

- **web.dev** ([web.dev/learn](https://web.dev/learn/)), Web Vitals, Performance.
- **"High Performance Browser Networking"**: Ilya Grigorik.
- **Addy Osmani blog** ([addyosmani.com](https://addyosmani.com/)), perf patterns.
- **Chrome DevTools docs**: Performance, Coverage, Network.
- **Vercel blog**: Next perf, RSC.
- **Astro docs** ([docs.astro.build](https://docs.astro.build/)).
- **Qwik docs** ([qwik.builder.io/docs](https://qwik.builder.io/docs/)).
- **Lighthouse CI** ([github.com/GoogleChrome/lighthouse-ci](https://github.com/GoogleChrome/lighthouse-ci)).
- **WebPageTest** ([webpagetest.org](https://www.webpagetest.org/)).
- **Chrome UX Report** ([developer.chrome.com/docs/crux](https://developer.chrome.com/docs/crux)).
