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

Vector DBs em 2026 — matriz de decisão:

| DB | Modelo | Indexes | Hybrid search | Filter perf | Ops | Quando |
|---|---|---|---|---|---|---|
| **pgvector** | Postgres extension | IVFFlat, HNSW (0.5+) | Manual (query joins) | Excelente (Postgres planner) | Zero (já tem Postgres) | Default em 2026 até > 10M vectors ou QPS > 500 |
| **Qdrant** | Rust dedicated | HNSW, scalar quantization | Built-in (BM25 + vector) | Excelente (payload filtering) | Self-host fácil ou managed | Filter-heavy queries, multi-tenant via collections |
| **Weaviate** | Go dedicated | HNSW + variants | Built-in (BM25 + vector + reranker) | Bom | Self-host médio ou managed | Hybrid search nativo, GraphQL API |
| **Milvus** | Go + C++ dedicated | HNSW, IVF, DiskANN, GPU | Built-in (sparse + dense) | Bom em escala | Operação complexa (etcd + minio + 10+ services) | > 100M vectors, throughput extremo |
| **Pinecone** | Managed proprietário | Proprietary | Sparse-dense hybrid | Bom | Zero (managed) | Quer managed e tolera lock-in + custo |
| **Chroma** | Python dedicated | HNSW | Manual | Ok | Self-host simples | Prototyping, single-node, Python-first |
| **LanceDB** | Rust + Apache Arrow | IVF, HNSW | Sim | Excelente em columnar | Embedded ou serverless | Multimodal, dataset grande em S3 |
| **Vespa** | JVM dedicated | HNSW + tensor | Native (BM25 + vector + ML ranking) | Excelente | Operação complexa | Search com ML ranking nativo (Yahoo, Spotify) |

**Heurística pragmática 2026:**
- **< 1M vectors + você já tem Postgres**: pgvector. Simples, transações, joins, sem nova ferramenta.
- **1M-100M + filter-heavy** (multi-tenant, complex `WHERE`): **Qdrant** ou pgvector com índices compostos.
- **> 100M vectors + throughput sustained > 1k QPS**: Milvus, Vespa, ou Pinecone (managed se ops é constraint).
- **Hybrid search nativo importante** (não quer reescrever query layer): Weaviate ou Vespa.
- **Multimodal (imagem + texto + audio)**: LanceDB ou Vespa.

**Anti-padrão**: jogar tudo no Pinecone porque "managed é fácil". Custo escala não-linear; lock-in é real; Postgres pgvector cobre 80% dos casos com dor operacional zero.

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

### 2.20 Agentic patterns operacionais — planner, critic, tool selection

§2.10 introduz agents como conceito. §2.20 entra em **patterns operacionais** que separam agent que sobrevive em produção de protótipo de demo. Três patterns dominam:

- **Planner-executor split**: LLM gera plano declarativo; executor determinístico roda cada step.
- **Critic loop**: segundo LLM avalia output do primeiro pra catch errors antes de execução.
- **Tool selection com retrieval**: catalog indexado escolhe top-k tools relevantes quando inventário > 20.

Cada um endereça modo de falha específico. Combinados, viram backbone de agent operacional.

**Pattern 1: Planner-executor split.** Sem split, LLM "raciocina e age" no mesmo step. Resultado: loop infinito de tool calls, custo explode em minutos, comportamento opaco pra debug. Com split, planner produz JSON/XML estruturado de steps (declarativo, validável); executor (código tradicional) valida schema + roda cada step com observability normal. Vantagens: replay determinístico do mesmo plano, auditoria step-a-step, abort early se step inválido, paralelização de steps independentes.

```typescript
import { z } from 'zod';

const PlanStep = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('lookup_courier'),
    courier_id: z.string().uuid(),
  }),
  z.object({
    action: z.literal('verify_documents'),
    courier_id: z.string().uuid(),
    doc_types: z.array(z.enum(['cnh', 'crlv', 'antecedentes'])),
  }),
  z.object({
    action: z.literal('schedule_orientation'),
    courier_id: z.string().uuid(),
    slot_iso: z.string().datetime(),
  }),
  z.object({
    action: z.literal('notify_courier'),
    courier_id: z.string().uuid(),
    channel: z.enum(['whatsapp', 'sms', 'email']),
    template: z.string(),
  }),
]);

const Plan = z.object({
  reasoning: z.string().max(500),
  steps: z.array(PlanStep).min(1).max(10),
});
```

Executor com budget cap + audit log:

```typescript
async function executePlan(plan: Plan, ctx: Context) {
  const audit: AuditEntry[] = [];
  for (const step of plan.steps) {
    const start = Date.now();
    try {
      const result = await executeStep(step, ctx);
      audit.push({ step, status: 'ok', latency_ms: Date.now() - start, result });
      if (audit.length > 20) throw new Error('Plan exceeded step budget');
    } catch (err) {
      audit.push({ step, status: 'error', latency_ms: Date.now() - start, error: String(err) });
      if (step.action === 'verify_documents') throw err;   // critical: abort
      // soft errors: log + continue (notify failures are non-blocking)
    }
  }
  await db.audit_log.insert({ trace_id: ctx.trace_id, plan, audit });
  return audit;
}
```

Discriminated union no schema = exhaustive switch no executor (TypeScript compiler reclama de step não tratado). Audit log persiste plano + execução pra postmortem. Budget cap (max steps, max latency total, max tool calls) é mandatory; sem ele, agent runaway custa $1000+ em uma noite — caso real, não hipotético.

**Pattern 2: Critic loop (LLM avalia LLM).** Modo de falha: planner produz output sintaticamente válido (passa Zod) mas semanticamente errado — agendou orientation pra horário inexistente, trocou `courier_id` entre steps, escolheu canal `whatsapp` pra courier sem WhatsApp opt-in. Critic é segundo LLM (mesmo modelo ou diferente) que recebe input + output do planner + system prompt focado em "find errors". Output estruturado: `{ valid: bool, errors: [...] }`. Loop: se critic invalida, retry planner com errors como context. Cap em 3 iterações pra evitar custo runaway.

```typescript
import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic();

async function critiquePlan(input: string, plan: Plan): Promise<{ valid: boolean; errors: string[] }> {
  const resp = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',  // critic é mais barato/rápido que planner
    max_tokens: 500,
    system: `Você é um critic agent. Recebe input e plano gerado por outro agent.
Sua tarefa: identificar erros lógicos, datas inválidas, IDs incoerentes, steps fora de ordem.
Retorne JSON: { "valid": bool, "errors": [string] }. Se valid, errors=[].`,
    messages: [{
      role: 'user',
      content: `INPUT:\n${input}\n\nPLAN:\n${JSON.stringify(plan, null, 2)}`,
    }],
  });
  const text = resp.content[0].type === 'text' ? resp.content[0].text : '';
  return JSON.parse(text);
}

async function planWithCritic(input: string, ctx: Context): Promise<Plan> {
  let lastErrors: string[] | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    const plan = await generatePlan(input, ctx, lastErrors);
    const review = await critiquePlan(input, plan);
    if (review.valid) return plan;
    lastErrors = review.errors;
  }
  throw new Error('Failed to produce valid plan after 3 attempts');
}
```

Critic usa modelo mais barato (Haiku 4.5) — heurística sólida: planner Sonnet/Opus, critic Haiku. Em produção: ~10-20% das primeiras tentativas falham critic; retry resolve 70-80% delas; resto vai pra fallback humano. Critic com mesmo modelo + mesmo prompt do planner é anti-pattern: vai concordar com mesmos erros (motivated reasoning). Use modelo diferente OU prompt deliberadamente adversarial.

**Pattern 3: Tool selection com retrieval.** Passar 50 tools no system prompt = context pollution + tool selection ruim. Anthropic e OpenAI documentam degradação acima de ~20 tools. Solução: catalog de tools indexado (vector DB ou keyword search). Pre-step roda LLM cheap pra escolher top-k tools relevantes ao query; main agent recebe só esses k.

```typescript
import { embed } from '@/lib/embeddings';

type ToolDef = {
  name: string;
  description: string;
  embedding?: number[];
  input_schema: object;
};

const allTools: ToolDef[] = [
  { name: 'lookup_courier', description: 'Find courier by id or name', input_schema: {} },
  { name: 'schedule_pickup', description: 'Schedule pickup with available slot', input_schema: {} },
  // ... 50+ tools
];

// Index step (cron / on tool register)
for (const tool of allTools) {
  tool.embedding = await embed(`${tool.name}: ${tool.description}`);
}

async function selectTools(query: string, k = 5): Promise<ToolDef[]> {
  const queryEmb = await embed(query);
  return allTools
    .map(t => ({ tool: t, score: cosineSimilarity(queryEmb, t.embedding!) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(s => s.tool);
}

async function runAgent(query: string) {
  const tools = await selectTools(query);
  return anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    tools: tools.map(({ embedding, ...rest }) => rest),  // strip embedding
    messages: [{ role: 'user', content: query }],
  });
}
```

Embedding model leve (text-embedding-3-small ou cohere embed v3): ~$0.00002 por query, +20ms latency. Combine retrieval + always-include core tools (auth, error handling, escalate_to_human) — top-5 por relevance + 3 fixed. Sem fallback "always include", agent não sabe pedir help quando tools relevantes não foram retrieved.

**Combinando patterns — Logística onboarding agent end-to-end.**

```
User query → Tool retrieval (top-5 + 3 fixed) → Planner LLM (Sonnet 4.6)
           → Critic loop (Haiku 4.5, ≤3 iter) → Executor (audit + budget) → Result
```

Cada bloco é testável isoladamente: planner com golden inputs, critic com adversarial plans, executor com mock context. Custo típico Logística agent (Sonnet 4.6 planner + Haiku 4.5 critic + Sonnet 4.6 main): ~$0.04-0.08 por session, p99 latency 8-15s.

**Anti-patterns observados.**

- Single-LLM "ReAct loop" sem split: opaco, caro, frágil. Refactor pra planner-executor cedo, antes de escala.
- Critic com mesmo modelo+prompt do planner: motivated reasoning. Modelo diferente ou prompt adversarial.
- Sem budget caps: dev deixa rodar overnight, conta vem $2k. Hard cap sempre — max steps, max tokens total, max wallclock.
- Tool retrieval sem fallback "always include": agent sem meta-actions (lookup_help, escalate_to_human) trava silencioso.
- Audit log faltando latency por step: postmortem sobre slow agent fica cego. Sempre persiste latency + tokens por step.
- Critic em loop infinito: cap 3 attempts é mandatory. Acima disso, escalar pra human review com plano + errors.
- Esquecer de logar `reasoning` string do plan: é o ÚNICO sinal de "por que" o plan foi escolhido. Audit sem ela é inútil.

**Quando NÃO usar agentic patterns.**

- Task com path determinístico de 2-3 steps: hard-code, não invoca LLM agent.
- Decisão crítica financeiramente sem human-in-the-loop: agent erra ~5-10% mesmo com critic. Loop humano em ações irreversíveis.
- Latency budget < 2s: planner + critic + executor não cabe; use single LLM call ou rule engine.

Cruza com **04-10 §2.10** (agents fundamentos), **04-10 §2.11** (evals validam patterns end-to-end), **04-10 §2.13** (observability LLM mede agent quality), **03-07 §2.19** (AI ops trace agent steps), **03-08 §2.x** (PII em audit log de agent precisa redaction).

### 2.21 RAG architectures + evaluation harnesses + production patterns

§2.10 introduz RAG como pattern; §2.21 trata como **sistema engenheirado** com camadas mensuráveis. Naive RAG (embed query → top-K vector search → concat → LLM) resolve ~50% das queries em produção. Cada camada subsequente endereça um modo de falha específico, com cost/benefit decay agressivo no topo da stack.

**Spectrum de arquitetura RAG (5 níveis).**

- **L0 Naive**: query → embedding → top-K vector search → concat docs → LLM. ~50% das queries resolvidas. Falha em keyword exact match e queries ambíguas.
- **L1 Hybrid retrieval**: dense (vector) + sparse (BM25) → Reciprocal Rank Fusion (RRF). ~70%. Captura "ERROR_CODE_42" que embedding perde.
- **L2 Rerank**: L1 + cross-encoder reranker (Cohere Rerank v3.5, BGE-reranker). ~80%. Cross-encoder lê (query, doc) joint, embedding lê separado.
- **L3 Query rewriting + multi-query**: LLM gera N variações da query original; retrieval em cada; merge + dedup. +5%.
- **L4 Agentic retrieval**: LLM decide quando/como chamar retrieval, multi-hop, refina via critic. +5%.

Cost vs benefit decay: L0→L1 é o ganho gigante (+20pp por ~1.2x cost); L3→L4 é marginal (+5pp por ~5x cost). Default produção 2026: L2 (hybrid + rerank). Suba pra L3/L4 só com eval suite que prove ganho > 2pp em golden set.

**Hybrid retrieval — Postgres pgvector 0.7+ + tsvector.** Schema único, dois índices, RRF inline:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE docs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('portuguese', content)) STORED
);
CREATE INDEX docs_embedding ON docs USING hnsw (embedding vector_cosine_ops);
CREATE INDEX docs_tsv ON docs USING gin (tsv);
CREATE INDEX docs_tenant ON docs (tenant_id);
```

```sql
-- $1 = query embedding, $2 = query text, $3 = tenant_id
WITH dense AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY embedding <=> $1) AS rank
  FROM docs WHERE tenant_id = $3
  ORDER BY embedding <=> $1 LIMIT 50
),
sparse AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY ts_rank(tsv, plainto_tsquery('portuguese', $2)) DESC) AS rank
  FROM docs WHERE tenant_id = $3 AND tsv @@ plainto_tsquery('portuguese', $2)
  LIMIT 50
)
SELECT id, SUM(1.0 / (60 + rank)) AS rrf_score
FROM (SELECT * FROM dense UNION ALL SELECT * FROM sparse) u
GROUP BY id ORDER BY rrf_score DESC LIMIT 10;
```

`60` é o `k` canônico de RRF (Cormack et al. 2009) — não toque sem eval. RRF é robusto a magnitudes incomparáveis entre dense/sparse scores; é por isso que vence weighted-sum em benchmarks.

**Chunking strategy.** Sweet spot 256-512 tokens, overlap 10-20%. Opções:

- **Fixed-size** (token count): simples, quebra meaning em boundaries arbitrárias. Baseline.
- **Semantic chunking**: split em paragraph/section boundaries (`\n\n`, headings). Respeita estrutura.
- **Recursive splitter** (LangChain pattern): tenta separators em ordem `["\n\n", "\n", ". ", " "]`; cai pra próximo se chunk > limit.
- **Sentence-window**: chunk = 1 sentence; retrieval retorna ±N sentences pra context. Precision alta, context window utilization preservado.
- **Late chunking** (Jina 2024+): embed full doc com long-context model; chunk após embedding. Preserva contextual semantics que chunking-then-embedding destrói.

Chunk 4096 tokens é anti-pattern: retrieval precision colapsa, top-K vira 1 doc gigante irrelevante 80% do conteúdo. Chunk 64 tokens é o outro extremo: contexto insuficiente pro LLM responder.

**Reranker (cross-encoder).** Pattern: top-50 do hybrid → cross-encoder rerank → top-5-10 pro LLM. Cohere Rerank v3.5 (2025): $1/1k searches, latency ~200ms, multilingual incluindo PT-BR. Self-host alternativo: BGE-reranker via Text Embeddings Inference (TEI).

```typescript
import { CohereClient } from 'cohere-ai';
const cohere = new CohereClient({ token: process.env.COHERE_API_KEY! });

async function retrieveWithRerank(query: string, tenantId: string) {
  const candidates = await hybridSearch(query, tenantId, 50);
  const ranked = await cohere.rerank({
    model: 'rerank-v3.5',
    query,
    documents: candidates.map(c => c.content),
    topN: 8,
  });
  return ranked.results.map(r => ({
    ...candidates[r.index],
    rerank_score: r.relevanceScore,
  }));
}
```

Latency budget: cap top-K candidates em 50 (não 200) — cross-encoder escala linear; 200 candidates = 800ms+ p99.

**Query rewriting + HyDE.** Multi-query: LLM gera 3-5 variações; retrieval em cada; dedup por doc id; merge. HyDE (Hypothetical Document Embeddings): LLM gera *resposta sintética* à query, embed da resposta, search por docs similares à resposta. Contraintuitivo, mas robusto pra queries curtas/ambíguas — embedding de doc-shaped texto casa melhor com docs reais que embedding de question-shaped texto.

**Evaluation harness — disciplina de produção.** Sem eval suite, mudança de prompt/retrieval é roleta. Componentes mandatory:

- **Golden dataset**: 100-500 tuplas `(query, expected_answer, source_doc_ids)` curadas manualmente. Cobre happy path + edge cases + adversarial.
- **Retrieval metrics**: Recall@K (% das vezes que docs corretos estão no top-K), MRR (Mean Reciprocal Rank), NDCG@K.
- **Generation metrics**: faithfulness (resposta supported by retrieved docs), answer relevance, context precision/recall.

Tools 2026: **RAGAS 0.2+** (Python, faithfulness/answer-relevance/context-precision/context-recall via LLM-as-judge), **Phoenix** (Arize, LLM eval + RAG-specific debugging), **DeepEval** (Pytest-style assertions), **Promptfoo** (CLI eval framework).

```python
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_precision, context_recall
from datasets import Dataset

ds = Dataset.from_dict({
    "question": [...],
    "answer": [...],          # output do RAG
    "contexts": [...],        # docs retrieved (lista de listas)
    "ground_truth": [...],    # expected answer do golden set
})
result = evaluate(ds, metrics=[faithfulness, answer_relevancy, context_precision, context_recall])
print(result)
```

CI pattern: cada PR que toca prompt/retrieval/chunking roda eval suite; regressão > 2pp em qualquer metric blocks merge. Online eval: 1-5% do tráfego sampleado, LLM-as-judge async grava score (cruza com **03-07 §2.19**). Sempre human spot-check ~10% do output do judge — judge bias amplifica silencioso sem audit humano.

**Cost optimization 2026.**

- **Embeddings**: OpenAI text-embedding-3-small $0.02/1M tokens; self-host bge-m3 amortiza acima de ~50M tokens/mês.
- **LLM call**: GPT-4o-mini $0.15/1M input + $0.60/1M output; Claude Haiku 4.5 $0.80/1M input + $4/1M output; Llama 70B em vLLM ~$0.20/1M (GPU amortizado).
- **Prompt caching** (Anthropic 2024+, OpenAI 2024+): static prefix (system prompt + retrieved docs estáveis) cached → 90% redução em input cost no hit. Mandatory pra workload com prefix repetido.
- **Tiered routing**: Haiku 4.5 classifica query simples/complexa; Sonnet/Opus só pra hard. Reduz custo médio 60-70%.

Numbers Logística: 10k queries/dia × ($0.001 retrieval + $0.005 LLM) ≈ $1800/mês. Com prompt caching + tiered routing: ~$500/mês.

**Production patterns Logística — KB docs + customer support.**

Use case real: lojista pergunta "Como configurar webhook de status de entrega?". Pipeline:

```
NL query → embed (text-embedding-3-small)
        → hybrid search (pgvector + tsvector, RRF, top-50)
        → Cohere Rerank v3.5 (top-8)
        → LLM (Sonnet 4.6) com docs + citation enforcement
        → resposta com [doc_id] inline
```

Use case que NÃO é RAG: "Quantas entregas atrasadas no mês passado?" — structured data. Pipeline correto: query → query understanding LLM extrai filtros (`tenant_id`, `date_range`, `status='delayed'`) → SQL aggregation → result. RAG sobre structured data é anti-pattern (LLM faz contagem errada lendo docs).

**Citation enforcement + refusal.** System prompt obriga LLM a citar `[doc_id]` por claim; UI verifica citations e renderiza link pro source. Sem context suficiente: "Não encontrei essa informação na documentação" em vez de hallucinate. Refusal pattern reduz hallucination ~80% e é trivial de adicionar.

**Streaming + interactivity.** LLM stream via SSE (cruza com **02-14 §2.10**) pra perceived latency. UI render: retrieval (1-2s) → "Pesquisando docs..." → stream LLM response (chunks ao chegando). Tool calls inline: LLM streams partial response, hits tool boundary, resumes após tool call return.

**Anti-patterns observados.**

- L0 naive RAG em prod sem hybrid + rerank: 50% queries fail; users abandonam silenciosamente.
- Chunk size 4096 tokens: retrieval precision colapsa. Use 256-512 + overlap 10-20%.
- Sem golden dataset: prompt change vira russian roulette; regressão indetectável.
- Sem citation enforcement: hallucination indistinguível de fact; trust corrói rápido.
- Embedding model swap sem re-embed corpus inteiro: vetores incompatíveis silenciosamente, recall despenca sem alarm.
- LLM-as-judge sem human spot-check: judge bias amplificado loop infinito.
- Prompt caching ignored em workload com static prefix: 10x cost overhead trivialmente evitável.
- Vector DB sem hybrid (sparse): keyword exact match ("ERROR_CODE_42", SKU codes, IDs) perdida — embedding não captura tokens raros.
- RAG aplicado a structured data: use SQL/aggregation; RAG é pra unstructured docs.
- Reranker sem latency budget: cross-encoder add 200-500ms; cap top-K candidates em 50.

**Cruza com**: **02-15** (search engines, BM25 + relevance tuning), **02-09** (Postgres, pgvector + tsvector), **03-07 §2.19** (LLM observability + eval pipeline), **04-04** (resilience, fallback quando LLM down → degrade pra hybrid sem LLM), **04-09** (scaling, embedding pipeline + eval pipeline como batch jobs).

### 2.22 LLM evaluation deep + fine-tuning decision tree (LoRA, PEFT, RLHF) — when each wins 2026

Eval e fine-tuning são as duas alavancas que separam LLM-toy de LLM-em-produção. Sem eval, não há critério para decidir prompt change, model swap, ou fine-tune ROI. Sem fine-tuning bem indicado, custos disparam ou latência mata UX. Decisão correta exige hierarquia clara.

**Eval hierarchy (L0 → L5)**:
- **L0 — Eyeball test**: dev review subjetivo de 10-20 exemplos. Necessário; insuficiente pra produção.
- **L1 — Golden dataset**: 100-500 (input, expected_output) curados. Roda a cada prompt/model change; threshold delta % bloqueia regressão.
- **L2 — LLM-as-judge**: LLM mais forte score outputs (0-10 helpfulness + 0-10 accuracy + binary harmful). Bias-prone mas escala.
- **L3 — Online eval**: 1-5% prod traffic sampled; LLM-as-judge async; detecta drift.
- **L4 — Human review panel**: weekly random sample reviewed por domain expert. Pega blind spots que LLM-judge perde.
- **L5 — A/B test em real users**: business metrics (conversion, retention, ticket deflection) por variante.

**Eval frameworks 2026**:
- **RAGAS 0.2+** (Python): faithfulness, answer-relevance, context-precision (cobre §2.21).
- **DeepEval**: pytest-style unit-test API pra LLM outputs.
- **Promptfoo 0.85+** (CLI): YAML test cases + parallel runs + matrix de providers.
- **OpenAI Evals**: registry open-source de evals + harness.
- **LangSmith**: tracing + eval integrado ao LangChain.
- **Phoenix** (Arize, OSS): RAG eval + drift detection.

**Promptfoo example — Logística intent classifier**:
```yaml
# promptfooconfig.yaml
prompts:
  - "Classifique a intenção: {{query}}"
providers:
  - openai:gpt-4o-mini
  - anthropic:claude-haiku-4-5
tests:
  - vars: { query: "Quero cancelar o pedido 123" }
    assert:
      - type: equals
        value: "cancel_order"
  - vars: { query: "Onde está minha entrega?" }
    assert:
      - type: equals
        value: "track_order"
  - vars: { query: "Como faço para criar conta?" }
    assert:
      - type: equals
        value: "signup_help"
      - type: latency
        threshold: 1000  # ms
```
```bash
npx promptfoo eval
npx promptfoo view  # web UI mostrando resultados, side-by-side por provider
```

**Fine-tuning decision tree 2026**:

NÃO fine-tune se:
- Não tem 1000+ high-quality examples curados.
- Prompt engineering não foi exausto (few-shot, chain-of-thought, structured output).
- Use case genérico (chat, Q&A) — RAG resolve.
- Domain knowledge muda frequentemente (re-fine-tune cost recorrente).

Fine-tune SE:
- Output format específico (JSON schema custom, DSL) consistente entre calls.
- Domain language/jargon que prompts não capturam economicamente.
- Latency-critical (smaller fine-tuned model bate large general model).
- Cost-critical (smaller model 5-10x cheaper por call em volume alto).

**Fine-tuning techniques**:
- **Full fine-tuning**: retreina todos os params. Caro ($1k-100k por run); raro em 2026.
- **LoRA** (Low-Rank Adaptation): adapter matrices em layers selecionadas; ~1% params trained. ~$10-100 por run.
- **QLoRA**: LoRA + 4-bit base model; roda em consumer GPU.
- **PEFT** (Hugging Face 0.12+): umbrella library; LoRA, prefix-tuning, IA3.
- **DPO** (Direct Preference Optimization): RLHF sem reward model; mais simples.
- **RLHF**: full alignment training; complexo; raramente necessário em app code.

**OpenAI fine-tuning (gpt-4o-mini, Jul 2024+)**:
```bash
openai api fine_tuning.jobs.create \
  -t file-abc123 \
  -m "gpt-4o-mini-2024-07-18"
```
```jsonl
# training data — JSONL chat format
{"messages": [{"role": "system", "content": "Classifique intenção em português."}, {"role": "user", "content": "Quero cancelar"}, {"role": "assistant", "content": "cancel_order"}]}
{"messages": [{"role": "system", "content": "Classifique intenção em português."}, {"role": "user", "content": "Cadê meu pedido"}, {"role": "assistant", "content": "track_order"}]}
```
- **Cost OpenAI 2026**: gpt-4o-mini fine-tune ~$3/1M training tokens; inference ~2x base price.
- **Anthropic**: fine-tuning Claude disponível em AWS Bedrock + via API request 2025+.

**Self-hosted LoRA (Llama 3.3 70B + PEFT 0.12+)**:
```python
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import LoraConfig, get_peft_model, TaskType
from trl import SFTTrainer

model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-3.3-70B-Instruct")
tokenizer = AutoTokenizer.from_pretrained("meta-llama/Llama-3.3-70B-Instruct")

lora_config = LoraConfig(
    task_type=TaskType.CAUSAL_LM,
    r=16,                # rank — controls capacity vs cost
    lora_alpha=32,
    lora_dropout=0.05,
    target_modules=["q_proj", "v_proj"],
)
model = get_peft_model(model, lora_config)

trainer = SFTTrainer(
    model=model,
    train_dataset=train_dataset,
    tokenizer=tokenizer,
    dataset_text_field="text",
    max_seq_length=2048,
)
trainer.train()
trainer.model.save_pretrained("./logistica-lora-v1")
```
- **Hardware 2026**: 70B LoRA cabe em 1x H100 80GB; 4-bit QLoRA cabe em 1x A100 40GB.
- **Cost**: ~$5-50 por run dependendo de compute (RunPod/Modal/Vast spot).

**Decisão Prompt eng vs RAG vs Fine-tuning**:
- **Prompt eng**: tenta primeiro; cheapest; resolve 80% dos casos.
- **RAG**: knowledge precisa ser current/specific (cobre §2.21).
- **Fine-tune**: structured output, domain language, cost/latency optimization.
- **Hybrid**: RAG + fine-tune (fine-tuned classifier roteia → RAG retrieval por categoria).

**Logística aplicado — eval program**:
- **Golden dataset**: 300 (query, expected_intent, expected_filters) curados pelo time de support.
- **CI gate**: cada prompt PR roda Promptfoo contra golden; regressão > 2% bloqueia merge.
- **Online eval**: 5% queries de prod scored async via gpt-4o-mini-as-judge; weekly review de low-score samples pelo product.
- **Fine-tuning use case**: intent classifier (50 intents) fine-tuned gpt-4o-mini em 5k labeled examples → cost reduction 5x vs Claude Sonnet 4.6 baseline; latency 200ms vs 800ms p50.
- **Stack**: Promptfoo + RAGAS no CI; LangSmith pra production tracing + eval; Helicone pra cost analytics por endpoint/customer.

**Anti-patterns (10 itens)**:
- Fine-tune sem golden dataset eval: não dá pra saber se melhorou ou regrediu.
- Fine-tune general chat: general models são melhores; fine-tune é pra specific tasks.
- Eval golden dataset overlapping com training set: data leakage; eval inflado, prod quebra.
- LLM-as-judge sem human spot-check: judge bias amplificado em loop.
- Full fine-tune em vez de LoRA/QLoRA: 10-100x cost desnecessário.
- Prompt engineering "exhausted" sem few-shot examples + chain-of-thought + structured output tentados primeiro.
- Fine-tune deployed sem monitoring: drift undetected até customer complaint.
- Eval só happy-path: adversarial inputs pegam real failures; inclua 20% edge cases (typos, jailbreak attempts, ambiguous queries).
- "Vibe check" eval em prod: subjetivo; documenta criteria → automatiza.
- RLHF tentado sem RL infrastructure: complexo; usa DPO se alignment é necessário.

**Cruza com**: **04-10 §2.21** (RAG architectures + RAGAS eval), **04-10 §2.15** (fine-tuning vs prompt intro, decisão básica), **04-10 §2.20** (agentic patterns, eval de tool use), **03-07 §2.19** (LLM observability + tracing), **02-15** (search engines, eval framework shared com IR).

---

### 2.23 Model Context Protocol (MCP) deep + multi-agent patterns 2026

Model Context Protocol (MCP) é o **USB-C para AI applications**: spec aberta da Anthropic (rev `2025-06-18`, stable) que padroniza como LLM hosts conectam a tools, resources e prompts externos. Antes do MCP, cada app (Claude Desktop, Cursor, Zed, Continue) reinventava sua camada de function calling — fragmentação total. Pós-MCP, escreve-se **um servidor** e qualquer host compatível consome. Em 2026, MCP é de facto o protocolo de interop entre LLM hosts e fontes de contexto/ferramentas; ignorar significa rebuildar wiring proprietário N vezes.

**Architecture (host ↔ client ↔ server)**:
- **Host**: aplicação que roda o LLM (Claude Desktop, Cursor, IDE plugin, agente custom).
- **Client**: instância dentro do host, **1:1 com cada server connection** (host com 5 servers tem 5 clients).
- **Server**: processo separado que expõe tools/resources/prompts. Local (subprocess via stdio) ou remoto (HTTP).
- Protocolo wire: **JSON-RPC 2.0** (request/response/notification, `id`, `method`, `params`, `result`/`error`).

```
Claude Desktop (host)
  ├── client_1 ──stdio──> mcp-server-filesystem (Node subprocess)
  ├── client_2 ──stdio──> mcp-server-github (Node subprocess)
  └── client_3 ──Streamable HTTP──> https://mcp.acme.com/orders (remote)
```

**Transports (escolha = local vs remoto)**:
- **stdio transport**: server roda como subprocess, JSON-RPC sobre stdin/stdout. Padrão para tools locais (filesystem, sqlite, git). Zero overhead de rede, auth = filesystem ACL do processo pai.
- **Streamable HTTP transport** (introduzido 2025-03, **default para remoto em 2026**): single endpoint HTTP POST + opcional SSE upgrade pra streaming server→client. Suporta resumability, session IDs, stateless mode.
- **HTTP+SSE transport** (legacy, **deprecated** desde 2025-03): two-endpoint design (POST pra cliente→server, GET SSE pra server→cliente). Greenfield 2026 = anti-pattern, use Streamable HTTP.

**Capability negotiation** (handshake obrigatório):
```json
// client → server: initialize request
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{
  "protocolVersion":"2025-06-18",
  "capabilities":{"roots":{"listChanged":true},"sampling":{}},
  "clientInfo":{"name":"claude-desktop","version":"0.10.0"}
}}
// server → client: initialize result
{"jsonrpc":"2.0","id":1,"result":{
  "protocolVersion":"2025-06-18",
  "capabilities":{"tools":{"listChanged":true},"resources":{"subscribe":true},"prompts":{}},
  "serverInfo":{"name":"orders-mcp","version":"1.2.0"}
}}
// client → server: notification post-handshake
{"jsonrpc":"2.0","method":"notifications/initialized"}
```

Capabilities declaram o que cada lado suporta: server expõe `tools`, `resources`, `prompts`, `logging`, `completion`; client expõe `roots` (filesystem boundaries), `sampling` (server pode pedir LLM completion via client — agentic).

**Primitives (3 que importam)**:
- **Tools** (LLM-callable, side-effecting): `tools/list` retorna schemas, `tools/call` executa. Equivalente a function calling, mas portável. Cada tool = `{name, description, inputSchema (JSON Schema)}`.
- **Resources** (LLM-readable, contextual): URIs (`file://`, `postgres://`, `github://`) que client pode `resources/list`, `resources/read`, `resources/subscribe`. Read-only por design.
- **Prompts** (user-triggered templates): `prompts/list` retorna templates parametrizáveis. UI do host expõe como slash-commands ou botões (Claude Desktop: `/prompt-name`).

**Real MCP servers (2026 ecosystem)**:
- **Oficiais Anthropic** (repo `modelcontextprotocol/servers`): `filesystem`, `github`, `gitlab`, `slack`, `postgres`, `sqlite`, `brave-search`, `puppeteer`, `fetch`, `memory`, `time`, `sequentialthinking`, `everything` (test server).
- **Community**: Linear, Notion, Stripe, Sentry, Cloudflare, AWS, Kubernetes, Docker, Jira, Figma, Obsidian (lista oficial em `modelcontextprotocol.io/servers`).
- **Claude Desktop config** (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/nicolas/projects"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {"GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxx"}
    },
    "orders": {
      "url": "https://mcp.acme.com/orders",
      "headers": {"Authorization": "Bearer ${ORDERS_TOKEN}"}
    }
  }
}
```

**Building um MCP server (TypeScript SDK `@modelcontextprotocol/sdk` v1.x)**:
```ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const server = new Server(
  { name: "orders-mcp", version: "1.2.0" },
  { capabilities: { tools: {} } },
);

const GetOrderSchema = z.object({ orderId: z.string().regex(/^ord_[a-z0-9]{12}$/) });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "get_order",
    description: "Fetch order by ID. Returns status, courier, ETA, items. Read-only.",
    inputSchema: {
      type: "object",
      properties: { orderId: { type: "string", pattern: "^ord_[a-z0-9]{12}$" } },
      required: ["orderId"],
    },
  }],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name !== "get_order") throw new Error(`Unknown tool: ${req.params.name}`);
  const { orderId } = GetOrderSchema.parse(req.params.arguments);
  const order = await db.orders.findUnique({ where: { id: orderId } }); // read-only conn
  if (!order) return { content: [{ type: "text", text: `Order ${orderId} not found` }], isError: true };
  return { content: [{ type: "text", text: JSON.stringify(order, null, 2) }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

Para Streamable HTTP remoto: troque `StdioServerTransport` por `StreamableHTTPServerTransport` + Express handler em `POST /mcp` com session IDs em header `Mcp-Session-Id`.

**Multi-agent patterns 2026** (MCP fornece tools, frameworks orquestram agentes):

- **Supervisor + workers** (LangGraph, mais comum 2026): supervisor LLM roteia request pra worker especializado (researcher, coder, writer). Worker chama tools via MCP, retorna pro supervisor que decide próximo passo ou termina. Cap obrigatório: `max_iterations` (15-25).
- **Planner-Executor-Critic**: planner gera plano N-steps, executor roda step-by-step (com MCP tools), critic valida output cada step, replan se falha. Bom pra tasks long-horizon (refactor cross-repo).
- **Swarm / handoff** (OpenAI Swarm, leve): agentes peers se passam controle via tool `transfer_to_<agent>`. Sem hierarquia. Útil pra customer support routing (triage → billing → technical).
- **AutoGen / CrewAI**: AutoGen = conversational multi-agent (group chat); CrewAI = role-based crews com process sequencial/hierárquico. Ambos integram MCP servers como tool sources.

```ts
// Supervisor pattern (LangGraph esqueleto)
const supervisor = new StateGraph(AgentState)
  .addNode("supervisor", supervisorNode)  // LLM decide next agent
  .addNode("researcher", researcherNode)  // usa MCP brave-search + fetch
  .addNode("coder", coderNode)            // usa MCP filesystem + github
  .addEdge("researcher", "supervisor")
  .addEdge("coder", "supervisor")
  .addConditionalEdges("supervisor", routeNext, { researcher: "researcher", coder: "coder", END: END })
  .compile({ checkpointer, interruptBefore: ["coder"] });  // human-in-loop antes de write
```

**MCP wins quando**: precisa expor mesma tool pra múltiplos hosts (Claude Desktop + Cursor + agente custom), quer ecosystem de servers prontos (GitHub, Slack, Postgres), quer separar concerns (server team owns tool, agent team owns orchestration). **MCP overkill quando**: app único usa LLM via API direto sem host externo — function calling nativo do provider é mais simples (sem subprocess/HTTP overhead).

**Stack Logística aplicada**: MCP server `logistics-mcp` expõe (a) tool `get_order_status(orderId)` read-only contra Postgres replica, (b) tool `find_courier_eta(orderId)` que chama API courier interna, (c) resource `order://recent` listando últimos 50 orders do tenant ativo, (d) prompt `triage_complaint` template pra agente de suporte. Claude Desktop dos atendentes consome via Streamable HTTP autenticado por mTLS + JWT por tenant. Agente de suporte roda em LangGraph (supervisor + worker `refund_handler` que requer human approval via `interruptBefore`).

**10 anti-patterns**:
1. MCP server expõe write/delete tools sem auth nem sandbox — RCE-equivalent quando LLM é prompt-injected.
2. Tool descriptions vagas ("query the system") — LLM erra qual tool chamar; descrição = doc do agente, escreva como tal.
3. `resources/list` retorna 10k items sem pagination/cursor — context window overflow + custo.
4. Usar HTTP+SSE transport em greenfield 2026 — deprecated; use Streamable HTTP.
5. Supervisor multi-agent sem `max_iterations`/`recursion_limit` — loop infinito, custo $$$, timeout do host.
6. MCP server stateful sem session ID em Streamable HTTP — multi-cliente pisa em estado compartilhado.
7. Expor secrets em tool inputSchema (ex.: `apiKey` como param) — LLM loga, vaza em tracing/replay.
8. Não validar `inputSchema` server-side com Zod/Pydantic — confia que LLM seguiu schema; ele não seguiu.
9. Misturar concerns: 1 MCP server com 40 tools de domínios distintos — split por bounded context (orders-mcp, billing-mcp).
10. Sampling capability ativada sem rate limit — server pede LLM completion ao client em loop, custo explode.

**Cruza com**: **04-10 §2.6** (function calling foundation — MCP é a versão portável), **04-10 §2.10** (agents intro, ReAct), **04-10 §2.20** (agentic patterns + eval de tool use), **04-10 §2.13** (LLM observability — tracing de MCP calls), **03-08** (security — tool auth, sandbox, prompt injection defense), **04-05** (API design — JSON-RPC 2.0 vs REST), **02-16 §2.18** (GraphRAG patterns Microsoft Apr 2024 + Neo4j GenAI integrations), **05-01 §2.16** (toy GPT scratch — fundamentos LLM internals), **05-02 §2.11** (Capstones MCP agentic + on-device AI + tool-use orchestrator), **05-04 §2.15** (LLM papers 2021-2026 reading list), **05-09 §2.19** (scientific computing — overlap em ML inference patterns).

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
