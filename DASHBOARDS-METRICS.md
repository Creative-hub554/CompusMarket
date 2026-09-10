# Metrics, Dashboards, and Alerting Guide

## Overview

This document defines key performance indicators (KPIs), service-level objectives (SLOs),
dashboard layouts, and alerting rules for www.champey.com. Effective monitoring enables
rapid incident detection and data-driven operational decisions.

**Monitoring stack:** Prometheus (metrics), Grafana (dashboards), AlertManager (alerts)
- Alternative: Datadog, New Relic, CloudWatch (managed services)

---

## 1. Service-Level Objectives (SLOs)

### Availability SLO

**Target:** 99.5% uptime (43.2 minutes downtime per month allowed)

**Definition:** HTTP 2xx or 3xx responses from production endpoints (frontend, backend, admin)

**Calculation:**
```
Uptime % = (Successful requests) / (Total requests) × 100
```

**Measurement:**
- Probe health endpoint every 30 seconds from 3 geographic locations.
- Backend: `GET /api/health` → `{ "status": "ok" }`
- Frontend: Page load time <3 seconds
- Admin: Page load time <3 seconds

**Alerting:** If uptime drops below 99%, notify ops lead within 5 minutes.

---

### Performance SLO

**Target:** 95th percentile latency <2s (frontend), <500ms (API)

**Definitions:**
- **Frontend latency:** Time from user clicking link to fully rendered page (DOMContentLoaded + render)
- **API latency:** Time from request received to response sent (excluding network)

**Measurement:**
```
p95_latency = 95th percentile of all request durations in 5-minute window
```

**Alerting:** If p95 latency exceeds threshold for >5 minutes, notify backend lead.

---

### Error Rate SLO

**Target:** <0.5% of requests result in 5xx errors

**Definition:** (5xx responses) / (total responses) × 100

**Measurement:**
```
error_rate = (Sum of 5xx responses) / (Sum of all responses) × 100
```

**Alerting:** If error rate >0.5% for >2 minutes, notify backend lead.

---

### Customer Experience Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Page load time (p95) | <2s | Real User Monitoring (RUM) |
| Checkout success rate | >98% | (Completed orders) / (checkout sessions) |
| Search result time (p95) | <500ms | Query response from Meilisearch + render |
| Cart reliability | >99.5% | Add-to-cart success rate |
| Authentication success | >99.9% | Login/register success rate |
| Product image load | <1.5s (p95) | MinIO + CDN delivery time |

---

## 2. Key Metrics to Track

### Application Metrics (Backend)

#### Throughput
- **Metric name:** `http_requests_total`
- **Labels:** method, endpoint, status_code
- **Query:** `rate(http_requests_total[5m])`
- **Target:** Baseline established (e.g., 500 req/s average, 5000 peak)

#### Latency
- **Metric name:** `http_request_duration_seconds`
- **Labels:** method, endpoint
- **Queries:**
  ```
  histogram_quantile(0.95, http_request_duration_seconds) # p95
  histogram_quantile(0.99, http_request_duration_seconds) # p99
  ```
- **Targets:** p95 <500ms (API), p99 <1s

#### Errors
- **Metric name:** `http_requests_total` filtered by `status_code="5xx"`
- **Query:** `sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))`
- **Target:** <0.5%

#### Database Performance
- **Metric name:** `db_query_duration_seconds`
- **Labels:** query_type (SELECT, INSERT, UPDATE, DELETE)
- **Queries:**
  ```
  histogram_quantile(0.95, db_query_duration_seconds) # p95
  ```
- **Targets:**
  - SELECT: p95 <100ms
  - INSERT/UPDATE: p95 <50ms
  - DELETE: p95 <50ms

#### Failed Jobs
- **Metric name:** `background_job_failures_total`
- **Labels:** job_type, error_type
- **Query:** `rate(background_job_failures_total[1h])`
- **Target:** <5 failures per hour (context-dependent)

#### Cache Hit Rate
- **Metric name:** `redis_hits_total`, `redis_misses_total`
- **Query:** `redis_hits_total / (redis_hits_total + redis_misses_total)`
- **Target:** >80% (session cache), >70% (query cache)

#### Search Indexing Lag
- **Metric name:** `search_indexing_lag_seconds`
- **Target:** <5 minutes (Meilisearch should re-index within 5 minutes of data change)

### Infrastructure Metrics

#### CPU
- **Metric name:** `node_cpu_usage_percent` (or `container_cpu_usage_seconds_total`)
- **Target:** <70% average, <85% p95

#### Memory
- **Metric name:** `node_memory_usage_percent` (or `container_memory_usage_bytes`)
- **Target:** <80% average, <90% p95

#### Disk
- **Metric name:** `node_filesystem_avail_bytes`
- **Target:** Keep >15% free space (alert at 80% full)

#### Network I/O
- **Metric name:** `node_network_transmit_bytes_total`, `node_network_receive_bytes_total`
- **Target:** Monitor for unusual spikes (potential DDoS or data exfiltration)

### Database Metrics

#### Connections
- **Metric name:** `pg_stat_activity_count` (PostgreSQL)
- **Target:** Keep active connections <80% of max_connections

#### Slow Queries
- **Metric name:** Queries taking >1 second logged to PostgreSQL slow query log
- **Target:** <10 slow queries per hour

#### Replication Lag (if applicable)
- **Metric name:** `pg_last_xact_replay_timestamp_seconds` (replica)
- **Target:** <1 second replication lag

#### Disk Usage
- **Metric name:** Database size in bytes
- **Query:** `SELECT pg_database_size('champey_prod') / 1024^3 AS size_gb;`
- **Target:** Monitor growth; plan upgrade at 70% of storage

### Storage Metrics (MinIO)

#### Bucket Usage
- **Metric name:** `minio_bucket_usage_bytes`
- **Target:** Monitor growth; alert at 75% capacity

#### Upload Success Rate
- **Metric name:** Upload requests total vs. upload failures
- **Target:** >99.5% success

#### Access Patterns
- **Metric name:** GET vs. PUT vs. DELETE operations per minute
- **Target:** Baseline established; alert on unusual spikes

### User and Business Metrics

#### Active Users
- **Metric name:** `active_users_concurrent` (from session/auth logs)
- **Query:** Count of sessions with activity in last 5 minutes
- **Target:** Baseline established (e.g., 100–500 concurrent during peak)

#### User Registrations
- **Metric name:** `user_registrations_total` (daily)
- **Target:** Trending (baseline + growth rate)

#### Orders and Revenue
- **Metric name:** `orders_total`, `revenue_total`
- **Labels:** status (pending, completed, failed, refunded)
- **Target:** Trending (baseline + growth rate)

#### Seller Activity
- **Metric name:** `seller_products_created_total`, `seller_products_updated_total`
- **Target:** Trending

#### Support Tickets
- **Metric name:** `support_tickets_total`, `support_tickets_open`
- **Labels:** category (auth, checkout, seller, community, technical)
- **Target:** Open tickets <20 (adjust based on team capacity)

---

## 3. Grafana Dashboard Layouts

### Dashboard 1: System Health (Overview)

**Update interval:** 30 seconds

**Panels**

1. **Status Card** (top left)
   - Uptime indicator: 🟢 99.8% | 🟡 98.5% | 🔴 96.2%
   - Query: `(1 - (rate(probe_failures_total[5m]) / rate(probe_total[5m]))) * 100`

2. **Availability by Service** (top center, 3 gauges)
   - Frontend uptime: 🟢
   - Backend uptime: 🟢
   - Admin uptime: 🟢

3. **Error Rate** (top right, large gauge)
   - Current: `0.2%` (red if >0.5%)
   - Query: Error rate calculation

4. **Request Latency (3 graphs)**
   - Frontend load time (p95, p99)
   - API latency (p95, p99)
   - Database query latency (p95)

5. **Throughput (graph)**
   - Requests per second (frontend, API, admin)
   - Color-coded by service

6. **Active Users (gauge)**
   - Current concurrent users: `247`
   - Peak today: `1,234`

7. **System Resources (3 gauges)**
   - CPU: `45%`
   - Memory: `62%`
   - Disk: `58%`

8. **Database Health (4 metrics)**
   - Active connections: `12/25`
   - Replication lag: `0.1s` (green if <1s)
   - Cache hit rate: `84%` (green if >80%)
   - Slow queries (1h): `3` (green if <10)

---

### Dashboard 2: API Performance (Backend Team)

**Update interval:** 1 minute

**Panels**

1. **Endpoint Performance** (top, heat map)
   - Y-axis: Endpoints (grouped by module: products, orders, auth, search, etc.)
   - X-axis: Time (now - 6h)
   - Color intensity: Latency (green <100ms, yellow <500ms, red >500ms)

2. **Error Rate by Endpoint** (graph)
   - Lines for each major endpoint
   - Alert line at 0.5%

3. **Database Queries** (table)
   - Top 10 slowest queries (average duration)
   - Columns: Query, Avg latency, Max latency, Call count (1h)

4. **Background Jobs** (3 panels)
   - Jobs succeeded (1h): `12,345`
   - Jobs failed (1h): `23`
   - Failure rate: `0.19%`

5. **Cache Efficiency** (gauge + graph)
   - Overall hit rate: `82%`
   - Redis memory usage: `1.2 GB / 2 GB`
   - Eviction rate: `0 evictions/min`

6. **Search (Meilisearch)** (3 metrics)
   - Indexing lag: `2.3 minutes`
   - Query response time (p95): `145ms`
   - Index size: `250 MB`

---

### Dashboard 3: Frontend Performance (Frontend Team)

**Update interval:** 1 minute

**Panels**

1. **Page Load Time (p95)** (graph, 24h)
   - Lines for: homepage, product listing, product detail, checkout
   - Alert line at 2s

2. **Core Web Vitals** (3 cards)
   - LCP (Largest Contentful Paint): `1.2s` (green if <2.5s)
   - FID (First Input Delay): `45ms` (green if <100ms)
   - CLS (Cumulative Layout Shift): `0.08` (green if <0.1)

3. **Error Tracking** (graph)
   - JavaScript errors per minute
   - API request errors per minute
   - Alert line at baseline + 50%

4. **Browser Compatibility** (pie chart)
   - Chrome, Safari, Firefox, Edge (% of pageviews)

5. **Device Breakdown** (pie chart)
   - Mobile, tablet, desktop (% of pageviews)

6. **Checkout Funnel** (funnel chart)
   - Views product: `10,000`
   - Add to cart: `2,500` (25%)
   - Start checkout: `2,200` (88%)
   - Complete order: `2,100` (95%)

---

### Dashboard 4: Infrastructure (DevOps)

**Update interval:** 30 seconds

**Panels**

1. **CPU & Memory (stacked area)**
   - Backend pods: CPU + Memory
   - Frontend pods: CPU + Memory
   - Admin pods: CPU + Memory
   - Database: CPU + Memory

2. **Disk Usage (stacked bar)**
   - Database: `580 GB / 1 TB` (red if >800 GB)
   - MinIO: `420 GB / 500 GB` (red if >375 GB)
   - Backup storage: `150 GB / 500 GB`

3. **Network** (graph)
   - Inbound traffic (Mbps)
   - Outbound traffic (Mbps)

4. **Pod Restarts (24h)** (number)
   - Backend: `0` (red if >0)
   - Frontend: `0`
   - Admin: `0`

5. **Storage Replication (3 gauges)**
   - Database replication lag: `0.1s` (green if <1s)
   - MinIO replication status: `In sync` (green/red)
   - Backup status: `Last backup 1h ago` (green if <24h)

---

### Dashboard 5: User and Business Metrics

**Update interval:** 5 minutes

**Panels**

1. **Key Metrics (cards)**
   - Active users (24h): `1,234`
   - New users (24h): `45`
   - Orders (24h): `234`
   - Revenue (24h): `$12,345` (if applicable)

2. **User Trends (graph, 30d)**
   - Daily active users (trending up)
   - Daily new registrations
   - Daily orders

3. **Orders by Status** (pie chart)
   - Completed: `85%`
   - Pending: `10%`
   - Failed: `3%`
   - Refunded: `2%`

4. **Seller Activity (graph, 7d)**
   - Products created
   - Products updated
   - Seller registrations

5. **Support Tickets (table)**
   - Open by category (auth, checkout, seller, community, technical)
   - Oldest ticket age
   - Average resolution time

6. **Community Activity (graph, 7d)**
   - Posts created
   - Comments
   - User follows

---

## 4. Alert Rules

### Critical Alerts (P0) — Trigger immediately

**Rule 1: High error rate**
```
alert: HighErrorRate
expr: |
  (sum(rate(http_requests_total{status_code=~"5.."}[5m])) 
   / sum(rate(http_requests_total[5m]))) > 0.01
for: 2m
labels:
  severity: critical
  team: backend
annotations:
  summary: "Error rate >1%"
  description: "{{ $value | humanizePercentage }} errors in last 5 min"
  runbook: "RUNBOOK.md#high-error-rate"
```

**Rule 2: Service down**
```
alert: ServiceDown
expr: probe_success == 0
for: 1m
labels:
  severity: critical
  team: infrastructure
annotations:
  summary: "{{ $labels.service }} is down"
  description: "Health check failed for 1 minute"
  runbook: "RUNBOOK.md#service-down"
```

**Rule 3: Database connection pool exhausted**
```
alert: DatabaseConnectionPoolExhausted
expr: pg_stat_activity_count >= (pg_setting_max_connections * 0.95)
for: 2m
labels:
  severity: critical
  team: backend
annotations:
  summary: "Database connection pool near capacity"
  description: "{{ $value }} of {{ $labels.max_connections }} connections in use"
  runbook: "RUNBOOK.md#db-connection-exhaustion"
```

### High Priority Alerts (P1) — Notify within 15 minutes

**Rule 4: High latency**
```
alert: HighLatency
expr: histogram_quantile(0.95, http_request_duration_seconds) > 1
for: 5m
labels:
  severity: high
  team: backend
annotations:
  summary: "API latency p95 > 1s"
  description: "Current p95: {{ $value }}s"
  runbook: "RUNBOOK.md#high-latency"
```

**Rule 5: Disk space critical**
```
alert: DiskSpaceCritical
expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.15
for: 5m
labels:
  severity: high
  team: infrastructure
annotations:
  summary: "Disk {{ $labels.device }} only {{ $value | humanizePercentage }} free"
  description: "Disk {{ $labels.mountpoint }} is {{ printf "%.0f" (100 - $value * 100) }}% full"
  runbook: "RUNBOOK.md#disk-space-critical"
```

**Rule 6: Cache eviction rate high**
```
alert: CacheEvictionHigh
expr: rate(redis_evicted_keys_total[5m]) > 100
for: 10m
labels:
  severity: high
  team: backend
annotations:
  summary: "Redis evicting >100 keys/min"
  description: "Possible memory pressure"
  runbook: "RUNBOOK.md#cache-eviction-high"
```

### Medium Priority Alerts (P2) — Include in daily review

**Rule 7: Backup failed**
```
alert: BackupFailed
expr: time() - backup_last_success_time > 86400
for: 0m
labels:
  severity: medium
  team: infrastructure
annotations:
  summary: "No successful backup in >24 hours"
  description: "Last success: {{ $value }} seconds ago"
  runbook: "RUNBOOK.md#backup-failed"
```

**Rule 8: Slow query rate high**
```
alert: SlowQueryRateHigh
expr: rate(pg_slow_queries_total[1h]) > 10
for: 15m
labels:
  severity: medium
  team: backend
annotations:
  summary: "Slow queries >10/hour"
  description: "Current rate: {{ $value | humanize }}/hour"
  runbook: "RUNBOOK.md#slow-query-rate-high"
```

---

## 5. Alert Routing and Notifications

### Notification Channels

| Alert severity | Channel | Escalation | Response time |
|---|---|---|---|
| P0 (Critical) | PagerDuty + SMS + Slack | On-call lead + team | 5 min |
| P1 (High) | Slack + email | Team lead | 15 min |
| P2 (Medium) | Slack + email | Team lead | 4 hours |
| P3 (Low) | Email | Team | Next business day |

### Slack Alert Examples

**P0 Alert**
```
:red_circle: CRITICAL: Database connection pool exhausted
Service: Backend
Status: Down (1 minute)
Details: 24/25 connections in use
Runbook: RUNBOOK.md#db-connection-exhaustion
On-call engineer paged. React with :eyes: to acknowledge.
```

**P1 Alert**
```
:orange_circle: HIGH: API latency p95 > 1s
Service: Backend
Duration: 5 minutes
Current p95: 1.2s (threshold: 0.5s)
Runbook: RUNBOOK.md#high-latency
```

### Alert Fatigue Prevention

1. **Group related alerts**
   - If service is down, silence latency/error alerts for that service (they're redundant).

2. **Adjust thresholds seasonally**
   - Increase thresholds during known high-traffic events (sales, holidays).

3. **Review alert noise weekly**
   - Track false positive rate for each alert rule.
   - Adjust threshold if false positive rate >20%.

4. **Snooze mechanism**
   - Acknowledged alerts can be snoozed for 1 hour.
   - Don't snooze P0 alerts without active mitigation.

---

## 6. Metrics Export and Retention

### Prometheus Configuration

```yaml
global:
  scrape_interval: 30s
  evaluation_interval: 30s
  retention: 15d  # Keep 15 days of metrics

scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['localhost:4000']
    metrics_path: '/metrics'

  - job_name: 'frontend'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'

  - job_name: 'postgresql'
    static_configs:
      - targets: ['localhost:9187']  # postgres-exporter

  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']  # node-exporter
```

### Long-term Storage

- **Retention:** 15 days in Prometheus (hot)
- **Archival:** Daily snapshots to S3 (cold storage) for 1 year
- **Query:** Use Grafana Loki or similar for historical data queries

---

## 7. Checklist for Go-Live

- [ ] Prometheus scrape config created for all services.
- [ ] Grafana dashboards designed and tested (5 main dashboards).
- [ ] All SLO targets defined and reviewed.
- [ ] Alert rules created for P0, P1, P2, P3 categories.
- [ ] Notification channels configured (PagerDuty, Slack, email).
- [ ] On-call rotation and escalation defined.
- [ ] Runbooks written for each alert (link from alert annotations).
- [ ] Team trained on alert acknowledgment and response.
- [ ] Baseline metrics established (throughput, latency, errors).
- [ ] Alert testing procedure documented.
- [ ] Weekly alert review process added to OPERATIONS.md.
