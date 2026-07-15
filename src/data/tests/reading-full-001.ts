import type { PracticeTest, TestPart } from '../../lib/tests/schema';

/* Academic Reading — Full Test 1. Original material written for this site
   (public-domain facts, original wording). 3 passages, 40 questions,
   all seven question types. This is the polished template other tests copy. */

// ── Passage 1 — The Story of Tea (Q1-13) ────────────────────────────────────
const passage1: TestPart = {
  label: 'Passage 1',
  stimulus: {
    kind: 'passage',
    label: 'Reading Passage 1',
    title: 'The Story of Tea',
    instructionHtml:
      'You should spend about 20 minutes on <strong>Questions 1-13</strong>, which are based on Reading Passage 1 below.',
    paragraphs: [
      { label: 'A', html: 'Tea is, after water, the most widely consumed drink in the world, with billions of cups poured every single day. Yet its origins lie in a single region of south-west China. According to a much-loved Chinese legend, the drink was discovered by accident in 2737 BC, when a few leaves from a wild bush drifted into a pot of water that the emperor Shen Nung was boiling in his garden. The emperor, so the story goes, was delighted by the fragrant liquid that resulted and ordered the plant to be studied. Whatever the truth of this pleasant tale, botanists agree on the essential facts. The tea plant, <em>Camellia sinensis</em>, is native to the area where modern China, Myanmar and north-east India meet, and the peoples living there were picking and brewing its leaves long before any written records were kept. For them tea was not a luxury but a part of ordinary life, valued both for the gentle alertness it produced and for its place in traditional medicine.' },
      { label: 'B', html: 'For many centuries tea remained an almost exclusively Chinese habit. It was prized not only as a refreshing drink but as a remedy for tiredness and poor digestion, and by the time of the Tang dynasty, more than a thousand years ago, it had become the national beverage. So central had it grown to daily life that a scholar named Lu Yu was moved to write the first known book devoted entirely to the subject, a careful work describing how tea should be grown, picked, prepared and served. From China the habit gradually spread to neighbouring lands. It reached Japan through Buddhist monks, who drank it to stay awake during their long hours of meditation, and there, over several generations, it developed into the slow and highly formal ritual known today as the tea ceremony. An art in which every movement of the host is carefully prescribed.' },
      { label: 'C', html: 'Europe, meanwhile, knew nothing of tea until the seventeenth century, when Portuguese and Dutch traders began shipping small and costly quantities back from the East. At first it was so expensive that only the very wealthy could afford it, and it was treated as an exotic luxury to be shown off to guests. In Britain, tea was popularised partly through royal fashion. When the Portuguese princess Catherine of Braganza married Charles II in 1662, she brought her personal taste for the drink to the English court, and the fashionable aristocracy was quick to copy her. Over the following decades tea houses opened in London and other cities, prices slowly fell as imports rose, and within a century the drink had worked its way down through society until it had become central to British social life at every level.' },
      { label: 'D', html: 'The British enthusiasm for tea had consequences that reached far beyond the dining table. Because all tea still came from China, and Chinese merchants would accept only silver in payment, Britain found itself steadily losing vast amounts of the precious metal. To reverse this drain, British traders began selling opium, grown cheaply in India, to buyers in China. A damaging and eventually illegal trade that led in time to open war between the two nations. Britain also set out to break China’s monopoly by growing tea for itself. In the 1830s it established the first plantations in the Indian region of Assam, using plants that had been smuggled out of China together with the closely guarded knowledge of how to process the leaves. The experiment succeeded beyond expectation, and within a few decades India had overtaken China to become the world’s leading producer.' },
      { label: 'E', html: 'Today tea is grown commercially in more than forty countries, from the highlands of Kenya to the plains of Argentina, and it is drunk in an astonishing variety of ways. With milk and sugar in Britain, with fresh mint in Morocco, with salt and butter in Tibet, and utterly plain in much of China itself. Whole social customs have grown up around it, from the British afternoon tea to the bustling tea stalls of India. Yet despite its long journey across the globe and the many forms it now takes, every one of those cups can still be traced back to the same modest evergreen shrub that once grew wild, unnoticed, on the misty hillsides of ancient China.' },
    ],
  },
  groups: [
    {
      title: 'Questions 1-4',
      type: 'paragraph-matching',
      options: ['A', 'B', 'C', 'D', 'E'],
      instructionHtml:
        'Reading Passage 1 has five paragraphs, <strong>A-E</strong>. Which paragraph contains the following information? You may use any letter more than once.',
      questions: [
        {
          id: 'q1',
          textHtml: 'how a member of royalty helped to make tea fashionable',
          answer: 'C',
          explanation: 'Paragraph C describes how the princess Catherine of Braganza brought her taste for tea to the English court and the aristocracy copied her.',
          evidence: 'When the Portuguese princess Catherine of Braganza married Charles II in 1662, she brought her personal taste for the drink to the English court, and the fashionable aristocracy was quick to copy her.',
        },
        {
          id: 'q2',
          textHtml: 'an explanation of how tea led to a military conflict',
          answer: 'D',
          explanation: 'Paragraph D explains that the opium trade Britain set up to pay for tea led to war between the two nations.',
          evidence: 'British traders began selling opium, grown cheaply in India, to buyers in China. A damaging and eventually illegal trade that led in time to open war between the two nations.',
        },
        {
          id: 'q3',
          textHtml: 'the many different ways in which tea is consumed today',
          answer: 'E',
          explanation: 'Paragraph E lists the many different ways tea is drunk around the world today.',
          evidence: 'it is drunk in an astonishing variety of ways. With milk and sugar in Britain, with fresh mint in Morocco, with salt and butter in Tibet, and utterly plain in much of China itself.',
        },
        {
          id: 'q4',
          textHtml: 'a reference to the first book ever written about tea',
          answer: 'B',
          explanation: 'Paragraph B mentions the scholar Lu Yu writing the first known book devoted entirely to tea.',
          evidence: 'a scholar named Lu Yu was moved to write the first known book devoted entirely to the subject.',
        },
      ],
    },
    {
      title: 'Questions 5-8',
      type: 'sentence-completion',
      wordLimit: 2,
      instructionHtml:
        'Complete the sentences below. Choose <strong>NO MORE THAN TWO WORDS</strong> from the passage for each answer.',
      questions: [
        {
          id: 'q5',
          before: 'The tea plant is native to the region where China, Myanmar and',
          after: 'meet.',
          answer: 'India',
          explanation: 'The passage names the three areas that meet as China, Myanmar and north-east India.',
          evidence: 'The tea plant, Camellia sinensis, is native to the area where modern China, Myanmar and north-east India meet.',
        },
        {
          id: 'q6',
          before: 'By the Tang dynasty, tea had become the national',
          after: 'of China.',
          answer: ['beverage', 'drink'],
          explanation: 'The text states tea had become the national beverage by the Tang dynasty.',
          evidence: 'by the time of the Tang dynasty, more than a thousand years ago, it had become the national beverage.',
        },
        {
          id: 'q7',
          before: 'Tea did not reach Europe until the',
          after: 'century.',
          answer: 'seventeenth',
          explanation: 'Europe knew nothing of tea until the seventeenth century.',
          evidence: 'Europe, meanwhile, knew nothing of tea until the seventeenth century, when Portuguese and Dutch traders began shipping small and costly quantities back from the East.',
        },
        {
          id: 'q8',
          before: 'Britain established tea plantations in the Indian region of',
          after: '.',
          answer: 'Assam',
          explanation: 'Britain set up its first plantations in the Indian region of Assam.',
          evidence: 'In the 1830s it established the first plantations in the Indian region of Assam.',
        },
      ],
    },
    {
      title: 'Questions 9-13',
      type: 'tfng',
      instructionHtml:
        'Do the following statements agree with the information in Reading Passage 1? Write <strong>True</strong>, <strong>False</strong> or <strong>Not Given</strong>.',
      questions: [
        {
          id: 'q9',
          textHtml: 'Botanists have proven that the legend of Shen Nung is historically accurate.',
          answer: 'False',
          explanation: 'The passage calls the story a "pleasant tale" and says botanists agree only on the essential botanical facts. Not that the legend itself is proven true.',
          evidence: 'Whatever the truth of this pleasant tale, botanists agree on the essential facts.',
        },
        {
          id: 'q10',
          textHtml: 'People in China were drinking tea before written records existed.',
          answer: 'True',
          explanation: 'People were picking and brewing tea leaves long before any written records were kept.',
          evidence: 'the peoples living there were picking and brewing its leaves long before any written records were kept.',
        },
        {
          id: 'q11',
          textHtml: "Lu Yu's book described the medical benefits of tea in detail.",
          answer: 'Not Given',
          explanation: 'The passage says the book covered how tea should be grown, picked, prepared and served, but says nothing about its medical benefits. So there is no information either way.',
          evidence: 'a careful work describing how tea should be grown, picked, prepared and served.',
        },
        {
          id: 'q12',
          textHtml: 'Tea was cheap and widely available when it first arrived in Europe.',
          answer: 'False',
          explanation: 'The passage says tea was at first so expensive that only the very wealthy could afford it. The opposite of cheap and widely available.',
          evidence: 'At first it was so expensive that only the very wealthy could afford it, and it was treated as an exotic luxury.',
        },
        {
          id: 'q13',
          textHtml: 'Within a few decades of the 1830s, India was producing more tea than China.',
          answer: 'True',
          explanation: 'The passage confirms India overtook China as the leading producer within a few decades.',
          evidence: 'within a few decades India had overtaken China to become the world’s leading producer.',
        },
      ],
    },
  ],
};

// ── Passage 2 — Anatomy of a Flowering Plant (Q14-26) ───────────────────────
const passage2: TestPart = {
  label: 'Passage 2',
  stimulus: {
    kind: 'passage',
    label: 'Reading Passage 2',
    title: 'The Anatomy of a Flowering Plant',
    instructionHtml:
      'You should spend about 20 minutes on <strong>Questions 14-26</strong>, which are based on Reading Passage 2 below.',
    paragraphs: [
      { label: 'A', html: 'A flowering plant is a living system in which every part has a particular job to do, and in which the parts work together so smoothly that we rarely stop to think about them. Although species differ enormously in size and shape, from a tiny daisy in a lawn to a climbing rose that reaches the roof of a house, the great majority share the same basic set of organs: roots, a stem, leaves and one or more flowers. Each of these has evolved to perform a specific task, and understanding what each part does makes it far easier to see how the plant as a whole manages to feed itself, to stand upright, to defend itself against attack, and above all to reproduce.' },
      { label: 'B', html: 'Beneath the soil, hidden from view, lie the roots. Their first and most obvious task is to anchor the plant firmly in the ground, spreading out and gripping the soil so that wind and heavy rain cannot easily dislodge it. Just as importantly, the roots act as the plant’s mouth: fine hairs near their tips draw up water and the dissolved minerals that the plant needs in order to build new tissue and stay healthy. In many plants the roots have a third role as well, serving as a store of food. During good weather they quietly build up reserves of sugar, which the plant can then draw upon during winter, drought, or any period when growing conditions are poor and little new food can be made.' },
      { label: 'C', html: 'Rising from the roots is the stem, the plant’s central support and its main highway. The stem holds the leaves up towards the light they need and carries the flowers to a height where insects and the wind can easily reach them. Running the whole length of the stem are two sets of narrow tubes that together work like a plumbing system: one set carries water upward from the roots to the leaves, while the other distributes the sugars made in the leaves downward and outward to wherever in the plant they are needed. In woody plants such as the rose, the stem is also armed for defence, bearing sharp thorns along its length that discourage hungry animals from biting into it.' },
      { label: 'D', html: 'The broad, flat leaves are the plant’s food factories, and they are among the most remarkable structures in all of nature. Their green colour comes from a pigment called chlorophyll, which has the extraordinary ability to capture energy directly from sunlight. Using this captured energy, the leaf combines two very ordinary ingredients (water drawn up from the roots and carbon dioxide taken from the air) and turns them into sugar, releasing oxygen into the atmosphere as a by-product. This process, known as photosynthesis, is quietly at work in every green leaf on the planet, and it is the ultimate source of almost all the food, and much of the oxygen, on which life on Earth depends.' },
      { label: 'E', html: 'At the tip of the stem sits the flower, which is the plant’s reproductive organ and, to our eyes, usually its most beautiful part. Its brightly coloured petals are not there merely for decoration: their true purpose is advertising, drawing the attention of the insects and birds whose help the plant needs. Arranged around the base of the petals are small green, leaf-like structures called sepals, whose job was to wrap around and protect the delicate flower while it was still a tightly closed bud. Deep inside the ring of petals lie the small, less showy parts that actually produce pollen and seeds, and it is here, out of sight, that the process of reproduction truly begins.' },
      { label: 'F', html: 'That process depends on pollination. The transfer of pollen from one flower to another. Most flowering plants cannot do this for themselves and rely on animals, especially insects, to do it for them. When a bee lands on a bloom to feed on its sweet nectar, hundreds of tiny grains of pollen catch on the fine hairs of its body. As the bee flies on to the next flower in search of more nectar, some of that pollen rubs off, fertilising the second plant so that it can begin to form seeds. It is a beautifully balanced arrangement in which insects and plants have come to depend on one another: the insect is rewarded with food, and the plant, unable to move, gains a reliable means of carrying its pollen and reproducing.' },
    ],
  },
  groups: [
    {
      title: 'Questions 14-18',
      type: 'matching-headings',
      instructionHtml:
        'Reading Passage 2 has six paragraphs, A-F. Choose the correct heading for paragraphs <strong>B-F</strong> from the list of headings below. (Paragraph A is an introduction.)',
      legendHtml:
        '<strong>List of Headings</strong><br>i&nbsp;&nbsp; How the plant makes its own food<br>ii&nbsp; The many medical uses of flowers<br>iii&nbsp; Holding the plant firm and feeding it<br>iv&nbsp; The support that carries and defends the plant<br>v&nbsp;&nbsp; Attracting visitors to the flower<br>vi&nbsp; Differences between wild and garden plants<br>vii&nbsp; How new plants are created<br>viii&nbsp; Why some plants live longer than others',
      options: ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii'],
      questions: [
        {
          id: 'q14',
          textHtml: 'Paragraph B',
          answer: 'iii',
          explanation: 'Paragraph B is about the roots anchoring the plant firmly and drawing up the water and minerals that feed it. Heading iii.',
          evidence: 'Their first and most obvious task is to anchor the plant firmly in the ground... the roots act as the plant’s mouth: fine hairs near their tips draw up water and the dissolved minerals that the plant needs.',
        },
        {
          id: 'q15',
          textHtml: 'Paragraph C',
          answer: 'iv',
          explanation: 'Paragraph C is about the stem supporting and carrying the plant, and defending it with thorns. Heading iv.',
          evidence: 'Rising from the roots is the stem, the plant’s central support... the stem is also armed for defence, bearing sharp thorns along its length.',
        },
        {
          id: 'q16',
          textHtml: 'Paragraph D',
          answer: 'i',
          explanation: 'Paragraph D explains photosynthesis (how the leaves make the plant’s own food), heading i.',
          evidence: 'Using this captured energy, the leaf combines two very ordinary ingredients (water drawn up from the roots and carbon dioxide taken from the air) and turns them into sugar.',
        },
        {
          id: 'q17',
          textHtml: 'Paragraph E',
          answer: 'v',
          explanation: 'Paragraph E says the petals exist to advertise and draw the attention of insects and birds. Heading v.',
          evidence: 'their true purpose is advertising, drawing the attention of the insects and birds whose help the plant needs.',
        },
        {
          id: 'q18',
          textHtml: 'Paragraph F',
          answer: 'vii',
          explanation: 'Paragraph F describes pollination and the forming of seeds (how new plants are created), heading vii.',
          evidence: 'That process depends on pollination. The transfer of pollen from one flower to another... so that it can begin to form seeds.',
        },
      ],
    },
    {
      title: 'Questions 19-23',
      type: 'diagram-labelling',
      wordLimit: 1,
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
        {
          id: 'q19',
          answer: ['petals', 'petal'],
          explanation: 'The brightly coloured parts of the bloom are the petals.',
          evidence: 'Its brightly coloured petals are not there merely for decoration.',
        },
        {
          id: 'q20',
          answer: ['sepals', 'sepal'],
          explanation: 'The small green, leaf-like structures at the base of the petals are the sepals.',
          evidence: 'small green, leaf-like structures called sepals, whose job was to wrap around and protect the delicate flower while it was still a tightly closed bud.',
        },
        {
          id: 'q21',
          answer: ['leaf', 'leaves'],
          explanation: 'The broad, flat food-making structures on the stem are the leaves.',
          evidence: 'The broad, flat leaves are the plant’s food factories.',
        },
        {
          id: 'q22',
          answer: 'stem',
          explanation: 'The central support rising from the roots is the stem.',
          evidence: 'Rising from the roots is the stem, the plant’s central support and its main highway.',
        },
        {
          id: 'q23',
          answer: ['thorn', 'thorns'],
          explanation: 'The sharp defensive points along the stem are thorns.',
          evidence: 'bearing sharp thorns along its length that discourage hungry animals from biting into it.',
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
          textHtml: 'According to the passage, one function of a plant’s roots is to',
          options: ['capture energy from sunlight.', 'store food for the plant.', 'produce pollen.', 'attract insects.'],
          answer: 'B',
          explanation: 'Paragraph B gives the roots a third role as a food store. Capturing sunlight is the leaves (D), pollen comes from the flower (E), and attracting insects is the petals’ job (E).',
          evidence: 'In many plants the roots have a third role as well, serving as a store of food.',
        },
        {
          id: 'q25',
          textHtml: 'Which of the following does photosynthesis release as a by-product?',
          options: ['water', 'chlorophyll', 'oxygen', 'nectar'],
          answer: 'C',
          explanation: 'Photosynthesis releases oxygen as a by-product. Water is an ingredient, not a by-product; chlorophyll is the pigment doing the capturing.',
          evidence: 'turns them into sugar, releasing oxygen into the atmosphere as a by-product.',
        },
        {
          id: 'q26',
          textHtml: 'How do bees help a plant to reproduce?',
          options: ['by eating harmful insects', 'by carrying pollen between flowers', 'by protecting the buds', 'by producing nectar'],
          answer: 'B',
          explanation: 'Pollen catches on the bee’s body at one flower and rubs off at the next, fertilising it. The plant produces the nectar, not the bee.',
          evidence: 'As the bee flies on to the next flower in search of more nectar, some of that pollen rubs off, fertilising the second plant so that it can begin to form seeds.',
        },
      ],
    },
  ],
};

// ── Passage 3 — The Four-Day Week (Q27-40) ──────────────────────────────────
const passage3: TestPart = {
  label: 'Passage 3',
  stimulus: {
    kind: 'passage',
    label: 'Reading Passage 3',
    title: 'Rethinking the Working Week',
    instructionHtml:
      'You should spend about 20 minutes on <strong>Questions 27-40</strong>, which are based on Reading Passage 3 below.',
    paragraphs: [
      { label: 'A', html: 'The idea that people might work four days a week instead of five, and do so with no loss of pay, has in recent years moved from the fringes of economic thinking firmly into the mainstream of public debate. Once it would have been dismissed out of hand as hopelessly unrealistic, the kind of thing only a dreamer could propose. Today, however, it is being tested by real companies on real employees. Formal trials have already taken place in countries as different as Iceland, Japan and Britain, involving thousands of workers across dozens of organisations, and their results have been seized upon by supporters and doubters alike, each side claiming that the evidence proves its case. What almost nobody disputes any longer is that the question is worth taking seriously.' },
      { label: 'B', html: 'Among the strongest advocates of the change is Andrew Barnes, a New Zealand businessman who introduced a four-day week at his own firm and later wrote about the experience. Barnes argues that the traditional five-day week is essentially a relic of the industrial age, a leftover from an era of factory production that bears very little relation to how much useful work modern office employees actually do in a day. In his own company, he reports, staff who were given a whole extra day off did not become lazier; on the contrary, they became noticeably more focused and efficient during the hours they did work, so that the firm’s overall output did not fall at all. Barnes also insists that shorter weeks bring a further benefit that is easy to overlook: by reducing the stress and exhaustion that so often drive people to quit, they help companies to hold on to experienced staff, saving the heavy and frequently underestimated cost of hiring and training their replacements.' },
      { label: 'C', html: 'Not everyone, however, is convinced. Marta Ruiz, an economist, warns that the encouraging results of the early trials may be rather misleading. The companies that volunteer to take part in such experiments, she points out, tend overwhelmingly to be office-based businesses whose working patterns are relatively easy to rearrange. A busy hospital, a working farm or a manufacturing factory simply cannot close its doors for an extra day each week without leaving vital work undone, and Ruiz therefore doubts very much that a model which suits a software company can be applied straightforwardly across the whole of a complex modern economy. She raises a second doubt as well: that the impressive productivity gains reported during a trial might quietly disappear once the initial novelty and enthusiasm had worn off and the shorter week had simply become the new normal.' },
      { label: 'D', html: 'A rather different concern comes from Tom Fielding, a sociologist who studies the increasingly blurred boundary between work and private life. Fielding does not oppose the four-day week in principle, and is careful to say so, but he cautions that compressing the same heavy workload into fewer days may well leave employees more tired at the end of the week rather than less. If people simply respond to losing a day by working much longer hours on the four that remain, he argues, then the promised improvement in health and wellbeing may never actually appear, and the reform will have achieved nothing of real value. For Fielding, in short, the precise length of the working week matters a good deal less than the total quantity of work that is expected of people within it.' },
      { label: 'E', html: 'What almost everyone in the debate agrees on, whatever their view of the four-day week itself, is that the way we work is changing, and changing quickly. The rapid spread of remote working, the steady automation of routine tasks, and a growing public concern for mental health have together made people question long-held assumptions about the working week that went unexamined for generations. Whether or not the four-day model in particular eventually becomes the standard pattern, the wider debate it has done so much to provoke shows no sign at all of fading away.' },
    ],
  },
  groups: [
    {
      title: 'Questions 27-32',
      type: 'categorisation',
      instructionHtml: 'Look at the following opinions and the list of people below. Match each opinion to the person who expresses it.',
      legendHtml:
        '<strong>A</strong>&nbsp; Andrew Barnes &nbsp;·&nbsp; <strong>B</strong>&nbsp; Marta Ruiz &nbsp;·&nbsp; <strong>C</strong>&nbsp; Tom Fielding',
      options: ['A', 'B', 'C'],
      questions: [
        {
          id: 'q27',
          textHtml: 'The benefits seen in trials may disappear once employees get used to the change.',
          answer: 'B',
          explanation: 'This is Ruiz’s second doubt: the gains might vanish once the novelty wears off.',
          evidence: 'the impressive productivity gains reported during a trial might quietly disappear once the initial novelty and enthusiasm had worn off.',
        },
        {
          id: 'q28',
          textHtml: 'A shorter week helps businesses to keep their existing staff.',
          answer: 'A',
          explanation: 'Barnes argues shorter weeks help companies hold on to experienced staff by reducing stress and exhaustion.',
          evidence: 'by reducing the stress and exhaustion that so often drive people to quit, they help companies to hold on to experienced staff.',
        },
        {
          id: 'q29',
          textHtml: 'The total amount of work matters more than the number of days worked.',
          answer: 'C',
          explanation: 'This is Fielding’s conclusion: the length of the week matters less than the total quantity of work expected.',
          evidence: 'the precise length of the working week matters a good deal less than the total quantity of work that is expected of people within it.',
        },
        {
          id: 'q30',
          textHtml: 'Many kinds of workplace could not adopt the four-day model.',
          answer: 'B',
          explanation: 'Ruiz points out that hospitals, farms and factories cannot simply close for an extra day.',
          evidence: 'A busy hospital, a working farm or a manufacturing factory simply cannot close its doors for an extra day each week without leaving vital work undone.',
        },
        {
          id: 'q31',
          textHtml: 'The five-day week no longer reflects how much people really achieve.',
          answer: 'A',
          explanation: 'Barnes calls the five-day week a relic of the industrial age with little relation to how much useful work modern employees do.',
          evidence: 'the traditional five-day week is essentially a relic of the industrial age... that bears very little relation to how much useful work modern office employees actually do in a day.',
        },
        {
          id: 'q32',
          textHtml: 'Employees might end up more exhausted under the new system.',
          answer: 'C',
          explanation: 'Fielding warns that compressing the same workload into fewer days may leave people more tired, not less.',
          evidence: 'compressing the same heavy workload into fewer days may well leave employees more tired at the end of the week rather than less.',
        },
      ],
    },
    {
      title: 'Questions 33-36',
      type: 'tfng',
      instructionHtml:
        'Do the following statements agree with the information in Reading Passage 3? Write <strong>True</strong>, <strong>False</strong> or <strong>Not Given</strong>.',
      questions: [
        {
          id: 'q33',
          textHtml: 'Four-day-week trials have been held in more than one country.',
          answer: 'True',
          explanation: 'The passage names Iceland, Japan and Britain as countries where formal trials have taken place.',
          evidence: 'Formal trials have already taken place in countries as different as Iceland, Japan and Britain.',
        },
        {
          id: 'q34',
          textHtml: 'Barnes introduced the four-day week after reading about trials in other countries.',
          answer: 'Not Given',
          explanation: 'The passage says Barnes introduced it at his own firm and later wrote about it. But never says what prompted him. No information either way.',
          evidence: 'a New Zealand businessman who introduced a four-day week at his own firm and later wrote about the experience.',
        },
        {
          id: 'q35',
          textHtml: 'Ruiz believes office-based companies find it easier to reorganise their work.',
          answer: 'True',
          explanation: 'Ruiz says the volunteering companies are overwhelmingly office-based businesses whose patterns are relatively easy to rearrange.',
          evidence: 'The companies that volunteer to take part in such experiments, she points out, tend overwhelmingly to be office-based businesses whose working patterns are relatively easy to rearrange.',
        },
        {
          id: 'q36',
          textHtml: 'Fielding is completely opposed to the idea of a four-day week.',
          answer: 'False',
          explanation: 'The passage directly states Fielding does not oppose the four-day week in principle. So "completely opposed" contradicts the text.',
          evidence: 'Fielding does not oppose the four-day week in principle, and is careful to say so.',
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
          textHtml: 'According to Barnes, why did output not fall when staff worked fewer days?',
          options: ['The company hired extra workers.', 'Employees became more focused.', 'Employees worked from home.', 'Routine tasks were automated.'],
          answer: 'B',
          explanation: 'Barnes reports his staff became more focused and efficient during the hours they did work. Extra hiring, home working and automation are never mentioned as his reasons.',
          evidence: 'they became noticeably more focused and efficient during the hours they did work, so that the firm’s overall output did not fall at all.',
        },
        {
          id: 'q38',
          textHtml: 'What does Ruiz doubt about the results of the trials?',
          options: ['that they were measured correctly', 'that they can apply to the whole economy', 'that employees enjoyed them', 'that they saved any money'],
          answer: 'B',
          explanation: 'Ruiz doubts a model that suits a software company can be applied across the whole of a complex modern economy.',
          evidence: 'Ruiz therefore doubts very much that a model which suits a software company can be applied straightforwardly across the whole of a complex modern economy.',
        },
        {
          id: 'q39',
          textHtml: 'According to Fielding, what could cancel out the benefits of a four-day week?',
          options: ['working longer hours on fewer days', 'taking a second job', 'a reduction in pay', 'less contact with colleagues'],
          answer: 'A',
          explanation: 'Fielding warns that if people respond by working much longer hours on the remaining four days, the promised wellbeing gains may never appear.',
          evidence: 'If people simply respond to losing a day by working much longer hours on the four that remain... then the promised improvement in health and wellbeing may never actually appear.',
        },
        {
          id: 'q40',
          textHtml: 'What does the writer suggest in the final paragraph?',
          options: ['The four-day week will certainly become standard.', 'The debate about how we work will continue either way.', 'Remote working should be discouraged.', 'Automation has largely failed.'],
          answer: 'B',
          explanation: 'The final paragraph says that whether or not the model becomes standard, the wider debate shows no sign of fading. Option A is too certain, C and D reverse the passage.',
          evidence: 'Whether or not the four-day model in particular eventually becomes the standard pattern, the wider debate it has done so much to provoke shows no sign at all of fading away.',
        },
      ],
    },
  ],
};

export const readingFull001: PracticeTest = {
  id: 'reading-full-001',
  skill: 'reading',
  title: 'Academic Reading. Full Test 1',
  description: 'A complete 60-minute Academic Reading exam: three passages, 40 questions, every question type. From True/False/Not Given to diagram labelling.',
  durationMinutes: 60,
  parts: [passage1, passage2, passage3],
};
