class Settings:
    PROJECT_NAME: str = "JobHub"
    SECRET_KEY: str = "YOUR_SUPER_SECRET_KEY_HERE" # In production, use a secure secret key
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days

settings = Settings()
