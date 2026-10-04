from typing import List, Dict, Any, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def calculate_similarity(student_answer: str, reference_answer: str) -> float:
    """
    Calculate semantic similarity between a student's answer
    and reference text using TF-IDF with word & character n-grams + cosine similarity.

    Returns:
        float: similarity score between 0.0 and 1.0
    """
    if not student_answer or not reference_answer:
        return 0.0

    student_answer = student_answer.strip()
    reference_answer = reference_answer.strip()

    if not student_answer or not reference_answer:
        return 0.0

    try:
        # Word n-gram vectorizer
        word_vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
        word_vectors = word_vectorizer.fit_transform([student_answer, reference_answer])
        word_sim = float(cosine_similarity(word_vectors[0], word_vectors[1])[0][0])
    except Exception:
        word_sim = 0.0

    try:
        # Char n-gram vectorizer for sub-word structural matching
        char_vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5))
        char_vectors = char_vectorizer.fit_transform([student_answer, reference_answer])
        char_sim = float(cosine_similarity(char_vectors[0], char_vectors[1])[0][0])
    except Exception:
        char_sim = 0.0

    combined_similarity = (word_sim * 0.7) + (char_sim * 0.3)
    return round(float(combined_similarity), 4)


def check_student_plagiarism(
    current_student_id: str,
    current_text: str,
    other_submissions: List[Dict[str, Any]],
    threshold: float = 0.75
) -> Tuple[float, bool, List[Dict[str, Any]]]:
    """
    Checks the current student's submission text against all other submitted answers
    for the same assignment to detect student-to-student plagiarism.

    Returns:
        - max_similarity (float)
        - is_plagiarized (bool)
        - flagged_matches (list of matched submission metadata)
    """
    if not current_text or not other_submissions:
        return 0.0, False, []

    max_sim = 0.0
    flagged_matches = []

    for sub in other_submissions:
        # Skip current student's own submission
        if sub.get("student_id") == current_student_id:
            continue

        other_text = sub.get("extracted_text") or sub.get("text_content") or ""
        if not other_text.strip():
            continue

        sim = calculate_similarity(current_text, other_text)
        if sim > max_sim:
            max_sim = sim

        if sim >= threshold:
            flagged_matches.append({
                "matched_submission_id": sub.get("id"),
                "matched_student_id": sub.get("student_id"),
                "similarity_score": sim
            })

    is_plagiarized = max_sim >= threshold
    return round(max_sim, 4), is_plagiarized, flagged_matches

