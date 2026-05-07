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

### 2.20 Redis 8 + Valkey + Dragonfly 2026 — landscape pós-fork (BSL/SSPL → Valkey Apache 2.0)

Março 2024 foi inflection point: Redis Inc trocou Apache 2.0 por dual BSL (Business Source License) + SSPL (Server Side Public License) — fim de Redis OSS como projeto Apache. Resposta veio em dias: Linux Foundation hospedou **Valkey** como fork de Redis 7.2.4 (último release Apache), com governance via TSC e backing AWS + Google + Oracle + Ericsson + Snap. Q4 2024: Valkey 8.0 GA, AWS ElastiCache for Valkey lançou (cheaper que ElastiCache for Redis OSS — preço pivot estratégico), Redis Inc respondeu com **Redis 8.0** consolidando Redis Stack inteiro no core (JSON + Search + TimeSeries + Bloom + Vector built-in, sem módulo separado). **Dragonfly** (lançado 2022, multi-threaded shared-nothing) ganhou tração como alternativa vertical scale. **KeyDB** (Snap-led, multi-threaded) foi sunset Q4 2024 — último release maintenance only, time migrou pra Valkey contributors. **Memcached 1.6.x** segue relevante pra cache puro sem persistence/structures. Landscape 2026: fragmentado mas clarificado por caso de uso.

**License timeline (March 2024 → 2026):**
- Pré-março/2024: Redis OSS Apache 2.0 (BSD-3-Clause em algumas distros), módulos Stack em RSAL/SSPL
- 21/março/2024: Redis Inc anuncia Redis 7.4+ sob dual BSL 1.1 + SSPL v1 (BSL converte pra mudança time-bounded; SSPL bloqueia hosting comercial sem open-source do stack inteiro)
- 28/março/2024: Linux Foundation anuncia Valkey fork de Redis 7.2.4 (Apache 2.0)
- Q4 2024: Valkey 8.0 GA + AWS ElastiCache for Valkey GA (~33% cheaper que Redis variant)
- Q1 2025: Redis Inc oferece AGPL como terceira opção (dual → triple license; AGPL ainda copyleft mas não SSPL-strong)
- Q2 2025: Valkey 8.1 (improved cluster scaling, perf wins multi-threaded I/O)
- Q3 2024 (paralelo): Redis 8.0 — Redis Stack consolidado no core, vector sets nativos, RESP3 default
- 2026: managed providers majoritariamente em Valkey (AWS, Google Memorystore for Valkey GA Q1 2025, Oracle); Redis Cloud foca em LangCache + vector + enterprise modules

**Impacto em managed vendors:** AWS ElastiCache pivotou Valkey como default pra novos clusters Q4 2024 (Redis OSS engine ainda disponível mas sem upgrades além de 7.2). Google Memorystore for Valkey GA Q1 2025. Azure Cache ainda mantém Redis OSS via licenciamento enterprise com Redis Inc. Self-hosted greenfield 2026 → Valkey é default racional.

**Valkey 8 — drop-in Redis OSS replacement (Apache 2.0):**
```yaml
# docker-compose.yml — Valkey 8 cluster mínimo (substitui Redis 7.2 sem mudança de cliente)
services:
  valkey-1:
    image: valkey/valkey:8.1-alpine
    command: >
      valkey-server
      --cluster-enabled yes
      --cluster-config-file nodes.conf
      --cluster-node-timeout 5000
      --appendonly yes
      --io-threads 4              # Valkey 8 IO threads scale linear até 8 cores
      --io-threads-do-reads yes
      --port 7000
    ports: ["7000:7000", "17000:17000"]
    volumes: [valkey1:/data]
  # ... valkey-2 .. valkey-6 análogos (3 master + 3 replica)
volumes: { valkey1: {} }
```
Cliente Node (`ioredis` 5.x funciona idêntico — Valkey mantém RESP2/RESP3 wire compat 100% com Redis 7.2):
```ts
import Redis from 'ioredis';
const valkey = new Redis.Cluster([
  { host: 'valkey-1', port: 7000 }, { host: 'valkey-2', port: 7001 }
], { redisOptions: { enableAutoPipelining: true } });
await valkey.set('order:9981', JSON.stringify({ status: 'PAID' }), 'EX', 3600);
```

**Valkey 8 wins concretos vs Redis 7.2:**
- IO threads matured: `~400k ops/sec` single instance com 8 IO threads (vs ~100k single-threaded Redis 7.2)
- Cluster scaling primitives: melhor handling de slot migration sob carga
- Memory efficiency: dict resize incremental, ~10% redução RSS em workloads write-heavy
- ARM64 (Graviton/Ampere) tuned: ~20% cheaper TCO em ElastiCache Graviton vs x86

**Redis 8.0 — strategy "Stack no core" + LangCache:**
```bash
# Redis 8 — vector sets nativos (não precisa mais módulo RediSearch separado)
redis-cli
> VSET embeddings:product item:9981 "0.12,0.34,0.56,..."  # 768-dim
> VSIM embeddings:product "0.11,0.33,0.55,..." LIMIT 5
1) "item:9981" "0.998"
2) "item:8842" "0.991"
# ...
```
LangCache é layer managed em Redis Cloud — semantic cache pra LLM responses, hash de prompt embedding como key, TTL + invalidação por prompt-template version. Não é Apache, não tem self-hosted equivalent direto (use Redis 8 + RediSearch DIY pra alternativa OSS-like, mas módulos Stack agora são BSL).

**Trap de licença:** se o time considera Redis 8 pra greenfield, *check legal antes*. Redis Stack consolidado significa: usar JSON.SET, FT.SEARCH, TS.ADD, BF.ADD, VSET — tudo cai sob BSL/SSPL Redis Inc. Pra equivalente Apache hoje: Valkey core + módulos comunitários separados (alguns ainda em maturação) ou stacks distintos (Postgres + pgvector + Postgres TimescaleDB).

**Dragonfly — multi-threaded shared-nothing (Apache 2.0):**
```yaml
services:
  dragonfly:
    image: docker.dragonflydb.io/dragonflydb/dragonfly:v1.27
    command: >
      dragonfly
      --proactor_threads=24       # 1 thread por core físico; shared-nothing, sem locks globais
      --maxmemory=80gb
      --cache_mode=true            # cache eviction style
      --snapshot_cron="0 */6 * * *"
    ulimits: { memlock: -1 }
    network_mode: host             # io_uring kernel bypass; -1ms latency vs bridge
```
Architecture: Seastar-style framework, cada thread possui seu shard de keyspace, comunicação via lock-free queues. Single instance escala vertical até ~100 cores → `~3M ops/sec` em 25 cores. Wire-compat RESP2/RESP3, Memcached binary protocol também. RocksDB-backed pra eviction overflow opcional.

**Dragonfly gaps (importante):**
- Cluster spec: parcial. CLUSTER SLOTS retorna single-node em modo standalone; modo cluster real (`--cluster_mode=emulated`) emula com 1 nó, ou `--cluster_mode=yes` requer Dragonfly Cloud pra orquestração multi-nó (gap vs Redis Cluster spec completo)
- Lua/Functions: Lua suportado parcialmente, Functions (FUNCTION LOAD) limitado
- Streams: suportado mas consumer groups têm edge cases (testar XCLAIM/XAUTOCLAIM em load antes de migrar prod)
- Modules: Não suporta módulos Redis (sem RediSearch, sem RedisJSON via load module)

Dragonfly venceu single-instance vertical scale (cache fat, analytics in-memory ~50-200GB), perdeu em Cluster horizontal e module ecosystem. Decisão: cache-as-a-database vertical → Dragonfly. Cache distribuído com cluster real → Valkey/Redis 8.

**Decision matrix 2026:**

| Caso de uso | Escolha 2026 | Por quê |
|---|---|---|
| Cache puro KV, sem persistence | Memcached 1.6.x | Simplicidade, multi-threaded nativo, pequeno footprint |
| OSS Redis-compat, cluster, greenfield | **Valkey 8.1** | Apache 2.0, ElastiCache for Valkey ~33% cheaper, drop-in 7.2 compat |
| Vector cache + LLM semantic cache | Redis 8 Cloud + LangCache | Vector sets nativos + LangCache managed (license BSL ok pra hosted) |
| Vertical scale single-instance > 50GB | Dragonfly 1.x | Multi-threaded shared-nothing, ~3M ops/sec, sem Cluster ops overhead |
| Migrating off Redis 7.2 OSS | **Valkey 7.2 → 8.x** | Drop-in zero code change, ElastiCache pivot path |
| Greenfield com Stack (JSON+Search+TS) | Redis 8 (com legal review BSL) | OU Postgres + pgvector + Timescale (Apache stack) |
| KeyDB existente em prod | Migrate → Valkey | KeyDB sunset Q4 2024, sem patches futuros |

**Migration paths concretos:**

```bash
# Redis OSS 7.2 → Valkey 8 (drop-in, zero code change)
# 1. Stop Redis, swap binary, start Valkey
docker stop redis-prod
docker run -d --name valkey-prod \
  -v $(pwd)/data:/data \
  valkey/valkey:8.1-alpine \
  valkey-server --appendonly yes --io-threads 4
# RDB/AOF formato compat 100% até 7.2; Valkey 8 lê RDB de Redis 7.2 transparente

# Redis 7.x → Redis 8 (mesma vendor, watch features novos)
# Vector sets, LangCache, Stack consolidado — review feature flags
redis-cli CONFIG GET enable-debug-command
redis-cli MODULE LIST   # vazio em Redis 8 (módulos agora built-in)

# Redis Cluster → Dragonfly (CUIDADO — Cluster gaps)
# Não migre cluster horizontal pra Dragonfly se você usa CLUSTER SLOTS / hash slots awareness
# Migre só se workload couber em single instance + redundância via replica
```

**Benchmark comparativo (memtier_benchmark 2026, AWS m7i.4xlarge — 16 vCPU, 64GB):**
```bash
memtier_benchmark -s $HOST -p 6379 \
  --threads=8 --clients=50 --pipeline=10 \
  --ratio=1:10 --data-size=256 --test-time=60
```
| Engine | Config | Throughput (ops/sec) | p99 latency |
|---|---|---|---|
| Redis 7.2 OSS | single-thread | ~110k | ~2.1ms |
| Valkey 8.1 | `--io-threads 8` | ~420k | ~1.4ms |
| Redis 8.0 | default (RESP3) | ~140k | ~1.9ms |
| Dragonfly 1.27 | `--proactor_threads=16` | ~2.1M | ~0.6ms |
| Memcached 1.6.x | `-t 16` | ~1.8M | ~0.4ms (sem structures) |

**RESP3 client pinning (importante em 2026):**
```ts
// Redis 8 default RESP3 — push notifications, maps nativos
const redis = new Redis({ host: 'redis-8', protocol: 3 });
// Valkey 8.1 também suporta RESP3, mas confirme client lib não fallback silencioso pra RESP2
```

**ACL multi-tenant (foundation Valkey/Redis 8):**
```bash
# Valkey/Redis 8 — ACL com key-pattern + command class
ACL SETUSER tenant-acme on >senha-strong \
  ~tenant:acme:* +@read +@write -@dangerous -FLUSHDB -FLUSHALL -KEYS
ACL SETUSER readonly-bi on >senha-bi \
  ~* +@read -@write -@dangerous
ACL LIST
```

**Stack Logística aplicada (estado 2026):**
- **Cache-aside + rate limit + idempotency keys (alta concorrência, cluster horizontal):** Valkey 8.1 em ElastiCache for Valkey (cluster mode enabled, 3 shard, 1 replica/shard, IO threads 4). Drop-in do antigo ElastiCache for Redis 7.2 sem mudança no `ioredis` cluster client. Custo ~33% menor que Redis OSS variant.
- **Hot in-memory aggregations (telemetria entrega real-time, ~80GB working set):** Dragonfly 1.27 single-instance EC2 m7i.16xlarge (64 vCPU, 256GB), `--proactor_threads=64`, `--maxmemory=200gb`. Replica Dragonfly em standby pra HA. Cluster spec não importa (single shard).
- **LLM semantic cache (suporte ao agent MCP — vide 04-10 §2.23):** Redis 8 Cloud com LangCache. Hash de prompt embedding (768-dim) como vector key, TTL 24h, invalida quando `prompt_template_version` muda no MCP server. Métricas: cache hit rate por intent, custo evitado em USD/dia.
- **Vector search produto similarity (busca semântica catálogo):** Redis 8 Cloud com VSET nativo OU pgvector (decisão em `02-15 §2.20` — depende de scale + ops familiarity). Stack atual usa pgvector (Postgres já operado, evita novo data store).

**10 anti-patterns:**
1. Locked into Redis Stack assumindo Apache 2.0 — license trap; Redis 8 Stack é BSL/SSPL. Check legal antes de greenfield.
2. Misturar Valkey + módulos Redis Inc enterprise — incompatível; módulos enterprise são BSL e não rodam em Valkey por design (e governance).
3. Dragonfly assumido full Cluster spec compat — gaps em CLUSTER SLOTS, MOVED redirects, hash slot ownership. Teste workload real antes de migrar cluster horizontal.
4. Redis 8 Cloud LangCache tratado como source of truth — é cache. Sempre invalidate em mudança de prompt template / model version / temperature.
5. IO threads (`--io-threads 8`) habilitado em workload < 100k ops/sec — overhead de coordenação sem ganho; mantém single-threaded até medir saturação CPU do main thread.
6. KeyDB em greenfield 2026 — sunset Q4 2024, sem security patches futuros. Migrate pra Valkey (mantém multi-threaded benefit) ou Dragonfly.
7. `MEMORY USAGE key` em hot loop — O(N) por sample, latência espike. Use `MEMORY USAGE ... SAMPLES 0` em background job, não request path.
8. Redis OSS 7.2 mantido "porque funciona" sem path de upgrade — sem patches Apache 2.0 futuros pra 7.2; security CVEs vão direto pra Valkey/Redis 8. Defina migration deadline.
9. RESP3 assumido por default em client lib que faz silent fallback RESP2 — push notifications, maps degradam. Pin protocol explicit no client config.
10. Migration Redis Cluster → Dragonfly sem replanejar Cluster slot logic — Dragonfly Cluster mode é emulated/gap-y; redesenhe pra single-shard com replica HA, ou mantém Valkey/Redis Cluster pra horizontal real.

**Cruza com:** `02-11 §2.6` (replication + cluster — base que Valkey/Redis 8 herdam idênticos), `§2.8` (Lua + Functions — Valkey/Redis 8 mesmo comportamento; Dragonfly Lua parcial), `§2.10` (Streams — Valkey 100% compat, Dragonfly testar XAUTOCLAIM em load), `§2.16` (memory tunning — Valkey 8 dict resize incremental ajuda RSS), `§2.17` (operação — runbooks idênticos Valkey/Redis 7.2), `§2.18` (alternatives intro — esta seção é deep follow-up), `§2.19` (Streams + consumer groups production), `02-15 §2.20` (vector search — Redis 8 vector sets vs pgvector vs Qdrant; trade-off operacional), `04-10 §2.23` (MCP — LangCache feeds MCP server response cache; invalidation contract), `03-05` (AWS ElastiCache for Valkey GA Q4 2024 — cost pivot ~33% e migration path managed).

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
