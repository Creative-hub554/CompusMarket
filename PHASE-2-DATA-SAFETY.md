# Phase 2: Validate Production Data Safety

Ensure that www.champey.com can reliably restore from backups and recover data
in a disaster scenario. This phase validates database migrations, backup infrastructure,
and documented recovery procedures.

---

## 1. PostgreSQL Migration Verification

### Objective

Confirm that Prisma migrations are:
- Versioned and reproducible (version control tracked)
- Can restore a clean database to current state
- Can be rolled back and re-applied without errors
- Work for both initial setup and ongoing changes

### Pre-launch Checklist

**Git history:**
```bash
# 1. Verify all migrations are committed
cd packages/database
git log prisma/migrations/ | head -20
# Should show dated commits, e.g.:
#   feat: add warranty claims schema
#   refactor: add indexing for order lookups
```

**Migration files:**
```bash
# 2. List all migrations
ls -la prisma/migrations/
# Should see: TIMESTAMP_description/migration.sql files
# Example:
#   20260701120000_init/migration.sql
#   20260715083015_add_warranty_table/migration.sql
#   20260820154200_add_seller_inventory/migration.sql
```

**Database baseline:**
```bash
# 3. Check if database has a recorded baseline
# This is the initial migration that captures the pre-Prisma schema
# If not, create one:
pnpm exec prisma migrate resolve --applied 20260701120000_init
```

### Test 1: Fresh Database Setup (15 min)

**Goal:** Verify migrations can build a clean database from scratch.

```bash
# 1. Create temporary test database
DATABASE_URL="postgresql://postgres:password@localhost/champey_test" \
pnpm exec prisma db push --force-reset
# Or if using migrations (recommended):
DATABASE_URL="postgresql://postgres:password@localhost/champey_test" \
pnpm exec prisma migrate deploy

# 2. Verify schema matches production
# Compare table counts
PROD_TABLES=$(psql -h prod.db.champey.com -U admin -d champey_prod -c \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'" -t)
TEST_TABLES=$(psql -h localhost -U postgres -d champey_test -c \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'" -t)
echo "Production tables: $PROD_TABLES"
echo "Test tables: $TEST_TABLES"
# Should be equal

# 3. Verify key tables exist
pnpm exec prisma studio # Open UI and spot-check tables: users, products, orders, etc.

# 4. Cleanup
dropdb -U postgres champey_test
```

### Test 2: Migration Rollback and Reapply (20 min)

**Goal:** Verify migrations can be rolled back and re-applied without corruption.

```bash
# 1. Create test database and apply all migrations
DATABASE_URL="postgresql://postgres:password@localhost/champey_test" \
pnpm exec prisma migrate deploy

# 2. Insert test data
psql -h localhost -U postgres -d champey_test <<EOF
INSERT INTO users (email, name, password_hash) VALUES ('test@example.com', 'Test User', 'hash');
INSERT INTO products (name, price, category_id) VALUES ('Test Product', 9.99, 1);
EOF

# 3. Count rows before rollback
BEFORE_USERS=$(psql -h localhost -U postgres -d champey_test -c \
  "SELECT count(*) FROM users" -t)
BEFORE_PRODUCTS=$(psql -h localhost -U postgres -d champey_test -c \
  "SELECT count(*) FROM products" -t)
echo "Before rollback - Users: $BEFORE_USERS, Products: $BEFORE_PRODUCTS"

# 4. Rollback last migration
DATABASE_URL="postgresql://postgres:password@localhost/champey_test" \
pnpm exec prisma migrate resolve --rolled-back <migration-timestamp>

# 5. Reapply migration
DATABASE_URL="postgresql://postgres:password@localhost/champey_test" \
pnpm exec prisma migrate deploy

# 6. Verify data integrity
AFTER_USERS=$(psql -h localhost -U postgres -d champey_test -c \
  "SELECT count(*) FROM users" -t)
AFTER_PRODUCTS=$(psql -h localhost -U postgres -d champey_test -c \
  "SELECT count(*) FROM products" -t)
echo "After rollback + reapply - Users: $AFTER_USERS, Products: $AFTER_PRODUCTS"

# Should match:
test "$BEFORE_USERS" -eq "$AFTER_USERS" && echo "✓ Users preserved" || echo "✗ Data corruption!"
test "$BEFORE_PRODUCTS" -eq "$AFTER_PRODUCTS" && echo "✓ Products preserved" || echo "✗ Data corruption!"

# 7. Cleanup
dropdb -U postgres champey_test
```

### Test 3: Upgrade Path (Production-like) (30 min)

**Goal:** Simulate applying pending migrations to production without data loss.

```bash
# 1. Backup current production database
BACKUP_FILE="champey_prod_$(date +%Y%m%d_%H%M%S).sql.gz"
PGPASSWORD="$PROD_DB_PASSWORD" pg_dump \
  -h prod.db.champey.com \
  -U admin \
  -d champey_prod \
  | gzip > "/backups/$BACKUP_FILE"

# 2. Restore backup to staging
STAGING_URL="postgresql://postgres:password@staging.db.champey.com/champey_staging"
gunzip -c "/backups/$BACKUP_FILE" | \
PGPASSWORD="password" psql \
  -h staging.db.champey.com \
  -U postgres \
  -d champey_staging

# 3. Run any pending migrations on staging
DATABASE_URL="$STAGING_URL" pnpm exec prisma migrate deploy
# If errors, debug and fix in dev environment first

# 4. Run data integrity checks
psql -h staging.db.champey.com -U postgres -d champey_staging <<EOF
-- Check for orphaned records
SELECT count(*) as orphaned_orders FROM orders o 
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = o.user_id);
-- Should return 0

-- Check data counts match production (within 1–2 rows)
SELECT 'users' as table_name, count(*) as count FROM users
UNION ALL SELECT 'products', count(*) FROM products
UNION ALL SELECT 'orders', count(*) FROM orders;
EOF

# 5. If all checks pass, note the migration readiness
echo "✓ Migration verified on staging. Ready for production."

# 6. Cleanup staging database
psql -h staging.db.champey.com -U postgres -c "DROP DATABASE champey_staging;"
```

### Post-Launch: Ongoing Migration Hygiene

**After every migration to production:**
```bash
# 1. Verify migration was applied
psql -h prod.db.champey.com -U admin -d champey_prod -c \
  "SELECT version FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 1;"

# 2. Run sanity checks
psql -h prod.db.champey.com -U admin -d champey_prod <<EOF
-- Quick table existence check
SELECT count(*) FROM information_schema.tables WHERE table_schema='public';
-- Verify no integrity violations
SELECT count(*) FROM orders WHERE user_id IS NULL; -- Should be 0
EOF

# 3. Commit to git
git add prisma/migrations/
git commit -m "chore: migrate production to [TIMESTAMP]_[description]"
```

---

## 2. Automated Backup Schedule

### Database Backup Configuration

**Daily PostgreSQL backup:**

```bash
# File: scripts/backup-postgres.sh (already created in BACKUP-DRILLS.md)
# Schedule: Cron or cloud scheduler, daily at 02:00 UTC
```

**Cron job setup (Kubernetes CronJob):**

```yaml
# File: k8s/cronjob-backup-postgres.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-postgres
  namespace: champey-prod
spec:
  schedule: "0 2 * * *"  # Daily 02:00 UTC (low-traffic window)
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: backup-service
          containers:
          - name: backup
            image: champey/postgres-backup:latest
            env:
            - name: DATABASE_HOST
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: host
            - name: DATABASE_PORT
              value: "5432"
            - name: DATABASE_USER
              value: "postgres"
            - name: DATABASE_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
            - name: DATABASE_NAME
              value: "champey_prod"
            - name: S3_BUCKET
              value: "champey-backups"
            - name: S3_REGION
              value: "us-east-1"
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: access-key
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: secret-key
            command:
            - /bin/bash
            - -c
            - /scripts/backup-postgres.sh
          restartPolicy: OnFailure
          backoffLimit: 3
```

**Alerting on backup failure:**

```yaml
# Prometheus alert rule
alert: BackupFailed
expr: time() - backup_last_success_time_seconds > 86400
for: 1m
labels:
  severity: high
annotations:
  summary: "PostgreSQL backup has not succeeded in >24 hours"
  description: "Last successful backup: {{ $value | humanizeDuration }} ago"
  runbook: "RUNBOOK.md#backup-failed"
```

### MinIO Backup Configuration

**Continuous replication (if available):**

```yaml
# MinIO bucket replication (requires 2 MinIO instances)
apiVersion: v1
kind: ConfigMap
metadata:
  name: minio-replication-config
data:
  replication-policy: |
    {
      "Role": "arn:aws:iam::123456789012:role/minio-replication",
      "Rules": [
        {
          "Status": "enabled",
          "Priority": 1,
          "DeleteMarker": true,
          "Filter": {"Prefix": ""},
          "Destination": {
            "Bucket": "arn:aws:s3:::champey-backups-secondary"
          }
        }
      ]
    }
```

**Manual backup of MinIO (if replication not available):**

```bash
# Daily sync to S3 (already configured in BACKUP-DRILLS.md)
aws s3 sync s3://champey-prod/uploads s3://champey-backups/minio-uploads/ \
  --region us-east-1 \
  --storage-class GLACIER_IR  # Cold storage for cost
```

### Backup Retention Policy

| System | Retention | Storage Class | Cost |
|--------|-----------|---|---|
| PostgreSQL (daily full) | 30 days | S3 Standard | ~$0.023/GB |
| PostgreSQL (incremental) | 7 days | S3 Standard | ~$0.010/GB |
| MinIO (continuous sync) | 30 days | S3 Glacier IR | ~$0.004/GB |
| Application logs | 7 days | CloudWatch | ~$0.50/GB |

**Estimated monthly backup cost** (100 GB database, 500 GB MinIO):
- PostgreSQL: 100 GB × $0.023 = $2.30
- MinIO: 500 GB × $0.004 = $2.00
- Logs: 50 GB × $0.50 = $25.00
- **Total: ~$30–40/month**

### Backup Verification

**Weekly check (included in OPERATIONS.md weekly review):**

```bash
# 1. Verify latest backup exists
aws s3 ls s3://champey-backups/postgres-backups/ --human-readable | tail -1

# 2. Check backup age
BACKUP_DATE=$(aws s3 ls s3://champey-backups/postgres-backups/ --human-readable | tail -1 | awk '{print $1}')
DAYS_OLD=$(( ($(date +%s) - $(date -d "$BACKUP_DATE" +%s)) / 86400 ))
if [ $DAYS_OLD -le 1 ]; then echo "✓ Backup current"; else echo "✗ Backup stale ($DAYS_OLD days old)"; fi

# 3. Verify backup size is reasonable (should be >100 MB)
BACKUP_SIZE=$(aws s3 ls s3://champey-backups/postgres-backups/ --human-readable | tail -1 | awk '{print $5}')
echo "Latest backup size: $BACKUP_SIZE"
```

---

## 3. Recovery Point Objective (RPO) and Recovery Time Objective (RTO)

### Definitions

**RPO (Recovery Point Objective):** Maximum acceptable data loss (time between last backup and incident)

**RTO (Recovery Time Objective):** Maximum acceptable downtime (time to restore and resume service)

### www.champey.com Targets

| System | RPO | RTO | Justification |
|--------|-----|-----|---|
| Database | 4 hours | 1 hour | Critical business data; daily backup + hourly replication log |
| MinIO (files) | 24 hours | 2 hours | Non-critical user uploads; replication lag acceptable |
| Redis (cache) | N/A | <5 min | Ephemeral; rebuild on restart |
| Application config | 1 hour | 15 min | Manual backup on changes |

### Achieving RPO/RTO Targets

**For Database (4-hour RPO, 1-hour RTO):**

```bash
# 1. Daily full backup + hourly incremental backup
# Full backup: 02:00 UTC daily
# Incremental: Every hour on the hour

# 2. In case of data loss at 14:30 UTC:
#    - Restore from 14:00 UTC backup (30 min data loss = within 4h RPO)
#    - Restore time: 30–45 minutes
#    - Total RTO: 45 min (within 1h target)

# 3. If database corruption discovered at 15:00 UTC:
#    - Trigger restore job immediately
#    - Restore from 12:00 UTC backup (3h data loss)
#    - Deploy to staging, verify, switchover to production
#    - Total RTO: ~1 hour
```

**For MinIO (24-hour RPO, 2-hour RTO):**

```bash
# 1. Continuous replication to secondary MinIO or S3
# If primary fails:
#    - All files available in secondary within minutes
#    - Maximum data loss: Last sync cycle (typically <1 min)
#    - Restore time: <5 minutes (DNS switch or failover)
#    - Actual RPO/RTO: Better than targets

# 2. If replication not available:
#    - Daily sync to S3 at 03:00 UTC
#    - In case of loss at 14:00 UTC: 11h data loss (within 24h RPO)
#    - Restore time: 1–2 hours (copy from S3 + test)
```

### Monitoring RPO/RTO Readiness

```yaml
# Prometheus metrics to track
metric: backup_last_success_time_seconds
  - Alert if >86400 (>24h since last backup)
  - Target: daily backup completes before 03:00 UTC

metric: restore_test_duration_seconds
  - Track actual RTO from quarterly drills
  - Target: <3600 seconds (1 hour)

metric: backup_size_bytes
  - Monitor growth; plan capacity
  - Target: increase <10% month-on-month
```

---

## 4. Documented Rollback Procedures

### Database Rollback (by migration)

**If a migration causes issues:**

```bash
# 1. Identify the problematic migration
# From deployment notes or git log:
#   20260820_add_seller_inventory

# 2. Determine if rollback is safe
# Check if newer migrations depend on schema from this one
git log --oneline prisma/migrations/ | grep -A 10 "20260820"

# 3. Rollback locally and test
DATABASE_URL="postgresql://localhost/champey_test" \
pnpm exec prisma migrate resolve --rolled-back 20260820154200_add_seller_inventory
# Re-test application

# 4. If safe, rollback in production (requires downtime)
# Stop backend services
kubectl scale deployment backend --replicas=0

# 5. Execute rollback
DATABASE_URL="$PROD_DATABASE_URL" \
pnpm exec prisma migrate resolve --rolled-back 20260820154200_add_seller_inventory

# 6. Verify schema
psql -h prod.db.champey.com -U admin -d champey_prod -c \
  "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='seller_inventory');"
# Should return: false (table removed)

# 7. Redeploy backend
kubectl scale deployment backend --replicas=3
kubectl rollout status deployment backend
```

### Full Database Restore (from backup)

**If database is corrupted or data is accidentally deleted:**

```bash
# 1. Assess scope of damage
# How much data was affected? Can partial recovery work?

# 2. Trigger restore procedure (see BACKUP-DRILLS.md, Step 3+)
# This restores to a point-in-time before the incident

# 3. Switchover to restored database
# Update connection strings and restart services

# 4. Verify data integrity before declaring recovery complete
```

### Application Deployment Rollback

**If a deployed version introduces bugs:**

```bash
# 1. Identify the problematic deployment
kubectl rollout history deployment/backend

# 2. Rollback to previous version
kubectl rollout undo deployment/backend
kubectl rollout status deployment/backend

# 3. Verify service health (within 2 minutes)
curl -X GET http://backend:4000/api/health

# 4. Monitor error rate (should drop in Grafana)
```

---

## 5. Pre-Launch Validation Checklist

- [ ] Test 1: Fresh database setup from migrations (passed)
- [ ] Test 2: Migration rollback and reapply (passed)
- [ ] Test 3: Upgrade path using production backup (passed)
- [ ] PostgreSQL backup cron job is deployed and running
- [ ] MinIO replication or backup sync is configured
- [ ] S3 backup bucket has versioning and lifecycle policies enabled
- [ ] Backup verification runs weekly (included in OPERATIONS.md)
- [ ] RPO/RTO targets are documented and achievable
- [ ] Quarterly restore drill is scheduled (BACKUP-DRILLS.md)
- [ ] Database rollback procedure is tested and documented
- [ ] Application rollback procedure is tested
- [ ] Runbook references backup/restore procedures (RUNBOOK.md)
- [ ] On-call team is trained on restore procedures
- [ ] Post-disaster communication plan is written

---

## 6. Success Criteria (Phase 2 Complete)

✅ **Gate:** A restore drill succeeds and the documented recovery process is usable by someone other than the original developer.

**Validation:**
1. Have a non-original-developer execute the restore procedure from BACKUP-DRILLS.md.
2. They successfully restore a backup to staging without asking for help.
3. Data integrity checks pass (referential, row count, sample data match).
4. Total time to restore is <RTO target (1 hour).
5. They document any unclear steps in the runbook.

---

## 7. Phase 2 Output Artifacts

- ✅ Verified PostgreSQL migrations (versioned, reproducible, reversible)
- ✅ Automated backup schedule (daily PostgreSQL, continuous MinIO)
- ✅ Backup alerting and verification (weekly checks in OPERATIONS.md)
- ✅ RPO/RTO targets defined and achievable
- ✅ Documented rollback procedures (migrations, database, app)
- ✅ Restore drill procedure (BACKUP-DRILLS.md)
- ✅ Runbooks updated with disaster recovery references
