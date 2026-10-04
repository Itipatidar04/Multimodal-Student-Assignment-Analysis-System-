from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SubmissionResponse(BaseModel):
    id: str
    student_id: str
    assignment_id: str
    submission_type: str
    text_content: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size_bytes: Optional[int] = None
    extracted_text: Optional[str] = None
    status: str
    submitted_at: datetime

    ai_score: Optional[float] = None
    faculty_score: Optional[float] = None
    faculty_feedback: Optional[str] = None
    result_status: str = "PENDING"
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
