---
module: ST06
title: Mentorship at Scale — Career Frameworks, 1-on-1s, Coaching, Sponsorship
stage: staff
prereqs: [S12]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# ST06 — Mentorship at Scale

## 1. Problema de Engenharia

Senior pessoa única faz 1.0x impact via código. Staff/Principal multiplica via influência e mentoria — 1.0x próprio + 0.3x sobre 5-10 outros = 2.5x-4.0x.

Mas mentoria não é "café eventual". É disciplina: 1-on-1s estruturados, feedback que machuca pouco e ensina muito, sponsorship (não só mentoring), coaching (não só answering), promoting subordinates' careers, building leaders. Mal feito gera dependency, micromanagement, burnout do mentor, ou — comum — performance ineffective ("eu disse coisas mas pessoa não cresceu").

Este módulo é mentoria como **engineering practice**: career frameworks (escadas, expectations), feedback techniques (SBI, radical candor), 1-on-1 disciplines, coaching vs mentoring vs sponsoring distinctions, fairness traps (homo-soclalal mentoring, glue work assigned to underrepresented), e como medir impact.

Staff/Principal real é avaliado também por **quem cresceu sob você**. Currículo de promovidos, retidos, recovered-from-burnout. Esse é currículo — código sozinho não basta.

---

## 2. Teoria Hard

### 2.1 Mentoring vs coaching vs sponsoring

- **Mentoring**: passar conhecimento ("aqui está como eu fiz X"). Direção: senior → junior.
- **Coaching**: facilitar descoberta ("o que você acha sobre Y?"). Direção: pessoa cresce sozinha com guia.
- **Sponsoring**: pôr peso em pessoa pra oportunidade ("quero que João lidere isso"). Risco do sponsor; ganho do sponsoree.

Staff faz todos três. Sponsoring é o mais escasso e mais valioso — Staff tem capital político pra investir em alguém.

### 2.2 Career framework

Empresas maduras documentam expectations por nível. Sem framework, perceptions divergem.

Componentes de framework (por nível):
- Scope: tamanho do problem.
- Autonomy: decisões sozinho vs com ajuda.
- Ambiguity tolerance.
- Communication scope: time/squad/org/external.
- Influence: convencer com argumento técnico.
- Mentor others.
- Strategic vs tactical.

GitLab handbook + CircleCI engineering competencies + Rent the Runway são framework públicos referência.

Sem framework empresa, usar Staff Engineer book de Tanya Reilly como heurística.

### 2.3 1-on-1 cadence e structure

Mentor → mentee 1-on-1:
- 30-45 min, weekly ou biweekly.
- Mentee owns agenda (mentee's growth, not mentor's).
- Last 5 min: action items + accountability.
- Recurring topics: career goals, blockers, technical questions, feedback bidirectional.

Anti-pattern: 1-on-1 vira status update. Status em standup; 1-on-1 é deeper.

### 2.4 Feedback techniques

**SBI** (Situation-Behavior-Impact): "Em retro de Q3 [S], você disse 'isso é fácil' [B], e 2 juniores ficaram desencorajados de pedir help depois [I]." Específico, não personal.

**Radical Candor** (Kim Scott): high care + high challenge. Avoid ruinous empathy (high care, low challenge), obnoxious aggression (low care, high challenge), manipulative insincerity (low both).

**Feedback timing**: ASAP enquanto fresca; com 1-on-1 privado pra negativa; em público pra positiva (sparingly).

### 2.5 Receiving feedback

Same skill, mirror direção. Patterns:
- Não defend imediato.
- Ask clarifying ("can you give example?").
- Thank.
- Reflect → respond later if needed.
- Take action visible.

Senior IC bom em receber multiplica trust de mentees.

### 2.6 Active listening

Coaching depends on listening. Patterns:
- Mais perguntas, menos sentenças.
- Pause antes de responder.
- Reformule pra checagem ("entendi que você está frustrado com X — correto?").
- Resista impulso de resolve immediate.

Sometimes person não quer solução; quer ear. Coach reads situation.

### 2.7 Career conversations

Periodic (every 3-6 months): "where do you want to be in 1 year? 3 years?". Mentee articulates; mentor reflete + suggests path.

Outputs:
- Career doc (próprio do mentee).
- Skills matrix (current vs target).
- Quarterly milestones.
- Stretch project identified.

Sem doc, conversa esmaece. Documenting force clarity.

### 2.8 Sponsorship em prática

Allocate political capital:
- Recommend mentee pra committee promo.
- Volunteer mentee pra visible project.
- Cite mentee em meeting upper.
- Coauthor RFC — mentee primary.

Sponsorship custa: você assume risk se mentee falha. Pick well. But Staff sponsors broadly, helps career mobility.

### 2.9 Group mentorship: scale

1-on-1 don't scale beyond 4-5 mentees. Above:
- **Office hours**: open slot weekly, anyone joins.
- **Brown-bag talks**: monthly tech share.
- **Reading group / paper club** (ST04 conexão).
- **Pairs** rotating: mentee A pairs mentor 1; next month mentee A pairs mentor 2.
- **Public docs / blog** that mentor uses repeatedly.

Don't take on 10 mentees individually; quality drops.

### 2.10 Specific mentoring scenarios

**Junior stuck**: usually não-technical block (confidence, prio, comm). Coach over solve.

**Mid-level plateau**: scope or scope perception. Identify stretch.

**Senior to Staff transition**: most common gap is influence + communication, not code. Push em writing, design reviews leading.

**Underperforming**: be direct, define improvement plan, track. PIP if necessary; mentor stays supportive but honest.

**Burnout**: prioritize person > deliverables. Push pra leave, manager, EAP.

### 2.11 Mentoring underrepresented

Studies: women, BIPOC, neurodivergent, etc. tend to:
- Receive less actionable feedback.
- Get more glue work assigned.
- Promo at lower rate same performance.

Mentor explicitly:
- Equal feedback challenge.
- Notice glue assignments.
- Sponsor visibly.
- Vouch for promo cycles.

Não tokenize. Treat like every mentee, com awareness extra das systemic frictions.

### 2.12 Cross-team / cross-org mentoring

Inside-team mentoring é easier. Cross-team mentoring multiplica reach.

Programs:
- Internal mentor matching app.
- External (Plato, MentorCruise) — validate carefully.
- Communities (Lara Hogan's Wherewithall, Rands Leadership Slack).

Disclose conflicts: don't mentor someone whose perf review you write.

### 2.13 Time budget pra mentor

Realistic for Staff IC:
- 5h / week mentoring (3 mentees × 1h 1-on-1 + ad hoc + group office hour).
- 15-20% of capacity. Track.

Manager jobs may be 50%+. Staff IC stays under that.

If overloaded, reduce mentees, increase group format, push some pra peer mentoring.

### 2.14 Boundaries

Mentor doesn't:
- Solve mentee's coding for them.
- Carry mentee's deliverable.
- Become therapist (refer to EAP for serious mental health).
- Get involved em personal disputes between mentee and others.
- Reveal info from one mentee to another.

Trust depends on confidentiality.

### 2.15 Mentor's growth

Mentoring teaches mentor too. Patterns observed:
- Common gaps in juniors → improve framework / docs.
- Mentees ask things that surface assumptions.
- Coaching forces clarity em próprio thinking.

Reflecting after 1-on-1 (5 min note) compounds learning.

### 2.16 Failure modes

- **Hero mentor**: tries to be answer; mentee não cresce.
- **Absent mentor**: missed 1-on-1s, no follow-up. Worse than nada.
- **Buddy mentor**: friendship dilutes feedback.
- **Vampire mentee**: drains energy without commensurate growth. Address or release.

### 2.17 Measuring impact

Hard but possible:
- Mentees promoted (over what timeframe).
- Mentees' own contributions (delivered features, lead projects).
- Retention.
- Self-report from mentees.
- Peer feedback ("X helped me grow").

Brag doc pra Staff/Principal includes mentees grown.

### 2.18 Mentoring publicly

Open mentorship:
- Office hours público em Twitter.
- Blog answering common questions.
- ADRs/RFCs com explanations dialéticas.
- Community Slack/Discord helping.
- Open source review com pedagogical comments.

Public mentorship scales mais — same effort reaches mais people.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Diferenciar mentoring, coaching, sponsoring.
- Estruturar 1-on-1 (cadence, agenda owner, output).
- Aplicar SBI feedback.
- Listar Radical Candor's quadrants.
- Identificar 4 cenários de mentoring com response apropriado.
- Reconhecer biases que afetam mentees underrepresented.
- Estabelecer time budget realista pra Staff IC mentor.
- Listar 4 boundaries que mentor não cruza.
- Diferenciar career conversation de status update.
- Discutir how to scale mentoring beyond 1-on-1.

---

## 4. Desafio de Engenharia

Estabelecer **practice de mentoring** + 3 mentees acompanhados.

### Especificação

1. **Framework** própria:
   - Doc `MENTORING.md` declarando seu approach (style, time budget, boundaries).
   - Career framework de referência adoptado (link).
2. **3 mentees**:
   - Identifique (no work, comunidade, OSS, externos via mentor matching).
   - Mix de níveis (1 junior, 1 mid, 1 senior+ buscando Staff).
   - Cada um tem career doc (com você ou independente).
   - 1-on-1 weekly ou biweekly.
   - Notes próprias (privadas) por sessão.
3. **Mentoring artifacts**:
   - 1 SBI feedback dado e documented.
   - 1 sponsorship action (recommend pra projeto, citar em meeting).
   - 1 career-conversation deep com cada.
4. **Group format**:
   - Inicie 1: paper club (com ST04), brown-bag, office hours, ou reading group.
   - Pelo menos 4 sessões nos primeiros 3 meses.
5. **Tracking**:
   - Dashboard private de mentees: goals, milestones, status, blockers.
   - Quarterly retro pessoal: o que funcionou, o que não.
6. **Public mentorship**:
   - 2 blog posts respondendo perguntas comuns dos mentees.
   - Pelo menos 5 helpful PR reviews públicos com pedagogical comments.

### Restrições

- Confidencialidade absoluta.
- Sem mentoring direto report (conflict).
- Sem mentoring se afetar performance review.
- Sem unsolicited advice (mentee opt-in).

### Threshold

- 3 mentees ativos por ≥ 6 meses.
- 1 sponsorship action documented.
- Group format running.
- Quarterly retro feito.

### Stretch

- **Mentee promoção**: 1+ mentee promoted no período.
- **External mentor program** (Plato, MentorCruise) com 1+ external.
- **Speak** sobre mentoring em meetup (ST05 conexão).
- **Mentor-the-mentor**: você acha mentor pra você (yes, Staff também).
- **Open mentor program** dentro de empresa: design + lança programa formal.

---

## 5. Extensões e Conexões

- Liga com **S12** (tech leadership): mentoring é leadership.
- Liga com **S15** (OSS): community moderation overlap.
- Liga com **ST03** (org architecture): mentor cross-team é alavanca.
- Liga com **ST04** (paper reading): paper club é group mentor.
- Liga com **ST05** (public output): public mentorship.
- Liga com **CAPSTONE-staff**: deliverable inclui mentees grown.

---

## 6. Referências

- **"Staff Engineer"** — Tanya Reilly. Direct.
- **"Radical Candor"** — Kim Scott.
- **"The Manager's Path"** — Camille Fournier (mentor mindset for IC).
- **"An Elegant Puzzle"** — Will Larson.
- **"The Coaching Habit"** — Michael Bungay Stanier.
- **"Resilient Management"** — Lara Hogan.
- **"Time to Think"** — Nancy Kline (active listening).
- **GitLab Handbook** — career framework público.
- **Rent the Runway Engineering Ladder**.
- **"What Got You Here Won't Get You There"** — Marshall Goldsmith.
- **Lara Hogan's blog** ([larahogan.me](https://larahogan.me/)).
- **"How To Be A Great Mentor"** — patterns.
