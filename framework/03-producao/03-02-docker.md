---
module: 03-02
title: Docker, Images, Layers, Networking, Compose, Multi-stage
stage: producao
prereqs: [01-02, 01-10]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# 03-02, Docker

## 1. Problema de Engenharia

Docker é commodity, mas a maioria dos `Dockerfile`s em projetos reais é desastre: imagens de 2 GB com `node_modules` de dev, secrets em ENV, root user, build cache não usado, layers gigantes, latência fria de minutos em deploys, vulnerabilidades não tratadas. "Docker funciona" é diferente de "Docker bem usado".

Este módulo é Docker fundo: namespaces, cgroups, OverlayFS, layer caching, multi-stage builds, BuildKit, distroless, security hardening, networking, volumes, Compose pra dev, registries. Você sai construindo imagens 50-200 MB enxutas, com builds rápidos, prontas pra Kubernetes ou plataformas serverless.

---

## 2. Teoria Hard

### 2.1 O que Docker realmente é

Docker é wrapper sobre features Linux:
- **Namespaces**: isolam recursos (PID, network, mount, UTS, IPC, user). Container "não vê" outros processos.
- **cgroups**: limitam recursos (CPU, mem, IO).
- **OverlayFS**: filesystem em camadas; container monta união de read-only image layers + writable layer.
- **Capabilities**: subset de root privileges (NET_ADMIN, SYS_PTRACE...). Containers default rodam sem maioria.
- **seccomp/AppArmor/SELinux**: filtros de syscall.

Container = processo Linux com namespaces aplicados. Não é "VM leve", VM tem kernel próprio; container compartilha kernel do host.

### 2.2 Image vs container

- **Image**: artefato imutável, conjunto de layers + metadata (CMD, ENV, EXPOSE).
- **Container**: instância running de uma image. Estado writable em layer top.
- **Layer**: tarball + metadata. Cached e shared entre images.

Image "FROM nginx:1.27" → seu Dockerfile adiciona layers. Layers comuns ficam em cache.

### 2.3 Dockerfile fundamentos

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
USER node
CMD ["node", "dist/server.js"]
```

Cada `COPY`/`RUN` cria layer. Ordem importa pra cache: itens que mudam menos antes (deps), código depois.

### 2.4 Multi-stage builds

Reduz imagem final separando build e runtime:

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

Final image só tem o necessário pra rodar. Build artifacts intermediários ficam em stages descartados.

Para Node.js mais leve: `pnpm install --prod --frozen-lockfile` na stage final, copiando só prod deps.

Para Next.js: `output: 'standalone'` em `next.config.js` produz `.next/standalone/` com server completo + node_modules mínimas. Imagem final fica ~150 MB em vez de 1 GB.

### 2.5 Distroless e Alpine

- **Alpine** (musl libc): ~5 MB base. Pequeno mas eventualmente quebra com bibliotecas que assumem glibc (Argon2 native, alguns sharp builds).
- **Debian slim**: ~80 MB, glibc, mais compatível.
- **Distroless** (Google): só o runtime (glibc, certs). Sem shell, sem package manager. Segurança máxima, debug difícil.

Recomendação 2026: `node:22-bookworm-slim` ou `gcr.io/distroless/nodejs22` na stage final.

### 2.6 BuildKit

`DOCKER_BUILDKIT=1` (default em Docker 23+) habilita BuildKit:
- Concorrência entre stages independentes.
- Cache mounts (`--mount=type=cache,target=/root/.npm`).
- Secrets mounts (`--mount=type=secret,id=npm_token`), não fica em layer.
- Bind mounts pra build context.
- `RUN --mount=type=ssh` pra git private.

Exemplo cache mount pra pnpm:
```dockerfile
RUN --mount=type=cache,target=/pnpm/store pnpm install --frozen-lockfile
```
Próximo build reusa store mesmo se Dockerfile mudou.

#### Multi-arch builds (linux/amd64 + linux/arm64)

ARM ganhou prod em 2024-2026: AWS Graviton (~20-40% cheaper que x86), Apple Silicon dev, Cloudflare/Fly.io edge ARM-only. Imagem **single-arch** trava deploy em provider ARM.

```bash
# Setup uma vez
docker buildx create --name multiarch --driver docker-container --bootstrap --use

# Build cross-arch + push manifest list
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag ghcr.io/me/api:v1.2.3 \
  --push \
  .
```

Resultado: registry tem **manifest list** apontando 2 images (uma por arch); pull do consumidor ARM puxa só a ARM. `docker pull` resolve automaticamente.

**Performance**: building ARM em runner x86 usa QEMU emulation — 5-10x mais lento. Soluções:
- **Runners ARM nativos**: GitHub Actions `runs-on: ubuntu-24.04-arm` (free pra public repos). Build paralelo per-arch, depois merge manifest com `docker buildx imagetools create`.
- **Cross-compile no app**: build binário Go/Rust em x86 com `GOARCH=arm64`, copie pra image. Skip emulation.

#### Cache backends pra CI

Build local usa cache local. CI sem cache backend = build do zero todo run (lento, caro).

```bash
# Registry-based cache (push/pull cache layer pra registry)
docker buildx build \
  --cache-from type=registry,ref=ghcr.io/me/api:buildcache \
  --cache-to type=registry,ref=ghcr.io/me/api:buildcache,mode=max \
  --tag ghcr.io/me/api:latest \
  --push .

# GitHub Actions cache (10GB free, expira em 7 dias sem hit)
docker buildx build \
  --cache-from type=gha \
  --cache-to type=gha,mode=max \
  --tag ghcr.io/me/api:latest \
  --push .

# S3 cache (custom, controlled retention)
docker buildx build \
  --cache-from type=s3,region=us-east-1,bucket=my-buildcache \
  --cache-to type=s3,region=us-east-1,bucket=my-buildcache,mode=max \
  ...
```

`mode=max` exporta TODOS os layer intermediários (incluindo do builder stage). `mode=min` exporta só o final. Use `max` em CI sério, `min` se cache budget é restrito.

#### Secrets mount avançado

```dockerfile
# Dockerfile
RUN --mount=type=secret,id=npm_token,target=/root/.npmrc \
    --mount=type=secret,id=aws_creds,target=/root/.aws/credentials \
    npm install && \
    aws s3 cp s3://artifacts/foo .
```

```bash
# Build invocation
DOCKER_BUILDKIT=1 docker build \
  --secret id=npm_token,src=$HOME/.npmrc \
  --secret id=aws_creds,src=$HOME/.aws/credentials \
  -t myimage .

# CI (secrets vindo de env, não files)
echo -n "$NPM_TOKEN" | docker buildx build --secret id=npm_token,src=/dev/stdin ...
```

Secret **não** fica em nenhuma layer da imagem final — montado em build-time só. Diferente de `ARG` (que vaza em `docker history`) ou `ENV` (que persiste).

#### Output formats

```bash
# OCI tarball local (pra inspeção, não-registry distribution)
docker buildx build --output type=oci,dest=image.tar ...

# Plain filesystem (pra extract artifacts sem container)
docker buildx build --output type=local,dest=./out ...
# Use case: build Next.js, extrair só /app/out pra servir em S3 + CloudFront.
```

### 2.7 .dockerignore

Crucial. Sem ele, `COPY . .` envia node_modules, .git, build outputs pra contexto de build. Build lento e imagem inflada.

```
node_modules
.git
.env*
dist
.next
.cache
**/*.log
```

### 2.8 Layer caching estratégico

Regras:
- Lockfile/package.json antes do código fonte (deps mudam menos).
- Compilação separada da execução.
- `RUN` que combinam install + cleanup numa única linha (evita layer com cache lixo).
- Vars que mudam (`ARG GIT_SHA`) tarde pra não invalidar layers anteriores.
- `COPY` específico (`COPY src ./src`) em vez de `COPY . .` quando só precisa subset.

### 2.9 Networking

Docker cria bridge `docker0` por default. Container ganha veth pair, IP no range, NAT pra fora.

Drivers:
- `bridge` (default).
- `host` (sem isolamento de rede).
- `overlay` (multi-host, Swarm/Kubernetes).
- `macvlan` (container com MAC próprio).
- `none`.

Em Compose, networks default isolam por projeto. Containers no mesmo network resolvem por nome (`postgres`, `redis`).

### 2.10 Volumes

3 tipos:
- **Named volume**: gerenciado por Docker. `docker volume create pgdata`. Persiste entre containers.
- **Bind mount**: monta path do host. `-v /host/path:/container/path`. Bom pra dev (live reload).
- **tmpfs**: em RAM. Pra dados efêmeros sensíveis.

Em prod: named volumes pra estado durável. Em dev: bind mounts pra código.

Cuidado: bind mount em Mac/Windows é lento (file system sync). Mac VM-based usa virtiofs/9p, performance varia.

### 2.11 Docker Compose

YAML descreve serviços, networks, volumes:
```yaml
services:
  api:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgres://app:secret@postgres:5432/app
    depends_on:
      postgres:
        condition: service_healthy
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
volumes: { pgdata: }
```

Compose v2 (plugin) substituiu v1 (`docker-compose` Python). Comando: `docker compose up`.

`depends_on` apenas ordena start; não espera readiness sem `condition: service_healthy`.

Healthchecks importam: definem se container está "ok" pra outros dependerem.

### 2.12 Security hardening

- **Run as non-root**: `USER node` ou UID/GID explícito. Default Docker é root, péssimo.
- **Read-only filesystem**: `--read-only`, com `tmpfs` pros writable paths necessários.
- **Drop capabilities**: `--cap-drop=ALL --cap-add=NET_BIND_SERVICE`.
- **No-new-privileges**: `--security-opt=no-new-privileges`.
- **Don't bake secrets**: `ENV API_KEY=...` no Dockerfile = secret na image. Use BuildKit secrets ou runtime env.
- **Vulnerability scanning**: `docker scout`, `trivy`, `grype`. CI gate.
- **Sign images**: `cosign` (Sigstore) pra supply chain.

### 2.13 Image size diet

- Multi-stage.
- Distroless ou slim base.
- `npm prune --production` ou `pnpm install --prod`.
- Remover cache de package manager (`apt clean && rm -rf /var/lib/apt/lists/*`).
- Single layer pra install + cleanup.
- Avaliar `node:22-alpine` vs `slim` por compat.

Meta: backend Node típico ≤ 200 MB. Front Next standalone ≤ 200 MB. Pro código novo é alcançável.

### 2.14 Registries

- **Docker Hub**: público gratis, privado pago, rate limits famosos.
- **GHCR** (GitHub Container Registry): integrado a GitHub Actions, generoso.
- **ECR** (AWS), **GAR** (Google), **ACR** (Azure): cloud-native.
- **Private registry**: Harbor, Distribution.

Tags:
- Nunca `latest` em prod (mutable).
- SHA imutável (`@sha256:...`).
- Semantic versioning (`v1.2.3`).
- `git-sha` (commit) pra rastreabilidade.

### 2.15 Dev vs prod containers

Diferenças aceitáveis:
- Dev tem nodemon/tsx/watch.
- Dev tem source maps inline.
- Prod só dist + production deps.

Mas: **runtime base e config devem espelhar prod**. Bug que aparece só em prod por divergência é cara.

Padrão: `Dockerfile` com stages dev e prod, ou `Dockerfile` + `Dockerfile.dev`. Compose escolhe stage via `target:`.

### 2.16 Logs e signals

- Container deve logar **stdout/stderr** (não em arquivo dentro do container).
- Logger driver do runtime (Docker, K8s) coleta.
- Kill com `SIGTERM`. Container espera `stopGracePeriod` (default 10s) antes de `SIGKILL`.
- App deve ter handler. Vimos em 02-07.
- `tini` ou `dumb-init` como PID 1 quando o app não reapa zombies (Node como PID 1 funciona, mas em alguns runners é safer).

### 2.17 Init systems e PID 1 problem

PID 1 reapa zumbis e propaga sinais corretamente. Linux trata PID 1 com regras especiais (defaults a ignorar SIGTERM se não há handler).

Node 12+ trata SIGTERM/SIGINT corretamente como PID 1. Mas se você fork child processes, zumbis podem acumular. `tini` resolve.

Em Distroless, `tini` já vem.

### 2.18 Compose vs Kubernetes

Compose: dev local, ambientes simples, prototipagem.

Kubernetes: prod escalável, multi-host, scheduler, service discovery, secrets, autoscaling. Vimos em 03-03.

Para projetos pequenos-médios em Railway/Render/Fly: Compose-like config é o que esses providers expõem por baixo.

### 2.19 Dev environments alternativos

- **Dev Containers** (VSCode): `.devcontainer/devcontainer.json` define imagem + features. Reproduzível.
- **Nix**: gerenciamento de deps reproduzível, sem Docker. Crescendo.
- **Podman**: drop-in Docker daemon-less, rootless por default.

### 2.20 Secrets em containers — build-time, runtime, K8s, anti-patterns

Secrets em container é onde 80% dos breaches começam. `ENV API_KEY=...` em Dockerfile = secret commitado em image layer pra sempre, indexado em registries públicos. Esta seção cobre 4 vetores: (1) build-time secrets (BuildKit `--mount=type=secret`), (2) runtime injection (env, file, IMDS, vault), (3) K8s patterns (Secret resource, External Secrets Operator, CSI driver), (4) detecção de secret leak (gitleaks, trufflehog).

**Anti-pattern primeiro — o que NÃO fazer**:

```dockerfile
# ALL TERRIBLE
ENV STRIPE_SECRET_KEY=sk_live_abc123
ARG NPM_TOKEN
RUN echo $NPM_TOKEN > /root/.npmrc
COPY .env /app/.env
RUN curl -H "Authorization: $TOKEN" https://internal/api
```

- `ENV`: secret persiste em image layer; `docker history` revela.
- `ARG`: visível em `docker inspect`; também acaba em layer se referenciado em RUN.
- `COPY .env`: secret commitado em image filesystem.
- `RUN curl ... $TOKEN`: token em command line aparece em `--no-cache` rebuild logs e layer.

**Build-time secrets — BuildKit `--mount=type=secret`** (correto):

```dockerfile
# syntax=docker/dockerfile:1.7
FROM node:20 AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./

# Secret monta em /run/secrets/<id> apenas durante RUN; não persiste em layer
RUN --mount=type=secret,id=npm_token,target=/root/.npmrc \
    corepack enable && pnpm install --frozen-lockfile

FROM node:20-slim
COPY --from=deps /app/node_modules /app/node_modules
COPY . /app
WORKDIR /app
CMD ["node", "server.js"]
```

Build:

```bash
# Secret de file
echo "//registry.npmjs.org/:_authToken=npm_xxx" > /tmp/npmrc
docker build --secret id=npm_token,src=/tmp/npmrc -t app .

# Secret de env var (CI)
docker build --secret id=npm_token,env=NPM_TOKEN -t app .
```

- **Garantias**: secret nunca aparece em image, history, inspect, layers.
- **Pegadinha**: hash do secret content NÃO é parte do cache key; cache hit reusa layer mesmo com secret diferente. OK pra pre-compiled deps; RUIM se secret afeta output (ex: build com chave de licença diferente).

**Build-time SSH agent forwarding** (pra clone de repo privado):

```dockerfile
# syntax=docker/dockerfile:1.7
RUN --mount=type=ssh \
    git clone git@github.com:myorg/private-lib.git
```

Build:

```bash
eval $(ssh-agent)
ssh-add ~/.ssh/id_ed25519
docker build --ssh default -t app .
```

**Runtime secrets — 4 padrões**:

**1. Env vars via `docker run -e`** (acceptable, NÃO ideal):

```bash
docker run -e DATABASE_URL=postgres://... app
```

- Pros: simples, universal.
- Cons: visível em `docker inspect`, em `/proc/<pid>/environ`, em logs de exception com env dump (`process.env` impresso).

**2. Env vars via `--env-file`**:

```bash
docker run --env-file=secrets.env app
```

- Same caveats que `-e` em runtime; só evita shell history.

**3. Tmpfs mount com secret file**:

```bash
docker run \
  --mount type=tmpfs,destination=/run/secrets,tmpfs-size=64k \
  --mount type=bind,source=/host/secrets/db_password,target=/run/secrets/db_password,readonly \
  app
```

- Secret em RAM, não em disk image.
- App lê de file path, não env var: `const dbPwd = await fs.readFile('/run/secrets/db_password', 'utf8');`.
- Padrão Docker Swarm secrets também.

**4. IMDS / Vault / cloud secret manager — recomendado em prod**:

```typescript
// App busca secret on-demand de SecretsManager (AWS) / Secret Manager (GCP)
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const sm = new SecretsManagerClient({ region: 'us-east-1' });
let cachedDbPwd: { value: string; fetchedAt: number } | null = null;

async function getDbPassword(): Promise<string> {
  if (cachedDbPwd && Date.now() - cachedDbPwd.fetchedAt < 5 * 60 * 1000) {
    return cachedDbPwd.value;
  }
  const resp = await sm.send(new GetSecretValueCommand({ SecretId: 'prod/db/password' }));
  cachedDbPwd = { value: resp.SecretString!, fetchedAt: Date.now() };
  return cachedDbPwd.value;
}
```

- Container roda com IAM role (IRSA em EKS, Workload Identity em GKE) — sem static credential.
- Cache local 5min reduz chamada API; rotation transparente em rotation event.

**Docker Swarm secrets** (legacy mas em produção):

```bash
echo "supersecret" | docker secret create db_password -

docker service create \
  --name api \
  --secret db_password \
  --secret source=stripe_key,target=stripe_key,mode=0400 \
  myorg/api:latest
```

- Secret em `/run/secrets/<name>` no container.
- Encrypted em raft store; só nodes que precisam recebem.
- Não suporta rotation sem redeploy do service.

**Kubernetes — Secret resource + 3 padrões avançados**:

**1. Secret básico** (caveat: base64 NÃO é encryption):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-creds
type: Opaque
data:
  password: c3VwZXJzZWNyZXQ=    # base64 de 'supersecret'
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  template:
    spec:
      containers:
        - name: api
          image: myorg/api:latest
          env:
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-creds
                  key: password
```

- **Default etcd**: secrets armazenados em plain text. Habilite `EncryptionConfiguration` (AES-CBC ou KMS-backed).
- RBAC restritivo: `get secrets` só pra service accounts que precisam.

**2. External Secrets Operator (ESO) — sync de Vault/AWS/GCP**:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-creds
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-sm
    kind: ClusterSecretStore
  target:
    name: db-creds
  data:
    - secretKey: password
      remoteRef:
        key: prod/db/password
```

- Single source of truth (Vault/SM); K8s Secret é cache reconciliado.
- Rotation no SM propaga em < refresh interval.

**3. CSI Secret Store Driver — mount sem K8s Secret**:

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: vault-db-creds
spec:
  provider: vault
  parameters:
    vaultAddress: https://vault.internal:8200
    roleName: api
    objects: |
      - objectName: "db_password"
        secretPath: "secret/data/prod/db"
        secretKey: "password"
```

- Secrets montados como files; sem cópia em K8s Secret.
- Rotation via re-mount; pod recebe sem restart.

**Detecção de leaks — pre-commit + CI**:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks

# .github/workflows/secret-scan.yml
- uses: trufflesecurity/trufflehog@main
  with:
    path: ./
    extra_args: --only-verified
```

- Verified-only mode: confirma que credential ainda está ativa (chamada API leve).
- Em historic scan: `trufflehog git file://. --since-commit HEAD~100`.

**Anti-patterns observados em produção**:

- **`ENV` em Dockerfile pra "convenience"**: image em registro privado vaza pra terceirizado tem acesso.
- **Secret em `--build-arg`**: `docker history` revela; ARG é visível em metadata.
- **`COPY .env`**: literalmente coloca .env no image filesystem.
- **Logs com `process.env` dump em exception handler**: secrets aparecem em Sentry/Datadog.
- **Print de connection string em startup**: "connecting to postgres://user:pass@host" em log line.
- **K8s Secret sem encryption-at-rest config**: snapshot etcd contém plain text.
- **Service account com `cluster-admin`**: comprometeu pod = comprometeu cluster.
- **Sem rotation policy**: secret ativo há 3 anos; ex-funcionário ainda tem. Set max age + alert.

**Validation — secret leak audit local**:

```bash
# Gitleaks scan completo
gitleaks detect --source . --verbose --report-path leaks.json

# Auditar Dockerfile
docker history myorg/api:latest --no-trunc | grep -iE "secret|key|token|password"

# Inspect runtime container
docker inspect <container> | jq '.[0].Config.Env'
```

Cruza com **03-08 §2.13** (secrets management foundation), **03-08 §2.14** (supply chain — secret leak é vetor), **03-08 §2.20** (SBOM/VEX correlato), **03-02 §2.6** (BuildKit advanced — secret mount é feature dela), **03-03 §2.x** (K8s production patterns).

---

### 2.21 BuildKit cache mounts + multi-arch builds + distroless images deep

Build pipeline em 2026 não é `docker build`: é `docker buildx build` com cache mounts (npm/Go/apt cache fora de layers), multi-arch (amd64+arm64 num único push) e distroless runtime (~5 CVEs vs ~100+ Ubuntu). Esta seção cobre BuildKit features avançadas, multi-arch via Depot.dev/buildx, distroless/Chainguard, SBOM+provenance attestations.

**BuildKit fundamentals** (default em Docker 23+, dockerd 23+, buildx 0.13+):

- **BuildKit** substitui legacy builder; concurrent stage execution + cache/secret/SSH mounts + frontend pluggable.
- **Buildx** = CLI plugin pra BuildKit features (multi-arch, cloud builders, attestations).
- **`# syntax=docker/dockerfile:1.7`** unlock cache/bind/secret/ssh mounts; SEM directive, BuildKit silenciosamente ignora `--mount`.

**Cache mounts — package manager + compilation cache fora de layer**:

```dockerfile
# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund
```

- Cache mount preserva `~/.npm` entre builds; NÃO entra na image final (zero bloat).
- Cold build: ~3min; warm (cache hit): ~30s.
- **Cache id sharing** entre Dockerfiles: `--mount=type=cache,id=npm,target=/root/.npm` — múltiplos services compartilham o mesmo cache.

Pattern Go (mod cache + build cache):

```dockerfile
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go build -o /app/bin/server ./cmd/server
```

Pattern apt (Debian-based base):

```dockerfile
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends curl
```

**Bind mounts — read-only file sem COPY layer**:

```dockerfile
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci
```

Lockfile validation sem custo de layer; útil pra reproducible builds.

**Multi-stage optimized — stages paralelos no BuildKit**:

```dockerfile
# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN --mount=type=cache,target=/app/.next/cache npm run build

FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

FROM gcr.io/distroless/nodejs22-debian12:nonroot AS runtime
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/.next/standalone ./
EXPOSE 3000
USER nonroot
CMD ["server.js"]
```

`deps` e `prod-deps` rodam em paralelo (BuildKit DAG); `build` depende de `deps`; `runtime` recebe só `prod-deps` + standalone output.

**Multi-arch builds (linux/amd64 + linux/arm64)**:

Apple Silicon devs (arm64 local) + AWS Graviton/Ampere prod (arm64, 20-40% cheaper compute) + Cloudflare Workers + Raspberry Pi. Ship single tag, multiple architectures.

```bash
docker buildx create --name multibuilder --driver docker-container --use --bootstrap
docker buildx build --platform linux/amd64,linux/arm64 \
  -t registry.example.com/logistica/api:v3.4 \
  --push .
```

- **QEMU emulation** (default em buildx local): cross-arch via emulação; 5-10x slower; OK pra dev, painful em CI (build 30min+ silently).
- **Native multi-arch** (faster): GitHub Actions `linux/arm64` runners (GA 2024+); Docker Build Cloud (native ARM); Depot.dev (managed cloud builders, native ARM, ~5min full build).
- **Cross-compile via Go** (faster que QEMU pra Go):

```dockerfile
FROM --platform=$BUILDPLATFORM golang:1.23 AS build
ARG TARGETOS TARGETARCH
WORKDIR /src
COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    GOOS=$TARGETOS GOARCH=$TARGETARCH go build -o /out/server ./cmd/server

FROM gcr.io/distroless/static-debian12 AS runtime
COPY --from=build /out/server /
USER nonroot
CMD ["/server"]
```

**Distroless images** (`gcr.io/distroless/*`, Google):

- Variants: `static` (Go static binaries, ~2MB), `base` (glibc apps, ~20MB), `cc` (C++), `java`, `python3`, `nodejs22-debian12` (~150MB), tags `:nonroot` e `:debug`.
- Comparativo size: distroless `static` ~2MB; `nodejs22-debian12` ~150MB; Alpine `node:22-alpine` ~180MB; Ubuntu `node:22` ~1GB.
- **Security wins**:
  - Sem shell → `kubectl exec -it pod -- sh` falha; attacker post-RCE não tem shell pra pivotar.
  - Sem package manager → impossível `apt-get install nmap` post-compromise.
  - CVE surface reduzida (Trivy scan típico): distroless ~5 CVEs vs Alpine ~20 vs Ubuntu ~100+.
- **Debug variants** (`:debug` adiciona busybox shell): só staging; NUNCA prod.

**Chainguard Images** (alternativa 2024+):

- **Wolfi-based** (glibc-compatible Alpine successor); minimal mas com package manager (apk).
- **Daily zero-CVE rebuilds**: signed via cosign, provenance + SBOM included no manifest.
- **Free tier**: latest tags (`cgr.dev/chainguard/node:latest`); **Enterprise**: pinned versions, SLA, FIPS variants.

**SBOM + provenance attestations**:

```bash
docker buildx build \
  --sbom=true --provenance=true \
  --platform linux/amd64,linux/arm64 \
  -t registry.example.com/logistica/api:v3.4 --push .

# Verificação
cosign verify-attestation registry.example.com/logistica/api:v3.4 \
  --type slsaprovenance --certificate-identity-regexp '.*'
```

Gera SBOM (CycloneDX) + provenance (SLSA v1.0) attestations attached ao image manifest. Cruza com **03-08 §2.20** (SBOM lifecycle deep).

**Logística applied stack**:

- **Dockerfile**: 4-stage (base/deps/build/prod-deps/runtime) com BuildKit cache mounts (`/root/.npm` + `.next/cache`); distroless `nodejs22-debian12:nonroot` runtime; ~150MB final image.
- **Multi-arch**: `linux/amd64` + `linux/arm64` build via Depot.dev cloud builder (native ARM, ~5min full); push pra GHCR.
- **Production**: Railway deploy `linux/arm64` (Ampere CPUs ~30% cheaper que x86); CI auto via `docker buildx build --push`.
- **Security gate**: cosign sign + Trivy scan em CI; SBOM + provenance attestations attached e verified em deploy step.
- **Build budget**: ~3min cold (deps from registry) → ~30s warm (cache mounts hit em CI shared cache).

**Anti-patterns observados (10 itens)**:

- `docker build` em vez de `docker buildx build` (perde cache mounts, multi-arch, attestations).
- `RUN apt-get update && apt-get install` sem `--mount=type=cache,target=/var/cache/apt` (re-download em todo build).
- `node_modules` na image final via `COPY .` (bloat 500MB+ quando só ~50MB prod-deps necessário).
- Single-stage Dockerfile em prod (build tools + dev deps shipped pra runtime).
- `FROM node:22` (Debian-based ~1GB) em vez de Alpine ou distroless.
- Multi-arch via QEMU em CI sem timeout configurado (build 30min+ silently, runner timeout = build perdido).
- `COPY . .` no início do Dockerfile (qualquer file change invalida cache de deps).
- Distroless `:debug` em prod (shell habilitado defeats segurança; usar `:nonroot`).
- Dockerfile sem `# syntax=docker/dockerfile:1.7+` directive (cache mounts ignorados silenciosamente — build lento sem warning).
- User `root` em runtime (privilege escalation vector pós-RCE; sempre `:nonroot` ou `USER 1000`).

Cruza com **03-03** (K8s, image registry + imagePullPolicy), **03-04** (CI/CD, buildx em GHA matrix), **03-08 §2.20** (SBOM lifecycle + cosign), **03-05** (AWS, ECR + Graviton ARM nodes), **03-12** (Wasm, alternativa pra ultra-light deploys <10MB).

---

### 2.22 Container ecosystem 2026 — OCI 1.1, Wolfi/Chainguard, SBOM-embedded, Bake, Podman 5

O ecossistema de containers fragmentou pós-layoffs Docker Inc 2023-2024 e re-consolidou em torno do **OCI** como standard de fato. Três specs convergiram em 2024: **OCI image-spec 1.1** (julho 2024 — adiciona `artifactType` no manifest e campo `subject` pra referrers), **OCI distribution-spec 1.1** (Referrers API), **OCI runtime-spec 1.2**. Isso destravou o caso de uso central da supply chain moderna: SBOM + assinatura + provenance vivem como **OCI artifacts** linkados à imagem via `subject`, no mesmo registry, sem out-of-band storage.

Em paralelo, **Wolfi** (undistro Linux do time Chainguard, apk-based, glibc-compatível) emergiu como evolução de distroless. Distroless (Google) ainda é válido pra Java/Go statically-linked, mas perde quando precisa de glibc + native deps (Node native modules, Python wheels com C extensions) — Wolfi resolve. **Chainguard Images** = vendor-curated Wolfi com SLA de zero-CVE-known + variants FIPS. Tamanhos comparados (Node 20 runtime): Wolfi ~80MB, distroless ~140MB, Alpine ~150MB, Ubuntu slim ~400MB.

#### OCI 1.1 — artifact manifest + subject (referrers graph)

OCI 1.1 introduziu `artifactType` no image manifest (descreve payload não-imagem: SBOM, signature, attestation) e `subject` (aponta pra outro manifest). O Referrers API (`GET /v2/<repo>/referrers/<digest>`) retorna todos manifests que apontam pra um digest. Resultado: SBOM + cosign signature + SLSA provenance ficam linkados à imagem como grafo navegável, sem tags paralelas tipo `sha256-abc.sig` (que era o workaround pré-1.1).

```json
{
  "schemaVersion": 2,
  "mediaType": "application/vnd.oci.image.manifest.v1+json",
  "artifactType": "application/spdx+json",
  "config": { "mediaType": "application/vnd.oci.empty.v1+json", "size": 2, "digest": "sha256:44136fa..." },
  "layers": [{ "mediaType": "application/spdx+json", "digest": "sha256:<sbom-blob>", "size": 12345 }],
  "subject": {
    "mediaType": "application/vnd.oci.image.manifest.v1+json",
    "digest": "sha256:<image-digest>"
  }
}
```

#### Wolfi-based Dockerfile (Chainguard)

```dockerfile
# build stage — Wolfi com toolchain
FROM cgr.dev/chainguard/node:latest-dev@sha256:<digest> AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev
COPY . .
RUN npm run build

# runtime — Wolfi minimal, sem shell, non-root por default
FROM cgr.dev/chainguard/node:latest@sha256:<digest>
WORKDIR /app
COPY --from=build --chown=nonroot:nonroot /app/dist ./dist
COPY --from=build --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=build --chown=nonroot:nonroot /app/package.json ./
USER nonroot
EXPOSE 3000
ENTRYPOINT ["node", "dist/server.js"]
```

Pin por digest (`@sha256:...`) é obrigatório em prod — `:latest` viola reproducibility. Wolfi rebuilda diariamente, então o digest muda; trate como dependency e renove via Renovate/Dependabot.

#### apko + melange — declarative image build (sem Dockerfile)

`apko` builda OCI images de YAML declarativo, reproducible (mesmo input → mesmo digest binário), sem Dockerfile imperativo. `melange` builda APKs do source de forma equivalente. Combinação: `melange build` gera o pacote, `apko build` monta a imagem.

```yaml
# apko.yaml — image declarativo
contents:
  repositories:
    - https://packages.wolfi.dev/os
  keyring:
    - https://packages.wolfi.dev/os/wolfi-signing.rsa.pub
  packages:
    - ca-certificates-bundle
    - nodejs-20
    - npm
    - tini

accounts:
  groups:
    - groupname: nonroot
      gid: 65532
  users:
    - username: nonroot
      uid: 65532
      gid: 65532
  run-as: 65532

entrypoint:
  command: /usr/bin/tini -- /usr/bin/node /app/dist/server.js

archs:
  - x86_64
  - aarch64
```

`apko build apko.yaml app:latest app.tar` → imagem reproducible, OCI-compliant, multi-arch, com SBOM SPDX embedado por default.

#### SBOM-embedded + cosign attest + verify

Pipeline canônico: build → Syft gera SBOM → cosign sign image (keyless OIDC) → cosign attest SBOM (linka como referrer OCI 1.1).

```bash
# build + push com provenance + SBOM nativos
docker buildx build --platform linux/amd64,linux/arm64 \
  --provenance=true --sbom=true \
  -t ghcr.io/org/app:${SHA} --push .

# Syft fora do build (ou usa o SBOM auto-embedado pelo BuildKit)
syft ghcr.io/org/app:${SHA} -o spdx-json > sbom.spdx.json

# cosign sign (keyless via Fulcio + GitHub OIDC; sem key management)
COSIGN_EXPERIMENTAL=1 cosign sign ghcr.io/org/app:${SHA}

# attest SBOM (vira referrer OCI 1.1, navegável via Referrers API)
COSIGN_EXPERIMENTAL=1 cosign attest --predicate sbom.spdx.json \
  --type spdx ghcr.io/org/app:${SHA}

# verify em admission controller (Kyverno/Cosign policy controller)
cosign verify ghcr.io/org/app:${SHA} \
  --certificate-identity-regexp 'https://github\.com/org/.+' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

Keyless via Fulcio (sigstore) elimina key management — assinatura é amarrada à identidade OIDC do runner CI (GitHub Actions, GitLab, Buildkite). Sem KMS, sem rotação manual, sem chaves longplayed pra vazar.

#### SLSA v1.0 build provenance

SLSA v1.0 (stable Q4 2023) define níveis de garantia da supply chain. Provenance attestation (in-toto) linka **binary → source commit → builder identity**. BuildKit gera nativamente via `--provenance=true` (modo `max` inclui materials completos).

```bash
# inspect provenance
cosign verify-attestation ghcr.io/org/app:${SHA} \
  --type slsaprovenance \
  --certificate-identity-regexp '...' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  | jq '.payload | @base64d | fromjson | .predicate'
```

Verificação em prod: admission controller (Kyverno, OPA Gatekeeper, Cosign policy-controller) bloqueia pods cujas imagens não tenham provenance assinada por builder confiável.

#### Container scanning em CI — Trivy default, Grype alternativo

**Trivy 0.55+** (Aqua, OSS) scanneia image + filesystem + IaC + K8s manifests + secrets, db atualizada de NVD + GHSA + vendor advisories. **Grype** (Anchore) é alternativa, integra bem com Syft (mesmo time). **Docker Scout** integrou ao Docker Desktop em 2024 — útil pra dev local, menos relevante em CI.

```yaml
# .github/workflows/scan.yml
- name: Trivy image scan
  uses: aquasecurity/trivy-action@0.28.0
  with:
    image-ref: ghcr.io/org/app:${{ github.sha }}
    format: sarif
    output: trivy.sarif
    severity: CRITICAL,HIGH
    exit-code: 1            # fail CI se HIGH/CRITICAL
    ignore-unfixed: true    # ignora CVE sem patch upstream
    vuln-type: os,library

- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: trivy.sarif
```

Cruza com VEX (Vulnerability Exploitability eXchange) — declarar CVE como `not_affected` quando não-explorável no contexto, sem suprimir alerta global. Trivy lê VEX OpenVEX format desde 0.50.

#### Docker Buildx Bake — matrix multi-arch via HCL

Bake (estável desde 2023) é o substituto moderno de `docker-compose build` pra pipelines complexos: matrix de targets, cache export pra registry, multi-arch. HCL > YAML pra lógica condicional + variables.

```hcl
# docker-bake.hcl
variable "TAG" { default = "dev" }
variable "REGISTRY" { default = "ghcr.io/org" }

group "default" {
  targets = ["api", "worker"]
}

target "_common" {
  platforms  = ["linux/amd64", "linux/arm64"]
  cache-from = ["type=registry,ref=${REGISTRY}/cache:buildcache"]
  cache-to   = ["type=registry,ref=${REGISTRY}/cache:buildcache,mode=max"]
  attest = [
    "type=provenance,mode=max",
    "type=sbom"
  ]
}

target "api" {
  inherits   = ["_common"]
  context    = "./apps/api"
  dockerfile = "Dockerfile"
  tags       = ["${REGISTRY}/api:${TAG}"]
  args       = { NODE_ENV = "production" }
}

target "worker" {
  inherits   = ["_common"]
  context    = "./apps/worker"
  dockerfile = "Dockerfile"
  tags       = ["${REGISTRY}/worker:${TAG}"]
}
```

`docker buildx bake --push` builda os dois targets em paralelo, cada um amd64+arm64, com SBOM + provenance attestation, cache compartilhado. Cross-compile via frontend `tonistiigi/xx` quando precisa Go/Rust ARM em runner amd64.

#### Podman 5 — alternativa rootless, daemonless

**Podman 5.x** (Q1 2024) trouxe volume + secret handling reescritos, melhor compat com Docker API, suporte nativo a K8s YAML (`podman play kube`). Vantagens: daemonless (cada container = processo do user, sem privileged daemon), rootless por default, integra com systemd via `quadlet` (units `.container` declarativas). Trade-off: networking rootless via slirp4netns/pasta tem ~10-20% overhead vs bridge nativa; build via buildah (não BuildKit nativo) — features avançadas (cache mounts, secret mounts) ficaram pra trás até 2025.

```bash
# rootless run, sem daemon
podman run --rm -p 8080:80 cgr.dev/chainguard/nginx:latest

# K8s YAML direto (pod ou deployment)
podman play kube ./deploy/pod.yaml

# quadlet (systemd unit declarativa)
cat > ~/.config/containers/systemd/api.container <<EOF
[Container]
Image=ghcr.io/org/api:v1.2.3
PublishPort=3000:3000
[Service]
Restart=always
[Install]
WantedBy=default.target
EOF
systemctl --user daemon-reload && systemctl --user start api
```

Coexistência Podman + Docker no mesmo host gera conflitos de rede (CNI vs bridge docker0) — escolha um por host.

#### Stack Logística aplicada

Base: Wolfi Node 20 (`cgr.dev/chainguard/node:latest-dev` build, `:latest` runtime, ambos pinned por digest, renovados via Renovate weekly). Build: `docker buildx bake` com matrix `[api, worker, scheduler] × [amd64, arm64]`, cache export to GHCR, `--provenance=max --sbom=true`. CI: Trivy scan post-build, fail on HIGH/CRITICAL non-ignored, SARIF upload pro Security tab. Sign: cosign keyless via GitHub OIDC, attest SBOM (Syft-generated SPDX) + SLSA provenance como referrers OCI 1.1. Deploy: K8s admission via Kyverno verifica cosign signature + provenance issuer = `token.actions.githubusercontent.com` + repo regexp = `org/.+`. Resultado: imagem ~80MB, zero CVE HIGH known na build, supply chain auditável end-to-end.

#### 10 anti-patterns do ecosystem

1. SBOM gerada mas não attestada como OCI referrer — fica em S3/artifact, não-verificável em runtime.
2. cosign com chave estática (KMS) ao invés de keyless OIDC — re-introduz key management que sigstore eliminou.
3. Trivy scan local mas não em CI gate — regressões merged silenciosamente.
4. distroless quando app precisa glibc + native deps (sharp, bcrypt, node-canvas) — Wolfi resolve sem Alpine musl quirks.
5. Wolfi `cgr.dev/chainguard/node:latest` em prod sem digest pin — rebuild diário muda imagem, quebra reproducibility.
6. Buildx sem `cache-from`/`cache-to` em registry — CI cold every run, build de 5min vira 30s+ com cache quente.
7. Podman + Docker simultâneos no mesmo host — conflitos CNI vs docker0, troubleshooting hostil.
8. apko sem `SOURCE_DATE_EPOCH` ou base sem timestamp pinned — drift entre builds, "reproducible" só no nome.
9. Provenance gerada mas admission controller não verifica — defesa em profundidade fica em zero camadas.
10. SLSA L3 claimed sem builder hardening (runner GitHub Actions default não é L3 — falta isolation + ephemeral identity sólida) — claim sem evidência.

#### Cruza com

§2.5 (distroless intro — Wolfi é evolução natural), §2.6 (BuildKit foundation — Bake é frontend dele), §2.21 (BuildKit cache mounts + multi-arch), §2.20 (Docker secrets — cosign keyless é mesma família de "no long-lived creds"), **03-08 §2.14** (supply chain security policies), **03-08 §2.20** (SBOM lifecycle + VEX), **03-04** (CI gate scanning + matrix bake), **03-03** (K8s admission controllers — Kyverno verifica cosign attestations), **04-08 §2.22** (edge runtimes — alternativa quando overhead de container é demais).

---

## 3. Threshold de Maestria

Você precisa, sem consultar:

- Diferenciar namespaces e cgroups e dizer o que cada um faz.
- Explicar layer caching e ordenar Dockerfile pra minimizar invalidação.
- Justificar multi-stage build com 1 caso real.
- Distinguir Alpine, slim, distroless com pros/contras de cada.
- Explicar o que muda com BuildKit habilitado.
- Discriminar bind mount, named volume e tmpfs.
- Listar 5 medidas de hardening pra container em prod.
- Explicar PID 1 problem e quando precisa de `tini`.
- Argumentar `latest` vs SHA-pinning.
- Estratégia pra reduzir Next.js image de 1 GB pra ≤ 200 MB.

---

## 4. Desafio de Engenharia

Containerizar **Logística v1** (apprentice) com produção em mente.

### Especificação

1. **Backend**:
   - Multi-stage Dockerfile (deps → builder → runner).
   - Base `node:22-bookworm-slim`.
   - Final image ≤ 250 MB.
   - User non-root.
   - Health endpoint exposto.
   - Cache mount BuildKit pra pnpm store.
2. **Front lojista (Next)**:
   - `output: 'standalone'`.
   - Multi-stage com final image ≤ 200 MB.
3. **Compose pra dev**:
   - Serviços: postgres, redis, api, web.
   - Healthchecks em postgres e redis.
   - `api` espera saudável.
   - Bind mounts pra código (hot reload).
   - Volumes pra `pgdata` e `redisdata`.
   - `.env.example` documentando vars.
4. **Compose pra integration tests**:
   - Override file (`docker-compose.test.yml`) com profile separado.
   - Stage `target: builder` em vez de runner.
5. **Hardening**:
   - `USER` non-root em todas imagens.
   - `--read-only` no runtime quando viável (com tmpfs em `/tmp`).
   - `cap_drop: [ALL]`.
   - `security_opt: [no-new-privileges:true]`.
6. **Image scanning**:
   - Rodar `trivy image` ou `docker scout cves` em ambas imagens.
   - Documentar CVEs encontradas e mitigação (upgrade base, package).
7. **Build optimization**:
   - `.dockerignore` completo.
   - Comparar tempo de build "do zero" vs "com cache" vs "só código mudou".
   - Documentar o ganho.
8. **Sinal**:
   - App responde a `SIGTERM` corretamente. `docker stop` graceful.
   - Demonstre com log.

### Restrições

- Sem `FROM node:22` (sem tag específica de OS).
- Sem `RUN apt-get install` sem cleanup na mesma layer.
- Sem `COPY . .` sem `.dockerignore`.
- Sem `latest` tag em produção.

### Threshold

- README documenta:
  - Tamanho final de cada imagem (com `docker images`).
  - Comando do build com BuildKit features usadas.
  - Explicação do hardening aplicado.
  - Output do scanner com triagem das findings.
  - Comparação build cache hit vs miss.
  - Comando para rodar tudo localmente em uma linha.

### Stretch

- Sign images com cosign + verify em pull.
- Distroless Node pra backend (sem shell, debug com `kubectl debug` ou ephemeral container).
- SBOM (Software Bill of Materials) gerado com syft.
- Comparar build com `docker buildx` cross-platform (linux/amd64 + linux/arm64).
- Reduzir front Next pra < 100 MB com tree-shaking + apenas o necessário.

---

## 5. Extensões e Conexões

- Liga com **01-02** (OS): namespaces, cgroups, processes, signals.
- Liga com **01-10** (CLI): docker como CLI; shell scripts pra build/run.
- Liga com **02-05** (Next): standalone output.
- Liga com **02-07** (Node): PID 1, SIGTERM handling, graceful shutdown.
- Liga com **03-03** (K8s): mesma image roda em pods.
- Liga com **03-04** (CI/CD): build em CI, push pra registry.
- Liga com **03-05** (AWS): ECR, ECS, EKS, App Runner consumir images.
- Liga com **03-08** (security): scanning, hardening, supply chain.
- Liga com **03-10** (perf backend): image size = cold start em serverless.

---

## 6. Referências

- **Docker docs** ([docs.docker.com](https://docs.docker.com/)), leia "Build best practices", "Compose specification".
- **Dockerfile reference** ([docs.docker.com/reference/dockerfile](https://docs.docker.com/reference/dockerfile/)).
- **Adrian Mouat, "Using Docker"** (livro O'Reilly).
- **Liz Rice, "Container Security"**: internals, hardening.
- **BuildKit docs** ([docs.docker.com/build/buildkit](https://docs.docker.com/build/buildkit/)).
- **Distroless** ([github.com/GoogleContainerTools/distroless](https://github.com/GoogleContainerTools/distroless)).
- **Trivy** ([trivy.dev](https://trivy.dev/)) e **Docker Scout** docs.
- **CIS Docker Benchmark**: checklist de hardening.
- **OCI specs** ([opencontainers.org](https://opencontainers.org/)), image spec, runtime spec.
