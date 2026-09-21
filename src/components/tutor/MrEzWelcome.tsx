/* The dashboard welcome: one greeting, one next step, one reason.

   Renders in three passes, and the order matters.

   1. The deterministic recommendation appears immediately, from this
      device's own stored progress. No network, no AI, no spinner where the
      content should be. It is a real activity with a real link and a real
      reason from the moment the page paints.
   2. If Mr EZ is configured and the student is signed in, his wording
      replaces the plain reason when it arrives. The activity does NOT change
      — it was decided in code and the server was told which one to explain.
   3. If he cannot be reached, nothing visibly fails. The plain version was
      already correct.

   THE TWO HALVES ARE KEPT IN SEPARATE STATE, which is not an arbitrary
   choice. The local half is rebuilt whenever the progress or plan stores
   change, and signing in triggers a cloud merge that writes to both. When
   both halves lived in one object, that rebuild wiped the tutor's answer,
   which made the component ask for another one, which was a loop that spent
   a paid turn every time it went round. Now the tutor's answer is tagged
   with the fingerprint of the record it was written about, and a new one is
   only ever requested when that fingerprint actually changes — the same rule
   the server uses for its own cache, so the two agree.

   The one case that is not a recommendation at all is a student who has
   never told us their target band. Guessing a band for them would be the
   single most misleading thing this screen could do, so instead it asks. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { withBase } from '../../lib/url';
import { useT } from '../../lib/i18n/react';
import MrEzAvatar from './MrEzAvatar';
import { askTutor, isTutorConfigured, TutorClientError } from '../../lib/tutor/client';
import { localInsights, localRecommendation, localWelcomeText, toTutorRecommendation } from '../../lib/tutor/local';
import { insightsFingerprint } from '../../lib/tutor/insights';
import type { TutorMood, TutorRecommendation } from '../../lib/tutor/schema';
import { onAuthChange } from '../../lib/auth/session';
import { onProgressChange } from '../../lib/progress';
import { loadOrCreateStudyPlan } from '../../lib/plan/schedule';
import { TARGET_BANDS, onStudyPlanChange, saveStudyPlan } from '../../lib/study-plan';

/** The non-AI view, rebuilt whenever the student's stored record changes. */
interface LocalView {
  fingerprint: string;
  text: string;
  recommendation: TutorRecommendation | null;
  needsGoal: boolean;
}

/** Mr EZ's own wording, tagged with the record it was written about. */
interface TutorView {
  fingerprint: string;
  text: string;
  recommendation: TutorRecommendation | null;
  mood: TutorMood;
  live: boolean;
}

function buildLocalView(): LocalView {
  const insights = localInsights();
  const needsGoal = !insights.goals.targetBand || insights.goals.guessed;
  return {
    fingerprint: insightsFingerprint(insights),
    text: localWelcomeText(insights),
    recommendation: needsGoal ? null : toTutorRecommendation(localRecommendation()),
    needsGoal,
  };
}

export default function MrEzWelcome() {
  const { t } = useT();
  const [local, setLocal] = useState<LocalView | null>(null);
  const [tutor, setTutor] = useState<TutorView | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [asking, setAsking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  /** Fingerprints already asked about, successfully or not. Stops a failed
      request being retried forever by the next store write. Cleared whenever
      the signed-in state changes: an attempt that failed while signed out,
      or on a session that had expired, must be allowed again once there is a
      valid one, otherwise signing in visibly does nothing. */
  const askedRef = useRef(new Set<string>());

  useEffect(() => {
    askedRef.current.clear();
    setNotice(null);
  }, [signedIn]);

  // Everything is read after mount: the stores are localStorage-backed, so a
  // server render and the first client render must agree on "nothing yet".
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

  // Mr EZ's own wording, once there is someone to ask about and something
  // new to ask. The server caches this against the same fingerprint, so the
  // common case does not even reach the model.
  useEffect(() => {
    if (!local || local.needsGoal || !isTutorConfigured() || !signedIn) return;
    if (tutor?.fingerprint === local.fingerprint) return;
    if (askedRef.current.has(local.fingerprint)) return;

    const fingerprint = local.fingerprint;
    askedRef.current.add(fingerprint);
    let cancelled = false;
    setAsking(true);

    void askTutor({ task: 'welcome' })
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
        // Silent by design for the ordinary failures: the plain version on
        // screen is already correct and useful. Only a spent daily limit is
        // worth a word, because it explains why he has gone quiet.
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
     still describes the record in front of us; the moment the student
     finishes something, the plain version takes over again until his next
     answer lands. */
  const shown = useMemo(() => {
    if (!local) return null;
    const fresh = tutor && tutor.fingerprint === local.fingerprint ? tutor : null;
    return {
      text: fresh?.text ?? local.text,
      recommendation: fresh?.recommendation ?? local.recommendation,
      mood: (fresh?.mood ?? 'idle') as TutorMood,
      fromTutor: Boolean(fresh),
      live: fresh?.live ?? false,
      needsGoal: local.needsGoal,
    };
  }, [local, tutor]);

  if (!shown) return null;

  return (
    <section className="mrez-welcome" aria-labelledby="mrez-welcome-heading">
      <MrEzAvatar mood={asking ? 'thinking' : shown.mood} size={54} />
      <div className="mrez-welcome-body">
        <h2 id="mrez-welcome-heading" className="mrez-welcome-heading">
          Mr EZ
          {shown.fromTutor && !shown.live && <span className="mrez-sim-badge">{t('Simulated, not a real AI reply')}</span>}
        </h2>
        <p className="mrez-welcome-text">{shown.text}</p>

        {shown.needsGoal ? (
          <GoalForm />
        ) : (
          shown.recommendation && (
            <a className="mrez-welcome-cta" href={withBase(shown.recommendation.href)}>
              <span className="mrez-welcome-cta-label">
                {shown.recommendation.label}
                {shown.recommendation.minutes ? ` · ${t('{n} min', { n: shown.recommendation.minutes })}` : ''}
              </span>
              <span className="mrez-welcome-cta-reason">{shown.recommendation.reason}</span>
            </a>
          )
        )}

        {notice && <p className="mrez-welcome-note">{notice}</p>}
      </div>
    </section>
  );
}

/** The one thing worth asking a brand-new student, asked once, inline. No
    modal, no multi-step onboarding: a band and an optional date. */
function GoalForm() {
  const { t } = useT();
  const [band, setBand] = useState<string>('7.0');
  const [date, setDate] = useState('');
  const [saved, setSaved] = useState(false);

  function save(e: React.FormEvent) {
    e.preventDefault();
    const plan = loadOrCreateStudyPlan();
    saveStudyPlan({
      ...plan,
      targetBand: band,
      testDate: date,
      createdAt: new Date().toISOString(),
      // No longer a guess: they have told us. This is what stops every
      // downstream surface from treating the fabricated default as a goal.
      defaulted: false,
    });
    setSaved(true);
  }

  if (saved) return <p className="mrez-welcome-note">{t('Saved. Everything I suggest from here is aimed at that.')}</p>;

  return (
    <form className="mrez-goal" onSubmit={save}>
      <div className="mrez-goal-field">
        <label htmlFor="mrez-goal-band">{t('Band you need')}</label>
        <select id="mrez-goal-band" value={band} onChange={(e) => setBand(e.target.value)}>
          {TARGET_BANDS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>
      <div className="mrez-goal-field">
        <label htmlFor="mrez-goal-date">{t('Exam date (optional)')}</label>
        <input id="mrez-goal-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <button type="submit" className="mrez-goal-save">{t('Save')}</button>
    </form>
  );
}
