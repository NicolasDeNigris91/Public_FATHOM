# STUDY-PROTOCOL — Como Estudar Para Maestria

> Leitura obrigatória **antes de qualquer módulo do framework**. Estas técnicas são a infraestrutura cognitiva do aprendizado profundo. Sem elas, o framework vira leitura passiva e maestria não acontece.

---

## Por que esse protocolo importa

A maioria das pessoas que se diz "estudou X" só **leu** sobre X. Reconhecer ≠ saber. O cérebro confunde fluência de leitura com domínio. Você acha que entende o `event loop` porque já leu o conceito 3 vezes — mas se eu te peço pra desenhar o fluxo numa folha em branco sem consultar nada, você trava.

Maestria é a capacidade de **reproduzir o conhecimento sob estresse**, **explicá-lo a outro humano**, e **aplicá-lo em problemas novos**. Isso exige técnicas específicas, baseadas em pesquisa de psicologia cognitiva e neurociência da aprendizagem.

---

## 1. Feynman Technique — o teste mais honesto

**Princípio:** se você não consegue explicar um conceito em palavras simples, **você não entendeu**.

**Procedimento:**
1. Escolha um conceito do módulo (ex: "como funciona MVCC no Postgres").
2. **Pegue uma folha em branco** ou abra um doc vazio.
3. **Escreva uma explicação** como se fosse pra um júnior que nunca ouviu falar do assunto.
4. **Identifique os pontos onde travou** — esses são seus buracos.
5. **Volte na fonte** (livro, doc, código) **só nos pontos travados**, não no tópico inteiro.
6. **Reescreva**.

Se você precisou usar termos sem explicar (ex: escreveu "MVCC garante consistency via snapshot isolation" sem dizer o que é snapshot isolation), você não passou.

**Cadência recomendada:** Feynman ao final de cada **subseção** da Teoria Hard, não ao final do módulo. Buracos pequenos são fáceis de tampar; buracos acumulados viram avalanche.

---

## 2. Active Recall — não releia, recupere

**Princípio:** o cérebro consolida memória pelo **esforço de buscar**, não pelo esforço de ler. Releitura passiva é a técnica mais popular e a menos eficiente.

**Procedimento:**
1. Leia uma seção da Teoria Hard.
2. **Feche o material.**
3. **De cabeça**, escreva ou fale (em voz alta) os pontos-chave.
4. Compare com o original. **Anote o que esqueceu.**
5. **Não releia tudo** — releia só o que esqueceu.

**Sinal forte:** se ao fechar a página você consegue lembrar o nome do conceito mas não consegue reproduzir o mecanismo interno, você ainda não aprendeu. Você reconheceu.

**Combinação com Feynman:** Active Recall captura **fatos**; Feynman captura **mecanismos**. Use os dois.

---

## 3. Spaced Repetition — combate ao esquecimento

**Princípio:** memória de longo prazo se forma com **revisões espaçadas no tempo**, não com revisões massivas. A curva de esquecimento de Ebbinghaus é real — você esquece ~70% do que aprendeu em 24h se não revisitar.

**Ferramenta:** [Anki](https://apps.ankiweb.net/) (free, open-source, multi-plataforma).

**O que vai pro Anki:**
- **Não copie definições.** Cards de definição são quase inúteis.
- **Crie cards de pergunta-resposta**, focados em mecanismos:
  - "Qual a ordem das fases do `event loop` do Node?" → resposta detalhada
  - "Por que `[1,2,3] + [4,5,6]` em JS retorna `'1,2,34,5,6'`?" → resposta com `ToPrimitive` algorithm
  - "Diferença entre `B-Tree` e `B+Tree` em índices Postgres?" → resposta técnica
- **Cards de desenho:** pergunta = "desenhe a TLS handshake completa", resposta = imagem do fluxo.
- **Cards de contraexemplo:** "dê um caso onde `useMemo` é pior que recalcular".

**Cadência:** revise diariamente, ~15-30min. O Anki cuida do agendamento (1d → 3d → 7d → 14d → 30d → 90d).

**Volume alvo:** 50-150 cards por estágio. Mais que isso = você está memorizando ruído.

---

## 4. Deliberate Practice — prática estruturada, hard mode

**Princípio:** prática ≠ repetição. **Deliberate Practice** é prática focada em pontos de atrito, com feedback imediato, no limite da sua capacidade. Foi a técnica estudada por [Anders Ericsson](https://en.wikipedia.org/wiki/K._Anders_Ericsson) em mestres de xadrez, músicos e atletas de elite.

**Aplicação no framework:**
- Os **Desafios de Engenharia** dos módulos são deliberate practice. Eles foram desenhados pra ser desconfortáveis.
- **Sem tutorial.** Não assista vídeos resolvendo. Não copie código de Stack Overflow.
- **Sem "deixa eu ver como fulano fez".** Olhar a solução pronta destrói a sessão de aprendizado.
- **Trava de 1h:** se você travou num ponto específico por 1h documentado (escreva: "estou travado em X, tentei Y e Z, falhou em W"), aí pode pedir uma **dica conceitual** ao mentor (você mesmo, peer, ou suplemento opcional de produtividade) — nunca a resposta.
- **Falha boa:** terminar o desafio com 30% de erros que você consegue identificar e corrigir é melhor que copiar 100% certo.

**Sinal de prática mal-feita:** você consegue fazer o desafio, mas não conseguiria fazer um desafio similar com restrições levemente diferentes. Maestria é generalização.

---

## 5. Construir Antes de Ler Tudo — aprendizado situado

**Princípio:** ler 100% da teoria antes de codar é um anti-padrão. O cérebro retém o que tem **gancho situado** — você só sabe o que perguntar depois de ter batido a cabeça em algo concreto.

**Procedimento sugerido por módulo:**
1. Leia o **Problema de Engenharia** (seção 1) do módulo.
2. Leia **Teoria Hard até a primeira subseção** (~30%).
3. **Comece a tentar o Desafio de Engenharia**. Vai travar. Bom.
4. **Use o trava como bússola** — volte na seção da Teoria que responde ao trava.
5. Cicle: ler suficiente → tentar → travar → ler específico.
6. Termine a Teoria Hard depois que você implementou o suficiente pra ter intuição.

Isso aplica especialmente a módulos práticos (`A04 React`, `A09 Postgres`, `P02 Docker`). Pra módulos puramente conceituais (`S01 Distributed Systems Theory`), leia mais primeiro — não tem o que codar até entender a teoria.

---

## 6. Notas em Formato Pergunta-Resposta

**Princípio:** notas tradicionais (resumos lineares) são quase inúteis pra memória. **Notas em formato Q&A** forçam você a recuperar a info ativamente sempre que reler.

**Anti-padrão:**
> "MVCC é uma técnica de controle de concorrência que usa snapshots de versões anteriores das linhas pra permitir leituras consistentes sem bloqueio."

**Padrão correto:**
> **Q: Como o Postgres permite leituras sem bloqueio durante writes concorrentes?**
> **A:** MVCC. Cada `UPDATE`/`DELETE` cria nova versão da linha (não sobrescreve); leitores recebem um snapshot da transação delas, vendo apenas versões committed antes do início. Versões antigas são limpas pelo `VACUUM`.

Mantenha um **arquivo de notas Q&A por módulo**, no seu próprio repo de estudos (não neste framework). Isso vira material de revisão Anki e revisão visual rápida.

---

## 7. Sleep e Exercício São Pré-Requisitos Técnicos

**Princípio:** consolidação de memória de longo prazo acontece durante **sleep REM e SWS** (slow-wave sleep). Aprender bem hoje sem dormir bem é fisicamente impossível. Função executiva (planejamento, debugging mental, abstração) também depende de sono.

**Mínimos não-negociáveis:**
- **7-9 horas de sono regular**, mesmo horário todo dia.
- **Sem estudo técnico nos últimos 60 minutos antes de dormir** (luz azul + ativação cognitiva alta = sleep ruim).
- **Exercício aeróbico ≥3x/semana** (correr, pedalar, nadar). Pesquisa associa isso a melhor BDNF, melhor memória e melhor função cognitiva geral.
- **Caminhadas curtas pós-sessão de estudo** ajudam consolidação imediata (efeito documentado).

Se você está cortando sono pra estudar mais, **você está estudando pior**. Volume sem consolidação não vira maestria.

---

## 8. Ritual de Sessão Recomendado

Antes de cada sessão de estudo:

1. **Defina o alvo da sessão em uma frase.** Ex: "Hoje vou entender por que TLS handshake exige certificado X.509".
2. **Sem distrações.** Celular em outra sala. Slack/Discord fechados. Música instrumental ou silêncio.
3. **Sessões de 50-90 min** com 10 min de pausa. O cérebro entra em fadiga após ~90 min de foco intenso.
4. **Sem multitasking.** Não estude com tutorial em paralelo, com chat aberto, com tabs de Twitter. Foco total ou nada.

Após a sessão:

1. **Reescreva o que aprendeu** em 5 frases (review ativo).
2. **Crie 2-3 cards Anki** dos pontos centrais.
3. **Anote dúvidas pendentes** num arquivo "open questions" — vira material pra próxima sessão.

---

## 9. Sinais de Que Você Está Aprendendo De Verdade

- Você consegue **explicar para alguém que não é da área** sem usar jargão decorado.
- Você consegue **desenhar fluxos** sem consultar nada.
- Você **identifica casos onde o conceito quebra** (contraexemplos, edge cases).
- Você **conecta o conceito com outros módulos** sem ser cobrado.
- Você **detecta erros** num código que usa o conceito, mesmo que sutilmente quebrado.
- Você consegue **reimplementar** uma versão simplificada do mecanismo em código.

## 10. Sinais de Que Você Está Se Enganando

- Você lê e diz "faz sentido" mas não consegue reproduzir do zero.
- Você precisa **olhar o material** pra explicar o conceito.
- Você **memorizou a sintaxe** mas não sabe **por que** ela é assim.
- Você **acerta perguntas no formato exato do livro**, mas trava em variações.
- Você **resolve o desafio copiando trechos do tutorial**, em vez de pensar do princípio.

Quando esses sinais aparecerem, **pare** e volte ao Feynman + Active Recall.

---

## 11. Tracking Pessoal Recomendado (fora deste repo)

Mantenha, no seu repo pessoal de estudos:

- **`notes/`** — notas Q&A por módulo
- **`anki-decks/`** — exports de decks por estágio
- **`open-questions.md`** — dúvidas pendentes
- **`failures-log.md`** — onde você travou em cada Desafio, o que aprendeu
- **`journal.md`** — descobertas não-óbvias por módulo (lições que você não vai re-derivar)
- **`papers/`** — Q&A notes por paper (ST04 protocolo, mas começa cedo)
- **`code/`** — implementações dos Desafios de Engenharia (cada um seu próprio repo git, idealmente)

---

## 12. Spaced Re-Test — combate ao decay pós-portão

**Princípio:** passar portão **não é endpoint**. Conhecimento decai sem revisão. O Anki cuida de fatos atômicos; mas mecanismos inteiros (TLS handshake, MVCC end-to-end, Raft) precisam de re-prova periódica.

**Procedimento:**
- A cada 90 dias após passar um portão, o mentor (você mesmo, peer, ou suplemento opcional) pode te re-testar com 2-3 perguntas conceituais aleatórias do módulo (mini-portão).
- Se você não passa, módulo vira `needs_refresh` em `PROGRESS.md`. Não é falha — é manutenção.
- Você revisa subseções específicas (não o módulo inteiro) e re-passa.

**Cadência sugerida:**
- 30, 90, 180, 365 dias após `done`.
- Decreasing após cada re-pass: módulo bem retido vira "review anual".

**Sinais que precisa re-test antes do prazo:**
- Você usa o conceito em produção e percebe que esqueceu detalhe.
- Outro módulo conecta com este e você trava.

Spaced re-test transforma o framework de **certificado pontual** em **manutenção de mastery**.

---

## 13. Paper Reading Protocol

**Princípio:** ler paper é diferente de ler blog. Sem método, paper é overwhelming. O protocolo de three-pass (Keshav) torna sustentável.

**Procedimento (resumo; detalhes em ST04):**
1. **Pass 1 (5-10 min)**: título, abstract, intro, conclusion, refs. Decisão: prosseguir?
2. **Pass 2 (1h)**: leitura cuidadosa, ignore proofs/details. Note figures.
3. **Pass 3 (4+ hrs)**: re-implement na cabeça, identifique assumptions, locate flaws. Write summary.

**Q&A note format por paper:**
- Q: Qual problema?
- Q: Por que era hard?
- Q: Solução em uma frase?
- Q: Insight chave?
- Q: Como medem?
- Q: Limitações?
- Q: Conexões com módulos do framework que conheço?

**Cadence:** 1 paper / semana ou 1 / 2 semanas, slot fixo.

**Quando começar:** opcional no Apprentice; recomendado a partir do Professional; obrigatório no Senior+.

**Reading list:** comece em `framework/00-meta/reading-list.md` + `elite-references.md`. Expanda no ST04 se chegar lá.

---

## 14. Public Capstone Protocol — output público multiplica retorno

**Princípio:** projeto privado é prática; projeto público é investigação. Audiência (mesmo pequena) força clarity, gera feedback inesperado, e cria histórico verificável.

**Procedimento:**
- Cada Capstone (Novice/Apprentice/Professional/Senior/Staff) **deve** ter pelo menos:
  - Repo público no GitHub.
  - README claro: goals, non-goals, demo, run-locally.
  - Decisões documentadas (ADRs ou decision log).
  - 1 blog post explicando design choice mais saliente.
- Stretch: deploy live em URL pública; talk em meetup interno.

**Cuidado:**
- Não open-source com expectativa de manter eternamente. Documente "este é projeto de estudo; não aceito issues/PRs" no README se for o caso.
- Não publique credenciais, secrets, dados sensíveis.

**Por que importa:**
- Recruiters / peer review futuro veem progressão real.
- Você se obriga a clean code (alguém vai ler).
- Output cumulativo vira portfolio (ST05 amplifica).

---

## 15. Cohort / Peer Protocol — sozinho é mais lento

**Princípio:** estudar solo é viável; estudar com 1+ peer dobra retenção. Discussão expõe gaps invisíveis em Feynman solo.

**Formatos:**
- **Buddy estudo** (1 peer): mesma cadência, mesmo módulo. Calls semanais 1h discutindo.
- **Paper club** (3-8 pessoas): mesmo paper, encontro biweekly.
- **Reading group**: livro técnico (DDIA, OS:TEP), capítulo por semana.
- **Mentor externo**: alguém Senior+ que reviewa seu progresso ocasionalmente (mensal).

**Onde encontrar:**
- Slack/Discord communities (Rands Leadership, Pragmatic Engineer, Kubernetes Slack, frontend Brasil).
- Fórum de bootcamps técnicos sérios.
- Twitter/LinkedIn DMs respeitosos a peers em jornada similar.

**Cadência:**
- Calls regulares (semana/quinzena), short (30-60 min), com agenda.
- Não vire "amigos que falam de outras coisas" — mantenha foco técnico.

**Anti-pattern:** group chat sem estrutura. Sem cadence + agenda, dies.

**Quando solo:** se não achar peer adequado, mantenha solo + busca ativa em background. Não trave o aprendizado esperando peer.

---

## 16. Journal — lições não-óbvias por módulo

**Princípio:** Anki captura fatos. Mas **lições que você descobriu** (não estão no livro) somem se você não anotar. "Achei que MVCC e VACUUM eram ortogonais até descobrir o jeito errado em prod" é insight pessoal — não está em doc oficial.

**Procedimento:**
- Após cada módulo, escreva 3-5 frases em `journal.md` cobrindo:
  - O que mais te surpreendeu.
  - Conexão com módulo anterior que não foi óbvia.
  - Onde você travou e por que.
  - Que conceito você previu errado antes de estudar.
- Releia journal **antes** de entrar em portão de conexões — frequentemente as conexões são as que você documentou.

**Não:** journal não é diary. É registro de descoberta técnica.

---

## 17. Quarterly Review — audit honesto trimestral

Sem revisão periódica, mastery-based vira drift. Quarter sem revisão = 3 meses sem calibração de rumo. Crio template fixo, repetível, durando 1-2h por trimestre.

### Template

Crie arquivo `quarterly-review-YYYY-Qn.md` no seu repo pessoal de estudos, com seções:

```
# Quarterly Review YYYY-Qn

## Output do trimestre

- Módulos finalizados (3 portões): [lista]
- Módulos em refresh (decay re-test): [lista]
- Capstones concluídos / progredidos: [lista]
- Outputs públicos: blog posts, talks, OSS PRs, talks, etc.
- Papers lidos (3-pass + Q&A): [count + top 3]
- Anki cards adicionados: [count]
- Journal entries: [count]

## Score honesto (1-5) por dimensão

- **Disciplina cognitiva (Feynman/Active Recall)**: __
- **Cadência sustentável**: __
- **Sleep/exercise (§7)**: __
- **Public output (§14)**: __
- **Cohort/peer (§15)**: __
- **Spaced re-test (§12)**: __

## 3 perguntas brutais

1. **Qual módulo "passei" e na verdade não passei?** (re-test mental rápido em folha em branco)
2. **Onde gastei tempo sem retorno claro?**
3. **Que conhecimento decay já me afetou em problema real?**

## Realinhamento

- Próximo módulo a atacar: __
- Módulos pra re-test programado: __
- Hábito a quebrar: __
- Hábito a instalar: __
- Decisão de eixo (specialization, capstone, public output): __

## Sinais de burnout (§10.4)

- Sleep regular >= 7h: [sim/não]
- Exercise 3x/semana: [sim/não]
- Contato técnico com peer nas últimas 4 semanas: [sim/não]
- Sintoma de queima detectável: [sim/não — descrição]

Se 2+ vermelhos: pause 1-2 semanas mandatório.
```

### Cadência

- **Trimestral fixo**: 31 mar, 30 jun, 30 set, 31 dez (ou aniversário do início).
- **1-2h focadas**, sem multitask. Releia journal e commits do quarter.
- **Não pule**. Se quarter foi ruim, justamente é onde review tem mais valor.
- **Compartilhe com peer** se aplicável (cohort §15).

### Sinal de quarterly review funcionando

- Você muda algo concreto em pelo menos 1 dimensão a cada review.
- Você detecta drift antes que vire crisis.
- Em retrospectiva (2-3 reviews depois), padrões emergem que você não veria sem registro.

### Anti-padrões

- Quarterly review como ritual sem ação. Apenas listar não basta.
- Score inflado por orgulho ("4/5 disciplina" quando você sabe ser 2/5).
- Pular um trimestre porque "foi ruim" — exatamente quando review é necessário.

---

**Resumo brutal:** se você não está aplicando estas técnicas, **você não vai chegar em Senior**. Vai chegar em "li sobre arquitetura distribuída". Diferença é abismal em entrevista, em decisão técnica, em código sob pressão.

Os protocolos de §12-§17 (spaced re-test, paper, public capstone, cohort, journal, quarterly review) são o que separa Senior consolidado de Staff/Principal real. Comece os aplicáveis cedo.
