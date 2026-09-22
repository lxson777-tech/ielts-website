"""Scenario 19 - /report document width and certainty badge containment.

Reproduces and closes finding 5 of docs/audits/
claude-personal-learning-review-2026-09-22.md: the translated certainty
badges in the two-column skill-trend grid were `white-space: nowrap`
inside a row with no wrapping allowed, so at a 390px document
/report?lang=ru measured 417px wide
(docs/audits/claude-review-2026-09-22/report-overflow.py,
docs/audits/claude-review-2026-09-22/s15-05-report-ru-phone.png). The fix
(src/styles/learning-progress.css: .skill-trend-head gets flex-wrap so the
badge can drop to its own line under the paper title, and the grid drops
to one column below 391px, where even a single stacked badge would not
fit) is verified here two ways: the document must never be wider than the
viewport, and separately, no certainty badge's own rendered box may
extend past its card's box (a badge that breaks its card's edge would
still be a defect even on a width where it happens not to widen the whole
document).

Run against the FROZEN preview once the lead has rebuilt it (this script
must NOT be run against a dev server that has not picked up the CSS
change - see BUILDER-RULES.md and this package's own report for why it
was only reasoned about locally here, never executed against a server).

Seeding follows f16_progress.py: SYNTHETIC-matching-headings (the audit's
own student) for the populated report. The empty report seeds no progress
and no saved plan at all, the same "genuinely empty storage" case
final_helpers/README.md describes - the report still has to render four
"Unknown" panels and stay inside the viewport.
"""
import json

from playwright.sync_api import sync_playwright

from final_helpers import (
    BASE_URL,
    assert_on,
    attach_diagnostics,
    goto,
    new_context,
    no_horizontal_scroll,
    progress_v1,
    report_diagnostics,
    seed_context,
    shot,
    skill_trend_cards,
    synthetic_matching_headings,
    write_note,
    write_row,
    write_section,
)

# The task's required matrix: two phone widths either side of the 391px
# one/two-column breakpoint, plus desktop.
WIDTHS = (320, 390, 1440)


def badge_overflow(page):
    """Every certainty badge's own bounding box against its card's
    bounding box, read straight from the real rendered DOM (not
    inferred from a screenshot)."""
    return page.evaluate(
        """() => Array.from(document.querySelectorAll('.skill-trend-certainty')).map((el) => {
            const card = el.closest('.skill-trend-card');
            const b = el.getBoundingClientRect();
            const c = card ? card.getBoundingClientRect() : null;
            return {
                text: el.textContent.trim(),
                hasCard: !!card,
                overflowsCard: !c || b.right > c.right + 0.5 || b.left < c.left - 0.5,
                badgeRight: c ? Math.round(b.right * 10) / 10 : null,
                cardRight: c ? Math.round(c.right * 10) / 10 : null,
            };
        })"""
    )


def check_widths(page, report_label, path, lang):
    for width in WIDTHS:
        page.set_viewport_size({"width": width, "height": 900})
        page.wait_for_timeout(200)
        scroll_ok = no_horizontal_scroll(page)
        widths = page.evaluate(
            "() => ({scrollWidth: document.documentElement.scrollWidth, "
            "clientWidth: document.documentElement.clientWidth})"
        )
        write_row(
            f"[{lang.upper()} {width}px] {report_label} report: document is never wider than "
            "the viewport",
            scroll_ok,
            f"documentElement.scrollWidth={widths['scrollWidth']}, "
            f"clientWidth={widths['clientWidth']} (viewport set to {width}px)",
        )
        badges = badge_overflow(page)
        bad = [b for b in badges if b["overflowsCard"]]
        write_row(
            f"[{lang.upper()} {width}px] {report_label} report: no certainty badge extends "
            "past its own card",
            not bad,
            f"{len(badges)} badge(s) checked, {len(bad)} overflowing their card: "
            f"{json.dumps(bad, ensure_ascii=False)[:600]}",
        )
        shot(page, f"f19-{report_label}-{lang}-{width}", path)
    # leave every context at a normal desktop size before the next check
    page.set_viewport_size({"width": 1440, "height": 900})
    page.wait_for_timeout(150)


def run(base_url: str = BASE_URL):
    write_section(
        "Scenario 19: /report document width and certainty badge containment (finding 5)",
        "A populated report (SYNTHETIC-matching-headings, seeded the way f16_progress.py "
        "does) and an empty one (no progress, no saved plan), at 320px, 390px and 1440px, in "
        "English and Russian. Two independent checks per width: no document-level horizontal "
        "overflow, and no certainty badge breaking its own card's edge.",
    )
    progress, plan = synthetic_matching_headings()

    with sync_playwright() as p:
        browser = p.chromium.launch()

        for report_label, seed_progress, seed_plan in (
            ("populated", progress, plan),
            ("empty", progress_v1(), None),
        ):
            for lang in ("en", "ru"):
                context = new_context(browser, viewport={"width": 1440, "height": 900})
                seed_context(context, progress=seed_progress, saved_plan=seed_plan)
                page = context.new_page()
                errors, failed = attach_diagnostics(page)

                path = "/report"
                url = base_url + path + ("?lang=ru" if lang == "ru" else "")
                page.goto(url, wait_until="load")
                page.wait_for_timeout(2400)
                assert_on(page, f"the {report_label} report ({lang})", path)

                cards = skill_trend_cards(page)
                write_note(
                    f"**{report_label} report, {lang}: skill panels found:** "
                    + json.dumps(cards, ensure_ascii=False)[:900]
                )
                write_row(
                    f"[{lang.upper()}] {report_label} report: four skill panels rendered "
                    "(the certainty badges being checked actually exist)",
                    len(cards) == 4,
                    f"panels found = {[c.get('paper') for c in cards]}",
                )

                check_widths(page, report_label, path, lang)

                report_diagnostics(f"Scenario 19 ({report_label}, {lang})", errors, failed)
                context.close()

        browser.close()


if __name__ == "__main__":
    run()
