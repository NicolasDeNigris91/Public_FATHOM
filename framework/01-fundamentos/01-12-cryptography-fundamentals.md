---
module: 01-12
title: Cryptography Fundamentals, Hashes, MAC, AEAD, Key Exchange, PKI
stage: fundamentos
prereqs: [01-03]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 01-12, Cryptography Fundamentals

## 1. Problema de Engenharia

A maioria dos devs trata crypto como caixa-preta: chama `bcrypt`, copia trecho de OAuth2, usa HTTPS, e nunca pensa de novo. Resultado: vulnerabilidades clássicas continuam aparecendo, senhas em SHA-256 sem salt, AES-CBC sem MAC vulnerável a padding oracle, JWT com `alg:none`, comparações de tokens com `==` em tempo não-constante, GCM com nonce reutilizado destruindo confidencialidade, certificate pinning ausente em mobile.

Você não precisa **inventar** primitives, isso é missão de criptógrafos. Mas precisa entender o **que cada primitive garante**, **quando usar qual**, **quais são os modos de falha**. Sem essa base, 02-13 (Auth, JWT/OAuth2/OIDC), 03-08 (OWASP), 04-11 (Web3) viram cargo cult e você vai escrever código inseguro com confiança.

Este módulo é o vocabulário e os princípios. Hash function, MAC, signature, symmetric vs asymmetric, AEAD, key derivation, key exchange, PKI, randomness. Plus os pitfalls clássicos.

---

## 2. Teoria Hard

### 2.1 Modelos de adversário e propriedades

Crypto sempre define o que assume sobre o atacante e o que garante:
- **Confidentiality**: atacante não aprende plaintext.
- **Integrity**: atacante não modifica mensagem sem detecção.
- **Authenticity**: atacante não forja mensagem como sendo de outro.
- **Non-repudiation**: emissor não pode depois negar (assinatura digital).

Modelos: passive (sniffer), active (MitM, pode modificar), adaptive chosen-ciphertext (CCA2). Crypto moderno mira CCA2.

### 2.2 Hash functions

Função `H : bytes* → bytes_n` (saída fixa). Propriedades:
- **Pre-image resistance**: dado `H(x)`, achar `x` é inviável.
- **Second pre-image**: dado `x`, achar `x' ≠ x` com `H(x') = H(x)` é inviável.
- **Collision resistance**: achar **qualquer** `x ≠ x'` com mesmo hash é inviável.

Padrões atuais: **SHA-256**, **SHA-3**, **BLAKE3**. Aposentados/quebrados: MD5, SHA-1.

Hash **não é** pra senhas (rápido demais; vulnerável a brute force/GPU). Hash **não é** MAC (sem chave). Hash isolado em comunicação não previne MitM modificar tudo.

### 2.3 MAC (Message Authentication Code)

`MAC(key, msg) → tag`. Garantia: quem não tem `key` não consegue gerar tag válida. Provê integridade + autenticidade contra atacante ativo.

Construção principal: **HMAC** (RFC 2104), baseado em hash. `HMAC-SHA256` é default seguro.

**Verificação em tempo constante** é obrigatória: comparar tag byte-a-byte e fazer early return em diff vaza tempo → atacante recupera tag bit-a-bit (timing attack). Use `crypto.timingSafeEqual` em Node, `subtle.ConstantTimeCompare` em Go, `hmac.compare_digest` em Python.

### 2.4 Signatures (digital signatures)

`Sign(privkey, msg) → sig`; `Verify(pubkey, msg, sig) → bool`. Diferente de MAC: chave de assinar é privada, chave de verificar é pública. Permite **non-repudiation** (só dono da privkey podia ter assinado).

Padrões:
- **RSA-PSS** (não use PKCS#1 v1.5 em código novo).
- **ECDSA** (curva P-256/P-384). Determinismo importante (RFC 6979) pra evitar reuse de nonce que vaza chave.
- **EdDSA** (Ed25519, Ed448), escolha moderna preferida. Determinístico por design.

Falhas clássicas: nonce reuse em ECDSA recupera privkey (Sony PS3, 2010). Use libs sérias.

### 2.5 Symmetric encryption: cifras de bloco e modos

Cifra de bloco: AES (128/192/256 bits). Opera em blocos de 128 bits.

**Modos** dizem como encadear blocos pra cifrar mensagem maior:
- **ECB** (Electronic Codebook): cada bloco independente. **Nunca use**: leaks de patterns (a imagem do pinguim com ECB virou meme técnico).
- **CBC** (Cipher Block Chaining): XOR com bloco anterior. Precisa IV aleatório. Vulnerável a padding oracle (POODLE) se mal implementado.
- **CTR** (Counter): transforma cifra de bloco em stream cipher; precisa nonce único.
- **GCM** (Galois/Counter Mode): CTR + autenticação (GMAC). É **AEAD**.
- **XTS**: pra disk encryption.

**Nunca use** AES isolado em bloco. Sempre use AEAD.

### 2.6 AEAD (Authenticated Encryption with Associated Data)

AEAD provê **confidencialidade + integridade + autenticidade** numa primitive:
- `Enc(key, nonce, plaintext, AD) → (ciphertext, tag)`
- `Dec(key, nonce, ciphertext, AD, tag) → plaintext or fail`

Padrões: **AES-GCM** (hardware accelerated em x86), **ChaCha20-Poly1305** (rápido em mobile/ARM, sem hardware AES).

Regras de ouro:
- **Nonce nunca reutilizado** com mesma chave. AES-GCM com nonce reuse → recuperação parcial do plaintext + forja. ChaCha20-Poly1305 idem.
- AD (associated data): metadados autenticados mas não cifrados (ex: header).
- Tag length ≥ 128 bits.

Pra "default seguro": **libsodium** (`crypto_aead_xchacha20poly1305_ietf_encrypt`), nonce de 192 bits que pode ser random sem medo de colisão.

### 2.7 Key derivation

Senhas e chaves vão por funções diferentes:
- **PBKDF2**: aceitável, mas datado.
- **bcrypt**: clássico de senha, work factor configurável.
- **scrypt**: memory-hard, resiste a GPU.
- **Argon2id**: padrão atual pra senhas. Memory-hard, resiste a GPU/ASIC.

Para derivar chaves de uma master key: **HKDF** (HMAC-based Key Derivation Function, RFC 5869). Extract + Expand.

Senha em DB: nunca SHA-256. Sempre Argon2id (ou bcrypt se libs limitam). Sal aleatório por usuário, work factor que demora ~100ms numa máquina típica.

### 2.8 Asymmetric: RSA vs ECC

**RSA** (Rivest-Shamir-Adleman): segurança baseada em fatoração de inteiros grandes. Chaves de 2048+ bits hoje, 3072 recomendado. Lento.

**ECC** (Elliptic Curve Cryptography): segurança em discrete log em curvas. Chaves muito menores (256 bits ECC ≈ 3072 RSA). Curvas: P-256 (NIST), Curve25519 (Bernstein, mais segura por design).

Asymmetric é caro, você raramente cifra dados grandes com ele. Padrão: usar asymmetric pra **estabelecer** chave simétrica, então cifrar dados com simétrico (hybrid encryption).

### 2.9 Key exchange: Diffie-Hellman

DH permite que dois lados gerem **shared secret** sem nunca enviá-lo. Hoje, **ECDH** (DH em curva elíptica) é padrão.

Em TLS 1.3 e Signal, key exchange é **ephemeral** (DHE/ECDHE), gera chaves novas por sessão. Garante **forward secrecy**: se chave de longo prazo é comprometida no futuro, sessões antigas continuam seguras.

### 2.10 PKI e certificados X.509

Como você sabe que a chave pública é mesmo do servidor? Resposta: **certificate**, assinada por CA (Certificate Authority) confiada.

Cadeia: certificate do servidor → assinada por intermediate CA → assinada por root CA (no trust store do OS/browser). Browser valida cadeia, validade, revocation, hostname (SAN).

Revocation: **CRL** (lista grande, raro funcionando), **OCSP** (online check, privacy issue), **OCSP stapling** (servidor entrega resposta OCSP pré-assinada). Em mobile, **certificate pinning** é mais robusto.

ACME (Let's Encrypt): automation de emissão.

### 2.11 TLS 1.3 (overview, integra com 01-03)

TLS 1.3 (RFC 8446) drasticamente simplificou:
- Apenas AEAD (AES-GCM, ChaCha20-Poly1305).
- ECDHE-only (forward secrecy obrigatório).
- 1-RTT handshake; 0-RTT opcional (com replay risk).
- Removeu cifras inseguras (RC4, 3DES, MD5).

ClientHello → ServerHello (com key share) → cifrar resto. Authenticate via certificate + signature.

### 2.12 Randomness: CSPRNG vs PRNG

**PRNG** (Math.random, `rand()` em C): **NÃO** use em crypto. Previsível.

**CSPRNG** (Cryptographically Secure):
- Linux: `/dev/urandom`, syscall `getrandom`.
- Node: `crypto.randomBytes`, `crypto.randomUUID`.
- Browser: `crypto.getRandomValues`.

Entropia inicial vem de timing de hardware events; depois CSPRNG expande deterministicamente. Em containers/VMs, garantir entropia inicial é cuidado real (haveged, virtio-rng).

Nunca use timestamp como token. Nunca use sequencial.

### 2.13 Pitfalls clássicos

- **JWT `alg:none`**: aceita token sem verificar assinatura. Lib mal-feita aceita.
- **JWT `alg` confusion**: trocar RS256 por HS256 e usar pubkey como "secret".
- **Padding oracle (CBC)**: erro de "padding inválido" diferente de "MAC inválido" → atacante decifra byte a byte.
- **Timing attack**: comparação não-constante.
- **Nonce reuse em GCM**: catástrofe.
- **Hash de senha sem sal**: rainbow tables.
- **Hash rápido pra senha (SHA-256)**: GPU ataca milhões/segundo.
- **Sign-then-encrypt vs encrypt-then-MAC**: ordem importa. **Encrypt-then-MAC** é a regra; AEAD resolve por design.
- **TLS sem hostname verify**: MitM trivial.
- **Pinning sem rotation plan**: app trava quando cert expira.
- **Random fraco em ECDSA**: vaza chave.

### 2.14 Crypto agility

Algoritmos viram ruins (MD5, SHA-1, RC4). Sistema deve ser capaz de **trocar** sem rewrite, versionar formato (`v1$argon2id$...`, `v2$...`), suportar múltiplos algorithms em paralelo, ter rotation plan de chaves.

### 2.15 Pós-quântico, NIST standards 2024+

Computadores quânticos teóricos quebram **RSA, DH, ECC** via algoritmo de Shor. Hash e simétrico (AES) sobrevivem com chaves maiores (Grover dá speedup quadrático em busca, não exponencial).

**Estado atual (2025-2026)**: NIST finalizou primeiro batch pós-quântico em **agosto 2024**:

| Standard | Algoritmo base | Uso | Status |
|---|---|---|---|
| **FIPS 203** | ML-KEM (ex-Kyber) | KEM (key encapsulation) | Recomendado pra TLS, key exchange |
| **FIPS 204** | ML-DSA (ex-Dilithium) | Assinatura | Recomendado pra signatures gerais |
| **FIPS 205** | SLH-DSA (ex-SPHINCS+) | Assinatura hash-based | Backup conservador (sem assumptions de lattice) |
| (em finalização) | ML-DSA-44/Falcon | Assinatura compacta | Pra firmware, certificates |

**Por que importa hoje** (não em 10 anos):
- **"Harvest now, decrypt later"**: adversário grava tráfego TLS hoje, decrypta quando tiver quantum em ~10-20 anos. Dados sensíveis com lifetime longo (medical records, state secrets, IP) já estão expostos.
- **PKI de longo prazo**: cert root CA dura décadas. Migrar PKI demora 5-10 anos. Começou em 2024.

**O que está acontecendo na prática:**
- **TLS 1.3 hybrid**: Chrome 124+ + servidores Cloudflare/Google usam **X25519MLKEM768** (combina ECDH clássico com ML-KEM). Se um quebra, o outro segura. Default em vários clients.
- **SSH**: OpenSSH 9.0+ tem `sntrup761x25519-sha512` hybrid em key exchange.
- **Signal**: PQXDH (Post-Quantum Extended Diffie-Hellman) live em produção desde 2023.
- **Browsers**: Chrome 116+ negocia X25519Kyber768Draft00 em ~ todo TLS handshake; análise de telemetria mostrou 1-2ms overhead por handshake.

**Trade-offs práticos:**
- **Tamanho de chave/assinatura**: ML-KEM cipher é ~1.1KB (vs 32 bytes ECDH). ML-DSA signature é 2.5KB. Impact em embedded e em cabeçalhos QUIC/TLS.
- **Performance**: ML-KEM é rápido (mais rápido que RSA em alguns casos). ML-DSA verifica em ~50 µs. Não é gargalo.
- **Conservadorismo**: SLH-DSA (hash-based, sem lattice) é fallback se descobrirem ataque a lattices. Custa em tamanho mas é "matematicamente conservador".

**Quando você toca:**
- **Hoje**: rodando TLS recente, você já tem hybrid. Nada a fazer.
- **Próximos 2-3 anos**: PKI corporativa começa a emitir certificates híbridos. Code signing migra.
- **5-10 anos**: assinaturas legacy (RSA 2048) em firmware/devices viram passivo de risco real.

Não implemente PQ crypto você mesmo, use **liboqs** (Open Quantum Safe), **AWS-LC**, **OpenSSL 3.5+**, ou **BoringSSL**. Cripto pós-quântica é especialmente sensível a side-channels novos (timing em lattice ops).

### 2.16 Constant-time programming

Crypto correto exige código **sem branches dependentes de segredo** e sem **memory access dependente de segredo**:
- `if secret_byte == X` → branch predictor leak.
- `lookup_table[secret_byte]` → cache timing leak.

Implementações sérias usam mascaramento, instruções constant-time, hardware AES (AES-NI). Nunca implemente AES em JS você mesmo.

### 2.17 Sub-protocolos comuns

- **Signal Protocol**: end-to-end com forward secrecy + post-compromise security via Double Ratchet.
- **Noise Protocol Framework**: framework genérico de handshakes (WireGuard usa Noise).
- **TOTP/HOTP** (RFC 6238/4226): MFA baseado em HMAC.
- **WebAuthn / passkeys**: assinatura via dispositivo, sem senha. Padrão emergente.

**Cruza com:** **04-15 §2.20** (OSS supply chain — Sigstore + cosign + Rekor transparency log + Fulcio CA pra release attestations).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Diferenciar hash, MAC, signature, quando usar cada e por quê.
- Listar 3 propriedades de hash (pre-image, second pre-image, collision) e dar caso onde collision basta atacante.
- Explicar por que ECB nunca; mostrar imagem do pinguim e justificar.
- Explicar AEAD e regra de nonce não-reutilizado em GCM.
- Justificar bcrypt/Argon2id em vez de SHA-256 pra senhas.
- Explicar forward secrecy via ECDHE ephemeral.
- Diferenciar `alg:none` attack de `alg confusion` em JWT.
- Explicar timing attack e como `crypto.timingSafeEqual` resolve.
- Diferenciar PRNG e CSPRNG; dar fonte correta em Linux/Node/Browser.
- Justificar AES-GCM vs ChaCha20-Poly1305 em servidor x86 vs mobile ARM.
- Explicar PKI cadeia de confiança e por que pinning ajuda mobile.

---

## 4. Desafio de Engenharia

Construir uma **biblioteca mínima de utilitários crypto seguros** em TypeScript usando `crypto` nativo do Node, e uma **suite de demos de ataques** que falham na versão errada e passam na correta.

### Especificação

1. **Lib `safe_crypto`**:
   - `hashPassword(password)` / `verifyPassword(password, hash)`, Argon2id via `argon2` package.
   - `aeadEncrypt(key, plaintext, ad)` / `aeadDecrypt(key, ciphertext, ad)`, XChaCha20-Poly1305 (libsodium via `sodium-native`), nonce random embutido.
   - `signHmac(key, msg)` / `verifyHmac(key, msg, tag)`, HMAC-SHA256 com `timingSafeEqual`.
   - `signEd25519(privkey, msg)` / `verifyEd25519(pubkey, msg, sig)`.
   - `deriveKey(masterKey, info, len)`, HKDF.
   - `randomToken(bytes)`, CSPRNG.
2. **Demos de ataque** (em testes que falham na versão "ingênua" e passam na "segura"):
   - **Timing attack** em compareHmac com `===` vs `timingSafeEqual`.
   - **Padding oracle** em AES-CBC manual (educativo), depois mostre que AEAD elimina.
   - **Nonce reuse** em AES-GCM: cifre 2 mensagens diferentes com mesmo nonce, mostre XOR de ciphertexts revela XOR de plaintexts.
   - **Senha SHA-256 vs Argon2id**: brute force `hashcat`-style em set de 100 senhas comuns; mostre ratio de cracking.
   - **JWT `alg:none`** em parser ingênuo vs `jose` lib.
3. **Doc `THREAT-MODEL.md`**:
   - Que propriedade cada função garante.
   - Que assumption sobre adversário.
   - Como rotação de chaves funciona.

### Restrições

- Jamais implementar AES, ChaCha20, Argon2 you mesmo. Use libs auditadas.
- Todas comparações de segredo em tempo constante.
- Nonces gerados via CSPRNG, nunca contador previsível.
- Testes determinísticos (mock RNG quando necessário).

### Threshold

- Cobertura ≥ 90%.
- Cada demo de ataque tem **versão vulnerável que falha o teste** + **versão segura que passa**.
- THREAT-MODEL especifica garantias.

### Stretch

- Implemente **Double Ratchet** mínimo (ratchet de chaves, sem rede) e mostre forward + post-compromise.
- Adicione **TOTP** (RFC 6238) com janela ±1 step.
- Implemente versioning de hash de senha (`v1$argon2id$...`) e rotação automática em login bem-sucedido.
- Use **`opensk`** ou implemente WebAuthn relying party básico em Node.

---

## 5. Extensões e Conexões

- Liga com **01-03** (networking): TLS 1.3 usa ECDHE, AEAD, certificates.
- Liga com **01-04** (data structures): Merkle trees, Bloom filters criptográficos.
- Liga com **01-09** (Git internals): SHA-1 (depreciado), SHA-256 transition.
- Liga com **02-13** (Auth): senhas, JWT, OAuth2, OIDC dependem disso.
- Liga com **03-08** (OWASP): 02-02 cryptographic failures.
- Liga com **04-05** (API design): mTLS entre serviços.
- Liga com **04-11** (Web3): hash, signatures, Merkle, BLS, toda a base.

---

## 6. Referências

- **"Cryptography Engineering"**: Ferguson, Schneier, Kohno. Livro de referência prática.
- **"Serious Cryptography"**: Jean-Philippe Aumasson. Moderno, denso.
- **"A Graduate Course in Applied Cryptography"**: Boneh, Shoup. Gratuito, profundo.
- **RFC 8446**: TLS 1.3.
- **RFC 5869**: HKDF.
- **RFC 7693**: BLAKE2; **BLAKE3** spec.
- **NIST SP 800-63B**: Authentication guidelines.
- **libsodium docs** ([doc.libsodium.org](https://doc.libsodium.org/)).
- **Cryptographic Right Answers**: Latacora ([latacora.micro.blog/2018/04/03/cryptographic-right-answers.html](https://latacora.micro.blog/2018/04/03/cryptographic-right-answers.html)).
- **"Real World Crypto" talks** (rwc.iacr.org).
