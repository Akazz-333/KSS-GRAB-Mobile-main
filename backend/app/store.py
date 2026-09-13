"""Thin PostgREST client: API code stays independent from a specific ORM."""
import asyncio
import logging
import httpx
from fastapi import HTTPException
from .config import settings

logger = logging.getLogger(__name__)

_store_http_client: httpx.AsyncClient | None = None
_store_client_loop_id: int | None = None


def get_store_http_client() -> httpx.AsyncClient:
    global _store_http_client, _store_client_loop_id
    try:
        current_loop = asyncio.get_running_loop()
        current_loop_id = id(current_loop)
    except RuntimeError:
        current_loop_id = None

    if current_loop_id is not None and current_loop_id != _store_client_loop_id:
        # Event loop changed — discard old client to prevent loop binding mismatch
        _store_http_client = None
        _store_client_loop_id = current_loop_id

    if _store_http_client is None or _store_http_client.is_closed:
        _store_http_client = httpx.AsyncClient(
            timeout=12.0,
            limits=httpx.Limits(
                max_keepalive_connections=50,
                max_connections=100,
                keepalive_expiry=30.0,
            ),
            http2=False,
        )
        try:
            _store_client_loop_id = id(asyncio.get_running_loop())
        except RuntimeError:
            pass
    return _store_http_client


class Store:
    def __init__(self):
        cfg = settings()
        self.base = cfg.supabase_url.rstrip("/") + "/rest/v1"

        anon_key = cfg.supabase_publishable_key
        service_key = cfg.supabase_service_key

        if not service_key:
            logger.warning(
                "SUPABASE_SERVICE_KEY is not set. Falling back to the anon/publishable "
                "key for DB writes. This will fail on any table with RLS enabled "
                "(orders, profiles, partner_documents). "
                "Set SUPABASE_SERVICE_KEY in backend/.env to fix this."
            )
        # Reads — anon key is fine; Supabase enforces RLS on SELECT for public data
        self._read_headers = {
            "apikey": anon_key,
            "Authorization": f"Bearer {anon_key}",
            "Content-Type": "application/json",
            "Accept-Profile": "public",
            "Content-Profile": "public",
        }

        # Writes — must use service role key to bypass RLS on INSERT/PATCH/DELETE
        # Falls back to anon key with a loud warning if service key not configured
        write_key = service_key if service_key else anon_key
        self._write_headers = {
            "apikey": write_key,
            "Authorization": f"Bearer {write_key}",
            "Content-Type": "application/json",
            "Accept-Profile": "public",
            "Content-Profile": "public",
        }

    async def get(self, table, params=None):
        client = get_store_http_client()
        response = await client.get(
            f"{self.base}/{table}",
            headers=self._read_headers,
            params=params or {},
        )
        if response.is_error:
            detail = (
                response.json().get("message", response.text)
                if response.headers.get("content-type", "").startswith("application/json")
                else response.text
            )
            raise HTTPException(502, f"Database request failed: {detail}")
        return response.json()

    async def insert(self, table, payload):
        headers = self._write_headers | {"Prefer": "return=representation"}
        client = get_store_http_client()
        response = await client.post(
            f"{self.base}/{table}",
            headers=headers,
            json=payload,
        )
        if response.is_error:
            detail = (
                response.json().get("message", response.text)
                if response.headers.get("content-type", "").startswith("application/json")
                else response.text
            )
            raise HTTPException(502, f"Database write failed: {detail}")
        rows = response.json()
        return rows[0] if isinstance(rows, list) else rows

    async def patch(self, table, payload, params):
        headers = self._write_headers | {"Prefer": "return=representation"}
        client = get_store_http_client()
        response = await client.patch(
            f"{self.base}/{table}",
            headers=headers,
            params=params,
            json=payload,
        )
        if response.is_error:
            detail = (
                response.json().get("message", response.text)
                if response.headers.get("content-type", "").startswith("application/json")
                else response.text
            )
            raise HTTPException(502, f"Database update failed: {detail}")
        return response.json()

    async def delete(self, table, params):
        client = get_store_http_client()
        response = await client.delete(
            f"{self.base}/{table}",
            headers=self._write_headers,
            params=params,
        )
        if response.is_error:
            detail = (
                response.json().get("message", response.text)
                if response.headers.get("content-type", "").startswith("application/json")
                else response.text
            )
            raise HTTPException(502, f"Database delete failed: {detail}")


store = Store()

