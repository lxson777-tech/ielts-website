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
import MrEzAvatar from './MrEzAvatar';
import { askTutor, isTutorConfigured, TutorClientError } from '../../lib/tutor/client';
import { localRecommendation, toTutorRecommendation } from '../../lib/tutor/local';
import { reviewTarget, readWeek, weekFingerprint, weekFallbackText, type WeekFacts, type WeekWindow } from '../../lib/tutor/week';
import type { TutorMood, TutorRecommendation } from '../../lib/tutor/schema';
import { onAuthChange } from '../../lib/auth/session';
import { getProgress, onProgressChange } from '../../lib/progress';
import { loadStudyPlan, onStudyPlanChange } from '../../lib/study-plan';
import '../../styles/mr-ez-weekly.css';

type ReviewMode = 'last-week' | 'this-week' | 'none';

/** The non-AI view, rebuilt whenever progress or the study plan change. */
interface LocalView {
  mode: ReviewMode;
  facts: WeekFacts;
  fingerprint: string;
  fallbackText: string;
  recommendation: TutorRecommendation | null;
}

/** Mr EZ's own wording, tagged with the week it was written about. */
interface TutorView {
  fingerprint: string;
  text: string;
  recommendation: TutorRecommendation | null;
  mood: TutorMood;
  live: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** A week's two date keys written the way a person would say them, e.g.
    "14 to 20 September" or, when the week crosses a month boundary,
    "29 September to 5 October". Built from the date keys directly (no
    Date, no locale) so it can never disagree with the calendar week the
    facts were actually counted over. */
function formatWeekRange(window: WeekWindow): string {
  const [startYear, startMonth, startDay] = window.start.split('-').map(Number);
  const [endYear, endMonth, endDay] = window.end.split('-').map(Number);
  const startName = MONTH_NAMES[startMonth! - 1];
  const endName = MONTH_NAMES[endMonth! - 1];
  if (startYear === endYear && startMonth === endMonth) {
    return `${startDay} to ${endDay} ${endName}`;
  }
  return `${startDay} ${startName} to ${endDay} ${endName}`;
}

function headingFor(mode: ReviewMode): string {
  if (mode === 'last-week') return 'Last week with Mr EZ';
  if (mode === 'this-week') return 'This week so far';
  return 'Mr EZ';
}

function buildLocalView(): LocalView {
  const progress = getProgress();
  const plan = loadStudyPlan();
  const now = new Date();
  const offsetMinutes = -now.getTimezoneOffset();
  const target = reviewTarget(progress, plan, now, offsetMinutes);
  const facts = readWeek(progress, plan, target.window, now, offsetMinutes);
  const fallbackText =
    target.mode === 'none'
      ? 'Nothing recorded in the last two weeks. Here is an easy way back in.'
      : weekFallbackText(facts);
  return {
    mode: target.mode,
    facts,
    fingerprint: weekFingerprint(facts),
    fallbackText,
    recommendation: toTutorRecommendation(localRecommendation()),
  };
}

export default function WeeklyReview() {
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
    const refresh = () => setLocal(buildLocalView());
    refresh();
    const offProgress = onProgressChange(refresh);
    const offPlan = onStudyPlanChange(refresh);
    const offAuth = onAuthChange((user) => setSignedIn(Boolean(user)));
    return () => {
      offProgress();
      offPlan();
      offAuth();
    };
  }, []);

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
          {headingFor(local.mode)}
          {shown.fromTutor && !shown.live && <span className="mrez-sim-badge">Simulated, not a real AI reply</span>}
        </h2>

        {local.mode === 'last-week' && <p className="mrez-weekly-range">{formatWeekRange(local.facts.window)}</p>}

        <p className="mrez-weekly-text">{shown.text}</p>

        {local.mode !== 'none' && <WeeklyChips facts={local.facts} showPrevious={local.mode === 'last-week'} />}

        {shown.recommendation && (
          <a className="mrez-rec mrez-weekly-cta" href={withBase(shown.recommendation.href)}>
            <span className="mrez-rec-label">
              {shown.recommendation.label}
              {shown.recommendation.minutes ? ` · ${shown.recommendation.minutes} min` : ''}
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
  const prev = facts.previous;
  const previousHadActivity = prev.activeDays > 0 || prev.minutes > 0 || prev.lessons > 0 || prev.attempts > 0;
  const withPrevious = showPrevious && previousHadActivity;

  return (
    <div className="mrez-weekly-chips">
      <WeeklyChip
        value={`${facts.activeDays} of ${facts.plannedDays}`}
        label={facts.activeDays === 1 ? 'day studied' : 'days studied'}
        previous={withPrevious ? `${prev.activeDays} the week before` : undefined}
      />
      <WeeklyChip
        value={`${facts.minutes} min`}
        label="study time"
        previous={withPrevious ? `${prev.minutes} the week before` : undefined}
      />
      <WeeklyChip
        value={String(facts.lessons.length)}
        label={facts.lessons.length === 1 ? 'lesson' : 'lessons'}
        previous={withPrevious ? `${prev.lessons} the week before` : undefined}
      />
      <WeeklyChip
        value={String(facts.attempts.length)}
        label={facts.attempts.length === 1 ? 'practice attempt' : 'practice attempts'}
        previous={withPrevious ? `${prev.attempts} the week before` : undefined}
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
