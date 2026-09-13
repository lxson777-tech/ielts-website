import type { PracticeTest } from '../../lib/tests/schema';
import readingFull001 from './reading-full-001';
import readingFull002 from './reading-full-002';
import readingFull003 from './reading-full-003';
import readingFull004 from './reading-full-004';
import readingFull005 from './reading-full-005';
import readingFull006 from './reading-full-006';
import readingFull007 from './reading-full-007';
import readingFull008 from './reading-full-008';
import readingFull009 from './reading-full-009';
import readingFull010 from './reading-full-010';
import readingFull011 from './reading-full-011';
import readingFull012 from './reading-full-012';
import readingFull013 from './reading-full-013';
import readingFull014 from './reading-full-014';
import readingFull015 from './reading-full-015';
import readingFull016 from './reading-full-016';
import readingFull017 from './reading-full-017';
import readingFull018 from './reading-full-018';
import readingFull019 from './reading-full-019';
import readingFull020 from './reading-full-020';
import { listeningFull001 } from './listening-full-001';
import { listeningFull002 } from './listening-full-002';
import { listeningFull003 } from './listening-full-003';
import { listeningFull004 } from './listening-full-004';
import { listeningFull005 } from './listening-full-005';
import { listeningFull006 } from './listening-full-006';
import { listeningFull007 } from './listening-full-007';
import { listeningFull008 } from './listening-full-008';
import { listeningFull009 } from './listening-full-009';
import { listeningFull010 } from './listening-full-010';
import { listeningFull011 } from './listening-full-011';
import { listeningFull012 } from './listening-full-012';
import { listeningFull013 } from './listening-full-013';
import { listeningFull014 } from './listening-full-014';
import { listeningFull015 } from './listening-full-015';
import { listeningFull016 } from './listening-full-016';
import { listeningFull017 } from './listening-full-017';
import { listeningFull018 } from './listening-full-018';
import { listeningFull019 } from './listening-full-019';
import { listeningFull020 } from './listening-full-020';

/* Portal lists full 60-minute exams only. To add one: create
   src/data/tests/<skill>-full-<nnn>.ts following the PracticeTest schema
   (3 parts / 40 questions for reading) and append it here. */
export const ALL_TESTS: PracticeTest[] = [
  readingFull001,
  readingFull002,
  readingFull003,
  readingFull004,
  readingFull005,
  readingFull006,
  readingFull007,
  readingFull008,
  readingFull009,
  readingFull010,
  readingFull011,
  readingFull012,
  readingFull013,
  readingFull014,
  readingFull015,
  readingFull016,
  readingFull017,
  readingFull018,
  readingFull019,
  readingFull020,
  listeningFull001,
  listeningFull002,
  listeningFull003,
  listeningFull004,
  listeningFull005,
  listeningFull006,
  listeningFull007,
  listeningFull008,
  listeningFull009,
  listeningFull010,
  listeningFull011,
  listeningFull012,
  listeningFull013,
  listeningFull014,
  listeningFull015,
  listeningFull016,
  listeningFull017,
  listeningFull018,
  listeningFull019,
  listeningFull020,
];

export function getTest(id: string): PracticeTest | undefined {
  return ALL_TESTS.find((t) => t.id === id);
}
