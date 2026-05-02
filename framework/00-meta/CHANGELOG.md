# CHANGELOG, Mudanças no Framework

> Registro append-only de mudanças no framework. Module added/renamed/removed, prereqs alterados, capstones revisados, protocolos atualizados, referências canônicas adicionadas.
>
> **Não** é changelog de produto Logística (esse é seu repo separado). É changelog **do próprio framework** como artefato.

Formato: `[YYYY-MM-DD] | tipo | descrição` em ordem cronológica reversa (mais recente no topo).

Tipos:
- **add**: módulo, capstone, meta, protocolo novo.
- **edit**: conteúdo alterado em arquivo existente.
- **rename**: arquivo renomeado.
- **remove**: arquivo deletado.
- **prereqs**: dependências de módulo alteradas.
- **capstone**: escopo de capstone alterado.
- **protocol**: STUDY-PROTOCOL ou MENTOR.md alterado.
- **ref**: adição em reading-list ou elite-references.

---

## 2026

### 2026-05-01, Review wave 15 — engineering rigor (Next.js PPR + cache layers, ORM N+1 + DataLoader, idempotent consumer, Saga patterns, K8s production resilience)

Décima-quinta onda do audit cross-stage. Foca em rigor de engenharia — patterns operacionais onde Senior+ paga preço caro por implementação ingênua, com código copy-paste-pronto e anti-patterns reais.

- **edit** [`framework/02-plataforma/02-05-nextjs.md`](../02-plataforma/02-05-nextjs.md) §2.21, Partial Pre-Rendering (PPR) + 4 cache layers — Request Memoization (per-request dedup), Data Cache (cross-request com `revalidate`/`tags`), Full Route Cache (static HTML), Router Cache (client-side com staleTime), PPR híbrido static/dynamic com Suspense em rota única, código completo Logística com `unstable_cache` + `revalidateTag` granular + Server Action, cache observability (`x-nextjs-cache`, build log, Cache-Control), distributed cache handler com Redis + tag-based invalidation pra multi-instance, 8 anti-patterns observados (fetch sem wrapper, router.refresh esquecido, revalidate em endpoint volátil, multi-instance sem handler, cookies em layout root, unstable_cache sem keyParts, tag genérica, build-time fetch volátil).
- **edit** [`framework/02-plataforma/02-10-orms.md`](../02-plataforma/02-10-orms.md) §2.16, N+1 detection + DataLoader pattern + query analysis — anatomy de N+1 com Drizzle/Prisma, 3 fixes (eager via `with`/`include`, SELECT IN batch quando JOIN é cartesian, DataLoader per-request), detection via logger + AsyncLocalStorage counter + APM (Datadog/Sentry/New Relic), query analysis tooling (pg_stat_statements, PgHero, pganalyze, EXPLAIN ANALYZE em ORM-generated query), 5 eager loading anti-patterns (over-fetch, cartesian explosion, getter lazy, DataLoader compartilhado, sem maxBatchSize), query budget per endpoint como SLO, stack pragmático Logística completo com Drizzle + DataLoader.
- **edit** [`framework/04-sistemas/04-02-messaging.md`](../04-sistemas/04-02-messaging.md) §2.18, idempotent consumer + 4 deduplication strategies — fundamento "exactly-once = at-least-once + idempotent consumer" (FLP impossibility), 4 strategies em código (idempotency table com TX atomic + cleanup cron, natural idempotency via UPSERT condicional para LWW, inbox pattern com FOR UPDATE SKIP LOCKED desacoplando receiver de processor, external side effect com Stripe idempotencyKey), decision tree por cenário, DLQ + poison message handling com max attempts + alert, pipeline Logística end-to-end Order Outbox + Inbox + Notification, 8 anti-patterns observados (trust em "exactly-once" do broker, ack antes de processar, check fora de TX, sem cleanup, DLQ sem alert, replay sem partial assumption, message_id de timestamp, external sem idempotency key).
- **edit** [`framework/04-sistemas/04-08-services-monolith-serverless.md`](../04-sistemas/04-08-services-monolith-serverless.md) §2.21, Saga patterns deep — choreography (event-driven Kafka, loosely coupled mas business logic distribuído) vs orchestration (central coordinator, business logic visível mas tight coupling), Temporal workflow durável com `proxyActivities` + retry automatic + compensation array em LIFO, compensating transaction design rules (idempotente, ordem reverso, não-undo perfeito, pivotal step), state machine vs free-form workflow, decisão híbrida Logística (PlaceOrder = Temporal orchestration; status propagation = Kafka choreography), 7 anti-patterns observados (distributed monolith, sem timeout, compensation falha em silêncio, coordinator em-memória, sem saga ID, cyclic events, refund-then-charge), tooling 2026 (Temporal/Restate/Step Functions/Camunda 8/Inngest).
- **edit** [`framework/03-producao/03-03-kubernetes.md`](../03-producao/03-03-kubernetes.md) §2.21, K8s production resilience — PodDisruptionBudget com `unhealthyPodEvictionPolicy: AlwaysAllow` (1.27+), Topology Spread Constraints com `maxSkew` + `matchLabelKeys` (1.27+) protegendo AZ failure, anti-affinity como complemento, PriorityClass pra eviction order (critical-prod 100k vs best-effort-batch 1k) + system critical reservados, QoS classes (Guaranteed/Burstable/BestEffort) com regra prod, descheduler com LowNodeUtilization + RemovePodsViolatingTopologySpreadConstraint, eviction thresholds tuning kubelet (hard vs soft), stack Logística completo orders-api com todas defenses ligadas (PriorityClass + topology spread zone + Guaranteed QoS + 3 probes + PDB minAvailable 4 + grace 60s), 9 anti-patterns observados, validation toolkit (kubectl drain dry-run, kubent, kubescape, chaos-mesh).

### 2026-05-01, Review wave 14 — platform edges (OAuth2 PKCE mobile, ADR deep, RUM web-vitals, backpressure end-to-end, Docker secrets)

Décima-quarta onda do audit cross-stage. Foca em fronteiras de plataforma — handoffs entre layers (browser↔server, app↔queue, build↔runtime) onde Senior+ paga preço caro se trata superficialmente.

- **edit** [`framework/02-plataforma/02-13-auth.md`](../02-plataforma/02-13-auth.md) §2.19, OAuth2 PKCE para mobile com Authorization Code Grant deep — mecânica code_verifier/code_challenge SHA256 (RFC 7636 + OAuth 2.1 BCP 2025), código Expo/React Native completo (PKCE pair generation, AuthSession.startAsync, token exchange, SecureStore com keychainAccessible WHEN_PASSCODE_SET), refresh rotation handling com singleflight pra evitar race em parallel requests, Universal/App Links vs custom URI scheme (code intercept attack), logout completo RFC 7009 token revocation + RP-initiated end-session, 8 anti-patterns observados (PKCE plain method, state faltando, refresh em AsyncStorage, implicit flow, static client_secret, custom URI sem app links, sem singleflight, token em deep link log), config minimal AS compatible Hydra/Keycloak/Auth0.
- **edit** [`framework/04-sistemas/04-12-tech-leadership.md`](../04-sistemas/04-12-tech-leadership.md) §2.22, Architectural Decision Records (ADR) deep — quando ADR é obrigatório (heurística hard-to-reverse, cross-team, controversial, viola pattern), template MADR completo (Status/Date/Deciders/Consulted/Informed + Context + Decision Drivers + Considered Options + Decision Outcome + Pros/Cons + Links + Notes) com exemplo Iceberg adoption, lifecycle workflow (Proposed → Accepted → Deprecated/Superseded/Rejected) e regra de manter rejected docs, repo structure 4-digit numbering + slug verb-forte, tooling (adr-tools + log4brains + CI label needs-adr), padrão RFC vs ADR por size de time, exemplo Logística track de 12 meses, 7 anti-patterns observados (ADR pra tudo, sem alternativas, escrito após implementação, status nunca atualiza, design doc gigante, sem template enforced, sem reviewer), 4 métricas de programa (throughput, diversity de autores, superseded ratio, time-to-decision).
- **edit** [`framework/03-producao/03-09-frontend-performance.md`](../03-producao/03-09-frontend-performance.md) §2.19, Real User Monitoring (RUM) deep — Core Web Vitals 2026 com INP substituindo FID em 2024-03 (thresholds e percentile p75 origin), web-vitals v4 código completo com sendBeacon + keepalive fallback, attribution data por métrica (LCP element/url/loadDelay; INP eventTarget/inputDelay/processingDuration/longestScript; CLS largestShiftTarget/loadState) que vira ação concreta, backend Edge runtime + sampling client-side (10% high-traffic + 100% low-traffic ou per-session persistent), 3 dashboards essenciais (p75 trend, distribution histogram, attribution heatmap), Logística por user journey (pickup-confirm vs homepage), comparação stack 2026 (SpeedCurve LUX/Datadog RUM/Sentry/Cloudflare WA/OTel+ClickHouse com custos 1M PV/mês), 8 anti-patterns observados (Lighthouse-driven sem RUM, sem attribution, CrUX só, sampling sem persistência, send sem keepalive, reportAllChanges true em prod, sem device/connection metadata, CLS sem loadState), performance budget enforcement no CI.
- **edit** [`framework/04-sistemas/04-09-scaling.md`](../04-sistemas/04-09-scaling.md) §2.20, backpressure end-to-end deep — 4 layers cascateados (TCP slow-start + cwnd/rwnd com pegadinha tcp_rmem em high-RTT, app Reactive Streams com RxJS/async iterator + p-limit bounded parallelism, queue prefetch + manual ack RabbitMQ/Kafka eachBatchAutoResolve false/SQS visibility timeout, producer load shedding 503 + Retry-After + adaptive concurrency Netflix), decision tree drop/buffer/throttle/backpressure por workload (analytics drop, financial backpressure, API load shed, background throttle, bulk cursor), pipeline Logística stack completo end-to-end com backpressure ativo em cada hop, observability obrigatório por layer (TCP via ss/eBPF, app via gauges, queue lag/depth, producer 503 rate), 8 anti-patterns observados (buffer unbounded, drop silencioso sem métrica, retry sem backoff em saturação, for...of em stream, Kafka sem manual offset, RabbitMQ prefetch unlimited, load shed por CPU%, backpressure só em uma camada).
- **edit** [`framework/03-producao/03-02-docker.md`](../03-producao/03-02-docker.md) §2.20, secrets em containers — anti-patterns Dockerfile (ENV/ARG/COPY .env vazam em layers/history/inspect), build-time correto com BuildKit `--mount=type=secret` + SSH agent forwarding (`--mount=type=ssh`), 4 padrões runtime (env vars caveat, env-file, tmpfs mount, IMDS/Vault/SecretsManager com cache 5min e IRSA/Workload Identity), Docker Swarm secrets pra legacy, K8s 3 padrões (Secret resource com encryption-at-rest etcd config, External Secrets Operator sync de Vault/AWS, CSI Secret Store Driver mount sem K8s Secret), detecção via gitleaks pre-commit + trufflehog --only-verified em CI, 8 anti-patterns observados (ENV em Dockerfile, ARG pra secret, COPY .env, process.env dump em exception, connection string em log, K8s Secret sem encryption etcd, SA cluster-admin, sem rotation policy), validation bash pra secret leak audit local.

### 2026-05-01, Review wave 13 — systems craft (Go concurrency, ClickHouse query opt, search relevance tuning, SLO burn rate, Postgres tuning sob carga)

Décima-terceira onda do audit cross-stage. Foca em craft de sistemas — patterns operacionais de produção onde Senior+ precisa código copy-paste-pronto, números reais, e anti-patterns que mordem em scale.

- **edit** [`framework/03-producao/03-11-systems-languages.md`](../03-producao/03-11-systems-languages.md) §2.18, Go concurrency patterns aplicados — 7 patterns production-ready (errgroup com context cancellation + SetLimit, select com timeout + ctx.Done() evitando time.After leak, context propagation cross-service com r.Context() e WithValue, pipeline channels fan-out/fan-in com defer close + select em send, graceful shutdown com signal.NotifyContext + shutdown ctx separado, goroutine leak detection com goleak + pprof, sync.Pool com Reset obrigatório), 7 anti-patterns observados (goroutine sem ctx.Done, time.After em loop, lock across channel send, channel não-buffered fan-out, recover sem propagação, context.Background em handler HTTP, errgroup sem SetLimit), race detector + linters obrigatórios.
- **edit** [`framework/03-producao/03-13-time-series-analytical-dbs.md`](../03-producao/03-13-time-series-analytical-dbs.md) §2.18, ClickHouse query optimization deep — sorting key escolhido como filtro frequente (tenant-first, not timestamp-first), 5 tipos de skip indexes (minmax/set/bloom_filter/tokenbf_v1/ngrambf_v1) com matriz de quando cada um vence, projections como segunda cópia ordenada transparente, materialized views com AggregatingMergeTree + uniqState/uniqMerge HLL, caso real Logística fact_tracking_pings com TTL hot/cold tiers, query rewrite patterns (PREWHERE, SAMPLE, LIMIT N BY), 7 anti-patterns observados (SELECT *, fact-fact JOIN, skip index sem EXPLAIN validation, sorting key 10 colunas, update/delete frequente em MergeTree, ORDER BY sem LIMIT, sem PARTITION BY), diagnostic toolbox via system tables.
- **edit** [`framework/02-plataforma/02-15-search-engines.md`](../02-plataforma/02-15-search-engines.md) §2.18, relevance tuning operacional — métricas offline (NDCG@10, MRR, MAP@K, Recall@K), construção de golden dataset (100-500 query/relevant_docs com Argilla/Label Studio), código TypeScript de NDCG@10 pra CI guardrail, synonyms 2-tier (bidirectional vs one-way) com Elasticsearch synonym_graph + pegadinha de só no search_analyzer, boosting com function_score (field_value_factor + gauss decay) com cap em 2-3x pra evitar spam, learning-to-rank quando vale (clickstream > 100k events/mês, baseline saturou) com Elasticsearch LTR plugin + LightGBM pipeline, online A/B test com guardrails (latency p99, zero-result rate), 6 anti-patterns observados (synonym bidirectional sem cuidado, popularity boost sem freshness penalty, LTR sem golden dataset, embedding sem rerank, esquecer query understanding, NDCG offline melhora online degrada).
- **edit** [`framework/03-producao/03-15-incident-response.md`](../03-producao/03-15-incident-response.md) §2.18, SLO error budget burn rate alerts — tabela canônica Google SRE de 4 alerts MWMBR (14.4x/6x/3x/1x com long+short windows pareados), PromQL recording rules + alerting rules completos pra orders endpoint, Alertmanager routing por severity (PagerDuty critical, Linear/Jira warning), 3 panels Grafana essenciais, SLO definition YAML template processável por Pyrra/Sloth/OpenSLO spec CNCF, error budget policy template (< 50% normal, 50-80% extra review, 80-100% freeze non-critical, > 100% hard freeze + postmortem), 6 anti-patterns observados (single window, sem short window check, target irreal 99.999%, SLO de coisa não-customer, sem error budget policy, alert sem runbook).
- **edit** [`framework/02-plataforma/02-09-postgres-deep.md`](../02-plataforma/02-09-postgres-deep.md) §2.20, Postgres tuning sob carga — formula pragmática 32GB RAM (shared_buffers 25% RAM, effective_cache_size 75%, work_mem por NÓ não conn), pgbouncer transaction-mode obrigatório com max_connections baixo, autovacuum tuning com per-table override pra hot tables (autovacuum_vacuum_scale_factor 0.02 + fillfactor 90), bloat detection via pg_stat_user_tables + pgstattuple + pg_repack online, checkpoint tuning anti-spike (timeout 15min + max_wal_size 8GB + completion_target 0.9), config Logística production completo (32GB/8 vCPU/SSD), diagnostic queries (top por exec_time, cache hit ratio, wait events, connection state), 7 anti-patterns observados (shared_buffers > 40% RAM, work_mem alto global, max_connections 500 sem pgbouncer, autovacuum desligado, checkpoint sem max_wal_size, sem log_min_duration_statement, tunar via blog sem medir), validation toolkit (pgbench, pg_stat_statements, auto_explain, pgbadger, PgHero).

### 2026-05-01, Review wave 12 — applied depth (specification pattern, dbt incremental, SBOM/VEX, React 19 use()/cache(), agentic patterns)

Décima-segunda onda do audit cross-stage. Foca em padrões aplicados onde Senior+ encontra peso operacional real — escolhas que custam meses se erradas e onde framework precisa código copy-paste-pronto.

- **edit** [`framework/04-sistemas/04-06-domain-driven-design.md`](../04-sistemas/04-06-domain-driven-design.md) §2.17, specification pattern e invariants no código — interface `Specification<T>` com and/or/not combinators, `SqlSpecification` com `toSqlClause()` (paridade in-memory ↔ SQL como killer feature), distinção operacional invariant/precondition/validation, encoding em código (smart constructors com `Result<T, E>`, value objects que validam uma vez, `assertInvariants()` ao fim de mutações), Order aggregate completo com pattern aplicado, 5 anti-patterns observados (anemic model, spec só in-memory virando OOM, validações duplicadas, if-statements espalhados), quando spec pattern é overkill (CRUD, app pequena, regras só UI).
- **edit** [`framework/04-sistemas/04-13-streaming-batch-processing.md`](../04-sistemas/04-13-streaming-batch-processing.md) §2.9.1, dbt incremental strategies decisão e código real — matriz comparativa append/merge/delete+insert/insert_overwrite (modelo, quando usa, DB suportado, race conditions), deep dive em cada strategy com SQL copy-paste-pronto, decision tree operacional, late-arriving data com lookback_window, backfill por janela com `--vars`, idempotency tests, monitoring com Elementary/re_data, 5 anti-patterns observados (incremental sem `is_incremental()`, `unique_key` sem constraint, append em source com retries, ignorar late data, delete+insert em horário de pico).
- **edit** [`framework/03-producao/03-08-applied-security.md`](../03-producao/03-08-applied-security.md) §2.20, SBOM lifecycle e VEX statements operacionais — formats CycloneDX/SPDX/SWID com escolha 2026 (CycloneDX 1.6+ com VEX nativo), geração no build (Dockerfile multi-stage + syft + cosign attest), anatomia CycloneDX com purl + dependency graph, VEX statuses com 9 NTIA-defined justifications (`code_not_reachable`, `protected_at_perimeter`, etc.), exemplo VEX completo, pipeline GHA integrada (syft → cosign → grype com --vex → Dependency-Track → OPA/Rego policy gate), SBOM diff entre releases, 6 anti-patterns observados (SBOM gerada uma vez, sem VEX virando alert fatigue, SBOM em S3 sem ingestão, justifications vazias, SBOM em dev workstation, cosign sem keyless OIDC).
- **edit** [`framework/02-plataforma/02-04-react-deep.md`](../02-plataforma/02-04-react-deep.md) §2.9.2, React 19 `use()` hook + `cache()` em RSC patterns — `use()` permite chamada conditional/em loop (impossível com hooks tradicionais), exemplo server component lendo promise, conditional `use()` em client com promise estável, `cache()` request-scoped resolvendo N+1 com 3 componentes batendo mesma cached promise, preload pattern fire-and-forget pra evitar waterfall, dashboard Logística completo com `<Suspense>` + `cache()` + `use()` streaming independente, 6 anti-patterns observados (use com promise inline em client, cache em client component, cache esperando cross-request, esquecer preload, mistura `await`+`use()`, key com objeto inline).
- **edit** [`framework/04-sistemas/04-10-ai-llm.md`](../04-sistemas/04-10-ai-llm.md) §2.20, agentic patterns operacionais — 3 patterns que separam agent prod de protótipo: (1) planner-executor split (LLM gera JSON estruturado via Zod discriminated union, executor determinístico com budget cap + audit log), (2) critic loop (segundo LLM Haiku 4.5 valida output do planner Sonnet/Opus, retry ≤3 com errors como context, ~70-80% das falhas resolvem), (3) tool selection com retrieval (vector search top-5 tools quando catalog > 20, fix degradação documentada Anthropic/OpenAI), pipeline end-to-end Logística (~$0.04-0.08/session, p99 8-15s), 7 anti-patterns observados (single-LLM ReAct loop, critic mesmo modelo+prompt, sem budget caps, retrieval sem fallback fixed tools, audit sem latency por step, critic em loop infinito, esquecer logging de reasoning).

### 2026-05-01, Review wave 11 — staff frontier (monorepo CI graph, Senior→Staff promo, tz/currency edges, JSONB indexing, adaptive hedging)

Décima-primeira onda do audit cross-stage. Foca em fronteiras onde Senior+ encontra peso operacional real — escolhas que custam meses se erradas e onde framework precisa código copy-paste-pronto, não conceito.

- **edit** [`framework/03-producao/03-04-cicd.md`](../03-producao/03-04-cicd.md) §2.15, monorepo CI graph deep — comparação Turborepo / Nx / Bazel / Pants / Rush.js (modelo, hermetic, cache local/remoto, quando usar), 3 estratégias de affected detection (path-based com paths-filter, tool-based com `turbo --filter='[origin/main]'` + `nx affected`, Bazel target-based com bazel-diff), remote cache backends (Turbo open spec via Cloudflare Workers self-hosted, Nx Cloud, BuildBuddy/EngFlow com RBE), padrão Logística monorepo completo (estrutura + turbo.json + workflow GHA reduzindo CI 12min→90s), 4 caveats reais (cache hit rate como métrica primária, inputs implícitos quebrando cache, cache poisoning, cross-platform divergence).
- **edit** [`framework/04-sistemas/04-12-tech-leadership.md`](../04-sistemas/04-12-tech-leadership.md) §2.21, promotion Senior → Staff processo concreto — diferença operacional Senior vs Staff em 6 dimensões (Larson/Reilly), artifact requirements (2-3 cross-team projects com impact métrico, 3-5 ADRs lideradas, 1 RFC organizacional, 2-3 mentees promovidos, external signal, postmortem authoria, 5-10 endorsements), 30/60/90 day plan tipo após sinalizar intent ao manager, defense ritual de 30-45min com estrutura por bloco, anti-patterns que matam promo case (eu-fiz vs eu-liderei, métricas vagas, sem cross-team), quando NÃO buscar Staff (track fechado, quer 80% código, org instável), calibração emocional sobre promo ≠ valor pessoal.
- **edit** [`framework/02-plataforma/02-19-internationalization.md`](../02-plataforma/02-19-internationalization.md) §2.7 + §2.13, timezone edges + currency precision — half-hour/quarter-hour timezones (IST UTC+5:30, NPT UTC+5:45) que quebram filters por hour, DST spring-forward (timestamps inexistentes) e fall-back (ambíguos) com exemplos Brasil 2019, DST policy mudando + tzdata pin obrigatório em Dockerfile, recurring events como `(rrule_text, tz_id)` separados, padrão Luxon+Temporal API (TC39 Stage 3 2026); currency precision por ISO 4217 com 4 tipos (zero/two/three/four-decimal), `toMinorUnits` correto pra KWD/BHD/OMR (3 decimals), `Intl.NumberFormat` por locale, FX rate provider patterns com multi-provider fallback chain, settlement vs display (snapshot da rate dentro da transação), half-decimal/indexed currencies (CLF, UYI, XAU).
- **edit** [`framework/02-plataforma/02-09-postgres-deep.md`](../02-plataforma/02-09-postgres-deep.md) §2.7 + §2.7.1, partial index + JSONB indexing patterns — partial index quando vence (10M rows / 600MB → 50k / 3MB) com pegadinha de subset lógico no WHERE da query, audit em prod via pg_indexes; JSONB com `jsonb_path_ops` (containment-only, 2-3x menor), expression index sobre path conhecido (B-tree vence GIN em equality), composite expression+partial, `gin_trgm_ops` pra fuzzy em path, decision matrix por query pattern (containment/equality/fuzzy/key-exists/range com cast), caso real Logística events table com stack ótimo de 3 índices, 3 anti-patterns observados (single GIN cobrindo tudo, sem partial em time-series, B-tree em payload direto), maintenance com bloat audit + REINDEX CONCURRENTLY.
- **edit** [`framework/04-sistemas/04-04-resilience-patterns.md`](../04-sistemas/04-04-resilience-patterns.md) §2.19, hedging adaptive com backup-after-percentile — `AdaptiveHedger` TypeScript com TDigest pra estimar P95 dinâmico (substitui timeout fixo de 50ms hack), AbortController pattern pra cancelar replica losing, custo medido (5-10% extra requests) vs benefício real (Google Bigtable 2013: P99 lookup -30 a -43% sem aumentar load total), 5 anti-cases onde hedge HURTS (cache-warming, quorum reads cross-region, backend saturado, write não-idempotente sem dedupe, custo $$$ por request tipo Claude API), decisão pragmática por cenário (read replica ✅, LLM com cap+idempotency ⚠️, payment capture ❌, cache lookup ❌, cross-region ✅).

### 2026-05-01, Review wave 10 — execution patterns (dbt+Iceberg, step-up auth, Wasm prod, Suspense+ErrorBoundary, distributed cache invalidation)

Décima onda do audit cross-stage. Patterns de execução com código copy-paste-pronto pra Logística production.

- **edit** [`framework/04-sistemas/04-13-streaming-batch-processing.md`](../04-sistemas/04-13-streaming-batch-processing.md) §2.9, dbt + Iceberg pipeline real Logística — projeto estruturado (sources.yml + staging incremental com CDC dedup + intermediate + marts SummingMergeTree + tests + snapshots SCD2 + seeds), Iceberg em produção 2026 (multi-engine, time travel, schema/partition evolution, catalog Polaris emergente, compaction, vacuum), orquestração Dagster.
- **edit** [`framework/02-plataforma/02-13-auth.md`](../02-plataforma/02-13-auth.md) §2.8, step-up authentication completo — OIDC `acr` + `amr` + `auth_time` claims, middleware `requireStepUp` com policy por endpoint sensível (delete account exige acr 3 + max_age 5min + webauthn-only; update payout exige acr 2 + max_age 10min), frontend handling de 401 step_up_required com retry silencioso, CAEP emergente (continuous re-auth) + padrão pragmático antes (short-lived tokens + heartbeat + revocation list).
- **edit** [`framework/03-producao/03-12-webassembly.md`](../03-producao/03-12-webassembly.md) §2.6, Wasm produção real — Rust → wasm-pack pipeline completo (Cargo.toml otimizado pra size + lib.rs com wasm-bindgen + serde-wasm-bindgen), uso Next.js Client Component, bench real (100MB CSV: 12s JS → 800ms Wasm = 15x), Component Model + WIT bindings (Preview 2, future), Spin/Fermyon edge deploy, 5 caveats (boundary cost, DOM access, bundle size, async maturity, debug).
- **edit** [`framework/02-plataforma/02-04-react-deep.md`](../02-plataforma/02-04-react-deep.md) §2.8, Suspense + Error Boundaries em produção — hierarquia granular por widget (não 1 boundary global), retry com `useQueryErrorResetBoundary` (canonical React Query pattern), `useTransition` pra UI responsivo durante state mudança, `useDeferredValue` pra defer derivação cara, 6 pegadinhas em produção (event handlers + async, onReset sem reset query, boundary too broad, layout shift, streaming SSR error.tsx, Sentry integration).
- **edit** [`framework/04-sistemas/04-09-scaling.md`](../04-sistemas/04-09-scaling.md) §2.5, distributed cache invalidation — 4 patterns em código (pub/sub broadcast Redis, CDC-based zero dual-write via Debezium → Kafka → cache-invalidator, versioned keys no-invalidation, tag-based Cloudflare-style), matriz de decisão por cenário, 3 anti-padrões (TTL longa "compensada", invalidate síncrono no path, sem observability).

### 2026-05-01, Review wave 9 — operational fluency (EXPLAIN forensic, cache stampede, IC rituals, OSS funding, jittered backoff)

Nona onda do audit cross-stage. Foca em fluência operacional — frentes onde dev mediano "sabe que existe" mas trava na hora de aplicar; código e templates production-ready.

- **edit** [`framework/02-plataforma/02-09-postgres-deep.md`](../02-plataforma/02-09-postgres-deep.md) §2.9, EXPLAIN ANALYZE forensic guide — workflow forense em 5 passos (identificar nó dominante, comparar rows estimado/actual, conferir Buffers, distinguir Filter vs Index Cond, comparar plano esperado), caso real Logística (query 4823ms → 0.4ms = ~12000x via composite + partial + INCLUDE index), 4 anti-patterns (EXPLAIN sem ANALYZE, otimizar por cost, CONCURRENTLY ausente, índice "pra todo filter"), ferramentas (explain.dalibo, depesz, pg_stat_statements, auto_explain).
- **edit** [`framework/02-plataforma/02-11-redis.md`](../02-plataforma/02-11-redis.md) §2.11, cache stampede protection completo — 4 patterns em código (Singleflight in-process, distributed lock com double-check + Lua atomic unlock, XFetch probabilistic refresh com beta tunable, stale-while-revalidate Cloudflare-style), matriz de decisão por cenário, anti-padrão de jittered TTL solo.
- **edit** [`framework/03-producao/03-15-incident-response.md`](../03-producao/03-15-incident-response.md) §2.6, IC playbook completo — first 15 minutes script (T+0 a T+15 com ações concretas), decision log template (What/Why/Risk/Reversal/Observed effect), nova §2.6.1 war-room rituals (pinned message, threaded discussions, voice channel paralelo, no silent investigation, timeboxing, eat/break protocol), 3 anti-patterns. §2.8 expandido com 4 templates concretos de status page (Investigating/Identified/Monitoring/Resolved) + customer email completo + 5 anti-patterns + canonical examples.
- **edit** [`framework/04-sistemas/04-15-oss-maintainership.md`](../04-sistemas/04-15-oss-maintainership.md) §2.12, OSS sustainability deep — números reais 2026 por tier (hobby → hyperscaler-funded), reality check sobre burnout, dual-licensing armadilha legal (CLA mandatório vs DCO), 4 casos canônicos (Hashicorp BSL 2023 → OpenTofu fork, MongoDB SSPL 2018, Redis 2024 → Valkey, Sentry FSL sucesso), decisão pragmática por estágio de ARR.
- **edit** [`framework/04-sistemas/04-04-resilience-patterns.md`](../04-sistemas/04-04-resilience-patterns.md) §2.3, jittered exponential backoff implementação completa — TypeScript production-ready com decorrelated jitter (Marc Brooker AWS pattern 2015), comparação 3 estratégias (no jitter / full jitter / decorrelated), exemplo Logística com Stripe API + idempotencyKey + retryable error filter, 5 caveats que mordem em produção (idempotency obrigatório, Retry-After respect, layer-only retry, AbortSignal, jittered shutdown).

### 2026-05-01, Review wave 8 — staff rigor (refresh rotation, mutation testing, estimation, aggregate refactor, OLAP decision tree)

Oitava onda do audit cross-stage. Foca em rigor que separa Staff de Senior — execução defensável de patterns onde quem decide errado paga preço caro em produção.

- **edit** [`framework/02-plataforma/02-13-auth.md`](../02-plataforma/02-13-auth.md) §2.15, refresh token rotation com family-based replay detection (RFC 9700 BCP 2025) — schema Postgres com family_id + parent_jti + status, algoritmo atômico Postgres advisory lock, family invalidation em replay detection com security event, sliding vs absolute vs híbrido com cap, storage trade-off matrix (HttpOnly cookie / localStorage / in-memory + cookie / mobile keychain), detecção avançada (fingerprint check, geo-velocity, concurrent device cap).
- **edit** [`framework/03-producao/03-01-testing.md`](../03-producao/03-01-testing.md) §2.9, mutation testing com Stryker concretamente — config completa stryker.conf.json com incremental + thresholds, 9 operadores canônicos com exemplos (ArithmeticOperator, ConditionalExpression, EqualityOperator, etc.), interpretação de output (survived / killed / timeout / no coverage), 3 tipos de reação a survived mutants, anti-padrão da obsessão por 100%, threshold pragmático por tipo de código, onde rodar (PR-level / nightly / pre-release).
- **edit** [`framework/04-sistemas/04-12-tech-leadership.md`](../04-sistemas/04-12-tech-leadership.md) §2.12, estimation com data — matriz de decisão entre T-shirt / story points / 3-point PERT / NoEstimates com acurácia + tempo de cerimônia + quando, story points é mais caro não mais preciso em times novos (CMU research), erro sistemático 2x baixa de mediana (Hofstadter calibration), RICE pra priorização (não estimativa) com exemplo concreto Logística, planning poker variantes (async, magic estimation, bucket), comunicação de incerteza calibrada com 3 níveis.
- **edit** [`framework/04-sistemas/04-06-domain-driven-design.md`](../04-sistemas/04-06-domain-driven-design.md) §2.8, aggregate design rules expandido com heurísticas concretas — 5 critérios em ordem de peso (invariant boundary, lifecycle, co-modificação, tamanho carregado, concurrency contention), 5 sinais de aggregate grande demais, **caso real de refactor Logística** (Order V1 anti-padrão com tracking pings dentro vs V2 com 5 aggregates separados), migração incremental sem big-bang, deploy reversível por passo.
- **edit** [`framework/03-producao/03-13-time-series-analytical-dbs.md`](../03-producao/03-13-time-series-analytical-dbs.md) §2.15, decision tree analytics 2026 com 7 cenários — Postgres BRIN + matviews / TimescaleDB / ClickHouse / DuckDB embedded / BigQuery-Snowflake / Druid-Pinot real-time / lakehouse Iceberg + ClickHouse, com volume threshold + custo + curva de aprendizado + quando vira dor pra cada um. Matriz resumida por estágio Logística (v1 → v4) com recomendação específica.

### 2026-05-01, Review wave 7 — elite depth (Tokio internals, distributed rate limit, Apollo Router, BuildKit multi-arch, Server Actions)

Sétima onda do audit cross-stage. Profundidade técnica em frentes onde Senior+ precisa de rigor de elite — código de produção real, não demo de tutorial.

- **edit** [`framework/03-producao/03-11-systems-languages.md`](../03-producao/03-11-systems-languages.md) §2.17, Tokio internals em profundidade — modelo de execução (tasks, reactor, scheduler, blocking), Pin e por que existe (state machine self-referential), Send vs !Send com exemplos compiláveis, holding lock across await como antipattern crítico (3 padrões de fix), function coloring custo real (block_on caveats), decisão runtime por workload, observability (tokio-console + tracing).
- **edit** [`framework/04-sistemas/04-09-scaling.md`](../04-sistemas/04-09-scaling.md) nova §2.7.1, distributed rate limiting deep — comparação de 5 algoritmos (fixed window, sliding log, sliding counter, token bucket, leaky bucket), Lua script atomic completo pra sliding window log + token bucket, padrão Logística multi-tier com Retry-After + X-RateLimit headers, caveats em produção (Redis cluster slot tags, failover fail-closed vs fail-open, clock drift via redis.call('TIME')).
- **edit** [`framework/04-sistemas/04-05-api-design.md`](../04-sistemas/04-05-api-design.md) §2.20, Apollo Router (Rust) deep — pipeline de query (parse → planner → execução → compose), exemplo de query plan Logística com `_entities` resolution, config TOML production-ready (timeouts por subgraph, retry, telemetry OTLP), caveats (N+1 cross-subgraph, schema evolution coordenada, composition errors, auth distribuído).
- **edit** [`framework/03-producao/03-02-docker.md`](../03-producao/03-02-docker.md) §2.6, BuildKit advanced — multi-arch builds (linux/amd64 + linux/arm64) com manifest list, ARM nativo runners GHA vs QEMU emulation, cache backends pra CI (registry, gha, s3) com mode=max vs min, secrets mount avançado (não vaza em layer/ARG/ENV), output formats (oci tarball, plain filesystem).
- **edit** [`framework/02-plataforma/02-04-react-deep.md`](../02-plataforma/02-04-react-deep.md) nova §2.9.1, Server Actions deep — modelo mental, exemplo Logística com `'use server'` + Zod validation + RLS Postgres + revalidatePath, useActionState + useFormStatus + useOptimistic patterns, pegadinhas reais (encryption keys multi-instance, CSRF built-in, args serializáveis, validação server obrigatória, long-running actions com queue), quando NÃO usar Server Actions.

### 2026-05-01, Review wave 6 — applied patterns (CRDTs, hybrid search, deadline propagation, bulkhead, chaos)

Sexta onda do audit cross-stage. Foca em **código real e patterns aplicados** que separam Senior de Staff — temas onde o framework já tinha conceito mas faltava implementação executável Monday morning.

- **edit** [`framework/04-sistemas/04-01-distributed-systems-theory.md`](../04-sistemas/04-01-distributed-systems-theory.md) §2.18 (CRDT), exemplo concreto Logística com Yjs — server (y-websocket + LeveldbPersistence) e client (provider + awareness + CodeMirror integration) pra notas colaborativas em pedido. Pegadinhas em produção (GC tradeoff, auth no upgrade, permissões custom message types, storage scaling, Yjs vs Automerge decision).
- **edit** [`framework/02-plataforma/02-15-search-engines.md`](../02-plataforma/02-15-search-engines.md) §2.7, hybrid search com código copiável: schema Postgres com tsvector + pgvector HNSW, SQL CTE de RRF (k=60 padrão Cormack), TypeScript Cohere Rerank com top-50→10. Custos e latências reais 2026 (10-30ms hybrid + 100-300ms rerank, $2/1k searches Cohere). Alternativa local com cross-encoder GPU.
- **edit** [`framework/04-sistemas/04-04-resilience-patterns.md`](../04-sistemas/04-04-resilience-patterns.md) §2.2, deadline propagation com pseudocódigo TypeScript completo — `withDeadline`, `remainingMs`, `call` com AbortController + reserva de buffer, handler gateway Logística cascateando deadline em 4 hops, X-Request-Deadline header, pegadinha de clock skew, implementations canônicas (gRPC context, OTel baggage, Anthropic SDK).
- **edit** [`framework/04-sistemas/04-04-resilience-patterns.md`](../04-sistemas/04-04-resilience-patterns.md) §2.24, bulkhead per-tenant em código — pools dedicados por tier (premium 20 conns, standard 10, free 5) com timeouts e statement_timeout próprios, middleware de roteamento, métricas Prometheus por tier, variantes (read/write split, per-feature pools, queue worker isolation), anti-pattern do pool global compartilhado.
- **edit** [`framework/03-producao/03-15-incident-response.md`](../03-producao/03-15-incident-response.md) §2.11, game day prático com toxiproxy — setup Docker, 5 cenários Logística runnable (Postgres latency, Redis down, payment provider partition, mobile bandwidth limit, TCP slow close), bash script game-day automation com abort condition em error rate > 5%, postmortem template pós-game-day.

### 2026-05-01, Review wave 5 — industrial depth (CDC/Patroni, real-time scaling, DORA, embedded Rust, hardware bring-up)

Quinta onda do audit cross-stage. Refinamentos cirúrgicos de profundidade industrial onde aluno Senior+ precisa de rigor operacional concreto.

- **edit** [`framework/02-plataforma/02-09-postgres-deep.md`](../02-plataforma/02-09-postgres-deep.md) §2.13.1, aplicação concreta de CDC pra Logística v2→v3 (Debezium + outbox table + Postgres publication + transação atômica + slot lag monitoring com SQL queries + alertas Prometheus). Patroni HA com synchronous standby names e PgBouncer. Cruza com 04-02 e 04-03.
- **edit** [`framework/02-plataforma/02-14-realtime.md`](../02-plataforma/02-14-realtime.md) §2.8, expansão real-time scaling com Soketi vs Centrifugo deep (matriz de modelo/protocolo/forte/limita), exemplo Soketi setup pra Logística, Centrifugo unique strengths (history buffer + presence + GRPC), sticky session cookie hash vs IP hash com pegadinha mobile carrier NAT, cardinality de canais (problema de 1M canais one-to-one), padrão Logística (tenant/courier/order channels), presence em escala.
- **edit** [`framework/03-producao/03-04-cicd.md`](../03-producao/03-04-cicd.md) §2.16, DORA metrics deep — definição operacional + fonte + cálculo de cada métrica, implementação prática em GitHub Actions + Postgres (workflow YAML + SQL query weekly), categorias DORA 2024 (Elite/High/Medium/Low) com thresholds, comparação de tools (LinearB, Sleuth, Faros, DIY Grafana), 3 anti-padrões (otimizar deploy freq isolado, lead-time errado, vanity metrics). Cruza com 03-15 e 04-12.
- **edit** [`framework/05-amplitude/05-07-embedded-iot.md`](../05-amplitude/05-07-embedded-iot.md) §2.12, embedded Rust em profundidade — HAL trait pattern com exemplo vendor-neutral, no_std vs std vs std-com-allocator, async runtimes (embassy + RTIC + Tock OS comparados), embassy Logística firmware example, defmt logging compactado, probe-rs debugger universal, decisão Rust vs C em 2026.
- **edit** [`framework/05-amplitude/05-08-hardware-design.md`](../05-amplitude/05-08-hardware-design.md) §4, bring-up day playbook — sequência de 6 etapas (pre-power inspection → power-up isolado → programming interface → periférico por periférico → connectivity stack → soak test) com tempo estimado e armadilhas; tabela de common failures com sintomas/causas/tempo médio até fix; skills críticos não-óbvios (datasheet completo, scope/logic analyzer, hot air rework). Calibração realista: 1-3 dias primeiro bring-up, 4-8 horas quando experiente.

### 2026-05-01, Review wave 4 — modern frontiers (edge, supply chain, AI ops, vector DBs, PWA)

Quarta onda do audit cross-stage. Foca em fronteiras modernas que faltavam profundidade adequada — temas onde o framework precisa estar em 2026, não em 2022.

- **edit** [`framework/03-producao/03-09-frontend-performance.md`](../03-producao/03-09-frontend-performance.md), nova §2.6.1 "Edge functions e edge rendering, deep" — players (Cloudflare Workers, Vercel Edge, Deno Deploy, Lambda@Edge) com matriz de runtime/limites/cold start/pricing, constraints reais (sem Node APIs, sem long-running connections, memory cap, CPU bilhado), padrão arquitetural pra Logística (edge auth + rate limit, origin pra DB pesado).
- **edit** [`framework/03-producao/03-08-applied-security.md`](../03-producao/03-08-applied-security.md) §2.14, supply chain reescrito do zero — 6 camadas de threat (CVEs, dependency confusion, typosquatting, compromised maintainer estilo xz-utils 2024, build system compromise SolarWinds, registry compromise), SLSA 1-4 com critérios, Sigstore stack (cosign + Fulcio + Rekor) com keyless OIDC, SBOM (CycloneDX + SPDX + syft) com exemplo, in-toto attestations, stack mínimo defensável 2026 em 9 itens.
- **edit** [`framework/03-producao/03-07-observability.md`](../03-producao/03-07-observability.md), nova §2.19 "AI Ops & LLM observability" — métricas únicas (per-call/per-conversation/per-eval/per-tool), failure modes únicos (hallucination, tool argument drift, cost spike, latency tail, quality drift silencioso), OpenTelemetry GenAI semantic conventions, comparação de 5 tools (LangSmith, Langfuse, Helicone, Phoenix, W&B/Weave), padrão de span hierárquico, eval automation offline+online com golden dataset, cost trap de tracing exhaustivo.
- **edit** [`framework/04-sistemas/04-10-ai-llm.md`](../04-sistemas/04-10-ai-llm.md) §2.8 (vector DBs), matriz comparativa expandida com 8 entradas (pgvector, Qdrant, Weaviate, Milvus, Pinecone, Chroma, LanceDB, Vespa) com modelo, indexes, hybrid search, filter perf, ops, quando usar. Heurística pragmática 2026 + anti-padrão "Pinecone porque é fácil".
- **edit** [`framework/02-plataforma/02-03-dom-web-apis.md`](../02-plataforma/02-03-dom-web-apis.md), nova §2.12 "Service Workers e PWA" deep — lifecycle (install/activate/fetch/message/push/sync), 5 caching strategies em matriz (cache-first, network-first, SWR, network-only, cache-only) com Workbox exemplo, Web Push (RFC 8030 + VAPID) com flow completo, Background Sync vs Periodic Sync, install prompt + Manifest mínimo, pegadinhas reais (versioning, update flow, scope, iOS limitações), quando NÃO usar PWA.

### 2026-05-01, Review wave 3 — operational meta docs + 05-07/05-08 integration

Terceira onda do audit cross-stage. Foca em meta docs operacionais que estavam ausentes (operação reativa do estudo) + clarificação de relação entre módulos opcionais.

- **add** [`framework/00-meta/TROUBLESHOOTING.md`](TROUBLESHOOTING.md), padrões reais de falha durante o estudo organizados em 7 categorias (portões repetidos, cadência insustentável, problemas de modo A/B/D, capstone scope creep, output público estagnado, mentees esgotando, recovery). Cada padrão tem sintoma + diagnóstico + ação concreta. Referência primária quando aluno trava.
- **add** [`framework/00-meta/PEER-REVIEW-PROTOCOL.md`](PEER-REVIEW-PROTOCOL.md), operacional concreto pro Modo B do MENTOR.md. Composição de cohort, 3 ritos semanais (standup async, sessão técnica síncrona, paper club mensal), procedimento detalhado pra conduzir e receber portões, padrão de feedback honesto sem destruir relação, calibração externa trimestral anti-eco-chamber, anti-patterns observados, quando dissolver cohort.
- **edit** [`framework/05-amplitude/05-07-embedded-iot.md`](../05-amplitude/05-07-embedded-iot.md) §4, header explícito sobre relação com 05-08: 05-07 cobre lado firmware, 05-08 cobre lado hardware do mesmo dispositivo. MCU e sensors devem ser consistentes.
- **edit** [`framework/05-amplitude/05-08-hardware-design.md`](../05-amplitude/05-08-hardware-design.md) §4, integração explícita com 05-07: PCB hospeda firmware do 05-07; bring-up valida ambos. Critério "use mesmo MCU/sensors" elimina retrabalho.
- **edit** [`framework/00-meta/INDEX.md`](INDEX.md), contagem de metas atualizada (17→19, considerando RUBRIC já adicionado em wave 1); links pra TROUBLESHOOTING e PEER-REVIEW-PROTOCOL adicionados na seção de "Outros documentos vivos".

### 2026-05-01, Review consolidado + ajustes de profundidade

Audit cross-stage retornou 12 ações prioritárias. Aplicado em 2 ondas neste ciclo:

**Onda 1 — estruturais e críticas:**
- **add** [`framework/00-meta/RUBRIC.md`](RUBRIC.md), critério explícito de pass/fail nos 3 portões com pesos por dimensão e exemplos. MENTOR.md §3 e INDEX.md atualizados pra apontar pra RUBRIC.
- **edit** [`framework/04-sistemas/04-02-messaging.md`](../04-sistemas/04-02-messaging.md) §2.12, Outbox encurtado pra "lado messaging"; ownership do padrão completo movido pra 04-03 §2.8.
- **edit** [`framework/01-fundamentos/01-04-data-structures.md`](../01-fundamentos/01-04-data-structures.md) §2.4, adicionados blocos "Hash function: cryptographic vs distribution" e "Consistent hashing (sharding distribuído)" — fecha gap pré-requisito de 04-09 e 02-11.
- **edit** [`framework/04-sistemas/04-14-formal-methods.md`](../04-sistemas/04-14-formal-methods.md) §2.9, Lean 4 reposicionado como "emergente, não-production-default"; PBT (fast-check, Hypothesis, PropEr) elevado como entrada saudável antes de TLA+.
- **edit** [`framework/01-fundamentos/01-14-cpu-microarchitecture.md`](../01-fundamentos/01-14-cpu-microarchitecture.md) §2.8, expandido com condições de auto-vectorization, AoS vs SoA com exemplo C, e custo invisível de AVX-512 frequency throttling.
- **edit** [`framework/04-sistemas/04-05-api-design.md`](../04-sistemas/04-05-api-design.md) §2.17, webhooks com Idempotency-Key obrigatório, replay defense via timestamp, ordering caveat, referência a AsyncAPI spec.
- **edit** [`framework/04-sistemas/04-08-services-monolith-serverless.md`](../04-sistemas/04-08-services-monolith-serverless.md), nova §2.19 Multi-tenancy (Pool/Bridge/Silo, RLS exemplo, noisy neighbor mitigations, game day Logística); §2.20 com critérios objetivos de extração.
- **protocol** MENTOR.md §3, ponteiro adicionado pra RUBRIC.md.

**Onda 2 — quantificação 2026 e rebalanceamentos:**
- **edit** [`framework/03-producao/03-03-kubernetes.md`](../03-producao/03-03-kubernetes.md) §2.15, Service Mesh expandido com matriz Istio/Linkerd/Cilium/Istio Ambient (overhead, decisão por número de services); §2.18.1 (Alternativas a K8s) movido pra README do estágio.
- **edit** [`framework/03-producao/README.md`](../03-producao/README.md), nova seção "Quando NOT usar K8s" com tabela completa de alternativas (ECS, Nomad, Fly.io, Cloud Run, Kamal), heurística por tamanho de time, e mito vs realidade. Apresentada antes do módulo 03-03 pra evitar K8s por default.
- **edit** [`framework/04-sistemas/04-09-scaling.md`](../04-sistemas/04-09-scaling.md) §2.13, observability cost quantificado (Datadog, CloudWatch, OTel self-hosted) com padrões obrigatórios (head/tail-based sampling, retention tiers); §2.14 com tabela de categorias de custo AWS típicas e ordem de ataque pra cortar conta; §2.16 com números reais de WebSocket connections per server (100k-500k tuning, 1M+ benchmarks Soketi/Centrifugo).
- **edit** [`framework/04-sistemas/04-10-ai-llm.md`](../04-sistemas/04-10-ai-llm.md) §2.14, self-hosted inference com espectro completo (Ollama → llama.cpp → vLLM → SGLang → managed open-weights), quantização GGUF, LoRA/QLoRA pricing; §2.16 com cálculo concreto de prompt caching savings (Sonnet 4.6 system prompt 5k tokens, 90% hit = $40k/mês de economia), model tiering, batch API; §2.17 com tabela TTFT/throughput, streaming UX, parallel tool calls.
- **ref** [`framework/00-meta/reading-list.md`](reading-list.md), anos de edição adicionados em livros canônicos (CS:APP 3rd 2015, CLRS 4th 2022, SICP JS 2022, Effective TS 2nd 2024, Serious Cryptography 2nd 2024); RFCs novos referenciados (RFC 9700 OAuth BCP 2025, WebAuthn L3 2024); AI Engineering (Chip Huyen 2024) substituiu "Building LLM Applications" como referência canônica; Postgres 16 Internals + DDIA 2nd ed beta sinalizados; MCP spec adicionado.

### 2026-04-28, Content gap fill: 24+ subseções novas em 16 módulos

Expansão de conteúdo cobrindo gaps detectados em audit interno. Tópicos atualizados pra 2025-2026 reality.

**Fundamentos (4 módulos):**
- 01-02: §2.4.1 schedulers modernos (CFS→EEVDF Linux 6.6+, Windows Thread Director, hybrid CPUs P/E cores).
- 01-03: §2.6.1 QUIC deep, UDP user-space, 0-RTT replay attack, connection migration, custos vs TCP.
- 01-11: §2.17 modelos de concorrência comparados, CSP/Go vs Actors/Erlang vs async-await/Rust com tabela e quando usar cada.
- 01-12: §2.15 reescrito, NIST PQ standards 2024 (FIPS 203/204/205), TLS hybrid X25519MLKEM768, "harvest now decrypt later".

**Plataforma (5 módulos):**
- 02-04: §2.7 React Compiler deep, modelo mental novo, rules of React, bail-out behavior, migrações práticas.
- 02-07: §2.17 Node vs Bun vs Deno comparação real 2026, tabela de decisão, pegadinhas, veredicto pragmático.
- 02-09: §2.13.1 logical replication uso real (CDC, zero-downtime upgrade, pegadinhas) + §2.14 Postgres 17/18 features.
- 02-13: §2.9 Passkeys/WebAuthn deep, synced vs device-bound vs roaming, server flow, pegadinhas, migration strategy.
- 02-14: §2.14 WebTransport deep, modelo, API client, quando vs WebSocket, server libs 2026.

**Professional (6 módulos):**
- 03-03: §2.18 operators pattern + §2.18.1 alternativas a K8s (ECS, Nomad, Fly, Railway, Cloud Run, Kamal) com heurística pragmática.
- 03-05: §2.3.1 VPC deep, TGW, PrivateLink, egress VPC, IPv6, custos esquecidos. + §2.19 FinOps + §2.20 Sustainability.
- 03-07: §2.16 eBPF observability deep, tools 2026 (Pixie, Tetragon, Parca, Cilium, Coroot, bpftrace, Beyla), quando vale.
- 03-08: §2.17.1 privacy engineering, tokenization, field encryption, RTBF real, differential privacy, k-anonymity, antipatterns.
- 03-10: §2.19 perf JVM/.NET/Go, JIT tiers, GCs, AOT, virtual threads, comparação cross-runtime.
- 03-15: §2.11 chaos engineering tooling deep, Litmus, Chaos Mesh, Gremlin, FIS, Pumba; tipos de injeção; maturity ladder.

**Senior (5 módulos):**
- 04-01: §2.18 CRDT deep, famílias (CvRDT/CmRDT/delta), Yjs/Automerge, limitações, quando usar.
- 04-02: §2.7 Pulsar/Redpanda/NATS JetStream deep com tabela de decisão.
- 04-05: §2.13 tRPC + Connect-RPC, comparação com gRPC clássico e REST, quando escolher.
- 04-13: §2.2.1 streaming SQL incremental, Materialize, RisingWave, vs Flink.
- 04-14: §2.7-2.9 reescritos, P language, Alloy, Lean 4 (mathlib4, Cedar) deep.

**Staff (3 módulos):**
- 05-04: §2.7.1 must-read papers list, 35 papers ordenados por estágio (Plataforma→Staff→Foundations→Data/ML).
- 05-05: §2.2.1 YouTube/podcast como medium, formatos, setup, cadência, quando NÃO usar.
- CAPSTONE-amplitude: Track G, AI Infrastructure Engineer (vLLM, training pipelines, vector DBs prod, evals, GPU cost).

**Cross-cutting:**
- STUDY-PROTOCOL §17: Quarterly Review template com cadência fixa, 3 perguntas brutais, sinais de burnout.
- SPRINT-NEXT entries SN-054 a SN-064 documentando gaps remanescentes (Anki decks, solution sketches, mock interviews, AI Infra track curriculum, etc.).

### 2026-04-28, Site público em apps/site/

- **add**: `apps/site/`, Next.js 16 + React 19 + Tailwind 4 + Framer Motion. Mesma stack/visual do `MyPersonalWebSite`.
- **add**: 12 rotas (`/`, `/stages`, `/stages/[stage]`, `/modules/[id]`, `/progress`, `/now`, `/index`, `/library`, `/glossary`, `/docs/[slug]`, `/about`, `/api/health`).
- **add**: `Dockerfile` multi-stage standalone + `railway.json` apontando pro app. Healthcheck em `/api/health`.
- **add**: `LICENSE` CC BY-NC 4.0.
- **add**: `scripts/validate-content.mjs`, pre-build validation hook (frontmatter + prereqs + links + line count). Flags `--strict`/`--quiet`/`--json`.
- **add**: DECISION-LOG DL-018 documentando decisão de monorepo (site dentro do `FATHOM`).
- **add**: SPRINT-NEXT entry SN-053 done.
- **edit**: site lê `framework/*.md` + raiz `.md` via `fs/promises`. Single source of truth: edição segue sendo `git commit` no Markdown.
- Features: CMD+K palette, mermaid render do DAG, library curada, glossary com search, prev/next nav, reading time, breadcrumbs, mobile menu, prefers-reduced-motion, OG images via next/og.

### 2026-04-28, Refactor: protocolo agnóstico de mentor + atribuição autoral única

- **remove**: `CLAUDE.md` raiz (versão dependente de ferramenta específica). Conteúdo migrado/generalizado em `MENTOR.md`.
- **edit**: `MENTOR.md` reescrito com 4 modos de mentor, A (self), B (peer/cohort), C (suplemento opcional de produtividade, sob restrições), D (hybrid recomendado). Sem nomear ferramentas específicas.
- **edit**: limpeza de referências a ferramentas/fornecedores de IA específicos em todo o repo (README.md, PROGRESS.md, STUDY-PROTOCOL.md, capstones, metas). Linguagem agnóstica ("o mentor", "você", voz passiva). Referências técnicas legítimas em 04-10 (módulo sobre LLM systems), elite-references e reading-list (recursos de estudo) preservadas.
- **edit**: `RELEASE-NOTES.md`, seção "Agradecimentos" substituída por "Autoria" (Nicolas De Nigris, único autor; síntese baseada em fontes canônicas).
- **add**: `DECISION-LOG.md` DL-017, atribuição autoral única; ferramentas usadas no processo são instrumento, não co-autor.
- **edit**: `DECISION-LOG.md` DL-005 reescrito como "Mentor flexível com modos self / peer / suplemento opcional"; entries que mencionavam ferramenta específica generalizadas.
- **edit**: `INDEX.md`, contagem de raiz ajustada pra 4 arquivos (README, MENTOR, PROGRESS, STUDY-PROTOCOL); CLAUDE.md removido das listas.
- **protocol**: protocolo de mentoria agora é agnóstico, disciplina e rigor independem da ferramenta usada.

### 2026-04-28, v1.0 SHIPPING

- **add**: `00-meta/RELEASE-NOTES.md`, marco de v1.0 shipping-ready. Documenta o que está pronto, limitações reconhecidas, como começar, filosofia.
- **add**: `00-meta/STUDY-PLANS.md`, 7 templates de plano por cenário (full-time, part-time, weekend, bootcamp grad, Senior→Staff, career switcher, executive).
- **edit**: SPRINT-NEXT.md, SN-007 fechado com audit results dos restantes módulos shallow. Decisão: aprofundamento adicional triggered por uso real, não preemptivamente.
- **status**: framework atinge versão **1.0**: base estável shipping-ready. Modificações futuras são incrementos sobre essa base.

### 2026-04-28, Sprint 1 batch 1: Depth Leveling em 6 módulos

- **edit**: 01-04 Data Structures, +10 subseções (B-Tree variants, persistent DS, cache-oblivious, skip list deep, HAMT, LSM-Tree, Bloom math, adjacency variants, Trie variants, Union-Find).
- **edit**: 01-15 Math Foundations, +8 subseções deep (linear algebra concrete, probability cases, info theory, graphs com complexity, numerical, LA code, optimization, probabilistic DS math).
- **edit**: 02-02 Accessibility, +4 subseções (WCAG 2.2 critérios, ARIA APG patterns, manual audit checklist, Brasil regional context).
- **edit**: 02-05 Next.js, +8 subseções (Server Components mental model, RSC payload, streaming deep, Server Actions revalidation/optimistic/transitions, Edge runtime, ISR cache invalidation, Turbopack vs Webpack, errors/instrumentation).
- **edit**: 04-05 API Design, +7 subseções (GraphQL Federation v2, gRPC streaming bidirectional, BFF, API gateway, Stripe versioning, RFC 7807, comparison side-by-side).
- **edit**: 04-04 Resilience Patterns, +9 subseções (hedging, adaptive concurrency, backpressure formal, token/leaky bucket math, circuit breaker state machine, bulkhead concrete, failover, chaos engineering, failure budget).
- **gap encerrado**: profundidade desigual no batch identificado em DL-014. Sprint 1 batch 1 entregou 1100+ linhas adicionais nos 6 módulos prioritários. SN-007 audit dos restantes pendente pra batch 2.
- Done log atualizada em SPRINT-NEXT.md.

### 2026-04-28, Sprint 0.5: Roadmap, Codebase Tours, Stack Comparisons

- **add**: `00-meta/SPRINT-NEXT.md`, backlog de aprofundamento priorizado (Sprints 1-6), com IDs SN-001 a SN-052.
- **add**: `00-meta/CODEBASE-TOURS.md`, 20 guided reading tours de repos canônicos (V8, Postgres, Redis, libuv, React, CockroachDB, K8s scheduler, Linux kernel, Kafka, TigerBeetle, Bevy ECS, Stripe SDK, TLA+ Examples, Tokio, Caddy/nginx, Excalidraw, SQLite, io_uring, Bun, Anthropic Cookbook).
- **add**: `00-meta/STACK-COMPARISONS.md`, mapeamento cross-stack (Node, Java, Python, Ruby, Go, .NET, PHP, Rust, Elixir) cobrindo backend frameworks, concurrency, auth, ORM, testing, observability, deploy, perf, real-time, frontend, mobile, AI/LLM. Reduz bias Node/Postgres do framework.
- **edit**: DECISION-LOG.md, DL-014 (profundidade desigual aceita), DL-015 (multi-stack via comparisons), DL-016 (codebase tours como complemento). Pending questions referenciadas a SPRINT-NEXT IDs.
- **edit**: MENTOR.md §7 + INDEX.md, referências às 3 metas novas adicionadas.
- **gap reconhecido**: depth leveling de 01-04, 01-15, 02-02, 02-05, 04-04, 04-05 ficou em SPRINT-NEXT Sprint 1 (SN-001 a SN-006); não executado neste batch.

### 2026-04-28, Foundation, Stage 5, Niche specialties, Meta consolidation

- **add**: Stage 5, Staff/Principal completo (05-01-05-07 + CAPSTONE-amplitude + README).
- **add**: 16 módulos novos cobrindo lacunas conceituais e domain breadth:
  - Fundamentos: 01-11 Concurrency Theory, 01-12 Cryptography Fundamentals, 01-13 Compilers & Interpreters, 01-14 CPU Microarchitecture, 01-15 Math Foundations.
  - Plataforma: 02-15 Search Engines & IR, 02-16 Graph Databases, 02-17 Native Mobile, 02-18 Payments & Billing, 02-19 i18n / l10n.
  - Professional: 03-13 Time-Series & Analytical DBs, 03-14 Graphics/Audio/Codecs, 03-15 Incident Response, 03-16 Estimation & Planning, 03-17 Accessibility Testing, 03-18 Cognitive Accessibility.
  - Senior: 04-13 Streaming & Batch, 04-14 Formal Methods (TLA+), 04-15 OSS Maintainership, 04-16 Product/Business/Unit Economics.
  - Staff specialties: 05-08 Hardware Design, 05-09 Bioinformatics & Scientific Computing, 05-10 Game Development Pipeline.
- **add**: meta files completos:
  - `00-meta/INDEX.md`, mapa global com DAG.
  - `00-meta/CAPSTONE-EVOLUTION.md`, Logística v0→v1→v2→v3→v4.
  - `00-meta/GLOSSARY.md`, termos técnicos canônicos.
  - `00-meta/MODULE-TEMPLATE.md`, template oficial.
  - `00-meta/SELF-ASSESSMENT.md`, questionário de calibração inicial.
  - `00-meta/CHANGELOG.md`, este arquivo.
  - `00-meta/INTERVIEW-PREP.md`, mapping módulos → entrevistas tier-1.
  - `00-meta/ANTIPATTERNS.md`, anti-patterns cross-cutting.
  - `00-meta/DECISION-LOG.md`, decisões de design do próprio framework.
- **add**: `README.md` raiz com overview, FAQ, próximos passos.
- **protocol**: STUDY-PROTOCOL.md §12-§16 adicionados, spaced re-test, paper reading, public capstone, cohort/peer, journal de descobertas.
- **edit**: PROGRESS.md, todas tabelas refletem módulos novos; novos logs (Spaced Re-Test Log, Paper Reading Log, Journal, Public Output Tracking, Mentorship Tracking) e seção Personal Stack.
- **edit**: MENTOR.md §7 atualizado com 5 estágios e contagens corretas; protocolos transversais documentados.
- **edit**: cada stage README com novos módulos e trilhas paralelas atualizadas.
- **ref**: `elite-references.md` expandido com repos novos por módulo (Crafting Interpreters, parking_lot, libsodium, perf, NumPy, Meilisearch, OpenSearch, pgvector, Memgraph, AGE, Stripe SDK/CLI, Swift evolution, Compose, FormatJS, i18next, Yjs, ClickHouse, TimescaleDB, DuckDB, deck.gl, ffmpeg, axe-core, Pa11y, Flink, Spark, dbt-core, Iceberg, etcd raft, TLA+ Examples, FastAPI, build-your-own-x, Excalidraw, Zephyr, ESP-IDF, embedded-hal). Indivíduos novos: Tanya Reilly, Patrick McKenzie, Dan Luu, Sara Soueidan, Adrian Roselli, Murat Demirbas, Chip Huyen, Lara Hogan, Gergely Orosz, Preshing.
- **ref**: `reading-list.md` expandido com livros canônicos por todos os módulos novos + papers foundational adicionados (PageRank, End-to-End Arguments, Tail at Scale, Architecture of a Database System, C-Store, Spanner, Byzantine Generals, FLP, AWS Formal Methods).
- **prereqs** explícitos por módulo novo (ver INDEX.md).

### 2026-04-28, Initial framework

- **add**: Foundation, MENTOR.md, PROGRESS.md, STUDY-PROTOCOL.md.
- **add**: `framework/00-meta/elite-references.md` e `reading-list.md` (versão inicial).
- **add**: Estágio 1: Fundamentos (01-01-01-10 + CAPSTONE-fundamentos + README).
- **add**: Estágio 2: Plataforma (02-01-02-14 + CAPSTONE-plataforma + README).
- **add**: Estágio 3: Produção (03-01-03-12 + CAPSTONE-producao + README).
- **add**: Estágio 4: Sistemas (04-01-04-12 + CAPSTONE-sistemas + README).

---

## Como manter

Sempre que tocar arquivo do framework:

1. Adicione 1 linha em formato `### YYYY-MM-DD, descrição curta`.
2. Lista bullets de mudanças com tipo prefix.
3. Não edite linhas antigas (append-only).
4. Para mudanças triviais (typo fix, link ajustado), agrupe em entry semanal/mensal.

Se quebrou contrato (renomeou módulo cited em outros, mudou prereqs, mudou semantic de portão), documente impact e migration:

```
### 2026-XX-XX, Renamed 01-02 → 01-02-os-internals
- **rename**: 01-02-operating-systems.md → 01-02-os-internals.md.
- **migration**: 12 cross-references em outros módulos atualizadas.
- **migration**: PROGRESS.md, INDEX.md, stage README atualizados.
```

Daqui a 1 ano, este arquivo é o único jeito de saber o que mudou e quando.
