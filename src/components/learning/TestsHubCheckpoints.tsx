/* The tests hub's honest guide to which paper to sit next.
 *
 * Every paper on /tests stays reachable exactly as it always was (see the
 * "Every full exam" catalogue list further down the page); this island adds
 * two small, honest things on top, both read from checkpoints.ts:
 *
 *   1. one quiet line, "Want your real level? Try a paper you haven't seen:
 *      Reading · Listening", each word starting the recommended checkpoint
 *      for that skill; a skill whose recommended paper is not unseen is left
 *      out, and with neither the line is not shown (8 October 2026: this
 *      replaced two cards that repeated the same sentence twice);
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
import { rankCheckpoints, type CheckpointCandidate } from '../../lib/learning/checkpoints';
import { withBase } from '../../lib/url';
import { useT } from '../../lib/i18n/react';
import { SKILLS, SKILL_LABEL, badgeText, badgeClass, unseenCheckpointLinks, type Skill } from './tests-hub-checkpoints';

ensureLearningWired();

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

  const links = unseenCheckpointLinks(session, rankings);
  if (links.length === 0) return null;

  return (
    <p className="tests-checkpoint-line" data-tests-checkpoints>
      <span>{t("Want your real level? Try a paper you haven't seen:")}</span>{' '}
      {links.map(({ skill, testId }, i) => (
        <span key={skill}>
          {i > 0 && <span aria-hidden="true" className="tests-checkpoint-sep"> · </span>}
          {/* SKILL_LABEL is the protected paper name (Reading, Listening),
              never translated, the same as the tiles above it. */}
          <a
            href={withBase(`/tests/${testId}`)}
            className={`skill-${skill}`}
            data-checkpoint-link={skill}
            aria-label={t('Start an unseen {skill} paper', { skill: SKILL_LABEL[skill] })}
          >
            {SKILL_LABEL[skill]}
          </a>
        </span>
      ))}
    </p>
  );
}
