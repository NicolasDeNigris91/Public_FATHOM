# CHANGELOG, Mudanças no Framework

> Registro append-only de mudanças no framework. Module added/renamed/removed, prereqs alterados, capstones revisados, protocolos atualizados, referências canônicas adicionadas.
>
> **Não** é changelog de produto Logística (esse é seu repo separado). É changelog **do próprio framework** como artefato.

Formato: `[YYYY-MM-DD] | tipo | descrição` em ordem cronológica reversa (mais recente no topo).

Tipos:
- **add**: módulo, capstone, meta, protocolo novo.
- **edit**: conteúdo alterado em arquivo existente.
- **rename**: arquivo renomeado.
- **remove**: arquivo deletado.
- **prereqs**: dependências de módulo alteradas.
- **capstone**: escopo de capstone alterado.
- **protocol**: STUDY-PROTOCOL ou MENTOR.md alterado.
- **ref**: adição em reading-list ou elite-references.

---

## 2026

### 2026-05-01, Review consolidado + ajustes de profundidade

Audit cross-stage retornou 12 ações prioritárias. Aplicado em 2 ondas neste ciclo:

**Onda 1 — estruturais e críticas:**
- **add** [`framework/00-meta/RUBRIC.md`](RUBRIC.md), critério explícito de pass/fail nos 3 portões com pesos por dimensão e exemplos. MENTOR.md §3 e INDEX.md atualizados pra apontar pra RUBRIC.
- **edit** [`framework/04-sistemas/04-02-messaging.md`](../04-sistemas/04-02-messaging.md) §2.12, Outbox encurtado pra "lado messaging"; ownership do padrão completo movido pra 04-03 §2.8.
- **edit** [`framework/01-fundamentos/01-04-data-structures.md`](../01-fundamentos/01-04-data-structures.md) §2.4, adicionados blocos "Hash function: cryptographic vs distribution" e "Consistent hashing (sharding distribuído)" — fecha gap pré-requisito de 04-09 e 02-11.
- **edit** [`framework/04-sistemas/04-14-formal-methods.md`](../04-sistemas/04-14-formal-methods.md) §2.9, Lean 4 reposicionado como "emergente, não-production-default"; PBT (fast-check, Hypothesis, PropEr) elevado como entrada saudável antes de TLA+.
- **edit** [`framework/01-fundamentos/01-14-cpu-microarchitecture.md`](../01-fundamentos/01-14-cpu-microarchitecture.md) §2.8, expandido com condições de auto-vectorization, AoS vs SoA com exemplo C, e custo invisível de AVX-512 frequency throttling.
- **edit** [`framework/04-sistemas/04-05-api-design.md`](../04-sistemas/04-05-api-design.md) §2.17, webhooks com Idempotency-Key obrigatório, replay defense via timestamp, ordering caveat, referência a AsyncAPI spec.
- **edit** [`framework/04-sistemas/04-08-services-monolith-serverless.md`](../04-sistemas/04-08-services-monolith-serverless.md), nova §2.19 Multi-tenancy (Pool/Bridge/Silo, RLS exemplo, noisy neighbor mitigations, game day Logística); §2.20 com critérios objetivos de extração.
- **protocol** MENTOR.md §3, ponteiro adicionado pra RUBRIC.md.

**Onda 2 — quantificação 2026 e rebalanceamentos:**
- **edit** [`framework/03-producao/03-03-kubernetes.md`](../03-producao/03-03-kubernetes.md) §2.15, Service Mesh expandido com matriz Istio/Linkerd/Cilium/Istio Ambient (overhead, decisão por número de services); §2.18.1 (Alternativas a K8s) movido pra README do estágio.
- **edit** [`framework/03-producao/README.md`](../03-producao/README.md), nova seção "Quando NOT usar K8s" com tabela completa de alternativas (ECS, Nomad, Fly.io, Cloud Run, Kamal), heurística por tamanho de time, e mito vs realidade. Apresentada antes do módulo 03-03 pra evitar K8s por default.
- **edit** [`framework/04-sistemas/04-09-scaling.md`](../04-sistemas/04-09-scaling.md) §2.13, observability cost quantificado (Datadog, CloudWatch, OTel self-hosted) com padrões obrigatórios (head/tail-based sampling, retention tiers); §2.14 com tabela de categorias de custo AWS típicas e ordem de ataque pra cortar conta; §2.16 com números reais de WebSocket connections per server (100k-500k tuning, 1M+ benchmarks Soketi/Centrifugo).
- **edit** [`framework/04-sistemas/04-10-ai-llm.md`](../04-sistemas/04-10-ai-llm.md) §2.14, self-hosted inference com espectro completo (Ollama → llama.cpp → vLLM → SGLang → managed open-weights), quantização GGUF, LoRA/QLoRA pricing; §2.16 com cálculo concreto de prompt caching savings (Sonnet 4.6 system prompt 5k tokens, 90% hit = $40k/mês de economia), model tiering, batch API; §2.17 com tabela TTFT/throughput, streaming UX, parallel tool calls.
- **ref** [`framework/00-meta/reading-list.md`](reading-list.md), anos de edição adicionados em livros canônicos (CS:APP 3rd 2015, CLRS 4th 2022, SICP JS 2022, Effective TS 2nd 2024, Serious Cryptography 2nd 2024); RFCs novos referenciados (RFC 9700 OAuth BCP 2025, WebAuthn L3 2024); AI Engineering (Chip Huyen 2024) substituiu "Building LLM Applications" como referência canônica; Postgres 16 Internals + DDIA 2nd ed beta sinalizados; MCP spec adicionado.

### 2026-04-28, Content gap fill: 24+ subseções novas em 16 módulos

Expansão de conteúdo cobrindo gaps detectados em audit interno. Tópicos atualizados pra 2025-2026 reality.

**Fundamentos (4 módulos):**
- 01-02: §2.4.1 schedulers modernos (CFS→EEVDF Linux 6.6+, Windows Thread Director, hybrid CPUs P/E cores).
- 01-03: §2.6.1 QUIC deep, UDP user-space, 0-RTT replay attack, connection migration, custos vs TCP.
- 01-11: §2.17 modelos de concorrência comparados, CSP/Go vs Actors/Erlang vs async-await/Rust com tabela e quando usar cada.
- 01-12: §2.15 reescrito, NIST PQ standards 2024 (FIPS 203/204/205), TLS hybrid X25519MLKEM768, "harvest now decrypt later".

**Plataforma (5 módulos):**
- 02-04: §2.7 React Compiler deep, modelo mental novo, rules of React, bail-out behavior, migrações práticas.
- 02-07: §2.17 Node vs Bun vs Deno comparação real 2026, tabela de decisão, pegadinhas, veredicto pragmático.
- 02-09: §2.13.1 logical replication uso real (CDC, zero-downtime upgrade, pegadinhas) + §2.14 Postgres 17/18 features.
- 02-13: §2.9 Passkeys/WebAuthn deep, synced vs device-bound vs roaming, server flow, pegadinhas, migration strategy.
- 02-14: §2.14 WebTransport deep, modelo, API client, quando vs WebSocket, server libs 2026.

**Professional (6 módulos):**
- 03-03: §2.18 operators pattern + §2.18.1 alternativas a K8s (ECS, Nomad, Fly, Railway, Cloud Run, Kamal) com heurística pragmática.
- 03-05: §2.3.1 VPC deep, TGW, PrivateLink, egress VPC, IPv6, custos esquecidos. + §2.19 FinOps + §2.20 Sustainability.
- 03-07: §2.16 eBPF observability deep, tools 2026 (Pixie, Tetragon, Parca, Cilium, Coroot, bpftrace, Beyla), quando vale.
- 03-08: §2.17.1 privacy engineering, tokenization, field encryption, RTBF real, differential privacy, k-anonymity, antipatterns.
- 03-10: §2.19 perf JVM/.NET/Go, JIT tiers, GCs, AOT, virtual threads, comparação cross-runtime.
- 03-15: §2.11 chaos engineering tooling deep, Litmus, Chaos Mesh, Gremlin, FIS, Pumba; tipos de injeção; maturity ladder.

**Senior (5 módulos):**
- 04-01: §2.18 CRDT deep, famílias (CvRDT/CmRDT/delta), Yjs/Automerge, limitações, quando usar.
- 04-02: §2.7 Pulsar/Redpanda/NATS JetStream deep com tabela de decisão.
- 04-05: §2.13 tRPC + Connect-RPC, comparação com gRPC clássico e REST, quando escolher.
- 04-13: §2.2.1 streaming SQL incremental, Materialize, RisingWave, vs Flink.
- 04-14: §2.7-2.9 reescritos, P language, Alloy, Lean 4 (mathlib4, Cedar) deep.

**Staff (3 módulos):**
- 05-04: §2.7.1 must-read papers list, 35 papers ordenados por estágio (Plataforma→Staff→Foundations→Data/ML).
- 05-05: §2.2.1 YouTube/podcast como medium, formatos, setup, cadência, quando NÃO usar.
- CAPSTONE-amplitude: Track G, AI Infrastructure Engineer (vLLM, training pipelines, vector DBs prod, evals, GPU cost).

**Cross-cutting:**
- STUDY-PROTOCOL §17: Quarterly Review template com cadência fixa, 3 perguntas brutais, sinais de burnout.
- SPRINT-NEXT entries SN-054 a SN-064 documentando gaps remanescentes (Anki decks, solution sketches, mock interviews, AI Infra track curriculum, etc.).

### 2026-04-28, Site público em apps/site/

- **add**: `apps/site/`, Next.js 16 + React 19 + Tailwind 4 + Framer Motion. Mesma stack/visual do `MyPersonalWebSite`.
- **add**: 12 rotas (`/`, `/stages`, `/stages/[stage]`, `/modules/[id]`, `/progress`, `/now`, `/index`, `/library`, `/glossary`, `/docs/[slug]`, `/about`, `/api/health`).
- **add**: `Dockerfile` multi-stage standalone + `railway.json` apontando pro app. Healthcheck em `/api/health`.
- **add**: `LICENSE` CC BY-NC 4.0.
- **add**: `scripts/validate-content.mjs`, pre-build validation hook (frontmatter + prereqs + links + line count). Flags `--strict`/`--quiet`/`--json`.
- **add**: DECISION-LOG DL-018 documentando decisão de monorepo (site dentro do `FATHOM`).
- **add**: SPRINT-NEXT entry SN-053 done.
- **edit**: site lê `framework/*.md` + raiz `.md` via `fs/promises`. Single source of truth: edição segue sendo `git commit` no Markdown.
- Features: CMD+K palette, mermaid render do DAG, library curada, glossary com search, prev/next nav, reading time, breadcrumbs, mobile menu, prefers-reduced-motion, OG images via next/og.

### 2026-04-28, Refactor: protocolo agnóstico de mentor + atribuição autoral única

- **remove**: `CLAUDE.md` raiz (versão dependente de ferramenta específica). Conteúdo migrado/generalizado em `MENTOR.md`.
- **edit**: `MENTOR.md` reescrito com 4 modos de mentor, A (self), B (peer/cohort), C (suplemento opcional de produtividade, sob restrições), D (hybrid recomendado). Sem nomear ferramentas específicas.
- **edit**: limpeza de referências a ferramentas/fornecedores de IA específicos em todo o repo (README.md, PROGRESS.md, STUDY-PROTOCOL.md, capstones, metas). Linguagem agnóstica ("o mentor", "você", voz passiva). Referências técnicas legítimas em 04-10 (módulo sobre LLM systems), elite-references e reading-list (recursos de estudo) preservadas.
- **edit**: `RELEASE-NOTES.md`, seção "Agradecimentos" substituída por "Autoria" (Nicolas De Nigris, único autor; síntese baseada em fontes canônicas).
- **add**: `DECISION-LOG.md` DL-017, atribuição autoral única; ferramentas usadas no processo são instrumento, não co-autor.
- **edit**: `DECISION-LOG.md` DL-005 reescrito como "Mentor flexível com modos self / peer / suplemento opcional"; entries que mencionavam ferramenta específica generalizadas.
- **edit**: `INDEX.md`, contagem de raiz ajustada pra 4 arquivos (README, MENTOR, PROGRESS, STUDY-PROTOCOL); CLAUDE.md removido das listas.
- **protocol**: protocolo de mentoria agora é agnóstico, disciplina e rigor independem da ferramenta usada.

### 2026-04-28, v1.0 SHIPPING

- **add**: `00-meta/RELEASE-NOTES.md`, marco de v1.0 shipping-ready. Documenta o que está pronto, limitações reconhecidas, como começar, filosofia.
- **add**: `00-meta/STUDY-PLANS.md`, 7 templates de plano por cenário (full-time, part-time, weekend, bootcamp grad, Senior→Staff, career switcher, executive).
- **edit**: SPRINT-NEXT.md, SN-007 fechado com audit results dos restantes módulos shallow. Decisão: aprofundamento adicional triggered por uso real, não preemptivamente.
- **status**: framework atinge versão **1.0**: base estável shipping-ready. Modificações futuras são incrementos sobre essa base.

### 2026-04-28, Sprint 1 batch 1: Depth Leveling em 6 módulos

- **edit**: 01-04 Data Structures, +10 subseções (B-Tree variants, persistent DS, cache-oblivious, skip list deep, HAMT, LSM-Tree, Bloom math, adjacency variants, Trie variants, Union-Find).
- **edit**: 01-15 Math Foundations, +8 subseções deep (linear algebra concrete, probability cases, info theory, graphs com complexity, numerical, LA code, optimization, probabilistic DS math).
- **edit**: 02-02 Accessibility, +4 subseções (WCAG 2.2 critérios, ARIA APG patterns, manual audit checklist, Brasil regional context).
- **edit**: 02-05 Next.js, +8 subseções (Server Components mental model, RSC payload, streaming deep, Server Actions revalidation/optimistic/transitions, Edge runtime, ISR cache invalidation, Turbopack vs Webpack, errors/instrumentation).
- **edit**: 04-05 API Design, +7 subseções (GraphQL Federation v2, gRPC streaming bidirectional, BFF, API gateway, Stripe versioning, RFC 7807, comparison side-by-side).
- **edit**: 04-04 Resilience Patterns, +9 subseções (hedging, adaptive concurrency, backpressure formal, token/leaky bucket math, circuit breaker state machine, bulkhead concrete, failover, chaos engineering, failure budget).
- **gap encerrado**: profundidade desigual no batch identificado em DL-014. Sprint 1 batch 1 entregou 1100+ linhas adicionais nos 6 módulos prioritários. SN-007 audit dos restantes pendente pra batch 2.
- Done log atualizada em SPRINT-NEXT.md.

### 2026-04-28, Sprint 0.5: Roadmap, Codebase Tours, Stack Comparisons

- **add**: `00-meta/SPRINT-NEXT.md`, backlog de aprofundamento priorizado (Sprints 1-6), com IDs SN-001 a SN-052.
- **add**: `00-meta/CODEBASE-TOURS.md`, 20 guided reading tours de repos canônicos (V8, Postgres, Redis, libuv, React, CockroachDB, K8s scheduler, Linux kernel, Kafka, TigerBeetle, Bevy ECS, Stripe SDK, TLA+ Examples, Tokio, Caddy/nginx, Excalidraw, SQLite, io_uring, Bun, Anthropic Cookbook).
- **add**: `00-meta/STACK-COMPARISONS.md`, mapeamento cross-stack (Node, Java, Python, Ruby, Go, .NET, PHP, Rust, Elixir) cobrindo backend frameworks, concurrency, auth, ORM, testing, observability, deploy, perf, real-time, frontend, mobile, AI/LLM. Reduz bias Node/Postgres do framework.
- **edit**: DECISION-LOG.md, DL-014 (profundidade desigual aceita), DL-015 (multi-stack via comparisons), DL-016 (codebase tours como complemento). Pending questions referenciadas a SPRINT-NEXT IDs.
- **edit**: MENTOR.md §7 + INDEX.md, referências às 3 metas novas adicionadas.
- **gap reconhecido**: depth leveling de 01-04, 01-15, 02-02, 02-05, 04-04, 04-05 ficou em SPRINT-NEXT Sprint 1 (SN-001 a SN-006); não executado neste batch.

### 2026-04-28, Foundation, Stage 5, Niche specialties, Meta consolidation

- **add**: Stage 5, Staff/Principal completo (05-01-05-07 + CAPSTONE-amplitude + README).
- **add**: 16 módulos novos cobrindo lacunas conceituais e domain breadth:
  - Fundamentos: 01-11 Concurrency Theory, 01-12 Cryptography Fundamentals, 01-13 Compilers & Interpreters, 01-14 CPU Microarchitecture, 01-15 Math Foundations.
  - Plataforma: 02-15 Search Engines & IR, 02-16 Graph Databases, 02-17 Native Mobile, 02-18 Payments & Billing, 02-19 i18n / l10n.
  - Professional: 03-13 Time-Series & Analytical DBs, 03-14 Graphics/Audio/Codecs, 03-15 Incident Response, 03-16 Estimation & Planning, 03-17 Accessibility Testing, 03-18 Cognitive Accessibility.
  - Senior: 04-13 Streaming & Batch, 04-14 Formal Methods (TLA+), 04-15 OSS Maintainership, 04-16 Product/Business/Unit Economics.
  - Staff specialties: 05-08 Hardware Design, 05-09 Bioinformatics & Scientific Computing, 05-10 Game Development Pipeline.
- **add**: meta files completos:
  - `00-meta/INDEX.md`, mapa global com DAG.
  - `00-meta/CAPSTONE-EVOLUTION.md`, Logística v0→v1→v2→v3→v4.
  - `00-meta/GLOSSARY.md`, termos técnicos canônicos.
  - `00-meta/MODULE-TEMPLATE.md`, template oficial.
  - `00-meta/SELF-ASSESSMENT.md`, questionário de calibração inicial.
  - `00-meta/CHANGELOG.md`, este arquivo.
  - `00-meta/INTERVIEW-PREP.md`, mapping módulos → entrevistas tier-1.
  - `00-meta/ANTIPATTERNS.md`, anti-patterns cross-cutting.
  - `00-meta/DECISION-LOG.md`, decisões de design do próprio framework.
- **add**: `README.md` raiz com overview, FAQ, próximos passos.
- **protocol**: STUDY-PROTOCOL.md §12-§16 adicionados, spaced re-test, paper reading, public capstone, cohort/peer, journal de descobertas.
- **edit**: PROGRESS.md, todas tabelas refletem módulos novos; novos logs (Spaced Re-Test Log, Paper Reading Log, Journal, Public Output Tracking, Mentorship Tracking) e seção Personal Stack.
- **edit**: MENTOR.md §7 atualizado com 5 estágios e contagens corretas; protocolos transversais documentados.
- **edit**: cada stage README com novos módulos e trilhas paralelas atualizadas.
- **ref**: `elite-references.md` expandido com repos novos por módulo (Crafting Interpreters, parking_lot, libsodium, perf, NumPy, Meilisearch, OpenSearch, pgvector, Memgraph, AGE, Stripe SDK/CLI, Swift evolution, Compose, FormatJS, i18next, Yjs, ClickHouse, TimescaleDB, DuckDB, deck.gl, ffmpeg, axe-core, Pa11y, Flink, Spark, dbt-core, Iceberg, etcd raft, TLA+ Examples, FastAPI, build-your-own-x, Excalidraw, Zephyr, ESP-IDF, embedded-hal). Indivíduos novos: Tanya Reilly, Patrick McKenzie, Dan Luu, Sara Soueidan, Adrian Roselli, Murat Demirbas, Chip Huyen, Lara Hogan, Gergely Orosz, Preshing.
- **ref**: `reading-list.md` expandido com livros canônicos por todos os módulos novos + papers foundational adicionados (PageRank, End-to-End Arguments, Tail at Scale, Architecture of a Database System, C-Store, Spanner, Byzantine Generals, FLP, AWS Formal Methods).
- **prereqs** explícitos por módulo novo (ver INDEX.md).

### 2026-04-28, Initial framework

- **add**: Foundation, MENTOR.md, PROGRESS.md, STUDY-PROTOCOL.md.
- **add**: `framework/00-meta/elite-references.md` e `reading-list.md` (versão inicial).
- **add**: Estágio 1: Fundamentos (01-01-01-10 + CAPSTONE-fundamentos + README).
- **add**: Estágio 2: Plataforma (02-01-02-14 + CAPSTONE-plataforma + README).
- **add**: Estágio 3: Produção (03-01-03-12 + CAPSTONE-producao + README).
- **add**: Estágio 4: Sistemas (04-01-04-12 + CAPSTONE-sistemas + README).

---

## Como manter

Sempre que tocar arquivo do framework:

1. Adicione 1 linha em formato `### YYYY-MM-DD, descrição curta`.
2. Lista bullets de mudanças com tipo prefix.
3. Não edite linhas antigas (append-only).
4. Para mudanças triviais (typo fix, link ajustado), agrupe em entry semanal/mensal.

Se quebrou contrato (renomeou módulo cited em outros, mudou prereqs, mudou semantic de portão), documente impact e migration:

```
### 2026-XX-XX, Renamed 01-02 → 01-02-os-internals
- **rename**: 01-02-operating-systems.md → 01-02-os-internals.md.
- **migration**: 12 cross-references em outros módulos atualizadas.
- **migration**: PROGRESS.md, INDEX.md, stage README atualizados.
```

Daqui a 1 ano, este arquivo é o único jeito de saber o que mudou e quando.
