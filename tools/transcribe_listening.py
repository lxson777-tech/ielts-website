#!/usr/bin/env python3
"""Transcribe the full listening tests locally with faster-whisper.

Tests 1 to 20 were transcribed this way and stamped onto the test files by
tools/apply_listening_transcripts.py, which expects one JSON file per test:

    { "durationSec": float,
      "segments": [{"start": float, "end": float, "text": str}, ...],
      "partStarts": {"1": 0.0, "2": s2, "3": s3, "4": s4} }

This tool produces exactly that shape for whichever tests you ask for, so the
two halves of the bank are built the same way. It runs on the machine, not
through any paid API.

Part boundaries come from the recording itself: every IELTS listening test
announces each new part ("Now turn to section two", "Part 3"). Where an
announcement is missing, the part is split evenly across the remaining time
and the JSON records which starts were guessed, so a human can check.

Usage:
    python tools/transcribe_listening.py 21 22 23        # these tests
    python tools/transcribe_listening.py 21-30           # a range
    python tools/transcribe_listening.py 21 --model small.en

Output: .tmp/transcripts/test-0NN.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO_DIR = ROOT / "public" / "audio" / "listening"
OUT_DIR = ROOT / ".tmp" / "transcripts"

# "section two", "part 3", "now turn to section four", with the ordinal spelled
# out or in digits. Matched against a lowercased segment.
PART_WORDS = {"two": 2, "2": 2, "three": 3, "3": 3, "four": 4, "4": 4}
ANNOUNCEMENT = re.compile(r"\b(?:section|part)\s+(two|three|four|2|3|4)\b")


def parse_tests(args: list[str]) -> list[int]:
    tests: list[int] = []
    for arg in args:
        if "-" in arg:
            lo, hi = arg.split("-", 1)
            tests.extend(range(int(lo), int(hi) + 1))
        else:
            tests.append(int(arg))
    return tests


def find_part_starts(segments: list[dict], duration: float) -> tuple[dict[str, float], list[int]]:
    """Where each part begins. Part 1 always starts at 0."""
    starts: dict[int, float] = {1: 0.0}
    for seg in segments:
        match = ANNOUNCEMENT.search(seg["text"].lower())
        if not match:
            continue
        part = PART_WORDS[match.group(1)]
        # Keep the FIRST announcement of each part: the recording says
        # "now turn to section two" before the part, and may mention it again
        # inside the questions.
        if part not in starts:
            starts[part] = round(float(seg["start"]), 2)

    guessed: list[int] = []
    for part in (2, 3, 4):
        if part in starts:
            continue
        guessed.append(part)
        known_before = max(p for p in starts if p < part)
        start_before = starts[known_before]
        # Spread what is left evenly over the parts that are still missing.
        remaining = [p for p in range(known_before + 1, 5) if p not in starts]
        step = (duration - start_before) / (len(remaining) + 1)
        for i, p in enumerate(remaining, start=1):
            starts[p] = round(start_before + step * i, 2)

    ordered = dict(sorted(starts.items()))
    return {str(k): v for k, v in ordered.items()}, guessed


def transcribe(model, test: int) -> dict:
    audio = AUDIO_DIR / f"test-{test:03d}.mp3"
    if not audio.exists():
        raise SystemExit(f"no audio for test {test}: {audio}")

    started = time.time()
    segments_iter, info = model.transcribe(str(audio), language="en", vad_filter=False)
    segments = [
        {"start": round(float(s.start), 2), "end": round(float(s.end), 2), "text": s.text.strip()}
        for s in segments_iter
        if s.text and s.text.strip()
    ]
    duration = round(float(info.duration), 2)
    part_starts, guessed = find_part_starts(segments, duration)

    out = {
        "durationSec": duration,
        "segments": segments,
        "partStarts": part_starts,
        "guessedPartStarts": guessed,
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / f"test-{test:03d}.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")

    minutes = duration / 60
    print(
        f"test {test:03d}: {minutes:.1f} min of audio, {len(segments)} segments, "
        f"parts at {[part_starts[k] for k in sorted(part_starts)]}"
        f"{' (guessed: ' + ', '.join(map(str, guessed)) + ')' if guessed else ''}, "
        f"took {time.time() - started:.0f}s",
        flush=True,
    )
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("tests", nargs="+", help="test numbers, e.g. 21 22 or 21-30")
    parser.add_argument("--model", default="base.en", help="faster-whisper model (default base.en, as used for tests 1 to 20)")
    args = parser.parse_args()

    from faster_whisper import WhisperModel

    print(f"loading {args.model} ...", flush=True)
    model = WhisperModel(args.model, device="cpu", compute_type="int8")

    total_minutes = 0.0
    for test in parse_tests(args.tests):
        total_minutes += transcribe(model, test)["durationSec"] / 60
    print(f"done: {total_minutes:.0f} minutes of audio transcribed on this machine, at no cost")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
