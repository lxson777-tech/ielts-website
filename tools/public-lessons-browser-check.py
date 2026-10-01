import sys,json,uuid
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf-8',errors='replace')
SITE='http://127.0.0.1:4479/ielts-website'
API='http://127.0.0.1:8879'
out=Path(__file__).resolve().parents[1]/'docs/paid-access/public-lessons-proof'
out.mkdir(parents=True,exist_ok=True)
errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch()
 def context(locale='en',session=None):
  c=browser.new_context(viewport={'width':390,'height':844})
  script='localStorage.setItem("ielts.locale.v1",'+json.dumps(locale)+');'
  if session:script+='localStorage.setItem("sb-127-auth-token",'+json.dumps(json.dumps(session))+');'
  # about:blank and payment documents must not receive our site-session seed.
  c.add_init_script("if(location.origin==='http://127.0.0.1:4479'){"+script+"}")
  c.on('page',lambda page:page.on('pageerror',lambda err:errors.append(str(err))))
  return c
 visitor=context();page=visitor.new_page()
 for route in ['/learn','/lessons/reading/tfng','/lessons/listening/part1','/lessons/writing/opinion','/lessons/vocabulary/family']:
  response=page.goto(SITE+route,wait_until='networkidle')
  assert response.status==200,(route,response.status)
  if route!='/learn':
   assert len(page.locator('[data-lesson-body]').inner_text())>400,route
   assert page.locator('.lesson-block-help button').count()==0,route
   assert page.get_by_text('Lessons are free. Put them into practice.',exact=True).is_visible(),route
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),route
 print('Signed-out library and Reading, Listening, Writing, Vocabulary lessons open',flush=True)
 page.goto(SITE+'/lessons/writing/opinion',wait_until='networkidle')
 page.get_by_role('button',name='Show the Band 8 answer',exact=True).click()
 assert page.locator('.lesson-model-prompt').is_visible()
 page.screenshot(path=str(out/'public-writing-phone.png'),full_page=True)
 page.goto(SITE+'/lessons/writing/charts',wait_until='networkidle')
 page.locator('.lesson-model-prompt img').scroll_into_view_if_needed()
 page.wait_for_function('()=>{const img=document.querySelector(".lesson-model-prompt img");return img.complete && img.naturalWidth>0}')
 print('Public worked example opens and selected Task 1 chart loads',flush=True)
 page.goto(SITE+'/lessons/reading/tfng',wait_until='networkidle')
 assert page.get_by_text('Sign in to continue your trial',exact=True).is_visible()
 assert page.locator('.pq-unit').count()==0
 page.screenshot(path=str(out/'public-reading-phone.png'),full_page=True)
 for route in ['/content/practice/practice-reading-tfng','/content/test/reading-full-002','/content/pack/model-answers']:
  assert visitor.request.get(API+route).status==401,route
 assert visitor.request.post(API+'/grade-essay',data={}).status in [400,401]
 print('Anonymous direct practice, full papers, model bank and grading refused',flush=True)
 ru=context('ru');rp=ru.new_page();rp.goto(SITE+'/lessons/reading/tfng',wait_until='networkidle')
 rp.get_by_text('Уроки бесплатны. Примените знания на практике.',exact=True).wait_for()
 assert rp.locator('[data-lesson-body]').get_attribute('data-lesson-body-locale')=='ru'
 assert rp.evaluate('document.documentElement.scrollWidth <= innerWidth')
 rp.screenshot(path=str(out/'public-reading-ru-phone.png'),full_page=True)
 print('Russian public explanation and account invitation pass on phone',flush=True)
 email=f'public-lessons-{uuid.uuid4().hex[:8]}@example.test'
 session=visitor.request.post(API+'/auth/v1/signup',data={'email':email,'password':'LocalReviewOnly123!'}).json()
 headers={'Authorization':'Bearer '+session['access_token'],'apikey':'local-anon-key'}
 profile=visitor.request.post(API+'/rest/v1/student_profiles',headers=headers,data={'user_id':session['user']['id'],'first_name':'Public','last_name':'Lesson','date_of_birth':'2000-01-01','phone':'+77010000000','city':'Almaty','occupation':'Synthetic test','source':'other','parent_name':None,'parent_phone':None,'parent_consent_at':None,'updated_at':'2026-10-01T00:00:00Z'})
 assert profile.ok,profile.text()
 student=context(session=session);sp=student.new_page()
 sp.goto(SITE+'/lessons/reading/tfng',wait_until='networkidle')
 assert len(sp.locator('[data-lesson-body]').inner_text())>400
 assert visitor.request.get(API+'/content/practice/practice-reading-tfng',headers=headers).status==403
 started=visitor.request.post(API+'/rest/v1/rpc/trial_start',headers=headers,data={})
 assert started.ok,started.text()
 assert visitor.request.get(API+'/content/test/reading-full-001',headers=headers).status==200
 assert visitor.request.get(API+'/content/practice/practice-reading-paraphrase',headers=headers).status==200
 assert visitor.request.get(API+'/content/practice/practice-reading-tfng',headers=headers).status==403
 visitor.request.post(API+'/__trial/rewind',data={'email':email,'minutes':4400})
 sp.goto(SITE+'/lessons/reading/tfng',wait_until='networkidle')
 assert len(sp.locator('[data-lesson-body]').inner_text())>400
 assert visitor.request.get(API+'/content/test/reading-full-001',headers=headers).status==403
 print('Account alone does not unlock paid practice; trial sample opens; lesson survives trial expiry',flush=True)
 sp.goto(SITE+'/plans',wait_until='networkidle')
 sp.get_by_role('button',name='Buy one month',exact=True).click()
 sp.wait_for_url('**/__pay/**')
 sp.get_by_role('button',name='Pay (SIMULATED)',exact=True).click()
 sp.wait_for_url('**/ielts-website/**')
 sp.goto(SITE+'/lessons/reading/tfng',wait_until='networkidle')
 sp.get_by_role('button',name='Check answers',exact=False).first.wait_for()
 assert visitor.request.get(API+'/content/practice/practice-reading-tfng',headers=headers).status==200
 print('Paid purchase unlocks actual lesson practice questions',flush=True)
 sp.screenshot(path=str(out/'paid-lesson-practice.png'),full_page=True)
 # Use the actual account menu and Supabase sign-out lifecycle.
 sp.get_by_role('button',name='Open menu',exact=True).click()
 sp.get_by_role('menuitem',name='Sign out',exact=True).click()
 sp.get_by_text('Sign in to continue your trial',exact=True).wait_for()
 assert sp.get_by_role('button',name='Check answers',exact=False).count()==0
 assert len(sp.locator('[data-lesson-body]').inner_text())>400
 print('Sign-out removes mounted private quiz while public lesson remains',flush=True)
 visitor.request.post(API+'/__pay/expire',data={'email':email})
 fresh=visitor.request.post(API+'/auth/v1/token?grant_type=password',data={'email':email,'password':'LocalReviewOnly123!'}).json()
 expired=context(session=fresh);ep=expired.new_page()
 ep.goto(SITE+'/lessons/reading/tfng',wait_until='networkidle')
 assert len(ep.locator('[data-lesson-body]').inner_text())>400
 assert visitor.request.get(API+'/content/practice/practice-reading-tfng',headers={'Authorization':'Bearer '+fresh['access_token']}).status==403
 assert ep.get_by_role('button',name='Check answers',exact=False).count()==0
 print('Paid expiry refuses private practice but keeps lessons readable',flush=True)
 print('PAGE ERRORS',errors,flush=True)
 assert not errors
 browser.close()
