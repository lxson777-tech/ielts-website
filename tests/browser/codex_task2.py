import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(__file__).resolve().parents[2]/'docs'/'personal-learning'/'evidence'/'final'
out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(locale='en-US')
    page.goto('http://127.0.0.1:4340/ielts-website/trainers/focused/writing-lexical-topic-vocabulary-check',wait_until='networkidle')
    page.locator('.written-task textarea').fill('Investment in public education can improve literacy and create a more skilled workforce. When governments fund accessible vocational training, young people can gain practical qualifications and contribute to economic development.')
    page.locator('.written-actions .focused-check').click()
    page.wait_for_timeout(1500)
    data=page.evaluate('''() => Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('ielts.learning.record')))''')
    out.joinpath('after-codex-task2-browser-storage.json').write_text(json.dumps(data,indent=2),encoding='utf-8')
    events=[]
    for value in data.values():
        record=json.loads(value)
        events.extend([e for e in record.get('events',[]) if e.get('activityId')=='focus:writing-lexical-topic-vocabulary-check'])
    print(json.dumps(events,indent=2))
    assert events, 'Expected a saved writing attempt'
    assert events[-1]['taskScope']['task']=='task1'
    page.screenshot(path=str(out/'after-codex-task2-browser.png'),full_page=True)
    browser.close()
