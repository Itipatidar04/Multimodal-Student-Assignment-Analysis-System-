from typing import List, Dict, Any
from app.services.similarity_service import calculate_similarity


def evaluate_question_response(
    student_text: str,
    question: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Evaluates a student's submission text against a single question.
    Calculates similarity with reference_answer (if present) or question text concepts.
    """
    ref_answer = question.get("reference_answer") or question.get("text", "")
    max_marks = question.get("max_marks", 100)

    if not student_text or not student_text.strip():
        return {
            "question_id": question["id"],
            "max_marks": max_marks,
            "ai_score": 0.0,
            "similarity_score": 0.0,
            "feedback": "No content provided for this question."
        }

    similarity = calculate_similarity(student_text, ref_answer)
    score = round(similarity * max_marks, 2)

    return {
        "question_id": question["id"],
        "max_marks": max_marks,
        "ai_score": score,
        "similarity_score": similarity,
        "feedback": f"Sim score: {similarity:.2f}"
    }


def evaluate_assignment_submission(
    extracted_text: str,
    questions: List[Dict[str, Any]],
    rubrics: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Evaluates a complete assignment submission against multiple questions and rubrics.

    Outputs:
    - per-question scores
    - overall normalized AI score out of 100
    - rubric criterion scores
    - strengths, weaknesses, feedback, recommended topics
    - overall similarity score & flag
    """
    if not questions:
        # Fallback if assignment has no defined questions
        questions = [{
            "id": "default",
            "text": "General Submission Evaluation",
            "max_marks": 100,
            "reference_answer": ""
        }]

    # 1. Question-wise evaluation
    question_evaluations = []
    total_obtained_marks = 0.0
    total_max_marks = sum(q.get("max_marks", 0) for q in questions) or 100.0
    similarity_scores = []

    for q in questions:
        q_eval = evaluate_question_response(extracted_text, q)
        question_evaluations.append(q_eval)
        total_obtained_marks += q_eval["ai_score"]
        similarity_scores.append(q_eval["similarity_score"])

    # 2. Scale AI Score to /100
    normalized_ai_score = round((total_obtained_marks / total_max_marks) * 100, 2) if total_max_marks > 0 else 0.0
    avg_similarity = round(sum(similarity_scores) / len(similarity_scores), 2) if similarity_scores else 0.0

    # 3. Rubric Evaluation Breakdown
    criterion_scores = {}
    if rubrics:
        for r in rubrics:
            crit = r.get("criterion", "General Quality")
            weight = float(r.get("weight", 100))
            # Calculate criterion score based on normalized AI performance weighted by rubric weight
            crit_score = round((normalized_ai_score / 100.0) * weight, 2)
            criterion_scores[crit] = crit_score
    else:
        criterion_scores = {
            "Conceptual Understanding": round(normalized_ai_score * 0.5, 2),
            "Clarity & Structure": round(normalized_ai_score * 0.3, 2),
            "Completeness": round(normalized_ai_score * 0.2, 2)
        }

    # 4. Generate Feedback, Strengths, Weaknesses, and Recommendations
    strengths = []
    weaknesses = []
    recommended_topics = []

    if normalized_ai_score >= 80:
        strengths.append("Comprehensive understanding of key concepts across all questions.")
        strengths.append("Clear and well-structured responses.")
        feedback = "Outstanding submission demonstrating strong conceptual mastery and thorough depth."
    elif normalized_ai_score >= 60:
        strengths.append("Good grasp of core principles.")
        weaknesses.append("Some minor gaps in detail or technical precision.")
        recommended_topics.append("Review advanced concept examples and edge cases.")
        feedback = "Solid submission. Address minor conceptual gaps to reach top grade."
    elif normalized_ai_score >= 40:
        strengths.append("Attempted key questions with partial accuracy.")
        weaknesses.append("Missing detailed explanation on core requirements.")
        weaknesses.append("Low alignment with expected reference keypoints.")
        recommended_topics.append("Fundamental lecture topics and core reference materials.")
        feedback = "Satisfactory attempt but requires deeper conceptual study and clearer structure."
    else:
        weaknesses.append("Limited alignment with expected question solutions.")
        weaknesses.append("Insufficient detail provided in responses.")
        recommended_topics.append("Prerequisite topic reviews and fundamental tutorials.")
        feedback = "Submission requires substantial improvement. Consult course modules and seek guidance."

    return {
        "ai_score": normalized_ai_score,
        "question_scores": question_evaluations,
        "criterion_scores": criterion_scores,
        "similarity_score": avg_similarity,
        "similarity_flagged": avg_similarity < 0.30 or avg_similarity > 0.95,  # Too low concept match OR suspiciously identical
        "strengths": strengths,
        "weaknesses": weaknesses,
        "feedback": feedback,
        "recommended_topics": recommended_topics
    }

