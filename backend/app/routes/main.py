from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import chatbot
from app.routes import quiz
from app.routes import results
from app.routes import users

app = FastAPI(
    title="AI Quiz Generator API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(
    chatbot.router,
    prefix="/api/chatbot"
)

app.include_router(
    quiz.router,
    prefix="/api/quiz"
)

app.include_router(
    results.router,
    prefix="/api/results"
)

app.include_router(
    users.router,
    prefix="/api/users"
)

@app.get("/")
def home():

    return {
        "message":
        "AI Quiz Generator API is running"
    }

@app.get("/health")
def health():

    return {
        "status": "ok"
    }