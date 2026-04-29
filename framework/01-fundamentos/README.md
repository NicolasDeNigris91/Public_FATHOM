# Estágio 1: Fundamentos (Fundamentos & Computer Science)

## Por que esse estágio existe

A maioria dos devs hoje começa pelo framework (React, Next.js) sem nunca ter visto **como o computador realmente funciona**. Isso vira um teto baixo: você consegue construir features, mas qualquer problema que escapa do happy path (memory leak, race condition, bug em GC, query lenta, deadlock) você não consegue diagnosticar porque os fundamentos faltam.

O Fundamentos **não** ensina React, Postgres, Docker. Ensina o que está **embaixo** disso tudo: CPU, memória, rede, sistemas operacionais, algoritmos, paradigmas, JavaScript+TypeScript real, Git por dentro, Unix shell. Sem isso, você nunca passa de Pleno superficial.

**Promessa de saída do Fundamentos:** quando alguém te perguntar "por que esse loop é lento?", você consegue raciocinar sobre cache, alocação, syscalls, complexidade, não chutar.

---

## Ordem dos módulos (dependências)

A ordem **importa**. Cada módulo lista seus `prereqs:` no frontmatter, o mentor bloqueia avanço se prereq não passou.

| Ordem | ID | Módulo | Prereqs |
|-------|----|--------|---------|
| 1 | [01-01](01-01-computation-model.md) | Modelo de Computação | - |
| 2 | [01-02](01-02-operating-systems.md) | Sistemas Operacionais | 01-01 |
| 3 | [01-03](01-03-networking.md) | Redes | 01-02 |
| 4 | [01-04](01-04-data-structures.md) | Estruturas de Dados | 01-01 |
| 5 | [01-05](01-05-algorithms.md) | Algoritmos | 01-04 |
| 6 | [01-06](01-06-programming-paradigms.md) | Paradigmas de Programação | 01-04, 01-05 |
| 7 | [01-07](01-07-javascript-deep.md) | JavaScript Profundo | 01-02, 01-06 |
| 8 | [01-08](01-08-typescript-type-system.md) | TypeScript Type System | 01-07 |
| 9 | [01-09](01-09-git-internals.md) | Git Interno | 01-04 |
| 10 | [01-10](01-10-unix-cli-bash.md) | Unix CLI & Bash | 01-02 |
| 11 | [01-11](01-11-concurrency-theory.md) | Concurrency Theory (memory models, locks, lock-free) | 01-02, 01-06 |
| 12 | [01-12](01-12-cryptography-fundamentals.md) | Cryptography Fundamentals (hash, MAC, AEAD, PKI) | 01-03 |
| 13 | [01-13](01-13-compilers-interpreters.md) | Compilers & Interpreters (lex/parse/AST/codegen/JIT) | 01-06, 01-07 |
| 14 | [01-14](01-14-cpu-microarchitecture.md) | CPU Microarchitecture (cache, pipelining, branch pred, NUMA) | 01-01, 01-02 |
| 15 | [01-15](01-15-math-foundations.md) | Math Foundations (linear algebra, probability, info theory) | 01-01 |

Você pode rodar **01-02 e 01-04 em paralelo** se quiser variar, não dependem um do outro. Idem **01-09 e 01-10** depois de 01-04/01-02. **01-11-01-15** vêm após o núcleo do Fundamentos; são onde a maioria descobre os buracos que o resto do framework explora. Não pule, a alternativa é descobrir lacunas em 04-04, 04-14, 04-11, 04-10. **01-14** materializa "mechanical sympathy" pra perf real (03-10, 03-13, 04-10). **01-15** é gate pra cripto (01-12, 04-11), ML (04-10), search (02-15) e formal methods (04-14).

---

## Capstone do estágio 1

[CAPSTONE-fundamentos.md](CAPSTONE-fundamentos.md), implementar do zero um **HTTP/1.1 server em Node puro** (sem `http`, sem Express). Parser manual, cache LRU em memória, suporte a `Content-Length` e `chunked encoding`, keep-alive correto, CLI de logs estruturados.

**Threshold:** passar testes de carga com `wrk` mantendo correção sob concorrência.

O capstone só é liberado **após todos os 10 módulos estarem com status `done`**. Ele integra: estruturas de dados (LRU = hash + linked list), algoritmos, JS+TS, sistemas (FDs, processes), redes (HTTP parsing), Unix (logs, processes).

---

## Postura recomendada para este estágio

- **Vai parecer "afastado da realidade"**: você vai estudar binário, virtual memory, B-Trees enquanto outros devs estão fazendo Pokédex em React. **Confie no processo.** Esses fundamentos são o que diferencia Senior de Pleno daqui a 3 anos.
- **Cada módulo tem subseções densas.** Não pule. A subseção que você pular é a que vai te prender em 04-04 (resilience patterns) lá na frente.
- **Tenha caderno físico ou tablet pra desenhar fluxos.** Vários portões conceituais exigem desenho, pratique antes de tentar.
- **Faça o Anki religiosamente** desde 01-01. Os fatos do Fundamentos (ordem do event loop, isolation levels, comandos Unix, Big-O) são **vocabulário base** que você vai usar a vida toda.

---

## Tempo? Não.

Não pergunte quanto tempo o Fundamentos leva. **Leva o que precisar.** Critério de saída é mastery, não calendário.
