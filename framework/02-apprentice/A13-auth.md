---
module: A13
title: Auth — Sessions, JWT, OAuth2/OIDC, Passkeys, RBAC/ABAC
stage: apprentice
prereqs: [A08, N03]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# A13 — Auth

## 1. Problema de Engenharia

Auth é o subsistema onde mais erros caros se cometem. "Login funciona" não basta — você precisa entender token leakage, replay, CSRF, XSS reflection of secret, refresh flows, cookie attributes, RBAC vs ABAC, mistura de OAuth2 com OIDC, expiração e revogação, federation. A maioria das brechas em apps modernos vem de auth implementado por intuição.

Este módulo é auth com clareza: distinção entre autenticação e autorização, sessions com cookie, JWT (e suas armadilhas), OAuth2 grants com OIDC pra identidade, MFA, passkeys (WebAuthn), e modelo de autorização. Sem isso, você terceiriza pra Auth0/Clerk e ainda implementa errado em redor.

---

## 2. Teoria Hard

### 2.1 Authn vs Authz

- **Authentication (authn)**: quem é você. Verificar identidade.
- **Authorization (authz)**: o que você pode. Decidir permissão.

Erros comuns vêm de misturar: tokens que provam identidade mas servem como "blank check" de permissão.

### 2.2 Senhas: armazenamento

Nunca armazene plain text. Nunca SHA-256 simples. Use **algoritmos de hashing pra senhas** (slow, salted):
- **Argon2id** (vencedor de PHC 2015) — recomendação atual da OWASP.
- **bcrypt** — clássico, ainda aceitável.
- **scrypt** — bom, menos comum em libs modernas.
- **PBKDF2** — aceito mas mais fraco.

Cada hash inclui salt. Custo (work factor) ajustável; aumente a cada N anos.

Verificação:
```js
import { hash, verify } from 'argon2';
const h = await hash(password);          // store h
const ok = await verify(h, candidate);   // compares
```

Não compare strings com `==` em código de auth (timing attacks). Use `crypto.timingSafeEqual` ou bibliotecas que já fazem.

### 2.3 Sessions com cookies

Padrão clássico, ainda viável e em muitos casos melhor que JWT:
1. User faz login → server gera session ID aleatório (UUID v4 ou bytes random).
2. Server salva `{sessionId → userId, expiresAt, ...}` em store (Redis, DB).
3. Server seta cookie `Set-Cookie: sid=...`.
4. Cliente envia cookie em cada request.

Atributos cruciais:
- **`HttpOnly`**: JS não acessa (mitiga XSS exfiltrar).
- **`Secure`**: só HTTPS.
- **`SameSite=Lax`** (default moderno) ou `Strict` (mais restritivo) ou `None` (cross-site, exige `Secure`). Mitiga CSRF.
- **`Path=/`** ou específico.
- **`Max-Age` / `Expires`**.
- **`__Host-` prefix** força Secure + Path=/ + sem Domain.

Vantagens sessions:
- Revogar é trivial: deleta entry no store.
- Conteúdo do cookie é opaco; segredos ficam no server.

Desvantagens:
- Server precisa lookup. Em scale, store distribuído (Redis).
- Cross-domain trickier sem cuidado.

### 2.4 JWT — JSON Web Tokens

JWT é spec (RFC 7519). Estrutura: `header.payload.signature` (base64-url encoded).

- **Header**: `{ alg, typ }`.
- **Payload**: claims (sub, iat, exp, custom).
- **Signature**: `HMAC(header + payload, secret)` (HS256) ou `RSA/ECDSA sign` (RS256/ES256).

Vantagens:
- Stateless: server não precisa store. Verifica assinatura.
- Escalável (qualquer instância valida).
- Atravessa serviços (microservices).

Desvantagens reais:
- **Não pode ser revogado** sem mecanismo extra (denylist, short TTL + refresh, etc.).
- **Tamanho**: cresce com claims. Header em cada request.
- Armazenamento no client: localStorage (vulnerable XSS) ou cookie HttpOnly (safer mas perde "stateless puro" pra alguns flows).
- Implementações erram: `alg: none`, key confusion (HS vs RS), bad signature comparison, expired token aceito.

Quando JWT vence: APIs entre serviços, mobile com token em secure storage, identity provider pra múltiplos serviços. Quando session vence: app web monolítico.

**Padrão moderno híbrido**: refresh token longo-lived em cookie HttpOnly + access token JWT short-lived em memória do client. Refresh roda quando access expira.

### 2.5 JWT armadilhas

- **`alg: none`** — algumas libs aceitavam token sem assinatura. Verifique sempre.
- **Key confusion**: token com `alg: HS256` mas server usando key pública RSA como secret HMAC. Atacante assina com a public key.
- **`exp` não verificado**: lib mal usada não checa expiração.
- **Sem `iss`/`aud` checks**: token de outro tenant aceito.
- **JWT em URL**: end up em logs, history. Use header `Authorization: Bearer ...` ou cookie.
- **localStorage**: XSS dump. Cookie HttpOnly preferível.
- **Tokens longos** (dias/meses): se vazar, vazou. Curtos + refresh é o padrão.

### 2.6 OAuth2 e OIDC

**OAuth2** (RFC 6749) é framework pra **autorização delegada** — "deixe app B acessar recurso meu em provider A". Não foi desenhado pra autenticação, mas usado errado pra isso por anos.

**OIDC (OpenID Connect)** é camada sobre OAuth2 que adiciona identidade: ID token (JWT) com claims de quem é o user. **Pra "Login com Google", você usa OIDC**.

Grants OAuth2:
- **Authorization Code** (com PKCE) — apps com user. Padrão.
- **Client Credentials** — server-to-server.
- **Refresh Token** — renovar access token.
- **Resource Owner Password Credentials** — DEPRECATED.
- **Implicit** — DEPRECATED.
- **Device Authorization** (RFC 8628) — TVs, CLIs sem teclado.

**PKCE** (Proof Key for Code Exchange) — extensão pra Authorization Code. Cliente gera `code_verifier`, manda hash (`code_challenge`) na auth request; troca code por token enviando `code_verifier`. Mitiga interceptação do code. **Sempre use PKCE**, mesmo em SPAs e apps mobile.

### 2.7 OIDC fluxo simples (Authorization Code + PKCE)

1. App redireciona user pra `https://provider/authorize?response_type=code&client_id=X&redirect_uri=Y&scope=openid+email&state=...&code_challenge=...&code_challenge_method=S256`.
2. User autentica no provider, autoriza scopes.
3. Provider redireciona `redirect_uri?code=ABC&state=...`.
4. App valida `state` (CSRF guard), troca `code + code_verifier` em `/token` endpoint → recebe access_token, id_token, refresh_token.
5. App valida `id_token` (assinatura via JWKS, `iss`, `aud`, `nonce`, `exp`).
6. Cria session/JWT próprio. User logado.

OIDC providers comuns: Google, GitHub (GitHub não é OIDC strict, é OAuth2 + API), Apple, Microsoft, Auth0, Clerk, Keycloak, Authentik.

### 2.8 MFA — multi-factor authentication

Fatores:
- Algo que sabe (senha).
- Algo que tem (token físico, smartphone com app TOTP, hardware key).
- Algo que é (biometria).

Formas:
- **TOTP** (Time-based OTP, RFC 6238) — Google Authenticator, Authy. QR code com secret; app gera código de 6 dígitos a cada 30s. **Implementar é simples**, lib `otplib` no Node.
- **SMS OTP** — fraco (SIM swap, intercept). Aceito apenas como step-up frágil.
- **Email OTP** — médio.
- **Push notification** — bom, exige app proprietário.
- **WebAuthn / FIDO2** — passkeys. Forte. Crescente.

### 2.9 Passkeys / WebAuthn — deep

WebAuthn (W3C Level 3 em 2024) + CTAP2 (FIDO Alliance) são o substrato técnico. **Passkey** é o termo de marketing pra credentials WebAuthn que sincronizam entre devices via iCloud Keychain, Google Password Manager, 1Password, Bitwarden. Em 2025-2026 viraram default em Apple/Google/Microsoft accounts, GitHub, Stripe.

**Modelo criptográfico:**
- Authenticator gera **key pair** ECDSA (P-256) ou EdDSA (Ed25519). Private key nunca sai do authenticator.
- Em registro: server envia `challenge`, recebe `attestation` (assinada). Pública é guardada no server, associada ao user.
- Em login: server envia novo challenge, recebe `assertion` (challenge + clientDataJSON + authenticatorData assinados). Verifica com pública.
- **Origin** está em `clientDataJSON` — phishing falha porque attacker em domínio errado não consegue produzir assinatura válida pro origin real.

**Tipos de credential** (decisão importante):

| Tipo | Onde reside | Sincroniza? | Backup | Use case |
|---|---|---|---|---|
| **Synced passkey** (default 2024+) | iCloud / Google PM / 1Password | Sim | Sim (cloud do provider) | Consumer apps. UX prioridade. |
| **Device-bound** (`authenticatorAttachment: "platform"`) | Secure enclave do device | Não | Não | High-assurance: banking, gov |
| **Roaming** (security key física: YubiKey) | Hardware key | Manual | Não | Enterprise admins, dev signing |

**Server-side flow (registration):**
```ts
// 1. Server gera options
const options = await generateRegistrationOptions({
  rpName: 'Logistica',
  rpID: 'logistica.com',         // domain — ESSENCIAL pra anti-phishing
  userID: bytesFromUuid(user.id),
  userName: user.email,
  attestationType: 'none',        // 'direct' se quiser auditar fabricantes (corporate)
  excludeCredentials: existingCreds.map((c) => ({ id: c.credentialID, type: 'public-key' })),
  authenticatorSelection: {
    residentKey: 'preferred',     // 'required' pra usernameless login
    userVerification: 'preferred',
  },
});
// 2. Cliente chama navigator.credentials.create(options)
// 3. Server verifica resposta com verifyRegistrationResponse, persiste credentialID + publicKey + counter
```

**Pegadinhas reais:**
- **`rpID` precisa ser registrable suffix** do origin. `logistica.com` cobre `app.logistica.com` mas não `acme.io`. Subdomain isolation é decisão consciente.
- **`counter` em authenticatorData**: detecta clonagem. Cresce em cada uso. Se vier menor que o último guardado: alerta (possível attacker com cópia). Synced passkeys reportam counter=0 sempre — não dá pra detectar clone via counter em passkey synced. Trade-off conhecido.
- **Conditional UI** (`mediation: 'conditional'`): mostra autofill de passkey direto no input. Implementação do navegador. Default em 2025+.
- **Recovery**: se perder TODOS os devices que têm a passkey, perdeu acesso. Mitigação: múltiplas passkeys (cross-device), magic link/email recovery, account recovery codes salvos.
- **Backward compat**: usuário usa Firefox antigo, sem passkey suporte? Detecte via `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()` e degrade pra password+OTP.

**Server libs (2026):**
- **Node**: `@simplewebauthn/server` (de longe o mais usado e atualizado).
- **Go**: `github.com/go-webauthn/webauthn`.
- **Python**: `webauthn` package.
- **Rust**: `webauthn-rs`.

**Quando NÃO usar passkey:**
- Shared accounts (multi-user num device): passkey é per-user, atrapalha. Use sessions tradicionais.
- B2B com SSO existente (SAML/OIDC corporate): passkey complementa, não substitui.
- Setups onde recovery process é caro/manual: você provavelmente quer fallback de password.

**Estratégia de migração pragmática (2025+):**
1. Adicione passkey como segundo fator opcional.
2. Quando user registrar passkey, ofereça "use passkey instead of password" no próximo login.
3. Quando >50% dos logins forem por passkey, marque password como legacy.
4. App novo em 2025+: passkey-first, magic link como fallback, password só se mercado exigir.

Apple, Google, Microsoft já fizeram esse caminho. Stripe e GitHub também. Vale seguir.

### 2.10 Magic links

Login sem senha: user digita email; server manda link com token único; clicar autentica.

Pontos:
- Token deve ser long random, single-use, expirar (~15 min).
- Risco: email comprometido = conta comprometida.
- UX: sem senha pra esquecer.
- Comum em b2b SaaS (Slack, Notion).

### 2.11 CSRF

Cross-Site Request Forgery: site malicioso induz user logado a enviar request indesejado pro server.

Mitigações:
- **`SameSite=Lax`** ou `Strict` em cookies de sessão (default moderno faz quase tudo).
- **CSRF tokens**: server gera token único, app inclui em forms; server valida.
- **Custom header** + same-origin: APIs JSON requerem `X-Requested-With` ou similar (browser bloqueia em cross-origin).
- **Double-submit cookie**: cookie + header com mesmo valor; server compara.

Em APIs JWT em header `Authorization`, CSRF é menos relevante (browser não envia automaticamente). Mas se você usa cookie pra JWT, vira problema.

### 2.12 XSS e roubo de session

XSS = injeção de JS no app. Se atacante executa JS:
- localStorage: lê tudo, exfiltra.
- HttpOnly cookie: JS não vê. Mitiga.
- Mas atacante pode fazer requests autenticados via cookie. Não rouba o token, mas usa.

CSP (Content Security Policy) é defesa em camadas: limita origens de scripts, mitiga XSS impact. Em aplicações modernas, configure CSP.

### 2.13 Authorization: RBAC, ABAC, ReBAC

- **RBAC (Role-Based)**: user → roles → permissions. Estático, simples. Logística: lojista, courier, admin.
- **ABAC (Attribute-Based)**: decisão baseada em attrs (user, resource, action, context). Mais expressivo.
- **ReBAC (Relation-Based)**: relações entre entidades determinam acesso. Exemplo: Google Zanzibar (`user X is editor of doc Y`).

Implementação:
- RBAC: tabela `roles`, `role_permissions`, `user_roles`. Middleware checa.
- ABAC: policy engine (OPA — Open Policy Agent, Cedar) avalia regras.
- ReBAC: `OpenFGA`, `SpiceDB`, baseados em Zanzibar.

Em apps típicos, comece RBAC. Se permissions ficam complexas (compartilhamento granular tipo Google Drive), ReBAC é o caminho.

### 2.14 Multi-tenant + auth

Tenant isolation:
- JWT/session inclui `tenantId` claim.
- Middleware enforce: rota tem tenantId X, claim tem Y → 403.
- Database: queries scoped (`WHERE tenant_id = ?`). Postgres RLS (Row Level Security) pode ser última linha.

Cuidado com:
- Admin global cruzando tenants.
- Tokens revogados ainda válidos por TTL.
- Cache de auth keys vencendo.

### 2.15 Refresh tokens

Tipo:
- **Refresh token**: long-lived (dias/semanas), armazenado em cookie HttpOnly ou secure storage. Trocado por novo access token quando expira.
- **Refresh token rotation**: cada uso emite novo refresh, antigo invalida. Detecta replay (se 2 usos do mesmo refresh, alguém roubou — invalide tudo).
- **Sliding expiration** vs **absolute expiration**: política depende.

### 2.16 Identidade federada e SSO

Single Sign-On em corporações: **SAML 2.0** (legado, ainda predominante em enterprise) ou **OIDC** (moderno).

- **SAML**: XML-based, redirect/POST flow, asserção assinada. Conector via libs (`samlify`, `passport-saml`).
- **OIDC**: JSON, JWT-based.

**Just-In-Time Provisioning**: ao primeiro login via SSO, criar conta automaticamente.

**SCIM** (System for Cross-domain Identity Management): API pra IdP gerenciar usuários no app.

### 2.17 Identidade no edge

- **Cloudflare Workers / Vercel Edge**: middleware verifica JWT pra cada request. Stateless.
- **Auth0, Clerk, Stytch, WorkOS, Supabase Auth, Better-Auth**: serviços managed.
- **NextAuth/Auth.js**: lib pra Next/SvelteKit/etc., abstrai providers.
- **Lucia Auth**: lib leve pra projetos custom (Lucia v3+).

Decisão: managed (Auth0/Clerk) acelera mas vendor lock e custo escalando. Self-hosted (Keycloak, Authentik) flexível, op heavier. Lib + DB próprio (Lucia, Better-Auth) controle máximo, código maior.

### 2.18 Threats reais

OWASP Top 10 pra auth (Identification and Authentication Failures): credential stuffing, brute force, weak password reset, session fixation, etc.

Defesas:
- Rate limit em login.
- Lockout temporário pós N falhas (com cuidado pra não virar DoS no user).
- Notify de novo device (email).
- Audit log de auth events.
- Detection: tentativas estranhas (geo distante, novo user agent).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Distinguir authn e authz com exemplo onde misturá-las quebra security.
- Justificar Argon2id vs bcrypt vs PBKDF2.
- Listar atributos críticos de cookie de sessão e função de cada.
- Explicar por que `alg: none` JWT existiu e como evita.
- Diagrama Authorization Code + PKCE com 5 etapas.
- Distinguir OAuth2 de OIDC e dizer qual usar pra "login com Google".
- Citar 2 caminhos de mitigação de CSRF e em quais contextos cada vence.
- Explicar refresh token rotation e detecção de replay.
- Diferenciar RBAC, ABAC, ReBAC com 1 caso de cada.
- Argumentar quando passkeys substituem senha completamente.

---

## 4. Desafio de Engenharia

Implementar **auth completo do Logística**, sem libs auth-as-a-service.

### Especificação

1. **Stack**:
   - Continuação Fastify + Drizzle + Postgres + Redis.
   - Bibliotecas crypto: `argon2`, `jose` (JWT), `@simplewebauthn/server` (passkeys), `otplib` (TOTP).
2. **Cadastro e login básico**:
   - `POST /auth/signup` — email + senha, validação (zxcvbn ou similar pra força).
   - Senhas hash com Argon2id.
   - Email verification: server manda email com magic link (mock — log no console).
   - `POST /auth/login` — verifica senha, emite session.
3. **Sessions**:
   - Session ID em Redis (TTL 7 dias).
   - Cookie `__Host-sid` HttpOnly + Secure + SameSite=Lax.
   - `POST /auth/logout` revoga (delete Redis).
   - `POST /auth/logout-all` revoga todas sessions do user.
4. **MFA TOTP**:
   - User pode habilitar via QR code (URI `otpauth://totp/...`).
   - Após habilitar, login exige código.
   - Backup codes (10 single-use) gerados e mostrados uma vez.
5. **Passkeys**:
   - Endpoint `/auth/passkey/register` e `/auth/passkey/login` usando WebAuthn.
   - User pode adicionar múltiplas keys.
   - Login com passkey dispensa senha.
6. **OIDC com Google**:
   - `GET /auth/google` redireciona pra Google com PKCE + state.
   - `GET /auth/google/callback` valida state, troca code, valida ID token via JWKS, cria/upgrade conta.
7. **JWT pra mobile (companion app)**:
   - Endpoint `/auth/mobile/login` retorna access (10 min) + refresh (30 dias) tokens.
   - Refresh com **rotation**: cada refresh emite novo, antigo é invalidado em DB. Reuse detectado → invalida todos refresh tokens do user.
8. **Authorization (RBAC)**:
   - Roles: `lojista`, `courier`, `admin`.
   - Permissions matrix em código (e idealmente DB pra editáveis).
   - Decorator/hook Fastify pra checar `requireRole(['admin'])`.
9. **Tenant isolation**:
   - JWT/session inclui `tenantId`.
   - Middleware compara claim com path/query e bloqueia cross-tenant.
   - Pelo menos 1 query crítica protegida adicionalmente por Postgres RLS policy.
10. **Defesas**:
    - Rate limit em `/auth/login` (5 falhas em 15 min — Redis).
    - Lockout temporário (com timer claro pro user).
    - Audit log: tabela `auth_events` (user, type, ip, ua, ts).

### Restrições

- Sem Auth0/Clerk/Supabase Auth.
- Sem `passport`-tudo (você implementa o flow OIDC manualmente; pode usar `openid-client` pra parsing).
- Sem armazenar senha em qualquer forma além do hash Argon2id.

### Threshold

- README documenta:
  - Diagrama de cada flow (signup, login senha, login passkey, OIDC Google).
  - Cookies setados, com cada attribute justificado.
  - 1 ataque mitigado e como (CSRF, XSS, brute force, session fixation — escolha 2).
  - Rotação de refresh token e detecção de replay (com log de demonstração).
  - Política de RBAC explícita; 1 endpoint protegido com policy.

### Stretch

- Substituir RBAC por OPA/Cedar pra policies declarativas.
- Implementar OIDC server (você é o provider) usando `oidc-provider`.
- SCIM endpoint pra IdP gerenciar usuários.
- Step-up authentication: ações sensíveis exigem reauth (ex: trocar senha).

---

## 5. Extensões e Conexões

- Liga com **N03** (networking): TLS é fundação. Cookies são headers HTTP.
- Liga com **A05** (Next.js): middleware em edge pra checar session.
- Liga com **A07** (Node): crypto APIs nativos, `subtle` em edge.
- Liga com **A08** (frameworks): hooks/middleware de auth.
- Liga com **A09** (Postgres): RLS, schema multi-tenant.
- Liga com **A11** (Redis): session store, rate limit, denylist de tokens.
- Liga com **A14** (real-time): autenticar WebSocket no upgrade.
- Liga com **P08** (security): OWASP Top 10, threat modeling.
- Liga com **S05** (API design): RFC 6749, OIDC specs.

---

## 6. Referências

- **OWASP ASVS** ([owasp.org/www-project-application-security-verification-standard](https://owasp.org/www-project-application-security-verification-standard/)) — capítulo de auth.
- **OWASP Cheat Sheet Series**: Authentication, Session Management, JWT.
- **RFC 6749** (OAuth 2.0), **RFC 7636** (PKCE), **RFC 9068** (JWT Profile for OAuth Access Tokens), **RFC 9700** (OAuth 2.0 Security BCP).
- **OIDC spec** ([openid.net/specs/openid-connect-core-1_0.html](https://openid.net/specs/openid-connect-core-1_0.html)).
- **WebAuthn spec** ([w3.org/TR/webauthn-3](https://www.w3.org/TR/webauthn-3/)).
- **Auth0 blog** — explicações longas sobre flows.
- **"Web Authentication: An API for accessing Public Key Credentials"** — explainer simplewebauthn.
- **OpenFGA / SpiceDB / Zanzibar paper** ([research.google/pubs/zanzibar](https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/)).
