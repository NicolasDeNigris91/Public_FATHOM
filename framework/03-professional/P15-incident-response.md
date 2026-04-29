---
module: P15
title: Incident Response & On-Call — Drills, Runbooks, Postmortems, SLO/SLA
stage: professional
prereqs: [P07]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# P15 — Incident Response & On-Call

## 1. Problema de Engenharia

Sistema vai cair. Não é "se", é "quando". Quanto mais sério o produto, mais cara a hora de downtime e mais pesada a coreografia que separa engenheiro Pleno de Senior. Observability (P07) te dá os sinais; incident response te diz **o que fazer com eles**.

Maioria das equipes faz mal: alertas ruidosos, on-call sem rotation justa, postmortem acusatório virando blame culture, runbook desatualizado, comunicação caótica em incidente, falta de drills (game days), SLO inexistente ou político. Resultado: incidentes longos, time queimado, mesma falha repetindo.

Senior conduz incidentes com calma. Comanda IC (Incident Commander) ou apoia. Conhece blast radius, escalation, customer comms, e como produzir postmortem **blameless** que muda o sistema. Sabe escrever SLOs honestos (RED/USE), error budgets, alerting policies que não acordam time por nada.

Este módulo é a coreografia: severity classification, IC role, comms, runbooks, recovery patterns, postmortem disciplinado, SLO/SLA/SLI, error budgets, chaos engineering, game days. Plus on-call humano (rotation, burnout, comp).

---

## 2. Teoria Hard

### 2.1 Severity classification

Toda org tem matriz. Padrão razoável:
- **SEV1**: produto core down pra todos / data loss / security ativa. 24/7 wake, all-hands.
- **SEV2**: degradação significativa pra subset. Wake on-call.
- **SEV3**: bug visível, workaround. Próximo business day.
- **SEV4**: cosmético / interno.

Critério deve ser **operacional, não emocional**. Documentar exemplos. SEV creep ("tudo é SEV2") destrói responsividade.

### 2.2 SLI / SLO / SLA

- **SLI** (Service Level Indicator): métrica observável (e.g. % requests < 200ms; success rate; queue lag).
- **SLO** (Objective): meta interna (e.g. SLI ≥ 99.9% / 30 dias).
- **SLA** (Agreement): contrato com cliente (compromisso comercial). Geralmente SLO maior gap.

**Error budget** = `1 - SLO`. SLO 99.9% → 0.1% budget = 43min/mês. Quando queima budget, freeze releases até recuperar.

SLO não deve ser 100%. 100% obriga zero risco — bloqueia mudança. 99.9-99.99% típico pra serviço crítico.

SRE Workbook (Google) é literatura central.

### 2.3 RED e USE

- **RED** (Brendan Gregg / Tom Wilkie pra serviços): **R**ate (req/s), **E**rrors (% falha), **D**uration (latência distribuição).
- **USE**: **U**tilization (%), **S**aturation (queue), **E**rrors. Pra recursos/host.

Dashboard padrão de serviço deve cobrir RED. Páginas só com latency média mentem; mostre P50/P95/P99.

### 2.4 Alerting: actionable, não barulhento

Regras boas:
- **Alerta tem ação clara**. Sem ação, é noise.
- **Symptom-based**, não cause-based. Alertar em "user error rate alta", não "node CPU alto" (sintoma do alto pode ser irrelevante).
- **Multi-window multi-burn-rate** (Google SRE): consome budget rápido (curta janela) ou consistente (longa) → page.
- **Tier**: page (crítico, wakes), ticket (importante, business hours), info (FYI).

Anti-pattern: alerta por threshold absoluto sem context (p.ex. "CPU > 80%"). Acorda time por nada.

### 2.5 On-call rotation

Padrão: primary + secondary, rotation semanal, hand-off com runbook e issues abertos. Ferramentas: PagerDuty, Opsgenie, Grafana OnCall, Better Uptime.

Princípios:
- **Comp adequado**. On-call vem com pagamento ou day-off compensatório.
- **Time fair**. Escalas evitam fim-de-semana acumulado.
- **No on-call sem produto pra responder**. Junior on-call sozinho = burnout + bad decisions.
- **Quiet weeks fixed**. Period sem on-call obrigatório.
- **Hand-off ritual**: review de incidentes da semana, tickets pendentes.

### 2.6 Incident command (IC)

Em SEV1/SEV2, alguém comanda:
- **IC**: coordena, não debug.
- **Subject Matter Experts**: investigam.
- **Comms lead**: status pages, customer notifications.
- **Scribe**: timeline.

IC mantém: war room (Slack/Zoom), timeline, decisões, action items. Decisões: "vou fazer rollback agora", "vamos esperar 5 min de evidência".

Em times pequenos, mesma pessoa acumula papéis. Mas explicitar quem está em cada papel evita caos.

### 2.7 Blast radius e mitigation patterns

Antes de fix, **stop the bleeding**:
- **Rollback**: deploy anterior. Sempre primeira opção em pós-deploy.
- **Feature flag off**: se feature flagged, mata sem deploy.
- **Traffic shift**: reduzir % canary, ou shift pra outra região.
- **Rate limit / shed**: aceitar erros pra subset pra preservar core.
- **Failover**: cluster secundário.
- **Scale up**: mais capacidade temporária.
- **DB read replica promotion**: em failure de primary.

Senior **resiste** ao impulso de "find root cause primeiro". Mitigar > investigar em incidente ativo.

### 2.8 Comms durante incidente

- **Status page** atualizado a cada 15-30 min mesmo sem novidade ("Estamos investigando — próximo update às X").
- **Internal**: thread Slack pinned, IC announces decisões.
- **Customer**: linguagem direta, sem culpar terceiros, sem promessa que não pode cumprir. Evite "investigating" indefinido.
- **Post-incident**: comunicação detalhada (postmortem público se SaaS B2B, resumo se B2C).

Atlassian/Cloudflare/GitHub têm bons exemplos públicos. Estude.

### 2.9 Postmortem: blameless

Após incidente, escrever **postmortem**. Princípios:
- **Blameless**: foca no sistema, não na pessoa. Pessoa fez aquilo dado o contexto que tinha; o sistema permitiu.
- **Cinco porquês** (5 whys), Fishbone, ou Causal analysis trees.
- **Action items** atribuídos com prazo. Sem AI, postmortem é teatro.
- **Distinguir contributing factors de root cause** (geralmente não há root único; é cadeia de fatores).
- Compartilhe internamente (e externamente quando apropriado). Aprender é o produto.

Template típico:
- Summary
- Impact (users, duration, revenue)
- Detection (como soubemos)
- Timeline (com timestamps)
- Root cause / contributing factors
- What went well
- What didn't go well
- Lucky factors
- Action items

Cloudflare, GitLab, Stripe publicam postmortems excelentes. Leia.

### 2.10 Runbooks

Pra cada alerta, runbook acompanha. Conteúdo:
- O que esse alerta significa.
- Dashboards relevantes (link).
- Diagnostic steps (queries, logs).
- Mitigations possíveis (rollback, scale, FF off).
- Escalation (quem chamar se X).

Runbook desatualizado é pior que ausência (engana). Test em game days.

### 2.11 Game days e chaos engineering — deep

**Game day**: simulação coordenada. Time se reúne, alguém quebra algo intencionalmente em staging (ou prod com cuidado), time pratica detection/mitigation.

**Chaos engineering** (Netflix, Principles of Chaos Engineering, principlesofchaos.org): hipótese → experimentar → observar → corrigir. Disciplina, não vandalismo.

**Princípios canônicos:**
1. Defina o **steady state** (RED metrics OK, error rate < threshold).
2. Hipótese: "system continua em steady state quando X falha".
3. Inject falha controlada (escopo, blast radius limitado, abort condition definido).
4. Observe se hipótese se mantém. Se não, fix.

**Tooling em produção (2026):**

| Tool | Modelo | Onde brilha | Pegadinha |
|---|---|---|---|
| **LitmusChaos** (CNCF) | K8s-native, CRDs declarativos | Cloud-native stack, GitOps-friendly | Curve de aprendizado em CRDs |
| **Chaos Mesh** (CNCF, PingCAP) | K8s CRDs + dashboard | UX bom, comunidade ativa | K8s-only |
| **Gremlin** | SaaS, agent-based | Enterprise, reporting executivo | Pago, agent footprint |
| **AWS Fault Injection Service (FIS)** | AWS-native | Stack AWS, integra IAM/CloudWatch | Apenas AWS |
| **Azure Chaos Studio** | Azure-native | Stack Azure | Apenas Azure |
| **toxiproxy** (Shopify) | TCP proxy entre serviços | Network failures (latency, drop, partition) — local dev e staging | Não cobre process kill |
| **Chaos Monkey** (legacy Netflix) | Random instance termination | Histórico, ainda usado por times maduros | Cobre só 1 dimensão |
| **Pumba** | Docker-native | Local dev, CI | Container-only |
| **PowerfulSeal** | K8s | Random pod kill com policies | Manutenção light |

**Tipos de injeção comuns:**
- **Process/pod kill** — testa redundância, restart logic.
- **Network latency** — testa timeouts, circuit breakers.
- **Network partition** — testa split-brain handling em quorum systems.
- **Packet drop / corruption** — testa retry e checksums.
- **CPU/memory stress** — testa autoscaling, throttling.
- **Disk full / I/O slowdown** — testa logging behavior, fallbacks.
- **DNS failure** — surpreendentemente comum em prod, raramente testado.
- **Clock skew** — testa systems sensíveis a tempo (token expiration, distributed locks com TTL).
- **Time-of-day failure** (artificial peak load).

**Pre-requisitos pra chaos engineering valer:**
- **Observability sólida**: sem RED + USE não dá pra detectar abort condition. Faça P07 antes.
- **Alerting funcional**: senão você fura SLO sem perceber em ambiente de teste.
- **Runbooks por feature**: chaos vai expor cenários documentados ou não.
- **Stakeholder buy-in**: chaos em prod sem comms é hostil.

**Steady-state metrics típicos:**
- Error rate < 0.1%
- p99 latency < 200ms
- Throughput entre 80-120% do baseline
- 0 alertas críticos

**Anti-patterns:**
- Chaos em prod sem **abort condition** automático (auto-rollback).
- Chaos sem **on-call notificado** — gera incidente real.
- Chaos só em staging — não captura coisas que **só acontecem em prod scale** (DNS quirks, CDN cache states, load balancer states).
- "Chaos engineering" como blame deflector ("a falha foi do experimento, não do design").
- Single experiment, single time. Disciplina é **continuous chaos** — toolings de cima rodam programados.

**Maturity ladder:**
1. **Game days manuais** em staging. Time pratica processo.
2. **Game days em prod** com escopo limitado (1 service, off-peak).
3. **Chaos automatizado em staging** (CI ou scheduled).
4. **Chaos automatizado em prod** com abort/blast radius. Netflix-tier.

### 2.12 Disaster Recovery (DR)

Cenários de "região inteira foi" ou "DB corrompido":
- **Backup strategy**: full + WAL/incremental, encrypted, off-site. Test restore (regularmente — backup nunca testado é assumido funcionar).
- **RPO** (Recovery Point Objective): quanto dado podemos perder. RPO 1h = backup hourly.
- **RTO** (Recovery Time Objective): quanto tempo pra estar de volta. RTO 30 min exige quase-quente standby.
- **Multi-region**: active-passive ou active-active. Custos crescem.
- **DR drill**: simule restore e cronometre.

### 2.13 Customer comms templates

Pre-built. Exemplo:
- "Estamos investigando reports de latência elevada em [serviço]. Investigando."
- "Identificamos a causa: [breve]. Trabalhando em mitigação. ETA X minutos."
- "Mitigação aplicada às HH:MM. Monitorando."
- "Resolvido às HH:MM. Postmortem em 5 dias úteis."

Tom: factual, breve, frequência alta. "Sorry, working on it" é fine; especulação é não.

### 2.14 War-room hygiene

- 1 canal pra coordenação (focused). Comentários laterais em outro.
- Decisões anunciadas explicitamente.
- Timestamp em snippets ("18:42 — observamos error rate cair").
- IC anuncia novos players entrantes.

Após resolução, dump do canal vira material do postmortem.

### 2.15 Deploy safety

Reduzir incidentes começa em deploy:
- **Canary**: 1% → 5% → 25% → 100% com pausas e métricas.
- **Blue-green**: dois envs idênticos, switch atomicamente.
- **Feature flags**: separar deploy de release.
- **Rollback automático**: dispara em métricas piores que baseline (LaunchDarkly, FF + monitor).
- **Schema changes**: backward-compatible primeiro (add column, backfill, deploy reader, deploy writer, drop old).

### 2.16 Burnout management

On-call queima. Sinais: irritabilidade, sleep ruim, retirada do trabalho. Mitigations:
- Comp e tempo justo.
- Limite max paginations/semana (escalation se exceder).
- Quiet weeks reais.
- Therapy/EAP disponível.
- Manager sniff-test mensal.

Senior também serve cuidando do time, não só da uptime.

### 2.17 Métricas de programa de incident

- **MTTD** (Mean Time To Detect).
- **MTTR** (Mean Time To Recovery).
- **MTBF** (Mean Time Between Failures).
- Frequência por sev.
- Recurrence rate.

Tendência matters. Bench externo pouco útil; compare consigo mesmo.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Definir SLI, SLO, SLA, error budget e como interagem.
- Listar matriz SEV1-SEV4 com critérios operacionais.
- Justificar symptom-based vs cause-based alerting.
- Listar 5 mitigation patterns em incidente (rollback, FF off, traffic shift, scale, failover).
- Explicar IC role e separação com SME.
- Diferenciar RPO e RTO; conectar com backup strategy.
- Estruturar postmortem blameless: seções obrigatórias.
- Justificar canary / blue-green em vez de rolling sem control.
- Explicar multi-window multi-burn-rate alerting.
- Justificar test de restore periódico.
- Desenhar template de comm para customer durante incidente.

---

## 4. Desafio de Engenharia

Construir **programa de incident response da Logística** com runbooks, SLOs, alerts, e dois game days simulados.

### Especificação

1. **SLOs definidos**:
   - Doc `SLOS.md` declarando SLI/SLO pra: 1) `POST /orders` success rate ≥ 99.5% / 30d; 2) latency P95 < 800ms; 3) tracking pings reaching DB ≤ 10s p99.
   - Burn-rate alerts (Prometheus rules) multi-window: 1h-fast burn + 6h-slow burn.
2. **Runbooks** (em `runbooks/`):
   - Cada alert com runbook próprio: descrição, dashboards, diagnostic steps, mitigations, escalation.
   - Mínimo 6 alerts cobrindo p95 latency, error rate, queue lag, replica lag, disk fill, certificate expiry.
3. **Postmortem template** em `templates/postmortem.md`.
4. **Status page**: stub em `/status` retornando estado dos componentes (DB, cache, queue, external APIs) via real probes.
5. **Game day 1 — DB primary down**:
   - Script `chaos/db-primary-down.sh` pausa container Postgres primary.
   - Equipe (você, simulando IC + SME) detecta via alert, mitiga (failover pra replica), escreve postmortem real.
6. **Game day 2 — região indisponível**:
   - Block egress pra third-party (geocoder).
   - Praticar circuit breaker, fallback (cache stale), customer comm.
   - Postmortem real.
7. **Disaster recovery drill**:
   - Restore Postgres backup recente em instance limpa, replay WAL, validate row counts. Cronometre RTO.
8. **Métricas de programa**:
   - Dashboard com MTTD, MTTR, count por sev, action item burn-down.
9. **Doc `ON-CALL.md`**:
   - Rotation, comp policy, hand-off ritual, escalation chain.

### Restrições

- Alerts symptom-based (não thresholds CPU random).
- Postmortems blameless (review checklist).
- Runbooks atualizados pelo menos 1x por incidente.
- Sem alertas que não tenham ação clara.

### Threshold

- 2 game days completos com postmortems reais.
- DR drill com tempo medido e gap analysis.
- SLOs documentados com burn-rate alerts funcionando (testes simulando burn-rate alta disparam).
- Status page reflete estado real.

### Stretch

- **Chaos Mesh** ou **Litmus** instalado em K8s, scheduled experiments.
- **Synthetic monitoring** (Checkly, k6 cloud, ou cron rodando smoke tests).
- **Auto-remediation**: alert dispara workflow (rollback automático em deploy ruim).
- **Customer comm automation**: status page integrada com PagerDuty webhook → atualiza componente.
- **Postmortem Bot**: template gerado automaticamente quando incident é declarado.

---

## 5. Extensões e Conexões

- Liga com **P02** (Docker), **P03** (K8s): ambiente onde failures acontecem.
- Liga com **P04** (CI/CD): canary, blue-green, rollback.
- Liga com **P07** (Observability): SLI/SLO se baseiam em métricas/traces/logs.
- Liga com **P08** (Security): incident response também pra breach.
- Liga com **A14** (real-time): degradação user-facing visível.
- Liga com **S04** (resilience): patterns que reduzem incidentes (circuit breaker, bulkhead).
- Liga com **S12** (tech leadership): escrever postmortem é leadership.
- Liga com **CAPSTONE-professional**: Logística v2 inclui isto.

---

## 6. Referências

- **"Site Reliability Engineering"** — Beyer et al. (Google SRE Book, gratuito).
- **"The Site Reliability Workbook"** — Beyer et al. (gratuito).
- **"Seeking SRE"** — David Blank-Edelman.
- **PagerDuty Incident Response docs** ([response.pagerduty.com](https://response.pagerduty.com/)).
- **"Chaos Engineering"** — Casey Rosenthal, Nora Jones.
- **"Implementing Service Level Objectives"** — Alex Hidalgo.
- **Cloudflare blog** — postmortems.
- **GitHub Engineering** — postmortems.
- **AWS Builders' Library** — operational excellence essays.
- **John Allspaw** — Etsy / Adaptive Capacity Labs writings on incidents.
