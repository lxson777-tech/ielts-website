"""Import the 20 highest-numbered complete Reading tests shared by PracticePTEOnline.

Alex confirmed publisher reuse permission on 2026-09-11. The importer caches the
source pages, localises source images, and emits PracticeTest JSON as TypeScript.
Run from the repository root: python tools/import_reading.py
"""

from __future__ import annotations

from html import escape
import itertools
import json
from pathlib import Path
import re
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup, Tag

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".tmp" / "reading-source"
DATA = ROOT / "src" / "data" / "tests"
IMAGES = ROOT / "public" / "pics" / "reading" / "imported"

# The source catalogue was checked from the highest numbered reading page
# downward; tests 314 and 315 don't exist at their expected URLs, so the
# run of 20 highest available complete tests skips straight from 316 to 313.
# Students see "Test 1" ... "Test 20" (reading-full-001.ts ... 020.ts), not
# the publisher's page numbers, so this table is the one explicit mapping
# from local test number to source test number. Keep it in sync with
# docs/READING-IMPORT-RESULT.md.
LOCAL_TO_SOURCE = {
    1: 319, 2: 318, 3: 317, 4: 316, 5: 313,
    6: 312, 7: 311, 8: 310, 9: 309, 10: 308,
    11: 307, 12: 306, 13: 305, 14: 304, 15: 303,
    16: 302, 17: 301, 18: 300, 19: 299, 20: 298,
}
# Source numbers in fetch order (highest first), kept for the parts of the
# importer (fetch/build/answer_key) that only care about the source page.
NUMBERS = list(LOCAL_TO_SOURCE.values())
ORIGIN = "https://practicepteonline.com"
PERMISSION = "Reused with publisher permission confirmed by Alex on 2026-09-11."

# --- Corrections to the publisher's answer key -------------------------------
#
# The publisher's key is the default, and `validate_reading.py` re-reads the
# source pages to prove we still match it. These two tables are the ONLY
# sanctioned way to disagree with the source: an examiner adjudicated the
# question against the passage, the correction is recorded here with its
# reason, and both the importer and the validator read the tables, so a
# re-import keeps the fix and validation still passes.
#
# Add an entry only when the passage settles the point. Everything else stays
# as the publisher wrote it.
#
# ANSWER_OVERRIDES: (local test number, question id) -> {answer, reason}.
# `answer` is stored exactly as given: a string, or a list of accepted
# spellings (the scorer accepts any member, comparing case-insensitively).
ANSWER_OVERRIDES: dict[tuple[int, str], dict] = {
    # --- Plain typos in the published key ---
    (9, "q36"): {
        "answer": "Sentences",
        "reason": "The published key reads 'Entences'. The passage word is 'sentences'; the key lost its first letter.",
    },
    (10, "q6"): {
        "answer": "True",
        "reason": "The published key reads 'Treu', which is not one of the three permitted True/False/Not Given answers.",
    },
    (15, "q37"): {
        "answer": ["New-found", "Fingerprinting"],
        "reason": "The published key reads 'fingerprint-ing/new-found'. The hyphen is a line-break artefact, and the scorer treats 'fingerprint-ing' as two words, so nobody typing 'fingerprinting' could score. The passage reads 'the new-found method of dactyloscopy (later known as fingerprinting)', so both forms are accepted with the hyphen removed.",
    },
    # --- The key's spelling or word form differs from the passage's ---
    (9, "q12"): {
        "answer": ["Standardised", "Standardized"],
        "reason": "The instruction says ONE WORD ONLY from the passage, and the passage spells it 'standardised'. The publisher's American spelling is kept as an accepted alternative.",
    },
    (19, "q30"): {
        "answer": ["Organised", "Organized"],
        "reason": "The passage reads 'organising sport for children', so a student copying from the passage writes 'organised'. The publisher's American spelling is kept as an accepted alternative.",
    },
    (4, "q4"): {
        "answer": ["Journals", "Journal"],
        "reason": "The passage reads 'The sisters' journals reveal their preference', so the word copied from the passage is the plural. The publisher's singular is kept as an accepted alternative.",
    },
    (7, "q3"): {
        "answer": ["Hairs", "Hair"],
        "reason": "The passage reads 'some hairs covering their bodies'. Both the plural from the passage and the publisher's singular fit the gap.",
    },
    (10, "q22"): {
        "answer": ["Reinsertion", "Reinserted"],
        "reason": "The gap reads 'before the (22) ...... into the patient', which needs a noun. The passage supplies one: 'reinsertion of the genetically altered cells back into the patient'. The publisher's 'reinserted' does not fit the gap grammatically but is kept as an accepted alternative so nobody who trusted the printed key is penalised.",
    },
    (10, "q37"): {
        "answer": ["Changeable", "Changing"],
        "reason": "The gap reads 'students who believe that intelligence is (37) ......', which needs an adjective. The passage only offers the phrase 'intelligence can change', so no single passage word fits. Both adjectival forms a student could reasonably produce are accepted.",
    },
    (10, "q40"): {
        "answer": ["Style", "Learning style"],
        "reason": "The instruction says ONE WORD ONLY, so the attainable answer is 'style'. The publisher's two-word 'learning style' stays accepted, but is no longer the headline answer, since it breaks the group's own word limit.",
    },
    # --- The passage contradicts or fails to support the published key ---
    (10, "q5"): {
        "answer": "False",
        "reason": "Statement: 'The US Department of Energy has developed a smart card for its employees.' The passage says the Department of Defense has provided smart cards and 'the Department of Energy is planning to do the same'. A department that is still planning to act has not yet acted, so the claim is contradicted, not merely unmentioned. Published key: Not Given.",
    },
    (16, "q29"): {
        "answer": "False",
        "reason": "Statement: practitioners 'tend to avoid combining the two schools of practice'. The passage says 'The two practices, however, were not incompatible, a degree of overlap occurring between the two', and then gives an example of one patient's work serving both purposes at once. That contradicts the statement. Published key: Not Given.",
    },
    (11, "q6"): {
        "answer": "Not given",
        "reason": "Statement: 'The leaves of the baobab tree can be used to make a medicinal sauce.' The passage lists the two uses separately: 'They are rich in iron and can be used as a medicine' and, two sentences later, 'The leaves can also be used as a sauce for food'. It never says the sauce itself is medicinal, so the combined claim is unsupported rather than confirmed. Published key: True.",
    },
    (12, "q20"): {
        "answer": "D",
        "reason": "Question: 'the possibility of students not being able to sleep well'. Paragraph D is the one that mentions sleep: 'too much screen time can lead to problems such as eye strain, headaches, and difficulty sleeping'. Paragraph C covers over-reliance, distraction and inappropriate content, and never mentions sleep. Published key: C, which repeats the (correct) answer to question 19.",
    },
}

# GROUP_OVERRIDES: (local test number, group title) -> corrections to the
# group itself. Supported keys:
#   options          replaces the shared letter list students choose from
#   wordLimit        replaces the group's stated word limit
#   textReplacements list of (old, new) applied to instructionHtml and legendHtml
#   reason           why the correction was made
GROUP_OVERRIDES: dict[tuple[int, str], dict] = {
    (9, "Questions 14-19"): {
        "options": list("ABCDEFGHI"),
        "reason": "The instruction says the passage has nine paragraphs, A-I, and it does, but the option list stopped at H.",
    },
    (9, "Questions 27-33"): {
        "options": list("ABCDEFGHIJ"),
        "textReplacements": [
            ("seven paragraphs, A-G", "ten paragraphs, A-J"),
            ("the correct letter, A-G,", "the correct letter, A-J,"),
        ],
        "reason": "The instruction claimed seven paragraphs, A-G, but the passage runs A to J and the key itself uses G and I. The instruction text and the option list are corrected to A-J.",
    },
    (9, "Questions 23-26"): {
        "wordLimit": 2,
        "textReplacements": [("ONE WORD ONLY", "NO MORE THAN TWO WORDS")],
        "reason": "The only answer the passage supports for question 24 is 'charging stations'. The passage phrase is 'charging stations for electric vehicles', and 'stations' on its own drops the meaning the gap needs, so the group's stated limit is raised to two words instead. The other three answers in the group are single words and are unaffected.",
    },
    (10, "Questions 14-18"): {
        "options": list("ABCDE"),
        "reason": "The instruction says the passage has five sections, A-E, and it does, but the option list stopped at D.",
    },
    (11, "Questions 14-18"): {
        "options": list("ABCDE"),
        "reason": "The instruction says the passage has five paragraphs, A-E, and it does, but the option list stopped at D.",
    },
    (11, "Questions 27-32"): {
        "options": list("ABCDEFGHIJ"),
        "reason": "The instruction says the passage has ten paragraphs, A-J, and it does, but the option list stopped at I.",
    },
    (11, "Questions 33-35"): {
        "options": list("ABCDEFGHIJK"),
        "reason": "The word list printed with the summary runs A to K (K is 'temperature'), but the option list stopped at J.",
    },
    (12, "Questions 14-20"): {
        "options": list("ABCDEFG"),
        "reason": "The instruction says the passage has seven paragraphs, A-G, and it does, but the option list stopped at F.",
    },
    (18, "Questions 28-33"): {
        "options": list("ABC"),
        "reason": "The task matches people A-C and only three people are listed, but the option list offered a fourth letter, D, that answers no question.",
    },
}


def override_answer(local_number: int, question_id: str, source_answer: str):
    """The answer we store for this question: the adjudicated correction when
    one is recorded, otherwise the publisher's key. Shared by the importer and
    the validator so the two can never drift apart."""
    fix = ANSWER_OVERRIDES.get((local_number, question_id))
    return fix["answer"] if fix else normalise_answer(source_answer)


def apply_overrides(test: dict, local_number: int) -> None:
    """Apply the adjudicated corrections to a freshly built test, in place."""
    for part in test["parts"]:
        for group in part["groups"]:
            fix = GROUP_OVERRIDES.get((local_number, group["title"]))
            if fix:
                if "options" in fix:
                    group["options"] = list(fix["options"])
                if "wordLimit" in fix:
                    group["wordLimit"] = fix["wordLimit"]
                for old, new in fix.get("textReplacements", []):
                    for field in ("instructionHtml", "legendHtml"):
                        if field in group:
                            group[field] = group[field].replace(old, new)
            for question in group["questions"]:
                answer_fix = ANSWER_OVERRIDES.get((local_number, question["id"]))
                if answer_fix:
                    question["answer"] = answer_fix["answer"]


def clean(text: str) -> str:
    return " ".join(text.replace("\xa0", " ").replace("�", "’").split())


def fetch(number: int) -> tuple[str, Tag]:
    CACHE.mkdir(parents=True, exist_ok=True)
    url = f"{ORIGIN}/ielts-reading-test-{number}/"
    path = CACHE / f"{number}.html"
    if not path.exists():
        response = requests.get(url, timeout=60)
        response.raise_for_status()
        response.encoding = "utf-8"
        if not re.search(fr"<title>\s*IELTS Reading Test {number}\b", response.text, re.I):
            raise RuntimeError(f"{url} is not Reading Test {number}")
        path.write_text(response.text, encoding="utf-8")
    soup = BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")
    body = soup.select_one(".entry-content")
    if body is None:
        raise RuntimeError(f"No entry-content at {url}")
    return url, body


def answer_key(body: Tag, number: int) -> list[str]:
    button = next((n for n in body.find_all(recursive=False) if clean(n.get_text(" ", strip=True)).lower() == "show answers"), None)
    box = button.find_next_sibling() if button else body.select_one('[id^="bg-showmore-hidden"]')
    answers = [clean(li.get_text(" ", strip=True)) for li in box.select("li")] if box else []
    if len(answers) != 40 and box:
        children = [clean(n.get_text(" ", strip=True)) for n in box.find_all(recursive=False) if clean(n.get_text(" ", strip=True))]
        answers = children if len(children) == 40 else []
    if len(answers) != 40 and box:
        text = clean(box.get_text(" ", strip=True))
        matches = list(re.finditer(r"(?:^|\s)(\d{1,2})\.\s*", text))
        if [int(match.group(1)) for match in matches] == list(range(1, 41)):
            answers = [
                clean(text[match.end():(matches[index + 1].start() if index + 1 < len(matches) else len(text))]).strip(" .")
                for index, match in enumerate(matches)
            ]
    if len(answers) != 40:
        raise RuntimeError(f"Test {number}: expected 40 source answers, found {len(answers)}")
    return [re.sub(fr"^\s*{index}\.\s*", "", answer).strip() for index, answer in enumerate(answers, 1)]


def normalise_answer(value: str) -> str | list[str]:
    """Turn publisher shorthand into answers the scorer can actually accept."""
    value = clean(value).strip(" .")
    variants = [value]
    optional = re.fullmatch(r"\(([^()]+)\)\s*(.+)", value)
    if optional:
        choices = [choice.strip() for choice in optional.group(1).split("/")]
        variants = [f"{choice} {optional.group(2)}" for choice in choices] + [optional.group(2)]
    else:
        infix = re.fullmatch(r"(.*?)\(([A-Za-z]+)\)(.*)", value)
        if infix:
            before, optional_text, after = infix.groups()
            variants = [(before + after).strip(), (before + optional_text + after).strip()]
        elif "/" in value:
            pieces = [piece.strip() for piece in value.split("/")]
            if len(pieces) == 2 and " " not in pieces[0] and " " in pieces[1]:
                suffix = pieces[1].split(" ", 1)[1]
                variants = [f"{pieces[0]} {suffix}", pieces[1]]
            else:
                variants = pieces
    expanded = []
    for variant in variants:
        if "/" not in variant:
            expanded.append(variant)
            continue
        left, right = [piece.strip() for piece in variant.split("/", 1)]
        if " " in left and " " not in right:
            prefix = left.rsplit(" ", 1)[0]
            expanded.extend([left, f"{prefix} {right}"])
        elif " " not in left and " " in right:
            suffix = right.split(" ", 1)[1]
            expanded.extend([f"{left} {suffix}", right])
        else:
            expanded.extend([left, right])
    variants = list(dict.fromkeys(clean(item).strip(" .") for item in expanded if clean(item).strip(" .")))
    return variants[0] if len(variants) == 1 else variants


def direct_nodes(body: Tag) -> list[Tag]:
    out = []
    for node in body.find_all(recursive=False):
        if clean(node.get_text(" ", strip=True)).lower() == "show answers" or str(node.get("id", "")).startswith("bg-showmore"):
            break
        if node.name not in {"input", "button"}:
            out.append(node)
    return out


def is_title(nodes: list[Tag], index: int) -> bool:
    text = clean(nodes[index].get_text(" ", strip=True))
    if not text or len(text) > 150 or re.match(r"^(?:Questions?|List of|TRUE|YES|A\.)\b", text, re.I):
        return False
    previous_blank = index == 0 or not clean(nodes[index - 1].get_text(" ", strip=True))
    following = [clean(n.get_text(" ", strip=True)) for n in nodes[index + 1:] if clean(n.get_text(" ", strip=True))][:3]
    uppercase_title = text == text.upper() and bool(re.search(r"[A-Z]", text))
    return (previous_blank or uppercase_title) and any(len(value) > 180 for value in following)


def group_range(text: str) -> tuple[int, int] | None:
    match = re.match(r"^Questions?\s*(\d+)(?:\s*(?:[-–—�]|and)\s*(\d+))?\b", text, re.I)
    return (int(match.group(1)), int(match.group(2) or match.group(1))) if match else None


def classify(instruction: str) -> str:
    value = instruction.lower()
    if "true" in value and "false" in value:
        return "tfng"
    if "yes" in value and "no" in value and "not given" in value:
        return "yes-no-notgiven"
    if "heading" in value:
        return "matching-headings"
    if "which paragraph" in value or "which section" in value or "contains the following information" in value:
        return "paragraph-matching"
    if "classify" in value or "classification" in value:
        return "categorisation"
    if re.search(r"(?:choose|which)\s+(?:two|three)(?:\s+of|\s+letters?|\s+answers?|\s+statements?|\s+facts?)", value):
        return "multiple-answer"
    if "choose the correct" in value or "circle the correct" in value:
        return "multiple-choice"
    if "match" in value or "list of words" in value or "list below" in value or "re-order" in value:
        return "matching-features"
    if "table" in value:
        return "table-completion"
    return "sentence-completion"


def word_limit(instruction: str) -> int | None:
    match = re.search(r"(?:NO MORE THAN\s+)?(ONE|TWO|THREE|1|2|3)\s+WORDS?", instruction, re.I)
    return {"one": 1, "two": 2, "three": 3, "1": 1, "2": 2, "3": 3}.get(match.group(1).lower()) if match else None


def numbered_chunks(text: str, first: int, last: int) -> dict[int, str]:
    positions = []
    for number in range(first, last + 1):
        patterns = [fr"(?<!\d){number}\s*[.)]\s*", fr"\(\s*{number}\s*\)\s*"]
        candidates = [m for p in patterns for m in re.finditer(p, text)]
        after = positions[-1][2] if positions else 0
        match = next((m for m in sorted(candidates, key=lambda m: m.start()) if m.start() >= after), None)
        if match:
            positions.append((number, match.start(), match.end()))
    result = {}
    for index, (number, _start, end) in enumerate(positions):
        stop = positions[index + 1][1] if index + 1 < len(positions) else len(text)
        result[number] = clean(text[end:stop]).strip(" .")
    return result


def letter_options(text: str) -> tuple[str, list[str]] | None:
    markers = list(re.finditer(r"(?<!\S)([A-J])(?:[.)])?\s+", text))
    for start in reversed(range(len(markers))):
        sequence = []
        expected = ord("A")
        for marker in markers[start:]:
            if ord(marker.group(1)) == expected:
                sequence.append(marker)
                expected += 1
        if len(sequence) >= 2:
            labels = []
            for i, marker in enumerate(sequence):
                end = sequence[i + 1].start() if i + 1 < len(sequence) else len(text)
                labels.append(clean(text[marker.end():end]).strip(" ."))
            return clean(text[:sequence[0].start()]), labels
    return None


def shared_options(text: str, answers: list[str]) -> list[str]:
    roman = re.findall(r"(?:^|\s)(i{1,3}|iv|v|vi{0,3}|ix|x)(?:[.)]|\s)", text, re.I)
    if len(set(v.lower() for v in roman)) >= 3:
        order = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"]
        present = {v.lower() for v in roman}
        return [v for v in order if v in present]
    letters = re.findall(r"(?<!\S)([A-J])(?:[.)]|\s)", text)
    max_letter = max([ord(v) for v in letters] + [ord(a) for a in answers if re.fullmatch(r"[A-J]", a)], default=ord("A"))
    return [chr(v) for v in range(ord("A"), max_letter + 1)]


def localise_images(number: int, nodes: list[Tag], page_url: str) -> None:
    IMAGES.mkdir(parents=True, exist_ok=True)
    for index, image in enumerate(itertools.chain.from_iterable(n.select("img") for n in nodes), 1):
        if image.find_parent("noscript") is not None:
            continue
        src = image.get("data-src") or image.get("data-lazy-src") or image.get("src")
        if not src:
            continue
        if src.startswith("data:"):
            continue
        url = urljoin(page_url, src)
        suffix = Path(url.split("?", 1)[0]).suffix.lower()
        suffix = suffix if suffix in {".png", ".jpg", ".jpeg", ".webp", ".gif"} else ".jpg"
        path = IMAGES / f"test-{number}-{index}{suffix}"
        if not path.exists():
            response = requests.get(url, timeout=60)
            response.raise_for_status()
            path.write_bytes(response.content)
        image["src"] = f"/ielts-website/pics/reading/imported/{path.name}"
        for attr in ["srcset", "data-src", "data-lazy-src", "data-srcset"]:
            image.attrs.pop(attr, None)


def sanitise(node: Tag) -> None:
    for unsafe in node.select("script, iframe, form, input, button, noscript, ins.adsbygoogle"):
        unsafe.decompose()
    for tag in [node, *node.find_all(True)]:
        for attr in list(tag.attrs):
            if attr.lower().startswith("on") or attr.lower().startswith("data-ad-") or attr.lower() in {"style", "srcset", "data-src", "data-lazy-src", "data-srcset"}:
                tag.attrs.pop(attr, None)
        if tag.name == "a":
            tag.attrs.pop("href", None)


def make_group(number: int, first: int, last: int, nodes: list[Tag], answers: list[str]) -> dict:
    heading = clean(nodes[0].get_text(" ", strip=True))
    all_text = clean(" ".join(n.get_text(" ", strip=True) for n in nodes))
    instruction = re.sub(r"^Questions?\s*\d+(?:\s*[-–—�]\s*\d+)?\s*", "", heading, flags=re.I)
    kind = classify(" ".join([instruction, all_text[:700]]))
    chunks = numbered_chunks(all_text, first, last)
    group_answers = answers[first - 1:last]
    questions = []
    for qn in range(first, last + 1):
        raw = chunks.get(qn, "")
        answer = group_answers[qn - first]
        question = {"id": f"q{qn}", "answer": normalise_answer(answer)}
        if kind == "multiple-choice":
            parsed = letter_options(raw)
            if parsed:
                question["textHtml"], question["options"] = parsed
            else:
                question["textHtml"] = raw
                question["options"] = ["A", "B", "C", "D"]
        elif kind in {"sentence-completion", "table-completion"}:
            placeholder = re.search(r"(?:�{2,}|\.{3,}|_{2,})", raw)
            if placeholder:
                question["before"] = clean(raw[:placeholder.start()])
                question["after"] = clean(raw[placeholder.end():])
            else:
                question["before"] = raw
                question["after"] = ""
        else:
            question["textHtml"] = raw
        questions.append(question)
    group = {
        "title": f"Questions {first}-{last}" if first != last else f"Question {first}",
        "type": kind,
        "instructionHtml": escape(instruction or heading),
        "questions": questions,
    }
    source_layout = "".join(str(n) for n in nodes)
    if source_layout:
        group["legendHtml"] = source_layout
    limit = word_limit(all_text)
    if limit and kind in {"sentence-completion", "table-completion", "diagram-labelling"}:
        group["wordLimit"] = limit
    if kind in {"matching-headings", "matching-features", "paragraph-matching", "categorisation"}:
        group["options"] = shared_options(all_text, group_answers)
    if kind == "multiple-answer":
        count = 3 if re.search(r"(?:choose|which)\s+three", all_text, re.I) else 2
        parsed = letter_options(all_text)
        labels = parsed[1] if parsed else [chr(65 + i) for i in range(7)]
        pool = []
        for item in group_answers:
            pool.extend(v.strip() for v in re.split(r"\s*,\s*", item))
        pool = list(dict.fromkeys(pool))
        for question in questions:
            question["answer"] = pool
            question["answerPairId"] = f"reading-{number}-q{first}-q{last}"
        group["selectCount"] = count
        group["choices"] = [{"value": chr(65 + i), "label": label} for i, label in enumerate(labels)]
    if kind == "table-completion":
        group["table"] = {"rows": [[q.get("before", ""), {"questionId": q["id"]}, q.get("after", "")] for q in questions]}
    if number == 302 and first == 1 and last == 10:
        pools = [([1, 3], ["A", "D"]), ([2, 4], ["B", "C"]), ([5, 7, 9], ["F", "G", "J"]), ([6, 8, 10], ["E", "H", "I"])]
        by_number = {int(question["id"][1:]): question for question in questions}
        for slots, pool in pools:
            pair_id = f"reading-302-{'-'.join(map(str, slots))}"
            for slot in slots:
                by_number[slot]["answer"] = pool
                by_number[slot]["answerPairId"] = pair_id
    return group


def build(number: int, local_number: int | None = None) -> dict:
    """Build the PracticeTest record for source page `number`. `local_number`
    is the student-facing test number (reading-full-{local_number:03d}, "Academic
    Reading Test {local_number}"); it defaults to the source number so callers
    that only care about the parsed content (e.g. validate_reading.py's
    rebuild-and-compare check) can omit it."""
    if local_number is None:
        local_number = number
    url, body = fetch(number)
    answers = answer_key(body, number)
    nodes = direct_nodes(body)
    localise_images(number, nodes, url)
    for node in nodes:
        sanitise(node)
    heading_indices = [(i, group_range(clean(node.get_text(" ", strip=True)))) for i, node in enumerate(nodes)]
    heading_indices = [(i, r) for i, r in heading_indices if r]
    title_candidates = [i for i in range(len(nodes)) if is_title(nodes, i)]
    candidates_by_heading = {}
    for candidate in title_candidates:
        next_heading = next((index for index, _group in heading_indices if index > candidate), len(nodes))
        candidates_by_heading.setdefault(next_heading, []).append(candidate)
    title_indices = []
    for next_heading, candidates in candidates_by_heading.items():
        candidate = candidates[-1]
        long_paragraphs = sum(len(clean(node.get_text(" ", strip=True))) > 180 for node in nodes[candidate + 1:next_heading])
        if long_paragraphs >= 3:
            title_indices.append(candidate)
    combined_first_title = False
    if len(title_indices) == 2 and nodes and nodes[0].select_one("strong") and nodes[0].select_one("br"):
        title_indices.insert(0, 0)
        combined_first_title = True
    if len(title_indices) != 3:
        raise RuntimeError(f"Test {number}: expected three passage titles, found {[(i, clean(nodes[i].get_text(' ', strip=True))) for i in title_indices]}")
    parts = []
    for pi, title_index in enumerate(title_indices):
        part_end = title_indices[pi + 1] if pi + 1 < 3 else len(nodes)
        headings = [(i, r) for i, r in heading_indices if title_index < i < part_end]
        if not headings:
            raise RuntimeError(f"Test {number} passage {pi + 1}: no question groups")
        passage_nodes = nodes[title_index + 1:headings[0][0]]
        combined_intro = ""
        if pi == 0 and combined_first_title:
            raw = nodes[0].decode_contents()
            combined_intro = re.split(r"<br\s*/?>", raw, maxsplit=1, flags=re.I)[-1].strip()
        label_candidates = []
        for candidate in passage_nodes:
            match = re.match(r"^\s*(?:<strong>\s*)?([A-Z])(?:\s*</strong>)?\s*[.)]?\s*(?=.{80})", candidate.decode_contents().strip(), re.I)
            if match:
                label_candidates.append(match.group(1).upper())
        labelled_passage = len(label_candidates) >= 3 and label_candidates[:3] == ["A", "B", "C"]
        paragraphs = []
        if combined_intro:
            paragraphs.append({"html": combined_intro})
        for node in passage_nodes:
            if not clean(node.get_text(" ", strip=True)):
                continue
            label = None
            html = node.decode_contents().strip()
            match = re.match(r"^\s*<strong>\s*([A-Z])\s*</strong>\s*", html, re.I) if labelled_passage else None
            if not match and labelled_passage:
                match = re.match(r"^\s*([A-Z])(?:\s*[.)])?\s+(?=.{80})", clean(node.get_text(" ", strip=True)))
            if match:
                label = match.group(1).upper()
                html = re.sub(r"^\s*(?:<strong>\s*)?[A-Z](?:\s*</strong>)?\s*[.)]?\s*", "", html, count=1, flags=re.I)
            paragraphs.append({**({"label": label} if label else {}), "html": html})
        groups = []
        for gi, (heading_index, (first, last)) in enumerate(headings):
            stop = headings[gi + 1][0] if gi + 1 < len(headings) else part_end
            groups.append(make_group(number, first, last, nodes[heading_index:stop], answers))
        parts.append({
            "label": f"Passage {pi + 1}",
            "stimulus": {
                "kind": "passage", "label": f"Reading Passage {pi + 1}",
                "title": clean(nodes[title_index].select_one("strong").get_text(" ", strip=True)) if pi == 0 and combined_first_title else clean(nodes[title_index].get_text(" ", strip=True)),
                "instructionHtml": f"You should spend about 20 minutes on this passage and its questions.",
                "paragraphs": paragraphs,
            },
            "groups": groups,
        })
    test = {
        "id": f"reading-full-{local_number:03d}", "skill": "reading",
        "title": f"Academic Reading Test {local_number}",
        "description": "A complete three-passage Academic Reading practice test with 40 questions.",
        "durationMinutes": 60,
        "source": {"name": "IELTS MASTER / PracticePTEOnline", "url": url, "permission": PERMISSION},
        "parts": parts,
    }
    apply_overrides(test, local_number)
    question_ids = [q["id"] for p in parts for g in p["groups"] for q in g["questions"]]
    if question_ids != [f"q{i}" for i in range(1, 41)]:
        raise RuntimeError(f"Test {number}: question ranges produce {question_ids}")
    return test


def carry_over_teaching_notes(test: dict, path: Path) -> None:
    """Copy the teacher-written `explanation` / `evidence` notes out of the
    existing file and back into the freshly built test. The importer parses
    only what the publisher's page contains, so without this a re-import would
    silently wipe every review note that was written by hand afterwards."""
    if not path.exists():
        return
    raw = path.read_text(encoding="utf-8")
    try:
        previous = json.JSONDecoder().raw_decode(raw[raw.index("= {") + 2:])[0]
    except (ValueError, json.JSONDecodeError):
        return
    notes = {
        question["id"]: {key: question[key] for key in ("explanation", "evidence") if key in question}
        for part in previous.get("parts", [])
        for group in part.get("groups", [])
        for question in group.get("questions", [])
    }
    group_notes = {
        group.get("title"): group["explanationHtml"]
        for part in previous.get("parts", [])
        for group in part.get("groups", [])
        if "explanationHtml" in group
    }
    for part in test["parts"]:
        for group in part["groups"]:
            if group["title"] in group_notes:
                group.setdefault("explanationHtml", group_notes[group["title"]])
            for question in group["questions"]:
                question.update(notes.get(question["id"], {}))


def main() -> None:
    manifest = {"selected": NUMBERS, "absentVerified": [315, 314], "tests": []}
    for local_number, number in LOCAL_TO_SOURCE.items():
        test = build(number, local_number)
        path = DATA / f"reading-full-{local_number:03d}.ts"
        carry_over_teaching_notes(test, path)
        path.write_text(
            "import type { PracticeTest } from '../../lib/tests/schema';\n\n"
            f"const test: PracticeTest = {json.dumps(test, ensure_ascii=False, indent=2)};\n\nexport default test;\n",
            encoding="utf-8",
        )
        manifest["tests"].append({"localId": test["id"], "file": path.name, "sourceNumber": number, "url": test["source"]["url"]})
        print(f"{path.name}: source {number}, 40 questions")
    (CACHE / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
