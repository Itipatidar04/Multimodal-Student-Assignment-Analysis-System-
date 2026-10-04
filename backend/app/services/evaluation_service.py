from app.services.similarity_service import calculate_similarity


def evaluate_answer(
    student_answer: str,
    reference_answer: str,
    max_marks: int
) -> dict:
    """
    Evaluate a student's answer against a reference answer.

    Returns similarity, score and basic feedback.
    """

    similarity = calculate_similarity(
        student_answer,
        reference_answer
    )

    # Convert similarity (0-1) into marks
    score = round(similarity * max_marks, 2)

    if similarity >= 0.75:
        feedback = "The answer is highly similar to the expected answer."
    elif similarity >= 0.50:
        feedback = "The answer covers several relevant concepts but may miss some expected details."
    elif similarity >= 0.30:
        feedback = "The answer has some relevant content but needs more detail and conceptual coverage."
    else:
        feedback = "The answer has low similarity to the expected answer and needs significant improvement."

    return {
        "similarity_score": similarity,
        "ai_score": score,
        "feedback": feedback,
    }
