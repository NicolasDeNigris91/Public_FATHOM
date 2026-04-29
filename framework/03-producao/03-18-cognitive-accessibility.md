---
module: 03-18
title: Cognitive Accessibility — Plain Language, Reading Load, Memory, Attention, Time
stage: producao
prereqs: [02-02, 03-17]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 03-18 — Cognitive Accessibility

## 1. Problema de Engenharia

A11y técnica (02-02) e testing (03-17) cobrem cegueira, baixa visão, surdez, mobilidade reduzida. Mas há um espectro maior — **disabilities cognitivas**: dyslexia, ADHD, autism, anxiety, low literacy, working memory limitations, post-trauma fog. WHO estima 15-20% da população tem alguma diferença cognitiva relevante. WCAG 2.1 cobre superficialmente; WCAG 2.2 expande; WCAG 3 (draft) será central.

Engineering ignora porque é difícil testar com tooling. Não há `axe-cognitive`. Métricas são qualitativas: leitura clara, instruções compreensíveis, time limits razoáveis, error messages humanos, redundância de canais. Mas o impacto é massivo: usuário com ADHD que abandona checkout porque tela bagunçada custa revenue real; pessoa com dyslexia que falha em entender política de cancelamento gera churn + ticket de suporte; idoso que se confunde com microcopy enviesado vira reclamação de mídia.

Este módulo é **a11y cognitiva como prática**. Plain language, reading complexity, working memory load, attention budget, time tolerance, error recovery, distraction reduction, redundant signals, neurodivergent UX. Plus testing methods (cohort interviews, content scoring) que substituem o axe-engine.

A11y cognitiva também é **leverage de produto**. Plain copy ranks melhor em SEO, reduce support load, melhora conversão pra **todos** os usuários (efeito curb-cut: rampas de acessibilidade ajudam carrinho de bebê, mala, idoso). É win-win se feito direito.

---

## 2. Teoria Hard

### 2.1 WCAG cognitive: o que está coberto vs gap

WCAG 2.1 / 2.2 cognitive criteria (não-exaustivo):
- 2.2.1 **Timing Adjustable**: user pode estender ou desabilitar.
- 2.2.6 **Timeouts** (2.2): aviso antes de timeout que perde dados.
- 3.1.5 **Reading Level**: AAA pede equivalent de 9º ano.
- 3.2.4 **Consistent Identification**: components iguais funcionam iguais.
- 3.3.5 **Help**: contextual help disponível.
- 3.3.7 **Redundant Entry** (2.2): não pedir info já dada.
- 3.3.8 **Accessible Authentication** (2.2): não exigir cognitive function pra login.

Maioria é AAA (mais raro de cumprir). Gap: nenhum criterio fala de attention, distraction, reading load, neurodivergence específica.

WCAG 3 (em draft) terá scoring system com cognitive central.

### 2.2 Espectro de disabilities cognitivas

- **Dyslexia**: dificuldade decoding text; lentidão de leitura; substituições.
- **ADHD**: attention regulation; distração por elementos; hyperfocus em wrong thing.
- **Autism**: literal interpretation, sensory overload em UI agitada, predictability needs.
- **Dyscalculia**: dificuldade com numbers e quantitative reasoning.
- **Aphasia / dysphasia**: dificuldade com language (pós-AVC, Alzheimer).
- **Memory impairments**: short-term, long-term variations.
- **Anxiety**: medo de errar, paralysis.
- **Cognitive fatigue** (post-COVID, MS, fibromyalgia): bandwidth reduzido transitoriamente.
- **Low literacy**: não-disability mas mesma stack de mitigations.

Cada um tem padrões de friction; tools de UI distintos.

### 2.3 Plain language

Princípios (Plain Language Movement, plainlanguage.gov):
- Active voice > passive.
- Short sentences (15-20 words avg).
- Common words; substitua jargon.
- 1 idea per sentence.
- Front-load important info.
- Bullet lists > prose para multi-step.
- Define termos técnicos uma vez.

Métricas de complexity:
- **Flesch Reading Ease**: 0-100, alto = mais fácil.
- **Flesch-Kincaid Grade**: nível escolar.
- **Gunning Fog Index**: idade-estimativa.
- **SMOG**: similar.

Tools: Hemingway Editor, textstat, readability lib JS. Target: 7º-9º ano pra audience geral.

### 2.4 Microcopy intencional

Microcopy (botões, errors, tooltips) é onde cognitive friction concentra:

Anti-pattern:
- "Submit" (vague).
- "An error occurred." (sem ação).
- "Are you sure?" (sem detail).
- "Field required" (qual?).

Pattern:
- "Confirmar pedido" (ação clara).
- "Não conseguimos cobrar seu cartão. Verifique o número e tente de novo." (problema + ação).
- "Apagar este pedido?" + "Sim, apagar" / "Cancelar" (specific + reversibility).
- Inline error em campo: "Email parece incompleto: faltou @" (specific).

UX writing é discipline — alguns times têm role dedicado (Stripe, Shopify).

### 2.5 Working memory budget

Miller's Law (1956): "magic number 7 ± 2" — short-term memory holds ~5-9 items. Modern revision: closer to 4 chunks.

Implicações UI:
- Forms longas dividir em steps (≤ 5 fields per step).
- Wizards com progress indicator.
- Persist em backend partial input (não perder se tab fecha).
- Sumarizar info em momentos de decisão (review screen).
- Não reload mental state em refresh.

Sticky context: breadcrumbs, persistent navigation, "you are here".

### 2.6 Attention e distraction

Patterns que destroem attention:
- Auto-rotating carousels.
- Animações constantes (parallax forte, video bg).
- Pop-ups sem warning.
- Notifications interrompendo flow.
- Multiple simultaneous CTAs.

Mitigations:
- `prefers-reduced-motion` honrado.
- Animation triggers controlados pelo user.
- 1 primary CTA por screen.
- Notifications batching ou opt-in.

ADHD specifically beneficia. Mas todos beneficiam — efeito curb-cut.

### 2.7 Time pressure e timeouts

Pressure causa errors em usuários cognitive:
- Session timeouts curtos sem warning.
- Countdown agressivo (compras flash).
- Multi-factor com codes que expiram em 30s sem clear indication.

Mitigations:
- Warning antes de timeout (1-2 min antes).
- "Stay logged in" simple.
- Scope timeouts ao mínimo necessário (sensitive ops mais curtas; reading mais longas).
- Time extension obvious.

WCAG 2.2.1 / 2.2.6 cobre. Implemente.

### 2.8 Error recovery

Erros cognitivos devastam confidence. Padrões:
- **Specific error message** (campo, motivo, ação).
- **Inline validation** (revele cedo, não em submit).
- **Undo** disponível (delete, send, etc.).
- **Confirmações de ações destrutivas** com clear consequence ("Apagar 12 pedidos. Não pode ser desfeito.").
- **Forgiveness**: permitir input variations ("(11) 99999-9999" vs "11999999999" same).
- **Auto-save** em forms longas.

Anti-pattern: 422 com "Validation failed" sem dizer o quê. Forçar user a iterar guess-and-check.

### 2.9 Predictability e consistency

WCAG 3.2.x:
- Same component looks same em telas diferentes.
- Mesmo botão em mesmo lugar.
- Behavior previsível em interações.
- Sem mudanças automáticas de context (formulário NÃO submeta em blur).
- Sem auto-redirect inesperado.

Autism e cognitive load especifically beneficiam. Surprise = cognitive cost.

### 2.10 Redundância de canais

Don't rely só em color, sound, motion, language. Combine:
- Erros: red + ícone + texto.
- Loading: spinner + "Aguardando..." + atualização de aria-live.
- Sucess: checkmark + cor + texto + announcement.

Pessoa color-blind, com aphasia, com cognitive overload — cada um perde um canal. Redundância protege todos.

### 2.11 Visual design pra cognitive

- **Whitespace generoso**: declutters, libera attention.
- **Visual hierarchy clara**: primário > secundário > tertiário.
- **Contraste**: WCAG AA não basta sempre; AAA helpful pra cognitive fadiga.
- **Sans-serif** e **dyslexia-friendly fonts** (OpenDyslexic, Atkinson Hyperlegible, Comic Sans surprisingly readable).
- **Line spacing ≥ 1.5x**, paragraph spacing ≥ 2x.
- **Line length ≤ 80ch** (66 ideal).
- **Sem all-caps** prolongado (slower reading).
- **Italics sparingly**.

Adaptable: user prefs pra spacing, font, contrast (Reader Mode dos browsers é template).

### 2.12 Numbers e dyscalculia

- Show units (`R$`, `kg`, `min`).
- Format separators ("1.234.567" pt-BR vs "1,234,567" en-US, 02-19).
- Visual proxies (progress bar > "47% complete" alone).
- Approximations OK ("cerca de 5 minutos" vs "5 min").
- Money sempre em currency format, com símbolo.
- Don't force calc na cabeça (mostre subtotal, total, valor poupado).

### 2.13 Memory aids no produto

- **Recently viewed / used** lists.
- **Saved items** persistentes.
- **Drafts auto-save**.
- **History** da conta (orders, sessions).
- **Confirmações por email** com info repetida.
- **Receipt screens** com everything em uma view.
- **Help inline** em vez de docs externos.
- **Glossário** acessível pra termos do produto.

Reduz dependência de memória.

### 2.14 Authentication acessível

WCAG 2.2 SC 3.3.8:
- Don't exigir cognitive funct pra login.
- Sem CAPTCHAs cognitivos sem alternative.
- Suporte a password managers (autocomplete).
- Magic link / passkeys / OAuth como alternative.
- "Forgot password" simple.
- Sem MFA codes que expiram em 30s sem clear path.

Modern: passkeys (FIDO2) + biometric. Inclusive por design.

### 2.15 Testing com humans

Tooling não pega. Métodos:
- **Cohort interviews**: contrate users com diversos cognitive profiles. Compense.
- **Reading-level scoring**: automate via textstat por release.
- **Task-completion time** measure.
- **Heatmaps + scroll-depth**: friction reveals.
- **A/B com cognitive metrics**: completion rate, error rate, time-on-task.
- **Heuristic eval**: NN/g 10 heuristics + cognitive checklist.

Tools: Maze, UserTesting, Userlytics, Lookback.

### 2.16 Content design role

Cognitive a11y precisa **content design** com peso. UX writer / content strategist / content designer. Deque, Stripe, GOV.UK, GOV.BR investem.

Em time pequeno: dev escreve copy, mas itera com PM/content-aware peer review. Estabeleça **voice & tone guide**.

GOV.UK design system docs são exemplares.

### 2.17 Trauma-informed design

Trauma-informed UX (T-iD):
- Safety: clear permissions, no surprise charges.
- Trust: transparent policies.
- Choice: opt-in over opt-out.
- Empowerment: undo, control over data.
- Sensitive content warnings.

Health, financial, legal apps especialmente. Rule: never escalate user state without explicit consent.

### 2.18 Cognitive load nos forms

Form é onde cognitive load concentra. Patterns:
- Inline validation.
- Field labels acima (não dentro placeholder).
- Show password toggle.
- Sane defaults.
- Don't force same data twice.
- Country/state pickers em vez de free text.
- Date format obvio (calendar picker default).
- Phone format mask sutil.

GOV.UK forms são canonical study.

### 2.19 Onboarding cognitive

Primeira experience é onde cognitive overload mata adoption.
- Progressive disclosure: revele complexidade ao longo do tempo.
- Contextual tooltips por feature.
- "Skip" para users experientes.
- Guided tour OPT-IN, dispensable.
- Sample data pra explorar.
- "Reset to defaults" reachable.

Anti-pattern: 7-step modal forçado em primeiro login.

### 2.20 Métricas de produto cognitive-aware

Track:
- Time-on-task em fluxos críticos.
- Error rate per form.
- Help/support contacts per feature.
- Drop-off em wizards.
- Reading level médio do content.
- Frequency de "undo" usado (sinal de bom undo + boundaries claras).

Reduzir friction cognitive frequentemente bate como melhor conversion + lower CAC payback.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Listar 5 categorias de cognitive disability e patterns de friction.
- Aplicar Flesch-Kincaid em texto e ajustar.
- Listar Miller's Law e implicação em form design.
- Listar 4 anti-patterns de attention destruction.
- Justificar redundância de canais com 3 sinais simultâneos.
- Estruturar error recovery (specific message + inline validation + undo).
- Diferenciar trauma-informed design de standard UX.
- Listar 4 acessibilidades em authentication.
- Justificar progressive disclosure em onboarding.
- Identificar quando cognitive a11y bate como ROI cost reduction (support, churn).
- Diferenciar 03-17 (automated) e 03-18 (human-driven cognitive).

---

## 4. Desafio de Engenharia

Refactor da Logística pra **cognitive accessibility**.

### Especificação

1. **Audit de copy**:
   - Score Flesch-Kincaid em cada tela. Target médio ≤ 9th grade.
   - Identifique 20 microcopy items pra reescrever (errors, buttons, modals, empty states).
   - Doc `COPY-AUDIT.md` com before/after.
2. **Forms refactor**:
   - Wizard onboarding lojista dividido em 3-5 steps.
   - Inline validation em todos os fields críticos.
   - Auto-save partial input em backend.
   - Date/phone/CPF com input mask + format error specifc.
3. **Error messages**:
   - Cada error tem: 1) o que falhou, 2) por que, 3) o que fazer.
   - Inline + toast + (se grave) email.
4. **Undo / forgiveness**:
   - Delete order: 5s undo toast antes de commit real.
   - Bulk operations (cancel multiple): confirmação clear + undo.
5. **Redução de attention friction**:
   - 1 primary CTA por screen.
   - `prefers-reduced-motion` honrado em todas anims.
   - Toasts não-disrupive (não cobrem main content).
6. **Time accommodations**:
   - Session timeout warning 2 min antes.
   - "Stay logged in" simples.
   - 2FA/MFA codes com 5 min lifetime + clear countdown.
7. **Memory aids**:
   - "Recently viewed orders" no dashboard.
   - Email confirmation com info repetida.
   - Receipt screen com todos detalhes.
8. **Reading prefs**:
   - Toggle: tamanho de texto, line spacing, dyslexia-friendly font (OpenDyslexic ou Atkinson Hyperlegible).
   - Persist em user prefs.
9. **Testing manual**:
   - 5 testers diversos (1 dyslexia self-id, 1 ADHD, 1 idoso, 1 low literacy, 1 controle).
   - Tarefas: criar pedido, cancelar pedido, encontrar histórico, alterar endereço.
   - Coletar metrics: time, errors, frustration verbalizada.
   - Report `COGNITIVE-A11Y-TEST.md`.

### Restrições

- Sem auto-rotating carousels.
- Sem auto-redirects sem clear consent.
- Toda animation com `prefers-reduced-motion` fallback.
- Time limits documentados; warnings obrigatórios.
- Copy revisada via textstat em CI (warning se grade > 11).

### Threshold

- Audit doc + 20 microcopy items refeitos.
- Form wizard funcional.
- Undo demoado em 3 ações destrutivas.
- 5 user tests realizados, com report.
- Reading prefs functional.

### Stretch

- **Voice control** alternative pra navegação.
- **Reader mode** próprio (ou link a reader integrado de browser).
- **Plain-language toggle**: alternative content em "easy read" pra termos legais (políticas).
- **Cognitive walkthrough** estruturado com PMs e designers.
- **Color-blind simulator** em design system.
- **Stress-test mode**: simular distraction, time pressure pra calibrar.

---

## 5. Extensões e Conexões

- Liga com **02-02** (a11y básica): cognitive complementa visual/motor/auditory.
- Liga com **02-19** (i18n): plain language atravessa idiomas.
- Liga com **03-15** (incident response): erros legíveis em incident communication.
- Liga com **03-17** (a11y testing): automated pega 30-40%; cognitive é o resto.
- Liga com **04-05** (API design): error response humanos consumidos por client copy.
- Liga com **04-16** (product/business): cognitive a11y bate como growth lever (conversion, churn, support load).
- Liga com **CAPSTONE-producao**: integration profunda em v2.

---

## 6. Referências

- **WCAG 2.1 / 2.2 cognitive criteria**.
- **WCAG 3 draft** ([w3.org/TR/wcag-3.0](https://www.w3.org/TR/wcag-3.0/)).
- **plainlanguage.gov** + **GOV.UK design system docs**.
- **"Cognitive Accessibility Roadmap"** — W3C Cognitive Accessibility Task Force.
- **"Don't Make Me Think"** — Steve Krug.
- **"Forms that Work"** — Caroline Jarrett, Gerry Gaffney.
- **"Strategic Writing for UX"** — Torrey Podmajersky.
- **"Inclusive Design Patterns"** — Heydon Pickering (re-leitura cognitive).
- **NN/g (Nielsen Norman Group)** — research articles em cognitive UX.
- **"The Inclusive Design Toolkit"** — Cambridge Engineering Design Centre.
- **Microsoft Inclusive Design Toolkit**.
- **"Accessibility for Cognitive Disabilities"** — Deque University course.
- **Hemingway Editor**, **textstat** lib.
- **"Calm Technology"** — Amber Case.
- **"Trauma-Informed Design"** — Melissa Eggleston.
- **GOV.BR design system** — exemplo brasileiro.
