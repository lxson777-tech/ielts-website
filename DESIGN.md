---
name: IELTS is EZ student workspace
description: A calm study desk with capsule navigation and a clear next step.
colors:
  surface: "#fffefa"
  surface-alt: "#f5f5f0"
  border: "#dddfd6"
  ink: "#263c35"
  ink-muted: "#616c64"
  brand: "#b94b36"
  brand-hover: "#9b3c29"
  brand-tint: "#faebe4"
  reading: "#b94b36"
  writing: "#227454"
  speaking: "#7453aa"
  listening: "#226f93"
  vocabulary: "#8b681a"
  next-action: "#e0ebbc"
typography:
  headline:
    fontFamily: "Bricolage Grotesque Variable, Plus Jakarta Sans Variable, ui-sans-serif, system-ui, sans-serif"
  body:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
rounded:
  capsule: "999px"
  practice-tile: "20px"
  next-step: "22px"
  lesson-card: "14px"
components:
  next-step:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.next-step}"
    padding: "30px 32px"
  next-action:
    backgroundColor: "{colors.next-action}"
    textColor: "{colors.ink}"
    rounded: "{rounded.capsule}"
    padding: "11px 19px"
---

# Design System: IELTS is EZ

## Overview

The student workspace is a calm study desk. Give the learner a clear next action, readable teaching material, and progress drawn from their real saved activity. The built direction is warm, restrained, and spacious. `src/styles/workspace-redesign.css` owns the scoped `.workspace-v2` treatment; existing components continue to own learning behavior.

The marketing homepage remains a separate design. Its warm white, coral, Plus Jakarta Sans and Inter identity, native-scroll road story with one travelling student, four skill panels, target-band destination, and labeled Coach sample feedback are retained. This workspace redesign does not replace that homepage. Preserve its generated student artwork and native scrolling; do not introduce camera following or required game interactions. The brand promise remains that IELTS feels easier when learners know the structure. AI claims must describe actual configured capabilities and estimated feedback.

## Colors

Workspace colors above are extracted from the implementation. Forest ink carries text, active navigation, and the featured study task. Rust marks the brand and Reading; muted green, violet, blue, and ochre distinguish the other study areas. Warm white surfaces sit on a pale neutral canvas. The pale green next-action button is specific to the dark featured task.

The homepage retains its separate warm white `#F8F7F3`, ink `#202522`, coral `#E55D48`, muted text `#69706C`, and quiet borders around `#DEDFD7`.

## Typography

Workspace display type uses Bricolage Grotesque with Plus Jakarta Sans and system fallbacks; body and interface copy use Inter. Hub headings scale from 30px to 42px at weight 600. The dashboard greeting scales from 30px to 40px at weight 650. Lesson titles scale from 32px to 47px. Lesson body text is 16px with 1.85 line height, becoming 15px on phones; paragraphs remain at most 75ch wide where styled.

## Layout

Desktop uses a centered capsule header, not a left rail. Its inner shell is 68px tall and at most 1192px wide. Standard page width is 1032px, wide pages use 1176px, and the writing trainer may use 1280px. The dashboard places the next task and schedule beside a 285px context column. Practice uses two columns; lesson content reads as a document.

Below 720px, the header retains the wordmark and account control while five destinations move to a floating 65px bottom dock. Safe-area spacing and extra main-content padding keep the dock clear of content. Dashboard, Practice, test cards, and explanatory disclosures become single-column layouts. Between 720px and 1020px, navigation spacing tightens and tab icons disappear.

## Elevation & Depth

Most content is flat, separated by fine borders and spacing. The capsule header has a restrained shadow that strengthens on scroll; the mobile dock is lifted above the page. Practice tiles receive a small skill-colored hover shadow. Lesson sections and dashboard context rows do not need nested elevated cards. Reduced-motion preferences shorten transitions and disable smooth scrolling.

## Shapes

Navigation, active tabs, and primary task actions are fully rounded capsules. Practice tiles use 20px corners, the featured task uses 22px (19px on phones), and lesson cards use 14px. Schedule rows and document sections rely on separators instead of rounded containers.

## Components

- Navigation: preserve the existing five workspace destinations, route matching, persistent header behavior, active indicator, account menu, keyboard focus, and skip link. Active tabs use forest ink with warm white text.
- Dashboard: feature the first unfinished item from the real study plan, which may be a lesson, drill, test, vocabulary activity, review, or mock. Keep the complete daily schedule, target, saved progress, and plan controls accessible. Do not hard-code a sample next lesson.
- Practice and Tests: lead with available activities. Keep the shared explanation in a native `details` disclosure headed “What's the difference between Practice and Tests?” Both sets of explanatory bullets and the cross-link remain available.
- Lessons: retain breadcrumbs, skill and duration metadata, teaching sections, examples, exercises, completion controls, and quizzes. Vocabulary quick check remains a normal-flow button with its existing expandable answer panel, rather than floating decoration.
- Course and vocabulary: retain all destinations and content. Course titles wrap instead of truncating; vocabulary tiles use quiet borders and skill-colored hover feedback.

## Do's and Don'ts

- Do preserve lesson bodies, test data, learning routes, interactive behavior, and saved progress when simplifying presentation.
- Do reveal supporting explanations on demand while keeping every meaningful piece of content reachable.
- Do use the actual running app for review and check desktop, phone, keyboard, and reduced-motion behavior.
- Don't mistake a build or test pass for completed visual verification.
- Don't apply workspace tokens to the marketing homepage or describe that homepage as replaced.
- Don't add fake counters, testimonials, official-score claims, guarantees, glowing AI decoration, or unimplemented commercial promises.
- Don't publish this local redesign until Alex approves the running result.

## Approved for future work

Alex approved this direction on 2026-09-16 for ongoing IELTS platform work. Reuse this system for future features and new material. Primary practice actions use a filled forest capsule with cream text, at least 48px height, and visible hover and keyboard focus states.

## Mr EZ design (2026-09-21, local preview)
Only tutor surfaces adopt the approved human teacher illustration, Manrope headings, forest #193335, apricot #efa260 and warm cream #fffcf6. The rest of the platform keeps its existing design. The approved character sheet is cropped with CSS for face portraits, including thinking and celebrating poses. Existing mood events, image failure fallback, reduced motion, authentication and tutor logic remain intact. Preview awaits Alex's review before deployment.
