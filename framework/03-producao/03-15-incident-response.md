---
module: 03-15
title: Incident Response & On-Call, Drills, Runbooks, Postmortems, SLO/SLA
stage: producao
prereqs: [03-07]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
quiz:
  - q: "Em incidente ativo, qual é a prioridade correta entre mitigation e investigation?"
    options:
      - "Sempre find root cause primeiro, mitigation só após entender tudo"
      - "Stop the bleeding (rollback, FF off, traffic shift) primeiro; root cause investigation depois"
      - "Mitigation e investigation simultaneamente, sempre"
      - "Apenas investigation; mitigation é responsabilidade de outro time"
    correct: 1
    explanation: "Senior resiste ao impulso de investigar primeiro. Mitigar (rollback, feature flag, traffic shift) preserva customer enquanto investigation continua. Confundir mitigated com resolved esconde fragilidade."
  - q: "Por que o Incident Commander (IC) não deve fazer hands-on debug?"
    options:
      - "Porque IC não tem skill técnico"
      - "Porque IC debugando = ninguém coordenando; coordenação, decisões e comms são tempo full"
      - "Porque é regra ITIL formal"
      - "Porque debug é menos importante que comms"
    correct: 1
    explanation: "IC sem hands-on é regra dura. IC pergunta 'qual a próxima ação?', autoriza decisões, mantém timeline e comms. Quando IC mergulha em logs, ninguém coordena, e estrutura de incident colapsa."
  - q: "Qual é a tabela canônica Google SRE para multi-window multi-burn-rate alerts em SLO 99.9%?"
    options:
      - "1 alert único quando error rate > 1%"
      - "4 alerts: 14.4x burn (1h/5m), 6x (6h/30m), 3x (24h/2h), 1x (72h/6h), com short window pra precisão e long window contra flap"
      - "Alert apenas quando budget mensal < 10%"
      - "1 alert por hora baseado em moving average"
    correct: 1
    explanation: "MWMBR pega fast-burn (page now em 14.4x = budget exhaust em 2h) e slow-burn (ticket em 1x = 30d). Alert só dispara quando AMBAS janelas excedem; long evita flap, short garante precisão temporal."
  - q: "Por que 'human error' nunca é root cause aceitável em postmortem blameless?"
    options:
      - "Porque humanos nunca erram"
      - "Porque a pergunta correta é 'por que o sistema/processo permitiu o humano falhar?' — falta guardrail, CI gap, runbook ambíguo"
      - "Porque seria bullying"
      - "Porque postmortems devem ser tecnicamente puros"
    correct: 1
    explanation: "Just Culture (Sidney Dekker): pessoa fez aquilo dado contexto que tinha; o sistema permitiu. Tracing pra system gap (missing guardrail, CI miss, ambiguous process) gera action items acionáveis. 'Take more care' nunca é action item."
  - q: "Qual é a diferença entre RPO e RTO em DR strategy?"
    options:
      - "RPO e RTO são sinônimos"
      - "RPO = quanto dado podemos perder (define backup frequency); RTO = tempo até estar de volta (define standby quente vs frio)"
      - "RPO é para region failover; RTO é para single-instance"
      - "RPO mede performance; RTO mede recovery"
    correct: 1
    explanation: "RPO 1h significa backup hourly aceitável. RTO 30min exige standby quase quente. São dimensões ortogonais que dirigem decisões custo/complexidade diferentes em DR architecture."
---

# 03-15, Incident Response & On-Call

## 1. Problema de Engenharia

Sistema vai cair. Não é "se", é "quando". Quanto mais sério o produto, mais cara a hora de downtime e mais pesada a coreografia que separa engenheiro Pleno de Senior. Observability (03-07) te dá os sinais; incident response te diz **o que fazer com eles**.

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

SLO não deve ser 100%. 100% obriga zero risco, bloqueia mudança. 99.9-99.99% típico pra serviço crítico.

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

#### First 15 minutes — script operacional

Os primeiros 15 minutos definem se incidente vira pequeno bug ou page-1-news. Roteiro:

**T+0 (alarme dispara, on-call recebe page):**
1. Acknowledge em < 5 min (SLA típico).
2. Open incident channel (`#incident-2026-05-01-tracking-down` em Slack — naming consistente).
3. Post inicial fixo (template):
   ```
   :rotating_light: NEW INCIDENT
   Severity: SEV2 (suspect)
   Trigger: Tracking endpoint p99 > 5s for 3 min
   IC: @yourname
   Status: Investigating
   Will update at HH:MM (5min from now)
   ```

**T+0 a T+5 (triagem):**
4. Confirma severidade via dashboards: error rate, latency p99, traffic patterns, recent deploys.
5. Decide se escala pra SEV1 (paging adicional) ou SEV2 (continua solo).
6. Anota timeline em mensagem fixa do canal:
   ```
   T+02 — Confirmed: tracking endpoint p99 6.2s, error rate 3% (baseline 0.05%)
   T+03 — Last deploy 2h ago, irrelevant
   T+05 — Postgres pg_stat_activity shows long-running queries on `tracking_pings` table
   ```

**T+5 a T+10 (mitigation > investigation):**
7. **Stop the bleeding** primeiro (§2.7), root cause depois.
8. Ações reversíveis preferidas: rollback, feature flag off, traffic shift, scale up. Última opção: kill query/process.
9. Comunica decisão antes de executar:
   ```
   IC decision @ T+07: scaling tracking-svc HPA min 5 → 15. Will observe for 3 min.
   ```

**T+10 a T+15 (status update + handoff prep):**
10. Status page atualizado (template em §2.13).
11. Identifica handoff se incidente vai durar > 1h (timezone shift, oncall pessoal limit).
12. Timeline atualizada com cada decisão.

#### Decision log template (in-channel)

Cada decisão importante vira mensagem do IC com este formato:
```
DECISION @ T+XX
What: [ação concreta]
Why: [hipótese sustentada por evidência]
Risk: [o que pode dar errado]
Reversal: [como desfazer se errado]
Observed effect: [após executar, o que aconteceu]
```

Exemplo:
```
DECISION @ T+22
What: Disabling feature flag `realtime_tracking_v2` for all tenants
Why: New code path correlates with p99 spike start (deploy hash abc123 at T-95min)
Risk: Tenants on v2 lose live updates; fall back to 30s polling
Reversal: Re-enable flag in LaunchDarkly; instant
Observed effect: T+23 — p99 dropped 6.2s → 280ms. Error rate 3% → 0.04%. Confirmed root cause.
```

Esse formato em produção significa: postmortem se escreve sozinho. Timeline + Why + Reversal estão prontos.

### 2.6.1 War-room rituals (Slack/Zoom)

Discipline operacional dentro do canal/call:

- **Pinned message** com IC atual + status + último update time. Atualiza a cada 15-30min mesmo sem progresso ("Still investigating, no new info — next update HH:MM").
- **Threaded discussions** pra investigação técnica; **canal main** só pra decisões e updates externos. Senão channel vira ilegível.
- **Voice channel paralelo** (Zoom/Discord) pra debug rápido entre 2-3 pessoas; resultado vai pra canal text.
- **No silent investigation**: se você está olhando algo, fala. "Estou olhando logs do payment-svc T-30min; status em 5min". Senão IC não sabe o que está coberto.
- **Timeboxing**: se uma hipótese não rendeu em 10min, IC chama outra direção.
- **Eat / break protocol**: incidente longo (> 2h), IC força rotation. SME esgotado é SME que erra.

Anti-patterns:
- IC vira debugger ("eu fix isso, não toca"). Promove novo IC e vire SME.
- "Já vi isso antes": confirme com dados antes de assumir.
- Lurkers (10+ pessoas no canal sem papel): pede pra silenciar ou sair. Voyeurismo de incidente é bullshit.

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

- **Status page** atualizado a cada 15-30 min mesmo sem novidade ("Estamos investigando, próximo update às X").
- **Internal**: thread Slack pinned, IC announces decisões.
- **Customer**: linguagem direta, sem culpar terceiros, sem promessa que não pode cumprir. Evite "investigating" indefinido.
- **Post-incident**: comunicação detalhada (postmortem público se SaaS B2B, resumo se B2C).

Atlassian/Cloudflare/GitHub têm bons exemplos públicos. Estude.

#### Templates concretos

**Status page — Investigating** (publica em < 10min):
```
[INVESTIGATING] Elevated error rates on tracking endpoint
HH:MM UTC — We are investigating reports of slow page loads and elevated
error rates affecting real-time tracking for some customers. Order
creation and payment processing remain operational. Next update HH:MM UTC.
```

**Status page — Identified** (após mitigation começar):
```
[IDENTIFIED] Cause identified, mitigation in progress
HH:MM UTC — We have identified a configuration change related to a
recent deploy that is causing the elevated latency. We are rolling
back the change and expect recovery within 15 minutes. Other services
unaffected. Next update HH:MM UTC.
```

**Status page — Monitoring**:
```
[MONITORING] Mitigation deployed, monitoring for stability
HH:MM UTC — Rollback completed at HH:MM UTC. Latency and error rates
have returned to baseline. We are monitoring closely for the next 30
minutes before marking resolved.
```

**Status page — Resolved**:
```
[RESOLVED] Incident resolved
HH:MM UTC — All systems are operating normally. We will publish a full
post-incident report within 5 business days. We apologize for the
disruption and thank you for your patience.
```

**Customer email (para tenants high-tier após SEV1/SEV2):**
```
Subject: Service disruption on YYYY-MM-DD — what happened and what's next

Hello [tenant name],

Between HH:MM and HH:MM UTC on YYYY-MM-DD, our [feature] experienced
[symptom — slow loading / elevated errors / partial unavailability].
You may have seen [observable effect].

What happened (briefly): [1-2 sentence root cause, no jargon].

Impact on you: [specific to this tenant if known, e.g. "12 of your
orders had delayed status updates between 14:00-14:18, but no orders
were lost or double-charged"].

What we did: [mitigation taken].

What we're doing next: [concrete actions with owners and rough dates].

Full post-incident report: [link, by date].

Direct contact for questions: [name + email].

— [team or company]
```

**Anti-patterns em comms**:
- "Vamos investigar" sem timeline → cliente não sabe quando voltar.
- "Não foi nossa culpa" / "fornecedor X falhou" → você é responsável pelo seu serviço, mesmo se causa é upstream.
- Linguagem técnica em status público (`Postgres connection pool exhausted because pgbouncer transaction mode...`). Traduza pra impacto observável.
- Promessa de recovery sem dado (`em 5 minutos`). Use `we expect within X minutes, will update by Y`.
- Postmortem com "lessons learned" vazias. Cada lição = action item com owner + due date.

Estude exemplos canônicos publicados:
- **Cloudflare** ([blog.cloudflare.com](https://blog.cloudflare.com/tag/postmortem/)): técnicos profundos, padrão da indústria.
- **GitHub** ([github.blog/tag/availability-report](https://github.blog/category/engineering/infrastructure/)): mensais com lessons.
- **Atlassian** ([atlassian.com/engineering](https://www.atlassian.com/engineering)): customer comms exemplares.
- **AWS post-event summary**: terse, focado em customer impact.

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

### 2.11 Game days e chaos engineering, deep

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
| **toxiproxy** (Shopify) | TCP proxy entre serviços | Network failures (latency, drop, partition), local dev e staging | Não cobre process kill |
| **Chaos Monkey** (legacy Netflix) | Random instance termination | Histórico, ainda usado por times maduros | Cobre só 1 dimensão |
| **Pumba** | Docker-native | Local dev, CI | Container-only |
| **PowerfulSeal** | K8s | Random pod kill com policies | Manutenção light |

**Tipos de injeção comuns:**
- **Process/pod kill**: testa redundância, restart logic.
- **Network latency**: testa timeouts, circuit breakers.
- **Network partition**: testa split-brain handling em quorum systems.
- **Packet drop / corruption**: testa retry e checksums.
- **CPU/memory stress**: testa autoscaling, throttling.
- **Disk full / I/O slowdown**: testa logging behavior, fallbacks.
- **DNS failure**: surpreendentemente comum em prod, raramente testado.
- **Clock skew**: testa systems sensíveis a tempo (token expiration, distributed locks com TTL).
- **Time-of-day failure** (artificial peak load).

**Pre-requisitos pra chaos engineering valer:**
- **Observability sólida**: sem RED + USE não dá pra detectar abort condition. Faça 03-07 antes.
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
- Chaos sem **on-call notificado**: gera incidente real.
- Chaos só em staging, não captura coisas que **só acontecem em prod scale** (DNS quirks, CDN cache states, load balancer states).
- "Chaos engineering" como blame deflector ("a falha foi do experimento, não do design").
- Single experiment, single time. Disciplina é **continuous chaos**: toolings de cima rodam programados.

**Maturity ladder:**
1. **Game days manuais** em staging. Time pratica processo.
2. **Game days em prod** com escopo limitado (1 service, off-peak).
3. **Chaos automatizado em staging** (CI ou scheduled).
4. **Chaos automatizado em prod** com abort/blast radius. Netflix-tier.

#### Game day prático com toxiproxy — Logística scenarios

Toxiproxy (Shopify, Go) é TCP proxy that injects faults. Setup mínimo pra game day em staging Logística:

```bash
# Sobe toxiproxy entre app e Postgres/Redis
docker run -d --name toxiproxy --network=logistica-net \
  -p 8474:8474 -p 5435:5435 -p 6380:6380 \
  ghcr.io/shopify/toxiproxy

# Cria proxies (CLI ou HTTP API)
toxiproxy-cli create -l 0.0.0.0:5435 -u postgres-real:5432 postgres
toxiproxy-cli create -l 0.0.0.0:6380 -u redis-real:6379 redis

# App aponta DATABASE_URL=postgres://...:5435/db; REDIS_URL=redis://...:6380
```

**Cenário 1 — Postgres latency spike (simula failover lento, IO degraded):**
```bash
toxiproxy-cli toxic add postgres -t latency -a latency=500 -a jitter=200
# Roda durante 5min. Métricas esperadas: p99 latency sobe; circuit breaker em payment-svc abre?
# Steady-state hipótese: error rate < 1%; SLO p99 < 800ms NÃO É mantido.
# Aprendizado: precisa async fallback ou maior retry budget.
toxiproxy-cli toxic remove postgres -n latency_downstream
```

**Cenário 2 — Redis cache fail (queda total de cache):**
```bash
toxiproxy-cli toxic add redis -t down
# 10min. Hipótese: app degrada para "cache miss" em todas requests; latency sobe mas não falha.
# Validar: app cai ou recupera-se? Cache stampede protection (singleflight) funcionou?
# Em Logística: tracking real-time depende de Redis pub/sub — degrada pra polling DB?
toxiproxy-cli toxic remove redis -n down
```

**Cenário 3 — Network partition entre app e payment provider (Stripe):**
```bash
# Se Stripe API estivesse atrás de toxiproxy
toxiproxy-cli toxic add stripe -t timeout -a timeout=0   # close conn imediato
# 15min. Hipótese: orders ficam em estado "payment_pending"; webhook retry quando volta.
# Test: verifica se nenhuma cobrança duplicou (idempotency-key §2.4 funcionou).
```

**Cenário 4 — Bandwidth limit (mobile carrier ruim):**
```bash
toxiproxy-cli toxic add api-public -t bandwidth -a rate=64   # 64 KB/s
# Simula 3G lento de courier app no campo. Test: app courier cai ou degrada elegantemente?
# Long polling timeout? WebSocket reconnect com backoff?
```

**Cenário 5 — Slow close (TCP ZOMBIE connections):**
```bash
toxiproxy-cli toxic add postgres -t slow_close -a delay=30000   # 30s pra fechar
# 5min. Hipótese: connection pool esgota se cleanup ruim. Detect: `pg_stat_activity` cresce.
# Force scenario que mata pool com max=20 e descobre: precisamos de `idle_in_transaction_session_timeout`.
```

**Run it via script (game day automation):**

```bash
#!/usr/bin/env bash
# game-day-2026-01.sh
set -e
echo "[$(date)] Starting game day. Watcher: $WATCHER_NAME. On-call notified."

declare -a SCENARIOS=(
  "postgres:latency:latency=500,jitter=200:300"
  "redis:down::600"
  "api-public:bandwidth:rate=64:300"
)

for s in "${SCENARIOS[@]}"; do
  IFS=':' read -r proxy toxic args duration <<< "$s"
  echo "[$(date)] Injecting $toxic on $proxy for ${duration}s"
  toxiproxy-cli toxic add "$proxy" -t "$toxic" $(echo "$args" | tr ',' '\n' | sed 's/^/-a /')
  sleep "$duration"

  # Abort condition: error rate > 5% interrompe
  err_rate=$(curl -s prometheus/api/v1/query?query=rate(http_errors[5m]) | jq .data.result[0].value[1])
  if (( $(echo "$err_rate > 0.05" | bc -l) )); then
    echo "[$(date)] ABORT: error rate $err_rate > 5%"
    toxiproxy-cli toxic remove "$proxy" -n "${toxic}_downstream"
    exit 1
  fi

  toxiproxy-cli toxic remove "$proxy" -n "${toxic}_downstream"
  sleep 60   # cooldown entre cenários
done

echo "[$(date)] Game day complete. Postmortem em 24h."
```

**Postmortem template após game day** (mesmo se passou):
- Hipóteses confirmadas / refutadas (lista).
- Métricas observadas (gráficos Grafana exportados).
- Bugs descobertos (incluindo "tudo passou mas tive que mexer em X").
- Action items: PRs de melhoria com owner + deadline.
- Próximo game day: data + scenarios novos baseados em buracos descobertos.

### 2.12 Disaster Recovery (DR)

Cenários de "região inteira foi" ou "DB corrompido":
- **Backup strategy**: full + WAL/incremental, encrypted, off-site. Test restore (regularmente, backup nunca testado é assumido funcionar).
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
- Timestamp em snippets ("18:42, observamos error rate cair").
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

### 2.18 SLO error budget burn rate alerts — multi-window multi-burn-rate

SLO sem burn rate alerts vira poster decoration. Time vê SLO mensal "99.9%" mas só descobre incidente depois que budget já queimou. Multi-window multi-burn-rate (MWMBR), pattern Google SRE Workbook 2018+, é o consenso atual: 4 alerts em 4 janelas distintas pegam fast-burn (page now) e slow-burn (ticket) sem flap. Sem MWMBR, alert ou é tarde demais ou histérico.

**Foundation: error budget mecânica**

- SLO 99.9% mensal = 0.1% budget = 43.2min de erro permitido em 30 dias.
- Burn rate = quão rápido você gasta vs ritmo "saudável" (que gastaria budget exato em 30d).
- Burn rate 1x = vai gastar tudo em 30d. Burn rate 14.4x = vai gastar tudo em 2h. Burn rate 6x = vai gastar tudo em 5d.

**Tabela canônica Google SRE — 4 alerts**

| Severity | Burn rate | Long window | Short window | Tempo até budget exhausted |
|---|---|---|---|---|
| **Critical (page)** | 14.4x | 1h | 5m | 2h |
| **Critical (page)** | 6x | 6h | 30m | 5d |
| **Warning (ticket)** | 3x | 24h | 2h | 10d |
| **Warning (ticket)** | 1x | 72h (3d) | 6h | 30d |

- Long window: estabilidade contra flap.
- Short window: precisão temporal (não dispara em incident já recovered).
- Alert dispara quando AMBAS janelas excedem o burn rate threshold.

**PromQL multi-window — exemplo Logística**

SLI: % de requests HTTP 200-499 (não 5xx) no path `/api/orders`. Target 99.9%.

```promql
# SLI core: success ratio em janela
sli:http_success_ratio:5m =
  sum(rate(http_requests_total{job="api",path="/api/orders",status!~"5.."}[5m]))
  /
  sum(rate(http_requests_total{job="api",path="/api/orders"}[5m]))

# Error rate (1 - success)
slo:http_error_rate:5m = 1 - sli:http_success_ratio:5m
```

Recording rules pra cada janela:

```yaml
groups:
- name: orders_slo_burn
  interval: 30s
  rules:
    - record: slo:burn_rate:5m
      expr: |
        (
          1 - (
            sum(rate(http_requests_total{job="api",path="/api/orders",status!~"5.."}[5m]))
            /
            sum(rate(http_requests_total{job="api",path="/api/orders"}[5m]))
          )
        ) / 0.001
    - record: slo:burn_rate:1h
      expr: |
        (
          1 - (
            sum(rate(http_requests_total{job="api",path="/api/orders",status!~"5.."}[1h]))
            /
            sum(rate(http_requests_total{job="api",path="/api/orders"}[1h]))
          )
        ) / 0.001
    # ... 30m, 6h, 2h, 24h, 6h, 72h
```

**Alerting rules — 4 alerts MWMBR**

```yaml
groups:
- name: orders_slo_alerts
  rules:
    - alert: OrdersSLOFastBurn1h
      expr: slo:burn_rate:1h > 14.4 and slo:burn_rate:5m > 14.4
      for: 2m
      labels: { severity: critical, slo: orders_availability }
      annotations:
        summary: "Orders SLO burning 14.4x — budget exhaust in 2h"
        runbook: "https://wiki/runbooks/orders-slo-fast-burn"
        dashboard: "https://grafana/d/orders-slo"

    - alert: OrdersSLOSlowBurn6h
      expr: slo:burn_rate:6h > 6 and slo:burn_rate:30m > 6
      for: 15m
      labels: { severity: critical, slo: orders_availability }
      annotations:
        summary: "Orders SLO burning 6x — budget exhaust in 5d"
        runbook: "https://wiki/runbooks/orders-slo-slow-burn"

    - alert: OrdersSLOTicketBurn24h
      expr: slo:burn_rate:24h > 3 and slo:burn_rate:2h > 3
      for: 1h
      labels: { severity: warning, slo: orders_availability }

    - alert: OrdersSLOTicketBurn72h
      expr: slo:burn_rate:72h > 1 and slo:burn_rate:6h > 1
      for: 3h
      labels: { severity: warning, slo: orders_availability }
```

- `for: Xm` adiciona segundo nível de hysteresis. Sem ele, alert flap em transient spike.
- Severity mapping: `critical` -> PagerDuty/oncall; `warning` -> Linear/Jira ticket auto-criado.

**Routing Alertmanager**

```yaml
route:
  receiver: default
  group_by: [alertname, slo]
  routes:
    - matchers: [severity="critical"]
      receiver: pagerduty
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 4h
    - matchers: [severity="warning"]
      receiver: linear-jira
      group_wait: 10m
      repeat_interval: 24h
```

**Dashboard Grafana — 3 panels essenciais**

- **Burn rate atual** (gauge): valor em 5m, color thresholds (verde < 1, amarelo 1-3, vermelho > 6).
- **Budget consumed** (single stat): `100 * (sum(error_count_30d) / (allowed_errors_30d))` com warning > 50%, danger > 80%.
- **Burn rate over time** (timeseries): 4 lines (5m, 1h, 6h, 24h) overlaid; horizontal lines em thresholds 1x/3x/6x/14.4x.

**SLO definition document — template**

```yaml
# slos/orders-availability.yaml
service: orders-api
slo:
  name: orders_availability
  target: 0.999
  window: 30d
  description: "% requests com status < 500 no path /api/orders"
sli:
  metric: http_requests_total
  filters: { job: "api", path: "/api/orders" }
  good: { status: "!~5.." }
  total: {}
alerts:
  - severity: critical
    burn_rate: 14.4
    long_window: 1h
    short_window: 5m
  - severity: critical
    burn_rate: 6
    long_window: 6h
    short_window: 30m
  - severity: warning
    burn_rate: 3
    long_window: 24h
    short_window: 2h
  - severity: warning
    burn_rate: 1
    long_window: 72h
    short_window: 6h
```

- Tools que processam isso: Pyrra, Sloth (Spotify), OpenSLO spec (CNCF Sandbox 2024).
- Sloth/Pyrra geram recording rules + alerting rules + dashboards Grafana automatic do YAML.

**Multi-SLO handling**

- Latency SLO (p99 < 300ms) é segundo SLO ortogonal a availability. MWMBR também aplica.
- Compõe: páginas só quando ambos burn juntos > X horas pode ser pattern (sinaliza incident real, não saturation pontual).
- Anti-pattern: 1 SLO por endpoint × 50 endpoints = alert spam. Agrupe por user journey ("place order", "track delivery") com SLI composto.

**Anti-patterns observados**

- **Single window alert** (`error_rate > 1% for 5m`): flap; ou tarde demais.
- **Burn rate sem short window check**: dispara após incident já recovered (long window ainda alto residual).
- **SLO target irreal (99.999%)**: budget mensal de 26s. Time fica congelado pelo medo; budget queima em qualquer deploy real.
- **SLO de coisa que customer não vê**: cache hit rate, internal queue depth — vira metric, não SLO. SLO espelha experiência customer.
- **Sem error budget policy**: budget queima e nada acontece. Policy: budget < 10% -> freeze deploys non-critical até next window.
- **Alert sem runbook**: oncall acordado às 3h sem ação clara. Toda alert page -> runbook obrigatório com first 3 commands.

**Error budget policy template**

```
Budget consumed | Action
----------------+-----------------------------------------
< 50%           | Continue normal velocity
50-80%          | Reduce risk: extra review on changes to service
80-100%         | Freeze non-critical deploys; focus reliability
> 100%          | Hard freeze; postmortem do que queimou; reset
```

Cruza com **03-07** (observability foundation pra SLI), **03-15 §2.7** (postmortem), **03-15 §2.10** (runbook é mandatory pra cada SLO alert), **04-12 §2.x** (eng leadership define SLO + budget policy com produto).

### 2.19 Incident command structure + blameless postmortem template + RCA techniques

Incident sem estrutura vira chat caótico: 12 engenheiros no Slack, ninguém decide, status page silenciosa, customer support cego. Incident Command System (ICS), originário da resposta a incêndios florestais (NIMS, FEMA), foi adaptado por Google SRE e PagerDuty pra software: papéis fixos, decisão centralizada, scribe registra timeline. Sem isso, postmortem vira "lembra o que aconteceu?" 5 dias depois. Combine ICS com blameless culture (Sidney Dekker, _Just Culture_, 2007) e RCA estruturada — caso contrário action items viram "tomar mais cuidado".

**Roles ICS adaptados pra software**

- **Incident Commander (IC)**: dono da coordenação, decisões e comms. NÃO debugs hands-on. Pergunta "qual a próxima ação?", autoriza rollback, decide quando escalar SEV. IC sem hands-on é regra dura — IC debugando = ninguém coordenando.
- **Operations Lead (Ops)**: hands-on remediation. Restart, rollback, feature flag off, traffic shift. Reporta ao IC; não improvisa decisões de comms.
- **Comms Lead**: status page, customer support brief, exec update interno. Cadence de 30min durante active incident.
- **Scribe**: timeline em real-time (Slack thread, Notion, Google Doc). Timestamps UTC, decisão por linha. Sem scribe, postmortem é ficção.
- **Subject Matter Expert (SME)**: puxado quando system-specific knowledge é necessário (DBA pra Postgres, network eng pra VPC peering). Sai do incident quando a área dele estabiliza.

Mínimos por SEV: SEV1 = 1 IC + 1 Ops + 1 Comms; SEV2 = 1 IC + 1 Ops (Comms opcional, status page automatizado serve).

**Severity (SEV) levels — matriz operacional**

| Level | Customer impact | Response time | Eg. Logística |
|---|---|---|---|
| **SEV0** | Total outage; data loss risk | Instant page-out | Postgres primary down; orders perdidos |
| **SEV1** | Major feature broken; large customer % | < 5min ack | New orders fail; tracking broken |
| **SEV2** | Important feature degraded; subset customers | < 15min ack | Search slow; courier app crash em subset |
| **SEV3** | Minor degradation; few customers | < 1h ack (business hours) | Wrong icon; rare browser bug |
| **SEV4** | Internal/cosmetic | Best-effort | Outdated docs; staging flake |

SEV é decisão do IC nos primeiros 5min. SEV inflation (tudo vira SEV1) gera fatigue; SEV deflation atrasa comms. Reavalie a cada 30min.

**Incident lifecycle**

Detect (alert/customer report) → Acknowledge (oncall paged) → Triage (IC define SEV, abre canal) → Mitigate (stop bleeding: rollback, feature flag, traffic shift) → Resolve (root cause fixed em prod) → Postmortem (within 5 business days) → Action items (tracked, owner, due date, completed).

Mitigate ≠ Resolve. Rollback pra last green = mitigated, customer servido. Resolved = root cause investigado e fixed permanente. Confundir os dois esconde fragilidade — incident "fechado" volta semana seguinte.

**IC playbook — first 10 minutes**

- Abrir incident channel com nomenclatura fixa: `#inc-2026-05-06-orders-down`.
- Confirmar IC assignment (PagerDuty/Opsgenie auto-rotation).
- Update status page < 5min, mesmo que "Investigating; impact unclear".
- Pin top message: detected timestamp, current state, IC name, link dashboard + runbook.
- Stream stack/log/metric links no canal; não force lookup.
- Page SMEs por área (DB, network, payments) conforme hipótese.
- Comms cadence: status page update a cada 30min até resolved.
- Encerramento: IC declara resolved, Comms posta final update, Scribe agenda postmortem em ≤ 5 business days.

**Blameless postmortem — template copy-paste**

```markdown
# Postmortem: <Title> (<SEV-X>)

**Date of incident**: 2026-05-06
**Authors**: <Comma-separated>
**Status**: Draft / Final
**Customers affected**: <count + %; e.g., 12% lojistas em region BR>
**Time to detect**: 4min (alert fired)
**Time to mitigate**: 18min (rollback)
**Time to resolve**: 4h 23min (root cause + permanent fix)

## Summary
<2-3 sentences: what happened, impact, fix.>

## Timeline (UTC)
- 14:28 — Deploy v3.1.4 to prod (orders-api).
- 14:32 — Alerts fire: order_create_5xx_rate > 5%.
- 14:33 — Oncall pages IC; channel opened.
- 14:36 — Mitigation attempt: rollback to v3.1.3.
- 14:48 — Rollback complete; alerts clearing.
- 14:55 — Resolved on dashboard.
- 18:51 — Root cause identified: missing migration in v3.1.4.
- Day+1 — Permanent fix: migration runner check added to deploy gate.

## Impact
- <X> orders failed (refunded automatically).
- <Y> couriers received error toast; manual workaround used.
- $<Z> revenue lost (estimated).
- <Affect on SLO; error budget consumption>.

## Root Cause Analysis
<NÃO "human error". Always trace to system/process gap.>

v3.1.4 introduced new column `orders.payout_currency` consumed by API code. Migration was created but PR did NOT include migration in `db/migrations/` (developer ran locally, forgot to commit). CI did not catch because migration runner only checks dev DB; staging deploy lazily applies new migrations and was last deployed 3 weeks ago. Prod deploy ran code expecting column → 5xx on every order create.

## What went well
- Alert fired in 4min (within SLO).
- Rollback succeeded cleanly.
- Comms cadence held.

## What went poorly
- Migration not in PR review checklist.
- Staging not auto-deployed nightly (lag of 3 weeks invisible).
- Status page update took 8min (target < 5min).

## Action Items
| Priority | Owner | Item | Due | Tracked |
|---|---|---|---|---|
| P0 | @alice | Add CI check: migrations directory diff vs schema diff | 2026-05-13 | LOG-1234 |
| P1 | @bob | Auto-deploy staging nightly via cron | 2026-05-20 | LOG-1235 |
| P1 | @charlie | Status page update bot triggered by alert | 2026-05-27 | LOG-1236 |
| P2 | @dora | Postmortem template em PR review | 2026-06-03 | LOG-1237 |
```

**RCA techniques — escolha por complexidade**

- **5 Whys** (Toyota Production System): pergunta "por quê?" 5 vezes, descend até system root cause. Limite: assume cadeia linear; falha em incidents com múltiplos branches contribuintes.
- **Fishbone (Ishikawa)**: brainstorm em 6 categorias — people, process, technology, environment, materials, methods. Visual broad map antes de colapsar pra root cause.
- **Fault tree analysis**: top-down com AND/OR gates. Melhor pra distributed system failures onde múltiplas condições simultâneas dispararam.
- **Causal loop diagrams**: feedback loops, e.g. "more retries → more load → more failures → more retries". Captura amplification dynamics que 5 Whys perde.

**Blameless culture — práticas concretas**

- "Human error" NUNCA é root cause. Pergunta "por que o processo permitiu o humano falhar?" — falta de guardrail, CI gap, ambiguous runbook.
- _Just Culture_ (Sidney Dekker): distinguish honest mistake (sem consequência), gross negligence (rara, exige evidência), sabotage (criminal). Default é honest mistake.
- Reward incident reporting. Near-miss reports incentivados; "eu causei isso" sem penalty. Engineer que esconde incident é o problema cultural.
- No name-and-shame em postmortems públicos. Use roles (`Oncall`, `Deployer`, `Reviewer`), NÃO nomes próprios em docs distribuídos company-wide.

**Postmortem rituals**

- Schedule within 5 business days. Past 7 = forgotten, signal degraded.
- 30-60min meeting: walk timeline (Scribe leads), debate RCA, finalize action items com owner + due date.
- Distribution company-wide (not team-only) pra cross-team learning.
- Monthly review de action items completion; aging items ≥ 90 dias = re-evaluate ou close-as-wontfix com justificativa.

**Logística — incident program 2026 aplicado**

- PagerDuty rotation: 1 oncall + 1 backup por service area (orders, tracking, payments, courier-app); weekly rotation, 24×7.
- SEV definition documentado em `runbooks/sev-matrix.md`; on-call recebe link no wake-up message.
- Bot Slack auto-cria `#inc-YYYY-MM-DD-name` no PagerDuty trigger; convida IC + Ops + Comms automatic por SEV.
- Status page: status.logistica.example.com (Atlassian Statuspage). Update bot triggered por alert critical labels.
- Postmortem repo: `postmortems/YYYY/MM-DD-title.md` em monorepo, indexado por SEV e service.
- Action items em Linear, label `incident-followup`; P0/P1 weekly review com eng leadership.

**Anti-patterns observados**

- "Human error" como root cause (process gap escondido).
- Postmortem em meeting longa sem template (rambling, low signal).
- Action items sem owner ou due date (never completed).
- "Don't do that again" como action item (não acionável; exige system change).
- SEV inflation (tudo SEV1 → IC fatigue, signal lost).
- SEV deflation (SEV2 que era SEV1 → comms tardia, customer descobre antes).
- IC + Ops mesmo humano em SEV1 (coordenação some quando Ops mergulha em logs).
- Postmortem private/team-only (outras teams perdem learning cross-cutting).
- Action items abertos > 6 meses (debt cycle; review e fechar ou repriorizar).
- "Why didn't they test it?" em postmortem (blame); converte pra "what testing would have caught it?".

Cruza com **03-04** (CI/CD, deploy gate prevê regression antes de prod), **03-07** (observability, alert é input do detect), **04-04** (resilience, mitigation é mechanical action), **04-09** (scaling, SLO + error budget atam incident frequency a velocity policy), **04-12** (engineering leadership, blameless culture é mindset top-down).

---

### 2.20 Modern incident platforms 2026 — incident.io vs Rootly vs FireHydrant vs PagerDuty Incident Workflows

Plataforma de incident response é o **sistema nervoso central de SRE**. Concentra paging, ChatOps, severity escalation, status page sync, postmortem, on-call schedule. 2024-2025 mudou o jogo: vendor consolidation (Atlassian Opsgenie EOL March 2025), AI-assisted summarization saiu de demo pra GA, Slack-first workflows substituíram dashboards web. Senior em 2026 conhece o trade-off por scale e escolhe stack que cabe no time — não cola tudo PagerDuty porque "é o nome".

**Vendor matrix 2026** — quem ganha em cada tier:

| Tool                    | Sweet spot           | Pricing              | ChatOps depth    | AI features          | On-call sched    |
|-------------------------|----------------------|----------------------|------------------|----------------------|------------------|
| **incident.io**         | Mid-market 50-500    | per-responder ~$25   | Slack-first nativo | Catalog AI (GA 2024) | Solid, Smart Routing |
| **Rootly**              | Enterprise 500+      | per-responder ~$30   | Slack/Teams      | Sage AI (Q4 2024)    | Forte, RBAC pesado |
| **FireHydrant**         | Mid-market 100-500   | per-responder ~$22   | Slack/Teams      | Signals (alerting)   | OK, On-Call addon |
| **PagerDuty**           | Enterprise legacy    | per-call $$$$        | App, não nativo  | AIOps (Operations Cloud) | Gold standard, expensive |
| **Grafana OnCall**      | Self-hosted / OSS    | free / Cloud $19     | Slack/Teams      | Nenhuma significativa | Decent, OSS-friendly |
| **Better Stack Uptime** | Startup <50          | $29 flat             | Slack            | Mínimas              | Básico           |
| **Opsgenie**            | **EOL March 2025**   | —                    | —                | —                    | **Migrate**      |

incident.io fechou Series B $62M Q4/2023 e dominou mid-market 2024-2025; AI summarization GA mid-2024; ServiceNow integration Q1/2025. Rootly Series B $20M Q3/2024, foco enterprise. PagerDuty Operations Cloud é incumbent caro — vale só se você precisa AIOps event correlation pesado em ambiente >1000 services. Grafana OnCall (originalmente Amixr) é a saída OSS quando compliance ou budget proíbem SaaS.

**Decision rule**: <50 eng → Better Stack ou Grafana OnCall. 50-500 eng → incident.io (default) ou FireHydrant. 500+ eng com regulação pesada → Rootly ou PagerDuty. Quem ainda está em Opsgenie em 2026: você está em prod numa plataforma EOL desde March 2025 — migration window fechou.

**ChatOps deep — Slack-first é o padrão 2026**:

```yaml
# incident.io workflow YAML — auto-create channel + assign IC + page sec on SEV1
name: sev1-auto-response
trigger:
  event: incident.created
  conditions:
    - severity: SEV1
steps:
  - action: create_slack_channel
    name_template: "inc-{{incident.id}}-{{incident.short_title}}"
    invite:
      - role: incident_commander
      - role: on_call_eng_manager
      - role: on_call_vp_eng
      - group: "@security-on-call"
  - action: assign_role
    role: incident_commander
    user: "{{on_call.primary_sre}}"
  - action: page_responders
    escalation_policy: sev1-full-chain
    timeout_minutes: 5
  - action: create_zoom_meeting
    post_link_to_channel: true
  - action: post_status_page_update
    page: public-status
    status: investigating
    message: "We are investigating reports of {{incident.short_title}}."
  - action: link_runbook
    from_alert_label: runbook_url
```

Slack `/inc` command flow padrão: `/inc declare` (cria incident + channel), `/inc severity SEV1`, `/inc handoff @new_ic` (transfere IC role com bot tagging visível), `/inc resolve` (encerra + dispara postmortem template em 24h). Voice channel auto-link (Zoom/Meet) postado no topo do channel — IC não perde 2min procurando link. Threaded comms enforcement: bot avisa quando alguém posta out-of-thread em incident channel; ruído mata signal.

**On-call scheduling 2026 — Smart Routing + fatigue protection**:

```yaml
# rotation YAML — follow-the-sun 4 SREs
schedule:
  name: sre-primary
  rotation: weekly
  handoff_day: monday
  handoff_time: "09:00 local"
  layers:
    - name: americas
      timezone: America/Sao_Paulo
      members: [alice, bob]
      hours: "09:00-21:00"
    - name: emea_apac
      timezone: Europe/Dublin
      members: [carol, dave]
      hours: "09:00-21:00"
  smart_routing:
    skill_tags: [database, kubernetes, payments]
    route_by: incident.affected_service.tags
  fatigue_protection:
    max_consecutive_on_call_hours: 12
    min_rest_hours_between_shifts: 10
    max_pages_per_shift_before_swap: 5
  overrides:
    enabled_via_slash_command: "/inc oncall override @user 4h"
```

Smart Routing 2026 = round-robin **per skill tag**, não cego. Incident em `payments-service` rota pra quem tem tag `payments`; sem isso, primary genérico vira gargalo. Follow-the-sun com 4 SREs distribuídos (BR + Dublin + Sydney) elimina wake calls 3am — cada plantão é horário comercial local. Override via slash command resolve "preciso sair 4h pra emergência médica" sem abrir ticket.

**Severity escalation policies** — quem é paginado, em quanto tempo:

| SEV  | Page targets                                | Timeout escalation       |
|------|---------------------------------------------|--------------------------|
| SEV1 | IC + Eng Manager + VP Eng + Security simultaneous | 5min → CEO + CTO           |
| SEV2 | IC primary on-call only                     | 15min → backup on-call    |
| SEV3 | Ticket criado, no page                      | Next business day         |
| SEV4 | Backlog, weekly triage                      | —                         |

SEV1 paginate full chain em 5min é não-negociável — VP Eng saber disso antes de cliente twittar é diferença entre 15min e 4h de damage.

**AI-assisted features — usar como rascunho, nunca como source of truth**:

```typescript
// AI summarization prompt template (incident.io Catalog AI / Rootly Sage / PagerDuty AIOps)
const summaryPrompt = `
You are summarizing an incident channel transcript for a non-IC stakeholder.

Transcript: {{slack_channel_messages}}
Incident metadata: severity={{sev}}, started={{started_at}}, resolved={{resolved_at}}.

Output (max 200 words):
1. What broke (user-facing impact, not internal jargon).
2. Detection method (alert / customer report / manual).
3. Mitigation applied (rollback / config change / scale-up / failover).
4. Current status (resolved / monitoring / ongoing).
5. Next action item owner.

Do NOT speculate root cause. Do NOT assign blame. If unsure, write "TBD by IC".
`;
```

incident.io Catalog AI, Rootly Sage, PagerDuty AIOps fazem summarization decente em 2026, mas hallucinations existem — confunde rollback com forward-fix, atribui ação a quem só comentou. **Sempre IC revisa antes de mandar pra exec**. Útil pra rascunho de retro, status page draft, exec briefing — nunca pro postmortem oficial sem revisão humana.

**Postmortem automation — template auto-populated 24h pós-resolve**:

```markdown
# Postmortem: {{incident.title}}
**Date**: {{resolved_at}} | **SEV**: {{sev}} | **MTTR**: {{mttr_minutes}}min | **IC**: {{ic.name}}

## Timeline (auto-extracted from Slack)
{{ai_extracted_timeline}}  <!-- IC reviews, edits hallucinations -->

## Impact
- Users affected: {{auto_from_metrics or TBD}}
- Revenue impact: TBD by Finance
- Data loss: yes/no

## Root cause
TBD — 5 whys session before publishing.

## What went well / What didn't / Action items
- [ ] Action item → linked Linear ticket {{auto_create}}
- [ ] Owner: @user | Due: {{+14d}}

## Learning review schedule
{{auto_calendar_invite}} 7d post-publish, 30min, all responders + 1 outsider.
```

Action items linkados automaticamente em Linear/Jira via API. Sem isso, action items viram backlog wishlist — incident.io e Rootly têm tracking nativo de aging (alert quando AI > 30d sem update).

**Status page sync — separar comms internas de externas**:

```typescript
// Statuspage.io / Atlassian Statuspage / instatus auto-update
await statuspage.incidents.create({
  name: "Elevated latency on checkout API",
  status: "investigating",
  impact: "major",
  components: ["checkout-api", "payments"],
  body: customerFacingTemplate({  // never raw transcript
    impact: "Some customers may experience slow checkout.",
    eta_update: "30 minutes",
  }),
});
// Em sev change ou resolve, sync automático
```

Customer-facing comms é template separado: zero jargão, zero blame, ETA realista. Status page silenciado "pra não causar pânico" é pior — cliente descobre por Twitter, perde confiança permanente. Statuspage.io / Atlassian Statuspage / instatus se integram nativo com incident.io/Rootly/PagerDuty via webhook.

**Targets 2026 — benchmarks honestos**:
- MTTA (acknowledge): P95 < 5min para SEV1.
- MTTR (resolve): P95 < 60min para SEV1, < 4h para SEV2.
- MTTD (detect): P95 < 2min — alert antes de cliente reportar (SLO multi-window burn-rate de §2.18 entrega isso).
- Incident frequency: Google SRE benchmark — < 2 SEV1 per quarter é healthy. > 5/quarter = systemic problem, freeze features.

**Stack Logística aplicada**:
- incident.io Slack-first, $25/responder (~$1500/mês para 60 eng).
- Rotation 4 SREs follow-the-sun (BR x2 + Dublin + Sydney), Smart Routing por skill tag (`payments`, `kafka`, `k8s`).
- AI summarization Catalog AI para exec briefing + status page draft (IC revisa).
- Statuspage.io sync automático em SEV1/SEV2.
- SEV1 paginate IC + Eng Mgr + VP Eng + Security em 5min; escalate CEO em 15min.
- Postmortem template auto-cria 24h pós-resolve, action items → Linear, learning review +7d.
- MTTA atual P95 = 4min, MTTR SEV1 P95 = 52min, 1.4 SEV1/quarter — dentro target.

**10 anti-patterns**:
1. AI summarization tratada como postmortem oficial — hallucinations confundem rollback com forward-fix, blame errado.
2. On-call rotation 1 pessoa 2 semanas seguidas — burnout garantido, single-point.
3. Status page silenciado "pra não causar pânico" — cliente descobre por Twitter, confiança permanente perdida.
4. Incident channel ephemeral / auto-archive 24h — perde memória institucional, postmortem sem fonte.
5. **Opsgenie em prod 2026** — EOL March 2025; migrate pra incident.io/PagerDuty/JSM já.
6. ChatOps com 5 ferramentas (Slack + PagerDuty app + Statuspage + Linear + custom bot) — context fragmentation, IC perde 10min só navegando.
7. incident.io workflow firing em **todo** alert sem dedup — channel spam, alert fatigue, ninguém lê.
8. Smart Routing desligado, primary on-call genérico vira gargalo único.
9. Postmortem manual sem template auto-populated — IC gasta 2h escrevendo, posterga, esquece, action items somem.
10. SEV1 paginate só primary on-call (sem Eng Mgr + VP) — exec descobre por cliente twitando, política depois é pior que o incidente.

Cruza com **03-15** §2.4 (alerting actionable é input), §2.5 (on-call rotation humana), §2.6 (IC role formal), §2.6.1 (war-room rituals), §2.8 (comms structure during incident), §2.9 (postmortem blameless culture), §2.13 (customer comms templates), §2.17 (program metrics MTTR/MTTA), §2.18 (multi-window burn rate alimenta paging), §2.19 (IC structure + RCA disciplinado), **03-07** §2.21 (OTel observability feeds alerts), **04-04** §2.30 (DR runbooks linkados em alert label), **04-12** (engineering leadership, blameless culture top-down).

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
5. **Game day 1, DB primary down**:
   - Script `chaos/db-primary-down.sh` pausa container Postgres primary.
   - Equipe (você, simulando IC + SME) detecta via alert, mitiga (failover pra replica), escreve postmortem real.
6. **Game day 2, região indisponível**:
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

- Liga com **03-02** (Docker), **03-03** (K8s): ambiente onde failures acontecem.
- Liga com **03-04** (CI/CD): canary, blue-green, rollback.
- Liga com **03-07** (Observability): SLI/SLO se baseiam em métricas/traces/logs.
- Liga com **03-08** (Security): incident response também pra breach.
- Liga com **02-14** (real-time): degradação user-facing visível.
- Liga com **04-04** (resilience): patterns que reduzem incidentes (circuit breaker, bulkhead).
- Liga com **04-12** (tech leadership): escrever postmortem é leadership.
- Liga com **CAPSTONE-producao**: Logística v2 inclui isto.

---

## 6. Referências

- **"Site Reliability Engineering"**: Beyer et al. (Google SRE Book, gratuito).
- **"The Site Reliability Workbook"**: Beyer et al. (gratuito).
- **"Seeking SRE"**: David Blank-Edelman.
- **PagerDuty Incident Response docs** ([response.pagerduty.com](https://response.pagerduty.com/)).
- **"Chaos Engineering"**: Casey Rosenthal, Nora Jones.
- **"Implementing Service Level Objectives"**: Alex Hidalgo.
- **Cloudflare blog**: postmortems.
- **GitHub Engineering**: postmortems.
- **AWS Builders' Library**: operational excellence essays.
- **John Allspaw**: Etsy / Adaptive Capacity Labs writings on incidents.
