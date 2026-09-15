#!/usr/bin/env python3
"""Regenerate src/data/listening-practice.ts from real questions and real audio
taken from the imported full IELTS Listening tests
(src/data/tests/listening-full-001.ts .. listening-full-020.ts).

Why: the Listening question-type lessons used to ship with hand-written,
fictional practice exercises. Alex asked for those to be replaced with real
questions from the site's own imported tests, because the made-up ones were
too easy.

What this does:
1. Loads every listening-full-0XX.ts test (001-020; only these carry
   transcripts and per-part timestamps, see workflows/update_ielts_materials.md).
2. For each of the four "Part" lessons (part1..part4), takes one whole part
   of that number from a single good-quality test: every group, in order,
   with that part's audio segment and transcript.
3. For each of the six "question type" lessons (multiple-choice, matching,
   map-labelling, form-completion, sentence-completion, short-answer), finds
   every group of the matching underlying question type across all 20 tests,
   scores them for extraction quality, and keeps the best two groups from two
   different tests.
4. For every group used, pulls the real option text / matching legend / fill
   in-the-blank context straight out of the test's stimulus.questionHtml
   (the structured `questions[].answer` / `.options` fields only store bare
   letters, not the human-readable option text - see the comment on
   extract_mc_options() below), keeps the real answers and explanations, and
   carries over any diagram/plan image the group uses.
5. Writes src/data/listening-practice.ts in the existing PracticeSet shape,
   plus a `segments` array (one per source group) recording each group's
   audio clip, transcript and attribution.

Re-run with:
    python tools/build_listening_practice.py

Edit SELECTION quality knobs below if a re-run should prefer different tests.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
TESTS_DIR = ROOT / "src" / "data" / "tests"
OUTPUT = ROOT / "src" / "data" / "listening-practice.ts"

# Tests 001-020 carry transcripts and part timestamps; 021-030 are audio +
# answer key only (see MEMORY.md "Practice test content status"). Restricting
# to this range keeps every generated exercise able to offer a transcript.
TEST_NUMS = list(range(1, 21))

TARGET, OTHER = "", ""
PROTECT = ""
ABBR_RE = re.compile(r"\b(Mr|Mrs|Ms|Dr|Prof|St)\.")


def load_test(num: int) -> dict:
    path = TESTS_DIR / f"listening-full-{num:03d}.ts"
    content = path.read_text(encoding="utf-8")
    m = re.search(r"=\s*(\{.*\});\s*$", content, re.S)
    if not m:
        raise ValueError(f"Could not find the exported object in {path}")
    return json.loads(m.group(1))


def clean(s: str | None) -> str | None:
    """Fixes the mojibake apostrophe/quote character (U+FFFD) that shows up
    in a handful of the scraped test transcripts and questions, without
    touching the source test files themselves."""
    if s is None:
        return s
    return s.replace("�", "'")


def qnum(qid: str) -> int:
    return int(re.sub(r"\D", "", qid))


def mojibake_count(*parts: str | None) -> int:
    return sum((p or "").count("�") for p in parts)


def find_section(soup: BeautifulSoup, group: dict):
    """The part's raw questionHtml is a flat list of
    <section class="listening-source-group" data-question-start data-question-end">
    blocks, one per group. Match this group to its section by question range,
    since groups don't carry a stable id of their own."""
    qids = [qnum(q["id"]) for q in group["questions"]]
    lo, hi = min(qids), max(qids)
    for sec in soup.select("section.listening-source-group"):
        try:
            s = int(sec.get("data-question-start"))
            e = int(sec.get("data-question-end"))
        except (TypeError, ValueError):
            continue
        if s <= lo and hi <= e:
            return sec
    return None


def extract_mc_options(section, n: int):
    """The structured group.questions[].options field only ever holds the
    bare letters (["A","B","C"]) for imported listening tests - the real
    option wording lives only in the part's raw questionHtml, one
    <article data-question="N"><ol class="listening-source-options"><li
    data-option="A"><span/><span>label text</span></li>...</ol></article>
    per question. Pull the real wording from there."""
    if section is None:
        return None
    art = section.find("article", attrs={"data-question": str(n)})
    if not art:
        return None
    opts = []
    for li in art.select("ol.listening-source-options li"):
        key = li.get("data-option")
        spans = li.find_all("span")
        label = spans[1].get_text(strip=True) if len(spans) > 1 else li.get_text(strip=True)
        if key and label:
            opts.append((key, clean(label)))
    return opts or None


def extract_legend(section):
    """Matching / categorisation groups store their lettered option list only
    as a <dl class="listening-source-legend"><div><dt>A</dt><dd>label</dd>
    </div>...</dl> inside questionHtml, same reason as extract_mc_options."""
    if section is None:
        return {}
    dl = section.find("dl", class_="listening-source-legend")
    if not dl:
        return {}
    out = {}
    for div in dl.find_all("div"):
        dt, dd = div.find("dt"), div.find("dd")
        if dt and dd:
            out[dt.get_text(strip=True)] = clean(dd.get_text(strip=True))
    return out


def extract_images(section):
    if section is None:
        return []
    seen, out = set(), []
    for img in section.find_all("img"):
        src = img.get("src")
        if src and src not in seen:
            seen.add(src)
            out.append(src)
    return out


def extract_blank_context(section, n: int) -> str | None:
    """Fill-in-the-blank groups (sentence-completion / table-completion /
    diagram-labelling) store their question text as a bare "Question N"
    placeholder in the structured data - the blanked word is simply missing,
    with no marker for where it went. The real surrounding sentence, with the
    blank's exact position, only exists in questionHtml as a
    <span class="listening-answer-blank" data-question="N"> inside a table
    cell / list row / summary paragraph. This walks up from that span to a
    sensible context block (a table cell or list row if there is one,
    otherwise the nearest paragraph, narrowed to just the one sentence that
    contains the blank if the block is a long multi-sentence summary), masks
    the target blank as "_____" and any other blanks in the same block as
    "_____" too (so nothing silently vanishes), and returns the result."""
    if section is None:
        return None
    blank = None
    for tag in section.find_all(attrs={"data-question": str(n)}):
        if "listening-answer-blank" in (tag.get("class") or []):
            blank = tag
            break
    if blank is None:
        return None

    ancestor = None
    for anc in blank.parents:
        classes = anc.get("class") or []
        if anc.name in ("td", "li") or "listening-source-question-row" in classes:
            ancestor = anc
            break
        if anc.name == "section":
            break
    if ancestor is None:
        ancestor = blank.parent

    anc_soup = BeautifulSoup(str(ancestor), "html.parser")
    for tag in anc_soup.find_all(attrs={"class": "listening-answer-blank"}):
        tqn = tag.get("data-question")
        tag.replace_with(TARGET if tqn == str(n) else OTHER)

    text = anc_soup.get_text(" ", strip=True)
    text = re.sub(r"\s+", " ", text).strip()

    # A lot of imported tables are two columns (row label | value with the
    # blank), so a value cell on its own can be almost content-free (e.g. a
    # bare "£" next to the blank). If so, borrow the row's first cell as a
    # label prefix, e.g. "Cancellation: _____ £" instead of just "_____ £".
    bare_signal = len(re.sub(r"[£$€%\s_]", "", text))
    if ancestor.name == "td" and bare_signal < 3:
        tr = ancestor.find_parent("tr")
        if tr is not None:
            cells = tr.find_all("td")
            if cells and cells[0] is not ancestor and not cells[0].find(attrs={"class": "listening-answer-blank"}):
                label = cells[0].get_text(" ", strip=True)
                label = re.sub(r"\s+", " ", label).strip().rstrip(":").strip()
                if label:
                    text = f"{label}: {text}"

    if len(text) > 160 and TARGET in text:
        protected = ABBR_RE.sub(lambda m: m.group(1) + PROTECT, text)
        for sentence in re.split(r"(?<=[.!?])\s+", protected):
            if TARGET in sentence:
                text = sentence.replace(PROTECT, ".")
                break

    # The target blank becomes the visible input; any other blank sharing the
    # same row/cell (a second gap in the same line) is marked distinctly so
    # two different questions from the same row don't read as one identical
    # prompt (e.g. "Day _____ Time _____" for both the day and time blanks).
    text = text.replace(TARGET, "_____").replace(OTHER, "(...)")
    text = re.sub(r"\s+([.,;:!?])", r"\1", text)
    text = re.sub(r"^\d+[.)]?\s+", "", text)
    return clean(text).strip()


def part_source(test_num: int, part_label: str, lo: int, hi: int) -> str:
    span = f"Question {lo}" if lo == hi else f"Questions {lo} to {hi}"
    return f"Listening Test {test_num}, {part_label}, {span}"


def group_range(group: dict) -> tuple[int, int]:
    qids = [qnum(q["id"]) for q in group["questions"]]
    return min(qids), max(qids)


# ---------------------------------------------------------------------------
# Converting one schema QuestionGroup into PracticeQuestion objects
# ---------------------------------------------------------------------------

def convert_multiple_choice(group: dict, section) -> list[dict]:
    out = []
    for q in group["questions"]:
        n = qnum(q["id"])
        raw_opts = extract_mc_options(section, n)
        if not raw_opts:
            continue
        options = [{"value": k, "label": f"{k}) {v}"} for k, v in raw_opts]
        out.append({
            "prompt": clean(q.get("textHtml")) or f"Question {n}",
            "kind": "choice",
            "options": options,
            "answer": q["answer"],
            "explanation": clean(q.get("explanation")) or "",
        })
    return out


def convert_matching(group: dict, section) -> list[dict]:
    legend = extract_legend(section)
    if not legend:
        return []
    options = [{"value": k, "label": f"{k}) {legend[k]}"} for k in sorted(legend)]
    out = []
    for q in group["questions"]:
        n = qnum(q["id"])
        prompt = clean(q.get("textHtml")) or f"Question {n}"
        if re.match(r"^Question \d+$", prompt):
            continue
        out.append({
            "prompt": prompt,
            "kind": "select",
            "options": options,
            "answer": q["answer"],
            "explanation": clean(q.get("explanation")) or "",
        })
    return out


def convert_fill_blank(group: dict, section) -> list[dict]:
    """diagram-labelling groups are sometimes pure "label the picture" lists
    with no surrounding words at all in questionHtml (the labels only exist
    printed on the referenced image) - extract_blank_context then returns
    just "_____" with no real content. Fall back to a plain numbered
    instruction for those instead of shipping a content-free prompt."""
    out = []
    is_diagram = group["type"] == "diagram-labelling"
    for q in group["questions"]:
        n = qnum(q["id"])
        prompt = extract_blank_context(section, n)
        signal = len(re.sub(r"[_\s]", "", (prompt or "").replace("(...)", "")))
        if not prompt or signal < 3:
            fallback = clean(q.get("textHtml")) or ""
            if fallback and not re.match(r"^Question \d+$", fallback):
                prompt = fallback
            elif is_diagram:
                prompt = f"Label point ({n}) on the diagram above."
            else:
                prompt = None
        if not prompt:
            continue
        answer = q["answer"]
        answer = [clean(a) for a in answer] if isinstance(answer, list) else clean(answer)
        out.append({
            "prompt": prompt,
            "kind": "text",
            "answer": answer,
            "explanation": clean(q.get("explanation")) or "",
        })
    return out


CONVERTERS = {
    "multiple-choice": convert_multiple_choice,
    "matching-features": convert_matching,
    "categorisation": convert_matching,
    "sentence-endings": convert_matching,
    "diagram-labelling": convert_fill_blank,
    "table-completion": convert_fill_blank,
    "sentence-completion": convert_fill_blank,
}


def convert_group(group: dict, part_soup: BeautifulSoup) -> list[dict]:
    converter = CONVERTERS.get(group["type"])
    if not converter:
        return []
    section = find_section(part_soup, group)
    return converter(group, section)


# ---------------------------------------------------------------------------
# Part lessons: one whole part from one good test
# ---------------------------------------------------------------------------

def score_test_for_parts(data: dict) -> tuple[int, int]:
    """Lower is better: (mojibake count, parts missing a transcript)."""
    moji = 0
    missing_transcript = 0
    for part in data["parts"]:
        stim = part["stimulus"]
        moji += mojibake_count(stim.get("transcriptHtml"), stim.get("questionHtml"))
        for group in part["groups"]:
            for q in group["questions"]:
                moji += mojibake_count(q.get("textHtml"), q.get("explanation"))
        if not stim.get("transcriptHtml"):
            missing_transcript += 1
    return (moji, missing_transcript)


def pick_parts_test() -> tuple[int, dict]:
    best = None
    for num in TEST_NUMS:
        data = load_test(num)
        if len(data["parts"]) != 4:
            continue
        score = score_test_for_parts(data)
        if best is None or score < best[0]:
            best = (score, num, data)
    if best is None:
        raise RuntimeError("No usable test found for the Part lessons")
    return best[1], best[2]


def build_part_set(test_num: int, data: dict, part_index: int) -> dict:
    part = data["parts"][part_index]
    stim = part["stimulus"]
    part_soup = BeautifulSoup(stim.get("questionHtml") or "", "html.parser")

    questions = []
    for group in part["groups"]:
        for q in convert_group(group, part_soup):
            q["segment"] = 0
            questions.append(q)

    lo = min(qnum(q["id"]) for g in part["groups"] for q in g["questions"])
    hi = max(qnum(q["id"]) for g in part["groups"] for q in g["questions"])

    segment = {
        "src": stim.get("src") or data.get("audioSrc"),
        "startSeconds": stim.get("startSeconds", 0),
        "endSeconds": stim.get("endSeconds"),
        "source": part_source(test_num, part["label"], lo, hi),
        "transcriptHtml": stim.get("transcriptHtml"),
    }

    return {
        "title": f"Exercise. Real questions from IELTS Listening Test {test_num}, {part['label']}",
        "intro": "Answer using the actual recording below, the same one real students hear on this test.",
        "segments": [segment],
        "questions": questions,
    }


# ---------------------------------------------------------------------------
# Question-type lessons: best two groups of that type, from two tests
# ---------------------------------------------------------------------------

TYPE_SET = {
    "multiple-choice": {"multiple-choice"},
    "matching": {"matching-features", "categorisation", "sentence-endings"},
    "map-labelling": {"diagram-labelling"},
    "form-completion": {"table-completion"},
}

SLUG_TITLES = {
    "multiple-choice": "Exercise. Choose the correct letter",
    "matching": "Exercise. Match each item to the correct answer",
    "map-labelling": "Exercise. Label the map, plan or diagram",
    "form-completion": "Exercise. Complete the form, notes or table",
    "sentence-completion": "Exercise. Complete the sentences",
    "short-answer": "Exercise. Answer the questions",
}

SLUG_INTROS = {
    "multiple-choice": "Real Part 3 questions from two different IELTS Listening tests.",
    "matching": "Real questions from two different IELTS Listening tests. Some options in each list are not used.",
    "map-labelling": "Real questions from two different IELTS Listening tests. Use the picture to work out where each answer is.",
    "form-completion": "Real questions from two different IELTS Listening tests. Keep to the word limit given for each one.",
    "sentence-completion": "Real questions from two different IELTS Listening tests. Keep to the word limit given for each one.",
    "short-answer": "Real questions from two different IELTS Listening tests. Keep to the word limit given for each one.",
}


def is_short_answer_group(group: dict) -> bool:
    return group["type"] == "sentence-completion" and "answer the question" in group["instructionHtml"].lower()


def group_slug(group: dict) -> str | None:
    if group["type"] == "sentence-completion":
        return "short-answer" if is_short_answer_group(group) else "sentence-completion"
    for slug, types in TYPE_SET.items():
        if group["type"] in types:
            return slug
    return None


def collect_candidates(slug: str) -> list[dict]:
    """One candidate per (test, part, group) whose real underlying question
    type maps to this lesson slug."""
    candidates = []
    for num in TEST_NUMS:
        data = load_test(num)
        for part in data["parts"]:
            stim = part["stimulus"]
            part_soup = BeautifulSoup(stim.get("questionHtml") or "", "html.parser")
            for group in part["groups"]:
                if group_slug(group) != slug:
                    continue
                section = find_section(part_soup, group)
                questions = convert_group(group, part_soup)
                if len(questions) < 3:
                    continue
                lo, hi = group_range(group)
                moji = mojibake_count(*[q.get("prompt") for q in questions])
                # extraction quality: prefer groups where every question got a
                # real, specific prompt rather than a generic fallback. A
                # numbered "Label point (N)" fallback is the normal, expected
                # case for a diagram-labelling group whose picture carries all
                # the positional information (there is often no surrounding
                # text to extract at all), so it isn't penalised the way a
                # bare "Question N" placeholder is for every other type.
                fallback_count = sum(
                    1 for q in questions if re.match(r"^Question \d+$", q["prompt"])
                )
                score = (
                    len(questions) * 2
                    - fallback_count * 5
                    - moji * 3
                    - abs(len(questions) - 5)  # sets close to 5 questions read best
                )
                candidates.append({
                    "score": score,
                    "test_num": num,
                    "data": data,
                    "part": part,
                    "part_soup": part_soup,
                    "section": section,
                    "group": group,
                    "questions": questions,
                    "lo": lo,
                    "hi": hi,
                })
    candidates.sort(key=lambda c: c["score"], reverse=True)
    return candidates


def pick_two_from_different_tests(candidates: list[dict]) -> list[dict]:
    chosen, seen_tests = [], set()
    for c in candidates:
        if c["test_num"] in seen_tests:
            continue
        chosen.append(c)
        seen_tests.add(c["test_num"])
        if len(chosen) == 2:
            break
    return chosen


def build_type_set(slug: str) -> dict | None:
    candidates = collect_candidates(slug)
    picks = pick_two_from_different_tests(candidates)
    if not picks:
        return None

    questions = []
    segments = []
    for seg_index, pick in enumerate(picks):
        stim = pick["part"]["stimulus"]
        images = extract_images(pick["section"]) if slug == "map-labelling" else []
        segment = {
            "src": stim.get("src") or pick["data"].get("audioSrc"),
            "startSeconds": stim.get("startSeconds", 0),
            "endSeconds": stim.get("endSeconds"),
            "source": part_source(pick["test_num"], pick["part"]["label"], pick["lo"], pick["hi"]),
            "transcriptHtml": stim.get("transcriptHtml"),
        }
        if images:
            segment["images"] = [{"src": src, "alt": f"Diagram for {segment['source']}"} for src in images]
        segments.append(segment)
        for q in pick["questions"]:
            q = dict(q)
            q["segment"] = seg_index
            questions.append(q)

    return {
        "title": SLUG_TITLES[slug],
        "intro": SLUG_INTROS[slug],
        "segments": segments,
        "questions": questions,
    }


# ---------------------------------------------------------------------------
# Emit src/data/listening-practice.ts
# ---------------------------------------------------------------------------

HEADER = """/* Interactive practice exercises for the Listening lessons (the four
   Part pages and the six question-type pages). GENERATED from the site's own
   imported full IELTS Listening tests (src/data/tests/listening-full-0XX.ts)
   - every question, answer, explanation and audio clip here was taken from a
   real test, not written by hand. Re-run with:

       python tools/build_listening_practice.py

   See workflows/build_listening_practice.md for what the script does and how
   it picks material. Rendered by src/components/PracticeQuiz.tsx, same
   component used for the Reading question-type pages; the optional
   `segments` array groups questions under their own audio clip + transcript,
   for sets built from more than one source test. */

import type { PracticeSet } from './reading-practice';

/** One audio clip (plus optional transcript / reference images) backing a
    run of questions within a practice set. A set built from a single source
    (the four Part lessons) has one segment covering every question; a set
    combining two different tests (the six question-type lessons) has one
    segment per source group, and each question's `segment` index below says
    which one it belongs to. */
export interface ListeningPracticeSegment {
  src?: string;
  startSeconds?: number;
  endSeconds?: number;
  /** Attribution shown near the player, e.g. "Listening Test 12, Part 3,
      Questions 21 to 25". */
  source?: string;
  /** Shown as a collapsible "Transcript" once the set is finished. */
  transcriptHtml?: string;
  /** Reference picture(s) for a map/plan/diagram-labelling segment. */
  images?: { src: string; alt: string }[];
}

/* Declared here via module augmentation, rather than editing
   reading-practice.ts (edited concurrently by another agent working on the
   Reading passages), so the two fields above can be added to the shared
   PracticeSet / PracticeQuestion shape without touching that file. */
declare module './reading-practice' {
  interface PracticeSet {
    segments?: ListeningPracticeSegment[];
  }
  interface PracticeQuestion {
    /** Index into this set's `segments`, grouping the question under a
        particular audio clip / transcript / image. Undefined = no audio. */
    segment?: number;
  }
}

"""


def emit(practice: dict) -> str:
    body = json.dumps(practice, indent=2, ensure_ascii=False)
    # style match: single quotes, no quoted keys that don't need it is not
    # worth doing for a generated file; keep valid TS via a `as const`-free
    # straight JSON literal, which is valid TS object-literal syntax.
    return HEADER + "export const LISTENING_PRACTICE: Record<string, PracticeSet> = " + body + ";\n"


def main() -> None:
    practice: dict[str, dict] = {}
    table_rows = []

    parts_test_num, parts_data = pick_parts_test()
    for i, slug in enumerate(["part1", "part2", "part3", "part4"]):
        pset = build_part_set(parts_test_num, parts_data, i)
        practice[slug] = pset
        seg = pset["segments"][0]
        table_rows.append((slug, "part", f"Test {parts_test_num}", parts_data["parts"][i]["label"],
                            seg["source"].split(", ")[-1], len(pset["questions"])))

    for slug in ["multiple-choice", "matching", "map-labelling", "form-completion",
                 "sentence-completion", "short-answer"]:
        pset = build_type_set(slug)
        if pset is None:
            print(f"WARNING: no material found for {slug}")
            continue
        practice[slug] = pset
        for seg in pset["segments"]:
            src_bits = seg["source"].split(", ")
            table_rows.append((slug, "type", src_bits[0].replace("Listening ", ""), src_bits[1], src_bits[2],
                                sum(1 for q in pset["questions"] if q.get("_seg") is None)))

    OUTPUT.write_text(emit(practice), encoding="utf-8")

    print(f"\nWrote {OUTPUT.relative_to(ROOT)}\n")
    print(f"{'slug':<20} {'kind':<6} {'source test':<10} {'part':<10} {'questions':<28} count")
    for slug in ["part1", "part2", "part3", "part4", "multiple-choice", "matching",
                 "map-labelling", "form-completion", "sentence-completion", "short-answer"]:
        pset = practice.get(slug)
        if not pset:
            continue
        segs = pset["segments"]
        total = len(pset["questions"])
        if len(segs) == 1:
            s = segs[0]
            bits = s["source"].split(", ")
            print(f"{slug:<20} {'part' if slug.startswith('part') else 'type':<6} "
                  f"{bits[0].replace('Listening ', ''):<10} {bits[1]:<10} {bits[2]:<28} {total}")
        else:
            for s in segs:
                bits = s["source"].split(", ")
                print(f"{slug:<20} {'type':<6} {bits[0].replace('Listening ', ''):<10} {bits[1]:<10} {bits[2]:<28}")
            print(f"{'':<20} {'':<6} {'':<10} {'':<10} {'total':<28} {total}")


if __name__ == "__main__":
    main()
