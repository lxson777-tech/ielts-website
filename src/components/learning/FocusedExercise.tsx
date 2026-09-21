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
import { recordSubmission } from '../../lib/learning/store.browser';
import type { ItemOutcomeDraft } from '../../lib/learning/evidence';
import SessionContinueBar from './SessionContinueBar';
import LessonHelpControls from './LessonHelpControls';
import {
  NO_DIAGNOSIS_SENTENCE,
  NO_HELP,
  TENTATIVE_DIAGNOSIS_SENTENCE,
  assistedCount,
  bySubskillOf,
  completionOf,
  countCorrect,
  feedbackFor,
  isCorrect,
  itemDrafts,
  modeFor,
  tentativeDiagnosis,
  withHelp,
  type FocusedExerciseView,
  type FocusedItemView,
  type ItemHelpState,
  type StatedReason,
} from './focused-exercise';
import '../../styles/learning-focus.css';

ensureLearningWired();

interface Props {
  view: FocusedExerciseView;
}

type Phase = 'working' | 'checked';

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
  const recorded = useRef(false);

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
        <p className="focused-source">{t('Real exam material.')} {view.attribution}</p>
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
        <section className="focused-passage" aria-label={t('Passage')}>
          <div className="focused-passage-head">
            <p className="focused-passage-label">{view.passage.label}</p>
            <h2 className="focused-passage-title">{view.passage.title}</h2>
          </div>
          <div className="focused-passage-text">
            {view.passage.paragraphs.map((paragraph, index) => (
              <div key={index} dangerouslySetInnerHTML={{ __html: paragraph.html }} />
            ))}
          </div>
        </section>

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
                          ? t('You chose {given}. That is not the one.', { given: first })
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
                                  setStated((held) => ({
                                    ...held,
                                    [item.itemId]: {
                                      reasonId: option.id,
                                      note: (notes[item.itemId] ?? '').trim().slice(0, MAX_REASON_NOTE_CHARS) || undefined,
                                    },
                                  }))
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
                            </p>
                          )}
                          {!retrying[item.itemId] && !itemHelp.explanationShown && (
                            <button type="button" className="focused-retry" onClick={() => openRetry(item)}>
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
          <SessionContinueBar activityId={view.activityId} />
        </section>
      )}
    </div>
  );
}
