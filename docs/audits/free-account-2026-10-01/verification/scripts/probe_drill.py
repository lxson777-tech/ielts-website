import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.path.insert(0, str(Path(__file__).parent))
from vhelpers import *  # noqa

OUT = Path(__file__).parent / "probe"
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = new_context(b)
    page = ctx.new_page()
    sign_up(page, f"probe-drill-{STAMP}@example.test")
    page.wait_for_url("**/dashboard**", timeout=40000)
    settle(page)
    print("menu buttons", [x.evaluate("e => e.outerHTML.slice(0,160)") for x in page.locator("button[aria-haspopup]").all()])
    for route in ("/trainers/reading", "/trainers/listening"):
        visit(page, route)
        page.wait_for_timeout(3000)
        print("==", route, page.url, "locked:", page.locator("[data-paid-locked]").count(), "gate:", page.evaluate("document.body.dataset.trialGate"))
        print(page.locator("main").inner_text()[:700].replace("\n", " | "))
        links = page.locator("main a[href*='/trainers/']").all()
        print("drill links", len(links), [l.get_attribute("href") for l in links[:4]])
        page.screenshot(path=str(OUT / f"free{route.replace('/', '-')}.png"), full_page=False)
    visit(page, "/trainers/reading")
    page.wait_for_timeout(1500)
    first = page.locator("main a[href*='/trainers/reading/']").first
    if first.count():
        href = first.get_attribute("href")
        visit(page, href.replace("/ielts-website", ""))
        page.wait_for_timeout(3000)
        print("== drill page", page.url, "locked:", page.locator("[data-paid-locked]").count())
        print(page.locator("main").inner_text()[:500].replace("\n", " | "))
        page.screenshot(path=str(OUT / "free-drill-page.png"))
    b.close()
