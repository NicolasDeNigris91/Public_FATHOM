---
module: 04-12
title: Tech Leadership, Decisions, Reviews, Mentorship, Roadmap
stage: sistemas
prereqs: [04-07, 04-08]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 04-12, Tech Leadership

## 1. Problema de Engenharia

Engenheiro técnico forte vira tech lead pelo critério "melhor IC do time". Aí descobre: liderança técnica não é "mesma coisa porém com reuniões". É outra função. Decisões com tradeoffs explícitos, comunicação síncrona e assíncrona, mentoring sem virar bottleneck, code review como ensino e não como gatekeeping, navegar política, traduzir entre business e engineering, escolher batalhas, dar feedback técnico sem destruir, fazer post-mortems blameless, escrever ADRs que ainda valem dois anos depois.

Este módulo é leadership técnico aplicado. Não é "soft skills". É **engenharia de pessoas e decisões**, com o mesmo rigor que você aplica em sistema. Pra Logística, é o que separa "um dev sênior" de "alguém capaz de liderar a v3 distribuída e levar time consigo".

---

## 2. Teoria Hard

### 2.1 Carreira: IC vs lead vs manager

- **IC (Individual Contributor)**: técnico em deepening, foco em código + design. Senior IC, Staff, Principal são tracks paralelos a manager.
- **Tech Lead**: IC sênior + responsabilidades de equipe (review, mentoring, decisão técnica, roadmap). Mantém código.
- **Engineering Manager**: foco em pessoas + processo. Menos código.

Em 2026 a maioria de empresas grandes tem dual ladder (IC pode ir até VP-equivalente sem virar manager).

Sendo TL: 60-80% código ainda, 20-40% leadership. Quando vira manager, código vira < 20%.

### 2.2 ADR, Architecture Decision Records

Documento curto (1-2 páginas) registrando decisões arquitetônicas importantes:
```
# ADR 0001: Use Postgres (not Mongo) for primary data
Status: Accepted
Date: 2026-04-28
Context: ...
Decision: ...
Consequences: ...
Alternatives considered: ...
```

Versionado em repo (`docs/adr/`). Imutável após accepted; novas decisões fazem novo ADR.

Vantagens:
- Decisão registrada com contexto.
- Onboarding entende o "por quê" anos depois.
- Reviewable como código.

Use Michael Nygard format ou MADR.

### 2.3 RFC, Request for Comments

Doc mais longo proponente uma mudança significativa. Distribui pra time, recolhe feedback async, decide.

Estrutura típica:
- Goals + non-goals.
- Background.
- Proposal detalhada.
- Alternatives.
- Risks.
- Migration plan.
- Open questions.

Async-first é fundamental. Reuniões pra discutir RFC só após leitura.

### 2.4 Trade-off thinking

Toda decisão técnica é trade-off. Boa liderança expõe trade-offs explicitamente.

Anti-padrão: "X é melhor, period." Sempre há contexto onde Y vence. Liderança técnica argumenta o **contexto** que torna X correto aqui.

Exemplos vivos:
- "Vamos pra microservices" → contexto: time de 30 devs, 5 áreas independentes, scale comprovada. Não pra 5 devs em MVP.
- "Vamos pra Postgres" → contexto: relacional, ACID, time conhece SQL. Não em fluxo onde document nested justifica Mongo.

### 2.5 Code review, purpose

Review faz 4 coisas:
1. **Catch bugs**.
2. **Spread knowledge** (reviewer aprende; author articula).
3. **Maintain consistency** (style, patterns).
4. **Mentor** (feedback nivela time).

Anti-padrão: review como gatekeeping ego. Bons reviews:
- Comentam por que, não só o quê.
- Distinguir blocking vs nit (use prefixos: `nit:`, `consider:`, `must:`).
- Aprovam PRs pequenos rápido.
- Pedem split em PRs gigantes.
- Linkam pra docs, ADRs, examples.
- Reconhecem trade-offs do author.

### 2.6 Postmortem blameless

Após incidente:
- Foco em sistema, não pessoa.
- "Por que isso era possível?" não "quem causou?".
- Action items com owners.
- Lessons learned compartilhadas.

Cultura: postmortems são valiosos só se time confia que não há represália. Erro humano é resultado de sistema permitindo erro.

Etsy, Google publicaram templates. Use.

### 2.7 1:1 com IC

TL/manager faz 1:1 semanal com cada IC:
- Status (rápido).
- Blockers.
- Carreira / dev pessoal.
- Feedback bidirecional.

Tempo deles, não seu. Tenha agenda mas deixe trilhar.

### 2.8 Mentoring

Mentor não resolve problema; ensina a abordar. Padrão:
- Pergunta "o que você tentou?".
- Pergunta "o que aconteceria se X?".
- Sugere area de leitura (livro, doc, código).
- Pareia em sessão pra modelar approach.

Anti-padrão: mentor que dá resposta. Tira learning, vira dependence.

### 2.9 Pairing e mob

- **Pair programming**: 2 devs, 1 keyboard. Bom pra learning e em problemas complexos.
- **Mob programming**: 3+ devs. Útil em decisões importantes ou onboarding cross-team.

Custo: 2x dev time. Retorno: knowledge + quality. Use seletivamente.

### 2.10 Roadmap técnico

Roadmap não é "lista de features", é narrativa de **trajetória** do sistema:
- Próximos 1-3 meses: detalhado.
- 3-6 meses: dirigido.
- 6-12 meses: visão.

Inclui:
- Tech debt iniciativas.
- Migrations (DB version, framework).
- Security investments.
- Capacity planning.

Articule trade-offs: por que X agora e não Y.

### 2.11 Tech debt management

Categorize:
- **Deliberate prudent**: shipped MVP shortcut, conhecido, ticked.
- **Inadvertent**: descoberto em retrospecto.
- **Bit rot**: lib outdated, framework sunsetted.
- **Strategic debt**: pagar agora pra entregar valor; cobrar later.

Tech debt sempre cresce. Política: 15-25% capacity dedicated a debt + tooling. Non-negotiable.

### 2.12 Estimativas

Estimativas são guesses; documente assumptions.

Padrões:
- **T-shirt sizes**: S/M/L/XL.
- **Story points**: relativo, abstrai effort.
- **#NoEstimates**: small batches, no estimate explicit.
- **3-point** (best/likely/worst).

Buffer pra unknowns. Comunicar incerteza honestamente; não compromise data quando system unknown.

Estimativa muito otimista é mentira; muito conservadora vira self-fulfilling lazy. Honestidade.

#### Decisão entre métodos, com base em data

| Método | Acurácia (sem-historic) | Tempo de cerimônia | Quando |
|---|---|---|---|
| **T-shirt** (S/M/L/XL) | ±50% | 2-5min/item | Default pra times novos; bom pra triagem |
| **Story points** (Fibonacci 1/2/3/5/8/13) | ±30% após 5+ sprints calibrados | 5-10min/item planning poker | Times maduros com velocity histórica estável |
| **3-point PERT** (O/M/P, expectativa = (O + 4M + P)/6) | ±20% se você tem dados de variance | 10-15min/item | Roadmaps trimestrais, não daily ops |
| **#NoEstimates** | n/a | 0min | Times Elite (DORA) que entregam < 1d/item; foco em throughput |

**Story points é mais caro, não mais preciso, em times novos.** Pesquisa do CMU (Cohn, McConnell) mostra: até 5+ sprints com mesmo time + mesma stack, story points ≈ random. T-shirt + reflexão honesta vence.

**Erro sistemático**: estimativa de mediana é, em média, 2x baixa. Razão: você lembra do happy path; bugs/discovery são esquecidos até aparecerem. Fix:
1. Estimate raw → multiplique por 1.5-2x antes de comprometer publicamente (Hofstadter's Law calibration).
2. Track **estimate vs actual** por 3-6 meses; calcule fator de correção pessoal.
3. Re-estimate pelo menos no meio do work; recheck assumptions.

#### RICE pra priorização (não estimativa)

RICE = `(Reach × Impact × Confidence) / Effort`. Útil pra **escolher entre features**, não pra estimar uma:

- **Reach**: usuários afetados / período (números reais).
- **Impact**: 0.25 (pouco), 0.5, 1, 2, 3 (massivo). Subjetivo mas calibrado.
- **Confidence**: 50% / 80% / 100%. < 50% indica que precisa research, não build.
- **Effort**: pessoa-semana / pessoa-mês.

Exemplo Logística:
- "Adicionar PIX": Reach 10k lojistas/mês × Impact 2 (conversão paga) × Confidence 80% / Effort 6 pessoa-semanas = **2667**.
- "Refactor de cor do botão": Reach 100k × Impact 0.25 × Confidence 100% / Effort 0.5 = **5000**.
- O número grosso não diz "é 2x melhor"; serve pra **separar ordem de magnitude** entre dezenas de candidatos. Se diferença é < 2x, refeito é noise.

#### Planning poker variantes

- **Async planning poker** (Slack bot ou Linear/Jira plugin): cada um vota privado, reveal simultâneo. Evita ancoragem por sênior falar primeiro.
- **Magic estimation** (silent grouping): cards stickies em parede; equipe ordena por tamanho relativo em silêncio. 5x mais rápido pra triagem de 50+ items.
- **Bucket system**: buckets fixos (S/M/L). Item entra no bucket que se encaixa. Bom pra refinamento contínuo.

#### Comunicação de incerteza

Aprenda a falar com incerteza calibrada:
- "**Confiança alta** (já fizemos similar 3x): 1-2 sprints."
- "**Média** (depende de spike em X): 2-4 sprints, valido em 1 semana."
- "**Baixa** (research-heavy): time-box 2 semanas pra spike, depois reestimo."

Stakeholder não precisa de número; precisa de range + datas de re-decisão.

**Anti-padrão**: estimativa única + fake confidence pra agradar PM. Quando der ruim, perde credibilidade técnica + relação. Honesto e early > otimista e tarde.

Cruza com **03-16** (estimation & technical planning) e **04-16** (unit economics impact da prioritização).

### 2.13 Build vs buy

Decisão recorrente:
- Auth: Auth0/Clerk vs build. (02-13 cobriu).
- Search: Elastic vs Postgres tsvector vs Algolia.
- Monitoring: Datadog vs Grafana stack.
- Email: SendGrid/Postmark vs build.

Critérios:
- Core domain? Build.
- Generic? Buy.
- Cost vs build effort.
- Vendor lock vs ops cost.

Don't NIH (Not Invented Here). Don't outsource core.

### 2.14 Conway's Law e Inverse

System reflete org communication. Pra desenhar arquitetura pretendida, você organiza time pra match.

Em vez de 30 devs em 1 monolithic team trying microservices: dividir em 4 squads com bounded contexts owns por squad.

### 2.15 Feedback técnico

Direct: "este loop é O(n²); pode ser O(n) com hash map. Aqui está exemplo: …"

NÃO: "código não está bom".

Crítica eficaz é:
- Específica.
- Acionável.
- Sobre código/decisão (não pessoa).
- Com alternativa.

Em escrito (PR comments): use templates pra reduzir friction.

### 2.16 Comunicação write-first

Async > sync em decisões não-urgentes. Reuniões reservadas pra:
- Brainstorm.
- Conflito complex.
- Onboard ou kickoff.
- 1:1.

Tudo mais: Slack, Notion, Linear, RFC. Decisões via texto deixam audit trail.

### 2.17 Influência sem autoridade

TL não tem autoridade formal pra "demitir". Influência via:
- Confiança (consistência ao longo do tempo).
- Demonstração técnica (você acerta decisões).
- Empatia.
- Linguagem comum business + tech.

Nunca via "porque eu disse".

### 2.18 Política

Acontece. Padrões sãos:
- Disagree and commit: discuta, decida, execute.
- Não fofoque cross-team.
- Defenda time pra cima; reserve críticas pra dentro do time.
- Skip-level meetings: ocasional 1:1 com chefe do chefe; respeite chain.

### 2.19 Burnout

TL é vector de burnout: cobrança técnica + people overhead + visibilidade.

Sinais:
- Cinismo crescendo.
- Productividade caindo silenciosamente.
- Sleep, exercício comprometidos.

Mitigation:
- Time off real.
- Boundaries (after hours).
- 1:1 com mentor próprio (não só seus mentees).

Sustainability é skill.

### 2.20 Carreira pessoal

Como engenheiro full-stack chegando em senior:
- **Read consistently**: 1 livro/mês, papers ocasionais.
- **Build side projects**: explora antes do trabalho exigir.
- **Write**: blog, internal docs. Forces clarity.
- **Speak**: meetups, internal talks.
- **Network**: comunidade open-source, eventos.
- **Mentor outros**: ensina-você-melhor.

Promotion não é linear. Janelas abrem/fecham. Senior+ é compounding: cada ano de boa decisão constrói capital.

### 2.21 Promotion Senior → Staff, processo concreto

Senior é "delivers complex projects independently"; Staff é "**multiplica** o time / org via decisions, mentoria, technical leadership". Diferença não é tempo, é **escopo de impacto**. Promo case mal-conduzido custa 1-2 anos.

#### Diferença operacional Senior vs Staff (Will Larson, Tanya Reilly)

| Dimensão | Senior | Staff |
|---|---|---|
| **Escopo** | Feature ou serviço | Plataforma, área cross-time, ou tech direction |
| **Decisões** | Implementa decisão tomada | Conduz a decisão (RFC, ADR, alignment) |
| **Tempo investido em código** | 60-80% | 30-60% |
| **Tempo em design / mentoria / influência** | 20-40% | 40-70% |
| **Visibilidade** | Time imediato + manager | Manager → director → VP; cross-time |
| **Failure mode** | Bug em produção | Time inteiro mira direção errada por 6 meses |

#### Artifact requirements (varia por empresa, padrão calibrado)

Promo case Staff defensável tipicamente apresenta:

1. **2-3 projetos cross-time concluídos** com impact mensurável (latência -40%, custo -$200k/mês, retenção +5pp, on-call carga -50%).
2. **3-5 ADRs** que você liderou (não só escreveu) que afetaram outros times.
3. **1 RFC organizacional** (technical strategy doc, design principles, platform vision).
4. **Mentees promoted**: 2-3 ICs que você mentorou viraram Senior ou Staff.
5. **External signal**: blog post lido externamente, conf talk, OSS contribution sustained, ou cross-org influence (paneling, hiring loop).
6. **Postmortem authoria**: lead em 2-3 incidentes SEV1/SEV2 com action items entregues.
7. **Endorsements**: 5-10 colegas (ICs, managers, peers de outros times) escrevem cartas em forms internos.

Empresas tier-1 (Stripe, Google, Anthropic): bar costuma exigir 2 desses 6 itens excepcionais, não 6 mediocre.

#### 30/60/90 day plan tipo (após sinalizar intent ao manager)

**Dia 1-30 — alinhamento e gap analysis:**
- 1:1 com manager: "estou mirando promo Staff em X meses; quais gaps você vê?". Anote literal.
- Leia perfis públicos (LinkedIn, blog) de 3 Staff atuais da empresa. Padrão de impact?
- Self-assessment honesto contra rubric. Onde você está fraco vs claim?
- Identifique **1-2 problemas org-level não-resolvidos** (deploy lento, alert fatigue, tech debt em lib core, perf gap).

**Dia 31-60 — proposta:**
- Escreva 1 RFC propondo solução pra 1 dos problemas identificados. Mesmo se rejeitado, sinaliza thinking org-level.
- Comece **deliberadamente** mentorar 1 Mid-level (visível ao manager).
- Publique 1 internal blog post substantivo.
- 1:1 com 2-3 Staff/Principal pedindo critique honesta do plan.

**Dia 61-90 — execução:**
- Lidere implementação do RFC (se aprovado) ou pivot.
- Documenta tudo em brag doc (com links, métricas, datas).
- 1:1 com manager: "estou no track? Que gaps ainda vê?".
- Acerte timing: comitês de promo têm cycles (típico 6 ou 12 meses). Não submeta fora do ciclo.

#### Defense ritual (apresentação ao comitê)

Tipicamente 30-45 min apresentando + Q&A:

- **5 min**: contexto e claim ("estou requesting Staff. Aqui o que justifica.").
- **15-20 min**: 2-3 case studies cada com 1 slide: problema, decisão, impact métrico, lessons.
- **5 min**: como você opera Staff-style hoje (mentoria, RFCs, cross-team).
- **5-10 min Q&A**: perguntas de stretching ("Como você lida com 2 times priorizando coisas conflitantes?").

**Anti-patterns que matam promo:**
- "Eu fiz X" em todo case study — Staff é sobre **multiplicação**; "eu liderei X com 5 ICs entregando" é correto.
- Métricas vagas ("muito mais rápido"). Use números: "p99 800ms → 120ms via Y".
- Apenas projetos do passado distante. Comitê quer **trend recente** (últimos 6-12 meses).
- Sem cross-team work. Senior promovido a Staff sem influência fora do time é raro.

#### Quando NÃO buscar promo Staff

- Empresa não tem track Staff aberto (greedy ladder até Senior, depois EM).
- Você quer escrever código 80% — Staff em maioria das empresas reduz hands-on. Considere "Senior Sênior" se existe.
- Time/org instável (manager saindo, reorg em curso, layoffs). Adia 6-12 meses.
- Você tem < 2 anos como Senior na empresa. Bar tipicamente exige 2-3 ciclos demonstrando.

#### Promotion ≠ valor pessoal

Calibração emocional: empresa promove pra **resolver problema de capacity org** (precisa Staff naquela área). Você ser bom não basta; tem que ser bom **e** caber na vaga aberta. Negação de promo não é negação de valor; é miss de timing/fit. Persistência sem amargor + colher signal pra próximo ciclo.

Cruza com **04-12 §2.10** (roadmap técnico) e **05-03** (Conway's Law / org architecture). Será expandido no estágio Amplitude com **05-06 §mentorship** (Staff = mentor escalado) e **CAPSTONE-amplitude**.

### 2.22 Architectural Decision Records (ADR) deep — template, lifecycle, anti-patterns

ADR (Architectural Decision Record) é o artefato Staff+ que separa decisão deliberada de "decisão por inércia". Sem ADR, time perde memória de WHY em 6 meses; novo dev pergunta "por que usamos X?", senior responde "não lembro", reverte sem entender. Com ADR: decisão documentada com contexto, alternativas avaliadas, consequências aceitas. Pattern Michael Nygard 2011, refinado MADR 2024.

#### Quando ADR é obrigatório (heurística)

- **Decisão hard-to-reverse**: choice de DB principal, framework de UI, broker de mensagens, cloud provider.
- **Decisão cross-team**: API contract, auth flow, observability stack.
- **Decisão controversial**: time discutiu 2+ vezes, alguém perdeu — capture porque a decisão foi tomada pra evitar relitigation.
- **Decisão que viola pattern existente**: documenta exception com justificativa.
- **NÃO** pra decisões reversíveis low-blast-radius (linter rule, naming convention de variável local, escolha de logger pra script utilitário).

#### MADR template (Markdown ADR, 2024 spec)

```markdown
# ADR-0042: Adoção de Iceberg como table format pro lakehouse

- **Status**: Accepted
- **Date**: 2026-04-15
- **Deciders**: @nicolas, @ana, @bruno
- **Consulted**: @dataeng-team, @platform-eng
- **Informed**: @engineering-all

## Context and Problem Statement

Logística v3 precisa de lakehouse table format pra suportar:
1. Multi-engine read (ClickHouse, DuckDB, Spark) sobre mesma data S3.
2. Schema evolution sem rewrite.
3. Time travel pra debugging e audit.

Hoje pipeline grava Parquet plain em S3 com Hive-style partitioning. Limita: schema change = full rewrite, sem time travel, multi-engine write quebra consistency.

## Decision Drivers

- Multi-engine read mandatory.
- Schema evolution sem downtime.
- Custo storage controlled (compaction necessária).
- Equipe data eng tem 3 ICs; curva de aprendizado matters.
- Vendor lock-in evitar.

## Considered Options

1. Apache Iceberg (Tabular/Snowflake-backed)
2. Delta Lake (Databricks-backed; OSS Linux Foundation desde 2022)
3. Apache Hudi (Uber-origin; OSS Apache)
4. Status quo (Parquet + Hive partitioning)

## Decision Outcome

**Chosen option**: Apache Iceberg, because:
- REST catalog spec emergente (Polaris, Nessie, Lakekeeper) reduz lock-in.
- Multi-engine maturity em 2026: ClickHouse, DuckDB, Trino, Spark, Flink read native.
- Schema evolution e partition evolution sem rewrite.
- Snowflake adoption (open lakehouse 2024) sinaliza tração de longo prazo.

### Positive Consequences

- Pipeline pode ler/escrever em qualquer engine sem migration.
- Time travel via snapshots (queryable até retention).
- Schema/partition evolution online.

### Negative Consequences

- Curva de aprendizado pro time data (semantics + catalog ops).
- Compaction job mandatory (sem ele, small files multiplicam).
- Vacuum dos snapshots antigos requires cron disciplinado.

## Pros and Cons of the Options

### Apache Iceberg

- Open spec (Apache 2.0); REST catalog standard.
- Multi-engine maturidade 2026 alta.
- Snowflake (Polaris) lança open catalog 2024 — ecosystem boost.
- Catalog ops (Polaris/Nessie self-hosted) requer aprendizado.

### Delta Lake

- Databricks ecosystem mature; Spark first-class.
- Time travel + schema evolution.
- Multi-engine ainda Databricks-leaning; Trino/ClickHouse 2026 ok mas 2nd-class.

### Apache Hudi

- Forte em CDC + upsert (uber origin).
- Adoção 2026 menor; community menor; multi-engine 3rd-class.

### Status quo (Parquet + Hive)

- Zero novo aprendizado.
- Schema change requer rewrite full; sem time travel; multi-engine consistency frágil.

## Links

- Apache Iceberg spec: https://iceberg.apache.org/spec/
- Polaris Catalog: https://github.com/apache/polaris
- Snowflake Open Catalog announcement (2024)
- Cruza com [04-13 §2.11](../04-sistemas/04-13-streaming-batch-processing.md), [03-13 §2.15](../03-producao/03-13-time-series-analytical-dbs.md)

## Notes

- Re-evaluate em 2027-Q2 baseado em adoption metrics + ops cost.
- Initial migration scope: 1 mart (fct_daily_revenue) — validate pattern, depois rollout.
```

#### Lifecycle dos status — workflow operacional

```
Proposed → Accepted → [Deprecated | Superseded by ADR-NNNN | Rejected]
                    ↓
                 Active until superseded
```

- **Proposed**: PR open, em discussão. Não-binding.
- **Accepted**: merged em main; decisão em vigor.
- **Rejected**: discutido + rejeitado; mantém o documento pra evitar relitigation.
- **Deprecated**: decisão antiga, contexto mudou; sem substituto definido.
- **Superseded by ADR-NNNN**: substituído por ADR mais recente; link bidirecional.

**Anti-pattern**: deletar ADR rejeitado/superseded. Mantém histórico — alguém em 6 meses vai propor mesma coisa, leitura do ADR rejeitado economiza re-discussão.

#### Repo structure recomendada

```
docs/
├── adr/
│   ├── 0001-record-architecture-decisions.md
│   ├── 0002-use-postgres-as-primary-db.md
│   ├── 0003-adopt-graphql-federation.md
│   ├── ...
│   ├── 0042-adopt-iceberg-table-format.md
│   └── README.md
└── ...
```

- Numbering 4-digit zero-padded (suporta 9999 ADRs).
- Title slug em kebab-case + verb forte (`adopt`, `replace`, `remove`, `defer`).
- README.md lista todos com status (gerado por script).

#### Tooling — automation reduce friction

- **adr-tools** (npm/brew): `adr new "Adopt Iceberg as table format"` cria scaffold + numbering automatic.
- **log4brains** (web UI): renderiza ADRs em site navegável + grafo de relações (superseded chains).
- **CI check**: PR que toca arquivo em path crítico (`db/migrations/`, `infra/terraform/`, `services/auth/`) sem ADR adicional → label `needs-adr`.

#### Padrão de discussão — RFC vs ADR

- **RFC**: documento exploratório com proposta + discussão aberta. Pode resultar em 0, 1 ou N ADRs.
- **ADR**: registro de decisão TOMADA. Emerge do RFC ou de discussão informal.
- Times pequenos (< 5 ICs): pula RFC, vai direto a ADR proposed em PR.
- Times médios+ ou cross-org: RFC primeiro (Notion/HackMD/Google Doc), depois ADR no repo após convergência.

#### Logística — exemplo de track de ADRs em 12 meses

```
ADR-0001: Record architecture decisions             (meta)
ADR-0002: Use Postgres as primary OLTP DB
ADR-0003: Adopt Next.js for web frontend
ADR-0004: Use Expo for mobile (React Native)
ADR-0005: Auth via Hydra OAuth2 server (not Auth0)
ADR-0006: Multi-tenancy via Postgres RLS (not separate DBs)
ADR-0007: Migrate from REST to GraphQL Federation v2  (superseded ADR-0003 partial)
ADR-0008: Adopt Cloudflare Workers for edge auth
...
ADR-0023: Replace bull with BullMQ (deprecated ADR-0010)
ADR-0042: Adopt Iceberg as table format
```

#### Anti-patterns observados

- **ADR pra tudo**: 200 ADRs em 6 meses, ninguém lê. Bar alto: hard-to-reverse, cross-team, controversial.
- **ADR sem alternativas avaliadas**: vira justificativa post-hoc. Decision Drivers + Considered Options seções OBRIGATÓRIAS.
- **ADR escrito DEPOIS da implementação**: perde força crítica; ninguém challenge-a porque já está em prod. Escreva durante decisão, não após.
- **Status nunca atualiza**: ADR-0010 ainda Accepted apesar do código já ter substituído. Lifecycle policy + CI check ajuda.
- **ADR como design doc gigante**: ADR é DECISÃO + contexto necessário pra entender. Design doc completo vai em outro lugar (Notion, RFC); ADR linka pra ele.
- **Sem template enforced**: cada ADR vira formato livre; tooling/parsing impossível.
- **ADR sem reviewer**: aprovação só do autor — perde signal de "outros entendem e aceitam consequências".

#### Métricas de programa de ADR (seniority signal)

- **Throughput**: 10-30 ADRs/ano em time de 20 ICs é saudável; 0 = sem decisões deliberadas; > 100 = bar baixo.
- **Diversity de autores**: > 30% ICs autoraram ADR no último ano = cultura de ownership.
- **Superseded ratio**: 10-20% dos ADRs antigos superseded em 2 anos = tech evoluindo. 0% = stagnation; > 50% = decisões frívolas iniciais.
- **Time-to-decision**: ADR proposed → accepted em < 2 semanas (sem ele, virou doc-only).

Cruza com **04-12 §2.16** (write-first communication; ADR é instância), **04-12 §2.21** (promo Staff requires ADRs lideradas), **04-12 §2.17** (influência sem autoridade — ADR canaliza), **00-meta** (DECISION-LOG.md é variante framework-level).

### 2.23 Engineering Manager vs IC track — Staff+ ladder, archetypes, decision criteria

Senior engineer chega ao crossroads: subir como Engineering Manager (people management) ou como Individual Contributor pós-Senior (technical leadership sem reports). Companies sérias (Big Tech, scaleups bem geridas) tratam ambos como ladders paralelos com **pay parity** — Senior IC = Senior EM em comp; Staff IC = Director EM; Principal IC = Sr Director / VP. "Going to IC is a step down" é misconception de orgs com ladder único. Referências canônicas: Tanya Reilly, *The Staff Engineer's Path* (O'Reilly 2022); Will Larson, *Staff Engineer: Leadership Beyond the Management Track* (2021).

#### Two tracks, distinct skills
- **Engineering Manager (EM) track**: people management primary. 1:1s, performance reviews, hiring loops, career development, project management, stakeholder management. Hands-on coding decai com seniority (M1 part-time, M3+ ~zero).
- **Individual Contributor (IC) track post-Senior**: technical leadership SEM direct reports. Architecture, mentorship via influence (artifacts, não 1:1), cross-team coordination, big-rock technical decisions.
- **Decisão explícita obrigatória**: ambas tracks exigem opt-in; "promoted to manager because Senior 3 years" é anti-pattern clássico.

#### Senior → Staff IC archetypes (Tanya Reilly's 4)
| Archetype | Scope | Hands-on coding | Best fit |
|---|---|---|---|
| **Tech Lead** | Single team / project | Primary (60-80%) | Smaller co; closest to Senior+ |
| **Architect** | Cross-team direction | Reduzido (20-40%) | Larger org; deep system knowledge |
| **Solver** | Ambiguous high-impact problems; rotates | Variable (30-60%) | "Fix the worst fire"; org com many crises |
| **Right Hand** | Alongside CTO/VP; ad-hoc multiplier | Variable | Mature exec needing technical force-multiplier |

Decisão depende de: company size + your strengths + opportunity disponível. Smaller co favorece Tech Lead; FAANG-scale favorece Architect/Solver visibilidade.

#### Staff Engineer responsibilities (cross-archetype)
- **Technical Strategy**: 6-18 month roadmap technical direction; alinha com business roadmap.
- **Big rocks decisions**: pick stack, pattern, methodology pra scope (ex: monorepo vs polyrepo, REST vs gRPC vs GraphQL Federation).
- **Cross-team coordination**: multi-team initiatives (Wiggle/Stripe API consistency-style).
- **Mentorship at scale**: artifacts (ADRs, design docs, talks, code patterns) que multiplicam — não 1:1 only.
- **Glue work** (Tanya Reilly term): unblocking teams, integrating, doc-writing, hiring loops, onboarding. Critical mas under-rewarded em orgs imaturas; companies sérias measure.
- **Staff Engineer trap**: glue 80% + technical leadership 20% → promo path stalls; precisa balance.

#### Principal / Distinguished (next levels após Staff)
- **Principal**: company-wide impact; multi-year technical vision. Tipicamente 1-3 per ~500-eng company. Comp maps a VP Engineering em FAANG.
- **Distinguished / Fellow**: industry-level impact (papers, OSS maintained, conference keynotes). 1 per ~1000-eng company. Comp maps a SVP.
- Diferencial Principal vs Staff: scope cross-org + multi-year, não single-quarter cross-team.

#### Engineering Manager ladder (M1 → M4+)
| Level | Reports | Hands-on | Foco |
|---|---|---|---|
| **M1 / Eng Manager** | 5-10 ICs | Part-time possible (< 30%) | Performance, 1:1s, project mgmt |
| **M2 / Senior EM** | 10-20 across 2-3 teams; gerencia M1s ocasional | Raro | Team strategy, cross-team coordination |
| **M3 / Director** | 20-50 | Zero | Org strategy, hiring senior leadership |
| **M4+ / VP/SVP** | Org-wide | Zero | Cross-functional partnership, business alignment |

EM skills core: feedback (radical candor — Kim Scott 2017), conflict resolution, hiring (interview design + calibration), career conversations, delegation.

#### Decision framework — Senior at crossroads
- **Energy gain test**: que trabalho deixa você energizado ao fim do dia? Coding hard problem → IC. Helping someone unblock → EM.
- **Calendar test**: encheria seu calendar de 1:1s + meetings sem drenar? EM. Drenaria? IC.
- **Skill leverage**: 90th percentile coder? Stay IC — coaching alguém pra 50th é valor mas você está undervalued. Bom listener + writer + decision-maker? EM.
- **Optionality**: Manager → IC é mais difícil que IC → Manager. EM rust technical skills em 12-24 months sem deliberate practice. Test as Tech Lead first OU transition com plano concreto pra manter coding (20% time, OSS, side-project técnico).
- **Anti-pattern**: deferir decisão indefinidamente — org perde talent pra companies que ladder explicit.

#### Common transitions e pitfalls
- **Senior → EM** (most common path): pitfall = micromanaging, fixing reports' code, não delegando.
- **Senior → Staff IC**: pitfall = staying at Senior pattern (too hands-on, no influence beyond team).
- **EM → IC** ("manager hiatus"): pitfall = letting tech skills atrophy; deliberate practice required (coding diário, sistema próprio, OSS).
- **Staff → Principal**: pitfall = staying at single-team scope; precisa demonstrar cross-org impact.
- **EM → Director**: pitfall = staying tactical; deve shift pra org strategy + multi-team.

#### Levels.fyi reality check 2026 (US top markets)
| Level | Google | Meta | Amazon | Total comp |
|---|---|---|---|---|
| Senior | L5 | IC4 | SDE3 | $300-400k |
| Staff | L6 | IC5 | SDE4 | $450-650k |
| Senior Staff / Principal | L7 | IC6 | Principal SDE | $650k-$1M |
| Distinguished | L8+ | IC7+ | Sr Principal / Distinguished | $1M+ |

EM equivalents (M1-M4) ficam na mesma band; às vezes higher em scaling startups (founder leverage). Numbers variam 30-50% por região (US/UK/Europe/LatAm) e setor (FAANG vs non-tech finance vs traditional enterprise).

#### Logística applied — career planning conversation
1. Engineer ao manager: "Senior há 3 anos, quero Staff."
2. Manager + senior leader (Staff/Principal/Director) role-modela 4 archetypes; engineer escolhe **Architect** (loves system design + coordination).
3. Plano 6-9 meses concreto:
   - Lead V3 services migration (multi-team, cross-DB).
   - Document architecture decisions via ADR (5-8 ADRs lideradas).
   - Mentor 2 Senior em RFC writing (artifacts, não 1:1).
   - Speak em 2 internal tech talks; 1 external se opportunity.
4. 6-month review: progresso medido contra **artifacts** (ADRs commitadas, design docs, talks gravadas, mentorship records), NÃO contra hours.
5. Promotion committee: 360-feedback + portfolio of impact + recommendation by senior leader (Staff+ ou Director).

#### Anti-patterns observados (10 itens)
- "Promoted to manager because Senior 3 years" sem opt-in — sets up failure both directions.
- Staff Engineer fazendo só Senior+ work (no glue, no cross-team) — stuck in scope.
- EM mantendo hands-on coding > 50% time — reports under-coached; both jobs poor.
- Track decision deferred indefinitely — org perde talent pra ladders mais claras.
- Compensation parity not real (IC ladder paga 20% menos que EM no mesmo level) — IC drain crônico.
- Glue work invisible em promo packets (Tanya Reilly's classic lament).
- "Going to IC" framed as demotion — causa EM a over-stay no role mesmo quando drenado.
- Staff Engineer sem portfolio (artifacts: ADRs, docs, talks, mentorship records) — promo committee não consegue evaluate.
- EM sem skip-level 1:1s — perde connection com ICs reports' reports.
- Principal sem industry presence (talks, papers, OSS) — peer signal weak; Distinguished blocked.

Cruza com **04-12 §2.21** (Senior → Staff promotion process), **04-15** (OSS, Principal-level industry presence frequentemente via OSS maintenance), **03-15** (incident response, Staff Eng frequentemente IC durante major incidents), **04-16** (product/business alignment, Staff alinha tech com business outcomes), **04-06** (DDD, Architect archetype owns context maps cross-team).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Distinguir IC, TL, EM tracks.
- Estrutura ADR Michael Nygard.
- Process RFC vs reunião.
- Trade-off thinking aplicado a 1 decisão real.
- 4 funções do code review.
- Postmortem blameless princípios.
- Categorize tech debt em 4 tipos.
- Build vs buy critérios.
- Conway's Law + inverse Conway.
- Feedback técnico bom vs ruim.

---

## 4. Desafio de Engenharia

Document **leadership artifacts** do Logística + executar 1 ciclo real.

### Especificação

1. **ADR backlog**:
   - Escreva ADRs (formato Nygard) pra 5 decisões já tomadas no Logística:
     - Postgres como DB primário.
     - Modular monolith.
     - Auth próprio vs Clerk.
     - Routing engine em Rust.
     - Real-time via SSE+WS+Redis fan-out.
   - Cada um: 1-2 páginas, com context, decision, consequences, alternatives.
2. **RFC**:
   - Escreva 1 RFC pra mudança proposta: "Migrar pra event sourcing em Order Management" ou "Multi-region active-passive em LATAM".
   - Distribua (mesmo que fictício, simule 2 personas reviewando).
   - Iteration: comments → revision → final.
3. **Roadmap técnico**:
   - `ROADMAP.md` com horizon 1/3/6 meses.
   - Inclui features + tech debt + capacity.
   - Trade-offs explícitos.
4. **Postmortem**:
   - Incidente do 03-07/CAPSTONE-producao escrito como postmortem blameless.
   - Timeline, impact, root cause (5 whys), contributing factors, action items.
5. **Code review playbook**:
   - `CONTRIBUTING.md` com:
     - PR size guidance.
     - Commit message convention.
     - Comment prefixes (nit, consider, must).
     - Review SLA (24h em business hours).
     - Approval rules.
6. **Onboarding doc**:
   - `ONBOARDING.md` pra novo engineer.
   - Roteiro: dia 1, semana 1, mês 1.
   - Links pra docs críticos (ADRs, ARCHITECTURE.md, RUNBOOK.md, this).
   - 1 task de "first PR" definida.
7. **Mentoring plan**:
   - Identifique 1 IC fictício júnior. Plano 90 dias: skills atuais → gap → milestones → resources.
8. **Build vs buy decision**:
   - 1 decisão real do projeto (ex: "Auth0 ou continuar com nosso?"). Documente como ADR com critérios + número crunched.

### Restrições

- Sem ADRs vazios genéricos. Documents reais com contexto Logística.
- Sem roadmap aspiracional sem trade-off articulado.
- Sem postmortem com blame implícito.

### Threshold

- README documenta:
  - Lista de artifacts produzidos com link.
  - 1 reflection: o que ficou claro escrevendo ADR que não estava antes.
  - 1 ADR que após escrever, você reconsiderou (changed mind).
  - 1 caso onde RFC review trouxe insight que mudou abordagem.
  - Honest self-assessment: que skills de leadership você precisa desenvolver mais?

### Stretch

- Workshop 1h com amigo / colega: você apresentando arquitetura do Logística. Capture feedback.
- Tech talk gravado (10 min) sobre 1 tópico do framework.
- Blog post escrito + publicado sobre 1 decisão arquitetônica.
- Engineering ladder document: definir critérios pra Junior, Mid, Senior, Staff em Logística.

---

## 5. Extensões e Conexões

- Liga com **01-09** (Git): commit hygiene, branch strategy.
- Liga com **03-04** (CI/CD): DORA metrics, deployment culture.
- Liga com **03-07** (observability): SLO conversation pra business.
- Liga com **03-08** (security): security as culture.
- Liga com **04-06** (DDD): conversa stakeholders → ubiquitous language.
- Liga com **04-07-04-09** (architecture, services, scaling): decisões fundamentadas em ADRs.
- Liga com todos os capstones: lead técnico do projeto inteiro.

---

## 6. Referências

- **"The Manager's Path"**: Camille Fournier.
- **"Staff Engineer"**: Will Larson. Bíblia do IC senior+.
- **"An Elegant Puzzle"**: Will Larson.
- **"The Phoenix Project"** + **"The Unicorn Project"**: Gene Kim.
- **"Team Topologies"**: Skelton, Pais.
- **"Crucial Conversations"**: Patterson et al.
- **"Radical Candor"**: Kim Scott.
- **Camille Fournier blog** ([skamille.medium.com](https://skamille.medium.com/)).
- **Charity Majors blog** ([charity.wtf](https://charity.wtf/)).
- **Will Larson blog** ([lethain.com](https://lethain.com/)).
- **MADR / Nygard ADR templates** ([adr.github.io](https://adr.github.io/)).
- **Google's "How We Use Postmortems"** (SRE book).
