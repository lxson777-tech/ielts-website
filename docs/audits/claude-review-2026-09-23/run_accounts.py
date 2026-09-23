import sys,os
from pathlib import Path
os.environ['IELTS_BASE_URL']='http://127.0.0.1:4354/ielts-website'
sys.path.insert(0,str(Path.cwd()/'tests'/'browser'))
import f20_account_journey as scenario
import final_helpers,helpers
out=Path('C:/Users/Alex/Desktop/Projects/IELTS website/.tmp/claude-review-2026-09-23/accounts')
out.mkdir(parents=True,exist_ok=True)
for mod in [final_helpers,helpers]:
    mod.EVIDENCE_DIR=out
    mod.RESULTS_PATH=out/'results.md'
scenario.STANDIN_URL='http://127.0.0.1:8801'
scenario.run()
