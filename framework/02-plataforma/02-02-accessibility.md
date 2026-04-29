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
