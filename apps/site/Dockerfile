# syntax=docker/dockerfile:1.6
# Builds Next.js standalone, copies framework/* + root .md files for content.
# Build context expected: repo root (FATHOM/), Railway should set Root Directory = "" (repo root)
# and Dockerfile path = "apps/site/Dockerfile".

FROM node:26-alpine@sha256:e71ac5e964b9201072425d59d2e876359efa25dc96bb1768cb73295728d6e4ea AS deps
WORKDIR /app
COPY apps/site/package.json apps/site/package-lock.json* ./
RUN npm ci --no-audit --no-fund --ignore-scripts

FROM node:26-alpine@sha256:e71ac5e964b9201072425d59d2e876359efa25dc96bb1768cb73295728d6e4ea AS builder
WORKDIR /app

# Copy site sources
COPY apps/site ./apps/site
# Copy content (framework/ + root .md files needed at build time)
COPY framework ./framework
COPY scripts ./scripts
COPY README.md MENTOR.md PROGRESS.md STUDY-PROTOCOL.md ./

# Reuse installed deps
COPY --from=deps /app/node_modules ./apps/site/node_modules

WORKDIR /app/apps/site
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:26-alpine@sha256:e71ac5e964b9201072425d59d2e876359efa25dc96bb1768cb73295728d6e4ea AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Standalone output already includes node_modules + server.js
COPY --from=builder --chown=nextjs:nodejs /app/apps/site/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/site/.next/static ./apps/site/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/site/public ./apps/site/public

# Copy framework + root .md so runtime fs reads still work (parent paths)
COPY --from=builder --chown=nextjs:nodejs /app/framework ./framework
COPY --from=builder --chown=nextjs:nodejs /app/README.md /app/MENTOR.md /app/PROGRESS.md /app/STUDY-PROTOCOL.md ./

USER nextjs
EXPOSE 3000

WORKDIR /app/apps/site
CMD ["node", "server.js"]
