# Elite References — Repos, Blogs, Talks e Comunidades Padrão-Ouro

> Onde devs de elite **realmente** consomem informação. Sem Medium clickbait, sem "Top 10 React Hooks You Must Know", sem cursinhos de YouTube. Tudo aqui é referência primária ou de autor reconhecido.

---

## 1. Repos Open-Source Padrão-Ouro

Estudar código de produção de classe mundial é uma das atividades de maior alavancagem que existe. Escolha 1-2 repos por estágio e **leia código de verdade** — não só README.

### Estágio 1 — Novice
- **[V8](https://github.com/v8/v8)** — engine JavaScript do Chrome/Node. Comece por `src/builtins/`.
- **[Node.js](https://github.com/nodejs/node)** — `lib/` (JS land) e `src/` (C++). Leia `lib/internal/streams/` pra entender streams.
- **[libuv](https://github.com/libuv/libuv)** — event loop em C que roda o Node.
- **[git](https://github.com/git/git)** — código original do Git. `Documentation/technical/` tem docs internas excelentes.
- **[lodash](https://github.com/lodash/lodash)** — código JS idiomático bem testado.
- **[zod](https://github.com/colinhacks/zod)** — TS type system explorado a fundo.
- **[type-challenges](https://github.com/type-challenges/type-challenges)** — exercícios brutais de TypeScript.
- **[Crafting Interpreters Lox](https://github.com/munificent/craftinginterpreters)** — codebase do livro; toy interpreter end-to-end. Pra **N13**.
- **[parking_lot](https://github.com/Amanieu/parking_lot)** — Rust syncs primitives com futex. Pra **N11**.
- **[libsodium](https://github.com/jedisct1/libsodium)** — biblioteca cripto opinativa, segura por default. Pra **N12**.
- **[Linux perf](https://github.com/torvalds/linux/tree/master/tools/perf)** — fonte do `perf`. Pra **N14**.
- **[NumPy](https://github.com/numpy/numpy)** — numerical Python. Algoritmos canônicos. Pra **N15**.

### Estágio 2 — Apprentice
- **[React](https://github.com/facebook/react)** — `packages/react-reconciler/` é onde mora a Fiber architecture.
- **[Next.js](https://github.com/vercel/next.js)** — `packages/next/src/server/` pra rendering.
- **[Hono](https://github.com/honojs/hono)** — backend framework moderno, código limpo, ótimo pra ler.
- **[Fastify](https://github.com/fastify/fastify)** — modelo de plugin, hooks, validation.
- **[Prisma](https://github.com/prisma/prisma)** — query engine em Rust.
- **[Drizzle ORM](https://github.com/drizzle-team/drizzle-orm)** — TS-first, type-safe, leitura agradável.
- **[BullMQ](https://github.com/taskforcesh/bullmq)** — job queue sobre Redis, padrões de filas.
- **[trpc](https://github.com/trpc/trpc)** — RPC type-safe entre client e server.
- **[Redis](https://github.com/redis/redis)** — código C, mas data structures são canônicas (`src/dict.c`, `src/t_zset.c`).
- **[PostgreSQL](https://github.com/postgres/postgres)** — denso em C. Comece por `src/backend/access/heap/` pra entender storage.
- **[MongoDB Realm SDK](https://github.com/realm/realm-js)**.
- **[Socket.IO](https://github.com/socketio/socket.io)** — implementação de WebSocket-based real-time.
- **[Meilisearch](https://github.com/meilisearch/meilisearch)** — Rust, search engine com DX excelente. Pra **A15**.
- **[OpenSearch](https://github.com/opensearch-project/OpenSearch)** — fork open-source de Elasticsearch. Pra **A15**.
- **[pgvector](https://github.com/pgvector/pgvector)** — vector similarity em Postgres. Pra **A15**.
- **[Memgraph](https://github.com/memgraph/memgraph)** — graph DB in-memory. Pra **A16**.
- **[Apache AGE](https://github.com/apache/age)** — Cypher sobre Postgres. Pra **A16**.
- **[Stripe SDK Node](https://github.com/stripe/stripe-node)** — biblioteca de referência em payment integration. Pra **A18**.
- **[Stripe CLI](https://github.com/stripe/stripe-cli)** — local webhook testing. Pra **A18**.
- **[swift-evolution](https://github.com/apple/swift-evolution)** + **[swiftlang/swift](https://github.com/swiftlang/swift)** — Swift internals. Pra **A17**.
- **[Compose Multiplatform](https://github.com/JetBrains/compose-multiplatform)** + **[androidx](https://github.com/androidx/androidx)** — Android modern. Pra **A17**.
- **[FormatJS](https://github.com/formatjs/formatjs)** + **[i18next](https://github.com/i18next/i18next)** — i18n libs canônicas. Pra **A19**.
- **[Yjs](https://github.com/yjs/yjs)** — CRDT lib madura. Pra **ST02** real-time capstone.

### Estágio 3 — Professional
- **[Docker](https://github.com/moby/moby)** — engine open-source do Docker (moby).
- **[containerd](https://github.com/containerd/containerd)** — container runtime moderno.
- **[Kubernetes](https://github.com/kubernetes/kubernetes)** — *o* projeto Go de larga escala. Leia `pkg/scheduler/`.
- **[etcd](https://github.com/etcd-io/etcd)** — Raft consensus em produção.
- **[Prometheus](https://github.com/prometheus/prometheus)** — TSDB + scraping + query engine.
- **[Grafana](https://github.com/grafana/grafana)** — dashboards.
- **[OpenTelemetry](https://github.com/open-telemetry)** — vários repos, leia o JS SDK.
- **[Vault (HashiCorp)](https://github.com/hashicorp/vault)** — secrets management de produção.
- **[Terraform](https://github.com/hashicorp/terraform)** — provider model.
- **[ClamAV](https://github.com/Cisco-Talos/clamav)** ou **[OWASP ZAP](https://github.com/zaproxy/zaproxy)** — pra entender pentest tooling.
- **[Tokio](https://github.com/tokio-rs/tokio)** — runtime async em Rust, paralelo conceitual ao libuv.
- **[ClickHouse](https://github.com/ClickHouse/ClickHouse)** — column-store distribuído state-of-art. Pra **P13**.
- **[TimescaleDB](https://github.com/timescale/timescaledb)** — extension Postgres pra time-series. Pra **P13**.
- **[DuckDB](https://github.com/duckdb/duckdb)** — analítico in-process. Leitura agradável. Pra **P13**.
- **[deck.gl](https://github.com/visgl/deck.gl)** — GPU-rendered geo viz. Pra **P14**.
- **[ffmpeg](https://github.com/FFmpeg/FFmpeg)** — codec swiss-army knife. Pra **P14**.
- **[axe-core](https://github.com/dequelabs/axe-core)** — engine a11y open-source. Pra **P17**.
- **[Pa11y](https://github.com/pa11y/pa11y)** — CLI runner pra a11y CI. Pra **P17**.

### Estágio 4 — Senior
- **[Apache Kafka](https://github.com/apache/kafka)** — Scala/Java, mas a doc do `core/` é ouro.
- **[NATS](https://github.com/nats-io/nats-server)** — alternativa moderna, Go, código limpo.
- **[RabbitMQ](https://github.com/rabbitmq/rabbitmq-server)** — Erlang/OTP.
- **[CockroachDB](https://github.com/cockroachdb/cockroach)** — SQL distribuído, Raft, snapshot isolation.
- **[YugabyteDB](https://github.com/yugabyte/yugabyte-db)** — Postgres distribuído.
- **[TiDB](https://github.com/pingcap/tidb)** — outra DB distribuída sólida.
- **[Temporal](https://github.com/temporalio/temporal)** — workflow engine, durable execution.
- **[NestJS](https://github.com/nestjs/nest)** — DDD-friendly, modular monolith pattern.
- **[envoy](https://github.com/envoyproxy/envoy)** — service mesh proxy.
- **[Istio](https://github.com/istio/istio)** — service mesh control plane.
- **[Anthropic Cookbook](https://github.com/anthropics/anthropic-cookbook)** — padrões de uso de LLM em produção.
- **[LangChain](https://github.com/langchain-ai/langchain)** ou **[LangGraph](https://github.com/langchain-ai/langgraph)** — RAG, agents.
- **[Solidity](https://github.com/ethereum/solidity)** — compilador.
- **[OpenZeppelin Contracts](https://github.com/OpenZeppelin/openzeppelin-contracts)** — padrões de smart contracts seguros.
- **[Apache Flink](https://github.com/apache/flink)** — streaming engine canônico. Pra **S13**.
- **[Apache Spark](https://github.com/apache/spark)** — batch + streaming. Pra **S13**.
- **[dbt-core](https://github.com/dbt-labs/dbt-core)** — transformations declarativas em warehouse. Pra **S13**.
- **[Apache Iceberg](https://github.com/apache/iceberg)** — lakehouse spec. Pra **S13**.
- **[etcd raft](https://github.com/etcd-io/raft)** — implementação Raft de produção. Referência conceitual pra **S14**.
- **[TLA+ Examples](https://github.com/tlaplus/Examples)** — specs reais. Pra **S14**.
- **[FastAPI](https://github.com/tiangolo/fastapi)** — exemplo OSS sustentado. Pra **S15**.

### Estágio 5 — Staff / Principal
- **[Crafting Interpreters](https://github.com/munificent/craftinginterpreters)** — codebase de toy interpreter. Pra **ST01**.
- **[build-your-own-x](https://github.com/codecrafters-io/build-your-own-x)** — colection de projetos build-from-scratch. Pra **ST01**.
- **[Excalidraw](https://github.com/excalidraw/excalidraw)** — real-time collab whiteboard com CRDT. Pra **ST02**.
- **[Open source maintainer journals](https://github.com/sindresorhus/awesome)** — exemplos de governance, sustainability. Pra **S15**.
- **[Zephyr](https://github.com/zephyrproject-rtos/zephyr)** — RTOS modern. Pra **ST07**.
- **[ESP-IDF](https://github.com/espressif/esp-idf)** — ESP32 framework. Pra **ST07**.
- **[Embedded Rust HAL](https://github.com/rust-embedded/embedded-hal)** — Rust em microcontrollers. Pra **ST07**.

---

## 2. Blogs Técnicos de Elite

Pessoas e empresas com conteúdo de qualidade consistente, **sem clickbait**.

### Indivíduos
- **[Martin Kleppmann](https://martin.kleppmann.com/)** — autor do DDIA, escreve sobre distributed systems com rigor.
- **[Brendan Gregg](https://www.brendangregg.com/)** — performance, eBPF, flamegraphs. **Leia tudo.**
- **[Dan Abramov](https://overreacted.io/)** — React internals, mental models.
- **[Kent C. Dodds](https://kentcdodds.com/blog)** — testing, React patterns.
- **[Simon Willison](https://simonwillison.net/)** — pragmatismo aplicado, AI/LLM, observabilidade.
- **[Hillel Wayne](https://www.hillelwayne.com/)** — formal methods (S14), software engineering crítico.
- **[Aphyr (Kyle Kingsbury)](https://aphyr.com/)** — Jepsen series. Como DBs distribuídas falham. **Indispensável.**
- **[Adrian Colyer (the morning paper)](https://blog.acolyer.org/)** — paper reviews curados (ST04).
- **[Bartosz Ciechanowski](https://ciechanow.ski/)** — visualizações brilhantes de conceitos físicos e computacionais.
- **[Julia Evans](https://jvns.ca/)** — explicações claras de Linux internals, networking, debugging. Modelo de **ST05**.
- **[Will Larson (Irrational Exuberance)](https://lethain.com/)** — engineering management, staff+ engineering (S12, ST03, ST06).
- **[Camille Fournier](https://skamille.medium.com/)** — tech leadership.
- **[Marc Brooker](https://brooker.co.za/blog/)** — distributed systems engineer at AWS (S01, S14).
- **[Mathias Bynens](https://mathiasbynens.be/)** — V8, Web platform internals (N07, N13).
- **[Lin Clark (codecartoons)](https://code-cartoons.com/)** — explicações ilustradas de coisas profundas.
- **[Tanya Reilly](https://noidea.dog/blog)** — Staff Engineer's Path. Pra **ST03/ST06**.
- **[Patrick McKenzie](https://www.kalzumeus.com/)** + **[Bits about Money](https://www.bitsaboutmoney.com/)** — engineering meets fintech, business. Pra **A18, S16**.
- **[Dan Luu](https://danluu.com/)** — long-form técnico de elite. Modelo de **ST05**.
- **[Cassidy Williams](https://cassidoo.co/)** — short-form sustainability.
- **[Sara Soueidan](https://www.sarasoueidan.com/)** — accessibility profundo (P17).
- **[Adrian Roselli](https://adrianroselli.com/)** — ARIA + a11y patterns (P17).
- **[Jepsen / Aphyr Analyses](https://jepsen.io/analyses)** — falhas reais de DBs distribuídas (S01).
- **[Murat Demirbas](http://muratbuffalo.blogspot.com/)** — paper reviews de distributed (ST04).
- **[Chip Huyen](https://huyenchip.com/)** — ML systems em produção. Pra **S10**.
- **[Lara Hogan](https://larahogan.me/)** — resilient management, mentoria (ST06).
- **[Gergely Orosz / Pragmatic Engineer](https://newsletter.pragmaticengineer.com/)** — staff+ careers, org (ST03).
- **[Preshing on Programming](https://preshing.com/)** — lock-free + memory models (N11).

### Empresas
- **[High Scalability](http://highscalability.com/)** — case studies de arquitetura em escala.
- **[Netflix Tech Blog](https://netflixtechblog.com/)**.
- **[Uber Engineering](https://www.uber.com/blog/engineering/)**.
- **[Cloudflare Blog](https://blog.cloudflare.com/)** — networking, edge computing, ataques DDoS.
- **[Discord Engineering](https://discord.com/blog/engineering-and-developers)**.
- **[Stripe Engineering](https://stripe.com/blog/engineering)**.
- **[GitHub Engineering](https://github.blog/engineering/)**.
- **[Vercel Blog](https://vercel.com/blog)** — Next.js internals.
- **[Anthropic Engineering](https://www.anthropic.com/engineering)** — prompt engineering, agent patterns, LLM systems (recurso de estudo pra **S10**).
- **[V8 Blog](https://v8.dev/blog)** — engine JS internals.
- **[Mozilla Hacks](https://hacks.mozilla.org/)**.
- **[Two Sigma Engineering](https://www.twosigma.com/articles/)** — fintech, distributed.

---

## 3. Talks Canônicas (YouTube/Conferences)

### Sobre Performance e Sistemas
- **"What the heck is the event loop anyway?"** — Philip Roberts, JSConf EU 2014. Use isso como ground truth do event loop.
- **"In The Loop"** — Jake Archibald, JSConf.Asia 2018. Sequência do anterior, mais técnico.
- **"Performance Wins With eBPF"** — Brendan Gregg.
- **"Designing Data-Intensive Applications: The Talk"** — Martin Kleppmann.
- **"Simple Made Easy"** — Rich Hickey (creator of Clojure). Filosofia de design.
- **"The Mess We're In"** — Joe Armstrong (Erlang). Concorrência e estado.
- **"Hammock Driven Development"** — Rich Hickey. Como pensar em problemas.

### Sobre Distribuídos
- **"Time, Clocks, and the Ordering of Events"** — Leslie Lamport (Turing Award lecture).
- **"In Search of an Understandable Consensus Algorithm"** — Diego Ongaro (Raft paper, talks).
- **"How Complex Systems Fail"** — Richard Cook (PDF curto, leia também).
- **"On the Criteria To Be Used in Decomposing Systems into Modules"** — David Parnas (paper, ~10 páginas).

### Sobre React/Frontend
- **"React: Rethinking best practices"** — Pete Hunt, JSConf EU 2013. Histórica.
- **"A Cartoon Intro to Fiber"** — Lin Clark.

### Sobre AI/LLM
- **"State of GPT"** — Andrej Karpathy.
- **"The Bitter Lesson"** — Rich Sutton (não é talk, é ensaio curto, mas essencial).

### Sobre Performance e CPU (N14)
- **"What Every Programmer Should Know About Memory"** — Ulrich Drepper (paper).
- **"Mechanical Sympathy"** talks — Martin Thompson.
- **"Memory Barriers: a Hardware View for Software Hackers"** — Paul McKenney.

### Sobre Search e IR (A15)
- **"Relevant Search"** — Doug Turnbull, John Berryman.

### Sobre Embedded (ST07)
- **Pete Warden's blog** — TinyML, embedded perf.

### Sobre Org / Career (ST03, ST06)
- **"Staff Engineer Archetypes"** — Tanya Reilly.
- **"How to Become a Top Engineer"** — Lara Hogan.

### Sobre i18n (A19)
- **"Falsehoods Programmers Believe About Names / Time / Addresses"** — series.

---

## 4. Comunidades Técnicas (alta sinal)

### Discussão Técnica de Alto Nível
- **[Hacker News](https://news.ycombinator.com/)** — leia threads de top stories. Comentários frequentemente melhores que artigos.
- **[Lobsters](https://lobste.rs/)** — alternativa mais técnica e curada que HN.
- **[Reddit /r/programming](https://www.reddit.com/r/programming)** — filtro por "top week", ignore o resto.
- **[Reddit /r/ExperiencedDevs](https://www.reddit.com/r/ExperiencedDevs/)** — discussões de carreira honestas.

### Específicas
- **[r/javascript](https://www.reddit.com/r/javascript)**, filtro top week.
- **[r/typescript](https://www.reddit.com/r/typescript)**.
- **[r/node](https://www.reddit.com/r/node)**.
- **[r/PostgreSQL](https://www.reddit.com/r/PostgreSQL)** — surpreendentemente técnico.
- **[r/kubernetes](https://www.reddit.com/r/kubernetes)**.
- **[r/devops](https://www.reddit.com/r/devops)**.
- **[r/distributedsystems](https://www.reddit.com/r/distributedsystems)**.
- **[r/csharp](https://www.reddit.com/r/csharp)** — só pra ler discussões sobre architecture, mesmo se não codar C#.

### Discord/Slack
- **[TypeScript Discord](https://discord.com/invite/typescript)**.
- **[Reactiflux Discord](https://www.reactiflux.com/)** — React community.
- **[Postgres Slack](https://postgres-slack.herokuapp.com/)**.
- **[CNCF Slack](https://communityinviter.com/apps/cloud-native/cncf)** — Kubernetes, observability, tudo cloud-native.

### Newsletters (sinal alto, ruído baixo)
- **[Bytes (Tyler McGinnis)](https://bytes.dev/)** — JavaScript ecosystem, descontraído mas útil.
- **[JavaScript Weekly](https://javascriptweekly.com/)**.
- **[Node Weekly](https://nodeweekly.com/)**.
- **[Postgres Weekly](https://postgresweekly.com/)**.
- **[KubeWeekly](https://www.cncf.io/kubeweekly/)**.
- **[The Pragmatic Engineer](https://newsletter.pragmaticengineer.com/)** — Gergely Orosz, melhor newsletter de engineering management hoje.
- **[High Growth Engineer](https://www.highgrowthengineer.com/)** — Jordan Cutler, focado em senior+ career.
- **[Bytebytego](https://blog.bytebytego.com/)** — system design.

### Forums Especializados
- **[Software Engineering Stack Exchange](https://softwareengineering.stackexchange.com/)** — perguntas de design, não bugs.
- **[Database Administrators Stack Exchange](https://dba.stackexchange.com/)** — Postgres, MySQL queries de elite.
- **[Cross Validated (stats.stackexchange.com)](https://stats.stackexchange.com/)** — quando ML/stats.

---

## 5. Specs e RFCs (autoridade absoluta)

Quando blogs e tutoriais discordam, você vai pra spec.

- **[ECMAScript (TC39)](https://tc39.es/ecma262/)** — spec do JavaScript.
- **[TC39 Proposals](https://github.com/tc39/proposals)** — o futuro do JS.
- **[WHATWG HTML Standard](https://html.spec.whatwg.org/)**.
- **[WHATWG DOM Standard](https://dom.spec.whatwg.org/)**.
- **[CSS specs (W3C)](https://www.w3.org/TR/)**.
- **RFCs essenciais** ([rfc-editor.org](https://www.rfc-editor.org/)):
  - **RFC 9110** — HTTP semantics
  - **RFC 9112** — HTTP/1.1
  - **RFC 9113** — HTTP/2
  - **RFC 9114** — HTTP/3
  - **RFC 8446** — TLS 1.3
  - **RFC 6455** — WebSocket
  - **RFC 7519** — JWT
  - **RFC 6749** — OAuth 2.0
  - **RFC 791** — IP
  - **RFC 793** — TCP
  - **RFC 1034/1035** — DNS
- **[POSIX](https://pubs.opengroup.org/onlinepubs/9699919799/)** — Unix specification.
- **[CNCF specs](https://github.com/cncf/specifications)** — OpenTelemetry, etc.

---

## 6. Como usar tudo isso

**Não tente ler tudo.** Foque em:

1. **Por módulo:** as referências citadas no próprio módulo (seção "Referências de Elite").
2. **Por estágio:** 1 livro principal + 1 talk + 1 repo escolhido pra ler.
3. **Continuamente:** 2 newsletters + 1 blog escolhido + 1 comunidade.

Curadoria > consumo massivo. Profundidade > volume.

---

## 7. Princípios de filtro

Quando avaliar uma fonte (livro, blog, talk):

- **Quem escreveu?** Tem track record? Construiu algo relevante?
- **A fonte primária está citada?** (Spec, paper, código?)
- **Tem afirmações testáveis ou só afirmações genéricas?**
- **Tem contraexemplos?** Bom material discute quando o conceito *não* se aplica.
- **Tem código rodando?** Conceitos sem implementação são suspeitos.

Se um material falha em 3 ou mais desses critérios, pule. Tem coisa demais boa pra perder tempo com mediocre.
