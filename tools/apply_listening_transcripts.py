#!/usr/bin/env python3
"""Stamp auto-transcribed audio timing and transcript text onto the 20 full
listening tests.

Each `src/data/tests/listening-full-NNN.ts` file is `import ...; export const
listeningFullNNN: PracticeTest = <JSON.stringify output, 2-space indent>;\n`.
That JSON body is parsed with `json.loads`, patched, and re-dumped with
`json.dumps(obj, indent=2, ensure_ascii=False)`, which reproduces the original
byte-for-byte (checked by hand against the source files: only the line
endings differ, and those are handled explicitly below — each of the 20 files
is consistently either CRLF or LF throughout, never mixed, so this script
detects and preserves whichever one a file already uses).

For each test N, the matching transcript is `<transcript_dir>/test-NNN.json`,
produced locally by faster-whisper (base.en) with the shape:
    { "durationSec": float, "segments": [{"start","end","text"}, ...],
      "partStarts": {"1": 0.0, "2": s2, "3": s3, "4": s4} }

For each of the four parts this sets, on `parts[i].stimulus`:
  - startSeconds: partStarts["<part>"] (Part 1 is pinned to 0 regardless of
    what faster-whisper detected, since the recording always opens on Part 1)
  - endSeconds: the next part's start for Parts 1-3, or durationSec for Part 4
  - transcriptHtml: the segments whose `start` falls in [startSeconds,
    endSeconds), grouped into ~4-segment paragraphs, each paragraph opening
    with a "[mm:ss]" timestamp span, HTML-escaped, with a fixed disclaimer
    paragraph prepended (faster-whisper is not perfectly accurate; the answer
    key is authoritative, not the transcript)

Idempotent: every field is fully recomputed from the two source files on each
run and overwritten, so re-running with the same inputs reproduces the same
output byte-for-byte. It only ever *adds*/*overwrites* stimulus fields
(startSeconds, endSeconds, transcriptHtml) — question/answer data is never
touched.

Usage:
    python tools/apply_listening_transcripts.py <transcript_dir> [--tests 1,11,17]

`transcript_dir` should contain test-001.json .. test-020.json.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TESTS_DIR = ROOT / "src" / "data" / "tests"

FILE_RE = re.compile(
    r"^(import type \{ PracticeTest \} from '\.\./\.\./lib/tests/schema';\n\n"
    r"export const (\w+): PracticeTest = )(\{.*\});\n$",
    re.DOTALL,
)

SEGMENTS_PER_PARAGRAPH = 4
TRANSCRIPT_NOTE = (
    '<p class="transcript-note">Automatic transcript. It may contain small '
    "recognition errors; the answer key is authoritative.</p>"
)


def fmt_timestamp(seconds: float) -> str:
    total = max(0, int(seconds))
    return f"[{total // 60:02d}:{total % 60:02d}]"


def build_transcript_html(segments: list[dict], start: float, end: float) -> str:
    in_range = [seg for seg in segments if start <= seg["start"] < end]
    paragraphs = [TRANSCRIPT_NOTE]
    for i in range(0, len(in_range), SEGMENTS_PER_PARAGRAPH):
        chunk = in_range[i : i + SEGMENTS_PER_PARAGRAPH]
        ts = fmt_timestamp(chunk[0]["start"])
        text = html.escape(" ".join(seg["text"].strip() for seg in chunk).strip())
        paragraphs.append(f'<p><span class="ts">{ts}</span> {text}</p>')
    return "".join(paragraphs)


def load_test_file(path: Path) -> tuple[str, str, dict, bytes]:
    """Returns (header, varname, parsed_json_obj, original_newline)."""
    raw = path.read_bytes()
    newline = b"\r\n" if b"\r\n" in raw else b"\n"
    text_lf = raw.decode("utf-8").replace("\r\n", "\n")
    m = FILE_RE.match(text_lf)
    if not m:
        raise ValueError(f"{path} does not match the expected header/JSON/footer shape")
    header, varname, json_part = m.groups()
    obj = json.loads(json_part)
    return header, varname, obj, newline


def write_test_file(path: Path, header: str, obj: dict, newline: bytes) -> None:
    json_part = json.dumps(obj, indent=2, ensure_ascii=False)
    text_lf = f"{header}{json_part};\n"
    text = text_lf if newline == b"\n" else text_lf.replace("\n", "\r\n")
    path.write_bytes(text.encode("utf-8"))


def apply_one(test_num: int, transcript_dir: Path) -> None:
    test_path = TESTS_DIR / f"listening-full-{test_num:03d}.ts"
    transcript_path = transcript_dir / f"test-{test_num:03d}.json"

    header, varname, obj, newline = load_test_file(test_path)
    transcript = json.loads(transcript_path.read_text(encoding="utf-8"))
    segments = transcript["segments"]
    duration = transcript["durationSec"]
    part_starts = transcript["partStarts"]

    parts = obj["parts"]
    if len(parts) != 4:
        raise ValueError(f"{test_path} does not have exactly 4 parts")

    for i, part in enumerate(parts):
        part_no = i + 1
        start = 0.0 if part_no == 1 else part_starts[str(part_no)]
        end = duration if part_no == 4 else part_starts[str(part_no + 1)]

        stimulus = part["stimulus"]
        stimulus["startSeconds"] = start
        stimulus["endSeconds"] = end
        stimulus["transcriptHtml"] = build_transcript_html(segments, start, end)

    write_test_file(test_path, header, obj, newline)
    print(f"  test {test_num:03d} ({varname}): OK")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("transcript_dir", type=Path, help="Directory containing test-001.json .. test-020.json")
    parser.add_argument(
        "--tests",
        default=None,
        help="Comma-separated 1-based test numbers to process (default: all 1-20)",
    )
    args = parser.parse_args()

    if not args.transcript_dir.is_dir():
        print(f"Not a directory: {args.transcript_dir}", file=sys.stderr)
        sys.exit(1)

    test_nums = (
        [int(n) for n in args.tests.split(",")] if args.tests else list(range(1, 21))
    )

    for n in test_nums:
        apply_one(n, args.transcript_dir)

    print(f"Done: {len(test_nums)} test(s) updated.")


if __name__ == "__main__":
    main()
