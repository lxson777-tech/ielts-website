"""Shared helpers for the full click test (2 October 2026).

Against Alex's review servers: the gated build on 4441 (stand-in 8841,
SIMULATED payments and AI) and the open build on 4442 (stand-in 8842).
Synthetic @example.test accounts only. Nothing here deletes anything, stops a
server or calls a paid service.
"""
import os
import re
import sys
import urllib.parse
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / "free-account-2026-10-01" / "verification" / "scripts"))
from vhelpers import (GATED, OPEN, PASSWORD, STAMP, STANDIN, fill_profile, post_json, settle,  # noqa: E402,F401
                      sign_in, sign_up)

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
DIST = Path(os.environ.get("CT_DIST", r"C:/Users/Alex/AppData/Local/Temp/claude/C--Users-Alex-Desktop-Projects-IELTS-website--claude-worktrees-musing-mcclintock-862665/7ea06528-23bb-4dbf-be18-8c70267e53bf/scratchpad/review/dist-trial-free5"))
OPEN_DIST = Path(os.environ.get("CT_OPEN_DIST", r"C:/Users/Alex/AppData/Local/Temp/claude/C--Users-Alex-Desktop-Projects-IELTS-website--claude-worktrees-musing-mcclintock-862665/7ea06528-23bb-4dbf-be18-8c70267e53bf/scratchpad/review/dist-open-free3"))
BASE_PATH = "/ielts-website"

# Words that mean a screen failed rather than showed its content.
BROKEN_TEXT = re.compile(r"Something went wrong|could not load|couldn't load|failed to load|Не удалось загрузить|Что-то пошло не так|\bundefined\b|\bNaN\b|\[object Object\]|\{\{|\{(?:count|band|skill|time|n|title|name|minutes|date|email)\}", re.I)


def routes(dist: Path) -> list[str]:
    """Every page in a build, as a route ('' is the front page)."""
    out = []
    for f in sorted(dist.rglob("*.html")):
        rel = f.relative_to(dist).as_posix()[:-5]
        if rel == "404":
            continue
        rel = re.sub(r"(^|/)index$", "", rel)
        out.append("/" + rel if rel else "/")
    return out


def exists(dist: Path, route: str) -> bool:
    """Whether an internal address resolves to a page or a file in the build."""
    path = urllib.parse.unquote(route.split("#")[0].split("?")[0])
    if path.startswith(BASE_PATH):
        path = path[len(BASE_PATH):]
    path = path.strip("/")
    if not path:
        return (dist / "index.html").exists()
    return any(p.exists() for p in (dist / path, dist / f"{path}.html", dist / path / "index.html"))


def new_ctx(browser, lang="en", w=1440, h=900):
    phone = w < 720
    ctx = browser.new_context(viewport={"width": w, "height": h}, locale="ru-RU" if lang == "ru" else "en-GB",
                              device_scale_factor=1, is_mobile=phone, has_touch=phone)
    ctx.add_init_script(f"try{{ localStorage.setItem('ielts.locale.v1','{lang}') }}catch(e){{}}")
    for origin in ("http://localhost:4441", "http://localhost:4442"):
        try:
            ctx.grant_permissions(["microphone"], origin=origin)
        except Exception:  # noqa: BLE001
            pass
    return ctx


def account(page, tier: str, tag: str) -> str | None:
    """Make the page's browser into one kind of student. Returns the email."""
    if tier in ("visitor", "open-visitor"):
        return None
    if tier == "admin":
        email = "admin@example.test"
        page.goto(GATED + "/sign-up?next=%2Fdashboard", wait_until="domcontentloaded")
        page.wait_for_selector("#signup-email", timeout=40000)
        settle(page)
        page.locator("#signup-email").fill(email)
        page.locator("#signup-password").fill(PASSWORD)
        if page.locator("#signup-confirm").count():
            page.locator("#signup-confirm").fill(PASSWORD)
        if page.locator("#signup-consent").count():
            page.locator("#signup-consent").check(force=True)
        page.locator("button.auth-button[type=submit]").click()
        try:
            page.wait_for_function("() => !location.pathname.endsWith('/sign-up')", timeout=12000)
        except Exception:  # noqa: BLE001
            sign_in(page, email, "/dashboard")
        if "/profile" in page.url:
            fill_profile(page)
        page.wait_for_url("**/dashboard**", timeout=40000)
    else:
        email = f"ct-{tag}-{STAMP}@example.test"
        sign_up(page, email, "/dashboard")
        page.wait_for_url("**/dashboard**", timeout=40000)
    if tier in ("paid", "admin"):
        status, body = post_json(STANDIN + "/__access/complimentary", {"email": email, "action": "give"})
        assert status == 200, (status, body)
    return email


def watch(page, sink: list, base: str):
    """Collect uncaught errors, console errors and failed requests into `sink`."""
    def on_console(m):
        if m.type == "error":
            sink.append({"kind": "console", "text": m.text[:300], "url": page.url})

    def on_response(r):
        if r.status >= 400 and not r.url.startswith("data:"):
            sink.append({"kind": "http", "status": r.status, "text": r.request.method + " " + r.url[:200], "url": page.url})

    def on_failed(req):
        failure = req.failure or ""
        if "ERR_ABORTED" in failure:  # a navigation that replaced the page, not a fault
            return
        sink.append({"kind": "request-failed", "text": f"{req.method} {req.url[:200]} ({failure})", "url": page.url})

    page.on("pageerror", lambda e: sink.append({"kind": "pageerror", "text": str(e)[:400], "url": page.url}))
    page.on("console", on_console)
    page.on("response", on_response)
    page.on("requestfailed", on_failed)


def ready(page, extra_ms=1200):
    settle(page)
    page.wait_for_timeout(extra_ms)
