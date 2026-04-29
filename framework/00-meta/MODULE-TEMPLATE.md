---
module: XX##
title: Título do Módulo — Subtítulo Específico
stage: novice|apprentice|professional|senior|staff
prereqs: [01-01, 01-02]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# XX## — Título do Módulo

> Template oficial pra adicionar módulos ao framework. **Não** é um módulo. Use como starter copiando arquivo, renomeando, ajustando frontmatter, removendo este blockquote.
>
> Convenção de nome: `XX##-slug-curto.md`. Exemplos: `01-14-cpu-microarchitecture.md`, `03-17-accessibility-testing.md`.

## 1. Problema de Engenharia

Por que esse módulo existe. **No produto** (que problema real ele te ensina a resolver) e **na carreira** (que gap ele preenche em direção a Senior/Staff).

Tom: prosa direta, ~150-250 palavras. Estabeleça contexto e tensão.

Exemplo de abertura: "Quase todo dev Pleno trata X como caixa preta. Resultado: bugs sutis em produção, decisões mal-fundadas, e perguntas em entrevista onde você descobre que não sabe o suficiente. Este módulo ataca exatamente isso."

Termine indicando que está abaixo (em §2) e que se exige (em §3-§4).

---

## 2. Teoria Hard

Sub-secções **numeradas** (`### 2.1`, `### 2.2`, ...). Mínimo 8 subseções, ideal 14-20.

Cada subseção: 1 conceito, denso. Inclui:
- Definição precisa.
- Mecanismo interno (não só "o que", mas "como").
- Exemplos com código curto quando aplicável.
- Trade-offs e edge cases.
- Referências cruzadas a outros módulos.

Padrão de scope:
- **Fundamentos**: foundations crus (CPU, OS, redes, CS theory).
- **Plataforma**: tecnologias específicas (React, Postgres, etc.).
- **Produção**: ops, qualidade, perf, segurança.
- **Sistemas**: arquitetura, distribuído, design.
- **Amplitude**: meta-skills, especialização, carreira.

### 2.1 Primeira subseção

[Conteúdo denso. Sem padding.]

### 2.2 Segunda subseção

[...]

### 2.N Última subseção

[...]

Ao escrever subseções, lembrar:
- Termos técnicos em **EN** sempre.
- Sem emojis.
- Sem "ótima pergunta", "excelente", elogios performáticos.
- Sem prosa over-explicativa; densidade técnica.
- Cite specs/RFCs/papers quando primário; não vague reference.

---

## 3. Threshold de Maestria

Lista de **8-12 capacidades** que aluno deve demonstrar **sem consultar**. Forma:

"Você precisa, sem consultar:"

- Diferenciar X e Y.
- Explicar mecanismo de Z.
- Justificar trade-off A vs B.
- Listar 4 casos onde C aplica e 1 onde não.
- Desenhar fluxo completo de D.
- Calcular E dado F.
- Diagnosticar G dado H sintoma.

Uma capacidade por bullet. Cada uma é potencial pergunta de portão conceitual. Concretas, testáveis, sem fluff.

---

## 4. Desafio de Engenharia

Implementação não-trivial que prova entendimento. Estrutura:

### Especificação

Numerada (1, 2, 3...). Especifica:
- Setup (linguagem, libs, container).
- O que construir, com componentes principais.
- API ou interface esperada.
- Inputs / outputs / edge cases.
- Análise complementar (`analysis.md`).

Tom: claro, sem ambiguidade. Senior code review depois.

### Restrições

- Liste constraints explícitas.
- Sem usar lib X (forçar implementar).
- Cobertura de testes mínima.
- Performance / latency targets.
- Sem usar tutorial / cópia.

### Threshold

- Critérios objetivos pra "passou":
  - Tests passam.
  - Bench atinge target.
  - Doc explica decisões.
  - Sem usar X (verificável).

### Stretch

- Itens opcionais que multiplicam aprendizado.
- Geralmente: variantes, otimizações, extensões fora-do-escopo.

---

## 5. Extensões e Conexões

Lista de conexões com outros módulos. Forma `- Liga com **XXX** (assunto): explicação curta`.

Mínimo 5-8 conexões. Cobre dependências up (prereqs) e down (módulos que dependem deste).

Exemplos:
- Liga com **01-02** (OS): syscalls e processes.
- Liga com **02-07** (Node internals): event loop em runtime real.
- Liga com **04-01** (distributed theory): consensus depende deste fundamento.

Conexões claras facilitam Portão de Conexões (§3.3 do MENTOR.md).

---

## 6. Referências

Lista de fontes canônicas. Sem Medium clickbait; só primária ou autor reconhecido. Categorias típicas:

- **Livros canônicos**: title (autor) + 1 frase de por quê.
- **Papers**: title (autores, ano) + venue.
- **RFCs / Specs**: número e link.
- **Docs oficiais**: link.
- **Talks**: speaker + conf.
- **Blogs de elite**: nome + URL.
- **Repos pra ler**: GitHub link + recomendação de path inicial.

Mínimo 8 referências, ideal 12-15. Cada uma adiciona valor; sem padding.

---

## Diretrizes pra escrever

**Estilo:**
- Prosa em PT-BR, fluida.
- Termos técnicos, código, comandos, RFCs em **EN original**.
- Sem emojis. Nem decorativos, nem semânticos.
- Sem elogios performáticos.
- Frases curtas, técnicas, densas.
- Blocos de código pra trechos técnicos (mesmo nome de função em prosa).

**Profundidade:**
- ~250-350 linhas total.
- Teoria Hard 50-65% do volume.
- Cada subseção deve ensinar algo novo.
- Sem repetição de outros módulos (cross-reference em vez).

**Validação antes de commit:**
- Frontmatter completo: 6 campos.
- 6 seções obrigatórias com cabeçalho `## 1.`-`## 6.`.
- Threshold com 8-12 itens.
- Desafio com 4 sub-blocos: Especificação, Restrições, Threshold, Stretch.
- Conexões mínimo 5.
- Referências mínimo 8.

**Após criar módulo:**
1. Atualize `PROGRESS.md` adicionando linha na tabela do estágio + status `LOCKED`.
2. Atualize `framework/00-meta/INDEX.md` adicionando linha na tabela do estágio + DAG se mudou prereqs.
3. Atualize `framework/0X-stage/README.md` adicionando módulo na tabela de dependências.
4. Atualize `framework/00-meta/elite-references.md` se há repos/blogs novos canônicos pro tema.
5. Atualize `framework/00-meta/reading-list.md` se há livros novos.
6. Atualize `framework/00-meta/GLOSSARY.md` com novos termos técnicos canônicos do módulo.

---

**Não publique módulo half-baked.** Senior leitor sniff em 30 segundos. Se não está denso, faça mais research e reescreva.
