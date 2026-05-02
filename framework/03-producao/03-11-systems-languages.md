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
