# DECISION-LOG — Decisões de Design do Framework

> Registro de **por que** o framework foi feito como foi. Não é roadmap; é archaeology.
>
> Daqui a 1 ano você (ou outro leitor) vai perguntar: "por que 5 estágios?", "por que Logística?", "por que ST07-ST10 opcionais?". Este doc responde com reasoning.
>
> Cada decisão tem ID `DL-NNN`, contexto, alternativas, escolha, trade-offs, status. Append-only — superseded com nova entry citando o ID antigo.

---

## DL-001: 5 estágios em vez de 3 ou 7

**Contexto** (2026-04-28):
Frameworks de carreira tradicionais usam 3 níveis (Junior/Pleno/Senior) ou 7+ (Junior/Mid/Senior/Staff/Senior Staff/Principal/Distinguished/Fellow).

**Alternativas consideradas**:
- 3 estágios: simples; perde granularidade entre fundamentos vs aplicação vs operação.
- 4 estágios (versão original): Novice + Apprentice + Professional + Senior. Era OK até a auditoria mostrar gap em pós-Senior.
- 7+ estágios: granular demais; senior-fellow distinction matter only em empresas raras.

**Escolha**: 5 estágios (Novice, Apprentice, Professional, Senior, Staff/Principal).

**Por quê**:
- Novice/Apprentice/Professional/Senior cobrem trajetória full-stack até Senior generalista — o que 95% dos engineers precisam.
- Estágio 5 (Staff/Principal) preenche gap real onde dev fica preso em Senior por 5+ anos sem ferramentas pra cruzar.
- "Distinguished/Fellow" e além são domain-specific demais pra framework standardizable; trajetórias divergem.

**Trade-offs**:
- Aceita: framework para no Staff. Para quem quer Distinguished/Fellow, framework é insuficiente.
- Pago em: granularidade. Pleno-junior vs Pleno-senior coexistem em "Apprentice" sem distinção formal.

**Status**: ativo.

---

## DL-002: Capstone único (Logística) encadeado

**Contexto** (2026-04-28):
Frameworks tradicionais têm capstone descontínuo (cada estágio um produto). Isso facilita mas mata transferência cross-stage.

**Alternativas consideradas**:
- 5 capstones independentes (1 por estágio).
- 5 capstones em domínios distintos (Twitter, Uber, Stripe, etc.).
- 1 capstone único evoluindo.
- 0 capstone, só desafios isolados por módulo.

**Escolha**: 1 capstone único (Logística) evoluindo v0→v1→v2→v3→v4 ao longo dos 4 primeiros estágios. Stage 5 capstone integra outputs cumulativos.

**Por quê**:
- Único permite **viver refactor** real: monolito v1 → modular v2 → distribuído v3.
- Único permite **viver migration**: schema, infra, arquitetura.
- Único força **backward compat** consciente entre versões.
- Frameworks descontínuos não ensinam isso.

**Por que Logística**:
- Domínio com complexidade técnica suficiente: multi-tenant, real-time, payments, search, graph, distributed.
- Familiar pra brasileiros (iFood, Rappi, Loggi, Mercado Livre Logística estão no zeitgeist).
- Não é game (graphics-heavy distrai), não é fintech pura (compliance complica), não é social (escopo absurdo).
- Permite Web3 stretch (split entre lojistas e entregadores via smart contract).

**Trade-offs**:
- Aceita: dev anti-Logística pode achar dull. "Não é o domínio que importa; é o shape que ensina."
- Pago em: alguns conceitos que não cabem em Logística viram capstone-staff multi-domain (ST02).

**Status**: ativo.

---

## DL-003: Stage 5 (Staff/Principal) explícito

**Contexto** (2026-04-28):
Versão original do framework parava em Senior. Auditoria honesta mostrou: dev Senior consolidado fica preso por anos sem ferramentas pra cruzar pra Staff/Principal.

**Alternativas consideradas**:
- Não adicionar Stage 5 (tinha sido opção original).
- Adicionar conteúdo Staff dentro do Senior (mas estagio Senior ficaria gigante).
- Stage 5 separado.

**Escolha**: Stage 5 explícito com 7 módulos núcleo (ST01-ST06 + ST07 opcional) + capstone de specialization.

**Por quê**:
- Trajetória Senior → Staff é qualitativamente diferente (multiplicação via influência, não código).
- Módulos como ST04 (paper reading), ST05 (public output), ST06 (mentorship) raramente recebem tratamento estruturado.
- Build-from-scratch (ST01) e multi-domain (ST02) marcam transição de "construir aplicação" pra "entender stack abaixo + breadth".
- Capstone-staff cristaliza outputs cumulativos em portfolio + promo case.

**Trade-offs**:
- Aceita: framework cresce. Mais peso em manter.
- Pago em: filtro natural; nem todo mundo precisa Stage 5.

**Status**: ativo.

---

## DL-004: 78 módulos vs menos

**Contexto** (2026-04-28):
Após adições, framework tem 78 módulos. Auditoria identificou tentação de adicionar mais (game dev, scientific computing, hardware, cognitive a11y).

**Alternativas consideradas**:
- Menos módulos: 50-60. Mais focado, less overwhelming.
- Mais módulos: 100+. Cobertura quase total.
- Equilíbrio escolhido: ~78 com **opcionais** marcados claramente.

**Escolha**: 78 módulos, com 4 ST opcionais (ST07-ST10) + 1 P opcional aspect (P18).

**Por quê**:
- Lacunas conceituais identificadas (search, graph, payments, mobile native, i18n, perf CPU, math, formal methods, OSS, business, paper reading, etc.) são reais e separadoras de Senior real vs Senior superficial.
- Marcar opcionais previne paralisia ("78 módulos? impossível"); leitor vê que ST07-ST10 são branches especializadas, não obrigatórias.
- Domínios extremamente nicho (game dev, bio, hardware, cognitive a11y) merecem módulo só pra quem precisa; sem módulo, esse pessoal sente framework não cobre eles.

**Trade-offs**:
- Aceita: leitor de primeira viagem pode achar overwhelming.
- Aceita: módulos opcionais = trabalho de manter sem garantia de uso.
- Pago em: SELF-ASSESSMENT.md + INDEX.md trilhas paralelas mitigam paralysis.

**Status**: ativo.

---

## DL-005: Mentor flexível com modos self / peer / suplemento opcional

**Contexto** (2026-04-28):
Framework é mastery-based; portões precisam de examinador rigoroso. Quem ocupa esse papel?

**Alternativas consideradas**:
- Mentor humano dedicado: requires hire/find. Caro, scarce.
- Self-mentor sozinho: viável com disciplina alta, mas auto-engano é risco real.
- Peer-to-peer / cohort: complementar, não substitui em todos os contextos.
- Suplemento opcional de produtividade: instrumento auxiliar pra fricções pontuais (gerar listas de perguntas, apontar typos), nunca pra avaliar portão.

**Escolha**: protocolo de mentor agnóstico documentado em `MENTOR.md` com 4 modos válidos — A (self), B (peer/cohort), C (suplemento opcional, com restrições), D (hybrid recomendado). O **rigor não-negociável** é o que importa, não quem ocupa o papel.

**Por quê**:
- Acessibilidade: framework não fica preso a um único provedor de mentoria.
- Honestidade: aluno escolhe modo conforme realidade dele (cohort disponível ou não, budget, preferência).
- Anti-fragilidade: `MENTOR.md` formaliza contrato independente de ferramenta.
- Modo C (suplemento) é apêndice, não core. Modos A e B são onde mastery se forma.

**Trade-offs**:
- Aceita: self-mentor solo tem maior risco de auto-engano. Mitigação: anti-isolamento gate (MENTOR.md §10.5) força 1+ canal externo após 6 meses solo.
- Aceita: nenhum modo é "óbvio" — aluno tem que decidir. Mitigação: STUDY-PLANS.md + SELF-ASSESSMENT.md ajudam calibrar.
- Pago em: protocol explicit + MENTOR.md §9 (anti-burla) + checkpoints de sustentabilidade.

**Status**: ativo.

---

## DL-006: Solo + cohort hybrid em vez de full solo ou full cohort

**Contexto** (2026-04-28):
Aprendizado solo é viável mas slower; full-cohort cria dependência de matchmaking.

**Alternativas**:
- Full solo: ok mas missing peer feedback cego (DL-005 mitiga).
- Full cohort: requires N peers ao mesmo tempo, blocking se não acha.
- Hybrid: solo default + cohort recommended (STUDY-PROTOCOL §15).

**Escolha**: hybrid.

**Trade-offs**: aceita lentidão se sem peer; mas não bloqueia.

**Status**: ativo.

---

## DL-007: Mastery-based em vez de time-based

**Contexto** (2026-04-28):
Frameworks tradicionais usam "X meses por estágio". Inflaciona expectativas, desincentiva profundidade.

**Alternativas**:
- Time-based: "Novice em 3 meses".
- Mastery-based: "Novice quando o mentor valida portões".
- Hybrid: time-bound recomendado, mastery gate.

**Escolha**: pure mastery-based, sem prazos.

**Por quê**:
- Profundidade é o valor.
- Pessoas variam 5x em ramp. Time-fixed castiga lentos sem ganhar nada pros rápidos.

**Trade-offs**:
- Aceita: pode levar 3-7 mil horas total. Não substitui faculdade rápida.
- Pago em: README explica explicitly + STUDY-PROTOCOL §7 (sleep).

**Status**: ativo.

---

## DL-008: PT-BR prosa + EN termos técnicos

**Contexto** (2026-04-28):
Mercado brasileiro de tech consome literatura tech em EN. Tradução perde nuance ("encadeamento de protótipos" ≠ "prototype chain").

**Alternativas**:
- All-EN: alinha com literatura mundial; barreira de entrada pra quem não fluente.
- All-PT: acessível; perde precisão técnica.
- Hybrid: prosa PT, termos EN.

**Escolha**: hybrid (MENTOR.md §5).

**Trade-offs**: aceita: leitor não-bilíngue pode estranhar inicialmente. Pago em: força fluência ambos lados, que é skill profissional necessária.

**Status**: ativo.

---

## DL-009: Sem emojis e sem elogios performáticos

**Contexto** (2026-04-28):
Tom de blog pop tech tem "🚀", "🔥", "Awesome question!". Distrai de conteúdo técnico.

**Alternativa**: tom denso, técnico, seco.

**Escolha**: sem emojis, sem elogios performáticos. Documentado em MENTOR.md §1, §5.

**Trade-offs**: aceita: pode parecer frio. Pago em: clarity técnica.

**Status**: ativo.

---

## DL-010: Frontmatter padronizado + 6 seções padrão

**Contexto** (2026-04-28):
Sem padrão, módulos divergem em formato. Audit chato.

**Alternativa considerada**: cada módulo formato livre.

**Escolha**: frontmatter (`module/title/stage/prereqs/gates/status`) + 6 seções (Problema, Teoria Hard, Threshold, Desafio, Conexões, Referências).

**Por quê**: consistência permite tooling automatizado (CI futura), navegação rápida, comparação cross-módulo.

**Trade-offs**: aceita rigidez, pago em consistency.

**Status**: ativo.

---

## DL-011: Stage 5 capstone com 6 tracks de specialization

**Contexto** (2026-04-28):
Pós-Senior, trajetórias divergem. Forçar 1 capstone único pro Staff seria reducionismo.

**Escolha**: 6 tracks (Distributed, Platform, Frontend, Data/ML, Security, Founding). Cada um com showcase específico.

**Por quê**:
- Reflete diversidade de roles Staff em mercado real.
- Permite candidate posicionar-se intencionalmente vs default-generalist.

**Trade-offs**: aceita: capstone-staff é mais soft do que técnico (portfolio, promo case). Pago em: realismo.

**Status**: ativo.

---

## DL-012: Spaced re-test pós-portão

**Contexto** (2026-04-28):
Conhecimento decai. Passar portão hoje não garante reter daqui a 1 ano.

**Alternativas**:
- Não re-testar: easy, mas decay silencioso.
- Re-test full: caro.
- Re-test mini (2-3 perguntas): equilíbrio.

**Escolha**: spaced re-test mini (STUDY-PROTOCOL §12).

**Trade-offs**: aceita: trabalho recorrente. Pago em: framework vira **manutenção de mastery**, não certificate.

**Status**: ativo.

---

## DL-013: Public capstone obrigatório

**Contexto** (2026-04-28):
Repos privados perdem audience benefit. Push pra público amplifica clarity + portfolio.

**Alternativas**:
- Privado por default.
- Privado opcional.
- Público obrigatório.

**Escolha**: público obrigatório (STUDY-PROTOCOL §14), com cuidados (sem secrets, expectativas claras).

**Trade-offs**: aceita: pode incomodar privacy-preferring. Pago em: reduz auto-engano + builds portfolio.

**Status**: ativo.

---

## Como adicionar entry

```
## DL-XXX: Título da decisão

**Contexto** (YYYY-MM-DD):
[Por que esta decisão veio à tona]

**Alternativas consideradas**:
- A: [pros / cons]
- B: [pros / cons]

**Escolha**: [the actual choice]

**Por quê**:
[reasoning]

**Trade-offs**:
- Aceita: [downside]
- Pago em: [mitigations]

**Status**: ativo | superseded by DL-YYY | reverted on YYYY-MM-DD
```

Não delete entries; superseded é OK. History é o ponto.

---

## Decisões pendentes (open questions)

- **Translation pra EN**: vale o esforço? Quando? — não decidido. Tracked como SN-040 em SPRINT-NEXT.
- **Tooling de validate frontmatter consistency**: nice-to-have, não essential. Tracked como SN-030.
- **Custom Anki deck por módulo**: trabalho grande, retorno incerto. Tracked como SN-021.
- **Versioning de framework**: semver-style? CalVer? — não decidido (CHANGELOG por enquanto cobre).
- **Distinguished/Fellow stage 6**: gap real mas extremamente nicho. Provavelmente não.

Reabra entry quando decidir.

---

## DL-014: Profundidade desigual aceita pragmaticamente

**Contexto** (2026-04-28):
Auditoria interna mostra que módulos têm profundidade desigual. A09 (Postgres) é denso; N04 (Data Structures) é mais shallow proporcionalmente; N15 (Math) cobre 18 sub-tópicos em 350 linhas — cada um merece livro. Tentação: rewrite tudo pra alcançar profundidade máxima.

**Alternativas consideradas**:
- A. Rewrite todos os 78 módulos pra ~500-600 linhas cada — torna framework livro de 40k+ linhas. Demora meses.
- B. Aceitar disparidade. Documentar lacuna e apontar leituras complementares obrigatórias por módulo.
- C. Identificar 10-15 módulos shallow específicos e fazer batch de aprofundamento (Sprint 1).

**Escolha**: C híbrido com B. Aprofundar 5-7 candidatos imediatos no próximo sprint (SN-001 a SN-006); aceitar resto com referências claras.

**Por quê**:
- Framework é **mapa**, não enciclopédia (DL-002 capstone justification analog).
- Cada módulo aponta livros canônicos como obrigatório → profundidade real vem do livro.
- Tentar alcançar profundidade de "Designing Data-Intensive Applications" em 1 módulo de 400 linhas é ilusão. DDIA é 600 páginas.
- Foco em "estrutura + sinalização + threshold" > "exposição completa".

**Trade-offs**:
- Aceita: leitor que quer profundidade total em 1 doc fica desapontado.
- Pago em: SPRINT-NEXT.md trackeia depth-leveling sprint; CODEBASE-TOURS.md compensa via reading paths; STACK-COMPARISONS.md cobre bias de linguagem.

**Status**: ativo. Sprint 1 endereça subset.

---

## DL-015: Multi-stack coverage via STACK-COMPARISONS, não rewrite por stack

**Contexto** (2026-04-28):
Framework é heavy em Node/TypeScript/Postgres/Redis/React. Auditoria reconhece bias. Java, Python, Ruby, Go, .NET, PHP comunidades também precisam ver framework relevante.

**Alternativas consideradas**:
- A. Rewrite de cada módulo com versions per-stack (ex: A07 Node, A07 Java, A07 Python). 3-5x volume.
- B. Forks per-stack (community-maintained).
- C. Documento meta `STACK-COMPARISONS.md` mapeando patterns canônicos em cada stack lado-a-lado.

**Escolha**: C.

**Por quê**:
- Conceitos são universais (DL-014 também aponta isso): MVCC, event loop, distributed consensus, CAP, OAuth2 não mudam por stack.
- Idioms (sintaxe, lib canonical) divergem; mapping cobre.
- Rewrite multiplica esforço 5x sem ganho proporcional.
- Pleno bom em qualquer stack consegue traduzir conceitos via STACK-COMPARISONS.

**Trade-offs**:
- Aceita: dev novato em outra stack ainda precisa learning curve da idiom local.
- Pago em: STACK-COMPARISONS.md aponta libs canônicas; CODEBASE-TOURS aponta repos pra ler.

**Status**: ativo. STACK-COMPARISONS.md created in this sprint.

---

## DL-016: Codebase tours como complemento obrigatório

**Contexto** (2026-04-28):
Texto não substitui leitura de código real de produção. Framework reconhece mas não conduzia tours. Mastery se calibra lendo V8, Postgres, Redis, CockroachDB, etc.

**Alternativas consideradas**:
- A. Inserir code walkthroughs detalhados em cada módulo.
- B. Doc meta `CODEBASE-TOURS.md` com 20 tours guiados.
- C. Vídeos/screencasts.

**Escolha**: B (text doc) por agora, C como Sprint 3 SN-012 (avaliar ROI).

**Por quê**:
- B é low-effort high-value: aponta exatamente arquivos a abrir + perguntas orientadoras.
- Text doc atualiza fácil quando codebase muda links.
- C é caro produzir e desatualiza visivelmente.

**Trade-offs**:
- Aceita: leitor precisa fazer leitura ativa, não passiva.
- Pago em: CODEBASE-TOURS dá map; aluno faz território.

**Status**: ativo. CODEBASE-TOURS.md created in this sprint.

---

## DL-017: Atribuição autoral única (Nicolas De Nigris)

**Contexto** (2026-04-28):
Framework é artefato pessoal. Versão anterior tinha attribuição compartilhada com ferramenta de produtividade específica usada durante a redação. Reflexão honesta concluiu: a ferramenta foi instrumento, não co-autor — análogo a um editor de texto, Grammarly, ou template de Notion. Co-attribuição inflaciona crédito e introduz dependência conceitual desnecessária na trajetória.

**Alternativas consideradas**:
- A. Manter co-attribuição com ferramenta específica usada no draft inicial.
- B. Atribuição genérica ("escrito com auxílio de ferramentas de produtividade").
- C. Atribuição autoral única; ferramentas usadas no processo são instrumento, não creditadas.

**Escolha**: C. Autor único: Nicolas De Nigris. Síntese pedagógica baseada em fontes canônicas (DDIA, SICP, OS:TEP, RFCs, papers, talks) creditadas em `reading-list.md` e `elite-references.md`.

**Por quê**:
- Framework é responsabilidade pessoal — quem mantém, escolhe rumo, calibra rigor é o autor único.
- Ferramentas de escrita assistida são instrumento (igual a editor de código, dicionário, linter). Não viram co-autor.
- Atribuição limpa simplifica licenciamento futuro e evita dependência simbólica em fornecedor terceiro.
- Honestidade técnica: o conteúdo é original synthesis + curadoria de fontes canônicas reconhecidas — essas são as fontes que merecem crédito.

**Trade-offs**:
- Aceita: leitor curioso sobre processo de escrita não verá pelo doc qual ferramenta foi usada. Não é informação relevante pro framework como artefato.
- Pago em: clareza de autoria; framework fica mais sustentável a longo prazo (não amarrado a um fornecedor).

**Status**: ativo.

---
