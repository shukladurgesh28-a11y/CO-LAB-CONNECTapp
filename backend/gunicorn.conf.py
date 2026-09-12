"""Gunicorn configuration for CO-LAB CONNECT (Flask).

Tuned for a ~512 MB single-instance free tier (Render free web service).
Override anything via environment variables when scaling up.
"""
import os

# Render injects PORT automatically; default to 8000 for local testing.
bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"

# Free tier: keep the worker count conservative (no threads -> ~50MB/worker).
# Raise WEB_CONCURRENCY when you upgrade past free.
workers = int(os.getenv("WEB_CONCURRENCY", "2"))
worker_class = "sync"

# Requests can legitimately run for a while (OTP emails, notifications).
timeout = int(os.getenv("GUNICORN_TIMEOUT", "60"))
graceful_timeout = 30
keepalive = 5

# Straight to stdout so Render/Vercel logging picks it up.
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")

# preload_app=True would eagerly import create_app(); keep lazy so a broken
# .env surfaces as a clean startup error instead of a cryptic master crash.
preload_app = False

# Flask config is loaded from .env inside config.py; gunicorn does not need it.