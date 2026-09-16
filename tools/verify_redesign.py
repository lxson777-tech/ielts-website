import sys, json
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
out=Path(__file__).resolve().parents[1]/'artifacts/redesign'
out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch()
    page=browser.new_page(viewport={'width':1440,'height':1000})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('requestfailed',lambda r:errors.append(r.url+': '+str(r.failure)))
    base='http://127.0.0.1:4331/ielts-website'
    def capture(name):
        page.evaluate('document.fonts.ready')
        page.wait_for_timeout(700) # finish measured navigation and page entrance
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), name+' overflows'
        page.screenshot(path=str(out/(name+'.png')),full_page=False)
    page.goto(base+'/dashboard')
    page.locator('.plan-feature').wait_for(timeout=30000)
    capture('dashboard-desktop')
    nav=page.locator('.ws-tabs')
    nav.get_by_role('link',name='Practice',exact=True).click()
    page.locator('.practice-grid').wait_for()
    assert nav.get_by_role('link',name='Practice',exact=True).get_attribute('aria-current')=='page'
    capture('practice-desktop')
    page.locator('.mode-help summary').click()
    assert page.get_by_text('Hints, model phrases and feedback on every attempt',exact=True).is_visible()
    page.locator('.mode-help summary').click()
    page.get_by_role('link',name='Start writing',exact=False).first.click()
    page.locator('.writing-choice-card').first.wait_for()
    capture('writing-desktop')
    page.locator('.writing-choice-card').nth(1).click()
    page.locator('textarea').first.wait_for()
    page.locator('textarea').first.fill('Local design verification. No grading requested.')
    assert page.locator('textarea').first.input_value().startswith('Local design verification')
    capture('writing-active-desktop')
    page.goto(base+'/lessons/reading/paraphrase')
    page.locator('.lesson-word-button').wait_for()
    page.wait_for_function("document.querySelector('.lesson-word-button').textContent.length > 0")
    capture('lesson-desktop')
    page.locator('.lesson-word-button').click()
    assert page.locator('#lesson-hero-word-panel').is_visible()
    page.locator('#lesson-complete-btn').click()
    assert page.locator('#lesson-complete-btn').get_attribute('data-done') is not None
    page.locator('#lesson-complete-btn').click()
    page.goto(base+'/start?view=sections')
    page.get_by_role('button',name='By section',exact=True).wait_for()
    capture('course-desktop')
    page.goto(base+'/review')
    capture('vocabulary-desktop')
    page.goto(base+'/tests')
    page.locator('[data-test-rotation]').first.wait_for()
    capture('tests-desktop')
    # Visit again through the capsule: catches missing Astro navigation wiring.
    nav.get_by_role('link',name='Practice',exact=True).click()
    page.locator('.practice-grid').wait_for()
    nav.get_by_role('link',name='Tests',exact=True).click()
    page.locator('[data-test-rotation]').first.wait_for()
    page.locator('[data-test-rotation]').first.click()
    page.wait_for_url('**/tests/reading-*')
    capture('test-player-desktop')
    page.set_viewport_size({'width':390,'height':844})
    for path,name,selector in [('/dashboard','dashboard-mobile','.plan-feature'),('/trainers','practice-mobile','.practice-grid'),('/tests','tests-mobile','.exam-grid'),('/trainers/writing','writing-mobile','.writing-choice-card'),('/lessons/reading/paraphrase','lesson-mobile','.lesson-word-button'),('/review','vocabulary-mobile','.vocab-review-space')]:
        page.goto(base+path)
        page.locator(selector).first.wait_for()
        capture(name)
    page.locator('.ws-tabbar').get_by_role('link',name='Today',exact=True).click()
    page.locator('.plan-feature').wait_for()
    assert page.locator('.ws-tabbar').get_by_role('link',name='Today',exact=True).get_attribute('aria-current')=='page'
    print('Verified navigation, writing input, lesson quiz, completion toggle, test rotation and mobile layout.')
    print('ERRORS',json.dumps(errors))
    browser.close()

