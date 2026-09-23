/* The speaking checker: pick a mode → read the question → record your answer
   → repeat → get a report. Three independent practice modes: "Part 1" (a
   topic's worth of short Q&A), "Part 2" (a cue-card monologue after a
   minute's prep), and "Part 3" (the follow-up discussion for a cue card's
   theme). Each in-progress screen shows a structure cheat-sheet (A.R.E. /
   PEEL / OREO) so students can check it while prepping or answering. Grading
   is audio-native — the actual recordings go to gradeSpeaking(), never a
   transcript — so Pronunciation can be judged from what was really said. */

import { useEffect, useRef, useState } from 'react';
import type { AnsweredClip, SpeakingAttempt, SpeakingGradeResult, TopicVocab } from '../lib/speaking/schema';
import { SPEAKING_CRITERIA } from '../lib/speaking/schema';
import { SPEAKING_BAND_GUIDES, guideFor } from '../data/band-guides';
import { SPEAKING_PART1_TOPICS, SPEAKING_CUE_CARDS } from '../data/speaking-prompts';
import type { StructureMethod } from '../data/speaking-structure-guides';
import { nextInRotation } from '../lib/rotation';
import { requestMic, recordSegment, releaseMic, type RecordingHandle } from '../lib/speaking/recorder';
import { toAnsweredClip, gradeSpeaking, isSpeakingGraderConfigured } from '../lib/speaking/grader';
import { recordSpeakingAttemptFor } from '../lib/progress';
import { useT } from '../lib/i18n/react';
import BandReport from './BandReport';
import SpeakingCoachPanel from './SpeakingCoachPanel';
import SpeakingPartCards from './SpeakingPartCards';
import IdeaHints from './IdeaHints';
import GradingProgress from './GradingProgress';
import ExplainResult from './tutor/ExplainResult';
import { recordSpeakingGradedFor } from '../lib/learning/store.browser';
import { runOwnedGrade } from '../lib/store-owner';
import {
  openSpeakingAttempt,
  type OwnedSpeakingAttempt,
  type SpeakingStageAtSwitch,
} from './speaking-attempt-owner';
import { nt } from '../lib/i18n/translate';
import { speakingActivityId, speakingPart3ActivityId } from '../lib/learning/catalog';
import { parseSpeakingDeepLink } from './attempt-recording';
import SessionContinueBar from './learning/SessionContinueBar';
import SpeakingObjectiveHandoff from './learning/SpeakingObjectiveHandoff';
import { readPersonalPlan } from '../lib/learning';
import { withBase } from '../lib/url';
import {
  CUE_CARD_FAMILY_EXAMPLE,
  bandLadderHref,
  cueCardFamilyOf,
  cueCardHref,
  lowestCriterionBelow,
} from './library-links';

type Mode = 'part1' | 'part2' | 'part3';
type Phase = 'menu' | 'asking' | 'prepping' | 'listening' | 'grading' | 'report' | 'error';

const STRUCTURE_METHOD: Record<Mode, StructureMethod> = { part1: 'ARE', part2: 'PEEL', part3: 'OREO' };
const MODE_LABEL: Record<Mode, string> = { part1: 'Speaking Part 1', part2: 'Speaking Part 2', part3: 'Speaking Part 3' };

interface Turn {
  question: string;
  maxMs: number;
  prepMs?: number;
  isMonologue?: boolean;
  /** tap-to-reveal idea angles for this question (from the prompt bank) */
  ideas?: string[];
}

interface CollectedClip {
  question: string;
  blob: Blob;
  mimeType: string;
  durationMs: number;
}

/** What this student needs on Speaking, from their own plan: the Speaking
 *  minimum if they set one, otherwise the overall target. Null when they
 *  have no plan or no target, in which case nothing below is offered:
 *  "this is under what you need" is not a sentence that can be said to
 *  somebody who has not said what they need. Never throws into the page. */
function requiredSpeakingBand(): number | null {
  try {
    const plan = readPersonalPlan();
    if (!plan) return null;
    return plan.goals.perPaperMinimums.speaking?.band ?? plan.goals.overallTarget?.band ?? null;
  } catch {
    return null;
  }
}

/** Shown in place of a result when the page changed hands while the answers
    were being graded (R2-02). The same sentence the writing trainer uses. */
const OWNER_CHANGED_NOTICE = nt(
  'The account on this page changed while this was being graded, so nothing from that attempt is shown here. It is kept for the student who started it.',
);

/** Shown when the page changes hands while an attempt is still being
    answered, or while its report is on screen (R2C-04). The attempt stopped
    at the switch; answers not yet sent for grading were dropped, so nothing
    said after the switch can belong to the student who started it. The same
    sentence the standalone live examiner uses. Names nobody. */
const SESSION_CLOSED_NOTICE = nt(
  'The account on this page changed, so the speaking session on screen was closed. Answers that had not yet been sent for grading were not kept.',
);

export default function SpeakingTester() {
  const { t, tn } = useT();
  const [mode, setMode] = useState<Mode | null>(null);
  const [promptTitle, setPromptTitle] = useState('');
  const [phase, setPhase] = useState<Phase>('menu');
  const [turnIndex, setTurnIndex] = useState(0);
  const [turnCount, setTurnCount] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [prepSecondsLeft, setPrepSecondsLeft] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [notes, setNotes] = useState('');
  const [micError, setMicError] = useState<string | null>(null);
  const [result, setResult] = useState<SpeakingGradeResult | null>(null);
  /* Identity of the recorded attempt, so "ask Mr EZ to explain this" points
     at marking that already happened rather than sending the clip again. */
  const [attemptAt, setAttemptAt] = useState<string | null>(null);
  const [vocab, setVocab] = useState<TopicVocab[] | undefined>(undefined);
  // The grading wait: when the request went out, and how much speech it has
  // to work through. Both feed the honest progress bar.
  const [gradingStartedAt, setGradingStartedAt] = useState(0);
  const [gradingAudioSeconds, setGradingAudioSeconds] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const recordingRef = useRef<RecordingHandle | null>(null);
  const clipsRef = useRef<CollectedClip[]>([]);
  const turnsRef = useRef<Turn[]>([]);
  const cueCardRef = useRef<{ topic: string; bullets: string[] } | null>(null);
  const expectedMinMsRef = useRef(0);
  const modeRef = useRef<Mode | null>(null);
  const promptTitleRef = useRef('');
  // Learner-evidence recording (WP12): the catalogue prompt id this attempt
  // is evidence about (a Part 1 topic id, or a cue card id for Part 2/3),
  // set the moment a mode starts: from an exact deep link (?topic=/?card=)
  // when one was given, otherwise whatever the rotation served.
  const promptIdRef = useRef<string | null>(null);
  // True once the deep-link effect below has run, so it never fires twice.
  const deepLinkHandledRef = useRef(false);
  /* The answer clock and the automatic move to the next question. Both run
     through the attempt (R2C-04), so they stop the moment it does; each ref
     holds the stop. */
  const stopElapsedRef = useRef<(() => void) | null>(null);
  const stopAutoAdvanceRef = useRef<(() => void) | null>(null);
  const prepResolveRef = useRef<(() => void) | null>(null);
  const readyResolveRef = useRef<(() => void) | null>(null);
  /* The question being answered, read by stopAnswering. A ref rather than the
     turnIndex state: the automatic move on runs a copy of stopAnswering made
     a question or more earlier, whose turnIndex is stale: it used to label an
     answer that ran out of time with the previous question, then ask the
     same question again. */
  const turnIndexRef = useRef(0);
  /* The attempt on screen, bound to the student who started it
     (./speaking-attempt-owner.ts). Every step asks it first: may the next
     question start, may the microphone record, may this clip join, may this
     be graded. It stops itself the moment the page changes hands (R2C-04),
     and its binding is the one the grade is settled through (R2-02,
     runOwnedGrade), so a grade that had already begun is still kept for
     that student and never shown to anybody else. Closed when a new part
     starts, on "Start over" and on unmount. */
  const attemptRef = useRef<OwnedSpeakingAttempt | null>(null);

  useEffect(
    () => () => {
      attemptRef.current?.close();
      attemptRef.current = null;
      stopCapture();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /* Exact deep link (WP12 requirement 4): ?part=1&topic=<id> opens that
     Part 1 topic directly, ?part=2&card=<id> opens that cue card's Part 2
     monologue, and ?part=3&card=<id> opens the same card's Part 3 follow
     ups, the query shape the catalogue's speaking activities are built
     around (src/lib/learning/catalog.ts's speakingActivityId /
     speakingPart3ActivityId). Runs once, only from the menu, and only when
     the requested prompt actually exists: an unmatched link is silently
     left for the ordinary menu to handle rather than shown as an error. */
  useEffect(() => {
    if (deepLinkHandledRef.current || phase !== 'menu' || typeof window === 'undefined') return;
    deepLinkHandledRef.current = true;
    const link = parseSpeakingDeepLink(window.location.search);
    if (!link) return;
    if (link.part === 1) {
      if (SPEAKING_PART1_TOPICS.some((t) => t.id === link.topicId)) void startMode('part1', link.topicId);
      return;
    }
    if (SPEAKING_CUE_CARDS.some((c) => c.id === link.cardId)) {
      void startMode(link.part === 2 ? 'part2' : 'part3', link.cardId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  async function startMode(m: Mode, explicitId?: string) {
    if (!isSpeakingGraderConfigured()) return; // the start cards are disabled for this too; belt and braces
    setMicError(null);
    /* A new part lets go of whatever attempt was on screen, and the new one
       belongs to whoever is on the page right now. */
    attemptRef.current?.close();
    stopCapture();
    const attempt = openSpeakingAttempt({ onOwnerLeft: leaveForOwnerChange });
    attemptRef.current = attempt;
    let stream: MediaStream;
    try {
      stream = await requestMic();
    } catch {
      if (attemptRef.current !== attempt) return;
      attempt.close();
      attemptRef.current = null;
      setMicError(t('Microphone access is required for the Speaking test. Please allow the permission and try again.'));
      return;
    }
    /* The page may have changed hands while the permission prompt was up. */
    if (!attempt.mayStartRecording()) {
      releaseMic(stream);
      return;
    }
    streamRef.current = stream;
    clipsRef.current = [];
    modeRef.current = m;
    setMode(m);
    setResult(null);

    let turns: Turn[];
    if (m === 'part1') {
      // An exact deep link (?part=1&topic=<id>) picks this prompt directly
      // and does not consume a rotation slot; otherwise the rotation serves
      // the next one, same as clicking the card always has.
      const id = explicitId ?? nextInRotation('ielts.rotation.speaking-part1.v1', SPEAKING_PART1_TOPICS.map((t) => t.id));
      const topic = SPEAKING_PART1_TOPICS.find((t) => t.id === id) ?? SPEAKING_PART1_TOPICS[0]!;
      promptIdRef.current = topic.id;
      promptTitleRef.current = topic.topic;
      setPromptTitle(topic.topic);
      setVocab(topic.vocab);
      cueCardRef.current = null;
      turns = topic.questions.map((q) => ({ question: q.text, maxMs: 45_000, ideas: q.ideas }));
      expectedMinMsRef.current = turns.length * 15_000;
    } else {
      const id = explicitId ?? nextInRotation('ielts.rotation.speaking-part23.v1', SPEAKING_CUE_CARDS.map((c) => c.id));
      const cue = SPEAKING_CUE_CARDS.find((c) => c.id === id) ?? SPEAKING_CUE_CARDS[0]!;
      promptIdRef.current = cue.id;
      promptTitleRef.current = cue.topic;
      setPromptTitle(cue.topic);
      setVocab(cue.vocab);
      cueCardRef.current = { topic: cue.topic, bullets: cue.bullets };
      if (m === 'part2') {
        turns = [
          {
            question: `${cue.topic} You should say: ${cue.bullets.join('; ')}.`,
            maxMs: 120_000,
            prepMs: 60_000,
            isMonologue: true,
            ideas: cue.ideas,
          },
        ];
        expectedMinMsRef.current = 60_000;
      } else {
        turns = cue.part3Questions.map((q) => ({ question: q.text, maxMs: 60_000, ideas: q.ideas }));
        expectedMinMsRef.current = turns.length * 20_000;
      }
    }
    turnsRef.current = turns;
    setTurnCount(turns.length);
    await beginTurn(attempt, 0);
  }

  async function beginTurn(attempt: OwnedSpeakingAttempt, i: number) {
    /* Every question asks first whether this is still the attempt of the
       student on the page, and again after every wait (R2C-04). */
    if (!attempt.mayStartTurn()) return;
    const turn = turnsRef.current[i];
    if (!turn) {
      await finishAndGrade(attempt);
      return;
    }
    turnIndexRef.current = i;
    setTurnIndex(i);
    setCurrentQuestion(turn.question);
    setElapsedMs(0);
    setPhase('asking');
    await waitUntilReady();
    if (!attempt.mayStartTurn()) return;
    if (turn.prepMs) {
      setNotes('');
      setPhase('prepping');
      await runPrepCountdown(attempt, turn.prepMs);
      if (!attempt.mayStartTurn()) return;
    }
    beginRecording(attempt, turn.maxMs);
  }

  function waitUntilReady(): Promise<void> {
    return new Promise((resolve) => {
      readyResolveRef.current = resolve;
    });
  }

  function confirmReady() {
    readyResolveRef.current?.();
    readyResolveRef.current = null;
  }

  /* The preparation minute, counted by the attempt's own clock so that it
     stops with the attempt. Resolves when the time is up, on "Start speaking
     now", or when the attempt is let go (its next check then stops it). */
  function runPrepCountdown(attempt: OwnedSpeakingAttempt, prepMs: number): Promise<void> {
    return new Promise((resolve) => {
      let left = Math.round(prepMs / 1000);
      setPrepSecondsLeft(left);
      let stop: () => void = () => {};
      const finish = () => {
        stop();
        if (prepResolveRef.current === finish) prepResolveRef.current = null;
        resolve();
      };
      prepResolveRef.current = finish;
      stop = attempt.every(1000, () => {
        left -= 1;
        setPrepSecondsLeft(Math.max(0, left));
        if (left <= 0) finish();
      });
    });
  }

  function skipPrep() {
    prepResolveRef.current?.();
  }

  function beginRecording(attempt: OwnedSpeakingAttempt, maxMs: number) {
    if (!attempt.mayStartRecording() || !streamRef.current) return;
    setPhase('listening');
    recordingRef.current = recordSegment(streamRef.current, { maxMs });
    const startedAt = performance.now();
    /* The answer clock checks the owner on every tick, so even a change of
       owner that reached no listener stops the recording within 200 ms. */
    stopElapsedRef.current = attempt.every(200, () => setElapsedMs(performance.now() - startedAt));
    // recordSegment() auto-stops itself at maxMs; this just makes sure the UI
    // advances even if the student never taps "Stop answering".
    stopAutoAdvanceRef.current = attempt.after(maxMs + 100, () => void stopAnswering());
  }

  async function stopAnswering() {
    const attempt = attemptRef.current;
    const handle = recordingRef.current;
    if (!attempt || !handle) return;
    recordingRef.current = null;
    stopElapsedRef.current?.();
    stopElapsedRef.current = null;
    stopAutoAdvanceRef.current?.();
    stopAutoAdvanceRef.current = null;

    const seg = await handle.stop();
    /* The clip joins the attempt only while the student who started it is
       still the one on the page. Otherwise it may hold words spoken after
       the switch, and it is dropped with the rest of the attempt (R2C-04). */
    if (!attempt.mayAcceptRecording()) return;
    const i = turnIndexRef.current;
    const turn = turnsRef.current[i]!;
    clipsRef.current.push({ question: turn.question, blob: seg.blob, mimeType: seg.mimeType, durationMs: seg.durationMs });
    await beginTurn(attempt, i + 1);
  }

  async function finishAndGrade(attempt: OwnedSpeakingAttempt) {
    /* May this be graded? Only while the student who gave every answer in it
       is still the one on the page (R2C-04): grading is paid, and an attempt
       whose student has gone is dropped rather than sent. A yes means
       grading has begun, and from here a change of owner no longer stops
       it: the grade is kept for that student and not shown to the next. */
    if (!attempt.beginGrading()) return;
    const recordedMs = clipsRef.current.reduce((sum, c) => sum + c.durationMs, 0);
    setGradingAudioSeconds(recordedMs / 1000);
    setGradingStartedAt(Date.now());
    setPhase('grading');
    try {
      await runGrading(attempt);
    } catch {
      // Without this, any failure in the pipeline (audio decode, blob
      // conversion, grading) left the student stuck on "Grading…" forever.
      // The mic is released (recording is over either way), but the clips
      // already captured are NOT discarded and the phase does not fall back
      // to the menu: 'error' offers grading them again from exactly what
      // was recorded, with no re-answering, alongside a plain way to give
      // up and start over. Losing a student's spoken answers to a network
      // blip would be strictly worse than the failure itself.
      // Offered only to the student whose answers these are: if the page
      // changed hands meanwhile, the attempt has stopped itself and the
      // page is already back at its menu (R2C-04).
      if (!attempt.gradingFailed()) return;
      if (streamRef.current) {
        releaseMic(streamRef.current);
        streamRef.current = null;
      }
      // isSpeakingGraderConfigured() gates the Start cards, so any failure
      // reaching here happened after a real request went out — network,
      // timeout, or the Worker itself failing, not a missing config.
      setMicError(t('We could not reach the grading service. Your answers are still here, try grading them again in a minute.'));
      setPhase('error');
    }
  }

  async function runGrading(attempt: OwnedSpeakingAttempt) {
    /* Everything the grade is kept against is read NOW, before the wait: a
       new part started after this screen let go must not relabel it. The
       binding is the attempt's own, made when the part started. */
    const binding = attempt.binding;
    const clips = clipsRef.current;
    const gradedMode = modeRef.current;
    const topic = promptTitleRef.current;
    const promptId = promptIdRef.current;
    const cueCard = cueCardRef.current;
    const expectedMinMs = expectedMinMsRef.current;
    const monologueIdx = turnsRef.current.findIndex((t) => t.isMonologue);
    let at: string | null = null;

    /* The microphone THIS attempt used. Released by that handle rather than
       by whatever streamRef holds when the grade arrives, which after a new
       part has started would be the new attempt's microphone. */
    const gradedStream = streamRef.current;
    const releaseStream = () => {
      if (gradedStream) releaseMic(gradedStream);
      if (streamRef.current === gradedStream) streamRef.current = null;
    };

    const outcome = await runOwnedGrade(
      binding,
      async () => {
        const answered: AnsweredClip[] = await Promise.all(clips.map((c) => toAnsweredClip(c.question, c)));
        const attempt: SpeakingAttempt =
          gradedMode === 'part1'
            ? { kind: 'part1', topic, answers: answered }
            : {
                kind: 'part2and3',
                cueCard: cueCard!,
                monologue: monologueIdx >= 0 ? answered[monologueIdx] : undefined,
                followUps: answered.filter((_, i) => i !== monologueIdx),
              };
        return gradeSpeaking(attempt, clips, expectedMinMs);
      },
      {
        /* Persist to the on-device history so speaking shows a band-over-time
           trend like reading and writing already do, under `owner`: the
           student who spoke, not necessarily the one using the page now. */
        keep: (graded, owner) => {
          if (!gradedMode) return;
          at = new Date().toISOString();
          const criteria = Object.fromEntries(SPEAKING_CRITERIA.map((c) => [c.key, graded.criteria[c.key].band]));

          /* Learner-evidence recording (WP12), written alongside the row
             below, never instead of it: part scope, the four criterion bands,
             whether this was a live grade, and NO audio anywhere in it
             (createEvidenceEvent refuses anything that looks like a
             recording, see evidence.ts's assertNoRawAudio). promptId names
             the exact topic or cue card, set when this mode started
             (startMode), so the activity id matches the catalogue exactly
             whether the prompt came from the rotation or from an exact deep
             link. Written first, so that a record opened for the first time
             on this device takes its one-time copy of the older stores
             before the row below is in them rather than after it. */
          recordSpeakingGradedFor(owner, {
            activityId: promptId
              ? gradedMode === 'part3'
                ? speakingPart3ActivityId(promptId)
                : speakingActivityId(promptId)
              : 'trainer:speaking',
            paper: 'speaking',
            promptId: promptId ?? undefined,
            part: gradedMode === 'part1' ? 1 : gradedMode === 'part2' ? 2 : 3,
            at,
            overallBand: graded.overallBand,
            criteria,
            grader: graded.grader,
            legacyRef: { store: 'speaking', key: gradedMode, at },
          });
          recordSpeakingAttemptFor(owner, {
            at,
            mode: gradedMode,
            topic,
            overallBand: graded.overallBand,
            criteria,
            live: graded.grader.live,
          });
        },
        show: (graded) => {
          attempt.graded();
          releaseStream();
          if (at) setAttemptAt(at);
          setResult(graded);
          setPhase('report');
        },
        hide: () => {
          /* Somebody else is using the page now, and no notification told
             the attempt so (a notified change has already let go of this
             grade). Asking the attempt runs its owner check, which stops it
             and sends the page back to the start with the notice. The grade
             is kept for the student who spoke. */
          releaseStream();
          attempt.ownerStillHere();
        },
      },
    );
    /* The screen let go while the grade was on its way. It has been kept;
       all that is left is to let go of the microphone. */
    if (outcome === 'cancelled') releaseStream();
  }

  /* Stop everything the attempt on screen holds: the recorder, the
     microphone itself, the answer clock, the automatic move on, and any
     question or countdown waiting on a click. What is waiting is released
     rather than left hanging, and finds its attempt stopped at its next
     check, so no later step runs for it. Touches only refs, so it is safe
     from any render, from the owner-change listener and from unmount. */
  function stopCapture() {
    const handle = recordingRef.current;
    recordingRef.current = null;
    if (handle) void handle.stop();
    stopElapsedRef.current?.();
    stopElapsedRef.current = null;
    stopAutoAdvanceRef.current?.();
    stopAutoAdvanceRef.current = null;
    if (streamRef.current) {
      releaseMic(streamRef.current);
      streamRef.current = null;
    }
    const ready = readyResolveRef.current;
    readyResolveRef.current = null;
    ready?.();
    const prep = prepResolveRef.current;
    prepResolveRef.current = null;
    prep?.();
  }

  /* The page changed hands while this attempt was on screen (R2C-04). The
     attempt has already stopped itself; this stops the microphone at once
     and takes all of it off the screen. Answers not yet sent for grading
     are dropped, so nothing is graded or recorded from them and nothing said
     after the switch can join them. A grade that had already begun is kept
     for the student who spoke (runOwnedGrade) and never shown here. */
  function leaveForOwnerChange(stage: SpeakingStageAtSwitch, attempt: OwnedSpeakingAttempt) {
    if (attemptRef.current !== attempt) return;
    attemptRef.current = null;
    stopCapture();
    clipsRef.current = [];
    setMode(null);
    setResult(null);
    setAttemptAt(null);
    setMicError(t(stage === 'grading' ? OWNER_CHANGED_NOTICE : SESSION_CLOSED_NOTICE));
    setPhase('menu');
  }

  function backToMenu() {
    /* A deliberate start-over lets go of the attempt: anything of it still
       being graded is kept for its student but no longer shown here. */
    attemptRef.current?.close();
    attemptRef.current = null;
    stopCapture();
    // A deliberate "start over" (including from the grading-failure screen)
    // discards whatever was recorded. retryGrading() below is the only path
    // that reuses clipsRef, and it never goes through here first.
    clipsRef.current = [];
    setMode(null);
    setPhase('menu');
    setResult(null);
    setMicError(null);
  }

  /** Grade again from the clips already recorded, with no re-answering.
      Offered only from the 'error' phase (see its screen below), where
      clipsRef.current still holds the failed attempt's audio. */
  function retryGrading() {
    const attempt = attemptRef.current;
    if (attempt) void finishAndGrade(attempt);
  }

  /* ── Grading failed: the recorded answers are still here ── */
  if (phase === 'error') {
    return (
      <div className="screen-in mx-auto max-w-md space-y-4 rounded-card border border-border bg-surface p-6 text-center shadow-card">
        <p className="rounded-lg bg-error-tint px-3 py-2 text-sm text-error">{micError}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={retryGrading}
            className="rounded-button bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-hover"
          >
            {t('Try grading again')}
          </button>
          <button
            type="button"
            onClick={backToMenu}
            className="rounded-button border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-alt"
          >
            {t('Start over')}
          </button>
        </div>
      </div>
    );
  }

  /* ── Report screen ── */
  if (phase === 'report' && result) {
    const m = result.mechanics;
    return (
      <div className="screen-in space-y-6">
        <BandReport
          title={promptTitle}
          overallBand={result.overallBand}
          live={result.grader.live}
          offlineWarning={t(
            'Only Fluency & Coherence has any real signal without an AI examiner (from timing alone). Vocabulary, Grammar and Pronunciation need a model listening to your recording. Your teacher can enable AI grading.',
          )}
          criteria={SPEAKING_CRITERIA.map((c) => {
            const score = result.criteria[c.key];
            return {
              key: c.key,
              label: c.label,
              band: score.band,
              comment: score.comment,
              tip: score.tip,
              nextBand: score.nextBand,
              guide: guideFor(SPEAKING_BAND_GUIDES[c.key], score.band),
            };
          })}
          strengths={result.strengths}
          improvements={result.improvements}
          actionPlan={result.actionPlan}
        >
          <div className="rounded-card border border-border bg-surface p-5 shadow-card">
            <h3 className="font-display font-bold">{t('Timing check')}</h3>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <Stat label={t('Spoke for')} value={`${Math.round(m.totalDurationMs / 1000)}s`} bad={m.underLength} />
              <Stat label={t('Silence')} value={`${Math.round(m.estSilenceRatio * 100)}%`} bad={m.estSilenceRatio > 0.4} />
              <Stat
                label={t('Longest pause')}
                value={`${(m.longestSilenceMs / 1000).toFixed(1)}s`}
                bad={m.longestSilenceMs > 4000}
              />
            </div>
            {m.notes.length > 0 && (
              <ul className="mt-4 space-y-1.5 text-sm text-ink-muted">
                {m.notes.map((n) => (
                  <li key={n} className="flex gap-2">
                    <span aria-hidden="true">·</span>
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {result.moments.length > 0 && (
            <div className="rounded-card border border-border bg-surface p-5 shadow-card">
              <h3 className="font-display font-bold">{t('Moments from your answer')}</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {result.moments.map((mo, i) => (
                  <li key={i}>
                    <span className="italic text-ink-muted">&ldquo;{mo.quote}&rdquo;</span>
                    <span className="block text-ink-muted">· {mo.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </BandReport>

        {attemptAt && (
          <ExplainResult
            attempt={{ kind: 'speaking', at: attemptAt }}
            summary={`Estimated band ${result.overallBand.toFixed(1)}`}
          />
        )}

        {/* The teaching hand-off (WP20), on the same rule Writing's has:
            it appears only when the examiner who marked THIS recording
            said something that names one of the objectives this package
            built material for, and pressing it reconciles into the ONE
            plan rather than offering a competing next step. */}
        {mode && (
          <SpeakingObjectiveHandoff result={result} mode={mode} />
        )}

        <SpeakingLibraryLinks result={result} mode={mode} topic={promptTitle} />

        {/* The one control at the end of a piece of work, reading the same
            session every other surface reads (WP20; mirrors WritingTester's
            own mounting of this bar). */}
        <SessionContinueBar
          activityId={
            promptIdRef.current
              ? mode === 'part3'
                ? speakingPart3ActivityId(promptIdRef.current)
                : speakingActivityId(promptIdRef.current)
              : null
          }
          compact
        />

        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => void startMode(mode!)}
            className="rounded-button border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-alt"
          >
            ↻ {t('Practice this part again')}
          </button>
          <button
            type="button"
            onClick={backToMenu}
            className="rounded-button bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            {t('Choose a different part')}
          </button>
        </div>
      </div>
    );
  }

  /* ── Menu screen ── */
  if (phase === 'menu') {
    return (
      <div className="screen-in space-y-4">
        <div className="speaking-choice">
          <span className="absolute inset-x-0 top-0 h-1 bg-[var(--skill,#0E9F6E)]" aria-hidden="true" />
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--skill,#0E9F6E)]">Speaking</p>
          <h3 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">{t('Choose your speaking practice')}</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted sm:text-[0.95rem]">
            {t(
              'Pick a part. Each question appears on screen, you record your answer with your microphone, and an AI examiner grades you on the four official IELTS Speaking criteria. A coach panel with the answer structure, useful phrases, and topic vocabulary stays beside you.',
            )}
          </p>
          {micError && (
            <p className="mx-auto mt-4 max-w-md rounded-lg bg-error-tint px-3 py-2 text-sm text-error">{micError}</p>
          )}
          {!isSpeakingGraderConfigured() && (
            <p className="mx-auto mt-4 max-w-md rounded-lg bg-warning-tint px-3 py-2 text-xs text-ink-muted">
              ⚠{' '}
              {t('AI feedback is not available on this build ({envVar} is not set).', {
                envVar: 'PUBLIC_SPEAKING_GRADER_URL',
              })}
            </p>
          )}
          <SpeakingPartCards onStart={(m) => void startMode(m)} disabled={!isSpeakingGraderConfigured()} />
          <p className="mt-4 text-xs text-ink-muted">
            {tn(SPEAKING_PART1_TOPICS.length, { one: '{n} Part 1 topic', other: '{n} Part 1 topics' })} ·{' '}
            {tn(SPEAKING_CUE_CARDS.length, { one: '{n} cue card', other: '{n} cue cards' })} · {t('free')}
          </p>
        </div>
      </div>
    );
  }

  /* ── In-progress screens: asking / prepping / listening / grading ── */
  const remainingMs = Math.max(0, (turnsRef.current[turnIndex]?.maxMs ?? 0) - elapsedMs);
  const currentIdeas = turnsRef.current[turnIndex]?.ideas;
  return (
    <div className="screen-in lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-4">
    <div className="space-y-4">
      <div className="rounded-card border border-border bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--skill,#0E9F6E)]">
            {MODE_LABEL[mode!]} · {promptTitle}
          </span>
          <span className="text-xs font-semibold text-ink-muted">
            {t('Question {current} / {total}', { current: turnIndex + 1, total: turnCount })}
          </span>
        </div>
        <p className="mt-3 text-[1.05rem] font-semibold leading-relaxed">{currentQuestion}</p>
        {currentIdeas && currentIdeas.length > 0 && (
          <div className="mt-3">
            <IdeaHints key={turnIndex} ideas={currentIdeas} />
          </div>
        )}
      </div>

      {phase === 'asking' && (
        <div className="screen-in rounded-card border border-border bg-surface p-6 text-center shadow-card">
          <p className="text-sm text-ink-muted">{t("Read the question above, then continue when you're ready.")}</p>
          <button
            type="button"
            onClick={confirmReady}
            className="mt-4 rounded-button bg-brand px-6 py-2.5 font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            {turnsRef.current[turnIndex]?.prepMs ? t('Start prep time') : t('Start answering')}
          </button>
        </div>
      )}

      {phase === 'prepping' && (
        <div className="screen-in space-y-3">
          <div className="rounded-card border border-border bg-surface p-6 text-center shadow-card">
            <p className="font-display text-4xl font-extrabold text-brand">{prepSecondsLeft}s</p>
            <p className="mt-1 text-sm text-ink-muted">{t("Prep time: plan what you'll say. You can start early.")}</p>
            <button
              type="button"
              onClick={skipPrep}
              className="mt-4 rounded-button bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
            >
              {t('Start speaking now')}
            </button>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder={t('Optional notes (not graded)…')}
            className="w-full rounded-card border border-border bg-surface p-3 text-sm shadow-card focus:border-brand focus:outline-none"
          />
        </div>
      )}

      {phase === 'listening' && (
        <div className="screen-in rounded-card border border-border bg-surface p-6 text-center shadow-card">
          <p className="flex items-center justify-center gap-2 text-sm font-semibold text-error">
            <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-error" aria-hidden="true" />
            {t('Recording: {seconds}s left', { seconds: Math.ceil(remainingMs / 1000) })}
          </p>
          <button
            type="button"
            onClick={() => void stopAnswering()}
            className="mt-4 rounded-button bg-brand px-6 py-2.5 font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            {t('Stop answering')}
          </button>
        </div>
      )}

      {phase === 'grading' && (
        <div className="screen-in rounded-card border border-border bg-surface p-6 shadow-card">
          <GradingProgress kind="speaking" audioSeconds={gradingAudioSeconds} startedAt={gradingStartedAt} />
        </div>
      )}
    </div>

    {/* The coach: remounts per question so the stage checklist starts fresh
        for every answer (one A.R.E./OREO pass per question). */}
    <div className="mt-4 lg:sticky lg:top-20 lg:mt-0">
      <SpeakingCoachPanel key={`${promptTitle}-${turnIndex}`} method={STRUCTURE_METHOD[mode!]} vocab={vocab} />
    </div>
    </div>
  );
}

function Stat({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className={`rounded-lg border p-2.5 ${bad ? 'border-error/40 bg-error-tint' : 'border-border bg-surface-alt'}`}>
      <p className={`font-display text-lg font-extrabold ${bad ? 'text-error' : ''}`}>{value}</p>
      <p className="text-xs text-ink-muted">{label}</p>
    </div>
  );
}

/** Two quiet ways on from a graded Speaking result, into the reference
 *  libraries WP22 built the receiving end of.
 *
 *  Both are SECONDARY on purpose. The report already carries at most one
 *  real hand-off (SpeakingObjectiveHandoff), which puts a piece of work
 *  into the student's one plan; these are places to read, not things to
 *  do, and they are rendered as plain text links under it so that nothing
 *  here competes with it for the same decision.
 *
 *  Neither is ever invented. The band ladder link appears only when the
 *  student has said what they need and one criterion really is under it,
 *  and it opens on that criterion at the band they actually got. The cue
 *  card link appears only when the topic's own wording plainly names one
 *  of the eight families (see cueCardFamilyOf); a topic that does not gets
 *  no link rather than a wrong one. */
function SpeakingLibraryLinks({
  result,
  mode,
  topic,
}: {
  result: SpeakingGradeResult;
  mode: Mode | null;
  topic: string;
}) {
  const { t } = useT();
  const required = requiredSpeakingBand();
  const weakest = lowestCriterionBelow(
    SPEAKING_CRITERIA.map((c) => ({ key: c.key, band: result.criteria[c.key]?.band ?? Number.NaN })),
    required,
  );
  const criterionLabel = SPEAKING_CRITERIA.find((c) => c.key === weakest?.key)?.label ?? '';
  const family = mode === 'part2' || mode === 'part3' ? cueCardFamilyOf(topic) : null;

  if (!weakest && !family) return null;

  return (
    <nav className="rounded-card border border-border bg-surface-alt px-5 py-4 text-sm" aria-label={t('Where to read more')}>
      <ul className="space-y-1.5 text-ink-muted">
        {weakest && (
          <li>
            <a className="underline decoration-border underline-offset-4 hover:text-ink" href={withBase(bandLadderHref('speaking', weakest.key, weakest.band))}>
              {t('What band {band} to {next} looks like on {criterion}', {
                band: weakest.band.toFixed(1),
                next: (weakest.band + 0.5).toFixed(1),
                criterion: t(criterionLabel),
              })}
            </a>
          </li>
        )}
        {family && (
          <li>
            <a className="underline decoration-border underline-offset-4 hover:text-ink" href={withBase(cueCardHref(CUE_CARD_FAMILY_EXAMPLE[family]))}>
              {t('Another cue card of the same kind')}
            </a>
          </li>
        )}
      </ul>
    </nav>
  );
}
