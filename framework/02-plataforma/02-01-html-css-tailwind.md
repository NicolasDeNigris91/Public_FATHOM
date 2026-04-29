---
module: 02-01
title: HTML, CSS e Tailwind — Modelo de Renderização e Linguagem Visual
stage: plataforma
prereqs: []
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 02-01 — HTML, CSS, Tailwind

## 1. Problema de Engenharia

HTML e CSS são tratados como "coisa básica" e por isso quase ninguém entende de verdade. Você cria divs, joga `flex` aqui, `grid` ali, e quando algo quebra você abre DevTools e vai chutando até funcionar. Esse modo de trabalhar não escala — bate o teto rápido em qualquer projeto sério.

A ideia aqui é entender como o browser **realmente renderiza** uma página, e como o CSS resolve um problema profundo: especificar layout responsivo a partir de regras declarativas. Sem esse modelo mental, qualquer bug visual vira tentativa e erro. Com ele, você lê DevTools como código fonte.

Tailwind entra no final como ferramenta — não como religião. A discussão "atomic CSS vs CSS-in-JS vs CSS modules vs vanilla" tem trade-offs reais, e depois deste módulo você consegue argumentar com base em mecanismo, não em preferência estética.

---

## 2. Teoria Hard

### 2.1 O pipeline de renderização do browser

Quando você abre uma página, o browser passa por uma sequência conhecida (varia em detalhe por engine — Blink, WebKit, Gecko — mas o esqueleto é o mesmo):

1. **Parse HTML** → DOM tree.
2. **Parse CSS** → CSSOM tree.
3. **Style** → cada nó do DOM ganha estilos calculados (cascading, herança, especificidade).
4. **Layout (reflow)** → posição e tamanho de cada box.
5. **Paint** → preenche pixels (cores, bordas, sombras, texto).
6. **Composite** → camadas são combinadas (com aceleração GPU em transforms/opacity).

Mudanças que afetam **layout** (mudar `width`, `height`, `top`, posição de elemento) são as mais caras — disparam reflow do subtree. Mudanças que afetam só **paint** (color, background) pulam layout. Mudanças que afetam só **composite** (transform, opacity) pulam paint também — daí a regra de animar com `transform: translateX()` em vez de `left`.

Saber em qual fase cada propriedade entra é o que separa CSS legível de CSS performático. CSS Triggers ([csstriggers.com](https://csstriggers.com/)) tem tabela completa.

### 2.2 HTML semântico — não é só "deixar acessível"

A árvore HTML define a **estrutura** do documento. Tags semânticas existem por motivos concretos:

- **Acessibilidade** (assunto profundo no [02-02](02-02-accessibility.md)): screen readers leem `<nav>`, `<main>`, `<article>`, `<aside>` e oferecem navegação por landmarks. `<button>` é focável e ativável por keyboard; `<div onClick>` não.
- **SEO**: crawlers usam `<h1>`/`<h2>` pra hierarquia, `<article>` pra conteúdo principal.
- **CSS sem class poluition**: você pode estilizar `nav > ul > li` sem precisar de `class="nav-item"`.
- **Comportamento default**: `<form>` faz submit, `<details>` é colapsável, `<dialog>` (HTML5) tem stack de modal nativa.

**Regra prática:** comece pelo elemento mais semanticamente correto, só caia pra `<div>`/`<span>` quando nenhum outro descreve o que você está fazendo.

Detalhes de elementos importantes:
- `<button type="button">` por default em form é `type="submit"` — bug clássico.
- `<a href="...">` é navegação. Se sua "ação" não muda URL, é `<button>`.
- `<input type="...">` tem dezenas de variações com validação nativa, teclado mobile correto, etc.
- `<picture>` + `<source media="...">` permite escolher imagem por viewport.
- `<table>` é pra dados tabulares — não pra layout. Não use `<table>` pra maquetar nada.

### 2.3 Box model

Todo elemento é uma caixa retangular com 4 áreas concêntricas: **content**, **padding**, **border**, **margin**.

Por default (`box-sizing: content-box`), `width` define só o content. Padding e border somam por fora — já te ferrou em algum momento, garantido. Por isso a regra global virou padrão:

```css
*, *::before, *::after { box-sizing: border-box; }
```

Com `border-box`, `width` inclui padding e border. Faz sentido pra 99% dos casos.

**Margin collapsing**: margins verticais adjacentes colapsam (não somam — pegam o maior). Ex: `<p>` com `margin-bottom: 16px` seguido de `<p>` com `margin-top: 24px` produz 24px entre eles, não 40. Isso só vale em **block formatting context normal** — flex/grid/inline-block bloqueiam collapsing. Surpreende quem não sabe.

### 2.4 Display, posicionamento, flow

`display` define o tipo de box do elemento. Os relevantes hoje:
- `block` — toma largura total, quebra linha. `<div>`, `<p>`, `<section>`.
- `inline` — flui no texto. `<span>`, `<a>`, `<em>`. Sem width/height.
- `inline-block` — comporta-se inline mas aceita width/height/padding.
- `flex` — Flexbox container. (ver 2.5)
- `grid` — Grid container. (ver 2.6)
- `none` — remove do layout (inclusive de a11y tree).
- `contents` — elemento "desaparece", filhos sobem 1 nível no layout. Útil em casos específicos.

`position`:
- `static` (default) — flow normal.
- `relative` — flow normal mas oferece referência pra `absolute` filho. Aceita `top/left/etc`.
- `absolute` — sai do flow. Posiciona relativo ao **ancestral positioned** mais próximo.
- `fixed` — sai do flow. Relativo ao viewport (exceto se houver ancestral com `transform`/`filter`/`will-change` — pega esses como containing block, surpresa comum).
- `sticky` — comporta-se como `relative` até cruzar threshold de scroll, aí "gruda" como `fixed`. Need `top/bottom`.

`z-index` só funciona em elemento positioned. Stacking contexts são criados por `transform`, `opacity < 1`, `filter`, `position: fixed/sticky`, etc. Por isso `z-index: 9999` no seu modal não passa por cima de outro elemento — eles estão em stacking contexts diferentes. Esse é provavelmente o bug de CSS mais frustrante e mais comum.

### 2.5 Flexbox — modelo de uma dimensão

Flexbox alinha em **um eixo principal** com flexibilidade de tamanho.

Container:
```css
.container {
  display: flex;
  flex-direction: row | column;       /* eixo principal */
  justify-content: flex-start | center | space-between | space-around | space-evenly;  /* main axis */
  align-items: stretch | flex-start | center | flex-end | baseline;  /* cross axis */
  flex-wrap: nowrap | wrap;
  gap: 16px;
}
```

Item:
```css
.item {
  flex: 1 1 200px;  /* grow shrink basis */
  align-self: ...;
  order: 2;
}
```

`flex: 1` é shorthand pra `1 1 0` — items dividem espaço por igual, ignorando conteúdo. Diferente de `flex: 1 1 auto` (`flex: auto`), que considera conteúdo.

Casos onde flexbox brilha: barras de navegação, listas horizontais com gap consistente, alinhamento vertical (problema histórico de CSS), card layouts simples.

Casos onde flexbox dá pena: layouts de página inteira com áreas nomeadas (header/sidebar/main/footer) — Grid faz melhor.

### 2.6 Grid — modelo de duas dimensões

Grid trabalha em linhas e colunas simultaneamente.

```css
.layout {
  display: grid;
  grid-template-columns: 200px 1fr 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "sidebar header header"
    "sidebar main   aside"
    "sidebar footer footer";
  gap: 16px;
}

.sidebar { grid-area: sidebar; }
.header  { grid-area: header; }
/* etc */
```

`fr` é unidade fracionária do espaço restante. `repeat(12, 1fr)` cria grid de 12 colunas (Bootstrap-style sem Bootstrap). `minmax(200px, 1fr)` evita coluna ficar menor que 200px.

`grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))` — galeria responsiva sem media query. Vale dominar.

Grid e Flexbox não competem — combinam. Layout outer com Grid, componentes internos com Flex.

### 2.7 Cascade, especificidade, herança

**Cascade** é o algoritmo que resolve qual regra aplica quando há conflito. Ordem (do menos pro mais importante):

1. Origin do agent (browser default), user, author (seu CSS).
2. `!important` flips a ordem dentro de cada origin.
3. **Especificidade** (ver abaixo).
4. **Ordem de aparição** (último ganha).

**Especificidade** é uma tupla `(inline, ID, class+attr+pseudo, type)`. Compara da esquerda pra direita. Exemplos:
- `div`: `(0,0,0,1)`
- `.btn`: `(0,0,1,0)`
- `#main`: `(0,1,0,0)`
- `style="..."` (inline): `(1,0,0,0)`
- `.btn.primary:hover`: `(0,0,3,0)`

`!important` é guerra nuclear — vence tudo dentro do mesmo origin. Use raríssimo, normalmente em utility classes (Tailwind faz isso pra `!`-prefixed) ou em overrides defensivos. Em código de domínio é cheiro forte.

**Cascade Layers** (`@layer`) — feature moderna que dá controle explícito de ordem entre conjuntos de regras. Resolve maior parte dos abusos históricos de `!important`.

**Herança**: algumas propriedades passam pra filhos automaticamente (`color`, `font-family`, `line-height`). Outras não (`margin`, `padding`, `border`, `background`). `inherit` força qualquer prop a herdar; `initial` reseta pro default da spec; `unset` é "inherit se herdável, initial se não"; `revert` volta pro origin anterior.

### 2.8 Custom properties (CSS variables)

```css
:root {
  --color-primary: #3b82f6;
  --space-md: 16px;
}
.btn { color: var(--color-primary); padding: var(--space-md); }
```

Variáveis CSS são **dinâmicas** — podem ser sobrescritas em escopos descendentes, e mudadas via JS:
```js
document.documentElement.style.setProperty('--color-primary', '#ef4444');
```

Isso é a fundação dos sistemas de design tokens, dark mode, theme switching.

`@property` (registro tipado, novo) permite definir tipo, valor inicial, e se herda — habilita transições/animations em variáveis (CSS clássico não anima `var()`).

### 2.9 Container queries

Por décadas, "queries" eram só de viewport (`@media (min-width: 768px)`). Container queries permitem responsividade baseada no **container** — finalmente resolve componentes responsivos sem hacks.

```css
.card-container { container-type: inline-size; }

@container (min-width: 400px) {
  .card { display: grid; grid-template-columns: 1fr 2fr; }
}
```

Funciona em qualquer browser moderno desde 2023. Pode usar.

### 2.10 Tipografia e unidades

Unidades:
- `px` — pixel CSS (não bate 1:1 com pixel físico em telas HiDPI).
- `rem` — relativo ao `font-size` do `<html>` (default 16px). **Use rem por default em sizing.**
- `em` — relativo ao `font-size` do elemento atual. Útil em padding interno, problemático em cascata profunda.
- `%` — depende do contexto (pai, viewport, etc).
- `vw`/`vh`/`dvh`/`svh`/`lvh` — viewport units. `dvh` (dynamic) ajusta com address bar móvel — use no lugar de `vh` em mobile.
- `ch` — largura do `0` na fonte atual. Bom pra `max-width: 70ch` em prosa.

**`line-height` sem unidade** (`line-height: 1.5`) é multiplicador do font-size do elemento. Com unidade (`line-height: 24px`), é fixo — herda o fixo, não o multiplicador. Quase sempre você quer sem unidade.

Cores: `#hex`, `rgb()`, `hsl()`, `oklch()` (perceptualmente uniforme — modern color theory). `oklch` é o futuro de design systems sérios.

### 2.11 Animations, transitions, transforms

Transitions interpolam mudança entre dois estados:
```css
.btn { transition: background 200ms ease-out; }
.btn:hover { background: var(--color-primary); }
```

Properties animáveis: a maioria numéricas. `display: none → block` não anima (binário). Pra animar entrada/saída sem `display`, use `visibility + opacity + transform`, ou `@starting-style` / `transition-behavior: allow-discrete` (novidade) pra animar mudança de display.

Animations são keyframes:
```css
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
.icon { animation: pulse 1.5s ease-in-out infinite; }
```

Performance: anime `transform` e `opacity`. Tudo o que não muda layout → fica no compositor → 60fps fácil.

### 2.12 Tailwind — atomic CSS na prática

Tailwind é um framework de **utility classes**: cada classe faz uma coisa pequena (`p-4` = `padding: 16px`, `text-lg`, `flex`, `gap-2`). Você compõe estilos diretamente no HTML/JSX.

Por que dá certo (apesar de feio à primeira vista):
- **Sem nomeação**: nome de classe é uma das partes mais difíceis de CSS escalável. BEM, SMACSS, OOCSS — todas tentaram resolver. Atomic dispensa o problema.
- **Sem morte por specificity**: classes são todas (1,0,0). Última no HTML ganha — comportamento previsível.
- **Tree-shaking automático**: Tailwind extrai só as classes usadas no source — bundle final pequeno.
- **Design system embutido**: spacing scale, color scale, breakpoints, type scale são parametrizados em `tailwind.config`. Times param de discutir "8px ou 12px de margin?".
- **DevExperience**: hover, focus, dark mode, responsive como variantes (`md:flex`, `dark:bg-gray-900`, `hover:bg-blue-600`).

Críticas legítimas:
- **HTML denso**: classes longas. JIT/v4 melhorou com `@apply` e variantes nomeadas.
- **Acoplamento de estilo a markup**: refatorar componentes vira mover muito CSS junto. Em times disciplinados isso é o desejado; em times caóticos, vira ruído.
- **Aprende vocabulário Tailwind, não CSS**: developer só Tailwind tem buraco em CSS puro. Por isso este módulo é sobre **CSS primeiro**, Tailwind depois.

Padrões úteis:
- `@apply` em uma classe nomeada quando uma combinação se repete e merece nome (`.btn-primary`).
- Component libraries (`shadcn/ui`, `Radix Themes`) já dão building blocks acessíveis.
- Custom design tokens via CSS variables + Tailwind config — best of both worlds.

### 2.13 Outros approaches (pra reconhecer)

- **CSS Modules**: classes com escopo automático no build. Bom isolamento, sem novidade conceitual.
- **CSS-in-JS** (styled-components, Emotion, Stitches, vanilla-extract): JS gera CSS. Vantagens: dinâmico, theme via props. Desvantagens: runtime overhead (alguns têm), bundle, complica RSC. **Caindo de uso**.
- **Vanilla CSS moderno** (`@layer`, `:has()`, `@container`, custom properties, `oklch`): hoje resolve quase tudo que você precisava de pré-processador antes. Sass continua útil, mas não é mais obrigatório.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Listar as 6 fases do pipeline de renderização e dizer em qual fase cada tipo de mudança CSS entra.
- Explicar **box model** com `content-box` vs `border-box` e por que o segundo virou padrão.
- Reproduzir o cenário de **margin collapsing** (e em quais contextos não acontece).
- Distinguir **flexbox** vs **grid** com exemplos onde um vence o outro.
- Resolver um conflito de `z-index` que falha por causa de **stacking context** (e explicar o porquê).
- Calcular **especificidade** dada uma lista de seletores.
- Explicar diferença entre `inherit`, `initial`, `unset`, `revert`.
- Implementar **dark mode** usando CSS variables (sem libs).
- Construir layout de página completa (header/sidebar/main/footer) com Grid + Flex e explicar escolhas.
- Dar 3 razões reais por que Tailwind funciona em time e 2 críticas legítimas.

---

## 4. Desafio de Engenharia

Construir um **dashboard de logística** estático (frontend puro, sem backend ainda) que vai servir de base visual pro capstone.

### Especificação

Páginas:
1. **Dashboard** (visão geral): cards de métricas (entregas hoje, em trânsito, atrasadas, taxa on-time), tabela de pedidos recentes, mapa placeholder.
2. **Lista de pedidos**: tabela responsiva (colapsa em cards no mobile), filtros por status, busca, paginação visual.
3. **Detalhe de pedido**: timeline de status (pickup → trânsito → entrega), endereço, mapa placeholder, botões de ação.
4. **Configurações**: tabs com forms estilizados, switches, dark mode toggle.

### Restrições

- HTML semântico (sem `<div>` desnecessário onde existe tag mais correta).
- CSS sem framework primeiro: implemente tudo em **CSS puro** com custom properties pra design tokens.
- Depois, **reimplemente em Tailwind** num branch separado. Compare bundle size, mantenabilidade percebida, velocidade de iteração.
- **Responsivo de verdade**: mobile-first, breakpoints justificados (não copie do Tailwind sem entender).
- **Dark mode** funcional via `prefers-color-scheme` + toggle manual com persistência em localStorage.
- **Container queries** em pelo menos um componente que muda layout em função do container, não do viewport.
- **Animations performáticas**: só `transform` e `opacity` em hot paths (hovers, transitions de página).

### Threshold

- Lighthouse: Performance ≥ 95, Accessibility ≥ 95.
- Funciona em mobile real (não só DevTools — abra no celular).
- README com:
  - Diagrama do design system (tokens de cor, spacing, type scale).
  - 3 componentes onde a versão CSS puro venceu Tailwind, e 3 onde Tailwind venceu CSS puro.
  - Justificativa de cada breakpoint.
  - Bug visual real que você caçou durante a build (descrição, hipóteses, fix).

### Stretch

- Versão com **CSS Modules** e **vanilla-extract** dos mesmos componentes pra comparar 4 abordagens.
- Tema customizável em runtime (paletas adicionais via JS injetando custom properties).

---

## 5. Extensões e Conexões

- Liga com **01-07** (JS deep): manipulação de classes/styles em JS impacta render. Forced reflow é um bug clássico (ler `offsetHeight` logo após escrever style invalida cache do browser).
- Liga com **02-02** (a11y): semântica HTML é a base. Sem isso, ARIA vira gambiarra.
- Liga com **02-03** (DOM/Web APIs): `IntersectionObserver`, `ResizeObserver`, `MutationObserver` são pareceiros naturais de CSS reativo.
- Liga com **02-04** (React): styled-components, CSS Modules, Tailwind, todos integram a React de modos diferentes. Decisão técnica importa.
- Liga com **02-05** (Next.js): Tailwind é praticamente padrão em Next; RSC complica CSS-in-JS runtime; Server CSS via `<style>` injection tem nuances.
- Liga com **03-09** (frontend perf): Core Web Vitals (LCP, INP, CLS) dependem diretamente das escolhas de CSS — CLS especialmente.

### Ferramentas que vale conhecer

- **DevTools layers panel** (Chrome): mostra o que vai pra GPU.
- **Performance tab** com record durante interação: revela layout thrashing.
- **`prefers-reduced-motion`**: respeite usuários sensíveis a animação.
- **PurgeCSS / Tailwind JIT**: extração automática de classes usadas.
- **Stylelint**: lint pra CSS.
- **PostCSS**: pipeline de transformação (Tailwind usa por baixo).

---

## 6. Referências

- **CSS in Depth** (Keith J. Grant, 2nd ed) — leitura forte sobre cascade, especificidade, layout.
- **Every Layout** (Heydon Pickering & Andy Bell) — composição de primitivos. Muda como você pensa CSS.
- **MDN CSS** ([developer.mozilla.org](https://developer.mozilla.org/en-US/docs/Web/CSS)) — referência absoluta, sempre acima de tutoriais aleatórios.
- **CSS Tricks "A Complete Guide to Flexbox" e "Grid"** — referência rápida.
- **Josh Comeau's blog** ([joshwcomeau.com](https://www.joshwcomeau.com/)) — explicações visuais excelentes de CSS difícil.
- **Adam Argyle no YouTube** ("GUI challenges") — patterns modernos.
- **Tailwind docs** — leia inteiro, é curto.
- **Refactoring UI** (Adam Wathan & Steve Schoger) — design pra devs. Curto e prático.
- **Inclusive Components** (Heydon Pickering) — patterns de componente acessível.
- **CSS Working Group drafts** ([drafts.csswg.org](https://drafts.csswg.org/)) — quando quiser ver o que está vindo.
