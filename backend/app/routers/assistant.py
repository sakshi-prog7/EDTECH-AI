"""AI Sales Assistant — knowledge-base Q&A with conversation history.

The assistant parses the user's question into an intent, answers from live
DB aggregates (never hardcoded numbers) or the product knowledge base, and
always replies in plain language. Unknown questions get an honest response —
it never invents facts.

Supports conversation history: new, list, rename, delete, clear, export.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from ..core.deps import CurrentUser
from ..core.errors import AppError, ok
from ..services.assistant import assistant_reply
from ..services import db_helpers as db

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


class MessageIn(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    conversationId: str | None = None


class ConversationUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=200)


# ── Conversation CRUD ──────────────────────────────────────────────────────


@router.get("/conversations")
def list_conversations(user: CurrentUser):
    conversations = db.q(
        "SELECT id, title, created_at, updated_at FROM conversations "
        "WHERE user_id = :uid ORDER BY updated_at DESC",
        {"uid": user.id},
    )
    return ok({"conversations": conversations})


@router.post("/conversations", status_code=201)
def create_conversation(user: CurrentUser):
    conv_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "INSERT INTO conversations (id, user_id, title, created_at, updated_at) "
        "VALUES (:id, :uid, :title, :now, :now)",
        {"id": conv_id, "uid": user.id, "title": "New Conversation", "now": now},
    )
    return ok({"conversation": {"id": conv_id, "title": "New Conversation", "created_at": now, "updated_at": now}}, 201)


@router.get("/conversations/{conv_id}")
def get_conversation(conv_id: str, user: CurrentUser):
    conv = db.one(
        "SELECT id, title, created_at, updated_at FROM conversations "
        "WHERE id = :id AND user_id = :uid",
        {"id": conv_id, "uid": user.id},
    )
    if not conv:
        raise AppError("Conversation not found.", 404, "NOT_FOUND")
    messages = db.q(
        "SELECT id, role, content, matched_intent, created_at FROM conversation_messages "
        "WHERE conversation_id = :cid ORDER BY created_at ASC",
        {"cid": conv_id},
    )
    return ok({"conversation": conv, "messages": messages})


@router.patch("/conversations/{conv_id}")
def update_conversation(conv_id: str, body: ConversationUpdate, user: CurrentUser):
    changed = db.execute(
        "UPDATE conversations SET title = :title, updated_at = :now "
        "WHERE id = :id AND user_id = :uid",
        {"id": conv_id, "uid": user.id, "title": body.title.strip(), "now": datetime.now(timezone.utc).isoformat()},
    )
    if not changed:
        raise AppError("Conversation not found.", 404, "NOT_FOUND")
    return ok({"message": "Conversation renamed."})


@router.delete("/conversations/{conv_id}")
def delete_conversation(conv_id: str, user: CurrentUser):
    changed = db.execute(
        "DELETE FROM conversations WHERE id = :id AND user_id = :uid",
        {"id": conv_id, "uid": user.id},
    )
    if not changed:
        raise AppError("Conversation not found.", 404, "NOT_FOUND")
    return ok({"message": "Conversation deleted."})


@router.post("/conversations/{conv_id}/clear")
def clear_conversation(conv_id: str, user: CurrentUser):
    conv = db.one(
        "SELECT id FROM conversations WHERE id = :id AND user_id = :uid",
        {"id": conv_id, "uid": user.id},
    )
    if not conv:
        raise AppError("Conversation not found.", 404, "NOT_FOUND")
    db.execute(
        "DELETE FROM conversation_messages WHERE conversation_id = :cid",
        {"cid": conv_id},
    )
    db.execute(
        "UPDATE conversations SET updated_at = :now WHERE id = :id",
        {"now": datetime.now(timezone.utc).isoformat(), "id": conv_id},
    )
    return ok({"message": "Conversation cleared."})


@router.get("/conversations/{conv_id}/export")
def export_conversation(conv_id: str, user: CurrentUser):
    conv = db.one(
        "SELECT id, title, created_at FROM conversations WHERE id = :id AND user_id = :uid",
        {"id": conv_id, "uid": user.id},
    )
    if not conv:
        raise AppError("Conversation not found.", 404, "NOT_FOUND")
    messages = db.q(
        "SELECT role, content, created_at FROM conversation_messages "
        "WHERE conversation_id = :cid ORDER BY created_at ASC",
        {"cid": conv_id},
    )
    export = {
        "title": conv["title"],
        "created_at": conv["created_at"],
        "messages": [{"role": m["role"], "content": m["content"], "timestamp": m["created_at"]} for m in messages],
    }
    return ok(export)


# ── Message with conversation context ──────────────────────────────────────


@router.post("/message")
def message(body: MessageIn, user: CurrentUser):
    now = datetime.now(timezone.utc).isoformat()

    # Resolve or create conversation
    conv_id = body.conversationId
    if conv_id:
        conv = db.one(
            "SELECT id, title FROM conversations WHERE id = :id AND user_id = :uid",
            {"id": conv_id, "uid": user.id},
        )
        if not conv:
            raise AppError("Conversation not found.", 404, "NOT_FOUND")
    else:
        conv_id = str(uuid.uuid4())
        db.execute(
            "INSERT INTO conversations (id, user_id, title, created_at, updated_at) "
            "VALUES (:id, :uid, :title, :now, :now)",
            {"id": conv_id, "uid": user.id, "title": body.message[:80], "now": now},
        )
        conv = {"id": conv_id, "title": body.message[:80]}

    # Store user message
    db.execute(
        "INSERT INTO conversation_messages (id, conversation_id, role, content, matched_intent, created_at) "
        "VALUES (:id, :cid, 'user', :content, NULL, :now)",
        {"id": str(uuid.uuid4()), "cid": conv_id, "content": body.message.strip(), "now": now},
    )

    # Get reply
    result = assistant_reply(body.message.strip())

    # Store assistant reply
    db.execute(
        "INSERT INTO conversation_messages (id, conversation_id, role, content, matched_intent, created_at) "
        "VALUES (:id, :cid, 'assistant', :content, :intent, :now)",
        {
            "id": str(uuid.uuid4()),
            "cid": conv_id,
            "content": result["reply"],
            "intent": result.get("matchedIntent"),
            "now": now,
        },
    )

    # Update conversation timestamp
    db.execute(
        "UPDATE conversations SET updated_at = :now WHERE id = :id",
        {"now": now, "id": conv_id},
    )

    return ok({
        "reply": result["reply"],
        "matchedIntent": result.get("matchedIntent"),
        "conversationId": conv_id,
        "conversationTitle": conv["title"],
    })
