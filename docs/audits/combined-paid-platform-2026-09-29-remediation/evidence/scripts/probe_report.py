import sys
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding="utf-8")
from vh import fill_signin
import json, glob
d=json.load(open(r"C:/Users/Alex/Desktop/Projects/IELTS website/.claude/worktrees/musing-mcclintock-862665/docs/audits/combined-paid-platform-2026-09-29-remediation/evidence/journey-c-paying/results.json",encoding="utf-8"))
