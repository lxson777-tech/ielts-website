"""V5: the SERVER refuses paid material and paid AI for a free account, and
opens lessons (bodies, quizzes, examples) for it (stand-in 8841: the REAL
content-gate, Mr EZ, essay, speaking and live Workers with SIMULATED replies,
the real migrations in PGlite). Signed-out, free, paid (SIMULATED purchase).

  python v5_server.py <out-dir>
"""
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).parent))
from vhelpers import GATED, STAMP, STANDIN, Run, post_json, settle, sign_up, token_of  # noqa: E402

R = Run(sys.argv[1])
ORIGIN = GATED.rsplit("/", 1)[0]


def get(path, token=None):
    req = urllib.request.Request(STANDIN + path, headers={"Origin": ORIGIN, **({"Authorization": "Bearer " + token} if token else {})})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, r.read()[:200].decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        try:
            return e.code, json.loads(body).get("code")
        except Exception:  # noqa: BLE001
            return e.code, body[:120]


def account(browser, kind):
    ctx = browser.new_context()
    page = ctx.new_page()
    email = f"v5-{kind}-{STAMP}@example.test"
    sign_up(page, email)
    page.wait_for_url("**/dashboard**", timeout=40000)
    settle(page)
    tok = token_of(page)
    if kind == "paid":
        _, order = post_json(STANDIN + "/payments/checkout", {"planId": "month-1"}, tok)
        post_json(f"{STANDIN}/__pay/{order['orderId']}/pay")
    ctx.close()
    return tok


ESSAY = {"prompt": {"task": "task2", "promptHtml": "<p>Some people think cities should ban cars from their centres. Discuss.</p>", "minWords": 250},
         "essay": " ".join(["Cities are crowded and cars make the air dirty, so many people believe that banning them from central areas would improve life."] * 4)}


def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        toks = {"signed-out": None, "free": account(b, "free"), "paid": account(b, "paid")}
        b.close()
    content = [("lesson/reading-tfng?locale=en", "lesson"), ("lesson/reading-tfng?locale=ru", "lesson"), ("practice/practice-reading-tfng", "lesson"),
               ("example/writing-opinion", "lesson"), ("test/reading-full-001", "paid"), ("test/listening-full-001", "paid"),
               ("prompt/pte-wt-103-task2", "paid"), ("model/pte-wt-103-task2", "paid"), ("pack/cue-cards", "paid"), ("pack/band-guides", "paid"),
               ("pack/focused-exercises", "paid")]
    for who, tok in toks.items():
        for path, kind in content:
            status, code = get("/content/" + path, tok)
            if who == "signed-out":
                ok, want = status == 401, "401 sign-in-required"
            elif kind == "lesson" or who == "paid":
                ok, want = status == 200, "200"
            else:
                ok, want = status == 402 and code == "paid-required", "402 paid-required"
            R.check("content-gate", f"{who}: GET /content/{path} -> {want}", ok, f"{status} {code}")
    for who, tok in toks.items():
        status, body = post_json(STANDIN + "/grade-essay", ESSAY, tok, origin=ORIGIN)
        code = body.get("code") if isinstance(body, dict) else body
        want = {"signed-out": (401,), "free": (402,), "paid": (200,)}[who]
        extra = "" if who != "free" else (code == "paid-required")
        R.check("ai-workers", f"{who}: essay grader -> {want[0]}{' paid-required' if who == 'free' else ''} (SIMULATED grade)", status in want and (who != "free" or code == "paid-required"), f"{status} {str(body)[:160]}")
    # Speaking, live, tutor: a free account is refused before any provider call.
    import base64, io, wave
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(16000); w.writeframes(bytes(32000))
    wav = base64.b64encode(buf.getvalue()).decode()
    speaking = {"kind": "part1", "part1": {"topic": "Hometown", "answers": [{"question": "Where are you from?", "audioBase64": wav, "mimeType": "audio/wav"}]}}
    live = {"sdp": "v=0" + chr(13) + chr(10) + "s=-" + chr(13) + chr(10), "plan": {"mode": "part2", "cueCardId": "p2-journey"}}
    for path, payload in (("/grade-speaking", speaking), ("/live", live),
                          ("/tutor", {"task": "chat", "message": "Hello", "locale": "en"})):
        status, body = post_json(STANDIN + path, payload, toks["free"], origin=ORIGIN)
        code = body.get("code") if isinstance(body, dict) else body
        R.check("ai-workers", f"free: POST {path} refused with 402 paid-required", status == 402 and code == "paid-required", f"{status} {str(body)[:200]}")
    # The retired trial cannot be started.
    status, body = post_json(STANDIN + "/rest/v1/rpc/trial_start", {}, toks["free"], origin=ORIGIN)
    R.check("trial-retired", "free: trial_start is refused (trial retired)", not (status == 200 and isinstance(body, dict) and body.get("ok") is True), f"{status} {str(body)[:200]}")
    R.save()


if __name__ == "__main__":
    main()
