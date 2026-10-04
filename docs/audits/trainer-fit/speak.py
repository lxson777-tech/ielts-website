import sys
from playwright.sync_api import sync_playwright
OUT=sys.argv[1]
with sync_playwright() as p:
    br = p.chromium.launch(args=["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream"])
    for vw,vh,tag in [(1440,900,"desk"),(1280,720,"laptop")]:
        ctx = br.new_context(viewport={"width":vw,"height":vh}, locale="en-US", permissions=["microphone"]); pg = ctx.new_page(); errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto("http://localhost:4625/ielts-website/trainers/speaking", wait_until="networkidle"); pg.wait_for_timeout(4000)
        pg.get_by_role("button", name="Start Part 2").click(); pg.wait_for_timeout(1500)
        m = pg.evaluate("""() => { const r=document.querySelector('.trainer-coach-rail'); if(!r) return null; const b=r.getBoundingClientRect(); const tp=r.querySelector('.coach-tabpanel'); return {top:Math.round(b.top), h:Math.round(b.height), vh: innerHeight, inner: tp?[tp.scrollHeight,tp.clientHeight]:null, pageH: document.documentElement.scrollHeight}; }""")
        ok = m and m["top"] + m["h"] <= m["vh"] + 1 or (m and m["h"] <= m["vh"] - 104)
        print("PASS" if ok and not errs else "FAIL", tag, "speaking coach fits on one screen", m, errs)
        pg.screenshot(path=f"{OUT}/08-speaking-{tag}.png")
        ctx.close()
    br.close()
