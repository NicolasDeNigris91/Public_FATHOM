---
module: 01-01
title: Modelo de Computação, CPU, Memória, Cache, Stack vs Heap
stage: fundamentos
prereqs: []
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
quiz:
  - q: "Por que iterar um array contíguo costuma ser muito mais rápido que percorrer uma linked list com os mesmos elementos?"
    options:
      - "O array está alocado na stack e a linked list no heap, e stack é sempre mais rápida."
      - "A CPU pré-busca cache lines de 64 bytes em ordem; arrays exploram spatial locality e o prefetcher, linked lists não."
      - "Linked lists obrigam o garbage collector a rodar a cada acesso."
      - "A CPU não consegue executar acessos a linked lists em paralelo."
    correct: 1
    explanation: "Arrays guardam elementos em endereços contíguos. Cada acesso traz 64 bytes pra L1 e o prefetcher antecipa os próximos. Linked lists espalham nodes pelo heap, então quase todo acesso é cache miss e o prefetcher fica perdido."
  - q: "Você cria 10 milhões de objetos pequenos num programa Node e a memória cresce sem controle. Qual a explicação mais alinhada com o que o módulo discute?"
    options:
      - "A stack do Node tem limite de 1-8 MB, então transbordou."
      - "Objects em JavaScript moram no heap, e alocação intensa fragmenta o heap antes do GC conseguir compactar."
      - "Toda variável JavaScript fica em registradores, e registradores são finitos."
      - "O TLB ficou cheio e o OS não consegue mais traduzir endereços."
    correct: 1
    explanation: "Em JS, objects/arrays/closures vivem no heap. Alocação intensa cria muitos blocos pequenos; o GC tem que rodar mais frequentemente e ainda assim a fragmentação cresce."
  - q: "Comparando latências típicas, qual ordem de grandeza está correta?"
    options:
      - "L1 cache é cerca de 100x mais rápido que RAM."
      - "RAM é cerca de 10x mais rápida que SSD NVMe."
      - "SSD NVMe é cerca de 10x mais rápido que rede continental."
      - "HDD é cerca de 2x mais lento que SSD SATA."
    correct: 0
    explanation: "L1 ~1 ns, RAM ~50-100 ns — diferença de ~100x. RAM vs SSD NVMe é ~100-1000x. SSD vs HDD é ~50x. Internalizar essas ordens muda a forma como você decide o que cachear."
  - q: "O que acontece quando a CPU sofre um branch misprediction num pipeline moderno?"
    options:
      - "Nada perceptível: a CPU simplesmente espera 1 ciclo."
      - "O pipeline parcialmente preenchido com o ramo errado é descartado, custando ~10-20 ciclos."
      - "O OS dispara uma interrupção e o processo é pausado."
      - "A page table precisa ser reconstruída pra refletir o caminho correto."
    correct: 1
    explanation: "Pipelines de 10-20 estágios começam a executar ramos especulativamente. Quando o predictor erra, todo o trabalho especulativo é jogado fora e o pipeline reinicia no ramo correto."
  - q: "Por que um page fault é considerado caríssimo (~100x mais lento que cache miss)?"
    options:
      - "O OS precisa recompilar o código do processo."
      - "A MMU descobre que a página não está na RAM, interrompe, e o OS lê do disco — latência de SSD/HDD entra no caminho crítico."
      - "O compilador JIT precisa rebuildar o trace path."
      - "Page fault sempre derruba o processo, gerando overhead de fork."
    correct: 1
    explanation: "Cache miss vai à RAM (~100 ns). Page fault vai ao disco (SSD ~10 µs, HDD ~5 ms). Daí o termo 'cair pra disco' ser sinônimo de aplicação lenta."
---

# 01-01, Modelo de Computação

## 1. Problema de Engenharia

Todo software roda em hardware. Entender **como** o hardware executa código é a diferença entre escrever "código que funciona" e "código que escala". Sem este módulo, conceitos posteriores (event loop, garbage collection, cache strategies, performance, concurrency) não fazem sentido, são abstrações em cima de um modelo que você não conhece.

Exemplos concretos onde desconhecimento custa caro:
- Você escreve um loop que "deveria ser O(n)" mas roda 10x mais lento que um loop "equivalente". Causa: **cache misses**. Você não tem o conceito de **memory hierarchy** (L1/L2/L3/RAM), então não percebe que estruturas de dados com layout não-contíguo destroem performance.
- Você cria 1 milhão de objetos pequenos no Node e a memória cresce sem controle. Causa: **alocação no heap** com fragmentação, GC não consegue compactar a tempo. Você não sabe a diferença entre **stack** (rápido, automático) e **heap** (manual, lento).
- Você consulta 10 mil rows do Postgres e a query trava. Causa: o B-Tree do índice não cabe no buffer cache (RAM), então o disco vira o gargalo. Você não tem o conceito de **memory hierarchy** estendido pra storage (cache → RAM → SSD → HDD → rede).

Este módulo te dá o **modelo mental do computador** que vai sustentar tudo daqui pra frente.

---

## 2. Teoria Hard

### 2.1 Arquitetura básica de uma máquina (modelo von Neumann)

Um computador moderno, simplificado, é:

```
┌──────────────┐    ┌──────────────────────────────────┐
│              │    │                                  │
│     CPU      │◄──►│           Memória                │
│              │    │  (RAM, contém código + dados)    │
└──────┬───────┘    └──────────────────────────────────┘
       │
       │ I/O bus
       ▼
┌──────────────────┐
│ Disco, rede, etc │
└──────────────────┘
```

A CPU executa instruções uma por vez (conceitualmente, superscalar/pipelined na prática). Cada instrução faz coisas como:
- Ler valor da memória pra um registrador
- Operar em registradores (somar, comparar)
- Escrever valor de registrador na memória
- Saltar pra outra instrução (branch)

**Registradores** são a memória **dentro** da CPU. Há poucos (~16-32 de propósito geral em x86_64), mas são acessados em **1 ciclo de clock** (ordem de **0.3ns** numa CPU de 3GHz). Tudo o mais é mais lento.

### 2.2 Memory hierarchy, ordens de grandeza

A "memória" não é uma coisa única. É uma **hierarquia** com trade-offs entre **velocidade**, **capacidade** e **custo**:

| Nível | Latência típica | Capacidade típica | Onde mora |
|-------|----------------|-------------------|-----------|
| Registradores | ~0.3 ns | ~1 KB | Dentro da CPU |
| L1 cache | ~1 ns | 32-64 KB por core | Dentro da CPU |
| L2 cache | ~3-10 ns | 256 KB - 1 MB por core | Dentro da CPU |
| L3 cache | ~10-30 ns | 4-64 MB compartilhado | Dentro da CPU |
| RAM (DRAM) | ~50-100 ns | 4-128 GB | Fora da CPU, na placa-mãe |
| SSD NVMe | ~10 µs | 100 GB - 4 TB | I/O bus |
| SSD SATA | ~100 µs | 100 GB - 4 TB | I/O bus |
| HDD | ~5 ms | 500 GB - 20 TB | I/O bus |
| Rede (data center) | ~0.5 ms | ∞ | NIC + switches |
| Rede (continental) | ~50-200 ms | ∞ | Internet |

**Memorize as ordens de grandeza:**
- L1 → RAM: **~100x** mais lento
- RAM → SSD: **~1000x** mais lento
- SSD → HDD: **~50x** mais lento
- Local → rede continental: **~10⁶x** mais lento

Isso explica por quê:
- **Cache hit** vs miss tem impacto brutal em performance.
- **Bater no disco** é desastre pra qualquer hot path.
- **Round-trip de rede** define o budget de latência de qualquer feature.

### 2.3 Como cache funciona, cache lines, locality, prefetch

A CPU **não** lê 1 byte por vez da RAM. Lê em **cache lines** de 64 bytes (em x86_64 moderno). Quando você acessa um endereço de memória, **64 bytes contíguos** são copiados pra L1, porque é provável que você acesse os bytes adjacentes em seguida.

Isso explica **spatial locality**: estruturas contíguas (arrays) são radicalmente mais rápidas que estruturas espalhadas (linked lists), porque um acesso já carrega vizinhos no cache.

E **temporal locality**: dados acessados recentemente provavelmente serão acessados de novo, então cache mantém eles.

**Cache miss types** (3 C's):
- **Compulsory**: primeira vez que você acessa um endereço, sempre miss.
- **Capacity**: working set não cabe no cache.
- **Conflict**: dois endereços mapeiam pro mesmo conjunto no cache (em caches set-associative).

A CPU também tem **prefetcher**: hardware que detecta padrões de acesso (ex: você acessa `arr[0]`, `arr[1]`, `arr[2]`...) e antecipa carregando os próximos. **Acesso linear é amigo do prefetcher**; acesso aleatório (linked list) destrói ele.

### 2.4 Stack vs Heap

A memória de um processo é dividida em **regiões**:

```
Endereços altos
┌─────────────────┐
│ Stack           │ ← cresce pra baixo
│ (variáveis      │
│  locais, args,  │
│  return address)│
├─────────────────┤
│       ↓         │
│   (cresce)      │
├─────────────────┤
│       ↑         │
│   (cresce)      │
├─────────────────┤
│ Heap            │ ← cresce pra cima
│ (alocação       │
│  dinâmica:      │
│  malloc, new)   │
├─────────────────┤
│ BSS / Data      │ globais, estáticas
├─────────────────┤
│ Text (código)   │ instruções do programa
└─────────────────┘
Endereços baixos
```

**Stack:**
- Alocação **automática** quando função é chamada (frame), liberação automática no return.
- **Extremamente rápido**: alocar é só decrementar o stack pointer (registrador `RSP` em x86_64).
- Tamanho **limitado** (default ~1-8 MB por thread em Linux). Ultrapassar = `stack overflow`.
- Funciona como pilha LIFO: cada chamada de função empilha um frame; return desempilha.
- Variáveis na stack têm escopo léxico amarrado ao frame.

**Heap:**
- Alocação **manual** via `malloc` (C), `new` (C++), ou implicitamente em linguagens managed (JS objects, classes em Java).
- **Mais lento** que stack: requer estrutura de dados pra rastrear blocos livres (free list, bins).
- **Quase ilimitado** (limitado pela RAM virtual disponível).
- Liberação manual (`free`, `delete`) ou automática via **garbage collector**.
- **Fragmentação** é problema real: depois de muitas alocs/frees, blocos livres ficam picados.

Em JavaScript:
- Primitivos pequenos (number, boolean) podem morar em registradores ou stack quando inlined.
- Objects, arrays, strings, closures **moram no heap**.
- O **V8 GC** gerencia o heap (ver 01-07).

### 2.5 Virtual memory, endereços virtuais vs físicos

Cada processo "vê" um espaço de endereços de **64 bits** (em x86_64), aparentemente próprio. Mas a RAM física é compartilhada e finita. Como?

**Virtual memory.** O OS + MMU (Memory Management Unit, hardware na CPU) traduzem **endereços virtuais** (que o processo usa) pra **endereços físicos** (RAM real).

A tradução acontece em **páginas** (default 4 KB). O OS mantém uma **page table** por processo:
- Endereço virtual → endereço físico (se a página está na RAM)
- Endereço virtual → bit "swapped out" (se a página foi pra disco)

Quando o processo acessa um endereço virtual:
1. MMU consulta o **TLB** (Translation Lookaside Buffer, cache de traduções recentes).
2. Se hit: tradução é instantânea.
3. Se miss: MMU consulta page table na RAM (page walk, lento).
4. Se a página não está na RAM ("page fault"): OS interrompe, lê do disco, atualiza tabela, continua.

**Por que isso importa pra você:**
- **Page fault é caríssimo** (100x mais lento que cache miss). Working sets grandes que não cabem na RAM = aplicação lenta.
- **TLB miss** também tem custo. Acesso aleatório a muitas páginas distintas degrada performance.
- **mmap-ed files**: você pode mapear arquivo em memória virtual e o OS carrega páginas sob demanda. Isso explica bancos como SQLite/LMDB e parte do funcionamento do Postgres.

### 2.6 Pipeline, branch prediction, speculative execution

CPUs modernas **não** executam uma instrução de cada vez. Têm um **pipeline** com 10-20 estágios, cada instrução passa por: fetch → decode → execute → memory → writeback (simplificado).

Várias instruções estão em estágios diferentes simultaneamente, paralelismo de instrução. Isso requer:
- **Branch prediction**: quando há `if`, a CPU **adivinha** qual ramo será tomado e começa a executá-lo especulativamente. Se acertar: zero custo. Se errar (branch misprediction): pipeline é descartado, custa ~10-20 ciclos.
- **Out-of-order execution**: a CPU reordena instruções pra manter o pipeline cheio.
- **Speculative execution**: executa código antes de saber se ele realmente deve rodar.

Implicações:
- **Branches previsíveis** (loops, ifs com mesmo resultado em séries longas) são quase grátis.
- **Branches imprevisíveis** (ex: ramo dependendo de dado aleatório) destroem performance.
- Famosos ataques **Spectre/Meltdown** exploram speculative execution pra vazar dados entre processos.

### 2.7 Calling conventions (rápido)

Quando função A chama função B, há um protocolo:
- Como argumentos são passados (em registradores específicos, ou stack)
- Quem salva quais registradores (caller-saved vs callee-saved)
- Onde fica o return address (na stack)
- Como o stack pointer é restaurado

Em x86_64 Linux (System V ABI), os primeiros 6 args inteiros vão em `RDI, RSI, RDX, RCX, R8, R9`; resto na stack. Return value em `RAX`.

Você **raramente** mexe nisso direto, mas é o que sustenta debuggers, profilers e o conceito de **stack trace**.

---

## 3. Threshold de Maestria

Pra passar o **Portão Conceitual**, você deve conseguir, sem consultar nada:

- [ ] Dar a hierarquia de memória completa (registradores → L1 → L2 → L3 → RAM → SSD → HDD → rede), com latências em ordem de grandeza.
- [ ] Explicar o conceito de **cache line** e por que arrays são mais rápidos que linked lists em iteração.
- [ ] Distinguir **stack** vs **heap** com pelo menos 4 diferenças concretas (velocidade, tamanho, lifetime, gerência).
- [ ] Desenhar (em ASCII ou mermaid) o layout de memória de um processo (text, data, BSS, heap, stack).
- [ ] Explicar **virtual memory**: o que é uma page table, o que é page fault, o que é TLB.
- [ ] Dar um **contraexemplo** onde linked list é melhor que array (ex: inserções em meio com tamanho desconhecido + sem necessidade de iteração).
- [ ] Explicar **branch prediction** e dar um exemplo de código que tem performance ruim por mispredictions.
- [ ] Justificar por que "1 milhão de operações por segundo" é razoável pra hot path em RAM, mas absurdo se cada uma envolve disco.

---

## 4. Desafio de Engenharia

**Implementar e medir cache effects empiricamente.**

Em TypeScript (Node), construa um benchmark que mede o impacto de cache locality em performance real.

### Especificação

1. Crie duas estruturas de dados equivalentes em conteúdo:
   - **Array contíguo** (`Float64Array`) com 10 milhões de números aleatórios.
   - **Linked list** equivalente (cada nó é `{ value: number, next: Node | null }`), com os mesmos números, mas alocados em ordem aleatória no heap (pra forçar não-contiguidade, alterne com outras alocações descartáveis pra fragmentar).

2. Faça 4 benchmarks:
   - **A:** soma de todos os elementos do `Float64Array`, iteração linear (`for (let i=0; i<n; i++) sum += arr[i]`).
   - **B:** soma de todos os elementos da linked list, percorrendo `next`.
   - **C:** soma do `Float64Array` em ordem aleatória (acesso a índices aleatórios pré-computados).
   - **D:** soma do `Float64Array`, mas com salto de **stride 16** (i.e., acessa só `arr[0], arr[16], arr[32], ...`), força carregar uma cache line por elemento.

3. Use `process.hrtime.bigint()` pra medir cada um. Rode cada benchmark 5x, pegue mediana.

4. Imprima os resultados e a **razão** entre eles (ex: B é 5.3x mais lento que A).

### Entregas obrigatórias

- Repositório git separado (não neste framework).
- README explicando:
  - O que cada benchmark mede.
  - **Suas previsões antes de rodar** (escreva antes de ver os números).
  - Os resultados reais.
  - **Análise**: por que A < D < C < B (provável)? Onde a teoria de cache lines aparece?
  - Limitações do experimento (V8 JIT, GC interferência, etc).
- Código bem nomeado, sem libs externas (apenas `node` e `tsc`).
- Testes verificando que os 4 benchmarks calculam **a mesma soma** (correção antes de performance).

### Threshold

Pra passar o portão prático: você deve conseguir **explicar verbalmente cada resultado** com base nos conceitos da Teoria Hard. Se a ordem dos resultados surpreender você, **investigue até entender**: não passe o portão sem explicação.

### Stretch goal (opcional)

Faça o mesmo benchmark em C ou Rust e compare com Node. Discuta no README quanto da diferença vem de:
- Overhead da VM (V8) vs código nativo
- GC vs alocação manual
- TypedArray vs `int[]` em C

---

## 5. Extensões e Conexões

- **Conecta com [01-02, OS](01-02-operating-systems.md):** virtual memory, page faults, mmap, working set são gerenciados pelo kernel. Cache locality também depende de scheduler (mover thread entre cores invalida cache local).
- **Conecta com [01-04, Data Structures](01-04-data-structures.md):** escolha de estrutura (array vs linked list vs hash table) é em grande parte decisão de **layout de memória** e **acesso pattern**. Hash tables com open addressing > chaining em muitos casos por cache locality.
- **Conecta com [01-05, Algorithms](01-05-algorithms.md):** análise de complexidade ignora cache; mas na prática, um algoritmo O(n²) cache-friendly pode bater um O(n log n) cache-hostile pra n moderado.
- **Conecta com [01-07, JavaScript Deep](01-07-javascript-deep.md):** o V8 GC opera no heap. Hidden classes do V8 fazem objetos com mesma "shape" terem layout previsível, melhorando cache.
- **Conecta com [02-09, Postgres Deep](../02-plataforma/02-09-postgres-deep.md):** o Postgres mantém um **buffer cache** (default `shared_buffers`) na RAM. Quando query precisa de página fora do cache, vira I/O. Latência de query muda de microssegundos pra milissegundos.

### Ferramentas satélites

- **`perf` (Linux)**: profiler de baixo nível. Comandos como `perf stat`, `perf record`, `perf report` te mostram cache misses, branch mispredictions reais.
- **[FlameGraph](https://github.com/brendangregg/FlameGraph)** (Brendan Gregg): visualização de profiling.
- **`cachegrind` (parte do Valgrind)**: simula cache, conta misses por linha de código.
- **Chrome DevTools Performance** + Memory tab: aproximação no JS land.

---

## 6. Referências de Elite

### Livros (canônicos)
- **Computer Systems: A Programmer's Perspective** (Bryant & O'Hallaron, 3rd ed), "CS:APP". Capítulos 1, 5 (optimizing program performance), 6 (memory hierarchy), 7 (linking) são essenciais.
- **What Every Programmer Should Know About Memory** (Ulrich Drepper, 2007), paper de ~100 páginas, free em [people.freebsd.org/~lstewart/articles/cpumemory.pdf](https://people.freebsd.org/~lstewart/articles/cpumemory.pdf). Denso, mas é a referência absoluta sobre memória.

### Artigos e papers
- **["What scientists must know about hardware to write fast code"](https://biojulia.dev/post/hardware/)**: Jakob Nybo Nissen. Excelente intro prática.
- **["Latency Numbers Every Programmer Should Know"](https://gist.github.com/jboner/2841832)**: Jeff Dean (Google). Memorize.
- **["Mythbusting modern hardware to gain 'mechanical sympathy'"](https://www.youtube.com/watch?v=MC1EKLQ2Wmg)**: Martin Thompson. Talk excelente sobre como entender hardware moderno.

### Talks
- **["The Rust Performance Book, Profiling"](https://nnethercote.github.io/perf-book/profiling.html)**: Nicholas Nethercote. Aplica conceitos a Rust mas universal.
- **["Mechanical Sympathy: Hardware and Software Working Together"](https://mechanical-sympathy.blogspot.com/)**: Martin Thompson, blog inteiro.

### Repos
- **[V8 source](https://github.com/v8/v8)**: `src/heap/` pra ver GC; `src/objects/` pra ver layout de objects.
- **[mimalloc](https://github.com/microsoft/mimalloc)**: allocator moderno, código bem comentado.

### Specs
- **[Intel Software Developer Manuals](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)**: referência absoluta de x86_64. Volume 1 é o que importa pra começar.
- **[ARM Architecture Reference Manual](https://developer.arm.com/documentation/ddi0487/latest)**: equivalente pra ARM.

### Comunidade
- **[r/programming weekly hot](https://www.reddit.com/r/programming/top/?t=week)**: frequentemente tem discussões sobre performance hardware-aware.
- **[Performance on Twitter/X]**: siga Brendan Gregg, Andrei Alexandrescu, Aleksey Shipilëv, Mike Acton.

---

**Encerramento:** ao terminar este módulo, você passa a ler "performance" com olhos diferentes. Toda decisão posterior, escolher Array vs Map, usar Buffer ou string, fazer query com índice ou sequential scan, decidir cache strategy, vai ter como pano de fundo o que você aprendeu aqui.
