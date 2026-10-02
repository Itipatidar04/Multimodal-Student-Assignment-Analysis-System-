"""
extraction_service.py
Multimodal content extraction pipeline.
PDF and DOCX are fully implemented. Audio/video are stubs for Day 2.
"""
from typing import Optional
import io


async def extract_text(
    submission_type: str,
    file_content: Optional[bytes] = None,
    text_content: Optional[str] = None,
) -> str:
    """Given a submission type + raw bytes (or plain text), return extracted text."""
    if submission_type == "text":
        return text_content or ""

    if not file_content:
        return ""

    if submission_type == "pdf":
        return _extract_pdf(file_content)

    if submission_type == "docx":
        return _extract_docx(file_content)

    # audio, video — stub for Day 2
    return f"[{submission_type.upper()} extraction pending — Day 2]"


def _extract_pdf(content: bytes) -> str:
    """Extract text from a PDF using PyMuPDF."""
    try:
        import fitz
        doc = fitz.open(stream=content, filetype="pdf")
        return "\n\n".join(page.get_text() for page in doc)
    except Exception as e:
        return f"[PDF extraction error: {e}]"


def _extract_docx(content: bytes) -> str:
    """Extract text from a DOCX file using python-docx."""
    try:
        from docx import Document
        doc = Document(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    except Exception as e:
        return f"[DOCX extraction error: {e}]"
