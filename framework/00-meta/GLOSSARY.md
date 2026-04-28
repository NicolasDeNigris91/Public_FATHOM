# GLOSSARY — Termos Técnicos Canônicos

> Vocabulário do framework. Cada termo em **EN** (forma original) com 1-2 frases de definição precisa. Não substitui leitura do módulo onde o termo aparece — é busca rápida pra desambiguar ou refrescar.
>
> Use Ctrl+F. Ordem alfabética por seção temática.

---

## Computer Science / Foundations (N01-N15)

- **AST** (Abstract Syntax Tree) — árvore que representa estrutura sintática de código após parser; AST descarta detalhes triviais (parens, whitespace) que CST preserva.
- **B-Tree / B+Tree** — árvores balanceadas de fan-out alto, otimizadas pra storage paginado; B+ mantém só keys nos internal nodes, leaves linkadas.
- **Big-O** — notação assintótica de pior caso de complexidade. Ignora constantes, foca no crescimento dominante. Em produção, constantes e cache importam.
- **Bloom filter** — estrutura probabilística que responde "talvez está / definitivamente não está" com false positive controlado, sem false negative.
- **Branch prediction** — CPU prevê direção de branches pra preencher pipeline; misprediction custa 10-20 ciclos.
- **CAS** (Compare-And-Swap) — operação atômica usada em algoritmos lock-free; atualiza valor só se atual = esperado.
- **Closure** — função que captura variáveis do scope onde foi definida.
- **Code point / Grapheme cluster** — code point é unidade Unicode; grapheme cluster é o que humano percebe como "caractere" (pode ter múltiplos code points: e + combining acute).
- **CPU pipeline** — divisão da execução em stages (fetch, decode, exec, mem, writeback) pra throughput; modernos têm 14-20+ stages.
- **CRDT** (Conflict-free Replicated Data Type) — estrutura de dados que garante convergência em sistemas distribuídos sem coordenação central.
- **CSPRNG** — Cryptographically Secure Pseudo-Random Number Generator. `/dev/urandom`, `crypto.randomBytes`.
- **Cycle time** — tempo do início ao fim de um item de trabalho (Kanban metric).
- **DAG** (Directed Acyclic Graph) — grafo direcionado sem ciclos. Modelagem comum: dependências, pipelines.
- **Discrete log** — dado g^x mod p, achar x. Difícil; base de DH e ECC.
- **Endianness** — ordem de bytes em memória (little-endian = LSB primeiro; big-endian = MSB).
- **Event loop** — abstração que processa callbacks pendentes em fases (timers, I/O, microtasks). Base do Node, browsers.
- **Event time vs Processing time** — quando evento aconteceu no mundo vs quando engine viu. Late events justificam watermarks.
- **Functor / Monad** — categorias funcionais. Functor: container com map. Monad: container com flat-map (chain).
- **GC** (Garbage Collection) — gerenciamento automático de memória. Estratégias: refcount, mark-sweep, generational, concurrent.
- **Generics / Type erasure / Reified** — generics em Java/TS são erased em runtime; em C# são reified (preservados).
- **Hash collision** — duas inputs produzem mesmo hash. Birthday paradox: com N tentativas, ~N²/2 pares.
- **Heap** (data structure) — árvore parcialmente ordenada. Min-heap: pai ≤ filhos. Base de priority queue.
- **HM** (Hindley-Milner) — sistema de tipos com inferência principal sem anotação. Base de OCaml, Haskell.
- **HNSW** (Hierarchical Navigable Small World) — grafos em camadas pra ANN search; busca log-N.
- **Idempotency** — operação que produz mesmo resultado se aplicada N vezes. Crítica em retries.
- **Inverted index** — termo → lista de documentos. Estrutura central de search engines.
- **JIT** (Just-In-Time) — compilação durante execução baseada em profile (hot path). V8 TurboFan, JVM C2.
- **Memory barrier / Fence** — instrução que proíbe reordering de loads/stores pelo CPU/compiler.
- **MVCC** (Multi-Version Concurrency Control) — DB mantém múltiplas versões de rows pra leitores não bloquearem writers.
- **NUMA** (Non-Uniform Memory Access) — arquitetura multi-socket onde cada socket tem memory mais próxima; acesso cross-socket é mais lento.
- **PCA** (Principal Component Analysis) — redução dimensional via decomposição (SVD).
- **PMU** (Performance Monitoring Unit) — counters de hardware (cycles, cache misses, branch mispredictions) acessíveis via `perf`.
- **Prefetch** — buscar dado em cache antes de uso. Hardware (linear stride) ou software (`__builtin_prefetch`).
- **PRNG vs CSPRNG** — pseudo-random vs cryptographically-secure. `Math.random` ≠ `crypto.randomBytes`.
- **Promise** — abstração de operação assíncrona com states (pending, fulfilled, rejected).
- **Prototype chain** — em JS, lookup de propriedades sobe pelo `__proto__`. Base de inheritance.
- **Quicksort partition** — algoritmo de O(n log n) average. Choice de pivot afeta pior caso (random ou median-of-three pra estabilidade).
- **Race condition** — ordering ambíguo entre operações concorrentes acessando estado compartilhado, com ≥1 write.
- **Recursive descent parser** — parser top-down hand-written; cada não-terminal vira função.
- **Set / Sequence** — conjunto sem ordem vs com ordem.
- **Shor / Grover** — algoritmos quânticos. Shor quebra fatoração; Grover speedup quadrático em busca.
- **SIMD** (Single Instruction, Multiple Data) — registers wide processam múltiplos valores; AVX, NEON, SVE.
- **SSA** (Static Single Assignment) — IR onde cada variável é atribuída uma vez; otimizações ficam triviais.
- **TLA+** — Temporal Logic of Actions. Linguagem pra spec formal de sistemas concorrentes/distribuídos.
- **TLB** (Translation Lookaside Buffer) — cache de virtual→physical address translation. Miss = page table walk.
- **UTF-8 / 16 / 32** — encodings Unicode. UTF-8 default web; UTF-16 default Java/JS strings; UTF-32 fixed-width.
- **WAL** (Write-Ahead Log) — log persistente antes de aplicar mudança; base de durabilidade e replication.
- **Watermark** — heurística "vi todos eventos com event_time ≤ T" em streaming.

---

## Web & Frontend (A01-A06, A19)

- **a11y** — accessibility (a + 11 letras + y).
- **App Router** (Next.js) — roteador baseado em React Server Components; substitui Pages Router.
- **ARIA** — Accessible Rich Internet Applications. Atributos extra pra tornar UI complexa acessível.
- **Atomic CSS** — utilitários single-purpose (Tailwind). Trade-off: bundle size up-front, reuso massivo, zero specificity wars.
- **Bidi** — bidirectional text. RTL (Arabic, Hebrew) + LTR misto.
- **CRDT** — ver Computer Science.
- **CRP** (Critical Rendering Path) — sequência browser segue de HTML → render. Otimizar lifecycle.
- **CSP** (Content Security Policy) — header HTTP que restringe sources de scripts/styles. Mitiga XSS.
- **CSR / SSR / SSG / ISR** — Client-Side Rendering / Server-Side / Static Generation / Incremental Static Regeneration.
- **DOM / Shadow DOM** — Document Object Model. Shadow DOM = encapsulamento (Web Components).
- **Fiber** — algoritmo de reconciliação do React desde v16. Permite work splitting, concurrent rendering.
- **Hydration** — reativar HTML SSR no cliente, attaching event listeners.
- **i18n / l10n** — internationalization (i + 18 letras + n) / localization. i18n = código preparado; l10n = traduções específicas.
- **IME** — Input Method Editor. CJK input via composition events.
- **MSE** (Media Source Extensions) — feed bytes em `<video>` via SourceBuffer; base de DASH/HLS players.
- **OffscreenCanvas** — Canvas em Worker, libera main thread.
- **PWA** — Progressive Web App. Service Worker + manifest + install.
- **Race / Suspend** (React) — patterns de concurrent rendering em React 18+.
- **RAF** (`requestAnimationFrame`) — sincroniza com vsync; 60fps = 16.67ms budget.
- **RSC** (React Server Components) — components que renderizam só no servidor; zero JS shipped.
- **Server Actions** (Next.js) — funções server invocadas direto do client via form submission ou call.
- **SVG vs Canvas vs WebGL/WebGPU** — escolhas de rendering por scale.
- **TLS / SNI / OCSP** — Transport Layer Security; Server Name Indication; Online Certificate Status Protocol.
- **VDOM** (Virtual DOM) — representação leve de DOM em memória; reconciliação calcula diff.
- **WebGPU** — sucessor de WebGL, baseado em Vulkan/Metal/D3D12. Compute shaders.

---

## Backend & Data (A07-A18, P13)

- **AEAD** (Authenticated Encryption with Associated Data) — AES-GCM, ChaCha20-Poly1305. Confidencialidade + integridade.
- **ANN** (Approximate Nearest Neighbor) — busca em embeddings com tradeoff recall × velocidade. HNSW dominante.
- **Backpressure** — feedback de consumer lento → producer reduz rate.
- **BM25** — ranking algoritmo baseado em TF-IDF refinado; default em Elasticsearch.
- **CDC** (Change Data Capture) — captura mudanças de DB OLTP em real-time. Debezium é canonical.
- **Connection pooler** — PgBouncer / pgcat / Supavisor entre app e Postgres pra reuso de conexões.
- **Cypher** — query language declarativa pra graph DBs. Neo4j origem.
- **Double-entry ledger** — accounting: cada txn afeta ≥2 contas, débitos = créditos. Imutável.
- **EXPLAIN ANALYZE** — Postgres mostra plan + tempos reais.
- **Failover / Failback** — switch pra replica; volta pro primary após recovery.
- **GIN / GiST / BRIN** — index types Postgres. GIN: arrays/jsonb/FTS. GiST: genérico (geometry, ranges). BRIN: block range, time-series.
- **GMV** (Gross Merchandise Value) — volume bruto em marketplace; revenue = GMV × take rate.
- **HNSW** — ver Computer Science.
- **Idempotency key** — identificador único pra request POST evita double-charge em retry.
- **Isolation levels** — Read Uncommitted / Committed / Repeatable Read / Serializable. Postgres SSI no nível Serializable.
- **JIT** — em Postgres 11+, ative pra queries com expressions complexas.
- **Logical replication** — Postgres publica/subscribe em nível de tabela via WAL decoding.
- **MQTT** — pub/sub leve, broker centralized; default IoT.
- **OAuth2 / OIDC** — auth delegation; OIDC adiciona identity layer.
- **OLTP / OLAP** — Online Transactional / Analytical Processing.
- **PaymentIntent** — objeto stateful no Stripe representando intenção de cobrar; idempotente.
- **PCI-DSS** (SAQ A vs SAQ D) — Payment Card Industry Data Security Standard. SAQ A: PSP iframes (escopo mínimo); SAQ D: PAN passa pelos seus servers.
- **PKCE** — Proof Key for Code Exchange. OAuth2 pra mobile/SPA.
- **Pub/Sub vs Queue** — pub/sub: 1-to-N, sem ack tracking. Queue: 1-to-1 com ack.
- **Realm** (mobile DB) — alternativa a SQLite em iOS/Android.
- **RLS** (Row-Level Security) — Postgres policy por tenant.
- **Schema registry** — Confluent / Apicurio. Versioning + compatibility de schemas Avro/Protobuf.
- **SQL injection** — concatenar input em query → atacante executa. Mitigação: parameterized queries.
- **TF-IDF** — Term Frequency × Inverse Document Frequency. Base ranking pré-BM25.
- **TLS pinning** — embed cert em mobile app pra não confiar em CA arbitrária.
- **TOAST** — The Oversized-Attribute Storage Technique. Postgres move colunas grandes pra tabela secundária.
- **Tokenization** (search) — split texto em terms; pipeline com char filter, tokenizer, token filter.
- **Tokenization** (payments) — substitui PAN por token opaco; reduce PCI scope.
- **Vacuum / Autovacuum** — Postgres limpa tuples mortas.
- **WAL** (write-ahead log) — base de durabilidade e replication.
- **Webhook** — HTTP callback assíncrono. Verifique signature, dedupe.

---

## Operações (P01-P17)

- **A/B/Canary deploy** — gradual rollout. Canary começa em 1% e expande.
- **Alert fatigue** — excesso de alerts não-actionable; equipe ignora.
- **Blue-green** — dois envs idênticos; switch atomicamente.
- **Burn rate** (SLO) — taxa de consumo de error budget. Multi-window multi-burn-rate detecta fast burn + slow burn.
- **Chaos engineering** — injetar falhas controladas pra build confidence.
- **CI/CD** — Continuous Integration / Continuous Delivery (ou Deployment).
- **CPU / RAM / FD limits** (containers) — recursos por container; cgroups.
- **CRD** (Custom Resource Definition) — Kubernetes API extension.
- **DR** (Disaster Recovery) — strategy pra restore após região perdida. RPO + RTO.
- **eBPF** — Extended Berkeley Packet Filter. Programs em kernel pra observability sem rebuild.
- **Error budget** — `1 - SLO`. Quando esgotado, freeze releases.
- **Game day** — simulação de incidente pra treinar resposta.
- **HPA** (Horizontal Pod Autoscaler) — Kubernetes scale por métrica.
- **IaC** (Infrastructure as Code) — Terraform, Pulumi.
- **Incident commander** — coordena resposta; não debug.
- **k6 / Artillery / Locust** — load testing tools.
- **Kubernetes (K8s)** — orquestrador de containers. Pods, Services, Deployments, etc.
- **MTTD / MTTR / MTBF** — Mean Time To Detect / Recover / Between Failures.
- **OpenTelemetry / OTel** — padrão pra traces, metrics, logs. Vendor-neutral.
- **PIT** (Point-In-Time) recovery — restore DB a momento específico via WAL replay.
- **PromQL** — query language Prometheus.
- **PSPs / Egress** (K8s) — Pod Security Policies / saída.
- **RED / USE** — RED: Rate, Errors, Duration (services). USE: Utilization, Saturation, Errors (resources).
- **Runbook** — playbook de resposta a alert/incidente.
- **Service mesh** — Istio, Linkerd, Consul Connect. Sidecar proxies pra mTLS, observability, traffic management.
- **SBOM** (Software Bill of Materials) — lista de componentes/deps.
- **Sigstore / SLSA** — supply chain security: signing, provenance.
- **SLI / SLO / SLA** — Indicator / Objective / Agreement.
- **TCO** (Total Cost of Ownership) — cost completo (infra + manutenção + opp cost) vs sticker price.
- **Trace span / propagation** — unidade de trabalho com context propagado por headers (W3C Trace Context).
- **WCAG** — Web Content Accessibility Guidelines. Níveis A / AA / AAA.

---

## Distributed & Architecture (S01-S16)

- **ACID** vs **BASE** — Atomicity/Consistency/Isolation/Durability vs Basically Available, Soft state, Eventually consistent.
- **At-least-once / At-most-once / Effectively-once** — message delivery semantics.
- **Bounded context** (DDD) — modelo coerente com fronteira; cada vira candidato a service.
- **Bulkhead** — isolamento de pools pra impedir falha cascata.
- **CAP** (Consistency, Availability, Partition tolerance) — pick 2 sob partition. PACELC refina.
- **Circuit breaker** — abre após N falhas; redirect ou fail fast.
- **Consensus** — Paxos, Raft. Concorda em valor entre N nodes sob falhas.
- **CQRS** (Command Query Responsibility Segregation) — separa write (events) de read (projections).
- **DDD** (Domain-Driven Design) — modelar de acordo com domínio; bounded contexts, aggregates, ubiquitous language.
- **DLQ** (Dead Letter Queue) — destino de mensagens que falharam após N retries.
- **Event sourcing** — persiste stream de eventos imutáveis; estado é projeção.
- **Eventual consistency** — réplicas convergem dado tempo sem novas writes.
- **FLP impossibility** — distributed consensus impossível em modelo asynchronous com 1 falha.
- **Gossip protocol** — info propaga peer-to-peer. Cassandra, Consul.
- **HATEOAS** — Hypermedia as the Engine of Application State. REST original.
- **Hexagonal / Clean / Vertical Slice** — arquiteturas de organização interna do código.
- **HLC** (Hybrid Logical Clock) — combina wall-clock + lógico.
- **HMAC** — Hash-based MAC. Signature de webhook.
- **Idempotency** — ver Backend.
- **Inverted index** — ver Backend.
- **Jepsen** — test suite + analyses de Aphyr expondo falhas em DBs distribuídos.
- **Kappa vs Lambda** (architecture) — só streaming vs batch+streaming.
- **Lamport clock** — relógio lógico que captura happens-before.
- **Liveness vs Safety** — eventually X (liveness) vs nunca X (safety).
- **Log-structured** (LSM) — write append-only + compaction. Cassandra, RocksDB.
- **mTLS** (mutual TLS) — auth bidirectional via certs.
- **Outbox pattern** — write em DB + outbox row → worker publica. Garante eventual publication confiável.
- **PACELC** — refine de CAP: se Partition, pick A ou C; Else, pick Latency ou Consistency.
- **Quorum** — N/2+1. Read+Write quorum garante consistency.
- **Raft / Paxos / VR** — consensus algorithms.
- **Saga** — long-running txn distribuída via compensation steps.
- **Service mesh** — ver Operações.
- **Sharding** — particionamento horizontal (hash, range, geographic).
- **Snapshot isolation / Serializable Snapshot Isolation (SSI)** — Postgres + CockroachDB.
- **Split-brain** — partition resulta em dois "leaders". Quorum previne.
- **Vector clock** — mapa de logical timestamps por node.
- **Zookeeper / etcd / Consul** — coordenação distribuída.

---

## Carreira & Influência (S12, S15-S16, ST*)

- **ADR** (Architecture Decision Record) — doc curto registrando decisão técnica e contexto.
- **ARR** (Annual Recurring Revenue) — MRR × 12; padrão SaaS.
- **BDFL** (Benevolent Dictator For Life) — modelo de governance OSS (Python pré-Guido step-down).
- **Brag doc** — registro pessoal de impact/scope. Base de promo case.
- **CAC** (Customer Acquisition Cost) — custo de adquirir cliente; comparar a LTV.
- **CFP** (Call For Papers) — submissão pra conf.
- **Churn** — % customers que saíram em período.
- **Conway's Law** — sistemas refletem comunicação organizacional.
- **DEI** — Diversity, Equity, Inclusion.
- **DR / RR** (Diluted Shares / Restricted Stock Units) — equity terms.
- **Engineering ladder / IC ladder** — career framework com níveis (L3-L8+).
- **GMV** — ver Backend.
- **GSD** (Get Stuff Done) — IC archetype.
- **Hofstadter's law** — "It always takes longer than you expect."
- **LTV** (Lifetime Value) — receita esperada por customer.
- **MAU / DAU** — Monthly / Daily Active Users.
- **NDR** (Net Dollar Retention) — > 100% = grow from base.
- **OKR** (Objective and Key Results) — alignment framework.
- **PIP** (Performance Improvement Plan) — formal track-to-fire ou recovery.
- **PLG** (Product-Led Growth) — produto vende sozinho. Notion, Vercel.
- **RFC** (Request For Comments) — proposta técnica em discussão.
- **SBI** (Situation-Behavior-Impact) — feedback structure.
- **Semver** — Semantic Versioning. MAJOR.MINOR.PATCH.
- **Sponsorship** vs **Mentorship** — sponsor coloca peso/risco; mentor ensina/guia.
- **Take rate** — % de GMV que plataforma fica.
- **TLA+** — ver Computer Science.
- **TM** (Translation Memory) — i18n.
- **TSC** (Technical Steering Committee) — governance OSS.
- **Two-pizza team** — 6-10 pessoas. Bezos era.
- **Unit economics** — receita - variable cost por unidade. Positivo = scale ajuda.
- **VPAT** (Voluntary Product Accessibility Template) — doc de a11y conformance.
- **WIP** (Work In Progress) — Kanban metric.
- **WCAG** — ver Operações.

---

## Adicionar termo

Quando descobrir termo importante não listado: edite este arquivo + commit. Mantenha 1-2 frases. Se mais que isso, é caso pra módulo, não pra glossário.
