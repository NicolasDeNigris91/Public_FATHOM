---
module: 03-11
title: Systems Languages, Go and Rust for Backend Engineers
stage: producao
prereqs: [01-06, 01-07, 02-07]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
quiz:
  - q: "Por que segurar um Mutex sync (não-async) através de um .await é antipattern crítico em Tokio?"
    options:
      - "O compilador Rust não permite essa construção"
      - "A task suspende segurando o lock, bloqueando outras tasks que tentam adquirir o mesmo lock"
      - "Mutexes não funcionam em código async"
      - "Causa stack overflow imediato"
    correct: 1
    explanation: "Quando a task suspende em .await segurando lock sync, qualquer outra task que precise do lock fica bloqueada indefinidamente. Solução: drop antes do await ou usar tokio::sync::Mutex async-aware."
  - q: "Qual a regra de ownership do Rust que elimina data races em compile time?"
    options:
      - "Sempre múltiplos &mut T simultâneos são permitidos"
      - "Ou múltiplos &T (read-only), ou um único &mut T, nunca ambos vivos simultaneamente"
      - "Apenas um &T pode existir por vez"
      - "Ownership é checado em runtime via reference counting"
    correct: 1
    explanation: "O borrow checker garante exclusividade de mutable borrow: ou você tem múltiplos shared references ou exatamente um mutable reference. Isso elimina data races estaticamente."
  - q: "Por que errgroup.SetLimit(N) é obrigatório em loops unbounded em Go?"
    options:
      - "Sem ele o código não compila"
      - "Sem limit, processar 1M items dispara 1M goroutines = OOM"
      - "errgroup só funciona com limit configurado"
      - "Por convenção de estilo, sem efeito real"
    correct: 1
    explanation: "errgroup sem SetLimit lança goroutines unbounded. Em workloads com milhões de items, isso esgota memória rapidamente. SetLimit faz bounded concurrency com semáforo interno."
  - q: "Qual cenário justifica escolher Zig ao invés de Rust em 2026?"
    options:
      - "Web service backend long-running com alta concorrência"
      - "Embedded, kernel-adjacent, build tooling, allocator-conscious work com C interop trivial"
      - "Greenfield CRUD com time grande"
      - "Sistema bancário com requisitos de safety crítico"
    correct: 1
    explanation: "Zig é C replacement, não Rust replacement. Brilha em embedded, kernel modules, build tools (zig cc/zig build) e onde manual memory management com comptime é desejável. Para safety-critical long-running, Rust vence."
  - q: "Por que tokio::select! exige cancellation safety nas branches?"
    options:
      - "Branches não selecionadas são canceladas, dropando futures no meio do trabalho"
      - "Select é executado em ordem aleatória"
      - "Select sempre executa todas branches paralelamente"
      - "Select tem overhead de runtime alto"
    correct: 0
    explanation: "Quando uma branch vence o select, as outras são canceladas (futures dropped). Side effects parciais (escrita DB, send rede) ficam órfãos. O work em branches deve ser idempotente ou ter rollback explícito."
---

# 03-11, Systems Languages

## 1. Problema de Engenharia

JS/TS resolve 80% dos backends. Os 20% restantes, alta concorrência, latência sub-ms, processamento CPU-bound, ferramentas de infra, runtime crítico, pedem sistemas com tipos fortes, GC controlado ou ausente, concorrência primeiro-classe. Go e Rust dominam essa categoria. Você não precisa migrar Logística inteira. Precisa entender quando trazer ferramenta apropriada e ter conforto pra ler ecossistema (Docker, Kubernetes, Terraform, Tailscale são Go; Tauri, Astral tools, Polars, ripgrep são Rust).

Este módulo é Go e Rust **pra engenheiro full-stack**: não pra virar Rustacean ou Gopher hardcore. Modelo mental, idioms, concorrência, ecossistema, e quando cada um vence. Construir 1 serviço útil em cada.

---

## 2. Teoria Hard

### 2.1 Go, visão geral

Lançado 2009 (Google). Design: simples, tipagem estática, GC, concurrency primeira-classe (goroutines + channels), compilação rápida pra binário estático.

**Pros**:
- Sintaxe minúscula. Aprende em 1 semana.
- GC otimizada pra latência (sub-ms tail).
- Goroutines: M:N scheduler. Centenas de milhares triviais.
- Standard library forte (HTTP, JSON, crypto, encoding).
- Cross-compile fácil. Binário estático.
- Toolchain unificada (`go build`, `go test`, `gofmt`).

**Cons**:
- Erros explícitos por valor (`if err != nil`) verbose.
- Generics chegaram em 1.18 (2022), antes era reflection.
- Sem enums proper (constantes + types).
- Tratamento de errors via wrap manual.
- Sem null safety; nil pointer panics ainda existem.

### 2.2 Go, concorrência

Goroutines são green threads. `go f()` agenda; runtime schedula em P (processor) bound a M (OS thread).

**Channels**: comunicação tipada entre goroutines.
```go
ch := make(chan int, 10)  // buffered
go func() { ch <- 42 }()
v := <-ch
```

**Select**: multiplexa channels.
```go
select {
case v := <-ch1: ...
case v := <-ch2: ...
case <-time.After(1*time.Second): ...
}
```

**Context**: cancellation, deadline, request-scoped values. Padrão obrigatório em Go server-side moderno.

**sync**: Mutex, RWMutex, WaitGroup, Once, atomic.

Padrões:
- Pipeline (stages connected by channels).
- Fan-out / fan-in.
- Worker pool.

Mantra: "Don't communicate by sharing memory; share memory by communicating."

### 2.3 Go, error handling

```go
data, err := os.ReadFile("x")
if err != nil {
  return fmt.Errorf("read: %w", err)
}
```

`errors.Is`, `errors.As` pra pattern matching de error chains.

Sem exceptions. Funções devolvem `(T, error)`. `panic`/`recover` reservados pra programmer errors.

### 2.4 Go, ecosystem

- **gin, echo, fiber, chi, gorilla/mux**: HTTP frameworks.
- **net/http** stdlib bem suficiente. Frameworks geralmente pra ergonomia.
- **sqlc, ent, GORM**: DB.
- **golangci-lint**: meta-linter.
- **wire, fx**: DI.
- **cobra, urfave/cli**: CLI.
- **Kubernetes, Docker, Terraform, etcd**: tudo Go. Familiarity te dá leitura desses códigos.

### 2.5 Rust, visão geral

Lançado 2010 (Mozilla). Design: zero-cost abstractions, memory safety sem GC via ownership/borrow checker, type system rico (sum types, traits, generics, lifetimes).

**Pros**:
- Performance C/C++ com safety.
- Sem GC, latência previsível.
- Tooling excepcional (cargo).
- Type system entre os melhores (ADTs, pattern matching, traits).
- Concurrency safe at compile time.
- Ecossistema crescendo rápido (Tokio, Axum, Polars).

**Cons**:
- Curva de aprendizado íngreme (borrow checker, lifetimes).
- Compilação lenta.
- Ecossistema menos maduro em DBs/ORMs vs Go.
- Verbose em casos simples.
- Refactor pode forçar mudanças amplas em assinaturas (lifetime parameters propagam).

### 2.6 Rust, ownership

Cada valor tem 1 owner. Quando owner sai de escopo, valor é dropped.

Move semantics:
```rust
let s = String::from("hi");
let s2 = s;  // s movido pra s2; s não mais válido
```

Borrow:
```rust
fn len(s: &String) -> usize { s.len() }
let s = String::from("hi");
let n = len(&s);  // empresta &s; s ainda válido depois
```

Mutable borrow exclusivo:
```rust
let mut s = String::from("hi");
let r1 = &mut s;
r1.push_str("!");
// não pode haver outro &s ou &mut s vivo enquanto r1 está
```

Compile-time guaranteia: ou múltiplos &T, ou um &mut T, nunca ambos. Elimina data races em concurrent code.

### 2.7 Rust, lifetimes

Funções/structs anotam quanto tempo refs vivem:
```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
  if x.len() > y.len() { x } else { y }
}
```

`'a` é parâmetro lifetime: output vive enquanto inputs vivem.

Em 90% dos casos, lifetime elision (compiler infere) basta. Quando precisa anotar manualmente, é sinal de design refinement.

### 2.8 Rust, Result, Option, pattern matching

```rust
enum Option<T> { Some(T), None }
enum Result<T, E> { Ok(T), Err(E) }
```

Sem null. Sem exceptions.

```rust
match parse(input) {
  Ok(value) => use_it(value),
  Err(e) => log(e),
}

let v = parse(input)?;  // ? propaga Err pro caller
```

`?` operator é game-changer pra ergonomia.

### 2.9 Rust, traits e generics

Traits = interfaces.
```rust
trait Animal { fn name(&self) -> &str; }
impl Animal for Dog { fn name(&self) -> &str { "Rex" } }
```

Generic constraint:
```rust
fn print<T: Animal>(a: &T) { println!("{}", a.name()); }
```

Trait objects (`dyn Trait`) pra dispatch dinâmico.

Type system suporta higher-ranked traits, associated types, GATs (generic associated types).

### 2.10 Rust, concorrência

- **Threads**: `std::thread::spawn`, OS threads.
- **Channels**: `std::sync::mpsc`. `crossbeam` é alternativa mais rica.
- **`Mutex<T>`, `RwLock<T>`** (lock-based).
- **`Arc<T>`**: atomic reference count, share ownership across threads.
- **Async**: `async fn` + `.await`. Runtime separado.

**Tokio** é runtime async predominante. **async-std** alternativa. **smol** mais leve.

```rust
#[tokio::main]
async fn main() {
  let resp = reqwest::get("https://api").await.unwrap();
  println!("{}", resp.text().await.unwrap());
}
```

Send + Sync traits codificam thread-safety no type system.

### 2.11 Rust, ecosystem backend

- **Axum** (Tokio team): async HTTP framework. Padrão atual.
- **Actix-web**: maduro, performance forte.
- **Rocket**: ergonomia, evoluindo pra async.
- **sqlx**: async SQL com macros compile-time check.
- **diesel**: ORM síncrono (com extensions async).
- **SeaORM**: async ORM.
- **serde**: serialização universal.
- **tracing**: observability.
- **clap**: CLI.

### 2.12 Quando usar Go

- Tooling de infra (CLI, daemon).
- Microservices simples com alto throughput.
- Tradução direta de scripts/Python pra serviço produtivo.
- Time grande sem expertise em sistema.
- Onde compile time importa (Docker, K8s).

### 2.13 Quando usar Rust

- Latência crítica (trading, gaming, embedded).
- Processamento CPU-bound (parsing massivo, ML inference, data pipelines com Polars).
- Compartilhamento com WASM (03-12).
- Ferramenta CLI alta performance (ripgrep, bat, lsd, ruff).
- Sistemas onde memory safety é gate (kernel modules, segurança).
- Quando você precisa do type system mais rico.

### 2.14 Polyglot architecture

Você não migra Logística pra Go ou Rust inteira. Você adiciona componente onde justifica:
- Routing engine de entrega calculando rotas com 1000+ pontos: Rust binary, exposto via gRPC ou stdin/stdout.
- High-throughput webhook ingestor: Go service.
- CDC consumer (Kafka → Postgres outbox): Go ou Rust.

Comunicação: gRPC, HTTP, NATS, Redis Streams.

### 2.15 Build e deploy

Go:
- Single binary. `go build`. Cross-compile (`GOOS=linux GOARCH=arm64`).
- Docker: `FROM scratch` com binário static (CGO_ENABLED=0).
- Imagem 5-30 MB.

Rust:
- Cargo. `cargo build --release`.
- musl pra static (`x86_64-unknown-linux-musl`).
- Imagem 10-50 MB; debug symbols stripped.
- Build slow → use sccache, cargo-chef em Docker.

### 2.16 Interop

- **Go ↔ JS**: via HTTP/gRPC, ou via FFI (CGO).
- **Rust ↔ JS**: napi-rs (N-API addon Node), neon. Rust functions exposed como Node modules.
- **Rust ↔ Python**: PyO3.
- **Rust → WASM** (03-12): `wasm-bindgen`, `wasm-pack`. Native pra browser.

### 2.17 Async em Rust vs Go

Go: goroutines + channels. Runtime hide async; você chama bloqueante e runtime suspende.

Rust: explicit `async fn`, Future trait, runtime (Tokio) escolhido. Mais ceremony, mais controle. "Function coloring", async vira viral em assinaturas.

Go é mais fácil de adotar pra backend. Rust é mais expressivo pra sistemas onde async coexiste com sync.

#### Tokio internals e armadilhas reais

Tokio é o runtime async dominante em Rust 2026 (~90% do ecosystem backend). Anatomia mínima que separa quem usa de quem entende:

**Modelo de execução:**
- **Tasks** (`tokio::spawn`): unidades de trabalho cooperativo. Cada task vira state machine compilada do `async fn` (cada `.await` é um suspend point).
- **Reactor** (mio underlying): epoll/kqueue/IOCP que multiplexa I/O.
- **Scheduler**: 2 modos — `multi_thread` (default, work-stealing entre N threads) ou `current_thread` (single-thread, sem Send required).
- **Workers blocking**: `tokio::task::spawn_blocking` envia trabalho CPU-bound pra thread pool separada (não trava o reactor).

**Pin e por que existe:**

`async fn` compila pra state machine que pode conter referências auto-referenciais (variável local apontando pra outra variável local na mesma struct). Mover essa struct na memória invalida ponteiros. **`Pin<&mut T>`** garante que valor não move depois de pinned.

```rust
use std::pin::Pin;

async fn read_file() -> String {
    let mut buf = String::new();
    let f = File::open("x").await?;
    f.read_to_string(&mut buf).await?;  // buf é referenciado pela future de read
    buf
}
// Future tem &mut buf interno. Pin garante que future não move após poll.
```

99% do código de aplicação não toca `Pin` direto (compiler resolve). Você encontra quando: implementa `Future` manualmente, escreve combinator, faz FFI com C async.

**Send vs !Send em práticas:**

Multi-thread runtime exige tasks `Send` (movíveis entre threads). Holding `Rc<T>` (não-Send) ou `RefCell<T>` ao longo de `.await` quebra:

```rust
// NÃO COMPILA em multi-thread runtime
async fn bad() {
    let rc = Rc::new(42);
    some_io().await;     // Rc atravessa await ⇒ task precisa ser Send ⇒ erro
    println!("{}", rc);
}
```

**Solução pragmática**: use `Arc<T>` (Send + Sync) ou `tokio::sync::Mutex` (Send), ou faça scope que dropa antes do await:

```rust
async fn good() {
    {
        let rc = Rc::new(42);
        println!("{}", rc);
    }                    // rc dropado antes do await
    some_io().await;
}
```

**Holding lock across await — antipattern crítico:**

```rust
// DEADLOCK iminente em produção
let guard = std::sync::Mutex::lock(&data).unwrap();
some_io().await;          // task suspende SEGURANDO lock
process(&*guard);          // outra task que tenta lock fica bloqueada
```

Padrões de fix:
1. **Drop antes do await**: copie valor, libere lock, depois await.
2. **`tokio::sync::Mutex`**: lock async-aware; `.lock().await` em vez de `.lock()`. Lock é cancellation-safe e libera ao await externo se necessário.
3. **Reestruture**: lock só guarda computação CPU-only; I/O fora do escopo do lock.

```rust
// Padrão recomendado
let snapshot = data.lock().unwrap().clone();   // libera lock
let result = some_io(snapshot).await;
data.lock().unwrap().merge(result);            // re-lock pra mutação
```

**Function coloring custo real:**

Async é "viral" em Rust: `fn foo()` chama `async fn bar()` precisa virar `async fn`. Mover library de sync pra async é refactor cross-código.

Mitigações:
- **`block_on`**: `tokio::runtime::Handle::current().block_on(future)` chama async de contexto sync. Custoso (cria runtime ad-hoc) e perigoso (deadlock se chamado dentro de runtime). Use só em main, tests, FFI.
- **`futures::executor::block_on`**: para libs que não querem dependência de Tokio.
- **`pollster`**: micro executor pra cases simples.

**Decisão runtime:**

| Workload | Runtime |
|---|---|
| Backend HTTP general purpose | `#[tokio::main]` (multi_thread default) |
| Embedded / WASM / sem threads | `current_thread` flavor |
| GUI app (precisa main thread) | `current_thread` + `LocalSet` |
| CPU-heavy intercalado com IO | `multi_thread` + `spawn_blocking` pro CPU |

**Observabilidade:**
- **`tokio-console`**: top-style UI mostra tasks vivas, tempo bloqueado, contention. Use em dev/staging quando suspeita de task stuck.
- **`tracing` + `tracing-subscriber`**: logging estruturado com spans seguindo task hierarchy.

Cruza com **01-11** (memory model + sync primitives), **02-07** (Node single-thread vs Tokio multi-thread comparação), **04-04** (deadline propagation com `tokio::time::timeout`).

### 2.18 Go concurrency patterns aplicados — channels, select, errgroup, context

Go concurrency é "fácil de começar, difícil de fazer certo em produção". Goroutine leak, channel deadlock, context não-propagado, race condition silencioso são as 4 modos de falha que matam apps Go em scale. Esta seção empacota patterns operacionais — código copy-paste-pronto pra Logística pickup dispatcher.

**Pattern 1: errgroup com context cancellation** — substitui `sync.WaitGroup` cru:

```go
import (
    "context"
    "golang.org/x/sync/errgroup"
)

func dispatchToCouriers(ctx context.Context, order *Order, couriers []*Courier) error {
    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(10)  // bounded concurrency

    for _, c := range couriers {
        c := c
        g.Go(func() error {
            return notifyCourier(ctx, c, order)
        })
    }
    return g.Wait()
}
```

- `errgroup.WithContext`: primeira goroutine que retorna erro cancela ctx; outras encerram cedo.
- `SetLimit(N)`: bounded; sem ele, 10k couriers = 10k goroutines = OOM.
- `c := c` shadow: closure captura iteração; sem shadow, todas goroutines veem último `c` (Go < 1.22). Em Go 1.22+ o range loop var é per-iteration, mas mantenha shadow pra portabilidade.

**Pattern 2: select com timeout + cancellation:**

```go
func waitForCourierAck(ctx context.Context, ackCh <-chan Ack) (Ack, error) {
    timer := time.NewTimer(30 * time.Second)
    defer timer.Stop()

    select {
    case ack := <-ackCh:
        return ack, nil
    case <-timer.C:
        return Ack{}, ErrAckTimeout
    case <-ctx.Done():
        return Ack{}, ctx.Err()
    }
}
```

- Sempre `defer timer.Stop()` — sem isso, leak de timer goroutine.
- `ctx.Done()` first-class: sem ele, função ignora cancellation (request cancelado, ainda espera ack).
- **Anti-pattern**: `time.After(30 * time.Second)` em select — cria timer novo a cada call; em high-throughput loop = leak garantido.

**Pattern 3: context propagation cross-service:**

```go
func handleOrderRequest(w http.ResponseWriter, r *http.Request) {
    ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
    defer cancel()

    ctx = context.WithValue(ctx, traceIDKey{}, generateTraceID())

    order, err := svc.CreateOrder(ctx, ...)
    if err != nil {
        if errors.Is(err, context.DeadlineExceeded) {
            http.Error(w, "timeout", http.StatusGatewayTimeout)
            return
        }
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    json.NewEncoder(w).Encode(order)
}
```

- **Regra**: ctx é PRIMEIRO arg, sempre. `func Foo(ctx context.Context, ...) error`. Linters (`contextcheck`) reforçam.
- `r.Context()` propaga cancellation do client (HTTP/2 `RST_STREAM`, client disconnect).
- `context.WithValue` para request-scoped data (trace_id, user_id), nunca para configuração.

**Pattern 4: pipeline com channels (fan-out/fan-in):**

```go
func dispatchPipeline(ctx context.Context, orders <-chan Order) <-chan Result {
    out := make(chan Result, 100)  // buffered

    go func() {
        defer close(out)
        g, ctx := errgroup.WithContext(ctx)
        g.SetLimit(20)

        for order := range orders {
            order := order
            g.Go(func() error {
                r, err := processOrder(ctx, order)
                if err != nil {
                    return err
                }
                select {
                case out <- r:
                    return nil
                case <-ctx.Done():
                    return ctx.Err()
                }
            })
        }
        if err := g.Wait(); err != nil {
            // log; out já closed via defer
        }
    }()
    return out
}
```

- `defer close(out)` — único produtor pode fechar. Múltiplos produtores fechando = panic.
- Send em `out` em select com `ctx.Done()` — sem isso, goroutine bloqueia em send se consumidor sumiu.

**Pattern 5: graceful shutdown coordinated:**

```go
func main() {
    ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
    defer cancel()

    srv := &http.Server{Addr: ":8080", Handler: mux}

    g, gCtx := errgroup.WithContext(ctx)
    g.Go(func() error {
        return srv.ListenAndServe()
    })
    g.Go(func() error {
        <-gCtx.Done()
        shutCtx, shutCancel := context.WithTimeout(context.Background(), 25*time.Second)
        defer shutCancel()
        return srv.Shutdown(shutCtx)
    })

    if err := g.Wait(); err != nil && !errors.Is(err, http.ErrServerClosed) {
        log.Fatal(err)
    }
}
```

- `signal.NotifyContext` (Go 1.16+) substitui `signal.Notify` + manual handler.
- Shutdown ctx com timeout SEPARADO do request ctx — drain in-flight requests + abort se passar 25s.
- Important: orchestrator (K8s) manda SIGTERM e aguarda `terminationGracePeriodSeconds` (default 30s). Mantenha shutdown < grace period - 5s buffer.

**Pattern 6: detectar goroutine leak:**

```go
import "go.uber.org/goleak"

func TestMain(m *testing.M) {
    goleak.VerifyTestMain(m)
}
```

- Roda todas tests + verifica que goroutines transitórias terminaram. Pega leaks em CI.
- Em prod: `runtime.NumGoroutine()` exposto via `/debug/pprof/goroutine` (net/http/pprof) + Prometheus gauge. Trend crescente monotônico = leak.

**Pattern 7: sync.Pool pra alloc-heavy hot paths:**

```go
var bufPool = sync.Pool{
    New: func() any {
        return new(bytes.Buffer)
    },
}

func formatTrackingPing(p *Ping) []byte {
    buf := bufPool.Get().(*bytes.Buffer)
    defer func() {
        buf.Reset()
        bufPool.Put(buf)
    }()
    fmt.Fprintf(buf, `{"lat":%f,"lng":%f,"ts":%d}`, p.Lat, p.Lng, p.TS.Unix())
    out := make([]byte, buf.Len())
    copy(out, buf.Bytes())
    return out
}
```

- **Pegadinha**: pool tem GC pressure. Use APENAS quando alloc é hot path real (validar com pprof). Caso contrário, complexidade sem ganho.
- Reset SEMPRE antes de Put — senão lixo do uso anterior persiste.

**Anti-patterns observados em produção Logística:**

- **Goroutine sem ctx.Done()**: `go func() { for { processBatch() } }()` — nunca para. Use ticker + ctx select.
- **`time.After` em loop**: cria timer por iteração, GC depois de 30s. Use `time.NewTimer` + reset.
- **Holding lock across channel send**: `mu.Lock(); ch <- v; mu.Unlock()` — channel pode bloquear → deadlock se outro path quer mu. Send fora da lock.
- **Channel não-buffered em fan-out sem consumidor garantido**: producer trava. Use buffered + select com Default ou ctx.Done().
- **`recover()` em goroutine sem propagação**: panic engolido, processo continua zumbi. Sempre log + propaga via channel de erro.
- **`context.Background()` em handler HTTP**: perde cancellation do client. Use `r.Context()`.
- **errgroup sem SetLimit em loop unbounded**: 1M items = 1M goroutines = OOM. Limit sempre.

**Race detector + linters obrigatórios:**

- `go test -race ./...` em CI. Custa ~10x runtime mas pega races que aparecem em prod com 1% de probabilidade (= alguém vai pagar).
- `staticcheck`, `golangci-lint` com `contextcheck`, `errcheck`, `wastedassign`, `bodyclose`, `noctx`.

Cruza com **03-11 §2.17** (async Go vs Rust), **04-04 §2.2** (deadline propagation com ctx é fundação), **04-04 §2.3** (jittered backoff em retry de tool calls), **04-09 §2.7.1** (rate limit usa context pra cancellation).

### 2.19 Rust async runtimes deep (Tokio, async-std, smol) + Zig as systems alternative 2026

Rust async é diferente de Go: linguagem provê syntax (`async fn`, `.await`), runtime vem de crate externa. Tokio domina production 2026; async-std está em maintenance mode; smol cobre CLI/embedded. Zig 0.13+ aparece como C replacement, NÃO Rust replacement. Esta seção empacota patterns operacionais Rust + decision tree systems language pra Logística.

**Rust async fundamentals:**

- **`Future` trait**: lazy state machine. Doesn't run até ser polled — chamar `async fn` sem `.await` é no-op.
- **`async fn` desugars** para `impl Future<Output = T>`. Compiler gera state machine.
- **`.await`** suspende task atual; runtime polls de novo quando ready.
- **No runtime built-in**: pick crate (`tokio`, `async-std`, `smol`). Mixing runtimes em mesmo processo = panic.
- **`Send + Sync` constraints**: futures que cruzam threads precisam ser `Send`. Multi-thread runtime requer; single-thread (`current_thread`) relaxa.

**Tokio — production standard 2026 (1.40+):**

- **Multi-threaded work-stealing scheduler** (default `#[tokio::main]`): 1 worker thread por CPU; tasks migram entre threads.
- **Single-threaded** (`#[tokio::main(flavor = "current_thread")]`): CLI tools, embedded, evita Send bound.
- **Pillars**: `tokio::task::spawn` (lightweight task, ~sub-microsecond), `tokio::select!` (race futures), `tokio::sync` (Mutex async-aware, RwLock, mpsc, oneshot, broadcast, watch).

Pattern Logística — concurrent fetch + bounded join:

```rust
use tokio::time::{timeout, Duration};
use tokio::task::JoinSet;

async fn fetch_orders_parallel(ids: Vec<String>) -> anyhow::Result<Vec<Order>> {
    let mut set = JoinSet::new();
    for id in ids {
        set.spawn(async move {
            timeout(Duration::from_millis(500), fetch_order(&id)).await
        });
    }
    let mut orders = Vec::new();
    while let Some(res) = set.join_next().await {
        match res?? {
            Ok(order) => orders.push(order),
            Err(e) => tracing::warn!("fetch failed: {e}"),
        }
    }
    Ok(orders)
}
```

Numbers reais 2026: Tokio sustains 1M+ concurrent tasks por node; spawn sub-microsecond; memory ~5KB por task idle.

**`tokio::select!` — race + cancellation:**

```rust
use tokio::sync::oneshot;

async fn fetch_with_timeout(
    id: String,
    mut shutdown: oneshot::Receiver<()>,
) -> anyhow::Result<Order> {
    tokio::select! {
        result = fetch_order(&id) => result,
        _ = tokio::time::sleep(Duration::from_secs(5)) => Err(anyhow::anyhow!("timeout")),
        _ = &mut shutdown => Err(anyhow::anyhow!("shutdown signal")),
    }
}
```

Pegadinha: branches NÃO selecionados são CANCELED — futures dropped no meio do trabalho. Garanta cancellation safety (work idempotent ou rollback explícito). Side effects parciais (escrita DB, send rede) ficam órfãos.

**`Pin`, `Send`, `'static` — common gotchas:**

Tasks cruzando threads precisam `Send + 'static`. Holding non-Send (Rc, RefCell, raw pointers) across `.await` = compile error em multi-thread runtime.

```rust
// BAD: Rc held across await — won't compile em #[tokio::main]
let counter = Rc::new(Cell::new(0));
foo(&counter).await;  // error: Rc<Cell<i32>> não é Send

// GOOD: scope non-Send pra antes do await
{
    let counter = Rc::new(Cell::new(0));
    counter.set(1);
}
foo().await;

// OR: use Arc + Mutex pra cross-thread shared state
let counter = Arc::new(tokio::sync::Mutex::new(0));
let c2 = counter.clone();
tokio::spawn(async move { *c2.lock().await += 1; });
```

**async-std vs smol vs Tokio:**

- **Tokio**: largest ecosystem (Hyper, Axum, Reqwest, sqlx 0.8+, redis-rs); production proven; API surface complexa.
- **async-std**: API std-like; ecosystem menor; effectively maintenance mode 2024+. Avoid greenfield.
- **smol**: minimal (~1k LOC core); CLI/embedded; binary < 1MB.
- **Recommendation 2026**: Tokio pra servers, smol pra CLI/lightweight, async-std evitar.

**Axum (Tokio-based web framework, 0.7+):**

```rust
use axum::{routing::post, Router, Json, extract::State};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)] struct CreateOrder { items: Vec<String> }
#[derive(Serialize)] struct OrderResp { id: String }

async fn create_order(
    State(db): State<sqlx::PgPool>,
    Json(req): Json<CreateOrder>,
) -> Result<Json<OrderResp>, AppError> {
    let id = sqlx::query_scalar::<_, String>(
        "INSERT INTO orders (items) VALUES ($1) RETURNING id"
    )
    .bind(&req.items)
    .fetch_one(&db).await?;
    Ok(Json(OrderResp { id }))
}

#[tokio::main]
async fn main() {
    let pool = sqlx::PgPool::connect("postgres://...").await.unwrap();
    let app = Router::new()
        .route("/orders", post(create_order))
        .with_state(pool);
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

Numbers reais: Axum sustains 100k+ rps em modest hardware (4 vCPU); latency p99 < 5ms em endpoints simples com Postgres local.

**Performance characteristics 2026 (Tokio + Axum + sqlx):**

- **Latency**: p99 sub-millisecond achievable em endpoints simples; p99 < 5ms com Postgres local.
- **Throughput**: 1-5x mais rápido que Node.js Fastify; 2x mais rápido que Go Gin em single-server benchmarks idênticos.
- **Memory**: ~5-10MB baseline; cresce linear com conexões concorrentes (~5KB/task).
- **Cold start**: ~10ms binary load — comparable Go, ordens de magnitude melhor que JVM/Node.

**Zig 0.13+ as systems alternative 2026:**

Zig é C replacement, NÃO Rust replacement. Manual memory management, sem borrow checker, mais simples sintaticamente que Rust.

Use cases: embedded, kernel-adjacent, allocator-conscious work, build tooling (`zig cc` substitui clang com cross-compile default; `zig build` substitui Make/CMake).

Compelling features:

- **Comptime**: compile-time code execution mais poderoso que C++ constexpr / Rust const fn. Generics são funções comptime.
- **No hidden control flow**: zero exceptions, zero operator overloading, zero destructors → controle de fluxo legível.
- **C interop trivial**: `@cImport` inclui headers C direto; sem bindgen.
- **Cross-compilation excellent**: `zig build-exe -target x86_64-linux-musl` out-of-the-box.

```zig
const std = @import("std");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var list = std.ArrayList(u32).init(allocator);
    defer list.deinit();
    try list.append(42);
    std.debug.print("len={d}\n", .{list.items.len});
}
```

Use case Logística: Zig pra build systems, Wasm targets, FFI shims a libs C; Rust pra core services long-running.

**Decision tree systems language 2026:**

- **Rust**: long-running servers, safety-critical, fearless concurrency, large team.
- **Go**: pragmatic backend, fast iteration, K8s/cloud-native ecosystem, large team productivity.
- **Zig**: embedded, build tooling, C replacement, manual control desejado.
- **C/C++**: legacy ecosystem only; new projects raramente justificados.
- **TypeScript/JavaScript** (Bun/Deno/Node): quando systems perf NÃO crítico (most apps).

**Anti-patterns observados:**

- `tokio::spawn` em loop sem JoinSet — orphan tasks; impossível observar completion/erros.
- Holding `Rc`/`RefCell` across `.await` em multi-thread runtime — compile error; use `Arc` + `tokio::sync::Mutex`.
- `tokio::select!` branches sem cancellation safety — work parcial perdido on cancel.
- `block_on` dentro de async context — deadlock garantido; use `tokio::task::spawn_blocking` pra trabalho sync.
- async-std em greenfield 2026 — effectively unmaintained; pick Tokio ou smol.
- Mixing Tokio + async-std runtimes no mesmo processo — panic; one runtime per process.
- Manual `Pin<Box<dyn Future>>` em hot path — boxing overhead; use `async fn` + `impl Trait`.
- Zig pra long-running server — manual memory + sem borrow checker = mais bugs que Rust at scale.
- Zig 0.x pinning master branch — breaking changes weekly; pin release específica.
- Rust em production sem `tracing` crate — debugging async sem structured logs = nightmare.

Cruza com **02-08** (backend frameworks 2026, Axum vs Fastify), **03-12** (Wasm, Rust + Zig as primary sources), **02-07** (Node.js async runtime comparison), **03-11 §2.18** (Go concurrency parallel patterns), **03-09** (frontend perf, Wasm-bound code from Rust).

---

### 2.20 Systems languages 2026 — Rust 2024 edition, Go 1.23/1.24, Zig 0.14, Gleam BEAM, Mojo + matriz de decisão

Landscape de systems languages 2024–2026 consolidou: **Rust** virou mainstream para safety-critical + perf-sensitive (30% dos devs em Rust survey 2024, AWS/Cloudflare/Discord em prod), **Go** mantém domínio do ecossistema Kubernetes + ferramentas internas (1.23 trouxe `range` over function iterators em Aug 2024, 1.24 em Q1 2025 melhora inferência genérica), **Zig 0.14** (Q4 2024) ganha tração em DB engines (TigerBeetle) e runtimes (Bun usa Zig + JSC) com incremental compilation, **Gleam 1.6+** (Q4 2024) ocupa nicho fault-tolerant typed sobre BEAM, **Mojo 24.x** (Q4 2024, open-source stdlib) emerge para AI workloads como Python superset, **Bun 1.2** (Q1 2026, 95%+ Node compat) e **Deno 2.0** (Oct 2024, full npm compat) competem como JS runtimes alternativos. Decisão por linguagem em 2026 não é gosto — é matriz de constraints (perf, safety, ecosystem, time-to-market, team skill).

**Rust 2024 edition (rust 1.85, Q4 2024)** simplificou pontos antigos. `let-else` estabilizou (early-exit pattern matching). Result/Option em `main()` direto. Lifetime captures em `impl Trait` virou explícita (`use<>`). Async closures estabilizaram em 1.85+ (essencial para handlers axum/tower). Tokio 1.40 (Q4 2024) trouxe melhorias em `JoinSet` (cancelamento granular, `spawn_blocking` integrado). **axum 0.8** (Q4 2024) refinou typed routing — extractors compõem com type-safety stricter, middleware via Tower. Ecosystem maduro: `sqlx` (compile-time checked SQL), `sea-orm` (async ORM), `diesel 2` (sync, type-safe). Para core service de courier matching (algoritmo perf-critical), Rust + axum 0.8 é escolha defensável:

```rust
// Rust 2024 edition — async closure + axum 0.8 typed routing
use axum::{Router, routing::post, Json, extract::State};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::task::JoinSet;

#[derive(Deserialize)]
struct MatchRequest { order_id: String, lat: f64, lng: f64 }

#[derive(Serialize)]
struct MatchResponse { courier_id: String, eta_seconds: u32 }

#[derive(Clone)]
struct AppState { db: Arc<sqlx::PgPool> }

async fn match_courier(
    State(state): State<AppState>,
    Json(req): Json<MatchRequest>,
) -> Result<Json<MatchResponse>, (axum::http::StatusCode, String)> {
    let mut set = JoinSet::new();
    // async closure (Rust 2024) — captures state per task
    for shard in 0..4 {
        let db = state.db.clone();
        set.spawn(async move {
            sqlx::query_as::<_, (String, f64)>(
                "SELECT courier_id, distance FROM couriers_shard_$1 WHERE active ORDER BY distance LIMIT 1"
            )
            .bind(shard)
            .fetch_optional(&*db)
            .await
        });
    }
    let mut best: Option<(String, f64)> = None;
    while let Some(r) = set.join_next().await {
        if let Ok(Ok(Some((id, d)))) = r {
            if best.as_ref().map_or(true, |b| d < b.1) { best = Some((id, d)); }
        }
    }
    let (courier_id, distance) = best.ok_or((axum::http::StatusCode::NOT_FOUND, "no courier".into()))?;
    Ok(Json(MatchResponse { courier_id, eta_seconds: (distance * 60.0) as u32 }))
}

pub fn router(state: AppState) -> Router {
    Router::new().route("/match", post(match_courier)).with_state(state)
}
```

**Go 1.23 (Aug 2024)** mudou o jogo de iteração com `range` over function iterators — primeira extensão sintática significativa em anos. `slog` (structured logging) GA na stdlib elimina dependência de `zerolog`/`zap` para 90% dos casos. Profile-guided optimization (PGO) estável dá 5–15% de perf grátis em hot services (collect profile em prod, recompila com `-pgo`). Go 1.24 (Q1 2025) refinou inferência de tipos genéricos — menos `[T any]` redundante:

```go
// Go 1.23/1.24 — range over func + slog structured logging + PGO-friendly
package matcher

import (
	"context"
	"iter"
	"log/slog"
	"time"
)

type Courier struct{ ID string; Distance float64 }

// range over func iterator — Go 1.23
func ActiveCouriers(ctx context.Context, shards []Shard) iter.Seq[Courier] {
	return func(yield func(Courier) bool) {
		for _, s := range shards {
			for c := range s.Iter(ctx) {
				if !yield(c) { return } // caller pode interromper
			}
		}
	}
}

func Match(ctx context.Context, shards []Shard, lat, lng float64) (Courier, error) {
	start := time.Now()
	defer func() {
		slog.InfoContext(ctx, "match.done",
			slog.Duration("dur", time.Since(start)),
			slog.Float64("lat", lat))
	}()
	var best Courier
	best.Distance = 1e9
	for c := range ActiveCouriers(ctx, shards) { // Go 1.23 range-over-func
		if c.Distance < best.Distance { best = c }
	}
	return best, nil
}
```

Build com PGO: `go build -pgo=cpu.pprof ./...` — coleta profile via `pprof` em prod, recompila, ganha 5–15% sem mudar código.

**Zig 0.14 (Q4 2024)** trouxe incremental compilation (builds 5–10x mais rápidos em projetos médios). Design ainda intacto: `comptime` (metaprogramação no tempo de compilação), `errdefer` (cleanup em erro), allocator-as-parameter (nada alloca implicitamente). TigerBeetle (DB financeiro), Bun runtime (JSC bindings + HTTP server) e ZSV (CSV parser) usam Zig em produção. Não substitui Rust para greenfield safety-critical, mas brilha em DB/kernel/embedded onde controle de allocator é essencial:

```zig
// Zig 0.14 — comptime + errdefer + allocator parameter
const std = @import("std");

pub fn parseRoute(allocator: std.mem.Allocator, raw: []const u8) ![]Point {
    var list = std.ArrayList(Point).init(allocator);
    errdefer list.deinit(); // cleanup automatico em erro
    var iter = std.mem.tokenizeScalar(u8, raw, ';');
    while (iter.next()) |tok| {
        const p = try Point.parse(tok);
        try list.append(p);
    }
    return list.toOwnedSlice();
}

// comptime — gera tabela de hash em compile time
const Method = enum(u8) { GET, POST, PUT, DELETE };
fn methodFromStr(comptime s: []const u8) Method {
    return comptime if (std.mem.eql(u8, s, "GET")) .GET
        else if (std.mem.eql(u8, s, "POST")) .POST
        else @compileError("unknown method: " ++ s);
}
```

**Gleam 1.6+ (Q4 2024, BEAM target stable)** é o nicho amado: tipos Hindley-Milner sobre BEAM (Erlang VM), interop nativa com Erlang/Elixir, fault-tolerance OTP grátis. Não compete com Rust/Go — compete com Elixir quando time quer types stricter sem largar BEAM. Comunidade pequena mas devotada (Lustre para frontend SSR, Wisp para HTTP):

```gleam
// Gleam — type-safe BEAM module + Erlang interop
import gleam/erlang/process
import gleam/otp/actor
import gleam/result

pub type CourierMsg { Match(lat: Float, lng: Float, reply: process.Subject(Result(String, Nil))) }

pub fn start_courier_actor() -> Result(process.Subject(CourierMsg), actor.StartError) {
  actor.start(initial_state(), handle_message)
}

fn handle_message(msg: CourierMsg, state: State) -> actor.Next(CourierMsg, State) {
  case msg {
    Match(lat, lng, reply) -> {
      let courier = find_nearest(state, lat, lng) |> result.map(fn(c) { c.id })
      process.send(reply, courier)
      actor.continue(state)
    }
  }
}
```

**Mojo 24.x (Q4 2024, Modular Inc, stdlib open-source)** é Python superset com SIMD/MLIR — Python que compila para nativo via MAX engine. Caso de uso: AI workloads (matrix multiplication, tensor ops) onde NumPy/PyTorch não bastam mas C++/CUDA é overkill. Não é systems language genérico — é AI-specific. Lock-in à Modular ainda é risco real:

```python
# Mojo 24.x conceptual snippet (Python superset com SIMD via MLIR)
# Sintaxe completa usa parametric brackets fn name<type: DType>(args)
# stdlib: tensor + algorithm.vectorize + sys.info.simdwidthof
#
# Pattern típico matmul vetorizado:
# 1. alias nelts = simdwidthof do DType * 2  -> largura SIMD em compile-time
# 2. loop tiled m/n -> outer iteration sobre output dims
# 3. inner closure dot percorre k com vectorize<dot, nelts> em A.dim(1)
# 4. cada load gera N float32 lanes via AVX/NEON automaticamente
# 5. reduce_add agrega fora do hot loop interno
#
# MAX engine compila MLIR -> nativo CPU/GPU; sem GIL runtime.
# Lock-in: stdlib evolui rápido, breaking changes pre-1.0.
```

**Bun 1.2 (Q1 2026)** = runtime JS escrito em Zig + JavaScriptCore, fastest cold start e HTTP throughput entre JS runtimes (~3x Node em benchmarks típicos). Compat Node 95%+, mas ainda há surpresas em native modules (sharp, bcrypt). **Deno 2.0 (Oct 2024)** trouxe full npm compat e workspaces — security-first (permissões explícitas) com pragmatismo. Bun para hot path edge functions; Deno para projetos onde supply-chain security pesa.

**Stack Logística aplicada (decisão concreta)**: core de matching/pricing/route-optimization (perf-critical, safety-critical) → **Rust + axum 0.8 + sqlx + Tokio 1.40**; Kubernetes controllers + admin tools + sidecars (ecosystem-driven) → **Go 1.24 + slog + PGO**; edge functions (auth, rate limit, A/B routing) → **Bun 1.2 + Hono**; ML models para route optimization (tensor-heavy) → **Mojo + MAX engine** (experimental, fallback PyTorch); fault-tolerant orchestration de webhooks (precisa supervisão OTP) → considera **Gleam** se time topa BEAM, senão **Elixir + Phoenix**; nada em Zig em prod ainda — avalia para próxima geração de DB-of-record interno.

**Decision matrix 2026**:
- **Rust** → safety-critical, perf-sensitive, long-lived services (anos de manutenção). Custo: curva + compile times.
- **Go** → K8s ecosystem, CLIs, simple concurrency, time-to-market médio. Custo: generics ainda menos ergonômicos que Rust/TS.
- **Zig** → DBs, kernel, embedded, runtimes. Custo: 0.x (breaking changes), comunidade pequena.
- **Gleam** → fault-tolerant typed apps na BEAM, interop com Erlang/Elixir legado. Custo: hiring quase impossível.
- **Mojo** → AI workloads Python-adjacent. Custo: lock-in Modular, immature.
- **Bun** → JS runtime fastest, edge functions, dev tools. Custo: native module surprises.
- **Deno 2** → JS security-first, scripts, full npm compat. Custo: ecosystem menor que Node.

**10 anti-patterns**:
1. **Rust 2021 em greenfield 2026** — use 2024 edition (let-else, async closures, Result em main).
2. **Go sem PGO em hot service** — deixa 5–15% de perf na mesa de graça.
3. **Zig pinned em master/0.x não-release** — breaking changes weekly; pin em release tagged (0.13/0.14).
4. **Gleam para CRUD stateless** — overkill, BEAM brilha em supervision; use TS/Go para CRUD.
5. **Mojo para non-AI workload** — immature, lock-in Modular, sem ROI fora de tensor ops.
6. **Bun em prod sem testar native modules** — sharp/bcrypt/canvas têm compat surprises.
7. **Deno 2 assumindo 100% Node compat** — 95% real, edge cases em `process`, `Buffer`, native addons.
8. **axum 0.7 em greenfield 2026** — use 0.8 (typed routing maduro, breaking changes pagos).
9. **Tokio `current_thread` runtime em multi-core prod** — single-threaded por engano; use `multi_thread` (default `#[tokio::main]`).
10. **Escolher linguagem por hype** — matriz de decisão por constraints (team, ecosystem, perf, safety), não por survey ranking.

Cruza com **03-11 §2.5–§2.17** (intros individuais Rust/Go/Zig), **§2.18** (Go concurrency patterns deep), **§2.19** (Rust async runtimes + Zig systems alt), **02-07 §2.17/§2.20** (Node 24 + Bun + Deno comparison), **02-08** (axum/fiber/echo backend frameworks), **03-12** (WebAssembly — Rust/Zig main sources), **03-10 §2.21** (Linux perf — Rust + io_uring), **04-10 §2.23** (MCP servers em TS/Python/Go).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Distinguir goroutines de OS threads e o que M:N scheduler faz.
- Justificar `context.Context` em Go server.
- Padrão pipeline com channels em Go.
- Explicar ownership rules em Rust com 3 exemplos.
- Diferenciar `&T`, `&mut T`, `Box<T>`, `Arc<T>`.
- Por que Rust não tem null e como Option/Result resolvem.
- Diferenciar Tokio e std::thread em quando usar.
- Justificar Axum vs Actix vs Rocket.
- Cenários onde Go vence Node, e onde Rust vence Go.
- Estratégia pra integrar componente Rust com Logística TS.

---

## 4. Desafio de Engenharia

Construir **2 microserviços de apoio** ao Logística, um em Go, um em Rust.

### Especificação

**Serviço 1, Go: Webhook Ingestor**

1. **Stack**: Go 1.22+, `chi` ou `gin`, `pgx` direto pra Postgres.
2. **Endpoints**:
   - `POST /ingest/:source` recebe JSON arbitrário.
   - Valida HMAC do header `X-Signature` (mock secret per source).
   - Persiste em tabela `external_events` (mesma do 02-12 ou Postgres jsonb).
   - Responde 202 imediato; processamento async.
3. **Concorrência**:
   - Worker pool (goroutines + channel) processando eventos.
   - Limit configurável.
   - Graceful shutdown (`context.Context` propagado).
4. **Observability**:
   - Structured logs (zerolog ou slog).
   - Prometheus metrics endpoint.
   - OpenTelemetry tracing.
5. **Tests**: table-driven tests pra validation, integration test contra Postgres via testcontainers.
6. **Deploy**: Dockerfile multi-stage, imagem ≤ 20 MB.

**Serviço 2, Rust: Routing Engine**

1. **Stack**: Rust stable, Axum, sqlx (Postgres), tokio.
2. **Endpoint**:
   - `POST /route` recebe `{ origin: {lat,lng}, stops: [{lat,lng,priority}], couriers: [{id, lat, lng, capacity}] }`.
   - Calcula assignment de stops pra couriers (greedy ou simple TSP-ish), retorna routes.
   - Latência p99 < 200ms pra 50 stops.
3. **Algoritmo**:
   - Implementar nearest-neighbor + 2-opt swap improvement.
   - Sem deps de routing externo (você implementa).
   - Use crates: `geo` pra haversine, `itertools` se ajudar.
4. **Concorrência**:
   - Cálculo CPU-bound, paralelize com `rayon` (data parallelism).
   - Endpoint async (Tokio); compute em thread pool blocking (`tokio::task::spawn_blocking`).
5. **Validation**: serde com Zod-equivalent (campos required, ranges).
6. **Observability**: tracing com tracing-subscriber, OTel exporter.
7. **Tests**: unit em algoritmo (property-based via proptest pra "rota nunca repete stop"), integration via reqwest.
8. **Deploy**: Dockerfile multi-stage com cargo-chef cache; imagem ≤ 30 MB (musl).

**Integração com Logística**

- Backend principal (Node) chama Go ingestor pra webhooks.
- Backend principal chama Rust routing pra otimização de rotas em "atribuição em massa".
- Tudo via HTTP local (compose) ou via Service em K8s.

### Restrições

- Em Go, sem usar `panic` pra controle de fluxo.
- Em Rust, sem `unsafe` (a menos que justificado).
- Sem dependência de framework "facilitador" que esconda o que está rolando.

### Threshold

- README documenta:
  - Por que cada serviço foi feito na linguagem escolhida.
  - Diagrama do polyglot stack.
  - Bench de routing engine: 50 stops, 100 stops, 200 stops, latência p99.
  - Memory footprint de cada serviço sob load (Go vs Rust vs Node compare).
  - 1 caso onde borrow checker te ensinou algo (refactor não-óbvio em TS).
  - 1 caso onde channels Go simplificaram código que em Node seria mais verbose.

### Stretch

- Routing engine via gRPC (tonic) em vez de HTTP.
- Routing engine compilado pra WASM (03-12 preview), rodando no front client-side.
- Go ingestor com NATS JetStream em vez de DB direto.
- Rust com sqlx compile-time query checks (macro `query!`).

---

## 5. Extensões e Conexões

- Liga com **01-06** (paradigmas): tipos, sum types, ownership.
- Liga com **01-07** (JS deep): contraste com Node event loop.
- Liga com **02-07/02-08** (Node, frameworks): conceitos análogos.
- Liga com **03-02** (Docker): static binary, scratch image.
- Liga com **03-05** (AWS): Lambda Go/Rust runtime, Fargate.
- Liga com **03-10** (perf backend): Rust como primitive de perf onde Node não chega.
- Liga com **03-12** (Wasm): Rust → Wasm.
- Liga com **04-02** (messaging): Go consumers/producers de Kafka/NATS.

---

## 6. Referências

**Go**:
- **"The Go Programming Language"**: Donovan, Kernighan.
- **"Concurrency in Go"**: Katherine Cox-Buday.
- **"100 Go Mistakes and How to Avoid Them"**: Teiva Harsanyi.
- **Go Tour** + **Effective Go** ([go.dev](https://go.dev/)).

**Rust**:
- **"The Rust Programming Language"** ("The Book", livre) ([doc.rust-lang.org/book](https://doc.rust-lang.org/book/)).
- **"Programming Rust"**: Blandy, Orendorff, Tindall.
- **"Rust for Rustaceans"**: Jon Gjengset.
- **"Zero to Production in Rust"**: Luca Palmieri.
- **Tokio docs** ([tokio.rs](https://tokio.rs/)).
- **Jon Gjengset YouTube**: explicações profundas.
- **This Week in Rust** ([this-week-in-rust.org](https://this-week-in-rust.org/)).
