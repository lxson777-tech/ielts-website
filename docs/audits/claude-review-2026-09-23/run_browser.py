import sys
from pathlib import Path
sys.path.insert(0,str(Path.cwd()/'tests'/'browser'))
import run_final, final_helpers, helpers
out=Path('C:/Users/Alex/Desktop/Projects/IELTS website/.tmp/claude-review-2026-09-23/browser')
out.mkdir(parents=True,exist_ok=True)
for mod in [final_helpers,helpers]:
    mod.EVIDENCE_DIR=out
    mod.RESULTS_PATH=out/'results.md'
    mod.BASE_URL='http://127.0.0.1:4348/ielts-website'
sys.argv=['run_final.py','http://127.0.0.1:4348/ielts-website']
run_final.main()
