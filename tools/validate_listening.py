"""Validate generated listening records and their local assets."""

from __future__ import annotations

import json
from pathlib import Path
import re
import subprocess
import sys

from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[1]

# Validate whatever listening-full-NNN.ts files exist, not a hardcoded count,
# so a future import range extends coverage automatically.
TEST_NUMBERS = sorted(
    int(path.stem.rsplit("-", 1)[-1])
    for path in (ROOT / "src" / "data" / "tests").glob("listening-full-*.ts")
)

PAPER_BLANK_TYPES = {
    "sentence-completion",
    "table-completion",
    "diagram-labelling",
    "matching-features",
    "categorisation",
}


def load_test(number: int) -> dict:
    path = ROOT / "src" / "data" / "tests" / f"listening-full-{number:03d}.ts"
    raw = path.read_text(encoding="utf-8")
    start = raw.index("= {") + 2
    return json.loads(raw[start:raw.rindex(";")])


def main() -> None:
    failures: list[str] = []
    total_questions = 0
    forbidden = re.compile(r"<(?:script|form|input|button|iframe|audio)\b|Show Answers|bg-showmore", re.I)

    for number in TEST_NUMBERS:
        test = load_test(number)
        questions = [q for part in test["parts"] for group in part["groups"] for q in group["questions"]]
        total_questions += len(questions)
        if [q["id"] for q in questions] != [f"q{i}" for i in range(1, 41)]:
            failures.append(f"Test {number}: question ids are not sequential q1-q40")
        if len(test["parts"]) != 4:
            failures.append(f"Test {number}: expected four sections")

        scored_questions = [question for question in questions if question.get("scored", True)]
        expected_scored_total = 39 if number == 11 else 40
        if len(scored_questions) != expected_scored_total:
            failures.append(
                f"Test {number}: expected {expected_scored_total} scored questions, found {len(scored_questions)}"
            )
        unscored_ids = [question["id"] for question in questions if question.get("scored") is False]
        expected_unscored_ids = ["q14"] if number == 11 else []
        if unscored_ids != expected_unscored_ids:
            failures.append(
                f"Test {number}: expected unscored questions {expected_unscored_ids}, found {unscored_ids}"
            )

        audio = ROOT / "public" / test["audioSrc"].lstrip("/")
        if not audio.exists() or audio.stat().st_size < 1_000_000:
            failures.append(f"Test {number}: missing or undersized audio")

        for part in test["parts"]:
            html = part["stimulus"]["questionHtml"]
            paper = BeautifulSoup(html, "html.parser")
            if html.count('class="listening-source-group"') != len(part["groups"]):
                failures.append(f"Test {number} {part['label']}: semantic wrapper count differs from group count")
            if forbidden.search(html):
                failures.append(f"Test {number} {part['label']}: forbidden source markup or answer leak")
            for src in re.findall(r'<img[^>]+src="([^"]+)"', html):
                if not src.startswith("/pics/listening/imported/"):
                    failures.append(f"Test {number} {part['label']}: nonlocal image source {src[:40]}")
                if not (ROOT / "public" / src.lstrip("/")).exists():
                    failures.append(f"Test {number} {part['label']}: missing image {src}")

            for group in part["groups"]:
                first = int(group["questions"][0]["id"][1:])
                last = int(group["questions"][-1]["id"][1:])
                wrapper = paper.select_one(
                    f'.listening-source-group[data-question-start="{first}"][data-question-end="{last}"]'
                )
                if wrapper is None:
                    failures.append(f"Test {number} {group['title']}: missing source group wrapper")
                    continue

                if wrapper.get("data-question-type") != group["type"]:
                    failures.append(f"Test {number} {group['title']}: source group type does not match scoring group")

                if group["type"] in PAPER_BLANK_TYPES:
                    expected = list(range(first, last + 1))
                    numbered_blanks = wrapper.select(".listening-answer-blank[data-question]")
                    actual = [int(blank["data-question"]) for blank in numbered_blanks]
                    if actual != expected:
                        failures.append(
                            f"Test {number} {group['title']}: expected one contextual blank for {expected}, found {actual}"
                        )
                    for question_number, blank in zip(actual, numbered_blanks):
                        marker = blank.select_one(".listening-answer-number")
                        line = blank.select_one(".listening-answer-line")
                        if marker is None or marker.get_text(strip=True) != f"({question_number})":
                            failures.append(f"Test {number} q{question_number}: blank has no visible numbered marker")
                        if line is None:
                            failures.append(f"Test {number} q{question_number}: blank has no visible writing line")
                        trailing_text = str(blank.next_sibling or "")
                        if re.match(r"\s*(?:\.{2,}|\.(?:am|pm)\b)", trailing_text, re.I):
                            failures.append(
                                f"Test {number} q{question_number}: source placeholder dots remain after the writing line"
                            )

                    for continuation in wrapper.select(".listening-answer-blank-continuation"):
                        if continuation.has_attr("data-question") or continuation.select_one(".listening-answer-number"):
                            failures.append(
                                f"Test {number} {group['title']}: continuation blank duplicates a numbered answer location"
                            )
                        if not re.search(r"[A-Za-z]", continuation.parent.get_text(" ", strip=True)):
                            failures.append(
                                f"Test {number} {group['title']}: continuation blank is detached from question context"
                            )

                for table_figure in wrapper.select("figure.listening-source-table"):
                    if table_figure.select_one("table") is None:
                        failures.append(f"Test {number} {group['title']}: source table lost its table structure")
                    if table_figure.select_one("td .listening-answer-blank, th .listening-answer-blank") is None:
                        failures.append(f"Test {number} {group['title']}: table answer locations are detached from their cells")

                if group["type"] == "multiple-choice":
                    structured = wrapper.select("article.listening-source-question[data-question]")
                    actual = [int(question["data-question"]) for question in structured]
                    expected = list(range(first, last + 1))
                    if actual != expected:
                        failures.append(
                            f"Test {number} {group['title']}: expected structured MCQ prompts {expected}, found {actual}"
                        )
                    for question in structured:
                        question_number = int(question["data-question"])
                        scoring_question = next(
                            item for item in group["questions"] if int(item["id"][1:]) == question_number
                        )
                        option_rows = question.select("ol.listening-source-options > li[data-option]")
                        source_missing = question.get("data-source-missing") == "true"
                        if source_missing:
                            if scoring_question.get("scored") is not False:
                                failures.append(
                                    f"Test {number} q{question_number}: a missing source question must be explicitly unscored"
                                )
                            if option_rows:
                                failures.append(
                                    f"Test {number} q{question_number}: missing source question must not fabricate options"
                                )
                        elif question.select_one(".listening-source-prompt") is None or len(option_rows) < 2:
                            failures.append(
                                f"Test {number} {group['title']}: MCQ prompt or option rows are not visibly structured"
                            )

                if group["type"] in {"matching-features", "categorisation"}:
                    rows = wrapper.select(".listening-source-question-row[data-question-row]")
                    row_numbers = [int(row["data-question-row"]) for row in rows]
                    expected = list(range(first, last + 1))
                    if row_numbers != expected:
                        failures.append(
                            f"Test {number} {group['title']}: expected structured matching rows {expected}, found {row_numbers}"
                        )

                if group["type"] == "diagram-labelling" and wrapper.select_one("img"):
                    if wrapper.select_one(".listening-diagram-key") is None and not wrapper.select(
                        ".listening-answer-blank[data-question]"
                    ):
                        failures.append(f"Test {number} {group['title']}: diagram question numbers are not clear")

                if re.search(r"\(\s*\d{1,2}\s*\)\s*(?:\.{2,}|…{2,}|·{2,}|_{2,})", str(wrapper)):
                    failures.append(f"Test {number} {group['title']}: source dot-run was not converted to a real blank")

        for group in (g for part in test["parts"] for g in part["groups"]):
            if group["type"] == "multiple-answer":
                if not group.get("choices") or not all(set(choice) == {"value", "label"} for choice in group["choices"]):
                    failures.append(f"Test {number} {group['title']}: missing labelled choices")
                if not group.get("selectCount"):
                    failures.append(f"Test {number} {group['title']}: missing selectCount")
            pair_ids = {q.get("answerPairId") for q in group["questions"] if q.get("answerPairId")}
            if pair_ids and len(pair_ids) != 1:
                failures.append(f"Test {number} {group['title']}: inconsistent answerPairId")

    test16 = load_test(16)
    test16_questions = {q["id"]: q for part in test16["parts"] for group in part["groups"] for q in group["questions"]}
    for number in range(11, 15):
        question = test16_questions[f"q{number}"]
        if question.get("answerPairId") or question.get("multiSelect", {}).get("selectCount") != 2:
            failures.append(f"Test 16 q{number}: invalid per-question multi-select contract")

    for number in {2, 4, 8, 9, 12, 13, 15, 17}:
        if not any("<img" in part["stimulus"]["questionHtml"] for part in load_test(number)["parts"]):
            failures.append(f"Test {number}: published diagram is not visible in questionHtml")

    test12_html = "".join(part["stimulus"]["questionHtml"] for part in load_test(12)["parts"])
    for source_value in ["5pm", "10am", "$1600", "$1350", "$50", "10Km", "$60", "$3.55", "$4.40", "28B", "084"]:
        if source_value not in test12_html:
            failures.append(f"Test 12: source value {source_value!r} was lost while placing question blanks")
    test16_html = "".join(part["stimulus"]["questionHtml"] for part in test16["parts"])
    for source_value in ["28%", "29%", "37%"]:
        if source_value not in test16_html:
            failures.append(f"Test 16: source percentage {source_value!r} was lost while placing question blanks")

    if "--skip-audio-decode" not in sys.argv:
        for audio in sorted((ROOT / "public" / "audio" / "listening").glob("test-*.mp3")):
            result = subprocess.run(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(audio)],
                capture_output=True,
                text=True,
                check=False,
            )
            if result.returncode or not result.stdout.strip() or float(result.stdout.strip()) <= 0:
                failures.append(f"{audio.name}: ffprobe could not decode audio")

    if failures:
        raise SystemExit("\n".join(failures))
    audio_note = f"{len(TEST_NUMBERS)} present MP3s" if "--skip-audio-decode" in sys.argv else f"{len(TEST_NUMBERS)} decodable MP3s"
    print(f"Validated {len(TEST_NUMBERS)} tests, {total_questions} sequential questions, {audio_note}, semantic layouts, and local image references.")


if __name__ == "__main__":
    main()
