#!/usr/bin/env python3
"""
Audits the live site's technical SEO health, diffs content coverage against
a competitor, and writes a growth report + content backlog as a draft PR.
Read-only against everything except its own report/backlog files — it has
no tool capable of touching src/. See workflows/seo_growth_report.md.

Usage:
    pip install -r requirements.txt
    python tools/growth_report_agent.py
"""

import datetime
import os
import re
import sys
from pathlib import Path

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).parent))

from agent_runner import run_agent
from utils import ROOT, open_marketing_pr, require_env

ORIGIN = "https://lxson777-tech.github.io"
SITE_URL = ORIGIN + "/ielts-website"
LESSONS_TS = ROOT / "src" / "data" / "lessons.ts"
BLOG_DIR = ROOT / "src" / "content" / "blog"
REPORTS_DIR = ROOT / "marketing" / "reports"
BACKLOG_FILE = ROOT / "marketing" / "backlog.md"

CRAWL_PATHS = ["/", "/tests", "/blog", "/lessons/reading-task1", "/lessons/writing", "/lessons/speaking", "/lessons/listening", "/lessons/vocabulary"]

HAS_GA4 = bool(os.getenv("GA4_PROPERTY_ID"))
HAS_GSC = bool(os.getenv("GSC_SITE_URL"))

SYSTEM_PROMPT = f"""You are the SEO/growth analyst for a free IELTS test-prep \
website (IELTS Portal, competing loosely with the paid platform ielts.gg). \
You produce ONE growth report per run: a technical SEO audit of the site's \
own pages, a content-coverage gap analysis versus competitors, and a \
prioritized backlog of blog topics for a separate content-writing agent to \
pick up later.

Hard constraint: real traffic/analytics data is {"AVAILABLE (GA4)" if HAS_GA4 else "NOT configured"} \
and Search Console is {"AVAILABLE" if HAS_GSC else "NOT configured"}. If data isn't \
available, say so plainly in the report ("no traffic data — see setup note") \
— never invent traffic numbers, keyword rankings, or click-through rates.

Steps:
1. Call crawl_own_site() to get a technical audit of the site's own pages \
   (titles, meta descriptions, OG tags, JSON-LD, broken links, alt text).
2. Call list_content_inventory() to see what topics/lessons/posts already exist.
3. Use web_search (a handful of targeted queries) to identify IELTS topics \
   ielts.gg or similar competitors cover that this site doesn't.
4. Call write_report(sections=[...]) exactly once with your findings, \
   structured as a list of {{heading, body_markdown}} sections. Cover: \
   Technical SEO Audit, Content Coverage Gaps, Traffic & Analytics (state \
   plainly if unavailable), Recommendations.
5. Call write_backlog_items(items=[...]) exactly once with 5-10 new blog \
   topic ideas, each {{topic, rationale, priority}} (priority: high/medium/low). \
   Skip topics already in the existing backlog or already covered by a post.

You have no ability to edit site source files — only to write the report \
and backlog. Don't suggest you've fixed anything; only report and recommend.
"""

WEB_SEARCH_TOOL = {"type": "web_search_20260209", "name": "web_search", "max_uses": 6}

TOOLS = [
    WEB_SEARCH_TOOL,
    {
        "name": "crawl_own_site",
        "description": "Crawl a fixed set of the site's own live pages and return a technical SEO audit: titles, meta descriptions, canonical/OG/JSON-LD presence, broken internal links, image alt-text coverage, robots.txt/sitemap presence.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "list_content_inventory",
        "description": "List every existing lesson topic and blog post title/description on the site today.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "write_report",
        "description": "Save the finished growth report. Call exactly once.",
        "input_schema": {
            "type": "object",
            "properties": {
                "sections": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "heading": {"type": "string"},
                            "body_markdown": {"type": "string"},
                        },
                        "required": ["heading", "body_markdown"],
                    },
                }
            },
            "required": ["sections"],
        },
    },
    {
        "name": "write_backlog_items",
        "description": "Append new content-backlog items (topic ideas for the blog agent). Call exactly once.",
        "input_schema": {
            "type": "object",
            "properties": {
                "items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "topic": {"type": "string"},
                            "rationale": {"type": "string"},
                            "priority": {"type": "string", "enum": ["high", "medium", "low"]},
                        },
                        "required": ["topic", "rationale", "priority"],
                    },
                }
            },
            "required": ["items"],
        },
    },
]


def crawl_own_site() -> str:
    lines = []

    for special in ["/robots.txt", "/sitemap-index.xml"]:
        try:
            r = requests.get(SITE_URL + special, timeout=10)
            lines.append(f"{special}: HTTP {r.status_code}")
        except requests.RequestException as e:
            lines.append(f"{special}: ERROR {e}")

    for path in CRAWL_PATHS:
        url = SITE_URL + path
        try:
            r = requests.get(url, timeout=10)
        except requests.RequestException as e:
            lines.append(f"\n{path}: FETCH ERROR {e}")
            continue

        if not r.ok:
            lines.append(f"\n{path}: HTTP {r.status_code}")
            continue

        soup = BeautifulSoup(r.text, "html.parser")
        title = soup.title.string.strip() if soup.title and soup.title.string else "(missing)"
        desc_tag = soup.find("meta", attrs={"name": "description"})
        description = desc_tag["content"].strip() if desc_tag and desc_tag.get("content") else "(missing)"
        canonical = soup.find("link", attrs={"rel": "canonical"})
        og_title = soup.find("meta", attrs={"property": "og:title"})
        og_image = soup.find("meta", attrs={"property": "og:image"})
        jsonld = soup.find("script", attrs={"type": "application/ld+json"})

        imgs = soup.find_all("img")
        missing_alt = [img.get("src", "?") for img in imgs if not img.get("alt", "").strip()]

        internal_links = set()
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if href.startswith("/") and not href.startswith("//"):
                internal_links.add(href.split("#")[0])

        broken = []
        for href in list(internal_links)[:15]:
            full_url = ORIGIN + href
            try:
                rr = requests.head(full_url, timeout=10, allow_redirects=True)
                if rr.status_code >= 400:
                    broken.append(f"{href} -> {rr.status_code}")
            except requests.RequestException:
                broken.append(f"{href} -> unreachable")

        lines.append(
            f"\n{path}:\n"
            f"  title: {title}\n"
            f"  meta description: {description}\n"
            f"  canonical: {'present' if canonical else 'MISSING'}\n"
            f"  og:title/og:image: {'present' if og_title and og_image else 'MISSING'}\n"
            f"  JSON-LD: {'present' if jsonld else 'MISSING'}\n"
            f"  images missing alt text: {len(missing_alt)}/{len(imgs)}\n"
            f"  broken internal links (sampled): {broken if broken else 'none found'}"
        )

    return "\n".join(lines)


def list_content_inventory() -> str:
    lessons_text = LESSONS_TS.read_text(encoding="utf-8") if LESSONS_TS.exists() else ""
    lessons = re.findall(r"title:\s*'([^']+)'.*?skill:\s*'([^']+)'", lessons_text, re.DOTALL)
    lesson_lines = [f"- [lesson/{skill}] {title}" for title, skill in lessons]

    post_lines = []
    if BLOG_DIR.exists():
        for path in sorted(BLOG_DIR.glob("*.md")):
            text = path.read_text(encoding="utf-8")
            title = re.search(r'^title:\s*"?(.+?)"?\s*$', text, re.MULTILINE)
            draft = re.search(r"^draft:\s*(true|false)\s*$", text, re.MULTILINE)
            status = "draft" if not draft or draft.group(1) == "true" else "published"
            post_lines.append(f"- [blog/{status}] {title.group(1) if title else path.stem}")

    return "\n".join(lesson_lines + post_lines) or "No content found."


def make_write_report():
    written = {}

    def write_report(sections: list) -> str:
        REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        today = datetime.date.today().isoformat()
        path = REPORTS_DIR / f"{today}.md"
        body = f"# SEO & Growth Report — {today}\n\n"
        for s in sections:
            body += f"## {s['heading']}\n\n{s['body_markdown'].strip()}\n\n"
        path.write_text(body, encoding="utf-8")
        written["report_path"] = str(path.relative_to(ROOT))
        written["date"] = today
        return f"Report saved to {path.relative_to(ROOT)}"

    return write_report, written


def make_write_backlog_items():
    written = {}

    def write_backlog_items(items: list) -> str:
        BACKLOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        existing = BACKLOG_FILE.read_text(encoding="utf-8") if BACKLOG_FILE.exists() else "# Content Backlog\n\n"
        existing_topics = {
            m.group(1).strip().lower() for m in re.finditer(r"-\s*\[[ x]\]\s*(.+?)(?:\s*—.*)?$", existing, re.MULTILINE)
        }

        new_lines = []
        for item in items:
            if item["topic"].strip().lower() in existing_topics:
                continue
            new_lines.append(f"- [ ] {item['topic']} — {item['rationale']} (priority: {item['priority']})")

        if new_lines:
            existing = existing.rstrip() + "\n" + "\n".join(new_lines) + "\n"
            BACKLOG_FILE.write_text(existing, encoding="utf-8")

        written["backlog_path"] = str(BACKLOG_FILE.relative_to(ROOT))
        written["added"] = len(new_lines)
        return f"Added {len(new_lines)} new backlog item(s)."

    return write_backlog_items, written


def main():
    require_env("ANTHROPIC_API_KEY")

    write_report, report_written = make_write_report()
    write_backlog_items, backlog_written = make_write_backlog_items()
    tool_registry = {
        "crawl_own_site": crawl_own_site,
        "list_content_inventory": list_content_inventory,
        "write_report": write_report,
        "write_backlog_items": write_backlog_items,
    }

    task = "Run this week's SEO and growth audit."
    run_agent(task, SYSTEM_PROMPT, TOOLS, tool_registry)

    if "report_path" not in report_written:
        print("Model did not call write_report() — no report produced.")
        sys.exit(1)

    print(f"Report written: {report_written['report_path']}")
    if "backlog_path" in backlog_written:
        print(f"Backlog updated: {backlog_written['added']} new item(s)")

    files = [report_written["report_path"]]
    if backlog_written.get("added"):
        files.append(backlog_written["backlog_path"])

    branch = f"growth-report/{report_written['date']}"
    pr_body = (
        f"Automated SEO/growth report from `tools/growth_report_agent.py`.\n\n"
        f"- {backlog_written.get('added', 0)} new backlog item(s) added for the blog agent to pick up.\n"
        "- No source files were touched — report + backlog only.\n"
    )
    pr_url = open_marketing_pr(
        branch=branch,
        files=files,
        title=f"[Growth report] {report_written['date']}",
        body=pr_body,
    )
    if pr_url:
        print(f"PR opened: {pr_url}")


if __name__ == "__main__":
    main()
