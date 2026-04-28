---
capstone: senior
title: Logística v3 — Distributed, Scalable, AI-Augmented
stage: senior
prereqs: [S01, S02, S03, S04, S05, S06, S07, S08, S09, S10, S11, S12]
status: locked
gates:
  pratico: { status: pending, date: null, attempts: 0, notes: null }
---

# CAPSTONE Senior — Logística v3

## 1. Por que esse capstone existe

v1 (Apprentice) provou que você integra. v2 (Professional) provou que você opera. v3 (Senior) prova que você **arquiteta sistemas distribuídos com decisões fundamentadas, lidera tecnicamente um produto complexo, e navega trade-offs raros**.

Não é "v2 com mais features". É v2 reescrita em pontos críticos com:
- **Eventos como espinha dorsal** entre bounded contexts (S02, S03).
- **Resilience patterns aplicados** (S04).
- **APIs maduras** com versioning real e webhooks (S05).
- **DDD strategic + tactical** em core (S06, S07).
- **Decision** consciente sobre serviços extraídos vs monolito modular (S08).
- **Scaling** real testado (S09).
- **AI assistant** integrado de forma production-quality (S10).
- **Blockchain settlement** opcional, com decision document (S11).
- **Leadership artifacts** completos (S12).

v3 é o sistema que você apresentaria a um VP de engineering como evidência de senioridade.

---

## 2. Domínio expandido

Mesmo core (entregas multi-tenant). Crescimento ambicioso:
- 500 tenants concurrent.
- 1M orders/dia.
- 50k couriers ativos.
- Multi-region (mesmo que toy: us-east-1 + sa-east-1).
- LATAM-ready (i18n PT-BR + EN-US ao mínimo).

Features novas que estressam o teto:
- **Routing inteligente** (Rust + Wasm preview, expandido pra batched assignments).
- **AI assistant** pra lojistas (LLM tool use).
- **Tokens de fidelidade** opcional via L2 (S11) — feature flag, não mainstream.
- **Public API** pra parceiros (webhooks, SDK TS).
- **Public status page** com SLO histórico.
- **Self-service dashboards** pra lojistas verem cobrança e payouts.

---

## 3. Especificação técnica

### 3.1 Architecture

- **Modular monolith principal**: TS, bounded contexts (Order Management, Courier, Notifications, Billing) com hexagonal interno em Order, vertical slices em outros (S07).
- **Routing service**: Rust standalone, gRPC server, Wasm para preview client-side (P11/P12).
- **Webhook ingestor**: Go service (P11).
- **Edge functions**: Cloudflare Workers ou CloudFront Functions pra `/track/{token}` público (S08).
- **Async workers**: TS workers consumindo Kafka/Redpanda (S02, S03).
- **AI assistant service**: TS, LLM provider SDK (ver S10), RAG sobre docs internos (S10).

### 3.2 Comunicação

- gRPC entre core ↔ routing engine.
- Kafka/Redpanda como event backbone:
  - Domain events (OrderCreated, OrderDelivered, etc.).
  - Integration events cross bounded context (com schema versioned).
- Outbox pattern em escritas críticas.
- CDC via Debezium em algum context pra contraste documentado.

### 3.3 Persistência

- Postgres principal (RDS Aurora ou similar) com schemas por bounded context (S08).
- Read replicas com roteamento (S09).
- Redis (ElastiCache) pra cache, rate limit, fan-out, idempotency.
- pgvector pra embeddings AI.
- Mongo opcional pra eventos heterogêneos externos (A12).

### 3.4 Multi-region

- Active-passive: us-east-1 primary, sa-east-1 standby.
- Aurora Global Database (replication < 1s).
- Failover documentado e testado em game day.
- Edge layer global pra `/track`, redirecionando reads pra closest read replica.

### 3.5 Resilience (S04)

- Timeouts em tudo.
- Retries com backoff/jitter onde idempotent.
- Circuit breakers entre serviços e externals (Stripe-like, AI provider).
- Bulkhead em pools.
- Load shedding com 503 + Retry-After.
- Graceful shutdown + preStop em K8s.
- 5 failure modes documentados em RUNBOOK.md.

### 3.6 Observability (P07 expandido)

- LGTM stack ou Grafana Cloud.
- OTel SDK em todos serviços.
- 8+ SLOs com burn rate alerts.
- Dashboards: API RED, DB USE, real-time, business KPIs, AI cost, routing latency.
- Continuous profiling.
- Synthetic checks 24/7.
- DORA metrics em automatic dashboard.

### 3.7 CI/CD (P04 expandido)

- Pipeline canary com Argo Rollouts.
- GitOps via Argo CD em K8s.
- Multi-stage: PR (lint, test, scan), main (build, sign, deploy staging), release (manual approval, prod canary).
- Mobile com EAS Build/Update.
- Rollback automated em SLO violation.

### 3.8 AI assistant (S10)

- Lojista assistant: chat tool-use sobre seu domínio.
- RAG sobre docs internos.
- Prompt caching habilitado.
- Evals em CI nightly.
- Cost dashboard com budget per tenant.
- Streaming SSE.

### 3.9 API pública (S05)

- OpenAPI 3.1 hospedado.
- Versionado (`/v1`, `/v2` deprecada quando fizer sentido).
- Webhooks signed (HMAC) com retry policy + replay endpoint.
- SDK TS gerado.
- Rate limit por tenant.
- Documentation portal.

### 3.10 Blockchain (S11) — feature flag

- LogisticaEscrow contract em L2 testnet.
- Lojistas opt-in.
- Off-chain settlement default; blockchain como audit + automation extra.
- Decision document explica trade-offs.

### 3.11 Leadership artifacts (S12)

- 6+ ADRs cobrindo decisões maiores.
- 1 RFC com revisão.
- ROADMAP.md atualizado.
- 3+ postmortems blameless de incidentes simulados.
- CONTRIBUTING.md, ONBOARDING.md.
- ARCHITECTURE.md final.

---

## 4. Threshold

Você só passa se:

- Sistema rodando em produção (mesmo que próprio escala pequena), com domínios públicos, multi-tenant ativo, mobile e web operacional.
- Multi-region ativo (mesmo que toy): demonstração de failover.
- Pipeline ship-to-prod < 30 min com canary funcional.
- 8+ SLOs em alerta; burn rate observed em incidente real.
- Routing engine, AI assistant, webhook ingestor, edge functions todos integrados e operacional.
- Game day documentado (2h sustaining ataques: kill primary DB region, AI provider down, routing service crash).
- 6+ ADRs de qualidade que outro senior eng aprovaria.
- 1 RFC executado completo: proposal → review → revision → decision.
- Capacity plan: documentado o quanto sistema atual aguenta, próximo gargalo, plano pra 10x.
- AI assistant em produção com evals passando, cost controlled.
- Public API com OpenAPI live, SDK publicado, rate limit, webhooks operacionais.
- README + ARCHITECTURE.md formando narrativa coerente do sistema.
- Você consegue fazer um **tech talk de 30 min** explicando arquitetura, decisões, trade-offs, lições aprendidas — sem slides feitos no momento.

Sem isso, fica em pendência. v3 é o teto do framework; após ele, você é senior+.

---

## 5. Anti-padrões a evitar

- "Microservices porque escala" — escolha por bounded context, não por fé.
- "Multi-region em day 1" — você precisa primeiro single-region maduro.
- "AI em todo lugar" — AI augment, não core decision.
- "Blockchain pra resolver problema X que não é blockchain problem".
- "Distributed monolith disfarçado".
- "Eventos sem schema, sem versioning, sem dead letter".
- "ADRs escritos retroativamente sem honestidade" — escreva como decisões reais foram feitas, mesmo se fora idéias originais.
- "Performance sem profile".
- "Resilience pattern aplicado por reflexo, sem chaos test confirmando".
- "Eu sei tudo isso porque li" — implementação > leitura.

---

## 6. Stretch

- Compliance work: SOC 2 control list, mesmo que internal-only.
- LGPD/GDPR full: DSR (data subject requests), consent management, audit trail.
- Multi-tenant isolation forte: schema-per-tenant em Postgres opcional pra enterprise.
- Service mesh (Linkerd/Cilium) com mTLS.
- Self-hosted LLM (vLLM) como fallback.
- WebTransport pra real-time.
- Predictive autoscaling.
- Engineering blog interno com 5+ posts sobre decisões.
- Migration strategy de Logística v2 → v3 documentada como real-world progression.

---

## 7. Critério de finalização

Você se senta com um peer engineer (real ou hipotético staff/principal). Em 30 min, você apresenta:
- Arquitetura.
- 5 decisões que poderia ter feito diferentes.
- 3 incidentes reais ou simulados e o que aprendeu.
- Roadmap próximos 6 meses.
- 1 dúvida atual que não tem resposta clara.

Se ele/ela responde "isso é trabalho de senior+ engineer", você passou.

Após o capstone passar:
- Atualize PROGRESS.md final.
- `framework/04-senior/CAPSTONE-senior.md` frontmatter `status: done`.
- `final-reflection.md` no repo do projeto: jornada completa do framework, do N01 ao S12+v3. Documente recomendações de mudança no framework — esse framework deve evoluir (registre via SPRINT-NEXT.md ou DECISION-LOG.md).

A partir daí, **você define o próximo passo**. Pode ser carreira específica (SRE, tech lead, founder), specialização (distributed databases, ML engineering), ou novo projeto onde aplicar o que aprendeu. O framework te entregou fundamentos. O resto é vida real.
