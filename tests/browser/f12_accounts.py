"""Scenario 12 - Accounts and owner isolation.

WHAT CANNOT BE TESTED HERE, AND WHY, SAID PLAINLY
Real account behaviour cannot be verified on this run. There is no Supabase
on this snapshot and signing in to a real account is prohibited for this
test run, so none of the following was observed and none of it is claimed:
two real students on one browser, two devices reconciling, a stale-plan
overwrite, or a duplicate push. Those need a live Supabase project and two
real accounts.

WHAT CAN BE TESTED HERE
The local half of the isolation guarantee. src/lib/learning/store.browser.ts
puts the owner INSIDE the storage key
(`ielts.learning.record.v1::<owner>`, owner = `anon:<deviceId>` or
`u:<userId>`). So: seed a foreign signed-in student's record under
`u:SYNTHETIC-other-student` alongside this browser's own anonymous work, and
prove the signed-out session never reads the foreign record.
"""
import json

from playwright.sync_api import sync_playwright

from final_helpers import (
    BASE_URL,
    NS_SEP,
    RECORD_KEY,
    USER_PREFIX,
    assert_on,
    attach_diagnostics,
    days_after,
    days_before,
    goto,
    new_context,
    progress_v1,
    owner_namespace,
    read_record,
    report_diagnostics,
    saved_plan,
    seed_context,
    shot,
    skill_trend_cards,
    test_attempt,
    today_view,
    write_note,
    write_row,
    write_section,
)

FOREIGN_OWNER = USER_PREFIX + "SYNTHETIC-other-student"
FOREIGN_MARK = "SYNTHETIC-OTHER-STUDENT-SHOULD-NEVER-APPEAR"

FOREIGN_RECORD = {
    "version": 1,
    "events": [{
        "id": "ev:synthetic-foreign-1",
        "at": "2026-09-20T09:00:00.000Z",
        "localDate": "2026-09-20",
        "activityId": "focus:writing-task2-conclusion-guided",
        "activityTitle": FOREIGN_MARK,
        "paper": "writing",
        "subskill": "conclusion",
        "mode": "assessment",
        "completion": "completed",
        "items": [],
    }],
    "exposure": [{"key": "paper:reading-full-040", "firstSeenAt": "2026-09-20T09:00:00.000Z",
                  "lastSeenAt": "2026-09-20T09:00:00.000Z", "occasions": 1}],
    "selfReported": [{"paper": "speaking", "band": 8.5, "takenOn": "2026-09-01",
                      "note": FOREIGN_MARK}],
    "migrations": [],
}


def run(base_url: str = BASE_URL):
    write_section(
        "Scenario 12: Accounts and owner isolation",
        "**Real-account behaviour is NOT verified on this run and is not claimed.** No Supabase "
        "exists on this snapshot and signing in is prohibited for this test run. What is tested "
        "here is the local owner-namespacing guarantee: a foreign signed-in student's record is "
        "planted in the same browser and must never be read by the signed-out session.",
    )
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = new_context(browser)
        # this browser's own anonymous returning-student work
        own_progress = progress_v1(
            tests={"reading-full-001": [test_attempt(
                days_before(4) + "T09:00:00.000Z", 24, 40, 6, "6.0", 2400,
                by_type={"matching-headings": {"correct": 2, "total": 8}}, skill="reading")]},
        )
        seed_context(
            context,
            progress=own_progress,
            saved_plan=saved_plan(target_band="7.0", test_date=days_after(40),
                                  created_at="2026-08-01T09:00:00.000Z", daily_minutes=60,
                                  study_days="daily", defaulted=False),
            extra={f"{RECORD_KEY}{NS_SEP}{FOREIGN_OWNER}": json.dumps(FOREIGN_RECORD)},
        )
        page = context.new_page()
        errors, failed = attach_diagnostics(page)

        goto(page, "/dashboard")
        page.wait_for_timeout(2000)
        assert_on(page, "Today as the anonymous owner of this browser", "/dashboard", "", "#today-heading")
        owner = owner_namespace(page)
        keys = page.evaluate("() => Object.keys(window.localStorage).sort()")
        write_note(f"**localStorage keys in this browser:** {keys}")
        write_row(
            "The learner record is stored under a key that names its owner",
            bool(owner) and owner.startswith("anon:"),
            f'the record namespace this session loaded = "{owner}", and a foreign record is '
            f'sitting beside it under "{RECORD_KEY}{NS_SEP}{FOREIGN_OWNER}"',
        )
        write_row(
            "The foreign student's record is still physically present in the browser "
            "(so the check below means something)",
            any(FOREIGN_OWNER in k for k in keys),
            f'foreign key present = {any(FOREIGN_OWNER in k for k in keys)}',
        )

        mine = read_record(page)
        mine_json = json.dumps(mine)
        write_row(
            "The session reads ONLY its own record: nothing from the foreign student leaks in",
            FOREIGN_MARK not in mine_json,
            "the foreign marker string appears in the record this session loaded = "
            f"{FOREIGN_MARK in mine_json}",
        )

        v = today_view(page)
        body = page.inner_text("body")
        write_row(
            "Nothing from the foreign student appears anywhere on Today",
            FOREIGN_MARK not in body and "8.5" not in (v["objective"] or ""),
            f'foreign marker on the page = {FOREIGN_MARK in body}; '
            f'Today reads kicker="{v["kicker"]}", objective="{v["objective"]}"',
        )
        shot(page, "s12-01-today-owner-isolated-desktop", "/dashboard")

        goto(page, "/report")
        page.wait_for_timeout(2400)
        assert_on(page, "the progress report", "/report", "Your progress")
        report_body = page.inner_text("body")
        cards = skill_trend_cards(page)
        speaking = next((c for c in cards if c["paper"] == "Speaking"), {})
        write_row(
            "The report shows no trace of the foreign student, including their self-reported "
            "Speaking 8.5",
            FOREIGN_MARK not in report_body and "8.5" not in (speaking.get("band") or ""),
            f'foreign marker on the report = {FOREIGN_MARK in report_body}; '
            f'the Speaking panel reads {json.dumps(speaking)}',
        )
        shot(page, "s12-02-report-owner-isolated-desktop", "/report")

        write_row(
            "Real two-account and two-device behaviour was verified",
            False,
            "NOT TESTED AND NOT CLAIMED. There is no Supabase on this frozen snapshot and signing "
            "in to a real account is prohibited for this run, so two students on one browser, two "
            "devices reconciling, duplicate pushes and stale-plan overwrites were not exercised. "
            "The local owner-namespacing above is the only part of scenario 12 this run can show.",
        )

        report_diagnostics("Scenario 12", errors, failed)
        context.close()
        browser.close()


if __name__ == "__main__":
    run()
