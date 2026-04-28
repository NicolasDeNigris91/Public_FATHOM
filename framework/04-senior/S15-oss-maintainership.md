---
module: S15
title: Open Source Maintainership — Governance, RFCs, Semver, Releases, Community
stage: senior
prereqs: [S12]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# S15 — Open Source Maintainership

## 1. Problema de Engenharia

Contribuir pra OSS é fácil — abre PR, espera merge. **Manter OSS** é outro nível: você responde issues, modera community, decide o que entra e o que não, escreve roadmap, evita breaking changes mal pensadas, gerencia security disclosures, lida com burnout, e às vezes monetiza o projeto sem trair valores.

Senior técnico que aspira a Staff/Principal precisa **entender maintainership** mesmo se nunca for maintainer full-time, porque:
- Empresas avaliam impacto além do empregador. Maintainer de projeto popular ≈ peer review público, multiplicador de carreira.
- Senior em empresa cuida de **biblioteca interna** com mesmas dinâmicas (governance, semver, deprecation).
- Decisões em projeto que sua empresa depende afetam você. Saber distinguir projeto saudável de morto importa em tech selection.

Este módulo é a anatomia de OSS sério: licensing escolha, semver disciplina, RFC process, release management, deprecation, security disclosure, community moderation, sustainability (tidelift, GitHub sponsors, foundation), e como **sair** sem destruir o projeto. Plus o que não fazer (BDFL exhaustion, governance opaca, breaking changes sem path de migration).

---

## 2. Teoria Hard

### 2.1 Licenças

**Permissive**: MIT, BSD, Apache 2.0. Permitem uso comercial, modificação, fork, sem obrigação de open-source-ar derivações. Apache 2.0 também grants de patentes explícito. Default da maioria.

**Copyleft**: GPL (v2/v3), AGPL, LGPL. Derivações precisam ser redistribuídas com mesma licença. AGPL extensão pra rede (SaaS).

**Source-available** (não OSI-approved): BSL (Business Source License), SSPL (MongoDB), Elastic License. Restringem uso comercial competitivo, viram OSS após N anos.

Decisões importam:
- MIT/Apache: máximo adoption, zero proteção contra fork comercial.
- AGPL: cloud SaaS competidor obrigado a abrir → algumas big clouds evitam usar.
- BSL/SSPL: protege business, paga preço de "não é OSS" pra uns.

CLA (Contributor License Agreement) ou DCO (Developer Certificate of Origin): mecanismos de assignment de copyright/permissão.

### 2.2 Governance models

- **BDFL** (Benevolent Dictator For Life): único maintainer decide. Python (Guido até step-down), Rust era assim. Simples até o BDFL queimar.
- **Core team / TSC** (Technical Steering Committee): grupo decide. Node.js, Kubernetes.
- **Foundation**: Linux Foundation, Apache Foundation, CNCF. Vendor-neutral, donations.
- **Company-led**: Stripe owns, releases. Real autoridade da empresa, abertura limitada.
- **Meritocracy commit access**: quem contribui consistentemente ganha commit. Cuidado com exclusão.

Governance documentado (`GOVERNANCE.md`) cria legibilidade. Sem doc, decisões parecem arbitrárias.

### 2.3 Semver disciplina

Semantic Versioning: `MAJOR.MINOR.PATCH`.
- MAJOR: breaking changes.
- MINOR: features backward-compatible.
- PATCH: fixes backward-compatible.

Disciplina importa. Quebrar semver destrói confiança. "Mantemos semver" implica:
- Removed/changed signatures = MAJOR.
- New features = MINOR.
- Bug fixes que mudam comportamento documentado = MAJOR (sutil, mas honest).
- Pre-1.0: tudo permitido (`0.x.y`); convencionalmente `0.MINOR.PATCH` mas qualquer.

Calendar versioning (CalVer, ex `2024.10.0`): time-based, alternativa quando semver não cabe (rolling releases tipo Ubuntu).

### 2.4 Deprecation lifecycle

- **Deprecate**: marcar no doc + warning runtime. Manter funcional.
- **Release minor** com deprecation warning + path de migration documentado.
- **Major bump**: remover.

Padrão: deprecate em N, remover em N+1 (major). Bibliotecas usadas amplamente esperam mais (React deprecada APIs por 2-3 majors).

Anti-pattern: silent breaking changes. "Era undocumented" não justifica.

### 2.5 RFC process

Mudanças significativas passam por RFC. Estrutura:
- Problema.
- Soluções consideradas.
- Solução proposta.
- Design detalhado.
- Trade-offs.
- Migration path (se breaking).
- Open questions.

Discussão pública (PR, fórum, Discord). Decisão registrada (comment final do core team).

Examples: Rust RFCs (rust-lang/rfcs), React RFCs, Python PEPs.

### 2.6 Release management

- **Release branches**: `main` desenvolvimento + `release/x.y` long-lived pra patches.
- **Release notes**: changelog claro com sections (Added, Changed, Deprecated, Removed, Fixed, Security).
- **Conventional Commits** + **commitizen** + **release-please** automatizam.
- **Release cadence**: time-based (ex: a cada 6 semanas, Chrome) ou feature-based.
- **LTS** (Long-Term Support): release de longa duração com fixes mas sem features.

Distribuição: npm publish, crates.io, PyPI, Maven Central. Each ecosystem suas idiosyncrasies (token, signing, OIDC trust).

### 2.7 Security disclosure

Política `SECURITY.md`:
- Como reportar (email privado, GitHub security advisory).
- SLA de resposta.
- Coordinated disclosure: fix antes de publicizar.
- CVE: solicitar via MITRE ou GitHub.

Process:
1. Report privado.
2. Triage (prioridade, escopo).
3. Develop fix em branch privada.
4. Pre-announce a stakeholders críticos.
5. Release fix + CVE + advisory.
6. Public disclosure.

GitHub has Private Vulnerability Reporting + Security Advisories — use.

### 2.8 Code of Conduct e moderation

CoC (Contributor Covenant é template comum) define behavior aceitável. Enforcement requer maintainers dispostos a moderar:
- Warn → ban temp → ban permanente.
- Documentar incidentes (privately).
- Não tolerar harassment.

Sem moderation, community shrinks; toxicidade afasta contribuidores. Moderation cansa; rotacione.

### 2.9 Issue triage e backlog

Issues acumulam. Triage:
- **Bug** vs **feature** vs **question** vs **discussion**.
- **Priority**: critical / high / normal / low.
- **Good first issue**: pra novos contributors.
- **Stale**: bot fecha após N meses sem atividade. Configurar ajuda; usar com critério (não fechar bugs reais).

Templates de issue + PR (com checklists) reduzem fricção e qualidade de input.

### 2.10 Building contributors

Drive-by contributors (1 PR e somem) ≠ sustained contributors.

Cultivate:
- "Good first issues" curados.
- Mentor visíveis (responder PRs com paciência, expectativas claras).
- Listar quem contribuiu (`CONTRIBUTORS.md`, all-contributors bot).
- Convidar a virar committer após N PRs sólidos.

Drift: maintainer principal acumula tudo. Distributed ownership → bus factor saudável.

### 2.11 Bus factor

Quantos people se some-um tem o projeto continua. Bus factor 1 = projeto morto se único maintainer some.

Mitigations:
- Co-maintainers com commit access.
- Documentar tribal knowledge (architecture.md, decision log).
- Foundations (Linux, Apache) quando crítico.

### 2.12 Sustainability e funding

Maintainers queimam. Modelos:
- **GitHub Sponsors / OpenCollective**: doação direta.
- **Tidelift**: enterprise paga subscription, distribuído entre projects.
- **Dual licensing**: open-source + commercial license (Sentry, MongoDB).
- **Open core**: core open, features avançadas comerciais (GitLab, Sentry).
- **SaaS hosted**: open-source + serviço hospedado (Sentry, Plausible).
- **Foundation grants**.
- **Sponsorship corporativo**: empresa paga maintainer pra trabalhar full-time.

Sem money, top 0.1% projetos sustentam-se via voluntariado; resto dies of attrition.

### 2.13 Documentation e DX

Doc divide adoption. Categorias (Diataxis):
- **Tutorials**: passo a passo.
- **How-to**: receitas para tarefas.
- **Reference**: API completa.
- **Explanation**: conceitos, arquitetura.

DX inclui:
- `getting started` em < 5 min.
- Examples runable.
- Errors mensagens com link pra doc.
- Migration guides em majors.
- Cookbook / FAQ.

Docusaurus, mkdocs, Astro Starlight são tools comuns.

### 2.14 Building a community

- **Discord/Slack/Discourse** pra discussão.
- **Office hours** pra Q&A live.
- **Conferences/meetups**: presença visível.
- **Newsletter** com updates.
- **Public roadmap**.
- **Show & tell** de usuários.

Tom matters. "Don't be a jerk" overrides skill.

### 2.15 Saber sair

Maintainer cansado e responsável, deve **transitar** o projeto:
- Anunciar com tempo.
- Promover co-maintainer.
- Documentar tudo necessário.
- Transferir org rights.
- Last release de polish.

Anti-pattern: silent abandonment, package fica unmaintained mas todo dependent não sabe.

### 2.16 Forks: when, when not

Forks dolorosos. Aceitar quando:
- Maintainer ausente > 12 meses, security issues abertos.
- Visões fundamentalmente divergentes.

Reconciliação se possível: contribuir upstream, co-maintain.

Forks famosos: io.js → reunified com Node.js. OpenSearch from Elasticsearch.

### 2.17 Empresas e OSS

Empresa decide: usar / contribuir / open-sourcing / hire maintainer.

Contributing externally: alinhar com legal (CLA), padronizar processo. Internal OSS (innersource): mesma disciplina dentro da company.

Open-sourcing internal tool: significant work (cleanup, documentation, governance). Não open-source só pra marketing.

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Diferenciar MIT / Apache / GPL / AGPL e impacto comercial.
- Justificar semver disciplina e o que viola cada nível.
- Listar fases de deprecation lifecycle.
- Estruturar RFC: problema → soluções → escolha → trade-offs → migration.
- Listar componentes de release notes.
- Descrever security disclosure coordenado em 6 passos.
- Justificar CoC + moderation.
- Diferenciar BDFL, core team, foundation.
- Explicar 4 modelos de sustainability.
- Aplicar Diataxis à doc do projeto.
- Justificar bus factor e como aumentar.

---

## 4. Desafio de Engenharia

Lançar **biblioteca OSS extraída da Logística** + montar todo o aparato de maintainership.

### Especificação

1. **Escolher módulo extraível**: pode ser **`@logistica/idempotency-kit`** (lib que implementa idempotency keys + Redis store + Express/Fastify middleware) ou similar. Algo coeso, útil além da Logística.
2. **Repo separado** (`logistica-org/idempotency-kit` no GitHub):
   - Licença Apache 2.0 (ou MIT, justificar).
   - `README` com badges, quick start em < 30 segundos.
   - `CONTRIBUTING.md` com setup local, test, lint, conventions.
   - `CODE_OF_CONDUCT.md` (Contributor Covenant).
   - `GOVERNANCE.md` declarando quem decide e como.
   - `SECURITY.md` com endpoint de report.
   - `CHANGELOG.md` (Keep a Changelog format).
   - `MAINTAINERS.md`.
3. **Disciplina técnica**:
   - Semver desde 0.1.
   - Conventional Commits + commitlint hook.
   - **release-please** automation: PRs auto-gerados com bumps + changelog.
   - CI completo: lint, type, unit, integration, build matrix Node 18/20/22.
   - Cobertura ≥ 90%.
4. **Doc** (Diataxis):
   - Tutorial: "Adicione idempotency em 5 minutos".
   - How-to: integrar com Express, Fastify, Hono.
   - Reference: API completa via TypeDoc.
   - Explanation: por que idempotency, quando precisa.
5. **RFC process**:
   - `rfcs/` directory.
   - Escreva 1 RFC pra feature significativa (ex: "Pluggable storage backends").
   - Discussão pública via issue.
6. **Release flow**:
   - 0.1 → 0.2 → 0.3 com features.
   - 1.0 com declaration de stability.
   - Pelo menos 1 deprecation lifecycle real.
7. **Distribute**: npm publish com OIDC trust (GitHub Action).
8. **Community**:
   - Issue/PR templates.
   - Setup all-contributors bot.
   - Pelo menos 3 issues marcados "good first issue".
   - Convidar 1 colega pra virar co-maintainer.
9. **Security**:
   - Configurar GitHub Private Vulnerability Reporting.
   - Pelo menos 1 dry-run de disclosure (com colega report fake bug).
10. **Funding**:
    - Configurar GitHub Sponsors (se elegível) ou OpenCollective.
    - `FUNDING.yml`.

### Restrições

- Sem fork de outra lib; código original.
- Sem release de algo half-baked. 1.0 só após uso real em ≥ 2 projetos (Logística + outro).

### Threshold

- Lib funcional + publicada.
- Doc completa.
- ≥ 1 release com release notes.
- Governance + CoC + Security.
- 1 contributor externo invited.

### Stretch

- **Cross-runtime support**: Bun, Deno em CI.
- **Benchmarks** publicados (`bench/`).
- **Tidelift listing** (se aceitar).
- **Integration kit** com Stripe/MP webhooks.
- **Talk submission**: blog post explicando design (ligando com S15).
- **Translation**: docs em PT-BR + EN.

---

## 5. Extensões e Conexões

- Liga com **N09** (Git internals): branches, tags, signing.
- Liga com **A18** (payments): idempotency é tema canônico.
- Liga com **P04** (CI/CD): pipeline robusto é OSS standard.
- Liga com **P08** (security): disclosure, supply chain (sigstore, provenance).
- Liga com **S05** (API design): pública API design exige disciplina.
- Liga com **S12** (tech leadership): RFC, decisão técnica documentada.
- Liga com **S16** (product): open core / SaaS são modelos de business.
- Liga com **CAPSTONE-staff** (ST05/ST06): public output, mentoria.

---

## 6. Referências

- **"Producing Open Source Software"** — Karl Fogel. Gratuito, bíblia.
- **"Working in Public: The Making and Maintenance of Open Source"** — Nadia Eghbal.
- **"Roads and Bridges"** — Nadia Eghbal (foundation report).
- **GitHub OSS docs** ([opensource.guide](https://opensource.guide/)).
- **Contributor Covenant**.
- **Keep a Changelog**.
- **Semver spec** ([semver.org](https://semver.org/)).
- **Diataxis** ([diataxis.fr](https://diataxis.fr/)).
- **"How to Run a Successful Free Software Project"** — Karl Fogel talks.
- **CHAOSS metrics** — community health analytics.
- **Sustain podcast** — sustainability in OSS.
