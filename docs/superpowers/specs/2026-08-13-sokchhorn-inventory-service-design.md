# SokChhorn Inventory Service — Design

Date: 2026-08-13

## Overview

Professionalize the existing SokChhorn spare-parts inventory system (Flask webapp + Telegram bot + ESC/POS printing, currently a single 144KB `webapp.py` plus raw-SQL `db.py`) into a maintainable, single-owner service. The tool is a private inventory manager: the person who creates the inventory (the owner) has full control and must approve every staff member who joins.

The project lives at the repo root as `sokchhorn-inventory/`, fully separate from the pnpm/Turborepo TypeScript monorepo (no workspace integration).

## Goals

- Fix structural problems: monolith, per-launch `SECRET_KEY`, `/desktop-login` auth bypass, raw SQL without migrations, no tests.
- Google OAuth verification on all registration and member-join requests.
- Owner approval gate before any new user gains access.
- Keep the working Python stack and behavior (Flask templates, Telegram bot, ESC/POS + TSPL printing) intact.

## Non-Goals

- No multi-tenant SaaS / public signup.
- No password-reset email flow.
- No separate REST API for the Telegram bot (bot keeps reading the DB directly as today).
- No rewrite into the TypeScript/NestJS monorepo.

## Access model

Three roles, enforced centrally via a `@role_required(N)` decorator and a single `current_user` helper.

| Role | Level | Capabilities |
|---|---|---|
| owner | 100 | Everything. Approve/reject join requests, manage staff (create/disable/reset password/change role), change all settings (PIN, printer, notifications, shop info), delete/export data, run migrations. Telegram `ADMIN_IDS` maps to the owner. |
| manager | 50 | Sellout, customers, inventory updates, receipts. No user management, no settings. |
| staff | 10 | Sellout and scan only. |

`users.status ∈ {pending, active, disabled}`. Only `active` users can log in. The owner can disable/reactivate staff.

Staff management is owner-only (managers cannot register or manage staff).

## Registration & join-request workflow

Google OAuth is the verification step on **all** registration requests (owner register and staff join). Owner approval is the access gate.

1. Candidate clicks "Continue with Google" → Flask redirects to `https://accounts.google.com/o/oauth2/v2/auth`.
2. Auth code exchanged via `httpx` POST to `https://oauth2.googleapis.com/token`; identity fetched from `https://www.googleapis.com/oauth2/v2/userinfo`.
3. Verified `email` (`email_verified=true`) is locked onto the account. Candidate sets a password and name.
4. Account created with `status = pending`. No access yet.
5. Owner is notified (Telegram message via `ADMIN_IDS` gate + banner in owner dashboard).
6. Owner approves → `status = active`, default role `staff`. Owner rejects → pending row removed.

The first registration when **no active owner exists** creates the owner (role owner, `status = active`, `OWNER_ID` persisted to `.env`). This applies even if pending staff requests already exist.

## Architecture

### Target layout

```
sokchhorn-inventory/
  app/
    __init__.py          # create_app() factory: config, db init/migrate, blueprint registration
    config.py            # Config dataclass reading .env; SECRET_KEY persisted
    db.py                # connection helper + versioned migration runner
    auth/                # blueprint: login, logout, register (Google OAuth), approval, change_password
    inventory/           # blueprint: items, stock, import/export, barcode
    sales/               # blueprint: sellout, customer_sellout, receipts
    customers/           # blueprint: customers, statements
    settings/            # blueprint: settings, staff management, notifications, printer
    printing/            # print_utils.py (ESC/POS + TSPL) moved here as a module
    templates/           # 28 templates, grouped by blueprint
  bot/                   # main.py (Telegram) as a module
  tests/                 # pytest suite
  main.py                # thin entry: runs bot (unchanged behavior)
  webapp.py              # thin entry: runs create_app()
  requirements.txt
  .env.example
  .gitignore
  Dockerfile             # optional VPS deploy (gunicorn)
```

### Key changes from the pasted code

1. `webapp.py` (144KB) splits into blueprints above — same routes, same templates, same behavior.
2. `config.py` — `SECRET_KEY` read from `.env` (persisted). Auto-generate only if absent, writing the generated value back to `.env` so sessions survive restarts.
3. `/desktop-login` auth bypass removed; role enforcement centralized in `@role_required`.
4. `db.py` gains a versioned migration runner (`migrations/001_init.sql`, ...) applied on startup.
5. `users` gains `status` column; registration writes pending rows; approval endpoint flips status.
6. Google OAuth flow in `auth` blueprint; `.env.example` gains `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OWNER_ID`.

### Data flow

- **Join request**: candidate → Google OAuth → pending user row → Telegram + dashboard notification → owner approves → active staff.
- **Login**: active user email+password → session (persisted `SECRET_KEY`).
- **Sellout** (unchanged): sales blueprint writes receipts + stock deltas in one SQLite transaction; printer via `printing/`.
- **Bot** (unchanged): reads the same SQLite DB directly; owner-gated reports/alerts.

### Error handling

- Google OAuth failures (cancel, bad code, email not verified) → friendly error, no account created.
- Approval/registration under concurrent requests → transaction-safe status checks.
- Migration failures → startup aborts with a clear message; DB untouched.

## Testing

`pytest` in `sokchhorn-inventory/`:

- `tests/test_auth.py` — Google OAuth callback (mocked `httpx`), pending→active approval, reject, login gating on `status`, role decorator behavior.
- `tests/test_inventory.py` — item CRUD, stock in/out, import merge logic.
- `tests/test_sales.py` — sellout + customer_sellout totals, receipt payload generation.
- `tests/test_permissions.py` — staff cannot reach settings/users/approval routes.

## Deployment

- `requirements.txt` unchanged in spirit (OAuth uses `httpx`, already a dependency).
- `Dockerfile` + gunicorn for the Flask app (optional VPS deploy, e.g. Hetzner/Oracle free tier). Bot + printer remain local at the shop.
- `.env.example` documents `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OWNER_ID`, `SECRET_KEY`, `TELEGRAM_BOT_TOKEN`, `DASHBOARD_URL`.

## Secrets handling

- `.env`, `accounts.txt`, `cookies.txt`, `inventory.db` stay gitignored (existing `.gitignore` already covers them).
- Live credentials from the Downloads copy are never committed.
