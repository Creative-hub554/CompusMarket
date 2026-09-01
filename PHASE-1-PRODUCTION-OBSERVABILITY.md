# Phase 1: Production Observability

**Goal**: Establish continuous visibility into system health, performance, and user behavior through Prometheus metrics, Grafana dashboards, and AlertManager. Enable on-call team to detect and respond to issues before customers notice.

**Success Gate**: Prometheus scraping all services, 5+ Grafana dashboards configured, alert rules loaded, test alert delivery working, on-call team trained.

---

## 1. Prometheus Setup

### 1.1 Install & Configure Prometheus

**Option A: Kubernetes (Recommended for Production)**

```yaml
# kubernetes/prometheus-deployment.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
      external_labels:
        cluster: "champey-prod"
        environment: "production"

    # AlertManager integration
    alerting:
      alertmanagers:
      - static_configs:
        - targets:
          - alertmanager:9093

    # Alert rule files
    rule_files:
    - '/etc/prometheus/rules/*.yml'

    scrape_configs:
    # Backend API (NestJS)
    - job_name: 'backend'
      static_configs:
      - targets: ['backend-prod:3000']
      metrics_path: '/metrics'
      scrape_interval: 15s

    # Frontend (Next.js)
    - job_name: 'frontend'
      static_configs:
      - targets: ['frontend-prod:3000']
      metrics_path: '/_metrics'
      scrape_interval: 30s

    # Database (PostgreSQL exporter)
    - job_name: 'postgres'
      static_configs:
      - targets: ['postgres-exporter:9187']
      scrape_interval: 30s

    # Redis (Redis exporter)
    - job_name: 'redis'
      static_configs:
      - targets: ['redis-exporter:9121']
      scrape_interval: 30s

    # MinIO (S3-compatible storage)
    - job_name: 'minio'
      static_configs:
      - targets: ['minio:9000']
      metrics_path: '/minio/v2/metrics/cluster'
      scrape_interval: 30s

    # Node exporter (infrastructure metrics)
    - job_name: 'node'
      static_configs:
      - targets: ['node-exporter:9100']
      scrape_interval: 15s

    # Kubernetes API server (if running on K8s)
    - job_name: 'kubernetes-apiservers'
      kubernetes_sd_configs:
      - role: endpoints
      scheme: https
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: monitoring
spec:
  replicas: 2  # HA setup
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      serviceAccountName: prometheus
      containers:
      - name: prometheus
        image: prom/prometheus:latest
        args:
        - '--config.file=/etc/prometheus/prometheus.yml'
        - '--storage.tsdb.path=/prometheus'
        - '--storage.tsdb.retention.time=15d'  # 15 day retention
        - '--query.max-samples=10000000'
        ports:
        - containerPort: 9090
        resources:
          requests:
            memory: "2Gi"
            cpu: "500m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        volumeMounts:
        - name: config
          mountPath: /etc/prometheus
        - name: rules
          mountPath: /etc/prometheus/rules
        - name: storage
          mountPath: /prometheus
        livenessProbe:
          httpGet:
            path: /-/healthy
            port: 9090
          initialDelaySeconds: 30
          periodSeconds: 10
      volumes:
      - name: config
        configMap:
          name: prometheus-config
      - name: rules
        configMap:
          name: prometheus-rules
      - name: storage
        persistentVolumeClaim:
          claimName: prometheus-pvc

---
apiVersion: v1
kind: Service
metadata:
  name: prometheus
  namespace: monitoring
spec:
  type: ClusterIP
  selector:
    app: prometheus
  ports:
  - port: 9090
    targetPort: 9090

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: prometheus-pvc
  namespace: monitoring
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
```

**Install via Helm** (simpler):
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  -f prometheus-values.yaml
```

### 1.2 Backend Metrics Exposition (NestJS)

**Install Prometheus client library**:
```bash
cd apps/backend
npm install @nestjs/terminus prom-client
```

**Create metrics module**:
```typescript
// apps/backend/src/metrics/metrics.controller.ts
import { Controller, Get } from '@nestjs/common';
import { register } from 'prom-client';

@Controller('metrics')
export class MetricsController {
  @Get()
  async getMetrics() {
    return register.metrics();
  }

  @Get('health')
  async health() {
    return { status: 'ok', timestamp: new Date() };
  }
}
```

**Instrument HTTP endpoints**:
```typescript
// apps/backend/src/common/prometheus-middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Counter, Histogram } from 'prom-client';

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

@Injectable()
export class PrometheusMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const route = req.route?.path || req.path;

    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const status = res.statusCode;

      httpRequestDuration
        .labels(req.method, route, status)
        .observe(duration);

      httpRequestsTotal
        .labels(req.method, route, status)
        .inc();
    });

    next();
  }
}
```

**Register in app module**:
```typescript
// apps/backend/src/app.module.ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PrometheusMiddleware).forRoutes('*');
  }
}
```

### 1.3 Database Metrics (PostgreSQL Exporter)

**Deploy postgres_exporter**:
```bash
docker run -d \
  --name postgres-exporter \
  -e DATA_SOURCE_NAME="postgresql://user:password@postgres:5432/champey?sslmode=disable" \
  -p 9187:9187 \
  prometheuscommunity/postgres-exporter:latest
```

**Metrics exposed**:
- `pg_up`: PostgreSQL server up/down status
- `pg_connections_max`: Max allowed connections
- `pg_stat_activity_*`: Active connections, idle, waiting
- `pg_database_size_bytes`: Database size
- `pg_table_size_bytes`: Table size
- `pg_slow_queries`: Slow query log (if enabled)

### 1.4 Redis Metrics

**Deploy redis_exporter**:
```bash
docker run -d \
  --name redis-exporter \
  -e REDIS_ADDR="redis:6379" \
  -p 9121:9121 \
  oliver006/redis_exporter:latest
```

**Metrics exposed**:
- `redis_connected_clients`: Connected clients
- `redis_used_memory_bytes`: Memory usage
- `redis_evicted_keys_total`: Evicted keys (cache pressure indicator)
- `redis_keyspace_hits_total`: Cache hits
- `redis_keyspace_misses_total`: Cache misses

---

## 2. Grafana Setup

### 2.1 Install & Configure Grafana

```yaml
# kubernetes/grafana-deployment.yaml
apiVersion: v1
kind: Secret
metadata:
  name: grafana-admin
  namespace: monitoring
type: Opaque
stringData:
  admin-user: admin
  admin-password: "$(openssl rand -base64 32)"  # Generate strong password

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: monitoring
spec:
  replicas: 2  # HA
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
      - name: grafana
        image: grafana/grafana:latest
        env:
        - name: GF_SECURITY_ADMIN_USER
          valueFrom:
            secretKeyRef:
              name: grafana-admin
              key: admin-user
        - name: GF_SECURITY_ADMIN_PASSWORD
          valueFrom:
            secretKeyRef:
              name: grafana-admin
              key: admin-password
        - name: GF_USERS_ALLOW_SIGN_UP
          value: "false"
        - name: GF_INSTALL_PLUGINS
          value: "grafana-piechart-panel"
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "512Mi"
            cpu: "100m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        volumeMounts:
        - name: storage
          mountPath: /var/lib/grafana
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
      volumes:
      - name: storage
        persistentVolumeClaim:
          claimName: grafana-pvc

---
apiVersion: v1
kind: Service
metadata:
  name: grafana
  namespace: monitoring
spec:
  type: LoadBalancer  # Or NodePort / Ingress
  selector:
    app: grafana
  ports:
  - port: 3000
    targetPort: 3000

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: grafana-pvc
  namespace: monitoring
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

### 2.2 Add Prometheus Data Source

Once Grafana is running:
1. Navigate to http://grafana:3000
2. Login with admin / password from secret
3. Go to **Configuration → Data Sources**
4. Click **Add data source** → Select **Prometheus**
5. Set URL: `http://prometheus:9090`
6. Click **Save & Test** → "datasource is working"

### 2.3 Import Dashboard Templates

Import pre-built dashboards from Grafana.com:

```bash
# Via Grafana API
curl -X POST http://admin:password@grafana:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @dashboard-system-health.json
```

**Recommended dashboards to import**:
1. **Node Exporter Full** (ID: 1860) — Infrastructure metrics
2. **PostgreSQL Database** (ID: 9628) — Database health
3. **Redis Dashboard** (ID: 11835) — Cache performance
4. **Kubernetes Cluster Monitoring** (ID: 7249) — K8s metrics

---

## 3. Key Dashboards

### 3.1 System Health Dashboard

**Panels**:
1. **Uptime** (gauge): Pod running time
   - Query: `up{job="backend"}`
2. **CPU Usage** (graph): CPU % per pod
   - Query: `rate(container_cpu_usage_seconds_total[1m])`
3. **Memory Usage** (graph): Memory consumption
   - Query: `container_memory_usage_bytes / 1024 / 1024`
4. **Network I/O** (graph): Network in/out
   - Query: `rate(container_network_receive_bytes_total[1m])`
5. **Disk Usage** (gauge): Disk % used
   - Query: `node_filesystem_avail_bytes / node_filesystem_size_bytes * 100`

### 3.2 API Performance Dashboard

**Panels**:
1. **Request Rate** (graph): Requests/sec
   - Query: `rate(http_requests_total[1m])`
2. **Error Rate** (gauge): % of errors
   - Query: `rate(http_requests_total{status_code=~"5.."}[1m]) / rate(http_requests_total[1m])`
3. **Latency (p95)** (graph): 95th percentile response time
   - Query: `histogram_quantile(0.95, http_request_duration_seconds_bucket)`
4. **Status Code Distribution** (pie chart):
   - Query: `sum by (status_code) (rate(http_requests_total[1m]))`
5. **Endpoint Performance** (table): Top slow endpoints
   - Query: `topk(10, histogram_quantile(0.95, http_request_duration_seconds_bucket))`

### 3.3 Database Performance Dashboard

**Panels**:
1. **Database Size** (gauge): Total DB size in GB
   - Query: `pg_database_size_bytes / 1024 / 1024 / 1024`
2. **Active Connections** (graph): Live connection count
   - Query: `pg_stat_activity_count{state="active"}`
3. **Query Latency (p95)** (graph):
   - Query: `histogram_quantile(0.95, db_query_duration_seconds_bucket)`
4. **Slow Queries** (table): Queries >200ms
   - Query: `pg_stat_statements_mean_time{query=~"SELECT|UPDATE|DELETE"}`
5. **Connection Pool** (gauge): Used / Max connections
   - Query: `pg_stat_activity_count / pg_settings_max_connections * 100`

### 3.4 Cache Performance Dashboard

**Panels**:
1. **Cache Hit Rate** (gauge): % of cache hits
   - Query: `redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total) * 100`
2. **Memory Usage** (graph): Redis memory in MB
   - Query: `redis_used_memory_bytes / 1024 / 1024`
3. **Evicted Keys** (graph): Keys evicted due to memory
   - Query: `rate(redis_evicted_keys_total[1m])`
4. **Connected Clients** (graph): Redis clients
   - Query: `redis_connected_clients`
5. **Memory Fragmentation** (gauge): Fragmentation ratio
   - Query: `redis_mem_fragmentation_ratio`

### 3.5 Business Metrics Dashboard

**Panels** (custom instrumentation):
1. **Active Users** (gauge): Concurrent users
   - Query: `active_users_total`
2. **Conversion Rate** (gauge): Checkout success %
   - Query: `cart_checkout_success / cart_checkout_attempts * 100`
3. **Revenue** (graph): Daily revenue trend
   - Query: `increase(revenue_total[1d])`
4. **Signups** (graph): New users per day
   - Query: `increase(users_created_total[1d])`
5. **Order Volume** (graph): Orders per minute
   - Query: `rate(orders_created_total[1m])`

---

## 4. AlertManager Setup

### 4.1 Install AlertManager

```yaml
# kubernetes/alertmanager-deployment.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alertmanager-config
  namespace: monitoring
data:
  alertmanager.yml: |
    global:
      resolve_timeout: 5m
      slack_api_url: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

    route:
      receiver: 'default'
      group_by: ['alertname', 'cluster']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 12h

      # Nested routes for escalation
      routes:
      - match:
          severity: 'critical'
        receiver: 'pagerduty'
        group_wait: 0s  # Immediate for critical
        repeat_interval: 1h
      - match:
          severity: 'warning'
        receiver: 'slack-warnings'
        group_wait: 5m

    receivers:
    - name: 'default'
      slack_configs:
      - channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

    - name: 'pagerduty'
      pagerduty_configs:
      - service_key: "YOUR-PAGERDUTY-SERVICE-KEY"
        description: '{{ .GroupLabels.alertname }}'

    - name: 'slack-warnings'
      slack_configs:
      - channel: '#alerts-warning'
        title: '⚠️ {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: alertmanager
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: alertmanager
  template:
    metadata:
      labels:
        app: alertmanager
    spec:
      containers:
      - name: alertmanager
        image: prom/alertmanager:latest
        args:
        - '--config.file=/etc/alertmanager/alertmanager.yml'
        - '--storage.path=/alertmanager'
        ports:
        - containerPort: 9093
        volumeMounts:
        - name: config
          mountPath: /etc/alertmanager
        - name: storage
          mountPath: /alertmanager
      volumes:
      - name: config
        configMap:
          name: alertmanager-config
      - name: storage
        emptyDir: {}

---
apiVersion: v1
kind: Service
metadata:
  name: alertmanager
  namespace: monitoring
spec:
  type: ClusterIP
  selector:
    app: alertmanager
  ports:
  - port: 9093
    targetPort: 9093
```

### 4.2 Alert Rules

```yaml
# kubernetes/prometheus-rules.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-rules
  namespace: monitoring
data:
  alert-rules.yml: |
    groups:
    - name: application
      interval: 30s
      rules:

      # P0: Service Down
      - alert: ServiceDown
        expr: up{job="backend"} == 0
        for: 2m
        labels:
          severity: critical
          slo: "99.5%"
        annotations:
          summary: "{{ $labels.job }} is down"
          description: "{{ $labels.job }} has been down for >2 minutes"

      # P1: High Error Rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[1m]) > 0.05
        for: 2m
        labels:
          severity: warning
          slo: "99.5%"
        annotations:
          summary: "High error rate on {{ $labels.job }}"
          description: "Error rate is {{ $value | humanizePercentage }} (target: <0.5%)"

      # P2: High Latency
      - alert: HighLatency
        expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API latency on {{ $labels.job }}"
          description: "p95 latency is {{ $value }}s (target: <2s)"

      # P3: Database Connection Pool Exhaustion
      - alert: DBConnectionPoolHigh
        expr: pg_stat_activity_count / pg_settings_max_connections > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Database connection pool >80% on {{ $labels.instance }}"
          description: "{{ $value | humanizePercentage }} of connections in use"

      # P3: Disk Space Running Low
      - alert: DiskSpaceRunningLow
        expr: node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Low disk space on {{ $labels.device }}"
          description: "Only {{ $value | humanizePercentage }} free"

      # P2: Cache Evictions High
      - alert: RedisMemoryPressure
        expr: rate(redis_evicted_keys_total[1m]) > 10
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Redis evicting keys due to memory pressure"
          description: "Eviction rate: {{ $value }} keys/sec"

      # P1: Database Slow Queries
      - alert: SlowDatabaseQueries
        expr: histogram_quantile(0.95, db_query_duration_seconds_bucket) > 0.2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow database queries detected"
          description: "p95 query latency: {{ $value }}s (target: <200ms)"
```

---

## 5. Testing Observability

### 5.1 Test Prometheus Scraping

```bash
# Verify Prometheus can reach targets
curl http://prometheus:9090/api/v1/targets

# Expected: All targets show "UP" status
# {
#   "status": "success",
#   "data": {
#     "activeTargets": [
#       { "labels": { "job": "backend", "instance": "backend-prod:3000" }, "state": "up" }
#     ]
#   }
# }
```

### 5.2 Test Alert Delivery

```bash
# Trigger a test alert via AlertManager API
curl -X POST http://alertmanager:9093/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[{
    "labels": {
      "alertname": "TestAlert",
      "severity": "warning"
    },
    "annotations": {
      "summary": "Test alert — should appear in Slack",
      "description": "This is a test"
    },
    "generatorURL": "http://prometheus:9090"
  }]'

# Verify alert appears in Slack channel within 30 seconds
```

### 5.3 Test Grafana Dashboards

1. Log into Grafana (http://grafana:3000)
2. Navigate to each dashboard
3. Verify panels load data (not red "No data" errors)
4. Test alert notification:
   - Go to Alerts menu
   - Verify alert rules are loaded
   - Manually trigger a test notification

---

## 6. Exporter Installation Checklist

- [ ] Prometheus deployment: Deployed and scraping
- [ ] NestJS metrics exporter: Installed and exposing /metrics
- [ ] PostgreSQL exporter: Running, scraping database
- [ ] Redis exporter: Running, scraping cache
- [ ] Node exporter: Running on all nodes
- [ ] Grafana deployment: Running, connected to Prometheus
- [ ] System Health dashboard: Loaded and showing data
- [ ] API Performance dashboard: Loaded and showing data
- [ ] Database Performance dashboard: Loaded and showing data
- [ ] Cache Performance dashboard: Loaded and showing data
- [ ] Business Metrics dashboard: Loaded and showing data
- [ ] AlertManager deployment: Running, configured
- [ ] Alert rules loaded: Verified in Prometheus
- [ ] Test alert delivered: Slack/PagerDuty received notification
- [ ] On-call team trained: Can navigate dashboards and interpret metrics

---

## 7. On-Call Training

### 7.1 Dashboard Navigation
```
Scenario: Customer reports slow site

Steps:
1. Open Grafana: http://grafana:3000
2. Go to "API Performance" dashboard
3. Check "Latency (p95)" panel:
   - If >2s: Site is slow ✓
   - If <2s: Slow client-side (check Frontend Performance dashboard)
4. Check "Error Rate" panel:
   - If >0.5%: Errors may be slowing down responses
5. Check "Database Performance" dashboard:
   - Query latency: >200ms? Slow queries
   - Connection pool: >80%? Connection exhaustion
6. If all metrics normal: Issue is likely external (CDN, load balancer, ISP)
```

### 7.2 Interpreting Alert Severity

| Severity | Response Time | Escalation | Example |
|----------|---------------|-------------|---------|
| P0 (Critical) | <5 min | Page on-call immediately | Service down, error rate >5% |
| P1 (High) | 15 min | Notify eng lead, investigate | Error rate >2%, latency >5s |
| P2 (Medium) | 2 hours | Post in Slack, investigate async | Error rate >0.5%, slow queries |
| P3 (Low) | 24 hours | Track for next sprint | Minor performance dips |

### 7.3 Common Dashboard Queries

**Cheat sheet for on-call team**:

```
# "Service is down"
1. Check System Health dashboard → Uptime gauge
2. kubectl get pods -l app=backend (any CrashLoopBackOff?)
3. Check backend logs: kubectl logs deployment/backend-prod

# "Site is slow"
1. API Performance → Latency (p95)
2. Database Performance → Query latency
3. Cache Performance → Eviction rate
4. Infrastructure → CPU/Memory usage

# "Error rate spiking"
1. API Performance → Error Rate gauge
2. API Performance → Status Code Distribution
3. Backend logs: kubectl logs -l app=backend | grep -i error
4. Check for recent deployments: kubectl rollout history deployment/backend-prod

# "Out of disk space"
1. System Health → Disk Usage gauge
2. kubectl get pv (check storage claims)
3. Clear old logs: kubectl exec deployment/backend-prod -- rm /logs/*.old
4. Escalate: "Disk cleanup done; if issue persists, need more storage"
```

---

## 8. Continuous Observability Improvements

### 8.1 Week 1 Post-Launch
- Validate all dashboards have data (no red errors)
- Confirm alerts firing and routing correctly
- Train on-call team on alert response
- Add custom application metrics (business KPIs)

### 8.2 Month 1
- Review alert thresholds (tuning to reduce false positives)
- Analyze logs for patterns (slow endpoints, recurring errors)
- Identify gaps (missing instrumentation) and add exporters
- Establish baseline metrics for SLO tracking

### 8.3 Quarterly
- Audit dashboard relevance (remove unused, add new ones)
- Test disaster recovery scenario (restore from backup, verify metrics)
- Review on-call runbooks (ensure up-to-date)
- Capacity planning (disk, CPU, memory trends over 3 months)

---

## 9. Phase 1 Checklist & Gate

### Prometheus
- [ ] Prometheus deployed and running (2 replicas)
- [ ] All 6 jobs scraping successfully (backend, frontend, postgres, redis, minio, node)
- [ ] Metrics retention: 15 days
- [ ] Storage: 100 GB allocated

### Grafana
- [ ] Grafana deployed and accessible
- [ ] Prometheus data source connected and tested
- [ ] 5 dashboards imported and displaying data:
  - [ ] System Health
  - [ ] API Performance
  - [ ] Database Performance
  - [ ] Cache Performance
  - [ ] Business Metrics

### AlertManager
- [ ] AlertManager deployed and running
- [ ] Slack/PagerDuty webhook configured
- [ ] 8 alert rules loaded (p0-p3)
- [ ] Test alert successfully delivered

### Training & Documentation
- [ ] On-call team trained on dashboard navigation
- [ ] Runbook updated with alert response procedures
- [ ] Alert severity matrix documented (p0-p3)
- [ ] On-call team confirmed ready

---

## Phase 1 Gate

**Success Criteria**:
1. ✅ Prometheus scraping 6+ services continuously
2. ✅ 5 Grafana dashboards configured and displaying live data
3. ✅ AlertManager delivering alerts to Slack/PagerDuty
4. ✅ On-call team trained and confirmed ready
5. ✅ All documented in runbooks and accessible to team

**When complete**: Production observability established. Ready for launch.

---

**Document Version**: 1.0  
**Last Updated**: 2026-09-02  
**Maintained By**: DevOps / SRE  
**Next Review**: 1 week post-launch (tuning and gap identification)
