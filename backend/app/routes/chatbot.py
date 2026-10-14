from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List
import uuid

from app.services.chatbot_service import chat
from app.database.collections import (
    get_user_by_token, 
    save_chat_session, 
    get_chat_sessions, 
    get_chat_session_by_id, 
    delete_chat_session
)

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []
    session_id: Optional[str] = None
    title: Optional[str] = None


@router.post("/chat")
def chatbot(request: ChatRequest, authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(
            status_code=401, 
            detail="Authentication required. Please sign in with your Google or email account to chat."
        )
    
    token = authorization.replace("Bearer ", "").strip()
    user = get_user_by_token(token)
    if not user:
        raise HTTPException(
            status_code=401, 
            detail="Session expired or invalid. Please sign in with your Google or email account."
        )

    # Generate assistant answer
    result = chat(
        request.message,
        request.history
    )

    # Save to history for ANY question (even without a quiz)
    session_id = request.session_id or str(uuid.uuid4())
    
    # Title from first message or request title
    title = request.title
    if not title or title.strip() == "":
        clean_msg = request.message.strip()
        title = clean_msg[:42] + ("..." if len(clean_msg) > 42 else "")

    updated_messages = list(request.history) + [
        {"role": "user", "content": request.message},
        {"role": "assistant", "content": result["message"], "quiz": result.get("quiz")}
    ]

    saved_session = save_chat_session(
        session_id=session_id,
        user_email=user["email"],
        title=title,
        messages=updated_messages
    )

    return {
        "message": result["message"],
        "quiz": result.get("quiz"),
        "session_id": saved_session["id"],
        "title": saved_session["title"]
    }


@router.get("/history")
def get_user_chats(authorization: Optional[str] = Header(None)):
    if not authorization:
        return []
    
    token = authorization.replace("Bearer ", "").strip()
    user = get_user_by_token(token)
    if not user:
        return []
    
    return get_chat_sessions(user["email"])


@router.delete("/history/{session_id}")
def delete_user_chat(session_id: str, authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authentication required.")
    
    token = authorization.replace("Bearer ", "").strip()
    user = get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized.")
    
    delete_chat_session(session_id)
    return {"success": True, "message": "Chat deleted successfully."}