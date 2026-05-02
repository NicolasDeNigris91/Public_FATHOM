---
module: 04-09
title: Scaling, Vertical, Horizontal, Sharding, Multi-Region, Caching at Scale
stage: sistemas
prereqs: [04-01, 04-04]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 04-09, Scaling

## 1. Problema de Engenharia

"Escala" é discutida em abstract até bater. Aí a verdade aparece: o gargalo é DB, não app. Ou é egress de rede, não CPU. Ou é hot key em Redis, não thread count. Decisões erradas de scale são caras: shard prematuro, multi-region antes de provar single-region maduro, autoscaler sem rate limit de DB conn pool. Ou pior: time-to-market perdido por over-engineering "pra quando crescer".

Este módulo é scaling com método: vertical vs horizontal, statefulness, sharding (estratégias), read replicas, caching tiers, queue offload, multi-region active-passive vs active-active, geo-distribution, CDN, edge. Você sai sabendo medir + escalar consciente.

---

## 2. Teoria Hard

### 2.1 Vertical vs horizontal

- **Vertical**: maior máquina. Limites físicos (~128 cores, TB RAM em managed). Simples (sem distributed concerns).
- **Horizontal**: mais máquinas. Sem teto teórico, mas exige stateless ou state-coordinated.

Default em web: começa vertical até dor (ou redundância pra HA force horizontal). Aí horizontal.

### 2.2 Stateful vs stateless

App stateless escala horizontal trivialmente (réplicas idênticas; LB distribui).

State em-memória do app (sessions, cache local) impede scale: load balancer manda usuário pra outro pod e session some.

**Mover state pra fora**: Redis sessions, sticky sessions (LB), JWT (stateless).

DBs são stateful por natureza. Scale via replication + sharding.

### 2.3 Read scaling: replicas

Postgres read replicas: writes no primary, reads em replicas. Lag eventual.

Padrões:
- Roteamento manual: queries críticas no primary, lazy reads em replicas.
- Lib que roteia (Prisma read replicas extension, custom).
- Read-after-write: detectar e ler do primary durante janela.

Limites: replication lag pode ser segundos sob load; reads ficam stale. Aceite ou route around.

### 2.4 Write scaling: sharding

Quando 1 primary é teto, sharding: dados particionados por chave entre N shards.

Estratégias de shard key:
- **Hash**: distribuição uniforme. Range queries cruzam shards.
- **Range**: ordenado, queries focadas. Hotspots em valores monotônicos (timestamps recentes batem mesmo shard).
- **Geo / tenant**: por tenant em multi-tenant. "Big tenant problem": 1 tenant maior que shard.

Re-sharding é trabalho. Decisão de shard key influencia anos.

Tools:
- Postgres: **Citus** (PG extension), **PgPool**, manual via app.
- MongoDB: sharding nativo.
- Cassandra, DynamoDB: sharding embutido.
- App-level: hash routing direto pra DBs separados.

### 2.5 Caching tiers

Já vimos. Em scale:
- L1 process LRU.
- L2 Redis.
- L3 CDN.
- L4 (browser).

Hot key: 1 chave que recebe muito tráfego. Mitigations: replicate em N keys, use process-local cache pra essa key, batch reads.

Cache invalidation continua "one of two hard problems".

#### Distributed cache invalidation — patterns reais

L1 (process LRU) é o mais difícil de invalidar: 100 instâncias = 100 caches independentes. TTL curta funciona até dor de stale demais. Padrões:

**1. Pub/sub broadcast (Redis Streams ou pub/sub)**

Instância que muta DB publica invalidação; todas escutam.

```typescript
const PUBSUB_CHANNEL = 'cache-invalidate';

class L1Cache<V> {
  private store = new Map<string, { v: V; expiry: number }>();
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
    // Subscriber dedicado (Redis pub/sub bloqueia connection)
    const sub = redis.duplicate();
    sub.subscribe(PUBSUB_CHANNEL, (err) => err && log.error(err));
    sub.on('message', (_, key) => {
      this.store.delete(key);                  // local invalidate
    });
  }

  get(key: string): V | undefined {
    const e = this.store.get(key);
    if (!e || e.expiry < Date.now()) return undefined;
    return e.v;
  }

  set(key: string, v: V, ttlMs: number) {
    this.store.set(key, { v, expiry: Date.now() + ttlMs });
  }

  // Quando você muta DB, broadcast invalidate
  async invalidate(key: string) {
    this.store.delete(key);                    // local
    await this.redis.publish(PUBSUB_CHANNEL, key);  // outras instâncias
  }
}
```

Trade-offs: latência de propagation ~1-10ms; **at-most-once** (se subscriber down quando publish, perde invalidate); ok pra cache TTL curta como segunda linha de defesa.

**2. CDC-based invalidation (zero dual-write)**

Em vez de app publicar invalidação, **CDC do Postgres** (Debezium, ver 02-09 §2.13.1) emite evento de mudança; serviço cache-invalidator escuta e dispara invalidations:

```
Postgres UPDATE orders → WAL → Debezium → Kafka topic logistics.orders
                                              ↓
                              cache-invalidator service
                                              ↓
                              Redis PUBLISH cache-invalidate "order:{id}"
                                              ↓
                              all instances drop L1 entry
```

Vantagens: aplicação não sabe nada de cache; mudanças de qualquer fonte (admin script, migration, replication) propagam. Source of truth é DB. **At-least-once** garantido por Kafka (consumer commit offset).

Caveat: latência ~50-500ms (CDC + Kafka path). Pra cache de dados quase-real-time, OK; pra dados onde stale por 500ms é inaceitável (rate limit current count), broadcast direto é melhor.

**3. Versioned keys (no-invalidation pattern)**

Em vez de invalidar, **mude a chave**. Cada update incrementa version do object; cache lookup usa `key:v123`. Versão antiga vive até TTL natural.

```typescript
async function getOrder(id: string): Promise<Order> {
  // Version vem de Postgres ou Redis counter (atomic via INCR)
  const version = await redis.get(`order:${id}:version`);
  const cacheKey = `order:${id}:v${version}`;

  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const order = await db.queryOne(`SELECT * FROM orders WHERE id=$1`, [id]);
  await redis.setEx(cacheKey, 3600, JSON.stringify(order));
  return order;
}

async function updateOrder(id: string, patch: Partial<Order>) {
  await db.execute(`UPDATE orders SET ... WHERE id=$1`, [...]);
  await redis.incr(`order:${id}:version`);  // todos os clients verão chave nova
}
```

Vantagens: zero invalidation race; old caches expiram naturalmente; **distributed-friendly** (qualquer instância pode update sem coordination).

Custos: storage cache fica maior (versões antigas até TTL); aplicação precisa fetch version antes de cache lookup (1 extra round-trip). Mitigação: `MGET` da version + cached value em pipeline.

**4. Tag-based invalidation (Cloudflare-style)**

CDN-level: cada response carrega `Cache-Tag: tenant:abc, order:xyz`. Invalidate via API:
```bash
curl -X POST 'https://api.cloudflare.com/client/v4/zones/Z/purge_cache' \
  -H 'Authorization: Bearer ...' \
  --data '{"tags":["order:xyz"]}'
```

Mesma ideia em app L2 (Redis): chaves carregam tag; `SREM tag:xyz members` + iterate pra invalidar todas que carregam aquela tag. Caro em escala alta de tags.

#### Decisão pragmática

| Cenário | Pattern |
|---|---|
| App único + L1 process cache | Pub/sub broadcast (próprio app publish) |
| Multi-app + DB único + dados que mudam fora da app | CDC-based invalidation |
| Caches em N edges geográficos | Versioned keys (sem coordination) |
| CDN content + tagged invalidation | Tag-based via API do CDN |

Anti-padrões:
- **Cache TTL muito longa "compensada por invalidate"**: invalidate falha → stale infinito. TTL é sempre seguro fallback.
- **Invalidate síncrono no caminho da request**: trava write se Redis lento. Use fire-and-forget com retry queue.
- **Sem observability**: monitore cache hit rate por chave; se invalidação storm, hit rate cai abrupto e você descobre só pelo SLO.

Cruza com **02-11 §2.11** (cache stampede protection complementar), **02-09 §2.13.1** (CDC pipeline já existe pra outras finalidades), **04-03 §2.8** (outbox emite eventos que feed invalidação).

### 2.6 Queue offload

Deslocar trabalho síncrono pra async:
- Email send → queue.
- Image processing → queue.
- Analytics → event log.
- Notifications → fan-out.

Reduz latency user-facing; adiciona eventual consistency.

### 2.7 CDN e edge

- Static assets: CDN sempre.
- Dynamic content: edge cache com TTL curtas, ESI (edge side includes).
- Edge functions (Workers, Lambda@Edge) pra personalize sem trip pro origin.

Egress da CDN é mais barato que de cloud regional; reduz cost.

### 2.7.1 Distributed rate limiting, deep

Rate limit single-instance é trivial (counter em memória). Distribuído (N instâncias balanceadas) exige store compartilhado. **Redis + Lua atomic** é padrão.

**Algoritmos comparados:**

| Algoritmo | Memória/key | Smoothness | Burst handling | Implementation |
|---|---|---|---|---|
| **Fixed window counter** | 1 int | Hard edges (boundary effect: 2x rate em fronteira) | Permite burst no início | Trivial |
| **Sliding window log** | N timestamps (N = rate) | Perfeito | Restritivo | Memory custoso em rate alto |
| **Sliding window counter** | 2 ints (prev + curr window) | Aproximação do log com weighted average | Suave, eficiente | Padrão recomendado |
| **Token bucket** | 1 int (tokens) + 1 timestamp (last refill) | Suave | Permite burst até bucket cap | Padrão pra burst-friendly |
| **Leaky bucket** | 1 int (queue level) | Suave | Sem burst | Modela como queue |

#### Sliding window log atomic via Lua

Mais preciso, ideal pra rate limits estritos (auth, payments) onde precisão > custo de memória:

```lua
-- KEYS[1] = "ratelimit:user:123"
-- ARGV[1] = window_ms (ex: 60000)
-- ARGV[2] = max_requests (ex: 100)
-- ARGV[3] = now_ms (ex: 1714583492000)
-- ARGV[4] = request_id (uuid)

local key       = KEYS[1]
local window    = tonumber(ARGV[1])
local maxreqs   = tonumber(ARGV[2])
local now       = tonumber(ARGV[3])
local req_id    = ARGV[4]
local cutoff    = now - window

-- Limpa entries fora da janela
redis.call('ZREMRANGEBYSCORE', key, 0, cutoff)

-- Conta entries dentro da janela atual
local count = redis.call('ZCARD', key)

if count >= maxreqs then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retry_after = (oldest[2] + window - now)   -- ms até libertar slot
  return {0, count, retry_after}
end

-- Registra request atual
redis.call('ZADD', key, now, req_id)
redis.call('PEXPIRE', key, window)
return {1, count + 1, 0}
```

Cliente Node:
```typescript
const SCRIPT_SHA = await redis.scriptLoad(LUA_SCRIPT);

async function rateLimit(userId: string, windowMs = 60_000, maxReqs = 100) {
  const [allowed, count, retryAfterMs] = await redis.evalSha(SCRIPT_SHA, {
    keys: [`ratelimit:user:${userId}`],
    arguments: [String(windowMs), String(maxReqs), String(Date.now()), randomUUID()]
  });
  if (!allowed) {
    throw new RateLimitError({ count, retryAfterMs });
  }
}
```

Atomicidade: Lua script roda single-threaded em Redis; `ZREMRANGE + ZCARD + ZADD` são uma transação implícita. **Sem race entre instâncias**.

#### Token bucket atomic

Mais barato em memória (2 valores por key), permite burst bounded:

```lua
-- ARGV: capacity, refill_per_sec, now_ms, cost(=1 default)
local key       = KEYS[1]
local capacity  = tonumber(ARGV[1])
local refill    = tonumber(ARGV[2])      -- tokens/sec
local now       = tonumber(ARGV[3])
local cost      = tonumber(ARGV[4])

local data = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens   = tonumber(data[1]) or capacity
local last     = tonumber(data[2]) or now

-- Refill baseado em tempo passado
local elapsed_sec = (now - last) / 1000
tokens = math.min(capacity, tokens + elapsed_sec * refill)

if tokens < cost then
  redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
  redis.call('PEXPIRE', key, math.ceil(capacity / refill * 1000) + 1000)
  return {0, tokens}
end

tokens = tokens - cost
redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
redis.call('PEXPIRE', key, math.ceil(capacity / refill * 1000) + 1000)
return {1, tokens}
```

#### Padrão Logística multi-tier

```typescript
// Premium: 1000 req/min, burst 100
// Standard: 100 req/min, burst 20
// Free: 30 req/min, burst 5
const tiers = {
  premium:  { capacity: 100, refillPerSec: 1000/60 },
  standard: { capacity: 20,  refillPerSec: 100/60 },
  free:     { capacity: 5,   refillPerSec: 30/60 },
};

app.use(async (req, res, next) => {
  const tenant = req.tenant;  // do middleware auth
  const { capacity, refillPerSec } = tiers[tenant.tier];

  try {
    await tokenBucket(`rl:${tenant.id}`, capacity, refillPerSec);
    next();
  } catch (e) {
    res.status(429)
       .header('Retry-After', Math.ceil(e.retryAfterMs / 1000).toString())
       .header('X-RateLimit-Limit', String(capacity))
       .header('X-RateLimit-Remaining', String(e.tokens))
       .json({ error: 'rate_limited', retry_after_ms: e.retryAfterMs });
  }
});
```

#### Caveats em produção

- **Redis cluster + slot assignment**: keys `{tenant.id}` com hash tag pra forçar mesmo slot se você precisa script atômico cross-key.
- **Failover Redis**: durante failover (segundos), rate limit fica permissivo. Acceptable se SLA de RL é "best effort"; pra strict (anti-abuse), rejeite quando Redis down (`fail closed`).
- **Clock drift entre instâncias**: use `now_ms` calculado em Redis (`redis.call('TIME')`) em vez de cliente, pra evitar discrepância.
- **Distributed counters podem driftar** em failover sem persistence; aceitável pra rate limit (drift de 1 janela), inaceitável pra billing.

Cruza com **04-04 §2.7** (rate limiting fundamentals) e **04-04 §2.24** (bulkhead per-tenant).

### 2.8 Geo-distribution

Multi-region:
- **Active-passive**: traffic em 1 região, backup em outra. Failover manual ou auto. RPO/RTO definem requirements de replication.
- **Active-active**: traffic em N regiões simultaneamente. Resolve latency pra users globais. Resolve consistency cross-region não trivial.

Active-active escolhe:
- Sharding por região (tenant fica em sua região).
- Multi-master replication com conflict resolution.
- Eventual consistency aceito.

Tools especializadas:
- **CockroachDB**: distribuído nativo.
- **YugabyteDB**: similar.
- **Cassandra**: AP, multi-DC built-in.
- **Spanner / TrueTime**: linearizable global (Google).
- **Aurora Global**: replication cross-region (sub-segundo).

Multi-region multiplica complexity. Comece single-region multi-AZ. Move pra multi-region quando user latency justifica ou compliance força.

### 2.9 Autoscaling

Triggers:
- CPU/memory.
- Request rate.
- Queue length.
- Custom metric (latency p99).

Horizontal Pod Autoscaler (K8s), AWS Auto Scaling Groups, Lambda concurrency.

Cuidado:
- Cold start: scale up lag.
- DB conn pool: 100 pods × 20 conn = 2000 conn = DB morto. Use pgBouncer/Supavisor entre.
- Ping-pong: scale up + down rápido. Cooldown periods.

**Predictive autoscale**: ML models antecipam picos. AWS, GCP têm.

### 2.10 Connection multiplexing

Em scale, conn é recurso. PgBouncer transaction mode multiplexa 1000 app conn em 50 DB conn.

Limites: prepared statements per session quebram. Configure app-side.

### 2.11 Async APIs em scale

Long-running tasks:
- Cliente envia request → server retorna 202 com job ID.
- Cliente polls `/jobs/{id}` ou recebe webhook.
- Server processa em queue.

Padrão clássico, scale enorme. APIs públicos com video processing, ML inference, large reports usam.

### 2.12 Backpressure end-to-end

Sob spike:
- LB rejeita (rate limit).
- App rejeita (load shed).
- Queue cresce até max.
- Producers veem rejeição e back off.

Sem backpressure: build-up até morte.

### 2.13 Observability em scale

03-07 viu. Em scale, observability vira o **maior centro de custo invisível** depois de compute. Ordem de magnitude (preços públicos 2026):

- **Datadog full-stack**: ~$15-23/host/mês + $0.10/M custom metrics + $1.27/M log events ingest. Cluster de 100 hosts com logs verbose passa de $15k/mês trivialmente.
- **CloudWatch Logs**: $0.50/GB ingest + $0.03/GB storage. App gerando 100k req/s com log médio de 1KB = ~8.6TB/dia = **$130k/mês só ingestion**.
- **OTel + self-hosted (Grafana stack: Loki/Mimir/Tempo)**: ~70-90% mais barato em volume alto, mas você opera. Break-even tipicamente entre $20k-50k/mês de SaaS.

Padrões obrigatórios pra não sangrar:
- **Sampling em traces**: head-based (1-10%) pra default; **tail-based** (sample anomalias: erros, p99, latência alta) via OTel Collector pra preservar sinal sem custo.
- **Sampling em logs**: nunca log INFO em hot path em prod. INFO/DEBUG só por request flag (`x-debug-trace: 1`) ou error rate spike (dynamic verbosity).
- **Aggregação edge** (OTel Collector como sidecar/DaemonSet): batching, dedup, dropping campos PII antes de enviar pra backend pago.
- **Retention tiers**: hot 7d (consulta rápida), warm 30d (Glacier-like), cold 1y só pra compliance. CloudWatch Insights cold scan é caro mas raro.
- **Dashboards SLO-first**: 4 sinais dourados (RED + USE) na home; detail só sob clique. Dashboard com 200 widgets é teatro.

Regra de ouro: **observability cost ≤ 10% do compute cost**. Acima disso, audit emergencial.

### 2.14 Cost ao scale

CFO entra na conversa. Categorias por ordem típica de magnitude em SaaS escalado em AWS:

| Categoria | Faixa típica | Drivers principais |
|---|---|---|
| **Egress** | 20-40% | Transferências out, NAT, cross-AZ |
| **Compute (EC2/Fargate/Lambda)** | 25-45% | Right-sizing, reserved/spot mix |
| **Database (RDS, DynamoDB)** | 10-25% | IOPS, multi-AZ, read replicas |
| **Observability** | 5-15% | Logs ingest > metrics > traces |
| **Storage (S3, EBS)** | 3-10% | Tiering, lifecycle |

**Ordem de ataque pra cortar conta sem quebrar prod:**
1. **Reserved Instances / Savings Plans** em compute estável (1y no upfront ~30-40% off, 3y all upfront ~50-60%).
2. **Right-sizing** via Compute Optimizer (instâncias com CPU < 20% sustentado).
3. **Egress**: VPC endpoints (gratuito ou ~$7/mês vs $0.045/GB de NAT), CloudFront pra static, evitar cross-AZ desnecessário (replicar read replicas na mesma AZ do app quando possível).
4. **Spot** em batch/CI/stateless web com graceful drain (~70-90% off; 1-3min warning).
5. **Logs**: sampling + retention tiering (item §2.13).
6. **Idle resources**: NAT GW idle, RDS dev rodando 24/7, EBS snapshots órfãos, EIPs unattached.

**Cost-per-unit-business** (`$/request`, `$/MAU`, `$/GB processado`) é a métrica que importa, não fatura absoluta. Cresce a fatura mas cai o `$/request`? Saudável. Sobe os dois? Investigar agora.

Cruza com **04-16** (unit economics, Rule of 40) e **03-05 §2.19** (FinOps disciplina).

### 2.15 Database capacity planning

Métricas de saturação:
- Connections used / max.
- IOPS / max.
- CPU.
- Replication lag.
- Lock waits.
- Bloat.

Alarme antes de bater teto. Vertical scale fácil; sharding caro. Plan ahead.

### 2.16 Real-time em scale

WebSocket connections per server em 2026: **100k-500k** com tuning agressivo (kernel ulimits, ephemeral port range, `SO_REUSEPORT`, epoll edge-triggered, ring buffers ajustados). Soketi, Centrifugo, Pusher publicaram benchmarks acima de 1M conn/host em hardware moderno.

**Limitadores reais antes do CPU:**
- File descriptors (`ulimit -n`, default Linux ~1024 — suba pra 1M).
- Ephemeral port range pra outbound (busca em 16384-60999 default; expanda).
- Memory: ~5-50KB/conn dependendo de buffers; 500k conn × 20KB = 10GB.
- TLS handshake throughput (CPU); offload pra hardware ou terminate em LB.

**Fan-out cross-instance**: Redis pub/sub (simples, eventual perda em failover), Kafka (durável, mais latência), NATS JetStream (meio-termo).

**Push services especializados**: Pusher, Ably, Soketi (self-host), Centrifugo. Trade entre operar você (custo fixo + skill) ou pagar por mensagem (escala linear, sem dor operacional). Break-even tipicamente em 100M+ messages/mês.

### 2.17 Eventual consistency em scale

Cross-region writes eventualmente convergem. UI deve handle:
- Read-your-writes: roteia user pra mesmo region durante session.
- Optimistic UI.
- Polling pós-mutation.

### 2.18 Real-world scale anchors

- 1k req/min: trivial. Rails + Postgres handle.
- 10k req/min: monolith bem tunado.
- 100k req/min: multi-instance, conn pool tuning, read replicas, cache tiers.
- 1M req/min: sharding, edge, async offload, multi-region considered.
- 10M+: serious distributed systems.

Avalie onde você realmente está e desenhe pra 10x atual, não 1000x.

### 2.19 Scaling teams

Conway: scaling tech requer scaling org. Times de plataforma, SREs, dedicated DBA. Sem isso, "escalar arquitetura" sem mãos é fantasia.

### 2.20 Backpressure end-to-end deep — TCP slow-start, app Reactive Streams, queue credit-based flow control

§2.12 introduz backpressure como conceito. §2.20 entra em **mecânica end-to-end** — desde TCP layer (slow-start, congestion window) → application layer (Reactive Streams credit-based) → queue layer (consumer credit, prefetch) → producer layer (rate limit, circuit breaker). Sistema sem backpressure cascateado quebra na fila mais fraca; com backpressure correto, gracefully degrada.

**Layer 1 — TCP backpressure (já vem grátis, mas tem armadilhas)**:

- **Slow-start**: nova connection começa com `cwnd = 10 * MSS` (~14KB), dobra a cada RTT até congestion event.
- **Sliding window**: receiver anuncia `rwnd` em ACKs; sender limita in-flight bytes a `min(cwnd, rwnd)`.
- **TCP backpressure ativo**: receiver para de ler do socket → kernel buffer enche → ACKs param → sender bloqueia em `send()`.
- **Pegadinha**: socket buffer default Linux ~ 200KB. Em conexão alta-latência (> 100ms RTT), throughput max ≈ buffer / RTT = 16Mbps. Sintoma: "rede de 1Gbps mas pega 20Mbps". Fix: `tcp_rmem` / `tcp_wmem` tuning + `net.core.rmem_max` + `SO_RCVBUF` em socket setup. Linux 6+ tem auto-tuning melhor.
- **HTTP/2 stream-level flow control**: cada stream tem janela própria; aplicação que para de ler body bloqueia stream sem bloquear connection.

```bash
# Inspecionar cwnd, rwnd, retransmits por socket
ss -tin

# Tuning kernel (sysctl)
sysctl -w net.ipv4.tcp_rmem="4096 1048576 16777216"
sysctl -w net.ipv4.tcp_wmem="4096 1048576 16777216"
sysctl -w net.core.rmem_max=16777216
sysctl -w net.core.wmem_max=16777216
```

**Layer 2 — Application backpressure: Reactive Streams**:

Reactive Streams spec (2014, JEP 266 em Java 9, RxJS 6+, Project Reactor): consumer pede N items; producer respeita. Pattern: `request(N)` upstream, `onNext(item)` downstream. Sem `request`, producer não envia.

```typescript
import { Subject, mergeMap, throttleTime } from 'rxjs';

// Producer com backpressure-aware flow
const orderEvents = new Subject<Order>();

orderEvents.pipe(
  // throttle aplicado quando consumer está lento
  throttleTime(100),
  // mergeMap concurrency cap = backpressure ativo
  mergeMap((order) => processOrder(order), 5), // max 5 concurrent
).subscribe({
  next: (result) => log.info({ result }, 'processed'),
  error: (err) => log.error({ err }),
});
```

**Async Iterator pattern (modern, sem RxJS)**:

```typescript
async function* eventStream(): AsyncGenerator<Order> {
  while (true) {
    const batch = await fetchBatch(); // fetches respeitam backpressure naturalmente
    for (const order of batch) yield order;
  }
}

for await (const order of eventStream()) {
  await processOrder(order); // synchronous — só fetch next quando processou
}
```

`for await...of` tem backpressure embutido. `eventStream` só gera próximo batch quando consumer consumiu o anterior. Diferente de "fan-out": aqui processamento sequencial. Pra paralelo bounded:

```typescript
import pLimit from 'p-limit';

const limit = pLimit(10);
for await (const order of eventStream()) {
  await limit(() => processOrder(order));
  // limit fica full → backpressure pro stream
}
```

**Layer 3 — Message queue backpressure**:

RabbitMQ — prefetch + manual ack:

```typescript
await channel.prefetch(10); // max 10 msgs unacked por consumer
channel.consume('orders', async (msg) => {
  if (!msg) return;
  try {
    await processOrder(JSON.parse(msg.content.toString()));
    channel.ack(msg);
  } catch (err) {
    channel.nack(msg, false, false); // dead letter
  }
});
```

Sem prefetch: broker dump mensagens no consumer; consumer overwhelmed; OOM ou message loss em crash. Prefetch = credit window. Tune por throughput vs latency.

Kafka — consumer poll + manual offset:

```typescript
const consumer = kafka.consumer({ groupId: 'orders-processor' });
await consumer.run({
  partitionsConsumedConcurrently: 3,
  eachBatchAutoResolve: false,
  eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning }) => {
    for (const message of batch.messages) {
      if (!isRunning()) break;
      await processOrder(JSON.parse(message.value!.toString()));
      resolveOffset(message.offset);
      await heartbeat();
    }
  },
});
```

`eachBatchAutoResolve: false` + `resolveOffset` manual = checkpoint só após processar. Crash mid-batch reprocessa o batch (idempotency obrigatória). `partitionsConsumedConcurrently`: bounded parallelism per partition.

SQS — visibility timeout + long polling: receive 10 mensagens; processar; delete. Sem delete em N segundos (visibility timeout) = volta pra queue. Backpressure: limit consumer instances; SQS naturally respeita (poll quando ready).

**Layer 4 — Producer backpressure: load shedding e circuit breaker**:

Load shedding em API: quando saturado, rejeita requests novos com 503 + `Retry-After`. NÃO espera, não enfileira.

```typescript
// Express middleware
app.use((req, res, next) => {
  const queueDepth = getQueueDepth();
  const concurrentRequests = getConcurrentRequests();
  if (queueDepth > 1000 || concurrentRequests > 500) {
    res.status(503).set('Retry-After', '5').json({ error: 'saturated' });
    return;
  }
  next();
});
```

Adaptive concurrency (Netflix Concurrency Limits): limit dinâmico baseado em latency observada. Quando latência sobe → limit cai → request rejection sobe → upstream learns.

**Decision tree — drop, buffer, throttle, ou backpressure?**:

| Workload | Recomendação |
|---|---|
| Real-time analytics (logs, traces) | **Drop** (head-drop ou tail-drop por sampling). Buffer infinito = OOM. |
| Financial transaction | **Backpressure + persistent queue**. Nunca drop. Slow OK; loss não. |
| User-facing API request | **Load shed (503) + Retry-After**. Não fila enorme; cliente decide retry. |
| Background job (email send) | **Throttle + queue**. Bounded queue; producer espera. |
| Bulk import | **Backpressure via cursor** (DB cursor + commit periódico). Sem load full em memória. |

**Logística pipeline — backpressure stack completo**:

```
Mobile app → API Gateway (load shed 503) → Order Service (concurrency limit)
                                                   ↓
                                           Postgres OUTBOX (transactional write)
                                                   ↓
                                           Debezium CDC → Kafka (partitioned, bounded retention)
                                                   ↓
                                           Order Processor (consumer prefetch=10, heartbeat)
                                                   ↓
                                           Notification Service (rate-limit por provider)
```

Cada hop tem backpressure ativo. Spike no mobile não derruba notification — degrada gracefully.

**Observability obrigatório por layer**:

- **TCP**: `ss -tin` mostra cwnd, retransmits. Em scale, eBPF `tcptracer` ou Cilium Hubble.
- **App**: queue depth, concurrent requests, rejection rate (Prometheus gauges).
- **Queue**: lag em Kafka (`kafka-consumer-groups --describe`), depth em RabbitMQ (`rabbitmqctl list_queues`), visibility timeout breaches em SQS.
- **Producer**: 503 rate, `Retry-After` issued, circuit breaker open count.

**Anti-patterns observados**:

- **Buffer unbounded em fila in-memory** (`Queue<T>` sem cap): producer infinitamente faster que consumer → OOM. Sempre bounded.
- **Drop silencioso sem métrica**: dashboard verde, mensagens sumindo. Counter de drop sempre, alert em > 0.
- **Retry sem backoff em saturação**: amplifies load 10x quando upstream já sofrendo. Backoff jittered (cruza 04-04 §2.3).
- **`for...of array` quando array vem de stream**: load tudo em memória primeiro. Use `for await...of` em iterator.
- **Kafka sem `eachBatchAutoResolve: false`**: crash mid-batch perde mensagens entre offset commit e processamento.
- **RabbitMQ `prefetch=unlimited`** (default): consumer overwhelmed em spike. Set always.
- **Load shedding por CPU%**: CPU é lagging indicator; service já degradado. Use queue depth, latency p99, ou adaptive concurrency.
- **Backpressure só em uma camada**: gargalo move pra próxima sem visibility. Cobrir TODO o pipeline.

Cruza com **04-09 §2.12** (backpressure conceito), **04-09 §2.13** (observability é pré-req), **04-04 §2.3** (jittered backoff em retry), **04-04 §2.20** (adaptive concurrency Netflix), **04-02 §2.x** (queue patterns RabbitMQ/Kafka), **02-09 §2.20** (DB capacity é limit final).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Vertical vs horizontal trade-offs.
- Stateful vs stateless implicação em scale.
- Sharding strategies (hash, range, tenant) com hotspot exemplos.
- Read replica + roteamento + lag handling.
- 4 cache tiers e invalidation.
- Active-passive vs active-active multi-region.
- Autoscaling pitfalls (DB conn, ping-pong, cold start).
- Backpressure end-to-end.
- WS scale com fan-out.
- Capacity planning DB métricas.

---

## 4. Desafio de Engenharia

Plano e demo de **scaling Logística pra 10x atual** com baseline real.

### Especificação

1. **Baseline**:
   - Capture métricas atuais (do 03-10): throughput, latency p99, recursos.
   - Defina alvo: 10x volume (ex: 1k orders/min → 10k orders/min, 10k → 100k WS connections, etc.).
2. **Bottleneck analysis**:
   - Reproduza 10x carga em load test.
   - Identifique gargalos por ordem: DB, app CPU, app memory, conn pool, Redis, queue, network.
3. **Scaling moves** (em ordem de leverage):
   - Read replicas Postgres + roteamento (queries de listagem).
   - Conn pool tuning + PgBouncer transaction mode.
   - Cache layers (process-local + Redis) em queries quentes; medir hit rate.
   - Async offload: emails, notifications, reports → queue + worker.
   - HPA / autoscaling de app calibrado por métrica que reflete carga real (não só CPU; queue depth, RPS).
   - WS fan-out via Redis pub/sub demonstrado em N instâncias.
4. **Sharding-prep, não execute**:
   - Documente plano de sharding por tenant_id.
   - Identifique queries que precisariam mudar.
   - Decisão consciente de NÃO executar agora (e quando seria momento).
5. **Multi-region prep**:
   - Documente design pra active-passive (RPO/RTO definidos).
   - Aurora Global Database ou similar discutido como opção.
   - Justifique por que NÃO executa (custo, complexity vs need atual).
6. **Edge layer**:
   - 1 endpoint pesado read-only (`/track/{token}` público) em CloudFront Function ou Worker, cached at edge.
   - Cache hit rate e latency reduction documented.
7. **Backpressure**:
   - Demonstre cliente rapid producer + slow consumer; verify sistema degrada graciosamente (load shed, queue limit, retry-after).
8. **Capacity plan**:
   - Documento `CAPACITY.md`:
     - Atual capacity por componente.
     - Alvo capacity.
     - Quando próxima mudança disparar (e qual).

### Restrições

- Sem sharding sem evidência de necessidade.
- Sem multi-region sem decisão fundamentada.
- Sem autoscaling com gatilho que não corresponde a carga real.

### Threshold

- README documenta:
  - Baseline → bottleneck → solução, em ordem.
  - 10x test results pós-otimização: passou? Quase? Onde travou de novo?
  - Cache hit rates by tier.
  - Autoscaling em ação durante teste (gráfico replicas vs carga).
  - Capacity plan completo.
  - 1 caso onde otimização "óbvia" não rendeu (anti-intuição).

### Stretch

- Citus + Postgres multi-shard real (pode ser lab).
- Multi-region active-passive demo (mesmo que toy): primary + standby; failover.
- WebSocket scale beyond 100k via dedicated Soketi/Centrifugo.
- Predictive autoscale: simple model (rolling avg + spike forecast).
- Cost projection by component em 10x volume.

---

## 5. Extensões e Conexões

- Liga com **02-09** (Postgres): replicas, sharding via Citus.
- Liga com **02-11** (Redis): cluster, fan-out.
- Liga com **02-14** (real-time): WS scale.
- Liga com **03-03** (K8s): HPA, autoscaling.
- Liga com **03-05** (AWS): RDS, ElastiCache, Aurora Global, ALB, CloudFront.
- Liga com **03-07** (observability): SLO + capacity dashboards.
- Liga com **03-10** (perf backend): otimização precede scaling.
- Liga com **04-01** (theory): consistency em multi-region.
- Liga com **04-04** (resilience): backpressure, bulkhead.
- Liga com **04-08** (services): scale per deployable.

---

## 6. Referências

- **DDIA**: capítulos 5 (replication), 6 (partitioning).
- **"The Art of Scalability"**: Abbott, Fisher.
- **"Web Scalability for Startup Engineers"**: Artur Ejsmont.
- **"Real-World Cryptography"**: capítulos relacionados a multi-region trust.
- **AWS Builders' Library**: capacity planning, multi-region.
- **High Scalability blog** ([highscalability.com](http://highscalability.com/)), case studies.
- **Cockroach docs** ([cockroachlabs.com/docs](https://www.cockroachlabs.com/docs/)).
- **CitusData blog**.
- **"Site Reliability Engineering"**: Google. Capacity planning chapter.
