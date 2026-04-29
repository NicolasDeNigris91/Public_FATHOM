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

### 2.14 Supply chain (03-04 review)

- Dependabot/Renovate.
- SCA tools: Snyk, Trivy fs/repo mode, Socket.
- SBOM gerado (syft).
- Image signing (cosign).
- Lockfile sempre.
- Pinning by digest em prod imagens.

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
