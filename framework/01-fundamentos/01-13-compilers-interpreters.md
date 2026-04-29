---
module: 01-13
title: Compilers & Interpreters Fundamentals, Lexing, Parsing, AST, Codegen, JIT
stage: fundamentos
prereqs: [01-06, 01-07]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 01-13, Compilers & Interpreters

## 1. Problema de Engenharia

Você usa V8, Babel, TypeScript Compiler, esbuild, Webpack, Tailwind CLI, Prisma generator, GraphQL codegen, ESLint, prettier todos os dias. Cada uma dessas ferramentas é um **compiler ou interpreter** sob algum aspecto, recebe texto, parseia, transforma, emite. Entender as fases (lex → parse → analyze → optimize → emit) é o que permite ler bug em parser de TS, escrever um plugin de Babel, depurar source maps, ou desenhar uma DSL pra um problema do seu domínio.

Este módulo é a base prática de compiladores e interpretadores: o que é tokenizer, o que é AST, como recursive descent parsing funciona, o que é semantic analysis e tipo inferência, o que é IR (intermediate representation), o que é codegen, e como JITs (V8, JVM HotSpot, .NET) escalam. Ao final você consegue escrever um interpreter completo para uma linguagem de brinquedo e entender por que TypeScript demora 30s pra typecheck repo grande.

---

## 2. Teoria Hard

### 2.1 Pipeline clássico

```
source text
  → lexer (tokenizer)
  → parser → AST
  → semantic analyzer (resolve names, type-check) → annotated AST
  → IR (intermediate representation)
  → optimizer
  → backend (codegen) → bytecode/asm/JS/binário
```

Compilers AOT (gcc, rustc, javac) executam tudo antes da execução. Interpreters podem parar em AST (interpretadores tree-walking) ou bytecode (Python, Ruby antigo). JITs combinam: parse → bytecode → execute, e em hot paths recompila pra código nativo.

### 2.2 Lexing (tokenization)

Pega texto bruto e produz **tokens** (categoria + lexema): `IDENT("foo")`, `NUMBER(42)`, `KEYWORD("if")`, `OP("+")`. Whitespace e comments geralmente são ignorados (com exceções: Python indent é significant; JS ASI olha newline).

Implementação típica: state machine ou regex tabulado. **DFAs** vêm de regex via Thompson construction + subset construction. Lex/flex geram tabelas. Hand-written wins em flexibility (TypeScript usa hand-written).

Edge cases comuns: string escapes, comments aninhados, números em multiple bases, identifiers Unicode, JSX em meio de expressão.

### 2.3 Parsing: gramáticas

Linguagens de programação são tipicamente **context-free** (CFG) na sintaxe (com pequenas violações resolvidas em semantic). Notação BNF/EBNF.

Classes:
- **LL(k)**: top-down, lookahead k. **Recursive descent** (hand-written) é LL(1) com uns lookaheads. Fácil escrever, fácil depurar. JS, TS, Rust, Go usam.
- **LR(1)** (e variantes LALR(1)): bottom-up, mais poderoso. Yacc/bison geram. Postgres parser usa.
- **PEG** (Parsing Expression Grammar): determinística, ordered choice, packrat parsing pode ter backtracking sem explosão.
- **GLR**: arbitrário, suporta ambiguidade. Lento.

Operator precedence (Pratt parsing): técnica elegante pra parsear expressions com precedence/associativity. V8 e muitos parsers modernos usam.

### 2.4 AST (Abstract Syntax Tree)

Estrutura central. Nodes representam constructs (`BinaryOp`, `If`, `FunctionDecl`, `Ident`). Cada node carrega children + span (file/line/col) pra erros.

Diferente de **CST** (Concrete Syntax Tree, parse tree completo com tokens). AST descarta details sintáticos. Linters/formatters preferem CST.

Visitors (visitor pattern, ou pattern matching em Rust/OCaml) percorrem AST. Babel plugins manipulam AST.

### 2.5 Symbol resolution (scopes)

Após parse, percorra AST construindo **scopes** (mapas nome → declaration). Cada `let`, `function`, `import` adiciona symbol. Lookup respeita scope chain.

Hoisting em JS: declarations subem pro topo do scope (vars, function declarations). Let/const têm temporal dead zone.

Erros típicos: identifier not declared, redeclared, used before declaration.

### 2.6 Type checking

Estático: tipo é determinado em compile time, sem rodar.
Dinâmico: tipo só conhecido em runtime (Python, JS).
Gradual: misto (TypeScript, Mypy).

Algoritmo central: **type inference**. Hindley-Milner (ML, OCaml, Haskell) infere principal type sem anotação. TypeScript usa flow-based + bidirectional. Subtyping vs structural typing distingue Java de TypeScript (TS é structural).

Variance: covariance (subtipo em posição de saída), contravariance (em entrada), invariance (mutável). Conhecer evita bugs em generics.

### 2.7 IR (Intermediate Representation)

Transformação 1:1 com semantics, mas mais regular. Tipos comuns:
- **Three-address code**: `t1 = x + y; t2 = t1 * z`.
- **SSA (Static Single Assignment)**: cada variável atribuída uma vez. φ-functions reconciliam em joins de control flow. LLVM IR é SSA. Otimizações ficam triviais em SSA (constant prop, dead code, loop invariant motion).
- **CFG (Control Flow Graph)**: blocks (sequência sem branches internos) + arestas de fluxo.

LLVM popularizou IR como contrato: front-ends emitem LLVM IR, optimizer trabalha em LLVM IR, back-ends emitem nativo. Rust, Swift, Julia, Zig usam LLVM. V8/JVM têm IRs próprios.

### 2.8 Otimizações

- **Constant folding**: `2 + 3` → `5`.
- **Constant propagation**: `let x = 5; y = x + 1;` → `y = 6`.
- **Dead code elimination**: ramos inalcançáveis, vars não usadas.
- **Common subexpression elimination**.
- **Inlining**: substitui call por corpo. Habilita mais otimizações.
- **Loop invariant code motion**.
- **Loop unrolling**.
- **Tail call elimination**.
- **Escape analysis**: aloca em stack o que não escapa do scope (V8, Go).

Trade-off: tempo de compilação vs qualidade do código. `-O0` rápido, `-O3` lento. Profile-guided optimization (PGO) usa traces reais.

### 2.9 Codegen e ABIs

Backend emite código alvo: máquina, bytecode (JVM, .NET CLR, Python), JS, Wasm.

Para nativo: register allocation (graph coloring, linear scan), instruction selection (cobertura de patterns IR → asm), instruction scheduling (reorder pra pipelining).

ABIs (Application Binary Interface) ditam: como passar args (registros vs stack), calling convention, layout de structs, name mangling. Cross-language interop respeita ABI alvo (extern "C").

### 2.10 Garbage Collection (overview)

Linguagens managed precisam GC. Estratégias:
- **Reference counting** (CPython, Swift). Simples, mas cycles vazam. Swift exige weak refs.
- **Mark-sweep**: percorre roots, marca alcançáveis, varre o resto.
- **Generational** (V8, JVM): hipótese de que objetos jovens morrem cedo. Young gen frequente, old gen raro.
- **Concurrent/parallel/incremental**: minimiza pause times. ZGC, Shenandoah.

V8 GC: scavenge (young), mark-compact (old), incremental marking, write barriers.

### 2.11 JIT (Just-In-Time)

Interpretador roda; profila hot paths; recompila em código nativo otimizado. Tiered:
- **Tier 0**: interpreter (Ignition em V8, Sparkplug baseline).
- **Tier 1**: optimizing compiler (TurboFan em V8, OptimizingJIT em JVM C2).
- **Deopt**: assumption violada (objeto mudou shape) → bail out pro interpreter.

Inline caches: lookups de propriedade ficam cached por shape; misses re-lookup. Hidden classes (V8) e shapes (SpiderMonkey) tornam objetos JS rápidos quando shape estabiliza.

Por isso `obj.foo = 1; obj.bar = 2` consistente é mais rápido que `if cond obj.foo = ...`. Adicionar property dinamicamente muda shape e invalida caches.

### 2.12 Source maps

Toolchains modernos (TypeScript, Babel, esbuild, Vite, webpack) emitem source maps: mapeamento posição-no-output → posição-no-source. Permite debugger mostrar source original. Format VLQ (variable-length quantity) pra caber em string.

### 2.13 Macros e metaprogramação

- **C macros**: substituição textual. Frágil.
- **Hygienic macros** (Scheme, Rust): respeitam scopes.
- **Syntax extensions** (Babel plugins, TS transformers): manipulam AST.
- **Compile-time evaluation** (`constexpr` em C++, `comptime` em Zig): código rodando em compile time.

### 2.14 Type erasure vs reified

Java generics usam **erasure**: `List<String>` em runtime é só `List`. Reflection não vê parameter type. C# generics são **reified**: type info preservada em runtime. TypeScript: erasure (compila pra JS sem tipos).

Implicação prática: em Java/TS, runtime checks não podem inspecionar generic type. Workaround: passar `Class<T>` ou `t: new () => T`.

### 2.15 Por que TypeScript demora

TypeScript checker é caro porque:
- Inferência bidirecional explorando alternativas.
- Conditional types e mapped types geram instâncias dinamicamente.
- Variance checking em deep generics.
- Project references e incremental builds amenizam, mas tipo Recursive Distributive em union large explode.

Mitigação: split em projects, usar `tsc --build`, evitar tipos exóticos sem motivo, `skipLibCheck` quando seguro.

### 2.16 DSLs e quando

Internal DSL (chains de método, builders) vs external (parse separado). Casos onde external vence:
- Usuários não-programadores (templating).
- Sintaxe não-cabível em host (SQL, GraphQL).
- Precisa validation/feedback pré-runtime.

Antes de escrever DSL, considere: subset de JSON, YAML com schema, ou config em código host. DSL nova é maintenance burden.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Listar fases canônicas: lex → parse → semantic → IR → optimize → codegen.
- Diferenciar AST e CST, quando cada serve.
- Explicar recursive descent vs LR(1); por que TS escolheu hand-written.
- Explicar SSA e dar uma otimização que fica trivial nele (ex: dead code).
- Diferenciar Hindley-Milner de bidirectional + flow-based (TS).
- Explicar JIT tiered (interpreter → baseline → optimizing) e o que dispara deopt.
- Explicar hidden classes/shapes em V8 e o impacto de shape thrashing.
- Justificar generational GC (hipótese gerational).
- Diferenciar erasure vs reified generics.
- Explicar por que C macros são frágeis e Scheme/Rust hygienic não.
- Explicar source maps e VLQ em uma frase.

---

## 4. Desafio de Engenharia

Construir uma **linguagem de brinquedo "Mini"** com lexer, parser, type-checker e interpreter, escrita em TypeScript.

### Especificação

Mini tem:
- **Tipos**: `int`, `bool`, `string`, `T -> U`, `[T]`, `{ field: T, ... }`.
- **Expressões**: literals, operators (`+ - * / == < && ||`), `if/else`, `let`, lambda, function call, list literal, record literal, field access.
- **Statements**: declaration (`fn name(args): T = expr`), top-level `let`.
- **Type system**: Hindley-Milner-lite (inferência sem polymorphism initially; stretch traz let-polymorphism).

Pipeline:
1. **Lexer**: hand-written, retorna stream de tokens com spans.
2. **Parser**: recursive descent + Pratt pra expressions. Erro com span e mensagem útil.
3. **Resolver**: percorre AST, monta scopes, valida names.
4. **Type checker**: bidirectional. Erros: type mismatch, unknown field, arity, etc.
5. **Interpreter (tree-walking)**: avalia AST. Closures via captured environment.
6. **REPL**: line-by-line, mantém ambiente.

### Restrições

- Sem libs de parser (sem nearley, peggy, antlr). Hand-written.
- Sem libs de typing, implemente.
- Programa de exemplo (`examples/quicksort.mini`) com lista, recursion, lambda, records, type-checa e roda.

### Threshold

- 30+ casos de teste cobrindo: lex, parse, type check (positivos e negativos), eval.
- Mensagem de erro mostra arquivo:linha:col + dica.
- Quicksort em Mini roda corretamente.

### Stretch

- **Bytecode VM**: compile AST pra bytecode simples (stack-based) e interprete. Compare perf vs tree-walking.
- **Let-polymorphism** (HM completo): generalize let-bindings.
- **Pattern matching** em records.
- **Source maps**: emita JS preservando spans.
- **Repl com error recovery** parcial (continua após erro de syntax).

---

## 5. Extensões e Conexões

- Liga com **01-04** (data structures): trees, hash maps, scope chains.
- Liga com **01-05** (algorithms): graph coloring (register alloc), dataflow analysis.
- Liga com **01-06** (paradigms): functional core via lambda + immutability.
- Liga com **01-07** (JS): V8 = parser + bytecode interp + JIT. Hidden classes.
- Liga com **01-08** (TS): você acabou de escrever um type checker em TS.
- Liga com **02-04** (React): JSX é sintaxe não-padrão; Babel/SWC parseia.
- Liga com **02-10** (ORMs): query builders são DSLs internas; geração de SQL é codegen.
- Liga com **03-11** (Go/Rust): rustc usa LLVM IR; Go tem compilador próprio.
- Liga com **03-12** (Wasm): target de codegen em vários compiladores modernos.
- Liga com **04-05** (API): GraphQL e Protobuf têm parsers/codegen.

---

## 6. Referências

- **"Crafting Interpreters"**: Robert Nystrom. Gratuito, leitura primária.
- **"Engineering a Compiler"**: Cooper & Torczon.
- **"Modern Compiler Implementation in ML"**: Andrew Appel.
- **"Compilers: Principles, Techniques, and Tools"**: Aho et al. ("Dragon Book"). Clássico.
- **LLVM Tutorial**: kaleidoscope ([llvm.org/docs/tutorial](https://llvm.org/docs/tutorial/)).
- **"V8: Behind the Scenes"**: series de Benedikt Meurer e Mathias Bynens.
- **"Inside V8"**: Franziska Hinkelmann.
- **"Pratt Parsers", Bob Nystrom** ([journal.stuffwithstuff.com](http://journal.stuffwithstuff.com/2011/03/19/pratt-parsers-expression-parsing-made-easy/)).
- **TypeScript Compiler API docs**.
