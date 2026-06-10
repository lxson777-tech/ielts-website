# Workflow: Update IELTS Materials

## Objective
Scrape fresh practice questions and examiner tips from trusted IELTS sources and inject them into each lesson page's **Practice & Resources** section.

## When to Run
- When you want to refresh stale content
- When a source URL has moved and you've updated the config
- When adding a new lesson page

## Prerequisites
```
pip install -r requirements.txt
```
Only needed once. Requires `requests` and `beautifulsoup4`.

## Run
```
python tools/scrape_ielts_materials.py
```

Run from the project root. The script prints HTTP status for every fetch so you can see which sources succeeded.

## What It Does
For each lesson file it:
1. Checks `robots.txt` on each source domain (skips if disallowed)
2. Fetches the target URL with a browser User-Agent
3. Extracts bullet-point tips or practice questions from the main content area
4. Builds a **Practice & Resources** section using the site's existing card classes
5. Replaces the content between `<!-- MATERIALS -->` and `<!-- /MATERIALS -->` markers in the HTML file

## Sources and Target URLs

| Lesson | Source | URL | Content type |
|--------|--------|-----|-------------|
| Reading | IELTS Liz | ieltsliz.com/ielts-reading/ | Tips |
| Reading | IELTS Up | ielts-up.com/reading.html | Practice Qs |
| Writing T1 | IELTS Liz | ieltsliz.com/ielts-writing-task-1/ | Tips |
| Writing T1 | IELTS Up | ielts-up.com/writing.html | Practice Qs |
| Writing T2 | IELTS Liz | ieltsliz.com/ielts-writing-task-2/ | Tips |
| Writing T2 | IELTS Up | ielts-up.com/writing.html | Practice Qs |
| Speaking P1 | IELTS Liz | ieltsliz.com/ielts-speaking-part-1/ | Tips |
| Speaking P1 | IELTS Up | ielts-up.com/speaking.html | Practice Qs |
| Speaking P2 | IELTS Liz | ieltsliz.com/ielts-speaking-part-2/ | Tips |
| Speaking P2 | IELTS Up | ielts-up.com/speaking.html | Practice Qs |
| Speaking P3 | IELTS Liz | ieltsliz.com/ielts-speaking-part-3/ | Tips |
| Speaking P3 | IELTS Up | ielts-up.com/speaking.html | Practice Qs |
| Listening | IELTS Liz | ieltsliz.com/ielts-listening-tips/ | Tips |
| Listening | IELTS Up | ielts-up.com/listening.html | Practice Qs |
| Vocabulary | IELTS Liz | ieltsliz.com/ielts-vocabulary/ | Tips |
| Vocabulary | IELTS Up | ielts-up.com/vocabulary.html | Practice Qs |

## Updating a URL
Edit the `LESSON_SOURCES` dict at the top of `tools/scrape_ielts_materials.py`. Re-run the script.

## If a Source Is Blocked or Returns Nothing
The script skips that source and logs a warning. The existing materials in the HTML are left unchanged. You can:
1. Try a different URL for that source and update the config
2. Or manually write content directly between the `<!-- MATERIALS -->` and `<!-- /MATERIALS -->` markers in the lesson HTML file

## Adding a New Lesson Page
1. Add `<!-- MATERIALS --><!-- /MATERIALS -->` before `</main>` in the new HTML file
2. Add an entry to `LESSON_SOURCES` in the script with the lesson filename and source URLs
3. Re-run the script
