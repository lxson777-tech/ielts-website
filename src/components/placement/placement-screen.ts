/* Which screen /placement shows. Pure, so the one rule that matters most
 * ("the test is taken once: a second visit shows the results") is pinned by
 * tests/placement.test.ts rather than left inside a component.
 *
 *   signed out                        'signed-out'
 *   a finished sitting on this device 'results'
 *   the record holds a placement and  'results'   (a second visit, or
 *   no sitting is under way here                   another device)
 *   the material cannot be found      'unavailable'
 *   a sitting under way here          'part'
 *   otherwise                         'intro'
 *
 * An unfinished sitting on this device wins over the record: the record
 * already holding its first part is exactly what an interrupted sitting
 * looks like, and this is the device that can finish it. */

import { currentPlacementPart, type PlacementStateV1 } from '../../lib/placement/state';

export type PlacementScreen = 'loading' | 'signed-out' | 'unavailable' | 'intro' | 'part' | 'results';

export interface PlacementScreenInput {
  /** The page has read the student's placement at least once. */
  opened: boolean;
  signedIn: boolean;
  /** This student's sitting on this device, or null. */
  state: Pick<PlacementStateV1, 'outcomes'> | null;
  /** The learner record already holds a placement event. */
  taken: boolean;
  /** Some of the placement's material is not in this build. */
  materialMissing: boolean;
}

export function placementScreen(input: PlacementScreenInput): PlacementScreen {
  if (!input.opened) return 'loading';
  if (!input.signedIn) return 'signed-out';
  const finishedHere = input.state !== null && currentPlacementPart(input.state) === 'done';
  if (finishedHere || (input.state === null && input.taken)) return 'results';
  if (input.materialMissing) return 'unavailable';
  return input.state ? 'part' : 'intro';
}
