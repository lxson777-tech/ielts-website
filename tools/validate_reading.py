"""Validate the deterministic PracticePTEOnline Reading import."""

from __future__ import annotations

import json
from pathlib import Path
import re
import sys

sys.path.insert(0, str(Path(__file__).parent))
import import_reading

ROOT = Path(__file__).resolve().parents[1]


def load(path: Path) -> dict:
    raw = path.read_text(encoding="utf-8")
    return json.JSONDecoder().raw_decode(raw[raw.index("= {") + 2:])[0]


def main() -> None:
    failures = []
    total = 0
    overridden = 0
    seen_group_overrides = set()
    for local_number, source_number in import_reading.LOCAL_TO_SOURCE.items():
        path = ROOT / "src" / "data" / "tests" / f"reading-full-{local_number:03d}.ts"
        test = load(path)
        url, body = import_reading.fetch(source_number)
        source_answers = import_reading.answer_key(body, source_number)
        questions = [q for part in test["parts"] for group in part["groups"] for q in group["questions"]]
        groups = [group for part in test["parts"] for group in part["groups"]]
        total += len(questions)
        if test["source"]["url"] != url:
            failures.append(f"{path.name}: source URL mismatch")
        if len(test["parts"]) != 3 or [q["id"] for q in questions] != [f"q{i}" for i in range(1, 41)]:
            failures.append(f"{path.name}: expected three passages and sequential q1-q40")
        # The publisher's key is the expectation, except where an examiner
        # recorded a correction in import_reading.ANSWER_OVERRIDES. Both tools
        # go through override_answer(), so the stored answers, a re-import and
        # this check can never disagree about what the answer should be.
        pair_expected = {}
        for index, question in enumerate(questions):
            if question.get("answerPairId"):
                normalized = import_reading.override_answer(local_number, question["id"], source_answers[index])
                normalized_values = normalized if isinstance(normalized, list) else [normalized]
                values = [piece.strip() for value in normalized_values for piece in re.split(r"\s*,\s*", value)]
                pair_expected.setdefault(question["answerPairId"], set()).update(values)
        for index, question in enumerate(questions):
            expected = source_answers[index]
            actual = question["answer"]
            values = actual if isinstance(actual, list) else [actual]
            if (local_number, question["id"]) in import_reading.ANSWER_OVERRIDES:
                overridden += 1
            if question.get("answerPairId"):
                if set(values) != pair_expected[question["answerPairId"]]:
                    failures.append(f"{path.name} q{index + 1}: unordered answer differs from source key")
            elif actual != import_reading.override_answer(local_number, question["id"], expected):
                failures.append(f"{path.name} q{index + 1}: answer differs from source key")
        for group in groups:
            fix = import_reading.GROUP_OVERRIDES.get((local_number, group["title"]))
            if fix:
                seen_group_overrides.add((local_number, group["title"]))
                if "options" in fix and group.get("options") != list(fix["options"]):
                    failures.append(f"{path.name} {group['title']}: option list does not match the recorded correction")
                if "wordLimit" in fix and group.get("wordLimit") != fix["wordLimit"]:
                    failures.append(f"{path.name} {group['title']}: word limit does not match the recorded correction")
                for old, new in fix.get("textReplacements", []):
                    for field in ("instructionHtml", "legendHtml"):
                        if old in group.get(field, ""):
                            failures.append(f"{path.name} {group['title']}: {field} still says '{old}' instead of '{new}'")
            html = group.get("legendHtml", "")
            if not html:
                failures.append(f"{path.name} {group['title']}: source task layout missing")
            if re.search(r"<(?:script|iframe|form|input|button)\b|\son\w+=|https?://", html, re.I):
                failures.append(f"{path.name} {group['title']}: unsafe or remote source markup remains")
            for question in group["questions"]:
                if not (question.get("textHtml") or question.get("before")):
                    qn = int(question["id"][1:])
                    source_text = import_reading.clean(BeautifulSoup(html, 'html.parser').get_text(' ', strip=True))
                    shared_range = group["type"] == "multiple-answer" and re.search(fr"\b{int(group['questions'][0]['id'][1:])}\s*[-–—�and]+\s*{int(group['questions'][-1]['id'][1:])}\b", source_text)
                    if not shared_range and "<img" not in html.lower() and not re.search(fr"(?:\b{qn}\s*[.)]|\(\s*{qn}\s*\))", source_text):
                        failures.append(f"{path.name} q{qn}: no question prompt or numbered source context")
            if group["type"] == "multiple-answer":
                choices = group.get("choices", [])
                if len(choices) < group.get("selectCount", 0) or any(choice["label"] == choice["value"] for choice in choices):
                    failures.append(f"{path.name} {group['title']}: source choice labels missing")
            if group["type"] == "table-completion" and "<table" in html.lower() and not group.get("table"):
                failures.append(f"{path.name} {group['title']}: source table is not structurally represented")
        for part in test["parts"]:
            if not part["stimulus"]["title"] or not part["stimulus"]["paragraphs"]:
                failures.append(f"{path.name} {part['label']}: passage title or body missing")
            passage_html = "".join(p["html"] for p in part["stimulus"]["paragraphs"])
            if re.search(r"<(?:script|iframe|form|input|button)\b|\son\w+=", passage_html, re.I):
                failures.append(f"{path.name} {part['label']}: unsafe passage markup remains")
            for src in re.findall(r'<img[^>]+src="([^"]+)"', passage_html):
                relative = src.removeprefix("/ielts-website/")
                if not src.startswith("/ielts-website/pics/reading/imported/") or not (ROOT / "public" / relative).exists():
                    failures.append(f"{path.name} {part['label']}: missing local image {src}")
        rebuilt = import_reading.build(source_number, local_number)
        rebuilt_passages = [part["stimulus"] for part in rebuilt["parts"]]
        emitted_passages = [part["stimulus"] for part in test["parts"]]
        if emitted_passages != rebuilt_passages:
            failures.append(f"{path.name}: emitted passage content differs from the cached source parse")
    # A correction that no longer matches any question or group is a stale
    # entry: it would quietly stop protecting anything, so fail loudly instead.
    if overridden != len(import_reading.ANSWER_OVERRIDES):
        failures.append(f"{len(import_reading.ANSWER_OVERRIDES) - overridden} answer correction(s) match no question")
    for key in import_reading.GROUP_OVERRIDES:
        if key not in seen_group_overrides:
            failures.append(f"group correction {key} matches no question group")
    if failures:
        raise SystemExit("\n".join(failures))
    print(
        f"Validated 20 imported Reading tests, {total} source-keyed questions, passages, layouts, and local assets. "
        f"{overridden} answer(s) and {len(seen_group_overrides)} question group(s) carry a recorded correction to the publisher's key."
    )


if __name__ == "__main__":
    from bs4 import BeautifulSoup
    main()
