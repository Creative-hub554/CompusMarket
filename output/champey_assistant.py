"""
Champey Assistant — a single-file OpenHands SDK agent service.

A read-only, bilingual (Khmer + English) advisory assistant for the Champey
marketplace/community. It auto-detects one of four skills per message (product
search, feed assistant, job recommender, resume builder) and answers by calling
the live Champey backend API (read-only). It never writes or acts on the user's
behalf.

Run:
    pip install -U openhands-sdk openhands-tools fastapi uvicorn
    export LLM_API_KEY="..."            # required
    export CHAMPEY_API_BASE_URL="http://localhost:4000/api"
    python champey_assistant.py         # serves on http://localhost:8001

Environment:
    LLM_API_KEY          (required)  LLM API key
    LLM_MODEL / LLM_BASE_MODEL      model (default openhands/claude-sonnet-4-5-20250929)
    LLM_BASE_URL         (optional)  custom LLM endpoint
    CHAMPEY_API_BASE_URL             Champey backend (default http://localhost:4000/api)
    ASSISTANT_PORT                    service port (default 8001)
"""

import json
import logging
import os
import sys
import threading
import time
import urllib.parse
import urllib.request
from typing import Optional

from pydantic import BaseModel, Field, SecretStr

from openhands.sdk import (
    LLM,
    Action,
    Agent,
    Conversation,
    LLMConvertibleEvent,
    Observation,
    ToolDefinition,
)
from openhands.sdk.tool import Tool, ToolExecutor, register_tool

# --------------------------------------------------------------------------- #
# Logging (visible in the terminal)
# --------------------------------------------------------------------------- #
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(name)s | %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("champey_assistant")

# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #
API_BASE = os.getenv("CHAMPEY_API_BASE_URL", "http://localhost:4000/api").rstrip("/")
MODEL = (
    os.getenv("LLM_BASE_MODEL")
    or os.getenv("LLM_MODEL")
    or "openhands/claude-sonnet-4-5-20250929"
)
BASE_URL = os.getenv("LLM_BASE_URL")
PORT = int(os.getenv("ASSISTANT_PORT", "8001"))

SYSTEM_PROMPT = """You are Champey Assistant, a read-only advisory assistant for Champey, a Cambodian marketplace and community platform. You help shoppers and community members with FOUR skills:

1. PRODUCT SEARCH — help find products using the search_products tool. Recommend products, categories, and filters.
2. FEED ASSISTANT — help with the social feed: recommend filters, suggest post captions, and help search using the browse_feed tool.
3. JOB RECOMMENDER — recommend relevant jobs using the search_jobs tool.
4. RESUME BUILDER — help write and improve resumes/CVs using the get_resume_templates tool.

Rules:
- You are STRICTLY READ-ONLY. Never claim to place orders, edit profiles, post, or change anything. Only suggest and recommend.
- Auto-detect which skill applies to the user's question and use the matching tool to fetch real data before answering.
- Always reply in the language the user selected (Khmer or English).
- Be concise, friendly, and helpful. Cite real data you found (product names, prices, job titles, etc.).
- If a tool call fails or returns no data, say so honestly and still offer general guidance.
"""

# --------------------------------------------------------------------------- #
# Champey API HTTP helper (read-only GET)
# --------------------------------------------------------------------------- #
def http_get(path: str, params: Optional[dict] = None, timeout: float = 15.0) -> dict:
    url = f"{API_BASE}{path}"
    if params:
        clean = {k: v for k, v in params.items() if v is not None and v != ""}
        if clean:
            url += "?" + urllib.parse.urlencode(clean)
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _fmt(label: str, data, limit: int = 4000) -> str:
    try:
        s = json.dumps(data, ensure_ascii=False, indent=2)
    except Exception:
        s = str(data)
    if len(s) > limit:
        s = s[:limit] + "\n...(truncated)"
    return f"{label}:\n{s}"


# --------------------------------------------------------------------------- #
# Shared Observation
# --------------------------------------------------------------------------- #
class TextObservation(Observation):
    """A plain-text observation (content only)."""


# --------------------------------------------------------------------------- #
# Tool 1: product search
# --------------------------------------------------------------------------- #
class SearchProductsAction(Action):
    query: str = Field(description="What the user is looking for (product name, brand, or keywords)")
    category_id: Optional[str] = Field(default=None, description="Optional category ID to filter by")
    min_price: Optional[str] = Field(default=None, description="Optional minimum price")
    max_price: Optional[str] = Field(default=None, description="Optional maximum price")
    condition: Optional[str] = Field(default=None, description="Optional item condition (e.g. new, used)")
    sort: Optional[str] = Field(default=None, description="Optional sort order: newest, oldest, price_asc, price_desc")
    in_stock: Optional[bool] = Field(default=None, description="Optional: set True to show only in-stock items")


class SearchProductsExecutor(ToolExecutor[SearchProductsAction, TextObservation]):
    def __call__(self, action: SearchProductsAction, conversation=None) -> TextObservation:
        parts = []
        try:
            parts.append(_fmt("Search results", http_get("/search", {
                "q": action.query,
                "categoryId": action.category_id,
                "minPrice": action.min_price,
                "maxPrice": action.max_price,
                "condition": action.condition,
                "sort": action.sort,
                "inStock": "true" if action.in_stock else None,
            })))
        except Exception as e:
            parts.append(f"Search request failed: {e}")
        try:
            parts.append(_fmt("Available categories (for filter suggestions)", http_get("/categories")))
        except Exception as e:
            parts.append(f"Categories request failed: {e}")
        return TextObservation.from_text("\n\n".join(parts))


_SEARCH_PRODUCTS_DESC = """Search the Champey marketplace for products matching a query.
Returns matching products plus the list of available categories so you can suggest filters.
Supports filtering by category, price range, condition, and in-stock status, plus sorting
by newest, oldest, price ascending, or price descending.
Use this tool whenever the user wants to find or browse products."""

# --------------------------------------------------------------------------- #
# Tool 2: feed assistant
# --------------------------------------------------------------------------- #
class BrowseFeedAction(Action):
    topic: Optional[str] = Field(default=None, description="Optional topic or keyword the user cares about")


class BrowseFeedExecutor(ToolExecutor[BrowseFeedAction, TextObservation]):
    def __call__(self, action: BrowseFeedAction, conversation=None) -> TextObservation:
        parts = []
        try:
            parts.append(_fmt("Suggested accounts", http_get("/suggestions")))
        except Exception as e:
            parts.append(f"Suggestions request failed: {e}")
        try:
            parts.append(_fmt("Stories", http_get("/stories")))
        except Exception as e:
            parts.append(f"Stories request failed: {e}")
        return TextObservation.from_text("\n\n".join(parts))


_BROWSE_FEED_DESC = """Browse public Champey feed content (suggested accounts and stories).
Use this tool to ground feed recommendations, filter suggestions, caption ideas, and feed search.
Note: full personalized feed content requires a logged-in user; this tool returns public data only."""

# --------------------------------------------------------------------------- #
# Tool 3: job recommender
# --------------------------------------------------------------------------- #
class SearchJobsAction(Action):
    query: Optional[str] = Field(default=None, description="Optional job title or keyword")
    location: Optional[str] = Field(default=None, description="Optional location")
    type: Optional[str] = Field(default=None, description="Optional job type (e.g. full-time, part-time, freelance)")


class SearchJobsExecutor(ToolExecutor[SearchJobsAction, TextObservation]):
    def __call__(self, action: SearchJobsAction, conversation=None) -> TextObservation:
        try:
            return TextObservation.from_text(_fmt("Jobs", http_get("/jobs", {
                "q": action.query,
                "location": action.location,
                "type": action.type,
            })))
        except Exception as e:
            return TextObservation.from_text(f"Jobs request failed: {e}")


_SEARCH_JOBS_DESC = """Search Champey jobs by title, location, and type.
Use this tool whenever the user wants job recommendations or career opportunities."""

# --------------------------------------------------------------------------- #
# Tool 4: resume builder
# --------------------------------------------------------------------------- #
class GetResumeTemplatesAction(Action):
    role: Optional[str] = Field(default=None, description="Optional target role/job title to tailor advice to")


class GetResumeTemplatesExecutor(ToolExecutor[GetResumeTemplatesAction, TextObservation]):
    def __call__(self, action: GetResumeTemplatesAction, conversation=None) -> TextObservation:
        try:
            return TextObservation.from_text(_fmt("Resume templates", http_get("/resumes")))
        except Exception as e:
            return TextObservation.from_text(f"Resumes request failed: {e}")


_GET_RESUME_TEMPLATES_DESC = """Fetch Champey resume templates.
Use this tool when helping the user write or improve a resume/CV. You then tailor
the advice yourself to the requested role."""

# --------------------------------------------------------------------------- #
# Register the tools (v1.44.x API: ToolDefinition subclasses with .create())
# --------------------------------------------------------------------------- #
class SearchProductsTool(ToolDefinition[SearchProductsAction, TextObservation]):
    @classmethod
    def create(cls, conv_state=None, **params) -> list[ToolDefinition]:
        return [cls(
            description=_SEARCH_PRODUCTS_DESC,
            action_type=SearchProductsAction,
            observation_type=TextObservation,
            executor=SearchProductsExecutor(),
        )]


class BrowseFeedTool(ToolDefinition[BrowseFeedAction, TextObservation]):
    @classmethod
    def create(cls, conv_state=None, **params) -> list[ToolDefinition]:
        return [cls(
            description=_BROWSE_FEED_DESC,
            action_type=BrowseFeedAction,
            observation_type=TextObservation,
            executor=BrowseFeedExecutor(),
        )]


class SearchJobsTool(ToolDefinition[SearchJobsAction, TextObservation]):
    @classmethod
    def create(cls, conv_state=None, **params) -> list[ToolDefinition]:
        return [cls(
            description=_SEARCH_JOBS_DESC,
            action_type=SearchJobsAction,
            observation_type=TextObservation,
            executor=SearchJobsExecutor(),
        )]


class GetResumeTemplatesTool(ToolDefinition[GetResumeTemplatesAction, TextObservation]):
    @classmethod
    def create(cls, conv_state=None, **params) -> list[ToolDefinition]:
        return [cls(
            description=_GET_RESUME_TEMPLATES_DESC,
            action_type=GetResumeTemplatesAction,
            observation_type=TextObservation,
            executor=GetResumeTemplatesExecutor(),
        )]


register_tool("search_products", SearchProductsTool)
register_tool("browse_feed", BrowseFeedTool)
register_tool("search_jobs", SearchJobsTool)
register_tool("get_resume_templates", GetResumeTemplatesTool)

# --------------------------------------------------------------------------- #
# Agent (built once at startup)
# --------------------------------------------------------------------------- #
AGENT: Optional[Agent] = None
LLM_INSTANCE: Optional[LLM] = None


def build_agent() -> None:
    global AGENT, LLM_INSTANCE
    api_key = os.getenv("LLM_API_KEY")
    if not api_key:
        logger.error("LLM_API_KEY is not set — the assistant cannot answer questions.")
        return
    LLM_INSTANCE = LLM(
        model=MODEL,
        api_key=SecretStr(api_key),
        base_url=BASE_URL or None,
        usage_id="champey-assistant",
    )
    AGENT = Agent(
        llm=LLM_INSTANCE,
        tools=[
            Tool(name="search_products"),
            Tool(name="browse_feed"),
            Tool(name="search_jobs"),
            Tool(name="get_resume_templates"),
        ],
        system_prompt=SYSTEM_PROMPT,
    )
    logger.info("Agent ready (model=%s)", MODEL)


# --------------------------------------------------------------------------- #
# Session store (multi-turn context)
# --------------------------------------------------------------------------- #
_SESSIONS: dict[str, dict] = {}
_SESSIONS_LOCK = threading.Lock()


def _make_session() -> dict:
    collected: list = []

    def callback(event):
        if isinstance(event, LLMConvertibleEvent):
            collected.append(event.to_llm_message())

    conversation = Conversation(agent=AGENT, callbacks=[callback], workspace=os.getcwd())
    return {"conversation": conversation, "messages": collected}


def _get_session(session_id: str) -> dict:
    with _SESSIONS_LOCK:
        session = _SESSIONS.get(session_id)
        if session is None:
            session = _make_session()
            _SESSIONS[session_id] = session
        return session


def _build_user_message(message: str, language: str, skill: Optional[str]) -> str:
    parts = []
    parts.append("Reply in Khmer (ភាសាខ្មែរ)." if language == "km" else "Reply in English.")
    if skill and skill != "auto":
        parts.append(f"For this request, use the '{skill}' skill.")
    parts.append(message)
    return "\n".join(parts)


def _msg_text(msg) -> str:
    content = getattr(msg, "content", None)
    if content is None and isinstance(msg, dict):
        content = msg.get("content")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        out = []
        for block in content:
            t = getattr(block, "text", None)
            if t is None and isinstance(block, dict):
                t = block.get("text") or block.get("content")
            if isinstance(t, str):
                out.append(t)
        return "\n".join(out)
    return ""


def _extract_reply(session: dict) -> str:
    for msg in reversed(session["messages"]):
        role = getattr(msg, "role", None)
        if role is None and isinstance(msg, dict):
            role = msg.get("role")
        if role == "assistant":
            text = _msg_text(msg).strip()
            if text:
                return text
    return ""


_ACTION_TO_SKILL = {
    "SearchProductsAction": "product_search",
    "BrowseFeedAction": "feed",
    "SearchJobsAction": "jobs",
    "GetResumeTemplatesAction": "resume",
}


def _detect_skill(session: dict) -> str:
    events = getattr(getattr(session["conversation"], "state", None), "events", []) or []
    blob = " ".join(str(ev) for ev in events)
    for cls, skill in _ACTION_TO_SKILL.items():
        if cls in blob:
            return skill
    return "auto"


# --------------------------------------------------------------------------- #
# HTTP API
# --------------------------------------------------------------------------- #
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Champey Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    language: str = "en"  # "en" | "km"
    session_id: str = "default"
    skill: Optional[str] = None  # "auto" | "product_search" | "feed" | "jobs" | "resume"


@app.get("/health")
def health():
    return {"ok": True, "model": MODEL, "agent_ready": AGENT is not None}


@app.post("/chat")
def chat(req: ChatRequest):
    if AGENT is None:
        return {"reply": "The assistant is not configured. Set LLM_API_KEY and restart.", "skill": None, "error": "not_configured"}

    t0 = time.time()
    session = _get_session(req.session_id)
    user_msg = _build_user_message(req.message, req.language, req.skill)
    logger.info("[%s] lang=%s skill_override=%s q=%r", req.session_id, req.language, req.skill, req.message[:120])

    try:
        session["conversation"].send_message(user_msg)
        session["conversation"].run()
    except Exception as e:
        logger.exception("conversation run failed")
        return {"reply": f"Sorry, something went wrong: {e}", "skill": None, "error": "run_failed"}

    reply = _extract_reply(session) or "I couldn't produce an answer for that."
    skill = req.skill if req.skill and req.skill != "auto" else _detect_skill(session)
    elapsed = time.time() - t0
    cost = getattr(getattr(LLM_INSTANCE, "metrics", None), "accumulated_cost", 0.0)

    logger.info("[%s] skill=%s elapsed=%.2fs cost=%.4f reply=%r",
                req.session_id, skill, elapsed, cost, reply[:160])

    return {"reply": reply, "skill": skill, "elapsed_ms": int(elapsed * 1000), "cost": cost}


@app.post("/reset")
def reset(req: ChatRequest):
    with _SESSIONS_LOCK:
        _SESSIONS.pop(req.session_id, None)
    logger.info("[%s] session reset", req.session_id)
    return {"ok": True}


if __name__ == "__main__":
    import uvicorn

    build_agent()
    logger.info("Starting Champey Assistant on http://localhost:%d (Champey API: %s)", PORT, API_BASE)
    uvicorn.run(app, host="0.0.0.0", port=PORT)
