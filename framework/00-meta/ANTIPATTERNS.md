# ANTIPATTERNS, Lista Cross-Cutting

> Anti-patterns recorrentes mencionados ao longo dos módulos, consolidados aqui pra consulta rápida. Pega tudo o que **dev sênior real reconhece em code review** mas que junior produz constantemente.
>
> Use como **checklist de PR review** ou **diagnóstico self-review**. Cada item tem o módulo onde está aprofundado.

---

## CS / Foundations

### Algorítmo e estrutura
- **`O(n²)` aceito sem necessidade**. Loop em loop em data crescente., 01-05.
- **`Array.includes` em loop em vez de Set**. Quadratic disfarçado., 01-04.
- **String concat em loop** em vez de array+join (alguns languages)., 01-04, 01-15.
- **Recursion sem memoization** em problemas com overlapping subproblems., 01-05.
- **Cache-unfriendly data layout** (linked list onde array faria)., 01-04, 01-14.
- **Sort + linear scan** quando hash bastaria., 01-05.

### Memory / GC
- **Closure capturando state grande sem necessidade**: leak., 01-07, 02-07.
- **Arrays grandes mantidos vivos** por references esquecidas., 01-07.
- **Hot allocation em loop** (criar objects/arrays a cada iteration)., 01-14, 03-10.
- **String concat com `+=`** em loops gigantes (algumas linguagens copiam tudo)., 01-04.

### Concurrency
- **Thread Without joining**: race + leak., 01-11, 02-07.
- **Lock holding I/O** dentro de critical section., 01-11, 03-10.
- **Double-checked locking** sem `volatile`/atomic., 01-11.
- **CAS sem ABA mitigation** em estruturas com pointer recycling., 01-11.
- **Shared mutable global** entre handlers HTTP., 02-07, 02-08.
- **`async` retornado mas não awaited**., 01-07, 02-07.

### Cripto
- **Hash de senha sem salt** (ex: SHA-256 puro)., 01-12, 02-13.
- **Hash rápido pra senha** (SHA-256 em vez de Argon2id/bcrypt)., 01-12.
- **JWT com `alg:none` aceito**., 01-12, 02-13.
- **Comparação de tokens com `==`** em vez de `timingSafeEqual`., 01-12.
- **Nonce reutilizado em GCM**., 01-12.
- **`Math.random` em token** em vez de CSPRNG., 01-12.
- **ECB cipher mode**: leak de patterns., 01-12.
- **Sign-then-encrypt em vez de encrypt-then-MAC** (ou AEAD)., 01-12.

### Compilers / parsers
- **Concatenar strings pra construir SQL/HTML** (SQL injection / XSS)., 02-09, 03-08.
- **eval ou Function de input** sem sanitização., 01-07, 03-08.
- **Regex desumano** (catastrophic backtracking ReDoS)., 01-05, 03-08.

### CPU
- **Branch em hot loop sem necessidade**., 01-14.
- **False sharing** em counters paralelos., 01-11, 01-14.
- **Pointer chasing** em structs grandes (linked lists)., 01-14.
- **Unnecessary fp64** quando fp32 / fp16 basta., 01-14, 04-10.

### Math
- **Float pra dinheiro** em vez de bigint cents., 02-18, 01-15.
- **Subtração de números próximos** (catastrophic cancellation) em código numérico., 01-15.

---

## Web / Frontend

### CSS / HTML
- **`position: absolute`** pra layouts onde flex/grid resolveria., 02-01.
- **`!important`** acumulando, specificity wars., 02-01.
- **Px hardcoded** em vez de rem (a11y zoom)., 02-01, 02-02.
- **Tabela pra layout**., 02-01.
- **`<div onClick>`** em vez de `<button>`., 02-02, 03-17.

### Accessibility
- **`outline: none`** sem replacement., 02-02, 03-17.
- **Imagens sem alt text** (ou alt="image")., 02-02, 03-17.
- **Color como único sinal**., 02-02, 03-17.
- **Auto-rotating carousel sem pause**., 03-18.
- **Time limits sem warning**., 03-18.
- **Form sem label** ou label não associado., 02-02, 03-17.
- **ARIA com role conflitando** (button + clickable div)., 02-02, 03-17.
- **Lang attribute ausente**., 02-19, 03-17.

### React
- **Key={index}** em listas dinâmicas., 02-04.
- **`useEffect` com missing deps**., 02-04.
- **State derived em useState** em vez de computar., 02-04.
- **`useMemo` em tudo** (overhead sem ganho)., 02-04, 03-09.
- **`useCallback` sem dependent memoization**., 02-04.
- **Estado global pra dado local** (ex: form fields no Redux)., 02-04.
- **Mutating state directly** (`state.foo = x`)., 02-04.
- **Renderização não estável** (random IDs por render)., 02-04.

### Next.js
- **`use client` em tudo**: perde benefits de RSC., 02-05.
- **`fetch` com cache não thought-through**., 02-05.
- **Force re-render** em mudança de pathname desnecessário., 02-05.
- **Server Action sem validation**., 02-05.

### DOM / Web APIs
- **`innerHTML` com input**: XSS., 02-03, 03-08.
- **Listeners não removidos** em components que unmount., 02-03, 02-04.
- **Touch events em vez de Pointer events**., 02-03.

### Mobile
- **Bridge calls em loops** (RN)., 02-06.
- **Bloquear main thread**., 02-06, 02-17.
- **Sem permission rationale**., 02-17.
- **Background tracking** sem foreground service (Android)., 02-17.

### Build / bundle
- **Sem code splitting** em SPA grande., 03-09.
- **Imagens não otimizadas** (PNG quando WebP/AVIF serve)., 02-05, 03-09.
- **Fontes sem subsetting**., 03-09.
- **CSS-in-JS hot path** (runtime cost)., 03-09.

---

## Backend

### Database
- **N+1 query**., 02-09, 02-10.
- **`SELECT *`**., 02-09, 03-13.
- **Sem índice em FK**., 02-09.
- **Index em coluna nunca queried** (overhead pra writes)., 02-09.
- **`COUNT(*)` em tabela grande** sem caching., 02-09.
- **`LIKE '%foo%'`** em tabela grande sem GIN/trgm., 02-09, 02-15.
- **`ALTER TABLE ADD COLUMN NOT NULL DEFAULT`** em pré-PG11 (lock)., 02-09.
- **VARCHAR(N)** quando text faria., 02-09.
- **Connection pool ausente** em serverless., 02-09.
- **Migration que reescreve tabela** sem CONCURRENTLY., 02-09.
- **PgBouncer transaction mode** com prepared statements., 02-09.

### Cache
- **Cache sem TTL**., 02-11.
- **Cache stampede** (todos clients miss simultâneo)., 02-11.
- **Cache não-invalidado** após write., 02-11.
- **Cache de dado sensível** sem encryption., 02-11, 03-08.

### API
- **Endpoint `GET /admin/deleteAll`** (verb wrong)., 04-05.
- **Sem versioning**., 04-05.
- **Sem pagination** em list endpoints., 04-05.
- **Inconsistent error format** (404 às vezes JSON, às vezes HTML)., 04-05.
- **Stack trace em error response prod**., 04-05, 03-08.
- **Sem rate limit**., 04-04.
- **CORS `*`** em endpoint authenticated., 03-08.

### Auth
- **Senha em log**., 02-13, 03-08.
- **Token em URL (querystring)**., 02-13.
- **Refresh token sem rotation**., 02-13.
- **Sessions sem expiry**., 02-13.
- **OAuth2 sem PKCE em mobile/SPA**., 02-13.

### Payments
- **Webhook sem signature verify**., 02-18.
- **Webhook sem dedupe**., 02-18.
- **Charge sem idempotency key**., 02-18.
- **Float em currency**., 02-18.
- **Refund sem ledger entry**., 02-18.

### Search
- **Dual-write** DB + index sem reconciliation., 02-15.
- **Reindex destrutivo** sem alias swap., 02-15.
- **Query sem analyzer adequado** ao idioma., 02-15, 02-19.

### Real-time
- **WebSocket sem reconnect logic**., 02-14.
- **Broadcast pra all clients** quando deveria ser room/channel., 02-14.
- **Sem heartbeat / ping-pong**., 02-14.
- **Backpressure ignorado** (servidor empurra mais que client lê)., 02-14.

---

## Operações / Production

### Docker / K8s
- **`latest` tag** em prod., 03-02.
- **Container rodando como root**., 03-02, 03-08.
- **Secrets em env var em manifest** (em vez de Secret)., 03-02, 03-08.
- **Sem resource limits** (CPU/memory)., 03-03.
- **HPA sem min/max** sano., 03-03.
- **Single replica** pra service crítico., 03-03.
- **Helm direto em prod sem testar staging**., 03-03.

### CI/CD
- **Tests skipped pra "ship rápido"**., 03-01, 03-04.
- **Sem rollback automático**., 03-04, 03-15.
- **Deploy direto pra prod** sem canary/blue-green., 03-04.
- **Schema migration in same deploy** com code change incompatível., 02-09, 03-04.
- **Secrets em CI logs**., 03-04, 03-08.

### Observability
- **Sem logs estruturados** (só print)., 03-07.
- **Logs com PII**., 03-07, 03-08.
- **Métricas só de média** (sem P95/P99)., 03-07.
- **Alerting threshold absoluto** ("CPU > 80%") sem context., 03-07, 03-15.
- **Trace ID não propagado** entre services., 03-07.

### Security
- **Dependabot ignored**., 03-08.
- **Sem secrets rotation plan**., 03-08.
- **CSP ausente ou `unsafe-inline`**., 03-08.
- **Sem input validation no boundary**., 03-08, 04-05.
- **DoS em endpoint custoso** sem rate limit., 04-04, 03-08.

### Performance
- **Otimização sem profile**., 03-09, 03-10.
- **Microbenchmark sem warm-up**., 03-10, 01-14.
- **Cache em memory single-instance** assume single replica., 02-11, 03-10.
- **Sync I/O em event loop**., 02-07, 03-10.
- **Database thrashing** (queries sem batch)., 02-09, 03-10.

### Incident
- **Sem runbook** pra alert., 03-15.
- **Postmortem com blame** (vs blameless)., 03-15.
- **Sem follow-through** em action items., 03-15.
- **Status page silencioso** durante incidente., 03-15.

---

## Architecture / Distributed

### Services
- **"Microservices" sem service ownership clara**., 04-08, 05-03.
- **Synchronous chain de calls** (latency adds)., 04-04, 04-05.
- **Distributed transaction** (2PC) em vez de Saga., 04-03.
- **Service partilhando DB** (distributed monolith)., 04-08.

### Eventos
- **Eventos publicados antes de DB commit** (sem outbox)., 04-03.
- **Consumer não-idempotente** assumindo exactly-once., 04-02, 04-03.
- **Sem schema registry**: payload divergence., 04-02.
- **At-most-once em pagamentos** (perde txn)., 04-02, 02-18.

### Resilience
- **Retry sem jitter** (synchronized retries)., 04-04.
- **Sem circuit breaker** em external call., 04-04.
- **Timeout default infinito**., 04-04.
- **Sem bulkhead** entre tenants., 04-04.

### Scaling
- **Sharding por hash sem rebalance plan**., 04-09.
- **Single Postgres primary** sob 100k QPS., 02-09, 04-09.
- **Hot partition** (sharding poor key choice)., 04-09.

### Domain modeling
- **Anemic models** (DTOs sem behavior)., 04-06.
- **Bounded contexts violados** (Order acessa User direto via SQL)., 04-06.
- **Ubiquitous language inconsistente** (Order, Pedido, Sale misturados)., 04-06.

---

## Carreira / Influência

### Code review
- **Aprovar sem ler**., 04-12, 05-06.
- **Bikeshedding** (style nit) ignorando design issue., 04-12.
- **Walls of nits** sem priorização., 04-12.
- **Aprovar com "LGTM"** sem evidence de leitura., 04-12.

### Tech writing
- **RFC sem alternatives consideradas**., 04-12.
- **ADR sem trade-offs explícitos**., 04-12.
- **Doc desatualizada** sem flag., 04-12, 04-15.

### Mentorship
- **Solving instead of coaching**., 05-06.
- **Feedback vague**., 05-06.
- **Mentor que não cita data/source**., 05-06.

### Public output
- **Hot take sem evidence**., 05-05.
- **Tutorial duplicate** ("how to use Redux")., 05-05.
- **Promoção sutil de empregador**., 05-05.

### Estimation
- **Estimate inflado individual** (buffer escondido)., 03-16.
- **Sem re-plan check-in**., 03-16.
- **Promise unrealistic** sob pressure., 03-16.

### Org
- **Reorg como first solution**., 05-03.
- **Spotify Model literal** (reconhecidamente disfuncional)., 05-03.
- **Two pizza ignored** em time grande., 05-03.

---

## Meta-antipatterns (cuidado consigo)

- **Confiar em memória sem revisar Anki / journal**., STUDY-PROTOCOL.
- **Pular portões "porque já sei"**., MENTOR.md §9.
- **Copiar solução de tutorial em vez de pensar do princípio**., STUDY-PROTOCOL.
- **Estudar 12h sem dormir**., STUDY-PROTOCOL §7.
- **Skim notebooks sem implement**., STUDY-PROTOCOL.
- **Não revisar módulos passados** (decay > 90d)., STUDY-PROTOCOL §12.
- **Reading list de 200 papers e ler 0**., 05-04.
- **Burnout silencioso** (não sinalizar)., 03-15, 05-06.

---

## Como usar

- **PR review**: cole sub-seção relevante como checklist mental.
- **Self-review**: rode antes de mergear changes grandes.
- **Onboarding**: novo dev lê.
- **Mentorship**: mostre a mentee.
- **Updates**: quando você reconhece anti-pattern novo, append aqui com referência.

Cada anti-pattern listado tem **histórico real de prejuízo**. Não são opinions; são padrões que custam. Reduzir 80% deles é ROI massivo em qualidade de código + qualidade de vida.
