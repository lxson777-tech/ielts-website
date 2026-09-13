/* Interactive practice exercises for the six new Listening question-type
   pages (multiple-choice, matching, map-labelling, form-completion,
   sentence-completion, short-answer). Each entry's questions are built
   directly from the ORIGINAL transcript simulated in the matching fragment
   at src/content/lesson-bodies/listening-<slug>.html. Part 1-4 pages are
   NOT included here, they keep their static exercise-box and <details>
   answer key instead. Rendered by src/components/PracticeQuiz.tsx, same
   component used for the Reading question-type pages. */

import type { PracticeSet } from './reading-practice';

const MAP_POSITIONS = [
  { value: 'A', label: 'A · just past the gate' },
  { value: 'B', label: 'B · southwest' },
  { value: 'C', label: 'C · west' },
  { value: 'D', label: 'D · northwest corner' },
  { value: 'E', label: 'E · north (top)' },
  { value: 'F', label: 'F · northeast' },
  { value: 'G', label: 'G · east' },
  { value: 'H', label: 'H · southeast, near the gate' },
];

export const LISTENING_PRACTICE: Record<string, PracticeSet> = {
  'multiple-choice': {
    title: 'Exercise. Choose the correct letter, A, B or C',
    intro: 'Based on the parking transcript above.',
    questions: [
      {
        prompt: 'Why can new staff not use the Elm Street car park straight away?',
        kind: 'choice',
        options: [
          { value: 'A', label: 'A) It is too far from the building' },
          { value: 'B', label: 'B) It is reserved for permit holders, and permits take time to arrange' },
          { value: 'C', label: 'C) It is closed for redevelopment' },
        ],
        answer: 'B',
        explanation: '"it\'s reserved for permit holders only, and permits take about a month to process."',
      },
      {
        prompt: 'What is the problem with the Birch Avenue car park?',
        kind: 'choice',
        options: [
          { value: 'A', label: 'A) It has no free parking at all' },
          { value: 'B', label: 'B) Meetings often overrun the free period, leading to high charges' },
          { value: 'C', label: 'C) It is too far from the office' },
        ],
        answer: 'B',
        explanation: '"meetings often run over two hours, and the hourly rate after that is fairly steep."',
      },
      {
        prompt: 'Which car park does the speaker recommend for now?',
        kind: 'choice',
        options: [
          { value: 'A', label: 'A) Elm Street' },
          { value: 'B', label: 'B) Birch Avenue' },
          { value: 'C', label: 'C) Willow Road' },
        ],
        answer: 'C',
        explanation: '"What I\'d genuinely recommend... is the multi-storey on Willow Road."',
      },
      {
        prompt: 'Why does Willow Road work out cheaper for most staff?',
        kind: 'choice',
        options: [
          { value: 'A', label: 'A) It has no daily limit on parking time' },
          { value: 'B', label: 'B) It charges a flat daily rate rather than an hourly one' },
          { value: 'C', label: 'C) It is free for the first two hours, like Birch Avenue' },
        ],
        answer: 'B',
        explanation: '"it charges a flat daily rate that works out far cheaper than either of the other two."',
      },
      {
        prompt: 'What does the speaker say about cycling to work?',
        kind: 'choice',
        options: [
          { value: 'A', label: 'A) It is discouraged for safety reasons' },
          { value: 'B', label: 'B) It is actively encouraged, with racks, lockers and showers provided' },
          { value: 'C', label: 'C) Bike racks are located on Willow Road' },
        ],
        answer: 'B',
        explanation: '"cycling is actively encouraged, and there are secure bike racks... with lockers and showers on the ground floor."',
      },
    ],
  },

  matching: {
    title: 'Exercise. What does the advisor say about each class?',
    intro: 'Choose the matching statement for each class. Two statements in the list are not used.',
    questions: (() => {
      const OPTIONS = [
        { value: 'A', label: 'A) is only open to continuing students' },
        { value: 'B', label: 'B) requires students to bring their own materials' },
        { value: 'C', label: 'C) has increased its number of sessions' },
        { value: 'D', label: 'D) is suitable for complete beginners' },
        { value: 'E', label: 'E) currently has no places available' },
        { value: 'F', label: 'F) is taught by a visiting specialist' },
        { value: 'G', label: 'G) takes place off-site' },
      ];
      const rows: [string, string, string][] = [
        ['Pottery', 'E', '"Pottery is completely full already... you\'ll need to go on the waiting list."'],
        ['Photography', 'D', '"it\'s genuinely ideal for beginners, since the first four weeks cover nothing but camera basics."'],
        ['French', 'A', '"it\'s only open to students who attended in the autumn, we can\'t take newcomers halfway through."'],
        ['Yoga', 'C', '"it now runs twice a week instead of just once."'],
        ['Cookery', 'B', '"you\'ll need to bring your own ingredients each week... every other class supplies all its own materials."'],
      ];
      return rows.map(([prompt, answer, explanation]) => ({
        prompt,
        kind: 'select' as const,
        options: OPTIONS,
        answer,
        explanation,
      }));
    })(),
  },

  'map-labelling': {
    title: 'Exercise. Label the park map',
    intro:
      'The park is circular with the main gate at the south (bottom). Positions run clockwise from the gate: A (just past the gate), B (southwest), C (west), D (northwest corner), E (north, the top), F (northeast), G (east), H (southeast, near the gate). Two letters are not used. Choose the correct letter for each feature.',
    questions: [
      {
        prompt: 'Duck pond',
        kind: 'select',
        options: MAP_POSITIONS,
        answer: 'A',
        explanation: '"you\'ll see the duck pond just a few steps along" from the gate, "that\'s the first thing you pass."',
      },
      {
        prompt: 'Rose garden',
        kind: 'select',
        options: MAP_POSITIONS,
        answer: 'C',
        explanation: '"the rose garden, which sits on the western edge of the park."',
      },
      {
        prompt: 'Bandstand',
        kind: 'select',
        options: MAP_POSITIONS,
        answer: 'D',
        explanation: '"further round to the northwest corner and you\'ll find the bandstand."',
      },
      {
        prompt: "Children's playground",
        kind: 'select',
        options: MAP_POSITIONS,
        answer: 'E',
        explanation: '"Right at the top of the park, at the very north point, is the children\'s playground."',
      },
      {
        prompt: 'Café',
        kind: 'select',
        options: MAP_POSITIONS,
        answer: 'F',
        explanation: '"Continuing clockwise past the playground, in the northeast, is the café."',
      },
      {
        prompt: 'Greenhouse',
        kind: 'select',
        options: MAP_POSITIONS,
        answer: 'H',
        explanation: '"almost back at the gate but just before you complete the circle, on the south-eastern side, you\'ll find the greenhouse."',
      },
    ],
  },

  'form-completion': {
    title: 'Exercise. Complete the booking form (NO MORE than two words and/or a number)',
    intro: 'Based on the broadband installation call above.',
    questions: [
      {
        prompt: 'Surname:',
        kind: 'text',
        answer: 'Petrov',
        explanation: '"It\'s Radoslav Petrov... the surname is P-E-T-R-O-V."',
      },
      {
        prompt: 'Contact number:',
        kind: 'text',
        answer: ['07923556102', '07923 556102'],
        explanation: '"It\'s oh-seven-nine-two-three, five-five-six-one-oh-two."',
      },
      {
        prompt: 'Street name:',
        kind: 'text',
        answer: ['Maple Court'],
        explanation: '"Flat 4, 18 Maple Court."',
      },
      {
        prompt: 'Postcode:',
        kind: 'text',
        answer: 'NW6 4DP',
        explanation: '"NW6 4DP."',
      },
      {
        prompt: 'Appointment time:',
        kind: 'text',
        answer: ['2pm', '2 pm', 'two o\'clock', '14:00'],
        explanation: '"I can offer two o\'clock on Thursday the eleventh."',
      },
      {
        prompt: 'Reference number:',
        kind: 'text',
        answer: ['BR-4472', 'BR4472'],
        explanation: '"Your reference number is BR-4472."',
      },
    ],
  },

  'sentence-completion': {
    title: 'Exercise. Complete the sentences (NO MORE than three words)',
    intro: 'Based on the lecture extract on sleep and memory above.',
    questions: [
      {
        prompt: 'Sleep was once thought to be simply a period of ________.',
        kind: 'text',
        answer: 'rest',
        explanation: '"researchers assumed sleep was simply a period of rest."',
      },
      {
        prompt: "During deep sleep, the ________ replays the day's events.",
        kind: 'text',
        answer: 'hippocampus',
        explanation: '"the hippocampus, which stores short-term memories, appears to replay the events of the day."',
      },
      {
        prompt: 'Important memories are transferred to the ________ for long-term storage.',
        kind: 'text',
        answer: 'cortex',
        explanation: '"transferring the most important details to the cortex for long-term storage."',
      },
      {
        prompt: 'During sleep, memory replay can happen up to ________ times faster than the original experience.',
        kind: 'text',
        answer: ['twenty', '20'],
        explanation: '"this replay happens faster than the original experience, sometimes twenty times faster."',
      },
      {
        prompt: 'It is the proportion of time spent in ________ sleep that predicts performance most strongly.',
        kind: 'text',
        answer: 'deep',
        explanation: '"The proportion of time spent in deep sleep, rather than lighter stages, predicts performance most strongly."',
      },
      {
        prompt: 'Cramming through the night before an exam is almost always ________.',
        kind: 'text',
        answer: 'counterproductive',
        explanation: '"cramming through the night before an exam is almost always counterproductive."',
      },
    ],
  },

  'short-answer': {
    title: 'Exercise. Answer the questions (NO MORE than three words and/or a number)',
    intro: 'Based on the museum preview above.',
    questions: [
      {
        prompt: 'On which day is the museum closed each week?',
        kind: 'text',
        answer: 'Monday',
        explanation: '"We\'re now open six days a week, Tuesday to Sunday", so Monday is the day it is shut.',
      },
      {
        prompt: 'What kind of audio tour has been introduced?',
        kind: 'text',
        answer: ['self-guided', 'self-guided tour'],
        explanation: '"We\'ve also introduced a self-guided audio tour." A hyphenated word counts as one word.',
      },
      {
        prompt: 'How many languages is the tour available in?',
        kind: 'text',
        answer: ['four', '4'],
        explanation: '"available in four languages." Figures are accepted for numbers.',
      },
      {
        prompt: 'Where is the Victorian schoolroom located?',
        kind: 'text',
        answer: ['first floor', 'the first floor'],
        explanation: '"the reconstructed Victorian schoolroom on the first floor."',
      },
      {
        prompt: "What is the museum's children's activity trail called?",
        kind: 'text',
        answer: ['Time Detectives', 'Time Detectives trail'],
        explanation: '"a hands-on activity trail called the Time Detectives trail."',
      },
      {
        prompt: 'What time does the café close?',
        kind: 'text',
        answer: ['4.30', 'four thirty', '4:30'],
        explanation: '"the café closes earlier than the rest of the museum, at four thirty."',
      },
    ],
  },
};
