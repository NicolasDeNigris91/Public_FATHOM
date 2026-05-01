# Fathom, Protocolo de Mentoria

> Este arquivo é o **contrato canônico do mentor**. Toda sessão neste diretório opera sob estas regras, **independente de quem está mentorizando** (você mesmo, peer humano, ou hybrid).

---

## 0. Quem é o mentor neste projeto

Três modos de operação válidos. Escolha um (ou combine):

### Modo A, Self-Mentor (default mais difícil)
Você é seu próprio examinador. Funciona se:
- Disciplina alta confirmada (>3 meses de cadência sustentada).
- Aplica STUDY-PROTOCOL §1-§16 sem cortar.
- Faz portões com **rigor brutal contra si mesmo**: cada pergunta de Threshold respondida em folha em branco antes de marcar passou.
- Mantém journal honesto de falhas.

Risco principal: auto-engano. Você passa portão por exhaustão ou orgulho. Detectável: se mês depois você não consegue reproduzir o que "passou", falhou. Audit retrospectivo.

### Modo B, Peer / Cohort Mentor
Buddy ou pequeno grupo (2-5 pessoas) examinam uns aos outros. Funciona se:
- Cohort com cadence semanal mínima.
- Um mentor humano Senior+ ocasional (mensal/trimestral) calibra rigor do grupo.
- Honestidade e care no grupo (não confundir feedback com ataque).

Modelo testado em paper clubs, reading groups, pair programming intenso, college study groups.

### Modo C, Suplemento opcional de ferramentas de produtividade
Ferramentas de produtividade (qualquer suplemento de escrita, busca, ou checagem) podem auxiliar tarefas pontuais, gerar lista de perguntas a partir de um texto, sugerir contraexemplos, apontar typos em código. Tratar como **instrumento auxiliar**, nunca como substituto do portão. Restrições rígidas:
- Não usar pra **gerar a resposta** que você mesmo deveria produzir em folha em branco.
- Não usar pra **avaliar seu próprio portão**: auto-engano embutido.
- Não usar pra **resolver Desafios de Engenharia**: o ponto é deliberate practice (STUDY-PROTOCOL §4).

Modo C é apêndice. Modos A e B são onde mastery se forma.

### Modo D, Hybrid (recomendado)
Mix dos modos:
- Self-mentor pra Anki, journal, leitura, micro-portões.
- Peer/cohort pra discussões semanais e portões grandes.
- Mentor humano Senior+ ocasional pra calibration profunda (mensal ou trimestral).
- Suplemento de produtividade pra fricções pontuais (Modo C, sob restrições).

Não importa qual modo. Importa **rigor não-negociável**.

---

## 1. Identidade e Postura do Mentor

O mentor (você, peer, ou hybrid) atua como **Principal Software Engineer e Examinador Rigoroso**. Função: avaliação técnica, não apoio emocional, não geração de código.

**O mentor DEVE:**
- Tratar cada interação como avaliação.
- Exigir **precisão técnica**. "Acho que entendi" não passa.
- Sempre perguntar **"por quê?"** e **"como funciona internamente?"** antes de aceitar afirmação.
- Forçar o aluno a **desenhar fluxos**, **dar contraexemplos**, e **conectar com módulos anteriores**.
- Sinalizar buracos sem suavização. Linguagem direta: "esta resposta está incompleta", "você confundiu X com Y", "isso não é como funciona".
- Recusar pulos de etapa, pulos de portões, ou avanços sem prova.

**O mentor NÃO PODE:**
- Resolver os Desafios de Engenharia pelo aluno.
- Marcar portão como passado sem prova real.
- Aceitar "depois eu volto nisso".
- Usar emojis. Nem em respostas, nem em arquivos.
- Inflar respostas com elogios performáticos ("ótima pergunta!", "excelente!"). Tom: técnico, seco, respeitoso.

**Postura padrão:** assuma que o aluno **ainda não sabe** até prova em contrário. Quando ele afirmar saber, peça explicação, e ouça com atenção pra detalhes errados.

Em Modo A (self-mentor): você assume o papel acima contra si. Em Modo B: peer assume. Disciplina exige escolher um e operar lá.

---

## 2. Protocolo de Sessão

### 2.1 SessionStart

Toda vez que uma sessão começa, o mentor (ou o aluno em self-mode) DEVE:

1. **Ler `PROGRESS.md`** completamente. Identificar:
   - Estágio ativo
   - Módulo ativo
   - Quais portões do módulo ativo já passaram
   - Notas anteriores do mentor (especialmente "fraquezas a revisitar")
2. **Ler o frontmatter do módulo ativo** (`framework/0X-stage/M##-topic.md`).
3. **Iniciar com diagnóstico curto**, sem enrolação:
   ```
   Estado: [estágio] / [módulo] / portão [conceitual|prático|conexões] pendente.
   Última nota do mentor: "[nota]" (se houver).
   O que vamos fazer hoje?
   ```
4. **Esperar a direção do aluno.** Não comece a ensinar sem comando.

### 2.2 Quando o aluno começa do zero

Se `PROGRESS.md` está vazio:

1. Verificar se o aluno leu `STUDY-PROTOCOL.md` e `MENTOR.md`. Se não leu, mandar ler antes de qualquer coisa.
2. Encaminhar a `framework/00-meta/SELF-ASSESSMENT.md` pra calibrar.
3. Encaminhar a `framework/00-meta/STUDY-PLANS.md` pra escolher cadência.
4. Encaminhar a `framework/00-meta/reading-list.md` pra entender fontes canônicas.
5. Iniciar `01-01-computation-model.md`, sempre nessa ordem.

### 2.3 Quando o aluno declara "li o módulo X, quero o portão"

1. Confirmar prerequisites: o módulo só pode ser tentado se todos os módulos em `prereqs:` (frontmatter) estão com status `done`. Se não estão, recusar.
2. Iniciar o **Portão Conceitual** imediatamente (ver §3.1).

---

## 3. Protocolo dos 3 Portões

Cada módulo tem **três portões obrigatórios em ordem**.

> Critério explícito de pass/fail (dimensões, pesos, exemplos de falha vs passa) está em [framework/00-meta/RUBRIC.md](framework/00-meta/RUBRIC.md). Releia antes de cada portão; em peer-mentor, ambos compartilham a rubric.

### 3.1 Portão Conceitual

**Quando:** o aluno declarou que terminou de ler a Teoria Hard.

**Procedimento:**
1. **5 a 8 perguntas conceituais** sobre o conteúdo, em **ordem aleatória** (não na ordem do texto).
2. **Pelo menos 1 pergunta** exigindo **desenho ASCII ou mermaid**.
3. **Pelo menos 1** exigindo **contraexemplo**.
4. **Pelo menos 1** forçando **explicação interna**.
5. Aguardar cada resposta. **Sem dica** durante o portão.
6. Avaliar:
   - **Correta e precisa:** passa.
   - **Correta mas vaga:** rejeitar, pedir reformulação técnica.
   - **Errada:** sinalizar erro, indicar subseção a revisitar.
   - **"Não sei":** anotar, continuar, mas portão falha.

**Passou:** todas corretas.
**Falhou:** revisitar subseções, marcar `attempts: N+1` no frontmatter, repetir portão (perguntas diferentes) na próxima tentativa.

**Em self-mentor**: escreva as 5-8 perguntas em folha separada antes de tentar responder. Resposta em folha em branco. Compare com referência canônica (livro, RFC, paper). Sem auto-bondade.

**Em peer-mentor**: peer gera as perguntas com base no módulo. Você responde sem consultar.

### 3.2 Portão Prático

**Quando:** o aluno declarou que implementou o Desafio de Engenharia.

**Procedimento:**
1. Pedir o link/path do código.
2. Ler integralmente.
3. **Code review profundo** (Principal Engineer reviewing PR de Sênior):
   - **Corretude**: edge cases (input vazio, valores extremos, encoding, concorrência, falhas de IO).
   - **Performance**: complexidade real (cache, alocações, syscalls).
   - **Segurança**: injection, race conditions, timing attacks, memory safety.
   - **Design**: acoplamento, coesão, testabilidade, legibilidade.
   - **Testes**: cobertura de comportamento, property-based onde aplicável.
4. Listar todos issues classificados:
   - **BLOCKING**, **MAJOR**, **NIT**.
5. Após correções de BLOCKING, **5 perguntas justificativas**: "Por que escolheu X em vez de Y?", etc.
6. Não conseguir justificar = falha (código colado/intuído).

**Passou:** zero BLOCKING + aluno justifica todas decisões com base técnica.
**Falhou:** corrigir e retornar.

**Em self-mentor**: 24h após terminar, releia código com olhos hostis. Liste issues como se fosse PR de outro. Tente quebrar com inputs adversos. Justificativas escritas em `decisions.md`.

**Em peer-mentor**: dê código + Threshold do módulo + esta seção. Peça review. Não corrija a defesa, escute.

### 3.3 Portão de Conexões

**Quando:** Portões 1 e 2 passaram.

**Procedimento:**
1. Selecionar **2 a 3 módulos anteriores já concluídos** com relação real ao atual.
2. Pergunta integradora pra cada conexão.
3. Avaliar. Se aluno não conectar, indicar módulo esquecido e mandar revisitar.

**Passou:** todas conexões explicadas com precisão técnica.
**Falhou:** revisitar módulos esquecidos antes de avançar.

### 3.4 Encerramento do Módulo

Após os 3 portões passarem:
1. Atualizar `PROGRESS.md` (linha do módulo, marca portões com data, status `DONE`).
2. Atualizar frontmatter (status: `done`, gates com datas).
3. Adicionar **nota do mentor** se houver fraqueza notável.
4. Indicar próximo módulo.

---

## 4. Atualização do Estado

### 4.1 Após qualquer portão passar

Editar **dois arquivos**, sempre nessa ordem:

1. **Frontmatter do módulo**:
   ```yaml
   gates:
     conceitual: { status: passed, date: "YYYY-MM-DD", attempts: 1, notes: "limpo" }
     pratico: { status: pending, date: null, attempts: 0, notes: null }
     conexoes: { status: pending, date: null, attempts: 0, notes: null }
   ```

2. **`PROGRESS.md`**: atualizar célula correspondente (✅ + data) e status `DONE` se for o último portão.

### 4.2 Após qualquer portão falhar

- Frontmatter: `attempts: N+1`, `notes: "<descrição da falha>"`.
- Adicionar entrada na seção **"Notas do Mentor"** do `PROGRESS.md` se relevante.

### 4.3 Mudança de módulo ativo

Atualizar cabeçalho de `PROGRESS.md`:
```
**Estágio ativo:** Fundamentos
**Módulo ativo:** 01-02, Operating Systems
**Atualizado em:** YYYY-MM-DD
```

---

## 5. Regra de Idioma e Estilo

- **Prosa em PT-BR**, fluida.
- **Termos técnicos, código, comandos, RFCs, nomes de conceitos**: em **EN original**.
- **Nunca** traduza nome estabelecido em inglês ("encadeamento de protótipos" → "prototype chain").
- **Sem emojis.**
- **Sem elogios performáticos.**
- **Frases curtas, técnicas, densas.**
- **Blocos de código pra qualquer trecho técnico.**

---

## 6. Modo de Trabalho com o Repositório

- Módulos vivem em `framework/0X-stage/M##-topic.md`.
- Estado vive em `PROGRESS.md` (dashboard) + frontmatter de cada módulo (detalhe).
- Guia de estudo vive em `STUDY-PROTOCOL.md`.
- Fontes canônicas em `framework/00-meta/reading-list.md` e `elite-references.md`.
- **Nunca crie arquivos fora dessa estrutura.**

Código do aluno (Desafios) **não mora** neste repo, mora em repo separado. Aqui só o framework.

---

## 7. Índice de Estágios

Leitura prévia obrigatória: [STUDY-PROTOCOL.md](STUDY-PROTOCOL.md).

| Estágio | Diretório | Conteúdo |
|---------|-----------|----------|
| 1. Fundamentos | [framework/01-fundamentos/](framework/01-fundamentos/README.md) | 15 módulos + capstone |
| 2. Plataforma | [framework/02-plataforma/](framework/02-plataforma/README.md) | 19 módulos + capstone |
| 3. Professional | [framework/03-producao/](framework/03-producao/README.md) | 18 módulos + capstone |
| 4. Senior | [framework/04-sistemas/](framework/04-sistemas/README.md) | 16 módulos + capstone |
| 5. Staff/Principal | [framework/05-amplitude/](framework/05-amplitude/README.md) | 10 módulos (4 opcionais) + capstone |

Mapa global em [framework/00-meta/INDEX.md](framework/00-meta/INDEX.md). Marco v1.0 em [framework/00-meta/RELEASE-NOTES.md](framework/00-meta/RELEASE-NOTES.md). Demais metas listadas em INDEX.md.

---

## 8. Princípios Não-Negociáveis

1. **Estudo de longo prazo.** Sem prazos. Critério é **explicar o interno e provar com código**.
2. **Sem passar pano.** Bloqueio honesto > simpatia.
3. **Teoria → Threshold → Prática → Conexões.** Sempre nessa ordem.
4. **Conexões > silos.**
5. **Cada Desafio é não-trivial.**
6. **Referências de Elite sempre.** DDIA, SICP, OS:TEP, RFCs, specs oficiais.
7. **Capstone encadeado.** Logística evolui.

---

## 9. Quando o aluno tentar burlar

| Tentativa | Resposta obrigatória |
|---|---|
| "Pula o portão prático, eu já sei isso." | "Não. Implemente o Desafio." |
| "Resolve o desafio pra mim, eu adapto." | "Não. Posso te dar dica conceitual após você documentar 1h travado num ponto específico." |
| "Marca como passou, eu volto depois." | "Não. Lacunas quebram módulos posteriores." |
| "Esse módulo não é importante pra mim." | "Está no framework. Está no plano. Faça." (Exceção: skip-by-design declarado em `PROGRESS.md` Notas do Mentor + DECISION-LOG entry justificando.) |
| "Posso ler em inglês depois?" | "Sim. Faça o portão em PT-BR." |
| "Estou cansado, vamos parar." | OK. Atualize estado e encerre limpo. Não force. |

Em self-mentor: leia esta tabela **toda sessão**. Tentação de burlar é silenciosa.

---

## 10. Manutenção e Evolução do Framework

### 10.1 Quem dispara revisão

- **Aluno** quando detecta erro técnico ou lacuna pedagógica em módulo ativo.
- **Quarterly review** auto-imposto: aluno revisa SPRINT-NEXT, faz audit honesto.
- **Trigger externo**: nova RFC, paper canônico publicado, evolução de stack (04-10 tooling muda mensalmente).

### 10.2 Como propor mudança

1. Entry em `framework/00-meta/SPRINT-NEXT.md` com ID `SN-XXX`.
2. Se decisão estrutural (alteração de protocolo, novo estágio, mudança de prereqs), entry em `DECISION-LOG.md`.
3. Após executar, append em `CHANGELOG.md`.

### 10.3 Recovery após pause longa

Se você pausou >6 meses:
1. **Não recomece de onde parou** sem re-test.
2. Faça spaced re-test (STUDY-PROTOCOL §12) **agressivo** dos últimos 3 módulos passados.
3. Se falhar majority, marque módulos como `needs_refresh` em PROGRESS.md.
4. Releia subseções específicas falhadas; refaça portão simplificado (3-5 perguntas).
5. Revisita STUDY-PLANS.md; ajuste cadência ao novo contexto.

Não há vergonha em recovery. Há vergonha em fingir.

### 10.4 Sustainability checkpoints

A cada 3 portões passados, autocheck honesto:
- Você dormindo 7+ horas/dia regularmente?
- Mantém exercício 3x/semana?
- Cohort/peer ativo (algum contato técnico nas últimas 2 semanas)?
- Journal recebendo entries?
- Alguma sintoma de queima (irritabilidade, sleep ruim, retirada)?

Se 2+ em vermelho: pause 1-2 semanas. Volume sem consolidação não vira maestria.

### 10.5 Anti-isolamento gate

Após 6 meses solo (sem peer, sem mentor humano, sem cohort), bloqueie avanço temporariamente até estabelecer 1+ canal externo:
- Buddy de cadência semanal.
- Paper club.
- Mentor humano ocasional (paid ou OSS-met).
- OSS contribution recente com PR review.

Solo absoluto detecta menos buracos. Aceite o gate.

### 10.6 Skip-by-design

Você pode declarar módulo opcional como `skipped` se:
1. Eixo de carreira deliberado descarta (ex: 05-09 Bioinformatics se você não vai a biotech/healthcare/research).
2. Entry em DECISION-LOG justifica.
3. Status em PROGRESS.md vira `SKIPPED-BY-DESIGN` em vez de `LOCKED`.
4. Capstone subsequente não depende de prereqs do skipped.

Não use como atalho. Use como honestidade de eixo.

---

**Fim do protocolo.** Independente de quem mentora, você, peer, hybrid, as regras acima são o contrato. Discipline começa na hora de escolher não burlar.
