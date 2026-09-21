/* Structure methods ported from the speaking lessons' "Talk Structure" and
   "Extending Answers" sections (src/content/lesson-bodies/speaking-part{1,2,3}.html),
   surfaced live as an interactive coach during practice instead of
   staying buried in the lesson pages. Each guide feeds the four tabs of
   SpeakingCoachPanel: notes + stages feed Plan, language feeds Phrases,
   mistakes feeds Avoid (Vocab comes from the prompt bank, per topic).

   Translation rule for this file: advice is marked with nt() and translated
   by SpeakingCoachPanel through the lazily loaded "structures" dictionary
   part. Two things stay English on purpose. The `phrases` arrays are what
   the student says out loud, so translating them would empty the Phrases
   tab of its point. The stage NAMES spell the method out (A.R.E. is Answer,
   Reason, Extend), so a translated name would break the mnemonic the whole
   guide is built on; the Russian description sits directly underneath. */

import { nt } from '../lib/i18n/translate';

export type StructureMethod = 'ARE' | 'PEEL' | 'OREO';

export interface StructureStage {
  /** English: the letter of the method's acronym. Not translated. */
  name: string;
  /** Translated. */
  timing?: string;
  /** Translated. */
  description: string;
  /** NEVER translated: the English the student is meant to say. */
  phrases: string[];
}

export interface LanguageGroup {
  /** The communicative job, e.g. "Buying a second to think". Translated. */
  job: string;
  /** NEVER translated. */
  phrases: string[];
}

export interface StructureGuide {
  method: StructureMethod;
  title: string;
  /** Which part of the test this method belongs to (shown in the panel
      header). Part numbers stay English, as everywhere else. */
  part: string;
  /** What a good answer in this part looks like: the Plan tab's intro box. */
  notes: string[];
  stages: StructureStage[];
  /** Functional phrase groups for the Phrases tab. */
  language: LanguageGroup[];
  /** Common mistakes for the Avoid tab. */
  mistakes: string[];
}

export const SPEAKING_STRUCTURE_GUIDES: Record<StructureMethod, StructureGuide> = {
  ARE: {
    method: 'ARE',
    title: nt('A.R.E. method'),
    part: 'Part 1',
    notes: [
      nt('Answer every question in 2 to 4 sentences: one direct answer, then a reason or example. Never just "yes" or "no".'),
      nt('Match the tense of the question: "Did you…?" needs a past answer, "Would you…?" needs would.'),
      nt("It's a friendly conversation about you, so relaxed, natural language beats formal essay words here."),
    ],
    stages: [
      {
        name: 'Answer',
        description: nt("Respond directly in one sentence. Yes, no, sometimes, rarely. Don't dodge or ramble before getting to the point."),
        phrases: ['Honestly, yes…', 'Not really, to be fair…', 'It depends, but mostly…'],
      },
      {
        name: 'Reason',
        description: nt('Give the reason behind your answer with a conjunction more advanced than a plain "because".'),
        phrases: ['given that…', 'seeing as…', 'since…'],
      },
      {
        name: 'Extend',
        description: nt('Add a specific example, memory, or contrasting detail. Connects two ideas in one breath instead of two flat sentences.'),
        phrases: ['even though…', 'whereas…', 'not only… but also…'],
      },
    ],
    language: [
      {
        job: nt('Buying a second to think'),
        phrases: ['Well, let me see…', "That's a good question…", 'To be honest…', "Hmm, I'd say…"],
      },
      {
        job: nt('Giving a reason'),
        phrases: ['mainly because…', 'given that…', 'seeing as…', 'the thing is…'],
      },
      {
        job: nt('Adding an example'),
        phrases: ['For instance…', 'Like last weekend, when…', 'Take my brother, for example…'],
      },
      {
        job: nt('Contrasting'),
        phrases: ['even though…', 'whereas…', 'having said that…', 'mind you…'],
      },
    ],
    mistakes: [
      nt('One-word answers'),
      nt('Reciting a memorised speech'),
      nt('Repeating the exact words of the question'),
      nt('Long silences instead of a thinking phrase'),
      nt('Formal essay language ("Furthermore…")'),
    ],
  },
  PEEL: {
    method: 'PEEL',
    title: nt('PEEL method'),
    part: 'Part 2',
    notes: [
      nt('In the prep minute, write one or two words per bullet. Your notes are a map, not a script.'),
      nt('Keep talking until the examiner stops you. Stopping well short leaves the examiner little to assess and pulls Fluency and Coherence down; small details and mini-stories fill the time naturally.'),
      nt("It's fine to invent or exaggerate. The examiner grades your English, not your honesty."),
    ],
    stages: [
      {
        name: 'Point',
        timing: nt('15-20s'),
        description: nt('Introduce your topic clearly. Briefly cover the who/what/where.'),
        phrases: ["I'd like to talk about…", "The [topic] I'm going to describe is…"],
      },
      {
        name: 'Explain',
        timing: nt('60-70s'),
        description: nt('Work through each bullet point on the cue card in turn, with specific details and examples.'),
        phrases: ['In terms of [bullet]…', 'As far as [bullet] is concerned…', 'When it comes to [bullet]…'],
      },
      {
        name: 'Elaborate',
        timing: nt('20-25s'),
        description: nt('Expand beyond the bullet points with your personal reaction. How did you feel, what stood out?'),
        phrases: ['What really struck me was…', 'I was particularly impressed by…'],
      },
      {
        name: 'Link',
        timing: nt('10-15s'),
        description: nt('Round off your talk with a brief reflection.'),
        phrases: ['All in all…', 'To sum up…', "It's definitely an experience I'd recommend because…"],
      },
    ],
    language: [
      {
        job: nt('Opening your talk'),
        phrases: ["I'd like to talk about…", 'The one that comes to mind is…'],
      },
      {
        job: nt('Telling the story'),
        phrases: ['At first…', 'After that…', 'Eventually…', 'What happened was…'],
      },
      {
        job: nt('Your reaction'),
        phrases: ['What really struck me was…', "I'll never forget…", 'Looking back…'],
      },
      {
        job: nt('Rounding off'),
        phrases: ['All in all…', 'To sum up…', "So that's why it matters to me."],
      },
    ],
    mistakes: [
      nt('Stopping after 40 or 50 seconds'),
      nt('Reading your notes as a script'),
      nt('Listing the bullets like a checklist'),
      nt('Skipping the final "explain why" bullet (it carries the talk)'),
      nt('Freezing on an unfamiliar topic instead of making something up'),
    ],
  },
  OREO: {
    method: 'OREO',
    title: nt('OREO formula'),
    part: 'Part 3',
    notes: [
      nt('Part 3 is about people and society in general, not about you. Push each answer past your first sentence.'),
      nt("There is no right opinion. You're graded on how you build and defend one."),
      nt('Aim for 3 to 5 sentences per answer: opinion, reason, example, then concede or conclude.'),
    ],
    stages: [
      {
        name: 'Opinion',
        description: nt('State your position clearly.'),
        phrases: ['I think…', 'I believe…', 'In my opinion…'],
      },
      {
        name: 'Reason',
        description: nt('Explain why you hold this view.'),
        phrases: ['The main reason is…', 'This is because…', 'Mainly because…'],
      },
      {
        name: 'Example',
        description: nt('Give a specific illustration.'),
        phrases: ['For example…', 'For instance…', 'Take [country/person/situation] as an example…'],
      },
      {
        name: 'Opinion (restate)',
        description: nt('Summarise or acknowledge the other side.'),
        phrases: ['So on balance…', "That's why I feel…", 'Having said that, I recognise that…'],
      },
    ],
    language: [
      {
        job: nt('Giving an opinion'),
        phrases: ["I'd argue that…", 'It seems to me that…', "From what I've seen…"],
      },
      {
        job: nt('Speculating'),
        phrases: ["It's likely that…", 'I can imagine…', 'In twenty years, we might see…'],
      },
      {
        job: nt('Comparing'),
        phrases: ['far more… than…', 'Compared with…', '…, whereas…'],
      },
      {
        job: nt('Balancing'),
        phrases: ['On the one hand…, on the other…', 'It depends on…', 'Having said that…'],
      },
      {
        job: nt('Buying time'),
        phrases: ["That's a tricky one…", "I've never thought about that, but…"],
      },
    ],
    mistakes: [
      nt('Answering only about yourself instead of people in general'),
      nt('One-sentence answers'),
      nt('Saying "I don\'t know" and stopping, instead of speculating'),
      nt('Repeating your Part 2 story'),
      nt('Ignoring the other side of the argument'),
    ],
  },
};
