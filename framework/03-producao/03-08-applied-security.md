---
module: 03-08
title: Applied Security, OWASP Top 10, Threat Modeling, AppSec Pipeline
stage: producao
prereqs: [02-13, 03-04]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 03-08, Applied Security

## 1. Problema de Engenharia

Security é tratado como "pessoa do time security cuida". Quando você é o time, você é a pessoa. E quando há time security, eles olham PRs reativamente, não escrevem o código com você. A maioria dos bugs reportados em bug bounty são triviais: SSRF em uploader, IDOR cruzando tenant, XSS em render de markdown, header de CORS errado, JWT alg: none, rate limit ausente em endpoint sensível.

Este módulo é AppSec aplicado: OWASP Top 10 (atual), Top 10 API, threat modeling (STRIDE), input validation, secrets, supply chain, AppSec pipeline (SAST/DAST/SCA), pentesting básico, secure SDLC. Você sai escrevendo código defensivo por default e revisando PRs com olho de atacante.

---

## 2. Teoria Hard

### 2.1 OWASP Top 10 (2021/2025), web

Ordenado por incidência:
1. **Broken Access Control**: IDOR, lack of authz check, force browse.
2. **Cryptographic Failures**: weak crypto, secret leak, missing TLS.
3. **Injection**: SQL, NoSQL, LDAP, command, ORM injection.
4. **Insecure Design**: falhas arquitetônicas (lack of rate limit, expose internals).
5. **Security Misconfiguration**: default creds, verbose errors, headers ausentes.
6. **Vulnerable & Outdated Components**: deps com CVE.
7. **Identification & Authentication Failures**: weak passwords, session fixation, MFA bypass.
8. **Software & Data Integrity Failures**: supply chain, deserialization, missing signature.
9. **Security Logging & Monitoring Failures**: sem audit log, sem detecção.
10. **Server-Side Request Forgery (SSRF)**: server faz request a URL controlada.

### 2.2 OWASP API Top 10 (2023)

Aplicações modernas viram APIs. Top 10 específico:
- **API1: Broken Object Level Authorization** (BOLA / IDOR).
- **API2: Broken Authentication**.
- **API3: Broken Object Property Level Authz** (mass assignment).
- **API4: Unrestricted Resource Consumption** (no rate limit).
- **API5: Broken Function Level Authz** (admin endpoints sem check).
- **API6: Unrestricted Access to Sensitive Business Flows** (scrape, scalping).
- **API7: SSRF**.
- **API8: Security Misconfiguration**.
- **API9: Improper Inventory Management** (zombie endpoints).
- **API10: Unsafe Consumption of APIs** (trustar resposta de upstream sem validar).

### 2.3 Threat modeling, STRIDE

Sistemático: pra cada componente, pergunte:
- **S**poofing: pode alguém personificar?
- **T**ampering: dados podem ser alterados?
- **R**epudiation: ação irrastreável?
- **I**nformation disclosure: dados vazam?
- **D**enial of service: pode ser parado?
- **E**levation of privilege: pode escalar permissão?

Output: lista de threats, controles propostos, riscos aceitos.

Quando: design de feature nova, system review periódico, pre-launch.

### 2.4 Input validation

Princípio: **trust no input**, valide em fronteira.

- Schema validation (Zod, TypeBox, AJV) em entrada HTTP.
- Tipos restritivos (não `string` quando é UUID).
- Limites (max length, max count em arrays).
- Sanitize quando serve em HTML/SQL/shell, mas prefere parametrizar (prepared statements).
- File uploads: tipo MIME (verificado, não trustando header), tamanho, scanning antivirus se aplicável.

### 2.5 Output encoding

- HTML: escape `<`, `>`, `&`, `"`, `'`.
- JS context (in attribute): mais agressivo.
- URL: `encodeURIComponent`.
- React/Next: escapa por default text. **`dangerouslySetInnerHTML`** vira armadilha.

### 2.6 SQL/NoSQL Injection

Prevenção:
- **Prepared statements / parameterized queries** sempre.
- ORMs param por default; mas `raw` exige cuidado.
- Mongo: nunca `eval`; cuidado com `$where` e operators que aceitam função.

Test: input com `'; DROP TABLE--` etc., produção deve responder erro de validation, não erro de DB.

### 2.7 SSRF

User envia URL → server faz request a ela. Server pode acessar recursos internos (metadata 169.254.169.254 em AWS, internal services).

Prevenção:
- Allowlist de domínios.
- Bloquear IPs privados (RFC 1918), localhost, link-local.
- Resolver DNS antes, validar IP.
- Use libs `ssrf-req-filter` ou implemente cuidado.
- Em AWS: IMDSv2 (token-based) mitiga muito.

### 2.8 IDOR e BOLA

`/orders/123` retorna pedido sem checar que `123` pertence ao user atual. Atacante itera IDs.

Prevenção:
- **Authz check em CADA endpoint**: confirmação de ownership/relação.
- IDs opacos (UUID em vez de int) reduzem enumeration mas não substituem authz.
- RLS em DB (Postgres) como última linha.

### 2.9 Mass assignment

Endpoint aceita objeto inteiro e atualiza:
```js
await db.user.update(req.body);  // user manda { role: 'admin' }
```

Prevenção:
- Allowlist de campos editáveis.
- DTOs separados de modelos do DB.
- Schema validation rejeitando extras (`strict()` no Zod).

### 2.10 CSRF revisited

Vimos em 02-13. Em apps API com JWT em header, CSRF é menor preocupação. Em cookie-based, mitigue (SameSite, CSRF tokens).

### 2.11 Headers de segurança

- **Content-Security-Policy**: limita origens de scripts/styles/images.
- **Strict-Transport-Security**: força HTTPS (após primeira visita).
- **X-Content-Type-Options: nosniff**: evita MIME sniffing.
- **X-Frame-Options: DENY** ou **CSP frame-ancestors**: anti-clickjacking.
- **Referrer-Policy: no-referrer-when-downgrade** ou stricter.
- **Permissions-Policy**: gates pra geolocation, camera, etc.

Lib: **helmet** (Express/Fastify), **`@fastify/helmet`**.

### 2.12 TLS

- TLS 1.2+ minimum. TLS 1.3 preferido.
- Cipher suites modernas (mozilla.github.io/server-side-tls/).
- Cert auto-renew (cert-manager, Let's Encrypt).
- HSTS em domínio.
- Cert pinning em mobile crítico.

### 2.13 Secrets management

- Nunca em git.
- `.env` local + `.env.example` versionado (sem valores).
- Cloud secret manager (AWS Secrets Manager, Vault).
- CI usa OIDC.
- Rotation periódico.

**Secret scanning**: GitHub native, **gitleaks**, **trufflehog**. Roda em pre-commit + CI.

### 2.14 Supply chain security, deep

Em 2026, supply chain virou frente principal: SolarWinds (2020), Codecov (2021), Log4Shell (2021), 3CX (2023), `xz-utils` backdoor (2024). Defesa mudou de "atualizar deps" pra **stack inteiro de attestation, signing, SBOM, provenance**.

#### Camadas de threat

1. **Dependency vulnerabilities** (CVEs em libs): SCA tradicional pega.
2. **Dependency confusion**: namespace squatting interno → pacote público com mesmo nome (Birsan, 2021).
3. **Typosquatting**: `reqests` em vez de `requests`, `colorama` malicioso.
4. **Compromised maintainer**: `xz-utils` 2024 — atacante ganhou trust por anos antes de injetar backdoor.
5. **Build system compromise**: SolarWinds 2020 — código malicioso injetado durante build, não no source.
6. **Compromised registry / mirror**: pacotes alterados em trânsito.

#### SLSA (Supply chain Levels for Software Artifacts)

Framework canônico (Google + OpenSSF). 4 níveis de garantia:

| Nível | Garantia | Como atinge |
|---|---|---|
| **SLSA 1** | Build process documentado | Build script versionado, output identificável |
| **SLSA 2** | Build provenance, version controlled | Build em CI versionado, provenance gerada |
| **SLSA 3** | Build platform isolada, source verificável | Builder hardenizado, provenance autenticada |
| **SLSA 4** | Two-party review, hermetic builds | Reproducible builds, two-person review obrigatório |

Em 2026, **SLSA 3 é alvo realista** pra prod sério; SLSA 4 é raro fora de Google/Cloud-native critical infra.

#### Sigstore stack

Sistema de assinatura sem gerenciamento de chaves persistentes. Padrão emergente:

- **cosign**: CLI pra assinar blobs / container images. `cosign sign --identity-token $OIDC_TOKEN ghcr.io/me/img:tag`.
- **Fulcio**: CA que emite cert short-lived (10min) bound a OIDC identity (GitHub Actions, Google, etc.).
- **Rekor**: transparency log imutável (Trillian) — toda assinatura registrada publicly.
- **Cosign verify**: `cosign verify --certificate-identity ... --certificate-oidc-issuer ...`.

Resultado: assinatura tem **provenance verificável** (CI workflow X em GitHub repo Y assinou), sem PGP key management.

#### SBOM (Software Bill of Materials)

Inventário formal de dependências e suas versões. Formatos:

- **CycloneDX** (OWASP, JSON/XML): rico em metadata de segurança, vulnerability cross-ref, VEX statements.
- **SPDX** (Linux Foundation, ISO standard): foco em licensing, compliance.

Geradores: **Syft** (Anchore, multi-formato), **CycloneDX CLI**, **GitHub native** (Dependency Graph).

Exemplo mínimo (CycloneDX):
```json
{
  "bomFormat": "CycloneDX", "specVersion": "1.5",
  "components": [{"type":"library", "name":"react", "version":"19.1.0",
                  "purl":"pkg:npm/react@19.1.0"}]
}
```

Em produção 2026, SBOM gerado em CI, anexado a release, **assinado com cosign**, versionado.

#### in-toto attestations

Padrão pra **provenance metadata** (quem buildou, quando, com qual source, qual builder). Predicates: `slsa-provenance`, `vuln-scan`, `test-result`, `sbom`.

```bash
cosign attest --predicate provenance.json --type slsaprovenance ghcr.io/me/img@sha256:...
```

Permite chains: image foi buildada por GH Actions workflow X que rodou test suite Y com result Z, tudo verificável on-demand.

#### Stack mínimo defensável em 2026

1. **Lockfile pinned** (package-lock, pnpm-lock, Cargo.lock, go.sum).
2. **Pin by digest** em prod containers: `image: ghcr.io/me/api@sha256:abc...` (não `:latest`, não `:v1`).
3. **SCA em CI**: Snyk / Trivy / Socket / Dependabot / Renovate. PR-blocking em high/critical.
4. **SBOM gerado** em build step, salvo como release asset.
5. **Sign com cosign** (image + SBOM) usando keyless OIDC.
6. **Provenance attestation** (SLSA 2-3) gerada por CI.
7. **Verify em deploy**: `cosign verify` antes de pull em K8s (admission controller via Kyverno / OPA Gatekeeper / Connaisseur).
8. **Allowlist/denylist** de fontes: registries internos > public; review manual pra deps novos com poucos contributors.
9. **Reproducible builds** quando possível (Nix, Bazel) — comparar build local vs CI deve dar mesmo hash.

Cruza com **03-04** (CI/CD pipeline implementa isso), **04-15** (OSS maintainers do outro lado).

### 2.15 SAST, DAST, IAST

- **SAST** (Static): scanner de código (Semgrep, CodeQL, SonarQube). Roda em PR.
- **DAST** (Dynamic): scanner de aplicação rodando (OWASP ZAP, Burp). Roda em staging.
- **IAST** (Interactive): SAST+DAST hybrid via instrumentation. Mais raro.

Em pipeline: SAST barato em PR, DAST nightly.

### 2.16 Pentest e bug bounty

- **Pentest** anual ou bianual em apps maduros.
- **Bug bounty** (HackerOne, Bugcrowd) traz researchers externos.
- Programas internos: red team simula atacantes.

### 2.17 Compliance

- **SOC 2**: framework comum em SaaS B2B. Controls: access, change management, encryption, monitoring, incident response.
- **GDPR / LGPD**: dados pessoais, direito ao esquecimento, consent, DPA.
- **PCI-DSS**: cartão de crédito.
- **HIPAA**: saúde nos EUA.

Compliance acelera com infra que já incorpora controls (audit log, encryption at rest, RBAC, logs imutáveis).

### 2.17.1 Privacy engineering, disciplina, não compliance checklist

GDPR/LGPD aparecem como compliance ("o que jurídico exige"). Privacy engineering é diferente: **discipline de design** que coloca privacy como restrição técnica primária, não atenuação posterior.

**Princípios técnicos (não legais):**
- **Privacy by design** (Cavoukian, 2009): privacy é default, end-to-end, não trade-off.
- **Data minimization**: colete só o que precisa. Cada campo PII tem custo (storage, breach impact, compliance overhead).
- **Purpose limitation**: dado coletado pra X não migra pra Y sem consent novo.
- **Storage limitation**: TTL em dado pessoal. Logs, eventos, sessões, todos com expiry.
- **Pseudonymization**: substitui PII por token reversível (mantido em vault separado). Eventos podem usar tokens.
- **Anonymization**: irreversível (k-anonymity, differential privacy). Aceitável pra analytics.

**Patterns técnicos:**

**Tokenization de PII:**
- Vault separado (Vault, AWS KMS+DynamoDB) guarda mapping `token ↔ value`.
- App principal e logs usam só tokens. Breach do app principal não vaza PII.
- Vault tem audit log + access controls extra-rigorosos.

**Field-level encryption:**
- DB tem campo `email_encrypted` (não `email`). Decryption só em código que precisa exibir.
- Postgres `pgcrypto` ou app-level com KMS.
- Trade-off: search direto fica impossível (use deterministic encryption ou hash separado pra search).

**Right to be forgotten (LGPD/GDPR Art. 17):**
- Não é só `DELETE FROM users`. É:
  - Anonymize PII em event log e materialized data (analytics, replicas, backups).
  - Drop ou re-anonymize backup snapshots dentro de janela legal.
  - Notify processors downstream (third-party APIs onde dado foi compartilhado).
- Técnica comum: **soft anonymization** mantém row pra integridade referencial mas substitui campos PII por hash determinístico (`hash(salt + user_id)`). Foreign keys continuam válidas, PII vai embora.

**Differential privacy:**
- Adiciona noise calibrado a queries agregadas pra que individual record não seja inferível.
- Apple usa em telemetry de iOS. Google em Chrome stats.
- Lib: Google's `differential-privacy`, OpenDP.
- Útil pra **publish analytics** sem violar privacy.

**k-anonymity, l-diversity, t-closeness:**
- k-anonymity: cada row indistinguível de pelo menos k-1 outras em quasi-identifiers.
- l-diversity: dentro de cada bucket k-anonymized, valores sensíveis variam.
- t-closeness: distribution dentro de bucket próxima de geral.
- Aplicação prática: ANTES de share dataset, valide que quasi-identifiers (CEP+idade+gênero) não permitem re-identification.

**Data flow mapping:**
- Diagrama de **DPIA** (Data Protection Impact Assessment): pra cada PII field, mapeie de onde vem, onde fica, com quem é compartilhado, quanto tempo retém, base legal.
- Atualize em cada feature nova. Privacy-by-design exige isso seja artifact vivo.

**Patterns de minimização concretos:**
- Cookies: `Strict-Transport-Security`, `SameSite=Strict`, sem PII em cookie value.
- IP logging: store hash diário do IP (rotaciona key) em vez de raw IP. Permite analytics, perde re-id de longo prazo.
- Email: hash determinístico (`SHA256(email + salt)`) em logs de evento. Original só no user record.
- Address: country/state em analytics, full address só onde shipping precisa.

**Tools de privacy engineering:**
- **Datafold**, **Bigeye**: data lineage incluindo PII flow.
- **Privacy Dynamics**, **Skyflow**: vaults de PII.
- **Transcend**, **OneTrust**: automation de DSARs (Data Subject Access Requests).
- **Syft** (federated) e **OpenDP**: differential privacy libs.

**Antipatterns comuns:**
- "Vamos coletar X agora, decidir uso depois.", viola purpose limitation. Coleta sem necessidade é débito legal e técnico.
- "Logamos full request pra debug", logs com PII = breach quando logs vazarem.
- "Anonimizado = `name = 'redacted'`", quasi-identifiers (CEP+idade+gênero) podem re-id em datasets pequenos.
- "Backup encrypted = privacy", backup encrypted ainda contém PII. Right-to-be-forgotten exige tocar backups.

### 2.18 Incident response

NIST framework:
1. Preparation.
2. Detection & Analysis.
3. Containment, Eradication, Recovery.
4. Post-incident activity (postmortem).

Runbooks pra incidentes comuns (data breach, DDoS, account takeover).

### 2.19 Defense in depth

Layers:
- Network (VPC, security groups, WAF).
- App (input validation, authz, rate limit).
- Data (encryption at rest, RLS).
- Audit (log everything sensible).
- Detection (alerts, anomaly detection).

Quando 1 camada falha, próxima ainda barra.

### 2.20 SBOM lifecycle e VEX statements operacionais

SBOM (Software Bill of Materials) virou compliance-checkbox em 2024-2026 — US Executive Order 14028, EU Cyber Resilience Act, NIST SSDF. Mas SBOM gerado uma vez e largado em S3 não vale nada. Operação real exige cinco coisas: (a) SBOM gerado no build, assinado, attestado; (b) ingestão em vulnerability scanner contínuo; (c) VEX statements pra distinguir CVE-presente de CVE-explorável; (d) policy gates em deploy bloqueando builds sem SBOM válida; (e) SBOM diff entre versões pra audit e root-cause de incidentes.

**SBOM formats — escolha e trade-offs**:

| Format | Originador | Strengths | Quando usa |
|---|---|---|---|
| **CycloneDX** | OWASP | Rich metadata (services, ML models, formulation, vulnerabilities inline), JSON-first | Default 2026 pra apps modernos; suporta VEX nativamente |
| **SPDX** | Linux Foundation, ISO/IEC 5962 | Padrão ISO; foco em license compliance | Compliance-driven (federal contracts US, EU CRA) |
| **SWID** | NIST IR 8060 | Tag pra SW asset tracking (já-instalado) | Inventário endpoint, não build-time |

CycloneDX 1.6+ é default 2026 — VEX statements integradas, melhor tooling, cobertura de ML/AI components.

**Geração no build**:

```dockerfile
# Multi-stage build com SBOM gerado
FROM node:20 AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-slim
COPY --from=builder /app /app
WORKDIR /app
CMD ["node", "dist/server.js"]
```

```bash
# CI step — gerar + assinar SBOM
syft packages dir:. -o cyclonedx-json=sbom.cdx.json
cosign attest --predicate sbom.cdx.json --type cyclonedx \
  --key env://COSIGN_KEY \
  ghcr.io/myorg/logistics-api:${GITHUB_SHA}
```

`syft` (Anchore) é tool de fato pra discovery; alternativas: `cdxgen`, `trivy sbom`, Docker Scout.

**Anatomia de um SBOM CycloneDX (excerpt)**:

```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.6",
  "serialNumber": "urn:uuid:3e671687-...",
  "metadata": {
    "timestamp": "2026-04-15T10:00:00Z",
    "tools": [{ "vendor": "anchore", "name": "syft", "version": "1.5.0" }],
    "component": { "type": "application", "name": "logistics-api", "version": "2.3.1" }
  },
  "components": [
    {
      "type": "library",
      "bom-ref": "pkg:npm/express@4.18.2",
      "name": "express",
      "version": "4.18.2",
      "purl": "pkg:npm/express@4.18.2",
      "hashes": [{ "alg": "SHA-256", "content": "..." }],
      "licenses": [{ "license": { "id": "MIT" } }]
    }
  ],
  "dependencies": [
    { "ref": "logistics-api", "dependsOn": ["pkg:npm/express@4.18.2", "..."] }
  ]
}
```

`purl` (Package URL spec) é o identificador canônico cross-ecosystem. `bom-ref` interno; `dependencies` mapeia o grafo.

**VEX statements — o que mata o ruído de scanner**:

- Sem VEX: scanner reporta "CVE-2024-12345 in lodash@4.17.21" — true mas talvez não-explorável (você usa só `_.get` e a CVE é em `_.merge`).
- Com VEX: você publica statement "CVE-2024-12345 status: not_affected, justification: vulnerable_code_not_in_execute_path".
- Resultado: scanner suprime esse alert; ops para de receber 200 alerts/dia onde 195 são noise.

**VEX statuses (CycloneDX VEX vocab)**:

| Status | Significado | Exigência |
|---|---|---|
| `not_affected` | Componente está mas vuln não pode ser triggered | Justification obrigatória (ver abaixo) |
| `affected` | Vuln explorável; sem fix ainda | Anote workaround se houver |
| `fixed` | Vuln existia mas foi patched | Aponte versão/commit do fix |
| `under_investigation` | Triagem em andamento | Coloque deadline de re-evaluation |

**Justifications válidas pra `not_affected`** (NTIA-defined):

- `code_not_present`: subcomponente vulnerável foi removido no tree-shake/build.
- `code_not_reachable`: dependency presente mas código vulnerável não é importado.
- `requires_configuration`: vuln só ativa com config X que você não usa.
- `requires_dependency`: precisa de outro componente Y que não está.
- `requires_environment`: só explora em runtime/OS específico.
- `protected_by_compiler`: bounds check / type system mata.
- `protected_at_runtime`: WAF / sandbox bloqueia.
- `protected_at_perimeter`: serviço não exposto externamente.
- `protected_by_mitigating_control`: control compensatório.

**VEX statement — exemplo CycloneDX**:

```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.6",
  "vulnerabilities": [
    {
      "id": "CVE-2024-12345",
      "source": { "name": "NVD" },
      "ratings": [{ "severity": "high", "score": 7.5 }],
      "affects": [{ "ref": "pkg:npm/lodash@4.17.21" }],
      "analysis": {
        "state": "not_affected",
        "justification": "code_not_reachable",
        "response": ["will_not_fix"],
        "detail": "App uses only lodash.get and lodash.set; CVE-2024-12345 in _.merge prototype pollution path is not in execution path. Verified via dependency-tree analysis 2026-04-10."
      }
    }
  ]
}
```

**Pipeline integrado — Logística stack**:

```yaml
# .github/workflows/sbom-pipeline.yml (excerpt)
- name: Generate SBOM
  run: syft packages dir:. -o cyclonedx-json=sbom.cdx.json

- name: Sign + attest SBOM to OCI
  run: |
    cosign attest --predicate sbom.cdx.json --type cyclonedx \
      --key env://COSIGN_KEY \
      ghcr.io/myorg/api:${{ github.sha }}

- name: Scan against vuln DB
  run: grype sbom:sbom.cdx.json -o json > scan.json

- name: Apply VEX filter
  run: |
    grype sbom:sbom.cdx.json \
      --vex vex/our-statements.cdx.json \
      --fail-on critical \
      -o table

- name: Upload to dependency-track
  run: |
    curl -X POST "$DT_URL/api/v1/bom" \
      -H "X-Api-Key: $DT_API_KEY" \
      -F "project=$DT_PROJECT_UUID" \
      -F "bom=@sbom.cdx.json"
```

**Dependency-Track** (OWASP) é o de-facto SBOM portal: ingesta SBOM, monitora CVEs continuamente, aceita VEX, dá API pra policy gates.

**Policy gates em deploy**:

- Block deploy se: (a) novo CVE critical sem VEX statement em < 24h, (b) componente sem licença aprovada, (c) SBOM não-attestada.
- Implementação: OPA / Conftest policy contra SBOM JSON antes de `kubectl apply` ou `terraform apply`.
- Exemplo Rego policy minimal:

```rego
package sbom.policy
deny[msg] {
  comp := input.components[_]
  comp.licenses[_].license.id == "GPL-3.0-only"
  msg := sprintf("Forbidden license GPL-3.0-only in %s", [comp.name])
}
```

**SBOM diff — auditoria de mudanças entre releases**:

- `cyclonedx-cli diff sbom-v2.3.0.json sbom-v2.3.1.json` mostra components added/removed/upgraded.
- Útil em release notes ("we upgraded openssl from 3.2.0 to 3.2.1 fixing CVE-XXXX").
- Critical em pós-incident: "what changed entre deploy que quebrou?".

**Anti-patterns observados**:

- SBOM gerado uma vez no build inicial e nunca atualizado. Resolve: gerar a CADA build, attestar.
- Sem VEX → 200 CVE alerts/dia, time aprende a ignorar, real critical passa despercebido.
- SBOM em S3 sem ingestão em scanner → relatório morto.
- VEX `not_affected` sem justification ou detail → audit reprova; alguém vai questionar em 6 meses sem ter contexto.
- Confiar SBOM gerado em dev workstation (não-reproduzível, missing transitive deps); gere sempre em CI hermetic build.
- `cosign sign` sem keyless OIDC → key management vira problema; use Sigstore + Fulcio + Rekor (timeline em 03-08 §2.14).

Cruza com **03-08 §2.14** (supply chain layers — VEX é a camada operacional acima de SLSA), **03-04 §2.x** (CI gates pra deploy block), **03-07 §2.18** (alert fatigue mitigada por VEX correto), **03-15** (incident response usa SBOM diff pra root cause).

---

### 2.21 OWASP Top 10 2025 applied + CSP modern + CSRF + JWT pitfalls

OWASP Top 10 2025 substituiu a edição 2021 (revisão a cada 4 anos) e mantém **Broken Access Control no #1 desde 2017** — não muda porque IDOR e missing function-level continuam endemicos. CSP migrou de domain whitelist (sempre incompleto) pra `strict-dynamic` + nonces; Trusted Types (Baseline 2024 em Chrome/Edge) elimina DOM XSS no source. CSRF virou problema 90% resolvido por `SameSite=Lax` default Chrome 2020+, mas Origin check em mutating endpoints fecha o gap. JWT continua sendo footgun: `alg: none`, algorithm confusion HS256/RS256, e localStorage XSS — três anti-patterns que aparecem em pen test de toda startup brasileira.

**OWASP Top 10 2025 — categorias e foco operacional Logística**:

| # | Categoria | Manifestação típica Logística |
|---|---|---|
| **A01** | Broken Access Control | IDOR `GET /orders/:id` sem `WHERE tenant_id`; missing function-level em admin routes |
| **A02** | Cryptographic Failures | TLS 1.3 mandatory; AES-256-GCM/ChaCha20; Argon2id default (OWASP rec 2025), bcrypt cost 12+, pbkdf2 600k iterations mínimo |
| **A03** | Injection | SQLi (Drizzle/Prisma defaults safe), command injection, NoSQL Mongo `$where`, prompt injection LLM (cruza com 04-10) |
| **A04** | Insecure Design | Missing rate limit, missing tenant isolation, no security review em design phase |
| **A05** | Security Misconfiguration | Default creds, verbose errors em prod, S3 bucket public, debug endpoints expostos |
| **A06** | Vulnerable Components | Dependabot/Renovate + Snyk/Socket; SBOM contínua (cruza com §2.20) |
| **A07** | Auth Failures | Brute force sem backoff, session fixation, MFA bypass via SMS |
| **A08** | Software/Data Integrity | Pipeline integrity (SLSA §2.14), CDN SRI, package signing Sigstore |
| **A09** | Logging/Monitoring Failures | Missing audit log, sem SIEM ingest, sem alert em failed-auth spike |
| **A10** | SSRF | Webhook URL aceitando `http://169.254.169.254/...` (AWS IMDS metadata leak credentials se IMDS v1) |

**CSP 2026 — `strict-dynamic` + nonces + Trusted Types**:

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'nonce-{RANDOM_PER_REQUEST}' 'strict-dynamic' https:;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://cdn.logistica.example.com;
  connect-src 'self' https://api.logistica.example.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
  report-to csp-endpoint;
Reporting-Endpoints: csp-endpoint="https://api.logistica.example.com/csp-report"
```

`strict-dynamic` elimina necessidade de listar domains externos — script com nonce válido pode carregar transitivamente. `unsafe-inline` em `script-src` defeats CSP (XSS aberto); só use em `style-src` se inevitável.

**Trusted Types — DOM XSS killer (Baseline 2024 Chrome/Edge; Safari WIP)**:

```http
Content-Security-Policy: require-trusted-types-for 'script'; trusted-types myPolicy;
```

```js
const policy = trustedTypes.createPolicy('myPolicy', {
  createHTML: (input) => DOMPurify.sanitize(input)
});
element.innerHTML = policy.createHTML(userInput); // safe; raw string throws
```

Browser bloqueia `innerHTML = rawString` em runtime — força sanitização explícita via policy. Dev experience: console mostra violation no source line exato.

**CSRF — `SameSite=Lax` default + Origin check em mutations**:

```ts
// Fastify hook — Origin/Referer check em mutating requests
const ALLOWED_ORIGINS = new Set([
  'https://logistica.example.com',
  'https://app.logistica.example.com',
]);

fastify.addHook('onRequest', (req, reply, done) => {
  const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
  if (isMutation) {
    const origin = req.headers.origin || req.headers.referer;
    if (!origin || !ALLOWED_ORIGINS.has(new URL(origin).origin)) {
      return reply.code(403).send({ error: 'CSRF check failed' });
    }
  }
  done();
});
```

`SameSite=Lax` (default Chrome 2020+) já mata 95% CSRF — POST cross-origin não envia cookie. `SameSite=Strict` pra cookies high-value (banking/payment). `SameSite=None; Secure` apenas pra cross-origin legitimate (third-party iframe consentido). Double-submit cookie pattern útil quando session em cookie + token em header (SPA + cookie auth combo). Synchronizer Token Pattern legacy mas ainda relevante pra forms server-rendered.

**JWT pitfalls — três footguns que aparecem em pen test**:

```ts
// CORRETO — algorithms hardcoded, nunca trust header
import jwt from 'jsonwebtoken';

const payload = jwt.verify(token, RSA_PUBLIC_KEY, {
  algorithms: ['RS256'], // BLOQUEIA alg:none + HS256 confusion
  issuer: 'logistica-auth',
  audience: 'logistica-api',
  maxAge: '15m',
});
```

- **`alg: none` attack** (clássico ainda vivo em libs novos): library aceita JWT sem signature. Hardcode `algorithms: ['RS256']` em verify SEMPRE.
- **Algorithm confusion HS256 vs RS256**: attacker assina HS256 usando public key como secret; library buggy aceita. Mitigation: enforce algoritmo específico via whitelist.
- **NEVER store JWT em `localStorage`**: qualquer 3rd party script (analytics, tag manager) lê via XSS. Use HttpOnly cookie pra SPA. Authorization Bearer OK pra mobile (sem XSS vector via 3rd party scripts).
- **Long-lived JWT problem**: refresh tokens > 30 dias = revocation impossível sem session DB. Pattern: access token 15min + refresh token rotation (cruza com 02-13).
- **`kid` header rotation**: enable múltiplas signing keys; rotate monthly sem invalidar tokens existentes.
- **Payload é apenas base64**: NUNCA store secret em JWT (não é encrypted by default).

**Rate limit — patterns Logística** (cruza com 02-11 §2.13):

| Layer | Implementação | Quando |
|---|---|---|
| Per-IP | nginx/Cloudflare | Anti-DoS basic, pre-auth |
| Per-user | Redis sliding window | Post-auth, fairness entre tenants |
| Per-endpoint | Redis namespace por route | Write endpoints (`POST /orders`) stricter que reads |
| Adaptive tier | Redis + tenant config | Premium 1000 req/min vs free 100 req/min |
| Failed-auth backoff | Redis counter + TTL exp | 5 fail logins → exponential backoff per (IP, username) |

**Headers de segurança production-ready**:

```http
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Permissions-Policy: geolocation=(self), camera=(), microphone=()
Referrer-Policy: strict-origin-when-cross-origin
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

HSTS 2 anos com `preload` registra domain em browser preload list (lock-in). COOP+COEP isola origin pra habilitar `SharedArrayBuffer` e WebAssembly threads. `X-Frame-Options: DENY` legacy mas Safari ainda honra; CSP `frame-ancestors 'none'` é replacement moderno.

**Logística applied stack**:

- Fastify + `@fastify/helmet` (CSP + HSTS + COOP + COEP defaults).
- Auth: JWT RS256 access 15min + refresh httpOnly cookie 30 days rotated.
- CSRF: `SameSite=Lax` default + Origin check em mutating endpoints.
- Headers: `Content-Security-Policy-Report-Only` em staging → `Content-Security-Policy` enforce em prod após 1 semana sem violations relevantes no endpoint de report.
- Rate limit: Redis sliding window per `(IP, tenant_id)` + tier premium.
- SAST: Snyk + Semgrep em PR; Socket pra supply chain (cruza com §2.14).

**Pen test — focus areas Logística**:

- **IDOR cross-tenant**: tester logado como tenant A tenta `GET /orders/<id>` de tenant B. Defesa: Postgres RLS + integration test que prova bloqueio.
- **JWT manipulation**: alter payload sem invalidate signature; library deve rejeitar.
- **CSRF**: form em domínio adversário POST `/orders` com cookie da vítima; Origin check bloqueia.
- **SSRF**: webhook URL aceitando `http://169.254.169.254/latest/meta-data/` (AWS IMDS v1 leak credentials); use IMDS v2 + URL allowlist + DNS resolve check.
- **Prompt injection** (cruza com 04-10): adversarial input em LLM pra bypass system prompt.

**Anti-patterns observados**:

- JWT em `localStorage` em SPA (qualquer 3rd party script lê via XSS).
- `alg: none` accepted em JWT verify (library defaults; ALWAYS specify `algorithms`).
- `SameSite=None` cookie sem `Secure` flag (Chrome reject silently).
- CSP `unsafe-inline` em `script-src` (defeats CSP completely).
- CSP whitelist domains sem `strict-dynamic` (sempre incompleto, bypass via JSONP/redirect em domain whitelisted).
- IDOR sem RLS ou explicit `WHERE tenant_id` filter (backend trust em frontend-supplied tenant id).
- bcrypt cost 10 em 2026 (cracking 100x faster que 2015; use cost 12+ ou Argon2id).
- SHA-1/MD5 password hash em código novo (broken; OWASP rec 2025 é Argon2id).
- HSTS sem `preload` (browser doesn't lock-in domain; primeiro request HTTP vulnerável a SSL strip).
- Verbose error messages em prod expondo stack trace + DB schema (info leak; generic 500 + log internal com correlation id).

Cruza com **02-13** (auth — JWT + OAuth2 + refresh rotation), **02-09** (Postgres RLS multi-tenant), **02-11** (Redis rate limit sliding window), **03-15** (incident response — security incident playbook), **04-10** (LLM prompt injection cobre OWASP A03).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Listar OWASP Top 10 atual e dar exemplo concreto pra cada.
- Diferenciar OWASP Web Top 10 e API Top 10.
- Aplicar STRIDE a 1 feature de exemplo.
- Distinguir IDOR e mass assignment com mitigação pra cada.
- Defender SSRF com 4 controles.
- Listar 6 headers de segurança importantes.
- Explicar SAST vs DAST e propor stack.
- Estratégia de secrets sem long-lived keys.
- Discriminar SOC 2, GDPR, PCI em escopo.
- Plano de resposta a incidente (data breach simulado).

---

## 4. Desafio de Engenharia

Hardening de **Logística v1** com pipeline AppSec real.

### Especificação

1. **Threat model**:
   - Aplicar STRIDE a 5 features: signup, criar pedido, tracking público, courier upload, admin endpoints.
   - Documente em `THREAT-MODEL.md`: threat → mitigation → status.
2. **Headers e CSP**:
   - helmet em backend, defaults rigorosos.
   - CSP no front Next: source-list pra script-src, style-src; nonce-based pra inline.
3. **Auth hardening**:
   - Auditoria do 02-13: cobre todas threats (replay, IDOR, mass assignment, brute force, CSRF, JWT armadilhas)?
   - Adicione lockout adaptive (1 tentativa/s após 3 falhas; aumenta).
   - Login de novo device → email de notificação.
4. **API authz**:
   - 1 endpoint vulnerável a IDOR detectado e fix (pode ser intencional pra demo, depois corrige).
   - Audit log de cada cross-tenant attempt.
   - Postgres RLS em `orders` como última linha.
5. **Input/output**:
   - Audit de cada endpoint pra mass assignment. Use DTOs `strict()` em Zod.
   - Sanitize markdown/HTML em qualquer campo que renderiza no front (`DOMPurify` server-side).
6. **SSRF guard**:
   - Endpoint que aceita URL pra scrap (mock), bloqueia IPs privados, localhost, allowlist domains.
7. **Secrets**:
   - gitleaks rodando em pre-commit + CI.
   - Demonstre que cleaning history se um secret leak (cuidado com rewrite, em projetos próprios ok).
8. **Pipeline**:
   - **SAST**: Semgrep com regras OWASP + custom (proibir `eval`, `dangerouslySetInnerHTML` sem allowlist, raw SQL).
   - **SCA**: Trivy/Snyk fs em PR.
   - **DAST**: OWASP ZAP baseline scan em staging nightly.
   - **Image scan**: Trivy image em build, gate em CRITICAL.
9. **Pentest manual**:
   - Use Burp Suite Community pra interceptar e tentar 5 ataques: IDOR, mass assignment, JWT manipulation, rate limit bypass, CSRF.
   - Documente em `PENTEST.md` cada tentativa, resultado, fix.
10. **Compliance lite**:
    - Implemente endpoint `DELETE /me` (right to be forgotten LGPD): anonimiza dados pessoais, mantém referências business (orders ficam mas customerName vira "Anônimo").
    - Audit log immutable: append-only table com checksum por linha.

### Restrições

- Sem deps com CVE CRITICAL aberta.
- Sem secret hardcoded.
- Sem endpoint sem authz check (mesmo que seja "qualquer logado").
- Sem header `Server` exposto identificando versão.

### Threshold

- README documenta:
  - Threat model executivo (resumo da `THREAT-MODEL.md`).
  - Headers configurados + verify via SecurityHeaders.com (ou similar).
  - Resultado SAST/SCA/DAST com triagem (ignorar com motivo se for falso-positivo).
  - Pentest report com 5 tentativas, fixes aplicados.
  - LGPD: demo de `DELETE /me` mostrando anonimização.
  - 1 incident response simulado (descobriu credential leak, runbook).

### Stretch

- WAF em CloudFront (AWS WAF Managed Rules).
- DDoS protection (Cloudflare ou AWS Shield).
- Chaos: red team simula ataque coordenado em staging, blue team responde.
- Implementar **WebAuthn step-up** pra ações sensíveis (admin promove user).
- Honeypot endpoint (`/admin/api/v1/.env`) que loga tentativa.

---

## 5. Extensões e Conexões

- Liga com **02-13** (auth): tudo de auth aqui é foundational.
- Liga com **02-09** (Postgres): RLS, prepared statements, schema design defensivo.
- Liga com **01-03** (network): TLS, certs, network policies.
- Liga com **03-02** (Docker): hardening, scan, SBOM.
- Liga com **03-03** (K8s): NetworkPolicy, RBAC, PodSecurity.
- Liga com **03-04** (CI/CD): SAST/SCA gates, secret scanning.
- Liga com **03-06** (IaC): policy-as-code, drift = audit.
- Liga com **03-07** (observability): security alerts, audit logs.
- Liga com **04-04** (resilience): rate limit, circuit breaker contra ataques.
- Liga com **04-12** (tech leadership): security culture, postmortems.

---

## 6. Referências

- **OWASP Top 10** ([owasp.org/Top10](https://owasp.org/Top10/)).
- **OWASP API Security Top 10** ([owasp.org/API-Security](https://owasp.org/API-Security/)).
- **OWASP Cheat Sheets** ([cheatsheetseries.owasp.org](https://cheatsheetseries.owasp.org/)).
- **OWASP ASVS**: verification standard.
- **"The Web Application Hacker's Handbook"**: Stuttard, Pinto.
- **"Real-World Cryptography"**: David Wong.
- **"Threat Modeling: Designing for Security"**: Adam Shostack.
- **OWASP ZAP docs**.
- **Semgrep rules** ([semgrep.dev/r](https://semgrep.dev/r)).
- **HackerOne / Bugcrowd disclosed reports**: lições com bugs reais.
- **Project Zero blog**: Google's research.
