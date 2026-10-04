"""Ms. Taylor's interview stage in the design preview (4 October 2026).

Drives /speaking/examiner?preview=... on a local dev server (the open build,
no backend at all): no microphone, no session, no AI call, nothing paid. The
preview feeds synthetic audio levels, so every scene can be photographed.

    python docs/audits/ms-taylor/scripts/preview_shots.py [base-url]

Default base: http://127.0.0.1:4600/ielts-website. Screens land in
docs/audits/ms-taylor/screens/ as preview-<state>-<lang>-<width>.png, plus a
frame sequence of her mouth while she speaks (mouth/preview-<n>.png) and a JSON log
of the frames the stage showed.
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "screens"
OUT.mkdir(parents=True, exist_ok=True)
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4600/ielts-website"
SIZES = {"1440": (1440, 900), "390": (390, 844)}
STATES = ["connecting", "part1", "part2", "talk", "part3", "finishing"]
HYDRATED = """() => [...document.querySelectorAll('astro-island[ssr]')].length === 0"""
results = {}


def ctx(browser, lang, size, reduced=False):
    w, h = SIZES[size]
    phone = w < 720
    c = browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=2 if phone else 1,
                            is_mobile=phone, has_touch=phone, locale="ru-RU" if lang == "ru" else "en-GB",
                            reduced_motion="reduce" if reduced else "no-preference")
    c.add_init_script(f"try{{localStorage.setItem('ielts.locale.v1','{lang}')}}catch(e){{}}")
    return c


def open_state(page, state):
    page.goto(f"{BASE}/speaking/examiner?preview={state}", wait_until="domcontentloaded")
    page.wait_for_selector(".es-card", timeout=60000)
    try:
        page.wait_for_function(HYDRATED, timeout=30000)
    except Exception:  # noqa: BLE001
        pass
    page.wait_for_timeout(900)


def wait_frame(page, frames, timeout=12000):
    js = "(fs) => fs.includes(document.querySelector('.es-card')?.dataset.frame)"
    page.wait_for_function(js, arg=frames, timeout=timeout)


def wait_scene(page, scene, timeout=12000):
    js = "(s) => document.querySelector('.es-card')?.dataset.scene === s"
    page.wait_for_function(js, arg=scene, timeout=timeout)


def force_frame(page, frame):
    """Shows one frame by hand (the judgement shots only)."""
    page.evaluate("""(f) => { const card = document.querySelector('.es-card');
      card.querySelectorAll('.es-frame').forEach(img => { const on = img.src.includes('/' + f + '.webp');
        img.classList.toggle('is-on', on); img.classList.toggle('is-top', on); img.classList.add('no-fade'); }); }""", frame)


def fits(page):
    """Is everything the student needs inside the first screen, uncovered?"""
    return page.evaluate("""() => {
      const vh = innerHeight, vw = innerWidth;
      const card = document.querySelector('.es-card').getBoundingClientRect();
      const btns = [...document.querySelectorAll('.es-controls button')].map(b => b.getBoundingClientRect());
      const cap = document.querySelector('.es-caption, .es-note')?.getBoundingClientRect();
      const visible = (sel) => { const e = document.querySelector(sel); if (!e) return false; const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden'; };
      return {
        cardBottom: Math.round(card.bottom), viewport: vh,
        buttonsInView: btns.every(r => r.bottom <= vh && r.top >= 0),
        captionInView: !cap || cap.bottom <= vh,
        scrollable: document.documentElement.scrollHeight > vh + 2,
        horizontalOverflow: document.documentElement.scrollWidth > vw + 1,
        dockVisible: visible('.ws-tabbar'), mrEzVisible: visible('.mrez-launcher'),
        headingVisible: visible('.section-heading'),
        bodyFlags: { live: document.body.dataset.liveInterview || null, exam: document.body.dataset.examRunning || null },
      };
    }""")


with sync_playwright() as pw:
    browser = pw.chromium.launch()
    for lang in ("en", "ru"):
        for size in SIZES:
            c = ctx(browser, lang, size)
            page = c.new_page()
            for state in STATES:
                open_state(page, state)
                if state == "part1":
                    # her turn to speak, then the student's, then the pause
                    for want, name in ((["speak1", "speak2", "speak3"], "speaking"), ("your-turn", "your-turn"), ("pause", "pause")):
                        try:
                            if isinstance(want, str):
                                wait_scene(page, want)
                            else:
                                wait_frame(page, want)
                            # the 250 ms status poll catches up
                            page.wait_for_timeout(320 if name != "pause" else 60)
                        except Exception as e:  # noqa: BLE001
                            print("no", name, e)
                        p = OUT / f"preview-part1-{name}-{lang}-{size}.png"
                        page.screenshot(path=str(p))
                        results[f"part1-{name}-{lang}-{size}"] = {"frame": page.evaluate("document.querySelector('.es-card').dataset.frame"), **fits(page)}
                        print(p)
                    continue
                if state == "talk":
                    page.wait_for_timeout(2500)
                if state == "part3":
                    try:
                        wait_scene(page, "discussion")
                        page.wait_for_timeout(500)
                    except Exception as e:  # noqa: BLE001
                        print("no discussion", e)
                p = OUT / f"preview-{state}-{lang}-{size}.png"
                page.screenshot(path=str(p))
                results[f"{state}-{lang}-{size}"] = {"frame": page.evaluate("document.querySelector('.es-card').dataset.frame"), **fits(page)}
                print(p)
            c.close()

    # The glance judgement: the drawn `glance` against `listen`, in the card.
    for size in SIZES:
        c = ctx(browser, "en", size)
        page = c.new_page()
        open_state(page, "part1")
        wait_scene(page, "your-turn")
        page.wait_for_timeout(400)
        for f in ("glance", "listen"):
            force_frame(page, f)
            page.locator(".es-tile-her").screenshot(path=str(OUT / f"judgement-{f}-{size}.png"))
        c.close()

    # Her mouth moving: a sequence of frames while she speaks (desktop, English).
    c = ctx(browser, "en", "1440")
    page = c.new_page()
    open_state(page, "part1")
    wait_frame(page, ["speak1", "speak2", "speak3"])
    tile = page.locator(".es-tile-her")
    (OUT / "mouth").mkdir(exist_ok=True)
    seq = []
    for i in range(24):
        f = page.evaluate("document.querySelector('.es-card').dataset.frame")
        seq.append(f)
        tile.screenshot(path=str(OUT / "mouth" / f"preview-{i:02d}.png"))
        page.wait_for_timeout(60)
    results["mouth-sequence"] = seq
    # The frame log over one full preview cycle, sampled every animation frame.
    log = page.evaluate("""() => new Promise(res => { const out = []; const t0 = performance.now();
      const step = () => { const el = document.querySelector('.es-card'); out.push([Math.round(performance.now() - t0), el.dataset.frame, el.dataset.scene]);
        if (performance.now() - t0 < 10000) requestAnimationFrame(step); else res(out); }; requestAnimationFrame(step); })""")
    changes = [row for k, row in enumerate(log) if k == 0 or row[1] != log[k - 1][1]]
    gaps = [b[0] - a[0] for a, b in zip(changes, changes[1:])]
    results["frame-log"] = {"samples": len(log), "changes": len(changes), "min_gap_ms": min(gaps) if gaps else None,
                            "frames_seen": sorted({r[1] for r in log}), "scenes_seen": sorted({r[2] for r in log})}
    c.close()

    # Reduced motion: one open mouth while she speaks, no breathing.
    c = ctx(browser, "en", "1440", reduced=True)
    page = c.new_page()
    open_state(page, "part1")
    log = page.evaluate("""() => new Promise(res => { const out = []; const t0 = performance.now();
      const step = () => { const el = document.querySelector('.es-card'); out.push([el.dataset.frame, el.dataset.scene, el.dataset.breathe, getComputedStyle(el.querySelector('.es-breathe')).animationName]);
        if (performance.now() - t0 < 10000) requestAnimationFrame(step); else res(out); }; requestAnimationFrame(step); })""")
    results["reduced-motion"] = {
        "frames_while_speaking": sorted({r[0] for r in log if r[1] == "speaking"}),
        "frames_seen": sorted({r[0] for r in log}),
        "breathing_animation": sorted({r[3] for r in log}),
    }
    page.screenshot(path=str(OUT / "preview-part1-reduced-motion-en-1440.png"))
    c.close()
    browser.close()

(OUT / "preview-results.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
print(json.dumps({k: v for k, v in results.items() if k in ("frame-log", "reduced-motion", "mouth-sequence")}, indent=2))
