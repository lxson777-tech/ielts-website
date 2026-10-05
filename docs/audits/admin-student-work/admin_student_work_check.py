"""Browser check: the owner opens a student's test on /admin and sees every
question, the student's answer, the correct answer and a right/wrong mark,
and reads the student's essay (5 October 2026).

Runs against a local build of the OPEN site (what is live) on port 4630,
pointed at the local stand-in on 4639 (tools/mr-ez-dev-server.mjs, open mode,
MR_EZ_ADMIN_EMAILS=admin@example.test). The stand-in answers
admin_student_work with the REAL function from
supabase/migrations/2026-10-05-admin-student-work.sql in PGlite. Nothing here
talks to production, deletes anything or calls a paid service. Synthetic
@example.test accounts only.

  python admin_student_work_check.py [out-dir]
"""
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent
(OUT / "shots").mkdir(parents=True, exist_ok=True)
SITE = "http://localhost:4630/ielts-website"
STANDIN = "http://127.0.0.1:4639"
STAMP = str(int(time.time()))
PASSWORD = "Synthetic-Verify-1"
STUDENT = f"aw-student-{STAMP}@example.test"
ADMIN = "admin@example.test"
HYDRATED = """() => [...document.querySelectorAll('astro-island[ssr]')].every(el => ['visible', 'media'].includes(el.getAttribute('client')))"""

# What the synthetic student enters on Reading test 1 (correct answers from
# /data/tests/reading-full-001.json): right, wrong, blank, right, right, wrong.
SELECTS = {1: "True", 2: "True", 4: "Not Given"}
TYPED = {8: "cow dung", 9: "heat"}
EXPECT = {
    "q1": ("right", "True", "Water hyacinth was introduced"),
    "q2": ("wrong", "False", "Fishermen took some water hyacinth"),
    "q3": ("blank", "True", "It is now difficult to force boats"),
    "q4": ("right", "Not given", "Chemicals produced by the water hyacinth"),
    "q8": ("right", "Cow dung", None),
    "q9": ("wrong", "Fermentation", None),
}
ESSAY_PROMPT = "pte-wt-132-task2"
ESSAY_TEXT = (
    "Some people believe that primary schools spend too much time on formal lessons. "
    "I partly agree, because young children learn a great deal through play.\n\n"
    "Firstly, play builds social skills that a textbook cannot teach. "
    "Secondly, a short break for games helps pupils concentrate in the next lesson.\n\n"
    "In conclusion, formal learning matters, but play should keep a real place in the classroom."
)

results = []
errors = []


def check(section, name, ok, detail=""):
    results.append({"section": section, "check": name, "ok": bool(ok), "detail": str(detail)[:500]})
    print(("PASS " if ok else "FAIL ") + f"[{section}] {name}" + (f"  ({str(detail)[:300]})" if detail and not ok else ""), flush=True)
    return bool(ok)


def shot(page, name, full=True):
    page.screenshot(path=str(OUT / "shots" / f"{name}.png"), full_page=full)


def settle(page, extra=600):
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_function(HYDRATED, timeout=45000)
    page.wait_for_timeout(extra)


def http(method, url, data=None, token=None, service=False):
    headers = {"Content-Type": "application/json", "Accept": "application/json", "apikey": "local-service-role-key" if service else "local-anon-key"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(url, data=json.dumps(data).encode() if data is not None else None, method=method, headers=headers)
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


def new_ctx(browser, w=1440, h=900):
    phone = w < 720
    ctx = browser.new_context(viewport={"width": w, "height": h}, locale="en-GB", device_scale_factor=2 if phone else 1, is_mobile=phone, has_touch=phone)
    ctx.add_init_script("try{ localStorage.setItem('ielts.locale.v1','en') }catch(e){}")
    return ctx


def watch(page, tag):
    page.on("pageerror", lambda e: errors.append({"tag": tag, "url": page.url, "error": str(e)[:400]}))
    page.on("console", lambda m: errors.append({"tag": tag, "url": page.url, "error": "console: " + m.text[:300]}) if m.type == "error" else None)


def fill_profile(page):
    page.wait_for_selector("#profile-firstName", timeout=40000)
    page.locator("#profile-firstName").fill("Aigerim")
    page.locator("#profile-lastName").fill("Synthetic")
    page.locator("#profile-dob-day").select_option("4")
    page.locator("#profile-dob-month").select_option("3")
    page.locator("#profile-dob-year").select_option("2000")
    page.locator("#profile-phone").fill("+7 701 234 56 78")
    page.locator("#profile-city").fill("Almaty")
    page.locator("#profile-occupation").fill("Synthetic University")
    page.locator("#profile-source-friend").check(force=True)
    page.locator("button.auth-button[type=submit]").click()


def sign_up(page, email):
    page.goto(SITE + "/sign-up?next=%2Fdashboard", wait_until="domcontentloaded")
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
        sign_in(page, email)  # already exists from an earlier run
    if "/profile" in page.url or page.locator("#profile-firstName").count():
        fill_profile(page)
    page.wait_for_url("**/dashboard**", timeout=40000)


def sign_in(page, email):
    page.goto(SITE + "/sign-in?next=%2Fdashboard", wait_until="domcontentloaded")
    page.wait_for_selector("#signin-email", timeout=40000)
    settle(page)
    page.locator("#signin-email").fill(email)
    page.locator("#signin-password").fill(PASSWORD)
    page.locator("button.auth-button[type=submit]").click()
    page.wait_for_function("() => !location.pathname.endsWith('/sign-in')", timeout=40000)
    if page.locator("#profile-firstName").count():
        fill_profile(page)


def token_of(page):
    return page.evaluate("() => { for (const k of Object.keys(localStorage)) { if (k.startsWith('sb-') && k.endsWith('-auth-token')) { return JSON.parse(localStorage.getItem(k)).access_token } } return null }")


def user_id_of(page):
    return page.evaluate("() => { for (const k of Object.keys(localStorage)) { if (k.startsWith('sb-') && k.endsWith('-auth-token')) { return JSON.parse(localStorage.getItem(k)).user.id } } return null }")


def no_sideways_scroll(page):
    return page.evaluate("() => ({ doc: document.documentElement.scrollWidth, body: document.body.scrollWidth, view: window.innerWidth })")


def open_student(page, email):
    page.goto(SITE + "/admin", wait_until="domcontentloaded")
    settle(page)
    page.wait_for_selector(".admin-list", timeout=40000)
    page.locator(".admin-search input").fill(email)
    row = page.locator(".admin-row", has_text=email).first
    row.locator(".admin-row-main").click()
    page.wait_for_selector(".admin-work-section", timeout=30000)
    page.wait_for_timeout(500)
    return row


def open_attempt(page, row):
    row.locator(".admin-work-line", has_text="Reading test 1").first.click()
    page.wait_for_selector(".admin-q-list", timeout=30000)
    page.wait_for_timeout(500)


with sync_playwright() as p:
    browser = p.chromium.launch()

    # ── 1. The student takes Reading test 1 through the real test player ──
    sctx = new_ctx(browser)
    spage = sctx.new_page()
    watch(spage, "student")
    sign_up(spage, STUDENT)
    student_id = user_id_of(spage)
    check("setup", "the synthetic student signed up and reached Today", "/dashboard" in spage.url, spage.url)

    spage.goto(SITE + "/tests/reading-full-001", wait_until="domcontentloaded")
    settle(spage)
    spage.get_by_role("button", name=re.compile(r"^Start", re.I)).first.click()
    spage.wait_for_selector("select[aria-label='Question 1']", timeout=30000)
    for n, value in SELECTS.items():
        spage.locator(f"select[aria-label='Question {n}']").select_option(label=value)
    for n, value in TYPED.items():
        spage.locator(f"input[aria-label='Question {n}']").fill(value)
    shot(spage, "01-student-answering-reading-test-1", full=False)
    spage.get_by_role("button", name="Submit", exact=True).first.click()
    # "You have N unanswered questions. Submit anyway?" with its own Submit.
    spage.wait_for_selector("text=Submit anyway?", timeout=10000)
    spage.get_by_role("button", name="Submit", exact=True).last.click()
    spage.wait_for_timeout(2500)
    shot(spage, "02-student-result", full=False)

    # Wait for the evidence event with its answers to reach the stand-in.
    event = None
    for _ in range(40):
        status, rows = http("GET", f"{STANDIN}/rest/v1/learning_events?user_id=eq.{student_id}&select=*", service=True)
        if status == 200 and isinstance(rows, list):
            hits = [r for r in rows if r.get("activity_id") == "test:reading-full-001" and (r.get("event") or {}).get("items")]
            if hits:
                event = hits[-1]["event"]
                break
        time.sleep(1)
    check("setup", "the test's per-question answers were saved to the account (learning_events)", event is not None)
    stored = {i["itemId"].split(":")[-1]: i for i in (event or {}).get("items", [])}
    check("setup", "40 questions recorded, blank ones included", len(stored) == 40, len(stored))
    check("setup", "the stored answers are what was entered",
          (stored.get("q1", {}).get("firstAnswer", "").lower() == "true" and stored.get("q2", {}).get("firstAnswer", "").lower() == "true"
           and stored.get("q3", {}).get("firstAnswer") == "" and stored.get("q8", {}).get("firstAnswer", "").lower() == "cow dung"
           and stored.get("q9", {}).get("firstAnswer", "").lower() == "heat"),
          {k: stored.get(k, {}).get("firstAnswer") for k in ("q1", "q2", "q3", "q4", "q8", "q9")})
    right_count = sum(1 for i in stored.values() if i.get("correct"))
    check("setup", "the player marked q1, q4 and q8 right and q2, q9 wrong", all(stored.get(q, {}).get("correct") for q in ("q1", "q4", "q8"))
          and not any(stored.get(q, {}).get("correct") for q in ("q2", "q3", "q9")), right_count)

    # ── 2. One essay. The grader is not configured on this build (no paid
    #    call), so the attempt is written into the student's own saved
    #    progress in the browser, exactly in WritingAttempt's shape, and the
    #    site's real sync pushes it to the account. ──
    essay_attempt = {
        "at": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
        "overallBand": 6.5,
        "criteria": {"taskResponse": 7, "coherenceCohesion": 6, "lexicalResource": 6, "grammaticalRange": 6},
        "wordCount": len(ESSAY_TEXT.split()),
        "live": True,
        "essay": ESSAY_TEXT,
        "promptTitle": "Primary schools focus too much on formal learning",
        "task": "task2",
        "report": {
            "criteria": {
                "taskResponse": {"band": 7, "comment": "A clear position is kept throughout.", "tip": "Develop the second reason with an example."},
                "coherenceCohesion": {"band": 6, "comment": "Paragraphs are logical but linking is repetitive."},
                "lexicalResource": {"band": 6, "comment": "Adequate range with some repetition."},
                "grammaticalRange": {"band": 6, "comment": "A mix of simple and complex sentences."},
            },
            "moments": [],
            "strengths": ["Clear opinion in the introduction"],
            "improvements": ["Add a specific example to each body paragraph"],
            "actionPlan": ["Plan two examples before writing"],
            "mechanics": {"wordCount": len(ESSAY_TEXT.split()), "sentenceCount": 6, "lexicalDiversity": 0.7, "linkingDevices": [], "underLength": True, "notes": []},
            "grader": {"name": "seeded for this check", "live": True},
        },
    }
    seeded = spage.evaluate(
        """([promptId, attempt]) => {
            for (const k of Object.keys(localStorage)) {
              let v; try { v = JSON.parse(localStorage.getItem(k)) } catch { continue }
              if (v && typeof v === 'object' && v.tests && v.tests['reading-full-001']) {
                v.writing = v.writing || {};
                v.writing[promptId] = [attempt];
                localStorage.setItem(k, JSON.stringify(v));
                return k;
              }
            }
            return null;
        }""",
        [ESSAY_PROMPT, essay_attempt],
    )
    check("setup", "the essay was added to the student's saved progress", bool(seeded), seeded)
    spage.goto(SITE + "/dashboard", wait_until="domcontentloaded")
    settle(spage, 2500)
    pushed = False
    for _ in range(30):
        status, rows = http("GET", f"{STANDIN}/rest/v1/user_state?user_id=eq.{student_id}&select=*", service=True)
        if status == 200 and rows and ((rows[0].get("progress") or {}).get("writing") or {}).get(ESSAY_PROMPT):
            pushed = True
            break
        time.sleep(1)
    check("setup", "the site's sync pushed the essay to the account (user_state)", pushed)

    # ── 3. The owner opens the student's test on /admin ──
    actx = new_ctx(browser)
    apage = actx.new_page()
    watch(apage, "admin")
    sign_up(apage, ADMIN)
    row = open_student(apage, STUDENT)
    check("admin", "the student's row shows a Tests section and a Writing section",
          row.locator(".admin-work-section h3", has_text="Tests").count() == 1 and row.locator(".admin-work-section h3", has_text="Writing").count() == 1)
    line = row.locator(".admin-work-line", has_text="Reading test 1").first
    line_text = line.inner_text()
    check("admin", "the attempt is listed with its score and band", f"{right_count}/40" in line_text and "Band" in line_text, line_text)
    check("admin", "the speaking line says only scores are kept", "no recordings" in row.locator(".admin-work-speaking").inner_text())
    shot(apage, "03-admin-student-tests-and-writing")

    open_attempt(apage, row)
    items = apage.locator(".admin-q")
    check("attempt", "every question of the paper is listed (40)", items.count() == 40, items.count())
    numbers = apage.locator(".admin-q-num").all_inner_texts()
    check("attempt", "questions are numbered in order 1 to 40", numbers == [str(i) for i in range(1, 41)], numbers[:5])
    for qid, (state, correct, prompt) in EXPECT.items():
        li = apage.locator(f".admin-q[data-question='{qid}']")
        cls = li.get_attribute("class") or ""
        given_text = li.locator(".admin-q-answers div").nth(0).locator("dd").inner_text()
        correct_text = li.locator(".admin-q-answers div").nth(1).locator("dd").inner_text()
        stored_given = stored.get(qid, {}).get("firstAnswer", "")
        want_given = "No answer" if state == "blank" else stored_given
        check("attempt", f"{qid}: marked {state}", f"is-{state}" in cls, cls)
        check("attempt", f"{qid}: shows the student's answer ({want_given})", given_text == want_given, given_text)
        check("attempt", f"{qid}: shows the correct answer ({correct})", correct.lower() in correct_text.lower(), correct_text)
        if prompt:
            check("attempt", f"{qid}: shows the question text", prompt in li.locator(".admin-q-prompt").inner_text())
    mark_labels = apage.locator(".admin-q[data-question='q2'] .admin-mark .sr-only").inner_text()
    check("attempt", "the wrong mark has a spoken label for screen readers", mark_labels == "Wrong", mark_labels)
    why = apage.locator(".admin-q-why").first
    check("attempt", "explanations are folded away at first", why.count() == 1 and why.get_attribute("open") is None)
    why.locator("summary").click()
    apage.wait_for_timeout(300)
    check("attempt", "an explanation opens under its question", why.locator("p, blockquote").first.is_visible())
    shot(apage, "04-admin-attempt-all-questions")

    apage.get_by_role("button", name=re.compile(r"^Wrong only", re.I)).click()
    apage.wait_for_timeout(400)
    shown = apage.locator(".admin-q")
    check("attempt", "Wrong only hides every right answer", apage.locator(".admin-q.is-right").count() == 0)
    check("attempt", f"Wrong only shows the {40 - right_count} wrong or blank questions", shown.count() == 40 - right_count, shown.count())
    check("attempt", "Wrong only keeps the blank question", apage.locator(".admin-q[data-question='q3']").count() == 1)
    shot(apage, "05-admin-attempt-wrong-only")

    apage.get_by_role("button", name=re.compile("Back to all work")).click()
    apage.wait_for_selector(".admin-work-section", timeout=10000)
    check("attempt", "Back returns to the list of work", apage.locator(".admin-work-line", has_text="Reading test 1").count() == 1)

    # ── 4. The essay ──
    row.locator(".admin-work-line", has_text="Primary schools").first.click()
    apage.wait_for_selector(".admin-essay-text", timeout=20000)
    apage.wait_for_timeout(800)
    essay_shown = apage.locator(".admin-essay-text").inner_text()
    check("essay", "the essay text is shown in full", essay_shown.strip() == ESSAY_TEXT.strip(), essay_shown[:80])
    task_text = apage.locator(".admin-essay-task").first.inner_text() if apage.locator(".admin-essay-task").count() else ""
    check("essay", "the task the student answered is shown", "primary schools focus too much on formal learning" in task_text.lower(), task_text[:80])
    meta = apage.locator(".admin-focus-meta").inner_text()
    check("essay", "the overall band and word count are shown", "Band 6.5" in meta and "words" in meta, meta)
    bands = apage.locator(".admin-essay-bands li").all_inner_texts()
    check("essay", "each criterion band is shown with its comment", any("Task response" in b and "7.0" in b and "clear position" in b.lower() for b in bands), bands)
    check("essay", "strengths and improvements are shown", apage.locator(".admin-essay-list").count() >= 2)
    shot(apage, "06-admin-essay")

    # ── 5. Phone width 390 ──
    pctx = new_ctx(browser, 390, 844)
    ppage = pctx.new_page()
    watch(ppage, "admin-phone")
    sign_in(ppage, ADMIN)
    prow = open_student(ppage, STUDENT)
    w = no_sideways_scroll(ppage)
    check("phone", "student row with work: no sideways scroll at 390", w["doc"] <= w["view"] and w["body"] <= w["view"], w)
    shot(ppage, "07-phone-student-work")
    open_attempt(ppage, prow)
    w = no_sideways_scroll(ppage)
    check("phone", "opened attempt: no sideways scroll at 390", w["doc"] <= w["view"] and w["body"] <= w["view"], w)
    shot(ppage, "08-phone-attempt", full=False)
    ppage.locator(".admin-q-list").screenshot(path=str(OUT / "shots" / "08b-phone-attempt-questions.png"))
    ppage.get_by_role("button", name=re.compile("Back to all work")).click()
    ppage.wait_for_selector(".admin-work-section", timeout=10000)
    prow.locator(".admin-work-line", has_text="Primary schools").first.click()
    ppage.wait_for_selector(".admin-essay-text", timeout=20000)
    ppage.wait_for_timeout(600)
    w = no_sideways_scroll(ppage)
    check("phone", "opened essay: no sideways scroll at 390", w["doc"] <= w["view"] and w["body"] <= w["view"], w)
    shot(ppage, "09-phone-essay")

    # ── 6. A student who is not an admin sees nothing ──
    spage.goto(SITE + "/admin", wait_until="domcontentloaded")
    settle(spage, 1500)
    body = spage.locator("body").inner_text()
    check("locked", "a student opening /admin is told the page is not available", "isn’t available" in body or "isn't available" in body, body[:200])
    check("locked", "a student opening /admin sees no one's work", "Reading test 1" not in body and ESSAY_TEXT[:40] not in body and ADMIN not in body and ".admin-work" and spage.locator(".admin-work, .admin-list").count() == 0)
    shot(spage, "10-student-opens-admin")
    stoken = token_of(spage)
    status, answer = http("POST", f"{STANDIN}/rest/v1/rpc/admin_student_work", {"p_user": student_id}, token=stoken)
    check("locked", "the database refuses a student asking for their own work through the admin function", status == 403 and isinstance(answer, dict) and answer.get("code") == "42501", (status, answer))
    status, answer = http("POST", f"{STANDIN}/rest/v1/rpc/admin_student_work", {"p_user": student_id})
    check("locked", "the database refuses a signed-out caller", status in (401, 403) and isinstance(answer, dict) and answer.get("code") == "42501", (status, answer))
    status, answer = http("POST", f"{STANDIN}/rest/v1/rpc/admin_student_work", {"p_user": student_id}, token=token_of(apage))
    check("locked", "the same call as the admin returns the work", status == 200 and len(answer.get("tests", [])) >= 1 and len(answer.get("writing", [])) == 1, status)

    browser.close()

failed = [r for r in results if not r["ok"]]
(OUT / "results.json").write_text(json.dumps({"stamp": STAMP, "student": STUDENT, "checks": results, "pageErrors": errors,
                                               "passed": len(results) - len(failed), "failed": len(failed)}, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"\n{len(results) - len(failed)} / {len(results)} passed; {len(errors)} console or page errors")
for e in errors[:20]:
    print("ERROR", e)
sys.exit(1 if failed else 0)
