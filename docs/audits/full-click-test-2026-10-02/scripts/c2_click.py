"""C2: click EVERYTHING clickable on one page of every design, as one kind of
student.

  python c2_click.py <tier> <out-dir> [lang] [WxH] [route,route,...]
  tier: visitor | free | paid | admin | open-visitor

On each page every visible, enabled control is found (links, buttons, tabs,
menu items, folding sections, check boxes, radio answers, drop-downs) and
used, one at a time, in the order it appears:
- a link that leads to another page: the destination must exist and load
  (no "page not found"), then the page is opened again for the next control;
- a button: no uncaught error, no console error, no failed request; if it
  opens a pop-up, the pop-up is recorded and closed with Escape (and must
  close);
- a drop-down: its second choice is picked.
The header, the phone dock and the footer are clicked on the first page only
(they are the same everywhere). Controls that would sign out, delete, reset or
stop something are listed but not pressed; links to other websites are listed,
not followed.
"""
import json
import re
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).parent))
from c_common import BROKEN_TEXT, DIST, GATED, OPEN, OPEN_DIST, account, exists, new_ctx, ready, watch  # noqa: E402

tier = sys.argv[1]
OUT = Path(sys.argv[2])
lang = sys.argv[3] if len(sys.argv) > 3 else "en"
w, h = map(int, (sys.argv[4] if len(sys.argv) > 4 else "1440x900").split("x"))
OUT.mkdir(parents=True, exist_ok=True)
is_open = tier.startswith("open")
base = OPEN if is_open else GATED
origin = base.rsplit("/ielts-website", 1)[0]
dist = OPEN_DIST if is_open else DIST

DEFAULT_ROUTES = [
    "/dashboard", "/start", "/learn", "/learn/bands", "/report", "/plan-settings", "/account", "/profile", "/plans",
    "/trainers", "/trainers/reading", "/trainers/listening", "/trainers/writing", "/trainers/speaking",
    "/trainers/reading/reading-full-001-drill-p1", "/trainers/listening/listening-full-001-drill-p1",
    "/trainers/focused/listening-categorisation-check-a", "/trainers/speaking-focus/speaking-fluency-repair",
    "/tests", "/tests/drills", "/tests/drills/reading-full-001-drill-p1", "/tests/reading-full-001", "/tests/listening-full-001",
    "/tests/mock", "/placement", "/review",
    "/writing/checker", "/writing/models", "/speaking/examiner", "/speaking/cue-cards", "/speaking/recorded", "/speaking/checker",
    "/lessons/reading-task1", "/lessons/reading/tfng", "/lessons/listening/part1", "/lessons/writing/opinion",
    "/lessons/speaking/part2", "/lessons/vocabulary/environment",
    "/help", "/support", "/privacy", "/terms", "/sign-in", "/sign-up", "/forgot-password", "/",
]
routes = sys.argv[5].split(",") if len(sys.argv) > 5 else DEFAULT_ROUTES
if tier == "admin":
    routes = ["/admin"]
if is_open:
    routes = [r for r in routes if r not in ("/plans", "/placement")]

SKIP = re.compile(r"sign out|log out|выйти|delete|удалить|reset|сбросить|clear (all|history|progress)|очистить|stop free access|yes, stop|да, остановить|остановить бесплатный|remove|убрать|sign out on all devices", re.I)
CHROME = "header.ws-header, .ws-tabbar, footer, .ws-footer, nav.site-nav, .site-footer"

MARK_JS = """(chrome) => {
  const sel = 'a[href], button, [role=button], [role=tab], [role=menuitem], [role=switch], summary, input[type=checkbox], input[type=radio], select';
  const seen = {};
  const out = [];
  for (const el of document.querySelectorAll(sel)) {
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    const hiddenInput = el.matches('input') && (r.width < 2 || st.opacity === '0');
    const target = hiddenInput ? (el.closest('label') || el) : el;
    const tr = target.getBoundingClientRect();
    if (tr.width < 1 || tr.height < 1 || st.visibility === 'hidden' || el.closest('[hidden],[inert],[aria-hidden=true]')) continue;
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') continue;
    const text = (el.getAttribute('aria-label') || el.innerText || el.value || el.getAttribute('title') || '').trim().replace(/\\s+/g, ' ').slice(0, 80);
    const href = el.tagName === 'A' ? el.getAttribute('href') : null;
    const kind = el.tagName === 'SELECT' ? 'select' : el.matches('input') ? el.type : el.tagName === 'A' ? 'link' : el.tagName === 'SUMMARY' ? 'summary' : 'button';
    const key = kind + '|' + text + '|' + (href || '') + '|' + (el.name || '');
    seen[key] = (seen[key] || 0) + 1;
    const id = key + '#' + seen[key];
    el.setAttribute('data-ct', id);
    out.push({ id, kind, text, href, chrome: !!el.closest(chrome), name: el.name || null });
  }
  return out;
}"""

DIALOG = "[role=dialog]:visible, dialog[open]"
results = []
chrome_done = set()
t0 = time.time()


def open_page(page, route):
    resp = page.goto(base + route, wait_until="domcontentloaded", timeout=45000)
    ready(page, 1500)
    return resp


def css_id(s):
    return s.replace("\\", "\\\\").replace('"', '\\"')


with sync_playwright() as p:
    browser = p.chromium.launch(args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"])
    ctx = new_ctx(browser, lang, w, h)
    page = ctx.new_page()
    # A browser confirm() is answered "cancel"; the "leave this page?" question a
    # timed paper asks is answered "leave", as a student moving on would.
    leave_asks = []
    page.on("dialog", lambda d: (leave_asks.append(page.url), d.accept()) if d.type == "beforeunload" else d.dismiss())
    email = account(page, tier, f"click-{tier}-{lang}")
    sink = []
    watch(page, sink, base)
    for route in routes:
        page_rec = {"route": route, "controls": [], "skipped": [], "external": []}
        try:
            sink.clear()
            resp = open_page(page, route)
            page_rec["status"] = resp.status if resp else None
            page_rec["loadErrors"] = list(sink)
            controls = page.evaluate(MARK_JS, CHROME)
        except Exception as e:  # noqa: BLE001
            page_rec["exception"] = str(e)[:300]
            results.append(page_rec)
            continue
        here = page.url
        print(f"{route}: {len(controls)} controls ({time.time() - t0:.0f}s)", flush=True)
        for c in controls[:160]:
            if c["chrome"]:
                ck = (c["kind"], c["text"], c["href"])
                if ck in chrome_done:
                    continue
                chrome_done.add(ck)
            if re.fullmatch(r"Skip to content|Перейти к содержимому|Перейти к содержанию", c["text"] or ""):
                continue  # shown only to keyboard users, on focus
            if SKIP.search(c["text"] or ""):
                page_rec["skipped"].append(c["text"])
                continue
            href = c["href"] or ""
            if href.startswith(("mailto:", "tel:")) or (href.startswith("http") and not href.startswith(origin)):
                page_rec["external"].append(href)
                continue
            rec = {"control": c["text"], "kind": c["kind"], "href": href or None}
            sink.clear()
            try:
                # The page may have re-rendered since it was marked: mark it again.
                if not page.locator(f'[data-ct="{css_id(c["id"])}"]').count():
                    page.evaluate(MARK_JS, CHROME)
                loc = page.locator(f'[data-ct="{css_id(c["id"])}"]').first
                probe = loc.locator("xpath=ancestor::label[1]") if c["kind"] in ("radio", "checkbox") and loc.count() and not loc.is_visible() else loc
                if not loc.count() or not probe.is_visible():
                    # An earlier click on this page hid it (another tab, a closed
                    # section, a finished step): start the page again and look once more.
                    open_page(page, route)
                    here = page.url
                    page.evaluate(MARK_JS, CHROME)
                    loc = page.locator(f'[data-ct="{css_id(c["id"])}"]').first
                    probe = loc.locator("xpath=ancestor::label[1]") if c["kind"] in ("radio", "checkbox") and loc.count() and not loc.is_visible() else loc
                if not loc.count() or not probe.is_visible():
                    # Shown only on keyboard focus (Skip to content), or only after
                    # an earlier step; not a fault on its own.
                    rec["outcome"] = "not on screen from a fresh start"
                    page_rec["controls"].append(rec)
                    continue
                target = loc
                if c["kind"] in ("radio", "checkbox"):
                    lab = loc.locator("xpath=ancestor::label[1]")
                    if lab.count() and not loc.is_visible():
                        target = lab
                if c["kind"] == "select":
                    opts = loc.locator("option").all()
                    if len(opts) > 1:
                        loc.select_option(index=1)
                    rec["outcome"] = "picked"
                else:
                    target.click(timeout=6000)
                    leaves = c["kind"] == "link" and href and not href.startswith("#") and href.split("#")[0] not in (here.split("#")[0], here.split("#")[0].replace(origin, ""))
                    if leaves:
                        # A link to another page: wait for that page, however it arrives.
                        # Or, for something paid, the upgrade pop-up instead of the page.
                        try:
                            page.wait_for_function("(here) => location.href.split('#')[0] !== here || !!document.querySelector('[role=dialog]')", arg=here.split("#")[0], timeout=10000)
                        except Exception:  # noqa: BLE001
                            # (A full page load ends the wait early: that is arriving, not failing.)
                            page.wait_for_timeout(1500)
                            if page.url.split("#")[0] == here.split("#")[0] and not page.locator(DIALOG).count():
                                rec["problem"] = "link did not lead anywhere"
                    page.wait_for_timeout(700)
                    rec["outcome"] = "clicked"
                    if re.fullmatch(r"English|Русский|EN|RU", c["text"] or ""):
                        # A language switch: check it switched, then put this run's language back.
                        rec["lang"] = page.evaluate("document.documentElement.lang")
                        page.evaluate(f"localStorage.setItem('ielts.locale.v1', '{lang}')")
                        open_page(page, route)
                        here = page.url
                if page.url.split("#")[0] != here.split("#")[0]:
                    try:
                        page.wait_for_load_state("domcontentloaded", timeout=15000)
                        page.wait_for_timeout(900)
                    except Exception:  # noqa: BLE001
                        pass
                    rec["went"] = page.url.replace(origin, "")
                    title = page.title()
                    h1 = page.locator("h1").first.inner_text(timeout=3000) if page.locator("h1").count() else ""
                    if re.search(r"page not found|страница не найдена|404", title + " " + h1, re.I):
                        rec["problem"] = "leads to a missing page"
                    elif page.url.startswith(base) and not exists(dist, page.url.replace(origin, "")):
                        rec["problem"] = "leads to an address not in the build"
                    open_page(page, route)
                    here = page.url
                elif page.locator(DIALOG).count():
                    rec["dialog"] = page.locator(DIALOG).first.inner_text()[:160].replace("\n", " ")
                    page.keyboard.press("Escape")
                    page.wait_for_timeout(400)
                    if page.locator(DIALOG).count():
                        # Some panels close with their own button rather than Escape.
                        closer = page.locator(f"{DIALOG} >> button:has-text('Close'), {DIALOG} >> button:has-text('Закрыть'), {DIALOG} >> [aria-label*=lose]").first
                        if closer.count():
                            closer.click(timeout=3000)
                            page.wait_for_timeout(400)
                    if page.locator(DIALOG).count():
                        rec["problem"] = "pop-up did not close with Escape or its close button"
                        open_page(page, route)
                        here = page.url
                bt = BROKEN_TEXT.findall((page.locator("main").first.inner_text(timeout=3000) if page.locator("main").count() else ""))
                if bt:
                    rec["brokenText"] = sorted(set(bt))[:4]
            except Exception as e:  # noqa: BLE001
                rec["outcome"] = "could not click"
                rec["why"] = str(e).split("\n")[0][:200]
                try:
                    if page.url.split("#")[0] != here.split("#")[0]:
                        open_page(page, route)
                        here = page.url
                except Exception:  # noqa: BLE001
                    pass
            if sink:
                rec["errors"] = list(sink)
            page_rec["controls"].append(rec)
        results.append(page_rec)
    browser.close()

(OUT / "clicks.json").write_text(json.dumps({"tier": tier, "lang": lang, "size": f"{w}x{h}", "email": email, "pages": results}, indent=1, ensure_ascii=False), encoding="utf-8")
n = sum(len(pr["controls"]) for pr in results)
flagged = [(pr["route"], c) for pr in results for c in pr["controls"] if c.get("problem") or c.get("errors") or c.get("brokenText") or c.get("outcome") == "could not click"]
print(f"\n{tier} {lang} {w}x{h}: {len(results)} pages, {n} controls used, {len(flagged)} to look at, {time.time() - t0:.0f}s")
