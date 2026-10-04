from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def calculate_similarity(student_answer: str, reference_answer: str) -> float:
    """
    Calculate similarity between a student's answer
    and the reference answer using TF-IDF + cosine similarity.

    Returns:
        float: similarity score between 0 and 1
    """

    if not student_answer or not reference_answer:
        return 0.0

    student_answer = student_answer.strip()
    reference_answer = reference_answer.strip()

    if not student_answer or not reference_answer:
        return 0.0

    vectorizer = TfidfVectorizer(stop_words="english")

    vectors = vectorizer.fit_transform([
        student_answer,
        reference_answer
    ])

    similarity = cosine_similarity(vectors[0], vectors[1])[0][0]

    return round(float(similarity), 4)
