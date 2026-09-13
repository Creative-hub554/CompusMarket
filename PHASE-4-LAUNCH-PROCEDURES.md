# Phase 4: Launch Procedures

**Goal**: Deploy www.champey.com to production safely with zero-downtime deployment, automated smoke tests, instant rollback capability, and real-time monitoring.

**Success Gate**: Production deployment completes, all smoke tests pass, team confirms 4-hour post-launch stability with zero P0/P1 incidents.

---

## 1. Pre-Launch Checklist (48 Hours Before)

### 1.1 Deployment Readiness
- [ ] Phase 3 sign-off completed (all team leads approved)
- [ ] Release branch frozen (no new commits without approval)
- [ ] All PRs merged to release branch, CI passing
- [ ] Database migrations tested on production-sized staging DB
- [ ] Backup created and restore drill completed successfully
- [ ] Rollback procedures documented and communicated to team
- [ ] On-call rotation confirmed (who is primary/secondary for first 24 hours)
- [ ] Escalation contacts verified (availability of eng lead, ops lead, security lead)

### 1.2 Infrastructure Readiness
- [ ] Production environment scaled to expected traffic (auto-scaling groups reviewed)
- [ ] Load balancer health checks passing for all instances
- [ ] CDN cache headers validated and tested
- [ ] Database connection pools configured (max connections = app instances × connection pool size)
- [ ] Redis/cache clusters healthy and flushed/warmed as needed
- [ ] S3 backups verified (latest backup < 4 hours old)
- [ ] DNS failover tested (if multi-region)
- [ ] SSL certificates renewed and valid for >30 days

### 1.3 Monitoring & Observability Readiness
- [ ] Prometheus scraping all services (no missing metrics)
- [ ] Grafana dashboards pinned and accessible to on-call team
- [ ] AlertManager configured with PagerDuty/Slack integrations
- [ ] Log aggregation pipeline live (ELK/Datadog/CloudWatch)
- [ ] Synthetic uptime checks configured (external monitoring, not self-referential)
- [ ] Baseline metrics established (traffic patterns, error rates, latency)
- [ ] APM (Application Performance Monitoring) active if available

### 1.4 Communication Readiness
- [ ] Status page (if public) prepared with "Scheduled Maintenance" banner
- [ ] Customer communication drafted (email, in-app notification, social media)
- [ ] Internal status updates scheduled (Slack channel, war room link ready)
- [ ] Runbook links shared with on-call team
- [ ] Post-launch retrospective meeting scheduled (next day or within 24 hours)

### 1.5 Business Readiness
- [ ] Customer support team briefed on new features and known limitations
- [ ] Monitoring dashboards accessible to business stakeholders
- [ ] Success metrics defined (revenue, signups, engagement if applicable)
- [ ] Payment processor (if applicable) verified active and processing
- [ ] Email delivery tested (password resets, notifications)

---

## 2. Deployment Strategy

### 2.1 Deployment Method: Kubernetes Rolling Deployment with Blue-Green Fallback

**Primary**: Rolling deployment (gradual, canary-style)
```
Rationale: Reduces blast radius, allows real-time traffic observation on new version
Risk: If bug appears early, early traffic sees it before full rollout
Mitigation: Canary (10% traffic first 5 min), then 50%, then 100% over 10 minutes total
```

**Fallback**: Blue-green swap (instant)
```
Rationale: Full instant rollback if canary shows critical issue
Process: Keep previous version running, switch load balancer to old version if needed
Time: <30 seconds to rollback
```

### 2.2 Deployment Steps

#### Phase 4.2.1 — Canary Deployment (Minutes 0-5)

```bash
# 1. Pull release branch and build Docker images
git checkout release/v1.0.0
git pull origin release/v1.0.0
docker build -t champey-api:v1.0.0-prod apps/backend/
docker build -t champey-frontend:v1.0.0-prod apps/frontend/
docker push champey-api:v1.0.0-prod
docker push champey-frontend:v1.0.0-prod

# 2. Apply database migrations (if schema changes)
# NOTE: Must run BEFORE app deployment to avoid version mismatch
kubectl exec -it deployment/backend-prod -- npx prisma migrate deploy --url "$DATABASE_URL"
# Verify: kubectl logs -l app=backend --tail=50

# 3. Canary: Deploy to 1 backend replica + 1 frontend replica
kubectl set image deployment/backend-prod backend=champey-api:v1.0.0-prod --record
kubectl set image deployment/frontend-prod frontend=champey-frontend:v1.0.0-prod --record

# 4. Monitor canary metrics (5 minutes)
# - Error rate for new replicas (should be <0.5%)
# - Latency p95 (should be <2s)
# - Database connection pool (should be stable)
# - Pod restart count (should stay 0)

# Check canary status
kubectl rollout status deployment/backend-prod --timeout=5m
kubectl top pod -l app=backend (check CPU/memory)
kubectl logs -l app=backend --tail=20 | grep -i "error\|exception"

# Query metrics (replace with your Prometheus URL)
curl 'http://prometheus:9090/api/v1/query?query=rate(http_requests_total{app="backend",pod=~"backend-prod.*"}[1m])'
```

#### Phase 4.2.2 — Progressive Rollout (Minutes 5-15)

```bash
# If canary metrics look good, proceed with 50% rollout
kubectl set image deployment/backend-prod backend=champey-api:v1.0.0-prod
kubectl set image deployment/frontend-prod frontend=champey-frontend:v1.0.0-prod
kubectl patch deployment backend-prod -p '{"spec":{"strategy":{"type":"RollingUpdate","rollingUpdate":{"maxSurge":"50%","maxUnavailable":"25%"}}}}'

# Monitor 50% rollout (5 minutes)
kubectl rollout status deployment/backend-prod --timeout=10m
# Repeat canary metrics checks

# If still good, proceed with 100% (automatic via rolling update)
kubectl patch deployment backend-prod -p '{"spec":{"strategy":{"type":"RollingUpdate","rollingUpdate":{"maxSurge":"100%","maxUnavailable":"0%"}}}}'
```

#### Phase 4.2.3 — Full Rollout (Minutes 15+)

```bash
# Wait for all replicas to become ready
kubectl rollout status deployment/backend-prod --timeout=20m
kubectl rollout status deployment/frontend-prod --timeout=20m

# Verify all pods are running
kubectl get pods -l app=backend
kubectl get pods -l app=frontend

# Confirm no crashes
kubectl logs deployment/backend-prod --tail=20 --timestamps=true

echo "✅ Deployment complete"
```

#### Phase 4.2.4 — Instant Rollback (if needed during deployment)

```bash
# Immediate rollback: Revert to previous version
kubectl rollout undo deployment/backend-prod
kubectl rollout undo deployment/frontend-prod

# Monitor rollback
kubectl rollout status deployment/backend-prod --timeout=10m

# If rollback itself fails, use blue-green:
kubectl patch service champey-api -p '{"spec":{"selector":{"version":"v0.9.9"}}}'
# (Switch load balancer to previous version)

echo "✅ Rollback complete — investigating issue"
```

---

## 3. Smoke Tests (Automated, Post-Deployment)

Run immediately after all replicas are ready (before declaring launch complete).

### 3.1 Basic Connectivity
```bash
#!/bin/bash
# smoke-tests.sh

BASE_URL="https://champey.com"
API_URL="https://api.champey.com"

echo "🔍 Smoke Test 1: Basic HTTP connectivity"
curl -s -o /dev/null -w "%{http_code}" $BASE_URL
[ $? -eq 0 ] && echo "✅ Frontend responding" || echo "❌ Frontend down"

curl -s -o /dev/null -w "%{http_code}" $API_URL/health
[ $? -eq 0 ] && echo "✅ API responding" || echo "❌ API down"
```

### 3.2 Critical Flows
```bash
echo "🔍 Smoke Test 2: Auth flow"
# Register new user
AUTH_RESPONSE=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke-'$(date +%s)'@test.com","password":"Test123!@"}')

TOKEN=$(echo $AUTH_RESPONSE | jq -r '.access_token')
[ ! -z "$TOKEN" ] && echo "✅ Auth working" || echo "❌ Auth failed"

echo "🔍 Smoke Test 3: Product listing"
PRODUCTS=$(curl -s -H "Authorization: Bearer $TOKEN" $API_URL/api/products)
PRODUCT_COUNT=$(echo $PRODUCTS | jq '.data | length')
[ $PRODUCT_COUNT -gt 0 ] && echo "✅ Products available ($PRODUCT_COUNT)" || echo "❌ No products"

echo "🔍 Smoke Test 4: Cart operations"
CART=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" $API_URL/api/cart/add \
  -H "Content-Type: application/json" \
  -d '{"productId":"'$(echo $PRODUCTS | jq -r '.data[0].id')'","quantity":1}')
CART_ID=$(echo $CART | jq -r '.id')
[ ! -z "$CART_ID" ] && echo "✅ Cart updated" || echo "❌ Cart failed"

echo "🔍 Smoke Test 5: Search"
SEARCH=$(curl -s "$API_URL/api/products/search?q=test")
RESULTS=$(echo $SEARCH | jq '.data | length')
echo "✅ Search returned $RESULTS results"

echo "🔍 Smoke Test 6: Real-time connectivity (WebSocket)"
# Simple WebSocket ping (requires wscat or similar)
# wscat -c "wss://api.champey.com/api/socket.io" --execute 'ping' --wait 2s
echo "⚠️  WebSocket test skipped (manual verification needed)"

echo ""
echo "========================================="
echo "Smoke Tests Complete"
echo "========================================="
```

### 3.3 Database Verification
```bash
echo "🔍 Smoke Test 7: Database connectivity"
# From backend pod
kubectl exec deployment/backend-prod -- npx prisma studio --browser none &
sleep 2
# Check if Prisma client loaded without error
curl -s http://localhost:5555/api/health && echo "✅ DB connected" || echo "❌ DB error"

echo "🔍 Smoke Test 8: Migration verification"
kubectl exec deployment/backend-prod -- npx prisma migrate status --url "$DATABASE_URL"
# Expected: "All migrations have been applied."
```

### 3.4 Monitoring & Alerting
```bash
echo "🔍 Smoke Test 9: Metrics collection"
# Verify Prometheus scrapes are working
curl -s "http://prometheus:9090/api/v1/query?query=up{job=\"backend\"}" | jq '.data.result[0].value[1]'
# Expected: "1" (up)

echo "🔍 Smoke Test 10: Alert rules loaded"
curl -s "http://prometheus:9090/api/v1/rules" | jq '.data.groups | length'
# Expected: >0 alert groups

echo "🔍 Smoke Test 11: Log shipping"
# Check if logs appear in central aggregation (ELK/Datadog)
# Manual: Visit Kibana/Datadog and search for "deployment_version:v1.0.0"
echo "⚠️  Log shipping test skipped (manual verification needed)"
```

### 3.5 Smoke Test Automation
```yaml
# kubernetes/smoke-tests-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: smoke-tests-post-deploy-{{ .Release.Time.Unix }}
spec:
  template:
    spec:
      containers:
      - name: smoke-tests
        image: curlimages/curl:latest
        env:
        - name: BASE_URL
          value: "https://champey.com"
        - name: API_URL
          value: "https://api.champey.com"
        command:
        - /bin/sh
        - -c
        - |
          bash /scripts/smoke-tests.sh
          if [ $? -ne 0 ]; then
            echo "❌ Smoke tests failed — initiating rollback"
            exit 1
          fi
      restartPolicy: Never
  backoffLimit: 0  # Do not retry; fail immediately if any test fails
```

**Run smoke tests**:
```bash
kubectl apply -f kubernetes/smoke-tests-job.yaml
kubectl logs job/smoke-tests-post-deploy-* --follow
```

---

## 4. Rollback Procedures

### 4.1 Immediate Rollback (if deployment fails or critical issue detected)

**Decision Criteria (Auto-Rollback Triggers)**:
- Error rate >5% on new version for >2 minutes
- API p95 latency >5s
- Pod restart loop (CrashLoopBackOff)
- Database connection pool exhausted
- Critical business metric drop (e.g., checkout success rate <90%)

**Manual Triggers**:
- On-call engineer observes P0 incident in new version
- Customer-reported widespread issue blocking core flow
- Security vulnerability discovered in release

**Rollback Commands**:
```bash
# Option 1: Kubernetes rollout undo (fastest, <30s)
kubectl rollout undo deployment/backend-prod
kubectl rollout undo deployment/frontend-prod
kubectl rollout status deployment/backend-prod --timeout=10m

# Option 2: Blue-green swap (if undo stalls)
kubectl patch service champey-api -p '{"spec":{"selector":{"version":"v0.9.9"}}}'
kubectl patch service champey-frontend -p '{"spec":{"selector":{"version":"v0.9.9"}}}'

# Option 3: DNS fallover (last resort, if Kubernetes fails)
# Update DNS A record to point to backup IP
# dig champey.com (verify old IP returns)
```

### 4.2 Post-Rollback Actions
```bash
# 1. Notify team in Slack/war room
echo "⚠️  Rollback initiated — investigating root cause"

# 2. Preserve logs for analysis
kubectl logs deployment/backend-prod --timestamps=true > /tmp/backend-logs-v1.0.0.txt
kubectl logs deployment/frontend-prod --timestamps=true > /tmp/frontend-logs-v1.0.0.txt

# 3. Run diagnostics
kubectl describe pod <failed-pod-name>
kubectl get events --sort-by='.lastTimestamp'

# 4. Verify previous version is stable
# Wait 5 minutes, check metrics for old version
curl 'http://prometheus:9090/api/v1/query?query=rate(http_requests_total{version="v0.9.9"}[5m])'

# 5. Schedule post-mortem (within 2 hours)
# Issue: [title]
# Timeline: [when detected, when rolled back]
# Impact: [how many users affected, revenue impact if applicable]
# Root cause: [preliminary findings]
# Fix: [how to prevent recurrence]
```

---

## 5. Launch Day Timeline

### T-24 Hours (Day Before Launch)
- [ ] Final smoke test on staging environment
- [ ] Team confirms readiness (all sign-offs in place)
- [ ] Customer comms drafted and ready to send
- [ ] On-call schedule confirmed
- [ ] Escalation contacts in war room document

### T-2 Hours (Before Launch Window Opens)
- [ ] War room opened (Slack channel, video call link ready)
- [ ] All team members online and accounted for
- [ ] Final infrastructure health check
- [ ] Last-minute backup created
- [ ] Customer-facing status page updated to "Maintenance Window"

### T-0 (Launch Starts)
- [ ] Announce launch in war room: "Deployment starting"
- [ ] Begin Kubernetes canary deployment
- [ ] Monitor canary metrics (5 minutes)
- [ ] Proceed to progressive rollout if canary OK
- [ ] Continue monitoring during full rollout
- [ ] Run smoke tests once all replicas ready

### T+15 Minutes (Post-Deployment Stabilization)
- [ ] Confirm all smoke tests pass
- [ ] Review metrics dashboards (error rate, latency, traffic)
- [ ] Check customer support channel (no sudden spike in issues)
- [ ] Announce "Launch complete" in war room
- [ ] Begin 4-hour observation period

### T+4 Hours (Post-Launch Observation Complete)
- [ ] Confirm zero P0/P1 incidents
- [ ] Business metrics healthy (conversions, signups, retention)
- [ ] Database performance stable
- [ ] Cache hit rates normal
- [ ] Declare launch successful
- [ ] Schedule post-launch retrospective for next day
- [ ] Send customer comms: "Launch successful, monitoring continues"

---

## 6. Post-Launch Monitoring (First 24 Hours)

### 6.1 Live Dashboard Watch
Keep these dashboards open during first 4 hours, check every 30 minutes for next 20 hours:

1. **System Health Dashboard** (from DASHBOARDS-METRICS.md)
   - CPU/Memory usage: Should be <70% at peak
   - Network I/O: Normal pattern, no spikes
   - Disk usage: Should be stable (no runaway logs)

2. **API Performance Dashboard**
   - Error rate: <0.5%
   - Latency (p95): <2s for GET, <3s for POST
   - Request volume: Matches expected traffic pattern
   - Response codes: Majority 200, <1% 4xx/5xx

3. **Frontend Performance Dashboard**
   - Page load time (LCP): <2s
   - Cumulative Layout Shift: <0.1
   - Traffic: Expected volume, no anomalies
   - Browser errors: <100 per hour

4. **Business Metrics** (if available)
   - Active users: Expected
   - Conversion rate: Expected
   - Revenue: Normal
   - Signups: Expected

### 6.2 Alert Response Procedures

| Severity | Alert | Response | Escalation |
|----------|-------|----------|-------------|
| P0 | Error rate >5%, latency >10s | Page on-call immediately | Eng lead + CTO |
| P1 | Error rate >2%, latency >5s, checkout failures | Notify eng lead, investigate | Can wait 15 min to escalate |
| P2 | Error rate >0.5%, specific feature issues | Post in Slack, investigate async | Escalate if not resolved in 2h |
| P3 | Minor performance dips, non-critical features slow | Monitor, log, include in retro | No escalation unless blocks business |

### 6.3 Common Launch Issues & Rapid Fixes

| Issue | Symptoms | Quick Fix |
|-------|----------|-----------|
| Database connection pool exhausted | "too many connections" in logs | Increase `max_connections` in connection pool config, restart pod |
| Cache miss spike | Latency jumps by 2x, DB load increases | Pre-warm cache with product/category queries |
| Memory leak | Pod memory grows over time, crashes after 2-4h | Check for unbounded arrays/loops in new code, restart pods |
| Traffic surge | Requests exceed capacity | Scale up replicas manually or verify auto-scaling rules working |
| DNS propagation delay | Some users get old version, stale responses | Wait 5-10 minutes, verify all nameservers point to new IP |
| SSL certificate not renewed | HTTPS connection fails, cert expired | Provision new cert immediately, restart nginx/load balancer |

---

## 7. Rollback Decision Tree

```
Is Error Rate > 5%?
├─ YES → Rollback immediately (P0 incident)
│   └─ Run: kubectl rollout undo deployment/backend-prod
│   └─ Wait for confirmation, then investigate root cause
│
└─ NO
    └─ Is Latency p95 > 10s?
       ├─ YES → Check database, cache, or external API
       │   ├─ If DB: Optimize queries, rollback if persistent >5 min
       │   ├─ If Cache: Warm cache or disable, retry
       │   └─ If API: Wait for external service recovery
       │
       └─ NO
           └─ Are checkout/payment flows failing?
               ├─ YES → Verify payment processor active, rollback if issue in code
               │
               └─ NO
                   └─ ✅ Deployment appears healthy — continue monitoring
```

---

## 8. Communication Plan

### 8.1 Internal (War Room / Slack #launch)

**T-0 (Launch Start)**
```
@channel 🚀 Launch started
- Deployment version: v1.0.0
- Expected duration: 20 minutes
- Rollback available: YES (undo <30s)
- Monitoring: https://grafana.champey.com/d/system-health
- War room: [video link]
- Escalation: Ping @on-call-eng for urgent issues
```

**T+15 (Deployment Complete)**
```
✅ Deployment complete — all replicas running
- Smoke tests: PASS
- Error rate: 0.2% (normal)
- Latency p95: 1.8s (normal)
- Next: Begin 4-hour observation period
```

**T+4h (Observation Complete)**
```
✅ Launch successful
- Zero P0/P1 incidents
- All metrics healthy
- Business metrics on track
- Post-launch retro: Tomorrow 10 AM
- All-clear to scale down war room
```

### 8.2 Customer-Facing (Public Comms)

**Before Launch** (send 24 hours prior):
```
Subject: Scheduled Maintenance — www.champey.com

Dear Customers,

We will be performing scheduled maintenance on [DATE] at [TIME] (UTC+7) 
for approximately 20 minutes. During this time, www.champey.com may be 
unavailable or experience brief outages.

Existing orders will not be affected. We apologize for any inconvenience.

Thank you for your patience.

— The Champey Team
```

**During Launch** (update status page):
```
🔧 Maintenance in Progress

We are currently performing system updates. Please check back shortly.

Estimated completion: [TIME]
Status updates: [status-page-url]
```

**Post-Launch**:
```
✅ Maintenance Complete

Thank you for your patience. System is now fully operational with new features 
and improvements. All services are running normally.

— The Champey Team
```

---

## 9. Post-Launch Retrospective (Next Day)

### 9.1 Retrospective Meeting Agenda
**Attendees**: Engineering lead, DevOps, Product, QA, On-call engineers (24h post-launch rotation)

**Duration**: 60 minutes

**Agenda**:
1. **Timeline Review** (10 min)
   - When did deployment start?
   - When were all replicas ready?
   - When were smoke tests complete?
   - When was launch declared successful?

2. **Metrics Review** (15 min)
   - Error rate during/after deployment
   - Peak latency and response to load
   - Database query performance
   - Cache hit rates
   - Any anomalies detected?

3. **Issues & Resolutions** (20 min)
   - What issues were encountered?
   - How quickly were they resolved?
   - What was the root cause?
   - What could have been prevented?

4. **Process Improvements** (10 min)
   - What worked well?
   - What should we improve for next launch?
   - Documentation updates needed?
   - Automation opportunities?

5. **Action Items** (5 min)
   - Assign owner for each improvement
   - Schedule follow-up tasks
   - Document in POSTMORTEM-[DATE].md

### 9.2 Retrospective Template
```markdown
# Launch Retrospective — v1.0.0 (2026-09-02)

**Date**: 2026-09-02  
**Facilitator**: [Name]  
**Attendees**: [List]  

## Timeline
- Deployment started: 2026-09-02 10:00 UTC+7
- Canary healthy: 2026-09-02 10:05 UTC+7
- Full rollout complete: 2026-09-02 10:15 UTC+7
- Smoke tests passed: 2026-09-02 10:18 UTC+7
- Launch declared successful: 2026-09-02 10:20 UTC+7

## Metrics (First 4 Hours)
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Error Rate | <0.5% | 0.2% | ✅ |
| Latency p95 | <2s | 1.8s | ✅ |
| CPU Usage | <70% | 45% | ✅ |
| DB Connections | <80% of max | 62% | ✅ |
| Cache Hit Rate | >80% | 85% | ✅ |

## Issues Encountered
### Issue 1: [Brief title]
- Symptoms: [What was observed]
- Root cause: [Why it happened]
- Resolution: [How it was fixed]
- Time to resolve: [Minutes]
- Prevention: [How to prevent next time]

## What Went Well
- [Point 1]
- [Point 2]
- [Point 3]

## What Could Be Better
- [Point 1]
- [Point 2]
- [Point 3]

## Action Items
| Task | Owner | Due Date | Priority |
|------|-------|----------|----------|
| [Task 1] | [Name] | [Date] | P1 |
| [Task 2] | [Name] | [Date] | P2 |

## Sign-Off
- Engineering Lead: __________ (Date: __)
- DevOps Lead: __________ (Date: __)
- On-Call: __________ (Date: __)
```

---

## 10. Phase 4 Checklist & Gate

### Deployment Checklist
- [ ] Pre-launch checklist 48h before: All items completed
- [ ] Release branch frozen: Confirmed
- [ ] Database migrations tested: Passed
- [ ] Backup & restore drill: Successful
- [ ] Monitoring dashboards: All active
- [ ] On-call team: Confirmed online
- [ ] Escalation contacts: Verified

### Deployment Execution
- [ ] Canary deployment: Successful (5 min observation)
- [ ] Progressive rollout: 50% completed without issues
- [ ] Full rollout: All replicas running
- [ ] Smoke tests: 100% pass
- [ ] Metrics: All green (error rate <0.5%, latency <2s)

### Post-Launch Monitoring
- [ ] 4-hour observation period: Completed
- [ ] Zero P0/P1 incidents: Confirmed
- [ ] Business metrics healthy: Verified
- [ ] Customer support no spike: Confirmed
- [ ] On-call team stable: Confirmed

### Post-Launch Actions
- [ ] Retrospective scheduled: [Date/Time]
- [ ] Logs preserved: /tmp/backend-logs-v1.0.0.txt, etc.
- [ ] Runbook updated with lessons learned
- [ ] Next phase (Phase 1: Observability) scheduled

---

## Phase 4 Gate

**Success Criteria**:
1. ✅ Deployment completes without rollback
2. ✅ All smoke tests pass
3. ✅ Error rate <0.5%, latency <2s for 4 hours post-launch
4. ✅ Zero P0/P1 incidents
5. ✅ Business metrics on track
6. ✅ On-call team confirms all-clear

**When complete**: Move to Phase 1 (Production Observability) or declare launch stable.

**Next Phases**:
- Phase 1: Establish continuous observability (Prometheus, Grafana, alerting refinements)
- Ongoing: Monitor, maintain, iterate on features based on user feedback

---

**Document Version**: 1.0  
**Last Updated**: 2026-09-02  
**Maintained By**: DevOps / SRE  
**Next Review**: After launch completion or 1-2 weeks post-launch
