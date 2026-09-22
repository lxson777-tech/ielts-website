import sys,json
from pathlib import Path
sys.path.insert(0,str(Path.cwd()/'tests'/'browser'))
from final_helpers import synthetic_matching_headings,seed_context
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser=p.chromium.launch()
    context=browser.new_context(viewport={'width':390,'height':844},locale='ru-RU')
    progress,plan=synthetic_matching_headings()
    seed_context(context,progress=progress,saved_plan=plan)
    page=context.new_page()
    page.goto('http://127.0.0.1:4347/ielts-website/report?lang=ru',wait_until='networkidle')
    result=page.evaluate('''() => ({width:innerWidth,documentWidth:document.documentElement.scrollWidth,elements:[...document.querySelectorAll('main *')].filter(e=>!e.closest('table')).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right,text:e.innerText?.slice(0,100)})).filter(e=>e.right>391).slice(0,20)})''')
    print(json.dumps(result,ensure_ascii=False,indent=2))
    browser.close()
