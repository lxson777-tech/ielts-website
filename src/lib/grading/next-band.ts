/* Shared "next band" advice types. Both AI graders (workers/grade-essay and
   workers/grade-speaking) can return this shape per criterion, and both
   src/lib/writing/schema.ts and src/lib/speaking/schema.ts import it here
   instead of each declaring their own copy, so the two never drift apart.
   Rendered identically for Writing and Speaking by src/components/BandReport.tsx. */

export interface NextBandAction {
  /** one checkable instruction */
  do: string;
  /** a verbatim quote from the student's own work this action responds to; empty string when there is no quote */
  from: string;
  /** an improved version of `from`; empty string when there is no quote */
  to: string;
}

export interface NextBandAdvice {
  /** the next band up; 9 stays 9 */
  target: number;
  /** 1 to 2 sentences on what the next band's descriptor requires that this work does not yet show */
  gap: string;
  /** 2 to 3 checkable instructions */
  actions: NextBandAction[];
}
