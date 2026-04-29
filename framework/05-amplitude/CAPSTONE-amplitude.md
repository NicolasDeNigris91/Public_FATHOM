---
module: CAPSTONE-amplitude
title: Staff Capstone, Specialization Track + Public Showcase
stage: amplitude
prereqs: [05-01, 05-02, 05-03, 05-04, 05-05, 05-06]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# CAPSTONE, Staff/Principal Specialization Track

## 1. Problema de Engenharia

Senior generalista entrega Logística v3 distribuído. Staff/Principal **escolhe um eixo de profundidade** e produz output que demonstra mastery suficiente pra título Staff em empresa séria. Não é mais um capstone uniforme, é o ponto onde a trajetória se ramifica.

Você já fez:
- 05-01: 2 toys de baixo nível (build-from-scratch).
- 05-02: 3 capstones de domínios distintos.
- 05-03: proposta org + estudo de caso.
- 05-04: paper habit + 1 paper implementado.
- 05-05: stream público com 6+ posts + talk.
- 05-06: 3 mentees acompanhados.
- 05-07 opcional: tracker IoT.

Esse capstone pega tudo isso e cristaliza num **showcase de specialization** + **promo case** público. Output não é projeto novo; é **integração + posicionamento** do que você já fez.

Tracks recomendados:
- **A. Distributed Systems Engineer**: deep em consensus, replication, multi-region. Owner de toy DB (05-01) + Raft (05-04 implementado) + paper writing.
- **B. Platform / Infra Engineer**: K8s, observability, DevEx. Toy scheduler (05-01) + plataforma interna (Logística v2 platform team angle) + multi-cluster.
- **C. Frontend / DX Architect**: React deep, build tools, framework design. Toy compiler/runtime (05-01) + DX library (04-15).
- **D. Data / ML Engineer**: pipelines, feature stores, RAG/LLM. 05-02 RAG capstone + 04-13 streaming + model serving.
- **E. Security Engineer**: AppSec, crypto, threat modeling. 01-12 base + 03-08 + 04-11 web3 + secure design reviews.
- **F. Founding / Product Engineer**: range generalist + business sense. 04-16 unit economics + 05-03 org + 05-05 public output.
- **G. AI Infrastructure Engineer**: GPU clusters, inference servers, training pipelines, evals, vector DBs em prod. 04-10 + 05-02 + custom infra.

Pick 1. O capstone produz portfolio e promo case alinhados.

---

## 2. Teoria Hard

### 2.1 Specialization vs generalist

Staff pode ser super-deep specialist (Distributed Systems Engineer @ Stripe) ou super-generalist (Tech Lead spanning N domains). Ambos válidos.

Specialist: invest 70% no eixo, 30% breadth.
Generalist: 50/50 ou even 30/70 depth/breadth.

Empresas grandes (Google, Meta, Stripe) têm slot pra ambos. Startups + scale-ups privilegiam generalists em IC.

Não-decisão default = generalist. Active choice = specialist.

### 2.2 Promo case: anatomia

Promo case (brag doc) é doc 5-10 páginas + supporting artifacts:
- Scope crescente cobrindo 12-18 meses.
- Impact em $$ / users / engineering velocity.
- Influence: docs, talks, mentees grown.
- External validation: blog reach, OSS stars, conf talks.
- Case studies de problemas resolvidos.

Sponsor (manager senior) defende em comitê.

### 2.3 External validation

Internal promo + external visibility = strong signal. Patterns:
- Blog post conhecido em area.
- Talk em conf reconhecida.
- OSS lib usado por empresas third-party.
- Mentee promoted publicly.
- Cited in industry write-up.

Não pra ego, pra validate scope além de empregador atual.

### 2.4 Job market posicionamento

Staff offer numbers em Brasil 2026: $150-300k+ TC (USD/year-equiv) tier 1; menores em mid-market. Comp depende de:
- Location (remote SF wage compression).
- Equity vs cash mix.
- Stage of company.
- Specialization scarcity.

Don't optimize comp short-term. Optimize career mobility.

### 2.5 Track A, Distributed Systems Engineer

Output:
- Toy DB completo + toy queue (05-01).
- Raft implementation (05-04 paper).
- TLA+ specs em produção (04-14).
- Paper read + 1 implemented + 1 blog post deep.
- Logística v3 production-grade distributed.
- Talk em meetup/conf sobre algum aspecto.
- Lib OSS (idempotency-kit ou similar).

Companies que valorizam: Stripe, Cockroach, Confluent, AWS, Google Cloud, Cloudflare, Anthropic.

### 2.6 Track B, Platform / Infra Engineer

Output:
- Toy scheduler / load balancer (05-01).
- Platform team proposal (05-03) implementada na Logística (or thought experiment).
- Multi-cluster K8s setup com IaC.
- Internal DevEx improvements measured (deploy time, failed deploy rate).
- Observability stack rolled out.
- Talk sobre platform building.
- Lib OSS pra DevEx.

Companies: Vercel, Railway, Fly.io, GitHub, GitLab, AWS, Heroku-style platforms.

### 2.7 Track C, Frontend / DX Architect

Output:
- Toy compiler/runtime (05-01 + 01-13).
- Framework lib (similar ao TanStack scope).
- Build tool optimization caso real.
- React/Next deep contribution OSS.
- DX-focused blog series.
- Talk em React/Next/Astro/Svelte conf.

Companies: Vercel, Netlify, Linear, Figma, Notion, Stripe.

### 2.8 Track D, Data / ML Engineer

Output:
- 05-02 RAG capstone production-quality.
- ST13 pipeline streaming + batch.
- Feature store / vector DB lib.
- Model serving infra (low-latency).
- Eval framework + dataset curated.
- Blog series sobre MLOps.
- Talk em MLOps/data conf.

Companies: Databricks, Pinecone, OpenAI, Anthropic, Hugging Face, Weights & Biases.

### 2.9 Track E, Security Engineer

Output:
- Threat models documentados (Logística + capstones).
- Pentest report Logística com remediations.
- 01-12 cripto deep dive blog.
- Web3 contract audit (04-11 capstone).
- Bug bounty findings (Hackerone profile).
- Talk em OWASP / DefCon-adjacent.

Companies: Cloudflare, Trail of Bits, Doyensec, Latacora, Anthropic.

### 2.10 Track F, Founding / Product Engineer

Output:
- Logística como side product testado com 5+ users reais.
- Unit economics simulator + dashboards (04-16).
- Org proposal com customer-discovery framing.
- Public output focused on bridging engineering + product.
- Talk em founder-engineering oriented event.
- Possibly small product launched (Plasmic-style).

### 2.11 Track G, AI Infrastructure Engineer

Categoria que explodiu em 2024-2026. Diferente de "ML engineer" tradicional (treinar modelos) ou "AI app dev" (consume API): **infraestrutura que serve modelos em escala**: GPU clusters, inference servers, training pipelines, vector DBs em prod, evals em CI.

Output:
- **Inference cluster próprio** (toy ou real): vLLM ou TGI servindo modelo open-weight (Llama 3, Mistral) com batch dynamic, KV cache. Mede tokens/sec, p99 latency, GPU utilization.
- **Training pipeline pequeno**: fine-tune LoRA num modelo base sobre dataset curado. Track via Weights & Biases ou MLflow. Documenta loss curves, eval metrics, decisions.
- **Vector DB em produção**: pgvector ou Qdrant servindo RAG real (continuação do 05-02). Embedding strategy documentada, recall metrics, cost/QPS analysis.
- **Eval framework**: golden dataset + LLM-as-judge + A/B em produção. Report comparando 3+ modelos em metric específico do seu domínio.
- **GPU cost optimization case study**: análise de spot vs on-demand, batch vs streaming, caching de KV, quantization (INT8/FP8). Antes vs depois com números.
- **Observability LLM**: tracing de prompts, token usage tracking, cost-per-customer, drift detection.
- **Blog series MLOps**: 4-6 posts sobre challenges reais. "Why we moved from OpenAI to self-hosted Llama" tipo de artigo.
- **Talk em Ray Summit, MLOps Community, AI Engineer Summit**.

Stack típico:
- **Serving**: vLLM, TGI (HuggingFace), TensorRT-LLM, Triton.
- **Training**: PyTorch, JAX, Lightning. Distributed: DeepSpeed, FSDP.
- **Vector DB**: pgvector, Qdrant, Pinecone, Weaviate, Milvus.
- **Orchestration**: Ray, Kubeflow, Argo Workflows.
- **Monitoring**: Langfuse, Helicone, Phoenix, Arize.
- **Hardware**: NVIDIA H100/H200, AMD MI300, Google TPU v5. Cloud: AWS p5/p6, GCP 02-03, Lambda Labs, RunPod, Modal.

Companies: OpenAI, Anthropic, Mistral, Together, Replicate, Modal, Hugging Face, Databricks, NVIDIA, Cohere, AI startups Series A-C.

**Quando faz sentido escolher Track G:**
- Você tem genuíno interesse em GPU programming, distributed training, ou modelo internals.
- Mercado tá pagando muito (TC tier-1 em AI Infra > Distributed Systems generic em 2026).
- Você acompanhou 04-10 de perto e quer ir mais fundo do que só consumir APIs.

**Trade-offs honestos:**
- Stack mexe rápido. Investimento em vLLM 2024 vale 70% em 2026. Re-investment continuous.
- GPU é caro. Side projects sérios = $500-2000/mês em compute. Lambda Labs ou Modal pra burst são alternativas.
- Comunidade ainda fragmentada. Conferences sérias (NeurIPS, ICLR) viraram MLOps/Infra-friendly recente.

Companies: YC startups Series A-B, founding engineer roles, Plasmic, Replit, Linear.

### 2.11 Cross-track core

Independent of track:
- Logística v1/v2/v3 done.
- Build-from-scratch (2 toys).
- Multi-domain capstones (3).
- Public output stream.
- 3+ mentees grown.
- Paper habit established.

Estes são inputs comum; o capstone cristaliza into **portfolio narrative**.

### 2.12 Portfolio assembly

Componentes:
- Personal site (own domain) com about, projects, blog, contact.
- GitHub profile com pinned repos curados.
- LinkedIn alinhado com narrative.
- Talks page (recordings + slides).
- Reading list / now / uses pages opcionais.

Style: professional, specific, evidence-based. Avoid buzzword soup.

### 2.13 Promo case docs

Two outputs:
- **Internal brag doc**: para promo em current role. Confidential, with manager.
- **External narrative**: positioning para next role. Public-friendly version.

Both reference same evidence; different framing.

### 2.14 Defense ritual

Apresente teu specialization track output a:
- 1+ Senior+ peer (technical critique).
- 1+ manager (strategic critique).
- Optional: external mentor or industry friend.

Iterate baseado em feedback.

### 2.15 Calibrate vs market

Look at:
- levels.fyi para ranges.
- Job descriptions Staff em empresas alvo.
- Public tech blogs (Engineering Manager Roadmap, Pragmatic Engineer).
- Conf speaker bios.

Compare seu portfolio. Identify gap. Plan.

### 2.16 Continuação pós-Staff

Capstone fecha framework. Next:
- Operate em Staff role e cresça scope.
- Aspire Principal / Distinguished se shape fit.
- Manager track if appeals.
- Founding engineer if entrepreneurial.
- Sabbatical / open source full-time se financially feasible.

Não há "Stage 6". Trajetórias divergem.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Justificar specialization vs generalist trajectory pra você.
- Listar componentes de promo case.
- Diferenciar 7 tracks listados em §2.5-§2.11.
- Identificar gap pessoal vs Staff target.
- Aplicar calibration via levels.fyi e job descriptions.
- Estruturar portfolio público.
- Planejar defense ritual.
- Esboçar narrative cross-track (own track vs alternatives).

---

## 4. Desafio de Engenharia (e Profissional)

**Especialização declarada + portfolio + promo case**.

### Especificação

1. **Choose track**: doc `TRACK-CHOICE.md` com justificativa baseada em interesse + market + skills.
2. **Capstone showcase**:
   - Para track escolhido (§2.5-§2.10), produza outputs específicos completos.
   - 1 deep technical achievement: implementing ambitious thing (Raft real, framework lib, ML pipeline production, etc.).
3. **Portfolio site**:
   - Próprio domain.
   - About, Projects (com cada output do framework linkado), Blog (de 05-05), Talks, Contact.
   - SEO basics, performance pristine (03-09), accessibility (02-02).
4. **Promo case**:
   - Internal version (private, com manager).
   - External narrative (public-ish; LinkedIn + portfolio).
   - Evidence index: link a artefatos.
5. **Defense ritual**:
   - Apresentar a 2+ peers Senior+ via 1h.
   - Coletar feedback estruturado.
   - Iterate.
6. **External validation**:
   - 1+ talk gravado em conf ou meetup ≥ 50 pessoas.
   - 1+ blog post atingindo > 1k views (proxy de ressonância, não vanity, evidence de público).
   - OSS lib com ≥ 100 stars OU 1+ user empresa documentado.
7. **Reading consolidation**:
   - 25+ papers lidos (05-04 expansão).
   - Reading list curada e publicada.
8. **Cross-track exposure**:
   - 1 doc respeitoso explicando quais tracks você não escolheu e por que (mostra clarity, não dismissal).

### Restrições

- Não vendetta-document. Promo case factual.
- External narrative respeita NDA / employer.
- Specialization profunda mas não ignora outras (Staff é T-shape).
- Sem fake metrics.

### Threshold

- Track declarado.
- Showcase completo.
- Portfolio site live.
- Promo case escrito.
- Defense ritual realizado com feedback documentado.
- 1 talk + 1 broad-reach blog + 1 OSS milestone.

### Stretch

- **Job mobility test**: aplicar a 3 Staff roles em empresas alvo. Mesmo sem mover, signal calibrate.
- **Industry contribution**: paper, RFC contribution, spec involvement.
- **Mentor mentor**: tornar mentee de 05-06 que vire Senior ou Staff.
- **Side product launched**: small but live (track F especially).
- **Translate framework** pra outra língua (PT-EN se você for monolingual ainda; help others).

---

## 5. Extensões e Conexões

- Liga com **CAPSTONE-fundamentos/apprentice/professional/senior**: tudo é fundação.
- Liga com **05-01-05-07**: outputs cristalizam aqui.
- Liga com **MENTOR.md** §8: princípios não-negociáveis aplicam até Staff.

Final do framework. Não há próximo módulo.

---

## 6. Referências

- **"Staff Engineer"**: Tanya Reilly. Definitivo.
- **"The Staff Engineer's Path"**: Tanya Reilly (livro de mesmo nome).
- **"An Elegant Puzzle"**: Will Larson.
- **"Become an Effective Software Engineering Manager"**: Drozdzal.
- **levels.fyi** + **Pragmatic Engineer** newsletter (Gergely Orosz).
- **Engineering Ladders public**: Rent the Runway, CircleCI, GitLab, Spotify.
- **"Slack" book**: Tom DeMarco. Career mindset.
- **Lara Hogan's "Resilient Management"**.
- **LeadDev conferences** ([leaddev.com](https://leaddev.com/)).
- **Senior Engineer / Staff Engineer / Principal Engineer talks**.
- **"How to Become a Top Engineer"**: Lara Hogan, Camille Fournier essays.
- **Engineering blogs of empresas alvo**: practice reading their narrative.
