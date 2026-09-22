"""Scenario 14 - Coverage: every route the library offers actually works.

Collects links from the Course library (both toggles), the practice hub, the
tests hub, /review, every focused-exercise route named in the generated
index at /data/learning-index.json, and the speaking-focus routes. Every one
is fetched over HTTP and must answer 200. A representative set of every
family is then RENDERED in the browser and must produce no console error.
Anything in the index with no route, or any route the interface never links
to, is listed as an orphan.
"""
import json
import re
from pathlib import Path

from playwright.sync_api import sync_playwright

from final_helpers import (
    BASE_URL,
    assert_on,
    attach_diagnostics,
    goto,
    new_context,
    report_diagnostics,
    write_note,
    write_row,
    write_section,
)

HUBS = ["/dashboard", "/start", "/learn", "/trainers", "/tests", "/review", "/report",
        "/plan-settings", "/account", "/trainers/reading", "/trainers/listening",
        "/trainers/writing", "/trainers/speaking", "/speaking/cue-cards", "/writing/models",
        "/writing/checker", "/learn/bands", "/tests/mock", "/speaking/examiner"]

REPO = Path(__file__).resolve().parents[2]


def spoken_focus_ids():
    """The speaking-focus routes are keyed on the SPOKEN_FOCUSED_TASKS ids,
    not on the prompt ids the generated index lists (the index's
    speakingPrompts are the SOURCE a task resolves against, which is a
    different thing). They are enumerated here straight out of the task
    files so this check cannot drift from what the site actually builds."""
    ids = []
    for path in sorted((REPO / "src" / "data" / "focused").glob("speaking-*.ts")):
        text = path.read_text(encoding="utf-8")
        ids += re.findall(r"^\s*id:\s*'([^']+)',", text, flags=re.M)
    return sorted(set(ids))


def run(base_url: str = BASE_URL):
    write_section(
        "Scenario 14: Coverage and orphans",
        "Every link the Course library, the practice hub, the tests hub, /review and the generated "
        "activity index offer, fetched and checked. A representative page from every family is "
        "also rendered so console errors can be caught.",
    )
    origin = base_url.split("/ielts-website")[0]
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = new_context(browser)
        page = context.new_page()
        errors, failed = attach_diagnostics(page)

        # ── the generated index ──────────────────────────────────────────
        index = page.request.get(base_url + "/data/learning-index.json")
        write_row("The generated activity index is served", index.status == 200,
                  f"GET /data/learning-index.json -> {index.status}")
        data = index.json() if index.status == 200 else {}
        focused_ids = [x["id"] for x in data.get("focusedExercises", [])]
        prompt_ids = [x["id"] for x in data.get("speakingPrompts", [])]
        speaking_ids = spoken_focus_ids()
        test_ids = [x["id"] for x in data.get("tests", [])]
        vocab_slugs = [x["slug"] for x in data.get("vocabTopics", [])]
        write_note(
            f"**Index contents:** {len(focused_ids)} focused exercises, {len(test_ids)} full "
            f"papers, {len(data.get('drills', []))} drills, {len(data.get('lessonChecks', []))} "
            f"lesson checks, {len(prompt_ids)} speaking prompts, {len(vocab_slugs)} vocabulary "
            f"topics. Separately, {len(speaking_ids)} speaking-focus task routes: {speaking_ids}"
        )

        # ── collect every link the interface offers ──────────────────────
        collected = {}
        for hub in HUBS:
            goto(page, hub)
            page.wait_for_timeout(1500)
            links = page.evaluate(
                """() => Array.from(document.querySelectorAll('a[href]'))
                    .map((a) => a.getAttribute('href'))
                    .filter((h) => h && h.startsWith('/ielts-website'))"""
            )
            if hub == "/start":
                # also the "Browse all lessons" half of the Course page
                toggle = page.get_by_role("button", name="Browse all lessons")
                if toggle.count():
                    toggle.first.click()
                    page.wait_for_timeout(1500)
                    links += page.evaluate(
                        """() => Array.from(document.querySelectorAll('a[href]'))
                            .map((a) => a.getAttribute('href'))
                            .filter((h) => h && h.startsWith('/ielts-website'))"""
                    )
            collected[hub] = sorted(set(links))
        linked = sorted({href.split("#")[0] for hrefs in collected.values() for href in hrefs})
        write_row("Every hub page was reachable to crawl",
                  all(len(v) > 0 for v in collected.values()),
                  ", ".join(f"{k}: {len(v)} link(s)" for k, v in collected.items()))
        write_note(f"**{len(linked)} distinct internal links collected from the hubs.**")

        # ── every focused-exercise and speaking-focus route ──────────────
        generated = ([f"/ielts-website/trainers/focused/{i}" for i in focused_ids]
                     + [f"/ielts-website/trainers/speaking-focus/{i}" for i in speaking_ids])
        to_check = sorted(set(linked) | set(generated)
                          | {f"/ielts-website{h}" for h in HUBS})

        bad = []
        for path in to_check:
            url = origin + path
            try:
                resp = page.request.get(url)
                if resp.status != 200:
                    bad.append(f"{resp.status} {path}")
            except Exception as exc:
                bad.append(f"ERROR {path} ({type(exc).__name__})")
        write_row(
            f"All {len(to_check)} routes answer 200",
            not bad,
            f"non-200 or failed routes: {bad[:25] or 'none'}"
            + (f" (+{len(bad) - 25} more)" if len(bad) > 25 else ""),
        )

        # ── orphans ──────────────────────────────────────────────────────
        orphan_focused = [i for i in focused_ids
                          if f"/ielts-website/trainers/focused/{i}" not in linked]
        orphan_speaking = [i for i in speaking_ids
                           if f"/ielts-website/trainers/speaking-focus/{i}" not in linked]
        write_note(
            "**Routes that exist and work but are not linked from any hub page crawled here** "
            "(they are reached from inside a session step or a lesson, which is by design for "
            f"focused practice): {len(orphan_focused)} focused exercises, "
            f"{len(orphan_speaking)} speaking-focus prompts. First few focused: "
            f"{orphan_focused[:6]}"
        )
        broken_links = [b for b in bad if b.split(" ", 1)[-1] in linked]
        write_row(
            "No link in the interface points at a route that does not exist "
            "(the reverse direction, which is the one that breaks students)",
            not broken_links,
            f"broken interface links = {broken_links[:20] or 'none'}",
        )

        report_diagnostics("Scenario 14 (crawl)", errors, failed)
        context.close()

        # ── render one page from every family and watch the console ──────
        sample = ([f"/{h.lstrip('/')}" for h in HUBS]
                  + [f"/trainers/focused/{i}" for i in focused_ids[:6]]
                  + [f"/trainers/focused/{i}" for i in focused_ids[-6:]]
                  + [f"/trainers/speaking-focus/{i}" for i in speaking_ids[:4]]
                  + [f"/tests/{test_ids[0]}", f"/tests/{test_ids[-1]}"]
                  + ["/trainers/reading/reading-full-006-drill-p2",
                     "/lessons/reading/headings", "/lessons/writing/opinion",
                     "/lessons/listening/section1", "/lessons/speaking-part1",
                     "/lessons/vocabulary"]
                  + [f"/lessons/vocabulary/{vocab_slugs[0]}"])
        sample = [s for s in dict.fromkeys(sample)]
        context = new_context(browser)
        page = context.new_page()
        per_page_errors = {}
        for path in sample:
            errs = []
            fails = []
            handler_c = lambda m, e=errs: e.append(m.text) if m.type == "error" else None
            handler_r = lambda r, f=fails: f.append(f"{r.status} {r.url}") if r.status >= 400 else None
            page.on("console", handler_c)
            page.on("response", handler_r)
            try:
                page.goto(base_url + path, wait_until="load")
                page.wait_for_timeout(1300)
            except Exception as exc:
                errs.append(f"NAVIGATION FAILED: {type(exc).__name__}")
            page.remove_listener("console", handler_c)
            page.remove_listener("response", handler_r)
            if errs or fails:
                per_page_errors[path] = {"console": errs[:4], "http": fails[:4]}
        write_row(
            f"None of the {len(sample)} rendered pages produced a console error or a failed request",
            not per_page_errors,
            json.dumps(per_page_errors)[:1400] if per_page_errors else "clean",
        )
        write_note("**Pages rendered for the console check:** " + ", ".join(sample))
        context.close()
        browser.close()


if __name__ == "__main__":
    run()
