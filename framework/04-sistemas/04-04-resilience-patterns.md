---
module: 04-04
title: Resilience Patterns, Retries, Circuit Breaker, Bulkhead, Timeouts
stage: sistemas
prereqs: [04-01, 04-02]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 04-04, Resilience Patterns

## 1. Problema de Engenharia

Sistema distribuído sempre tem componentes degradados. A pergunta é: o que acontece com SEUS clientes quando o de cima quebra? Default: cascading failure. Cliente espera; thread blocks; pool exhausts; outros clientes morrem. Catástrofe via deps.

Este módulo é resilience aplicada: timeouts, retries com backoff, jitter, idempotência (revisitada), circuit breaker, bulkhead, hedged requests, load shedding, graceful degradation, chaos engineering. Você sai sabendo desenhar serviço que fica de pé quando deps caem.

---

## 2. Teoria Hard

### 2.1 Failure modes

- **Hard failure**: serviço down. Connection refused.
- **Slow failure**: serviço lento. Timeout ou retorna após segundos.
- **Soft failure**: erro 5xx para parte das requests.
- **Brown-out**: parcialmente degradado (90% ok, 10% lento).
- **Cascading failure**: 1 dep cai → consumer A satura → consumer B (depende de A) satura.

Slow failure é pior que hard. Consumer não detecta rápido.

### 2.2 Timeouts

**Sempre** defina timeout em qualquer dep call (HTTP, DB, Redis, queue). Sem timeout, espera infinitamente em bug do upstream.

Timeouts por camada:
- Connection timeout (estabelecer): segundos.
- Request/socket timeout: depende do operação. p99 + buffer.
- Total timeout (deadline): garantir que cliente não espera depois do que vale.

Em microservices: **deadline propagation**. Upstream passa "tempo restante" pra downstream.

### 2.3 Retries

Retry em failures transientes (network blip, momento de leader election). NUNCA em failures permanentes (4xx auth errors).

Quando retry:
- Idempotent operation, ou idempotency key.
- Erro transiente (5xx, 429, network).
- Não tem lock no caller (pra não cascading bigger).

Como:
- **Backoff exponencial**: `2^n * base + jitter`. Sem jitter, cluster sincroniza retries (thundering herd).
- **Jitter**: full jitter `random(0, base * 2^n)` é robusto.
- **Cap**: limite total de tentativas (3-5) e delay máximo (30s, 60s).
- **Budget per request**: total time de retries < deadline.

Retry storm: cada layer retries N vezes. 3 layers x 3 retries = 27x carga em downstream falhando. Normalmente: retries só na camada mais externa (cliente edge); inner calls fail-fast.

### 2.4 Idempotency revisited

Retry sem idempotência = duplicação. Problema crítico em pagamentos, mensagens, mutations.

Padrões:
- HTTP idempotency-key header (Stripe, etc.).
- DB unique constraints (insert + dedup via `ON CONFLICT`).
- Outbox + dedup consumer.
- Operations naturally idempotent (`UPDATE x SET status='paid' WHERE id=Y`).

### 2.5 Circuit breaker

Pattern (Michael Nygard, "Release It!"). Estados:
- **Closed**: requests passam. Conta failures.
- **Open**: failures excederam limite. Requests **fail fast** sem chamar dep.
- **Half-open**: após cooldown, libera N requests pra testar. Se OK → closed. Se falha → open novamente.

Benefícios:
- Para de bombear dep down.
- Cliente recebe resposta rápida em vez de esperar timeout.
- Self-healing.

Libs: **opossum** (Node), **resilience4j** (Java), **gobreaker** (Go), **failsafe-go**.

Configurar:
- Threshold (% failure ou absoluto).
- Window (rolling).
- Cooldown.
- Half-open trial size.

### 2.6 Bulkhead

Isole recursos por consumer/tipo de request. Falha de um não derruba outros.

Exemplos:
- Pools separados de threads/conexões por dep.
- Tenants críticos com pool separado.
- Limite de concurrent requests por endpoint.

Em K8s: pods separados por workload (rate-sensitive vs batch).

### 2.7 Rate limiting (revisitado)

Server-side: protege contra abuse e overload. Cliente-side: protege downstream.

Em sistemas multi-tenant, rate limit por tenant (vimos em 02-11). Garante 1 tenant não engole capacity.

### 2.8 Load shedding

Quando overloaded, **rejeite** requests "novos" pra preservar SLO em-curso. Vimos em 03-10.

Indicators:
- Queue depth.
- Concurrent in-flight requests.
- CPU saturation.
- Event loop lag (Node).

Rejeição com 503 + Retry-After. Cliente robusto recua.

### 2.9 Hedged requests

Send mesma request a 2 backends; aceita primeira resposta. Reduz tail latency.

Quando: leituras idempotentes onde 99th percentile importa muito (search queries).

Cuidado: dobra carga. Faça só pra slow requests (após p95 estimado, dispare segunda).

Google publicou paper "The Tail at Scale", clássico do tema.

### 2.10 Fallback e graceful degradation

Quando dep falha, **responder algo útil** em vez de erro:
- Cache stale.
- Default value.
- Skipping feature non-essential (recommendations off, core query continua).

Em UI: skeleton + "indisponível", mas core funcional.

Anti-pattern: fallback que esconde problema permanente. Sempre alarme.

### 2.11 Chaos engineering

Deliberadamente injetar falhas pra validar resilience.

- Netflix Simian Army (Chaos Monkey, Latency Monkey, etc.).
- Litmus (K8s).
- Gremlin (commercial).
- Toxiproxy (network proxy com failures injetáveis).

Game days: time agendado pra simular incidente, observar response, melhorar.

### 2.12 Graceful shutdown

Vimos. Recap:
1. Para de aceitar new connections/messages.
2. Espera in-flight terminar (com timeout).
3. Fecha resources (pools, queues).
4. Exit.

Em K8s: `preStop` hook pra delay (deregister de service mesh ou ALB) antes de SIGTERM.

### 2.13 Health checks

Liveness vs readiness (03-03):
- Readiness: posso receber tráfego? Verifica deps essenciais.
- Liveness: estou vivo? Restart se não.

Anti-pattern: readiness verificando todas as deps. Cascade failure: dep down → cluster inteiro unready → não aceita reqs → não consegue se recuperar.

Best practice: shallow liveness (responde algo); medium readiness (deps críticos próprios); deep checks via separate `/diag` endpoint.

### 2.14 Caching pra resilience

Cache pode mascarar dep falha:
- Stale-while-revalidate: serve cached enquanto refetch async.
- Negative cache: se dep retorna 404, cache 404 brevemente.
- Last-known-good: persist cached valor após refresh fail.

Cuidado: stale data infinito esconde bug.

### 2.15 Compartmentalization e blast radius

Falha em região 1 não deve afetar região 2. Falha em tenant A não deve afetar tenant B.

Multi-region active-active complexo (04-09). Single-region multi-AZ é base.

Tenants críticos isolados (database, pool, deployment) limita blast.

### 2.16 Observability + alerts pra resilience

- **Error budget** (03-07).
- **Burn rate alerts**.
- **Latency percentiles** (não só média).
- **Dependency dashboards** mostrando saúde de cada dep.

Observação informa onde resilience falhou.

### 2.17 Failure budgets

Aceite que failure acontece. Defina threshold:
- 99% SLO ⇒ 1% error budget no mês ⇒ ~7h downtime aceitos.
- Quando consumir budget rapidamente, **freeze deploys** e foque em estabilidade.

Cultura SRE.

### 2.18 Padrões aplicados ao Node

- **AbortController**: cancela fetch se cliente desconectou.
- **`p-retry`**, **`async-retry`** libs com backoff/jitter.
- **opossum** circuit breaker.
- **bottleneck** rate limiter / concurrency.
- Timeout via `AbortSignal.timeout(ms)`.

### 2.19 Hedging requests (Tail at Scale)

Dean & Barroso (2013, "The Tail at Scale") observam: P99 latency em service distribuído explode com fan-out. Pra agregação que chama N backends, P99 do todo é dominado pelo lento.

**Solution: hedged requests**.
- Send request a A.
- Espera tempo curto (P50 do A típico).
- Se A não respondeu, send request a B (replica).
- Pega primeira resposta, cancela outra.

Custo: 5-10% mais requests. Benefício: P99 cai 20-40% típico.

```ts
async function hedge(call: () => Promise<T>, hedgeAfterMs: number): Promise<T> {
  const a = call();
  const timeout = new Promise<T>((_, rej) => setTimeout(() => rej('hedge'), hedgeAfterMs));
  try {
    return await Promise.race([a, timeout]);
  } catch {
    const b = call();
    return await Promise.race([a, b]);
  }
}
```

Cuidados:
- **Idempotência obrigatória**: hedge dispara duas writes não-idempotentes = double charge.
- **Cancelation**: AbortController em ambos.
- Não hedge em backend único; hedge requer múltiplas réplicas.

Google Bigtable, Spanner, Cassandra usam hedging interno. CRDB (CockroachDB) tem opção config.

### 2.20 Adaptive concurrency limits (Netflix)

Em vez de rate limit fixo, **adapt limit dinamicamente** baseado em latency observada.

Algoritmos: TCP-like (additive increase, multiplicative decrease), Little's Law-based, gradient descent.

**Concurrency Limits** library da Netflix. Princípio:
- Mantém limit de in-flight requests.
- Se latency baixa: aumenta limit.
- Se latency degradou: diminui limit.

Resulta: under load, throttle ANTES de cair. P99 protege.

Comparison fixed rate limit:
- Fixed: 1000 req/s. Sob spike, system queue, latency explode.
- Adaptive: descobre limite real ~600 req/s pra latency target, throttle excedente.

### 2.21 Backpressure formal

**Reactive Streams** spec (Java, JS): publisher demand-driven.
- `request(n)`: subscriber pede n items.
- `onNext(item)`: publisher emite (≤ n).
- `onComplete()` / `onError()`.

Implementations: RxJava, Project Reactor, RxJS, Akka Streams.

Princípio: **consumer dita ritmo**. Publisher buffers até demand chegar; em buffer overflow, drop ou block.

Em Node streams: `pipe()` aplica backpressure automático. `writable.write()` retorna `false` quando buffer cheio; producer should pause.

Em Kafka: consumer poll pulled-based; producer block se broker queue cheio (acks=all).

Sem backpressure, OOM kill processo é fim típico.

### 2.22 Token bucket vs Leaky bucket, math

**Token bucket**:
- Bucket capacity C, refill rate R tokens/s.
- Cada request consume 1 token.
- Se bucket vazio, throttle.
- Permite **bursts** de até C requests.

```
tokens = min(C, tokens + (now - last_refill) * R)
if tokens >= 1:
  tokens -= 1
  allow
else:
  deny
```

**Leaky bucket**:
- Queue size Q, leak rate R req/s.
- Queue overflow → drop.
- Smooths bursts pro rate constante.

Trade-off:
- Token bucket: tolera burst, predictable steady-state. Use em APIs públicas.
- Leaky bucket: smooth output, sem burst. Use em downstream proteção.

**Distributed implementation**: Redis Lua script (atomic), ou DynamoDB conditional updates. Sliding window log (precise mas pesado), sliding window counter (approximate, fast).

### 2.23 Circuit breaker formal state machine

```
                 [request fails N times]
   ┌──────► CLOSED ─────────────────────► OPEN ◄─────┐
   │  (normal)                       (reject all)    │
   │  ▲                                  │           │
   │  │ [success]            [timeout]   │           │
   │  │                          ▼                   │
   └──┴───────────── HALF_OPEN ──────────────────────┘
                  (allow 1 trial)         [fail]
```

Estados:
- **CLOSED**: normal. Tracking failure rate.
- **OPEN**: fail-fast. Não chama backend; retorna erro imediato.
- **HALF_OPEN**: timeout expirou. Permite 1 request trial. Sucesso → CLOSED. Falha → OPEN.

**Tunables**:
- Threshold (% failures pra abrir): tipicamente 50%.
- Window size (sliding count of requests): 20-100.
- Open timeout (tempo até half-open): 5-30s.
- Half-open trials: 1-3.

**Errors counted**: timeout sim, 5xx sim, 4xx tipicamente não (cliente error, não backend issue).

Hystrix (Netflix, agora maintenance) era padrão; substituído por resilience4j (Java), opossum (Node), failsafe-go.

### 2.24 Bulkhead concrete

Bulkhead (origem nautica): compartimentos isolados; flood em um não afunda navio.

Em sistema:
- **Thread pool isolation**: cada downstream tem pool próprio. Slow downstream esgota seu pool sem afetar outros.
- **Connection pool isolation**: per-tenant connection pool em DB.
- **Process isolation**: services em containers separados.
- **Tenant isolation**: rate limit por tenant; quota per-tenant.

Trade-off: isolamento custa recursos (N pools = N * size).

Logística: rate limit por lojista (não 1 cliente abusivo derruba todos).

### 2.25 Failover patterns

**Active-passive**: primary serve; standby aguarda. Failover manual ou automático (heartbeat-based).

**Active-active**: ambos serve. Carga distribuída. Conflict resolution se mesma escrita em ambos.

**Multi-region**:
- **Read replicas multi-region**: writes em primary 1 região, reads local.
- **Multi-master**: writes locais; resolução via vector clocks ou CRDT (DynamoDB Global Tables, Cassandra).
- **Multi-region active-active**: completos clusters per região; client resolve conflitos eventualmente.

Trade-off latency vs consistency: multi-region active-active típicamente eventual consistency. Strong consistency multi-region requer Spanner-class (TrueTime + Paxos).

### 2.26 Chaos engineering principles (Netflix)

Premissas:
1. Build hipóteses sobre comportamento steady-state.
2. Vary real-world events (kill instance, latency injection, cert expire).
3. Run experiments em production (controlled).
4. Automate experiments continuous.
5. Minimize blast radius (canary first, all later).

Tools:
- **Chaos Monkey**: kill random instances.
- **Chaos Kong**: kill region.
- **Latency Monkey**: inject latency.
- **Chaos Mesh** (K8s native).
- **Litmus**.
- **Gremlin** (commercial).

Game days (03-15) executam manualmente; chaos engineering automatiza.

### 2.27 Failure budget aplicado

Erro budget (03-15): `1 - SLO`. SLO 99.9% → 0.1% = 43 min/mês.

**Behavior**:
- Budget healthy: ship features aggressive.
- Budget queimado fast: freeze features, focus stability.
- Budget zerado: incident response top priority.

Engineering impact:
- Eng team prioriza based on data, not gut.
- Product team understands rel risk vs reliability.
- Resolve "ship vs stable" política via número.

Patterns aplicados: 25% budget = canário sem cuidado; 75% queimado = só hotfixes; 100% queimado = só revert + recovery.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Distinguir hard, slow, soft, brown-out, cascading failures.
- Justificar timeout em cada call externa.
- Explicar retry storm e como camadas internas evitam.
- Backoff exponencial + jitter; por que jitter importa.
- Circuit breaker estados e uma config exemplo.
- Bulkhead em 2 cenários.
- Hedged requests trade-offs.
- Graceful shutdown em K8s com preStop.
- Anti-padrão de readiness check verificando deps caóticas.
- Error budget e burn rate.

---

## 4. Desafio de Engenharia

Resilience hardening do **Logística v2**.

### Especificação

1. **Timeouts em todas chamadas externas**:
   - DB queries: timeout (statement_timeout em Postgres).
   - Redis ops: connect + command timeout.
   - HTTP outbound (couriers app → backend, backend → Stripe mock): timeouts agressivos.
   - Documente values.
2. **Retries com backoff + jitter**:
   - Lib `async-retry` ou `p-retry` em chamadas crítical idempotent.
   - Apenas na camada externa (consumer); chamadas internas fail-fast.
3. **Circuit breaker**:
   - opossum (ou equivalent) em chamada crítica externa (mock pagamento, webhook outbound).
   - Métricas exposed: state, fail_rate, half-open trials.
   - Demonstre simulação: dep down → CB abre → fail-fast.
4. **Bulkhead**:
   - Pool de connection HTTP separado pra "billing" vs "notifications".
   - Limite concorrência em endpoint pesado (`POST /reports/heatmap`) com semaphore.
5. **Load shedding**:
   - Configurar limit in-flight requests global (Fastify, Hono).
   - 503 com Retry-After quando saturated.
   - Demonstre via load test sob spike.
6. **Idempotency consolidado**:
   - Header `Idempotency-Key` em mutations críticas (`POST /orders`, `POST /payment`).
   - Dedup window via Redis.
7. **Graceful shutdown**:
   - SIGTERM handler completo.
   - K8s: `preStop` 5s sleep antes de SIGTERM (let LB deregister).
   - Demonstre durante load test: kill pod, sem erros 5xx pra clients.
8. **Caching pra resilience**:
   - Stale-while-revalidate em endpoint que depende de dep externa instável.
   - Demonstre que dep down → users still get response (com flag "stale").
9. **Chaos**:
   - Toxiproxy injetando latency em Redis e Postgres.
   - Documente comportamento: SLO violado? CB ativou? Load shed funcionou?
   - Escolha 3 cenários de falha + observação.
10. **Failure modes documentation**:
    - `RUNBOOK.md` cobrindo:
      - Postgres primary down.
      - Redis cluster split.
      - Kafka broker majority loss.
      - Webhook outbound dep flaky.
      - Each: detection, impact, mitigation, recovery.

### Restrições

- Sem retries em mutations não-idempotent.
- Sem fallback escondendo failure permanente.
- Sem readiness check que faz cluster inteiro unready em dep flaky.

### Threshold

- README documenta:
  - Tabela de timeouts por dep + justificativa.
  - Diagrama de circuit breaker (estados + thresholds).
  - Resultado de chaos test pra cada cenário.
  - Demonstração de graceful shutdown sob load (zero 5xx).
  - Runbook completo.
  - 1 caso onde resilience pattern apparently boa **piorou** algo (e como você corrigiu).

### Stretch

- Hedged requests em endpoint de leitura crítica.
- Implementar próprio circuit breaker do zero (entender semantics).
- Multi-region failover toy: 2 regions, simulada falha total da primária, traffic shifts.
- Game day completo: 2 horas, time amigo simulando incidentes; you respondendo.
- AbortController propagation cross microservices (deadline propagation real).

---

## 5. Extensões e Conexões

- Liga com **02-07** (Node): AbortController, AbortSignal.timeout.
- Liga com **02-11** (Redis): rate limit, cache-as-fallback.
- Liga com **03-03** (K8s): probes, preStop, PDB.
- Liga com **03-07** (observability): SLO, burn rate, dependency health.
- Liga com **03-10** (perf backend): load shedding.
- Liga com **04-01** (theory): retries em modelos async.
- Liga com **04-02** (messaging): consumer retries, DLQ.
- Liga com **04-03** (event-driven): saga compensations, outbox retries.
- Liga com **04-09** (scaling): bulkheads, multi-region.

---

## 6. Referências

- **"Release It!"**: Michael Nygard. Bíblia.
- **"Site Reliability Engineering"**: Google.
- **"The Tail at Scale"**: Dean & Barroso (paper Google).
- **"Designing Distributed Systems"**: Brendan Burns.
- **AWS Builders' Library** ([aws.amazon.com/builders-library](https://aws.amazon.com/builders-library/)), papers operacionais.
- **Resilience patterns docs**: resilience4j, opossum.
- **Charity Majors / Honeycomb blog**: observability + resilience.
- **Netflix Tech Blog**: chaos eng, Hystrix history.
- **Polly** docs (.NET), bons exemplos de patterns.
