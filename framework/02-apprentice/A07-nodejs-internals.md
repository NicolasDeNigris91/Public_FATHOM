---
module: A07
title: Node.js Internals — libuv, Event Loop, Streams, Workers
stage: apprentice
prereqs: [N07]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# A07 — Node.js Internals

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
- Object shapes (Hidden Classes) — adicionar properties em ordem consistente ajuda V8 a reusar inline caches.
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

Por isso `process.nextTick` em loop infinito **bloqueia o event loop inteiro** — ele drena antes de qualquer fase rodar.

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

(Ordem entre `setTimeout 0` e `setImmediate` é menos determinística fora de I/O — em I/O callback, `setImmediate` sempre vence.)

### 2.5 Thread pool (libuv)

Algumas operações bloqueariam o thread JS, então libuv as offload pra thread pool:
- `fs.*` (a maioria, exceto `fs.watch`).
- `dns.lookup` (não os outros DNS APIs).
- `crypto.pbkdf2`, `crypto.scrypt` etc.
- `zlib` (compressão).

Default: **4 threads**. Variável: `UV_THREADPOOL_SIZE` (até 1024). Aumentar ajuda CPU-bound APIs em paralelo, mas só faz sentido se você tem CPUs.

I/O de **rede** (TCP, UDP) **não usa thread pool** — usa kernel async (epoll/kqueue/IOCP). Por isso Node escala bem em rede mesmo com pool default pequeno.

### 2.6 Buffers e binary data

`Buffer` é a estrutura de Node pra dados binários. Wrap de `Uint8Array` com APIs extras (`toString('hex')`, etc.). 

- `Buffer.alloc(n)` — zerado, seguro.
- `Buffer.allocUnsafe(n)` — não zerado, mais rápido, mas pode vazar memória de processos anteriores se você não sobrescrever.
- `Buffer.from(string, encoding)` — converte.

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
- `'exit'` — quando event loop esvazia.
- `'beforeExit'` — antes de exit, ainda dá pra agendar trabalho.
- `'uncaughtException'` — última chance antes de crashar (você deve **logar e sair**, não recuperar; estado do app pode estar corrompido).
- `'unhandledRejection'` — promise sem `.catch`. Em Node 15+ default é abortar processo.

`child_process`:
- `spawn(cmd, args)` — processo separado, stdio em streams. Use pra processos longos.
- `exec(cmd)` — stdout/stderr em buffer (limite default ~1 MB; cuidado).
- `fork(file)` — fork especializado pra outro Node script, com canal IPC (`process.send`).

Cada processo tem PID separado, memória separada, kernel scheduler decide.

### 2.9 Worker Threads

`worker_threads` (estável desde Node 12) dá threads JS reais com isolated V8 isolates, mas mesmo processo. Comunicam via `MessageChannel`/`postMessage` (structured clone) ou `SharedArrayBuffer`.

Use cases:
- CPU-bound JS (parsing, criptografia heavy, cálculo).
- Não use pra I/O — main thread já lida bem com I/O via libuv.

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

Pra HTTP/Express: `server.close` espera conexões keep-alive — pode ser necessário forçar timeout. Libs como `stoppable` ajudam.

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
- **clinic.js** (Doctor, Flame, Bubbleprof) — toolkit pra análise de event loop, latência, async.
- `0x` — flame graph generator.
- **Async stack traces** (`--async-stack-traces` default) — stack inclui caminho cross-await.

Sintomas comuns:
- Latência crescente sob carga → event loop lag → `clinic doctor` ou medir `event-loop-lag`.
- Memória crescente → heap profile, comparar snapshots.
- 100% CPU → flame graph, achar função quente.
- App não morre após `Ctrl+C` → handle/refs ainda abertos. `process._getActiveHandles()` debug.

### 2.17 Node vs Bun vs Deno — comparação real (2026)

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
- **Scripts**, ferramentas internas, **build pipelines** — startup rápido importa.
- **Test suite grande**: `bun test` é 5-10x mais rápido que Jest.
- **Bundling de aplicação** — substitui esbuild/Vite em alguns casos.
- **Dev experience**: `bun --hot` reinicia em milissegundos vs segundos.
- Em produção: ainda emergente, mas Cloudflare Workers e várias startups estão em produção. Compat com `node:` modules ~95% — testar caso específico.

**Quando escolher Deno:**
- **Edge functions / serverless** (Deno Deploy nativo, Supabase Functions usa Deno).
- **Scripts onde permissions importam** — automação que toca rede/disco em CI ganha audit fácil.
- **Projetos novos sem legacy npm**, quando o time topa URL-imports.
- **Workspace TS isolado**: zero config TS é genuinamente bom.

**Pegadinhas reais:**
- **Bun**: alguns workers/cluster patterns Node não funcionam ainda. APM tools (DataDog, NewRelic) tem agentes Bun mas defasados.
- **Deno 2.x**: ganhou compat npm dramatic em 2024. Ainda assim, libs que assumem `__dirname`/CommonJS quebram. ESM-only é decisão consciente.
- **Bun em produção**: já tem horror stories — memory leak em alguns cases de stream HTTP. Node tem 10 anos de patches em corner cases que Bun ainda vai descobrir.

**Veredicto pragmático 2026:**
- **Backend produção crítico**: Node. Mude quando Bun atingir paridade vendor-support em 2027+.
- **Tools/scripts/CI**: Bun. Vale a velocidade.
- **Edge/serverless novo**: Deno ou Bun, depende de plataforma.
- **Em time mixed**: padronize um. Coexistência custa onboarding.

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

Construir o **Logística API v0** — backend simples mas com diagnóstico forte.

### Especificação

1. **Stack**:
   - Node 22+ LTS.
   - TypeScript.
   - Sem framework HTTP — use módulo `http` direto (vamos abstrair em A08).
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
  - Resultado de `clinic doctor` durante load test (ex: `autocannon`) — anotar event loop lag, latência p50/p99.
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

- Liga com **N02** (OS): processes, threads, signals, file descriptors. Node é syscall wrapper de luxo.
- Liga com **N03** (networking): TCP socket APIs, HTTP parser, keep-alive.
- Liga com **N07** (JS deep): event loop, microtasks, Promise — Node é JS runtime.
- Liga com **A08** (frameworks): Express/Fastify/Hono são camadas sobre `http` que vimos aqui.
- Liga com **A09** (Postgres): `pg` lib usa libuv/network; pool de conexões em event loop.
- Liga com **A14** (real-time): WebSocket no Node usa `net`/`http` upgrade.
- Liga com **P01** (testes): node:test (built-in) ou Vitest no backend.
- Liga com **P07** (observability): event loop lag é métrica core.
- Liga com **P10** (perf backend): clinic.js, profiles, flame graphs, GC tuning.

---

## 6. Referências

- **Node.js docs** ([nodejs.org/api](https://nodejs.org/api/)) — leia HTTP, Stream, Cluster, Worker Threads, Process inteiros.
- **"Don't Block the Event Loop"** — guide oficial ([nodejs.org/en/docs/guides/dont-block-the-event-loop](https://nodejs.org/en/docs/guides/dont-block-the-event-loop)).
- **Bert Belder, "The Event Loop"** — talk clássica.
- **"Node.js Design Patterns"** — Mario Casciaro & Luciano Mammino.
- **clinic.js docs** ([clinicjs.org](https://clinicjs.org/)).
- **libuv docs** ([docs.libuv.org](http://docs.libuv.org/)) — quando quiser ir fundo no C.
- **Daniel Khan, Node.js Application Performance** (StrongLoop / IBM blog histórico).
