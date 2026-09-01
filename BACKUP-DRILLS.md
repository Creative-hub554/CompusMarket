# Backup and Disaster Recovery Drill Playbook

## Overview

This document defines how www.champey.com backs up critical data, tests restore
procedures, and validates disaster recovery readiness. Regular drills ensure
that if production fails, the recovery process is known, tested, and reliable.

**Key principles:**
- Backups are useless without tested restores.
- Recovery procedures must work for someone other than the original developer.
- Drills are scheduled, documented, and reviewed.

---

## 1. Backup Architecture

### What Gets Backed Up

| System | Data | Frequency | Retention | Location |
|--------|------|-----------|-----------|----------|
| PostgreSQL | User, products, orders, social, career data | Daily | 30 days | Cold storage |
| MinIO | User uploads, media, documents | Continuous (S3-compat replication) | 30 days | Secondary region |
| Redis | Session cache, rate limits, queues | None (ephemeral, rebuilds on start) | N/A | N/A |
| Application config | .env, secrets, TLS certs | Manual on change | Indefinite | Vault |
| Docker images | Built images from git tags | On each release | Latest 3 releases | Container registry |
| Database schema | Prisma migrations | Git (versioned) | Indefinite | GitHub |

### Backup Storage Locations

**Primary backup location:** AWS S3 or equivalent (e.g., Backblaze B2)
- Separate AWS account or region from production
- Versioning enabled (retain 30-day history)
- Encryption at rest and in transit
- Read-only access for backup service account

**Secondary backup:** Local file storage
- Weekly differential backup to on-premises NAS or external drive
- Kept offline most of the time (USB drive in safe, updated quarterly)
- Used only if cloud backup is unavailable

**Secrets storage:** Vault system (e.g., HashiCorp Vault, AWS Secrets Manager)
- Separate from database backups (secrets never in DB dumps)
- Access logs reviewed quarterly
- Rotation schedule documented in SECURITY-ROTATION.md

---

## 2. Automated Backup Process

### PostgreSQL Backup

**Tool:** `pg_dump` + AWS S3 + scheduled job

**Schedule:** Daily at 02:00 UTC (low-traffic window)

**Retention:** 30 days (automated deletion of backups >30 days old)

**Script:** `scripts/backup-postgres.sh`

```bash
#!/bin/bash
set -e

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
DB_HOST="${DATABASE_HOST}"
DB_PORT="${DATABASE_PORT}"
DB_NAME="${DATABASE_NAME}"
DB_USER="${DATABASE_USER}"
S3_BUCKET="${BACKUP_S3_BUCKET}"
S3_PREFIX="postgres-backups"

# Create backup
BACKUP_FILE="champey_db_${BACKUP_DATE}.sql.gz"
echo "Creating database backup: $BACKUP_FILE"
PGPASSWORD="${DATABASE_PASSWORD}" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-privileges \
  | gzip > "/tmp/$BACKUP_FILE"

# Verify backup
if [ ! -f "/tmp/$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not created"
  exit 1
fi

# Upload to S3
aws s3 cp "/tmp/$BACKUP_FILE" "s3://${S3_BUCKET}/${S3_PREFIX}/${BACKUP_FILE}" \
  --sse AES256 \
  --storage-class GLACIER_IR

# Cleanup old backups (retain 30 days)
aws s3 rm "s3://${S3_BUCKET}/${S3_PREFIX}/" --recursive \
  --exclude "*" \
  --include "champey_db_*.sql.gz" \
  --older-than 30

# Cleanup local file
rm "/tmp/$BACKUP_FILE"

echo "Backup completed and uploaded to S3"
```

**Alerting:** If backup fails, send alert to ops team within 1 minute.

**Verification:** Backup log stored in CloudWatch/monitoring dashboard.

### MinIO (Object Storage) Backup

**Tool:** S3-compatible replication + lifecycle policy

**Setup**
1. Enable versioning on MinIO bucket.
2. Configure lifecycle rule: transition old versions to cold storage after 7 days.
3. (Optional) Set up cross-region replication to secondary MinIO or AWS S3.

**Retention:** 30 days (old versions auto-deleted)

**Cost optimization:** Store current version in hot storage; older versions in cold.

### Secrets and Configuration Backup

**Tool:** Git (versioned, encrypted)

**What to version (NOT in git)**
- Never commit `.env` files or secrets
- Never commit private keys or credentials

**What to version (encrypted)**
- `docker-compose.yml` (infrastructure configuration)
- Nginx config files
- Application configuration files (no secrets)
- Database migration files

**What to store separately (vault)**
- `.env` files (store in Vault, not git)
- TLS private keys (store in Vault or cert manager)
- Database passwords (store in Vault)
- API keys (store in Vault)

---

## 3. Quarterly Backup Restore Drill

**Schedule:** First Thursday of months 3, 6, 9, 12 (Mar, Jun, Sep, Dec)

**Duration:** 3–4 hours (including documentation)

**Attendees:** DevOps engineer, backend engineer, operations lead

**Purpose:** Verify that:
1. Backups exist and are uncorrupted.
2. Restore process is documented and reproducible.
3. Any team member can execute the restore without the original developer.
4. Recovery time matches the documented RTO.

---

### Pre-Drill (1 week before)

**Checklist**
- [ ] Verify latest backup is less than 24 hours old.
- [ ] Confirm S3 backup bucket has 30+ days of versions.
- [ ] Reserve staging environment for restore testing.
- [ ] Notify team of scheduled drill (no production changes during drill).
- [ ] Review last drill report and address any gaps.

---

### Drill Day: Step-by-Step Restore

#### Step 1: Set Up Isolated Environment (15 min)

**Goal:** Restore to a completely isolated copy of production to verify no spillover or data loss.

1. **Prepare staging database**
   ```bash
   # Option A: Fresh PostgreSQL instance (cloud RDS)
   aws rds create-db-instance \
     --db-instance-identifier "champey-restore-test-$(date +%Y%m%d-%H%M%S)" \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --allocated-storage 100 \
     --no-publicly-accessible

   # Wait for instance to be available (2–5 minutes)
   ```

2. **Prepare staging storage**
   ```bash
   # Create temporary MinIO bucket or S3 bucket
   aws s3 mb s3://champey-restore-test-$(date +%Y%m%d-%H%M%S) \
     --region us-east-1
   ```

3. **Record staging environment details**
   - Database endpoint, port, credentials
   - Storage bucket name and region
   - Timestamp (for audit trail)

#### Step 2: Download and Verify Backups (15 min)

**Goal:** Confirm backups are present, uncorrupted, and readable.

1. **List available PostgreSQL backups**
   ```bash
   aws s3 ls "s3://${BACKUP_BUCKET}/postgres-backups/" --human-readable
   ```

   Expected output:
   ```
   2026-09-01 02:00:15   1.2 GiB  champey_db_20260901_020015.sql.gz
   2026-08-31 02:00:12   1.2 GiB  champey_db_20260831_020012.sql.gz
   ```

2. **Download latest backup**
   ```bash
   LATEST_BACKUP="champey_db_20260901_020015.sql.gz"
   aws s3 cp "s3://${BACKUP_BUCKET}/postgres-backups/${LATEST_BACKUP}" \
     /tmp/restore_test.sql.gz
   ```

3. **Verify backup integrity**
   ```bash
   # Check file size (should be >100 MB for a real backup)
   ls -lh /tmp/restore_test.sql.gz

   # Test gzip integrity (without decompressing full file)
   gunzip -t /tmp/restore_test.sql.gz && echo "✓ Backup is valid gzip"
   ```

4. **Decompress and spot-check**
   ```bash
   # Extract first 100 lines to verify SQL structure
   gunzip -c /tmp/restore_test.sql.gz | head -100

   # Should contain SQL DDL like:
   # CREATE TABLE users ...
   # CREATE TABLE products ...
   ```

#### Step 3: Restore Database (20 min)

**Goal:** Import backup into staging database and verify schema integrity.

1. **Get staging database connection details**
   ```bash
   STAGING_DB_HOST="<from AWS RDS console>"
   STAGING_DB_PORT="5432"
   STAGING_DB_NAME="champey_restore"
   STAGING_DB_USER="postgres"
   STAGING_DB_PASSWORD="<from AWS Secrets Manager>"
   ```

2. **Create restore database**
   ```bash
   PGPASSWORD="${STAGING_DB_PASSWORD}" psql \
     -h "$STAGING_DB_HOST" \
     -U "$STAGING_DB_USER" \
     -c "CREATE DATABASE champey_restore;"
   ```

3. **Restore from backup**
   ```bash
   RESTORE_START_TIME=$(date +%s)

   gunzip -c /tmp/restore_test.sql.gz | \
   PGPASSWORD="${STAGING_DB_PASSWORD}" psql \
     -h "$STAGING_DB_HOST" \
     -U "$STAGING_DB_USER" \
     -d "$STAGING_DB_NAME" \
     --set ON_ERROR_STOP=on

   RESTORE_END_TIME=$(date +%s)
   RESTORE_DURATION=$((RESTORE_END_TIME - RESTORE_START_TIME))
   echo "Restore completed in ${RESTORE_DURATION} seconds"
   ```

4. **Verify schema**
   ```bash
   # Count tables
   PGPASSWORD="${STAGING_DB_PASSWORD}" psql \
     -h "$STAGING_DB_HOST" \
     -U "$STAGING_DB_USER" \
     -d "$STAGING_DB_NAME" \
     -c "SELECT count(*) as table_count FROM information_schema.tables WHERE table_schema='public';"

   # Should match production (expected: 20–30 tables)

   # List tables
   PGPASSWORD="${STAGING_DB_PASSWORD}" psql \
     -h "$STAGING_DB_HOST" \
     -U "$STAGING_DB_USER" \
     -d "$STAGING_DB_NAME" \
     -c "\dt"
   ```

#### Step 4: Restore Application Data (MinIO) (15 min)

**Goal:** Restore uploaded files (product images, user avatars, documents) to staging storage.

1. **List available object backups**
   ```bash
   aws s3 ls "s3://${MINIO_BACKUP_BUCKET}/" --recursive --human-readable | head -20
   ```

2. **Sync MinIO backup to staging storage**
   ```bash
   # Copy all objects from backup bucket to staging bucket
   aws s3 sync "s3://${MINIO_BACKUP_BUCKET}/" \
     "s3://champey-restore-test-staging/" \
     --region us-east-1 \
     --storage-class STANDARD

   # Verify sync
   BACKUP_OBJECT_COUNT=$(aws s3 ls "s3://${MINIO_BACKUP_BUCKET}/" --recursive | wc -l)
   STAGING_OBJECT_COUNT=$(aws s3 ls "s3://champey-restore-test-staging/" --recursive | wc -l)

   echo "Backup objects: $BACKUP_OBJECT_COUNT"
   echo "Staging objects: $STAGING_OBJECT_COUNT"
   ```

3. **Spot-check objects**
   ```bash
   # Download and verify a random image
   aws s3 cp "s3://champey-restore-test-staging/products/sample.jpg" /tmp/sample.jpg
   file /tmp/sample.jpg  # Should identify as JPEG or PNG
   ```

#### Step 5: Deploy and Test Application (30 min)

**Goal:** Run the app against restored data to verify it loads and functions.

1. **Prepare staging environment file**
   ```bash
   # Create temporary .env for staging
   cat > /tmp/staging.env <<EOF
   DATABASE_URL="postgresql://postgres:password@${STAGING_DB_HOST}:5432/champey_restore"
   MINIO_ENDPOINT="s3.amazonaws.com"
   MINIO_BUCKET="champey-restore-test-staging"
   MINIO_REGION="us-east-1"
   MINIO_ACCESS_KEY="<from vault>"
   MINIO_SECRET_KEY="<from vault>"
   NEXT_PUBLIC_API_URL="http://localhost:4000/api"
   # ... other config
   EOF
   ```

2. **Deploy backend to staging**
   ```bash
   # Option A: Docker
   docker run -d \
     --name champey-backend-test \
     --env-file /tmp/staging.env \
     --port 4000:4000 \
     "champey-backend:${RELEASE_TAG}"

   # Option B: Kubernetes
   kubectl set env deployment/backend-staging \
     DATABASE_URL="postgresql://..." \
     MINIO_BUCKET="champey-restore-test-staging"
   kubectl rollout status deployment/backend-staging
   ```

3. **Run health checks**
   ```bash
   # Wait for service to start
   sleep 5

   # Check API health
   curl -X GET http://localhost:4000/api/health
   # Expected: { "status": "ok" }

   # List products (verifies DB read)
   curl -X GET http://localhost:4000/api/products | jq '.length'
   # Expected: Non-zero count

   # Check user count (verifies DB read)
   curl -X GET http://localhost:4000/api/health/db-stats | jq '.users'
   # Expected: Non-zero count
   ```

4. **Deploy frontend to staging and test critical flows**
   ```bash
   # Update frontend config to point to staging backend
   docker run -d \
     --name champey-frontend-test \
     --env-file /tmp/staging.env \
     --port 3000:3000 \
     "champey-frontend:${RELEASE_TAG}"

   # Open browser to http://localhost:3000 and manually verify:
   # - [ ] Product listing loads
   # - [ ] Product detail loads (with images from restored MinIO)
   # - [ ] Search works
   # - [ ] Cart functionality works
   # - [ ] User can view their orders (if logged in)
   ```

#### Step 6: Data Integrity Checks (15 min)

**Goal:** Verify that data was restored faithfully (no corruption, truncation, or loss).

1. **Row count comparison**
   ```bash
   # Compare key table counts: production vs. restored
   echo "=== Production ==="
   PGPASSWORD="${PROD_DB_PASSWORD}" psql \
     -h "$PROD_DB_HOST" \
     -U "$PROD_DB_USER" \
     -d "$PROD_DB_NAME" \
     -c "SELECT 'users' as table_name, count(*) as row_count FROM users
         UNION ALL
         SELECT 'products', count(*) FROM products
         UNION ALL
         SELECT 'orders', count(*) FROM orders;"

   echo "=== Restored ==="
   PGPASSWORD="${STAGING_DB_PASSWORD}" psql \
     -h "$STAGING_DB_HOST" \
     -U "$STAGING_DB_USER" \
     -d "$STAGING_DB_NAME" \
     -c "SELECT 'users' as table_name, count(*) as row_count FROM users
         UNION ALL
         SELECT 'products', count(*) FROM products
         UNION ALL
         SELECT 'orders', count(*) FROM orders;"

   # Counts should match (within 1–2 rows if production got new activity during restore)
   ```

2. **Data sample verification**
   ```bash
   # Spot-check: Verify a known product exists and has correct data
   PRODUCT_ID=1
   PGPASSWORD="${STAGING_DB_PASSWORD}" psql \
     -h "$STAGING_DB_HOST" \
     -U "$STAGING_DB_USER" \
     -d "$STAGING_DB_NAME" \
     -c "SELECT id, name, price, description FROM products WHERE id=$PRODUCT_ID;"
   ```

3. **Referential integrity check**
   ```bash
   # Verify foreign keys weren't violated
   PGPASSWORD="${STAGING_DB_PASSWORD}" psql \
     -h "$STAGING_DB_HOST" \
     -U "$STAGING_DB_USER" \
     -d "$STAGING_DB_NAME" \
     -c "SELECT * FROM orders o WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = o.user_id);"

   # Should return 0 rows (no orphaned orders)
   ```

#### Step 7: Document and Cleanup (15 min)

**Goal:** Record drill results and clean up test resources.

1. **Complete drill report**
   ```markdown
   # Backup Restore Drill Report
   Date: 2026-09-01
   Drill conducted by: [Name]
   
   ## Restore Times
   - Database download: 5 min
   - Database import: 12 min
   - MinIO data sync: 8 min
   - Application deployment: 3 min
   - **Total RTO: 28 minutes**
   
   ## Results
   - ✓ Database backup valid and restorable
   - ✓ Schema matches production (35 tables)
   - ✓ Data row counts match (users: 12,345 | products: 5,678 | orders: 34,567)
   - ✓ MinIO objects restored (1,234 files)
   - ✓ Application health checks pass
   - ✓ Critical workflows tested (product view, search, cart)
   
   ## Issues and Resolutions
   None
   
   ## Recommendations
   - Consider parallel restore for faster RTO
   - Add automated data validation queries
   ```

2. **Cleanup test resources**
   ```bash
   # Delete staging database
   aws rds delete-db-instance \
     --db-instance-identifier "champey-restore-test-$(date +%Y%m%d-%H%M%S)" \
     --skip-final-snapshot

   # Delete staging S3 bucket
   aws s3 rb "s3://champey-restore-test-$(date +%Y%m%d-%H%M%S)/" --force

   # Delete local backup file
   rm /tmp/restore_test.sql.gz

   # Stop and remove test containers
   docker stop champey-backend-test champey-frontend-test
   docker rm champey-backend-test champey-frontend-test
   ```

3. **File drill report**
   - Store in shared drive or wiki: `drills/restore-drill-2026-Q3.md`
   - Link from OPERATIONS.md
   - Notify team of completion

---

## 4. Target Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| RTO (Recovery Time Objective) | <1 hour | Time from incident to production back online |
| RPO (Recovery Point Objective) | <4 hours | Maximum data loss (backup is 24h old, acceptable) |
| Backup success rate | >99.5% | Track failed backup jobs; alert if 2+ fail |
| Restore drill completion | 100% | One drill per quarter, all drills documented |
| Restore drill duration | <2 hours | Target: complete with time for post-analysis |
| Data integrity check | Zero errors | Every restore must pass referential and row count checks |

---

## 5. Post-Disaster Recovery Procedure (Production Incident)

**If production database is corrupted or lost:**

1. **Declare incident** (P0)
   - Page on-call engineer
   - Open incident channel
   - Begin communication to customers

2. **Assess scope** (5 min)
   - Determine if full restore needed or partial recovery possible
   - Identify latest clean backup

3. **Prepare restore database** (10 min)
   - Provision new RDS instance or restore from previous snapshot
   - Do NOT restore to production DB name (use `_restore` suffix)

4. **Execute restore** (30 min–1 hour)
   - Follow steps 2–5 from drill procedure (above)
   - Validate data integrity before switchover

5. **Switchover** (15 min)
   - Update application config to point to restored database
   - Restart backend services
   - Monitor errors and performance

6. **Post-recovery** (ongoing)
   - Verify all workflows functional
   - Identify root cause of data loss
   - Plan remediation
   - Post-incident review within 24 hours

---

## 6. Backup Checklist for Go-Live

- [ ] PostgreSQL backup script created and tested.
- [ ] S3 bucket configured with versioning and lifecycle policies.
- [ ] Daily backup job scheduled and alerting enabled.
- [ ] MinIO/object storage replication or backup enabled.
- [ ] Secrets stored in vault (not in backups).
- [ ] Quarterly restore drill scheduled on calendar.
- [ ] Restore procedure documented step-by-step.
- [ ] RTO and RPO targets defined and tracked.
- [ ] Team has access to staging resources for drills.
- [ ] Incident response procedure for data loss documented.
- [ ] Post-drill report template created.
