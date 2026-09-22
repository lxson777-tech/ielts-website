/* One real chart, one objective, two sentences, eight minutes.
 *
 * The Writing half of the focused-exercise pattern. Same two shapes as
 * FocusedExercise.tsx, and the difference between them has to be visible:
 *
 *   guided practice   the prompt's own guiding questions are there to be
 *                     opened, Mr EZ can hint and give an example, the band
 *                     8 overview is offered AFTER the attempt as one way to
 *                     write it, and a revision is offered and linked to the
 *                     original
 *   independent check a chart the student has not seen, no guiding
 *                     questions, no model, no Mr EZ, recorded as assessment
 *
 * Everything that decides what any of it MEANS is in
 * ./written-focused-task.ts, where it can be tested with no browser. This
 * file is the screen.
 *
 * THREE THINGS THIS SCREEN WILL NOT DO
 * 1. It never shows a band, and it says so in one quiet line. The
 *    calibrated grader marks whole reports; two sentences judged against
 *    one objective is a different thing and is never dressed as the same.
 * 2. It never shows the model before the student's own attempt. That is
 *    Alex's teaching principle from 19 September 2026: trainers guide the
 *    student to the answer, they do not give it.
 * 3. It never loses the words. Every keystroke goes to a per owner, per
 *    exercise draft, and a failed evaluation leaves the text exactly where
 *    it was.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../../lib/i18n/react';
import { getLocale } from '../../lib/i18n/locale';
import { withBase } from '../../lib/url';
import Html from '../Html';
import {
  ensureLearningWired,
  getCurrentSession,
  markStepStarted,
  readPersonalPlan,
  type SharedSessionView,
} from '../../lib/learning';
import { getLearnerStore, ownerNamespace } from '../../lib/learning/store.browser';
import { askPracticeEvaluation, isTutorConfigured, TutorClientError } from '../../lib/tutor/client';
import SessionContinueBar from './SessionContinueBar';
import LessonHelpControls from './LessonHelpControls';
import { askContext } from './learning-versions';
import {
  EMPTY_WRITTEN_DRAFT,
  NO_WRITTEN_HELP,
  acceptEvaluation,
  helpAfterEvaluation,
  helpToRecord,
  mayShowModel,
  readWrittenDraft,
  runAutomaticChecks,
  unjudgedEvaluation,
  withAttempt,
  withWrittenHelp,
  writeWrittenDraft,
  writtenEvidenceDraft,
  writtenFeedbackFor,
  writtenPieceWording,
  writtenTaskLabel,
  wordsIn,
  type WrittenEvaluation,
  type WrittenHelpState,
  type WrittenTaskDraft,
  type WrittenTaskView,
} from './written-focused-task';
import '../../styles/learning-focus.css';
import '../../styles/learning-writing-focus.css';

ensureLearningWired();

interface Props {
  view: WrittenTaskView;
}

type Phase = 'working' | 'asking' | 'answered';

/** The one line that appears beside every verdict, in every language. It is
    not decoration: it is the difference between this screen and the band
    report one click away. */
const NOT_A_BAND =
  'This is one objective, judged on two sentences. It is not a band and it does not change your Writing score.';

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export default function WritingFocusedTask({ view }: Props) {
  const { t } = useT();
  const locale = getLocale();
  const isCheck = view.role === 'independent-check';

  const wording = writtenPieceWording(view.piece);

  const [text, setText] = useState('');
  const [held, setHeld] = useState<WrittenTaskDraft>(EMPTY_WRITTEN_DRAFT);
  /* What has been shown to the student so far, which is what the NEXT
     answer carries. `submittedHelp` is a different thing: the level the
     answer on the screen was actually recorded with, kept so the closing
     panel describes the attempt that was made and not the feedback it has
     just been given (the 22 September 2026 review, finding 2). */
  const [help, setHelp] = useState<WrittenHelpState>(NO_WRITTEN_HELP);
  const [submittedHelp, setSubmittedHelp] = useState<WrittenHelpState>(NO_WRITTEN_HELP);
  const [phase, setPhase] = useState<Phase>('working');
  const [evaluation, setEvaluation] = useState<WrittenEvaluation | null>(null);
  const [session, setSession] = useState<SharedSessionView | null>(null);
  const [stepRole, setStepRole] = useState<string | null>(null);
  const [planChange, setPlanChange] = useState<string | null>(null);
  const [storageProblem, setStorageProblem] = useState(false);
  const [revising, setRevising] = useState(false);
  /* Sentence correction only (WP20): the round after the correction, where
     the student writes their OWN sentence with the same pattern rather than
     correcting the one they were shown again. Reuses the same "revise" box
     and evidence path; the difference is only what is shown above it. */
  const [transferring, setTransferring] = useState(false);
  const owner = useRef('anon');
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* The same help state as `help`, readable synchronously. An evaluation is
     awaited, and a help reply can land from a promise of its own, so the
     ordering rule cannot depend on which render a closure was made in. */
  const helpNow = useRef<WrittenHelpState>(NO_WRITTEN_HELP);

  /* The session is read once, on mount: this screen must never decide what
     comes next for itself. The step's ROLE is kept because a short sample
     the plan asked for is a diagnostic, and a diagnostic is capped at
     tentative by the policy however well it goes. */
  useEffect(() => {
    try {
      owner.current = ownerNamespace(getLearnerStore().owner());
    } catch {
      /* No store on this device: the draft simply is not kept. */
    }
    /* The draft carries the help state, so an attempt that had a hint, the
       model or Mr EZ's feedback cannot come back from a refresh looking
       like unaided work. */
    const resumed = readWrittenDraft(storage(), owner.current, view.exerciseId);
    setHeld(resumed);
    helpNow.current = resumed.help;
    setHelp(resumed.help);
    try {
      const current = getCurrentSession();
      setSession(current);
      const step = current.steps.find((entry) => entry.activityId === view.activityId);
      if (step) {
        setStepRole(step.role);
        if (step.state === 'pending') markStepStarted(step.stepId);
      }
    } catch {
      /* No plan on this device: the task still works and is still
         recorded, and the bar at the end offers the quiet way back. */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.activityId]);

  /* Whatever was in the box last time comes back, so a closed tab or a
     failed evaluation never costs the words. */
  useEffect(() => {
    if (held.draft && !text) setText(held.draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [held.draft]);

  /* A check is a timed assessment as far as the tutor panel is concerned:
     the same flag TestPlayer, MockExam and FocusedExercise set, so a direct
     chat message is refused too and not only the buttons. Cleared on
     unmount, so it can never stick on. */
  useEffect(() => {
    if (typeof document === 'undefined' || !isCheck) return;
    if (phase === 'working') document.body.dataset.examRunning = 'true';
    else delete document.body.dataset.examRunning;
    return () => {
      delete document.body.dataset.examRunning;
    };
  }, [isCheck, phase]);

  useEffect(() => {
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, []);

  const words = useMemo(() => wordsIn(text), [text]);
  const checks = useMemo(
    () =>
      runAutomaticChecks(
        text,
        { minWords: view.minWords, maxWords: view.maxWords, checks: view.checks },
        /* promptHtml (WP20b): only 'is-paraphrased-not-copied' reads this;
           every other check ignores it, exactly as every check already
           ignores `original` when it is not sentence correction. */
        { original: view.correctionSentence, promptHtml: view.promptHtml },
      ),
    [text, view.minWords, view.maxWords, view.checks, view.correctionSentence, view.promptHtml],
  );

  function onType(value: string) {
    setText(value);
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      /* Functional, so a debounced keystroke landing just after a submission
         cannot write back a copy that has lost the attempt list. */
      setHeld((current) => {
        const next = { ...current, draft: value };
        if (!writeWrittenDraft(storage(), owner.current, view.exerciseId, next)) setStorageProblem(true);
        return next;
      });
    }, 500);
  }

  /** Something was shown to the student. It is written to the draft store
   *  at once, not at the end: a student who opens the guiding questions and
   *  then refreshes has still seen them, and the record has to know that
   *  before the next answer is written rather than after it. */
  function noteHelp(change: Parameters<typeof withWrittenHelp>[1]) {
    const next = withWrittenHelp(helpNow.current, change);
    helpNow.current = next;
    setHelp(next);
    setHeld((current) => {
      const updated = { ...current, help: next };
      if (!writeWrittenDraft(storage(), owner.current, view.exerciseId, updated)) setStorageProblem(true);
      return updated;
    });
  }

  /** Write one attempt to the learner record.
   *
   *  Never throws into the task: a blocked or full browser store costs the
   *  record, not the work. The revision is not named here; the learner
   *  store links it to the original by their shared item id, which is what
   *  makes the link impossible for a surface to get wrong.
   *
   *  `recorded` is the help the student had WHEN THEY WROTE IT; `carried`
   *  is what the next answer starts from. The two are different the moment
   *  an evaluation succeeds, and keeping them apart is the whole of the
   *  fix. The task scope comes from the view, which the page fills from
   *  the exercise registry. */
  function record(
    evaluated: WrittenEvaluation,
    written: string,
    recorded: WrittenHelpState,
    carried: WrittenHelpState,
  ) {
    const historyBefore = readPersonalPlan()?.history.length ?? 0;
    const at = new Date().toISOString();
    let eventId: string | undefined;
    try {
      const event = getLearnerStore().recordEvent(
        writtenEvidenceDraft({
          view,
          text: written,
          help: recorded,
          evaluation: evaluated,
          at,
          stepRole,
          ...(session?.sessionId ? { sessionId: session.sessionId } : {}),
          locale,
        }),
      );
      eventId = event?.id;
    } catch {
      setStorageProblem(true);
    }

    setHeld((current) => {
      const next = withAttempt(
        current,
        {
          at,
          text: written,
          ...(eventId ? { evidenceId: eventId } : {}),
          ...(current.attempts.length > 0 ? { revisionOf: current.attempts[current.attempts.length - 1]!.at } : {}),
        },
        carried,
      );
      writeWrittenDraft(storage(), owner.current, view.exerciseId, next);
      return next;
    });

    /* Recording can move the plan (src/lib/learning/index.ts decides
       whether it is meaningful). When it did, say so in the student's own
       words rather than letting the change happen silently. */
    const plan = readPersonalPlan();
    const latest = plan?.history[plan.history.length - 1];
    if (plan && latest && plan.history.length > historyBefore) setPlanChange(latest.summary);
  }

  async function evaluate() {
    if (phase === 'asking') return;
    const written = text;
    if (!written.trim()) return;
    setPhase('asking');

    /* Taken BEFORE the evaluation is asked for, and this is the line the
       whole of finding 2 turns on: what the student had when they wrote
       this answer, not what they will have once they have read the reply
       to it. */
    const helpBeforeSubmission = helpNow.current;
    const previous = held.attempts[held.attempts.length - 1];
    let result: WrittenEvaluation = unjudgedEvaluation();

    if (isTutorConfigured()) {
      const context = askContext();
      try {
        const reply = await askPracticeEvaluation({
          activityId: view.activityId,
          contentVersion: view.contentVersion,
          subskill: view.subskill,
          itemIds: [view.itemId],
          submission: written,
          ...(previous?.evidenceId ? { revisionOf: previous.evidenceId } : {}),
          versions: context.versions,
          ...(context.sessionId ? { sessionId: context.sessionId } : {}),
        });
        const checked = acceptEvaluation(reply as never);
        result = 'refused' in checked ? unjudgedEvaluation(checked.refused) : checked;
      } catch (error) {
        /* Over the cap, unreachable, signed out: the automatic checks are
           what the student gets, and the words are still on the page. */
        result = unjudgedEvaluation(error instanceof TutorClientError ? error.code : 'unreachable');
      }
    }

    /* The answer is recorded as it was written; the feedback it has just
       received applies to whatever is written next. */
    const recorded = helpToRecord(helpBeforeSubmission);
    const carried = helpAfterEvaluation(helpBeforeSubmission, result);
    helpNow.current = carried;
    setHelp(carried);
    setSubmittedHelp(recorded);
    setEvaluation(result);
    record(result, written, recorded, carried);
    setRevising(false);
    setPhase('answered');
  }

  const feedback = evaluation
    ? writtenFeedbackFor({
        role: view.role,
        evaluation,
        /* The attempt on the screen, not the state the next one starts
           from: an unaided first answer is described as unaided even once
           Mr EZ has replied to it. */
        assisted: submittedHelp.assistance !== 'none',
        piece: view.piece,
        task: view.task,
      })
    : null;
  const original = held.attempts[0];
  const latest = held.attempts[held.attempts.length - 1];
  const hasRevision = held.attempts.length > 1 && original !== latest;

  return (
    <div className={`focused written-task${isCheck ? ' is-check' : ' is-guided'}`}>
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
            'No guiding questions, no model answer and no Mr EZ on this one. That is what makes the result mean something.',
          )}
        </p>
      )}

      {storageProblem && (
        <p className="focused-storage" role="status">
          {t('This browser is not saving your work right now, so this attempt cannot be added to your record.')}
        </p>
      )}

      <div className="written-body">
        <section className="written-prompt" aria-label={t('The task')}>
          <p className="written-prompt-label">{t(writtenTaskLabel(view.task))} · {view.promptTitle}</p>
          <Html as="div" className="written-prompt-text" html={view.promptHtml} />
        </section>

        <section className="written-work" aria-label={t(wording.yourWorkKey)}>
          <p className="written-instruction">{t(view.instruction)}</p>

          {/* Sentence correction only (WP20): the broken sentence itself,
              always visible, never behind a reveal, because correcting it
              IS the task. Hidden once the student has moved on to writing
              their OWN transfer sentence, which is a different task. */}
          {view.correctionSentence && !transferring && (
            <div className="written-correction-sentence">
              <p className="written-correction-sentence-label">{t('Correct this sentence')}</p>
              <blockquote className="written-correction-sentence-text">{view.correctionSentence}</blockquote>
            </div>
          )}
          {view.transferPrompt && transferring && (
            <p className="written-instruction">{t(view.transferPrompt)}</p>
          )}

          {!isCheck && view.guidingQuestions.length > 0 && (
            <div className="written-guide">
              {!help.guidingQuestionsOpened ? (
                <button
                  type="button"
                  className="written-guide-open"
                  onClick={() => noteHelp({ guidingQuestionsOpened: true })}
                >
                  {t(wording.showQuestionsKey)}
                </button>
              ) : (
                <div className="written-guide-open-panel">
                  <p className="written-guide-title">{t(wording.questionsTitleKey)}</p>
                  <ol className="written-guide-list">
                    {view.guidingQuestions.map((question, index) => (
                      <li key={index}>{question}</li>
                    ))}
                  </ol>
                  <p className="written-guide-note">
                    {t('These lead you to your own sentence. Opening them is recorded as help, which is honest rather than a penalty.')}
                  </p>
                </div>
              )}
            </div>
          )}

          <label className="written-label" htmlFor="written-answer">
            {t(wording.yourWorkKey)}
          </label>
          <textarea
            id="written-answer"
            className="written-input"
            value={text}
            rows={6}
            disabled={phase === 'asking'}
            placeholder={t(wording.placeholderKey)}
            onChange={(event) => onType(event.target.value)}
          />
          <p className={`written-count${words > view.maxWords ? ' is-over' : ''}`} aria-live="polite">
            {t('{words} words, aiming for {min} to {max}', { words, min: view.minWords, max: view.maxWords })}
          </p>

          {/* Before an attempt, in guided practice only: help that leads
              toward the sentence and never writes it. */}
          {!isCheck && phase === 'working' && view.lessonKey && (
            <LessonHelpControls
              inline
              lessonKey={view.lessonKey}
              blockId={view.blockId}
              lessonTitle={view.title}
              blockHeading={view.blockHeading}
              blockText={view.blockText}
              question={`${view.instruction} ${view.promptTitle}`}
              attempted={held.attempts.length > 0}
              kinds={['hint', 'example']}
              assistance={help.assistance}
              onHelp={(result) => noteHelp({ assistance: result.assistanceAfter })}
            />
          )}

          {(phase === 'working' || phase === 'asking' || revising) && (
            <div className="written-actions">
              <button
                type="button"
                className="focused-check"
                disabled={phase === 'asking' || text.trim().length === 0}
                onClick={() => void evaluate()}
              >
                {phase === 'asking'
                  ? t(wording.checkingKey)
                  : held.attempts.length > 0
                    ? t('Check my revision')
                    : t(wording.checkKey)}
              </button>
            </div>
          )}
        </section>
      </div>

      {phase === 'answered' && evaluation && feedback && (
        <section className="written-result" aria-live="polite">
          {evaluation.judged ? (
            <>
              <p className={`written-verdict is-${evaluation.verdict}`}>
                {evaluation.verdict === 'met'
                  ? t(wording.metKey)
                  : evaluation.verdict === 'partly'
                    ? t(wording.partlyKey)
                    : t(wording.notYetKey)}
              </p>
              {evaluation.source === 'simulated' && (
                <p className="written-simulated">{t('Simulated, not a real Mr EZ reply.')}</p>
              )}
              <ul className="written-observations">
                {evaluation.observations.map((observation, index) => (
                  <li key={index}>{observation}</li>
                ))}
              </ul>
              <p className="written-next-move">
                <span className="written-next-move-label">{t('The one thing to change:')}</span> {evaluation.nextMove}
              </p>
            </>
          ) : (
            <>
              <p className="written-unjudged">{t(feedback.demonstratedKey)}</p>
              <ul className="written-checks">
                {checks.map((check) => (
                  <li key={check.id} className={`written-check is-${check.passed ? 'pass' : 'look'}`}>
                    <span className="written-check-label">{t(check.labelKey)}</span>
                    <span className="written-check-result">
                      {check.resultVars ? t(check.resultKey, check.resultVars) : t(check.resultKey)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="written-checks-note">
                {t('Automatic checks of the words you typed. They are not a judgement of your writing and they do not add up to one.')}
              </p>
            </>
          )}

          <p className="written-not-a-band">{t(NOT_A_BAND)}</p>

          {evaluation.judged && <p className="focused-certainty">{t(feedback.certaintyKey)}</p>}
          <p className="focused-uncertain">{t(feedback.uncertainKey)}</p>

          {/* The model, and only now. Before an attempt there is nothing to
              compare it with and it would simply be the answer. */}
          {view.modelOverview && mayShowModel(held.attempts) && (
            <div className="written-model">
              {!help.modelShown ? (
                <button type="button" className="written-model-open" onClick={() => noteHelp({ modelShown: true })}>
                  {t('Show one way to write it')}
                </button>
              ) : (
                <div className="written-model-panel">
                  <p className="written-model-title">{t('One way to write it, from the Band 8 model')}</p>
                  <blockquote className="written-model-text">{view.modelOverview}</blockquote>
                  <p className="written-model-notice-title">{t('What to notice')}</p>
                  <ul className="written-model-notice">
                    {view.noticeInTheModel.map((line, index) => (
                      <li key={index}>{t(line)}</li>
                    ))}
                  </ul>
                  <p className="written-model-warning">
                    {t('One way, not the answer. Compare it with your own sentence rather than replacing yours with it.')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Sentence correction only (WP20): what was wrong with the
              original, in the marker's own kind of language, never a
              rewritten "correct" version (see writing-sentence-correction.ts
              for why there is not one to show). Same click-to-reveal
              pattern as the model above, so the answer is still earned by
              an attempt first. */}
          {view.correctionNote && mayShowModel(held.attempts) && (
            <div className="written-model">
              {!help.modelShown ? (
                <button type="button" className="written-model-open" onClick={() => noteHelp({ modelShown: true })}>
                  {t('Show what was wrong with it')}
                </button>
              ) : (
                <div className="written-model-panel">
                  <p className="written-model-title">{t('What was wrong with it')}</p>
                  <p className="written-correction-note">{t(view.correctionNote ?? '')}</p>
                  <p className="written-model-notice-title">{t('The pattern')}</p>
                  <ul className="written-model-notice">
                    {view.noticeInTheModel.map((line, index) => (
                      <li key={index}>{t(line)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {hasRevision && original && latest && (
            <div className="written-before-after">
              <div>
                <p className="written-before-after-label">{t('What you wrote first')}</p>
                <blockquote className="written-before">{original.text}</blockquote>
              </div>
              <div>
                <p className="written-before-after-label">{t('Your revision')}</p>
                <blockquote className="written-after">{latest.text}</blockquote>
              </div>
            </div>
          )}

          {!isCheck && !revising && view.transferPrompt && !transferring && (
            <button
              type="button"
              className="written-revise"
              onClick={() => {
                setTransferring(true);
                setRevising(true);
                setText('');
                setPhase('working');
              }}
            >
              {t('Try it on a sentence of your own')}
            </button>
          )}

          {!isCheck && !revising && !view.transferPrompt && (
            <button
              type="button"
              className="written-revise"
              onClick={() => {
                setRevising(true);
                setPhase('working');
              }}
            >
              {t('Write it again')}
            </button>
          )}

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
