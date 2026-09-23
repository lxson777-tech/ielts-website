/* One Speaking objective, self-checked: record, listen back to yourself,
 * check yourself against a short checklist, optionally send the same idea
 * to the real trainer to be graded.
 *
 * THREE THINGS THIS SCREEN WILL NOT DO
 * 1. It never grades anything. The checklist is the student's own read of
 *    their own recording, recorded as practice done, never as an objective
 *    "met" and never as a band. See ./spoken-focused-task.ts's header.
 * 2. It never says anything about pronunciation from this recording. A
 *    pronunciation objective is set and re-checked only from a real
 *    audio-graded result, through the real trainer (lead decision Q6). If
 *    this task carries a `pronunciationNote`, it is shown as a plain,
 *    static sentence saying exactly that, never a judgement of this take.
 * 3. It never loses a failed recording's context. A denied permission, a
 *    missing microphone or a browser that cannot record all keep the
 *    attempt state and offer both a retry and a way to tell the plan the
 *    microphone is unavailable, so the plan moves on rather than getting
 *    stuck (src/lib/learning's updateGoalsAndConstraints, the same setting
 *    the planner already reads to skip needs-microphone activities).
 *
 * WHOSE TASK IS ON SCREEN (the follow-up to R2B-01, 23 September 2026)
 * The task is bound to the student on the page when it is opened
 * (./spoken-task-owner.ts). Every press that starts, stops or records
 * anything is claimed for that student first and refused for anybody else,
 * "Done for now" is written under them through recordEventFor, and when the
 * page changes hands a recording under way is stopped and dropped (never
 * played back, graded or recorded, for anybody), the microphone is
 * released, and the incoming student sees an empty task with one calm line
 * of this screen's own, which says the recording was not kept
 * (SPOKEN_TASK_OWNER_CHANGED_NOTE in ./spoken-task-owner.ts).
 *
 * ONE TAKE AT A TIME (finding R2F-01, 23 September 2026)
 * Every take comes from one desk (openSpokenTakes in ./spoken-task-owner.ts).
 * A press of Start while the microphone prompt is still open does nothing,
 * a microphone or a recording that arrives for a take that is no longer
 * THE take on screen is released at once, a new take drops the one before
 * it, and a hand-over, a refused press or leaving the page drops every take
 * the desk holds. The 90-second limit ends the microphone's tracks as well
 * as the recording.
 */

import { useEffect, useRef, useState } from 'react';
import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import {
  ensureLearningWired,
  getCurrentSession,
  markStepStarted,
  readPersonalPlan,
  updateGoalsAndConstraints,
  type SharedSessionView,
} from '../../lib/learning';
import { onOwnerChange, type OwnerBinding } from '../../lib/store-owner';
import { requestMic, recordSegment, releaseMic, type RecordingHandle } from '../../lib/speaking/recorder';
import SessionContinueBar from './SessionContinueBar';
import {
  claimExerciseCheck,
  exerciseIsCurrent,
  openExerciseSession,
  type ExerciseSession,
} from './exercise-owner';
import {
  SPOKEN_TASK_OWNER_CHANGED_NOTE,
  openSpokenTakes,
  recordSpokenPracticeFor,
} from './spoken-task-owner';
import {
  checkedCount,
  emptyChecklist,
  micProblemText,
  toggleChecklistItem,
  type ChecklistState,
  type MicProblem,
  type SpokenTaskView,
} from './spoken-focused-task';
import '../../styles/learning-focus.css';
import '../../styles/learning-speaking-focus.css';

ensureLearningWired();

interface Props {
  view: SpokenTaskView;
}

type Phase = 'ready' | 'recording' | 'reviewing';

const MAX_RECORDING_MS = 90_000;

/** Whether the plan on the page says there is no microphone. */
function microphoneTurnedOff(): boolean {
  return (readPersonalPlan()?.constraints.unavailable ?? []).includes('microphone');
}

export default function SpokenFocusedTask({ view }: Props) {
  const { t } = useT();
  const [phase, setPhase] = useState<Phase>('ready');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<ChecklistState>(emptyChecklist());
  const [micProblem, setMicProblem] = useState<MicProblem | null>(null);
  const [micUnavailable, setMicUnavailable] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [session, setSession] = useState<SharedSessionView | null>(null);
  /* Whose task this screen holds (./spoken-task-owner.ts): bound on mount
     to the owner on the page, and moved to the incoming student only by
     handOver below. State, so every render's recording and checklist and
     the student they belong to go together; the ref is for the
     owner-change listener and for an awaited microphone or recorder, which
     finish outside any render. */
  const [exercise, setExercise] = useState<ExerciseSession | null>(null);
  const exerciseRef = useRef<ExerciseSession | null>(null);
  /* The one calm line after the page changed hands. */
  const [ownerNote, setOwnerNote] = useState<string | null>(null);
  /* True when this tab missed an account change and refused a press: the
     task leaves the screen until the tab hears who is here. */
  const [withheld, setWithheld] = useState(false);
  /* Bumped at every hand-over, so the incoming student's own plan is read
     for the microphone setting once the sign-in has finished moving it. */
  const [handOvers, setHandOvers] = useState(0);
  /* Every take this screen makes: the recording under way, or the last one
     made, bound to its session, and any start still waiting for the
     microphone (R2F-01). One desk for the life of the screen. */
  const [takes] = useState(() => openSpokenTakes<MediaStream, RecordingHandle>(releaseMic));
  /* The same address as `audioUrl`, readable from the listener. */
  const audioUrlRef = useRef<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    /* The owner every store on this device is using right now, from the
       one place that decides it (src/lib/store-owner.ts), fixed for this
       task. */
    const opened = openExerciseSession();
    exerciseRef.current = opened;
    setExercise(opened);
    try {
      const current = getCurrentSession();
      setSession(current);
      const step = current.steps.find((entry) => entry.activityId === view.activityId);
      if (step && step.state === 'pending') markStepStarted(step.stepId);
    } catch {
      /* No plan on this device: the task still works. */
    }
    setMicUnavailable(microphoneTurnedOff());
    return () => {
      /* Every take, not only the one on screen: nothing records on after
         the page has gone. */
      takes.dropAll();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.activityId]);

  /* A sign-out, sign-in or account switch, from this tab or another. The
     same owner being told its stores changed (the anonymous-work claim)
     replaces nothing. */
  useEffect(() => {
    mounted.current = true;
    const stop = onOwnerChange(() => {
      if (exerciseRef.current === null || exerciseIsCurrent(exerciseRef.current)) return;
      handOver();
    });
    return () => {
      mounted.current = false;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* The incoming student's own plan says whether their microphone practice
     is on. Read after the hand-over has rendered: the owner changes a moment
     before the plan store has moved to them. */
  useEffect(() => {
    if (handOvers === 0) return;
    setMicUnavailable(microphoneTurnedOff());
  }, [handOvers]);

  /** True while this render's session is the one on screen. A handler from
      a render made before a hand-over (the gap between the hand-over and
      the next render) must not act on the next student's task. */
  function live(): boolean {
    return exercise !== null && exercise === exerciseRef.current && !withheld;
  }

  /** The session a take finishing now may still belong to: the one on
      screen, or none once the screen has gone. */
  function onScreen(): ExerciseSession | null {
    return mounted.current ? exerciseRef.current : null;
  }

  /** Stop and drop every take this screen holds, and let every microphone
      go: the one on screen, and any start still waiting for its answer. */
  function dropEveryTake() {
    takes.dropAll();
  }

  /* The page changed hands, here or in another tab. Everything on screen
     was the outgoing student's: a recording under way is stopped and
     dropped, never played back, graded or recorded, and the microphone is
     released. A "Done for now" they pressed is already in their own record.
     None of it stays here. The screen shows the incoming student an empty
     task, with one calm line. Touches only refs and setters, so the
     listener above can call it from any render. */
  function handOver() {
    dropEveryTake();
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    const opened = openExerciseSession();
    exerciseRef.current = opened;
    setExercise(opened);
    setAudioUrl(null);
    setChecklist(emptyChecklist());
    setMicProblem(null);
    setRecorded(false);
    setSaved(false);
    setPhase('ready');
    /* The plan step this page was opened from belongs to the outgoing
       student's plan. The incoming student's work here is their own,
       outside it. */
    setSession(null);
    setWithheld(false);
    setHandOvers((count) => count + 1);
    setOwnerNote(SPOKEN_TASK_OWNER_CHANGED_NOTE);
  }

  /* This tab missed the account change: it still names the previous
     student, but this device's account session is somebody else's
     (claimExerciseCheck said 'device-changed'). Nothing is recorded; a
     recording under way is dropped and the microphone released, and the
     task leaves the screen until this tab hears who is here, when the
     listener above hands over. */
  function withhold() {
    dropEveryTake();
    setWithheld(true);
    setOwnerNote(SPOKEN_TASK_OWNER_CHANGED_NOTE);
  }

  /** The binding a press is made under, bound NOW, or null when the press
   *  is refused: nothing is started or recorded, and the screen has handed
   *  over or taken the task off the screen. */
  function claimPress(): OwnerBinding | null {
    if (!live()) return null;
    const claim = claimExerciseCheck(exercise);
    if ('binding' in claim) return claim.binding;
    if (claim.refused === 'owner-changed') handOver();
    else withhold();
    return null;
  }

  async function startRecording() {
    /* One start at a time (R2F-01): while the browser is still asking for
       the microphone, another press opens nothing and asks for nothing.
       Checked before anything else, synchronously, so two presses in a row
       can never both get past it. */
    if (takes.starting()) return;
    /* A recording starts only for the student whose task this is. */
    const binding = claimPress();
    if (!binding) return;
    binding.cancel();
    if (typeof MediaRecorder === 'undefined' || typeof navigator === 'undefined' || !navigator.mediaDevices) {
      setMicProblem('unsupported');
      return;
    }
    /* Opened, marked as waiting and put on screen before the first await;
       the take before it, if any, is dropped first. */
    const take = takes.begin(exercise!);
    if (!take) return;
    setMicProblem(null);
    let stream: MediaStream;
    try {
      stream = await requestMic();
    } catch (error) {
      /* The screen moved on while the browser was asking, or this is no
         longer the take on screen: nobody here is waiting for this answer. */
      if (!takes.settle(take, null, onScreen())) return;
      const name = error instanceof Error ? error.name : '';
      setMicProblem(name === 'NotFoundError' || name === 'OverconstrainedError' ? 'unavailable' : 'permission-denied');
      return;
    }
    /* The microphone arrived after the page changed hands, after the
       screen let go, or for a take that is no longer THE take on screen:
       settle releases it at once (every track ended) and nothing is
       recorded. */
    if (!takes.settle(take, stream, onScreen())) return;
    setPhase('recording');
    try {
      /* The 90-second limit ends the microphone's tracks too. */
      take.recording = recordSegment(stream, { maxMs: MAX_RECORDING_MS, endTracksAtTimeout: true });
    } catch {
      setMicProblem('recording-failed');
      takes.dropCurrent();
      setPhase('ready');
    }
  }

  async function stopRecording() {
    const take = takes.current();
    const handle = take?.recording;
    if (!take || !handle) return;
    /* A stop pressed for a student who is no longer here drops the take
       instead (handOver and withhold both do): it is never played back. */
    const binding = claimPress();
    if (!binding) return;
    binding.cancel();
    take.recording = null;
    try {
      const segment = await handle.stop();
      /* The page changed hands while the recording was being finished, or
         this take was replaced: it is dropped (the hand-over or the new
         take has released the microphone), and none of it reaches this
         screen. */
      if (!takes.isLive(take, onScreen())) return;
      if (take.stream) {
        releaseMic(take.stream);
        take.stream = null;
      }
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      const url = URL.createObjectURL(segment.blob);
      audioUrlRef.current = url;
      setAudioUrl(url);
      setRecorded(true);
      setPhase('reviewing');
    } catch {
      if (!takes.isLive(take, onScreen())) return;
      /* The recording failed: the microphone is let go of here rather than
         left on until the next take or the end of the page. */
      takes.dropCurrent();
      setMicProblem('recording-failed');
      setPhase('ready');
    }
  }

  function recordAgain() {
    if (!live()) return;
    setPhase('ready');
    setChecklist(emptyChecklist());
    setSaved(false);
  }

  function toggleChecklist(index: number) {
    if (!live()) return;
    setChecklist((current) => toggleChecklistItem(current, index));
  }

  function save() {
    /* Accepted only for the student whose task this is, and written into
       THEIR record, bound at the press. */
    const binding = claimPress();
    if (!binding) return;
    const at = new Date().toISOString();
    try {
      recordSpokenPracticeFor(binding.owner, {
        view,
        hasRecording: recorded,
        at,
        ...(session?.sessionId ? { sessionId: session.sessionId } : {}),
      });
    } catch {
      /* A blocked or full browser store costs the record, never the
         practice itself; the recording stays on screen either way. */
    } finally {
      binding.cancel();
    }
    setSaved(true);
  }

  /* The microphone setting is the plan's, and the plan on the page is the
     current owner's: a press is claimed first, so it is only ever changed
     for the student whose task this is. */
  function turnOffMicrophonePractice() {
    const binding = claimPress();
    if (!binding) return;
    try {
      const plan = readPersonalPlan();
      const constraints = plan?.constraints;
      if (!constraints) return;
      const unavailable = new Set(constraints.unavailable ?? []);
      unavailable.add('microphone');
      updateGoalsAndConstraints({ constraints: { ...constraints, unavailable: [...unavailable] } });
      setMicUnavailable(true);
    } finally {
      binding.cancel();
    }
  }

  function turnOnMicrophonePractice() {
    const binding = claimPress();
    if (!binding) return;
    try {
      const plan = readPersonalPlan();
      const constraints = plan?.constraints;
      if (!constraints) return;
      const unavailable = (constraints.unavailable ?? []).filter((entry) => entry !== 'microphone');
      updateGoalsAndConstraints({ constraints: { ...constraints, unavailable } });
      setMicUnavailable(false);
    } finally {
      binding.cancel();
    }
  }

  return (
    <div className="focused spoken-task">
      <header className="focused-head">
        <p className="focused-eyebrow">
          {t('Speaking, Part {part}', { part: view.part })} · {t('{n} min', { n: view.expectedMinutes })}
        </p>
        <h1 className="focused-title">{t(view.title)}</h1>
        <p className="focused-objective">{t(view.objective)}</p>
      </header>

      <p className="spoken-self-check-note" role="note">
        {t(
          'This is self-check practice: nothing here grades you. Record yourself, listen back, and check your own answer against the list below.',
        )}
      </p>

      {view.pronunciationNote && (
        <p className="spoken-pronunciation-note" role="note">
          {t(view.pronunciationNote)}
        </p>
      )}

      {ownerNote && (
        <p className="focused-rule" role="status">
          {t(ownerNote)}
        </p>
      )}

      {withheld ? null : micUnavailable ? (
        <div className="spoken-mic-off" role="status">
          <p>{t('Microphone practice is turned off for your plan right now, so this task is skipped when it comes up.')}</p>
          <button type="button" className="spoken-mic-toggle" onClick={turnOnMicrophonePractice}>
            {t('Turn microphone practice back on')}
          </button>
        </div>
      ) : (
        <section className="spoken-work" aria-label={t('Your recording')}>
          <p className="written-instruction">{t(view.instruction)}</p>
          <p className="spoken-question">{view.questionText}</p>

          {micProblem && (
            <div className="spoken-mic-problem" role="alert">
              <p>{t(micProblemText(micProblem))}</p>
              <div className="spoken-mic-problem-actions">
                <button type="button" className="focused-check" onClick={() => void startRecording()}>
                  {t('Try again')}
                </button>
                <button type="button" className="spoken-mic-toggle" onClick={turnOffMicrophonePractice}>
                  {t('Turn off microphone practice for now')}
                </button>
              </div>
            </div>
          )}

          {phase === 'ready' && !micProblem && (
            <button type="button" className="focused-check" onClick={() => void startRecording()}>
              {t('Start recording')}
            </button>
          )}

          {phase === 'recording' && (
            <div className="spoken-recording" role="status">
              <span className="spoken-recording-dot" aria-hidden="true" />
              {t('Recording...')}
              <button type="button" className="focused-check" onClick={() => void stopRecording()}>
                {t('Stop and listen back')}
              </button>
            </div>
          )}

          {phase === 'reviewing' && audioUrl && (
            <div className="spoken-review">
              <audio controls src={audioUrl} className="spoken-audio" />
              <button type="button" className="spoken-mic-toggle" onClick={recordAgain}>
                {t('Record again')}
              </button>

              <div className="spoken-checklist" aria-label={t('Check yourself')}>
                <p className="spoken-checklist-title">{t('Listen back, then check yourself:')}</p>
                {view.checklist.map((line, index) => (
                  <label key={index} className="spoken-checklist-item">
                    <input
                      type="checkbox"
                      checked={Boolean(checklist[index])}
                      onChange={() => toggleChecklist(index)}
                    />
                    <span>{t(line)}</span>
                  </label>
                ))}
                <p className="spoken-checklist-count">
                  {t('{checked} of {total} checked', { checked: checkedCount(checklist), total: view.checklist.length })}
                </p>
              </div>

              {!saved ? (
                <button type="button" className="focused-check" onClick={save}>
                  {t('Done for now')}
                </button>
              ) : (
                <p className="focused-certainty">
                  {t('Recorded as practice. This is a self-check, never a grade, and it never claims mastery.')}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {saved && !withheld && (
        <>
          <p className="spoken-send-note">
            {t(
              'Want a real band on this? Send the same kind of answer to the Speaking trainer, which grades from your actual recording and costs a real AI check.',
            )}{' '}
            <a href={withBase('/trainers/speaking')}>{t('Open the Speaking trainer')}</a>
          </p>
          <SessionContinueBar activityId={view.activityId} />
        </>
      )}
    </div>
  );
}
