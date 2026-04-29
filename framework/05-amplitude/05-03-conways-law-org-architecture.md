---
module: 05-03
title: Conway's Law & Org Architecture — Team Topology, Bounded Contexts, Stream-Aligned
stage: amplitude
prereqs: [04-12]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 05-03 — Conway's Law & Org Architecture

## 1. Problema de Engenharia

"Sistemas refletem a estrutura organizacional que os criou." Conway (1967). Esta lei é evidência crua: monolitos vêm de teams sem contratos; microsserviços que viram distributed monolith vêm de teams sem ownership claro; APIs ruins vêm de teams sem cliente interno.

Staff/Principal **desenha o time**, não só o código. Recommend split do time em squads aligned com bounded contexts (DDD, 04-06). Argumenta com VP/CTO sobre quando decompor, quando consolidate, quando criar platform team. Reduz dependency hell entre teams. Identifica quando "a arquitetura é ruim porque o org chart é ruim" — frequentemente o caso.

Este módulo é organizational design pro engineer técnico. Não vira manager — mas precisa **falar a língua** de manager pra negociar reorganization. Conway's Law, Inverse Conway Maneuver, Team Topologies (stream-aligned, platform, complicated subsystem, enabling), bus factor org-wide, hiring strategy, levels (IC ladder), career frameworks.

Pra Staff, isto não é overhead: é a alavanca real que move sistema grande. "Vamos refatorar microservice X" não funciona se 3 teams compartilham X sem owner. Resolve org primeiro, código depois.

---

## 2. Teoria Hard

### 2.1 Conway's Law original

Mel Conway, 1967: "Organizations which design systems are constrained to produce designs which are copies of the communication structures of these organizations."

Implicação: **arquitetura espelha comunicação**. 4 teams escrevendo lib comum produzem 4 dialetos. 1 team escrevendo backend monolítico produz monolito coerente. 5 teams produzindo microservices sem clear contracts produzem distributed monolith.

### 2.2 Inverse Conway Maneuver

Princípio prático: **mude o time pra mudar o código**.

Quer microservices independentes? Forme teams independentes com ownership de domain. Quer modular monolith? Mantenha team unificado com module boundaries.

Não basta declarar "microservices". Sem squad ownership de cada serviço, microservices são theater.

### 2.3 Team Topologies (Skelton & Pais)

Quatro tipos de team:

- **Stream-aligned**: alinhado a um fluxo de valor (ex: "Pedidos", "Pagamentos"). Owns end-to-end. Maioria do org.
- **Platform**: produz "internal product" (logging stack, deploy pipeline, auth library) que stream-aligned consume. Reduce cognitive load.
- **Enabling**: ajuda outros times a aprender / adopt new tech. Temporary engagements.
- **Complicated subsystem**: deep expertise específica (search engine custom, video codec). Pequeno e estável.

Modes de interaction:
- **Collaboration**: alta colaboração, fronteira fluida (curto prazo).
- **X-as-a-Service**: consume contratos, sem deep coupling.
- **Facilitating**: enabling team helping out.

Match topology to stage of product e nature de domain.

### 2.4 Bounded contexts (04-06) ↔ teams

DDD bounded context = unidade de modelo coerente. Idealmente um team owns.

Dois bounded contexts no mesmo team: ok se team grande. Um bounded context em N teams: avoid (spaghetti governance).

Mapping:
- Pedidos team owns Order context.
- Pagamentos team owns Payments context (02-18).
- Tracking team owns Tracking context.
- Identidade team owns Identity (auth).

Nomes claros. Contratos explícitos (gRPC, REST com OpenAPI, events com schema).

### 2.5 Cognitive load

Conceito chave de Team Topologies: cada team tem **carga cognitiva** finita.

- **Intrinsic**: necessária ao problema.
- **Extraneous**: imposta por tooling, ambiente.
- **Germane**: aprendizado.

Stream-aligned team com 8 microservices, 3 stacks, 5 deploys diferentes, sem platform support → overload. Velocity cai.

Platform team **reduces extraneous load**: oferece deploy padrão, observability built-in, auth library, etc. Stream team foca no domain.

### 2.6 Ownership clear

Cada serviço/repo/datastore tem **um team owner**. CODEOWNERS file (GitHub), wiki, qualquer registro.

Sem owner: rot.
Múltiplos owners: ninguém é responsável (tragedy of commons).
Owner team disbanded: priorize transfer.

### 2.7 Sizing teams: two-pizza, Dunbar

Padrões comuns:
- **Two-pizza** (Bezos, 1990s): 6-10 pessoas, podem comer com 2 pizzas.
- **Dunbar**: 150 connections estáveis humanas.

Time menor que 4: bus factor frágil.
Time maior que 10: subgroups informais aparecem.

Times muito específicos podem ser 2-3 (complicated subsystem). Stream-aligned típico 6-8.

### 2.8 Dependencies entre teams

Cada cross-team dependency é fricção. Patterns pra reduzir:
- **Self-service** via platform.
- **Async APIs** com SLA.
- **Internal tech radar** documenting "use this, not that".
- **Communities of practice**: cross-team groups (frontend guild, security guild).

Anti-pattern: ticket queue de "infra team" servindo todos. Bottleneck.

### 2.9 Hire pra org you want

Staff often advise sobre roles. "We need backend engineer" é vague. Better:
- "Stream-aligned engineer for Orders team, Postgres + Node experience".
- "Platform engineer for observability stack, Prometheus + Go".
- "Complicated subsystem engineer for routing optimization, OR-Tools + algorithms".

Specificity attracts right candidates e ajusta expectativas.

### 2.10 Career frameworks (IC ladder)

Empresas maduras têm IC (Individual Contributor) ladder paralelo a manager:
- L3 / Junior
- L4 / Mid
- L5 / Senior
- L6 / Staff
- L7 / Senior Staff / Principal
- L8 / Distinguished
- L9 / Fellow

Differences entre níveis: scope, ambiguity, autonomy, impact, influence.

**Promo case**: Staff documenta evidence de impact e scope. Brag doc + sponsor com weight no comitê.

### 2.11 Manager track vs IC track

Sair pra manager = liderança formal, hiring, perf reviews, less code.
Ficar IC = depth técnico, design, mentoring, less people management.

Staff IC = mostly IC com strong influence. Principal IC = strategic technical leadership.

Decision pessoal. Algumas orgs forçam manager pós-Senior; melhores orgs (Stripe, Google, Meta) mantêm IC ladder competitiva.

### 2.12 Reorgs

Reorgs frequentes destroem trust. Reorgs raros + bem-comunicados ok.

Senior técnico sometimes propose reorg. Considerations:
- Cost: 3-6 meses de produtividade perdida em transição.
- Benefit: alinhar com novo strategy, reduce dependency hell.
- Comm: reasoning, timeline, support pra afetados.

Não propose reorg como first solution. Last solution.

### 2.13 Acquisitions e integration

M&A: 2 codebases + 2 culturas + 2 stacks. Patterns:
- **Holdco**: deixa separado.
- **Absorb**: migra acquired pra acquirer's stack/culture. Months/years.
- **Best-of-breed**: escolhe melhor de cada. Politicamente difícil.

Tech leadership com role active em integration: arquitetar transition, save talent, reduce attrition.

### 2.14 Remote / hybrid / in-office

Estruturas afetam comunicação afetam código (Conway de novo):
- **All-remote**: doc-first, async-first. GitLab, Automattic.
- **Hybrid**: meetings important, time zones complicate.
- **In-office**: serendipity, but excludes geo diversity.

Engineering practices ajustam: code review obrigatório (substitui hallway), pull-request descriptions densas, ADR formal, recordings.

### 2.15 DEI e bus factor

Time homogêneo é frágil:
- Group think.
- Single perspective.
- Hire pipeline limita.

Diversity (gender, race, age, neurodiversity) melhora outcomes mensuráveis. Mas DEI exige hiring deliberado, retention work, sponsorship.

Não vira política; é engineering reliability — reduz blind spots.

### 2.16 Leveling consistency entre orgs

Levels não são padronizados entre empresas. L5 Google ≈ L6 Meta ≈ Senior+ Stripe. Sites como levels.fyi ajudam comparison.

Impact em transição de empresa: title pode aumentar ou cair. Comp + scope > title.

### 2.17 Staff archetypes (Tanya Reilly)

Staff Eng não é "Senior +". Tipos:
- **Tech Lead**: lidera projeto/team técnico.
- **Architect**: cross-team design.
- **Solver**: parachuted em bugs nasty.
- **Right Hand**: par técnico de manager senior, decides em escala.

Cada um valida differently. Saiba qual é seu archetype + qual sua org valoriza.

### 2.18 Glue work

Glue work = trabalho de coordenar, mentor, escrever doc, organizar meetings. Crítico mas invisível em perf review.

Senior IC must balance code (visible, promotable) com glue (impact, retention). Female / underrepresented ICs frequentemente acabam com mais glue, less promo. Sniff e push back.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Enunciar Conway's Law e Inverse Conway Maneuver.
- Diferenciar 4 tipos de team (Topologies).
- Aplicar bounded context → team mapping em domínio dado.
- Justificar two-pizza team size.
- Listar 4 patterns pra reduce inter-team dependencies.
- Distinguir IC ladder vs manager track.
- Justificar quando platform team agrega valor.
- Diferenciar Staff archetypes (Tech Lead, Architect, Solver, Right Hand).
- Discutir glue work trade-off.
- Recomendar ownership policy + CODEOWNERS para org média.

---

## 4. Desafio de Engenharia

Produzir **proposta de organização da Logística v3** + 1 estudo de caso real.

### Especificação

**Parte 1: Logística (hipotética em scale)**

Cenário: Logística cresceu pra 60 engenheiros. Você é Staff novo. Mapeie:
1. **Bounded contexts** (DDD): mínimo 6 (Orders, Payments, Tracking, Identity, Routing, Marketplace).
2. **Team topology proposal**:
   - Stream-aligned teams alinhados a contexts.
   - Platform team(s) (DevEx + Observability são bons candidatos).
   - Complicated subsystem (Routing optimization?).
   - Enabling team (initial migration phase).
3. **Sizing**: número de engineers por team, com justificativa.
4. **Interaction modes**: matriz X-as-a-Service vs Collaboration.
5. **Ownership map**: cada repo / serviço / datastore atribuído.
6. **Migration plan** se atualmente é monolithic squad.
7. **Cognitive load assessment** por team.
8. **Risks**: identifique 5 riscos da proposta + mitigations.

Output: `ORG-PROPOSAL.md` (~2000 palavras) + diagrama mermaid.

**Parte 2: Estudo de caso real**

Escolha uma org pública (Stripe, GitLab, Shopify, Spotify) que documenta org publicamente (via blog/talks). Analise:
- Como organizam.
- Quais team topologies aparecem.
- Como mudaram ao longo do tempo.
- Lições aplicáveis.

Output: `CASE-STUDY.md` (~1500 palavras).

**Parte 3: Pessoal**

Escreva `MY-PATH.md`:
- Qual archetype Staff me atrai.
- Skills gap.
- 12 meses plano.
- Como medirei.

### Restrições

- Sem dogmatismo. Reconheça trade-offs.
- Não copiar Spotify Model literal (reconhecidamente disfuncional na própria Spotify).
- Cita dados/sources (livros, posts).

### Threshold

- 3 docs entregues.
- Org proposal lido por colega Senior+ que dá feedback.
- Estudo de caso com sources.

### Stretch

- **Conway analyzed** em codebase real: `git log` + ownership stats vs current arch.
- **Comparative org table**: 4 empresas público side-by-side.
- **Brag doc**: setup teu próprio (sem mostrar pra mim — esse é teu).
- **Mentor talk**: apresente proposta pra colega ou meetup.

---

## 5. Extensões e Conexões

- Liga com **04-06** (DDD): bounded contexts.
- Liga com **04-07** (architectures): hexagonal/clean são intra-team patterns.
- Liga com **04-08** (services vs monolith): Conway dirige escolha.
- Liga com **04-12** (tech leadership): RFC, ADR, comunicação técnica.
- Liga com **04-15** (OSS maintainership): governance é mini-org design.
- Liga com **04-16** (product/business): structure influences velocity.
- Liga com **05-05** (public output): blogging org thoughts.
- Liga com **05-06** (mentorship): mentor é alavanca cross-team.
- Liga com **CAPSTONE-amplitude**: choice de specialization implies team topology onde você cabe.

---

## 6. Referências

- **"Team Topologies"** — Skelton, Pais. Bíblia.
- **"The Mythical Man-Month"** — Brooks. Conway era.
- **"An Elegant Puzzle"** — Will Larson.
- **"Staff Engineer: Leadership Beyond the Management Track"** — Tanya Reilly.
- **"The Manager's Path"** — Camille Fournier.
- **"Accelerate"** — Forsgren, Humble, Kim. DORA metrics + org.
- **"Empowered"** — Marty Cagan.
- **"Patterns of Enterprise Application Architecture"** — Fowler.
- **levels.fyi**, **Pragmatic Engineer** newsletter (Gergely Orosz).
- **"How Spotify Builds Products"** + critique by Jeremiah Lee ("Spotify Doesn't Use the Spotify Model").
- **Marty Cagan / SVPG** product team writings.
- **Will Larson's blog** ([lethain.com](https://lethain.com/)).
