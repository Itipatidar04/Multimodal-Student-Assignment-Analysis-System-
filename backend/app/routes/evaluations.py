from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from typing import Dict, Any

from app.database import get_db
from app.models.evaluation import FacultyReviewRequest, EvaluationResponse
from app.services.evaluation_service import evaluate_assignment_submission
from app.deps import get_current_user, require_role

router = APIRouter(
    prefix="/evaluations",
    tags=["Evaluations"]
)


@router.post("/{submission_id}", response_model=EvaluationResponse)
async def evaluate_submission(
    submission_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()

    # 1. Fetch submission
    submission_res = (
        db.table("submissions")
        .select("*")
        .eq("id", submission_id)
        .execute()
    )

    if not submission_res.data:
        raise HTTPException(status_code=404, detail="Submission not found")

    submission = submission_res.data[0]
    assignment_id = submission["assignment_id"]

    # 2. Fetch assignment questions & rubrics
    questions_res = (
        db.table("questions")
        .select("*")
        .eq("assignment_id", assignment_id)
        .order("order_index")
        .execute()
    )
    questions = questions_res.data or []

    rubrics_res = (
        db.table("rubrics")
        .select("*")
        .eq("assignment_id", assignment_id)
        .execute()
    )
    rubrics = rubrics_res.data or []

    # 3. Get extracted text
    student_text = (
        submission.get("extracted_text")
        or submission.get("text_content")
        or ""
    )

    if not student_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Submission does not contain readable text content to evaluate"
        )

    # 3.5 Check student-to-student plagiarism against other submissions for this assignment
    other_submissions_res = (
        db.table("submissions")
        .select("id, student_id, extracted_text, text_content")
        .eq("assignment_id", assignment_id)
        .execute()
    )
    other_submissions = [s for s in (other_submissions_res.data or []) if s["id"] != submission_id]

    from app.services.similarity_service import check_student_plagiarism
    max_cross_sim, is_cross_plagiarized, cross_matches = check_student_plagiarism(
        current_student_id=submission["student_id"],
        current_text=student_text,
        other_submissions=other_submissions,
        threshold=0.80
    )

    # 4. Perform Multi-Question AI Evaluation
    eval_result = evaluate_assignment_submission(
        extracted_text=student_text,
        questions=questions,
        rubrics=rubrics
    )

    # Include cross-student similarity signal into similarity_flagged
    if is_cross_plagiarized:
        eval_result["similarity_flagged"] = True
        eval_result["similarity_score"] = max(eval_result["similarity_score"], max_cross_sim)
        eval_result["weaknesses"].append(f"High cross-student similarity detected ({max_cross_sim * 100:.1f}% match with another submission).")


    ai_score = eval_result["ai_score"]  # Score out of 100

    # 5. Check if evaluation record already exists
    existing_eval = (
        db.table("evaluations")
        .select("*")
        .eq("submission_id", submission_id)
        .execute()
    )

    faculty_score = None
    faculty_notes = None
    if existing_eval.data:
        eval_id = existing_eval.data[0]["id"]
        faculty_score = existing_eval.data[0].get("faculty_score")
        faculty_notes = existing_eval.data[0].get("faculty_notes")
        final_score = round(ai_score + (faculty_score or 0.0), 2)

        update_payload = {
            "ai_score": ai_score,
            "criterion_scores": eval_result["criterion_scores"],
            "strengths": eval_result["strengths"],
            "weaknesses": eval_result["weaknesses"],
            "feedback": eval_result["feedback"],
            "recommended_topics": eval_result["recommended_topics"],
            "similarity_score": eval_result["similarity_score"],
            "similarity_flagged": eval_result["similarity_flagged"],
            "final_score": final_score,
            "status": "ai_evaluated" if not faculty_score else "faculty_reviewed"
        }

        updated_res = db.table("evaluations").update(update_payload).eq("id", eval_id).execute()
        evaluation_record = updated_res.data[0]
    else:
        final_score = ai_score
        insert_payload = {
            "submission_id": submission_id,
            "ai_score": ai_score,
            "criterion_scores": eval_result["criterion_scores"],
            "strengths": eval_result["strengths"],
            "weaknesses": eval_result["weaknesses"],
            "feedback": eval_result["feedback"],
            "recommended_topics": eval_result["recommended_topics"],
            "similarity_score": eval_result["similarity_score"],
            "similarity_flagged": eval_result["similarity_flagged"],
            "final_score": final_score,
            "status": "ai_evaluated"
        }

        inserted_res = db.table("evaluations").insert(insert_payload).execute()
        evaluation_record = inserted_res.data[0]
        eval_id = evaluation_record["id"]

    # 6. Save question_scores
    qs_details = []
    for q_eval in eval_result["question_scores"]:
        q_id = q_eval["question_id"]
        q_score_payload = {
            "evaluation_id": eval_id,
            "question_id": q_id,
            "ai_score": q_eval["ai_score"],
            "final_score": q_eval["ai_score"]
        }
        # Upsert question scores
        db.table("question_scores").upsert(q_score_payload, on_conflict="evaluation_id,question_id").execute()
        qs_details.append({
            "question_id": q_id,
            "max_marks": q_eval["max_marks"],
            "ai_score": q_eval["ai_score"],
            "final_score": q_eval["ai_score"]
        })

    # Update submission status
    db.table("submissions").update({"status": "evaluated"}).eq("id", submission_id).execute()

    # Update student skill profile
    from app.services.skill_service import update_student_skills
    update_student_skills(submission["student_id"], evaluation_record)


    return EvaluationResponse(
        id=evaluation_record["id"],
        submission_id=submission_id,
        ai_score=evaluation_record.get("ai_score"),
        faculty_score=evaluation_record.get("faculty_score"),
        final_score=evaluation_record.get("final_score"),
        criterion_scores=evaluation_record.get("criterion_scores") or {},
        strengths=evaluation_record.get("strengths") or [],
        weaknesses=evaluation_record.get("weaknesses") or [],
        feedback=evaluation_record.get("feedback"),
        recommended_topics=evaluation_record.get("recommended_topics") or [],
        similarity_score=evaluation_record.get("similarity_score"),
        similarity_flagged=evaluation_record.get("similarity_flagged") or False,
        faculty_notes=evaluation_record.get("faculty_notes"),
        faculty_reviewed_at=evaluation_record.get("faculty_reviewed_at"),
        status=evaluation_record.get("status"),
        question_scores=qs_details,
        created_at=evaluation_record["created_at"],
        updated_at=evaluation_record["updated_at"]
    )


@router.post("/{submission_id}/review", response_model=EvaluationResponse)
async def review_evaluation(
    submission_id: str,
    review: FacultyReviewRequest,
    current_user: dict = Depends(require_role("faculty", "admin"))
):
    db = get_db()

    # 1. Fetch evaluation
    eval_res = (
        db.table("evaluations")
        .select("*")
        .eq("submission_id", submission_id)
        .execute()
    )

    if not eval_res.data:
        raise HTTPException(status_code=404, detail="Evaluation record not found for this submission")

    evaluation = eval_res.data[0]
    eval_id = evaluation["id"]

    # 2. Validate faculty score out of 100
    if review.faculty_score < 0 or review.faculty_score > 100:
        raise HTTPException(status_code=400, detail="Faculty score must be between 0 and 100")

    ai_score = evaluation.get("ai_score") or 0.0
    final_score = round(ai_score + review.faculty_score, 2)  # Total out of 200

    new_status = "finalized" if review.finalize else "faculty_reviewed"

    # 3. Update evaluation
    update_data = {
        "faculty_score": review.faculty_score,
        "faculty_notes": review.faculty_notes,
        "final_score": final_score,
        "faculty_reviewed_at": datetime.now(timezone.utc).isoformat(),
        "status": new_status
    }

    updated_res = db.table("evaluations").update(update_data).eq("id", eval_id).execute()
    updated_eval = updated_res.data[0]

    # Update submission status if finalized
    if review.finalize:
        db.table("submissions").update({"status": "finalized"}).eq("id", submission_id).execute()

    # 4. Handle per-question overrides if provided
    if review.question_overrides:
        for q_id, f_q_score in review.question_overrides.items():
            db.table("question_scores").update({"final_score": f_q_score}).eq("evaluation_id", eval_id).eq("question_id", q_id).execute()

    # Fetch updated question scores
    qs_res = db.table("question_scores").select("*").eq("evaluation_id", eval_id).execute()
    qs_details = [
        {
            "question_id": q["question_id"],
            "max_marks": 100.0,
            "ai_score": q.get("ai_score") or 0.0,
            "final_score": q.get("final_score") or 0.0
        }
        for q in (qs_res.data or [])
    ]

    return EvaluationResponse(
        id=updated_eval["id"],
        submission_id=submission_id,
        ai_score=updated_eval.get("ai_score"),
        faculty_score=updated_eval.get("faculty_score"),
        final_score=updated_eval.get("final_score"),
        criterion_scores=updated_eval.get("criterion_scores") or {},
        strengths=updated_eval.get("strengths") or [],
        weaknesses=updated_eval.get("weaknesses") or [],
        feedback=updated_eval.get("feedback"),
        recommended_topics=updated_eval.get("recommended_topics") or [],
        similarity_score=updated_eval.get("similarity_score"),
        similarity_flagged=updated_eval.get("similarity_flagged") or False,
        faculty_notes=updated_eval.get("faculty_notes"),
        faculty_reviewed_at=updated_eval.get("faculty_reviewed_at"),
        status=updated_eval.get("status"),
        question_scores=qs_details,
        created_at=updated_eval["created_at"],
        updated_at=updated_eval["updated_at"]
    )


@router.get("/{submission_id}", response_model=EvaluationResponse)
async def get_evaluation(
    submission_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()

    eval_res = (
        db.table("evaluations")
        .select("*")
        .eq("submission_id", submission_id)
        .execute()
    )

    if not eval_res.data:
        raise HTTPException(status_code=404, detail="Evaluation not found for this submission")

    evaluation = eval_res.data[0]
    eval_id = evaluation["id"]

    # Fetch question scores
    qs_res = db.table("question_scores").select("*, questions(text, max_marks)").eq("evaluation_id", eval_id).execute()
    qs_details = []
    if qs_res.data:
        for q in qs_res.data:
            q_info = q.get("questions") or {}
            qs_details.append({
                "question_id": q["question_id"],
                "question_text": q_info.get("text"),
                "max_marks": q_info.get("max_marks", 100),
                "ai_score": q.get("ai_score") or 0.0,
                "final_score": q.get("final_score")
            })

    return EvaluationResponse(
        id=evaluation["id"],
        submission_id=submission_id,
        ai_score=evaluation.get("ai_score"),
        faculty_score=evaluation.get("faculty_score"),
        final_score=evaluation.get("final_score"),
        criterion_scores=evaluation.get("criterion_scores") or {},
        strengths=evaluation.get("strengths") or [],
        weaknesses=evaluation.get("weaknesses") or [],
        feedback=evaluation.get("feedback"),
        recommended_topics=evaluation.get("recommended_topics") or [],
        similarity_score=evaluation.get("similarity_score"),
        similarity_flagged=evaluation.get("similarity_flagged") or False,
        faculty_notes=evaluation.get("faculty_notes"),
        faculty_reviewed_at=evaluation.get("faculty_reviewed_at"),
        status=evaluation.get("status"),
        question_scores=qs_details,
        created_at=evaluation["created_at"],
        updated_at=evaluation["updated_at"]
    )

