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

### 2.21 Database sharding strategies (range, hash, directory; Vitess, Citus, CockroachDB comparison)

Sharding entra quando single-DB cap reached — não antes. Complexity 10x: routing layer, cross-shard JOINs, resharding ops, transactional limits. Decisão certa = entender quando shard, qual key, qual stack. Decisão errada = hot shard, scatter-gather lento, rebalance impossível.

**Quando shard (vs vertical scaling vs read replicas)**:

- **Vertical scaling**: bigger box. Cap pragmático 2026 ~$50k/mo em RDS `db.r7g.16xlarge` (~512GB RAM, 64 vCPU, 256k IOPS gp3). Aurora I/O Optimized estende mais um pouco. Beyond, must shard.
- **Read replicas**: solve read scale; NÃO write scale. Replication lag (em RDS Postgres assíncrono ~50-200ms p99) é ceiling pra read-after-write consistency.
- **Sharding**: split data across N independent DBs. Horizontal scale; complexity 10x.
- **Threshold pragmático 2026**: shard quando primary > 5TB OR write QPS > 50k sustained OR connection count > 10k. Below isso = vertical + replicas.

**Três estratégias de sharding**:

- **Range sharding**: split por key range (`user_id 0-1M → shard A; 1M-2M → shard B`). Pros — range queries (`WHERE id BETWEEN ...`) eficientes, hit single shard. Cons — hot shards (recent users always active most; timestamp range = shard mais novo sempre pegando fogo).
- **Hash sharding**: `hash(key) % N → shard`. Pros — uniform distribution, sem hot shard. Cons — range queries scatter-gather across all shards (lento).
- **Directory-based**: lookup table mapeia key → shard. Pros — flexível, reshard sem mover data (só atualiza directory). Cons — directory lookup overhead em cada query; directory é SPOF/bottleneck (cache obrigatório).

**Sharding key — decisão crítica**:

- **Wrong key**: 99% queries hit single shard ("hot shard"); rebalance fixes nothing porque distribuição inerente está errada.
- **Right key**: queries distribuem uniformly OR colocate data relacionado (mesmo tenant em mesmo shard).
- **Logística example**:
  - **Por `tenant_id`**: pros — multi-tenant isolation; query de um lojista hit single shard (eficiente). Cons — large tenants (top 1% lojistas com 10M orders) viram hot shards.
  - **Por `order_id` hash**: pros — uniform; cons — dashboard do lojista (`SELECT * FROM orders WHERE tenant_id = X`) scatter-gather across all shards (slow).
  - **Por `tenant_id` com sub-sharding pra large tenants**: pros — best of both; cons — routing complexo, directory layer pra split tenants grandes.
- **Rule**: escolha key pelo predominant query pattern. Read-heavy multi-tenant → `tenant_id`. Write-heavy global stream → hash de event_id.

**Vitess (MySQL) + PlanetScale architecture**:

- **Vitess** (originated YouTube 2010+, CNCF graduated 2019, v19+ em 2026): MySQL sharding com vstream + vreplication.
- **VTGate**: query router; parses SQL, conhece shard topology (VSchema), fans out queries.
- **VTTablet**: per-shard MySQL proxy; gerencia connection pool, query rewriting.
- **VSchema**: declarative shard config. **Vindex** = sharding function (hash, lookup, numeric).
- **Resharding online** via `MoveTables` + `Reshard`: zero-downtime split shard A → A1 + A2. Vstream replica continuamente; cutover atômico.
- **PlanetScale** (managed Vitess, 2026): branching schemas (Git-like, deploy requests), scale 1B+ rows. Pricing 2026: $0.50/M reads, $1.50/M writes, $4/GB storage scaler tier.
- Use cases: MySQL-compatible existing apps, large eng team, customers Square / GitHub / Etsy / Slack.

**Citus (Postgres) architecture**:

- **Citus** (extension Postgres, acquired Microsoft 2019, v12+ em Postgres 16+): coordinator + worker nodes.
- **Distributed tables**: shard key declarado em DDL.
- **Reference tables**: replicated em todos workers (lookup tables pequenas, evita cross-shard JOIN).
- **Coordinator**: query router, planner, metadata. **Workers**: shard storage + execution.
- **Resharding** via `rebalance_table_shards` — online, usa logical replication.
- **Azure Cosmos DB for Postgres** = managed Citus.

```sql
-- Citus 12+ on Postgres 16+ — Logística distributed schema
CREATE TABLE tenants (id uuid PRIMARY KEY, name text);
SELECT create_reference_table('tenants');  -- replicado pra todos workers

CREATE TABLE orders (
  id uuid, tenant_id uuid NOT NULL, status text, total_cents bigint,
  created_at timestamptz, PRIMARY KEY (tenant_id, id)
);
SELECT create_distributed_table('orders', 'tenant_id');  -- shard by tenant

CREATE TABLE tracking_pings (
  order_id uuid, tenant_id uuid NOT NULL, ping_at timestamptz,
  lat double precision, lng double precision,
  PRIMARY KEY (tenant_id, order_id, ping_at)
);
SELECT create_distributed_table('tracking_pings', 'tenant_id', colocate_with => 'orders');

-- Rebalance online quando worker novo entra
SELECT rebalance_table_shards('orders', shard_transfer_mode := 'force_logical');
```

- Use cases: Postgres-compatible, multi-tenant SaaS (Heap, Adjust, Convertible).

**CockroachDB / TiDB / YugabyteDB (NewSQL)**:

- **CockroachDB v24+**: Postgres-compatible wire protocol; raft consensus per range; auto-sharding (range-based, automatic split em ~512MB e merge); strict serializable global.
- **TiDB**: MySQL-compatible; columnar TiFlash + row TiKV; HTAP focus.
- **YugabyteDB**: Postgres + Cassandra wire protocols; tablet-based sharding.
- **Pros**: SQL + auto-sharding + multi-region transactional sem app-level complexity.
- **Cons**: ~30-50% slower que single-node Postgres pra OLTP simples (raft round-trip em commit); ops complex; CockroachDB enterprise $$$$ ($1k+/mo serious deploys, $20k+/mo multi-region).
- **Use cases**: multi-region com strong consistency requirement (financial ledger, gaming leaderboard global, regulatory compliance forçando data residency + cross-region transactions).

**Custom application-level sharding (alternativa pragmática)**:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { orders } from './schema';

const SHARDS = {
  shard0: drizzle(postgres(process.env.DB_SHARD_0_URL!)),
  shard1: drizzle(postgres(process.env.DB_SHARD_1_URL!)),
  shard2: drizzle(postgres(process.env.DB_SHARD_2_URL!)),
  shard3: drizzle(postgres(process.env.DB_SHARD_3_URL!)),
} as const;

function shardForTenant(tenantId: string): keyof typeof SHARDS {
  // tenantId é uuid; primeiros 8 hex chars = uniform hash
  const hash = parseInt(tenantId.slice(0, 8), 16);
  return `shard${hash % 4}` as keyof typeof SHARDS;
}

export async function getOrdersForTenant(tenantId: string) {
  const shard = SHARDS[shardForTenant(tenantId)];
  return shard.select().from(orders).where(eq(orders.tenantId, tenantId));
}

// Cross-shard query (admin global dashboard) — scatter-gather
export async function countOrdersGlobal() {
  const results = await Promise.all(
    Object.values(SHARDS).map((s) => s.select({ c: orders.id }).from(orders)),
  );
  return results.flat().length;
}
```

- **Cross-shard queries**: scatter-gather → app-level merge. Pegadinha: JOINs cross-shard = slow; denormalize ou ETL pra warehouse (cruza 04-13 lakehouse).
- **Resharding manual**: copy data + dual-write transition + cutover. Months of work, alto risco; razão pra preferir Vitess/Citus quando possível.

**Sharding decision matrix 2026**:

| Approach | Pros | Cons | Cost |
|---|---|---|---|
| **Vertical scaling** | Simplest, zero complexity | Cap ~512GB RAM | $50k/mo RDS r7g.16xl |
| **Read replicas** | Solve reads | NÃO writes; lag | $5k/mo + RDS primary |
| **Vitess / PlanetScale** | MySQL compat, managed branching | Vendor lock (PlanetScale) | $0.50/M reads + $4/GB |
| **Citus / Azure CosmosDB-PG** | Postgres compat, reference tables | Self-host complex, coordinator SPOF | OSS ou Azure $$$ |
| **CockroachDB** | Auto-shard + global ACID | OLTP slower, enterprise expensive | $1k+/mo serious |
| **App-level sharding** | Full control, zero vendor | Reshard pain, eng team owns | Postgres × N + dev time |

**Logística applied — when to shard (capstone roadmap)**:

- **MVP (v1)**: single Postgres 17 em RDS db.r7g.2xl. Cap até ~5TB / 50k qps writes.
- **Growth (v2)**: read replicas regionais (SP, EU); primary single. Cap dobra via vertical (db.r7g.8xl) + replicas pra dashboard reads.
- **Scale (v3)**: shard `orders` + `tracking_pings` por `tenant_id` (Citus, hash, 4 shards initial). `countries`, `couriers_global`, `pricing_tiers` viram reference tables. Coordinator HA via standby coordinator + PgBouncer.
- **Multi-region (v4)**: per-region Citus cluster + cross-region logical replication. Reports cross-region rodam em warehouse (lakehouse via Iceberg, eventual consistency aceito).

**Anti-patterns observados**:

- **Sharding antes de single-DB cap reached**: complexity 10x sem signal real de bottleneck. Vertical até doer.
- **Sharding key escolhido sem analisar query patterns**: hot shard surprise em produção; refazer = pesadelo.
- **Cross-shard JOIN em hot path**: scatter-gather O(N) shards; latency explode. Denormalize ou ETL pra warehouse.
- **Range sharding por timestamp em append-only workload**: shard novo always hot, shards antigos cold. Use hash.
- **Resharding manual sem dual-write transition**: data loss garantido; 12-24h de pain. Use Citus rebalance ou Vitess MoveTables.
- **Reference tables NÃO replicated em todos shards**: cross-shard JOIN em cada lookup; throughput cai 10x.
- **Citus coordinator single instance**: SPOF. HA via standby coordinator + PgBouncer + Patroni.
- **CockroachDB pra OLTP simples sem multi-region requirement**: 30-50% slower que Postgres + cost premium injustificado. Use só quando global ACID é hard requirement.
- **Vitess sem `vstream` configurado**: resharding offline, downtime hours em scale grande.
- **Distributed transaction across shards em hot path**: latency 5-10x (2PC ou raft cross-shard). Redesign pra single-shard transaction; cross-shard só pra batch jobs.

Cruza com **02-09 §2.x** (Postgres deep, partitioning como precursor de sharding), **04-01 §2.x** (distributed systems theory, CAP/PACELC justifica trade-offs sharded), **04-04 §2.x** (resilience, shard failover + replica promotion), **04-13 §2.x** (CDC sharded source pra lakehouse), **03-05 §2.x** (AWS RDS / Aurora limits forçam decisão).

---

### 2.22 Multi-region production deep 2026 — geo-routing, residency, consistency cross-region

Multi-region não é "deploy em 2 regions atrás de DNS round-robin". Multi-region production é **três decisões ortogonais empilhadas**: (1) **routing layer** — como tráfego chega na region certa (latency-based DNS, GeoDNS, Anycast); (2) **data residency** — onde o byte do usuário pode legalmente repousar (GDPR, LGPD, DPDPA); (3) **consistency model cross-region** — o que acontece quando duas regions escrevem ao mesmo tempo (single-leader, multi-leader, CRDTs). Errar qualquer uma das três custa: latency surprise (write cross-region 80-150ms), multa regulatória (GDPR Article 83 — até 4% revenue global), ou silent data corruption (LWW destruindo conta bancária). §2.8 introduziu geo-distribution, §2.21 cobriu sharding intra-region. §2.22 é o **playbook production** das três decisões.

**Geo-routing layer 2026.** Quatro mecanismos, não intercambiáveis:

1. **Latency-based DNS (Route53 latency policy, NS1 Filter Chain).** Cliente resolve `api.app.com` — DNS responde com IP da region de menor RTT medido (Route53 mantém latency map global atualizado a cada hora). Funciona pra HTTP stateless. Falha quando: client cacheia DNS além do TTL (mobile networks com TTL ignore — sticky a region morta); RTT medido != RTT real (cliente atrás de VPN corporativo).
2. **GeoDNS (Route53 geolocation policy, Cloudflare GeoSteering).** Resolve por **país/continente do client IP**, não por latência. Uso real: data residency hard pin — usuário BR vai pra `sa-east-1`, sempre, mesmo se `us-east-1` estiver mais perto via backbone. Cuidado: GeoIP database tem 1-3% de erro (VPNs, corporate proxies, satellite ISPs).
3. **Anycast (Cloudflare, Fastly, CloudFront, Google Cloud).** Mesmo IP anunciado via BGP de N PoPs globais — roteador BGP do ISP escolhe o PoP "mais próximo" (em hops AS, não latência). Latency p50 < 20ms global. **Limitação crítica**: Anycast pra TCP de longa duração (WebSocket, gRPC streaming) quebra quando BGP converge mid-session — sessão muda de PoP, TCP state perdido. Use Anycast só pra HTTP curto ou UDP (QUIC).
4. **AWS Global Accelerator / Cloudflare Argo Smart Routing.** Anycast no edge + roteamento WAN privado até a region origin. Cliente conecta no PoP edge mais próximo (Anycast), e o tráfego viaja pela backbone privada (não internet pública) até `us-east-1`. Reduz p99 jitter em 30-50% vs internet routing. AWS Global Accelerator cobra $0.025/hora por accelerator + $0.015/GB transfer — caro, vale pra tráfego latency-sensitive.

```yaml
# Route53 latency-based + failover record set (Terraform)
resource "aws_route53_record" "api_useast" {
  zone_id        = var.zone_id
  name           = "api.app.com"
  type           = "A"
  set_identifier = "us-east-1"
  latency_routing_policy { region = "us-east-1" }
  health_check_id = aws_route53_health_check.useast.id  # se region down, Route53 não retorna este RR
  alias { name = aws_lb.useast.dns_name; zone_id = aws_lb.useast.zone_id; evaluate_target_health = true }
}
resource "aws_route53_record" "api_saeast" {
  zone_id        = var.zone_id
  name           = "api.app.com"
  type           = "A"
  set_identifier = "sa-east-1"
  latency_routing_policy { region = "sa-east-1" }
  health_check_id = aws_route53_health_check.saeast.id
  alias { name = aws_lb.saeast.dns_name; zone_id = aws_lb.saeast.zone_id; evaluate_target_health = true }
}
```

**Data residency 2026 — o terreno regulatório.** Não é opcional, não é "boa prática" — é multa. Mapa atual:

- **GDPR (EU, 2018+).** Article 44-50 — transfer de dados pessoais EU pra fora do EEA exige base legal: adequacy decision (UK, Suíça, Japão, Canadá, Brasil — adequacy provisional desde 2024), Standard Contractual Clauses (SCCs), ou Binding Corporate Rules. **Schrems II (2020)** invalidou Privacy Shield US-EU; o **EU-US Data Privacy Framework (Jul 2023)** restaurou transfer pra empresas certificadas, mas em 2026 ainda enfrenta challenges legais. Multa: até €20M ou 4% revenue global (Article 83).
- **LGPD (Brasil, 2020+).** Article 33 — transferência internacional exige adequacy ou garantias específicas. ANPD ainda não publicou lista definitiva de adequacy em 2026. Multa: até R$50M por infração (Article 52).
- **India DPDPA (Aug 2023, em força 2024-2025).** Permite transfer exceto pra "negative list" de países (a definir pelo governo). RBI separadamente exige **payments data localization** desde 2018 — payments data de cidadãos indianos só em servidores na Índia.
- **China PIPL (2021).** Cross-border transfer exige security assessment do CAC (Cyberspace Administration) acima de thresholds. Estrangeiros operando na China: data localization de fato.
- **Russia 152-FZ, Indonesia PDP Law, Saudi PDPL** — region-pinning hard.

**Tenant-routing por residency** (pseudocode, edge worker):

```javascript
// Cloudflare Worker — residency-aware tenant router
export default {
  async fetch(req, env) {
    const tenantId = req.headers.get('x-tenant-id');
    const tenant = await env.TENANT_KV.get(tenantId, 'json');  // { residency: 'EU' | 'US' | 'BR' | 'IN' }
    const regionMap = {
      EU: 'https://api-eu-west-1.app.com',
      US: 'https://api-us-east-1.app.com',
      BR: 'https://api-sa-east-1.app.com',
      IN: 'https://api-ap-south-1.app.com',
    };
    const target = regionMap[tenant.residency];
    if (!target) return new Response('residency unknown', { status: 403 });
    return fetch(target + new URL(req.url).pathname, { method: req.method, headers: req.headers, body: req.body });
  }
};
```

Decisão de residency é **per-tenant**, gravada no signup e imutável (mudar residency = data migration projeto). `tenant_id → region` cacheado em edge KV (Cloudflare KV, DynamoDB Global Tables) — read p99 < 10ms.

**Consistency cross-region — o trade-off real.** Quatro padrões production:

1. **Single-leader cross-region (Aurora Global Database, Postgres logical replication).** Um primário em uma region (ex: `us-east-1`), read replicas nas outras. Writes vão pro primário — usuário em `sa-east-1` paga 120-150ms p99 por write. Reads locais e rápidos. RPO Aurora Global < 1s, RTO promote < 1min (Q1 2025: managed failover). Simples, predictable, mas write latency cross-region é o custo. Use quando: write-volume moderado, read-heavy, residency permite cross-region.
2. **Multi-leader (active-active — DynamoDB Global Tables, Cosmos DB multi-region writes, Cassandra multi-DC).** Cada region escreve local. Conflitos resolvidos via **LWW (Last-Write-Wins)** baseado em timestamp/vector clock, ou via **CRDT** (counter, set). DynamoDB Global Tables Q1 2025 adicionou strong consistency regional opt-in (paga 2× write capacity). Cosmos DB oferece 5 níveis (strong, bounded staleness, session, consistent prefix, eventual). LWW silenciosamente perde writes — nunca use pra: counters, inventory, financial balance, semantic merges.
3. **External consistency global (Cloud Spanner, CockroachDB multi-region, YugabyteDB).** Spanner usa TrueTime (GPS + atomic clocks) pra ordenação global linearizável — qualquer query lê estado globalmente consistente, latency 100-500ms p99 cross-region. CockroachDB 24.x: table localities `REGIONAL BY ROW` (cada row pinada a uma region — write local), `REGIONAL BY TABLE` (table inteira em uma region), `GLOBAL` (read everywhere local, writes consensus global — caro).
4. **Read replicas + follower reads (CockroachDB AS OF SYSTEM TIME, Spanner stale reads, Postgres read replica).** Lê de réplica local com bounded staleness (ex: "dados ≤ 5s atrás"). Latency local, consistency degradada explicitamente.

```sql
-- CockroachDB 24.x — REGIONAL BY ROW (cada row escolhe region pelo crdb_region column)
ALTER DATABASE app PRIMARY REGION "us-east1";
ALTER DATABASE app ADD REGION "europe-west1";
ALTER DATABASE app ADD REGION "southamerica-east1";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email STRING NOT NULL,
  region crdb_internal_region NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
) LOCALITY REGIONAL BY ROW AS region;

-- Insert pinado em region — write local, latency < 10ms
INSERT INTO users (email, region) VALUES ('user@x.com', 'southamerica-east1');

-- Follower read (stale por até 4.8s, lê de réplica local)
SELECT * FROM users AS OF SYSTEM TIME follower_read_timestamp() WHERE id = $1;
```

```sql
-- Cloud Spanner — external consistency (read snapshot global linearizável)
SELECT account_id, balance FROM accounts WHERE account_id = @id;
-- p99 latency cross-region: 100-500ms (TrueTime wait + Paxos quorum)
```

**Real DB matrix 2026** (write-cross-region, RPO, RTO, strong consistency):

| DB | Write model | RPO | RTO | Strong cross-region | Custo relativo |
|---|---|---|---|---|---|
| Aurora Global Postgres | single-leader | < 1s | < 1min (managed) | não (read replicas eventual) | médio |
| DynamoDB Global Tables | multi-leader LWW | seconds | < 1min | sim (opt-in regional Q1/2025, 2× WCU) | alto |
| Cloud Spanner | Paxos global | 0 (synchronous) | seconds | sim (TrueTime) | muito alto |
| CockroachDB 24.x | Raft per range, regional locality | 0 (sync) | seconds | sim (configurable) | alto |
| Cosmos DB multi-region | multi-leader, 5 levels | configurable | seconds | bounded staleness opt-in | alto |
| YugabyteDB 2.20 | Raft, geo-partitioning | 0 | seconds | sim | médio |
| Vitess 21+ | sharded MySQL, multi-region | seconds | minutes | não nativo | médio |

**Stateful services multi-region.** Redis: cross-region replication via Redis Enterprise Active-Active (CRDB — CRDT-based) ou ElastiCache Global Datastore (single-leader). Kafka: **MirrorMaker 2** ou **Confluent Cluster Linking** (active-active com offset translation). pgvector: replicação igual Postgres logical, mas embeddings updates frequentes geram bloat — vacuum agressivo. Stateful TCP (WebSocket, gRPC streaming): **não use Anycast** — use latency DNS + sticky session via region-affinity cookie.

**Failover patterns.** **Zone failover** (intra-region, AZ down): managed automaticamente (Aurora Multi-AZ, ElastiCache, MSK). RTO < 1min, RPO 0. **Region failover** (region inteira down — eventos raros mas reais: AWS us-east-1 Dec 2021, GCP us-central1 Jun 2022): **manual em 95% dos casos production**. Auto-failover cross-region é split-brain risk — quorum loss + latency partition pode causar promotion errada. Playbook: documentado em runbook (04-04 §2.30), promote command testado mensalmente, traffic switch via Route53 weighted record (gradual 10%→50%→100%).

```bash
# Aurora Global Database — promote secondary region (manual, runbook step)
aws rds failover-global-cluster \
  --global-cluster-identifier app-global \
  --target-db-cluster-identifier arn:aws:rds:eu-west-1:...:cluster:app-eu \
  --allow-data-loss  # RPO < 1s window
```

**Stack Logística aplicada.** `orders` DB Aurora Global Postgres single primary `us-east-1` + read replicas `sa-east-1` e `eu-west-1` (write cross-region tolerated, 80-150ms p99 — orders volume baixo). `couriers_location` (high-write, 1Hz GPS por courier) em **Cloudflare Workers KV cross-region** (eventual, LWW — perda de 1 ponto GPS irrelevante). `payments` LGPD-pinned single region `sa-east-1` (Brazil residency hard) — sem cross-region replica. `user_data` multi-tenant: residency router em Cloudflare Worker (tenant `BR` → `sa-east-1` Postgres, `EU` → `eu-west-1`, `US` → `us-east-1`). `events_log` (audit) em DynamoDB Global Tables com strong consistency regional opt-in. Failover region manual via runbook 04-04 §2.30.

**Anti-patterns 2026.**
1. Multi-region "for redundancy" sem RTO/RPO definido — paga 2-3× infra cost sem ter testado promote (cruza com 04-04 §2.30).
2. Writing to read replica (app code aponta pra reader endpoint pensando ser primary) — silent data loss até alguém perceber.
3. **LWW em domain com semantic conflicts** — counter, inventory, balance: LWW destrói writes concorrentes. Use CRDT (G-Counter, OR-Set) ou single-leader.
4. **Tenant data crossing residency boundary** — usuário EU acaba em `us-east-1` por bug no router → GDPR violation → multa €€€.
5. **Aurora Global write to non-primary region** — desenvolvedor não sabia, app escreve em `sa-east-1` reader → erro `cannot execute INSERT in a read-only transaction` em produção.
6. **Anycast pra stateful TCP** (WebSocket, gRPC long-lived) — BGP convergence quebra session no meio.
7. **Spanner pra OLTP simples regional** — paga 5-10× vs Postgres regional sem precisar de external consistency global.
8. **Auto-failover cross-region habilitado** — split-brain em network partition, dois primários escrevendo, conflito irrecuperável.
9. **GeoIP confiável em 100%** — VPN corporate de funcionário EU em viagem aos US é roteado pra `us-east-1` violando residency. Sempre validar residency no app layer também.
10. **DynamoDB Global Tables sem strong consistency opt-in** em domain crítico — assume eventual mas código lê imediatamente após write esperando ver — race condition cross-region 100-500ms.

Cruza com **04-09 §2.8** (geo-distribution intro), **§2.17** (eventual consistency em scale), **§2.21** (sharding strategies — residency é sharding por region), **04-01 §2.5** (CAP — multi-region é o teatro do CAP), **§2.6** (PACELC — latency cross-region é o L), **§2.7** (consistency models cross-region), **§2.10** (quorum cross-region), **§2.18** (CRDT formal), **§2.21** (logical clocks pra LWW), **04-04 §2.30** (DR multi-region runbook), **03-05 §2.x** (AWS managed multi-region — Aurora Global, DynamoDB Global, Global Accelerator), **02-09 §2.13** (Postgres logical replication base), **04-13 §2.x** (CDC cross-region pipelines + lakehouse residency).

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
