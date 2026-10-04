from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List
from app.deps import get_current_user
from app.services.analytics_service import (
    get_student_performance_summary,
    get_student_learning_curve
)
from app.services.skill_service import get_student_skills

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics & Learning Engine"]
)


@router.get("/student/{student_id}/profile")
async def get_student_profile_analytics(
    student_id: str,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Returns complete student performance profile including averages, learning curve, skill scores,
    identified weaknesses, and recommended topics.
    """
    if current_user["role"] == "student" and current_user["id"] != student_id:
        raise HTTPException(status_code=403, detail="Access denied")

    summary = get_student_performance_summary(student_id)
    return summary


@router.get("/student/{student_id}/learning-curve")
async def get_learning_curve(
    student_id: str,
    current_user: dict = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Returns time-series assignment evaluation scores for plotting student learning progress over time.
    """
    if current_user["role"] == "student" and current_user["id"] != student_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return get_student_learning_curve(student_id)


@router.get("/student/{student_id}/skills")
async def get_skills_profile(
    student_id: str,
    current_user: dict = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Returns institutional skill breakdown and competency scores for a student.
    """
    if current_user["role"] == "student" and current_user["id"] != student_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return get_student_skills(student_id)


@router.get("/student/{student_id}/recommendations")
async def get_learning_recommendations(
    student_id: str,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Returns personalized weak topics and recommended study topics.
    """
    if current_user["role"] == "student" and current_user["id"] != student_id:
        raise HTTPException(status_code=403, detail="Access denied")

    summary = get_student_performance_summary(student_id)
    return {
        "student_id": student_id,
        "weaknesses": summary.get("identified_weaknesses", []),
        "recommended_topics": summary.get("recommended_learning_topics", [])
    }
