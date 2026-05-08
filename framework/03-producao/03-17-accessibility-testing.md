---
module: 03-17
title: Accessibility Testing & Automation, axe, Pa11y, Lighthouse, Manual Audits, A11y CI
stage: producao
prereqs: [02-02, 03-01]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
quiz:
  - q: "Qual o primeiro princípio do ARIA?"
    options:
      - "Sempre adicionar role explícito em todo elemento"
      - "Não use ARIA: se existe HTML element nativo que faz, use HTML. ARIA wrong é pior que sem ARIA"
      - "ARIA substitui semantic HTML em todos casos"
      - "Use ARIA apenas em screen readers, não em outros AT"
    correct: 1
    explanation: "<button> > <div role='button'>. HTML nativo já carrega role + keyboard handling + state. ARIA é supplemental quando HTML não cobre (combobox custom, tabs). ARIA mal aplicado quebra mais do que ajuda."
  - q: "Por que tooling automatizado (axe, Lighthouse) cobre só 30-57% das WCAG issues?"
    options:
      - "Tools não rodam em todos os browsers"
      - "Não detectam: focus order semântico, alt text quality, ARIA contextual misuse, keyboard flow lógico, dynamic announcements"
      - "Tools são lentos demais"
      - "WCAG é deliberadamente vago"
    correct: 1
    explanation: "Tools detectam violações estruturais (alt missing, contrast ratio, label-input). Não validam: alt 'photo' vs descritivo, heading hierarchy lógica, focus management cross-state, keyboard navigation completa. Manual SR + keyboard cobrem o restante."
  - q: "Qual o contrast ratio mínimo WCAG AA para texto normal?"
    options:
      - "3:1"
      - "4.5:1 para normal text; 3:1 para large text (≥18pt ou ≥14pt bold)"
      - "7:1"
      - "2:1"
    correct: 1
    explanation: "AA exige 4.5:1 normal e 3:1 large. AAA é 7:1 / 4.5:1. Validar em todos states (default, hover, focus, disabled) e em both modes (light/dark). Tools: axe color-contrast rule, WebAIM checker."
  - q: "Por que Lighthouse score 100 não garante WCAG conformance?"
    options:
      - "Lighthouse é desatualizado"
      - "Lighthouse usa heurísticas limitadas, não testa keyboard navigation completa nem validates ARIA contextual; útil pra detectar regression, não pra certificar"
      - "Lighthouse tem bugs"
      - "Lighthouse só mede performance"
    correct: 1
    explanation: "Lighthouse a11y é subset de axe-core. Não testa keyboard fully, não valida user flows, não checa cognitive accessibility. Score 100 com keyboard nav quebrada é possível. Use como deploy gate (regression), não como certificação."
  - q: "O que requer WCAG 2.2 SC 2.5.8 Target Size (Minimum, AA)?"
    options:
      - "Targets de 100x100 px"
      - "Targets clicáveis mínimo 24x24 CSS px, exceto inline text, browser-default UA controls, ou alternative equivalente"
      - "Apenas mobile precisa cumprir"
      - "Não há requirement de tamanho"
    correct: 1
    explanation: "WCAG 2.2 (W3C Rec Sept 2023) adicionou Target Size 24x24 mínimo (AA), 44x44 (AAA). Mobile-first cap em 44x44. Crítico em map markers, swipe carousels, dense lists. EAA (28-Jun-2025) força conformance em B2C UE."
---

# 03-17, Accessibility Testing & Automation

## 1. Problema de Engenharia

02-02 cobriu accessibility como design e implementation. Mas conhecimento sem **testing automation** vira regressão silenciosa. Dev adiciona componente novo, esquece `aria-label`, PR aprova, deploy, screen reader user reclama meses depois, pior, abandona produto sem reclamar. Sem CI gate, a11y degrada continuamente.

Tooling automatizado não pega tudo (estimativas: ~30-40% de issues detectáveis automaticamente; resto exige usuário humano e screen reader). Mas pega muito do baixo-pendente fácil, alt text faltando, contrast ruim, label-input mismatch, aria-* errado, focus order broken, lang missing. Combinar **automated** + **manual** + **user testing** é o standard.

Compliance importa: WCAG 2.1 AA é referência mínima; AAA quando contexto pede. Lawsuits ADA crescem ano a ano (Domino's vs Robles, 2019; várias outras). EU Web Accessibility Directive 2016 exige público sites nivelarem. Tooling como Lighthouse, axe, Pa11y, Wave, screen readers (VoiceOver, NVDA, JAWS) compõem stack.

Este módulo é **a11y como prática de engineering**: tools automatizados, integração CI, manual audits estruturados, screen reader testing real, WCAG conformance cobrança, accessibility audit reports, e como evangelizar dentro do time. Plus os patterns de componentes complexos (modals, comboboxes, data grids) que tooling automatizado não pega.

---

## 2. Teoria Hard

### 2.1 WCAG 2.1 e níveis

WCAG (Web Content Accessibility Guidelines):
- 4 princípios: **POUR**: Perceivable, Operable, Understandable, Robust.
- 13 guidelines.
- Success Criteria com níveis A / AA / AAA.
- WCAG 2.2 (2023) adiciona 9 novos criteria (focus appearance, dragging, target size).
- WCAG 3 em draft.

Padrão prático: **AA**. AAA para subset (medical, government).

Compliance documentation: VPAT (Voluntary Product Accessibility Template), accessibility statement.

### 2.2 ARIA: o que e quando

ARIA (Accessible Rich Internet Applications) suplementa HTML quando native não cobre:
- `role`: papel semântico (button, dialog, menu).
- `aria-label`/`aria-labelledby`: nome acessível.
- `aria-describedby`: descrição extra.
- `aria-expanded`, `aria-selected`, `aria-checked`, `aria-current`: estado.
- `aria-live`, `aria-atomic`: anúncios dinâmicos.
- `aria-hidden`: esconde de AT (Assistive Tech).

**Primeiro princípio do ARIA: não use ARIA**. Se existe HTML element que faz, use HTML. `<button>` > `<div role="button">`. ARIA wrong é pior que sem ARIA.

### 2.3 Screen readers: como funcionam

Linearizam DOM em árvore acessível. User navega via:
- Heading list (H key NVDA/JAWS).
- Landmark list.
- Form fields list.
- Link list.
- Tab order.
- Read continuous.

Tools:
- **VoiceOver** (macOS, iOS), Cmd+F5 ativa.
- **NVDA** (Windows, free), preferido em test.
- **JAWS** (Windows, paid), enterprise dominant.
- **TalkBack** (Android).
- **Narrator** (Windows builtin).
- **Orca** (Linux).

Cada um interpreta ARIA ligeiramente diferente. Test with at least 2.

### 2.4 Tools automatizados

Cobrem ~30-40% issues:

- **axe-core** (Deque): engine open-source. Used by Lighthouse, axe DevTools, Cypress-axe.
- **Pa11y**: CLI runner com axe + HTMLCS. Good for CI.
- **Lighthouse** (Chrome): includes accessibility audit. Runs em DevTools, CI.
- **WAVE** (WebAIM): browser extension visual.
- **Accessibility Insights** (Microsoft): manual + automated.
- **a11y-html-checker, eslint-plugin-jsx-a11y**: lint nível.

Ofício real: integrar 1 motor (axe) em multiple stages (lint → unit → e2e → CI).

### 2.5 ESLint a11y

`eslint-plugin-jsx-a11y` para React. Rules:
- `alt-text`: `<img>` sem alt.
- `anchor-is-valid`: `<a>` sem href.
- `click-events-have-key-events`: divs clicáveis sem keyboard.
- `no-noninteractive-element-interactions`: button-like em div.
- `label-has-associated-control`.
- `aria-props`, `role-supports-aria-props`: ARIA correto.

Integrar em lint = catch em PR antes de revisão humana.

### 2.6 Unit-level testing

`jest-axe`:
```js
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

test('button accessible', async () => {
  const { container } = render(<MyButton />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

Cobre componentes isolados. Catches alt missing, contrast at component level.

### 2.7 E2E-level testing

`@axe-core/playwright`:
```js
import AxeBuilder from '@axe-core/playwright';

test('home page accessible', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

Cobre integração e contexto real. Run em CI por route principal.

`cypress-axe` similar.

### 2.8 Lighthouse CI

`lhci` runs Lighthouse em CI. Targets configuráveis (accessibility ≥ 95). Falha PR se score cair.

Útil pra dashboards de tendência.

### 2.9 Color contrast

Razões:
- WCAG AA normal text: 4.5:1.
- AA large text (≥ 18pt or ≥ 14pt bold): 3:1.
- AAA: 7:1 / 4.5:1.

Tools: WebAIM Contrast Checker, axe.

Design tokens contra contrast: dark mode pode quebrar; test ambos modes.

### 2.10 Focus management

**Visible focus** (CSS `:focus-visible`). Default styles ok ou customize. **Não** `outline: none` sem replacement.

**Focus order**: tab segue source order. Override com `tabindex` cuidadoso. `tabindex="-1"` torna programmatically-focusable, não tabbable.

**Focus trap**: modais retêm foco até fechar. Lib: `focus-trap`.

**Skip links**: "Skip to main content" no início; permite leitura rápida.

### 2.11 Live regions

Conteúdo que muda dinâmicamente sem reload (toasts, notificações, search results count) precisa anunciado.

```html
<div aria-live="polite" aria-atomic="true">
  3 results found
</div>
```

`polite`: anuncia quando user pausa. `assertive`: interrupção (use sparingly).

### 2.12 Components patterns: a11y específica

**Modal/Dialog**:
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby`.
- Focus trap.
- ESC fecha.
- Restore focus ao trigger ao fechar.

**Combobox / autocomplete**:
- `role="combobox"`, `aria-expanded`, `aria-controls`.
- Listbox com `role="listbox"`, options `role="option"`.
- Arrow keys navegam, Enter seleciona, ESC fecha.

**Data grid**:
- `role="grid"`, rows `role="row"`, cells `role="gridcell"`.
- Arrow keys navegam células.
- Enter ativa.

**Toast notifications**:
- `role="status"` (polite) ou `role="alert"` (assertive).
- Don't auto-dismiss critical info.

ARIA Authoring Practices Guide (APG) tem patterns canônicos. Use.

### 2.13 Forms accessibility

- `<label for="...">` cada campo.
- `aria-describedby` para help text e errors.
- `aria-invalid="true"` em invalid.
- Error messages associated, não só visual.
- Required indicators (`*`) com `aria-label` ou `aria-required`.
- Submit feedback acessível (live region).

### 2.14 Manual audit checklist

Tooling não pega:
- Heading hierarchy semantic (h1 → h2 → h3 sem pulos).
- Link text descriptive ("read more" sem context = ruim).
- Image alt qualidade ("photo" não diz nada).
- Logical order tab.
- Captions/transcripts em vídeo/áudio.
- Reduced motion respeitado (`prefers-reduced-motion`).
- Keyboard-only navigation completa.
- Screen reader test em fluxos críticos.

Manual audit por release maior. Documente findings.

### 2.15 User testing com PWD

Pessoas com disabilities testando produto = **gold standard**.

Recruit:
- Empresas (e.g. Fable, Knowbility).
- Communities (NFB, AccessibleApps).
- User research panels.

Diversidade necessária: vision (blind, low-vision), hearing (deaf, hard-of-hearing), motor (limited mobility, voice control), cognitive (dyslexia, ADHD, autism).

Insights únicos: tool-detected issue (low contrast) já corrigida pode ainda ser problemática contextualmente.

### 2.16 CI integration patterns

Pipeline maduro:
1. **Lint** (eslint-plugin-jsx-a11y), every commit.
2. **Unit** (jest-axe), per component.
3. **E2E** (Playwright + axe), key flows.
4. **Lighthouse CI**: per route.
5. **Visual regression**: detect undocumented changes.
6. **Manual audit**: quarterly.
7. **User testing**: major releases.

Each step catches different layer. None alone enough.

### 2.17 Reporting e remediation

Audit report:
- Issue list with severity (critical/serious/moderate/minor).
- WCAG criterion violated.
- Component / page.
- Steps to reproduce.
- Suggested fix.
- AT used pra detect.

Remediation tracker: tickets em backlog priorizados. Critical = blocks release; serious = next sprint; etc.

VPAT atualizado periodicamente.

### 2.18 Mobile a11y

iOS: VoiceOver, Dynamic Type, Switch Control, AssistiveTouch.
Android: TalkBack, Magnification, Switch Access.

Native components default a11y melhor que web. RN bridges nem sempre, test.

`accessibilityLabel`, `accessibilityRole`, `accessibilityHint`, `accessibilityState` em RN.

### 2.19 Cognitive accessibility

Underrated. Issues:
- Texto denso, jargão técnico → aware.
- Time limits sem extension.
- Auto-rotating content sem pause.
- Distraction (anim sem reason).
- Inconsistent navigation.

WCAG 2.2 e WCAG 3 (draft) expandem cobertura cognitive.

### 2.20 a11y como leverage de business

Acessibilidade não é só compliance:
- Audience expansion (~15-20% pop com disability).
- SEO benefit (semantic HTML).
- Code quality proxy (semantic = maintainable).
- Brand reputation.
- Fewer lawsuits.

04-16 (product/business): a11y é gate sutil pra B2B enterprise (procurement perguntam).

### 2.21 a11y testing automation pipeline (axe + Playwright + Storybook + manual screen reader workflow)

Senior+ é dono de pipeline a11y multi-layer. Tooling pega o detectável; manual SR + keyboard cobrem o resto. Quem só roda Lighthouse passa 100 com produto inacessível.

**Cobertura real automated vs manual** (Deque benchmarks + WebAIM Million 2024-2025):
- axe-core 4.10+ + Lighthouse 12+ pegam ~30-57% de WCAG 2.2 issues (Deque benchmarks; varia por estudo, página estática vs SPA stateful). WebAIM Million 2024: 95.9% das homepages têm pelo menos 1 WCAG failure detectable, média 56.8 errors per page.
- Manual SR + keyboard pegam o resto: focus management cross-state, semantic correctness (heading hierarchy lógica, não só presente), cognitive coherence, announce timing.
- **Estratégia**: automate o catchable em CI; manual gate em critical journeys; user testing PWD pra real validation (cruza com §2.15).

**axe-core + Playwright (browser-real, stateful)**: `@axe-core/playwright` em E2E suite.

```ts
import AxeBuilder from '@axe-core/playwright';

test('orders page has no detectable a11y issues', async ({ page }) => {
  await page.goto('/orders');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('create order modal is accessible em open state', async ({ page }) => {
  await page.goto('/orders');
  await page.getByRole('button', { name: 'Criar pedido' }).click();
  const results = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(['wcag2aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

axe é snapshot-only — rodar em cada important state (modal aberto, error, loading, empty). Custom override: `disableRules(['color-contrast'])` quando design intencional, sempre justificado em comment + ticket de revisita. Cost: ~5-10ms por scan; signal/noise alta.

**Storybook 8+ a11y addon** (`@storybook/addon-a11y`): roda axe em cada story em background; panel inline mostra violations. Component-level catch antes de E2E. `test-storybook --runner playwright` roda axe em todas stories em CI.

```ts
// OrderCard.stories.ts
export default {
  title: 'OrderCard',
  component: OrderCard,
  parameters: {
    a11y: {
      config: {
        rules: [{ id: 'color-contrast', enabled: true }],
      },
    },
  },
};

export const Default = { args: { status: 'pending' } };
export const Delivered = { args: { status: 'delivered' } };
export const Errored = { args: { status: 'failed', errorMessage: 'Endereço inválido' } };
```

1 story por state crítico. Disabled rules sempre justified em comment com link WCAG.

**Lighthouse CI 12+ gating** (`@lhci/cli`):

```js
// lighthouserc.cjs
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/', 'http://localhost:3000/orders', 'http://localhost:3000/login'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 0.95 }],
      },
    },
  },
};
```

Bloqueia merge se score cai. Pegadinha: Lighthouse 100 NÃO garante WCAG (heurística limitada, não testa keyboard fully). Útil pra detectar regression, não pra certificar.

**Manual SR workflow** (mandatory pra critical journeys):
- **NVDA 2024+ + Firefox** (Windows, free) — most-used globally por blind users; primary target.
- **JAWS + Chrome** (Windows, paid) — enterprise standard.
- **VoiceOver + Safari** (macOS/iOS, built-in) — Apple users.
- **TalkBack + Chrome** (Android, built-in) — mobile coverage.

Workflow Logística "criar pedido":
1. Tab por form completo. Cada field anuncia label + hint + error state.
2. Submit button announce role + state ("Criar pedido, button" not "Criar pedido").
3. Pós-submit, success message anunciada via `aria-live="polite"` (sem mover focus).
4. Focus management após modal close: retorna ao trigger.

Cadência: SR em PR que altera UI semantics; full audit por release; user testing PWD trimestral.

**Keyboard-only navigation**: Tab + Shift+Tab + Enter + Space + Arrow + Esc. Sem mouse, sem touchpad.
- `:focus-visible` outline SEMPRE; NEVER `outline:none` sem replacement.
- Skip link "Pular pra conteúdo principal" em primeiro tab stop, visível ao receber focus.
- Modal: Tab cycla dentro; Esc fecha; focus retorna ao trigger.
- Toast: keyboard-reachable via `role="status"`.

Logística keyboard journeys: header → search → filters → results table → row actions; modal flows; toast dismiss.

**Color contrast automation**: axe color-contrast rule cobre WCAG ratios (4.5:1 normal AA, 3:1 large 18pt+ AA, 7:1 AAA). NÃO automated: text on photo backgrounds, dynamic data colors — manual review. Tools design phase: `tota11y`, axe DevTools, Stark Figma plugin.

**CI pipeline Logística completa**:
- **PR**: axe via Playwright em 5 critical journeys (orders list, order detail, create order, login, settings); Storybook test-runner axe em todas stories; Lighthouse CI a11y >= 95.
- **Pre-release**: manual SR test em new flows (QA gate); user testing PWD trimestral (Fable, Whitespace).
- **Production**: feedback channel `a11y@logistica.example.com`; 3rd party audit anual (~$5-15k médio em 2026).

**Logística thresholds por journey**:
- **Critical** (block merge): create order, view tracking, login. Manual SR 100%.
- **Important** (warn merge): settings, billing, dashboard. Manual SR 50% sample.
- **Standard** (CI report only): marketing, docs. Manual SR skipped.

**Anti-patterns observados**:
- axe na home apenas, ignorando logged-in critical journeys.
- Storybook a11y addon installed mas violations ignored (panel unread).
- Lighthouse 100 com keyboard nav quebrada (Lighthouse não testa keyboard fully).
- SR test apenas pelo dev (developer ≠ user; falsifica sutilezas).
- `outline:none` sem `:focus-visible` replacement (keyboard users perdem signaling).
- Skip link presente mas focus não vai (CSS `position:absolute; top:-9999px` permanente; broken).
- Modal sem focus trap (keyboard sai acidentalmente; UX confuso).
- `aria-live` em região mutável sem polite/assertive value (SR não anuncia changes).
- `color-contrast` disabled globally em axe (silently passes; user perde).
- Manual SR só em release final (regression late-discovered; expensive fix).

**Cruza com**: 02-02 (a11y, ARIA + screen reader patterns); 03-01 (testing, integração Playwright suite); 03-04 (CI/CD, gating axe + Lighthouse); 03-18 (cognitive a11y, complementary); 02-04 (React, Storybook integration).

---

### 2.22 WCAG 2.2 + WCAG 3.0 draft + automated screen reader testing 2026

**WCAG 2.2** (W3C Recommendation, 5 Out 2023) consolida-se em 2026 como baseline regulatório. Adiciona 9 success criteria sobre 2.1, removendo apenas 4.1.1 Parsing (obsoleto):

- **2.4.11 Focus Not Obscured (Min, AA)** / **2.4.12 Focus Not Obscured (Enh, AAA)**: elemento focado não pode ficar totalmente coberto por sticky header/cookie banner/modal não-modal. Min permite cobertura parcial; Enh exige zero overlap.
- **2.4.13 Focus Appearance (AAA)**: focus indicator com área mínima 2 CSS px perimeter, contrast ratio 3:1 contra estados não-focados.
- **2.5.7 Dragging Movements (AA)**: toda funcionalidade drag tem alternativa single-pointer (click/tap). Quebra carrosséis swipe-only, sliders sem keyboard.
- **2.5.8 Target Size (Min, AA)**: targets clicáveis mínimo **24x24 CSS px**, exceto inline text, browser-default UA controls, ou equivalente alternative. AAA Target Size (Enh) mantém 44x44.
- **3.2.6 Consistent Help (A)**: contato/help link em mesma posição relativa entre páginas.
- **3.3.7 Redundant Entry (A)**: dados já fornecidos no flow não devem ser pedidos novamente (auto-fill ou select previous).
- **3.3.8 Accessible Authentication (Min, AA)** / **3.3.9 (Enh, AAA)**: cognitive function tests (CAPTCHA, lembrar password) banidos exceto se houver alternativa, ou auxiliar mecanism (password manager paste, biometric, OAuth).

**European Accessibility Act (EAA)** entrou em vigor **28-Jun-2025**. Força WCAG 2.1 AA mínimo para B2C produtos digitais ofertados na UE (e-commerce, banking, transport, ebooks). Penalidades nacionais variam, Alemanha até €100k por violação. EAA não exige 2.2 ainda, mas auditorias usam como state-of-art reference.

```css
/* WCAG 2.2 SC 2.5.8 Target Size (Min) */
button, a.btn, [role="button"], input[type="checkbox"] + label {
  min-width: 24px;
  min-height: 24px;
}
/* AAA target (recomendado para mobile-first) */
@media (pointer: coarse) {
  button, a.btn { min-width: 44px; min-height: 44px; }
}

/* SC 2.4.11 Focus Not Obscured: sticky header + scroll-margin */
:root { --sticky-header-h: 64px; }
:focus-visible {
  scroll-margin-top: calc(var(--sticky-header-h) + 8px);
  outline: 3px solid #0066cc;
  outline-offset: 2px;
}
header.sticky { position: sticky; top: 0; }
```

**WCAG 3.0** continua **Working Draft em 2026** (W3C AG WG, último update Mar 2026), target candidate recommendation ~2027. Mudança paradigmática vs 2.x:

- Outcome-based em vez de pass/fail success criteria. Cada outcome avaliado em scoring 0-4 (Bronze/Silver/Gold conformance levels).
- Cognitive disabilities first-class (não retrofit como em 2.x). Inclui low-literacy, math anxiety, working memory.
- Inclui native apps + XR + voice UI (não só web).
- Equity-focused: bias mitigation em ML-driven UIs, dark patterns enumeration.

Não-normativo ainda. **Não usar para compliance** em 2026, mas designs maduros já testam contra outcomes (ex: "Visual contrast of text" outcome substitui SC 1.4.3).

**axe-core 4.10+** (Set 2025, Deque) é referência industry. Pacotes:

- `@axe-core/playwright` 4.10 — fixture nativa Playwright.
- `@axe-core/react` 4.10 — runtime no dev mode, log violations no console.
- `axe-core/cli` — headless audit single URL.
- `axe-core` — engine puro, configurable.

Rules-config: best-practice rules (`region`, `landmark-one-main`) ficam OFF em CI por default; opt-in com `runOnly: ['wcag2a', 'wcag2aa', 'wcag22aa', 'best-practice']`. Custom rules via `axe.configure({checks: [...], rules: [...]})`. Color-contrast-enhanced rule cobre WCAG AAA 1.4.6.

**Cobertura tooling vs manual** (Deque benchmarks): axe-core detecta automaticamente ~57% das WCAG issues automatable; **manual SR + keyboard restantes 43%** (focus order semântico, alt text quality, ARIA misuse contextual, dynamic announcements). **Tooling-only é insuficiente.** Cross-cite: WebAIM Million 2024 (análise top-1M homepages): 95.9% das homepages têm pelo menos 1 WCAG failure detectable, média 56.8 errors per page — escala do problema, não cobertura de ferramenta.

**Playwright a11y testing 1.45+** (Jul 2025) tem fixture native + cross-browser:

```typescript
// tests/a11y.fixture.ts
import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export const test = base.extend<{ makeAxeBuilder: () => AxeBuilder }>({
  makeAxeBuilder: async ({ page }, use) => {
    const builder = () => new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .disableRules(['color-contrast']); // theme-switching false-positive
    await use(builder);
  },
});

// tests/orders.a11y.spec.ts
import { test } from './a11y.fixture';
import { expect } from '@playwright/test';

test('admin/orders zero WCAG 2.2 AA violations', async ({ page, makeAxeBuilder }) => {
  await page.goto('/admin/orders');
  await page.getByLabel('Email').fill(process.env.E2E_USER!);
  await page.getByLabel('Password').fill(process.env.E2E_PWD!);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('/admin/orders');

  const results = await makeAxeBuilder().analyze();
  expect(results.violations).toEqual([]);

  // Snapshot accessibility tree, assert shape
  const snap = await page.accessibility.snapshot();
  expect(snap?.children?.find(n => n.role === 'main')).toBeDefined();
});
```

Rodar em WebKit cobre VoiceOver-equivalent rendering (mesma engine). Authenticated route testing exige fixture com pre-auth state (`storageState`).

**Storybook a11y addon 8.x** (`@storybook/addon-a11y`) roda axe per-story. A11y panel mostra violations no sidebar. CI gate via `test-storybook --browsers chromium --maxWorkers=2 --testTimeout=30000`. Adopters: **Shopify Polaris, Atlassian Design System, GitHub Primer** rodam mandatory em PR.

**Screen reader automation 2026** via `@guidepup/guidepup` (orchestrate VoiceOver/NVDA via OS-level APIs, não webdriver). Tests rodam em macOS runner (VoiceOver) + Windows runner (NVDA), assert anúncios reais:

```typescript
import { voiceOver } from '@guidepup/guidepup';

test('save button announces correctly', async () => {
  await voiceOver.start();
  await voiceOver.navigateToWebContent();
  await voiceOver.next(); // até landing no botão
  expect(await voiceOver.lastSpokenPhrase()).toContain('Save order, button');
  await voiceOver.act();
  expect(await voiceOver.lastSpokenPhrase()).toContain('Order saved');
  await voiceOver.stop();
});
```

Adopters reais: **Microsoft Edge team** (web platform tests), **Adobe** (Spectrum design system). Custo: macOS GitHub Actions runner é **10x mais caro** que Linux ($0.08/min vs $0.008/min); reservar para release-candidate runs, não toda PR.

**Pa11y Dashboard / Lighthouse CI** são alternativas a axe-only para multi-page crawl. Pa11y útil para non-React legacy multi-page (PHP, Rails server-rendered), gera WCAG impact reports per-route, baseline + drift detection. Lighthouse CI integra a11y score (subset axe-core) com Web Vitals em mesmo pipeline; útil em production deploy gate.

**Manual SR + keyboard testing protocol** continua não-substituível:

- **VoiceOver macOS** (Cmd+F5) — Safari pareado.
- **NVDA Windows** (Ctrl+Alt+N, free, NV Access) — Firefox/Chrome pareados.
- **JAWS Windows** (paid, Freedom Scientific) — enterprise, ~3% market share.
- **TalkBack Android** (Settings → Accessibility → TalkBack) — Chrome.
- **VoiceOver iOS** (Settings → Accessibility → VoiceOver) — Safari.
- **Voice Control iOS / Voice Access Android** — motor disability simulation.

Test matrix: cada release Q tem 1-2h manual SR session por critical flow. Recording: AXE DevTools "share scenario" reproduz steps. WebAIM Screen Reader User Survey #10 (2024): NVDA 65.6%, JAWS 60.5%, VoiceOver desktop 33.5% (multi-select).

**CI integration patterns 2026**:

- `@axe-core/playwright` em PR check (block merge se WCAG A/AA falhar).
- Lighthouse CI em production deploy gate (a11y score >= 95).
- Storybook a11y `test-storybook` daily run em main.
- Pa11y weekly crawl em prod URLs.
- Reporting: Datadog/Sentry tags `a11y.violation.severity:critical`, `a11y.wcag.sc:2.4.11`, dashboard de drift por route.

**Legal landscape 2026**: ADA Title III: **8.800 federal filings em 2024 (+7% YoY)** e **8.667 em 2025 (-2%)** (Seyfarth ADA Title III blog tracker); web accessibility lawsuits especificamente **2.452 em 2024 → 3.117 em 2025 (+27%)** (Seyfarth 2025 mid-year report; AudioEye 2025 review). DOJ final rule (24 Abr 2024) adopta WCAG 2.1 AA como standard pra government Title II web/mobile. Section 508 Refresh 2017 obriga federal contractors a WCAG 2.0 AA. EU EAA enforced 28-Jun-2025. UK Equality Act 2010 + Public Sector Bodies Accessibility Regs 2018. Casos referenciais: **Domino's vs Robles** (SCOTUS 2019, app/site precisa ser acessível), **Target $6M settlement** (NFB class action 2008). Risk pricing: failure = lawsuit + remediation + brand. Insurance carriers (AIG, Chubb) oferecem cyber/a11y rider.

**Mobile a11y deep 2026 — VoiceOver/TalkBack + Voice Control + user preferences detection**: mobile a11y é território distinto de web a11y. **iOS:** VoiceOver (rotor + custom actions), Voice Control (numbers/grid/labels), Switch Control, Guided Access, Reduce Motion, Increase Contrast, Bold Text, Larger Text Type. **Android:** TalkBack (linear vs explore-by-touch), Switch Access, Voice Access (Google Assistant integrado), Live Caption, font scaling, color inversion, Select to Speak.

**Detecção user preferences em runtime**:

- iOS Swift: `UIAccessibility.isVoiceOverRunning`, `UIAccessibility.isReduceMotionEnabled`, `UIAccessibility.preferredContentSizeCategory` — adapt UI quando AT ativo (e.g., simplificar animations, expandir hit-targets).
- Android Compose: `LocalAccessibilityManager.current.isEnabled`, `LocalDensity` + Dynamic Type, `Settings.Global.ANIMATOR_DURATION_SCALE = 0` indica reduce motion.
- React Native: `AccessibilityInfo.isScreenReaderEnabled()`, `AccessibilityInfo.isReduceMotionEnabled()`.
- CSS web (mobile browsers): `@media (prefers-reduced-motion)`, `@media (prefers-contrast)`, `@media (forced-colors: active)`.

**Compose semantics modifier patterns**:

```kotlin
Modifier.semantics {
    contentDescription = "Avatar do courier João"
    role = Role.Image
    customActions = listOf(
        CustomAccessibilityAction("Ligar pro courier") { call(courier); true }
    )
}
```

**SwiftUI accessibility traits + custom rotor**:

```swift
Image("courier_avatar")
    .accessibilityLabel("Avatar do courier João")
    .accessibilityAddTraits(.isImage)
    .accessibilityCustomContent("Avaliação", "4.8 estrelas")
    .accessibilityAction(named: "Ligar") { callCourier() }
```

**Manual mobile SR test protocol**: TalkBack swipe right (next), Tap (activate), Three-finger swipe up (read all from top), Two-finger swipe right (next via local context); VoiceOver swipe right (next), Double-tap (activate), Two-finger flick down (read all), rotor (twist two fingers) para navigation modes (headings, links, form controls).

**Real impact 2026**: WCAG 2.2 Target Size (24×24 CSS px min, AA) é peculiarmente difícil em densidade mobile alta — testar em device real, não simulator. EAA (28-Jun-2025) cobre apps mobile B2C explicitly. ADA Title III tendência 2024-2025 (Seyfarth tracker): web/app accessibility filings +27% YoY 2025; pro se plaintiffs +40% (uso de AI tools como ChatGPT/Copilot pra draft complaints).

Logística aplicada: courier dashboard `/admin` testa axe-playwright em todas rotas autenticadas (orders, drivers, dispatch, settings) via fixture com `storageState` pré-auth, gate em PR. Storybook a11y panel obrigatório passar para merge em qualquer componente do design system interno. Manual NVDA + VoiceOver run por release no flow "criar order" (create → assign driver → mark delivered). WCAG 2.2 SC 2.5.8 target-size aplicado em map markers (Leaflet/Mapbox custom icons 44x44 CSS px), em swipe-actions de lista de orders aplicar SC 2.5.7 com alternative button "Assign".

Cruza com **03-17 §2.4** (axe basics, agora específico 2.2 rules), **03-17 §2.7** (Playwright a11y intro estendido com fixture + accessibility tree snapshot), **03-04** (CI/CD a11y como deploy gate, não só PR check), **02-02** (a11y fundamentals, POUR + ARIA roots), **03-18** (cognitive a11y, ponte para WCAG 3.0 outcomes equity-focused).

**Anti-patterns**:

1. axe sem `disableRules: ['color-contrast']` em dark/light theme switching, false positives durante transition flicker; rodar contrast em snapshot estático separado.
2. Storybook a11y addon ON mas `test-storybook` não roda em CI, addon mostra UI no dev, gates não existem, regressão silenciosa.
3. WCAG 2.0 only em 2026, UE B2C requer 2.1 mínimo (EAA), gap = fine; 2.2 já é state-of-art em auditorias.
4. Target-size 24x24 ignorado em mobile map markers / swipe carousels, SC 2.5.8 violation, finger tap miss rate sobe.
5. Focus indicator removido com `outline: none` sem replacement, viola SC 2.4.7 + 2.4.13; sempre pair com `:focus-visible` custom style.
6. axe-core rodando só em homepage, 95% das violations vivem em forms/dashboards autenticados; cobrir authenticated routes é mandatory.
7. Confiar 100% em axe (~57% coverage por Deque benchmarks), pular manual SR, focus order semântico e ARIA misuse contextual passam batido.
8. Guidepup VoiceOver tests rodando em toda PR, custo macOS runner 10x estoura budget; reservar para release-candidate ou nightly.
9. WCAG 3.0 draft tratado como compliance target, ainda não-normativo, auditor recusa; usar como design north star, não legal baseline.
10. Accessibility statement / VPAT desatualizado vs build atual, lawsuit discovery usa como evidência de bad faith; regenerar a cada major release com axe + manual report anexos.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Listar 4 princípios POUR e exemplo cada.
- Diferenciar WCAG A / AA / AAA.
- Justificar "primeiro princípio do ARIA: não use ARIA".
- Listar 4 tools automatizados e a layer onde cada roda (lint/unit/e2e/cli).
- Escrever teste jest-axe pra componente.
- Configurar `@axe-core/playwright` em CI.
- Calcular contrast ratio target pra normal/large text.
- Implementar focus trap em modal.
- Distinguir `aria-live polite` vs `assertive`.
- Listar 5 elementos de manual audit que tooling não pega.
- Justificar user testing com PWD.
- Listar 4 stages de CI a11y pipeline.

---

## 4. Desafio de Engenharia

Fazer **a11y audit completo + CI gates** da Logística.

### Especificação

1. **Audit baseline**:
   - axe-core full scan via Pa11y CLI em 5 rotas críticas.
   - Lighthouse score por rota.
   - Manual audit estruturado em checklist (heading order, focus order, keyboard navigation, screen reader test em VoiceOver ou NVDA).
   - Report `A11Y-AUDIT.md` com issues classificados (severity + WCAG criterion).
2. **Lint**:
   - `eslint-plugin-jsx-a11y` configurado em `recommended`.
   - Zero violations no codebase.
3. **Unit tests**:
   - `jest-axe` em ≥ 10 componentes UI principais (Button, Modal, Form, Combobox, Toast, etc.).
4. **E2E tests**:
   - `@axe-core/playwright` em 5 fluxos críticos (login, criar pedido, tracking, perfil, listagem).
5. **Lighthouse CI**:
   - `lhci` configurado em GitHub Actions.
   - Threshold accessibility ≥ 95.
   - Falha PR se cair.
6. **Components patterns**:
   - Implementar/refactor: Modal (focus trap, ARIA correto), Combobox (ARIA APG pattern), Toast (live region), Form com aria-describedby/invalid.
7. **Reduced motion**:
   - `prefers-reduced-motion` respeitado em animations.
8. **Skip link** + landmarks corretos.
9. **Documentação**:
   - `docs/A11Y.md` com:
     - Padrões adotados.
     - Como rodar tests local.
     - Checklist de PR.
     - VPAT-style summary.

### Restrições

- Zero `outline: none` sem replacement.
- Zero `<div onClick>` em vez de `<button>`.
- Color contrast AA mínimo em todo state (default, hover, focus, disabled).
- Lang attribute correto (linha com 02-19).

### Threshold

- 0 issues axe automatized em 5 rotas.
- `jest-axe` cobre 10+ componentes.
- Lighthouse a11y ≥ 95 em todas rotas medidas.
- Audit report identifies remaining manual issues priorizados.
- CI gate ativo bloqueando regressão.

### Stretch

- **Real PWD test** session (1 user) com gravação de feedback.
- **Storybook** com a11y addon ativado pra cada story.
- **VPAT** completo gerado.
- **WCAG 2.2 conformance**: cover novos criteria (target size, focus appearance, dragging).
- **Mobile a11y** (RN) cobertura paralela.
- **Cognitive a11y review**: language clarity, time extension options.

---

## 5. Extensões e Conexões

- Liga com **02-01** (HTML/CSS): semantic HTML é foundation.
- Liga com **02-02** (a11y): este módulo é evolução automation.
- Liga com **02-04** (React): ARIA em components, hooks (useId, useEffect cleanup).
- Liga com **02-05** (Next.js): SSR + a11y, lang attribute.
- Liga com **02-06/02-17** (mobile): native a11y APIs.
- Liga com **02-19** (i18n): lang attribute, RTL, screen reader pronunciation.
- Liga com **03-01** (testing): axe integra em jest, playwright.
- Liga com **03-04** (CI/CD): Lighthouse CI pipeline.
- Liga com **03-09** (frontend perf): bundle size de a11y libs.
- Liga com **04-05** (API design): error responses humanos pra a11y feedback.
- Liga com **04-16** (product): compliance + market expansion.

---

## 6. Referências

- **WCAG 2.1 / 2.2 spec** ([w3.org/TR/WCAG22](https://www.w3.org/TR/WCAG22/)).
- **ARIA Authoring Practices Guide (APG)** ([w3.org/WAI/ARIA/apg](https://www.w3.org/WAI/ARIA/apg/)).
- **WebAIM** ([webaim.org](https://webaim.org/)), guides + Million reports.
- **Deque University**: a11y courses.
- **A11y Project** ([a11yproject.com](https://www.a11yproject.com/)), checklist, posts.
- **"Inclusive Design Patterns"**: Heydon Pickering.
- **"Accessibility for Everyone"**: Laura Kalbag.
- **MDN Accessibility docs**.
- **axe-core docs**.
- **Lighthouse docs**.
- **Smashing Magazine accessibility tag**.
- **Sara Soueidan's blog**: practical a11y posts.
- **Adrian Roselli's blog**: ARIA + patterns deep.
- **Lawsuits database**: ADA Title III lawsuits trends (Seyfarth report).
- **Section 508** (US federal).
