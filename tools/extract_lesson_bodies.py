"""One-time migration helper: extract lesson body HTML from the legacy
lessons/*.html pages into src/content/lesson-bodies/<slug>.html fragments.

The fragment = the in-page section nav (rewrapped as .lesson-toc) followed by
the inner content of <main>, with page-generated bits removed:
  - reading-task1's #samples section (was built client-side from
    READING_TESTS; the new /tests hub replaces it)

Content is otherwise byte-preserved so the new pages stay diff-comparable
with the originals. Safe to re-run.
"""

import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "lessons")
OUT_DIR = os.path.join(ROOT, "src", "content", "lesson-bodies")

SLUGS = [
    "reading-task1",
    "writing-task1",
    "writing-task2",
    "speaking-part1",
    "speaking-part2",
    "speaking-part3",
    "listening",
    "vocabulary",
]

NAV_RE = re.compile(r"<nav>(.*?)</nav>", re.DOTALL)
MAIN_RE = re.compile(r"<main>(.*?)</main>", re.DOTALL)
SAMPLES_RE = re.compile(r"\s*<hr class=\"divider\">\s*<!-- SAMPLES -->.*?<!-- /SAMPLES -->", re.DOTALL)


def extract(slug: str) -> None:
    path = os.path.join(SRC_DIR, slug + ".html")
    with open(path, encoding="utf-8") as f:
        html = f.read()

    nav_m = NAV_RE.search(html)
    main_m = MAIN_RE.search(html)
    if not main_m:
        raise SystemExit(f"No <main> found in {path}")

    body = main_m.group(1)

    if slug == "reading-task1":
        # The samples grid was rendered client-side from READING_TESTS;
        # the new page appends a server-rendered tests section instead.
        body = SAMPLES_RE.sub("", body)

    toc = ""
    if nav_m:
        toc = f'<nav class="lesson-toc" aria-label="Lesson sections">{nav_m.group(1)}</nav>\n'

    fragment = toc + body.strip() + "\n"

    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, slug + ".html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(fragment)
    print(f"  OK  {slug}.html ({len(fragment):,} chars)")


if __name__ == "__main__":
    for slug in SLUGS:
        extract(slug)
