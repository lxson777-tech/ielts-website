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
 *
 * WHOSE WORK IS ON SCREEN (the follow-up to R2E-02, 23 September 2026)
 * The answer and its evaluation, and the help asked for on the way, belong
 * to the student who pressed. Each request is bound to that student at the
 * press (runOwnedGrade in src/lib/store-owner.ts): what comes back is KEPT
 * for them through writers that take an owner (recordEventFor, and their
 * own draft key), and SHOWN only while they have been on the page
 * throughout. When the page changes hands the screen hands over, the way
 * the essay editor does: the outgoing student's words go to their own
 * draft, an evaluation still on its way is kept for them (as an attempt
 * nothing judged, because the tutor client drops a reply that comes back
 * after the switch), and the incoming student sees their own draft of this
 * task or an empty one, with one calm line saying why.
 *
 * A TAB THAT MISSED THE SWITCH (23 September 2026)
 * A tab hears of another tab's sign-in from an event, a moment after the
 * session in shared storage has changed, or never. Until then it still names
 * the previous student. So Check, "Write it again" and "Try it on a sentence
 * of your own" also ask this device's stored account session at the press
 * (storedSessionAgrees in src/lib/store-owner.ts, the same check the focused
 * exercise makes through claimExerciseCheck in ./exercise-owner.ts). When it
 * names somebody else, nothing is sent, judged or recorded, the words go to
 * their own student's draft, and the work leaves the screen with the calm
 * line until the tab hears who is here and hands over.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../../lib/i18n/react';
import { getLocale } from '../../lib/i18n/locale';
import { nt } from '../../lib/i18n/translate';
import { withBase } from '../../lib/url';
import Html from '../Html';
import {
  ensureLearningWired,
  getCurrentSession,
  markStepStarted,
  readPersonalPlan,
  type SharedSessionView,
} from '../../lib/learning';
import { recordEventFor } from '../../lib/learning/store.browser';
import type { AssistanceLevel } from '../../lib/learning/contracts/evidence';
import type { CacheOwner } from '../../lib/learning/contracts/sync';
import {
  bindToCurrentOwner,
  currentOwner,
  onOwnerChange,
  ownerNamespace,
  runOwnedGrade,
  storedSessionAgrees,
  type OwnerBinding,
} from '../../lib/store-owner';
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
  type WrittenAttemptRecord,
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

/** Shown when the page changes hands (a sign-out, a sign-in or a switch,
    here or in another tab). The screen now holds the incoming student's
    own draft, or nothing. Names nobody and shows nothing of the previous
    student's work. */
const OWNER_CHANGED_NOTE = nt(
  'The account on this page changed. Any answer in progress was kept for the student who was writing it.',
);

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
  const [ownerNote, setOwnerNote] = useState<string | null>(null);
  /* True when this tab missed an account change and refused a press: the
     work leaves the screen until the tab hears who is here. */
  const [withheld, setWithheld] = useState(false);
  /* Whose work this screen holds, as ownerNamespace spells an owner. Set
     on mount, and moved to the incoming student only by handOver below. */
  const owner = useRef('anon');
  /* Which hand-over this screen is on. The ref moves the instant the page
     changes hands; the state moves with the render that shows the incoming
     student's work. A handler from a render made before that one (a
     keystroke, a press) still sees the old number and is ignored, so the
     outgoing student's words can never be saved under, or sent for, the
     incoming student. */
  const [shownHandOver, setShownHandOver] = useState(0);
  const handOverNow = useRef(0);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* The words still waiting on the autosave, so a hand-over can put them
     in their own student's draft at once instead of dropping them. */
  const pendingDraft = useRef<string | null>(null);
  /* The evaluation on its way, bound to the student who pressed Check.
     Cancelled when the screen lets go of it: a hand-over or an unmount. */
  const evaluating = useRef<OwnerBinding | null>(null);
  const mounted = useRef(true);
  /* The same help state as `help`, readable synchronously. An evaluation is
     awaited, and a help reply can land from a promise of its own, so the
     ordering rule cannot depend on which render a closure was made in. */
  const helpNow = useRef<WrittenHelpState>(NO_WRITTEN_HELP);

  /* The session is read once, on mount: this screen must never decide what
     comes next for itself. The step's ROLE is kept because a short sample
     the plan asked for is a diagnostic, and a diagnostic is capped at
     tentative by the policy however well it goes. */
  useEffect(() => {
    /* The owner every store on this device is using right now, from the
       one place that decides it (src/lib/store-owner.ts). It never throws:
       with no storage the draft functions below simply keep nothing. */
    owner.current = ownerNamespace(currentOwner());
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

  /* A sign-out, sign-in or account switch, from this tab or another. The
     same owner being told its stores changed (the anonymous-work claim)
     replaces nothing. */
  useEffect(() => {
    mounted.current = true;
    const stop = onOwnerChange(() => {
      if (ownerNamespace(currentOwner()) === owner.current) return;
      handOver();
    });
    return () => {
      mounted.current = false;
      stop();
      /* An evaluation still on its way is still kept for its student when
         it lands; this screen just never paints it. */
      evaluating.current?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  /** True while this render shows the work of the student the screen
      holds now. False only in the moment between a hand-over and the
      render that follows it. */
  function live(): boolean {
    return shownHandOver === handOverNow.current;
  }

  function onType(value: string) {
    /* A keystroke from a render that still shows the outgoing student's
       text arrives after the hand-over has moved `owner` to the incoming
       student: it is theirs to lose, never the next student's to keep. */
    if (!live()) return;
    setText(value);
    setOwnerNote(null);
    if (draftTimer.current) clearTimeout(draftTimer.current);
    /* Whose words these are is fixed NOW, not when the timer fires. */
    const whose = owner.current;
    pendingDraft.current = value;
    draftTimer.current = setTimeout(() => {
      draftTimer.current = null;
      pendingDraft.current = null;
      /* Functional, so a debounced keystroke landing just after a submission
         cannot write back a copy that has lost the attempt list. */
      setHeld((current) => {
        const next = { ...current, draft: value };
        if (!writeWrittenDraft(storage(), whose, view.exerciseId, next)) setStorageProblem(true);
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
    const whose = owner.current;
    setHeld((current) => {
      const updated = { ...current, help: next };
      if (!writeWrittenDraft(storage(), whose, view.exerciseId, updated)) setStorageProblem(true);
      return updated;
    });
  }

  /** Help Mr EZ (or the lesson itself) gave in answer to a press, kept for
   *  the student who pressed (`whose`), whoever is on the page by now.
   *  While this screen still holds that student's work it is noted exactly
   *  as before. Otherwise it goes straight into that student's own stored
   *  draft of this task, so their next answer is recorded with it, and
   *  nothing on this screen changes. Help only ever raises the level, so
   *  keeping it can never make later work read as more independent than
   *  it was. */
  function keepHelp(assistance: AssistanceLevel, whose: CacheOwner) {
    const ns = ownerNamespace(whose);
    if (mounted.current && owner.current === ns) {
      noteHelp({ assistance });
      return;
    }
    const kept = readWrittenDraft(storage(), ns, view.exerciseId);
    writeWrittenDraft(storage(), ns, view.exerciseId, { ...kept, help: withWrittenHelp(kept.help, { assistance }) });
  }

  /* The page changed hands, here or in another tab. Everything on screen
     was the outgoing student's: their words still waiting on the autosave
     go to their own draft now, and an evaluation still on its way is kept
     for them by runOwnedGrade when it lands. None of it stays here. The
     screen shows the incoming student's own draft of this task, or
     nothing, with one calm line saying why. Touches only refs and setters,
     so the listener above can call it from any render. */
  function handOver() {
    const outgoing = owner.current;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = null;
    const pending = pendingDraft.current;
    pendingDraft.current = null;
    if (pending !== null) {
      const kept = readWrittenDraft(storage(), outgoing, view.exerciseId);
      writeWrittenDraft(storage(), outgoing, view.exerciseId, { ...kept, draft: pending });
    }
    evaluating.current?.cancel();
    evaluating.current = null;

    const incoming = ownerNamespace(currentOwner());
    owner.current = incoming;
    handOverNow.current += 1;
    setShownHandOver(handOverNow.current);
    const resumed = readWrittenDraft(storage(), incoming, view.exerciseId);
    helpNow.current = resumed.help;
    setHeld(resumed);
    setHelp(resumed.help);
    setSubmittedHelp(NO_WRITTEN_HELP);
    setText(resumed.draft);
    setEvaluation(null);
    setRevising(false);
    setTransferring(false);
    setPlanChange(null);
    /* The plan step this page was opened from belongs to the outgoing
       student's plan. The incoming student's work here is their own,
       outside it. */
    setSession(null);
    setStepRole(null);
    setPhase('working');
    setWithheld(false);
    setOwnerNote(OWNER_CHANGED_NOTE);
  }

  /* This tab missed the account change: it still names the student whose
     work is on screen, but this device's stored account session names
     somebody else. Nothing is sent, judged or recorded. The words still
     waiting on the autosave go to that student's own draft now, an
     evaluation still on its way is let go of here (runOwnedGrade still keeps
     it for them), and the work leaves the screen until this tab hears who
     is here, when the listener above hands over. */
  function withhold() {
    const holder = owner.current;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = null;
    const pending = pendingDraft.current;
    pendingDraft.current = null;
    if (pending !== null) {
      const kept = readWrittenDraft(storage(), holder, view.exerciseId);
      writeWrittenDraft(storage(), holder, view.exerciseId, { ...kept, draft: pending });
    }
    evaluating.current?.cancel();
    evaluating.current = null;
    setWithheld(true);
    setOwnerNote(OWNER_CHANGED_NOTE);
  }

  /** This device's stored account session still agrees that the student
   *  this screen holds is the one here: the check the focused exercise makes
   *  at its presses (claimExerciseCheck in ./exercise-owner.ts). When it
   *  names somebody else, this tab missed a change: the work is withheld and
   *  the press does nothing. Asked only once the owner on the page has been
   *  found to be this screen's, so the owner it is asked about is theirs. */
  function sessionAgrees(): boolean {
    if (storedSessionAgrees(currentOwner())) return true;
    withhold();
    return false;
  }

  /** Whether "Write it again" or "Try it on a sentence of your own" may act:
   *  only from the render that shows the work of the student this screen
   *  holds, only while that student is the one on the page (otherwise the
   *  screen hands over), and only while this device's stored session agrees
   *  (otherwise the work is withheld). */
  function claimPress(): boolean {
    if (!live() || withheld) return false;
    if (ownerNamespace(currentOwner()) !== owner.current) {
      handOver();
      return false;
    }
    return sessionAgrees();
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
   *  the exercise registry.
   *
   *  `whose` is the student who pressed Check, and the attempt is written
   *  into THEIR record through recordEventFor, whoever is on the page by
   *  the time the evaluation is back. While this screen still holds their
   *  work the attempt joins the draft on screen exactly as it always has;
   *  otherwise it goes straight into their own stored draft, beside the
   *  original, and nothing on this screen changes. `onPage` is true when
   *  they have been on the page throughout; only then is the plan read for
   *  what changed, which is returned for the screen to say. */
  function record(
    evaluated: WrittenEvaluation,
    written: string,
    recorded: WrittenHelpState,
    carried: WrittenHelpState,
    whose: CacheOwner,
    pressed: { stepRole: string | null; sessionId?: string },
    onPage: boolean,
  ): string | null {
    const ns = ownerNamespace(whose);
    const historyBefore = onPage ? (readPersonalPlan()?.history.length ?? 0) : 0;
    const at = new Date().toISOString();
    let eventId: string | undefined;
    try {
      const event = recordEventFor(
        whose,
        writtenEvidenceDraft({
          view,
          text: written,
          help: recorded,
          evaluation: evaluated,
          at,
          stepRole: pressed.stepRole,
          ...(pressed.sessionId ? { sessionId: pressed.sessionId } : {}),
          locale,
        }),
      );
      eventId = event?.id;
    } catch {
      if (onPage) setStorageProblem(true);
    }

    const attemptAfter = (kept: WrittenTaskDraft): WrittenAttemptRecord => ({
      at,
      text: written,
      ...(eventId ? { evidenceId: eventId } : {}),
      ...(kept.attempts.length > 0 ? { revisionOf: kept.attempts[kept.attempts.length - 1]!.at } : {}),
    });
    if (mounted.current && owner.current === ns) {
      setHeld((current) => {
        const next = withAttempt(current, attemptAfter(current), carried);
        writeWrittenDraft(storage(), ns, view.exerciseId, next);
        return next;
      });
    } else {
      const kept = readWrittenDraft(storage(), ns, view.exerciseId);
      writeWrittenDraft(storage(), ns, view.exerciseId, withAttempt(kept, attemptAfter(kept), carried));
    }

    /* Recording can move the plan (src/lib/learning/index.ts decides
       whether it is meaningful). When it did, say so in the student's own
       words rather than letting the change happen silently. */
    if (!onPage) return null;
    const plan = readPersonalPlan();
    const latest = plan?.history[plan.history.length - 1];
    return plan && latest && plan.history.length > historyBefore ? latest.summary : null;
  }

  async function evaluate() {
    if (phase === 'asking') return;
    /* A press from a render made before a hand-over holds the outgoing
       student's text, while `owner` already names the incoming one. */
    if (!live()) return;
    const written = text;
    if (!written.trim()) return;
    /* The answer goes out only for the student whose work this screen
       holds. A screen that missed an account change hands over instead,
       and nothing is sent, judged or recorded. */
    if (ownerNamespace(currentOwner()) !== owner.current) {
      handOver();
      return;
    }
    /* A tab that missed an account change still names that student while
       this device's session is somebody else's: nothing is sent, judged or
       recorded, and the work leaves the screen. */
    if (!sessionAgrees()) return;
    /* Bound to that student NOW, before anything is sent: whatever comes
       back is kept for them and shown only while they are still the one
       here (runOwnedGrade in src/lib/store-owner.ts). */
    const binding = bindToCurrentOwner();
    evaluating.current?.cancel();
    evaluating.current = binding;
    setPhase('asking');

    /* Taken BEFORE the evaluation is asked for, and this is the line the
       whole of finding 2 turns on: what the student had when they wrote
       this answer, not what they will have once they have read the reply
       to it. */
    const helpBeforeSubmission = helpNow.current;
    const previous = held.attempts[held.attempts.length - 1];
    /* The plan step it was written in, fixed at the press as well. */
    const pressed = { stepRole, ...(session?.sessionId ? { sessionId: session.sessionId } : {}) };
    let planSummary: string | null = null;

    await runOwnedGrade(
      binding,
      async (): Promise<WrittenEvaluation> => {
        if (!isTutorConfigured()) return unjudgedEvaluation();
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
          return 'refused' in checked ? unjudgedEvaluation(checked.refused) : checked;
        } catch (error) {
          /* Over the cap, unreachable, signed out: the automatic checks are
             what the student gets, and the words are still on the page. A
             reply that came back after the page changed hands is dropped by
             the tutor client and lands here too, so the answer is still
             kept, for its own student, as an attempt nothing judged. */
          return unjudgedEvaluation(error instanceof TutorClientError ? error.code : 'unreachable');
        }
      },
      {
        keep: (result, whose) => {
          /* The answer is recorded as it was written; the feedback it has
             just received applies to whatever is written next. */
          const recorded = helpToRecord(helpBeforeSubmission);
          const carried = helpAfterEvaluation(helpBeforeSubmission, result);
          planSummary = record(result, written, recorded, carried, whose, pressed, binding.current());
        },
        show: (result) => {
          const carried = helpAfterEvaluation(helpBeforeSubmission, result);
          helpNow.current = carried;
          setHelp(carried);
          setSubmittedHelp(helpToRecord(helpBeforeSubmission));
          setEvaluation(result);
          if (planSummary) setPlanChange(planSummary);
          setRevising(false);
          setPhase('answered');
        },
        /* The page changed hands with no notice reaching this screen: the
           same hand-over the listener makes. */
        hide: () => handOver(),
      },
    );
    binding.cancel();
    if (evaluating.current === binding) evaluating.current = null;
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

      {ownerNote && (
        <p className="focused-rule" role="status">
          {t(ownerNote)}
        </p>
      )}

      {storageProblem && (
        <p className="focused-storage" role="status">
          {t('This browser is not saving your work right now, so this attempt cannot be added to your record.')}
        </p>
      )}

      {/* A tab that missed an account change shows none of the work it
          still holds until it hears who is here (withhold above). */}
      {!withheld && (
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
                  onClick={() => live() && noteHelp({ guidingQuestionsOpened: true })}
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
              keepHelp={(result, whose) => keepHelp(result.assistanceAfter, whose)}
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
      )}

      {phase === 'answered' && evaluation && feedback && !withheld && (
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
                <button type="button" className="written-model-open" onClick={() => live() && noteHelp({ modelShown: true })}>
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
                <button type="button" className="written-model-open" onClick={() => live() && noteHelp({ modelShown: true })}>
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
                /* Only for the student whose work this is, from a tab that
                   has not missed an account change. */
                if (!claimPress()) return;
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
                if (!claimPress()) return;
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
