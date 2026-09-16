#!/usr/bin/env python3
"""Remove the invented example questions from the writing lessons.

Each writing lesson used to carry a made-up exam question and a fragment of a
model answer, written in-house before the site had real exam material. Every
lesson now ends with a REAL task from the imported bank and a full Band 8
model with the examiner's reasons (src/components/LessonModelExample.tsx), so
the invented ones teach a question no student will ever meet and pad the
lesson with a second, weaker example.

This removes, per lesson:
  * the "Example question" box and the <details> model excerpt that follows it;
  * in the charts lesson, the whole "Full Worked Examples" section, which is
    four invented charts with four model reports;
  * the matching entry in the lesson's contents strip, and the now-orphaned
    divider.

Everything that teaches the method stays. Run with --check to see what would
go without writing.
"""

from __future__ import annotations

import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BODIES = ROOT / "src" / "content" / "lesson-bodies"

VOID = {"br", "hr", "img", "input", "meta", "link", "source", "col"}


class Balance(HTMLParser):
    """Cheap well-formedness check: every non-void tag closes, in order."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[str] = []
        self.problems: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag not in VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if not self.stack:
            self.problems.append(f"stray </{tag}>")
        elif self.stack[-1] != tag:
            self.problems.append(f"</{tag}> closes <{self.stack[-1]}>")
            self.stack.pop()
        else:
            self.stack.pop()

    def finish(self) -> list[str]:
        return self.problems + [f"unclosed <{t}>" for t in self.stack]


def block_end(html: str, start: int, tag: str) -> int:
    """Index just past the element that opens at `start`."""
    depth = 0
    for m in re.finditer(rf"<{tag}\b[^>]*>|</{tag}>", html[start:]):
        depth += 1 if m.group(0).startswith(f"</") is False else -1
        if depth == 0:
            return start + m.end()
    raise ValueError(f"unbalanced <{tag}> from {start}")


def drop_example_question(html: str) -> tuple[str, int]:
    """The 'Example question' box plus the <details> model that follows it."""
    removed = 0
    while True:
        m = re.search(r'<div class="passage-box">\s*<strong>Example question[^<]*</strong>', html, re.I)
        if not m:
            return html, removed
        end = block_end(html, m.start(), "div")
        after = html[end:]
        details = re.match(r"\s*<details>", after)
        if details:
            end = block_end(html, end + details.end() - len("<details>"), "details")
        html = html[: m.start()].rstrip() + "\n\n" + html[end:].lstrip()
        removed += 1


def drop_section(html: str, heading: str) -> tuple[str, int]:
    """A whole block by its heading, plus the divider before it. The block is
    whichever of <div class="section"> or <div class="card"> encloses it."""
    m = re.search(rf"<h[23]>{re.escape(heading)}</h[23]>", html)
    if not m:
        return html, 0
    start = max(html.rfind('<div class="section"', 0, m.start()), html.rfind('<div class="card"', 0, m.start()))
    end = block_end(html, start, "div")
    before = html[:start]
    divider = re.search(r'<hr class="divider">\s*$', before)
    if divider:
        before = before[: divider.start()]
    return before.rstrip() + "\n\n" + html[end:].lstrip(), 1


def drop_toc_entry(html: str, text: str) -> str:
    return re.sub(rf'\s*<a href="#[^"]*">[^<]*{re.escape(text)}[^<]*</a>', "", html, flags=re.I)


def main() -> int:
    write = "--check" not in sys.argv
    total = 0
    for path in sorted(BODIES.glob("writing-*.html")):
        html = original = path.read_text(encoding="utf-8")
        html, examples = drop_example_question(html)
        html, sections = drop_section(html, "Full Worked Examples")
        # In the charts lesson the four worked examples are siblings after that
        # card, each its own <details class="worked-example">.
        worked = 0
        while True:
            m = re.search(r'<details class="worked-example">', html)
            if not m:
                break
            end = block_end(html, m.start(), "details")
            html = html[: m.start()].rstrip() + "\n\n" + html[end:].lstrip()
            worked += 1
        sections += worked
        if sections:
            html = drop_toc_entry(html, "Worked Examples")
        if html == original:
            continue

        checker = Balance()
        checker.feed(html)
        problems = checker.finish()
        if problems:
            print(f"{path.name}: REFUSED, markup would break: {problems[:3]}")
            continue

        total += examples + sections
        print(
            f"{path.name}: {examples} invented example question(s)"
            f"{f', 1 worked-examples section' if sections else ''} removed"
            f" ({len(original) - len(html)} characters)"
        )
        if write:
            path.write_text(html, encoding="utf-8")

    print(f"total blocks removed: {total}{'' if write else ' (check only)'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
