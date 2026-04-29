# STACK-COMPARISONS, Patterns Cross-Stack (Node, Java, Python, Ruby, Go, .NET, PHP)

> Framework é heavy em Node/TypeScript/React/Postgres/Redis. Realidade tem Java/Spring, Python/Django/FastAPI, Ruby/Rails, Go, .NET, PHP/Laravel. Patterns canônicos atravessam, só idioms divergem.
>
> Este doc lista os mesmos patterns dos módulos do framework, traduzidos pra cada stack. Use quando: 1) você trabalha em stack diferente do default; 2) você se prepara pra entrevista em empresa Java/Python; 3) quer ver que conceitos são universais e o que é idiom-specific.
>
> Não é tutorial de cada stack. É **mapeamento** de pattern → onde mora em cada ecossistema.

---

## Princípio orientador

90% dos conceitos do framework são **universais**: HTTP, REST, OAuth2, MVCC, B-Tree, event loop concept, container, K8s, distributed consensus. 10% são idiom: como você implementa em determinada linguagem.

Stack não muda **o que entender**. Muda **a sintaxe + biblioteca canônica**.

Se você sabe Postgres MVCC, sabe Postgres MVCC sob qualquer linguagem. Se você sabe pattern Outbox, implementa em Kotlin do mesmo jeito que em TypeScript, diferentes libs, mesma essência.

---

## 1. Backend frameworks (mapeamento 02-07-02-08)

| Pattern | Node | Java | Python | Ruby | Go | .NET | PHP |
|---|---|---|---|---|---|---|---|
| Web framework dominante | Express, Fastify, Hono, NestJS | Spring Boot, Quarkus, Micronaut | Django, FastAPI, Flask | Rails, Sinatra | net/http, gin, echo, fiber | ASP.NET Core | Laravel, Symfony |
| ORM / Query builder | Prisma, Drizzle, TypeORM | Hibernate, JOOQ, jOOQ | SQLAlchemy, Django ORM | ActiveRecord, Sequel | GORM, sqlx, sqlc | Entity Framework Core, Dapper | Eloquent, Doctrine |
| Migrations | Prisma Migrate, Drizzle Kit | Flyway, Liquibase | Alembic, Django migrations | ActiveRecord migrations | golang-migrate, atlas | EF migrations, FluentMigrator | Laravel migrations |
| Validation | Zod, Yup, Valibot | Bean Validation (JSR 380), Hibernate Validator | Pydantic | dry-validation, ActiveModel | go-playground/validator | DataAnnotations, FluentValidation | Laravel rules |
| Async runtime | Event loop nativo | Reactive (Reactor, RxJava), Loom (virtual threads) | asyncio, anyio | Async (3.x), Falcon Async | goroutines | async/await + Task | ReactPHP, Swoole |
| Serialization | JSON.stringify, JSON Schema | Jackson, Gson | json, msgspec, orjson | JSON, MessagePack | encoding/json, protobuf | System.Text.Json, Newtonsoft | json_encode, Symfony Serializer |
| Logging estruturado | Pino, Winston | Logback, SLF4J + structured | structlog, loguru | semantic_logger, dry-logger | zap, zerolog, slog | Serilog, NLog | Monolog |
| DI container | NestJS, tsyringe | Spring, Quarkus DI, Guice | dependency-injector, FastAPI Depends | dry-system | wire, fx | built-in MS.Extensions.DI | Symfony DI, Laravel container |
| Test framework | Vitest, Jest, Mocha | JUnit 5, Spock | pytest, unittest | RSpec, Minitest | testing, ginkgo, testify | xUnit, NUnit, MSTest | PHPUnit, Pest |

**Conexão 02-07/02-08**: cada stack tem seu equivalent direto. Pleno bom em Node + Express equivalent é Pleno bom em Java + Spring Boot, mesmas decisões de design (middleware/filters/interceptors), apenas vocabulário muda.

---

## 2. Concurrency model (mapeamento 01-11, 02-07)

| Stack | Modelo dominante | Primitives | Async I/O | Compartilhado |
|---|---|---|---|---|
| Node | Event loop single-threaded + Worker Threads | Promises, async/await, Atomics, SharedArrayBuffer | libuv | Worker Threads, Cluster |
| Java | Thread pools + Loom virtual threads (21+) | synchronized, ReentrantLock, ExecutorService, CompletableFuture | NIO (channels) + Loom | Memory model JSR-133 |
| Python | GIL + threading + asyncio + multiprocessing | threading.Lock, asyncio.Lock, multiprocessing.Queue | asyncio + uvloop | GIL serializes CPU; multiprocess pra parallel |
| Ruby | GIL + Threads + Fibers + Ractors (3+) | Mutex, Queue, Ractor | EventMachine, Async gem | Ractors pra parallel |
| Go | Goroutines + channels (CSP) | sync.Mutex, sync.WaitGroup, channels, atomic | netpoller integrated | Goroutines escalam M:N |
| .NET | Thread pool + async/await + Task | lock, SemaphoreSlim, Task, Channel<T>, Interlocked | TPL + IO Completion Ports | Memory model CLR |
| PHP | Process-per-request (FPM) + Swoole/ReactPHP coroutines | Mutex em Swoole, queues | ReactPHP, Swoole | Shared via APCu, Redis |
| Rust | Async runtime (Tokio) + threads | Mutex, RwLock, Arc, channel, Atomic | Tokio, async-std | Send/Sync compile-time |
| Elixir | Actor model (BEAM) | Processes, messages, GenServer | Built-in | Isolated heap per process |

**Padrões cruzados**:

- **Event loop** (Node, Python asyncio, Tokio, Vert.x): single-thread cooperativo.
- **Thread pool + async** (Java pre-Loom, .NET): callback-based, scaled.
- **Virtual threads / fibers / goroutines** (Java Loom, Go, Erlang/Elixir, Kotlin coroutines): M:N scheduling.
- **GIL languages** (Python, Ruby, JS): tradeoff simplicity ↔ parallelism.

**Implicação concrete**: race condition formal de 01-11 § 2.1 vale em todas. Memory model x86 vs ARM vale em todas. Lock-free CAS é universal. Mutex syntax muda.

---

## 3. Auth (mapeamento 02-13)

| Pattern | Node (Passport, lucia-auth, custom) | Java (Spring Security) | Python (Authlib, fastapi-users) | Ruby (Devise) | Go (goth, oauth2) | .NET (ASP.NET Identity, IdentityServer) | PHP (Laravel Sanctum/Passport, Symfony Security) |
|---|---|---|---|---|---|---|---|
| Sessions | express-session, lucia | Spring Security session | django.contrib.sessions, fastapi-sessions | session_store em ActiveRecord | gorilla/sessions | ASP.NET session | Laravel session |
| JWT | jsonwebtoken, jose | java-jwt, Spring Security JWT | PyJWT, python-jose | jwt | golang-jwt, lestrrat-go/jwx | System.IdentityModel.Tokens.Jwt | firebase/php-jwt |
| OAuth2 | Passport-oauth2, Auth.js, lucia-oauth | Spring Security OAuth2 | Authlib, oauthlib | omniauth | golang.org/x/oauth2 | Microsoft.AspNetCore.Authentication.OAuth | League OAuth2 |
| Password hashing | argon2, bcrypt | BCryptPasswordEncoder, argon2-jvm | passlib (argon2/bcrypt) | bcrypt, argon2 | golang.org/x/crypto/argon2 | Microsoft.AspNetCore.Identity (PBKDF2 default) | password_hash builtin (bcrypt/argon2) |
| 2FA / TOTP | speakeasy, otpauth | passay, googleauth | pyotp | rotp | xlzd/gotp | Otp.NET | Spomky-Labs/otphp |
| Passkeys / WebAuthn | @simplewebauthn/server | webauthn4j | webauthn (py_webauthn) | webauthn-ruby | go-webauthn | Microsoft.AspNetCore.Authentication, Fido2NetLib | Web-Auth/webauthn-lib |

Conceitos 01-12/02-13 (cripto + flows OAuth2) são spec-driven (RFC 6749, 7519, 8252, 8628, 9068). Implementação muda; spec não.

---

## 4. ORM / Database access (mapeamento 02-09, 02-10)

| Stack | "Fat" ORM (active record) | "Thin" query builder | Raw SQL | Async-friendly? |
|---|---|---|---|---|
| Node | Prisma, MikroORM, TypeORM | Drizzle, Kysely | postgres.js, pg | Sim (todos) |
| Java | Hibernate, Spring Data JPA | jOOQ, MyBatis | JDBC | Sim com r2dbc / vthreads |
| Python | Django ORM, SQLAlchemy ORM | SQLAlchemy Core | psycopg, asyncpg | Sim com asyncpg + SQLAlchemy 2 |
| Ruby | ActiveRecord | Sequel | Sequel ds, raw | Limited (Falcon, async-pg) |
| Go | GORM, ent | sqlx, sqlc, squirrel | database/sql | Native |
| .NET | EF Core | Dapper | ADO.NET | Sim (async/await everywhere) |
| PHP | Eloquent, Doctrine ORM | Doctrine DBAL, Laravel Query Builder | PDO | Limited (ReactPHP) |
| Rust | SeaORM, Diesel | sqlx | tokio-postgres | Native |

**Comum a todos**: N+1 problem, lazy vs eager loading, connection pool, prepared statements, migrations, query plan inspection.

**Especifico**: Hibernate's session/transaction semantics são únicos; Prisma's generated types são únicos; ActiveRecord's "magic" é único. Mas o **pattern de ORM** atravessa.

---

## 5. Testing (mapeamento 03-01)

| Test type | Node | Java | Python | Ruby | Go | .NET | PHP |
|---|---|---|---|---|---|---|---|
| Unit | Vitest, Jest | JUnit 5, AssertJ | pytest | RSpec | testing, testify | xUnit | PHPUnit, Pest |
| Property-based | fast-check | jqwik | Hypothesis | rantly | gopter | FsCheck | Eris |
| Integration | Testcontainers-node | Testcontainers (canonical) | testcontainers-python, pytest-postgresql | testcontainers-ruby | testcontainers-go | Testcontainers .NET | testcontainers PHP, dama-testdbbundle |
| E2E | Playwright, Cypress | Selenium, Playwright Java, Karate | pytest + Playwright | Capybara, Cucumber | rod, chromedp | Playwright .NET, Selenium | Codeception, Dusk |
| Mocking | sinon, jest-mock, vi.mock | Mockito, EasyMock | unittest.mock, pytest-mock | RSpec mocks, Mocha | gomock, testify mock | Moq, NSubstitute | Mockery, Prophecy |
| Mutation | Stryker | PIT Mutation Testing | mutmut, cosmic-ray | mutant | go-mutesting | Stryker.NET | Infection |
| Load | k6, autocannon | JMeter, Gatling | Locust | k6, Vegeta | k6, vegeta | NBomber | k6 |

**Comum**: TDD red-green-refactor, AAA pattern, test pyramid, given-when-then. Universais.

---

## 6. Observability (mapeamento 03-07)

| Stack | Logs estruturados | Métricas | Tracing | Tools comuns |
|---|---|---|---|---|
| Node | Pino, Winston | prom-client | OpenTelemetry SDK Node | OTel + Prometheus + Grafana + Loki |
| Java | Logback / Log4j2 + Logstash encoder | Micrometer | OTel Java agent (auto-instrumented) | Idem; Java tem instrumentação automática strong |
| Python | structlog, loguru | prometheus_client | OTel Python SDK | Idem |
| Ruby | semantic_logger, rails_semantic_logger | prometheus-client-ruby | OTel Ruby | Idem |
| Go | zap, zerolog, slog | prometheus client_golang | OTel Go | Idem; performance-first |
| .NET | Serilog | prometheus-net | OTel .NET SDK | Idem; native ILogger semantics |
| PHP | Monolog | prometheus_client_php | OTel PHP | Idem; auto-instrument FPM |

**OpenTelemetry** é o common ground. SDK por linguagem; protocolo OTLP universal; backend (Tempo, Jaeger, Honeycomb, Datadog) consome igual.

---

## 7. Deploy / containers (mapeamento 03-02-03-06)

Idioms de Dockerfile e K8s manifests são universais. Diferenças:

- **Node**: Dockerfile multi-stage com `node:20-alpine`. Pequeno por default.
- **Java**: imagem-based em Eclipse Temurin / Liberica / GraalVM Native Image. GraalVM produz binário nativo (~50MB sem JVM). Quarkus + GraalVM padrão moderno.
- **Python**: `python:3.12-slim` + multi-stage com venv. Wheels pré-compiladas.
- **Ruby**: `ruby:3.3-slim`. Bundler precompile.
- **Go**: scratch ou distroless (binário estático). Imagens MENORES (~10-20MB).
- **.NET**: `mcr.microsoft.com/dotnet/aspnet:8`. AOT compilation chegou.
- **PHP**: `php:8-fpm` + Nginx sidecar comum.
- **Rust**: scratch ou distroless (binário estático).

**K8s patterns**: idênticos cross-stack. Manifests são YAML; deployment, service, hpa, secret universais.

---

## 8. Performance idioms (mapeamento 03-10)

| Stack | Profiler dominante | Flamegraph | Quick wins |
|---|---|---|---|
| Node | clinic.js, 0x, --inspect | clinic flame, 0x | Streams, avoid sync I/O, limit reqs in-flight |
| Java | async-profiler, JFR (Java Flight Recorder), VisualVM | async-profiler | JIT warm-up, GC tuning, heap dumps |
| Python | cProfile, py-spy, scalene | py-spy --flame | C extensions (NumPy, lru_cache, vectorize), uvloop |
| Ruby | stackprof, ruby-prof, vernier | speedscope + stackprof | Avoid N+1, fragment cache, jit (YJIT 3.3+) |
| Go | pprof | pprof flame | Avoid alloc em hot path, buffer pools, sync.Pool |
| .NET | dotnet-trace, PerfView, BenchmarkDotNet | speedscope | Span<T>, ArrayPool, ValueTask, source generators |
| PHP | Blackfire, Xdebug profiler, SPX | speedscope | Opcache, JIT (8+), Redis cache |

**Comum**: P95/P99 over média. Cache layers. Profile antes de otimizar.

---

## 9. Real-time / WebSocket (mapeamento 02-14)

| Stack | WS lib | Pub-sub local | Frameworks de salas |
|---|---|---|---|
| Node | ws, Socket.IO, uWebSockets.js | Redis pub-sub via ioredis | Socket.IO rooms, lucia-realtime |
| Java | Spring WebSocket, Java-WebSocket | Redis | Spring sub-protocol |
| Python | websockets, FastAPI WebSocket | Redis Pub-Sub | starlette pra channels |
| Ruby | ActionCable (Rails), faye-websocket | Redis | ActionCable channels |
| Go | gorilla/websocket, nhooyr/websocket | Redis | Hub pattern |
| .NET | SignalR | Redis backplane | Hubs |
| PHP | Ratchet, Swoole WebSocket | Redis | Custom |

**Conceito uniforme**: handshake HTTP upgrade, frame protocol RFC 6455, ping/pong, close codes. Implementation difere; spec é spec.

---

## 10. Frontend frameworks (mapeamento 02-04-02-05)

| Pattern | React | Vue | Svelte | SolidJS | Angular | Qwik |
|---|---|---|---|---|---|---|
| Reactivity | useState + reconciler | reactive proxies | compiler-time signals | signals | RxJS + zone.js | resumable + signals |
| Component model | function + hooks | SFC | SFC compiled | function + signals | class + decorators | resumable component |
| SSR / RSC | Next.js, Remix | Nuxt | SvelteKit | SolidStart | Angular Universal | Qwik City |
| State management | Zustand, Redux, Jotai | Pinia, Vuex | stores | createSignal + context | NgRx, NGXS, Akita | useStore |
| Styling | CSS Modules, Tailwind, styled-components | scoped CSS, Tailwind | scoped CSS | CSS Modules | encapsulated CSS | Tailwind first-class |

**Conceitos universais**: virtual DOM (ou compiled), reactivity, component lifecycle, props/state distinction, server rendering, hydration.

---

## 11. Mobile (mapeamento 02-06, 02-17)

| Cross-platform | Native iOS | Native Android |
|---|---|---|
| React Native | Swift + UIKit/SwiftUI | Kotlin + Compose / Views |
| Flutter (Dart) | Objective-C legacy | Java legacy |
| .NET MAUI | - |, |
| Kotlin Multiplatform Mobile | - |, |
| Capacitor / Ionic | - |, |

**Conceitos universais**: lifecycle, threading, memory, permissions, push notifications, deep links, store policies.

---

## 12. AI/LLM clients (mapeamento 04-10)

| Stack | OpenAI / Anthropic SDK | Vector DBs |
|---|---|---|
| Python | openai, anthropic, langchain | pgvector, Pinecone, Weaviate, Qdrant, Milvus |
| TypeScript | openai, @anthropic-ai/sdk, ai-sdk (Vercel), LangChain.js | mesma cliente; pgvector via SDK Postgres |
| Java | langchain4j, openai-java, anthropic-sdk-java | mesma cliente |
| Go | go-openai, anthropic-sdk-go | mesma |
| Rust | async-openai, anthropic-rs | qdrant client |
| Ruby | ruby-openai, anthropic gem | pgvector Ruby |
| .NET | OpenAI .NET, Microsoft.Extensions.AI | mesma |

Stack Python tem ecosystem mais profundo (research origin); TS chegando. Outras ainda dependem da maturidade da comunidade.

**Conceitos**: prompt engineering, RAG pipeline, function calling, embeddings, structured output. Universais.

---

## 13. Padrões de carreira por stack

Empresas tier-1 frequentemente alinham:

- **Java/Spring + Kotlin**: Google (sub-set), Netflix (legacy), Pinterest, LinkedIn, Stripe (parcial).
- **Python**: Anthropic, OpenAI, Instagram, Dropbox, Spotify (data), Stripe (data), Pinterest (legacy).
- **Go**: Cloudflare, Uber, Twitch, Docker, Kubernetes ecosystem, Anthropic infra, Datadog.
- **TypeScript / Node**: Stripe (frontend + parts of backend), Vercel, Linear, Notion, Figma (parts), GitHub (newer).
- **Rust**: Cloudflare, Discord (parts), AWS (parts), Anthropic (some), 1Password.
- **C++**: Google (search/V8), Meta (FB), Adobe, gaming.
- **C#/.NET**: Microsoft, banking, enterprise.
- **Ruby/Rails**: Shopify, GitHub (legacy), Airbnb (legacy), Basecamp.
- **PHP**: Facebook (Hack), Wikipedia, Slack (legacy), banking BR.
- **Elixir**: Discord (chat), WhatsApp (Erlang), Heroku, fintech.

Senior+ com 1-2 stacks profundas + literacy em outras é position resilient.

---

## 14. Rosetta Stone, same code em todos

Pequeno exemplo: HTTP server retornando JSON com 1 endpoint:

**Node (Hono)**:
```ts
import { Hono } from 'hono';
const app = new Hono();
app.get('/orders/:id', (c) => c.json({ id: c.req.param('id') }));
export default app;
```

**Java (Spring Boot)**:
```java
@RestController
public class OrderController {
  @GetMapping("/orders/{id}")
  public Map<String, String> get(@PathVariable String id) {
    return Map.of("id", id);
  }
}
```

**Python (FastAPI)**:
```python
from fastapi import FastAPI
app = FastAPI()
@app.get("/orders/{id}")
def get(id: str): return {"id": id}
```

**Ruby (Rails)**:
```ruby
class OrdersController < ApplicationController
  def show
    render json: { id: params[:id] }
  end
end
```

**Go (chi)**:
```go
r := chi.NewRouter()
r.Get("/orders/{id}", func(w http.ResponseWriter, r *http.Request) {
  json.NewEncoder(w).Encode(map[string]string{"id": chi.URLParam(r, "id")})
})
```

**.NET (ASP.NET Minimal API)**:
```csharp
var app = WebApplication.CreateBuilder(args).Build();
app.MapGet("/orders/{id}", (string id) => new { id });
app.Run();
```

**PHP (Laravel)**:
```php
Route::get('/orders/{id}', fn($id) => response()->json(['id' => $id]));
```

**Rust (axum)**:
```rust
async fn get(Path(id): Path<String>) -> Json<Value> { Json(json!({"id": id})) }
```

Mesmo conceito; idioms divergem.

---

## 15. Como mover de stack

Pleno bom em Node move pra Java/Go/Python em **3-6 meses produção** se:
- Mantém princípios (não cargo culta).
- Lê código bom da nova stack (dois Tour pra cada nova stack).
- Pratica sob pressure (job real ou capstone real).

Senior → Senior: 2-4 meses. Conceitos atravessam.

Anti-pattern: tentar avaliar stack só por benchmark. Avalie por: ecosystem maturity, hire pool, fit pra problema, libraries críticas, team familiarity.

---

## Atualização

Quando você descobre stack-specific equivalent de algo do framework, append em sec relevante. Mantenha tabelas factuais.

Não tente cobrir **todas** as stacks. Foco no top 8-10 com market share real.

Excluído explicitamente:
- COBOL (legacy, mas hire pool restrito a banks).
- Erlang/Elixir além de menção (nicho mas powerful, dedicado se virar foco).
- Lisp / Scheme / Haskell além de 01-06 (academic relevance, low job market).
- Crystal, Nim, V, Zig (early adoption).

Se você estuda stack outside coverage, encontra equivalents com mesmo método. Conceitos atravessam.
