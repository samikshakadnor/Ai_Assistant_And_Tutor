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


# Allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Routes
app.include_router(
    chatbot.router,
    prefix="/api/chatbot",
    tags=["Chatbot"]
)

app.include_router(
    quiz.router,
    prefix="/api/quiz",
    tags=["Quiz"]
)

app.include_router(
    results.router,
    prefix="/api/results",
    tags=["Results"]
)

app.include_router(
    users.router,
    prefix="/api/users",
    tags=["Users"]
)


@app.get("/")
def home():
    return {
        "message": "AI Quiz Generator API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "ok"
    }