import { useEffect, useMemo, useRef, useState } from 'react';
import { PRACTICE_ITEM_IDENTITY, type PracticeQuestion, type PracticeSet, type PracticeUnit } from '../data/reading-practice';
import { useT } from '../lib/i18n/react';
import { t } from '../lib/i18n/translate';
import { practiceKey, useExplanations, type Explain } from '../lib/i18n/test-explanations';
import type { Paper } from '../lib/learning/contracts/catalog';
import {
  AFTER_ANSWER_SHOWN,
  LESSON_CHECK_CONTENT_VERSION,
  completionOf,
  lessonCheckActivityId,
  lessonCheckDrafts,
  lessonCheckItemKey,
  lessonCheckProgressKey,
  readLessonCheckProgress,
  writeLessonCheckProgress,
  type LessonCheckSubmission,
  type RecordedAnswers,
} from '../lib/learning/lesson-check';
import { getLearnerStore, ownerNamespace, type BrowserStorage } from '../lib/learning/store.browser';
import type { AssistanceLevel } from '../lib/learning/contracts/evidence';
import LessonHelpControls from './learning/LessonHelpControls';
import { currentLessonBlockContext, type LessonBlockContext } from './learning/lesson-block-help';

/** Base-prefixed URL for images stored under /public. */
const asset = (p: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${p}`;

/* Interactive practice exercise for reading and listening question-type
   pages. A set is a list of `units` (see PracticeUnit in
   ../data/reading-practice.ts): each unit is one real passage (or, for
   listening, one real audio segment) immediately followed by that
   passage's own questions, so students always read/hear the material the
   question was actually written against, right next to it. Every unit is
   checked on its own ("Check answers"); explanations, evidence and (for
   listening) the transcript appear once that unit is checked. Inherits the
   ambient --skill / --skill-tint variables (reading coral / listening's
   own accent). Listening units additionally carry an optional `segment`
   (see ListeningPracticeSegment in ../data/listening-practice.ts): one
   audio clip, attribution, transcript and reference image(s), rendered by
   PracticeSegmentAudio below. */

interface Props {
  set: PracticeSet;
  /** Which set this is, e.g. "practice-reading-tfng": the name its
      translated explanations are stored under (src/data/tests/ru/, see
      src/lib/i18n/test-explanations.ts). A set has no id of its own, so
      the page passes the one it looked the set up by. Leave it out and
      the exercise simply reads in English. */
  setId?: string;
}

function fmtClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/** A small self-contained audio clip player for a listening unit's segment:
    native controls, seeks to startSeconds on load, pauses at endSeconds
    (further seeking stays allowed, same "drill" behaviour as the Listening
    Trainer's player in TestPlayer.tsx). Shown once, above that unit's
    questions. */
function PracticeSegmentAudio({ segment }: { segment: NonNullable<PracticeUnit['segment']> }) {
  const { t } = useT();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(segment.src ? 'loading' : 'error');

  function handleLoadedMetadata(el: HTMLAudioElement) {
    setStatus('ready');
    if (segment.startSeconds != null) el.currentTime = segment.startSeconds;
  }

  function handleTimeUpdate(el: HTMLAudioElement) {
    if (segment.endSeconds != null && el.currentTime >= segment.endSeconds) el.pause();
  }

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-border bg-surface-alt">
      {segment.images && segment.images.length > 0 && (
        <div className="flex flex-wrap gap-3 border-b border-border bg-white p-3">
          {segment.images.map((img, i) => (
            <img
              key={i}
              src={asset(img.src)}
              alt={img.alt}
              className="max-h-64 rounded-lg border border-border object-contain"
            />
          ))}
        </div>
      )}
      <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
        {segment.src && (
          <audio
            controls
            controlsList="nodownload noplaybackrate"
            preload="metadata"
            src={asset(segment.src)}
            className="h-10 w-full min-w-0 shrink-0 sm:w-auto sm:flex-1"
            aria-label={segment.source ?? t('Listening recording', undefined, 'practice-audio')}
            onLoadedMetadata={(e) => handleLoadedMetadata(e.currentTarget)}
            onTimeUpdate={(e) => handleTimeUpdate(e.currentTarget)}
            onError={() => setStatus('error')}
          />
        )}
        {status === 'error' && <span className="text-xs text-error">{t('Recording unavailable.')}</span>}
        {segment.source && (
          <span className="shrink-0 text-xs font-semibold text-ink-muted sm:text-right">{segment.source}</span>
        )}
      </div>
      {segment.startSeconds != null && (
        <p className="px-3 pb-2 text-xs text-ink-muted">
          {t('This clip covers {start} to {end} of the full recording.', {
            start: fmtClock(segment.startSeconds),
            end: fmtClock(segment.endSeconds ?? segment.startSeconds),
          })}
        </p>
      )}
    </div>
  );
}

/** The real source passage(s) a unit's questions are drawn from, shown as
    one scrollable block with its own sticky mini header (title + source
    line) so the student can always see what they're reading, and a
    "Collapse passage" control for once they no longer need it in view.
    `html` is used instead of `paragraphs` for the rare passage that is
    really a table or diagram image rather than running text. */
function UnitPassage({ passages }: { passages: NonNullable<PracticeUnit['passages']> }) {
  const { t } = useT();
  const [collapsed, setCollapsed] = useState(false);
  const main = passages[0]!;

  return (
    <div className="border-b border-border bg-surface p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {main.title && <p className="truncate font-display text-sm font-bold text-ink">{main.title}</p>}
          <p className="truncate text-xs text-ink-muted">{main.label}</p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:border-[var(--skill)] hover:text-ink"
        >
          {collapsed ? `${t('Expand passage')} ↓` : `${t('Collapse passage')} ↑`}
        </button>
      </div>

      {!collapsed && (
        <div className="mt-3 max-h-[60vh] overflow-y-auto rounded-xl border border-border bg-surface-alt">
          <div className="sticky top-0 z-10 border-b border-border bg-surface-alt/95 px-4 py-2 backdrop-blur sm:px-5">
            <p className="truncate font-display text-sm font-bold text-ink">{main.title || main.label}</p>
            {main.title && <p className="truncate text-xs text-ink-muted">{main.label}</p>}
          </div>
          <div className="p-4 text-sm leading-relaxed text-ink sm:p-5 [&_img]:mx-auto [&_img]:max-w-full [&_img]:rounded-lg [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2">
            {passages.map((p, idx) => (
              <div key={idx} className={idx > 0 ? 'mt-5 border-t border-border pt-4' : ''}>
                {idx > 0 && p.title && <p className="mb-2 font-display text-sm font-bold text-ink">{p.title}</p>}
                {p.html ? (
                  <div dangerouslySetInnerHTML={{ __html: p.html }} />
                ) : (
                  p.paragraphs?.map((para, i) => (
                    <p key={i} className="mb-3 last:mb-0">
                      {para}
                    </p>
                  ))
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function isRight(q: PracticeQuestion, given: string): boolean {
  const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
  const accepted = Array.isArray(q.answer) ? q.answer : [q.answer];
  return accepted.some((a) => norm(a) === norm(given));
}

function answerLabel(q: PracticeQuestion): string {
  const value = Array.isArray(q.answer) ? q.answer[0]! : q.answer;
  const opt = q.options?.find((o) => o.value === value);
  return opt?.label ?? value;
}

const PRAISE = ['Nice one!', 'Exactly right!', 'Well spotted!', 'Perfect!', 'Correct!'];

/** What to say about the score.
 *
 * `repeat` is true when these questions had been met before, either
 * earlier on this page or in a paper the student has already sat. It
 * changes what a full score is allowed to mean: getting every answer
 * right on questions whose answers were already shown is not new proof of
 * anything, and the old wording ("you have mastered this question type")
 * claimed exactly that. Nothing here says mastery either way; a few
 * questions never could. */
function scoreMessage(correct: number, total: number, repeat: boolean): string {
  const p = correct / total;
  if (p === 1) {
    return repeat
      ? t('All correct, on questions you had already seen. A fresh set is the real check. 🔁')
      : t('All correct, first time through. 🏆');
  }
  if (p >= 0.8) return t('Excellent work, almost perfect! 🌟');
  if (p >= 0.6) return t('Good job! Review the explanations you missed and go again. 💪');
  if (p >= 0.4) return t('Getting there. Reread the strategy above and try again. 📖');
  return t('Tough round! Study the explanations, then hit Try again. 🔄');
}

/** The lesson block a quick check's help is grounded in, plus the set id
    the item reference needs. Absent when the check is not on a lesson page
    or has no id of its own, and then no help controls are shown. */
type QuizHelp = LessonBlockContext & { setId: string };

interface UnitState {
  drafts: string[];
  checked: boolean;
  /** Which go this unit is on: 0 the first, 1 after "try this again". A
      later go has had the correct answers in front of it, so it is
      recorded as assisted rather than as a first answer. */
  attempt: number;
}

function emptyUnitState(unit: PracticeUnit, attempt = 0): UnitState {
  return { drafts: unit.questions.map(() => ''), checked: false, attempt };
}

/** This browser's store, or null when there is not one: a server render,
    the Astro build, a browser with storage switched off. Never throws.
    Same guard as deviceStorage() in src/lib/learning/store.browser.ts. */
function deviceStorage(): BrowserStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Which paper a set belongs to, from the id the lesson page passed. No
    guessing: an id in neither shape records nothing at all. */
function paperOfSet(setId: string | undefined): Paper | null {
  if (setId?.startsWith('practice-reading-')) return 'reading';
  if (setId?.startsWith('practice-listening-')) return 'listening';
  return null;
}

function UnitBlock({
  unit,
  unitIndex,
  state,
  startIndex,
  selectNoun,
  explain,
  help,
  assistance,
  identityFor,
  onHelpUsed,
  onDraft,
  onCheck,
  onReset,
}: {
  unit: PracticeUnit;
  /** Where this unit sits in the set. Part of the key its explanations
      are stored under, since a practice question has no id. */
  unitIndex: number;
  state: UnitState;
  startIndex: number;
  selectNoun: string;
  /** One note in the student's language, falling back to the English. */
  explain: Explain;
  /** The teaching block this check sits under, read off the lesson page.
      Null means no help controls at all, which is what a check rendered
      anywhere else, or one with no set id, gets. */
  help: QuizHelp | null;
  /** What has already been shown about each question, by its key. */
  assistance: Readonly<Record<string, AssistanceLevel>>;
  identityFor: (key: string) => { version: string; testId?: string; questionId?: string } | undefined;
  onHelpUsed: (key: string, level: AssistanceLevel) => void;
  onDraft: (qi: number, value: string) => void;
  onCheck: () => void;
  onReset: () => void;
}) {
  const { t } = useT();
  const translatedNoun = t(selectNoun);
  const selectNounTitle = translatedNoun.charAt(0).toUpperCase() + translatedNoun.slice(1);
  const locked = state.checked;
  const answeredCount = state.drafts.filter((d) => d.trim() !== '').length;
  const correctCount = unit.questions.filter((q, qi) => isRight(q, state.drafts[qi]!)).length;

  return (
    <div className="border-b border-border last:border-b-0">
      {unit.passages && unit.passages.length > 0 && <UnitPassage passages={unit.passages} />}
      {unit.segment && (
        <div className="border-b border-border bg-surface p-4 sm:p-6">
          <PracticeSegmentAudio segment={unit.segment} />
        </div>
      )}

      <form
        className="space-y-4 bg-surface-alt p-4 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!locked) onCheck();
        }}
      >
        {unit.intro && <p className="text-sm text-ink-muted">{unit.intro}</p>}

        {unit.questions.map((q, qi) => {
          const g = state.drafts[qi]!;
          const right = locked && isRight(q, g);
          const explanation = explain(practiceKey(unitIndex, qi), q.explanation);

          return (
            <div
              key={qi}
              className={`rounded-xl border-2 bg-surface p-4 shadow-card transition-colors ${
                locked ? (right ? 'border-success pq-pop' : 'border-error pq-shake') : 'border-transparent'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-display text-sm font-extrabold text-white ${
                    locked ? (right ? 'bg-success' : 'bg-error') : 'bg-[var(--skill,var(--color-brand))]'
                  }`}
                >
                  {locked ? (right ? '✓' : '✗') : startIndex + qi + 1}
                </span>
                <p className="pt-1 text-[0.95rem] font-medium">{q.prompt}</p>
              </div>

              {q.kind === 'choice' ? (
                <div className="mt-3 flex flex-wrap gap-2 pl-11">
                  {q.options!.map((opt) => {
                    const chosen = g === opt.value;
                    const isAnswer = isRight(q, opt.value);
                    let cls =
                      'border-border bg-surface text-ink hover:-translate-y-0.5 hover:border-[var(--skill)] hover:bg-[var(--skill-tint)] hover:shadow-card';
                    if (locked) {
                      if (isAnswer) cls = 'border-success bg-success text-white font-bold shadow-card';
                      else if (chosen) cls = 'border-error bg-error text-white line-through';
                      else cls = 'border-border bg-surface opacity-40';
                    } else if (chosen) {
                      cls = 'border-[var(--skill)] bg-[var(--skill-tint)] text-ink font-semibold shadow-card';
                    }
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={locked}
                        onClick={() => onDraft(qi, opt.value)}
                        className={`rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition-all ${cls}`}
                      >
                        {opt.label ?? opt.value}
                      </button>
                    );
                  })}
                </div>
              ) : q.kind === 'select' ? (
                <div className="mt-3 pl-11">
                  <select
                    value={g}
                    disabled={locked}
                    onChange={(e) => onDraft(qi, e.target.value)}
                    aria-label={t('{noun} for {prompt}', { noun: translatedNoun, prompt: q.prompt })}
                    className={`rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition-colors ${
                      locked
                        ? right
                          ? 'border-success bg-success-tint text-success'
                          : 'border-error bg-error-tint text-error'
                        : 'border-border bg-surface focus:border-[var(--skill,var(--color-brand))] focus:outline-none'
                    }`}
                  >
                    <option value="" disabled>
                      {t('Choose {noun}…', { noun: translatedNoun })}
                    </option>
                    {q.options!.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label ?? t('{noun} {value}', { noun: selectNounTitle, value: opt.value })}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="mt-3 pl-11">
                  <input
                    type="text"
                    value={g}
                    disabled={locked}
                    onChange={(e) => onDraft(qi, e.target.value)}
                    placeholder={t('Type your answer…')}
                    aria-label={t('Answer to question {n}', { n: startIndex + qi + 1 })}
                    className={`w-56 rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition-colors ${
                      locked
                        ? right
                          ? 'border-success bg-success-tint text-success'
                          : 'border-error bg-error-tint text-error line-through'
                        : 'border-border bg-surface focus:border-[var(--skill,var(--color-brand))] focus:outline-none'
                    }`}
                  />
                </div>
              )}

              {locked && (
                <div
                  className={`pq-in ml-11 mt-3 rounded-xl border-l-4 px-4 py-3 text-sm ${
                    right ? 'border-success bg-success-tint' : 'border-error bg-error-tint'
                  }`}
                >
                  {right ? (
                    <p>
                      <strong className="text-success">🎉 {t(PRAISE[qi % PRAISE.length]!)}</strong> {explanation}
                    </p>
                  ) : (
                    <p>
                      <strong className="text-error">
                        💡 {t('Not quite. The answer is “{answer}”.', { answer: answerLabel(q) })}
                      </strong>{' '}
                      {explanation}
                    </p>
                  )}
                  {q.source && <p className="mt-1 text-xs text-ink-muted">{t('Source: {source}', { source: q.source })}</p>}
                </div>
              )}

              {/* Help at the teaching point: a hint that leads toward the
                  answer before it is given, and a second explanation after
                  the attempt for anyone the official note did not reach.
                  Whatever is used raises this question's assistance level,
                  so a right answer after help is recorded as assisted. */}
              {help && (
                <LessonHelpControls
                  inline
                  lessonKey={help.lessonKey}
                  lessonTitle={help.lessonTitle}
                  blockId={help.blockId}
                  blockHeading={help.blockHeading}
                  blockText={help.blockText}
                  question={q.prompt}
                  officialExplanation={locked ? explanation : undefined}
                  attempted={locked}
                  kinds={locked ? ['explain'] : ['hint']}
                  assistance={assistance[practiceKey(unitIndex, qi)] ?? 'none'}
                  item={(() => {
                    const key = practiceKey(unitIndex, qi);
                    const identity = identityFor(key);
                    if (!identity) return undefined;
                    return {
                      setId: help.setId,
                      itemKey: key,
                      itemVersion: identity.version,
                      given: g,
                      testId: identity.testId,
                      questionId: identity.questionId,
                    };
                  })()}
                  onHelp={(result) => onHelpUsed(practiceKey(unitIndex, qi), result.assistanceAfter)}
                />
              )}
            </div>
          );
        })}

        {/* Transcript for this unit's audio, offered once the unit is
            checked so students answer from listening first. */}
        {locked && unit.segment?.transcriptHtml && (
          <details className="rounded-xl border border-border bg-surface p-4">
            <summary className="cursor-pointer font-display text-sm font-bold text-ink">
              {t('Transcript')}{unit.segment.source ? ` · ${unit.segment.source}` : ''}
            </summary>
            <div
              className="mt-3 max-h-72 overflow-y-auto text-sm leading-relaxed text-ink-muted [&_.transcript-note]:mb-2 [&_.transcript-note]:text-xs [&_.transcript-note]:italic [&_.ts]:mr-1 [&_.ts]:font-mono [&_.ts]:text-xs [&_.ts]:text-ink-muted"
              dangerouslySetInnerHTML={{ __html: unit.segment.transcriptHtml }}
            />
          </details>
        )}

        {locked ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface px-4 py-3 text-sm">
            <span className="font-display font-bold text-ink">
              {t('{correct} / {total} correct', { correct: correctCount, total: unit.questions.length })}
            </span>
            <button
              type="button"
              onClick={onReset}
              className="font-semibold text-ink-muted underline underline-offset-2 hover:text-ink"
            >
              {t('Try this passage again')} ↺
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="text-sm text-ink-muted">
              {t('{done} of {total} answered', { done: answeredCount, total: unit.questions.length })}
            </span>
            <button
              type="submit"
              disabled={answeredCount === 0}
              className="rounded-full bg-[var(--skill,var(--color-brand))] px-6 py-2 font-display text-sm font-bold text-white transition-transform hover:-translate-y-0.5 hover:shadow-card disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            >
              {t('Check answers')} ✓
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

export default function PracticeQuiz({ set, setId }: Props) {
  const { t, locale } = useT();
  /* 'select' questions were built for Matching Headings, where the dropdown
     picks a paragraph. Matching Sentence Endings reuses the same control to
     pick an ending, so the noun is configurable and defaults to the original. */
  const selectNoun = set.selectNoun ?? 'paragraph';

  const [units, setUnits] = useState<UnitState[]>(() => set.units.map((unit) => emptyUnitState(unit)));
  /* True once these questions are known to have been met before: an
     earlier go at this set, or a paper the student has already sat. */
  const [repeat, setRepeat] = useState(false);
  /* What has been shown about each question before its answer was settled.
     A question that had a hint is assisted for good, whatever it scores. */
  const [assistance, setAssistance] = useState<Record<string, AssistanceLevel>>({});
  /* The teaching block this check sits under. Read after mount, because
     the ids are stamped onto the lesson by a script and there is no DOM
     during the server render. */
  const [help, setHelp] = useState<QuizHelp | null>(null);

  const total = set.units.reduce((n, u) => n + u.questions.length, 0);
  const checkedQuestions = units.reduce((n, s, i) => (s.checked ? n + set.units[i]!.questions.length : n), 0);
  const correct = units.reduce(
    (n, s, i) => (s.checked ? n + set.units[i]!.questions.filter((q, qi) => isRight(q, s.drafts[qi]!)).length : n),
    0,
  );
  const allDone = units.every((s) => s.checked);

  /* The explanations in the student's language, fetched the moment the
     first unit is checked and not a moment before: nothing on this page
     shows a note until then, and an English student never asks for the
     file at all (see src/lib/i18n/test-explanations.ts). With no setId
     there is nothing to ask for, so this stays English throughout. */
  const anyChecked = units.some((s) => s.checked);
  const explain = useExplanations(setId ?? '', locale, anyChecked && !!setId);

  /* ── The learner record ──────────────────────────────────────────────
     Every answer below is evidence: the first one given, what had been
     shown before it, whether it was right, and which real paper question
     it was. The identities are stamped beside the questions themselves
     (PRACTICE_ITEM_IDENTITY in ../data/reading-practice.ts) and match the
     generated index item for item. Without a set id, or without an
     identity for a question, nothing is recorded: a nameless answer is
     worse than none. */
  const paper = paperOfSet(setId);
  const identityByKey = useMemo(
    () => new Map((setId ? (PRACTICE_ITEM_IDENTITY[setId] ?? []) : []).map((item) => [item.key, item])),
    [setId],
  );
  const storage = useMemo(deviceStorage, []);
  /* What has already been written for this set, so pressing check again,
     or coming back tomorrow, never records a second first answer. */
  const recorded = useRef<RecordedAnswers>({});
  const progressKey = useMemo(() => {
    if (!setId) return null;
    try {
      return lessonCheckProgressKey(ownerNamespace(getLearnerStore().owner()), setId);
    } catch {
      return null;
    }
  }, [setId]);

  /* The lesson block behind this check, once the page has stamped its ids.
     A check rendered anywhere but a lesson page finds nothing and simply
     has no help controls, which is the honest outcome: there is no
     teaching block to ground an answer in. */
  useEffect(() => {
    if (!setId) return;
    const context = currentLessonBlockContext();
    if (context) setHelp({ ...context, setId });
  }, [setId]);

  /* Answers already given are not lost by leaving the page. Restored
     after mount rather than while rendering, so the server rendered
     markup and the first client render still agree. */
  useEffect(() => {
    if (!progressKey) return;
    const held = readLessonCheckProgress(
      storage,
      progressKey,
      set.units.map((unit) => unit.questions.length),
      new Date().toISOString(),
    );
    if (!held) return;
    setUnits(held.units.map((unit) => ({ drafts: [...unit.drafts], checked: unit.checked, attempt: unit.attempt })));
    recorded.current = held.recorded;
    if (held.units.some((unit) => unit.attempt > 0)) setRepeat(true);
    // Restoring happens once, for the set this component was mounted with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressKey]);

  function apply(next: UnitState[]) {
    setUnits(next);
    if (!progressKey || !setId) return;
    writeLessonCheckProgress(storage, progressKey, {
      version: 1,
      setId,
      updatedAt: new Date().toISOString(),
      units: next.map((unit) => ({ drafts: unit.drafts, checked: unit.checked, attempt: unit.attempt })),
      recorded: recorded.current,
    });
  }

  /** Write one unit's answers to the learner record. Never throws into
      the exercise: a blocked or full browser store costs the record, not
      the student's practice. */
  function record(unitIndex: number, state: UnitState) {
    if (!setId || !paper || identityByKey.size === 0) return;
    const unit = set.units[unitIndex]!;
    const submissions: LessonCheckSubmission[] = [];
    unit.questions.forEach((question, qi) => {
      const identity = identityByKey.get(lessonCheckItemKey(unitIndex, qi));
      if (!identity) return;
      const given = state.drafts[qi] ?? '';
      const helped = assistance[lessonCheckItemKey(unitIndex, qi)];
      submissions.push({
        identity,
        given,
        correct: given.trim() !== '' && isRight(question, given),
        attempt: state.attempt,
        /* Only when help was really used. Left out, the shared module
           applies its own rule: a first go is unassisted, a later one
           carries what this surface had already shown. */
        ...(helped && helped !== 'none' ? { assistance: helped } : {}),
      });
    });
    if (submissions.length === 0) return;

    try {
      const write = lessonCheckDrafts(
        {
          activityId: lessonCheckActivityId(setId),
          contentVersion: LESSON_CHECK_CONTENT_VERSION,
          paper,
          at: new Date().toISOString(),
          locale,
          completion: completionOf(submissions),
          /* Checking a unit prints the correct answer and the
             explanation, so everything after it is assisted. */
          repeatAssistance: AFTER_ANSWER_SHOWN,
          setId,
        },
        submissions,
        recorded.current,
      );
      recorded.current = write.recorded;
      const events = getLearnerStore().recordEvents(write.drafts);
      if (events.some((event) => event.seenBefore)) setRepeat(true);
    } catch {
      /* Nothing recorded. The exercise itself carries on as before. */
    }
  }

  function setDraft(unitIndex: number, qi: number, value: string) {
    apply(
      units.map((s, i) => (i === unitIndex ? { ...s, drafts: s.drafts.map((d, j) => (j === qi ? value : d)) } : s)),
    );
  }

  function checkUnit(unitIndex: number) {
    const next = units.map((s, i) => (i === unitIndex ? { ...s, checked: true } : s));
    /* Recorded from the answers as they stood when check was pressed,
       which is before any explanation, correct answer or transcript
       appears on screen. */
    record(unitIndex, next[unitIndex]!);
    apply(next);
  }

  function resetUnit(unitIndex: number) {
    apply(units.map((s, i) => (i === unitIndex ? emptyUnitState(set.units[i]!, s.attempt + 1) : s)));
    setRepeat(true);
  }

  function resetAll() {
    apply(set.units.map((unit, i) => emptyUnitState(unit, (units[i]?.attempt ?? 0) + 1)));
    setRepeat(true);
  }

  let startIndex = 0;

  return (
    <div className="my-8 overflow-hidden rounded-card border border-border shadow-card">
      {/* Header */}
      <div className="bg-gradient-to-r from-[var(--color-brand)] to-[var(--skill,var(--color-brand-hover))] px-5 py-4 text-white sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-base font-bold sm:text-lg">🎯 {set.title}</h3>
          <span className="rounded-full bg-white/20 px-3 py-1 font-display text-xs font-bold">
            {t('{correct} / {total} correct', { correct, total })}
          </span>
        </div>
        {set.intro && <p className="mt-1 text-sm text-white/85">{set.intro}</p>}
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-white/25"
          role="progressbar"
          aria-valuenow={checkedQuestions}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={t('Questions checked')}
        >
          <div
            className="h-full rounded-full bg-white transition-[width] duration-500"
            style={{ width: `${(checkedQuestions / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Units: each one real passage (or audio segment) immediately
          followed by its own questions and its own Check answers. */}
      {set.units.map((unit, unitIndex) => {
        const props = {
          unit,
          unitIndex,
          state: units[unitIndex]!,
          startIndex,
          selectNoun,
          explain,
          help,
          assistance,
          identityFor: (key: string) => identityByKey.get(key),
          onHelpUsed: (key: string, level: AssistanceLevel) =>
            setAssistance((held) => ({ ...held, [key]: level })),
          onDraft: (qi: number, value: string) => setDraft(unitIndex, qi, value),
          onCheck: () => checkUnit(unitIndex),
          onReset: () => resetUnit(unitIndex),
        };
        startIndex += unit.questions.length;
        return <UnitBlock key={unitIndex} {...props} />;
      })}

      {/* Score card, once every unit has been checked. */}
      {allDone && (
        <div className="pq-pop m-4 rounded-xl bg-gradient-to-r from-[var(--color-brand)] to-[var(--skill,var(--color-brand-hover))] p-6 text-center text-white shadow-card-hover sm:m-6">
          <p className="font-display text-4xl font-extrabold">
            {correct} / {total}
          </p>
          <p className="mt-1 text-sm text-white/90">{scoreMessage(correct, total, repeat)}</p>
          <button
            type="button"
            onClick={resetAll}
            className="mt-4 rounded-full bg-white px-6 py-2 font-display text-sm font-bold text-brand transition-transform hover:-translate-y-0.5"
          >
            {t('Try again', undefined, 'practice-quiz')} ↺
          </button>
        </div>
      )}
    </div>
  );
}
