#File Uploads
#Why signed URLs?
# The storage bucket is private. Files can't be accessed directly. When someone needs to download a submission, we generate a temporary signed URL valid for 1 hour. This prevents students from accessing each other's files.

from app.database import get_db

BUCKET = "submissions"


async def upload_file(content: bytes, path: str, content_type: str = "application/octet-stream") -> str:
    """Upload bytes to Supabase Storage and return the storage path."""
    db = get_db()
    db.storage.from_(BUCKET).upload(
        path=path,
        file=content,
        file_options={"content-type": content_type, "upsert": "true"},
    )
    return path  # We store the path and generate signed URLs on demand


async def get_signed_url(path: str, expires_in: int = 3600) -> str:
    """Create a time-limited signed URL for a private file."""
    db = get_db()
    result = db.storage.from_(BUCKET).create_signed_url(path, expires_in)
    return result.get("signedURL", "")
