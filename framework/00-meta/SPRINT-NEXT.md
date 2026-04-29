# SPRINT-NEXT — Backlog de Aprofundamento e Próximas Iterações

> Roadmap honesto do **que ainda falta no framework** ordenado por valor. Não são features novas; são correções a problemas reconhecidos em auditoria interna.
>
> Cada item tem ID, contexto, escopo, prioridade, status. Faça em batches; não atacar tudo simultaneamente.
>
> Atualize `CHANGELOG.md` quando concluir item. Marque `done`, mantenha entry como histórico.

---

## Sprint 0 — atual estado (referência)

- 5 estágios completos.
- 78 módulos + 5 capstones.
- 11 metas em `00-meta/`.
- Cobertura conceitual ampla.

**Problema reconhecido**: profundidade desigual entre módulos. Alguns (02-09 Postgres, 04-03 Event-Driven) são densos; outros (01-04 Data Structures, 01-15 Math, 02-02 Accessibility) ficam mais shallow ou tentam cobrir muito tópico em poucas linhas.

---

## Sprint 1 — Depth Leveling (próximo batch, alta prioridade)

Objetivo: nivelar profundidade dos módulos shallow ao patamar dos densos. Target: cada módulo entre 320-450 linhas, cada subseção da Teoria Hard com mecanismo + trade-off + exemplo + edge case.

### SN-001: Aprofundar 01-04 — Data Structures
**Status**: pending.
**Atual**: 336 linhas, cobertura ampla mas alguns tópicos rasos.
**Gap**: persistent data structures, finger trees, skip lists com proof, succinct DS, cache-oblivious algorithms, fingerprinted equality, B-Tree variants (B*-Tree, B-link), HAMT (Hash Array Mapped Trie) usado em Clojure/Scala, TreeMap vs HashMap em real workloads.
**Ação**: expandir 4-6 subseções com mecanismo + impl note + caso real + perf number.
**Estimate**: 2-4 horas.

### SN-002: Refazer 01-15 — Math Foundations
**Status**: pending.
**Atual**: 349 linhas em 18 subseções → ~20 linhas cada.
**Gap**: cada subseção pede aprofundamento. Probability tem 2 página em livro de 800; aqui está em 1 página.
**Opções**:
- A. Split em 3 módulos (N15a Discrete, N15b Linear+Calc, N15c Probability+Info Theory).
- B. Manter 1 módulo, aprofundar pra ~600 linhas.
- C. Aceitar shallow + apontar Mathematics for ML como obrigatório acompanhante.
**Recomendação**: B com nota explícita "este módulo introduz; book complementar é OBRIGATÓRIO".
**Estimate**: 4-6 horas.

### SN-003: Aprofundar 02-02 — Accessibility
**Status**: pending.
**Atual**: 280 linhas.
**Gap**: WCAG 2.2 novos criteria (target size, focus appearance, dragging) shallow; ARIA patterns canônicos (combobox, treeview, dialog) merecem subseção dedicada; cognitive básico (que 03-18 expande) deve ter intro mais sólida; testing manual checklist mais detalhado.
**Ação**: +100-150 linhas, foco em ARIA APG patterns + WCAG 2.2.
**Estimate**: 2-3 horas.

### SN-004: Aprofundar 02-05 — Next.js
**Status**: pending.
**Atual**: 338 linhas. Caching layers OK mas RSC mental model + streaming + parallel routes + intercepting routes mais shallow.
**Gap**: Server Actions deep (revalidation, optimistic, transitions), Edge runtime constraints, middleware chain, parallel + intercepting routes com use case real, ISR invalidation patterns, Turbopack vs Webpack deltas.
**Ação**: +80-120 linhas em RSC + streaming + parallel routes.
**Estimate**: 2-3 horas.

### SN-005: Aprofundar 04-05 — API Design
**Status**: pending.
**Atual**: 372 linhas. REST/GraphQL/gRPC cobertos mas comparação fim-a-fim shallow.
**Gap**: GraphQL federation patterns (Apollo Federation v2, schema stitching deprecated), gRPC streaming bidirectional, BFF pattern com use case, API gateway placement, versioning evolution real (Stripe blog), error contract design (RFC 7807 Problem Details).
**Ação**: +80-120 linhas com casos comparativos lado-a-lado.
**Estimate**: 2-3 horas.

### SN-006: Aprofundar 04-04 — Resilience Patterns
**Status**: pending.
**Atual**: 332 linhas.
**Gap**: hedging requests (Tail at Scale), load shedding mathematically (Little's Law applied), backpressure semantics em Reactive Streams, adaptive concurrency limits (Netflix), token bucket vs leaky bucket math, circuit breaker state machine formal.
**Ação**: +80-120 linhas com derivações matemáticas.
**Estimate**: 2-3 horas.

### SN-007: Identificar e priorizar restantes módulos shallow
**Status**: done (audit 2026-04-28).
**Resultado**: scan de todos os 78 módulos por line count.

**Faixa shallow (< 280 linhas)** — 7 candidatos:
- 02-16 Graph Databases (251)
- 01-13 Compilers & Interpreters (260)
- 05-02 Multi-Domain Capstones (262)
- 02-17 Native Mobile (266)
- 02-15 Search Engines (278)
- 01-12 Cryptography Fundamentals (280)

**Faixa borderline (280-310)** — ~12 candidatos. Aceitáveis se densidade alta.

**Decisão**: 02-16, 01-13, 02-17, 02-15 entram em backlog Sprint 1 batch 2 quando demanda real surgir. 05-02 é coordinator doc de outros capstones — natural ser mais curto. 01-12 é ok pra Fundamentos intro (cripto profundo merece módulo Senior dedicado, não está em scope agora).

**Não disparar batch 2 imediatamente**: módulos atuais entregam fundamentos suficientes. Aprofundamento adicional triggered por uso real (alguém estudou e detectou gap específico).

**Encerrado**.

---

## Sprint 2 — Codebase Tours e Multi-Stack (alta prioridade)

### SN-010: Codebase Tours doc — done
**Status**: done in this sprint.
**Output**: `framework/00-meta/CODEBASE-TOURS.md`.
**Conteúdo**: guided reading paths em V8, CockroachDB, Postgres, Redis, libuv, React, Linux kernel, etc., com files específicos a abrir e what-to-look-for.

### SN-011: Stack Comparisons doc — done
**Status**: done in this sprint.
**Output**: `framework/00-meta/STACK-COMPARISONS.md`.
**Conteúdo**: side-by-side de Node/TS, Java/Spring, Python/FastAPI/Django, Ruby/Rails, Go, .NET, PHP/Laravel em patterns canônicos. Quebra bias Node-heavy do framework.

### SN-012: Code walkthrough sessions
**Status**: pending.
**Gap**: docs estáticos não substituem leitura ativa.
**Ação opcional**: vídeos curtos (15-30 min) de você mesmo lendo um trecho de codebase. Live commentary. ~5 sessions iniciais.
**Estimate**: 5-10 horas.
**Custo**: alto. Avaliar ROI.

---

## Sprint 3 — Pedagogia e Experiência

### SN-020: Solution sketches dos Desafios
**Status**: pending.
**Gap**: cada Desafio tem specification mas sem reference solution. Aluno não sabe se sua solução está em range.
**Ação**: pra cada Desafio, escrever **sketch** (não solução completa) com:
- Components esperados.
- Trade-offs comuns.
- Common pitfalls.
- Métricas alvo.
**Risco**: tentação de dev olhar antes de tentar. Documentar em README de cada solução: "abrir só após travar 1h documentado".
**Estimate**: 4-6 horas por sprint, 78 módulos = projeto longo. Faça por estágio (Fundamentos primeiro).

### SN-021: Anki deck stub por estágio
**Status**: pending.
**Gap**: STUDY-PROTOCOL §3 recomenda 50-150 cards por estágio. Aluno precisa criar do zero.
**Ação**: starter deck com 30 cards core por estágio, marcadas "expand from here".
**Estimate**: 2-3 horas por estágio.
**Risco**: cards genéricos viram crutch. Documente "este é starter; crie os seus".

### SN-022: Self-Assessment v2 expandido
**Status**: pending.
**Atual**: SELF-ASSESSMENT.md tem 66 perguntas (1 por módulo).
**Gap**: 1 pergunta por módulo nem sempre captura. Alguns módulos densos merecem 3-4.
**Ação**: expandir pra ~150 perguntas, multi-question per dense module, com scoring guide refinado.
**Estimate**: 4-6 horas.

### SN-023: Plan templates por trilha
**Status**: pending.
**Gap**: trilhas paralelas em READMEs são listas; faltaria template de plan semanal sugerido por estágio.
**Ação**: doc `framework/00-meta/STUDY-PLANS.md` com 3-5 plans típicos (full-time learner, part-time learner empregado, weekend warrior, parent of toddler, etc.) com alocação realista por trilha.
**Estimate**: 3-4 horas.

---

## Sprint 4 — Operacional / Tooling

### SN-030: CI script validate frontmatter consistency
**Status**: pending (DL-007 open).
**Ação**: Python ou shell script que checa:
- Todos os módulos têm 6 campos frontmatter.
- Todos têm 6 seções obrigatórias.
- Prereqs declarados existem como módulos.
- Status válido.
- Linha count em range razoável.
**Estimate**: 2-3 horas.

### SN-031: Link checker script
**Status**: pending.
**Ação**: rodar contra todos `.md` e validar links internos + warning links externos quebrados.
**Estimate**: 1-2 horas.

### SN-032: Glossary auto-link
**Status**: pending.
**Gap**: GLOSSARY.md tem 250 termos. Módulos referenciam mas sem hyperlink automático.
**Ação**: build script que escaneia módulos, adiciona link `[term](GLOSSARY.md#term)` first occurrence.
**Risco**: sobre-linkagem distrai.
**Estimate**: 3-5 horas.

---

## Sprint 5 — Translation e Reach

### SN-040: Translate to EN
**Status**: pending (DL-008 trade-off declared).
**Gap**: alcance limitado a PT-BR market.
**Ação opcional**: traduzir frontmatter + section headers + keywords; deixar prosa em PT-BR. Híbrido. Ou full translation (caro).
**Estimate**: 40-80 horas full; 8-12 horas hybrid.
**Custo-benefício**: avaliar antes de investir.

### SN-041: Open source o framework
**Status**: pending decision.
**Question**: privado pessoal vs aberto?
**Trade-off**:
- Aberto: contribuição external, peer review, SEO, portfolio.
- Privado: livre pra refactor sem expectativa.
**Recomendação**: aberto após estabilizar (talvez Sprint 3-4).
**Acompanhar**: licença (CC BY-SA?), contributing guide, code of conduct.

---

## Sprint 6 — Avançado / Especialização

### SN-050: Stage 5 Distinguished/Fellow track
**Status**: explicit reject em DL-001.
**Reabrir** apenas se há demanda real. Não default.

### SN-051: Per-track deep curriculums
**Status**: pending.
**Gap**: CAPSTONE-amplitude oferece 6 tracks (Distributed, Platform, Frontend, Data/ML, Security, Founding) mas trail per track é generic.
**Ação opcional**: doc detalhado por track com modules priorizados, OSS recomendados, projects sugeridos, mentor archetypes.
**Estimate**: 6-12 horas por track.

### SN-052: Industry-specific overlays
**Status**: pending.
**Gap**: Logística é genérico. Setor tem nuances (fintech compliance, healthcare HIPAA, gov security, etc.).
**Ação opcional**: docs `OVERLAYS/fintech.md`, `healthcare.md`, etc., apontando módulos críticos por setor.
**Estimate**: 2-4 horas por overlay.

### SN-054: Anki deck stub por estágio
**Status**: pending.
**Gap**: STUDY-PROTOCOL §3 recomenda 50-150 cards/estágio. Aluno cria do zero.
**Ação**: starter deck com 30 cards core por estágio, marcadas "expand from here". Distribuir como `.apkg`.
**Estimate**: 2-3h por estágio (5 estágios = 10-15h).
**Risco**: cards genéricos viram crutch. Documentar "starter; crie os seus".

### SN-055: Solution sketches dos Desafios
**Status**: pending.
**Gap**: Cada Desafio tem spec mas sem sketch reference. Aluno não sabe se solução está em range.
**Ação**: sketch (não solução) por Desafio com components esperados, trade-offs comuns, common pitfalls, métricas alvo.
**Estimate**: 2-4h por módulo.
**Risco**: tentação de spoiler. Documentar "abrir só após travar 1h".

### SN-056: Mock interview transcripts
**Status**: pending.
**Gap**: INTERVIEW-PREP.md mapeia áreas mas não tem mock real.
**Ação**: 1 transcript por estágio (5 totais) — pergunta-resposta-feedback realístico tier-1. Útil pra calibrar nível.
**Estimate**: 4-6h por mock.

### SN-057: Antipatterns aplicados ao capstone Logística
**Status**: pending.
**Gap**: ANTIPATTERNS.md genérico. Mostrar como Logística v1 quebraria se feita errada (concrete patterns) seria muito didático.
**Ação**: doc `framework/00-meta/ANTIPATTERNS-LOGISTICA.md` com 10-15 cenários concretos de "antes vs depois" no contexto do capstone.
**Estimate**: 6-8h.

### SN-058: AI Infrastructure track (Track G) curriculum detalhado
**Status**: pending.
**Gap**: Track G adicionado em CAPSTONE-amplitude §2.11 mas trail e references ainda thin.
**Ação**: dedicated doc `framework/05-amplitude/TRACK-G-AI-INFRA.md` com modules priorizados, papers, OSS contributing targets, mentor archetypes.
**Estimate**: 8-12h.

### SN-059: Sustainability deep — módulo dedicado
**Status**: pending.
**Gap**: Cobertura em 03-05 §2.20 é overview. Em alguns mercados (EU, B2C consumer) virou tópico Senior+.
**Ação opcional**: módulo S17 "Sustainability Engineering" ou subseção forte em 04-16. Decidir baseado em demanda.
**Estimate**: 6-10h.

### SN-060: Privacy engineering — módulo dedicado Senior
**Status**: pending.
**Gap**: Cobertura em 03-08 §2.17.1 é overview. LGPD/GDPR multi-jurisdição + differential privacy + tokenization vault merecem módulo.
**Ação opcional**: módulo S17b "Privacy Engineering" — após mercado B2B EU consolidar requirement.
**Estimate**: 8-12h.

### SN-061: Cross-stack revisit em Plataforma
**Status**: pending.
**Gap**: Bun/Deno/Node deep cobre runtimes JS. Falta para outros stacks: ".NET 9 vs Java 21 vs Go" deep, "FastAPI vs Django vs Flask vs Litestar".
**Ação opcional**: subseções em 02-07/02-08 ou módulo cross-stack dedicado.
**Estimate**: 4-8h.

### SN-062: Reading list por estágio expandido
**Status**: done parcialmente.
**Gap**: 05-04 §2.7.1 lista 35 papers must-read agora. Falta integração visual no site (`/library` ou `/papers`).
**Ação**: page `/papers` com lista filtrada por estágio + 3-pass tracking.
**Estimate**: 4-6h.

### SN-063: Quarterly review template — automação
**Status**: pending (template criado em STUDY-PROTOCOL §17).
**Gap**: Template é markdown manual. Pra ter série temporal útil, vale CLI ou script que gera estrutura + pull stats do git/PROGRESS.
**Ação opcional**: script `scripts/quarterly-review.mjs` que gera template preenchido com stats reais do trimestre.
**Estimate**: 3-5h.

### SN-064: Schedulers modernos — refresh periódico
**Status**: pending.
**Gap**: 01-02 §2.4.1 documenta CFS→EEVDF (Linux 6.6). Hybrid CPUs (Intel 12+, Apple M-series) impactam scheduling. Tópico evolui rápido.
**Ação**: refresh anual de 01-02 pra acompanhar kernel changes.
**Estimate**: 1-2h por refresh.

---

## Não-prioridades explícitas (don't do)

Resistir tentação de fazer:
- **Stage 6 Distinguished/Fellow**: trajetórias divergem demais (DL-001).
- **Custom video tutorials**: scope creep ($, time, replacements rapidly).
- **Mobile app companion**: framework é texto + repo; não app.
- **Discord/Slack server**: drains time, low signal historicamente.
- **Paid tier**: trade clarity de mission por revenue marginal.

---

## Backlog priorização

Ordem sugerida (alta → baixa prioridade):

1. **Sprint 1 SN-001 a SN-007**: depth leveling. Maior ROI.
2. **Sprint 2 SN-010 SN-011**: meta docs novos (done in this sprint — codebase tours + stack comparisons).
3. **Sprint 3 SN-020 SN-022**: pedagogia. Multiplicador de outcome.
4. **Sprint 4 SN-030 SN-031**: tooling minimal.
5. **Sprint 5 SN-040**: translation se decidir. SN-041 OSS.
6. **Sprint 3 SN-021 SN-023**: complementary.
7. **Sprint 6**: especialização avançada.

---

## Done log (mover items aqui ao concluir)

### 2026-04-28 — Sprint 2 batch 1 (Site público)

- **SN-053 done**: Site público em `apps/site/` (Next.js 16 + React 19 + Tailwind 4). Render do framework Markdown como artefato navegável em `fathom.nicolaspilegidenigris.dev`.
  - 12 rotas: `/`, `/stages`, `/stages/[stage]`, `/modules/[id]`, `/progress`, `/now`, `/index`, `/library`, `/glossary`, `/docs/[slug]` (17 docs), `/about`, `/api/health`.
  - Stack idêntica ao `MyPersonalWebSite` — mesmas fonts, paleta, tokens. Drop-in se quiser integrar como rota futura.
  - CMD+K palette com fuzzy search em 100+ entries. Mobile responsive com hamburger menu.
  - A11y: `prefers-reduced-motion`, `aria-current`, focus rings, breadcrumbs.
  - Features: prev/next module nav, reading time estimation, mermaid render do DAG, glossary com client-side filter.
  - **Deploy**: Dockerfile multi-stage standalone + `railway.json` + healthcheck `/api/health`. Pronto pra Railway.
  - **Validation**: `scripts/validate-content.mjs` hookado como `prebuild`. Falha cedo em regressão estrutural (frontmatter, prereqs, links).
  - Single source of truth preservado: edição segue sendo `git commit` em `.md`.

### 2026-04-28 — Sprint 1 batch 1 (depth leveling)

- **SN-001 done**: 01-04 Data Structures aprofundado. Adicionadas subseções 2.9 B-Tree variants, 2.10 Persistent data structures, 2.11 Cache-oblivious, 2.12 Skip list deep, 2.13 HAMT concreto, 2.14 LSM-Tree internals, 2.15 Bloom filter math, 2.16 Adjacency list/matrix/CSR, 2.17 Trie e variantes, 2.18 Disjoint Set Union. Threshold expandido com 6 itens novos. Total: ~+200 linhas.
- **SN-002 done**: 01-15 Math Foundations aprofundado. Adicionadas subseções 2.19 Linear algebra deep, 2.20 Probability deep com casos, 2.21 Information theory deep, 2.22 Graphs avançado com complexity, 2.23 Numerical computing detalhado, 2.24 LA em código, 2.25 Optimization concrete, 2.26 Probabilistic data structures math. Total: ~+250 linhas.
- **SN-003 done**: 02-02 Accessibility aprofundado. Adicionadas subseções 2.13 WCAG 2.2 novos critérios, 2.14 ARIA APG patterns canônicos, 2.15 Manual audit checklist estruturada, 2.16 Regional disabilities Brasil context. Total: ~+150 linhas.
- **SN-004 done**: 02-05 Next.js aprofundado. Adicionadas subseções 2.13 Server Components mental model, 2.14 RSC payload, 2.15 Streaming/Suspense/parallel routes, 2.16 Server Actions deep (revalidation/optimistic/transitions), 2.17 Edge runtime constraints, 2.18 ISR e cache invalidation strategies, 2.19 Turbopack vs Webpack, 2.20 Errors e instrumentation. Total: ~+200 linhas.
- **SN-005 done**: 04-05 API Design aprofundado. Adicionadas subseções 2.20 GraphQL Federation v2, 2.21 gRPC streaming bidirectional, 2.22 BFF pattern, 2.23 API gateway, 2.24 Versioning evolution Stripe, 2.25 RFC 7807 Problem Details, 2.26 API design comparison side-by-side. Total: ~+200 linhas.
- **SN-006 done**: 04-04 Resilience Patterns aprofundado. Adicionadas subseções 2.19 Hedging requests (Tail at Scale), 2.20 Adaptive concurrency limits Netflix, 2.21 Backpressure formal, 2.22 Token vs Leaky bucket math, 2.23 Circuit breaker formal state machine, 2.24 Bulkhead concrete, 2.25 Failover patterns, 2.26 Chaos engineering principles, 2.27 Failure budget aplicado. Total: ~+200 linhas.

Pendente Sprint 1: SN-007 (audit completo de outros módulos shallow); pode disparar Sprint 1 batch 2.

---

## Cadência

Não force prazos. Próximo batch dispara quando você:
- Termina 01-01-2 módulos do framework atual (live use produz feedback).
- Reconhece pattern repetidamente em sessions.
- Recebe issue/PR de leitor (se OSS).
- Ano novo / aniversário do framework / refresh trigger.

Roadmap **não tem prazo**. Tem **prioridade**.
