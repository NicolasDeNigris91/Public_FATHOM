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

#### Deadline propagation, código real

Sem deadline propagation, cada hop tenta seu próprio timeout. Resultado: cliente já desistiu, mas service A ainda chama B com 5s, B chama C com 5s, todo mundo trabalha à toa, recursos consumidos. **Custo invisível em escala.**

Pseudocódigo padrão (TypeScript-flavored):

```typescript
// Header propagado: X-Request-Deadline = unix_ms_absoluto
type Deadline = { atMs: number };

function withDeadline(parent: Deadline, maxBudgetMs: number): Deadline {
  // Filho herda menor entre o que sobrou e seu max próprio
  const remaining = parent.atMs - Date.now();
  return { atMs: Date.now() + Math.min(remaining, maxBudgetMs) };
}

function remainingMs(d: Deadline): number {
  return Math.max(0, d.atMs - Date.now());
}

async function call<T>(svc: string, path: string, deadline: Deadline): Promise<T> {
  const ms = remainingMs(deadline);
  if (ms <= 0) throw new DeadlineExceededError(svc);

  // Reserva 50ms de buffer pra processamento local + serialização
  const downstreamBudget = ms - 50;
  if (downstreamBudget <= 0) throw new DeadlineExceededError(svc);

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(`https://${svc}${path}`, {
      signal: ctrl.signal,
      headers: { 'X-Request-Deadline': String(deadline.atMs) }
    });
    return res.json();
  } finally {
    clearTimeout(t);
  }
}
```

Handler do gateway (Logística API entry):

```typescript
app.post('/orders', async (req, res) => {
  // Cliente HTTP timeout de 5s; deadline absoluto pra todo o flow
  const deadline = { atMs: Date.now() + 5000 };

  // 1. valida (10ms typical, budget 50ms)
  const data = await validateInput(req.body, withDeadline(deadline, 50));

  // 2. chama courier-svc (p99 200ms, budget 500ms)
  const courier = await call<Courier>('courier-svc', '/assign',
    withDeadline(deadline, 500));

  // 3. chama payment-svc (p99 800ms, budget 1500ms)
  const payment = await call<Payment>('payment-svc', '/authorize',
    withDeadline(deadline, 1500));

  // 4. persiste (budget = remaining minus reserva)
  await db.transaction(async tx => {
    if (remainingMs(deadline) < 200) throw new DeadlineExceededError('db');
    await tx.insert(orders).values({ ...data, courier, payment });
  });

  res.json({ ok: true });
});
```

Cada hop downstream lê `X-Request-Deadline`, calcula remaining, recusa work se inviável. **Pegadinha**: clock skew entre hosts > tolerância → deadline absoluto via wall clock falha. NTP sane (drift < 50ms) é pré-requisito; em ambientes com skew alto (containers em hardware velho), use deadline relativo (ms) e re-derive a cada hop.

Implementações production-ready:
- **gRPC**: `context.WithDeadline` em Go, `Metadata grpc-timeout` em wire.
- **OpenTelemetry baggage**: propaga `deadline` como W3C baggage.
- **Anthropic SDK**: passa `signal: AbortSignal` que cascateia.

Cruza com **04-09 §2.13** (observability cost de calls que continuam após cliente desistir) e **04-04 §2.5** (circuit breaker fecha antes de deadline expirar).

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

#### Jittered exponential backoff — implementação completa

AWS Architecture Blog (Marc Brooker, 2015) compara 3 estratégias de jitter; **decorrelated jitter** vence em throughput sob contention. Implementação production-ready:

```typescript
type RetryConfig = {
  baseMs: number;        // delay inicial, ex: 100
  maxMs: number;         // cap por tentativa, ex: 30_000
  maxAttempts: number;   // 3-5 típico; nunca infinito
  totalBudgetMs?: number; // deadline absoluto pra retry chain
  retryableErrors: (err: unknown) => boolean;
  onRetry?: (attempt: number, delayMs: number, err: unknown) => void;
};

class RetryError extends Error {
  constructor(public attempts: number, public lastError: unknown) {
    super(`Failed after ${attempts} attempts`);
  }
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  const startedAt = Date.now();
  let lastDelay = config.baseMs;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;

      // Não-retriable: bail imediato
      if (!config.retryableErrors(err)) throw err;

      // Última tentativa: bail
      if (attempt === config.maxAttempts) break;

      // Calcula delay com decorrelated jitter (Marc Brooker pattern):
      // sleep = min(maxMs, random(baseMs, lastDelay * 3))
      const upperBound = Math.min(config.maxMs, lastDelay * 3);
      const delayMs = config.baseMs + Math.random() * (upperBound - config.baseMs);
      lastDelay = delayMs;

      // Respeita budget total se configurado
      if (config.totalBudgetMs && Date.now() - startedAt + delayMs > config.totalBudgetMs) {
        break;
      }

      config.onRetry?.(attempt, delayMs, err);
      await sleep(delayMs);
    }
  }

  throw new RetryError(config.maxAttempts, lastErr);
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
```

#### Comparação dos 3 jitters canônicos

| Estratégia | Fórmula | Concorrência | Quando |
|---|---|---|---|
| **No jitter** | `delay = base * 2^attempt` | Catastrófica em N clientes (thundering herd) | Nunca em produção |
| **Full jitter** | `delay = random(0, base * 2^attempt)` | Boa; spread uniforme | Default sano; baixo overhead |
| **Decorrelated jitter** | `delay = min(max, random(base, last * 3))` | Vence em contention alta (AWS bench) | Retry pesado em recursos saturados |

Brooker mostrou: em 100k clientes batendo serviço degradado, **decorrelated** entrega ~30% mais throughput de retry sucesso vs **full jitter**. Para casos comuns, full jitter é OK.

#### Uso real Logística — chamada a Stripe API

```typescript
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_KEY!);

async function captureWithRetry(paymentIntentId: string, idempotencyKey: string) {
  return retryWithBackoff(
    () => stripe.paymentIntents.capture(paymentIntentId, undefined, {
      idempotencyKey,        // CRITICAL: retry sem idempotency duplica cobrança
    }),
    {
      baseMs: 200,
      maxMs: 10_000,
      maxAttempts: 4,
      totalBudgetMs: 30_000,
      retryableErrors: (err) => {
        if (!(err instanceof Stripe.errors.StripeError)) return false;
        // Retry: rate limit, server error, network. Não retry: auth, validation, fraud.
        return ['rate_limit_error', 'api_connection_error', 'api_error'].includes(err.type);
      },
      onRetry: (attempt, delayMs, err) =>
        log.warn({ attempt, delayMs, err: err.code }, 'Stripe capture retrying'),
    }
  );
}
```

#### Caveats que mordem em produção

- **`idempotencyKey` é OBRIGATÓRIO** em retry de mutação (payment, delivery dispatch, send notification). Sem ele, retry duplica side effect.
- **`Retry-After` header** (HTTP 429 / 503): respeite. `delayMs = max(decorrelated_calc, retry_after_header_ms)`. Ignorar é hostil ao upstream.
- **Layer-only retry**: retry só na borda (gateway / job worker). Inner service-to-service: fail-fast com circuit breaker (§2.5). Evita 27x amplification.
- **Cancelable**: integre `AbortSignal` pra interromper retry chain quando deadline expira (§2.2).
- **Jittered shutdown**: em redeploy, instances param ao mesmo tempo; retry pra reconnect causa thundering herd ao novo cluster. Add jitter em graceful shutdown delay também.

Cruza com **04-04 §2.4** (idempotency é pré-requisito), **04-04 §2.5** (circuit breaker complementa retry), **04-04 §2.2** (deadline propagation cancela retry chain).

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

#### Backup-after-percentile vs fixed timeout

Hedge com timeout fixo (ex: 50ms) é hack. Timeout deve **adaptar a P95 observado dinamicamente** pra capturar a cauda real:

```typescript
import { TDigest } from 'tdigest';   // approximate quantile estimator

class AdaptiveHedger {
  private digest = new TDigest(0.01);   // 1% accuracy
  private minHedgeAfter = 5;           // ms; floor
  private maxHedgeAfter = 200;         // ms; ceiling

  hedgeAfter(): number {
    if (this.digest.size() < 100) return 50;  // sem amostras suficientes, fallback
    const p95 = this.digest.percentile(0.95);
    return Math.max(this.minHedgeAfter, Math.min(this.maxHedgeAfter, p95));
  }

  recordLatency(ms: number) {
    this.digest.push(ms);
  }

  async call<T>(replicas: (() => Promise<T>)[]): Promise<T> {
    if (replicas.length < 2) return replicas[0]();   // sem hedge possível

    const after = this.hedgeAfter();
    const start = performance.now();
    const ctrlA = new AbortController();
    const ctrlB = new AbortController();

    const a = replicas[0]().finally(() => ctrlB.abort());
    const hedge = new Promise<T>(resolve => setTimeout(() => {
      const b = replicas[1]();
      b.finally(() => ctrlA.abort());
      resolve(b);
    }, after));

    try {
      const result = await Promise.race([a, hedge]);
      this.recordLatency(performance.now() - start);
      return result;
    } catch (err) {
      this.recordLatency(performance.now() - start);
      throw err;
    }
  }
}
```

Custo: ~5-10% extra requests (ones que excederiam P95). Benefício real medido em produção (Google Bigtable, 2013): P99 de query lookup cai 30-43% sem aumentar load total.

#### Quando hedge HURTS (anti-cases)

- **Cache-warming queries**: hedge dispara 2 lookups, ambos cache-miss; cache fica "warmed twice" mas DB toma 2x carga sem ganho de latência (cache estava igualmente lento em ambas réplicas).
- **Quorum reads** (CRDB SERIALIZABLE, Spanner read-write): hedging dobra coordenação cross-region; latência piora.
- **Backend já saturado**: 5-10% overhead vira tipping point. Antes de hedging, considere capacity planning.
- **Não-idempotente sem dedupe**: write hedge = double effect. **Validate idempotency** antes de habilitar hedging em path de mutação.
- **Custo $$$ por request**: Anthropic Claude API call $0.10 cada; 10% hedge = 10% bill aumenta. Avalie ROI.

#### Decisão pragmática

| Cenário | Hedge? |
|---|---|
| Read replica de DB + read-only query | ✅ Sim, AdaptiveHedger |
| LLM call com SLA de latency | ⚠️ Sim, mas com cap absoluto + idempotency-key |
| Payment capture | ❌ Nunca (idempotency frágil + custo) |
| Cache lookup | ❌ Não (cache miss → DB hit em ambos) |
| Cross-region replication read | ✅ Sim, hedge entre regiões mais próximas |

Cruza com **04-09 §2.13** (observability de latency tail é pré-requisito), **04-04 §2.4** (idempotency é mandatory), **04-04 §2.20** (adaptive concurrency limits são complemento).

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

#### Bulkhead per-tenant em código (Logística multi-tier)

Cenário: lojista premium paga $500/mês com SLA p99 200ms; lojista free com 0% SLA. 1 lojista free com query mal-fatorada não pode degradar premium. Bulkhead via connection pool partitioning:

```typescript
// db-pools.ts — pools dedicados por tier
import pg from 'pg';

type Tier = 'premium' | 'standard' | 'free';

const POOLS: Record<Tier, pg.Pool> = {
  premium: new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,                      // 20 conexões dedicadas
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 1_000,
    application_name: 'logistics-premium'
  }),
  standard: new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 2_000,
    application_name: 'logistics-standard'
  }),
  free: new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,                       // free compartilha 5 conexões
    idleTimeoutMillis: 10_000,    // libera mais agressivo
    connectionTimeoutMillis: 5_000, // espera mais antes de rejeitar
    statement_timeout: 10_000,    // mata query > 10s
    application_name: 'logistics-free'
  })
};

export function poolFor(tier: Tier) { return POOLS[tier]; }
```

Middleware de roteamento:

```typescript
app.use(async (req, res, next) => {
  const tenant = await tenantFromAuth(req);   // do JWT (02-13)
  req.pool = poolFor(tenant.tier);
  req.tenant = tenant;
  next();
});

app.get('/orders', async (req, res) => {
  // Query usa pool específico do tier
  const { rows } = await req.pool.query(
    'SELECT * FROM orders WHERE tenant_id = $1 LIMIT 100',
    [req.tenant.id]
  );
  res.json(rows);
});
```

**Resultados observáveis em produção:**
- 1 lojista free com `WHERE description LIKE '%foo%'` em tabela 100M rows segura **só** o pool free (5 conns). Premium continua snappy.
- Métricas Prometheus: `pg_pool_active{tier=...}` por tier expõe saturação independente.
- Alarme: `pg_pool_saturation{tier="premium"} > 0.8` é P1; `tier="free"` é informational.

**Variantes:**
- **Read pool vs write pool**: separar leituras (réplica read-only) de escritas (primary). Limita blast radius de slow query.
- **Per-feature pool**: feature crítica (auth, payments) tem pool isolado de feature opcional (analytics dashboard).
- **Worker isolation via queues**: jobs de cada tier em queue Redis separada com workers próprios. Free não bloqueia premium em backlog.

**Anti-pattern**: 1 pool global compartilhado por todos os tenants/features = noisy neighbor pesado. Você só descobre quando lojista premium liga reclamando enquanto free user roda backup script.

Cruza com **02-09 §2.12** (PgBouncer modes), **04-08 §2.19** (multi-tenancy isolation models — Pool/Bridge/Silo), **04-09 §2.16** (rate limit per tenant em Redis).

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

### 2.28 Resilience patterns deep tuning (timeouts, retries, hedging, fallbacks com production numbers)

§2.23 cobre primitives. Aqui: tuning numérico, code copy-paste, anti-patterns observados em produção 2026.

**1. Timeout discipline — production rules**

- **Deadline propagation** (cruza 06): cliente envia `X-Request-Deadline: <unix-ms>`. Cada hop subtrai network buffer + own work; se `remaining < min_useful`, fail-fast antes de chamar dependência.
- **Tiered timeouts**: outer > inner. Cliente = 1.5x server-side = 2x DB. Inverter cria órfão (server ainda processando após cliente desistir).
- **Per-call total budget, NOT per-retry**: budget 3s para call inteira; tentativas dividem (e.g., 1s + 1s + 1s). Retry com timeout fixo 3s × 3 = 9s total = SLA estourado.
- **Numbers reais 2026 production**:
  - HTTP API interno: 1-3s p99.
  - Postgres query típica: 100-500ms; reports pesados até 5s com `SET statement_timeout = '5s'` per-session.
  - Redis: 50-100ms p99.
  - External API (Stripe, Mapbox): 5-10s incluindo retry budget.
  - LLM call: 15-60s (long-tail real, cauda fat).
- **Anti-pattern**: `setTimeout(fn, 30000)` default em todo HTTP client → oncall page-out cascading quando upstream lento. Sempre service-specific.

**2. Retry strategy — production patterns**

- **Idempotency PREREQUISITE** (cruza 04-02 §2.18): retry sem idempotency key em write = double-charge clássico.
- **Retry SOMENTE em retryable**: `5xx`, `ECONNRESET`, `ETIMEDOUT`, `EAI_AGAIN`. NUNCA `4xx` — cliente bug, retry produz mesmo erro infinitamente.
- **Exponential backoff + jitter** (full jitter):

```ts
function backoffDelay(attempt: number, baseMs = 100, maxMs = 5000): number {
  const exp = Math.min(maxMs, baseMs * 2 ** attempt);
  return exp * (0.5 + Math.random() * 0.5); // 50-100% of exp
}
// attempt=3 → 400-800ms
```

- **Decorrelated jitter** (AWS Architecture Blog, melhor que exponential puro): `delay = min(maxMs, random(baseMs, prev_delay * 3))`. Evita thundering herd em recovery síncrono.
- **Retry budget**: cap retries em 10% over baseline RPS via token bucket per-client. Excedeu budget → no retry, fail-fast. Previne retry storm amplificando outage upstream.

**3. Hedging requests** (cruza wave 11 adaptive hedging)

- Pattern: dispara request original; se p99 expirar sem response, envia copy a SECOND replica; primeiro response wins; cancela o outro via `AbortController`.
- Saving: p99 effective → ~p95.
- Cost: ~5% extra requests (só quando p99 trigger).
- **NÃO hedge**: writes (idempotency required), expensive ops (LLM call $$, billable external).

```ts
async function hedgedFetch(url: string, p99Ms: number, signal: AbortSignal): Promise<Response> {
  const ctrl1 = new AbortController();
  const ctrl2 = new AbortController();
  const onAbort = () => { ctrl1.abort(); ctrl2.abort(); };
  signal.addEventListener('abort', onAbort, { once: true });

  const p1 = fetch(url, { signal: ctrl1.signal });
  const hedge = new Promise<Response>((resolve, reject) => {
    const t = setTimeout(async () => {
      try { resolve(await fetch(url, { signal: ctrl2.signal })); }
      catch (e) { reject(e); }
    }, p99Ms);
    signal.addEventListener('abort', () => clearTimeout(t), { once: true });
  });

  try {
    const winner = await Promise.race([p1, hedge]);
    if (winner === await p1) ctrl2.abort(); else ctrl1.abort();
    return winner;
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
}
```

**4. Circuit breaker — production state machine deep** (cruza §2.23)

- **3 states**: Closed (healthy, requests pass) → Open (failures > threshold, fail-fast com fallback) → Half-Open (após cooldown, probe 1-3 requests; success consecutivos → Closed; fail → Open).
- **Tuning real**:
  - Threshold: 50% error rate em window de **20+ requests** (volume statistical). 50% em 2 requests = false positive constante.
  - Cooldown: 30-60s.
  - Half-open probe: 1-3 concurrent max.
- **Per-endpoint** breaker, NUNCA per-service. Endpoint `/geocode` hostile não pode derrubar `/route`.
- **Library**: `opossum` 8+ (Node), `resilience4j` 2+ (JVM), `Polly` v8 (.NET), `gobreaker` (Go).

```ts
import CircuitBreaker from 'opossum'; // 8+

const breaker = new CircuitBreaker(callMapboxGeocode, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  volumeThreshold: 20,
  resetTimeout: 30000,
  rollingCountTimeout: 10000,
  rollingCountBuckets: 10,
});

breaker.fallback(async (address: string) => {
  const cached = await redis.get(`geocode:${address}`);
  if (cached) return JSON.parse(cached);
  throw new Error('GEOCODE_DEGRADED');
});

breaker.on('open', () => metrics.increment('breaker.geocode.open'));
breaker.on('halfOpen', () => metrics.increment('breaker.geocode.halfopen'));
```

**5. Fallback hierarchy**

Primary → cached value (Redis, TTL curto) → default value (UX degraded) → error explícito (last resort).

Logística: courier ETA primary via routing engine → cached ETA (TTL 5 min) → "ETA indisponível" UX → nunca user-facing 500.

Cached fallback aceitável em 90% leituras business; **NUNCA em writes** (read model + write model conflict, corrupção).

**6. Bulkhead concrete** (cruza §2.24)

- Connection pools per dependency: Postgres 50-100, Redis 200, external API 20.
- Saturação em 1 pool não pode esgotar capacity de outras (separate pools, not shared).
- Thread pool isolation (JVM/CLR via resilience4j): semaphore-isolated execution per dependency.
- K8s separate Deployment per consumer pattern: `courier-tracking-svc` separado de `order-api`; tracking outage não derruba order placement.

**7. Load shedding patterns**

- **Adaptive concurrency limits** (Netflix concurrency-limits, TCP Vegas-style): auto-tune in-flight requests max baseado em RTT measured.
- **Priority-based shedding**: free tier rejected first; premium protected. Header `X-Priority` lido em middleware shed.
- **CPU-based shedding NÃO recomendado**: CPU% multi-core misleading; coscheduled containers ruído. Use `queue_depth` ou `in_flight_requests` como signal.

**8. Logística applied resilience stack**

- **Mapbox geocoding**: opossum breaker (50% threshold em 30 req window, 30s cooldown) + cached geocode fallback (Redis 24h TTL) + retry exponential w/ jitter (max 3).
- **Stripe payment**: `Idempotency-Key` obrigatório (UUID per intent) + retry 3x decorrelated jitter, **sem hedging** (write).
- **Postgres**: pool 50 per app instance; `SET statement_timeout = '5s'` default; deadlock detection automática; `SET lock_timeout = '2s'` em writes críticos.
- **Redis**: timeout 100ms p99; pipeline em batch ops; breaker em failure cascade evita amplificar.
- **Service-to-service interno**: deadline propagation header + tiered timeouts + retry budget 10% baseline + hedging em reads (NÃO writes).
- **End-to-end deadline budget**: cliente 5s → BFF 4.5s → orders-api 4s → Postgres 3s → external 1s. Cada hop subtrai own work + network buffer.

**9. Anti-patterns observados (10 itens)**

1. Retry sem idempotency em writes — double-charge clássico.
2. Retry em `4xx` — loop infinito; cliente bug não resolve sozinho.
3. Exponential backoff sem jitter — thundering herd em reconnect síncrono.
4. Per-retry timeout em vez de total budget — slow series ainda excede SLA.
5. Circuit breaker per-service em vez de per-endpoint — 1 endpoint hostile derruba serviço inteiro.
6. Threshold 50% em 2 requests — false positives constantes; precisa volume statistical (20+).
7. Hedging em writes — idempotency violado, double-effect.
8. Load shedding por CPU% em multi-core — signal inadequado.
9. Bulkhead único pool compartilhado — 1 dependency hostile esgota tudo.
10. Cached fallback em writes — corrupção via read/write model conflict.

**10. Cruza com**: `04-09` (scaling, backpressure end-to-end), `02-08` (frameworks, fastify retry plugin), `02-11` (Redis fallback cache), `03-15` (incident response, post-incident tuning), `03-07` (observability, métricas breaker state + retry rate).

---

### 2.29 Chaos engineering practices — Gamedays, ChaosMonkey/Toxiproxy, FIS, blast radius management

§2.26 cobre principles. Aqui: tooling 2026, gameday playbook, blast radius discipline, achados típicos em produção.

**1. Why chaos engineering**

- **Hipótese**: sistema tem failure modes desconhecidos; só revelam sob stress.
- **Approach**: injetar falhas deliberadamente em ambiente controlado; observar + corrigir.
- **Origem**: Netflix Chaos Monkey 2010; Principles of Chaos Engineering manifesto 2014.
- **Adoção 2026**: standard SRE practice; AWS FIS managed; Gremlin/Litmus enterprise; Chaos Mesh CNCF graduated.

**2. Hierarchy of chaos sophistication**

- **L0 — Manual disaster simulations**: tabletop exercises ("what if RDS primary dies?"). No injection real.
- **L1 — Controlled gameday**: scheduled, em staging, observa team response. Mensal.
- **L2 — Automated gamedays**: scheduled chaos em staging, semanal, runbook-driven.
- **L3 — Continuous chaos staging**: automated injections contínuas em staging (Mon/Wed/Fri).
- **L4 — Production chaos**: controlled injections em produção real (Netflix-tier; anos de investimento).

**3. Tools 2026**

- **Chaos Monkey** (Netflix, OSS): legacy; randomly terminates instances. Substituído internamente por Chaos Engine.
- **AWS FIS** (Fault Injection Simulator, 2026 GA matured): managed; AWS-native; suporta EC2, ECS, EKS, RDS, Lambda, networking.
- **Gremlin** (commercial 2026): UI polished; broad failure types; SaaS; enterprise-friendly.
- **Litmus** (CNCF, OSS, 3+): K8s-native; chaos experiments via CRDs; ChaosHub catalog.
- **Chaos Mesh** (CNCF, OSS, 2.7+): K8s-native alternative; origem ecossistema chinês; rich network chaos.
- **Toxiproxy** (Shopify, OSS, 2+): network-layer chaos (latency, drops, slow_close); ideal integration tests.
- **PowerfulSeal** (Bloomberg, OSS): K8s + cloud-aware; menos ativo 2026.

**4. Toxiproxy pattern Logística (integration tests)**

```ts
import Toxiproxy from 'toxiproxy-node-client';
const client = new Toxiproxy('http://toxiproxy:8474');

beforeEach(async () => {
  await client.populate([{
    name: 'redis_proxy',
    listen: '0.0.0.0:6380',
    upstream: 'redis:6379',
  }]);
});

test('order creation survives Redis 500ms latency', async () => {
  const proxy = await client.get('redis_proxy');
  const toxic = await proxy.addToxic({
    type: 'latency',
    attributes: { latency: 500, jitter: 50 },
  });

  const start = Date.now();
  const res = await fetch('/orders', { method: 'POST', body: JSON.stringify(order) });
  expect(res.status).toBe(201);
  expect(Date.now() - start).toBeLessThan(2000);  // total budget §2.28

  await proxy.removeToxic(toxic.name);
});

test('order creation falls back to memory cache if Redis down', async () => {
  const proxy = await client.get('redis_proxy');
  await proxy.disable();  // cuts connection

  const res = await fetch('/orders', { method: 'POST', body: JSON.stringify(order) });
  expect(res.status).toBe(201);  // graceful fallback ativo

  await proxy.enable();
});
```

**5. AWS FIS — production-grade fault injection**

Experiment template (JSON): targets + actions + stop conditions. Pattern Logística — terminate 1 EC2 em `orders-api` ASG:

```json
{
  "actions": {
    "terminateInstance": {
      "actionId": "aws:ec2:terminate-instances",
      "parameters": { "instanceCount": "1" },
      "targets": { "Instances": "ordersAsg" }
    }
  },
  "targets": {
    "ordersAsg": {
      "resourceType": "aws:ec2:instance",
      "selectionMode": "COUNT(1)",
      "resourceTags": { "AutoScalingGroup": "orders-api" }
    }
  },
  "stopConditions": [{
    "source": "aws:cloudwatch:alarm",
    "value": "arn:aws:cloudwatch:us-east-1:123:alarm:orders-api-error-rate-high"
  }]
}
```

- **Stop conditions**: CloudWatch alarm halt experiment se real damage detectado. NUNCA omitir.
- Outras actions FIS 2026: `aws:rds:reboot-db-instances`, `aws:network:disrupt-connectivity`, `aws:eks:pod-cpu-stress`.

**6. K8s chaos via Litmus**

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: orders-api-pod-delete
  namespace: logistica
spec:
  appinfo:
    appns: logistica
    applabel: app=orders-api
    appkind: deployment
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-delete
      spec:
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: '60'
            - name: CHAOS_INTERVAL
              value: '10'
            - name: PODS_AFFECTED_PERC
              value: '20'
```

Chaos Mesh equivalente: `kind: PodChaos`, `action: pod-kill`, `selector.labelSelectors`. Litmus mais customizável; Chaos Mesh UI superior 2026.

**7. Gameday playbook**

- **Pre-gameday (1 semana antes)**:
  - Definir hipótese ("Order endpoint mantém SLO durante DB primary failover").
  - Definir blast radius (env: staging; serviços impactados; janela temporal).
  - Definir stop criteria (error rate > 5% sustained 1min → halt; p99 > 3x baseline → halt).
  - Notificar Ops + Customer Support (no surprises).
  - Identificar observers: IC, Ops, Comms (cobre `03-15` §2.19).
- **Day of gameday**:
  - 30min preflight (verifica monitoring ativo, baseline metrics capturados).
  - Inject single failure first (uma variável só).
  - Observa 15-30min sob falha contínua.
  - Halt imediato se stop criteria met.
  - Roll back deliberadamente (não auto-recover; observa recovery time).
- **Post-gameday**:
  - Document findings (postmortem-style; cobre `03-15`).
  - File action items (P0 imediato, P1 dentro do sprint).
  - Re-run experiment após fixes; falha não corrigida = falha conhecida.

**8. Blast radius management**

- **Staging-first**: todo chaos começa em staging. Production só após staging clean por 3+ ciclos.
- **Single dimension**: um failure type por experiment (não combinar latency + pod-kill).
- **Smallest scope first**: 1 pod < 10% pods < 50% pods. Escalar gradualmente após cada green.
- **Time-bounded**: todo experiment tem hard timeout; auto-rollback no FIS via `stopConditions`.
- **Reversible preferred**: latency/drop reversíveis > delete destrutivo.
- **Observed**: full monitoring + alerting active; abort se real impact em users.

**9. Logística chaos engineering program**

- **Q1**: integrar Toxiproxy em CI integration tests; ~30 cenários latency/disconnect cobrindo Redis, Postgres, payment gateway.
- **Q2**: monthly staging gameday com runbook preparado; foco DB failover e dependency outage.
- **Q3**: AWS FIS staging continuamente (Mon/Wed/Fri auto-injections; weekend off para reduzir alert fatigue).
- **Q4**: first production gameday (1h, controlled, full IC team on-call, comms pre-notificado).
- **Findings tracked** em postmortem-style docs no Notion; action items em Linear, owner + due date.

**10. Common findings (chaos reveals)**

- **Cascade failures**: 1 service slow → entire system slow (timeout/circuit breaker missing; cobre §2.28).
- **Retry storms**: failure → all clients retry sync → upstream piora (jitter ausente).
- **Connection pool starvation**: 1 slow query holds all DB conns (pool isolation/bulkhead missing).
- **Timeout > caller timeout**: DB call 30s mas caller 5s = caller desiste, DB ainda processa (deadline propagation missing).
- **Missing fallbacks**: cache fail → no degraded mode → 500s direto.
- **Health check too strict**: transient failure → pod restarted → cascade reschedule storm.

**11. Anti-patterns observados (10 itens)**

1. Production chaos sem staging baseline first — real damage; users impactados.
2. Chaos sem clear hypothesis ("let's see what happens") — no learning, só ruído.
3. No stop criteria defined — experiment runs unbounded; vira outage real.
4. Multi-failure injection first time — não isolável; cause unknown.
5. Gameday sem comms team notified — customer support floods de tickets confusos.
6. Tool chosen over hypothesis (FIS porque available, não porque needed).
7. No post-gameday action items tracked — findings esquecidos; mesmo chaos result próximo gameday.
8. Continuous production chaos sem maturity — Netflix-level needs years de investimento prior.
9. Toxiproxy em unit tests em vez de integration — overkill; unit tests devem mockar.
10. Chaos team isolado de product team — no shared learning; chaos vira "their job".

**12. Cruza com**: `04-04` §2.26 (chaos principles foundation), `04-04` §2.28 (resilience tuning informa chaos targets — onde tunar timeout antes de injetar latency), `03-15` (incident response, IC roles em gameday), `03-04` (CI/CD, integration tests com Toxiproxy), `04-09` (scaling, blast radius cresce com scale), **02-17 §2.20** (mobile structured concurrency — Swift Concurrency Task tree, Kotlin Coroutines `coroutineScope` propagam cancellation determinística — análogo a supervision tree Erlang).

---

### 2.30 Disaster Recovery deep — RPO/RTO modeling, runbooks, tabletop exercises, multi-region failover (2026)

**1. DR ≠ HA**. HA é continuous — replica síncrona, load balancer tira instance ruim, usuário não percebe. DR é after-the-disaster — região AWS inteira foi (us-east-1 outage 2021/2023/2025), datacenter pegou fogo, ransomware criptografou prod. HA opera dentro do failure domain; DR cruza failure domains. Sistema com 99.99% HA e zero DR plan está uma região-outage de virar manchete. DR sem HA = downtime constante; HA sem DR = downtime catastrófico raro. Precisa dos dois, e tratar separado.

**2. RPO/RTO definitions**. **RPO** (Recovery Point Objective): quanto dado pode perder, medido em tempo. RPO 5min = última cópia válida pode ter até 5min de write atrás do prod. **RTO** (Recovery Time Objective): quanto tempo até voltar a servir. RTO 1min = de "região caiu" a "tráfego servido" em 60s. RPO determina tipo de replication (async vs sync). RTO determina tipo de standby (cold/warm/hot/active). Custos crescem exponencialmente com RPO/RTO menores.

| Tier | RPO | RTO | Padrão típico | Custo relativo | Caso de uso |
|------|-----|-----|---------------|----------------|-------------|
| 1 | 0 | < 1min | Multi-region active/active | 5-10x | Pagamentos, trading |
| 2 | < 5s | < 5min | Hot standby + DNS failover | 3-5x | Orders, checkout |
| 3 | < 1min | < 30min | Warm standby (Aurora Global) | 2-3x | Catálogo, user profile |
| 4 | < 1h | < 4h | Pilot light (replica + infra dormant) | 1.3-1.8x | Analytics, reports |
| 5 | < 24h | days | Backup restore (S3 cross-region snapshots) | 1.05-1.2x | Audit log, archive |

Tier escolhido por dado, não por sistema. Orders DB tier 2; audit log tier 5; catalog tier 3.

**3. Multi-region patterns** (cost vs RTO):

| Pattern | Standby state | RTO | Cost overhead | Trade-off |
|---------|---------------|-----|---------------|-----------|
| Active/Active | Servindo tráfego | seconds | ~2x infra + traffic eng | Conflict resolution complexa (CRDT, last-write-wins) |
| Hot standby | Replica ligada, idle | 1-5min | ~1.5x | Capacity planning — standby precisa aguentar 100% |
| Warm standby | Replica ligada, undersized | 5-30min | ~1.2-1.5x | Scale up no failover (autoscaling lag) |
| Pilot light | Só dados replicando, infra dormant | 30min-4h | ~1.1x | Terraform apply no DR — infra cold start |
| Backup/Restore | S3 snapshots cross-region | 4h-days | ~1.05x | Restore time proporcional ao dataset size |

Stack típico: tier 1 active/active (DynamoDB Global, Spanner), tier 2 hot standby (Aurora Global Database), tier 3-4 warm/pilot light, tier 5 backup.

**4. Replication mechanics + lag math**. **AWS RDS cross-region read replica** (Postgres/MySQL): async, lag típico 1-5s em condições normais, pode subir 30s+ em write storms. **Aurora Global Database** (2026): physical replication via storage layer, RPO target < 1s, RTO < 1min em managed failover, até 5 secondary regions. **DynamoDB Global Tables**: multi-master active/active, last-write-wins por timestamp, replication lag tipicamente < 1s. **Cloud Spanner**: external consistency, multi-region synchronous via Paxos, RPO 0, RTO seconds. **S3 Cross-Region Replication**: SLA 15min para 99.99% dos objetos, mas typical < 1min.

**RPO calculation example** (async replica):
```
write_rate = 500 writes/sec
replication_lag_p99 = 3s
RPO_p99 = write_rate * lag = 500 * 3 = 1500 writes potentially lost on hard failover
```
Não declarar RPO sem medir lag p99 sob carga real. CloudWatch metric `ReplicaLag` (RDS) ou `AuroraGlobalDBReplicationLag`.

**5. Route53 failover record + health check**:
```hcl
resource "aws_route53_health_check" "primary" {
  fqdn              = "api-primary.fathom.io"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health/deep"
  failure_threshold = 3
  request_interval  = 10  # 10s (fast) ou 30s (standard, mais barato)
  measure_latency   = true
  regions           = ["us-east-1", "eu-west-1", "ap-southeast-1"]  # 3+ regions p/ evitar false positive
}

resource "aws_route53_record" "api_primary" {
  zone_id = var.zone_id
  name    = "api.fathom.io"
  type    = "A"
  ttl     = 60  # CRÍTICO: TTL baixo p/ failover rápido. NUNCA 3600
  set_identifier = "primary"
  failover_routing_policy { type = "PRIMARY" }
  health_check_id = aws_route53_health_check.primary.id
  records = [aws_eip.primary.public_ip]
}

resource "aws_route53_record" "api_secondary" {
  zone_id = var.zone_id
  name    = "api.fathom.io"
  type    = "A"
  ttl     = 60
  set_identifier = "secondary"
  failover_routing_policy { type = "SECONDARY" }
  records = [aws_eip.secondary.public_ip]
}
```
Health check 10s interval + 3 failures = ~30s detection. TTL 60s = ~30s propagation (caches respeitam). Total RTO DNS-bound ≈ 60-90s. Caches que ignoram TTL (browsers, alguns ISPs) podem manter old IP por minutos — daí GSLB com Anycast (Cloudflare Load Balancer, AWS Global Accelerator) é melhor que DNS failover puro.

**6. Failover process** (sequência crítica):
1. **Detect**: health check 3x fail (30s).
2. **Decide**: automated p/ tier 1-2; humano p/ tier 3+ (false positive caro).
3. **Fence old primary**: revoke IAM, security group block, kill replication slot. Sem fence → split-brain (dual writes em primary "morto" + new primary).
4. **Promote replica**: `SELECT pg_promote()` (Postgres 14+) ou managed (Aurora `failover-global-cluster`).
5. **DNS/GSLB cutover**: Route53 health check já flipou; force se manual.
6. **Connection draining**: app pools precisam reconectar; PgBouncer pool reset, Lambda cold start.
7. **Verify**: synthetic transaction end-to-end (`POST /order` → `GET /order/:id`).
8. **Rollback plan**: se new primary falhar, rollback para original (se ainda alive) ou para tertiary.

**Aurora Global DB managed failover** (RTO < 1min):
```bash
aws rds failover-global-cluster \
  --global-cluster-identifier fathom-orders-global \
  --target-db-cluster-identifier arn:aws:rds:eu-west-1:...:cluster:fathom-orders-eu \
  --allow-data-loss  # accept RPO > 0; sem isso, espera replication catch up
```

**7. Runbook structure** (markdown template, vive em repo + impresso em war room):
```markdown
# Runbook: Failover orders DB primary us-east-1 → eu-west-1

## Preconditions (verify ANTES de executar)
- [ ] PagerDuty incident criado, IC nomeado
- [ ] Replication lag eu-west-1 < 5s (CloudWatch `AuroraGlobalDBReplicationLag`)
- [ ] No active migration running (`SELECT * FROM pg_stat_activity WHERE query LIKE '%ALTER%'`)
- [ ] Backup snapshot < 1h old

## Steps
1. Announce em #incident-room: "Initiating failover orders-db at HH:MM UTC"
2. Fence primary: aws ec2 revoke-security-group-ingress --group-id sg-prod-db --protocol tcp --port 5432 --cidr 10.0.0.0/8
3. Promote eu-west-1: aws rds failover-global-cluster --global-cluster-identifier fathom-orders-global --target-db-cluster-identifier arn:aws:rds:eu-west-1:...
4. Wait for promotion: aws rds describe-global-clusters --query 'GlobalClusters[0].Status' (target=available, ~45s)
5. Update app config: kubectl set env deploy/orders-api DATABASE_URL=$EU_WEST_PRIMARY -n prod
6. Force DNS: aws route53 change-resource-record-sets --hosted-zone-id ... (já automático via health check, mas force se TTL alto)

## Verification
- [ ] curl https://api.fathom.io/health/deep retorna 200 + db_region=eu-west-1
- [ ] Synthetic: POST /orders + GET /orders/:id round-trip < 2s
- [ ] Error rate em Datadog < baseline + 10% (15min window)

## Rollback (se passos 3-5 falham)
1. Re-allow security group primary us-east-1
2. Revert DATABASE_URL deploy
3. Promote us-east-1 back if eu-west-1 não está catching up

## Postconditions
- [ ] Update runbook with timestamps, who-did-what, surprises
- [ ] Schedule post-mortem dentro de 48h
```

Runbook que nunca foi executado é ficção. Quarterly tabletop + anual real failover (gameday) ou está desatualizado.

**8. Tabletop exercise** (90min, quarterly):
```
Scenario: us-east-1 RDS API endpoint returns 5xx for 8min, then full region degradation

Roles: IC, comms, DB engineer, SRE, customer support lead

Script (facilitator):
T+0:   "Datadog alert: orders API error rate 60%. CloudWatch RDS APIs returning 5xx."
T+2m:  "Replication lag eu-west-1 jumped to 45s, now stable at 12s."
T+5m:  "Customer support: 200 tickets in 5min, Twitter trending #fathomdown."
T+8m:  "AWS Health Dashboard: 'Increased Error Rates' us-east-1 RDS."

Questions to answer LIVE (não retrospectiva):
- Quem decide failover? (IC sozinho? precisa CTO sign-off?)
- Aceitamos RPO 12s (lag atual) ou esperamos catch-up?
- Como comunicamos status page? Quem aprova?
- Se eu-west-1 também degrada em T+15m, qual o plano?

Output: gaps documentados → ações com owner + deadline.
```

Tabletop NÃO é "send email asking what would you do". É síncrono, na sala (física ou call), com clock real, com IC tomando decisões. 90min, quarterly. Anti-pattern: "tabletop" virou async questionnaire que ninguém responde.

**9. DR drills vs gamedays**. **Tabletop**: discussão, sem touch em prod, baixo custo. **DR drill**: failover real em staging mirror de prod, mensal. **Gameday**: failover real em prod, quarterly/biannual, janela anunciada, full team. Sem gameday real, runbook é fanfic. Netflix Chaos Monkey kills instances; DR gameday kills regions.

**10. Stack Logística aplicada**:
- **Orders DB** (Postgres): tier 2, Aurora Global Database us-east-1 → eu-west-1, RPO < 5s, RTO < 5min. Failover trigger: 3x health check fail OR manual call por IC.
- **Courier locations** (Redis Geo + Kafka): tier 3, Redis Enterprise active-active CRDT, RPO < 1min, RTO 5-30min. Last known position OK perder até 1min.
- **Audit log** (S3 + Glacier): tier 5, S3 CRR para us-west-2 + Glacier Deep Archive cross-region, RPO 15min (CRR SLA), RTO horas. Audit é write-once, restore lento aceitável.
- **Catalog** (Postgres read-heavy): tier 3, RDS cross-region read replica + ElastiCache Redis. RTO 30min — promote replica, repopulate cache (cold cache aceitável breve).

**11. 10 anti-patterns**:
1. RPO declarado sem medir replication lag p99 sob load real (paper RPO ≠ measured RPO).
2. Runbook escrito uma vez em 2023, nunca executado, comandos referem stack antigo.
3. Tabletop = email/Slack thread "se região cair o que faríamos?" (zero pressure, zero learning).
4. Failover sem fence do old primary → split-brain, dual writes em prod, data corruption.
5. DNS TTL 3600s — RTO floor é 60min mesmo com promotion em 30s.
6. Active/passive com passive dormant 6+ meses — config drift, security patches missing, capacity insuficiente quando precisa.
7. Backup nunca foi restored — schrödinger's backup, pode estar corrupt.
8. Cross-region replica em mesma região AWS (us-east-1a → us-east-1b) — não é DR, é HA. Disaster derruba região inteira.
9. Runbook não tem rollback — se failover piora, time fica improvisando.
10. RPO/RTO definido por engenharia sozinha, sem product/business — orders tier 5 "porque é mais barato", aí outage custa 100x o saving.

**12. Cruza com**: `04-04` §2.25 (failover patterns base), `04-04` §2.26 (chaos principles, gameday é DR drill com escopo maior), `04-04` §2.27 (failure budget — DR test consome budget conscientemente), `03-15` (incident response, IC roles em gameday + tabletop), `03-05` (cloud, managed DR services Aurora Global / Spanner / DynamoDB Global), `04-09` (scaling, multi-region adiciona complexidade — replicação, conflict resolution), `02-09` §2.13 (Postgres replication base, streaming + logical), `04-01` §2.5 (CAP — DR é AP situation often, aceita stale read pra continuar disponível).

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
