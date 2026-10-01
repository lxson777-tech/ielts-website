/* The placement test's Writing part: one Task 1 report, marked by the same
   calibrated grader the Writing trainer uses (src/lib/writing/grader.ts, the
   grade-essay Worker behind PUBLIC_GRADER_URL).

   Never blocks the test on the grader. Not configured on this site: the
   student is told so before writing anything, and the part is left as "not
   yet assessed" (nothing written, nothing recorded, nothing spent). Asked
   and failed (unreachable, a limit, a refusal): the essay stays on this
   device, the student can try once more or carry on, and carrying on leaves
   the part not yet assessed. The plan's own staged short sample then asks
   for Writing later, exactly as it would have without a placement.

   Whose essay: see ./placement-owner.ts. The essay is written under the
   sitting's own student on every change, a press is claimed before it does
   anything, and a grade that comes back after the page changed hands is
   kept for the student who wrote it. */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { EssayPrompt } from '../../lib/writing/schema';
import { GraderRefusal, gradeEssay, isGraderConfigured } from '../../lib/writing/grader';
import { refreshTrial, serverNow, trialView } from '../../lib/trial/client';
import AllowanceNote from '../access/AllowanceNote';
import { isAssessmentRefusalCode, refusalIsFinal, refusalKind, refusalMessage } from '../access/assessment-refusal';
import { countWords } from '../../lib/writing/mechanics';
import { deviceStorage, runOwnedGrade, type OwnerBinding } from '../../lib/store-owner';
import { useT } from '../../lib/i18n/react';
import Html from '../Html';
import GradingProgress from '../GradingProgress';
import { PLACEMENT } from '../../data/placement';
import { settlePlacementPart, type NotAssessedReason, type PlacementStateV1 } from '../../lib/placement/state';
import type { ExerciseRefusal } from '../learning/exercise-owner';
import {
  claimPlacementPress,
  keepEssayFor,
  keepPlacementWritingGrade,
  startWritingFor,
  type PlacementSession,
} from './placement-owner';
import { PartBrief } from './PlacementFrame';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export default function PlacementWriting({
  prompt,
  session,
  state,
  onChanged,
  onRefused,
}: {
  prompt: EssayPrompt;
  session: PlacementSession;
  state: PlacementStateV1;
  /** The sitting moved on (or the clock started): read it again. */
  onChanged: () => void;
  onRefused: (refusal: ExerciseRefusal) => void;
}) {
  const { t, locale } = useT();
  const configured = isGraderConfigured();
  const writing = state.writing;
  const [essay, setEssay] = useState(writing?.essay ?? '');
  const [phase, setPhase] = useState<'writing' | 'grading' | 'error'>('writing');
  /** The grader refused on purpose (every essay of this period used, ...):
      said as what it is, and "Try again" is not offered when it would only
      be refused again (review of 1 October 2026, P1-2). */
  const [refused, setRefused] = useState<{ text: string; final: boolean } | null>(null);
  const [gradingStartedAt, setGradingStartedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const bindingRef = useRef<OwnerBinding | null>(null);
  const submittingRef = useRef(false);
  const wordCount = useMemo(() => countWords(essay), [essay]);

  /* A grade still on its way when this screen goes (the page changed hands,
     or the student left) is kept for its student by runOwnedGrade; the
     screen simply stops waiting for it. */
  useEffect(() => () => bindingRef.current?.cancel(), []);

  /* The clock reads the saved deadline, so a reload or a tab in the
     background never hands time back. */
  useEffect(() => {
    if (!writing || phase !== 'writing') return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [writing, phase]);

  const secondsLeft = writing ? Math.max(0, Math.round((writing.endsAt - now) / 1000)) : PLACEMENT.writing.minutes * 60;

  const submitRef = useRef<() => void>(() => {});
  useEffect(() => {
    submitRef.current = () => void submit();
  });
  useEffect(() => {
    if (writing && phase === 'writing' && secondsLeft <= 0) submitRef.current();
  }, [writing, phase, secondsLeft]);

  function settle(reason: NotAssessedReason) {
    const claim = claimPlacementPress(session);
    if ('refused' in claim) {
      onRefused(claim.refused);
      return;
    }
    claim.binding.cancel();
    settlePlacementPart(deviceStorage(), session.namespace, state.sittingId, 'writing', {
      kind: 'not-assessed',
      reason,
      at: new Date().toISOString(),
    });
    onChanged();
  }

  function begin() {
    const claim = claimPlacementPress(session);
    if ('refused' in claim) {
      onRefused(claim.refused);
      return;
    }
    claim.binding.cancel();
    startWritingFor(deviceStorage(), session.namespace, state.sittingId, Date.now(), PLACEMENT.writing.minutes);
    onChanged();
  }

  function edit(value: string) {
    if (phase !== 'writing') return;
    setEssay(value);
    /* Always under the sitting's own student, whoever took over since: a
       hand-over takes this screen down before another keystroke lands. */
    keepEssayFor(deviceStorage(), session.namespace, state.sittingId, value);
  }

  async function submit() {
    if (submittingRef.current) return;
    const claim = claimPlacementPress(session);
    if ('refused' in claim) {
      onRefused(claim.refused);
      return;
    }
    const text = essay;
    keepEssayFor(deviceStorage(), session.namespace, state.sittingId, text);
    const words = countWords(text);
    if (words === 0) {
      /* Nothing written: nothing to mark, and nothing is spent. */
      claim.binding.cancel();
      settlePlacementPart(deviceStorage(), session.namespace, state.sittingId, 'writing', {
        kind: 'not-assessed',
        reason: 'blank',
        at: new Date().toISOString(),
      });
      onChanged();
      return;
    }
    submittingRef.current = true;
    const submitted = { prompt, essay: text, wordCount: words };
    const sittingId = state.sittingId;
    bindingRef.current?.cancel();
    bindingRef.current = claim.binding;
    setPhase('grading');
    setGradingStartedAt(Date.now());
    try {
      await runOwnedGrade(claim.binding, () => gradeEssay({ prompt, essay: text }), {
        /* Kept for the student who wrote it, whoever is here by now. */
        keep: (graded, owner) =>
          void keepPlacementWritingGrade(deviceStorage(), owner, sittingId, submitted, graded, new Date().toISOString()),
        show: () => onChanged(),
      });
    } catch (err) {
      if (claim.binding.state() !== 'current') return;
      if (err instanceof GraderRefusal && isAssessmentRefusalCode(err.code)) {
        const kind = refusalKind(err.code, err.message, err.reason);
        await refreshTrial();
        setRefused({
          text: refusalMessage({ kind, what: 'placement', serverMessage: err.message }, trialView().status, serverNow(), t, locale),
          final: refusalIsFinal(kind),
        });
      } else {
        setRefused(null);
      }
      setPhase('error');
    } finally {
      submittingRef.current = false;
    }
  }

  if (!configured) {
    return (
      <PartBrief
        part="writing"
        index={2}
        lead={t('Writing cannot be marked on this site right now, so this part is left out and shown as not yet assessed. Nothing is lost: your plan will ask for a short Writing sample later.')}
        facts={[t('Not yet assessed')]}
        action={
          <button type="button" className="pl-primary" onClick={() => settle('unavailable')}>
            {t('Continue to Speaking')}
          </button>
        }
      />
    );
  }

  if (!writing) {
    return (
      <PartBrief
        part="writing"
        index={2}
        lead={t('One Writing Task 1 report about a chart. Describe the main features and compare them. The AI examiner marks it against the official criteria.')}
        facts={[t('{n} min', { n: PLACEMENT.writing.minutes }), t('At least {n} words', { n: 150 }), 'Task 1']}
        note={t('The exam gives 20 minutes for Task 1. Here you have {n}, so aim for a complete short report rather than a perfect one.', {
          n: PLACEMENT.writing.minutes,
        })}
        extra={<AllowanceNote use="placement-writing" />}
        action={
          <button type="button" className="pl-primary" onClick={begin}>
            {t('Start Writing')}
          </button>
        }
      />
    );
  }

  if (phase === 'grading') {
    return (
      <section className="pl-card pl-enter pl-skill-writing" aria-live="polite">
        <p className="pl-kicker">{t('Part {n} of 4', { n: 3 })}</p>
        <h1 className="pl-title">{t('Marking your writing')}</h1>
        <p className="pl-lead">{t('This usually takes about a minute. Please keep this page open.')}</p>
        <GradingProgress kind="writing" startedAt={gradingStartedAt} className="mt-6" />
      </section>
    );
  }

  if (phase === 'error') {
    return (
      <PartBrief
        part="writing"
        index={2}
        lead={
          refused
            ? `${refused.text} ${t('You can carry on and leave Writing as not yet assessed.')}`
            : t('Your writing could not be marked just now. It is kept on this device. You can try once more, or carry on and leave Writing as not yet assessed.')
        }
        facts={[t('{count} / {min}+ words', { count: wordCount, min: 150 })]}
        action={
          refused?.final ? (
            <button type="button" className="pl-primary" onClick={() => settle('failed')}>
              {t('Continue without marking')}
            </button>
          ) : (
            <button
              type="button"
              className="pl-primary"
              onClick={() => void submit()}
            >
              {t('Try again')}
            </button>
          )
        }
        secondary={
          refused?.final ? undefined : (
            <button type="button" className="pl-secondary" onClick={() => settle('failed')}>
              {t('Continue without marking')}
            </button>
          )
        }
      />
    );
  }

  const low = secondsLeft <= 120;
  return (
    <section className="pl-write pl-enter pl-skill-writing" aria-labelledby="pl-write-heading">
      <div className="pl-write-head">
        <div>
          <p className="pl-kicker">{t('Part {n} of 4', { n: 3 })}</p>
          <h1 id="pl-write-heading" className="pl-title" style={{ fontSize: 'clamp(26px, 3.4vw, 34px)' }}>
            Writing Task 1
          </h1>
        </div>
        <span className={`pl-timer ${low ? 'is-low' : ''}`} role="timer" aria-label={t('Time remaining')}>
          {pad(Math.floor(secondsLeft / 60))}:{pad(secondsLeft % 60)}
        </span>
      </div>
      <div className="pl-card" style={{ padding: '26px 28px' }}>
        {/* Exam material stays English. */}
        <Html className="pl-prompt" html={prompt.promptHtml} />
      </div>
      <label className="sr-only" htmlFor="pl-essay">
        {t('Your answer')}
      </label>
      <textarea
        id="pl-essay"
        className="pl-essay"
        value={essay}
        onChange={(e) => edit(e.target.value)}
        placeholder={t('Write your answer here…')}
        spellCheck={false}
      />
      <div className="pl-write-head">
        <span className={`pl-count ${wordCount >= 150 ? 'is-enough' : ''}`}>
          {t('{count} / {min}+ words', { count: wordCount, min: 150 })}
        </span>
        <button type="button" className="pl-primary" onClick={() => void submit()} disabled={wordCount === 0}>
          {t('Hand in my writing')}
        </button>
      </div>
    </section>
  );
}
