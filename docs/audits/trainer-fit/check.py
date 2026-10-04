import json, sys
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]; B = "http://localhost:4442/ielts-website"
res = []
def check(name, ok, detail=""):
    res.append({"check": name, "ok": bool(ok), "detail": str(detail)}); print("PASS" if ok else "FAIL", name, detail)
ESSAY = " ".join(["The pie chart shows that full-time undergraduates were the largest group of library users, at 44 per cent, while academic staff made up only 7 per cent."] * 22)
M = """() => { const q=s=>document.querySelector(s); const rb=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {top:Math.round(r.top),bottom:Math.round(r.bottom),h:Math.round(r.height)}};
 const tp=q('.trainer-coach-rail .coach-tabpanel');
 return {pageH:document.documentElement.scrollHeight, vh:innerHeight, scrollY:Math.round(scrollY), rail:rb(q('.trainer-coach-rail')), panelScroll: tp?[tp.scrollHeight,tp.clientHeight,Math.round(tp.scrollTop)]:null, submit:rb(q('.writing-submit-row')), ta:rb(q('.writing-editor textarea')), dock:rb(q('.ws-tabbar'))}; }"""
with sync_playwright() as p:
    br = p.chromium.launch(args=["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream"])
    # desktop
    ctx = br.new_context(viewport={"width":1440,"height":900}, locale="en-US"); pg = ctx.new_page(); errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(B+"/trainers/writing?task=pte-wt-132-task1", wait_until="networkidle"); pg.wait_for_timeout(900)
    m = pg.evaluate(M); print(m)
    check("desktop: coach is at most one screen tall", m["rail"]["h"] <= m["vh"] - 104, m["rail"])
    check("desktop: coach content scrolls inside the panel", m["panelScroll"][0] > m["panelScroll"][1], m["panelScroll"])
    check("desktop: page is much shorter than before (3575px)", m["pageH"] < 2000, m["pageH"])
    pg.screenshot(path=f"{OUT}/01-desktop-top.png")
    # wheel over the coach scrolls the coach, not the page
    box = pg.locator(".trainer-coach-rail .coach-tabpanel").bounding_box()
    pg.mouse.move(box["x"]+box["width"]/2, box["y"]+box["height"]/2); pg.mouse.wheel(0, 500); pg.wait_for_timeout(400)
    m2 = pg.evaluate(M)
    check("desktop: wheel over the coach scrolls the coach", m2["panelScroll"][2] > 0, m2["panelScroll"])
    pg.screenshot(path=f"{OUT}/02-desktop-coach-scrolled.png")
    # write a long essay
    pg.locator(".writing-editor textarea").click(); pg.locator(".writing-editor textarea").fill(ESSAY); pg.wait_for_timeout(300)
    pg.keyboard.press("End")
    pg.mouse.move(400, 500); pg.mouse.wheel(0, 700); pg.wait_for_timeout(500)
    m3 = pg.evaluate(M); print(m3)
    check("desktop: answer box grows with the essay (no inner scroll)", pg.evaluate("(()=>{const t=document.querySelector('.writing-editor textarea');return t.scrollHeight<=t.clientHeight+2})()"), m3["ta"])
    check("desktop: word count and Check stay on screen", 0 < m3["submit"]["bottom"] <= m3["vh"], m3["submit"])
    check("desktop: coach stays beside the work after scrolling", m3["rail"]["top"] == 104 and m3["scrollY"] > 300, m3["rail"])

    # typing at the end: the line being typed is never hidden under the pinned bar
    ta = pg.locator(".writing-editor textarea"); ta.focus(); pg.keyboard.press("Control+End")
    for i in range(4):
        pg.keyboard.type(" Another sentence about the table and the survey results."); pg.keyboard.press("Enter")
    pg.wait_for_timeout(300)
    c = pg.evaluate("""() => { const t=document.querySelector('.writing-editor textarea'); const r=t.getBoundingClientRect(); const cs=getComputedStyle(t); const lh=parseFloat(cs.lineHeight); const lastLineBottom = r.bottom - parseFloat(cs.paddingBottom); const s=document.querySelector('.writing-submit-row').getBoundingClientRect(); return {lastLineTop: Math.round(lastLineBottom - lh), lastLineBottom: Math.round(lastLineBottom), barTop: Math.round(s.top), vh: innerHeight}; }""")
    check("desktop: the line being typed stays above the pinned bar", c["lastLineBottom"] <= c["barTop"] + 18, c)
    pg.screenshot(path=f"{OUT}/03-desktop-writing-long.png")
    check("desktop: no page errors", not errs, errs); ctx.close()
    # phone
    ctx = br.new_context(viewport={"width":390,"height":844}, locale="en-US", is_mobile=True, has_touch=True, device_scale_factor=2); pg = ctx.new_page(); errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(B+"/trainers/writing?task=pte-wt-132-task1", wait_until="networkidle"); pg.wait_for_timeout(900)
    m = pg.evaluate(M); print(m)
    check("phone: Check bar does not float over the question", (m["submit"]["top"] >= m["vh"] or m["submit"]["top"] >= m["ta"]["top"]), (m["submit"], m["ta"]))
    pg.screenshot(path=f"{OUT}/04-phone-top.png")
    pg.locator(".writing-editor textarea").fill(ESSAY); pg.wait_for_timeout(300); pg.evaluate("scrollBy(0, 900)"); pg.wait_for_timeout(400)
    m = pg.evaluate(M)
    check("phone: Check bar stays above the bottom menu while writing", m["submit"]["bottom"] <= m["dock"]["top"] and m["submit"]["h"] < 90, (m["submit"], m["dock"]))
    check("phone: no sideways scrolling", pg.evaluate("document.documentElement.scrollWidth <= innerWidth"))

    # typing at the end: the line being typed is never hidden under the pinned bar
    ta = pg.locator(".writing-editor textarea"); ta.focus(); pg.keyboard.press("Control+End")
    for i in range(4):
        pg.keyboard.type(" Another sentence about the table and the survey results."); pg.keyboard.press("Enter")
    pg.wait_for_timeout(300)
    c = pg.evaluate("""() => { const t=document.querySelector('.writing-editor textarea'); const r=t.getBoundingClientRect(); const cs=getComputedStyle(t); const lh=parseFloat(cs.lineHeight); const lastLineBottom = r.bottom - parseFloat(cs.paddingBottom); const s=document.querySelector('.writing-submit-row').getBoundingClientRect(); return {lastLineTop: Math.round(lastLineBottom - lh), lastLineBottom: Math.round(lastLineBottom), barTop: Math.round(s.top), vh: innerHeight}; }""")
    check("phone: the line being typed stays above the pinned bar", c["lastLineBottom"] <= c["barTop"] + 18, c)
    pg.screenshot(path=f"{OUT}/05-phone-writing.png")
    pg.get_by_role("button", name="Help").click(); pg.wait_for_timeout(500)
    pg.screenshot(path=f"{OUT}/06-phone-help.png")
    check("phone: no page errors", not errs, errs); ctx.close()
    # speaking
    ctx = br.new_context(viewport={"width":1440,"height":900}, locale="en-US", permissions=["microphone"]); pg = ctx.new_page(); errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(B+"/trainers/speaking", wait_until="networkidle"); pg.wait_for_timeout(800)
    btns = pg.locator("main button").all_inner_texts(); print("speaking buttons:", btns[:15])
    pg.screenshot(path=f"{OUT}/07-speaking-choose.png")
    json.dump(res, open(f"{OUT}/results.json","w"), indent=1)
    ctx.close(); br.close()
print(sum(r["ok"] for r in res), "/", len(res))
