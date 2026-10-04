from typing import List, Dict, Any
from app.database import get_db
from app.services.skill_service import get_student_skills


def get_student_learning_curve(student_id: str) -> List[Dict[str, Any]]:
    """
    Computes time-series assignment evaluation scores to construct the student's learning curve.
    """
    db = get_db()
    submissions_res = (
        db.table("submissions")
        .select("id, submitted_at, assignments(id, title, total_marks, courses(name, code))")
        .eq("student_id", student_id)
        .order("submitted_at")
        .execute()
    )

    if not submissions_res.data:
        return []

    sub_ids = [s["id"] for s in submissions_res.data]
    evals_res = (
        db.table("evaluations")
        .select("*")
        .in_("submission_id", sub_ids)
        .execute()
    )

    eval_map = {e["submission_id"]: e for e in (evals_res.data or [])}

    curve = []
    for sub in submissions_res.data:
        ev = eval_map.get(sub["id"])
        if not ev:
            continue

        assignment_info = sub.get("assignments") or {}
        course_info = assignment_info.get("courses") or {}

        curve.append({
            "submission_id": sub["id"],
            "assignment_id": assignment_info.get("id"),
            "assignment_title": assignment_info.get("title", "Assignment"),
            "course_name": course_info.get("name"),
            "course_code": course_info.get("code"),
            "submitted_at": sub["submitted_at"],
            "ai_score": float(ev.get("ai_score") or 0.0),
            "faculty_score": float(ev.get("faculty_score") or 0.0) if ev.get("faculty_score") is not None else None,
            "final_score": float(ev.get("final_score") or 0.0),
            "status": ev.get("status")
        })

    return curve


def get_student_performance_summary(student_id: str) -> Dict[str, Any]:
    """
    Computes complete student performance analytics, skill profiles, learning curve,
    recurring weak topics, and personalized learning recommendations.
    """
    db = get_db()

    learning_curve = get_student_learning_curve(student_id)
    skills = get_student_skills(student_id)

    # Calculate overall averages & trends
    total_assignments = len(learning_curve)
    if total_assignments > 0:
        avg_ai_score = round(sum(item["ai_score"] for item in learning_curve) / total_assignments, 2)
        final_scores = [item["final_score"] for item in learning_curve if item["final_score"] is not None]
        avg_final_score = round(sum(final_scores) / len(final_scores), 2) if final_scores else avg_ai_score
        
        # Calculate trend (comparing last 3 vs first 3)
        if total_assignments >= 2:
            recent_avg = sum(item["final_score"] for item in learning_curve[-2:]) / 2.0
            initial_avg = sum(item["final_score"] for item in learning_curve[:2]) / 2.0
            trend_direction = "improving" if recent_avg >= initial_avg else "declining"
            trend_value = round(recent_avg - initial_avg, 2)
        else:
            trend_direction = "stable"
            trend_value = 0.0
    else:
        avg_ai_score = 0.0
        avg_final_score = 0.0
        trend_direction = "stable"
        trend_value = 0.0

    # Aggregate weaknesses and recommendations across evaluations
    submissions_res = db.table("submissions").select("id").eq("student_id", student_id).execute()
    sub_ids = [s["id"] for s in (submissions_res.data or [])]

    weaknesses = set()
    recommendations = set()

    if sub_ids:
        evals_res = db.table("evaluations").select("weaknesses, recommended_topics").in_("submission_id", sub_ids).execute()
        for ev in (evals_res.data or []):
            for w in (ev.get("weaknesses") or []):
                weaknesses.add(w)
            for r in (ev.get("recommended_topics") or []):
                recommendations.add(r)

    return {
        "student_id": student_id,
        "total_assignments_submitted": total_assignments,
        "average_ai_score": avg_ai_score,
        "average_final_score": avg_final_score,
        "performance_trend": {
            "direction": trend_direction,
            "change_value": trend_value
        },
        "skills_profile": skills,
        "learning_curve": learning_curve,
        "identified_weaknesses": list(weaknesses),
        "recommended_learning_topics": list(recommendations)
    }
