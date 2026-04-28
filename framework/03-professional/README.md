# Estágio 3 — Professional (Ecossistema, Testes, Operações)

## Por que esse estágio existe

Construir uma aplicação é uma coisa. **Operá-la em produção** é outra. O Professional é onde você sai de "fiz funcionar no meu PC" pra "isso roda 24/7, suporta deploy diário, é observado, é testado, é seguro, é performático e é debuggável às 3 da manhã".

Aqui você aprende:
- **Testar de verdade** (não só unit; integration, E2E, property-based, TDD)
- **Container e orquestração** (Docker + Kubernetes — entendendo o **interno**, não só `kubectl apply`)
- **CI/CD** (pipeline que dá deploy contínuo e seguro)
- **Cloud** (AWS, IaC com Terraform)
- **Observabilidade** (logs estruturados, métricas Prometheus, tracing OpenTelemetry — os 4 sinais dourados)
- **Segurança aplicada** (OWASP, CSP, criptografia, secrets management)
- **Performance** (Core Web Vitals, profiling Node, flamegraphs, caching strategies)
- **Linguagens de sistema** (Go e Rust — só o que distingue de Node)
- **WebAssembly** (quando JS não dá conta)

**Promessa de saída do Professional:** você consegue colocar uma aplicação em produção com qualidade de empresa séria — testes confiáveis, deploy seguro, observabilidade real, segurança defensável, performance medida.

---

## Ordem dos módulos (dependências)

| Ordem | ID | Módulo | Prereqs |
|-------|----|--------|---------|
| 1 | [P01](P01-testing.md) | Testing (unit/integration/E2E/property-based/TDD) | A07, A08 |
| 2 | [P02](P02-docker.md) | Docker | N02, N10 |
| 3 | [P03](P03-kubernetes.md) | Kubernetes | P02, N03 |
| 4 | [P04](P04-cicd.md) | CI/CD | P01, P02 |
| 5 | [P05](P05-aws-core.md) | AWS Core | N03, P02 |
| 6 | [P06](P06-iac.md) | IaC (Terraform/Pulumi) | P05 |
| 7 | [P07](P07-observability.md) | Observability | P02, A07 |
| 8 | [P08](P08-applied-security.md) | Applied Security (OWASP) | A13, N03, N12 |
| 9 | [P09](P09-frontend-performance.md) | Frontend Performance | A04, A05 |
| 10 | [P10](P10-backend-performance.md) | Backend Performance | A07, A09, A11 |
| 11 | [P11](P11-systems-languages.md) | Linguagens de Sistema (Go, Rust) | N02, N06 |
| 12 | [P12](P12-webassembly.md) | WebAssembly | P11 |
| 13 | [P13](P13-time-series-analytical-dbs.md) | Time-Series & Analytical DBs (Timescale/ClickHouse) | A09, P07 |
| 14 | [P14](P14-graphics-audio-codecs.md) | Graphics, Audio & Real-Time Codecs | P09 |
| 15 | [P15](P15-incident-response.md) | Incident Response & On-Call (SLO, runbooks, postmortem) | P07 |
| 16 | [P16](P16-estimation-planning.md) | Estimation & Technical Planning | P04 |
| 17 | [P17](P17-accessibility-testing.md) | Accessibility Testing & Automation (axe, Pa11y, Lighthouse) | A02, P01 |
| 18 | [P18](P18-cognitive-accessibility.md) | Cognitive Accessibility (plain language, attention, memory, time) | A02, P17 |

**Trilhas paralelas:**
- Operações: P02 → P03 → P04 → P05 → P06 → P07 → P15
- Qualidade: P01 → P08 → P09 → P10 → P17 → P18
- Sistemas baixo nível: P11 → P12
- Dados / mídia: P13 → P14
- Soft technical: P15 → P16

P15-P16 são de soft-technical (operação humana e planning); cobertura essencial pra Senior real, frequentemente ausente em frameworks técnicos. **P17** automatiza a11y como gate de CI — sem ele, A02 vira regressão silenciosa em meses. **P18** cobre o que tooling não pega: a11y cognitiva (dyslexia, ADHD, low literacy, memory load), validada via testing humano.

---

## Capstone do Professional

[CAPSTONE-professional.md](CAPSTONE-professional.md) — **Logística v2**: pegar a v1 do Apprentice e levar pra **production-ready**.

Entregas obrigatórias:
- Tudo containerizado com Dockerfile multi-stage
- Deploy em K8s (kind local + Railway/AWS) com manifests escritos à mão (sem Helm primeiro)
- Pipeline CI/CD GitHub Actions: lint → typecheck → unit → integration → E2E → build image → deploy
- Observabilidade: logs estruturados (Pino), métricas Prometheus + dashboards Grafana, tracing OpenTelemetry, alerting com 4 sinais dourados
- Pentest OWASP Top 10: cobrir mínimo SQLi, XSS, IDOR, SSRF, CSRF, com remediations documentadas
- Performance: profiling Node (`clinic.js` ou `0x`), identificar e corrigir 1 gargalo real, mostrar before/after com números
- TDD em pelo menos 1 módulo novo de domínio (ex: cálculo de rota com Dijkstra)

**Threshold:** dashboard Grafana mostrando RED/USE metrics + relatório de pentest com mitigações + flamegraph com gargalo identificado e resolvido.

---

## Postura recomendada para este estágio

- **Não use Helm/Kustomize antes de escrever manifests à mão por pelo menos 1 mês.** Atalhos cedo escondem o aprendizado.
- **Setup K8s local com `kind` ou `k3d`** — mais rápido que minikube, mais real que Docker Desktop K8s.
- **Faça [Kubernetes The Hard Way](https://github.com/kelseyhightower/kubernetes-the-hard-way)** uma vez na vida. Brutal, mas é como você entende cada componente.
- **Pra AWS, comece com a CLI antes do Console.** Console esconde o que está acontecendo.
- **Observabilidade é não-negociável**: se você não sabe medir, não sabe melhorar. Faça primeiro.
- **Testing primeiro, sempre:** TDD verdadeiro (red → green → refactor). Sentir dor de testar código mal-fatorado é o melhor incentivo pra escrever código bem-fatorado.

---

## Custo de Railway no Professional

Como discutido no plano: o Apprentice cabe nos $5/mês do Hobby. **O Professional aperta** porque observabilidade (Prometheus scraping a cada 15s) consome CPU contínua e infla pra ~$20-40/mês.

**Estratégia recomendada:**
- App + DB no Railway
- Stack de observabilidade rodando **local** (Docker Compose com Prometheus/Grafana/Loki/OTel collector) só durante sessões de estudo
- K8s real (kind multi-node local) — Railway não expõe K8s
- Pipeline GitHub Actions executa contra Railway via API

Isso mantém você no Railway pro app principal e libera o aprendizado de K8s/observability sem quebrar o orçamento.
