#!/usr/bin/env python3
"""
Drafts one SEO-oriented IELTS blog post and opens it as a draft PR for
human review. Never publishes directly — see workflows/generate_blog_post.md.

Usage:
    pip install -r requirements.txt
    python tools/blog_agent.py [--topic "IELTS Writing Task 2 time management"]

With no --topic, picks the first open item from marketing/backlog.md
(written by tools/growth_report_agent.py), falling back to SEED_TOPICS.
"""

import argparse
import datetime
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from agent_runner import run_agent
from utils import ROOT, open_marketing_pr, require_env

BLOG_DIR = ROOT / "src" / "content" / "blog"
LESSON_BODIES_DIR = ROOT / "src" / "content" / "lesson-bodies"
BACKLOG_FILE = ROOT / "marketing" / "backlog.md"

SEED_TOPICS = [
    "How IELTS Writing Task 2 essays are actually scored, band by band",
    "The 5 most common IELTS Listening Section 3 trap answers",
    "IELTS Speaking Part 2: how to fill 2 minutes without running dry",
    "Academic vs General Training IELTS: which one do you need?",
    "How to paraphrase in IELTS Reading without losing meaning",
]

SYSTEM_PROMPT = """You are the content-marketing writer for a free IELTS \
test-prep website (IELTS Portal). You draft ONE SEO-oriented blog post per \
run, aimed at people actively studying for IELTS and searching Google for \
practical answers.

Voice: clear, encouraging, concrete — the same voice as the site's existing \
lessons (use read_site_content to sample it). No fluff, no generic \
"IELTS is an important test" filler. Every post should teach something a \
reader can use in their next practice session, and should naturally link \
to relevant lesson pages on this site using root-relative markdown links \
like [Reading Task 1 lesson](/lessons/reading-task1) where genuinely useful \
(don't force it).

Steps:
1. Call list_existing_posts() to see what's already covered — never write a \
   near-duplicate.
2. Call read_site_content() once or twice to check terminology/voice \
   consistency with existing lessons.
3. Use web_search sparingly (a couple of targeted queries) to verify facts \
   like band-score criteria or exam format details — don't pad the post \
   with search-engine trivia.
4. Call write_draft(...) exactly once with the finished post. This is the \
   ONLY way your work is saved — if you don't call it, nothing happens.

Target length: 700-1100 words. Markdown body only (no frontmatter — the \
tool adds that). Include a short intro, 3-5 clear sections with headers, \
and a concluding call-to-action pointing at a relevant practice tool on \
the site (e.g. the Writing Checker, a lesson, or Practice Tests).
"""

WEB_SEARCH_TOOL = {"type": "web_search_20260209", "name": "web_search", "max_uses": 5}

TOOLS = [
    WEB_SEARCH_TOOL,
    {
        "name": "list_existing_posts",
        "description": "List every existing blog post's slug, title and description, to avoid duplicate topics.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "read_site_content",
        "description": "Search existing lesson and blog content for a keyword/phrase, returning matching snippets for voice/terminology reference and internal-link targets.",
        "input_schema": {
            "type": "object",
            "properties": {"query": {"type": "string", "description": "Keyword or phrase to search for"}},
            "required": ["query"],
        },
    },
    {
        "name": "write_draft",
        "description": "Save the finished blog post draft. This is the only way output is persisted — call it exactly once, when the post is complete.",
        "input_schema": {
            "type": "object",
            "properties": {
                "slug": {"type": "string", "description": "URL slug, lowercase kebab-case, e.g. 'ielts-writing-task-2-band-scores'"},
                "title": {"type": "string"},
                "description": {"type": "string", "description": "One-sentence meta description, <160 chars"},
                "tags": {"type": "array", "items": {"type": "string"}},
                "body_markdown": {"type": "string", "description": "Full post body in Markdown, no frontmatter"},
            },
            "required": ["slug", "title", "description", "tags", "body_markdown"],
        },
    },
]


def _strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", " ", text)


def list_existing_posts() -> str:
    if not BLOG_DIR.exists():
        return "No blog posts exist yet."
    posts = []
    for path in sorted(BLOG_DIR.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        title = re.search(r'^title:\s*"?(.+?)"?\s*$', text, re.MULTILINE)
        desc = re.search(r'^description:\s*"?(.+?)"?\s*$', text, re.MULTILINE)
        posts.append(f"- {path.stem}: {title.group(1) if title else '?'} — {desc.group(1) if desc else ''}")
    return "\n".join(posts) if posts else "No blog posts exist yet."


def read_site_content(query: str) -> str:
    query_lower = query.lower()
    hits = []
    for path in list(LESSON_BODIES_DIR.glob("*.html")) + list(BLOG_DIR.glob("*.md")):
        text = _strip_html(path.read_text(encoding="utf-8"))
        idx = text.lower().find(query_lower)
        if idx != -1:
            snippet = re.sub(r"\s+", " ", text[max(0, idx - 200):idx + 200]).strip()
            hits.append(f"[{path.name}] ...{snippet}...")
        if len(hits) >= 5:
            break
    return "\n\n".join(hits) if hits else f"No existing content found matching '{query}'."


def _slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return re.sub(r"-{2,}", "-", slug)


def make_write_draft():
    written = {}

    def write_draft(slug: str, title: str, description: str, tags: list, body_markdown: str) -> str:
        slug = _slugify(slug)
        BLOG_DIR.mkdir(parents=True, exist_ok=True)
        path = BLOG_DIR / f"{slug}.md"
        if path.exists():
            slug = f"{slug}-{datetime.date.today().isoformat()}"
            path = BLOG_DIR / f"{slug}.md"

        tags_yaml = "[" + ", ".join(f'"{t}"' for t in tags) + "]"
        frontmatter = (
            "---\n"
            f'title: "{title}"\n'
            f'description: "{description}"\n'
            f"pubDate: {datetime.date.today().isoformat()}\n"
            f"draft: true\n"  # forced regardless of model input
            f"tags: {tags_yaml}\n"
            "---\n\n"
        )
        path.write_text(frontmatter + body_markdown.strip() + "\n", encoding="utf-8")
        written["slug"] = slug
        written["title"] = title
        written["path"] = str(path.relative_to(ROOT))
        return f"Draft saved to {path.relative_to(ROOT)}"

    return write_draft, written


def next_backlog_topic() -> str | None:
    if not BACKLOG_FILE.exists():
        return None
    for line in BACKLOG_FILE.read_text(encoding="utf-8").splitlines():
        m = re.match(r"-\s*\[ \]\s*(.+)", line)
        if m:
            return m.group(1).split(" — ")[0].strip()
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--topic", help="Override topic instead of pulling from the backlog/seed list")
    args = parser.parse_args()

    require_env("ANTHROPIC_API_KEY")

    topic = args.topic or next_backlog_topic() or SEED_TOPICS[0]
    print(f"Topic: {topic}")

    write_draft, written = make_write_draft()
    tool_registry = {
        "list_existing_posts": list_existing_posts,
        "read_site_content": read_site_content,
        "write_draft": write_draft,
    }

    task = f"Write today's blog post on this topic: {topic}"
    run_agent(task, SYSTEM_PROMPT, TOOLS, tool_registry)

    if "path" not in written:
        print("Model did not call write_draft() — no draft produced. Nothing to do.")
        sys.exit(1)

    print(f"Draft written: {written['path']}")

    today = datetime.date.today().isoformat()
    branch = f"blog-draft/{written['slug']}-{today}"
    pr_body = (
        f"Automated blog draft from `tools/blog_agent.py`.\n\n"
        f"**Topic:** {topic}\n\n"
        "### Review checklist\n"
        "- [ ] Facts and band-score claims are accurate\n"
        "- [ ] Voice matches the rest of the site\n"
        "- [ ] Internal links resolve to real pages\n"
        "- [ ] Flip `draft: false` in the frontmatter when ready to publish\n"
    )
    pr_url = open_marketing_pr(
        branch=branch,
        files=[written["path"]],
        title=f"[Blog draft] {written['title']}",
        body=pr_body,
    )
    if pr_url:
        print(f"PR opened: {pr_url}")


if __name__ == "__main__":
    main()
