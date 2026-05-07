---
module: 03-01
title: Testing, Unit, Integration, E2E, Mutation, Property-Based, Load
stage: producao
prereqs: [02-08, 02-09]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 03-01, Testing

## 1. Problema de Engenharia

Maioria dos projetos tem testes mas não tem **strategy**. Coverage 80% que cobre só o que era fácil testar; testes acoplados a implementação que quebram a cada refactor; mocks pesados que validam que o mock obedece ao mock; suite que demora 20min e é skipada em CI; ausência de testes em fluxos críticos (auth, pagamento) sob argumento de "muito complicado". Tudo isso é norma, não exceção.

Este módulo é testing como disciplina. Pirâmide e troféu, unit vs integration vs E2E reais, testes de domínio independentes de framework, integration tests com DB real (não mock), E2E com Playwright/Detox, mutation testing pra detectar testes inúteis, property-based pra invariants, load tests pra performance. Você sai sabendo desenhar uma test strategy honesta.

---

## 2. Teoria Hard

### 2.1 Pirâmide vs Troféu

**Pirâmide clássica** (Mike Cohn): muitos unit, médios integration, poucos E2E. Argumento: rápido, isolado.

**Trophy/Diamond** (Kent C. Dodds): poucos unit, muitos integration, alguns E2E, ferramentas estáticas (TS, ESLint) na base. Argumento: integration test prova que partes coordenam, é onde bugs reais moram.

Verdade: não é teorema, é heurística por contexto. Front-end React com hooks puros, integration domina (testando comportamento). Backend de cálculo financeiro complexo, unit ainda dominante (lógica isolada). E2E é caro mas captura regressões críticas, mantenha pequeno e estável.

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

- **Vitest**: fast, ESM-first, compatível com Jest API. Padrão moderno em projetos TS.
- **Jest**: clássico, ainda dominante. Slow startup mas estável.
- **Node Test Runner** (`node:test` built-in), leve, sem deps, suficiente pra muitos backends.
- **Bun test**: built-in, rápido em Bun.
- **Mocha**: clássico, flexível, requer setup.

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
- Cada teste em **transação** que dá rollback no teardown, rápido.
- Ou: schema/database por test worker, mais lento, melhor isolamento.
- Para Mongo/Redis: container similar.

Vale o overhead. Bug de migration, tipo coluna, constraint, race condition, tudo aparece aqui.

### 2.6 React Testing Library

Princípio Kent C. Dodds: "the more your tests resemble the way your software is used, the more confidence they can give you."

Queries por preferência:
1. `getByRole` (acessível, semântico).
2. `getByLabelText`, `getByPlaceholderText`.
3. `getByText`.
4. `getByTestId`, último recurso.

Anti-padrões:
- `enzyme.shallow()`, testa implementação. Deprecated.
- `wrapper.state()`, coupling à internals.
- `act()` em todo lugar, sintoma de configuração ruim. RTL trata.
- Snapshots pra UI inteira, frágeis. Snapshots úteis em outputs determinísticos (ASTs, schemas).

Hooks: `renderHook` da @testing-library/react.

### 2.7 E2E web, Playwright e Cypress

- **Playwright** (Microsoft), multi-browser (Chromium, Firefox, WebKit), execução paralela, melhor traçabilidade. Padrão atual.
- **Cypress**: único navegador por run (até v12), DX excelente, time travel debug. Ainda comum.

Padrões E2E:
- **Page Object Model**: encapsula seletores e ações por tela.
- **Data-test attributes** (`data-testid`) explícitos pra estabilidade.
- **Não use sleeps fixos**: espere por estado (`expect(locator).toBeVisible()`).
- **Test user provisioning**: API direto pra criar user/state, não login pela UI.
- **Isolation**: cada teste limpa após si ou usa dataset descartável.

E2E é frágil por natureza. Mantenha pequeno, focado em fluxos críticos. Não substitui integration test.

### 2.8 E2E mobile, Detox e Maestro

- **Detox** (Wix): grey-box, integra com app build (Native APIs). Mais rápido, mais setup.
- **Maestro** (mobile.dev): black-box, declarativo (YAML), simples. Crescendo rápido.

Em 2026, Maestro virou default por DX. Detox ainda em uso em apps complexos.

### 2.9 Mutation testing

Stryker (`@stryker-mutator/core`) muda seu código (mutations: trocar `+` por `-`, removendo `if`, etc.) e roda testes. Se testes ainda passam, eles são fracos, não pegam essa regressão.

Coverage = quantas linhas executam. Mutation score = quantas regressões os testes capturariam.

Custo: roda suite N x mutations vezes. Use em CI nightly ou pré-release, não em cada PR.

#### Stryker concretamente (TS/JS)

```json
// stryker.conf.json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "packageManager": "pnpm",
  "testRunner": "vitest",
  "vitest": { "configFile": "vitest.config.ts" },
  "reporters": ["html", "clear-text", "progress", "dashboard"],
  "mutate": [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/*.fixture.ts",
    "!src/main.ts"
  ],
  "thresholds": { "high": 80, "low": 70, "break": 65 },
  "concurrency": 4,
  "timeoutMS": 60000,
  "incremental": true,
  "incrementalFile": ".stryker-tmp/incremental.json",
  "ignorePatterns": ["node_modules", "dist", ".next"]
}
```

`incremental: true` (Stryker 7+): só re-muta o que mudou desde último run. Com isso, em CI nightly mutation score completo demora 30-60min na primeira vez; subsequente, 2-5min se PR pequeno.

#### Operadores de mutação canônicos

Stryker injeta automaticamente — você não escolhe. Os mais frequentes:

| Operador | Exemplo | Detecta |
|---|---|---|
| **ArithmeticOperator** | `a + b` → `a - b` | Math correctness |
| **ConditionalExpression** | `x > 0` → `x >= 0` (boundary) ou `false` | Branch coverage real |
| **EqualityOperator** | `===` → `!==` | Inversões silenciosas |
| **LogicalOperator** | `&&` → `\|\|` | And/or swap |
| **BlockStatement** | `{ doX(); doY() }` → `{}` | Side effects testados |
| **StringLiteral** | `"foo"` → `""` | Hard-coded matters |
| **BooleanLiteral** | `true` → `false` | Default flag check |
| **OptionalChaining** | `a?.b` → `a.b` | Null handling |
| **MethodExpression** | `arr.filter(...)` → `arr` | Filter realmente filtra |

#### Como ler resultados (e não cair em obsessão)

Output mostra **survived mutants** (testes não pegaram) e **killed** (pegaram).

```
Ran 250 tests in 4m 12s
Mutants:
  Killed:    187 (74.8%)
  Survived:   42 (16.8%)  ← olhe pra estes
  Timeout:    14 ( 5.6%)
  No coverage:  7 ( 2.8%)
Mutation score: 74.8% (above low threshold 70)
```

**Reagindo a survived mutants:**

1. **Mutant válido não pego** → escreva teste pra ele. Maioria dos casos.
2. **Mutant equivalente** (muda código mas comportamento idêntico, ex: `i++` → `++i` em loop independente) → marque com `// Stryker disable next-line all` no source. Aceitar 5-10% equivalentes é normal.
3. **Mutant em código morto** (cobertura claim 100% mas aquela branch nunca dispara em teste real) → revisita: ou teste cobre, ou código deveria ser deletado.

**Anti-padrão**: perseguir 100% mutation score. Diminishing returns brutais — 80% custa horas, 95% custa semanas. **Threshold pragmático**: 70-80% em código de domínio crítico (payment, auth, calc), 50-60% em UI / glue code, dispensável em scaffolding.

#### Onde rodar

- **PR-level**: `--since main` mode em PRs grandes; muta só arquivos mudados. ~30s-2min.
- **Nightly CI**: full run, baseline atualizado. Falha PR se score cai > 5% vs baseline.
- **Pre-release gate**: full run + threshold absoluto.

Pra módulos críticos (Logística payment ledger §02-18), aplique sempre antes de release. Mutation testing já capturou em produção bugs reais que coverage 100% não pegaria — referencia: Stripe blog post 2022 sobre mutation testing em ledger.

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

Quando vale: outputs estruturados estáveis (AST, schema gerado, JSON config). Frágil pra UI HTML, branca em qualquer mudança.

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

- **k6** (Grafana), JS/TS scripts, executor variations (constant load, ramp-up, soak). Padrão atual.
- **Gatling**: Scala/Java, throughput excelente.
- **autocannon**: Node, simples, ótimo pra benchmark local.
- **Locust**: Python.
- **Artillery**: JS/YAML, mais leve que k6.

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

Objetivo: provar que sistema sobrevive. Em projetos novos é exagero; em sistemas distribuídos sérios (04-04), é prática.

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

03-04 (CI/CD) cobre infraestrutura. Aqui foco é **o que rodar, não como agendar**.

### 2.19 Contract testing (Pact) + fuzzing patterns

§2.15 introduziu contract testing. Aqui detalhamento operacional Senior+. E2E entre serviços é lento e flaky; integration test isolado por serviço não detecta quebra de contrato quando dois teams alteram independentemente. **Consumer-Driven Contracts (CDC)**: consumer especifica o que espera, broker valida que provider satisfaz, gate de deploy.

#### Pact JS deep (spec v4)

Stack 2026: `@pact-foundation/pact` 12+ (suporta Pact Specification v4, async messages, plugin gRPC), Pact Broker self-host ou Pactflow SaaS. Consumer test gera arquivo JSON e publica no broker; provider verifier puxa contracts e roda contra build real.

**Consumer side** (mobile courier app, Logística):

```ts
// jobs.consumer.pact.ts
import { PactV4, MatchersV3 } from '@pact-foundation/pact';
const { like, eachLike, regex, integer } = MatchersV3;

const provider = new PactV4({
  consumer: 'courier-mobile',
  provider: 'logistica-backend',
  dir: './pacts',
  logLevel: 'warn',
});

provider
  .addInteraction()
  .given('courier 42 has 2 jobs in 5km radius')
  .uponReceiving('list nearby jobs')
  .withRequest('GET', '/jobs', (b) =>
    b.query({ lat: '-23.55', lng: '-46.63', radius_km: '5' })
     .headers({ Authorization: regex(/Bearer .+/, 'Bearer xyz') })
  )
  .willRespondWith(200, (b) =>
    b.jsonBody(eachLike({
      id: regex(/^job_[a-z0-9]+$/, 'job_abc123'),
      pickup: like({ lat: -23.55, lng: -46.63 }),
      dropoff: like({ lat: -23.56, lng: -46.64 }),
      payout_cents: integer(2500),
    }))
  )
  .executeTest(async (mock) => {
    const res = await fetchJobs(mock.url, { lat: -23.55, lng: -46.63, radius_km: 5 });
    expect(res[0].payout_cents).toBeTypeOf('number');
  });
```

`Matchers.like()` / `regex()` / `integer()` evitam contracts não-determinísticos (timestamps reais quebram comparação). `given()` declara provider state — provider verifier vai acionar fixture com esse nome.

**Provider side** (`logistica-backend`):

```ts
// jobs.provider.verify.ts
import { Verifier } from '@pact-foundation/pact';

await new Verifier({
  provider: 'logistica-backend',
  providerBaseUrl: 'http://localhost:3000',
  pactBrokerUrl: process.env.PACT_BROKER_URL,
  pactBrokerToken: process.env.PACT_BROKER_TOKEN,
  publishVerificationResult: true,
  providerVersion: process.env.GIT_SHA!,
  providerVersionBranch: process.env.GIT_BRANCH,
  consumerVersionSelectors: [
    { mainBranch: true },
    { deployedOrReleased: true },
  ],
  stateHandlers: {
    'courier 42 has 2 jobs in 5km radius': async () => {
      await db.insert(jobs).values([fakeJob({ courierId: 42 }), fakeJob({ courierId: 42 })]);
    },
  },
}).verifyProvider();
```

#### Gate de deploy: `can-i-deploy`

Broker decide compat. CI block antes do deploy:

```bash
pact-broker can-i-deploy \
  --pacticipant logistica-backend \
  --version $GIT_SHA \
  --to-environment production \
  --retry-while-unknown 30 --retry-interval 10
```

Se backend renomeia `payout_cents` → `payout_value` sem versão nova do consumer, verifier falha contra contract publicado, `can-i-deploy` retorna exit 1, pipeline bloqueia. Sem contract testing essa quebra só apareceria em produção após deploy do app courier (release cycle de dias).

#### Schema-first vs Pact, decisão por 2 dimensões

| Sinal | Pact (CDC) | Schema-first (OpenAPI/GraphQL) |
|---|---|---|
| Consumer count | 1-5, conhecidos | dezenas, públicos |
| Deploy independence | times separados, mobile/partner | monorepo, deploy atômico |
| Tooling | Pact Broker, Pactflow | Spectral, Schemathesis, Apollo Studio, Inigo |
| Quem dirige | consumer (espera) | provider (publica) |

**GraphQL**: persisted queries + schema diff em CI (Apollo Studio breaks no PR se field deletado é usado por persisted query em produção). **Bidirectional contract testing** (Pactflow): provider publica OpenAPI, consumer publica Pact, broker faz cross-validation sem rodar verifier — operacionalmente mais leve, mas requer OpenAPI revisada manualmente (gerado por servidor com `required: false` em tudo escapa detecção).

#### Fuzzing patterns

Property-based via fast-check (§2.10) é fuzz estruturado pra funções puras. Pra HTTP boundary:

- **Schemathesis**: lê OpenAPI, gera 1000+ inputs, detecta 5xx, schema violations, auth bypass.
- **Restler** (Microsoft): stateful, testa sequences (`POST /orders` → `GET /orders/:id`).
- **Jazzer.js**: libFuzzer pra Node, coverage-guided, parser não-trivial.
- **AFL/libFuzzer**: binary parsers (Rust/C++).

```bash
# Schemathesis contra Logística staging, OpenAPI gerado por Fastify
schemathesis run http://staging.logistica.dev/openapi.json \
  --checks all \
  --hypothesis-max-examples=2000 \
  --header "Authorization: Bearer $TEST_TOKEN" \
  --workers 4 \
  --hypothesis-seed=42
```

Caso real Logística: `POST /webhooks/:source` (multi-tenant payment webhooks). Schemathesis gera 5000 inputs, encontra crash em payload com Unicode combinado em campo CPF — regex `^\d{11}$` passa, normalização `.normalize('NFC')` posterior expande string e quebra invariant downstream. Fix: validar bytes pré-normalize.

Pra `POST /orders` com Zod: combine fast-check + Zod, garanta schema rejeita TODO input inválido sem panic:

```ts
import fc from 'fast-check';
import { OrderSchema } from './schemas';

test('Zod never throws on arbitrary JSON', () => {
  fc.assert(fc.property(fc.anything(), (input) => {
    const r = OrderSchema.safeParse(input);
    expect(r.success === true || r.success === false).toBe(true);
  }), { numRuns: 5000, seed: 42 });
});
```

#### Anti-padrões

- Pact com timestamps reais (não-determinístico) — use `like()` / `term()`.
- Provider verifier sem `stateHandlers` (consumer espera dado, provider sem fixture, flaky).
- Broker existe mas pipeline não roda `can-i-deploy` (gate ausente).
- Schema-first sem `npm run typecheck` no consumer pós provider schema change (silent break).
- Fuzzer sem corpus seed (fuzz from scratch demora horas; semente com tráfego real acelera coverage).
- Schemathesis em prod-like env contra DB compartilhado (poluição entre testes).
- Fuzz endpoint sem rate limit (CI worker DoS-a próprio target).
- Pact em monorepo com 1 consumer + 1 provider (overkill, type-share resolve).
- Bidirectional aceitando OpenAPI gerado sem revisão (`required: false` mascara breaking change).

Cruza com **02-08** (Fastify schema-first, Zod), **03-04** (CI/CD, `can-i-deploy` gate), **03-08** (security, fuzz detecta auth bypass), **04-05** (API design, OpenAPI vs GraphQL contracts), **04-12** (tech leadership, contract testing como org-scaling).

---

### 2.20 Testing stack 2026 — Vitest 3 + Playwright 1.55 + Stryker 8 + fast-check 3 + MSW 2

Stack de teste 2024-2026 consolidou. Vitest 3 (Q4 2024) ganhou greenfield TS — startup 5x mais rápido que Jest, ESM-first, browser mode stable. Playwright (1.48 Q4 2024 → 1.55 Q3 2025) virou default E2E e absorveu component testing maduro com `@playwright/experimental-ct-react`. Stryker 8 (Q1 2024) adicionou Vitest runner, viabilizando mutation testing em pipelines TS modernos. fast-check 3.x estabilizou property-based em produção desde 2022. MSW 2.0 (Q4 2023) reescreveu API com `http.get`/`http.post` e Service Worker + Node interceptor unificados, MSW 2.7 (Q4 2025) integrou OpenAPI codegen pra type-safe handlers.

Estratégia 2026 não é "qual ferramenta", é **qual combinação**: Vitest pra unit + integration rápido, Vitest browser mode pra hooks que dependem de DOM real, Playwright pra E2E + visual regression, Stryker em módulos críticos (billing, auth), fast-check em libs matemáticas/parsers, MSW como única fonte de mock entre todas as camadas.

**Vitest 3 com browser mode**:

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: 'playwright', // ou 'webdriverio'
      name: 'chromium',
      headless: true,
      providerOptions: {
        launch: { devtools: false },
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
});
```

Browser mode roda teste em browser real (Chromium/Firefox/WebKit via Playwright provider, sem JSDOM mock). Hooks que tocam `IntersectionObserver`, `ResizeObserver`, layout real, agora testáveis sem polyfill.

**Vitest workspace** (mono-repo, multi-config):

```ts
// vitest.workspace.ts
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'unit',
      include: ['packages/**/*.unit.test.ts'],
      environment: 'node',
    },
  },
  {
    test: {
      name: 'integration',
      include: ['packages/**/*.int.test.ts'],
      environment: 'node',
      pool: 'forks', // isolation pra DB tests
      poolOptions: { forks: { singleFork: false } },
    },
  },
  {
    test: {
      name: 'browser',
      include: ['packages/web/**/*.browser.test.tsx'],
      browser: { enabled: true, provider: 'playwright', name: 'chromium', headless: true },
    },
  },
]);
```

Roda `vitest --project unit` ou `vitest --project browser`. CI separa concorrência: unit em paralelo agressivo, integration em forks isolados, browser sequencial por shard.

**Playwright 1.55 component test + visual regression**:

```ts
// playwright-ct.config.ts
import { defineConfig, devices } from '@playwright/experimental-ct-react';

export default defineConfig({
  testDir: './src',
  testMatch: /.*\.ct\.test\.tsx/,
  snapshotDir: './__snapshots__',
  use: { ctPort: 3100 },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});

// dashboard.ct.test.tsx
import { test, expect } from '@playwright/experimental-ct-react';
import { Dashboard } from './Dashboard';

test('dashboard renderiza KPIs corretos', async ({ mount }) => {
  const cmp = await mount(<Dashboard kpis={{ orders: 1240, revenue: 84500 }} />);
  await expect(cmp.getByTestId('kpi-orders')).toHaveText('1.240');
  await expect(cmp).toHaveScreenshot('dashboard-default.png', { maxDiffPixels: 50 });
});
```

`toHaveScreenshot` compara contra baseline em `__snapshots__/`. Baseline vai pra Git LFS (PNGs binários poluem diff). Branch protection: snapshot só atualiza via PR explícito (`--update-snapshots` em label `update-snapshots`), nunca em merge automático.

**Trace viewer**: `playwright show-trace trace.zip` abre timeline com network, console, DOM snapshot por step. Em CI, `trace: 'retain-on-failure'` salva trace só em falha — debug remoto sem reproduzir local.

**Stryker 8 mutation com Vitest runner**:

```json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "packageManager": "pnpm",
  "testRunner": "vitest",
  "vitest": { "configFile": "vitest.config.ts" },
  "coverageAnalysis": "perTest",
  "mutate": ["src/billing/**/*.ts", "!src/billing/**/*.test.ts"],
  "thresholds": { "high": 85, "low": 70, "break": 60 },
  "reporters": ["html", "clear-text", "progress", "dashboard"],
  "dashboard": { "project": "github.com/org/repo", "version": "main" }
}
```

`break: 60` falha CI se mutation score < 60%. Score 60-80% é faixa saudável (testa comportamento, não implementação). >85% indica testes acoplados a detalhe — refactor quebra testes sem bug real. Stryker é caro (roda suite N vezes onde N = mutantes), reserva pra módulos críticos e roda **weekly** em main, não em todo PR.

**fast-check 3 property-based**:

```ts
import fc from 'fast-check';
import { describe, test } from 'vitest';
import { sortByPriority, mergeOrders } from './orders';

describe('sortByPriority', () => {
  test('idempotência: sort(sort(x)) === sort(x)', () => {
    fc.assert(
      fc.property(fc.array(fc.record({ id: fc.string(), priority: fc.integer() })), (orders) => {
        const once = sortByPriority(orders);
        const twice = sortByPriority(once);
        expect(twice).toEqual(once);
      }),
      { numRuns: 200, seed: 42 },
    );
  });

  test('mergeOrders comutativo: merge(a,b) === merge(b,a)', () => {
    fc.assert(
      fc.property(fc.array(fc.string()), fc.array(fc.string()), (a, b) => {
        expect([...mergeOrders(a, b)].sort()).toEqual([...mergeOrders(b, a)].sort());
      }),
      { numRuns: 100, seed: 1337 },
    );
  });
});
```

`seed` fixo torna falha reprodutível. Shrinking automático reduz contra-exemplo (array de 1000 items → 3 items que ainda quebram). Property-based brilha em parsers, sort, merge, serialize/deserialize round-trip.

**MSW 2 handler unificado** (Node + browser + E2E):

```ts
// mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/orders/:id', ({ params }) => {
    return HttpResponse.json({ id: params.id, status: 'PAID', amount: 12500 });
  }),
  http.post('/api/orders', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 'ord_new', ...body }, { status: 201 });
  }),
];

// mocks/node.ts (Vitest unit/integration)
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
export const server = setupServer(...handlers);

// mocks/browser.ts (Vitest browser mode + Playwright ct)
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
export const worker = setupWorker(...handlers);
```

Mesmo `handlers.ts` alimenta Node interceptor (testes server-side) e Service Worker (testes client-side). Em E2E Playwright, intercepta via `page.route()` ou monta MSW worker no app de teste. MSW 2.7 + OpenAPI codegen gera handlers tipados a partir do spec — mock que diverge do contrato é erro de compile.

**Test sharding 2026** (Playwright em GitHub Actions):

```yaml
e2e:
  strategy:
    fail-fast: false
    matrix:
      shard: [1/4, 2/4, 3/4, 4/4]
  steps:
    - run: pnpm playwright test --shard=${{ matrix.shard }} --reporter=blob
    - uses: actions/upload-artifact@v4
      with:
        name: blob-report-${{ strategy.job-index }}
        path: blob-report

e2e-merge:
  needs: e2e
  if: always()
  steps:
    - uses: actions/download-artifact@v4
      with: { path: all-blob-reports, pattern: blob-report-* }
    - run: pnpm playwright merge-reports --reporter=html ./all-blob-reports
```

Sweet spot: 4-8 shards. Menos = latência alta; mais = overhead de spinup domina. `--reporter=blob` produz artifact mergeável (HTML único final). Vitest tem `--shard 1/4` análogo. Sharding reduz E2E de 30min sequencial pra 6-8min em 4 paralelos.

**CI integration patterns 2026**:

- **Fast lane PR**: Vitest unit + integration, < 3min, gate obrigatório.
- **E2E lane PR**: Playwright sharded 4x, < 10min, gate em smoke tests críticos.
- **Visual regression**: comparação contra baseline `main`, falha se diff > threshold; update via label.
- **Nightly**: full E2E matrix (chromium + firefox + webkit), mutation testing Stryker, contract testing Pact.
- **Weekly**: fast-check com `numRuns: 10000` em libs core (acha edge cases lentos sem flakar PR).

**Stack Logística aplicada**:

- Vitest 3 unit pra `pricing/`, `routing/`, `validation/` (Zod schemas).
- Vitest browser mode pra hooks de mapa (`useMapViewport`, depende de `ResizeObserver` real).
- Playwright 1.55 E2E flow `pedido → cotação → pagamento → tracking`, sharded 4x em PR.
- Visual regression em dashboard de operações (KPIs, gráficos).
- Stryker em `billing/` (cálculo de frete, comissão) — mutation score gate 70%.
- fast-check em `routing/` (`shortestPath` idempotente, `mergeRoutes` comutativo).
- MSW 2 handlers gerados via OpenAPI da API de transportadora — mock client = mock E2E = mock dev local.

**10 anti-patterns**:

1. **Jest + Vitest mix em mesmo repo**: config drift, coverage merge headache, dois reporters. Migra tudo ou nada.
2. **Playwright component test + Vitest browser mode overlapping**: escolhe um. Vitest browser pra hooks/utils, Playwright ct só se já usa Playwright pra E2E e quer reuse de fixtures.
3. **Visual regression sem branch protection em baseline**: PR random atualiza snapshot, main fica com baseline errado. Update só via label explícito.
4. **Stryker rodando full suite em todo PR**: 30min+ CI, dev pula. Roda em main nightly + threshold gate; PR roda Stryker incremental só em files alterados.
5. **fast-check com `numRuns: 100` default em CI**: edge case lento gera flaky. Pin `numRuns` baixo (50-200) + `seed` fixo no PR; rodada `numRuns: 10000` em weekly job.
6. **MSW handler em ambiente errado**: importou `setupWorker` em teste Node = noop silent, requests passam pra rede real (ou falham timeout). Lint regra: `msw/browser` proibido em `*.test.ts` Node.
7. **Test sharding sem `--reporter=blob`**: 4 reports HTML parciais sem merge, dev abre 4 abas. Sempre `blob` + `merge-reports`.
8. **Mutation score como vanity metric**: time persegue 95% mutando getters/setters. Score 60-80% em código de domínio > 95% em tudo.
9. **Property-based sem `seed`**: falha CI em PR random, próximo run passa, dev marca como flaky e ignora bug real. `seed` fixo + reproduzir local com mesmo seed.
10. **Browser mode pra teste que não precisa de DOM real**: Vitest browser é 3-5x mais lento que JSDOM. Reserva pra hooks/components que dependem de layout/observer real.

**Cruza com**: §2.7 (Playwright/Cypress intro), §2.9 (mutation intro), §2.10 (property-based intro), §2.11 (snapshots), §2.15 (contract testing), §2.18 (CI integration), §2.19 (Pact + fuzz), **02-04** (React testing patterns), **02-08** (backend test integration), **03-04** (CI sharding + matrix gates), **04-05 §2.27** (OpenAPI codegen feeds MSW handlers).

---
### 2.21 Visual regression testing + Playwright advanced patterns + flake elimination

E2E funcional valida comportamento; CSS regression passa silenciosa (botão deslocado 4px, contraste quebrado, layout collapse em viewport intermediário). Visual regression captura snapshot e compara pixel-a-pixel. Custo: alta manutenção, falsos positivos em data-driven UI. Adote por componente (design system) e por página crítica (checkout, dashboard); nunca por página inteira em SaaS data-heavy.

#### Quando vale (e quando NÃO vale)

- **Use case**: design system com Storybook; página user-facing crítica (checkout, dashboard, landing); componente reutilizado cross-product.
- **NÃO use case**: toda página; UI data-driven que muda diariamente; conteúdo high-noise (feeds, dashboards live).
- **Trade-off**: pega CSS regression invisível a teste funcional; manutenção alta (false positives em font rendering, anti-aliasing, OS diff).
- **Adoption signal**: design team valoriza pixel-perfect; ou component library compartilhada cross-team.

#### Tools 2026 — comparativo

| Tool | Tipo | Custo | Best fit |
|---|---|---|---|
| **Playwright `toHaveScreenshot()`** | Built-in | Free | Most apps; integrado ao E2E |
| **Storybook + Chromatic** | Component-level | $149+/mo | Design systems |
| **Percy (BrowserStack)** | Pro SaaS | $599+/mo | Cross-browser focus |
| **Applitools Eyes** | AI-based diff | $299+/mo | Tolerante a valid changes |
| **Reg-suit (open-source)** | CI-only | Free | Self-host workflow |
| **BackstopJS** | Legacy OSS | Free | Maintenance only |

#### Playwright `toHaveScreenshot()` — prático

```ts
// orders.visual.spec.ts (Playwright 1.50+)
import { test, expect } from '@playwright/test';

test('orders dashboard visual', async ({ page }) => {
  await page.goto('/orders');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('orders-dashboard.png', {
    mask: [page.locator('[data-testid="updated-at"]')], // dynamic content
    maxDiffPixelRatio: 0.01,                            // 1% tolerance (anti-aliasing)
    animations: 'disabled',
    caret: 'hide',
  });
});
```

Primeira execução gera baseline; subsequentes comparam. `maxDiffPixelRatio` absorve diff de anti-aliasing entre máquinas. Fonts/rendering divergem entre OS; rode em Docker pra consistência CI ↔ baseline.

#### Docker para consistência

```dockerfile
# Dockerfile.e2e
FROM mcr.microsoft.com/playwright:v1.50.0-jammy
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npx", "playwright", "test"]
```

Pinne versão Playwright; baseline screenshots tirados na mesma imagem. Em GitHub Actions, use `container: mcr.microsoft.com/playwright:v1.50.0-jammy` direto no job, evita rebuild.

#### Storybook + Chromatic — pattern

```ts
// OrderCard.stories.tsx (Storybook 8+)
import type { Meta, StoryObj } from '@storybook/react';
import { OrderCard } from './OrderCard';

const meta: Meta<typeof OrderCard> = {
  title: 'Components/OrderCard',
  component: OrderCard,
  parameters: {
    chromatic: { viewports: [375, 768, 1280], delay: 300 },
  },
};
export default meta;

export const Default: StoryObj<typeof OrderCard> = { args: { order: mockOrder } };
export const LongName: StoryObj<typeof OrderCard> = {
  args: { order: { ...mockOrder, customerName: 'A'.repeat(100) } },
};
export const Late: StoryObj<typeof OrderCard> = {
  args: { order: { ...mockOrder, status: 'late' } },
};
```

Cada story = 1 visual snapshot. Chromatic é hosted; auto-detecta diffs; PR review UI pra approval. Pricing 2026: free até 5k snapshots/mês, $149/mo pra 35k. `delay` espera animação/data load.

#### Page Object Model + fixtures

```ts
// fixtures/orders.ts
import { test as base, Page } from '@playwright/test';

class OrdersPage {
  constructor(public page: Page) {}
  async goto() { await this.page.goto('/orders'); }
  async filterByStatus(status: string) {
    await this.page.getByRole('combobox', { name: /status/i }).selectOption(status);
    await this.page.waitForResponse(r => r.url().includes('/api/orders') && r.status() === 200);
  }
  async createOrder(data: { items: string[] }) {
    await this.page.getByRole('button', { name: /new order/i }).click();
    for (const item of data.items) {
      await this.page.getByLabel(/items/i).fill(item);
      await this.page.keyboard.press('Enter');
    }
    await this.page.getByRole('button', { name: /submit/i }).click();
  }
}

export const test = base.extend<{ ordersPage: OrdersPage }>({
  ordersPage: async ({ page }, use) => use(new OrdersPage(page)),
});
```

```ts
// tests/orders.spec.ts
import { test } from '../fixtures/orders';
import { expect } from '@playwright/test';

test('create order', async ({ ordersPage }) => {
  await ordersPage.goto();
  await ordersPage.createOrder({ items: ['Box A', 'Box B'] });
  await expect(ordersPage.page.getByText('Order created')).toBeVisible();
});
```

POM por feature (não god-class); fixture injeta página pronta no teste, reduz setup boilerplate.

#### Flake elimination — patterns

- **NÃO use `page.waitForTimeout(2000)`**: anti-pattern; substitua por `waitForResponse` ou `waitFor` específico.
- **Auto-waiting**: `getByRole('button').click()` já espera elemento actionable; nada de `waitForSelector` manual.
- **Network-aware**: `await page.waitForResponse(r => r.url().includes('/api/orders'))`.
- **Retry on flake**: `retries: 2` no config, mas só em CI (`process.env.CI ? 2 : 0`); local mascara bug real.
- **Trace viewer**: `npx playwright test --trace=retain-on-failure` → debug visual de runs falhos.
- **Test isolation**: cada teste novo browser context; sem shared state entre tests.

#### Common flake sources + fixes

- **Animation race**: injete `* { transition: none !important; animation: none !important; }` pre-test via `page.addStyleTag`.
- **Fonts não carregadas**: `await page.evaluate(() => document.fonts.ready)` antes de screenshot.
- **`Date.now()` varia**: mock via `page.addInitScript(() => { Date.now = () => 1700000000000 })`.
- **Random IDs (UUID)**: stub gerador; use deterministic test data (`uuid: 'test-uuid-001'`).
- **Network flakiness**: stub APIs via `page.route('/api/**', route => route.fulfill({ json: fixture }))` em testes não-E2E-puros.

#### Logística — applied stack

- **Component visual regression**: Storybook + Chromatic pra design system (`OrderCard`, `CourierBadge`, `FilterBar`, `StatusPill`).
- **Page-level visual regression**: Playwright `toHaveScreenshot` em `/orders`, `/dashboard`, `/settings` (3 critical journeys).
- **E2E flow tests**: 8 critical paths via POM + fixtures (criar pedido, atribuir courier, marcar entregue, cancelar, etc.).
- **Mobile E2E**: Maestro pro courier app (10 flows: login, accept job, mark delivered, etc.).
- **CI pipeline**: container Playwright Docker; Chromatic on PR via path filter (`src/components/**`); total ~12min E2E + visual suite.

#### Anti-padrões

- `await page.waitForTimeout(2000)` em todo teste (slow; flake-prone; use specific waits).
- Visual regression em todo PR (high noise; ative só quando path filter detecta mudança visual-relevant).
- Storybook stories sem `viewports` / `delay` (snapshots variam; flake garantido).
- Visual baselines committed em OS diferente do CI (Linux baseline + dev macOS = false positive crônico).
- POM com 50+ methods em single class (refactor; split por feature: `OrdersPage`, `CheckoutPage`).
- Tests compartilhando data via DB sem cleanup (test 2 falha porque test 1 deixou estado).
- Playwright config sem `retries: 2` em CI (transient network = false failure block PR).
- `expect(...).toBeVisible()` sem timeout adequado (default 5s pode ser pouco em slow CI; use `{ timeout: 15000 }`).
- Visual regression em data-driven UI sem `mask` (timestamps/IDs mudam; mask obrigatório).
- Mock APIs em todo teste E2E (defeats purpose; use real backend via Testcontainers + selective stubs em edges).

Cruza com `03-01` §2.6 (E2E basics, Playwright fundamentals), `03-01` §2.18 (CI integration), `03-01 §2.20` (testing stack 2026 — Playwright 1.55 + visual regression integrado), **03-04** (CI/CD, parallel sharding, container reuse), **02-04** (React + Storybook component dev), **03-09** (frontend perf, visual budget enforcement em CI).

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

- Liga com **02-04** (React): RTL é base de testes de componente.
- Liga com **02-06** (RN): Detox/Maestro.
- Liga com **02-08** (frameworks): Fastify `inject`, supertest, Hono test API.
- Liga com **02-09** (Postgres): Testcontainers, txn rollback strategy.
- Liga com **02-11** (Redis): integration tests com Redis real.
- Liga com **02-13** (auth): security tests, fuzz em login.
- Liga com **03-04** (CI/CD): orquestração, paralelização.
- Liga com **03-07** (observability): test em produção via SLO/canary.
- Liga com **03-10** (perf backend): load tests informam tuning.
- Liga com **04-04** (resilience): chaos é forma de teste em sistemas distribuídos.

---

## 6. Referências

- **Kent C. Dodds blog** ([kentcdodds.com](https://kentcdodds.com/)), testing trophy, RTL.
- **"Working Effectively with Unit Tests"**: Jay Fields.
- **"Software Engineering at Google"**: capítulos sobre testes (livre online).
- **Vitest docs** ([vitest.dev](https://vitest.dev/)).
- **Playwright docs** ([playwright.dev](https://playwright.dev/)).
- **Maestro docs** ([maestro.mobile.dev](https://maestro.mobile.dev/)).
- **fast-check docs** ([fast-check.dev](https://fast-check.dev/)).
- **Stryker docs** ([stryker-mutator.io](https://stryker-mutator.io/)).
- **k6 docs** ([k6.io/docs](https://k6.io/docs/)).
- **Testcontainers docs** ([testcontainers.com](https://testcontainers.com/)).
- **Pact docs** ([docs.pact.io](https://docs.pact.io/)).
