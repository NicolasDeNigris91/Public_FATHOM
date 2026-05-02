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
