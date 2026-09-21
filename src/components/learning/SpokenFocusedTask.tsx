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
import { getLearnerStore, ownerNamespace } from '../../lib/learning/store.browser';
import { requestMic, recordSegment, releaseMic, type RecordingHandle } from '../../lib/speaking/recorder';
import SessionContinueBar from './SessionContinueBar';
import {
  checkedCount,
  emptyChecklist,
  micProblemText,
  spokenEvidenceDraft,
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
  const owner = useRef('anon');
  const streamRef = useRef<MediaStream | null>(null);
  const recordingRef = useRef<RecordingHandle | null>(null);

  useEffect(() => {
    try {
      owner.current = ownerNamespace(getLearnerStore().owner());
    } catch {
      /* No store on this device: the recording still happens, it is just
         not recorded as evidence. */
    }
    try {
      const current = getCurrentSession();
      setSession(current);
      const step = current.steps.find((entry) => entry.activityId === view.activityId);
      if (step && step.state === 'pending') markStepStarted(step.stepId);
    } catch {
      /* No plan on this device: the task still works. */
    }
    setMicUnavailable((readPersonalPlan()?.constraints.unavailable ?? []).includes('microphone'));
    return () => {
      if (streamRef.current) releaseMic(streamRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.activityId]);

  async function startRecording() {
    setMicProblem(null);
    if (typeof MediaRecorder === 'undefined' || typeof navigator === 'undefined' || !navigator.mediaDevices) {
      setMicProblem('unsupported');
      return;
    }
    let stream: MediaStream;
    try {
      stream = await requestMic();
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      setMicProblem(name === 'NotFoundError' || name === 'OverconstrainedError' ? 'unavailable' : 'permission-denied');
      return;
    }
    streamRef.current = stream;
    setPhase('recording');
    try {
      recordingRef.current = recordSegment(stream, { maxMs: MAX_RECORDING_MS });
    } catch {
      setMicProblem('recording-failed');
      releaseMic(stream);
      streamRef.current = null;
      setPhase('ready');
    }
  }

  async function stopRecording() {
    const handle = recordingRef.current;
    if (!handle) return;
    recordingRef.current = null;
    try {
      const segment = await handle.stop();
      if (streamRef.current) {
        releaseMic(streamRef.current);
        streamRef.current = null;
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(URL.createObjectURL(segment.blob));
      setRecorded(true);
      setPhase('reviewing');
    } catch {
      setMicProblem('recording-failed');
      setPhase('ready');
    }
  }

  function recordAgain() {
    setPhase('ready');
    setChecklist(emptyChecklist());
    setSaved(false);
  }

  function save() {
    const at = new Date().toISOString();
    try {
      getLearnerStore().recordEvent(
        spokenEvidenceDraft({
          view,
          hasRecording: recorded,
          at,
          ...(session?.sessionId ? { sessionId: session.sessionId } : {}),
        }),
      );
    } catch {
      /* A blocked or full browser store costs the record, never the
         practice itself; the recording stays on screen either way. */
    }
    setSaved(true);
  }

  function turnOffMicrophonePractice() {
    const plan = readPersonalPlan();
    const constraints = plan?.constraints;
    if (!constraints) return;
    const unavailable = new Set(constraints.unavailable ?? []);
    unavailable.add('microphone');
    updateGoalsAndConstraints({ constraints: { ...constraints, unavailable: [...unavailable] } });
    setMicUnavailable(true);
  }

  function turnOnMicrophonePractice() {
    const plan = readPersonalPlan();
    const constraints = plan?.constraints;
    if (!constraints) return;
    const unavailable = (constraints.unavailable ?? []).filter((entry) => entry !== 'microphone');
    updateGoalsAndConstraints({ constraints: { ...constraints, unavailable } });
    setMicUnavailable(false);
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

      {micUnavailable ? (
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
                      onChange={() => setChecklist((current) => toggleChecklistItem(current, index))}
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

      {saved && (
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
