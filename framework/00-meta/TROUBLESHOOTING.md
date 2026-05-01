# Troubleshooting do Estudo

> Problemas reais que você vai encontrar percorrendo o framework, com diagnóstico e mitigação. Não é FAQ. É padrão de falha + root cause + ação concreta.
>
> Use quando travar. Diferente de [STUDY-PROTOCOL.md](../../STUDY-PROTOCOL.md) (técnicas cognitivas) e [MENTOR.md](../../MENTOR.md) (protocolo): este doc é troubleshooting reativo.

---

## Como usar

1. Identifique o sintoma na tabela.
2. Leia diagnóstico + ação.
3. Aplique. Se não resolveu em 1-2 sessões, registre nota em PROGRESS.md ("notas do mentor") e considere RECOVERY (§ no fim deste doc).

---

## 1. Padrões em Portões

### 1.1 Falho repetidamente o Portão Conceitual no mesmo módulo

**Sintoma:** já tentei 2-3 vezes, ainda não passa. Algumas perguntas eu acerto, outras erro a mesma coisa.

**Diagnóstico (escolha):**
- **Verbalização deficiente**: você desenha bem mas não articula. Sintoma específico: pede pra desenhar e desenha correto, mas explicação oral é pobre.
- **Cargo cult**: você repete a frase canônica ("eventual consistency é trade-off de CAP") sem entender mecanismo. Detectável: se perguntado "como exatamente funciona internamente?", erra mecanismo.
- **Lacuna de prereq**: a falha é em conceito que depende de módulo anterior que você passou frágil.
- **Vagueza honesta**: você mesmo sente que não sabe ("acho que talvez"). Esse é o melhor caso — sinal de calibração.

**Ação:**
- Verbalização: 30 min/dia de Feynman drill (STUDY-PROTOCOL §1) por 1 semana. Grave-se explicando os conceitos do módulo pra "público leigo". Reescuta. Identifica onde travou.
- Cargo cult: releia subseção mecânica do livro canônico (DDIA cap, OS:TEP cap, etc.). Implemente toy do mecanismo (10-50 linhas). Repita portão depois de implementar.
- Lacuna prereq: spaced re-test do módulo anterior (RUBRIC.md "Spaced re-test gate"). Pode estar `done` formalmente mas funcionalmente esquecido.
- Vagueza: você está sendo honesto. Continue revisando. 1-2 tentativas adicionais com pesquisa no meio. Se persistir, talvez o módulo precise mais peso de tempo.

### 1.2 Passei o Portão Conceitual mas estou empacado no Prático

**Sintoma:** sei explicar o conceito; código não sai ou sai errado.

**Diagnóstico:**
- **Implementation gap**: entender mecanismo ≠ implementar. Comum em concorrência, parsing, criptografia.
- **Tooling gap**: você não conhece bem a linguagem/lib do desafio (ex: Rust pra concorrência, C pra OS).
- **Spec ambígua na sua cabeça**: você está implementando "uma versão" mas não a versão exata pedida.

**Ação:**
- Implementation gap: leia 1-2 implementações canônicas (small libs, repos sugeridos em `elite-references.md`). NÃO copie. Identifique padrão estrutural. Reescreva do zero.
- Tooling gap: 1-2 dias focados em tutorial **operacional** da linguagem (não conceitual). Rust: rustlings. Go: tour of Go. C: K&R cap 1-5.
- Spec ambígua: releia `## 4. Desafio de Engenharia` do módulo, sub-bloco a sub-bloco. Anote em uma frase cada item da Especificação. Confronte com seu código atual, item por item.

### 1.3 Implementei mas o desafio "não funciona"

**Sintoma:** código compila, roda casos felizes, mas Threshold pede comportamento que não atinge (perf target, edge case, soak test).

**Diagnóstico:**
- **Premature abstraction**: você generalizou demais cedo, agora não consegue otimizar caminho específico.
- **Wrong data structure**: escolha errada de DS na fundação. Refactor amplo necessário.
- **Algorithmic limitation**: complexidade fundamental do que você fez é maior que do que o Threshold pede.

**Ação:**
- 24h hostis (RUBRIC.md): releia código com olhos hostis. Liste issues. Tente quebrar com inputs adversos.
- Profile com ferramenta certa (`perf`, `clinic.js`, `flamegraph`). Não chute. Cruza com 03-10 (backend perf).
- Considere refactor parcial: mantenha testes, reescreva o gargalo. Refactor total geralmente é desperdício.

### 1.4 Passei os 3 portões e 3 meses depois não consigo reproduzir

**Sintoma:** spaced re-test do módulo `done` falha. Você "esqueceu".

**Diagnóstico:** caminho normal de memória sem manutenção. Você não fez Anki + journal + re-implementação ocasional.

**Ação:**
- Status do módulo vira `needs_refresh` em PROGRESS.md.
- Releia §3 (Threshold de Maestria) do módulo.
- Refaça portão simplificado (3-5 perguntas, não 8).
- Re-implemente trecho central do desafio em 30-60 min (sem consultar).
- Adicione cards Anki dos pontos esquecidos.
- Sem vergonha. STUDY-PROTOCOL §12 reconhece esse padrão.

---

## 2. Padrões em Cadência

### 2.1 Estou progredindo lento demais

**Sintoma:** faz 2 meses no mesmo módulo. Ansiedade subindo.

**Diagnóstico:**
- **Módulo realmente é grande** (01-04 Data Structures, 02-09 Postgres, 04-01 Distributed Theory): 100-200h é normal.
- **Cadência insustentável**: você se prometeu 20h/semana, está fazendo 5h. Atrito gera frustração.
- **Perfectionism**: você quer dominar cada subseção 100% antes de avançar. Não funciona — entendimento sobe em camadas.

**Ação:**
- Verifique o tempo estimado do módulo no STAGE README. 100h em 2 meses a 12h/semana é normal pra módulos densos.
- Recalibrar cadência: STUDY-PLANS.md tem 7 templates. Escolha o realista, não o ambicioso.
- Perfectionism: aplique three-pass (não tudo em pass-3). Avance no Threshold de Maestria, não em cada parágrafo. Volta atrás se portão falhar.

### 2.2 Estou progredindo rápido demais e me preocupo

**Sintoma:** passo módulos em metade do tempo estimado, todos os portões na primeira tentativa.

**Diagnóstico:**
- **Background prévio forte**: você já tinha conhecimento. Genuíno.
- **Gates frouxos**: você está auto-aprovando sem rigor. Cargo cult acontece em self-mentor.
- **Ambos**: tem background mas também está sendo frouxo.

**Ação:**
- Se modo A (self-mentor): instale modo B parcial (peer review trimestral) ou modo D (hybrid com mentor humano ocasional). Calibração externa é não-negociável após 3-6 meses solo (MENTOR.md §10.5).
- Spaced re-test agressivo dos módulos passados (90 dias atrás). Se >30% falha, gates eram frouxos.
- Honesto: se sabia mesmo, AVANCE. Logística capstone vai cobrar profundidade real. Próximo capstone exposing weaknesses é seu termômetro.

### 2.3 Pausei 3 semanas. Não sei se devo recomeçar de onde parei

**Sintoma:** vida real interrompeu. Volta com vontade.

**Diagnóstico:** normal. Pausa em estudo de longo prazo não é falha; é cadência.

**Ação:**
- Pausa < 4 semanas: retome de onde parou, faça 1-2h de revisão antes (releia notas).
- Pausa 4-12 semanas: spaced re-test do último módulo passado. Releia subseções específicas que esquecer.
- Pausa > 6 meses: MENTOR.md §10.3 (Recovery Protocol). Spaced re-test agressivo dos últimos 3 módulos.

### 2.4 Travei e estou perdendo motivação

**Sintoma:** abrir o módulo dá preguiça. Procrastino sessões.

**Diagnóstico (descarte em ordem):**
- **Burnout cognitive**: estudo intenso > 8h/dia sustentado, sem espaço pra consolidação.
- **Tópico não engaja você**: ex: você quer trabalhar com frontend, está em 04-14 formal methods.
- **Vida pessoal**: stress não-relacionado projetando.
- **Real plateau**: você de fato saturou um patamar e precisa de breakthrough.

**Ação:**
- Burnout: pause 1-2 semanas (MENTOR.md §10.4 sustentability checkpoints). Volume sem consolidação não vira maestria.
- Não-engaja: skip-by-design legítimo? (MENTOR.md §10.6). Documente em DECISION-LOG. NÃO se force se módulo é opcional pro seu eixo.
- Vida pessoal: cadência reduzida temporariamente. 2h/semana > 0h.
- Real plateau: paper club, conversa com peer, code review de senior — input externo destrava.

---

## 3. Padrões em Modo (A/B/D)

### 3.1 Modo A (self-mentor) e me sinto inflando portões

**Sintoma:** intuição de que está sendo brando consigo mesmo.

**Diagnóstico:** auto-engano embutido em self-mentor. MENTOR.md §0 reconhece este risco.

**Ação:**
- Audit retrospectivo: pegue 3 módulos `done` há > 2 meses, faça portão completo agora. Se algum falhar, todos os portões dali pra frente são suspeitos.
- Adote modo D (hybrid) pelo menos parcialmente: 1 mentor humano pago ($150-300/mês) ou peer cohort de 2-3 pessoas pra portões grandes.
- PEER-REVIEW-PROTOCOL.md tem o protocolo concreto pra modo B sustentável.

### 3.2 Modo B (peer cohort) sem rigor

**Sintoma:** seus peers passam mútuos sem investigação técnica real. "Boa, você acertou".

**Diagnóstico:** cohort cultural — todos querendo se sentir bem. Calibração externa fraca.

**Ação:**
- PEER-REVIEW-PROTOCOL.md, especialmente seção "Como dar feedback honesto sem destruir relação".
- Traga mentor humano Senior+ trimestral pra calibrar. 1-2h/trimestre custa $200-400 e desinfla cohort.
- Crite gente fora do cohort: faça código de portão ser revisado por desconhecido (Discord da linguagem, paid review service).

### 3.3 Modo D (hybrid) caro demais

**Sintoma:** mentor pago + cohort + paper club, tempo e dinheiro saindo.

**Diagnóstico:** over-engineering do estudo. Maestria não exige tudo.

**Ação:**
- Mínimo viável: self-mentor + 1 peer assíncrono (Discord, Slack) + mentor humano trimestral.
- Sem mentor pago: peer cohort + 1 paper club ativo + GitHub OSS contributions (revisão pública).

---

## 4. Padrões em Capstone

### 4.1 Capstone fora de escopo (Logística v1, v2, v3)

**Sintoma:** começou v1 simples, agora tem 50 features pendentes. Nunca termina.

**Diagnóstico:** scope creep clássico. Capstone não é produto perfeito, é demonstração de domínio.

**Ação:**
- Releia "Threshold mínimo" do CAPSTONE do estágio. Foque APENAS nele.
- Stretch goals viram backlog separado em `BACKLOG.md` no repo do capstone.
- Crítica de scope com peer/mentor: o que pode ser cortado e ainda demonstrar maestria?

### 4.2 Decisão arquitetural travando v2 → v3

**Sintoma:** entre estágios, você fica paralisado: "monolito ou microservices? Postgres ou Cassandra? Kafka ou NATS?"

**Diagnóstico:** decisão sem contexto suficiente. Se nenhuma dor real apareceu, nenhuma decisão é "errada".

**Ação:**
- Default: aposte na decisão **mais reversível** (modular monolith > distribuído; Postgres > NoSQL exótica; HTTP+webhooks > Kafka). Refactor depois é OK.
- Escreva ADR (04-12) com 2-3 alternativas, escolha 1, documente trade-off.
- Crítica honesta com peer: "vou de modular monolith porque a Logística v2 não tem 5+ time owners". Defenda.

### 4.3 Logística não evolui (estagnou em v1)

**Sintoma:** módulos avançam (você está em 03-X), Logística parou.

**Diagnóstico:** desconexão entre módulos e produto. Crítico — o framework é desenhado pra encadear.

**Ação:**
- Para cada novo módulo, pergunte: "como aplico isso na Logística HOJE?" Aplique na semana.
- Se não há aplicação imediata: o módulo faz sentido pra seu eixo? Skip-by-design? Ou aplica em forma que estende, não substitui?
- Releia CAPSTONE-EVOLUTION.md pra ver onde Logística deveria estar.

---

## 5. Padrões em Output Público (Estágio 5)

### 5.1 Não consigo publicar nada (parado em rascunho)

**Sintoma:** 5 posts em draft. Nenhum publicado.

**Diagnóstico:**
- **Perfectionism**: post precisa estar "perfeito" pra publicar. Não vai estar nunca.
- **Imposter syndrome**: "quem sou eu pra opinar?".
- **Tópico errado**: você escolheu tema teórico que não dominou em prática.

**Ação:**
- Perfectionism: regra de 7. Se já está em 70% do que você consegue, publique. Iterate em público.
- Imposter: lembre — você é uma pessoa explicando algo que aprendeu pra outra que vai aprender. Não é claim de autoridade absoluta.
- Tópico: escreva sobre o que você implementou recentemente. Capstone delivery > tendência. STUDY-PROTOCOL §6.

### 5.2 Mentees me esgotam

**Sintoma:** 3 mentees, 5h/semana cada, você não tem tempo pra próprio estudo.

**Diagnóstico:** sobreengajamento. Mentor não resolve problema do mentee — guia.

**Ação:**
- Tempo box: 1-on-1 mensal de 1h, async pings entre. Não chat 24/7.
- Eleve menteeship: cada sessão produz 1 ação pro mentee, ele executa, próxima sessão revisa.
- 3 mentees sustentáveis = 3-6h/mês total, não /semana. 05-06 documenta isso.

---

## 6. Quando aplicar Recovery Protocol completo

Aplique recovery (MENTOR.md §10.3) quando:
- Pausa > 6 meses.
- Falha em 3+ portões consecutivos no mesmo módulo.
- Spaced re-test agressivo de 5+ módulos: > 30% falha.
- Burnout severo (sintomas físicos: insônia, ansiedade, irritabilidade).

Recovery não é fracasso. É calibração. Quem nunca aplica recovery em 2-3 anos de framework provavelmente está no modo de auto-engano (§3.1).

---

## 7. Quando declarar fim, abandonar, pivot

**Caso legítimo de fim**:
- Você atingiu domínio que precisava pra próximo passo de carreira (Senior consolidado, oferta Staff aceita).
- Logística está public + capstone está cristalizado em portfolio.
- Output cumulativo (blog, talks, OSS) atingiu massa crítica.

**Caso legítimo de abandonar**:
- Mudou de eixo profissional (foi pra design, gestão, empreendedorismo, etc.).
- Vida pessoal exige todo seu tempo.
- Framework não está te servindo (raro mas válido — não é pra todo mundo).

**Pivot legítimo**:
- Modular: faça partes, ignore outras. Skip-by-design (MENTOR.md §10.6).
- Reordenar: trilhas paralelas em INDEX permitem flexibilidade.
- Slow track: 2h/semana sustentado por 5 anos é melhor que 30h/semana abandonado em 6 meses.

Não há "completou Fathom". Há "Fathom serviu seu propósito". Defina propósito honestamente, persiga, declare quando atingir.

---

**Fim do troubleshooting.** Se você travou em padrão não listado aqui: documente em DECISION-LOG.md ou abre issue no repo. Patterns novos viram este doc.
