"""Capture the sales page's platform screenshots from the real platform.

The sales website (SalesDemo.astro and the front page's browser window in
NextChapter.astro) shows three screens. They used to be captures of an older
design; since 1 October 2026 this script retakes them from the current
platform, so they can be refreshed whenever the platform changes.

Runs against the LOCAL gated build and its free stand-in (no real accounts,
no payments, no AI calls):
  node tools/mr-ez-dev-server.mjs --trial            (stand-in on 8841)
  PUBLIC_ACCESS_MODE=trial ... npx astro build --outDir <dir>
  npx astro preview --outDir <dir> --port 4441
  python tools/capture-sales-screens.py

It signs up a synthetic @example.test student, gives it complimentary access
through the stand-in's helper (so every screen is open), and writes:
  public/pics/next-chapter/platform-learn.jpg            lesson library
  public/pics/next-chapter/platform-speaking-inside.png  Part 2 session with the prep timer
  public/pics/next-chapter/platform-speaking-coach.png   the Speaking coach panel
Every image is taken at twice the screen's resolution so it stays sharp.
"""
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

SITE = os.environ.get("GATED_BASE", "http://localhost:4441/ielts-website")
STANDIN = os.environ.get("GATED_STANDIN", "http://127.0.0.1:8841")
OUT = Path(__file__).resolve().parents[1] / "public" / "pics" / "next-chapter"
PASSWORD = "Synthetic-Capture-1"
HYDRATED = "() => [...document.querySelectorAll('astro-island[ssr]')].every(el => ['visible', 'media'].includes(el.getAttribute('client')))"


def settle(page):
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_function(HYDRATED, timeout=45000)
    page.wait_for_timeout(1200)


def give_access(email):
    req = urllib.request.Request(STANDIN + "/__access/complimentary", data=json.dumps({"email": email, "action": "give"}).encode(),
                                 method="POST", headers={"Content-Type": "application/json", "Origin": SITE.rsplit("/", 1)[0]})
    with urllib.request.urlopen(req) as r:
        assert r.status == 200, r.status


def sign_up(page, email):
    page.goto(SITE + "/sign-up?next=" + urllib.parse.quote("/dashboard", safe=""), wait_until="domcontentloaded")
    page.wait_for_selector("#signup-email", timeout=40000)
    settle(page)
    page.locator("#signup-email").fill(email)
    page.locator("#signup-password").fill(PASSWORD)
    if page.locator("#signup-confirm").count():
        page.locator("#signup-confirm").fill(PASSWORD)
    page.locator("button.auth-button[type=submit]").click()
    # A made-up student: only the initials show, in the header's account button.
    page.wait_for_selector("#profile-firstName", timeout=40000)
    page.locator("#profile-firstName").fill("Aigerim")
    page.locator("#profile-lastName").fill("Karimova")
    page.locator("#profile-dob-day").select_option("4")
    page.locator("#profile-dob-month").select_option("3")
    page.locator("#profile-dob-year").select_option("2005")
    page.locator("#profile-phone").fill("+7 701 234 56 78")
    page.locator("#profile-city").fill("Almaty")
    page.locator("#profile-occupation").fill("University student")
    page.locator("#profile-source-friend").check(force=True)
    page.locator("button.auth-button[type=submit]").click()
    page.wait_for_url("**/dashboard**", timeout=40000)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"])
        ctx = browser.new_context(viewport={"width": 1264, "height": 760}, device_scale_factor=2, locale="en-GB")
        ctx.add_init_script("try{ localStorage.setItem('ielts.locale.v1','en') }catch(e){}")
        ctx.grant_permissions(["microphone"], origin=SITE.split("/ielts-website")[0])
        page = ctx.new_page()
        email = f"capture-{int(time.time())}@example.test"
        sign_up(page, email)
        give_access(email)

        # 1. The lesson library, as a student sees it.
        page.goto(SITE + "/learn", wait_until="domcontentloaded")
        settle(page)
        page.wait_for_selector("text=Reading Overview", timeout=30000)
        page.mouse.move(5, 740)
        page.wait_for_timeout(800)
        page.screenshot(path=str(OUT / "platform-learn.jpg"), type="jpeg", quality=88)

        # 2. A Part 2 session: cue card, prep timer running, and the coach beside it.
        page.set_viewport_size({"width": 1264, "height": 900})
        page.goto(SITE + "/trainers/speaking", wait_until="domcontentloaded")
        settle(page)
        page.get_by_role("button", name="Start Part 2").click()
        page.wait_for_selector("text=Speaking coach", timeout=20000)
        page.get_by_role("button", name="Start prep time").click()
        # The notes box stays empty: the cue card is picked at random, so typed notes could not match it.
        page.wait_for_timeout(5500)
        page.mouse.move(5, 5)
        page.evaluate("document.activeElement && document.activeElement.blur()")
        grid = page.locator("div.screen-in").first
        grid.scroll_into_view_if_needed()
        page.wait_for_timeout(500)
        grid.screenshot(path=str(OUT / "platform-speaking-inside.png"))

        # 3. The coach panel on its own, on its Phrases tab (the session above already shows Plan).
        coach = page.locator("div.screen-in > div.lg\\:sticky").first
        coach.get_by_text("Phrases", exact=True).click()
        page.wait_for_timeout(600)
        coach.screenshot(path=str(OUT / "platform-speaking-coach.png"))
        browser.close()
    for name in ("platform-learn.jpg", "platform-speaking-inside.png", "platform-speaking-coach.png"):
        print(name, (OUT / name).stat().st_size // 1024, "KB")


if __name__ == "__main__":
    sys.exit(main())
