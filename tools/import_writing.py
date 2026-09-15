"""Import IELTS Writing tasks shared by PracticePTEOnline.

Alex confirmed permission from the publisher on 2026-09-11 (the same
permission covers the listening tests imported by tools/import_listening.py
-- see docs/listening-sources.md and docs/WRITING-IMPORT-RESULT.md).

Each source page (https://practicepteonline.com/ielts-writing-test-N/) has a
Task 1 prompt with one or more chart/table/diagram images, a Task 2 prompt,
and (on many pages) a band 7.5 sample answer. This importer extracts the two
task prompts only -- never the sample answers, which are out of scope for
now (see docs/WRITING-IMPORT-RESULT.md for why) -- and writes them as
EssayPrompt records to src/data/writing-prompts-imported.ts. Task 1 images
are copied to public/pics/writing/imported/.


    python tools/import_writing.py 102 73      # imports tests 102 down to 73
"""

from __future__ import annotations

import json
import re
import sys
from html import escape
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup, Tag

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".tmp" / "writing-source"
IMAGE_DIR = ROOT / "public" / "pics" / "writing" / "imported"
OUT_FILE = ROOT / "src" / "data" / "writing-prompts-imported.ts"
SOURCE_ORIGIN = "https://practicepteonline.com"
SOURCE_TEMPLATE = SOURCE_ORIGIN + "/ielts-writing-test-{n}/"
# Deterministic merge caches: each mode's own last-produced result set, so
# re-running one mode never wipes out what the other mode already wrote.
TESTS_CACHE_FILE = CACHE / "results-tests.json"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )
}

# boilerplate the publisher wraps every prompt in, stripped from the
# cleaned prompt text (never treated as part of the question)
BOILERPLATE_LINE_RES = [
    re.compile(r"^write\s+at\s+(?:least|lease)\s+\d+\s*words\.?$", re.I),
    re.compile(r"^cambridge\s+ielts\s+tests\s+1\s+to\s+17\.?$", re.I),
]

HEADING_RE = {
    1: re.compile(r"^(?:task|test)\s*1\s*:\s*", re.I),
    2: re.compile(r"^(?:task|test)\s*2\s*:\s*", re.I),
}
ANSWER_HEADING_RE = re.compile(r"^(?:task|test)\s*\d*\s*band\b", re.I)

INSTRUCTION_START_RE = re.compile(
    r"^(to what extent|do you|why|what\s+(?:are|is|problems|solutions|measures|can|extent)|discuss|how|which|should)\b",
    re.I,
)
GIVE_REASONS_RE = re.compile(r"^give reasons for your answer", re.I)
SUMMARISE_RE = re.compile(r"summar(?:ise|ize) the information[^.?!]*[.?!]", re.I)


def fetch(n: int) -> tuple[str, Tag]:
    CACHE.mkdir(parents=True, exist_ok=True)
    url = SOURCE_TEMPLATE.format(n=n)
    path = CACHE / f"{n}.html"
    if not path.exists():
        response = requests.get(url, headers=HEADERS, timeout=60)
        response.raise_for_status()
        path.write_text(response.text, encoding="utf-8")
    soup = BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")
    body = soup.select_one(".entry-content")
    if body is None:
        raise RuntimeError(f"No entry-content found at {url}")
    return url, body


def download_image(url: str, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.stat().st_size:
        return
    response = requests.get(url, headers=HEADERS, timeout=120)
    response.raise_for_status()
    path.write_bytes(response.content)


def content_children(body: Tag) -> list[Tag]:
    """Top-level nodes of the article body, stopping at the share-buttons div."""
    out = []
    for child in body.find_all(recursive=False):
        if not isinstance(child, Tag):
            continue
        classes = " ".join(child.get("class", []))
        if "addtoany" in classes or "share" in classes:
            break
        out.append(child)
    return out


def flatten_fragments(body: Tag) -> list[Tag]:
    """Most pages put Task 1 and Task 2 in separate top-level <p> tags, but a
    few (e.g. test 107) cram both into one <p> separated by <br> tags, with
    an ad <ins> in between. Splitting every top-level <p> on its <br> tags
    into pseudo-line fragments makes both layouts look the same to the
    heading/region finders below -- each fragment is its own BeautifulSoup
    document, which supports get_text()/find_all("img") like a normal Tag."""
    fragments: list[Tag] = []
    for child in content_children(body):
        if child.name == "p":
            inner_html = "".join(str(c) for c in child.contents)
            for piece in re.split(r"<br\s*/?>", inner_html, flags=re.I):
                fragments.append(BeautifulSoup(piece, "html.parser"))
        else:
            fragments.append(child)
    return fragments


def para_text(tag: Tag) -> str:
    return " ".join(tag.get_text(" ", strip=True).split())


def is_boilerplate(text: str) -> bool:
    return any(p.match(text) for p in BOILERPLATE_LINE_RES)


def find_heading(children: list[Tag], task: int, start: int = 0) -> int | None:
    pattern = HEADING_RE[task]
    for i in range(start, len(children)):
        if pattern.match(para_text(children[i])):
            return i
    return None


def find_answer_boundary(children: list[Tag], start: int, end: int) -> int:
    for i in range(start, end):
        if ANSWER_HEADING_RE.match(para_text(children[i])):
            return i
    return end


def region_images(children: list[Tag], start: int, end: int, page_url: str) -> list[str]:
    """Unique absolute image URLs (real src, not the lazy-load gif placeholder)."""
    seen: list[str] = []
    for child in children[start:end]:
        for img in child.find_all("img"):
            src = img.get("data-src") or img.get("src") or ""
            if not src or src.startswith("data:"):
                continue
            absolute = urljoin(page_url, src.split("?", 1)[0])
            if absolute not in seen:
                seen.append(absolute)
    return seen


def region_text(children: list[Tag], start: int, end: int, task: int) -> str:
    """Join paragraph text in [start, end), stripping the heading prefix and boilerplate lines."""
    parts = []
    for i in range(start, end):
        text = para_text(children[i])
        if not text or is_boilerplate(text):
            continue
        if i == start:
            text = HEADING_RE[task].sub("", text)
            if not text:
                continue
        parts.append(text)
    return " ".join(parts).strip()


def split_sentences(text: str) -> list[str]:
    if not text:
        return []
    pieces = re.split(r"(?<=[.?!])\s+", text)
    return [p.strip() for p in pieces if p.strip()]


def shape_task1_html(text: str) -> str:
    """Wrap the "Summarise the information..." instruction sentence in <strong>."""
    match = SUMMARISE_RE.search(text)
    if not match:
        return text
    return text[: match.start()] + "<strong>" + match.group(0) + "</strong>" + text[match.end() :]


def shape_task2_html(text: str) -> tuple[str, list[str]]:
    """Bold the trailing instruction sentence(s); keep a trailing 'Give reasons...'
    sentence unbolded, matching the in-house prompt style. Returns (html, sentences)."""
    sentences = split_sentences(text)
    boilerplate = [s for s in sentences if GIVE_REASONS_RE.match(s)]
    core = [s for s in sentences if not GIVE_REASONS_RE.match(s)]
    if not core:
        return text, sentences

    instr_start = len(core)
    for i in range(len(core) - 1, -1, -1):
        if INSTRUCTION_START_RE.search(core[i]):
            instr_start = i
        else:
            break
    if instr_start == len(core):
        instr_start = len(core) - 1  # no sentence matched: bold just the last one

    context = " ".join(core[:instr_start]).strip()
    instruction = " ".join(core[instr_start:]).strip()
    html = (context + " " if context else "") + f"<strong>{instruction}</strong>"
    if boilerplate:
        html += " " + " ".join(boilerplate)
    return html.strip(), sentences


def infer_task1_variant(text: str) -> str:
    t = text.lower()
    found: set[str] = set()
    if re.search(r"\bline (?:graph|chart)s?\b", t):
        found.add("line-graph")
    if re.search(r"\bbar (?:chart|graph)s?\b", t):
        found.add("bar-chart")
    if re.search(r"\bpie charts?\b", t):
        found.add("pie-chart")
    if re.search(r"\btables?\b", t):
        found.add("table")
    if re.search(r"\b(?:maps?|floor plans?|site plans?|plans?)\b", t):
        found.add("map")
    if re.search(r"\bprocess\b|\bstages\b|\bmanufactur\w*\b", t) or re.search(
        r"\bhow\b.{0,60}\b(?:is|are)\b.{0,40}\b(?:made|produced|formed|created|generated|manufactured|recycled|processed|constructed)\b",
        t,
    ):
        found.add("process")
    # generic "chart"/"graph" word, only counted if no specific chart type matched
    if re.search(r"\b(?:charts?|graphs?)\b", t) and not (found & {"line-graph", "bar-chart", "pie-chart"}):
        found.add("chart")

    if len(found) >= 2:
        return "combination"
    if len(found) == 1:
        return next(iter(found))
    return "chart"


def infer_task2_variant(text: str, instruction_sentence_count: int) -> str:
    t = text.lower()
    if "agree or disagree" in t or "agree and disagree" in t:
        return "opinion"
    if "discuss both" in t:
        return "discussion"
    if re.search(r"\badvantages?\b", t) and re.search(r"\bdisadvantages?\b", t):
        return "advantages-disadvantages"
    if re.search(r"\bproblems?\b", t) or re.search(r"\bsolutions?\b", t) or re.search(r"\bcauses?\b", t):
        return "problem-solution"
    if instruction_sentence_count >= 2:
        return "two-part"
    return "opinion"


VARIANT_LABEL = {
    "line-graph": "line graph",
    "bar-chart": "bar chart",
    "pie-chart": "pie chart",
    "table": "table",
    "process": "process",
    "map": "map",
    "combination": "chart and table",
    "chart": "chart",
}

LEAD_VERB_RE = re.compile(
    r"\b(?:shows?|gives?|illustrates?|compares?|outlines?|indicates?)\b\s*(?:information\s+(?:about|on)\s+)?",
    re.I,
)
FILLER_PREFIX_RES = [
    re.compile(r"^(?:the\s+)?results?\s+of\s+(?:a\s+)?survey\s+of\s+", re.I),
    re.compile(r"^(?:the\s+)?(?:number|percentage|amount|proportion)\s+of\s+", re.I),
]


TRAILING_STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of",
    "with", "by", "from", "is", "are", "was", "were", "this", "that", "as",
    "it", "its", "their", "than", "when", "while", "who", "which", "than",
}


def trim_dangling_words(phrase: str) -> str:
    """Drop trailing filler words left over after a hard word-count cut, so a
    title never ends on "in the" or "and the"."""
    words = phrase.strip().split()
    while len(words) > 3 and words[-1].lower().strip(".,") in TRAILING_STOPWORDS:
        words.pop()
    return " ".join(words)


def make_title(text: str, variant: str) -> str:
    match = LEAD_VERB_RE.search(text)
    phrase = text[match.end() :] if match else text
    phrase = re.split(r"[.,]| and how | which ", phrase, maxsplit=1)[0]
    for pattern in FILLER_PREFIX_RES:
        phrase = pattern.sub("", phrase)
    words = phrase.strip().split()
    if len(words) > 9:
        phrase = " ".join(words[:9])
    phrase = trim_dangling_words(phrase)
    phrase = phrase.strip(" ,.")
    if not phrase:
        phrase = text.split(".")[0][:60].strip()
    title = phrase[0].upper() + phrase[1:] if phrase else "Writing task"
    return f"{title} ({VARIANT_LABEL[variant]})"


def make_task2_title(sentences: list[str], instruction_count: int) -> str:
    context_sentences = sentences[: max(0, len(sentences) - instruction_count)] or sentences[:1]
    phrase = " ".join(context_sentences)
    phrase = re.sub(
        r"^(?:some|many)\s+people\s+(?:believe|think|say|argue)\s+(?:that\s+)?",
        "",
        phrase,
        flags=re.I,
    )
    phrase = re.sub(r"^in\s+many\s+countries,?\s+", "", phrase, flags=re.I)
    phrase = re.sub(r"^nowadays,?\s+", "", phrase, flags=re.I)
    words = phrase.strip(" .").split()
    if len(words) > 8:
        phrase = " ".join(words[:8])
    phrase = trim_dangling_words(phrase)
    phrase = phrase.strip(" ,.")
    if not phrase:
        phrase = "Writing Task 2"
    return phrase[0].upper() + phrase[1:]


class SkipTask(Exception):
    pass


def build_task1(n: int, children: list[Tag], task1_idx: int, task2_idx: int, page_url: str) -> dict:
    text = region_text(children, task1_idx, task2_idx, task=1)
    if not text:
        raise SkipTask("no Task 1 prompt text found")

    variant = infer_task1_variant(text)
    image_urls = region_images(children, task1_idx, task2_idx, page_url)
    local_images: list[str] = []
    if not image_urls:
        raise SkipTask("no Task 1 image found")
    for index, image_url in enumerate(image_urls, start=1):
        ext = Path(image_url.split("?", 1)[0]).suffix.lower() or ".png"
        suffix = "" if index == 1 else f"-{index}"
        filename = f"wt-{n}-task1{suffix}{ext}"
        local_path = IMAGE_DIR / filename
        download_image(image_url, local_path)
        local_images.append(f"/pics/writing/imported/{filename}")
    html_text = shape_task1_html(text)
    title = make_title(text, variant)
    subject = title.rsplit(" (", 1)[0]
    subject_lower = subject[0].lower() + subject[1:] if subject else subject
    alt = f"{VARIANT_LABEL[variant].capitalize()} showing {subject_lower}"

    return {
        "id": f"pte-wt-{n}-task1",
        "task": "task1",
        "variant": variant,
        "title": title,
        "promptHtml": html_text,
        "images": local_images,
        "alt": alt,
        "minWords": 150,
        "suggestedMinutes": 20,
        "suggestedVocab": [],
        "source": {
            "name": "PracticePTEOnline",
            "url": page_url,
            "permission": "Reused with permission from the publisher.",
        },
    }


def build_task2(n: int, children: list[Tag], task2_idx: int, end_idx: int, page_url: str) -> dict:
    text = region_text(children, task2_idx, end_idx, task=2)
    if not text:
        raise SkipTask("no Task 2 prompt text found")

    html_text, sentences = shape_task2_html(text)
    strong_match = re.search(r"<strong>(.*)</strong>", html_text)
    instruction_count = len(re.findall(r"[.?!]", strong_match.group(1))) if strong_match else 1
    instruction_count = instruction_count or 1
    variant = infer_task2_variant(text, instruction_count)
    title = make_task2_title(sentences, instruction_count)

    return {
        "id": f"pte-wt-{n}-task2",
        "task": "task2",
        "variant": variant,
        "title": title,
        "promptHtml": html_text,
        "images": [],
        "alt": "",
        "minWords": 250,
        "suggestedMinutes": 40,
        "suggestedVocab": [],
        "source": {
            "name": "PracticePTEOnline",
            "url": page_url,
            "permission": "Reused with permission from the publisher.",
        },
    }


def extract_test(n: int, results: list[dict], skipped: list[tuple[str, str]]) -> None:
    page_url, body = fetch(n)
    children = flatten_fragments(body)

    task1_idx = find_heading(children, 1)
    if task1_idx is None:
        skipped.append((f"pte-wt-{n}-task1", "no Task 1 heading found on page"))
        task2_search_start = 0
    else:
        task2_search_start = task1_idx + 1

    task2_idx = find_heading(children, 2, start=task2_search_start)
    if task2_idx is None:
        skipped.append((f"pte-wt-{n}-task2", "no Task 2 heading found on page"))

    if task1_idx is not None:
        t1_end = task2_idx if task2_idx is not None else len(children)
        try:
            results.append(build_task1(n, children, task1_idx, t1_end, page_url))
        except SkipTask as exc:
            skipped.append((f"pte-wt-{n}-task1", str(exc)))

    if task2_idx is not None:
        t2_end = find_answer_boundary(children, task2_idx + 1, len(children))
        try:
            results.append(build_task2(n, children, task2_idx, t2_end, page_url))
        except SkipTask as exc:
            skipped.append((f"pte-wt-{n}-task2", str(exc)))



def load_cache(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def save_cache(path: Path, results: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")


def dq(value: str) -> str:
    """A double-quoted, fully-escaped JS/TS string literal."""
    return json.dumps(value, ensure_ascii=False)


def img_tag(local_path: str, alt: str) -> str:
    alt_html = escape(alt, quote=True)
    return (
        f'<img src="${{withBase(\'{local_path}\')}}" alt="{alt_html}" loading="lazy" '
        'style="width:100%;max-width:560px;height:auto;margin-top:12px;background:#fff">'
    )


def prompt_html_field(prompt: dict) -> str:
    if not prompt["images"]:
        return f"    promptHtml: {dq(prompt['promptHtml'])},\n"
    text = prompt["promptHtml"]
    escaped = text.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")
    tags = "\n      ".join(img_tag(path, prompt["alt"]) for path in prompt["images"])
    return f"    promptHtml: `{escaped}\n      {tags}`,\n"


def render_prompt(prompt: dict) -> str:
    lines = [
        "  {",
        f"    id: '{prompt['id']}',",
        f"    task: '{prompt['task']}',",
        f"    variant: '{prompt['variant']}',",
        f"    title: {dq(prompt['title'])},",
    ]
    lines.append(prompt_html_field(prompt).rstrip("\n"))
    lines += [
        f"    minWords: {prompt['minWords']},",
        f"    suggestedMinutes: {prompt['suggestedMinutes']},",
        "    suggestedVocab: [],",
        "    source: {",
        f"      name: {dq(prompt['source']['name'])},",
        f"      url: {dq(prompt['source']['url'])},",
        f"      permission: {dq(prompt['source']['permission'])},",
        "    },",
        "  },",
    ]
    return "\n".join(lines)


HEADER = """/* Writing practice prompts imported from PracticePTEOnline, with the
   publisher's permission (confirmed 2026-09-11 -- see
   docs/WRITING-IMPORT-RESULT.md). Generated by tools/import_writing.py --
   re-run the script rather than hand-editing this file. Sample band-7.5
   answers on the source pages are NOT imported (out of scope for now). */

import type { EssayPrompt } from '../lib/writing/schema';
import { withBase } from '../lib/url';

export const IMPORTED_WRITING_PROMPTS: EssayPrompt[] = [
"""

FOOTER = "\n];\n"


def write_output(prompts: list[dict]) -> None:
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    body = "\n".join(render_prompt(p) for p in prompts)
    OUT_FILE.write_text(HEADER + body + FOOTER, encoding="utf-8")



def run_test_range_mode(args: list[str]) -> None:
    start_n = int(args[0]) if len(args) > 0 else 132
    end_n = int(args[1]) if len(args) > 1 else 103
    test_range = range(start_n, end_n - 1, -1) if start_n >= end_n else range(start_n, end_n + 1)

    results: list[dict] = []
    skipped: list[tuple[str, str]] = []
    errors: list[tuple[int, str]] = []

    for n in test_range:
        try:
            extract_test(n, results, skipped)
        except Exception as exc:  # noqa: BLE001 - report and continue
            errors.append((n, str(exc)))
            print(f"ERROR test {n}: {exc}")

    save_cache(TESTS_CACHE_FILE, results)
    write_output(results)

    task1_count = sum(1 for p in results if p["task"] == "task1")
    task2_count = sum(1 for p in results if p["task"] == "task2")
    image_bytes = sum(
        (IMAGE_DIR / Path(path).name).stat().st_size
        for p in results
        for path in p["images"]
        if (IMAGE_DIR / Path(path).name).exists()
    )
    print(
        f"Wrote {OUT_FILE} with {len(results)} prompts "
        f"({task1_count} Task 1, {task2_count} Task 2)."
    )
    print(f"Task 1 images: {sum(len(p['images']) for p in results)} files, {image_bytes / 1_000_000:.2f} MB total.")
    if skipped:
        print(f"Skipped {len(skipped)} task(s):")
        for identifier, reason in skipped:
            print(f"  - {identifier}: {reason}")
    if errors:
        print(f"{len(errors)} test page(s) raised an error and were skipped entirely:")
        for n, reason in errors:
            print(f"  - test {n}: {reason}")


def main() -> None:
    run_test_range_mode(sys.argv[1:])


if __name__ == "__main__":
    main()
