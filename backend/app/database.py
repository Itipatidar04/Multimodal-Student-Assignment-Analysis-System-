#Supabase Connection file
from supabase import create_client, Client
from app.config import settings

_client: Client | None = None


def get_db() -> Client:
    """Return a singleton Supabase client using the service role key.
    The service role key bypasses RLS — all auth/RBAC is enforced in the API layer.
    """
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _client
