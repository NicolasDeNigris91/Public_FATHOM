# Estágio 3: Produção (Ecossistema, Testes, Operações)

## Por que esse estágio existe

Construir uma aplicação é uma coisa. **Operá-la em produção** é outra. Esse estágio é onde você sai de "fiz funcionar no meu PC" pra "isso roda 24/7, suporta deploy diário, é observado, é testado, é seguro, é performático e é debuggável às 3 da manhã".

Aqui você aprende:
- **Testar de verdade** (não só unit; integration, E2E, property-based, TDD)
- **Container e orquestração** (Docker + Kubernetes, entendendo o **interno**, não só `kubectl apply`)
- **CI/CD** (pipeline que dá deploy contínuo e seguro)
- **Cloud** (AWS, IaC com Terraform)
- **Observabilidade** (logs estruturados, métricas Prometheus, tracing OpenTelemetry, os 4 sinais dourados)
- **Segurança aplicada** (OWASP, CSP, criptografia, secrets management)
- **Performance** (Core Web Vitals, profiling Node, flamegraphs, caching strategies)
- **Linguagens de sistema** (Go e Rust, só o que distingue de Node)
- **WebAssembly** (quando JS não dá conta)

**Promessa de saída:** você consegue colocar uma aplicação em produção com qualidade de empresa séria, testes confiáveis, deploy seguro, observabilidade real, segurança defensável, performance medida.

---

## Ordem dos módulos (dependências)

| Ordem | ID | Módulo | Prereqs |
|-------|----|--------|---------|
| 1 | [03-01](03-01-testing.md) | Testing (unit/integration/E2E/property-based/TDD) | 02-07, 02-08 |
| 2 | [03-02](03-02-docker.md) | Docker | 01-02, 01-10 |
| 3 | [03-03](03-03-kubernetes.md) | Kubernetes | 03-02, 01-03 |
| 4 | [03-04](03-04-cicd.md) | CI/CD | 03-01, 03-02 |
| 5 | [03-05](03-05-aws-core.md) | AWS Core | 01-03, 03-02 |
| 6 | [03-06](03-06-iac.md) | IaC (Terraform/Pulumi) | 03-05 |
| 7 | [03-07](03-07-observability.md) | Observability | 03-02, 02-07 |
| 8 | [03-08](03-08-applied-security.md) | Applied Security (OWASP) | 02-13, 01-03, 01-12 |
| 9 | [03-09](03-09-frontend-performance.md) | Frontend Performance | 02-04, 02-05 |
| 10 | [03-10](03-10-backend-performance.md) | Backend Performance | 02-07, 02-09, 02-11 |
| 11 | [03-11](03-11-systems-languages.md) | Linguagens de Sistema (Go, Rust) | 01-02, 01-06 |
| 12 | [03-12](03-12-webassembly.md) | WebAssembly | 03-11 |
| 13 | [03-13](03-13-time-series-analytical-dbs.md) | Time-Series & Analytical DBs (Timescale/ClickHouse) | 02-09, 03-07 |
| 14 | [03-14](03-14-graphics-audio-codecs.md) | Graphics, Audio & Real-Time Codecs | 03-09 |
| 15 | [03-15](03-15-incident-response.md) | Incident Response & On-Call (SLO, runbooks, postmortem) | 03-07 |
| 16 | [03-16](03-16-estimation-planning.md) | Estimation & Technical Planning | 03-04 |
| 17 | [03-17](03-17-accessibility-testing.md) | Accessibility Testing & Automation (axe, Pa11y, Lighthouse) | 02-02, 03-01 |
| 18 | [03-18](03-18-cognitive-accessibility.md) | Cognitive Accessibility (plain language, attention, memory, time) | 02-02, 03-17 |

**Trilhas paralelas:**
- Operações: 03-02 → 03-03 → 03-04 → 03-05 → 03-06 → 03-07 → 03-15
- Qualidade: 03-01 → 03-08 → 03-09 → 03-10 → 03-17 → 03-18
- Sistemas baixo nível: 03-11 → 03-12
- Dados / mídia: 03-13 → 03-14
- Soft technical: 03-15 → 03-16

03-15-03-16 são de soft-technical (operação humana e planning); cobertura essencial pra estágios seguintes, frequentemente ausente em frameworks técnicos. **03-17** automatiza a11y como gate de CI, sem ele, 02-02 vira regressão silenciosa em meses. **03-18** cobre o que tooling não pega: a11y cognitiva (dyslexia, ADHD, low literacy, memory load), validada via testing humano.

---

## Quando NOT usar K8s

Antes de mergulhar em [03-03](03-03-kubernetes.md), encare a decisão antiarquitetural: 80% dos projetos nunca deveriam tocar Kubernetes. Senior real escolhe consciente — K8s é poderoso e caro de manter.

### Alternativas em 2026

| Alternativa | Modelo | Melhor pra | Trade-off |
|---|---|---|---|
| **AWS ECS / Fargate** | Container scheduler AWS-native | Stack já em AWS, time pequeno | Lock-in pesado, menos primitives |
| **HashiCorp Nomad** | Scheduler genérico (containers, VMs, JARs, exec) | Multi-runtime, sem K8s overhead | Comunidade menor, ecossistema próprio |
| **Fly.io** | App platform global anycast | Apps regional/global com SQLite/Litestream | Menos controle low-level, vendor risk |
| **Railway** | Heroku-style PaaS | MVPs, side projects, monolitos | Não escala em compliance heavy |
| **Render** | Heroku-style + alguns advanced | Alternativa Heroku moderna | Custos crescem |
| **Cloud Run / App Runner** | Serverless containers | Bursty traffic, scale-to-zero | Cold start + state externo obrigatório |
| **Cloudflare Workers / Vercel Functions** | Edge serverless | UX-critical, baixa latência global | Tempo de execução limitado, paradigma diferente |
| **Kamal** (37signals) | Deploy direto a VMs | Times pequenos que querem servers reais | Você opera VMs |

### Heurística pragmática

- Time **< 5 engineers** + app **< 10 services**: K8s é overhead net-negative. Use Fly.io, Railway, ECS, Cloud Run ou Kamal.
- Time **5-30 engineers** + crescendo: K8s managed (EKS/GKE) começa a fazer sentido. EKS Auto Mode (2024) e GKE Autopilot reduzem operação manual.
- Time **> 30 engineers** + multi-region + heavy compliance: K8s domina. Operators próprios. Service mesh.
- **Compliance crítica (PCI, HIPAA, FedRAMP)**: K8s viabiliza isolation patterns (NetworkPolicy, OPA, PSS) que ECS exige reproduzir manualmente.

### Mito vs realidade

- "K8s escala automaticamente" — você ainda capacity-planeja, configura HPA/VPA com cuidado, paga por nodes idle.
- "K8s previne lock-in cloud" — você troca lock-in cloud por lock-in K8s ecosystem (CRDs custom, Helm charts próprios). Migrar entre clusters é trabalho.
- "Vale aprender K8s pra qualquer SRE em 2026" — pra app simples, Fly.io ou Railway ensina mais sobre app architecture e custa menos tempo.

**Logística vai pra K8s no Estágio 3 porque o objetivo é aprender as primitives, não porque o produto exige.** Em projeto real, decida com base nos critérios acima antes de provisionar EKS.

---

## Capstone do estágio 3

[CAPSTONE-producao.md](CAPSTONE-producao.md), **Logística v2**: pegar a v1 do Plataforma e levar pra **production-ready**.

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
- **Setup K8s local com `kind` ou `k3d`**: mais rápido que minikube, mais real que Docker Desktop K8s.
- **Faça [Kubernetes The Hard Way](https://github.com/kelseyhightower/kubernetes-the-hard-way)** uma vez na vida. Brutal, mas é como você entende cada componente.
- **Pra AWS, comece com a CLI antes do Console.** Console esconde o que está acontecendo.
- **Observabilidade é não-negociável**: se você não sabe medir, não sabe melhorar. Faça primeiro.
- **Testing primeiro, sempre:** TDD verdadeiro (red → green → refactor). Sentir dor de testar código mal-fatorado é o melhor incentivo pra escrever código bem-fatorado.

---

## Custo de Railway nesse estágio

Como discutido no plano: o estágio 2 (Plataforma) cabe nos $5/mês do Hobby. **Esse estágio aperta** porque observabilidade (Prometheus scraping a cada 15s) consome CPU contínua e infla pra ~$20-40/mês.

**Estratégia recomendada:**
- App + DB no Railway
- Stack de observabilidade rodando **local** (Docker Compose com Prometheus/Grafana/Loki/OTel collector) só durante sessões de estudo
- K8s real (kind multi-node local), Railway não expõe K8s
- Pipeline GitHub Actions executa contra Railway via API

Isso mantém você no Railway pro app principal e libera o aprendizado de K8s/observability sem quebrar o orçamento.
