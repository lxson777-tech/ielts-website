/* The three versions every learning AI request carries.
 *
 * A reply written against a plan revision or an evidence version that has
 * since moved is refused by the Worker rather than acted on, which is what
 * stops a slow answer changing what a student is doing after they have
 * moved on. So they are read from the CURRENT session at the moment of
 * asking, never remembered from a render.
 *
 * Browser only: it reaches the plan store through src/lib/learning. Keep it
 * out of anything the Worker builds.
 */

import { learningCatalogue } from '../../lib/learning/catalog';
import type { LearningAiVersions } from '../../lib/learning/contracts/ai';
import { getCurrentSession } from '../../lib/learning';

export interface AskContext {
  versions: LearningAiVersions;
  /** The session this is happening inside, when it is one. */
  sessionId?: string;
}

/** Zeroes are a legitimate answer: a student with no plan yet still gets
    help, and the Worker's staleness check simply has nothing to compare
    against. Never throws into a page. */
export function askContext(): AskContext {
  let planRevision = 0;
  let evidenceVersion = 0;
  let sessionId: string | undefined;
  try {
    const session = getCurrentSession();
    planRevision = session.planRevision;
    evidenceVersion = session.evidenceVersion;
    sessionId = session.sessionId;
  } catch {
    /* No plan on this device. Help still works; only the staleness check
       has nothing to check. */
  }
  let indexVersion = '';
  try {
    indexVersion = learningCatalogue().indexVersion;
  } catch {
    /* Same reasoning. */
  }
  return { versions: { planRevision, evidenceVersion, indexVersion }, sessionId };
}
