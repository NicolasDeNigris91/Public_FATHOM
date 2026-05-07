---
module: 04-15
title: Open Source Maintainership, Governance, RFCs, Semver, Releases, Community
stage: sistemas
prereqs: [04-12]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 04-15, Open Source Maintainership

## 1. Problema de Engenharia

Contribuir pra OSS é fácil, abre PR, espera merge. **Manter OSS** é outro nível: você responde issues, modera community, decide o que entra e o que não, escreve roadmap, evita breaking changes mal pensadas, gerencia security disclosures, lida com burnout, e às vezes monetiza o projeto sem trair valores.

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

GitHub has Private Vulnerability Reporting + Security Advisories, use.

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

#### Números reais 2026

Para calibrar expectativas de quem entra em OSS:

| Tier | Projeto exemplo | Funding mensal típico | Maintainers full-time |
|---|---|---|---|
| **Hobby** | 99% dos projetos GitHub | $0 | 0 |
| **Visível, sem funding** | Maioria de libs npm com 100k weekly DL | $50-300 (GitHub Sponsors esparso) | 0 (todos voluntários) |
| **Tidelift / pequeno corp sponsor** | Libs maduras citadas em compliance | $1k-10k | 0-1 part-time |
| **Foundation-backed** | curl, OpenSSL, Linux kernel subsystems | $50k-500k | 1-5 |
| **Open core / dual-license SaaS** | Sentry, GitLab, MongoDB, Cal.com, Plausible | $1M-1B+ ARR | 50-2000 |
| **Hyperscaler-funded** | React (Meta), TypeScript (Microsoft), Rust (Foundation + corps) | n/a (subsidized) | 5-50+ |

**Reality check**: blogs e talks idealizam OSS sustentável; verdade é que 80% dos maintainers críticos estão burnt out, sub-financiados, e visivelmente cansados (Eghbal, *Working in Public*, 2020). xz-utils 2024 (compromised maintainer) é exemplo extremo de single-maintainer projeto crítico.

#### Dual-licensing — armadilha legal real

"Open-source + commercial" parece simples; tem nuances que mordem:

- **CLA (Contributor License Agreement) é mandatório** se você vai relicenciar contribuições futuras. Sem CLA, contribuição vem sob a licença OSS atual, e você não pode vender comercialmente sem permissão de cada contribuidor.
- **Discrepância CLA vs DCO**: GitHub default é DCO (Developer Certificate of Origin), que NÃO transfere copyright. Pra dual-licensing, precisa CLA explícito (FOSS Foundation ICLA, MongoDB CLA, etc.).
- **Contribuições não-substantivas (typos, docs)**: zona cinzenta. Conservador: CLA pra todo PR.
- **Backlash de comunidade**: CLA percebido como "vou monetizar contribuição alheia". Hashicorp 2023 mudança Terraform → BSL gerou OpenTofu fork; community signaling era unanimous. Se for adotar CLA, comunique cedo e justifique.

#### Casos canônicos a estudar

**Hashicorp BSL switch (2023)**:
- Mudou Terraform / Vault / Consul de MPL 2.0 (OSS) → BSL (Business Source License). Não é OSI-approved; é "fair-code".
- Causa stated: cloud providers (especialmente AWS) construindo SaaS no código sem contribuir.
- Resultado: OpenTofu fork (Linux Foundation) virou substituto OSS aceito; Terraform mantém share enterprise. Lição: **mudar licença em projeto consolidado quase sempre dispara fork credível**.

**MongoDB SSPL (2018)**:
- Mudou de AGPL → SSPL (Server Side Public License). SSPL exige código de toda stack se você oferece DBaaS. OSI rejeitou como não-OSS.
- AWS DocumentDB foi reposta com fork pre-SSPL; mas MongoDB Atlas (managed) virou stream principal de revenue.
- Lição: licenças "anti-cloud" funcionam pra **cap revenue de competitors**, não eliminam.

**Redis license switch (2024)**:
- BSD → SSPL/RSALv2 dual. Razão similar a MongoDB. Valkey fork (Linux Foundation, AWS-backed) emergiu rapidamente.
- Em 2026, ecossistema fragmentado (Redis comercial vs Valkey OSS). Apps novos preferem Valkey por default.

**Sentry FUNDING.yml caso de sucesso**:
- Sentry funcional-source (FSL); core OSS, recursos premium em SaaS hosted. ARR 9 dígitos. Maintainers pagos full-time, comunidade ativa.
- Modelo replicável: Cal.com, Plausible, PostHog. Pattern: complexity de self-host empurra mainstream pra SaaS pago, OSS mantém legitimacy + signal de qualidade.

#### Decisão pragmática pra OSS author

Se você é solo maintainer:
- **Antes de ARR $0-5k/mês**: GitHub Sponsors + signal honesto (`FUNDING.yml` no repo) + Tidelift se passes critérios.
- **$5k-50k/mês**: avalie open core hosted; CLA bem antes de qualquer mudança de licença.
- **$50k+/mês**: time de 2-5 + considere foundation OR commercial entity dual-license OR sale to acquirer.

Se você usa OSS comercialmente:
- **Sponsor proporcionalmente** ao quanto seu negócio depende (Hashicorp blog: `0.5-1% revenue → OSS sustainability`).
- **Don't free-ride sobre maintainer queimado** — sai pela culatra (xz-utils, log4j 2021, etc.).

Cruza com **05-05** (public output como força de visibilidade pro projeto) e **04-12 §2.13** (build vs buy decision considera sustainability do upstream).

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

### 2.18 Becoming a maintainer (PR triage, RFC participation, trust ladder)

Virar maintainer é earned, não pleitado. Projetos sérios (Node.js, React, Postgres, Linux kernel, Rust) operam **trust ladder** — escada observada, com permissions outorgadas após sinal sustentado de competência + julgamento.

#### Trust ladder

- **External contributor**: PR aleatório aceito após review. Zero permissions.
- **Frequent contributor**: 5-20 PRs mergeados em meses; reviewers começam a chamar pra opinar em issues correlatos.
- **Triager** (formal): permission pra labelar issues, fechar duplicates, marcar `good first issue`. Sem merge rights.
- **Reviewer**: aprovar PRs (review counts em CI/branch protection), merge ainda exige core.
- **Committer/Maintainer**: merge rights em sub-area. Responsável por release dessa area.
- **Core/TSC** (Technical Steering Committee): voto em RFCs, decisões de roadmap, governança.

Calibração real: caminho external → committer em projeto bem-mantido = **12-24 meses, 30+ PRs significantes, 100+ reviews**. Fast-track existe mas é exceção (corp sponsor, expertise rara, RFC adoptado).

#### Choosing a project to invest

Decision framework antes de despejar 6+ meses em projeto:

- **Alignment**: tecnologia que você USA em produção (incentivo natural, dogfooding).
- **Health signals**: PRs mergeados < 30 dias, issues responded < 7 dias, > 3 active maintainers, CI green em main, releases regulares.
- **Avoid**: bus factor 1, PRs sentando 6+ meses, governança opaca, hostile review tone em threads recentes.
- **Sweet spot**: large-enough pra impact (> 10k stars + corporate users) mas small-enough pra sua contribuição ser visível. Submeter PR #3 num projeto top-100 npm raramente move ladder; PR #3 num projeto 5k stars maduro sim.

#### First contribution playbook

1. Ler `CONTRIBUTING.md` linha por linha. Setup dev env localmente; build + test passing **antes** de tocar código.
2. Pick `good first issue` ou `help wanted`. Comment "I'd like to take this — should be done by <date>" antes de codar (evita duplicate work, sinaliza accountability).
3. Open PR pequeno (< 200 LOC diff): single concern, atomic commit, conventional commit message.
4. PR description responde: O QUE muda, POR QUE, COMO testar, BREAKING change?
5. Anti-padrão clássico: PR de 2000 linhas redoing arquitetura sem RFC primeiro = rejeitado sem review.

#### PR review feedback — receiving

Cruza com `superpowers:receiving-code-review`. Specifics OSS:

- **Engage substantively**: NÃO concorde performaticamente. Se discorda, argumente com data/spec/precedent (link RFC anterior, benchmark, referência da spec).
- **Address each comment explicitly**: "Done in commit X" ou "Pushing back: this is intentional because Y" — silence vira friction.
- **Squash policy varia**: Linux kernel ama atomic commits (LKML series via `git send-email`); React/Node squash-merge default; Rust mistura. Leia o projeto.
- Pegadinha: "this is fine, just nit" ainda merece fix. "Nit" significa não-blocker mas é debt; ignorar acumula reputation cost.

#### RFC participation

- Antes de propor: triple-check que NÃO foi proposto e rejeitado anos atrás (search closed issues, RFCs repo, mailing list archives).
- RFC structure canônica: problem → motivation → 3+ alternatives considered → chosen design → migration path → drawbacks → unresolved questions.
- Engage early no processo do projeto: TC39 stages (0-4), React RFCs (`reactjs/rfcs`), Rust RFCs (`rust-lang/rfcs`), Python PEPs, Postgres `pgsql-hackers` mailing list. Push for feedback **antes** de implementação.
- Anti-padrão: implementação completa + PR + "here's the RFC after the fact" = rejeitado por procedure mesmo se design for bom.

#### Building reputation in the project

- Review outros PRs **antes** de pedir review (reciprocity; reviewers escassos em todo projeto).
- Triage issues sem permission formal: comment "I reproduced this on v1.2.3, here's a minimal repro" — alta sinalidade, leva a triager invite.
- Show up em discussions com data, code snippets, links to spec — NÃO opinião pura.
- Conf talks / blog posts substantivos sobre o projeto (não fluff) increase visibility e dão context pra core team te conhecer.

#### When to walk away

- Maintainer NÃO responde em 30 dias mesmo com nudges respeitosos.
- Project culture toxic: hostile review tone, gatekeeping, mansplaining.
- Misalignment de visão (você quer feature X; core decided NÃO, repetidamente).
- Burnout pessoal: trabalho remunerado / saúde > free OSS sempre.

Walking away é decisão sã. Ficar resentido é o anti-padrão pior — gera threads tóxicas que custam reputation de todos.

#### Logística applied — extracting an OSS lib

`@logistica/idempotency-kit` (referenciado em §desafio) — playbook de saída de in-house pra OSS:

- **Maturity gate**: extrair só após 6+ meses em-prod, contracts API estáveis, breaking changes raros.
- **Initial maintainers**: você + 1 colega de time. CONTRIBUTING.md desde release 0.1.
- **Triage strategy**: issues triadas em 7 dias, label `priority/{p0|p1|p2}`, `type/{bug|feature|docs}`, `good first issue` curado.
- **Trust ladder pragmático**: aceitar 1 external committer após 5 PRs mergeados em 3 meses + 1 review substantivo de PR alheio. Documentar critério em `MAINTAINERS.md`.
- **Sustainability path**: GitHub Sponsors + Tidelift listing + corporate adoption (cruza com §2.12).

#### Anti-patterns (8)

1. PR gigante (>1k LOC) sem RFC prévio — irrevisável; reject quase certo.
2. "Drive-by" PR fixing typo + adicionando feature unrelated — split em 2 PRs.
3. Falar em issue sem ler comments anteriores — repetir argumentos já refutados queima credit.
4. "Hostile fork" público sem tentar reconciliação primeiro — queima ponte permanente.
5. PR description vazia / "fix bug" — zero contexto pra reviewer; alta probabilidade de stale.
6. Pinging maintainers `@user` em issue sem ação clara — rude, fica em log permanente do GitHub.
7. Aceitar maintainer role sem capacity real — vira bus factor problem novo.
8. Negociar trust ladder publicamente ("you should make me committer") — trust é earned, não pleitado.

Cruza com **04-12** (tech leadership: ADR/RFC discipline transfere pra OSS), **03-04** (CI/CD: contribuições passam por mesma rigor), **04-16** (product/business: OSS contribution as career capital), `superpowers:receiving-code-review` (skill aplicável diretamente), **§2.10** (building contributors interno espelha), **§2.12** (sustainability/funding após maturity).

### 2.19 OSS supply chain security — Sigstore, OIDC trusted publishers, SBOM, provenance attestations

Maintainer sério em 2026 não publica artifact sem signed provenance. Cadeia de confiança quebra em qualquer elo fraco — token vazado, build host comprometido, dep transitiva backdoored. Esta seção cobre o stack que se tornou default: Sigstore + OIDC + SBOM + SLSA.

#### Timeline de incidentes 2020-2026

- **SolarWinds (2020)**: build-system compromise → 18k organizações injetadas com Orion backdoor. Trust chain quebrou no build host.
- **event-stream (2018)**: maintainer transferiu npm publish rights pra contributor desconhecido; malicious dep injetada via minor release.
- **Log4Shell (2021)**: não é supply chain stricto, mas expôs falência de dependency management — ninguém sabia onde Log4j rodava.
- **3CX (2023)**: signed binaries com stolen code-signing certs. Provou que long-lived signing keys são liability.
- **xz-utils (2024)**: 3 anos de social engineering plantando backdoor em util core do Linux. Single-maintainer burnt out, hostile contributor virou co-maintainer, slow-rolled o ataque até `sshd` comprometido.
- **Pattern**: trust chain breaks; key/certificate management é o weak link.
- **2026 reality**: SLSA framework adoção mainstream, Sigstore default, npm/PyPI mandam trusted publishers pra packages críticos.

#### Sigstore — keyless signing

**Identidade-baseado, não key-baseado**. Signers usam OIDC token (GitHub Actions, Google OAuth) ao invés de long-lived signing keys. Componentes (Sigstore project, Cosign 2.4+):

- **Cosign**: CLI sign/verify containers + arbitrary blobs.
- **Fulcio**: certificate authority emite cert short-lived (10 min) baseado em OIDC token validado.
- **Rekor**: transparent log de signatures (auditable, append-only, Merkle tree-backed).

Insight central: **no key management problem**. Key existe por 10 minutos durante o build; depois disso, prova de quem assinou está em Rekor + cert tied to OIDC subject. Adoção 2026: Kubernetes, distroless, npm/PyPI provenance attestation.

#### GitHub Actions — npm provenance pattern

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags: ['v*']
permissions:
  id-token: write    # OIDC token pra Sigstore (mandatório)
  contents: read
  packages: write
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm test
      - run: npm run build
      - name: Publish com provenance
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: npm publish --provenance --access public
```

`--provenance` (npm 9.5+): npm CLI gera SLSA provenance, assina via Sigstore com OIDC token do GitHub Actions, registra em Rekor, anexa ao package metadata. Consumer roda `npm audit signatures` pós-install — verifica que provenance chain bate.

#### Cosign para container images

```bash
# Sign keyless (rodando dentro de GitHub Actions, OIDC implícito)
cosign sign --yes ghcr.io/logistica/orders-api:v1.5.0

# Gerar SBOM CycloneDX 1.6 e atestar
syft ghcr.io/logistica/orders-api:v1.5.0 -o cyclonedx-json > sbom.json
cosign attest --predicate sbom.json --type cyclonedx --yes \
  ghcr.io/logistica/orders-api:v1.5.0

# Verify signature (consumer side) — exige bind a workflow/tag específico
cosign verify ghcr.io/logistica/orders-api:v1.5.0 \
  --certificate-identity 'https://github.com/logistica/orders-api/.github/workflows/release.yml@refs/tags/v1.5.0' \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com'

# Verify SBOM attestation
cosign verify-attestation ghcr.io/logistica/orders-api:v1.5.0 \
  --type cyclonedx \
  --certificate-identity 'https://github.com/logistica/orders-api/.github/workflows/release.yml@refs/tags/v1.5.0' \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com'
```

Detalhe crítico: `--certificate-identity` e `--certificate-oidc-issuer` são **mandatórios**. Sem eles, qualquer workflow OIDC-capable assina com identidade arbitrária e o `verify` aceita.

#### SBOM — Software Bill of Materials

- **Formatos**: CycloneDX 1.6+ (OWASP, broader use cases) ou SPDX 2.3+ (Linux Foundation, license-focused).
- **Geradores**: Syft (Anchore), CycloneDX CLI, SPDX SBOM generator, `npm sbom` (built-in npm 10+).
- **Use cases**: vulnerability scan (Grype, Trivy, Snyk), license audit, compliance regulatória (US Executive Order 14028 mandata SBOM pra software vendido ao governo federal).
- Pattern Logística: cada release publica SBOM como cosign attestation; downstream verifica + roda Grype na pipeline de deploy.

#### OIDC trusted publishers (npm + PyPI 2024+)

Modelo antigo: long-lived API token em GitHub secrets. Leak = supply chain attack (event-stream-style).

Modelo trusted publisher: registry valida OIDC token diretamente do GitHub Actions runner. Sem secret armazenado.

- **npm**: package settings → Trusted Publisher → declare GitHub org/repo + workflow path + environment opcional.
- **PyPI**: similar; suporta GitHub, GitLab, Google Cloud, ActiveState.
- **Effect**: mesmo se atacante pwn o repo, não consegue publicar de workflow arbitrário — config liga ao path exato. Tighten ainda mais com environment protection rules + required reviewers.

#### Logística applied — `@logistica/idempotency-kit`

- **Source**: `logistica-org/idempotency-kit` no GitHub.
- **Release pipeline**: GitHub Actions com `id-token: write`; `npm publish --provenance`; cosign sign de tarball auxiliar.
- **SBOM**: CycloneDX 1.6 gerado por release; attested com cosign, anexado ao GitHub Release.
- **Trusted publisher**: npm configurado pra aceitar somente `release.yml@refs/tags/v*` de `logistica-org/idempotency-kit`. Branch pushes não publicam, ever.
- **Verification consumer-side**: pipeline da Logística roda `npm audit signatures` em CI; bloqueia install se provenance falhar. Grype scan diário do SBOM publicado.

#### SLSA framework — Supply chain Levels for Software Artifacts (v1.0)

- **L0**: zero requirements (default da maioria dos projetos).
- **L1**: build process documentado + provenance gerada (não obrigatoriamente assinada).
- **L2**: hosted build service + signed provenance — alvo realista pra maioria.
- **L3**: source + build platform com guarantees fortes (auditable, hardened, isolated builds).
- **L4**: reproducible builds + 2-person review obrigatório.

2026 industry baseline: **L2 mínimo**; L3 pra security-critical (crypto libs, infra core). L4 raríssimo fora de Linux kernel + alguns Google internal.

#### Continuous vulnerability scanning + VEX

- **Static scan**: Grype, Trivy, Snyk consomem SBOM e cruzam com CVE databases (NVD, GitHub Advisory).
- **VEX (Vulnerability Exploitability eXchange)**: spec OpenVEX — annota "CVE-X afeta lib Y mas não é exploitable no nosso uso porque não chamamos função vulnerável". Reduz alert fatigue real.
- **Dependabot / Renovate**: auto-PR pra deps vulneráveis. Renovate é mais configurável; Dependabot é nativo GitHub.
- **Pattern Logística**: nightly Grype em images deployadas; Renovate auto-PR pra CVE high/critical; VEX statements revisados em security review trimestral.

#### Anti-patterns observados (10)

1. Long-lived npm/PyPI token em GitHub secrets pra publish (rotate em compromise; substituir por OIDC trusted publisher).
2. `cosign verify` sem `--certificate-identity` + `--certificate-oidc-issuer` (qualquer workflow assina; verificação é teatro).
3. SBOM gerado mas não attested ou armazenado (no audit trail; útil zero pós-deploy).
4. SLSA L0 vendido como "secure" em marketing (L0 é literalmente "no requirements").
5. VEX statements escritos sem verificação — marca CVE como "not exploitable" sem auditar callgraph; silently dismiss real vulnerabilities.
6. Trusted publisher set pra `*/refs/heads/main` (qualquer branch publica; tighten pra `refs/tags/v*` only).
7. Provenance attestations publicadas mas consumer não verifica (`npm audit signatures` opcional; chain incompleta).
8. SLSA L4 attempted em projeto OSS de 1 maintainer (overhead > benefit; aim L2).
9. Renovate auto-merge sem review humano (introduz breaking changes silently; restrict a patch-only).
10. SBOM com placeholder values (`version: "0.0.0"` everywhere; useless pra CVE lookup; valida geração em CI).

Cruza com **03-08** §2.20 (SBOM lifecycle deep), **03-08** §2.14 (supply chain security overview), **03-04** (CI/CD pipelines + GitHub Actions OIDC), **§2.18** (becoming maintainer — OIDC publish é passo do release flow), **03-02** §2.21 (Docker provenance attestations), **§2.7** (security disclosure — provenance ajuda forensics).

---

### 2.20 OSS sustainability 2026 post-XZ — funding, burnout, multi-maintainer, npm provenance

**Post-XZ landscape (Mar 2024 → 2026).** CVE-2024-3094: Andres Freund (Microsoft engineer) descobriu backdoor em `xz-utils` 5.6.0/5.6.1 enquanto investigava 500ms de latência em SSH (Andres Freund email Mar 29 2024, oss-security list). Backdoor injetado via build tarball por persona "Jia Tan", após social-engineering campaign de ~2 anos contra Lasse Collin (sole maintainer queimado). Lessons: (1) **bus factor 1 = vulnerability**, não inconveniência; (2) **maintainer burnout é attack vector** — pressão coordenada por "fake helpful contributors" empurrou Lasse a delegar commit access; (3) "be nice to maintainers" não é defesa, é higiene mínima. Follow-up 2024-2026: OpenSSF Alpha-Omega scaling funding pra critical infra (Linux Foundation), Sovereign Tech Fund (DE) escalou €23.5M em 2024, German BSI funded 100+ projetos OSS via FOSSA program.

**Maintainer burnout taxonomy 2026.** Tragedy of the commons em deps críticas: `is-promise` (npm, ~10M weekly downloads, 1 maintainer histórico), `core-js` (Denis Pushkarev solo, fund crisis pública 2020+ ainda relevante), `colors.js` / `faker.js` (Marak rage-quit Jan 2022 sabotou próprio projeto). Vetores:

1. **Demanding users sem PR ou funding** — issues "este bug me afeta, prioriza" sem patch nem patrocínio.
2. **Security pressure 24/7** — CVE responsibilities sem SLA pago; embargo windows colidem com vida pessoal.
3. **Imposter contributors** (XZ pattern) — social engineering long-game pra commit access.
4. **Hype cycles** — projeto vira trend, traffic 100x sem recursos pra absorver.

Mitigations 2026: hard "no" defaults em scope; GitHub Sponsors visible no top do README; Code of Conduct enforced com ban-hammer; **multi-maintainer requirement** antes de OpenSSF declarar projeto "critical infra" (post-XZ policy 2024).

**Funding models 2026 — números reais.**

| Modelo | Fees | Tier típico | Realidade |
|---|---|---|---|
| GitHub Sponsors | 0% (GitHub absorve) | $5-50/mo individual | Visible se promovido; P50 income = $0 |
| Open Collective | ~10% (fiscal host) | $50-500/mo corp | Bom pra transparência; corps preferem |
| Tidelift | Subscription B2B | $5-50/maintainer/mês/projeto | ~$20M ARR 2024; B2B compliance-driven |
| Polar.sh | Issue-bounty | Variável | Crowdsource de issues específicas |
| "Fair Source" (Sentry FSL, BSL-style) | License-based | Revenue-tied | Não OSI-approved, mas funda devs |

Tidelift maintainer report 2024: **median income from sponsorship = $0**; apenas top 10% > $1k/ano. OSS maintainership ≠ income unless top 1%. Plan accordingly.

**Sovereign Tech Fund (DE 2022+, scaled 2024-2026).** €23.5M budget 2024 (Sovereign Tech Fund 2024 report). Funded: curl, OpenJDK, OpenSSL, GnuPG, Sequoia PGP, Bundler, Log4j, OpenBGPd. **Direct payments to maintainers**, no equity, no IP grab. Replicável: Netherlands (NL-funding), UK considerando 2026, EU Commission piloting Open Source Programme Office (OSPO) funding 2026.

**EU CRA (Cyber Resilience Act, força ~2027).** Final text Dec 2023 (EU CRA final text Dec 2023). "Open-source software steward" amendment isenta non-commercial OSS — Eclipse Foundation, Apache, Linux Foundation lobbied successfully. **Commercial integrators carregam compliance**: SBOM obrigatório, vulnerability handling SLA, CVE coordination, security disclosure docs. 2026 readiness checklist:

- `SECURITY.md` com disclosure path
- SBOM gerada em release (CycloneDX ou SPDX)
- CVE assignment process (GitHub Security Advisories ou MITRE direto)
- Vulnerability handling SLA pública (mesmo que "best effort")

**npm provenance impact (2025+).** npm provenance attestations GA Abr 2023, default workflow em GitHub Actions OIDC. Adoption 2026: ~15% top-1k npm packages publicam com provenance (npm registry stats 2026). Sigstore-backed (Rekor transparency log + Fulcio CA). Validação consumer-side:

```bash
npm audit signatures
# valida assinaturas + provenance attestations dos deps
```

GitHub Actions OIDC publish (mata laptop-publishing → mitigates compromise):

```yaml
# .github/workflows/release.yml
name: release
on:
  push:
    tags: ['v*']
permissions:
  contents: read
  id-token: write   # OIDC pra Sigstore
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org
      - run: npm ci
      - run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Trade-off: força CI publishing (ganho de supply chain), adds friction pra maintainer solo que fazia `npm publish` do laptop.

**Sigstore beyond npm.** `cosign sign-blob` pra binários genéricos, `slsa-github-generator` pra SLSA L3 attestations, `gh attestation verify` (GitHub native, GA Out 2024), Reproducible Builds initiative (Debian, NixOS, Arch). PyPI **trusted publishers** GA Abr 2023+ (OIDC sem long-lived tokens). Maven Central plans 2026 pra publisher attestations. Real adopter: Kubernetes releases SLSA L3 attested desde 1.27 (Apr 2023).

**Multi-maintainer escalation pattern.** 1 maintainer = bus factor 1 = attack vector (XZ proved). Critical projects (Linux Foundation Critical Infrastructure list, Top-1k npm/PyPI, anything em path crítico de build/runtime) deveriam target:

- ≥3 active maintainers
- 2-week PR review window mínimo pra changes não-trivial
- Multi-party signoff em release (2 maintainers approve tag)
- Commit access ladder explícita (issue triage → PR review → release manager → owner)

Real adopters: kernel.org (subsystem maintainers + Linus), OpenSSL post-Heartbleed (governance reform 2014), curl (Daniel Stenberg + 4 co-maintainers ativos).

**Saying no, scope boundaries.** Maintainer-as-default-yes leva a burnout. Defaults saudáveis:

- `CONTRIBUTING.md` com explicit "we don't accept feature X, Y, Z"
- Auto-close stale issues > 6 meses (`actions/stale`)
- `first-interaction` action requer prior discussion antes de PR de non-collaborator
- Templates de issue forçam reproducer mínimo

Mental model: maintainers don't owe responses; consumers podem **fork**. Citação Daniel Stenberg (curl, multiple talks 2023-2024): "Open source ≠ free labor."

**Career impact 2026.** Public OSS work é hiring signal forte (FAANG infra teams, Vercel/Stripe/Cloudflare, infra startups). Mas **visibility ≠ income**. Path realistic:

1. Contribute to projeto que você usa daily (real bug fixes, não cosmetic).
2. Sustain over 2+ anos (consistency > burst).
3. Subir trust ladder: issue triage → PR review → release manager → owner.
4. Avoid: starting library com zero users; chasing GitHub stars metric; "hello-world frameworks".

**FUNDING.yml e SECURITY.md mínimos:**

```yaml
# .github/FUNDING.yml
github: [maintainer-handle]
open_collective: project-name
tidelift: npm/package-name
custom: ['https://example.com/sponsor']
```

```markdown
<!-- SECURITY.md -->
# Security Policy

## Supported Versions
| Version | Supported          |
| ------- | ------------------ |
| 2.x     | :white_check_mark: |
| 1.x     | :x: (EOL 2025-12)  |

## Reporting
Report vulnerabilities via GitHub Security Advisories (private) or
security@example.com. Initial response < 72h, fix SLA best-effort 30d
for critical. Embargo coordination per CERT/CC norms.
```

**Logística applied.** Se Logística open-sources scheduling library (`@logistica/dispatch-core`): Apache 2.0 (patent grant explícito) + ≥3 maintainers internos + GitHub Actions OIDC publishing + npm provenance attestation + `SECURITY.md` com disclosure path + `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1) + `LICENSE` claro + funding link no README (mesmo que só GitHub Sponsors da empresa). Sem isso: lib morre em silêncio quando o engenheiro responsável sai, ou pior — vira vetor de attack se ganhar tração e ninguém mantém.

**Cruza com.** §2.7 (security disclosure flow detalhado), §2.11 (bus factor estrutural), §2.12 (sustainability funding base teórica), §2.19 (supply chain Sigstore/SLSA deep), **03-08 §2.14** (supply chain security overview cross-stage), **04-12** (tech leadership, OSS strategy de empresa: open-source-first, OSPO setup).

**Anti-patterns 2026:**

1. Solo maintainer em dep usada por 1M+ apps — bus factor 1; XZ aconteceu por isso.
2. GitHub Sponsors hidden em sub-tab do README — sem chance de funding visible; mover pro top.
3. CRA (EU) ignorado — produto B2B EU vai exigir SBOM + vuln handling em 2027; preparar 2026.
4. Laptop `npm publish` em projeto crítico — sem provenance, sem audit trail; mover pra OIDC CI.
5. Aceitar PRs de "helpful new contributor" sem due diligence — XZ playbook; long-game social engineering existe.
6. Sem `SECURITY.md` — disclosure vai pra issue público; CVE leak antes de patch.
7. Issues abertos sem stale-bot — backlog vira graveyard; sinaliza projeto morto.
8. CLA exigido em projeto pequeno — mata contribuição casual; DCO (sign-off) basta.
9. Roadmap secreto — community não pode planejar; fork iminente quando alguém perde paciência.
10. Tratar OSS maintainership como side hustle pago — P50 income = $0; maintain por leverage de carreira ou interesse técnico, não por renda esperada.

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
- **Talk submission**: blog post explicando design (ligando com 04-15).
- **Translation**: docs em PT-BR + EN.

---

## 5. Extensões e Conexões

- Liga com **01-09** (Git internals): branches, tags, signing.
- Liga com **02-18** (payments): idempotency é tema canônico.
- Liga com **03-04** (CI/CD): pipeline robusto é OSS standard.
- Liga com **03-08** (security): disclosure, supply chain (sigstore, provenance).
- Liga com **04-05** (API design): pública API design exige disciplina.
- Liga com **04-12** (tech leadership): RFC, decisão técnica documentada.
- Liga com **04-16** (product): open core / SaaS são modelos de business.
- Liga com **CAPSTONE-amplitude** (05-05/05-06): public output, mentoria.

---

## 6. Referências

- **"Producing Open Source Software"**: Karl Fogel. Gratuito, bíblia.
- **"Working in Public: The Making and Maintenance of Open Source"**: Nadia Eghbal.
- **"Roads and Bridges"**: Nadia Eghbal (foundation report).
- **GitHub OSS docs** ([opensource.guide](https://opensource.guide/)).
- **Contributor Covenant**.
- **Keep a Changelog**.
- **Semver spec** ([semver.org](https://semver.org/)).
- **Diataxis** ([diataxis.fr](https://diataxis.fr/)).
- **"How to Run a Successful Free Software Project"**: Karl Fogel talks.
- **CHAOSS metrics**: community health analytics.
- **Sustain podcast**: sustainability in OSS.
