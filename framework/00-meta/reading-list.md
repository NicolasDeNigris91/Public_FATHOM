# Reading List — Livros Canônicos

> Esta é a estante da maestria. Cada livro foi escolhido por **autoridade técnica** e **densidade**, não por popularidade. Você não precisa ler todos do começo ao fim — use os módulos como mapa: cada módulo cita o(s) capítulo(s) específico(s) destes livros.

---

## Estágio 1 — Fundamentos (Fundamentos & CS)

### Computer Science Fundamentals
- **Computer Systems: A Programmer's Perspective** (Bryant & O'Hallaron, 3rd ed) — "CS:APP". A bíblia de como o computador realmente funciona. Capítulos 1-9 são essenciais (representation, machine code, processor architecture, memory hierarchy).
- **Operating Systems: Three Easy Pieces** (Remzi Arpaci-Dusseau) — "OS:TEP". Free online em [pages.cs.wisc.edu/~remzi/OSTEP](https://pages.cs.wisc.edu/~remzi/OSTEP/). Único livro de OS que é genuinamente legível. Foco em virtualization, concurrency, persistence.
- **Computer Networking: A Top-Down Approach** (Kurose & Ross, 8th ed) — top-down do HTTP até o cabo. O melhor pra programadores entenderem rede.

### Algorithms & Data Structures
- **Introduction to Algorithms** (CLRS, 4th ed) — denso, formal, completo. Use como referência, não leitura sequencial.
- **Algorithms** (Sedgewick & Wayne, 4th ed) — alternativa mais didática que CLRS. Acompanha curso gratuito em [Coursera Princeton Algorithms](https://www.coursera.org/learn/algorithms-part1).
- **The Algorithm Design Manual** (Skiena, 3rd ed) — pragmático, com "war stories" de como algoritmos são usados na prática.

### Programming Paradigms
- **Structure and Interpretation of Computer Programs** (Abelson & Sussman) — "SICP". Free em [mitpress.mit.edu/sites/default/files/sicp](https://web.mit.edu/6.001/6.037/sicp.pdf). O livro que ensina o que é programação — abstração, recursão, linguagens, interpretadores. Se você só ler 1 livro de CS na vida, leia este.
- **Crafting Interpreters** (Robert Nystrom) — free em [craftinginterpreters.com](https://craftinginterpreters.com/). Você implementa 2 interpreters do zero. Ensina paradigmas, parsing, runtime.

### JavaScript & TypeScript
- **You Don't Know JS Yet** (Kyle Simpson, 2nd ed) — free em [github.com/getify/You-Dont-Know-JS](https://github.com/getify/You-Dont-Know-JS). 6 volumes, leia 1, 2, 4 obrigatoriamente.
- **JavaScript: The Definitive Guide** (David Flanagan, 7th ed) — manual de referência completo.
- **Programming TypeScript** (Boris Cherny) — sistema de tipos profundo.
- **Effective TypeScript** (Dan Vanderkam) — 62 idioms específicos. Leitura curta, alta densidade.

### Git
- **Pro Git** (Scott Chacon) — free em [git-scm.com/book](https://git-scm.com/book). Capítulo 10 ("Git Internals") é o que importa pra maestria.

### Unix
- **The Linux Command Line** (William Shotts) — free em [linuxcommand.org](https://linuxcommand.org/tlcl.php). Comprehensive, didático.
- **The Art of Unix Programming** (Eric Raymond) — free em [catb.org/esr/writings/taoup](http://www.catb.org/esr/writings/taoup/). Filosofia Unix, padrões.
- **Advanced Programming in the UNIX Environment** (Stevens & Rago) — "APUE". Bíblia da programação Unix em C. Use como referência pra entender syscalls.

### Concurrency Theory (01-11)
- **The Art of Multiprocessor Programming** (Herlihy & Shavit). Bíblia.
- **Is Parallel Programming Hard, And, If So, What Can You Do About It?** (Paul McKenney) — gratuito.
- **C++ Concurrency in Action** (Anthony Williams) — apesar do título, principles aplicam universalmente.

### Cryptography Fundamentals (01-12)
- **Cryptography Engineering** (Ferguson, Schneier, Kohno) — referência prática.
- **Serious Cryptography** (Jean-Philippe Aumasson) — moderno, denso.
- **A Graduate Course in Applied Cryptography** (Boneh, Shoup) — gratuito, profundo.
- **Real-World Cryptography** (David Wong) — sem dor.

### Compilers & Interpreters (01-13)
- **Crafting Interpreters** (Robert Nystrom) — gratuito em [craftinginterpreters.com](https://craftinginterpreters.com/). Leitura primária.
- **Engineering a Compiler** (Cooper & Torczon).
- **Compilers: Principles, Techniques, and Tools** (Aho et al, "Dragon Book").

### CPU Microarchitecture (01-14)
- **Computer Architecture: A Quantitative Approach** (Hennessy & Patterson). Bíblia.
- **What Every Programmer Should Know About Memory** (Ulrich Drepper).
- **Systems Performance** (Brendan Gregg, 2nd ed) — também aplicável em 03-10/03-15.
- **Agner Fog's optimization manuals** — gratuitos.

### Math Foundations (01-15)
- **Mathematics for Machine Learning** (Deisenroth, Faisal, Ong) — gratuito.
- **Concrete Mathematics** (Graham, Knuth, Patashnik).
- **Introduction to Probability** (Blitzstein, Hwang).
- **Information Theory, Inference, and Learning Algorithms** (David MacKay) — gratuito.
- **Convex Optimization** (Boyd, Vandenberghe) — gratuito.
- **3Blue1Brown YouTube** — Essence of Linear Algebra / Calculus.

---

## Estágio 2 — Plataforma (Aplicações)

### Frontend Fundamentals
- **HTML & CSS: Design and Build Websites** (Jon Duckett) — visual, didático, base sólida.
- **CSS in Depth** (Keith J. Grant, 2nd ed) — quando você precisa entender cascade/specificity de verdade.
- **Inclusive Design Patterns** (Heydon Pickering) — acessibilidade prática, padrões reusáveis.

### React & Next.js
- **(Sem livro canônico — a doc oficial é o material)**
- **Docs oficiais React 19**: [react.dev/learn](https://react.dev/learn) — leia inteiro.
- **Docs oficiais Next.js 15**: [nextjs.org/docs](https://nextjs.org/docs) — leia App Router e Caching com cuidado.
- **Build Your Own X — React Mini Edition**: implemente seu mini-React (há vários repos open-source no GitHub).
- **React Native Documentation**: [reactnative.dev](https://reactnative.dev/docs/getting-started) — leia New Architecture (Fabric, TurboModules, JSI).

### Node.js
- **Node.js Design Patterns** (Mario Casciaro & Luciano Mammino, 3rd ed) — padrões idiomáticos, streams, async patterns. Indispensável.
- **Node.js docs (oficial)**: [nodejs.org/api](https://nodejs.org/api/) — leia "Stream", "Buffer", "Worker Threads", "Cluster".
- **libuv design overview**: [docs.libuv.org/en/v1.x/design.html](http://docs.libuv.org/en/v1.x/design.html).

### Postgres
- **PostgreSQL: Up and Running** (Regina Obe & Leo Hsu) — pragmático.
- **The Art of PostgreSQL** (Dimitri Fontaine) — pensa em SQL, não em ORM. Excelente.
- **Use The Index, Luke!** (Markus Winand) — free em [use-the-index-luke.com](https://use-the-index-luke.com/). Foco em índices e EXPLAIN. **Leitura obrigatória.**
- **PostgreSQL Internals**: [postgrespro.com/community/books/internals](https://postgrespro.com/community/books/internals) — free, estrutura interna do storage e MVCC.

### Redis
- **Redis in Action** (Josiah Carlson) — datado mas ainda excelente pra padrões.
- **Redis docs (oficial)**: [redis.io/docs](https://redis.io/docs/) — leia "Data Types" inteiro, "Persistence", "Replication".

### MongoDB
- **MongoDB: The Definitive Guide** (Bradshaw, Brazil, Chodorow, 3rd ed).
- **Docs oficiais**: [mongodb.com/docs](https://www.mongodb.com/docs/) — leia "Aggregation Framework" com cuidado.

### Auth
- **OAuth 2 in Action** (Justin Richer & Antonio Sanso) — explica os flows com código.
- **RFC 6749** (OAuth 2.0) e **RFC 7519** (JWT) — leia os RFCs originais.
- **OWASP Cheat Sheet — Authentication**: [cheatsheetseries.owasp.org](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).

### Real-time
- **High Performance Browser Networking** (Ilya Grigorik) — free em [hpbn.co](https://hpbn.co/). Capítulos sobre WebSocket, WebRTC, HTTP/2 são canônicos.

### Search & Information Retrieval (02-15)
- **Introduction to Information Retrieval** (Manning, Raghavan, Schütze) — gratuito, bíblia.
- **Relevant Search** (Doug Turnbull, John Berryman).
- **Deep Learning for Search** (Tommaso Teofili).

### Graph Databases (02-16)
- **Graph Databases (2nd ed)** (Robinson, Webber, Eifrem) — O'Reilly, gratuito.
- **Graph Algorithms** (Mark Needham, Amy Hodler).
- **Networks, Crowds, and Markets** (Easley, Kleinberg) — teoria de redes.

### Native Mobile (02-17)
- **Hacking with Swift** (Paul Hudson).
- **Functional Swift** (objc.io).
- **Effective Kotlin** (Marcin Moskała).
- **Kotlin Coroutines: Deep Dive** (Marcin Moskała).
- Apple WWDC sessions e Google I/O sessions anuais.

### Payments & Billing (02-18)
- **Stripe API docs** + Stripe engineering blog.
- **Patterns for Distributed Transactions Without 2PC** (Caitie McCaffrey).
- **Designing Money** (Stripe Press essays).

### Internationalization & Localization (02-19)
- **Unicode Standard** ([unicode.org](https://unicode.org/)).
- **ICU User Guide** ([unicode-org.github.io/icu](https://unicode-org.github.io/icu/)).
- **Falsehoods Programmers Believe About Names / Time / Addresses** — series.
- **Patrick McKenzie's "Bits about Money"** — currency edge cases.

---

## Estágio 3 — Produção (Ecossistema, Operações)

### Testing
- **Test-Driven Development by Example** (Kent Beck) — original. Curto, denso.
- **Growing Object-Oriented Software, Guided by Tests** (Freeman & Pryce) — "GOOS". TDD avançado, com mocks usados corretamente.
- **Working Effectively with Legacy Code** (Michael Feathers) — quando o código já existe.
- **Property-Based Testing with PropEr, Erlang, and Elixir** (Fred Hebert) — adapte o conceito pra fast-check em TS.

### Docker & Kubernetes
- **Docker Deep Dive** (Nigel Poulton) — atualizado anualmente.
- **Kubernetes: Up and Running** (Kelsey Hightower et al, 3rd ed).
- **Kubernetes The Hard Way** (Kelsey Hightower) — [github.com/kelseyhightower/kubernetes-the-hard-way](https://github.com/kelseyhightower/kubernetes-the-hard-way). Setup manual de K8s. **Faça uma vez na vida** pra entender o que cada componente faz.
- **Programming Kubernetes** (Hausenblas & Schimanski) — operators, controllers, internals.

### CI/CD
- **Continuous Delivery** (Humble & Farley) — original, ainda canônico.
- **Accelerate** (Forsgren, Humble, Kim) — DORA metrics, baseado em research.

### AWS
- **AWS Documentation** (oficial). Não há livro melhor.
- **AWS Well-Architected Framework**: [aws.amazon.com/architecture/well-architected](https://aws.amazon.com/architecture/well-architected/).
- **The Good Parts of AWS** (Daniel Vassallo) — qual subset usar e por quê.

### Observability
- **Distributed Systems Observability** (Cindy Sridharan) — free em [thenewstack.io/ebooks/distributed-systems-observability](https://www.oreilly.com/library/view/distributed-systems-observability/9781492033431/). Curto, denso.
- **Site Reliability Engineering** (Beyer et al, Google) — free em [sre.google/sre-book](https://sre.google/sre-book/table-of-contents/). 4 sinais dourados, error budgets, SLO/SLI.
- **The Practice of Cloud System Administration** (Limoncelli) — "Volume 2". Operações em escala.

### Security
- **The Web Application Hacker's Handbook** (Stuttard & Pinto, 2nd ed) — bíblia de pentest web.
- **OWASP Top 10**: [owasp.org/www-project-top-ten](https://owasp.org/www-project-top-ten/) — leia inteiro, com exemplos.
- **Real-World Cryptography** (David Wong) — moderno, sem dor.
- **Cryptography Engineering** (Ferguson, Schneier, Kohno) — sólido, mais formal.

### Performance
- **High Performance Browser Networking** (Ilya Grigorik) — também aplicável aqui.
- **Systems Performance** (Brendan Gregg, 2nd ed) — referência absoluta de performance Linux/Node. **Crítico.**
- **BPF Performance Tools** (Brendan Gregg) — eBPF é o futuro de profiling.

### Go & Rust
- **The Go Programming Language** (Donovan & Kernighan).
- **Rust for Rustaceans** (Jon Gjengset) — depois do Rust Book oficial.
- **The Rust Programming Language**: free em [doc.rust-lang.org/book](https://doc.rust-lang.org/book/).

### WebAssembly
- **WebAssembly: The Definitive Guide** (Brian Sletten).
- **rustwasm book**: free em [rustwasm.github.io/docs/book](https://rustwasm.github.io/docs/book/).

### Time-Series & Analytical DBs (03-13)
- **Database Internals** (Alex Petrov) — também aplicável em 04-09.
- **The Data Warehouse Toolkit** (Ralph Kimball) — star schema bíblia.
- **Building a Data Warehouse** (William Inmon) — clássico.
- **Apache Iceberg: The Definitive Guide** (Tomer Shiran et al).
- ClickHouse / TimescaleDB / DuckDB docs — referência primária.

### Graphics, Audio & Codecs (03-14)
- **Real-Time Rendering (4th ed)** (Akenine-Möller et al).
- **The Book of Shaders** (Patricio Gonzalez Vivo).
- **High Performance Browser Networking** (Ilya Grigorik) — capítulos real-time.
- **WebGL Fundamentals** ([webglfundamentals.org](https://webglfundamentals.org/)).
- **WebGPU Fundamentals** ([webgpufundamentals.org](https://webgpufundamentals.org/)).

### Incident Response & On-Call (03-15)
- **Site Reliability Engineering** (Beyer et al, Google) — re-leitura focando em incidents.
- **The Site Reliability Workbook** (Beyer et al) — gratuito.
- **Seeking SRE** (David Blank-Edelman).
- **Chaos Engineering** (Casey Rosenthal, Nora Jones).
- **Implementing Service Level Objectives** (Alex Hidalgo).
- **PagerDuty Incident Response docs** ([response.pagerduty.com](https://response.pagerduty.com/)).

### Estimation & Technical Planning (03-16)
- **How Big Things Get Done** (Bent Flyvbjerg, Dan Gardner).
- **Software Estimation: Demystifying the Black Art** (Steve McConnell).
- **Slack: Getting Past Burnout, Busywork, and the Myth of Total Efficiency** (Tom DeMarco).
- **Actionable Agile Metrics** (Daniel Vacanti).
- **Thinking in Bets** (Annie Duke).

### Accessibility Testing (03-17)
- **Inclusive Design Patterns** (Heydon Pickering) — também aplicável em 02-02.
- **Accessibility for Everyone** (Laura Kalbag).
- **WCAG 2.2 spec** ([w3.org/TR/WCAG22](https://www.w3.org/TR/WCAG22/)).
- **ARIA Authoring Practices Guide** ([w3.org/WAI/ARIA/apg](https://www.w3.org/WAI/ARIA/apg/)).

---

## Estágio 4 — Sistemas (Arquitetura Distribuída)

### Distributed Systems (núcleo)
- **Designing Data-Intensive Applications** (Martin Kleppmann) — "DDIA". O livro mais importante desta lista. Leia **integralmente**, anotando. Volte a ele toda vez que tomar uma decisão arquitetural.
- **Database Internals** (Alex Petrov) — internal de DBs distribuídas e single-node. Complementa DDIA.
- **Designing Distributed Systems** (Brendan Burns) — patterns curtos.
- **Distributed Systems** (Maarten van Steen & Andrew Tanenbaum) — free em [distributed-systems.net](https://www.distributed-systems.net/). Acadêmico, sólido.
- **Site Reliability Engineering** (Google) — re-leitura, foco distribuído.

### Messaging
- **Kafka: The Definitive Guide** (Narkhede et al, 2nd ed).
- **Designing Event-Driven Systems** (Ben Stopford) — free em [confluent.io/designing-event-driven-systems](https://www.confluent.io/designing-event-driven-systems/).
- **RabbitMQ in Action** (Videla & Williams).

### Event-Driven & DDD
- **Domain-Driven Design** (Eric Evans) — "Blue Book". Original, denso. Leitura **canônica**.
- **Implementing Domain-Driven Design** (Vaughn Vernon) — "Red Book". Mais prático.
- **Patterns of Enterprise Application Architecture** (Martin Fowler) — referência clássica.
- **Microservices Patterns** (Chris Richardson) — Saga, Outbox, etc com código.
- **Event Sourcing**: leia os artigos do Greg Young — [eventstore.com/blog/what-is-event-sourcing](https://www.eventstore.com/blog/what-is-event-sourcing).

### Architecture & Leadership
- **Clean Architecture** (Robert Martin) — controverso mas relevante.
- **A Philosophy of Software Design** (John Ousterhout) — curto, brilhante. **Releia anualmente.**
- **Software Engineering at Google** (Winters, Manshreck, Wright) — free em [abseil.io/resources/swe-book](https://abseil.io/resources/swe-book). Como times maduros operam.
- **Team Topologies** (Skelton & Pais) — Conway's Law aplicado.
- **The Manager's Path** (Camille Fournier) — quando virar tech lead.
- **Staff Engineer** (Will Larson) — career framework de Senior+.

### Scaling
- **Designing Data-Intensive Applications** — re-leitura, partes 2 e 3 (replication, partitioning, transactions).
- **Web Scalability for Startup Engineers** (Artur Ejsmont) — pragmático.

### AI/LLM
- **Anthropic docs**: [docs.anthropic.com](https://docs.anthropic.com/). Leia "Prompt engineering", "Tool use", "Streaming".
- **OpenAI Cookbook**: [github.com/openai/openai-cookbook](https://github.com/openai/openai-cookbook).
- **Designing Machine Learning Systems** (Chip Huyen) — não é só LLM, mas é crítico pra entender ML systems em produção.
- **Papers**: leia "Attention Is All You Need" (Vaswani et al, 2017), "Retrieval-Augmented Generation" (Lewis et al, 2020).

### Web3
- **Mastering Ethereum** (Andreas Antonopoulos & Gavin Wood) — free em [github.com/ethereumbook/ethereumbook](https://github.com/ethereumbook/ethereumbook).
- **Solidity docs**: [docs.soliditylang.org](https://docs.soliditylang.org/).
- **Smart Contract Vulnerabilities** — [github.com/crytic/not-so-smart-contracts](https://github.com/crytic/not-so-smart-contracts).

### Streaming & Batch Processing (04-13)
- **Streaming Systems** (Akidau, Chernyak, Lax) — bíblia do streaming.
- **Fundamentals of Data Engineering** (Reis, Housley).
- **Stream Processing with Apache Flink** (Hueske, Kalavri).
- **The dbt Book** (Tristan Handy et al).

### Formal Methods (04-14)
- **Specifying Systems** (Leslie Lamport) — bíblia TLA+, gratuito.
- **Practical TLA+** (Hillel Wayne).
- Hillel Wayne's blog ([learntla.com](https://learntla.com/)).
- **Software Foundations** (Pierce et al, gratuito) — Coq tutorial.

### OSS Maintainership (04-15)
- **Producing Open Source Software** (Karl Fogel) — gratuito, bíblia.
- **Working in Public: The Making and Maintenance of Open Source** (Nadia Eghbal).
- **GitHub OSS guides** ([opensource.guide](https://opensource.guide/)).

### Product, Business & Unit Economics (04-16)
- **The SaaS Playbook** (Rob Walling).
- **From Impossible to Inevitable** (Aaron Ross, Jason Lemkin).
- **Lean Analytics** (Alistair Croll, Benjamin Yoskovitz).
- **Platform Revolution** (Parker, Van Alstyne, Choudary) — marketplaces.
- **a16z growth handbook** ([a16z.com/growth-handbook](https://a16z.com/growth-handbook)).

---

## Estágio 5 — Amplitude

### Build-from-Scratch (05-01)
- **Crafting Interpreters** (re-leitura aplicada).
- **Database Internals** (Alex Petrov).
- **Database Design and Implementation** (Edward Sciore) — toy DB tutorial.
- **MIT 6.5840 (Distributed Systems) labs** — Raft, KV server.
- **500 Lines or Less** — collection de small implementations.

### Multi-Domain Capstones (05-02)
- **The Pragmatic Programmer** (Hunt, Thomas).
- **Building LLM Applications for Production** (Chip Huyen).
- **Practical MLOps** (Noah Gift).
- Engineering blogs: Stripe, Notion, Figma, Replit, Vercel.

### Conway's Law & Org Architecture (05-03)
- **Team Topologies** (Skelton, Pais) — bíblia.
- **The Mythical Man-Month** (Brooks).
- **An Elegant Puzzle** (Will Larson).
- **Staff Engineer: Leadership Beyond the Management Track** (Tanya Reilly).
- **Accelerate** (Forsgren, Humble, Kim).
- **Empowered** (Marty Cagan).

### Paper Reading & Research (05-04)
- **How to Read a Paper** (S. Keshav, paper).
- **Papers We Love** ([paperswelove.org](https://paperswelove.org/)).
- **The Morning Paper** (Adrian Colyer archives).

### Public Output (05-05)
- **On Writing Well** (William Zinsser).
- **Show Your Work** (Austin Kleon).
- **Atomic Habits** (James Clear).
- **The Programmer's Guide to Writing Well** (Sjaak Brinkkemper).

### Mentorship at Scale (05-06)
- **Staff Engineer** (Tanya Reilly).
- **Radical Candor** (Kim Scott).
- **The Coaching Habit** (Michael Bungay Stanier).
- **Resilient Management** (Lara Hogan).
- **Time to Think** (Nancy Kline).

### Embedded & IoT (05-07)
- **Making Embedded Systems** (Elecia White).
- **Embedded Software Engineering 101** (Christoph Schmidt-Dwertmann).
- **The Rust Embedded Book** ([rust-embedded.github.io](https://rust-embedded.github.io/)).
- **TinyML** (Pete Warden, Daniel Situnayake).

---

## Papers Que Todo Senior Leu

- **The Google File System** (Ghemawat, Gobioff, Leung, 2003) — fundamento de storage distribuído.
- **MapReduce** (Dean & Ghemawat, 2004) — modelo de computação distribuída.
- **Bigtable** (Chang et al, 2006) — fundamento de NoSQL/wide-column.
- **Dynamo** (DeCandia et al, 2007) — eventual consistency, vector clocks, anti-entropy.
- **The Part-Time Parliament** (Lamport, 1998) — Paxos. Difícil mas canônico.
- **Raft Consensus Algorithm** (Ongaro & Ousterhout, 2014) — alternativa entendível ao Paxos.
- **Time, Clocks, and the Ordering of Events** (Lamport, 1978) — happens-before relation.
- **Harvest, Yield, and Scalable Tolerant Systems** (Fox & Brewer, 1999) — pré-CAP.
- **CAP Twelve Years Later** (Brewer, 2012) — refinamento de CAP.
- **Bitcoin: A Peer-to-Peer Electronic Cash System** (Satoshi Nakamoto, 2008).
- **Attention Is All You Need** (Vaswani et al, 2017) — Transformer.
- **The Anatomy of a Large-Scale Hypertextual Web Search Engine** (Brin & Page, 1998) — PageRank.
- **End-to-End Arguments in System Design** (Saltzer, Reed, Clark, 1984).
- **The Tail at Scale** (Dean & Barroso, 2013).
- **Architecture of a Database System** (Hellerstein, Stonebraker, Hamilton, 2007).
- **C-Store: A Column-oriented DBMS** (2005).
- **Spanner: Google's Globally Distributed Database** (2012).
- **The Byzantine Generals Problem** (Lamport, Shostak, Pease, 1982).
- **FLP — Impossibility of Distributed Consensus with One Faulty Process** (1985).
- **How Amazon Web Services Uses Formal Methods** (Newcombe et al) — pra **04-14**.

Encontre todos em [paperswelove.org](https://paperswelove.org/) ou [arxiv.org](https://arxiv.org/). 05-04 estabelece protocolo de leitura.

---

## Como ler livro técnico denso

1. **Não leia linearmente.** Skim do índice + introdução de cada capítulo primeiro.
2. **Leia 1 capítulo por sessão**, com Active Recall ao final.
3. **Anote em Q&A** (ver `STUDY-PROTOCOL.md`).
4. **Implemente os exemplos** quando houver código.
5. **Volte ao livro toda vez que** o módulo correspondente do framework for tocado.

DDIA, SICP, OS:TEP e CS:APP são os 4 livros que você vai voltar a vida inteira. Compre físico se possível, marque, releia.
