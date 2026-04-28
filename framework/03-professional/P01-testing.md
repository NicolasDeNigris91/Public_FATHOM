---
module: P01
title: Testing — Unit, Integration, E2E, Mutation, Property-Based, Load
stage: professional
prereqs: [A08, A09]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# P01 — Testing

## 1. Problema de Engenharia

Maioria dos projetos tem testes mas não tem **strategy**. Coverage 80% que cobre só o que era fácil testar; testes acoplados a implementação que quebram a cada refactor; mocks pesados que validam que o mock obedece ao mock; suite que demora 20min e é skipada em CI; ausência de testes em fluxos críticos (auth, pagamento) sob argumento de "muito complicado". Tudo isso é norma, não exceção.

Este módulo é testing como disciplina. Pirâmide e troféu, unit vs integration vs E2E reais, testes de domínio independentes de framework, integration tests com DB real (não mock), E2E com Playwright/Detox, mutation testing pra detectar testes inúteis, property-based pra invariants, load tests pra performance. Você sai sabendo desenhar uma test strategy honesta.

---

## 2. Teoria Hard

### 2.1 Pirâmide vs Troféu

**Pirâmide clássica** (Mike Cohn): muitos unit, médios integration, poucos E2E. Argumento: rápido, isolado.

**Trophy/Diamond** (Kent C. Dodds): poucos unit, muitos integration, alguns E2E, ferramentas estáticas (TS, ESLint) na base. Argumento: integration test prova que partes coordenam, é onde bugs reais moram.

Verdade: não é teorema, é heurística por contexto. Front-end React com hooks puros, integration domina (testando comportamento). Backend de cálculo financeiro complexo, unit ainda dominante (lógica isolada). E2E é caro mas captura regressões críticas — mantenha pequeno e estável.

### 2.2 Tipos de teste

- **Static**: TS, ESLint, schema validation. Detecta erros antes de rodar.
- **Unit**: testa unidade isolada. Funções puras, classes sem deps externas.
- **Component**: front, testa render + interaction (React Testing Library).
- **Integration**: combina componentes/módulos. Backend: rota + handler + DB. Front: várias telas, store real.
- **Contract / API**: contratos entre serviços (Pact, schema OpenAPI).
- **E2E**: usuário simulado clicando UI real.
- **Mutation**: muta código de produção, vê se testes falham.
- **Property-based**: gera inputs random validando invariants.
- **Load / Performance**: comportamento sob carga.
- **Chaos / Fault Injection**: degrada componente, observa resiliência.
- **Security**: SAST, DAST, dep scanning, fuzzing.

### 2.3 Test runner

- **Vitest** — fast, ESM-first, compatível com Jest API. Padrão moderno em projetos TS.
- **Jest** — clássico, ainda dominante. Slow startup mas estável.
- **Node Test Runner** (`node:test` built-in) — leve, sem deps, suficiente pra muitos backends.
- **Bun test** — built-in, rápido em Bun.
- **Mocha** — clássico, flexível, requer setup.

Em 2026, Vitest pra projetos novos com Vite/Next; node:test pra backends puros.

### 2.4 Test doubles

- **Dummy**: passa como argumento, não usa.
- **Stub**: retorna respostas fixas.
- **Spy**: registra chamadas sem mudar comportamento.
- **Mock**: pré-programado, com expectations.
- **Fake**: implementação simplificada (in-memory DB).

Regra: **não mocke o que você possui** (seu próprio código). Use real. Mocke fronteiras (HTTP externo, file system imprevisível).

Mock excessivo = teste valida o mock, não o sistema.

### 2.5 Integration tests com DB real

Anti-padrão: mockar Prisma/Drizzle. Você prova que o mock se comporta como você imagina, não que o DB se comporta.

Padrão correto:
- **Testcontainers**: spin up Postgres em container só pra teste.
- Aplicar migrations.
- Cada teste em **transação** que dá rollback no teardown — rápido.
- Ou: schema/database por test worker — mais lento, melhor isolamento.
- Para Mongo/Redis: container similar.

Vale o overhead. Bug de migration, tipo coluna, constraint, race condition — tudo aparece aqui.

### 2.6 React Testing Library

Princípio Kent C. Dodds: "the more your tests resemble the way your software is used, the more confidence they can give you."

Queries por preferência:
1. `getByRole` (acessível, semântico).
2. `getByLabelText`, `getByPlaceholderText`.
3. `getByText`.
4. `getByTestId` — último recurso.

Anti-padrões:
- `enzyme.shallow()` — testa implementação. Deprecated.
- `wrapper.state()` — coupling à internals.
- `act()` em todo lugar — sintoma de configuração ruim. RTL trata.
- Snapshots pra UI inteira — frágeis. Snapshots úteis em outputs determinísticos (ASTs, schemas).

Hooks: `renderHook` da @testing-library/react.

### 2.7 E2E web — Playwright e Cypress

- **Playwright** (Microsoft) — multi-browser (Chromium, Firefox, WebKit), execução paralela, melhor traçabilidade. Padrão atual.
- **Cypress** — único navegador por run (até v12), DX excelente, time travel debug. Ainda comum.

Padrões E2E:
- **Page Object Model**: encapsula seletores e ações por tela.
- **Data-test attributes** (`data-testid`) explícitos pra estabilidade.
- **Não use sleeps fixos** — espere por estado (`expect(locator).toBeVisible()`).
- **Test user provisioning**: API direto pra criar user/state, não login pela UI.
- **Isolation**: cada teste limpa após si ou usa dataset descartável.

E2E é frágil por natureza. Mantenha pequeno, focado em fluxos críticos. Não substitui integration test.

### 2.8 E2E mobile — Detox e Maestro

- **Detox** (Wix): grey-box, integra com app build (Native APIs). Mais rápido, mais setup.
- **Maestro** (mobile.dev): black-box, declarativo (YAML), simples. Crescendo rápido.

Em 2026, Maestro virou default por DX. Detox ainda em uso em apps complexos.

### 2.9 Mutation testing

Stryker (`@stryker-mutator/core`) muda seu código (mutations: trocar `+` por `-`, removendo `if`, etc.) e roda testes. Se testes ainda passam, eles são fracos — não pegam essa regressão.

Coverage = quantas linhas executam. Mutation score = quantas regressões os testes capturariam.

Custo: roda suite N x mutations vezes. Use em CI nightly ou pré-release, não em cada PR.

### 2.10 Property-based testing

- **fast-check** (TS/JS), **Hypothesis** (Python), **proptest** (Rust).

Em vez de "input X → output Y", você descreve **propriedade**:
- Reverter lista 2x = original.
- Roundtrip serialize/deserialize = identidade.
- Soma comutativa.

Lib gera centenas de inputs random, busca contra-exemplos, e shrinks até o caso mínimo que falha.

Casos clássicos: parsers, encoders, algoritmos.

### 2.11 Snapshot testing

`expect(x).toMatchSnapshot()` salva output em arquivo. Próximo run compara.

Quando vale: outputs estruturados estáveis (AST, schema gerado, JSON config). Frágil pra UI HTML — branca em qualquer mudança.

Snapshots são úteis mas reviewers tendem a aprovar updates sem ler. Disciplina importa.

### 2.12 Test data

- **Factories** (`@faker-js/faker`, `fishery`): criam objetos com defaults e overrides.
- **Fixtures**: dados estáticos JSON.
- **Builders**: pattern OO pra construir test data.

Anti-padrão: data acoplado entre testes; um teste muda data e quebra outro.

### 2.13 Coverage

Métrica: linhas/branches/funções/statements cobertas.

Limites:
- Coverage alto não garante quality. Teste pode tocar linha sem assertar nada útil.
- Coverage baixo em arquivo crítico é bandeira vermelha.
- Coverage baixo em código de glue (CLI parser, config bootstrap) ok.

Use coverage como sinal, não como gate cego. CI pode gate em "não diminuir" em vez de "≥ 80%".

### 2.14 Load testing

- **k6** (Grafana) — JS/TS scripts, executor variations (constant load, ramp-up, soak). Padrão atual.
- **Gatling** — Scala/Java, throughput excelente.
- **autocannon** — Node, simples, ótimo pra benchmark local.
- **Locust** — Python.
- **Artillery** — JS/YAML, mais leve que k6.

Testar:
- **Smoke**: 1-2 VUs, baseline.
- **Average load**: throughput esperado.
- **Stress**: além do esperado, ver onde quebra.
- **Spike**: pulo súbito.
- **Soak**: load constante por horas, descobre memory leaks.

Capture: latência (p50/p95/p99), throughput, error rate, recursos (CPU, mem, DB connections).

### 2.15 Contract testing

Microservices: serviço A consome API de B. Mudança em B sem update em A → bug em prod.

**Pact**: A define contrato esperado, executa contra mock derivado, sobe o contrato pra "broker"; B verifica que cumpre. Ambos lados testam contra mesmo contrato.

Alternativa: schemas compartilhados (OpenAPI, Protobuf) com validação em ambos lados.

### 2.16 Chaos engineering

Fault injection deliberado em produção (ou staging realista):
- Mata pods/containers (Chaos Monkey).
- Latency spikes (Toxiproxy).
- Network partitions.
- Disk full.

Objetivo: provar que sistema sobrevive. Em projetos novos é exagero; em sistemas distribuídos sérios (S04), é prática.

### 2.17 Test pyramid pro produto certo

Heurística pra Logística v2:
- **Domain (cálculo de roteamento, valor de frete, regras de negócio)**: muitos unit, property-based em invariants.
- **API endpoints**: integration tests contra Postgres + Redis reais.
- **Front lojista**: component tests com RTL; alguns E2E em fluxos críticos (login, criar pedido, ver tracking).
- **App courier**: smoke E2E com Maestro (1-2 fluxos), unit em lógica.
- **Real-time / fan-out**: integration test com Redis real e múltiplos WS clients.
- **Auth**: integration tests altos, security tests (OWASP zaproxy ou similar).

### 2.18 CI integration

- Roda testes em PR antes de merge.
- Paraleliza por suíte.
- Cache de deps.
- Reports HTML / JUnit XML.
- Coverage upload pra Codecov / Coveralls.
- Mutation testing em nightly.
- Load tests em pre-release contra staging.

P04 (CI/CD) cobre infraestrutura. Aqui foco é **o que rodar, não como agendar**.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Justificar pirâmide vs troféu pra contextos diferentes.
- Distinguir 5 tipos de test double e quando cada vence.
- Argumentar por que mockar DB próprio é antipadrão e o que fazer.
- Listar padrões pra E2E estável (POM, data-testid, esperas, isolamento).
- Explicar mutation testing e por que coverage não basta.
- Dar 3 propriedades testáveis (property-based) em código real.
- Distinguir smoke, average, stress, spike, soak em load test.
- Diferenciar Pact e schemas compartilhados.
- Estratégia de testes pra função de cálculo de frete + endpoint que a usa.
- Argumentar quando snapshot test vale e quando é só decoração.

---

## 4. Desafio de Engenharia

Levar **Logística v1** a uma test suite real e disciplinada.

### Especificação

1. **Stack**:
   - Vitest no backend e front Next.
   - Maestro no app courier.
   - Playwright pra E2E web.
   - fast-check pra property-based.
   - Stryker pra mutation testing.
   - k6 pra load.
2. **Domain unit**:
   - Identifique 4 funções puras críticas no backend (cálculo de frete por distância, seleção de courier mais próximo, validação de transição de status, agregação de relatório).
   - Cobertura unit ≥ 95% por essas funções.
   - Pelo menos 2 com property-based.
3. **Integration backend**:
   - Testcontainers Postgres + Redis.
   - Migrations aplicadas.
   - Cada teste em txn rollback (Postgres) e flush selectivo de Redis.
   - Cobertura: criar pedido, aceitar, atualizar status, listar com filtro multi-tenant. Pelo menos 1 teste prova bloqueio cross-tenant.
4. **Component tests front lojista**:
   - RTL + Vitest.
   - Cobertura: form de criação de pedido, lista filtrada, tracking embedded.
   - Acessibilidade: pelo menos 1 teste valida aria roles.
5. **E2E web (Playwright)**:
   - 3 cenários happy path: signup → criar pedido → ver tracking; login com Google (mock); fechar dia.
   - 2 cenários failure: 401 sem session, validação de form com erro.
   - Page Object Model.
6. **E2E mobile (Maestro)**:
   - 1 cenário: login → ver pedidos disponíveis → aceitar → marcar entregue.
   - YAML rodando no Expo Go ou build interno.
7. **Mutation testing**:
   - Stryker em backend, rodar nas funções de domain.
   - Reportar mutation score.
   - Fix testes que não pegam mutations (até subir score significativamente).
8. **Load testing**:
   - k6 script smoke + average + stress + soak (15 min).
   - Endpoints alvo: `POST /orders`, `GET /orders`, `POST /orders/:id/events`, e WS `/ws/courier`.
   - Reportar p50/p95/p99 e identificar bottleneck (DB? Node? Redis?).
9. **CI**:
   - Workflow GitHub Actions: lint → typecheck → unit → integration → E2E (Playwright headless).
   - Cache pnpm e Playwright browsers.
   - Coverage publicado (Codecov ou GitHub Pages).

### Restrições

- Sem mockar Drizzle/Prisma/pg em integration tests.
- Sem `setTimeout` em E2E pra "esperar".
- Sem `getByTestId` quando query semântica resolve.

### Threshold

- README documenta:
  - Strategy (que tipo de teste pra que parte do sistema).
  - Mutation score antes/depois.
  - Resultado k6 com gráfico (Grafana ou texto).
  - 1 bug que apareceu apenas em integration test (não pegou em unit).
  - 1 caso de property-based test que descobriu invariant violado.
  - Tempo total da suite em CI; estratégia de paralelização.

### Stretch

- Contract test entre backend e front lojista (Pact ou OpenAPI).
- Chaos: Toxiproxy injetando latência em Redis durante teste, observe degradation.
- Visual regression test (Playwright screenshots, diff via Percy ou similar).
- Fuzz test em endpoint que aceita JSON livre (`POST /webhooks/:source`).

---

## 5. Extensões e Conexões

- Liga com **A04** (React): RTL é base de testes de componente.
- Liga com **A06** (RN): Detox/Maestro.
- Liga com **A08** (frameworks): Fastify `inject`, supertest, Hono test API.
- Liga com **A09** (Postgres): Testcontainers, txn rollback strategy.
- Liga com **A11** (Redis): integration tests com Redis real.
- Liga com **A13** (auth): security tests, fuzz em login.
- Liga com **P04** (CI/CD): orquestração, paralelização.
- Liga com **P07** (observability): test em produção via SLO/canary.
- Liga com **P10** (perf backend): load tests informam tuning.
- Liga com **S04** (resilience): chaos é forma de teste em sistemas distribuídos.

---

## 6. Referências

- **Kent C. Dodds blog** ([kentcdodds.com](https://kentcdodds.com/)) — testing trophy, RTL.
- **"Working Effectively with Unit Tests"** — Jay Fields.
- **"Software Engineering at Google"** — capítulos sobre testes (livre online).
- **Vitest docs** ([vitest.dev](https://vitest.dev/)).
- **Playwright docs** ([playwright.dev](https://playwright.dev/)).
- **Maestro docs** ([maestro.mobile.dev](https://maestro.mobile.dev/)).
- **fast-check docs** ([fast-check.dev](https://fast-check.dev/)).
- **Stryker docs** ([stryker-mutator.io](https://stryker-mutator.io/)).
- **k6 docs** ([k6.io/docs](https://k6.io/docs/)).
- **Testcontainers docs** ([testcontainers.com](https://testcontainers.com/)).
- **Pact docs** ([docs.pact.io](https://docs.pact.io/)).
