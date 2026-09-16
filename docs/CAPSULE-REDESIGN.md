# Capsule workspace redesign

## Scope and review

Local work lives on `codex/capsule-redesign` in `C:/Users/Alex/Desktop/ielts-redesign`. It starts from `9ab6a78` plus a snapshot of in-progress content improvements from `ielts-deploy`. This is not a live deployment. The existing marketing homepage is outside this workspace redesign and remains intact.

Review the built workspace at [dashboard preview](http://127.0.0.1:4331/ielts-website/dashboard). The development server uses port 4330. Publishing requires Alex's approval after local review.

## Built direction

- Warm neutral canvas, forest ink, restrained skill accents, Bricolage Grotesque headings, and Inter reading text. Exact extracted values and application rules are in `DESIGN.md`; implementation is in `src/styles/workspace-redesign.css`.
- A desktop capsule header and mobile bottom dock retain the existing five destinations and account menu. The active destination stays visibly selected during workspace navigation.
- The dashboard emphasizes the next unfinished study-plan item with its real title, duration, and destination. The full daily schedule, target, context, and skill progress remain present.
- Practice and Tests lead with the activity choices. Their shared explanation is preserved in an expandable native disclosure, including both modes' explanatory bullets and the cross-link.
- Lessons use a readable document layout. Vocabulary quick check remains in normal flow with the original interactive answer panel. Course titles wrap and supporting examples and exercises retain distinct styling.

## Preservation contract

The request is a broad visual redesign with full content preservation. Keep all instructional text, lesson sections, questions, answer choices, explanations, model responses, test catalogs, routes, saved progress, and working controls. Moving supporting guidance into a disclosure is acceptable only when it remains reachable. Do not replace real plan state with sample content or delete teaching material to make a screen shorter. Retain the incoming content-improvement snapshot when reconciling changes.

## Verification status

Reported checks for this worktree: 288 tests passed, type check with 0 errors, and a successful build producing 515 pages. Runtime checks additionally passed desktop and phone navigation, writing task selection and text entry, the lesson vocabulary quiz, lesson completion and undo, and test rotation after client navigation. The checked pages had no horizontal overflow at 390px and no browser errors. Screenshots are in artifacts/redesign. Paid grading and microphone sessions were not invoked during this visual redesign.
