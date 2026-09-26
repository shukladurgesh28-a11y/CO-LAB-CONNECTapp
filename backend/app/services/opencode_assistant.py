"""OpenCode Zen model backend for the platform AI assistant.

Uses the OpenAI-compatible Zen endpoint (default model: big-pickle, free).
The API key lives ONLY in backend env (OPENCODE_ZEN_API_KEY) — it is never
sent to the frontend. Without a key, opencode_configured() is False and the
frontend uses its built-in rule-based assistant instead.
"""

import os

import requests
from flask import current_app


ZEN_URL = "https://opencode.ai/zen/v1/chat/completions"

SYSTEM_PROMPT = (
    "You are the analytics assistant for CO-LAB CONNECT, a cooperative-first "
    "digital workforce marketplace (customers -> societies/cooperatives -> "
    "federation -> verified workers). Money rule: worker payout = customer "
    "total - 10% commission, and commission is the only deduction. You receive "
    "a live JSON snapshot of platform data. Answer concisely using ONLY that "
    "data, suggest one concrete next action, and remind that cooperatives/"
    "federations make final decisions — you only advise. Never invent numbers."
)


def _config(key, default=""):
    try:
        value = current_app.config.get(key, default)
    except RuntimeError:
        value = default
    return value or os.getenv(key, default)


def opencode_configured():
    return bool((_config("OPENCODE_ZEN_API_KEY") or "").strip())


def ask_opencode(question, snapshot, timeout=25):
    api_key = (_config("OPENCODE_ZEN_API_KEY") or "").strip()
    if not api_key:
        raise ValueError("OPENCODE_ZEN_API_KEY is not configured")
    model = (_config("OPENCODE_ZEN_MODEL", "big-pickle") or "big-pickle").strip()
    base_url = (_config("OPENCODE_ZEN_URL", ZEN_URL) or ZEN_URL).strip().rstrip("/")

    import json as _json
    response = requests.post(
        base_url,
        timeout=timeout,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Live data:\n{_json.dumps(snapshot)}\n\nQuestion: {question}"},
            ],
            "max_tokens": 400,
        },
    )
    response.raise_for_status()
    payload = response.json()
    try:
        return payload["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, AttributeError):
        raise ValueError("Unexpected model response shape")
