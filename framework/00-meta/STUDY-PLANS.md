# STUDY-PLANS — Templates de Plano por Cenário

> Trilhas paralelas em `INDEX.md` listam ordens; aqui dou **plans semanais reais** por cenário típico.
>
> Cada plan assume a pessoa **passou SELF-ASSESSMENT.md** e calibrou onde está. Não é receita — é template a customizar.
>
> Time é orientativo; cadência > prazo.

---

## Princípio orientador

Aprendizado profundo não escala linear com horas. 4h de foco com Feynman + Active Recall vence 12h scrolling tutorial. Plans abaixo são **honest hours of deep work**, não horas-cadeira.

Sleep + exercício são pré-requisitos (STUDY-PROTOCOL §7). Plans assumem 7+ horas sono e 3x/sem cardio mínimo. Sem isso, multiplicador 0.5x na produtividade real.

---

## Plan A — Full-time learner (sabbatical / between jobs)

**Premissa**: 30-40h/semana de foco real disponível. Geralmente 3-12 meses. Custom timing.

### Cadência diária

```
07:00 — Acordar, exercício 30min, café da manhã.
08:00 — Sessão profunda 1 (90min): Teoria Hard novo módulo.
09:30 — Pausa 15min.
09:45 — Sessão profunda 2 (90min): Implementar Desafio.
11:15 — Pausa.
11:30 — Active Recall do que estudou (30min) + Anki (30min).
12:30 — Almoço + caminhada.
14:00 — Sessão 3 (90min): continuar Desafio ou ler fonte canônica.
15:30 — Pausa.
15:45 — Sessão 4 (60-90min): codebase tour ou paper reading.
17:00 — Reflexão 15min, journal entry, prep dia seguinte.
17:30+ — Off (real off; cérebro consolida).
```

Total: ~6h deep work/dia × 5 dias = 30h/sem.

### Cronograma sugerido (estimativa, não promessa)

| Mês | Foco principal |
|---|---|
| 1 | Fundamentos 01-01-01-06 + STUDY-PROTOCOL aplicado |
| 2 | Fundamentos 01-07-01-15 + CAPSTONE-fundamentos |
| 3 | Plataforma frontend (02-01-02-06) |
| 4 | Plataforma backend (02-07-02-14) |
| 5 | Plataforma dados (02-09-02-12, 02-15-02-16) + auth + i18n |
| 6 | CAPSTONE-plataforma (Logística v1) |
| 7-8 | Professional ops + qualidade (03-01-03-10, 03-15-03-18) |
| 9 | CAPSTONE-producao (Logística v2) |
| 10-11 | Senior distribuído (04-01-04-09) |
| 12 | Senior carreira/business (04-12-04-16) |

Total full sabbatical 12-18 meses pra terminar até CAPSTONE-sistemas. Stage Staff (5) fica como continuação pós-job.

### Riscos

- **Burnout**: full-time learning é cansativo. Alterne foco, take fim-de-semana real off.
- **Isolation**: cohort/peer crítico (STUDY-PROTOCOL §15).
- **Financeiro**: orçamento.

---

## Plan B — Part-time empregado (backbone realista)

**Premissa**: 8-15h/semana entre noite + fim-de-semana. Job tempo integral. Cadência longa: 3-7 anos pra completar até Senior.

### Cadência semanal

```
Seg 19:30-21:00 (90min): Teoria Hard.
Ter 19:30-21:00 (90min): Implementar Desafio.
Qua: off (recovery).
Qui 19:30-21:00 (90min): Active Recall + Anki + journal.
Sex: off.
Sáb 09:00-12:00 (3h): Sessão profunda — codebase tour OU paper OU Desafio.
Dom 09:00-11:00 (2h): Continuação Desafio ou leitura livro canônico.
```

Total: ~10h/sem deep work.

### Cronograma sugerido

| Período | Foco |
|---|---|
| Mês 1-3 | 01-01-01-06 |
| Mês 4-6 | 01-07-01-15 + CAPSTONE-fundamentos |
| Ano 2 (12 meses) | Plataforma todo + CAPSTONE-plataforma |
| Ano 3 (12 meses) | Professional + CAPSTONE-producao |
| Ano 4 (12 meses) | Senior + CAPSTONE-sistemas |
| Ano 5+ | Stage Staff conforme aspiração |

### Riscos

- **Job exigente** sufoca cadência. Negocie limites.
- **Cônjuge / familia**: alinhamento crítico.
- **Plateau**: sentir não progresso é normal mês-a-mês; mede ano-a-ano.

### Mitigations

- **Cohort/peer**: paper club semanal sustenta motivation.
- **Capstone público** (STUDY-PROTOCOL §14): commitment device.
- **Quarterly check-in**: reavalie SELF-ASSESSMENT a cada 3 meses.

---

## Plan C — Weekend warrior

**Premissa**: 6-10h/sem **só fim-de-semana**. Filhos pequenos / job intenso / outras demandas.

### Cadência semanal

```
Seg-sex: 15min Anki + 15min review jornal antes de dormir (sustentation).
Sáb 06:00-09:00 (3h): bloco profundo enquanto família dorme.
Sáb 14:00-16:00 (2h): bloco médio.
Dom 14:00-16:00 (2h): continuation.
```

Total: ~7-8h efetivos.

### Cronograma sugerido

Multiplicar Plan B por 1.5-2x:

| Período | Foco |
|---|---|
| Ano 1 | Fundamentos |
| Ano 2-3 | Plataforma |
| Ano 4-5 | Professional |
| Ano 6-7 | Senior |

5-7 anos pra Senior.

**Aceite**: mastery não tem prazo. Senior aos 35 ou 45 é mesmo Senior.

### Risk

- **Vida do bebê**: primeiros 2 anos do filho consomem ~tudo. Pause framework explicitly se preciso. Resume sem culpa.

---

## Plan D — Bootcamp graduate / iniciante real

**Premissa**: terminou bootcamp ou autodidata; quer profundidade que não teve. Job junior provavelmente já em curso.

### Cadência adaptada

Mesmo Plan B (10h/sem) **mas começa real do zero**.

### Cronograma:

- **Mês 1**: SELF-ASSESSMENT + Plan B cadence + 01-01-01-02.
- **Trimestre 1-2**: Fundamentos todo. Lacunas detectadas em SELF-ASSESSMENT priorizadas.
- **Subsequente**: segue Plan B.

### Atenção:

- **Tentação de pular Fundamentos**: você já programa. Faça portões mesmo assim. Maior parte falha em 01-02-01-04 detalhados.
- **Não substitua job pelo framework**: trabalho remunerado provê produção real (necessária pro Senior real).
- **Mentor humano** ajuda muito nessa fase. Pague se preciso (paga-se em meses de aceleração).

---

## Plan E — Senior consolidado mirando Staff

**Premissa**: já é Senior em job real, framework é alavanca pra Staff. 8-12h/sem.

### Cadência enxuta

Pula Fundamentos + Plataforma (faça portões pra confirmar). Foco em:

- **Audit dos pontos fracos** via SELF-ASSESSMENT.
- **Stage 4 Senior modules pendentes**: 04-13 streaming, 04-14 formal methods, 04-15 OSS, 04-16 business.
- **Stage 5 Staff**: 05-01 build-from-scratch (paralelo, longo) + 05-04 paper habit + 05-05 public output + 05-06 mentorship desde já.
- **CAPSTONE-amplitude**: trabalhar continuamente; portfolio + promo case.

### Cronograma:

| Mês | Foco |
|---|---|
| 1-3 | Audit + 04-13-04-16 portões + start 05-04 paper habit. |
| 4-12 | 05-01 (1 toy), 05-02 (1 capstone), 05-05 cadence. |
| 12-24 | Continue 05-01-05-02, mentor 1-3 mentees (05-06), publicar 6+ posts (05-05). |
| Continuous | Maintain habit pós-Staff. |

Esse é o plan que mais combina com framework neste estado.

---

## Plan F — Career switcher (não-tech background)

**Premissa**: vem de outra área (engenharia, finanças, biology, etc.). Quer transitar pra tech.

### Cadência: combinação Plan A (3-6 meses bootcamp-like) + Plan B subsequente.

- **Mês 1-3 (Plan A)**: imersão Fundamentos. Setup ambiente real. Habit de coding diário.
- **Mês 4-6**: Plataforma frontend + CAPSTONE simples (não Logística inteira; algo menor). Aplicar a jobs junior.
- **Mês 7+**: job junior + Plan B cadence. Continue framework.

### Atenção:

- **Resista tentação de aplicar muito cedo**. Junior dev sem fundamento sofre 2 anos.
- **Background não-tech é ASSET**: domain knowledge (medicina, finanças, law) + tech = combinação rara e valiosa. Aproveite, não esconda.

---

## Plan G — Executive / busy professional

**Premissa**: lidera time / startup; sem tempo pra implementar Desafios. Quer literacy técnica pra decisões.

### Cadência: 4-6h/sem leitura.

Foco em **conceito + reading**, não Desafios:

- 01-01-01-04 conceitos.
- 02-07-02-09 conceitos.
- 03-02-03-07 conceitos (decision-making).
- 04-01, 04-08, 04-12, 04-16.
- 05-03 Conway's Law.

Pula Desafios. Risk: literacy sem implementation = ainda gap. Aceite explicitamente.

Cadence: 1 módulo Teoria Hard + Threshold por 2-3 semanas.

---

## Common pitfalls dos plans

### Pacing muito agressivo

Plan que requer 30h/sem por 12 meses **enquanto trabalha** falha. Burnout em 3 meses.

Calibre realista: 70% do que você acha que consegue.

### Pular STUDY-PROTOCOL

Plan sem Feynman + Active Recall + Anki + journal vira leitura passiva. Resultado: 6 meses estudando, 0 retenção em portões.

**Aplique protocols**. Não opcional.

### Sem peer

Solo absoluto sem nenhum canal externo falha. Encontre 1 buddy mínimo, paper club, ou mentor humano ocasional. Suplemento opcional de produtividade não substitui peer.

### Skip portões

"Já vi Postgres, pula 02-09 portão." 80% das vezes você falha. Faça mesmo assim.

### Não ler livros

Framework é mapa. Livros canônicos são território. DDIA, SICP, OS:TEP, CS:APP não são opcionais.

---

## Como customizar

Use plans acima como ponto de partida. Adapte:

1. **Hours/week reais** (track 2 semanas pra calibrar).
2. **Trilha priorizada** baseado em job target / interesse.
3. **Capstone scope**: shipping vs learning. Plan B-D = learning quality acima de shipping.
4. **Cohort matching**: aproveite peer com Plan similar.
5. **Quarterly review**: SELF-ASSESSMENT + plan adjustment.

---

## Decision tree rápido

- "Tenho 6 meses de sabbatical": Plan A.
- "Trabalho full-time, quero crescer": Plan B (default).
- "Filhos pequenos": Plan C.
- "Acabei de bootcamp": Plan D.
- "Já sou Senior, quero Staff": Plan E.
- "Não-tech, quero migrar": Plan F.
- "Sou exec, quero literacy": Plan G.

Recombine: B + C em transição parental, A + B em retorno após sabbatical.

---

## Final word

Plan não treina. Disciplina treina. Plan é instrumento de disciplina.

Anote em journal se você está cumprindo cadência. Mês-a-mês ajuste. Ano-a-ano celebra ganho cumulativo. Carreira inteira é consequência.
