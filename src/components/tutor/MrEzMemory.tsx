/* What Mr EZ remembers, and how to make him forget it, plus "what your plan
   knows about you" (WP23, 2026-09-22): the calm, read-only summary of the
   structured learner record Mr EZ actually reads from, so a student can
   check it without asking him.

   The panel states the split in plain words before offering the clear
   button, because the two kinds of memory have genuinely different
   lifetimes and a student who clears a chat and loses their score history
   would never trust the control again:

   - CONVERSATION memory: what was said, plus the rolling summary he keeps of
     older turns, plus the saved dashboard welcome (his words about them).
     This is what clearing removes, everywhere, including the copy in the
     cloud.
   - THE LEARNER RECORD AND PLAN: goals, preferences, self-reported scores,
     overrides, and every band, marked essay, speaking attempt and completed
     lesson. A separate record with its own lifetime. Clearing a
     conversation never touches it, and Mr EZ will still read it afterwards,
     because that is the evidence he works from.

   COHERENCE WITH THE STRUCTURED RECORD
   Before this pass, "Your goal" read the OLD study-plan view
   (src/lib/tutor/local.ts's localInsights, itself now a thin view over the
   one evidence policy). This card now reads the real PersonalPlanV1
   directly (ensurePlan()), the same plan Today, the report and every other
   surface read, so it can never show a goal the rest of the site disagrees
   with. Editing stays on the Intake form above it on this same page
   (src/components/plan/Intake.tsx, not owned by this file); this card is a
   summary, never a second editor. */

import { useEffect, useState } from 'react';
import { withBase } from '../../lib/url';
import { useT } from '../../lib/i18n/react';
import { LOCALE_LABEL } from '../../lib/i18n/locale';
import MrEzAvatar from './MrEzAvatar';
import { clearTutorMemory, loadConversation } from '../../lib/tutor/conversation';
import { isTutorConfigured } from '../../lib/tutor/client';
import { onAuthChange } from '../../lib/auth/session';
import { ensurePlan, readLearnerRecord, onPersonalPlanChange } from '../../lib/learning';
import { evaluateEvidence } from '../../lib/learning/policy';
import type { PersonalPlanV1, PlanOverride } from '../../lib/learning/contracts/plan';
import { PAPERS } from '../../lib/learning/contracts/catalog';
import '../../styles/learning-progress.css';

const SKILL_LABEL: Record<string, string> = {
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
  speaking: 'Speaking',
};

const STUDY_DAYS_LABEL: Record<PersonalPlanV1['constraints']['studyDays'], string> = {
  daily: 'Every day',
  weekdays: 'Weekdays only',
  custom: 'Custom days',
};

function overrideLabel(t: (s: string, vars?: Record<string, string | number>) => string, override: PlanOverride): string {
  switch (override.kind) {
    case 'less-time-today':
      return t('Shorter day on {date}: {minutes} minutes', { date: override.date, minutes: override.minutes });
    case 'chose-other-skill':
      return t('Chose to work on {paper} on {date}', { paper: SKILL_LABEL[override.paper], date: override.date });
    case 'chose-objective':
      return t('Chose a specific objective on {date}', { date: override.date });
    case 'skip-activity':
      return override.until
        ? t('Skipping one activity until {until}', { until: override.until })
        : t('Skipping one activity until you choose it again');
    case 'accepted-longer-commitment':
      return t('Agreed to a longer session on {date} ({minutes} minutes)', { date: override.date, minutes: override.minutes });
    case 'deferred-diagnostic':
      return override.until
        ? t('Put off the {paper} diagnostic until {until}', { paper: SKILL_LABEL[override.paper], until: override.until })
        : t('Put off the {paper} diagnostic until you start it');
    case 'rest-day':
      return t('Rest day on {date}', { date: override.date });
    default:
      return t('A plan override');
  }
}

/** The plan's own summary of itself, rebuilt whenever it changes. Reads
    exactly what Today and the report read; nothing here is derived a
    second way. */
function usePlanKnowledge() {
  const [plan, setPlan] = useState<PersonalPlanV1 | null>(null);
  const [unknownPapers, setUnknownPapers] = useState<readonly string[]>([]);

  useEffect(() => {
    const read = () => {
      const current = ensurePlan();
      setPlan(current);
      const policy = evaluateEvidence({ record: readLearnerRecord(), goals: current.goals, now: new Date().toISOString() });
      setUnknownPapers(policy.diagnosticsOutstanding);
    };
    read();
    return onPersonalPlanChange(read);
  }, []);

  return { plan, unknownPapers };
}

export default function MrEzMemory() {
  const { t, tn } = useT();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [turns, setTurns] = useState(0);
  const { plan, unknownPapers } = usePlanKnowledge();

  useEffect(() => {
    setTurns(loadConversation().turns.length);
    return onAuthChange((user) => setSignedIn(Boolean(user)));
  }, []);

  async function clear() {
    setBusy(true);
    const outcome = await clearTutorMemory();
    setResult(outcome.message);
    setTurns(0);
    setConfirming(false);
    setBusy(false);
  }

  const goals = plan?.goals;
  const goalLine = goals?.overallTarget
    ? goals.overallTarget.status === 'confirmed'
      ? t('Band {band}', { band: goals.overallTarget.band })
      : t('Band {band} (a placeholder, not yet confirmed)', { band: goals.overallTarget.band })
    : t('Not set yet');
  const examLine = goals?.examDate
    ? goals.examDate.status === 'confirmed'
      ? t('Exam on {date}', { date: goals.examDate.date })
      : t('Exam date {date} (a placeholder, not yet confirmed)', { date: goals.examDate.date })
    : t('No exam date set');

  const conversationLine = signedIn
    ? turns > 0
      ? tn(turns, {
          one: '{n} message in this session, plus anything saved to your account.',
          other: '{n} messages in this session, plus anything saved to your account.',
        })
      : t('Nothing in this session, plus anything saved to your account.')
    : turns > 0
      ? tn(turns, { one: '{n} message in this session.', other: '{n} messages in this session.' })
      : t('Nothing in this session.');

  const activeOverrides = plan ? [...plan.overrides].slice(-5).reverse() : [];

  return (
    <>
      <section className="mrez-memory" aria-labelledby="mrez-memory-heading">
        <div className="mrez-memory-head">
          <MrEzAvatar mood="idle" size={40} />
          <div>
            <h2 id="mrez-memory-heading">{t('What Mr EZ remembers')}</h2>
            <p>{t('He only ever reads your own record, and only the part he needs for what you just asked.')}</p>
          </div>
        </div>

        <dl className="mrez-memory-list">
          <div>
            <dt>{t('Your goal')}</dt>
            <dd>
              {goalLine}
              {' · '}
              {examLine}
            </dd>
          </div>
          <div>
            <dt>{t('Your results')}</dt>
            <dd>
              {t('Completed lessons, test scores and marked work. He reads these as evidence and never changes them.')}
              {' · '}
              <a href={withBase('/report')}>{t('See them')}</a>
            </dd>
          </div>
          <div>
            <dt>{t('Your conversation')}</dt>
            <dd>{conversationLine}</dd>
          </div>
        </dl>

        {!isTutorConfigured() && (
          <p className="mrez-memory-note">{t('Mr EZ is not switched on for this build, so there is nothing stored in the cloud to clear.')}</p>
        )}

        {result ? (
          <p className="mrez-memory-done" role="status">{result}</p>
        ) : confirming ? (
          <div className="mrez-memory-confirm">
            <p>
              {t('This deletes every message between you and Mr EZ, the summary he keeps of older turns, and his saved dashboard welcome.')}{' '}
              <strong>{t('Your lessons, test scores and marked essays are not affected.')}</strong>{' '}
              {t('He will still read them afterwards. It cannot be undone.')}
            </p>
            <div className="mrez-memory-actions">
              <button type="button" className="mrez-danger" onClick={() => void clear()} disabled={busy}>
                {busy ? t('Clearing…') : t('Yes, clear the conversation')}
              </button>
              <button type="button" onClick={() => setConfirming(false)} disabled={busy}>{t('Cancel')}</button>
            </div>
          </div>
        ) : (
          <button type="button" className="mrez-memory-clear" onClick={() => setConfirming(true)}>
            {t("Clear Mr EZ's conversation history")}
          </button>
        )}
      </section>

      {/* What your plan knows about you: the structured learner record
          and plan, read-only, in plain words (WP23's student-control
          deliverable). Edit any of it in the form above; this card only
          shows what is actually stored. */}
      {plan && (
        <section className="mrez-memory mt-6" aria-labelledby="mrez-plan-knowledge-heading">
          <div className="mrez-memory-head">
            <MrEzAvatar mood="idle" size={40} />
            <div>
              <h2 id="mrez-plan-knowledge-heading">{t('What your plan knows about you')}</h2>
              <p>{t('Exactly what is stored, in plain words. Change any of it in the form above.')}</p>
            </div>
          </div>

          <dl className="mrez-memory-list">
            <div>
              <dt>{t('Per-paper minimums')}</dt>
              <dd>
                {PAPERS.some((paper) => plan.goals.perPaperMinimums[paper])
                  ? PAPERS.filter((paper) => plan.goals.perPaperMinimums[paper])
                      .map((paper) => `${SKILL_LABEL[paper]} ${plan.goals.perPaperMinimums[paper]!.band}${plan.goals.perPaperMinimums[paper]!.status === 'provisional' ? ` (${t('provisional')})` : ''}`)
                      .join(', ')
                  : t('None set; your overall target applies to every paper.')}
              </dd>
            </div>
            <div>
              <dt>{t('Regular daily time')}</dt>
              <dd>
                {tn(plan.constraints.regularDailyMinutes, { one: '{n} minute a day', other: '{n} minutes a day' })}
                {plan.constraints.regularDailyMinutesStatus === 'provisional' && ` (${t('a placeholder, not yet confirmed')})`}
              </dd>
            </div>
            <div>
              <dt>{t('Study days')}</dt>
              <dd>{t(STUDY_DAYS_LABEL[plan.constraints.studyDays])}</dd>
            </div>
            <div>
              <dt>{t('Explanation language')}</dt>
              <dd>{LOCALE_LABEL[plan.constraints.explanationLocale]}</dd>
            </div>
            {plan.goals.selfReported.length > 0 && (
              <div>
                <dt>{t('Self-reported scores')}</dt>
                <dd>
                  {plan.goals.selfReported
                    .map((score) => `${score.paper ? `${SKILL_LABEL[score.paper]} ` : ''}${score.band} (${score.takenOn})`)
                    .join(', ')}
                </dd>
              </div>
            )}
            <div>
              <dt>{t('Papers still unknown')}</dt>
              <dd>
                {unknownPapers.length > 0
                  ? unknownPapers.map((paper) => SKILL_LABEL[paper]).join(', ')
                  : t('None. Every paper has at least some evidence.')}
              </dd>
            </div>
            <div>
              <dt>{t('Overrides in force')}</dt>
              <dd>
                {activeOverrides.length > 0 ? (
                  <>
                    <ul className="report-detail-list">
                      {activeOverrides.map((override, i) => (
                        <li key={i}>{overrideLabel(t, override)}</li>
                      ))}
                    </ul>
                    <span className="mrez-memory-override-note">
                      {t('Dated ones clear on their own once the date passes. To change one before then, make a different choice from Today.')}
                    </span>
                  </>
                ) : (
                  t('None right now.')
                )}
              </dd>
            </div>
          </dl>
        </section>
      )}
    </>
  );
}
