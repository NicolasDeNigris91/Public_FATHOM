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
