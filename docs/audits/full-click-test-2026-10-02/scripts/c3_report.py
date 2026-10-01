"""C3: read every C1 sweep and C2 click run in this folder and list what needs
looking at, grouped so that one cause shows once.

  python c3_report.py <audit-dir>

Expected refusals are not faults: for a visitor or a free account, the
content door and the AI Workers answering 401/402/403 for paid material is
the model working. Everything else is listed.
"""
import collections
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
A = Path(sys.argv[1])
LESSONS = re.compile(r"^/lessons/")


def expected(tier, e):
    if e["kind"] == "http" and tier in ("visitor", "free", "open-visitor") and e["status"] in (401, 402, 403):
        return True
    # The browser's own line for the same refused request.
    if e["kind"] == "console" and tier in ("visitor", "free", "open-visitor") and re.search(r"status of 40[123]", e["text"]):
        return True
    return False


out = []
for rows_file in sorted(A.glob("c1-sweep-*/rows.json")):
    d = json.loads(rows_file.read_text(encoding="utf-8"))
    tier = d["tier"]
    groups = collections.defaultdict(list)
    locked_lessons = []
    paid_locked = []
    for r in d["rows"]:
        route = r["route"]
        if r.get("exception"):
            groups["page did not finish loading: " + r["exception"][:120]].append(route)
        if (r.get("status") or 0) >= 400 or r.get("notFound"):
            groups[f"page answered {r.get('status')} / not found"].append(route)
        for t in r.get("brokenText") or []:
            groups[f"broken-screen wording on the page: {t!r}"].append(route)
        for link in r.get("brokenLinks") or []:
            groups[f"link to a missing page: {link}"].append(route)
        for e in r.get("errors") or []:
            if expected(tier, e):
                continue
            text = re.sub(r"\d{6,}|[0-9a-f]{8}-[0-9a-f-]{27,}", "#", e["text"])
            text = re.sub(r"(https?://[^/\s]+)?/ielts-website/[^\s?]*", "<page>", text) if e["kind"] == "console" else text
            groups[f"{e['kind']}: {text[:200]}"].append(route)
        if tier in ("free",) and LESSONS.match(route) and r.get("locked"):
            locked_lessons.append(route)
        if tier == "paid" and r.get("locked"):
            paid_locked.append(route)
    out.append(f"\n## C1 sweep: {tier} {d['lang']} {d['size']}: {len(d['rows'])} pages")
    if locked_lessons:
        out.append(f"- FAULT: a free account sees the locked page on {len(locked_lessons)} lessons: {locked_lessons[:6]}")
    if paid_locked:
        out.append(f"- FAULT: a paid account sees the locked page on {len(paid_locked)} pages: {paid_locked[:6]}")
    if not groups and not locked_lessons and not paid_locked:
        out.append("- nothing to look at")
    for k, v in sorted(groups.items(), key=lambda kv: -len(kv[1])):
        out.append(f"- {k}  ({len(v)} pages, e.g. {', '.join(v[:4])})")

for clicks_file in sorted(A.glob("c2-click-*/clicks.json")):
    d = json.loads(clicks_file.read_text(encoding="utf-8"))
    tier = d["tier"]
    n = 0
    groups = collections.defaultdict(list)
    dialogs = collections.Counter()
    for pr in d["pages"]:
        if pr.get("exception"):
            groups["page did not load: " + pr["exception"][:120]].append(pr["route"])
        for e in pr.get("loadErrors") or []:
            if not expected(tier, e):
                groups[f"on load, {e['kind']}: {e['text'][:160]}"].append(pr["route"])
        for c in pr["controls"]:
            n += 1
            where = f"{pr['route']} > {c['control'][:50]!r}"
            if c.get("problem"):
                groups[c["problem"]].append(where + (f" -> {c.get('went')}" if c.get("went") else ""))
            if c.get("outcome") == "could not click":
                groups["could not click: " + (c.get("why") or "")[:100]].append(where)
            for t in c.get("brokenText") or []:
                groups[f"broken-screen wording after the click: {t!r}"].append(where)
            for e in c.get("errors") or []:
                if expected(tier, e):
                    continue
                text = re.sub(r"\d{6,}|[0-9a-f]{8}-[0-9a-f-]{27,}", "#", e["text"])
                groups[f"{e['kind']}: {text[:200]}"].append(where)
            if c.get("dialog"):
                dialogs[c["dialog"][:40]] += 1
    out.append(f"\n## C2 clicks: {tier} {d['lang']} {d['size']}: {len(d['pages'])} pages, {n} controls used")
    if not groups:
        out.append("- nothing to look at")
    for k, v in sorted(groups.items(), key=lambda kv: -len(kv[1])):
        out.append(f"- {k}  ({len(v)}x, e.g. {' | '.join(v[:3])})")
    if dialogs:
        out.append("- pop-ups opened (and closed): " + ", ".join(f"{k!r} x{v}" for k, v in dialogs.most_common(6)))

text = "\n".join(out)
(A / "findings-raw.md").write_text(text + "\n", encoding="utf-8")
print(text)
