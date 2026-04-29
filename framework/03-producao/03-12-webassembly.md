---
module: 03-12
title: WebAssembly — Linear Memory, Modules, Components, WASI, Edge
stage: producao
prereqs: [03-11]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 03-12 — WebAssembly

## 1. Problema de Engenharia

Wasm chegou em 2017 prometendo "código nativo no browser". Em 2026, virou portable runtime: edge functions, plugins, sandboxing seguro, processamento near-native em browser e servidor. Devs ainda confundem com "alternativa a JS no front" — mas o uso real está em edge runtimes (Cloudflare, Fastly), em libs heavy (Figma, AutoCAD Web, FFmpeg.wasm), em plug-in systems (Envoy filters, Suborbital).

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

Não substitui JS em UI — Wasm não tem DOM access direto. Vence em **cálculo intenso** delegated.

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

**Component Model** (em maturação): higher-level types — strings, lists, records, variants. Bindings auto-gerados de WIT (Wasm Interface Type).

### 2.5 Toolchains

**Rust**:
- `cargo build --target wasm32-unknown-unknown` — vanilla Wasm.
- `wasm-bindgen`, `wasm-pack` — auto-generate JS bindings.
- `wit-bindgen` — Component Model.

**C/C++**:
- Emscripten — full POSIX-ish in browser, com runtime grande.
- WASI SDK — Wasm pra runtime non-browser.

**Go**: suporte improving. `tinygo` produz binários menores que Go default. Go 1.21+ tem `wasip1` target.

**AssemblyScript**: TS-like syntax compilada pra Wasm. Bom pra workloads simples; ecossistema menor.

**Zig**: first-class Wasm target.

### 2.6 WASI

WASI (WebAssembly System Interface): "POSIX pra Wasm". Permite Wasm fora do browser fazer I/O (filesystem, sockets, env vars).

**WASI Preview 1** estável; **Preview 2** com Component Model evoluindo.

Capability-based: módulo recebe handles (file descriptors, sockets) — não acessa "global" sistema. Sandbox forte.

Roda em: wasmtime, Wasmer, WasmEdge, Spin, browsers via polyfills (limited).

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

Adicionar **routing engine Wasm** ao Logística — reuso da 03-11 Rust em browser e edge.

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
- **MDN — WebAssembly** ([developer.mozilla.org/en-US/docs/WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly)).
- **wasm-bindgen book** ([rustwasm.github.io/docs/wasm-bindgen](https://rustwasm.github.io/docs/wasm-bindgen/)).
- **WASI docs** ([wasi.dev](https://wasi.dev/)).
- **Component Model docs** ([component-model.bytecodealliance.org](https://component-model.bytecodealliance.org/)).
- **Bytecode Alliance** ([bytecodealliance.org](https://bytecodealliance.org/)).
- **Fermyon Spin docs** ([developer.fermyon.com](https://developer.fermyon.com/)).
- **Cloudflare Workers Wasm guide**.
- **"Programming WebAssembly with Rust"** — Kevin Hoffman.
- **"WebAssembly: The Definitive Guide"** — Brian Sletten.
