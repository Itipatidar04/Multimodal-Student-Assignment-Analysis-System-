from pydantic import BaseModel, EmailStr
from typing import Literal, Optional
from datetime import datetime


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Literal["student", "faculty", "admin"] = "student"
    program_id: Optional[str] = None
    current_semester: Optional[int] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    program_id: Optional[str] = None
    current_semester: Optional[int] = None
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
