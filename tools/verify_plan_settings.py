import json, os, sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = os.environ.get('IELTS_VERIFY_BASE', 'http://127.0.0.1:4331/ielts-website')
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(base + '/dashboard')
    page.locator('.plan-today-strip-change').wait_for()
    original = page.evaluate('''() => {
      const plan = JSON.parse(localStorage.getItem('ielts.studyplan.v1'));
      plan.targetBand = '8.0'; plan.testDate = '2027-02-15'; plan.dailyMinutes = 40;
      localStorage.setItem('ielts.studyplan.v1', JSON.stringify(plan));
      localStorage.setItem('ielts.course.view', 'sections');
      return plan;
    }''')
    page.reload()
    page.locator('.plan-today-strip-change').click()
    page.wait_for_url('**/plan-settings')
    band = page.locator('#target-band-inline')
    band.wait_for()
    assert band.input_value() == '8.0'
    assert page.locator('#test-date-inline').input_value() == '2027-02-15'
    assert page.locator('#daily-minutes-inline').input_value() == '40'
    assert page.locator('body.workspace-v2').count() == 1
    band.select_option('7.5')
    page.locator('#test-date-inline').fill('2027-03-20')
    page.get_by_role('button', name='Save', exact=True).click()
    page.get_by_role('status').filter(has_text='Your plan settings are saved.').wait_for()
    stored = page.evaluate("JSON.parse(localStorage.getItem('ielts.studyplan.v1'))")
    assert stored['targetBand'] == '7.5' and stored['testDate'] == '2027-03-20'
    assert stored['startDate'] == original['startDate']
    assert stored['doneKeys'] == original['doneKeys']
    page.get_by_role('link', name='Back to your dashboard', exact=True).click()
    page.locator('.plan-today-strip').filter(has_text='Band 7.5').wait_for()
    page.locator('.plan-today-strip-change').click()
    page.locator('#target-band-inline').wait_for()
    assert page.locator('#target-band-inline').input_value() == '7.5'
    assert page.locator('#test-date-inline').input_value() == '2027-03-20'
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path='artifacts/redesign/plan-settings-mobile.png', full_page=True)
    assert not errors, errors
    print(json.dumps({'base': base, 'result': 'passed', 'checks': [
        'Signed-out Change opens settings despite saved section view',
        'Existing values prefilled', 'Date and target persist after saving',
        'Dashboard reflects new target', 'Plan start and completion retained',
        'Mobile layout and no browser errors']}))
    browser.close()
