/* The shared learning contracts, in one import.
 *
 * Types, unions and named threshold constants only: there is no logic in
 * this folder, deliberately, so both the site and the Mr EZ Worker can
 * import it with no risk of dragging in a browser API or a data file. The
 * same discipline src/lib/tutor already follows, and the reason
 * src/lib/speaking/live/instructions.ts can be shared with its Worker.
 *
 * Nothing here may import:
 *   - src/data/tests (3.70 MB of passages and transcripts)
 *   - src/lib/plan/schedule.ts (which imports the above transitively)
 *   - src/lib/tests/drills.ts (same)
 *   - window, document, localStorage, fetch, or anything React
 *
 * A test asserts that. See the work packages in
 * docs/personal-learning/ARCHITECTURE.md.
 */

export * from './catalog';
export * from './evidence';
export * from './policy';
export * from './plan';
export * from './ai';
export * from './sync';
