from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CourseCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    semester: Optional[str] = None
    academic_year: Optional[str] = None


class CourseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    semester: Optional[str] = None
    academic_year: Optional[str] = None


class CourseResponse(BaseModel):
    id: str
    name: str
    code: str
    description: Optional[str] = None
    faculty_id: Optional[str] = None
    semester: Optional[str] = None
    academic_year: Optional[str] = None
    created_at: datetime


class COCreate(BaseModel):
    code: str
    description: str


class COResponse(BaseModel):
    id: str
    code: str
    description: str
    course_id: str
    created_at: datetime


class POResponse(BaseModel):
    id: str
    code: str
    description: str


class COPOMapRequest(BaseModel):
    po_id: str
