---
module: ST05
title: Public Output — Blog, Talks, OSS at Scale, Audience Building
stage: staff
prereqs: [S15]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# ST05 — Public Output

## 1. Problema de Engenharia

Engineering público compounded sobre tempo. Quem publica posts, dá talks, mantém OSS visível, escreve threads — em 5 anos tem **leverage** que não-publicadores não conseguem comprar. Acesso a oportunidades, hiring pipeline, peer network, conference invites, advisor positions, salário maior, e principalmente: **clarity de pensamento** (você não escreve sem pensar).

Maioria dos engineers não publica por uma de três razões:
1. "Não tenho nada original a dizer." (Falso — sua experiência específica é original).
2. "Síndrome do impostor." (Real, mas dominável com hábito).
3. "Não tenho tempo." (É sobre prioridade).

Senior pode passar carreira inteira sem publicar; Staff/Principal aspirante geralmente publica. Não pra fama; pra **clarify thinking + build network + give back**.

Este módulo é o ofício de produzir público com qualidade: blog, talks, OSS visibilidade, social media construtivo, audiência, monetização opcional. Plus os anti-patterns (clickbait, mediocre advice, fake authority, audience-chasing).

---

## 2. Teoria Hard

### 2.1 Por que escrever (write-to-think)

Escrever expõe gaps. Você acha que entende algo até tentar explicar. Verbalizing oral é fraco; writing forces precision (S12 já tocava em RFC/ADR).

Best blog posts vêm de "tive que aprender X profundamente; document na forma que eu queria ter recebido".

Audience secondary; clarity primary.

### 2.2 Tipos de output

- **Long-form blog**: 1.500-5.000 palavras, profundidade. Idealmente evergreen.
- **Quick post**: 500-1.000 palavras, observação ou tip.
- **Twitter/LinkedIn thread**: micro-format. Dosed insight.
- **Talk**: meetup → conference. Slides + recording.
- **OSS contribution**: maintained library, popular fork, plugin.
- **Open source contributing**: PRs, issues, reviews em projetos populares.
- **Newsletter**: weekly/monthly digest pra audiência.
- **Book / e-book**: long-form único.
- **Course / video**: tutorial pago ou free.
- **Podcast**: host, guest, ou episodic.

Pick 1-2 onde você é mais natural. Não tudo.

### 2.3 Cadence sustentável

Anti-pattern: blog 1x, abandoned. Pattern: cadence baixa mas constante.

Realista para Staff IC trabalhando full time:
- 1 long-form / mês.
- 1-2 quick posts / mês.
- 1-2 talks / ano.
- OSS triagem semanal (se maintainer).

Não force. Burnout mata habit. Pause se preciso, mas resume.

### 2.4 Topic selection

Bom topic:
- Você acabou de aprender (lições frescas).
- Resolveu problema chato (alguém vai googlar).
- Tem opinião contrarian fundada.
- Cruza domínios (tech + business, ex.).
- Lição de incidente (postmortem público adapted).

Mau topic:
- Tutorial duplicate ("How to use Redux").
- Hot take sem evidence.
- Promoção sutil de empregador.
- Recap de doc oficial.

### 2.5 Long-form structure

Templates úteis:
- **Problem → Solution → Trade-offs → Conclusion**: clássico.
- **What I wish I knew about X**: experiential.
- **A deep dive on Y**: technical decomposition.
- **N lessons from doing Z**: post-incident, post-project.
- **Why we chose A over B**: ADR público.

Estrutura clear; não vagueio. Heading scannable; reader pode jump pra section.

### 2.6 Voice e style

Authentic > polished. Reader detecta voice corporate-bland.

Tone: confident sem arrogant, vulnerável quando útil ("eu não entendia X até..."), técnico quando preciso, accessible quando se beneficia.

Avoid: emojis desnecessários, exclamation overuse, slogan "leveraging synergies".

### 2.7 Editing

Primeiro draft é lixo. Editar é onde melhora.

Passes:
- **Macro**: estrutura. Sections fazem sentido?
- **Meso**: parágrafos. Fluem?
- **Micro**: frase a frase. Concisão.

Dica: deixe descansar 24h, leia em voz alta, peça leitor crítico.

Tools: Hemingway Editor (concisão), Grammarly (typos), human reviewer.

### 2.8 SEO sem virar SEO-spam

- Title clear (não clickbait).
- H2/H3 com keywords naturais.
- Meta description.
- Image alt text.
- Internal links a outros posts seus.
- Open Graph pra share decentes.

Não pre-otimize keyword density. Escreva pra humanos; SEO segue.

### 2.9 Plataforma

Próprio domínio > Medium / Substack:
- Owns content e audience.
- Custom design.
- Sem walls.
- SEO juice consolidado.

Stack baixa-fricção: Astro, Hugo, Eleventy, Next.js. Hosted no Cloudflare Pages, Vercel, Netlify (free).

Cross-post a Medium / DEV Community / hashnode com canonical link.

Social: distribuir post via Twitter/LinkedIn/Mastodon/Bluesky. Newsletter (Buttondown, Beehiiv) pra audiência direta.

### 2.10 Talks

Submeter talk:
- Identificar conferences relevantes (CFP).
- Talk title + abstract claro.
- Bio.
- Outline.

Selection rates baixos primeiras vezes. Persistir.

Preparing:
- Outline → script → slides.
- Pratique 5-10x. Tempo aperta.
- Slide design simples (1 idea per slide).
- Demos: pre-record fallback.
- Recording: maioria dá. Use pra repurpose.

Meetups internos como warm-up.

### 2.11 OSS visibility

Lib mantida em S15. Exposure adicional:
- README com badges, demo gif, quick start excelente.
- Show HN / Product Hunt launch.
- Cross-post em Reddit relevante (r/programming, r/node, etc.) com cuidado.
- Twitter / LinkedIn post no launch.
- Engagement em issues responder rapidamente.
- Slot regular pra triagem.

Awesome-* lists: PR pra ser listed em curatedlists.

### 2.12 Building audience

Slow + organic > fast + manipulated.

Patterns:
- Consistência: melhor que viralidade.
- Reply / engage com peers em fields adjacentes.
- Não DM ask follow.
- Don't gate insights atrás de paywall imediato.
- Convido subscribers via email opt-in.

Métrica vaidade: followers count. Métrica real: depth de connections, opportunities geradas, conversations qualidade.

### 2.13 Monetização (opcional)

Quando audience > 5-10k engaged:
- **Sponsorships** em newsletter.
- **Course / paid content**.
- **Consulting**.
- **Book deal**.
- **GitHub Sponsors / Patreon**.

Cuidado: monetization pode mudar voice, e audience detecta. Mantenha balance.

Maioria mantém output como career multiplier sem monetize directly.

### 2.14 Reputational risk

Hot takes errados ficam Googleable forever. Implications:
- Não disparar opinions sem think-twice.
- Aceitar errar publicly e correct.
- Avoid politics tangencial em professional channel a menos comprometido a defender.
- Cuidado com ex-employer secrets.

NDA: respeite. Pode discutir tech/practices public; não internal incidents/tools/data sem ok.

### 2.15 Receiving criticism

Public output = public criticism. Internalize:
- Critique sobre conteúdo: avalie validity.
- Trolls / personal attacks: ignore + block.
- Genuinely confused readers: clarify.
- Errado: corrija e thank.

Defensive over-explanation pior que silence + correção.

### 2.16 Content calendar

Plan basic:
- Lista de ideias rolantes (Notion, Obsidian).
- Próximos 3-5 posts esboçados.
- 1 evergreen / mês (long-form deep).
- 2-3 lighter / mês (notes, observações).

Don't post just-because. Skip se nada pra dizer.

### 2.17 Talk recording → blog post

1 talk = 1 blog post + 5 social posts + 1 newsletter feature. Repurpose deliberate maxes leverage.

Same applies inverse: post deep → talk → expanded book chapter eventually.

### 2.18 Mentoring through public

Publishing helps not only você; helps next-gen junior. Stack Overflow answers, helpful tweet replies, blog posts that survive 5+ years em search results. **Public mentorship.**

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Justificar publishing (write-to-think) sobre não-publishing.
- Listar 5 tipos de output.
- Definir cadence sustentável.
- Estruturar long-form post com 4 templates.
- Argumentar own-domain vs Medium/Substack.
- Listar 4 sources de talk acceptance.
- Discutir reputational risk e NDA.
- Aplicar repurposing 1 talk → N artifacts.
- Criticar audience-chasing patterns.

---

## 4. Desafio de Engenharia

Estabelecer **public output stream** + 1 talk dado.

### Especificação

1. **Plataforma**:
   - Próprio domain (compre se não tem). Stack escolhido (Astro/Hugo/Next).
   - Deploy em CF Pages / Vercel / Netlify.
   - Newsletter setup (Buttondown / Beehiiv) com 1+ signup form.
2. **Conteúdo inicial**:
   - 6 long-form posts em 6 meses (1/mês).
   - Topics conectando ao framework: Logística experience, paper reading lessons, TLA+ specs, RAG implementation, fintech ledger, etc.
   - Cada post 1.500-3.500 palavras, com diagrams onde útil.
3. **Lighter cadence**:
   - 1-2 quick posts / mês.
   - Threads sociais (Twitter/LinkedIn) 1-2x/semana resumindo posts.
4. **Talk**:
   - 1 talk em meetup local ou interno.
   - Recording (mesmo que pegue celular tripod).
   - Slides públicos.
   - Blog post derivado.
5. **OSS visibility**:
   - Promote `idempotency-kit` (S15) em fora público (HN/Twitter).
   - Track stars + engaged users.
6. **Track**:
   - Dashboard simples de output (posts shipped, subs, talks given).
   - Quarterly retro.

### Restrições

- Voice authentic; sem AI-generated padding.
- Sem clickbait, sem misinformation.
- Citar sources adequadamente.
- Respeitar NDA / employer policies.

### Threshold

- 6 long-form posts publicados.
- Newsletter com ≥ 100 subs orgânicos (cresce com cadence).
- 1 talk gravado.
- OSS lib ≥ 50 stars (proxy de visibility).

### Stretch

- **CFP submetido** a conf maior.
- **Course** small (Gumroad / Maven / Egghead) sobre tópico do framework.
- **Book** outline rascunhado.
- **Podcast guest** appearance.
- **Mentee** que comece publicar inspirado por você (ST06 conexão).

---

## 5. Extensões e Conexões

- Liga com **S12** (tech leadership): RFC, ADR são writing também.
- Liga com **S15** (OSS): docs públicas são output.
- Liga com **ST01** (build from scratch): blogs explicando.
- Liga com **ST02** (multi-domain capstones): cross-learnings posts.
- Liga com **ST04** (paper reading): notes viram posts.
- Liga com **ST06** (mentorship): public mentoring.
- Liga com **CAPSTONE-staff**: deliverable inclui output stream.

---

## 6. Referências

- **"On Writing Well"** — William Zinsser. Bíblia de prose nonfiction.
- **"Show Your Work"** — Austin Kleon.
- **"Atomic Habits"** — James Clear (cadence sustentável).
- **"The Programmer's Guide to Writing Well"** — Sjaak Brinkkemper.
- **"Pyramid Principle"** — Barbara Minto (estrutura argumentativa).
- **Julia Evans blog & zines** ([jvns.ca](https://jvns.ca/)) — exemplo elite de explanation.
- **Dan Luu's blog** ([danluu.com](https://danluu.com/)) — long-form técnico.
- **Patrick McKenzie** ([kalzumeus.com](https://www.kalzumeus.com/), Bits About Money). Engineering meets business.
- **Cassidy Williams** newsletter — short-form sustainability.
- **"Blogging for Engineers"** — varied talks.
- **Conference CFP guides** — Heatherf, Lara Hogan posts.
