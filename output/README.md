# Champey Assistant

A single-file, read-only, bilingual (Khmer + English) advisory assistant for the
Champey marketplace, built with the OpenHands Software Agent SDK.

It auto-detects one of four skills per message (with manual override) and answers
by calling the live Champey backend API:

| Skill | Tool | Champey API |
|---|---|---|
| Product search | `search_products` | `GET /api/search`, `GET /api/categories` |
| Feed assistant | `browse_feed` | `GET /api/suggestions`, `GET /api/stories` |
| Job recommender | `search_jobs` | `GET /api/jobs` |
| Resume builder | `get_resume_templates` | `GET /api/resumes` |

## Run

```bash
# 1. Install (openhands-sdk + openhands-tools must be installed together)
pip install -U openhands-sdk openhands-tools fastapi uvicorn

# 2. Configure
export LLM_API_KEY="your-api-key"                       # required
export LLM_MODEL="openhands/claude-sonnet-4-5-20250929" # default
export CHAMPEY_API_BASE_URL="http://localhost:4000/api"  # Champey backend

# 3. Start (serve on :8001)
python champey_assistant.py
```

**Windows PowerShell** (no `export` — use `$env:`):

```powershell
$env:LLM_API_KEY = "your-api-key"
$env:CHAMPEY_API_BASE_URL = "http://localhost:4000/api"
python output\champey_assistant.py
```

Verified against **`openhands-sdk` / `openhands-tools` 1.44.1**.

The backend must be running (NestJS on `:4000`) for the tools to return live data.

## API

### `GET /health`
```bash
curl http://localhost:8001/health
```

### `POST /chat`
```bash
curl -X POST http://localhost:8001/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"find me a used laptop under $500","language":"en","session_id":"u1"}'
```

Request body:
| Field | Type | Notes |
|---|---|---|
| `message` | string | required |
| `language` | `"en"` \| `"km"` | reply language (default `en`) |
| `session_id` | string | multi-turn memory key (default `default`) |
| `skill` | string? | optional override: `product_search` \| `feed` \| `jobs` \| `resume` (default `auto`) |

Response:
```json
{ "reply": "...", "skill": "product_search", "elapsed_ms": 2300, "cost": 0.004 }
```

### `POST /reset`
```bash
curl -X POST http://localhost:8001/reset -H "Content-Type: application/json" -d '{"session_id":"u1"}'
```

## Environment variables

| Var | Purpose | Default |
|---|---|---|
| `LLM_API_KEY` | LLM API key (required) | — |
| `LLM_MODEL` / `LLM_BASE_MODEL` | model | `openhands/claude-sonnet-4-5-20250929` |
| `LLM_BASE_URL` | optional custom LLM endpoint | — |
| `CHAMPEY_API_BASE_URL` | Champey backend | `http://localhost:4000/api` |
| `ASSISTANT_PORT` | service port | `8001` |
| `ALLOWED_ORIGINS` | CORS origins (CSV) | `http://localhost:3000,http://localhost:3001` |

## Notes / limitations

- **Read-only**: the agent is only given four read-only tools; it cannot place
  orders, post, or modify anything.
- **Feed is public-only**: `GET /api/feed` requires a logged-in user (Clerk JWT),
  so the feed tool uses public `suggestions`/`stories`. Full personalized feed
  would need the user's session token passed through (future enhancement).
- **Endpoint params**: tool query params were matched to the current NestJS
  controllers (`search`, `jobs`, `products`). Re-verify if those change.
- **Import paths**: import names were taken from the SDK's
  `examples/01_standalone_sdk/02_custom_tools.py`; if a newer SDK reshuffles
  them, adjust the `openhands.sdk` / `openhands.sdk.tool` imports.
