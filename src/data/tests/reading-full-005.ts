import type { PracticeTest, TestPart } from '../../lib/tests/schema';

/* Academic Reading — Full Test 5. Original material, full exam length,
   realistic type weighting. Includes one diagram-labelling group (honeybee)
   so the type appears in the set without being overused. */

// ── Passage 1 — The Honey Bee (Q1-13) ───────────────────────────────────────
const passage1: TestPart = {
  label: 'Passage 1',
  stimulus: {
    kind: 'passage',
    label: 'Reading Passage 1',
    title: 'The Language of Bees',
    instructionHtml:
      'You should spend about 20 minutes on <strong>Questions 1-13</strong>, which are based on Reading Passage 1 below.',
    paragraphs: [
      { label: 'A', html: 'A honey bee colony is one of the most highly organised societies in the natural world. A single hive may contain fifty thousand bees, nearly all of them female workers, together with one egg-laying queen and, in summer, a few hundred male drones. No single bee is in charge; the queen does not give orders, but simply lays eggs. Yet out of the countless small actions of thousands of individuals, each following simple rules, there emerges a colony that can regulate its own temperature, defend itself, raise its young and gather food with a precision that has astonished scientists for centuries.' },
      { label: 'B', html: 'Like all insects, the body of a worker bee is divided into three main sections. At the front is the head, which carries two long, jointed antennae that serve as the bee’s principal organs of smell and touch, and a pair of large compound eyes. Behind the head is the middle section, the thorax, to which are attached the two pairs of wings and the six legs. At the rear is the abdomen, which contains most of the bee’s internal organs and ends, in the workers, in a sharp sting used to defend the colony. The whole body is covered in fine branched hairs, to which grains of pollen readily cling.' },
      { label: 'C', html: 'The bee’s most famous task is the gathering of nectar and pollen from flowers. A worker may visit many hundreds of flowers on a single trip, sucking up nectar through a long tongue and packing pollen into special baskets on her hind legs. Back at the hive, the nectar is passed from bee to bee and slowly thickened into honey, which is stored in the wax cells of the comb as food for the winter. In carrying pollen from flower to flower, the bee also fertilises the plants it visits, and this service, performed without intention, is worth far more to human agriculture than the honey itself.' },
      { label: 'D', html: 'The greatest puzzle, however, was how a colony manages to direct its foragers to the best sources of food, sometimes several kilometres away. The answer, discovered by the Austrian scientist Karl von Frisch in the twentieth century, is one of the most remarkable findings in all of biology. A bee that has found a rich patch of flowers returns to the hive and performs a curious dance on the vertical surface of the comb, and the details of this dance tell the other bees where to fly.' },
      { label: 'E', html: 'For a source close to the hive, the bee performs a simple “round dance”, running in circles, which tells the others only that food is near. For a more distant source, she performs the famous “waggle dance”, running in a straight line while shaking her body, then circling back to repeat it. The direction of the straight run, measured against the vertical, indicates the direction of the food relative to the sun, while the length of the run and the number of waggles indicate how far away it is. Other bees crowd around, feeling the dance in the darkness of the hive, and then fly off in the direction it describes.' },
      { label: 'F', html: 'Von Frisch’s claim that a mere insect could communicate such precise information was at first met with disbelief, but decades of careful experiment have confirmed it beyond doubt. The dance of the bees remains one of the few known examples of a genuine symbolic language outside human beings. A way of referring to something distant and absent, using signs whose meaning is shared by the whole community. In the small, dark world of the hive, evolution has produced a solution to the problem of communication that is, in its way, as elegant as our own.' },
    ],
  },
  groups: [
    {
      title: 'Questions 1-5',
      type: 'diagram-labelling',
      wordLimit: 1,
      instructionHtml:
        'Label the diagram of a worker bee below. Choose <strong>ONE WORD ONLY</strong> from the passage for each pin.',
      diagram: {
        image: '/pics/reading/bee-diagram.png',
        alt: 'Side view of a worker honey bee with numbered pins on its body parts',
        markers: [
          { x: 24, y: 28 }, // 1 antennae
          { x: 31, y: 44 }, // 2 head
          { x: 48, y: 40 }, // 3 thorax
          { x: 55, y: 62 }, // 4 legs
          { x: 82, y: 55 }, // 5 abdomen
        ],
      },
      questions: [
        {
          id: 'q1',
          answer: ['antennae', 'antenna'],
          explanation: 'The two long, jointed feelers on the head are the antennae.',
          evidence: 'the head, which carries two long, jointed antennae that serve as the bee’s principal organs of smell and touch.',
        },
        {
          id: 'q2',
          answer: 'head',
          explanation: 'The front section, carrying the antennae and compound eyes, is the head.',
          evidence: 'At the front is the head, which carries two long, jointed antennae... and a pair of large compound eyes.',
        },
        {
          id: 'q3',
          answer: 'thorax',
          explanation: 'The middle section, to which the wings and legs attach, is the thorax.',
          evidence: 'Behind the head is the middle section, the thorax, to which are attached the two pairs of wings and the six legs.',
        },
        {
          id: 'q4',
          answer: ['legs', 'leg'],
          explanation: 'The six limbs attached to the thorax are the legs.',
          evidence: 'the thorax, to which are attached the two pairs of wings and the six legs.',
        },
        {
          id: 'q5',
          answer: 'abdomen',
          explanation: 'The rear section, holding most internal organs and ending in the sting, is the abdomen.',
          evidence: 'At the rear is the abdomen, which contains most of the bee’s internal organs and ends, in the workers, in a sharp sting.',
        },
      ],
    },
    {
      title: 'Questions 6-9',
      type: 'sentence-completion',
      wordLimit: 2,
      instructionHtml: 'Complete the sentences. Choose <strong>NO MORE THAN TWO WORDS</strong> from the passage for each answer.',
      questions: [
        {
          id: 'q6',
          before: 'Almost all the bees in a hive are female',
          after: '.',
          answer: 'workers',
          explanation: 'Nearly all the bees in a hive are female workers.',
          evidence: 'A single hive may contain fifty thousand bees, nearly all of them female workers.',
        },
        {
          id: 'q7',
          before: 'A bee packs pollen into baskets on its hind',
          after: '.',
          answer: 'legs',
          explanation: 'Pollen is packed into special baskets on the bee’s hind legs.',
          evidence: 'packing pollen into special baskets on her hind legs.',
        },
        {
          id: 'q8',
          before: 'For a source close to the hive, a bee performs a',
          after: 'dance.',
          answer: 'round',
          explanation: 'For a nearby source the bee performs a simple round dance.',
          evidence: 'For a source close to the hive, the bee performs a simple “round dance”, running in circles.',
        },
        {
          id: 'q9',
          before: 'The waggle dance shows direction relative to the',
          after: '.',
          answer: 'sun',
          explanation: 'The direction of the straight run indicates the food’s direction relative to the sun.',
          evidence: 'The direction of the straight run, measured against the vertical, indicates the direction of the food relative to the sun.',
        },
      ],
    },
    {
      title: 'Questions 10-13',
      type: 'tfng',
      instructionHtml:
        'Do the following statements agree with the information in Reading Passage 1? Write <strong>True</strong>, <strong>False</strong> or <strong>Not Given</strong>.',
      questions: [
        {
          id: 'q10',
          textHtml: 'The queen bee directs the work of the colony.',
          answer: 'False',
          explanation: 'The passage says no bee is in charge and the queen does not give orders. She simply lays eggs.',
          evidence: 'No single bee is in charge; the queen does not give orders, but simply lays eggs.',
        },
        {
          id: 'q11',
          textHtml: 'Pollination is worth more to farming than the honey bees produce.',
          answer: 'True',
          explanation: 'The passage says the pollination service is worth far more to agriculture than the honey itself.',
          evidence: 'this service, performed without intention, is worth far more to human agriculture than the honey itself.',
        },
        {
          id: 'q12',
          textHtml: 'Von Frisch’s discovery was immediately accepted by other scientists.',
          answer: 'False',
          explanation: 'His claim was at first met with disbelief. Only later confirmed by experiment.',
          evidence: 'Von Frisch’s claim that a mere insect could communicate such precise information was at first met with disbelief.',
        },
        {
          id: 'q13',
          textHtml: 'Bees can perform the waggle dance in complete darkness.',
          answer: 'True',
          explanation: 'Other bees feel the dance in the darkness of the hive, so it works without light.',
          evidence: 'Other bees crowd around, feeling the dance in the darkness of the hive.',
        },
      ],
    },
  ],
};

// ── Passage 2 — The Material That Changed the World (Q14-26) ─────────────────
const passage2: TestPart = {
  label: 'Passage 2',
  stimulus: {
    kind: 'passage',
    label: 'Reading Passage 2',
    title: 'The Material That Changed the World',
    instructionHtml:
      'You should spend about 20 minutes on <strong>Questions 14-26</strong>, which are based on Reading Passage 2 below.',
    paragraphs: [
      { label: 'A', html: 'It is difficult to imagine modern life without plastic. It is in our phones and our packaging, our clothes and our cars, our hospitals and our homes. Cheap, light, waterproof and endlessly mouldable, it is one of the most useful families of materials ever created. Yet plastic as we know it is barely a century old, and the story of its rise, and of the problems it has brought, is a lesson in how a single invention can transform the world in ways its creators never foresaw.' },
      { label: 'B', html: 'The first fully synthetic plastic was created in 1907 by a Belgian-born chemist, Leo Baekeland, who was searching for a substitute for shellac, a natural resin then used to insulate electrical wiring. The hard, mouldable material he produced, which he called Bakelite, could be shaped into almost any form and did not conduct electricity, catch fire easily or dissolve in common liquids. It was quickly used for everything from telephones to radios to jewellery, and it opened the door to a flood of new synthetic materials in the decades that followed.' },
      { label: 'C', html: 'What all these materials share is their basic structure. A plastic is made of very long molecules called polymers, in which the same small unit is repeated thousands of times, like beads on an immensely long string. It is this chain-like structure that gives plastics their useful combination of strength and flexibility. By varying the units and the way the chains are arranged, chemists can produce materials as different as a soft plastic bag and a rigid pipe, tuning the properties to almost any purpose.' },
      { label: 'D', html: 'The great advantage of plastic (its durability) is also the source of its greatest problem. Because the long polymer chains are so difficult for natural processes to break down, plastic does not rot away as wood or paper does. A plastic bottle discarded today may still exist, in some form, in five hundred years. As production has soared, so has waste, and enormous quantities of discarded plastic now litter the land and, above all, the sea, where it harms wildlife and slowly breaks into tiny fragments that enter the food chain.' },
      { label: 'E', html: 'Solutions are being pursued along several lines at once. Some researchers are developing plastics designed to break down safely, made from plant materials rather than oil. Others focus on recycling, though this is harder than it sounds, since the many different types of plastic must be sorted and cannot easily be mixed. Most promising of all, perhaps, are recently discovered microbes and enzymes that can digest certain plastics, offering the hope that one day our waste might be broken down and its raw materials reused rather than simply buried or burned.' },
      { label: 'F', html: 'The deeper lesson of plastic is about the double edge of technology. The same qualities that make a material wonderfully useful can, at a large enough scale, make it a serious danger, and the full consequences of an invention may take generations to appear. Plastic will not, and probably should not, be abandoned; it is too valuable for that. But its history is a reminder that every powerful new material demands to be handled with a care that its first enthusiastic users rarely imagine.' },
    ],
  },
  groups: [
    {
      title: 'Questions 14-18',
      type: 'matching-headings',
      instructionHtml:
        'Reading Passage 2 has six paragraphs, A-F. Choose the correct heading for paragraphs <strong>B-F</strong>. (Paragraph A is an introduction.)',
      legendHtml:
        '<strong>List of Headings</strong><br>i&nbsp; The problem of a material that lasts<br>ii&nbsp; The first artificial plastic<br>iii&nbsp; A wider lesson about technology<br>iv&nbsp; How plastic is recycled abroad<br>v&nbsp; What plastics are made of<br>vi&nbsp; The search for answers<br>vii&nbsp; The dangers of natural resins<br>viii&nbsp; Plastic in the human body',
      options: ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii'],
      questions: [
        {
          id: 'q14',
          textHtml: 'Paragraph B',
          answer: 'ii',
          explanation: 'Paragraph B describes Baekeland creating Bakelite, the first fully synthetic plastic. Heading ii.',
          evidence: 'The first fully synthetic plastic was created in 1907 by a Belgian-born chemist, Leo Baekeland.',
        },
        {
          id: 'q15',
          textHtml: 'Paragraph C',
          answer: 'v',
          explanation: 'Paragraph C explains what plastics are made of (long polymer chains), heading v.',
          evidence: 'A plastic is made of very long molecules called polymers, in which the same small unit is repeated thousands of times.',
        },
        {
          id: 'q16',
          textHtml: 'Paragraph D',
          answer: 'i',
          explanation: 'Paragraph D is about the problem of a material that lasts (plastic does not rot and becomes waste), heading i.',
          evidence: 'The great advantage of plastic (its durability) is also the source of its greatest problem.',
        },
        {
          id: 'q17',
          textHtml: 'Paragraph E',
          answer: 'vi',
          explanation: 'Paragraph E describes the search for answers: biodegradable plastics, recycling, and plastic-eating microbes. Heading vi.',
          evidence: 'Solutions are being pursued along several lines at once.',
        },
        {
          id: 'q18',
          textHtml: 'Paragraph F',
          answer: 'iii',
          explanation: 'Paragraph F draws the wider lesson about the double edge of technology. Heading iii.',
          evidence: 'The deeper lesson of plastic is about the double edge of technology.',
        },
      ],
    },
    {
      title: 'Questions 19-22',
      type: 'sentence-completion',
      wordLimit: 2,
      instructionHtml: 'Complete the sentences. Choose <strong>NO MORE THAN TWO WORDS</strong> from the passage for each answer.',
      questions: [
        {
          id: 'q19',
          before: 'The first synthetic plastic, called',
          after: ', was made in 1907.',
          answer: 'Bakelite',
          explanation: 'The hard, mouldable material Baekeland produced was called Bakelite.',
          evidence: 'The hard, mouldable material he produced, which he called Bakelite.',
        },
        {
          id: 'q20',
          before: 'Baekeland was looking for a substitute for a natural resin called',
          after: '.',
          answer: 'shellac',
          explanation: 'He was searching for a substitute for shellac, used to insulate wiring.',
          evidence: 'who was searching for a substitute for shellac, a natural resin then used to insulate electrical wiring.',
        },
        {
          id: 'q21',
          before: 'Plastics are made of long molecules known as',
          after: '.',
          answer: 'polymers',
          explanation: 'Plastics are made of very long molecules called polymers.',
          evidence: 'A plastic is made of very long molecules called polymers.',
        },
        {
          id: 'q22',
          before: 'Some scientists are studying microbes and',
          after: 'that can digest plastic.',
          answer: 'enzymes',
          explanation: 'Researchers are studying microbes and enzymes that can digest certain plastics.',
          evidence: 'recently discovered microbes and enzymes that can digest certain plastics.',
        },
      ],
    },
    {
      title: 'Questions 23-26',
      type: 'multiple-choice',
      instructionHtml: 'Choose the correct letter, <strong>A</strong>, <strong>B</strong>, <strong>C</strong> or <strong>D</strong>.',
      questions: [
        {
          id: 'q23',
          textHtml: 'What gives plastics their mix of strength and flexibility?',
          options: ['their colour', 'their chain-like molecular structure', 'the oil they are made from', 'their low cost'],
          answer: 'B',
          explanation: 'It is the long, chain-like polymer structure that gives plastics strength and flexibility.',
          evidence: 'It is this chain-like structure that gives plastics their useful combination of strength and flexibility.',
        },
        {
          id: 'q24',
          textHtml: 'Why does plastic waste last so long?',
          options: ['It is buried too deep.', 'Its polymer chains resist natural breakdown.', 'There is too much of it.', 'It is mixed with metal.'],
          answer: 'B',
          explanation: 'The long polymer chains are hard for natural processes to break down, so plastic does not rot.',
          evidence: 'Because the long polymer chains are so difficult for natural processes to break down, plastic does not rot away as wood or paper does.',
        },
        {
          id: 'q25',
          textHtml: 'One reason recycling plastic is difficult is that',
          options: ['it is too valuable.', 'different types cannot easily be mixed.', 'it breaks down too fast.', 'microbes eat it first.'],
          answer: 'B',
          explanation: 'The many different types of plastic must be sorted and cannot easily be mixed.',
          evidence: 'the many different types of plastic must be sorted and cannot easily be mixed.',
        },
        {
          id: 'q26',
          textHtml: 'The main point of the final paragraph is that',
          options: ['plastic should be banned.', 'useful materials can also be dangerous at scale.', 'plastic has no real uses.', 'technology is always harmful.'],
          answer: 'B',
          explanation: 'The lesson is technology’s double edge: the qualities that make a material useful can make it dangerous at scale.',
          evidence: 'The same qualities that make a material wonderfully useful can, at a large enough scale, make it a serious danger.',
        },
      ],
    },
  ],
};

// ── Passage 3 — Rethinking the Exam (Q27-40) ────────────────────────────────
const passage3: TestPart = {
  label: 'Passage 3',
  stimulus: {
    kind: 'passage',
    label: 'Reading Passage 3',
    title: 'Rethinking the Exam',
    instructionHtml:
      'You should spend about 20 minutes on <strong>Questions 27-40</strong>, which are based on Reading Passage 3 below.',
    paragraphs: [
      { label: 'A', html: 'The written examination, in which candidates sit in silence and answer questions from memory under strict time limits, is so familiar a part of education that it can seem a permanent and natural feature of learning. In fact it is a relatively recent invention, and one that a growing number of educators believe has outlived its usefulness. To understand the debate now surrounding examinations, it helps to remember that they were designed to solve a particular problem, and to ask whether that problem is still the one we face.' },
      { label: 'B', html: 'The modern written exam spread in the nineteenth century, and its great virtue was fairness. Before it, places at universities and posts in the civil service were often handed out through personal connection and privilege. A standardised written test, marked without knowledge of who had written it, offered a way to select people by ability rather than birth. For all its faults, the exam was a genuinely democratic instrument, and in many parts of the world it still performs this function, opening doors to talented students who would otherwise be overlooked.' },
      { label: 'C', html: 'Critics argue, however, that the exam measures a narrow and increasingly outdated set of skills. It rewards above all the ability to memorise information and to recall it quickly under pressure. Precisely the tasks that computers now perform far better than any human. The abilities that matter most in modern working life, such as creativity, collaboration and the capacity to find and judge information, are exactly those that a silent, solitary, closed-book test is least able to assess. We may, the critics suggest, be selecting and training people for a world that no longer exists.' },
      { label: 'D', html: 'There is also concern about the effect of exams on learning itself. When a test carries high stakes, both students and teachers tend to focus narrowly on what will be examined, a process often called “teaching to the test”. Knowledge is crammed for the occasion and forgotten soon after; subjects that are not examined are neglected; and the anxiety that exams produce can harm the very students it is meant to sort, particularly those who know the material but perform poorly under pressure. The exam, in this view, distorts the education it is supposed to measure.' },
      { label: 'E', html: 'Defenders of examinations reply that the alternatives are worse. Continuous assessment, in which a student’s coursework counts towards their final grade, sounds attractive but is far easier to manipulate: work can be copied, bought or completed with too much help from others, and the anonymity that makes exams fair is lost. A timed test, whatever its limitations, at least guarantees that the work is the student’s own, produced under identical conditions for everyone. Remove that guarantee, defenders warn, and the fairness that was the exam’s original purpose collapses.' },
      { label: 'F', html: 'The likeliest future is neither the abolition of exams nor their unchanged survival, but a gradual broadening of how we judge learning. Written tests may remain for those things they measure well, while projects, presentations and practical work assess the skills they cannot reach. The real lesson of the debate is that no single method can capture everything worth knowing about a student, and that the exam, so long treated as the natural measure of ability, is only one tool among several. Valuable for some purposes, and quite unsuited to others.' },
    ],
  },
  groups: [
    {
      title: 'Questions 27-31',
      type: 'yes-no-notgiven',
      instructionHtml:
        'Do the following statements agree with the views of the writer in Reading Passage 3? Write <strong>Yes</strong>, <strong>No</strong> or <strong>Not Given</strong>.',
      questions: [
        {
          id: 'q27',
          textHtml: 'The written exam has existed for most of human history.',
          answer: 'No',
          explanation: 'The writer says the exam is a relatively recent invention, not an ancient one.',
          evidence: 'In fact it is a relatively recent invention, and one that a growing number of educators believe has outlived its usefulness.',
        },
        {
          id: 'q28',
          textHtml: 'Exams originally helped to make selection fairer.',
          answer: 'Yes',
          explanation: 'The writer says the exam’s great virtue was fairness. Selecting by ability rather than birth.',
          evidence: 'A standardised written test, marked without knowledge of who had written it, offered a way to select people by ability rather than birth.',
        },
        {
          id: 'q29',
          textHtml: 'Exams should be abolished completely.',
          answer: 'No',
          explanation: 'The writer expects a broadening of assessment, not abolition. Written tests will remain for what they measure well.',
          evidence: 'The likeliest future is neither the abolition of exams nor their unchanged survival, but a gradual broadening of how we judge learning.',
        },
        {
          id: 'q30',
          textHtml: 'Online exams are easier to cheat in than paper ones.',
          answer: 'Not Given',
          explanation: 'The passage discusses continuous assessment and coursework, but never mentions online exams at all.',
        },
        {
          id: 'q31',
          textHtml: 'No single method can measure everything about a student.',
          answer: 'Yes',
          explanation: 'The writer states directly that no single method can capture everything worth knowing about a student.',
          evidence: 'no single method can capture everything worth knowing about a student.',
        },
      ],
    },
    {
      title: 'Questions 32-36',
      type: 'sentence-endings',
      instructionHtml: 'Complete each sentence with the correct ending. Write the correct letter, A-G.',
      legendHtml:
        '<strong>A</strong>&nbsp; select people by ability rather than birth.<br><strong>B</strong>&nbsp; the skills computers now perform better than humans.<br><strong>C</strong>&nbsp; students and teachers focus narrowly on what will be tested.<br><strong>D</strong>&nbsp; it guarantees the work is the student’s own.<br><strong>E</strong>&nbsp; a broader mix of methods is likely.<br><strong>F</strong>&nbsp; exams should be made longer.<br><strong>G</strong>&nbsp; coursework is always more accurate.',
      options: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      questions: [
        {
          id: 'q32',
          textHtml: 'The original purpose of the written exam was to',
          answer: 'A',
          explanation: 'The exam was designed to select people by ability rather than birth (ending A).',
          evidence: 'offered a way to select people by ability rather than birth.',
        },
        {
          id: 'q33',
          textHtml: 'Critics say exams mainly reward',
          answer: 'B',
          explanation: 'Critics say exams reward memorising and quick recall. The very tasks computers now do better (ending B).',
          evidence: 'It rewards above all the ability to memorise information and to recall it quickly under pressure. Precisely the tasks that computers now perform far better than any human.',
        },
        {
          id: 'q34',
          textHtml: 'When a test has high stakes,',
          answer: 'C',
          explanation: 'High stakes make students and teachers focus narrowly on what will be examined (ending C).',
          evidence: 'both students and teachers tend to focus narrowly on what will be examined, a process often called “teaching to the test”.',
        },
        {
          id: 'q35',
          textHtml: 'Defenders value the timed exam because',
          answer: 'D',
          explanation: 'Defenders say a timed test at least guarantees the work is the student’s own (ending D).',
          evidence: 'A timed test, whatever its limitations, at least guarantees that the work is the student’s own.',
        },
        {
          id: 'q36',
          textHtml: 'The writer predicts that in future',
          answer: 'E',
          explanation: 'The writer predicts a gradual broadening. A mix of methods rather than exams alone (ending E).',
          evidence: 'a gradual broadening of how we judge learning. Written tests may remain... while projects, presentations and practical work assess the skills they cannot reach.',
        },
      ],
    },
    {
      title: 'Questions 37-40',
      type: 'multiple-choice',
      instructionHtml: 'Choose the correct letter, <strong>A</strong>, <strong>B</strong>, <strong>C</strong> or <strong>D</strong>.',
      questions: [
        {
          id: 'q37',
          textHtml: 'Before written exams, university places were often given out according to',
          options: ['ability and merit.', 'personal connection and privilege.', 'written tests.', 'age.'],
          answer: 'B',
          explanation: 'Before the exam, places and posts were often handed out through personal connection and privilege.',
          evidence: 'places at universities and posts in the civil service were often handed out through personal connection and privilege.',
        },
        {
          id: 'q38',
          textHtml: 'Which skills do critics say exams are least able to measure?',
          options: ['memory and recall', 'creativity and collaboration', 'speed and accuracy', 'spelling and grammar'],
          answer: 'B',
          explanation: 'Critics say a silent, solitary, closed-book test is least able to assess creativity, collaboration and judging information.',
          evidence: 'such as creativity, collaboration and the capacity to find and judge information, are exactly those that a silent, solitary, closed-book test is least able to assess.',
        },
        {
          id: 'q39',
          textHtml: '“Teaching to the test” refers to',
          options: ['making tests easier.', 'focusing only on what will be examined.', 'testing teachers.', 'removing exams.'],
          answer: 'B',
          explanation: 'Teaching to the test is when students and teachers focus narrowly on what will be examined.',
          evidence: 'both students and teachers tend to focus narrowly on what will be examined, a process often called “teaching to the test”.',
        },
        {
          id: 'q40',
          textHtml: 'What is the main objection defenders raise against continuous assessment?',
          options: ['It is too difficult.', 'It can be manipulated and is less fair.', 'It takes too long.', 'It favours weak students.'],
          answer: 'B',
          explanation: 'Defenders object that coursework is far easier to manipulate (copied, bought or over-helped), losing the exam’s fairness.',
          evidence: 'Continuous assessment... is far easier to manipulate: work can be copied, bought or completed with too much help from others.',
        },
      ],
    },
  ],
};

export const readingFull005: PracticeTest = {
  id: 'reading-full-005',
  skill: 'reading',
  title: 'Academic Reading. Full Test 5',
  description: 'A complete 60-minute Academic Reading exam: three passages on the language of bees, the story of plastic and the future of exams, 40 questions across the full range of question types.',
  durationMinutes: 60,
  parts: [passage1, passage2, passage3],
};
