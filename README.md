# Fathom — Framework de Maestria Full Stack

> Trilha estruturada de iniciante real até Staff/Principal Software Engineer. Mastery-based, sem prazos, conduzida pelo mentor (você, peer, ou suplemento opcional) sob protocolo rígido.

Não é curso. Não é bootcamp. Não é leitura passiva. É uma **disciplina de longo prazo** com módulos densos, portões de avaliação, e um produto encadeado (Logística) que evolui ao longo dos 5 estágios.

---

## Para quem é

- Quem quer **realmente** dominar full stack do CPU à arquitetura distribuída.
- Quem aceita ser examinado tecnicamente sem pano-de-fundo.
- Quem topa estudar matemática quando precisa, ler RFCs, implementar do zero, escrever postmortem honesto, entrar em paper club.
- Quem quer trajetória clara até Senior consolidado e, opcional, Staff/Principal.

**Não é** pra quem busca atalho, certificado de boot camp, fast-track, ou "aprender Next.js em 30 dias".

---

## Estrutura

```
Fathom/
├── README.md                          # este arquivo
├── MENTOR.md                          # protocolo do mentor (self / peer / suplemento opcional)
├── PROGRESS.md                        # dashboard de progresso (atualizado a cada portão)
├── STUDY-PROTOCOL.md                  # técnicas cognitivas obrigatórias (Feynman, Active Recall, Spaced Rep, etc.)
└── framework/
    ├── 00-meta/
    │   ├── INDEX.md                   # mapa global de TODOS os módulos + DAG
    │   ├── CAPSTONE-EVOLUTION.md      # Logística v0 → v1 → v2 → v3 → v4 em um lugar
    │   ├── GLOSSARY.md                # termos técnicos canônicos (EN) com definição curta
    │   ├── MODULE-TEMPLATE.md         # template padrão pra novos módulos
    │   ├── SELF-ASSESSMENT.md         # questionário inicial pra calibrar trilha
    │   ├── elite-references.md        # repos, blogs, talks, comunidades, RFCs
    │   └── reading-list.md            # livros canônicos por estágio
    ├── 01-novice/         (15 módulos + capstone — fundamentos & CS)
    ├── 02-apprentice/     (19 módulos + capstone — aplicações)
    ├── 03-professional/   (17 módulos + capstone — operações & qualidade)
    ├── 04-senior/         (16 módulos + capstone — distribuído & arquitetura)
    └── 05-staff/          (7 módulos + capstone — specialization & influence)
```

**Total**: 5 estágios, 66 módulos, 5 capstones, 8 metas, 3 raiz.

Detalhe completo em [framework/00-meta/INDEX.md](framework/00-meta/INDEX.md).

---

## Os 5 estágios em uma frase cada

1. **Novice (Fundamentos & CS)** — quando perguntarem "por que esse loop é lento?", você raciocina sobre cache, alocação, syscalls, complexidade, branch prediction. Não chuta. [framework/01-novice/](framework/01-novice/README.md)
2. **Apprentice (Aplicações)** — você constrói e opera aplicação full-stack monolítica em produção, defendendo cada escolha técnica em entrevista de Pleno. [framework/02-apprentice/](framework/02-apprentice/README.md)
3. **Professional (Ecossistema, Testes, Operações)** — você coloca em produção com qualidade de empresa séria — testes confiáveis, deploy seguro, observabilidade real, segurança defensável, performance medida, planning honesto. [framework/03-professional/](framework/03-professional/README.md)
4. **Senior (Arquitetura Distribuída)** — você desenha e justifica arquitetura distribuída pra problema novo, prevendo trade-offs, modos de falha, custos operacionais, com TLA+ pra o que importa. [framework/04-senior/](framework/04-senior/README.md)
5. **Staff / Principal (Specialization, Influence, Public Output)** — você multiplica via influência, especializa em eixo, publica, mentora, lê papers, constrói from-scratch, fala org, pensa business. [framework/05-staff/](framework/05-staff/README.md)

Cada estágio tem capstone que **evolui o mesmo produto** (Logística — sistema de roteamento de entregas multi-tenant). Você sente refactor, migration, redesign na pele. Detalhe em [CAPSTONE-EVOLUTION.md](framework/00-meta/CAPSTONE-EVOLUTION.md).

---

## O método

Cada módulo segue 6 seções:

1. **Problema de Engenharia** — por que esse módulo existe, no produto e na carreira.
2. **Teoria Hard** — densa, com referências primárias, sem padding.
3. **Threshold de Maestria** — lista do que você deve saber explicar **sem consultar**.
4. **Desafio de Engenharia** — implementação não-trivial, hand-rolled, sob restrições.
5. **Extensões e Conexões** — como o módulo se liga a outros do framework.
6. **Referências** — livros, papers, RFCs, repos canônicos.

Após Teoria + Desafio, você pede o **portão**:

- **Portão Conceitual** — o mentor pergunta 5-8 coisas em ordem aleatória, exigindo desenho ASCII/mermaid + contraexemplo + explicação interna.
- **Portão Prático** — o mentor faz code review profundo do desafio + 5 perguntas justificativas.
- **Portão de Conexões** — o mentor pergunta como o módulo se conecta a 2-3 anteriores.

Os 3 portões devem passar pra módulo virar `done`. Falha é normal — falha bem-feita é evidência de aprendizado real (ver [STUDY-PROTOCOL.md](STUDY-PROTOCOL.md)).

---

## Antes de começar

Leia (em ordem):

1. **[STUDY-PROTOCOL.md](STUDY-PROTOCOL.md)** — técnicas cognitivas obrigatórias (Feynman, Active Recall, Spaced Repetition, Deliberate Practice, Spaced Re-Test, Paper Reading, Public Capstone, Cohort, Journal). Sem isso, framework vira leitura passiva.
2. **[MENTOR.md](MENTOR.md)** — protocolo do mentor. Define identidade, postura, regras de portões, o que o mentor pode/não pode fazer, e os modos válidos (self / peer / hybrid / suplemento opcional). Você não pode "burlar" porque é o seu próprio contrato.
3. **[framework/00-meta/SELF-ASSESSMENT.md](framework/00-meta/SELF-ASSESSMENT.md)** — questionário pra calibrar onde você realmente está (e o que pode pular com prova).
4. **[framework/00-meta/reading-list.md](framework/00-meta/reading-list.md)** + **[framework/00-meta/elite-references.md](framework/00-meta/elite-references.md)** — fontes canônicas. Não compre tudo; cada módulo aponta o que ler.

Depois, abra **N01 — Computation Model** e leia a seção 1 + parte da Teoria Hard. Comece a tentar o desafio. Volte na teoria quando travar.

---

## Princípios não-negociáveis (resumo de MENTOR.md §8)

1. **Mastery-based.** Sem prazos. Critério é **explicar o interno e provar com código**.
2. **Sem passar pano.** Bloqueio honesto > simpatia.
3. **Teoria → Threshold → Prática → Conexões.** Sempre nessa ordem.
4. **Conexões > silos.** Conhecimento isolado é inútil.
5. **Cada Desafio é não-trivial.** Construir do zero o que já existe em produção.
6. **Referências de Elite sempre.** DDIA, SICP, OS:TEP, RFCs, specs oficiais, talks de elite. Nada de Medium clickbait.
7. **Capstone encadeado.** Logística evolui — você sente refactor, migration, redesign na pele.

---

## Tempo? Não.

Não pergunte quanto tempo leva. Leva o que precisar.

Estimativa **muito** grossa pra dar ordem de magnitude (depende de horas/semana, fundo prévio, capacidade de absorção):

| Estágio | Faixa típica (horas) |
|---|---|
| Novice (15 módulos + capstone) | 400-800 |
| Apprentice (19 módulos + capstone) | 600-1200 |
| Professional (17 módulos + capstone) | 500-1000 |
| Senior (16 módulos + capstone) | 600-1500 |
| Staff (7 módulos + capstone) | 800-2000 |

Total: ~3-7 mil horas. Não é "1 ano". Não é "5 anos". É **o tempo que cada estágio requer** dado seu compromisso.

Cortar caminho aqui é cortar maestria. Não há atalho.

---

## Output cumulativo esperado

Ao terminar Staff:

- Logística production-grade distribuída, deployed, com 4 capstones encadeados.
- 2 toys de baixo nível construídos do zero (DB, queue, runtime, scheduler — escolha).
- 3 capstones em domínios distintos (fintech, real-time, ML pipeline).
- Portfolio site próprio.
- 6+ blog posts long-form publicados.
- 1 talk gravado em meetup/conf.
- 1 OSS lib mantida com tração real.
- 25+ papers lidos com Q&A notes.
- 3+ mentees acompanhados.
- Promo case (interno) e narrative (externo) prontos.

Esse é o estado que justifica título Staff em empresa séria. Não garante hire (nada garante). Mas **te coloca à altura**.

---

## Atribuição e licença

Framework escrito por Nicolas De Nigris. Síntese pedagógica baseada em fontes canônicas listadas em `framework/00-meta/reading-list.md` e `framework/00-meta/elite-references.md`.

Licenciado sob **[Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](LICENSE)**. Você pode compartilhar e adaptar, desde que dê crédito e não use comercialmente. Detalhes legais em [LICENSE](LICENSE).

---

## Créditos e fontes

O conteúdo é **synthesis + curadoria** sobre material canônico. Crédito devido a:

**Livros foundationais** — todos listados em [reading-list.md](framework/00-meta/reading-list.md):
- *Designing Data-Intensive Applications* (Martin Kleppmann)
- *Structure and Interpretation of Computer Programs* (Abelson, Sussman)
- *Operating Systems: Three Easy Pieces* (Arpaci-Dusseau)
- *Computer Systems: A Programmer's Perspective* (Bryant, O'Hallaron)
- *Database Internals* (Petrov), *Crafting Interpreters* (Nystrom), *Site Reliability Engineering* (Google), *The Staff Engineer's Path* (Tanya Reilly), entre outros.

**Specs e RFCs** — IETF, W3C, WHATWG, ECMA-262, OWASP. Fontes primárias sempre que possível.

**Papers canônicos** — Lamport, Brewer, Dean, Ongaro, Chord, Dynamo, Spanner, Raft, FLP, etc. (lista completa em reading-list.md §Papers).

**Autores e blogs** — listados integralmente em [elite-references.md](framework/00-meta/elite-references.md): Aphyr (Jepsen), Brendan Gregg, Hillel Wayne, Julia Evans, Dan Luu, Marc Brooker, Murat Demirbas, Chip Huyen, Tanya Reilly, Will Larson, Sara Soueidan, Adrian Roselli, Patrick McKenzie, Gergely Orosz, Bartosz Ciechanowski, Lin Clark, Mathias Bynens, Preshing, entre outros.

**Codebases canônicos** estudados — V8, Postgres, Redis, libuv, React, CockroachDB, Linux kernel, Kafka, TigerBeetle, SQLite, Bun, Tokio, etc. Reading paths em [CODEBASE-TOURS.md](framework/00-meta/CODEBASE-TOURS.md).

**Talks e conferências** — JSConf, StrangeLoop, GOTO, LeadDev, USENIX, Papers We Love. Pessoas como Rich Hickey, Joe Armstrong, Leslie Lamport, Andrej Karpathy, Jake Archibald.

Onde uma ideia chave vem de uma fonte específica, ela é citada na subseção correspondente do módulo. Este framework é mapa; o território vive nos livros, papers, codebases e specs acima.

---

## FAQ rápido

**Q: Por que mais um framework de carreira?**
A: Porque os existentes são curtos demais (cobrem só Pleno) ou genéricos demais (sem disciplina). Este força profundidade real, com produto encadeado e portões de avaliação.

**Q: Por que Logística como capstone?**
A: Domínio com complexidade técnica suficiente pra abrigar todos os patterns (multi-tenant, real-time, payments, search, graph, distributed). Ver [CAPSTONE-EVOLUTION.md](framework/00-meta/CAPSTONE-EVOLUTION.md).

**Q: E se eu já sei muito de algo?**
A: Faça o portão. 80% das vezes você falha em pelo menos parte — e essa é a evidência de que não dominava. Nas 20% restantes, módulo passa rápido. Ver SELF-ASSESSMENT.

**Q: Posso pular módulo?**
A: Pré-requisitos são bloqueantes. Mas dentro de pré-reqs satisfeitos, você pode escolher ordem. Ver INDEX trilhas paralelas.

**Q: Posso fazer em paralelo a trabalho/estudos formais?**
A: Sim. Maioria faz. Cadência sustentável > sprints insanos.

**Q: E se eu desistir no meio?**
A: O que você já passou continua valendo. Mas a maior força do framework é em **continuidade**. Pause se preciso; abandone só por mudança real de plano.

---

**Próximo passo:** [STUDY-PROTOCOL.md](STUDY-PROTOCOL.md) → [MENTOR.md](MENTOR.md) → [framework/00-meta/SELF-ASSESSMENT.md](framework/00-meta/SELF-ASSESSMENT.md) → N01.
