/* The test-result dialog's keyboard contract (audit 2026-09-29, F07).
 *
 * After a full test or a drill, the score dialog covered the page but Tab
 * walked into the passage and review controls behind it, Escape did nothing
 * and the dialog had no accessible name. The fix is src/lib/a11y/modal-dialog.ts
 * wired into TestPlayer's score overlay.
 *
 * What this file can prove without a browser: the trap's index arithmetic,
 * the key mapping, and that TestPlayer's markup keeps the contract (name tied
 * to the "Your Score" heading, the dialog role, Escape and "Review Answers"
 * closing into the review, focus handed back to the Score button, the inline
 * unanswered-question warning left as an inline alert). The DOM behaviour
 * itself (focus really moving, Tab really staying inside, background inert)
 * is proved in a real browser by Builder D's keyboard run, at 1440x900 and
 * 390x844 in English and Russian, because this suite has no DOM.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dialogKeyAction, nextTrappedIndex } from '../src/lib/a11y/modal-dialog.ts';

const read = (...parts: string[]) => readFileSync(join(import.meta.dirname, '..', ...parts), 'utf8');
const player = read('src', 'components', 'TestPlayer.tsx');
const writing = read('src', 'components', 'WritingTester.tsx');

test('Tab from the last control wraps to the first, Shift+Tab from the first wraps to the last', () => {
  assert.equal(nextTrappedIndex(4, 3, false), 0);
  assert.equal(nextTrappedIndex(4, 0, true), 3);
  assert.equal(nextTrappedIndex(4, 1, false), 2);
  assert.equal(nextTrappedIndex(4, 2, true), 1);
});

test('from the panel itself (or from outside it) Tab enters at the first control, Shift+Tab at the last', () => {
  assert.equal(nextTrappedIndex(3, -1, false), 0);
  assert.equal(nextTrappedIndex(3, -1, true), 2);
  // A stale index (the control list changed underneath) re-enters too.
  assert.equal(nextTrappedIndex(3, 7, false), 0);
});

test('a dialog with nothing to focus keeps focus on its panel', () => {
  assert.equal(nextTrappedIndex(0, -1, false), -1);
  assert.equal(nextTrappedIndex(0, -1, true), -1);
});

test('one control: Tab and Shift+Tab both stay on it', () => {
  assert.equal(nextTrappedIndex(1, 0, false), 0);
  assert.equal(nextTrappedIndex(1, 0, true), 0);
});

test('Escape closes, Tab traps in either direction, every other key is left alone', () => {
  assert.equal(dialogKeyAction('Escape', false), 'close');
  assert.equal(dialogKeyAction('Esc', false), 'close');
  assert.equal(dialogKeyAction('Tab', false), 'trap-forward');
  assert.equal(dialogKeyAction('Tab', true), 'trap-backward');
  for (const key of ['Enter', ' ', 'ArrowDown', 'j', 'a']) assert.equal(dialogKeyAction(key, false), null, key);
});

/* ── TestPlayer's markup keeps the contract ─────────────────────────────── */

function scoreOverlay(): string {
  const at = player.indexOf('test-result-overlay');
  assert.ok(at > 0, 'the score overlay is still there');
  return player.slice(at - 200, at + 1200);
}

test('the score dialog is a named modal dialog: its name is the "Your Score" heading', () => {
  const overlay = scoreOverlay();
  assert.match(overlay, /role="dialog"/);
  assert.match(overlay, /aria-modal="true"/);
  assert.match(overlay, /aria-labelledby=\{scoreHeadingId\}/);
  assert.match(player, /<h2 id=\{scoreHeadingId\}[^>]*>\{t\('Your Score'\)\}<\/h2>/, 'the heading carries the id the dialog is labelled by');
  assert.match(player, /const scoreHeadingId = useId\(\)/);
});

test('focus moves into the dialog on open, Tab is trapped, Escape closes into the review', () => {
  assert.match(player, /useModalDialog\(scoreDialogRef, \{ open: showScore, onEscape: closeScoreToReview, initialFocus: scorePanelRef \}\)/);
  assert.match(scoreOverlay(), /ref=\{scorePanelRef\}\s+tabIndex=\{-1\}/, 'the panel can take focus so the dialog is announced by name');
});

test('"Review Answers" and Escape both close into the review and hand focus to the Score button', () => {
  assert.match(player, /onClick=\{closeScoreToReview\}[\s\S]{0,200}\{t\('Review Answers'\)\}/);
  assert.match(player, /ref=\{scoreButtonRef\}[\s\S]{0,200}onClick=\{\(\) => setShowScore\(true\)\}[\s\S]{0,300}\{t\('Score'\)\}/,
    'the Score button reopens the dialog and is where focus returns');
  assert.match(player, /restoreScoreFocusRef\.current = true;\s*setShowScore\(false\)/);
  assert.match(player, /scoreButtonRef\.current\?\.focus\(\)/);
});

test('the unanswered-question warning stays an inline alert, not a second modal', () => {
  const at = player.indexOf("Submit anyway?");
  assert.ok(at > 0, 'the warning is still there');
  const warning = player.slice(Math.max(0, at - 1500), at);
  assert.match(warning, /role="alert"/);
  assert.doesNotMatch(warning, /role="dialog"|aria-modal/);
});

test('the Writing answer box has a persistent visible label, not only a placeholder', () => {
  assert.match(writing, /<label htmlFor=\{essayId\}[^>]*>\s*\{t\('Your answer'\)\}\s*<\/label>\s*<textarea\s+id=\{essayId\}/);
  assert.doesNotMatch(writing.match(/<label htmlFor=\{essayId\}[^>]*>/)![0], /sr-only/, 'the label is visible');
});
