# Build context MUST be the monorepo root: docker build -f apps/backend/Dockerfile .

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# 1. Prune the workspace down to what "backend" actually needs
FROM base AS pruner
RUN npm install -g turbo@^2.0.0
COPY . .
RUN turbo prune backend --docker

# 2. Install deps + build using only the pruned subset (better layer caching)
FROM base AS installer
RUN npm install -g pnpm@9.0.0
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install

COPY --from=pruner /app/out/full/ .
RUN pnpm --filter @theo/database exec prisma generate
RUN pnpm turbo run build --filter=backend

# 3. Minimal runtime image
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nestjs && adduser --system --uid 1001 nestjs

COPY --from=installer /app/apps/backend/dist ./apps/backend/dist
COPY --from=installer /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=installer /app/packages ./packages
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/apps/backend/node_modules ./apps/backend/node_modules

USER nestjs
EXPOSE 4000
ENV PORT=4000
CMD ["node", "apps/backend/dist/main.js"]

# 4. DB init image: runs `prisma db push` + idempotent seed against the target DB.
# Used by compose as a one-off init service before the backend starts.
FROM installer AS db-init
ENV NODE_ENV=production
CMD ["sh", "-c", "pnpm --filter @theo/database exec prisma db push --skip-generate && pnpm --filter @theo/database exec prisma db seed"]
