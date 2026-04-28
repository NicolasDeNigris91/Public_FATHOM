# INTERVIEW-PREP — Mapping Módulos → Entrevistas Pleno/Senior/Staff

> Cada empresa tier-1 (Stripe, Google, Meta, Anthropic, Cloudflare, Netflix, Airbnb, Datadog, Snowflake, Databricks) testa subset de tópicos consistentes. Este doc mapeia módulos do framework → áreas de entrevista, com perguntas-amostra reais e nível esperado.
>
> **Não substitui prática.** Substitui **calibration**: você sabe o que estudar mais antes de aplicar a role X.

Antes de aplicar:

1. Identifique role-target (Backend, Frontend, Platform, Distributed, Founding, ML).
2. Liste 5-10 empresas-alvo.
3. Para cada, busque "[empresa] interview process [year]" e "leetcode/[empresa] tag".
4. Cruze com seções abaixo. Identifique gaps.
5. **Faça mock interviews** com peer ou platform (Pramp, interviewing.io). Não substitua.

---

## Loop típico em empresa tier-1

Round 1-5 dependendo da empresa. Comum:

1. **Recruiter screen** (30 min): cultural, alinhamento.
2. **Technical phone screen** (45-60 min): coding 1-2 problemas média complexidade.
3. **Onsite / virtual onsite** (4-6 rounds, 45-60 min cada):
   - **Coding** (1-3 rounds): algoritmos, data structures.
   - **System design** (1-2 rounds): design distributed system.
   - **Domain deep** (varia): backend, frontend, ML, etc.
   - **Behavioral / experience** (1 round): histórias, decisões passadas.
   - **Bar raiser** (Amazon-style): senior outside-team avalia consistência.
4. **Hiring committee** (sem você): decisão.
5. **Offer + negotiation**.

Staff/Principal: pesos shifts pra **system design + experience + influence** vs coding.

---

## Por área de entrevista

### Coding (algoritmos + data structures)

**Módulos relevantes**:
- N04 Data Structures, N05 Algorithms, N15 Math (combinatorics, probability), N11 Concurrency.

**Tópicos cobrados**:
- Arrays, strings, hashing.
- Linked lists, stacks, queues.
- Trees (binary, BST, balanced, n-ary).
- Graphs (BFS, DFS, Dijkstra, topological sort).
- Heaps, priority queues.
- Hash maps, hash sets.
- Tries.
- Dynamic programming (memoization, tabulation).
- Greedy.
- Two pointers, sliding window.
- Backtracking.
- Bit manipulation.
- Concurrency primitives (rare em coding round, comum em system design).

**Nível esperado**:
- **Pleno**: easy + medium LeetCode em ≤ 30 min cada.
- **Senior**: medium + hard. Consideração de complexity, edge cases, code quality, comunicação.
- **Staff**: similar Senior, mas mais peso em design clarity e trade-offs.

**Prática**:
- LeetCode tag por empresa (premium ou via lists).
- NeetCode 150 / Blind 75.
- Cracking the Coding Interview (clássico).
- Sessões cronometradas em Pramp.

**Preparation timeline**:
- 2-3 meses dedicados se rusty.
- 4 horas/semana mínimo.
- Sub-30 min em medium é threshold confidence.

### System design

**Módulos relevantes**:
- A07 Node internals, A08 backend frameworks, A09 Postgres, A11 Redis, A14 real-time.
- P02 Docker, P03 K8s, P05 AWS, P07 observability, P10 backend perf.
- S01 distributed theory, S02 messaging, S03 event-driven, S04 resilience, S05 API design, S07 architectures, S08 services, S09 scaling.

**Formato típico**:
- 45-60 min, prompt vago: "Design Twitter timeline" / "Design Uber surge pricing" / "Design Dropbox file sync" / "Design Stripe webhook retry".
- Você dirige: clarify requirements → high-level architecture → componentes → data model → APIs → scale → trade-offs → bottlenecks.

**Nível esperado**:
- **Pleno**: design ok pra single-region monolith, conhece patterns básicos.
- **Senior**: design distribuído, justifica CAP/PACELC, identifica gargalos, proporção certa de detail vs high-level.
- **Staff**: navega ambiguidade requisitos, antecipa modos de falha, discute custos operacionais reais ($, on-call, vendor), decide trade-offs com confidence.

**Frameworks de prática**:
- "System Design Interview" (Alex Xu, vol 1 + 2).
- "Designing Data-Intensive Applications" (Kleppmann) — base teórica.
- ByteByteGo blog/newsletter.
- Pramp / Hello Interview / Exponent.

**Common prompts**:
- URL shortener, news feed, chat (WhatsApp), video streaming (YouTube), search (Google), ride-hailing (Uber), e-commerce (Amazon), web crawler, distributed cache (Redis), distributed queue (Kafka), notification system, rate limiter, distributed counter, leader election, autocomplete, payment processor.

**Preparation timeline**:
- 1-2 meses se você tem base de Senior (S01-S09).
- 4-6 meses se você é Pleno tentando o salto.

### Behavioral / experience

**Módulos relevantes**:
- S12 tech leadership, S15 OSS, ST03 org architecture, ST05 public output, ST06 mentorship.
- P15 incident response (postmortem stories).
- P16 estimation (planning stories).
- S16 product/business (decisions com impact).

**Formato**: STAR (Situation, Task, Action, Result). 5-15 stories preparadas cobrindo:
- **Conflict resolution**.
- **Difficult decision**.
- **Mentorship / feedback dado**.
- **Failure / learning**.
- **Influence sem authority**.
- **Cross-team collaboration**.
- **Technical decision under uncertainty**.
- **Disagreement com manager / senior**.
- **Crunch / urgency**.
- **Data-driven decision**.

Empresas tipo Amazon usam **Leadership Principles** (16). Cada round pergunta 2-3.

**Nível esperado**:
- **Pleno**: histórias claras, mostra growth.
- **Senior**: scope team, ownership, dealing com complexity.
- **Staff**: cross-team, organizational impact, strategic thinking, mentoria, ambiguity navigation.

**Brag doc** (S12, ST06) é fonte primária. Mantenha live.

### Domain deep — Backend

**Módulos relevantes**: A07-A14, A18, P01, P10, P13.

**Possíveis perguntas**:
- "Como você modelaria sistema de payments com idempotency?"
- "Explique MVCC. Quando Repeatable Read não basta?"
- "Diferença entre Kafka e RabbitMQ. Quando cada?"
- "Como debug N+1 query em produção?"
- "Como fazer migração de schema sem downtime?"

### Domain deep — Frontend

**Módulos relevantes**: A01-A06, A19, P09, P14, P17.

**Possíveis perguntas**:
- "Como otimizar Largest Contentful Paint?"
- "Diferenças entre RSC e Server Actions."
- "Implemente useDebounce do zero."
- "Como gerenciar state global em app SPA grande?"
- "Bundle 2MB ficou lento. Como diagnosticar?"

### Domain deep — Distributed Systems

**Módulos relevantes**: S01-S04, S09, S13, S14.

**Possíveis perguntas**:
- "Diferença entre Paxos e Raft."
- "O que é split-brain? Como evitar?"
- "Como implementaria distributed lock corretamente?"
- "Outbox pattern: qual problema resolve?"
- "Como TLA+ ajudaria em design de [X]?"

### Domain deep — Security

**Módulos relevantes**: N12, A13, P08, S11, P18.

**Possíveis perguntas**:
- "Diferencie symmetric e asymmetric encryption. Quando hybrid?"
- "Por que JWT alg:none é vulnerabilidade?"
- "OAuth2 vs OIDC. PKCE quando obrigatório?"
- "Como detectar XSS automaticamente?"
- "Threat model de Logística: identifique top 5 threats."

### Domain deep — Data / ML

**Módulos relevantes**: N15, A09, A15, P13, S10, S13, ST09.

**Possíveis perguntas**:
- "Diseñe RAG pipeline. Trade-offs em chunking?"
- "Embedding model choice: closed vs open. Critérios?"
- "Como handle drift em ML em produção?"
- "Streaming aggregation com windows e watermarks."

### Domain deep — Platform / Infra

**Módulos relevantes**: P02-P07, P11, P15, S04, S08, ST07-ST08.

**Possíveis perguntas**:
- "Build internal platform pra deploys. Componentes? Trade-offs?"
- "K8s scheduler pluggable: como adicionar custom logic?"
- "Multi-region failover: design + RTO/RPO targets."
- "Redução de custo cloud: top 5 levers."

### Domain deep — AI/ML em produção

**Módulos relevantes**: S10, P13, S13, N15.

**Possíveis perguntas**:
- "Como serve model com SLA p99 < 100ms?"
- "Vector DB choice: pgvector vs Pinecone vs Qdrant. Quando?"
- "Cost de tokens em LLM em escala: como otimizar?"
- "Eval framework pra LLM app: como construir?"

---

## Mapping empresas → áreas de stress

(Generalização; varia ano-a-ano e role.)

| Empresa | Coding | System Design | Domain | Behavioral |
|---|---|---|---|---|
| **Google** | Heavy (medium-hard) | Heavy | Médio | Médio |
| **Meta / Facebook** | Heavy | Heavy | Médio | Strong |
| **Amazon** | Médio | Médio | Light | **Heavy LP** |
| **Stripe** | Médio | Heavy | Heavy backend / payments | Strong |
| **Anthropic / OpenAI** | Médio | Médio | Heavy ML/systems | Médio |
| **Cloudflare** | Médio | Heavy | Heavy (Go, networking, edge) | Médio |
| **Netflix** | Light | Heavy | Heavy domain | Strong |
| **Airbnb** | Médio | Heavy | Médio | Strong |
| **Datadog** | Médio | Médio | Heavy observability | Médio |
| **Databricks / Snowflake** | Médio | Heavy | Heavy data | Médio |
| **Roblox / Game studios** | Médio | Médio | Heavy game dev (ST10) | Médio |
| **Riot** | Médio | Heavy | Heavy game + netcode | Strong |
| **Hospitais / pharma / biotech** | Light | Médio | Heavy science (ST09) | Strong |
| **Fintech (Nubank, Mercado Pago, BTG)** | Médio | Heavy | Heavy fintech (A18) | Médio |
| **YC startups Founding Engineer** | Light | Médio | Variável | **Heavy product/product sense** |

---

## Negotiation

Recebeu offer? Comp não é fixo:

- **Sempre negocie**, mesmo se já está acima de target. -10% se silent + 10-25% if negotiate é range típica.
- Coleta competing offers se possível (mesmo se você não vai aceitar — leverage).
- **levels.fyi** + **rora.com** + **Compendium List** pra calibrar.
- Componentes negociáveis: base, equity (RSU/stock), sign-on bonus, performance bonus, vacation, start date, relocation.
- Comp em equity: entenda vesting schedule, cliff, refresher.
- Recruiter NÃO é seu amigo — representam empresa. Be professional, be firm.

Refs:
- "Salary Negotiation: Make More Money, Be More Valued" — Patrick McKenzie (kalzumeus).
- "Ten Rules for Negotiating a Job Offer" — Haseeb Qureshi.

---

## Mock interviews

Não substitua prática real:

- **Pramp** (free, peer-to-peer).
- **Interviewing.io** (paid, ex-Big-N interviewers).
- **Exponent** (paid).
- **Hello Interview** (paid, focused system design).
- **Meetapro / Igotanoffer** (mid).

Mock 5-10 vezes antes de real. Feedback signal qualidade.

---

## Reject / failure handling

Maioria de candidatos rejeitam algumas vezes antes de offer.

- **Cooldown**: empresas grandes têm 6-12 meses entre attempts.
- **Feedback é raramente honesto** (legal). Aceite generic "cultural fit" — frequently encrypta "your interview perf was below bar".
- **Iterate**: identifica gaps, study, retry.
- **Não personalize**. Probabilidade de rejection mesmo de candidatos strong é alta.

---

## Ferramentas e calendário

- **Spreadsheet de aplicações**: empresa, role, stage, contact, dates, comp.
- **Notes por empresa**: stack, cultura, glassdoor leaks.
- **Brag doc atualizado**.
- **Mock cadence**: 1-2/semana ramp-up; intensify pré-onsite.
- **Sleep, exercise, food** durante search. Não cansaço cumulativo.

---

## Resumo: roadmap pra preparar

1. **Brag doc atualizado** (S12, ST06).
2. **Calibration via SELF-ASSESSMENT.md** + análise gaps.
3. **6-12 meses estudando módulos chave** (cf áreas acima).
4. **2-3 meses LeetCode + System Design intensive**.
5. **Mock interviews** semanais.
6. **Aplicar em wave**: 5-10 empresas alvo, mesmo período (cluster offers se possível).
7. **Negotiate** quando offer chega.
8. **Reflect** pós-process: o que funcionou, o que não.

Boa sorte. Framework não te garante hire. Mas te coloca no top 5-10% de candidatos preparados.
