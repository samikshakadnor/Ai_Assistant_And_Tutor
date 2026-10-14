from fastapi import APIRouter, Header
from pydantic import BaseModel
from typing import Optional

from app.services.evaluation_service import evaluate
from app.database.collections import get_history, get_user_by_token

router = APIRouter()


class EvaluationRequest(BaseModel):
    quiz_id: str
    quiz: dict
    answers: dict
    user_email: Optional[str] = None
    time_taken: Optional[int] = None  # in seconds


@router.post("/evaluate")
def evaluate_quiz(request: EvaluationRequest):
    return evaluate(
        request.quiz,
        request.answers,
        user_email=request.user_email,
        time_taken=request.time_taken
    )


@router.get("/history")
def history(authorization: Optional[str] = Header(None)):
    user_email = None
    if authorization:
        token = authorization.replace("Bearer ", "").strip()
        user = get_user_by_token(token)
        if user:
            user_email = user["email"]

    return get_history(user_email=user_email)