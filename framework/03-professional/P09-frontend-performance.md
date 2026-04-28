---
module: P09
title: Frontend Performance — Web Vitals, Bundle, Rendering, Network
stage: professional
prereqs: [A04, A05]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# P09 — Frontend Performance

## 1. Problema de Engenharia

Performance front é onde mais devs se enganam. "Está rápido na minha máquina" — em MacBook M3 com fibra. Em Moto G4 com 3G, sua landing page é 14s. Lighthouse 65. Conversões caem. Você descobre quando alguém do produto reclama. Aí começa cargo cult: lazy load tudo, code split tudo, `React.memo` em todo componente — sem entender o que está custando.

Este módulo é perf front com método: Web Vitals (LCP, INP, CLS), Network waterfall, JS bundle, render path, hydration cost, image/font loading, caching, edge. Você sai sabendo medir, identificar bottleneck verdadeiro, e otimizar com prioridade. P10 cobre backend perf.

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
- **`memo`, `useMemo`, `useCallback`**: skipam recálculos. Não use cego — só onde profile mostra valor.
- **`useTransition`** (React 18+): marca update como não-urgente, pode ser interrompido por urgentes.
- **`useDeferredValue`**: defer derived value.
- **List virtualization**: renderize só items visíveis. `react-window`, `tanstack/virtual`.

React DevTools Profiler: identifica componentes lentos, re-renders desnecessários.

### 2.6 RSC e edge para perf

RSC (React Server Components) move render pro servidor: client recebe HTML + RSC payload (sem JS pra esses componentes). Reduz bundle.

Edge runtime executa perto do user: TTFB baixo. Pra rotas que não dependem de DB pesado, edge ganha.

Static generation (SSG) > SSR > CSR em TTFB e LCP, when possible. Cache HTML no CDN.

### 2.7 Hydration cost

Após HTML render, React precisa "hidratar" — anexar event listeners. Bundle JS executa em main thread. Em apps grandes, hydration de página inteira trava interação por segundos.

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
- Self-host (next/font, fontsource) — Google Fonts via CDN custa round-trip + privacy.
- Subset (latin only se for o caso).
- Preload critical font files.
- Variable fonts: 1 file vs N.

### 2.10 CSS

- **Avoid unused CSS**: PurgeCSS / Tailwind extracted. Tailwind faz por default.
- **CSS-in-JS** runtime (styled-components classic): caro em hydration. Migration em projetos sérios pra zero-runtime (linaria, vanilla-extract, Tailwind).
- **`content-visibility: auto`**: skip render off-screen.
- **`will-change`**: hint pra browser otimizar.

### 2.11 Network

- **HTTP/2 ou HTTP/3** (default em CDNs sérias) — multiplexing reduz overhead.
- **Brotli > gzip** quando disponível.
- **CDN**: cache estático, edge perto do user.
- **Preconnect / DNS-prefetch** pra origins críticas (`<link rel="preconnect" href="https://api.example.com">`).
- **Service Worker**: offline-first, custom caching. Útil pra PWA.
- **HTTP cache**: `Cache-Control` properly. Hash em filenames pra cache busting.

### 2.12 Caching strategies

- **`Cache-Control: public, max-age=31536000, immutable`** pra assets com hash em nome.
- **`Cache-Control: no-cache`** pra HTML — força revalidate, ETag pra 304.
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

- 3G simulado em DevTools — execute pelo menos 1 vez.
- Battery: animations heavy custam.
- Memory: SPAs grandes vazam — Chrome closes tab em low-mem.
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
- Sem `dangerouslySetInnerHTML` sem sanitization (cruzamento com P08).

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

- Liga com **A01** (HTML/CSS): critical CSS, fonts, semantic HTML.
- Liga com **A02** (a11y): `prefers-reduced-motion`, focus management.
- Liga com **A03** (Web APIs): PerformanceObserver, IntersectionObserver.
- Liga com **A04** (React): memo, useTransition, profiler.
- Liga com **A05** (Next): RSC, streaming, caching layers.
- Liga com **P02** (Docker): image size = cold start em SSR/SSG.
- Liga com **P03** (K8s): edge deployment.
- Liga com **P04** (CI/CD): Lighthouse CI gate.
- Liga com **P07** (observability): RUM como source of truth.
- Liga com **P10** (backend perf): TTFB depende de backend.
- Liga com **S05** (API design): respostas concisas, pagination.

---

## 6. Referências

- **web.dev** ([web.dev/learn](https://web.dev/learn/)) — Web Vitals, Performance.
- **"High Performance Browser Networking"** — Ilya Grigorik.
- **Addy Osmani blog** ([addyosmani.com](https://addyosmani.com/)) — perf patterns.
- **Chrome DevTools docs** — Performance, Coverage, Network.
- **Vercel blog** — Next perf, RSC.
- **Astro docs** ([docs.astro.build](https://docs.astro.build/)).
- **Qwik docs** ([qwik.builder.io/docs](https://qwik.builder.io/docs/)).
- **Lighthouse CI** ([github.com/GoogleChrome/lighthouse-ci](https://github.com/GoogleChrome/lighthouse-ci)).
- **WebPageTest** ([webpagetest.org](https://www.webpagetest.org/)).
- **Chrome UX Report** ([developer.chrome.com/docs/crux](https://developer.chrome.com/docs/crux)).
