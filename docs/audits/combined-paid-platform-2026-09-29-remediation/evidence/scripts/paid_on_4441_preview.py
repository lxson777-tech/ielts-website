"""Short paid pass on Alex's review server 4441/8841, to show what a paying student sees there
(its stand-in serves a gated-content folder built before the paid packs existed)."""
import os, sys
os.environ["J_BASE"] = "http://localhost:4441/ielts-website"; os.environ["J_STANDIN"] = "http://127.0.0.1:8841"; os.environ["J_NAME"] = "journey-c-on-4441-production-preview"
from playwright.sync_api import sync_playwright
import journey_c_paying as C
with sync_playwright() as p:
    b = p.chromium.launch()
    try:
        C.light_flow(b, "en", 1440, 900)
    except Exception as e:
        C.R.check("en-1440", "completed", False, repr(e)[:300])
    b.close()
C.R.check("en-1440", "pack requests observed after buying (count; 404s expected on a stale gated-content folder)", True, len(C.R.pack_requests.get("paid-en-1440", [])))
C.R.save()
