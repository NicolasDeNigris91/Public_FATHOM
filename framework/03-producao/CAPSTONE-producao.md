---
capstone: professional
title: Logística v2 — Production-Ready
stage: producao
prereqs: [03-01, 03-02, 03-03, 03-04, 03-05, 03-06, 03-07, 03-08, 03-09, 03-10, 03-11, 03-12]
status: locked
gates:
  pratico: { status: pending, date: null, attempts: 0, notes: null }
---

# CAPSTONE Professional — Logística v2

## 1. Por que esse capstone existe

Logística v1 (Plataforma) provou que você integra um stack full-stack. v2 (Professional) prova que você opera. Sair de "funciona" pra "fica vivo sob carga, é deployado com confiança, é observado, é seguro, é caché, é rápido, é portável" é o salto entre quem ship feature e quem mantém produto.

Isso força você a integrar:
- **03-01**: test strategy real, mutation testing, load tests.
- **03-02-03-03**: containerizado em K8s (ou Fargate) com hardening.
- **03-04**: pipeline end-to-end com canary, GitOps.
- **03-05-03-06**: AWS via IaC reproduzível.
- **03-07**: instrumentado com SLOs, dashboards, alertas baseado em burn rate.
- **03-08**: hardening AppSec aplicado, threat model, scanning.
- **03-09-03-10**: perf otimizado em frente e backend, sob método.
- **03-11-03-12**: serviços auxiliares Go/Rust quando vencem; Wasm onde encaixa.

v2 não é "v1 com mais features". É v1 com **operability**.

---

## 2. Domínio expandido (mas não tudo)

Mesmo domínio (entregas multi-tenant), mas escala alvo:
- 100 tenants concurrent.
- 100k orders/dia distribuídos.
- 10k couriers ativos simultaneamente em picos.
- 99.5% SLO de latência em endpoints críticos.

Features novas que justificam complexidade:
- **Routing inteligente**: serviço dedicado (03-11 Rust) calcula rotas otimizadas; preview client-side via Wasm.
- **Webhook ingestion isolada**: serviço Go (03-11) recebe e enfileira eventos externos.
- **Audit log immutable**: append-only com checksums.
- **OTA updates** pro app mobile via EAS Update.
- **Public status page**: uptime histórico transparente.

Mas: **não adicione features que não dependam dos módulos desse estágio**. Foco é operação, não scope creep.

---

## 3. Especificação técnica

### 3.1 Stack base — herda de v1 + estende

- Mesmo stack TS (Fastify + Drizzle + Postgres + Redis) do v1.
- **Adiciona**: Go ingestor, Rust routing, Wasm preview client.
- **Adiciona**: stack observability (LGTM ou Grafana Cloud).
- **Adiciona**: K8s ou ECS Fargate (escolha + justifique).

### 3.2 Cloud + IaC

- AWS account dedicada ou subaccount.
- Toda infra via OpenTofu/Terraform (03-06).
- 3 layers: networking, data, compute.
- Multi-AZ obrigatório em data layer.
- Secrets via Secrets Manager + IAM roles.
- Backups automated (RDS snapshots + retention).

### 3.3 Containers

- Imagens multi-stage, hardened, ≤ 250 MB.
- Scanning em CI; gate em CRITICAL.
- Signed com cosign keyless via OIDC.
- SBOM gerado e attestado.

### 3.4 Orchestration

Escolha 1, justifique:
- **EKS Auto Mode** com helm charts próprios + Argo CD GitOps.
- **ECS Fargate** com IaC + CI/CD direto pra services.

Whichever, com:
- HPA ou auto scaling baseado em CPU + custom metric (queue length, WS connections).
- Health checks + graceful shutdown working.
- Resource requests calibrados via load test.

### 3.5 CI/CD

- Pipeline 03-04 inteiro: PR (lint, test, scan, build), main (build, sign, deploy staging), prod (manual approval, canary).
- Smoke + synthetic checks pós-deploy.
- Rollback automated em violação SLO ou erro elevado.
- DORA metrics calculados (lead time, deploy freq, MTTR, change fail rate).

### 3.6 Observability

- 3 pilares: logs (Loki ou CloudWatch), metrics (Prometheus), traces (Tempo ou Jaeger).
- OTel SDK em todos serviços (TS, Go, Rust).
- Dashboards: API RED, DB USE, real-time pipeline, business KPIs.
- 5 SLOs definidos (latência GET orders, success rate POST orders, courier event lag, signup latency, SSE delivery delay).
- Burn rate alerts (1h e 6h) → Slack.
- 1 incidente simulado mensalmente; postmortem.

### 3.7 Performance

- Otimização 03-09 e 03-10 aplicadas.
- Web Vitals: LCP < 2.5s p75, INP < 200ms.
- Backend p99 < 500ms em endpoints críticos sob carga normal.
- Load test do 03-01 em CI nightly contra staging.
- Capacity plan documentado: a quantos req/s saturamos? Que recurso é o gargalo?

### 3.8 Security

- Threat model atualizado.
- Headers, CSP, helmet.
- SAST/DAST/SCA gates em CI.
- Pentest manual com Burp em staging, 5 cenários.
- Secrets rotation policy.
- Audit log immutable funcional.
- LGPD: `DELETE /me` operacional.

### 3.9 Routing engine (03-11 + 03-12)

- Serviço Rust standalone, expondo HTTP ou gRPC.
- Mesmo core compilado pra Wasm pra browser preview.
- Backend principal chama via HTTP em assignment massivo.
- Latência p99 < 200ms em 50 stops.

### 3.10 Webhook ingestor (03-11)

- Serviço Go recebendo eventos externos com HMAC.
- Worker pool processando assincronamente.
- Pode escrever em Postgres + (opcional) emitir em Redis Stream pra outros consumers.
- Restart graceful sem perda.

### 3.11 Mobile

- App courier com EAS Build pipelines (staging/prod).
- EAS Update pra OTA hotfix.
- Crash reporting (Sentry ou similar).
- 1 hotfix OTA real demonstrado (mudou label, push, devices atualizam).

### 3.12 Cost ownership

- Cost Explorer ou planilha mensal.
- Budget alerts.
- 1 anti-padrão de custo identificado (NAT egress, log volume, etc.) e mitigação.
- Custo total documentado por componente.

---

## 4. Threshold

Você só passa se:

- Sistema rodando em AWS (ou cloud equivalente), com URL pública e domínios próprios.
- IaC reproduz tudo do zero em < 1h em conta limpa.
- Pipeline CI/CD shippa de PR a prod com canary funcional.
- Dashboards observability mostram comportamento real, não placeholders.
- 5 SLOs definidos, com burn rate alertando em violação simulada.
- Load test mostra capacity plan; saturação esperada documentada.
- Pentest manual rodado, findings tratados.
- Routing engine e webhook ingestor em prod, integrados.
- README com:
  - Arquitetura completa diagrammed (network, services, data flow, observability).
  - Decisões de cada escolha técnica não-óbvia (K8s vs ECS, K8s flavor, observability stack, mobile strategy).
  - DORA metrics atual.
  - Custo mensal real.
  - Postmortem de 1 incidente simulado.
  - Roadmap pra v3 (o que falta pra distribuído de verdade).

---

## 5. Anti-padrões a evitar

- "Otimização sem profile" — Rust em todo lugar pra "perf" sem evidence.
- "Microservices porque K8s" — overengineer; mantenha modular monolith + extracts justificados (Go ingestor, Rust routing são justificados).
- "Observability theater" — dashboards bonitos sem SLOs nem alertas.
- "Tests pra coverage" — escreva testes que provam comportamento, não linhas.
- "Container barato em runtime, gordo em build" — both matter.
- "Secret no env var em K8s manifest commitado" — External Secrets Operator, ou IRSA, ou Vault.
- "Deploy heroico" — pipeline ou nada.
- "Performance de Mac" — load test em conditions de prod ARM/x86 actual.

---

## 6. Stretch

- Multi-region active-passive com failover documentado.
- Chaos engineering (Litmus, Gremlin, Chaos Mesh): kill pods, latency injection.
- DDoS protection (AWS Shield, Cloudflare).
- Trace-driven debugging (Honeycomb-style high-cardinality).
- AI on-the-fly: assistente que ajuda lojista a precificar entrega (chamada pra LLM API; retorno cached e rate-limited).
- Compliance: 1 control SOC 2 audited internamente (encryption at rest, audit log retention).

---

## 7. Critério de finalização

Sistema vivo com tráfego sintético constante (synthetic checks). Você sai de férias 7 dias; ele continua funcionando, alertas só disparam em problema real, on-call (você mesmo) pode debugar via dashboards e logs em < 15 min do alerta.

Print incident response: 1 incidente real (você induz: derrubar 1 serviço a meia-noite via cron) — alerta dispara, você (no celular) entra no Grafana, identifica, mitiga em < 15 min. Documente em postmortem `incidents/<date>.md`.

Após o capstone passar: atualize PROGRESS.md e frontmatter. v3 (Senior) começa.
