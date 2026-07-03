/* Interactive practice exercises for the reading question-type pages.
   Content migrated 1:1 from the static exercise boxes that used to live in
   src/content/lesson-bodies/reading-*.html (answers unchanged).
   Rendered by src/components/PracticeQuiz.tsx on /lessons/reading/<part>. */

export interface PracticeQuestion {
  /** Question text (plain text or small inline HTML). */
  prompt: string;
  kind: 'choice' | 'text' | 'select';
  /** For choice/select questions: value = what is chosen, label = what shows. */
  options?: { value: string; label?: string }[];
  /** Accepted answer(s); text answers compare case-insensitively, trimmed. */
  answer: string | string[];
  explanation: string;
}

export interface PracticeSet {
  title: string;
  /** Optional short instruction shown above the questions. */
  intro?: string;
  /** Optional labelled diagram: numbered pins overlaid on an image, one per
      text question (in order). x/y are percentages of the image box. */
  diagram?: {
    image: string;
    alt: string;
    markers: { x: number; y: number }[];
  };
  questions: PracticeQuestion[];
}

const TFNG = [
  { value: 'True' },
  { value: 'False' },
  { value: 'Not Given' },
];

export const READING_PRACTICE: Record<string, PracticeSet> = {
  tfng: {
    title: 'Exercise — Decide: True, False, or Not Given',
    questions: [
      {
        prompt: 'In China, SPAM text messaging is a successful business.',
        kind: 'choice',
        options: TFNG,
        answer: 'True',
        explanation: '“A roaring trade” = a successful, booming business.',
      },
      {
        prompt: "People's phone numbers are collected through technology which cannot be readily bought.",
        kind: 'choice',
        options: TFNG,
        answer: 'False',
        explanation: 'The passage says the gadgetry is “easy-to-buy”, which directly contradicts “cannot be readily bought”.',
      },
      {
        prompt: 'In no other country do people receive more spam texts than in China.',
        kind: 'choice',
        options: TFNG,
        answer: 'True',
        explanation: '“Chinese mobile-users get more spam… than their counterparts anywhere else in the world.”',
      },
      {
        prompt: 'In 2013, the number of SPAM texts increased considerably to reach at least 300 billion.',
        kind: 'choice',
        options: TFNG,
        answer: 'Not Given',
        explanation: 'The passage gives the 2013 figure but never says whether it increased from a previous year — no information either way.',
      },
      {
        prompt: 'The majority of all texts received in Shanghai and Beijing are SPAM.',
        kind: 'choice',
        options: TFNG,
        answer: 'False',
        explanation: 'Spam accounts for one-fifth to one-third of texts at most — that is not a majority.',
      },
      {
        prompt: 'In 2011, Americans sent more texts than anywhere else in the world.',
        kind: 'choice',
        options: TFNG,
        answer: 'Not Given',
        explanation: 'The passage says how many spam texts Americans received — it never compares total texts sent with other countries.',
      },
    ],
  },

  mc: {
    title: 'Exercise — Choose the correct answer',
    questions: [
      {
        prompt: 'When was rice first cultivated?',
        kind: 'choice',
        options: [
          { value: 'A', label: 'A) Around 15,000 years ago' },
          { value: 'B', label: 'B) When people first came to Asia' },
          { value: 'C', label: 'C) After people settled in mountains' },
        ],
        answer: 'A',
        explanation: '“As long as 15,000 years ago” is stated directly in the passage.',
      },
      {
        prompt: "Which country is one of the world's leading rice exporters?",
        kind: 'choice',
        options: [
          { value: 'A', label: 'A) China' },
          { value: 'B', label: 'B) India' },
          { value: 'C', label: 'C) The United States' },
        ],
        answer: 'C',
        explanation: 'The passage states the US “is one of the world\'s leading exporters” despite growing only 1% of the world\'s rice.',
      },
      {
        prompt: 'How is the rice plant different from wheat?',
        kind: 'choice',
        options: [
          { value: 'A', label: 'A) It produces more grain per harvest' },
          { value: 'B', label: 'B) Multiple parts of the plant are used' },
          { value: 'C', label: 'C) It does not need water to grow' },
        ],
        answer: 'B',
        explanation: '“Rice plants are used for many purposes” (grain, straw, husks) — unlike wheat, grown mainly for its grain.',
      },
    ],
  },

  diagram: {
    title: "Exercise — Label the Ant's Body",
    intro: "Type the correct body part for each numbered pin, using NO MORE than 2 words from the passage. Then answer the bonus True/False/Not Given questions.",
    diagram: {
      image: '/pics/reading/ant-diagram.png',
      alt: "Side profile of an ant with numbered pins on its body parts",
      // one marker per label question, in order (exoskeleton, thorax, antennae, mandibles, stinger)
      markers: [
        { x: 76, y: 36 }, // 1 exoskeleton — abdomen shell
        { x: 51, y: 41 }, // 2 thorax — middle segment
        { x: 20, y: 29 }, // 3 antennae — upper feelers
        { x: 19, y: 55 }, // 4 mandibles — front pincers
        { x: 90, y: 57 }, // 5 stinger — coral rear tip
      ],
    },
    questions: [
      {
        prompt: "The hard covering protecting the ant's body →",
        kind: 'text',
        answer: 'exoskeleton',
        explanation: '“Their bodies are covered with a hard armour called the exoskeleton.”',
      },
      {
        prompt: 'The middle section of the body, between head and abdomen →',
        kind: 'text',
        answer: 'thorax',
        explanation: '“…the part of the body called the thorax, which is located before the head.”',
      },
      {
        prompt: 'The sensory organs on the head, which are elbowed →',
        kind: 'text',
        answer: 'antennae',
        explanation: '“…elbowed antennae, which act as sensors.”',
      },
      {
        prompt: 'The powerful biting tools on the head, also called pincers →',
        kind: 'text',
        answer: 'mandibles',
        explanation: '“…powerful pincers, known as mandibles.”',
      },
      {
        prompt: 'The rear weapon used for attack →',
        kind: 'text',
        answer: ['stinger', 'abdominal stinger'],
        explanation: '“…their rear abdominal stinger is their offensive one.”',
      },
      {
        prompt: 'Bonus: The antennae of an ant cannot bend.',
        kind: 'choice',
        options: TFNG,
        answer: 'False',
        explanation: 'The passage says antennae are “elbowed” — meaning they do bend.',
      },
      {
        prompt: 'Bonus: Only queen ants have wings.',
        kind: 'choice',
        options: TFNG,
        answer: 'True',
        explanation: 'Only queen ants are described as having wings.',
      },
      {
        prompt: 'Bonus: Larvae undergo metamorphosis in the pupal stage.',
        kind: 'choice',
        options: TFNG,
        answer: 'True',
        explanation: '“They pass through the pupal stage” and then “the metamorphosis is complete”.',
      },
    ],
  },

  headings: {
    title: 'Exercise — Match each heading to a paragraph',
    intro: 'For every heading, choose the paragraph (A–D) it best fits. Some headings are distractors and match no paragraph — choose “Not used” for those.',
    questions: (() => {
      const PARAS = [
        { value: 'A', label: 'Paragraph A' },
        { value: 'B', label: 'Paragraph B' },
        { value: 'C', label: 'Paragraph C' },
        { value: 'D', label: 'Paragraph D' },
        { value: 'None', label: 'Not used' },
      ];
      const rows: [string, string, string][] = [
        ['I — Changing temperatures', 'None', 'A distractor — no paragraph is mainly about temperatures changing over time.'],
        ['II — The greenhouse structure', 'A', 'Paragraph A describes what a greenhouse is and how it physically traps heat.'],
        ['III — Global warming', 'None', 'Tempting for C, but that paragraph is specifically about the effects of burning fossil fuels (heading VIII), not global warming in general.'],
        ['IV — Use of a greenhouse for plants', 'None', 'Only one sentence in A mentions plants — the paragraph as a whole is about the structure.'],
        ['V — Scientific research findings', 'None', 'A distractor — no paragraph reports the results of scientific research.'],
        ["VI — Earth's atmosphere and natural warmth", 'B', 'Paragraph B explains how the atmosphere naturally traps heat and keeps Earth comfortable.'],
        ['VII — Our choices', 'D', 'Paragraph D is entirely about what governments and individuals can choose to do.'],
        ['VIII — Effects of burning fossil fuels', 'C', 'Paragraph C explains that burning fossil fuels adds CO₂ and enhances the greenhouse effect.'],
        ['IX — Climates around the world', 'None', 'A distractor — the passage never discusses different climates around the world.'],
      ];
      return rows.map(([prompt, answer, explanation]) => ({
        prompt,
        kind: 'select' as const,
        options: PARAS,
        answer,
        explanation,
      }));
    })(),
  },

  sentence: {
    title: 'Exercise — Complete the sentences',
    intro: 'Use NO MORE than THREE words from the passage for each gap.',
    questions: [
      {
        prompt: 'Scientists are still trying to understand how the pyramids were built; they describe this as ________ the puzzle.',
        kind: 'text',
        answer: 'piecing together',
        explanation: '“Scientists are currently piecing together the puzzle of how they were built.”',
      },
      {
        prompt: 'Pyramid blocks were transported either by river or by land using a ________.',
        kind: 'text',
        answer: 'wooden sledge',
        explanation: '“…or by land using a wooden sledge.”',
      },
      {
        prompt: 'To reduce friction, the sand in front of the sledge was made wet ________.',
        kind: 'text',
        answer: 'with water',
        explanation: '“…the sand in front of the sledge was wet with water… to reduce friction.”',
      },
      {
        prompt: 'Sledges were pulled either by hand or using ________.',
        kind: 'text',
        answer: ['beasts of burden', 'beasts'],
        explanation: '“These sledges were pulled manually or sometimes by using beasts of burden.”',
      },
      {
        prompt: 'The theory that slave labour was used to build the pyramids has been ________.',
        kind: 'text',
        answer: 'debunked',
        explanation: '“…this theory has since been debunked.”',
      },
      {
        prompt: 'The architect who achieved the first smooth-sided pyramid was ________, working for King Sneferu.',
        kind: 'text',
        answer: 'imhotep',
        explanation: '“The credit for finally achieving a smooth-sided pyramid goes to Imhotep, an architect commissioned by King Sneferu.”',
      },
    ],
  },

  para: {
    title: 'Exercise — Which paragraph contains the information?',
    questions: [
      {
        prompt: 'A reference to the harsh methods used to teach Beethoven music as a child',
        kind: 'choice',
        options: [{ value: 'A' }, { value: 'B' }, { value: 'C' }, { value: 'D' }],
        answer: 'A',
        explanation: 'Paragraph A: “extraordinary rigour and brutality… flogged, locked in the cellar”.',
      },
      {
        prompt: 'A mention of Beethoven concealing a personal problem',
        kind: 'choice',
        options: [{ value: 'A' }, { value: 'B' }, { value: 'C' }, { value: 'D' }],
        answer: 'C',
        explanation: 'Paragraph C: “a shocking fact that he tried desperately to conceal. He was going deaf.”',
      },
      {
        prompt: 'Information about a work that was initially impossible for musicians to perform',
        kind: 'choice',
        options: [{ value: 'A' }, { value: 'B' }, { value: 'C' }, { value: 'D' }],
        answer: 'B',
        explanation: 'Paragraph B: “the musicians could not figure out how to play it”.',
      },
      {
        prompt: "The composer's date of death",
        kind: 'choice',
        options: [{ value: 'A' }, { value: 'B' }, { value: 'C' }, { value: 'D' }],
        answer: 'D',
        explanation: 'Paragraph D: “Beethoven died on March 26, 1827”.',
      },
      {
        prompt: "A reference to Beethoven's disappointment in a political figure",
        kind: 'choice',
        options: [{ value: 'A' }, { value: 'B' }, { value: 'C' }, { value: 'D' }],
        answer: 'B',
        explanation: 'Paragraph B: “Napoleon proclaimed himself Emperor, Beethoven was so disappointed…”.',
      },
      {
        prompt: "Details about Beethoven's difficulty communicating with others",
        kind: 'choice',
        options: [{ value: 'A' }, { value: 'B' }, { value: 'C' }, { value: 'D' }],
        answer: 'C',
        explanation: 'Paragraph C: “struggled to make out the words spoken to him in conversation”.',
      },
    ],
  },

  cat: {
    title: 'Exercise — Classify each statement',
    intro: 'A = Egyptians · B = Greeks · C = Romans',
    questions: [
      {
        prompt: 'This civilisation introduced a system of government involving citizens in decision-making.',
        kind: 'choice',
        options: [
          { value: 'A', label: 'A · Egyptians' },
          { value: 'B', label: 'B · Greeks' },
          { value: 'C', label: 'C · Romans' },
        ],
        answer: 'B',
        explanation: 'The Greeks “introduced the concept of democracy in Athens”.',
      },
      {
        prompt: 'This civilisation built a road network across their empire.',
        kind: 'choice',
        options: [
          { value: 'A', label: 'A · Egyptians' },
          { value: 'B', label: 'B · Greeks' },
          { value: 'C', label: 'C · Romans' },
        ],
        answer: 'C',
        explanation: 'The Romans “built an extensive network of roads that connected their empire”.',
      },
      {
        prompt: 'This civilisation developed a written language using pictures and symbols.',
        kind: 'choice',
        options: [
          { value: 'A', label: 'A · Egyptians' },
          { value: 'B', label: 'B · Greeks' },
          { value: 'C', label: 'C · Romans' },
        ],
        answer: 'A',
        explanation: 'The Egyptians “developed a writing system called hieroglyphics”.',
      },
      {
        prompt: 'This civilisation founded a sporting competition with religious significance.',
        kind: 'choice',
        options: [
          { value: 'A', label: 'A · Egyptians' },
          { value: 'B', label: 'B · Greeks' },
          { value: 'C', label: 'C · Romans' },
        ],
        answer: 'B',
        explanation: 'The Greeks “founded the Olympic Games as a religious and athletic festival”.',
      },
      {
        prompt: 'This civilisation created a legal framework that influenced modern law.',
        kind: 'choice',
        options: [
          { value: 'A', label: 'A · Egyptians' },
          { value: 'B', label: 'B · Greeks' },
          { value: 'C', label: 'C · Romans' },
        ],
        answer: 'C',
        explanation: 'The Romans “developed a legal system that forms the basis of many modern laws”.',
      },
      {
        prompt: 'This civilisation used a process to preserve the bodies of the dead.',
        kind: 'choice',
        options: [
          { value: 'A', label: 'A · Egyptians' },
          { value: 'B', label: 'B · Greeks' },
          { value: 'C', label: 'C · Romans' },
        ],
        answer: 'A',
        explanation: 'For the Egyptians, “embalming the dead… were key practices”.',
      },
      {
        prompt: "This civilisation's language is the origin of many modern European languages.",
        kind: 'choice',
        options: [
          { value: 'A', label: 'A · Egyptians' },
          { value: 'B', label: 'B · Greeks' },
          { value: 'C', label: 'C · Romans' },
        ],
        answer: 'C',
        explanation: '“Latin — the Roman language — is the root of several modern European languages.”',
      },
      {
        prompt: 'This civilisation built structures to transport water into urban areas.',
        kind: 'choice',
        options: [
          { value: 'A', label: 'A · Egyptians' },
          { value: 'B', label: 'B · Greeks' },
          { value: 'C', label: 'C · Romans' },
        ],
        answer: 'C',
        explanation: 'The Romans “constructed aqueducts to supply water to cities”.',
      },
    ],
  },
};
