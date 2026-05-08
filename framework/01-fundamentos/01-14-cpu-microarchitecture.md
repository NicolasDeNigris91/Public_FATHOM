---
module: 01-14
title: CPU Microarchitecture, Pipelining, Cache Hierarchies, Branch Prediction, NUMA
stage: fundamentos
prereqs: [01-01, 01-02]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
quiz:
  - q: "Por que iterar um array ordenado é tipicamente muito mais rápido que iterar o mesmo array embaralhado num loop com `if a[i] > threshold`?"
    options:
      - "Porque o cache CPU é otimizado pra dados ordenados, sem relação com branches."
      - "Porque com dados ordenados o branch predictor acerta quase 100% (todos verdadeiros depois todos falsos); embaralhado, mispredictions custam 10-20 ciclos cada via pipeline flush."
      - "Porque ordenação reduz o número de instruções executadas pela metade."
      - "Porque o compilador detecta dados ordenados e remove o branch."
    correct: 1
    explanation: "Branch prediction depende de regularidade. Array ordenado dá padrão consistente (true...true,false...false), trivial de prever. Random destrói o preditor (dynamic 2-bit, TAGE), pagando ~10-20 ciclos por miss. É o exemplo clássico do Hennessy/Stack Overflow."
  - q: "Qual a estimativa de latência relativa entre L1 cache, L3 cache e DRAM em CPU x86 moderna?"
    options:
      - "L1 ~4 ciclos, L3 ~40 ciclos, DRAM ~200-400 ciclos."
      - "Todos têm latência similar (~10 ciclos); diferença é só capacidade."
      - "L1 ~1 ciclo, L3 ~5 ciclos, DRAM ~20 ciclos."
      - "L1 ~100 ciclos, L3 ~500, DRAM ~10000."
    correct: 0
    explanation: "Ordens de grandeza importam: cache miss em L1 que vai a L3 custa ~10x mais; miss até DRAM custa ~50-100x. Por isso cache locality (sequential access, packing hot data) frequentemente vale mais que reduzir count de instruções."
  - q: "Por que false sharing degrada performance mesmo sem locks ou data races verdadeiras?"
    options:
      - "Porque o compilador insere locks invisíveis."
      - "Duas variáveis independentes na mesma cache line (~64B) acessadas por cores diferentes geram tráfego de coherence (MESI invalidations) a cada escrita, mesmo as variáveis sendo logicamente independentes."
      - "Porque o kernel força sincronização entre threads no mesmo NUMA node."
      - "Porque a memória DRAM tem porta única."
    correct: 1
    explanation: "MESI exige que escrita em cache line invalide cópias em outros caches. Se thread A escreve var X e thread B escreve var Y na mesma linha, cada escrita chuta a linha do cache do outro core. Mitigação: padding (`alignas(64)` em C++, `@Contended` em Java)."
  - q: "Que condição IMPEDE a auto-vetorização de um loop por compiladores como gcc/clang?"
    options:
      - "Loop com trip count fixo conhecido em tempo de compilação."
      - "Loop-carried dependency tipo `x[i] = x[i-1] + 1` (cada iteração depende da anterior), ou aliasing ambíguo de pointers sem `restrict`."
      - "Acesso sequencial contíguo a arrays alinhados."
      - "Uso de tipos float em vez de int."
    correct: 1
    explanation: "SIMD precisa que iterações sejam INDEPENDENTES pra processar várias em paralelo. Dependência cruzada serializa o loop. Aliasing ambíguo (compilador não sabe se ponteiros overlap) também bloqueia: solução é `restrict`/`__restrict__` ou refatorar pra SoA."
  - q: "Por que SoA (Structure of Arrays) costuma vencer AoS (Array of Structures) em hot loops numéricos?"
    options:
      - "SoA usa menos memória total."
      - "Em SoA, fields acessados ficam contíguos: AVX2 carrega 8 floats consecutivos do mesmo field num registro vetorial, maximizando bandwidth útil; em AoS, cada cache line carrega 16B mas usa só 4B (waste de banda) e impede vetorização limpa."
      - "AoS não funciona em ARM, só x86."
      - "SoA elimina cache misses completamente."
    correct: 1
    explanation: "Loop somando só `x[i]` em AoS `{x,y,z,m}` desperdiça 75% de cada cache line e quebra vetorização (fields entrelaçados). SoA junta `x[]` contíguo, fully utilizado, vetorizável trivialmente. Por isso ECS, ClickHouse, Apache Arrow são SoA."
---

# 01-14, CPU Microarchitecture

## 1. Problema de Engenharia

01-01 cobriu modelo de computação de alto nível. Mas decisões reais de performance, por que esse loop é 10x mais lento, por que o profiler aponta cache misses, por que threads parecem rápidas em um core e lentas em outro, exigem entender CPU **por dentro**. Pipelining, branch prediction, out-of-order execution, store buffers, MESI, NUMA não são tópicos acadêmicos: governam latência de toda linha de código que você escreve.

Engenheiro Pleno geralmente trata CPU como caixa-preta. Senior+ que trabalha com performance, sistemas, baixo nível, ou ML inference precisa entender. Sem isso, profiler é caixa de caracteres incompreensível, e otimizações ficam superstição. Com isso, você lê flamegraph e sabe **por quê** sua hot loop não vetoriza.

Este módulo é mecânico-simpático: arquitetura Intel/ARM moderna, hierarquia de cache (L1/L2/L3, TLB), branch prediction, speculative execution, prefetching, SIMD, NUMA, store buffers, memory ordering em x86 vs ARM (conexão 01-11), memory consistency. Plus PMU (performance monitoring units) e como usar `perf` pra ler counters reais.

---

## 2. Teoria Hard

### 2.1 CPU pipelining

CPU clássica fetch → decode → execute → memory → writeback (5-stage RISC pipeline). Modernas têm 14-20+ stages.

Pipelining permite múltiplas instruções "em voo" simultaneamente. Throughput melhora; latência por instrução individual permanece similar.

**Hazards**:
- **Data hazard**: instrução B depende de resultado de A não-finalizado. Resolve via forwarding ou stall.
- **Control hazard**: branch ainda não decidido; CPU não sabe próxima instrução.
- **Structural hazard**: recurso compartilhado (ex: ALU, memory port) já em uso.

Compilador e CPU coordenam pra reduzir hazards (instruction scheduling, register renaming).

### 2.2 Out-of-order execution e superscalar

CPUs modernas fazem **out-of-order execution**: reordenam instruções dinamicamente pra preencher pipeline. Reorder Buffer (ROB) commit em ordem original.

**Superscalar**: múltiplas instruções por ciclo via múltiplas execution units (ALUs, FPUs, load/store ports). x86 modern (Intel Golden Cove) faz 6+ instruções/ciclo em hot path.

Implicação: ILP (Instruction-Level Parallelism) é grátis se compilador e código permitem.

### 2.3 Branch prediction

Branches custam ciclos se misspeculados (pipeline flush). CPU prediz direção via:
- **Static prediction**: branch backward provavelmente taken (loops).
- **Dynamic 2-bit saturating counter** por branch.
- **2-level adaptive (Yeh-Patt)**: histórico recente prevê próxima.
- **TAGE / Perceptron**: estado-da-arte, neural-style prediction.

Misprediction = 10-20 ciclos perdidos em pipelines profundos. Reduce com:
- Branchless code (`std::min`, ternary, bitops).
- Tabelas de lookup em vez de switch grande.
- Sort data antes de loop (Hennessy classic).

Spectre (2018): exploit de branch predictor pra ler memória além de bounds. CPU specula past bounds check; embora rollback, traces ficam em cache. Mitigation patches custaram 5-30% performance.

### 2.4 Cache hierarchy

Latency aproximada (Intel x86):
- **Register**: < 1 ciclo.
- **L1 cache**: ~4 ciclos, 32-48 KB (split I-cache / D-cache).
- **L2 cache**: ~12 ciclos, 256-512 KB-1 MB.
- **L3 cache**: ~40 ciclos, 4-64 MB (compartilhado).
- **DRAM**: ~200-400 ciclos.
- **NVMe SSD**: ~10k+ ciclos.

Cache organizada em **lines** (64 bytes x86). Set-associative (8-16 ways em L1).

Implicação: leitura de byte custa 64 bytes. Loop em array sequencial (stride 1) = quase free. Random access = penalty.

### 2.5 Cache misses: classificação (3Cs)

- **Compulsory**: primeira referência. Inevitável.
- **Capacity**: working set > cache. Sweep evicts.
- **Conflict**: set-associativity insuficiente. Mais raro.

Profile reveal misses via `perf stat -e cache-misses`.

### 2.6 TLB (Translation Lookaside Buffer)

Virtual → physical address translation cached em TLB. Miss = page table walk (custo significativo).

Page sizes: 4KB default, 2MB / 1GB **huge pages** disponíveis. Huge pages reduzem TLB pressure pra workloads com large memory.

`madvise(MADV_HUGEPAGE)` em Linux. JVM, ClickHouse, Redis suportam huge pages.

### 2.7 Prefetching

Hardware prefetcher detecta padrões (stride) e busca cache lines antes de uso. Funciona pra acessos lineares.

Software prefetch: `_mm_prefetch` (intrinsic), `__builtin_prefetch` (GCC). Útil em estruturas com indireção (linked list, hash table).

### 2.8 SIMD (Single Instruction, Multiple Data)

Registers wide (128/256/512 bit) processam múltiplos valores. Sets x86: SSE, AVX, AVX2, AVX-512. ARM: NEON, SVE.

Auto-vectorization: compiladores tentam. Hand-written via intrinsics (`_mm256_add_ps`).

Speedup 4-16x em loops vetorizáveis (numeric, hashing, image, audio, ML inference). Wide use em libs (BLAS, SIMD-JSON, ClickHouse vectorized engine).

**Condições pra auto-vectorization acontecer:**
- Loop com trip count fixo (ou inferível).
- Sem loop-carried dependencies (`x[i] = x[i-1] + 1` não vetoriza).
- Sem branches dependentes de dados dentro do hot path (ou mascaráveis via predicação).
- Acessos contíguos e alinhados a fronteira do vector register.
- `restrict` / `noalias` informando compilador que ponteiros não overlap.

Verifique com `gcc -O3 -fopt-info-vec` / `clang -Rpass=loop-vectorize` antes de assumir.

**Data layout: AoS vs SoA**

Mesmos dados, layouts diferentes mudam tudo:

```c
// Array of Structures (AoS): natural pra OO, mata SIMD.
struct Particle { float x, y, z, m; } a[N];

// Structure of Arrays (SoA): SIMD-friendly.
struct {
  float x[N];
  float y[N];
  float z[N];
  float m[N];
} s;
```

Loop somando `x[i]` em AoS lê 16B mas usa só 4B útil por iteração (waste de banda + cache). Em SoA, AVX2 carrega 8 floats `x` contíguos em um único registro, vetoriza limpo. ECS (game engines, Bevy/Unity DOTS) é SoA por princípio. ClickHouse, Apache Arrow, Pandas (interno) são SoA. Cruza com 01-04 §2.2 (cache locality) e 01-04 §2.4 (Robin Hood hash table SoA quando perf é crítica).

**Custo invisível**: SIMD width crescendo (AVX-512 em 512b) traz **frequency throttling** em x86 — códigos AVX-512 derrubam clock do core, às vezes anulando o ganho. Mensure ciclo a ciclo (PMU) antes de acreditar em "AVX-512 é 8x mais rápido".

### 2.9 SMT / Hyper-Threading

Two logical threads compartilham um core físico. Compartilham execution units; cada um seu register file e arquivo de estado.

Ganhos: ~20-30% em workloads heterogêneos (memory-bound thread libera ALUs pro outro). Não 2x.

Em workloads CPU-bound puros, SMT pode degradar. Em containerized, garbage collection threads se beneficiam.

### 2.10 Memory ordering (revisita 01-11)

x86 TSO (Total Store Order): stores não reordenam entre si; loads não reordenam entre si; mas store-then-load podem (StoreLoad).

ARM/POWER: relaxed; quase tudo pode reordenar. Programador insere barriers (`DMB`, `DSB`).

Implicação prática: código C++ que "funciona" em x86 frequentemente quebra em ARM se sync primitives mal usadas. Migrações cloud x86 → Graviton ARM expuseram bugs latentes.

### 2.11 Store buffers e write coalescing

Stores não vão direto a cache. Store buffer (10-50 entries) coalesce e escreve em batch.

Implicação: thread A store, thread B load same address, A pode estar no store buffer, B vê stale do cache. (Origem do exemplo §2.2 01-11.)

### 2.12 NUMA (Non-Uniform Memory Access)

Servers multi-socket: cada socket com memory controller dedicado. Acesso a memory de outro socket via interconnect (UPI / Infinity Fabric) = penalty.

NUMA-aware:
- **Pinning**: process locked a node (taskset, numactl).
- **First-touch**: thread que primeiro acessa página aloca em seu node.
- **Migration**: kernel migra páginas se acessos cruzam.
- **Replication**: read-only data replicada.

Apps single-socket ignoram. DBs grandes (Postgres, ClickHouse, Cassandra) têm tuning NUMA.

### 2.13 PMU (Performance Monitoring Unit) e `perf`

Cada core tem counters de hardware:
- Cycles, instructions retired (IPC = instructions/cycle, target > 1).
- Cache misses (L1/LLC).
- Branch mispredictions.
- TLB misses.
- Stalls em various stages.

`perf stat -d ./program`: básico. `perf record -F 99 -g; perf report`: profiling.
`perf top`: live view.

Linux `perf` é canônico. Outros: VTune (Intel), AMD μProf, eBPF (Brendan Gregg's work).

### 2.14 Roofline model

Plot performance (FLOPS) vs arithmetic intensity (FLOPS/byte memory):
- **Memory-bound** region: limited by bandwidth.
- **Compute-bound** region: limited by FLOPS peak.
- **Roof**: min(compute peak, memory_bw × intensity).

Use pra entender se workload está saturando memory ou compute. ML inference frequentemente memory-bound (large weights); ML training compute-bound (FLOPs heavy).

### 2.15 GPU vs CPU mental model

GPU é 1000s de cores SIMT (Single Instruction, Multiple Threads), high latency tolerated via massive parallelism.

CPU optimized for low-latency single thread + small parallelism.

Workloads diferem. ML training = GPU. Database OLTP = CPU. Mix = consciência arquitetural.

### 2.16 Energy e thermal

Modern CPUs throttle clocks sob calor. Boost clock breve > sustained clock. Server-room workloads sustained.

Energy: dynamic + static. Race-to-idle (rapid burst then sleep) frequently mais eficiente que sustained low.

ARM em mobile/cloud: melhor perf/watt. Datacenter shifts pra ARM (AWS Graviton, Azure Cobalt, GCP Axion) por economics.

### 2.17 Mechanical sympathy em código

Práticas concretas:
- **Data structures cache-friendly**: array of struct vs struct of arrays; trade-off.
- **Branch hints** (`__builtin_expect`, `[[likely]]/[[unlikely]]` C++20).
- **Avoid pointer chasing**: linked lists devastam cache.
- **Pack hot data** em mesmo cache line; cold em outro.
- **Avoid false sharing** (já visto em 01-11).
- **Loop blocking / tiling** em matrizes.
- **Branchless code** em hot paths.
- **Profile-guided optimization (PGO)** + LTO.

Código que respeita arquitetura pode ser 10-100x mais rápido sem mudar algoritmo.

### 2.18 Real reading: counters em servidor

Sample command:
```
perf stat -e cycles,instructions,cache-misses,branch-misses,L1-dcache-load-misses ./mybench
```

Output útil:
- IPC < 1: memory-bound ou high stall.
- L1 miss rate > 5%: cache não fits.
- Branch miss rate > 2%: pode reduzir branches.

PMU é **fonte de verdade** sobre o que CPU está fazendo. Profiling sem PMU é guess.

**Cruza com:** **01-13 §2.17** (V8 Maglev/TurboShaft pipeline — JIT moderno aproveita μarch features), **01-07 §2.12** (V8 internals 2026).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Estimar latência relativa register vs L1 vs L2 vs L3 vs DRAM em ciclos.
- Explicar 3Cs de cache miss.
- Diferenciar hardware prefetch vs software prefetch.
- Justificar branchless em hot path.
- Explicar por que x86 TSO é mais forte que ARM relaxed.
- Listar 4 sinais que workload é memory-bound vs compute-bound.
- Aplicar `perf stat` mentalmente: que counters indicam o quê.
- Explicar NUMA e quando importa.
- Diferenciar SMT vs core físico.
- Justificar SIMD com speedup esperado em loop numérico.
- Discutir trade-off race-to-idle vs sustained.

---

## 4. Desafio de Engenharia

**Microbenchmarks instrumentados** com PMU revelando cache, branch, NUMA effects.

### Especificação

Linguagem: Rust ou C (acesso direto a intrinsics).

1. **Bench cache**:
   - Sequential vs random access em array de 1MB → 64MB.
   - Plot latência por element vs working set.
   - Identifique L1, L2, L3, DRAM cliffs.
2. **Bench branch prediction**:
   - Loop somando `if a[i] > threshold then x else y`.
   - Versão A: array random; B: ordenado.
   - Show branch miss rate diferença em PMU.
3. **Bench false sharing** (revisita 01-11):
   - 2 threads atualizam counters em mesma cache line vs paddados.
   - Show throughput delta.
4. **Bench SIMD**:
   - Soma de array `f32`. Versão escalar vs auto-vectorized vs intrinsics AVX2.
   - Speedup target ≥ 4x.
5. **Bench NUMA**:
   - Em sistema multi-socket (se disponível) ou simulação: thread aloca em node 0, lê do node 1.
   - Show penalty.
6. **Análise** em `analysis.md`:
   - Reportar `perf stat` outputs.
   - Calcular IPC.
   - Roofline plot pra bench SIMD (compute peak vs memory bw vs measured).
   - Conclusão por bench.

### Restrições

- Use `perf` (Linux) ou Instruments (macOS) ou similar.
- Microbenchs warm-up + multiple runs + median.
- Compilador flags documentadas (`-O2/-O3 -march=native`).

### Threshold

- 5 benches rodando reproducible.
- PMU counters citados nos resultados.
- Plots de cache cliff e branch miss visíveis.

### Stretch

- **Profile-Guided Optimization** real: train run → recompile com PGO → mostre delta.
- **eBPF** custom probe medindo something não-trivial.
- **GPU comparison**: mesmo algorithm em CUDA ou Metal compute shader.
- **AArch64** rodar same benches em ARM (Mac M-series ou Graviton EC2).

---

## 5. Extensões e Conexões

- Liga com **01-01** (computation model): camada acima.
- Liga com **01-02** (OS): kernel, scheduler, paging.
- Liga com **01-04** (data structures): cache-friendly choices.
- Liga com **01-05** (algorithms): real complexity inclui cache.
- Liga com **01-11** (concurrency): memory model x86 vs ARM.
- Liga com **02-07** (Node internals): V8 hidden classes, hot/cold path.
- Liga com **03-10** (backend perf): profiling em produção.
- Liga com **03-11** (Go/Rust): zero-cost abstractions matter.
- Liga com **03-12** (Wasm): SIMD, threads.
- Liga com **03-13** (analytical DBs): vectorized engines.
- Liga com **04-10** (AI/LLM): inference perf.

---

## 6. Referências

- **"Computer Architecture: A Quantitative Approach"**: Hennessy & Patterson. Bíblia.
- **"Computer Systems: A Programmer's Perspective"**: Bryant & O'Hallaron (CS:APP). Capítulos 5-6.
- **"What Every Programmer Should Know About Memory"**: Ulrich Drepper.
- **Intel Optimization Reference Manual**, **Software Developer's Manual**.
- **ARM Architecture Reference Manual**.
- **Brendan Gregg's "Systems Performance"** (2nd ed).
- **Brendan Gregg's blog** ([brendangregg.com](https://www.brendangregg.com/)).
- **Agner Fog's optimization manuals** ([agner.org/optimize](https://www.agner.org/optimize/)).
- **"The Microarchitecture of Intel, AMD, and VIA CPUs"**: Agner Fog.
- **"Mechanical Sympathy" by Martin Thompson**: talks e blog.
- **LMAX Disruptor**: caso real de cache-aware design.
- **Linux `perf` docs**, **eBPF docs**.
