# ANTIPATTERNS — Lista Cross-Cutting

> Anti-patterns recorrentes mencionados ao longo dos módulos, consolidados aqui pra consulta rápida. Pega tudo o que **dev sênior real reconhece em code review** mas que junior produz constantemente.
>
> Use como **checklist de PR review** ou **diagnóstico self-review**. Cada item tem o módulo onde está aprofundado.

---

## CS / Foundations

### Algorítmo e estrutura
- **`O(n²)` aceito sem necessidade**. Loop em loop em data crescente. — N05.
- **`Array.includes` em loop em vez de Set**. Quadratic disfarçado. — N04.
- **String concat em loop** em vez de array+join (alguns languages). — N04, N15.
- **Recursion sem memoization** em problemas com overlapping subproblems. — N05.
- **Cache-unfriendly data layout** (linked list onde array faria). — N04, N14.
- **Sort + linear scan** quando hash bastaria. — N05.

### Memory / GC
- **Closure capturando state grande sem necessidade** — leak. — N07, A07.
- **Arrays grandes mantidos vivos** por references esquecidas. — N07.
- **Hot allocation em loop** (criar objects/arrays a cada iteration). — N14, P10.
- **String concat com `+=`** em loops gigantes (algumas linguagens copiam tudo). — N04.

### Concurrency
- **Thread Without joining** — race + leak. — N11, A07.
- **Lock holding I/O** dentro de critical section. — N11, P10.
- **Double-checked locking** sem `volatile`/atomic. — N11.
- **CAS sem ABA mitigation** em estruturas com pointer recycling. — N11.
- **Shared mutable global** entre handlers HTTP. — A07, A08.
- **`async` retornado mas não awaited**. — N07, A07.

### Cripto
- **Hash de senha sem salt** (ex: SHA-256 puro). — N12, A13.
- **Hash rápido pra senha** (SHA-256 em vez de Argon2id/bcrypt). — N12.
- **JWT com `alg:none` aceito**. — N12, A13.
- **Comparação de tokens com `==`** em vez de `timingSafeEqual`. — N12.
- **Nonce reutilizado em GCM**. — N12.
- **`Math.random` em token** em vez de CSPRNG. — N12.
- **ECB cipher mode** — leak de patterns. — N12.
- **Sign-then-encrypt em vez de encrypt-then-MAC** (ou AEAD). — N12.

### Compilers / parsers
- **Concatenar strings pra construir SQL/HTML** (SQL injection / XSS). — A09, P08.
- **eval ou Function de input** sem sanitização. — N07, P08.
- **Regex desumano** (catastrophic backtracking ReDoS). — N05, P08.

### CPU
- **Branch em hot loop sem necessidade**. — N14.
- **False sharing** em counters paralelos. — N11, N14.
- **Pointer chasing** em structs grandes (linked lists). — N14.
- **Unnecessary fp64** quando fp32 / fp16 basta. — N14, S10.

### Math
- **Float pra dinheiro** em vez de bigint cents. — A18, N15.
- **Subtração de números próximos** (catastrophic cancellation) em código numérico. — N15.

---

## Web / Frontend

### CSS / HTML
- **`position: absolute`** pra layouts onde flex/grid resolveria. — A01.
- **`!important`** acumulando — specificity wars. — A01.
- **Px hardcoded** em vez de rem (a11y zoom). — A01, A02.
- **Tabela pra layout**. — A01.
- **`<div onClick>`** em vez de `<button>`. — A02, P17.

### Accessibility
- **`outline: none`** sem replacement. — A02, P17.
- **Imagens sem alt text** (ou alt="image"). — A02, P17.
- **Color como único sinal**. — A02, P17.
- **Auto-rotating carousel sem pause**. — P18.
- **Time limits sem warning**. — P18.
- **Form sem label** ou label não associado. — A02, P17.
- **ARIA com role conflitando** (button + clickable div). — A02, P17.
- **Lang attribute ausente**. — A19, P17.

### React
- **Key={index}** em listas dinâmicas. — A04.
- **`useEffect` com missing deps**. — A04.
- **State derived em useState** em vez de computar. — A04.
- **`useMemo` em tudo** (overhead sem ganho). — A04, P09.
- **`useCallback` sem dependent memoization**. — A04.
- **Estado global pra dado local** (ex: form fields no Redux). — A04.
- **Mutating state directly** (`state.foo = x`). — A04.
- **Renderização não estável** (random IDs por render). — A04.

### Next.js
- **`use client` em tudo** — perde benefits de RSC. — A05.
- **`fetch` com cache não thought-through**. — A05.
- **Force re-render** em mudança de pathname desnecessário. — A05.
- **Server Action sem validation**. — A05.

### DOM / Web APIs
- **`innerHTML` com input** — XSS. — A03, P08.
- **Listeners não removidos** em components que unmount. — A03, A04.
- **Touch events em vez de Pointer events**. — A03.

### Mobile
- **Bridge calls em loops** (RN). — A06.
- **Bloquear main thread**. — A06, A17.
- **Sem permission rationale**. — A17.
- **Background tracking** sem foreground service (Android). — A17.

### Build / bundle
- **Sem code splitting** em SPA grande. — P09.
- **Imagens não otimizadas** (PNG quando WebP/AVIF serve). — A05, P09.
- **Fontes sem subsetting**. — P09.
- **CSS-in-JS hot path** (runtime cost). — P09.

---

## Backend

### Database
- **N+1 query**. — A09, A10.
- **`SELECT *`**. — A09, P13.
- **Sem índice em FK**. — A09.
- **Index em coluna nunca queried** (overhead pra writes). — A09.
- **`COUNT(*)` em tabela grande** sem caching. — A09.
- **`LIKE '%foo%'`** em tabela grande sem GIN/trgm. — A09, A15.
- **`ALTER TABLE ADD COLUMN NOT NULL DEFAULT`** em pré-PG11 (lock). — A09.
- **VARCHAR(N)** quando text faria. — A09.
- **Connection pool ausente** em serverless. — A09.
- **Migration que reescreve tabela** sem CONCURRENTLY. — A09.
- **PgBouncer transaction mode** com prepared statements. — A09.

### Cache
- **Cache sem TTL**. — A11.
- **Cache stampede** (todos clients miss simultâneo). — A11.
- **Cache não-invalidado** após write. — A11.
- **Cache de dado sensível** sem encryption. — A11, P08.

### API
- **Endpoint `GET /admin/deleteAll`** (verb wrong). — S05.
- **Sem versioning**. — S05.
- **Sem pagination** em list endpoints. — S05.
- **Inconsistent error format** (404 às vezes JSON, às vezes HTML). — S05.
- **Stack trace em error response prod**. — S05, P08.
- **Sem rate limit**. — S04.
- **CORS `*`** em endpoint authenticated. — P08.

### Auth
- **Senha em log**. — A13, P08.
- **Token em URL (querystring)**. — A13.
- **Refresh token sem rotation**. — A13.
- **Sessions sem expiry**. — A13.
- **OAuth2 sem PKCE em mobile/SPA**. — A13.

### Payments
- **Webhook sem signature verify**. — A18.
- **Webhook sem dedupe**. — A18.
- **Charge sem idempotency key**. — A18.
- **Float em currency**. — A18.
- **Refund sem ledger entry**. — A18.

### Search
- **Dual-write** DB + index sem reconciliation. — A15.
- **Reindex destrutivo** sem alias swap. — A15.
- **Query sem analyzer adequado** ao idioma. — A15, A19.

### Real-time
- **WebSocket sem reconnect logic**. — A14.
- **Broadcast pra all clients** quando deveria ser room/channel. — A14.
- **Sem heartbeat / ping-pong**. — A14.
- **Backpressure ignorado** (servidor empurra mais que client lê). — A14.

---

## Operações / Production

### Docker / K8s
- **`latest` tag** em prod. — P02.
- **Container rodando como root**. — P02, P08.
- **Secrets em env var em manifest** (em vez de Secret). — P02, P08.
- **Sem resource limits** (CPU/memory). — P03.
- **HPA sem min/max** sano. — P03.
- **Single replica** pra service crítico. — P03.
- **Helm direto em prod sem testar staging**. — P03.

### CI/CD
- **Tests skipped pra "ship rápido"**. — P01, P04.
- **Sem rollback automático**. — P04, P15.
- **Deploy direto pra prod** sem canary/blue-green. — P04.
- **Schema migration in same deploy** com code change incompatível. — A09, P04.
- **Secrets em CI logs**. — P04, P08.

### Observability
- **Sem logs estruturados** (só print). — P07.
- **Logs com PII**. — P07, P08.
- **Métricas só de média** (sem P95/P99). — P07.
- **Alerting threshold absoluto** ("CPU > 80%") sem context. — P07, P15.
- **Trace ID não propagado** entre services. — P07.

### Security
- **Dependabot ignored**. — P08.
- **Sem secrets rotation plan**. — P08.
- **CSP ausente ou `unsafe-inline`**. — P08.
- **Sem input validation no boundary**. — P08, S05.
- **DoS em endpoint custoso** sem rate limit. — S04, P08.

### Performance
- **Otimização sem profile**. — P09, P10.
- **Microbenchmark sem warm-up**. — P10, N14.
- **Cache em memory single-instance** assume single replica. — A11, P10.
- **Sync I/O em event loop**. — A07, P10.
- **Database thrashing** (queries sem batch). — A09, P10.

### Incident
- **Sem runbook** pra alert. — P15.
- **Postmortem com blame** (vs blameless). — P15.
- **Sem follow-through** em action items. — P15.
- **Status page silencioso** durante incidente. — P15.

---

## Architecture / Distributed

### Services
- **"Microservices" sem service ownership clara**. — S08, ST03.
- **Synchronous chain de calls** (latency adds). — S04, S05.
- **Distributed transaction** (2PC) em vez de Saga. — S03.
- **Service partilhando DB** (distributed monolith). — S08.

### Eventos
- **Eventos publicados antes de DB commit** (sem outbox). — S03.
- **Consumer não-idempotente** assumindo exactly-once. — S02, S03.
- **Sem schema registry** — payload divergence. — S02.
- **At-most-once em pagamentos** (perde txn). — S02, A18.

### Resilience
- **Retry sem jitter** (synchronized retries). — S04.
- **Sem circuit breaker** em external call. — S04.
- **Timeout default infinito**. — S04.
- **Sem bulkhead** entre tenants. — S04.

### Scaling
- **Sharding por hash sem rebalance plan**. — S09.
- **Single Postgres primary** sob 100k QPS. — A09, S09.
- **Hot partition** (sharding poor key choice). — S09.

### Domain modeling
- **Anemic models** (DTOs sem behavior). — S06.
- **Bounded contexts violados** (Order acessa User direto via SQL). — S06.
- **Ubiquitous language inconsistente** (Order, Pedido, Sale misturados). — S06.

---

## Carreira / Influência

### Code review
- **Aprovar sem ler**. — S12, ST06.
- **Bikeshedding** (style nit) ignorando design issue. — S12.
- **Walls of nits** sem priorização. — S12.
- **Aprovar com "LGTM"** sem evidence de leitura. — S12.

### Tech writing
- **RFC sem alternatives consideradas**. — S12.
- **ADR sem trade-offs explícitos**. — S12.
- **Doc desatualizada** sem flag. — S12, S15.

### Mentorship
- **Solving instead of coaching**. — ST06.
- **Feedback vague**. — ST06.
- **Mentor que não cita data/source**. — ST06.

### Public output
- **Hot take sem evidence**. — ST05.
- **Tutorial duplicate** ("how to use Redux"). — ST05.
- **Promoção sutil de empregador**. — ST05.

### Estimation
- **Estimate inflado individual** (buffer escondido). — P16.
- **Sem re-plan check-in**. — P16.
- **Promise unrealistic** sob pressure. — P16.

### Org
- **Reorg como first solution**. — ST03.
- **Spotify Model literal** (reconhecidamente disfuncional). — ST03.
- **Two pizza ignored** em time grande. — ST03.

---

## Meta-antipatterns (cuidado consigo)

- **Confiar em memória sem revisar Anki / journal**. — STUDY-PROTOCOL.
- **Pular portões "porque já sei"**. — MENTOR.md §9.
- **Copiar solução de tutorial em vez de pensar do princípio**. — STUDY-PROTOCOL.
- **Estudar 12h sem dormir**. — STUDY-PROTOCOL §7.
- **Skim notebooks sem implement**. — STUDY-PROTOCOL.
- **Não revisar módulos passados** (decay > 90d). — STUDY-PROTOCOL §12.
- **Reading list de 200 papers e ler 0**. — ST04.
- **Burnout silencioso** (não sinalizar). — P15, ST06.

---

## Como usar

- **PR review**: cole sub-seção relevante como checklist mental.
- **Self-review**: rode antes de mergear changes grandes.
- **Onboarding**: novo dev lê.
- **Mentorship**: mostre a mentee.
- **Updates**: quando você reconhece anti-pattern novo, append aqui com referência.

Cada anti-pattern listado tem **histórico real de prejuízo**. Não são opinions; são padrões que custam. Reduzir 80% deles é ROI massivo em qualidade de código + qualidade de vida.
