"""V1: every lesson page's raw HTML, as a signed-out visitor receives it from the
gated review server (no JavaScript run): it must carry the gated marker and no
sentence of the lesson body, English or Russian. Independent of the build-time
leak audit: phrases are taken here, straight from src/content/lesson-bodies."""
import html, json, os, re, sys, urllib.request
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = Path(sys.argv[1]); DIST = Path(sys.argv[2]); BASE = sys.argv[3]; OUT = Path(sys.argv[4])
OUT.mkdir(parents=True, exist_ok=True)
def phrases(src, n=6):
    src = re.sub(r"<script\b.*?</script>|<style\b.*?</style>", " ", src, flags=re.S)
    text = html.unescape(re.sub(r"<[^>]+>", "\n", src))
    runs = []
    for line in text.split("\n"):
        line = " ".join(line.split())
        words = re.findall(r"[A-Za-zА-Яа-яЁё0-9']+", line)
        if len(words) >= 9: runs.append(" ".join(words[:9]))
    runs.sort(key=len, reverse=True)
    return runs[:n]
def plain(t):
    t = re.sub(r"<script\b.*?</script>", lambda m: m.group(0), t, flags=re.S)
    t = html.unescape(re.sub(r"<[^>]+>", " ", t))
    return " ".join(re.findall(r"[A-Za-zА-Яа-яЁё0-9']+", t))
rows = []
for page in sorted((DIST / "lessons").rglob("*.html")):
    rel = page.relative_to(DIST).as_posix()[:-5]
    raw = urllib.request.urlopen(BASE + "/" + rel).read().decode("utf-8")
    m = re.search(r'data-lesson-body="([^"]+)"', raw)
    if not m:
        rows.append({"route": "/" + rel, "slug": None, "note": "no lesson body element (redirect or hub page)",
                     "redirect": bool(re.search(r'http-equiv="refresh"', raw))}); continue
    slug = m.group(1)
    hay = plain(raw)
    found = {}
    for lang, path in (("en", ROOT / "src/content/lesson-bodies" / f"{slug}.html"), ("ru", ROOT / "src/content/lesson-bodies/ru" / f"{slug}.html")):
        if not path.exists(): found[lang] = "no source file"; continue
        ps = phrases(path.read_text(encoding="utf-8"))
        found[lang] = [p for p in ps if p in hay]
        found[lang + "_checked"] = len(ps)
    rows.append({"route": "/" + rel, "slug": slug, "gatedMarker": "data-lesson-gated" in raw, "inviteInHtml": "data-lesson-invite" in raw or "lesson-invite" in raw, **found})
bodies = [r for r in rows if r.get("slug")]
bad = [r for r in bodies if not r["gatedMarker"] or r.get("en") or (isinstance(r.get("ru"), list) and r.get("ru"))]
summary = {"pages": len(rows), "lessonPages": len(bodies), "nonLessonPages": len(rows) - len(bodies),
           "phrasesChecked": sum(r.get("en_checked", 0) + r.get("ru_checked", 0) for r in bodies),
           "leakingPages": len(bad), "bad": bad}
(OUT / "results.json").write_text(json.dumps({"summary": summary, "rows": rows}, ensure_ascii=False, indent=1), encoding="utf-8")
print(json.dumps(summary, ensure_ascii=False, indent=1))
for r in rows:
    if not r.get("slug"): print("NOTE", r["route"], r["note"], "redirect" if r["redirect"] else "")
