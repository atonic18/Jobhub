from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .app.api import auth, jobs, applications, chat, users, notifications, payments

app = FastAPI(title="JobHub API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(applications.router, prefix="/api/applications", tags=["Applications"])
app.include_router(chat.router, prefix="/api/chat", tags=["Messaging"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])

@app.get("/")
async def root():
    return {"message": "Welcome to JobHub API"}
