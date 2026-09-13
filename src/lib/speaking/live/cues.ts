/* Typed stage directions ("cues") the browser sends to the session-broker
   Worker instead of appending instructions to OpenAI itself. The browser no
   longer decides what text OpenAI sees at each exam boundary: it names the
   moment (begin, part2_intro, ...), the Worker validates that the requested
   transition is legal for the session's current stage, and only the Worker
   turns the cue into the actual [DIRECTOR] text via the trusted sideband.

   This module is deliberately pure (no browser globals, no fetch): the
   Worker imports it too, so both sides agree on the transition table and the
   exact wording without duplicating either. */

import type { LiveMode } from './instructions';

export type DirectorCue =
  | { type: 'begin' }
  | { type: 'part2_intro' }
  | { type: 'part2_talk' }
  | { type: 'part2_end'; timeUp: boolean }
  | { type: 'conclude'; reason: 'time' | 'candidate' }
  | { type: 'delegation'; delegationId: string };

export type SessionStage = 'created' | 'part1' | 'part2prep' | 'part2talk' | 'part3' | 'wrapup' | 'ended';

export const SESSION_STAGES: readonly SessionStage[] = [
  'created',
  'part1',
  'part2prep',
  'part2talk',
  'part3',
  'wrapup',
  'ended',
];

export class CueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CueError';
  }
}

const DELEGATION_ID_RE = /^[A-Za-z0-9_-]{1,80}$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Rejects any field not in `allowed` — an untrusted cue must be exactly the
    shape we expect, nothing appended, nothing extra smuggled in. */
function checkKeys(obj: Record<string, unknown>, allowed: readonly string[]): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) throw new CueError(`Unexpected field on cue: ${key.slice(0, 40)}`);
  }
}

/** Validates an untrusted cue (typically a parsed request body). Throws
    CueError with a short, safe (no reflected user input beyond a 40-char
    slice) message on anything unexpected. */
export function parseDirectorCue(input: unknown): DirectorCue {
  if (!isRecord(input)) throw new CueError('cue must be an object');
  const type = input.type;
  if (typeof type !== 'string') throw new CueError('cue.type must be a string');

  switch (type) {
    case 'begin':
    case 'part2_intro':
    case 'part2_talk':
      checkKeys(input, ['type']);
      return { type };

    case 'part2_end': {
      checkKeys(input, ['type', 'timeUp']);
      if (typeof input.timeUp !== 'boolean') throw new CueError('part2_end.timeUp must be a boolean');
      return { type: 'part2_end', timeUp: input.timeUp };
    }

    case 'conclude': {
      checkKeys(input, ['type', 'reason']);
      if (input.reason !== 'time' && input.reason !== 'candidate') {
        throw new CueError('conclude.reason must be "time" or "candidate"');
      }
      return { type: 'conclude', reason: input.reason };
    }

    case 'delegation': {
      checkKeys(input, ['type', 'delegationId']);
      if (typeof input.delegationId !== 'string' || !DELEGATION_ID_RE.test(input.delegationId)) {
        throw new CueError('delegation.delegationId is invalid');
      }
      return { type: 'delegation', delegationId: input.delegationId };
    }

    default:
      throw new CueError(`Unknown cue type: ${type.slice(0, 40)}`);
  }
}

/** The session-stage machine. Returns the next stage for a legal transition,
    or null when the cue is not allowed from the session's current stage (the
    caller should treat null as a 409, not throw). */
export function nextStage(mode: LiveMode, stage: SessionStage, cue: DirectorCue): SessionStage | null {
  switch (cue.type) {
    case 'begin': {
      if (stage !== 'created') return null;
      if (mode === 'part2') return 'part2prep';
      if (mode === 'part3') return 'part3';
      return 'part1'; // full or part1
    }

    case 'part2_intro':
      if (mode !== 'full') return null;
      if (stage !== 'part1') return null;
      return 'part2prep';

    case 'part2_talk':
      if (mode !== 'full' && mode !== 'part2') return null;
      if (stage !== 'part2prep') return null;
      return 'part2talk';

    case 'part2_end':
      if (mode !== 'full' && mode !== 'part2') return null;
      if (stage !== 'part2talk') return null;
      return mode === 'part2' ? 'wrapup' : 'part3';

    case 'conclude':
      if (stage === 'part1' || stage === 'part2prep' || stage === 'part2talk' || stage === 'part3') return 'wrapup';
      return null;

    case 'delegation':
      return stage === 'ended' ? null : stage;
  }
}

const CONCLUDE_TAIL = 'Conclude the test now with the official closing line, then say nothing more.';

/** Plain-text wording for a cue, no "[DIRECTOR]" prefix (the caller adds
    that, since the delegation cue is delivered differently — see cueEvent). */
export function cueText(mode: LiveMode, cue: DirectorCue): string {
  switch (cue.type) {
    case 'begin':
      if (mode === 'full') {
        return 'The candidate is seated and ready. Begin the test now with the introduction. Speak first now, without waiting for the candidate to say anything.';
      }
      if (mode === 'part1') {
        return 'The candidate is seated and ready. Greet them briefly and begin the Part 1 questions now. Speak first now, without waiting for the candidate to say anything.';
      }
      if (mode === 'part2') {
        return 'The candidate is seated and ready. Greet them briefly, then introduce the cue card exactly as scripted, ending with "Your one minute starts now." Then wait in complete silence. Speak first now, without waiting for the candidate to say anything.';
      }
      return 'The candidate is seated and ready. Greet them briefly and begin the discussion now. Speak first now, without waiting for the candidate to say anything.'; // part3

    case 'part2_intro':
      return 'Part 1 is over. Introduce the Part 2 cue card now exactly as scripted, ending with "Your one minute starts now." Then wait in complete silence.';

    case 'part2_talk':
      return 'The preparation minute is over. Invite the candidate to start speaking now.';

    case 'part2_end':
      if (mode === 'part2') {
        return cue.timeUp
          ? 'Two minutes are up. If the candidate is still speaking, stop them politely ("Thank you."). Ask the one rounding-off question, wait for the answer, then conclude the drill with the official closing line and say nothing more.'
          : 'The candidate has finished their talk. Ask the one rounding-off question, wait for the answer, then conclude the drill with the official closing line and say nothing more.';
      }
      return cue.timeUp
        ? 'Two minutes are up. If the candidate is still speaking, stop them politely ("Thank you."). Ask the rounding-off question if you have not, then begin the Part 3 discussion.'
        : 'The candidate has finished their talk. Ask the rounding-off question, then begin the Part 3 discussion.';

    case 'conclude': {
      const lead =
        cue.reason === 'time' ? (mode === 'full' ? 'The test time is over.' : 'The drill time is over.') : 'The candidate has asked to finish.';
      return `${lead} ${CONCLUDE_TAIL}`;
    }

    case 'delegation':
      return 'There is no backend. Continue the speaking test yourself from the script, without waiting.';
  }
}

/** The actual wire event for a cue: an appended session instruction for
    everything except `delegation`, which is the one case OpenAI expects a
    reply tied to a specific delegation_id via session.thinking.append. */
export function cueEvent(
  mode: LiveMode,
  cue: DirectorCue,
  eventId: string,
): { type: 'session.instructions.append' | 'session.thinking.append'; event_id: string; delegation_id: string | null; content: string } {
  const text = cueText(mode, cue);
  if (cue.type === 'delegation') {
    return { type: 'session.thinking.append', event_id: eventId, delegation_id: cue.delegationId, content: text };
  }
  return { type: 'session.instructions.append', event_id: eventId, delegation_id: null, content: `[DIRECTOR] ${text}` };
}
