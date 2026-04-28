# Fathom Site

Next.js 16 app que renderiza o framework Markdown de `framework/` e arquivos raiz (`README.md`, `MENTOR.md`, `PROGRESS.md`, `STUDY-PROTOCOL.md`) como site público.

Stack idêntica ao [`MyPersonalWebSite`](https://github.com/NicolasDeNigris91/MyPersonalWebSite): Next 16, React 19, Tailwind 4, Framer Motion, Lucide. Mesmos design tokens (obsidian/pearl/gold-leaf/racing-green) e fonts (Cormorant Garamond + Inter + JetBrains Mono).

---

## Single source of truth

Você **edita os `.md` em `framework/` e raiz** — o site re-renderiza no próximo build. Zero conteúdo duplicado em `apps/site/`.

Páginas:
- `/` — Landing com Hero, 5 estágios, método em 4 pilares
- `/stages` — Grid dos 5 estágios
- `/stages/[stage]` — Lista de módulos do estágio + README do estágio renderizado
- `/modules/[id]` — Renderização do módulo Markdown completo (frontmatter parseado pra prereqs/title)
- `/progress` — Dashboard de portões (parsea PROGRESS.md)
- `/index` — INDEX.md global (DAG mermaid + tabela)
- `/docs/[slug]` — MENTOR, STUDY-PROTOCOL, RELEASE-NOTES, CHANGELOG, DECISION-LOG, etc.
- `/about` — Sobre o framework

---

## Local dev

```bash
cd apps/site
npm install
npm run dev
# http://localhost:3000
```

Conteúdo é lido de `../../framework/` e `../../<file>.md` em build/runtime via `fs/promises`. `process.cwd()` é `apps/site/` em dev.

---

## Deploy Railway

Padrão usado pelos outros projetos no Railway dashboard (subdomínio em `*.nicolaspilegidenigris.dev`).

### Setup inicial

1. **New Project** no Railway → Deploy from GitHub repo → selecione `NicolasDeNigris91/FATHOM`.
2. **Settings**:
   - **Root Directory**: deixe vazio (repo root). O Dockerfile precisa de acesso a `framework/` e `*.md` na raiz.
   - **Builder**: Dockerfile.
   - **Dockerfile path**: `apps/site/Dockerfile` (já configurado em `railway.json`).
3. **Domains** → add custom domain `fathom.nicolaspilegidenigris.dev` → segue instrução do Railway pra apontar CNAME no provedor de DNS.
4. **Variables** (opcional):
   - `NEXT_PUBLIC_SITE_URL=https://fathom.nicolaspilegidenigris.dev`

### Como o build funciona

- `Dockerfile` multi-stage (`node:22-alpine`).
- `apps/site/` é o app; `framework/` + raiz `.md` são copiados pro contexto de build.
- `next.config.ts` usa `output: 'standalone'` — imagem final pequena (~150MB), só `server.js` + deps mínimas.
- Runtime: `node server.js` na porta `$PORT` (Railway injeta).

### Push automatic deploy

Cada `git push` na branch `main` dispara redeploy automático.

---

## Estrutura

```
apps/site/
├── Dockerfile               # Railway build (multi-stage, standalone)
├── .dockerignore
├── package.json
├── next.config.ts           # output: 'standalone', outputFileTracingRoot apontando pra repo root
├── tsconfig.json
├── postcss.config.mjs
├── eslint.config.mjs
└── src/
    ├── app/
    │   ├── globals.css      # design tokens (mesma paleta do portfolio)
    │   ├── layout.tsx       # fonts + Navbar + Footer
    │   ├── page.tsx         # /
    │   ├── stages/page.tsx
    │   ├── stages/[stage]/page.tsx
    │   ├── modules/[id]/page.tsx
    │   ├── progress/page.tsx
    │   ├── index/page.tsx
    │   ├── docs/[slug]/page.tsx
    │   └── about/page.tsx
    ├── components/          # Navbar, Footer, Hero, StageCard, ModuleRow, MarkdownContent, EyebrowHeading
    └── lib/
        ├── motion.ts        # EASE_STANDARD + variants (mesmas do portfolio)
        ├── stages.ts        # constantes dos 5 estágios
        ├── content.ts       # parser de framework/*.md (gray-matter + fs)
        └── progress.ts      # parser de PROGRESS.md → tabela tipada
```

---

## Adicionando conteúdo novo

Não há frontmatter especial. Edite os `.md` no framework como sempre:

- Novo módulo: criar `framework/0X-stage/M##-topic.md` com frontmatter padrão (ver `framework/00-meta/MODULE-TEMPLATE.md`). Site detecta automaticamente.
- Novo doc meta: criar em `framework/00-meta/`. Pra rotear, adicionar entry em `apps/site/src/app/docs/[slug]/page.tsx` `DOCS` array.
- Atualizar progresso: editar `PROGRESS.md` na raiz. `/progress` lê e renderiza.

---

## Decisões técnicas

- **Stack idêntico ao portfolio principal**: mesmo `package.json` deps, mesmas fonts via `next/font`, mesmos tokens em `globals.css`. Quando integrar como rota `/fathom` no portfolio, é drop-in.
- **Markdown rendering**: `react-markdown` + `remark-gfm` + `rehype-slug`. Custom `<a>` component reescreve links relativos do framework (`../01-novice/N01-foo.md`) pra rotas do site (`/modules/n01`).
- **Static gen onde possível**: `generateStaticParams` em `[stage]`, `[id]`, `[slug]`. Build pre-renderiza tudo.
- **No mermaid**: por enquanto o DAG do INDEX.md aparece como bloco de código. Item futuro: client-side mermaid render. Custo: lib pesada (~500KB) por uma página. Decidi pular no MVP.
- **No search full-text**: navegação por estrutura é suficiente. Adicionar Pagefind ou Algolia seria scope creep.

---

## Não-objetivos explícitos

- Não há auth.
- Não há edição via UI. Edição = `git commit` no `.md`.
- Não persiste estado client-side (progresso é canon do `PROGRESS.md`).
- Não duplica conteúdo. Single source of truth.
