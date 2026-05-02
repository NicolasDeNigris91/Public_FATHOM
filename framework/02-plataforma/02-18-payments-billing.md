---
module: 02-18
title: Payments & Billing, Stripe-Level Integration, Idempotency, Reconciliation, Subscriptions
stage: plataforma
prereqs: [02-13]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 02-18, Payments & Billing

## 1. Problema de Engenharia

Pagamento é um dos domains mais densos de engenharia em qualquer produto. **Money is hard**: idempotência, double-charge, partial failures, refunds, chargebacks, taxas, multiple currencies, FX, tax (IVA/ICMS/sales tax), invoicing, dunning, subscriptions, prorations, webhooks duplicados, reconciliation com PSP, ledgers, accounting compliance (ASC 606, PCI-DSS escopo). Erros aqui custam dinheiro real e podem virar fraude/processo.

Quase todo dev que tenta integrar Stripe/Adyen/Mercado Pago "do jeito tutorial" produz código que funciona no happy path e quebra na primeira retry, webhook duplicado, ou reembolso parcial. Senior conhece o **modelo correto**: payment intent, idempotency key, ledger imutável, webhook signature verification, reconciliation diária.

Este módulo é payments **por dentro**: anatomia de cobrança, PSP arquitetura, idempotência forte, double-entry ledger, webhooks e replay safety, subscriptions com prorations, tax calculation, refund/chargeback flows, multi-tenant marketplace, e PCI-DSS escopo. Logística monetiza entregas e split entre lojistas/entregadores, esse módulo materializa isso.

---

## 2. Teoria Hard

### 2.1 Anatomia de uma cobrança no cartão

Fluxo simplificado:
1. **Customer** entra dados no client (Stripe Elements/Checkout, você nunca vê PAN cru, escopo PCI reduzido).
2. **Tokenization**: PSP retorna token (`pm_xxx`). Você guarda token, não cartão.
3. **Authorization**: PSP envia ao acquirer → rede (Visa/Mastercard) → issuer. Resposta: approve/decline. Funds **reservados**, não capturados.
4. **Capture**: comita o auth (até 7 dias). Funds saem do cartão.
5. **Settlement**: T+1/T+2, dinheiro vai do issuer pro acquirer pra você.
6. **Disputes/Chargeback**: customer reclama → issuer reverte → você responde.

PSPs (Stripe, Adyen, Pagar.me, Mercado Pago) abstraem isso, mas você ainda decide auth+capture-now vs auth-then-capture-later (pré-autorização hotelaria), 3DS challenge, etc.

### 2.2 PaymentIntent / OrderRef pattern

API moderna: você cria **intent** (objeto stateful no PSP) representando intenção de cobrar valor X. Atualiza status (requires_payment_method → requires_confirmation → succeeded/failed). Idempotente.

Anti-pattern antigo: chamar `charge` direto e tratar resposta. Falha catastrófica em retries.

Stripe PaymentIntent, Adyen Sessions, MP Preference. Use sempre.

### 2.3 Idempotency keys

Network falha. Cliente retry. Sem idempotency, você cobra 2x.

PSPs aceitam `Idempotency-Key` header (UUID v4). PSP detecta repetição na chave e retorna mesmo resultado.

**Você** também precisa idempotency interna: endpoint POST `/orders/:id/charge` deve aceitar key do cliente, persistir resultado. Retry com mesma key retorna mesmo response sem efeito colateral. Implementação: tabela `idempotency_keys (key pk, request_hash, response_body, created_at)`.

Janela de validade: 24h-7d típico. TTL via `created_at`.

### 2.4 Webhooks: o nervo central

PSP envia eventos (`payment_intent.succeeded`, `charge.refunded`, `customer.subscription.updated`) pro seu endpoint via HTTP POST. **Síncronos não substituem webhooks**: webhook é a fonte de verdade.

Regras:
- **Verifique signature** (HMAC com secret). Sem isso, atacante forja eventos.
- **At-least-once delivery**: pode chegar duplicado. Idempotente. Use event ID + dedupe em DB.
- **Out of order**: evento mais novo pode chegar primeiro. Compare timestamps; ignore stale.
- **Resposta 2xx rápida**: PSP retry se você demora ou retorna 5xx. Faça trabalho async, receba, persista, ack, processe em background.
- **Replay protection**: tolerância de timestamp (Stripe: 5 min) pra evitar replay attack.

### 2.5 Estados consistentes: state machine

Pedido tem estados (`pending`, `requires_payment`, `paid`, `shipped`, `delivered`, `canceled`, `refunded`, `partially_refunded`). Pagamento idem.

Modele explicitamente como **finite state machine**. Transições válidas únicas. Inválidas viram erro (ex: capturar pedido já capturado retorna idempotente, não duplica).

### 2.6 Double-entry ledger

Conceito de accounting: cada transação afeta ≥ 2 contas, débitos = créditos. Imutável. Audit trail completo.

```
event: charge $100
  Cash:        +$100 (debit)
  Sales:       +$100 (credit)

event: refund $30
  Sales return: +$30 (debit)
  Cash:         -$30 (credit)
```

Implementação: tabela `ledger_entries (id, txn_id, account_id, amount, direction, currency, posted_at)`. Sums por account = saldo. Imutável (sem update/delete; correções via reversal entry).

Em produto, ledger é a **fonte de verdade** financeira; `orders.status='paid'` é cache/read model. Reconciliation cruza ledger com extrato PSP, diferenças investigadas.

### 2.7 Refunds e partial refunds

Refund = reverter cobrança. Total ou parcial. PSP API: `refunds.create(charge_id, amount?)`.

Cuidados:
- Idempotency.
- Atualizar ledger (reversal entry).
- Estado: full refund → `refunded`; partial → `partially_refunded` com `refunded_amount`.
- Tax e fees: PSP fee geralmente NÃO retorna (Stripe agora reembolsa em alguns casos). Documente.

### 2.8 Disputes/chargebacks

Customer reclama; issuer reverte fundos preventivamente. Você precisa **responder com evidência** (Stripe Dashboard), fotos de delivery, logs, tracking. Win/lose.

Impacto operacional: reservar contingência, reduzir taxa de chargeback (alvo < 1%), implementar 3DS pra shift de liability.

### 2.9 3DS / SCA

3D Secure: autenticação do cardholder via app banco. Strong Customer Authentication (PSD2 EU): obrigatório em txns elegíveis.

Liability shift: txn 3DS bem-sucedida transfere risco ao issuer (em chargeback de "didn't authorize"). Vale custo de friction em alto-valor.

Fluxo: PSP retorna `requires_action` → cliente faz challenge → confirm. Anti-pattern: ignorar `requires_action` e considerar success.

### 2.10 Tax calculation

Sales tax/IVA/ICMS é caos:
- Origem vs destino.
- Nexus (presença física vs econômica) determina obrigação.
- Brasil: ICMS por estado, ISS pra serviços, PIS/COFINS, varia por NCM/CFOP.
- EU: IVA por país do customer, MOSS scheme pra digital.
- US: Wayfair (2018) trouxe sales tax remoto; cada state diferente.

Não calcule na mão. Use **TaxJar, Avalara, Stripe Tax**. Cache rates com TTL. Docs fiscais (NF-e, fatura europeia) geradas via emissor.

### 2.11 FX e multi-currency

Cobre na moeda do customer; settled na sua. PSP faz conversão (com markup). Alternativa: você processa na sua moeda; customer paga FX no banco.

Money em código: **nunca float**. Use `bigint` em centavos (cents/cents-of-cents). Exemplo: `R$ 19,99` = `1999`. Lib: `dinero.js`, `money.js`.

Currency code ISO 4217 (`BRL`, `USD`, `EUR`). Persistência: `amount_cents bigint, currency char(3)`.

### 2.12 Subscriptions

Cobranças recorrentes. Conceitos:
- **Plan / Price**: produto + intervalo + valor.
- **Subscription**: customer + plan + status (`active`, `past_due`, `canceled`).
- **Proration**: upgrade mid-cycle, cobra diff proporcional.
- **Trial**: free initial period.
- **Dunning**: retry policy em falha de cobrança (4 tentativas em 21 dias é típico).
- **Cancelation**: imediato ou ao fim do período.
- **Pause**: alguns PSPs suportam.

Webhooks essenciais: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`.

### 2.13 Marketplaces e split payments

Logística é multi-tenant: lojista paga, plataforma fica com fee, entregador recebe parcela. Split:
- **Stripe Connect** (Standard/Express/Custom): cada party tem account; pagamento split via `transfer_data` ou `application_fee`.
- **Mercado Pago Marketplace**: similar.

KYC (Know Your Customer) obrigatório nos accounts. PCI-DSS escopo expande.

### 2.14 PCI-DSS scope

Padrão de segurança pra cartão. Níveis baseados em volume.
- Se PAN passa pelos seus servers: SAQ D / Level 1 (auditoria caro).
- Se você usa Stripe.js / Elements (PSP iframe): SAQ A (escopo mínimo).

**Sempre** evite tocar PAN. Use elements/checkout. Nunca log PAN, CVV.

### 2.15 Reconciliation

Ledger interno vs extrato PSP devem bater. Diariamente:
- Pull settlement report do PSP (Stripe Sigma/balance transactions, Adyen reports).
- Match com ledger por `txn_id` ou correlation ID.
- Diferenças investigadas (fee não esperado, refund pendente, dispute em curso).

Automation: job batch nightly, dashboard com discrepancy aberto. Senior aceita zero não explicado.

### 2.16 Storing customer payment methods

Token (`pm_xxx`) + customer id PSP. Re-cobrança recorrente via token. Customer Portal (Stripe) permite usuário gerenciar.

Update card detection: PSP atualiza expiry/PAN automaticamente em alguns casos (Account Updater). Ative.

### 2.17 Pix (Brasil context)

Pix é instant payment via BCB. PSPs intermediam: Stripe ainda limitado, Mercado Pago/Pagar.me/iugu oferecem. Fluxo: gera QR / copia-e-cola → user paga → webhook em segundos.

Reconcile via end-to-end ID (E2E ID). Refund via reversal Pix com janela.

### 2.18 Boleto (Brasil context)

Pagamento offline. Gera boleto, customer paga em banco/app. Liquidação D+1 a D+3. PSPs (Pagar.me, MP) emitem.

Cancele automaticamente após vencimento. Dunning: enviar 2º email, gerar 2ª via.

### 2.19 Webhook security + reconciliation patterns + dispute handling

Webhook é o canal de truth assíncrona entre PSP (Stripe/Adyen/Pagar.me/Pix) e seu sistema. Implementação ingênua: 4 vetores de breach + race conditions + reconciliation pesadelo. Esta seção entrega: signature verification production-ready, idempotent processing, ordering handling (out-of-order webhooks), reconciliation diária reconciliando PSP ↔ DB ↔ ledger contábil, dispute (chargeback) workflow.

**Webhook security — 5 layers obrigatórias**:

**2.19.1 Signature verification (Stripe pattern)**:

```typescript
// app/api/webhooks/stripe/route.ts
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET!);
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const payload = await req.text();   // RAW body, NÃO parsed JSON
  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('Missing signature', { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, WEBHOOK_SECRET);
  } catch (err) {
    log.warn({ err }, 'webhook signature failed');
    return new Response('Invalid signature', { status: 400 });
  }

  await handleEvent(event);
  return new Response('ok', { status: 200 });
}
```

- **Pegadinha CRÍTICA**: usa `req.text()` (raw body), NÃO `req.json()`. Express `body-parser` precisa `express.raw({ type: 'application/json' })` no path do webhook ANTES do `express.json()`.
- Sem signature: qualquer um pode POST fake event → conta paga falsa.
- Stripe sig algoritmo: HMAC-SHA256 de `timestamp.payload` com `WEBHOOK_SECRET`.

**2.19.2 Replay attack — timestamp tolerance**:

- Stripe inclui timestamp em sig header. `constructEvent` valida tolerance default 300s.
- Set explicit: `stripe.webhooks.constructEvent(payload, sig, secret, 300)`.
- Sem replay protection: atacante captura webhook legítimo, replays semanas depois.

**2.19.3 Idempotent processing — duplicate event protection**:

```typescript
async function handleEvent(event: Stripe.Event) {
  await db.transaction(async (tx) => {
    const existing = await tx.processedWebhooks.findFirst({ where: { eventId: event.id }});
    if (existing) {
      log.info({ eventId: event.id }, 'duplicate, skipping');
      return;
    }

    await processStripeEvent(event, tx);

    await tx.processedWebhooks.insert({
      eventId: event.id,
      eventType: event.type,
      processedAt: new Date(),
    });
  });
}
```

- Stripe envia event 2-3x em casos de timeout. Sem dedupe = double charge update, double email.

**2.19.4 Out-of-order handling**:

- Webhooks NÃO são FIFO. `payment_intent.succeeded` pode chegar ANTES de `payment_intent.created`.
- **Pattern**: ignore eventos antigos via `event.created` timestamp ou via state machine validation.

```typescript
await db.payments.update({
  where: { stripeId: event.data.object.id },
  data: {
    status: event.data.object.status,
    lastEventAt: new Date(event.created * 1000),
  },
}, {
  // Só atualiza se este evento é mais recente que último processado
  where: { lastEventAt: { lt: new Date(event.created * 1000) }}
});
```

**2.19.5 Quick ack + async processing**:

- Webhook handler responde 200 em < 5s. Stripe retries se demorar.
- Pra processing pesado: enfileire pra worker.

```typescript
export async function POST(req: Request) {
  const event = constructAndVerify(...);
  await db.webhookInbox.insert({ eventId: event.id, payload: event });
  return new Response('ok', { status: 200 });
}
// Worker separado processa inbox (cruza com 04-02 §2.18 inbox pattern)
```

**Reconciliation — closing the loop daily**:

PSP source of truth pode divergir do seu DB. Webhook lost, partial failure, manual operations no PSP dashboard. Pattern diário:

```typescript
// Cron 02:00 daily
async function reconcile() {
  const yesterday = startOfYesterday();

  const stripeCharges = await stripe.charges.list({
    created: { gte: yesterday.getTime() / 1000, lt: yesterday.getTime() / 1000 + 86400 },
    limit: 100,
  }).autoPagingToArray({ limit: 10000 });

  const dbPayments = await db.payments.findMany({
    where: { createdAt: { gte: yesterday, lt: addDays(yesterday, 1) }},
  });

  const stripeMap = new Map(stripeCharges.map(c => [c.id, c]));
  const dbMap = new Map(dbPayments.map(p => [p.stripeId, p]));

  const missingInDb = stripeCharges.filter(c => !dbMap.has(c.id));
  const missingInStripe = dbPayments.filter(p => !stripeMap.has(p.stripeId));
  const stateMismatch = stripeCharges.filter(c => {
    const db = dbMap.get(c.id);
    return db && db.status !== c.status;
  });

  if (missingInDb.length || missingInStripe.length || stateMismatch.length) {
    await alertOps({
      date: yesterday,
      missingInDb: missingInDb.length,
      missingInStripe: missingInStripe.length,
      stateMismatch: stateMismatch.length,
    });
  }

  await persistReconciliationReport(...);
}
```

Reconciliation finds bugs antes que finance fecha mês com balance errado.

**Triple-entry ledger pattern (production-grade)**:

- **PSP charges** (source of truth pra cobrança).
- **Internal DB payments table** (linked ao order/customer).
- **Accounting ledger** (immutable double-entry, debit/credit; sem update; só append).

```sql
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY,
  entry_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  account TEXT NOT NULL,
  direction TEXT CHECK (direction IN ('debit', 'credit')),
  amount_minor BIGINT NOT NULL,
  currency TEXT NOT NULL,
  reference_id TEXT NOT NULL,    -- ex: stripe_charge_id
  reference_type TEXT NOT NULL,  -- 'charge', 'refund', 'fee', 'payout'
  metadata JSONB
);

-- Index pra reconciliation queries
CREATE INDEX ON ledger_entries (reference_type, reference_id);
CREATE INDEX ON ledger_entries (account, entry_at DESC);
```

Toda transação: 1 charge → 2+ entries (debit customer account, credit revenue). Reconciliation: `sum(credit) - sum(debit)` por account = saldo. Compara com bank/PSP balance. Used by Stripe internally, banks, fintechs.

**Dispute (chargeback) handling**:

Customer abre dispute via banco → PSP suspende fundos → você tem 7-21 dias pra responder.

```typescript
stripe.events.on('charge.dispute.created', async (event) => {
  const dispute = event.data.object;
  await db.disputes.insert({
    chargeId: dispute.charge,
    amount: dispute.amount,
    reason: dispute.reason,           // 'fraudulent', 'product_not_received', etc.
    evidence_due_by: new Date(dispute.evidence_details.due_by * 1000),
    status: 'needs_response',
  });
  await alertFinance(dispute);
  await pauseCustomerOrders(dispute.charge);
});
```

Evidence package: ordem detail, courier tracking, delivery photo, signed receipt, communication log. **Win rate típico** (Stripe data): 30-50% para fraud/product_not_received se evidence é forte; 0-10% para "credit_not_processed" sem refund record. Loss = chargeback amount + chargeback fee ($15-25). Reincidência alta (> 1%) = PSP impõe higher reserves ou termina conta.

**Pix-specific (Brasil)**:

- PSP envia webhook em pagamento Pix recebido — `pix.received` com `txid`, `e2eId`, valor.
- Reconciliation Pix: SPI/Bacen tem statements; reconcile diário com batch CNAB ou OpenBanking API.
- Pix Devolução (refund): janela 90 dias; processada como Pix novo de você → devolvedor.

**Webhook timeout retries — como cada PSP comporta**:

| PSP | Retry policy |
|---|---|
| Stripe | 3 dias, exponential backoff (immediate, 1m, 5m, 15m, 1h, ...) |
| Adyen | 8 retries em 12h |
| Pagar.me | 5 retries em 24h |
| Mercado Pago | retries até 24h |

Após max retries: PSP marca como failed; vai pra dashboard. Você precisa monitor + manual recovery.

**Logística end-to-end — payment + webhook + ledger**:

```
1. Customer paga via Stripe Checkout
2. Stripe redirect → success URL → DB marca "pending_confirmation"
3. Stripe envia webhook charge.succeeded
   → handler verifica sig
   → check duplicate (processed_webhooks)
   → atomic TX:
     - update payments status='succeeded'
     - insert ledger entries (debit customer / credit revenue / credit Stripe fee)
     - publish OrderConfirmed event
   → ack 200
4. Daily 02:00 cron reconcile:
   - fetch Stripe charges from last 24h
   - compare com payments + ledger
   - alert se mismatch
5. Webhook charge.dispute.created
   - pause customer orders
   - assemble evidence
   - submit via Stripe API
```

**Anti-patterns observados**:

- **`req.json()` em webhook**: corrompe raw body; signature falha.
- **Sem signature verification**: aceita fake webhooks.
- **Sem idempotency**: duplicate processing on retry.
- **Processing síncrono pesado**: handler timeout > 5s; PSP retry; spiral.
- **Sem reconciliation diária**: divergence acumula meses; impossível auditar.
- **Update payment status sem timestamp check**: out-of-order webhook escreve status antigo sobre novo.
- **Sem ledger imutável**: bug em update payment loses history; auditoria contábil impossível.
- **Dispute notification só por email**: perde deadline; chargeback automático; loss garantida.
- **Webhook secret em código**: vazado em git history; atacante forja sigs. Use env + rotation.

Cruza com **02-18 §2.15** (reconciliation foundation), **02-18 §2.17** (Pix specifics), **04-02 §2.18** (idempotent consumer = pattern do webhook handler), **04-04 §2.4** (idempotency em retries gerais), **03-08 §2.13** (secrets management pra webhook secret), **04-09 §2.20** (load shedding em webhook spike).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Listar fases de cobrança em cartão (auth → capture → settlement → dispute) com tempos típicos.
- Explicar PaymentIntent vs charge direto e por que o primeiro vence.
- Implementar idempotency key em endpoint POST de cobrança.
- Listar 5 regras de webhook (signature, dedupe, out of order, ack rápido, replay).
- Explicar double-entry ledger com exemplo charge + refund.
- Diferenciar PCI-DSS SAQ A vs SAQ D; o que mantém você em A.
- Explicar liability shift de 3DS.
- Justificar bigint cents em vez de float.
- Explicar proration em subscription upgrade mid-cycle.
- Justificar reconciliation diária.

---

## 4. Desafio de Engenharia

Adicionar **billing** à Logística: pagamento de pedidos com split entre lojista, plataforma e entregador.

### Especificação

1. **Setup**: Stripe (test mode) + Stripe Connect Express accounts pra lojistas e entregadores.
2. **Onboarding**:
   - Lojista/entregador faz onboarding Stripe Connect via OAuth Express link.
   - Persistir `stripe_account_id` em users.
3. **Cobrança**:
   - Cliente cria pedido. Total = items + entrega.
   - PaymentIntent com `application_fee_amount` (plataforma) e `transfer_data.destination` (lojista). Entregador recebe via `transfer` separado pós-entrega.
   - Idempotency key cliente → endpoint backend → Stripe.
4. **Webhooks**:
   - Endpoint `/webhooks/stripe` valida signature, dedupe (tabela `processed_webhook_events`), processa async via fila.
   - Eventos tratados: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `charge.dispute.created`, `transfer.created`.
5. **Ledger**:
   - Tabela `ledger_entries` imutável, double-entry.
   - Cada cobrança gera 4 entries (cash recebido, fee plataforma, payable lojista, payable entregador).
6. **Refunds**:
   - Endpoint `/orders/:id/refund` (full ou partial), gera reversal entries, chama Stripe refund.
7. **Reconciliation**:
   - Job nightly puxa Stripe `balance_transactions` últimas 24h.
   - Match com ledger via `external_id`. Diff list em tabela `reconciliation_discrepancies`.
8. **Money**:
   - `amount_cents bigint, currency char(3)` em todas as colunas monetárias.
   - Lib `dinero.js` no app code.
9. **State machine** explícita pra `Order.status` com transições validadas.

### Restrições

- Sem PAN no app. Stripe Elements front-end.
- Webhook handler retorna 2xx em < 100ms. Trabalho real em fila.
- Sem float em qualquer coluna ou variável de dinheiro.
- Idempotency key obrigatório em todo POST monetário.
- Cobertura de testes ≥ 85% nas paths de pagamento. Use Stripe CLI pra simular eventos.

### Threshold

- E2E test: cliente paga, webhook chega, ledger reflete, lojista vê balance, entregador recebe transfer pós-entrega. Refund parcial revertendo proporcionalmente.
- Reconciliation job mostra zero discrepâncias num set seed.
- README documenta state machine de Order e Payment.
- README explica PCI scope (Stripe Elements → SAQ A).

### Stretch

- **Pix** via Mercado Pago integration paralela (lojista escolhe gateway).
- **Boleto** com expiry e dunning.
- **Subscription** pra plano de lojista (assinatura mensal de plataforma).
- **Tax**: integre Stripe Tax pra calcular IVA/ICMS por endereço.
- **Dispute response automation**: quando webhook chega, busca evidência em ledger + tracking + delivery photos, monta documento, manda via API.
- **Sigma/SQL** queries em Stripe Sigma pra dashboards financeiros.

---

## 5. Extensões e Conexões

- Liga com **02-13** (auth): identity de Stripe Connect accounts; OAuth.
- Liga com **02-09** (Postgres): ledger imutável, transactions, MVCC.
- Liga com **02-14** (real-time): atualizar UI quando webhook chega (push notification, socket).
- Liga com **01-12** (crypto): webhook signature verification (HMAC).
- Liga com **03-08** (security): PCI-DSS, secret management.
- Liga com **03-07** (observability): payment latency, success rate, webhook backlog.
- Liga com **04-03** (event-driven): webhooks são eventos; outbox + idempotency é exatamente este pattern.
- Liga com **04-04** (resilience): retry policy, dunning, circuit breaker no PSP.
- Liga com **04-16** (product/business): pricing, unit economics, take rate.

---

## 6. Referências

- **Stripe API docs** + Stripe Engineering blog ([stripe.com/blog/engineering](https://stripe.com/blog/engineering)).
- **"Idempotency, retries, and the 'unique' problem"**: Stripe blog.
- **"Online Payments at Stripe Scale"**: várias talks.
- **"Designing Money"**: Stripe Press essays.
- **PCI-DSS v4.0 quick reference**.
- **"Patterns for Distributed Transactions Without 2PC"**: Caitie McCaffrey.
- **PSD2/SCA EU regulations**.
- **Mercado Pago developer docs**: Pix, boleto, marketplace.
- **"Accounting for Computer Scientists"**: Martin Kleppmann (post).
- **Open Banking and ISO 20022**: para quem vai pra fintech.
