#!/usr/bin/env python3
"""Build src/data/reading-practice.ts from the site's real, imported IELTS
reading tests (src/data/tests/reading-full-*.ts), instead of the old
hand-written / generated practice questions.

Why: the generated exercises were too easy. Alex asked for the real
questions the site already has (imported from PracticePTEOnline with
permission), matched to each reading lesson's question type.

Run:
    python tools/build_reading_practice.py

What it does:
    1. Parses every src/data/tests/reading-full-*.ts test (they're plain
       JSON after "const test: PracticeTest = ").
    2. Classifies every question group inside them by which reading lesson
       (src/data/reading.ts READING_PARTS slug) it matches, using the
       group's declared `type` plus its instructionHtml wording (the
       imported data mislabels a few groups, e.g. "sentence ending" and
       real "diagram label" groups are tagged "sentence-completion" in the
       source data, and "complete the summary using a word list" is tagged
       "matching-features"; this script looks at the instruction text to
       sort those out correctly rather than trusting the tag alone).
    3. Takes the two groups per lesson pinned in PRACTICE_SOURCES (and
       stops with an error if one has gone or no longer reads as that
       lesson's question type), and
       converts them into the site's PracticeQuestion/PracticeSet shape,
       carrying the real passage text, the real answer, the real
       explanation and evidence, and a source credit line.
    4. Writes src/data/reading-practice.ts.

Re-run this whenever the reading test bank changes (new tests added,
existing ones edited) and the practice exercises should be refreshed to
match. It always regenerates the same 11 lesson keys, plus the real
passage at the end of the "paraphrase" lesson (see NOTE below).

NOTE on "paraphrase": it is a skill lesson, not an official IELTS reading
question type (see the comment on it in src/data/reading.ts), so no
imported test has a question group tagged for it. Its exercise has two
parts. The first is a hand-written warm-up of single sentences, kept
byte-for-byte below. The second is one real passage with its real
questions, chosen by hand in PARAPHRASE_SOURCE because every one of its
statements turns on a paraphrase the lesson teaches (a quantifier shift, a
restated rank, words reused with a different claim). It was added on
2026-09-23 after the owner pointed out that the lesson had questions but
nothing to actually read.

NOTE on "diagram": the 40 reading tests have no group tagged
"diagram-labelling" (only the listening tests do), but two groups are real
diagram-label questions mistagged as "sentence-completion" (instruction
text says "Label the diagram" / "Complete the ... diagram"), each with a
real scraped diagram image. Those are used instead.
"""

import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TESTS_GLOB = os.path.join(ROOT, "src", "data", "tests", "reading-full-*.ts")
OUT_PATH = os.path.join(ROOT, "src", "data", "reading-practice.ts")

TEST_PAT = re.compile(r"const test: PracticeTest = (\{.*\});\s*\nexport default test;", re.S)
NUM_PAT = re.compile(r"reading-full-(\d+)\.ts$")
QRANGE_PAT = re.compile(r"Questions?\s+(\d+)(?:\s*-\s*(\d+))?")
LETTER_RANGE_PAT = re.compile(r"\b([A-Z])\s*-\s*([A-Z])\b")

GENERIC_EXPLANATION = "See the passage above for the exact wording this answer is taken from."


# ---------------------------------------------------------------- helpers --

def strip_html(s):
    if not s:
        return ""
    s = re.sub(r"<[^>]+>", " ", s)
    s = s.replace("&nbsp;", " ").replace("&amp;", "&")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def norm_tfng_ynng(a):
    m = {
        "true": "True", "false": "False", "not given": "Not Given",
        "yes": "Yes", "no": "No",
    }
    return m.get(a.strip().lower(), a.strip())


def format_qrange(raw_title):
    m = QRANGE_PAT.search(raw_title or "")
    if not m:
        return raw_title or ""
    a, b = m.group(1), m.group(2)
    return f"{a} to {b}" if b else a


def parse_legend(legend_html):
    """Parse a lettered/roman-numeral legend list like:
       <span>i. Some heading</span> or <span><strong>A</strong> some text</span>
       Returns [(label, text), ...] in source order."""
    items = []
    for chunk in re.findall(r"<span>(.*?)</span>", legend_html or "", re.S):
        raw = chunk.strip()
        m = re.match(r"(?:<strong>)?\s*([A-Za-z]{1,5})[.)]?\s*(?:</strong>)?\s*[:\-]?\s*(.*)", raw, re.S)
        if m:
            label, text = m.group(1), strip_html(m.group(2))
            if text:
                items.append((label, text))
    return items


def first_answer(q):
    a = q["answer"]
    return a if isinstance(a, str) else a[0]


def all_answers(q):
    a = q["answer"]
    return a if isinstance(a, list) else [a]


def explanation_for(q):
    if q.get("explanation"):
        return q["explanation"]
    if q.get("evidence"):
        return f'Evidence in the passage: "{strip_html(q["evidence"])}"'
    return GENERIC_EXPLANATION


# ------------------------------------------------------------ load/parse --

def load_tests():
    tests = []
    for path in sorted(glob.glob(TESTS_GLOB)):
        src = open(path, encoding="utf-8").read()
        m = TEST_PAT.search(src)
        if not m:
            print(f"WARNING: could not parse {path}", file=sys.stderr)
            continue
        data = json.loads(m.group(1))
        num = int(NUM_PAT.search(path).group(1))
        data["_num"] = num
        tests.append(data)
    return tests


def flatten_groups(tests):
    groups = []
    for t in tests:
        for part in t["parts"]:
            stim = part["stimulus"]
            passage_paras = [strip_html(p.get("html", "")) for p in stim.get("paragraphs", [])]
            passage_paras = [p for p in passage_paras if p]
            for g in part["groups"]:
                groups.append({
                    "test_num": t["_num"],
                    "test_title": t["title"],
                    "part_label": part["label"],
                    "passage_title": stim.get("title", ""),
                    "passage_paras": passage_paras,
                    "group": g,
                    "qrange": format_qrange(g.get("title", "")),
                })
    return groups


# ----------------------------------------------------------- classify --

def classify(gr):
    g = gr["group"]
    t = g["type"]
    instr = g["instructionHtml"].lower()
    legend = g.get("legendHtml") or ""
    q0 = g["questions"][0]
    has_before = "before" in q0
    before_val = (q0.get("before") or "").strip()

    if t == "tfng":
        return "tfng"
    if t == "yes-no-notgiven":
        return "ynng"
    if t == "multiple-choice":
        return "mc"
    if t == "matching-headings":
        return "headings"
    if t == "paragraph-matching":
        return "matching-information"

    # Real diagram-label groups, mistagged "sentence-completion" in the
    # imported data, but carrying a real scraped diagram image.
    if t == "sentence-completion" and "<img" in legend and ("diagram" in instr or "label the diagram" in instr):
        return "diagram"

    # Sentence-ending groups are also mistagged "sentence-completion". Some
    # say "ending"; others say "choose one phrase from the list ... to
    # complete each sentence" (Test 20 Q7 to 9, Test 21 Q38 to 40).
    if has_before and ("ending" in instr or ("phrase" in instr and "list" in instr)):
        return "matching-sentence-endings"

    # Short-answer: a real question (ends with "?"), answered in words.
    if t == "sentence-completion" and "answer the question" in instr and before_val.endswith("?"):
        return "short-answer"

    # Summary / notes / table / flow-chart completion family.
    if t == "table-completion" or any(k in instr for k in ("summary", "flow-chart", "flowchart", " notes")):
        return "summary-completion"

    # Genuine matching-features / categorisation (people, theories, etc),
    # as opposed to a matching-features-tagged "complete the summary using
    # a word list" group, which the check above already claimed.
    if (t == "matching-features" and "summary" not in instr) or t == "categorisation":
        return "matching-features"

    # Plain sentence completion: fill words into given sentences. Groups
    # answered with a letter from a list are mistagged too, and are not
    # sentence completion whatever their tag says.
    if t == "sentence-completion" and has_before and not re.search(r"\bletters?\b|\blist\b", instr):
        return "sentence"

    return None


def summary_subtype(gr):
    g = gr["group"]
    instr = g["instructionHtml"].lower()
    if g["type"] == "table-completion":
        return "table"
    if "flow-chart" in instr or "flowchart" in instr:
        return "flowchart"
    if "list of words" in instr or "list of phrases" in instr or "list of options" in instr:
        return "wordbank"
    if " notes" in instr or instr.startswith("complete the notes"):
        return "notes"
    return "summary"


# The question groups each lesson uses, in the order they appear on the
# page: (test number, question range as printed in the passage label).
# Chosen by hand and pinned, so adding or editing a test never silently
# swaps a lesson's passage. The order matters beyond looks: the Russian
# explanations in src/data/tests/ru/practice-reading-<slug>.json are keyed
# by unit and question position. To change a lesson's source, edit it
# here, re-run, and re-check that file with
# `node tools/explanations-ru.mjs check practice-reading-<slug>`.
PRACTICE_SOURCES = {
    "mc": [(19, "24 to 28"), (1, "37 to 40")],
    "tfng": [(3, "6 to 13"), (1, "1 to 7")],
    "ynng": [(17, "7 to 13"), (2, "35 to 40")],
    "headings": [(6, "14 to 19"), (14, "14 to 19")],
    "matching-information": [(9, "27 to 33"), (12, "14 to 20")],
    "matching-features": [(6, "27 to 33"), (18, "28 to 33")],
    "matching-sentence-endings": [(8, "31 to 35"), (13, "1 to 5")],
    # Until 2026-09-23 this lesson used Test 15 Q14 to 24 (a timeline
    # diagram) and Test 10 Q36 to 40 (notes), built from an older import
    # in which the words around each gap belonged to the next question.
    "sentence": [(24, "18 to 22"), (34, "7 to 10")],
    "summary-completion": [(16, "1 to 10"), (2, "19 to 26")],
    "short-answer": [(29, "22 to 26"), (35, "28 to 32")],
    "diagram": [(15, "27 to 32"), (13, "10 to 13")],
}


def pinned_groups(all_groups, slug):
    chosen = []
    for test_num, qrange in PRACTICE_SOURCES[slug]:
        found = [gr for gr in all_groups if gr["test_num"] == test_num and gr["qrange"] == qrange]
        if len(found) != 1:
            raise SystemExit(f"{slug}: expected one group for Test {test_num} Q{qrange}, found {len(found)}")
        kind = classify(found[0])
        if kind != slug:
            raise SystemExit(f"{slug}: Test {test_num} Q{qrange} now reads as '{kind}', not '{slug}'")
        chosen.append(found[0])
    return chosen


# --------------------------------------------------------- conversion --

TFNG_OPTS = [{"value": "True"}, {"value": "False"}, {"value": "Not Given"}]
YNNG_OPTS = [{"value": "Yes"}, {"value": "No"}, {"value": "Not Given"}]
LETTERS = [chr(c) for c in range(ord("A"), ord("Z") + 1)]


def source_note(gr):
    return f"Academic Reading Test {gr['test_num']}, Questions {gr['qrange']}"


def passage_entry(gr, note=None):
    label = f"Academic Reading Test {gr['test_num']}, {gr['part_label']}, Questions {gr['qrange']}"
    if note:
        label += f" ({note})"
    return {"label": label, "title": gr["passage_title"], "paragraphs": gr["passage_paras"]}


def legend_entry(gr, kind_label):
    label = f"{kind_label}, Academic Reading Test {gr['test_num']}, Questions {gr['qrange']}"
    return {"label": label, "html": gr["group"].get("legendHtml", "")}


def conv_tfng_ynng(gr, opts):
    src = source_note(gr)
    out = []
    for q in gr["group"]["questions"]:
        out.append({
            "prompt": strip_html(q.get("textHtml", "")),
            "kind": "choice",
            "options": opts,
            "answer": norm_tfng_ynng(first_answer(q)),
            "explanation": explanation_for(q),
            "source": src,
        })
    return out


def conv_mc(gr):
    src = source_note(gr)
    out = []
    for q in gr["group"]["questions"]:
        opts = [{"value": LETTERS[i], "label": f"{LETTERS[i]}) {strip_html(o)}"} for i, o in enumerate(q.get("options", []))]
        out.append({
            "prompt": strip_html(q.get("textHtml", "")),
            "kind": "choice",
            "options": opts,
            "answer": first_answer(q),
            "explanation": explanation_for(q),
            "source": src,
        })
    return out


def conv_headings(gr):
    src = source_note(gr)
    legend_map = {lbl.lower(): text for lbl, text in parse_legend(gr["group"].get("legendHtml", ""))}
    letters = gr["group"].get("options") or sorted(legend_map.keys())
    out = []
    for q in gr["group"]["questions"]:
        opts = [{"value": o, "label": f"{o}) {legend_map.get(o.lower(), '')}"} for o in letters]
        out.append({
            "prompt": strip_html(q.get("textHtml", "")),
            "kind": "select",
            "options": opts,
            "answer": first_answer(q),
            "explanation": explanation_for(q),
            "source": src,
        })
    return out


def conv_paragraph_matching(gr):
    src = source_note(gr)
    g = gr["group"]
    letters = g.get("options")
    if not letters:
        m = LETTER_RANGE_PAT.search(g["instructionHtml"])
        if m:
            letters = [chr(c) for c in range(ord(m.group(1)), ord(m.group(2)) + 1)]
        else:
            letters = sorted({first_answer(q) for q in g["questions"]})
    opts = [{"value": l} for l in letters]
    out = []
    for q in g["questions"]:
        out.append({
            "prompt": strip_html(q.get("textHtml", "")),
            "kind": "choice",
            "options": opts,
            "answer": first_answer(q),
            "explanation": explanation_for(q),
            "source": src,
        })
    return out


def conv_matching_features(gr):
    src = source_note(gr)
    g = gr["group"]
    legend_map = {lbl.upper(): text for lbl, text in parse_legend(g.get("legendHtml", ""))}
    letters = g.get("options") or sorted(legend_map.keys())
    opts = [{"value": l, "label": f"{l}) {legend_map.get(l, '')}"} for l in letters]
    out = []
    for q in g["questions"]:
        out.append({
            "prompt": strip_html(q.get("textHtml", "")),
            "kind": "choice",
            "options": opts,
            "answer": first_answer(q),
            "explanation": explanation_for(q),
            "source": src,
        })
    return out


def conv_sentence_endings(gr):
    src = source_note(gr)
    g = gr["group"]
    legend_map = {lbl.upper(): text for lbl, text in parse_legend(g.get("legendHtml", ""))}
    letters = sorted(legend_map.keys())
    opts = [{"value": l, "label": f"{l}) {legend_map[l]}"} for l in letters]
    out = []
    for q in g["questions"]:
        prompt = strip_html(q.get("before", "")) or strip_html(q.get("textHtml", ""))
        out.append({
            "prompt": prompt,
            "kind": "select",
            "options": opts,
            "answer": first_answer(q),
            "explanation": explanation_for(q),
            "source": src,
        })
    return out


GAP_PAT = re.compile(r"\s*(?:…[….]*|\.{4,})\s*")
BLANK = " ________ "


def fill_blank(text):
    """The test data prints a gap as a run of dots; show it as ________."""
    return re.sub(r"\s+", " ", GAP_PAT.sub(BLANK, text, count=1)).strip()


def legend_gap_lines(gr):
    """Notes / summary groups whose questions carry no text of their own:
       the words around each gap live in the group's legend, one gap per
       line, marked "(19) ......". Returns {question number: prompt}."""
    html = re.sub(r"<br\s*/?>|</p>|</span>|</li>", "\n", gr["group"].get("legendHtml") or "")
    gap = re.compile(r"\((\d+)\)(?:\s*(?:…[….]*|\.{4,}))?")
    lines = {}
    for raw in html.split("\n"):
        line = strip_html(raw).lstrip("•· ").strip()
        for m in gap.finditer(line):
            # This question's gap becomes the blank; any other gap sharing
            # the line is shown as a plain "…" so it is not mistaken for it.
            text = gap.sub(lambda o: BLANK if o.start() == m.start() else " … ", line)
            lines[int(m.group(1))] = re.sub(r"\s+", " ", text).strip()
    return lines


def conv_fill(gr, question_style=False):
    """question_style=False: sentence with a blank (before ____ after).
       question_style=True: a real question, before is the full question."""
    src = source_note(gr)
    legend_lines = None
    out = []
    for q in gr["group"]["questions"]:
        before = strip_html(q.get("before", ""))
        after = strip_html(q.get("after", ""))
        if question_style:
            prompt = before or strip_html(q.get("textHtml", ""))
        elif not before and not after:
            if legend_lines is None:
                legend_lines = legend_gap_lines(gr)
            num = int(re.sub(r"\D", "", q.get("id", "")) or 0)
            if num not in legend_lines:
                raise SystemExit(f"Test {gr['test_num']} Q{gr['qrange']}: no gap ({num}) in the group's legend")
            prompt = legend_lines[num]
        elif GAP_PAT.search(before):
            prompt = fill_blank(f"{before} {after}")
        else:
            prompt = re.sub(r"\s+", " ", f"{before} ________ {after}").strip()
        out.append({
            "prompt": prompt,
            "kind": "text",
            "answer": all_answers(q),
            "explanation": explanation_for(q),
            "source": src,
        })
    return out


def conv_wordbank_select(gr):
    src = source_note(gr)
    g = gr["group"]
    legend_map = {lbl.upper(): text for lbl, text in parse_legend(g.get("legendHtml", ""))}
    letters = sorted(legend_map.keys())
    opts = [{"value": l, "label": f"{l}) {legend_map[l]}"} for l in letters]
    out = []
    for q in g["questions"]:
        before = strip_html(q.get("before", ""))
        after = strip_html(q.get("after", ""))
        prompt = re.sub(r"\s+", " ", f"{before} ________ {after}").strip()
        out.append({
            "prompt": prompt,
            "kind": "select",
            "options": opts,
            "answer": first_answer(q),
            "explanation": explanation_for(q),
            "source": src,
        })
    return out


def conv_table_or_diagram_blanks(gr, label):
    """Table-completion / diagram-label groups: the real 'before'/'after'
       text is scrape noise (surrounding table-cell text), not a clean
       prompt, so use a short honest placeholder instead; the real table
       or diagram image is shown above via a passages[].html entry."""
    src = source_note(gr)
    out = []
    for i, q in enumerate(gr["group"]["questions"], start=1):
        out.append({
            "prompt": f"{label} {i}: what word goes here?",
            "kind": "text",
            "answer": all_answers(q),
            "explanation": explanation_for(q),
            "source": src,
        })
    return out


# ------------------------------------------------------------- lessons --

LESSON_META = {
    "mc": {"title": "Exercise. Choose the correct answer (real test questions)"},
    "tfng": {"title": "Exercise. Decide: True, False, or Not Given (real test questions)"},
    "ynng": {
        "title": "Exercise. Decide: Yes, No, or Not Given (real test questions)",
        "intro": "These statements test the writer's own opinions and claims, not simple facts.",
    },
    "headings": {
        "title": "Exercise. Match each heading to a paragraph (real test questions)",
        "intro": "For each paragraph, choose the heading that best fits it, using the passage above.",
        "selectNoun": "heading",
    },
    "matching-information": {"title": "Exercise. Which paragraph contains the information? (real test questions)"},
    "matching-features": {
        "title": "Exercise. Classify each statement (real test questions)",
        "intro": "Read each statement, then choose which option below it matches, using the passage above.",
    },
    "matching-sentence-endings": {
        "title": "Exercise. Match each sentence beginning to its correct ending (real test questions)",
        "intro": "Choose the ending that correctly completes each sentence beginning, using the passage above.",
        "selectNoun": "ending",
    },
    "sentence": {
        "title": "Exercise. Complete the sentences (real test questions)",
        "intro": "Fill each gap using words taken from the passage above.",
    },
    "summary-completion": {
        "title": "Exercise. Complete the summary, notes or table (real test questions)",
        "intro": "Fill each gap using words from the passage above, or the word bank where given.",
    },
    "short-answer": {
        "title": "Exercise. Answer the questions (real test questions)",
        "intro": "Answer using words taken from the passage above.",
    },
    "diagram": {
        "title": "Exercise. Label the diagram (real test questions)",
        "intro": "Use words from the passage above to complete each label. The real diagram from the test is shown below.",
    },
}


def build_unit(slug, gr):
    """One unit = one real passage plus the questions drawn from it. Keeping
       each source group as its own unit (rather than merging every group's
       passages and questions into one flat lesson-wide list) is what lets
       PracticeQuiz.tsx show a passage immediately followed by its own
       questions, instead of every passage stacked above every question."""
    if slug in ("tfng", "ynng"):
        opts = TFNG_OPTS if slug == "tfng" else YNNG_OPTS
        return {"passages": [passage_entry(gr)], "questions": conv_tfng_ynng(gr, opts)}
    if slug == "mc":
        return {"passages": [passage_entry(gr)], "questions": conv_mc(gr)}
    if slug == "headings":
        return {"passages": [passage_entry(gr)], "questions": conv_headings(gr)}
    if slug == "matching-information":
        return {"passages": [passage_entry(gr)], "questions": conv_paragraph_matching(gr)}
    if slug == "matching-features":
        return {"passages": [passage_entry(gr)], "questions": conv_matching_features(gr)}
    if slug == "matching-sentence-endings":
        return {"passages": [passage_entry(gr)], "questions": conv_sentence_endings(gr)}
    if slug == "sentence":
        return {"passages": [passage_entry(gr)], "questions": conv_fill(gr, question_style=False)}
    if slug == "short-answer":
        return {"passages": [passage_entry(gr)], "questions": conv_fill(gr, question_style=True)}
    if slug == "summary-completion":
        sub = summary_subtype(gr)
        note = {"table": "table completion", "flowchart": "flow-chart completion",
                "notes": "notes completion", "wordbank": "summary completion, word bank",
                "summary": "summary completion"}[sub]
        passages = [passage_entry(gr, note=note)]
        if sub == "table":
            passages.append(legend_entry(gr, "Table"))
            questions = conv_table_or_diagram_blanks(gr, "Table blank")
        elif sub == "wordbank":
            questions = conv_wordbank_select(gr)
        else:
            questions = conv_fill(gr, question_style=False)
        return {"passages": passages, "questions": questions}
    if slug == "diagram":
        passages = [passage_entry(gr), legend_entry(gr, "Diagram")]
        return {"passages": passages, "questions": conv_table_or_diagram_blanks(gr, "Diagram label")}
    raise ValueError(slug)


def build_set(slug, groups):
    meta = LESSON_META[slug]
    out = {"title": meta["title"]}
    if "intro" in meta:
        out["intro"] = meta["intro"]
    if "selectNoun" in meta:
        out["selectNoun"] = meta["selectNoun"]
    out["units"] = [build_unit(slug, gr) for gr in groups]
    return out


# ------------------------------------------------------------- output --

HEADER = """/* Interactive practice exercises for the reading question-type pages.
   Generated by tools/build_reading_practice.py from the site's real,
   imported IELTS reading tests (src/data/tests/reading-full-*.ts), so
   every question, answer, explanation and evidence sentence below is a
   real exam question, not a generated one. Re-run the script to refresh
   this file after the test bank changes:

       python tools/build_reading_practice.py

   The "paraphrase" lesson is hand-written and kept as-is by the script:
   it is a skill lesson, not an official IELTS question type, so no
   imported test has a matching question group for it (see the comment on
   it in src/data/reading.ts).

   Rendered by src/components/PracticeQuiz.tsx on /lessons/reading/<part>. */

export interface PracticeQuestion {
  /** Question text (plain text or small inline HTML). */
  prompt: string;
  kind: 'choice' | 'text' | 'select';
  /** For choice/select questions: value = what is chosen, label = what shows. */
  options?: { value: string; label?: string }[];
  /** Accepted answer(s); text answers compare case-insensitively, trimmed. */
  answer: string | string[];
  explanation: string;
  /** Credit line for a question sourced from a real imported test, e.g.
      "Academic Reading Test 7, Questions 14 to 19". Shown next to the
      explanation once the question is answered. */
  source?: string;
}

/** A block of real source text belonging to one unit, so students read the
    same passage the real question was written against. `html` is used
    instead of `paragraphs` for the rare group that is a real table or
    diagram image rather than running text (PracticeQuiz can't flatten
    those into plain paragraphs). */
export interface PracticePassage {
  label: string;
  title?: string;
  paragraphs?: string[];
  html?: string;
}

/** One real passage (or, for listening, one real audio segment - see
    ListeningPracticeSegment in ./listening-practice.ts, added to this
    interface there via module augmentation) immediately followed by the
    questions drawn from it. A PracticeSet is a list of these, rendered by
    PracticeQuiz.tsx as passage-then-questions, checked one unit at a time,
    rather than every passage stacked above every question. */
export interface PracticeUnit {
  /** Real passage(s) / table / diagram this unit's questions are drawn
      from. Usually one entry; a table or diagram unit carries a second
      entry for its legend/table image. Omitted for a unit with no source
      passage (the hand-written "paraphrase" drill). */
  passages?: PracticePassage[];
  /** Optional short instruction specific to this unit. */
  intro?: string;
  questions: PracticeQuestion[];
}

export interface PracticeSet {
  title: string;
  /** Optional short instruction shown once, above every unit. */
  intro?: string;
  /** What a 'select' question is choosing, used in the dropdown placeholder,
      its accessible label and the default option text. Defaults to
      'paragraph' since Matching Headings was the first set to use one;
      Matching Sentence Endings sets it to 'ending'. */
  selectNoun?: string;
  units: PracticeUnit[];
}

export const READING_PRACTICE: Record<string, PracticeSet> = {
"""

FOOTER = """};
"""


def ts_json(value, indent):
    """json.dumps produces valid TS/JS object-literal syntax (quoted keys,
       no trailing commas) so we can use it directly for the generated
       lesson blocks."""
    return json.dumps(value, indent=2, ensure_ascii=False)


def indent_block(text, spaces):
    pad = " " * spaces
    return "\n".join(pad + line if line else line for line in text.split("\n"))


# Verbatim paraphrase block, kept byte-for-byte from the current file.
PARAPHRASE_BLOCK = """  paraphrase: {
    title: 'Exercise. Spot the Correct Paraphrase',
    units: [
      {
        intro: 'Warm-up, written for this lesson: for each "passage" sentence, choose the option that means the same thing. Not the one that just reuses the same words.',
        questions: [
      {
        prompt: 'Passage: "The number of visitors to the museum has risen sharply since it introduced free admission."',
        kind: 'choice',
        options: [
          { value: 'A', label: 'A) Visitor numbers grew quickly after entry became free.' },
          { value: 'B', label: 'B) The museum introduced free admission because visitor numbers were falling.' },
          { value: 'C', label: 'C) Visitor numbers have started to fall since admission became free.' },
        ],
        answer: 'A',
        explanation: '“Risen sharply” = grew quickly; “introduced free admission” = entry became free. B invents a reason the passage never gives; C reverses the direction of change.',
      },
      {
        prompt: 'Passage: "Although the theory is widely accepted, a small number of scientists continue to dispute it."',
        kind: 'choice',
        options: [
          { value: 'A', label: 'A) All scientists now accept the theory.' },
          { value: 'B', label: 'B) Most scientists accept the theory, but a few still disagree.' },
          { value: 'C', label: 'C) The theory has been rejected by the majority of scientists.' },
        ],
        answer: 'B',
        explanation: '“Widely accepted” is not “all”. B keeps the same quantifier strength; A over-generalises and C reverses which side the majority is on.',
      },
      {
        prompt: 'Passage: "Coral reefs, though they cover less than one percent of the ocean floor, support around a quarter of all marine species."',
        kind: 'choice',
        options: [
          { value: 'A', label: 'A) A disproportionately large share of marine life depends on a tiny fraction of the seabed.' },
          { value: 'B', label: 'B) Coral reefs make up a quarter of the world’s oceans.' },
          { value: 'C', label: 'C) Marine species make up one percent of coral reefs.' },
        ],
        answer: 'A',
        explanation: '“Tiny fraction of the seabed” = under 1% of the ocean floor; “disproportionately large share of marine life” = a quarter of all species. B and C both misread which number applies to which quantity.',
      },
      {
        prompt: 'Passage: "The invention of the printing press led to a rapid spread of literacy across Europe."',
        kind: 'choice',
        options: [
          { value: 'A', label: 'A) Literacy spread quickly across Europe after the printing press was invented.' },
          { value: 'B', label: 'B) The printing press spread rapidly because literacy increased across Europe.' },
          { value: 'C', label: 'C) Few people in Europe could read after the printing press was invented.' },
        ],
        answer: 'A',
        explanation: 'The cause is the printing press, the effect is spreading literacy. B reverses cause and effect; C contradicts the passage outright.',
      },
      {
        prompt: 'Passage: "Researchers believe the drug may reduce symptoms in some patients, although further trials are needed."',
        kind: 'choice',
        options: [
          { value: 'A', label: 'A) The drug has been proven to cure the illness in all patients.' },
          { value: 'B', label: 'B) It is possible the drug helps some patients, but this is not yet confirmed.' },
          { value: 'C', label: 'C) Researchers have concluded the drug does not work.' },
        ],
        answer: 'B',
        explanation: '“Believe… may… some” is hedged, uncertain language. A upgrades it to a proven, universal claim; C states the opposite conclusion.',
      },
      {
        prompt: 'Passage: "Most of the artefacts recovered from the site date back to the Bronze Age, although a few are considerably older."',
        kind: 'choice',
        options: [
          { value: 'A', label: 'A) Every artefact found at the site is from the Bronze Age.' },
          { value: 'B', label: 'B) The majority of the finds are Bronze Age, but not every single one.' },
          { value: 'C', label: 'C) None of the artefacts are older than the Bronze Age.' },
        ],
        answer: 'B',
        explanation: '“Most” ≠ “every”. A over-generalises, and C directly contradicts “a few are considerably older”.',
      },
      {
        prompt: 'Passage: "When oil prices spiked in the 1970s, many Western economies were caught off guard."',
        kind: 'choice',
        options: [
          { value: 'A', label: 'A) Western economies were well prepared for the rise in oil prices.' },
          { value: 'B', label: 'B) Many Western economies were unprepared when oil prices rose suddenly.' },
          { value: 'C', label: 'C) Oil prices fell sharply in the 1970s, surprising many economies.' },
        ],
        answer: 'B',
        explanation: '“Caught off guard” = unprepared; “spiked” = rose suddenly. A reverses the meaning of the idiom, and C reverses the direction of the price change.',
      },
      {
        prompt: 'Passage: "Fewer than one in ten adults in the survey reported exercising regularly."',
        kind: 'choice',
        options: [
          { value: 'A', label: 'A) Over 90% of the adults surveyed said they exercised regularly.' },
          { value: 'B', label: 'B) The vast majority of adults surveyed do not exercise regularly.' },
          { value: 'C', label: 'C) Around half the adults surveyed exercise on a regular basis.' },
        ],
        answer: 'B',
        explanation: '“Fewer than one in ten” do exercise regularly, so the vast majority do not. A inverts the fraction, and C misreads it as roughly half.',
      },
        ],
      },
"""
PARAPHRASE_TAIL = """    ],
  },"""

# The real passage that ends the paraphrase lesson: test number, the start
# of the passage title, and the question groups to take from it. Its third
# group (sentence endings, questions 7 to 9) is left out because the
# imported copy merged its answer options into the last question's text.
PARAPHRASE_SOURCE = {"test": 20, "title": "Sleeping on the job", "kinds": ("mc", "ynng")}
PARAPHRASE_REAL_INTRO = (
    "Every answer below depends on a paraphrase of the passage above: "
    "find the sentence that talks about the same idea, then check whether it really makes the same claim. "
    "For the Yes / No / Not Given statements: Yes means the passage says the same thing in other words, "
    "No means it says the opposite, and Not Given means it never says it."
)


def build_paraphrase_real_unit(groups):
    """The real passage for the paraphrase lesson: one passage shown once,
       followed by every chosen question group in test order."""
    src = PARAPHRASE_SOURCE
    picked = [
        gr for gr in groups
        if gr["test_num"] == src["test"]
        and gr["passage_title"].startswith(src["title"])
        and classify(gr) in src["kinds"]
    ]
    if not picked:
        raise SystemExit(f"paraphrase: no groups found for Test {src['test']} '{src['title']}'")
    questions = []
    for gr in picked:
        kind = classify(gr)
        questions += conv_mc(gr) if kind == "mc" else conv_tfng_ynng(gr, YNNG_OPTS if kind == "ynng" else TFNG_OPTS)
    first = picked[0]
    # Name exactly the questions shown. Groups left out leave gaps in the
    # numbering, so "1 to 13" would promise questions that are not there.
    numbers = []
    for gr in picked:
        ends = [int(n) for n in gr["qrange"].split(" to ")]
        numbers += list(range(ends[0], ends[-1] + 1))
    spans, run = [], [numbers[0]]
    for n in numbers[1:]:
        if n == run[-1] + 1:
            run.append(n)
        else:
            spans.append(run); run = [n]
    spans.append(run)
    parts = [str(r[0]) if len(r) == 1 else f"{r[0]} to {r[-1]}" for r in spans]
    qrange = parts[0] if len(parts) == 1 else ", ".join(parts[:-1]) + " and " + parts[-1]
    label = f"Academic Reading Test {first['test_num']}, {first['part_label']}, Questions {qrange}"
    return {
        "passages": [{"label": label, "title": first["passage_title"], "paragraphs": first["passage_paras"]}],
        "intro": PARAPHRASE_REAL_INTRO,
        "questions": questions,
    }


def main():
    tests = load_tests()
    groups = flatten_groups(tests)

    slugs = [
        "mc", "tfng", "ynng", "headings", "matching-information",
        "matching-features", "matching-sentence-endings", "sentence",
        "summary-completion", "short-answer", "diagram",
    ]

    report_rows = []
    entries = []
    for slug in slugs:
        chosen = pinned_groups(groups, slug)
        pset = build_set(slug, chosen)
        entries.append((slug, pset))
        sources = "; ".join(f"Test {g['test_num']} Q{g['qrange']}" for g in chosen)
        types = ", ".join(sorted({g["group"]["type"] for g in chosen}))
        n_questions = sum(len(u["questions"]) for u in pset["units"])
        report_rows.append((slug, types, sources, n_questions))

    with open(OUT_PATH, "w", encoding="utf-8", newline="\n") as f:
        f.write(HEADER)
        f.write(PARAPHRASE_BLOCK)
        f.write(indent_block(ts_json(build_paraphrase_real_unit(groups), 0), 6) + ",\n")
        f.write(PARAPHRASE_TAIL)
        f.write("\n\n")
        for i, (slug, pset) in enumerate(entries):
            body = ts_json(pset, 2)
            f.write(f"  {json.dumps(slug)}: {body},\n")
            if i != len(entries) - 1:
                f.write("\n")
        f.write("\n")
        f.write(FOOTER)

    print("Wrote", OUT_PATH)
    print()
    print(f"{'slug':<28}{'source type(s)':<30}{'sources':<45}{'questions'}")
    for slug, types, sources, n in report_rows:
        print(f"{slug:<28}{types:<30}{sources:<45}{n}")


if __name__ == "__main__":
    main()
