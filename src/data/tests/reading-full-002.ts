import type { PracticeTest, TestPart } from '../../lib/tests/schema';

/* Academic Reading — Full Test 2. Original material. Weighted like the real
   exam (TFNG/MC/completion/matching-heavy, no diagram) and exercising the
   newer types: Yes/No/Not Given, matching features, multiple-answer, and
   matching sentence endings. */

// ── Passage 1 — The Origins of Writing (Q1–13) ──────────────────────────────
const passage1: TestPart = {
  label: 'Passage 1',
  stimulus: {
    kind: 'passage',
    label: 'Reading Passage 1',
    title: 'The Origins of Writing',
    instructionHtml:
      'You should spend about 20 minutes on <strong>Questions 1–13</strong>, which are based on Reading Passage 1 below.',
    paragraphs: [
      { label: 'A', html: 'Writing is one of humanity’s most powerful inventions, yet for most of our history people managed without it. For tens of thousands of years, knowledge was carried entirely in memory and passed on by word of mouth. The earliest known writing did not appear until around 5,000 years ago, and when it did, it was invented not to record poetry or history but to keep track of trade.' },
      { label: 'B', html: 'The first true writing system emerged in Mesopotamia, the fertile region between the Tigris and Euphrates rivers. As cities grew and commerce became more complex, merchants and officials needed a reliable way to record how much grain had been stored or how many animals had been traded. They began pressing marks into wet clay tablets with a reed, producing the wedge-shaped script known as cuneiform. At first these marks were simple pictures, but over time they became abstract symbols standing for sounds as well as objects.' },
      { label: 'C', html: 'A separate system, hieroglyphics, developed in ancient Egypt at roughly the same time. Egyptian scribes carved elaborate picture-signs onto temple walls and wrote more quickly on papyrus, a paper-like material made from a river plant. Because learning hundreds of signs took years of training, literacy was restricted to a small class of professional scribes, who enjoyed high status and were exempt from manual labour and taxes.' },
      { label: 'D', html: 'Writing was invented independently in other parts of the world too. In China, the earliest examples appear on so-called oracle bones — the shoulder blades of oxen and the shells of turtles used to predict the future. In Central America, the Maya developed a sophisticated script long before Europeans arrived. The fact that writing arose separately in several places suggests that it is a natural response to the demands of complex, organised societies.' },
      { label: 'E', html: 'The invention that made writing truly accessible, however, was the alphabet. Earlier systems required memorising huge numbers of signs, but an alphabet represents the individual sounds of a language with a small set of letters — usually fewer than thirty. The first alphabets were created by Semitic-speaking peoples in the Middle East and later refined by the Phoenicians, whose trading ships carried the idea around the Mediterranean. The Greeks adapted it by adding signs for vowels, and from the Greek alphabet descend most of the scripts used in Europe today.' },
      { label: 'F', html: 'The consequences of writing are difficult to overstate. It allowed laws to be recorded, knowledge to be stored and transmitted across generations, and ideas to travel far beyond the people who first thought of them. Without it, the accumulation of learning on which every later civilisation depended would have been impossible.' },
    ],
  },
  groups: [
    {
      title: 'Questions 1–5',
      type: 'paragraph-matching',
      options: ['A', 'B', 'C', 'D', 'E', 'F'],
      instructionHtml:
        'Reading Passage 1 has six paragraphs, <strong>A–F</strong>. Which paragraph contains the following information?',
      questions: [
        { id: 'q1', textHtml: 'the original practical purpose of writing', answer: 'A' },
        { id: 'q2', textHtml: 'a description of a wedge-shaped script', answer: 'B' },
        { id: 'q3', textHtml: 'a writing system used to foretell the future', answer: 'D' },
        { id: 'q4', textHtml: 'how the idea of the alphabet was carried around the Mediterranean', answer: 'E' },
        { id: 'q5', textHtml: 'the wide-ranging effects of writing on civilisation', answer: 'F' },
      ],
    },
    {
      title: 'Questions 6–9',
      type: 'sentence-completion',
      instructionHtml: 'Complete the sentences. Choose <strong>NO MORE THAN TWO WORDS</strong> from the passage for each answer.',
      questions: [
        { id: 'q6', before: 'The earliest writing appeared roughly', after: 'years ago.', answer: ['5,000', 'five thousand'] },
        { id: 'q7', before: 'In Mesopotamia, marks were pressed into wet', after: 'tablets.', answer: 'clay' },
        { id: 'q8', before: 'Egyptian scribes wrote on', after: ', made from a river plant.', answer: 'papyrus' },
        { id: 'q9', before: 'The Greeks improved the alphabet by adding signs for', after: '.', answer: 'vowels' },
      ],
    },
    {
      title: 'Questions 10–13',
      type: 'tfng',
      instructionHtml:
        'Do the following statements agree with the information in Reading Passage 1? Write <strong>True</strong>, <strong>False</strong> or <strong>Not Given</strong>.',
      questions: [
        { id: 'q10', textHtml: 'Writing was originally created to record poetry and history.', answer: 'False' },
        { id: 'q11', textHtml: 'Egyptian scribes paid higher taxes than other workers.', answer: 'False' },
        { id: 'q12', textHtml: 'The Maya script was more advanced than Egyptian hieroglyphics.', answer: 'Not Given' },
        { id: 'q13', textHtml: 'Most scripts used in Europe today come from the Greek alphabet.', answer: 'True' },
      ],
    },
  ],
};

// ── Passage 2 — Why We Sleep (Q14–26) ───────────────────────────────────────
const passage2: TestPart = {
  label: 'Passage 2',
  stimulus: {
    kind: 'passage',
    label: 'Reading Passage 2',
    title: 'Why We Sleep',
    instructionHtml:
      'You should spend about 20 minutes on <strong>Questions 14–26</strong>, which are based on Reading Passage 2 below.',
    paragraphs: [
      { label: 'A', html: 'Everyone sleeps, and we spend roughly a third of our lives doing it, yet for centuries sleep was dismissed as little more than a period of inactivity — a time when the body simply switched off. Modern science has overturned that view completely. Far from being idle, the sleeping brain is intensely busy, and the work it does is essential to health, memory and mood.' },
      { label: 'B', html: 'Sleep is not a single uniform state but a cycle of distinct stages that repeat through the night. In the deepest stage, brain waves slow dramatically and the body carries out much of its physical repair. This alternates with a very different phase called REM sleep, in which the brain becomes almost as active as when awake and the eyes dart rapidly beneath closed lids. A full cycle lasts about ninety minutes, and a healthy sleeper passes through several each night.' },
      { label: 'C', html: 'One of the most important discoveries of recent decades is the role of sleep in memory. The psychologist Robert Stickgold has shown that skills learned during the day improve overnight, even without further practice, as if the brain rehearses them during sleep. His experiments found that people who slept after learning a task performed markedly better than those kept awake, suggesting that sleep does not merely preserve memories but actively strengthens them.' },
      { label: 'D', html: 'Sleep also cleans the brain. The neuroscientist Maiken Nedergaard discovered that during sleep the spaces between brain cells widen, allowing fluid to flush out waste products that build up during waking hours. Some of these products are linked to diseases such as Alzheimer’s, which has led researchers to suspect that poor sleep over many years may raise the risk of dementia.' },
      { label: 'E', html: 'The purpose of dreaming remains more mysterious. The sleep scientist Matthew Walker argues that REM sleep helps the brain process difficult emotions, taking the sharp edge off painful memories so that we wake better able to cope. Others are less certain, and some believe dreams are simply a by-product of the brain’s nightly activity with no function of their own.' },
      { label: 'F', html: 'What is beyond dispute is that going without sleep is dangerous. After even one poor night, concentration and judgement decline sharply. Chronic sleep loss has been linked to weakened immunity, weight gain, high blood pressure and depression. The economist Jan Vandekerckhove has estimated that tiredness among workers costs the global economy hundreds of billions of dollars each year through accidents and lost productivity.' },
      { label: 'G', html: 'Despite all this evidence, people are sleeping less than they once did. Artificial light, long working hours and above all the glow of screens late at night all interfere with the body’s natural rhythms. Scientists increasingly warn that a society which treats sleep as a luxury, or even a weakness, is storing up serious problems for the future.' },
    ],
  },
  groups: [
    {
      title: 'Questions 14–19',
      type: 'matching-headings',
      instructionHtml:
        'Reading Passage 2 has seven paragraphs, A–G. Choose the correct heading for paragraphs <strong>B–G</strong>. (Paragraph A is an introduction.)',
      legendHtml:
        '<strong>List of Headings</strong><br>i&nbsp; How sleep strengthens what we learn<br>ii&nbsp; Sleep in the animal kingdom<br>iii&nbsp; The different stages of a night’s sleep<br>iv&nbsp; The best time of day to sleep<br>v&nbsp; Clearing harmful waste from the brain<br>vi&nbsp; The uncertain purpose of dreaming<br>vii&nbsp; The dangers of going without sleep<br>viii&nbsp; Why we now sleep less than before<br>ix&nbsp; How much sleep we really need',
      options: ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix'],
      questions: [
        { id: 'q14', textHtml: 'Paragraph B', answer: 'iii' },
        { id: 'q15', textHtml: 'Paragraph C', answer: 'i' },
        { id: 'q16', textHtml: 'Paragraph D', answer: 'v' },
        { id: 'q17', textHtml: 'Paragraph E', answer: 'vi' },
        { id: 'q18', textHtml: 'Paragraph F', answer: 'vii' },
        { id: 'q19', textHtml: 'Paragraph G', answer: 'viii' },
      ],
    },
    {
      title: 'Questions 20–22',
      type: 'multiple-choice',
      instructionHtml: 'Choose the correct letter, <strong>A</strong>, <strong>B</strong>, <strong>C</strong> or <strong>D</strong>.',
      questions: [
        { id: 'q20', textHtml: 'During REM sleep, the brain is', options: ['completely inactive.', 'almost as active as when awake.', 'busy repairing the body.', 'free of all waste.'], answer: 'B' },
        { id: 'q21', textHtml: 'According to Nedergaard, what happens between brain cells during sleep?', options: ['They shrink permanently.', 'Gaps widen so that waste can be removed.', 'New cells are formed.', 'Fluid stops flowing.'], answer: 'B' },
        { id: 'q22', textHtml: 'What does the passage say about the purpose of dreams?', options: ['It is now fully understood.', 'Scientists disagree about it.', 'Dreams have no effect on emotion.', 'Only one scientist has studied it.'], answer: 'B' },
      ],
    },
    {
      title: 'Questions 23–26',
      type: 'matching-features',
      instructionHtml: 'Match each finding with the correct researcher. Write the correct letter, A–D.',
      legendHtml:
        '<strong>A</strong>&nbsp; Robert Stickgold &nbsp;·&nbsp; <strong>B</strong>&nbsp; Maiken Nedergaard &nbsp;·&nbsp; <strong>C</strong>&nbsp; Matthew Walker &nbsp;·&nbsp; <strong>D</strong>&nbsp; Jan Vandekerckhove',
      options: ['A', 'B', 'C', 'D'],
      questions: [
        { id: 'q23', textHtml: 'Sleep may reduce the emotional pain of bad memories.', answer: 'C' },
        { id: 'q24', textHtml: 'A lack of sleep is very costly to the economy.', answer: 'D' },
        { id: 'q25', textHtml: 'Sleeping after learning improves later performance.', answer: 'A' },
        { id: 'q26', textHtml: 'Sleep removes substances connected to brain disease.', answer: 'B' },
      ],
    },
  ],
};

// ── Passage 3 — The Value of Space Exploration (Q27–40) ─────────────────────
const passage3: TestPart = {
  label: 'Passage 3',
  stimulus: {
    kind: 'passage',
    label: 'Reading Passage 3',
    title: 'The Value of Space Exploration',
    instructionHtml:
      'You should spend about 20 minutes on <strong>Questions 27–40</strong>, which are based on Reading Passage 3 below.',
    paragraphs: [
      { label: 'A', html: 'Every few years, when the cost of a space mission is announced, the same objection is raised: why spend billions exploring other worlds when so many problems remain unsolved on our own? It is a reasonable question, and it deserves a better answer than the ones usually given. In my view, the case for space exploration is strong — but not for the reasons most often put forward.' },
      { label: 'B', html: 'The most common defence is that space research produces useful inventions. Supporters point to satellite navigation, weather forecasting and countless medical devices that grew out of space programmes. This is true, but it is also a weak argument, because almost any well-funded research would produce useful spin-offs. If practical inventions were the only goal, the money would be better spent on them directly.' },
      { label: 'C', html: 'A stronger justification is scientific. Studying other planets tells us things about our own that we could learn in no other way. The thick atmosphere of Venus, for instance, is a natural warning about the runaway greenhouse effect, while the dead, radiation-blasted surface of Mars shows what can happen to a world that loses its magnetic field. Understanding these processes elsewhere helps us understand the fragile conditions that make life on Earth possible.' },
      { label: 'D', html: 'There is also an argument from survival. Some, including several prominent scientists, insist that humanity must eventually spread beyond Earth if it is to survive long-term threats such as asteroid impacts or its own mistakes. I am less persuaded by this. Building a self-sufficient colony on Mars is so difficult that it is no substitute for looking after the planet we already have, and treating space as an escape route may even weaken our resolve to solve problems at home.' },
      { label: 'E', html: 'The best reason, I believe, is the least practical one. Exploration answers a deep human need to understand our place in the universe — the same need that drove earlier people to cross oceans and map continents. The discovery that our galaxy contains billions of other worlds, some of which may harbour life, is among the most profound in history. To turn away from that question because it does not immediately pay for itself would be to sell short something essential about what it means to be human.' },
      { label: 'F', html: 'None of this means we should spend without limit, or ignore urgent needs on Earth. But the choice is not really between space and everything else; the sums involved are tiny compared with what governments spend on far less inspiring things. A civilisation that can afford to look outward, and chooses not to, has lost something more valuable than money.' },
    ],
  },
  groups: [
    {
      title: 'Questions 27–31',
      type: 'yes-no-notgiven',
      instructionHtml:
        'Do the following statements agree with the views of the writer in Reading Passage 3? Write <strong>Yes</strong>, <strong>No</strong> or <strong>Not Given</strong>.',
      questions: [
        { id: 'q27', textHtml: 'The usefulness of space inventions is the best argument for exploration.', answer: 'No' },
        { id: 'q28', textHtml: 'Studying other planets can teach us about the Earth.', answer: 'Yes' },
        { id: 'q29', textHtml: 'Humanity should treat Mars as a place to escape to.', answer: 'No' },
        { id: 'q30', textHtml: 'Governments spend too much on space compared with the military.', answer: 'Not Given' },
        { id: 'q31', textHtml: 'The desire to explore is a fundamental part of being human.', answer: 'Yes' },
      ],
    },
    {
      title: 'Questions 32–36',
      type: 'multiple-answer',
      instructionHtml:
        'Which <strong>FIVE</strong> of the following are mentioned in the passage as benefits of space research or things it can teach us? Choose five.',
      selectCount: 5,
      choices: [
        { value: 'A', label: 'satellite navigation systems' },
        { value: 'B', label: 'improved weather forecasting' },
        { value: 'C', label: 'new medical devices' },
        { value: 'D', label: 'a warning about the greenhouse effect from Venus' },
        { value: 'E', label: 'the discovery of water on the Moon' },
        { value: 'F', label: 'what happens when a planet loses its magnetic field' },
        { value: 'G', label: 'faster international air travel' },
        { value: 'H', label: 'a cure for a specific disease' },
      ],
      questions: [
        { id: 'q32', answer: ['A', 'B', 'C', 'D', 'F'] },
        { id: 'q33', answer: ['A', 'B', 'C', 'D', 'F'] },
        { id: 'q34', answer: ['A', 'B', 'C', 'D', 'F'] },
        { id: 'q35', answer: ['A', 'B', 'C', 'D', 'F'] },
        { id: 'q36', answer: ['A', 'B', 'C', 'D', 'F'] },
      ],
    },
    {
      title: 'Questions 37–40',
      type: 'sentence-endings',
      instructionHtml: 'Complete each sentence with the correct ending. Write the correct letter, A–F.',
      legendHtml:
        '<strong>A</strong>&nbsp; a weak way to defend space exploration.<br><strong>B</strong>&nbsp; a warning about the greenhouse effect.<br><strong>C</strong>&nbsp; colonising Mars could ensure humanity’s survival.<br><strong>D</strong>&nbsp; the human need to understand the universe.<br><strong>E</strong>&nbsp; cheaper than most military spending.<br><strong>F</strong>&nbsp; impossible without international cooperation.',
      options: ['A', 'B', 'C', 'D', 'E', 'F'],
      questions: [
        { id: 'q37', textHtml: 'The writer thinks that pointing to practical inventions is', answer: 'A' },
        { id: 'q38', textHtml: 'The thick atmosphere of Venus serves as', answer: 'B' },
        { id: 'q39', textHtml: 'The writer is not convinced that', answer: 'C' },
        { id: 'q40', textHtml: 'For the writer, the strongest reason to explore space is', answer: 'D' },
      ],
    },
  ],
};

export const readingFull002: PracticeTest = {
  id: 'reading-full-002',
  skill: 'reading',
  title: 'Academic Reading — Full Test 2',
  description: 'A complete 60-minute Academic Reading exam: three passages on writing, sleep and space exploration, 40 questions across the full range of exam question types.',
  durationMinutes: 60,
  parts: [passage1, passage2, passage3],
};
