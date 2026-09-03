# Build context MUST be the monorepo root: docker build -f apps/admin/Dockerfile .

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# 1. Prune the workspace down to what "admin" actually needs
FROM base AS pruner
RUN npm install -g turbo@^2.0.0
COPY . .
RUN turbo prune admin --docker

# 2. Install deps + build using only the pruned subset (better layer caching)
FROM base AS installer
RUN npm install -g pnpm@9.0.0
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install

COPY --from=pruner /app/out/full/ .
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
RUN pnpm --filter @theo/database exec prisma generate
RUN pnpm turbo run build --filter=admin

# 3. Minimal runtime image (Next.js standalone output)
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nextjs && adduser --system --uid 1001 nextjs

COPY --from=installer --chown=nextjs:nextjs /app/apps/admin/.next/standalone ./
COPY --from=installer --chown=nextjs:nextjs /app/apps/admin/.next/static ./apps/admin/.next/static

USER nextjs
EXPOSE 3001
ENV PORT=3001
CMD ["node", "apps/admin/server.js"]
