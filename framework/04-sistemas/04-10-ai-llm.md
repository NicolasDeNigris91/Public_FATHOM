---
module: 04-10
title: AI/LLM em Sistemas, Inference, RAG, Agents, Embeddings, Evals
stage: sistemas
prereqs: [04-05]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 04-10, AI/LLM em Sistemas

## 1. Problema de Engenharia

Em 2026, "AI feature" é cobrança em quase todo produto. A maioria das implementações é frágil: prompts hardcoded em strings, sem versioning; sem evals; latency 30s sem streaming; vazamento de PII pra provider; rate limit ignorado; cost imprevisível. Frente a frente com production reality, "ChatGPT mas pro nosso uso" frequentemente não passa do MVP.

Este módulo é AI/LLM como engenheiro de sistemas vê: APIs (Anthropic Claude, OpenAI, Gemini, open-source), token economy, streaming, structured outputs, function calling, RAG, embeddings, vector DBs, agents, evals, observability LLM, custo, segurança/PII. Não é curso de ML; é engenharia de software com modelos de linguagem como deps.

---

## 2. Teoria Hard

### 2.1 LLM como dep externa

Trate como qualquer dep externa:
- Latência variável (1-30s típicos).
- Falhas transientes.
- Rate limits.
- Cost por chamada.
- Versionamento (Claude 4.7, GPT-5, etc., modelos evoluem; prompts viram brittle se não versionados).
- Outputs não-determinísticos.

Aplicar resilience patterns (04-04): timeouts, retries em transient errors, circuit breaker, idempotency keys, fallback (modelo menor ou cached response).

### 2.2 Modelos disponíveis em 2026

- **Anthropic Claude**: Opus 4.7 (high-end), Sonnet 4.6 (balanced), Haiku 4.5 (fast/cheap). 1M context comum. Ferramentas de agent (computer use, tool use) avançadas.
- **OpenAI**: GPT-5 family. Strong reasoning, broad ecosystem.
- **Google Gemini**: 2 Pro, Ultra. Integração Workspace.
- **Meta Llama** (open weights): roda self-hosted. Mistral, Qwen, DeepSeek similar.
- **Especializados**: Cohere (embeddings), Mistral, Stability (diffusion).

Trade-off: API pago e top-tier vs self-hosted barato com mais ops.

### 2.3 Tokens e custo

Modelos cobram por **token** (input + output). Token ≈ 4 chars em inglês, menos em português.

Preços ordens de grandeza (2026, sujeito a):
- Top-tier (Opus, GPT-5): $3-15/1M input, $15-75/1M output.
- Mid (Sonnet, Gemini Pro): $1-5 / $5-15.
- Small (Haiku, Mistral 7B): $0.10-0.50 / $0.50-2.

Cost = sum(tokens) per request × volume. Em SaaS, isso vira parcela material da bill.

### 2.4 Prompt caching

Anthropic e similares oferecem cache de prefix prompt: chamadas com mesmo início (system prompt, instructions longas, RAG context) reusam tokens cached, reduzindo cost 80-90% em hit.

Implementar: marca cache breakpoints na request. Em Logística com prompt sistema longo (regras do domínio, examples), cache vira no-brainer.

### 2.5 Streaming

LLM produz tokens sequencialmente. UI deve streaming pra evitar 10s+ de "loading":
- SSE: padrão. ChatGPT-style.
- WebSocket: bi-direcional.
- Server emite tokens conforme chegam do provider.

UX: user vê texto aparecer; perceived latency drasticamente menor.

### 2.6 Structured outputs e function calling

Em vez de "chat" livre, force formato:
- **JSON mode**: provider garante saída JSON valid.
- **Schema-validated**: provider segue Zod/JSON Schema.
- **Function calling / tool use**: LLM "chama" funções com argumentos tipados; app executa e retorna result; LLM continua.

Function calling é o que permite **agents** robustos. Exemplo:
```
User: "Reagende minha entrega de amanhã pra quinta."
LLM (tool call): findOrders(customer="...", date="2026-04-29")
App executes; returns orders.
LLM (tool call): rescheduleOrder(orderId="...", newDate="2026-05-01")
App executes; returns confirmation.
LLM: "Reagendei pra quinta-feira, 1º de maio."
```

Exige tool definitions claras (name, description, params schema). E código robusto que executa as tools.

### 2.7 Context window management

Modelos têm limit de tokens (8k, 32k, 200k, 1M). Conversas longas excedem. Estratégias:
- **Truncation**: drop mensagens antigas.
- **Summarization**: compactar histórico em resumo.
- **Retrieval**: extrai apenas peças relevantes (RAG).

Em apps de produção, gerenciar context é tarefa de engenharia.

### 2.8 RAG, Retrieval Augmented Generation

LLM não sabe seu domínio. RAG alimenta LLM com contexto relevante:
1. Documents (KB, Logística policies, FAQ) chunked e embedded.
2. Embeddings armazenados em vector DB.
3. Query do user → embed → find top-K similar chunks.
4. Inject chunks em prompt → LLM responde grounded.

Eficácia: RAG bem feito reduz hallucination, aumenta accuracy.

Embeddings:
- **OpenAI text-embedding-3-large**, **Cohere embed-v3**, **Voyage AI**.
- **Open-source**: Sentence-Transformers, jina-embeddings.
- Dimensões: 384, 768, 1024, 1536, 3072, maior = mais expressivo, mais storage.

Vector DBs:
- **pgvector** (Postgres extension), para muitos casos é suficiente. Indexes IVFFlat, HNSW.
- **Qdrant, Weaviate, Milvus**: dedicated.
- **Pinecone**: managed.

### 2.9 RAG advanced

- **Hybrid search**: combine vector similarity + BM25/lexical.
- **Reranking**: retrieve top 50 com vector, rerank com modelo cross-encoder, pega top 5.
- **Query rewriting**: LLM reformula query do user antes de retrieve.
- **Multi-hop**: retrieve → reason → retrieve again.
- **Chunking strategy**: too small → context fragmentado; too big → noisy. 200-500 tokens com overlap é heurística.

### 2.10 Agents

Pattern: LLM decide ações em loop:
1. Observe (state, último output).
2. Think (reason).
3. Act (call tool ou final response).
4. Repeat.

Frameworks:
- **Anthropic Agents SDK**: tool use + computer use.
- **OpenAI Agents SDK**.
- **LangChain / LangGraph**: popular mas overkill em apps simples.
- **Vercel AI SDK**: alta DX, focused em apps.
- **Mastra**, **Inngest agent kit**: alternativas.

Riscos: loops infinitos, hallucinated tools, costs explodem. Adicionar:
- Max iterations.
- Cost budget per session.
- Tool whitelist.
- Human-in-loop pra ações sensitive (transferir dinheiro etc.).

### 2.11 Evals

Sem eval, você não sabe se prompt mudou pra melhor ou pior.

- **Golden dataset**: input → expected behavior (não exact match; rubric).
- **LLM-as-judge**: outro modelo avalia qualidade output.
- **Trace-based eval**: capture production traces, eval em batch.
- **A/B test em produção**: 2 versões, métricas user (thumbs, retention).

Tools: **Braintrust**, **LangSmith**, **PromptLayer**, **Phoenix**, **Inspect AI**.

Without evals = fly blind.

### 2.12 PII e segurança

LLM provider sees prompt content. Implicações:
- **Não envie PII desnecessária**.
- Mask/redact antes de send.
- Provider terms: alguns retêm pra training (opt-out via API tier).
- Compliance: HIPAA, GDPR, LGPD impose rules.

**Prompt injection**: user input que sobrepõe instructions. Defense:
- Separe system prompt de user input claramente.
- Validate output (não exec arbitrário).
- Sanitize injected context (RAG sources).

OWASP Top 10 LLM publicado.

### 2.13 Observability LLM

- Trace cada call: prompt, response, tokens, cost, latency, model version.
- Cost dashboards.
- Quality metrics (eval scores).
- User feedback (👍/👎).
- Hallucination tracking (eval + human review).

OTel + tools (LangSmith, Helicone, Langfuse).

### 2.14 Self-hosted inference

Vença custo + privacy. Espectro de maturidade:
- **Ollama**: dev local, prototyping. Não é production engine.
- **llama.cpp**: CPU + edge devices (laptops, Raspberry Pi 5, mobile via MLC). Quantização GGUF (4-bit, 5-bit) viabiliza Llama 3.1 8B em laptop com 16GB RAM.
- **vLLM**: production grade, throughput high (PagedAttention). Default serving engine pra Llama, Mistral, Qwen self-hosted.
- **TGI** (HuggingFace Text Generation Inference): vLLM-compete, ecossistema HF.
- **SGLang**: emergente em 2025, structured outputs eficientes.
- **GPU clusters**: H100 (~$2-4/h on-demand AWS), H200, B200 (Blackwell, 2025+), A100 (legado, mais barato).

**Quantização** é o multiplicador silencioso: GGUF Q4_K_M roda Llama 3.1 70B em uma única H100 80GB com perda de qualidade ~2-3% em benchmarks. Q8 ~zero perda, dobra de RAM.

**Middle ground (managed inference de open weights)**:
- **Replicate**, **Together AI**, **Fireworks**, **Anyscale**, **HuggingFace Inference Endpoints**: você roda Llama/Mistral/Qwen com SLA, sem operar GPU. Custo ~30-50% acima de DIY mas zero ops.

**Decisão pragmática:**
- Default: **managed (Anthropic / OpenAI)**. Tempo é mais caro que tokens.
- Privacy law strict (HIPAA, EU data residency em casos extremos): managed open-weights em região correta, ou DIY.
- Volume estável > 100M tokens/dia + perfil tolerante a hosting: DIY vLLM em H100 reservada começa a ganhar.
- Edge / offline (mobile, on-device): llama.cpp + quantização.

Fine-tuning de modelo small (7B-14B) via **LoRA** ou **QLoRA** em 2026 custa ~$200-1000 em compute e cabe em 1 H100. Antes de Anthropic/OpenAI fine-tuning, considere se LoRA em Llama/Qwen + serving próprio resolve.

### 2.15 Fine-tuning vs prompt engineering

- **Prompt engineering**: refinar instructions. Cheap, fast iteration.
- **Few-shot**: exemplos no prompt.
- **RAG**: fundament em data própria.
- **Fine-tuning**: ajusta weights. Custoso, requer dataset bom.

Default: prompt + RAG. Fine-tune só com dataset robusto (10k+) e razão clara.

### 2.16 Costs em scale

App popular com LLM como core feature passa de $10k/mês trivialmente. Ordem de magnitude (preços públicos Anthropic em 2026, Sonnet 4.6 como referência):

- **Sonnet 4.6**: ~$3/M input + $15/M output. Conversa típica de chat (2k input + 500 output) = ~$0.014/turn. 1M turns/mês = $14k.
- **Haiku 4.5**: ~$0.80/M input + $4/M output. ~5x mais barato que Sonnet. Use pra triagem, classificação, tools simples.
- **Opus 4.7**: ~$15/M input + $75/M output. Reserve pra raciocínio profundo, agentes longos, code edition crítico.

**Prompt caching (Anthropic ephemeral cache)**: cache hit cobra ~10% do preço de input. Em SaaS com **system prompt de 5k tokens reutilizado** em 100k requests/dia:
- Sem cache: 5000 × 100000 × $3/M = **$1.500/dia**.
- Com cache (90% hit rate): 0.1 × 5000 × 100000 × $3/M + cache write = **~$165/dia**.
- Economia: ~$40k/mês em uma única feature. **Faça primeiro, antes de qualquer otimização**.

**Padrões adicionais por ordem de impacto:**
1. **Model tiering** (Haiku triagem → Sonnet default → Opus só hard cases). Pode cortar 60-80% se a distribuição for skewed.
2. **Semantic cache**: embedding da query, lookup similar > 0.95 cosine, retorna resposta cached. Funciona em FAQs, suporte L1.
3. **Output truncation**: `max_tokens` apertado evita modelo viajar; cobre via `stop_sequences`.
4. **Streaming + early stop**: client cancela stream quando UX já tem o suficiente (botão "para" ou heuristic).
5. **Batch API** (Anthropic Message Batches): 50% off pra workloads não-real-time (jobs noturnos, backfills).
6. **Rate limit por tenant + free tier limits**: protege bill explosion por abuso (1 user disparando 1k chamadas/min).

**Observability cost trap**: tracing toda chamada LLM com prompt + response inteiro multiplica span size por 10-100x vs span normal. Use **head-based sampling** (full conversation amostra) ou **tail-based** (samp anomalias: erro, latência > p99, custo > X). Senão observability cost ultrapassa LLM cost.

### 2.17 Latency considerations

Números típicos 2026 (Anthropic Sonnet 4.6, 1k input tokens):

| Métrica | Sem otimização | Com otimização |
|---|---|---|
| Time to first token (TTFT) | 800-2000ms | 200-500ms (cache hit + region próxima) |
| Throughput per stream | 30-100 tok/s | mesmo (model-bound) |
| Prompt cache hit latency | — | ~10-30% redução em TTFT |

**Streaming via SSE muda tudo na UX**: TTFT é o que o usuário sente. Cold sync (block até resposta completa) com 5s output total = "lento". Stream mostrando primeiro token em 400ms = "responsivo", mesmo com mesma duração total. **Stream sempre que UX permitir** — só não-stream se workflow exige resposta atomic (ex: structured JSON pra DB write).

Em UX agent multi-step, usuário aguarda sequência de tool calls. Padrões:
- **Status updates explícitos**: "Buscando pedidos…", "Reagendando entrega…" (cada tool call emite UI event).
- **Optimistic preview**: mostre o plano antes de executar ("Vou (1) cancelar este pedido (2) reembolsar (3) notificar — confirma?"). Reduz wait perceptual.
- **Parallel tool calls**: quando 2+ tools são independentes, dispare juntos via Anthropic batched tool use (Sonnet 4.6+ suporta nativamente).

Cruza com **02-14** (streaming SSE/WebSocket), **03-09** (perceived latency UX), **04-09** (LLM observability cost trap).

### 2.18 Quando LLM é certo

- Linguagem natural input.
- Classificação fuzzy.
- Resumo, geração de copy.
- Chat assistant.
- Summarization de logs/eventos.
- Code gen ferramental.

### 2.19 Quando NÃO usar LLM

- Lógica determinística (regras de negócio, ifs claros).
- Tarefas onde correctness matters absolute (auth checks, money math).
- Sem eval / sem rubric pra qualidade.
- Operação que precisa < 100ms latency.

Default: LLM como augment, não core decision-maker, em domínios sensíveis.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- LLM como dep externa: 5 traits.
- Token economy + prompt caching.
- Streaming via SSE em LLM responses.
- Function calling + tool use design.
- RAG pipeline em 4 passos.
- Embeddings + vector DB selection.
- Agent loop + safety constraints.
- Eval strategy (golden, LLM-judge, A/B).
- PII handling + prompt injection defense.
- Cost optimization 5 técnicas.

---

## 4. Desafio de Engenharia

Adicionar **AI assistant** ao Logística com production-quality.

### Especificação

1. **Use cases**:
   - **Lojista assistant**: chat que responde "quanto faturei essa semana?", "quais pedidos atrasaram?", "reagende #123 pra amanhã" (function calling).
   - **Customer support summarizer**: tickets longos viram TLDR + classification.
2. **Stack**:
   - Anthropic Claude (Sonnet pra dialogo, Haiku pra summarize).
   - SDK oficial (`@anthropic-ai/sdk`).
   - Vercel AI SDK ou similar pra streaming UI (opcional).
   - pgvector pra embeddings de docs internos.
3. **Lojista assistant**:
   - Tool definitions (Zod schemas) pra: `getOrders`, `getReport`, `rescheduleOrder`, `assignCourier`, `getCourierStatus`.
   - Tools call backend Logística APIs (com auth de tenant atual).
   - SSE streaming UI: tokens aparecem progressivamente.
   - Multi-turn conversation com context management (summarize old turns).
   - Max iterations + cost budget per session.
   - Human-in-loop em ações destrutivas (cancel order, refund).
4. **RAG**:
   - Indexa docs internos (policies, FAQ, procedimentos) em pgvector.
   - Antes de responder, retrieve top-3 chunks; inclui em system prompt.
   - Hybrid search (vector + BM25).
5. **Prompt caching**:
   - System prompt com instructions + tool descriptions + few-shot examples cached.
   - Demonstre cache hit rate e cost saving.
6. **Customer support summarizer**:
   - Worker batch: ticket > 1000 chars → Haiku summarize + classify.
   - Resultado salvo em DB.
7. **Evals**:
   - Golden dataset 30 examples (user query → expected tool sequence + reasonable response).
   - Eval runner: roda dataset em CI nightly, score com rubric LLM-judge.
   - Falha CI se score regredir.
8. **Observability**:
   - Trace cada chamada (input, output, tokens, cost, latency).
   - Dashboard: cost per tenant, p99 latency, hallucination rate (manual sampling).
9. **PII + safety**:
   - Mask CPF/email antes de send a provider.
   - Prompt injection defense: user input em XML-tagged section; validate tool args.
   - Rate limit per tenant.
10. **Cost control**:
    - Budget per tenant per day; depois disso, AI features off (graceful).
    - Free tier cap.

### Restrições

- Sem LangChain/LangGraph (force entender protocol direto).
- Sem usar LLM pra autorização (tenant isolation feita por código, não pelo modelo).
- Sem expose secrets em system prompt cacheado (prompt cache é shared no provider).

### Threshold

- README documenta:
  - Diagrama do flow assistant: user → server → LLM → tools → server → user.
  - Tool definitions JSON.
  - Eval results: score atual + histórico.
  - Cost dashboard com cache hit savings.
  - 1 caso prompt injection tentado e bloqueado.
  - Demo: lojista pergunta "qual minha receita semana passada?", assistant retrieves via tools, retorna with breakdown.

### Stretch

- Self-hosted Llama (via vLLM ou Ollama) como fallback quando Anthropic indisponível.
- Fine-tune small model (Mistral 7B) em dataset interno; comparar com prompt-only Claude.
- Voice mode: integrar STT (Whisper) e TTS pra interação por voz.
- Computer use agent: Claude controlando navegador pra automação.
- Semantic cache: requests semanticamente similares retornam cached respose.

---

## 5. Extensões e Conexões

- Liga com **02-09** (Postgres): pgvector pra embeddings.
- Liga com **02-14** (real-time): SSE streaming.
- Liga com **03-05** (AWS): Bedrock pra LLMs managed.
- Liga com **03-07** (observability): trace de cada call, cost dashboards.
- Liga com **03-08** (security): prompt injection, PII masking.
- Liga com **04-04** (resilience): retries, fallback, circuit breaker em provider.
- Liga com **04-05** (API design): tool calling = API design problem.
- Liga com **04-12** (tech leadership): AI roadmap, eval-driven dev culture.

---

## 6. Referências

- **Anthropic docs** ([docs.anthropic.com](https://docs.anthropic.com/)), Claude API, tool use, prompt caching.
- **OpenAI docs**.
- **Vercel AI SDK** ([sdk.vercel.ai](https://sdk.vercel.ai/)).
- **"Building LLM-Powered Applications"**: Vali Aboubakr.
- **Eugene Yan blog** ([eugeneyan.com](https://eugeneyan.com/)), practical LLM eng.
- **Hamel Husain blog**: evals, fine-tuning.
- **OWASP Top 10 for LLM Applications** ([owasp.org/www-project-top-10-for-large-language-model-applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)).
- **Anthropic prompt engineering guide**.
- **Lilian Weng blog (OpenAI)**: agents, RLHF deep dives.
- **Pinecone learning center**: vector DB / RAG patterns.
- **LangSmith / Braintrust / Phoenix docs**: eval tooling.
