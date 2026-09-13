/* Structure methods ported from the speaking lessons' "Talk Structure" /
   "Extending Answers" sections (src/content/lesson-bodies/speaking-part{1,2,3}.html),
   surfaced live as an interactive coach during practice instead of
   staying buried in the lesson pages. Each guide feeds the four tabs of
   SpeakingCoachPanel: notes + stages feed Plan, language feeds Phrases,
   mistakes feeds Avoid (Vocab comes from the prompt bank, per topic). */

export type StructureMethod = 'ARE' | 'PEEL' | 'OREO';

export interface StructureStage {
  name: string;
  timing?: string;
  description: string;
  phrases: string[];
}

export interface LanguageGroup {
  /** the communicative job, e.g. "Buying a second to think" */
  job: string;
  phrases: string[];
}

export interface StructureGuide {
  method: StructureMethod;
  title: string;
  /** which part of the test this method belongs to (shown in the panel header) */
  part: string;
  /** what a good answer in this part looks like: the Plan tab's intro box */
  notes: string[];
  stages: StructureStage[];
  /** functional phrase groups for the Phrases tab */
  language: LanguageGroup[];
  /** common mistakes for the Avoid tab */
  mistakes: string[];
}

export const SPEAKING_STRUCTURE_GUIDES: Record<StructureMethod, StructureGuide> = {
  ARE: {
    method: 'ARE',
    title: 'A.R.E. method',
    part: 'Part 1',
    notes: [
      'Answer every question in 2 to 4 sentences: one direct answer, then a reason or example. Never just "yes" or "no".',
      'Match the tense of the question: "Did you…?" needs a past answer, "Would you…?" needs would.',
      'It\'s a friendly conversation about you, so relaxed, natural language beats formal essay words here.',
    ],
    stages: [
      {
        name: 'Answer',
        description: 'Respond directly in one sentence. Yes, no, sometimes, rarely. Don\'t dodge or ramble before getting to the point.',
        phrases: ['Honestly, yes…', 'Not really, to be fair…', 'It depends, but mostly…'],
      },
      {
        name: 'Reason',
        description: 'Give the reason behind your answer with a conjunction more advanced than a plain "because".',
        phrases: ['given that…', 'seeing as…', 'since…'],
      },
      {
        name: 'Extend',
        description: 'Add a specific example, memory, or contrasting detail. Connects two ideas in one breath instead of two flat sentences.',
        phrases: ['even though…', 'whereas…', 'not only… but also…'],
      },
    ],
    language: [
      {
        job: 'Buying a second to think',
        phrases: ['Well, let me see…', 'That\'s a good question…', 'To be honest…', 'Hmm, I\'d say…'],
      },
      {
        job: 'Giving a reason',
        phrases: ['mainly because…', 'given that…', 'seeing as…', 'the thing is…'],
      },
      {
        job: 'Adding an example',
        phrases: ['For instance…', 'Like last weekend, when…', 'Take my brother, for example…'],
      },
      {
        job: 'Contrasting',
        phrases: ['even though…', 'whereas…', 'having said that…', 'mind you…'],
      },
    ],
    mistakes: [
      'One-word answers',
      'Reciting a memorised speech',
      'Repeating the exact words of the question',
      'Long silences instead of a thinking phrase',
      'Formal essay language ("Furthermore…")',
    ],
  },
  PEEL: {
    method: 'PEEL',
    title: 'PEEL method',
    part: 'Part 2',
    notes: [
      'In the prep minute, write one or two words per bullet. Your notes are a map, not a script.',
      'Keep talking until the examiner stops you. Under a minute costs marks; small details and mini-stories fill time naturally.',
      'It\'s fine to invent or exaggerate. The examiner grades your English, not your honesty.',
    ],
    stages: [
      {
        name: 'Point',
        timing: '15-20s',
        description: 'Introduce your topic clearly. Briefly cover the who/what/where.',
        phrases: ['I\'d like to talk about…', 'The [topic] I\'m going to describe is…'],
      },
      {
        name: 'Explain',
        timing: '60-70s',
        description: 'Work through each bullet point on the cue card in turn, with specific details and examples.',
        phrases: ['In terms of [bullet]…', 'As far as [bullet] is concerned…', 'When it comes to [bullet]…'],
      },
      {
        name: 'Elaborate',
        timing: '20-25s',
        description: 'Expand beyond the bullet points with your personal reaction. How did you feel, what stood out?',
        phrases: ['What really struck me was…', 'I was particularly impressed by…'],
      },
      {
        name: 'Link',
        timing: '10-15s',
        description: 'Round off your talk with a brief reflection.',
        phrases: ['All in all…', 'To sum up…', 'It\'s definitely an experience I\'d recommend because…'],
      },
    ],
    language: [
      {
        job: 'Opening your talk',
        phrases: ['I\'d like to talk about…', 'The one that comes to mind is…'],
      },
      {
        job: 'Telling the story',
        phrases: ['At first…', 'After that…', 'Eventually…', 'What happened was…'],
      },
      {
        job: 'Your reaction',
        phrases: ['What really struck me was…', 'I\'ll never forget…', 'Looking back…'],
      },
      {
        job: 'Rounding off',
        phrases: ['All in all…', 'To sum up…', 'So that\'s why it matters to me.'],
      },
    ],
    mistakes: [
      'Stopping after 40 or 50 seconds',
      'Reading your notes as a script',
      'Listing the bullets like a checklist',
      'Skipping the final "explain why" bullet (it carries the talk)',
      'Freezing on an unfamiliar topic instead of making something up',
    ],
  },
  OREO: {
    method: 'OREO',
    title: 'OREO formula',
    part: 'Part 3',
    notes: [
      'Part 3 is about people and society in general, not about you. Push each answer past your first sentence.',
      'There is no right opinion. You\'re graded on how you build and defend one.',
      'Aim for 3 to 5 sentences per answer: opinion, reason, example, then concede or conclude.',
    ],
    stages: [
      {
        name: 'Opinion',
        description: 'State your position clearly.',
        phrases: ['I think…', 'I believe…', 'In my opinion…'],
      },
      {
        name: 'Reason',
        description: 'Explain why you hold this view.',
        phrases: ['The main reason is…', 'This is because…', 'Mainly because…'],
      },
      {
        name: 'Example',
        description: 'Give a specific illustration.',
        phrases: ['For example…', 'For instance…', 'Take [country/person/situation] as an example…'],
      },
      {
        name: 'Opinion (restate)',
        description: 'Summarise or acknowledge the other side.',
        phrases: ['So on balance…', 'That\'s why I feel…', 'Having said that, I recognise that…'],
      },
    ],
    language: [
      {
        job: 'Giving an opinion',
        phrases: ['I\'d argue that…', 'It seems to me that…', 'From what I\'ve seen…'],
      },
      {
        job: 'Speculating',
        phrases: ['It\'s likely that…', 'I can imagine…', 'In twenty years, we might see…'],
      },
      {
        job: 'Comparing',
        phrases: ['far more… than…', 'Compared with…', '…, whereas…'],
      },
      {
        job: 'Balancing',
        phrases: ['On the one hand…, on the other…', 'It depends on…', 'Having said that…'],
      },
      {
        job: 'Buying time',
        phrases: ['That\'s a tricky one…', 'I\'ve never thought about that, but…'],
      },
    ],
    mistakes: [
      'Answering only about yourself instead of people in general',
      'One-sentence answers',
      'Saying "I don\'t know" and stopping, instead of speculating',
      'Repeating your Part 2 story',
      'Ignoring the other side of the argument',
    ],
  },
};
