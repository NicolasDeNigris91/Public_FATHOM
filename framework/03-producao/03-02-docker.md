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
