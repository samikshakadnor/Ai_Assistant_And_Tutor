import uuid
import time

QUIZZES = []
RESULTS = []
USERS = {}  # email -> user_dict
CHATS = []  # list of chat sessions: { id, user_email, title, messages, created_at, updated_at }


def save_quiz(quiz):
    QUIZZES.append(quiz)
    return quiz


def save_result(result):
    if "id" not in result:
        result["id"] = str(uuid.uuid4())
    RESULTS.insert(0, result)
    return result


def get_history(user_email=None):
    if not user_email:
        return RESULTS
    return [r for r in RESULTS if r.get("user_email") == user_email or not r.get("user_email")]


def save_chat_session(session_id, user_email, title, messages):
    if not session_id:
        session_id = str(uuid.uuid4())

    for chat in CHATS:
        if chat["id"] == session_id:
            chat["title"] = title or chat.get("title") or "Chat"
            chat["messages"] = messages
            chat["updated_at"] = time.time()
            return chat

    clean_title = title if title and len(title.strip()) > 0 else (
        messages[0]["content"][:40] + "..." if messages and len(messages) > 0 else "New Chat"
    )

    new_chat = {
        "id": session_id,
        "user_email": user_email,
        "title": clean_title,
        "messages": messages,
        "created_at": time.time(),
        "updated_at": time.time()
    }
    CHATS.insert(0, new_chat)
    return new_chat


def get_chat_sessions(user_email=None):
    if not user_email:
        return CHATS
    return [c for c in CHATS if c.get("user_email") == user_email or not c.get("user_email")]


def get_chat_session_by_id(session_id):
    for c in CHATS:
        if c.get("id") == session_id:
            return c
    return None


def delete_chat_session(session_id):
    global CHATS
    CHATS = [c for c in CHATS if c.get("id") != session_id]
    return True


def create_user(name, email, password):
    email_clean = email.strip().lower()
    if email_clean in USERS:
        return None, "User with this email already exists."
    
    user = {
        "id": str(uuid.uuid4()),
        "name": name.strip(),
        "email": email_clean,
        "password": password,  # In production, use bcrypt hashing
        "token": f"token-{uuid.uuid4()}"
    }
    USERS[email_clean] = user
    return user, None


def authenticate_user(email, password):
    email_clean = email.strip().lower()
    user = USERS.get(email_clean)
    if not user or user["password"] != password:
        return None, "Invalid email or password."
    return user, None


def get_user_by_token(token):
    for user in USERS.values():
        if user.get("token") == token:
            return user
    return None


def google_authenticate(email, name=None, picture=None):
    email_clean = email.strip().lower()
    if email_clean in USERS:
        user = USERS[email_clean]
        if not user.get("token"):
            user["token"] = f"token-{uuid.uuid4()}"
        if picture and not user.get("picture"):
            user["picture"] = picture
        return user
    
    display_name = name.strip() if name and name.strip() else email_clean.split("@")[0].capitalize()
    user = {
        "id": str(uuid.uuid4()),
        "name": display_name,
        "email": email_clean,
        "password": "",
        "picture": picture,
        "provider": "google",
        "token": f"token-{uuid.uuid4()}"
    }
    USERS[email_clean] = user
    return user
