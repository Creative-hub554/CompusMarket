# SokChhorn Inventory Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the SokChhorn spare-parts inventory system (Flask webapp + Telegram bot + ESC/POS printing) into a maintainable, single-owner service at `sokchhorn-inventory/` with Google OAuth registration verification, owner-approval join workflow, migrations, and tests.

**Architecture:** Copy the working Python source into `sokchhorn-inventory/`, split the 3058-line `webapp.py` monolith into Flask blueprints behind an app factory, add a versioned SQLite migration runner, persist `SECRET_KEY`, remove the `/desktop-login` auth bypass, add Google OAuth (registration + join verification) and a pending→approved user status gated by the owner, and cover the refactor with pytest. The Telegram bot keeps reading the DB directly (no API layer).

**Tech Stack:** Python 3.14 (installed), Flask 3.1, python-telegram-bot 22, SQLite (raw `sqlite3`), werkzeug security, httpx, openpyxl, python-barcode, fpdf2, pywin32 (Windows), pytest.

## Global Constraints

- All new files live under `sokchhorn-inventory/` at the repo root. The existing pnpm/Turborepo TS monorepo (`apps/`, `packages/`) is **never touched**.
- Python 3.14 is available as `python` on this machine.
- Source of truth for copied code: `C:\Users\theow\Downloads\38833FF26BA1D.UnigramPreview_g9c9v27vpyspw!App\sokchhorn_spare_pc\sokchhorn_spare_pc\` (read-only).
- Secrets (`TELEGRAM_BOT_TOKEN`, `SECRET_KEY`, `OWNER_ID`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, admin credentials) are **never committed**. `.env`, `accounts.txt`, `cookies.txt`, `inventory.db` stay gitignored.
- Behavior preservation: routes, templates, and the Telegram bot must keep the same external behavior. The refactor is mechanical; do not redesign business logic.
- App factory pattern: `app.create_app()` returns the Flask app; blueprints registered there.
- Code style: 4-space indent, single quotes for Python strings (existing style), 120-char max line.
- Tests run with `python -m pytest` from `sokchhorn-inventory/`. DB tests use a temp-file override via `DB_PATH` monkeypatch.
- Each blueprint module defines `bp = Blueprint(...)` and the factory registers it with a URL prefix matching current routes (no prefix — current routes are root-level).
- After editing schema: no `prisma` here; migrations are plain SQL files under `app/migrations/`.

---

### Task 1: Scaffold the project folder and install deps

**Files:**
- Create: `sokchhorn-inventory/requirements.txt`
- Create: `sokchhorn-inventory/.env.example`
- Create: `sokchhorn-inventory/.gitignore`
- Create: `sokchhorn-inventory/tests/__init__.py`
- Copy: all `.py` source files, `templates/`, `.env.example` from the source folder (per spec scope)

**Interfaces:**
- Consumes: source folder path (above).
- Produces: working Python venv; project skeleton with copied source.

- [ ] **Step 1: Create the project directory and copy source**

```powershell
$src = "C:\Users\theow\Downloads\38833FF26BA1D.UnigramPreview_g9c9v27vpyspw!App\sokchhorn_spare_pc\sokchhorn_spare_pc"
$dst = "sokchhorn-inventory"
New-Item -ItemType Directory -Path $dst -Force | Out-Null
Copy-Item -LiteralPath "$src\main.py" -Destination $dst
Copy-Item -LiteralPath "$src\webapp.py" -Destination $dst
Copy-Item -LiteralPath "$src\config.py" -Destination $dst
Copy-Item -LiteralPath "$src\db.py" -Destination $dst
Copy-Item -LiteralPath "$src\print_utils.py" -Destination $dst
Copy-Item -LiteralPath "$src\translations.py" -Destination $dst
Copy-Item -LiteralPath "$src\utils.py" -Destination $dst
Copy-Item -LiteralPath "$src\launcher.py" -Destination $dst
Copy-Item -LiteralPath "$src\desktop_app.py" -Destination $dst
Copy-Item -LiteralPath "$src\build_desktop.py" -Destination $dst
Copy-Item -LiteralPath "$src\setup.bat" -Destination $dst
Copy-Item -LiteralPath "$src\requirements.txt" -Destination $dst
Copy-Item -LiteralPath "$src\.env.example" -Destination $dst -Force
Copy-Item -LiteralPath "$src\..\..\sokchhorn_spare_pc\.gitignore" -Destination $dst
Copy-Item -LiteralPath "$src\templates" -Destination $dst -Recurse -Force
```

(If the gitignore copy path doesn't resolve, use `$src\.gitignore` — it exists there too.)

- [ ] **Step 2: Create venv and install requirements**

```powershell
python -m venv sokchhorn-inventory\venv
& sokchhorn-inventory\venv\Scripts\python -m pip install --upgrade pip
& sokchhorn-inventory\venv\Scripts\python -m pip install -r sokchhorn-inventory\requirements.txt pytest
```

Expected: install succeeds, `pytest` available in the venv.

- [ ] **Step 3: Add `.env.example` and `.gitignore`**

Write `.env.example`:

```dotenv
# Telegram Bot Token (get from @BotFather)
TELEGRAM_BOT_TOKEN=

# Optional: Public dashboard URL (for ngrok/Fly.io)
DASHBOARD_URL=https://your-domain.com/

# Flask session secret — auto-generated and persisted to .env on first run
SECRET_KEY=

# Owner (root) user id — written automatically on first registration
OWNER_ID=

# Google OAuth (Google Cloud Console → Credentials → OAuth 2.0 Client IDs)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://127.0.0.1:5000/auth/google/callback
```

Ensure `.gitignore` contains (source already has most): `.env`, `accounts.txt`, `cookies.txt`, `inventory.db`, `inventory.db-shm`, `inventory.db-wal`, `__pycache__/`, `venv/`, `*.pyc`, `dist/`, `build/`, `*.spec`, `*.exe`, `exports/`, `imports/`, `webview_data/`, `ngrok_setup.txt`, `cloudflare_setup.txt`, `lang_prefs.json`, `bot_err.txt`, `bot_err2.txt`, `bot_out.txt`.

- [ ] **Step 4: Smoke-test the copied app boots (import + create app)**

Run from `sokchhorn-inventory/`:

```powershell
& venv\Scripts\python -c "import webapp; print('webapp OK')"
```

Expected: prints `webapp OK`. If it fails on `SECRET_KEY`/db, ignore — Task 2/3 fix those. Do **not** fix here.

- [ ] **Step 5: Commit**

```bash
git add sokchhorn-inventory
git commit -m "chore: scaffold sokchhorn-inventory project with source copy"
```

---

### Task 2: Config module with persisted SECRET_KEY and new env vars

**Files:**
- Create: `sokchhorn-inventory/app/__init__.py` (factory stub — real factory in Task 5)
- Create: `sokchhorn-inventory/app/config.py`
- Modify: `sokchhorn-inventory/config.py` (re-export to keep `main.py` imports working)
- Test: `sokchhorn-inventory/tests/test_config.py`

**Interfaces:**
- Consumes: `.env` file.
- Produces: `app.config.get_config()` returning a `Config` dataclass with fields `base_dir`, `db_path`, `admin_ids: set[int]`, `dashboard_url`, `telegram_bot_token`, `secret_key`, `owner_id: int | None`, `google_client_id`, `google_client_secret`, `google_redirect_uri`. A `SECRET_KEY` that persists across restarts.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_config.py
import os
import tempfile
from pathlib import Path

def test_secret_key_persists_across_restarts():
    with tempfile.TemporaryDirectory() as tmp:
        env_path = Path(tmp) / ".env"
        env_path.write_text("TELEGRAM_BOT_TOKEN=\nDASHBOARD_URL=\n")
        from app import config as cfg_module
        cfg_module._ENV_FILE = env_path
        c1 = cfg_module.get_config()
        c2 = cfg_module.get_config()
        assert c1.secret_key == c2.secret_key
        assert c1.secret_key != ""
        assert "SECRET_KEY=" in env_path.read_text()

def test_new_env_vars_read():
    import app.config as cfg
    cfg._ENV_FILE = None
    c = cfg.get_config()
    assert hasattr(c, "google_client_id")
    assert hasattr(c, "google_client_secret")
    assert hasattr(c, "google_redirect_uri")
    assert hasattr(c, "owner_id")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `venv\Scripts\python -m pytest tests/test_config.py -v`
Expected: FAIL — `app` package or `app.config` not found / no `get_config`.

- [ ] **Step 3: Write `app/config.py`**

```python
import os
import secrets
import sys
from dataclasses import dataclass, field
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE = os.path.join(BASE_DIR, ".env")
_ENV_FILE = ENV_FILE  # module-level hook for tests

load_dotenv(_ENV_FILE)


def _persist_secret():
    """Return a stable SECRET_KEY, writing a generated one back to .env if absent."""
    key = os.getenv("SECRET_KEY", "")
    if key:
        return key
    key = secrets.token_hex(32)
    try:
        lines = []
        if os.path.exists(_ENV_FILE):
            with open(_ENV_FILE, "r", encoding="utf-8") as f:
                lines = f.readlines()
        if not any(l.startswith("SECRET_KEY=") for l in lines):
            lines.append(f"SECRET_KEY={key}\n")
            with open(_ENV_FILE, "w", encoding="utf-8") as f:
                f.writelines(lines)
        os.environ["SECRET_KEY"] = key
    except Exception:
        pass
    return key


@dataclass(frozen=True)
class Config:
    base_dir: str
    db_path: str
    admin_ids: frozenset = field(default_factory=frozenset)
    dashboard_url: str = ""
    telegram_bot_token: str = ""
    secret_key: str = ""
    owner_id: int | None = None
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = ""


def get_config() -> Config:
    bd = BASE_DIR
    owner = os.getenv("OWNER_ID", "").strip()
    return Config(
        base_dir=bd,
        db_path=os.getenv("DB_PATH", os.path.join(bd, "inventory.db")),
        admin_ids=frozenset({int(x) for x in os.getenv("ADMIN_IDS", "7185846273").split(",") if x.strip()}),
        dashboard_url=os.getenv("DASHBOARD_URL", "https://sokchhorn-bot.fly.dev/").rstrip("/") + "/",
        telegram_bot_token=os.getenv("TELEGRAM_BOT_TOKEN", ""),
        secret_key=_persist_secret(),
        owner_id=int(owner) if owner else None,
        google_client_id=os.getenv("GOOGLE_CLIENT_ID", ""),
        google_client_secret=os.getenv("GOOGLE_CLIENT_SECRET", ""),
        google_redirect_uri=os.getenv("GOOGLE_REDIRECT_URI", "http://127.0.0.1:5000/auth/google/callback"),
    )
```

- [ ] **Step 4: Create `app/__init__.py` stub**

```python
# app/__init__.py
"""SokChhorn inventory Flask application package."""
```

- [ ] **Step 5: Make the legacy `config.py` a thin re-export**

Replace `sokchhorn-inventory/config.py` contents with:

```python
from app.config import get_config as _get_config

_cfg = _get_config()
BASE_DIR = _cfg.base_dir
DB_PATH = _cfg.db_path
ADMIN_IDS = set(_cfg.admin_ids)
DASHBOARD_URL = _cfg.dashboard_url
TELEGRAM_BOT_TOKEN = _cfg.telegram_bot_token
SECRET_KEY = _cfg.secret_key
```

This keeps `main.py` (`from config import DB_PATH, ADMIN_IDS, DASHBOARD_URL`) working unchanged.

- [ ] **Step 6: Run tests to verify they pass**

Run: `venv\Scripts\python -m pytest tests/test_config.py -v`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add sokchhorn-inventory/app sokchhorn-inventory/config.py sokchhorn-inventory/tests
git commit -m "feat: add config module with persisted SECRET_KEY and Google OAuth env vars"
```

---

### Task 3: DB module with versioned migration runner

**Files:**
- Create: `sokchhorn-inventory/app/db.py`
- Create: `sokchhorn-inventory/app/migrations/001_initial.sql`
- Modify: `sokchhorn-inventory/db.py` (re-export to keep `main.py`/bot imports working)
- Modify: `sokchhorn-inventory/app/config.py` (add `db_path` passthrough — already there)
- Test: `sokchhorn-inventory/tests/test_db.py`

**Interfaces:**
- Consumes: `app.config.get_config().db_path`.
- Produces: `app.db.get_db()` (contextmanager, WAL+FK+Row), `app.db.execute/fetchone/fetchall/executemany`, `app.db.migrate(db_path)` idempotent runner, `app.db.get_version(db_path)`. Legacy `db.py` re-exports these so `main.py` (bot) still imports `from db import fetchone, fetchall, get_db`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_db.py
import os
import tempfile
from app import db

def test_migrate_creates_tables_and_tracks_version():
    with tempfile.TemporaryDirectory() as tmp:
        p = os.path.join(tmp, "inventory.db")
        db.migrate(p)
        with db.get_db(p) as conn:
            v = conn.execute("SELECT version FROM schema_migrations ORDER BY version DESC").fetchone()
            assert v is not None and v[0] == 1
            cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='admin'")
            assert cur.fetchone() is not None

def test_migrate_is_idempotent():
    with tempfile.TemporaryDirectory() as tmp:
        p = os.path.join(tmp, "inventory.db")
        db.migrate(p)
        db.migrate(p)
        with db.get_db(p) as conn:
            v = conn.execute("SELECT COUNT(*) FROM schema_migrations").fetchone()[0]
            assert v == 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `venv\Scripts\python -m pytest tests/test_db.py -v`
Expected: FAIL — `app.db` has no `migrate`/`get_db`/no `schema_migrations`.

- [ ] **Step 3: Write `app/migrations/001_initial.sql`**

Extract the exact `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE` guards from `webapp.py` lines 42–376 into this SQL file. It must produce these tables: `admin`, `bot_config`, `brands`, `customer_sales`, `customers`, `item_imeis`, `items`, `notification_users`, `payment_schedules`, `product_groups`, `receipts`, `sales`, `staff`, `stock_movements`, `transactions`. Keep the idempotent `INSERT OR IGNORE` defaults (`unlock_pin`, `desktop_allow_*`, etc.). Add the new `users.status` column in this migration as well:

```sql
ALTER TABLE admin ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
```

(When the migration runner applies this, an existing `active` column stays; set pre-existing rows to `active` explicitly at the end of the migration):

```sql
UPDATE admin SET status='active' WHERE active=1 OR role='admin';
```

- [ ] **Step 4: Write `app/db.py`**

```python
import os
import sqlite3
from contextlib import contextmanager

from app.config import get_config

MIGRATIONS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "migrations")


def get_db(db_path=None):
    """Context manager yielding a sqlite3.Connection (WAL, FK, Row factory)."""
    path = db_path or get_config().db_path

    @contextmanager
    def _inner():
        conn = sqlite3.connect(path)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    return _inner()


def get_db_cursor(db_path=None):
    with get_db(db_path) as conn:
        yield conn.cursor()


def execute(query, params=None, db_path=None):
    with get_db(db_path) as conn:
        cur = conn.execute(query, params or [])
        return cur.lastrowid


def fetchone(query, params=None, db_path=None):
    with get_db(db_path) as conn:
        cur = conn.execute(query, params or [])
        return cur.fetchone()


def fetchall(query, params=None, db_path=None):
    with get_db(db_path) as conn:
        cur = conn.execute(query, params or [])
        return cur.fetchall()


def executemany(query, params_list, db_path=None):
    with get_db(db_path) as conn:
        conn.executemany(query, params_list)


def migrate(db_path=None):
    """Apply all pending .sql migrations in app/migrations/ in order."""
    path = db_path or get_config().db_path
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute(
            """CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP)"""
        )
        files = sorted(f for f in os.listdir(MIGRATIONS_DIR) if f.endswith(".sql"))
        for fname in files:
            version = int(fname.split("_")[0])
            row = conn.execute("SELECT 1 FROM schema_migrations WHERE version=?", (version,)).fetchone()
            if row:
                continue
            with open(os.path.join(MIGRATIONS_DIR, fname), "r", encoding="utf-8") as f:
                conn.executescript(f.read())
            conn.execute("INSERT INTO schema_migrations (version) VALUES (?)", (version,))
            conn.commit()
    finally:
        conn.close()
```

- [ ] **Step 5: Make legacy `db.py` a thin re-export**

Replace `sokchhorn-inventory/db.py` with:

```python
from app.db import get_db, get_db_cursor, execute, fetchone, fetchall, executemany, migrate  # noqa: F401
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `venv\Scripts\python -m pytest tests/test_db.py -v`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add sokchhorn-inventory/app/db.py sokchhorn-inventory/app/migrations sokchhorn-inventory/db.py sokchhorn-inventory/tests/test_db.py
git commit -m "feat: add versioned SQLite migration runner"
```

---

### Task 4: Shared helpers module (ROLES, config access, decorators)

**Files:**
- Create: `sokchhorn-inventory/app/helpers.py`
- Test: `sokchhorn-inventory/tests/test_helpers.py`

**Interfaces:**
- Consumes: `app.config`, `app.db`, `flask.session/request`.
- Produces:
  - `ROLES` dict (admin/manager/staff levels 100/50/10) and `DESKTOP_FEATURES` dict (moved verbatim from webapp.py lines 22–39).
  - `login_required(f)`, `role_required(min_level)`, `desktop_feature_required(feature)` decorators (moved from webapp.py lines 575–609, 418–432).
  - `get_config(key, default)`, `set_config(key, value)`, `desktop_feature_allowed(feature)`, `get_desktop_perms()` (moved from webapp.py 390–416).
  - `current_user_role()` returning session role, `is_owner()` helper.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_helpers.py
import flask
import pytest
from app import helpers


def make_app():
    a = flask.Flask(__name__)
    a.secret_key = "test"

    @a.route("/login")
    def login():
        return "login"

    @a.route("/staff")
    @helpers.login_required
    def staff_page():
        return "staff"

    @a.route("/settings")
    @helpers.role_required(100)
    def settings_page():
        return "settings"

    @a.route("/deny")
    @helpers.role_required(100)
    def deny_page():
        return "deny"

    return a


def test_login_required_redirects_anonymous():
    a = make_app()
    c = a.test_client()
    r = c.get("/staff")
    assert r.status_code == 302
    assert "/login" in r.headers["Location"]


def test_role_required_blocks_staff():
    a = make_app()
    with a.test_request_context():
        flask.session["admin_id"] = 1
        flask.session["admin_role"] = "staff"
        with a.test_client() as c:
            r = c.get("/settings")
            assert r.status_code == 302
            assert "/dashboard" in r.headers["Location"]


def test_role_required_allows_admin():
    a = make_app()
    with a.test_client() as c:
        with c.session_transaction() as s:
            s["admin_id"] = 1
            s["admin_role"] = "admin"
        r = c.get("/settings")
        assert r.status_code == 200


def test_is_owner():
    with flask.Flask(__name__).test_request_context():
        flask.session["admin_id"] = 1
        flask.session["admin_role"] = "admin"
        assert helpers.is_owner() is True
```

- [ ] **Step 2: Run test to verify it fails**

Run: `venv\Scripts\python -m pytest tests/test_helpers.py -v`
Expected: FAIL — `app.helpers` missing.

- [ ] **Step 3: Write `app/helpers.py`**

```python
import functools

from flask import flash, redirect, request, session, url_for

from app.db import fetchone


def _get_config_row(key, default):
    row = fetchone("SELECT value FROM bot_config WHERE key=?", (key,))
    return row["value"] if row else default


ROLES = {
    "admin": {"name": "Admin", "level": 100},
    "manager": {"name": "Manager", "level": 50},
    "staff": {"name": "Staff", "level": 10},
}

DESKTOP_FEATURES = {
    "delete": {"label": "Delete", "icon": "bi-trash", "desc": "Delete items, sales, customers, brands & categories", "default": "0"},
    "print": {"label": "Print", "icon": "bi-printer", "desc": "Print barcodes & receipts", "default": "1"},
    "import": {"label": "Import", "icon": "bi-box-arrow-in-down", "desc": "Add stock, import Excel, add items", "default": "1"},
    "edit": {"label": "Edit", "icon": "bi-pencil", "desc": "Edit item prices & details", "default": "1"},
    "export": {"label": "Export", "icon": "bi-file-earmark-excel", "desc": "Download Excel reports", "default": "1"},
    "sellout": {"label": "Sellout", "icon": "bi-cart-plus", "desc": "Make sales & sellout", "default": "1"},
    "customers": {"label": "Customers", "icon": "bi-people", "desc": "Manage customers & credit", "default": "1"},
}


def login_required(f):
    @functools.wraps(f)
    def wrapper(*args, **kwargs):
        if "admin_id" not in session:
            return redirect(url_for("login"))
        row = fetchone("SELECT active FROM admin WHERE id=?", (session["admin_id"],))
        if not row or row["active"] == 0:
            session.clear()
            flash("Account deactivated", "danger")
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return wrapper


def role_required(min_level=10):
    def decorator(f):
        @functools.wraps(f)
        def wrapper(*args, **kwargs):
            if "admin_id" not in session:
                return redirect(url_for("login"))
            role = session.get("admin_role", "staff")
            level = ROLES.get(role, {}).get("level", 0)
            if level < min_level:
                flash("Access denied: insufficient privileges", "danger")
                return redirect(url_for("dashboard"))
            return f(*args, **kwargs)
        return wrapper
    return decorator


def get_config(key, default=""):
    return _get_config_row(key, default)


def set_config(key, value):
    from app.db import get_db
    with get_db() as conn:
        conn.execute(
            "INSERT INTO bot_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, str(value)),
        )


def desktop_feature_allowed(feature):
    if not session.get("is_desktop"):
        return True
    default = DESKTOP_FEATURES.get(feature, {}).get("default", "1")
    return get_config(f"desktop_allow_{feature}", default) == "1"


def get_desktop_perms():
    return {f: get_config(f"desktop_allow_{f}", DESKTOP_FEATURES[f]["default"]) for f in DESKTOP_FEATURES}


def desktop_feature_required(feature):
    def decorator(f):
        @functools.wraps(f)
        def wrapper(*args, **kwargs):
            if not desktop_feature_allowed(feature):
                label = DESKTOP_FEATURES.get(feature, {}).get("label", feature)
                if request.headers.get("X-Requested-With") == "XMLHttpRequest" or request.is_json:
                    return {"ok": False, "msg": f'"{label}" is disabled in the desktop app. Enable it from the web Settings.'}
                flash(f'"{label}" is disabled in the desktop app. Enable it from the web Settings.', "danger")
                return redirect(url_for("dashboard"))
            return f(*args, **kwargs)
        return wrapper
    return decorator


def current_user_role():
    return session.get("admin_role", "staff")


def is_owner():
    return session.get("admin_role") == "admin"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `venv\Scripts\python -m pytest tests/test_helpers.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add sokchhorn-inventory/app/helpers.py sokchhorn-inventory/tests/test_helpers.py
git commit -m "feat: add shared helpers module (roles, decorators, config access)"
```

---

### Task 5: App factory + thin webapp entry

**Files:**
- Modify: `sokchhorn-inventory/app/__init__.py`
- Modify: `sokchhorn-inventory/webapp.py`
- Test: `sokchhorn-inventory/tests/test_factory.py`

**Interfaces:**
- Consumes: `app.config.get_config`, `app.db.migrate`, `app.helpers`.
- Produces: `app.create_app()` — Flask app with `secret_key`, `migrate()` called on creation, context processor (moved from webapp.py 531–550), error handlers 404/500 (552–558), and blueprint registration (blueprints created in Tasks 6–9). `webapp.py` becomes: `from app import create_app; app = create_app(); if __name__ == "__main__": app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=False)`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_factory.py
import os
import tempfile
from app import create_app


def test_create_app_boots(tmp_path, monkeypatch):
    monkeypatch.setenv("DB_PATH", str(tmp_path / "inv.db"))
    app = create_app()
    assert app.secret_key
    c = app.test_client()
    r = c.get("/")
    # No blueprints yet: expect 404. After Tasks 6-9, this changes.
    assert r.status_code in (302, 404)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `venv\Scripts\python -m pytest tests/test_factory.py -v`
Expected: FAIL — `app.create_app` missing.

- [ ] **Step 3: Write `app/__init__.py` factory**

```python
import os
from datetime import datetime

from flask import Flask, render_template, session

from app.config import get_config
from app.db import migrate


def create_app():
    cfg = get_config()
    migrate(cfg.db_path)

    app = Flask(__name__)
    app.secret_key = cfg.secret_key

    from app import helpers
    from app.blueprints import auth, inventory, sales, customers, settings  # noqa: F401
    from app import printing

    for mod in (auth, inventory, sales, customers, settings):
        app.register_blueprint(mod.bp)

    @app.context_processor
    def inject_now():
        staff_list = []
        try:
            from app.db import get_db
            with get_db() as conn:
                cur = conn.execute("SELECT id, name, role FROM staff ORDER BY name")
                staff_list = cur.fetchall()
        except Exception:
            pass
        admin_role = session.get("admin_role", "")
        level = helpers.ROLES.get(admin_role, {}).get("level", 0)
        return {
            "now": datetime.now(),
            "_d": _d,
            "lang": lambda: session.get("lang", "en"),
            "prices_unlocked": lambda: session.get("prices_unlocked", False),
            "is_desktop": session.get("is_desktop", False),
            "staff_list": staff_list,
            "staff_name": lambda: session.get("staff_name", ""),
            "admin_role": admin_role,
            "admin_level": level,
            "desktop_allowed": helpers.desktop_feature_allowed,
            "DESKTOP_FEATURES": helpers.DESKTOP_FEATURES,
            "ROLES": helpers.ROLES,
        }

    @app.errorhandler(404)
    def not_found(e):
        return render_template("404.html"), 404

    @app.errorhandler(500)
    def server_error(e):
        return render_template("500.html"), 500

    return app
```

The `_d` name in the context processor must be imported — add at top of factory:

```python
from app.translations import _d
```

Add `sokchhorn-inventory/app/translations.py` as a re-export:

```python
from translations import DT

def _d(key, lang=None):
    import flask
    if lang is None:
        lang = flask.session.get("lang", "en")
    entry = DT.get(key, {})
    if lang in entry:
        return entry[lang]
    return entry.get("en", key)
```

(Keeps the `_d` behavior from webapp.py lines 377–383; `DT` comes from the legacy `translations.py`.)

- [ ] **Step 4: Make `webapp.py` thin**

Replace `sokchhorn-inventory/webapp.py` with:

```python
import os

from app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
```

- [ ] **Step 5: Create blueprint placeholder modules**

Create `app/blueprints/__init__.py` (empty) and the five blueprint files with a stub `bp = Blueprint(...)` so the factory import works. Tasks 6–9 fill in routes.

```python
# app/blueprints/auth.py
from flask import Blueprint
bp = Blueprint("auth", __name__)
```

(Repeat for `inventory.py`, `sales.py`, `customers.py`, `settings.py`.)

- [ ] **Step 6: Run tests to verify they pass**

Run: `venv\Scripts\python -m pytest tests/ -v`
Expected: test_factory passes (blueprint stubs import fine). test_config/test_db/test_helpers still pass.

- [ ] **Step 7: Commit**

```bash
git add sokchhorn-inventory/app/__init__.py sokchhorn-inventory/webapp.py sokchhorn-inventory/tests/test_factory.py
git commit -m "feat: add Flask app factory and thin webapp entry"
```

---

### Task 6: Auth blueprint (login/logout/register + Google OAuth + approval)

**Files:**
- Modify: `sokchhorn-inventory/app/blueprints/auth.py`
- Create: `sokchhorn-inventory/app/google_oauth.py`
- Modify: `sokchhorn-inventory/app/__init__.py` (ensure context processor works with templates)
- Test: `sokchhorn-inventory/tests/test_auth.py`

**Interfaces:**
- Consumes: `app.helpers`, `app.db`, `app.config`, `werkzeug.security`.
- Produces:
  - `bp` routes: `GET /register`, `GET /auth/google` (redirect), `GET /auth/google/callback` (exchange code, verify, redirect to register with verified email), `GET /login`, `GET /logout`, `GET /approve/<int:user_id>` and `POST /approve/<int:user_id>` (owner only), `GET /lang/<code>`, `POST /set-theme`, and the legacy index redirect behavior.
  - `app.google_oauth.get_google_auth_url()` and `app.google_oauth.exchange_code(code) -> dict` (mocked in tests).
  - Registration writes `status='pending'`; owner approval flips to `active`. When no active owner exists, first registration creates owner (`status='active'`, role `admin`), and `OWNER_ID` is written to `.env`.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_auth.py
import os
import tempfile
from unittest.mock import patch

import pytest

from app import create_app
from app import db


@pytest.fixture
def app_env(tmp_path, monkeypatch):
    monkeypatch.setenv("DB_PATH", str(tmp_path / "inv.db"))
    app = create_app()
    return app


def test_register_first_user_creates_owner(app_env):
    with app_env.test_client() as c:
        r = c.get("/register")
        assert r.status_code == 200


def test_register_staff_goes_pending(app_env):
    from unittest.mock import patch
    with app_env.test_client() as c:
        # Owner exists first
        with db.get_db() as conn:
            conn.execute("INSERT INTO admin (username, password_hash, role, status) VALUES ('owner','x','admin','active')")
        with patch("app.google_oauth.exchange_code", return_value={"email": "staff1@gmail.com", "verified_email": True}):
            c.get("/auth/google/callback?code=abc")
        r = c.post("/register", data={"username": "staff1", "password": "pass1234", "confirm": "pass1234", "email": "staff1@gmail.com"})
        with db.get_db() as conn:
            row = conn.execute("SELECT status, role FROM admin WHERE username='staff1'").fetchone()
        assert row["status"] == "pending"
        assert row["role"] == "staff"


def test_pending_user_cannot_login(app_env):
    from werkzeug.security import generate_password_hash
    with app_env.test_client() as c:
        with db.get_db() as conn:
            conn.execute(
                "INSERT INTO admin (username, password_hash, role, status, active) VALUES (?,?,?,?,1)",
                ("p", generate_password_hash("secret123"), "staff", "pending"))
        r = c.post("/login", data={"username": "p", "password": "secret123"})
        assert r.status_code == 200  # login page re-rendered, no session
        assert "admin_id" not in __import__("flask").session


def test_owner_approval_flips_status(app_env):
    with app_env.test_client() as c:
        with db.get_db() as conn:
            conn.execute("INSERT INTO admin (username, password_hash, role, status) VALUES ('owner','x','admin','active')")
            conn.execute("INSERT INTO admin (username, password_hash, role, status) VALUES ('s2','x','staff','pending')")
            uid = conn.execute("SELECT id FROM admin WHERE username='s2'").fetchone()[0]
        with c.session_transaction() as s:
            s["admin_id"] = 1
            s["admin_role"] = "admin"
        r = c.post(f"/approve/{uid}", data={})
        with db.get_db() as conn:
            row = conn.execute("SELECT status FROM admin WHERE id=?", (uid,)).fetchone()
        assert row["status"] == "active"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `venv\Scripts\python -m pytest tests/test_auth.py -v`
Expected: FAIL — routes missing (404) or no `/auth/google`.

- [ ] **Step 3: Write `app/google_oauth.py`**

```python
import httpx

from app.config import get_config


def get_google_auth_url():
    cfg = get_config()
    params = {
        "client_id": cfg.google_client_id,
        "redirect_uri": cfg.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
    }
    import urllib.parse
    return "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)


def exchange_code(code):
    """Exchange the auth code for the userinfo dict. Raises ValueError on failure."""
    cfg = get_config()
    resp = httpx.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": cfg.google_client_id,
            "client_secret": cfg.google_client_secret,
            "redirect_uri": cfg.google_redirect_uri,
            "grant_type": "authorization_code",
        },
        timeout=10,
    )
    if resp.status_code != 200:
        raise ValueError("Google token exchange failed")
    token = resp.json()["access_token"]
    info = httpx.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    if info.status_code != 200:
        raise ValueError("Google userinfo failed")
    data = info.json()
    if not data.get("verified_email"):
        raise ValueError("Google email not verified")
    return data
```

- [ ] **Step 4: Write the auth blueprint**

`app/blueprints/auth.py`:

```python
import sqlite3
from functools import wraps

from flask import (Blueprint, flash, redirect, render_template, request,
                   session, url_for)
from werkzeug.security import check_password_hash, generate_password_hash

from app import google_oauth
from app.config import get_config
from app.db import execute, fetchone, get_db
from app.helpers import is_owner, login_required, role_required, ROLES

bp = Blueprint("auth", __name__)


def _has_active_owner():
    row = fetchone("SELECT COUNT(*) AS n FROM admin WHERE role='admin' AND status='active'")
    return row["n"] > 0


@bp.route("/")
def index():
    if "admin_id" in session:
        return redirect(url_for("dashboard"))
    if not _has_active_owner():
        return redirect(url_for("auth.register"))
    return redirect(url_for("auth.login"))


@bp.route("/lang/<code>")
def set_lang(code):
    if code in ("en", "km"):
        session["lang"] = code
    return redirect(request.referrer or url_for("auth.index"))


@bp.route("/set-theme", methods=["POST"])
def set_theme():
    theme = request.form.get("theme", "light")
    if theme in ("light", "dark"):
        session["theme"] = theme
    return ("", 204)


@bp.route("/register", methods=["GET", "POST"])
def register():
    cfg = get_config()
    verified_email = session.pop("_google_email", "")
    if _has_active_owner():
        # Owner exists → this is a staff join request (also Google-gated)
        pass  # render register form; approval required
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        confirm = request.form.get("confirm", "")
        email = request.form.get("email", "").strip() or verified_email
        if not username or not password:
            flash("Username and password required", "danger")
        elif password != confirm:
            flash("Passwords do not match", "danger")
        elif len(password) < 4:
            flash("Password must be at least 4 characters", "danger")
        elif not verified_email:
            flash("Verify your email with Google first", "danger")
        else:
            is_first = not _has_active_owner()
            role = "admin" if is_first else "staff"
            status = "active" if is_first else "pending"
            try:
                uid = execute(
                    "INSERT INTO admin (username, password_hash, role, status, active, google_email) VALUES (?,?,?,?,1,?)",
                    (username, generate_password_hash(password), role, status, email),
                )
                if is_first:
                    _persist_owner_id(uid)
                    flash("Owner account created! Please log in.", "success")
                else:
                    _notify_owner_pending(uid, username)
                    flash("Request sent! The owner must approve your account.", "info")
                return redirect(url_for("auth.login"))
            except sqlite3.IntegrityError:
                flash("Username already exists", "danger")
    return render_template("register.html", google_url=google_oauth.get_google_auth_url())


@bp.route("/auth/google")
def google_login():
    return redirect(google_oauth.get_google_auth_url())


@bp.route("/auth/google/callback")
def google_callback():
    code = request.args.get("code")
    if not code:
        flash("Google sign-in cancelled", "warning")
        return redirect(url_for("auth.register"))
    try:
        info = google_oauth.exchange_code(code)
    except ValueError as e:
        flash(str(e), "danger")
        return redirect(url_for("auth.register"))
    session["_google_email"] = info.get("email", "")
    return redirect(url_for("auth.register"))


@bp.route("/approve/<int:user_id>", methods=["GET", "POST"])
@role_required(100)
def approve_user(user_id):
    row = fetchone("SELECT id, username, status FROM admin WHERE id=?", (user_id,))
    if not row:
        flash("User not found", "danger")
        return redirect(url_for("auth.index"))
    if request.method == "POST":
        execute("UPDATE admin SET status='active' WHERE id=? AND status='pending'", (user_id,))
        flash(f"Approved {row['username']}", "success")
        return redirect(url_for("settings.users_list"))
    return render_template("approve.html", user=row)


@bp.route("/login", methods=["GET", "POST"])
def login():
    if "admin_id" in session:
        return redirect(url_for("dashboard"))
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        row = fetchone("SELECT admin.* FROM admin WHERE username = ?", (username,))
        if row and row["active"] != 0 and check_password_hash(row["password_hash"], password):
            if row["status"] != "active":
                flash("Account pending owner approval", "warning")
                return render_template("login.html")
            session["admin_id"] = row["id"]
            session["admin_username"] = row["username"]
            session["admin_role"] = row["role"]
            session["is_desktop"] = False
            flash("Logged in successfully", "success")
            return redirect(url_for("dashboard"))
        flash("Invalid username or password", "danger")
    return render_template("login.html")


@bp.route("/logout")
def logout():
    session.clear()
    flash("Logged out", "info")
    return redirect(url_for("auth.login"))


def _persist_owner_id(user_id):
    """Write OWNER_ID=<user_id> into .env so config reloads see it."""
    from app.config import _ENV_FILE, get_config
    try:
        lines = []
        import os
        if os.path.exists(_ENV_FILE):
            with open(_ENV_FILE, "r", encoding="utf-8") as f:
                lines = f.readlines()
        if not any(l.startswith("OWNER_ID=") for l in lines):
            lines.append(f"OWNER_ID={user_id}\n")
            with open(_ENV_FILE, "w", encoding="utf-8") as f:
                f.writelines(lines)
    except Exception:
        pass


def _notify_owner_pending(user_id, username):
    """Notify the owner's Telegram chat that a join request is pending."""
    from app.config import get_config
    import httpx
    cfg = get_config()
    token = cfg.telegram_bot_token
    if not token:
        return
    for cid in cfg.admin_ids:
        try:
            httpx.post(
                f"https://api.telegram.org/bot{token.split(',')[0].strip()}/sendMessage",
                json={"chat_id": cid, "parse_mode": "Markdown",
                      "text": f"🔔 *Join request*: `{username}` (id {user_id}) needs approval."},
                timeout=5,
            )
        except Exception:
            pass
```

- [ ] **Step 5: Add `google_email` column migration**

Append to `app/migrations/001_initial.sql`:

```sql
ALTER TABLE admin ADD COLUMN google_email TEXT;
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `venv\Scripts\python -m pytest tests/test_auth.py -v`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add sokchhorn-inventory/app/blueprints/auth.py sokchhorn-inventory/app/google_oauth.py sokchhorn-inventory/tests/test_auth.py sokchhorn-inventory/app/migrations
git commit -m "feat: add auth blueprint with Google OAuth verification and owner approval"
```

---

### Task 7: Settings blueprint (settings, staff/users, approval UI)

**Files:**
- Modify: `sokchhorn-inventory/app/blueprints/settings.py`
- Test: `sokchhorn-inventory/tests/test_settings.py`

**Interfaces:**
- Consumes: `app.helpers` (role_required, get_config/set_config, desktop_feature_allowed), `app.db`, `app.config`.
- Produces: `bp` routes moved verbatim from webapp.py: `/settings`, `/unlock-prices`, `/lock-prices`, `/set-staff`, `/staff`, `/staff/create`, `/staff/delete/<int:staff_id>`, `/users`, `/users/create`, `/users/edit/<int:user_id>`, `/users/delete/<int:user_id>`, `/dashboard/alert-prefs`, `/settings/test-print`. Staff/users management routes get `@role_required(100)` (owner-only per spec). `/users` gains a `pending` filter section and approval links.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_settings.py
from app import create_app
from app import db


def test_staff_cannot_access_users(tmp_path, monkeypatch):
    monkeypatch.setenv("DB_PATH", str(tmp_path / "inv.db"))
    app = create_app()
    with app.test_client() as c:
        with db.get_db() as conn:
            conn.execute("INSERT INTO admin (username, password_hash, role, status) VALUES ('owner','x','admin','active')")
            conn.execute("INSERT INTO admin (username, password_hash, role, status) VALUES ('s','x','staff','active')")
            sid = conn.execute("SELECT id FROM admin WHERE username='s'").fetchone()[0]
        with c.session_transaction() as s:
            s["admin_id"] = sid
            s["admin_role"] = "staff"
        r = c.get("/users")
        assert r.status_code == 302
        assert "/dashboard" in r.headers["Location"]


def test_owner_can_access_users(tmp_path, monkeypatch):
    monkeypatch.setenv("DB_PATH", str(tmp_path / "inv.db"))
    app = create_app()
    with app.test_client() as c:
        with db.get_db() as conn:
            conn.execute("INSERT INTO admin (username, password_hash, role, status) VALUES ('owner','x','admin','active')")
            oid = conn.execute("SELECT id FROM admin WHERE username='owner'").fetchone()[0]
        with c.session_transaction() as s:
            s["admin_id"] = oid
            s["admin_role"] = "admin"
        r = c.get("/users")
        assert r.status_code == 200
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `venv\Scripts\python -m pytest tests/test_settings.py -v`
Expected: FAIL — routes missing or not owner-gated.

- [ ] **Step 3: Implement the settings blueprint**

Move the route bodies verbatim from `webapp.py` (lines 694–963, 1049–1062, 2009–2127, 2894–2910) into `settings.py`, rewriting each decorator from `@app.route(...)` to `@bp.route(...)` and replacing `get_db()`/`get_config()`/`set_config()` calls with the `app.db`/`app.helpers` equivalents. Add `@role_required(100)` to `/staff`, `/staff/create`, `/staff/delete`, `/users`, `/users/create`, `/users/edit`, `/users/delete`. The `/users` list query adds a `WHERE status='pending'` section listing pending accounts with approve/reject buttons (reject = delete row).

- [ ] **Step 4: Run tests to verify they pass**

Run: `venv\Scripts\python -m pytest tests/test_settings.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add sokchhorn-inventory/app/blueprints/settings.py sokchhorn-inventory/tests/test_settings.py
git commit -m "feat: add settings blueprint with owner-gated staff/user management"
```

---

### Task 8: Inventory blueprint

**Files:**
- Modify: `sokchhorn-inventory/app/blueprints/inventory.py`
- Test: `sokchhorn-inventory/tests/test_inventory.py`

**Interfaces:**
- Consumes: `app.helpers`, `app.db`, `app.config`, `openpyxl`, `barcode`.
- Produces: `bp` routes moved verbatim from webapp.py: `/inventory`, `/inventory/add-stock`, `/inventory/import-stock` (GET+POST), `/inventory/add-item`, `/inventory/edit`, `/inventory/delete/<int:item_id>`, `/inventory/delete-bulk`, `/inventory/<int:item_id>`, `/inventory/download-template`, `/inventory/import-excel`, `/inventory/barcode`, `/inventory/barcode/<path:data>/svg`, `/inventory/barcode/export-pdf`, `/inventory/barcode/direct-print`, `/brands*`, `/groups*`, `/categories*`, `/export/inventory`, `/export/brands`, `/export/groups`, `/stock-movements`, `/scan`.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_inventory.py
from app import create_app
from app import db


def _owner_session(c):
    with db.get_db() as conn:
        conn.execute("INSERT INTO admin (username, password_hash, role, status) VALUES ('o','x','admin','active')")
        oid = conn.execute("SELECT id FROM admin WHERE username='o'").fetchone()[0]
    with c.session_transaction() as s:
        s["admin_id"] = oid
        s["admin_role"] = "admin"


def test_add_item_and_inventory_page(tmp_path, monkeypatch):
    monkeypatch.setenv("DB_PATH", str(tmp_path / "inv.db"))
    app = create_app()
    with app.test_client() as c:
        _owner_session(c)
        r = c.post("/inventory/add-item", data={"name": "Brake Pad", "category": "Brake", "price": "10", "cost_price": "6", "stock": "5"})
        assert r.status_code in (200, 302)
        r2 = c.get("/inventory")
        assert r2.status_code == 200
        with db.get_db() as conn:
            n = conn.execute("SELECT COUNT(*) FROM items").fetchone()[0]
        assert n == 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `venv\Scripts\python -m pytest tests/test_inventory.py -v`
Expected: FAIL — route missing (404).

- [ ] **Step 3: Implement the inventory blueprint**

Move the route bodies verbatim from webapp.py (lines 1064–1467, 1685–2008, 2137–2257, 2270–2598, 2926–2954) into `inventory.py`, rewriting decorators `@app.route` → `@bp.route` and `get_db()` → `app.db.get_db()`. Keep helper functions `get_brand_prefix`, `next_product_code`, `log_stock_movement`, `export_excel` — copy these into `inventory.py` or into a shared `app/exporting.py` module (recommended: `app/exporting.py` for `export_excel`, and keep the others in `inventory.py`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `venv\Scripts\python -m pytest tests/test_inventory.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add sokchhorn-inventory/app/blueprints/inventory.py sokchhorn-inventory/tests/test_inventory.py
git commit -m "feat: add inventory blueprint"
```

---

### Task 9: Sales + customers blueprints

**Files:**
- Modify: `sokchhorn-inventory/app/blueprints/sales.py`
- Modify: `sokchhorn-inventory/app/blueprints/customers.py`
- Test: `sokchhorn-inventory/tests/test_sales.py`

**Interfaces:**
- Consumes: `app.helpers`, `app.db`, `app.config`, `app.printing`.
- Produces:
  - sales `bp`: `/sellout`, `/customer-sellout/<int:cust_id>`, `/wholesale-sellout`, `/customer-sellout/<int:cust_id>/complete`, `/sellout/scan`, `/sellout/complete`, `/receipt/<int:receipt_id>`, `/receipt/<int:receipt_id>/print`, `/receipt/<int:receipt_id>/direct-print`, `/receipts`, `/sales`, `/sales/<int:sale_id>/delete`, `/sales/<int:sale_id>/return`, `/sales/<int:sale_id>/edit`, `/returns`, `/export/sales`, `/export/bills`, `/export/schedules`, `/schedules`, `/schedules/mark-paid`, `/export/schedules`, `/export/sales`.
  - customers `bp`: `/customers`, `/customers/<int:cust_id>`, `/customers/<int:cust_id>/statement`, `/customers/create`, `/customers/<int:cust_id>/edit`, `/customers/<int:cust_id>/delete`, `/customer-sellout` handlers that touch customers, `/export/customers`.
  - `app/printing` module: move `print_utils.py` content under `app/printing/` and re-export.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_sales.py
from app import create_app
from app import db


def test_sellout_page_and_receipt(tmp_path, monkeypatch):
    monkeypatch.setenv("DB_PATH", str(tmp_path / "inv.db"))
    app = create_app()
    with app.test_client() as c:
        with db.get_db() as conn:
            conn.execute("INSERT INTO admin (username, password_hash, role, status) VALUES ('o','x','admin','active')")
            oid = conn.execute("SELECT id FROM admin WHERE username='o'").fetchone()[0]
            conn.execute("INSERT INTO items (name, category, price, cost_price, stock, qty) VALUES ('P','B',10,6,5,5)")
        with c.session_transaction() as s:
            s["admin_id"] = oid
            s["admin_role"] = "admin"
        r = c.get("/sellout")
        assert r.status_code == 200
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `venv\Scripts\python -m pytest tests/test_sales.py -v`
Expected: FAIL — route missing (404).

- [ ] **Step 3: Create `app/printing.py` re-export**

```python
from print_utils import (  # noqa: F401
    list_printers, list_usb_printers, send_raw, send_raw_usb,
    build_receipt_escpos, build_label_tspl, build_barcode_escpos,
)
```

(Keep the exact export names matching the original `print_utils.py`.)

- [ ] **Step 4: Implement sales and customers blueprints**

Move route bodies verbatim from webapp.py: sales at lines 1599–1684, 2599–2954, 3039–3054; customers at 1468–1598. Rewrite decorators `@app.route` → `@bp.route`, replace `get_db()` with `app.db.get_db()`, and `from config import TELEGRAM_BOT_TOKEN, DASHBOARD_URL` usages with `get_config()` reads. Wrap all printable/receipt templates with the same rendering logic as before.

- [ ] **Step 5: Run tests to verify they pass**

Run: `venv\Scripts\python -m pytest tests/test_sales.py -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add sokchhorn-inventory/app/blueprints/sales.py sokchhorn-inventory/app/blueprints/customers.py sokchhorn-inventory/app/printing.py sokchhorn-inventory/tests/test_sales.py
git commit -m "feat: add sales and customers blueprints"
```

---

### Task 10: Remove `/desktop-login` bypass and fix desktop entry

**Files:**
- Modify: `sokchhorn-inventory/app/blueprints/auth.py`
- Modify: `sokchhorn-inventory/desktop_app.py`
- Test: `sokchhorn-inventory/tests/test_auth.py` (add a case)

**Interfaces:**
- Consumes: existing blueprint.
- Produces: no `/desktop-login` route exists; desktop app loads the normal `/login` page and the owner logs in with credentials.

- [ ] **Step 1: Write the failing test**

Add to `tests/test_auth.py`:

```python
def test_desktop_login_route_removed(app_env):
    with app_env.test_client() as c:
        r = c.get("/desktop-login")
        assert r.status_code == 404
```

- [ ] **Step 2: Run test to verify it fails**

Run: `venv\Scripts\python -m pytest tests/test_auth.py -v`
Expected: currently PASS (route still exists) — after removal it FAILs, then flips to PASS. To verify the removal is real, first assert the route exists in the copied source, then remove it.

- [ ] **Step 3: Ensure no `/desktop-login` route is registered**

In `app/blueprints/auth.py`, confirm there is **no** route function for `/desktop-login`. (The old function lived at webapp.py 675–686; do not copy it.)

- [ ] **Step 4: Update `desktop_app.py` to open `/login`**

Change line 193 in the copied `desktop_app.py`:

```python
url = 'http://127.0.0.1:5000/login'
```

- [ ] **Step 5: Run all tests**

Run: `venv\Scripts\python -m pytest tests/ -v`
Expected: ALL PASS.

- [ ] **Step 6: Commit**

```bash
git add sokchhorn-inventory/app/blueprints/auth.py sokchhorn-inventory/desktop_app.py sokchhorn-inventory/tests/test_auth.py
git commit -m "fix: remove /desktop-login auth bypass"
```

---

### Task 11: Bot integration — owner gate + pending notification

**Files:**
- Modify: `sokchhorn-inventory/main.py` (use config re-exports — no change needed unless imports break)
- Modify: `sokchhorn-inventory/app/config.py` (owner_id already read)
- Test: `sokchhorn-inventory/tests/test_bot_config.py`

**Interfaces:**
- Consumes: `config.py` re-exports (unchanged API), `db.py` re-exports (unchanged API).
- Produces: `main.py` runs unchanged; the bot's `ADMIN_IDS` continues to gate owner reports.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_bot_config.py
from app.config import get_config


def test_owner_id_reads_from_env(monkeypatch):
    monkeypatch.setenv("OWNER_ID", "7185846273")
    assert get_config().owner_id == 7185846273
```

- [ ] **Step 2: Run test to verify it passes**

Run: `venv\Scripts\python -m pytest tests/test_bot_config.py -v`
Expected: PASS (config already reads OWNER_ID).

- [ ] **Step 3: Verify bot imports still work after refactor**

Run:

```powershell
& venv\Scripts\python -c "import main; print('main OK')"
& venv\Scripts\python -c "import db; print('db OK')"
```

Expected: `main OK` and `db OK`. `main.py` and `db.py` are now thin re-exports; the bot code imports unchanged.

- [ ] **Step 4: Commit (if any changes needed; otherwise note no-op)**

```bash
git add sokchhorn-inventory/app/config.py sokchhorn-inventory/tests/test_bot_config.py
git commit -m "feat: verify bot owner gate via config owner_id"
```

---

### Task 12: Google OAuth UI wiring + template updates

**Files:**
- Modify: `sokchhorn-inventory/templates/register.html`
- Modify: `sokchhorn-inventory/templates/login.html`
- Modify: `sokchhorn-inventory/templates/users.html` (or `staff.html`)

**Interfaces:**
- Consumes: `google_url` from auth blueprint; `approve` route; pending-list in users page.
- Produces: register page shows "Continue with Google" button and a read-only verified-email field after callback; users page shows pending requests with approve/reject.

- [ ] **Step 1: Add "Continue with Google" button to register.html**

Insert a link styled as a button at the top of the register form:

```html
<a href="{{ google_url }}" class="btn btn-outline-dark w-100 mb-3">
  Continue with Google
</a>
```

If `google_url` is undefined (plain GET before any owner logic), the template still renders because Jinja treats undefined as empty for the `href` attribute — but Task 6 always passes `google_url`.

- [ ] **Step 2: Show verified email on register page**

In `register.html`, after the Google button, when a verified email is present, render a read-only field. The blueprint pops `session['_google_email']` into `verified_email` and passes it:

```html
{% if verified_email %}
<input type="email" class="form-control" value="{{ verified_email }}" readonly>
{% endif %}
```

Add `verified_email=verified_email` to the `render_template("register.html", ...)` call in the auth blueprint.

- [ ] **Step 3: Add pending requests panel to users page**

In the users listing template, add a section showing pending users with approve/reject forms:

```html
<h5>Pending join requests</h5>
{% for u in pending_users %}
  <div class="d-flex justify-content-between align-items-center border rounded p-2 mb-1">
    <span>{{ u.username }}</span>
    <span>
      <form method="POST" action="{{ url_for('auth.approve_user', user_id=u.id) }}" class="d-inline">
        <button class="btn btn-sm btn-success">Approve</button>
      </form>
      <form method="POST" action="{{ url_for('settings.users_delete', user_id=u.id) }}" class="d-inline">
        <button class="btn btn-sm btn-danger">Reject</button>
      </form>
    </span>
  </div>
{% endfor %}
```

Update the `/users` route in `settings.py` to fetch `pending_users`:

```python
pending_users = fetchall("SELECT id, username, google_email, created_at FROM admin WHERE status='pending' ORDER BY id")
```

- [ ] **Step 4: Manual smoke check**

Run:

```powershell
& venv\Scripts\python -c "from app import create_app; a=create_app(); print(len(a.url_map._rules))"
```

Expected: prints a positive number of registered routes (all blueprints present).

- [ ] **Step 5: Commit**

```bash
git add sokchhorn-inventory/templates sokchhorn-inventory/app/blueprints/settings.py
git commit -m "feat: wire Google OAuth button and pending approval UI into templates"
```

---

### Task 13: Dockerfile + deployment docs

**Files:**
- Create: `sokchhorn-inventory/Dockerfile`
- Create: `sokchhorn-inventory/docker-compose.yml` (optional, for local)
- Modify: `sokchhorn-inventory/README.md` (short run instructions)

**Interfaces:**
- Consumes: `webapp.py` thin entry (runs `create_app()`), gunicorn.
- Produces: container image running the Flask app on gunicorn port 5000; `PORT` env respected.

- [ ] **Step 1: Write the Dockerfile**

```dockerfile
FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn
COPY . .
EXPOSE 5000
ENV PORT=5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "webapp:app", "--workers", "2"]
```

- [ ] **Step 2: Add docker-compose.yml**

```yaml
services:
  inventory:
    build: .
    ports:
      - "5000:5000"
    env_file: .env
    volumes:
      - ./inventory.db:/app/inventory.db
      - ./exports:/app/exports
```

- [ ] **Step 3: Write README.md**

Short sections: what it is, run locally (`venv` + `python webapp.py`), Google OAuth setup (Cloud Console → OAuth client → redirect URI), env vars, tests (`venv\Scripts\python -m pytest`), Docker run.

- [ ] **Step 4: Commit**

```bash
git add sokchhorn-inventory/Dockerfile sokchhorn-inventory/docker-compose.yml sokchhorn-inventory/README.md
git commit -m "docs: add Dockerfile and run documentation"
```

---

### Task 14: Full test suite pass + lint + final smoke

**Files:**
- Modify: none (verification only)

- [ ] **Step 1: Run the full suite**

Run from `sokchhorn-inventory/`:

```powershell
& venv\Scripts\python -m pytest -v
```

Expected: all tests pass (config, db, helpers, factory, auth, settings, inventory, sales, bot_config).

- [ ] **Step 2: Compile-check every module**

```powershell
& venv\Scripts\python -m compileall app webapp.py main.py db.py config.py print_utils.py
```

Expected: no syntax errors.

- [ ] **Step 3: Boot the app briefly**

```powershell
& venv\Scripts\python -c "from app import create_app; a=create_app(); print('booted', a.name)"
```

Expected: prints `booted sokchhorn-inventory` and applies migrations without error.

- [ ] **Step 4: Verify no secrets committed**

Run from repo root:

```powershell
git status --short sokchhorn-inventory
git check-ignore sokchhorn-inventory/.env  # only valid if .env exists
```

Expected: `.env`, `inventory.db` are ignored; no real tokens appear in `git diff`.

- [ ] **Step 5: Final commit (if anything changed)**

```bash
git add sokchhorn-inventory
git commit -m "chore: final verification and smoke checks"
```

---

## Self-Review Notes

- **Spec coverage:** config persistence (T2), migrations (T3), monolith split (T5–T9), desktop-login removal (T10), owner+staff roles (T4/T7), Google OAuth on register + join (T6), pending→approval workflow (T6/T7/T12), bot direct DB (T11), tests (T14), Docker (T13), secrets gitignored (T1/T14). All spec sections mapped.
- **Ownership:** first-registration-when-no-active-owner creates owner; `OWNER_ID` persisted to `.env`; spec's edge case (owner created even when pending requests exist) handled by `_has_active_owner()` checking `role='admin' AND status='active'`.
- **Type consistency:** `app.db.get_db()` returns a contextmanager usable in both `with get_db() as conn:` and `with get_db(db_path) as conn:` forms; `execute/fetchone/fetchall` signatures accept optional `db_path`. `app.helpers.ROLES`/`DESKTOP_FEATURES` names match template references (`ROLES`, `DESKTOP_FEATURES`).