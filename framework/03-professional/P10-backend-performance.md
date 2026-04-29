---
module: P10
title: Backend Performance — Profiling, GC, Concurrency, Caching, DB Tuning
stage: professional
prereqs: [A07, A09, A11, P07]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# P10 — Backend Performance

## 1. Problema de Engenharia

"O backend está lento" raramente significa "Node é lento". Significa: query sem índice, conexão saturada, JSON encode em loop, GC com pauses, event loop bloqueado por sync I/O, cache hit rate de 12%, lock no DB. Sem método, otimização vira chute. Time gasta semana otimizando função que custava 3% do tempo real.

Este módulo é perf backend com método: USE method, profiling em produção, GC, event loop, conexões, query tuning, caching tiers, batching, async patterns, load shedding. Você sai sabendo medir, identificar o gargalo verdadeiro, e otimizar com prioridade.

---

## 2. Teoria Hard

### 2.1 Método antes de otimização

USE: Utilization, Saturation, Errors em cada recurso (CPU, mem, network, disk, DB conn pool, Redis, queue depth). RED em cada serviço.

Ordem:
1. **Definir SLO**. Sem target, otimização é infinita.
2. **Medir baseline** sob carga representativa.
3. **Identificar saturação**. Onde está o limite?
4. **Profile** o componente saturado.
5. **Otimizar** com hipótese clara.
6. **Re-medir**. Confirme ganho.

Anti-padrão: otimizar baseado em intuição. Você quase sempre escolhe errado o gargalo.

### 2.2 Profiling em Node

- **`node --prof`**: V8 sampling profiler. Output em `isolate-*.log`. Process com `node --prof-process`.
- **`0x`**: flame graph com 1 comando.
- **`clinic.js`** (Doctor, Flame, Bubbleprof): suite focada Node.
- **`--cpu-prof`**: V8 CPU profile (V8 inspector format, abre em DevTools).
- **`--heap-prof`** / heap snapshot via `--inspect`: memory.
- **Chrome DevTools** com `--inspect` em prod (cuidado).
- **Pyroscope / Grafana Profile**: continuous profiling em prod.

Padrão: clinic doctor primeiro pra ver onde o gargalo é (event loop? GC? I/O?), depois ferramenta específica.

### 2.3 Event loop lag

`monitorEventLoopDelay` (perf_hooks) ou `event-loop-lag` lib mede atraso. Se p99 > 100ms, algo bloqueia loop.

Causas comuns:
- Sync APIs (`fs.readFileSync`).
- Cálculo CPU-bound em handler.
- Regex catastrófico (ReDoS).
- JSON.parse em payload enorme.
- Loop síncrono em N items grandes.

Mitigação:
- Async APIs.
- Worker threads pra CPU-bound.
- Streams pra processamento incremental.
- Pagination em vez de carregar tudo.
- `setImmediate` pra ceder controle entre batches.

### 2.4 GC

V8 GC:
- **Scavenger**: young generation (small, frequent, < 1ms).
- **Major GC** (Mark-Sweep-Compact): old generation, mais raro mas lento (10-100ms).
- **Concurrent / parallel** marking reduz pause em V8 moderno.

Sintomas de problemas:
- Major GC frequent → muita allocation em hot path.
- Heap crescente → leak ou pool too small.

Mitigações:
- Pool de objetos reutilizados.
- Buffer pool.
- Reduzir allocations em loops (closures novas a cada iteração).
- Aumentar heap (`--max-old-space-size`) — última opção.

### 2.5 Conexões: pool tuning

Postgres: `pg.Pool({ max: N })`. Cada cliente é processo no DB. N grande mata DB; N pequeno serializa requests.

Heurística: começar `max = number_of_cpus * 2` no DB, dividido por instâncias do app. Ajustar baseado em métricas.

Indicadores:
- `pg_stat_activity` mostrando muitos idle in transaction.
- App esperando connection (`pool.waitingClients > 0`).

PgBouncer/Supavisor reduzem pressão. Em serverless, quase obrigatório.

Redis: `ioredis` pool implícito; pra alto throughput, múltiplas instances.

HTTP outbound: `agent` com `keepAlive: true` reusa conexões. Default node sem keep-alive é desastre em microservices.

### 2.6 Database tuning

Cobrimos em A09. Recap operacional:
- Índices pros queries quentes (não pros que você imagina). EXPLAIN ANALYZE em queries reais.
- `pg_stat_statements` top 10 por total time.
- Vacuum/autovacuum saudável; bloat baixo.
- `random_page_cost` pra SSD (~1.1).
- `work_mem` suficiente pra sort/hash em queries de relatório.
- Connection pooling.
- Read replicas pra leitura escalável.
- Cache de queries pesadas em Redis.

### 2.7 Caching tiers

Hierarquia:
1. **Process-local cache** (LRU em memória do app). Sub-microsecond. Bom pra dados imutáveis com hit rate alto. Stale entre instâncias.
2. **Redis cache**. Sub-ms latency, compartilhado. Bom pra dados que beneficia consistency entre instâncias.
3. **DB query result cache** (memcached-like, Postgres em sí pode cachear plano).
4. **CDN cache** pra responses HTTP idempotent.

Multi-tier: process L1 + Redis L2. Invalidate cuidadoso.

### 2.8 Cache patterns avançados

- **Write-through**: escreve em DB + cache simultâneos.
- **Write-back**: escreve em cache, flush async pra DB. Risco de loss.
- **Cache-aside**: app fetcha do DB no miss, popula cache. Mais comum.
- **Refresh-ahead**: refresh antes de expirar (background job).
- **Probabilistic early expiration**: estende TTL com probabilidade crescente perto do fim.

### 2.9 Batching e debouncing

Em vez de N queries pequenas, faça 1 query maior:
- DataLoader: batch + cache de keys dentro de um tick. Pattern em GraphQL e além.
- Bulk inserts: `INSERT ... VALUES (...), (...), (...)` ou `COPY`.
- Aggregation no DB em vez de loop em app.

Em sistemas com webhook ou message queue, batch processing reduz overhead.

### 2.10 Async patterns

- **Promise.all**: paralelo independente. Limit com p-limit ou similar pra evitar saturação.
- **Promise.allSettled**: paralelo, não aborta na primeira falha.
- **Streams + pipeline**: processamento incremental com backpressure.
- **AbortController**: cancel quando cliente desconecta.

### 2.11 Streaming em vez de buffering

API que carrega 1M rows e responde JSON gigante:
- Carrega em memory.
- Espera tudo serializar.
- Manda string longa.

Streaming:
- Cursor/iterator no DB.
- Transform stream pra cada row → JSON.
- Pipe pra response.

Memória estável; latência início baixa.

### 2.12 Load shedding e backpressure

Sistema saturado deve **degradar graciosamente**:
- Rejeitar requests com 503 quando queue cheia.
- Timeout agressivo em deps.
- Circuit breaker (S04).
- Queue com max length.

Sem load shedding: sistema para totalmente em saturação.

### 2.13 Async I/O performance

Node libuv usa epoll/kqueue/IOCP pra rede. Sócket scaleável até dezenas de milhares por processo. Limites:
- Open file descriptors (`ulimit -n`).
- Memory por conexão.
- TLS handshake CPU.

Com keep-alive e HTTP/2 multiplexing, throughput per connection cresce.

### 2.14 Compression

`Content-Encoding: gzip` reduz payload mas custa CPU. Em payloads JSON grandes, ganho de banda > custo CPU em maioria. Brotli melhor que gzip mas mais caro encoding.

`fast-json-stringify` (Fastify default) compila stringifier baseado em schema; 2-5x mais rápido que `JSON.stringify`.

### 2.15 Sync vs async escolhas certas

Em backend, async é default. Mas há casos onde sync vence:
- Crypto leve (`crypto.randomUUID`).
- JSON parse pequeno.
- Hash/HMAC.

Não force async em sync curto; libuv overhead pode comer ganho.

### 2.16 Microbenchmarks

`benchmark.js`, `mitata`, `tinybench` rodam funções e comparam. Cuidado com:
- V8 dead code elimination.
- Cold vs warm runs.
- Microbench != real perf (cache effects, allocations sob carga real).

Use pra validar otimização local; sempre confirme em load test integrado.

### 2.17 Cold start

Em serverless (Lambda, Cloud Run gen2):
- JS cold start ~100-300ms.
- Container cold start 500ms-2s.
- Mitigations: provisioned concurrency, snapStart (Lambda Java), keep-warm pings.

Pra Logística: cold start não é crítico em web traffic constante. Em endpoints raros (webhooks), pode ser.

### 2.18 Casos típicos: latência por feature

- Login: hash Argon2 custa ~100-500ms — deliberadamente. Não otimize "down". Considere caching de session token em vez de re-auth.
- Search: text search em Postgres pode ser custoso; considere índices, search engine externo (Meilisearch, Typesense).
- Aggregation: pre-compute em scheduled job; cache.
- Listing endpoint: cursor pagination em vez de offset.

### 2.19 Performance em outros runtimes — JVM, .NET, Go

Node é coberto acima. Se você opera stack mixed ou migra de Node, vale entender perf characteristics dos runtimes vizinhos.

**JVM (Java/Kotlin/Scala)**

- **JIT tiers**: HotSpot tem **C1** (compilação rápida, código OK) → **C2** (compilação cara, código ótimo). Tiered compilation é default. Métodos hot atingem C2; cold ficam em interpreted ou C1.
- **Warmup**: app JVM é lento nos primeiros segundos/minutos até JIT estabilizar. Em microservice serverless, pode ser problemático. Mitigação: AOT compilation (`-XX:+TieredCompilation` + warmup tests, ou **GraalVM Native Image** pra binário sem JVM).
- **GCs disponíveis**:
  - **G1GC** (default desde Java 9): generational, low-pause target ~200ms. Bom default.
  - **ZGC** (Java 15+): pause-less concurrent collector. Pause < 1ms até heaps de TBs. Custo: ~10% throughput. Vence em apps latency-critical.
  - **Shenandoah**: similar ZGC, projeto RH. Pra workloads parecidos.
  - **Parallel GC**: throughput máximo, pause longa. Bom pra batch.
  - **Epsilon**: no-op GC. Só use em workloads finitos sabidos.
- **Tuning crítico**: heap size (`-Xmx`), GC algoritmo, `-XX:MaxGCPauseMillis`, region size em G1. **JFR** (Java Flight Recorder) + **Mission Control** ou **Async Profiler** pra investigação.
- **Virtual threads (Project Loom, Java 21+)**: thread-per-request real fica viável de novo. Substitui muito código reactive (Reactor, RxJava). Em apps I/O-bound, ganho de simplicidade enorme. CPU-bound não muda.

**.NET (C#)**

- **JIT tiers**: similar JVM. **Tier 0** (rápido, sem otimização) → **Tier 1** (otimizado). **ReadyToRun (R2R)** pré-compila bibliotecas comuns pra reduzir startup.
- **AOT** via `dotnet publish -p:PublishAot=true` em .NET 8+. Single binary, startup instantâneo. Compatível com subset de APIs.
- **GC**: **Server GC** (multithreaded, default em ASP.NET) vs **Workstation GC** (single, default desktop). Configurável via `<ServerGarbageCollection>true</ServerGarbageCollection>`. **Background GC** reduz pausas.
- **Span<T>, Memory<T>**: zero-copy primitives. `ArrayPool<T>.Shared.Rent()` pra reduzir alloc em hot path. Idiomático em código perf-sensitive.
- **Profilers**: **dotTrace** (JetBrains), **PerfView** (MS), **dotnet-trace** + **dotnet-counters** (CLI built-in).
- **BenchmarkDotNet**: padrão pra microbenchmarks corretos (warmup, JIT, GC isolation).
- **.NET 8/9 (2024-2025)**: improvements significativos em ASP.NET hot path, Native AOT viável pra muito código.

**Go**

- **Sem JIT**: tudo AOT. Startup instantâneo. Trade-off: sem PGO clássica, mas Go 1.21+ suporta profile-guided optimization simples.
- **GC**: garbage collector concurrent, low-pause (target <1ms desde 1.5). **GOGC** controla threshold (100 = padrão; 200 = menos GC, mais memória). **GOMEMLIMIT** (1.19+) limita heap total.
- **Goroutines**: M:N scheduler. Lightweight (~2-8KB stack inicial, cresce). 100k goroutines em produção é normal.
- **Escape analysis**: stack vs heap decidido em compile time. `go build -gcflags='-m'` mostra decisões. Otimização: evitar variáveis que escapam pro heap em hot path.
- **Profilers**: `go tool pprof` (CPU, heap, goroutine, block, mutex). **continuous profiling** com Pyroscope/Parca.
- **`-race`** detector em CI: detecta data races, custo de runtime ~5-10x mas pega bugs caros.
- **Performance idioms**:
  - `sync.Pool` pra objetos reusáveis (reduz GC pressure).
  - Pre-allocate slices com capacity (`make([]T, 0, expectedLen)`).
  - Avoid `interface{}` em hot path (causa boxing).
  - `bytes.Buffer` em vez de string concatenação.

**Comparação cross-runtime (typical web service workload):**

| Runtime | Cold start | Steady-state throughput | Memory overhead | Latency p99 ajustado |
|---|---|---|---|---|
| Go | <100ms | Alto | Baixo (~30-100MB) | Excelente |
| .NET 8+ AOT | <100ms | Alto | Médio | Muito bom |
| .NET JIT | 1-3s | Alto | Médio | Bom (após warmup) |
| Java GraalVM Native | <100ms | Médio-alto | Baixo | Bom |
| Java JVM (HotSpot) | 5-15s | Alto | Alto (~200MB+) | Bom (após warmup) |
| Node | 50-200ms | Médio (single-thread) | Baixo | Bom (ev loop) |
| Bun | 5-20ms | Médio-alto | Baixo | Bom |
| Python | 100-500ms | Baixo (GIL) | Médio | Mediano |

**Heurísticas pragmáticas:**
- **Latência tail (p99/p999) crítica**: Go ou .NET AOT ou Java/ZGC.
- **Throughput máximo CPU-bound**: Go, Java JVM tunada, ou Rust (out of scope aqui).
- **Time onboarding rápido + ecossistema rico**: Node ou .NET. JS é universal; .NET tem stdlib enorme.
- **Cold start importa (serverless)**: Bun, Go, .NET AOT. Nunca JVM.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- USE method aplicado a 3 recursos.
- Identificar event loop block via clinic doctor.
- Distinguir young vs old GC e sintomas problemáticos.
- Tunar pool size de Postgres com método.
- Diferenciar 5 cache patterns.
- Implementar DataLoader pattern em código de exemplo.
- Refatorar endpoint que carrega 1M rows pra streaming.
- Definir load shedding strategy.
- Diagnosticar latência alta com 4 hipóteses ordenadas.
- Estratégia pra eliminar cold start em Lambda crítico.

---

## 4. Desafio de Engenharia

Profiling e tuning sistemático de **Logística v1** sob carga.

### Especificação

1. **Setup de carga**:
   - k6 scripts (do P01) reproduzíveis: smoke, average, stress.
   - Dataset com 100k pedidos, 500k events, 1k couriers, 50 tenants.
2. **Baseline**:
   - Stress test 30 min. Reportar p50/p95/p99 de cada endpoint, throughput, error rate.
   - Snapshot de Prometheus durante teste (Grafana export).
3. **Profile**:
   - clinic doctor durante stress: identificar gargalo (event loop? GC? I/O?).
   - clinic flame na rota mais quente: identifique top 3 functions por tempo.
   - Pyroscope continuous profiling rodando.
4. **DB**:
   - `pg_stat_statements` durante load: top 10 queries por total time.
   - Para top 3, EXPLAIN ANALYZE; otimize (índice, reescrita, pre-compute).
   - Tunar pool size baseado em saturação observada.
5. **Cache layer**:
   - Adicione process-local LRU pra dados muito quentes (ex: tenant settings).
   - Redis pra dashboard agregado (já tem do A11; revisite TTL).
   - Reportar cache hit rate por layer.
6. **Streaming**:
   - Endpoint export.csv: confirme streaming (memória < 200 MB durante export de 1M rows simulado).
7. **Batching**:
   - Endpoint que envia push pra múltiplos couriers próximos: batch query (`WHERE id IN (...)`) em vez de loop.
   - DataLoader em GraphQL endpoint (se aplicável) ou batched fetcher próprio.
8. **Load shedding**:
   - Configure limit de requests in-flight (semaphore ou Fastify config). Acima → 503 com Retry-After.
   - Demonstre comportamento sob spike.
9. **Comparação**:
   - Após otimizações, repetir stress test.
   - Tabela antes/depois: throughput, p99, error rate, recursos.
10. **Memory leak hunt**:
    - Soak test 4 horas.
    - Heap snapshot start vs end. Diff. Identifique 1 leak (ou prove ausência).

### Restrições

- Sem mudança de requisitos funcionais.
- Sem perda de testes existentes.
- Sem chute: cada otimização justificada por profile/metric.
- Sem global state hidden em closures.

### Threshold

- README documenta:
  - Tabela baseline vs after.
  - 3 otimizações com profile evidence (flame graph antes/depois ou EXPLAIN antes/depois).
  - Cache hit rates por layer.
  - 1 caso de load shedding em ação.
  - Memory: heap antes/depois soak.
  - 1 hipótese inicial errada que profile revelou (humildade documentada).

### Stretch

- Migrar 1 endpoint quente pra Bun, comparar.
- Substituir JSON.stringify por fast-json-stringify (Fastify default; teste em endpoint custom).
- Worker thread pra job CPU-bound, comparar latência mainline vs worker.
- HTTP/2 outbound pra serviços internos (undici Pool com http2 enabled).
- io_uring no kernel (libuv 1.45+) — verificar uso.

---

## 5. Extensões e Conexões

- Liga com **A07** (Node): event loop, libuv, GC.
- Liga com **A09** (Postgres): EXPLAIN, índices, conn pool.
- Liga com **A11** (Redis): cache layers, hot key.
- Liga com **A14** (real-time): backpressure em streams, WS scale.
- Liga com **P01** (testes): load tests informam.
- Liga com **P03** (K8s): HPA reage a métricas; pod sizing.
- Liga com **P05** (AWS): RDS Proxy, ElastiCache, Lambda warming.
- Liga com **P07** (observability): profile correlated com traces.
- Liga com **P09** (front perf): TTFB depende de backend.
- Liga com **S01** (distributed): latency budget cross-services.
- Liga com **S04** (resilience): load shedding é resilience pattern.
- Liga com **S09** (scaling): horizontal vs vertical, autoscaling triggers.

---

## 6. Referências

- **"Systems Performance"** — Brendan Gregg. Bíblia de perf de sistemas.
- **"BPF Performance Tools"** — Brendan Gregg.
- **"Node.js Design Patterns"** — Casciaro, capítulos sobre performance.
- **clinic.js docs** ([clinicjs.org](https://clinicjs.org/)).
- **0x docs** ([github.com/davidmarkclements/0x](https://github.com/davidmarkclements/0x)).
- **Pyroscope docs** ([grafana.com/oss/pyroscope](https://grafana.com/oss/pyroscope/)).
- **PostgreSQL Wiki "Slow Query Questions"**.
- **Use The Index, Luke**.
- **Charity Majors / Honeycomb** — observability como base de perf.
- **Brendan Gregg blog** ([brendangregg.com](https://www.brendangregg.com/)).
