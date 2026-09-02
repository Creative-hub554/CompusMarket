# Docker Quick Commands

## Start/Stop

```bash
# Start all services (build if needed)
docker compose up -d --build

# Stop all services
docker compose down

# View running services
docker compose ps

# View logs
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend
```

## Build

```bash
# Build all images
docker compose build

# Build specific service
docker compose build backend
docker compose build frontend
docker compose build admin

# Build without cache
docker compose build --no-cache

# Validate compose file
docker compose config --quiet
```

## Database

```bash
# Run migrations
docker compose exec backend pnpm db:migrate

# Reset database (⚠️ deletes data)
docker compose exec backend pnpm db:reset

# Access database shell
docker compose exec postgres psql -U theo -d theo_platform
```

## Testing

```bash
# Run tests
docker compose exec backend pnpm test
docker compose exec frontend pnpm test

# Run linting
docker compose exec backend pnpm lint
docker compose exec frontend pnpm lint

# Type check
docker compose exec backend pnpm typecheck
```

## Debugging

```bash
# Enter container shell
docker compose exec backend sh
docker compose exec frontend sh

# Check service health
docker compose ps
docker inspect champey-backend

# View container details
docker compose logs backend --tail=100
```

## Cleanup

```bash
# Stop and remove containers only
docker compose down

# Stop and remove containers + volumes (⚠️ deletes data)
docker compose down -v

# Remove all containers, images, volumes
docker compose down -v --rmi all
```

## Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your values
# Change: POSTGRES_PASSWORD, REDIS_PASSWORD, secrets, API keys
```

## Ports

| Service       | Port | URL                        |
|---------------|------|----------------------------|
| Frontend      | 3000 | http://localhost:3000      |
| Admin         | 3001 | http://localhost:3001      |
| Backend       | 4000 | http://localhost:4000      |
| MinIO Console | 9001 | http://localhost:9001      |
| Postgres      | 5432 | localhost:5432             |
| Redis         | 6379 | localhost:6379             |
| Meilisearch   | 7700 | http://localhost:7700      |

## First Time Setup

```bash
# 1. Copy env file
cp .env.example .env

# 2. Edit .env (change passwords, secrets, keys)
code .env

# 3. Build all images
docker compose build

# 4. Start all services
docker compose up -d

# 5. Wait for backend to be healthy (10-30 seconds)
docker compose ps

# 6. Run migrations (if needed)
docker compose exec backend pnpm db:migrate

# 7. Access frontend
open http://localhost:3000

# 8. Access admin (with seed credentials from .env)
open http://localhost:3001

# 9. View logs if issues
docker compose logs backend
```

## Troubleshooting

```bash
# Service not starting?
docker compose logs <service_name>

# Port already in use?
# Edit compose.yaml to change port

# No database?
docker compose exec postgres psql -U theo -d theo_platform -c "SELECT 1"

# Cache issues?
docker compose build --no-cache

# Start fresh
docker compose down -v
docker compose build
docker compose up -d
```
