---
module: 03-16
title: Estimation & Technical Planning, Breakdown, Risk, Sizing, Roadmaps
stage: producao
prereqs: [03-04]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 03-16, Estimation & Technical Planning

## 1. Problema de Engenharia

Estimar é onde Plenos viram Sêniors ou ficam Plenos pra sempre. Quase todo dev odeia estimar, "não sei, vai depender", "agile não exige", "PM que decide". Mas em organização real, **ninguém te dá tempo ilimitado**. Estimar mal causa: deadlines mentirosos, retrabalho, perda de confiança da liderança, missed quarter, time queimado.

Senior estima com **calibração**: separa unknowns de knowns, identifica riscos, faz pré-trabalho de redução de incerteza, comunica com bandas de confiança em vez de números mágicos. Sabe que estimativa não é commit; é **planejamento** que ajuda decisão. Sabe quando pedir spike, quando dividir, quando dizer "essa estória precisa de mais clareza antes de estimar".

Este módulo é o **ofício de planejamento técnico**: breakdown de épicos em estórias, T-shirt sizing, planning poker, reference class forecasting, risk register, dependency mapping, critical path, buffers honestos, roadmap quarterly, OKR alignment, e por que "fizemos só 60% do roadmap" é normal e ok.

Não é PM; é o lado técnico que apoia PM. Senior técnico sabe estimar próprio trabalho e do time, defender prazos com evidência, e empurrar back contra escopo irreal sem virar "engenheiro do não".

---

## 2. Teoria Hard

### 2.1 Por que estimativas falham

Hofstadter's law: "It always takes longer than you expect, even when you take into account Hofstadter's law."

Causas:
- **Planning fallacy**: humanos otimistas; subestimam unknowns.
- **Scope creep**: requisitos crescem.
- **Context switching**: interrupções, meetings.
- **Discovery**: surpresas em codebase ou domain.
- **Coordination cost**: quanto mais pessoas, mais comunicação.
- **Tail risks**: P95 puxa média.

Aceitar estatisticamente: estimar com **distribuição**, não ponto. Dar P50 e P90.

### 2.2 Decomposição: épico → estória → task

- **Épico**: feature grande (semanas/meses). "Logística suporta multi-tenant".
- **Estória**: entregável testável (dias). "Lojista pode convidar membros do time com role".
- **Task**: passo técnico concreto (horas). "Adicionar tabela `team_invites` com migration".

Se estória > 1 semana, decomponha. Se task > 1 dia, decomponha.

INVEST (estórias boas): Independent, Negotiable, Valuable, Estimable, Small, Testable.

### 2.3 T-shirt sizing

Buckets relativos: XS / S / M / L / XL.
- **XS**: < 1 dia.
- **S**: 1-3 dias.
- **M**: 3-7 dias.
- **L**: 1-2 semanas.
- **XL**: > 2 semanas (reduce!).

Vantagem: conversa rápida, sem ilusão de precisão. Desvantagem: cada team calibra próprio.

### 2.4 Story points

Pontos em Fibonacci (1, 2, 3, 5, 8, 13, 21). Pretende capturar effort + complexity + risk.

Crítica: vira moeda, gerentes comparam times, perde sentido. Use com cautela ou nem use.

Velocity (pts/sprint): planejamento agregado. Vira instrumento manipulável; só serve em time fechado e estável.

### 2.5 Reference class forecasting

Pegue projetos passados similares e use como base. Em vez de "vou estimar do zero", "outras 3 features deste tamanho levaram 3-5 semanas; default 4".

Reduz planning fallacy. Demanda histórico.

### 2.6 Three-point estimation (PERT)

Três valores:
- **O** (optimistic, 03-10).
- **M** (most likely, P50).
- **P** (pessimistic, P90).

Estimativa esperada: `(O + 4M + P) / 6`. Variance: `((P-O)/6)²`.

Soma de tasks com PERT dá distribuição do projeto. Útil quando alguém pede single number, você sabe que 03-10 é fantasia e P90 é cobertura.

### 2.7 Risk register

Cada épico tem riscos identificados:
- **Tech risk**: nova lib, novo paradigma.
- **Dependency risk**: bloqueado por outro time.
- **People risk**: férias, contratação pendente.
- **Scope risk**: requisitos não fechados.
- **External risk**: vendor, regulation.

Para cada: probabilidade × impacto = severity. Mitigation plan.

Riscos top 3 abordados em planning. "Vamos fazer spike na semana 0 pra reduzir risk X".

### 2.8 Spikes

Mini-pesquisa timeboxed pra reduzir incerteza. "Spike de 3 dias pra avaliar Redpanda vs Kafka". Output: doc com decisão + evidence.

Spikes não entregam feature. Investigam. Estimar pós-spike é mais confiável.

### 2.9 Dependency mapping e critical path

Mapeie dependências entre tasks. Visualize via Gantt ou DAG. **Critical path** = sequência mais longa; encurtar critical path encurta projeto.

Tarefas off-critical têm slack. Atrasar slack não atrasa projeto; atrasar critical sim.

Ferramentas: Linear, ProjectPlace, Asana Timeline. Em times pequenos, lousa basta.

### 2.10 Buffers honestos

**Buffer do projeto**, não da task. Cada task estimada P50; buffer agregado no fim cobre tail.

Anti-pattern: cada dev infla própria estimativa "pra garantir". Buffers escondidos somam-se em quantidade absurda. Melhor: estimativas honestas + buffer global declarado (~20-30%).

### 2.11 Communication das estimativas

- **Banda + premissas**: "4-7 semanas, assumindo team de 3, sem urgência paralela, dependência X resolvida na semana 1".
- **Re-estimar checkpoint**: na semana 2, estimar restante.
- **Sinalizar slip cedo**: 50% slip detectado em 30% do projeto. Diga.
- **Defender escopo**: cortar feature > deadline mentiroso.

Senior diz "não" tecnicamente. "Pra cobrir requisitos A, B, C em 4 semanas, exigiria Y. Sem Y, ou cortamos C ou estendemos pra 6."

### 2.12 Roadmap

- **Now / Next / Later**: presente certeza alta; próximo médio; futuro impressão.
- **Theme-based**: agrupa por outcome ("reduzir churn de lojistas") em vez de feature.
- **Quarterly**: ciclo padrão.
- **Pivots**: roadmap não é contrato; revisitar trimestralmente.

Roadmap honesto admite incerteza. Não promete "Q4 lançamento de X" se X é XL com riscos.

### 2.13 OKRs e alinhamento

OKR: Objective qualitativo + Key Results mensuráveis. Hierarquia (company → team → individual). Reviewed quarterly.

Crítica: OKR vira theater quando KRs são vaidade ou fáceis. Bons KRs medem outcome (não output) e são desafiadores.

Senior técnico aproxima trabalho de OKRs do time. "Esse refactor habilita KR Y porque ...".

### 2.14 Estimating refactors / migrations

Estes são onde mais errôneo:
- **Find unknowns primeiro** (audit, spike).
- **Iterativo**: migration em ondas (Strangler Fig pattern).
- **Mantenha sistema funcionando**: nunca pause.
- **Reversão sempre possível**: feature flags, dual-write durante transição.
- Buffer 50%+ pra migrações grandes.

Ex: migrar de Express → Fastify. Spike (1 sem) → wrapper compat (1 sem) → migrar 30% rotas (2 sem) → rest (3 sem) → cleanup (1 sem). Total 8 sem; comunique como 6-10.

### 2.15 Velocity vs throughput vs cycle time

- **Throughput**: nº de itens completados por período.
- **Cycle time**: tempo do começo ao fim de item.
- **WIP** (Work In Progress): itens abertos.

Little's Law: `WIP = Throughput × Cycle Time`. Reduzir WIP reduz cycle time (com throughput fixo). Limitar WIP é Kanban core.

Métricas alvo: cycle time mediano + p95. Vigilância de outliers (item de 4 semanas que devia ser 1).

### 2.16 Pre-mortem

Antes do projeto: imagine que falhou catastroficamente. Liste por quê. Use pra mitigation upfront.

Inverte planning fallacy. Time encontra riscos que esconderiam.

### 2.17 No-estimates / NoEstimates movement

Movimento: estimativas são waste; foco em flow + WIP limit + small batch. Estória < 2 dias, não estima, só faz.

Realidade: orgs maiores ainda exigem planning. Mas filosofia (small batches, flow) é correta. Se você tem disciplina, NoEstimates simplifica.

### 2.18 Tracking real tools

- **Linear**, **Jira**, **Shortcut**, **Height**, **GitHub Projects**.
- **Burn-down / burn-up charts**.
- **Cumulative flow diagram**.
- **Cycle time scatter plot**.

Tooling não substitui disciplina. Time disfuncional com Jira sofisticado é disfuncional.

### 2.19 Monte Carlo forecasting + flow metrics + #NoEstimates math

Story points são subjetivos, drift entre sprints, e não traduzem pra datas. Monte Carlo simulation usa throughput histórico (items completed per week) pra forecast probabilístico. Output acionável: "85% confidence shipping 30 items em 8 semanas" — não "uns 6 sprints, talvez". Adoção 2026: Spotify, Allianz, ING substituíram SP estimation tradicional por flow metrics + Monte Carlo.

**Flow metrics (Daniel Vacanti, "Actionable Agile Metrics for Predictability")**:

- **Throughput**: items completed per time unit (semana/sprint). Conta items, NÃO effort.
- **Cycle time**: tempo de "started" até "done" por item.
- **Lead time**: tempo de "request received" até "done" (inclui queue time).
- **WIP** (Work In Progress): items currently in flight.
- **Little's Law**: `WIP = Throughput × Cycle Time`. WIP menor → cycle time menor (throughput fixo).
- **Aging WIP**: items in flight muito tempo são predictors de late delivery; alerta operacional.

**Monte Carlo "when?" — Python**:

```python
import random

# Histórico: items completed per week (last 12 weeks)
throughput_samples = [4, 6, 5, 3, 7, 5, 4, 6, 8, 5, 4, 6]

def simulate_when(num_items: int, num_weeks_max: int, trials: int = 10_000):
    """Quantas semanas pra completar num_items?"""
    results = []
    for _ in range(trials):
        weeks = 0
        done = 0
        while done < num_items and weeks < num_weeks_max:
            done += random.choice(throughput_samples)
            weeks += 1
        results.append(weeks)
    results.sort()
    return {
        '50%': results[len(results) // 2],
        '85%': results[int(len(results) * 0.85)],
        '95%': results[int(len(results) * 0.95)],
    }

# 30 items: when?
forecast = simulate_when(30, 100)
# {'50%': 6, '85%': 8, '95%': 10}  → 85% confidence em 8 semanas
```

**Monte Carlo "when?" — TypeScript**:

```ts
function simulateWhen(
  numItems: number,
  samples: number[],
  trials = 10_000,
): { p50: number; p85: number; p95: number } {
  const results: number[] = [];
  for (let i = 0; i < trials; i++) {
    let weeks = 0;
    let done = 0;
    while (done < numItems && weeks < 200) {
      done += samples[Math.floor(Math.random() * samples.length)];
      weeks++;
    }
    results.push(weeks);
  }
  results.sort((a, b) => a - b);
  return {
    p50: results[Math.floor(trials * 0.5)],
    p85: results[Math.floor(trials * 0.85)],
    p95: results[Math.floor(trials * 0.95)],
  };
}
```

**Monte Carlo "how many by date?" — direção reversa**:

```python
def simulate_how_many(num_weeks: int, trials: int = 10_000):
    results = []
    for _ in range(trials):
        done = sum(random.choice(throughput_samples) for _ in range(num_weeks))
        results.append(done)
    results.sort()
    return {
        '50%': results[len(results) // 2],
        '85%': results[int(len(results) * 0.15)],  # lower bound, 85% conf
        '95%': results[int(len(results) * 0.05)],  # lower bound, 95% conf
    }
# 8 weeks: how many items?
# {'50%': 44, '85%': 36, '95%': 30}  → 85% confidence shipping 36 items
```

Pegadinha: pra "how many items" usa percentiles INFERIORES (lower bound, pessimistic). Pra "when?" usa percentiles superiores. Direções opostas.

**Cumulative Flow Diagram (CFD)** — visualizar bottlenecks:

- Eixos: x = tempo (dias/semanas); y = count items per status (Backlog/InProgress/Review/Done) stacked.
- **Bottleneck signal**: status com banda crescendo (acumula items, downstream starvado).
- **WIP signal**: largura vertical de "InProgress" representa WIP atual.
- **Cycle time signal**: distância horizontal entre "started" e "done" lines.
- Tools: Linear (built-in 2025+), Jira (built-in), Actionable Agile (specialized).

**#NoEstimates math (Allen Holub, Vasco Duarte, Vacanti research)**:

Hipótese: "all stories são approximately same size em backlog bem-decomposto → just count". Evidência empírica: variance em throughput é comparável a variance em SP-weighted throughput na maioria dos teams. SP adiciona overhead sem signal proporcional. Decision tree:

- Stories well-broken-down (<3 dias each) → #NoEstimates funciona, just count.
- Stories vary 1-day vs 1-month → SP ainda relevante OR melhor breakdown upstream.
- **Compromise**: t-shirt sizing (S/M/L/XL) com cap em XL (split obrigatório acima de XL).

**Logística applied — quarterly planning Q4 2026**:

- Backlog: 47 items priorizados.
- Throughput last 12 semanas: `[8, 6, 5, 7, 9, 6, 8, 7, 6, 8, 5, 7]` (média 6.8/sem, min 5, max 9).
- Forecast 47 items: `{p50: 7 weeks, p85: 8 weeks, p95: 10 weeks}`.
- Forecast 12 weeks (quarter): `{p50: 81 items, p85: 70 items, p95: 60 items}`.
- Commit a stakeholders: 60-70 items (p85-p95 lower bound), NÃO 47 com "extender em 4 semanas se precisar".

**Pegadinhas em produção**:

- **Throughput change point**: time mudou (membro saiu/entrou) → use last 8 semanas, NOT 12. Histórico pré-mudança polui sample.
- **Outliers**: 0 items em semana (holiday/incident) — Vacanti recomenda KEEP (real noise of system, não censura).
- **Items different sizes**: premissa "all items same" quebra → break down stories acima de 1 semana mandatorily.
- **Non-deliverable items**: research spike não conta como item; só "deliverable to user" entries em throughput sample.
- **Deadline planning**: forecast diz p95=10 semanas, deadline=8 semanas → cut scope (pull lowest priority) ou add capacity (caro, lateness garantida).

**Tools 2026**:

- **Actionable Agile** (Vacanti's tool): Monte Carlo + CFD built-in. Linear/Jira integration. $25/user/mo.
- **Linear flow metrics**: built-in CFD + cycle time charts desde 2025. Pro $14/user/mo.
- **Jira**: CFD built-in, Monte Carlo via plugin (Actionable Agile, ~$15/user/mo).
- **Custom**: Python/SQL + Grafana panel. 1-2 weeks build + maintenance contínua. Self-host alternative.

**Anti-patterns observados**:

- Story points re-estimated mid-sprint (SP supposed to be relative ordinal, NÃO absolute hours).
- Forecast com 50% confidence reportado a stakeholders (50% = coin flip; sempre 85%+ pra commitment).
- Throughput inclui research spikes / non-deliverable items (inflated, unrealistic forecast).
- Monte Carlo sem dropping warmup period após team change (last 4 semanas ignored).
- SP velocity stable, mas team mudou 3 membros (velocity é per-team metric, NÃO portable).
- "Estimation accuracy" tracked, mas estimation overhead ignored (cost > benefit típico).
- Planning poker scaled all-hands: 8 pessoas × 4h × bisemanal = 64h/mês de overhead puro.
- Cycle time medido sem definition de "started"/"done" claros (garbage in, garbage out).
- WIP unlimited (Little's Law: cycle time explode em proporção direta).
- "Velocity goal" comunicado a time (Goodhart's Law: vira gameable, perde signal informativo).

**Cruza com**: `04-12` (tech leadership: planning rituals + estimation culture); `03-15` (incident response: MTTR é lead time pra incidents); `04-09` (scaling: capacity planning); `03-04` (CI/CD: deployment frequency feeds throughput sample); `04-16` (product/business: forecasting pra revenue commitments e customer SLAs).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Decompor um épico em estórias INVEST (mostrar com exemplo).
- Diferenciar T-shirt sizing, story points, three-point.
- Calcular PERT esperado e variance dado O/M/P.
- Identificar critical path em DAG simples.
- Justificar buffer global em vez de buffer por task.
- Listar 4 categorias de risk e dar exemplo de mitigation.
- Aplicar Little's Law.
- Distinguir output e outcome em OKR.
- Estimar refactor com Strangler Fig em ondas.
- Comunicar estimativa com banda + premissas.
- Justificar pre-mortem.

---

## 4. Desafio de Engenharia

Conduzir **planejamento técnico do CAPSTONE-producao** (Logística v2) end-to-end. Output é doc + execução observável.

### Especificação

1. **Doc `PLAN-V2.md`**:
   - Resumo do escopo da v2 (containers, K8s, CI/CD, observability, security, perf).
   - Decomposição em épicos → estórias INVEST. Mínimo 25 estórias.
   - Estimativas T-shirt + 3 estórias com three-point (mostre cálculo PERT).
   - Risk register: 8 riscos com prob/impact/mitigation.
   - Dependency map (DAG visualizado em mermaid).
   - Critical path identificado.
   - Roadmap por sprint (4 sprints de 2 semanas).
   - Pre-mortem: 5 cenários de falha imaginados.
   - Premissas explícitas (team size, hours/week, dependencies externas).
2. **Execução**:
   - Linear/GitHub Projects com todas estórias.
   - Cada estória tem AC (acceptance criteria).
   - WIP limit declarado (3 in-progress max).
   - Sprint planning, daily, retro tools simples.
3. **Tracking**:
   - Cycle time scatter por estória.
   - Burn-up por sprint.
   - Slip log: estórias que slipped, motivo, action item.
4. **Re-plan no meio**:
   - Após sprint 2 (50%), re-estimar restante. Documente diff.
   - Pelo menos 1 estória cortada/movida pra v3 com justificativa.
5. **Postmortem do plano** (após v2 completo):
   - Comparar estimado × real por épico.
   - Lessons learned pra v3.

### Restrições

- Estimativas honestas (não infladas).
- Cada slip documentado, não escondido.
- Pelo menos 1 spike ao iniciar (3 dias) reduzindo risco identificado.

### Threshold

- `PLAN-V2.md` completo antes de começar a v2.
- Tracking real durante execução.
- Postmortem pós-v2 com diff numérico.
- Re-plan documentado no meio.

### Stretch

- **Monte Carlo simulation** do projeto: 10k runs com distribuições por task → distribuição de duração total. Compare com PERT agregado.
- **Cumulative flow diagram** automatizado a partir de Linear API.
- **Quarterly OKR doc**: alinhar v2 com OKRs hipotéticos da empresa.
- **Estimation calibration**: track sua própria over/under em 20 estórias; ajustar com viés observado.

---

## 5. Extensões e Conexões

- Liga com **03-01** (testing): TDD afeta cycle time; spikes feedback.
- Liga com **03-04** (CI/CD): deploy frequency = throughput proxy.
- Liga com **03-07/03-15** (obs / incident): unplanned work consume budget.
- Liga com **04-07** (architectures): refactor estima diferente de greenfield.
- Liga com **04-08** (services vs monolith): cada arquitetura tem cycle time signature.
- Liga com **04-12** (tech leadership): RFC, ADR, comunicação técnica.
- Liga com **04-16** (product/business): roadmap alignment com unit economics.
- Liga com **CAPSTONE-producao / senior**: planning é parte da entrega.

---

## 6. Referências

- **"How Big Things Get Done"**: Bent Flyvbjerg, Dan Gardner.
- **"Software Estimation: Demystifying the Black Art"**: Steve McConnell.
- **"Project Management for the Unofficial Project Manager"**: Kogon, Blakemore.
- **"Thinking in Bets"**: Annie Duke.
- **"Slack: Getting Past Burnout, Busywork, and the Myth of Total Efficiency"**: Tom DeMarco.
- **"NoEstimates"**: Vasco Duarte.
- **"Actionable Agile Metrics"**: Daniel Vacanti (cycle time, throughput, WIP).
- **"Roadmaps Are Dead, Long Live Roadmaps"**: Janna Bastow.
- **Linear Method docs** ([linear.app/method](https://linear.app/method)).
- **Cloudflare engineering blog**: planning posts.
