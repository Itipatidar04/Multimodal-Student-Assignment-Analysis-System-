from fastapi import APIRouter, Depends, Query
from typing import Optional
from app.database import get_db
from app.deps import require_role

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
async def get_stats(current_user: dict = Depends(require_role("admin"))):
    """Overall system stats for admin dashboard"""
    db = get_db()

    students    = db.table("users").select("id", count="exact").eq("role", "student").execute()
    faculty     = db.table("users").select("id", count="exact").eq("role", "faculty").execute()
    subjects    = db.table("courses").select("id", count="exact").execute()
    submissions = db.table("submissions").select("id", count="exact").execute()
    assignments = db.table("assignments").select("id", count="exact").execute()

    return {
        "total_students":    students.count    or 0,
        "total_faculty":     faculty.count     or 0,
        "total_subjects":    subjects.count    or 0,
        "total_submissions": submissions.count or 0,
        "total_assignments": assignments.count or 0,
    }


@router.get("/students")
async def get_students(
    program_id: Optional[str] = Query(None),
    semester:   Optional[int] = Query(None),
    course_id:  Optional[str] = Query(None),
    current_user: dict = Depends(require_role("admin")),
):
    """All students with optional filters: program, semester, subject"""
    db = get_db()

    query = db.table("users").select("*").eq("role", "student")
    if program_id:
        query = query.eq("program_id", program_id)
    if semester:
        query = query.eq("current_semester", semester)

    res      = query.order("name").execute()
    students = res.data

    # Further filter by enrollment in a specific subject
    if course_id:
        enrolled = (
            db.table("enrollments")
            .select("student_id")
            .eq("course_id", course_id)
            .execute()
        )
        enrolled_ids = {e["student_id"] for e in enrolled.data}
        students = [s for s in students if s["id"] in enrolled_ids]

    # Attach submission count and enrolled subject count per student
    result = []
    for s in students:
        sub_res    = db.table("submissions").select("id", count="exact").eq("student_id", s["id"]).execute()
        enroll_res = db.table("enrollments").select("id", count="exact").eq("student_id", s["id"]).execute()
        result.append({
            **s,
            "submission_count":  sub_res.count    or 0,
            "enrolled_subjects": enroll_res.count or 0,
        })

    return result


@router.get("/faculty")
async def get_faculty(
    course_id: Optional[str] = Query(None),
    current_user: dict = Depends(require_role("admin")),
):
    """All faculty, optionally filtered to only faculty teaching a specific subject"""
    db = get_db()

    if course_id:
        course = db.table("courses").select("faculty_id").eq("id", course_id).execute()
        if not course.data or not course.data[0].get("faculty_id"):
            return []
        res = db.table("users").select("*").eq("id", course.data[0]["faculty_id"]).execute()
    else:
        res = db.table("users").select("*").eq("role", "faculty").order("name").execute()

    result = []
    for f in res.data:
        subjects = (
            db.table("courses")
            .select("id, name, semester, code")
            .eq("faculty_id", f["id"])
            .execute()
        )
        assign_count = 0
        for s in subjects.data:
            ac = db.table("assignments").select("id", count="exact").eq("course_id", s["id"]).execute()
            assign_count += ac.count or 0

        result.append({
            **f,
            "subjects":         subjects.data,
            "subject_count":    len(subjects.data),
            "assignment_count": assign_count,
        })

    return result
