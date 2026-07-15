/* Study-plan storage, extracted from StudyPlan.tsx so the account-sync layer
   can read/write it too (the component is no longer the sole owner). Same
   localStorage-first contract as progress.ts: SSR, blocked storage and corrupt
   JSON all degrade to null. A change listener lets sync push on edit and lets
   an open StudyPlan refresh when a cloud pull updates the plan. */

export const STUDY_PLAN_KEY = 'ielts.studyplan.v1';

export interface SavedPlan {
  targetBand: string;
  /** ISO yyyy-mm-dd, or '' when the student hasn't booked a date */
  testDate: string;
  createdAt: string; // ISO datetime
  /** indices of completed steps, flattened across the whole plan in order */
  done: number[];
}

const listeners = new Set<() => void>();

/** Subscribe to plan writes (local edits or cloud pulls). Returns unsubscribe. */
export function onStudyPlanChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify(): void {
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* a listener throwing must not break the writer */
    }
  }
}

export function loadStudyPlan(): SavedPlan | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STUDY_PLAN_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.targetBand !== 'string') return null;
    return { done: [], testDate: '', createdAt: '', ...p } as SavedPlan;
  } catch {
    return null;
  }
}

export function saveStudyPlan(p: SavedPlan): void {
  try {
    window.localStorage.setItem(STUDY_PLAN_KEY, JSON.stringify(p));
  } catch {
    /* storage blocked — the plan just won't persist, never fatal */
  }
  notify();
}

export function clearStudyPlan(): void {
  try {
    window.localStorage.removeItem(STUDY_PLAN_KEY);
  } catch {
    /* ignore */
  }
  notify();
}

/** Merge two plans (local + cloud). The plan with the later createdAt wins;
    when they're the same plan (same target, date and creation), the completed
    steps are unioned so progress made on either device is never lost. */
export function mergeStudyPlans(a: SavedPlan | null, b: SavedPlan | null): SavedPlan | null {
  if (!a) return b;
  if (!b) return a;
  const samePlan = a.targetBand === b.targetBand && a.testDate === b.testDate && a.createdAt === b.createdAt;
  if (samePlan) {
    return { ...a, done: [...new Set([...a.done, ...b.done])].sort((x, y) => x - y) };
  }
  return a.createdAt >= b.createdAt ? a : b;
}

/* ── Plan generation ────────────────────────────────────────────────────────
   Pulled in from StudyPlan.tsx so the account dashboard can compute "X% of
   your plan done" without duplicating the tier/stage logic. */

export interface PlanStep {
  label: string;
  href?: string;
}
export interface PlanStage {
  title: string;
  blurb: string;
  steps: PlanStep[];
}

export type PlanTier = 'sprint' | 'month' | 'season' | 'foundation';

export const PLAN_TIER_LABEL: Record<PlanTier, string> = {
  sprint: 'Sprint plan',
  month: 'One-month plan',
  season: '2-3 month plan',
  foundation: 'Foundation plan',
};

/** Whole days from today until the test date (>=0), or null if no date given. */
export function daysUntilTest(testDate: string): number | null {
  if (!testDate) return null;
  const then = new Date(testDate + 'T00:00:00');
  if (Number.isNaN(then.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((then.getTime() - today.getTime()) / 86_400_000));
}

export function planTierFor(days: number | null): PlanTier {
  if (days === null) return 'foundation';
  if (days <= 14) return 'sprint';
  if (days <= 35) return 'month';
  if (days <= 90) return 'season';
  return 'foundation';
}

// Reusable, real-feature steps referenced across the tiers.
const S = {
  diagReading: { label: 'Diagnostic: take a full timed Reading test to see your starting band', href: '/tests' },
  diagWriting: { label: 'Diagnostic: write one Task 2 essay in the Writing Checker for an AI band', href: '/trainers/writing' },
  readingOverview: { label: 'Study the Reading Overview: formats, timing and every question type', href: '/lessons/reading-task1' },
  writingOverview: { label: 'Study the Writing Overview and the Task 2 method', href: '/lessons/writing' },
  speakingOverview: { label: 'Study the Speaking Overview: all three parts and how they are marked', href: '/lessons/speaking' },
  vocab: { label: 'Learn a vocabulary topic set, and check the Word of the Day daily', href: '/lessons/vocabulary' },
  readingTrainer: { label: 'Do a 20-minute Reading Trainer drill, starting with your weakest question type', href: '/trainers/reading' },
  writingChecker: { label: 'Write an essay in the Writing Checker and apply every correction it gives', href: '/trainers/writing' },
  speakingTrainer: { label: 'Practice one Speaking part in the Speaking Trainer with the structure cheat-sheet', href: '/trainers/speaking' },
  speakingExaminer: { label: 'Do a full mock with the Live AI Examiner and read the band feedback', href: '/speaking/examiner' },
  mockReading: { label: 'Sit a fresh full Reading test under strict exam timing', href: '/tests' },
  review: { label: 'Review your score history and re-target whichever skill is lagging', href: '/account' },
} satisfies Record<string, PlanStep>;

export function buildStudyPlanStages(days: number | null): PlanStage[] {
  const tier = planTierFor(days);

  if (tier === 'sprint') {
    return [
      {
        title: 'Days 1-2 · Know where you stand',
        blurb: 'No cramming yet. Measure first so the next days aim at the right gaps.',
        steps: [S.diagReading, S.diagWriting, S.readingOverview],
      },
      {
        title: 'Days 3-9 · Rotate the skills',
        blurb: 'One focused session per skill per day. Fast trainers, not full exams.',
        steps: [S.readingTrainer, S.writingChecker, S.speakingTrainer, S.speakingExaminer, S.vocab],
      },
      {
        title: 'Final days · Rehearse under pressure',
        blurb: 'Simulate exam day and tidy up your weakest paper.',
        steps: [S.mockReading, S.review, S.writingChecker],
      },
    ];
  }

  if (tier === 'month') {
    return [
      {
        title: 'Week 1 · Diagnose and learn the exam',
        blurb: 'Find your baseline and learn exactly how each paper is scored.',
        steps: [S.diagReading, S.diagWriting, S.readingOverview, S.writingOverview, S.speakingOverview],
      },
      {
        title: 'Weeks 2-3 · Build each skill',
        blurb: 'Daily focused practice, rotating skills, applying feedback each time.',
        steps: [S.readingTrainer, S.writingChecker, S.speakingTrainer, S.vocab],
      },
      {
        title: 'Week 4 · Mock and refine',
        blurb: 'Full timed practice, then target whatever is still below your goal.',
        steps: [S.mockReading, S.speakingExaminer, S.review],
      },
    ];
  }

  if (tier === 'season') {
    return [
      {
        title: 'Month 1 · Foundations',
        blurb: 'Learn every paper thoroughly and start steady vocabulary building.',
        steps: [S.readingOverview, S.writingOverview, S.speakingOverview, S.vocab, S.diagReading],
      },
      {
        title: 'Month 2 · Deliberate practice',
        blurb: 'Drill each skill several times a week and act on the AI feedback.',
        steps: [S.readingTrainer, S.writingChecker, S.speakingTrainer, S.diagWriting],
      },
      {
        title: 'Final stretch · Exam conditions',
        blurb: 'Regular full mocks and targeted fixes for your weakest skill.',
        steps: [S.mockReading, S.speakingExaminer, S.review],
      },
    ];
  }

  // foundation (no date, or 3+ months)
  return [
    {
      title: 'Stage 1 · Learn the exam',
      blurb: 'Work through every skill overview so nothing on test day is a surprise.',
      steps: [S.readingOverview, S.writingOverview, S.speakingOverview, S.vocab],
    },
    {
      title: 'Stage 2 · Practice steadily',
      blurb: 'A little every day beats cramming. Rotate skills and build vocabulary.',
      steps: [S.readingTrainer, S.writingChecker, S.speakingTrainer, S.diagReading, S.diagWriting],
    },
    {
      title: 'Stage 3 · Test yourself',
      blurb: "Once you're comfortable, sit full mocks and keep re-targeting weak spots.",
      steps: [S.mockReading, S.speakingExaminer, S.review],
    },
  ];
}
