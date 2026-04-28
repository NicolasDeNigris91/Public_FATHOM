---
module: N06
title: Paradigmas de Programação — Imperativo, OO, Funcional
stage: novice
prereqs: [N04, N05]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# N06 — Paradigmas de Programação

## 1. Problema de Engenharia

Um paradigma é um **modo de pensar** sobre programa. Cada um tem assumptions diferentes sobre o que é dado, computação, e estado. Linguagens encorajam um paradigma (Haskell = funcional puro, Java = OO clássico) mas a maioria moderna é **multi-paradigma** (TS, JS, Python, Rust).

Não dominar paradigmas significa que:
- Você usa OO em problema funcional → código complicado com **classes desnecessárias** que viram baggage.
- Você usa funcional em problema imperativo → código difícil de seguir com pipelines monstruosos quando um for-loop resolve.
- Você não sabe quando um problema **inerentemente** pede composição funcional (transformação de dados) vs OO (entidades com identidade e estado) vs imperativo (orquestração de passos).

O ponto: **não escolher um paradigma como religião**. Escolher por **problema**. Pra isso você precisa entender os 3 profundamente.

---

## 2. Teoria Hard

### 2.1 Imperativo

**Princípio:** programa é uma sequência de **comandos** que **modificam estado**. Modelo do hardware nu.

```typescript
let total = 0;
for (let i = 0; i < items.length; i++) {
  total += items[i].price;
}
```

- Variáveis são "células de memória" que mudam.
- Controle de fluxo: `if`, `while`, `for`, `goto` (raramente hoje).
- Estado é o **rei**.

**Bom em:** algoritmos com loops, manipulação de baixo nível, hot paths onde controle explícito de memória/operações importa.

**Ruim em:** quando você quer **descrever** uma transformação sem se preocupar com como (composição funcional resolve melhor), ou modelar entidades com comportamento (OO resolve melhor).

**Procedural:** subset de imperativo onde código é organizado em **procedimentos** (funções com efeito), com escopo lexical mas sem objetos. C clássico.

### 2.2 Orientado a Objetos (OO)

**Princípio:** programa é coleção de **objetos** que se comunicam por **mensagens** (chamadas de método). Cada objeto tem **estado** (atributos) e **comportamento** (métodos).

```typescript
class Order {
  constructor(private items: OrderItem[]) {}

  total(): number {
    return this.items.reduce((sum, i) => sum + i.subtotal(), 0);
  }

  addItem(item: OrderItem): void {
    this.items.push(item);
  }
}
```

**4 conceitos canônicos:**
1. **Encapsulamento**: estado interno protegido, acesso via métodos. `private`, `protected`, `public`.
2. **Herança**: `class B extends A` — B é A. Reutiliza implementação. **Cuidado**: herança profunda vira pesadelo. Prefira composição.
3. **Polimorfismo**: mesma interface, comportamento diferente. **Subtype polymorphism** (override de método em subclass) e **parametric polymorphism** (generics).
4. **Abstração**: interface oculta implementação.

**SOLID** (Robert Martin):
- **S — Single Responsibility**: classe tem uma razão pra mudar.
- **O — Open/Closed**: aberta pra extensão, fechada pra modificação.
- **L — Liskov Substitution**: subclasse deve ser usável como superclasse sem surpresas.
- **I — Interface Segregation**: muitas interfaces pequenas > poucas grandes.
- **D — Dependency Inversion**: depender de abstrações, não de concretos.

SOLID é guia, não dogma. Aplicado mecanicamente vira boilerplate.

**Composition over Inheritance**: regra cardinal. `class Bird extends Animal` cria árvore rígida; `class Bird { constructor(private fly: FlyBehavior) {} }` é flexível.

**Design Patterns** (Gang of Four):
- Creational: Factory, Builder, Singleton, Prototype.
- Structural: Adapter, Decorator, Facade, Composite, Proxy.
- Behavioral: Observer, Strategy, Command, Iterator, Visitor, State, Template Method.

Conheça os **nomes** (vocabulário), aplique com parcimônia. **Singleton** é frequentemente anti-padrão (estado global disfarçado).

**Críticas legítimas a OO clássico:**
- Estado mutável distribuído é difícil de razoar e debugar.
- Herança vs composição: linguagens novas (Go, Rust) não têm herança e não sentem falta.
- "Tudo é objeto" obriga estruturas naturais a virarem classes (`MathHelper.add(1, 2)`).

### 2.3 Funcional

**Princípio:** programa é **composição de funções**. Funções são **first-class** (podem ser passadas, retornadas, armazenadas). Estado é evitado ou explicitamente isolado.

**Conceitos centrais:**

#### Funções puras
Mesma entrada → mesma saída. Sem efeitos colaterais (não muda variáveis fora, não faz I/O).

```typescript
// pura
const add = (a: number, b: number) => a + b;

// impura (efeito colateral: muta arr)
function impureSort(arr: number[]) { arr.sort(); }
```

**Vantagens de funções puras:**
- Fáceis de testar (nada externo a mockar).
- Fáceis de compor (saída de uma é entrada de outra).
- **Memoizáveis** (memoization é safe).
- **Paralelizáveis** sem race condition.
- **Refatoráveis** (substituição equacional).

#### Imutabilidade
Dados não mudam. Operações retornam **novos** dados.

```typescript
const arr = [1, 2, 3];
const novo = [...arr, 4]; // arr não muda
```

**Vantagens:** raciocínio mais simples, undo gratuito, concorrência fácil.
**Custo:** alocação. Estruturas persistentes (`Immutable.js`, `immer`) usam **structural sharing** pra mitigar.

#### Higher-order functions (HOFs)
Funções que recebem ou retornam funções.

```typescript
const compose = <A, B, C>(f: (b: B) => C, g: (a: A) => B) => (a: A) => f(g(a));
```

`map`, `filter`, `reduce` são HOFs.

#### Currying e application parcial
```typescript
const add = (a: number) => (b: number) => a + b;
const add5 = add(5); // partial
add5(3); // 8
```

#### Composição
```typescript
const transform = pipe(
  filter(x => x > 0),
  map(x => x * 2),
  reduce((sum, x) => sum + x, 0),
);
```

#### Mônadas (conceito difícil mas central)
Tipo que **encapsula** computação com estrutura. Define `unit` (lift valor) e `bind` (encadear). Exemplos:
- `Promise` (encapsula computação assíncrona)
- `Optional`/`Maybe` (valor ou nada)
- `Either`/`Result` (sucesso ou erro)
- `Array` (zero ou mais valores)

Exemplo `Maybe`:
```typescript
type Maybe<T> = { kind: 'just'; value: T } | { kind: 'nothing' };

const map = <A, B>(m: Maybe<A>, f: (a: A) => B): Maybe<B> =>
  m.kind === 'just' ? { kind: 'just', value: f(m.value) } : m;

const flatMap = <A, B>(m: Maybe<A>, f: (a: A) => Maybe<B>): Maybe<B> =>
  m.kind === 'just' ? f(m.value) : m;
```

`flatMap` (também chamado `bind`/`>>=`) é a operação **monádica** chave. Permite encadear sem unwrapping/wrapping manual.

#### Lazy evaluation
Computar só quando necessário. Permite estruturas infinitas (lista de todos primos), curto-circuito, performance via fusão.

```typescript
function* naturals() {
  let i = 0;
  while (true) yield i++;
}
// generator é lazy: gera valor por valor, sob demanda
```

#### Algebraic Data Types (ADTs)
**Sum types** (`tipo A | tipo B`) e **product types** (`{ x: A, y: B }`). Combinados, modelam domínio com precisão.

```typescript
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number }
  | { kind: 'rectangle'; width: number; height: number };

const area = (s: Shape): number => {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2;
    case 'square': return s.side ** 2;
    case 'rectangle': return s.width * s.height;
  }
  // TS conhece exhaustiveness — sem default, erro se case faltar.
};
```

**Pattern matching** (em TS via `switch` + discriminated union; em Rust/Haskell nativamente) é o pão da programação funcional moderna.

#### Pure FP vs FP-style
Linguagens **puras** (Haskell, PureScript) **proíbem** efeitos sem encapsulamento monádico.
Linguagens **multi-paradigma** (JS, TS, Scala, Rust) permitem **estilo funcional** sem rigor total — escolher quando vale.

### 2.4 Reativo (Reactive Programming)

Subset/extensão funcional. Programa é **fluxo de eventos** (Observable). Operadores transformam fluxos.

```typescript
import { fromEvent } from 'rxjs';
import { map, filter, debounceTime } from 'rxjs/operators';

fromEvent(input, 'input')
  .pipe(
    map(e => e.target.value),
    debounceTime(300),
    filter(q => q.length > 2),
  )
  .subscribe(query => doSearch(query));
```

Bom pra UI, eventos, streams, jogos. RxJS, RxJava, ReactiveX são bibliotecas de referência. **React Hooks** tem inspiração reativa.

### 2.5 Lógico, restrições, dataflow (mencionar pra reconhecer)

- **Programação lógica** (Prolog): você declara fatos e regras; engine deriva. Nicho hoje (sistemas baseados em regras, planning).
- **Constraint programming** (MiniZinc, Choco): definir restrições, solver encontra. Relevante pra otimização.
- **Dataflow** (Lustre, ESC, parts of TensorFlow): programa = grafo de operações sobre streams.

### 2.6 Quando usar o quê (heurísticas)

| Problema | Paradigma natural |
|---|---|
| Loop apertado, otimização baixa | Imperativo |
| Pipeline de transformação de dados | Funcional |
| Modelar entidades com identidade e ciclo de vida | OO (com cuidado) |
| Sistema de eventos | Reativo / FP |
| Concorrência sem locks | FP (imutável) ou actor model |
| Algoritmos clássicos (sort, search) | Imperativo (loops) ou FP (recursão) |
| Domínios complexos (DDD) | OO + FP (entidades OO; pipelines FP) |
| UI declarativa | FP (React funcional) |

Em **TypeScript moderno**, a regra prática:
- **FP por padrão**: funções puras, dados imutáveis, composição.
- **Classes** quando há **identidade** (entidade DDD), **invariantes complexas** ou polimorfismo de comportamento.
- **Imperativo localizado** em hot paths.

### 2.7 First-class functions, closures, escopo léxico

**First-class:** funções podem ser:
- Passadas como argumento
- Retornadas
- Armazenadas em variáveis/estruturas

**Closure:** função + ambiente léxico capturado. Em JS:
```typescript
function counter() {
  let count = 0;          // capturada
  return () => ++count;   // closure sobre count
}
const c = counter();
c(); c(); c(); // 1, 2, 3
```

Closures explicam: módulos com estado privado, factories, callbacks com contexto. Aprofundamento em [N07](N07-javascript-deep.md).

---

## 3. Threshold de Maestria

Pra passar o **Portão Conceitual**, sem consultar:

- [ ] Distinguir **imperativo, OO e funcional** com exemplos curtos do mesmo problema nos 3 paradigmas.
- [ ] Listar **SOLID** com explicação curta de cada princípio.
- [ ] Dar **contraexemplo** onde herança causa problema (ex: Liskov violation).
- [ ] Definir **função pura** e listar 4 propriedades dela.
- [ ] Explicar **closure** com exemplo de captura de variável.
- [ ] Dar pelo menos 2 exemplos de **monad** em JS/TS (Promise, Maybe, Either, Array).
- [ ] Distinguir **map, filter, reduce, flatMap** e dar caso de uso de cada.
- [ ] Explicar **ADTs** (sum + product types) com exemplo TS de `Shape`.
- [ ] Dar **caso de uso** onde imutabilidade é prejudicial (custo de alocação alto, performance crítica).
- [ ] Listar 5 design patterns clássicos e quando cada um se aplica.

---

## 4. Desafio de Engenharia

**Implementar `Result<T, E>` (sum type) e uma pipeline de validação composicional em TypeScript.**

### Especificação

1. Implemente um tipo `Result<T, E>` (também chamado `Either`):
   ```typescript
   type Result<T, E> =
     | { ok: true; value: T }
     | { ok: false; error: E };
   ```
2. Funções utilitárias:
   - `ok<T>(value: T): Result<T, never>`
   - `err<E>(error: E): Result<never, E>`
   - `map<T, U, E>(r: Result<T, E>, f: (t: T) => U): Result<U, E>`
   - `flatMap<T, U, E>(r: Result<T, E>, f: (t: T) => Result<U, E>): Result<U, E>`
   - `mapErr<T, E, F>(r: Result<T, E>, f: (e: E) => F): Result<T, F>`
   - `combine<E>(...results: Result<unknown, E>[]): Result<unknown[], E[]>` — agrega múltiplos, retorna lista de erros se algum falhou.
3. Construa um **validador composicional** pra um `Order` de logística:
   ```typescript
   type Order = {
     customerId: string;
     items: Array<{ sku: string; qty: number; price: number }>;
     deliveryAddress: { lat: number; lng: number };
     deadline: Date;
   };
   ```
   Regras:
   - `customerId` não vazio, formato UUID v4.
   - `items` não vazio, cada item: `qty > 0`, `price > 0`, `sku` matches `^[A-Z0-9-]+$`.
   - `deliveryAddress`: lat ∈ [-90, 90], lng ∈ [-180, 180].
   - `deadline` no futuro.
4. Use **só `Result` + composição** — sem `throw`/`try/catch` no caminho de validação.
5. Erros devem ser **estruturados** (objects com `field`, `code`, `message`), agregados (não para no primeiro).

### Restrições

- **Não use Zod, yup, joi.** Você está implementando os primitivos.
- Sem libs externas (exceto `vitest`/`jest` pra testes).
- Suite de testes cobrindo cada regra + casos felizes + casos com múltiplos erros.

### Threshold

- API limpa, types corretos.
- **Composição funcional explícita**: validators são funções `(input) => Result<output, errors[]>`, combinadas por `combine`/`flatMap`.
- Documenta no README:
  - Por que `Result` é melhor que `throw`/`try/catch` em domínio de validação?
  - Trade-offs com Zod (Zod tem inferência de schema; Result-style é mais explícito).
  - Como o tipo `never` no return de `ok`/`err` ajuda inferência.

### Stretch goals

- Adicionar **`Validation<T, E>` applicative** (variante do Result que **acumula** erros automaticamente em sequência, sem precisar de `combine` explícito).
- Suportar **validadores async** (que fazem fetch a outro serviço): `AsyncResult<T, E>`.

---

## 5. Extensões e Conexões

- **Conecta com [N07 — JavaScript Deep](N07-javascript-deep.md):** closures, prototype chain, this binding sustentam OO em JS.
- **Conecta com [N08 — TypeScript Type System](N08-typescript-type-system.md):** ADTs com discriminated unions são sintaxe pra sum types. `never` é o bottom type. Conditional types simulam computação em tipos.
- **Conecta com [A04 — React Deep](A04-react-deep.md):** React funcional moderno é FP-styled. Hooks são closures. State é imutável (não muta — substitui).
- **Conecta com [S03 — Event-Driven](S03-event-driven-patterns.md):** Event Sourcing é literally append-only log de eventos imutáveis (FP friendly).
- **Conecta com [S06 — DDD](S06-domain-driven-design.md):** Aggregates são objetos OO com invariantes; Value Objects são estruturas imutáveis funcionais; Domain Events são puros.
- **Conecta com [P11 — Systems Languages](P11-systems-languages-go-rust.md):** Rust força imutabilidade default e ownership — paradigma funcional + manual.

### Ferramentas satélites

- **[fp-ts](https://github.com/gcanti/fp-ts)** — biblioteca FP completa pra TypeScript (Option, Either, Task, etc).
- **[Effect](https://effect.website/)** — sucessor moderno do fp-ts.
- **[Ramda](https://ramdajs.com/)** — utility lib FP-style.
- **[immer](https://immerjs.github.io/immer/)** — imutabilidade com sintaxe mutável.

---

## 6. Referências de Elite

### Livros canônicos
- **Structure and Interpretation of Computer Programs** (SICP) — free em [web.mit.edu/6.001/6.037/sicp.pdf](https://web.mit.edu/6.001/6.037/sicp.pdf). Funcional + interpreters. **Imprescindível.**
- **Crafting Interpreters** (Robert Nystrom) — free em [craftinginterpreters.com](https://craftinginterpreters.com/). Implementa 2 linguagens.
- **Design Patterns: Elements of Reusable OO Software** (Gang of Four) — clássico OO.
- **Clean Code** (Robert Martin) — controverso mas vocabulário relevante.
- **Functional Programming in TypeScript** ([gcanti.github.io](https://gcanti.github.io/fp-ts/)).
- **Programming Erlang** (Joe Armstrong) — actor model, concorrência funcional.
- **A Philosophy of Software Design** (Ousterhout) — curto, brilhante. Sobre módulos, interface, abstração.

### Artigos canônicos
- **["On the Criteria To Be Used in Decomposing Systems into Modules"](https://www.cs.umd.edu/class/spring2003/cmsc838p/Design/criteria.pdf)** — David Parnas, 1972. Fundamento de modularidade.
- **["Out of the Tar Pit"](http://curtclifton.net/papers/MoseleyMarks06a.pdf)** — Moseley & Marks, 2006. Crítica devastadora de complexidade incidental em OO + defesa de FP.
- **["The Bitter Lesson"](http://www.incompleteideas.net/IncIdeas/BitterLesson.html)** — Sutton.
- **["Composition: a way to make programs simpler"](https://www.youtube.com/watch?v=LKtk3HCgTa8)** — Rich Hickey.

### Talks
- **["Simple Made Easy"](https://www.youtube.com/watch?v=LKtk3HCgTa8)** — Rich Hickey. **Obrigatória.**
- **["The Value of Values"](https://www.youtube.com/watch?v=-6BsiVyC1kM)** — Rich Hickey.
- **["Hammock Driven Development"](https://www.youtube.com/watch?v=f84n5oFoZBc)** — Rich Hickey.
- **["The Last Programming Language"](https://www.youtube.com/watch?v=P2yr-3F6PQo)** — Robert Martin (FP).

### Repos
- **[ramda](https://github.com/ramda/ramda)** — FP utilities, código pra ler.
- **[fp-ts](https://github.com/gcanti/fp-ts)**.
- **[Effect](https://github.com/Effect-TS/effect)** — FP TS moderno.
- **[Rust standard library](https://github.com/rust-lang/rust/tree/master/library)** — código em estilo OO+FP misturado, sem herança.

### Comunidade
- **[r/functionalprogramming](https://www.reddit.com/r/functionalprogramming)**.
- **[Lambda the Ultimate](http://lambda-the-ultimate.org/)** — fórum acadêmico de PL theory.

---

**Encerramento:** após N06 você para de escolher paradigma por inércia. Cada decisão de design (classe vs função, mutável vs imutável, herança vs composição) vira uma escolha consciente baseada no problema.
