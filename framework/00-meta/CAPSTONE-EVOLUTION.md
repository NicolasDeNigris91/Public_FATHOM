# Capstone Evolution — Logística v0 → v1 → v2 → v3 → v4

> Como o mesmo produto **evolui ao longo dos 5 estágios**. Este doc consolida em um lugar a trajetória que cada `CAPSTONE-*.md` descreve isoladamente. Use pra ver o filme inteiro: o que entra a cada nível, o que **muda** (refactor, migration, redesign), e por que.

A ideia central do framework é não pular pra "microservices distribuídos com Kafka" sem antes ter sentido a dor de fazer monolito crescer, refatorar pra modular monolith, decompor pra serviços. Você sente refactor, migration, redesign **na pele** — não em vídeo, não em palestra. Esse é o pedagógico.

---

## v0 — HTTP server from scratch (CAPSTONE-novice)

**Não é Logística ainda.** É a fundação técnica.

- HTTP/1.1 server em Node puro (sem `http`, sem Express).
- Parser manual (request line, headers, body com `Content-Length` e `chunked`).
- Cache LRU em memória (hash map + linked list — usa N04).
- Keep-alive correto.
- CLI de logs estruturados.
- Test de carga `wrk` mantendo correção sob concorrência.

**Threshold:** parsing correto + concorrência ok + cache funcional.

**Por quê:** porque dev que não construiu um HTTP server fica pra sempre achando que `app.get('/foo')` é mágico. Você sai sabendo o que cada linha do framework está fazendo.

---

## v1 — Logística monolítica (CAPSTONE-apprentice)

**Primeira versão de produto.** Full-stack monolith deployable, multi-tenant.

**Stack:**
- Frontend: Next.js (App Router) com React + Tailwind.
- Backend: API routes Next.js OU Fastify/Hono em paralelo.
- DB: Postgres com schema multi-tenant via row-level security ou `tenant_id` discriminator.
- Cache: Redis (geocoding, sessions, rate limit).
- Auth: OAuth2 (Google/GitHub) + JWT/sessions.
- Real-time: WebSocket pra tracking + mapa.
- Mobile: app nativo (iOS Swift OU Android Kotlin) consumindo a API (extensão A17).
- Pagamentos: Stripe Connect Express com idempotency + ledger double-entry (A18).
- Search: Meilisearch ou Postgres FTS pra search de pedidos (A15).
- i18n: pt-BR, en-US, es-MX (A19).
- Deploy: Railway.

**Atores:** lojistas, entregadores, clientes (3 roles).

**Fluxo crítico E2E:**
1. Cliente cria pedido (com items + endereço).
2. Sistema atribui courier (proximidade + capacity).
3. Courier confirma + começa rota; pings GPS atualizam mapa em real-time.
4. Cliente vê tracking ao vivo.
5. Courier entrega; cobrança split entre lojista, plataforma, entregador.

**Threshold:**
- Fluxo crítico E2E funcional, deploy live.
- Auth Google/GitHub funcional.
- Multi-tenant com isolamento real.
- Search com typo tolerance.
- Mapa com tracking ≤ 10s lag p99.
- Pagamentos com idempotency + webhook handling robusto.
- 3 locales funcionando.
- Mobile app autenticando + listando pedidos.

**Caráter:** monolito **modular** consciente. Single deploy. Single DB. Não é spaghetti, mas não é distribuído. Boundaries lógicos (Orders, Tracking, Payments, Identity) sem virar services ainda.

---

## v2 — Logística production-ready (CAPSTONE-professional)

**Mesma v1, mas operada em produção séria.** Refactor + ops.

**O que entra:**

1. **Containers**: Dockerfile multi-stage por serviço. Otimização de layer cache, security hardening.
2. **K8s manifests à mão**: Deployment, Service, Ingress, ConfigMap, Secret, HPA. Antes de Helm.
3. **CI/CD**: GitHub Actions pipeline `lint → typecheck → unit → integration → E2E → build image → canary deploy → smoke → full rollout → rollback automático`.
4. **Observability**:
   - Logs estruturados (Pino, JSON).
   - Métricas Prometheus (RED + USE).
   - Tracing OpenTelemetry (req propaga atra serviços).
   - Dashboards Grafana com 4 sinais dourados.
   - Alerting com burn-rate multi-window (P15).
5. **Security pentest** (OWASP Top 10):
   - SQLi, XSS, IDOR, SSRF, CSRF cobertos.
   - Remediations documentadas.
   - WAF / rate limit no edge.
6. **Performance**:
   - Profiling Node (`clinic.js` ou `0x`).
   - 1 gargalo real identificado e corrigido com before/after números.
   - Frontend Core Web Vitals Lighthouse ≥ 95.
7. **TDD** em pelo menos 1 módulo novo (ex: cálculo de rota com Dijkstra).
8. **Analytics**:
   - Pipeline OLTP → CDC → ClickHouse / TimescaleDB (P13).
   - Dashboards de unit economics (S16) com GMV, churn cohort, LTV.
9. **Incident response** (P15):
   - SLOs declarados (P95 < 800ms, success rate ≥ 99.5%).
   - 6+ runbooks.
   - 2 game days realizados com postmortems blameless.
   - Disaster Recovery drill com restore real.
10. **a11y CI gates** (P17):
    - axe + Pa11y + Lighthouse a11y em CI.
    - Score ≥ 95.
    - User testing com PWD.
11. **Planning rigor** (P16): plan-v2 doc com PERT, risk register, critical path. Re-plan na metade. Postmortem do plano.

**O que muda:**
- Monolito **vira modular monolith** (ou pequenos serviços já neste estágio).
- Schema migration patterns disciplined (additive first, drop later).
- Feature flags pra desacoplar deploy de release.
- Backups automatizados com test restore agendado.

**Threshold:** dashboard Grafana mostrando RED/USE + relatório pentest com mitigações + flamegraph de gargalo resolvido + postmortems + SLO budget tracking + a11y CI verde.

**Caráter:** ainda monolítico (ou apenas parcialmente decomposto), mas **production-grade**. Diferença de v1 não é arquitetura — é operação.

---

## v3 — Logística distribuída escalável (CAPSTONE-senior)

**Redesign arquitetural.** Decomposição em bounded contexts; mensageria; sharding; event-driven.

**O que entra:**

1. **Bounded contexts explícitos** (DDD, S06):
   - **Orders**: lifecycle de pedido.
   - **Delivery / Tracking**: assignment + pings + location.
   - **Payments**: ledger + reconciliation + Stripe (A18).
   - **Identity**: auth, tenants, RBAC.
   - **Routing**: optimization (graph DBs A16, OR-Tools).
   - **Notifications**: emails, push, SMS.
2. **Services** (microservices ou modular monolith — decisão com ADR):
   - Cada bounded context ganha module/service próprio.
   - Communication: Kafka eventos (`OrderCreated`, `DeliveryAssigned`, `OrderDelivered`).
3. **CQRS + Event Sourcing** no contexto de Orders:
   - Write side: stream de eventos imutável.
   - Read side: projeções otimizadas.
4. **Saga pattern** pra fluxos cross-context (criar pedido + reservar courier + cobrar = saga).
5. **Outbox pattern** pra publishing reliable de eventos.
6. **Sharding** Postgres por região geográfica (regiões = shards).
7. **Read replicas** multi-region (latency local).
8. **Resilience patterns** (S04):
   - Rate limiting (token bucket) por tenant.
   - Circuit breaker em calls inter-service.
   - Bulkheads.
   - Retry com jitter.
9. **API design** (S05): gRPC inter-service, REST público, GraphQL no BFF se justificado.
10. **Streaming pipeline** (S13):
    - Flink ou ksqlDB processando event stream.
    - Real-time SLA monitor.
    - Anomaly detection.
    - Lakehouse Iceberg pra histórico.
11. **AI/LLM** (S10): RAG pra suporte ("onde está meu pedido?") com embeddings em pgvector + retrieval híbrido.
12. **TLA+ specs** (S14):
    - Outbox formalizado.
    - Idempotent payment retry.
    - Courier dispatch single-assignment.
13. **8+ ADRs** documentando decisions arquiteturais.
14. **Carga simulada com k6**: cenários de baseline, spike, kill broker, kill shard, latência alta. Relatório de comportamento.
15. **Web3 stretch**: smart contract pra liquidação P2P entre lojistas e entregadores em rede de teste (S11).

**O que muda:**
- Monolito → bounded contexts decompostos.
- Single DB → sharded + read replicas + read models separados.
- Sync → mostly async via events.
- Single service deploy → multiple deployables.
- Local cache Redis → distributed (Redis cluster).

**Threshold:** simulação de carga sob falha demonstrada com gráficos + ADRs aprovados em code review architectural por peer Senior+ ou self-review estruturado com checklist do módulo + TLA+ specs validas + RAG funcional.

**Caráter:** sistema **distribuído** real. Não brinca — você lida com partial failures, eventual consistency, CAP trade-offs vividos.

---

## v4 — Specialization Showcase (CAPSTONE-staff)

**Não é v4 do produto.** É a **cristalização da carreira** sobre a Logística + outputs cumulativos.

Você escolhe **track** entre 6:
- **A. Distributed Systems Engineer**.
- **B. Platform / Infra Engineer**.
- **C. Frontend / DX Architect**.
- **D. Data / ML Engineer**.
- **E. Security Engineer**.
- **F. Founding / Product Engineer**.

Cada track aprofunda uma dimensão da Logística + integra outputs do Estágio 5:

- ST01 (build-from-scratch): toy DB, queue, runtime, scheduler.
- ST02 (multi-domain): 3 capstones em fintech, real-time, ML pipeline (fora-de-Logística).
- ST03 (Conway's Law): proposta org da Logística.
- ST04 (paper habit): paper implementado, blog post.
- ST05 (public output): blog stream + 1 talk.
- ST06 (mentorship): 3 mentees acompanhados.
- ST07 (embedded, opcional): tracker IoT real.

**Output cumulativo:**
- Portfolio site próprio.
- Promo case (interno + external narrative).
- 1 talk gravado em conf/meetup.
- OSS lib com tração (≥ 50-100 stars + uso real).
- 25+ papers lidos com Q&A notes.
- 6+ long-form blog posts.

**Caráter:** não é projeto novo — é **posicionamento**. Tudo o que você fez nas v1-v3 + módulos novos viram material de promo case e job mobility.

---

## Resumo: dor por estágio

| Versão | Dor central | Lições internalizadas |
|---|---|---|
| v0 | Construir do zero o que parecia mágico | HTTP, parsers, concorrência, data structures |
| v1 | Coordinar full-stack + auth + payments + i18n + mobile | Trade-offs de stack, multi-tenant, money-as-bigint, a11y |
| v2 | Operar 24/7 sob falhas | SLOs, observability, incident response, security, planning |
| v3 | Decompor sem virar distributed monolith | Bounded contexts, eventual consistency, formal verification |
| v4 | Posicionar carreira como Staff/Principal | Specialization, public output, mentoria, paper habit |

---

## Por que mesmo projeto

Capstones em frameworks tradicionais são **descontínuos**: cada estágio um produto novo. Resultado: não sente refactor real, não migra schema vivido, não decompõe sob constraint de "já tem N usuários hoje".

Logística encadeada força:
- **Refactor**: v1 monolítico → v2 com modular → v3 distribuído.
- **Migration**: schema evolution sob load, dual-write, backfill.
- **Re-arquitetura**: rewrite parcial sem big-bang.
- **Backwards compat**: v3 não pode quebrar mobile v1 sem migration plan.
- **Time pressure**: cada nova feature em um estágio compete com manter os anteriores.

Esse é o gym de carreira. Sem isso, você lê DDIA mas nunca **viveu**. Com isso, você lê DDIA reconhecendo capítulos da própria experiência.

---

## Conexão com módulos

Logística ao longo da trajetória toca **quase todo módulo do framework**:

- N01-N15: fundamentos que sustentam código.
- A01-A19: cada subdomain que aplicação real precisa.
- P01-P17: ops, qualidade, perf, segurança.
- S01-S16: arquitetura, distribuído, leadership, business.
- ST01-ST07: build-from-scratch, multi-domain, public output, mentoria.

Use este doc como mapa quando estiver em um estágio: lembre-se onde você está, o que vem antes, o que vem depois, e qual dor cada estágio existe pra te ensinar.

---

**Fim da evolução.** Não há v5 do produto. Em ponto, ou você opera Logística como produto real, ou usa o framework como portfolio e move pra outras coisas.
