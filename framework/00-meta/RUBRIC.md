# Rubric dos 3 Portões

> Critério explícito pra **passou** ou **falhou** em cada portão. Sem rubric, "passou" vira sentimento. Este doc é o complemento operacional do MENTOR.md §3.

## Princípio

Portão é binário: passa ou falha. Não há "passou parcial". Mas o **caminho até o pass/fail** tem dimensões mensuráveis. A rubric abaixo dá pesos e exemplos de **falha** vs **passa** pra cada dimensão. Em self-mentor, leia antes de cada portão; em peer-mentor, ambos compartilham a rubric.

Score ponderado é só ferramenta de calibração. **Decisão final é binária**: se qualquer dimensão crítica falhar, portão falha — independente do score.

---

## Portão 1: Conceitual

5-8 perguntas em ordem aleatória, ≥1 com desenho ASCII/mermaid, ≥1 com contraexemplo, ≥1 com explicação interna. Resposta em folha em branco; sem consultar.

| Dimensão | Peso | Crítico? | Falha (exemplo) | Passa (exemplo) |
|---|---|---|---|---|
| **Precisão técnica** | 35% | ✅ | "MVCC é tipo um lock que não bloqueia" | "MVCC mantém múltiplas versões da linha; cada transação enxerga snapshot via xmin/xmax visíveis ao seu xid; vacuum coleta versões mortas" |
| **Mecanismo interno** | 25% | ✅ | "Hash table é rápida" | "Hash table: hash(key) % N → slot; colisão via separate chaining ou open addressing; rehash em load factor > 0.7" |
| **Contraexemplo** | 15% | ✅ | "Sempre funciona" / silêncio | "Quebra quando hash function tem bias e load factor sobe; Java 7 HashMap.resize race em multi-thread; ataque DoS via colisão deliberada" |
| **Desenho/diagrama** | 15% | — | Caixinha sem setas/labels | Sequência de mensagens com timing, estado em cada nó, ponto de falha marcado |
| **Conexão a primary source** | 10% | — | "Li no Medium" | "DDIA cap 7, RFC 9110 §6.4, paper Raft §5.2" |

### Critério crítico (falha automática)
- 1+ resposta tecnicamente errada em dimensão "Precisão" ou "Mecanismo interno".
- "Não sei" em > 1/3 das perguntas.
- Resposta vaga aceita sem reformulação técnica.

### Score de calibração
- 9.0-10.0: passa, módulo limpo.
- 7.5-8.9: passa, mas 1-2 fraquezas anotadas em PROGRESS.md ("notas do mentor").
- < 7.5: falha. Revisitar subseções específicas. `attempts: N+1`.

### Tipos de falha comuns
- **Verbalização deficiente**: aluno tem código mental certo mas não consegue articular. Sintoma: pede pra desenhar e desenha bem, mas explicação oral é pobre. Mitigação: Feynman drill (STUDY-PROTOCOL §1) antes de retentar.
- **Cargo cult**: aluno repete frase canônica ("eventual consistency é trade-off de CAP") sem entender mecanismo. Sintoma: detalha mecanismo errado quando perguntado "como exatamente?". Falha automática.
- **Vagueza honesta**: "acho que talvez". Sinal de que aluno sabe que não sabe. Pedir reformulação técnica; se não vier, falha.

---

## Portão 2: Prático

Code review profundo + 5 perguntas justificativas. Senior PE revisando PR de Senior.

| Dimensão | Peso | Crítico? | Falha (exemplo) | Passa (exemplo) |
|---|---|---|---|---|
| **Corretude** | 30% | ✅ | Edge case (input vazio, encoding) quebra; race em concorrência | Property tests cobrem invariants; edge cases tratados explicitamente |
| **Performance** | 15% | — | O(n²) onde O(n) seria simples; alocação em hot path | Complexidade real medida; alocação fora de hot path; bench reproducible |
| **Segurança** | 20% | ✅ | SQLi possível; timing attack em comparação de senha; secrets em log | Comparação constant-time; queries parametrizadas; secrets via env/vault |
| **Design** | 15% | — | Camadas misturadas; god class; testabilidade ruim | Boundaries claras; injection via DI; testes provam design |
| **Testes** | 10% | ✅ | Só happy-path; mocks de tudo; cobertura inflada | Property-based onde aplicável; integração real (DB de verdade); cobertura comportamental, não linha |
| **Doc/decisões** | 10% | — | README ausente; sem ADR | `decisions.md` com 3-5 trade-offs; README com setup, run, test |

### Critério crítico (falha automática)
- 1+ BLOCKING issue não resolvido.
- Aluno não consegue justificar decisão técnica significativa ("escolhi X porque tutorial usou X" → falha).
- Restrições do desafio violadas (usou lib banida, copiou código, gerou via LLM o core do desafio).
- Testes que passam mas não testam comportamento real (mock retorna mock; cobertura sem assert).

### 5 perguntas justificativas (template)
1. Por que escolheu estrutura de dados X em vez de Y?
2. Como o código se comporta em [edge case adversarial específico]?
3. Onde está o gargalo de performance? Mensurou?
4. Que invariant esse teste protege? Por que isso é importante?
5. Se você refatorasse hoje, o que mudaria? (Auto-crítica honesta)

Não conseguir justificar = falha. Não admitir não saber = falha pior (sinal de adesão a código sem pensar).

### Self-mentor (24h hostis)
- Releia 24h depois com olhos de reviewer hostil.
- Liste issues como se fosse PR de outro.
- Tente quebrar com inputs adversos (fuzz, timing, concorrência).
- Justificativas escritas em `decisions.md`.
- Se você não conseguir refutar 3+ críticas suas mesmas, falha.

---

## Portão 3: Conexões

2-3 módulos anteriores selecionados pelo mentor. 1 pergunta integradora por conexão.

| Dimensão | Peso | Crítico? | Falha (exemplo) | Passa (exemplo) |
|---|---|---|---|---|
| **Relação real** | 40% | ✅ | "São parecidos" / "ambos usam DB" | "B-Tree (01-04) é o índice físico que faz EXPLAIN do Postgres (02-09) escolher Index Scan vs Seq Scan; sem entender altura da árvore, você não diagnostica regression de query plan" |
| **Direção de fluxo** | 25% | — | Conexão simétrica vaga | Aponta direção: A é prereq mecânico de B; B é caso aplicado de A; C compete com B em decisão |
| **Trade-off integrador** | 20% | ✅ | "Tem prós e contras" | "Postgres MVCC (02-09) reduz lock contention vs lock-based, mas custa vacuum overhead; em sistema com hot row, vacuum vira gargalo (caso real GitLab 2022)" |
| **Profundidade de cada conexão** | 15% | — | 1 frase superficial | Mecanismo + exemplo concreto + onde quebra |

### Critério crítico (falha automática)
- Conexão inventada (módulos que de fato não se conectam).
- Aluno cita módulo cujo conteúdo claramente esqueceu (sintoma: erra fato básico do módulo prereq).
- Resposta cumulativamente vaga em todas conexões.

### Recovery
- Se falha por esquecimento de prereq: spaced re-test do módulo prereq antes de retentar.
- Se falha por conexão inventada: aluno revisita §5 (Extensões e Conexões) do módulo atual; reformula honestamente.

---

## Encerramento

Os 3 portões passaram → atualizar:
1. Frontmatter do módulo: `status: done`, gates com `status: passed` + datas + `attempts`.
2. PROGRESS.md: marcar célula com ✅ + data; status `DONE` se for último portão.
3. **Nota do mentor** se houver fraqueza notável (ex: "Mecanismo de MVCC apertado mas verbalização demanda reforço; revisitar 02-09 §2.5 em 90 dias via spaced re-test").

## Spaced re-test gate (90+ dias)

Módulo passado há 90+ dias entra em fila de re-test. Procedimento:
1. Sortear 3 perguntas do Threshold do módulo.
2. Responder em folha em branco, em 15 minutos.
3. Se 2+ falhar: status muda para `needs_refresh`. Releia subseções específicas. Refaça portão simplificado (3-5 perguntas).
4. Se 0-1 falhar: módulo continua `done`, próximo re-test em +180 dias.

Sem este gate, "passou" vira passado morto.

---

## Anti-rubric (o que NÃO é critério)

- **Tempo gasto no módulo.** 80h ou 8h, mesmo critério de passo.
- **Estética do código.** Linter passa, fim. "Bonito" não é métrica.
- **Confiança verbal.** Aluno seguro que erra mecanismo falha; aluno hesitante que acerta passa.
- **Volume de palavras.** Resposta densa de 3 linhas > resposta vaga de 30.
- **Que livro/curso o aluno consultou.** Crítico é resposta em folha em branco.

---

**Fim da rubric.** Use junto com MENTOR.md §3. Decisão final continua sendo binária: passou ou não passou. Rubric existe pra que essa decisão seja **defensável** quando você se questionar mês depois.
