/* The placement test's material: the one file that names it.
 *
 * WHAT THE PLACEMENT TEST IS
 * One sitting of about forty minutes, taken ONCE per account, so the
 * personal learning plan starts from real evidence about all four papers:
 * one Listening part, one Reading passage, one Writing Task 1 and a short
 * Speaking Part 1 interview (src/components/placement/Placement.tsx, route
 * /placement).
 *
 * WHY THE MATERIAL IS RESERVED
 * A placement result is only worth anything if the student has not met the
 * material before, and every student meets the SAME material. So everything
 * named below, and the whole paper each part comes from, is tagged
 * `placement-only` by the catalogue (src/lib/learning/catalog.ts,
 * PLACEMENT_ONLY_TAG): the plan never spends it on practice, on an
 * independent check, on a staged short sample or on a checkpoint paper. It
 * stays in the library, so a student who goes looking for it can still open
 * it on their own, exactly as the check-reserved papers do.
 *
 * WHY IDS ONLY
 * This file is deliberately tiny and imports nothing. The catalogue reads it
 * (and the catalogue is bundled into the Mr EZ Worker), and the trial build
 * swaps the big data modules for empty stand-ins, so the page resolves these
 * ids against the real data itself and says "not available" calmly when one
 * does not resolve (src/pages/placement.astro).
 *
 * CHANGING THE MATERIAL
 * Never edit an id in place. The placement is taken once per account and
 * every event it wrote carries PLACEMENT_SOURCE_KEY; a new set of material
 * is a new version (`placement:v2`) with its own key, so an account that sat
 * v1 is still recognised as having sat a placement.
 */

/** The version of the placement, written into every event it records as a
    `sourceMaterial` key, so "has this account taken the placement test" is
    answered from the learner record itself, on any device, and never from
    this browser's own storage alone. */
export const PLACEMENT_SOURCE_KEY = 'placement:v1';

export interface PlacementMaterial {
  /** Stable version key; see PLACEMENT_SOURCE_KEY. */
  version: string;
  listening: {
    /** A single-part drill id, as src/lib/tests/drills.ts builds it. */
    drillId: string;
    /** The full paper the part is lifted from. Reserved whole. */
    sourceTestId: string;
    /** Minutes on the clock: the recording plus time to check. */
    minutes: number;
  };
  reading: {
    drillId: string;
    sourceTestId: string;
    minutes: number;
  };
  writing: {
    /** A Writing Task 1 prompt id from src/data/writing-prompts*.ts. */
    promptId: string;
    task: 'task1';
    minutes: number;
  };
  speaking: {
    /** A Part 1 topic id from src/data/speaking-prompts.ts. */
    topicId: string;
    part: 1;
    /** Roughly: the live examiner's Part 1 drill runs about four and a half
        minutes of questions and then closes. */
    minutes: number;
  };
}

export const PLACEMENT: PlacementMaterial = {
  version: PLACEMENT_SOURCE_KEY,
  listening: {
    /* IELTS Listening Test 27, Part 2 (questions 11 to 20): a radio
       interview about a trip to Mungo National Park.
       - Three question types on one part: sentence completion (3),
         multiple choice (2) and multiple answer (5). Measured from
         src/data/generated/learning-index.json, not assumed.
       - The recording for this part runs about five minutes (394.5s to
         698.4s of test-027.mp3), so the eight minute clock leaves time to
         read the questions first and check afterwards. The Part 3
         candidates with the same mix of types run seven to eight minutes of
         audio, which would leave no time at all.
       - Its paper is NOT one of the three Listening papers reserved for
         independent checks (008, 009, 019), is not the trial's Listening
         Test 1, and no lesson check or focused exercise quotes any of its
         questions, so reserving it takes nothing away from the course. */
    drillId: 'listening-full-027-drill-p2',
    sourceTestId: 'listening-full-027',
    minutes: 8,
  },
  reading: {
    /* Academic Reading Test 10, Passage 2 (13 questions).
       - Three question types: paragraph matching (5), sentence completion
         (4) and True / False / Not Given (4), the three families a Reading
         paper leans on most.
       - A middle passage: the right difficulty for a first look, where a
         Passage 3 would mostly measure stamina.
       - Its paper is NOT one of the six Reading papers reserved for
         independent checks (003, 015, 028, 029, 034, 037), is not the
         trial's Academic Reading Test 1, and no lesson check or focused
         exercise quotes any of its questions.
       - Fourteen minutes rather than the drill's usual twenty: the real
         exam gives about twenty minutes a passage, and a placement wants a
         realistic pace inside forty minutes in total, not a relaxed one. */
    drillId: 'reading-full-010-drill-p2',
    sourceTestId: 'reading-full-010',
    minutes: 14,
  },
  writing: {
    /* "The chart below shows the number of households in the US by their
       annual income in 2007, 2011 and 2015." A bar chart, the most common
       Task 1 form, with three years to compare, which is exactly what Task
       Achievement rewards: an overview and selected comparisons.
       - Not among the 18 prompts reserved for independent checks, and no
         focused exercise is built on it.
       - Thirteen minutes for at least 150 words: shorter than the exam's
         twenty, because the whole sitting has to fit in forty minutes. The
         grader marks the report against the official descriptors either
         way; the student is told the time is short. */
    promptId: 'pte-wt-118-task1',
    task: 'task1',
    minutes: 13,
  },
  speaking: {
    /* Part 1 topic "Friends": three everyday questions (how you spend time
       with friends, what you value in a friend, making friends as an adult)
       that any student at any level can answer at length, which is what
       Part 1 needs to show fluency rather than topic knowledge. Reserved
       too, although the brief named only the three items above: a topic
       the student already practised would make their answers a rehearsal
       rather than a first look, and it costs the course one of forty Part 1
       topics. */
    topicId: 'p1-2026-14',
    part: 1,
    minutes: 5,
  },
};

/** The whole sitting, in minutes on the four clocks. Must not exceed forty;
    tests/placement.test.ts pins it. */
export const PLACEMENT_TOTAL_MINUTES =
  PLACEMENT.listening.minutes + PLACEMENT.reading.minutes + PLACEMENT.writing.minutes + PLACEMENT.speaking.minutes;

/** The papers the placement draws on. Reserved WHOLE: sitting any other part
    of one of them first would spend material the placement needs unseen. */
export const PLACEMENT_PAPER_IDS: readonly string[] = [
  PLACEMENT.listening.sourceTestId,
  PLACEMENT.reading.sourceTestId,
];

/** The Writing prompt and the Speaking topic the placement uses. */
export const PLACEMENT_PROMPT_IDS: readonly string[] = [PLACEMENT.writing.promptId, PLACEMENT.speaking.topicId];
