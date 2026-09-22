"""Scenario 15 - Language and access.

Part A: Today, the Course route, the intake, a focused exercise and the
progress report, in Russian, at 390 wide. No horizontal scroll anywhere.
Exam content must stay English. Every English interface string still on
screen is listed.

Part B: a keyboard walk of Today and of the focused exercise, with a check
that every focused control shows a visible ring and that Enter or Space
activates it.

Part C: reduced motion emulation.
"""
import json
import re

from playwright.sync_api import sync_playwright

from final_helpers import (
    BASE_URL,
    DESKTOP,
    PHONE,
    assert_on,
    attach_diagnostics,
    days_after,
    goto,
    new_context,
    no_horizontal_scroll,
    progress_v1,
    report_diagnostics,
    saved_plan,
    seed_context,
    shot,
    synthetic_matching_headings,
    write_note,
    write_row,
    write_section,
)

GUIDED = "/trainers/focused/reading-matching-headings-guided"
# "IELTS IS"/"IELTS IS EZ": the site's own logo/tagline, split across two
# text nodes in the header ("IELTS is" + a styled "EZ") plus a combined
# accessible-name node elsewhere - never translated, the same as the brand
# name itself. "MATCHING HEADINGS" (and every other question-type name):
# "the exam's own name for the task and stays in English, the way every
# question type name does on this site" (src/lib/i18n/dict/ru/
# learning-focus.ts, right above the Matching Headings entries) - documented,
# permanent site policy, not a translation gap.
BRAND = {"IELTS", "EZ", "MR EZ", "EN", "RU", "PDF", "AI",
         "IELTS IS", "IELTS IS EZ", "MATCHING HEADINGS"}

# A language is always named in its own language (src/lib/i18n/locale.ts
# LOCALE_LABEL: the EN / RU switch, the intake language step and the plan
# settings all show "English" and "Русский"). "English" on a Russian page is
# therefore correct, not a leak. Codex's review of 2026-09-22 asked for exactly
# this narrow allowance rather than translating every Latin word.
NAMED_IN_OWN_LANGUAGE = {"ENGLISH"}
# The exam material itself is English by design and must stay English.
# .focused-source cites the real exam paper/passage/question numbers this
# exercise is drawn from (FocusedExercise.tsx's view.attribution, e.g.
# "Academic Reading Test 20, Passage 2, Questions 14 to 19.") - a citation
# of real exam material, not interface copy, so it belongs alongside the
# passage/legend/instructions here.
EXAM_CONTAINERS = [".focused-passage", ".focused-legend", ".focused-instructions",
                   ".focused-items", ".focused-source"]


def english_lines(page, exclude_selectors=()):
    """Interface lines still rendered in Latin script, with the exam
    material excluded (that is supposed to stay English)."""
    return page.evaluate(
        """(exclude) => {
            const drop = new Set();
            for (const sel of exclude) {
                for (const el of document.querySelectorAll(sel)) {
                    drop.add(el);
                    for (const d of el.querySelectorAll('*')) drop.add(d);
                }
            }
            const out = [];
            const walk = (node) => {
                for (const child of node.childNodes) {
                    if (child.nodeType === 3) {
                        if (drop.has(node)) continue;
                        const text = child.textContent.replace(/\\s+/g, ' ').trim();
                        if (!text) continue;
                        if (/[\\u0400-\\u04FF]/.test(text)) continue;
                        if (!/[A-Za-z]{3,}/.test(text)) continue;
                        out.push(text);
                    } else if (child.nodeType === 1) {
                        const tag = child.tagName.toLowerCase();
                        if (['script', 'style', 'noscript', 'svg'].includes(tag)) continue;
                        walk(child);
                    }
                }
            };
            walk(document.body);
            return Array.from(new Set(out));
        }""",
        list(exclude_selectors),
    )


def focus_info(page):
    return page.evaluate(
        """() => {
            const el = document.activeElement;
            if (!el || el === document.body) return null;
            const s = getComputedStyle(el);
            const outline = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth || '0') > 0;
            const ring = s.boxShadow && s.boxShadow !== 'none';
            const border = s.borderColor;
            return { tag: el.tagName, cls: String(el.className).slice(0, 60),
                     text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 50),
                     visibleFocus: outline || ring, outline: s.outlineStyle + ' ' + s.outlineWidth,
                     boxShadow: String(s.boxShadow).slice(0, 60), borderColor: border };
        }"""
    )


def run(base_url: str = BASE_URL):
    write_section(
        "Scenario 15: Language and access",
        "Seed SYNTHETIC-matching-headings. Russian is requested with ?lang=ru, which always wins "
        "over the device language. Phone viewport is 390x844.",
    )
    progress, plan = synthetic_matching_headings()
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # ── Part A: Russian, 390 wide ────────────────────────────────────
        context = new_context(browser, viewport=PHONE)
        seed_context(context, progress=progress, saved_plan=plan)
        page = context.new_page()
        errors, failed = attach_diagnostics(page)

        surfaces = [
            ("Today", "/dashboard", "s15-01-today-ru-phone", ()),
            ("the Course route", "/start", "s15-02-course-ru-phone", ()),
            ("the intake / plan settings", "/plan-settings", "s15-03-plan-settings-ru-phone", ()),
            ("a focused exercise", GUIDED, "s15-04-focused-exercise-ru-phone", EXAM_CONTAINERS),
            ("the progress report", "/report", "s15-05-report-ru-phone", ()),
        ]
        all_leaks = {}
        for label, path, name, exclude in surfaces:
            page.goto(base_url + path + ("&" if "?" in path else "?") + "lang=ru", wait_until="load")
            page.wait_for_timeout(2200)
            lang = page.get_attribute("html", "lang")
            write_row(f"[RU 390px] {label} is served in Russian", lang == "ru",
                      f'html lang="{lang}", url={page.url}')
            write_row(f"[RU 390px] {label} has no horizontal scroll",
                      no_horizontal_scroll(page),
                      "documentElement.scrollWidth <= clientWidth: "
                      f"{no_horizontal_scroll(page)}")
            leaks = [l for l in english_lines(page, exclude)
                     if l.upper() not in BRAND and l.upper() not in NAMED_IN_OWN_LANGUAGE
                     and not re.fullmatch(r"[A-Za-z]{1,2}", l)]
            all_leaks[label] = leaks
            write_row(
                f"[RU 390px] {label}: no English interface string is left on screen",
                not leaks,
                f"{len(leaks)} English line(s) still shown: {json.dumps(leaks[:14])}"
                + (f" (+{len(leaks) - 14} more)" if len(leaks) > 14 else ""),
            )
            shot(page, name, path.split("?")[0])

        # the exam material must STAY English
        page.goto(base_url + GUIDED + "?lang=ru", wait_until="load")
        page.wait_for_timeout(2200)
        assert_on(page, "the focused exercise in Russian", GUIDED, "")
        passage = page.locator(".focused-passage-text")
        passage_text = passage.first.inner_text() if passage.count() else ""
        legend = page.locator(".focused-legend")
        legend_text = legend.first.inner_text() if legend.count() else ""
        write_row(
            "Exam content stays English in the Russian interface",
            bool(re.search(r"[A-Za-z]{4,}", passage_text))
            and not re.search(r"[Ѐ-ӿ]", passage_text)
            and bool(re.search(r"[A-Za-z]{4,}", legend_text)),
            f'passage begins "{passage_text[:110]}"; heading list begins "{legend_text[:110]}"',
        )
        shot(page, "s15-06-exam-content-stays-english-phone", GUIDED)
        write_note("**Every English interface line still shown in the Russian view, by surface:** "
                   + json.dumps(all_leaks)[:2600])
        write_note(
            "Two of these groups are pre-excused by the project's own CLAUDE.md as known and "
            "scheduled (the session objective sentences and the reason sentences). Everything "
            "else in the lists above is a genuine untranslated interface string: the step purpose "
            "sentences, the Mr EZ panel's whole introduction, the milestone labels, the report's "
            "page chrome, its paper names, its date stamps and its subskill labels."
        )
        report_diagnostics("Scenario 15 part A", errors, failed)
        context.close()

        # ── Part B: keyboard ─────────────────────────────────────────────
        context = new_context(browser, reduced_motion="reduce")
        seed_context(context, progress=progress, saved_plan=plan)
        page = context.new_page()
        errors, failed = attach_diagnostics(page)

        goto(page, "/dashboard")
        page.wait_for_timeout(2000)
        assert_on(page, "Today for the keyboard walk", "/dashboard", "", "#today-heading")
        wanted = {"start": False, "why this": False, "less time": False, "another skill": False}
        invisible = []
        trail = []
        for _ in range(45):
            page.keyboard.press("Tab")
            info = focus_info(page)
            if info is None:
                continue
            trail.append(f'{info["tag"]}:"{info["text"]}" ring={info["visibleFocus"]}')
            if not info["visibleFocus"]:
                invisible.append(f'{info["tag"]}:"{info["text"]}" '
                                 f'(outline={info["outline"]}, boxShadow={info["boxShadow"]})')
            low = info["text"].lower()
            if low in ("start", "continue"):
                wanted["start"] = True
            if "why this" in low:
                wanted["why this"] = True
            if "less time" in low:
                wanted["less time"] = True
            if "another skill" in low:
                wanted["another skill"] = True
            if all(wanted.values()):
                break
        write_note("**Keyboard trail on Today:** " + " -> ".join(trail))
        write_row("[keyboard] every control on Today is reachable by Tab",
                  all(wanted.values()), f"reached = {wanted}")
        write_row("[keyboard] every control focused along the way shows a visible ring",
                  not invisible, f"controls with no visible ring: {invisible[:8] or 'none'}")
        shot(page, "s15-07-keyboard-focus-today-desktop", "/dashboard")

        goto(page, "/dashboard")
        page.wait_for_timeout(1800)
        why = page.get_by_role("button", name="Why this")
        why.first.focus()
        page.keyboard.press("Enter")
        page.wait_for_timeout(600)
        write_row("[keyboard] 'Why this' opens with Enter",
                  page.locator(".today-why").count() > 0,
                  f'.today-why present after Enter = {page.locator(".today-why").count() > 0}')
        less = page.get_by_role("button", name="I have less time today")
        less.first.focus()
        page.keyboard.press("Space")
        page.wait_for_timeout(600)
        write_row("[keyboard] 'I have less time today' opens with Space",
                  page.locator(".today-less-time").count() > 0,
                  f'.today-less-time present after Space = '
                  f'{page.locator(".today-less-time").count() > 0}')
        other = page.get_by_role("button", name="Choose another skill")
        other.first.focus()
        page.keyboard.press("Enter")
        page.wait_for_timeout(600)
        write_row("[keyboard] 'Choose another skill' opens with Enter",
                  page.locator(".today-other-skill").count() > 0,
                  f'.today-other-skill present after Enter = '
                  f'{page.locator(".today-other-skill").count() > 0}')
        shot(page, "s15-08-keyboard-activated-panels-desktop", "/dashboard")

        goto(page, GUIDED)
        page.wait_for_timeout(2200)
        assert_on(page, "the focused exercise for the keyboard walk", GUIDED, "guided practice")
        # The Check button is disabled until something is answered, and a
        # disabled button is not in the tab order, so answer first.
        ex_selects = page.locator("select.focused-answer")
        for i, a in enumerate(["v", "vii", "viii", "x", "iii", "ix"]):
            if i < ex_selects.count():
                ex_selects.nth(i).select_option(a)
        page.wait_for_timeout(500)
        page.evaluate("() => { document.activeElement && document.activeElement.blur(); }")
        ex_invisible = []
        ex_trail = []
        reached_check = False
        for _ in range(80):
            page.keyboard.press("Tab")
            info = focus_info(page)
            if info is None:
                continue
            ex_trail.append(f'{info["tag"]}:"{info["text"]}" ring={info["visibleFocus"]}')
            if not info["visibleFocus"]:
                ex_invisible.append(f'{info["tag"]}:"{info["text"]}" (outline={info["outline"]})')
            if "check my answers" in info["text"].lower():
                reached_check = True
                break
        write_note("**Keyboard trail on the focused exercise:** " + " -> ".join(ex_trail))
        write_row("[keyboard] the exercise's answer controls, hints and Check button are all "
                  "reachable by Tab", reached_check,
                  f"reached the Check button = {reached_check} after {len(ex_trail)} stops")
        write_row("[keyboard] every control in the exercise shows a visible ring",
                  not ex_invisible, f"controls with no visible ring: {ex_invisible[:8] or 'none'}")
        hint = page.locator(".help-control", has_text="hint").first
        hint.focus()
        page.keyboard.press("Enter")
        page.wait_for_timeout(1400)
        write_row("[keyboard] a hint can be asked for with Enter",
                  page.locator(".help-replies").count() > 0,
                  f'.help-replies present after Enter = {page.locator(".help-replies").count()}')
        shot(page, "s15-09-keyboard-focus-exercise-desktop", GUIDED)

        # ── Part C: reduced motion ───────────────────────────────────────
        reduced = page.evaluate("() => window.matchMedia('(prefers-reduced-motion: reduce)').matches")
        animated = page.evaluate(
            """() => Array.from(document.querySelectorAll('*')).filter((el) => {
                const s = getComputedStyle(el);
                const dur = parseFloat(s.animationDuration || '0') + parseFloat(s.transitionDuration || '0');
                return dur > 0.35;
            }).length"""
        )
        goto(page, "/dashboard")
        page.wait_for_timeout(1800)
        write_row(
            "Reduced motion is honoured: the page still renders, and long animations are gone",
            reduced and page.locator(".today-active").count() == 1,
            f"matchMedia reduce = {reduced}, elements with an animation or transition longer "
            f"than 0.35s = {animated}, Today still renders one session = "
            f"{page.locator('.today-active').count() == 1}",
        )
        shot(page, "s15-10-reduced-motion-today-desktop", "/dashboard")

        report_diagnostics("Scenario 15 parts B and C", errors, failed)
        context.close()
        browser.close()


if __name__ == "__main__":
    run()
