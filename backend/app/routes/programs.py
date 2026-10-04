from fastapi import APIRouter, Query, Depends
from typing import Optional
from app.database import get_db
from app.deps import get_current_user

router = APIRouter(prefix="/programs", tags=["programs"])


@router.get("")
async def list_programs():
    """List all programs — public, used in registration dropdown"""
    db = get_db()
    res = db.table("programs").select("*").order("name").execute()
    return res.data


@router.get("/{program_id}/subjects")
async def get_program_subjects(
    program_id: str,
    semester: Optional[int] = Query(None, description="Filter by semester number"),
    current_user: dict = Depends(get_current_user),
):
    """Get subjects for a program, optionally filtered by semester.
    Includes faculty name and assignment count per subject."""
    db = get_db()

    query = (
        db.table("courses")
        .select("*, users(id, name, email)")
        .eq("program_id", program_id)
    )
    if semester is not None:
        query = query.eq("semester", str(semester))

    res = query.order("name").execute()

    subjects = []
    for c in res.data:
        faculty = c.pop("users", None)
        assign_res = (
            db.table("assignments")
            .select("id", count="exact")
            .eq("course_id", c["id"])
            .execute()
        )
        subjects.append({
            **c,
            "faculty_name":  faculty["name"]  if faculty else "Not Assigned",
            "faculty_email": faculty["email"] if faculty else None,
            "assignment_count": assign_res.count or 0,
        })

    return subjects
