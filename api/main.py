"""
NEXUSMIND API — Production-wired backend with authentication
=================================================================
"""

import os
import sys
import json
import time
import secrets
import bcrypt
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import unquote

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "agent"))
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "retrieval"))
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "guardrails"))

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

import rag_agent as agent_module
from rag_agent import build_agent, setup_retriever

try:
    from reranker import rerank
except Exception:  # pragma: no cover
    rerank = None

try:
    from pii_guard import mask_pii
except Exception:  # pragma: no cover
    def mask_pii(text: str) -> str:
        return text

app = FastAPI(title="NexusMind — Agentic RAG Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

response_cache: Dict[str, Dict[str, Any]] = {}
analytics_events: List[Dict[str, Any]] = []
query_history: List[Dict[str, Any]] = []
guardrail_events: List[Dict[str, Any]] = []

total_requests = 0
cache_hits = 0

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
DOCUMENT_INDEX_PATH = DATA_DIR / "documents_index.json"

# ============================================================
# AUTHENTICATION (email-based accounts, hashed passwords)
# ============================================================

USERS_INDEX_PATH = DATA_DIR / "users_index.json"
AVATAR_DIR = UPLOAD_DIR / "avatars"

active_sessions: Dict[str, Dict[str, Any]] = {}
failed_login_attempts: Dict[str, List[float]] = {}
MAX_LOGIN_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 300  # 5 minutes


def _load_users() -> List[Dict[str, Any]]:
    if not USERS_INDEX_PATH.exists():
        return []
    try:
        return json.loads(USERS_INDEX_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []


def _save_users(users: List[Dict[str, Any]]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    USERS_INDEX_PATH.write_text(json.dumps(users, indent=2), encoding="utf-8")


def _find_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    for u in _load_users():
        if u["email"].lower() == email.lower():
            return u
    return None


def _verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        return False


def _is_rate_limited(email: str) -> bool:
    now = time.time()
    attempts = failed_login_attempts.get(email.lower(), [])
    attempts = [t for t in attempts if now - t < LOGIN_WINDOW_SECONDS]
    failed_login_attempts[email.lower()] = attempts
    return len(attempts) >= MAX_LOGIN_ATTEMPTS


def _record_failed_attempt(email: str) -> None:
    failed_login_attempts.setdefault(email.lower(), []).append(time.time())


def _public_user(user_record: Dict[str, Any]) -> Dict[str, Any]:
    avatar_path = user_record.get("avatar_path")
    return {
        "id": str(user_record["id"]),
        "name": user_record["name"],
        "email": user_record["email"],
        "role": user_record.get("role", "Member"),
        "avatar_url": f"/auth/avatar/{user_record['id']}" if avatar_path else None,
    }


class SignupRequest(BaseModel):
    email: str
    password: str
    name: str


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user: Dict[str, Any]


def get_current_user(authorization: str = Header(default="")) -> Dict[str, Any]:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.replace("Bearer ", "").strip()
    session = active_sessions.get(token)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return session


@app.post("/auth/signup", response_model=AuthResponse)
def signup(request: SignupRequest):
    email = request.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Please provide a valid email address.")
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    if not request.name.strip():
        raise HTTPException(status_code=400, detail="Please provide your name.")

    users = _load_users()
    if any(u["email"].lower() == email for u in users):
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    password_hash = bcrypt.hashpw(request.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    new_id = max([u["id"] for u in users], default=0) + 1

    user_record = {
        "id": new_id,
        "email": email,
        "password_hash": password_hash,
        "name": request.name.strip(),
        "role": "Member",
        "avatar_path": None,
    }
    users.append(user_record)
    _save_users(users)

    token = secrets.token_hex(24)
    public = _public_user(user_record)
    active_sessions[token] = public
    return AuthResponse(token=token, user=public)


@app.post("/auth/login", response_model=AuthResponse)
def login(request: LoginRequest):
    email = request.email.strip().lower()

    if _is_rate_limited(email):
        raise HTTPException(
            status_code=429,
            detail="Too many failed login attempts. Please try again in a few minutes.",
        )

    user_record = _find_user_by_email(email)
    if not user_record or not _verify_password(request.password, user_record["password_hash"]):
        _record_failed_attempt(email)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    failed_login_attempts.pop(email, None)

    token = secrets.token_hex(24)
    public = _public_user(user_record)
    active_sessions[token] = public
    return AuthResponse(token=token, user=public)


@app.post("/auth/logout")
def logout(authorization: str = Header(default="")):
    token = authorization.replace("Bearer ", "").strip()
    active_sessions.pop(token, None)
    return {"status": "logged_out"}


@app.get("/auth/me")
def get_me(user: dict = Depends(get_current_user)):
    return user


@app.post("/auth/avatar")
async def upload_avatar(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    AVATAR_DIR.mkdir(parents=True, exist_ok=True)
    ext = os.path.splitext(file.filename or "")[1].lower() or ".png"
    if ext not in (".png", ".jpg", ".jpeg", ".webp"):
        raise HTTPException(status_code=400, detail="Only PNG, JPG, or WEBP images are supported.")

    destination = AVATAR_DIR / f"{user['id']}{ext}"
    with destination.open("wb") as handle:
        handle.write(await file.read())

    users = _load_users()
    for u in users:
        if str(u["id"]) == str(user["id"]):
            u["avatar_path"] = str(destination)
    _save_users(users)

    for token, session in active_sessions.items():
        if session["id"] == user["id"]:
            session["avatar_url"] = f"/auth/avatar/{user['id']}"

    return {"avatar_url": f"/auth/avatar/{user['id']}"}


@app.get("/auth/avatar/{user_id}")
def get_avatar(user_id: str):
    users = _load_users()
    for u in users:
        if str(u["id"]) == str(user_id) and u.get("avatar_path"):
            path = u["avatar_path"]
            if os.path.exists(path):
                return FileResponse(path)
    raise HTTPException(status_code=404, detail="Avatar not found")


# ============================================================
# DOCUMENT HELPERS
# ============================================================

def _human_readable_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    for unit in ["KB", "MB", "GB"]:
        size_bytes /= 1024.0
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
    return f"{size_bytes:.1f} TB"


def _load_document_index() -> List[Dict[str, Any]]:
    if not DOCUMENT_INDEX_PATH.exists():
        return []
    try:
        return json.loads(DOCUMENT_INDEX_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []


def _save_document_index(records: List[Dict[str, Any]]) -> None:
    DOCUMENT_INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    DOCUMENT_INDEX_PATH.write_text(json.dumps(records, indent=2), encoding="utf-8")


def _seed_documents() -> List[Dict[str, Any]]:
    records = _load_document_index()
    if records:
        return records

    sample_path = DATA_DIR / "sample_docs" / "HR Policy Manual.docx"
    if sample_path.exists():
        file_stat = sample_path.stat()
        records.append({
            "id": 1,
            "name": sample_path.name,
            "size": _human_readable_size(file_stat.st_size),
            "uploadedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
            "status": "Ready",
            "type": sample_path.suffix.lower().lstrip('.'),
            "path": str(sample_path),
        })
        _save_document_index(records)
    return records


def _get_documents() -> List[Dict[str, Any]]:
    return _seed_documents()


def _all_document_paths() -> List[str]:
    paths = []
    for doc in _get_documents():
        path = doc.get("path")
        if path:
            paths.append(path)
    return paths


def _rebuild_retriever_index() -> None:
    try:
        setup_retriever(_all_document_paths())
        agent_module.agent = build_agent()
        print("Retriever re-indexed successfully.")
    except Exception as exc:
        print(f"Retriever re-index failed: {exc}")
        agent_module.agent = None


@app.on_event("startup")
def startup_event():
    print("Starting up NexusMind API — preparing retrieval and analytics services...")
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    AVATAR_DIR.mkdir(parents=True, exist_ok=True)
    _seed_documents()
    _rebuild_retriever_index()
    print("Ready to accept requests.")


# ============================================================
# CHAT / ASK
# ============================================================

class QueryRequest(BaseModel):
    question: str


class QueryResponse(BaseModel):
    question: str
    answer: str
    from_cache: bool
    rewritten_query: str
    confidence_score: float
    decision_path: str
    source_section: str
    latency_ms: float


@app.post("/ask", response_model=QueryResponse)
async def ask_question(request: QueryRequest):
    global total_requests, cache_hits

    question = request.question.strip()
    cache_key = question.lower()
    total_requests += 1

    if cache_key in response_cache:
        cache_hits += 1
        cached = response_cache[cache_key]
        analytics_events.append({
            "question": question,
            "confidence_score": cached["confidence_score"],
            "decision_path": cached["decision_path"],
            "latency_ms": 0.0,
            "from_cache": True,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        query_history.insert(0, {
            "question": question,
            "rewritten_query": cached["rewritten_query"],
            "confidence_score": cached["confidence_score"],
            "decision_path": cached["decision_path"],
            "source_section": cached["source_section"],
            "from_cache": True,
        })
        return QueryResponse(question=question, from_cache=True, **cached)

    started_at = time.perf_counter()
    try:
        if agent_module.agent is None:
            result = {
                "final_answer": "The retrieval agent is currently unavailable. Please try again shortly.",
                "rewritten_query": question,
                "best_score": -999.0,
                "retrieved_chunks": [],
            }
        else:
            result = agent_module.agent.invoke({"original_query": question})
    except Exception as exc:  # pragma: no cover
        result = {
            "final_answer": f"The request could not be completed: {exc}",
            "rewritten_query": question,
            "best_score": -999.0,
            "retrieved_chunks": [],
        }

    best_chunk = result.get("retrieved_chunks", [None])[0] if result.get("retrieved_chunks") else None
    decision_path = "generate" if result.get("best_score", -999.0) >= -5.0 else "fallback"
    latency_ms = round((time.perf_counter() - started_at) * 1000, 1)

    payload = {
        "answer": result.get("final_answer", ""),
        "rewritten_query": result.get("rewritten_query", question),
        "confidence_score": round(float(result.get("best_score", -999.0)), 3),
        "decision_path": decision_path,
        "source_section": best_chunk.chunk.heading_path if best_chunk else "N/A",
        "latency_ms": latency_ms,
    }

    response_cache[cache_key] = payload

    analytics_events.append({
        "question": question,
        "confidence_score": payload["confidence_score"],
        "decision_path": payload["decision_path"],
        "latency_ms": latency_ms,
        "from_cache": False,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    query_history.insert(0, {
        "question": question,
        "rewritten_query": payload["rewritten_query"],
        "confidence_score": payload["confidence_score"],
        "decision_path": payload["decision_path"],
        "source_section": payload["source_section"],
        "from_cache": False,
    })

    try:
        masked_question = mask_pii(question)
        masked_answer = mask_pii(payload["answer"])
        guardrail_events.append({
            "question": masked_question,
            "answer": masked_answer,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
    except Exception:
        guardrail_events.append({
            "question": question,
            "answer": payload["answer"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    return QueryResponse(question=question, from_cache=False, **payload)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "NexusMind API", "documents": len(_get_documents())}


# ============================================================
# DOCUMENTS
# ============================================================

@app.get("/documents")
def list_documents():
    return _get_documents()


@app.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    filename = file.filename or "upload.bin"
    safe_name = os.path.basename(filename)
    destination = UPLOAD_DIR / safe_name
    with destination.open("wb") as handle:
        handle.write(await file.read())

    document_record = {
        "id": len(_get_documents()) + 1,
        "name": safe_name,
        "size": _human_readable_size(destination.stat().st_size),
        "uploadedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "status": "Ready",
        "type": os.path.splitext(safe_name)[1].lower().lstrip('.'),
        "path": str(destination),
    }
    documents = _get_documents()
    documents.append(document_record)
    _save_document_index(documents)
    _rebuild_retriever_index()
    return document_record


@app.get("/documents/{document_id}")
def get_document(document_id: int):
    docs = _get_documents()
    for doc in docs:
        if int(doc["id"]) == document_id:
            return doc
    raise HTTPException(status_code=404, detail="Document not found")


@app.delete("/documents/{document_id}")
def delete_document(document_id: int):
    docs = _get_documents()
    remaining = []
    deleted = None
    for doc in docs:
        if int(doc["id"]) == document_id:
            deleted = doc
            path = doc.get("path")
            if path and os.path.exists(path):
                os.remove(path)
        else:
            remaining.append(doc)
    if deleted is None:
        raise HTTPException(status_code=404, detail="Document not found")
    _save_document_index(remaining)
    _rebuild_retriever_index()
    return {"deleted": True, "document_id": document_id}


# ============================================================
# RETRIEVAL
# ============================================================

@app.get("/retrieval/history")
def retrieval_history():
    return query_history[:10]


@app.get("/retrieval/{query}")
def retrieval_results(query: str):
    decoded_query = unquote(query)

    if agent_module.retriever is None or rerank is None:
        raise HTTPException(status_code=503, detail="Retriever not ready yet")

    hybrid_results = agent_module.retriever.search(decoded_query, top_k=5)
    reranked = rerank(decoded_query, hybrid_results, top_k=5)

    return {
        "query": decoded_query,
        "results": [
            {
                "id": i + 1,
                "title": r.chunk.heading_path,
                "source": os.path.basename(r.chunk.source_file),
                "dense_score": round(r.dense_score, 3),
                "bm25_score": round(r.bm25_score, 3),
                "rerank_score": round(r.rerank_score, 3),
                "preview": r.chunk.text[:200],
                "confidence": "High" if r.rerank_score > 0 else ("Medium" if r.rerank_score > -5 else "Low"),
            }
            for i, r in enumerate(reranked)
        ],
    }


# ============================================================
# ANALYTICS
# ============================================================

@app.get("/analytics")
def analytics_summary():
    if not analytics_events:
        return {
            "total_queries": 0,
            "cache_hit_rate": 0.0,
            "average_confidence": 0.0,
            "average_latency_ms": 0.0,
            "decision_breakdown": {"generate": 0, "fallback": 0},
            "trend": [],
        }

    confidence_values = [e["confidence_score"] for e in analytics_events]
    fresh_latencies = [e["latency_ms"] for e in analytics_events if not e.get("from_cache")]
    decision_breakdown = {"generate": 0, "fallback": 0}
    for e in analytics_events:
        decision_breakdown[e["decision_path"]] += 1

    trend = [
        {"timestamp": e["timestamp"], "queries": 1, "confidence": e["confidence_score"], "latency": e["latency_ms"]}
        for e in analytics_events[-7:]
    ]

    return {
        "total_queries": total_requests,
        "cache_hit_rate": round((cache_hits / total_requests) * 100, 1) if total_requests else 0.0,
        "average_confidence": round(sum(confidence_values) / len(confidence_values), 3),
        "average_latency_ms": round(sum(fresh_latencies) / len(fresh_latencies), 1) if fresh_latencies else 0.0,
        "decision_breakdown": decision_breakdown,
        "trend": trend,
    }


@app.get("/analytics/cache")
def analytics_cache():
    return {
        "cache_size": len(response_cache),
        "total_requests": total_requests,
        "cache_hits": cache_hits,
        "entries": list(response_cache.keys())[:10],
    }


@app.get("/analytics/confidence")
def analytics_confidence():
    return {
        "average_confidence": round(sum(e["confidence_score"] for e in analytics_events) / len(analytics_events), 3) if analytics_events else 0.0,
        "samples": analytics_events[-5:],
    }


@app.get("/analytics/latency")
def analytics_latency():
    fresh = [e["latency_ms"] for e in analytics_events if not e.get("from_cache")]
    return {
        "average_latency_ms": round(sum(fresh) / len(fresh), 1) if fresh else 0.0,
        "samples": analytics_events[-5:],
    }


# ============================================================
# GUARDRAILS
# ============================================================

@app.get("/guardrails/logs")
def guardrails_logs():
    return guardrail_events[-10:]


@app.get("/guardrails/metrics")
def guardrails_metrics():
    return {
        "total_events": len(guardrail_events),
        "masked_events": len(guardrail_events),
        "latest_masked_text": guardrail_events[-1] if guardrail_events else None,
    }


# ============================================================
# STATIC / MISC
# ============================================================

@app.get("/app")
def serve_frontend():
    frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "index.html")
    return FileResponse(frontend_path)


@app.get("/")
def root_health():
    return {"status": "NexusMind API is running", "ui": "visit /app for the chat interface"}