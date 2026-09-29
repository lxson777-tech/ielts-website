/* The placement test's Speaking part: the live examiner's existing Part 1
   drill, on the one topic the placement reserves, embedded the way Mock Exam
   Day embeds the full interview (LiveExaminer's `mock` mode) plus the
   `placement` prop that makes it start the Part 1 drill and write its grade
   as diagnostic evidence of this sitting.

   Never blocks the test. The examiner or its grader not configured on this
   site: the student is told so, and Speaking is left as "not yet assessed"
   without asking for the microphone. No microphone, or no wish to speak
   now: "Skip Speaking" does the same. An interview that could not be
   finished or marked (a refused start, a limit, too little speech): the
   examiner says why on its own screen, and its Back leaves Speaking not yet
   assessed. The plan's staged short sample asks for Speaking later. */

import { useState } from 'react';
import type { Part1Topic } from '../../lib/speaking/schema';
import { gradingAvailable } from '../../lib/speaking/live/grade';
import { deviceStorage } from '../../lib/store-owner';
import { useT } from '../../lib/i18n/react';
import LiveExaminer from '../LiveExaminer';
import { PLACEMENT } from '../../data/placement';
import {
  placementEvidence,
  settlePlacementPart,
  type NotAssessedReason,
  type PlacementStateV1,
} from '../../lib/placement/state';
import type { ExerciseRefusal } from '../learning/exercise-owner';
import { claimPlacementPress, type PlacementSession } from './placement-owner';
import { PartBrief } from './PlacementFrame';

const TOKEN_URL: string | undefined = import.meta.env?.PUBLIC_LIVE_EXAMINER_URL;

/** Whether this build can run and mark the interview at all. */
export function speakingAvailable(): boolean {
  return Boolean(TOKEN_URL) && gradingAvailable();
}

export default function PlacementSpeaking({
  topic,
  session,
  state,
  onChanged,
  onRefused,
}: {
  topic: Part1Topic;
  session: PlacementSession;
  state: PlacementStateV1;
  onChanged: () => void;
  onRefused: (refusal: ExerciseRefusal) => void;
}) {
  const { t } = useT();
  const [running, setRunning] = useState(false);
  const available = speakingAvailable();

  function settle(outcome: { kind: 'graded'; band: number } | { kind: 'not-assessed'; reason: NotAssessedReason }) {
    const at = new Date().toISOString();
    settlePlacementPart(
      deviceStorage(),
      session.namespace,
      state.sittingId,
      'speaking',
      outcome.kind === 'graded' ? { kind: 'graded', band: outcome.band, at } : { kind: 'not-assessed', reason: outcome.reason, at },
    );
    onChanged();
  }

  function pressSettle(reason: NotAssessedReason) {
    const claim = claimPlacementPress(session);
    if ('refused' in claim) {
      onRefused(claim.refused);
      return;
    }
    claim.binding.cancel();
    settle({ kind: 'not-assessed', reason });
  }

  function start() {
    const claim = claimPlacementPress(session);
    if ('refused' in claim) {
      onRefused(claim.refused);
      return;
    }
    claim.binding.cancel();
    setRunning(true);
  }

  if (!available) {
    return (
      <PartBrief
        part="speaking"
        index={3}
        lead={t('Speaking cannot be assessed on this site right now, so this part is left out and shown as not yet assessed. Nothing is lost: your plan will ask for a short Speaking sample later.')}
        facts={[t('Not yet assessed')]}
        action={
          <button type="button" className="pl-primary" onClick={() => pressSettle('unavailable')}>
            {t('See my results')}
          </button>
        }
      />
    );
  }

  if (running) {
    const evidence = placementEvidence(state.sittingId);
    return (
      <div className="pl-enter">
        <LiveExaminer
          variant="full"
          mock
          placement={{ topicId: topic.id, sessionId: evidence.sessionId, sourceMaterial: evidence.sourceMaterial }}
          onComplete={(result) => settle({ kind: 'graded', band: result.overallBand })}
          onAbort={() => settle({ kind: 'not-assessed', reason: 'failed' })}
          /* The page changed hands: the placement page has already handed
             over and taken this away. Nothing is settled; the student who
             started it finds Speaking where they left it. */
          onSuspend={() => setRunning(false)}
        />
      </div>
    );
  }

  return (
    <PartBrief
      part="speaking"
      index={3}
      lead={t('A short Part 1 interview with the AI examiner: everyday questions about one familiar topic. Answer out loud, and say a little more than yes or no.')}
      facts={[t('About {n} min', { n: PLACEMENT.speaking.minutes }), 'Part 1', t('Microphone needed')]}
      note={t('The examiner marks your answers from the recording itself. The recording is not kept.')}
      action={
        <button type="button" className="pl-primary" onClick={start}>
          {t('Start Speaking')}
        </button>
      }
      secondary={
        <button type="button" className="pl-secondary" onClick={() => pressSettle('skipped')}>
          {t('Skip Speaking')}
        </button>
      }
    />
  );
}
