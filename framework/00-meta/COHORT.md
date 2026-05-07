# COHORT — Como rodar Fathom em grupo (e como começar quando você é o primeiro)

> Modo A do framework (self-mentor) é viável mas tem risco real de auto-engano,
> documentado em MENTOR.md §1. O framework define um **anti-isolation gate**
> (MENTOR.md §10.5) que **proíbe** passar 6 meses em Modo A solo sem revisão
> humana externa. Este doc é o **manual de operação** desse gate.
>
> Este doc resolve dois problemas operacionais:
>
> 1. Você é o primeiro aluno: não há cohort. Como bootstrap?
> 2. Já há um pequeno grupo: como organizar review, matching, cadence?

---

## 1. O dilema do first-mover

Quando você começa, **você é o aluno 1**. Não tem peer. O framework diz "encontre
um peer", mas peer não existe ainda. O que fazer?

Quatro caminhos, em ordem de fricção crescente:

### a) Aproveitar comunidades existentes (fricção mínima)

Você não precisa de uma comunidade Fathom para conseguir review. Use comunidades
adjacentes onde tópicos do framework têm densidade de gente boa:

- **Postgres**: lista oficial `pgsql-hackers`, Discord do Crunchy, fórum
  `pgconf` chats.
- **Rust**: `users.rust-lang.org`, Discord oficial, `r/rust`.
- **TLA+**: Google group `tlaplus`, slack `the-tla-plus-community` (verifique
  o link atual).
- **Distributed systems**: Aphyr's blog comments (sério), HackerNews threads
  recorrentes, `dist-sys` Discord.
- **OS / kernel**: lkml para reading, `kernel-newbies` mailing list.
- **React internals**: `React Working Group` GitHub discussions.

Como pedir review aqui sem ser annoying:

> Boa: "Implementei skip list em C como exercício pra entender a estrutura. Não
> é pra produção. Esperava O(log n) average mas no benchmark vi O(n) em padrões
> específicos. Repo: <link>. Posso pedir 10 min de revisão crítica focando em se
> minha intuição da estrutura está errada?"
>
> Ruim: "Alguém pode revisar meu código?"

A primeira é específica, mostra trabalho prévio, pede algo finito. Resposta-rate
empiricamente >50%. A segunda é spam.

### b) GitHub Discussions no próprio repo (fricção baixa)

Habilite GitHub Discussions em `NicolasDeNigris91/FATHOM` (ou um fork público):

- Categoria `Portão Conceitual` — uma discussão por módulo. Aluno posta as 5
  respostas; outros revisam.
- Categoria `Portão Prático` — link pra PR/repo do capstone, peer review é
  comentário no PR.
- Categoria `Journal Public` — opcional, quem quer entries em público.
- Categoria `Anti-isolation Check` — checkpoint mensal: "estou Modo A há N
  meses, alguém quer parear esta semana?"

Vantagem: searchable, indexed, ficha duradoura. Desvantagem: assíncrono, pode
ser lento.

### c) Servidor Discord/Matrix dedicado (fricção média)

Quando 3+ pessoas pedem matching pelo GitHub, vale criar:

- Canal `#geral`
- Canal por estágio: `#stage-1-fundamentos`, `#stage-2-plataforma`, etc.
- Canal `#portões` — pedidos de review, gabaritos.
- Canal `#paper-club` — discussão semanal de 1 paper da pasta canônica.
- Canal `#journal-share` — opcional, low-stakes.
- Canal `#mentor-matching` — 1 mensagem por pedido, formato fixo.

Cadência sugerida:

- **Voice de portão semanal** (60min): rotaciona entre 2-3 alunos. Aluno
  apresenta um portão, demais perguntam ao vivo.
- **Paper club bi-semanal** (90min): 1 paper, 2 leitores fazem pass-3
  apresentando, outros pass-1.

Não crie até a comunidade pedir. Discord vazio é deprimente e self-fulfilling.

### d) Cohort estruturada (fricção alta)

Se 5+ pessoas estão no mesmo estágio simultaneamente, opere como bootcamp
síncrono:

- Compromisso de 6 meses, 10-15h/sem (mesma cadence pra todos).
- Sessão de portão semanal síncrona (ver acima).
- 1 paper / semana, leitor designado.
- Pair programming opcional 2x/sem.
- Final do estágio: showcase de capstones.

Esse modo é poderoso mas operacionalmente caro. Não vale tentar até a primeira
cohort de 2-3 ter rodado bem.

---

## 2. Matching: quem revisa quem

Regra geral: **quem revisa Conceitual N tem que ter passado N**. Quem revisa
Prático N tem que ter passado N + 1 (já viu como aquilo é usado em prática).

| Você está em | Pede review de Conceitual de | Pede review de Prático de |
|--------------|------------------------------|----------------------------|
| 01-01 a 01-15 | Alguém ≥ módulo seguinte ou Estágio 2 | Alguém em Estágio 2+ |
| 02-01 a 02-19 | Alguém ≥ módulo seguinte ou Estágio 3 | Alguém em Estágio 3+ |
| 03-XX | Alguém em Estágio 4+ | Sênior fora do framework, code review profissional |
| 04-XX | Alguém em Estágio 5 ou um sênior dist-sys | Sênior fora; preferencialmente alguém que opera dist-sys em produção |
| 05-XX | Sênior staff+ ou autor de OSS canônico | Code review pro, conferência, ou peer-reviewer de paper |

Por que escalada externa nos estágios avançados: o framework é desenhado para
sair além de "domínio Fathom". Em Estágio 4-5 a calibração precisa vir de quem
opera essas estruturas em produção pesada.

---

## 3. Async peer review SOP

Para que peer review funcione assíncrono sem virar feedback genérico:

### Formato do pedido (aluno)

```markdown
## Pedido de review: 02-04 React Deep, portão Conceitual

**Status**: respondidas as 5 perguntas (ver `2026-08-12-02-04-conceitual.md`).
**Self-rating**: P1 ✅ alta confiança, P2 ⏳ travei na fiber lane scheduling,
P3-5 ✅ ok. Prioridade de review: P2 e P5 (conexões).
**Background do reviewer esperado**: já passou 02-04, idealmente também 04-01
(scheduling tem analogia).
**Janela**: aceito feedback até 2026-08-19. Fica em Modo A até lá; se
ninguém responder até 18/8, fecho com self-mentor + nota no journal.
**Formato de resposta esperado**: comentário em-linha no md, mais 1 parágrafo
final dizendo "passa / não passa / passa com reservas + qual a reserva".
```

### Formato da resposta (reviewer)

```markdown
**P1**: passa. Definição de Virtual DOM correta, mas você confunde "render" e
"reconciliation" — render é a função; reconciliation é o algoritmo de diff.
Não muda a passada do portão, mas pega esse vocab.

**P2**: não passa ainda. Você descreve lanes como "prioridades", o que é
correto mas raso. Lane scheduling é (a) lanes são bitmask, (b) work é
agendado por lane mais alta primeiro, (c) renderização parcial acontece
quando uma lane mais alta interrompe uma mais baixa. Veja
`packages/react-reconciler/src/ReactFiberLane.js` (CODEBASE-TOURS Tour 5).
Re-tente após 2-3 horas de leitura.

**P3, P4**: passa. P4 desenho do work loop está cirurgicamente correto.

**P5**: passa com reservas — você cita 04-01 (scheduling) que é certo, mas
falta a conexão com 04-04 (resilience: fiber é literalmente um pattern de
retry/timeout do scheduler). Mencione esta conexão e fecha.

**Veredicto**: 2/5 passa, 1/5 passa com reserva, 1/5 não passa. Conceitual
**não fechado**. Ataque P2 e revise P5; me chame de volta em 1 semana.
```

Esse formato força reviewer a ser específico (in-line + final), e força aluno
a marcar prioridade. Reduz tempo de review pra ~30 min.

---

## 4. Operacionalizando o anti-isolation gate

MENTOR.md §10.5: **proibido passar 6 meses em Modo A puro**. Na prática:

- Coloque uma entrada recorrente no journal: a cada 1º de mês, anote "última
  interação peer/mentor humana: AAAA-MM-DD".
- Se essa data ficar > 90 dias atrás, **abra issue no próprio repo** (ou
  mensagem em qualquer comunidade adjacente): "estou em isolamento de N dias,
  preciso parear este mês ou pausar progressão de portões."
- Se ficar > 180 dias e nenhum peer apareceu, **pause novos portões**. Volte
  pra módulos já fechados, faça spaced re-test, mas não progrida em
  Conceitual/Prático novos até reset.

A regra é severa de propósito. Você está pagando o preço de tempo de estudo;
não pode também pagar o preço de auto-validação enviesada.

---

## 5. Para quem opera a cohort

Se você assumiu o papel de organizar (mesmo que seja dois alunos):

- **Pinga ausentes** depois de 14 dias sem atividade. Burnout é silencioso.
- **Não rebaixe rubric**. Pressão social pra "deixar passar" é o assassino
  silencioso desse framework. Rubric é binária.
- **Demo days a cada 60 dias**. Cada aluno apresenta 1 coisa que aprendeu/fez,
  máximo 10 min. Liveness keeps it real.
- **Documente blockers comuns**. Se 3+ alunos travaram em 02-09 (Postgres
  internals), isso é sinal de gap no framework, não preguiça do aluno.
- **Não promova Modo A como default**. Modo C ou Modo B (peer + ferramenta)
  deve ser o padrão; Modo A é fallback.

---

## 6. Checklist de bootstrap

Use este checklist se você é o aluno 1 hoje:

- [ ] Habilitei GitHub Discussions no fork público.
- [ ] Postei mensagem em 1 comunidade adjacente (Postgres, Rust, TLA+, etc.)
      apresentando o framework e pedindo um peer ad-hoc.
- [ ] Adicionei lembrete recorrente mensal: "verificar isolation date".
- [ ] Configurei meta clara: encontrar peer estável até 6 meses do start.
- [ ] Confirmei que rubric não vai ser auto-rebaixada (auditoria a cada portão
      em terceira pessoa: "se outro aluno me apresentasse esta resposta, eu
      passaria?").

Cohort é uma das alavancas mais difíceis de plantar e mais valiosas quando
funciona. Não pule. Não force.
