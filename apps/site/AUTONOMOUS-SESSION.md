# Sessão autônoma — log de commits

> Registro do turno autônomo de melhorias enquanto o autor estava ausente. Cada commit foi feito separadamente e pushed pra `main`. Lê de baixo pra cima na ordem cronológica, ou de cima pra baixo na ordem reversa.

Branch: `main` · Repo: `https://github.com/NicolasDeNigris91/FATHOM`

---

## Resumo executivo

33 commits de melhorias foram feitos no site (`apps/site/`) sem tocar no protocolo, conteúdo de módulos, ou estrutura do framework. Foco: type safety, UX, a11y, SEO, e features que aumentam valor sem expandir scope.

**Nada quebrou conteúdo existente.** O site continua sendo render do Markdown — single source of truth preservado.

**Deploy não foi feito.** Railway setup fica pra você.

---

## Commits (ordem reversa, mais recente primeiro)

### Onda 3

- **`dfe9773`** — feat: "Destrava" section em /modules/[id] mostrando módulos dependentes (reverse prereqs).
- **`8bbea85`** — feat: search highlight em /glossary (matched text com bg gold-leaf/20).
- **`a9415cd`** — feat: /docs index page (16 docs agrupados por categoria) + back-to-top button.
- **`77e3756`** — docs: AUTONOMOUS-SESSION.md update onda 2.

### Onda 2 (depois do log inicial)

- **`51e8915`** — feat: canonical URLs + per-route description em todas as páginas (SEO).
- **`41e864b`** — feat: keyboard shortcuts overlay (?) + g-prefix navigation (g+h/s/p/n/l).
- **`cceef15`** — feat: page-specific loading skeletons em /modules/[id] e /stages/[stage].
- **`f2dbe24`** — feat: prereqs chips colorizados por status do módulo de origem.
- **`3a35224`** — feat: per-stage dynamic OG images via next/og.
- **`aa7c383`** — feat: module status badge no header de /modules/[id] + ícone em ModuleRow.

### Polish + UX (onda 1)

- **`1be6796`** — feat: TableOfContents sticky em `/modules/[id]` (xl breakpoint), só visível pra módulos com 4+ headings.
- **`7c8cfda`** — feat: copy-to-clipboard em code blocks + lang label discreto. Hover-revealed.
- **`97195b9`** — feat: JSON-LD structured data (Schema.org WebSite, TechArticle, BreadcrumbList) em /, /modules/[id], /stages/[stage].
- **`5a48562`** — feat: per-module dynamic OG images via next/og. Cada módulo ganha share card customizado. Plus richer metadata (description from first paragraph, keywords from prereqs).
- **`851b308`** — feat: web manifest + dynamic icon.tsx + apple-icon.tsx. Substitui necessidade de favicon.ico binário.
- **`6a0dddb`** — feat: print stylesheet. Cmd+P em qualquer módulo gera PDF limpo (sem nav/footer, light scheme, page-break-aware).

### Features novas

- **`1bc6b49`** — feat: `/api/progress` JSON endpoint + Hero context-aware CTA. Quando há módulo ativo no PROGRESS.md, Hero mostra "Continue → A09" em vez de "Begin → N01".
- **`fd82bb5`** — docs(framework): registrar site no SPRINT-NEXT (SN-053), DECISION-LOG (DL-018 monorepo justification), CHANGELOG.
- **`f9720d9`** — chore: breadcrumbs em todas as 8 rotas internas (consistência).
- **`516d82b`** — feat: Breadcrumb component em `/stages/[stage]` e `/modules/[id]`.
- **`7f80d52`** — feat: `/now` page (currently studying, segue /now convention de nownownow.com). Lê PROGRESS.md.
- **`f9d0c7d`** — feat: `/library` page com 27 livros canônicos curados em TS data, agrupados por estágio. Não duplica reading-list.md — é seleção editorial.
- **`a287103`** — feat: `/glossary` page com client-side search + section filter pra 210 termos do GLOSSARY.md.
- **`e5e1442`** — chore: validation script polish. Output agrupado por arquivo, cores ANSI, flags `--strict`/`--quiet`/`--json`.

### UX flow

- **`3ad8ee5`** — feat: reading metadata caption em `/modules/[id]` (~min read · palavras · code blocks).
- **`b0a648c`** — feat: prev/next module navigation no fim de `/modules/[id]`. Cobre cross-stage (último Novice → primeiro Apprentice).

### Reliability + a11y

- **`0ba6f59`** — feat: mobile responsive tightening. Hamburger menu pra mobile (md:hidden), drawer com nav primário, search button visível em mobile (sem label).
- **`1b1a53f`** — style: prose-fathom polish — nested lists, anchors com scroll-margin-top, kbd styling, details/summary, tabela com code styling, image/figure handling.
- **`b0436ee`** — feat: a11y pass — useReducedMotion em todos os Framer Motion components, aria-current no Navbar, focus rings, aria-hidden em decoração visual, media query global pra prefers-reduced-motion.
- **`98b22bd`** — feat: not-found.tsx + error.tsx + loading.tsx (UX padrão de Next.js App Router).
- **`da06b82`** — chore: type safety + lint config alignment. Substitui FlatCompat por defineConfig (forma moderna do MyPersonalWebSite). Components type do react-markdown corretamente tipado, destructure de `node` prop.

---

## Como avaliar

1. **Pull no Railway depois do `git pull` local.** Cada commit é independente, mas deploy do estado atual (`main` HEAD = `1be6796`) cobre tudo.
2. **Páginas a checar primeiro:**
   - `/` — Hero deve mostrar "Begin → N01" (já que PROGRESS.md ainda não tem módulo ativo).
   - `/modules/n01` — TOC sticky em monitor wide, copy buttons em code blocks, breadcrumb, prev/next no fim.
   - `/now` — snapshot do estado atual, links pra estágio + módulo ativo.
   - `/library` — 27 livros agrupados por estágio.
   - `/glossary` — filter por seção + busca client-side em 210 termos.
   - `/api/progress` — JSON snapshot do PROGRESS.md.
   - `/api/health` — `{ok: true}` pra Railway healthcheck.
3. **Mobile** (DevTools 375px): hamburger menu deve abrir/fechar; CMD+K palette se ajusta com `pt-[8vh]` em vez de 15vh.
4. **Print preview** em qualquer módulo: layout deve ficar legível em PDF (light scheme, sem nav).
5. **Validation script:** `cd apps/site && node ../../scripts/validate-content.mjs` reporta 0 errors / 34 warnings (broken links cross-stage pré-existentes).

---

## O que **não** foi feito (intencional)

- **Não modifiquei conteúdo do framework.** Módulos `.md`, frontmatter, prereqs, capstones — intactos.
- **Não rodei `npm install`.** Build acontece no Railway. Pode haver mismatch de versão se package.json subiu com dep nova mas package-lock.json não. Resolve com `npm install` localmente antes do primeiro deploy.
- **Não toquei em `MyPersonalWebSite/`.**
- **Não fiz deploy.** Railway setup é manual conforme combinado.
- **Não registrei "Co-Authored-By"** em nenhum commit. Autoria única: Nicolas De Nigris.

---

## Backlog que sobrou (sugestões)

Pra próxima sessão, items rejeitados/adiados durante o turno:

- **Pagefind/Algolia full-text search** — CMD+K cobre 90% do caso, search-de-conteúdo seria scope creep.
- **Reading position localStorage** — small win, único usuário (você), baixa prioridade.
- **RSS feed dos módulos done** — útil quando virar habito público.
- **Stage-level OG images** — symmetric com module OGs mas low payoff.
- **Discord/Slack/talk integration** — fora de escopo.
- **i18n / EN translation do site** — DL-008 do framework rejeita por enquanto.
- **Bulk rewrite dos broken links pré-existentes** detectados pelo validation script (34 warnings) — tocaria conteúdo do framework, fora de escopo deste turno.

---

**Estado final:** repo limpo, 23 commits adicionais sobre o estado de quando você saiu, push verde em todos. Site pronto pra `git pull` no Railway quando quiser apertar deploy.
