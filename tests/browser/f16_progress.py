"""Scenario 16 - Progress reporting.

Seed SYNTHETIC-matching-headings, then add a self-reported score through
the real plan-settings control. The report must show:

  - four separate skill panels, never one averaged trend line;
  - certainty in words, not a number;
  - unknown shown as unknown, never as zero;
  - the self-reported score labelled self-reported, with its date;
  - "not counted" reasons where they apply;
  - what changed in the plan, quoted;
  - no percentage of the library presented as readiness.
"""
import json
import re

from playwright.sync_api import sync_playwright

from final_helpers import (
    BASE_URL,
    assert_on,
    attach_diagnostics,
    dual_shot,
    goto,
    new_context,
    read_record,
    report_paper_blocks,
    report_diagnostics,
    seed_context,
    shot,
    skill_trend_cards,
    synthetic_matching_headings,
    write_note,
    write_row,
    write_section,
)


def run(base_url: str = BASE_URL):
    write_section(
        "Scenario 16: Progress reporting",
        "Seed SYNTHETIC-matching-headings, then add a self-reported band through the real "
        '"Add a recent score, if you have one" control in plan settings.',
    )
    progress, plan = synthetic_matching_headings()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = new_context(browser)
        seed_context(context, progress=progress, saved_plan=plan)
        page = context.new_page()
        errors, failed = attach_diagnostics(page)

        # ── add a self-reported score the honest way ─────────────────────
        goto(page, "/plan-settings")
        page.wait_for_timeout(2000)
        assert_on(page, "plan settings", "/plan-settings", "Your study plan")
        det = page.locator("details", has_text="Add a recent score")
        opened = False
        if det.count():
            det.first.locator("summary").click()
            page.wait_for_timeout(600)
            opened = det.first.locator("select, input").first.is_visible()
        write_row('The "Add a recent score" control exists and opens', opened,
                  f"details present={det.count()}, fields visible={opened}")
        fields = page.evaluate(
            """() => {
                const d = Array.from(document.querySelectorAll('details'))
                    .find((el) => el.innerText.includes('Add a recent score'));
                if (!d) return null;
                return {
                    selects: Array.from(d.querySelectorAll('select')).map((s) => ({
                        id: s.id, options: Array.from(s.options).map((o) => o.value) })),
                    inputs: Array.from(d.querySelectorAll('input')).map((i) => ({ id: i.id, type: i.type })),
                    buttons: Array.from(d.querySelectorAll('button')).map((b) => b.innerText.trim()),
                    helper: (d.querySelector('p') || {}).innerText,
                };
            }"""
        )
        write_note("**Self-report form fields:** " + json.dumps(fields)[:900])
        saved_self = False
        if fields:
            for s in fields["selects"]:
                try:
                    sel = page.locator(f'#{s["id"]}') if s["id"] else None
                    if sel is None or not sel.count():
                        continue
                    opts = s["options"]
                    if any(o in ("speaking", "reading", "listening", "writing") for o in opts):
                        sel.select_option("speaking")
                    elif any(re.fullmatch(r"\d(\.\d)?", o or "") for o in opts):
                        sel.select_option("6.5")
                except Exception:
                    pass
            for i in fields["inputs"]:
                if i["type"] == "date" and i["id"]:
                    try:
                        page.locator(f'#{i["id"]}').fill("2026-08-15")
                    except Exception:
                        pass
            save_self = page.get_by_role("button", name=re.compile("save", re.I))
            for n in range(save_self.count()):
                label = save_self.nth(n).inner_text().lower()
                if "score" in label or "self" in label or "add" in label:
                    save_self.nth(n).click()
                    page.wait_for_timeout(1200)
                    saved_self = True
                    break
            if not saved_self:
                btns = page.locator("details button", has_text=re.compile("save|add", re.I))
                if btns.count():
                    btns.first.click()
                    page.wait_for_timeout(1200)
                    saved_self = True
        status = page.locator("text=Saved as self-reported")
        write_row(
            "A self-reported score can be recorded, and is labelled self-reported when saved",
            saved_self and status.count() > 0,
            f'save attempted={saved_self}, confirmation "Saved as self-reported" shown='
            f"{status.count() > 0}",
        )
        shot(page, "s16-01-self-reported-score-saved-desktop", "/plan-settings")
        record = read_record(page)
        write_note("**Self-reported entries on the record:** "
                   + json.dumps((record or {}).get("selfReported"))[:500])

        # ── the report ───────────────────────────────────────────────────
        goto(page, "/report")
        page.wait_for_timeout(2600)
        assert_on(page, "the progress report", "/report", "Your progress")
        cards = skill_trend_cards(page)
        write_note("**Four skill panels:** " + json.dumps(cards))
        write_row(
            "Four separate skill panels, one per paper",
            len(cards) == 4 and {c["paper"] for c in cards} == {"Reading", "Listening",
                                                                "Writing", "Speaking"},
            f"panels found = {[c['paper'] for c in cards]}",
        )
        body = page.inner_text("body")
        write_row(
            "The report says outright that the four are never averaged into one line",
            "never averaged" in body.lower() or "not the same scale" in body.lower(),
            "looked for the no-single-trend-line statement; present = "
            f"{'never averaged' in body.lower() or 'not the same scale' in body.lower()}",
        )
        certainties = [c["certainty"] for c in cards]
        write_row(
            "Certainty is in words, with no number or percentage",
            all(c and not re.search(r"\d|%", c) for c in certainties),
            f"certainty labels = {certainties}",
        )
        zeroed = [c for c in cards
                  if "unknown" in (c["certainty"] or "").lower()
                  and re.search(r"\b0(\.0)?\b", c["band"] or "")]
        write_row(
            "Unknown is shown as unknown, never as zero",
            not zeroed,
            f"panels claiming a zero band while certainty is unknown = {zeroed or 'none'}; "
            f"band lines = {[c['band'] for c in cards]}",
        )
        self_labelled = page.get_by_text("self-reported", exact=False)
        self_texts = [self_labelled.nth(i).inner_text().replace("\n", " ")
                      for i in range(min(self_labelled.count(), 6))]
        # The date lives in its OWN list item next to the "self-reported"
        # label (ProgressReport.tsx's SelfReportedScores: a heading, an
        # explanatory paragraph, then one <li> per score with its date), not
        # inside the same text node as the word "self-reported" itself. So
        # "dated" has to be read from the whole self-reported block, not
        # only from the elements that happen to contain that literal word -
        # checking self_texts alone is why this used to read as a gap when
        # the date was really right there, one line down.
        self_block = page.locator(".report-self-reported")
        block_text = self_block.first.inner_text().replace("\n", " ") if self_block.count() else ""
        dated = bool(re.search(r"20\d\d", block_text) or "Aug" in block_text
                     or re.search(r"\b15\b", block_text))
        mentions_band = "6.5" in body
        mentions_date = "15 Aug" in body or "2026-08-15" in body or "Aug 2026" in body
        write_row(
            "The self-reported score is labelled self-reported AND carries its date",
            self_labelled.count() > 0 and dated,
            f"{self_labelled.count()} occurrence(s) of the words 'self-reported' on the report: "
            f"{json.dumps(self_texts)[:400]}. Self-reported block text: \"{block_text[:300]}\". "
            f"The band 6.5 appears anywhere on the page={mentions_band}; its date (15 August 2026) "
            f"appears={mentions_date}.",
        )
        blocks = report_paper_blocks(page)
        write_note("**Per-paper panels on the report:** " + json.dumps(blocks)[:2200])
        uncertain_texts = " ".join(
            cells.get("WHAT REMAINS UNCERTAIN", "") for cells in blocks.values())
        write_row(
            "Where something was not counted, the report says so and says why",
            "not counted" in body.lower() or "kept to limited confidence" in uncertain_texts.lower()
            or "does not count" in body.lower(),
            f'"not counted" on the page = {"not counted" in body.lower()}; '
            f'the uncertainty column reads: "{uncertain_texts[:420]}"',
        )
        changed = [cells.get("WHAT CHANGED IN THE SCHEDULE, AND WHY", "")
                   for cells in blocks.values()]
        quoted = [c for c in changed if "“" in c or '"' in c]
        write_row(
            "What changed in the plan is quoted back, not paraphrased",
            bool(quoted),
            f"quoted change lines = {json.dumps(quoted)[:500]}",
        )
        percent_readiness = page.evaluate(
            """() => {
                const out = [];
                for (const el of document.querySelectorAll('*')) {
                    if (el.children.length) continue;
                    const t = (el.innerText || '').trim();
                    if (/%/.test(t)) out.push(t.slice(0, 80));
                }
                return Array.from(new Set(out));
            }"""
        )
        library_counts = re.findall(r"\d+\s*/\s*\d+", body)
        write_row(
            "No percentage of the library is presented as readiness",
            not percent_readiness,
            f"percentage strings anywhere on the report = {percent_readiness or 'none'}. "
            f"Library counts are shown as plain 'n of m' pairs instead: {library_counts[:8]}",
        )
        dual_shot(page, "s16-02-report-four-skill-panels", "/report")
        shot(page, "s16-03-report-per-paper-detail-desktop", "/report")

        report_diagnostics("Scenario 16", errors, failed)
        context.close()
        browser.close()


if __name__ == "__main__":
    run()
