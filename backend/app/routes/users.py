from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.database.collections import create_user, authenticate_user, get_user_by_token, google_authenticate

router = APIRouter()


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleAuthRequest(BaseModel):
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None


@router.post("/google")
def google_login(req: GoogleAuthRequest):
    if not req.email:
        raise HTTPException(status_code=400, detail="Google email is required.")
    
    user = google_authenticate(req.email, req.name, req.picture)
    return {
        "message": "Google authentication successful!",
        "token": user["token"],
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "picture": user.get("picture"),
            "provider": user.get("provider", "google")
        }
    }



@router.post("/signup")
def signup(req: SignupRequest):
    if not req.name or not req.email or not req.password:
        raise HTTPException(status_code=400, detail="All fields (name, email, password) are required.")
    
    user, err = create_user(req.name, req.email, req.password)
    if err:
        raise HTTPException(status_code=400, detail=err)
    
    return {
        "message": "User account created successfully!",
        "token": user["token"],
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"]
        }
    }


@router.post("/login")
def login(req: LoginRequest):
    user, err = authenticate_user(req.email, req.password)
    if err:
        raise HTTPException(status_code=401, detail=err)
    
    return {
        "message": "Login successful!",
        "token": user["token"],
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"]
        }
    }


@router.get("/me")
def get_me(authorization: Optional[str] = Header(None)):
    if not authorization:
        return {"authenticated": False}
    
    token = authorization.replace("Bearer ", "").strip()
    user = get_user_by_token(token)
    if not user:
        return {"authenticated": False}
    
    return {
        "authenticated": True,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"]
        }
    }