/* The tests hub's honest guide to which paper to sit next.
 *
 * Every paper on /tests stays reachable exactly as it always was (see the
 * "Every full exam" catalogue list further down the page); this island adds
 * two small, honest things on top, both read from checkpoints.ts:
 *
 *   1. one recommended checkpoint per skill, with a plain reason (unseen,
 *      partly seen and by how much, or already sat), and a running-low note
 *      once genuinely fresh papers start to run out;
 *   2. a quiet status badge next to every paper already listed in the
 *      static catalogue below, so a student can see at a glance which of
 *      the seventy are still unseen without opening each one.
 *
 * NEVER A COMPETING NEXT STEP
 * When today's plan already has a checkpoint queued (a session step with
 * role 'assess' pointing at a real full paper), this shows exactly that
 * paper rather than computing a second opinion. Reading the shared session
 * through src/lib/learning is the whole point of that module existing.
 * Only when the plan has nothing of the kind queued does this fall back to
 * checkpoints.ts's own recommendation, which is independent-browsing
 * territory ("sit a paper on your own initiative"), not a plan override.
 *
 * A signed-out student, or one with local storage blocked, sees the plain
 * catalogue with no annotation at all: this island renders nothing rather
 * than guessing, the same fallback SessionContinueBar uses. */

import { useEffect, useMemo, useState } from 'react';
import {
  ensureLearningWired,
  getCurrentSession,
  onLearnerRecordChange,
  onPersonalPlanChange,
  readLearnerRecord,
  type SharedSessionView,
} from '../../lib/learning';
import { learningCatalogue, LEARNING_INDEX } from '../../lib/learning/catalog';
import type { LearnerRecordV1 } from '../../lib/learning/contracts/evidence';
import { rankCheckpoints, unseenCheckpointsRemaining, CHECKPOINT_REASON_SENTENCES, type CheckpointCandidate } from '../../lib/learning/checkpoints';
import { withBase } from '../../lib/url';
import { useT } from '../../lib/i18n/react';
import { SKILLS, SKILL_LABEL, badgeText, badgeClass, recommendedCheckpoint, type Skill } from './tests-hub-checkpoints';

ensureLearningWired();

/** Why a fresh paper matters at all, one line, independent of which status
    the recommended paper happens to have (that detail is the reason text
    from checkpoints.ts, shown alongside this). Fixed per skill rather than
    computed, because the point being made does not change sitting to
    sitting. */
const WHY_FRESH_MATTERS =
  'A paper you have not met yet shows where you really stand. One you have already drilled or sat mostly shows what you remember.';

export default function TestsHubCheckpoints() {
  const { t } = useT();
  const [record, setRecord] = useState<LearnerRecordV1 | null>(null);
  const [session, setSession] = useState<SharedSessionView | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const read = () => {
      try {
        setRecord(readLearnerRecord());
        setSession(getCurrentSession());
      } catch {
        setRecord(null);
        setSession(null);
      }
      setReady(true);
    };
    read();
    const offRecord = onLearnerRecordChange(read);
    const offPlan = onPersonalPlanChange(read);
    return () => {
      offRecord();
      offPlan();
    };
  }, []);

  const catalogue = useMemo(() => learningCatalogue(), []);

  const rankings = useMemo(() => {
    if (!record) return null;
    const out = new Map<Skill, readonly CheckpointCandidate[]>();
    for (const skill of SKILLS) out.set(skill, rankCheckpoints(skill, catalogue, LEARNING_INDEX, record));
    return out;
  }, [catalogue, record]);

  // Annotate every paper already listed in the static "Every full exam"
  // catalogue below with a quiet status badge, using the same ranking data
  // rather than recomputing it per row. Runs after each recomputation so an
  // evidence change (sitting a drill from an unseen paper, say) updates the
  // badges without a page reload.
  useEffect(() => {
    if (!rankings) return;
    const byTestId = new Map<string, CheckpointCandidate>();
    for (const list of rankings.values()) for (const c of list) byTestId.set(c.testId, c);

    const nodes = document.querySelectorAll<HTMLElement>('[data-checkpoint-target]');
    nodes.forEach((node) => {
      const testId = node.dataset.checkpointTarget;
      const candidate = testId ? byTestId.get(testId) : undefined;
      if (!candidate) return;
      let badge = node.querySelector<HTMLElement>('[data-checkpoint-badge]');
      if (!badge) {
        badge = document.createElement('span');
        badge.dataset.checkpointBadge = 'true';
        badge.className =
          'checkpoint-badge inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[0.65rem] font-bold';
        node.appendChild(badge);
      }
      badge.className = `checkpoint-badge inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${badgeClass(candidate.status)}`;
      badge.textContent = badgeText(candidate, t);
    });
  }, [rankings, t]);

  if (!ready || !record || !rankings) return null;

  const cards = SKILLS.map((skill) => {
    const list = rankings.get(skill) ?? [];
    const recommended = recommendedCheckpoint(session, skill, list);
    if (!recommended) return null;
    const remaining = unseenCheckpointsRemaining(skill, catalogue, LEARNING_INDEX, record);
    return { skill, candidate: recommended.candidate, fromPlan: recommended.fromPlan, remaining };
  }).filter((c): c is NonNullable<typeof c> => c !== null);

  if (cards.length === 0) return null;

  return (
    <section className="checkpoint-recommendations mb-8 grid gap-4 sm:grid-cols-2" aria-label={t('Recommended checkpoint')}>
      {cards.map(({ skill, candidate, fromPlan, remaining }) => (
        <div key={skill} className={`skill-${skill} rounded-card border border-border bg-surface p-5 shadow-card`}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              {/* SKILL_LABEL is the protected paper name (Reading, Listening)
                  and is never translated, the same rule every other card on
                  this page follows (see the Badge tone="skill" usages
                  above, none of which carry data-i18n either). */}
              {fromPlan
                ? t('{skill} checkpoint · in today’s plan', { skill: SKILL_LABEL[skill] })
                : t('{skill} checkpoint', { skill: SKILL_LABEL[skill] })}
            </p>
            <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${badgeClass(candidate.status)}`}>
              {badgeText(candidate, t)}
            </span>
          </div>
          <p className="mt-2 text-sm text-ink">{t(WHY_FRESH_MATTERS)}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {candidate.reason.vars ? t(CHECKPOINT_REASON_SENTENCES[candidate.reason.key], candidate.reason.vars) : t(CHECKPOINT_REASON_SENTENCES[candidate.reason.key])}
          </p>
          {remaining > 0 && remaining <= 3 && (
            <p className="mt-1 text-xs font-semibold text-warning">
              {t('Only {n} unseen {skill} papers left after this one.', { n: remaining, skill: SKILL_LABEL[skill] })}
            </p>
          )}
          <a
            href={withBase(`/tests/${candidate.testId}`)}
            className="mt-4 inline-block rounded-button bg-[var(--skill)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {t('Start this checkpoint')}
          </a>
        </div>
      ))}
    </section>
  );
}
