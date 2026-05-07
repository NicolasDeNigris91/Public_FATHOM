---
module: 05-02
title: Multi-Domain Capstones, Fintech, Real-Time, ML Pipeline, Marketplace
stage: amplitude
prereqs: [senior-complete]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 05-02, Multi-Domain Capstones

## 1. Problema de Engenharia

Logística cobre um domínio (transactional + marketplace + multi-tenant). Mas Staff/Principal real navegou **múltiplos domínios** com shapes distintos: fintech (correctness, regulação, ledger), real-time (low latency, peer-to-peer), ML pipeline (feature engineering, training, serving, drift), high-write analytics (event streams, dashboards), pure SaaS (org/seats/subs).

Ficar bom em apenas um domínio limita carreira: você vira "engenheiro de logística", não "Staff Engineer". Quando muda de empresa, precisa re-aprender vocabulário e padrões.

Este módulo é executar **3 capstones rápidos** em domínios fora-da-Logística, cada um focado em **um shape arquitetural distinto**. Não pretende terminar produto pronto pra mercado; pretende construir sistema funcional que cubra os patterns canônicos do domínio em ~6-10 semanas cada. Output: 3 repos extras, 3 ADR sets, 3 retros.

Os capstones são intencionalmente diferentes uns dos outros pra forçar movimento entre mental models. Se Logística é "marketplace transactional", Fintech é "correctness + regulação", Real-Time é "latency-bound + peer-to-peer", ML Pipeline é "data + feedback loops".

---

## 2. Teoria Hard

### 2.1 Por que 3 e não 1

1 capstone deep = expertise em 1 domínio.
3 capstones broad = vocabulário em N domínios + ability to spot common patterns.

Trade-off: 3 mais shallow > 1 mais deep. No nível Staff, você precisa mais de **breadth + transferência** do que mais um deep dive.

### 2.2 Capstone 1: Fintech, Personal Finance Tracker com Open Banking

Shape: high correctness, regulated, multi-currency, double-entry, audit trail.

Escopo:
- Conexão a banks via aggregator (Plaid/Belvo/Pluggy sandbox), pull transactions.
- Categorização automática + regras user-defined.
- **Ledger** (revisita 02-18) com double-entry.
- Multi-currency com FX rates daily.
- Goals & budgets com alerts.
- Reports: cash flow, net worth, P&L.
- Compliance: encryption at rest, PII handling, audit log.

Tech stack: Postgres + TypeScript backend + React frontend + chart lib.

Patterns canônicos a praticar:
- **Idempotency** em ingestion de transactions.
- **Reconciliation**: balance from aggregator vs ledger sum.
- **Time-series financial**: hot path daily, OLAP weekly.
- **Encryption** field-level.
- **Audit**: append-only log de mudanças.
- **Currency math**: bigint + FX.

ADRs:
- Aggregator escolha (Plaid vs Belvo vs custom).
- Categorization (rules vs ML).
- Multi-currency normalization point.

Out of scope: real bank credentials (use sandbox), full regulatory compliance (LGPD pesa, simulate).

### 2.3 Capstone 2: Real-Time, Collab Whiteboard (Excalidraw-clone)

Shape: low-latency, OT/CRDT, peer awareness, multimedia.

Escopo:
- Canvas multi-user com shapes, freehand, text.
- **CRDT** (Yjs ou Automerge) pra sincronização.
- **Awareness**: cursors, selections de outros users em real-time.
- **Persistence**: snapshots periódicos + log de operations.
- **Permissions**: read-only links, edit links, ownership.
- **Embed support**: GIF, image upload com 04-03/MinIO.
- **Export**: PNG, SVG.

Tech stack: TypeScript + WebSocket server + Yjs + Canvas/WebGL (03-14 conexão) + Postgres.

Patterns:
- **CRDT** vs OT trade-off.
- **WS reconnect** com replay de operations.
- **Backpressure**: cliente lento não atrasa fast clients.
- **Conflict-free**: nunca block edits.
- **Eventual consistency**: pode ver state divergent por ms.

ADRs:
- CRDT lib choice (Yjs vs Automerge).
- Persistence frequency (every op vs snapshot).
- Authorization model.

Out of scope: production-grade rendering perf, SSO enterprise.

### 2.4 Capstone 3: ML Pipeline, Document Q&A com RAG

Shape: data pipeline, feature engineering, model serving, evaluation, feedback loop.

Escopo:
- **Ingestion**: PDF/HTML/Markdown → text extraction → chunking.
- **Embedding**: gera vetores via API (OpenAI ou local model).
- **Index**: pgvector + metadata.
- **Retrieval**: hybrid (BM25 + vector, 02-15 conexão).
- **LLM call**: provider API com prompt engineering, citations (ver 04-10).
- **Evaluation**: gold set de QA, métricas (faithfulness, answer relevance, context precision).
- **Feedback**: thumbs up/down, refinement pipeline.
- **Cost tracking**: token usage por query.

Tech stack: Python (FastAPI) ou TypeScript + Postgres + pgvector + LLM API.

Patterns:
- **Chunking** strategies (fixed vs semantic).
- **Hybrid retrieval** com reranking.
- **Prompt versioning**: prompts são código.
- **Evaluation**: subjective domain → suite quantitativa.
- **Cost optimization**: cache, smaller models pra easy queries.
- **Drift**: docs mudam → re-embed.

ADRs:
- Embedding model (closed vs open).
- Chunking approach.
- LLM (model + provider + fallback).

Out of scope: training own model, fine-tuning sério.

### 2.5 Capstones alternativos

Se um dos 3 não atrai:
- **Marketplace social** (Etsy/Airbnb-like): mas cuidado de não duplicar Logística.
- **Real-time multiplayer game**: networking, prediction, lag compensation.
- **Healthcare records**: HIPAA-style compliance, FHIR.
- **Logistics differente**: otimização (VRP, Vehicle Routing Problem) com OR-Tools.
- **Devtool**: IDE plugin, CLI tool, observability sidecar.
- **Edge**: deploy em CDN/edge runtimes (Cloudflare Workers).

Substitua um. Mantenha 3 com shapes distintos.

### 2.6 Tempo e cadência

- 6-10 semanas por capstone, evening + weekend (depende do tempo disponível).
- Não pretenda lançar produto. Pretenda **aprender padrões**.
- Documente decisões enquanto fresca; lições esmaecem.

### 2.7 Output esperado por capstone

- Repo público com README claro (goals/non-goals, setup, demo gif).
- 5+ ADRs.
- Retro doc (`RETRO.md`).
- 1 blog post explicando design choice mais surpreendente.
- Se possível, link público demo (deploy free tier).

### 2.8 Como evitar burnout

3 capstones extras é muito. Defesas:
- Definir non-goals brutalmente.
- Aceitar incomplete em features secundárias.
- Cada finalizado é vitória; não persiga "perfection".
- Compare com Logística pra calibrar scope.

### 2.9 Conexão com Logística

Aprender em capstone X aplica em Logística:
- Fintech ledger → improve 02-18 patterns.
- CRDT → real-time tracking robust.
- RAG → suporte ao cliente automatizado.

Documente cross-pollination em `CROSS-LEARNINGS.md`.

### 2.10 Mostre

Após cada capstone:
- Update portfolio.
- Apresente em meetup interno ou Twitter/LinkedIn.
- Convide review crítica de pares.

Public output multiplica retorno do capstone.

---

### 2.11 Capstones modernos 2026 — agentic (MCP), on-device AI, tool-use orchestrator

**1. Why.** Capstones do estágio anterior cobrem multi-domain breadth. Em 2026, três frentes alta-leverage emergiram: agentic systems via MCP, on-device AI (privacy + cost), e tool-use orchestration (foundation pra production AI assistants). Cada um sinaliza profile distinto pra hiring market.

**2. Capstone A — Agentic system com MCP (Model Context Protocol).**

- **Goal:** assistente que acessa N data sources via MCP servers, executa tools, mantém context across multi-turn conversations.
- **Background:** MCP é open standard publicado por Anthropic em Nov 2024 — JSON-RPC protocol pra LLM ↔ tool/resource integration. Substitui per-vendor function-calling APIs com layer agnóstico. SDKs oficiais em Python, TypeScript, Go, Java, Rust. Spec em `modelcontextprotocol.io`.
- **Architecture:**
  - **MCP server** (você implementa 2-3): expõe tools (e.g., `query_db`, `search_orders`, `send_notification`) e resources (URIs como `logistics://orders/{id}`).
  - **MCP client**: Claude Desktop, Cursor, ou custom (TS SDK em servidor Node).
  - **Orchestration**: Claude/GPT-4 ↔ MCP client ↔ servers. Conversation state em pgvector/pinecone/chroma.
- **Milestones:**
  1. Stand-alone MCP server (TS) expondo 3 tools + 1 resource.
  2. Test via Claude Desktop config (`claude_desktop_config.json`).
  3. Custom MCP client em TS (sem Claude Desktop).
  4. Multi-server orchestration (servers em data sources diferentes).
  5. Streaming tool results.
  6. Telemetry: log tool calls, latency p95, cost per session.
- **Showcase:** repo público + blog post + screencast demonstrando assistant fim-a-fim.

**3. Capstone B — On-device AI (privacy + cost-conscious).**

- **Goal:** app mobile/desktop que roda LLM local (Llama 3.2 1B, Phi-3.5 mini, Gemma 2 2B) com features production-quality.
- **Stack 2026:**
  - **iOS/macOS** — Apple Foundation Models framework (anunciado WWDC24, GA iOS 18.1+); MLX (framework da Apple pra Apple Silicon).
  - **Android** — MediaPipe LLM Inference API; ML Kit GenAI; on-device Gemma via TensorFlow Lite.
  - **Cross-platform** — `llama.cpp`, MLC LLM, ONNX Runtime mobile.
  - **Web** — `transformers.js` (HuggingFace), WebLLM (CMU MLC).
- **Use cases:** offline mode (camping, flights), privacy-sensitive (medical, legal), cost-zero inference, latency-zero startup.
- **Trade-offs:** modelo small → quality gap vs cloud GPT-4/Claude. Battery drain. Storage (1B model = ~500MB-2GB).
- **Milestones:**
  1. Pick task narrow: summarization, classification, FAQ.
  2. Quantize model (4-bit, GGUF format).
  3. Benchmark device (latency, RAM peak, battery delta).
  4. Hybrid mode: local first, cloud fallback se confidence baixa.
  5. Eval pipeline (golden set, regression check em new model versions).
- **Real numbers 2026 (cite `llama.cpp` benchmarks):** Llama 3.2 1B 4-bit ~600MB; iPhone 15 Pro tokens/sec ~30; Pixel 8 tokens/sec ~25.

**4. Capstone C — Production tool-use orchestrator.**

- **Goal:** sistema que recebe natural language request → planeja → executa multi-step (DB queries, API calls, file ops) → reporta resultado com citations.
- **Stack:**
  - **LLM:** Anthropic Claude 4 (Sonnet/Opus 2025-2026) com tool-use API; OpenAI GPT-4o/GPT-5; Llama 3 self-hosted via vLLM.
  - **Orchestration:** LangChain (legacy padrão), LangGraph (state machines), Anthropic SDK direto (mais simples), DSPy (declarative).
  - **Storage:** Postgres + pgvector pra conversation, Redis pra cache, S3 pra artifacts.
  - **Observability:** Langfuse (LLM-specific OSS), Helicone, Datadog LLM.
- **Patterns 2026:**
  - **ReAct loop** — Reason + Act, multi-step planning.
  - **Tool selection** — function-calling vs JSON mode vs MCP.
  - **Retry com self-critique** — Reflexion-style.
  - **Streaming** — partial responses + tool call previews.
  - **Cost tracking** — per-conversation budget, alert > $X.
- **Milestones:**
  1. Single-turn function call.
  2. Multi-turn conversation com state persistence.
  3. 5+ tools registered (DB, API, filesystem, web search).
  4. Error handling + retries + circuit breakers.
  5. Eval suite (success rate, latency p95, cost per query).
  6. Production deploy + monitoring dashboard.

**5. Comparison matrix.**

| Capstone | Hardest | Easiest | Best signal pra | Time |
|---|---|---|---|---|
| MCP agentic | Multi-server orchestration | Single MCP server | AI infra eng | 2-3 mo |
| On-device AI | Quantization + benchmarking | Hybrid local+cloud | Mobile + ML eng | 2 mo |
| Tool-use orchestrator | Production reliability | Single function call | LLM application eng | 3-4 mo |

**6. Anti-patterns numerados (10):**
1. MCP server sem error handling padronizado — Claude Desktop logs tool errors silencioso, debug brutal.
2. On-device LLM sem quantization — modelo full precision não cabe RAM do device.
3. Tool-use sem timeout — slow API call trava agent loop indefinidamente.
4. ReAct loop sem max steps — agent fica preso em "I need to reason about..." infinito.
5. LangChain como hammer pra todo agent — abstração leak; muitas vezes Anthropic SDK direto é simpler e mais debugável.
6. Capstone com 1 LLM provider único — vendor lock-in; teste 2+ pra prova de portabilidade.
7. Sem eval pipeline — você não sabe quando model upgrade quebra production.
8. Hybrid local+cloud sem fallback claro — UX confuso, debug impossível.
9. Cost ignored — $1k surprise bill. Implement budget guards Day 1.
10. Capstone sem deploy real (só local notebook) — não testa production realities (cold start, rate limits, observability gap).

**Logística applied (1 paragraph):** capstone v3 (sistemas) AI assistant pra lojista usa MCP pattern: 3 servers (`logistics-orders`, `logistics-couriers`, `logistics-billing`) + Claude 4 Sonnet client. On-device LLM em courier app (Llama 3.2 1B 4-bit) pra summarize daily route offline. Tool-use orchestrator pra "criar order de voz" → transcribe → parse → confirm → create.

**Cruza com:** `04-10` (LLM tooling deep), `04-08` (services arch — MCP servers como microservices), `02-17 §2.20` (Apple Intelligence on-device + KMP), `05-04 §2.15` (LLM papers reference), `05-01 §2.16` (toy GPT como fundamento conceitual).

**Fontes:** MCP spec at `modelcontextprotocol.io` (Nov 2024 launch); Apple Foundation Models WWDC24; MediaPipe LLM Inference docs; `llama.cpp` benchmarks; Anthropic Claude docs; LangGraph docs.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Justificar 3-broad sobre 1-deep no nível Staff.
- Listar shapes arquiteturais distintos cobertos pelos 3 capstones.
- Identificar patterns canônicos de Fintech.
- Distinguir CRDT vs OT, e por que CRDT vence em distribuído.
- Listar componentes de RAG pipeline.
- Estabelecer non-goals pra cada capstone.
- Estimar effort honestamente.
- Conectar lessons cross-domínio.

---

## 4. Desafio de Engenharia

Executar **3 capstones** completos seguindo §2.2-§2.4 (ou substituições justificadas).

### Especificação

Para cada capstone:
1. **Repo separado** com nome distinto.
2. **README** com goals, non-goals, demo, run-locally.
3. **Architecture doc** com diagrama.
4. **5+ ADRs** documentando decisions chave.
5. **Tests** cobertura razoável (≥ 70%).
6. **Deploy** em free tier (Railway, Vercel, Fly).
7. **Retro doc** após complete: o que funcionou, o que não, lessons.
8. **1 blog post** explicando design choice mais saliente.

Cross:
- `CROSS-LEARNINGS.md` consolidado: padrões comuns, surpresas, transferências pra Logística.
- Apresentação interna (1h) cobrindo os 3.

### Restrições

- Cada capstone tem shape distinto (não 3 versões de marketplace).
- Non-goals explícitos. Não vire produto.
- Sem copiar código de SaaS existente; inspirar ok.
- Idempotente / clean shutdown / observability mínimo em cada (não toy quality em deployment).

### Threshold

- 3 capstones completos.
- 3 retros + 3 blog posts.
- `CROSS-LEARNINGS.md`.
- Apresentação realizada.

### Stretch

- 4º capstone se você é máquina (não recomendo).
- Open source com expectativas claras (04-15).
- Submission a conferência por capstone mais interessante.
- Mentor outro engineer através de um deles (overlap com 05-06).

---

## 5. Extensões e Conexões

- Liga com **CAPSTONE-fundamentos/apprentice/professional/senior**: variation domain.
- Liga com **02-18** (payments): fintech capstone reuses ledger.
- Liga com **02-14** (real-time): whiteboard capstone exercise WS.
- Liga com **02-15** (search): RAG depende de hybrid retrieval.
- Liga com **04-10** (AI/LLM): RAG é caso central.
- Liga com **03-14** (graphics): whiteboard renderiza canvas.
- Liga com **05-05** (public output): blog posts derivam.
- Liga com **05-06** (mentorship): tutorar outro pelo seu capstone.

---

## 6. Referências

- **"The Pragmatic Programmer"**: Hunt, Thomas. Generalist mindset.
- **Excalidraw codebase** ([github.com/excalidraw/excalidraw](https://github.com/excalidraw/excalidraw)).
- **Yjs docs** ([yjs.dev](https://yjs.dev/)).
- **"Designing Data-Intensive Applications"**: repeatedly.
- **"Building LLM Applications for Production"**: Chip Huyen.
- **"Practical MLOps"**: Noah Gift.
- **OpenBB / GoCardless / Pluggy** docs (open banking).
- **"Real-World Cryptography"**: Wong (fintech security).
- **"The Phoenix Project"**: Gene Kim. DevOps mindset.
- **Engineering blogs**: Stripe, Notion, Figma, Replit, Vercel.
