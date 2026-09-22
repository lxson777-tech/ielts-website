/* Mr EZ's weekly review: the card at the top of the printable progress
   report. Same three-pass discipline as MrEzWelcome (read its header
   comment first, the loop bug it guards against is the same one here):

   1. The counted facts (src/lib/tutor/week.ts) and weekFallbackText render
      immediately from this device's own stored record. No network, no
      spinner, no AI needed for the card to be honest and complete.
   2. Only when the week under review is a COMPLETED one ('last-week' mode),
      the tutor is configured, and the student is signed in, Mr EZ is asked
      to word it. The facts themselves never change because of his answer.
   3. 'this-week' and 'none' modes NEVER ask the tutor. The server refuses a
      review of a week still in progress by design (it would buy a new
      answer on every lesson), so asking would be a request that can only
      fail, and a week in progress is exactly the case that would make an
      unguarded effect re-ask on every store write.

   The local and tutor halves are kept in separate state, the tutor half
   tagged with weekFingerprint() of the record it was written about, and an
   askedRef Set (cleared when signed-in state changes) stops a fingerprint
   being asked about twice (the same rule the Worker's own cache uses, so
   the two agree). A 400 (no completed week yet, a stale ask that raced a
   fingerprint change) is just another ordinary failure and stays silent. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { withBase } from '../../lib/url';
import { useT, type Translator } from '../../lib/i18n/react';
import { nt } from '../../lib/i18n/translate';
import type { Locale } from '../../lib/i18n/locale';
import MrEzAvatar from './MrEzAvatar';
import { askTutor, isTutorConfigured, TutorClientError } from '../../lib/tutor/client';
import { localRecommendation, toTutorRecommendation } from '../../lib/tutor/local';
import { reviewTarget, readWeek, weekFingerprint, weekFallbackText, type WeekFacts, type WeekWindow } from '../../lib/tutor/week';
import type { TutorMood, TutorRecommendation } from '../../lib/tutor/schema';
import { onAuthChange } from '../../lib/auth/session';
import { getProgress, onProgressChange } from '../../lib/progress';
import { loadStudyPlan, onStudyPlanChange } from '../../lib/study-plan';
import { ensureLearningWired, ensurePlan, readLearnerRecord } from '../../lib/learning';
import { evaluateEvidence } from '../../lib/learning/policy';
import type { GapAssessment } from '../../lib/learning/contracts/policy';
import type { Paper } from '../../lib/learning/contracts/catalog';
import { PAPERS } from '../../lib/learning/contracts/catalog';
import '../../styles/mr-ez-weekly.css';
import '../../styles/learning-progress.css';

// localRecommendation() below runs recommendNext(), which is a VIEW of the
// student's shared session (src/lib/tutor/recommend.ts's header comment).
// It still gives a correct, self-consistent answer with no wiring at all
// (it derives a session on the spot from progress and the saved plan), but
// only wiring reads the student's actual STORED plan, the same one Today
// and every override apply to. /report can be opened with nothing else on
// the page having imported the learning layer, so this card wires it itself
// rather than relying on another island having done so first.
ensureLearningWired();

type ReviewMode = 'last-week' | 'this-week' | 'none';

/** The non-AI view, rebuilt whenever progress or the study plan change. */
interface LocalView {
  mode: ReviewMode;
  facts: WeekFacts;
  fingerprint: string;
  fallbackText: string;
  recommendation: TutorRecommendation | null;
  /** Where the goal is furthest from being met, biggest shortfall first,
      from the same evidence policy the progress report reads. Used to show
      effort against the gaps that matter (WP23's brief, section 9) rather
      than a second, competing read of what the student should work on:
      `recommendation` above still names the one shared next step. */
  topGaps: readonly GapAssessment[];
}

/** Mr EZ's own wording, tagged with the week it was written about. */
interface TutorView {
  fingerprint: string;
  text: string;
  recommendation: TutorRecommendation | null;
  mood: TutorMood;
  live: boolean;
}

/** A week's two date keys written the way a person would say them, e.g.
    "14 to 20 September" (English) or "с 14 по 20 сентября" (Russian), or,
    when the week crosses a month boundary, "29 September to 5 October" /
    "с 29 сентября по 5 октября". Built from the date keys directly (no
    Date arithmetic beyond naming the month) so it can never disagree with
    the calendar week the facts were actually counted over. The month name
    itself follows the interface language via Intl.DateTimeFormat, asked
    together with a day number so Russian returns the genitive form that
    reads naturally next to one ("14 сентября", not "14 сентябрь"). */
function monthName(locale: Locale, monthIndex0: number): string {
  const sample = new Date(2024, monthIndex0, 15);
  const withDay = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(sample);
  const word = withDay.split(' ').find((part) => !/^\d/.test(part));
  return word ?? withDay;
}

function formatWeekRange(window: WeekWindow, t: Translator['t'], locale: Locale): string {
  const [startYear, startMonth, startDay] = window.start.split('-').map(Number);
  const [endYear, endMonth, endDay] = window.end.split('-').map(Number);
  const endName = monthName(locale, endMonth! - 1);
  // Same key names and text as the study-plan week range
  // (dict/ru/dashboard-plan.ts), so both reuse one Russian entry.
  if (startYear === endYear && startMonth === endMonth) {
    return t('{startDay} to {endDay} {month}', { startDay: startDay!, endDay: endDay!, month: endName });
  }
  const startName = monthName(locale, startMonth! - 1);
  return t('{startDay} {startMonth} to {endDay} {endMonth}', {
    startDay: startDay!,
    startMonth: startName,
    endDay: endDay!,
    endMonth: endName,
  });
}

function headingFor(mode: ReviewMode, t: Translator['t']): string {
  if (mode === 'last-week') return t('Last week with Mr EZ');
  if (mode === 'this-week') return t('This week so far');
  return 'Mr EZ';
}

function buildLocalView(t: Translator['t'], locale: Locale): LocalView {
  const progress = getProgress();
  const plan = loadStudyPlan();
  const now = new Date();
  const offsetMinutes = -now.getTimezoneOffset();
  const target = reviewTarget(progress, plan, now, offsetMinutes);

  // The real plan and learner record, for the quoted change history and the
  // gaps-against-effort section. ensureLearningWired() above (module load)
  // means this reads the same stored plan Today and every other surface
  // read, not a second derivation of it.
  const learningPlan = ensurePlan();
  const facts = readWeek(progress, plan, target.window, now, offsetMinutes, learningPlan.history);
  const policy = evaluateEvidence({ record: readLearnerRecord(), goals: learningPlan.goals, now: now.toISOString() });
  const topGaps = [...policy.gaps]
    .filter((gap) => gap.scope.kind === 'paper' && gap.shortfall !== null && !gap.meetsRequirement)
    .slice(0, 2);

  const fallbackText =
    target.mode === 'none'
      ? t('Nothing recorded in the last two weeks. Here is an easy way back in.')
      : weekFallbackText(facts, locale);
  return {
    mode: target.mode,
    facts,
    // The language is part of the fingerprint, so switching it asks Mr EZ
    // for a review in the new one instead of keeping the old paragraph.
    fingerprint: weekFingerprint(facts, locale),
    fallbackText,
    topGaps,
    recommendation: toTutorRecommendation(localRecommendation(), locale),
  };
}

export default function WeeklyReview() {
  const { t, locale } = useT();
  const [local, setLocal] = useState<LocalView | null>(null);
  const [tutor, setTutor] = useState<TutorView | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [asking, setAsking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  /** Fingerprints already asked about. See MrEzWelcome's header comment for
      why this exists and why it is cleared on sign-in change. */
  const askedRef = useRef(new Set<string>());

  useEffect(() => {
    askedRef.current.clear();
    setNotice(null);
  }, [signedIn]);

  // Everything is read after mount: the stores are localStorage-backed, so
  // the server render and the first client render must agree on "nothing
  // yet" and print nothing.
  useEffect(() => {
    const refresh = () => setLocal(buildLocalView(t, locale));
    refresh();
    const offProgress = onProgressChange(refresh);
    const offPlan = onStudyPlanChange(refresh);
    const offAuth = onAuthChange((user) => setSignedIn(Boolean(user)));
    return () => {
      offProgress();
      offPlan();
      offAuth();
    };
  }, [t, locale]);

  // Mr EZ's own wording, only for a completed week, only once per
  // fingerprint. 'this-week' and 'none' never reach this: the server
  // refuses a review of a week still in progress, and asking anyway would
  // just be a request that fails every time the student does anything.
  useEffect(() => {
    if (!local || local.mode !== 'last-week' || !isTutorConfigured() || !signedIn) return;
    if (tutor?.fingerprint === local.fingerprint) return;
    if (askedRef.current.has(local.fingerprint)) return;

    const fingerprint = local.fingerprint;
    askedRef.current.add(fingerprint);
    let cancelled = false;
    setAsking(true);

    const offsetMinutes = -new Date().getTimezoneOffset();

    void askTutor({ task: 'weekly', tzOffsetMinutes: offsetMinutes })
      .then((reply) => {
        if (cancelled) return;
        setTutor({
          fingerprint,
          text: reply.text,
          recommendation: reply.recommendation ?? null,
          mood: reply.mood,
          live: reply.live,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        // Silent by design: a 400 (no completed week, or a stale ask that
        // raced a fingerprint change) and every other ordinary failure
        // leave the already-honest fallback text on screen. Only a spent
        // daily limit is worth a word.
        if (err instanceof TutorClientError && (err.code === 'limit-reached' || err.code === 'site-limit-reached')) {
          setNotice(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setAsking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [local, signedIn, tutor]);

  /* Which version is on screen. The tutor's wording only counts while it
     still describes the week in front of us, and only in last-week mode. */
  const shown = useMemo(() => {
    if (!local) return null;
    const fresh = local.mode === 'last-week' && tutor && tutor.fingerprint === local.fingerprint ? tutor : null;
    return {
      text: fresh?.text ?? local.fallbackText,
      recommendation: fresh?.recommendation ?? local.recommendation,
      mood: (fresh?.mood ?? 'idle') as TutorMood,
      fromTutor: Boolean(fresh),
      live: fresh?.live ?? false,
    };
  }, [local, tutor]);

  if (!local || !shown) return null;

  return (
    <section className="mrez-weekly report-print-hide" aria-labelledby="mrez-weekly-heading">
      <MrEzAvatar mood={asking ? 'thinking' : shown.mood} size={44} />
      <div className="mrez-weekly-body">
        <h2 id="mrez-weekly-heading" className="mrez-weekly-heading">
          {headingFor(local.mode, t)}
          {shown.fromTutor && !shown.live && <span className="mrez-sim-badge">{t('Simulated, not a real AI reply')}</span>}
        </h2>

        {local.mode === 'last-week' && (
          <p className="mrez-weekly-range">{formatWeekRange(local.facts.window, t, locale)}</p>
        )}

        <p className="mrez-weekly-text">{shown.text}</p>

        {local.mode !== 'none' && <WeeklyChips facts={local.facts} showPrevious={local.mode === 'last-week'} />}

        {local.mode !== 'none' && <PaperEffortRow facts={local.facts} gaps={local.topGaps} />}

        {shown.recommendation && (
          <a className="mrez-rec mrez-weekly-cta" href={withBase(shown.recommendation.href)}>
            <span className="mrez-rec-label">
              {/* Lesson titles arrive English from the Worker and are
                  translated here; anything already translated passes
                  through t() unchanged. */}
              {t(shown.recommendation.label)}
              {shown.recommendation.minutes ? ` · ${t('{n} min', { n: shown.recommendation.minutes })}` : ''}
            </span>
            <span className="mrez-rec-reason">{shown.recommendation.reason}</span>
          </a>
        )}

        {notice && <p className="mrez-note mrez-weekly-note">{notice}</p>}
      </div>
    </section>
  );
}

/** Four quiet stat chips. The previous week's number rides along in muted
    text beside each one, but only in last-week mode and only when the
    previous week actually had something in it. An empty "0 the week
    before" reads like a criticism the facts do not support. */
function WeeklyChips({ facts, showPrevious }: { facts: WeekFacts; showPrevious: boolean }) {
  const { t, tn } = useT();
  const prev = facts.previous;
  const previousHadActivity = prev.activeDays > 0 || prev.minutes > 0 || prev.lessons > 0 || prev.attempts > 0;
  const withPrevious = showPrevious && previousHadActivity;
  const weekBefore = (n: number) => t('{n} the week before', { n });

  return (
    <div className="mrez-weekly-chips">
      <WeeklyChip
        value={t('{active} of {planned}', { active: facts.activeDays, planned: facts.plannedDays })}
        label={tn(facts.activeDays, { one: 'day studied', other: 'days studied' })}
        previous={withPrevious ? weekBefore(prev.activeDays) : undefined}
      />
      <WeeklyChip
        value={t('{n} min', { n: facts.minutes })}
        label={t('study time')}
        previous={withPrevious ? weekBefore(prev.minutes) : undefined}
      />
      <WeeklyChip
        value={String(facts.lessons.length)}
        label={tn(facts.lessons.length, { one: 'lesson', other: 'lessons' })}
        previous={withPrevious ? weekBefore(prev.lessons) : undefined}
      />
      <WeeklyChip
        value={String(facts.attempts.length)}
        label={tn(facts.attempts.length, { one: 'practice attempt', other: 'practice attempts' })}
        previous={withPrevious ? weekBefore(prev.attempts) : undefined}
      />
    </div>
  );
}

function WeeklyChip({ value, label, previous }: { value: string; label: string; previous?: string }) {
  return (
    <div className="mrez-weekly-chip">
      <span className="mrez-weekly-chip-main">
        {value}
        {previous && <span className="mrez-weekly-chip-prev"> · {previous}</span>}
      </span>
      <span className="mrez-weekly-chip-label">{label}</span>
    </div>
  );
}

/* nt() marks these as needing a Russian entry without translating them here
   (the same pattern Intake.tsx's own PAPER_LABEL follows, and its comment
   explains why): PaperEffortRow below looks the word up dynamically
   (`t(PAPER_LABEL[paper])`), which the coverage extractor cannot follow, so
   the literal has to be captured once, here, where it still is one. Raw
   before this fix, the weekly review card showed these four as English
   headings inside an otherwise Russian /report. */
const PAPER_LABEL: Record<Paper, string> = {
  reading: nt('Reading'),
  listening: nt('Listening'),
  writing: nt('Writing'),
  speaking: nt('Speaking'),
};

/** All four papers, every week, even the ones this week never touched
    (WP23's brief, section 9: "all four papers represented"), with the one
    or two biggest gaps against the student's own goal named alongside the
    effort actually spent on them this week. This never proposes a
    different next step: `gaps` only decides what gets a sentence here, the
    one shared session (the card's recommendation link) is unchanged. */
function PaperEffortRow({ facts, gaps }: { facts: WeekFacts; gaps: readonly GapAssessment[] }) {
  const { t, tn } = useT();
  const gapByPaper = new Map(
    gaps
      .filter((gap): gap is GapAssessment & { scope: { kind: 'paper'; paper: Paper } } => gap.scope.kind === 'paper')
      .map((gap) => [gap.scope.paper, gap]),
  );

  return (
    <div className="mrez-weekly-papers">
      <p className="mrez-weekly-papers-heading">{t('This week, by paper')}</p>
      <div className="mrez-weekly-papers-grid">
        {PAPERS.map((paper) => {
          const attempts = facts.paperAttempts[paper];
          const gap = gapByPaper.get(paper);
          return (
            <div key={paper} className="mrez-weekly-paper">
              <span className="mrez-weekly-paper-name">{t(PAPER_LABEL[paper])}</span>
              <span className="mrez-weekly-paper-effort">
                {attempts > 0
                  ? tn(attempts, { one: '{n} attempt this week', other: '{n} attempts this week' })
                  : t('No practice this week')}
              </span>
              {gap && gap.shortfall !== null && (
                <span className="mrez-weekly-paper-gap">
                  {t('{n} band short of your goal', { n: gap.shortfall.toFixed(1) })}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
