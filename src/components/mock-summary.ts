/* Whether the mock's results screen may show one combined "overall band",
 * and nothing else: this file is one small, testable rule, kept out of
 * MockExam.tsx so it can be checked without mounting the screen.
 *
 * THE RULE
 * The site's real evidence policy (PolicyOutputV1.overall, see
 * contracts/policy.ts) is null unless all four papers carry at least
 * tentative evidence from a complete paper or a full graded task. A mock
 * sitting's own end-of-day figure has to hold to the same idea: it is not an
 * honest "overall" unless every paper it claims to average was actually
 * completed and scored, not merely attempted.
 *
 * Writing is never graded inside the mock (see the header comment on
 * MockExam.tsx and ResultsScreen below: grading is a separate, explicit,
 * paid, signed-in action the student takes afterwards, never automatic).
 * That means `writingGraded` is always false for a real sitting today, so
 * `mockOverallAllowed` always returns false today, which is exactly the
 * point. It stays as a real, checked rule rather than a comment, so a future
 * change that starts auto-grading Writing inside the mock has to decide this
 * question again on purpose, not inherit an old "just average what we have"
 * shortcut.
 */

export interface MockPartsScored {
  listeningScored: boolean;
  readingScored: boolean;
  /** Always false for a sitting recorded today: see the file header. */
  writingGraded: boolean;
  /** False both when Speaking was skipped and when it was never reached. */
  speakingScored: boolean;
}

/** True only when every one of the four papers was really completed and
    scored. A mock missing even one (today, always Writing) shows each
    paper's own result standing on its own instead. */
export function mockOverallAllowed(parts: MockPartsScored): boolean {
  return parts.listeningScored && parts.readingScored && parts.writingGraded && parts.speakingScored;
}
