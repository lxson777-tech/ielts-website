# Graph Report - .  (2026-07-07)

## Corpus Check
- Large corpus: 183 files · ~585,083 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 735 nodes · 1213 edges · 47 communities (42 shown, 5 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 88 edges (avg confidence: 0.79)
- Token cost: 31,000 input · 405,917 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Reading Test Player & Sessions|Reading Test Player & Sessions]]
- [[_COMMUNITY_Writing Grader Engine|Writing Grader Engine]]
- [[_COMMUNITY_ReadingListeningVocab Lesson Content|Reading/Listening/Vocab Lesson Content]]
- [[_COMMUNITY_Accessibility Scanner Script|Accessibility Scanner Script]]
- [[_COMMUNITY_Writing Lessons & Materials Workflow|Writing Lessons & Materials Workflow]]
- [[_COMMUNITY_IELTS Materials Scraper Tool|IELTS Materials Scraper Tool]]
- [[_COMMUNITY_Accessibility Audit Skill & References|Accessibility Audit Skill & References]]
- [[_COMMUNITY_Core UI Components & Lesson Registry|Core UI Components & Lesson Registry]]
- [[_COMMUNITY_Progress Tracking & Score Analytics|Progress Tracking & Score Analytics]]
- [[_COMMUNITY_UI Design Skills (AceternityAnimation)|UI Design Skills (Aceternity/Animation)]]
- [[_COMMUNITY_Color Contrast Checker Script|Color Contrast Checker Script]]
- [[_COMMUNITY_Package Dependencies (AstroReact)|Package Dependencies (Astro/React)]]
- [[_COMMUNITY_Lesson Pages & Test Routing|Lesson Pages & Test Routing]]
- [[_COMMUNITY_Typography Skill & Web Quality|Typography Skill & Web Quality]]
- [[_COMMUNITY_Listening & Vocabulary Data Layer|Listening & Vocabulary Data Layer]]
- [[_COMMUNITY_WritingSpeakingReading Lesson Pages|Writing/Speaking/Reading Lesson Pages]]
- [[_COMMUNITY_Design System & Deployment Docs|Design System & Deployment Docs]]
- [[_COMMUNITY_Speaking Lesson Content|Speaking Lesson Content]]
- [[_COMMUNITY_Essay Grader Worker Backend|Essay Grader Worker Backend]]
- [[_COMMUNITY_Reading Practice Quiz|Reading Practice Quiz]]
- [[_COMMUNITY_Reading Data Layer & Pages|Reading Data Layer & Pages]]
- [[_COMMUNITY_Speaking & Timed Test Images|Speaking & Timed Test Images]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Vocabulary & Word of the Day|Vocabulary & Word of the Day]]
- [[_COMMUNITY_Speaking Data Layer|Speaking Data Layer]]
- [[_COMMUNITY_Writing Data Layer|Writing Data Layer]]
- [[_COMMUNITY_Writing Task Illustrations|Writing Task Illustrations]]
- [[_COMMUNITY_Listening & Reading Illustrations|Listening & Reading Illustrations]]
- [[_COMMUNITY_Agent Runner & Utils Tools|Agent Runner & Utils Tools]]
- [[_COMMUNITY_Animation Principles Skills|Animation Principles Skills]]
- [[_COMMUNITY_Paragraph & Sentence Task Images|Paragraph & Sentence Task Images]]
- [[_COMMUNITY_Web Quality Analyze Script|Web Quality Analyze Script]]
- [[_COMMUNITY_Brand & Hero Images|Brand & Hero Images]]
- [[_COMMUNITY_Diagram Labelling Images|Diagram Labelling Images]]
- [[_COMMUNITY_Quiz & Test Start Images|Quiz & Test Start Images]]
- [[_COMMUNITY_Agent Framework Docs (CLAUDE.md)|Agent Framework Docs (CLAUDE.md)]]
- [[_COMMUNITY_Matching Task Images|Matching Task Images]]
- [[_COMMUNITY_Lesson Quiz Script|Lesson Quiz Script]]
- [[_COMMUNITY_Rose Diagram Image|Rose Diagram Image]]
- [[_COMMUNITY_TrueFalseNot Given Images|True/False/Not Given Images]]
- [[_COMMUNITY_Extract Lesson Bodies Tool|Extract Lesson Bodies Tool]]
- [[_COMMUNITY_Find Skills Skill|Find Skills Skill]]
- [[_COMMUNITY_Multiple Choice Images|Multiple Choice Images]]
- [[_COMMUNITY_Vocabulary Illustration|Vocabulary Illustration]]

## God Nodes (most connected - your core abstractions)
1. `../../../layouts/LessonLayout.astro` - 28 edges
2. `_find()` - 23 edges
3. `../components/Nav.astro` - 21 edges
4. `a11y-audit Skill` - 19 edges
5. `withBase()` - 18 edges
6. `main()` - 17 edges
7. `scan_file()` - 15 edges
8. `CSS Animation Creator Skill` - 15 edges
9. `Writing Section Overview` - 14 edges
10. `../../layouts/BaseLayout.astro` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Modern SaaS Design Category` --semantically_similar_to--> `IELTS Portal Design System`  [INFERRED] [semantically similar]
  .agents/skills/modern-web-design/references/design-systems.md → README.md
- `Typography Skill` --semantically_similar_to--> `Core Web Vitals (LCP, INP, CLS)`  [INFERRED] [semantically similar]
  .agents/skills/typography/SKILL.md → .agents/skills/web-quality-audit/SKILL.md
- `Python Requirements (anthropic, google-auth, etc.)` --shares_data_with--> `agent_runner.py Agentic Loop`  [INFERRED]
  requirements.txt → CLAUDE.md
- `scrape_ielts_materials.py` --shares_data_with--> `Writing Section Overview`  [INFERRED]
  workflows/update_ielts_materials.md → src/content/lesson-bodies/writing.html
- `Essay Grader Worker` --implements--> `Four Writing Marking Criteria`  [INFERRED]
  workers/grade-essay/README.md → src/content/lesson-bodies/writing.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **A11y Scan-Fix-Verify Audit Pipeline** — _agents_skills_a11y_audit_skill_a11y_audit, _agents_skills_a11y_audit_skill_a11y_scanner_py, _agents_skills_a11y_audit_skill_contrast_checker_py, _agents_skills_a11y_audit_references_audit_report_template_audit_report_template, _agents_skills_a11y_audit_references_ci_cd_integration_ci_cd_integration [EXTRACTED 1.00]
- **WCAG 2.2 Compliance Reference Set** — _agents_skills_a11y_audit_skill_wcag_2_2, _agents_skills_a11y_audit_references_wcag_quick_ref_wcag_quick_ref, _agents_skills_a11y_audit_references_wcag_22_new_criteria_wcag_22_new_criteria, _agents_skills_a11y_audit_references_testing_checklist_testing_checklist [INFERRED 0.85]
- **React Animation Stack (Next.js + Tailwind + Framer Motion)** — _agents_skills_aceternity_ui_skill_aceternity_ui, _agents_skills_css_animation_creator_skill_css_animation_creator, _agents_skills_aceternity_ui_skill_framer_motion, _agents_skills_aceternity_ui_skill_tailwind_css, _agents_skills_aceternity_ui_skill_next_js [INFERRED 0.85]
- **Disney's 12 Principles Applied Across Interaction & Education Skills** — _agents_skills_education_learning_skill_disney_12_principles, _agents_skills_hover_interactions_skill_disney_12_principles, _agents_skills_css_animation_creator_references_transitions_easing_functions [INFERRED 0.85]
- **Typography Skill and its Reference Documentation Set** — _agents_skills_typography_skill_typography, _agents_skills_typography_references_masters_masters, _agents_skills_typography_references_variable_fonts_variable_fonts, _agents_skills_typography_references_font_loading_font_loading, _agents_skills_typography_references_opentype_features_opentype, _agents_skills_typography_references_fluid_typography_fluid_typography, _agents_skills_typography_references_tailwind_integration_tailwind_typography, _agents_skills_typography_references_internationalization_i18n [EXTRACTED 1.00]
- **IELTS Portal Build and GitHub Pages Deployment Pipeline** — readme_ielts_portal, readme_github_pages_deployment, _github_workflows_deploy_github_pages_deploy [EXTRACTED 1.00]
- **IELTS Listening Module (Overview + Four Section Lessons)** — src_content_lesson_bodies_listening_ielts_listening_overview, src_content_lesson_bodies_listening_section1_section_1_everyday_conversation, src_content_lesson_bodies_listening_section2_section_2_monologue_maps, src_content_lesson_bodies_listening_section3_section_3_academic_discussion, src_content_lesson_bodies_listening_section4_section_4_academic_lecture [EXTRACTED 1.00]
- **IELTS Reading Module (Overview + Seven Question-Type Lessons)** — src_content_lesson_bodies_reading_task1_ielts_reading_overview, src_content_lesson_bodies_reading_tfng_tfng_lesson, src_content_lesson_bodies_reading_mc_multiple_choice_lesson, src_content_lesson_bodies_reading_diagram_diagram_labelling_lesson, src_content_lesson_bodies_reading_headings_matching_headings_lesson, src_content_lesson_bodies_reading_sentence_sentence_completion_lesson, src_content_lesson_bodies_reading_para_matching_paragraphs_lesson, src_content_lesson_bodies_reading_cat_categorisation_lesson [EXTRACTED 1.00]
- **IELTS Speaking Module (Overview + Three Part Lessons)** — src_content_lesson_bodies_speaking_ielts_speaking_overview, src_content_lesson_bodies_speaking_part1_speaking_part_1_interview, src_content_lesson_bodies_speaking_part2_speaking_part_2_cue_card, src_content_lesson_bodies_speaking_part3_speaking_part_3_discussion [EXTRACTED 1.00]
- **Task 1 Lesson Suite (universal method + type lessons)** — src_content_lesson_bodies_writing_method_how_to_answer_task_1, src_content_lesson_bodies_writing_charts_charts_graphs_tables, src_content_lesson_bodies_writing_process_process_diagrams, src_content_lesson_bodies_writing_maps_maps_and_plans, src_content_lesson_bodies_writing_letters_letters, src_content_lesson_bodies_writing_method_four_paragraph_method [EXTRACTED 1.00]
- **Task 2 Essay Question Types** — src_content_lesson_bodies_writing_opinion_opinion_essays, src_content_lesson_bodies_writing_discussion_discussion_essays, src_content_lesson_bodies_writing_problem_problem_solution_essays, src_content_lesson_bodies_writing_twopart_two_part_questions, src_content_lesson_bodies_writing_ielts_writing_task_2 [EXTRACTED 1.00]
- **Essay Grading Pipeline (site -> Worker -> Gemini, with offline fallback)** — src_content_lesson_bodies_writing_essay_checker, workers_grade_essay_readme_essay_grader_worker, workers_grade_essay_readme_gemini_flash, workers_grade_essay_readme_public_grader_url, workers_grade_essay_readme_offline_sample_grader [INFERRED 0.85]

## Communities (47 total, 5 thin omitted)

### Community 0 - "Reading Test Player & Sessions"
Cohesion: 0.05
Nodes (57): asset(), DiagramFigure(), findTextRange(), InstructionsScreen(), normEvidence(), Numbered, numberQuestions(), pad() (+49 more)

### Community 1 - "Writing Grader Engine"
Cohesion: 0.09
Nodes (37): WritingTester(), getWritingPrompt(), WRITING_PROMPTS, nextInRotation(), getGrader(), gradeEssay(), RemoteGrader, stub (+29 more)

### Community 2 - "Reading/Listening/Vocab Lesson Content"
Cohesion: 0.06
Nodes (49): IELTS Listening Overview Lesson, Listening Score-to-Band Conversion Table, Form / Note Completion (Question Type), Listening Section 1 — Everyday Conversation Lesson, Simulation — Sports Centre Registration, Simulation — Community Centre Tour, Location Language (Prepositional Phrases for Maps), Map / Plan Labelling (Question Type) (+41 more)

### Community 3 - "Accessibility Scanner Script"
Cohesion: 0.09
Nodes (43): _attrs(), build_parser(), check_aria_hidden_focusable(), check_aria_live_missing(), check_autofocus_misuse(), check_click_no_keyboard(), check_empty_links_line(), check_fieldset_legend() (+35 more)

### Community 4 - "Writing Lessons & Materials Workflow"
Cohesion: 0.11
Nodes (34): Charts, Graphs & Tables Lesson, Trend Language, Discussion Essays Lesson, Voice-Signalling Language, Essay Checker, Four Writing Marking Criteria, IELTS Writing Task 1, IELTS Writing Task 2 (+26 more)

### Community 5 - "IELTS Materials Scraper Tool"
Cohesion: 0.12
Nodes (33): build_reading_quiz_html(), build_samples_section(), build_section(), build_speaking_quiz_html(), build_writing_quiz_html(), _esc(), extract_questions(), extract_tips() (+25 more)

### Community 6 - "Accessibility Audit Skill & References"
Cohesion: 0.11
Nodes (33): Sample Contrast Checker Output, Sample A11y Scan Report, ARIA Patterns & Keyboard Interaction Reference, Focus Management (Trap, Restoration, Skip Link), ARIA Landmark Roles, ARIA Live Regions, Audit Report Template, CI/CD Integration for Accessibility Auditing (+25 more)

### Community 7 - "Core UI Components & Lesson Registry"
Cohesion: 0.11
Nodes (28): ../../components/WritingTester, ../data/lessons, ../lib/progress, ../scripts/lesson-quiz, ../styles/global.css, ../../components/Badge.astro, tones, ../components/Button.astro (+20 more)

### Community 8 - "Progress Tracking & Score Analytics"
Cohesion: 0.15
Nodes (23): BandChart(), fmtDate(), Row, ScoreHistory(), testTitle(), LABELS, tone(), TypeAnalytics() (+15 more)

### Community 9 - "UI Design Skills (Aceternity/Animation)"
Cohesion: 0.13
Nodes (24): Background Beams Component, Aceternity UI Component Catalog, Aceternity UI Quick Start Guide, Aceternity shadcn Registry (@aceternity), Aceternity UI Skill, Framer Motion, Next.js (App Router), shadcn CLI (+16 more)

### Community 10 - "Color Contrast Checker Script"
Cohesion: 0.16
Nodes (23): build_parser(), color_to_hex(), contrast_ratio(), evaluate_contrast(), extract_css_pairs(), format_result_human(), format_suggestions_human(), main() (+15 more)

### Community 11 - "Package Dependencies (Astro/React)"
Cohesion: 0.08
Nodes (23): dependencies, astro, @astrojs/react, @fontsource-variable/inter, @fontsource-variable/plus-jakarta-sans, react, react-dom, tailwindcss (+15 more)

### Community 12 - "Lesson Pages & Test Routing"
Cohesion: 0.12
Nodes (16): ../../components/ScoreHistory, ../../components/TestPlayer, ../../components/TypeAnalytics, ../../content/lesson-bodies/listening.html?raw, ../../content/lesson-bodies/reading-task1.html?raw, ../../content/lesson-bodies/speaking.html?raw, ../../data/tests, ../../lib/rotation (+8 more)

### Community 13 - "Typography Skill & Web Quality"
Cohesion: 0.11
Nodes (20): clamp() Fluid Type Scale, Fluid Typography Reference, FOIT vs FOUT, Font Loading & Performance Reference, Internationalization & RTL Typography Reference, RTL Typography & CSS Logical Properties, Robert Bringhurst, Matthew Butterick (+12 more)

### Community 14 - "Listening & Vocabulary Data Layer"
Cohesion: 0.14
Nodes (14): ../../../data/listening, ../../../data/vocabulary, ../components/Nav.astro, lessonsBySkill(), getListeningPart(), LISTENING_PARTS, ListeningPart, getVocabularyPart() (+6 more)

### Community 15 - "Writing/Speaking/Reading Lesson Pages"
Cohesion: 0.12
Nodes (10): ../../content/lesson-bodies/writing.html?raw, ../../lib/url, ../../../components/EssayCheckerCta.astro, hub, target, target, target, body (+2 more)

### Community 16 - "Design System & Deployment Docs"
Cohesion: 0.14
Nodes (16): Modern Web Design Component Templates Library, Modern Web Design Systems Reference, Minimalist Professional Design Category, Modern SaaS Design Category, Design System Foundation (Style Categories), Modern Web Design Creator Skill, Deploy to GitHub Pages Workflow, PUBLIC_GRADER_URL Env Variable (+8 more)

### Community 17 - "Speaking Lesson Content"
Cohesion: 0.23
Nodes (14): Fluency & Coherence (Criterion), Grammatical Range & Accuracy (Criterion), IELTS Speaking Overview Lesson, Lexical Resource (Criterion), Answer + Reason + Example/Detail Formula, IELTS Up (External Resource, ielts-up.com), Speaking Part 1 — Interview Lesson, Cue Card (Part 2 Task Format) (+6 more)

### Community 18 - "Essay Grader Worker Backend"
Cohesion: 0.23
Nodes (13): CC_SCALE(), corsHeaders(), CRITERION_KEYS, Env, fetch(), GradeRequest, json(), RESPONSE_SCHEMA (+5 more)

### Community 19 - "Reading Practice Quiz"
Cohesion: 0.24
Nodes (11): answerLabel(), asset(), isRight(), PracticeQuiz(), PRAISE, Props, scoreMessage(), PracticeQuestion (+3 more)

### Community 20 - "Reading Data Layer & Pages"
Cohesion: 0.22
Nodes (8): ../../../components/PracticeQuiz, ../../../data/reading, ../../../data/reading-practice, getReadingPart(), READING_PARTS, ReadingPart, body, overviewUrl

### Community 21 - "Speaking & Timed Test Images"
Cohesion: 0.24
Nodes (11): Exam Time Management, Timed Reading Practice Test, Timed Test Illustration (stopwatch, answer sheet, pencil), Speaking Part 1 Illustration (overlapping speech bubbles with microphone), IELTS Speaking Part 1: Introduction and Interview, Speaking Part 2 Illustration (cue card, stopwatch, microphone), IELTS Speaking Part 2: Long Turn with Cue Card, Timed Preparation and Speaking (1 min prep, 2 min talk) (+3 more)

### Community 22 - "TypeScript Config"
Cohesion: 0.20
Nodes (9): compilerOptions, baseUrl, jsx, jsxImportSource, paths, exclude, extends, include (+1 more)

### Community 23 - "Vocabulary & Word of the Day"
Cohesion: 0.25
Nodes (7): ../../content/lesson-bodies/vocabulary.html?raw, ../../data/words, ../components/WordOfTheDay.astro, WORDS, WotdEntry, body, quizWords

### Community 24 - "Speaking Data Layer"
Cohesion: 0.28
Nodes (6): ../../../data/speaking, getSpeakingPart(), SPEAKING_PARTS, SpeakingPart, body, overviewUrl

### Community 25 - "Writing Data Layer"
Cohesion: 0.28
Nodes (6): ../../../data/writing, getWritingPart(), WRITING_PARTS, WritingPart, body, overviewUrl

### Community 26 - "Writing Task Illustrations"
Cohesion: 0.28
Nodes (9): Automated Essay Grading and Feedback, IELTS Band Score Badge Motif, Essay Checker Illustration (Magnifier over Essay, Band 7.0 Badge), Start Task Illustration (Hand Writing, Band 7.5 Badge), Starting a Writing Practice Task, IELTS Task 1 Data/Chart Report Writing, Writing Task 1 Illustration (Clipboard with Charts), IELTS Task 2 Essay Writing and Idea Generation (+1 more)

### Community 27 - "Listening & Reading Illustrations"
Cohesion: 0.29
Nodes (7): IELTS Listening Section (audio comprehension), Listening Section Illustration (headphones with waveform), Ant Anatomy (antennae, mandibles, head, thorax, petiole, gaster with orange sting tip, six legs), Ant Diagram (unlabeled side-view ant illustration), Reading Label-the-Diagram Exercise, IELTS Reading Section (close reading / scanning for detail), Reading Section Illustration (open book with magnifying glass)

### Community 28 - "Agent Runner & Utils Tools"
Cohesion: 0.38
Nodes (3): _call_with_retry(), run_agent(), require_env()

### Community 29 - "Animation Principles Skills"
Cohesion: 0.33
Nodes (6): CSS Transitions Reference, Easing Functions (cubic-bezier), Disney's 12 Animation Principles (Education Context), Education & Learning Animation Principles Skill, Disney's 12 Animation Principles (Hover Context), Hover Interaction Animations Skill

### Community 30 - "Paragraph & Sentence Task Images"
Cohesion: 0.47
Nodes (6): Paragraph Matching Illustration (para.png), Paragraph Matching / Locating Information, Scanning a Text for Key Information, Missing Word as Puzzle Piece Metaphor, Sentence Gap-Fill Illustration (sentence.png), Sentence Completion / Gap Fill

### Community 31 - "Web Quality Analyze Script"
Cohesion: 0.60
Nodes (3): analyze_html(), fail(), analyze.sh script

### Community 32 - "Brand & Hero Images"
Cohesion: 0.40
Nodes (5): IELTS Brand Monogram / Indigo Brand Color #4f46e5, Site Favicon (indigo 'IE' monogram), Hero Illustration (student at laptop), Online IELTS Study (laptop, books, listening/reading/speaking bubbles), Score Progress (upward-trending line chart panel)

### Community 33 - "Diagram Labelling Images"
Cohesion: 0.40
Nodes (5): Bee Anatomy (head, thorax, striped abdomen, wings, antennae, legs), Cartoon Honeybee Illustration, IELTS Reading Diagram-Labelling Task, Diagram Label Completion (blank callout boxes to fill), Diagram with Location Pins and Blank Label Boxes

### Community 34 - "Quiz & Test Start Images"
Cohesion: 0.50
Nodes (5): Multiple-Choice Quiz / Practice Exercise, Quiz Answer Sheet Illustration (quiz.png), Timed Test Start Illustration (start-test.png), Exam Time Management, Timed 60-Minute IELTS Reading Test

### Community 36 - "Agent Framework Docs (CLAUDE.md)"
Cohesion: 0.50
Nodes (4): agent_runner.py Agentic Loop, graphify Knowledge Graph Rules, WAT Framework (Workflows, Agents, Tools), Python Requirements (anthropic, google-auth, etc.)

### Community 37 - "Matching Task Images"
Cohesion: 0.50
Nodes (4): Categorising / Matching Information into Groups, Two-Basket Information Sorting Illustration, IELTS Reading Matching Headings Task, Paragraphs-to-Headings Matching Illustration

### Community 39 - "Rose Diagram Image"
Cohesion: 1.00
Nodes (3): Diagram Labelling Exercise Stimulus, Rose Flower Illustration (rose-diagram.png), Rose Flower with Stem, Leaf and Sepals

### Community 40 - "True/False/Not Given Images"
Cohesion: 1.00
Nodes (3): TFNG Lesson Illustration (check, cross, question mark badges), Three-Way Answer Options (True / False / Not Given), True/False/Not Given Question Type

## Ambiguous Edges - Review These
- `Rose Flower Illustration (rose-diagram.png)` → `Diagram Labelling Exercise Stimulus`  [AMBIGUOUS]
  public/pics/reading/rose-diagram.png · relation: references
- `Rose Flower with Stem, Leaf and Sepals` → `Diagram Labelling Exercise Stimulus`  [AMBIGUOUS]
  public/pics/reading/rose-diagram.png · relation: conceptually_related_to

## Knowledge Gaps
- **187 isolated node(s):** `name`, `type`, `version`, `private`, `dev` (+182 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Rose Flower Illustration (rose-diagram.png)` and `Diagram Labelling Exercise Stimulus`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Rose Flower with Stem, Leaf and Sepals` and `Diagram Labelling Exercise Stimulus`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `withBase()` connect `Lesson Pages & Test Routing` to `Writing Grader Engine`, `Core UI Components & Lesson Registry`, `Listening & Vocabulary Data Layer`, `Writing/Speaking/Reading Lesson Pages`, `Reading Data Layer & Pages`, `Vocabulary & Word of the Day`, `Speaking Data Layer`, `Writing Data Layer`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `../../../layouts/LessonLayout.astro` connect `Core UI Components & Lesson Registry` to `Progress Tracking & Score Analytics`, `Lesson Pages & Test Routing`, `Listening & Vocabulary Data Layer`, `Writing/Speaking/Reading Lesson Pages`, `Reading Data Layer & Pages`, `Vocabulary & Word of the Day`, `Speaking Data Layer`, `Writing Data Layer`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `../components/Nav.astro` connect `Listening & Vocabulary Data Layer` to `Core UI Components & Lesson Registry`, `Writing/Speaking/Reading Lesson Pages`, `Reading Data Layer & Pages`, `Speaking Data Layer`, `Writing Data Layer`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `A single accessibility finding.`, `Parse HTML/JSX attribute string into a dict.`, `Trim a line for display as a code snippet.` to the rest of the system?**
  _224 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Reading Test Player & Sessions` be split into smaller, more focused modules?**
  _Cohesion score 0.05150905432595573 - nodes in this community are weakly interconnected._