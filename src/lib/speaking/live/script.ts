/* The exam plan: which Part 1 topics, which cue card.

   Drawn from the same prompt bank and rotation storage the recorded checker
   uses, so a student alternating between the two tools doesn't hit the same
   topics twice.

   The examiner's actual persona, rules, and script text now live in
   ./instructions, which is provider-neutral (both Gemini and OpenAI's
   GPT-Live-1 read it, and so does the live-examiner Worker, so the browser
   never sends free-form prompt text to either session service). This module
   is the browser-side half: it builds the plan and converts it into the
   shapes ./instructions expects, either a full ResolvedPlan (for
   buildInstruction, when a system instruction needs to be built directly)
   or a SessionPlanRequest (ids only, for a session-broker endpoint to
   resolve itself).

   Timing is NOT left to the model: the page runs the clock and injects
   "[DIRECTOR]" text turns at each boundary (Part 1 over, prep over, two
   minutes up, test over). The system instruction binds the model to follow
   those cues instantly — that split (model talks, client times) is what
   keeps the test structure reliable.

   Two session shapes share the same persona and rules: the full three-part
   mock test (/speaking/examiner) and single-part practice drills
   (/trainers/speaking). Both end with the examiner speaking CLOSING_PHRASE
   verbatim, which is what the client watches for to end the session. */

import { SPEAKING_PART1_TOPICS, SPEAKING_CUE_CARDS } from '../../../data/speaking-prompts';
import { nextInRotation } from '../../rotation';
import type { CueCard, Part1Topic } from '../schema';
import { buildInstruction } from './instructions';
import type { LiveMode, LiveProvider, ResolvedPlan, SessionPlanRequest } from './instructions';

export { EXAMINER_NAME, CLOSING_PHRASE } from './instructions';
export type { DirectorCue } from './cues';

export const EXAMINER_VOICE = 'Kore';

export type DrillMode = Exclude<LiveMode, 'full'>;

export interface ExamPlan {
  part1Topics: Part1Topic[];
  cueCard: CueCard;
}

export interface DrillPlan {
  mode: DrillMode;
  /** Shown as the report title and saved to the score history. */
  title: string;
  part1Topic?: Part1Topic;
  cueCard?: CueCard;
}

export function buildExamPlan(): ExamPlan {
  const t1 = nextInRotation('ielts.rotation.speaking-part1.v1', SPEAKING_PART1_TOPICS.map((t) => t.id));
  const t2 = nextInRotation('ielts.rotation.speaking-part1.v1', SPEAKING_PART1_TOPICS.map((t) => t.id));
  const cueId = nextInRotation('ielts.rotation.speaking-part23.v1', SPEAKING_CUE_CARDS.map((c) => c.id));
  const topics = [
    SPEAKING_PART1_TOPICS.find((t) => t.id === t1) ?? SPEAKING_PART1_TOPICS[0]!,
    SPEAKING_PART1_TOPICS.find((t) => t.id === t2) ?? SPEAKING_PART1_TOPICS[1] ?? SPEAKING_PART1_TOPICS[0]!,
  ];
  return {
    part1Topics: topics,
    cueCard: SPEAKING_CUE_CARDS.find((c) => c.id === cueId) ?? SPEAKING_CUE_CARDS[0]!,
  };
}

export function buildDrillPlan(mode: DrillMode): DrillPlan {
  if (mode === 'part1') {
    const id = nextInRotation('ielts.rotation.speaking-part1.v1', SPEAKING_PART1_TOPICS.map((t) => t.id));
    const topic = SPEAKING_PART1_TOPICS.find((t) => t.id === id) ?? SPEAKING_PART1_TOPICS[0]!;
    return { mode, title: topic.topic, part1Topic: topic };
  }
  const cueId = nextInRotation('ielts.rotation.speaking-part23.v1', SPEAKING_CUE_CARDS.map((c) => c.id));
  const cue = SPEAKING_CUE_CARDS.find((c) => c.id === cueId) ?? SPEAKING_CUE_CARDS[0]!;
  return { mode, title: cue.topic, cueCard: cue };
}

function toResolvedPlan(plan: ExamPlan | DrillPlan): ResolvedPlan {
  if (!('mode' in plan)) {
    const [a, b] = plan.part1Topics;
    return { mode: 'full', part1Topics: [a!, b!], cueCard: plan.cueCard };
  }
  if (plan.mode === 'part1') return { mode: 'part1', part1Topic: plan.part1Topic! };
  if (plan.mode === 'part2') return { mode: 'part2', cueCard: plan.cueCard! };
  return { mode: 'part3', cueCard: plan.cueCard! };
}

export function buildSystemInstruction(plan: ExamPlan, provider: LiveProvider = 'gemini'): string {
  return buildInstruction(toResolvedPlan(plan), provider);
}

export function buildDrillSystemInstruction(plan: DrillPlan, provider: LiveProvider = 'gemini'): string {
  return buildInstruction(toResolvedPlan(plan), provider);
}

/** What the browser sends to a session-broker endpoint for a given plan:
    topic/cue-card ids only, never prose, so the endpoint resolves and
    validates the plan itself the same way the live-examiner Worker does. */
export function planRequestFor(plan: ExamPlan | DrillPlan): SessionPlanRequest {
  if (!('mode' in plan)) {
    const [a, b] = plan.part1Topics;
    return { mode: 'full', part1TopicIds: [a!.id, b!.id], cueCardId: plan.cueCard.id };
  }
  if (plan.mode === 'part1') return { mode: 'part1', part1TopicIds: [plan.part1Topic!.id] };
  return { mode: plan.mode, cueCardId: plan.cueCard!.id };
}
