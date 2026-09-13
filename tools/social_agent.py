#!/usr/bin/env python3
"""
Plans ONE short-form IELTS video: picks a topic, grounds it in this site's own
lesson content, and writes the script, the Higgsfield video prompt, and the
per-platform captions into a job file under marketing/queue/.

This script only ever writes a local JSON job. It does not render video, does
not call any social API, and cannot publish anything. See
workflows/social_marketing.md.

Usage:
    python tools/social_agent.py
    python tools/social_agent.py --topic "Task 2 conclusions" --format tip
"""

import argparse
import html
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import social_queue as q
from agent_runner import run_agent
from utils import ROOT, require_env

LESSON_BODIES_DIR = ROOT / "src" / "content" / "lesson-bodies"
SITE_URL = "https://lxson777-tech.github.io/ielts-website"

# Lesson-body stems map to /lessons/<stem> on the site, except the paper-level
# hubs which are their own top-level lesson pages.
FORMAT_BRIEFS = {
    "tip": "One concrete, immediately usable technique that raises a band score.",
    "mistake": "One specific mistake real candidates make, why it costs marks, and the fix.",
    "structure": "A repeatable structure/template for a task type, shown step by step.",
}

SYSTEM_PROMPT = f"""You are the short-form video producer for IELTS Portal, a \
FREE IELTS prep site run by an English language teaching centre in Almaty, \
Kazakhstan. You plan ONE vertical short-form video per run for Instagram \
Reels and TikTok.

Audience: adults actively preparing for IELTS, mostly Kazakhstan/Central Asia \
and the wider CIS, studying in English as a second language. Many are \
targeting Band 6.5-7.5 for university or immigration. They are busy, \
skeptical of hype, and have seen a lot of generic "IELTS tips" content.

Non-negotiables:
- EVERY factual claim about the exam must come from this site's own lesson \
  content. Call read_lesson() and ground the video in what's actually there. \
  Do not invent band descriptors, scoring rules, or exam-format details.
- The video must teach ONE thing. Not three. One.
- The first 2 seconds decide everything. Open on the payoff or a sharp, \
  specific question, never on "Hi guys" or "In today's video".
- Speak plainly. No hype, no "game-changer", no emoji in the spoken script.
- The site is genuinely free. Say so plainly; never imply a paid product.

Steps:
1. Call list_lessons() to see what source material exists.
2. Call recent_content() to see what's already been made — never repeat a \
   topic that's been covered recently.
3. Call read_lesson() on the most relevant lesson and ground your script in \
   its actual content.
4. Call save_plan(...) exactly once. This is the ONLY way your work is \
   saved — if you don't call it, the run produces nothing.

Script format: 15-30 seconds of speech, which is roughly 40-80 words TOTAL. \
Be ruthless. Each beat is one on-screen line plus what the voiceover says.

The video_prompt field is fed to a generative video model (Higgsfield). \
Describe the VISUAL only: setting, subject, camera movement, lighting, mood. \
It must be vertical 9:16. Do not put speech, captions, or text overlays in \
the video prompt — on-screen text is burned in later from the script beats. \
Generative video models render text badly; never ask for legible words.

Captions differ per platform:
- Instagram: 2-3 short lines, a line break, then the CTA. Reads as a caption.
- TikTok: one punchy line, lowercase-leaning, native to the platform.
Put the link as {SITE_URL} in the Instagram caption. On TikTok say \
"link in bio" instead — TikTok suppresses reach on posts with raw URLs.

Hashtags: 8-12, mixing broad (#ielts) with specific (#ieltswriting, \
#ielts speaking tips written as #ieltsspeakingtips) and regional \
(#ieltskazakhstan, #ieltsalmaty). No banned/spammy tags, no #fyp stuffing.
"""

TOOLS = [
    {
        "name": "list_lessons",
        "description": "List every lesson available on the site as source material, with its slug and page URL.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "recent_content",
        "description": "List topics already turned into videos, so you don't repeat one.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "read_lesson",
        "description": "Read a lesson's body text to ground the script in real site content. Use the slug from list_lessons().",
        "input_schema": {
            "type": "object",
            "properties": {"slug": {"type": "string", "description": "Lesson slug, e.g. 'writing-task2-method'"}},
            "required": ["slug"],
        },
    },
    {
        "name": "save_plan",
        "description": "Save the finished video plan. Call exactly once, when everything is complete.",
        "input_schema": {
            "type": "object",
            "properties": {
                "topic": {"type": "string", "description": "Short topic label, e.g. 'Task 2 conclusions in 2 sentences'"},
                "source_lesson": {"type": "string", "description": "Slug of the lesson this is grounded in"},
                "hook": {"type": "string", "description": "The first line, spoken in the first 2 seconds"},
                "beats": {
                    "type": "array",
                    "description": "3-5 sequential beats making up the body of the video",
                    "items": {
                        "type": "object",
                        "properties": {
                            "on_screen": {"type": "string", "description": "Short text burned onto the screen, <8 words"},
                            "voiceover": {"type": "string", "description": "What is said over this beat"},
                        },
                        "required": ["on_screen", "voiceover"],
                    },
                },
                "cta": {"type": "string", "description": "Closing spoken call to action"},
                "video_prompt": {"type": "string", "description": "Visual-only prompt for the generative video model, 9:16 vertical"},
                "caption_instagram": {"type": "string"},
                "caption_tiktok": {"type": "string"},
                "hashtags": {"type": "array", "items": {"type": "string"}, "description": "8-12 tags, without the # prefix"},
            },
            "required": [
                "topic", "source_lesson", "hook", "beats", "cta",
                "video_prompt", "caption_instagram", "caption_tiktok", "hashtags",
            ],
        },
    },
]


def _strip_html(text: str) -> str:
    text = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", text, flags=re.DOTALL | re.IGNORECASE)
    # Unescape after tag-stripping so entities like &middot; reach the model as
    # real characters rather than literal "&middot;" noise.
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", text))).strip()


def list_lessons() -> str:
    if not LESSON_BODIES_DIR.exists():
        return "No lesson content found."
    lines = []
    for path in sorted(LESSON_BODIES_DIR.glob("*.html")):
        lines.append(f"- {path.stem} -> {SITE_URL}/lessons/{path.stem}")
    return "\n".join(lines)


def recent_content() -> str:
    topics = q.recent_topics()
    if not topics:
        return "No videos made yet — anything is fair game."
    return "Already covered:\n" + "\n".join(f"- {t}" for t in topics)


def read_lesson(slug: str) -> str:
    path = LESSON_BODIES_DIR / f"{slug}.html"
    if not path.exists():
        available = ", ".join(p.stem for p in sorted(LESSON_BODIES_DIR.glob("*.html"))[:10])
        return f"No lesson '{slug}'. Call list_lessons() for valid slugs. Examples: {available}"
    text = _strip_html(path.read_text(encoding="utf-8"))
    return text[:6000]


def make_save_plan(fmt: str):
    saved = {}

    def save_plan(topic, source_lesson, hook, beats, cta, video_prompt,
                  caption_instagram, caption_tiktok, hashtags) -> str:
        job = q.new_job(topic=topic, fmt=fmt, source_lesson=source_lesson)
        job = q.unique_id(job)
        job["script"] = {"hook": hook, "beats": beats, "cta": cta}
        job["video_prompt"] = video_prompt
        job["caption"] = {"instagram": caption_instagram, "tiktok": caption_tiktok}
        job["hashtags"] = [h.lstrip("#") for h in hashtags]
        q.log(job, f"planned by social_agent.py (format={fmt}, source={source_lesson})")
        path = q.save_job(job)
        saved["id"] = job["id"]
        saved["path"] = str(path.relative_to(ROOT))
        word_count = len(hook.split()) + sum(len(b["voiceover"].split()) for b in beats) + len(cta.split())
        return f"Saved job {job['id']} ({word_count} spoken words) to {saved['path']}"

    return save_plan, saved


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--topic", help="Force a topic instead of letting the agent choose")
    parser.add_argument("--format", choices=q.FORMATS, default="tip",
                        help="Content format (default: tip)")
    args = parser.parse_args()

    require_env("ANTHROPIC_API_KEY")

    save_plan, saved = make_save_plan(args.format)
    tool_registry = {
        "list_lessons": list_lessons,
        "recent_content": recent_content,
        "read_lesson": read_lesson,
        "save_plan": save_plan,
    }

    brief = FORMAT_BRIEFS[args.format]
    if args.topic:
        task = f"Plan today's video. Format: {args.format} ({brief}) Topic is fixed: {args.topic}"
    else:
        task = (
            f"Plan today's video. Format: {args.format} ({brief}) "
            "Choose the topic yourself — pick something specific and genuinely useful "
            "that hasn't been covered recently."
        )

    run_agent(task, SYSTEM_PROMPT, TOOLS, tool_registry)

    if "id" not in saved:
        print("Model did not call save_plan() — nothing produced.")
        sys.exit(1)

    print(f"\nPlanned: {saved['id']}")
    print(f"Job file: {saved['path']}")
    print(f"\nNext: python tools/social_render.py --job {saved['id']}")


if __name__ == "__main__":
    main()
