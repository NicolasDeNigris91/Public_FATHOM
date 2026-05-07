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

1. **Reading queue de 200 papers**: nunca ataca. Limite a 10 priorizados.
2. **Pass 3 em tudo**: queima. Maioria pass 1-2.
3. **Solo isolado**: paper club acelera 5x.
4. **Sem aplicação**: read-only, esquece. Implement ou citar em design.
5. **Trendy chasing**: novo > clássico. Foundations frequently mais válidos que latest.
6. **Abstract + conclusion only**: pular methodology e evaluation → replica claims sem entender assumptions, dataset, hardware ou metric escolhida. Abstract vende; methodology é onde mora a verdade.
7. **Citar pre-print não-peer-reviewed em decisão de produção sem caveats**: arXiv paper de 2 semanas com benchmark cherry-picked vira justificativa de migration. Espere replication independente ou marque explicitamente "pre-print, unverified" no ADR.
8. **Paper reading sem reproducer no codebase**: notas em markdown decaem em 2 semanas; entendimento sem código rodando é ilusão. Implemente o cerne (Bloom filter, Raft leader election, HLL counter) — 50 LOC bastam pra fixar.
9. **Acumular "paper backlog" indefinidamente**: 80 papers no Zotero "pra ler depois" é sinal de over-aspirational schedule, não diligence. Drop a fila, mantenha 5 ativos, archive o resto.
10. **Confiar em paper de 1990s pra workload 2026 sem verificar assumptions**: hardware (HDD vs NVMe, single-core vs 128-core, 16GB vs 1TB RAM), scale (mil registros vs bilhões), dataset (synthetic vs real). B-tree analysis de 1979 ainda vale; cache-oblivious claims de 2003 podem não bater em CPU moderno.

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

### 2.15 Reading list essencial 2021-2026 — LLM era + systems modernos + classics

**1. Why this matters.** Paper backlog do estágio 05 deveria refletir ondas 2021-2026 (LLM revolution, post-Attention era, modern systems papers). Lista anterior parou em ~2020 (Attention 2017, GPT-3 2020). Em 2026, ML/systems está dominado por arquiteturas pós-Attention, MoE, state space models, LLM serving infra, e reasoning agents. Reading list que ignora essas ondas produz Staff/Principal desatualizado: incapaz de discutir trade-offs MoE vs dense, vLLM vs TGI, Mamba vs Transformer, DPO vs PPO. Catching-up via blog post é débito conceitual — paper ensina rigor, blog filtra.

**2. LLM era foundation papers (must-read 2026).**

- "LLaMA: Open and Efficient Foundation Language Models" — Touvron et al, Meta, Fev 2023, arXiv 2302.13971. Open foundation; ignited open-source LLM wave.
- "Llama 2: Open Foundation and Fine-Tuned Chat Models" — Touvron et al, Meta, Jul 2023, arXiv 2307.09288. RLHF + safety + commercial license.
- "Mistral 7B" — Jiang et al, Mistral AI, Set 2023, arXiv 2310.06825. SWA (Sliding Window Attention), GQA, outperformed Llama 2 13B.
- "Mixtral of Experts" — Jiang et al, Mistral AI, Jan 2024, arXiv 2401.04088. Sparse MoE 8x7B; first open-source SOTA MoE.
- "Mamba: Linear-Time Sequence Modeling with Selective State Spaces" — Gu & Dao, Dez 2023, arXiv 2312.00752. State space model; alternative a Transformer pra long sequences.
- "RWKV: Reinventing RNNs for the Transformer Era" — Peng et al, Mai 2023, arXiv 2305.13048. RNN with parallelizable training.
- "Direct Preference Optimization: Your Language Model is Secretly a Reward Model" — Rafailov et al, Mai 2023, arXiv 2305.18290. Substituto ao RLHF complexo; SFT + preference data.
- "Scalable Diffusion Models with Transformers (DiT)" — Peebles & Xie, Dez 2022 (NeurIPS 2023), arXiv 2212.09748. Backbone de Sora, Stable Diffusion 3.

**3. Reasoning / agentic papers 2022-2024.**

- "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models" — Wei et al, Jan 2022, arXiv 2201.11903. CoT primer.
- "ReAct: Synergizing Reasoning and Acting in Language Models" — Yao et al, Out 2022, arXiv 2210.03629. Tool use foundation.
- "Reflexion: Language Agents with Verbal Reinforcement Learning" — Shinn et al, Mar 2023, arXiv 2303.11366.
- "Self-Refine: Iterative Refinement with Self-Feedback" — Madaan et al, Mar 2023, arXiv 2303.17651.
- "Tree of Thoughts: Deliberate Problem Solving with Large Language Models" — Yao et al, Mai 2023, arXiv 2305.10601.

**4. Multimodal foundation 2022-2025.**

- "GPT-4 Technical Report" — OpenAI, Mar 2023, arXiv 2303.08774. Multimodal closed model paper.
- "Flamingo: a Visual Language Model for Few-Shot Learning" — Alayrac et al, DeepMind, Abr 2022, arXiv 2204.14198. Vision-language fusion.
- "LLaVA: Visual Instruction Tuning" — Liu et al, Abr 2023, arXiv 2304.08485. Open-source multimodal.

**5. Systems papers 2021-2025 (databases, distributed, ML infra).**

- "FoundationDB Record Layer" — Apple, ICDE 2021. Distributed transactional engine.
- "Anna: A KVS for Any Scale" — Wu et al, ICDE 2018, com continuação relevante 2024+ em FaaS workloads.
- "Snowflake Hybrid Tables" — Snowflake whitepaper 2024. OLTP + OLAP blur.
- "Ray: A Distributed Framework for Emerging AI Applications" — Moritz et al, OSDI 2018; Anyscale Ray 2.x (2024) é stack default ML workloads.
- "Efficient Memory Management for Large Language Model Serving with PagedAttention (vLLM)" — Kwon et al, SOSP 2023, arXiv 2309.06180. KV-cache memory mgmt.
- "FlashAttention-2: Faster Attention with Better Parallelism and Work Partitioning" — Dao, Jul 2023, arXiv 2307.08691. Memory-efficient attention.
- "FlashAttention-3: Fast and Accurate Attention with Asynchrony and Low-Precision" — Shah et al, Jul 2024, arXiv 2407.08608. Hopper GPU specific.

**6. CS classics (timeless — read em paralelo).**

- "Time, Clocks, and the Ordering of Events in a Distributed System" — Lamport, CACM 1978.
- "The Bayou Architecture: Support for Data Sharing among Mobile Users" — Demers et al, IEEE 1995. CRDT precursor.
- "Dynamo: Amazon's Highly Available Key-Value Store" — DeCandia et al, SOSP 2007.
- "MapReduce: Simplified Data Processing on Large Clusters" — Dean & Ghemawat, OSDI 2004.
- "The Google File System" — Ghemawat et al, SOSP 2003.
- "Spanner: Google's Globally Distributed Database" — Corbett et al, OSDI 2012.

**7. Reading cadence 2026.** 1 paper / semana sustained. Mix recomendado: 2 LLM/ML : 1 systems : 1 classic (rotação de 4 semanas). Use templates de §2.x deste módulo (Q&A notes per paper, three-pass, reproducer no codebase). Track em `PROGRESS.md` ou meta-diretório `papers/` com 1 markdown per paper.

**8. Sources 2026.**

- arXiv (cs.AI, cs.LG, cs.DC, cs.DB, cs.OS) — pre-prints, mas validar peer-review status.
- Semantic Scholar — citation tree, influence graph.
- Papers With Code — reproducibility, código + benchmark.
- Daily Papers HuggingFace — ML curated, daily digest.
- The Morning Paper (Adrian Colyer) — ainda updates esporádicos, summaries de qualidade.

**9. AI-assisted paper reading 2026.**

- Claude / GPT-4 pra summarize abstract + identify gaps.
- NotebookLM (Google) pra Q&A sobre PDFs upload.
- Elicit pra sumarizar literature reviews.
- Caveat: AI hallucina detalhes — sempre validate citations, datasets, numbers contra paper original.

**10. Anti-patterns (10).**

1. Ler só LLM papers, ignorar systems classics — débito conceitual em data structures, scheduling, consistency.
2. Hype-chasing (cada nova arch reading) — ignora que MoE ideas vêm dos 1990s (Jacobs et al, "Adaptive Mixtures of Local Experts", 1991).
3. arXiv abstract-only sem ler methodology — faz claims públicos não-fundamentados.
4. Pre-print não-peer-reviewed citado em decisão prod sem caveats.
5. Backlog de 50+ papers acumulado — sinal de over-aspirational schedule, não diligence.
6. AI summary sem validate — hallucinations em datasets / numbers / citations.
7. Reproducer ausente no codebase — retention decay 80% em 2 semanas.
8. Daily Papers HF como single source — viés selection (ML-heavy, anglophone).
9. Confiar em paper "old" (1990s) pra workload 2026 sem checar assumptions (hardware, scale).
10. Não anotar Q (perguntas geradas) durante leitura — perde 70% do learning value.

**Logística applied.** Time backend lê vLLM paper antes de implementar batch inference pra dispatch AI assistant. Papers de FlashAttention-2/3 pra justificar GPU choice (A100 vs H100). Mistral / Mixtral papers pra avaliar self-hosted vs API trade-off. Ray papers antes de adotar Ray Serve em produção. Reading-list compartilhado em `framework/00-meta/reading-list.md`, com PR per paper adicionado (peer review do filtering).

**Cruza com:** `04-10` (LLM tooling, papers usados como justificativa stack), `05-01` (build-from-scratch — implementa toy versions de papers lidos), `05-02` (capstones — papers como starting point pra projeto), `04-13` (streaming/batch processing — Ray, Flink papers), **05-01 §2.16** (toy GPT/vector DB/Wasm — implementa toy de papers lidos), **05-02 §2.11** (Capstones modernos — papers como starting point).

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
