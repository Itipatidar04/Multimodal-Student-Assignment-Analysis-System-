# Login & Register Endpoints
from fastapi import APIRouter, HTTPException, Depends, status
from app.models.user import UserCreate, UserLogin, UserResponse, Token
from app.services.auth_service import hash_password, verify_password, create_access_token
from app.database import get_db
from app.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(body: UserCreate):
    db = get_db()

    # Duplicate email check
    existing = db.table("users").select("id").eq("email", body.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = {
        "name": body.name,
        "email": body.email,
        "password_hash": hash_password(body.password),
        "role": body.role,
    }

    # Store program + semester for students
    if body.role == "student" and body.program_id:
        new_user["program_id"] = body.program_id
        new_user["current_semester"] = body.current_semester or 1

    result = db.table("users").insert(new_user).execute()
    user = result.data[0]

    # Auto-enroll student in ALL subjects of their program + semester
    if body.role == "student" and body.program_id and body.current_semester:
        subjects = (
            db.table("courses")
            .select("id")
            .eq("program_id", body.program_id)
            .eq("semester", str(body.current_semester))
            .execute()
        )
        if subjects.data:
            enrollments = [
                {"course_id": s["id"], "student_id": user["id"]}
                for s in subjects.data
            ]
            try:
                db.table("enrollments").insert(enrollments).execute()
            except Exception:
                pass  # Enrollment is non-critical — don't fail registration

    token = create_access_token(
        {"sub": user["id"], "email": user["email"], "role": user["role"], "name": user["name"]}
    )
    return Token(access_token=token, user=UserResponse(**user))


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    db = get_db()
    result = db.table("users").select("*").eq("email", credentials.email).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = result.data[0]
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(
        {"sub": user["id"], "email": user["email"], "role": user["role"], "name": user["name"]}
    )
    return Token(access_token=token, user=UserResponse(**user))


@router.get("/me", response_model=UserResponse)
async def me(current_user: dict = Depends(get_current_user)):
    db = get_db()
    result = db.table("users").select("*").eq("id", current_user["id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**result.data[0])
