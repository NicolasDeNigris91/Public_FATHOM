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
