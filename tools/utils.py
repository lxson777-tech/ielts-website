import os
import shutil
import subprocess
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

ROOT = Path(__file__).parent.parent


def require_env(*keys):
    missing = [k for k in keys if not os.getenv(k)]
    if missing:
        print(f"Missing required env vars: {', '.join(missing)}")
        print("Add them to .env and try again.")
        sys.exit(1)
    return {k: os.getenv(k) for k in keys}


def require_cli(*names):
    missing = [n for n in names if shutil.which(n) is None]
    if missing:
        print(f"Missing required CLI tool(s): {', '.join(missing)}")
        print("Install and authenticate them, then try again.")
        sys.exit(1)


# PR base for the marketing agents. rebuild/astro isn't merged to main yet,
# so PRs target it directly to avoid dragging in unrelated unmerged commits.
# Switch this to "main" once rebuild/astro merges.
MARKETING_PR_BASE = "rebuild/astro"


def open_marketing_pr(branch, files, title, body, labels=("marketing-agent", "needs-human-review"), base=MARKETING_PR_BASE):
    """Commit `files` (repo-relative paths) on a new branch and open a draft PR.

    Structural draft-only guarantee: this is the only function that touches
    git history, and it only ever opens a PR — never pushes to / merges into
    main. Returns the PR URL, or None if there was nothing to commit.
    """
    require_cli("git", "gh")
    existing = [f for f in files if (ROOT / f).exists()]
    if not existing:
        print("Nothing to commit — skipping PR.")
        return None

    orig_branch = subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"],
        cwd=ROOT, capture_output=True, text=True, check=True,
    ).stdout.strip()

    try:
        subprocess.run(["git", "checkout", "-b", branch], cwd=ROOT, check=True)
        subprocess.run(["git", "add", *existing], cwd=ROOT, check=True)

        staged = subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=ROOT)
        if staged.returncode == 0:
            print("No changes to commit — skipping PR.")
            return None

        subprocess.run(["git", "commit", "-m", title], cwd=ROOT, check=True)
        subprocess.run(["git", "push", "-u", "origin", branch], cwd=ROOT, check=True)

        result = subprocess.run(
            [
                "gh", "pr", "create", "--draft",
                "--base", base,
                "--title", title,
                "--body", body,
                "--label", ",".join(labels),
            ],
            cwd=ROOT, capture_output=True, text=True, check=True,
        )
        return result.stdout.strip()
    finally:
        subprocess.run(["git", "checkout", orig_branch], cwd=ROOT, check=False)


def tmp_path(filename):
    path = Path(__file__).parent.parent / ".tmp" / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def get_google_service(api, version):
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build

    SCOPES = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/presentations",
    ]

    root = Path(__file__).parent.parent
    token_file = root / "token.json"
    creds_file = root / "credentials.json"

    creds = None
    if token_file.exists():
        creds = Credentials.from_authorized_user_file(token_file, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(creds_file), SCOPES)
            creds = flow.run_local_server(port=0)
        token_file.write_text(creds.to_json())

    return build(api, version, credentials=creds)
