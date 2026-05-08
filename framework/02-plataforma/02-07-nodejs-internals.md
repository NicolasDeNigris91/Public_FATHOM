---
module: 02-07
title: Node.js Internals, libuv, Event Loop, Streams, Workers
stage: plataforma
prereqs: [01-07]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
quiz:
  - q: "Em que ordem o Node.js drena callbacks após o código síncrono terminar?"
    options:
      - "microtasks → nextTick → próxima fase do event loop"
      - "nextTick queue → microtasks (Promise) → próxima fase do event loop"
      - "fase de timers → microtasks → nextTick"
      - "Tudo executa em ordem aleatória"
    correct: 1
    explanation: "A fila de `process.nextTick` é drenada primeiro, depois microtasks (Promise.then, queueMicrotask), e então o loop avança para a próxima fase. Por isso `nextTick` em loop bloqueia o event loop inteiro."
  - q: "Quais APIs do Node usam o thread pool da libuv (default 4 threads)?"
    options:
      - "TCP/UDP networking via epoll/kqueue"
      - "`fs.*`, `dns.lookup`, `crypto.pbkdf2/scrypt`, `zlib`"
      - "Apenas `setTimeout` e `setInterval`"
      - "Todas as operações async indistintamente"
    correct: 1
    explanation: "Thread pool da libuv (`UV_THREADPOOL_SIZE`) atende fs (mais), dns.lookup, crypto pesado e zlib. I/O de rede usa kernel async (epoll/kqueue/IOCP) sem thread pool."
  - q: "Quando você deve usar `worker_threads` em vez de `cluster`?"
    options:
      - "Sempre — `cluster` é deprecated"
      - "Para CPU-bound JS (parsing, criptografia, cálculo); `cluster` é multi-processo, melhor para escalar I/O sem K8s"
      - "Apenas para acessar `fs` em paralelo"
      - "Para criar processos isolados com PID separado"
    correct: 1
    explanation: "`worker_threads` são threads no mesmo processo, ideal para CPU-bound. `cluster` cria processos separados com round-robin de porta, útil para escalar I/O em VMs (em K8s, o orquestrador faz isso melhor)."
  - q: "Por que `cluster` é geralmente desnecessário (e até prejudicial) em deploy Kubernetes?"
    options:
      - "K8s não suporta múltiplos processos por pod"
      - "K8s já é o orquestrador (1 processo por pod, escala via HPA); `cluster` duplica RAM por pod inutilmente"
      - "O cluster module foi removido em Node 22"
      - "Pods K8s têm 1 vCPU sempre, não há ganho"
    correct: 1
    explanation: "Em K8s o HPA (Horizontal Pod Autoscaler) já cria múltiplos pods. Usar cluster dentro de pod duplica memória sem ganho orquestracional. cluster faz sentido em VM tradicional, não em K8s."
  - q: "O que o Permission Model GA do Node 24 entrega como defesa-em-profundidade?"
    options:
      - "Sandbox completo equivalente a containers"
      - "Granular sandbox runtime via flags `--allow-fs-read`, `--allow-net`, etc., bloqueando addons nativos por default"
      - "Bloqueio automático de qualquer chamada async"
      - "Encryption transparent de variáveis de ambiente"
    correct: 1
    explanation: "Permission Model (GA Node 24) provê granular sandboxing in-runtime. Útil contra supply-chain attacks: lib maliciosa em node_modules tentando ler `~/.aws/credentials` ou conectar a C2 falha com `ERR_ACCESS_DENIED`."
---

# 02-07, Node.js Internals

## 1. Problema de Engenharia

A maior parte dos devs JS que escrevem servidor em Node sabe quase nada do runtime. Funciona até a primeira vez que: o servidor congela em produção sob carga; uma stream consome memória e mata o container; um middleware async faz timing virar nondeterminístico; um child process zumbi mantém o processo vivo. Aí "Node é um runtime de JS" não basta.

Este módulo é dissecação. V8, libuv, event loop com suas seis fases, microtasks, streams, buffers, workers, child processes, cluster, signals, exit codes, debugging com `--inspect`. Você sai daqui sabendo o que `node app.js` realmente faz.

---

## 2. Teoria Hard

### 2.1 O que é Node

Node é runtime de JS server-side construído sobre:
- **V8**: engine JS do Chrome (parser, JIT, GC). Mesma engine de Edge/Chrome.
- **libuv**: lib em C que dá I/O assíncrono cross-platform via thread pool + event loop. Mesma lib que dirige outros runtimes (Bun, Deno usam alternativas mas conceito é igual).
- **Bindings nativos**: `fs`, `net`, `crypto`, `http`, etc. são wrappers JS sobre código C++ que chama libuv ou syscalls.

Ao rodar `node app.js`:
1. V8 inicializa, carrega bytecode interno (lib/internal/*).
2. libuv cria event loop e thread pool default (4 threads).
3. Seu script é parseado e executado top-down.
4. Após terminar a execução síncrona, Node entra no loop. Se há trabalho pendente (timers, IO, pending callbacks), processa. Se não há, sai.

### 2.2 V8 essentials

V8 compila JS pra bytecode (Ignition) e re-otimiza hot code pra machine code (TurboFan). GC é generational (Scavenger pra young, Mark-Sweep-Compact pra old).

Implicações práticas:
- Funções monomórficas (sempre chamadas com mesma shape de args) otimizam melhor que polimórficas.
- Object shapes (Hidden Classes), adicionar properties em ordem consistente ajuda V8 a reusar inline caches.
- Allocations grandes em loop quente disparam GC; reuse buffers.
- Heap default é ~1.5-4 GB (depende). Pode-se aumentar com `--max-old-space-size=4096`.

### 2.3 Event loop e suas fases

libuv é organizada em fases:

1. **Timers**: callbacks de `setTimeout`/`setInterval` cujo tempo expirou.
2. **Pending callbacks**: callbacks de I/O diferidos (errors raros).
3. **Idle, prepare**: interno.
4. **Poll**: novo I/O. Bloqueia esperando por eventos (com timeout calculado pelo próximo timer).
5. **Check**: callbacks de `setImmediate`.
6. **Close callbacks**: `socket.on('close')` etc.

Entre cada fase, Node drena:
- **Microtasks** (Promise `.then`, `queueMicrotask`).
- **`process.nextTick`** (fila própria do Node, drenada antes de microtasks).

Ordem comum (após código síncrono terminar):
- nextTick queue → microtasks → próxima fase.

Por isso `process.nextTick` em loop infinito **bloqueia o event loop inteiro**: ele drena antes de qualquer fase rodar.

### 2.4 Macro/microtask na prática

```js
console.log('1');
setTimeout(() => console.log('2'), 0);
setImmediate(() => console.log('3'));
Promise.resolve().then(() => console.log('4'));
process.nextTick(() => console.log('5'));
console.log('6');
```

Output: `1 6 5 4 2 3` (na maioria dos cenários). Por quê:
- Síncrono: 1, 6.
- Drena nextTick: 5.
- Drena microtasks: 4.
- Próxima fase de timers expirados: 2.
- Próxima fase check: 3.

(Ordem entre `setTimeout 0` e `setImmediate` é menos determinística fora de I/O, em I/O callback, `setImmediate` sempre vence.)

### 2.5 Thread pool (libuv)

Algumas operações bloqueariam o thread JS, então libuv as offload pra thread pool:
- `fs.*` (a maioria, exceto `fs.watch`).
- `dns.lookup` (não os outros DNS APIs).
- `crypto.pbkdf2`, `crypto.scrypt` etc.
- `zlib` (compressão).

Default: **4 threads**. Variável: `UV_THREADPOOL_SIZE` (até 1024). Aumentar ajuda CPU-bound APIs em paralelo, mas só faz sentido se você tem CPUs.

I/O de **rede** (TCP, UDP) **não usa thread pool**: usa kernel async (epoll/kqueue/IOCP). Por isso Node escala bem em rede mesmo com pool default pequeno.

### 2.6 Buffers e binary data

`Buffer` é a estrutura de Node pra dados binários. Wrap de `Uint8Array` com APIs extras (`toString('hex')`, etc.). 

- `Buffer.alloc(n)`, zerado, seguro.
- `Buffer.allocUnsafe(n)`, não zerado, mais rápido, mas pode vazar memória de processos anteriores se você não sobrescrever.
- `Buffer.from(string, encoding)`, converte.

Em código moderno, prefira `Uint8Array` quando interop com Web Standard. `Buffer` quando precisa de APIs específicas.

### 2.7 Streams

Streams são abstração de fluxo de dados em Node. Tipos:
- **Readable**: fonte de dados (`fs.createReadStream`, HTTP request).
- **Writable**: destino (`fs.createWriteStream`, HTTP response).
- **Duplex**: ambos (TCP socket).
- **Transform**: lê e escreve transformando (`zlib.createGzip`).

Modos:
- **Flowing**: dados empurrados via `data` events.
- **Paused**: você puxa via `read()`. Default antes de subscriber.

Backpressure: se Writable não acompanha Readable, `write()` retorna `false`. Stream pipeline respeita isso. Se você não respeitar, **memória acumula**.

API moderna: **`pipeline`**:
```js
import { pipeline } from 'stream/promises';
await pipeline(
  fs.createReadStream('input.csv'),
  csvParser(),
  transform,
  fs.createWriteStream('output.json')
);
```
Trata erros, fecha streams corretamente, propaga backpressure.

**Async iteration**:
```js
for await (const chunk of stream) { ... }
```
Streams Readable são async iterables.

### 2.8 Process e child_process

`process` global expõe runtime info: `argv`, `env`, `cwd()`, `pid`, `platform`, `version`, `memoryUsage()`, `cpuUsage()`.

Eventos importantes:
- `'exit'`, quando event loop esvazia.
- `'beforeExit'`, antes de exit, ainda dá pra agendar trabalho.
- `'uncaughtException'`, última chance antes de crashar (você deve **logar e sair**, não recuperar; estado do app pode estar corrompido).
- `'unhandledRejection'`, promise sem `.catch`. Em Node 15+ default é abortar processo.

`child_process`:
- `spawn(cmd, args)`, processo separado, stdio em streams. Use pra processos longos.
- `exec(cmd)`, stdout/stderr em buffer (limite default ~1 MB; cuidado).
- `fork(file)`, fork especializado pra outro Node script, com canal IPC (`process.send`).

Cada processo tem PID separado, memória separada, kernel scheduler decide.

### 2.9 Worker Threads

`worker_threads` (estável desde Node 12) dá threads JS reais com isolated V8 isolates, mas mesmo processo. Comunicam via `MessageChannel`/`postMessage` (structured clone) ou `SharedArrayBuffer`.

Use cases:
- CPU-bound JS (parsing, criptografia heavy, cálculo).
- Não use pra I/O, main thread já lida bem com I/O via libuv.

Diferença de cluster: cluster é multi-processo, worker_threads é multi-thread no mesmo processo (compartilha memória via SharedArrayBuffer, não via heap normal).

### 2.10 Cluster

Módulo `cluster` permite forkar múltiplos workers Node, cada um sendo processo separado, todos compartilhando porta via master que faz round-robin.

Permite usar todos os cores em servidor de N requests por segundo. Cada worker tem heap próprio (não compartilha state em memória).

Em prática moderna: **PM2**, **Node cluster nativo**, ou apenas Docker rodando N réplicas. Em platforms de serverless/edge, irrelevante.

### 2.11 Signals e graceful shutdown

Linux/Mac mandam signals: `SIGINT` (Ctrl+C), `SIGTERM` (kill, docker stop), `SIGKILL` (não dá pra catch).

Server bem comportado:
1. Recebe `SIGTERM`.
2. Para de aceitar conexões novas.
3. Termina requests em andamento (com timeout).
4. Fecha DB pool, queue connections.
5. Sai com 0.

Em Node:
```js
const server = app.listen(3000);
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
```

Pra HTTP/Express: `server.close` espera conexões keep-alive, pode ser necessário forçar timeout. Libs como `stoppable` ajudam.

### 2.12 Module system: CJS vs ESM

CommonJS (CJS): `require`, `module.exports`. Síncrono. Default histórico.

ECMAScript Modules (ESM): `import`/`export`. Async loading. Default Web. Suportado em Node 14+ via `.mjs` ou `"type": "module"` em `package.json`.

Diferenças sutis:
- ESM tem top-level `await`.
- ESM imports são static (não condicional).
- `__dirname`, `__filename` não existem em ESM (use `import.meta.url`).
- Interop CJS↔ESM tem casos confusos (default vs named exports).

Em 2026, projetos novos: ESM. Bibliotecas: dual publish (CJS + ESM) ainda comum.

### 2.13 NPM, package.json, lockfiles

`package.json`: metadata, deps, scripts, exports.
`package-lock.json` (npm) / `yarn.lock` / `pnpm-lock.yaml` / `bun.lockb`: pinned versions, garantindo reprodutibilidade.

`exports` field controla o que e como o pacote expõe (CJS, ESM, types). Substituiu o `main` antigo. Sem entender `exports`, você não publica pacote correto.

Bun, pnpm são alternativas com workspace e velocidade de install superiores. Para monorepo: pnpm workspaces ou Turborepo + Nx pra orquestrar.

### 2.14 Async hooks e AsyncLocalStorage

`AsyncLocalStorage` (estável Node 16+) cria "thread-local" storage por contexto async. Útil pra request-scoped data (request id, user, tenant) sem passar argumento por todo lugar.

```js
import { AsyncLocalStorage } from 'async_hooks';
const als = new AsyncLocalStorage();

app.use((req, res, next) => {
  als.run({ requestId: crypto.randomUUID() }, () => next());
});

logger.info({ requestId: als.getStore()?.requestId }, 'something');
```

Custo: pequeno overhead em cada async boundary. Em prod, vale.

### 2.15 Errors em código async

Padrões e armadilhas:
- `try/catch` só pega throws síncronos ou em `await`. Promise sem `await` rejeitada vai pra `unhandledRejection`.
- Callbacks Node-style: `(err, data) => {}`. Esquecer de checar `err` é bug clássico.
- Em Express clássico: erros em middleware async precisam ser passados pra `next(err)`. Express 5 (estável agora) trata async automaticamente.

### 2.16 Diagnóstico em produção

- `--inspect` / `--inspect-brk`: abre debugger compatível com Chrome DevTools.
- `process.memoryUsage()`, `--heap-prof` flag pra heap snapshot.
- `--prof` pra V8 sampling profiler (output em `isolate-*.log`).
- **clinic.js** (Doctor, Flame, Bubbleprof), toolkit pra análise de event loop, latência, async.
- `0x`, flame graph generator.
- **Async stack traces** (`--async-stack-traces` default), stack inclui caminho cross-await.

Sintomas comuns:
- Latência crescente sob carga → event loop lag → `clinic doctor` ou medir `event-loop-lag`.
- Memória crescente → heap profile, comparar snapshots.
- 100% CPU → flame graph, achar função quente.
- App não morre após `Ctrl+C` → handle/refs ainda abertos. `process._getActiveHandles()` debug.

### 2.17 Node vs Bun vs Deno, comparação real (2026)

Os três rodam JS/TS server-side mas diferem em decisões de design, runtime base, e maturidade de ecossistema. Senior real escolhe consciente, não por moda.

| Dimensão | Node 22 LTS | Bun 1.x | Deno 2.x |
|---|---|---|---|
| Engine | V8 (Chrome) | JavaScriptCore (Safari) | V8 (Chrome) |
| I/O backbone | libuv | Bun's own (zig + io_uring quando disponível) | Tokio (Rust) |
| TS nativo | Não (precisa loader/`--experimental-strip-types` em 22.6+) | Sim, sem config | Sim, sem config |
| Package manager | npm/pnpm/yarn | `bun install` (CAS local, ~10x mais rápido que npm) | npm registry + `deno install` |
| Imports | CommonJS + ESM | CommonJS + ESM + auto-resolve `.ts` | ESM-only, URL imports + `npm:` specifier |
| Bundler builtin | Não (use esbuild/swc) | Sim (`bun build`) | Sim (`deno bundle` deprecated; `deno compile`) |
| Test runner | `node --test` (built-in desde 18) | `bun test` (Jest-compat API) | `deno test` (built-in) |
| Native code | N-API, addon C++ | N-API parcial + Bun.FFI | FFI nativo (`Deno.dlopen`) |
| Permissions | Sem (full access) | Sem (full access) | Granular (`--allow-net`, `--allow-read`, etc.) |
| Maturidade prod | Total (10+ anos) | Crescendo (early adopters em prod desde 2024) | Estável em edge/scripts |
| Memory baseline | ~30MB idle | ~25MB idle | ~40MB idle |
| Startup time | ~50ms (TS via tsx) | ~5-10ms | ~25ms |
| Hot reload | `--watch` | `--watch` (mais rápido) | `--watch` |

**Quando escolher Node:**
- Maior parte de backends de produção. Stack mais conservadora, ecossistema maior, tooling enterprise (APM, profilers, vendor support).
- Quando dependências usam **N-API addons** complexos (Sharp, sqlite3 native).
- Quando o time inteiro é Node-fluent.

**Quando escolher Bun:**
- **Scripts**, ferramentas internas, **build pipelines**: startup rápido importa.
- **Test suite grande**: `bun test` é 5-10x mais rápido que Jest.
- **Bundling de aplicação**: substitui esbuild/Vite em alguns casos.
- **Dev experience**: `bun --hot` reinicia em milissegundos vs segundos.
- Em produção: ainda emergente, mas Cloudflare Workers e várias startups estão em produção. Compat com `node:` modules ~95%, testar caso específico.

**Quando escolher Deno:**
- **Edge functions / serverless** (Deno Deploy nativo, Supabase Functions usa Deno).
- **Scripts onde permissions importam**: automação que toca rede/disco em CI ganha audit fácil.
- **Projetos novos sem legacy npm**, quando o time topa URL-imports.
- **Workspace TS isolado**: zero config TS é genuinamente bom.

**Pegadinhas reais:**
- **Bun**: alguns workers/cluster patterns Node não funcionam ainda. APM tools (DataDog, NewRelic) tem agentes Bun mas defasados.
- **Deno 2.x**: ganhou compat npm dramatic em 2024. Ainda assim, libs que assumem `__dirname`/CommonJS quebram. ESM-only é decisão consciente.
- **Bun em produção**: já tem horror stories, memory leak em alguns cases de stream HTTP. Node tem 10 anos de patches em corner cases que Bun ainda vai descobrir.

**Veredicto pragmático 2026:**
- **Backend produção crítico**: Node. Mude quando Bun atingir paridade vendor-support em 2027+.
- **Tools/scripts/CI**: Bun. Vale a velocidade.
- **Edge/serverless novo**: Deno ou Bun, depende de plataforma.
- **Em time mixed**: padronize um. Coexistência custa onboarding.

### 2.18 Event loop blocking detection + worker_threads vs cluster + libuv pool tuning

Event loop blocking é a causa #1 de p99 latency catastrófico em Node prod. Single CPU-bound task de 200ms congela TODAS connections do process. Sem detection, time só descobre via "site is slow" tickets — quando user já abriu Twitter pra reclamar. §2.18 cobre 4 fronts: (1) detect via `monitorEventLoopDelay` + APM, (2) offload via `worker_threads` (CPU work) ou `cluster` (multi-process), (3) tune libuv thread pool, (4) anti-patterns que matam silenciosamente.

**Detecting blocking — `monitorEventLoopDelay` (Node 11+)**:

```typescript
import { monitorEventLoopDelay } from 'perf_hooks';

const histogram = monitorEventLoopDelay({ resolution: 20 });
histogram.enable();

// Expor pra Prometheus
setInterval(() => {
  prometheusGauge.set({
    name: 'nodejs_event_loop_delay_ns',
  }, {
    p50: histogram.percentile(50),
    p99: histogram.percentile(99),
    max: histogram.max,
    mean: histogram.mean,
  });
  histogram.reset();
}, 10_000);
```

- **`resolution: 20`**: sample a cada 20ms. Lower = mais preciso, more overhead.
- **Healthy**: p99 < 50ms, max < 200ms.
- **Pathological**: p99 > 200ms = dropping connections; max > 1s = users seeing timeouts.
- APM (Datadog, New Relic, Sentry) já capturam automatic — habilite alert em p99 > 100ms.

**Why it matters — single CPU work blocks I/O**:

```typescript
// BAD — 800ms de CPU bloqueia event loop por 800ms
app.get('/report', (req, res) => {
  const data = getOrders();
  const csv = data.map(o => `${o.id},${o.total}`).join('\n');   // CPU
  for (let i = 0; i < 1_000_000; i++) {
    processRow(data[i % data.length]);   // CPU
  }
  res.send(csv);
});

// Durante esses 800ms: outros requests aguardam.
// Liveness probe não responde → K8s mata pod.
```

**Fix 1: worker_threads pra CPU-bound work**:

```typescript
// workers/csv-export.js
const { parentPort } = require('worker_threads');

parentPort.on('message', (orders) => {
  const csv = orders.map(o => `${o.id},${o.total}`).join('\n');
  parentPort.postMessage(csv);
});
```

```typescript
// main.ts
import { Worker } from 'worker_threads';
import { Piscina } from 'piscina';   // pool de workers

const pool = new Piscina({
  filename: new URL('./workers/csv-export.js', import.meta.url).pathname,
  minThreads: 2,
  maxThreads: 8,
  idleTimeout: 30_000,
});

app.get('/report', async (req, res) => {
  const orders = await getOrders();
  const csv = await pool.run(orders);   // event loop livre durante CPU work
  res.send(csv);
});
```

- **Piscina** (lib oficial Anna Henningsen) é pool de worker_threads pronto pra produção.
- Comunicação main ↔ worker via `postMessage` (structured clone). Custo de serialization NÃO vale pra payloads gigantes (> 10MB).
- **`SharedArrayBuffer`**: zero-copy compartilhamento entre threads. Útil pra image/video processing.

**Fix 2: cluster pra paralelismo de I/O**:

```typescript
import cluster from 'cluster';
import os from 'os';

if (cluster.isPrimary) {
  const workers = process.env.NODE_WORKERS ? parseInt(process.env.NODE_WORKERS) : os.cpus().length;
  for (let i = 0; i < workers; i++) cluster.fork();

  cluster.on('exit', (worker, code, signal) => {
    log.warn({ pid: worker.process.pid, code, signal }, 'worker died, restarting');
    cluster.fork();
  });
} else {
  await import('./server.js');
}
```

- cluster module: cada worker é processo separado, cada um com seu event loop.
- Compartilha porta: kernel round-robina connections.
- **Em K8s**: NÃO use cluster. K8s é o orquestrador; rode 1 process por pod, escale via HPA. cluster duplica RAM por pod inutilmente.
- Use cluster em VM tradicional ou bare-metal.

**worker_threads vs cluster — decision**:

| Workload | Use |
|---|---|
| CPU-bound (ML inference, image processing, crypto) | worker_threads + Piscina |
| I/O-bound (HTTP, DB) escalando além de single core | cluster (não-K8s) ou HPA (K8s) |
| Mixed: API servidor com hot path CPU ocasional | cluster + worker_threads (paralelos) |
| Native binding bloqueante | worker_threads (isolar) |

**libuv thread pool tuning**:

- Default `UV_THREADPOOL_SIZE = 4`. Operations que usam: `fs.*`, `dns.lookup` (sync resolver), `crypto.pbkdf2`, `crypto.scrypt`, `zlib.*`.
- 100 simultaneous fs reads + 4 threads = 96 esperando.
- Tune:

  ```bash
  UV_THREADPOOL_SIZE=16 node server.js
  ```

- **Pegadinha**: aumentar `UV_THREADPOOL_SIZE` desperdiça RAM se workload não é I/O fs/crypto. Validate com `monitorEventLoopUtilization` + thread pool saturation metrics.

**`monitorEventLoopUtilization` (Node 14.10+)**:

```typescript
import { performance } from 'perf_hooks';

let prev = performance.eventLoopUtilization();
setInterval(() => {
  const next = performance.eventLoopUtilization();
  const delta = performance.eventLoopUtilization(next, prev);
  // delta.utilization 0-1 (% tempo busy)
  prev = next;
  prometheusGauge.set('nodejs_event_loop_utilization', delta.utilization);
}, 10_000);
```

- Utilization > 0.9 = saturado; scale out OU offload work.

**Diagnostic toolkit — production debugging**:

```bash
# CPU profile pra detectar hot path
node --cpu-prof --cpu-prof-dir=./profiles server.js
# Analyze: chrome://tracing or speedscope

# Heap snapshot
node --heapsnapshot-signal=SIGUSR2 server.js
# SIGUSR2 → dumps heap; analyze com Chrome DevTools

# Inspector remoto (cuidado em prod)
node --inspect=0.0.0.0:9229 server.js

# Trace events (low overhead)
node --trace-events-enabled --trace-event-categories=v8,node server.js
```

- **clinic.js** suite (Doctor, Flame, Bubbleprof): production-grade analysis.
- **0x**: flame graph generator de Node CPU profile.

**Logística stack pragmático**:

```typescript
// server.ts
import 'dotenv/config';
import { monitorEventLoopDelay, performance } from 'perf_hooks';
import { Piscina } from 'piscina';
import Fastify from 'fastify';

const histogram = monitorEventLoopDelay({ resolution: 10 });
histogram.enable();

const cpuPool = new Piscina({
  filename: new URL('./workers/cpu-tasks.js', import.meta.url).pathname,
  minThreads: 2,
  maxThreads: 8,
});

const app = Fastify();

app.get('/healthz', async () => ({ ok: true }));

app.get('/metrics', async () => {
  const elu = performance.eventLoopUtilization();
  return {
    eventLoopDelayP99Ms: histogram.percentile(99) / 1e6,
    eventLoopDelayMaxMs: histogram.max / 1e6,
    eventLoopUtilization: elu.utilization,
  };
});

app.post('/cpu-heavy', async (req) => {
  return cpuPool.run(req.body);   // offload
});

await app.listen({ port: 8080, host: '0.0.0.0' });
```

**Anti-patterns observados**:

- **`bcrypt.hashSync` em handler**: bloqueia event loop ~100ms por hash. Use async `bcrypt.hash` ou worker pool.
- **`JSON.parse` em payload de 10MB**: 50-100ms blocking. Use streaming parser (`JSONStream`).
- **Loop síncrono em array grande**: `arr.map(heavyFn)` com 100k items. Break com `setImmediate` ou worker.
- **Sem `monitorEventLoopDelay`**: blocking só descoberto após "site is slow" tickets.
- **`UV_THREADPOOL_SIZE=64` random**: sem medição da saturação real, só aumenta RAM e contention.
- **Cluster + K8s**: 4 processes per pod × 10 pods = 40 processes; HPA já faz isso melhor.
- **`Worker` recriado a cada request**: spawn cost ~50ms; use Piscina pool.
- **Native bindings em main thread**: native code bloqueante. Sempre worker_threads.

Cruza com **02-07 §2.4** (event loop foundation), **02-07 §2.10** (cluster basics), **02-07 §2.16** (diagnóstico produção), **04-09 §2.20** (backpressure relaciona com saturation), **03-07** (observability captura ELU).

---

### 2.19 Performance profiling deep — clinic.js, 0x flamegraphs, V8 deopts, heap snapshots

Profiling sem método é teatro. Sem método, abre Chrome DevTools, screenshot do flame, e "otimiza" função que consumia 0.3% do tempo. §2.19 cobre stack 2026: **clinic.js 13+** (Doctor → categoriza problem antes de mergulhar), **0x 5+** (flamegraph standalone), **V8 deopt tracing** (perda silenciosa de JIT), **heap snapshots comparison** (leak detection real), **Pyroscope 0.21+** (continuous prod profiling). Node 22 LTS assumido.

**Stack 2026 — escolha por sintoma**:

- **clinic.js** (NearForm): suíte completa — Doctor (event loop + GC), Bubbleprof (async ops), Flame (CPU), Heap (memory). Uso em dev/staging.
- **0x** (David Mark Clements): flamegraph único em CLI. Mais leve que clinic Flame.
- **node --inspect** + chrome://inspect: profiler builtin (CPU, allocation timeline). Use pra debugging interativo, não pra prod.
- **node --cpu-prof / --heap-prof**: profilers builtin desde Node 12. Output direto pra arquivo `.cpuprofile` / `.heapprofile`.
- **Pyroscope / Parca**: continuous profiling em produção; flamegraphs sempre-ligados, agregados. Overhead 1-2% CPU.
- **autocannon** (NearForm): HTTP benchmark pra reproduzir load enquanto profila.

**clinic.js workflow — Doctor primeiro, sempre**:

```bash
# Step 1: Doctor categoriza problem (EventLoop / GC / IO / CPU)
npx clinic doctor --on-port 'autocannon -d 30 -c 100 http://localhost:3000/orders' -- node server.js

# Step 2 (se CPU-bound): Flame pra detalhe de CPU
npx clinic flame --on-port 'autocannon -d 30 -c 100 http://localhost:3000/orders' -- node server.js

# Step 3 (se async chain confuso): Bubbleprof
npx clinic bubbleprof --on-port 'autocannon -d 30 -c 100 http://localhost:3000/orders' -- node server.js

# Step 4 (se memory growth): Heap
npx clinic heap --on-port 'autocannon -d 30 -c 100 http://localhost:3000/orders' -- node server.js
```

- Doctor emite recommendation explícita ("likely event loop blocking", "GC pressure detected"). Pular Doctor leva a investigar tool errado.

**0x — flamegraph standalone**:

```bash
npx 0x -- node server.js
# Em outro terminal: rode load (autocannon, k6, vegeta)
# Ctrl+C no 0x; output HTML flamegraph abre em browser

# Variant: profile já-rodando-em-background
npx 0x -P 'autocannon -d 20 -c 50 http://localhost:3000' -- node server.js
```

- **Reading flamegraph**: largura ∝ tempo de CPU; altura = profundidade do stack; topo = leaves (onde tempo é gasto). Click pra zoom em subtree. Procure plateaus largos no topo — são leaves quentes.

**V8 deoptimization — JIT silenciosamente desistindo**:

V8 JIT-compila funções hot via TurboFan. Se assumption de tipo é violada, V8 **deopta** pra interpretador — mesma função, 10-100× mais lenta, sem warning.

Causas comuns:

- Polymorphic call site (mesma função chamada com shapes diferentes).
- `try/catch` em hot loop (pre-Node 14; mitigado em Node 14+ mas ainda penaliza inlining).
- `arguments` object usage (use rest `...args`).
- `with`, `eval`, mutação de prototype em runtime.

```bash
# Trace deopts em runtime
node --trace-deopt server.js 2>&1 | grep -i 'deopt'

# Em flamegraph (clinic Flame, 0x): blocos vermelhos = deopted; amarelo = optimized eager; verde = not yet optimized.
# Hot path com vermelho = perda significativa.
```

**Pattern Logística — fix polymorphic deopt no preço**:

```ts
// BAD — shapes variando entre chamadas
function calculatePrice(item: any) {
  return item.price * item.quantity;          // V8 deopta quando shapes divergem
}
calculatePrice({ price: 10, quantity: 2 });           // {price, quantity}
calculatePrice({ price: 5, quantity: 1, tax: 0 });    // shape diferente
calculatePrice({ price: 8, quantity: 3, discount: 1 }); // shape diferente de novo

// GOOD — monomorphic, shape fixo
interface PricedItem { price: number; quantity: number; tax: number; discount: number }

function calculatePrice(item: PricedItem) {   // sempre mesmo shape; TurboFan inlina
  return item.price * item.quantity * (1 + item.tax) - item.discount;
}
```

- TypeScript não garante shape em runtime — só compile-time. Garanta inicialização consistente (default values em factory) pra V8 tratar como hidden class única.

**Heap snapshots — leak detection real**:

```ts
// Snapshot programático
import v8 from 'node:v8';

v8.writeHeapSnapshot('./snapshot-' + Date.now() + '.heapsnapshot');
```

```bash
# Auto-snapshot perto de OOM (Node 12+): captura 3 snapshots antes de crash
node --heapsnapshot-near-heap-limit=3 server.js

# Análise: Chrome DevTools → Memory → Load profile
```

- **Comparison view**: tire snapshot A, gere load, tire snapshot B 5min depois. DevTools "Comparison" filter mostra objects criados em B mas não freed — candidatos a leak.
- **Retention path**: clique no objeto suspeito → "Retainers" mostra cadeia até GC root (qual closure/global segura). Sem path = sem leak.

**Pyroscope — continuous profiling em produção**:

```ts
import Pyroscope from '@pyroscope/nodejs';   // SDK 2026, version 0.21+

Pyroscope.init({
  serverAddress: process.env.PYROSCOPE_URL!,
  appName: 'orders-api',
  tags: {
    region: process.env.REGION!,
    version: process.env.VERSION!,            // CRÍTICO pra diff entre deploys
  },
});
Pyroscope.start();
```

- Always-on, ~1-2% CPU overhead. Flamegraphs agregados na UI.
- **Diff over time**: compare flamegraph hoje vs último deploy → spot regressão antes de incident.
- **Cardinality**: tags estáveis (`region`, `version`, `env`). NUNCA `user_id`, `tenant_id`, `request_id` — explosion de séries.
- Alternativas: Datadog Continuous Profiler (managed), Parca (OSS), Polar Signals (managed).

**Profiling em produção — sem matar latency**:

- **Sampling profiling** (default V8, Pyroscope): captura stack a cada N ms; baixo overhead; perde funções breves.
- **Tracing profiling** (`--cpu-prof`): cada call gravado; alto overhead; só windows curtos (segundos).
- **Single instance + LB drain**: drene traffic de 1 pod, profile com tracing, retorne. Não profile todos os pods simultâneos (overhead × N).
- Evite profilar dev com synthetic data — patterns de produção (cardinality real, payload sizes reais) divergem.

**Logística — investigation real (deploy v3.4 → v3.5)**:

- **Sintoma**: `/orders` p99 latency 100ms → 800ms após deploy v3.4. Sem alert óbvio em CPU/memory.
- **Step 1**: clinic Doctor em staging com autocannon réplica do load → "likely event loop blocking".
- **Step 2**: clinic Flame → `JSON.parse` consumindo 60% CPU em hot path; payload de 12KB+ por request.
- **Step 3**: investigation no diff → nova feature serializa courier object completo com nested route history. Refactor pra selective fields (id, name, status, currentLat, currentLng).
- **Resultado**: p99 volta pra 95ms; flamegraph re-rodado confirma `JSON.parse` < 5%.
- **Pyroscope contínuo**: regressão equivalente em v3.5 detectada em 1h via diff vs v3.4 — antes de virar user-facing incident.

**Anti-patterns observados**:

- **Profiling em dev sem realistic load**: production patterns (cardinality, payload size, concurrency) divergem. Use autocannon com volume real.
- **Skipping Doctor**: ir direto pro Flame sem categorizar problem. Doctor sinaliza qual tool é certa.
- **V8 deopts ignorados em hot path**: `--trace-deopt` deveria ser 0 linhas em código quente. Cada deopt = JIT desistiu.
- **Polymorphic em hot loop**: TypeScript não basta; runtime shape pode variar. Inicialize fields consistente.
- **`try/catch` em hot inner loop pre-Node 14**: deopta. Refatore catch pro outer scope.
- **Heap snapshot único pra leak**: leak precisa de **comparison** (2 snapshots minutos apart). Único só mostra estado.
- **Production profiling em todas instâncias simultâneo**: overhead × N. Single instance + LB drain.
- **`--inspect` permanente em prod**: porta de debugger exposta + overhead. Usar só ad-hoc com firewall.
- **Pyroscope com tag cardinality alta** (`tenant_id`, `user_id`): explosion de séries no backend storage.
- **Profilar só pós-incident**: continuous profiling pega regressão antes de virar p99 spike user-facing.

Cruza com **02-07 §2.18** (event loop blocking + worker_threads — profiling localiza onde bloquear), **03-09** (frontend perf, mesmos princípios de flamegraph), **03-07** (observability stack, profiling como pilar adjacente a logs/metrics/traces), **03-10** (backend perf patterns broader), **04-09** (scaling, capacity planning profile-driven).

---

### 2.20 Node 24 features 2026 — Permission Model GA, native test runner, type stripping, node:sqlite, WebSocket, --watch, SEA

Node passou por renaissance 2024-2026. Bun 1.2 (Q1 2026) e Deno 2.x (Q4 2024) pressionaram o ecossistema com batteries-included: test runner nativo, TS sem build, SQLite embedded, WebSocket client, watch mode. Node 22 LTS (Apr 2024) e **Node 24 LTS (Apr 2025)** responderam absorvendo essas features no core — Permission Model GA, node:test mature, --experimental-strip-types, node:sqlite, native WebSocket stable, --watch + --env-file. Resultado: razões pra adotar runtime alternativo encolheram. Bun ainda vence em startup + bundle (cold start ~3x mais rápido), Deno em security-by-default + URL imports. Node vence em compat + ecossistema + LTS previsível. Node 25 Current (Q4 2025) traz V8 13.x com Maglev mais maduro (já em Node 22 com V8 12.4, ~5-15% throughput em hot paths sintéticos).

#### Permission Model GA (Node 24)

Sandbox granular no runtime — sem container/SELinux. Defesa-em-profundidade contra supply-chain attack (lib maliciosa em node_modules tentando ler `~/.aws/credentials` ou abrir socket pra C2).

```bash
# Sem permission model: lib pode ler tudo, abrir socket pra qualquer host
node app.js

# Com permission model (Node 24 GA — sem --experimental)
node --permission \
  --allow-fs-read=./data,./config \
  --allow-fs-write=./logs,./tmp \
  --allow-net=api.stripe.com:443,postgres-internal:5432 \
  --allow-child-process \
  --allow-worker \
  app.js
```

API runtime pra checar:

```js
import { permission } from 'node:process';

if (!permission.has('fs.read', '/etc/passwd')) {
  throw new Error('FS read denied — esperado');
}
```

**Custo**: ~5-10% overhead em workload syscall-heavy (FS scan, muitas conexões). Worker threads herdam permissions do parent. Node addons nativos (`.node`) bloqueados por default — `--allow-addons` libera (cuidado: addon bypassa o modelo).

**Production hardening**: rode workers Cloud Run / Kubernetes com `--permission --allow-fs-read=/app --allow-net=postgres-internal:5432,redis-internal:6379`. Postmortem-friendly: tentativa de ler `/etc/shadow` lança `ERR_ACCESS_DENIED` com stack trace, não silently succeeds.

#### Native test runner mature (node:test, Node 22+)

Zero-config, pure ESM, sem dep externa. API estilo Mocha/Jest familiar.

```js
// test/user.test.js
import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createUser } from '../src/user.js';

describe('createUser', () => {
  let db;

  before(async () => { db = await openTestDb(); });
  after(async () => { await db.close(); });

  it('creates user with hashed password', async () => {
    const user = await createUser(db, { email: 'a@b.com', password: 'p' });
    assert.equal(user.email, 'a@b.com');
    assert.notEqual(user.password, 'p'); // hashed
  });

  it('mocks external API', async (t) => {
    const fetchMock = t.mock.method(global, 'fetch', async () => ({
      ok: true, json: async () => ({ valid: true })
    }));
    await createUser(db, { email: 'x@y.com', password: 'p' });
    assert.equal(fetchMock.mock.callCount(), 1);
  });
});
```

```bash
node --test --test-reporter=spec test/
node --test --experimental-test-coverage  # built-in coverage Node 22+
node --test --watch                        # re-roda em mudança
```

**Quando usar node:test vs vitest**: node:test vence em projeto **pure ESM monorepo backend** sem Vite (zero-config, ~2x faster cold start em suites pequenas <50 testes, sem `vitest.config.ts` pra manter). Vitest vence em **frontend / fullstack com Vite** (HMR test, browser mode, jsdom integrado, snapshot mais maduro, plugin ecosystem). Não migre vitest funcional pra node:test só por modismo — custo de migração > benefício.

#### Type stripping --experimental-strip-types (Node 22.6+)

Roda `.ts` direto, sem `tsc` / `tsx` / `ts-node`. Apenas remove tipos — não transpila enum, namespace, parameter properties, decorators legacy.

```bash
node --experimental-strip-types src/server.ts

# Com transform (suporta enum, namespace — Node 22.7+)
node --experimental-transform-types src/server.ts
```

**Limitação crítica**: `enum Color { Red, Green }` em `--strip-types` puro = **silent miscompile** (vira nada, runtime error em uso). Use `--experimental-transform-types` ou prefira union literal `type Color = 'red' | 'green'`. Declaration merging, parameter properties (`constructor(private x: number)`), `import = require()` também não suportados em strip puro.

**Quando usar**: scripts internos, CLIs, dev/test loop rápido. **Não use em prod com bundle complexo** — esbuild/swc são mais rápidos em suites grandes e suportam tudo. Útil pra eliminar `tsx` em `package.json` scripts simples.

#### node:sqlite (Node 22+)

SQLite embedded no core. Sem build native (`better-sqlite3` requer Python + node-gyp em CI). Synchronous API.

```js
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('cache.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_expires ON sessions(expires_at);
`);

const insert = db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)');
insert.run('sess_abc', 42, Date.now() + 3600_000);

const get = db.prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > ?');
const session = get.get('sess_abc', Date.now());
```

**Use em**: cache local de CLI tool, embedded config DB, dev fixtures, test isolation. **Não use em**: banco compartilhado entre processos (single-process write lock — use Postgres), workload write-heavy concorrente (better-sqlite3 ainda ~10-20% mais rápido em micro-benchmarks).

#### Built-in WebSocket client (Node 22+ stable)

API Web standard — mesma do browser. Elimina `ws` lib pra cliente.

```js
const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');

ws.addEventListener('open', () => console.log('connected'));
ws.addEventListener('message', (ev) => {
  const trade = JSON.parse(ev.data);
  console.log(trade.p, trade.q);
});
ws.addEventListener('close', (ev) => console.log('closed', ev.code));
ws.addEventListener('error', (err) => console.error(err));
```

**Limitação**: **sem auto-reconnect**, sem heartbeat/ping built-in, sem subprotocol negotiation avançada. Pra prod com reconexão exponential backoff + ping/pong, ainda precisa wrapper (ou `ws` lib pra server-side). Use built-in pra clients simples + scripts.

#### Watch mode + env-file

```bash
node --watch --env-file=.env src/server.js
node --watch-path=./src --watch-path=./config src/server.js
```

`--watch` substitui `nodemon`. `--env-file=.env` substitui `dotenv` (parser simples — `KEY=value`, sem expansion `${OTHER_VAR}` em `.env` por default; Node 22+ aceita `--env-file-if-exists`). **Não use --watch em prod** — filewatcher overhead + restart loop em log rotation.

#### Single Executable Apps (SEA)

Bundle JS + Node runtime em 1 binário. Distribui CLI sem requerir Node instalado.

```json
// sea-config.json
{
  "main": "dist/cli.js",
  "output": "sea-prep.blob",
  "disableExperimentalSEAWarning": true
}
```

```bash
node --experimental-sea-config sea-config.json
cp $(command -v node) my-cli
npx postject my-cli NODE_SEA_BLOB sea-prep.blob \
  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
./my-cli  # standalone binary ~80MB
```

**Limitação**: addons nativos (`.node`) limitados (top-level require de `.node` não funciona em SEA stable). Use pra CLI puro JS. Alternativa: `pkg` (deprecated), `bun build --compile` (Bun ~6MB binary, vence Node ~80MB).

#### npm 11 (2025+)

Workspaces protocol (`"dep": "workspace:*"`), install perf melhorada, `npm audit signatures` por default. Pin no `package.json`:

```json
{
  "engines": { "node": ">=22.0.0", "npm": ">=11.0.0" },
  "packageManager": "npm@11.0.0"
}
```

CI sem pin: usa npm bundled com Node version do runner — pode ser npm 8/9 e quebrar workspaces protocol.

#### Stack Logística aplicada

- Workers Cloud Run com `node --permission --allow-fs-read=/app --allow-net=postgres-internal:5432,redis-internal:6379 dist/worker.js` — supply-chain defense.
- Unit tests em `node:test` (backend pure ESM monorepo) — eliminou vitest config, CI ~30% mais rápido em cold start. E2E continua Playwright.
- `node:sqlite` em CLI interna de batch reprocess — embedded cache de mapeamentos, sem subir Postgres local.
- `--watch --env-file=.env` em dev — eliminou `nodemon` + `dotenv`.
- WebSocket built-in pra script de monitor de filas RabbitMQ Management (HTTP polling fallback) — sem `ws` dep.

#### 10 anti-patterns

1. `--permission` sem `--allow-fs-*` em workload com FS legítimo — `ERR_ACCESS_DENIED` em runtime, postmortem barulhento.
2. `--experimental-strip-types` em código com `enum` — silent miscompile, NaN/undefined em runtime. Use `--experimental-transform-types` ou union literal.
3. Migrar vitest funcional pra `node:test` em projeto frontend — perde browser mode, jsdom, HMR test. Custo > benefício.
4. `node:sqlite` pra banco compartilhado entre múltiplos processos — single-writer lock, contention. Use Postgres.
5. Built-in WebSocket client em prod sem wrapper de reconnect/heartbeat — desconexão silenciosa, mensagens perdidas.
6. `--watch` em prod (Docker, systemd) — filewatcher overhead + restart loop em log rotation, port-already-in-use.
7. SEA pra app com native modules (`sharp`, `better-sqlite3`, `bcrypt`) — `.node` addons não funcionam stable em SEA.
8. `package.json` sem `engines.npm` em projeto com workspaces protocol — CI usa npm bundled (8/9), `workspace:*` quebra.
9. `node --permission --allow-net=*` (wildcard amplo) — anula o modelo, vira teatro de segurança.
10. Strip-types em prod sem bundler — sem tree-shaking, sem minify, sem source map mature. Use esbuild/swc/tsc pra build, strip-types pra dev/scripts.

#### Cruza com

**02-07 §2.7** (streams sob fetch nova — Web Streams API mainstreamed Node 22+), **§2.9** (worker_threads herdam permission model), **§2.14** (AsyncLocalStorage relevante a permission scoping por request), **§2.17** (Node vs Bun vs Deno — Node 24 fechou maioria dos gaps), **§2.18** (worker_threads + cluster), **03-01** (testing — node:test categoria backend pure), **03-08** (security — Permission Model é defense-in-depth contra supply-chain), **03-04** (CI/CD — `engines.npm` + Node version pinning em workflow), **03-02** (Docker — distroless + SEA como alternativa de distribuição).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Listar as 6 fases do event loop em ordem.
- Explicar onde nextTick e microtasks rodam relativamente às fases.
- Distinguir thread pool e kernel async (epoll/kqueue) e dizer quais APIs usam cada.
- Predizer output de programa misturando setTimeout, setImmediate, Promise, nextTick.
- Explicar backpressure em streams e como `pipeline` resolve.
- Distinguir cluster, worker_threads, child_process e dar caso pra cada.
- Escrever shutdown gracioso completo de servidor HTTP.
- Diferenciar CJS de ESM em 4 pontos.
- Diagnosticar event loop lag: o que medir, o que pode causar.
- Explicar o que `AsyncLocalStorage` resolve e seu custo.

---

## 4. Desafio de Engenharia

Construir o **Logística API v0**: backend simples mas com diagnóstico forte.

### Especificação

1. **Stack**:
   - Node 22+ LTS.
   - TypeScript.
   - Sem framework HTTP, use módulo `http` direto (vamos abstrair em 02-08).
   - Postgres opcional (pode ser SQLite); foco aqui é Node, não DB.
2. **Endpoints** (REST mínimo):
   - `POST /orders` cria pedido.
   - `GET /orders` lista pedidos paginados.
   - `GET /orders/:id` detalhe.
   - `POST /orders/:id/events` adiciona evento (status update).
   - `GET /orders/:id/stream` retorna stream NDJSON dos eventos do pedido (resposta gerada via `Readable`).
3. **Streaming real**:
   - Endpoint de export `GET /orders/export.csv` deve gerar CSV streaming via `pipeline` sem carregar tudo em memória, mesmo com 100k pedidos.
4. **Worker thread**:
   - Endpoint `POST /reports/heatmap` recebe range de datas, dispara cálculo CPU-bound (simule com `crypto.scrypt` ou loop matemático) em **worker thread**, retorna 202 com job id, e cliente faz polling em `GET /reports/:id` até pronto.
5. **Graceful shutdown**:
   - `SIGTERM` para aceitar conexões, espera ≤ 10s pelas em curso, fecha DB pool, sai com 0.
6. **AsyncLocalStorage**:
   - Cada request gera `requestId` (UUID).
   - Logger usa ALS pra incluir `requestId` em toda linha.
7. **Observability**:
   - Endpoint `GET /healthz` retorna 200 se Postgres responde a `SELECT 1`.
   - Endpoint `GET /metrics` (texto Prometheus simples) com:
     - `event_loop_lag_seconds` (medido com `monitorEventLoopDelay` ou hr time loop).
     - `process_resident_memory_bytes`.
     - `http_requests_total{route, status}`.

### Restrições

- Sem Express/Fastify/Koa.
- Sem ORM (queries SQL puras).
- Sem `child_process.exec`.

### Threshold

- README mostra:
  - Diagrama do event loop com onde cada handler "vive".
  - Resultado de `clinic doctor` durante load test (ex: `autocannon`), anotar event loop lag, latência p50/p99.
  - 1 caso real onde você quebrou backpressure (escreveu sem esperar drain) e como notou na memória.
  - Demonstração de shutdown: `kill -TERM <pid>` durante request em curso, comportamento.
- Endpoint de export sustenta 100k linhas com memória estável (< 200 MB RSS).

### Stretch

- Cluster com 4 workers, master fazendo round-robin.
- `MessageChannel` entre worker thread e main pra job progress.
- Profile com `--prof` e converta em flame graph.
- AbortController em todo handler pra cancelar trabalho quando cliente desconecta.

---

## 5. Extensões e Conexões

- Liga com **01-02** (OS): processes, threads, signals, file descriptors. Node é syscall wrapper de luxo.
- Liga com **01-03** (networking): TCP socket APIs, HTTP parser, keep-alive.
- Liga com **01-07** (JS deep): event loop, microtasks, Promise, Node é JS runtime.
- Liga com **02-08** (frameworks): Express/Fastify/Hono são camadas sobre `http` que vimos aqui.
- Liga com **02-09** (Postgres): `pg` lib usa libuv/network; pool de conexões em event loop.
- Liga com **02-14** (real-time): WebSocket no Node usa `net`/`http` upgrade.
- Liga com **03-01** (testes): node:test (built-in) ou Vitest no backend.
- Liga com **03-07** (observability): event loop lag é métrica core.
- Liga com **03-10** (perf backend): clinic.js, profiles, flame graphs, GC tuning.

---

## 6. Referências

- **Node.js docs** ([nodejs.org/api](https://nodejs.org/api/)), leia HTTP, Stream, Cluster, Worker Threads, Process inteiros.
- **"Don't Block the Event Loop"**: guide oficial ([nodejs.org/en/docs/guides/dont-block-the-event-loop](https://nodejs.org/en/docs/guides/dont-block-the-event-loop)).
- **Bert Belder, "The Event Loop"**: talk clássica.
- **"Node.js Design Patterns"**: Mario Casciaro & Luciano Mammino.
- **clinic.js docs** ([clinicjs.org](https://clinicjs.org/)).
- **libuv docs** ([docs.libuv.org](http://docs.libuv.org/)), quando quiser ir fundo no C.
- **Daniel Khan, Node.js Application Performance** (StrongLoop / IBM blog histórico).
