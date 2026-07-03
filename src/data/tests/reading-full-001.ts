import type { PracticeTest, TestPart } from '../../lib/tests/schema';

/* Academic Reading — Full Test 1. Original material written for this site
   (public-domain facts, original wording). 3 passages, 40 questions,
   all seven question types. This is the polished template other tests copy. */

// ── Passage 1 — The Story of Tea (Q1–13) ────────────────────────────────────
const passage1: TestPart = {
  label: 'Passage 1',
  stimulus: {
    kind: 'passage',
    label: 'Reading Passage 1',
    title: 'The Story of Tea',
    instructionHtml:
      'You should spend about 20 minutes on <strong>Questions 1–13</strong>, which are based on Reading Passage 1 below.',
    paragraphs: [
      { label: 'A', html: 'Tea is, after water, the most widely consumed drink in the world, yet its origins lie in a single region of south-west China. According to Chinese legend, the drink was discovered by accident in 2737 BC when leaves from a wild bush drifted into water being boiled by the emperor Shen Nung. Whatever the truth of the story, botanists agree that the tea plant, <em>Camellia sinensis</em>, is native to the area where China, Myanmar and India meet, and that people there were brewing its leaves long before written records began.' },
      { label: 'B', html: 'For many centuries tea remained an almost exclusively Chinese habit. It was valued not only as a pleasant drink but as a medicine, and by the time of the Tang dynasty it had become the national beverage. A scholar named Lu Yu wrote the first known book devoted entirely to tea, describing how it should be grown, prepared and served. Tea drinking spread from China to Japan through Buddhist monks, who used it to stay awake during long hours of meditation, and there it eventually developed into the elaborate ritual known as the tea ceremony.' },
      { label: 'C', html: 'Europe knew nothing of tea until the seventeenth century, when Portuguese and Dutch traders began shipping small quantities from the East. It was expensive and regarded as a luxury for the wealthy. In Britain, tea was popularised partly through royal fashion: when the Portuguese princess Catherine of Braganza married Charles II in 1662, she brought her taste for the drink to the English court, and the aristocracy quickly followed her example. Demand grew so rapidly that within a century tea had become central to British social life.' },
      { label: 'D', html: 'The British enthusiasm for tea had consequences far beyond the dining table. Because all tea came from China, and China would accept only silver in payment, Britain found itself losing vast amounts of the precious metal. To reverse this, British merchants began selling opium grown in India to Chinese buyers — a trade that eventually led to war. Britain also sought to break China’s monopoly by growing tea elsewhere. In the 1830s it established plantations in the Indian region of Assam, using plants smuggled out of China, and within decades India had overtaken China as the world’s leading producer.' },
      { label: 'E', html: 'Today tea is grown in more than forty countries, from Kenya to Argentina, and is drunk in dozens of different ways — with milk in Britain, with mint in Morocco, with butter in Tibet. Despite its journey across the globe and the many forms it now takes, every cup can still be traced back to the same modest evergreen shrub that grew wild on the hillsides of ancient China.' },
    ],
  },
  groups: [
    {
      title: 'Questions 1–4',
      type: 'paragraph-matching',
      options: ['A', 'B', 'C', 'D', 'E'],
      instructionHtml:
        'Reading Passage 1 has five paragraphs, <strong>A–E</strong>. Which paragraph contains the following information? You may use any letter more than once.',
      questions: [
        { id: 'q1', textHtml: 'how a member of royalty helped to make tea fashionable', answer: 'C' },
        { id: 'q2', textHtml: 'an explanation of how tea led to a military conflict', answer: 'D' },
        { id: 'q3', textHtml: 'the many different ways in which tea is consumed today', answer: 'E' },
        { id: 'q4', textHtml: 'a reference to the first book ever written about tea', answer: 'B' },
      ],
    },
    {
      title: 'Questions 5–8',
      type: 'sentence-completion',
      instructionHtml:
        'Complete the sentences below. Choose <strong>NO MORE THAN TWO WORDS</strong> from the passage for each answer.',
      questions: [
        { id: 'q5', before: 'The tea plant is native to the region where China, Myanmar and', after: 'meet.', answer: 'India' },
        { id: 'q6', before: 'By the Tang dynasty, tea had become the national', after: 'of China.', answer: ['beverage', 'drink'] },
        { id: 'q7', before: 'Tea did not reach Europe until the', after: 'century.', answer: 'seventeenth' },
        { id: 'q8', before: 'Britain established tea plantations in the Indian region of', after: '.', answer: 'Assam' },
      ],
    },
    {
      title: 'Questions 9–13',
      type: 'tfng',
      instructionHtml:
        'Do the following statements agree with the information in Reading Passage 1? Write <strong>True</strong>, <strong>False</strong> or <strong>Not Given</strong>.',
      questions: [
        { id: 'q9', textHtml: 'Botanists have proven that the legend of Shen Nung is historically accurate.', answer: 'False' },
        { id: 'q10', textHtml: 'People in China were drinking tea before written records existed.', answer: 'True' },
        { id: 'q11', textHtml: "Lu Yu's book described the medical benefits of tea in detail.", answer: 'Not Given' },
        { id: 'q12', textHtml: 'Tea was cheap and widely available when it first arrived in Europe.', answer: 'False' },
        { id: 'q13', textHtml: 'Within a few decades of the 1830s, India was producing more tea than China.', answer: 'True' },
      ],
    },
  ],
};

// ── Passage 2 — Anatomy of a Flowering Plant (Q14–26) ───────────────────────
const passage2: TestPart = {
  label: 'Passage 2',
  stimulus: {
    kind: 'passage',
    label: 'Reading Passage 2',
    title: 'The Anatomy of a Flowering Plant',
    instructionHtml:
      'You should spend about 20 minutes on <strong>Questions 14–26</strong>, which are based on Reading Passage 2 below.',
    paragraphs: [
      { label: 'A', html: 'A flowering plant is a living system in which every part has a job to do. Although species differ enormously in size and shape — from tiny daisies to climbing roses — most share the same basic set of organs: roots, a stem, leaves and a flower. Understanding what each part does makes it easier to see how the plant as a whole survives, grows and reproduces.' },
      { label: 'B', html: 'Beneath the soil lie the roots. Their first task is to anchor the plant firmly in the ground so that wind and rain cannot easily dislodge it. Just as importantly, roots draw up water and dissolved minerals from the soil, which the plant needs in order to build new tissue. In many plants the roots also serve as a store of food, holding reserves of sugar that the plant can draw on when growing conditions are poor.' },
      { label: 'C', html: 'Rising from the roots is the stem, the plant’s central support. The stem holds the leaves up towards the light and carries the flower to where insects and the wind can reach it. Inside the stem run narrow tubes that work like a plumbing system, carrying water upward from the roots and distributing the sugars made in the leaves to wherever they are needed. In woody plants such as the rose, the stem is also armed with sharp thorns, which discourage animals from eating it.' },
      { label: 'D', html: 'The broad, flat leaves are the plant’s food factories. Their green colour comes from a pigment called chlorophyll, which captures energy from sunlight. Using this energy, the leaf combines water and carbon dioxide to produce sugar, releasing oxygen as a by-product. This process, known as photosynthesis, is the source of almost all the food on which life on Earth depends.' },
      { label: 'E', html: 'At the tip of the stem sits the flower, the plant’s reproductive organ. Its brightly coloured petals are not merely decorative: their purpose is to attract insects and birds. Around the base of the petals are small green structures called sepals, which protected the flower while it was still a bud. Deep inside the flower are the parts that make seeds, and it is here that reproduction begins.' },
      { label: 'F', html: 'Reproduction depends on pollination — the transfer of pollen from one flower to another. When a bee lands on a bloom to feed on its sweet nectar, grains of pollen stick to its body. As the bee moves to the next flower, some of this pollen rubs off, fertilising the plant so that it can form seeds. In this way insects and plants come to depend on one another: the insect gains food, and the plant gains a means of reproducing.' },
    ],
  },
  groups: [
    {
      title: 'Questions 14–18',
      type: 'matching-headings',
      instructionHtml:
        'Reading Passage 2 has six paragraphs, A–F. Choose the correct heading for paragraphs <strong>B–F</strong> from the list of headings below. (Paragraph A is an introduction.)',
      legendHtml:
        '<strong>List of Headings</strong><br>i&nbsp;&nbsp; How the plant makes its own food<br>ii&nbsp; The many medical uses of flowers<br>iii&nbsp; Holding the plant firm and feeding it<br>iv&nbsp; The support that carries and defends the plant<br>v&nbsp;&nbsp; Attracting visitors to the flower<br>vi&nbsp; Differences between wild and garden plants<br>vii&nbsp; How new plants are created<br>viii&nbsp; Why some plants live longer than others',
      options: ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii'],
      questions: [
        { id: 'q14', textHtml: 'Paragraph B', answer: 'iii' },
        { id: 'q15', textHtml: 'Paragraph C', answer: 'iv' },
        { id: 'q16', textHtml: 'Paragraph D', answer: 'i' },
        { id: 'q17', textHtml: 'Paragraph E', answer: 'v' },
        { id: 'q18', textHtml: 'Paragraph F', answer: 'vii' },
      ],
    },
    {
      title: 'Questions 19–23',
      type: 'diagram-labelling',
      instructionHtml:
        'Label the diagram below. Choose <strong>ONE WORD ONLY</strong> from the passage for each pin.',
      diagram: {
        image: '/pics/reading/rose-diagram.png',
        alt: 'Side view of a rose plant with numbered pins on its parts',
        markers: [
          { x: 52, y: 17 }, // 19 petals — bloom
          { x: 40, y: 41 }, // 20 sepals — green structures below bloom
          { x: 36, y: 62 }, // 21 leaf — on the stem
          { x: 52, y: 72 }, // 22 stem — central support
          { x: 57, y: 81 }, // 23 thorn — on lower stem
        ],
      },
      questions: [
        { id: 'q19', answer: ['petals', 'petal'] },
        { id: 'q20', answer: ['sepals', 'sepal'] },
        { id: 'q21', answer: ['leaf', 'leaves'] },
        { id: 'q22', answer: 'stem' },
        { id: 'q23', answer: ['thorn', 'thorns'] },
      ],
    },
    {
      title: 'Questions 24–26',
      type: 'multiple-choice',
      instructionHtml: 'Choose the correct letter, <strong>A</strong>, <strong>B</strong>, <strong>C</strong> or <strong>D</strong>.',
      questions: [
        {
          id: 'q24',
          textHtml: 'According to the passage, one function of a plant’s roots is to',
          options: ['capture energy from sunlight.', 'store food for the plant.', 'produce pollen.', 'attract insects.'],
          answer: 'B',
        },
        {
          id: 'q25',
          textHtml: 'Which of the following does photosynthesis release as a by-product?',
          options: ['water', 'chlorophyll', 'oxygen', 'nectar'],
          answer: 'C',
        },
        {
          id: 'q26',
          textHtml: 'How do bees help a plant to reproduce?',
          options: ['by eating harmful insects', 'by carrying pollen between flowers', 'by protecting the buds', 'by producing nectar'],
          answer: 'B',
        },
      ],
    },
  ],
};

// ── Passage 3 — The Four-Day Week (Q27–40) ──────────────────────────────────
const passage3: TestPart = {
  label: 'Passage 3',
  stimulus: {
    kind: 'passage',
    label: 'Reading Passage 3',
    title: 'Rethinking the Working Week',
    instructionHtml:
      'You should spend about 20 minutes on <strong>Questions 27–40</strong>, which are based on Reading Passage 3 below.',
    paragraphs: [
      { label: 'A', html: 'The idea that people might work four days a week instead of five, with no loss of pay, has moved from the fringes of economic thinking into mainstream debate. Trials have taken place in Iceland, Japan and Britain, and their results have been claimed by both supporters and doubters as evidence for their case. What was once dismissed as unrealistic is now being tested by real companies on real employees.' },
      { label: 'B', html: 'Among the strongest advocates is Andrew Barnes, a New Zealand businessman who introduced a four-day week at his own firm. Barnes argues that the traditional five-day week is a relic of the industrial age and bears no relation to how much useful work people actually do. In his experience, staff who were given an extra day off became noticeably more focused during the hours they did work, so that overall output did not fall. He also insists that shorter weeks reduce the stress and exhaustion that cause employees to leave, saving companies the heavy cost of hiring and training replacements.' },
      { label: 'C', html: 'Not everyone is convinced. Marta Ruiz, an economist, warns that the encouraging results of early trials may be misleading. The companies that volunteer for such experiments, she points out, tend to be office-based businesses whose output is easy to reorganise. A hospital, a farm or a factory cannot simply close for an extra day, and Ruiz doubts that the model can be applied across the whole economy. She also questions whether the productivity gains reported in trials would survive once the novelty had worn off.' },
      { label: 'D', html: 'A different concern comes from Tom Fielding, a sociologist who studies the boundary between work and private life. Fielding does not oppose the four-day week in principle, but he cautions that compressing the same workload into fewer days can leave employees more tired, not less. If people simply work longer hours on their four days, he argues, the promised improvement in wellbeing may never appear. For Fielding, the length of the week matters less than the total quantity of work that is expected.' },
      { label: 'E', html: 'What almost everyone agrees on is that the way we work is changing. The spread of remote working, the automation of routine tasks and a growing concern for mental health have all made people question long-held assumptions about the working week. Whether or not the four-day model becomes standard, the debate it has provoked is unlikely to fade.' },
    ],
  },
  groups: [
    {
      title: 'Questions 27–32',
      type: 'categorisation',
      instructionHtml: 'Look at the following opinions and the list of people below. Match each opinion to the person who expresses it.',
      legendHtml:
        '<strong>A</strong>&nbsp; Andrew Barnes &nbsp;·&nbsp; <strong>B</strong>&nbsp; Marta Ruiz &nbsp;·&nbsp; <strong>C</strong>&nbsp; Tom Fielding',
      options: ['A', 'B', 'C'],
      questions: [
        { id: 'q27', textHtml: 'The benefits seen in trials may disappear once employees get used to the change.', answer: 'B' },
        { id: 'q28', textHtml: 'A shorter week helps businesses to keep their existing staff.', answer: 'A' },
        { id: 'q29', textHtml: 'The total amount of work matters more than the number of days worked.', answer: 'C' },
        { id: 'q30', textHtml: 'Many kinds of workplace could not adopt the four-day model.', answer: 'B' },
        { id: 'q31', textHtml: 'The five-day week no longer reflects how much people really achieve.', answer: 'A' },
        { id: 'q32', textHtml: 'Employees might end up more exhausted under the new system.', answer: 'C' },
      ],
    },
    {
      title: 'Questions 33–36',
      type: 'tfng',
      instructionHtml:
        'Do the following statements agree with the information in Reading Passage 3? Write <strong>True</strong>, <strong>False</strong> or <strong>Not Given</strong>.',
      questions: [
        { id: 'q33', textHtml: 'Four-day-week trials have been held in more than one country.', answer: 'True' },
        { id: 'q34', textHtml: 'Barnes introduced the four-day week after reading about trials in other countries.', answer: 'Not Given' },
        { id: 'q35', textHtml: 'Ruiz believes office-based companies find it easier to reorganise their work.', answer: 'True' },
        { id: 'q36', textHtml: 'Fielding is completely opposed to the idea of a four-day week.', answer: 'False' },
      ],
    },
    {
      title: 'Questions 37–40',
      type: 'multiple-choice',
      instructionHtml: 'Choose the correct letter, <strong>A</strong>, <strong>B</strong>, <strong>C</strong> or <strong>D</strong>.',
      questions: [
        {
          id: 'q37',
          textHtml: 'According to Barnes, why did output not fall when staff worked fewer days?',
          options: ['The company hired extra workers.', 'Employees became more focused.', 'Employees worked from home.', 'Routine tasks were automated.'],
          answer: 'B',
        },
        {
          id: 'q38',
          textHtml: 'What does Ruiz doubt about the results of the trials?',
          options: ['that they were measured correctly', 'that they can apply to the whole economy', 'that employees enjoyed them', 'that they saved any money'],
          answer: 'B',
        },
        {
          id: 'q39',
          textHtml: 'According to Fielding, what could cancel out the benefits of a four-day week?',
          options: ['working longer hours on fewer days', 'taking a second job', 'a reduction in pay', 'less contact with colleagues'],
          answer: 'A',
        },
        {
          id: 'q40',
          textHtml: 'What does the writer suggest in the final paragraph?',
          options: ['The four-day week will certainly become standard.', 'The debate about how we work will continue either way.', 'Remote working should be discouraged.', 'Automation has largely failed.'],
          answer: 'B',
        },
      ],
    },
  ],
};

export const readingFull001: PracticeTest = {
  id: 'reading-full-001',
  skill: 'reading',
  title: 'Academic Reading — Full Test 1',
  description: 'A complete 60-minute Academic Reading exam: three passages, 40 questions, every question type — from True/False/Not Given to diagram labelling.',
  durationMinutes: 60,
  parts: [passage1, passage2, passage3],
};
