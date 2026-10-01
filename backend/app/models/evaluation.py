from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class FacultyReviewRequest(BaseModel):
    faculty_score: float
    faculty_notes: Optional[str] = None
    finalize: bool = False


class QuestionScoreCreate(BaseModel):
    question_id: str
    final_score: float


class EvaluationResponse(BaseModel):
    id: str
    submission_id: str
    ai_score: Optional[float] = None
    criterion_scores: Dict[str, Any] = {}
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None
    feedback: Optional[str] = None
    recommended_topics: Optional[List[str]] = None
    similarity_score: Optional[float] = None
    similarity_flagged: bool = False
    faculty_score: Optional[float] = None
    faculty_notes: Optional[str] = None
    faculty_reviewed_at: Optional[datetime] = None
    final_score: Optional[float] = None
    status: str
    created_at: datetime
    updated_at: datetime
