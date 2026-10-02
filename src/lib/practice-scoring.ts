/* Marking for the practice exercises inside lessons (src/components/PracticeQuiz.tsx).

   Most questions are marked on their own: the typed or chosen answer is
   compared with the accepted answers, ignoring case and extra spaces.

   Some groups have answers that form an unordered set: "which THREE...", or
   a table where blanks 5, 7 and 9 take any of three letters in any order.
   Those questions carry the same `pool` id, and inside a pool each accepted
   answer can earn at most one mark. Typing the same right letter into every
   blank of the pool scores once, not three times; the right letters in any
   order score every blank. This is the same rule the full test player
   applies to `answerPairId` (scoredQuestionIds in src/lib/tests/schema.ts),
   and the practice data copies those ids into `pool`. */

export interface ScorableQuestion {
  answer: string | string[];
  /** Questions in one unit sharing this id form an unordered answer pool. */
  pool?: string;
}

export function normalizePracticeAnswer(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

function acceptedOf(q: ScorableQuestion): string[] {
  return Array.isArray(q.answer) ? q.answer : [q.answer];
}

/** True when `given` is one of this question's accepted answers, taken on
    its own. Used to light up the right option of a multiple-choice
    question; marks come from practiceMarks. */
export function acceptsAnswer(q: ScorableQuestion, given: string): boolean {
  const g = normalizePracticeAnswer(given);
  return acceptedOf(q).some((a) => normalizePracticeAnswer(a) === g);
}

/** Which questions of one unit earn a mark, in question order. A pooled
    question earns its mark when its answer is accepted anywhere in the pool
    and has not already earned a mark for an earlier question of the pool. */
export function practiceMarks(questions: readonly ScorableQuestion[], drafts: readonly string[]): boolean[] {
  const marks = questions.map(() => false);
  const pools = new Map<string, number[]>();
  questions.forEach((q, i) => {
    if (q.pool) {
      const members = pools.get(q.pool) ?? [];
      members.push(i);
      pools.set(q.pool, members);
    } else {
      const given = drafts[i] ?? '';
      marks[i] = given.trim() !== '' && acceptsAnswer(q, given);
    }
  });
  for (const members of pools.values()) {
    const accepted = new Set(members.flatMap((i) => acceptedOf(questions[i]!).map(normalizePracticeAnswer)));
    const used = new Set<string>();
    for (const i of members) {
      const given = normalizePracticeAnswer(drafts[i] ?? '');
      if (given && accepted.has(given) && !used.has(given)) {
        used.add(given);
        marks[i] = true;
      }
    }
  }
  return marks;
}

export interface PracticeCorrection {
  /** The accepted answer to show for this question (raw value, before any
      option label is looked up). */
  expected: string;
  /** True when the answer given is right for the pool but had already
      earned its mark in another question of the same pool. */
  repeated: boolean;
}

/** What to show as "the answer" for each question once a unit is checked.
    Outside a pool it is the first accepted answer. Inside a pool, a question
    that missed is given an accepted answer the student has not already
    earned elsewhere in the pool, so F, F, F on blanks 5, 7 and 9 shows G and
    J for the two that missed rather than F again. */
export function practiceCorrections(
  questions: readonly ScorableQuestion[],
  drafts: readonly string[],
  marks: readonly boolean[] = practiceMarks(questions, drafts),
): PracticeCorrection[] {
  const out: PracticeCorrection[] = questions.map((q) => ({ expected: acceptedOf(q)[0] ?? '', repeated: false }));
  const pools = new Map<string, number[]>();
  questions.forEach((q, i) => {
    if (!q.pool) return;
    const members = pools.get(q.pool) ?? [];
    members.push(i);
    pools.set(q.pool, members);
  });
  for (const members of pools.values()) {
    const accepted = new Set(members.flatMap((i) => acceptedOf(questions[i]!).map(normalizePracticeAnswer)));
    const taken = new Set(members.filter((i) => marks[i]).map((i) => normalizePracticeAnswer(drafts[i] ?? '')));
    for (const i of members) {
      if (marks[i]) {
        out[i] = { expected: drafts[i]!.trim(), repeated: false };
        continue;
      }
      const own = acceptedOf(questions[i]!);
      const pick = own.find((a) => !taken.has(normalizePracticeAnswer(a))) ?? own[0] ?? '';
      taken.add(normalizePracticeAnswer(pick));
      const given = normalizePracticeAnswer(drafts[i] ?? '');
      out[i] = { expected: pick, repeated: given !== '' && accepted.has(given) };
    }
  }
  return out;
}
