---
capstone: apprentice
title: Logística v1, Full-Stack Monolith
stage: plataforma
prereqs: [02-01, 02-02, 02-03, 02-04, 02-05, 02-06, 02-07, 02-08, 02-09, 02-10, 02-11, 02-12, 02-13, 02-14, 02-15, 02-16, 02-17, 02-18, 02-19]
status: locked
gates:
  pratico: { status: pending, date: null, attempts: 0, notes: null }
---

# CAPSTONE Plataforma, Logística v1

## 1. Por que esse capstone existe

Ao final do Plataforma, você passou por 14 módulos com desafios isolados. Cada um arranhou um pedaço da Logística (web, mobile, backend, DB, cache, auth, real-time). O capstone **junta tudo num produto coerente**: multi-tenant real, deployável em Railway, usado por três personas (lojista, courier, cliente). É a primeira vez que você ship um sistema fim-a-fim.

Isso força você a integrar:
- **02-01-02-05**: front-end web acessível, performante, em Next.
- **02-06**: app mobile pro courier.
- **02-07-02-08**: backend Node estruturado.
- **02-09-02-10**: schema relacional + ORM disciplinado.
- **02-11**: Redis pra cache, rate limit, idempotency, fan-out real-time.
- **02-12**: opcional, Mongo pra eventos heterogêneos. Documente decisão de incluir ou não.
- **02-13**: auth completa, MFA, RBAC, multi-tenant.
- **02-14**: tracking real-time courier ↔ lojista ↔ cliente.
- **02-15**: search engine pra orders/couriers — Postgres FTS no v1, plant pra Meilisearch/Typesense em v2 se justificar.
- **02-16**: opcional v1; modelagem de "couriers ↔ regions ↔ orders" em property graph se aparecer query "find couriers within 3 hops of dispatch hub" (Postgres recursive CTE como first attempt).
- **02-17**: app courier pode ser RN (02-06) OU nativo iOS/Android (02-17) — decisão documentada com trade-offs (custo time, performance GPS realtime, ARKit indoor warehouse).
- **02-18**: cobrança lojista (Stripe Connect Standard ou Mercado Pago) com tax docs Brasil (NFS-e por município).
- **02-19**: PT-BR primary, EN-US plant pra v3; usar ICU MessageFormat desde início (não string concat).

Não é demo. É um sistema com fluxos reais, persistência durável, e operação manualmente correta.

Versões posteriores (v2 no Professional, v3 no Senior) **evoluem o mesmo projeto**: não recomeçar. Por isso decisões aqui têm consequência.

---

## 2. Domínio

Sistema de **roteamento de entregas multi-tenant**. Lojistas (pequenos comerciantes) cadastram pedidos com endereço; couriers aceitam, retiram e entregam; clientes acompanham.

### Personas

- **Lojista**: cria pedidos, atribui ou deixa para couriers livres pegarem, acompanha em dashboard, fecha caixa do dia.
- **Courier**: app mobile, vê pedidos disponíveis ou atribuídos, atualiza status (pickup, en route, delivered), envia GPS streaming durante a viagem.
- **Cliente**: link público (sem cadastro) pra acompanhar status do pedido em tempo real.

### Tenant model

Cada lojista é um tenant. Couriers podem operar em N tenants (com onboarding por tenant). Clientes não são contas, são sujeitos de pedido (telefone, email, endereço).

### Fluxos críticos

1. **Cadastro de lojista**: signup → email verification → cria tenant → onboarding básico.
2. **Criação de pedido**: lojista cria → publica em pool → notifica couriers próximos via WS.
3. **Aceite**: courier aceita → outros não veem mais → status muda.
4. **Pickup → en route**: courier confirma retirada → começa stream GPS.
5. **Entrega**: courier marca delivered → notifica cliente e lojista.
6. **Tracking público**: cliente abre link `/track/<token>` → SSE com status + posição.
7. **Fechamento de dia**: lojista vê resumo + relatório CSV.

---

## 3. Especificação técnica

### 3.1 Stack obrigatória

- **Front (lojista + cliente)**: Next.js 15+ App Router, TypeScript strict, Tailwind, acessível (02-01-02-05).
- **App (courier)**: Expo + Expo Router, Reanimated, FlashList, MMKV, SecureStore (02-06).
- **Backend**: Fastify + TypeScript + Drizzle + Postgres + Redis. Hono adicional opcional pra edge functions específicas (02-07-02-11).
- **Auth**: própria, sem Auth0/Clerk. Senhas Argon2id, MFA TOTP, passkeys, OIDC Google. RBAC com tenant isolation (02-13).
- **Real-time**: WebSocket (notifications, courier upload), SSE (tracking público), Redis pub/sub fan-out entre N instâncias (02-14).
- **Deploy**: Railway. App + DB + Redis no mesmo projeto.

### 3.2 Schema (mínimo)

Reusar/expandir do 02-09:
- `tenants`, `users`, `user_roles`, `tenant_users`.
- `orders`, `order_events`, `order_assignments`.
- `couriers` (perfil), `courier_locations` (efêmero, principalmente Redis).
- `auth_sessions`, `auth_passkeys`, `auth_audit`, `mfa_secrets`.
- `outbox_events` (pra próximo capstone, opcional aqui mas plante).

Migrations em Drizzle Kit, todas testadas em CI (mesmo que CI seja modesto aqui).

### 3.3 Endpoints (REST + WebSocket + SSE)

Lista mínima:
- `POST /auth/signup`, `/login`, `/logout`, `/oauth/google/callback`, `/passkey/*`, `/mfa/*`.
- `POST /tenants`, `GET /tenants/me`.
- `GET/POST /orders`, `GET /orders/:id`, `POST /orders/:id/events`, `POST /orders/:id/assign`, `POST /orders/:id/accept`.
- `GET /orders/export.csv`.
- `GET /track/:publicToken` (SSE público).
- `WS /ws/courier` (upload GPS, recebe assignments).
- `WS /ws/lojista` (notifications).
- `GET /healthz`, `/metrics`.

Não defina tudo aqui. Defina contratos claros antes de implementar, OpenAPI auto-gerado em `/docs`.

### 3.4 Front lojista (Next)

- Login.
- Dashboard: pedidos de hoje (status, total), couriers ativos no mapa.
- Pedidos: lista filtrada, criação, detalhe.
- Tracking real-time embedded (SSE) no detalhe.
- Configurações: equipe, integração webhook, fechamento.

Lighthouse mobile ≥ 90. Web Vitals decentes. Acessível com keyboard, screen-reader-friendly nos fluxos críticos.

### 3.5 Front cliente (rota pública Next)

- `/track/:token`, minimalista. Status atual, ETA estimada, posição em mapa, contato do courier.
- Sem login. Sem coletar mais dados que o necessário.

### 3.6 App courier (Expo)

- Login com email/senha + opcional passkey.
- Lista de pedidos disponíveis e atribuídos.
- Aceitar pedido.
- Pickup → en route → delivered (com proof of delivery: foto/assinatura mock).
- GPS streaming durante en route via WebSocket. Em background, app fica suspenso → ao voltar pra foreground sincroniza buffer (vimos em 02-06 stretch).
- Push notification quando lojista atribui pedido (mock; não precisa publicar).

### 3.7 Operação

- Logging estruturado (`pino`) com `requestId` (AsyncLocalStorage), `tenantId`, `userId`.
- `/metrics` Prometheus-style.
- Graceful shutdown.
- Rate limit, idempotency keys, audit log de auth.
- Variáveis de env via `.env` + validação Zod no startup.

### 3.8 Deploy

- **Railway**: 1 projeto.
  - Postgres plug-in.
  - Redis plug-in.
  - Backend (Fastify) como serviço.
  - Front lojista (Next) como serviço (ou Vercel).
  - Domínios próprios opcionais; subdomain Railway é ok.
- App courier roda em device pessoal via Expo Go (não publicar nas stores).
- README explica setup completo: `git clone`, `pnpm install`, `pnpm dev` por workspace.

### 3.9 Testes (mínimo viável; aprofundar em 03-01)

- Unit em lógica pura (price calculation, assignment matching).
- Integration tests pelo menos em 3 endpoints críticos (criar pedido, aceitar, atualizar status) contra Postgres real (Docker Compose).
- Smoke E2E manual documentado.

03-01 vai forçar coverage real. Aqui, plante a estrutura.

---

## 4. Threshold

Você só passa se:

- O sistema funciona fim-a-fim em Railway, com URL pública.
- 3 personas conseguem completar o fluxo principal sem instrução.
- Multi-tenant: 2 tenants criados isoladamente, cross-tenant leak demonstradamente bloqueado.
- Tracking público SSE atualiza em tempo real (delay ≤ 2s) com courier real (você simula GPS).
- Documentação inclui:
  - Diagrama de arquitetura (componentes, network, flows).
  - ER diagram do schema.
  - Diagrama de auth (signup, login, passkey, OIDC).
  - Diagrama do flow real-time (courier → Redis → fan-out → SSE/WS).
  - 3 trade-offs registrados (decisões deliberadas, alternativas consideradas, motivo).
  - 3 problemas que apareceram em integração que não estavam nos módulos individuais.
- Você passa por code review (gate prático): consegue justificar cada arquivo, cada decisão de schema, cada middleware.

Sem o threshold, fica em pendência. **v2 (Professional) não começa enquanto v1 não está vivo.**

---

## 5. Anti-padrões a evitar

- "Vou usar uma biblioteca pronta de auth", não. Você passou por 02-13 pra implementar.
- "Vou usar Socket.io porque é mais fácil", só se justificar tecnicamente vs WS bruto.
- "Vou pular SSE e usar WS pra tudo", não, decida por canal.
- "Vou deixar tracking pro v2", não. Tracking é flagship do v1.
- "Vou usar Tailwind UI / shadcn cego", pode usar, mas saiba o que está colando. Sem componentes inacessíveis.
- "Multi-tenant via subdomain dinâmico só no v2", você decide; mas se escolher path/header, deixe claro e consistente.
- "Vou subir DB e Redis na mesma máquina sem TLS", Railway gerencia; não toque em segredo em código.

---

## 6. Stretch (opcional, mas valorizado)

- **Mongo pra eventos externos** (02-12 use case): receba webhooks de PagSeguro/Mercado Pago/SendGrid, persista em Mongo, processe com worker.
- **PWA do front cliente**: instalável, offline-aware mínimo.
- **Background sync** no app courier: pedidos cacheados, sync ao voltar online.
- **Heatmap de pedidos** com PostGIS extension.
- **Dashboard public** (anonimizado) com métricas básicas: número de tenants, pedidos/dia.
- **i18n**: PT-BR + EN.
- **Dark mode** consistente cross-app.

---

## 7. Critério de finalização

Quando você abre o app, cria pedido, abre tracking público em outra aba (ou em telefone amigo), liga app courier, aceita, anda com GPS streaming → e tudo flui sem você tocar em nada, está vivo.

Tire 1 print de cada flow rodando. Anote em `journal.md` o que apareceu de problema (não pra `PROGRESS.md` do framework, pro repo do projeto). Esse journal vira fonte de revisão pro v2.

Após o capstone passar, atualize `PROGRESS.md` deste framework e o frontmatter.
