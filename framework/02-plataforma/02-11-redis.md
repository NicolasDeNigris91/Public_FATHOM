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
