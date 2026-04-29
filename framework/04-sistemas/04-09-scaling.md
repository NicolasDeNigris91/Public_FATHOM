---
module: 04-09
title: Scaling — Vertical, Horizontal, Sharding, Multi-Region, Caching at Scale
stage: sistemas
prereqs: [04-01, 04-04]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 04-09 — Scaling

## 1. Problema de Engenharia

"Escala" é discutida em abstract até bater. Aí a verdade aparece: o gargalo é DB, não app. Ou é egress de rede, não CPU. Ou é hot key em Redis, não thread count. Decisões erradas de scale são caras: shard prematuro, multi-region antes de provar single-region maduro, autoscaler sem rate limit de DB conn pool. Ou pior: time-to-market perdido por over-engineering "pra quando crescer".

Este módulo é scaling com método: vertical vs horizontal, statefulness, sharding (estratégias), read replicas, caching tiers, queue offload, multi-region active-passive vs active-active, geo-distribution, CDN, edge. Você sai sabendo medir + escalar consciente.

---

## 2. Teoria Hard

### 2.1 Vertical vs horizontal

- **Vertical**: maior máquina. Limites físicos (~128 cores, TB RAM em managed). Simples (sem distributed concerns).
- **Horizontal**: mais máquinas. Sem teto teórico, mas exige stateless ou state-coordinated.

Default em web: começa vertical até dor (ou redundância pra HA force horizontal). Aí horizontal.

### 2.2 Stateful vs stateless

App stateless escala horizontal trivialmente (réplicas idênticas; LB distribui).

State em-memória do app (sessions, cache local) impede scale: load balancer manda usuário pra outro pod e session some.

**Mover state pra fora**: Redis sessions, sticky sessions (LB), JWT (stateless).

DBs são stateful por natureza. Scale via replication + sharding.

### 2.3 Read scaling: replicas

Postgres read replicas: writes no primary, reads em replicas. Lag eventual.

Padrões:
- Roteamento manual: queries críticas no primary, lazy reads em replicas.
- Lib que roteia (Prisma read replicas extension, custom).
- Read-after-write: detectar e ler do primary durante janela.

Limites: replication lag pode ser segundos sob load; reads ficam stale. Aceite ou route around.

### 2.4 Write scaling: sharding

Quando 1 primary é teto, sharding: dados particionados por chave entre N shards.

Estratégias de shard key:
- **Hash**: distribuição uniforme. Range queries cruzam shards.
- **Range**: ordenado, queries focadas. Hotspots em valores monotônicos (timestamps recentes batem mesmo shard).
- **Geo / tenant**: por tenant em multi-tenant. "Big tenant problem": 1 tenant maior que shard.

Re-sharding é trabalho. Decisão de shard key influencia anos.

Tools:
- Postgres: **Citus** (PG extension), **PgPool**, manual via app.
- MongoDB: sharding nativo.
- Cassandra, DynamoDB: sharding embutido.
- App-level: hash routing direto pra DBs separados.

### 2.5 Caching tiers

Já vimos. Em scale:
- L1 process LRU.
- L2 Redis.
- L3 CDN.
- L4 (browser).

Hot key: 1 chave que recebe muito tráfego. Mitigations: replicate em N keys, use process-local cache pra essa key, batch reads.

Cache invalidation continua "one of two hard problems".

### 2.6 Queue offload

Deslocar trabalho síncrono pra async:
- Email send → queue.
- Image processing → queue.
- Analytics → event log.
- Notifications → fan-out.

Reduz latency user-facing; adiciona eventual consistency.

### 2.7 CDN e edge

- Static assets: CDN sempre.
- Dynamic content: edge cache com TTL curtas, ESI (edge side includes).
- Edge functions (Workers, Lambda@Edge) pra personalize sem trip pro origin.

Egress da CDN é mais barato que de cloud regional; reduz cost.

### 2.8 Geo-distribution

Multi-region:
- **Active-passive**: traffic em 1 região, backup em outra. Failover manual ou auto. RPO/RTO definem requirements de replication.
- **Active-active**: traffic em N regiões simultaneamente. Resolve latency pra users globais. Resolve consistency cross-region não trivial.

Active-active escolhe:
- Sharding por região (tenant fica em sua região).
- Multi-master replication com conflict resolution.
- Eventual consistency aceito.

Tools especializadas:
- **CockroachDB**: distribuído nativo.
- **YugabyteDB**: similar.
- **Cassandra**: AP, multi-DC built-in.
- **Spanner / TrueTime**: linearizable global (Google).
- **Aurora Global**: replication cross-region (sub-segundo).

Multi-region multiplica complexity. Comece single-region multi-AZ. Move pra multi-region quando user latency justifica ou compliance força.

### 2.9 Autoscaling

Triggers:
- CPU/memory.
- Request rate.
- Queue length.
- Custom metric (latency p99).

Horizontal Pod Autoscaler (K8s), AWS Auto Scaling Groups, Lambda concurrency.

Cuidado:
- Cold start: scale up lag.
- DB conn pool: 100 pods × 20 conn = 2000 conn = DB morto. Use pgBouncer/Supavisor entre.
- Ping-pong: scale up + down rápido. Cooldown periods.

**Predictive autoscale**: ML models antecipam picos. AWS, GCP têm.

### 2.10 Connection multiplexing

Em scale, conn é recurso. PgBouncer transaction mode multiplexa 1000 app conn em 50 DB conn.

Limites: prepared statements per session quebram. Configure app-side.

### 2.11 Async APIs em scale

Long-running tasks:
- Cliente envia request → server retorna 202 com job ID.
- Cliente polls `/jobs/{id}` ou recebe webhook.
- Server processa em queue.

Padrão clássico, scale enorme. APIs públicos com video processing, ML inference, large reports usam.

### 2.12 Backpressure end-to-end

Sob spike:
- LB rejeita (rate limit).
- App rejeita (load shed).
- Queue cresce até max.
- Producers veem rejeição e back off.

Sem backpressure: build-up até morte.

### 2.13 Observability em scale

03-07 viu. Em scale:
- Sampling agressivo em traces.
- Aggregação edge (OTel collector).
- Long retention só pra eventos críticos (errors, slow).
- Dashboards focados em SLO; ignore detail noise.

### 2.14 Cost ao scale

CFO entra na conversa:
- Egress: maior categoria muitas vezes.
- DB IOPS / RDS instance.
- Lambda invocations.
- Logs ingestion.

Cost-per-request: monitore. Otimize quando aumenta.

### 2.15 Database capacity planning

Métricas de saturação:
- Connections used / max.
- IOPS / max.
- CPU.
- Replication lag.
- Lock waits.
- Bloat.

Alarme antes de bater teto. Vertical scale fácil; sharding caro. Plan ahead.

### 2.16 Real-time em scale

WebSocket connections per server: 10k-100k típicos com tuning. Horizontal scale com fan-out via Redis pub/sub ou Kafka.

**Push services especializados** (Pusher, Ably, Soketi): millions of concurrent connections via vendor.

### 2.17 Eventual consistency em scale

Cross-region writes eventualmente convergem. UI deve handle:
- Read-your-writes: roteia user pra mesmo region durante session.
- Optimistic UI.
- Polling pós-mutation.

### 2.18 Real-world scale anchors

- 1k req/min: trivial. Rails + Postgres handle.
- 10k req/min: monolith bem tunado.
- 100k req/min: multi-instance, conn pool tuning, read replicas, cache tiers.
- 1M req/min: sharding, edge, async offload, multi-region considered.
- 10M+: serious distributed systems.

Avalie onde você realmente está e desenhe pra 10x atual, não 1000x.

### 2.19 Scaling teams

Conway: scaling tech requer scaling org. Times de plataforma, SREs, dedicated DBA. Sem isso, "escalar arquitetura" sem mãos é fantasia.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Vertical vs horizontal trade-offs.
- Stateful vs stateless implicação em scale.
- Sharding strategies (hash, range, tenant) com hotspot exemplos.
- Read replica + roteamento + lag handling.
- 4 cache tiers e invalidation.
- Active-passive vs active-active multi-region.
- Autoscaling pitfalls (DB conn, ping-pong, cold start).
- Backpressure end-to-end.
- WS scale com fan-out.
- Capacity planning DB métricas.

---

## 4. Desafio de Engenharia

Plano e demo de **scaling Logística pra 10x atual** com baseline real.

### Especificação

1. **Baseline**:
   - Capture métricas atuais (do 03-10): throughput, latency p99, recursos.
   - Defina alvo: 10x volume (ex: 1k orders/min → 10k orders/min, 10k → 100k WS connections, etc.).
2. **Bottleneck analysis**:
   - Reproduza 10x carga em load test.
   - Identifique gargalos por ordem: DB, app CPU, app memory, conn pool, Redis, queue, network.
3. **Scaling moves** (em ordem de leverage):
   - Read replicas Postgres + roteamento (queries de listagem).
   - Conn pool tuning + PgBouncer transaction mode.
   - Cache layers (process-local + Redis) em queries quentes; medir hit rate.
   - Async offload: emails, notifications, reports → queue + worker.
   - HPA / autoscaling de app calibrado por métrica que reflete carga real (não só CPU; queue depth, RPS).
   - WS fan-out via Redis pub/sub demonstrado em N instâncias.
4. **Sharding-prep, não execute**:
   - Documente plano de sharding por tenant_id.
   - Identifique queries que precisariam mudar.
   - Decisão consciente de NÃO executar agora (e quando seria momento).
5. **Multi-region prep**:
   - Documente design pra active-passive (RPO/RTO definidos).
   - Aurora Global Database ou similar discutido como opção.
   - Justifique por que NÃO executa (custo, complexity vs need atual).
6. **Edge layer**:
   - 1 endpoint pesado read-only (`/track/{token}` público) em CloudFront Function ou Worker, cached at edge.
   - Cache hit rate e latency reduction documented.
7. **Backpressure**:
   - Demonstre cliente rapid producer + slow consumer; verify sistema degrada graciosamente (load shed, queue limit, retry-after).
8. **Capacity plan**:
   - Documento `CAPACITY.md`:
     - Atual capacity por componente.
     - Alvo capacity.
     - Quando próxima mudança disparar (e qual).

### Restrições

- Sem sharding sem evidência de necessidade.
- Sem multi-region sem decisão fundamentada.
- Sem autoscaling com gatilho que não corresponde a carga real.

### Threshold

- README documenta:
  - Baseline → bottleneck → solução, em ordem.
  - 10x test results pós-otimização: passou? Quase? Onde travou de novo?
  - Cache hit rates by tier.
  - Autoscaling em ação durante teste (gráfico replicas vs carga).
  - Capacity plan completo.
  - 1 caso onde otimização "óbvia" não rendeu (anti-intuição).

### Stretch

- Citus + Postgres multi-shard real (pode ser lab).
- Multi-region active-passive demo (mesmo que toy): primary + standby; failover.
- WebSocket scale beyond 100k via dedicated Soketi/Centrifugo.
- Predictive autoscale: simple model (rolling avg + spike forecast).
- Cost projection by component em 10x volume.

---

## 5. Extensões e Conexões

- Liga com **02-09** (Postgres): replicas, sharding via Citus.
- Liga com **02-11** (Redis): cluster, fan-out.
- Liga com **02-14** (real-time): WS scale.
- Liga com **03-03** (K8s): HPA, autoscaling.
- Liga com **03-05** (AWS): RDS, ElastiCache, Aurora Global, ALB, CloudFront.
- Liga com **03-07** (observability): SLO + capacity dashboards.
- Liga com **03-10** (perf backend): otimização precede scaling.
- Liga com **04-01** (theory): consistency em multi-region.
- Liga com **04-04** (resilience): backpressure, bulkhead.
- Liga com **04-08** (services): scale per deployable.

---

## 6. Referências

- **DDIA** — capítulos 5 (replication), 6 (partitioning).
- **"The Art of Scalability"** — Abbott, Fisher.
- **"Web Scalability for Startup Engineers"** — Artur Ejsmont.
- **"Real-World Cryptography"** — capítulos relacionados a multi-region trust.
- **AWS Builders' Library** — capacity planning, multi-region.
- **High Scalability blog** ([highscalability.com](http://highscalability.com/)) — case studies.
- **Cockroach docs** ([cockroachlabs.com/docs](https://www.cockroachlabs.com/docs/)).
- **CitusData blog**.
- **"Site Reliability Engineering"** — Google. Capacity planning chapter.
