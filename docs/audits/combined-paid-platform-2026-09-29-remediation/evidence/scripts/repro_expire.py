"""Reproduce: after POST /__pay/expire, does a previously paid lesson lock again in the same browser?"""
import sys, json
from playwright.sync_api import sync_playwright
from vh import Run, body, wait_for, fill_signin
import journey_c_paying as C
R = C.R
R.name = "repro-expire"; R.out = C.R.out.parent / "repro-expire"; R.out.mkdir(exist_ok=True); R.results.clear()
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx, page = R.context(b, "en", 1440, 900)
    email = f"verify-repro-exp-{R.stamp}@example.test"
    C.start_trial(page, email)
    R.goto(page, "/plans", 3000); C.buy(page, "Buy one month", "pay"); C.wait_text(page, "You’re in.", 40000)
    R.goto(page, "/lessons/reading/tfng", 5000)
    R.check("en-1440", "paid: lesson open", not any(x in body(page) for x in C.LOCKED)); R.shot(page, "01-paid-lesson-open")
    R.standin("/__pay/expire", {"email": email})
    print("state grants:", [g for g in C.grants_of(email)])
    R.goto(page, "/lessons/reading/tfng", 6000)
    t = body(page)
    R.check("en-1440", "same browser, straight after expiry: lesson locked", any(x in t for x in C.LOCKED), t[:300]); R.shot(page, "02-same-browser-after-expire")
    print("door status:", C.token_status(page, "/content/lesson/reading-tfng"))
    R.goto(page, "/account", 5000); R.shot(page, "03-account", True)
    R.goto(page, "/lessons/reading/tfng", 8000)
    t = body(page)
    R.check("en-1440", "same browser, after visiting /account: lesson locked", any(x in t for x in C.LOCKED), t[:300]); R.shot(page, "04-after-account")
    R.goto(page, "/dashboard", 5000); R.shot(page, "05-dashboard")
    R.check("en-1440", "Today is the trial's/ended view, not full Today", page.locator(".dash-welcome").count() == 0)
    ls = page.evaluate("() => Object.fromEntries(Object.keys(localStorage).filter(k => /trial|access/i.test(k)).map(k => [k, localStorage.getItem(k).slice(0,300)]))")
    print(json.dumps(ls, indent=1))
    ctx2, p2 = R.context(b, "en", 1440, 900)
    C.sign_in(p2, email, "/lessons/reading/tfng"); p2.wait_for_timeout(6000)
    t = body(p2)
    R.check("en-1440", "fresh browser after expiry: lesson locked", any(x in t for x in C.LOCKED), t[:300]); R.shot(p2, "06-fresh-browser-after-expire")
    b.close()
R.save()
