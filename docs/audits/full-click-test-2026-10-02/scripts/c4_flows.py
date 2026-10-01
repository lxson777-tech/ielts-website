"""C4: whole tasks, start to finish, as a paying student (SIMULATED payment and
SIMULATED AI: the real Workers run, the stand-in answers instead of OpenAI,
nothing is billed). Each one fills in what a student would and checks the end
state, not just that a button responded.

  python c4_flows.py <out-dir> [flow,flow,...]
"""
import json
import re
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).parent))
from c_common import GATED, PASSWORD, STAMP, STANDIN, account, new_ctx, post_json, ready, sign_in, watch  # noqa: E402

OUT = Path(sys.argv[1])
(OUT / "shots").mkdir(parents=True, exist_ok=True)
ONLY = set(sys.argv[2].split(",")) if len(sys.argv) > 2 else None
results = []
ESSAY = (
    "Some people believe that university education should be free for every student, while others argue that students "
    "should pay for their own studies. In my opinion, a balanced system is fairer than either extreme. "
    "On the one hand, free tuition opens higher education to talented young people from poorer families. When cost is "
    "no longer a barrier, a country can develop the skills of its whole population rather than only its wealthiest "
    "citizens. For example, several European countries that charge little or nothing for degrees have high participation "
    "rates and strong research output. In addition, graduates usually earn more and therefore pay more tax, so the state "
    "recovers much of its investment over time. "
    "On the other hand, universities need stable funding to pay lecturers, maintain buildings and buy equipment. If the "
    "government pays for everything, other public services such as healthcare or primary schools may receive less money. "
    "Moreover, students who contribute something towards their education may value it more and choose their courses more "
    "carefully. "
    "In conclusion, I believe that governments should cover most of the cost of university education, but students should "
    "make a modest contribution, perhaps through loans that are repaid only when they earn a good salary. This approach "
    "keeps universities accessible while sharing the cost fairly between society and the individual."
)


def check(name, ok, detail=""):
    results.append({"flow": name, "ok": bool(ok), "detail": str(detail)[:500]})
    print(("PASS " if ok else "FAIL ") + name + (f"  [{str(detail)[:300]}]" if detail else ""), flush=True)


def shot(page, name):
    try:
        page.screenshot(path=str(OUT / "shots" / f"{name}.png"), full_page=True)
    except Exception:  # noqa: BLE001
        pass


def body(page):
    return page.locator("body").inner_text(timeout=5000)


def answer_everything(page):
    """Give an answer to every question on screen: the first choice of each
    radio group, a word in each gap, the second choice of each drop-down."""
    page.evaluate("""() => {
      const groups = new Set();
      for (const r of document.querySelectorAll('input[type=radio]')) { if (!groups.has(r.name)) { groups.add(r.name); r.click(); } }
      for (const c of document.querySelectorAll('input[type=checkbox]')) { if (!c.checked && c.closest('[data-question], .question, fieldset')) c.click(); }
    }""")
    for t in page.locator("main input[type=text]:visible, main input:not([type]):visible").all()[:80]:
        try:
            t.fill("water")
        except Exception:  # noqa: BLE001
            pass
    for s in page.locator("main select:visible").all()[:80]:
        try:
            if s.locator("option").count() > 1:
                s.select_option(index=1)
        except Exception:  # noqa: BLE001
            pass


def press(page, pattern, timeout=8000):
    btn = page.get_by_role("button", name=re.compile(pattern, re.I)).first
    btn.wait_for(state="visible", timeout=timeout)
    btn.click()
    return btn


def submit_paper(page):
    """Submit, and confirm in the "unanswered questions" box if it asks."""
    page.get_by_role("button", name=re.compile(r"^submit$", re.I)).first.click()
    page.wait_for_timeout(800)
    box = page.locator("[role=dialog]:visible, [role=alertdialog]:visible, dialog[open]")
    if box.count():
        box.first.get_by_role("button", name=re.compile(r"^submit", re.I)).first.click()
    else:
        sure = page.locator("text=Submit anyway?")
        if sure.count():
            sure.first.locator("xpath=ancestor::*[.//button][1]").get_by_role("button", name=re.compile(r"^submit$", re.I)).last.click()


def flow_reading_test(page):
    page.goto(GATED + "/tests/reading-full-001", wait_until="domcontentloaded")
    ready(page)
    press(page, r"^Start test$")
    page.wait_for_timeout(1500)
    # A paper may run over several passages: answer each, then move on, then submit.
    for _ in range(6):
        answer_everything(page)
        nxt = page.get_by_role("button", name=re.compile(r"^(Next passage|Next part|Next)\b", re.I))
        if nxt.count() and nxt.first.is_visible() and nxt.first.is_enabled():
            nxt.first.click()
            page.wait_for_timeout(800)
            continue
        break
    submit_paper(page)
    page.wait_for_function("() => /band/i.test(document.body.innerText) && /\\d+\\s*(\\/|of)\\s*40|score/i.test(document.body.innerText)", timeout=30000)
    shot(page, "reading-test-result")
    t = body(page)
    check("Reading test: sat start to finish, the result shows a score and a band", re.search(r"band", t, re.I), re.search(r".{0,40}[Bb]and.{0,40}", t).group(0) if re.search(r"[Bb]and", t) else t[:200])
    page.goto(GATED + "/account#reading", wait_until="domcontentloaded")
    ready(page, 2500)
    rows = page.locator("#reading table tbody tr").count()
    shot(page, "reading-test-in-account")
    check("Reading test: the result is in Account > Saved and results > Reading history", rows >= 1, f"rows={rows}")


def flow_listening_test(page):
    page.goto(GATED + "/tests/listening-full-001", wait_until="domcontentloaded")
    ready(page)
    press(page, r"^Start test$")
    page.wait_for_timeout(2500)
    audio = page.evaluate("""async () => { const a = document.querySelector('audio'); if (!a) return null;
      if (a.readyState < 1) await new Promise(r => { a.addEventListener('loadedmetadata', r, {once: true}); setTimeout(r, 8000); });
      return {src: a.currentSrc.slice(-60), duration: a.duration, error: a.error && a.error.code}; }""")
    check("Listening test: the recording loads (it has a length and no error)", audio and audio["duration"] and audio["duration"] > 30 and not audio["error"], audio)
    for _ in range(6):
        answer_everything(page)
        nxt = page.get_by_role("button", name=re.compile(r"^(Next section|Next part|Next)\b", re.I))
        if nxt.count() and nxt.first.is_visible() and nxt.first.is_enabled():
            nxt.first.click()
            page.wait_for_timeout(800)
            continue
        break
    submit_paper(page)
    page.wait_for_function("() => /band/i.test(document.body.innerText)", timeout=30000)
    shot(page, "listening-test-result")
    check("Listening test: submitted, the result shows a band", True)


def flow_writing_checker(page):
    page.goto(GATED + "/writing/checker", wait_until="domcontentloaded")
    ready(page)
    press(page, r"Task 2")
    page.wait_for_timeout(1200)
    shot(page, "writing-checker-task2")
    box = page.locator("main textarea:visible").first
    box.wait_for(timeout=15000)
    box.fill(ESSAY)
    page.wait_for_timeout(500)
    press(page, r"check|grade|submit|get feedback|assess")
    page.wait_for_function("() => /Task Response|Task Achievement|Coherence/i.test(document.body.innerText) && /band/i.test(document.body.innerText)", timeout=60000)
    shot(page, "writing-checker-result")
    t = body(page)
    check("Essay checker: a 280-word essay gets feedback on the official criteria with a band", "Coherence" in t, re.search(r".{0,60}Overall.{0,40}", t).group(0) if re.search(r"Overall", t) else "")
    check("Essay checker: the feedback is labelled simulated (no AI was paid for)", re.search(r"simulated", t, re.I), "")


def flow_mr_ez(page):
    page.goto(GATED + "/dashboard", wait_until="domcontentloaded")
    ready(page)
    page.locator("button.mrez-launcher").first.click()
    page.wait_for_timeout(1200)
    box = page.locator("[role=dialog] textarea:visible, [role=dialog] input[type=text]:visible").first
    box.wait_for(timeout=15000)
    box.fill("How should I plan a Task 2 essay in 5 minutes?")
    box.press("Enter")
    page.wait_for_timeout(1000)
    send = page.locator("[role=dialog]").get_by_role("button", name=re.compile(r"^send", re.I))
    if send.count() and send.first.is_enabled():
        send.first.click()
    page.wait_for_function("() => (document.querySelector('[role=dialog]')?.innerText || '').split('Task 2 essay in 5 minutes').length > 1 && /simulated/i.test(document.querySelector('[role=dialog]').innerText)", timeout=40000)
    page.wait_for_timeout(2500)
    shot(page, "mr-ez-reply")
    t = page.locator("[role=dialog]").first.inner_text()
    check("Mr EZ: a question gets a reply in the panel (simulated)", len(t) > 120, t[-200:].replace("\n", " "))


def flow_support(page):
    page.goto(GATED + "/support", wait_until="domcontentloaded")
    ready(page)
    page.locator("label[for=support-topic-question], #support-topic-question").first.click()
    page.locator("#support-message").fill("Click test: where can I find the cue card bank? (synthetic test message)")
    with page.expect_response(lambda r: "/support" in r.url and r.request.method == "POST", timeout=20000) as sent:
        press(page, r"Send to a person")
    page.wait_for_function("() => /sent|received|thank|we will|отправлен/i.test(document.querySelector('main').innerText)", timeout=20000)
    shot(page, "support-sent")
    t = page.locator("main").inner_text()
    check("Support form: a message is sent and confirmed", True, re.search(r".{0,80}(sent|received|thank).{0,80}", t, re.I).group(0).replace("\n", " "))
    check("Support form: the server accepted the message", sent.value.ok, f"{sent.value.status} {sent.value.url[-60:]}")


def flow_vocab(page):
    page.goto(GATED + "/review", wait_until="domcontentloaded")
    ready(page)
    page.locator("main button:has-text('Environment & Ecology')").first.click()
    page.wait_for_timeout(1000)
    shot(page, "vocab-topic")
    practise = page.locator("main a:has-text('Practise'), main button:has-text('Practise')").first
    practise.click()
    page.wait_for_timeout(2000)
    ready(page)
    shot(page, "vocab-practice")
    t = body(page)
    check("Vocabulary: a topic opens its practice", re.search(r"carbon|biodiversit|ecolog|environment", t, re.I), page.url.replace(GATED, ""))
    # Work through a few cards: reveal or choose, then next.
    moved = 0
    for _ in range(6):
        # Pick an answer (the numbered choices), then move on if the card asks.
        # The choices read "1global warming": the number and the word sit in separate parts, no space between.
        choice = page.locator("main button:visible").filter(has_text=re.compile(r"^\s*[1-4]\s*[A-Za-zА-Яа-я]")).first
        if not choice.count():
            break
        before = page.locator("main").inner_text()
        choice.click()
        page.wait_for_timeout(700)
        nxt = page.locator("main button:visible").filter(has_text=re.compile(r"^(next|continue|далее)", re.I))
        if nxt.count():
            nxt.first.click()
            page.wait_for_timeout(700)
        if page.locator("main").inner_text() != before:
            moved += 1
    shot(page, "vocab-practice-after")
    check("Vocabulary: practice cards respond to answers", moved >= 3, f"steps={moved}")


def flow_mock(page):
    page.goto(GATED + "/tests/mock", wait_until="domcontentloaded")
    ready(page)
    press(page, r"Start Mock Exam")
    page.wait_for_timeout(2500)
    ready(page)
    shot(page, "mock-started")
    t = body(page)
    check("Mock exam: starting it opens the first paper (Listening)", re.search(r"listening", t, re.I) and re.search(r"Part 1|Section 1|Question", t), page.url.replace(GATED, ""))


def flow_placement(page):
    page.goto(GATED + "/placement", wait_until="domcontentloaded")
    ready(page)
    press(page, r"Start the placement test")
    page.wait_for_timeout(2000)
    ready(page)
    shot(page, "placement-started")
    t = body(page)
    check("Placement test: starting it shows the first question", re.search(r"question|reading|listening|choose", t, re.I), t[:160].replace("\n", " "))


def flow_examiner(page):
    page.goto(GATED + "/speaking/examiner", wait_until="domcontentloaded")
    ready(page)
    press(page, r"Start the interview")
    page.wait_for_timeout(6000)
    shot(page, "examiner-started")
    t = body(page)
    check("Live examiner: pressing start begins a session or says plainly why not", re.search(r"simulated|connecting|listening|examiner|speak|microphone|end", t, re.I), re.sub(r"\s+", " ", t)[:300])


def flow_recorded(page):
    page.goto(GATED + "/speaking/recorded", wait_until="domcontentloaded")
    ready(page)
    page.get_by_role("button", name=re.compile(r"Part 1 The Interview", re.I)).click()
    page.wait_for_timeout(1500)
    shot(page, "recorded-part1")
    steps = []
    for _ in range(8):
        b = page.locator("main button:visible").filter(has_text=re.compile(r"start|record|stop|next|done|finish|submit|grade|get feedback", re.I)).first
        if not b.count():
            break
        label = b.inner_text().strip()
        steps.append(label)
        b.click()
        page.wait_for_timeout(3500 if re.search(r"record|start", label, re.I) else 1500)
        if re.search(r"Fluency|Pronunciation", body(page)) and re.search(r"band", body(page), re.I):
            break
    shot(page, "recorded-after")
    t = body(page)
    check("Recorded Speaking: record with the microphone, stop, and get feedback (simulated)", re.search(r"Fluency|Pronunciation", t), " > ".join(steps))


def flow_account(page, email):
    # Edit details: change the city, see it on the account page.
    page.goto(GATED + "/account", wait_until="domcontentloaded")
    ready(page)
    page.get_by_role("link", name=re.compile(r"Edit details")).click()
    page.wait_for_selector("#profile-city", timeout=20000)
    page.locator("#profile-city").fill("Astana")
    page.locator("button.auth-button[type=submit]").click()
    page.wait_for_timeout(2500)
    page.goto(GATED + "/account", wait_until="domcontentloaded")
    ready(page, 2000)
    check("Account: Edit details saves (the city now reads Astana)", "Astana" in page.locator("[data-account-panel=profile]").inner_text(), page.url.replace(GATED, ""))
    # Change password, sign out, sign back in with the new one.
    press(page, r"Change password")
    page.wait_for_timeout(600)
    pw = page.locator("[data-account-panel=profile] input[type=password]:visible")
    new = PASSWORD + "x"
    for i in range(pw.count()):
        pw.nth(i).fill(new)
    shot(page, "account-change-password")
    page.locator("[data-account-panel=profile] form button[type=submit]:visible").first.click()
    page.wait_for_timeout(2500)
    t = page.locator("[data-account-panel=profile]").inner_text()
    check("Account: Change password confirms", re.search(r"changed|updated|saved", t, re.I), re.sub(r"\s+", " ", t)[-200:])
    page.locator(".ws-avatar").click()
    page.get_by_role("menuitem", name=re.compile(r"Sign out")).click()
    page.wait_for_selector(".ws-login", timeout=20000)
    check("Account menu: Sign out signs out (the header shows Log in)", True)
    page.goto(GATED + "/sign-in?next=%2Faccount", wait_until="domcontentloaded")
    page.wait_for_selector("#signin-email", timeout=30000)
    ready(page)
    page.locator("#signin-email").fill(email)
    page.locator("#signin-password").fill(new)
    page.locator("button.auth-button[type=submit]").click()
    page.wait_for_url("**/account**", timeout=30000)
    ready(page, 2000)
    check("Sign in with the new password lands back on Account", page.locator("#acct-settings-title").is_visible())
    # Forgot password, as a visitor would use it.
    page.goto(GATED + "/forgot-password", wait_until="domcontentloaded")
    ready(page)
    page.locator("input[type=email]").first.fill(email)
    page.locator("button[type=submit]").first.click()
    page.wait_for_timeout(2500)
    t = page.locator("main").inner_text()
    check("Forgot password: asking for a reset link confirms", re.search(r"sent|check your|email", t, re.I), re.sub(r"\s+", " ", t)[:200])


def flow_plan_settings(page):
    page.goto(GATED + "/plan-settings", wait_until="domcontentloaded")
    ready(page, 2000)
    shot(page, "plan-settings")
    t = body(page)
    check("Study plan settings opens with its settings", re.search(r"target|band|minutes|test date|day", t, re.I), t[:160].replace("\n", " "))


def flow_report(page):
    page.goto(GATED + "/report", wait_until="domcontentloaded")
    ready(page, 2000)
    shot(page, "report")
    t = body(page)
    check("Progress report opens and shows the Reading result", re.search(r"reading", t, re.I) and re.search(r"band", t, re.I), t[:160].replace("\n", " "))


FLOWS = [("reading", flow_reading_test), ("listening", flow_listening_test), ("writing", flow_writing_checker), ("mrez", flow_mr_ez),
         ("support", flow_support), ("vocab", flow_vocab), ("mock", flow_mock), ("placement", flow_placement),
         ("examiner", flow_examiner), ("recorded", flow_recorded), ("plan", flow_plan_settings), ("report", flow_report), ("account", None)]

with sync_playwright() as p:
    browser = p.chromium.launch(args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"])
    ctx = new_ctx(browser, "en", 1440, 900)
    page = ctx.new_page()
    errors = []
    watch(page, errors, GATED)
    email = account(page, "paid", "flows")
    for name, fn in FLOWS:
        if ONLY and name not in ONLY:
            continue
        before = len(errors)
        try:
            if name == "account":
                flow_account(page, email)
            else:
                fn(page)
        except Exception as e:  # noqa: BLE001
            shot(page, f"FAILED-{name}")
            check(f"{name}: finished", False, f"{str(e).splitlines()[0][:200]} | at {page.url.replace(GATED, '')} | {re.sub(chr(10), ' ', body(page))[:250]}")
        new = [e for e in errors[before:] if not (e["kind"] == "http" and e.get("status") in (401,))]
        if new:
            check(f"{name}: no errors along the way", False, [f"{e['kind']} {e['text'][:140]}" for e in new[:4]])
    browser.close()

(OUT / "flows.json").write_text(json.dumps(results, indent=1, ensure_ascii=False), encoding="utf-8")
print(f"\n{sum(r['ok'] for r in results)} of {len(results)} passed")
