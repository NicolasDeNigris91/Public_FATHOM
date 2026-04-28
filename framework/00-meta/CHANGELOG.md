# CHANGELOG — Mudanças no Framework

> Registro append-only de mudanças no framework. Module added/renamed/removed, prereqs alterados, capstones revisados, protocolos atualizados, referências canônicas adicionadas.
>
> **Não** é changelog de produto Logística (esse é seu repo separado). É changelog **do próprio framework** como artefato.

Formato: `[YYYY-MM-DD] | tipo | descrição` em ordem cronológica reversa (mais recente no topo).

Tipos:
- **add** — módulo, capstone, meta, protocolo novo.
- **edit** — conteúdo alterado em arquivo existente.
- **rename** — arquivo renomeado.
- **remove** — arquivo deletado.
- **prereqs** — dependências de módulo alteradas.
- **capstone** — escopo de capstone alterado.
- **protocol** — STUDY-PROTOCOL ou MENTOR.md alterado.
- **ref** — adição em reading-list ou elite-references.

---

## 2026

### 2026-04-28 — Refactor: protocolo agnóstico de mentor + atribuição autoral única

- **remove**: `CLAUDE.md` raiz (versão dependente de ferramenta específica). Conteúdo migrado/generalizado em `MENTOR.md`.
- **edit**: `MENTOR.md` reescrito com 4 modos de mentor — A (self), B (peer/cohort), C (suplemento opcional de produtividade, sob restrições), D (hybrid recomendado). Sem nomear ferramentas específicas.
- **edit**: limpeza de referências a ferramentas/fornecedores de IA específicos em todo o repo (README.md, PROGRESS.md, STUDY-PROTOCOL.md, capstones, metas). Linguagem agnóstica ("o mentor", "você", voz passiva). Referências técnicas legítimas em S10 (módulo sobre LLM systems), elite-references e reading-list (recursos de estudo) preservadas.
- **edit**: `RELEASE-NOTES.md` — seção "Agradecimentos" substituída por "Autoria" (Nicolas De Nigris, único autor; síntese baseada em fontes canônicas).
- **add**: `DECISION-LOG.md` DL-017 — atribuição autoral única; ferramentas usadas no processo são instrumento, não co-autor.
- **edit**: `DECISION-LOG.md` DL-005 reescrito como "Mentor flexível com modos self / peer / suplemento opcional"; entries que mencionavam ferramenta específica generalizadas.
- **edit**: `INDEX.md` — contagem de raiz ajustada pra 4 arquivos (README, MENTOR, PROGRESS, STUDY-PROTOCOL); CLAUDE.md removido das listas.
- **protocol**: protocolo de mentoria agora é agnóstico — disciplina e rigor independem da ferramenta usada.

### 2026-04-28 — v1.0 SHIPPING

- **add**: `00-meta/RELEASE-NOTES.md` — marco de v1.0 shipping-ready. Documenta o que está pronto, limitações reconhecidas, como começar, filosofia.
- **add**: `00-meta/STUDY-PLANS.md` — 7 templates de plano por cenário (full-time, part-time, weekend, bootcamp grad, Senior→Staff, career switcher, executive).
- **edit**: SPRINT-NEXT.md — SN-007 fechado com audit results dos restantes módulos shallow. Decisão: aprofundamento adicional triggered por uso real, não preemptivamente.
- **status**: framework atinge versão **1.0** — base estável shipping-ready. Modificações futuras são incrementos sobre essa base.

### 2026-04-28 — Sprint 1 batch 1: Depth Leveling em 6 módulos

- **edit**: N04 Data Structures — +10 subseções (B-Tree variants, persistent DS, cache-oblivious, skip list deep, HAMT, LSM-Tree, Bloom math, adjacency variants, Trie variants, Union-Find).
- **edit**: N15 Math Foundations — +8 subseções deep (linear algebra concrete, probability cases, info theory, graphs com complexity, numerical, LA code, optimization, probabilistic DS math).
- **edit**: A02 Accessibility — +4 subseções (WCAG 2.2 critérios, ARIA APG patterns, manual audit checklist, Brasil regional context).
- **edit**: A05 Next.js — +8 subseções (Server Components mental model, RSC payload, streaming deep, Server Actions revalidation/optimistic/transitions, Edge runtime, ISR cache invalidation, Turbopack vs Webpack, errors/instrumentation).
- **edit**: S05 API Design — +7 subseções (GraphQL Federation v2, gRPC streaming bidirectional, BFF, API gateway, Stripe versioning, RFC 7807, comparison side-by-side).
- **edit**: S04 Resilience Patterns — +9 subseções (hedging, adaptive concurrency, backpressure formal, token/leaky bucket math, circuit breaker state machine, bulkhead concrete, failover, chaos engineering, failure budget).
- **gap encerrado**: profundidade desigual no batch identificado em DL-014. Sprint 1 batch 1 entregou 1100+ linhas adicionais nos 6 módulos prioritários. SN-007 audit dos restantes pendente pra batch 2.
- Done log atualizada em SPRINT-NEXT.md.

### 2026-04-28 — Sprint 0.5: Roadmap, Codebase Tours, Stack Comparisons

- **add**: `00-meta/SPRINT-NEXT.md` — backlog de aprofundamento priorizado (Sprints 1-6), com IDs SN-001 a SN-052.
- **add**: `00-meta/CODEBASE-TOURS.md` — 20 guided reading tours de repos canônicos (V8, Postgres, Redis, libuv, React, CockroachDB, K8s scheduler, Linux kernel, Kafka, TigerBeetle, Bevy ECS, Stripe SDK, TLA+ Examples, Tokio, Caddy/nginx, Excalidraw, SQLite, io_uring, Bun, Anthropic Cookbook).
- **add**: `00-meta/STACK-COMPARISONS.md` — mapeamento cross-stack (Node, Java, Python, Ruby, Go, .NET, PHP, Rust, Elixir) cobrindo backend frameworks, concurrency, auth, ORM, testing, observability, deploy, perf, real-time, frontend, mobile, AI/LLM. Reduz bias Node/Postgres do framework.
- **edit**: DECISION-LOG.md — DL-014 (profundidade desigual aceita), DL-015 (multi-stack via comparisons), DL-016 (codebase tours como complemento). Pending questions referenciadas a SPRINT-NEXT IDs.
- **edit**: MENTOR.md §7 + INDEX.md — referências às 3 metas novas adicionadas.
- **gap reconhecido**: depth leveling de N04, N15, A02, A05, S04, S05 ficou em SPRINT-NEXT Sprint 1 (SN-001 a SN-006); não executado neste batch.

### 2026-04-28 — Foundation, Stage 5, Niche specialties, Meta consolidation

- **add**: Stage 5 — Staff/Principal completo (ST01-ST07 + CAPSTONE-staff + README).
- **add**: 16 módulos novos cobrindo lacunas conceituais e domain breadth:
  - Novice: N11 Concurrency Theory, N12 Cryptography Fundamentals, N13 Compilers & Interpreters, N14 CPU Microarchitecture, N15 Math Foundations.
  - Apprentice: A15 Search Engines & IR, A16 Graph Databases, A17 Native Mobile, A18 Payments & Billing, A19 i18n / l10n.
  - Professional: P13 Time-Series & Analytical DBs, P14 Graphics/Audio/Codecs, P15 Incident Response, P16 Estimation & Planning, P17 Accessibility Testing, P18 Cognitive Accessibility.
  - Senior: S13 Streaming & Batch, S14 Formal Methods (TLA+), S15 OSS Maintainership, S16 Product/Business/Unit Economics.
  - Staff specialties: ST08 Hardware Design, ST09 Bioinformatics & Scientific Computing, ST10 Game Development Pipeline.
- **add**: meta files completos:
  - `00-meta/INDEX.md` — mapa global com DAG.
  - `00-meta/CAPSTONE-EVOLUTION.md` — Logística v0→v1→v2→v3→v4.
  - `00-meta/GLOSSARY.md` — termos técnicos canônicos.
  - `00-meta/MODULE-TEMPLATE.md` — template oficial.
  - `00-meta/SELF-ASSESSMENT.md` — questionário de calibração inicial.
  - `00-meta/CHANGELOG.md` — este arquivo.
  - `00-meta/INTERVIEW-PREP.md` — mapping módulos → entrevistas tier-1.
  - `00-meta/ANTIPATTERNS.md` — anti-patterns cross-cutting.
  - `00-meta/DECISION-LOG.md` — decisões de design do próprio framework.
- **add**: `README.md` raiz com overview, FAQ, próximos passos.
- **protocol**: STUDY-PROTOCOL.md §12-§16 adicionados — spaced re-test, paper reading, public capstone, cohort/peer, journal de descobertas.
- **edit**: PROGRESS.md — todas tabelas refletem módulos novos; novos logs (Spaced Re-Test Log, Paper Reading Log, Journal, Public Output Tracking, Mentorship Tracking) e seção Personal Stack.
- **edit**: MENTOR.md §7 atualizado com 5 estágios e contagens corretas; protocolos transversais documentados.
- **edit**: cada stage README com novos módulos e trilhas paralelas atualizadas.
- **ref**: `elite-references.md` expandido com repos novos por módulo (Crafting Interpreters, parking_lot, libsodium, perf, NumPy, Meilisearch, OpenSearch, pgvector, Memgraph, AGE, Stripe SDK/CLI, Swift evolution, Compose, FormatJS, i18next, Yjs, ClickHouse, TimescaleDB, DuckDB, deck.gl, ffmpeg, axe-core, Pa11y, Flink, Spark, dbt-core, Iceberg, etcd raft, TLA+ Examples, FastAPI, build-your-own-x, Excalidraw, Zephyr, ESP-IDF, embedded-hal). Indivíduos novos: Tanya Reilly, Patrick McKenzie, Dan Luu, Sara Soueidan, Adrian Roselli, Murat Demirbas, Chip Huyen, Lara Hogan, Gergely Orosz, Preshing.
- **ref**: `reading-list.md` expandido com livros canônicos por todos os módulos novos + papers foundational adicionados (PageRank, End-to-End Arguments, Tail at Scale, Architecture of a Database System, C-Store, Spanner, Byzantine Generals, FLP, AWS Formal Methods).
- **prereqs** explícitos por módulo novo (ver INDEX.md).

### 2026-04-28 — Initial framework

- **add**: Foundation — MENTOR.md, PROGRESS.md, STUDY-PROTOCOL.md.
- **add**: `framework/00-meta/elite-references.md` e `reading-list.md` (versão inicial).
- **add**: Estágio 1 — Novice (N01-N10 + CAPSTONE-novice + README).
- **add**: Estágio 2 — Apprentice (A01-A14 + CAPSTONE-apprentice + README).
- **add**: Estágio 3 — Professional (P01-P12 + CAPSTONE-professional + README).
- **add**: Estágio 4 — Senior (S01-S12 + CAPSTONE-senior + README).

---

## Como manter

Sempre que tocar arquivo do framework:

1. Adicione 1 linha em formato `### YYYY-MM-DD — descrição curta`.
2. Lista bullets de mudanças com tipo prefix.
3. Não edite linhas antigas (append-only).
4. Para mudanças triviais (typo fix, link ajustado), agrupe em entry semanal/mensal.

Se quebrou contrato (renomeou módulo cited em outros, mudou prereqs, mudou semantic de portão), documente impact e migration:

```
### 2026-XX-XX — Renamed N02 → N02-os-internals
- **rename**: N02-operating-systems.md → N02-os-internals.md.
- **migration**: 12 cross-references em outros módulos atualizadas.
- **migration**: PROGRESS.md, INDEX.md, stage README atualizados.
```

Daqui a 1 ano, este arquivo é o único jeito de saber o que mudou e quando.
