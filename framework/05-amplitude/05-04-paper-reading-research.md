---
module: 05-04
title: Paper Reading & Research Protocol, How to Consume CS Papers Productively
stage: amplitude
prereqs: [senior-complete]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 05-04, Paper Reading & Research Protocol

## 1. Problema de Engenharia

Senior técnico aparente ainda lê só blog posts e docs. Staff/Principal lê **papers**: não raramente, mas como hábito. Paper é onde idea vive antes de virar lib. GFS (2003) → HDFS → 04-03-compatible. Dynamo (2007) → Cassandra → DynamoDB. Raft (2014) → etcd, Consul, ScyllaDB. PageRank (1998) → Google. Attention is All You Need (2017) → todos LLMs hoje.

Quem lê paper hoje vê o que vai virar produto em 5-10 anos. Quem não lê fica catching-up. E vai além de tendência: papers ensinam **rigor**: como definir problema, como medir, como argumentar. Engineering communication melhora ao internalizar shape de paper.

Mas papers são denso. 90% das pessoas que tentam ler giant lista de papers desistem em semanas. Sem método, paper reading é overwhelming. **Protocolo** (Q&A, three-pass, paper-of-the-week, peer discussion, application) transforma sustainable.

Este módulo é o **protocolo** de paper reading, não conteúdo de paper individual. Como escolher, como ler, como anotar, como aplicar, como discutir, como manter habit. Mais output: lista curada + journal de leitura + 1 paper implementado.

---

## 2. Teoria Hard

### 2.1 Por que ler papers em vez de blogs

Blog: filtrado, simplificado, autor com bias.
Paper: original, detalhado, peer-reviewed (em conferences boas).

Blog é ótimo pra catching up. Paper é ótimo pra **first-principles understanding** e antecipação.

Trade-off: paper denso, exige tempo. Blog rápido, perde nuance. Equilíbrio: blog pra abrangência, paper pra depth em tópicos críticos.

### 2.2 Top venues em CS

- **OSDI** / **SOSP**: systems (OS, DBs, distributed).
- **NSDI**: networking + systems.
- **SIGMOD** / **VLDB** / **ICDE**: databases.
- **PLDI** / **OOPSLA** / **POPL**: programming languages.
- **NeurIPS** / **ICML** / **ICLR**: ML.
- **CHI** / **UIST**: HCI.
- **CCS** / **USENIX Security** / **S&P** / **NDSS**: security.
- **HotOS** / **HotCloud**: position papers (curtos, opinion).

`papers.we-love` curates. ACM Digital Library, USENIX, arxiv.org gratuitos.

### 2.3 Three-pass approach (Keshav)

Pass 1 (5-10 min): título, abstract, intro, conclusion, headings, refs. Decisão: prosseguir?

Pass 2 (1 hr): leia com cuidado, ignore proofs/details. Note figures.

Pass 3 (4+ hrs): re-implement na cabeça, identify assumptions, locate flaws. Write summary.

Para 90% de papers, pass 1-2 basta. Pass 3 reservado pros core papers do seu eixo.

### 2.4 Q&A note format

Tome notas como Q&A:
- Q: Qual problema?
- Q: Por que era hard?
- Q: Solução em uma frase?
- Q: Insight chave?
- Q: Como medem?
- Q: Limitações?
- Q: Trabalhos relacionados que cita?
- Q: Como isso conecta com X que eu sei?

Escreva nas próprias palavras. Reformulação força entendimento.

### 2.5 Paper-of-the-week protocol

Sustainable habit:
- 1 paper por semana.
- Mesma window (sábado manhã, ex.).
- 1-2 horas dedicadas.
- 200-500 palavras de notas.
- Discussion com peer (Slack thread, paper club).

Após 1 ano: 50 papers. Mais que 95% dos engineers no mundo.

### 2.6 Paper club

Group de 3-8 pessoas, lê mesmo paper, encontra weekly/biweekly por 1h. Discute.

Vantagens:
- Accountability.
- Diversas perspectivas.
- Discussão amplifica retenção.

Boa list pra começar: "Papers We Love" GitHub readme tem foundational lists.

### 2.7 Reading list curada

Não tente ler tudo. Liste papers organizados por tema:
- Database internals.
- Distributed systems.
- ML/LLMs (se relevante).
- Programming languages.
- HCI (frontend-aligned).

5-10 por categoria. Re-priorize anualmente.

`elite-references.md` no framework já tem lista. Adicione papers faltando. 05-04 expande isso.

### 2.7.1 Must-read papers ordenados por estágio

Lista curada pra começar com sequência sane. Cada paper aqui é referenciado em pelo menos 2 módulos do framework e tem leitura ainda relevante em 2026. **Pass 1-2 obrigatório**, pass 3 nos que mais te interessam.

**Pra ler antes de Senior** (durante Plataforma/Professional, 1 paper/semana):

1. **"On the Criteria To Be Used in Decomposing Systems into Modules"**: Parnas, 1972. ~10 páginas. Information hiding, módulos como decisões de design. Base de DDD.
2. **"End-to-End Arguments in System Design"**: Saltzer, Reed, Clark, 1984. ~10 páginas. Onde colocar lógica numa stack.
3. **"What Every Programmer Should Know About Memory"**: Drepper, 2007. Long, denso. Pass 1-2 ~3h. Lê pra 02-09/03-10/01-14.
4. **"Time, Clocks, and the Ordering of Events"**: Lamport, 1978. Causalidade. Base de tudo distribuído.
5. **"The Google File System"** (GFS), Ghemawat et al, 2003. Architecture pattern que viraram HDFS, 04-03 compat layers.

**Pra ler durante Senior** (paper/semana, 6 meses):

6. **"MapReduce: Simplified Data Processing on Large Clusters"**: Dean, Ghemawat, 2004.
7. **"Bigtable: A Distributed Storage System for Structured Data"**: Chang et al, 2006.
8. **"Dynamo: Amazon's Highly Available Key-Value Store"**: DeCandia et al, 2007. Eventual consistency em produção.
9. **"The Chubby Lock Service for Loosely-Coupled Distributed Systems"**: Burrows, 2006. Coordination.
10. **"In Search of an Understandable Consensus Algorithm"** (Raft), Ongaro, Ousterhout, 2014. Pass 3 obrigatório. Implemente.
11. **"Spanner: Google's Globally-Distributed Database"**: Corbett et al, 2012. TrueTime, external consistency.
12. **"FLP Impossibility"**: Fischer, Lynch, Paterson, 1985. Por que consensus puro async é impossível.
13. **"Paxos Made Simple"**: Lamport, 2001. (Original "The Part-Time Parliament" é pra masochistas.)
14. **"The Tail at Scale"**: Dean, Barroso, 2013. ~5 páginas. Latency tail em escala.
15. **"Architecture of a Database System"**: Hellerstein, Stonebraker, Hamilton, 2007. ~140 páginas (livro técnico). Como DB funciona por dentro.
16. **"C-Store / Vertica" / "MonetDB"**: papers fundamentais de columnar store. Base de ClickHouse, BigQuery.
17. **"Calvin: Fast Distributed Transactions for Partitioned Database Systems"**: Thomson et al, 2012. Determinism em distribuído.
18. **"Conflict-free Replicated Data Types"**: Shapiro et al, 2011. Base do que Linear/Figma usam.
19. **"Calm Theorem and CALM theorem reconsidered"**: Hellerstein, 2010. Coordination-free programs.
20. **"How Complex Systems Fail"**: Cook, 1998. ~7 páginas. Pra todo on-call. Filosofia operacional.

**Pra ler durante Staff** (paper/2 semanas, ongoing):

21. **"Byzantine Generals Problem"**: Lamport, Shostak, Pease, 1982. Trust model em distribuído.
22. **"Out of the Tar Pit"**: Moseley, Marks, 2006. Complexidade essencial vs acidental. Filosofia.
23. **"Network Latency Is Not Free"** + **"Latency Numbers Every Programmer Should Know"** (Dean), sub-paper, mas referência diária.
24. **"Use of Formal Methods at Amazon Web Services"**: Newcombe et al, 2014. TLA+ em produção.
25. **"Tagless Final Encoding"**: Carette, Kiselyov, Shan, 2007. Para devs em FP avançado.

**Pra Data/ML track:**

26. **"Attention Is All You Need"**: Vaswani et al, 2017. Transformer paper.
27. **"GPT-3 / Language Models are Few-Shot Learners"**: Brown et al, 2020.
28. **"Retrieval-Augmented Generation for Knowledge-Intensive NLP"**: Lewis et al, 2020. Base de RAG.
29. **"FlashAttention"**: Dao et al, 2022. Otimização kernel-level que viabilizou contextos longos.
30. **"Hidden Technical Debt in Machine Learning Systems"**: Sculley et al, 2015. Sistemas, não modelos.

**Foundations (ler em algum momento):**

31. **"Reflections on Trusting Trust"**: Thompson, 1984. Turing lecture. Supply chain trust.
32. **"No Silver Bullet"**: Brooks, 1986. Software engineering como disciplina.
33. **"The Bitter Lesson"**: Sutton, 2019. Não é paper formal, ensaio. Sobre AI scaling.
34. **"Worse is Better"**: Gabriel, 1991. Filosofia de design.
35. **"Goto Considered Harmful"**: Dijkstra, 1968. Curto, marca era pre-structured.

**Como usar a lista:**
- Marque um paper/semana em `journal.md`. Faça 3-pass (§2.3) com Q&A (§2.4).
- Após 1 ano, ~50 papers lidos, entra em ~5% top dev em tooling de pensamento.
- Discussão com peer (paper club) acelera 3x. Sozinho funciona, junto é melhor.
- Re-leia papers core a cada 2-3 anos. Você vai entender mais cada vez.

### 2.8 Implementing papers

10x deepening: implement paper. Não tudo, peça central.

Exemplos:
- **Raft**: implementar leader election + log replication mínimo.
- **HyperLogLog**: cardinality estimation.
- **CRDT**: counter, set, sequence.
- **Bloom filter**: básico + counting + scalable.
- **Page rank**: simulate iterative computation.

Não é toy de produção; é exercise. Confirma entendimento com código rodando.

### 2.9 Citation chains

Paper bom referencia 30-100 papers anteriores. Cite chain:
- Paper Y referencia X (predecessor).
- Y referencia Z (related, contemporary).
- Y é citado por A, B (successors em scholar.google).

Reading via citation network revela landscape. "Estudo Raft → Paxos clássico → Multi-Paxos → Viewstamped Replication → ...".

### 2.10 Pre-prints e arXiv

ML especially publica em arXiv antes/em vez de venue. arxiv.org/abs/xxx.

Cuidado: pre-prints não peer-reviewed. Some bom, some hype, some errado.

### 2.11 Paper writing também é skill

Eventualmente, Staff/Principal pode **escrever paper** (industry papers em OSDI, SIGMOD, USENIX ATC). Não é caminho comum mas viável.

Forma: industrial paper conta sistema real, evidence é production data, peer-reviewed differently.

Examples: Spanner (Google), Borg (Google), Kafka (LinkedIn), Cassandra (Facebook).

Engineering blog post detalhado é proxy mais barato. Stripe, Cloudflare, Netflix engineering posts são quasi-papers.

### 2.12 Anti-patterns

- **Reading queue de 200 papers**: nunca ataca. Limite a 10 priorizados.
- **Pass 3 em tudo**: queima. Maioria pass 1-2.
- **Solo isolado**: paper club acelera 5x.
- **Sem aplicação**: read-only, esquece. Implement ou citar em design.
- **Trendy chasing**: novo > clássico. Foundations frequently mais válidos que latest.

### 2.13 Foundational papers que não deve faltar

(Curados; alguns também em `elite-references.md`)

Distributed:
- "Time, Clocks, and the Ordering of Events", Lamport (1978).
- "The Byzantine Generals Problem", Lamport, Shostak, Pease (1982).
- "Impossibility of Distributed Consensus with One Faulty Process" (FLP), Fischer, Lynch, Paterson (1985).
- "Paxos Made Simple", Lamport (2001).
- "In Search of an Understandable Consensus Algorithm" (Raft), Ongaro, Ousterhout (2014).
- "Dynamo: Amazon's Highly Available Key-value Store" (2007).
- "Bigtable: A Distributed Storage System for Structured Data" (2006).
- "MapReduce: Simplified Data Processing on Large Clusters" (2004).
- "The Google File System" (2003).
- "Spanner: Google's Globally Distributed Database" (2012).

Networking:
- "End-to-End Arguments in System Design", Saltzer, Reed, Clark (1984).
- "The Tail at Scale", Dean, Barroso (2013).

Databases:
- "Architecture of a Database System", Hellerstein, Stonebraker, Hamilton (2007).
- "C-Store: A Column-oriented DBMS" (2005).

ML/Search:
- "The Anatomy of a Large-Scale Hypertextual Web Search Engine", Brin, Page (1998, PageRank).
- "Attention Is All You Need", Vaswani et al. (2017).

Pick 5 to start. After Senior Stage you can attack.

### 2.14 Habit metrics

Track:
- Papers read this year.
- Papers implemented.
- Papers discussed em paper club.
- Papers cited em ADRs you wrote.

Not vanity: ensure consistency.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Aplicar three-pass de Keshav.
- Estruturar Q&A note (mínimo 7 perguntas).
- Listar 5 venues top em CS systems.
- Justificar paper-of-the-week sustainable.
- Definir reading list por tema.
- Distinguir paper, blog, pre-print.
- Construir citation chain a partir de 1 paper raiz.
- Argumentar valor de implementing paper.
- Listar 5 papers foundational em distributed systems.

---

## 4. Desafio de Engenharia

Estabelecer **paper reading habit + 1 paper implementado**.

### Especificação

1. **Reading list** em `READING-LIST.md`:
   - 30 papers organizados por 5+ temas.
   - Prioridade (03-01/03-02/03-03).
   - Origens (venue, ano, link).
2. **Schedule**:
   - 1 paper por semana, slot fixo. Inicial 12 semanas (3 meses).
3. **Notes**:
   - Q&A format por paper, em `papers/<paper-slug>.md`.
   - Conexões com módulos do framework (04-01, 04-02, etc.).
4. **Paper club**:
   - Encontre 2+ peers; grupo de discussão semanal/quinzenal.
   - Notas compartilhadas.
5. **Implementação**:
   - Escolha 1 paper viável e implemente cerne.
   - Repo separado, README explicando paper + design + lições.
   - Recomendados pra implementar: Raft (subset), HyperLogLog, Bloom filter (variants), CRDT counter+set, PageRank.
6. **Blog post** sobre paper implementado.
7. **ADR** em algum projeto (Logística ou capstone) que cita paper como justificativa.

### Restrições

- Reading list curada, não copy-paste de top 100.
- Notes em prose, não bullet point copy do paper.
- Implementação em linguagem de seu eixo (Rust/Go/TS aceitos).

### Threshold

- 12 papers lidos com Q&A notes.
- Paper club ativo ≥ 6 sessões.
- 1 implementação completa + blog.
- 1 ADR citing paper.

### Stretch

- **30 papers em 12 meses** (cadence dobrada).
- **Implementar 2 papers**.
- **Submit talk** sobre paper a meetup ou conf.
- **Co-write industry paper** com colegas (extremo, mas Staff trajectory).
- **Mentor 1 colega** no protocolo (05-06 conexão).

---

## 5. Extensões e Conexões

- Liga com **00-meta/elite-references.md**: existing list to evolve.
- Liga com **00-meta/reading-list.md**.
- Liga com **01-04-01-06** (foundations): early CS foundations.
- Liga com **04-01** (distributed): consensus papers core.
- Liga com **04-02** (messaging): Kafka, log papers.
- Liga com **04-10** (AI/LLM): transformer paper.
- Liga com **04-14** (formal methods): TLA+ writeups.
- Liga com **05-01** (build from scratch): implementation overlap.
- Liga com **05-05** (public output): blogging derives.
- Liga com **05-06** (mentor): paper club is mentor-adjacent.

---

## 6. Referências

- **"How to Read a Paper"**: S. Keshav (3-pass method).
- **"Reading Papers"**: Henrik Kniberg blog post.
- **"Papers We Love"** ([paperswelove.org](https://paperswelove.org/)).
- **"Awesome Distributed Systems Papers"**: GitHub list.
- **arxiv-sanity** (former Karpathy tool).
- **Murat Demirbas's blog**: distributed systems paper reviews.
- **The Morning Paper** (Adrian Colyer).
- **"Software Foundations"**: Pierce et al (foundational textbook).
- **MIT 6.5840 reading list**.
- **Stanford CS244B reading list**.
- **ACM SIGOPS Hall of Fame Awards**: historic systems papers.
