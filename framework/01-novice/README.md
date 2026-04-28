# Estágio 1 — Novice (Fundamentos & Computer Science)

## Por que esse estágio existe

A maioria dos devs hoje começa pelo framework (React, Next.js) sem nunca ter visto **como o computador realmente funciona**. Isso vira um teto baixo: você consegue construir features, mas qualquer problema que escapa do happy path (memory leak, race condition, bug em GC, query lenta, deadlock) você não consegue diagnosticar porque os fundamentos faltam.

O Novice **não** ensina React, Postgres, Docker. Ensina o que está **embaixo** disso tudo: CPU, memória, rede, sistemas operacionais, algoritmos, paradigmas, JavaScript+TypeScript real, Git por dentro, Unix shell. Sem isso, você nunca passa de Pleno superficial.

**Promessa de saída do Novice:** quando alguém te perguntar "por que esse loop é lento?", você consegue raciocinar sobre cache, alocação, syscalls, complexidade — não chutar.

---

## Ordem dos módulos (dependências)

A ordem **importa**. Cada módulo lista seus `prereqs:` no frontmatter — o mentor bloqueia avanço se prereq não passou.

| Ordem | ID | Módulo | Prereqs |
|-------|----|--------|---------|
| 1 | [N01](N01-computation-model.md) | Modelo de Computação | — |
| 2 | [N02](N02-operating-systems.md) | Sistemas Operacionais | N01 |
| 3 | [N03](N03-networking.md) | Redes | N02 |
| 4 | [N04](N04-data-structures.md) | Estruturas de Dados | N01 |
| 5 | [N05](N05-algorithms.md) | Algoritmos | N04 |
| 6 | [N06](N06-programming-paradigms.md) | Paradigmas de Programação | N04, N05 |
| 7 | [N07](N07-javascript-deep.md) | JavaScript Profundo | N02, N06 |
| 8 | [N08](N08-typescript-type-system.md) | TypeScript Type System | N07 |
| 9 | [N09](N09-git-internals.md) | Git Interno | N04 |
| 10 | [N10](N10-unix-cli-bash.md) | Unix CLI & Bash | N02 |
| 11 | [N11](N11-concurrency-theory.md) | Concurrency Theory (memory models, locks, lock-free) | N02, N06 |
| 12 | [N12](N12-cryptography-fundamentals.md) | Cryptography Fundamentals (hash, MAC, AEAD, PKI) | N03 |
| 13 | [N13](N13-compilers-interpreters.md) | Compilers & Interpreters (lex/parse/AST/codegen/JIT) | N06, N07 |
| 14 | [N14](N14-cpu-microarchitecture.md) | CPU Microarchitecture (cache, pipelining, branch pred, NUMA) | N01, N02 |
| 15 | [N15](N15-math-foundations.md) | Math Foundations (linear algebra, probability, info theory) | N01 |

Você pode rodar **N02 e N04 em paralelo** se quiser variar — não dependem um do outro. Idem **N09 e N10** depois de N04/N02. **N11-N15** vêm após o núcleo do Novice; são onde a maioria descobre os buracos que o resto do framework explora. Não pule — a alternativa é descobrir lacunas em S04, S14, S11, S10. **N14** materializa "mechanical sympathy" pra perf real (P10, P13, S10). **N15** é gate pra cripto (N12, S11), ML (S10), search (A15) e formal methods (S14).

---

## Capstone do Novice

[CAPSTONE-novice.md](CAPSTONE-novice.md) — implementar do zero um **HTTP/1.1 server em Node puro** (sem `http`, sem Express). Parser manual, cache LRU em memória, suporte a `Content-Length` e `chunked encoding`, keep-alive correto, CLI de logs estruturados.

**Threshold:** passar testes de carga com `wrk` mantendo correção sob concorrência.

O capstone só é liberado **após todos os 10 módulos estarem com status `done`**. Ele integra: estruturas de dados (LRU = hash + linked list), algoritmos, JS+TS, sistemas (FDs, processes), redes (HTTP parsing), Unix (logs, processes).

---

## Postura recomendada para este estágio

- **Vai parecer "afastado da realidade"**: você vai estudar binário, virtual memory, B-Trees enquanto outros devs estão fazendo Pokédex em React. **Confie no processo.** Esses fundamentos são o que diferencia Senior de Pleno daqui a 3 anos.
- **Cada módulo tem subseções densas.** Não pule. A subseção que você pular é a que vai te prender em S04 (resilience patterns) lá na frente.
- **Tenha caderno físico ou tablet pra desenhar fluxos.** Vários portões conceituais exigem desenho — pratique antes de tentar.
- **Faça o Anki religiosamente** desde N01. Os fatos do Novice (ordem do event loop, isolation levels, comandos Unix, Big-O) são **vocabulário base** que você vai usar a vida toda.

---

## Tempo? Não.

Não pergunte quanto tempo o Novice leva. **Leva o que precisar.** Critério de saída é mastery — não calendário.
