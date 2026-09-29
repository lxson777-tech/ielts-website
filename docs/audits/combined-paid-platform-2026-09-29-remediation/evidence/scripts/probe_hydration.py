"""Which pages/languages/states raise a React hydration error (#418)?"""
import sys, json
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding="utf-8")
import journey_c_paying as C
R = C.R
out = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for base, name in (("http://localhost:4492/ielts-website", "4492-build"), ("http://localhost:4441/ielts-website", "4441-dev")):
        R.base = base; R.standin_url = "http://127.0.0.1:8492" if "4492" in base else "http://127.0.0.1:8841"
        for lang in ("en", "ru"):
            ctx, page = R.context(b, lang, 1440, 900)
            errs = []
            page.on("pageerror", lambda e: errs.append(str(e)[:400]))
            page.on("console", lambda m: errs.append("console: " + m.text[:600]) if m.type == "error" and "ydrat" in m.text else None)
            def visit(state):
                for path in ("/trial", "/plans", "/dashboard", "/tests", "/account", "/writing/models"):
                    errs.clear(); R.goto(page, path, 3500)
                    out.append({"site": name, "lang": lang, "state": state, "path": path, "errors": list(errs)})
            visit("signed-out")
            em = f"verify-hyd-{name}-{lang}-{R.stamp}@example.test"
            C.start_trial(page, em); visit("trial")
            if name == "4492-build":
                R.goto(page, "/plans", 3000); C.buy(page, "Купить один месяц" if lang == "ru" else "Buy one month", "pay"); page.wait_for_timeout(4000); visit("paid")
            ctx.close()
    b.close()
bad = [o for o in out if o["errors"]]
print(json.dumps([{k: (v if k != "errors" else [e[:300] for e in v][:2]) for k, v in o.items()} for o in bad], indent=1, ensure_ascii=False))
print(len(bad), "of", len(out), "page visits had a hydration error")
open(r"C:/Users/Alex/Desktop/Projects/IELTS website/.claude/worktrees/musing-mcclintock-862665/docs/audits/combined-paid-platform-2026-09-29-remediation/evidence/logs/hydration-probe.json", "w", encoding="utf-8").write(json.dumps(out, indent=1, ensure_ascii=False))
