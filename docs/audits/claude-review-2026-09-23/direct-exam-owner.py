import sys,os,json
from pathlib import Path
os.environ['IELTS_BASE_URL']='http://127.0.0.1:4354/ielts-website'
sys.path.insert(0,str(Path.cwd()/'tests'/'browser'))
import f20_account_journey as h
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf-8')
base=os.environ['IELTS_BASE_URL']
out=Path('C:/Users/Alex/Desktop/Projects/IELTS website/.tmp/claude-review-2026-09-23')
with sync_playwright() as p:
    browser=p.chromium.launch()
    page=browser.new_page(locale='en-US')
    page.goto(base+'/dashboard',wait_until='networkidle')
    uid=h.ws_sign_up(page,'synthetic-direct-exam-retry@example.test','Synthetic-Pass-C1')
    assert uid
    # A normal hard navigation, as with a saved link or a refresh during a test.
    page.goto(base+'/trainers/reading/reading-full-006-drill-p2',wait_until='networkidle')
    h.start_drill_if_needed(page)
    page.locator('select').first.select_option(index=1)
    h.submit_and_confirm(page)
    page.wait_for_timeout(1000)
    state=page.evaluate('''() => {
        const entries=Object.entries(localStorage);
        const auth=entries.filter(([k])=>k.startsWith('sb-')&&k.endsWith('-auth-token')).map(([k,v])=>({key:k,user:JSON.parse(v).user?.id}));
        const records=entries.filter(([k])=>k.startsWith('ielts.learning.record')).map(([k,v])=>({key:k,events:JSON.parse(v).events.map(e=>({activity:e.activityId,answer:e.items?.[0]?.firstAnswer}))}));
        return {auth,records};
    }''')
    print(json.dumps({'signedInStudent':uid,'afterDirectEntry':state},indent=2),flush=True)
    out.joinpath('direct-exam-owner.json').write_text(json.dumps({'signedInStudent':uid,'afterDirectEntry':state},indent=2),encoding='utf-8')
    browser.close()
