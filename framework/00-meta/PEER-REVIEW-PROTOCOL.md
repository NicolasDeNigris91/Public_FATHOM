# Peer Review Protocol (Modo B)

> Operacional concreto pra MENTOR.md Modo B (peer / cohort). Sem isso, peer review vira "boa, você acertou" — sem calibração, sem rigor.
>
> Use este doc se você está formando ou participando de cohort de 2-5 pessoas estudando o framework. Self-mentor (Modo A) puro tem outros riscos; ver TROUBLESHOOTING.md §3.1.

---

## Filosofia

Peer review **não é mais brando que self-mentor** — é **complementar**. Outro humano pega lacunas que sua introspecção esconde. Mas exige protocolo, senão grupo cai em conforto mútuo.

Princípios não-negociáveis:
1. **Honestidade técnica > harmonia social**. Bloqueio honesto de portão > "boa, passou" performático.
2. **Cadência fixa**. Sessões agendadas; faltas explícitas, não no-show silencioso.
3. **Avaliação separada de relação**. Você examina código, não pessoa.
4. **Calibração externa periódica**. Mentor humano Senior+ trimestral confere rigor do grupo.

---

## Composição do cohort

**Tamanho**: 2-5 pessoas. Mais que 5 dilui sessões; menos que 2 não é cohort, é peer.

**Heterogeneidade**: idealmente, mistura de stages. Senior puxa rigor; Apprentice traz frescor de quem ainda dói. Mas todos devem estar no framework, não "olhando de fora".

**Compromisso**: 5-10h/semana cada, sustentado 6+ meses. Cohort de 1 mês não calibra nada.

**Filtro de entrada**: pelo menos 1 portão completo (em qualquer módulo) feito no protocolo do framework antes de entrar. Sem isso, vira "estudo em grupo casual".

**Saída**: alguém que sai do cohort declara, não desaparece. "Vou pausar, volto em 3 meses" é diferente de no-show.

---

## Cadência semanal mínima

**3 ritos por semana** (ajuste timezone do grupo):

### Rito 1 — Standup async (Slack/Discord, 5min cada)

Toda segunda. Cada membro responde:
- O que terminou semana passada (módulo, subseção, capstone progress).
- O que ataca esta semana.
- 1 bloqueio (se há).

**Não é status report**. É commitment público. Foco em compromisso, não em relatório.

### Rito 2 — Sessão técnica (sincrona, 1-2h, 1x/semana)

1 dia fixo (ex: quartas 19h). Pauta sugerida (rotaciona facilitator):

- 5 min: announcements (alguém vai faltar próximo, etc).
- 30-45 min: **deep dive técnico**. 1 membro apresenta tópico (paper, código, decisão arquitetural). Outros perguntam. Não é palestra; é defesa.
- 30-45 min: **portão pendente**. 1 membro recebe portão de outro (rotação semanal).
- 5 min: scheduling próxima.

Sem divagação. Hard stop no horário (respeito > vontade).

### Rito 3 — Paper club mensal (sincrono, 1-2h)

1 paper/mês, escolhido em comum. Three-pass de Keshav (05-04). Cada membro traz 2-3 perguntas + 1 ponto de aplicação.

Discussão estruturada:
- 10 min: TL;DR coletivo do paper.
- 30 min: perguntas individuais, 1 por vez.
- 20 min: aplicações na Logística ou em projeto de cada um.

---

## Como conduzir um Portão de outro membro

Você foi sorteado pra examinar o portão do peer. Procedimento:

### Antes da sessão (1-2h prep)

1. Releia `## 3. Threshold de Maestria` do módulo.
2. Releia [framework/00-meta/RUBRIC.md](RUBRIC.md), especificamente o portão correspondente (Conceitual / Prático / Conexões).
3. Prepare 5-8 perguntas conceituais COBRINDO Threshold + 1-2 com desenho + 1-2 com contraexemplo + 1 explicação interna.
4. Se Portão Prático: leia código do peer integralmente; anote BLOCKING / MAJOR / NIT antes da sessão.

### Durante (1-1.5h)

- Tom: técnico, seco, respeitoso. Sem elogios performáticos ("ótima pergunta!"). Sem sarcasmo.
- Aguarde resposta completa antes de comentar.
- Se errado: sinalize SEM atenuar ("Esta resposta está incompleta. X é Y, não Z porque..."). Indique subseção a revisitar.
- Se vago: peça reformulação técnica. "Pode ser mais específico no mecanismo?".
- Se "não sei": anote, continue, marque pra revisitar.

### Pass / fail (binário)

Use RUBRIC.md. Se em dúvida:
- 0-1 questão errada + ressalvas menores: passa com nota.
- 2+ questões erradas em dimensão crítica: falha. Revisitar subseções.
- Bagunça generalizada: falha. Recalibrar leitura inteira.

Decisão é binária. **Não invente "passou parcial"**. Falha não é punição, é informação.

### Depois (15min)

- Documente em PROGRESS.md do peer (ou ele documenta, com você confirmando).
- Se falhou: peer agenda revisita. Você (ou outro) faz portão diferente quando ele tentar de novo.
- Se passou com fraqueza: registre nota explícita ("verbalização de MVCC apertada; revisitar 02-09 §2.5 em 90 dias").

---

## Como receber o seu Portão

Você é o examinado. Procedimento:

### Antes

1. Confirma que terminou Teoria Hard + Threshold (Conceitual) ou Desafio (Prático) ou ambos (Conexões).
2. Faça self-review: tente responder as perguntas do Threshold em folha em branco. Se 30% falhar, **adie o portão**. Não desperdice o tempo do peer.
3. Se Portão Prático: prepare ambiente reproducible (README, comando único pra rodar, testes verdes localmente). Suba código pra repo público; mande link.

### Durante

- Sem desculpas ("estou meio cansado hoje"). Se cansado, reagende.
- Sem dica externa (Google, livro aberto). Folha em branco.
- "Não sei" é resposta válida. Inventar é falha pior.
- Defenda decisão técnica com base, não com sentimento. "Escolhi X porque Y" — Y deve ser fato técnico.
- Aceite crítica sem defensividade. Crítica é o presente.

### Depois

- Anote feedback honesto em journal.
- Se passou: marca em PROGRESS.md, atualiza frontmatter do módulo. Avança.
- Se falhou: revisita subseções específicas que falharam. Não bate em si — falha é informação.

---

## Como dar feedback honesto sem destruir relação

Tensão real: "preciso ser duro tecnicamente" vs "não quero quebrar amigos". Resolução:

### Linguagem

- Critique código/resposta, não pessoa. "Esta implementação tem race condition" ≠ "você é descuidado".
- Use "isso" em vez de "você". "Isso aqui está confuso" > "você escreveu confuso".
- Específico > geral. "Linha 47, lock antes de check-and-set" > "concorrência ruim".
- Pergunta antes de afirmar: "Por que esta escolha em vez de mutex?" Pode ser que a pessoa tenha razão.

### Estrutura de feedback (um padrão útil)

1. **Observação** (factual, sem julgamento): "O readme não documenta como rodar testes."
2. **Impacto** (por que importa): "Reviewer próximo vai gastar 30min descobrindo."
3. **Sugestão** (acionável): "Adicionar `npm test` em README seção Test."

Versus o ruim: "README está incompleto, sempre falta isso." (genérico, julgamental, não-acionável).

### O que NÃO fazer

- Sandwich (elogio-crítica-elogio). Pessoas não-bestas detectam e desconfiam dos elogios. Diga direto.
- Minimizar ("é meio que..."). Diga claro.
- Comparações com terceiros ("o Pedro fez melhor"). Compare com Threshold/RUBRIC, não com pessoas.
- Postar feedback em público quando privado serve. Slack DM > thread público.

### O que FAZER

- Comece por BLOCKING / MAJOR / NIT classificados, em ordem.
- Termine com perguntas, não com "ok agora corrige". Convite à reflexão.
- Reconheça pontos genuinamente bons (não como sandwich, como observação técnica). "Tratamento de erro em X aqui está mais robusto que a maioria — boa."

---

## Calibração externa (anti-cohort-conforto)

Sem isso, cohort vira eco chamber. Aplicar **trimestral** ou após **10 portões realizados**, o que vier primeiro:

### Opção A: mentor humano Senior+ ($150-400 por sessão)

- 1-2h. Você apresenta 1-2 portões recentes (transcript ou re-encenação).
- Mentor avalia: rigor técnico, coverage de Threshold, qualidade das perguntas, qualidade das respostas.
- Output: rubric de calibração, "vocês estão sendo brandos em X, justos em Y".
- Onde encontrar: MentorCruise, Plato, ADPList, Toptal mentorship; LinkedIn DM direto pra Senior+ na sua stack (taxa de resposta ~10-15% se mensagem boa).

### Opção B: cross-cohort exchange (gratuito)

- Encontre outro cohort estudando framework similar (CS:APP study group, "Designing Data-Intensive Apps Together", etc).
- Cada cohort manda 1 membro pra observar 1 portão do outro. Compare rubric.
- Comunidades: r/ExperiencedDevs, paperswelove Discord, Lobsters, frameworks-aligned communities.

### Opção C: review de código público (gratuito)

- Membro do cohort contribui PR em projeto OSS canônico (Postgres extension, React lib, K8s controller).
- Review pública por maintainers Senior+ é benchmark de fato.
- Se PR é aceito sem comentários major: indicador positivo.

Não pule essa etapa. Cohort sem calibração externa tem 6-12 meses de meia-vida antes de virar conforto.

---

## Anti-patterns observados

| Sintoma | Diagnóstico | Ação |
|---|---|---|
| Sessões viram bate-papo casual | Cadência sem foco | Pauta fixa, hard stops |
| 1 membro domina, outros calam | Hierarquia silenciosa | Rotação obrigatória de facilitator |
| Faltas frequentes não explicadas | Compromisso baixo | Conversa franca; remoção do cohort se persiste |
| Portões só por 1-2 membros revisores | Concentração de papel | Rotação aleatória explícita |
| "Já passei esse portão na empresa" | Hubris | Submeta-se mesmo assim. Threshold do framework é diferente |
| Conflito interpessoal não-técnico | Mistura de problemas | Resolva separado; não traga pra sessões |
| Cohort fundido com amizade | Vínculo afetivo > rigor | Calibração externa; talvez recompor cohort |

---

## Quando dissolver o cohort

Sinais legítimos:
- Eixos de carreira divergiram (todos viraram backend; um foi pra ML).
- Cadência caiu < 1 sessão/mês por 3 meses.
- Calibração externa repetida apontou inflação de portões.
- Membro chave saiu (vida) e energia evaporou.

Dissolver é OK. **Não dissolva no impulso** — pause 1-2 semanas, reflita, decida. Cohort dura 1-3 anos no caso médio; isso é viável e bom.

---

## Como encontrar peers / formar cohort

Onde gente seria está:
- Comunidades stack-aligned (Reactiflux Discord, Postgres Slack, Rust Discord, paperswelove).
- r/ExperiencedDevs threads de estudo.
- Twitter/Bluesky/Mastodon: "estudando DDIA, alguém tópico co-leitor?".
- Eventos locais (RustConf, GopherCon, KubeCon meetups).
- Open source: contribuidores recorrentes em repos canônicos são candidatos naturais.

**Pitch sugerido**:
> "Estou estudando engenharia de software seriamente via Fathom (framework Senior→Staff em PT-BR). Procuro 2-3 pessoas pra cohort com cadência semanal sustentada. Compromisso 6+ meses, 5-10h/semana, modo agnóstico (self/peer/hybrid). Qual seu eixo? Quer conversar 30min pra ver fit?"

Filtre na conversa inicial:
- Track record: já leu 1 livro técnico denso até o fim? Já implementou algo não-trivial?
- Cadência: tem 5-10h/semana real? (Não 30h imaginárias).
- Estilo: aceita feedback duro? Fala duro?
- Eixo: alinhado o suficiente pra módulos comuns serem proveitosos?

---

**Fim do protocolo.** Modo B funciona se vocês operarem como times de produto: cadência, accountability, papéis rotativos, calibração externa. Sem isso, é estudo em grupo, não cohort.
