# Estágio 2 — Apprentice (Aplicações)

## Por que esse estágio existe

Com fundamentos sólidos do Novice, agora você aprende a **construir aplicações**. Mas não como tutoriais ensinam. Aqui você vai entender:

- React **por dentro** (Fiber, reconciliação) — não só "como usar hooks"
- Next.js **caching layers** — não só "como criar uma rota"
- Postgres **storage e MVCC** — não só "como escrever SELECT"
- Redis **estruturas internas** — não só "como cachear"
- Auth **OAuth2/JWT corretamente** — não só "copiei do tutorial e funcionou"

O Apprentice é onde você consegue construir **um produto real do zero**, do frontend ao banco, com decisões técnicas justificáveis.

**Promessa de saída do Apprentice:** você consegue construir e operar uma aplicação full-stack monolítica em produção, defendendo cada escolha técnica em entrevista de Pleno.

---

## Ordem dos módulos (dependências)

| Ordem | ID | Módulo | Prereqs |
|-------|----|--------|---------|
| 1 | [A01](A01-html-css-tailwind.md) | HTML/CSS/Tailwind | — (Novice completo) |
| 2 | [A02](A02-accessibility.md) | Acessibilidade | A01 |
| 3 | [A03](A03-dom-web-apis.md) | DOM & Web APIs | A01 |
| 4 | [A04](A04-react-deep.md) | React Profundo | A03, N07 |
| 5 | [A05](A05-nextjs.md) | Next.js | A04 |
| 6 | [A06](A06-react-native.md) | React Native | A04 |
| 7 | [A07](A07-nodejs-internals.md) | Node.js Internals | N02, N07 |
| 8 | [A08](A08-backend-frameworks.md) | Backend Frameworks (Express/Fastify/Hono) | A07 |
| 9 | [A09](A09-postgres-deep.md) | Postgres Profundo | N04 (B-Tree), N02 (storage) |
| 10 | [A10](A10-orms.md) | ORMs (Prisma/Drizzle) | A09 |
| 11 | [A11](A11-redis.md) | Redis | A09 (pra comparar) |
| 12 | [A12](A12-mongodb.md) | MongoDB | A09 |
| 13 | [A13](A13-auth.md) | Auth (Sessions/JWT/OAuth2) | A08, N03 (TLS), N12 (crypto) |
| 14 | [A14](A14-realtime.md) | Real-time | A07, A08, N03 |
| 15 | [A15](A15-search-engines.md) | Search Engines & Information Retrieval | A09 |
| 16 | [A16](A16-graph-databases.md) | Graph Databases | N04, A09 |
| 17 | [A17](A17-native-mobile.md) | Native Mobile (iOS Swift / Android Kotlin) | A06 |
| 18 | [A18](A18-payments-billing.md) | Payments & Billing (Stripe-level) | A13 |
| 19 | [A19](A19-internationalization.md) | i18n / l10n (Unicode, ICU, RTL, timezones) | A01, A02 |

**Trilhas paralelas possíveis:**
- Frontend: A01 → A02 → A03 → A04 → A05 → A06 → A17 → A19
- Backend: A07 → A08 → A13 → A14 → A18
- Dados: A09 → A10 → A11 → A12 → A15 → A16

A divisão acima é razoável pra alternar contexto e não saturar uma área só. **A15-A19** estendem cobertura pra search, graph, mobile native, payments e internacionalização — cada uma cobre lacuna que o framework original deixava. **A19** especialmente é tipicamente "after-thought" caro; fazer cedo evita rewrite no Apprentice tarde.

---

## Capstone do Apprentice

[CAPSTONE-apprentice.md](CAPSTONE-apprentice.md) — **Logística v1**: sistema full-stack monolítico de roteamento de entregas.

Stack alvo: Next.js (App Router) + Postgres + Redis + Auth OAuth2 + WebSocket pra tracking real-time + multi-tenant (lojistas, entregadores, clientes), deploy no Railway.

**Threshold mínimo:**
- Auth funcional com Google/GitHub
- CRUD de pedidos com validação Zod
- Mapa em tempo real (Leaflet/Mapbox + WebSocket)
- Multi-tenant com row-level security no Postgres
- Cache de geocoding em Redis
- E2E test do fluxo crítico (criar pedido → atribuir entregador → tracking → entrega)
- Deploy live em Railway acessível por URL pública

Esse capstone vira a base que **evolui** nos próximos estágios — não jogue fora.

---

## Postura recomendada para este estágio

- **Resista à tentação de pular o "porquê"**: você pode usar React sem entender Fiber, mas vai pagar caro depois. Insista nos detalhes internos.
- **Implemente versões mini de coisas centrais**: mini-React, mini-Express, mini-LRU. É o jeito mais rápido de absorver.
- **Use Postgres CLI (`psql`) cru desde o início.** Pular pro ORM antes de dominar SQL é o erro mais comum de Pleno. Saiba fazer `EXPLAIN ANALYZE` antes de saber configurar Prisma.
- **Auth: leia os RFCs.** Não confie em tutoriais.
- **No Apprentice já comece a contribuir em um repo open-source.** Bug fix simples num projeto popular ensina muito sobre como código de produção é escrito.

---

## Não pule este estágio

Se você acha que "já sabe React e Postgres", faça os portões mesmo assim. **Apostando 80%** que você vai falhar em pelo menos 2 deles — e essa é a evidência de que você não dominava de fato.
