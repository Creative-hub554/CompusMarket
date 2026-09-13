/**
 * lib/audit.mjs — helpers shared by dependency-audit.mjs and security-patch.mjs.
 *
 * Never prints secret values (none are involved).
 */
export const SEV_RANK = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };

/** Advisory objects from a parsed pnpm audit --json report. */
export function advisoriesOf(auditJson) {
  return Object.values(auditJson.advisories ?? {});
}

/** Severity counts for a parsed audit report. */
export function countSev(auditJson) {
  const c = { critical: 0, high: 0, moderate: 0, low: 0, info: 0 };
  for (const a of advisoriesOf(auditJson)) if (c[a.severity] !== undefined) c[a.severity]++;
  return c;
}

export const fmtCounts = (c) => `critical ${c.critical}, high ${c.high}, moderate ${c.moderate}, low ${c.low}`;

/**
 * Index remediations for a parsed report. pnpm reports them at the TOP level:
 * actions[] with resolves[] whose `id` references an advisory id.
 * 'update' = semver-safe lockfile fix; 'install' = semver-major.
 */
export function fixActionsById(auditJson) {
  const byId = {};
  for (const act of auditJson.actions ?? []) {
    for (const res of act.resolves ?? []) {
      byId[res.id] = { action: act.action, module: act.module, target: act.target };
    }
  }
  return byId;
}
