from typing import List, Dict, Any
from app.database import get_db


def update_student_skills(student_id: str, evaluation: Dict[str, Any]) -> None:
    """
    Updates a student's skill proficiency scores based on an evaluation result.
    Maps evaluation criterion scores and overall evaluation performance to institutional skills.
    """
    db = get_db()

    # 1. Fetch available skills from DB
    skills_res = db.table("skills").select("*").execute()
    if not skills_res.data:
        return

    skills_map = {s["name"].lower(): s["id"] for s in skills_res.data}
    ai_score = evaluation.get("ai_score") or 0.0
    final_score = evaluation.get("final_score") or ai_score

    # Normalize final score to percentage (assuming final score out of 200 or 100)
    score_percentage = (final_score / 200.0 * 100.0) if final_score > 100 else final_score

    criterion_scores = evaluation.get("criterion_scores") or {}

    # Map criterion names to default skill categories
    skill_updates = {}
    for crit, val in criterion_scores.items():
        crit_lower = crit.lower()
        if "concept" in crit_lower or "understanding" in crit_lower:
            skill_updates["Concept Application"] = val
        elif "writing" in crit_lower or "clarity" in crit_lower or "structure" in crit_lower:
            skill_updates["Technical Writing"] = val
        elif "problem" in crit_lower or "analysis" in crit_lower:
            skill_updates["Problem Solving"] = val
        elif "completeness" in crit_lower or "depth" in crit_lower:
            skill_updates["Critical Thinking"] = val

    # Default fallback skills if criteria don't map directly
    if "Concept Application" not in skill_updates:
        skill_updates["Concept Application"] = round(score_percentage * 0.9, 2)
    if "Critical Thinking" not in skill_updates:
        skill_updates["Critical Thinking"] = round(score_percentage * 0.85, 2)
    if "Communication" not in skill_updates:
        skill_updates["Communication"] = round(score_percentage * 0.80, 2)

    # 2. Update or insert student skills (exponential moving average or score update)
    for skill_name, new_score in skill_updates.items():
        skill_id = skills_map.get(skill_name.lower())
        if not skill_id:
            continue

        existing_res = (
            db.table("student_skills")
            .select("*")
            .eq("student_id", student_id)
            .eq("skill_id", skill_id)
            .execute()
        )

        if existing_res.data:
            current = existing_res.data[0]
            old_score = float(current.get("score") or 0.0)
            # Moving average: 60% previous + 40% new performance
            updated_score = round((old_score * 0.6) + (new_score * 0.4), 2)
            db.table("student_skills").update({
                "score": updated_score,
                "evidence": f"Evaluated from submission {evaluation.get('submission_id')}"
            }).eq("id", current["id"]).execute()
        else:
            db.table("student_skills").insert({
                "student_id": student_id,
                "skill_id": skill_id,
                "score": round(new_score, 2),
                "evidence": f"Evaluated from submission {evaluation.get('submission_id')}"
            }).execute()


def get_student_skills(student_id: str) -> List[Dict[str, Any]]:
    """
    Retrieves all skill scores for a student.
    """
    db = get_db()
    res = (
        db.table("student_skills")
        .select("id, score, evidence, updated_at, skills(name, description)")
        .eq("student_id", student_id)
        .execute()
    )

    skills_data = []
    if res.data:
        for item in res.data:
            skill_info = item.get("skills") or {}
            skills_data.append({
                "skill_id": item.get("skill_id"),
                "skill_name": skill_info.get("name", "Skill"),
                "description": skill_info.get("description"),
                "score": float(item.get("score") or 0.0),
                "evidence": item.get("evidence"),
                "updated_at": item.get("updated_at")
            })
    return skills_data
