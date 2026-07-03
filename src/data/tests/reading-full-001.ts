import type { PracticeTest, TestPart } from '../../lib/tests/schema';
import { readingTest001 } from './reading-001';

/* Full Academic Reading exam scaffold: 60 minutes, 3 passages, all question
   types. Passage 1 reuses the finished M-Pesa material; Passages 2 and 3 are
   PLACEHOLDERS — real passages and questions get authored in the materials
   pass. The structure is complete and walkable so the player can be tested. */

const passage1: TestPart = readingTest001.parts[0]!;

// ── PLACEHOLDER Passage 2 — replace stimulus + questions with real material ──
const passage2: TestPart = {
  label: 'Passage 2',
  stimulus: {
    kind: 'passage',
    label: 'Reading Passage 2',
    title: '[Placeholder] The Future of Urban Transport',
    instructionHtml:
      'You should spend about 20 minutes on <strong>Questions 14–26</strong>. <em>(Placeholder passage — real text to be added.)</em>',
    paragraphs: [
      { label: 'A', html: 'Placeholder paragraph A. Real passage text will be added in the materials pass. This section would describe the background of the topic.' },
      { label: 'B', html: 'Placeholder paragraph B. This section would introduce the main argument or development.' },
      { label: 'C', html: 'Placeholder paragraph C. This section would present evidence or an example.' },
      { label: 'D', html: 'Placeholder paragraph D. This section would discuss limitations or a counter-view.' },
      { label: 'E', html: 'Placeholder paragraph E. This section would conclude with implications.' },
    ],
  },
  groups: [
    {
      title: 'Questions 14–17',
      type: 'matching-headings',
      instructionHtml: 'Choose the correct heading for each paragraph from the list of headings below.',
      legendHtml:
        '<strong>List of Headings</strong><br>i — Placeholder heading one<br>ii — Placeholder heading two<br>iii — Placeholder heading three<br>iv — Placeholder heading four<br>v — Placeholder heading five<br>vi — Placeholder heading six',
      options: ['i', 'ii', 'iii', 'iv', 'v', 'vi'],
      questions: [
        { id: 'q14', textHtml: 'Paragraph A', answer: 'ii' },
        { id: 'q15', textHtml: 'Paragraph B', answer: 'iv' },
        { id: 'q16', textHtml: 'Paragraph C', answer: 'i' },
        { id: 'q17', textHtml: 'Paragraph D', answer: 'v' },
      ],
    },
    {
      title: 'Questions 18–21',
      type: 'multiple-choice',
      instructionHtml: 'Choose the correct letter, <strong>A</strong>, <strong>B</strong>, <strong>C</strong> or <strong>D</strong>.',
      questions: [
        { id: 'q18', textHtml: 'Placeholder multiple-choice question one?', options: ['Option A', 'Option B', 'Option C', 'Option D'], answer: 'A' },
        { id: 'q19', textHtml: 'Placeholder multiple-choice question two?', options: ['Option A', 'Option B', 'Option C', 'Option D'], answer: 'C' },
        { id: 'q20', textHtml: 'Placeholder multiple-choice question three?', options: ['Option A', 'Option B', 'Option C', 'Option D'], answer: 'B' },
        { id: 'q21', textHtml: 'Placeholder multiple-choice question four?', options: ['Option A', 'Option B', 'Option C', 'Option D'], answer: 'D' },
      ],
    },
    {
      title: 'Questions 22–26',
      type: 'sentence-completion',
      instructionHtml: 'Complete the sentences. Choose <strong>NO MORE THAN TWO WORDS</strong> from the passage.',
      questions: [
        { id: 'q22', before: 'Placeholder sentence needing a', after: 'to complete it.', answer: 'placeholder' },
        { id: 'q23', before: 'Another gapped sentence about the', after: 'described above.', answer: 'topic' },
        { id: 'q24', before: 'A third sentence mentioning the', after: 'in paragraph C.', answer: 'evidence' },
        { id: 'q25', before: 'A fourth sentence referring to a', after: 'limitation.', answer: 'key' },
        { id: 'q26', before: 'A final sentence about the', after: 'of the study.', answer: 'implications' },
      ],
    },
  ],
};

// ── PLACEHOLDER Passage 3 — replace stimulus + questions with real material ──
const passage3: TestPart = {
  label: 'Passage 3',
  stimulus: {
    kind: 'passage',
    label: 'Reading Passage 3',
    title: '[Placeholder] Insect Societies',
    instructionHtml:
      'You should spend about 20 minutes on <strong>Questions 27–40</strong>. <em>(Placeholder passage — real text to be added.)</em>',
    paragraphs: [
      { html: 'Placeholder passage 3 text. This would be the most difficult, argumentative passage. The ant diagram question below uses the real illustration so the diagram-labelling type can be tested end to end.' },
      { html: 'Ants can be identified by the constriction between the abdomen and the thorax. Their bodies are covered by a hard exoskeleton. Their rear stinger is an offensive weapon, while their head bears elbowed antennae and powerful pincers called mandibles.' },
    ],
  },
  groups: [
    {
      title: 'Questions 27–34',
      type: 'categorisation',
      instructionHtml: 'Classify each statement as belonging to the correct category.',
      legendHtml: '<strong>A</strong> — Category one &nbsp;·&nbsp; <strong>B</strong> — Category two &nbsp;·&nbsp; <strong>C</strong> — Category three',
      options: ['A', 'B', 'C'],
      questions: [
        { id: 'q27', textHtml: 'Placeholder classification statement one.', answer: 'A' },
        { id: 'q28', textHtml: 'Placeholder classification statement two.', answer: 'B' },
        { id: 'q29', textHtml: 'Placeholder classification statement three.', answer: 'C' },
        { id: 'q30', textHtml: 'Placeholder classification statement four.', answer: 'A' },
        { id: 'q31', textHtml: 'Placeholder classification statement five.', answer: 'C' },
        { id: 'q32', textHtml: 'Placeholder classification statement six.', answer: 'B' },
        { id: 'q33', textHtml: 'Placeholder classification statement seven.', answer: 'A' },
        { id: 'q34', textHtml: 'Placeholder classification statement eight.', answer: 'C' },
      ],
    },
    {
      title: 'Questions 35–39',
      type: 'diagram-labelling',
      instructionHtml: "Label the diagram. Choose <strong>NO MORE THAN TWO WORDS</strong> from the passage for each pin.",
      diagram: {
        image: '/pics/reading/ant-diagram.png',
        alt: 'Side profile of an ant with numbered pins on its body parts',
        markers: [
          { x: 76, y: 36 },
          { x: 51, y: 41 },
          { x: 20, y: 29 },
          { x: 19, y: 55 },
          { x: 90, y: 57 },
        ],
      },
      questions: [
        { id: 'q35', answer: ['exoskeleton'] },
        { id: 'q36', answer: ['thorax'] },
        { id: 'q37', answer: ['antennae'] },
        { id: 'q38', answer: ['mandibles'] },
        { id: 'q39', answer: ['stinger', 'abdominal stinger'] },
      ],
    },
    {
      title: 'Question 40',
      type: 'tfng',
      instructionHtml: 'Do the following statement agree with the information in the passage? Write <strong>True</strong>, <strong>False</strong> or <strong>Not Given</strong>.',
      questions: [
        { id: 'q40', textHtml: "An ant's antennae are described as elbowed.", answer: 'True' },
      ],
    },
  ],
};

export const readingFull001: PracticeTest = {
  id: 'reading-full-001',
  skill: 'reading',
  title: 'Academic Reading — Full Test 1',
  description: 'A complete 60-minute Academic Reading exam: three passages, 40 questions, every question type. Passage 1 is finished; Passages 2–3 are placeholders pending real material.',
  durationMinutes: 60,
  parts: [passage1, passage2, passage3],
};
