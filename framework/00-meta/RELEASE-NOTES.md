# RELEASE-NOTES — Framework v1.0

**Status**: Shipping-ready (2026-04-28).

> Marco de fechamento do sprint inicial de construção do framework. Daqui em diante, modificações são incrementos sobre base estável, registrados em `CHANGELOG.md`.

---

## O que está pronto

### Conteúdo curricular
- **5 estágios**: Novice (15 módulos), Apprentice (19), Professional (18), Senior (16), Staff/Principal (10) = **78 módulos** + 5 capstones.
- Capstone único encadeado: Logística v0 → v1 → v2 → v3 → v4. Documentado em `CAPSTONE-EVOLUTION.md`.
- Cobertura: foundations CS → aplicações full-stack → operações → arquitetura distribuída → specialização Staff.
- 6 tracks de Staff specialization (Distributed, Platform, Frontend, Data/ML, Security, Founding).
- Especialidades opcionais: ST07 Embedded/IoT, ST08 Hardware Design, ST09 Bioinformatics/Scientific, ST10 Game Development.

### Protocolos pedagógicos
- `STUDY-PROTOCOL.md` com 16 seções: Feynman, Active Recall, Spaced Repetition, Deliberate Practice, Spaced Re-Test, Paper Reading, Public Capstone, Cohort/Peer, Journal de descobertas.
- `MENTOR.md` definindo papel do mentor (self / peer / hybrid / suplemento opcional) e protocolo dos 3 portões.
- `PROGRESS.md` como dashboard único de estado, com seções pra Spaced Re-Test Log, Paper Reading Log, Journal, Public Output, Mentorship, Personal Stack.

### Meta documentação (14 docs em `00-meta/`)
- `INDEX.md` — mapa global com DAG cross-stage.
- `CAPSTONE-EVOLUTION.md` — Logística v0→v4 consolidado.
- `CHANGELOG.md` — registro append-only de mudanças.
- `DECISION-LOG.md` — 16 decisões de design do framework com alternativas e trade-offs.
- `SPRINT-NEXT.md` — backlog priorizado pra iterações futuras.
- `GLOSSARY.md` — 250+ termos canônicos.
- `MODULE-TEMPLATE.md` — template oficial pra adições.
- `SELF-ASSESSMENT.md` — questionário de calibração inicial (66 perguntas).
- `INTERVIEW-PREP.md` — mapping módulos → entrevistas tier-1.
- `ANTIPATTERNS.md` — 200+ anti-patterns cross-cutting com referência aos módulos.
- `CODEBASE-TOURS.md` — 20 guided reading tours (V8, Postgres, Redis, libuv, React, CockroachDB, K8s, Linux kernel, Kafka, TigerBeetle, Bevy, Stripe SDK, TLA+ Examples, Tokio, Caddy/nginx, Excalidraw, SQLite, io_uring, Bun, Anthropic Cookbook).
- `STACK-COMPARISONS.md` — patterns cross-stack (Node/Java/Python/Ruby/Go/.NET/PHP/Rust/Elixir/Swift/Kotlin).
- `STUDY-PLANS.md` — 7 templates de plano por cenário (full-time, part-time, weekend, bootcamp grad, Senior→Staff, career switcher, executive).
- `RELEASE-NOTES.md` — este arquivo.
- `elite-references.md` — repos, blogs, talks, comunidades, RFCs canônicos.
- `reading-list.md` — livros canônicos por estágio + papers.

### Estrutura de raiz
- `README.md` — overview pra leitor novo.
- `MENTOR.md` — protocolo do mentor.
- `PROGRESS.md` — estado.
- `STUDY-PROTOCOL.md` — disciplinas cognitivas.

### Profundidade
Sprint 1 batch 1 elevou 6 módulos chave (N04, N15, A02, A05, S05, S04) com 1.100+ linhas adicionais. Total framework: ~28.000 linhas de conteúdo técnico denso.

---

## O que NÃO está incluído (com justificativa)

### Stage 6 Distinguished/Fellow
- **Por quê não**: trajetórias divergem demais; especialização extreme não cabe em curriculum standardizable. Staff é teto formal.

### Vídeos / screencasts
- **Por quê não**: produção custosa, desatualiza rapidamente, descobertas são feitas lendo código + texto, não passive video.

### Anki decks pré-construídos
- **Por quê não**: cards genéricos viram crutch. Cada aluno deve montar seus (force ownership cognitivo).

### Solution sketches dos Desafios
- **Por quê não no v1.0**: tentação de spoiler é grande; framework prefere force pensar do princípio. Pode entrar em v2 como sketch (não solution) se demanda real surgir.

### CI tooling automatizado
- **Por quê não no v1.0**: framework é text-based; tooling vira manutenção sem ROI claro até base estabilizar.

### Tradução EN
- **Por quê não no v1.0**: 40-80h trabalho. Decision pendente em DECISION-LOG.

---

## Limitações reconhecidas

1. **Solo absoluto tem teto**. Framework é mais útil com peer humano + job real + mentor ocasional. Solo sem nenhum canal externo entrega ~70% do potencial.

2. **Profundidade desigual residual**. Após Sprint 1 batch 1, ainda há ~7 módulos abaixo de 280 linhas (A16, N13, A17, A15, ST02, etc.). SN-007 audit reconheceu; aprofundamento triggered por uso real, não preemptivamente.

3. **Stack bias**. Heavy em Node/TypeScript/Postgres/Redis/React. STACK-COMPARISONS.md cobre conceitualmente; idioms locais (Java/Spring, Python/Django, etc.) ainda exigem catch-up specific.

4. **AI/LLM (S10) datado**. Tooling do ecossistema de modelos muda mensalmente. Foundation conceitual envelhece menos.

5. **Não substitui produção real**. Senior real exige produção em job; framework prepara mas não simula politics, legacy, deadlines, time mediano.

---

## Como começar

1. Leia `README.md` (raiz).
2. Leia `STUDY-PROTOCOL.md` integralmente — sem isso, framework vira leitura passiva.
3. Leia `MENTOR.md` (protocolo do mentor).
4. Faça `framework/00-meta/SELF-ASSESSMENT.md` honestamente.
5. Escolha plan em `framework/00-meta/STUDY-PLANS.md`.
6. Abra `framework/01-novice/N01-computation-model.md` e comece pela §1.

Próximas ações esperadas: iniciar journal pessoal, configurar Anki, achar peer/cohort, documentar Personal Stack em `PROGRESS.md`.

---

## Filosofia em uma frase

**Mastery não tem prazo. Tem prática.**

Framework te dá mapa. Você anda o território.

---

## Versionamento

- **v1.0** (2026-04-28): release inicial. Conteúdo completo dos 5 estágios + 14 metas.
- **v1.1+**: increments registered em `CHANGELOG.md`. Não há SemVer rigoroso até estabilizar uso.

Atualizações futuras virão de:
- Uso real revelando lacunas.
- Feedback de cohort/peers.
- Tecnologia evoluindo (S10 stack de modelos, novas RFCs).
- DECISION-LOG entries reabertas.

Sem promessa de cadence. Framework é vivo, mas não vira tarefa diária.

---

## Autoria

Construído por Nicolas De Nigris. Síntese pedagógica baseada em fontes canônicas listadas em `reading-list.md` e `elite-references.md`.

---

**Frameworkshipping. Disciplina começa agora.**
