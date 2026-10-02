"""Check that the importers' recorded answer-key corrections match the site.

The two importers (tools/import_listening.py, tools/import_reading.py) rebuild
the test files from the publisher's pages. Every correction made to the
publisher's key since then has to be recorded in the importer's
ANSWER_OVERRIDES table, or a re-import would quietly bring the publisher's
mistake back. This script makes that promise checkable. It never fetches
anything and never writes to the data files.

    python tools/check_answer_overrides.py
        Every entry in both ANSWER_OVERRIDES tables must name a real question
        and store exactly the answer the current data file stores. Exit 1 on
        any mismatch. Needs no network and no cached pages.

    python tools/check_answer_overrides.py --source-cache <dir>
        Also rebuilds every answer from the cached publisher pages in
        <dir>/listening-source/<n>.html and <dir>/reading-source/<n>.html
        (the importers' own cache), applies the overrides, and lists every
        question whose current answer differs from that result, so nothing
        the data carries is left unrecorded. Exit 1 if any are found.
        Add --emit to print ready-to-paste override entries for them.

Run from the repository root. tests/answer-overrides.test.ts runs the first
form as part of `npm test`.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
ROOT = TOOLS.parent
DATA = ROOT / "src" / "data" / "tests"
sys.path.insert(0, str(TOOLS))


def load_test(path: Path) -> dict:
    raw = path.read_text(encoding="utf-8")
    return json.JSONDecoder().raw_decode(raw[raw.index("= {") + 2:])[0]


def questions_of(test: dict) -> dict[str, tuple[dict, dict]]:
    return {
        question["id"]: (group, question)
        for part in test["parts"]
        for group in part["groups"]
        for question in group["questions"]
    }


def as_list(answer) -> list[str]:
    return list(answer) if isinstance(answer, list) else [answer]


def same_answer(stored, recorded) -> bool:
    """The data stores a one-form key as a string and several as a list; an
    override may be written either way. Order matters: the first form is the
    one review shows as "the answer"."""
    return as_list(stored) == as_list(recorded)


def check_tables() -> list[str]:
    import import_listening
    import import_reading

    problems: list[str] = []
    tables = [
        ("listening", "listening-full-{:03d}.ts", import_listening.ANSWER_OVERRIDES),
        ("reading", "reading-full-{:03d}.ts", import_reading.ANSWER_OVERRIDES),
    ]
    for skill, pattern, table in tables:
        for (number, question_id), fix in table.items():
            label = f"{skill} test {number} {question_id}"
            if not fix.get("reason"):
                problems.append(f"{label}: no reason recorded")
            path = DATA / pattern.format(number)
            if not path.exists():
                problems.append(f"{label}: {path.name} does not exist")
                continue
            found = questions_of(load_test(path)).get(question_id)
            if not found:
                problems.append(f"{label}: no such question in {path.name}")
                continue
            group, question = found
            if "answer" in fix and not same_answer(question.get("answer"), fix["answer"]):
                problems.append(
                    f"{label}: override stores {json.dumps(fix['answer'], ensure_ascii=False)} "
                    f"but {path.name} has {json.dumps(question.get('answer'), ensure_ascii=False)}"
                )
            if "answerPairId" in fix and question.get("answerPairId") != fix["answerPairId"]:
                problems.append(f"{label}: override pairs it as {fix['answerPairId']!r} but the data has {question.get('answerPairId')!r}")
            if "multiSelect" in fix and question.get("multiSelect") != fix["multiSelect"]:
                problems.append(f"{label}: override multiSelect differs from the data")

    # The Reading importer's group corrections (option lists, word limits).
    for (number, title), fix in import_reading.GROUP_OVERRIDES.items():
        label = f"reading test {number} {title}"
        path = DATA / f"reading-full-{number:03d}.ts"
        groups = [g for part in load_test(path)["parts"] for g in part["groups"] if g["title"] == title]
        if not groups:
            problems.append(f"{label}: no such group in {path.name}")
            continue
        if "options" in fix and groups[0].get("options") != list(fix["options"]):
            problems.append(f"{label}: override options differ from the data")
        if "wordLimit" in fix and groups[0].get("wordLimit") != fix["wordLimit"]:
            problems.append(f"{label}: override wordLimit differs from the data")
    return problems


# ── Rebuilding the key from the cached publisher pages ──────────────────────


def _no_network(*_args, **_kwargs):
    raise RuntimeError("check_answer_overrides.py never fetches; a page is missing from the cache")


def listening_expected(cache: Path) -> dict[tuple[int, str], dict]:
    """What tools/import_listening.py would store for every question, from
    the cached pages, with its overrides applied."""
    import import_listening as L

    L.CACHE = cache / "listening-source"
    L.requests.get = _no_network
    out: dict[tuple[int, str], dict] = {}
    for n in sorted(L.GROUPS):
        _url, _soup, body, _audio = L.fetch(n)
        L.parse_answers(n, body)
        for section in L.GROUPS[n]:
            for first, last, _kind, _instruction in section:
                unordered = (n, first, last) in L.UNORDERED_RANGES
                pooled = list(dict.fromkeys(
                    answer for value in L.ANSWERS[n][first - 1:last] for answer in L.normalise_answer(value)
                )) if unordered else []
                for number in range(first, last + 1):
                    accepted = pooled if unordered else L.normalise_answer(L.ANSWERS[n][number - 1])
                    fix = L.ANSWER_OVERRIDES.get((n, f"q{number}"), {})
                    if "answer" in fix:
                        accepted = as_list(fix["answer"])
                    record: dict = {"answer": accepted if len(accepted) > 1 else accepted[0]}
                    pair = fix.get("answerPairId", f"test{n}-q{first}-q{last}" if unordered else None)
                    if pair:
                        record["answerPairId"] = pair
                    if (n, number) in L.PER_QUESTION_MULTI:
                        correct, _labels = L.PER_QUESTION_MULTI[(n, number)]
                        record["answer"] = ", ".join(correct)
                        record["multiSelect"] = {"correctValues": correct, "selectCount": len(correct)}
                    if "multiSelect" in fix:
                        record["multiSelect"] = fix["multiSelect"]
                        record["answer"] = fix.get("answer", record["answer"])
                    out[(n, f"q{number}")] = record
    return out


def reading_expected(cache: Path) -> dict[tuple[int, str], dict]:
    """What tools/import_reading.py would store for every question's answer,
    from the cached pages, with its overrides applied."""
    import import_reading as R
    from validate_reading import discover_imports

    R.CACHE = cache / "reading-source"
    R.requests.get = _no_network
    out: dict[tuple[int, str], dict] = {}
    for _path, local_number, source_number in discover_imports():
        # The importer's own build, which applies its overrides. It reads
        # only the cached page (and images already on disk).
        rebuilt = R.build(source_number, local_number)
        for question_id, (_group, question) in questions_of(rebuilt).items():
            record: dict = {"answer": question["answer"]}
            if question.get("answerPairId"):
                record["answerPairId"] = question["answerPairId"]
            if question.get("multiSelect"):
                record["multiSelect"] = question["multiSelect"]
            out[(local_number, question_id)] = record
    return out


def unrecorded(expected: dict[tuple[int, str], dict], pattern: str) -> list[tuple[int, str, dict, dict]]:
    found = []
    tests: dict[int, dict] = {}
    for (number, question_id), record in sorted(expected.items(), key=lambda kv: (kv[0][0], int(kv[0][1][1:]))):
        if number not in tests:
            tests[number] = questions_of(load_test(DATA / pattern.format(number)))
        group, question = tests[number][question_id]
        current = {"answer": question.get("answer")}
        if question.get("answerPairId"):
            current["answerPairId"] = question["answerPairId"]
        if question.get("multiSelect"):
            current["multiSelect"] = question["multiSelect"]
        mismatch = not same_answer(current["answer"], record["answer"])
        mismatch = mismatch or current.get("answerPairId") != record.get("answerPairId")
        mismatch = mismatch or current.get("multiSelect") != record.get("multiSelect")
        if mismatch:
            found.append((number, question_id, record, current))
    return found


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--source-cache", type=Path, default=None)
    parser.add_argument("--emit", action="store_true")
    args = parser.parse_args()

    problems = check_tables()
    import import_listening
    import import_reading
    print(
        f"{len(import_listening.ANSWER_OVERRIDES)} Listening and {len(import_reading.ANSWER_OVERRIDES)} Reading "
        f"answer overrides and {len(import_reading.GROUP_OVERRIDES)} Reading group overrides checked against the "
        f"data files: {len(problems)} problem(s)."
    )
    for problem in problems:
        print("  " + problem)

    missing: list = []
    if args.source_cache:
        for skill, expected, pattern in (
            ("listening", listening_expected(args.source_cache), "listening-full-{:03d}.ts"),
            ("reading", reading_expected(args.source_cache), "reading-full-{:03d}.ts"),
        ):
            rows = unrecorded(expected, pattern)
            missing.extend((skill, *row) for row in rows)
            print(f"{skill}: {len(expected)} questions rebuilt from the cache, {len(rows)} differ from the data with no override.")
            for number, question_id, record, current in rows:
                print(f"  {skill} {number} {question_id}: importer {json.dumps(record, ensure_ascii=False)} | data {json.dumps(current, ensure_ascii=False)}")
        if args.emit:
            for skill, number, question_id, record, current in missing:
                entry = {"answer": current["answer"]}
                if current.get("answerPairId") != record.get("answerPairId") and current.get("answerPairId"):
                    entry["answerPairId"] = current["answerPairId"]
                if current.get("multiSelect") != record.get("multiSelect") and current.get("multiSelect"):
                    entry["multiSelect"] = current["multiSelect"]
                print(f"EMIT {skill} ({number}, {question_id!r}): {json.dumps(entry, ensure_ascii=False)}")

    sys.exit(1 if problems or missing else 0)


if __name__ == "__main__":
    main()
