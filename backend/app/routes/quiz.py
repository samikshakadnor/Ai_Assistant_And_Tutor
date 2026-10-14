from fastapi import APIRouter
from pydantic import BaseModel

from app.services.quiz_generator import generate_quiz

router = APIRouter()


class QuizRequest(BaseModel):

    topic: str
    count: int = 10
    difficulty: str = "medium"
    question_type: str = "mcq"


@router.post("/generate")
def quiz_generate(request: QuizRequest):

    return generate_quiz(
        request.topic,
        request.count,
        request.difficulty,
        request.question_type
    )
