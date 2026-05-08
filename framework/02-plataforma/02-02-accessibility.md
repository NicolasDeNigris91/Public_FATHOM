---
module: 02-02
title: Acessibilidade, ARIA, WCAG, Keyboard, Screen Readers
stage: plataforma
prereqs: [02-01]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
quiz:
  - q: "Qual é a 'regra número 1 do ARIA' segundo o módulo?"
    options:
      - "Sempre adicionar `aria-label` em todos os elementos interativos"
      - "Não usar ARIA; preferir o elemento HTML semântico nativo correto"
      - "Usar `role='button'` em vez de `<button>` para melhor controle"
      - "Aplicar `aria-hidden='true'` em elementos focáveis"
    correct: 1
    explanation: "A regra é: 'No ARIA is better than bad ARIA'. Use o elemento HTML semântico correto; ARIA só preenche buracos quando o HTML não tem o conceito necessário."
  - q: "Em um botão composto apenas por um ícone SVG, qual padrão fornece o accessible name corretamente?"
    options:
      - "`<button><svg aria-label='Excluir'>...</svg></button>`"
      - "`<button title='Excluir'><svg>...</svg></button>`"
      - "`<button aria-label='Excluir pedido'><svg aria-hidden='true'>...</svg></button>`"
      - "`<div role='button' onclick='...'>...</div>`"
    correct: 2
    explanation: "`aria-label` no botão fornece o nome acessível e `aria-hidden='true'` no SVG impede que o screen reader leia conteúdo duplicado ou ruído visual do ícone."
  - q: "Qual a diferença correta entre `aria-live='polite'` e `aria-live='assertive'`?"
    options:
      - "`polite` anuncia quando o screen reader está idle; `assertive` interrompe a leitura corrente"
      - "`polite` funciona só em mobile; `assertive` só em desktop"
      - "`polite` lê apenas o diff; `assertive` lê tudo"
      - "Não há diferença prática entre os dois"
    correct: 0
    explanation: "`polite` espera o screen reader ficar idle antes de anunciar, enquanto `assertive` interrompe a leitura. Use `assertive` apenas para informações críticas (ex: erros de submit)."
  - q: "Por que `:focus-visible` é geralmente preferível a `:focus` para estilizar foco?"
    options:
      - "`:focus-visible` tem melhor performance"
      - "`:focus-visible` mostra o ring apenas em navegação por teclado, evitando o ring indesejado em cliques"
      - "`:focus-visible` é o único suportado em browsers modernos"
      - "`:focus-visible` aceita pseudo-elementos, `:focus` não"
    correct: 1
    explanation: "`:focus-visible` aplica o estilo apenas quando o foco vem por teclado (heurística do browser), evitando o anel ao clicar com mouse, resolvendo a tensão antiga entre acessibilidade e estética."
  - q: "Após fechar um modal, qual é o comportamento correto de focus management?"
    options:
      - "Mover o foco para o `<body>`"
      - "Deixar o foco onde o browser decidir colocar"
      - "Restaurar o foco para o elemento que originalmente disparou a abertura do modal"
      - "Mover o foco para o primeiro elemento focável da página"
    correct: 2
    explanation: "Após fechar um modal, o foco deve voltar ao trigger original, permitindo que o usuário continue de onde estava. Sem isso, usuários de teclado e screen reader ficam perdidos no DOM."
---

# 02-02, Acessibilidade

## 1. Problema de Engenharia

Acessibilidade não é "disclaimer pra evitar processo". É uma das métricas mais honestas da qualidade do seu frontend. Site acessível trabalha bem em screen reader, em teclado puro, em telas pequenas, em alto contraste, com `prefers-reduced-motion`, em conexões lentas. Site não-acessível geralmente também é bug-rico em outras dimensões.

Em mercados maduros (US, EU), a11y vira **risco legal**: ADA, EAA (European Accessibility Act, vigente desde 2025) tornam acessibilidade obrigatória pra muitas categorias de produto. Empresas que vendem nessas regiões já têm process de a11y review na pipeline.

Apesar disso, a maioria dos devs aprendeu a11y como "adiciona aria-label que tá bom". Esse hábito produz UI que parece OK na auditoria automática mas é inutilizável com NVDA ou VoiceOver. A diferença entre os dois é o que separa este módulo do tutorial qualquer.

---

## 2. Teoria Hard

### 2.1 O que é acessibilidade computacionalmente

Browsers expõem dois objetos paralelos pra cada página:

- **DOM**: estrutura visual/JS que você programa.
- **Accessibility tree**: estrutura derivada do DOM, exposta via APIs do SO (UIA no Windows, AX no macOS, ATK no Linux).

Tecnologias assistivas (screen readers como **NVDA**, **JAWS**, **VoiceOver**, **TalkBack**) leem da accessibility tree, não do DOM. Quando você escreve `<div onClick>`, o accessibility tree não vê um botão, vê um elemento genérico. Daí a mãe das melhores práticas: **use elemento semântico nativo**, ele já entra no a11y tree corretamente.

DevTools de qualquer browser moderno tem aba "Accessibility" que mostra a tree pro elemento selecionado. Use isso como código fonte verdadeiro.

### 2.2 WCAG, Web Content Accessibility Guidelines

WCAG 2.2 (atual, dezembro 2023) é o padrão mais aceito. Organiza em 4 princípios, **POUR**:

- **Perceivable**: o conteúdo deve poder ser percebido (texto alternativo em imagens, captions em vídeo, contraste suficiente).
- **Operable**: o controle deve poder ser operado (teclado funciona, sem armadilhas de foco, tempo suficiente, sem flashes que disparem epilepsia).
- **Understandable**: o conteúdo deve ser compreensível (linguagem clara, comportamentos previsíveis, mensagens de erro úteis).
- **Robust**: o conteúdo deve sobreviver a tecnologias variadas (markup válido, semântica correta).

Cada critério tem 3 níveis: **A** (mínimo), **AA** (alvo realista, exigido pela maioria das leis), **AAA** (raro, ideal). Mire **AA** por default, exceções com justificativa.

Você não precisa decorar os 50+ critérios. Conhecer os 10-15 mais importantes (contraste 4.5:1, target size, focus visible, name/role/value, alt text, captions, page title, lang attribute, error identification, reflow) cobre 80% dos problemas reais.

### 2.3 ARIA, quando você precisa, quando não precisa

**Regra número 1 do ARIA**: não use ARIA. Use o elemento HTML correto. ARIA é a ferramenta pra preencher buracos quando HTML não tem o conceito que você precisa.

ARIA tem três conceitos:
- **role**: o tipo de coisa que o elemento é (`button`, `dialog`, `navigation`, `tab`, `tabpanel`).
- **state**: estado dinâmico (`aria-expanded="true"`, `aria-checked="false"`, `aria-busy`, `aria-current`).
- **property**: característica relativamente estática (`aria-label`, `aria-labelledby`, `aria-describedby`, `aria-controls`, `aria-haspopup`).

**Patterns oficiais** estão em [APG (ARIA Authoring Practices Guide)](https://www.w3.org/WAI/ARIA/apg/), combobox, tabs, menu, tree, dialog modal, etc. Cada pattern tem o mínimo de roles + states + keyboard interactions.

Erros clássicos:
- `aria-label="Click here"` em `<button>`, redundante, elemento já tem accessible name pelo conteúdo.
- `role="button"` em `<a href>`, quebra navegação. Use `<button>` ou ajuste.
- `aria-hidden="true"` em elemento com `tabindex="0"`, usuário pode focar mas screen reader não anuncia. Loop confuso.
- `aria-live` mal usado: leitor anuncia em momento errado, ou não anuncia.

### 2.4 Accessible name

Todo controle (button, link, input, etc.) precisa de **accessible name**: o que screen reader anuncia. A computação segue uma cadeia ([accname spec](https://www.w3.org/TR/accname-1.2/)):

1. `aria-labelledby` → texto dos elementos referenciados.
2. `aria-label` → texto explícito.
3. Conteúdo do elemento (texto interno).
4. `<label for="...">` (em inputs).
5. `title` attribute (último recurso, ruim em mobile).
6. Fallback do tipo de elemento.

Quando você compõe um botão com ícone só:
```html
<button aria-label="Excluir pedido">
  <svg aria-hidden="true">...</svg>
</button>
```
`aria-hidden` no SVG impede que o screen reader leia o conteúdo do SVG e duplique. `aria-label` no button dá o nome.

### 2.5 Keyboard

Todo controle interativo deve funcionar com teclado:
- **Tab/Shift+Tab**: move foco.
- **Enter/Space**: ativa botões/links.
- **Arrow keys**: navega dentro de composite widgets (radio group, tabs, menu).
- **Esc**: fecha modal, cancela ação.
- **Home/End/PageUp/PageDown**: navegação rápida em listas longas, tabelas.

`tabindex="0"` adiciona ao tab order natural. `tabindex="-1"` remove do tab order mas mantém focusável programaticamente (pra mover foco via JS). Evite `tabindex` positivo (1, 2...), quebra ordem natural.

**Focus management**:
- Modal abre → mover foco pra dentro (geralmente pro botão de fechar ou primeiro input).
- Modal fecha → mover foco de volta pro elemento que disparou.
- Após delete em lista → mover foco pro próximo item ou pro botão de fechar dialog.
- Após submit com erros → mover foco pro primeiro campo com erro, ou pro summary de erros.

**Focus trap** em modal: Tab dentro do modal não escapa. Implementa-se interceptando keydown no boundary e redirecionando.

**Focus visible**: nunca remova outline sem substituir. `:focus-visible` (vs `:focus`) só mostra ring quando navegação é por teclado, não em click, resolve a guerra antiga.

### 2.6 Contraste e cores

WCAG AA exige:
- **4.5:1** pra texto normal (< 18.66px regular ou < 24px regular).
- **3:1** pra texto grande.
- **3:1** pra elementos não-textuais (ícones, bordas de input, focus ring).

Use `oklch()` ou ferramentas como [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/), Stark plugin no Figma. Lighthouse e axe checam automaticamente.

Não use **só** cor pra transmitir informação. Estado de erro precisa ter ícone, mensagem, ou borda, não só "input vermelho". Daltonismo afeta ~8% dos homens.

### 2.7 Screen reader na prática

Você não vai escrever a11y bom sem usar screen reader. Pelo menos uma vez. Recomendação:

- **Mac**: VoiceOver (Cmd+F5). Comando básico, VO+arrows pra navegar, VO+Space pra ativar. VO = Ctrl+Option.
- **Windows**: NVDA (gratuito, [nvaccess.org](https://www.nvaccess.org/)). Comando, Insert+arrows.
- **Mobile**: TalkBack (Android) ou VoiceOver (iOS). Use por 10 minutos só pra ver como é diferente.

Faça um exercício: navegue o seu site com olhos fechados e screen reader ligado. Os primeiros minutos são desorientadores; após 1h você nota tudo o que está errado em qualquer site.

### 2.8 Live regions e dynamic content

UI moderna muda dinamicamente, toast notifications, validações inline, updates parciais. Screen reader não percebe automaticamente. Use **live regions**:

```html
<div role="status" aria-live="polite">{message}</div>
```

- `aria-live="polite"`: anuncia quando idle. Use por default.
- `aria-live="assertive"`: interrompe. Use só pra coisas críticas (erro de submit).
- `role="status"` ou `role="alert"`: shorthand semântico.

Cuidado: live region precisa existir no DOM **antes** do conteúdo ser inserido. Senão screen readers não detectam a mudança.

### 2.9 Forms acessíveis

Forms são onde a11y mais aparece em apps reais. Boas práticas:

- Sempre `<label for="...">` ou `<label>` envolvendo o input.
- Erros de validação: `aria-invalid="true"` no campo + `aria-describedby` apontando pra mensagem de erro.
- Required: `required` HTML attribute (browser valida + screen reader anuncia).
- Inputs específicos: `type="email"`, `type="tel"`, `type="url"`, `inputmode="numeric"`, teclado mobile correto, validação básica.
- Autocomplete: `autocomplete="email"`, `"new-password"`, `"name"`, `"shipping-postal-code"`, browser preenche, password manager funciona.
- Erros: prefira inline próximo do campo + summary no topo do form pra facilitar review.

### 2.10 Padrões frequentes (resumo de APG)

- **Modal dialog**: `role="dialog"` + `aria-modal="true"` + `aria-labelledby` no título + focus trap + Esc fecha + foco volta.
- **Tabs**: `role="tablist"` no container, `role="tab"` + `aria-selected` + `aria-controls` em cada tab, `role="tabpanel"` + `aria-labelledby` no painel. Arrow keys movem entre tabs.
- **Combobox** (autocomplete): pattern complexo, `role="combobox"`, `aria-expanded`, `aria-controls` apontando pra `role="listbox"`, `aria-activedescendant` pra opção destacada. Vale ler APG inteiro pra esse.
- **Toast/notification**: `role="status"` ou `role="alert"`. Não use `role="alertdialog"`, esse é dialog que requer ação.
- **Toggle switch**: `<button role="switch" aria-checked="true">` ou input checkbox estilizado, ambos funcionam, semântica clara.
- **Skip link**: primeiro elemento focável, `<a href="#main">Skip to content</a>`. Visível ao receber foco. Padrão obrigatório em sites com navegação extensa.

### 2.11 Reduced motion, color schemes

Respeite preferências do usuário:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

`prefers-color-scheme: dark` pra dark mode automático. `prefers-contrast: more` pra modos de alto contraste.

### 2.12 Testando a11y

Camadas:
- **Lint estático**: ESLint plugin `eslint-plugin-jsx-a11y` no React. Pega 30% dos erros sem rodar nada.
- **Teste automatizado em runtime**: `axe-core` (via `@axe-core/playwright` ou `vitest-axe`). Roda em CI. Pega ~50% dos issues automaticamente detectáveis.
- **Manual com screen reader**: 50% restante exige humano. Inclui flow de tarefas reais (preencher form, navegar, etc.).
- **Audit profissional**: pra produtos sérios, contrate auditoria com WCAG specialists.

Lighthouse a11y score é util mas mente, score 100 não significa "site acessível", significa "passou checks automáticos". Combine com manual. 03-17 cobre testing automation profundamente.

### 2.13 WCAG 2.2, novos critérios (2023)

WCAG 2.2 adicionou 9 success criteria sobre 2.1. Os mais impactantes pra eng frontend:

- **2.4.11 Focus Not Obscured (Minimum)** AA: focus indicator não pode ser totalmente coberto por outros elementos (sticky header, modal, tooltip).
- **2.4.12 Focus Not Obscured (Enhanced)** AAA: focus 100% visível.
- **2.4.13 Focus Appearance** AAA: indicador de foco com ratio 3:1 contra background, ≥ 2px solid.
- **2.5.7 Dragging Movements** AA: toda ação dragável tem alternative single-pointer (botão, click). Trello-style boards precisam alternativa.
- **2.5.8 Target Size (Minimum)** AA: touch targets ≥ 24x24 CSS pixels (exceções: inline link, native).
- **3.2.6 Consistent Help** A: se há help, posição consistente em todas páginas.
- **3.3.7 Redundant Entry** A: não pedir info já dada (ex: address durante checkout não pede de novo se já no profile).
- **3.3.8 Accessible Authentication (Minimum)** AA: login não exige cognitive function (memorizar password, captcha cognitivo). Aceite passkey, magic link, OAuth, password manager autocomplete.
- **3.3.9 Accessible Authentication (Enhanced)** AAA: nem mesmo identifying objects (CAPTCHA "click on cars") sem alternative.

Implementations típicas:
- Focus appearance: garantir `outline: 2px solid` + offset visível.
- Drag: pair com botão "move up/down" alternative.
- Target size: padding 4-8px em links inline; min 24x24 em buttons standalone.
- Authentication: passkeys (FIDO2), suporte a password managers via `autocomplete="current-password"`.

### 2.14 ARIA Authoring Practices Guide (APG), patterns canônicos

ARIA APG ([w3.org/WAI/ARIA/apg](https://www.w3.org/WAI/ARIA/apg/)) define implementation oficial de cada widget complexo. Padrões essenciais a memorizar:

**Modal Dialog**:
```html
<div role="dialog" aria-modal="true" aria-labelledby="title">
  <h2 id="title">...</h2>
  ...
</div>
```
- Focus enter no primeiro elemento focusável ao abrir.
- Focus trap dentro (Tab cicla; Shift+Tab também).
- ESC fecha.
- Restore focus ao trigger ao fechar.

**Combobox (autocomplete)**:
```html
<input role="combobox" aria-expanded="false" aria-controls="listbox-1" aria-autocomplete="list" />
<ul id="listbox-1" role="listbox">
  <li role="option" aria-selected="false">Opção</li>
</ul>
```
- Arrow Up/Down navegam options.
- Enter seleciona.
- ESC fecha listbox.
- aria-activedescendant em vez de mover foco real.

**Disclosure (accordion)**:
```html
<button aria-expanded="false" aria-controls="panel-1">Toggle</button>
<div id="panel-1" hidden>...</div>
```

**Tabs**:
```html
<div role="tablist">
  <button role="tab" aria-selected="true" aria-controls="panel-1">Tab 1</button>
</div>
<div id="panel-1" role="tabpanel">...</div>
```
- Arrow Left/Right move entre tabs.
- Tab move pra panel.

**Tree** (árvore expansível): role="tree", "treeitem", aria-expanded, aria-level.

**Grid** (data grid): role="grid", "row", "gridcell". Arrow keys navegam células 2D. Enter ativa.

APG tem ~30 patterns. Bibliotecas (Radix, Headless UI, React Aria) implementam corretamente. **Não reinvente**.

### 2.15 Manual audit checklist estruturada

Tooling pega ~30-40%. Manual cobre o resto. Checklist prática:

**Heading hierarchy**:
- 1 `<h1>` por página.
- Sem skip de level (h2 → h4 sem h3).
- Cada section landmark começa com heading.

**Landmarks**:
- `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`, exatamente um `<main>`.
- `aria-label` em landmarks duplicados ("breadcrumbs nav" + "primary nav").

**Tab order**:
- Tab segue order visual lógico.
- Sem `tabindex` positivo (anti-pattern).
- Skip link no início.

**Focus management**:
- Focus visível em todo elemento focusable.
- Restore focus após fechar modal/menu.
- Sem perda de focus em route change (announce + reset).

**Images / media**:
- Alt descritivo (não "image"); decorative = `alt=""`.
- Vídeo com captions; áudio com transcript.
- Sem auto-play sem control.

**Color**:
- Nunca color como único sinal (combine com ícone, texto, padrão).
- Contrast ratio testado em todos states.

**Forms**:
- Label associado.
- Error message em aria-describedby.
- aria-invalid em inválidos.
- Submit feedback em live region.

**Reading order**:
- DOM order = visual order. CSS `order` em flex/grid quebra screen reader.

**Keyboard-only test**: navegue site inteiro só com teclado. Falha = bug.

**Screen reader test**: VoiceOver (Cmd+F5 macOS) ou NVDA (Windows free). Tente fluxo crítico.

### 2.16 Regional disabilities, Brasil context

Brasil:
- ~17.3M pessoas com alguma deficiência (IBGE 2020).
- Lei Brasileira de Inclusão (LBI, 2015) exige acessibilidade em sites.
- Lei nº 14.626/2023 (eAcessibilidade): empresas com SAC obrigadas a sites acessíveis.
- Selo "Acessibilidade Digital" gov.br.
- Padrão eMAG (Modelo de Acessibilidade em Governo Eletrônico), derivado WCAG 2.0/2.1.

Português requer:
- Stemmer pt-BR pra search.
- Atributo `lang="pt-BR"` correto pra screen reader pronunciation.
- Forms com CPF, CEP, telefone, máscaras + descrição clara.

LIBRAS (Língua Brasileira de Sinais) é língua oficial. Para conteúdo videos sérios, intérprete em vídeo opcional ou alternativa textual completa.

### 2.17 ARIA patterns aplicados + screen reader testing + automated CI a11y

A11y "esquecido" exclui 15-20% dos users (WHO disability stats), gera risco legal (Lei Brasileira de Inclusão + WCAG ADA US) e perda de revenue documentada (Click-Away Pound Report 2024 estima £17.1bn em UK só por sites inacessíveis). Esta seção entrega 5 ARIA patterns canônicos com código React, screen reader testing workflow real (NVDA/JAWS/VoiceOver), automated CI a11y pra prevent regression, e decision tree de "quando nativo vs quando ARIA".

**First rule of ARIA — não use ARIA**:

- Sempre prefira HTML semântico nativo: `<button>` em vez de `<div role="button">`. Native cobre focus, keyboard, screen reader, browser quirks — tudo de graça.
- ARIA só pra widgets que HTML não cobre nativamente: tabs, menu, dialog, combobox, slider, accordion, treeview.
- MDN: "No ARIA is better than bad ARIA". Atributo errado é pior que ausência de atributo — SR anuncia coisas falsas e quebra expectativa do user.

**Pattern 1 — Modal dialog (focus trap + ARIA)**:

```tsx
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export function Modal({ isOpen, onClose, title, children }) {
  const ref = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    lastFocus.current = document.activeElement as HTMLElement;
    const focusable = ref.current!.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') trapFocus(e, ref.current!);
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      lastFocus.current?.focus();   // restore focus
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={ref}>
      <h2 id="modal-title">{title}</h2>
      {children}
      <button onClick={onClose} aria-label="Fechar diálogo">×</button>
    </div>,
    document.body
  );
}
```

- **`role="dialog"` + `aria-modal="true"`**: SR anuncia "diálogo".
- **`aria-labelledby`**: associa título; SR lê ao abrir.
- **Focus trap**: tab cycle dentro do modal; sem isso, user cai no background invisível.
- **Restore focus**: após close, devolve foco pro trigger original.

**Pattern 2 — Combobox (autocomplete)**:

```tsx
<div role="combobox" aria-expanded={isOpen} aria-controls="listbox-id" aria-haspopup="listbox">
  <input
    type="text"
    aria-autocomplete="list"
    aria-activedescendant={activeId}
    value={query}
    onChange={...}
  />
  {isOpen && (
    <ul id="listbox-id" role="listbox">
      {options.map((opt, i) => (
        <li
          key={opt.id}
          id={`option-${opt.id}`}
          role="option"
          aria-selected={i === activeIndex}
        >
          {opt.label}
        </li>
      ))}
    </ul>
  )}
</div>
```

- **`aria-activedescendant`**: foco "virtual" — input mantém DOM focus, SR anuncia option ativa.
- **WAI-ARIA APG combobox pattern 1.2**: spec exata; APG fornece reference implementation testada.
- Em 2026: prefira `<datalist>` se UX permite (HTML nativo, zero ARIA).

**Pattern 3 — Live region (notificação dinâmica)**:

```tsx
// Status messages após Server Action
<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
  {message}
</div>

// Erros críticos
<div role="alert" aria-live="assertive">
  {error}
</div>
```

- **`aria-live="polite"`**: SR anuncia quando idle (não interrompe leitura corrente).
- **`aria-live="assertive"` ou `role="alert"`**: interrompe SR — só pra critical (validation error, action failed).
- **`aria-atomic="true"`**: SR lê região INTEIRA quando muda (vs só diff).
- **Pegadinha React**: live region precisa estar no DOM ANTES de receber content. Render initially empty, depois update.

**Pattern 4 — Disclosure (accordion)**:

```tsx
<button
  aria-expanded={isOpen}
  aria-controls="panel-id"
  onClick={() => setIsOpen(!isOpen)}
>
  {title}
</button>
<div id="panel-id" hidden={!isOpen}>
  {content}
</div>
```

- **`aria-expanded`**: SR anuncia estado.
- **`hidden`**: HTML nativo — better que `display: none` via CSS porque inacessível tabbing.
- **Native `<details>/<summary>`**: alternativa nativa cobre 80% dos casos; use antes de reinventar.

**Pattern 5 — Tabs**:

```tsx
<div role="tablist" aria-label="Seções da conta">
  {tabs.map((tab, i) => (
    <button
      key={tab.id}
      role="tab"
      id={`tab-${tab.id}`}
      aria-selected={activeTab === tab.id}
      aria-controls={`panel-${tab.id}`}
      tabIndex={activeTab === tab.id ? 0 : -1}
      onClick={() => setActiveTab(tab.id)}
    >
      {tab.label}
    </button>
  ))}
</div>
{tabs.map(tab => (
  <div
    key={tab.id}
    role="tabpanel"
    id={`panel-${tab.id}`}
    aria-labelledby={`tab-${tab.id}`}
    hidden={activeTab !== tab.id}
  >
    {tab.content}
  </div>
))}
```

- **`tabIndex={-1}` em tabs inativas**: arrow keys navegam entre tabs (não Tab); Tab vai pro content.
- **APG tabs pattern**: Home/End/Arrow keys também esperados.

**Screen reader testing — workflow real**:

```
Setup:
  - macOS: VoiceOver (built-in, Cmd+F5).
  - Windows: NVDA (free, github.com/nvaccess/nvda) ou JAWS (paid, more market share enterprise).
  - Mobile: VoiceOver (iOS), TalkBack (Android).

Workflow per feature:
  1. Cego: navegue só com keyboard (sem mouse).
  2. SR ON, monitor off: complete fluxo principal só ouvindo.
  3. Verifique:
     - Heading structure (H1 → H2 → H3 sem skip).
     - Form labels associados (htmlFor + id).
     - Error messages anunciados.
     - Modal: focus entra, tab trap, escape close, restore focus.
     - Live regions: anúncios em mudanças assíncronas.

Cadência: smoke test antes de cada release; full regression a cada quarter.
```

**Automated CI a11y — catch regressions**:

```typescript
// playwright a11y test
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage has no critical violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  expect(results.violations.filter(v => v.impact === 'critical')).toEqual([]);
});

test('order flow accessible', async ({ page }) => {
  await page.goto('/orders/new');
  await page.fill('[name=courier]', 'João');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toMatchSnapshot('orders-violations.txt');
});
```

- **axe-core**: cobre ~57% dos WCAG (não tudo é automatable). Manual testing OBRIGATÓRIO pro resto.
- **Lighthouse a11y score**: similar coverage; usa axe-core under the hood.
- **Storybook a11y addon**: testa cada component isoladamente em dev.
- **CI gate**: PR que adiciona violations critical → block merge.

**Logística — checklist a11y por feature**:

```
[ ] Skip links pra main content.
[ ] Heading structure validate (1 H1 per page; sem skip).
[ ] Form inputs com <label> associado (htmlFor + id).
[ ] Color contrast > 4.5:1 (WCAG AA) — automated via axe.
[ ] Focus indicator visível (não outline:none sem replace).
[ ] Keyboard navigation cobertura: tudo clickable acessível via Tab.
[ ] Modals: focus trap + escape + restore focus.
[ ] Live regions pra Server Action result + form errors.
[ ] Lang attribute em <html lang="pt-BR">.
[ ] Images: alt text descritivo (vazio se decorativo).
[ ] Buttons vs Links: <button> pra ação, <a> pra navegação.
[ ] Mobile: touch target > 44×44px (WCAG 2.5.5 AAA).
```

**Anti-patterns observados**:

- **`<div onClick>` em vez de `<button>`**: sem keyboard, sem SR semântica.
- **`outline: none` sem replacement**: keyboard users perdem focus indicator.
- **`aria-label` em texto visível**: contradição; SR lê aria-label, ignora texto.
- **Modal sem focus trap**: tab cai background; user perdido.
- **Live region rendered after content**: SR não anuncia primeira atualização.
- **`role="button"` em `<a>`**: contradição; use button OR link de navegação.
- **Skip link invisível**: precisa visível em focus pra keyboard users.
- **Auto-play video com som**: viola WCAG 1.4.2; user não controla.
- **Color como única indicação**: red error sem ícone/texto = invisível pra colorblind.
- **Form com placeholder mas sem label**: placeholder some quando user digita; SR pode não anunciar.

Cruza com **02-02 §2.13** (WCAG 2.2 critérios), **02-02 §2.14** (APG patterns), **02-02 §2.15** (manual audit), **02-04 §2.x** (React component design influencia a11y), **03-01 §2.x** (a11y tests em CI).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Explicar o que é o accessibility tree e como ele se relaciona com o DOM.
- Listar os 4 princípios POUR e dar 1 critério de cada.
- Aplicar a "regra 1" do ARIA com 3 exemplos concretos.
- Demonstrar a cadeia de cálculo de **accessible name**.
- Implementar **focus management** em um modal: abre/fecha + foco volta + trap.
- Diferenciar `aria-live="polite"` vs `"assertive"` com casos.
- Implementar combobox autocomplete seguindo APG.
- Citar 5 atributos `autocomplete` e por que browser/password manager dependem deles.
- Distinguir `:focus` de `:focus-visible`.
- Construir form com erros agregados + foco no primeiro inválido.

---

## 4. Desafio de Engenharia

Pegue o **dashboard de logística** do 02-01 e leve a a11y a **AA real**.

### Especificação

1. Auditoria inicial:
   - Lighthouse a11y score (provavelmente ~70-90 com Tailwind/HTML semântico).
   - axe-core via Playwright em todas páginas.
   - Manual: navegue inteiro com VoiceOver/NVDA + só teclado. Anote problemas.

2. Refactor:
   - Toda interação tem **roles + states + keyboard support** corretos.
   - **Modal de detalhe de pedido** com focus trap, Esc fecha, foco volta.
   - **Tabela de pedidos** funcional com teclado: Home/End vai pra primeira/última row, ações via Enter/Space.
   - **Combobox de busca** com autocomplete, pattern APG.
   - **Toast notifications** anunciam via live region.
   - **Todos os ícones** com ou sem rótulo conforme apropriado (decorativo `aria-hidden`, funcional `aria-label`).
   - **Skip link** no topo.
   - Cores em **AA contrast** garantidas (use ferramenta).

3. Testes:
   - axe-core em CI: zero violações em todas as páginas.
   - Teste de screen reader: registre vídeo curto navegando uma tarefa (criar pedido) com VoiceOver/NVDA. Compare com versão pré-refactor.

### Threshold

- Lighthouse 100 a11y em todas as páginas.
- axe zero violations.
- Tarefa "criar pedido" completável **só com teclado**, em <30 segundos.
- Tarefa "criar pedido" completável **com screen reader** (registre vídeo curto pra demonstrar).
- README cobre:
  - Lista de violações encontradas e como cada uma foi corrigida.
  - Padrões reusáveis criados (modal, combobox, etc.) com referência ao APG.
  - Limitações conhecidas e justificativas.

### Stretch

- Implementar **Korean/Japanese IME-friendly form** se quiser mergulhar mais (composições de input em CJK quebram lógica naïve de validação em tempo real).
- Tabela com **sorting** e **column resize** acessíveis.
- **High contrast mode** dedicado (não confiar só em `prefers-contrast`).

---

## 5. Extensões e Conexões

- Liga com **02-01**: HTML semântico é a base. Sem ele, a11y vira ARIA gambiarra.
- Liga com **02-04** (React): Headless UI libs (Radix UI, React Aria, Headless UI da Tailwind) implementam a maior parte dos APG patterns testados. Use elas em vez de reinventar.
- Liga com **02-05** (Next.js): SSR ajuda a11y porque conteúdo crítico está no HTML inicial, screen reader não espera JS.
- Liga com **03-09** (perf): tempo de hydration impacta acessibilidade real (controle não responde até hidratar).
- Liga com **02-03** (DOM/APIs): `IntersectionObserver` pra revelar conteúdo on-scroll precisa pensar em screen reader (announcing dynamic).

### Ferramentas

- **axe DevTools** (extensão de browser, gratuito).
- **WAVE** (WebAIM, extensão).
- **Lighthouse**, **Pa11y CLI**.
- **Stark** (Figma plugin).
- **NVDA** (Windows, free).
- **VoiceOver** (Mac/iOS, nativo).

---

## 6. Referências

- **ARIA Authoring Practices Guide (APG)**: [w3.org/WAI/ARIA/apg](https://www.w3.org/WAI/ARIA/apg/). Patterns canônicos.
- **WAI ARIA Spec**: autoritative.
- **Inclusive Components** (Heydon Pickering), patterns componente por componente.
- **Inclusive Design Patterns** (Heydon), abordagem mais ampla.
- **Accessibility for Everyone** (Laura Kalbag).
- **A11y Project** ([a11yproject.com](https://www.a11yproject.com/)), checklist + community resources.
- **Adrian Roselli's blog** ([adrianroselli.com](https://adrianroselli.com/)), análises técnicas excelentes.
- **WebAIM** ([webaim.org](https://webaim.org/)), referência de longa data, especialmente sobre screen reader survey anual.
- **Sara Soueidan's blog** ([sarasoueidan.com](https://www.sarasoueidan.com/blog/)), implementações detalhadas.
