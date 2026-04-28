---
module: P07
title: Observability — Logs, Metrics, Traces, SLO/SLI, OpenTelemetry
stage: professional
prereqs: [P03, P04]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# P07 — Observability

## 1. Problema de Engenharia

A maioria dos sistemas em produção não é "observable" — é "monitored". Existe diferença real. Monitoring responde "X está vermelho?". Observability responde "por que X virou vermelho de jeitos que você não previu?". Logs verbose sem contexto, métricas sem cardinalidade decente, traces ausentes, alertas paginando madrugadas em problemas inúteis. Tudo isso é norma.

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

- **pino** (Node) — JSON, super fast.
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

**RED** (Rate, Errors, Duration) — pra serviços que respondem requests:
- Rate: req/s.
- Errors: % falhando.
- Duration: latência (p50, p95, p99).

**USE** (Utilization, Saturation, Errors) — pra recursos:
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

Esse stack ("LGTM" — Loki/Grafana/Tempo/Mimir) compete com SaaS modernamente.

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
- **Severidade**: P1 = paginar; P2 = ticket business hours; P3 = note.

### 2.12 On-call e culture

- **PagerDuty / Opsgenie**: routing, schedules, escalation.
- **Blameless postmortem**: foco em sistemas, não pessoas.
- **Game days**: simular incidentes pra treinar.
- **Charity Majors / Liz Fong-Jones**: leitura referência.

### 2.13 Profiling

Sampling profiler runs em produção pra mostrar "onde CPU vai":
- **pprof** (Go) — clássico.
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

### 2.16 eBPF e high-cardinality observability

eBPF: sondas no kernel sem invasividade. Tools:
- **Pixie**: K8s observability via eBPF.
- **Cilium Tetragon**: security + observability.
- **Parca**: continuous profiling.

Em sistemas distribuídos sérios, eBPF dá visibilidade que tradicionalmente exigia agentes invasivos.

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
- Retention policies (logs 7 dias, metrics 30 dias, archives no S3).
- Aggregate edge: OTel Collector dedupa, sample.

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
- Grafana annotations em deploy (P04 integration).

---

## 5. Extensões e Conexões

- Liga com **A07** (Node): event loop lag é métrica core.
- Liga com **A08** (frameworks): hooks pra instrumentar.
- Liga com **A09** (Postgres): pg_stat_statements, conn pool métricas.
- Liga com **A11** (Redis): slowlog, ops/s.
- Liga com **A14** (real-time): WS connections, fan-out lag.
- Liga com **P03** (K8s): Prometheus Operator, ServiceMonitor.
- Liga com **P04** (CI/CD): release annotations, DORA.
- Liga com **P05** (AWS): CloudWatch vs LGTM trade-offs.
- Liga com **P10** (perf backend): profile correlated com traces.
- Liga com **S04** (resilience): circuit breaker metrics, retry budgets.
- Liga com **S12** (tech leadership): SLO culture, on-call.

---

## 6. Referências

- **"Observability Engineering"** — Charity Majors, Liz Fong-Jones, George Miranda.
- **"Site Reliability Engineering"** — Google. Capítulos sobre SLO, error budget, alerting.
- **"The SRE Workbook"** — Google.
- **OpenTelemetry docs** ([opentelemetry.io](https://opentelemetry.io/)).
- **Prometheus docs** ([prometheus.io/docs](https://prometheus.io/docs/)).
- **Grafana docs** + **LGTM stack docs**.
- **Honeycomb blog** — Charity, Liz; threads sobre debugging.
- **Brendan Gregg, "Systems Performance"** — USE method, profiling.
- **Pyroscope docs** ([grafana.com/oss/pyroscope](https://grafana.com/oss/pyroscope/)).
- **Sloth** ([sloth.dev](https://sloth.dev/)) — SLO generator.
