/* Structure methods ported from the speaking lessons' "Talk Structure" /
   "Extending Answers" sections (src/content/lesson-bodies/speaking-part{1,2,3}.html)
   — surfaced live as a coaching cheat-sheet during practice instead of
   staying buried in the lesson pages. */

export type StructureMethod = 'ARE' | 'PEEL' | 'OREO';

export interface StructureStage {
  name: string;
  timing?: string;
  description: string;
  phrases: string[];
}

export interface StructureGuide {
  method: StructureMethod;
  title: string;
  stages: StructureStage[];
}

export const SPEAKING_STRUCTURE_GUIDES: Record<StructureMethod, StructureGuide> = {
  ARE: {
    method: 'ARE',
    title: 'A.R.E. method',
    stages: [
      {
        name: 'Answer',
        description: 'Respond directly in one sentence — yes, no, sometimes, rarely. Don’t dodge or ramble before getting to the point.',
        phrases: [],
      },
      {
        name: 'Reason',
        description: 'Give the reason behind your answer with a conjunction more advanced than a plain "because".',
        phrases: ['given that…', 'seeing as…', 'since…'],
      },
      {
        name: 'Extend',
        description: 'Add a specific example, memory, or contrasting detail — connects two ideas in one breath instead of two flat sentences.',
        phrases: ['even though…', 'whereas…', 'not only… but also…'],
      },
    ],
  },
  PEEL: {
    method: 'PEEL',
    title: 'PEEL method',
    stages: [
      {
        name: 'Point',
        timing: '15–20s',
        description: 'Introduce your topic clearly — briefly cover the who/what/where.',
        phrases: ['I’d like to talk about…', 'The [topic] I’m going to describe is…'],
      },
      {
        name: 'Explain',
        timing: '60–70s',
        description: 'Work through each bullet point on the cue card in turn, with specific details and examples.',
        phrases: ['In terms of [bullet]…', 'As far as [bullet] is concerned…', 'When it comes to [bullet]…'],
      },
      {
        name: 'Elaborate',
        timing: '20–25s',
        description: 'Expand beyond the bullet points with your personal reaction — how did you feel, what stood out?',
        phrases: ['What really struck me was…', 'I was particularly impressed by…'],
      },
      {
        name: 'Link',
        timing: '10–15s',
        description: 'Round off your talk with a brief reflection.',
        phrases: ['All in all…', 'To sum up…', 'It’s definitely an experience I’d recommend because…'],
      },
    ],
  },
  OREO: {
    method: 'OREO',
    title: 'OREO formula',
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
        phrases: ['So on balance…', 'That’s why I feel…', 'Having said that, I recognise that…'],
      },
    ],
  },
};
