"""Visible 'trial' wording and /trial links in every HTML page of a build."""
import os, re, sys, json, html
root = sys.argv[1]
text_hits, link_hits, attr_hits = {}, {}, {}
pages = 0
for d, _, fs in os.walk(root):
    for f in fs:
        if not f.endswith('.html'): continue
        pages += 1
        p = os.path.join(d, f); rel = os.path.relpath(p, root).replace(os.sep, '/')
        src = open(p, encoding='utf-8').read()
        for m in re.finditer(r'href="([^"]*?/trial(?:[/?#"][^"]*)?)"', src):
            if re.search(r'/trial($|[/?#])', m.group(1)): link_hits.setdefault(rel, []).append(m.group(1))
        body = re.sub(r'<script\b.*?</script>|<style\b.*?</style>', ' ', src, flags=re.S | re.I)
        # visible-ish attributes a reader can meet
        for m in re.finditer(r'(?:aria-label|title|alt|placeholder|content)="([^"]*)"', body):
            if re.search(r'\btrial\b|пробн', m.group(1), re.I): attr_hits.setdefault(rel, []).append(html.unescape(m.group(1))[:120])
        text = html.unescape(re.sub(r'<[^>]+>', ' ', body))
        for m in re.finditer(r'[^.\n]{0,60}\b(trial|пробн\w*)\b[^.\n]{0,60}', text, re.I):
            text_hits.setdefault(rel, []).append(' '.join(m.group(0).split())[:160])
print(json.dumps({"pages": pages, "pagesWithTrialText": len(text_hits), "pagesWithTrialLinks": len(link_hits),
                  "pagesWithTrialAttr": len(attr_hits), "text": text_hits, "links": link_hits, "attrs": attr_hits}, ensure_ascii=False, indent=1))
