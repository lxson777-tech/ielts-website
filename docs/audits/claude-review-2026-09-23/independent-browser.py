import sys,os,json,time
from pathlib import Path
os.environ['IELTS_BASE_URL']='http://127.0.0.1:4354/ielts-website'
sys.path.insert(0,str(Path.cwd()/'tests'/'browser'))
import f20_account_journey as h
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf-8')
base=os.environ['IELTS_BASE_URL']
out=Path('C:/Users/Alex/Desktop/Projects/IELTS website/.tmp/claude-review-2026-09-23')
h.STANDIN_URL='http://127.0.0.1:8801'
def log(name,value):
    print(name+': '+json.dumps(value,ensure_ascii=False),flush=True)
def saved(page):
    return page.evaluate('''()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('ielts.learning.record')||k.startsWith('ielts.progress')||k==='ielts.testsession.v1'))''')
with sync_playwright() as p:
    browser=p.chromium.launch()
    context=browser.new_context(locale='en-US')
    page=context.new_page()
    page.goto(base+'/dashboard',wait_until='networkidle')
    a=h.ws_sign_up(page,'synthetic-independent-a@example.test','Synthetic-Pass-A1')
    log('studentA',a)
    assert a
    def tutor(route):
        req=route.request
        if req.method=='POST' and req.post_data_json.get('task')=='evaluate-practice':
            route.fulfill(status=200,content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body=json.dumps({'task':'evaluate-practice','judged':True,'live':True,'verdict':'met','observations':['SYNTHETIC fixture: a relevant paragraph.','SYNTHETIC fixture: clear supporting detail.'],'suggestions':['Try a fresh question.']}))
        else: route.continue_()
    page.route('**/tutor',tutor)
    page.goto(base+'/trainers/focused/writing-lexical-topic-vocabulary-check',wait_until='networkidle')
    page.locator('#written-answer').fill('SYNTHETIC: Investment in public education improves literacy and creates a skilled workforce. Accessible vocational training offers young people practical qualifications and supports sustainable economic development.')
    page.locator('.focused-check').click()
    page.wait_for_timeout(1800)
    log('writingStorage',saved(page))
    out.joinpath('writing-browser-storage.json').write_text(json.dumps(saved(page),indent=2),encoding='utf-8')
    page.screenshot(path=str(out/'writing-judged.png'),full_page=True)
    page.unroute('**/tutor',tutor)
    # Enter the timed drill through its real hub link, preserving normal navigation.
    page.goto(base+'/trainers/reading',wait_until='networkidle')
    drill='/ielts-website/trainers/reading/reading-full-006-drill-p2'
    link=page.locator('a[href="'+drill+'"]')
    log('drillLinks',link.count())
    assert link.count()
    link.first.click()
    page.wait_for_timeout(1500)
    h.start_drill_if_needed(page)
    choices=page.locator('select')
    log('selects',choices.count())
    assert choices.count()
    choices.first.select_option(index=1)
    page.wait_for_timeout(500)
    original=page.evaluate("()=>JSON.parse(localStorage.getItem('ielts.testsession.v1'))")
    log('AsUnfinishedSession',original)
    assert original['answers']
    page.goto(base+'/dashboard',wait_until='networkidle')
    h.ws_sign_out(page)
    b=h.ws_sign_up(page,'synthetic-independent-b@example.test','Synthetic-Pass-B1')
    log('studentB',b)
    assert b and b!=a
    page.goto(base+'/trainers/reading',wait_until='networkidle')
    page.locator('a[href="'+drill+'"]').first.click()
    page.wait_for_timeout(2000)
    log('BsRestoredAnswer',page.locator('select').first.input_value())
    page.screenshot(path=str(out/'b-resumes-a-test.png'),full_page=True)
    h.submit_and_confirm(page)
    page.wait_for_timeout(2200)
    log('afterBSubmits',saved(page))
    page.goto(base+'/dashboard',wait_until='networkidle')
    page.wait_for_timeout(2200)
    remote=h.store_snapshot(b)
    log('BsRemoteData',remote)
    out.joinpath('unfinished-test-proof.json').write_text(json.dumps({'a':a,'b':b,'originalSession':original,'browserAfter':saved(page),'remoteB':remote},indent=2),encoding='utf-8')
    browser.close()
