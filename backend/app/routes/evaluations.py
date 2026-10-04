from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from datetime import datetime, timezone

from app.database import get_db
from app.services.evaluation_service import evaluate_answer

class FacultyReviewRequest(BaseModel):
    faculty_score: float = Field(..., ge=0)
    faculty_notes: str | None = None

router = APIRouter(
    prefix="/evaluations",
    tags=["Evaluations"]
)


@router.post("/{submission_id}")
async def evaluate_submission(submission_id: str):
    db = get_db()

    # 1. Get submission
    submission_result = (
        db.table("submissions")
        .select("*")
        .eq("id", submission_id)
        .single()
        .execute()
    )

    submission = submission_result.data

    if not submission:
        raise HTTPException(
            status_code=404,
            detail="Submission not found"
        )

    # 2. Get question for this assignment
    question_result = (
        db.table("questions")
        .select("*")
        .eq("assignment_id", submission["assignment_id"])
        .order("order_index")
        .limit(1)
        .execute()
    )

    if not question_result.data:
        raise HTTPException(
            status_code=404,
            detail="No question found for this assignment"
        )

    question = question_result.data[0]

    # 3. Get student's extracted answer
    student_answer = (
        submission.get("extracted_text")
        or submission.get("text_content")
        or ""
    )

    reference_answer = question.get("reference_answer") or ""

    if not student_answer:
        raise HTTPException(
            status_code=400,
            detail="Submission does not contain extracted text"
        )

    if not reference_answer:
        raise HTTPException(
            status_code=400,
            detail="Reference answer is not configured"
        )

    # 4. Evaluate
    result = evaluate_answer(
        student_answer=student_answer,
        reference_answer=reference_answer,
        max_marks=question["max_marks"]
    )

    # 5. Save evaluation
    evaluation_result = (
        db.table("evaluations")
        .update({
            "ai_score": result["ai_score"],
            "similarity_score": result["similarity_score"],
            "similarity_flagged": result["similarity_score"] < 0.30,
            "feedback": result["feedback"],
            "final_score": result["ai_score"],
            "status": "ai_evaluated"
        })
        .eq("submission_id", submission_id)
        .execute()
    )

    if not evaluation_result.data:
        raise HTTPException(
            status_code=404,
            detail="Evaluation record not found"
        )

    return {
        "submission_id": submission_id,
        "question_id": question["id"],
        "max_marks": question["max_marks"],
        **result
    }


@router.post("/{submission_id}/review")
async def review_evaluation(
    submission_id: str,
    review: FacultyReviewRequest
):
    db = get_db()

    # 1. Get existing evaluation
    evaluation_result = (
        db.table("evaluations")
        .select("*")
        .eq("submission_id", submission_id)
        .single()
        .execute()
    )

    evaluation = evaluation_result.data

    if not evaluation:
        raise HTTPException(
            status_code=404,
            detail="Evaluation not found"
        )

    # 2. Get submission to determine maximum marks
    submission_result = (
        db.table("submissions")
        .select("assignment_id")
        .eq("id", submission_id)
        .single()
        .execute()
    )

    submission = submission_result.data

    if not submission:
        raise HTTPException(
            status_code=404,
            detail="Submission not found"
        )

    # 3. Get maximum marks
    question_result = (
        db.table("questions")
        .select("max_marks")
        .eq("assignment_id", submission["assignment_id"])
        .order("order_index")
        .limit(1)
        .execute()
    )

    if not question_result.data:
        raise HTTPException(
            status_code=404,
            detail="Question not found"
        )

    max_marks = question_result.data[0]["max_marks"]

    # 4. Validate faculty score
    if review.faculty_score > max_marks:
        raise HTTPException(
            status_code=400,
            detail=f"Faculty score cannot exceed {max_marks}"
        )

    # 5. Save faculty review
    updated_result = (
        db.table("evaluations")
        .update({
            "faculty_score": review.faculty_score,
            "faculty_notes": review.faculty_notes,
            "final_score": review.faculty_score,
            "faculty_reviewed_at": datetime.now(timezone.utc).isoformat(),
            "status": "faculty_reviewed"
        })
        .eq("submission_id", submission_id)
        .execute()
    )

    if not updated_result.data:
        raise HTTPException(
            status_code=404,
            detail="Failed to update evaluation"
        )

    return {
        "submission_id": submission_id,
        "ai_score": evaluation.get("ai_score"),
        "faculty_score": review.faculty_score,
        "final_score": round(
            (evaluation.get("ai_score") or 0) + review.faculty_score,
            2
        ),
        "faculty_notes": review.faculty_notes,
        "status": "faculty_reviewed"
    }


@router.get("/{submission_id}")
async def get_evaluation(submission_id: str):
    db = get_db()

    result = (
        db.table("evaluations")
        .select("*")
        .eq("submission_id", submission_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail="Evaluation not found"
        )

    return result.data
