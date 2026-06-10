# IELTS Lesson Site — Design Spec & Handoff Guide

## Project Overview

A multi-page educational website for an English language teaching centre in Almaty. The site hosts structured IELTS lesson materials for students, built around a consistent visual design system. Each lesson covers one IELTS skill or task type and follows an identical HTML template.

---

## Current Files

| File | Description |
|------|-------------|
| `ielts-lesson-template.html` | Blank reusable template — use this for every new lesson |
| `ielts-reading-lesson.html` | Reading lesson — 7 question types |
| `ielts-speaking-part1-lesson.html` | Speaking Part 1 — format, strategy, practice |
| `ielts-writing-task1-lesson.html` | Writing Task 1 — report writing full lesson |

---

## Design System

### Color Palette (CSS Variables)

```css
--bg: #f5f0e8;        /* warm off-white page background */
--ink: #1a1612;       /* near-black text and header background */
--accent: #c4411b;    /* burnt orange — section numbers, highlights, borders */
--accent2: #2c6e4f;   /* forest green — card headings, good examples */
--muted: #7a6f62;     /* warm grey — secondary text */
--card: #fffdf8;      /* warm white — card backgrounds */
--border: #e2d9cc;    /* warm beige — borders */
--tag-bg: #fde8e0;    /* light orange — tag pill backgrounds */
--tag-ink: #c4411b;   /* tag text color */
```

### Typography

- **Headings:** `Playfair Display` (Google Fonts) — weights 700, 900
- **Body:** `DM Sans` (Google Fonts) — weights 300, 400, 500
- Base font size: `15px`, line-height `1.7`

### Header

- Dark background (`--ink`) with large watermark word (opacity 0.04) in the top-right
- Orange label badge (`.lesson-date`) above the H1
- Change the `header::after content` value to match the skill: `'READING'`, `'WRITING'`, `'SPEAKING'`, `'LISTENING'`

---

## Component Library

Every component below is already defined in the CSS of each lesson file. Copy them freely.

### `.two-col`
Two equal columns, collapses to one on mobile.
```html
<div class="two-col">
  <div class="card">...</div>
  <div class="card">...</div>
</div>
```

### `.card`
Standard info card with green H3 heading.
```html
<div class="card">
  <h3>Card Title</h3>
  <p>Content here</p>
</div>
```

### `.passage-box`
Reading passage or question prompt. Red left border.
```html
<div class="passage-box">
  <strong>Passage Title</strong><br><br>
  Passage text here...
</div>
```

### `.exercise-box`
Practice exercise area. Green tint background.
```html
<div class="exercise-box">
  <h3>Exercise — Instructions</h3>
  <ol>
    <li>Question 1</li>
  </ol>
</div>
```

### `<details>` / Answer Key
Collapsible answer reveal.
```html
<details>
  <summary>Show Answers & Explanations</summary>
  <div class="answers">
    <ol>
      <li><strong>Answer</strong> — Explanation</li>
    </ol>
  </div>
</details>
```

### `.tip-pill` / `.good-pill`
Inline tip badges. Yellow = warning/trap. Green = good practice.
```html
<span class="tip-pill">⚠ Common mistake or trap</span>
<span class="good-pill">✓ Good practice or correct example</span>
```

### `.note-box`
Blue info/context box for teacher notes or important reminders.
```html
<div class="note-box">
  <strong>📌 Note Title</strong>
  Supporting information here.
</div>
```

### `.criteria-card` grid
Used for marking criteria (4 × 25% cards). See Writing/Speaking lessons.

### `.answer-compare`
Side-by-side weak vs. strong answer comparison. See Speaking/Writing lessons.
```html
<div class="answer-compare">
  <div class="bad-answer">
    <div class="alabel">✗ Weak Answer</div>
    Answer text...
  </div>
  <div class="good-answer">
    <div class="alabel">✓ Strong Answer</div>
    Answer text...
  </div>
</div>
```

### `.section` block
Each lesson topic/section. Always includes a `.section-header` with number + tag + title.
```html
<div class="section" id="unique-id">
  <div class="section-header">
    <div class="section-num">1</div>
    <div class="section-title-block">
      <div class="tag">Category Label</div>
      <h2>Section Title</h2>
    </div>
  </div>
  <!-- cards, passages, exercises here -->
</div>
```

---

## Lesson Structure (every lesson follows this pattern)

1. **What is it?** — explanation of the skill/task type
2. **Marking criteria** — how it is scored (4 × 25% where relevant)
3. **Strategy / How to approach it** — step-by-step method + tip pills
4. **Weak vs. Strong examples** — answer comparison where applicable
5. **Practice** — passage + exercise + collapsible answer key
6. **Self-assessment checklist** — student review after completing

---

## Planned Lessons (not yet built)

Based on the IELTS Liz site structure, these lessons are still to be created:

| Skill | Topic | Source |
|-------|-------|--------|
| Speaking | Part 2 — Cue Card | https://ieltsliz.com/ielts-speaking-free-lessons-essential-tips/ |
| Speaking | Part 3 — Discussion | https://ieltsliz.com/ielts-speaking-free-lessons-essential-tips/ |
| Writing | Task 2 — Essay | https://ieltsliz.com/ielts-writing-task-2/ |
| Listening | All question types | https://ieltsliz.com/ielts-listening/ |
| Vocabulary | Topic-based vocab | https://ieltsliz.com/vocabulary/ |

---

## Suggested Site Architecture (for VS Code build)

```
/index.html               → Home / lesson dashboard
/lessons/
  reading-task1.html
  speaking-part1.html
  speaking-part2.html
  speaking-part3.html
  writing-task1.html
  writing-task2.html
  listening.html
/assets/
  style.css               → Extract shared CSS into one file
  template.html           → Blank lesson template
README.md                 → This file
```

### Recommended next steps in VS Code

1. Extract the shared CSS from any lesson file into `/assets/style.css`
2. Convert all lesson files to link to that shared stylesheet (`<link rel="stylesheet" href="../assets/style.css">`)
3. Build `index.html` as a dashboard — cards linking to each lesson, using the same design system
4. Add a shared `<nav>` across all pages for site-wide navigation
5. Add new lessons by copying `template.html` into `/lessons/` and filling in content

---

## Content Source

All lesson content is sourced from **IELTS Liz** (https://ieltsliz.com), a free IELTS preparation resource. When building new lessons, pull from the main skill page and follow internal links for deeper content (model answers, vocabulary pages, strategy breakdowns).

---

## Notes for Claude in VS Code

- The design system is fully self-contained in each HTML file's `<style>` block
- All components are CSS-only — no JavaScript frameworks required
- The site is intentionally static HTML — no build tools needed
- Mobile responsiveness is handled via CSS Grid with `@media (max-width: 600px)` breakpoints
- The `fadeUp` animation on `.section` elements is pure CSS — no JS
