---
module: 01-11
title: Concurrency Theory, Memory Models, Locks, Lock-Free, Happens-Before
stage: fundamentos
prereqs: [01-02, 01-06]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
quiz:
  - q: "Por que no exemplo de store buffering (`x=1; r1=y` em A vs `y=1; r2=x` em B), x86 permite observar `r1=0 && r2=0`?"
    options:
      - "Porque x86 tem memory model totalmente relaxado, comparável a ARM."
      - "Porque cada CPU vê suas próprias escritas no store buffer antes que cheguem ao cache visível pra outros cores; StoreLoad reordering é permitido em TSO."
      - "Porque o compilador C++ sempre reordena stores em loops."
      - "Porque a coerência de cache MESI invalida ambos os valores simultaneamente."
    correct: 1
    explanation: "x86 TSO permite só StoreLoad reordering: o store de A vai pro store buffer local antes de propagar; quando A lê y, ainda não viu o store de B (e vice-versa). MFENCE ou seq_cst atomics resolvem ao drenar o buffer."
  - q: "Qual o trade-off prático entre spinlock e mutex parking (futex) em Linux?"
    options:
      - "Spinlock é sempre mais rápido; mutex é legacy."
      - "Spinlock queima CPU enquanto espera (ótimo pra hold curto, sem syscall); mutex parqueia a thread via syscall (caro em context switch, mas libera CPU em hold longo ou alta contenção)."
      - "Mutex usa hardware atomics, spinlock não."
      - "Spinlock só funciona em single-core; mutex em multi-core."
    correct: 1
    explanation: "Hold curto + baixa contenção: spin no atomic é nanosegundos. Hold longo + contenção: spin queima ciclos sem progresso e mutex (futex) parqueia a thread, pagando context switch (microsegundos) mas liberando o core."
  - q: "O que é o problema ABA em algoritmos lock-free baseados em CAS?"
    options:
      - "CAS pode falhar arbitrariamente em hardware ARM."
      - "O valor pode mudar de A → B → A entre o load e o CAS; o CAS tem sucesso porque vê A, mas estado intermediário (memória reusada, pointers liberados) corrompe a estrutura."
      - "Dois threads escrevem o mesmo valor simultaneamente."
      - "CAS só funciona com tipos de 32 bits."
    correct: 1
    explanation: "Em stack lock-free com pointer, um node A pode ser removido, B inserido e removido, A reinserido com lixo. Seu CAS aceita porque vê A. Solução: tagged pointer com counter de versão (DWCAS) ou hazard pointers."
  - q: "Por que release-acquire ordering basta pra publicar dados via flag `ready`?"
    options:
      - "Não basta; sempre precisa seq_cst."
      - "Stores antes de `ready.store(true, release)` não podem ser reordenados pra depois; loads após `ready.load(acquire)==true` veem todos esses stores. Forma um happens-before edge sem custo de barrier global."
      - "Porque release-acquire é só uma otimização cosmética sem garantia formal."
      - "Porque o compilador sempre emite MFENCE pra ambos."
    correct: 1
    explanation: "Release impede reordering de stores anteriores pra depois do release; acquire impede reordering de loads posteriores pra antes do acquire. Quando o consumer observa o valor publicado, todos os efeitos do publisher são visíveis. seq_cst é mais caro e desnecessário pra publish-subscribe simples."
  - q: "Qual diferença conceitual entre lock-free e wait-free?"
    options:
      - "Wait-free não usa atomics; lock-free sim."
      - "Lock-free garante que ALGUM thread sempre progride globalmente (outros podem starvar em retry storms); wait-free garante que TODO thread progride em número limitado de passos."
      - "São sinônimos; nomenclatura difere por linguagem."
      - "Wait-free é menos seguro porque permite spinning indefinido."
    correct: 1
    explanation: "Lock-free permite que um thread fique em retry loop infinito enquanto outros progridem (sem deadlock global). Wait-free é mais forte: cada operação completa em ≤ N passos independentemente do resto, exigido em sistemas hard real-time."
---

# 01-11, Concurrency Theory

## 1. Problema de Engenharia

Concorrência é a fonte mais densa de bugs sutis em software. Race conditions, deadlocks, livelocks, ABA, torn writes, memory reordering, quase ninguém aprende isso direito porque cada linguagem oferece uma abstração diferente e os fundamentos ficam escondidos. Você usa `Mutex` em Rust, `synchronized` em Java, `lock` em C#, `Promise` em JS, e acha que cada um é um conceito separado. Não é. Embaixo, todo concurrency primitive está implementando uma das poucas regras dos memory models, com trade-offs medidos em ciclos de CPU.

Este módulo é **a teoria de baixo de tudo**: o que é uma race condition formal, o que é happens-before, o que memory barriers fazem, por que `volatile` em Java não é o mesmo que `volatile` em C, como mutexes funcionam por baixo (futex no Linux), o que é lock-free, o que é wait-free, ABA problem, MESI, false sharing, e por que `Atomic<T>` não basta. Sem isso, 02-07 (Node event loop), 02-09 (Postgres MVCC), 03-11 (Go/Rust concurrency), 04-04 (resilience) viram cargo cult.

---

## 2. Teoria Hard

### 2.1 Race condition: definição formal

Race condition acontece quando **o resultado depende da ordem de execução de operações concorrentes** que acessam estado compartilhado, e pelo menos uma é escrita.

Não é "às vezes dá errado". É "o resultado não é determinístico em função das entradas". Mesmo que pareça funcionar 1000 vezes, se há ordering ambíguo entre acessos não sincronizados a estado mutável, há race.

Data race (subset mais restrito): dois threads acessam mesma localização, ≥ 1 é write, sem synchronization entre elas. Em C++ e Java, data race em memória **não atomic** é undefined behavior, não "valor errado", é UB.

### 2.2 Memory model: por que ler na ordem do código é ilusão

CPU moderna não executa na ordem que você escreveu. Faz **out-of-order execution**, **branch prediction**, **store buffer**, **cache coherence relaxada**. Compiladores também reordenam (instruction scheduling, common subexpression elimination, register allocation).

Para single-thread, isso é invisível: o resultado final é equivalente a sequencial. Para multi-thread, **outros threads podem observar reordering**. Exemplo clássico (store buffering):

```
Thread A:   x = 1; r1 = y;
Thread B:   y = 1; r2 = x;
```

Em hardware x86 com store buffer, é possível ver `r1 == 0 && r2 == 0`, porque cada CPU vê suas próprias escritas no store buffer antes de outros CPUs enxergarem. Em ARM/POWER (relaxed memory model), ainda mais reorderings são permitidos.

### 2.3 Happens-before: a relação que mata reorderings

Memory model define a relação **happens-before** (HB). Se A happens-before B, então B vê os efeitos de A garantidamente.

HB é construída por:
- **Program order**: dentro do mesmo thread, A antes de B no código → A HB B.
- **Synchronization edges**: lock release HB lock acquire (do mesmo lock); volatile/atomic write HB read; thread start HB primeira instrução do thread; thread join HB pós-join.
- **Transitividade**: A HB B e B HB C → A HB C.

Se duas operações **não** estão em relação HB, ordering é indeterminado e race é possível. Toda concorrência correta passa por construir HB explicitamente via primitives.

### 2.4 Memory barriers / fences

Barriers são instruções que **proíbem reordering** através delas:
- **Load barrier**: garante que loads antes do barrier completam antes de loads depois.
- **Store barrier**: idem para stores.
- **Full barrier**: ambos. Caro.

x86 tem ordering relativamente forte (TSO, Total Store Order); apenas StoreLoad reordering é permitido, e `MFENCE` resolve. ARM/POWER são fracos; precisa `DMB`/`DSB` em mais lugares.

Em C++11+, `std::atomic` com `memory_order_seq_cst` (default) emite barriers necessárias; `acquire`/`release`/`relaxed` permitem otimizar. Java `volatile` desde JSR-133 implica acquire/release. Rust `std::sync::atomic` espelha C++.

### 2.5 Cache coherence: MESI e amigos

Em multi-core, cada core tem cache. Coerência garante que escritas eventualmente propagam. Protocolo padrão é **MESI**:
- **Modified**: linha cacheada e suja (não está em outros caches).
- **Exclusive**: cacheada e limpa, sem cópias.
- **Shared**: cacheada, possivelmente em outros caches.
- **Invalid**: linha não válida.

Escrita em linha Shared exige invalidar cópias, custo. Variantes (MOESI, MESIF) otimizam casos. Implicação prática: contenção em cache line, mesmo sem lock, é cara.

### 2.6 False sharing

Duas variáveis em mesma cache line (~64 bytes em x86), acessadas por threads distintos, geram contenção mesmo sendo independentes. Cada escrita invalida a linha no outro core.

Mitigação: padding (alinhar struct ao tamanho da linha). Em Java, `@Contended`. Em C++, `alignas(std::hardware_destructive_interference_size)`. Em Go, `runtime.CacheLinePadSize`.

Código de high-perf concurrency (LMAX Disruptor, scheduler do Go) faz padding obsessivamente.

### 2.7 Mutex: o que está embaixo

Mutex é primitive de exclusão mútua. Versão simples: spinlock (test-and-set num atomic). Custa CPU enquanto espera; ok pra critical sections curtas.

Em Linux, mutex de userland sério usa **futex** (fast userspace mutex):
- Path rápido: atomic CAS no userspace, não envolve kernel.
- Path lento (contenção): syscall `futex(FUTEX_WAIT)` parqueia thread; `FUTEX_WAKE` desperta.

Implicação: lock não-contendido é barato (uns nanosegundos); lock contendido entra em context switch (microssegundos).

`pthread_mutex` em Linux usa futex. Java `synchronized` usa locks adaptativos (biased → thin → inflated).

### 2.8 Tipos de lock

- **Spinlock**: gira em loop checando atomic. Boa pra hold curto, ruim se hold longo (queima CPU).
- **Mutex**: parqueia thread em contenção. Boa pra hold médio.
- **RWLock** (reader-writer): múltiplos readers ou um writer. Útil quando reads >> writes.
- **Recursive mutex**: mesmo thread pode acquire múltiplas vezes; release N vezes. Geralmente sinal de design ruim, evite.
- **Semaphore**: contador, com `wait` (decrement, blocks if 0) e `post` (increment). Usado pra resource pool, signaling.

Trade-off principal: hold time vs custo de context switch. Hold curto → spin. Hold longo → park.

### 2.9 Deadlock, livelock, priority inversion

- **Deadlock**: 4 condições (Coffman): exclusão mútua, hold-and-wait, sem preempção, ciclo de espera. Quebrar qualquer uma evita. Solução prática: **lock ordering** (sempre adquirir locks em ordem global).
- **Livelock**: threads ativos mas progredindo zero (ex: dois threads cedendo continuamente um pro outro). Mais raro.
- **Priority inversion**: thread alta prioridade espera lock que low-prio segura, enquanto medium-prio preempta low-prio. Mata real-time. Solução: **priority inheritance** (low-prio herda prio do esperante).

Mars Pathfinder (1997) crashou por priority inversion, um caso famoso.

### 2.10 Lock-free e wait-free

- **Blocking** (com lock): thread pode parar indefinidamente.
- **Lock-free**: pelo menos um thread sempre progride no sistema. Implementado com CAS (compare-and-swap) loops.
- **Wait-free**: todo thread progride em número limitado de passos. Mais forte.

Exemplo lock-free counter:
```
loop {
  let cur = atomic.load();
  if atomic.compare_exchange(cur, cur + 1).is_ok() { break }
}
```

CAS retorna falha se outro thread escreveu antes; tenta de novo. Em alta contenção, pode ter retry storm. Não é mágica.

### 2.11 ABA problem

CAS verifica que valor é igual ao esperado. Mas valor pode ter mudado de A → B → A entre leitura e CAS, você não detecta. Exemplo: stack lock-free com pointer; node A removido, B colocado e removido, A colocado de volta com lixo. Seu CAS aceita.

Solução: **counter de versão** (double-word CAS, ou tagged pointer com bits de versão). Hardware com `LL/SC` (load-linked, store-conditional, em ARM/POWER) detecta naturalmente.

### 2.12 Atômicas e memory orders em C++/Rust

- `relaxed`: só atomicidade, sem ordering. Ex: contador estatístico.
- `acquire`: barrier após load. Tudo após o load não pode ser reordenado pra antes.
- `release`: barrier antes do store. Tudo antes do store não pode ser reordenado pra depois.
- `acq_rel`: ambos (em RMW).
- `seq_cst`: ordering total global. Mais forte, mais caro.

Padrão release-acquire é o usado pra publicar dados:
```
// publisher
data = computed_value;
ready.store(true, release);

// consumer
if ready.load(acquire) { use(data) }
```

Sem release/acquire, consumer pode ler `ready=true` mas `data` antigo (CPU reordenou).

### 2.13 Modelos de concorrência: threads, async, actors, CSP

- **Threads + shared memory**: o modelo "default". Difícil de raciocinar.
- **Async/await (event loop)**: cooperativo, single-threaded por padrão (Node), evita races mas não elimina (callbacks reentrantes, await em meio de operação).
- **Actor model** (Erlang, Akka): atores trocam mensagens, sem memória compartilhada. Race ainda existe (mensagens fora de ordem), mas controlada.
- **CSP** (Go goroutines + channels): primitive principal é channel. "Don't communicate by sharing memory; share memory by communicating."
- **STM** (Software Transactional Memory, Haskell, Clojure): transações de memória, retry automático em conflito.

Cada modelo é um **trade-off em quem garante o quê**. Threads delegam tudo ao programador; async restringe interleaving; actors isolam estado; CSP esconde shared memory atrás de canais.

### 2.14 JS event loop é concorrência?

Sim. Não há paralelismo de execução de JS (single thread), mas há concorrência de **completions**: callbacks rodam interleaved entre await points. Isso gera bugs sutis: você lê `state`, await, decide com base no que leu, mas outro callback mudou state durante o await.

Workers (Web Workers, Worker Threads em Node) introduzem paralelismo real, com `SharedArrayBuffer` e `Atomics`, aí caem todos os memory model issues.

### 2.15 Performance: contention é o vilão

Lock não-contendido custa pouco. Lock contendido custa muito (context switch + cache invalidations). Patterns:
- **Sharding**: múltiplos locks finos > um lock grosso. Counter shardado por core, soma na leitura.
- **Read-mostly**: RWLock ou data structures imutáveis (copy-on-write).
- **Hand-over-hand locking**: em listas/árvores, segura lock do nó atual e do próximo, libera o anterior.
- **Lock-free quando vale**: queue, stack, hash map. Vencem em contention alta, perdem em contention baixa por overhead de CAS loops.
- **Per-thread state**: cada thread tem cópia, agrega no fim. Java `ThreadLocal`, Go `sync.Pool`.

### 2.16 Concurrency vs paralelismo

- **Concorrência**: estruturar programa em tarefas que **podem** progredir independentes. Não exige múltiplos cores.
- **Paralelismo**: tarefas **executam ao mesmo tempo** em hardware paralelo.

Concorrência é design; paralelismo é execução. Programa pode ser concorrente sem ser paralelo (Node) ou paralelo sem ser concorrente (cálculo numérico data-parallel).

### 2.17 Modelos de concorrência: CSP, Actors, async/await comparados

Três famílias dominam concorrência aplicada em 2026. Vale entender as diferenças porque escolha errada de modelo destrói código.

**CSP (Communicating Sequential Processes), Go, Clojure core.async**

Hoare 1978. Processos leves comunicam via **canais síncronos**. Sem estado compartilhado entre goroutines.

```go
ch := make(chan int)
go func() { ch <- compute() }()    // sender bloqueia até alguém receber
result := <-ch                      // receiver bloqueia até alguém mandar
```

- **Goroutine**: thread userland (~2KB stack inicial, cresce). Runtime do Go scheduule N goroutines em M threads OS.
- **Canal**: queue tipada com semantics de bloqueio explícitas (sync ou bufferizada).
- **`select`**: espera múltiplos canais, primitiva de composição.

Trade-offs: trivial pra fan-out/fan-in. Difícil pra estado compartilhado complexo (você acaba reinventando mutex via canais). Race detector do Go (`go run -race`) mitiga, mas não cobre tudo.

**Actor model, Erlang, Elixir, Akka (Scala/Java), Pony**

Hewitt 1973. Actor é **unidade de estado privado** que se comunica via **mensagens assíncronas** num **mailbox**.

```elixir
spawn(fn ->
  receive do
    {:add, x, y, sender} -> send(sender, x + y)
  end
end)
```

- Sem estado compartilhado. Toda comunicação é mensagem.
- Mailbox isola, actor processa uma mensagem por vez (event loop interno).
- **"Let it crash"** (Erlang/OTP): actors falham e são re-spawned por supervisor. Tolerância a falhas é first-class.
- BEAM VM (Erlang) preempção em ~2000 reductions; isolation real entre actors.

Trade-offs: ótimo pra sistemas distribuídos com falhas independentes (WhatsApp em Erlang, Discord em Elixir). Custo: cada interação tem latência de mensagem; sequencing de operações cross-actor exige tracking explícito.

**async/await, Rust, JS/TS, C#, Python, Kotlin coroutines**

Função suspende (`await`) sem bloquear thread. **Stackless** em Rust/C# (compilador transforma em state machine), **stackful** em algumas runtimes (Java virtual threads, Loom).

```rust
async fn fetch_user(id: u64) -> Result<User, Error> {
    let resp = client.get(&format!("/u/{id}")).send().await?;
    Ok(resp.json().await?)
}
```

- **Single-threaded run-to-completion** em JS (event loop). **Multi-threaded work-stealing** em Tokio (Rust), futures podem migrar entre threads, exigindo `Send`.
- **Cooperative scheduling**: você cede no `await`. Loop quente sem `await` causa starvation.
- Cancellation propaga via Drop (Rust), `CancellationToken` (.NET), `AbortController` (JS).

Trade-offs: zero-cost em Rust (state machine compilada). Em JS é trivial mas constringido a single-threaded. Java só ganhou virtual threads (Loom, Java 21+), abriu uso de blocking APIs em alta concorrência sem callback hell.

**Tabela comparativa**

| Aspecto | CSP (Go) | Actors (Erlang) | async/await (Rust/Tokio) |
|---|---|---|---|
| Comunicação | Canal tipado | Mensagem em mailbox | Future + shared state ou channels |
| Isolamento | Convenção | First-class (sem shared) | Convenção (`Send`/`Sync` ajuda) |
| Falhas | panic propaga | Crash + supervisor | `Result` propagado |
| Schedule | Runtime-managed (M:N) | BEAM preempção | Cooperativo, runtime escolhe |
| Estado compartilhado | Possível (mutex) | Não (apenas via msg) | Possível (`Arc<Mutex<_>>`) |
| Composição | `select` | Pattern match em receive | `join!`, `select!`, `tokio::spawn` |
| Distribuído | Manual | Native (Erlang distribution) | Manual |
| Hot reload | Não | Native | Não |

**Quando escolher:**
- **Latência alta tail / fault-tolerance crítica** (telecom, gaming server, payment routing): Actors.
- **Pipeline data + workers cooperando localmente** (web server moderno, scrapers): CSP ou async.
- **CPU-bound + alta concorrência I/O simultânea** (proxies, gateways, servers de baixa latência): async em Rust/Tokio.
- **Ecossistema JS-only**: async/await + workers quando precisar paralelismo real.

Modelos não são exclusivos: Akka adiciona streams (CSP-like) sobre actors; Tokio tem `tokio::sync::mpsc` (channel CSP-style sobre futures).

**Cruza com:** **01-07 §2.12** (Symbol.dispose + `using` em ES2024 — explicit resource management análogo a Python `with`/Rust RAII), **02-17 §2.20** (mobile structured concurrency — Swift actors + Kotlin Coroutines).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Definir race condition formalmente (ordering ambíguo + ≥ 1 write) e dar exemplo em pseudocódigo.
- Explicar por que store buffer permite `r1=0 && r2=0` no exemplo do §2.2.
- Explicar happens-before e dar 3 fontes de HB (program order, sync, transitividade).
- Diferenciar `acquire`, `release`, `seq_cst`. Mostrar quando relaxed basta.
- Explicar ABA e como tagged pointer resolve.
- Diferenciar lock-free e wait-free. Dar caso onde wait-free é exigido (real-time).
- Listar 4 condições de Coffman e como lock ordering quebra a 4ª.
- Explicar futex: path rápido vs lento.
- Explicar false sharing e como detectar (perf counters de cache misses).
- Justificar quando shardar lock vs usar lock-free vs usar RWLock.
- Explicar por que `volatile` em Java (pós-JSR-133) ≠ `volatile` em C, semântica de memory ordering, não apenas no-cache.

---

## 4. Desafio de Engenharia

Construir uma **biblioteca mínima de primitives concorrentes em Rust** + benchmark que demonstra ordering issues.

### Especificação

1. **Setup**: Rust stable, Cargo workspace.
2. **Crate `mini_sync`**:
   - **`SpinLock<T>`** com `lock()`/`unlock()` baseado em `AtomicBool` com `acquire`/`release`.
   - **`Mutex<T>`** que faz spin curto (até N tentativas) e depois parqueia thread via `parking_lot::park` ou syscall futex direto (Linux only ok).
   - **`RwLock<T>`** com prioridade configurável (writer-preferring vs reader-preferring).
   - **`Channel<T>` bounded** lock-free (single-producer single-consumer) usando ring buffer + atomic head/tail com `acquire`/`release`.
3. **Demos de bugs (em testes)**:
   - **Test que falha sem ordering correto**: variação de store buffering com `relaxed`. Mostre que `seq_cst` ou release/acquire corrige.
   - **ABA scenario**: implemente stack ingênua com CAS sem versão; produza ABA com 3 threads. Depois corrija com tagged pointer.
   - **False sharing**: dois counters em mesma cache line vs paddados. Bench `criterion` mostra diferença.
4. **Benchmarks (`criterion`)**:
   - SpinLock vs Mutex em hold curto vs longo, em 1/2/8 threads.
   - Channel SPSC vs `std::sync::mpsc` em throughput.
5. **Análise (`analysis.md`)**:
   - Tabela de resultados.
   - Por que SpinLock vence Mutex em hold curto (sem syscall).
   - Por que padding fechou X% do gap em false sharing.
   - Onde release/acquire bastou e onde precisou de seq_cst.

### Restrições

- Sem `std::sync::Mutex` ou `parking_lot::Mutex` no `Mutex<T>`, implemente.
- Pode usar `std::sync::atomic` e syscalls.
- Cada teste de bug deve falhar **deterministicamente** (use `loom` ou `shuttle` pra explorar interleavings).

### Threshold

- Todos os testes passam.
- Bench reproduz: hold curto SpinLock < Mutex; hold longo Mutex < SpinLock.
- Demo de ABA falha sem versão e passa com.
- Demo de false sharing mostra ≥ 3x diferença.

### Stretch

- Implemente **MCS lock** (lista ligada de waiters, fair, baixo cache traffic).
- Adicione **Treiber stack** lock-free com hazard pointers (memory reclamation).
- Use `loom` pra exhaustively model-check seu Channel SPSC.
- Compare seu Mutex com `parking_lot::Mutex` num bench realista, explique a diferença.

---

## 5. Extensões e Conexões

- Liga com **01-02** (OS): futex, context switch, scheduler.
- Liga com **01-06** (paradigms): actors, CSP, STM como alternativas a shared memory.
- Liga com **01-07** (JS): event loop como modelo concorrente; Workers + Atomics.
- Liga com **02-07** (Node internals): libuv pool, race entre callbacks.
- Liga com **02-09** (Postgres MVCC): isolation = forma de ordering em DB.
- Liga com **02-11** (Redis): single-threaded design escapa de muito disso.
- Liga com **03-10** (backend perf): contention é gargalo principal em alta concorrência.
- Liga com **03-11** (Go/Rust): goroutines + channels (CSP), Send/Sync em Rust.
- Liga com **04-04** (resilience): backpressure, bulkheads são patterns concorrentes.
- Liga com **04-14** (Formal Methods): TLA+ modela concorrência formalmente.

---

## 6. Referências

- **"The Art of Multiprocessor Programming"**: Herlihy & Shavit. Bíblia.
- **"Is Parallel Programming Hard, And, If So, What Can You Do About It?"**: Paul McKenney. Gratuito.
- **"C++ Concurrency in Action"**: Anthony Williams.
- **JSR-133 (Java Memory Model) FAQ**: Bill Pugh, Jeremy Manson.
- **"Memory Barriers: a Hardware View for Software Hackers"**: McKenney.
- **Preshing on Programming** ([preshing.com](https://preshing.com/)), series sobre lock-free e memory models.
- **`loom` docs**: model checker pra Rust concurrency.
- **LMAX Disruptor paper**: caso real de mechanical sympathy.
- **"Linux Kernel Memory Model"**: Documentation/memory-barriers.txt.
