#Login & Register Endpoints
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
    result = db.table("users").insert(new_user).execute()
    user = result.data[0]

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
