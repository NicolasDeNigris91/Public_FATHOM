# Contribuindo com Fathom

> Framework é artefato pessoal de Nicolas De Nigris. Issues e PRs são bem-vindos pra **correções factuais** e **bugs do site**. Mudanças estruturais (novos módulos, alterações de prereqs, novos protocolos) seguem processo formal — leia abaixo.

---

## Antes de abrir issue

1. **Procure issues existentes** — pode já estar reportado.
2. **Se for typo / link quebrado**: PR direto é mais rápido que issue.
3. **Se for imprecisão técnica**: traga **fonte canônica** (livro, RFC, paper, talk reconhecida) que contradiz o conteúdo. Sem fonte de elite, não vira correção — é só opinião.
4. **Se for proposta de módulo novo / mudança de prereqs**: precisa ser justificada via [DECISION-LOG entry](framework/00-meta/DECISION-LOG.md). Use o template de issue "Module gap".

## Tipos de contribuição

### Aceitáveis (PR direto OK)

- Typos.
- Links quebrados (validados pelo `scripts/validate-content.mjs`).
- Erros factuais com fonte canônica anexada.
- Bugs do site (`apps/site/`).
- Polish de a11y / responsive / performance no site.
- Tests adicionais pra utilities em `apps/site/src/lib/`.

### Requerem discussão prévia (abra issue antes do PR)

- Módulos novos.
- Mudanças de prereqs.
- Mudanças de protocolo (`MENTOR.md`, `STUDY-PROTOCOL.md`).
- Reorganização de estágios.
- Adição/remoção de capstone steps.
- Tradução pra outro idioma.

### Não-aceitos

- Propaganda velada de produto / curso.
- "Eu acho que X é melhor que Y" sem fonte canônica.
- Estilo de prosa pessoal — o framework tem voz definida (PT-BR técnico, sem emojis, sem elogios performáticos).
- Mudança de licença sem discussão.

## Padrões de prosa

- Português Brasil pra prosa, EN pra termos técnicos canônicos. **Não traduza** "event loop", "prototype chain", "B-Tree", etc.
- Sem emojis em conteúdo ou commits.
- Tom técnico, denso. Sem "ótima pergunta", "excelente", "incrível".
- Frases curtas. Sem padding.

## Padrões de código (`apps/site/`)

- TypeScript estrito. Sem `any` salvo justificativa em comentário.
- Componentes pequenos, server-first quando possível.
- Sem comentários redundantes — só quando o **why** não é óbvio.
- `prefers-reduced-motion` honrado.
- Tests pra qualquer utility nova em `src/lib/`.

## Workflow

1. Fork o repo (ou pra colaboradores diretos: branch local).
2. Branch nomeada como `fix/short-desc` ou `feat/short-desc`.
3. Roda local antes do push:
   ```bash
   cd apps/site
   npm install   # primeira vez
   npm run typecheck
   npm test
   npm run build
   ```
4. Commit message no padrão: `tipo(escopo): descrição em PT-BR ou EN, imperativo, baixa-caixa`.
   - tipos: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`, `style`, `ci`.
   - exemplo: `fix(site): corrige typo em N04-data-structures §2.5`.
5. PR pra `main`. Descreva: o que muda, por quê, fonte (se factual).
6. CI deve passar (validate framework + build site).
7. Reviewer (autor) pode pedir revisão. Sem ofensa em mudanças solicitadas.

## Sem co-autoria de IA

Commits **não levam** `Co-Authored-By:` de modelos de IA. Ferramentas de produtividade são instrumento, não co-autor — análogo a editor de código, dicionário, ou linter. Detalhes em [DECISION-LOG DL-017](framework/00-meta/DECISION-LOG.md).

Se você usou ferramenta assistente pra escrever ou revisar — está OK, é trabalho seu. Só não credite a ferramenta como autor.

## Reportar vulnerabilidade de segurança

Não abra issue pública. Email pra `nicolas.denigris91@icloud.com` com detalhes.

## Licença das contribuições

Ao contribuir, você concorda que sua contribuição é licenciada sob [CC BY-NC 4.0](LICENSE) — mesma licença do framework.

---

**Resumo**: traga fonte canônica, escreva preciso, rode local antes do push, sem co-autoria de IA.
