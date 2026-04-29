# Estágio 2: Plataforma (Aplicações)

## Por que esse estágio existe

Com fundamentos sólidos do Fundamentos, agora você aprende a **construir aplicações**. Mas não como tutoriais ensinam. Aqui você vai entender:

- React **por dentro** (Fiber, reconciliação), não só "como usar hooks"
- Next.js **caching layers**: não só "como criar uma rota"
- Postgres **storage e MVCC**: não só "como escrever SELECT"
- Redis **estruturas internas**: não só "como cachear"
- Auth **OAuth2/JWT corretamente**: não só "copiei do tutorial e funcionou"

O Plataforma é onde você consegue construir **um produto real do zero**, do frontend ao banco, com decisões técnicas justificáveis.

**Promessa de saída do Plataforma:** você consegue construir e operar uma aplicação full-stack monolítica em produção, defendendo cada escolha técnica em entrevista de Pleno.

---

## Ordem dos módulos (dependências)

| Ordem | ID | Módulo | Prereqs |
|-------|----|--------|---------|
| 1 | [02-01](02-01-html-css-tailwind.md) | HTML/CSS/Tailwind |, (estágio 1 completo) |
| 2 | [02-02](02-02-accessibility.md) | Acessibilidade | 02-01 |
| 3 | [02-03](02-03-dom-web-apis.md) | DOM & Web APIs | 02-01 |
| 4 | [02-04](02-04-react-deep.md) | React Profundo | 02-03, 01-07 |
| 5 | [02-05](02-05-nextjs.md) | Next.js | 02-04 |
| 6 | [02-06](02-06-react-native.md) | React Native | 02-04 |
| 7 | [02-07](02-07-nodejs-internals.md) | Node.js Internals | 01-02, 01-07 |
| 8 | [02-08](02-08-backend-frameworks.md) | Backend Frameworks (Express/Fastify/Hono) | 02-07 |
| 9 | [02-09](02-09-postgres-deep.md) | Postgres Profundo | 01-04 (B-Tree), 01-02 (storage) |
| 10 | [02-10](02-10-orms.md) | ORMs (Prisma/Drizzle) | 02-09 |
| 11 | [02-11](02-11-redis.md) | Redis | 02-09 (pra comparar) |
| 12 | [02-12](02-12-mongodb.md) | MongoDB | 02-09 |
| 13 | [02-13](02-13-auth.md) | Auth (Sessions/JWT/OAuth2) | 02-08, 01-03 (TLS), 01-12 (crypto) |
| 14 | [02-14](02-14-realtime.md) | Real-time | 02-07, 02-08, 01-03 |
| 15 | [02-15](02-15-search-engines.md) | Search Engines & Information Retrieval | 02-09 |
| 16 | [02-16](02-16-graph-databases.md) | Graph Databases | 01-04, 02-09 |
| 17 | [02-17](02-17-native-mobile.md) | Native Mobile (iOS Swift / Android Kotlin) | 02-06 |
| 18 | [02-18](02-18-payments-billing.md) | Payments & Billing (Stripe-level) | 02-13 |
| 19 | [02-19](02-19-internationalization.md) | i18n / l10n (Unicode, ICU, RTL, timezones) | 02-01, 02-02 |

**Trilhas paralelas possíveis:**
- Frontend: 02-01 → 02-02 → 02-03 → 02-04 → 02-05 → 02-06 → 02-17 → 02-19
- Backend: 02-07 → 02-08 → 02-13 → 02-14 → 02-18
- Dados: 02-09 → 02-10 → 02-11 → 02-12 → 02-15 → 02-16

A divisão acima é razoável pra alternar contexto e não saturar uma área só. **02-15-02-19** estendem cobertura pra search, graph, mobile native, payments e internacionalização, cada uma cobre lacuna que o framework original deixava. **02-19** especialmente é tipicamente "after-thought" caro; fazer cedo evita rewrite no Plataforma tarde.

---

## Capstone do estágio 2

[CAPSTONE-plataforma.md](CAPSTONE-plataforma.md), **Logística v1**: sistema full-stack monolítico de roteamento de entregas.

Stack alvo: Next.js (App Router) + Postgres + Redis + Auth OAuth2 + WebSocket pra tracking real-time + multi-tenant (lojistas, entregadores, clientes), deploy no Railway.

**Threshold mínimo:**
- Auth funcional com Google/GitHub
- CRUD de pedidos com validação Zod
- Mapa em tempo real (Leaflet/Mapbox + WebSocket)
- Multi-tenant com row-level security no Postgres
- Cache de geocoding em Redis
- E2E test do fluxo crítico (criar pedido → atribuir entregador → tracking → entrega)
- Deploy live em Railway acessível por URL pública

Esse capstone vira a base que **evolui** nos próximos estágios, não jogue fora.

---

## Postura recomendada para este estágio

- **Resista à tentação de pular o "porquê"**: você pode usar React sem entender Fiber, mas vai pagar caro depois. Insista nos detalhes internos.
- **Implemente versões mini de coisas centrais**: mini-React, mini-Express, mini-LRU. É o jeito mais rápido de absorver.
- **Use Postgres CLI (`psql`) cru desde o início.** Pular pro ORM antes de dominar SQL é o erro mais comum de Pleno. Saiba fazer `EXPLAIN ANALYZE` antes de saber configurar Prisma.
- **Auth: leia os RFCs.** Não confie em tutoriais.
- **No Plataforma já comece a contribuir em um repo open-source.** Bug fix simples num projeto popular ensina muito sobre como código de produção é escrito.

---

## Não pule este estágio

Se você acha que "já sabe React e Postgres", faça os portões mesmo assim. **Apostando 80%** que você vai falhar em pelo menos 2 deles, e essa é a evidência de que você não dominava de fato.
