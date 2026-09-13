#!/usr/bin/env python3
r"""
Turns a planned job into a rendered video asset.

WHY THIS HAS PROVIDERS
----------------------
Higgsfield is reachable two different ways, and they are NOT interchangeable:

  mcp   The Higgsfield MCP connector, which lives in a Claude session. A cron
        job cannot call it — MCP connectors are client-side. This provider
        therefore does not generate anything itself: it writes a render
        request to marketing/render-requests/ for a Claude session (or a
        scheduled cloud agent) to execute, then ingests the resulting video
        URL back into the job via --ingest-url.

  api   Higgsfield's first-party REST API, which a cron job CAN call. This is
        the only provider that makes the pipeline fully unattended. It needs
        HIGGSFIELD_API_KEY and HIGGSFIELD_API_URL in .env.
        *** The request/response shape below is NOT verified. *** It is
        deliberately isolated in _render_via_api() so exactly one function
        needs correcting against the real docs. Do not spread guesses.

Usage:
    python tools/social_render.py --job <id>                  # default: mcp
    python tools/social_render.py --job <id> --provider api
    python tools/social_render.py --job <id> --ingest-url <mp4-url>
    python tools/social_render.py --list
"""

import argparse
import json
import sys
import time
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import social_queue as q
from utils import ROOT, require_env

ASSETS_DIR = ROOT / "marketing" / "assets"
REQUESTS_DIR = ROOT / "marketing" / "render-requests"

# Platform ceilings. Instagram's Reels API is the binding constraint: the
# native app allows 3 min but the Graph API still caps at 90s.
MAX_DURATION_S = 90
TARGET_DURATION_S = 25
ASPECT_RATIO = "9:16"


def build_render_request(job: dict) -> dict:
    """The provider-neutral description of what needs rendering."""
    return {
        "job_id": job["id"],
        "prompt": job["video_prompt"],
        "aspect_ratio": ASPECT_RATIO,
        "duration_s": TARGET_DURATION_S,
        # posix separators: these files are read on Linux CI too
        "output": (ASSETS_DIR / f"{job['id']}.mp4").relative_to(ROOT).as_posix(),
        # Carried along so whoever renders can burn in on-screen text.
        "on_screen_text": [b["on_screen"] for b in job.get("script", {}).get("beats", [])],
        "hook": job.get("script", {}).get("hook", ""),
    }


def _render_via_mcp(job: dict) -> None:
    """Emit a request for a Claude session with the Higgsfield connector."""
    REQUESTS_DIR.mkdir(parents=True, exist_ok=True)
    req = build_render_request(job)
    path = REQUESTS_DIR / f"{job['id']}.json"
    path.write_text(json.dumps(req, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    q.log(job, f"render request written to {path.relative_to(ROOT)} (provider=mcp)")
    q.save_job(job)

    print(f"Render request written: {path.relative_to(ROOT)}")
    print("\nThis provider cannot generate video on its own — MCP connectors")
    print("are client-side. In a Claude session with the Higgsfield connector:")
    print(f"\n  1. Read {path.relative_to(ROOT)}")
    print("  2. Call generate_video with that prompt (9:16 vertical)")
    print("  3. Poll job_status until it completes")
    print(f"  4. python tools/social_render.py --job {job['id']} --ingest-url <url>")


def _render_via_api(job: dict) -> str:
    """Call Higgsfield's REST API directly. Returns the finished video URL.

    UNVERIFIED SHAPE — see module docstring. Correct this one function against
    the real docs; everything else in the pipeline is provider-agnostic.
    """
    env = require_env("HIGGSFIELD_API_KEY", "HIGGSFIELD_API_URL")
    base = env["HIGGSFIELD_API_URL"].rstrip("/")
    headers = {
        "Authorization": f"Bearer {env['HIGGSFIELD_API_KEY']}",
        "Content-Type": "application/json",
    }
    payload = {
        "prompt": job["video_prompt"],
        "aspect_ratio": ASPECT_RATIO,
        "duration": TARGET_DURATION_S,
    }

    req = urllib.request.Request(
        f"{base}/generate", data=json.dumps(payload).encode(), headers=headers, method="POST"
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        created = json.loads(resp.read())

    gen_id = created.get("generation_id") or created.get("id")
    if not gen_id:
        raise RuntimeError(f"No generation id in response: {created}")

    print(f"Generation queued: {gen_id}")
    deadline = time.time() + 900  # video gen is slow; 15 min ceiling
    while time.time() < deadline:
        time.sleep(15)
        status_req = urllib.request.Request(f"{base}/status/{gen_id}", headers=headers)
        with urllib.request.urlopen(status_req, timeout=30) as resp:
            state = json.loads(resp.read())
        status = (state.get("status") or "").lower()
        print(f"  {status}")
        if status in ("completed", "succeeded", "success"):
            url = state.get("video_url") or state.get("output", {}).get("url")
            if not url:
                raise RuntimeError(f"Completed but no video URL: {state}")
            return url
        if status in ("failed", "error"):
            raise RuntimeError(f"Generation failed: {state}")

    raise TimeoutError(f"Generation {gen_id} did not finish within 15 minutes")


def download(url: str, job_id: str) -> Path:
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    dest = ASSETS_DIR / f"{job_id}.mp4"
    print(f"Downloading -> {dest.relative_to(ROOT)}")
    urllib.request.urlretrieve(url, dest)
    size = dest.stat().st_size
    if size < 10_000:
        raise RuntimeError(f"Downloaded file is only {size} bytes — not a real video")
    print(f"Downloaded {size / 1_000_000:.1f} MB")
    return dest


def fail(job: dict, message: str) -> None:
    """Mark the job failed and exit non-zero, so an unattended run leaves a
    diagnosable job file behind instead of a stack trace and a stuck status."""
    q.set_status(job, "failed", message)
    q.save_job(job)
    print(f"FAILED: {message}")
    print(f"Job {job['id']} marked failed. Fix the cause, reset status to "
          f"'planned' in the job file, and re-run.")
    sys.exit(1)


def record_asset(job: dict, url: str, path: Path | None) -> None:
    job["assets"]["video_url"] = url
    if path is not None:
        job["assets"]["video_path"] = path.relative_to(ROOT).as_posix()
    q.set_status(job, "rendered", f"rendered: {url}")
    q.save_job(job)
    print(f"\nJob {job['id']} -> rendered")
    print(f"Next: python tools/social_publish.py --job {job['id']}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--job", help="Job id to render")
    parser.add_argument("--provider", choices=("mcp", "api"), default="mcp")
    parser.add_argument("--ingest-url", help="Attach an already-generated video URL to the job")
    parser.add_argument("--list", action="store_true", help="List jobs awaiting render")
    args = parser.parse_args()

    if args.list:
        jobs = q.list_jobs("planned")
        if not jobs:
            print("No jobs awaiting render.")
            return
        for job in jobs:
            print(f"  {job['id']}  [{job['format']}]  {job['topic']}")
        return

    if not args.job:
        parser.error("--job is required (or use --list)")

    job = q.load_job(args.job)

    if args.ingest_url:
        try:
            path = download(args.ingest_url, job["id"])
        except Exception as e:
            fail(job, f"download failed: {e}")
        record_asset(job, args.ingest_url, path)
        return

    if job["status"] != "planned":
        print(f"Job {job['id']} is '{job['status']}', not 'planned'. Refusing to re-render.")
        print("Use --ingest-url to attach a video, or edit the job file to reset.")
        sys.exit(1)

    if not job.get("video_prompt"):
        print(f"Job {job['id']} has no video_prompt — was it planned by social_agent.py?")
        sys.exit(1)

    if args.provider == "mcp":
        _render_via_mcp(job)
    else:
        try:
            url = _render_via_api(job)
            path = download(url, job["id"])
        except SystemExit:
            raise
        except Exception as e:
            fail(job, f"{type(e).__name__}: {e}")
        record_asset(job, url, path)


if __name__ == "__main__":
    main()
