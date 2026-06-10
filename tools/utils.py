import os
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")


def require_env(*keys):
    missing = [k for k in keys if not os.getenv(k)]
    if missing:
        print(f"Missing required env vars: {', '.join(missing)}")
        print("Add them to .env and try again.")
        sys.exit(1)
    return {k: os.getenv(k) for k in keys}


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
