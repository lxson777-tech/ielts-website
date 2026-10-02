"""Shared helpers for the free-account verification (2026-10-01). Based on
Builder P's p_free_account.py helpers; readiness = every arriving island hydrated."""
import json, os, re, sys, time, urllib.error, urllib.parse, urllib.request
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
GATED = os.environ.get("GATED_BASE", "http://localhost:4441/ielts-website")
STANDIN = os.environ.get("GATED_STANDIN", "http://127.0.0.1:8841")
OPEN = os.environ.get("OPEN_BASE", "http://localhost:4442/ielts-website")
STAMP = str(int(time.time()))
PASSWORD = "Synthetic-Verify-1"
HYDRATED = """() => [...document.querySelectorAll('astro-island[ssr]')].every(el => ['visible', 'media'].includes(el.getAttribute('client')))"""
HYDRATION_WORDS = ("ydrat", "#418", "#423", "#425", "didn't match", "did not match")
DIALOG = "[role=dialog][aria-labelledby=upgrade-title]"


class Run:
    def __init__(self, out):
        self.out = Path(out)
        self.out.mkdir(parents=True, exist_ok=True)
        (self.out / "shots").mkdir(exist_ok=True)
        self.results = []
        self.errors = []

    def check(self, section, name, ok, detail=""):
        self.results.append({"section": section, "check": name, "ok": bool(ok), "detail": str(detail)[:600]})
        print(("PASS " if ok else "FAIL ") + f"[{section}] {name}" + (f"  ({str(detail)[:300]})" if detail and not ok else ""), flush=True)
        return bool(ok)

    def watch(self, page, tag):
        page.on("pageerror", lambda e: self.errors.append({"tag": tag, "url": page.url, "error": str(e)[:400]}))
        page.on("console", lambda m: self.errors.append({"tag": tag, "url": page.url, "error": "console: " + m.text[:400]})
                if m.type == "error" and any(w in m.text for w in HYDRATION_WORDS) else None)

    def shot(self, page, name, full=False):
        p = self.out / "shots" / f"{name}.png"
        try:
            page.screenshot(path=str(p), full_page=full)
        except Exception as e:  # noqa: BLE001
            print("shot failed", name, e)
        return p

    def save(self, extra=None):
        failed = [r for r in self.results if not r["ok"]]
        data = {"checks": self.results, "pageErrors": self.errors, **(extra or {})}
        (self.out / "results.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
        by = {}
        for r in self.results:
            s = by.setdefault(r["section"], [0, 0])
            s[0 if r["ok"] else 1] += 1
        lines = ["| Section | PASS | FAIL |", "|---|---|---|"] + [f"| {k} | {v[0]} | {v[1]} |" for k, v in by.items()]
        lines += ["", f"Page errors / hydration messages: {len(self.errors)}", ""]
        for e in self.errors[:40]:
            lines.append(f"- ERROR {e['tag']} {e['url']}: {e['error'][:200]}")
        lines += [""]
        lines += [("PASS " if r["ok"] else "FAIL ") + f"[{r['section']}] {r['check']}" + (f"  ({r['detail']})" if r["detail"] and not r["ok"] else "") for r in self.results]
        (self.out / "results.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"\n{len(self.results) - len(failed)} / {len(self.results)} passed; {len(self.errors)} page errors")
        return failed


def post_json(url, data=None, token=None, origin=None):
    req = urllib.request.Request(url, data=json.dumps(data).encode() if data is not None else b"", method="POST",
                                 headers={"Content-Type": "application/json", "Accept": "application/json",
                                          "Origin": origin or GATED.rsplit("/", 1)[0],
                                          **({"Authorization": "Bearer " + token} if token else {})})
    try:
        with urllib.request.urlopen(req) as r:
            body = r.read()
            return r.status, (json.loads(body) if body else None)
    except urllib.error.HTTPError as e:
        body = e.read()
        try:
            return e.code, json.loads(body)
        except Exception:  # noqa: BLE001
            return e.code, body.decode("utf-8", "replace")


def get_json(url):
    with urllib.request.urlopen(url) as r:
        return json.loads(r.read())


def settle(page):
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_function(HYDRATED, timeout=45000)
    page.evaluate("() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 250))))")


def visit(page, path, wait_for=None, base=None):
    page.goto((base or GATED) + path, wait_until="domcontentloaded")
    settle(page)
    if wait_for:
        page.wait_for_selector(wait_for, timeout=30000)


def new_context(browser, lang="en", w=1440, h=900):
    phone = w < 720
    ctx = browser.new_context(viewport={"width": w, "height": h}, locale="ru-RU" if lang == "ru" else "en-GB",
                              device_scale_factor=2 if phone else 1, is_mobile=phone, has_touch=phone)
    ctx.add_init_script(f"try{{ localStorage.setItem('ielts.locale.v1','{lang}') }}catch(e){{}}")
    return ctx


def fill_profile(page):
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


def sign_up(page, email, next_route="/dashboard"):
    page.goto(GATED + "/sign-up?next=" + urllib.parse.quote(next_route, safe=""), wait_until="domcontentloaded")
    page.wait_for_selector("#signup-email", timeout=40000)
    settle(page)
    page.locator("#signup-email").fill(email)
    page.locator("#signup-password").fill(PASSWORD)
    if page.locator("#signup-confirm").count():
        page.locator("#signup-confirm").fill(PASSWORD)
    # Consent to data processing is required since 2 October 2026.
    if page.locator("#signup-consent").count():
        page.locator("#signup-consent").check(force=True)
    page.locator("button.auth-button[type=submit]").click()
    fill_profile(page)


def sign_in(page, email, next_route=None):
    page.goto(GATED + "/sign-in" + ("?next=" + urllib.parse.quote(next_route, safe="") if next_route else ""), wait_until="domcontentloaded")
    page.wait_for_selector("#signin-email", timeout=40000)
    settle(page)
    page.locator("#signin-email").fill(email)
    page.locator("#signin-password").fill(PASSWORD)
    page.locator("button.auth-button[type=submit]").click()


def token_of(page):
    return page.evaluate("() => { for (const k of Object.keys(localStorage)) { if (k.startsWith('sb-') && k.endsWith('-auth-token')) { return JSON.parse(localStorage.getItem(k)).access_token } } return null }")


def dialog_feature(page, timeout=8000):
    try:
        page.wait_for_selector(DIALOG, timeout=timeout)
        page.wait_for_function("() => { const l = document.querySelector('.upgrade-layer'); return l && l.getAnimations({ subtree: true }).every(a => a.playState !== 'running') }", timeout=5000)
    except Exception:  # noqa: BLE001
        if not page.locator(DIALOG).count():
            return None
    return page.locator("[data-upgrade-dialog]").get_attribute("data-upgrade-dialog")


def close_dialog(page):
    page.keyboard.press("Escape")
    page.wait_for_selector(DIALOG, state="detached", timeout=5000)


def body_text(page):
    return page.evaluate("() => document.body.innerText")


TRIAL_RE = re.compile(r"[^.\n]*(?:\btrial\b|пробн\w*\s+(?:период|доступ|верси|дн)\w*|триал|бесплатн\w+\s+(?:три|3)\s+дн)[^.\n]*", re.I)
# Russian "пробный тест" is the ordinary word for a PRACTICE (mock) test, not
# the free trial; those uses are listed separately, not counted as trial wording.
PROBN_RE = re.compile(r"[^.\n]*пробн\w*[^.\n]*", re.I)


def trial_hits(text):
    return [h.strip()[:100] for h in TRIAL_RE.findall(text)]


def probn_uses(text):
    return [h.strip()[:100] for h in PROBN_RE.findall(text) if not TRIAL_RE.search(h)]


def lesson_ready(page, min_len=300, timeout=30000):
    page.wait_for_function(
        "(n) => { const b = document.querySelector('[data-lesson-body]'); return b && !b.hasAttribute('data-lesson-body-loading') && b.textContent.trim().length > n }",
        arg=min_len, timeout=timeout)


def lesson_state(page):
    return page.evaluate("""() => { const b = document.querySelector('[data-lesson-body]'); if (!b) return null;
      const t = b.innerText || ''; const cyr = (t.match(/[А-Яа-яЁё]/g) || []).length; const lat = (t.match(/[A-Za-z]/g) || []).length;
      return { slug: b.getAttribute('data-lesson-body'), locale: b.getAttribute('data-lesson-body-locale'), len: t.trim().length, cyr, lat,
               gated: b.hasAttribute('data-lesson-gated'), invite: !!document.querySelector('[data-lesson-invite]') } }""")


def overflow(page):
    return page.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
