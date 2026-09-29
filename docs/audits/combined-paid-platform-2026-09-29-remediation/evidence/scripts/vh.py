"""Verifier helpers (scratch only). Synthetic @example.test accounts, local servers only."""
from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

EVROOT = Path(r"C:/Users/Alex/Desktop/Projects/IELTS website/.claude/worktrees/musing-mcclintock-862665/docs/audits/combined-paid-platform-2026-09-29-remediation/evidence")
PASSWORD = "synthetic-pass-123"
COMBOS = [("en", 1440, 900), ("ru", 1440, 900), ("en", 390, 844), ("ru", 390, 844)]
PROFILE = {"first_name": "Synthetic", "last_name": "Student", "dob": ("4", "3", "2000"),
           "phone": "+7 701 234 56 78", "city": "Almaty", "occupation": "Synthetic University", "source": "friend"}


class Run:
    def __init__(self, name: str, base: str, standin: str):
        self.name = name
        self.base = base.rstrip("/")
        self.standin_url = standin.rstrip("/")
        self.out = EVROOT / name
        self.out.mkdir(parents=True, exist_ok=True)
        self.results: list[dict] = []
        self.stamp = str(int(time.time()))
        self.page_errors: list[str] = []
        self.pack_requests: dict[str, list[str]] = {}

    # ── reporting ──
    def check(self, combo: str, name: str, ok, detail="") -> bool:
        ok = bool(ok)
        self.results.append({"combo": combo, "check": name, "pass": ok, "detail": str(detail)[:400]})
        print(("PASS " if ok else "FAIL ") + f"[{combo}] {name}" + (f"  [{str(detail)[:300]}]" if detail else ""), flush=True)
        return ok

    def note(self, combo: str, text: str):
        self.results.append({"combo": combo, "check": "NOTE " + text, "pass": None, "detail": ""})
        print(f"NOTE [{combo}] {text}", flush=True)

    def shot(self, page, name: str, full=False) -> str:
        path = self.out / f"{name}.png"
        try:
            page.screenshot(path=str(path), full_page=full)
        except Exception as e:  # noqa: BLE001
            print(f"  (screenshot {name} failed: {e})")
        return path.name

    def save(self):
        checks = [r for r in self.results if r["pass"] is not None]
        passed = sum(1 for r in checks if r["pass"])
        data = {"suite": self.name, "base": self.base, "standin": self.standin_url, "passed": passed, "total": len(checks),
                "failed": [r for r in checks if not r["pass"]], "page_errors": self.page_errors[:50],
                "pack_requests": {k: v[:20] for k, v in self.pack_requests.items()}, "results": self.results}
        (self.out / "results.json").write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")
        lines = [f"# {self.name}", "", f"Base {self.base}, stand-in {self.standin_url}", "", f"**{passed} of {len(checks)} checks passed**", "",
                 "| Combo | Result | Check | Detail |", "|---|---|---|---|"]
        for r in self.results:
            res = "NOTE" if r["pass"] is None else ("PASS" if r["pass"] else "FAIL")
            lines.append(f"| {r['combo']} | {res} | {r['check'].replace('|', '/')} | {r['detail'].replace('|', '/').replace(chr(10), ' ')[:200]} |")
        (self.out / "results.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"\n{self.name}: {passed}/{len(checks)} passed", flush=True)
        return passed, len(checks)

    # ── stand-in ──
    def standin(self, path: str, body: dict | None = None):
        data = None if body is None else json.dumps(body).encode()
        req = urllib.request.Request(self.standin_url + path, data=data,
                                     headers={"Content-Type": "application/json", "Accept": "application/json"},
                                     method="POST" if body is not None else "GET")
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.loads(r.read() or b"null")
        except urllib.error.HTTPError as e:
            return {"_status": e.code, "_body": e.read()[:300].decode("utf-8", "replace")}

    def trial_account(self, email: str):
        s = self.standin("/__trial/state")
        return next((a for a in s.get("accounts", []) if a.get("email") == email), None)

    def usage(self, email: str, kind: str, section: str, status: str | None = None):
        s = self.standin("/__trial/state")
        return [u for u in s.get("usage", []) if u.get("email") == email and u["kind"] == kind and u["section"] == section
                and (status is None or u["status"] == status)]

    # ── browser ──
    def context(self, browser, lang: str, w: int, h: int, watch: str | None = None, set_lang=True, device_locale="en-GB"):
        phone = w < 720
        ctx = browser.new_context(viewport={"width": w, "height": h}, locale=device_locale,
                                  device_scale_factor=2 if phone else 1, is_mobile=phone, has_touch=phone)
        if set_lang:
            ctx.add_init_script(f"try {{ if (!localStorage.getItem('ielts.locale.v1')) localStorage.setItem('ielts.locale.v1', '{lang}'); }} catch (e) {{}}")
        if watch:
            self.pack_requests.setdefault(watch, [])
            ctx.on("request", lambda req: self.pack_requests[watch].append(req.url) if "/content/pack/" in req.url else None)
        page = ctx.new_page()
        page.on("pageerror", lambda e: self.page_errors.append(f"{page.url}: {str(e)[:200]}"))
        return ctx, page

    def goto(self, page, path: str, wait=1200):
        page.goto(self.base + path, wait_until="domcontentloaded")
        page.wait_for_timeout(wait)

    def route(self, page) -> str:
        path = urlparse(page.url).path
        b = urlparse(self.base).path.rstrip("/")
        return path[len(b):] if b and path.startswith(b) else path

    def wait_route(self, page, pred, timeout_ms=20000) -> bool:
        end = time.time() + timeout_ms / 1000
        while time.time() < end:
            try:
                if pred(self.route(page)):
                    return True
            except Exception:
                pass
            page.wait_for_timeout(200)
        return False


def wait_text(page, text, timeout=20000) -> bool:
    try:
        page.get_by_text(text, exact=False).first.wait_for(timeout=timeout)
        return True
    except Exception:
        return False


def wait_for(page, fn, timeout=20000) -> bool:
    end = time.time() + timeout / 1000
    while time.time() < end:
        try:
            if fn():
                return True
        except Exception:
            pass
        page.wait_for_timeout(250)
    return False


def body(page) -> str:
    try:
        return page.inner_text("body")
    except Exception:
        return ""


def lang_of(page) -> str:
    try:
        return page.evaluate("document.documentElement.lang")
    except Exception:
        return ""


def stored_lang(page):
    try:
        return page.evaluate("localStorage.getItem('ielts.locale.v1')")
    except Exception:
        return None


OVERFLOW_JS = """() => { const w = document.documentElement.clientWidth; const sw = document.documentElement.scrollWidth;
  const wide = []; for (const el of document.querySelectorAll('body *')) { const r = el.getBoundingClientRect();
    if (r.width === 0 || getComputedStyle(el).position === 'fixed') continue;
    if (r.right > w + 1) { let clipped = false; for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p); if (o.overflowX !== 'visible') { clipped = true; break; } }
      if (!clipped) wide.push(el.tagName + '.' + String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).slice(0, 40) + ' "' + (el.textContent || '').trim().slice(0, 30) + '" right=' + Math.round(r.right)); } }
  return { clientWidth: w, scrollWidth: sw, innerWidth: window.innerWidth, wide: wide.slice(0, 6) }; }"""


def overflow(page) -> dict:
    try:
        return page.evaluate(OVERFLOW_JS)
    except Exception as e:  # noqa: BLE001
        return {"error": str(e)}


def no_sideways(page) -> tuple[bool, dict]:
    o = overflow(page)
    return (o.get("scrollWidth", 99999) <= o.get("clientWidth", 0) + 1), o


def try_click(locator, timeout=8000) -> bool:
    try:
        locator.first.click(timeout=timeout)
        return True
    except Exception:
        return False


def click_until(page, loc_fn, verify, attempts=8, delay=1200) -> bool:
    if verify():
        return True
    for _ in range(attempts):
        try:
            loc_fn().first.click(timeout=4000)
        except Exception:
            pass
        page.wait_for_timeout(delay)
        if verify():
            return True
    return verify()


def fill_profile(page) -> bool:
    try:
        page.wait_for_selector("#profile-firstName", timeout=20000)
    except Exception:
        return False
    page.locator("#profile-firstName").fill(PROFILE["first_name"])
    page.locator("#profile-lastName").fill(PROFILE["last_name"])
    d, m, y = PROFILE["dob"]
    page.locator("#profile-dob-day").select_option(d)
    page.locator("#profile-dob-month").select_option(m)
    page.locator("#profile-dob-year").select_option(y)
    page.locator("#profile-phone").fill(PROFILE["phone"])
    page.locator("#profile-city").fill(PROFILE["city"])
    page.locator("#profile-occupation").fill(PROFILE["occupation"])
    page.locator(f"#profile-source-{PROFILE['source']}").check(force=True)
    try_click(page.locator("form button[type=submit]"), 10000)
    end = time.time() + 20
    while time.time() < end and "/profile" in page.url:
        page.wait_for_timeout(200)
    return "/profile" not in page.url


def fill_signup(page, email: str):
    page.wait_for_selector("#signup-email", timeout=30000)
    page.locator("#signup-email").fill(email)
    page.locator("#signup-password").fill(PASSWORD)
    if page.locator("#signup-confirm").count():
        page.locator("#signup-confirm").fill(PASSWORD)
    try_click(page.locator("form button[type=submit]"), 10000)


def fill_signin(page, email: str):
    page.wait_for_selector("#signin-email", timeout=30000)
    page.locator("#signin-email").fill(email)
    page.locator("#signin-password").fill(PASSWORD)
    try_click(page.locator("form button[type=submit]"), 10000)


def fill_answers(page) -> int:
    return page.evaluate("""() => { let n = 0;
      for (const el of document.querySelectorAll('select')) { if (el.options.length > 1 && !el.closest('.mrez-panel')) { el.selectedIndex = 1; el.dispatchEvent(new Event('change', { bubbles: true })); n++; } }
      for (const el of document.querySelectorAll('input[type=text]')) { if (el.closest('.mrez-panel')) continue; const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; s.call(el, 'synthetic'); el.dispatchEvent(new Event('input', { bubbles: true })); n++; }
      for (const el of document.querySelectorAll('input[type=radio]')) { const nm = el.name; if (nm && !document.querySelector(`input[name="${nm}"]:checked`)) { el.click(); n++; } }
      return n; }""")


ACTIVE_JS = r"""() => { const a = document.activeElement; const d = document.querySelector('[role=dialog][aria-modal=true]');
  return { text: (a && (a.innerText || a.getAttribute('aria-label') || a.tagName) || '').trim().slice(0, 50), tag: a ? a.tagName : null,
           inside: !!(d && a && d.contains(a)), dialog: !!d }; }"""


LAUNCHER_JS = r"""() => {
  const l = document.querySelector('.mrez-launcher');
  if (!l) return { launcher: null };
  const lr = l.getBoundingClientRect();
  if (lr.width === 0 || getComputedStyle(l).display === 'none' || getComputedStyle(l).visibility === 'hidden') return { launcher: 'hidden' };
  const hits = [];
  for (const el of document.querySelectorAll('a, button, input, textarea, select, summary, [role=tab], label')) {
    if (el.closest('.mrez-launcher, .mrez-panel, .mrez-root')) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const ix = Math.max(0, Math.min(r.right, lr.right) - Math.max(r.left, lr.left));
    const iy = Math.max(0, Math.min(r.bottom, lr.bottom) - Math.max(r.top, lr.top));
    if (ix > 0 && iy > 0) hits.push({ tag: el.tagName, text: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 40), rect: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], overlap: Math.round(ix * iy) });
  }
  return { launcher: [Math.round(lr.left), Math.round(lr.top), Math.round(lr.right), Math.round(lr.bottom)], vw: innerWidth, scrollY: Math.round(scrollY), hits };
}"""
