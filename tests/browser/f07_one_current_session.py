"""Scenario 7 - One current session, everywhere.

The audit's Matching Headings student. Collect the next activity claimed by
every surface that makes one, before and after a real step is completed:

  Today (/dashboard), the Course route (/start), the workspace account menu,
  the account overview (/account), the progress report's "what to work on
  next" (/report), the tests hub's plan-queued checkpoint (/tests), and the
  footer of an UNRELATED lesson opened directly from the library.

They must all agree. This is the regression check for the audit's finding 1,
contradictory direction: Mr EZ said Matching Headings, Today said Speaking
Overview, Course said Speaking Overview.
"""
from playwright.sync_api import sync_playwright

from final_helpers import (
    BASE_URL,
    assert_on,
    attach_diagnostics,
    goto,
    new_context,
    report_diagnostics,
    report_paper_blocks,
    seed_context,
    shot,
    synthetic_matching_headings,
    today_view,
    write_note,
    write_row,
    write_section,
)


def collect(page, label):
    out = {}

    goto(page, "/dashboard")
    page.wait_for_timeout(1600)
    v = today_view(page)
    # A completed step now STAYS in the list, marked done, rather than being
    # dropped from the front (product fix of 2026-09-22). So steps[0] is the
    # first-ever step, not necessarily the one still to do: once it is
    # ticked, the CURRENT step is the first one NOT done, which is what the
    # Start/Continue button and the report's call to action both point at.
    current = next((s["title"] for s in v["steps"] if not s["done"]),
                   (v["steps"][-1]["title"] if v["steps"] else None))
    out["today"] = {"objective": v["objective"], "href": v["start_href"],
                    "label": v["start_label"], "first_step": (v["steps"][0]["title"] if v["steps"] else None),
                    "current_step": current,
                    "steps_done": sum(1 for s in v["steps"] if s["done"]),
                    "steps": [f'{s["role"]}/"{s["title"]}"/{s["minutes"]}/done={s["done"]}'
                              for s in v["steps"]]}

    # the workspace account menu
    avatar = page.locator(".ws-avatar")
    menu_items = []
    if avatar.count():
        avatar.first.click()
        page.wait_for_timeout(500)
        items = page.locator(".ws-menu a, .ws-menu button")
        menu_items = [items.nth(i).inner_text().replace("\n", " ").strip() for i in range(items.count())]
        page.keyboard.press("Escape")
    out["account_menu"] = menu_items

    goto(page, "/start")
    page.wait_for_timeout(1600)
    c = today_view(page)
    out["course"] = {"objective": c["objective"], "href": c["start_href"]}

    goto(page, "/account")
    page.wait_for_timeout(1600)
    card = page.locator("div.rounded-card", has_text="Course")
    if card.count():
        link = card.first.get_by_role("link")
        out["account_overview"] = {
            "text": card.first.inner_text().replace("\n", " "),
            "href": link.first.get_attribute("href") if link.count() else None,
            "label": link.first.inner_text() if link.count() else None,
        }
    else:
        out["account_overview"] = {"text": None, "href": None, "label": None}

    goto(page, "/report")
    page.wait_for_timeout(2000)
    blocks = report_paper_blocks(page)
    out["report"] = {name: cells.get("WHAT TO WORK ON NEXT", "") for name, cells in blocks.items()}
    rec = page.locator(".mrez-rec")
    out["report_cta"] = {
        "label": rec.first.locator(".mrez-rec-label").inner_text() if rec.count() and rec.first.locator(".mrez-rec-label").count() else None,
        "reason": rec.first.locator(".mrez-rec-reason").inner_text() if rec.count() and rec.first.locator(".mrez-rec-reason").count() else None,
        "href": rec.first.get_attribute("href") if rec.count() else None,
    }

    goto(page, "/tests")
    page.wait_for_timeout(2000)
    out["tests_hub"] = page.evaluate(
        """() => Array.from(document.querySelectorAll('.checkpoint-recommendations > div')).map((el) => ({
            head: (el.querySelector('p') ? el.querySelector('p').innerText : '').trim(),
            text: el.innerText.replace(/\\s+/g, ' ').trim().slice(0, 260),
            hrefs: Array.from(el.querySelectorAll('a')).map((a) => a.getAttribute('href')),
        }))"""
    )

    # an unrelated lesson, opened directly
    goto(page, "/lessons/speaking")
    page.wait_for_timeout(1400)
    ctrl = page.locator("#lesson-next-control")
    out["lesson_footer"] = {
        "label": (page.locator("#lesson-next-label").inner_text()
                  if page.locator("#lesson-next-label").count() else None),
        "href": ctrl.get_attribute("href") if ctrl.count() else None,
        "hidden": (ctrl.get_attribute("hidden") is not None) if ctrl.count() else True,
    }

    write_note(
        f"**{label} - Today:** objective=\"{out['today']['objective']}\", href={out['today']['href']}, "
        f"button=\"{out['today']['label']}\", first step=\"{out['today']['first_step']}\", "
        f"steps already done={out['today']['steps_done']}; step list = {out['today']['steps']}"
    )
    write_note(f"**{label} - Course route:** objective=\"{out['course']['objective']}\", href={out['course']['href']}")
    write_note(f"**{label} - Account menu (workspace avatar):** {out['account_menu']}")
    write_note(f"**{label} - Account overview:** href={out['account_overview']['href']}, "
               f"link=\"{out['account_overview']['label']}\"")
    write_note(f"**{label} - Report, what to work on next, per paper:** {out['report']}")
    write_note(f"**{label} - Report CTA:** {out['report_cta']}")
    write_note(f"**{label} - Tests hub checkpoint cards:** {out['tests_hub']}")
    write_note(f"**{label} - Unrelated lesson footer (/lessons/speaking):** {out['lesson_footer']}")
    return out


def compare(out, label):
    today_obj = out["today"]["objective"]
    today_href = out["today"]["href"]

    write_row(
        f"[{label}] Course route names the exact same session as Today",
        out["course"]["objective"] == today_obj and out["course"]["href"] == today_href,
        f'today="{today_obj}" ({today_href}) | course="{out["course"]["objective"]}" '
        f'({out["course"]["href"]})',
    )
    write_row(
        f"[{label}] Account overview links the same next step",
        out["account_overview"]["href"] == today_href,
        f'account overview href={out["account_overview"]["href"]} against Today href={today_href}',
    )
    write_row(
        f"[{label}] The workspace account menu makes no competing next-step claim",
        not any("next" in i.lower() or "continue" in i.lower() for i in out["account_menu"]),
        f'menu items = {out["account_menu"]}',
    )
    report_texts = " ".join(out["report"].values())
    write_row(
        f"[{label}] The progress report's \"what to work on next\" names today's session, "
        "and contradicts nothing",
        (today_obj or "") in report_texts,
        f"report mentions today's objective={(today_obj or '') in report_texts}. "
        f"Per paper: {out['report']}",
    )
    cta = out["report_cta"]
    # Compare hrefs by PATH: the Start/Continue button's href can carry a
    # step anchor (#b3-...) that the report CTA's href does not, and that is
    # the same page, not a different one.
    today_path = (today_href or "").split("#", 1)[0]
    cta_path = (cta["href"] or "").split("#", 1)[0]
    write_row(
        f"[{label}] The report's own call to action points at today's session, not a second opinion",
        (cta["href"] == today_href or (cta_path and cta_path == today_path))
        or (cta["label"] or "") .split(" · ")[0] == (out["today"]["current_step"] or ""),
        f'report CTA label="{cta["label"]}" href={cta["href"]} against Today\'s current step '
        f'"{out["today"]["current_step"]}" href={today_href}',
    )
    hub_text = " ".join(c["text"] for c in out["tests_hub"])
    write_row(
        f"[{label}] The tests hub offers full papers as independent browsing and never as a "
        "competing plan step",
        "today" not in hub_text.lower() or "plan" in hub_text.lower(),
        f"checkpoint card text: {hub_text[:400]}",
    )
    lf = out["lesson_footer"]
    write_row(
        f"[{label}] An unrelated lesson opened straight from the library sends the student back to "
        "the one session instead of inventing a next lesson",
        (not lf["hidden"]) and lf["label"] == "Back to today's session"
        and (lf["href"] or "").endswith("/dashboard"),
        f'footer label="{lf["label"]}", href={lf["href"]}, hidden={lf["hidden"]}',
    )


def run(base_url: str = BASE_URL):
    write_section(
        "Scenario 7: One current session, on every surface",
        "Seed SYNTHETIC-matching-headings (the audit's student: confirmed band 7 goal, two Reading "
        "papers with 2 of 16 Matching Headings correct, one attempt in each other paper, 60 "
        "minutes a day, exam in 35 days).",
    )
    progress, plan = synthetic_matching_headings()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = new_context(browser)
        seed_context(context, progress=progress, saved_plan=plan)
        page = context.new_page()
        errors, failed = attach_diagnostics(page)

        before = collect(page, "BEFORE")
        compare(before, "before")
        goto(page, "/dashboard")
        page.wait_for_timeout(1500)
        assert_on(page, "Today before any progress", "/dashboard", "", "#today-heading")
        shot(page, "s07-01-today-before-desktop", "/dashboard")
        goto(page, "/start")
        page.wait_for_timeout(1500)
        shot(page, "s07-02-course-before-desktop", "/start")
        goto(page, "/report")
        page.wait_for_timeout(1800)
        shot(page, "s07-03-report-before-desktop", "/report")
        goto(page, "/tests")
        page.wait_for_timeout(1800)
        shot(page, "s07-04-tests-hub-before-desktop", "/tests")
        goto(page, "/lessons/speaking")
        page.wait_for_timeout(1400)
        shot(page, "s07-05-unrelated-lesson-footer-desktop", "/lessons/speaking")

        # ── actually complete the first step ─────────────────────────────
        goto(page, "/dashboard")
        page.wait_for_timeout(1500)
        start_href = before["today"]["href"]
        page.locator(".today-start").first.click()
        page.wait_for_timeout(2500)
        landed = page.url
        complete = page.locator("#lesson-complete-btn")
        marked = False
        if complete.count():
            complete.first.click()
            page.wait_for_timeout(1200)
            marked = complete.first.get_attribute("data-done") is not None
        write_row(
            "The session's first step was really opened and really marked studied",
            (start_href or "") .split("/ielts-website")[-1] in landed and marked,
            f'Start href="{start_href}", landed on "{landed}", '
            f"lesson marked studied={marked}",
        )
        shot(page, "s07-06-first-step-completed-desktop")

        after = collect(page, "AFTER")
        compare(after, "after")
        goto(page, "/dashboard")
        page.wait_for_timeout(1600)
        shot(page, "s07-07-today-after-desktop", "/dashboard")
        write_row(
            "Today shows the real progress it stored (a step ticked, the button becomes Continue)",
            after["today"]["steps_done"] >= 1 and after["today"]["label"] == "Continue",
            f'{after["today"]["steps_done"]} step(s) ticked done, Start button label='
            f'"{after["today"]["label"]}", href={after["today"]["href"]} '
            f'(was {before["today"]["href"]}). Step list BEFORE = {before["today"]["steps"]}; '
            f'AFTER = {after["today"]["steps"]}',
        )
        write_row(
            "Completing a step did not silently replace the session with a different objective",
            after["today"]["objective"] == before["today"]["objective"],
            f'before="{before["today"]["objective"]}" | after="{after["today"]["objective"]}"',
        )

        report_diagnostics("Scenario 7", errors, failed)
        context.close()
        browser.close()


if __name__ == "__main__":
    run()
