from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class QuestionCreate(BaseModel):
    text: str
    max_marks: int
    order_index: int = 0
    co_id: Optional[str] = None


class RubricCreate(BaseModel):
    criterion: str
    description: Optional[str] = None
    weight: float  # percentage 0–100


class AssignmentCreate(BaseModel):
    course_id: str
    title: str
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    total_marks: int = 100
    submission_modes: List[str] = ["text"]
    questions: List[QuestionCreate] = []
    rubrics: List[RubricCreate] = []


class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    total_marks: Optional[int] = None
    submission_modes: Optional[List[str]] = None


class QuestionResponse(BaseModel):
    id: str
    assignment_id: str
    text: str
    max_marks: int
    order_index: int
    co_id: Optional[str] = None
    created_at: datetime


class RubricResponse(BaseModel):
    id: str
    assignment_id: str
    criterion: str
    description: Optional[str] = None
    weight: float
    created_at: datetime


class AssignmentResponse(BaseModel):
    id: str
    course_id: str
    title: str
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    total_marks: int
    submission_modes: List[str]
    created_at: datetime
    questions: List[QuestionResponse] = []
    rubrics: List[RubricResponse] = []
