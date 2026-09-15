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
import readingFull021 from './reading-full-021';
import readingFull022 from './reading-full-022';
import readingFull023 from './reading-full-023';
import readingFull024 from './reading-full-024';
import readingFull025 from './reading-full-025';
import readingFull026 from './reading-full-026';
import readingFull027 from './reading-full-027';
import readingFull028 from './reading-full-028';
import readingFull029 from './reading-full-029';
import readingFull030 from './reading-full-030';
import readingFull031 from './reading-full-031';
import readingFull032 from './reading-full-032';
import readingFull033 from './reading-full-033';
import readingFull034 from './reading-full-034';
import readingFull035 from './reading-full-035';
import readingFull036 from './reading-full-036';
import readingFull037 from './reading-full-037';
import readingFull038 from './reading-full-038';
import readingFull039 from './reading-full-039';
import readingFull040 from './reading-full-040';
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
import { listeningFull021 } from './listening-full-021';
import { listeningFull022 } from './listening-full-022';
import { listeningFull023 } from './listening-full-023';
import { listeningFull024 } from './listening-full-024';
import { listeningFull025 } from './listening-full-025';
import { listeningFull026 } from './listening-full-026';
import { listeningFull027 } from './listening-full-027';
import { listeningFull028 } from './listening-full-028';
import { listeningFull029 } from './listening-full-029';
import { listeningFull030 } from './listening-full-030';

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
  readingFull021,
  readingFull022,
  readingFull023,
  readingFull024,
  readingFull025,
  readingFull026,
  readingFull027,
  readingFull028,
  readingFull029,
  readingFull030,
  readingFull031,
  readingFull032,
  readingFull033,
  readingFull034,
  readingFull035,
  readingFull036,
  readingFull037,
  readingFull038,
  readingFull039,
  readingFull040,
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
  listeningFull021,
  listeningFull022,
  listeningFull023,
  listeningFull024,
  listeningFull025,
  listeningFull026,
  listeningFull027,
  listeningFull028,
  listeningFull029,
  listeningFull030,
];

export function getTest(id: string): PracticeTest | undefined {
  return ALL_TESTS.find((t) => t.id === id);
}
