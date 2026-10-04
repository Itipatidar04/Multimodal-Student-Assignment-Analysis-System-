#POST /submissions — student submits (text/audio/video), validates everything, uploads file to Supabase Storage, saves record to DB
#GET /submissions — list submissions (students see only theirs)
#GET /submissions/{id} — get one submission
#GET /submissions/{id}/download-url — generate a temporary link to download the file

from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Form, status
from typing import Optional, List
from app.models.submission import SubmissionResponse
from app.services.storage_service import upload_file, get_signed_url
from app.services.extraction_service import extract_text
from app.database import get_db
from app.deps import get_current_user, require_role
from pydantic import BaseModel


class FacultyReviewRequest(BaseModel):
    faculty_score: float
    faculty_feedback: Optional[str] = None

router = APIRouter(prefix="/submissions", tags=["submissions"])

# Max file size: 100MB
MAX_FILE_SIZE = 100 * 1024 * 1024

# Allowed MIME types per submission type
ALLOWED_TYPES = {
    "pdf":   ["application/pdf"],
    "docx":  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"],
    "image": ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/tiff", "image/bmp"],
    "audio": ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/webm", "audio/x-wav", "audio/x-m4a", "audio/flac"],
    "video": ["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo", "video/mkv"],
    "text":  [],   # no file needed
}


@router.post("", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
async def create_submission(
    assignment_id: str = Form(...),
    submission_type: str = Form(...),          # "text" | "pdf" | "docx" | "image" | "audio" | "video"
    text_content: Optional[str] = Form(None),  # only for text submissions
    file: Optional[UploadFile] = File(None),   # for non-text formats
    current_user: dict = Depends(require_role("student")),
):
    db = get_db()

    # ── 1. Validate submission_type ──────────────────────────────────────
    if submission_type not in ("text", "pdf", "docx", "image", "audio", "video"):
        raise HTTPException(status_code=400, detail="submission_type must be text, pdf, docx, image, audio, or video")


    # ── 2. Check assignment exists ───────────────────────────────────────
    assignment = db.table("assignments").select("*").eq("id", assignment_id).execute()
    if not assignment.data:
        raise HTTPException(status_code=404, detail="Assignment not found")
    a = assignment.data[0]

    # ── 3. Check student is enrolled in the course ───────────────────────
    enrollment = (
        db.table("enrollments")
        .select("id")
        .eq("course_id", a["course_id"])
        .eq("student_id", current_user["id"])
        .execute()
    )
    if not enrollment.data:
        raise HTTPException(status_code=403, detail="You are not enrolled in this course")

    # ── 4. Check not already submitted ──────────────────────────────────
    existing = (
        db.table("submissions")
        .select("id")
        .eq("student_id", current_user["id"])
        .eq("assignment_id", assignment_id)
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=400, detail="You have already submitted this assignment")

    # ── 5. Check submission mode is allowed for this assignment ──────────
    if submission_type not in a["submission_modes"]:
        raise HTTPException(
            status_code=400,
            detail=f"This assignment does not allow {submission_type} submissions. "
                   f"Allowed: {a['submission_modes']}",
        )

    # ── 6. Handle file upload (audio / video) ────────────────────────────
    file_url = None
    file_name = None
    file_size = None
    extracted = None

    if submission_type == "text":
        if not text_content or not text_content.strip():
            raise HTTPException(status_code=400, detail="Text content cannot be empty")
        extracted = text_content

    else:
        if not file:
            raise HTTPException(status_code=400, detail=f"A file is required for {submission_type} submissions")

        # Read file bytes
        content = await file.read()
        file_size = len(content)

        # Validate file size
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 100MB")

        # Validate MIME type
        if file.content_type not in ALLOWED_TYPES[submission_type]:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type '{file.content_type}' for {submission_type} submission",
            )

        # Upload to Supabase Storage
        storage_path = f"{current_user['id']}/{assignment_id}/{file.filename}"
        file_url = await upload_file(content, storage_path, file.content_type)
        file_name = file.filename

        # Extract text (PDF/DOCX fully; audio/video = stub for Day 2)
        extracted = await extract_text(submission_type, content, None)

    # ── 7. Save submission to database ───────────────────────────────────
    submission_data = {
        "student_id":       current_user["id"],
        "assignment_id":    assignment_id,
        "submission_type":  submission_type,
        "text_content":     text_content,
        "file_url":         file_url,
        "file_name":        file_name,
        "file_size_bytes":  file_size,
        "extracted_text":   extracted,
        "status":           "submitted",
    }
    result = db.table("submissions").insert(submission_data).execute()
    submission = result.data[0]

    # ── 8. Create an empty evaluation record (placeholder for Day 2) ─────
    db.table("evaluations").insert({"submission_id": submission["id"]}).execute()

    return SubmissionResponse(**submission)


@router.get("", response_model=List[SubmissionResponse])
async def list_submissions(
    assignment_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    query = db.table("submissions").select("*")
    role = current_user["role"]

    # Students only see their own submissions
    if role == "student":
        query = query.eq("student_id", current_user["id"])
    elif role == "faculty":
        # Faculty only see submissions for assignments in courses they teach
        faculty_courses = db.table("courses").select("id").eq("faculty_id", current_user["id"]).execute()
        course_ids = [c["id"] for c in (faculty_courses.data or [])]
        if not course_ids:
            return []

        faculty_assignments = db.table("assignments").select("id").in_("course_id", course_ids).execute()
        assignment_ids = [a["id"] for a in (faculty_assignments.data or [])]
        if not assignment_ids:
            return []

        if assignment_id:
            if assignment_id not in assignment_ids:
                return []
            query = query.eq("assignment_id", assignment_id)
        else:
            query = query.in_("assignment_id", assignment_ids)
    elif assignment_id:
        query = query.eq("assignment_id", assignment_id)

    result = query.order("submitted_at", desc=True).execute()
    return [SubmissionResponse(**s) for s in result.data]



@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    result = db.table("submissions").select("*").eq("id", submission_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Submission not found")

    s = result.data[0]

    # Students can only view their own submissions
    if current_user["role"] == "student" and s["student_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    return SubmissionResponse(**s)


@router.get("/{submission_id}/download-url")
async def get_download_url(
    submission_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Generate a temporary signed URL to download the submitted file."""
    db = get_db()
    result = db.table("submissions").select("*").eq("id", submission_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Submission not found")

    s = result.data[0]

    if current_user["role"] == "student" and s["student_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    if not s["file_url"]:
        raise HTTPException(status_code=400, detail="This submission has no file")

    signed_url = await get_signed_url(s["file_url"])
    return {"url": signed_url, "file_name": s["file_name"]}


@router.put("/{submission_id}/review")
async def review_submission(
    submission_id: str,
    review: FacultyReviewRequest,
    current_user: dict = Depends(require_role("faculty")),
):
    db = get_db()

    submission = (
        db.table("submissions")
        .select("*, assignments!inner(course_id)")
        .eq("id", submission_id)
        .execute()
    )

    if not submission.data:
        raise HTTPException(status_code=404, detail="Submission not found")

    s = submission.data[0]

    course = (
        db.table("courses")
        .select("id")
        .eq("id", s["assignments"]["course_id"])
        .eq("faculty_id", current_user["id"])
        .execute()
    )

    if not course.data:
        raise HTTPException(status_code=403, detail="Access denied")

    if review.faculty_score < 0 or review.faculty_score > 100:
        raise HTTPException(status_code=400, detail="Score must be between 0 and 100")

    result = (
        db.table("submissions")
        .update({
            "faculty_score": review.faculty_score,
            "faculty_feedback": review.faculty_feedback,
            "reviewed_by": current_user["id"],
            "reviewed_at": datetime.utcnow(),
            "result_status": "REVIEWED",
        })
        .eq("id", submission_id)
        .execute()
    )

    return result.data[0]


@router.post("/{submission_id}/publish")
async def publish_result(
    submission_id: str,
    current_user: dict = Depends(require_role("faculty")),
):
    db = get_db()

    submission = (
        db.table("submissions")
        .select("*, assignments!inner(course_id)")
        .eq("id", submission_id)
        .execute()
    )

    if not submission.data:
        raise HTTPException(status_code=404, detail="Submission not found")

    s = submission.data[0]

    course = (
        db.table("courses")
        .select("id")
        .eq("id", s["assignments"]["course_id"])
        .eq("faculty_id", current_user["id"])
        .execute()
    )

    if not course.data:
        raise HTTPException(status_code=403, detail="Access denied")

    if s["faculty_score"] is None:
        raise HTTPException(
            status_code=400,
            detail="Faculty must review the submission before publishing"
        )

    result = (
        db.table("submissions")
        .update({
            "result_status": "PUBLISHED",
            "published_at": datetime.utcnow(),
        })
        .eq("id", submission_id)
        .execute()
    )

    return result.data[0]


@router.get("/{submission_id}/result")
async def get_result(
    submission_id: str,
    current_user: dict = Depends(require_role("student")),
):
    db = get_db()

    result = (
        db.table("submissions")
        .select("*")
        .eq("id", submission_id)
        .eq("student_id", current_user["id"])
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Submission not found")

    submission = result.data[0]

    if submission["result_status"] != "PUBLISHED":
        raise HTTPException(
            status_code=403,
            detail="Result has not been published yet"
        )

    return submission
