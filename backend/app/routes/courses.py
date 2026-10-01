#Course Management Endpoints
'''
#Courses (CRUD):

POST /courses — faculty creates a course
GET /courses — lists courses based on role (faculty sees their own, student sees enrolled ones, admin sees all)
GET /courses/{id} — get one course
PUT /courses/{id} — update a course (faculty only, and only their own)

#Enrollments:

POST /courses/{id}/enroll — a student enrolls themselves
GET /courses/{id}/students — faculty sees who's enrolled

#Course Outcomes:

POST /courses/{id}/cos — faculty creates a CO (e.g. CO1 = "Understand arrays")
GET /courses/{id}/cos — list all COs for a course
POST /courses/{id}/cos/{co_id}/map-po — link a CO to a PO

#Program Outcomes:

GET /courses/pos/all — get all 12 POs (pre-seeded in DB)

'''


from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from app.models.course import (
    CourseCreate, CourseResponse, CourseUpdate,
    COCreate, COResponse, POResponse, COPOMapRequest,
)
from app.database import get_db
from app.deps import get_current_user, require_role

router = APIRouter(prefix="/courses", tags=["courses"])


# ──────────────────────────────────────────────
# COURSES
# ──────────────────────────────────────────────

@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
async def create_course(
    body: CourseCreate,
    current_user: dict = Depends(require_role("faculty", "admin")),
):
    db = get_db()
    dup = db.table("courses").select("id").eq("code", body.code).execute()
    if dup.data:
        raise HTTPException(status_code=400, detail="Course code already exists")

    result = db.table("courses").insert(
        {**body.model_dump(), "faculty_id": current_user["id"]}
    ).execute()
    return CourseResponse(**result.data[0])


@router.get("", response_model=List[CourseResponse])
async def list_courses(current_user: dict = Depends(get_current_user)):
    db = get_db()
    role = current_user["role"]

    if role == "faculty":
        res = db.table("courses").select("*").eq("faculty_id", current_user["id"]).execute()
    elif role == "student":
        enrollments = (
            db.table("enrollments").select("course_id").eq("student_id", current_user["id"]).execute()
        )
        ids = [e["course_id"] for e in enrollments.data]
        if not ids:
            return []
        res = db.table("courses").select("*").in_("id", ids).execute()
    else:  # admin
        res = db.table("courses").select("*").execute()

    return [CourseResponse(**c) for c in res.data]


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(course_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    res = db.table("courses").select("*").eq("id", course_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Course not found")
    return CourseResponse(**res.data[0])


@router.put("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: str,
    body: CourseUpdate,
    current_user: dict = Depends(require_role("faculty", "admin")),
):
    db = get_db()
    course = db.table("courses").select("faculty_id").eq("id", course_id).execute()
    if not course.data:
        raise HTTPException(status_code=404, detail="Course not found")
    if current_user["role"] == "faculty" and course.data[0]["faculty_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized for this course")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    res = db.table("courses").update(updates).eq("id", course_id).execute()
    return CourseResponse(**res.data[0])


# ──────────────────────────────────────────────
# ENROLLMENTS
# ──────────────────────────────────────────────

@router.post("/{course_id}/enroll", status_code=status.HTTP_201_CREATED)
async def enroll(course_id: str, current_user: dict = Depends(require_role("student"))):
    db = get_db()
    course = db.table("courses").select("id").eq("id", course_id).execute()
    if not course.data:
        raise HTTPException(status_code=404, detail="Course not found")

    dup = (
        db.table("enrollments")
        .select("id")
        .eq("course_id", course_id)
        .eq("student_id", current_user["id"])
        .execute()
    )
    if dup.data:
        raise HTTPException(status_code=400, detail="Already enrolled")

    db.table("enrollments").insert(
        {"course_id": course_id, "student_id": current_user["id"]}
    ).execute()
    return {"message": "Enrolled successfully"}


@router.get("/{course_id}/students")
async def course_students(
    course_id: str,
    current_user: dict = Depends(require_role("faculty", "admin")),
):
    db = get_db()
    res = (
        db.table("enrollments")
        .select("student_id, enrolled_at, users(id, name, email, role, created_at)")
        .eq("course_id", course_id)
        .execute()
    )
    return [
        {**e["users"], "enrolled_at": e["enrolled_at"]}
        for e in res.data
        if e.get("users")
    ]


# ──────────────────────────────────────────────
# COURSE OUTCOMES (COs)
# ──────────────────────────────────────────────

@router.post("/{course_id}/cos", response_model=COResponse, status_code=status.HTTP_201_CREATED)
async def create_co(
    course_id: str,
    body: COCreate,
    current_user: dict = Depends(require_role("faculty", "admin")),
):
    db = get_db()
    res = db.table("cos").insert(
        {"code": body.code, "description": body.description, "course_id": course_id}
    ).execute()
    return COResponse(**res.data[0])


@router.get("/{course_id}/cos", response_model=List[COResponse])
async def list_cos(course_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    res = db.table("cos").select("*").eq("course_id", course_id).execute()
    return [COResponse(**c) for c in res.data]


@router.post("/{course_id}/cos/{co_id}/map-po", status_code=status.HTTP_201_CREATED)
async def map_co_to_po(
    course_id: str,
    co_id: str,
    body: COPOMapRequest,
    current_user: dict = Depends(require_role("faculty", "admin")),
):
    db = get_db()
    db.table("co_po_mapping").insert({"co_id": co_id, "po_id": body.po_id}).execute()
    return {"message": "CO mapped to PO"}


# ──────────────────────────────────────────────
# PROGRAM OUTCOMES (POs) — institution-level
# ──────────────────────────────────────────────

@router.get("/pos/all", response_model=List[POResponse])
async def list_pos(current_user: dict = Depends(get_current_user)):
    db = get_db()
    res = db.table("pos").select("*").order("code").execute()
    return [POResponse(**p) for p in res.data]
