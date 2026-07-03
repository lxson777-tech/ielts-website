import type { PracticeTest } from '../../lib/tests/schema';
import { readingTest001 } from './reading-001';

/* To add a test: create src/data/tests/<skill>-<nnn>.ts following the
   PracticeTest schema and append it here. The tests hub, the player route
   and the reading lesson's test grid all pick it up automatically. */
export const ALL_TESTS: PracticeTest[] = [readingTest001];

export function getTest(id: string): PracticeTest | undefined {
  return ALL_TESTS.find((t) => t.id === id);
}
