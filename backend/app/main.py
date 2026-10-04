'''Creates the FastAPI app
Adds CORS middleware so the React frontend (running on port 5173) can call this API without being blocked
Registers all 5 routers: auth, courses, assignments, submissions, admin
Adds a /health endpoint (used later for Docker health checks)
Adds a /docs endpoint — FastAPI auto-generates a beautiful interactive API docs page here
'''

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import admin, auth, assignments, courses, submissions, evaluations
from app.routes import programs

app = FastAPI(
    title="IIPS Assignment Analysis System",
    description="Multimodal Student Assignment Analysis, Evaluation & Learning Curve Analytics",
    version="1.0.0",
)

# ── CORS: allow the React frontend to talk to this API ──────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8501"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register all routers ─────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(programs.router)
app.include_router(courses.router)
app.include_router(assignments.router)
app.include_router(submissions.router)
app.include_router(evaluations.router)
app.include_router(admin.router)


# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "service": "iips-assignment-api"}


@app.get("/", tags=["system"])
async def root():
    return {
        "message": "IIPS Assignment Analysis API is running",
        "docs": "/docs",
        "health": "/health",
    }
