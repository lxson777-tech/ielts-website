import type { PracticeTest, TestPart } from '../../lib/tests/schema';

/* Academic Reading — Full Test 3. Original material, full exam length
   (~800 words/passage), realistic type weighting, no diagram. */

// ── Passage 1 — The First Farmers (Q1-13) ───────────────────────────────────
const passage1: TestPart = {
  label: 'Passage 1',
  stimulus: {
    kind: 'passage',
    label: 'Reading Passage 1',
    title: 'The First Farmers',
    instructionHtml:
      'You should spend about 20 minutes on <strong>Questions 1-13</strong>, which are based on Reading Passage 1 below.',
    paragraphs: [
      { label: 'A', html: 'For the greater part of human history, our ancestors fed themselves by hunting wild animals and gathering wild plants. They moved from place to place with the seasons, following the herds and harvesting whatever ripened, and they lived in small, mobile groups. Then, around twelve thousand years ago, something changed that would transform human life more completely than almost any event before or since: in a handful of places, quite independently, people began to farm. They planted seeds, tended the growing crops and bred animals in captivity, and in doing so they set humanity on the road to villages, cities and everything that followed.' },
      { label: 'B', html: 'The earliest and best-documented of these transformations took place in the Fertile Crescent, a broad arc of well-watered land stretching from the eastern Mediterranean coast round to the Persian Gulf. Here, some ten to twelve thousand years ago, people began to cultivate wild wheat and barley and to keep sheep, goats, pigs and cattle. Farming was not, however, invented only once. It arose separately in China, where rice and millet were domesticated; in Central America, the home of maize, beans and squash; in the Andes, with the potato; and in still other regions. That so many peoples, with no contact between them, hit upon the same idea suggests that farming was a response to pressures and opportunities that many human groups faced at around the same time.' },
      { label: 'C', html: 'Exactly why people took up farming remains a matter of debate, for at first glance the switch seems a poor bargain. Studies of ancient skeletons show that early farmers were often less healthy than the hunter-gatherers who came before them. They were frequently shorter, showed more signs of disease and of wear from repetitive labour, and depended on a narrower range of foods, which left them vulnerable when a single crop failed. A hunter-gatherer, by contrast, enjoyed a varied diet and, according to some estimates, worked fewer hours to obtain it. Why, then, would anyone choose the harder, hungrier life of the field?' },
      { label: 'D', html: 'Part of the answer is that no one chose it, at least not as a deliberate plan. The change happened so slowly, over hundreds of generations, that the people living through it can hardly have noticed the direction in which they were travelling. A group that gathered wild grains might, without any grand intention, begin to protect the most productive plants, then to sow a few seeds near their camp, then to return each year to tend them. Each small step made sense on its own terms. Only in hindsight do these steps add up to a revolution. Climate change at the end of the last ice age, which made some regions warmer and wetter, may also have created conditions in which wild grains grew thickly enough to be worth harvesting in bulk.' },
      { label: 'E', html: 'Whatever its causes, farming had one overwhelming consequence: it produced more food from a given area of land than hunting and gathering ever could. This did not necessarily make individuals healthier or happier, but it allowed far more of them to live in the same space. Populations grew, and grew again. Because a farming family could produce more food than it needed to survive, a surplus became possible for the first time, and with a surplus came the possibility of specialists, such as potters, weavers, priests and soldiers, who did not grow their own food at all. The dense, settled, layered societies we call civilisation were built on this foundation.' },
      { label: 'F', html: 'Farming reshaped the living world as well as human society. The wild plants and animals that people chose to cultivate were gradually altered by generations of selective breeding until many of them could no longer survive without human care. Modern maize, with its fat cobs, cannot even scatter its own seeds. In taking control of a few species, humanity tied its fate to theirs, and transformed vast stretches of forest and grassland into fields. The world we live in today, for better and worse, is very largely the creation of those first, unremembered farmers.' },
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
          textHtml: 'evidence that early farmers were less healthy than hunter-gatherers',
          answer: 'C',
          explanation: 'Paragraph C cites skeleton studies showing farmers were shorter, more diseased and more worn than hunter-gatherers.',
          evidence: 'Studies of ancient skeletons show that early farmers were often less healthy than the hunter-gatherers who came before them.',
        },
        {
          id: 'q2',
          textHtml: 'the idea that farming developed without anyone intending it',
          answer: 'D',
          explanation: 'Paragraph D argues no one chose farming as a deliberate plan. The change was too slow to notice.',
          evidence: 'Part of the answer is that no one chose it, at least not as a deliberate plan. The change happened so slowly, over hundreds of generations, that the people living through it can hardly have noticed.',
        },
        {
          id: 'q3',
          textHtml: 'how farming allowed people who did not grow food to exist',
          answer: 'E',
          explanation: 'Paragraph E explains that the food surplus made specialists possible. Potters, weavers, priests and soldiers who grew no food.',
          evidence: 'with a surplus came the possibility of specialists, such as potters, weavers, priests and soldiers, who did not grow their own food at all.',
        },
        {
          id: 'q4',
          textHtml: 'examples of crops domesticated in different regions of the world',
          answer: 'B',
          explanation: 'Paragraph B lists rice and millet in China, maize, beans and squash in Central America, and the potato in the Andes.',
          evidence: 'It arose separately in China, where rice and millet were domesticated; in Central America, the home of maize, beans and squash; in the Andes, with the potato.',
        },
        {
          id: 'q5',
          textHtml: 'the effect of farming on the plants and animals themselves',
          answer: 'F',
          explanation: 'Paragraph F describes how selective breeding altered the cultivated species until many could not survive without human care.',
          evidence: 'The wild plants and animals that people chose to cultivate were gradually altered by generations of selective breeding until many of them could no longer survive without human care.',
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
          before: 'Farming began around',
          after: 'thousand years ago.',
          answer: 'twelve',
          explanation: 'The passage dates the change to around twelve thousand years ago.',
          evidence: 'Then, around twelve thousand years ago, something changed that would transform human life... people began to farm.',
        },
        {
          id: 'q7',
          before: 'In the Fertile Crescent, people cultivated wild wheat and',
          after: '.',
          answer: 'barley',
          explanation: 'Wheat and barley were the crops first cultivated in the Fertile Crescent.',
          evidence: 'Here, some ten to twelve thousand years ago, people began to cultivate wild wheat and barley.',
        },
        {
          id: 'q8',
          before: 'In Central America, farmers domesticated maize, beans and',
          after: '.',
          answer: 'squash',
          explanation: 'Central America is named as the home of maize, beans and squash.',
          evidence: 'in Central America, the home of maize, beans and squash.',
        },
        {
          id: 'q9',
          before: 'A farming surplus made possible the appearance of',
          after: 'such as potters and priests.',
          answer: 'specialists',
          explanation: 'The surplus allowed specialists who did not grow their own food.',
          evidence: 'with a surplus came the possibility of specialists, such as potters, weavers, priests and soldiers, who did not grow their own food at all.',
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
          textHtml: 'Farming was invented in only one place and spread from there.',
          answer: 'False',
          explanation: 'The passage says farming was "not... invented only once". It arose separately in several regions with no contact.',
          evidence: 'Farming was not, however, invented only once. It arose separately in China... in Central America... in the Andes... and in still other regions.',
        },
        {
          id: 'q11',
          textHtml: 'Some experts think hunter-gatherers worked fewer hours than farmers.',
          answer: 'True',
          explanation: '"According to some estimates" hunter-gatherers worked fewer hours to obtain their food. The passage attributes exactly this view to some experts.',
          evidence: 'A hunter-gatherer, by contrast, enjoyed a varied diet and, according to some estimates, worked fewer hours to obtain it.',
        },
        {
          id: 'q12',
          textHtml: 'The end of the ice age made every region warmer and wetter.',
          answer: 'False',
          explanation: 'The passage says climate change made SOME regions warmer and wetter. "Every region" contradicts this.',
          evidence: 'Climate change at the end of the last ice age, which made some regions warmer and wetter.',
        },
        {
          id: 'q13',
          textHtml: 'Modern maize is unable to spread its seeds without human help.',
          answer: 'True',
          explanation: 'The passage states modern maize cannot even scatter its own seeds.',
          evidence: 'Modern maize, with its fat cobs, cannot even scatter its own seeds.',
        },
      ],
    },
  ],
};

// ── Passage 2 — How Birds Find Their Way (Q14-26) ───────────────────────────
const passage2: TestPart = {
  label: 'Passage 2',
  stimulus: {
    kind: 'passage',
    label: 'Reading Passage 2',
    title: 'How Birds Find Their Way',
    instructionHtml:
      'You should spend about 20 minutes on <strong>Questions 14-26</strong>, which are based on Reading Passage 2 below.',
    paragraphs: [
      { label: 'A', html: 'Each autumn, billions of birds leave the places where they were born and travel enormous distances to warmer regions, only to return the following spring. Some of these journeys are almost beyond belief. The Arctic tern flies from pole to pole and back again each year, a round trip of some seventy thousand kilometres. A small songbird weighing no more than a few coins may cross an entire ocean without stopping. For centuries people wondered how creatures with such tiny brains could find their way across the globe, often returning to the very same hedge or barn they left months before. Only recently has science begun to piece together the answer.' },
      { label: 'B', html: 'It turns out that birds do not rely on a single method but combine several, much as a sailor might use both the stars and a compass. On clear days, many species navigate by the sun, adjusting for the fact that it moves across the sky as the hours pass. To do this they need an accurate sense of time, an internal clock that tells them where the sun should be at any given moment. Experiments in which birds were kept under artificial lighting, so that their internal clocks were shifted, showed that the birds then set off in the wrong direction by a predictable amount. Powerful evidence that the sun and their sense of time work together.' },
      { label: 'C', html: 'At night, when the sun is unavailable, many migrating birds steer by the stars instead. In a classic series of experiments, young birds were raised inside a planetarium, a domed theatre in which patterns of artificial stars can be projected onto the ceiling. The birds learned to orient themselves by the artificial sky, and when the projected stars were rotated, the birds changed direction accordingly. They appeared to fix on the still point around which the northern stars seem to turn, rather than on any single star, which would be a reliable guide even as the seasons changed.' },
      { label: 'D', html: 'Perhaps the most remarkable of a bird’s tools is its ability to sense the Earth’s magnetic field, an invisible force that a human being cannot feel at all. This magnetic sense allows birds to find their way even on overcast nights when neither sun nor stars can be seen. Exactly how they do it is still not fully understood, but there are two leading ideas. One suggests that tiny particles of a magnetic mineral in the birds’ bodies act like a compass needle. The other, stranger idea is that a special chemical reaction in the birds’ eyes, triggered by light, is affected by the magnetic field, so that the birds may in some sense actually see it.' },
      { label: 'E', html: 'These methods guide a bird in a general direction, but they do not by themselves explain how it locates one particular nesting site. For this, birds seem to rely on a kind of map built from local landmarks and, remarkably, from smell. Experiments with homing pigeons whose sense of smell was blocked found that they became far worse at finding their way home, suggesting that the birds learn the characteristic odours carried on the winds from different directions and use them to work out where they are.' },
      { label: 'F', html: 'What allows all this to work is that the different systems back one another up. If clouds hide the stars, the magnetic sense takes over; when the bird nears home, landmarks and smells guide it in. Young birds inherit a rough sense of the direction and distance they should travel, but they refine and correct it through experience, learning the details of their route over successive journeys. Far from being a single mysterious gift, birds’ navigation is a layered system, each part covering for the weaknesses of the others.' },
    ],
  },
  groups: [
    {
      title: 'Questions 14-18',
      type: 'matching-headings',
      instructionHtml:
        'Reading Passage 2 has six paragraphs, A-F. Choose the correct heading for paragraphs <strong>B-F</strong>. (Paragraph A is an introduction.)',
      legendHtml:
        '<strong>List of Headings</strong><br>i&nbsp; Using the position of the sun<br>ii&nbsp; Which birds travel furthest<br>iii&nbsp; Finding an exact location by smell and landmark<br>iv&nbsp; Steering by the night sky<br>v&nbsp; A sense humans do not possess<br>vi&nbsp; How the different methods support each other<br>vii&nbsp; The dangers faced during migration<br>viii&nbsp; Teaching birds to navigate',
      options: ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii'],
      questions: [
        {
          id: 'q14',
          textHtml: 'Paragraph B',
          answer: 'i',
          explanation: 'Paragraph B is about navigating by the sun with the help of an internal clock. Heading i.',
          evidence: 'On clear days, many species navigate by the sun, adjusting for the fact that it moves across the sky as the hours pass.',
        },
        {
          id: 'q15',
          textHtml: 'Paragraph C',
          answer: 'iv',
          explanation: 'Paragraph C describes steering by the stars at night, tested in planetarium experiments. Heading iv.',
          evidence: 'At night, when the sun is unavailable, many migrating birds steer by the stars instead.',
        },
        {
          id: 'q16',
          textHtml: 'Paragraph D',
          answer: 'v',
          explanation: 'Paragraph D is about the magnetic sense (a force humans cannot feel), heading v.',
          evidence: 'its ability to sense the Earth’s magnetic field, an invisible force that a human being cannot feel at all.',
        },
        {
          id: 'q17',
          textHtml: 'Paragraph E',
          answer: 'iii',
          explanation: 'Paragraph E explains how birds pinpoint one exact site using landmarks and smell. Heading iii.',
          evidence: 'For this, birds seem to rely on a kind of map built from local landmarks and, remarkably, from smell.',
        },
        {
          id: 'q18',
          textHtml: 'Paragraph F',
          answer: 'vi',
          explanation: 'Paragraph F describes how the different systems back one another up. Heading vi.',
          evidence: 'What allows all this to work is that the different systems back one another up.',
        },
      ],
    },
    {
      title: 'Questions 19-23',
      type: 'multiple-answer',
      instructionHtml:
        'Which <strong>FIVE</strong> of the following are mentioned in the passage as ways birds find their way? Choose five.',
      selectCount: 5,
      choices: [
        { value: 'A', label: 'the position of the sun' },
        { value: 'B', label: 'the patterns of the stars at night' },
        { value: 'C', label: 'the temperature of the air' },
        { value: 'D', label: 'the Earth’s magnetic field' },
        { value: 'E', label: 'the sound of the sea' },
        { value: 'F', label: 'landmarks on the ground' },
        { value: 'G', label: 'smells carried on the wind' },
        { value: 'H', label: 'following larger, older birds' },
      ],
      explanationHtml:
        'Five methods are described: the position of the sun (paragraph B), the star patterns at night (C), the Earth’s magnetic field (D), and, for finding the exact site, landmarks and smells carried on the wind (E). The temperature of the air, the sound of the sea and following larger, older birds are never mentioned.',
      questions: [
        { id: 'q19', answer: ['A', 'B', 'D', 'F', 'G'] },
        { id: 'q20', answer: ['A', 'B', 'D', 'F', 'G'] },
        { id: 'q21', answer: ['A', 'B', 'D', 'F', 'G'] },
        { id: 'q22', answer: ['A', 'B', 'D', 'F', 'G'] },
        { id: 'q23', answer: ['A', 'B', 'D', 'F', 'G'] },
      ],
    },
    {
      title: 'Questions 24-26',
      type: 'multiple-choice',
      instructionHtml: 'Choose the correct letter, <strong>A</strong>, <strong>B</strong>, <strong>C</strong> or <strong>D</strong>.',
      questions: [
        {
          id: 'q24',
          textHtml: 'Shifting birds’ internal clocks with artificial light caused them to',
          options: ['stop flying altogether.', 'head in the wrong direction.', 'navigate more accurately.', 'ignore the sun.'],
          answer: 'B',
          explanation: 'With their internal clocks shifted, the birds set off in the wrong direction by a predictable amount.',
          evidence: 'the birds then set off in the wrong direction by a predictable amount. Powerful evidence that the sun and their sense of time work together.',
        },
        {
          id: 'q25',
          textHtml: 'In the planetarium experiments, birds oriented themselves by',
          options: ['a single bright star.', 'the moon.', 'the still point the northern stars turn around.', 'the edge of the dome.'],
          answer: 'C',
          explanation: 'The birds fixed on the still point the northern stars turn around, not on any single star.',
          evidence: 'They appeared to fix on the still point around which the northern stars seem to turn, rather than on any single star.',
        },
        {
          id: 'q26',
          textHtml: 'When pigeons’ sense of smell was blocked, they',
          options: ['found their way home more easily.', 'became worse at finding home.', 'flew in circles.', 'relied only on the sun.'],
          answer: 'B',
          explanation: 'Pigeons whose smell was blocked became far worse at finding their way home.',
          evidence: 'Experiments with homing pigeons whose sense of smell was blocked found that they became far worse at finding their way home.',
        },
      ],
    },
  ],
};

// ── Passage 3 — Does Money Make Us Happy? (Q27-40) ──────────────────────────
const passage3: TestPart = {
  label: 'Passage 3',
  stimulus: {
    kind: 'passage',
    label: 'Reading Passage 3',
    title: 'Does Money Make Us Happy?',
    instructionHtml:
      'You should spend about 20 minutes on <strong>Questions 27-40</strong>, which are based on Reading Passage 3 below.',
    paragraphs: [
      { label: 'A', html: 'Few questions have occupied thinkers for as long as whether money can buy happiness, and in recent decades economists and psychologists have finally begun to study it with hard data rather than mere opinion. The results are more interesting, and more useful, than the old clichés on either side. Money, it turns out, matters for happiness a great deal. But not in the simple, unlimited way that advertisers would have us believe, and not always in the ways we expect.' },
      { label: 'B', html: 'The clearest finding is that, at low incomes, more money makes a large difference. For someone who cannot reliably afford food, heating or medical care, additional income removes real sources of misery, and their reported wellbeing rises sharply as their situation improves. This is hardly surprising. What is more striking is what happens higher up the scale. As income continues to rise, each extra amount buys less and less additional happiness, until eventually the curve flattens out almost completely. Beyond the point where basic needs and a few comforts are met, a great deal more money produces only a very little more contentment.' },
      { label: 'C', html: 'One reason for this is that human beings judge their circumstances not in absolute terms but by comparison with others. A salary that would have felt like riches a decade ago, or in a poorer country, can feel merely ordinary once we are surrounded by people who earn more. The economist Richard Easterlin drew attention to a puzzle that now bears his name: although richer people within a country tend to be happier than poorer ones, whole countries do not necessarily become happier as they grow wealthier over time. As everyone’s income rises together, the comparisons that drive our sense of how well we are doing simply shift upward with them, and the extra wealth brings less lasting satisfaction than we imagine.' },
      { label: 'D', html: 'How we spend money may matter more than how much we have. A growing body of research suggests that spending on experiences, such as a trip, a concert, or a meal with friends, tends to bring more lasting happiness than spending the same sum on possessions. Possessions quickly become part of the ordinary background of our lives and cease to give pleasure, a process psychologists call adaptation. Experiences, by contrast, live on in memory, often growing rosier with time, and they are frequently shared with others, which deepens their value. The new car thrills us for a month; the holiday is retold for years.' },
      { label: 'E', html: 'Perhaps the most surprising finding of all is that spending money on other people reliably makes us happier than spending it on ourselves. In carefully controlled experiments, people given a sum of money and told to spend it on someone else reported greater happiness at the end of the day than those told to spend it on themselves. Regardless of the amount involved. This effect appears across very different cultures and income levels, which suggests that it reflects something deep in human nature rather than a quirk of one society.' },
      { label: 'F', html: 'None of this means that money is unimportant, a comforting thing the well-off sometimes tell the poor. For those in real need, more money is one of the surest routes to a better life, and no amount of clever spending can substitute for enough of it. But for the many people whose basic needs are already met, the evidence carries a genuinely useful lesson. The route to greater happiness lies less in earning ever more, and more in how that money is used: on experiences rather than things, on others as well as ourselves, and with an awareness of the endless, restless comparisons that can rob us of contentment we already have.' },
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
          textHtml: 'Money makes almost no difference to the happiness of the poor.',
          answer: 'No',
          explanation: 'The writer says the opposite. At low incomes more money makes a large difference.',
          evidence: 'The clearest finding is that, at low incomes, more money makes a large difference.',
        },
        {
          id: 'q28',
          textHtml: 'How people spend money can matter more than how much they have.',
          answer: 'Yes',
          explanation: 'The writer states directly that how we spend money may matter more than how much we have.',
          evidence: 'How we spend money may matter more than how much we have.',
        },
        {
          id: 'q29',
          textHtml: 'Governments should raise taxes on the wealthy.',
          answer: 'Not Given',
          explanation: 'The passage is about personal happiness and spending; it never discusses taxation or government policy.',
        },
        {
          id: 'q30',
          textHtml: 'Telling poor people that money is unimportant is misguided.',
          answer: 'Yes',
          explanation: 'The writer calls the idea that money is unimportant "a comforting thing the well-off sometimes tell the poor" and insists money is a sure route out of need. So he agrees it is misguided.',
          evidence: 'None of this means that money is unimportant, a comforting thing the well-off sometimes tell the poor.',
        },
        {
          id: 'q31',
          textHtml: 'Comparing ourselves with others can reduce our contentment.',
          answer: 'Yes',
          explanation: 'The writer warns of the restless comparisons that can rob us of contentment we already have.',
          evidence: 'an awareness of the endless, restless comparisons that can rob us of contentment we already have.',
        },
      ],
    },
    {
      title: 'Questions 32-36',
      type: 'sentence-endings',
      instructionHtml: 'Complete each sentence with the correct ending. Write the correct letter, A-G.',
      legendHtml:
        '<strong>A</strong>&nbsp; each extra amount adds less and less happiness.<br><strong>B</strong>&nbsp; whole countries do not always grow happier as they get richer.<br><strong>C</strong>&nbsp; it tends to bring more lasting happiness than buying things.<br><strong>D</strong>&nbsp; people feel happier than when they spend on themselves.<br><strong>E</strong>&nbsp; it removes real sources of misery.<br><strong>F</strong>&nbsp; happiness becomes impossible to measure.<br><strong>G</strong>&nbsp; possessions become more valuable over time.',
      options: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      questions: [
        {
          id: 'q32',
          textHtml: 'For people on very low incomes, more money is valuable because',
          answer: 'E',
          explanation: 'For the poor, additional income removes real sources of misery (ending E).',
          evidence: 'additional income removes real sources of misery, and their reported wellbeing rises sharply as their situation improves.',
        },
        {
          id: 'q33',
          textHtml: 'Once basic needs are met,',
          answer: 'A',
          explanation: 'Beyond basic needs, each extra amount buys less and less additional happiness (ending A).',
          evidence: 'each extra amount buys less and less additional happiness, until eventually the curve flattens out almost completely.',
        },
        {
          id: 'q34',
          textHtml: 'The puzzle named after Easterlin is that',
          answer: 'B',
          explanation: 'The Easterlin puzzle: whole countries do not necessarily become happier as they grow wealthier (ending B).',
          evidence: 'whole countries do not necessarily become happier as they grow wealthier over time.',
        },
        {
          id: 'q35',
          textHtml: 'When money is spent on experiences,',
          answer: 'C',
          explanation: 'Spending on experiences tends to bring more lasting happiness than buying things (ending C).',
          evidence: 'spending on experiences... tends to bring more lasting happiness than spending the same sum on possessions.',
        },
        {
          id: 'q36',
          textHtml: 'When people spend money on others,',
          answer: 'D',
          explanation: 'People told to spend on someone else reported greater happiness than those spending on themselves (ending D).',
          evidence: 'people given a sum of money and told to spend it on someone else reported greater happiness at the end of the day than those told to spend it on themselves.',
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
          textHtml: 'What does the writer say about the happiness curve as income rises?',
          options: ['It rises steadily without limit.', 'It eventually flattens out.', 'It falls at high incomes.', 'It never rises at all.'],
          answer: 'B',
          explanation: 'As income rises, the curve eventually flattens out almost completely.',
          evidence: 'each extra amount buys less and less additional happiness, until eventually the curve flattens out almost completely.',
        },
        {
          id: 'q38',
          textHtml: 'The process of “adaptation” explains why',
          options: ['experiences are quickly forgotten.', 'possessions stop giving pleasure.', 'the poor stay unhappy.', 'people give money away.'],
          answer: 'B',
          explanation: 'Adaptation is why possessions become ordinary background and cease to give pleasure.',
          evidence: 'Possessions quickly become part of the ordinary background of our lives and cease to give pleasure, a process psychologists call adaptation.',
        },
        {
          id: 'q39',
          textHtml: 'The experiments on spending money on others are notable because the effect',
          options: ['only worked with large sums.', 'appeared across different cultures.', 'disappeared over time.', 'applied only to rich people.'],
          answer: 'B',
          explanation: 'The effect appears across very different cultures and income levels, whatever the amount.',
          evidence: 'This effect appears across very different cultures and income levels, which suggests that it reflects something deep in human nature.',
        },
        {
          id: 'q40',
          textHtml: 'The main lesson of the final paragraph is that greater happiness comes from',
          options: ['earning as much as possible.', 'how money is used, not just how much there is.', 'avoiding all comparison with others.', 'never spending on possessions.'],
          answer: 'B',
          explanation: 'The lesson is that happiness comes less from earning more and more from how the money is used.',
          evidence: 'The route to greater happiness lies less in earning ever more, and more in how that money is used.',
        },
      ],
    },
  ],
};

export const readingFull003: PracticeTest = {
  id: 'reading-full-003',
  skill: 'reading',
  title: 'Academic Reading. Full Test 3',
  description: 'A complete 60-minute Academic Reading exam: three passages on early farming, bird navigation and the psychology of money, 40 questions across the full range of question types.',
  durationMinutes: 60,
  parts: [passage1, passage2, passage3],
};
