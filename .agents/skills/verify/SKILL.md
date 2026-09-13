---
name: verify
description: How to build, run, and drive this site to verify changes at runtime (dev server + Python Playwright).
---

# Verifying changes in this repo

## Build / launch

- `npm run build` — full static build, catches SSR errors. `npx astro check` for types.
- `npm run dev` (background) — note the port it prints: 4321 is often taken by the user's own dev server, Astro then picks 4322/4323. Always test against the port from the log, not 4321.
- URLs use the `/ielts-website` base path and `trailingSlash: never` — `http://localhost:<port>/ielts-website/` (with trailing slash) 404s. Use `http://localhost:<port>/ielts-website`.

## Driving the UI

- No Node Playwright in the repo, but **Python Playwright is installed globally** (`python -c "from playwright.sync_api import sync_playwright"`) with Chromium. Write a script in the scratchpad and run it with `python`.
- Console is cp1251 on this machine: start scripts with `sys.stdout.reconfigure(encoding="utf-8", errors="replace")` or any "⚠"/"·" in page text crashes prints.
- Student progress lives in `localStorage['ielts.progress.v1']` — read it with `page.evaluate` to assert attempts were recorded.

## Gotchas

- The grader Workers (`ielts-grade-essay.lxson777.workers.dev`, speaking) send `Access-Control-Allow-Origin: https://lxson777-tech.github.io` only, so **localhost can never call them** (CORS preflight fails, UI shows "Couldn't grade your essay. Failed to fetch."). To exercise the grade→record flow locally, intercept with `page.route("**/ielts-grade-essay.lxson777.workers.dev/**", ...)` and fulfill with an `EssayAssessment`-shaped JSON body plus `Access-Control-Allow-Origin: *` (answer the OPTIONS preflight with 204 + CORS headers too).
- Supabase keys are set in `.env`, so the accounts UI (AccountMenu, AuthModal) is active in local dev.
- `graphify` CLI is blocked by Windows Application Control on this machine — explore from source.
