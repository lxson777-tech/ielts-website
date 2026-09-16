"""Clean up the completion questions in the imported reading tests.

The importer flattened each summary, note and table stimulus twice: once into
the group's `legendHtml`, which renders correctly, and once into each
question's `before`/`after` text, where the cells and bullets ran together. A
student reading the per-question line sees the wrong fragment, usually the text
that belongs to the NEXT gap, and reads the same task twice.

Two fixes, both mechanical and reversible:

  1. Where the group has a legend that already shows this question's numbered
     gap, drop the question's own `before`/`after`. The legend is the version
     that renders correctly, so the numbered input sits under it, which is how
     the paper test works.
  2. Strip an option or word list that the importer glued onto the end of a
     question's text ("List of words", "List of People", "List of Experts"
     and so on). The same list is already in the legend.

Usage:
    python tools/clean_question_text.py --check      # report only
    python tools/clean_question_text.py              # write
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TESTS = ROOT / "src" / "data" / "tests"
PREFIX = "const test: PracticeTest = "
SUFFIX = ";\n\nexport default test;\n"

LIST_TAIL = re.compile(r"\s*\bLists? of [A-Z][A-Za-z ]{2,30}\b.*$", re.DOTALL)


def load(path: Path) -> dict:
    raw = path.read_text(encoding="utf-8")
    start = raw.index(PREFIX) + len(PREFIX)
    end = raw.rindex(";\n\nexport default test;")
    return json.loads(raw[start:end])


def save(path: Path, test: dict) -> None:
    body = json.dumps(test, indent=2, ensure_ascii=False)
    path.write_text(
        f"import type {{ PracticeTest }} from '../../lib/tests/schema';\n\n{PREFIX}{body}{SUFFIX}",
        encoding="utf-8",
    )


def clean(test: dict) -> tuple[int, int]:
    dropped = 0
    delisted = 0
    for part in test["parts"]:
        for group in part.get("groups", []):
            legend = group.get("legendHtml") or ""
            for question in group.get("questions", []):
                number = re.search(r"\d+", question["id"])
                shown_in_legend = bool(number) and f"({number.group(0)})" in legend

                for field in ("textHtml", "before", "after"):
                    value = question.get(field)
                    if isinstance(value, str) and LIST_TAIL.search(value):
                        stripped = LIST_TAIL.sub("", value).strip()
                        if stripped != value:
                            question[field] = stripped
                            delisted += 1

                if shown_in_legend:
                    had = any((question.get(f) or "").strip() for f in ("before", "after"))
                    if had:
                        question.pop("before", None)
                        question.pop("after", None)
                        dropped += 1
    return dropped, delisted


def main() -> int:
    write = "--check" not in sys.argv
    total_dropped = total_delisted = 0
    for path in sorted(TESTS.glob("reading-full-*.ts")):
        test = load(path)
        dropped, delisted = clean(test)
        if dropped or delisted:
            print(f"{path.stem}: {dropped} duplicated prompts dropped, {delisted} glued lists stripped")
            if write:
                save(path, test)
        total_dropped += dropped
        total_delisted += delisted
    print(f"total: {total_dropped} prompts, {total_delisted} lists{'' if write else ' (check only)'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
