"""Hydration probe, wide: every listed page x EN/RU x signed-out/trial/paid x desktop/phone.

Needs vh.py and journey_c_paying.py from ../scripts next to it (copy all three to a scratch
folder and point vh.EVROOT at that folder first: it writes there). Local servers only.

Env: J_BASE (site, e.g. http://localhost:4481/ielts-website), J_STANDIN (local backend),
PROBE_OUT (json path, written after every visit), PROBE_PATHS (comma list, optional),
PROBE_STATES (signed-out,trial,paid), PROBE_SIZES (1440x900,390x844), PROBE_LANGS (en,ru),
PROBE_REPEAT, PROBE_WAIT (ms on each page), PROBE_RESUME (paper to start and reload, empty to skip),
PROBE_STRESS (ms): delays each astro-island's takeover by a random 0..N ms, so a browser-side
store that answers quickly has nearly always answered before the island hydrates. That turns an
intermittent hydration race into one that shows on almost every visit. A development build
(astro dev) prints the component and both texts; a production build prints "Minified React
error #418"."""
import json, os, re, sys
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding="utf-8")
import journey_c_paying as C
R = C.R

DEFAULT_PATHS = ("/dashboard /trial /plans /tests /account /writing/models /learn /learn/bands /lessons/reading/para "
                 "/lessons/reading/cat /lessons/listening /lessons/speaking /lessons/writing /lessons/writing-task2 "
                 "/lessons/vocabulary /lessons/reading-test /speaking/cue-cards /speaking/examiner /report /review "
                 "/placement /start /help /support /terms /privacy /trainers /trainers/writing /trainers/speaking "
                 "/trainers/reading /trainers/listening /tests/mock /tests/reading-full-001 /tests/listening-full-001 /writing/checker /plan-settings /profile "
                 "/sign-in /sign-up /forgot-password "
                 "/writing/models?task=pte-wt-131-task2&reason=from-session /speaking/cue-cards?card=place-city-visit&reason=from-session "
                 "/learn/bands?paper=speaking&criterion=lexicalResource&from=7&reason=from-session").split()
PATHS = os.environ["PROBE_PATHS"].split(",") if os.environ.get("PROBE_PATHS") else DEFAULT_PATHS
STATES = os.environ.get("PROBE_STATES", "signed-out,trial,paid").split(",")
SIZES = [tuple(map(int, s.split("x"))) for s in os.environ.get("PROBE_SIZES", "1440x900,390x844").split(",")]
LANGS = os.environ.get("PROBE_LANGS", "en,ru").split(",")
REPEAT = int(os.environ.get("PROBE_REPEAT", "1"))
STRESS = int(os.environ.get("PROBE_STRESS", "0"))
WAIT = int(os.environ.get("PROBE_WAIT", "2500"))
out = []
HYD = ("ydrat", "#418", "#423", "#425", "didn't match", "did not match")


def save():
    open(os.environ.get("PROBE_OUT", "probe-out.json"), "w", encoding="utf-8").write(json.dumps(out, indent=1, ensure_ascii=False))


RESUME = os.environ.get("PROBE_RESUME", "/tests/reading-full-001")


def resume_check(page, errs, tag):
    """Start a practice paper, then reload: the saved sitting must be picked up without a hydration error."""
    if not RESUME:
        return
    R.goto(page, RESUME, WAIT)
    btn = page.locator("button", has_text=re.compile("Start test|Начать тест", re.I)).first
    started = False
    try:
        btn.wait_for(timeout=8000)
        btn.click()
        page.wait_for_timeout(2500)
        started = True
    except Exception:
        pass
    errs.clear()
    page.reload(wait_until="domcontentloaded")
    page.wait_for_timeout(WAIT)
    running = page.evaluate("() => !!document.querySelector('[role=timer], .tp-timer') || /Submit|Сдать|Отправить/.test(document.body.innerText)")
    rec = {**tag, "path": RESUME + " (reload mid-sitting)", "try": 0, "started": started, "resumed_on_screen": running, "errors": list(errs)}
    out.append(rec)
    save()
    print("RESUME", tag, "started" if started else "NOT STARTED", "running" if running else "not running", "HIT" if errs else "clean", flush=True)
    if errs:
        print("HIT", tag, "resume", errs[0][:300].replace(chr(10), " "), flush=True)


def visit_all(page, errs, tag):
    for path in PATHS:
        for i in range(REPEAT):
            errs.clear()
            try:
                R.goto(page, path, WAIT)
            except Exception as e:  # noqa: BLE001
                errs.append("goto failed: " + str(e)[:200])
            rec = {**tag, "path": path, "try": i, "errors": list(errs)}
            try:
                rec["islands"] = page.evaluate("() => document.querySelectorAll('astro-island').length")
                rec["islands_waiting"] = page.evaluate("() => document.querySelectorAll('astro-island[ssr]').length")
                if STRESS:
                    rec["islands_delayed"] = page.evaluate("() => window.__probeDelayed || 0")
            except Exception:
                pass
            out.append(rec)
            save()
            if errs:
                print("HIT", tag, path, errs[0][:300].replace("\n", " "), flush=True)


with sync_playwright() as p:
    b = p.chromium.launch()
    for (w, h) in SIZES:
        for lang in LANGS:
            ctx, page = R.context(b, lang, w, h)
            if STRESS:
                ctx.add_init_script("""(() => { const MAX = %d; const def = customElements.define.bind(customElements);
  customElements.define = function (name, cls, opts) { if (name === 'astro-island') { const p = cls.prototype; const o = p.connectedCallback;
    p.connectedCallback = function () { const el = this; window.__probeDelayed = (window.__probeDelayed || 0) + 1; setTimeout(() => o.call(el), Math.random() * MAX); }; } return def(name, cls, opts); }; })();""" % STRESS)
            errs = []
            page.on("pageerror", lambda e: errs.append("pageerror: " + str(e)[:4000]))
            page.on("console", lambda m: errs.append("console: " + m.text[:6000]) if m.type == "error" and any(k in m.text for k in HYD) else None)
            tag = {"lang": lang, "size": f"{w}x{h}"}
            if "signed-out" in STATES:
                visit_all(page, errs, {**tag, "state": "signed-out"})
                resume_check(page, errs, {**tag, "state": "signed-out"})
            if "trial" in STATES or "paid" in STATES:
                em = f"hyd-{R.name}-{lang}-{w}-{R.stamp}@example.test"
                C.start_trial(page, em)
                if "trial" in STATES:
                    visit_all(page, errs, {**tag, "state": "trial"})
                    resume_check(page, errs, {**tag, "state": "trial"})
                if "paid" in STATES:
                    R.goto(page, "/plans", 3000)
                    C.buy(page, "Купить один месяц" if lang == "ru" else "Buy one month", "pay")
                    page.wait_for_timeout(4000)
                    visit_all(page, errs, {**tag, "state": "paid"})
                    resume_check(page, errs, {**tag, "state": "paid"})
            ctx.close()
    b.close()

bad = [o for o in out if o["errors"]]
print(len(bad), "of", len(out), "page visits had a hydration error")
save()
