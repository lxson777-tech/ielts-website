#!/usr/bin/env python3
r"""
Shared job store for the social marketing agents.

One job = one short-form video from idea to published post. Jobs live as JSON
under marketing/queue/ and move through a linear status pipeline:

    planned -> rendered -> staged -> published
                                 \-> failed

    planned    social_agent.py wrote the script/caption/hashtags
    rendered   social_render.py produced a video file
    staged     social_publish.py pushed it to the platform in a NON-PUBLIC
               state (TikTok SELF_ONLY draft, IG container not yet published)
    published  a human approved it and it went live

Nothing in this package moves a job to `published` on its own — that
transition only happens via `social_publish.py --approve <id>`, run by a
human. See workflows/social_marketing.md.
"""

import datetime
import json
import re
from pathlib import Path

from utils import ROOT

QUEUE_DIR = ROOT / "marketing" / "queue"

STATUSES = ("planned", "rendered", "staged", "published", "failed")

# Formats the content agent can produce. Keep in sync with the format guidance
# in social_agent.py's system prompt.
FORMATS = ("tip", "mistake", "structure")


def _now() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return re.sub(r"-{2,}", "-", slug)[:60]


def new_job(topic: str, fmt: str, source_lesson: str | None = None) -> dict:
    """Build an empty job dict. Not persisted until save_job()."""
    today = datetime.date.today().isoformat()
    return {
        "id": f"{today}-{slugify(topic)}",
        "created": _now(),
        "status": "planned",
        "format": fmt,
        "topic": topic,
        "source_lesson": source_lesson,
        # Filled by social_agent.py
        "script": {},
        "video_prompt": "",
        "caption": {},
        "hashtags": [],
        # Filled by social_render.py
        "assets": {"video_path": None, "video_url": None, "duration_s": None},
        # Filled by social_publish.py — per-platform remote IDs and state
        "platforms": {},
        "history": [],
    }


def log(job: dict, message: str) -> None:
    """Append a timestamped line to the job's audit trail."""
    job.setdefault("history", []).append({"at": _now(), "message": message})


def set_status(job: dict, status: str, message: str | None = None) -> None:
    if status not in STATUSES:
        raise ValueError(f"Unknown status '{status}' (expected one of {STATUSES})")
    prev = job.get("status")
    job["status"] = status
    log(job, message or f"status: {prev} -> {status}")


def job_path(job_id: str) -> Path:
    return QUEUE_DIR / f"{job_id}.json"


def save_job(job: dict) -> Path:
    QUEUE_DIR.mkdir(parents=True, exist_ok=True)
    path = job_path(job["id"])
    path.write_text(json.dumps(job, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return path


def load_job(job_id: str) -> dict:
    path = job_path(job_id)
    if not path.exists():
        raise FileNotFoundError(f"No job '{job_id}' in {QUEUE_DIR}")
    return json.loads(path.read_text(encoding="utf-8"))


def list_jobs(status: str | None = None) -> list[dict]:
    """All jobs, newest first, optionally filtered by status."""
    if not QUEUE_DIR.exists():
        return []
    jobs = []
    for path in QUEUE_DIR.glob("*.json"):
        try:
            job = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            print(f"Skipping malformed job file: {path.name}")
            continue
        if status is None or job.get("status") == status:
            jobs.append(job)
    return sorted(jobs, key=lambda j: j.get("created", ""), reverse=True)


def recent_topics(limit: int = 30) -> list[str]:
    """Topics already used, so the content agent doesn't repeat itself."""
    return [j.get("topic", "") for j in list_jobs()[:limit]]


def unique_id(job: dict) -> dict:
    """Ensure job['id'] doesn't collide with an existing file; suffix if it does."""
    base = job["id"]
    n = 2
    while job_path(job["id"]).exists():
        job["id"] = f"{base}-{n}"
        n += 1
    return job
