from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file="../.env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    supabase_url: str
    supabase_service_role_key: str
    supabase_anon_key: str = ""
    database_url: str = ""
    jwt_secret: str = "change-me-in-production-use-a-long-random-string"
    ai_api_key: str = ""
    backend_url: str = "http://localhost:8000"

    # JWT
    access_token_expire_minutes: int = 60 * 24  # 24 hours


settings = Settings()
