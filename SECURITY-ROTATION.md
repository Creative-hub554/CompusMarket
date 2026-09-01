# Dependency Patching and Security Rotation Schedule

## Overview

This document defines how www.champey.com manages dependency updates, security patches,
version rotation, and credential lifecycle to maintain a secure and stable platform.

---

## 1. Dependency Update Cadence

### Weekly: Automated Dependency Scanning

**Tool:** Dependabot (GitHub) or Renovate

**Process**
1. Run automated dependency scanner every Monday 02:00 UTC.
2. Identify new updates, security advisories, and deprecation notices.
3. Open pull requests for updates grouped by type:
   - **Critical security patches** (always auto-merge if tests pass)
   - **Minor updates and patches** (monthly batch PR)
   - **Major version updates** (quarterly review)

**Config example** (`.github/dependabot.yml` or `renovate.json`)
```yaml
version-updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
      day: monday
      time: "02:00"
    open-pull-requests-limit: 10
    reviewers: ["security-team"]
    labels: ["dependencies", "automated"]
    commit-message:
      prefix: "chore:"
    auto-merge:
      - match-type: security
      - match-type: minor
        target-branch: main
```

**Responsibility:** Automation + code owner review.

---

### Monthly: Coordinated Security Patch Deployment

**Schedule:** First Tuesday of each month, 10:00 AM UTC

**Attendees:** Backend lead, DevOps engineer, security lead (async option available)

**Process**

1. **Audit new advisories** (15 min)
   - Review all CVEs and security advisories from the past month.
   - Prioritize by severity and applicability to www.champey.com.
   - Check if fixes are already merged from Dependabot.

2. **Prepare patch PR** (15 min)
   - Create a single PR with all reviewed security and critical patches.
   - Include release notes linking to CVE details.
   - Mark as `security-patch`.

3. **Test in staging** (30 min–1 hour)
   - Deploy patch PR to staging environment.
   - Run full test suite (unit, integration, end-to-end).
   - Verify critical workflows in both Khmer and English.
   - Check for regressions in performance or stability.

4. **Review and approval** (10 min)
   - At least two approvals required: backend lead + security lead.
   - No further commits after approval (fast-track merge only).

5. **Deploy to production** (30 min)
   - Deploy during low-traffic window (e.g., Tuesday 14:00–15:00 UTC).
   - Keep previous release available for rollback.
   - Monitor metrics for 2 hours.
   - Confirm all smoke checks pass.

6. **Post-patch documentation** (10 min)
   - Update SECURITY.md with patch summary and deployed version.
   - Notify security stakeholders of patches applied.
   - Archive release notes in a dated patch log.

**Output:** Deployed security patch + documentation update.

---

### Quarterly: Major Version and Dependency Review

**Schedule:** First Monday of months 1, 4, 7, 10 (Jan, Apr, Jul, Oct)

**Duration:** 2–3 hours

**Attendees:** Full tech team + product lead

**Process**

1. **Audit current dependencies** (30 min)
   - Use `npm audit`, `pnpm audit`, or similar.
   - Generate dependency report showing:
     - Total packages (direct + transitive)
     - Outdated packages by severity
     - End-of-life or deprecated packages
     - License compliance issues

2. **Evaluate major version upgrades** (45 min)
   - For each outdated major version:
     - Review breaking changes and migration guide.
     - Estimate effort (hours/days).
     - Identify risk (e.g., new peer dependency, different API).
     - Check if replacement library is better aligned.
   - Document decision for each: upgrade now, defer, or replace.

3. **Plan migration work** (30 min)
   - Prioritize upgrades: critical security > stability > new features.
   - Assign owners and estimate delivery.
   - Create tracking issues with migration checklist.
   - Schedule delivery in the sprint.

4. **Review supply chain security** (15 min)
   - Verify package ownership hasn't changed unexpectedly (typosquatting risk).
   - Check package download trends (sharp changes can indicate abandonment).
   - Audit access control on critical private packages.

**Output:** Dependency roadmap + issue tracking.

**Examples**
- Next.js 16.x migration (plan in Q1, deliver in Q2)
- Prisma 7.x migration (defer to Q2 if breaking changes are complex)
- Replace unmaintained search library with Meilisearch (completed)

---

## 2. Credential and Secret Rotation

### Baseline: Secrets Management

**Tool:** Environment variables in production deployment platform (e.g., Vercel, Railway, AWS Secrets Manager)

**Principle:** Never commit secrets. Use encrypted vault for backup secrets.

**Tracked secrets**
- `AUTH_SECRET` (NextAuth session encryption)
- `JWT_SECRET` (Backend token signing)
- `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`
- `OPENAI_API_KEY` (if using OpenAI directly)
- `DATABASE_PASSWORD` (PostgreSQL)
- `REDIS_PASSWORD` (if authentication enabled)
- Third-party API keys (payment, email, analytics)

**Configuration**
```bash
# apps/backend/.env
AUTH_SECRET="<use production vault>"
JWT_SECRET="<use production vault>"
DATABASE_PASSWORD="<use production vault>"
MINIO_ACCESS_KEY="<use production vault>"
MINIO_SECRET_KEY="<use production vault>"
```

---

### Quarterly: Rotating Authentication Secrets

**Schedule:** First Wednesday of months 2, 5, 8, 11 (Feb, May, Aug, Nov)

**Duration:** 1 hour preparation + 30 min rotation window

**Process**

1. **Prepare new secrets** (1 hour before rotation)
   - Generate new `AUTH_SECRET` (32-byte random hex).
   - Generate new `JWT_SECRET` (32-byte random hex).
   - Store both in production vault with timestamp.
   - Keep previous secrets in vault for grace period.

2. **Rotate in production** (30 min window, low-traffic time)
   - Update `AUTH_SECRET` and `JWT_SECRET` in production vault.
   - Restart backend services to pick up new secrets.
   - **Grace period:** Old secrets remain valid for 30 days (issued tokens remain valid).
   - Log the rotation timestamp for audit trail.

3. **Verify rotation** (10 min)
   - Test new user registration and login.
   - Verify existing sessions don't break.
   - Confirm no authentication errors in logs.

4. **Document rotation** (5 min)
   - Update SECURITY.md with rotation timestamp.
   - Archive old secrets in vault with date and reason.
   - Notify team of successful rotation.

**Rollback:** If issues arise, revert to previous secrets and investigate before retrying.

---

### Annually: Critical Credential Audit

**Schedule:** January 15th

**Duration:** 2–3 hours

**Process**

1. **Audit all active credentials**
   - List every API key, token, and password in use.
   - Verify each is necessary and properly scoped.
   - Check expiration dates and service status.

2. **Review access logs**
   - For each credential, confirm:
     - It's being actively used.
     - Access patterns are expected.
     - No unauthorized use detected.

3. **Retire unused credentials**
   - Revoke any abandoned keys.
   - Remove from vault.
   - Document reason and date.

4. **Plan credential updates**
   - Schedule rotation for any old credentials (>2 years).
   - Identify third-party services requiring reauthorization.
   - Update any expiring certificates or signing keys.

---

## 3. Database Credential Management

### Initial Setup

**Best practices**
- Use strong, random passwords (32+ characters, mixed case, symbols).
- Store PostgreSQL superuser password in secure vault (never in git).
- Create read-only and application-specific database users (not superuser).
- Restrict database access by IP/network when possible.

**Example: PostgreSQL user setup**
```sql
-- Create application user (limited permissions)
CREATE USER champey_app WITH PASSWORD 'random-strong-password';
GRANT CONNECT ON DATABASE champey_prod TO champey_app;
GRANT USAGE ON SCHEMA public TO champey_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO champey_app;

-- Create read-only user (for reporting/analytics)
CREATE USER champey_readonly WITH PASSWORD 'random-strong-password';
GRANT CONNECT ON DATABASE champey_prod TO champey_readonly;
GRANT USAGE ON SCHEMA public TO champey_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO champey_readonly;
```

### Semi-Annual: Database Credential Rotation

**Schedule:** June 15th and December 15th

**Process**

1. **Prepare new credentials**
   - Generate new password for `champey_app` user.
   - Generate new password for `champey_readonly` user (if used).

2. **Update in production vault**
   - Store old and new passwords with rotation timestamp.

3. **Rotate password**
   - Connect as superuser.
   - Run `ALTER USER champey_app WITH PASSWORD 'new-password';`
   - Update all connected services with new password.
   - Test application database connectivity.

4. **Grace period** (7 days)
   - Old password remains valid during migration window.
   - Log all connection attempts.

5. **Cleanup**
   - After 7 days, archive old password in vault.
   - Update SECURITY.md log.

---

## 4. API Key and Third-Party Credential Management

### Tracked Third-Party Credentials

| Service | Credential | Scope | Rotation |
|---------|-----------|-------|----------|
| OpenAI | API key | Generate product descriptions, resume assistance | Quarterly |
| OpenRouter | API key | Fallback AI models | Quarterly |
| MinIO | Access & Secret key | File storage | Quarterly |
| Meilisearch | Master key | Search index management | Quarterly |
| Payment provider | API keys | Transactions (if applicable) | Quarterly |

### Process for Each Service

1. **On-demand:** If a key is compromised, rotate immediately.
   - Revoke old key in service console.
   - Generate new key.
   - Update production vault.
   - Test application integration.

2. **Quarterly rotation** (same month as auth secrets, Wed + 1 day)
   - Generate new key in service console.
   - Store new key in production vault with timestamp.
   - Update application to use new key.
   - Revoke old key after 24-hour grace period.
   - Document rotation in SECURITY.md.

3. **Vendor account security**
   - Review vendor account access and IP allowlists.
   - Confirm no shared or weak passwords.
   - Enable MFA on all third-party vendor accounts.

---

## 5. TLS Certificate Rotation

### Baseline

**Certificate provider:** Let's Encrypt (free, automated renewal)

**Renewal:** Automatic via ACME (certbot or nginx/Vercel built-in)

**Renewal schedule:** Automatically 30 days before expiry (typical 90-day cert lifetime)

**Notification:** Email alert if renewal fails

### Manual Renewal (if automation fails)

1. Identify expired or expiring certificate.
2. Use certbot or provider console to renew.
3. Update nginx or reverse proxy configuration.
4. Restart service and verify HTTPS works.
5. Test certificate chain: `openssl s_client -connect www.champey.com:443`

---

## 6. Documentation and Audit Trail

### Secrets Management Log Template

**File:** `SECURITY.md` (keep in repo, **do not commit actual secrets**)

```markdown
## Credential Rotation Log

### Auth Secrets
- **Last rotated:** 2026-09-15
- **Next rotation:** 2026-12-15 (quarterly)
- **Change:** New JWT_SECRET and AUTH_SECRET generated and deployed
- **Notes:** No incidents; routine rotation

### Database Credentials (champey_app user)
- **Last rotated:** 2026-06-15
- **Next rotation:** 2026-12-15 (semi-annual)
- **Change:** New password deployed to all services
- **Notes:** Migration completed without downtime

### MinIO Credentials
- **Last rotated:** 2026-08-15
- **Next rotation:** 2026-11-15 (quarterly)
- **Change:** New access and secret keys deployed
- **Notes:** Old keys revoked after 24-hour grace period

### TLS Certificate (www.champey.com)
- **Issued:** 2026-07-01
- **Expires:** 2026-09-29
- **Renewal:** Automatic (Let's Encrypt)
- **Next check:** 2026-08-30 (30 days before expiry)
```

### Audit Access to Secrets

1. **Log all access** to vault/secrets manager.
2. **Alert on unusual access** (off-hours, geographic anomalies).
3. **Review access logs** monthly during operations review.
4. **Revoke access** for team members who leave immediately.

---

## 7. Incident Response: Compromised Credentials

**If a secret is exposed or suspected compromised:**

1. **Immediately (within 5 minutes)**
   - Revoke the credential in its source system.
   - Rotate to a new temporary secret.
   - Alert operations and security leads.

2. **Within 30 minutes**
   - Deploy new credential to all services.
   - Verify application functionality.
   - Search logs for any unauthorized use of the exposed credential.

3. **Within 2 hours**
   - Notify affected customers if data was accessed.
   - Post-incident review: how was it exposed? How can we prevent it?
   - Document in incident log.

4. **Follow-up (within 24 hours)**
   - Update security controls to prevent similar exposure.
   - Rotate related credentials as precaution.
   - Brief team on findings.

---

## 8. Responsibilities and On-Call

| Role | Task | Frequency |
|------|------|-----------|
| DevOps / Operations | Run dependency scan + update PRs | Weekly |
| Security lead | Review and approve security patches | Monthly |
| Backend lead | Merge patch PRs and deploy to prod | Monthly |
| Full team | Quarterly dependency & major version review | Quarterly |
| DevOps | Rotate auth & database credentials | Quarterly/Semi-annual |
| DevOps | Rotate third-party API keys | Quarterly |
| Operations lead | Audit secrets and access logs | Quarterly & Annual |
| Team member leaving | Revoke access to all secrets & vaults | Immediately |

---

## 9. Checklist for Go-Live

- [ ] All secrets are in production vault (not .env files in git).
- [ ] Dependabot or Renovate is configured and running.
- [ ] Monthly security patch process is documented and tested.
- [ ] Quarterly dependency review is scheduled and assigned.
- [ ] Credential rotation schedule is published and on calendar.
- [ ] SECURITY.md exists with rotation log template.
- [ ] Incident response process for compromised credentials is documented.
- [ ] Team has access to vault and knows credential rotation procedure.
- [ ] Alert notifications are configured for:
  - New security advisories
  - Certificate expiry (30 days before)
  - Failed dependency updates
  - Unusual secret access patterns
