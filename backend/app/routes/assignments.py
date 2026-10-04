#POST /assignments → Faculty creates an assignment (with questions + rubrics)
#GET /assignments → Lists assignments (students see only their enrolled courses, faculty see their own)
#GET /assignments/{id} → Gets one assignment with all its questions and rubrics

from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional
from app.models.assignment import (
    AssignmentCreate, AssignmentResponse,
    QuestionResponse, RubricResponse,
)
from app.database import get_db
from app.deps import get_current_user, require_role


def _assignment_response(assignment: dict, questions, rubrics, course: Optional[dict] = None) -> AssignmentResponse:
    return AssignmentResponse(
        **assignment,
        questions=[QuestionResponse(**q) for q in questions],
        rubrics=[RubricResponse(**r) for r in rubrics],
        course_name=(course or {}).get("name"),
        course_code=(course or {}).get("code"),
    )

router = APIRouter(prefix="/assignments", tags=["assignments"])


@router.post("", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    body: AssignmentCreate,
    current_user: dict = Depends(require_role("faculty", "admin")),
):
    db = get_db()

    # Check faculty owns the course
    course = db.table("courses").select("id, name, code, faculty_id").eq("id", body.course_id).execute()
    if not course.data:
        raise HTTPException(status_code=404, detail="Course not found")
    if current_user["role"] == "faculty" and course.data[0]["faculty_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized for this course")

    # Create the assignment
    assignment_data = {
        "course_id": body.course_id,
        "title": body.title,
        "description": body.description,
        "deadline": body.deadline.isoformat() if body.deadline else None,
        "total_marks": body.total_marks,
        "submission_modes": body.submission_modes,
    }
    result = db.table("assignments").insert(assignment_data).execute()
    assignment = result.data[0]
    assignment_id = assignment["id"]

    # Create questions if provided
    questions = []
    if body.questions:
        q_data = [
            {"assignment_id": assignment_id, **q.model_dump()}
            for q in body.questions
            if q.text.strip()
        ]
        if q_data:
            q_result = db.table("questions").insert(q_data).execute()
            questions = q_result.data

    # Create rubrics if provided
    rubrics = []
    if body.rubrics:
        r_data = [{"assignment_id": assignment_id, **r.model_dump()} for r in body.rubrics]
        r_result = db.table("rubrics").insert(r_data).execute()
        rubrics = r_result.data

    return _assignment_response(assignment, questions, rubrics, course.data[0])


@router.get("", response_model=List[AssignmentResponse])
async def list_assignments(
    course_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    query = db.table("assignments").select("*")
    role = current_user["role"]

    if role == "student":
        enrollments = (
            db.table("enrollments")
            .select("course_id")
            .eq("student_id", current_user["id"])
            .execute()
        )
        enrolled_ids = [e["course_id"] for e in enrollments.data]
        if not enrolled_ids:
            return []
        if course_id:
            if course_id not in enrolled_ids:
                return []
            query = query.eq("course_id", course_id)
        else:
            query = query.in_("course_id", enrolled_ids)
    elif course_id:
        query = query.eq("course_id", course_id)
    elif role == "faculty":
        courses = db.table("courses").select("id").eq("faculty_id", current_user["id"]).execute()
        course_ids = [c["id"] for c in courses.data]
        if not course_ids:
            return []
        query = query.in_("course_id", course_ids)

    result = query.order("created_at", desc=True).execute()
    if not result.data:
        return []

    course_ids = list({a["course_id"] for a in result.data})
    courses_res = db.table("courses").select("id, name, code").in_("id", course_ids).execute()
    course_map = {c["id"]: c for c in courses_res.data}

    assignments = []
    for a in result.data:
        q_res = db.table("questions").select("*").eq("assignment_id", a["id"]).order("order_index").execute()
        r_res = db.table("rubrics").select("*").eq("assignment_id", a["id"]).execute()
        assignments.append(_assignment_response(a, q_res.data, r_res.data, course_map.get(a["course_id"])))
    return assignments


@router.get("/{assignment_id}", response_model=AssignmentResponse)
async def get_assignment(
    assignment_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    result = db.table("assignments").select("*").eq("id", assignment_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Assignment not found")

    a = result.data[0]
    if current_user["role"] == "student":
        enrolled = (
            db.table("enrollments")
            .select("id")
            .eq("course_id", a["course_id"])
            .eq("student_id", current_user["id"])
            .execute()
        )
        if not enrolled.data:
            raise HTTPException(status_code=403, detail="You are not enrolled in this course")

    course = db.table("courses").select("id, name, code").eq("id", a["course_id"]).execute()
    q_res = db.table("questions").select("*").eq("assignment_id", assignment_id).order("order_index").execute()
    r_res = db.table("rubrics").select("*").eq("assignment_id", assignment_id).execute()
    return _assignment_response(a, q_res.data, r_res.data, course.data[0] if course.data else None)
