---
module: 03-07
title: Observability, Logs, Metrics, Traces, SLO/SLI, OpenTelemetry
stage: producao
prereqs: [03-03, 03-04]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
quiz:
  - q: "Qual a diferença essencial entre 'monitoring' e 'observability'?"
    options:
      - "Monitoring usa CloudWatch, observability usa Grafana"
      - "Monitoring responde 'X está vermelho?'; observability responde 'por que X virou vermelho de jeitos que você não previu?'"
      - "Monitoring é gratuito, observability é pago"
      - "Monitoring é client-side, observability é server-side"
    correct: 1
    explanation: "Monitoring é dashboard de métricas pré-definidas. Observability exige que o sistema exponha contexto suficiente (logs estruturados, traces, alta cardinalidade) para responder perguntas que você ainda não fez."
  - q: "Por que adicionar labels como `userId` ou `tenantId` (com 100k tenants) em métricas Prometheus é antipadrão?"
    options:
      - "Prometheus não suporta strings em labels"
      - "Cardinalidade explode (cada combinação cria série única) causando memory blowup e custo desproporcional"
      - "Labels com mais de 64 chars são truncadas"
      - "Aumenta latência de scraping em 10x"
    correct: 1
    explanation: "Métricas são agregadas; alta cardinalidade quebra esse modelo. Use labels de baixa cardinalidade (status code, route, region). Para tracking per-user, vá pra logs/traces."
  - q: "Qual a vantagem de tail-based sampling em traces sobre head-based?"
    options:
      - "Tail-based é mais rápido de processar"
      - "Vê o trace completo antes de decidir, captura 100% dos errors + slow + sample do resto, signal/noise ordens de magnitude melhor"
      - "Head-based não suporta OpenTelemetry"
      - "Tail-based é o único método compliant com GDPR"
    correct: 1
    explanation: "Head-based (decide no início, random N%) perde 99% dos traces antes de saber se houve erro. Tail-based no Collector decide ao fim — guarda traces interessantes + 1-5% baseline."
  - q: "Em SLO/burn rate alerting, por que 'burn rate alto' é mais acionável que 'latência subiu'?"
    options:
      - "Burn rate é traduzido pra português automaticamente"
      - "Burn rate quantifica 'vai estourar SLO em 4h' dando timeline claro de ação, enquanto 'latência subiu' é vago"
      - "Burn rate dispara em PagerDuty, latência só Slack"
      - "Burn rate considera custo, latência não"
    correct: 1
    explanation: "Error budget define tolerância. Burn rate de 720x = budget 30 dias consumido em 1h — aciona resposta antes do SLO estourar. 'Latência subiu' não diz se importa pro user nem urgência."
  - q: "Por que mockar instrumentation manual com OTel SDK exige que `tracing.ts` carregue ANTES do app code via `--require`?"
    options:
      - "Para preservar a ordem dos imports ESM"
      - "Auto-instrumentation patcha módulos em load time; se SDK importa depois, módulos já foram carregados sem patches"
      - "OTel exige que process.env esteja vazio na hora do init"
      - "Para evitar conflitos com TypeScript decorators"
    correct: 1
    explanation: "`@opentelemetry/auto-instrumentations-node` monkey-patches módulos (http, pg, redis) ao serem `require()`-ados. Se o app já requireou eles, patches não aplicam — traces fragmentam silenciosamente."
---

# 03-07, Observability

## 1. Problema de Engenharia

A maioria dos sistemas em produção não é "observable", é "monitored". Existe diferença real. Monitoring responde "X está vermelho?". Observability responde "por que X virou vermelho de jeitos que você não previu?". Logs verbose sem contexto, métricas sem cardinalidade decente, traces ausentes, alertas paginando madrugadas em problemas inúteis. Tudo isso é norma.

Este módulo é observability moderna: três pilares (logs, metrics, traces), OpenTelemetry como padrão, RED/USE methods, SLO/SLI/SLA, alerting baseado em error budget, profiling, e o stack realista (Prometheus/Grafana, Loki, Tempo, ou alternativas SaaS). Você sai sabendo instrumentar um sistema novo from scratch, definir SLOs, e debugar incidente sem refletor.

---

## 2. Teoria Hard

### 2.1 Logs, metrics, traces

- **Logs**: eventos discretos, alta cardinalidade, low volume per evento. Bom pra "o que aconteceu nesse request específico".
- **Metrics**: valores numéricos agregados ao longo do tempo. Cardinalidade limitada. Bom pra "como o sistema está se comportando em geral".
- **Traces**: chain de spans através de serviços, relacionados por trace ID. Bom pra "por que esse request demorou 8s".

Cada um tem custo e finalidade. Bons sistemas usam todos, integrados.

### 2.2 Logs estruturados

Logs não-estruturados ("user 123 paid 50") são query-hostis. Logs estruturados (JSON com fields) são queryáveis:

```json
{"ts":"2026-04-28T10:00:00Z","level":"info","msg":"order paid","orderId":"abc","userId":"123","amount":50,"requestId":"r1","tenantId":"t1"}
```

- **pino** (Node), JSON, super fast.
- **structlog** (Python).
- **zap** / **slog** (Go).

Práticas:
- 1 evento = 1 linha JSON.
- Inclua sempre: timestamp, level, msg, requestId/traceId, tenantId/userId.
- Não logue PII sensível sem mascarar.
- Sample logs verbose em produção (1 em N debug calls).

### 2.3 Metrics

Tipos (Prometheus):
- **Counter**: monotonically increasing (requests_total). Resetable em restart.
- **Gauge**: vai e vem (active_connections).
- **Histogram**: distribuição (latency_seconds_bucket). Buckets pré-definidos.
- **Summary**: percentis pré-calculados client-side. Use Histogram quase sempre (server-side aggregation).

Cardinalidade explode quando você adiciona labels com muitos valores distintos (`userId`, `tenantId` com 100k tenants). Memory blowup em Prometheus. Limite labels a baixa cardinalidade (status code, route, region).

### 2.4 RED e USE methods

**RED** (Rate, Errors, Duration), pra serviços que respondem requests:
- Rate: req/s.
- Errors: % falhando.
- Duration: latência (p50, p95, p99).

**USE** (Utilization, Saturation, Errors), pra recursos:
- Utilization: % busy.
- Saturation: queue/wait.
- Errors: count.

Pra cada serviço, dashboards RED. Pra cada recurso (CPU, disk, queue), USE.

### 2.5 Traces e OpenTelemetry

Distributed tracing: request percorre 5 serviços; cada um cria spans com timing e attributes; tudo amarrado por trace ID.

**OpenTelemetry (OTel)** virou padrão de fato em 2024-2026:
- API + SDK pra logs, metrics, traces.
- Vendor-neutral: backend pode ser Jaeger, Tempo, Datadog, New Relic, Honeycomb.
- Propagation via headers (`traceparent`).
- **Auto-instrumentation** pra muitas libs (HTTP, DB, Redis, Kafka).
- **OTel Collector**: agente intermediário (sidecar/daemonset/host), recebe telemetria, processa, exporta.

Padrão de adoção:
1. SDK no app (auto-instrumentation + manual spans onde fizer sentido).
2. OTel Collector roda perto.
3. Backend (Tempo, Jaeger, vendor) recebe.

### 2.6 Sampling

Tracing alta volume = caro. Sampling reduz:
- **Head-based**: decide no início (random N%).
- **Tail-based**: vê toda a trace, decide depois (mais caro mas keep só erros e slow).

Default: 100% em dev/staging, 1-10% em prod com tail sampling pra preservar errors e p99.

### 2.7 SLI, SLO, SLA, error budget

- **SLI** (Indicator): métrica observável. "% requests respondidos < 500ms".
- **SLO** (Objective): target. "99% requests < 500ms em janela 30 dias".
- **SLA**: contratual com clientes. SLO < SLA com margem.
- **Error budget**: 1 - SLO. Tolerável de falhar.

Burn rate alerting: alarm quando você está consumindo budget muito rápido pra restar 30 dias. Ex: budget de 30 dias inteiramente consumido em 1h = burn rate 30*24 = 720x.

Vantagem: alerta acionável. "Latência subiu" é vago; "burn rate alto, vai estourar SLO em 4h" é acionável.

### 2.8 Stack open-source moderno

- **Prometheus**: metrics ingestion + query (PromQL). De fato standard.
- **Grafana**: dashboards. PromQL, LogQL, TraceQL.
- **Loki**: logs storage barato (mesmo modelo Prometheus, mas pra logs).
- **Tempo**: traces storage.
- **Alertmanager**: routing de alertas pra PagerDuty/Slack/email.
- **Mimir / Thanos / Cortex**: Prometheus em escala, retention longa.
- **Vector / Fluent Bit**: log/metric forwarders eficientes.
- **OTel Collector**: telemetria genérica.

Esse stack ("LGTM", Loki/Grafana/Tempo/Mimir) compete com SaaS modernamente.

### 2.9 SaaS

- **Datadog**: full-stack, caro, excelente DX.
- **New Relic**: similar.
- **Grafana Cloud**: hosted LGTM.
- **Honeycomb**: forte em traces e high-cardinality (BubbleUp pra exploração).
- **Lightstep / ServiceNow**: enterprise tracing.
- **Sentry**: error tracking + perf tracing.
- **Better Stack / Axiom**: log-focused.

Para projetos pequenos, free/cheap tier de Grafana Cloud, Honeycomb, Axiom resolve.

### 2.10 Logs queryability

- **Prometheus / PromQL**: rate(http_requests_total{job="api",code=~"5.."}[5m]).
- **LogQL** (Loki): `{job="api"} |~ "error" | json | tenantId="t1"`.
- **Datadog / Splunk query languages**.
- **OpenSearch / Elasticsearch DSL**.
- **CloudWatch Logs Insights** (SQL-ish).

Skill básica: 5-6 queries que você usa pra incidente. Se você não consegue rapidamente "quantos erros 5xx em /orders nas últimas 5 min, agrupado por tenant", instrumentação está fraca.

### 2.11 Alertas

Princípios:
- **Ação requerida**: cada alerta exige humano. "Disk 90%" sem auto-scale? Alerta. Com auto-scale? Métrica.
- **Sintomas, não causas**: "p99 > 1s" (sintoma, user-facing) > "DB conn pool > 80%" (causa interna).
- **Ruído kills**: alerta que dispara 50x/dia ninguém olha mais.
- **Runbook**: cada alerta linka pra runbook com steps.
- **Severidade**: 03-01 = paginar; 03-02 = ticket business hours; 03-03 = note.

### 2.12 On-call e culture

- **PagerDuty / Opsgenie**: routing, schedules, escalation.
- **Blameless postmortem**: foco em sistemas, não pessoas.
- **Game days**: simular incidentes pra treinar.
- **Charity Majors / Liz Fong-Jones**: leitura referência.

### 2.13 Profiling

Sampling profiler runs em produção pra mostrar "onde CPU vai":
- **pprof** (Go), clássico.
- **node --prof**, **0x**, **clinic flame** (Node).
- **Pyroscope / Grafana Pyroscope**: continuous profiling, integrado ao Grafana.
- **Datadog Continuous Profiler**, **Sentry Profiling**.

Use quando p99 alto sem causa óbvia em metrics/traces.

### 2.14 RUM (Real User Monitoring)

Front-end:
- Web Vitals (LCP, INP, CLS) coletadas no browser.
- Sentry / Datadog RUM / Grafana Faro.
- Sem isso, perf de front é cego.

### 2.15 Synthetic monitoring

Bots simulando user em rotas críticas, periodicamente:
- **Pingdom, UptimeRobot, Checkly**.
- **Grafana k6 cloud, Datadog synthetics**.

Detecta downtime quando ninguém está usando. Catch regressões rapidamente.

### 2.16 eBPF observability, deep

eBPF (extended Berkeley Packet Filter) deixou de ser nicho de kernel hackers e virou categoria de observability mainstream entre 2023-2025. Vale entender por que e quando usar.

**O que é eBPF tecnicamente:**
- Linguagem **bytecode** rodando em VM dentro do kernel Linux. Verifier checa programa antes de carregar (sem loops infinitos, sem violar memória).
- Pode atachar em **kprobes** (functions do kernel), **uprobes** (functions de user space), **tracepoints**, **cgroups**, **socket filters**, **XDP** (Packet processing antes da network stack).
- Programa coleta dados em maps (hash, array, ring buffer) que user space lê.
- Custo: ~5-15% overhead em workloads bem instrumentados, significativo mas viável.

**Por que substitui agentes tradicionais:**
- **Sem instrumentação de código**. Tradicional APM exige SDK em cada lib (HTTP, DB driver, gRPC). eBPF lê do kernel a syscall que o SDK iria interceptar.
- **Cobre apps que você não controla**: vendor app, legacy binary, processo do OS.
- **Visibilidade L3-L7** num framework só.
- **Alta cardinalidade barata**: tracking por IP/PID/cgroup sem cost de span por request.

**Tools em produção (2026):**

| Tool | Foco | Onde brilha |
|---|---|---|
| **Pixie** (CNCF) | K8s "instant observability" | Auto-detect HTTP/gRPC/DB queries. Latency/error breakdown sem instrumentação. |
| **Cilium Tetragon** | Security + observability | Detect process exec, file access, network. Audit + run-time policy. |
| **Parca** | Continuous profiling | Pprof-format flamegraphs do cluster inteiro. Achar funções caras em prod. |
| **Cilium** | CNI + service mesh | Substitui kube-proxy + Istio sidecar. L7 policy via eBPF, sem sidecar. |
| **Coroot** | Full-stack observability | Mapa de serviços auto-gerado, RED/USE method baseados em eBPF. |
| **Inspektor Gadget** | K8s troubleshooting | Coleção de gadgets eBPF (trace exec, DNS, net policies). |
| **bpftrace** | Ad-hoc tracing | DTrace-like one-liner pra investigar prod sem instalar nada permanente. |
| **Beyla** (Grafana) | Auto-instrumentation HTTP/gRPC | Span generation OTel-compat sem SDK. |

**Quando vale eBPF observability vs OTel manual:**

| Caso | Tradicional (OTel SDK) | eBPF |
|---|---|---|
| App que você desenvolve, ownership total | Melhor, span semantics ricos | Complementar |
| Mix de apps de fornecedores (Postgres, Redis, custom) | Custoso instrumentar tudo | Vence, coverage automático |
| Profile de função em prod | Impossível sem code changes | Parca/eBPF cover |
| Network L4/L7 visibility (mTLS broken, who's calling who) | Service mesh ou tcpdump | Cilium / Pixie |
| Forensics de incident (que processo escreveu nesse arquivo?) | Logs, audit | Tetragon |
| Latency breakdown de Postgres query interno | Lib instrumentation se exists | bpftrace cover |

**Pegadinhas:**
- **Kernel version matters**. eBPF moderno (CO-RE, Compile Once Run Everywhere) precisa Linux 5.10+. Pra distros com kernel velho, fallback BPF tradicional.
- **GKE/EKS Autopilot e Fargate**: limitam capabilities, várias eBPF tools não funcionam. Use nodes managed.
- **Encryption pode mascarar**: HTTPS dentro de TLS. Pixie usa **uprobes em libssl** pra capturar antes do encrypt, funciona se app linka libssl dynamically.
- **Cardinalidade ainda é problema**: eBPF gera muito dado. Filtre/sample ou backend cai.

**Estratégia pragmática 2026:**
- **App próprio**: OTel SDK pra spans + métricas. eBPF complementa pra blind spots (DB internals, syscalls, network).
- **Plataforma com mix de apps**: Pixie ou Coroot como zero-config baseline. Adicionar OTel onde precisar custom semantics.
- **Security forense**: Tetragon ou Falco (ambos eBPF-based hoje).

### 2.17 Honeycomb-style high-cardinality

Argumento de Charity Majors: agregação cedo (Prometheus) joga fora dimensions importantes. Eventos com alta cardinalidade preservados (1 evento por request, com 50 attributes) permitem perguntas que você ainda não sabia.

Honeycomb foi pioneira; Datadog, NewRelic seguiram. Trace-based observability é a evolução.

### 2.18 Custo

Observability pode dominar bill em projetos médios:
- Logs verbose: $1k+/mês fácil.
- Metrics high-cardinality: cardinality explosion no Prometheus.
- Traces 100% sample em volume alto: caro.

Pratique:
- Sample.
- Drop logs sem valor (request access logs duplicando ALB log).
- Retention policies (logs 7 dias, metrics 30 dias, archives no 04-03).
- Aggregate edge: OTel Collector dedupa, sample.

### 2.19 AI Ops & LLM observability

Aplicação com LLM core (chat, agent, RAG) tem **observability shape diferente** de microservice tradicional. Métricas, custos e modos de falha próprios. Em 2026, virou frente própria.

**O que rastrear (mínimo viável):**

- **Per-call**: prompt tokens, completion tokens, model name, latency p50/p99, TTFT, cost ($/call), cache hit/miss, tool calls feitos.
- **Per-conversation**: turns, total tokens cumulativos, cost cumulativo, satisfação (👍/👎 ou rating implícito).
- **Per-eval**: score em rubric (helpfulness, accuracy, harmlessness), comparação A/B entre prompts/models.
- **Per-tool**: tool calls successful vs failed, retries, args distribution (pra detectar prompts gerando args ruins).

**Failure modes únicos:**
- **Hallucination**: LLM inventa fato. Detecta via grounding eval (resposta deve citar source do contexto).
- **Tool argument drift**: LLM gera argumento que não é esperado pelo tool schema (regression em prompt change).
- **Cost spike**: usuário/agent em loop disparando 100+ chamadas. Alarme em $/user/dia > N.
- **Latency tail**: TTFT > 5s = abandono. P99 mais importante que p50.
- **Quality drift silencioso**: model novo é melhor em benchmark, pior em sua tarefa específica. Eval contínuo é proteção.

**OpenTelemetry GenAI semantic conventions** (2024+): atributos padrão `gen_ai.system`, `gen_ai.request.model`, `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens`, `gen_ai.response.finish_reasons`. Use isso desde dia 1; libs upstream estão adotando.

**Tools especializadas (2026):**

| Tool | Foco | Quando |
|---|---|---|
| **LangSmith** | Tracing + eval em LangChain/LangGraph apps | Default se stack já é LangChain |
| **Langfuse** (open-source) | Tracing, eval, prompt management | Self-host, multi-framework |
| **Helicone** | Proxy-based tracing (zero code) | Prototyping, multi-LLM apps |
| **Phoenix** (Arize, open-source) | LLM eval + RAG-specific debugging | Foco em RAG quality |
| **Weights & Biases (W&B) / Weave** | ML experiment tracking + LLM | Stack já em W&B |

**Padrão de tracing recomendado:**
```typescript
// span pai por conversa, child por turn, grandchild por tool call
span("conversation", {conversation_id})
  span("turn", {turn_index, model})
    span("llm.completion", {prompt_tokens, completion_tokens, cost})
    span("tool.call", {tool_name, args, result_summary})
    span("rag.retrieve", {query, num_docs, similarity_top})
```

**Eval automation (não opcional em 2026):**
- **Offline eval**: dataset curado de 50-500 cases representativos. Roda em CI a cada prompt/model change. Block deploy em regression.
- **Online eval**: 1-5% de tráfego live é amostrado, scored async via LLM-as-judge ou human feedback. Detecta drift.
- **Golden dataset**: cresce com bugs reais reportados (cada bug vira case no eval).

**Cost trap a evitar:**
Tracing TODO call LLM com prompt + response inteiros = span 10-100x maior que normal. Sample agressivamente:
- Head-based: 100% das conversas marcadas debug, 5-10% das normais.
- Tail-based via OTel Collector: 100% das que tiveram error / latência > p99 / cost > threshold.

Cruza com **04-10** (LLM systems) e **04-09** (observability cost discipline ao escalar).

---

### 2.20 OTel SDK + Collector pipeline + structured logging

OpenTelemetry virou o padrão de instrumentação vendor-neutral em 2026. Stack canônico: SDK no app exporta OTLP pro Collector, Collector faz processing (sampling, masking, batch) e fan-out pra backends (Tempo/Mimir/Loki, Datadog, New Relic). Versões de referência: OTel JS SDK 1.x, OTLP/HTTP 1.0, semantic-conventions 1.27+.

**1. SDK setup Node (production-ready).** Auto-instrumentation patcha módulos em load time, então `tracing.ts` precisa ser carregado ANTES do app code via `node --require ./tracing.js dist/index.js` (ou `--import` em ESM).

```typescript
// tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'logistics-api',
    [ATTR_SERVICE_VERSION]: process.env.GIT_SHA ?? 'dev',
    'deployment.environment': process.env.NODE_ENV ?? 'dev',
    'service.instance.id': process.env.HOSTNAME ?? require('os').hostname(),
  }),
  traceExporter: new OTLPTraceExporter({ url: 'http://otel-collector:4317' }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: 'http://otel-collector:4317' }),
    exportIntervalMillis: 15000,
  }),
  logRecordProcessors: [],
  instrumentations: [getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-fs': { enabled: false }, // ruidoso
  })],
});
sdk.start();
process.on('SIGTERM', () => sdk.shutdown());
```

`auto-instrumentations-node` cobre HTTP, pg, redis, fetch, kafkajs, amqplib, ioredis, fastify. `service.name` ausente ou genérico (`api`, `backend`) inviabiliza queries em Tempo — sempre nome único.

**2. Collector como pipeline central.** Por que não exportar direto pro backend: Collector centraliza config (1 lugar pra mudar sampling/masking), faz retry com buffer, masking de PII antes de sair do perímetro, fan-out pra múltiplos backends, e tail-sampling (decisão depois do trace completar). Modos: **Agent** (DaemonSet/sidecar, low overhead, recebe do app local) → **Gateway** (deployment central, faz tail-sampling e masking pesado).

```yaml
# collector-gateway.yaml
receivers:
  otlp:
    protocols:
      grpc: { endpoint: 0.0.0.0:4317 }
      http: { endpoint: 0.0.0.0:4318 }
processors:
  memory_limiter: { check_interval: 1s, limit_percentage: 80, spike_limit_percentage: 25 }
  batch: { timeout: 5s, send_batch_size: 1024 }
  attributes/redact:
    actions:
      - { key: http.request.body, action: delete }
      - { key: user.email, action: hash }
      - { key: user.cpf, action: delete }
  tail_sampling:
    decision_wait: 30s
    policies:
      - { name: errors, type: status_code, status_code: { status_codes: [ERROR] } }
      - { name: slow, type: latency, latency: { threshold_ms: 500 } }
      - { name: probabilistic, type: probabilistic, probabilistic: { sampling_percentage: 5 } }
exporters:
  otlphttp/tempo: { endpoint: http://tempo:4318 }
  prometheusremotewrite: { endpoint: http://mimir:9009/api/v1/push }
  otlphttp/loki: { endpoint: http://loki:3100/otlp }
service:
  pipelines:
    traces:  { receivers: [otlp], processors: [memory_limiter, attributes/redact, tail_sampling, batch], exporters: [otlphttp/tempo] }
    metrics: { receivers: [otlp], processors: [memory_limiter, batch], exporters: [prometheusremotewrite] }
    logs:    { receivers: [otlp], processors: [memory_limiter, attributes/redact, batch], exporters: [otlphttp/loki] }
```

`memory_limiter` SEMPRE primeiro — sem ele, traffic spike vira OOM e Collector cai. `batch` SEMPRE no fim — sem batch, RPC overhead destrói throughput.

**3. Trace propagation cross-service.** Padrão W3C `traceparent: 00-<trace-id>-<span-id>-<flags>` automático em HTTP/gRPC. Pegadinha em messaging: kafkajs/amqplib não propagam por default — `@opentelemetry/instrumentation-kafkajs` injeta no header da message no producer e extrai no consumer. Sem isso, trace fragmenta em produce vs consume e debug fica impossível.

**4. Structured logging com pino + trace correlation.** `pino` é o padrão prod 2026 (JSON nativo, latência sub-microssegundo, vence `winston` em throughput). Mixin injeta `trace_id`/`span_id` em todo log:

```typescript
import pino from 'pino';
import { trace } from '@opentelemetry/api';

export const log = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  formatters: { level: (l) => ({ level: l }) },
  mixin: () => {
    const ctx = trace.getActiveSpan()?.spanContext();
    return ctx ? { trace_id: ctx.traceId, span_id: ctx.spanId } : {};
  },
});
```

Em Grafana, clicar no log line abre o trace em Tempo via `trace_id`; clicar no span abre logs do span via Loki query `{service_name="logistics-api"} | json | trace_id="..."`. NUNCA `pino-pretty` em prod — quebra parser downstream.

**5. Sampling strategies.** **Head-based** (`parentbased(traceidratio(0.1))` no SDK) decide no início, simples e cheap, mas não pode focar em traces interessantes (ainda não sabe se haverá erro). **Tail-based** (no Gateway Collector) decide ao fim, captura 100% errors + 100% slow + 5% normais — signal/noise ordens de magnitude melhor, custa buffer de 30s no Collector. Pattern recomendado: **head 100% + tail no Gateway**. Numbers reais 2026: 10k req/s sem sampling ≈ 30M spans/dia ≈ $3-5k/mês em SaaS observability; com tail 5% + 100% errors ≈ $300/mês mantendo signal.

**6. Cardinality control em metrics.** HTTP auto-instrumentation cria `http.server.duration` com label `http.route` (path template `/orders/:id`, baixa cardinalidade) — NÃO `http.target` (path com IDs `/orders/abc-123`, cardinality explosion). Usar `http.target` em métrica vira $1k/mês em $20k. Budget: < 100k series ativos por serviço. Drop attributes problemáticos via OTel Views ou processor `attributes/drop` no Collector.

**7. Stack completo na Logística.** Apps Node Fastify rodam com `--require ./tracing.js`, exportam OTLP pro DaemonSet Collector (Agent mode, um por node, low overhead). DaemonSet forward pro Gateway Collector central (Deployment, 3 réplicas) que faz tail-sampling, masking de CPF/email e fan-out: traces → Tempo (S3 backend), metrics → Mimir (S3 backend), logs → Loki (S3 backend). Grafana é single pane of glass com Explore linkando logs↔traces↔metrics via `service.name` + `trace_id`. Custo target: < 2% do compute spend.

**Anti-patterns observados:**
- SDK init importado depois do app code — auto-instrumentation não patcha. Sempre `--require`/`--import`.
- `service.name` ausente ou genérico (`api`, `backend`) — impossível distinguir serviços em Tempo.
- Trace propagation ausente em messaging (Kafka/RabbitMQ) — traces fragmentados.
- Sampling head-based 1% em serviço low-traffic — perde quase tudo, debug fica impossível.
- Tail-sampling sem `memory_limiter` — OOM em traffic spike, Collector cai e perde dados.
- Métrica HTTP com `http.target` em vez de `http.route` — cardinality explosion ($1k → $20k).
- Logs estruturados sem `trace_id` injetado — correlação manual via timestamps frágil.
- `pino-pretty` em prod — JSON vira texto, parser downstream quebra.
- Collector sem `batch processor` — RPC overhead destrói throughput.

Cruza com **02-07** (Node, ordem de `--require` importa pra patches), **02-08** (Fastify auto-instrumentation), **03-05** (AWS X-Ray vs OTel + Tempo), **03-15** (incident response, traces correlacionados aceleram MTTR), **04-09** (scaling, OTel ingestion cost @ scale).

---

### 2.21 OpenTelemetry 1.40 production deep — semconv estável, Collector pipelines, profiling correlation

OpenTelemetry virou de fato o padrão de instrumentação multi-vendor. Spec 1.40 (Q1 2026) consolida o que ficou anos em "experimental": HTTP semantic conventions estáveis (`http.request.method`, `http.response.status_code`, `url.full`), messaging semconv estável (Kafka/RabbitMQ/SQS attributes padronizados), e Collector contrib v0.110+ com processors maduros pra tail sampling, k8s enrichment, transform. Backends (Tempo, Jaeger 2.x, Datadog, Honeycomb, New Relic) consomem OTLP nativo. Vendor lock-in de instrumentação morreu — a SDK fica, o backend troca.

Esta seção é production deep: como montar Collector em pipeline robusto (receivers → processors → exporters), tail sampling sério (não "amostra 1%", mas "guarda 100% dos erros + P99 lentos + 1% do resto"), exemplars ligando metric spike a trace exato, continuous profiling 2026 (Pyroscope/Parca/Grafana Profiles) correlacionado a span_id via eBPF stack collection.

#### Semantic conventions estáveis (semconv v1.30, 2026)

Antes da 1.40 cada vendor mapeava do jeito dele. Agora HTTP server/client têm attributes congelados:

```
http.request.method         = "GET" | "POST" | ...
http.response.status_code   = 200 | 500 | ...
url.full                    = "https://api.x.com/v2/orders?status=paid"
url.path                    = "/v2/orders"
url.scheme                  = "https"
server.address              = "api.x.com"
server.port                 = 443
network.protocol.version    = "1.1" | "2" | "3"
http.route                  = "/v2/orders/:id"   # template, não path raw (cardinality)
```

`http.route` é o killer pra metrics — usar `url.path` raw em label de Prometheus = explosão de cardinalidade (`/users/1`, `/users/2`, ... = N séries). Sempre coletar `http.route` (template) pra metrics, `url.full` só em traces (alta card aceitável lá).

Messaging semconv estável: `messaging.system` (`kafka`, `rabbitmq`, `aws_sqs`), `messaging.destination.name` (topic/queue), `messaging.operation.type` (`publish`, `receive`, `process`), `messaging.kafka.consumer.group`. Span links ligam o producer span ao consumer span através de OTel context propagation no header `traceparent`.

#### Collector pipeline anatomy

Collector é proxy + ETL pra telemetria. Roda como sidecar, agent (DaemonSet) ou gateway (Deployment com HA). Pipeline = receivers → processors → exporters, declarado em YAML. Config production-ready pra fleet Node em K8s:

```yaml
# otel-collector-contrib v0.110+ (2026)
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size_mib: 16
      http:
        endpoint: 0.0.0.0:4318

processors:
  # 1. Detecta resource (cloud, host, k8s)
  resourcedetection:
    detectors: [env, system, ec2, eks]
    timeout: 2s
    override: false

  # 2. Enrich com k8s metadata (pod, namespace, deployment)
  k8sattributes:
    auth_type: serviceAccount
    passthrough: false
    extract:
      metadata:
        - k8s.namespace.name
        - k8s.pod.name
        - k8s.deployment.name
        - k8s.node.name
      labels:
        - tag_name: app.version
          key: version
          from: pod

  # 3. Filtra noise (health checks)
  filter/healthchecks:
    error_mode: ignore
    traces:
      span:
        - 'attributes["http.route"] == "/healthz"'
        - 'attributes["http.route"] == "/readyz"'

  # 4. Tail sampling — decisão APÓS trace completo
  tail_sampling:
    decision_wait: 30s          # buffer 30s pra trace montar
    num_traces: 100000          # max in-memory traces (OOM guard)
    expected_new_traces_per_sec: 5000
    policies:
      - name: errors-always
        type: status_code
        status_code: { status_codes: [ERROR] }
      - name: slow-traces
        type: latency
        latency: { threshold_ms: 1000 }
      - name: critical-tenants
        type: string_attribute
        string_attribute:
          key: tenant.tier
          values: [enterprise, premium]
      - name: probabilistic-rest
        type: probabilistic
        probabilistic: { sampling_percentage: 1.0 }

  # 5. Span metrics — gera RED metrics (rate/errors/duration) DOS traces
  spanmetrics:
    metrics_exporter: prometheusremotewrite
    dimensions:
      - name: http.route
      - name: http.response.status_code
      - name: service.name
    histogram:
      explicit:
        buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2s, 5s]

  # 6. Batch (sempre por último antes do export)
  batch:
    timeout: 5s
    send_batch_size: 10000
    send_batch_max_size: 11000

exporters:
  otlphttp/tempo:
    endpoint: https://tempo.obs.svc:4318
    compression: gzip
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 5m

  prometheusremotewrite:
    endpoint: https://prometheus.obs.svc/api/v1/write
    resource_to_telemetry_conversion: { enabled: true }

service:
  extensions: [health_check, pprof]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resourcedetection, k8sattributes, filter/healthchecks, tail_sampling, spanmetrics, batch]
      exporters: [otlphttp/tempo]
    metrics:
      receivers: [otlp]
      processors: [resourcedetection, k8sattributes, batch]
      exporters: [prometheusremotewrite]
  telemetry:
    metrics:
      level: detailed
      address: 0.0.0.0:8888
```

Ordem dos processors importa. `k8sattributes` antes do `tail_sampling` (precisa do attribute pra policy decidir). `batch` SEMPRE por último (agrupa pré-export, reduz round-trips). `spanmetrics` ANTES de `batch` (gera metrics derivadas dos spans pré-export).

#### Tail sampling deep

Head sampling (decisão no client antes do span existir) é cego — perde 99% das traces antes de saber se deu erro. Tail sampling (decisão no Collector após trace completo) é caro mas inteligente. Trade-off:

- **decision_wait** (30s típico): tempo que Collector espera pra ter "todos" os spans do trace. Trace mais longo que isso = decisão incompleta. Aumentar custa memória.
- **num_traces** (100k): max traces em buffer in-memory. OOM guard. Em traffic spike (100k traces/s × 30s = 3M traces se não capar) o Collector morre sem isso.
- **expected_new_traces_per_sec**: hint pra pré-alocar hashmap. Errar pra menos = realloc constante.

Policies compõem (OR lógico): se QUALQUER policy diz "keep", o trace fica. Padrão saudável: `errors-always` + `latency > P99` + `1% probabilistic baseline`. Em multi-tenant, adicionar policy por tier (enterprise = 100%, free = 0.1%).

Custo: tail sampling Collector dimensionado pra ~50k spans/s por instance com 8GB RAM. Acima disso, sharding por trace_id (load balancer com `routing_key=traceID` no `loadbalancing` exporter, garante todos spans de um trace caem na mesma instance).

#### Exemplars — ligando metric a trace

Exemplar é attribute opcional num metric point apontando trace_id+span_id de UMA execução exemplar daquele bucket. Histogram `http.server.duration` no bucket `[1s, 2.5s]` carrega exemplar `trace_id=abc123` — clica no spike P99 do Grafana, abre o trace exato no Tempo. Um clique entre "métrica está ruim" e "este request específico foi ruim por isso".

Emit em Node com `@opentelemetry/sdk-metrics`:

```ts
import { metrics, trace } from '@opentelemetry/api'
const histogram = metrics.getMeter('http').createHistogram('http.server.duration', {
  unit: 'ms',
  advice: { explicitBucketBoundaries: [10, 50, 100, 250, 500, 1000, 2500, 5000] },
})

// No middleware HTTP:
const start = performance.now()
res.on('finish', () => {
  const ctx = trace.getActiveSpan()?.spanContext()
  histogram.record(performance.now() - start, {
    'http.route': req.route?.path ?? 'unknown',
    'http.response.status_code': res.statusCode,
    // exemplar é injetado AUTOMATICAMENTE se há span ativo no contexto
  })
})
```

Backend storage: Prometheus 3.x suporta exemplars nativamente (`--enable-feature=exemplar-storage`, ring buffer separado, default 100k exemplars). Grafana renderiza diamond marks no histogram panel ligando ao Tempo data source.

Cuidado: exemplars em metrics de altíssima cardinalidade (label `user_id`) explodem custo. Manter em metrics agregadas (route + status), não em metrics dimensionadas por entidade.

#### Continuous profiling 2026

Profiling era ferramenta de "pegar momentaneamente quando há problema". Continuous profiling = sempre on, sample rate baixo (~100Hz), eBPF coleta stack traces sem instrumentação no app. Ferramentas mainstream:

- **Pyroscope** (Grafana): backend OSS, agent eBPF (`pyroscope ebpf`) ou SDK push. Storage flame graphs queryáveis por label.
- **Parca**: backend OSS focado em eBPF, integra com Polar Signals Cloud.
- **Grafana Profiles**: SaaS managed Pyroscope, integra Grafana Cloud stack (logs/metrics/traces/profiles).

Trace-to-profile correlation 2026: span injeta `pyroscope.profile_id` baggage; Pyroscope agent captura stack traces durante execução do span e linka via span_id. Grafana Tempo panel mostra "View profile for this span" — flame graph do tempo CPU gasto entre span start e end.

Setup Node SDK push:

```ts
import Pyroscope from '@pyroscope/nodejs'

Pyroscope.init({
  serverAddress: 'http://pyroscope.obs.svc:4040',
  appName: 'orders-api',
  tags: {
    env: process.env.NODE_ENV,
    version: process.env.APP_VERSION,
  },
  sampleRate: 100,        // Hz; padrão = 100, overhead ~1-2% CPU
  wall: { collectCpuTime: true },
})
Pyroscope.start()
```

Overhead real: SDK profiling ~1-2% CPU @ 100Hz. eBPF profiling (kernel-level, perf_event) ~0.5% sem precisar tocar no app — vantagem clara em fleet poliglota. Custo storage: ~1KB/s por process em flame graphs comprimidos delta-encoded.

#### Resource detection e propagação

`resourcedetectionprocessor` enriquece spans com cloud/host/k8s metadata sem o app saber. Em EKS: detecta `cloud.provider=aws`, `cloud.region=us-east-1`, `host.id`, `k8s.cluster.name`. Combinado com `k8sattributesprocessor` (precisa de RBAC pra ler API server), adiciona `k8s.pod.name`, `k8s.deployment.name`, `k8s.namespace.name`. Resultado: query Tempo "show traces from deployment=orders-api in namespace=prod" funciona sem o app ter logado nada disso.

#### OTLP/HTTP vs gRPC

Default historicamente foi gRPC (4317). 2026 trend é OTLP/HTTP (4318) por: load balancers L7 entendem (gRPC precisa L7 com HTTP/2 awareness), proxies/CDNs corporate friendly, debug com curl. Performance: gRPC ~15-20% menor overhead em fleet grande (binary framing, multiplexing). HTTP é fine pra <10k spans/s por client. Acima disso, gRPC.

#### Stack Logística aplicada

Fleet de ~40 services Node em EKS. Antes: Datadog APM SDK em todos, vendor lock, custo $18k/mês. Migração 2026: OTel SDK em todos, Collector DaemonSet (agent) + Deployment (gateway com tail sampling), Tempo pra traces, Mimir pra metrics, Loki pra logs, Pyroscope pra profiling. Tail sampling: 100% errors + P99>1s + 2% baseline. Exemplars on em todos histograms HTTP/DB. Span-to-profile via Pyroscope eBPF DaemonSet. Custo final: ~$3k/mês (S3 backend Tempo + EBS Mimir). MTTR p50 caiu 60% — clique no spike → trace → profile, sem `kubectl exec` em produção.

#### 10 anti-patterns

1. **Collector single instance sem HA** — SPOF na ingestion. Telemetria some em deploy/restart. Sempre 2+ replicas, headless service, loadbalancing exporter pra trace_id stickiness.
2. **`tail_sampling` sem `num_traces` cap** — OOM em traffic spike. Sem cap, buffer cresce sem limite, pod morre, telemetria zerada.
3. **Exemplars em metric high-cardinality** (`user_id` label) — cost explosion no Prometheus exemplar storage. Manter em metrics agregadas.
4. **Continuous profiling sem sample rate config** — assumir default vendor é seguro. Validar overhead em staging com load real (>2% CPU = problema).
5. **Semantic conventions custom sem prefix** — definir `request.method` colide com `http.request.method` upstream. Sempre `app.<dominio>.<attr>` (ex: `app.orders.tenant_tier`).
6. **`batch` processor primeiro no pipeline** — agrupa antes de filtrar/sampling = trabalho desperdiçado. Batch SEMPRE último.
7. **`k8sattributes` sem RBAC adequado** — Collector sem permission lê API server retorna spans sem enrichment, debug vira pesadelo. Aplicar ClusterRole `pods, namespaces` get/list/watch.
8. **OTLP/gRPC atrás de ALB sem HTTP/2** — gRPC quebra silenciosamente, spans somem. ALB precisa target group HTTP/2 ou usar OTLP/HTTP.
9. **Tail sampling `decision_wait` muito curto** (5s) em fleet com long-running traces (background jobs) — decisão tomada antes do trace completar, perde spans tardios. Calibrar com P99 trace duration real.
10. **`spanmetrics` sem dimension cap** — incluir `url.full` como dimension explode séries Prometheus. Whitelist dimensions: `service.name`, `http.route`, `http.response.status_code`. Nunca path raw.

Cruza com **§2.5** (traces foundation, span/context propagation), **§2.13** (profiling intro, motivação), **§2.16** (eBPF, base do continuous profiling kernel-side), **§2.18** (cost — tail sampling é alavanca #1 de redução), **§2.19** (LLM observability — OTel GenAI semconv 2026 estável), **02-07** (Node `--require` order pra `@opentelemetry/auto-instrumentations-node`), **03-15** (MTTR via traces correlacionados a profiles), **04-09** (scaling — Collector horizontal sharding por trace_id), **02-17 §2.20** (mobile observability 2026 — Sentry SDK 8 + MetricKit + Macrobenchmark + Android Vitals), **03-09 §2.21** (RUM + LoAF integration pra INP attribution), **01-02 §2.11** (Linux observability stack — eBPF + journald + PSI).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Distinguir logs, metrics, traces e dar caso pra cada.
- Listar 4 tipos de Prometheus metric e quando usar.
- Explicar cardinalidade explosion e citar 3 labels que evitar.
- Diferenças RED e USE method.
- Configurar OTel SDK em Node.js para trace via OTLP.
- Definir SLI/SLO realista pra endpoint critical.
- Calcular burn rate alert.
- Justificar tail-based sampling em vez de head-based.
- Estratégia de logs em microservices: quem loga o quê, requestId/traceId.
- Distinguir Grafana LGTM vs Datadog em custo, features, lock-in.

---

## 4. Desafio de Engenharia

Instrumentar **Logística v1** com observability profissional. Stack open-source rodando em Docker Compose ou K8s.

### Especificação

1. **Stack**:
   - Prometheus + Grafana + Loki + Tempo + Alertmanager (LGTM).
   - OTel Collector em modo agent.
   - Apps com OpenTelemetry SDKs.
   - **Alternativa**: Grafana Cloud free tier.
2. **Instrumentação backend**:
   - Auto-instrumentation HTTP, Postgres (pg), Redis, fetch.
   - Manual spans em cálculos críticos (matchmaking de courier, agregação de relatório).
   - Custom metrics: `orders_created_total{tenant,status}`, `courier_assignment_latency_seconds`, `ws_connections_active`.
   - Logs estruturados pino, com `traceId` injetado a partir do OTel context.
3. **Instrumentação front (RUM)**:
   - Web Vitals coletados via OTel browser SDK ou Grafana Faro.
   - Erros JS reportados (Sentry-style fallback aceitável).
4. **Dashboards**:
   - **API RED**: rate, error rate, p50/p95/p99 por rota.
   - **Postgres USE**: connections used/max, query rate, lock wait.
   - **Redis**: ops/s, memory used, eviction count.
   - **Real-time**: WS connections active, SSE clients, event lag.
   - **Business**: orders created/min, deliveries completed, courier idle ratio.
5. **SLOs**:
   - 99% das requests `GET /orders` < 300ms.
   - 99.5% das requests `POST /orders` succeed (não 5xx).
   - 99% dos eventos courier delivered within 5 min de status change.
   - Configure SLO no Grafana SLO panel ou via Sloth (Prometheus rules).
   - Burn rate alerts (1h e 6h windows).
6. **Alerts**:
   - Alertmanager → Slack ou email.
   - 3 alertas críticos: SLO burn, DB conn pool 90%, error rate > 1%.
   - Cada um com link pra runbook (mesmo que stub).
7. **Tracing distribuído**:
   - Demonstre 1 trace cobrindo: web request → api → DB query → Redis → response.
   - Demonstre 1 trace cobrindo WS message: front → api WS → Redis pub → outro app subscriber → SSE → front cliente.
8. **Profiling**:
   - Pyroscope ou clinic flame em load test, capturar profile, identificar 1 hotspot.

### Restrições

- Sem `console.log` de info em prod. Logs estruturados sempre.
- Sem alertas que não exigem ação humana.
- Sem labels com cardinalidade alta (userId).
- Sem 100% sampling em prod tracing (use 10% + tail-based).

### Threshold

- README documenta:
  - Diagrama do stack obs.
  - Lista de SLIs/SLOs definidos com justificativa.
  - Screenshots de 4 dashboards.
  - 1 incidente simulado (force erro em endpoint, mostre alerta disparando, mostre trace identificando causa).
  - Cálculo de custo aproximado em Grafana Cloud (ou storage size se self-hosted).
  - 3 cardinality bombs evitadas e justificativa.

### Stretch

- Continuous profiling com Pyroscope correlacionado a traces.
- eBPF: rodar Pixie em K8s, comparar visibility com OTel manual.
- Synthetic checks com Checkly em fluxos críticos.
- Honeycomb integration pra tail-based sampling baseado em fields.
- Grafana annotations em deploy (03-04 integration).

---

## 5. Extensões e Conexões

- Liga com **02-07** (Node): event loop lag é métrica core.
- Liga com **02-08** (frameworks): hooks pra instrumentar.
- Liga com **02-09** (Postgres): pg_stat_statements, conn pool métricas.
- Liga com **02-11** (Redis): slowlog, ops/s.
- Liga com **02-14** (real-time): WS connections, fan-out lag.
- Liga com **03-03** (K8s): Prometheus Operator, ServiceMonitor.
- Liga com **03-04** (CI/CD): release annotations, DORA.
- Liga com **03-05** (AWS): CloudWatch vs LGTM trade-offs.
- Liga com **03-10** (perf backend): profile correlated com traces.
- Liga com **04-04** (resilience): circuit breaker metrics, retry budgets.
- Liga com **04-12** (tech leadership): SLO culture, on-call.

---

## 6. Referências

- **"Observability Engineering"**: Charity Majors, Liz Fong-Jones, George Miranda.
- **"Site Reliability Engineering"**: Google. Capítulos sobre SLO, error budget, alerting.
- **"The SRE Workbook"**: Google.
- **OpenTelemetry docs** ([opentelemetry.io](https://opentelemetry.io/)).
- **Prometheus docs** ([prometheus.io/docs](https://prometheus.io/docs/)).
- **Grafana docs** + **LGTM stack docs**.
- **Honeycomb blog**: Charity, Liz; threads sobre debugging.
- **Brendan Gregg, "Systems Performance"**: USE method, profiling.
- **Pyroscope docs** ([grafana.com/oss/pyroscope](https://grafana.com/oss/pyroscope/)).
- **Sloth** ([sloth.dev](https://sloth.dev/)), SLO generator.
