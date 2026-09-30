"""R06: React rendering mismatches (error 418) on startup and navigation.

Independent of the hydration session's own probe. For every combination of
  language   English, Russian (saved preference, set before the first load)
  screen     1440x900, 390x844
  account    signed out, trial, paid (SIMULATED purchase)
  mode       plain, and "stress" (each interactive part of the page is taken
             over by React after a random delay, so a browser store that
             answers quickly has nearly always answered first: this turns an
             intermittent startup race into one that shows on most visits)
it does three things and treats ANY uncaught page error as a failure:
  1. a fresh visit to each page, then a refresh of it;
  2. internal navigation by clicking the site's own navigation links (the
     client router swaps pages without a full load), then back and forward;
  3. from Today into a lesson by its own link, where the page offers one.

A page is judged only once React has taken over every part that loads on
arrival (no waiting `astro-island[ssr]` left, apart from parts that load only
when scrolled to), never after a fixed short sleep.

Needs the gated production build with SIMULATED payments (GATED_BASE,
GATED_STANDIN; default 4441 / 8841). Synthetic @example.test accounts only.
"""
import json
import os
import sys
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

GATED = os.environ.get("GATED_BASE", "http://localhost:4441/ielts-website")
STANDIN = os.environ.get("GATED_STANDIN", "http://127.0.0.1:8841")
OUT = Path(__file__).resolve().parents[1] / "evidence" / os.environ.get("R06_NAME", "r06-hydration")
OUT.mkdir(parents=True, exist_ok=True)
STAMP = str(int(time.time()))
PASSWORD = "Synthetic-Recheck-1"
STRESS_MS = int(os.environ.get("R06_STRESS_MS", "1200"))

LANGS = os.environ.get("R06_LANGS", "en,ru").split(",")
SIZES = [tuple(map(int, s.split("x"))) for s in os.environ.get("R06_SIZES", "1440x900,390x844").split(",")]
STATES = os.environ.get("R06_STATES", "signed-out,trial,paid").split(",")
MODES = os.environ.get("R06_MODES", "plain,stress").split(",")

# The pages the re-audit named (trial, plans, dashboard, a lesson, the paid
# trainers) and the ones around them.
PAGES = ["/trial", "/plans", "/dashboard", "/lessons/reading/paraphrase", "/trainers/writing", "/trainers/speaking",
         "/tests", "/trainers", "/account", "/start", "/learn", "/lessons/writing", "/privacy", "/support", "/help"]
NAV = ["/start", "/trainers", "/tests", "/review", "/dashboard"]

HYDRATION_WORDS = ("ydrat", "#418", "#423", "#425", "didn't match", "did not match")

visits = []
summary = []

STRESS_SCRIPT = """(() => { const MAX = %d; const def = customElements.define.bind(customElements);
  customElements.define = function (name, cls, opts) { if (name === 'astro-island') { const p = cls.prototype; const o = p.connectedCallback;
    p.connectedCallback = function () { const el = this; window.__probeDelayed = (window.__probeDelayed || 0) + 1; setTimeout(() => o.call(el), Math.random() * MAX); }; }
    return def(name, cls, opts); }; })();"""

HYDRATED = """() => [...document.querySelectorAll('astro-island[ssr]')].every(el => ['visible', 'media'].includes(el.getAttribute('client')))"""


def wait_hydrated(page):
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_function(HYDRATED, timeout=45000)
    # Let effects that run straight after the takeover (the real account and
    # language state being applied) finish: two animation frames and an idle turn.
    page.evaluate("() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 250))))")


def post_json(url, data=None, token=None):
    req = urllib.request.Request(
        url, data=json.dumps(data).encode() if data is not None else b"", method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json", "Origin": GATED.rsplit("/", 1)[0],
                 **({"Authorization": "Bearer " + token} if token else {})})
    with urllib.request.urlopen(req) as r:
        body = r.read()
        return r.status, (json.loads(body) if body else None)


def sign_up_and_start_trial(page, email):
    page.goto(GATED + "/sign-up?next=%2Ftrial", wait_until="domcontentloaded")
    page.wait_for_selector("#signup-email", timeout=40000)
    page.locator("#signup-email").fill(email)
    page.locator("#signup-password").fill(PASSWORD)
    if page.locator("#signup-confirm").count():
        page.locator("#signup-confirm").fill(PASSWORD)
    page.locator("button.auth-button[type=submit]").click()
    page.wait_for_selector("#profile-firstName", timeout=40000)
    page.locator("#profile-firstName").fill("Synthetic")
    page.locator("#profile-lastName").fill("Student")
    page.locator("#profile-dob-day").select_option("4")
    page.locator("#profile-dob-month").select_option("3")
    page.locator("#profile-dob-year").select_option("2000")
    page.locator("#profile-phone").fill("+7 701 234 56 78")
    page.locator("#profile-city").fill("Almaty")
    page.locator("#profile-occupation").fill("Synthetic University")
    page.locator("#profile-source-friend").check(force=True)
    page.locator("button.auth-button[type=submit]").click()
    page.wait_for_url("**/trial", timeout=40000)
    start = page.locator(".trial-join button.trial-primary")
    start.wait_for(state="visible", timeout=40000)
    start.click()
    page.wait_for_url("**/dashboard", timeout=40000)


def token_of(page):
    return page.evaluate(
        "() => { for (const k of Object.keys(localStorage)) { if (k.startsWith('sb-') && k.endsWith('-auth-token')) "
        "{ return JSON.parse(localStorage.getItem(k)).access_token } } return null }")


def record(tag, kind, path, errs, consoles):
    hyd = [c for c in consoles if any(w in c for w in HYDRATION_WORDS)]
    visits.append({**tag, "kind": kind, "path": path, "pageErrors": list(errs), "hydrationConsole": hyd})
    if errs or hyd:
        print("HIT", tag, kind, path, (errs or hyd)[0][:240].replace("\n", " "), flush=True)


def run(browser, lang, w, h, state, mode):
    tag = {"lang": lang, "size": f"{w}x{h}", "state": state, "mode": mode}
    phone = w < 720
    ctx = browser.new_context(viewport={"width": w, "height": h}, locale="ru-RU" if lang == "ru" else "en-GB",
                              device_scale_factor=2 if phone else 1, is_mobile=phone, has_touch=phone)
    # The saved language preference, in place before the first page loads.
    ctx.add_init_script(f"try{{ if (!localStorage.getItem('ielts.locale.v1')) localStorage.setItem('ielts.locale.v1','{lang}') }}catch(e){{}}")
    page = ctx.new_page()
    errs, consoles = [], []
    page.on("pageerror", lambda e: errs.append(str(e)[:600]))
    page.on("console", lambda m: consoles.append(m.text[:600]) if m.type == "error" else None)

    # Accounts are made without the stress delay (it is not what is under test).
    if state in ("trial", "paid"):
        sign_up_and_start_trial(page, f"r06-{state}-{lang}-{w}-{mode}-{STAMP}@example.test")
        if state == "paid":
            _, order = post_json(STANDIN + "/payments/checkout", {"planId": "month-1"}, token_of(page))
            status, _ = post_json(f"{STANDIN}/__pay/{order['orderId']}/pay")
            assert status == 200, "SIMULATED payment was not confirmed"
    if mode == "stress":
        ctx.add_init_script(STRESS_SCRIPT % STRESS_MS)
    before = len(visits)

    # 1. Fresh visit, then refresh.
    for path in PAGES:
        for kind in ("fresh", "refresh"):
            errs.clear(); consoles.clear()
            try:
                if kind == "fresh":
                    page.goto(GATED + path, wait_until="domcontentloaded")
                else:
                    page.reload(wait_until="domcontentloaded")
                wait_hydrated(page)
            except Exception as e:  # noqa: BLE001
                errs.append("did not finish loading: " + str(e)[:200])
            record(tag, kind, path, errs, consoles)

    # 2. Internal navigation through the site's own links, then back and forward.
    errs.clear(); consoles.clear()
    page.goto(GATED + "/dashboard", wait_until="domcontentloaded")
    wait_hydrated(page)
    clicked = 0
    for target in NAV:
        errs.clear(); consoles.clear()
        link = page.locator(f"a[href$='/ielts-website{target}']:visible").first
        try:
            link.wait_for(state="visible", timeout=8000)
            link.click()
            page.wait_for_url(f"**{target}", timeout=30000)
            wait_hydrated(page)
            clicked += 1
        except Exception as e:  # noqa: BLE001
            errs.append(f"navigation link to {target} could not be followed: " + str(e)[:160])
        record(tag, "nav-click", target, errs, consoles)
    for kind, action in (("back", page.go_back), ("forward", page.go_forward)):
        errs.clear(); consoles.clear()
        try:
            action(wait_until="domcontentloaded")
            wait_hydrated(page)
        except Exception as e:  # noqa: BLE001
            errs.append(f"{kind} did not finish: " + str(e)[:160])
        record(tag, kind, page.url.replace(GATED, ""), errs, consoles)

    # 3. From Today into a lesson by the page's own link, where there is one.
    errs.clear(); consoles.clear()
    page.goto(GATED + "/dashboard", wait_until="domcontentloaded")
    wait_hydrated(page)
    lesson = page.locator("a[href*='/ielts-website/lessons/']:visible").first
    if lesson.count():
        errs.clear(); consoles.clear()
        try:
            lesson.click()
            page.wait_for_url("**/lessons/**", timeout=30000)
            wait_hydrated(page)
        except Exception as e:  # noqa: BLE001
            errs.append("lesson link could not be followed: " + str(e)[:160])
        record(tag, "link-to-lesson", page.url.replace(GATED, ""), errs, consoles)

    mine = visits[before:]
    bad = [v for v in mine if v["pageErrors"] or v["hydrationConsole"]]
    delayed = page.evaluate("() => window.__probeDelayed || 0") if mode == "stress" else 0
    summary.append({**tag, "visits": len(mine), "withErrors": len(bad), "navClicks": clicked, "islandsDelayedOnLastPage": delayed})
    print(f"RUN {tag}: {len(mine)} visits, {len(bad)} with an error, {clicked} nav clicks", flush=True)
    ctx.close()
    save()


def save():
    bad = [v for v in visits if v["pageErrors"] or v["hydrationConsole"]]
    (OUT / "results.json").write_text(json.dumps({"base": GATED, "visits": len(visits), "withErrors": len(bad), "summary": summary,
                                                  "errors": bad}, ensure_ascii=False, indent=1), encoding="utf-8")
    lines = ["# R06: rendering mismatches on startup and navigation", "",
             f"Gated production build at {GATED}, payments SIMULATED. **{len(visits)} page visits, {len(bad)} with an uncaught page error or hydration message.**", "",
             "| Language | Screen | Account | Mode | Visits | With errors | Nav clicks |", "|---|---|---|---|---|---|---|"]
    for s in summary:
        lines.append(f"| {s['lang']} | {s['size']} | {s['state']} | {s['mode']} | {s['visits']} | {s['withErrors']} | {s['navClicks']} |")
    if bad:
        lines += ["", "## Errors", ""] + [f"- {v['lang']} {v['size']} {v['state']} {v['mode']} {v['kind']} `{v['path']}`: {(v['pageErrors'] or v['hydrationConsole'])[0][:200]}" for v in bad[:60]]
    (OUT / "results.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for mode in MODES:
            for (w, h) in SIZES:
                for lang in LANGS:
                    for state in STATES:
                        try:
                            run(browser, lang, w, h, state, mode)
                        except Exception as e:  # noqa: BLE001
                            visits.append({"lang": lang, "size": f"{w}x{h}", "state": state, "mode": mode, "kind": "setup", "path": "",
                                           "pageErrors": ["run did not complete: " + str(e)[:300]], "hydrationConsole": []})
                            print("RUN FAILED", lang, w, state, mode, str(e)[:300], flush=True)
                            save()
        browser.close()
    save()
    bad = [v for v in visits if v["pageErrors"] or v["hydrationConsole"]]
    print(f"\n{len(bad)} of {len(visits)} visits had an uncaught page error or hydration message")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
