---
module: 04-16
title: Product, Business & Unit Economics, Pricing, Cohorts, Churn, Margins
stage: sistemas
prereqs: [04-12]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 04-16, Product, Business & Unit Economics

## 1. Problema de Engenharia

Senior técnico sem entender **como o produto faz dinheiro** é engenheiro decorativo. Constrói features que ninguém pediu, otimiza coisas que não importam pra revenue, ignora trade-offs com cost-of-goods-sold, e fica surpreso quando rounding cuts atingem o time. Liderança técnica de verdade exige fluência mínima em product, business, e unit economics, não pra virar PM, mas pra **ter opinião informada** sobre tradeoffs e roadmap.

Em entrevista de Staff/Principal, candidato é cobrado em "como você decidiria entre X e Y dado contexto de negócio". Resposta puramente técnica falha. Quem distingue: "X tem TCO 30% maior mas reduz churn previsto em 1.5pts → ROI positivo em 14 meses, mas só se cohort M+3 mantiver retention atual; recomendo X com gate de re-eval".

Este módulo é o vocabulário de business aplicado a software: pricing, MRR/ARR, cohort/retention, LTV, CAC, payback, churn, gross margin, unit economics, growth loops, marketplace dynamics (relevant pra Logística), B2B vs B2C, freemium/PLG, sales-led, contracts, e quando engenharia precisa pivotar pra reduzir cost ou aumentar margin.

---

## 2. Teoria Hard

### 2.1 Revenue models

- **Subscription / SaaS**: MRR (Monthly Recurring Revenue) e ARR (Annualized). Previsível, valuation alta.
- **Transactional / Take rate**: % de cada transação (Marketplaces, payment processors, Stripe, Logística).
- **Usage-based**: pay per call/GB/seat (AWS, Twilio).
- **One-time**: licença perpétua, hardware. Lumpy.
- **Ad-supported**: revenue por impressão/clique.
- **Hybrid**: subscription + usage (modern SaaS, ex: Snowflake).

Logística: take rate sobre cada delivery + subscription opcional pro lojista pro plano premium.

### 2.2 MRR e ARR

MRR = soma de subscriptions ativos × valor mensal (normalizado anual / 12 pra annual contracts).

Componentes:
- **New MRR**: novos customers.
- **Expansion MRR**: upgrades, seats adicionais.
- **Contraction MRR**: downgrades.
- **Churn MRR**: cancels.

**Net New MRR** = New + Expansion - Contraction - Churn. Drives growth.

ARR = MRR × 12 (proxy anualizado, padrão SaaS). NDR (Net Dollar Retention) > 100% = grow even sem novos clientes.

### 2.3 Churn

Customer churn rate = (customers que saíram em período) / (customers no início). Mensal ou anual.

Revenue churn idem em $.

**Gross churn**: total saídas. **Net churn**: gross - expansion (pode ser negativo = grow from base).

Benchmarks SaaS B2B: gross < 1%/mês excelente, 1-3% normal, >5% problema. SMB tem churn mais alto que enterprise.

Cohort analysis = retention por safra. Plotar % retido em M0, M+1, ..., M+12. Padrão: queda inicial (onboarding bad), depois platô (real product fit).

### 2.4 LTV (Lifetime Value)

Receita esperada por customer ao longo do relacionamento.

Simple: `LTV = ARPU × gross_margin × lifetime`, lifetime = 1/churn. Gross margin (não revenue bruto, descontar COGS).

Se margem 70%, ARPU $100/mês, churn 2%/mês: LTV = $100 × 0.70 × 50 = $3500.

Refinements: discount future cash flows (DCF), expansion revenue, segments distintos.

### 2.5 CAC (Customer Acquisition Cost)

Custo total de sales+marketing dividido por novos customers em período.

Blended CAC: simples mas mistura organic. Paid CAC: só channels pagos. Por canal: refina decisão.

CAC payback = CAC / (ARPU × gross margin). Meses até recuperar.

### 2.6 LTV/CAC e payback

Régua canônica:
- LTV / CAC > 3 = saudável.
- < 1 = você queima dinheiro adquirindo.
- Payback < 12 meses = bom.
- > 24 meses = capital intensivo.

CAC bom + LTV ruim = consertar produto/retention. CAC ruim + LTV bom = consertar marketing.

### 2.7 Unit economics

Por unidade entregue (delivery, transaction, user-month):
- **Revenue por unidade**.
- **Variable costs**: PSP fees, infra, support por unidade.
- **Contribution margin** = revenue - variable costs.
- **Fixed costs** absorbidos via volume.

Logística por entrega:
- Revenue: take rate (ex: $1.50).
- Variable: PSP fee (~$0.30), infra (~$0.05), support amortizado (~$0.20).
- Contribution: ~$0.95.
- Volume target: covers fixed + give margin.

Unit economics negativo = scale piora. Unit positivo + scale = vence.

### 2.8 Pricing strategy

- **Cost-plus**: cost + markup. Simples, ignora valor percebido.
- **Value-based**: $ baseado em valor entregue. Stripe Atlas $500 pra empresa que vale milhões.
- **Competitive**: matching ou diff vs competidores.
- **Freemium / Free trial**: PLG.
- **Tiered**: free / pro / enterprise.
- **Usage**: per-call, GB.
- **Per-seat**: comum em B2B.
- **Discriminação**: enterprise nego separado.

Anchoring: tier 3 disponível faz tier 2 parecer "razoável". Decoy effect.

Price changes: communicate antecipado, grandfather clientes existentes ou fornecer migration path. Price increases ARE OK quando valor justifica.

### 2.9 Growth loops

Loops compostos batem funnel linear:
- **Viral loop**: user invita user (Dropbox, Calendly).
- **Content loop**: SEO content → traffic → users → mais content.
- **Sales loop**: customers → case studies → leads → customers.
- **Marketplace loop**: supply attracts demand attracts supply (Logística!).

Loop strength = (output / input) × cycle time. Loop com factor > 1 = exponencial.

### 2.10 Marketplace dynamics (Logística-specific)

**Cold start problem**: marketplace vazio inutiliza ambos lados.

Strategies:
- **Single-side first**: foque um lado primeiro (entregadores → lojistas, ou vice-versa).
- **Concentrar geo**: dominar 1 cidade antes de expandir.
- **Subsidize**: pague pra um lado bootstrap.
- **Wedge**: começar nicho específico (entregas para farmácias, ex.).

**Liquidity**: % de matches bem-sucedidos. Métrica chave.

**Take rate**: % do GMV. Trade-off: alto = revenue per txn alto, mas reduz adoção.

GMV (Gross Merchandise Value): volume bruto. Revenue real = GMV × take rate.

### 2.11 PLG (Product-Led Growth) vs Sales-Led

- **PLG**: produto vende sozinho. Free tier, self-serve, viral. Notion, Figma, Vercel.
- **Sales-Led**: outbound, demos, contracts. Salesforce, Snowflake.
- **Hybrid**: free tier + sales pra enterprise.

PLG metrics: time-to-value, activation rate, paid conversion.
Sales-led: SQL→opportunity→close, sales cycle, ACV.

Engenharia importa: PLG exige produto que onboard em minutos. Sales-led tolera complexidade desde que account managers ajudam.

### 2.12 B2B vs B2C

| | B2B | B2C |
|---|---|---|
| Buyer | Procurement / champion | Indivíduo |
| Decision time | Semanas-meses | Minutos |
| ACV | $1k-$1M | $5-$100 |
| Churn | Baixo | Alto |
| Marketing | Outbound, content, ABM | Performance ads, viral |
| Volume | Baixo | Alto |
| Customization | Alta | Zero |

Logística: B2B (lojistas) com B2C-feel (entregadores). Híbrido.

### 2.13 Engineering levers em economics

Engenharia direta afeta:
- **Infra cost**: efficiency de queries, cache, autoscale, spot. 03-10/03-13 ajudam.
- **PSP fee**: routing inteligente, contratos negociados.
- **Support cost**: error messages, self-serve, automation.
- **Engineering velocity**: cycle time → features → revenue.
- **Reliability**: downtime = churn driver.
- **Performance**: 03-09 mostra Core Web Vitals → conversão.

Senior técnico apresenta proposta com **cost/benefit em $**, não só "código fica mais limpo".

### 2.14 Burn, runway, profitability

- **Burn rate**: cash gasto / mês.
- **Runway**: cash / burn = meses até zero.
- **Net burn** = burn - revenue.
- **Default alive**: profitability projetada antes de zerar.
- **Default dead**: precisa raise.

Engenharia em startup: senior pondera sobre infra cost vs runway. "Reduzir AWS de $50k pra $30k extends runway 2 meses" é proposta legítima.

### 2.15 SaaS valuation

Multiples de ARR (10-20x em high-growth SaaS público; 3-7x normalmente). Variáveis:
- Growth rate.
- NDR.
- Gross margin (>70% saudável).
- Rule of 40 (growth% + profit margin% ≥ 40).

Engineering decision afeta valuation: gross margin (efficient infra), NDR (reliability/retention), growth (velocity).

### 2.16 Cost optimization patterns

- **Right-size**: instances/recursos sobre-provisionados.
- **Spot/preemptible**: workloads tolerantes.
- **Tier storage**: hot/warm/cold.
- **Autoscale agressivo**.
- **Reserved instances / savings plans**: 1-3 yr commitments com 30-70% off.
- **CDN / edge**: reduzir transferência.
- **Compress / partition** dados.
- **Delete unused**: log retention, snapshots, idle resources.
- **Multi-tenant** otimizado.

Cost dashboards (CloudHealth, Vantage, Cloudability, AWS Cost Explorer) pra visibilidade.

### 2.17 Contracts (B2B)

ACV (Annual Contract Value), TCV (Total Contract Value, soma multi-year). Discounting comum (multi-year, prepay, volume). MSA (Master Service Agreement) base; SOWs específicos.

SLA com penalty (credits) se downtime > X. Engenharia tem liability se SLA é apertado.

Data Processing Agreement (DPA), GDPR/LGPD compliance, security questionnaires (SIG, CAIQ).

### 2.18 Funding e exit

Stages: pre-seed, seed, A, B, C+, growth, IPO/M&A. Cada round dilui equity por capital.

Exits: IPO (raras), acquisition (mais comum), acquihire (talent absorbido), shutdown.

Engineering importa em due diligence: code quality, test coverage, security, IP, key-man dependence.

### 2.19 Unit economics deep — CAC/LTV/payback period com fórmulas, cohort analysis, COGS per request

Engenheiro Staff que entende unit economics ganha argumentos com CFO/founder. "Cobrar mais por feature X?" sem entender LTV é palpite. "Reduzir custo Z?" sem COGS per request é otimização cega. Esta seção entrega: fórmulas exatas (não aproximações), cohort analysis em SQL, decomposição de COGS por componente cloud, decision tree de "quando invest engineering vs go-to-market".

**CAC (Customer Acquisition Cost) — fórmula completa**:

```
CAC = (Total spend em sales + marketing no período) / (Novos customers acquired no período)
```

- **Inclui**: salários sales/marketing/SDR, anúncios pagos, content, ferramentas (HubSpot/Salesforce), eventos, agência, PR.
- **NÃO inclui**: customer success post-sale, product engineering, infrastructure.
- **Blended CAC** vs **Paid CAC**: blended diz "$200/customer global"; paid CAC isola só $ de mídia paga + ad-attributable conversions. Paid CAC é mais útil pra decisões de canal.
- **Logística exemplo**: $50k em ads/mês + $30k SDR salário = $80k spend. 200 novos lojistas onboarded → CAC = $400.

**LTV (Lifetime Value) — 3 fórmulas, 3 níveis de precisão**:

Nível 1 — Quick (use no início):

```
LTV = ARPU × Gross Margin × (1 / Churn rate)
```

- ARPU = average revenue per user/month.
- Gross margin = (revenue - COGS) / revenue. Idealmente > 70% pra SaaS.
- Churn = % monthly customer churn (ex: 3% = 0.03).
- Logística: ARPU $500/mês × 75% margin × (1/0.03) = $12,500.

Nível 2 — Cohort-adjusted:

```
LTV = sum over months of ((retained_customers_in_month / initial_cohort) × ARPU × margin)
```

- Captura curva real de churn (frequentemente decrescente: high churn em mês 1-3, depois plateau).
- Calcule via SQL em cohorts.

Nível 3 — Discounted (NPV):

```
LTV = sum over months of ((retention(t) × ARPU × margin) / (1 + discount_rate)^t)
```

- Aplica discount rate (10-15% anual) pra refletir time value of money.
- Usado em modelos de M&A, valuation séries B+.

**CAC payback period — métrica que CFO mais olha**:

```
Payback months = CAC / (ARPU × Gross Margin)
```

- Logística: $400 / ($500 × 0.75) = $400 / $375 = 1.07 meses.
- **Saudável** (SaaS B2B SMB): < 12 meses.
- **Excelente**: < 6 meses.
- **Vermelho**: > 18 meses (você queima cash até customer pagar de volta).

**LTV:CAC ratio — o número de "saúde"**:

```
LTV / CAC ratio
```

- **3:1**: saudável, sustentável.
- **5:1+**: excelente; pode investir mais agressivamente em growth.
- **< 1:1**: você paga pra adquirir, perde dinheiro em cada customer; suicídio sem mudanças.
- **Condição**: LTV usa gross margin, sem ele você está enganando.

**Cohort analysis em SQL**:

```sql
-- Monthly cohort retention curve
WITH cohorts AS (
  SELECT customer_id, date_trunc('month', signup_at) AS cohort_month
  FROM customers
),
activity AS (
  SELECT customer_id, date_trunc('month', event_at) AS active_month
  FROM customer_events
  WHERE event_type = 'invoice_paid'
),
joined AS (
  SELECT c.cohort_month,
         extract(epoch FROM age(a.active_month, c.cohort_month)) / (86400 * 30) AS months_since_signup,
         COUNT(DISTINCT a.customer_id) AS active
  FROM cohorts c
  LEFT JOIN activity a USING (customer_id)
  GROUP BY 1, 2
),
cohort_size AS (
  SELECT cohort_month, COUNT(*) AS initial_size
  FROM cohorts GROUP BY 1
)
SELECT j.cohort_month,
       j.months_since_signup,
       j.active,
       ROUND(100.0 * j.active / cs.initial_size, 1) AS retention_pct
FROM joined j JOIN cohort_size cs USING (cohort_month)
WHERE j.months_since_signup IS NOT NULL
ORDER BY j.cohort_month, j.months_since_signup;
```

- Plot output: x-axis = months_since_signup, y-axis = retention_pct, 1 line por cohort_month.
- **Healthy SaaS**: cohort line plateau após mês 6-12 em > 60%; declines até zero em 24+ meses = transactional model.

**COGS per request — decomposição engineering-side**:

```
COGS per request = (cost_compute + cost_db + cost_storage + cost_network + cost_third_party) / requests
```

- **Logística exemplo, 10M req/mês**:
  - Compute: $4k (K8s nodes EC2) → $0.0004/req.
  - DB: $2k (RDS Postgres + ClickHouse) → $0.0002/req.
  - Storage: $300 (S3 + EBS) → $0.00003/req.
  - Network: $1.5k (egress + NAT GW) → $0.00015/req.
  - 3rd party: $800 (Stripe fees + Twilio + Sentry) → $0.00008/req.
  - **Total: ~$0.00086/req** = $0.86 per 1k requests.
- Set baseline; track trend over time. Spike sem feature change → bug ou waste.

**Engineering ROI — quando cortar custo vs investir crescimento**:

- **Regra**: se infra custa < 15% de revenue → foco crescimento. > 25% → cost optimization prioritário.
- **Logística scenario**: $500k MRR, infra $40k = 8% → não otimize, cresça.
- **Logística scenario**: $200k MRR, infra $60k = 30% → optimization sprint mandatório.

**Logística — modelo end-to-end**:

```
Lojista pricing tier: $500/mês
ARPU: $500
Gross margin: 75% (after Stripe fees + delivery COGS)
Monthly churn: 3% (sustained year 2+)

LTV = $500 × 0.75 × (1/0.03) = $12,500

Marketing $50k/mês + 2 SDRs $20k = $70k spend
New lojistas/mês: 175
CAC = $400

LTV:CAC = 12500/400 = 31:1 (excellent)
Payback = 400/(500 × 0.75) = 1.07 meses (excellent)

Decision: triple ad spend; LTV bears it.
```

**Anti-patterns observados**:

- **LTV sem gross margin**: inflados 30-40%. CFO vai catch.
- **CAC sem salaries de sales/marketing**: subestima 60-80%; só ad spend.
- **Cohort analysis com lifetime average**: esconde aging effect; new cohorts podem estar piorando enquanto média antiga sustenta.
- **Payback > 18m em early-stage sem capital**: morre antes de break-even.
- **COGS per request sem snapshot mensal**: regressão silenciosa em arquitetura.
- **Ignorar churn enterprise vs SMB separado**: enterprise low-volume high-value, SMB opposite. Mistura mascara.
- **Otimizar custo com infra < 10% de revenue**: ROI engineering hours melhor em features.
- **Ignorar discount rate em LTV de série C+**: investidores institucionais usam DCF; sua LTV otimista vira foreshadowing de cap mais baixo.

Cruza com **04-16 §2.13** (engineering levers em economics — onde código direta impacta), **04-16 §2.14** (burn/runway), **04-16 §2.16** (cost optimization patterns), **03-05 §2.19** (FinOps cloud cost engineering), **04-09 §2.14** (cost ao scale).

### 2.20 Product-Market Fit measurement + retention metrics + activation funnels

Unit economics (§2.19) só fecham se PMF existe — caso contrário, LTV é fantasia, churn devora cohorts e CAC paga aquisição que vaza. Engenheiro Staff que entende como PMF é medido (não sentido) participa de decisões de roadmap, gating de features e go-to-market com evidência. Esta seção entrega: definições operacionais, SQL pronto pra cohort retention, framework de aha-moment discovery, benchmarks 2026 (Lenny Rachitsky / OpenView / Bessemer).

**PMF — definições operacionais (não vibes)**:

- **Marc Andreessen 1.0 (2007)**: "the only thing that matters". Famoso, vago — não mede nada. Útil como prioridade, inútil como diagnóstico.
- **Sean Ellis test**: pergunta única após user qualificado (3+ uses): "How would you feel if you could no longer use [product]? Very disappointed / Somewhat / Not disappointed". PMF threshold = **> 40% Very disappointed**.
- **Rahul Vohra (Superhuman PMF Engine)**: segmenta respondentes; foca cohort "Very disappointed" pra extrair ICP, principal benefit ("speed"), e barriers do "Somewhat" ("missing calendar"). Roadmap deriva direto disso.
- **PMF quantitativo**: cohort retention curve flatten (não decai a zero); organic growth (referral coefficient > 0.5); inbound dominance ("category leader" em conversa de buyer).
- **Pre-PMF traps**: paid acquisition funcionando + organic churn alto; user growth alimentado por ads; repeat usage fraco (D30 < 15% B2B). Crescer NÃO é PMF.

**Sean Ellis test — implementação**:

```sql
-- Trigger: in-app modal após 3+ qualified actions (created order, etc.)
WITH qualified AS (
  SELECT sr.user_id, sr.sean_ellis_response, sr.surveyed_at,
         COUNT(ue.id) AS uses_before_survey
  FROM survey_responses sr
  JOIN usage_events ue ON ue.user_id = sr.user_id
    AND ue.created_at < sr.surveyed_at
    AND ue.event_type = 'order_created'
  GROUP BY sr.user_id, sr.sean_ellis_response, sr.surveyed_at
  HAVING COUNT(ue.id) >= 3
)
SELECT
  COUNT(*) FILTER (WHERE sean_ellis_response = 'very_disappointed')::float
    / NULLIF(COUNT(*), 0) * 100 AS pmf_pct,
  COUNT(*) AS responses
FROM qualified
WHERE surveyed_at >= NOW() - INTERVAL '30 days';
```

- Sample mínima: 100 respostas pra signal estatístico (Vohra recomenda 40+ "very disappointed" absolutos).
- Frequência: cada quarter pra detectar shift (feature shipping, segment change).

**Retention metrics — Day-N curves**:

- **D1 / D7 / D30 / D90 retention**: % users que fizeram qualified action 1/7/30/90 dias após first action.
- **Cohort retention curve**: agrupa users por signup week; mede % ativo em cada week post-signup.
- **Interpretação de padrão**:
  - **Flatten curve** (assíntota > 0): PMF — sticky cohort.
  - **Decay to zero**: NÃO PMF — leaky bucket; CAC desperdiçado.
  - **Smile curve** (cai e sobe): raro; reactivation/email funciona.
- **Benchmarks B2B SaaS 2026** (Lenny Rachitsky / OpenView):
  - **Excellent**: D30 > 80%, D90 > 60%.
  - **Good**: D30 60–80%, D90 40–60%.
  - **Marginal**: D30 30–60%, D90 20–40%.
  - **Bad**: D30 < 30%.
- **Benchmarks B2C consumer**:
  - **Excellent**: D30 > 30%, D90 > 15%.
  - **Good**: D30 15–30%.
- Comparar B2B com B2C é erro: 30% D30 = excellent em B2C, bad em B2B.

**Cohort retention SQL (Postgres)**:

```sql
WITH cohorts AS (
  SELECT user_id, DATE_TRUNC('week', created_at) AS cohort_week
  FROM users WHERE created_at >= '2026-01-01'
),
activity AS (
  SELECT user_id, DATE_TRUNC('week', occurred_at) AS active_week
  FROM events
  WHERE event_type = 'order_created'
),
joined AS (
  SELECT
    c.cohort_week,
    a.active_week,
    (a.active_week - c.cohort_week) / 7 AS weeks_since_signup,
    COUNT(DISTINCT c.user_id) AS active_users
  FROM cohorts c
  JOIN activity a ON c.user_id = a.user_id AND a.active_week >= c.cohort_week
  GROUP BY c.cohort_week, a.active_week
),
sizes AS (
  SELECT cohort_week, COUNT(DISTINCT user_id) AS cohort_size
  FROM cohorts
  GROUP BY cohort_week
)
SELECT
  j.cohort_week,
  j.weeks_since_signup,
  j.active_users,
  s.cohort_size,
  ROUND(j.active_users::numeric / s.cohort_size * 100, 1) AS retention_pct
FROM joined j
JOIN sizes s ON j.cohort_week = s.cohort_week
ORDER BY j.cohort_week, j.weeks_since_signup;
```

- Output renderiza como triangle table (cohort_week × weeks_since_signup) — padrão Mixpanel/Amplitude.

**Activation funnel — descobrir o "Aha moment"**:

- **Aha moment** = ação correlacionada com retention longo. Não é opinião — descobre-se via dados.
- **Método**: compara first-week behavior de D90+ retained users vs churned. Identifica ação que 80% retained fizeram vs 30% churned.
- **Examples canônicos**:
  - Facebook: "7 friends in 10 days".
  - Slack: "2000 messages sent" (org-level).
  - Dropbox: "1 file uploaded + 1 device installed" (cross-device anchor).
  - Twitter: "30 follows".
- **Logística aha**: lojista que cria 5+ pedidos no first week + integra Stripe → 85% D90 retention; lojista que só faz signup → 8% D90. Aha = "5 orders + Stripe in week 1".

**Activation event no produto**:

- **Onboarding flow** drive user até aha o mais rápido possível. Cada step adicional = drop-off.
- **A/B reduzindo friction**: original 12 steps → novo 5 steps; activation rate 35% → 58% (números reais Superhuman/Notion-style).
- **Activation gating** (premium SaaS): destrava features avançadas só após aha — força user a investir antes de avaliar custo.

**MAU/DAU + DAU/MAU ratio**:

- **DAU** (Daily Active) / **WAU** / **MAU**, com "active" = qualified action (created order), NÃO login.
- **DAU/MAU ratio** (stickiness):
  - **> 50%**: consumer addiction-tier (TikTok, IG, WhatsApp).
  - **30–50%**: excellent SaaS (Slack, Notion, Linear).
  - **15–30%**: good SaaS B2B.
  - **< 15%**: low engagement; questionar PMF.
- "Active" = login infla métrica com bot traffic + curiosity opens — descarta.

**Net Revenue Retention (NRR) — métrica B2B crítica**:

```
NRR = (start_ARR + expansion - downgrade - churn) / start_ARR × 100%
```

- Cohort fechado, mensurado em janela de 12 meses.
- **Benchmarks 2026** (Bessemer State of the Cloud):
  - **World-class**: NRR > 130% (Snowflake, Datadog em peak).
  - **Excellent**: 110–130%.
  - **Good**: 100–110%.
  - **Marginal**: 90–100%.
  - **Bad**: < 90%.
- NRR > 100% = "negative churn" — expansion offsets churn. Buy signal pra investidores; preserva growth com baixo CAC.

**Logística — measurement program aplicado**:

- **Sean Ellis quarterly**: in-app modal após 5+ orders; target 100 respostas/quarter; report pmf_pct ao founder.
- **Cohort retention dashboard**: Postgres query (acima) + Grafana panel; refresh weekly; trigger alert se D30 cai > 5pp QoQ.
- **Aha discovery**: top 100 retained tenants vs top 100 churned; cluster actions week 1; identifica drivers (5 orders + Stripe + 1 webhook integrado).
- **Activation funnel**: signup → tenant created → 1st order → 5th order. Target: 5 orders week 1; current 32%; goal 50% via onboarding redesign.
- **NRR tracking**: monthly cohort do MRR contracts table; report board mensal junto com burn/runway (§2.14).

**Tools 2026**:

- **Posthog** (open-source): self-host ou cloud; cohort retention + funnels + Sean Ellis surveys nativo. Default pra eng-owned analytics.
- **Amplitude**: managed; PMF + retention dashboards prontos; pricing escala caro com MAU.
- **Mixpanel**: similar Amplitude; melhor query builder.
- **Heap**: auto-capture de eventos; menos instrumentação manual.
- **June.so**: B2B SaaS focused; retention + NRR + ICP analysis built-in.
- **Custom Postgres + Grafana**: $0; eng team owns; recomendado pra Logística no early stage.

**Anti-patterns observados**:

- **Vanity metrics** (registered users, total signups) sem cohort retention — mascara churn e finge crescimento.
- **"Active" = login** (sem qualified action) — bot traffic e curiosity opens contam.
- **PMF "feels good"** sem Sean Ellis quantitativo — founder bias domina.
- **Retention curve sem cohort breakdown** — averaging mascara melhora ou piora real.
- **Aha moment definido post-hoc por opinião** — correlação ≠ causação; gating change exige A/B test.
- **Onboarding optimizado pra "completion"** (90% complete) e não retention (80% D30) — métrica errada.
- **DAU/MAU sem qualified-action filter** — login bots inflam stickiness.
- **NRR sem definição clara de cohort start/end** — números não comparáveis entre períodos.
- **Comparar bench B2B vs B2C** — workloads diferentes; 30% D30 = excellent B2C, bad B2B.
- **Activation funnel sem step-level drop-off** — improve weakest step primeiro, não o último.

Cruza com **04-16 §2.19** (unit economics — retention drives LTV; PMF é precondição), **03-07** (observability + product analytics infrastructure), **04-12** (tech leadership — comunicar PMF status ao board), **02-19** (i18n — retention varia por locale), **04-10** (LLM — Sean Ellis sentiment analysis em escala).

---

### 2.21 SaaS pricing strategy 2026 — usage-based vs flat-rate vs hybrid, expansion mechanics, tier design, packaging anti-patterns

Pricing é o lever de maior leverage do business. Estudo Simon-Kucher (replicado anualmente desde 2003): **+1% em price realization gera +8 a +12% em operating profit**, vs +1% em volume (~+3-4%) ou +1% em variable cost (~+5-6%). Mesmo assim, a maioria dos founders de engineering background tratam pricing como afterthought — escolhem $X/mês "porque competidor cobra Y" e nunca revisitam. Resultado: deixam 30-50% de revenue na mesa, ou pior, escolhem value metric errado e travam expansion para sempre. Pricing 2026 é multi-axial — model (per-seat, flat, usage, hybrid), value metric (qual unidade cobrar), tiers (good-better-best), packaging (qual feature em qual tier), discount discipline (annual vs monthly, multi-year), e dynamics (grandfathering, price increases, NRR drivers). Cada eixo tem decisão certa que depende de COGS structure, customer behavior, e willingness-to-pay distribution. Errar qualquer um é caro — errar value metric é catastrófico (impossível de consertar sem migration painful).

#### Models compared

| Model | Como funciona | Pros | Cons | When |
|-------|---------------|------|------|------|
| **Per-seat** | $/usuário/mês (Notion $10/seat, Slack $7.25/seat business) | Predictable revenue, easy to forecast, expansion via headcount | Anti-aligned com value (1 power user > 10 lurkers); customer racionando seats; viral product penalty | Collaboration tools, CRM, dev tools onde cada user extrai valor independente |
| **Flat-rate** | $X fixo/mês independente de uso (Basecamp $99/mês unlimited users) | Simplicidade extrema, sem fricção de medição, attractive para SMB | Big customers underpaying massively; revenue não escala com value; gross margin destruída se COGS variável (LLM, compute) | Tools simples com COGS quasi-fixo, audience SMB, value metric difícil de medir |
| **Usage-based** | $/unidade consumida (Snowflake ~$2-4/credit, AWS Lambda $0.0000166667/GB-s, OpenAI gpt-5 input ~$2.50/1M tokens out 2026, Stripe 2.9% + $0.30) | Perfect alignment value↔price, low entry barrier, expansion automática com customer growth | Revenue unpredictable, customer fear de "bill shock", forecasting harder, sales cycle complexa | Infra (compute, storage, bandwidth), API products, payment processing, anything onde value scales linearmente com volume |
| **Hybrid (platform fee + usage)** | Base subscription + usage overages (Datadog ~$15-23/host/mês infra + $0.10/1M custom metrics + $1.27/M log events ingested + $1.70/M indexed; Vercel team $20/seat + $20/100GB bandwidth + Function invocations; Twilio $1/phone number + $0.0079/SMS) | Revenue floor + upside, best of both, NRR engine natural | Complexidade de billing/comm, customer needs to understand 2 dimensões, harder to compare com competitors | Maioria dos SaaS B2B 2026 — default moderno |

Trend 2024-2026: **shift massivo de per-seat puro pra hybrid com usage component**. Notion adicionou AI add-on $10/seat/mês em 2024. GitHub Copilot $19/seat business + Enterprise $39. Slack adicionou Slack AI $10/seat/mês add-on. Razão: per-seat sozinho não captura valor de AI features (1 user com Copilot consome $5-50/mês em LLM tokens — flat $19 quebra gross margin se usuário é power user, sobrelucra se é casual).

#### Value metric selection (decisão mais crítica)

Value metric = a unidade que o customer paga por. Ex.: seat (Notion), GB ingested (Datadog logs), credit consumed (Snowflake), API call (Stripe), MAU tracked (Mixpanel), record stored (Salesforce Data Cloud), GB/month transferred (Cloudflare).

Critérios pra value metric **boa**:

1. **Correlaciona com customer value** — quando customer extrai mais valor, paga mais. Snowflake credit consumido proxy direto pra queries rodadas → pra business outcomes. Per-seat em ferramenta async-first onde 80% dos seats nunca abrem app: value metric ruim.
2. **Easy to understand** — customer prevê o bill antes de gastar. "$/credit" só funciona se customer sabe traduzir workload em credits. Snowflake mitigou com cost calculator + warehouse sizing docs.
3. **Easy to meter** — engineering precisa rastrear unit reliably. Veja **03-07** — meter é producto de observability; bug em meter = revenue lost ou customer dispute. Stripe levou 8 anos pra ter usage metering pronto pra terceiros (Stripe Billing usage-based, GA 2024).
4. **Predictable from customer side** — wild swings = "bill shock" = churn. AWS é cautionary tale; Snowflake mitigou com reserved capacity + warehouse auto-suspend.
5. **Aligned com COGS** — se cada unit consome COGS variável (LLM token, compute hour), pricing precisa cobrir COGS + margin. **Cobrar flat-rate em product onde COGS é variable e unbounded é suicide gross margin**.

Anti-padrão clássico: **escolher value metric por conveniência de measurement em vez de alinhamento com value**. Ex.: cobrar por "API calls" quando 1 call de leitura é 100x mais barata que 1 call de write — customer racha endpoints e foge do pricing.

#### Expansion mechanics (NRR/NDR como north star)

**Net Revenue Retention (NRR)** = (Starting ARR + Expansion - Contraction - Churn) / Starting ARR. Mede crescimento da base existente, sem new logos. Top SaaS 2026 benchmarks (públicos):

- **Median public SaaS NRR**: 110-115% (caiu de 120% pré-2023)
- **Top decile**: 130%+ (Snowflake ~127% Q4 2024, Datadog ~115%, Cloudflare ~111%, MongoDB ~120%)
- **<100% = leaky bucket** — adquirindo customers só pra repor os que saem. Insustentável a menos que CAC payback < 6 meses.
- **>120% sustained = compound growth machine** — base cresce sem new sales effort.

Drivers de expansion (em ordem de magnitude típica):

1. **Usage growth** (40-50% do expansion em hybrid models) — customer cresce, consome mais. Automático, no sales effort. Snowflake's defining moat.
2. **Seat expansion** (20-30%) — team cresce, mais users adicionados. Per-seat e hybrid.
3. **Tier upgrade** (15-25%) — Starter → Growth → Enterprise. Driven por feature gating + support tier + compliance (SOC2, HIPAA gates).
4. **Cross-sell** (10-20%) — produtos adjacentes (HubSpot Marketing → Sales → Service Hub; Datadog Infra → APM → Logs → Security).

Engineering directive: **cada feature decisão deve perguntar "isso aumenta usage do value metric ou só satisfaz feature request?"**. Onboarding melhor → mais workspaces criados → mais seats adicionados → expansion. Activity feed → mais engagement → mais sticky → less churn. Veja **04-15** — product strategy precisa estar amarrado a NRR levers.

#### Tier design — good-better-best, anchoring, decoy

Standard pattern: **3 tiers visíveis + 1 enterprise (custom)**. Por quê 3? Choice paralisis em 4+; "Goldilocks effect" em 3 (médio vence). Notion: Free / Plus $10 / Business $15 / Enterprise (custom). Linear: Free / Standard $8 / Plus $14 / Enterprise. Vercel: Hobby / Pro $20 / Enterprise.

Anchoring: **mostrar Enterprise (mais caro) primeiro ou destacar Business como "Most Popular"** força customer a comparar contra preço alto, fazendo Plus parecer barato. Marketing sites 2026 quase universalmente fazem isso.

Decoy effect: tier intencionalmente pior cost/benefit pra empurrar customer pro tier alvo. Clássico The Economist (Ariely 2008): web $59, print $125, web+print $125 → 84% escolhem web+print porque print-only é "decoy". Em SaaS: Plus tier feature-poor demais pra force upgrade pra Business.

Willingness-to-pay segmentação: tiers existem porque WTP não é uniforme. Solo dev paga $10, startup team paga $50/seat, Fortune 500 paga $200/seat pelo MESMO core product + compliance + SSO + audit. Tiers capturam consumer surplus em cada segmento.

#### Packaging discipline — qual feature em qual tier

Princípio: **gate features que correlacionam com customer size/sophistication**, não features que custam mais pra rodar. Erros comuns:

- **Gating features que custam pouco mas all customers querem** (e.g., 2FA em tier pago) — bad press, segurança não é upsell.
- **Não gating features que enterprise needs** (SSO/SAML, audit logs, RBAC, SCIM provisioning, custom data residency) — deixa dinheiro na mesa. **"SSO tax" é industry standard 2026** — SAML SSO é Enterprise-tier-only em 95% dos SaaS B2B. Sites como ssotax.org pressionam, mas mercado paga.
- **Gating limites em vez de features** quando product é collaborative — limitar workspace size em Free força viral upgrade (Notion, Figma, Linear playbook).

Standard 2026 packaging:

- **Free / Hobby**: 1 user ou small team, single project, 30-day history, community support. Loss-leader, viral motion.
- **Pro / Plus** ($10-30/seat/mês): teams pequenos, advanced features, email support, 90-day history.
- **Business / Growth** ($20-50/seat/mês): SSO, audit logs, advanced permissions, priority support, integrations.
- **Enterprise** (custom, $50-300/seat/mês ou flat $50k-500k+ ARR): SAML, SCIM, dedicated CSM, SLA, custom data residency, BAA/HIPAA/FedRAMP, on-prem option, custom contract terms.

#### Pricing changes — grandfathering e comm strategy

Aumentar preço em customer existente é maior risk-reward decision em pricing. Erros que fizeram empresas perderem 20-40% da base em 3 meses:

- **Notion 2024 AI bundling forced upgrade** — backlash significativo, parcialmente revertido.
- **Adobe Creative Cloud single-app → all-app forced bundle** — public outcry, lawsuits, FTC scrutiny.
- **Twitter/X API monetization 2023** — community devs mass-exodus, third-party ecosystem destruído.

Playbook seguro:

1. **Grandfather existing customers no preço atual** — pelo menos 12-24 meses, idealmente para sempre em legacy plans. Custo: revenue oportunidade. Benefício: zero churn de aumento + goodwill.
2. **New pricing só pra new customers + new tiers**. Existing customers podem opt-in pra novo plan se features novas valem.
3. **Comm 60-90 dias antes**, email + in-app + blog post + CSM outreach pra top accounts. Founder/CEO assina email — não "Marketing Team".
4. **Grandfather window com upgrade incentive**: "Lock in current price for 24mo se assinar annual antes de [data]" — converte mensais em anuais, reduces churn risk em 50%+.
5. **Grandfathering forever pra top customers** — Stripe famously grandfather early customers em 2.4% (vs 2.9% standard). Goodwill imenso, custo marginal trivial em base do tamanho deles.

#### Discount discipline

- **Annual prepay**: 15-20% discount standard. Trade-off: cash up front + churn protection vs revenue per customer. Pra business com CAC alto, annual é existential — paga CAC payback de uma vez.
- **Multi-year (2y, 3y)**: 25-35% discount, mas rare em SMB; padrão em enterprise. Lock-in vs price flexibility trade-off.
- **Volume discount em usage-based**: tiered ou committed-use (Snowflake CUP — Capacity Units Purchase, AWS RIs/Savings Plans). Customer compromete X/year, recebe 20-40% off em troca.
- **NPV discipline**: every discount aprovado deve passar por "qual o NPV do contrato vs walk-away?". Sales não tem discretion ilimitado — pricing committee aprova >20% discount. Salesforce literalmente tem "Deal Hub" pra isso.
- **Anti-padrão**: descontos discretionários sem floor → race to bottom interno, sales rep optimizing pra fechar e não pra LTV.

#### Stack Logística aplicada

Marketplace SaaS multi-tenant com seller dashboard + buyer checkout + analytics. COGS structure:

- **Per-tenant fixed**: Postgres tenant DB ($5-50/mo), Redis namespace ($2/mo), object storage baseline ($1-10/mo).
- **Variable usage**: order volume → DB IO + queue jobs + Stripe fees passthrough; analytics queries → ClickHouse compute; LLM features (smart product descriptions, customer support copilot) → token spend; bandwidth on product images.

**Decisão**: hybrid platform fee + usage components.

Tier sketch:

| Tier | Preço | Inclui | Overages |
|------|-------|--------|----------|
| **Starter** | $49/mês | 1 store, 100 orders/mo, 1GB images, basic analytics, email support | $0.50/order acima de 100 |
| **Growth** | $199/mês | 3 stores, 1000 orders/mo, 10GB images, advanced analytics + cohort retention, AI product descriptions (1k generations), priority email | $0.30/order, $5/100 AI gens |
| **Scale** | $799/mês | 10 stores, 10k orders/mo, 100GB images, real-time analytics, AI copilot, multi-currency + i18n, Slack support | $0.20/order, $3/100 AI gens, $0.10/GB image overage |
| **Enterprise** | Custom $30k-300k+ ARR | Unlimited stores, dedicated infra (single-tenant DB option), SSO/SAML, SOC2/PCI compliance docs, custom SLA 99.95%, dedicated CSM, custom AI fine-tuning | Negotiated commit |

Value metric primário: **orders processados/mês** (perfect proxy pra GMV → seller value). Secondary: AI generations (cobre LLM COGS — passthrough + 30% margin). Storage e bandwidth inclusas em quotas generosas (COGS baixo, comm overhead alto se cobrar).

NRR drivers desenhados: seller volume cresce → orders crescem → expansion automática (40-50% NRR contribution); features novas (AI copilot 2026, multi-currency 2026, fraud detection 2027) drive tier upgrade; cross-sell futuro (logistics integration, payment financing) target 15-25% adicional. Target NRR: 120-130% steady state.

#### 10 anti-patterns

1. **"We'll figure pricing later"** — pricing post-launch é 10x mais difícil; decisões iniciais (free tier limites, value metric) viram contratos sociais com customers.
2. **Per-seat em product onde value scales com usage** — penalizes power users e viral growth; 1 power user >> 10 seats lurking.
3. **Flat-rate em product com COGS variável unbounded** (LLM resale, compute, bandwidth) — gross margin colapsa quando whales aparecem.
4. **Free tier sem cap em COGS-heavy resource** — free users consumindo $500/mo em LLM tokens; cap mensal obrigatório.
5. **Mudar preço pra existing customers sem grandfathering** — mass churn + Hacker News firestorm + permanent reputation damage.
6. **Value metric escolhida por measurement convenience, não value alignment** — customer arbitra contra a metric (rachando endpoints, batching writes).
7. **Tiers sem anchor / sem most-popular highlight** — choice paralysis; conversão drop 30-50%.
8. **"Contact sales" em todos os tiers** — friction massiva pra SMB; PLG (Product-Led Growth) requer self-serve até $10-50k ARR.
9. **Discount discretionário sem floor** — sales fecha negócios LTV-negativos pra bater quota; pricing committee + NPV gate obrigatório.
10. **Não meter o value metric com observability rigor** — billing bug = revenue lost (under-bill) ou customer dispute escalado pra CEO (over-bill); meter é producto de eng tier-1, não cron job side project.

Cruza com **04-16 §2.1** (revenue models intro — pricing é onde model encontra reality), **04-16 §2.5** (CAC — pricing afeta payback period diretamente), **04-16 §2.8** (pricing strategy basics — fundação), **04-16 §2.13** (engineering levers — meter, billing infra, dunning), **04-16 §2.16** (cost optimization — gross margin = pricing - COGS), **04-16 §2.19** (unit economics — LTV/CAC depende fundamentalmente de pricing), **04-15** (product strategy — packaging amarrado a NRR roadmap), **03-07** (observability — value metric metering production-grade), **04-10** (LLM cost passthrough — token economics em hybrid pricing).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Diferenciar MRR e ARR; explicar Net New MRR breakdown.
- Calcular LTV simples dado ARPU, gross margin, churn.
- Justificar LTV/CAC > 3 e payback < 12.
- Explicar cohort analysis e o que platô significa.
- Distinguir gross e net churn.
- Mostrar unit economics positivo vs negativo com exemplo.
- Listar 4 estratégias de pricing.
- Diferenciar PLG e sales-led; quando cada.
- Explicar marketplace cold start e 3 mitigations.
- Listar 5 levers de engineering em cost/revenue.
- Aplicar Rule of 40.
- Distinguir ACV e TCV; explicar discount multi-year.

---

## 4. Desafio de Engenharia

Construir **dashboards e simulator de unit economics da Logística** + propostas de engineering com ROI calculado.

### Especificação

1. **Dashboard de business metrics** (Grafana ou Metabase contra ClickHouse/Timescale, 03-13 conexão):
   - GMV diário/mensal/anual.
   - Take rate efetivo.
   - Revenue (MRR de subscription + transactional).
   - Net New MRR breakdown (new/expansion/contraction/churn).
   - Cohort retention (M0 → M+12) por tenant.
   - Gross margin = revenue - variable costs.
   - Active couriers / lojistas / clientes (MAU/DAU).
   - Liquidity (% pedidos atribuídos / criados).
2. **Unit economics simulator** (Node CLI ou notebook):
   - Inputs: ARPU, churn, gross margin, CAC, growth rate.
   - Outputs: LTV, payback, MRR projection 24m, sensitivity analysis.
3. **3 propostas de engineering** (`proposals/`):
   - Cada uma com: problema atual, solução proposta, cost (eng-time + infra), benefit ($ revenue / cost reduction / risk mitigation), payback, riscos.
   - Exemplos:
     - "Cache de geocoding em Redis": reduz API external bill em $X/mês.
     - "Auto-scale K8s + spot": reduz infra cost em Y%.
     - "Onboarding flow optimization": reduz time-to-first-delivery, lift conversion Z%.
4. **Pricing experiment**:
   - Implementar A/B test framework simples (LaunchDarkly ou home-rolled).
   - Variant A: take rate 8%; B: 10% com SLA garantido. Coletar conversion + retention.
5. **Cost dashboard** (AWS Cost Explorer ou Vantage / OpenCost se K8s):
   - Cost por feature/component (tags).
   - Identificar top-3 cost drivers.
6. **Doc `BUSINESS-CONTEXT.md`**:
   - Modelo de revenue.
   - Unit economics atual.
   - North-star metric e proxy metrics.
   - 3 maiores levers identified.

### Restrições

- Métricas refletem dados reais (mesmo que simulados em volume).
- Propostas com $ estimados, não vague.
- Pricing experiment isolado (não afeta produção real obviamente, em sandbox).

### Threshold

- Dashboard funcional com 8+ painéis.
- Simulator roda com sensitivity (ex: "se churn cai 1pt, LTV sobe X%").
- 3 proposals com ROI calculado.
- A/B test infra funcional.

### Stretch

- **Forecast model**: ARIMA ou Prophet pra GMV próximos 6 meses.
- **Anomaly alerts**: alertar quando churn ou liquidity desviam > 2σ.
- **Pricing optimizer**: simulação Monte Carlo de revenue sob N pricing strategies.
- **Customer health score**: ML predictivo de churn (logistic regression simples ou gradient boost).
- **Cohort waterfall** chart automatizado.
- **TCO calculator** comparing self-host vs managed (Postgres self-hosted vs RDS, Kafka self vs Confluent Cloud).

---

## 5. Extensões e Conexões

- Liga com **02-18** (payments): take rate, billing, ledger.
- Liga com **03-07** (observability): metrics customer-facing.
- Liga com **03-10** (backend perf): infra cost direct correlation.
- Liga com **03-13** (analytical DBs): warehouse pra BI.
- Liga com **04-03** (event-driven): event log = source of truth pra metrics.
- Liga with **04-12** (tech leadership): proposals decision-making.
- Liga com **04-15** (OSS): sustainability models são variantes destes.
- Liga com **CAPSTONE-sistemas**: Logística v3 inclui dashboards.

---

## 6. Referências

- **"The SaaS Playbook"**: Rob Walling.
- **"From Impossible to Inevitable"**: Aaron Ross, Jason Lemkin.
- **"Lean Analytics"**: Alistair Croll, Benjamin Yoskovitz.
- **"Platform Revolution"**: Parker, Van Alstyne, Choudary (marketplaces).
- **"The Lean Startup"**: Eric Ries.
- **"Crossing the Chasm"**: Geoffrey Moore.
- **a16z growth handbook** ([a16z.com/growth-handbook](https://a16z.com/growth-handbook)).
- **For Entrepreneurs**: David Skok ([forentrepreneurs.com](https://www.forentrepreneurs.com/)).
- **OpenView SaaS Benchmarks** anuais.
- **High Alpha / Bessemer State of the Cloud** reports.
- **"Why Software Is Eating The World"**: Marc Andreessen.
- **OpenAI / Anthropic / Stripe / Notion / Figma engineering blogs**: engineering meets business.
