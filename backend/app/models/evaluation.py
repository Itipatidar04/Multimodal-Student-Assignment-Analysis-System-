from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class QuestionScoreDetail(BaseModel):
    question_id: str
    question_text: Optional[str] = None
    max_marks: float
    ai_score: float
    final_score: Optional[float] = None


class FacultyReviewRequest(BaseModel):
    faculty_score: float  # Faculty score out of 100
    faculty_notes: Optional[str] = None
    question_overrides: Optional[Dict[str, float]] = None  # map of question_id -> faculty question score
    finalize: bool = True


class QuestionScoreCreate(BaseModel):
    question_id: str
    ai_score: float
    final_score: float


class EvaluationResponse(BaseModel):
    id: str
    submission_id: str
    ai_score: Optional[float] = None        # Out of 100
    faculty_score: Optional[float] = None   # Out of 100
    final_score: Optional[float] = None     # Out of 200 (AI Score /100 + Faculty Score /100)
    criterion_scores: Dict[str, Any] = {}
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None
    feedback: Optional[str] = None
    recommended_topics: Optional[List[str]] = None
    similarity_score: Optional[float] = None
    similarity_flagged: bool = False
    faculty_notes: Optional[str] = None
    faculty_reviewed_at: Optional[datetime] = None
    status: str
    question_scores: List[QuestionScoreDetail] = []
    created_at: datetime
    updated_at: datetime

