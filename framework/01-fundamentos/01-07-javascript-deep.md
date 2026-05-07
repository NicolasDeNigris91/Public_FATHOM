---
module: 01-07
title: JavaScript Profundo, V8, Event Loop, Closures, Prototype, Coerção
stage: fundamentos
prereqs: [01-02, 01-06]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 01-07, JavaScript Profundo

## 1. Problema de Engenharia

JavaScript é a linguagem mais usada no mundo, e a mais **mal-entendida**: porque a maioria dos devs aprende sintaxe sem nunca olhar o que está embaixo. Você usa `Promise`, `async/await`, `setTimeout`, `closure`, `this`, `class`, mas se eu te perguntar:

- "Quem executa primeiro: `setTimeout(fn, 0)` ou `Promise.resolve().then(fn)`?"
- "O que `this` aponta dentro de um arrow function?"
- "Por que `[1,2,3] + [4,5,6]` retorna `'1,2,34,5,6'`?"
- "Como o Garbage Collector do V8 promove objetos da new pra old generation?"
- "Por que mudar o shape de um objeto em runtime degrada performance?"

Sem respostas precisas a essas perguntas, **você não domina JavaScript**. E como JS sustenta Node, React, Next.js, todo seu stack daqui pra frente vira castelo na areia.

Este módulo te dá o JS de verdade. Depois dele, **TypeScript ([01-08](01-08-typescript-type-system.md))** vira evolução natural.

---

## 2. Teoria Hard

### 2.1 V8, Pipeline de execução

O V8 (engine do Chrome/Node) executa JS em **5 passos** simplificados:

1. **Parser**: lê código fonte → gera **AST (Abstract Syntax Tree)**.
2. **Ignition (interpreter)**: AST → **bytecode**, executa imediatamente.
3. **Profiler**: monitora código quente (executado muitas vezes).
4. **TurboFan (JIT compiler)**: código quente → código de máquina otimizado, com assumptions sobre tipos (hidden classes, inline caches).
5. **Deoptimization**: se assumption falha, descarta código otimizado, volta pro Ignition.

**Hidden classes (shapes):** quando V8 vê um objeto, cria uma "shape" descrevendo seu layout (offsets das propriedades). Objetos com mesma shape compartilham. **Adicionar/remover propriedade muda a shape** → invalida hidden class → invalida código otimizado.

**Lição prática:**
- Crie objetos com **mesmas propriedades, mesma ordem** desde a construção. Não adicione campos depois.
- Não delete propriedades de objetos hot.

**Inline caches (ICs):** ao chamar `obj.foo`, V8 cacheia "shape do obj + offset do foo". Próximas chamadas com mesma shape são quase grátis. Diferentes shapes → IC vira "polymorphic" (3-4 shapes) → "megamorphic" (>4) → cai pra slow path.

**GC (Garbage Collector) do V8, generational:**
- **New space (young generation)**: ~16 MB. Aloca objetos novos. Coletado com **Scavenge** (cheap, frequente). Sobrevivente em 2 ciclos é promovido pra old space.
- **Old space (old generation)**: maior. Coletado com **Mark-Sweep-Compact** (caro, raro).
- **Concurrent/incremental marking** evita pauses longas.

**Implicação:** quanto mais "lixo" você gera (alocações temporárias), mais GC roda. **Profile com `--trace-gc`** se suspeitar.

### 2.2 Tipos primitivos vs reference

**Primitivos** (passados por **valor**): `number`, `string`, `boolean`, `null`, `undefined`, `bigint`, `symbol`.

**Reference** (passados por **referência**): `object`, `array`, `function` (que é object).

```javascript
let a = 1; let b = a; b = 2; // a = 1, b = 2
let x = {n:1}; let y = x; y.n = 2; // x.n = 2, y.n = 2 (mesma ref)
```

Strings são **imutáveis** (não pode mudar caractere por índice). `"abc"[0] = "z"` falha silenciosamente em sloppy mode, throw em strict.

`Number` em JS é **IEEE 754 double-precision** (64-bit float). Por isso `0.1 + 0.2 !== 0.3`. Pra dinheiro, use `bigint` ou strings ou libs (`big.js`, `decimal.js`).

`BigInt` (ES2020): inteiros arbitrariamente grandes. `100n`. Não interopera com `number` direto.

`Symbol`: identificador único. `Symbol('foo') !== Symbol('foo')`. Usado pra propriedades não-enumeráveis, como `Symbol.iterator`.

### 2.3 Coerção (parte mais polêmica de JS)

JS converte tipos automaticamente em muitos contextos. Regras precisas estão na spec ECMA-262, seção `ToPrimitive`/`ToNumber`/`ToString`.

**`==` vs `===`:**
- `===` (strict): tipo igual, valor igual. **Use sempre.**
- `==` (loose): tenta coercion antes. **Inferno em casos: `null == undefined` (true), `0 == ''` (true), `[] == false` (true).**

**`+`** com string: concatena. Senão soma.
```javascript
1 + 1       // 2
1 + '1'     // '11'
1 + null    // 1   (null → 0)
1 + undefined // NaN (undefined → NaN)
[] + []     // ''  (each → '')
[] + {}     // '[object Object]'
```

**`[1,2,3] + [4,5,6]`** → ToPrimitive([1,2,3]) = `"1,2,3"`; mesma coisa pro outro; concatena → `"1,2,34,5,6"`. Spec literal.

**Truthy/falsy:**
- **Falsy:** `false`, `0`, `-0`, `0n`, `''`, `null`, `undefined`, `NaN`. Tudo.
- **Truthy:** todo o resto (incluindo `[]`, `{}`, `'0'`, `'false'`).

**Booleanização:**
- `if (x)`, `!!x`, `Boolean(x)` → todas usam ToBoolean.
- `[]` é truthy. `Boolean([])` = true. `if ([])` executa o if.

### 2.4 Closures e escopo léxico

**Escopo léxico:** o escopo de uma variável é determinado por **onde ela é definida no código**, não onde é chamada.

```javascript
const x = 10;
function outer() {
  const y = 20;
  function inner() {
    return x + y; // ambos visíveis: léxico
  }
  return inner;
}
const fn = outer();
fn(); // 30, mesmo que `outer` já retornou, `inner` capturou o ambiente
```

**Closure** = função + ambiente léxico capturado.

Esse é o motor de:
- **Module pattern** (estado privado via IIFE):
  ```javascript
  const counter = (() => {
    let count = 0;
    return { inc: () => ++count, get: () => count };
  })();
  ```
- **Hooks do React:** `useState` retorna ref ao state guardado no fiber via closure interna.
- **Callbacks** com contexto.

**Bug clássico do `var` em loop:**
```javascript
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// imprime: 3, 3, 3, todas as closures compartilham `i` (function-scoped)
```

Soluções:
1. `let i` (block-scoped → cada iteração tem novo `i` na closure).
2. IIFE: `setTimeout((function(j){ return () => console.log(j); })(i), 0);`
3. `Array.from`/`forEach` com index.

### 2.5 `this`, o bicho de 7 cabeças

`this` é o **contexto** de uma chamada. Determinado por **como a função é chamada**, não onde definida.

| Forma de chamada | `this` |
|------------------|--------|
| `obj.method()` | `obj` |
| `fn()` (standalone) | `undefined` (strict) ou `globalThis` (sloppy) |
| `new Constructor()` | objeto novo |
| `fn.call(ctx)`, `fn.apply(ctx, args)` | `ctx` |
| `fn.bind(ctx)()` | `ctx` (fixo) |
| Arrow function | `this` do escopo léxico (não tem próprio) |

**Arrow functions** não têm `this`, `arguments`, `super`, `new.target` próprios. Capturam do escopo. Por isso `setInterval(() => this.tick(), 1000)` dentro de classe **funciona** sem `bind`.

**Métodos passados como callback** perdem `this`:
```javascript
class C {
  constructor() { this.n = 1; }
  m() { console.log(this.n); }
}
const c = new C();
const f = c.m;
f(); // TypeError: this is undefined (strict) ou this.n é window.n
```
Solução: `bind(c)` ou usar arrow.

### 2.6 Prototype chain

JS é **prototype-based**, não class-based. Classes ES6 são **sintaxe** sobre prototypes.

Cada objeto tem um **`[[Prototype]]`** interno (acessível via `Object.getPrototypeOf(obj)` ou legacy `obj.__proto__`). Quando você acessa `obj.foo`:
1. Procura em `obj` mesmo.
2. Se não achar, procura em `[[Prototype]]`.
3. Recursivo até `null`.

```javascript
function Animal(name) { this.name = name; }
Animal.prototype.speak = function() { return this.name; };

const dog = new Animal('Rex');
dog.speak(); // procura speak em dog → não acha → procura em Animal.prototype → acha
```

**`new Constructor()` em 4 passos:**
1. Cria objeto vazio.
2. Define `[[Prototype]]` = `Constructor.prototype`.
3. Chama `Constructor.call(novoObj, ...args)`.
4. Retorna novoObj (a menos que constructor retorne explicitamente outro objeto).

**Class ES6 desugaring:**
```javascript
class Dog extends Animal {
  bark() { return 'woof'; }
}
// equivale a:
function Dog(...args) { Animal.call(this, ...args); }
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;
Dog.prototype.bark = function() { return 'woof'; };
```

**`instanceof`** anda na chain procurando `Class.prototype`.

**`Object.create(proto)`** cria objeto com `[[Prototype]]` específico, útil pra criar inheritance "manual".

### 2.7 Event loop

JavaScript é **single-threaded** mas **assíncrono**. Como?

Conceitos:
- **Call stack**: frames de funções em execução.
- **Heap**: alocação dinâmica.
- **Task queue (macrotasks)**: FIFO de tasks. Cada `setTimeout`, `setInterval`, `setImmediate` (Node), I/O callback vira task.
- **Microtask queue**: FIFO de microtasks. `Promise.then/catch/finally`, `queueMicrotask`, `MutationObserver` (browser).
- **Render queue (browser)**: a cada vsync (~16ms), pode renderizar.

**Loop:**
```
while (true) {
  // 1. Se stack não vazia: executa próxima instrução (sync)
  // 2. Se stack vazia:
  //    a. Drena microtask queue COMPLETAMENTE (pode adicionar mais microtasks; processe todas)
  //    b. Pega 1 macrotask, executa até esvaziar stack
  //    c. (browser) Render se necessário
  // 3. Se nada a fazer: bloqueia em I/O multiplex (epoll/kqueue/IOCP)
}
```

**Ordem clássica:**
```javascript
console.log(1);
setTimeout(() => console.log(2), 0);
Promise.resolve().then(() => console.log(3));
console.log(4);
// Saída: 1, 4, 3, 2
```
- `1`, `4` síncronos primeiro.
- Stack esvazia → drena microtasks → `3`.
- Pega macrotask → `2`.

**No Node**, há fases (timers, pending, idle/prepare, **poll**, check, close). `setImmediate` é macrotask na fase `check`. `process.nextTick` tem fila própria, **antes** de microtasks. Evite `process.nextTick` recursivo (starva o loop).

### 2.8 Promises e async/await

**Promise** é objeto com 3 estados: `pending`, `fulfilled`, `rejected`. **Transição é única e final.**

```javascript
const p = new Promise((resolve, reject) => {
  // executor roda IMEDIATAMENTE (síncrono)
  setTimeout(() => resolve(42), 100);
});
p.then(v => console.log(v)); // microtask quando resolver
```

`then(onFulfilled, onRejected)` retorna **nova Promise** representando o resultado da callback.

**`async/await` é sintaxe sobre Promise + generators:**
```javascript
async function fn() {
  const x = await promise1;
  return x + 1;
}
// Equivale a:
function fn() {
  return promise1.then(x => x + 1);
}
```

**Cuidado:** `await` em loop sequencializa.
```javascript
// SEQUENCIAL, lento se calls são independentes:
for (const url of urls) await fetch(url);

// PARALELO:
await Promise.all(urls.map(u => fetch(u)));
```

### 2.9 Generators e iterators

**Iterator protocol:**
```typescript
const iter: Iterator<number> = {
  i: 0,
  next() {
    return { value: this.i++, done: this.i > 3 };
  },
};
```

`for...of` consome iterators. Arrays, Maps, Sets, strings são iterables (têm `[Symbol.iterator]`).

**Generators:**
```javascript
function* counter() {
  yield 1;
  yield 2;
  yield 3;
}
const g = counter();
g.next(); // { value: 1, done: false }
```

Generators **pausam** em `yield` e retomam em `next()`. Permite **lazy sequences**, control flow customizado, schedulers.

### 2.10 Memory management e leaks

JS é managed. Você não dá `free`. Mas leaks acontecem:
- **Refs persistentes** em closures.
- **Listeners não removidos**: `el.addEventListener(...)` sem `removeEventListener`.
- **Timers**: `setInterval` sem `clearInterval`.
- **Detached DOM**: nó removido do DOM mas referenciado em JS.
- **Caches sem evicção**: `Map` que cresce indefinidamente.

**Ferramentas:** Chrome DevTools Memory tab, heap snapshot, allocation timeline.

**`WeakMap` / `WeakSet`**: keys são fracas, não impedem GC. Útil pra cache associada a objetos.

**`WeakRef`** (ES2021): referência fraca a objeto, GC pode coletar. Use com `FinalizationRegistry` pra cleanup.

### 2.11 Modules (ES modules)

**ES Modules (ESM)** desde 2015:
```javascript
// foo.mjs
export const x = 1;
export default function() {}

// bar.mjs
import { x } from './foo.mjs';
import fn from './foo.mjs';
```

ESM é **estático** (imports resolvidos no parse, não em runtime). Permite tree-shaking.

**CommonJS (CJS)**: `require/module.exports`, é o modelo legacy do Node, dinâmico.

Em Node, `package.json` `"type": "module"` faz `.js` ser ESM. ESM importa CJS, mas CJS importa ESM **só com `await import()`** (dinâmico).

---

### 2.12 JavaScript moderno 2026 — ES2024/2025, Node 22/24 LTS, V8 Maglev + TurboShaft, Bun, Deno 2

JavaScript de 2026 não é o de 2020. ES2024 e ES2025 entregaram features que extinguem categorias inteiras de utility code (lodash group/uniq, hand-rolled set ops, custom Date wrappers). Node 22 LTS (Out 2024) e Node 24 LTS (esperado Out 2026) trazem TypeScript stripping nativo, permission model, WebSocket built-in, `require(esm)` estável. V8 evoluiu pipeline (Ignition → Sparkplug → Maglev → TurboFan/TurboShaft). Quem ainda escreve código com padrões de 2018 paga em bytes, latência e bug surface.

#### ES2024 estável em 2026

**Iterator helpers** (TC39 Stage 4, ES2025; V8 13.0 Q4 2024). Métodos prototípicos em iteradores: `.map()`, `.filter()`, `.take()`, `.drop()`, `.flatMap()`, `.reduce()`, `.toArray()`, `.forEach()`, `.some()`, `.every()`. Diferença crítica vs Array: lazy. Chain de transformações não materializa intermediários — só consome quando o sink puxa.

```ts
// Materializa 3 arrays intermediários (1M elements cada) — O(n) memory
const result = Array.from({ length: 1_000_000 }, (_, i) => i)
  .map(x => x * 2)
  .filter(x => x % 3 === 0)
  .slice(0, 10);

// Iterator helpers: lazy, zero arrays intermediários
function* range(n: number) { for (let i = 0; i < n; i++) yield i; }
const result2 = range(1_000_000)
  .map(x => x * 2)
  .filter(x => x % 3 === 0)
  .take(10)
  .toArray(); // só aqui materializa, com 10 elementos
```

**`Promise.withResolvers()`** (ES2024). Substitui o pattern imperativo de declarar `resolve`/`reject` fora do construtor:

```ts
// Antigo
let resolve: (v: string) => void, reject: (e: Error) => void;
const p = new Promise<string>((res, rej) => { resolve = res; reject = rej; });

// ES2024
const { promise, resolve, reject } = Promise.withResolvers<string>();
```

**`Object.groupBy()` / `Map.groupBy()`** (ES2024). Mata `lodash.groupBy`:

```ts
const orders = [{ region: "BR", total: 100 }, { region: "US", total: 50 }, { region: "BR", total: 200 }];
const byRegion = Object.groupBy(orders, o => o.region);
// { BR: [{...}, {...}], US: [{...}] }
```

**`Array.prototype.findLast()` + `findLastIndex()`** (ES2023, ubíquos em 2026).

**RegExp `/v` flag** (ES2024). Set notation, intersection, string properties:

```ts
/[\p{Letter}--\p{ASCII}]/v.test("ç"); // true (letras não-ASCII)
/[\p{Greek}&&\p{Letter}]/v.test("α"); // true (intersection)
/\p{RGI_Emoji}/v.test("🇧🇷"); // true (string property, multi-codepoint)
```

#### ES2025

**Set methods** (TC39 Stage 4): `.union()`, `.intersection()`, `.difference()`, `.symmetricDifference()`, `.isSubsetOf()`, `.isSupersetOf()`, `.isDisjointFrom()`. Substitui hand-rolled com Array+filter+includes (O(n²)) por nativo (O(n)):

```ts
// Antigo: O(n*m) — filter+includes
const intersection = a.filter(x => b.includes(x));

// ES2025: O(n+m) — hash-backed
const a = new Set([1, 2, 3, 4]);
const b = new Set([3, 4, 5, 6]);
const inter = a.intersection(b); // Set { 3, 4 }
const union = a.union(b);        // Set { 1, 2, 3, 4, 5, 6 }
const diff = a.difference(b);    // Set { 1, 2 }
```

**`Promise.try()`** (Stage 4). Wraps função sync ou async em Promise sem ramo extra:

```ts
// Antigo
Promise.resolve().then(() => fn(arg));

// ES2025
Promise.try(fn, arg);
```

**`Float16Array`** (Stage 4). Half-precision (16-bit) pra ML inference no browser, GPU shaders, audio buffers. Reduz memory 50% vs Float32Array com perda controlada.

**`Array.fromAsync()`** (ES2024 final). Coleta async iterable em array — útil pra Server-Sent Events, streams de arquivo, WebSocket buffers:

```ts
const lines = await Array.fromAsync(readSseStream(url));
```

#### Temporal API (TC39 Stage 3, polyfill production-ready 2026)

`Date` é irreparável: timezone bugs, mutável, parser inconsistente. Temporal substitui com tipos imutáveis e timezone-aware. Types: `Temporal.Instant`, `Temporal.PlainDate`, `Temporal.PlainTime`, `Temporal.PlainDateTime`, `Temporal.ZonedDateTime`, `Temporal.Duration`. Polyfill `@js-temporal/polyfill` é maduro e production-ready (TC39 Temporal status 2024). Browser: Firefox em flag 2024, Safari TP 2024, Chromium em discussão 2026.

```ts
import { Temporal } from "@js-temporal/polyfill";

const delivery = Temporal.ZonedDateTime.from({
  year: 2026, month: 5, day: 7, hour: 14, minute: 30,
  timeZone: "America/Sao_Paulo",
});
const eta = delivery.add({ hours: 6, minutes: 15 });
const duration = eta.since(delivery); // Temporal.Duration
console.log(duration.toString()); // PT6H15M
```

#### Symbol.dispose + `using` (Stage 4 — ES2024 explicit resource management)

```ts
class DbConnection {
  constructor() { /* open */ }
  [Symbol.dispose]() { /* close socket */ }
  query(sql: string) { /* ... */ }
}

{
  using conn = new DbConnection();
  conn.query("SELECT 1");
} // dispose() invocado automaticamente at scope exit, mesmo em throw
```

Async version: `Symbol.asyncDispose` + `await using`. TypeScript 5.2+ implementa types; Node 22+ runtime suporta. Hot use cases: DB connections, file handles, mutex locks, Kafka consumers, span tracers.

#### Node 22 LTS (Out 2024) + Node 24 LTS (esperado Out 2026)

Fontes: Node 22 release notes (Out 2024), Node 22.12 changelog.

- **`fetch` GA nativo** (estável desde Node 21, default em Node 22). Mata `node-fetch`, `axios` em scripts simples.
- **`--experimental-strip-types`** (Node 22+). Roda `.ts` direto sem `tsc`/`tsx`/`ts-node` — type annotations stripped. Útil pra scripts e prototyping.
- **`--env-file=.env`** (Node 20.6+, enriquecido em 22). Mata `dotenv` em scripts.
- **`node:test` runner estável** (Node 20.x → 22 LTS). `node --test` substitui Jest/Vitest pra suites simples — TAP output, paralelo, fixtures via `before`/`after`.
- **Permission Model** (Node 20+ experimental, melhorado em 22). `--experimental-permission --allow-fs-read=/etc --allow-net=api.example.com`. Sandbox-style; restringe blast radius.
- **WebSocket client built-in** (Node 22+). `new WebSocket(url)` sem `ws` package.
- **`require(esm)` estável** (Node 22.12+). `require()` carrega ESM síncrono — encerra dual-package hazard.

```bash
# Roda TS direto + permission model em prod
node --experimental-strip-types \
     --experimental-permission \
     --allow-fs-read=/app/config \
     --allow-net=api.stripe.com,api.cloudflare.com \
     server.ts
```

#### V8 pipeline 2026 — Maglev + TurboShaft + TurboFan

Fontes: V8 blog "Maglev" (Ago 2023), V8 blog "TurboShaft" (Mai 2024).

1. **Ignition** — interpreter, primeiro tier. Bytecode direto, zero compile cost.
2. **Sparkplug** (V8 9.x+) — baseline non-optimizing JIT. Tier-up rápido do Ignition.
3. **Maglev** (V8 11.7+, Ago 2023) — mid-tier optimizing JIT. ~2x compile speed do TurboFan, ~75% peak performance. Default pra hot functions.
4. **TurboFan → TurboShaft** (transição 2023-2025) — TurboShaft é IR nova, mais maintainable, AOT-friendly. GA por etapas, substitui TurboFan como top tier.

Implicação prática: cold start reduzido (Sparkplug/Maglev fast tier-up); steady-state mantém ou melhora (TurboShaft). Afeta TTI, INP, throughput de servidor.

#### Bun 1.2+ (JavaScriptCore, JIT da Apple) 2026

Bun 1.2 (changelog 2024-2025) é alternative production-ready a Node — `bun install` ~30x mais rápido que `npm install`, native bundler, native TypeScript runner, native test framework. Limitações: npm compat ~95%, alguns native modules (canvas, sharp antigo) quebram. Use cases: prototyping, CI runner (cold start fast), edge runtime. Não substitui Node em prod pra serviços B2B críticos sem CI compat test.

#### Deno 2.0 (Out 2024) + Deno 2.x 2026

Standards-aligned (Web APIs primeiro). `deno.json` substitui `package.json`. `deno install npm:react` resolve npm. Built-in TypeScript, lint, fmt, test, coverage. Permission runtime nativo. Use cases: edge functions (Deno Deploy), serverless, scripting.

#### Anti-patterns (10)

1. Custom Date utility code em 2026 — Temporal pronto via polyfill; `date-fns`/`dayjs` são bridge pra deprecation.
2. `import { groupBy, uniq } from "lodash"` — `Object.groupBy`, `Set` ops nativos.
3. `try/finally` manual pra cleanup — `using` é declarativo e à prova de throw.
4. `tsx`/`ts-node` em scripts simples — Node 22 `--experimental-strip-types` resolve.
5. Jest em projetos novos onde `node:test`/Vitest cobrem — Jest config overhead crescente, ESM ainda problemático.
6. `RegExp` sem `/u` ou `/v` em 2026 — Unicode quebrado por padrão (surrogate pairs, `\p{}`).
7. `Array.from(generator()).map().filter()` — materializa intermediários; usa Iterator helpers lazy.
8. `dotenv` em scripts — Node 20.6+ tem `--env-file` nativo.
9. Polyfill de `fetch` em Node — built-in desde Node 18, GA em 21.
10. Bun em prod sem CI compatibility test contra Node — algumas libs (sharp, canvas, alguns Prisma engines) quebram silently.

#### Logística aplicada

Backend Node 22 LTS roda `--experimental-permission --allow-net=api.stripe.com,api.cloudflare.com --allow-fs-read=/app/config` pra restringir blast radius de execução suspeita. Ingestor de GPS processa SSE stream com Iterator helpers (`.take()`, `.filter()`, `.map()`) lazy — zero intermediários em fluxo de 50k events/s. Kafka consumer usa `await using consumer = await kafka.connect(...)` (`Symbol.asyncDispose` cleanup automático em throw ou cancel). Datas de entrega em `Temporal.ZonedDateTime` com timezone explícito (cross-region: BR São Paulo, AR Buenos Aires, CL Santiago) — elimina classe inteira de bugs DST.

#### Cruza com

- `01-08` — TS type system, `using`/`Symbol.dispose` types em TS 5.2+.
- `02-04` — React 19+ usa Iterator helpers internamente em transitions e Suspense.
- `02-07` — Node.js internals, V8 pipeline e event loop interaction.
- `03-02` — Docker base image Node 22 LTS slim/alpine.
- `03-09` — frontend perf, V8 optimization tiers afetam INP e TTI.

---

## 3. Threshold de Maestria

Pra passar o **Portão Conceitual**, sem consultar:

- [ ] Desenhar o pipeline V8: Parser → AST → Ignition (bytecode) → TurboFan (otimizado), com setas de deopt.
- [ ] Explicar **hidden classes** e dar caso onde código vira "megamorphic".
- [ ] Explicar a ordem exata de saída deste código:
  ```javascript
  console.log(1);
  setTimeout(() => console.log(2));
  Promise.resolve().then(() => console.log(3));
  console.log(4);
  ```
- [ ] Reproduzir o **bug do `var` em loop** e listar 3 soluções.
- [ ] Explicar `[1,2,3] + [4,5,6]` passo a passo (ToPrimitive → toString → concat).
- [ ] Desenhar a **prototype chain** de `Dog extends Animal extends Object`.
- [ ] Listar as 6 formas de chamada com `this` correspondente.
- [ ] Distinguir **macrotask** vs **microtask** com 3 exemplos cada.
- [ ] Explicar como `await` é desugarado pra `.then`.
- [ ] Explicar **closure** com exemplo de leak.
- [ ] Dar caso onde **WeakMap** é melhor que `Map`.
- [ ] Distinguir **ESM** vs **CJS** com 3 diferenças (resolve, sync vs async, tree shaking).

---

## 4. Desafio de Engenharia

**Implementar `MyPromise` (Promise A+ compliant) do zero.**

### Especificação

Você vai construir uma reimplementação de `Promise` que passa o test suite oficial **Promises/A+** ([promisesaplus.com](https://promisesaplus.com/)).

1. `MyPromise<T>` com:
   - Constructor: `new MyPromise((resolve, reject) => ...)`.
   - State machine: `pending → fulfilled` ou `pending → rejected`. Transição **única**, irreversível.
   - `then(onFulfilled?, onRejected?)`: retorna **nova** `MyPromise`. Se callback retorna valor → fulfill; retorna promise → unwrap; throw → reject.
   - `catch(onRejected)`: shorthand.
   - `finally(onFinally)`.
2. **Microtask scheduling**: callbacks de `then` rodam em **microtask** (use `queueMicrotask` em Node ou `MutationObserver` no browser; **não use `setTimeout`**).
3. Métodos estáticos:
   - `MyPromise.resolve(value)`
   - `MyPromise.reject(reason)`
   - `MyPromise.all(iterable)`, todos resolvem ou primeiro reject.
   - `MyPromise.allSettled(iterable)`, espera todos, retorna array de `{status, value/reason}`.
   - `MyPromise.race(iterable)`, primeiro a settle (resolve ou reject).
   - `MyPromise.any(iterable)`, primeiro a resolve, ou `AggregateError` se todos reject.
4. Suite de testes oficial: rode `promises-aplus-tests` com adapter (instruções em [github.com/promises-aplus/promises-tests](https://github.com/promises-aplus/promises-tests)). **Todos os testes têm que passar.**

### Restrições

- TS estrito (`strict: true`).
- Sem libs externas (apenas `vitest` + `promises-aplus-tests` pra rodar suite).
- Implementação clara, sem hacks (nada de `setTimeout(0)` pra microtask).

### Threshold

- **Promise A+ test suite passa 100%**.
- Você consegue **explicar o algoritmo** de `[[Resolve]]` (a parte mais sutil, quando callback retorna outra Promise/thenable, precisa unwrap recursivamente sem loop infinito).
- Documenta no README:
  - Diagrama da state machine.
  - Como evita memory leak quando muitas `.then` em chain.
  - Por que `queueMicrotask` e não `setTimeout(0)`.
  - Diferença com Promise nativa (você implementou subset; o que falta?).

### Stretch goals

- Implementar **`AbortController` / `AbortSignal` integration** (cancelamento).
- **Async iterator** support (`for await ... of`).
- Comparar performance com Promise nativa em benchmark (vai perder; explique por quê).

---

## 5. Extensões e Conexões

- **Conecta com [01-02, OS](01-02-operating-systems.md):** event loop é construído sobre `epoll`/`kqueue`/`IOCP` via libuv. Microtasks rodam em user space; macrotasks são frequentemente acionadas por syscalls completas.
- **Conecta com [01-04, Data Structures](01-04-data-structures.md):** queues de tasks são FIFO. V8 usa hash maps internos, hidden classes são layout structs.
- **Conecta com [01-06, Paradigmas](01-06-programming-paradigms.md):** closures = núcleo de FP em JS. Promises são monads. Classes ES6 são açúcar sobre prototypes.
- **Conecta com [01-08, TypeScript](01-08-typescript-type-system.md):** TS adiciona tipos sobre tudo aqui. Generics, conditional types, type guards.
- **Conecta com [02-04, React Deep](../02-plataforma/02-04-react-deep.md):** Hooks dependem de closures. Reconciliação roda em microtasks. Suspense joga com Promise/throw conventions.
- **Conecta com [02-07, Node.js Internals](../02-plataforma/02-07-nodejs-internals.md):** event loop fases, libuv, streams, buffers, extensão deste módulo.

### Ferramentas satélites

- **Node `--inspect-brk` + Chrome DevTools**: debugger.
- **`--trace-gc`**: log de GC.
- **`--prof` + `--prof-process`**: profiling V8.
- **[clinic.js](https://clinicjs.org/)**: profiler high-level.
- **[0x](https://github.com/davidmarkclements/0x)**: flamegraph instantâneo.

---

## 6. Referências de Elite

### Livros canônicos
- **You Don't Know JS Yet** (Kyle Simpson, 2nd ed), free em [github.com/getify/You-Dont-Know-JS](https://github.com/getify/You-Dont-Know-JS). Vols 1, 2 (Scope & Closures), 4 (Sync & Async). **Obrigatório.**
- **JavaScript: The Definitive Guide** (Flanagan, 7th ed), referência completa.
- **Effective TypeScript** (Vanderkam), pra 02-08 mas relevante.

### Specs
- **[ECMA-262](https://tc39.es/ecma262/)**: spec JS. Seções 6 (types), 8 (executable code), 25 (control abstraction).
- **[TC39 Proposals](https://github.com/tc39/proposals)**: futuro JS.

### V8 / engine internals
- **[V8 blog](https://v8.dev/blog)**: esp. posts de Mathias Bynens, Benedikt Meurer.
- **[Hidden Classes](https://v8.dev/blog/hidden-classes)**: official V8 explainer.
- **[Inline Caches](https://mathiasbynens.be/notes/shapes-ics)**: Mathias Bynens.

### Talks
- **["What the heck is the event loop anyway?"](https://www.youtube.com/watch?v=8aGhZQkoFbQ)**: Philip Roberts, JSConf EU 2014. **Obrigatória.**
- **["In The Loop"](https://www.youtube.com/watch?v=cCOL7MC4Pl0)**: Jake Archibald, JSConf.Asia 2018. Mais profunda.
- **["JavaScript Engines: The Good Parts"](https://www.youtube.com/watch?v=5nmpokoRaZI)**: Mathias Bynens & Marja Hölttä.

### Repos
- **[V8](https://github.com/v8/v8)**: `src/builtins/`, `src/objects/`.
- **[Node](https://github.com/nodejs/node)**: `lib/internal/`.
- **[promises-aplus-tests](https://github.com/promises-aplus/promises-tests)**: suite pra você passar.
- **[type-challenges](https://github.com/type-challenges/type-challenges)**: exercitar TS.

### Comunidade
- **[JavaScript Weekly](https://javascriptweekly.com/)**.
- **r/javascript** filtro 'top week'.
- **[Frontend Masters Blog](https://frontendmasters.com/blog/)**: alguns posts de elite.

---

**Encerramento:** 01-07 é o módulo que **separa** quem escreve JS de quem **entende** JS. Depois dele, frameworks deixam de ser caixas mágicas. Você passa a ler código de libs, debug em DevTools, e otimizar V8 com base em sinais reais.
