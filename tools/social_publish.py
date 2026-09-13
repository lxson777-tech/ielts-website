#!/usr/bin/env python3
r"""
Stages a rendered job on Instagram and TikTok, and — only on explicit human
approval — publishes it.

THE SAFETY MODEL
----------------
This mirrors the draft-PR guarantee in tools/blog_agent.py. Two separate
commands exist, and the autonomous one cannot go public:

  --stage    Uploads the video in a NON-PUBLIC state on both platforms:
               Instagram: creates a media *container*. A container is inert —
                          it is not visible to anyone until /media_publish is
                          called against it. Containers expire after 24h.
               TikTok:    uploads with SELF_ONLY privacy. TikTok *forces* this
                          for un-audited apps, so this is belt-and-braces:
                          even a bug cannot make it public.
             This is the only command a cron job should ever run.

  --approve  Publishes an already-staged job. Requires a human to run it with
             an explicit job id. This is the ONLY path to a public post.

Platform constraints encoded here (verified July 2026):
  - IG Reels via Graph API cap at 90s, even though the app allows 3 min.
  - IG allows 100 API-published posts per rolling 24h.
  - IG requires a PUBLIC video_url it can fetch — it does not accept uploads.
  - TikTok rate-limits each access token to 6 requests/minute.
  - TikTok public direct-posting requires passing their audit (2-4 weeks).

Usage:
    python tools/social_publish.py --job <id> --stage
    python tools/social_publish.py --job <id> --approve
    python tools/social_publish.py --list
    python tools/social_publish.py --job <id> --preview
"""

import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import social_queue as q  # noqa: E402  (needs sys.path above)

GRAPH_API = "https://graph.facebook.com/v21.0"
TIKTOK_API = "https://open.tiktokapis.com/v2"

IG_MAX_DURATION_S = 90


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------

def need_env(*keys) -> dict:
    """Like utils.require_env, but raises instead of exiting.

    stage() runs each platform in its own try block so one platform's missing
    credentials don't abort the other. require_env() calls sys.exit(), which
    would blow past that isolation, so config errors are raised here instead.
    """
    missing = [k for k in keys if not os.getenv(k)]
    if missing:
        raise RuntimeError(f"missing env vars: {', '.join(missing)}")
    return {k: os.getenv(k) for k in keys}


def _post(url: str, payload: dict, headers: dict | None = None) -> dict:
    data = json.dumps(payload).encode()
    hdrs = {"Content-Type": "application/json", **(headers or {})}
    req = urllib.request.Request(url, data=data, headers=hdrs, method="POST")
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())


def _post_form(url: str, params: dict) -> dict:
    data = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(url, data=data, method="POST")
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())


def _get(url: str, headers: dict | None = None) -> dict:
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def full_caption(job: dict, platform: str) -> str:
    """Caption plus hashtags, assembled per platform."""
    body = job["caption"].get(platform, "")
    tags = " ".join(f"#{t}" for t in job.get("hashtags", []))
    return f"{body}\n\n{tags}".strip()


def require_video_url(job: dict) -> str:
    """Both platforms fetch the video from a public URL — neither accepts a
    local file from this script. Fail loudly rather than half-staging."""
    url = job.get("assets", {}).get("video_url")
    if not url:
        raise RuntimeError(
            "no assets.video_url — both platforms fetch the video from a public "
            "URL. Render first: python tools/social_render.py --job <id>"
        )
    if not url.startswith("https://"):
        raise RuntimeError(f"video_url must be public HTTPS, got: {url}")
    return url


# --------------------------------------------------------------------------
# Instagram
# --------------------------------------------------------------------------

def ig_stage(job: dict) -> dict:
    """Create an inert media container. Nothing is visible until ig_publish()."""
    env = need_env("IG_USER_ID", "IG_ACCESS_TOKEN")
    video_url = require_video_url(job)

    print("Instagram: creating media container...")
    result = _post_form(f"{GRAPH_API}/{env['IG_USER_ID']}/media", {
        "media_type": "REELS",
        "video_url": video_url,
        "caption": full_caption(job, "instagram"),
        "share_to_feed": "true",
        "access_token": env["IG_ACCESS_TOKEN"],
    })

    container_id = result.get("id")
    if not container_id:
        raise RuntimeError(f"No container id returned: {result}")

    # Container must reach FINISHED before it can be published. IG transcodes
    # asynchronously; publishing early returns a confusing generic error.
    print(f"Container {container_id} — waiting for transcode...")
    deadline = time.time() + 300
    status = "IN_PROGRESS"
    while time.time() < deadline:
        time.sleep(10)
        state = _get(
            f"{GRAPH_API}/{container_id}?fields=status_code,status"
            f"&access_token={env['IG_ACCESS_TOKEN']}"
        )
        status = state.get("status_code", "")
        print(f"  {status}")
        if status == "FINISHED":
            break
        if status == "ERROR":
            raise RuntimeError(f"IG transcode failed: {state.get('status')}")

    if status != "FINISHED":
        raise TimeoutError("IG container did not finish transcoding within 5 minutes")

    return {
        "container_id": container_id,
        "state": "staged",
        "note": "Container is inert. Nothing is public until --approve.",
        # Containers expire 24h after creation.
        "expires_in_h": 24,
    }


def ig_publish(job: dict) -> dict:
    env = need_env("IG_USER_ID", "IG_ACCESS_TOKEN")
    container_id = job["platforms"]["instagram"]["container_id"]

    print(f"Instagram: publishing container {container_id}...")
    result = _post_form(f"{GRAPH_API}/{env['IG_USER_ID']}/media_publish", {
        "creation_id": container_id,
        "access_token": env["IG_ACCESS_TOKEN"],
    })
    media_id = result.get("id")
    if not media_id:
        raise RuntimeError(f"Publish returned no media id: {result}")
    return {"media_id": media_id, "state": "published"}


# --------------------------------------------------------------------------
# TikTok
# --------------------------------------------------------------------------

def tiktok_stage(job: dict) -> dict:
    """Upload as SELF_ONLY. Un-audited apps are forced to this by TikTok."""
    env = need_env("TIKTOK_ACCESS_TOKEN")
    video_url = require_video_url(job)
    headers = {"Authorization": f"Bearer {env['TIKTOK_ACCESS_TOKEN']}"}

    print("TikTok: initiating SELF_ONLY upload...")
    result = _post(f"{TIKTOK_API}/post/publish/video/init/", {
        "post_info": {
            "title": full_caption(job, "tiktok")[:2200],
            # SELF_ONLY is mandatory pre-audit; we set it explicitly so this
            # stays private even if the app later gains publish scope.
            "privacy_level": "SELF_ONLY",
            "disable_comment": False,
            "disable_duet": False,
            "disable_stitch": False,
        },
        "source_info": {
            "source": "PULL_FROM_URL",
            "video_url": video_url,
        },
    }, headers)

    data = result.get("data", {})
    publish_id = data.get("publish_id")
    if not publish_id:
        raise RuntimeError(f"No publish_id returned: {result}")

    return {
        "publish_id": publish_id,
        "state": "staged",
        "privacy": "SELF_ONLY",
        "note": ("Visible only to the account owner. Making it public requires "
                 "either passing TikTok's Content Posting audit, or flipping "
                 "the post's privacy by hand in the TikTok app."),
    }


def tiktok_status(job: dict) -> dict:
    env = need_env("TIKTOK_ACCESS_TOKEN")
    publish_id = job["platforms"]["tiktok"]["publish_id"]
    return _post(
        f"{TIKTOK_API}/post/publish/status/fetch/",
        {"publish_id": publish_id},
        {"Authorization": f"Bearer {env['TIKTOK_ACCESS_TOKEN']}"},
    )


# --------------------------------------------------------------------------
# commands
# --------------------------------------------------------------------------

def preview(job: dict) -> None:
    """Show exactly what would be posted. Costs nothing, touches no API."""
    s = job.get("script", {})
    print(f"\n{'=' * 64}")
    print(f"  {job['id']}   [{job['format']}]   status={job['status']}")
    print(f"{'=' * 64}")
    print(f"\nTOPIC: {job['topic']}")
    print(f"SOURCE: {job.get('source_lesson')}\n")
    print(f"HOOK: {s.get('hook', '')}")
    for i, beat in enumerate(s.get("beats", []), 1):
        print(f"  {i}. [{beat['on_screen']}]  {beat['voiceover']}")
    print(f"CTA: {s.get('cta', '')}")
    print(f"\nVIDEO PROMPT:\n  {job.get('video_prompt', '')}")
    print(f"\n--- INSTAGRAM ---\n{full_caption(job, 'instagram')}")
    print(f"\n--- TIKTOK ---\n{full_caption(job, 'tiktok')}")
    video = job.get("assets", {}).get("video_url")
    print(f"\nVIDEO: {video or '(not rendered yet)'}\n")


def stage(job: dict, platforms: list[str]) -> None:
    if job["status"] not in ("rendered", "staged"):
        print(f"Job is '{job['status']}' — must be 'rendered' before staging.")
        sys.exit(1)

    job.setdefault("platforms", {})
    for platform in platforms:
        try:
            if platform == "instagram":
                job["platforms"]["instagram"] = ig_stage(job)
            elif platform == "tiktok":
                job["platforms"]["tiktok"] = tiktok_stage(job)
            q.log(job, f"{platform}: staged")
            print(f"  {platform}: staged OK")
        except (Exception, SystemExit) as e:
            # One platform failing must not lose the other's staging result.
            # SystemExit is caught deliberately: require_env() exits rather
            # than raising, and a missing TikTok token must not prevent
            # Instagram from staging — the two platforms come online weeks
            # apart (TikTok needs their audit).
            job["platforms"][platform] = {"state": "failed", "error": str(e) or type(e).__name__}
            q.log(job, f"{platform}: stage failed — {e}")
            print(f"  {platform}: FAILED — {e}")
        q.save_job(job)

    if any(p.get("state") == "staged" for p in job["platforms"].values()):
        q.set_status(job, "staged")
        q.save_job(job)
        print(f"\nJob {job['id']} -> staged. Nothing is public.")
        print(f"Review it, then: python tools/social_publish.py --job {job['id']} --approve")
    else:
        q.set_status(job, "failed", "all platforms failed to stage")
        q.save_job(job)
        sys.exit(1)


def approve(job: dict) -> None:
    """The only path to a public post. Human-run, by design."""
    if job["status"] != "staged":
        print(f"Job is '{job['status']}' — only 'staged' jobs can be approved.")
        sys.exit(1)

    preview(job)
    print("This will make the post PUBLIC on Instagram.")
    print("TikTok stays SELF_ONLY until their audit clears — flip it by hand in the app.")
    confirm = input(f"\nPublish '{job['id']}'? Type the job id to confirm: ").strip()
    if confirm != job["id"]:
        print("Aborted — no changes made.")
        sys.exit(1)

    ig = job.get("platforms", {}).get("instagram", {})
    if ig.get("state") == "staged":
        try:
            job["platforms"]["instagram"] = {**ig, **ig_publish(job)}
            q.log(job, "instagram: published")
            print("  instagram: PUBLISHED")
        except Exception as e:
            q.log(job, f"instagram: publish failed — {e}")
            print(f"  instagram: FAILED — {e}")
            q.save_job(job)
            sys.exit(1)
    else:
        print("  instagram: not staged, skipping")

    q.set_status(job, "published", "approved and published by human")
    q.save_job(job)
    print(f"\nJob {job['id']} -> published")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--job")
    parser.add_argument("--stage", action="store_true", help="Upload in a non-public state")
    parser.add_argument("--approve", action="store_true", help="Publish a staged job (human only)")
    parser.add_argument("--preview", action="store_true", help="Print what would be posted")
    parser.add_argument("--status", action="store_true", help="Query TikTok upload status")
    parser.add_argument("--platforms", default="instagram,tiktok")
    parser.add_argument("--list", action="store_true")
    args = parser.parse_args()

    if args.list:
        for status in ("rendered", "staged", "published", "failed"):
            jobs = q.list_jobs(status)
            if jobs:
                print(f"\n{status.upper()} ({len(jobs)})")
                for job in jobs:
                    print(f"  {job['id']}  {job['topic']}")
        return

    if not args.job:
        parser.error("--job is required (or use --list)")

    job = q.load_job(args.job)

    if args.preview:
        preview(job)
    elif args.status:
        print(json.dumps(tiktok_status(job), indent=2))
    elif args.stage:
        stage(job, [p.strip() for p in args.platforms.split(",") if p.strip()])
    elif args.approve:
        approve(job)
    else:
        parser.error("Pick one of --stage / --approve / --preview / --status")


if __name__ == "__main__":
    main()
