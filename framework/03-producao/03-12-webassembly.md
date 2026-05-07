---
module: 03-12
title: WebAssembly, Linear Memory, Modules, Components, WASI, Edge
stage: producao
prereqs: [03-11]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 03-12, WebAssembly

## 1. Problema de Engenharia

Wasm chegou em 2017 prometendo "código nativo no browser". Em 2026, virou portable runtime: edge functions, plugins, sandboxing seguro, processamento near-native em browser e servidor. Devs ainda confundem com "alternativa a JS no front", mas o uso real está em edge runtimes (Cloudflare, Fastly), em libs heavy (Figma, AutoCAD Web, FFmpeg.wasm), em plug-in systems (Envoy filters, Suborbital).

Este módulo é Wasm como engenheiro full-stack precisa: arquitetura, linear memory, instâncias, bindings, WASI (Wasm fora do browser), Component Model, runtimes (browser, wasmtime, Wasmer, edge). Construir 1 use case real onde Wasm vence outras opções.

---

## 2. Teoria Hard

### 2.1 O que é Wasm

Standard W3C. Bytecode estruturado, tipado, executável em sandbox. Compile target pra Rust, C/C++, Go, AssemblyScript, Zig, etc.

Características:
- **Portable**: roda em browser e fora.
- **Fast**: near-native (compilado JIT/AOT).
- **Safe**: sandbox memory; sem syscalls direto.
- **Compact**: binário pequeno comparado a JS minified.

Não substitui JS em UI, Wasm não tem DOM access direto. Vence em **cálculo intenso** delegated.

### 2.2 Linear memory

Wasm module tem `memory`: array contíguo de bytes. Lê/escreve via instructions. Sem heap typed: você gerencia malloc/free no nível alto (Rust faz transparente).

Limite default: 4 GB (32-bit). Wasm 64 (64-bit memory) crescendo.

JS interop: `WebAssembly.Memory` é ArrayBuffer compartilhada. Funções Wasm recebem pointers (u32) que são offsets na memory. JS escreve dados na memory antes da call, lê depois.

### 2.3 Modules e instances

- **Module**: artefato compilado (`.wasm`).
- **Instance**: módulo + memory + imports concretos.
- **Imports**: funções que JS provê (ex: `console.log`).
- **Exports**: funções que Wasm provê.

```js
const wasmBytes = await fetch('module.wasm').then(r => r.arrayBuffer());
const { instance } = await WebAssembly.instantiate(wasmBytes, {
  env: { log: (n) => console.log(n) }
});
const result = instance.exports.add(1, 2);
```

### 2.4 Tipos

Original: `i32`, `i64`, `f32`, `f64`. Apenas escalares.

**Reference types** (2022+): `funcref`, `externref`. Wasm pode segurar referências JS opacas.

**Component Model** (em maturação): higher-level types, strings, lists, records, variants. Bindings auto-gerados de WIT (Wasm Interface Type).

### 2.5 Toolchains

**Rust**:
- `cargo build --target wasm32-unknown-unknown`, vanilla Wasm.
- `wasm-bindgen`, `wasm-pack`, auto-generate JS bindings.
- `wit-bindgen`, Component Model.

**C/C++**:
- Emscripten, full POSIX-ish in browser, com runtime grande.
- WASI SDK, Wasm pra runtime non-browser.

**Go**: suporte improving. `tinygo` produz binários menores que Go default. Go 1.21+ tem `wasip1` target.

**AssemblyScript**: TS-like syntax compilada pra Wasm. Bom pra workloads simples; ecossistema menor.

**Zig**: first-class Wasm target.

### 2.6 WASI

WASI (WebAssembly System Interface): "POSIX pra Wasm". Permite Wasm fora do browser fazer I/O (filesystem, sockets, env vars).

**WASI Preview 1** estável; **Preview 2** com Component Model evoluindo.

Capability-based: módulo recebe handles (file descriptors, sockets), não acessa "global" sistema. Sandbox forte.

Roda em: wasmtime, Wasmer, WasmEdge, Spin, browsers via polyfills (limited).

#### Rust → wasm-pack pra browser, fluxo completo

Cenário: Logística precisa parsing pesado de relatórios CSV/PDF no client (privacy: dados não saem do browser). JS é lento pra parse de 100MB+; Rust + Wasm é 5-30x mais rápido.

**Setup:**
```bash
cargo install wasm-pack
mkdir logistics-parser && cd $_
cargo init --lib
```

```toml
# Cargo.toml
[package]
name = "logistics-parser"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"
serde = { version = "1.0", features = ["derive"] }
serde-wasm-bindgen = "0.6"
csv = "1.3"
js-sys = "0.3"

[profile.release]
opt-level = "z"          # otimiza por tamanho (Wasm download importa)
lto = true
codegen-units = 1
strip = true
```

```rust
// src/lib.rs
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct OrderStat {
    pub day: String,
    pub orders: u32,
    pub revenue: f64,
}

#[wasm_bindgen]
pub fn parse_orders_csv(csv_data: &[u8]) -> Result<JsValue, JsValue> {
    let mut reader = csv::Reader::from_reader(csv_data);
    let mut by_day: std::collections::HashMap<String, (u32, f64)> = Default::default();

    for record in reader.records() {
        let r = record.map_err(|e| JsValue::from_str(&e.to_string()))?;
        let day = r.get(0).unwrap_or("").to_string();
        let total: f64 = r.get(2).and_then(|s| s.parse().ok()).unwrap_or(0.0);
        let entry = by_day.entry(day).or_insert((0, 0.0));
        entry.0 += 1;
        entry.1 += total;
    }

    let stats: Vec<OrderStat> = by_day.into_iter()
        .map(|(day, (orders, revenue))| OrderStat { day, orders, revenue })
        .collect();

    serde_wasm_bindgen::to_value(&stats).map_err(|e| e.into())
}
```

**Build:**
```bash
wasm-pack build --target bundler --release
# Output: pkg/logistics_parser_bg.wasm + pkg/logistics_parser.js (TS bindings)
```

**Uso no Next.js (Client Component):**
```tsx
'use client';
import init, { parse_orders_csv } from 'logistics-parser';

let initialized = false;

export function ReportUploader() {
  return <input type="file" accept=".csv" onChange={async (e) => {
    if (!initialized) { await init(); initialized = true; }

    const file = e.target.files?.[0];
    if (!file) return;
    const buf = new Uint8Array(await file.arrayBuffer());

    const start = performance.now();
    const stats = parse_orders_csv(buf);
    console.log(`Parsed ${file.size} bytes in ${performance.now() - start}ms`, stats);
  }} />;
}
```

**Bench típico** (100MB CSV em laptop M3): JS papaparse ~12s; Wasm Rust ~800ms. **15x speedup**, sem upload pro server.

#### Component Model + WIT bindings (Preview 2, future)

WIT (WebAssembly Interface Types) define **interfaces tipadas entre componentes** sem JS↔Wasm glue manual. Permite Rust component chamar JS component (ou Python, Go) com type safety bidirecional.

```wit
// logistics.wit
package fathom:logistics;

interface parser {
  record order-stat {
    day: string,
    orders: u32,
    revenue: f64,
  }

  parse-csv: func(data: list<u8>) -> result<list<order-stat>, string>;
}

world parser-host {
  export parser;
}
```

```bash
cargo install cargo-component
cargo component build --release
# Gera componente Wasm com interface explícita
```

Component Model permite **composição**: parser Rust + ML model Python + UI glue JS, todos rodando em mesmo runtime (wasmtime, jco), comunicando via WIT-typed calls. Em 2026, ainda emergente em browser; production-ready em runtimes server-side (Spin, wasmCloud).

#### Edge / serverless deploy real

```bash
# Spin (Fermyon) — serverless Wasm
spin new -t http-rust logistics-edge
cd logistics-edge
spin build
spin up                   # local
spin deploy               # Fermyon Cloud
```

Cold start ~1-5ms (vs Lambda Node ~200-1000ms). Memory footprint ~5MB (vs Node ~50MB). Bilhado por ms de execução real (não wall clock).

#### Caveats que mordem

- **JS↔Wasm boundary cost**: cada `parse_orders_csv()` chamada custa ~10-50µs de overhead de marshaling. Não chame em loop apertado; passe lote grande.
- **DOM access**: Wasm não toca DOM; tudo via JS bindings. Image processing OK; UI rendering ainda JS.
- **Bundle size**: Wasm binary minimal Rust ~15-30KB; com serde + libs sobe pra 100-300KB. `wasm-opt -Oz` reduz mais.
- **Async em Wasm**: suportado via `wasm-bindgen-futures` mas surface ainda menor que JS-native.
- **Debug**: source maps Wasm imaturo; debugger Chrome DevTools melhorou em 2024-2026 mas ainda inferior a JS pure debugging.

Cruza com **03-11** (Rust ecosystem source), **03-09 §2.6.1** (edge runtimes podem rodar Wasm directamente), **04-10 §2.14** (inference em Wasm como alternativa offline / privacy-preserving).

### 2.7 Browser uses

- **Heavy compute**: compressão, encoding video/audio, parsing massivo, ML inference (ONNX Runtime Web, TensorFlow.js Wasm backend).
- **Game engines**: Unity, Unreal targetam Wasm.
- **Apps complexos**: Figma, Photopea, AutoCAD Web.
- **Crypto**: implementations puras Wasm.
- **Data tools**: DuckDB-Wasm, SQLite-Wasm.

Bottlenecks: tamanho de download, JS↔Wasm boundary cost (cada cross-call custa), DOM operations ainda via JS.

### 2.8 Edge / serverless uses

- **Cloudflare Workers**: JS + Wasm; Wasm como inner code optimization.
- **Fastly Compute@Edge**: Wasm como primary runtime. Roda Rust, AssemblyScript, JS (via QuickJS-Wasm), Go.
- **wasmCloud**, **Spin (Fermyon)**: Wasm-first runtimes.
- **Suborbital, wasmer-cli**.

Por que Wasm em edge:
- Cold start sub-ms (vs Lambda 100ms+).
- Sandbox forte: multi-tenant seguro.
- Multi-language sem múltiplos runtimes.
- Tamanho pequeno (~MB) deployable globalmente.

### 2.9 Plug-in systems

App permite extensão por terceiros. Wasm é vehicle ideal:
- **Sandbox**: plug-in não acessa filesystem nem rede sem ports explicit.
- **Polyglot**: extensions em Rust, AssemblyScript, etc.
- **Performance**: near-native.

Exemplos:
- **Envoy Wasm filters**: middlewares custom em proxy.
- **OPA Wasm**: policies compiled.
- **Shopify Functions**: extensões merchant-side.
- **Vector / Fluent**: transforms Wasm.

### 2.10 Component Model

Próxima geração (2024-2026). Permite:
- Componentes múltiplos compose-able.
- Tipos rich (string, list, record, variant) cross-language.
- WIT (Wasm Interface Type) descreve interfaces declarativamente.

Visão: ecossistema "npm pra Wasm" agnóstico de linguagem. Em 2026, ainda em maturação; Spin/Fermyon/Bytecode Alliance liderando.

### 2.11 Performance expectations

Wasm é tipicamente:
- **Startup**: ms a sub-ms.
- **Throughput**: 80-110% de native otimizado (cargo --release vs Wasm cargo, é fechado).
- **JS interop**: cada call cross-boundary é ~10s ns. Loop apertado de small calls é caro; move dados em batch.

Pra cálculos com data passing pequeno, Wasm vence JS por 5-50x. Pra workloads dominados por DOM ou string manipulation, JS pode vencer (engine V8 já é otimizada pra isso).

### 2.12 Debugging

- **DevTools**: source maps Wasm (Rust → Wasm com debug info funcional).
- **`console.log` via imports**.
- **wasmtime profiling**.
- **Tracing**: tracing crate em Rust mais OTel.

### 2.13 Bundle e size

- LTO (`lto = true` em Cargo.toml).
- `opt-level = "z"` minimiza tamanho.
- `wasm-opt` (binaryen) post-process.
- Strip debug.
- Avoid alloc onde possível (#![no_std] em alguns casos).

Meta: módulos Wasm úteis em 50 KB - 500 KB. Big libs (FFmpeg.wasm) 20+ MB.

### 2.14 Limitações atuais

- Threads via `SharedArrayBuffer` exigem CORS/COEP headers (browser).
- SIMD parcial (Wasm SIMD 128-bit).
- GC integrado em maturação (WasmGC, default Chrome 119+).
- Tail calls, exception handling proposals em progresso.

### 2.15 Quando Wasm é certo

- Hot path de cálculo (parsing, encoding, encryption).
- Algoritmo já em C/C++/Rust que você quer no browser.
- Plug-in system multi-tenant.
- Edge runtime com cold start critical.
- Polyglot serverless.

### 2.16 Quando Wasm é errado

- App típico de UI: JS resolve.
- Backend regular: Node/Go já entrega.
- Equipe sem competência Rust/C: complexidade não compensa.

### 2.17 Component Model + WASI Preview 2 deep (composability + capability-based security)

Component Model (W3C 2024+, stable em wasmtime 19+, wasmer 5+, JCO 1+) e WASI Preview 2 (estável 2024+) eliminam o ABI shimming manual e dão sandbox capability-based real. Trate-os como o default pra Wasm server-side novo.

**Core Wasm vs Component Model.** Core Wasm expõe linear memory + escalares (`i32/i64/f32/f64`). String cruzando boundary = `(ptr, len)` na memory; cada linguagem reescreve o ABI shim (`wasm-bindgen` no JS, equivalente em Go/Python). Component Model adiciona uma camada de tipos: `string`, `list<T>`, `record`, `variant`, `option<T>`, `result<T,E>` cruzam sem shim manual. **WIT** (Wasm Interface Type) é a IDL declarativa; `wit-bindgen` gera bindings em Rust/Go/JS/Python. **Composition** via `wac compose` liga componentes — A imports `wasi:http/incoming-handler` que B exports — produzindo binário único type-checked.

**WIT example completo (Logística — routing engine como componente):**

```wit
package logistica:routing@1.0.0;

interface types {
  record waypoint { lat: f64, lng: f64, demand: u32 }
  record route { stops: list<u32>, distance-km: f64, duration-min: f64 }
  variant route-error { no-feasible-solution, timeout, invalid-input(string) }
}

interface solver {
  use types.{waypoint, route, route-error};
  solve: func(stops: list<waypoint>, max-duration-min: u32) -> result<list<route>, route-error>;
}

world routing-engine {
  export solver;
  import wasi:logging/logging;
}
```

`world` define o conjunto de imports/exports do componente. `solver` é exportada; `wasi:logging` é importada (host fornece). Generation: `wit-bindgen rust --world routing-engine routing.wit` produz Rust com types + traits que o crate implementa.

**WASI Preview 2 surface.** Standard interfaces de capability: `wasi:filesystem/types`, `wasi:http/incoming-handler`, `wasi:http/outgoing-handler`, `wasi:cli/run`, `wasi:sockets/tcp`, `wasi:logging/logging`, `wasi:io/streams`. Componente NÃO tem ambient authority — host explicitly grants `(filesystem-fd, "/data")` ou `(http-handler, "api.example.com")`. Malicious code sem fs grant NÃO consegue ler `/etc/passwd` mesmo sob exploit. Implementações: wasmtime (reference, Apache 2.0), Fastly Compute@Edge (Preview 2 + Fastly imports), Wasmer Edge, Cosmonic.

**`wasi:http/incoming-handler` — server endpoint via Wasm:**

```rust
wit_bindgen::generate!({ world: "wasi:http/proxy" });

struct LogisticaApi;

impl exports::wasi::http::incoming_handler::Guest for LogisticaApi {
  fn handle(req: IncomingRequest, resp_out: ResponseOutparam) {
    let path = req.path_with_query().unwrap_or("/".into());
    let body = format!(r#"{{"path":"{}"}}"#, path);
    let resp = OutgoingResponse::new(Headers::new());
    resp.set_status_code(200).unwrap();
    resp.body().unwrap().write_all(body.as_bytes()).unwrap();
    ResponseOutparam::set(resp_out, Ok(resp));
  }
}

export!(LogisticaApi with_types_in wit_bindgen);
```

O mesmo `.wasm` corre em wasmtime CLI, Fastly Compute@Edge, Cosmonic, Wasmer Edge sem mudança de código.

**JCO (JavaScript Components).** `npm install -g @bytecodealliance/jco` (1+). `jco transpile routing-engine.wasm -o ./out` gera ES module + `.d.ts` types automaticamente. Browser/Node consomem o componente direto:

```js
import { solver } from './out/routing-engine.js';
const routes = solver.solve(stops, 480);
```

JCO vence `wasm-bindgen` pra cross-language: componente Rust é consumível em Go/Python/JS sem reescrever bindings por linguagem.

**Composition pattern.** Componente A `auth-service` exports `auth.verify-token: func(token: string) -> result<user, error>`. Componente B `orders-service` imports `auth.verify-token` + exports `orders.list`. `wac compose auth-service.wasm orders-service.wasm -o composed.wasm` produz binário único com auth wired in. Vantagem: testar B isoladamente com mock auth componente; trocar auth impl sem rebuild B.

**Logística applied — routing engine WASI HTTP.** Routing engine Rust (do desafio do módulo) compilado pra `wasm32-wasip2` (target WASI Preview 2). Deploy options simultâneos: (1) Fastly Compute@Edge — $0.50/M requests, p99 < 50ms edge global; (2) wasmtime self-hosted em Railway — open-source, mesmo binary; (3) Cosmonic / Wasmer Edge. Single binary roda em 3 runtimes sem mudança. Numbers reais 2026: Rust → component → Fastly: cold start ~0ms (Wasm reusable), p99 ~5ms pra 30 stops VRP solver.

**Limitations 2026.**
- **Multi-threading**: Wasm threads spec experimental; `std::thread` em Rust não funciona portably (rayon-wasm exige hacks).
- **GC integration**: WasmGC stable Chrome/Firefox 2023+ pra browser; servers ainda manual mem mgmt.
- **Async no host**: Component Model async (`stream<T>`, `future<T>`) WIP; estabilização ~2026 mid.
- **Binary size**: componente Rust simples ~500KB-2MB. `wasm-opt -Oz` + LTO + `panic=abort` reduz 30-50%.
- **Debug**: source maps WIP; production debugging difícil hoje.

**Anti-patterns observados.**
- Core Wasm modules + ABI shim manual em vez de Component Model (perde toolchain cross-lang).
- WASI Preview 1 em projeto novo (deprecated; Preview 2 stable).
- Componente importing capability sem permission grant do host (NÃO funciona; host deve grant).
- `wasm-bindgen` em projeto greenfield server-side (browser-only abstraction; use Component Model).
- Compor componentes via host glue code em vez de `wac compose` (perde validation type-checked).
- Binary > 5MB sem `wasm-opt -Oz` (cold start lento + bandwidth desperdiçado).
- Multi-thread expectation em Wasm (spec não-pronta; refactor pra single-thread async).
- Componente WASI HTTP testado só em wasmtime sem Fastly/Wasmer (assume features não-portáveis).

**Cruza com:** [`03-11`](./03-11-systems-languages.md) (Rust → Wasm pipeline), [`02-05`](../02-plataforma/02-05-nextjs.md) (edge functions WASI), [`04-04`](../04-sistemas/04-04-resilience-patterns.md) (sandbox isolation reduz blast radius), [`04-10`](../04-sistemas/04-10-ai-llm.md) (on-device inference via Wasm), [`03-08`](./03-08-applied-security.md) (capability-based security model).

---

### 2.18 Wasm runtimes 2026 — Wasmtime vs Wasmer vs WAMR vs WasmEdge + WASI 0.2/0.3, plugin systems, serverless platforms

O ecosistema de runtimes Wasm maturou entre 2024 e 2026. Wasmtime venceu como reference implementation e hub do Bytecode Alliance; WAMR e WasmEdge dominam embedded e edge AI; Spin, Cosmonic/wasmCloud e Fastly Compute formam a camada serverless gerenciada. Greenfield 2026 = Wasmtime para embedding general-purpose, WasmEdge para K8s + AI inference, WAMR para MCU constrained, Wasmer só com WASIX justification, Spin/Cosmonic para serverless app platform.

**Wasmtime (Bytecode Alliance flagship).** Versão 27 (Q3 2025) introduziu Pulley, interpreter portável para ambientes onde JIT é proibido (iOS, App Store, kernels). Versão 28 (Q1 2026) shipou suporte estável a WASI 0.3 async + integração `wasm-component-ld`. Cranelift como JIT padrão; single-pass compiler `winch` para cold start agressivo. Component Model first-class via `wasmtime-wit-bindgen`. Embedding em Rust, C, Python, Go, .NET. Cold start típico ~1ms; com instance pooling pré-aquecido cai para ~100µs.

```bash
# Wasmtime CLI 28: rodar componente WASI 0.2 com fuel + epoch interruption + memory cap
wasmtime run \
  --wasi preview2 \
  --max-memory-size 134217728 \
  --epoch-interruption \
  --fuel 1000000000 \
  --invoke handle \
  app.component.wasm
```

```toml
# wasmtime.toml — instance pool config para serverless hot path
[pooling]
enabled = true
total_component_instances = 1000
total_memories = 1000
total_tables = 1000
max_memory_size = "128 MiB"
[compiler]
strategy = "cranelift"  # ou "winch" pra cold start agressivo
[wasi]
preview2 = true
```

**Wasmer 5+ (runtime-agnostic).** Q4 2024 reposicionou Wasmer como runtime-agnostic — suporta Wasmtime e WasmEdge como compilers backend, além do próprio singlepass/cranelift/llvm. Diferencial: WASIX, extensão de WASI com POSIX-style (sockets full, threads, fork-like). Wasmer Edge é a plataforma serverless própria. Em 2026 sem WASIX requirement, Wasmtime é escolha default; Wasmer ganha em apps que precisam de compatibilidade Unix além de WASI 0.2.

```bash
# Wasmer 5 com WASIX: aplicação que precisa de sockets POSIX
wasmer run app.wasm --enable-wasix --net --mapdir /data:./data
```

**WAMR (WebAssembly Micro Runtime, Bytecode Alliance).** Footprint <50KB, target principal RTOS, IoT, MCUs. Modos: interpreter (default, sem JIT), AOT (binário pré-compilado pra arquitetura específica), fast-interp. Não use WAMR para servidor general-purpose — sem JIT, throughput é fração de Wasmtime. Patches kernel Linux experimentais via `lkl-bytecode-alliance` permitem rodar Wasm em ring-0 isolado.

```c
// WAMR embedded: bootstrap mínimo C
#include "wasm_export.h"
static char heap_buf[16 * 1024];
int main(int argc, char *argv[]) {
    RuntimeInitArgs init_args = {0};
    init_args.mem_alloc_type = Alloc_With_Pool;
    init_args.mem_alloc_option.pool.heap_buf = heap_buf;
    init_args.mem_alloc_option.pool.heap_size = sizeof(heap_buf);
    wasm_runtime_full_init(&init_args);
    // load → instantiate → call_wasm → deinit
}
```

**WasmEdge (CNCF Sandbox 2021 → Incubating 2023).** Versão 0.14+ foca AI inference (TensorFlow, PyTorch, llama.cpp, GGML via plugins) e integração K8s via `containerd-shim-wasmedge`. Pods Kubernetes com `runtimeClassName: wasmedge` rodam binários `.wasm` em vez de containers. AI inference é CPU-bound — não assuma equivalência CUDA; para workload GPU-heavy continue em containers nativos. Cold start ~2ms.

```yaml
# K8s pod com containerd-shim-wasmedge
apiVersion: v1
kind: Pod
metadata: { name: wasm-llm-infer }
spec:
  runtimeClassName: wasmedge
  containers:
    - name: app
      image: registry/llm-infer:wasm
      command: ["/app.wasm"]
      resources: { limits: { memory: "512Mi", cpu: "2" } }
```

**Spin (Fermyon).** Versão 3.x (Q4 2024). Plugin system + serverless framework: HTTP triggers, Redis triggers, key-value stores, todos via WASI Component Model. Fermyon Cloud é o managed. Cold start otimizado por instance pool quente. Tuning obrigatório: pre-warm pool ou cold start spike sob carga.

```toml
# spin.toml — app HTTP serverless
spin_manifest_version = 2
[application]
name = "logistica-track"
version = "1.0.0"

[[trigger.http]]
route = "/track/:id"
component = "tracker"

[component.tracker]
source = "target/wasm32-wasi/release/tracker.wasm"
allowed_outbound_hosts = ["redis://cache.internal:6379"]
[component.tracker.build]
command = "cargo build --target wasm32-wasi --release"
```

**Lunatic 0.14+.** Runtime Rust inspirado no BEAM (Erlang). Supervisor trees, processes leves, message passing — modelo actor sobre Wasm. Nicho: aplicações Rust que querem semântica Erlang sem JVM/BEAM, com isolamento por instância Wasm. Pequena comunidade — adoção exige owning the dependency.

**Fastly Compute.** Wasmtime-based, produção desde 2020, bilhões de req/dia. CLI `fastly compute publish`. Cold start ~50µs (instance pool warm). Limite binário ~50MB pré-otimização. WASI 0.2 component support em rollout 2026.

```toml
# fastly.toml
manifest_version = 3
name = "edge-router"
language = "rust"
[scripts]
build = "cargo build --bin edge-router --release --target wasm32-wasi"
```

**Cloudflare Workers + Wasm.** Wasm via binding `main_module` no `wrangler.toml`, roda alongside JS no V8 isolate. Limite hard: binário Wasm <1MB no plano padrão (3MB no plano paid após otimização). Use `wasm-opt -Oz` + `twiggy top` antes de deploy.

```toml
# wrangler.toml — Worker com Rust → Wasm core
name = "logistica-edge"
main = "src/index.js"
compatibility_date = "2026-04-01"
[build]
command = "cargo build --release --target wasm32-unknown-unknown && wasm-opt -Oz target/wasm32-unknown-unknown/release/core.wasm -o build/core.wasm"
[[wasm_modules]]
binding = "CORE"
source = "build/core.wasm"
```

**Cosmonic / wasmCloud.** Cosmonic GA Q4 2024, baseado em wasmCloud (CNCF Sandbox). Plataforma distribuída de aplicações Wasm com lattice — actors Wasm + capability providers conectados via NATS. Newer platform; teste failure modes distribuídos antes de adotar em produção crítica.

**WASI 0.2 / 0.3 status 2026.**
- WASI 0.2 (Preview 2): estável desde Q1 2024. Worlds: `wasi:cli`, `wasi:http`, `wasi:keyvalue`, `wasi:blobstore`, `wasi:config`, `wasi:logging`. Suportado por Wasmtime, WasmEdge, Spin, Fastly (rollout), Wasmer (parcial).
- WASI 0.3: shipou async nativo em 2024+; estável em Wasmtime 28. Migra `wasi:http` para futures/streams nativos do Component Model.

```rust
// wasi-http handler 0.2 com wit-bindgen
use wasi::http::types::{IncomingRequest, ResponseOutparam, OutgoingResponse, Fields};
struct Handler;
impl wasi::exports::http::incoming_handler::Guest for Handler {
    fn handle(req: IncomingRequest, out: ResponseOutparam) {
        let resp = OutgoingResponse::new(Fields::new());
        resp.set_status_code(200).unwrap();
        ResponseOutparam::set(out, Ok(resp));
    }
}
wasi::http::proxy::export!(Handler);
```

**Decision matrix 2026.**
- **Wasmtime**: embedding general-purpose, dev local, reference para Component Model, iOS via Pulley.
- **WAMR**: MCU/RTOS/IoT constrained, footprint crítico, AOT pré-compilado.
- **WasmEdge**: K8s pods Wasm via containerd-shim, AI inference CPU-bound, integração Tensorflow/llama.cpp.
- **Wasmer**: justificado só por WASIX (POSIX-style além de WASI 0.2).
- **Spin / Fermyon Cloud**: serverless Wasm gerenciado HTTP-first, internal tools rápidos.
- **Cosmonic / wasmCloud**: distributed Wasm app platform com lattice + NATS.
- **Fastly Compute**: edge serverless production-grade, Wasmtime-based, billions req/day.
- **Cloudflare Workers Wasm**: edge funcs hot path com Rust core <1MB, alongside JS.

**Stack Logística aplicada.** Cloudflare Workers Wasm para edge: rota `/track/:id` em Rust compilado para Wasm <500KB, lookup no KV, fallback origem. WasmEdge K8s shim para serviços de migração de legacy Java — refatorar handler crítico em Rust → Wasm, deploy em pod com `runtimeClassName: wasmedge`, ganho memory 5-10x. Spin para internal admin tools (CRUDs operacionais), deploy em Fermyon Cloud sem operar K8s. AI inference de classificação de NF-e em WasmEdge com llama.cpp plugin, CPU-only, mantendo isolamento + portabilidade.

**Anti-patterns:**
- Wasmtime sem fuel metering ou epoch interruption em untrusted plugin (DoS via infinite loop).
- WAMR para servidor general-purpose (default sem JIT, throughput péssimo).
- WasmEdge para AI inference assumindo equivalência CUDA (CPU-bound; GPU-heavy fica em container nativo).
- Component Model via host glue code em vez de `wac compose` (perde type-checking validation; ver §2.17).
- Spin app sem cold-start tuning ou instance pool pré-aquecido (latency spikes sob carga).
- Cloudflare Workers Wasm com binário > 1MB sem `wasm-opt -Oz` + `twiggy` (deploy quebra no limite).
- Wasmer adotado em greenfield 2026 sem WASIX requirement (Wasmtime ganha papel reference, comunidade maior).
- WAMR pinned em dev branch (breaking changes frequentes; pin tag de release).
- Cosmonic/wasmCloud em produção crítica sem teste de failure modes distribuídos (lattice + NATS é newer).
- WASI 0.1 em greenfield 2026 (use 0.2 components; 0.3 async se Wasmtime 28+).

**Cruza com:** [`§2.5`](#25-toolchain) (toolchains foundation), [`§2.6`](#26-wasi) (WASI intro), [`§2.8`](#28-edge--serverless-uses) (edge/serverless uses), [`§2.9`](#29-plug-in-systems) (plug-in systems), [`§2.10`](#210-component-model) (Component Model intro), [`§2.11`](#211-perf) (perf expectations), [`§2.17`](#217-component-model--wasi-preview-2-deep) (Component Model + WASI Preview 2 deep), [`03-11 §2.20`](./03-11-systems-languages.md) (Rust 2024 + Zig — primary Wasm sources), [`04-08 §2.22`](../04-sistemas/04-08-edge-cdn.md) (edge runtimes — Wasm complement), [`03-08`](./03-08-applied-security.md) (capability-based security model), [`04-10 §2.21`](../04-sistemas/04-10-ai-llm.md) (RAG architectures — Wasm AI inference via WasmEdge), [`03-03`](./03-03-containers-orchestration.md) (K8s + containerd-shim-wasmedge para Wasm pods).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Explicar linear memory e como JS↔Wasm troca dados.
- Distinguir Wasm browser e WASI.
- Justificar Wasm em edge runtime vs Lambda.
- Toolchain pra Rust → Wasm pra browser.
- Diferenciar wasm-bindgen, wasm-pack, wit-bindgen.
- Component Model em uma frase.
- 3 use cases típicos onde Wasm é certo.
- Cost de cross-boundary call e implicação.
- Tamanho típico de módulo útil + técnicas pra reduzir.
- 2 limitações atuais (threads, GC, exceptions).

---

## 4. Desafio de Engenharia

Adicionar **routing engine Wasm** ao Logística, reuso da 03-11 Rust em browser e edge.

### Especificação

1. **Compile do 03-11 routing engine pra Wasm**:
   - Adicione target `wasm32-unknown-unknown` (browser) e `wasm32-wasi` (server).
   - `wasm-bindgen` pra browser bindings.
   - Output 2 artefatos: `.wasm` + JS glue.
2. **Use case 1: client-side preview**:
   - Lojista cria pedidos rapidamente em batch e quer **preview de roteamento** sem chamar backend.
   - Front Next carrega Wasm dinamicamente.
   - Calcula routes localmente em < 100ms pra 30 stops.
   - Mostra mapa preview.
3. **Use case 2: edge function (Cloudflare Worker ou Fastly)**:
   - Endpoint edge `/route/preview` que executa Wasm e retorna routes.
   - Latência p50 < 50ms global.
   - Sem cold start observável.
4. **Performance**:
   - Compare 3 implementações:
     - Backend Node calculando em JS.
     - Backend chamando Rust binary (via HTTP, do 03-11).
     - Edge Wasm.
   - Reportar p50/p95/p99 de cada.
5. **Bundle**:
   - Reduzir Wasm pra ≤ 200 KB gzipped (lto, opt-level=z, wasm-opt).
   - Lazy load (não no initial bundle).
6. **Memory passing**:
   - Demonstre passar struct grande (lista de stops) por Wasm memory diretamente, evitando JSON serialização.
   - Compare custo com versão JSON.
7. **Testes**:
   - Property-based tests no algoritmo (no Rust core).
   - Integration test do binding JS → Wasm.

### Restrições

- Sem usar lib pronta de routing.
- Sem trazer FFmpeg-style monstro de runtime.
- Tamanho final do Wasm ≤ 250 KB gz.

### Threshold

- README documenta:
  - Diagrama: mesmo Rust core em backend, browser, edge.
  - Tamanhos finais (Wasm bytes raw, gzipped, brotli).
  - Tabela latência das 3 implementações.
  - Demo do preview client-side.
  - Demo do edge function.
  - 1 lição sobre limitação Wasm que você bateu (threads, async, debugging).

### Stretch

- Wasm Component Model: definir WIT interface, gerar bindings em 2 linguagens.
- Spin (Fermyon) deploy pra cluster local; rodar Wasm como serviço.
- Browser SIMD: usar `wasm32-unknown-unknown` com `+simd128` pra acelerar partes do roteamento.
- Hot reload: swap Wasm module em runtime sem restart.
- Plug-in system: usuário envia regra custom (compilada pra Wasm) que o algoritmo de routing executa pra scoring.

---

## 5. Extensões e Conexões

- Liga com **01-06** (paradigmas): types, ADTs em Rust core.
- Liga com **02-03** (Web APIs): WebAssembly API, fetch loading.
- Liga com **02-05** (Next): dynamic import, edge runtime.
- Liga com **03-03** (K8s): Wasm runtimes (Spin) em K8s.
- Liga com **03-05** (AWS): Lambda Wasm support (limited), CloudFront Functions.
- Liga com **03-11** (systems langs): Rust core compiled pra Wasm.
- Liga com **04-08** (services): plug-in systems via Wasm.
- Liga com **04-10** (AI): ONNX Runtime Web roda Wasm.

---

## 6. Referências

- **WebAssembly.org** ([webassembly.org](https://webassembly.org/)).
- **MDN, WebAssembly** ([developer.mozilla.org/en-US/docs/WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly)).
- **wasm-bindgen book** ([rustwasm.github.io/docs/wasm-bindgen](https://rustwasm.github.io/docs/wasm-bindgen/)).
- **WASI docs** ([wasi.dev](https://wasi.dev/)).
- **Component Model docs** ([component-model.bytecodealliance.org](https://component-model.bytecodealliance.org/)).
- **Bytecode Alliance** ([bytecodealliance.org](https://bytecodealliance.org/)).
- **Fermyon Spin docs** ([developer.fermyon.com](https://developer.fermyon.com/)).
- **Cloudflare Workers Wasm guide**.
- **"Programming WebAssembly with Rust"**: Kevin Hoffman.
- **"WebAssembly: The Definitive Guide"**: Brian Sletten.
