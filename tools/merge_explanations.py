"""Merge written answer explanations into a reading test file, safely.

Agents write explanations as plain JSON (one file per test) instead of editing
the 36 KB test file by hand, which is how a whole test gets corrupted. This
tool does the edit, and refuses anything that would teach a student something
the passage does not say:

  * every question id must exist in the test, and every scored question must
    be covered;
  * `evidence` must appear in that question's own passage, character for
    character once quotes and spacing are normalised (a paraphrase is not
    evidence);
  * a Not Given / Not given answer must NOT carry evidence, because a Not
    Given answer has no location in the passage.

Usage:
    python tools/merge_explanations.py .tmp/explanations/reading-full-021.json
    python tools/merge_explanations.py .tmp/explanations/*.json --check

`--check` validates and reports without writing.

Input shape:
    {"q1": {"explanation": "...", "evidence": "..."},
     "q4": {"explanation": "..."}}
"""

from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TESTS = ROOT / "src" / "data" / "tests"

PREFIX = "const test: PracticeTest = "
SUFFIX = ";\n\nexport default test;\n"


def strip_html(markup: str) -> str:
    """Tags out, entities decoded. The listening transcripts encode apostrophes
    as &#x27;, so decoding has to be general: a hand-written entity list made
    an evidence quote with an apostrophe impossible to pass."""
    return html.unescape(re.sub(r"<[^>]+>", " ", markup))


def normalise(s: str) -> str:
    """Fold the differences that do not change what the passage says."""
    s = strip_html(s)
    s = s.replace("‘", "'").replace("’", "'")
    s = s.replace("“", '"').replace("”", '"')
    s = s.replace("–", "-").replace("—", "-")
    return re.sub(r"\s+", " ", s).strip().lower()


# Reading tests are `const test: PracticeTest = {...};\n\nexport default test;`
# and listening tests are `export const listeningFullNNN: PracticeTest = {...};`.
# Accept either, and remember which, so a file is written back in its own shape.
HEADER_RE = re.compile(r"(?:const test|export const (\w+)): PracticeTest = ")


def load_test(test_id: str) -> tuple[dict, Path, str]:
    path = TESTS / f"{test_id}.ts"
    raw = path.read_text(encoding="utf-8")
    match = HEADER_RE.search(raw)
    if not match:
        raise SystemExit(f"{test_id}: cannot find the PracticeTest declaration")
    return json.loads(raw[match.end() : raw.rindex("};") + 1]), path, match.group(1) or ""


def part_text(part: dict) -> str:
    stimulus = part.get("stimulus") or {}
    pieces = [stimulus.get("html") or "", stimulus.get("passageHtml") or "", stimulus.get("transcriptHtml") or ""]
    for paragraph in stimulus.get("paragraphs") or []:
        if isinstance(paragraph, dict):
            pieces.append(paragraph.get("html") or paragraph.get("text") or "")
        else:
            pieces.append(str(paragraph))
    for key in ("title", "label", "subtitle", "instructionHtml"):
        if stimulus.get(key):
            pieces.append(str(stimulus[key]))
    for group in part.get("groups", []):
        if group.get("legendHtml"):
            pieces.append(group["legendHtml"])
    return normalise(" ".join(pieces))


def merge(json_path: Path, write: bool) -> list[str]:
    test_id = json_path.stem
    entries = json.loads(json_path.read_text(encoding="utf-8"))
    test, ts_path, export_name = load_test(test_id)

    problems: list[str] = []
    seen: set[str] = set()
    covered = 0

    for part in test["parts"]:
        passage = part_text(part)
        for group in part.get("groups", []):
            for question in group.get("questions", []):
                qid = question["id"]
                entry = entries.get(qid)
                if question.get("scored") is False:
                    continue
                if entry is None:
                    problems.append(f"{test_id} {qid}: no explanation written")
                    continue
                seen.add(qid)
                explanation = (entry.get("explanation") or "").strip()
                evidence = (entry.get("evidence") or "").strip()
                if len(explanation) < 40:
                    problems.append(f"{test_id} {qid}: explanation is too short to teach anything")
                    continue
                answer = question.get("answer")
                is_not_given = isinstance(answer, str) and answer.strip().lower() in {"not given", "notgiven"}
                if is_not_given and evidence:
                    problems.append(f"{test_id} {qid}: a Not Given answer must not carry evidence")
                    continue
                if evidence and normalise(evidence) not in passage:
                    problems.append(f"{test_id} {qid}: evidence is not in the passage, word for word")
                    continue
                for text in (explanation, evidence):
                    if "—" in text or "–" in text:
                        problems.append(f"{test_id} {qid}: contains a dash character")
                        break
                else:
                    question["explanation"] = explanation
                    if evidence:
                        question["evidence"] = evidence
                    else:
                        question.pop("evidence", None)
                    covered += 1

    for qid in entries:
        if qid not in seen:
            problems.append(f"{test_id} {qid}: id is not in this test")

    if write and not problems:
        body = json.dumps(test, indent=2, ensure_ascii=False)
        header = "import type { PracticeTest } from '../../lib/tests/schema';\n\n"
        if export_name:
            text = f"{header}export const {export_name}: PracticeTest = {body};\n"
        else:
            text = f"{header}{PREFIX}{body}{SUFFIX}"
        # Each test file is consistently CRLF or LF; keep whichever it uses.
        if "\r\n" in ts_path.read_text(encoding="utf-8", newline=""):
            text = text.replace("\n", "\r\n")
        ts_path.write_text(text, encoding="utf-8", newline="")

    print(f"{test_id}: {covered} explanations ready, {len(problems)} problems{', written' if write and not problems else ''}")
    return problems


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    write = "--check" not in sys.argv
    if not args:
        print(__doc__)
        return 2
    problems: list[str] = []
    for pattern in args:
        for path in sorted(Path().glob(pattern)) or [Path(pattern)]:
            problems.extend(merge(path, write))
    for problem in problems:
        print("  " + problem)
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
