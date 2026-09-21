/**
 * Intake: the short goal and availability questions a student answers once,
 * and can revisit from the plan settings page.
 *
 * STUB written by the lead so that two packages can be built in parallel
 * against one agreed interface. WP10 owns this file and replaces the body.
 * WP8 mounts it on Today while the plan's goals are unconfirmed.
 *
 * Contract between the two packages:
 * - `variant="first-visit"` is the compact version shown on Today to a student
 *   whose goals are not confirmed yet. `variant="settings"` is the full editor
 *   on the plan settings page.
 * - The component saves through `updateGoalsAndConstraints` from
 *   `src/lib/learning`, which replans. It never writes the old study plan store
 *   directly.
 * - `onDone` is called after a successful save so the host can re-read the
 *   current session. `onDefer` is called when the student chooses to answer
 *   later, which must leave a visibly provisional plan in place.
 */

export interface IntakeProps {
  variant: 'first-visit' | 'settings';
  onDone?: () => void;
  onDefer?: () => void;
}

export default function Intake(_props: IntakeProps) {
  return null;
}
