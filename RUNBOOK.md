# Operations Runbooks

Quick reference guides for diagnosing and resolving common production issues.
Each runbook includes symptoms, diagnosis steps, resolution, and escalation criteria.

**Time to resolution targets:**
- P0 (Critical): 15 min diagnosis + 30 min resolution = 45 min total
- P1 (High): 30 min diagnosis + 1 hour resolution = 1.5 hours total
- P2 (Medium): Resolve within 4 business hours

---

## 0. Local Stack Not Accessible (dev machine)

**Symptoms:** storefront/admin/backend unreachable on localhost; "chompei cannot access".

**Canonical path (memorize this):** everything runs from `C:\Workspace\www.champey.com\start.bat`
(stack / dev / status / check / stop). Secrets in one file: `docker/.env`. Ports: storefront **3000**,
admin **3001**, backend **4000**, infra on 127.0.0.1 (5432/6379/7700/9000), monitoring:
Grafana **3002**, Prometheus **9090**, stack-health feed **9701**.

### Diagnosis (3 min)

```bat
cd C:\Workspace\www.champey.com
start.bat check    REM full health check + AUTO-REPAIR of known failure modes
start.bat status   REM passive status only
```

`start.bat check` (= `node scripts/health-check.mjs`) verifies the engine, all
services, postgres SCRAM auth against docker/.env, container env freshness,
healthchecks, HTTP endpoints and host env drift — and repairs known failure
modes automatically (stopped services, password drift via trusted-socket ALTER,
stale container env, unhealthy containers, env-file drift). Use
`node scripts/health-check.mjs --no-fix` for a report-only pass. Anything it
cannot fix is printed as `[FAIL]` and exits 1.

**Before risky operations** (VM reset, Docker Desktop reinstall, compose down
with volume removal, restore drills): take a snapshot first —
`start.bat backup` writes `output/backups/<YYYY-MM-DD>/` (postgres dump.gz,
meilisearch dump, minio tar.gz + manifest; `--retention-days N` overrides the
7-day default; `--only postgres|meilisearch|minio` for one store). Restore
pointers (the postgres one-liner below was **drill-verified 2026-09-10**: 62/62
objects and per-table row counts identical to the source, stderr clean):

```bash
# Drill first — restore into a THROWAWAY db, compare counts, then drop it:
docker exec champey-postgres-1 psql -U theo -d postgres \
  -c "CREATE DATABASE champey_restore_drill;"
zcat output/backups/<date>/postgres-<HHmmss>.dump.gz | \
  docker exec -i champey-postgres-1 pg_restore -U theo -d champey_restore_drill \
  --no-owner --no-privileges -x
# compare, then: docker exec champey-postgres-1 psql -U theo -d postgres \
#   -c "DROP DATABASE champey_restore_drill;"

# Real restore — same command, but create the db FRESH first (-c cleans+
# recreates objects the dump contains; do NOT point it at a live db):
docker exec champey-postgres-1 psql -U theo -d postgres -c "CREATE DATABASE theo_platform;"
zcat output/backups/<date>/postgres-<HHmmss>.dump.gz | \
  docker exec -i champey-postgres-1 pg_restore -U theo -d theo_platform \
  --no-owner --no-privileges -x
```

meilisearch: upload the dump per Meilisearch docs, minio: extract into the bucket.

**Daily automation:** a Task Scheduler job `champey-health-check` runs
`scripts/scheduled-health-check.bat` every morning at 08:00 (logs to
`output/health-check-YYYY-MM-DD.log`, last exit code in
`output/health-check-last-exit.txt`). Manage it with:

```bat
schtasks /Query /TN champey-health-check /V /FO LIST   REM inspect
schtasks /Run   /TN champey-health-check               REM run now
schtasks /Delete /TN champey-health-check /F           REM remove
```

- Container `Exited` → `docker logs champey-<service>-1 --tail 50`
- `docker compose ps` shows nothing → stack not started → `start.bat stack`
- HTTP 000 on a port → Docker Desktop port-proxy wedged → restart Docker Desktop
  (NEVER kill `com.docker.backend.exe` / `wslrelay.exe` individually — that wedges
  more ports; kill `Docker Desktop.exe` itself, then relaunch it)
- P1000 (postgres auth failed) → `docker/.env` password vs data volume drift →
  see `SECURITY.md` rotation log + `docker/rotate-db-password.mjs`
- `port is already allocated` on 3000 → check for zombie Docker Desktop Kubernetes
  mirrors first (`kubectl get svc -A`, delete `*-published` services); see
  `compose.override.yaml` header (fixed 2026-09-09; storefront is back on 3000)

### Monitoring (local)

`start.bat stack` brings up the `monitoring` profile: Prometheus (9090), Grafana
(3002, login `admin` / `GRAFANA_ADMIN_PASSWORD` from `docker/.env`) and the
postgres-exporter. Stack-health gauges (`champey_*`) flow from
`scripts/health-check.mjs --metrics-out` → `output/health-metrics.prom` →
`scripts/metrics-server.mjs` (127.0.0.1:9701) → Prometheus job `stack-health`.
The metrics feed re-runs the full auto-repair check every 5 minutes and re-writes
`output/metrics-dsn.txt` (the postgres-exporter DSN; recreate the exporter with
`docker compose up -d --force-recreate postgres-exporter` after a manual rotation).
Grafana panels: "Stack health (auto-repair)" timeline + "Last health check (age, s)"
stat; Grafana alerts fire on `champey_stack_healthy == 0` and a stale feed (>15 min).
Backend `up`/`postgres` `up` are visible on the same dashboard.

### Dependency audit & security patches (SECURITY-ROTATION.md §1)

**Weekly (automated):** Task Scheduler job `champey-dependency-audit` runs
`scripts/dependency-audit.mjs` every Monday 02:00 → `pnpm audit` + `pnpm outdated`,
reports in `output/dependency-audit/<YYYY-MM-DD>/`, history in
`output/dependency-audit/history.csv`, last exit in `output/dependency-audit-last-exit.txt`
(exit 1 = high/critical advisories present). Manage it with the same
`schtasks /Query|/Run|/Delete /TN champey-dependency-audit` commands as the
health-check job.

**Patching (run when the scan flags high/critical, or at the monthly patch review):**

```bat
cd C:\Workspace\www.champey.com
node scripts\security-patch.mjs --dry-run   REM review the plan first
node scripts\security-patch.mjs             REM apply + build gate + SECURITY.md log
pnpm test                                   REM full suite (script only gates the build)
git diff package.json pnpm-lock.yaml        REM review, then commit
docker compose build ^&^& docker compose up -d   REM ship it into the stack
```

The patch script only applies **semver-safe** fixes (`pnpm audit --fix` adds
`pnpm.overrides` so vulnerable transitive ranges cannot come back), gates on
`pnpm build`, and on failure git-restores exactly `package.json`/`pnpm-lock.yaml`/
`pnpm-workspace.yaml` (it refuses to run when those files are dirty, exit 3).
Semver-major fixes and outdated majors are listed in the weekly summary for the
**quarterly** review — never auto-applied.

### Rules that prevent repeat outages (2026-09-09 incident)

1. **One stack, one env.** Never `docker compose up` from a worktree copy or run a
   second postgres/redis/meili/minio — the worktree copy had a stale password and
   duplicated infra. Check: `docker compose ls` must list ONLY the `champey` project.
2. **After changing any secret** in `docker/.env`: `node scripts/sync-dev-env.mjs`
   (also mirrors the monitoring keys into root `.env` for compose interpolation),
   then `docker compose up -d --force-recreate` (add `postgres-exporter` if the
   DB password changed).

---

## 1. High Error Rate (>0.5%)

**Severity:** P0 / P1

**Alert:** "Error rate >1%"

### Symptoms
- Uptime dashboard shows red
- Slack alert: Error rate spike
- Customers report: "Pages not loading" or "Checkout failed"

### Diagnosis (5 min)

```bash
# 1. Check alert dashboard
# Navigate to Grafana > System Health > Error Rate panel
# Note the current rate and affected endpoints

# 2. Review recent errors in logs
kubectl logs -f deployment/backend --tail=100 | grep ERROR
# Look for: stack traces, new error patterns, repeated errors

# 3. Check which endpoints are failing
curl -X GET http://backend:4000/api/health
# Expected: { "status": "ok" }
# If down, database or Redis is likely down

# 4. Check database connectivity
kubectl exec -it <backend-pod> -- psql \
  -h $DATABASE_HOST \
  -U $DATABASE_USER \
  -d champey_prod \
  -c "SELECT 1;"
# Should return: 1 (success)

# 5. Check Redis connectivity
kubectl exec -it <backend-pod> -- redis-cli -h $REDIS_HOST ping
# Should return: PONG
```

### Root Cause: Database Down

**Fix (10 min):**
```bash
# 1. Check database pod status
kubectl get pods -l app=postgres

# 2. Check logs
kubectl logs -f deployment/postgres --tail=50

# 3. If pod is restarting, check PVC
kubectl get pvc | grep postgres
kubectl describe pvc postgres-data

# 4. If disk full, cleanup old backups
kubectl exec -it <postgres-pod> -- df -h
# If >90%, alert DBA immediately (P0 escalation)

# 5. Restart database (last resort)
kubectl rollout restart deployment/postgres
kubectl rollout status deployment/postgres

# 6. Monitor recovery
kubectl logs -f deployment/postgres
# Look for: "database system is ready to accept connections"

# 7. Verify error rate dropped
# Check Grafana dashboard in 2 minutes
```

### Root Cause: Redis Down

**Fix (10 min):**
```bash
# 1. Check Redis pod
kubectl get pods -l app=redis

# 2. If pod is running, check connectivity
redis-cli -h $REDIS_HOST ping

# 3. If no response, restart Redis
kubectl rollout restart deployment/redis
kubectl rollout status deployment/redis

# 4. Verify backend services reconnect
kubectl logs -f deployment/backend --tail=20 | grep -i redis

# 5. Clear affected backend pods to force reconnection
kubectl rollout restart deployment/backend
```

### Root Cause: Application Bug / OOM

**Fix (15 min):**
```bash
# 1. Check pod resource usage
kubectl top pods -l app=backend
# Look for: pods with >80% memory

# 2. If memory usage is high
kubectl describe pod <backend-pod> | grep -A 5 "Last State"
# Check if OOMKilled

# 3. Check for memory leaks
# Review recent deployments: Did we just deploy?
kubectl rollout history deployment/backend

# 4. If recent deploy caused it, rollback
kubectl rollout undo deployment/backend
kubectl rollout status deployment/backend

# 5. If no recent deploy, increase resource limits and restart
kubectl set resources deployment/backend --limits=memory=2Gi,cpu=1000m
kubectl rollout restart deployment/backend

# 6. Escalate to backend lead for code review
# File issue: [Backend] Memory leak in <module>
```

### Post-Resolution

1. **Document incident**
   - Time detected, duration, impact (% of requests)
   - Root cause
   - Fix applied
   - Time to resolution

2. **Update runbook**
   - Did this scenario have a known fix? Update it.
   - Did we discover a new root cause? Add it.

3. **Create follow-up issue**
   - If root cause was a bug: File bug report with "critical" label
   - If root cause was capacity: File scaling issue
   - If root cause was monitoring gap: Improve alerting

---

## 2. Service Down (503)

**Severity:** P0

**Alert:** "Service is down"

### Symptoms
- Health check fails (returns timeout or 5xx)
- Frontend/admin return "Service unavailable"
- Customers report: "Website not loading"

### Diagnosis (3 min)

```bash
# 1. Identify which service is down
curl -v http://frontend:3000/health 2>&1 | head -20
curl -v http://backend:4000/api/health 2>&1 | head -20
curl -v http://admin:3001/health 2>&1 | head -20

# 2. Check pod status
kubectl get pods -l tier=frontend,tier=backend,tier=admin

# 3. Check recent events
kubectl describe node <node-name> | grep -A 5 "Events"
```

### Quick Fix: Pod Restart (5 min)

```bash
# 1. Restart the failed service
kubectl rollout restart deployment/backend
# (Replace with frontend/admin as needed)

# 2. Monitor restart progress
kubectl rollout status deployment/backend

# 3. Verify health check passes
curl -X GET http://backend:4000/api/health
# Expected: { "status": "ok" }

# 4. Check error rate returned to normal (Grafana)
```

### If Restart Fails: Check Logs (10 min)

```bash
# 1. Get previous pod logs (if pod crashed)
kubectl logs <pod-name> --previous | tail -100

# 2. Get current pod logs
kubectl logs <pod-name> | tail -100

# 3. Look for:
# - Database connection errors
# - Disk full
# - Port already in use
# - Environment variable missing

# 4. If environment variable missing:
kubectl edit deployment/backend
# Add missing var to spec.template.spec.containers[0].env
kubectl apply -f -

# 5. If disk full (Docker layer):
kubectl exec -it <pod> -- df -h
# If >90%, may need to rebuild container image (clean build cache)
```

### If Still Down: Rollback Last Deploy (15 min)

```bash
# 1. Check previous deployment
kubectl rollout history deployment/backend

# 2. Rollback to previous version
kubectl rollout undo deployment/backend
kubectl rollout status deployment/backend

# 3. Verify health check passes
sleep 10
curl -X GET http://backend:4000/api/health

# 4. File urgent issue for the deployed code
# Tag: "hotfix-needed", "blocks-production"

# 5. Communicate to customers
# Post status page update: "Service recovered via rollback"
```

### Escalation: Still Down After 10 min

**Page on-call engineer immediately**
- Database team: If DB is unreachable
- DevOps: If infrastructure is failing
- Backend lead: If application deployment failed

---

## 3. High Latency (p95 >500ms API, >2s Frontend)

**Severity:** P1

**Alert:** "API latency p95 > 1s"

### Symptoms
- Grafana shows latency spike
- Customers report: "Website is slow"
- Checkout times out

### Diagnosis (10 min)

```bash
# 1. Check which endpoints are slow
# Grafana > API Performance > Endpoint Performance heat map
# Note the slowest endpoints (typically search, checkout, admin)

# 2. Check database slow queries
kubectl exec -it <postgres-pod> -- psql \
  -h localhost \
  -U postgres \
  -d champey_prod \
  -c "SELECT query, mean_exec_time, calls FROM pg_stat_statements WHERE mean_exec_time > 1000 ORDER BY mean_exec_time DESC LIMIT 10;"

# 3. Check CPU/memory on backend pods
kubectl top pods -l app=backend

# 4. Check search service (Meilisearch)
curl -X GET http://meilisearch:7700/health
# Should return: { "status": "available" }
# If not, search queries will timeout
```

### Root Cause: Slow Database Query

**Fix (20 min):**
```bash
# 1. Get the slow query from step 2 above
# Example: SELECT * FROM products WHERE ...

# 2. Analyze query plan
kubectl exec -it <postgres-pod> -- psql \
  -h localhost \
  -U postgres \
  -d champey_prod \
  -c "EXPLAIN ANALYZE SELECT * FROM products WHERE ...;"

# Look for: sequential scans on large tables (should be indexed scans)

# 3. Add index if missing
kubectl exec -it <postgres-pod> -- psql \
  -h localhost \
  -U postgres \
  -d champey_prod \
  -c "CREATE INDEX idx_products_category_id ON products(category_id);"

# 4. Or optimize query (request code review from backend lead)
# For now, add query-level timeout to prevent cascading delays:
# UPDATE backend config: QUERY_TIMEOUT=2000 (milliseconds)

# 5. Monitor latency in Grafana (should improve in 5 min)
```

### Root Cause: Cache Miss / Redis Down

**Fix (10 min):**
```bash
# 1. Check Redis availability
kubectl get pods -l app=redis

# 2. Check hit rate (Grafana > API Performance > Cache Efficiency)
# If hit rate <70%, cache is undersized or data isn't being cached

# 3. Increase Redis memory
kubectl set resources deployment/redis --limits=memory=4Gi

# 4. Or identify hot keys not being cached
# Review backend code for caching strategy
# File issue: Add caching for expensive query X

# 5. Monitor latency recovery
```

### Root Cause: Resource Contention (High CPU/Memory)

**Fix (15 min):**
```bash
# 1. Check node-level resources
kubectl top nodes

# 2. If a node is >80% CPU
# Scale up: Add new node to cluster
kubectl autoscale deployment backend --min=2 --max=10

# 3. Or manually scale pods
kubectl scale deployment backend --replicas=5

# 4. Monitor latency drop (should happen in 2–3 min)
```

### Root Cause: Meilisearch Indexing Lag

**Fix (10 min):**
```bash
# 1. Check Meilisearch status
curl -X GET http://meilisearch:7700/tasks?statuses=enqueued,processing

# 2. If many tasks are enqueued
# Scale Meilisearch: Increase resources or add replicas

# 3. Check if recent product bulk upload is being indexed
# Meilisearch batches indexing; may need to wait 1–5 min

# 4. Optimize indexing priority
# For now, users can bypass search with manual filters
```

---

## 4. Disk Space Critical (>90% full)

**Severity:** P1

**Alert:** "Disk {{ device }} only 5% free"

### Symptoms
- Alert fires for database or MinIO storage
- Backend logs: "No space left on device"
- Uploads fail

### Diagnosis (3 min)

```bash
# 1. Check which disk is full
kubectl get nodes
kubectl describe node <node> | grep -A 5 "Allocated resources"

# 2. SSH into node and check disk usage
kubectl debug node <node> -it --image=ubuntu

# 3. Find large files/directories
du -sh /* | sort -rh | head -10
# Look for: /var/lib/docker (images), /var/log (logs), database files

# 4. Check database size
du -sh /var/lib/postgresql/data
```

### Fix: Database Disk (20 min)

```bash
# 1. Stop writes (gracefully)
# Set backend to read-only mode
kubectl set env deployment/backend DATABASE_READ_ONLY=true

# 2. Create backup of database
# (Should already have automated backups; check they succeeded)
aws s3 ls s3://${BACKUP_BUCKET}/postgres-backups/ | tail -5

# 3. Cleanup old database files
kubectl exec -it <postgres-pod> -- psql -U postgres -c "VACUUM FULL;"
# Takes 5–10 min for large databases

# 4. Or add storage
# If DB is legitimately growing, expand the PVC
kubectl patch pvc postgres-data -p '{"spec":{"resources":{"requests":{"storage":"2Ti"}}}}'
# Note: Storage expansion requires downtime in many setups

# 5. Restore read-write mode
kubectl set env deployment/backend DATABASE_READ_ONLY=false

# 6. Monitor: Disk usage should drop by 20–30% after VACUUM
```

### Fix: Docker Image Disk (15 min)

```bash
# 1. Clean up unused images
docker image prune -a -f

# 2. Clean up dangling layers
docker image prune --filter "dangling=true" -f

# 3. Check freed space
df -h /var/lib/docker

# 4. If still >80%, review recent image builds
# May have built large intermediate images

# 5. Rebuild with --no-cache to skip caching
docker build --no-cache -t champey-backend:latest .
```

### Fix: Log Disk (10 min)

```bash
# 1. Compress old logs
gzip /var/log/containers/*$(date -d '7 days ago' +%Y-%m-%d)*

# 2. Or ship logs to remote storage
# Configure Docker to use json-file log driver with max-size

# 3. Clear logs if necessary (last resort)
find /var/log -name "*.log" -mtime +30 -delete
```

### Post-Resolution

1. **File capacity planning issue**
   - Current usage: X GB
   - Growth rate: Y GB/month
   - Projected full date: [date]
   - Action: Increase capacity before [date - 2 weeks]

2. **Improve monitoring**
   - Add alert at 70% full (P2)
   - Add alert at 80% full (P1)
   - Add alert at 90% full (P0)

---

## 5. Database Connection Pool Exhausted

**Severity:** P0

**Alert:** "Database connection pool at 95%"

### Symptoms
- Backend returns: "Too many connections"
- Checkout fails
- New logins fail

### Diagnosis (3 min)

```bash
# 1. Check connection count
kubectl exec -it <postgres-pod> -- psql -U postgres -c \
  "SELECT count(*) FROM pg_stat_activity;"

# 2. List active connections
kubectl exec -it <postgres-pod> -- psql -U postgres -c \
  "SELECT pid, usename, application_name, state FROM pg_stat_activity ORDER BY state;"

# 3. Check max_connections setting
kubectl exec -it <postgres-pod> -- psql -U postgres -c \
  "SHOW max_connections;"
# Typical: 100–200

# 4. Check which applications are holding connections
# Most likely: idle connections from backend pods that haven't closed cleanly
```

### Fix (10 min)

```bash
# 1. Kill idle connections (careful: may interrupt queries)
kubectl exec -it <postgres-pod> -- psql -U postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity \
   WHERE state = 'idle' AND usename = 'champey_app' \
   AND state_change < now() - interval '10 minutes';"

# 2. Restart backend pods to re-establish clean connections
kubectl rollout restart deployment/backend
kubectl rollout status deployment/backend

# 3. Monitor connection count (should drop in 2–3 min)
watch -n 5 "kubectl exec -it <postgres-pod> -- psql -U postgres -c \
  'SELECT count(*) FROM pg_stat_activity;'"
```

### Root Cause: Connection Leak in Code

**If pool keeps exhausting after fix:**
```bash
# 1. Review recent code changes to backend
# Check for: missing close() calls on database connections

# 2. Enable connection logging
kubectl exec -it <postgres-pod> -- psql -U postgres -c \
  "ALTER SYSTEM SET log_connections = on;
   SELECT pg_reload_conf();"

# 3. Increase max_connections as temporary measure
kubectl exec -it <postgres-pod> -- psql -U postgres -c \
  "ALTER SYSTEM SET max_connections = 300;
   SELECT pg_reload_conf();"

# 4. File urgent bug report for backend lead
# Tag: "memory-leak", "critical"

# 5. If leak is severe, redeploy previous version
kubectl rollout undo deployment/backend
```

---

## 6. MinIO Upload Failures

**Severity:** P1 (if affecting product uploads)

**Symptoms**
- Product image uploads fail
- Error: "Storage service unavailable"
- Customer uploads (documents, resumes) fail

### Diagnosis (5 min)

```bash
# 1. Check MinIO pod status
kubectl get pods -l app=minio

# 2. Check MinIO health
curl -X GET http://minio:9000/minio/health/live

# 3. Check MinIO logs
kubectl logs -f deployment/minio | tail -50

# 4. Check available disk space on MinIO node
kubectl exec -it <minio-pod> -- df -h /data
```

### Fix (10 min)

```bash
# 1. If MinIO is down, restart it
kubectl rollout restart deployment/minio
kubectl rollout status deployment/minio

# 2. If disk is full, trigger cleanup
# Delete old uploads (if not backed up)
kubectl exec -it <minio-pod> -- mc rm --recursive minio/champey-prod/uploads/ --older-than 30d
# (Adjust retention based on business policy)

# 3. If still failing, check network connectivity
kubectl exec -it <backend-pod> -- nc -zv minio 9000

# 4. Check access credentials
kubectl get secret minio-credentials -o jsonpath='{.data.MINIO_ACCESS_KEY}'

# 5. Verify credentials in backend config
kubectl get deployment backend -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="MINIO_ACCESS_KEY")].value}'
```

### Root Cause: Quota Exceeded

```bash
# 1. Check MinIO bucket size
kubectl exec -it <minio-pod> -- mc du minio/champey-prod

# 2. If >80% capacity, increase bucket quota
# Or migrate to larger storage backend
```

---

## 7. Search (Meilisearch) Not Working

**Severity:** P2 (P1 if blocks product discovery)

**Symptoms**
- Search returns no results
- Search page returns error
- Fallback (database search) used instead

### Diagnosis (5 min)

```bash
# 1. Check Meilisearch health
curl -X GET http://meilisearch:7700/health

# 2. Check indexes
curl -X GET http://meilisearch:7700/indexes | jq '.results | length'

# 3. Check indexing tasks
curl -X GET http://meilisearch:7700/tasks?statuses=failed | jq '.results | length'

# 4. Check Meilisearch logs
kubectl logs -f deployment/meilisearch | tail -50
```

### Fix (15 min)

```bash
# 1. If indexing task failed
curl -X GET http://meilisearch:7700/tasks/123 | jq '.error'
# Review error message and fix (usually: schema mismatch or out of memory)

# 2. Re-trigger indexing
curl -X POST http://meilisearch:7700/indexes/products/documents \
  -H "Authorization: Bearer ${MEILI_API_KEY}" \
  -d '[
    {"id": 1, "name": "Product 1", ...},
    ...
  ]'

# 3. If memory error, increase Meilisearch resources
kubectl set resources deployment/meilisearch --limits=memory=4Gi

# 4. If data corruption, rebuild index
# Stop indexing, clear index, re-upload all data (1–5 min downtime)

# 5. In the meantime, backend uses database search fallback
# Search still works, just slower
```

---

## 8. Redis Memory Pressure (High Eviction Rate)

**Severity:** P1

**Alert:** "Redis evicting >100 keys/min"

### Symptoms
- Cache hit rate drops (Grafana shows <70%)
- Backend latency increases
- Session data lost (users logged out unexpectedly)

### Diagnosis (5 min)

```bash
# 1. Check Redis memory usage
kubectl exec -it <redis-pod> -- redis-cli info memory

# 2. Check eviction policy
kubectl exec -it <redis-pod> -- redis-cli CONFIG GET maxmemory-policy
# Should be: "allkeys-lru" (evict least recently used keys)

# 3. Check key counts
kubectl exec -it <redis-pod> -- redis-cli DBSIZE

# 4. Check memory fragmentation
# If fragmentation_ratio > 1.5, Redis memory is fragmented
```

### Fix (10 min)

```bash
# 1. Increase Redis memory limit
kubectl set resources deployment/redis --limits=memory=4Gi

# 2. Or reduce TTL on session/cache keys
# Update backend config: SESSION_TTL=3600 (1 hour instead of 24h)

# 3. Or add Redis replica for read scaling
kubectl scale statefulset redis --replicas=3

# 4. Monitor eviction rate (should drop in 5 min)
watch -n 5 "kubectl exec -it <redis-pod> -- redis-cli info stats | grep evicted"
```

### Root Cause: Cache Bloat

```bash
# 1. Check what's consuming memory
kubectl exec -it <redis-pod> -- redis-cli --bigkeys

# 2. If sessions are bloated
# Clear old sessions (>24h inactive)
kubectl exec -it <redis-pod> -- redis-cli EVAL "
  local keys = redis.call('keys', 'sessions:*')
  for i, key in ipairs(keys) do
    if redis.call('ttl', key) < 0 then
      redis.call('del', key)
    end
  end
" 0

# 3. File issue: Review session data structure
```

---

## 9. Chat/Real-time Not Working (WebSocket Errors)

**Severity:** P2

**Symptoms**
- Chat messages don't deliver in real-time
- Users see "Reconnecting..." messages
- Notifications delayed

### Diagnosis (5 min)

```bash
# 1. Check Socket.IO health
curl -X GET http://backend:4000/socket.io/info

# 2. Check Redis (Socket.IO adapter uses Redis for pub/sub)
kubectl exec -it <redis-pod> -- redis-cli PING

# 3. Check backend logs for Socket.IO errors
kubectl logs -f deployment/backend | grep -i "socket\|websocket"

# 4. Check if rate limiting is blocking connections
# Review REDIS_RATE_LIMIT config
```

### Fix (10 min)

```bash
# 1. Restart backend (Socket.IO connection reconnect)
kubectl rollout restart deployment/backend
kubectl rollout status deployment/backend

# 2. Check WebSocket port is open (usually 4000 for same port as HTTP)
kubectl get svc backend -o jsonpath='{.spec.ports}'

# 3. If using separate port, check firewall rules
# Ensure port 4000 (or config port) is accessible from frontend

# 4. Increase Redis pub/sub capacity
# No fix needed; Redis handles many subscribers automatically

# 5. Monitor real-time metrics (Chat page should work in 2 min)
```

---

## 10. Backup Failed

**Severity:** P2

**Alert:** "No successful backup in >24 hours"

### Symptoms
- Automated backup job last ran >24 hours ago
- Disaster recovery plan is compromised

### Diagnosis (5 min)

```bash
# 1. Check backup job status
kubectl get cronjob backup-postgres

# 2. Check recent job runs
kubectl get jobs -l cronjob=backup-postgres --sort-by=.metadata.creationTimestamp | tail -5

# 3. Check logs of failed job
kubectl logs -f job/backup-postgres-xxx

# 4. Check S3 connectivity
kubectl exec -it <backup-pod> -- aws s3 ls s3://${BACKUP_BUCKET}/ --region us-east-1
```

### Fix (15 min)

```bash
# 1. If S3 bucket not accessible
# Check AWS credentials and permissions
kubectl get secret aws-credentials -o yaml | grep -A 5 "AWS_ACCESS_KEY"

# 2. If database connection failed
# Verify DATABASE_URL and password in backup job env
kubectl get cronjob backup-postgres -o yaml | grep -A 10 "env:"

# 3. If disk space full during backup
# Clean up temporary files
kubectl exec -it <backup-pod> -- rm -f /tmp/champey_db_*.sql.gz

# 4. Manually trigger backup
kubectl create job --from=cronjob/backup-postgres manual-backup-$(date +%s)
kubectl logs -f job/manual-backup-xxx

# 5. Verify backup uploaded to S3
aws s3 ls s3://${BACKUP_BUCKET}/postgres-backups/ | tail -1
# Should show today's backup

# 6. File issue: Investigate why cron job failed
# Possible causes: Network timeout, credentials expired, resource limits
```

---

## General Escalation Flowchart

```
Issue detected
  ↓
Can you diagnose in <5 min?
  ├─ Yes → Follow runbook steps
  │   ├─ Can you fix in <15 min?
  │   │   ├─ Yes → Fix, document, file follow-up issue
  │   │   └─ No → Escalate now
  │   └─ No → Escalate now
  ├─ No → Escalate immediately
  └─ Escalate
      ├─ P0 → Page on-call lead + team leads (email + SMS)
      ├─ P1 → Notify team lead (Slack)
      └─ P2 → File issue (Slack + email)
```

---

## Runbook Update Process

1. After resolving an incident, review this runbook.
2. Did the steps help? Add to "What worked" section.
3. Was a step missing or incorrect? Update it.
4. Learn something new? Add a new runbook section.
5. Update the runbook in git and commit with message: "docs: update runbook for [issue]"
