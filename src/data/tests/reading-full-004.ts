import type { PracticeTest, TestPart } from '../../lib/tests/schema';

/* Academic Reading — Full Test 4. Original material, full exam length,
   realistic type weighting, no diagram. */

// ── Passage 1 — The Rise of the Skyscraper (Q1-13) ──────────────────────────
const passage1: TestPart = {
  label: 'Passage 1',
  stimulus: {
    kind: 'passage',
    label: 'Reading Passage 1',
    title: 'The Rise of the Skyscraper',
    instructionHtml:
      'You should spend about 20 minutes on <strong>Questions 1-13</strong>, which are based on Reading Passage 1 below.',
    paragraphs: [
      { label: 'A', html: 'For almost the whole of history, the height of a building was limited by a simple fact of engineering. Traditional structures were built of stone or brick, and in such buildings the walls carry the entire weight of everything above them. The higher you wish to build, the thicker the walls at the bottom must be, until at a certain point the lower walls are so massive that they swallow up the very space the building was meant to provide. The tallest masonry office building ever raised, a sixteen-storey block completed in Chicago in 1891, had ground-floor walls almost two metres thick. Beyond such a height, the method simply could not go.' },
      { label: 'B', html: 'The breakthrough that removed this limit was the steel frame. Instead of resting the weight of the building on its outer walls, engineers built a rigid skeleton of steel columns and beams, rather like the frame of a tent, and hung the walls onto it as a thin outer skin. Because the frame carried the load, the walls no longer had to, and they could be as light and as full of windows as the designer wished. A building could now rise as high as the frame could be made to stand, and the frame could be made very high indeed. The weight was carried straight down the steel columns to deep foundations sunk into solid rock.' },
      { label: 'C', html: 'Steel alone, however, would not have been enough. A tower of forty storeys is of little use if its occupants must climb forty flights of stairs to reach the top, and until the middle of the nineteenth century the upper floors of any tall building were the least desirable, let cheaply to those who could afford nothing better. The invention that changed this was the safety elevator, demonstrated by Elisha Otis in 1854. Passenger lifts already existed, but people feared them, for a snapped cable meant a fatal fall. Otis added a device that gripped the guide rails automatically the instant the cable went slack, so that the car could not drop. Suddenly the top of a building became the most prized location of all, and height became desirable rather than merely possible.' },
      { label: 'D', html: 'These technologies came together first in the American cities of Chicago and New York in the closing decades of the nineteenth century. There were good reasons why. Both cities were growing explosively, and the price of land in their business districts had risen so high that the only affordable way to expand was upward. Chicago had the further spur of a great fire in 1871, which destroyed much of the city centre and cleared the ground for something new. A generation of ambitious architects and engineers, gathered in these booming cities, competed to build higher than their rivals, and the modern skyline was born.' },
      { label: 'E', html: 'The skyscraper was never merely a practical solution to a shortage of land, however. From the beginning it was also a statement. A soaring tower advertised the wealth and confidence of the company that built it, and cities and nations soon competed for the prestige of possessing the tallest building in the world. A title that has passed from New York to Chicago and, in recent decades, to the fast-growing cities of Asia and the Middle East. The race for height has as much to do with pride as with the price of land.' },
      { label: 'F', html: 'Modern towers face challenges the early builders never dreamed of. At great heights the chief enemy is not weight but wind, which can set a tall building swaying uncomfortably; the tallest towers now contain huge counterweights that shift to steady them. Lifts, too, set a practical limit, for a very tall building needs so many lift shafts that they begin to eat up the floor space, and engineers work constantly to design faster and cleverer systems. Yet the basic idea remains what it was more than a century ago: a strong frame, a fast lift, and the human desire to reach a little higher than before.' },
    ],
  },
  groups: [
    {
      title: 'Questions 1-5',
      type: 'paragraph-matching',
      options: ['A', 'B', 'C', 'D', 'E', 'F'],
      instructionHtml:
        'Reading Passage 1 has six paragraphs, <strong>A-F</strong>. Which paragraph contains the following information?',
      questions: [
        {
          id: 'q1',
          textHtml: 'why the upper floors of early tall buildings were unpopular',
          answer: 'C',
          explanation: 'Paragraph C says that before the safety elevator the top floors were the least desirable, let cheaply to those who could afford nothing better.',
          evidence: 'the upper floors of any tall building were the least desirable, let cheaply to those who could afford nothing better.',
        },
        {
          id: 'q2',
          textHtml: 'the problem with building very high using stone or brick',
          answer: 'A',
          explanation: 'Paragraph A explains that in masonry buildings the lower walls must grow so thick they swallow the usable space.',
          evidence: 'the lower walls are so massive that they swallow up the very space the building was meant to provide.',
        },
        {
          id: 'q3',
          textHtml: 'reasons why skyscrapers first appeared in particular cities',
          answer: 'D',
          explanation: 'Paragraph D gives the reasons Chicago and New York led: explosive growth, sky-high land prices and Chicago’s great fire.',
          evidence: 'the price of land in their business districts had risen so high that the only affordable way to expand was upward.',
        },
        {
          id: 'q4',
          textHtml: 'the main difficulty faced by the tallest modern towers',
          answer: 'F',
          explanation: 'Paragraph F says the chief enemy at great height is wind, not weight.',
          evidence: 'At great heights the chief enemy is not weight but wind, which can set a tall building swaying uncomfortably.',
        },
        {
          id: 'q5',
          textHtml: 'the idea that tall buildings express wealth and pride',
          answer: 'E',
          explanation: 'Paragraph E describes the tower as a statement of a company’s wealth and confidence and a matter of civic pride.',
          evidence: 'A soaring tower advertised the wealth and confidence of the company that built it.',
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
          before: 'In traditional buildings, the weight of the structure is carried by the',
          after: '.',
          answer: 'walls',
          explanation: 'In traditional buildings the walls carry the entire weight above them.',
          evidence: 'in such buildings the walls carry the entire weight of everything above them.',
        },
        {
          id: 'q7',
          before: 'The key breakthrough for tall buildings was the',
          after: 'frame.',
          answer: 'steel',
          explanation: 'The breakthrough that removed the height limit was the steel frame.',
          evidence: 'The breakthrough that removed this limit was the steel frame.',
        },
        {
          id: 'q8',
          before: 'Elisha Otis demonstrated a safety',
          after: 'in 1854.',
          answer: 'elevator',
          explanation: 'Otis demonstrated the safety elevator in 1854.',
          evidence: 'The invention that changed this was the safety elevator, demonstrated by Elisha Otis in 1854.',
        },
        {
          id: 'q9',
          before: 'The tallest modern towers use huge',
          after: 'to reduce swaying.',
          answer: 'counterweights',
          explanation: 'The tallest towers contain huge counterweights that shift to steady them.',
          evidence: 'the tallest towers now contain huge counterweights that shift to steady them.',
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
          textHtml: 'The steel frame allowed outer walls to contain more windows.',
          answer: 'True',
          explanation: 'Because the frame carried the load, the walls could be as light and full of windows as the designer wished.',
          evidence: 'they could be as light and as full of windows as the designer wished.',
        },
        {
          id: 'q11',
          textHtml: 'Passenger lifts did not exist before Otis’s invention.',
          answer: 'False',
          explanation: 'The passage says passenger lifts already existed. Otis added a safety device to them.',
          evidence: 'Passenger lifts already existed, but people feared them, for a snapped cable meant a fatal fall.',
        },
        {
          id: 'q12',
          textHtml: 'The 1871 Chicago fire was started deliberately.',
          answer: 'Not Given',
          explanation: 'The fire is mentioned as clearing the ground for new building, but the passage never says how it started.',
          evidence: 'Chicago had the further spur of a great fire in 1871, which destroyed much of the city centre and cleared the ground for something new.',
        },
        {
          id: 'q13',
          textHtml: 'The title of world’s tallest building has moved to Asia and the Middle East.',
          answer: 'True',
          explanation: 'The passage says the title has passed to the fast-growing cities of Asia and the Middle East.',
          evidence: 'a title that has passed from New York to Chicago and, in recent decades, to the fast-growing cities of Asia and the Middle East.',
        },
      ],
    },
  ],
};

// ── Passage 2 — The Twilight Zone of the Ocean (Q14-26) ─────────────────────
const passage2: TestPart = {
  label: 'Passage 2',
  stimulus: {
    kind: 'passage',
    label: 'Reading Passage 2',
    title: 'The Twilight Zone of the Ocean',
    instructionHtml:
      'You should spend about 20 minutes on <strong>Questions 14-26</strong>, which are based on Reading Passage 2 below.',
    paragraphs: [
      { label: 'A', html: 'Between the sunlit surface waters of the ocean and the pitch-black depths lies a vast and mysterious region that scientists call the twilight zone. It begins about two hundred metres down, where the light has faded to a dim blue glow, and extends to around a thousand metres, below which no sunlight penetrates at all. This zone is one of the largest habitats on the planet, yet it remains among the least explored. For most of history it was simply too deep and too dark to study, and even today far more is known about the surface of the Moon than about the creatures that live here.' },
      { label: 'B', html: 'The animals of the twilight zone have adapted to their dim world in extraordinary ways. Many have enormous eyes, several times larger in proportion to their bodies than our own, the better to gather what little light there is. Others have given up on external light altogether and make their own, through a chemical process called bioluminescence. In the twilight zone this ability is not rare but almost universal: the great majority of animals there can produce living light, using it to lure prey, to confuse predators, or to signal to mates in the darkness. A flash of light in these depths may be a trap, a warning or an invitation.' },
      { label: 'C', html: 'Every night, the twilight zone is the stage for the largest movement of animals anywhere on Earth. As darkness falls at the surface, countless small fish, squid and other creatures rise up from the depths to feed in the richer waters above, sinking down again before dawn to hide from predators in the dark. This daily journey, repeated across the whole ocean by an almost unimaginable number of animals, is known as the vertical migration. Because so many creatures take part, it is the largest migration on the planet, and it happens twice every single day, unseen beneath the waves.' },
      { label: 'D', html: 'This nightly migration turns out to be quietly important for the whole planet. The tiny plants of the sunlit surface absorb carbon dioxide from the atmosphere as they grow. When the animals of the twilight zone rise to feed on them at night and then sink again by day, they carry the carbon locked in that food down into the deep ocean, where much of it remains for centuries, out of contact with the air. In effect, the vertical migration acts as a vast pump, moving carbon from the surface into the depths and helping to regulate the climate of the entire world.' },
      { label: 'E', html: 'It is precisely this role that has begun to worry scientists, because the twilight zone is now attracting the attention of commercial fishing fleets. The waters nearer the surface have been so heavily fished that some companies are looking to the huge quantities of small fish in the twilight zone as a new source of food and animal feed. Researchers fear that harvesting these creatures on a large scale, before we even understand their role, could disrupt the carbon pump and damage the food chains that depend on them. Once such a fishery is established, it may be very hard to undo the harm.' },
      { label: 'F', html: 'For all these reasons, the twilight zone has become one of the most active frontiers of ocean science. New robotic vehicles, able to descend into the darkness and linger there for hours, are sending back the first detailed pictures of its inhabitants, while nets and cameras reveal how many creatures truly live in these waters. Far more, it now seems, than anyone once believed. The hope of scientists is that we will come to understand this hidden region properly before we decide, as we so often have in the past, to exploit it.' },
    ],
  },
  groups: [
    {
      title: 'Questions 14-19',
      type: 'matching-headings',
      instructionHtml:
        'Reading Passage 2 has six paragraphs, A-F. Choose the correct heading for paragraphs <strong>A-F</strong>.',
      legendHtml:
        '<strong>List of Headings</strong><br>i&nbsp; A daily journey of countless animals<br>ii&nbsp; A little-known region of the sea<br>iii&nbsp; New tools for exploring the deep<br>iv&nbsp; Fishing the surface waters<br>v&nbsp; Living with very little light<br>vi&nbsp; A threat to a barely understood habitat<br>vii&nbsp; A hidden help to the climate<br>viii&nbsp; The deepest parts of the ocean',
      options: ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii'],
      questions: [
        {
          id: 'q14',
          textHtml: 'Paragraph A',
          answer: 'ii',
          explanation: 'Paragraph A introduces the twilight zone as one of the largest yet least explored regions of the sea. Heading ii.',
          evidence: 'This zone is one of the largest habitats on the planet, yet it remains among the least explored.',
        },
        {
          id: 'q15',
          textHtml: 'Paragraph B',
          answer: 'v',
          explanation: 'Paragraph B is about adapting to dim light (huge eyes and self-made light), heading v.',
          evidence: 'The animals of the twilight zone have adapted to their dim world in extraordinary ways. Many have enormous eyes.',
        },
        {
          id: 'q16',
          textHtml: 'Paragraph C',
          answer: 'i',
          explanation: 'Paragraph C describes the nightly vertical migration of countless animals. Heading i.',
          evidence: 'Every night, the twilight zone is the stage for the largest movement of animals anywhere on Earth.',
        },
        {
          id: 'q17',
          textHtml: 'Paragraph D',
          answer: 'vii',
          explanation: 'Paragraph D explains how the migration pumps carbon into the deep and helps regulate the climate. Heading vii.',
          evidence: 'the vertical migration acts as a vast pump, moving carbon from the surface into the depths and helping to regulate the climate.',
        },
        {
          id: 'q18',
          textHtml: 'Paragraph E',
          answer: 'vi',
          explanation: 'Paragraph E warns that commercial fishing threatens this barely understood zone. Heading vi.',
          evidence: 'the twilight zone is now attracting the attention of commercial fishing fleets.',
        },
        {
          id: 'q19',
          textHtml: 'Paragraph F',
          answer: 'iii',
          explanation: 'Paragraph F describes new robotic vehicles and cameras exploring the deep. Heading iii.',
          evidence: 'New robotic vehicles, able to descend into the darkness and linger there for hours, are sending back the first detailed pictures of its inhabitants.',
        },
      ],
    },
    {
      title: 'Questions 20-23',
      type: 'table-completion',
      wordLimit: 2,
      instructionHtml: 'Complete the table below. Choose <strong>NO MORE THAN TWO WORDS</strong> from the passage for each answer.',
      table: {
        headerRow: ['Feature', 'Detail'],
        rows: [
          ['Depth at which the twilight zone begins (metres)', { questionId: 'q20' }],
          ['Process most animals use to make their own light', { questionId: 'q21' }],
          ['Name for the nightly rise and fall of ocean animals', { questionId: 'q22' }],
          ['What large-scale fishing could disrupt', { questionId: 'q23' }],
        ],
      },
      questions: [
        {
          id: 'q20',
          answer: ['two hundred', '200'],
          explanation: 'The zone begins about two hundred metres down.',
          evidence: 'It begins about two hundred metres down, where the light has faded to a dim blue glow.',
        },
        {
          id: 'q21',
          answer: 'bioluminescence',
          explanation: 'Animals make their own light through a chemical process called bioluminescence.',
          evidence: 'Others have given up on external light altogether and make their own, through a chemical process called bioluminescence.',
        },
        {
          id: 'q22',
          answer: ['vertical migration', 'the vertical migration'],
          explanation: 'The nightly rise and fall is known as the vertical migration.',
          evidence: 'This daily journey... is known as the vertical migration.',
        },
        {
          id: 'q23',
          answer: ['carbon pump', 'the carbon pump'],
          explanation: 'Researchers fear large-scale harvesting could disrupt the carbon pump.',
          evidence: 'harvesting these creatures on a large scale, before we even understand their role, could disrupt the carbon pump.',
        },
      ],
    },
    {
      title: 'Questions 24-26',
      type: 'multiple-choice',
      instructionHtml: 'Choose the correct letter, <strong>A</strong>, <strong>B</strong>, <strong>C</strong> or <strong>D</strong>.',
      questions: [
        {
          id: 'q24',
          textHtml: 'The vertical migration is described as the largest on Earth because',
          options: ['the animals travel the furthest.', 'so many creatures take part in it.', 'it happens only once a year.', 'it can be seen from the surface.'],
          answer: 'B',
          explanation: 'It is the largest migration because so many creatures take part. And it happens twice a day, unseen.',
          evidence: 'Because so many creatures take part, it is the largest migration on the planet, and it happens twice every single day.',
        },
        {
          id: 'q25',
          textHtml: 'Animals of the twilight zone help the climate by',
          options: ['absorbing carbon dioxide directly.', 'carrying carbon down into the deep ocean.', 'releasing oxygen at night.', 'warming the surface water.'],
          answer: 'B',
          explanation: 'The animals carry carbon locked in their food down into the deep ocean, where it stays for centuries.',
          evidence: 'they carry the carbon locked in that food down into the deep ocean, where much of it remains for centuries.',
        },
        {
          id: 'q26',
          textHtml: 'Why are fishing fleets turning to the twilight zone?',
          options: ['Its fish are easier to catch.', 'The surface waters have been heavily fished.', 'Governments have encouraged it.', 'Its fish are more valuable.'],
          answer: 'B',
          explanation: 'Fleets turn to the twilight zone because the surface waters have been so heavily fished.',
          evidence: 'The waters nearer the surface have been so heavily fished that some companies are looking to the huge quantities of small fish in the twilight zone.',
        },
      ],
    },
  ],
};

// ── Passage 3 — Should We Trust the Crowd? (Q27-40) ─────────────────────────
const passage3: TestPart = {
  label: 'Passage 3',
  stimulus: {
    kind: 'passage',
    label: 'Reading Passage 3',
    title: 'Should We Trust the Crowd?',
    instructionHtml:
      'You should spend about 20 minutes on <strong>Questions 27-40</strong>, which are based on Reading Passage 3 below.',
    paragraphs: [
      { label: 'A', html: 'There is an old and appealing idea that a large group of people, taken together, is wiser than any single member of it. Ask a crowd at a fair to guess the weight of an ox, the story goes, and while individual guesses vary wildly, their average will land remarkably close to the truth. This phenomenon, often called the wisdom of crowds, has become fashionable in the age of the internet, which allows the opinions of millions to be gathered and combined as never before. But how far can the crowd really be trusted, and when does its supposed wisdom turn into something far less reliable?' },
      { label: 'B', html: 'The classic examples are genuinely impressive. When many people independently estimate a quantity, their errors tend to cancel out: some guess too high, others too low, and the average is left close to the correct figure. The same principle underlies many useful modern tools, from the prediction markets that forecast elections to the review scores that guide our shopping. Pooled together, the scattered knowledge of ordinary people can outperform the judgement of a single expert, and can do so cheaply and quickly.' },
      { label: 'C', html: 'The crucial word, however, is “independently”. The wisdom of crowds depends on each person forming a judgement on their own, so that their errors are unrelated and can cancel out. The moment people begin to influence one another, this condition breaks down. If each guesser can see the guesses of others before deciding, they tend to drift towards the majority view, and the independence that made the crowd wise is lost. The group may then converge confidently on an answer that is quite wrong, with each member reassured, falsely, by the agreement of the rest.' },
      { label: 'D', html: 'This is exactly the danger of the modern internet, where opinions are rarely formed in isolation. On social media, we see what others think before, and often instead of, thinking for ourselves. A view that gains an early lead can snowball, as people assume that what is popular must be correct and add their voices to it. Studies of online ratings have shown that a review’s score can be pushed up or down for a long time simply by whether the first few votes it received happened to be positive or negative. The crowd here is not pooling independent judgements but amplifying an accident.' },
      { label: 'E', html: 'Crowds are also easily led astray when a question requires genuine expertise rather than the combination of many rough guesses. Averaging the opinions of a thousand people about the weight of an ox works well; averaging their opinions about how to treat a disease does not, because most of them share the same misconceptions, and their errors point the same way rather than cancelling out. Where knowledge is specialised and widely misunderstood, a crowd can be confidently and unanimously mistaken, and its very size lends its error an unjustified authority.' },
      { label: 'F', html: 'The sensible conclusion is neither to worship the crowd nor to dismiss it, but to understand the conditions under which it works. A crowd is wise when its members are numerous, independent and drawing on real if imperfect knowledge, and when their errors are genuinely random. It is foolish when they copy one another, when they lack the knowledge the question demands, or when a few loud voices set the tone for the rest. Used with that understanding, the judgement of the many is a powerful tool; mistaken for an infallible oracle, it is a trap.' },
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
          textHtml: 'The wisdom of crowds works only when people judge independently.',
          answer: 'Yes',
          explanation: 'The writer stresses that the effect depends on each person judging on their own so errors are unrelated.',
          evidence: 'The wisdom of crowds depends on each person forming a judgement on their own, so that their errors are unrelated and can cancel out.',
        },
        {
          id: 'q28',
          textHtml: 'Social media generally improves the quality of group judgements.',
          answer: 'No',
          explanation: 'The writer presents social media as a danger that destroys independence, not an improvement.',
          evidence: 'This is exactly the danger of the modern internet, where opinions are rarely formed in isolation.',
        },
        {
          id: 'q29',
          textHtml: 'Prediction markets are more accurate than review scores.',
          answer: 'Not Given',
          explanation: 'Both are named as useful tools, but the passage never compares their accuracy with each other.',
        },
        {
          id: 'q30',
          textHtml: 'A crowd can be trusted on questions that require specialist knowledge.',
          answer: 'No',
          explanation: 'The writer says on specialised questions a crowd can be confidently and unanimously mistaken.',
          evidence: 'Where knowledge is specialised and widely misunderstood, a crowd can be confidently and unanimously mistaken.',
        },
        {
          id: 'q31',
          textHtml: 'The size of a crowd can make a wrong answer seem authoritative.',
          answer: 'Yes',
          explanation: 'The writer says a crowd’s very size lends its error an unjustified authority.',
          evidence: 'its very size lends its error an unjustified authority.',
        },
      ],
    },
    {
      title: 'Questions 32-36',
      type: 'multiple-answer',
      instructionHtml:
        'Which <strong>FIVE</strong> of the following conditions does the writer say a crowd needs in order to be wise? Choose five.',
      selectCount: 5,
      choices: [
        { value: 'A', label: 'its members are numerous' },
        { value: 'B', label: 'its members judge independently' },
        { value: 'C', label: 'its members can see each other’s answers' },
        { value: 'D', label: 'its members have some real knowledge' },
        { value: 'E', label: 'its members are all experts' },
        { value: 'F', label: 'the errors are genuinely random' },
        { value: 'G', label: 'a few strong voices lead the group' },
        { value: 'H', label: 'errors point in different directions' },
      ],
      explanationHtml:
        'Paragraph F lists the conditions for a wise crowd: members who are <strong>numerous</strong>, <strong>independent</strong> and drawing on <strong>real if imperfect knowledge</strong>, whose <strong>errors are genuinely random</strong> and so <strong>point in different directions</strong> and cancel out. Seeing each other’s answers, being all experts, and a few strong voices leading the group are the very things that make a crowd <em>foolish</em>.',
      questions: [
        { id: 'q32', answer: ['A', 'B', 'D', 'F', 'H'] },
        { id: 'q33', answer: ['A', 'B', 'D', 'F', 'H'] },
        { id: 'q34', answer: ['A', 'B', 'D', 'F', 'H'] },
        { id: 'q35', answer: ['A', 'B', 'D', 'F', 'H'] },
        { id: 'q36', answer: ['A', 'B', 'D', 'F', 'H'] },
      ],
    },
    {
      title: 'Questions 37-40',
      type: 'multiple-choice',
      instructionHtml: 'Choose the correct letter, <strong>A</strong>, <strong>B</strong>, <strong>C</strong> or <strong>D</strong>.',
      questions: [
        {
          id: 'q37',
          textHtml: 'In the ox-weight example, the crowd’s average is accurate because',
          options: ['everyone is an expert.', 'the high and low errors cancel out.', 'people copy the best guesser.', 'the ox is easy to weigh.'],
          answer: 'B',
          explanation: 'The average lands close to the truth because the high and low guesses cancel out.',
          evidence: 'some guess too high, others too low, and the average is left close to the correct figure.',
        },
        {
          id: 'q38',
          textHtml: 'What does the writer say can happen to an online review score?',
          options: ['It always reflects true quality.', 'Early votes can influence it for a long time.', 'It cannot be manipulated.', 'It improves over time.'],
          answer: 'B',
          explanation: 'The first few votes can push a score up or down for a long time.',
          evidence: 'a review’s score can be pushed up or down for a long time simply by whether the first few votes it received happened to be positive or negative.',
        },
        {
          id: 'q39',
          textHtml: 'Averaging opinions works badly for medical questions because',
          options: ['people share the same misconceptions.', 'too few people answer.', 'doctors disagree.', 'the questions are too simple.'],
          answer: 'A',
          explanation: 'On specialised questions people share the same misconceptions, so their errors point the same way instead of cancelling.',
          evidence: 'because most of them share the same misconceptions, and their errors point the same way rather than cancelling out.',
        },
        {
          id: 'q40',
          textHtml: 'The writer’s overall conclusion is that the crowd',
          options: ['should always be trusted.', 'should always be ignored.', 'is useful under the right conditions.', 'is never better than an expert.'],
          answer: 'C',
          explanation: 'The writer concludes we should neither worship nor dismiss the crowd, but understand the conditions under which it works.',
          evidence: 'The sensible conclusion is neither to worship the crowd nor to dismiss it, but to understand the conditions under which it works.',
        },
      ],
    },
  ],
};

export const readingFull004: PracticeTest = {
  id: 'reading-full-004',
  skill: 'reading',
  title: 'Academic Reading. Full Test 4',
  description: 'A complete 60-minute Academic Reading exam: three passages on skyscrapers, the ocean twilight zone and the wisdom of crowds, 40 questions across the full range of question types.',
  durationMinutes: 60,
  parts: [passage1, passage2, passage3],
};
