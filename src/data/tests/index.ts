import type { PracticeTest } from '../../lib/tests/schema';
import { readingFull001 } from './reading-full-001';
import { readingFull002 } from './reading-full-002';
import { readingFull003 } from './reading-full-003';
import { readingFull004 } from './reading-full-004';
import { readingFull005 } from './reading-full-005';

/* Portal lists full 60-minute exams only. To add one: create
   src/data/tests/<skill>-full-<nnn>.ts following the PracticeTest schema
   (3 parts / 40 questions for reading) and append it here. */
export const ALL_TESTS: PracticeTest[] = [
  readingFull001,
  readingFull002,
  readingFull003,
  readingFull004,
  readingFull005,
];

export function getTest(id: string): PracticeTest | undefined {
  return ALL_TESTS.find((t) => t.id === id);
}
