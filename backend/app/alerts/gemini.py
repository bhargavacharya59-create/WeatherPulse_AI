"""Minimal Gemini REST client (no SDK dependency) with multi-key failover.

Used for (a) alert/summary drafting and (b) the Copilot's function-calling
loop. Keys stay server-side (GEMINI_API_KEY / GEMINI_API_KEY_2 in backend/.env).
When one key is rate-limited (HTTP 429), the next key is tried instantly so the
user never sees a "key not working" error during a live demo.
"""
from __future__ import annotations

import json
import logging
import re
import threading
import time

import httpx

from app.config import settings

log = logging.getLogger("weatherpulse.gemini")
BASE = "https://generativelanguage.googleapis.com/v1beta/models"


# ── Per-key quota tracking ──────────────────────────────────────────────
_lock = threading.Lock()
_key_paused_until: dict[str, float] = {}   # {api_key: unix_timestamp}
_last_error: str | None = None
DEFAULT_PAUSE_S = 60.0
DAILY_PAUSE_S = 15 * 60.0


def _all_keys() -> list[str]:
    """Return all configured, non-empty Gemini API keys."""
    keys = []
    if settings.gemini_api_key:
        keys.append(settings.gemini_api_key)
    if settings.gemini_api_key_2:
        keys.append(settings.gemini_api_key_2)
    return keys


def _available_keys() -> list[str]:
    """Return keys whose quota pause has expired (ready to use now)."""
    now = time.time()
    return [k for k in _all_keys() if now >= _key_paused_until.get(k, 0)]


def enabled() -> bool:
    """At least one key configured and not switched off."""
    return bool(_all_keys() and settings.use_gemini)


def available() -> bool:
    """At least one key is configured, enabled, AND not currently paused."""
    return enabled() and len(_available_keys()) > 0


def status() -> dict:
    keys = _all_keys()
    now = time.time()
    paused_all = all(now < _key_paused_until.get(k, 0) for k in keys) if keys else False
    left = 0
    if paused_all and keys:
        left = max(0, round(min(_key_paused_until.get(k, 0) for k in keys) - now))
    return {"configured": enabled(), "model": settings.gemini_model if enabled() else None,
            "keys": len(keys), "keys_available": len(_available_keys()),
            "paused_for_s": left, "last_error": _last_error if left else None}


def _pause_after_429(r: httpx.Response) -> float:
    """Seconds to back off: Retry-After header, the RetryInfo delay in the body, or a default."""
    wait = None
    try:
        wait = float(r.headers.get("retry-after"))
    except (TypeError, ValueError):
        pass
    if wait is None:
        m = re.search(r'"retryDelay":\s*"(\d+(?:\.\d+)?)s"', r.text)
        if m:
            wait = float(m.group(1))
    if wait is None:
        # "PerDay" quota ids mean the daily allowance is gone: back off longer.
        wait = DAILY_PAUSE_S if "PerDay" in r.text else DEFAULT_PAUSE_S
    return min(max(wait, 10.0), 3600.0)


def generate(contents: list, system: str | None = None, tools: list | None = None,
             temperature: float = 0.2, json_mode: bool = False, timeout: float = 25.0) -> dict | None:
    """Call models/{model}:generateContent with automatic key failover.

    Tries each available key in order. On a 429, pauses that specific key and
    immediately retries with the next one. Returns None only if every key is
    exhausted or no keys are configured.
    """
    global _last_error
    if not enabled():
        return None
    ready = _available_keys()
    if not ready:
        return None

    body: dict = {"contents": contents, "generationConfig": {"temperature": temperature}}
    if system:
        body["systemInstruction"] = {"parts": [{"text": system}]}
    if tools:
        body["tools"] = [{"functionDeclarations": tools}]
    if json_mode:
        body["generationConfig"]["responseMimeType"] = "application/json"

    for key in ready:
        key_label = f"key-{_all_keys().index(key) + 1}"
        try:
            r = httpx.post(f"{BASE}/{settings.gemini_model}:generateContent",
                           headers={"x-goog-api-key": key, "Content-Type": "application/json"},
                           json=body, timeout=timeout)
            if r.status_code == 429:
                wait = _pause_after_429(r)
                with _lock:
                    _key_paused_until[key] = time.time() + wait
                    _last_error = f"{key_label} quota exceeded (HTTP 429)"
                remaining = len([k for k in ready if time.time() < _key_paused_until.get(k, 0)] ) 
                log.warning("Gemini %s quota exceeded (429) - paused for %ds. Trying next key...",
                            key_label, wait)
                continue   # ← try the next key immediately
            if r.status_code != 200:
                log.warning("Gemini HTTP %s on %s: %s", r.status_code, key_label, r.text[:300])
                continue   # try next key on other errors too
            log.debug("Gemini call succeeded on %s", key_label)
            return r.json()
        except Exception as e:  # network, timeout, JSON
            log.warning("Gemini call failed on %s: %s", key_label, e)
            continue   # try next key

    # All keys failed
    log.warning("All Gemini keys exhausted or failed - falling back to offline mode.")
    _last_error = "all keys exhausted"
    return None


def first_parts(resp: dict | None) -> list:
    try:
        return resp["candidates"][0]["content"]["parts"]
    except Exception:
        return []


def text_of(resp: dict | None) -> str | None:
    parts = first_parts(resp)
    txt = "".join(p.get("text", "") for p in parts if "text" in p).strip()
    return txt or None


def json_of(resp: dict | None):
    txt = text_of(resp)
    if not txt:
        return None
    txt = txt.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(txt)
    except json.JSONDecodeError:
        return None
