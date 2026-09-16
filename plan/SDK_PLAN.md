# Champey Assistant — SDK Implementation Plan

> Built with the OpenHands Software Agent SDK. A single, read-only, bilingual
> advisory agent embedded in the Champey frontend as a chat widget.

## Status (2026-09-16)

Implemented locally:

- `output/champey_assistant.py` provides the FastAPI service, four read-only tools, language prompts, manual skill overrides, in-memory sessions, `/chat`, `/reset`, and `/health`.
- `apps/frontend/src/components/AssistantWidget.tsx` provides the bilingual chat widget and uses `NEXT_PUBLIC_ASSISTANT_URL` for the service URL.
- `output/requirements.txt` pins the runtime and test environment, including OpenHands SDK/tools `1.44.1`, compatible FastMCP/Uvicorn/Pydantic/FastAPI versions, and Pytest.
- `output/test_champey_assistant.py` contains seven dependency-mocked service contract tests covering skills, language/overrides, sessions/reset, failures, malformed backend responses, and the read-only endpoint boundary.
- `apps/frontend/src/components/AssistantWidget.test.tsx` covers live response rendering and explicit unavailable states.

Validation completed without credentials or live services:

- Manifest dependency resolution and imports passed with `uv`.
- Seven mocked service tests passed.
- Three frontend widget tests passed.
- Frontend TypeScript typecheck passed.

Live LLM/backend acceptance remains pending and requires configured credentials and a running Champey backend. No live product, feed, job, or resume recommendation was claimed or verified.

## 1. Overview

A conversational assistant for the Champey marketplace/community that
auto-detects one of four skills per message (with manual override) and answers
by calling the live Champey backend API (read-only). It never writes or acts on
behalf of the user — it only recommends and suggests.

## 2. Requirements

| # | Skill | What it does | Champey API |
|---|---|---|---|
| 1 | Product search | Recommend products + filters | `GET /api/search`, `GET /api/products`, `GET /api/categories` |
| 2 | Feed assistant | Recommend filters, suggest captions, help search | `GET /api/suggestions`, `GET /api/stories` (public; `GET /api/feed` is auth-protected) |
| 3 | Job recommender | Suggest relevant jobs | `GET /api/jobs` |
| 4 | Resume builder | Help write/improve resumes | `GET /api/resumes` (templates) |

Behavior: live backend API · read-only · web chat widget in Champey frontend ·
auto-detect skill + manual override · Khmer + English (user picks language first).

## 3. Architecture

```
┌─────────────────────────── Champey Next.js frontend ───────────────────────────┐
│  Chat widget (button → panel)                                                   │
│   1. user picks language (km | en)                                              │
│   2. types question + optional skill override                                   │
│   3. POST /chat  { message, language, session_id, skill? }                      │
│   4. renders the text reply + detected skill label                              │
└───────────────────────────────────────┬─────────────────────────────────────────┘
                                        │ HTTP (localhost:8001 or env URL)
┌───────────────────────────────────────▼─────────────────────────────────────────┐
│  output/champey_assistant.py  (single-file Python service, FastAPI)             │
│                                                                                 │
│   /chat  ──►  Session store (Conversation per session_id)                       │
│                └─► OpenHands Agent (LLM + 4 custom tools)                       │
│                      └─► skill router (auto-detect / override)                  │
│                            └─► tool executor ──► Champey NestJS API (:4000/api) │
│   logs everything to stdout (visible in terminal)                               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 4. Components

### 4.1 LLM
- `LLM(model=..., api_key=SecretStr(...), base_url=...)`
- Default model: `openhands/claude-sonnet-4-5-20250929`
- Model override: `LLM_MODEL` (SDK convention) or `LLM_BASE_MODEL` (builder convention)
- Key: `LLM_API_KEY`

### 4.2 Custom tools (read-only HTTP clients)
Each tool = Action (Pydantic) + text Observation + executor using the shared
`urllib` GET helper + `ToolDefinition`, registered via `register_tool` and wired
with `Tool(name=...)`.

| Tool | Action fields | Champey endpoint |
|---|---|---|
| `search_products` | `query`, `category?`, `min_price?`, `max_price?`, `sort?` | `GET /api/search?q=` then `GET /api/products?` + `GET /api/categories` |
| `browse_feed` | `query?`, `topic?` | `GET /api/suggestions`, `GET /api/stories` (public; full feed needs auth) |
| `search_jobs` | `query?`, `type?`, `location?` | `GET /api/jobs?` |
| `get_resume_templates` | `role?` | `GET /api/resumes` |

Caption generation (feed) and resume content writing are done by the LLM itself
after the tool returns context.

### 4.3 Agent & system prompt
`Agent(llm=llm, tools=[...])` with a system prompt that:
- Names the four skills and when each applies.
- Enforces **read-only** behavior (no order/cart/write endpoints).
- Auto-detects the skill; honors an explicit `skill` override from the request.
- Replies in the selected language (`km` or `en`).

### 4.4 HTTP API (FastAPI, same file)
- `POST /chat` → `{ reply, skill, error? }`
- `POST /reset` → clears a session (optional)
- Per-`session_id` in-memory `Conversation` map for multi-turn context.

### 4.5 Logging
`logging` to stdout: request id, detected skill, tool calls, latency, cost
(`llm.metrics.accumulated_cost`), and errors — all visible in the terminal.

## 5. Champey API integration

Base URL from `CHAMPEY_API_BASE_URL` (default `http://localhost:4000/api`).
All calls are GET, read-only, public endpoints. A thin `http_get(path, params)`
helper adds timeouts, error handling, and JSON normalization so the LLM always
receives clean text.

## 6. Frontend widget integration (follow-up)

A React `AssistantWidget` (client component) in `apps/frontend/src/components/`:
- Floating chat button (bottom-right), matching the coral theme.
- Language picker (`km`/`en`) shown before the input.
- Optional skill chip row (auto / search / feed / jobs / resume).
- Calls the Python service via `NEXT_PUBLIC_ASSISTANT_URL`, renders live replies,
  and shows an explicit unavailable message when the service cannot respond.

## 7. Environment variables

| Var | Purpose | Default |
|---|---|---|
| `LLM_API_KEY` | LLM API key (required) | — |
| `LLM_MODEL` / `LLM_BASE_MODEL` | model | `openhands/claude-sonnet-4-5-20250929` |
| `LLM_BASE_URL` | optional custom LLM endpoint | — |
| `CHAMPEY_API_BASE_URL` | Champey backend | `http://localhost:4000/api` |
| `ASSISTANT_PORT` | service port | `8001` |

## 8. Deliverables

- [x] `output/champey_assistant.py` — single-file agent service (SDK + tools + FastAPI).
- [x] `output/requirements.txt` — pinned runtime and test dependencies.
- [x] `output/test_champey_assistant.py` — mocked service contract tests.
- [x] `output/README.md` — reproducible setup and run instructions.
- [x] `apps/frontend/src/components/AssistantWidget.tsx` — frontend widget integration.
- [x] `apps/frontend/src/components/AssistantWidget.test.tsx` — widget response/error coverage.
- [x] `plan/SDK_PLAN.md` — implementation status and contract documentation.
- [x] `plan/agent-flow.html` — flow diagram matching the public API paths.

## 9. Acceptance criteria

The following are covered by mocked tests and local validation; they do not
constitute live LLM/backend acceptance:

1. [x] Product tool registration and read-only search/category calls.
2. [x] Feed tool registration and public suggestions/stories calls.
3. [x] Job tool registration and read-only jobs calls.
4. [x] Resume tool registration and read-only resume-template calls.
5. [x] Language prompts, manual skill overrides, session continuity/reset, and
   detected skill reporting.
6. [x] Error and malformed-backend-response handling without fabricated results.
7. [x] Tool/API boundary remains read-only and logs/cost response fields remain
   part of the service contract.
8. [ ] Live product, feed, job, and resume responses with configured LLM and
   running backend — requires credentials and live services.
