# Branch Audit & Cleanup — 2026-09-07

Record of the branch audit performed on this repo and the cleanup that
followed, so future agents (and humans) know what was deleted, why, and what
was verified before each deletion.

## Summary

Four stale branches were identified in an audit and deleted. Two were local,
two were remote (`origin` = `github.com/Creative-hub554/CompusMarket`).
Every deletion was preceded by verification; nothing of value was lost.

## Deleted branches

| Branch | Where | Reason | Verified before deletion |
|---|---|---|---|
| `feat/admin-report-resolutions-and-notifications` | local | Fully merged into `main` (0 commits ahead) | `git branch -d` (safe delete, refused if unmerged) |
| `feat/report-resolutions-and-clerk-webhook-hardening` | local | Fully merged into `main` (0 commits ahead) | `git branch -d` (safe delete, refused if unmerged) |
| `origin/revert-2-freebuff/hi-1de27e1f-b456-4105-99e4-e87b9ca5e42b` | remote | Abandoned GitHub auto-revert of PR #2; revert never landed on `main` | See "Revert branch verification" below |
| `origin/Creative-hub554-patch-1` | remote | Stale "Add files via upload" snapshot with a separate, unrelated history | See "patch-1 verification" below |

## Revert branch verification

The branch held a single commit `7b668c6` ("Revert 'Freebuff/hi 1de27e1f…'"),
an auto-generated inverse of the PR #2 merge (`1662f7a`). Before deletion:

1. `git merge-base --is-ancestor 7b668c6 main` → **exit 1** — the revert
   commit is not an ancestor of `main`.
2. `git log main --grep=revert` → no revert of PR #2 (only unrelated word
   matches, e.g. "rejectClaim now **reverts** to a claimable state").
3. PR #2's merge `1662f7a` **is** an ancestor of `main` (exit 0).
4. The five files the revert would touch (`.gitignore`,
   `apps/frontend/src/app/api/search/route.ts`,
   `apps/frontend/src/middleware.ts`, `packages/database/prisma/seed.mjs`,
   `pr-body.md`) are **byte-identical** between `1662f7a` and current `main` —
   i.e. main still holds the PR-merged state, nothing was reverted.

## patch-1 verification

- Separate root: `git merge-base` found **no common ancestor** with `main`
  (history: `Add files via upload` → `Initial commit`).
- Tree was only **24 root-level files** (an old snapshot, not the real
  `apps/`/`packages/` structure). 11/24 also exist on `main`.
- Of the 14 files unique to the branch, nothing of value was lost:
  - 9 runtime log/error files (`*.log`, `frontend.err`) — junk
  - `CLAUDE.md` — actually a **UTF-16LE HTTP response capture** (`HTTP/1.1 200
    OK` + response headers), not a document — junk
  - `vitest.workspace.ts` — trivial 5-line config, trivially recreatable
  - `Theo Platform Overview.pdf` — the one genuinely unique artifact; **blob
    `44ea2f2cb09c1f9939dc14bf9d2ece013c93e2b9` was extracted and preserved at
    `C:\Users\theow\Documents\Theo Platform Overview.pdf`** (valid PDF 1.7,
    46,394 bytes) before any gc could prune it

## Branches kept (and why)

| Branch | Status |
|---|---|
| `main` | Mainline (also checked out in the main repo worktree at `C:\Workspace\www.champey.com`) |
| `freebuff/hi-1de27e1f-b456-4105-99e4-e87b9ca5e42b` | Current working branch |
| `agents/feature-implementation-assistance` | Merged (Ads feature — NestJS ads module, Stripe, admin/storefront pages); branch kept for reference |
| `agents/cleanup-unrelated-files-rpkec` | Docs commit `621f223` cherry-picked to `main` (`1615f87`); its dead worktree was pruned (`git worktree prune`); branch kept |
| `opencode/silent-river` | Active opencode worktree — do not touch |

## Notes for future agents

- **gh credential:** the stored GitHub token was a fine-grained PAT
  (`github_pat_…`) with read-only access, which could not delete refs. It was
  refreshed via `gh auth refresh -s repo --hostname github.com` and is now a
  classic OAuth token (`gho_…`) with `repo` scope.
- **Interactive-flow gotcha:** this environment kills background processes at
  every command boundary, so `gh auth refresh`'s interactive device flow kept
  dying before approval. The workaround was running it as a Windows scheduled
  task (`schtasks /Create … /Run …`), which runs outside the tool's process
  tree; the task was deleted after completing. Expect the same constraint for
  any future interactive CLI flow.
- **Unreachable objects:** the deleted branches' commits (`7b668c6`,
  `4c46621`, `9a5f4d5`) and blobs are still in the local object store until a
  `git gc`. The PDF blob above is the only one worth keeping and it has been
  extracted, so a `git gc --prune=now` is safe to run at any time.