#!/usr/bin/env python3
"""
Scrapes IELTS practice materials from trusted sources and injects them
into lesson HTML files between <!-- MATERIALS --> ... <!-- /MATERIALS --> markers.

Usage:
    pip install -r requirements.txt
    python tools/scrape_ielts_materials.py

Re-run any time to refresh the scraped content.
"""

import os
import re
import sys
import time
import urllib.robotparser
from urllib.parse import urlparse

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    sys.exit("Missing dependencies. Run: pip install requests beautifulsoup4")

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
# Lesson content now lives as HTML fragments consumed by the Astro build.
# The fragments keep the MATERIALS / SAMPLES / QUIZ markers, so injection
# works unchanged — but updates go live on the next push (Pages rebuild),
# not instantly.
LESSONS_DIR = os.path.join(ROOT, 'src', 'content', 'lesson-bodies')
TIMEOUT = 15        # seconds per HTTP request
POLITE_DELAY = 1.5  # seconds between requests (be a good citizen)

HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/120.0.0.0 Safari/537.36'
    ),
    'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
}

# ── Source configuration ──────────────────────────────────────────────────────
#
# For each lesson file: ordered list of sources to try.
# type 'tips'      -> extract bullet-point lists (examiner tips, strategies)
# type 'questions' -> extract question sentences (practice prompts)
#
# If a URL returns an error or is blocked by robots.txt the source is skipped
# and the next one is tried. Update URLs here if a page moves.

LESSON_SOURCES = {
    'reading-task1.html': [
        {'url': 'https://ielts-up.com/reading/ielts-reading-tips.html',       'name': 'IELTS Up',     'type': 'tips'},
        {'url': 'https://ielts-up.com/reading/ielts-reading-practice.html',   'name': 'IELTS Up',     'type': 'questions'},
    ],
    'writing-task1.html': [
        {'url': 'https://ielts-up.com/writing/ielts-writing-tips.html',       'name': 'IELTS Up',     'type': 'tips'},
        {'url': 'https://ielts-up.com/writing/ielts-academic-task-1.html',    'name': 'IELTS Up',     'type': 'questions'},
    ],
    'writing-task2.html': [
        {'url': 'https://ielts-up.com/writing/ielts-writing-tips.html',       'name': 'IELTS Up',     'type': 'tips'},
        {'url': 'https://ielts-up.com/writing/ielts-essay.html',              'name': 'IELTS Up',     'type': 'questions'},
    ],
    'speaking-part1.html': [
        {'url': 'https://ielts-up.com/speaking/ielts-speaking-tips.html',     'name': 'IELTS Up',     'type': 'tips'},
        {'url': 'https://ielts-up.com/speaking/ielts-speaking-practice.html', 'name': 'IELTS Up',     'type': 'questions'},
    ],
    'speaking-part2.html': [
        {'url': 'https://ielts-up.com/speaking/ielts-speaking-tips.html',     'name': 'IELTS Up',     'type': 'tips'},
        {'url': 'https://ielts-up.com/speaking/ielts-speaking-practice.html', 'name': 'IELTS Up',     'type': 'questions'},
    ],
    'speaking-part3.html': [
        {'url': 'https://ielts-up.com/speaking/ielts-speaking-tips.html',     'name': 'IELTS Up',     'type': 'tips'},
        {'url': 'https://ielts-up.com/speaking/ielts-speaking-practice.html', 'name': 'IELTS Up',     'type': 'questions'},
    ],
    'listening.html': [
        {'url': 'https://ielts-up.com/listening/ielts-listening-tips.html',   'name': 'IELTS Up',     'type': 'tips'},
        {'url': 'https://ielts-up.com/listening/ielts-listening-practice.html','name': 'IELTS Up',    'type': 'questions'},
    ],
    'vocabulary.html': [
        {'url': 'https://ielts-up.com/speaking/ielts-vocabulary-speaking.html','name': 'IELTS Up',    'type': 'tips'},
        {'url': 'https://ielts-up.com/writing/ielts-vocabulary-writing.html',  'name': 'IELTS Up',    'type': 'tips'},
    ],
}

# ── robots.txt check ──────────────────────────────────────────────────────────

_robots_cache: dict = {}

def robots_allowed(url: str) -> bool:
    parsed = urlparse(url)
    base = f"{parsed.scheme}://{parsed.netloc}"
    if base not in _robots_cache:
        rp = urllib.robotparser.RobotFileParser()
        rp.set_url(f"{base}/robots.txt")
        try:
            rp.read()
            _robots_cache[base] = rp.can_fetch(HEADERS['User-Agent'], url)
        except Exception:
            _robots_cache[base] = True  # assume allowed if robots.txt unreachable
    return _robots_cache[base]

# ── HTTP fetch ────────────────────────────────────────────────────────────────

def fetch(url: str):
    if not robots_allowed(url):
        print(f"    WARN  robots.txt disallows: {url}")
        return None
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        mark = 'OK' if r.ok else 'FAIL'
        print(f"    {mark}  HTTP {r.status_code}  {url}")
        return r if r.ok else None
    except requests.RequestException as e:
        print(f"    FAIL  {url}: {e}")
        return None

# ── Content extraction ────────────────────────────────────────────────────────

def main_content(soup):
    """Return the most likely main article/content element."""
    for sel in [
        'article .entry-content',
        'div.entry-content',
        'article .post-content',
        'div.post-content',
        'div.post-body',
        '.article-content',
        '#content',
        'main article',
        'article',
        'main',
    ]:
        el = soup.select_one(sel)
        if el:
            return el
    return soup.body or soup

def _nav_like(text: str) -> bool:
    """Return True if this item looks like a nav link rather than real content."""
    words = text.split()
    return len(words) < 5 or text.count('\n') > 2

def extract_tips(content, max_items: int = 6) -> list:
    """Extract up to max_items bullet points from all lists in the content area."""
    # Collect all li text from every ul/ol (recursive, to handle nested wrappers)
    all_items: list = []
    seen: set = set()
    for li in content.find_all('li'):
        text = re.sub(r'\s+', ' ', li.get_text(' ', strip=True))
        if 20 < len(text) < 350 and not _nav_like(text) and text not in seen:
            seen.add(text)
            all_items.append(text)
    # Fallback: extract from paragraph headings + following text
    if len(all_items) < 3:
        for p in content.find_all(['p', 'h3', 'h4']):
            text = re.sub(r'\s+', ' ', p.get_text(' ', strip=True))
            if 30 < len(text) < 300 and text not in seen:
                seen.add(text)
                all_items.append(text)
    return all_items[:max_items]

def extract_questions(content, max_items: int = 5) -> list:
    """Extract sentences that look like practice questions (contain '?')."""
    # First try to find them in <p> or <li> tags for cleaner extraction
    seen: set = set()
    unique: list = []
    for el in content.find_all(['p', 'li', 'h3', 'h4']):
        text = re.sub(r'\s+', ' ', el.get_text(' ', strip=True))
        if '?' in text and 25 < len(text) < 250 and not _nav_like(text):
            text = text.strip()
            if text not in seen:
                seen.add(text)
                unique.append(text)
    # Fallback: regex over full page text
    if len(unique) < 2:
        full = content.get_text(' ', strip=True)
        for q in re.findall(r'[A-Z][^.!?]{20,200}\?', full):
            q = q.strip()
            if q not in seen:
                seen.add(q)
                unique.append(q)
    return unique[:max_items]

# ── HTML building ─────────────────────────────────────────────────────────────

def _esc(text: str) -> str:
    return (text
            .replace('&', '&amp;')
            .replace('<', '&lt;')
            .replace('>', '&gt;')
            .replace('"', '&quot;'))

def build_section(scraped_sources: list) -> str:
    """Assemble the full materials section HTML from scraped data."""
    cards = []

    for src in scraped_sources:
        items = src.get('items', [])
        if not items:
            continue

        url  = src['url']
        name = _esc(src['name'])
        attr = (f'<p class="material-source">Source: '
                f'<a href="{url}" target="_blank" rel="noopener">{name}</a></p>')

        if src['type'] == 'tips':
            lis = '\n      '.join(f'<li>{_esc(i)}</li>' for i in items)
            cards.append(
                f'  <div class="card">\n'
                f'    <h3>Examiner Tips</h3>\n'
                f'    <ul>\n'
                f'      {lis}\n'
                f'    </ul>\n'
                f'    {attr}\n'
                f'  </div>'
            )
        elif src['type'] == 'questions':
            lis = '\n      '.join(f'<li>&ldquo;{_esc(i)}&rdquo;</li>' for i in items)
            cards.append(
                f'  <div class="card">\n'
                f'    <h3>Practice Questions</h3>\n'
                f'    <ul>\n'
                f'      {lis}\n'
                f'    </ul>\n'
                f'    {attr}\n'
                f'  </div>'
            )

    if not cards:
        return ''

    inner = '\n\n'.join(cards)
    return (
        f'<div class="section" id="materials">\n'
        f'  <div class="section-header">\n'
        f'    <div class="section-num">&#9733;</div>\n'
        f'    <div class="section-title-block">\n'
        f'      <div class="tag">Free Materials</div>\n'
        f'      <h2>Practice &amp; Resources</h2>\n'
        f'    </div>\n'
        f'  </div>\n\n'
        f'{inner}\n'
        f'</div>'
    )

# ── Sample test configuration ────────────────────────────────────────────────
#
# Maps each lesson file to the IELTS Up index page that lists sample tests,
# plus a URL pattern to identify sample links on that page.
# Set to None to skip samples for that lesson.

BASE_URL = 'https://ielts-up.com'

LESSON_SAMPLE_PAGES = {
    'reading-task1.html': {
        'url': 'https://ielts-up.com/reading/ielts-reading-practice.html',
        'pattern': r'/reading/academic-reading-sample-\d+\.1\.html',  # section 1 = test entry
        'label': 'Academic Reading',
        'max': 6,
    },
    'writing-task1.html': {
        'url': 'https://ielts-up.com/writing/ielts-academic-task-1.html',
        'pattern': r'/writing/academic-writing-sample-\d+\.html',
        'label': 'Writing · Task 1',
        'max': 6,
    },
    'writing-task2.html': {
        'url': 'https://ielts-up.com/writing/ielts-essay.html',
        'pattern': r'/writing/ielts-essay-sample-\d+\.html',
        'label': 'Writing · Task 2',
        'max': 6,
    },
    'speaking-part1.html': {
        'url': 'https://ielts-up.com/speaking/ielts-speaking-practice.html',
        'pattern': r'/speaking/(ielts-speaking-sample-[\w-]+|sample-[\w-]+)\.html',
        'label': 'Speaking · All 3 Parts',
        'max': 10,
    },
    'speaking-part2.html': {
        'url': 'https://ielts-up.com/speaking/ielts-speaking-practice.html',
        'pattern': r'/speaking/(ielts-speaking-sample-[\w-]+|sample-[\w-]+)\.html',
        'label': 'Speaking · All 3 Parts',
        'max': 10,
    },
    'speaking-part3.html': {
        'url': 'https://ielts-up.com/speaking/ielts-speaking-practice.html',
        'pattern': r'/speaking/(ielts-speaking-sample-[\w-]+|sample-[\w-]+)\.html',
        'label': 'Speaking · All 3 Parts',
        'max': 10,
    },
    'listening.html': {
        'url': 'https://ielts-up.com/listening/ielts-listening-practice.html',
        'pattern': r'/listening/ielts-listening-sample-\d+\.1\.html',  # section 1 = test entry
        'label': 'Listening',
        'max': 6,
    },
    'vocabulary.html': None,
}

def scrape_samples(cfg: dict) -> list:
    """Fetch and return a list of {url, title, label} dicts for sample tests."""
    r = fetch(cfg['url'])
    if r is None:
        return []
    time.sleep(POLITE_DELAY)

    soup = BeautifulSoup(r.text, 'html.parser')
    content = main_content(soup)
    pattern = re.compile(cfg['pattern'])
    seen: set = set()
    samples: list = []

    for a in content.find_all('a', href=True):
        href = a['href']
        if href.startswith('/'):
            href = BASE_URL + href
        if not pattern.search(href) or href in seen:
            continue
        seen.add(href)

        title = re.sub(r'\s+', ' ', a.get_text(' ', strip=True)).strip()

        # Generate cleaner titles from URL when link text is generic
        if not title or title.lower() in ('section 1', 'section 2', 'section 3',
                                          'sample 1', 'sample 2', '... see more', '...see more'):
            m = re.search(r'academic-reading-sample-(\d+)', href)
            if m:
                title = f"Academic Test {m.group(1)}"
            else:
                m2 = re.search(r'sample[_-](\d+)', href, re.I)
                title = f"Sample {m2.group(1)}" if m2 else ''

        # For reading, always use "Academic Test N"
        m_read = re.search(r'academic-reading-sample-(\d+)', href)
        if m_read:
            title = f"Academic Test {m_read.group(1)}"

        # For listening, always use "Listening Test N"
        m_listen = re.search(r'ielts-listening-sample-(\d+)', href)
        if m_listen:
            title = f"Listening Test {m_listen.group(1)}"

        if not title:
            continue

        samples.append({'url': href, 'title': title, 'label': cfg['label']})
        if len(samples) >= cfg['max']:
            break

    return samples


def build_samples_section(samples: list) -> str:
    """Build the Sample Tests section HTML from a list of sample dicts."""
    if not samples:
        return ''

    cards = '\n'.join(
        f'    <a class="sample-card" href="{s["url"]}" target="_blank" rel="noopener">\n'
        f'      <span class="sample-topic">{_esc(s["label"])}</span>\n'
        f'      <strong class="sample-title">{_esc(s["title"])}</strong>\n'
        f'      <span class="sample-go">Practice on IELTS Up &#8594;</span>\n'
        f'    </a>'
        for s in samples
    )

    return (
        f'<div class="section" id="samples">\n'
        f'  <div class="section-header">\n'
        f'    <div class="section-num">T</div>\n'
        f'    <div class="section-title-block">\n'
        f'      <div class="tag">Practice Tests</div>\n'
        f'      <h2>Sample Tests</h2>\n'
        f'    </div>\n'
        f'  </div>\n'
        f'  <p style="font-size:0.88rem; color:var(--muted); margin-bottom:0.5rem;">'
        f'Full interactive tests — complete them on IELTS Up and get your score instantly.</p>\n'
        f'  <div class="samples-grid">\n'
        f'{cards}\n'
        f'  </div>\n'
        f'  <p class="material-source">Tests provided by '
        f'<a href="https://ielts-up.com" target="_blank" rel="noopener">IELTS Up</a></p>\n'
        f'</div>'
    )


_SAMPLES_RE = re.compile(r'<!-- SAMPLES -->.*?<!-- /SAMPLES -->', re.DOTALL)


def inject_samples(path: str, section_html: str) -> bool:
    """Replace content between <!-- SAMPLES --> markers."""
    with open(path, 'r', encoding='utf-8') as f:
        original = f.read()

    if '<!-- SAMPLES -->' not in original:
        print(f"    WARN  No <!-- SAMPLES --> marker in {os.path.basename(path)} — skipping")
        return False

    replacement = f'<!-- SAMPLES -->\n{section_html}\n<!-- /SAMPLES -->'
    updated = _SAMPLES_RE.sub(replacement, original)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(updated)
    return True


# ── Injection ─────────────────────────────────────────────────────────────────

_MARKER_RE = re.compile(r'<!-- MATERIALS -->.*?<!-- /MATERIALS -->', re.DOTALL)

def inject(path: str, section_html: str) -> bool:
    """Replace content between <!-- MATERIALS --> markers."""
    with open(path, 'r', encoding='utf-8') as f:
        original = f.read()

    if '<!-- MATERIALS -->' not in original:
        print(f"    WARN  No <!-- MATERIALS --> marker in {os.path.basename(path)} — skipping")
        return False

    replacement = f'<!-- MATERIALS -->\n{section_html}\n<!-- /MATERIALS -->'
    updated = _MARKER_RE.sub(replacement, original)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(updated)
    return True

# ── Quiz configuration ───────────────────────────────────────────────────────
#
# Maps each lesson file to the IELTS Up page to scrape for its inline quiz.
# type 'reading'  -> passage + T/F/NG questions + answers
# type 'speaking' -> examiner/candidate pairs (specify which parts to include)
# type 'writing'  -> task prompt + model essay
# Set to None to skip (listening = no audio, vocabulary = built from JS word array)

LESSON_QUIZ_PAGES = {
    'reading-task1.html': {
        'type': 'reading',
        'url': 'https://ielts-up.com/reading/academic-reading-sample-1.1.html',
        'name': 'IELTS Up',
        'label': 'Reading Practice Quiz — Academic Test 1, Section 1',
    },
    'writing-task1.html': {
        'type': 'writing',
        'url': 'https://ielts-up.com/writing/academic-writing-sample-1.html',
        'name': 'IELTS Up',
        'label': 'Writing Task 1 — Model Answer',
    },
    'writing-task2.html': {
        'type': 'writing',
        'url': 'https://ielts-up.com/writing/ielts-essay-sample-1.html',
        'name': 'IELTS Up',
        'label': 'Writing Task 2 — Model Essay',
    },
    'speaking-part1.html': {
        'type': 'speaking',
        'url': 'https://ielts-up.com/speaking/ielts-speaking-sample-1.html',
        'name': 'IELTS Up',
        'label': 'Speaking Sample — Travel & Holidays',
        'parts': [1],
    },
    'speaking-part2.html': {
        'type': 'speaking',
        'url': 'https://ielts-up.com/speaking/ielts-speaking-sample-1.html',
        'name': 'IELTS Up',
        'label': 'Speaking Sample — Travel & Holidays',
        'parts': [2],
    },
    'speaking-part3.html': {
        'type': 'speaking',
        'url': 'https://ielts-up.com/speaking/ielts-speaking-sample-1.html',
        'name': 'IELTS Up',
        'label': 'Speaking Sample — Travel & Holidays',
        'parts': [3],
    },
    'listening.html':   None,
    'vocabulary.html':  None,
}

# ── Quiz scraping helpers ─────────────────────────────────────────────────────

def scrape_reading_quiz(url: str) -> dict | None:
    """Scrape passage text, T/F/NG questions, and answers from an IELTS Up reading page."""
    r = fetch(url)
    if r is None:
        return None
    time.sleep(POLITE_DELAY)

    soup = BeautifulSoup(r.text, 'html.parser')
    content = main_content(soup)

    # Extract answers from hidden div
    answers = []
    ans_div = soup.find('div', id='answers')
    if ans_div:
        for li in ans_div.find_all('li'):
            text = li.get_text(strip=True)
            # Normalise True/False/Not Given
            if re.search(r'\bnot\s+given\b', text, re.I):
                answers.append('not given')
            elif re.search(r'\btrue\b', text, re.I):
                answers.append('true')
            elif re.search(r'\bfalse\b', text, re.I):
                answers.append('false')
            else:
                answers.append(text.lower().strip())

    # Extract passage: find largest contiguous text block that isn't a question set
    passage = ''
    for el in content.find_all(['div', 'p']):
        candidate = el.get_text(' ', strip=True)
        if (len(candidate) > len(passage)
                and len(candidate) > 300
                and len(el.find_all(['select', 'input'])) == 0
                and len(el.find_all('li')) < 5):
            passage = candidate

    # Trim passage to ~1 200 chars to keep the widget scannable
    if len(passage) > 1200:
        passage = passage[:1200].rsplit(' ', 1)[0] + ' …'

    # Extract questions from <select> elements and their surrounding context
    questions = []
    for sel in content.find_all('select'):
        parent = sel.parent
        parts = []
        for child in parent.children:
            if hasattr(child, 'name'):
                if child.name in ('select', 'script', 'style'):
                    continue
                parts.append(child.get_text(' ', strip=True))
            else:
                parts.append(str(child).strip())
        q_text = re.sub(r'\s+', ' ', ' '.join(parts)).strip()
        idx = len(questions)
        answer = answers[idx] if idx < len(answers) else ''
        if q_text or answer:
            questions.append({'num': str(idx + 1), 'text': q_text, 'answer': answer})

    if not questions and not passage:
        return None

    return {'passage': passage, 'questions': questions[:10]}


def scrape_speaking_quiz(url: str, parts: list) -> list:
    """Scrape examiner/candidate pairs for the requested part numbers."""
    r = fetch(url)
    if r is None:
        return []
    time.sleep(POLITE_DELAY)

    soup = BeautifulSoup(r.text, 'html.parser')
    content = main_content(soup)

    # Split content by Part headers (h2/h3 containing "Part N")
    # Build a map: part_number -> [(question, answer), ...]
    part_map: dict = {}
    current_part = 0
    for el in content.find_all(True):
        if el.name in ('h2', 'h3', 'h4'):
            m = re.search(r'part\s+(\d)', el.get_text(), re.I)
            if m:
                current_part = int(m.group(1))
                if current_part not in part_map:
                    part_map[current_part] = []
        elif el.name == 'p' and current_part:
            cls = el.get('class', [])
            text = re.sub(r'\s+', ' ', el.get_text(' ', strip=True))
            if not text:
                continue
            if 'examiner' in cls:
                part_map.setdefault(current_part, []).append({'q': text, 'a': ''})
            elif 'candidate' in cls:
                bucket = part_map.get(current_part, [])
                if bucket and bucket[-1]['a'] == '':
                    bucket[-1]['a'] = text

    result = []
    for p in parts:
        pairs = part_map.get(p, [])[:5]  # max 5 Q&A per part
        for pair in pairs:
            result.append({'part': p, 'q': pair['q'], 'a': pair['a']})
    return result


def scrape_writing_quiz(url: str) -> dict | None:
    """Scrape task prompt and model essay from an IELTS Up writing page."""
    r = fetch(url)
    if r is None:
        return None
    time.sleep(POLITE_DELAY)

    soup = BeautifulSoup(r.text, 'html.parser')
    content = main_content(soup)

    # Prompt: inside .exam-extract
    prompt = ''
    extract = content.select_one('.exam-extract')
    if extract:
        prompt = re.sub(r'\s+', ' ', extract.get_text(' ', strip=True))

    # Essay: collect <p> tags that come after .exam-extract and contain enough words
    essay_paras = []
    found_extract = False
    for el in content.find_all(['p', 'div', 'section']):
        if el == extract or (extract and extract in el.find_all(True)):
            found_extract = True
            continue
        if not found_extract:
            continue
        if el.name == 'p':
            text = re.sub(r'\s+', ' ', el.get_text(' ', strip=True))
            # Stop at word-count lines or very short lines
            if re.match(r'^\(?\d+\s*words?\)?\.?$', text, re.I):
                break
            if len(text.split()) >= 8:
                essay_paras.append(text)
        if len(essay_paras) >= 8:
            break

    if not prompt and not essay_paras:
        return None

    return {'prompt': prompt, 'essay': essay_paras}


# ── Quiz HTML builders ────────────────────────────────────────────────────────

def build_reading_quiz_html(data: dict, cfg: dict) -> str:
    url  = cfg['url']
    name = cfg.get('name', 'IELTS Up')
    label = cfg.get('label', 'Reading Quiz')

    passage_html = (
        f'    <div class="quiz-passage">{_esc(data["passage"])}</div>\n'
        if data.get('passage') else ''
    )

    items_html = ''
    for q in data.get('questions', []):
        items_html += (
            f'    <div class="quiz-item" data-answer="{_esc(q["answer"])}">\n'
            f'      <span class="quiz-num">{_esc(q["num"])}.</span>\n'
            f'      <span class="quiz-q">{_esc(q["text"])}</span>\n'
            f'      <select class="quiz-select">\n'
            f'        <option value="">—</option>\n'
            f'        <option value="true">True</option>\n'
            f'        <option value="false">False</option>\n'
            f'        <option value="not given">Not Given</option>\n'
            f'      </select>\n'
            f'    </div>\n'
        )

    return (
        f'<div class="section" id="quiz">\n'
        f'  <div class="section-header">\n'
        f'    <div class="section-num">Q</div>\n'
        f'    <div class="section-title-block">\n'
        f'      <div class="tag">Quick Quiz</div>\n'
        f'      <h2>Practice Quiz</h2>\n'
        f'    </div>\n'
        f'  </div>\n'
        f'  <div class="exercise-box" data-quiz="reading">\n'
        f'    <p class="quiz-h3">{_esc(label)}</p>\n'
        f'{passage_html}'
        f'{items_html}'
        f'    <button class="quiz-check-btn">Check Answers</button>\n'
        f'    <p class="quiz-score" hidden></p>\n'
        f'    <p class="material-source">Source: '
        f'<a href="{url}" target="_blank" rel="noopener">{_esc(name)}</a></p>\n'
        f'  </div>\n'
        f'</div>'
    )


def build_speaking_quiz_html(pairs: list, cfg: dict) -> str:
    url  = cfg['url']
    name = cfg.get('name', 'IELTS Up')
    label = cfg.get('label', 'Speaking Sample')

    details_html = ''
    for item in pairs:
        details_html += (
            f'    <details class="speaking-details">\n'
            f'      <summary>{_esc(item["q"])}</summary>\n'
            f'      <div class="speaking-answer">\n'
            f'        <p><strong>Model answer:</strong> {_esc(item["a"])}</p>\n'
            f'      </div>\n'
            f'    </details>\n'
        )

    return (
        f'<div class="section" id="quiz">\n'
        f'  <div class="section-header">\n'
        f'    <div class="section-num">Q</div>\n'
        f'    <div class="section-title-block">\n'
        f'      <div class="tag">Quick Quiz</div>\n'
        f'      <h2>Practice Quiz</h2>\n'
        f'    </div>\n'
        f'  </div>\n'
        f'  <div class="exercise-box">\n'
        f'    <p class="quiz-h3">{_esc(label)} — click a question to reveal a model answer</p>\n'
        f'{details_html}'
        f'    <p class="material-source">Source: '
        f'<a href="{url}" target="_blank" rel="noopener">{_esc(name)}</a></p>\n'
        f'  </div>\n'
        f'</div>'
    )


def build_writing_quiz_html(data: dict, cfg: dict) -> str:
    url  = cfg['url']
    name = cfg.get('name', 'IELTS Up')
    label = cfg.get('label', 'Writing Sample')

    prompt_html = (
        f'    <div class="passage-box">\n'
        f'      <strong>Task:</strong> {_esc(data["prompt"])}\n'
        f'    </div>\n'
    ) if data.get('prompt') else ''

    paras = '\n'.join(f'<p>{_esc(p)}</p>' for p in data.get('essay', []))
    essay_html = (
        f'    <details>\n'
        f'      <summary>Reveal model answer</summary>\n'
        f'      <div style="margin-top:0.75rem; line-height:1.7; font-size:0.9rem;">\n'
        f'        {paras}\n'
        f'      </div>\n'
        f'    </details>\n'
    ) if data.get('essay') else ''

    return (
        f'<div class="section" id="quiz">\n'
        f'  <div class="section-header">\n'
        f'    <div class="section-num">Q</div>\n'
        f'    <div class="section-title-block">\n'
        f'      <div class="tag">Quick Quiz</div>\n'
        f'      <h2>Practice Quiz</h2>\n'
        f'    </div>\n'
        f'  </div>\n'
        f'  <div class="exercise-box">\n'
        f'    <p class="quiz-h3">{_esc(label)}</p>\n'
        f'{prompt_html}'
        f'{essay_html}'
        f'    <p class="material-source">Source: '
        f'<a href="{url}" target="_blank" rel="noopener">{_esc(name)}</a></p>\n'
        f'  </div>\n'
        f'</div>'
    )


_QUIZ_RE = re.compile(r'<!-- QUIZ -->.*?<!-- /QUIZ -->', re.DOTALL)


def inject_quiz(path: str, section_html: str) -> bool:
    """Replace content between <!-- QUIZ --> markers."""
    with open(path, 'r', encoding='utf-8') as f:
        original = f.read()

    if '<!-- QUIZ -->' not in original:
        print(f"    WARN  No <!-- QUIZ --> marker in {os.path.basename(path)} — skipping")
        return False

    replacement = f'<!-- QUIZ -->\n{section_html}\n<!-- /QUIZ -->'
    updated = _QUIZ_RE.sub(replacement, original)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(updated)
    return True


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print('IELTS Materials Scraper')
    print('=' * 50)

    for lesson_file, sources_config in LESSON_SOURCES.items():
        lesson_path = os.path.join(LESSONS_DIR, lesson_file)
        if not os.path.exists(lesson_path):
            print(f'\nWARN  {lesson_file} not found — skipping')
            continue

        print(f'\n>> {lesson_file}')
        scraped = []

        for src in sources_config:
            print(f"  {src['name']} ({src['type']}) …")
            r = fetch(src['url'])
            if r is None:
                scraped.append({**src, 'items': []})
                time.sleep(POLITE_DELAY)
                continue

            soup = BeautifulSoup(r.text, 'html.parser')
            content = main_content(soup)

            items = (extract_tips(content)
                     if src['type'] == 'tips'
                     else extract_questions(content))

            print(f"    -> {len(items)} item(s) extracted")
            scraped.append({**src, 'items': items})
            time.sleep(POLITE_DELAY)

        section_html = build_section(scraped)
        if not section_html:
            print('  WARN  Nothing scraped — existing materials left unchanged')
        elif inject(lesson_path, section_html):
            print(f'  OK  Injected materials into {lesson_file}')

        # ── Sample tests ──────────────────────────────────────────────────────
        sample_cfg = LESSON_SAMPLE_PAGES.get(lesson_file)
        if sample_cfg is None:
            continue
        print(f'  Sample tests …')
        samples = scrape_samples(sample_cfg)
        print(f'    -> {len(samples)} sample(s) found')
        samples_html = build_samples_section(samples)
        if samples_html:
            if inject_samples(lesson_path, samples_html):
                print(f'  OK  Injected samples into {lesson_file}')
        else:
            print(f'  WARN  No samples found — existing samples left unchanged')

        # ── Inline quiz ───────────────────────────────────────────────────────
        quiz_cfg = LESSON_QUIZ_PAGES.get(lesson_file)
        if quiz_cfg is None:
            continue
        print(f'  Quiz ({quiz_cfg["type"]}) …')
        quiz_html = ''

        if quiz_cfg['type'] == 'reading':
            data = scrape_reading_quiz(quiz_cfg['url'])
            if data:
                quiz_html = build_reading_quiz_html(data, quiz_cfg)
                print(f'    -> {len(data.get("questions", []))} question(s) scraped')
            else:
                print(f'    WARN  Could not scrape reading quiz')

        elif quiz_cfg['type'] == 'speaking':
            pairs = scrape_speaking_quiz(quiz_cfg['url'], quiz_cfg.get('parts', [1]))
            if pairs:
                quiz_html = build_speaking_quiz_html(pairs, quiz_cfg)
                print(f'    -> {len(pairs)} Q&A pair(s) scraped')
            else:
                print(f'    WARN  Could not scrape speaking quiz')

        elif quiz_cfg['type'] == 'writing':
            data = scrape_writing_quiz(quiz_cfg['url'])
            if data:
                quiz_html = build_writing_quiz_html(data, quiz_cfg)
                paras = len(data.get('essay', []))
                print(f'    -> prompt + {paras} paragraph(s) scraped')
            else:
                print(f'    WARN  Could not scrape writing quiz')

        if quiz_html:
            if inject_quiz(lesson_path, quiz_html):
                print(f'  OK  Injected quiz into {lesson_file}')
        else:
            print(f'  WARN  No quiz content — existing quiz left unchanged')

    print('\nOK Done — refresh lesson pages in your browser to see the changes.')


if __name__ == '__main__':
    main()
