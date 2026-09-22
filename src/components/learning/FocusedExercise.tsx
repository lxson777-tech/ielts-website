/* One question group, one objective, ten minutes.
 *
 * Two shapes, one component, because they are the same exercise under
 * different rules and the difference has to be visible:
 *
 *   guided practice   hints are available before an answer; after a wrong
 *                     one the student is asked HOW they chose, the answer
 *                     they give is stored with the evidence, the diagnosis
 *                     built from it is worded as tentative, the sentence in
 *                     the passage is pointed at, and a second go is offered
 *                     and recorded as a retry
 *   independent check unseen material, no hints, no explanations until it
 *                     is over, Mr EZ closed for the duration, recorded as
 *                     assessment
 *
 * Everything that decides what any of it MEANS is in ./focused-exercise.ts,
 * where it can be tested with no browser. This file is the screen.
 *
 * WHAT IS RECORDED, AND WHEN
 * One event when check is pressed, built from the answers exactly as they
 * stood at that moment, before a single explanation appears. A correction
 * attempt is a second event; the learner store links it to the first by
 * their shared item ids, so nothing here has to name a retry. Every item
 * carries the help it had, so a right answer after a hint is assisted for
 * good.
 *
 * AND BEFORE IT IS RECORDED
 * Nothing reaches the learner record until check is pressed, so until then
 * the answers live in this tab alone, and a reload used to lose them. They
 * are now kept in a per owner, per exercise in-progress store (see
 * ./focused-exercise.ts, "Pausing and coming back"), restored on mount and
 * cleared the moment the run is recorded. Every decision about it is in
 * that file; the three calls below are glue.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../../lib/i18n/react';
import { getLocale } from '../../lib/i18n/locale';
import { useExplanations } from '../../lib/i18n/test-explanations';
import { withBase } from '../../lib/url';
import { MAX_REASON_NOTE_CHARS } from '../../data/focused-exercises';
import {
  ensureLearningWired,
  getCurrentSession,
  markStepStarted,
  readPersonalPlan,
  type SharedSessionView,
} from '../../lib/learning';
import { getLearnerStore, ownerNamespace, recordSubmission } from '../../lib/learning/store.browser';
import type { ItemOutcomeDraft } from '../../lib/learning/evidence';
import SessionContinueBar from './SessionContinueBar';
import LessonHelpControls from './LessonHelpControls';
import AudioSegmentPlayer, { type AudioSegmentPlayerHandle } from './AudioSegmentPlayer';
import {
  NO_DIAGNOSIS_SENTENCE,
  NO_HELP,
  TENTATIVE_DIAGNOSIS_SENTENCE,
  applyFocusedProgress,
  assistedCount,
  bySubskillOf,
  completionOf,
  countCorrect,
  feedbackFor,
  focusedProgressAction,
  isCorrect,
  itemDrafts,
  itemsAffectedBySeek,
  modeFor,
  readFocusedProgress,
  tentativeDiagnosis,
  withHelp,
  type FocusedExerciseView,
  type FocusedItemView,
  type FocusedProgressStorage,
  type ItemHelpState,
  type StatedReason,
} from './focused-exercise';
import '../../styles/learning-focus.css';

ensureLearningWired();

interface Props {
  view: FocusedExerciseView;
}

type Phase = 'working' | 'checked';

/** The browser's own store, or nothing when it is unavailable. Reading the
    property itself throws when storage is blocked by policy, which is why
    this is wrapped rather than tested. Same guard as deviceStorage() in
    src/lib/learning/store.browser.ts. */
function deviceStorage(): FocusedProgressStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

export default function FocusedExercise({ view }: Props) {
  const { t } = useT();
  const locale = getLocale();
  const isCheck = view.role === 'independent-check';

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [firstAnswers, setFirstAnswers] = useState<Record<string, string>>({});
  const [help, setHelp] = useState<Record<string, ItemHelpState>>({});
  const [stated, setStated] = useState<Record<string, StatedReason>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [retrying, setRetrying] = useState<Record<string, boolean>>({});
  const [phase, setPhase] = useState<Phase>('working');
  const [session, setSession] = useState<SharedSessionView | null>(null);
  const [planChange, setPlanChange] = useState<string | null>(null);
  const [storageProblem, setStorageProblem] = useState(false);
  /* Phone only (the toggle is hidden above the stacked breakpoint, where
     the passage is its own sticky column): the passage sits above the
     questions and can be folded away to reach them. Open by default, and
     it has to stay that way: a student cannot answer a Reading question
     without the passage, so hiding it unasked would be hiding the
     material, and the Russian run of the language check reads the passage
     text on a 390px screen to prove the exam content is still English. */
  const [passageOpen, setPassageOpen] = useState(true);
  /* True once the in-progress store has been consulted. Nothing is written
     back before it has been: on the first commit the boxes are still empty,
     and a write then would clear the very row about to be restored. */
  const [restored, setRestored] = useState(false);
  const recorded = useRef(false);
  const storage = useMemo(deviceStorage, []);
  /* The owner namespace the learner record itself uses. Null when it cannot
     be resolved, and then nothing is kept at all: an unnamespaced key could
     hand one student's answers to another, and losing a resumption is the
     cheaper of the two failures by a wide margin. */
  const owner = useRef<string | null>(null);
  /* Items whose stated reason has already reached the record, so saying
     how you chose and then also correcting the answer does not file the
     same sentence twice. */
  const reasonRecorded = useRef<Set<string>>(new Set());
  const audioPlayerRef = useRef<AudioSegmentPlayerHandle>(null);

  /* Explanations are teaching prose, so a Russian student reads them in
     Russian. Nothing is fetched until the student is actually looking at
     one, which is the promise useExplanations makes. */
  const explain = useExplanations(view.testId, locale, phase === 'checked');

  /* The session is read once, on mount: this screen must never decide what
     comes next for itself. Starting the step is recorded so a refresh
     resumes here rather than at the top of the hour. */
  useEffect(() => {
    try {
      const current = getCurrentSession();
      setSession(current);
      const step = current.steps.find((entry) => entry.activityId === view.activityId);
      if (step && step.state === 'pending') markStepStarted(step.stepId);
    } catch {
      /* No plan on this device: the exercise still works and is still
         recorded, and the bar at the end offers the quiet way back. */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.activityId]);

  /* Answers already given are not lost by reloading the page. Restored
     after mount rather than while rendering, so the server rendered markup
     and the first client render still agree, and with the help each answer
     had, so a reload can never turn assisted work into independent work.
     All three state changes are batched into one commit, which is what lets
     the keeping effect below see the restored answers on its first run
     instead of the empty ones. */
  useEffect(() => {
    try {
      owner.current = ownerNamespace(getLearnerStore().owner());
    } catch {
      /* No learner store on this device: nothing is kept, and the exercise
         works exactly as it did. */
      owner.current = null;
    }
    if (owner.current) {
      const held = readFocusedProgress(storage, owner.current, view, new Date().toISOString());
      if (Object.keys(held.answers).length > 0) {
        setAnswers(held.answers);
        setHelp((current) => {
          const next = { ...current };
          for (const [itemId, assistance] of Object.entries(held.assistance)) {
            next[itemId] = withHelp(next[itemId] ?? NO_HELP, { assistance });
          }
          return next;
        });
      }
    }
    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.exerciseId]);

  /* Keep the boxes as they stand, and drop the copy the moment the run is
     recorded. What to do is decided in ./focused-exercise.ts, so this stays
     one call: every path that changes an answer or adds help goes through
     here, including check(), which is what clears it. */
  useEffect(() => {
    if (!restored || !owner.current) return;
    const action = focusedProgressAction({
      exerciseId: view.exerciseId,
      answers,
      help,
      settled: phase === 'checked',
      now: new Date().toISOString(),
    });
    if (!applyFocusedProgress(storage, owner.current, view.exerciseId, action)) setStorageProblem(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored, answers, help, phase]);

  /* A check is a timed assessment as far as the tutor panel is concerned:
     the same flag TestPlayer and MockExam set, so a direct chat message is
     refused too and not only the buttons. Cleared on unmount, so it can
     never stick on. */
  useEffect(() => {
    if (typeof document === 'undefined' || !isCheck) return;
    if (phase === 'working') document.body.dataset.examRunning = 'true';
    else delete document.body.dataset.examRunning;
    return () => {
      delete document.body.dataset.examRunning;
    };
  }, [isCheck, phase]);

  const answeredCount = view.items.filter((item) => (answers[item.itemId] ?? '').trim() !== '').length;
  const correctCount = useMemo(() => countCorrect(view.items, firstAnswers), [view.items, firstAnswers]);
  const helpUsed = useMemo(() => assistedCount(view.items, help), [view.items, help]);

  function setAnswer(itemId: string, value: string) {
    setAnswers((held) => ({ ...held, [itemId]: value }));
  }

  function noteHelp(itemId: string, change: Partial<ItemHelpState>) {
    setHelp((held) => ({ ...held, [itemId]: withHelp(held[itemId] ?? NO_HELP, change) }));
  }

  /* Listening only: re-listening is help, exactly like a hint or a pointed
     sentence. A seek is scoped to whichever item's own located window it
     lands in (or every item still open, when none could be located); a
     full replay from the top could be revisiting any of them, so it marks
     every item. Never called in check mode, because AudioSegmentPlayer
     never offers a seek bar or a replay button there. */
  function noteAudioSeek(atSeconds: number) {
    const affected = itemsAffectedBySeek(
      view.items.map((item) => ({ itemId: item.itemId, audioReplay: item.audioReplay })),
      atSeconds,
    );
    for (const itemId of affected) noteHelp(itemId, { assistance: 'hint' });
  }

  function noteAudioReplayFromStart() {
    for (const item of view.items) noteHelp(item.itemId, { assistance: 'hint' });
  }

  /* The "hear that again" control next to one item's evidence: a few
     seconds around its own located answer, never the whole segment.
     Listening the offer is itself pointing at the answer, so it raises
     assistance exactly like openRetry's evidenceShown does for Reading. */
  function replayItemAudio(item: FocusedItemView) {
    if (!item.audioReplay) return;
    noteHelp(item.itemId, { evidenceShown: true, assistance: 'hint' });
    audioPlayerRef.current?.playWindow(item.audioReplay);
  }

  /** Write one run to the learner record. Never throws into the exercise:
      a blocked or full browser store costs the record, not the work. */
  function record(drafts: readonly ItemOutcomeDraft[], answersNow: Record<string, string>) {
    if (drafts.length === 0) return;
    const historyBefore = readPersonalPlan()?.history.length ?? 0;
    try {
      recordSubmission({
        activityId: view.activityId,
        contentVersion: view.contentVersion,
        paper: view.paper,
        subskill: view.subskill,
        at: new Date().toISOString(),
        mode: modeFor(view.role),
        completion: completionOf(view.items, answersNow),
        items: drafts,
        raw: drafts.filter((draft) => draft.correct).length,
        total: drafts.length,
        bySubskill: bySubskillOf(view, drafts),
        sourceTestId: view.testId,
        sessionId: session?.sessionId,
        locale,
      });
    } catch {
      setStorageProblem(true);
      return;
    }
    /* Recording can move the plan (src/lib/learning/index.ts decides
       whether it is meaningful). When it did, say so in the student's own
       words rather than letting the change happen silently. */
    const plan = readPersonalPlan();
    const latest = plan?.history[plan.history.length - 1];
    if (plan && latest && plan.history.length > historyBefore) setPlanChange(latest.summary);
  }

  function check() {
    if (phase === 'checked') return;
    const drafts = itemDrafts({ view, answers, help });
    setFirstAnswers({ ...answers });
    if (!recorded.current) {
      recorded.current = true;
      record(drafts, answers);
    }
    setPhase('checked');
  }

  function openRetry(item: FocusedItemView) {
    /* Pointing at the sentence in the passage is help, so the item is
       assisted from here on whatever happens next. */
    noteHelp(item.itemId, { evidenceShown: true, assistance: 'hint' });
    setRetrying((held) => ({ ...held, [item.itemId]: true }));
  }

  /** What the student says about how they chose, written down the moment
   *  they say it.
   *
   *  It used to ride along with the CORRECTION ATTEMPT, so a student who
   *  answered "how did you choose it?" and then read the explanation
   *  instead of trying again told us something that was never kept. Pilot
   *  finding, 22 September 2026. The reason is their own account and the
   *  only record of it, so it is stored on its own; a correction attempt
   *  afterwards is a separate, later fact and records itself as before. */
  function noteStatedReason(item: FocusedItemView, reason: StatedReason) {
    setStated((held) => ({ ...held, [item.itemId]: reason }));
    if (reasonRecorded.current.has(item.itemId)) return;
    reasonRecorded.current.add(item.itemId);
    record(
      itemDrafts({ view, answers, help, stated: { [item.itemId]: reason }, onlyItemIds: [item.itemId] }),
      answers,
    );
  }

  function submitRetry(item: FocusedItemView) {
    /* The student's own account of the first attempt rides with the second
       one, on the item it is about. It is kept as what they said, never as
       something the platform observed. */
    const drafts = itemDrafts({ view, answers, help, stated, onlyItemIds: [item.itemId] });
    record(drafts, answers);
    setRetrying((held) => ({ ...held, [item.itemId]: false }));
    noteHelp(item.itemId, { explanationShown: true, assistance: 'answer-shown' });
  }

  const feedback = feedbackFor({
    role: view.role,
    correct: correctCount,
    total: view.items.length,
    assisted: helpUsed,
  });

  return (
    <div className={`focused${isCheck ? ' is-check' : ' is-guided'}`}>
      <header className="focused-head">
        <p className="focused-eyebrow">
          {isCheck ? t('Independent check') : t('Guided practice')} · {t('{n} min', { n: view.expectedMinutes })}
        </p>
        <h1 className="focused-title">{t(view.title)}</h1>
        <p className="focused-objective">{t(view.objective)}</p>
        <p className="focused-source">
          {view.authored ? t('Written for this site, not a real exam question.') : t('Real exam material.')} {view.attribution}
        </p>
      </header>

      {isCheck && phase === 'working' && (
        <p className="focused-rule" role="note">
          {t(
            'No hints and no explanations until you finish, and Mr EZ is closed for this one. That is what makes the result mean something.',
          )}
        </p>
      )}

      {storageProblem && (
        <p className="focused-storage" role="status">
          {t('This browser is not saving your work right now, so this run cannot be added to your record.')}
        </p>
      )}

      <div className="focused-body">
        {view.passage && (
          /* On a wide screen this is its own sticky column, so the passage
             is still there at question 15 (it used to end about 1000px
             above the last question). Stacked above the questions on a
             phone, where it folds away instead. */
          <section
            className={`focused-passage${passageOpen ? '' : ' is-collapsed'}`}
            aria-label={t('Passage')}
          >
            <div className="focused-passage-head">
              <div className="focused-passage-heading">
                <p className="focused-passage-label">{view.passage.label}</p>
                <h2 className="focused-passage-title">{view.passage.title}</h2>
              </div>
              <button
                type="button"
                className="focused-passage-toggle"
                aria-expanded={passageOpen}
                aria-controls="focused-passage-text"
                onClick={() => setPassageOpen((open) => !open)}
              >
                {passageOpen ? t('Hide the passage') : t('Show the passage')}
              </button>
            </div>
            <div className="focused-passage-text" id="focused-passage-text">
              {view.passage.paragraphs.map((paragraph, index) => (
                <div key={index} dangerouslySetInnerHTML={{ __html: paragraph.html }} />
              ))}
            </div>
          </section>
        )}

        {view.audio && (
          <section className="focused-passage focused-audio-panel" aria-label={t('Recording')}>
            <div className="focused-passage-head">
              <div className="focused-passage-heading">
                <p className="focused-passage-label">{view.audio.partLabel}</p>
                <h2 className="focused-passage-title">
                  {view.audio.narrowed
                    ? t('The section covering these questions')
                    : t('The whole part this exercise is from')}
                </h2>
              </div>
            </div>
            <AudioSegmentPlayer
              ref={audioPlayerRef}
              src={withBase(view.audio.recordingSrc)}
              segment={view.audio.segment}
              mode={isCheck ? 'check' : 'guided'}
              onSeek={isCheck ? undefined : noteAudioSeek}
              onReplayFromStart={isCheck ? undefined : noteAudioReplayFromStart}
            />
            {isCheck && phase === 'working' ? (
              <p className="focused-audio-note">
                {t('It plays once, exactly like the real recording. There is no way to pause, rewind or hear it again.')}
              </p>
            ) : (
              !isCheck && (
                <p className="focused-audio-note">
                  {t('Play, pause and replay as often as you like. Each replay is recorded as help, the same as a hint.')}
                </p>
              )
            )}
          </section>
        )}

        <section className="focused-questions" aria-label={t('Questions')}>
          <div className="focused-instructions" dangerouslySetInnerHTML={{ __html: view.instructionHtml }} />
          {view.legendHtml && (
            <div className="focused-legend" dangerouslySetInnerHTML={{ __html: view.legendHtml }} />
          )}

          <ol className="focused-items">
            {view.items.map((item) => {
              const given = answers[item.itemId] ?? '';
              const first = firstAnswers[item.itemId] ?? '';
              const settled = phase === 'checked';
              /* Two different questions, and they must not be confused: was
                 the FIRST answer right (which is what the record holds and
                 what the tick shows), and is the answer they have NOW right
                 (which is what a correction attempt is judged on). */
              const firstRight = settled && isCorrect(first, item.answer);
              const right = settled && isCorrect(given, item.answer);
              const itemHelp = help[item.itemId] ?? NO_HELP;
              const reason = stated[item.itemId] ?? null;
              const diagnosis = tentativeDiagnosis(view.reasons, reason);
              const explanation = explain(item.questionId, item.explanation);
              const locked = settled && !retrying[item.itemId];

              return (
                <li key={item.itemId} className={`focused-item${settled ? (firstRight ? ' is-right' : ' is-wrong') : ''}`}>
                  <div className="focused-item-head">
                    <span className="focused-item-number">{item.number}</span>
                    <span className="focused-item-label">{item.label}</span>
                    {item.before !== undefined ? (
                      /* Sentence completion, and table completion's own
                         blanks (the table itself is shown read-only above,
                         via legendHtml): a typed answer, not a choice. */
                      <span className="focused-answer-text">
                        {item.before}{' '}
                        <input
                          type="text"
                          className="focused-answer focused-answer-input"
                          value={given}
                          disabled={locked}
                          placeholder="..."
                          aria-label={t('Answer for {label}', { label: item.label })}
                          onChange={(event) => setAnswer(item.itemId, event.target.value)}
                        />{' '}
                        {item.after}
                        {view.wordLimit != null && (
                          <span className="focused-word-limit">
                            {t('Up to {n} words.', { n: view.wordLimit })}
                          </span>
                        )}
                      </span>
                    ) : item.options ? (
                      /* Multiple choice and multiple answer: this item has
                         its own value list rather than sharing the group's
                         (see FocusedItemView.options). */
                      <select
                        className="focused-answer"
                        value={given}
                        disabled={locked}
                        aria-label={t('Answer for {label}', { label: item.label })}
                        onChange={(event) => setAnswer(item.itemId, event.target.value)}
                      >
                        <option value="">{t('Choose an option')}</option>
                        {item.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        className="focused-answer"
                        value={given}
                        disabled={locked}
                        aria-label={t('Heading for {label}', { label: item.label })}
                        onChange={(event) => setAnswer(item.itemId, event.target.value)}
                      >
                        <option value="">{t('Choose a heading')}</option>
                        {view.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Before an answer, in guided practice only: a hint that
                      leads toward it and never hands it over. */}
                  {!isCheck && !settled && view.lessonKey && (
                    <LessonHelpControls
                      inline
                      lessonKey={view.lessonKey}
                      blockId={view.blockId}
                      lessonTitle={view.title}
                      blockHeading={view.blockHeading}
                      blockText={view.blockText}
                      question={`${item.label}. ${view.instructionText}`}
                      attempted={false}
                      kinds={['hint']}
                      assistance={itemHelp.assistance}
                      onHelp={(result) =>
                        noteHelp(item.itemId, {
                          hints: [...itemHelp.hints, result.text],
                          assistance: result.assistanceAfter,
                        })
                      }
                    />
                  )}

                  {settled && !firstRight && (
                    <div className="focused-wrong">
                      <p className="focused-wrong-line">
                        {first
                          ? item.before !== undefined
                            ? t('You wrote {given}. That is not the one.', { given: first })
                            : t('You chose {given}. That is not the one.', { given: first })
                          : t('You left this one blank.')}
                      </p>

                      {/* What is OBSERVED is the wrong answer. Why it
                          happened is what the student tells us, and it is
                          asked before anything is explained. */}
                      {!reason && !isCheck && (
                        <div className="focused-reason">
                          <p className="focused-reason-ask">{t('How did you choose it?')}</p>
                          <div className="focused-reason-options">
                            {view.reasons.map((option) => (
                              <button
                                key={option.id}
                                type="button"
                                className="focused-reason-option"
                                onClick={() =>
                                  noteStatedReason(item, {
                                    reasonId: option.id,
                                    note: (notes[item.itemId] ?? '').trim().slice(0, MAX_REASON_NOTE_CHARS) || undefined,
                                  })
                                }
                              >
                                {t(option.label)}
                              </button>
                            ))}
                          </div>
                          <label className="focused-reason-note">
                            <span>{t('Anything else, in your own words (optional)')}</span>
                            <input
                              type="text"
                              maxLength={MAX_REASON_NOTE_CHARS}
                              value={notes[item.itemId] ?? ''}
                              onChange={(event) =>
                                setNotes((held) => ({ ...held, [item.itemId]: event.target.value }))
                              }
                            />
                          </label>
                        </div>
                      )}

                      {reason && (
                        <div className="focused-diagnosis">
                          <p className="focused-diagnosis-line">
                            {diagnosis
                              ? t(TENTATIVE_DIAGNOSIS_SENTENCE, { diagnosis: t(diagnosis) })
                              : t(NO_DIAGNOSIS_SENTENCE)}
                          </p>
                          {item.evidence && (
                            <p className="focused-evidence">
                              <span className="focused-evidence-label">{t('The sentence that decides this one:')}</span>{' '}
                              <q>{item.evidence}</q>
                              {view.audio && !isCheck && item.audioReplay && (
                                <button
                                  type="button"
                                  className="focused-evidence-replay"
                                  onClick={() => replayItemAudio(item)}
                                >
                                  {t('Hear that again')}
                                </button>
                              )}
                            </p>
                          )}
                          {!retrying[item.itemId] && !itemHelp.explanationShown && (
                            /* An encouraging second go, so it wears the
                               quiet outlined capsule rather than the filled
                               brand one, which on this canvas reads brick
                               red and so reads as a warning. The submit of
                               that second go, below, keeps the filled
                               style: that one is the action. */
                            <button
                              type="button"
                              className="focused-retry is-secondary"
                              onClick={() => openRetry(item)}
                            >
                              {t('Try this one again')}
                            </button>
                          )}
                          {retrying[item.itemId] && (
                            <button
                              type="button"
                              className="focused-retry"
                              disabled={(answers[item.itemId] ?? '') === ''}
                              onClick={() => submitRetry(item)}
                            >
                              {t('Check this one again')}
                            </button>
                          )}
                          {itemHelp.explanationShown && (
                            <p className="focused-retry-result">
                              {right
                                ? t('Right this time, with help. That is progress, and it is recorded as guided rather than as your own.')
                                : t('Still not it. The explanation below says why.')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {settled && (firstRight || itemHelp.explanationShown || isCheck) && explanation && (
                    <div className="focused-explanation">
                      <p>{explanation}</p>
                      {item.evidence && firstRight && (
                        <p className="focused-evidence">
                          <q>{item.evidence}</q>
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          {phase === 'working' && (
            <div className="focused-actions">
              <p className="focused-progress">
                {t('{done} of {total} answered', { done: answeredCount, total: view.items.length })}
              </p>
              <button
                type="button"
                className="focused-check"
                disabled={answeredCount === 0}
                onClick={check}
              >
                {isCheck ? t('Finish the check') : t('Check my answers')}
              </button>
            </div>
          )}
        </section>
      </div>

      {phase === 'checked' && (
        <section className="focused-summary" aria-live="polite">
          <p className="focused-score">
            {correctCount} / {view.items.length}
          </p>
          <p className="focused-demonstrated">{t(feedback.demonstratedKey, feedback.demonstratedVars)}</p>
          <p className="focused-certainty">{t(feedback.certaintyKey)}</p>
          <p className="focused-uncertain">{t(feedback.uncertainKey)}</p>
          {planChange && (
            <p className="focused-plan-change">
              <span className="focused-plan-change-label">{t('What changed:')}</span> {planChange}
            </p>
          )}
          {view.lessonHref && (
            <p className="focused-back-to-lesson">
              <a href={withBase(view.lessonHref)}>{t('Read the method again')}</a>
            </p>
          )}
          <SessionContinueBar activityId={view.activityId} planChanged={Boolean(planChange)} />
        </section>
      )}
    </div>
  );
}
