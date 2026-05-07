# EXEMPLARS — O que "passar" parece, com exemplo

> O framework define **rubric** (RUBRIC.md), **portões** (MENTOR.md §4) e **logs**
> (PROGRESS.md, STUDY-PROTOCOL.md §16). Mas rubric é abstrata. Aluno novo precisa
> ver **antes/depois preenchido** pra calibrar honestamente.
>
> Este doc tem **exemplos completos** — não templates vazios. São fictícios mas
> representam o nível de qualidade que um portão passado deve atingir. Use-os
> como bússola, não como gabarito a copiar.

---

## 1. Portão Conceitual passado, exemplo de 01-01 Computation Model

**Contexto**: aluno terminou estudo de §2 do módulo 01-01 (Von Neumann, hierarquia
de memória). Marcou portão Conceitual como `⏳`. Mentor (humano ou self) faz 5
perguntas sob rubric. Cada resposta é avaliada `passa` ou `não passa`. **Todas
precisam passar**, ou portão volta pra `⬜`.

### Pergunta 1: Por que latência de L1 (~1ns) vs RAM (~100ns) afeta a forma como você desenha estrutura de dados em código real?

**Resposta nível-portão**:

> Acessar memória sequencialmente em L1 me dá throughput até 100x maior que
> "saltar" pela RAM. Em prática isso significa que `Array<T>` contíguo em memória
> ganha de `LinkedList<T>` mesmo quando ambos têm O(n) iteration na teoria — o
> linked list força um cache miss por nó. Por isso `Vec<T>` em Rust ou `ArrayList`
> em Java são default; `HashMap` é mais lenta que `Vec` para tabelas pequenas (<32
> elementos) porque hashing + indireção custa mais do que linear scan que cabe na
> linha de cache (64 bytes ≈ 8 entries de 8 bytes). É também por que ECS em game
> engines (ver Bevy, CODEBASE-TOURS Tour 11) armazena componentes em archetypes
> contíguos, não como ponteiros em entidades.

**Avaliação**: ✅ passa. Aluno (a) declara a relação latência/cache, (b) traduz em
escolha de estrutura de dados concreta, (c) cita exemplo prático cross-stack, (d)
conecta com tour relevante. Não é parrot da pergunta.

### Pergunta 2: Dê um contraexemplo onde mais cache **não** ajuda performance.

**Resposta nível-portão**:

> Cache só ajuda se o working set tem reuso temporal/spatial. Se eu vou processar
> 100GB de dados sequencialmente uma vez (ex.: log scan, ETL batch), L1/L2/L3
> ficam thrashing — cada linha entra e sai sem ser revisitada. Aí o que importa é
> bandwidth de RAM, não tamanho de cache. Em Postgres, `seq_scan` enorme com
> `effective_cache_size` baixo é exatamente este caso; bumping shared_buffers não
> ajuda. Solução é `O_DIRECT` (bypass do page cache) ou processar em chunks que
> caibam em L3.

**Avaliação**: ✅ passa. Aluno entende o critério ("reuso") em vez de só recitar
"cache é bom". Contraexemplo é cirúrgico. Cita Postgres parameter real.

### Pergunta 3 (anti-burla): "Como você diria pra um candidato júnior por que `for (let i ...)` ganha de `forEach` em hot path?"

**Resposta nível-portão**:

> Ganho real é pequeno e raramente importa em código de produção (95% dos casos
> escolha o que lê melhor). Quando importa: `forEach` faz function call por iteração
> — o callback impede inlining em alguns runtimes (V8 pode inlineá-lo se monomórfico,
> ver ICs em V8 — CODEBASE-TOURS Tour 1). Em loops apertadíssimos `for (let i)`
> evita o overhead. Mas isso não é "fundamentos" — é micro-otimização. Eu diria
> pra ele primeiro **medir com flamegraph** (Brendan Gregg) antes de re-escrever.
> Se ele me perguntar "qual a diferença em geral", eu corrigiria a pergunta:
> a diferença que importa é se ele consegue raciocinar sobre allocation,
> deopt, e quando o JIT desiste — não a sintaxe.

**Avaliação**: ✅ passa. Aluno **não cai** no anti-pattern de prescrever
"sempre for". Mostra calibration de prioridades, cita ferramentas reais. Mentor
notou que aluno reformulou a pergunta — sinal de pensamento próprio.

### Pergunta 4: Desenhe (no quadro / em ASCII) o caminho de `int x = readFromMemory(addr)` desde CPU até DRAM.

**Resposta nível-portão** (transcrita):

```
  CPU core
   |
   | LD instr emitted
   v
  L1d (32KB, ~1ns)  --hit?--> return
   |
   | miss: query L2
   v
  L2 (256KB, ~3ns) --hit?--> fill L1, return
   |
   | miss: query L3
   v
  L3 (8MB shared, ~10ns) --hit?--> fill L2/L1, return
   |
   | miss: memory controller
   v
  DRAM (~100ns + row activation)
   |
   | row buffer hit?  --no--> bank precharge + activate (~50-200ns more)
   v
  bytes burst back through bus
   v
  fill caches (line = 64 bytes)
   v
  CPU register receives x
```

> Ainda nesse path: TLB miss adiciona walk de page tables (mais 1-3 misses).
> Se a página estiver swapped, é fault → kernel → disco → de volta (millions
> de ns). Por isso `mlock` existe pra databases.

**Avaliação**: ✅ passa. Aluno acerta hierarquia, ordens de magnitude, e estende
pra TLB e page faults sem ter sido pedido — sinal de modelo mental, não memorização.

### Pergunta 5 (Conexões): Onde mais nesse framework esse conhecimento é load-bearing?

**Resposta nível-portão**:

> Direto: 01-04 (estruturas de dados, escolha cache-friendly), 01-14 (microarch,
> branch predictor + speculative exec dependem de mesmas premissas), 02-09
> (Postgres buffer manager — page cache no nível de DB), 03-10 (perf,
> flamegraphs medem o que é cache miss). Indireto: 04-01 (sistemas distribuídos
> têm sua própria hierarquia: cache local < cache shard < storage remoto, mesma
> lógica de trade-off de latência), 05-10 (ECS em games existe exatamente porque
> cache locality é load-bearing).

**Avaliação**: ✅ passa. Aluno traçou DAG mentalmente sem consultar INDEX.md.
Conexões diretas + indiretas com justificativa.

### Resultado do portão

Mentor preenche em PROGRESS.md:

```
| 01-01 | Computation Model | ✅ | ⏳ | ⬜ | IN_PROGRESS |
```

Conceitual passou. Próximo: portão Prático (implement HTTP server from scratch,
ver capstone v0). Conexões só pode passar após capstone.

---

## 2. Journal entry, exemplo após sessão de portão

> Formato: ver STUDY-PROTOCOL.md §16. 3-7 frases, honesto. Não é progress report
> pra LinkedIn — é debrief pessoal.

```markdown
### 2026-05-12 — 01-01 conceitual passado

Travei 40min na pergunta 4 (caminho LD). Sabia hierarquia mas não sabia que
TLB miss precede o fetch. Tive que voltar pra OSTEP cap. 19 e ler de novo,
nojo. Lição: meu modelo de "memory access" estava abstrato demais — eu via
"L1 → RAM" como se fosse um pipe, não percebia que page tables eram um
nível extra de indireção. Re-li, anotei 3 cartas Anki novas (TLB structure,
TLB shootdown, hugepage rationale).

Surpresa boa: na pergunta 3 mentor (eu mesmo, modo A) tentou empurrar a
sintaxe `for vs forEach` como se fosse importante — fiz a correção certa
(é micro-otimização, foco no fluxo), e isso me deu confiança de que tô
entendendo prioridades, não só fatos.

Próxima sessão: começo capstone v0 (HTTP parser do zero). Risco: vou querer
usar `require('http')` ou copy-paste de tutorial. Compromisso: parser
estritamente from scratch, code review obrigatório de senior antes de
declarar prático passado.
```

**Avaliação**: ✅ qualidade exemplar. Não é flamboyant. Documenta o que travou,
o que foi corrigido, e o que foi aprendido. Antecipa risco da próxima sessão.

---

## 3. Quarterly review, exemplo Q2-2026

> Formato: ver STUDY-PROTOCOL.md §17. Trimestral. Honest scoring; ações > sentimento.

```markdown
### Q2-2026 (abr-mai-jun) — Estágio 1 em curso

**Módulos fechados (DONE)**: 01-01, 01-02, 01-03 (3/15)
**Em progresso**: 01-04 (conceitual ✅, prático ⏳ — implementando hash table
em C com chaining vs open addressing)
**Capstones**: v0 HTTP server iniciado (parser pronto, semantics WIP)

**Spaced re-test scores** (90d):
- 01-01: 8/10 (perdi detalhes de TLB shootdown — re-revisando)
- 01-02: 9/10 (sólido)
- 01-03: 6/10 ⚠️ — TCP slow start mal lembrado, BBR vs Reno confuso. Re-test
  daqui 30d, não 90d.

**Public output**: 1 post sobre "memory hierarchy as the only ordering of
magnitudes that matters" (~2400 palavras, 17 reactions LinkedIn, 0 PRs em
OSS este trimestre).

**Paper reading**: 4 papers (target era 5):
- "What every programmer should know about memory" (Drepper) ✅ pass-3
- "The Free Lunch is Over" (Sutter) ✅ pass-3
- "Designing Data-Intensive Applications" cap. 1-3 (DDIA, cumulativo)
- "Crash-only Software" (Candea & Fox) — só pass-1, vou voltar Q3

**Mentorship**: zero peer review este trimestre. Modo A solo. ⚠️ violação do
anti-isolation gate se passar 6m, deadline para procurar peer: 2026-09-01.

**Self-honest scoring** (1-5):
- Disciplina: 4 (faltei 8 sessões em 65 — gripe + viagem)
- Profundidade: 4 (boas perguntas próprias surgiram em 01-04 sobre Robin Hood
  hashing, levou pra rabbit hole produtivo)
- Output público: 2 ⚠️ — 1 post é abaixo do alvo de "1 post / módulo
  fechado". 3 esperados, 1 entregue.
- Sustentabilidade: 4 (sleep > 7h em 80% dias, exercise 3x/sem)

**Ações Q3**:
1. Encontrar peer (1 outro aluno em Estágio 1) até 2026-09-01.
2. Recuperar dívida de output: posts pendentes 01-02 e 01-03 antes de fechar
   01-04.
3. Re-test 01-03 em 30d (não 90d) por causa do score 6/10.
4. Capstone v0 deadline: 2026-08-31. Code review obrigatório por dev sênior.
```

**Avaliação**: ✅ exemplar. Score honesto inclui falhas (output 2/5, isolation
risk). Ações concretas com datas. Não é vibes ("foi um bom trimestre"). Está
funcionando como auditoria.

---

## 4. Anki cards, exemplo de Estágio 1

> Formato: pergunta atomic, resposta concisa, fonte. Pra spaced repetition real,
> não para impressionar. Veja STUDY-PROTOCOL.md §3 (Active Recall + Spaced Rep).

| Front | Back | Tag |
|-------|------|-----|
| Latência aproximada de L1 cache hit em CPU moderna? | ~1ns (sub-nanosecond pra hit; ~3ns L2; ~10ns L3) | 01-01 |
| Quantos bytes em uma linha de cache típica x86? | 64 bytes. Cache lines, não bytes individuais, são unidade de transfer. | 01-01 |
| O que é um TLB miss e quanto custa? | Translation Lookaside Buffer falha → page table walk (1-4 níveis em x86_64) → 100s de ns. Hugepages reduzem walks. | 01-01 |
| Qual é a generational hypothesis em GC? | A maioria dos objetos morre jovem. Justifica nursery (collection frequente) + tenured (rara). V8, JVM, .NET usam variantes. | 01-01 |
| Em sorted set de Redis, por que skip list **e** dict? | Skip list dá ordering O(log n) + range query; dict dá lookup O(1) por member. Trade-off de espaço por dois tipos de query. | 02-11 |
| O que é um inline cache em V8 e como degrada? | IC em call site cacheia hidden class observada. Monomorphic (1 shape, fast) → polymorphic (≤4) → megamorphic (>4, slow generic dispatch). | 01-07 |

**Avaliação**: ✅ exemplares. Front é uma pergunta concreta, back é resposta
**curta**. Tag é o módulo (pra filtrar review). Não tem "explique X" (ruim pra
recall ativo) ou definições em prosa (não testa nada).

---

## 5. Como usar este doc

- **Antes do primeiro portão**: leia §1 inteiro. Calibre o que "passa" significa.
- **Após cada portão Conceitual**: compare suas respostas com §1. Se as suas
  estão visivelmente abaixo, **não marque ✅ ainda**. Estude mais e tente de novo.
- **Mensalmente**: leia §3 (quarterly) e revise o seu próprio. Procure
  blind spots.
- **Quando criar Anki cards**: §4 é a referência de qualidade.

Este doc não é decorativo. É calibration — a coisa mais difícil em self-study.
