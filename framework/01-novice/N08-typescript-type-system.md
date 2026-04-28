---
module: N08
title: TypeScript Type System — Generics, Inference, Conditional Types, Discriminated Unions
stage: novice
prereqs: [N07]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# N08 — TypeScript Type System

## 1. Problema de Engenharia

TypeScript não é "JS com `:string` aqui e ali". É um **sistema de tipos completo**, com computação em compile-time, capaz de modelar invariantes complexas e prevenir bugs na compilação. Devs medianos usam ~10% do que o TS oferece. O resto distingue Senior de Pleno.

Entender TS profundamente significa:
- Você modela domínio com **discriminated unions** e elimina classes de bugs.
- Você usa **generics** pra escrever lib reutilizável sem `any`.
- Você escreve **type guards** que estreitam tipos com base em runtime.
- Você consegue implementar (ou ler) tipos como os de Zod, Drizzle, tRPC — bibliotecas que **fazem mágica em compile time**.
- Você lê erros do TS sem se perder em "Type X is not assignable to type Y".

---

## 2. Teoria Hard

### 2.1 Filosofia: structural typing

TS é **structural** (estrutural), não nominal. Dois tipos com mesma forma são **compatíveis** mesmo que de origem diferente.

```typescript
type Point = { x: number; y: number };
type Vector = { x: number; y: number };

const p: Point = { x: 1, y: 2 };
const v: Vector = p; // OK — mesma forma
```

Java é **nominal**: `class A` e `class B` com mesma estrutura são incompatíveis. TS não.

**Implicação:** "duck typing" formalizado. Se anda como pato, é pato.

### 2.2 Tipos básicos e literais

**Tipos primitivos:** `number`, `string`, `boolean`, `bigint`, `symbol`, `null`, `undefined`, `void`, `never`, `any`, `unknown`.

**`never`**: bottom type. Subtipo de tudo. Resultado de função que nunca retorna (`throw`, loop infinito).
```typescript
function fail(msg: string): never { throw new Error(msg); }
```

**`unknown`**: top type seguro. Tem que estreitar antes de usar.
```typescript
const x: unknown = JSON.parse('...');
if (typeof x === 'string') x.toUpperCase(); // OK
x.toUpperCase(); // erro
```

**`any`**: top type **inseguro**. Aceita qualquer operação. **Use raramente** — é "desligar o type checker" pontualmente.

**`void`**: ausência de retorno (function), mas não exatamente `undefined`. Tipo retorno `void` aceita função que retorna qualquer coisa (intencional pra callbacks).

**Tipos literais:**
```typescript
type Yes = 'yes';
type Status = 'idle' | 'loading' | 'success' | 'error';
type Code = 200 | 400 | 500;
```

Combinados com union, modelam estados.

### 2.3 Union, intersection

**Union (`|`)**: A ou B.
```typescript
type ID = string | number;
```

**Intersection (`&`)**: A e B (todas propriedades).
```typescript
type Person = { name: string };
type Employee = { id: number };
type EmployeePerson = Person & Employee;
```

**Discriminated union (tagged union):** sum type com campo discriminante.
```typescript
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function handle(r: Result<number, string>) {
  if (r.ok) console.log(r.value);   // TS infere number
  else console.log(r.error);         // TS infere string
}
```

**Pattern matching via `switch`** + `never` pra exaustividade:
```typescript
function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2;
    case 'square': return s.side ** 2;
    default:
      const _: never = s; // erro de compilação se faltar caso
      throw new Error('unhandled');
  }
}
```

### 2.4 Generics

Funções/tipos parametrizados.

```typescript
function identity<T>(x: T): T { return x; }
identity<number>(5); // T = number
identity('foo');     // T = string (inferido)

class Box<T> {
  constructor(public value: T) {}
}

type Pair<K, V> = { key: K; value: V };
```

**Constraints:**
```typescript
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
```

`K extends keyof T` força K a ser uma chave de T.

**Default generic:**
```typescript
type ApiResponse<T = unknown> = { data: T };
```

### 2.5 `keyof`, `typeof`, indexed access

**`keyof T`**: union dos nomes das chaves de T.
```typescript
type User = { id: number; name: string };
type UserKey = keyof User; // 'id' | 'name'
```

**`typeof x`**: tipo da expressão (use em valores).
```typescript
const config = { port: 3000, host: 'localhost' };
type Config = typeof config; // { port: number; host: string }
```

**Indexed access `T[K]`**:
```typescript
type IdType = User['id']; // number
```

### 2.6 Mapped types

Tipos derivados iterando sobre keys.

```typescript
type Readonly<T> = { readonly [K in keyof T]: T[K] };
type Partial<T> = { [K in keyof T]?: T[K] };
type Required<T> = { [K in keyof T]-?: T[K] };
type Nullable<T> = { [K in keyof T]: T[K] | null };

type Pick<T, K extends keyof T> = { [P in K]: T[P] };
type Record<K extends keyof any, V> = { [P in K]: V };
```

**Modificadores:** `+readonly`, `-readonly`, `+?`, `-?`. (A maioria são default `+`.)

**Key remapping (TS 4.1+):** `as` cláusula:
```typescript
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
```

### 2.7 Conditional types

Tipos que dependem de condições (ternário em tipo).

```typescript
type IsString<T> = T extends string ? true : false;
type A = IsString<'foo'>; // true
type B = IsString<42>;    // false
```

**`infer`** captura tipo dentro de uma condição:
```typescript
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type R = ReturnType<() => number>; // number

type Awaited<T> = T extends Promise<infer U> ? U : T;
```

**Distributive conditional types:** quando o tipo testado é union, distribui:
```typescript
type ToArray<T> = T extends any ? T[] : never;
type R = ToArray<string | number>; // string[] | number[]
```

Pra evitar distribuição, envolva em tuple: `[T] extends [U]`.

### 2.8 Template literal types

Manipulam strings em tipo:
```typescript
type Greeting<N extends string> = `hello, ${N}`;
type X = Greeting<'world'>; // 'hello, world'

type EventName<E extends string> = `on${Capitalize<E>}`;
type Y = EventName<'click'>; // 'onClick'
```

Combinado com mapped types, permite gerar tipos derivados (gettters, action types em redux).

### 2.9 Type guards e narrowing

**Type guards** estreitam tipos no fluxo do código.

**Narrowing built-in:**
```typescript
function fn(x: string | number) {
  if (typeof x === 'string') x.toUpperCase(); // x: string
  else x.toFixed();                           // x: number
}
```

**`instanceof`**, **`in`**, **discriminant**.

**User-defined type guard:**
```typescript
function isString(x: unknown): x is string {
  return typeof x === 'string';
}

function fn(x: unknown) {
  if (isString(x)) x.toUpperCase(); // narrowed
}
```

**Assertion functions:**
```typescript
function assert(cond: unknown, msg?: string): asserts cond {
  if (!cond) throw new Error(msg);
}
function fn(x: number | undefined) {
  assert(x !== undefined);
  x.toFixed(); // x: number
}
```

### 2.10 Utility types built-in

| Utility | Faz |
|---------|-----|
| `Partial<T>` | Todas optional |
| `Required<T>` | Todas required |
| `Readonly<T>` | Todas readonly |
| `Pick<T, K>` | Subset de keys |
| `Omit<T, K>` | Tudo menos K |
| `Record<K, V>` | Object map |
| `Exclude<T, U>` | Remove U de union T |
| `Extract<T, U>` | Mantém só U de union T |
| `NonNullable<T>` | Remove null/undefined |
| `ReturnType<F>` | Return type de função |
| `Parameters<F>` | Tuple de args |
| `Awaited<T>` | Unwrap Promise |
| `InstanceType<C>` | Type da instância de class |

Implemente cada um manualmente como exercício — fortalece intuição.

### 2.11 Variance: covariance vs contravariance

- **Covariant:** se `Cat extends Animal`, então `Producer<Cat>` é assignável a `Producer<Animal>`. Producers (return).
- **Contravariant:** se `Cat extends Animal`, então `Consumer<Animal>` é assignável a `Consumer<Cat>`. Consumers (args).
- **Bivariant** (default em parameters de método em TS sem `--strictFunctionTypes`): aceita ambos. **Use `--strict` ou `--strictFunctionTypes`** pra checagem correta.

**Regra prática:** function arguments são **contravariant**, returns são **covariant**.

### 2.12 Configuração estrita (`tsconfig.json`)

Ative **sempre**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true
  }
}
```

`noUncheckedIndexedAccess`: `arr[i]` vira `T | undefined`. Reflete realidade.

`exactOptionalPropertyTypes`: distingue `{ x?: T }` de `{ x: T | undefined }`. Importante.

### 2.13 Module resolution e declaration merging

TS suporta **declaration merging**: múltiplas declarações com mesmo nome são unidas.
```typescript
interface User { id: number }
interface User { name: string }
// User: { id, name }
```

Útil pra augmentar libs (`declare module 'express'` adicionando propriedades).

**Module resolution**: `node`, `node10`, `node16`, `nodenext`, `bundler`. Em projeto TS moderno: `nodenext` (ESM correto) ou `bundler` (Vite/esbuild).

### 2.14 Type inference avançada

TS infere muito. Cenários:
- **Function return**: inferido se não declarado.
- **Generic inference**: TS escolhe T baseado em arg.
- **Const assertion (`as const`)**: torna literal.
  ```typescript
  const config = { port: 3000 } as const; // port: 3000 (literal)
  ```
- **`satisfies`** (TS 4.9+): valida tipo sem perder inferência.
  ```typescript
  const colors = {
    red: '#f00',
    green: '#0f0',
  } satisfies Record<string, `#${string}`>;
  // type de colors mantido literal
  ```

### 2.15 Brand types (nominal-like via structural)

TS é structural, mas você pode simular nominal:
```typescript
type UserId = string & { readonly __brand: 'UserId' };
type OrderId = string & { readonly __brand: 'OrderId' };

const uid: UserId = 'abc' as UserId;
const oid: OrderId = uid; // erro — nominal
```

Útil pra prevenir mistura de IDs.

---

## 3. Threshold de Maestria

Pra passar o **Portão Conceitual**, sem consultar:

- [ ] Distinguir **structural** vs **nominal** typing com exemplo TS de "branded types".
- [ ] Explicar `never` como bottom type e dar 3 lugares onde aparece.
- [ ] Distinguir `unknown` de `any` com exemplo de uso seguro.
- [ ] Modelar com **discriminated union** uma `Result<T, E>`.
- [ ] Implementar manualmente `Partial<T>`, `Pick<T, K>`, `Omit<T, K>`.
- [ ] Implementar `ReturnType<F>` usando `infer`.
- [ ] Explicar **distributive conditional types** e como evitar com tuple.
- [ ] Diferença entre **type guard** e **assertion function**.
- [ ] Dar exemplo de **template literal types** gerando event names.
- [ ] Explicar **covariance/contravariance** com exemplo (function parameters vs return).
- [ ] Listar 5 flags de `tsconfig.json` `--strict` e o que cada uma faz.
- [ ] Distinguir **`as const`** vs **`satisfies`** com exemplo.

---

## 4. Desafio de Engenharia

**Implementar um mini Zod-like (validador com inferência de tipos) em TS puro.**

### Especificação

Construa uma lib chamada `zod-mini` com:

1. **Schemas builders:**
   - `z.string()`, `z.number()`, `z.boolean()`, `z.literal(value)`
   - `z.object({ ... })` — schema de objeto
   - `z.array(schema)`
   - `z.union([s1, s2])` — schema A ou B
   - `z.optional(schema)` — `T | undefined`
   - `z.tuple([s1, s2, s3])` — schema fixo de tuple
   - `z.record(keyS, valS)`

2. **Refinements:**
   - `s.min(n)`, `s.max(n)`, `s.length(n)` (string/array)
   - `s.regex(re)` (string)
   - `s.email()`, `s.uuid()` (string)
   - `s.int()`, `s.positive()` (number)

3. **API:**
   - `schema.parse(value)`: throw em erro, retorna value typed.
   - `schema.safeParse(value)`: retorna `{ success: true, data } | { success: false, error: ZodError }`.
   - **`z.infer<typeof schema>`**: tipo TS inferido.

4. **Inferência:**
   ```typescript
   const userSchema = z.object({
     id: z.string().uuid(),
     name: z.string().min(1),
     age: z.number().int().min(0).optional(),
     roles: z.array(z.union([z.literal('admin'), z.literal('user')])),
   });

   type User = z.infer<typeof userSchema>;
   // type User = {
   //   id: string;
   //   name: string;
   //   age?: number;
   //   roles: ('admin' | 'user')[];
   // }
   ```

5. **Erros estruturados** (path + code + message), agregados (todos erros, não para no primeiro).

### Restrições

- **TS 5.x estrito.**
- Sem libs externas (apenas `vitest`).
- A inferência **tem que funcionar de verdade** — type tests com `tsd` ou `expectType`.

### Threshold

- API typesafe: usar `parse` retorna tipo correto sem `as`.
- Inferência funciona pra schemas profundamente aninhados.
- Cobre todos cases nos testes (~30 testes).
- Documenta:
  - Trick principal: como a inferência funciona (associated type via class generics + conditional types).
  - Por que `z.literal('admin')` mantém tipo literal (precisa de `<const>`).
  - O que está faltando vs Zod real (transformações, async, refinements custom).

### Stretch goals

- **Transformações:** `z.string().transform(s => s.toUpperCase())` muda tipo.
- **Refinements custom:** `s.refine((v) => predicate(v), 'msg')`.
- **Async parse:** `parseAsync` que faz validações assíncronas.

---

## 5. Extensões e Conexões

- **Conecta com [N06 — Paradigmas](N06-programming-paradigms.md):** ADTs (sum + product) são modelados com discriminated unions. Generics são polymorphism paramétrico.
- **Conecta com [N07 — JavaScript Deep](N07-javascript-deep.md):** TS é estritamente camada de tipos sobre JS — runtime é JS puro.
- **Conecta com [A04 — React Deep](A04-react-deep.md):** Component props com generics, hooks com tipo, RSC com type narrowing através de boundaries.
- **Conecta com [A08 — Backend Frameworks](A08-backend-frameworks.md):** Zod schemas integram com Hono/Fastify pra type safety end-to-end.
- **Conecta com [A10 — ORMs](A10-orms.md):** Drizzle e Prisma usam TS pra inferir schemas do banco.
- **Conecta com [S05 — API Design](S05-api-design-advanced.md):** tRPC usa TS extensivamente pra RPC type-safe.

### Ferramentas satélites

- **[type-challenges](https://github.com/type-challenges/type-challenges)** — exercícios brutais. Faça pelo menos 30.
- **[ts-toolbelt](https://github.com/millsp/ts-toolbelt)** — biblioteca de utilities avançadas.
- **[Type-fest](https://github.com/sindresorhus/type-fest)** — utility types extras.
- **[tsd](https://github.com/tsdjs/tsd)** — testes pra tipos.

---

## 6. Referências de Elite

### Livros canônicos
- **Effective TypeScript** (Dan Vanderkam) — 62 idioms. **Curto e denso.**
- **Programming TypeScript** (Boris Cherny) — sólido.
- **Total TypeScript** (Matt Pocock) — curso pago, mas o autor escreve muito de graça em [totaltypescript.com](https://www.totaltypescript.com/).

### Recursos online
- **[TypeScript Handbook (oficial)](https://www.typescriptlang.org/docs/handbook/intro.html)** — leia inteiro.
- **[TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)** — gratuito, profundo.
- **[Matt Pocock's YouTube](https://www.youtube.com/@mattpocockuk)** — tips diários de TS avançado.

### Repos
- **[TypeScript source](https://github.com/microsoft/TypeScript)** — leia issues marked "easy" pra ver discussão de design.
- **[type-challenges](https://github.com/type-challenges/type-challenges)** — solução de cada desafio é estudo.
- **[Zod source](https://github.com/colinhacks/zod)** — leia `src/types.ts`.
- **[ts-toolbelt source](https://github.com/millsp/ts-toolbelt/tree/master/src)** — masterclass em TS.

### Comunidade
- **[TypeScript Discord](https://discord.gg/typescript)**.
- **[r/typescript](https://www.reddit.com/r/typescript)**.
- **Matt Pocock & Stefan Baumgartner no Twitter/X**.

---

**Encerramento:** após N08 você usa TypeScript como **ferramenta de modelagem**, não só "JS com tipos". Modelagem precisa do domínio em tipos elimina classes inteiras de bugs antes de chegar a runtime.
