# Admin Routes for user management
from fastapi import APIRouter, Depends
from app.database import get_db
from app.deps import require_role

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users")
async def list_all_users(current_user: dict = Depends(require_role("admin"))):
    """Admin only — list all users in the system."""
    db = get_db()
    result = db.table("users").select("id, name, email, role, created_at").order("created_at", desc=True).execute()
    return result.data


@router.get("/stats")
async def get_stats(current_user: dict = Depends(require_role("admin"))):
    """Admin only — overview stats."""
    db = get_db()

    users = db.table("users").select("role").execute()
    counts = {"student": 0, "faculty": 0, "admin": 0}
    for u in users.data:
        counts[u["role"]] = counts.get(u["role"], 0) + 1

    courses = db.table("courses").select("id", count="exact").execute()
    submissions = db.table("submissions").select("id", count="exact").execute()

    return {
        "total_students": counts.get("student", 0),
        "total_faculty": counts.get("faculty", 0),
        "total_admins": counts.get("admin", 0),
        "total_courses": len(courses.data),
        "total_submissions": len(submissions.data),
    }
