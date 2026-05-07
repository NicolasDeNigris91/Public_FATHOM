---
module: 02-11
title: Redis, Data Structures, Persistence, Pub/Sub, Streams
stage: plataforma
prereqs: [02-07]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 02-11, Redis

## 1. Problema de Engenharia

Redis é mais usado errado do que entendido. A maioria dos devs trata como "cache key-value rápido" e ignora 80% do que ele oferece: estruturas complexas, scripts atômicos, streams, pub/sub, locks distribuídos, geo, HyperLogLog. Tratado superficialmente, vira ferramenta de cache só. Tratado bem, é a peça mais versátil de um stack distribuído, rate limit, leaderboards, queues, locks, session store, real-time fan-out, deduplicação, idempotency keys.

Este módulo é Redis fundo: modelo single-thread, comandos por estrutura, persistence (RDB/AOF), replication, cluster, scripting, e os padrões reais (cache-aside, locks, streams como queue, pub/sub limites). Você sai sabendo escolher Redis vs banco, e explorar o que ele realmente faz.

---

## 2. Teoria Hard

### 2.1 Modelo de execução: single-thread + I/O multiplexing

Redis (pre-6) é **single-threaded** pra comandos. Um core, um thread, sem locks de concorrência. Comandos são atômicos individualmente: você nunca lê estado parcial.

Redis 6+ trouxe **I/O threading**: I/O (read/write socket) pode usar múltiplas threads pra parsing/serialização. Mas a execução do comando ainda é single-threaded. Beneficia setups com clientes muitos.

Implicação: comandos lentos (ex: `KEYS *` em DB com milhões de chaves, scripts Lua pesados) **bloqueiam tudo**. Latência cresce. **`KEYS` é proibido em prod; use `SCAN`.**

### 2.2 Estruturas de dados

Não é só K/V. Cada chave tem um tipo:

- **String**: bytes. Pode ser número (atomically incrementable). Até 512 MB, mas keep small.
- **List**: linked list. Push/pop em ambas pontas. Boa pra fila simples (LPUSH + BRPOP).
- **Hash**: campo→valor dentro de chave. Boa pra "objeto" simples sem serializar JSON inteiro.
- **Set**: conjunto não ordenado, sem duplicatas. Operações de set (UNION, INTER, DIFF).
- **Sorted Set (ZSet)**: set ordenado por score. Range queries por score, top-N. Backed por skip list + hash table.
- **Stream**: log append-only com consumer groups. Pra event log.
- **Bitmap**: string interpretada como bits. Bit-level ops.
- **HyperLogLog**: cardinality estimation com erro ~0.81%. Conta unique values em ~12 KB para milhões.
- **Geo**: pontos georeferenciados. Internamente sorted set com geohash.
- **Bloom Filter, Cuckoo Filter** (RedisBloom / Redis Stack module), probabilísticos.
- **Time Series** (RedisTimeSeries module).
- **JSON** (RedisJSON), JSON nativo.

Cada estrutura tem comandos específicos. `SET`, `GET` são string. `HGET`, `HSET` hash. `ZADD`, `ZRANGEBYSCORE` zset. Etc.

### 2.3 TTL e expiration

Toda chave aceita `EXPIRE`/`PEXPIRE`. Sem TTL, vive pra sempre.

Redis combina:
- **Lazy expiration**: ao acessar key expirada, deleta.
- **Active expiration**: amostragem periódica (default 10x/s) deleta keys expiradas.

Implicação: chaves expiradas que nunca são tocadas ainda ocupam memória até a amostragem pegar. Em general, ok.

### 2.4 Eviction policies (memória cheia)

Quando atinge `maxmemory`:
- `noeviction` (default em algumas configs): erro em writes.
- `allkeys-lru` / `allkeys-lfu`: evicta LRU/LFU em qualquer chave.
- `volatile-lru` / `volatile-lfu`: só em chaves com TTL.
- `allkeys-random` / `volatile-random`.
- `volatile-ttl`: evicta com menor TTL primeiro.

Pra cache: `allkeys-lru` ou `allkeys-lfu`. Pra store de session com TTL: `volatile-lru`. Pra dados sem evict (filas, store crítico): `noeviction` + monitoramento de memória.

### 2.5 Persistence: RDB e AOF

Redis é in-memory mas pode persistir:

- **RDB (snapshot)**: dump binário em `dump.rdb` periódico (configurável, ex: `save 60 10000` = a cada 60s se 10k keys mudaram). Forks processo, parent continua servindo. Snapshot cria gap de RPO.
- **AOF (Append-Only File)**: log de comandos. `appendfsync everysec` (default) flush 1x/s; `always` cada commit (lento mas durable); `no` (deixa OS).
- **Both** (default em config moderna): RDB + AOF. AOF reescrito periodicamente (compactação).
- **No persistence**: tudo só em RAM; se cair, perde.

RPO (recovery point objective): com `appendfsync everysec`, ~1s. Com `always`, perto de 0 mas latência maior.

### 2.6 Replication e cluster

**Replication clássica**: 1 primary + N replicas. Replicas pegam stream do primary (RDB inicial + comandos subsequentes). Replicas read-only por default.

Failover manual ou via **Redis Sentinel**: monitora primary, promove replica em falha.

**Redis Cluster**: sharding nativo. 16384 slots distribuídos por shards. Cliente direciona key → slot → shard. Suporta múltiplos primaries com replicas cada.

- Operações multi-key precisam estar no mesmo slot. **Hash tag** (`{tenant}user:1`, `{tenant}user:2`) força mesmo slot.
- Resharding move slots online (com pequena interrupção).
- Cliente cluster-aware redireciona em `MOVED` responses.

### 2.7 Pipelining e transactions

**Pipelining**: cliente manda N comandos sem esperar response de cada um, depois lê todos. Reduz round-trips. Comum em libs.

**Transactions** via `MULTI`/`EXEC`: enfileira comandos, executa atomicamente. **Sem rollback** se um falhar, Redis entende como erro de cliente. Outros comandos no MULTI ainda rodam.

**Optimistic locking** via `WATCH`: marca chaves; se mudarem antes de `EXEC`, txn aborta. Padrão "check-and-set".

### 2.8 Scripts Lua e Functions

Lua scripts executam **atomically** server-side via `EVAL`:

```lua
-- decrement only if positive
if tonumber(redis.call('GET', KEYS[1])) > 0 then
  return redis.call('DECR', KEYS[1])
else
  return -1
end
```

Garante atomicity em operações multi-comando sem necessitar `WATCH`. Cuidado: scripts longos bloqueiam server.

Redis 7+ trouxe **Functions**: scripts persistidos como objetos nomeados, replicados, parte do dataset. Substituem `SCRIPT LOAD` ad-hoc.

### 2.9 Pub/Sub

`SUBSCRIBE channel` / `PUBLISH channel message`. Fan-out broadcast. **Não persiste**: subscriber offline perde messages. Sem ack, sem retry, sem replay.

Use cases válidos: sinalização efêmera (cache invalidation pra frota de servers), real-time UI updates onde perda é ok.

Em vez de pub/sub pra "queue", use **Streams**.

### 2.10 Streams

`XADD stream id fields...` adiciona entry. `XREAD`, `XREADGROUP` lêem. **Consumer Groups** dão semantics tipo Kafka:

- Cada entry tem id (`<ms>-<seq>`).
- Multiple consumers num grupo dividem entries.
- `XACK` marca como processada.
- `XPEL` lista pending (não acked).
- `XCLAIM` reatribui pending de consumer morto.

Use cases: queue durável, event log, fan-out controlado. Stream é tendência: substitui muitos casos antigos de pub/sub e de Lists como queue.

Limite vs Kafka: Redis Streams cabem no dataset (RAM). Pra eventos ilimitados, Kafka. Pra eventos de janela curta, Streams é mais simples.

### 2.11 Padrões: cache-aside

```
get(key)
  ↓
Redis.get(key) hit? → retorna
  ↓ miss
db.get(key)
  ↓
Redis.set(key, value, ttl)
  ↓
retorna
```

Issues:
- **Stale data** quando DB muda: invalidate explicit (delete key) ou TTL curta.
- **Thundering herd** quando key popular expira: muitos clientes batem DB simultaneamente. Mitigação: lock ("only one fetches"), background refresh, jittered TTL.
- **Cache penetration**: keys que sempre miss (atacante varre random ids). Cache miss negativo (`NULL`) com TTL curta protege.
- **Cache stampede**: rebuild simultâneo. Probabilistic early expiration (renew antes de TTL bater).

#### Stampede protection em código

Em produção, hot key expirando dispara N requests batendo DB simultaneamente. Em SaaS médio (10k req/s) com cache miss síncrono, cada miss vira ~50ms × 10k = stress catastrófico no DB. Padrões em ordem de complexidade:

**1. Singleflight (request coalescing in-process)**

Mais simples e barato; resolve stampede dentro de uma instância. Múltiplas chamadas concurrentes pra mesma key compartilham 1 fetch:

```typescript
class Singleflight<T> {
  private inflight = new Map<string, Promise<T>>();

  async do(key: string, fetcher: () => Promise<T>): Promise<T> {
    const existing = this.inflight.get(key);
    if (existing) return existing;             // junta na request em curso

    const p = fetcher().finally(() => this.inflight.delete(key));
    this.inflight.set(key, p);
    return p;
  }
}

const flight = new Singleflight<Order>();

async function getOrder(id: string): Promise<Order> {
  const cached = await redis.get(`order:${id}`);
  if (cached) return JSON.parse(cached);

  return flight.do(`order:${id}`, async () => {
    const order = await db.queryOne(`SELECT * FROM orders WHERE id=$1`, [id]);
    await redis.setEx(`order:${id}`, 60, JSON.stringify(order));
    return order;
  });
}
```

Limita a **1 fetch por instância**. N instâncias em load balancer = N fetches simultâneos no pior caso. Para serviços com 10-50 instâncias e DB resiliente, isso já basta.

**2. Distributed lock (singleflight cross-instance)**

Para alta cardinalidade de instâncias ou DB sensível, lock no Redis:

```typescript
async function getOrderWithLock(id: string): Promise<Order> {
  const cacheKey = `order:${id}`;
  const lockKey = `lock:${cacheKey}`;

  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Tenta pegar lock — TTL evita deadlock se holder crashar
  const lockToken = randomUUID();
  const acquired = await redis.set(lockKey, lockToken, { NX: true, PX: 5_000 });

  if (!acquired) {
    // Outro está fetchando; espera + retry com backoff
    await sleep(50 + Math.random() * 100);
    return getOrderWithLock(id);             // recursão limitada via timeout externo
  }

  try {
    // Double-check: outro pode ter populado entre nosso get e lock
    const recheck = await redis.get(cacheKey);
    if (recheck) return JSON.parse(recheck);

    const order = await db.queryOne(`SELECT * FROM orders WHERE id=$1`, [id]);
    await redis.setEx(cacheKey, 60, JSON.stringify(order));
    return order;
  } finally {
    // Libera lock só se ainda é nosso (Lua script atomic — evita unlock de outro holder)
    await redis.eval(`
      if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('del', KEYS[1])
      else return 0 end
    `, { keys: [lockKey], arguments: [lockToken] });
  }
}
```

Cuidado: lock pode reter request por segundos se DB lento. Combine com **timeout no caller** e fallback (return stale value se cache tem versão velha disponível).

**3. Probabilistic early refresh (XFetch — Vattani et al, 2015)**

Em vez de esperar TTL bater, request renova **probabilisticamente** mais cedo conforme TTL se aproxima do fim. Spreading natural elimina spike de stampede.

```typescript
// Salva valor + delta (custo médio do fetch) + tempo de expiração absoluto
async function setProbabilistic(key: string, value: any, ttl: number, delta: number) {
  await redis.setEx(key, ttl, JSON.stringify({
    v: value,
    d: delta,                                  // segundos típicos do fetch
    expires_at: Date.now() / 1000 + ttl
  }));
}

async function getProbabilistic<T>(key: string, fetcher: () => Promise<{ v: T; d: number }>, ttl: number): Promise<T> {
  const raw = await redis.get(key);
  if (!raw) {
    const { v, d } = await fetcher();
    await setProbabilistic(key, v, ttl, d);
    return v;
  }

  const { v, d, expires_at } = JSON.parse(raw);
  const now = Date.now() / 1000;
  // Beta = 1 default; ajuste pra mais agressivo (refresh mais cedo) ou conservador
  const beta = 1.0;
  const xfetch = -d * beta * Math.log(Math.random());

  if (now - xfetch >= expires_at) {
    // Em background, refresh
    fetcher().then(({ v: nv, d: nd }) => setProbabilistic(key, nv, ttl, nd))
             .catch(err => log.warn('refresh failed', err));
  }
  return v;
}
```

Resultado: chave com TTL de 60s, fetch de ~100ms → renovação começa a acontecer ~5s antes; spread por aprox 5-10s; zero stampede.

**4. Stale-while-revalidate (Cloudflare-style)**

Variante do (3): TTL real estendido (`stale_ttl > fresh_ttl`); responde stale enquanto revalida em background.

```typescript
async function getSWR<T>(key: string, fetcher: () => Promise<T>, freshTtl = 60, staleTtl = 600): Promise<T> {
  const raw = await redis.get(key);
  if (raw) {
    const { v, fresh_until } = JSON.parse(raw);
    if (Date.now() / 1000 > fresh_until) {
      // Stale; revalida em background, retorna stale agora
      flight.do(key, async () => {
        const fresh = await fetcher();
        await redis.setEx(key, staleTtl, JSON.stringify({ v: fresh, fresh_until: Date.now()/1000 + freshTtl }));
        return fresh;
      });
    }
    return v;
  }
  const fresh = await fetcher();
  await redis.setEx(key, staleTtl, JSON.stringify({ v: fresh, fresh_until: Date.now()/1000 + freshTtl }));
  return fresh;
}
```

Pareo com singleflight (`flight.do`) evita stampede de revalidate; user nunca espera fetch.

#### Decisão pragmática

| Cenário | Pattern |
|---|---|
| 1-3 instâncias, hot key conhecido | Singleflight in-process |
| 10+ instâncias, DB sensível | Distributed lock + double-check |
| Hot keys de alta cardinalidade não previsíveis | XFetch probabilistic refresh |
| User-facing onde stale é OK por segundos | Stale-while-revalidate |

Anti-padrão: jittered TTL "resolve" stampede. Não resolve; só desloca. Usar com singleflight ou XFetch.

Cruza com **04-04 §2.5** (circuit breaker fecha quando cache+DB ambos falham) e **04-09 §2.7.1** (rate limit cobre cache penetration).

### 2.12 Distributed locks: SETNX, Redlock

Lock simples:
```
SET lock:foo <token> NX EX 10
```
NX = só se não existe; EX = TTL. Quem ganha tem o lock por 10s. Release: script Lua que checa token e DEL.

**Redlock**: algoritmo de Redis pra locks com múltiplos nós (redundância). Antonio "antirez" descreveu. Martin Kleppmann criticou famously: locks distribuídos sobre time-based têm fragilidades; pra correctness usar fencing tokens (cada lock retorna número monotônico, recurso protegido valida).

Em workloads tolerantes a failure raro (cron jobs, leader election leve), Redlock funciona. Em workloads que correctness é vital, considere ZooKeeper, etcd, ou banco com `SELECT FOR UPDATE`.

### 2.13 Rate limiting

Algoritmos:
- **Fixed window**: `INCR rate:user:1:202604281200`, `EXPIRE 60`. Limite por minuto. Simples mas tem burst no boundary.
- **Sliding window log**: ZSet com timestamps. Custoso em memória pra alta cardinalidade.
- **Sliding window counter**: aproximação combinando 2 buckets.
- **Token bucket** / **Leaky bucket**: implementáveis em Lua atômico.

Lib `redis-rate-limiter` ou implementação própria com Lua. Em microservices, este é o store comum.

### 2.14 Idempotency keys

API que aceita `Idempotency-Key` header pra evitar processamento duplicado:
1. `SET idem:<key> "processing" NX EX 600`.
2. Se `NX` falha, key já em uso, busca resultado anterior em outra chave ou retorna conflict.
3. Após processar, atualiza `SET idem:<key>:result <json>`.

Stripe, payment gateways, etc. usam.

### 2.15 Session store

Express/Fastify session adapters pra Redis. Token (cookie) → key Redis com session blob. TTL = expiration.

Vantagens: stateless app server (pode escalar horizontal), fácil revogar (DEL key).

### 2.16 Memory model e tunning

`INFO memory`:
- `used_memory` (bytes em uso lógico).
- `used_memory_rss` (bytes alocados pelo OS, pode incluir fragmentação).
- `mem_fragmentation_ratio` (rss/used).

Frag > 1.5 sugere fragmentação. `MEMORY DOCTOR` dá análise. Reset via restart ou `MEMORY PURGE` (libs jemalloc).

Reduzir uso:
- Hash em vez de N strings.
- TTL apropriado.
- Compactar valores grandes (gzip antes de SET).
- Considerar formato binário (msgpack, protobuf) se valores estruturados.

### 2.17 Operação

- **`MONITOR`**: vê todos comandos em real-time. **Custoso, não use em prod.**
- **`SLOWLOG`**: comandos > threshold. Critical em prod.
- **`LATENCY DOCTOR`**, **`LATENCY HISTORY`**: diagnostico latência.
- **`CLIENT LIST`**: clients conectados.
- **`CONFIG GET`/`SET`**: configurações.

Em managed Redis (Railway, Upstash, ElastiCache, Memorystore, Redis Cloud), parte de tunning fica no provider.

### 2.18 Alternativas

- **Valkey**: fork open-source de Redis após mudança de licença (2024). Mantido por Linux Foundation. Drop-in compat.
- **KeyDB**: Redis fork multi-thread completo.
- **DragonflyDB**: rewrite em C++ multi-thread, claim 25x throughput em alguns benchmarks.
- **Memcached**: cache puro K/V, sem estruturas. Multithread, simples.

Em 2026, Valkey ganhou tração após mudança da licença Redis. Compat 100% com clientes existentes.

### 2.19 Redis Streams + consumer groups production deep

§2.10 introduziu Streams. Aqui está o operacional pra rodar Streams como queue/event log durável em produção (Redis 7.x; `XAUTOCLAIM` requer 6.2+).

**Fundamentals revisitados.** Stream é log append-only. Cada entry tem id `<ms>-<seq>` (timestamp ms + sequence dentro do ms). Retention controlada por `MAXLEN ~ N` (approximate, O(1) amortized) ou `MINID ~ <id>` (drop entries antes do id). Persistência via RDB/AOF como qualquer key. Diferenças críticas:

- **Pub/Sub**: fire-and-forget, sem retention, subscriber offline perde tudo. Streams: durable, replay possível, consumer groups com PEL.
- **Kafka**: partitioning automático por topic, retention infinito, > 1M msg/s. Streams: 1 stream = 1 hash slot no Cluster (sem partitioning interno), retention bounded por RAM.

**Consumer groups.** `XGROUP CREATE courier:locations dispatchers $ MKSTREAM` cria grupo lendo do tail (`$`) ou desde o início (`0`). Cada consumer no grupo tem PEL (Pending Entries List): messages delivered mas not ACKed. `XACK` move entry pra fora do PEL. `XAUTOCLAIM` (Redis 6.2+) reassign entries cujo idle ultrapassa threshold.

```bash
XADD courier:locations MAXLEN '~' 1000000 '*' lat 12.34 lng 56.78 courier_id c-42 ts 1746489600
XGROUP CREATE courier:locations dispatchers '$' MKSTREAM
XREADGROUP GROUP dispatchers worker-1 COUNT 50 BLOCK 5000 STREAMS courier:locations '>'
XACK courier:locations dispatchers 1746489600123-0
XPENDING courier:locations dispatchers IDLE 60000 - + 100
XAUTOCLAIM courier:locations dispatchers worker-1 300000 0 COUNT 100
```

**Worker pattern (TypeScript + ioredis).** Loop principal com BLOCK, reclaim periódico, ACK só em sucesso, DLQ em permanent failure, graceful shutdown:

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);
const STREAM = 'courier:locations';
const GROUP = 'dispatchers';
const CONSUMER = process.env.CONSUMER_NAME!;        // estável: "worker-pod-abc" — não randomUUID a cada deploy
const DLQ = 'courier:locations:dlq';

let running = true;
process.on('SIGTERM', () => { running = false; });

async function processOne(id: string, fields: Record<string, string>) {
  // dispatch logic — match courier to nearest open job
  await dispatchCourierLocation(fields);
}

async function workerLoop() {
  await redis.xgroup('CREATE', STREAM, GROUP, '$', 'MKSTREAM').catch(() => {});

  while (running) {
    const res = await redis.xreadgroup(
      'GROUP', GROUP, CONSUMER, 'COUNT', 50, 'BLOCK', 5000,
      'STREAMS', STREAM, '>'
    ) as [string, [string, string[]][]][] | null;

    if (!res) continue;
    for (const [, entries] of res) {
      for (const [id, kv] of entries) {
        const fields = Object.fromEntries(
          kv.reduce<[string, string][]>((a, _, i, arr) => i % 2 === 0 ? [...a, [arr[i], arr[i+1]]] : a, [])
        );
        try {
          await processOne(id, fields);
          await redis.xack(STREAM, GROUP, id);
        } catch (err) {
          if (isPermanent(err)) {
            await redis.xadd(DLQ, '*', 'orig_id', id, 'err', String(err), ...kv);
            await redis.xack(STREAM, GROUP, id);          // remove do PEL; DLQ assume responsabilidade
          }
          // transient: deixa no PEL, XAUTOCLAIM pega depois
        }
      }
    }
  }
}

async function reclaimLoop() {
  while (running) {
    await redis.xautoclaim(STREAM, GROUP, CONSUMER, 300000, '0', 'COUNT', 100).catch(() => {});
    await new Promise(r => setTimeout(r, 60000));
  }
}

Promise.all([workerLoop(), reclaimLoop()]);
```

Heartbeat opcional: `SET worker:heartbeat:<consumer> 1 EX 30` no início de cada iteração; orchestrator faz `XPENDING` + check de heartbeat absent → consumer dead, force claim com nome diferente.

**Caso Logística — courier location ingest.** Producer: courier app POST `/courier/location` → `XADD courier:locations MAXLEN ~ 1000000 * lat ... lng ... courier_id ... ts ...`. MAXLEN ~ 1M cobre ~24h em ~10k couriers ativos a 1 ping/min. Dois consumer groups independentes:

- `dispatchers`: 3 workers consume em paralelo, Redis distribui round-robin entre consumers do mesmo group; cada location vai pra exatamente 1 worker que matcha contra jobs abertos.
- `analytics`: consume mesmo stream com offset próprio; pode replay desde o início pra recomputar heatmap; lag não afeta dispatch.

**Cluster + Streams (hash slots).** Stream key vai pra UM slot. Sem partitioning automático tipo Kafka. Pra escalar throughput, particione manualmente com hashtag:

```typescript
const shard = courierId.charCodeAt(0) % 4;
await redis.xadd(`courier:locations:{shard${shard}}`, 'MAXLEN', '~', 250000, '*', ...fields);
```

Hashtag `{shard0}` força slot determinístico. Consumer group por shard, worker dedicado por shard ou consumer cobrindo múltiplos shards via loop. Trade-off: simples mas particionamento é responsabilidade da app.

**Decision table — quando Streams vence.**

| Tool | Quando |
|---|---|
| Redis Streams | Stack Redis já existente, retention horas/dias, < 100k msg/s |
| Kafka / Redpanda | > 1M msg/s sustained, partitioning auto, retention infinito, exactly-once |
| NATS JetStream | Lighter Kafka alt, multi-tenant simples, edge |
| RabbitMQ Streams (3.11+) | Stack RabbitMQ existente, mix com classic queues |
| SQS FIFO | AWS-native, < 3k msg/s por group, zero ops |

**Anti-patterns.**

- Pub/Sub pra event sourcing crítico (subscriber offline = msg perdida).
- `XACK` antes de processar com sucesso (crash silencioso = perda).
- Sem `XAUTOCLAIM` cron (PEL cresce, órfãos nunca reprocessados).
- `MAXLEN 1000` exato em vez de `MAXLEN ~ 1000` (O(N) por XADD).
- Consumer name não estável (cada deploy = novo consumer = PEL órfão acumula).
- Mistura `XREAD` (sem grupo) com `XREADGROUP` no mesmo stream (offsets divergentes).
- Stream em Cluster sem hashtag (slot único, sem escalabilidade horizontal).
- Sem DLQ pra permanent failures (handler que sempre falha = retry loop infinito).

**Cruza com:** `02-07` (worker_threads pra heavy processing após XREADGROUP), `04-01` (logical clocks; id `<ms>-<seq>` é wall-clock + seq, não Lamport), `04-02` (messaging; Streams é forma de inbox durável), `04-13` (streaming/batch; Streams ideal pra microbatch), `03-07` (observability; métricas obrigatórias: PEL size por group, consumer lag, ack latency p99, XAUTOCLAIM count).

---

### 2.20 Lua scripting advanced + Redis Functions 7+ + atomic compound operations

§2.12 cobriu Redlock; §2.13 rate limit básico; §2.14 idempotency. Aqui o substrato comum: scripts atomic server-side. Redis 7+ (Functions stable); Valkey 8+ (Redis fork, mesma API).

**Por que Lua dentro do Redis.** Redis é single-threaded; script Lua roda em contexto único, sem interleave de outros comandos. Ganhos:

- **Atomicity**: read-then-write sem race; substitui `WATCH/MULTI/EXEC` (que aborta em conflito) por execução serializada garantida.
- **Latência**: 1 round-trip vs N (50μs RTT × N comandos vira 50μs + tempo de execução server-side).
- **Use cases**: distributed locks, rate limiters (token bucket, sliding window), atomic counters com cap, idempotency com response cache, compound state moves (zone reassignment, inventory transfer).

**EVAL vs EVALSHA.** `EVAL script numkeys key1... arg1...` envia o script inteiro a cada call (bandwidth waste em hot path). `EVALSHA sha1 numkeys...` envia só o hash; Redis lookup do script pré-cacheado. Pattern: `SCRIPT LOAD` no boot retorna SHA1; chame EVALSHA; se `NOSCRIPT` (cache evicted, restart, replica novo), faz fallback EVAL e re-cache. `ioredis` e `redis-py` abstraem via `defineCommand` / `register_script` — chame `redis.rateLimit(keys, args)` direto.

**Atomic counter com cap (rate limit fixed window).**

```lua
-- KEYS[1] = "rl:user:123:60s"
-- ARGV[1] = limit (100)
-- ARGV[2] = TTL seconds (60)
-- Returns: { allowed (1|0), current, ttl }
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[2])
end
if current > tonumber(ARGV[1]) then
  return { 0, current, redis.call('TTL', KEYS[1]) }
end
return { 1, current, redis.call('TTL', KEYS[1]) }
```

```typescript
redis.defineCommand('rateLimit', { numberOfKeys: 1, lua: RATE_LIMIT_SCRIPT });
const [allowed, current, ttl] = await redis.rateLimit(`rl:user:${userId}:60s`, 100, 60) as [number, number, number];
if (!allowed) throw new TooManyRequests(ttl);
```

**Sliding window (mais preciso que fixed; sem boundary burst).**

```lua
-- KEYS[1] = sorted set; ARGV[1] = now ms; ARGV[2] = window ms; ARGV[3] = max; ARGV[4] = unique req id
local now = tonumber(ARGV[1])
local clear_before = now - tonumber(ARGV[2])
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', clear_before)
local count = redis.call('ZCARD', KEYS[1])
if count >= tonumber(ARGV[3]) then
  return { 0, count }
end
redis.call('ZADD', KEYS[1], now, ARGV[4])
redis.call('EXPIRE', KEYS[1], math.ceil(tonumber(ARGV[2]) / 1000))
return { 1, count + 1 }
```

**Distributed lock (acquire + release token-aware).** Single-instance abaixo; Redlock multi-instance em §2.12.

```lua
-- acquire — KEYS[1] = lock key; ARGV[1] = token (UUID); ARGV[2] = TTL ms
if redis.call('GET', KEYS[1]) == false then
  redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[2])
  return 1
end
return 0
```

```lua
-- release — só deleta se token bate (previne release acidental de lock de outro owner)
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
```

**Idempotency key com response cache.** Hash de `idempotency-key` header + body; primeira request grava response, retries retornam mesma response sem re-executar handler.

```lua
-- KEYS[1] = idempotency key; ARGV[1] = response payload; ARGV[2] = TTL seconds
local existing = redis.call('GET', KEYS[1])
if existing then return existing end
redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
return 'NEW'
```

**Compound atomic — multi-step state transition.** Mover courier entre zonas, garantindo que sai de uma e entra na outra sem janela onde está em ambas ou nenhuma:

```lua
-- KEYS[1] = zone:from set; KEYS[2] = zone:to set; ARGV[1] = courier_id
if redis.call('SISMEMBER', KEYS[1], ARGV[1]) == 1 then
  redis.call('SREM', KEYS[1], ARGV[1])
  redis.call('SADD', KEYS[2], ARGV[1])
  return 1
end
return 0
```

**Redis Functions 7+ (substitui scripts persistidos via SCRIPT LOAD).** Script via `SCRIPT LOAD` é volátil — Redis restart limpa o cache, todo client precisa re-load. Functions são uma library nomeada, persistida em RDB/AOF, replicada para replicas, sobrevive restart. `FUNCTION LOAD` registra; `FCALL <name> numkeys keys args` invoca. Redis 7 usa Lua sob o capô; futuro pode adicionar JS.

```lua
#!lua name=logistica

redis.register_function('rate_limit', function(keys, args)
  local current = redis.call('INCR', keys[1])
  if current == 1 then
    redis.call('EXPIRE', keys[1], args[2])
  end
  if current > tonumber(args[1]) then
    return { 0, current }
  end
  return { 1, current }
end)

redis.register_function('idempotency_check', function(keys, args)
  local existing = redis.call('GET', keys[1])
  if existing then return existing end
  redis.call('SET', keys[1], args[1], 'EX', args[2])
  return 'NEW'
end)
```

```bash
redis-cli -x FUNCTION LOAD REPLACE < logistica.lua
redis-cli FCALL rate_limit 1 "rl:user:123" 100 60
redis-cli FUNCTION LIST
redis-cli FUNCTION DUMP > logistica.rdb     # backup binário
```

**Pegadinhas críticas.**

- `SCRIPT KILL` só mata script read-only; script que já escreveu não pode ser killado (Redis bloqueia até terminar ou crash + AOF replay). Limite execução; nunca loop ilimitado.
- Redis single-threaded: script de 100ms bloqueia *todos* os clients por 100ms. Mantenha < 1ms; benchmark com `DEBUG SLEEP` em staging.
- `redis.call` aborta script em erro; `redis.pcall` retorna error como valor, permitindo handle. Use `pcall` quando há fallback path.
- Sem `RANDOMKEY`, `os.time()`, `math.random` sem seed: scripts devem ser determinísticos pra replication consistente. Passe entropy via ARGV (timestamp, UUID gerado no client).
- Cluster mode: todas as KEYS devem hashar pro mesmo slot. Use hash tag `{tenant}:foo` e `{tenant}:bar` pra forçar co-location; senão `CROSSSLOT` error.

**Stack Logística aplicada.**

- **Rate limit**: sliding window por `(ip + user_id)` via Function `rate_limit`; ~5μs/call em Redis modesto.
- **Idempotency**: todo POST `/orders` chama Function `idempotency_check` antes do handler; TTL 24h.
- **Distributed lock**: schedule recalculation (CPU-heavy, 1 worker basta) usa lock script com token UUID + TTL 30s; release token-aware previne race se lock expirou mid-job.
- **Zone reassignment**: courier muda zona via compound script; nunca em ambas, nunca em nenhuma.
- **Library deploy**: `logistica.lua` em CI; `FUNCTION LOAD REPLACE` no boot do primeiro pod; replicas auto-receive.
- **Custo real**: ~10k FCALL/sec sustentado em Redis Railway $50/mo.

**Anti-patterns.**

- EVAL em hot path em vez de EVALSHA (10× bandwidth + ~50μs RTT por call extra).
- Script com loop 1000× SADD bloqueia event loop; quebra em microbatch app-side.
- Persistir lógica via `SCRIPT LOAD` em todos os clients no boot — Redis restart perde cache, race em cold start; use Functions.
- Tentar HTTP/IO de dentro do Lua (impossível; redesign para emit event + worker externo).
- KEYS em slots diferentes em Cluster sem hashtag → `CROSSSLOT`.
- `os.time()` ou random sem seed → replica diverge do master.
- `redis.call` em path com erro recuperável → script aborta, side effects parciais.
- Idempotency key sem TTL → memory leak permanente.
- Script com 200+ linhas → bug magnet; orquestre multi-step app-side, mantenha cada script < 30 linhas.
- Scripts sem versionamento → deploy novo client com script v2 enquanto Redis ainda tem v1 cached → divergência silenciosa. Versione no nome (`rate_limit_v2`) ou no SHA.

**Cruza com:** `02-11` §2.12 (Redlock multi-instance; script acquire/release acima é bloco base), `02-11` §2.13 (rate limit basics; aqui está o atomic backbone), `02-11` §2.14 (idempotency keys; Function `idempotency_check`), `04-04` (resilience; atomic ops como building block de circuit breaker state), `04-09` (scaling; Redis Functions como global state replicado).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Listar 6 estruturas de dados além de String e dar caso pra cada.
- Explicar por que `KEYS *` é tóxico em prod e o que fazer em vez.
- Diferenciar RDB e AOF, com RPO esperado de cada.
- Explicar pub/sub vs streams, e quando cada vence.
- Implementar lock simples com SET NX EX e release seguro com Lua.
- Citar críticas ao Redlock e quando usar fencing tokens em vez.
- Explicar cache-aside + 3 padologias (stale, stampede, penetration) e mitigação de cada.
- Distinguir cluster sharding e replication.
- Explicar `WATCH`/`MULTI`/`EXEC` como optimistic locking.
- Diferença entre eviction policies e qual escolher pra cache vs session.

---

## 4. Desafio de Engenharia

Adicionar **Redis ao Logística API** com 4 padrões reais.

### Especificação

1. **Stack**:
   - Continuação do projeto (Fastify + Drizzle + Postgres do 02-08-02-10).
   - Adicionar Redis 7 ou Valkey, local (Docker) ou Railway plug-in.
   - Lib: `ioredis` ou `node-redis`.
2. **Padrão 1, Cache-aside em queries pesadas**:
   - Endpoint `GET /reports/dashboard` agrega pedidos por status (count + sum total).
   - Resultado cached por 60s. Invalida quando `POST /orders/:id/events` muda status.
   - Demonstre stampede protection: simule 1000 requests simultâneos após expiration; verifique que apenas 1 vai ao DB.
3. **Padrão 2, Rate limit distribuído**:
   - Substitua o rate limit in-memory do 02-08 por Redis-based (sliding window com Lua atômico).
   - 100 req/min por (IP + tenant).
   - 2 instâncias do app rodando dividem o limite (não 100 cada).
4. **Padrão 3, Idempotency keys**:
   - `POST /orders` aceita header `Idempotency-Key`.
   - Mesma key reusada em 10 min retorna response anterior.
   - TTL do registro: 24h.
5. **Padrão 4, Real-time courier location via Streams**:
   - Endpoint `POST /courier/location` recebe `{lat, lng, timestamp}` do entregador.
   - Adiciona em stream `courier:<id>:locations`.
   - Endpoint `GET /courier/:id/locations?since=<id>` lê do stream.
   - Stream limitado a 1000 entries (`XADD ... MAXLEN ~ 1000`).
6. **Bonus, Distributed lock**:
   - Job que recalcula índices de roteamento (CPU-bound) deve rodar em apenas 1 worker mesmo com cluster.
   - Lock SETNX com fencing token.
7. **Observability**:
   - Métrica `cache_hits_total`, `cache_misses_total` no `/metrics`.
   - Slowlog do Redis monitorado, anote 1 caso interessante.

### Restrições

- Sem persistir dados primários no Redis (DB é Postgres). Redis é cache/lock/queue/stream.
- Sem `KEYS *` em código.
- Pub/sub não vale aqui, use Streams.

### Threshold

- README documenta:
  - Diagrama de cada um dos 4 padrões.
  - Decisão de TTL pra cada cache (com base em frequência de mudança).
  - Demonstração de stampede protection (load test antes/depois).
  - Análise de uso de memória do Redis após simulação (`INFO memory`).
  - Comparação Redis Streams vs uma fila simples (List + LPUSH/BRPOP).

### Stretch

- Cluster Redis (3 primaries + 3 replicas via `redis-cli --cluster create`) e adapt o cliente.
- Implementar leaderboard de couriers (top entregadores do mês) com ZSet.
- Geo: indexar locations num GEO key, query "couriers em raio de 5km".
- Migration de Redis pra Valkey: mostre que cliente continua funcionando.

---

## 5. Extensões e Conexões

- Liga com **01-02** (OS): Redis é processo single-thread. Forks pra RDB. Memory-bound.
- Liga com **02-07** (Node): pool de conexões `ioredis`, evt loop não bloqueia em Redis (todas comandos via socket).
- Liga com **02-08** (frameworks): rate limit, session store, idempotency middleware.
- Liga com **02-09** (Postgres): cache-aside on top of Postgres queries.
- Liga com **02-14** (real-time): Redis pub/sub clássico pra fan-out de WebSockets.
- Liga com **03-05** (AWS): ElastiCache Redis/Valkey, Memorystore (GCP).
- Liga com **03-07** (observability): metrics de cache, slowlog.
- Liga com **04-01/04-02** (distribuídos, messaging): Streams como light queue.
- Liga com **04-04** (resilience): cache stampede, circuit breaker em torno de Redis dependency.

---

## 6. Referências

- **Redis docs** ([redis.io/docs](https://redis.io/docs/)), leia data types, persistence, replication, cluster.
- **"Redis in Action"**: Josiah Carlson.
- **Salvatore Sanfilippo (antirez)**, blog antigo, explicações originais.
- **Martin Kleppmann, "How to do distributed locking"** ([martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)).
- **DDIA**: capítulo 11 (stream processing) cruza com Streams.
- **Valkey docs** ([valkey.io](https://valkey.io/)).
- **Redis University** (free courses), útil pra Streams, Cluster.
- **DragonflyDB blog posts** comparando arquitetura.
