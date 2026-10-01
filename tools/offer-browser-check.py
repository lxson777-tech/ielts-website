import sys,json,uuid
sys.stdout.reconfigure(encoding='utf-8',errors='replace')
from playwright.sync_api import sync_playwright
from pathlib import Path
out=Path(__file__).resolve().parents[1]/'docs'/'paid-access'/'offer-proof'
out.mkdir(parents=True,exist_ok=True)
suffix=uuid.uuid4().hex[:8]
with sync_playwright() as p:
 b=p.chromium.launch(args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream'])
 context=b.new_context(viewport={'width':1440,'height':900},locale='en-US',permissions=['microphone'])
 session=context.request.post('http://127.0.0.1:8879/auth/v1/signup',data={'email':f'offer-review-{suffix}@example.test','password':'LocalReviewOnly123!'}).json()
 profile=context.request.post('http://127.0.0.1:8879/rest/v1/student_profiles',headers={'Authorization':'Bearer '+session['access_token'],'apikey':'local-anon-key'},data={'user_id':session['user']['id'],'first_name':'Offer','last_name':'Review','date_of_birth':'2000-01-01','phone':'+77010000000','city':'Almaty','occupation':'Synthetic test account','source':'other','parent_name':None,'parent_phone':None,'parent_consent_at':None,'updated_at':'2026-09-30T12:00:00Z'})
 assert profile.ok or profile.status==409,profile.text()
 context.add_init_script('localStorage.setItem("ielts.locale.v1","en");localStorage.setItem("sb-127-auth-token",'+json.dumps(json.dumps(session))+');')
 page=context.new_page()
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m: print('CONSOLE',m.text[:600],flush=True) if m.type=='error' else None)
 page.on('requestfailed',lambda r:print('FAILED',r.url.split('?')[0],r.failure,flush=True))
 page.goto('http://127.0.0.1:4479/ielts-website/plans',wait_until='domcontentloaded')
 page.get_by_role('button',name='Buy one month',exact=True).wait_for(timeout=60000)
 try: page.wait_for_function('()=>!document.querySelector(".access-buy")?.disabled',timeout=30000)
 except:
  print('STUCK',page.url,page.locator('main').inner_text(),errors,flush=True)
  raise
 print('READY',page.url,page.locator('main').inner_text()[:2200],flush=True)
 assert '₸12,990' in page.locator('main').inner_text()
 assert page.get_by_role('heading',name='Three months',exact=True).count()==0
 page.screenshot(path=str(out/'plans-desktop.png'),full_page=True)
 page.get_by_role('button',name='Buy one month',exact=True).click()
 page.wait_for_url('**/__pay/**',timeout=30000)
 print('CHECKOUT',page.locator('body').inner_text()[:1700],flush=True)
 page.get_by_role('button',name='Pay (SIMULATED)',exact=True).click()
 page.wait_for_url('**/ielts-website/**',timeout=30000)
 page.goto('http://127.0.0.1:4479/ielts-website/plans',wait_until='networkidle')
 page.get_by_text('Assessments remaining',exact=True).wait_for()
 assert 'Writing: 12/12' in page.locator('main').inner_text()
 assert 'Speaking: 6/6' in page.locator('main').inner_text()
 print('PAID BALANCE confirmed 12/6/2',flush=True)
 page.set_viewport_size({'width':390,'height':844})
 page.screenshot(path=str(out/'plans-phone-en.png'),full_page=True)
 assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
 # Change the init script language by using a fresh context for Russian.
 ru=b.new_context(viewport={'width':390,'height':844},locale='ru-RU')
 ru.add_init_script('localStorage.setItem("ielts.locale.v1","ru");localStorage.setItem("sb-127-auth-token",'+json.dumps(json.dumps(session))+');')
 rp=ru.new_page();rp.goto('http://127.0.0.1:4479/ielts-website/plans',wait_until='networkidle')
 rp.get_by_text('Осталось проверок',exact=True).wait_for()
 assert '12' in rp.locator('main').inner_text() and '990' in rp.locator('main').inner_text()
 assert 'За каждые 30 дней' in rp.locator('main').inner_text()
 assert rp.evaluate('document.documentElement.scrollWidth <= innerWidth')
 rp.screenshot(path=str(out/'plans-phone-ru.png'),full_page=True)
 print('RU phone layout and translated offer passed',flush=True)
 # A separate synthetic trial chooses recorded Speaking.
 trial=context.request.post('http://127.0.0.1:8879/auth/v1/signup',data={'email':f'offer-trial-{suffix}@example.test','password':'LocalReviewOnly123!'}).json()
 th={'Authorization':'Bearer '+trial['access_token'],'apikey':'local-anon-key'}
 context.request.post('http://127.0.0.1:8879/rest/v1/student_profiles',headers=th,data={'user_id':trial['user']['id'],'first_name':'Trial','last_name':'Review','date_of_birth':'2000-01-01','phone':'+77010000000','city':'Almaty','occupation':'Synthetic test account','source':'other','parent_name':None,'parent_phone':None,'parent_consent_at':None,'updated_at':'2026-09-30T12:00:00Z'})
 context.request.post('http://127.0.0.1:8879/rest/v1/rpc/trial_start',headers=th,data={})
 tc=b.new_context(viewport={'width':390,'height':844},locale='en-US',permissions=['microphone'])
 tc.add_init_script('localStorage.setItem("ielts.locale.v1","en");localStorage.setItem("sb-127-auth-token",'+json.dumps(json.dumps(trial))+');')
 tp=tc.new_page();tp.on('pageerror',lambda e:errors.append(str(e)))
 tp.goto('http://127.0.0.1:4479/ielts-website/speaking/recorded',wait_until='networkidle')
 tp.get_by_role('button',name='Start Speaking',exact=True).wait_for()
 tp.screenshot(path=str(out/'trial-recorded-phone.png'),full_page=True)
 tp.get_by_role('button',name='Start Speaking',exact=True).click()
 tp.get_by_role('button',name='Start answering',exact=True).wait_for()
 print('RECORDED TRIAL starts with question:',tp.locator('main').inner_text()[:900],flush=True)
 for index in range(4):
  tp.get_by_role('button',name='Start answering',exact=True).click()
  tp.get_by_role('button',name='Stop answering',exact=True).wait_for()
  tp.wait_for_timeout(2200) # Produce real encoded audio from Chromium's synthetic microphone.
  if index==3:
   with tp.expect_response(lambda r:':8879/grade-speaking' in r.url and r.request.method=='POST',timeout=30000) as response:
    tp.get_by_role('button',name='Stop answering',exact=True).click()
   result=response.value
   assert result.status==200,result.text()
  else:tp.get_by_role('button',name='Stop answering',exact=True).click()
 status=context.request.post('http://127.0.0.1:8879/rest/v1/rpc/trial_status',headers=th,data={}).json()
 assert status['assessments']['trialUsed']==1,status
 assert status['sections']['speaking']['test']['status']=='settled',status
 tp.screenshot(path=str(out/'recorded-simulated-result.png'),full_page=True)
 tp.goto('http://127.0.0.1:4479/ielts-website/writing/checker',wait_until='networkidle')
 print('WRITING AFTER SPEAKING',tp.locator('main').inner_text()[:1100],flush=True)
 assert 'used' in tp.locator('main').inner_text().lower()
 print('Recorded audio encoded, real Worker returned simulated feedback, shared trial allowance used',flush=True)
 print('ERRORS',errors,flush=True)
 assert not errors
 b.close()
