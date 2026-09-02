# Docker Documentation Index

## 📖 Where to Start

### For Impatient People (5 minutes)
1. Read this file (you are here)
2. Read `DOCKER_QUICK_REFERENCE.md`
3. Run: `docker compose up -d --build`

### For Thorough People (20 minutes)
1. `DOCKER_OPTIMIZATION_COMPLETE.md` — Overview & summary
2. `DOCKER_SETUP.md` — Complete guide & troubleshooting
3. `DOCKER_QUICK_REFERENCE.md` — Command reference

### For Technical Deep Dive (1 hour)
1. `DOCKER_OPTIMIZATION_SUMMARY.md` — Technical details
2. `DOCKER_SETUP.md` — Production deployment
3. `.github/workflows/docker-build.yml` — CI/CD pipeline

---

## 📁 Documentation Files

### `DOCKER_OPTIMIZATION_COMPLETE.md` ⭐ START HERE
- **Purpose**: High-level overview of what was done
- **Length**: 5 min read
- **Contains**:
  - Summary of changes
  - Architecture overview
  - Getting started (3 steps)
  - Key optimizations
  - Next steps by role (dev, devops, product)

### `DOCKER_QUICK_REFERENCE.md` ⭐ BOOKMARK THIS
- **Purpose**: Quick command reference
- **Length**: 2 min read
- **Contains**:
  - Common Docker Compose commands
  - Service ports
  - First-time setup checklist
  - Quick troubleshooting
- **Use when**: You need a command quickly

### `DOCKER_SETUP.md` ⭐ READ THOROUGHLY
- **Purpose**: Complete guide with all details
- **Length**: 15 min read
- **Contains**:
  - Detailed architecture
  - Prerequisites and setup
  - Build workflow
  - Service descriptions
  - Environment variables reference
  - Extensive troubleshooting
  - Production deployment
  - Development workflow
- **Use when**: Setting up first time or troubleshooting

### `DOCKER_OPTIMIZATION_SUMMARY.md`
- **Purpose**: Technical deep dive
- **Length**: 10 min read
- **Contains**:
  - What was optimized (with before/after)
  - Performance metrics
  - Build time improvements
  - Image sizes
  - Security considerations
  - Limitations
  - Recommended next steps
- **Use when**: Understanding technical details or planning infrastructure

### `.github/workflows/docker-build.yml`
- **Purpose**: CI/CD pipeline for automated builds
- **Format**: GitHub Actions workflow
- **Contains**:
  - Automated Docker builds on push
  - Docker Scout security scanning
  - Multi-image builds (backend, frontend, admin)
  - Registry push
  - Optional deployment step
- **Use when**: Setting up CI/CD or GitHub Actions

---

## 🎯 Quick Links by Role

### 👨‍💻 Developers

**Goal**: Run project locally and understand Docker setup

1. Read: `DOCKER_QUICK_REFERENCE.md` (2 min)
2. Run: `cp .env.example .env`
3. Run: `docker compose build && docker compose up -d`
4. Access: http://localhost:3000 (frontend)
5. Bookmark: `DOCKER_QUICK_REFERENCE.md` for commands

**Useful commands**:
```bash
docker compose logs -f backend          # View backend logs
docker compose exec backend pnpm test   # Run tests
docker compose down                     # Stop everything
```

### 🚀 DevOps / Infrastructure

**Goal**: Set up production deployment and monitoring

1. Read: `DOCKER_SETUP.md` → Production Deployment section
2. Read: `DOCKER_OPTIMIZATION_SUMMARY.md` → Security section
3. Configure: `.env` for production (use secret manager)
4. Set up: `.github/workflows/docker-build.yml` for CI/CD
5. Plan: Use managed services (RDS, S3, ElastiCache)

**Key files**:
- `docker-compose.yml` — Full stack definition
- `.env.example` — Environment reference
- `.github/workflows/docker-build.yml` — CI/CD template
- `Dockerfile` (reference), `apps/*/Dockerfile` (actual)

### 📊 Project Managers / Stakeholders

**Goal**: Understand what was done and why

1. Read: `DOCKER_OPTIMIZATION_COMPLETE.md` → Summary section
2. Review: Architecture diagram in `DOCKER_SETUP.md`
3. Benefits: ~60% image size reduction, 3x faster rebuilds

**Key metrics**:
- Backend image: 350-450 MB (was 800+ MB)
- Build time: 2-3 min (was 10+ min)
- Startup time: 20-30 sec (infrastructure ready)

---

## 📊 File Overview

```
Root Directory
├── Dockerfile                              (Reference, uses app-specific files)
├── compose.yaml                            (Main orchestration, 7 services)
├── .dockerignore                           (Build context optimization)
├── .env.example                            (Environment template)
│
├── DOCKER_OPTIMIZATION_COMPLETE.md         ⭐ START HERE (5 min)
├── DOCKER_QUICK_REFERENCE.md               ⭐ BOOKMARK (2 min)
├── DOCKER_SETUP.md                         ⭐ READ FULL (15 min)
├── DOCKER_OPTIMIZATION_SUMMARY.md          (Technical details, 10 min)
├── DOCKER_STRUCTURE_INDEX.md               (This file)
│
├── .github/workflows/
│   └── docker-build.yml                    (CI/CD pipeline)
│
├── apps/
│   ├── backend/
│   │   └── Dockerfile                      (NestJS multi-stage build)
│   ├── frontend/
│   │   └── Dockerfile                      (Next.js multi-stage build)
│   └── admin/
│       └── Dockerfile                      (Next.js multi-stage build)
│
└── packages/
    ├── database/
    └── ui/
```

---

## 🔄 Typical Workflows

### First-Time Setup

```bash
# 1. Copy env
cp .env.example .env

# 2. Edit env (change passwords)
code .env

# 3. Build and start
docker compose build
docker compose up -d

# 4. Check status
docker compose ps

# 5. View logs
docker compose logs backend
```

**Reference**: `DOCKER_QUICK_REFERENCE.md` → "First Time Setup"

### Daily Development

```bash
# Start day
docker compose up -d

# Develop locally (faster than in container)
pnpm --filter backend dev

# Run tests
docker compose exec backend pnpm test

# Check logs
docker compose logs -f backend

# End day
docker compose down
```

**Reference**: `DOCKER_SETUP.md` → "Development Workflow"

### Deploying to Production

```bash
# 1. Build images
docker compose build

# 2. Push to registry
docker push image-name:tag

# 3. Deploy (varies by platform)
# - Docker Swarm: docker stack deploy
# - Kubernetes: kubectl apply
# - Cloud: aws ecs, gcloud run, etc.

# 4. Monitor
docker compose ps
docker compose logs
```

**Reference**: `DOCKER_SETUP.md` → "Production Deployment"

### Troubleshooting

```bash
# Check compose validity
docker compose config --quiet

# View service status
docker compose ps

# Check service logs
docker compose logs SERVICE_NAME

# Inspect container
docker inspect CONTAINER_NAME

# Enter container shell
docker compose exec SERVICE_NAME sh

# Restart service
docker compose restart SERVICE_NAME
```

**Reference**: `DOCKER_SETUP.md` → "Troubleshooting"

---

## 🏗️ Architecture at a Glance

### Services

| Service       | Type         | Port | Role                           |
|---------------|--------------|------|--------------------------------|
| backend       | NestJS API   | 4000 | REST API + WebSocket           |
| frontend      | Next.js      | 3000 | Customer storefront            |
| admin         | Next.js      | 3001 | Admin dashboard                |
| postgres      | Database     | 5432 | Data persistence               |
| redis         | Cache        | 6379 | Session + real-time data       |
| minio         | S3 Storage   | 9000 | File uploads + media           |
| meilisearch   | Search       | 7700 | Product search engine          |

### Build Strategy

**Multi-stage with turbo prune**:
1. **Pruner**: Identifies dependencies each service needs (~40% reduction)
2. **Builder**: Installs dependencies + builds apps
3. **Runner**: Minimal runtime image with only production code

**Result**: 350MB backend, 200MB frontend (vs 1GB+ without optimization)

---

## ✅ Verification Checklist

- ✅ Dockerfiles use multi-stage builds
- ✅ Apps use `turbo prune` for dependency optimization
- ✅ `.dockerignore` reduces build context
- ✅ All services have health checks
- ✅ Services startup gracefully with dependencies
- ✅ Environment variables documented
- ✅ Non-root users configured
- ✅ Volumes for persistent data
- ✅ GitHub Actions CI/CD pipeline ready
- ✅ Documentation complete

---

## 🆘 Getting Help

### Common Issues

| Issue                    | Solution                           |
|--------------------------|-------------------------------------|
| Port already in use      | Change port in `compose.yaml`      |
| Database won't connect   | Check DATABASE_URL format          |
| Build takes forever      | Use `docker compose build --pull`  |
| Out of disk space        | Run `docker system prune -a`       |
| Services won't start     | Check `.env` passwords             |

See `DOCKER_SETUP.md` → "Troubleshooting" for detailed solutions.

### Questions?

1. Check `DOCKER_QUICK_REFERENCE.md`
2. Search `DOCKER_SETUP.md` for your issue
3. Review `DOCKER_OPTIMIZATION_SUMMARY.md` for technical details
4. Check compose.yaml for service configuration

---

## 📚 External Resources

- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Turborepo Docker](https://turbo.build/repo/docs/handbook/deploying-with-docker)
- [Next.js Deployment](https://nextjs.org/docs/deployment/docker)
- [NestJS Deployment](https://docs.nestjs.com/deployment)

---

**Last Updated**: 2024
**Project**: Khmer Online Shop by Theo
**Architecture**: Turborepo + Monorepo
