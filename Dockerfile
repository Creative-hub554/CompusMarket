# This is a reference Dockerfile at monorepo root.
# Individual apps are built with app-specific Dockerfiles:
#   - apps/backend/Dockerfile
#   - apps/frontend/Dockerfile
#   - apps/admin/Dockerfile
#
# Usage:
#   docker compose build    # builds all apps using app-specific Dockerfiles
#
# For manual builds:
#   docker build -f apps/backend/Dockerfile -t backend:latest .
#   docker build -f apps/frontend/Dockerfile -t frontend:latest .
#   docker build -f apps/admin/Dockerfile -t admin:latest .

# This file is kept for reference but apps are built via compose.yaml
# which references the app-specific Dockerfiles above.

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Prune workspace
FROM base AS pruner
RUN npm install -g turbo@^2.0.0
COPY . .
RUN turbo prune --docker

# Install and build
FROM base AS installer
RUN npm install -g pnpm@9.0.0
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo build

# Runtime
FROM base AS runner
ENV NODE_ENV=production
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app .
EXPOSE 3000
CMD ["pnpm", "dev"]
