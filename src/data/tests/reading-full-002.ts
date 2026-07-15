import type { PracticeTest, TestPart } from '../../lib/tests/schema';

/* Academic Reading — Full Test 2. Original material. Weighted like the real
   exam (TFNG/MC/completion/matching-heavy, no diagram) and exercising the
   newer types: Yes/No/Not Given, matching features, multiple-answer, and
   matching sentence endings. */

// ── Passage 1 — The Origins of Writing (Q1-13) ──────────────────────────────
const passage1: TestPart = {
  label: 'Passage 1',
  stimulus: {
    kind: 'passage',
    label: 'Reading Passage 1',
    title: 'The Origins of Writing',
    instructionHtml:
      'You should spend about 20 minutes on <strong>Questions 1-13</strong>, which are based on Reading Passage 1 below.',
    paragraphs: [
      { label: 'A', html: 'Writing is one of humanity’s most powerful and far-reaching inventions, and yet for the overwhelming majority of our history people managed perfectly well without it. For tens of thousands of years, all human knowledge (every story, law, recipe and genealogy) was carried entirely in living memory and passed from one person to the next by word of mouth. Skilled reciters could hold astonishing quantities of information in their heads. The earliest known writing did not appear until around 5,000 years ago, remarkably recently in the span of human existence, and when it finally did appear it was invented for a strikingly unromantic reason. It was created not to record poetry, prayers or history, as we might imagine, but simply to keep track of trade, to note who owed what to whom.' },
      { label: 'B', html: 'The first true writing system emerged in Mesopotamia, the fertile region between the Tigris and Euphrates rivers where some of the world’s earliest cities grew up. As those cities expanded and their commerce became steadily more complex, the merchants, priests and officials who ran them needed a reliable way to record how much grain had been placed in a store or how many animals had changed hands in a deal. Human memory alone was no longer enough. They began pressing marks into small tablets of wet clay using the cut end of a reed, producing the distinctive wedge-shaped script that we now call cuneiform. At first these marks were simple pictures of the things they represented (a drawing of an ox stood for an ox), but over many generations they gradually became more abstract, until the symbols stood for spoken sounds as well as for objects, and could be combined to write almost anything that could be said.' },
      { label: 'C', html: 'A quite separate system, the hieroglyphics of ancient Egypt, developed at roughly the same period, apparently without any borrowing from Mesopotamia. Egyptian scribes carved elaborate and beautiful picture-signs onto the stone walls of temples and tombs, and wrote far more quickly, in a simplified hand, on papyrus, a smooth, paper-like material made by pressing together strips cut from a tall plant that grew along the banks of the Nile. Because learning the hundreds of separate signs took many years of patient training, the ability to read and write was restricted to a small and privileged class of professional scribes. These men enjoyed high social status, were excused from the heavy manual labour demanded of ordinary people, and were exempt from paying taxes, powerful incentives that made a scribe’s training a much sought-after path to advancement.' },
      { label: 'D', html: 'Writing was not invented only once. It arose independently in several other parts of the world, among peoples who could have had no contact with one another. In ancient China, the earliest surviving examples appear on so-called oracle bones. The polished shoulder blades of oxen and the flat under-shells of turtles, which were heated until they cracked and then used by diviners to predict the future. In Central America, entirely separately, the Maya developed a sophisticated and fully expressive script of their own long before any Europeans arrived on their shores. The striking fact that writing was invented afresh in these widely scattered places strongly suggests that it is not a lucky one-off accident but rather a natural response to the practical demands of any complex, organised, city-building society.' },
      { label: 'E', html: 'The single invention that finally made writing truly accessible to ordinary people, however, was the alphabet. All the earlier systems shared one great drawback: they required the learner to memorise an enormous number of separate signs, which kept literacy in the hands of a trained few. An alphabet solves this at a stroke by representing the individual sounds of a language with a small and manageable set of letters. Usually fewer than thirty in total. The first alphabets were devised by Semitic-speaking peoples in the Middle East, and were later refined and spread by the Phoenicians, a nation of seafaring traders whose ships carried the useful idea to ports all around the Mediterranean. The Greeks then made one crucial improvement, adding separate signs for the vowel sounds, and from that Greek alphabet descend, by a long and winding route, the majority of the scripts in use across Europe today.' },
      { label: 'F', html: 'The consequences of this string of inventions are almost impossible to overstate. Writing allowed laws to be fixed and recorded so that they no longer depended on a ruler’s memory or whim; it allowed knowledge to be stored safely and transmitted, unchanged, across many generations; and it allowed ideas to travel far beyond the small circle of people who first thought of them, reaching readers in distant places and distant centuries. Without it, the slow, patient accumulation of learning on which every later civilisation was built (its science, its literature, its history) would quite simply have been impossible.' },
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
          textHtml: 'the original practical purpose of writing',
          answer: 'A',
          explanation: 'Paragraph A says writing was invented not for poetry or history but simply to keep track of trade.',
          evidence: 'It was created not to record poetry, prayers or history, as we might imagine, but simply to keep track of trade. To note who owed what to whom.',
        },
        {
          id: 'q2',
          textHtml: 'a description of a wedge-shaped script',
          answer: 'B',
          explanation: 'Paragraph B describes the wedge-shaped marks pressed into clay, called cuneiform.',
          evidence: 'producing the distinctive wedge-shaped script that we now call cuneiform.',
        },
        {
          id: 'q3',
          textHtml: 'a writing system used to foretell the future',
          answer: 'D',
          explanation: 'Paragraph D describes Chinese oracle bones, used by diviners to predict the future.',
          evidence: 'oracle bones... which were heated until they cracked and then used by diviners to predict the future.',
        },
        {
          id: 'q4',
          textHtml: 'how the idea of the alphabet was carried around the Mediterranean',
          answer: 'E',
          explanation: 'Paragraph E says the Phoenicians’ ships carried the alphabet to ports all around the Mediterranean.',
          evidence: 'the Phoenicians, a nation of seafaring traders whose ships carried the useful idea to ports all around the Mediterranean.',
        },
        {
          id: 'q5',
          textHtml: 'the wide-ranging effects of writing on civilisation',
          answer: 'F',
          explanation: 'Paragraph F sets out the consequences: fixed laws, stored knowledge, and ideas travelling across places and centuries.',
          evidence: 'The consequences of this string of inventions are almost impossible to overstate.',
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
          before: 'The earliest writing appeared roughly',
          after: 'years ago.',
          answer: ['5,000', 'five thousand'],
          explanation: 'The passage dates the earliest known writing to around 5,000 years ago.',
          evidence: 'The earliest known writing did not appear until around 5,000 years ago, remarkably recently in the span of human existence.',
        },
        {
          id: 'q7',
          before: 'In Mesopotamia, marks were pressed into wet',
          after: 'tablets.',
          answer: 'clay',
          explanation: 'Marks were pressed into small tablets of wet clay with the cut end of a reed.',
          evidence: 'They began pressing marks into small tablets of wet clay using the cut end of a reed.',
        },
        {
          id: 'q8',
          before: 'Egyptian scribes wrote on',
          after: ', made from a river plant.',
          answer: 'papyrus',
          explanation: 'Scribes wrote quickly on papyrus, made from a plant growing along the Nile.',
          evidence: 'wrote far more quickly, in a simplified hand, on papyrus. A smooth, paper-like material made by pressing together strips cut from a tall plant that grew along the banks of the Nile.',
        },
        {
          id: 'q9',
          before: 'The Greeks improved the alphabet by adding signs for',
          after: '.',
          answer: 'vowels',
          explanation: 'The Greeks’ crucial improvement was adding separate signs for the vowel sounds.',
          evidence: 'The Greeks then made one crucial improvement, adding separate signs for the vowel sounds.',
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
          textHtml: 'Writing was originally created to record poetry and history.',
          answer: 'False',
          explanation: 'The passage says the opposite: writing was created NOT to record poetry, prayers or history, but for trade.',
          evidence: 'It was created not to record poetry, prayers or history, as we might imagine, but simply to keep track of trade.',
        },
        {
          id: 'q11',
          textHtml: 'Egyptian scribes paid higher taxes than other workers.',
          answer: 'False',
          explanation: 'Scribes were exempt from paying taxes. They paid none, not more.',
          evidence: 'These men enjoyed high social status, were excused from the heavy manual labour demanded of ordinary people, and were exempt from paying taxes.',
        },
        {
          id: 'q12',
          textHtml: 'The Maya script was more advanced than Egyptian hieroglyphics.',
          answer: 'Not Given',
          explanation: 'The Maya script is called "sophisticated and fully expressive", but the passage never compares it with Egyptian hieroglyphics.',
          evidence: 'the Maya developed a sophisticated and fully expressive script of their own long before any Europeans arrived on their shores.',
        },
        {
          id: 'q13',
          textHtml: 'Most scripts used in Europe today come from the Greek alphabet.',
          answer: 'True',
          explanation: 'The passage states that the majority of European scripts descend from the Greek alphabet.',
          evidence: 'from that Greek alphabet descend, by a long and winding route, the majority of the scripts in use across Europe today.',
        },
      ],
    },
  ],
};

// ── Passage 2 — Why We Sleep (Q14-26) ───────────────────────────────────────
const passage2: TestPart = {
  label: 'Passage 2',
  stimulus: {
    kind: 'passage',
    label: 'Reading Passage 2',
    title: 'Why We Sleep',
    instructionHtml:
      'You should spend about 20 minutes on <strong>Questions 14-26</strong>, which are based on Reading Passage 2 below.',
    paragraphs: [
      { label: 'A', html: 'Everyone sleeps. We spend roughly a third of our entire lives doing it, and we will die far sooner from a lack of sleep than from a lack of food. And yet, for most of recorded history, sleep was dismissed as little more than a tiresome period of inactivity. A kind of nightly pause during which the body simply switched itself off and waited for morning. Modern science has overturned that lazy view completely. Far from being idle, the sleeping brain turns out to be intensely, purposefully busy, running a whole series of maintenance and housekeeping tasks that it cannot perform while we are awake. The work it does during those dark hours is now known to be essential to our physical health, to our memory, and to the steadiness of our mood.' },
      { label: 'B', html: 'Sleep is not a single, uniform state, as it appears from the outside, but an ordered cycle of distinct stages that repeats over and over through the night. In the deepest of these stages, the brain’s electrical waves slow down dramatically and grow large and regular, and it is during this phase that the body carries out much of its physical repair, releasing hormones that heal tissue and strengthen bone. This deep sleep alternates with a very different and altogether stranger phase called REM sleep, in which the brain suddenly becomes almost as active as it is during waking life and the sleeper’s eyes dart rapidly to and fro beneath their closed lids. One complete cycle, moving down into deep sleep and back up into REM, lasts on average about ninety minutes, and a healthy sleeper passes through four or five of them in the course of a single night.' },
      { label: 'C', html: 'One of the most important discoveries of recent decades concerns the surprising role that sleep plays in memory. The psychologist Robert Stickgold has shown, in a long series of careful experiments, that skills and facts learned during the day quietly improve overnight, even when the learner does no further practice at all, almost as if the sleeping brain were secretly rehearsing them in the dark. In one striking study, people who were allowed to sleep after learning a new task performed it markedly better the following day than an otherwise identical group who had been kept awake through the night. The clear implication is that sleep does not merely preserve our memories, holding them safe until morning, but actively works on them, strengthening the useful ones and weaving them into what we already know.' },
      { label: 'D', html: 'Sleep also, quite literally, cleans the brain. The neuroscientist Maiken Nedergaard made the unexpected discovery that during sleep the tiny spaces between the brain’s densely packed cells actually widen, opening up channels that allow fluid to wash through the tissue and flush out the waste products that steadily build up during the busy hours of waking thought. This nightly clean-out matters a great deal, because some of those accumulated waste products are the very same substances linked to serious diseases such as Alzheimer’s. The finding has led a growing number of researchers to suspect that consistently poor sleep, sustained over many years, may be one of the factors that raises a person’s long-term risk of dementia. A sobering thought in a sleep-deprived age.' },
      { label: 'E', html: 'The purpose of dreaming, by contrast, remains far more mysterious, and here the scientists themselves disagree. The influential sleep scientist Matthew Walker argues that REM sleep, the phase in which most vivid dreaming occurs, helps the brain to process and defuse difficult emotions, gently taking the sharp, painful edge off our most distressing memories overnight so that we wake better able to cope with them. It is, in his phrase, a form of overnight therapy. Others, however, are far less certain that dreams serve any purpose at all. Some researchers believe that dreams are simply a meaningless by-product of the brain’s intense night-time activity (random sparks thrown off by the machinery of sleep) with no real function of their own.' },
      { label: 'F', html: 'What is genuinely beyond dispute, whatever the truth about dreams, is that going without sleep is dangerous. After even a single poor night, our powers of concentration and the soundness of our judgement both decline sharply, often without our noticing. Chronic, long-term sleep loss is worse still, and has been firmly linked by researchers to weakened immunity, to weight gain, to high blood pressure and to depression. The costs are social as well as personal: the economist Jan Vandekerckhove has estimated that tiredness among the working population drains the global economy of hundreds of billions of dollars every year, lost through accidents, mistakes and simple reductions in productivity that could easily have been avoided with proper rest.' },
      { label: 'G', html: 'Despite this steadily mounting pile of evidence, people across the developed world are, on average, sleeping noticeably less than their grandparents did. A whole range of modern pressures conspires against a good night’s rest: the spread of cheap artificial light, ever longer and more irregular working hours, and, above all, the cool blue glow of screens consulted late into the night, which fools the brain into thinking it is still daytime and interferes with the body’s natural rhythms. Scientists increasingly warn that a society which quietly treats sleep as an optional luxury, or worse still as a sign of laziness or weakness, is storing up very serious problems for its future health.' },
    ],
  },
  groups: [
    {
      title: 'Questions 14-19',
      type: 'matching-headings',
      instructionHtml:
        'Reading Passage 2 has seven paragraphs, A-G. Choose the correct heading for paragraphs <strong>B-G</strong>. (Paragraph A is an introduction.)',
      legendHtml:
        '<strong>List of Headings</strong><br>i&nbsp; How sleep strengthens what we learn<br>ii&nbsp; Sleep in the animal kingdom<br>iii&nbsp; The different stages of a night’s sleep<br>iv&nbsp; The best time of day to sleep<br>v&nbsp; Clearing harmful waste from the brain<br>vi&nbsp; The uncertain purpose of dreaming<br>vii&nbsp; The dangers of going without sleep<br>viii&nbsp; Why we now sleep less than before<br>ix&nbsp; How much sleep we really need',
      options: ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix'],
      questions: [
        {
          id: 'q14',
          textHtml: 'Paragraph B',
          answer: 'iii',
          explanation: 'Paragraph B describes the ordered cycle of distinct sleep stages (deep sleep alternating with REM), heading iii.',
          evidence: 'Sleep is not a single, uniform state, as it appears from the outside, but an ordered cycle of distinct stages that repeats over and over through the night.',
        },
        {
          id: 'q15',
          textHtml: 'Paragraph C',
          answer: 'i',
          explanation: 'Paragraph C is about sleep strengthening memories (skills learned during the day improve overnight), heading i.',
          evidence: 'skills and facts learned during the day quietly improve overnight, even when the learner does no further practice at all.',
        },
        {
          id: 'q16',
          textHtml: 'Paragraph D',
          answer: 'v',
          explanation: 'Paragraph D describes the brain’s nightly clean-out of waste products. Heading v.',
          evidence: 'Sleep also, quite literally, cleans the brain... allow fluid to wash through the tissue and flush out the waste products.',
        },
        {
          id: 'q17',
          textHtml: 'Paragraph E',
          answer: 'vi',
          explanation: 'Paragraph E says the purpose of dreaming remains mysterious and scientists disagree. Heading vi.',
          evidence: 'The purpose of dreaming, by contrast, remains far more mysterious, and here the scientists themselves disagree.',
        },
        {
          id: 'q18',
          textHtml: 'Paragraph F',
          answer: 'vii',
          explanation: 'Paragraph F lists the dangers of sleep loss: weakened immunity, weight gain, high blood pressure, depression. Heading vii.',
          evidence: 'What is genuinely beyond dispute, whatever the truth about dreams, is that going without sleep is dangerous.',
        },
        {
          id: 'q19',
          textHtml: 'Paragraph G',
          answer: 'viii',
          explanation: 'Paragraph G explains why people now sleep less than their grandparents (artificial light, long hours, screens), heading viii.',
          evidence: 'people across the developed world are, on average, sleeping noticeably less than their grandparents did.',
        },
      ],
    },
    {
      title: 'Questions 20-22',
      type: 'multiple-choice',
      instructionHtml: 'Choose the correct letter, <strong>A</strong>, <strong>B</strong>, <strong>C</strong> or <strong>D</strong>.',
      questions: [
        {
          id: 'q20',
          textHtml: 'During REM sleep, the brain is',
          options: ['completely inactive.', 'almost as active as when awake.', 'busy repairing the body.', 'free of all waste.'],
          answer: 'B',
          explanation: 'In REM the brain becomes almost as active as during waking life. Physical repair happens in deep sleep, not REM.',
          evidence: 'a very different and altogether stranger phase called REM sleep, in which the brain suddenly becomes almost as active as it is during waking life.',
        },
        {
          id: 'q21',
          textHtml: 'According to Nedergaard, what happens between brain cells during sleep?',
          options: ['They shrink permanently.', 'Gaps widen so that waste can be removed.', 'New cells are formed.', 'Fluid stops flowing.'],
          answer: 'B',
          explanation: 'Nedergaard found the spaces between cells widen during sleep, letting fluid flush out waste. The opposite of fluid stopping.',
          evidence: 'during sleep the tiny spaces between the brain’s densely packed cells actually widen, opening up channels that allow fluid to wash through the tissue and flush out the waste products.',
        },
        {
          id: 'q22',
          textHtml: 'What does the passage say about the purpose of dreams?',
          options: ['It is now fully understood.', 'Scientists disagree about it.', 'Dreams have no effect on emotion.', 'Only one scientist has studied it.'],
          answer: 'B',
          explanation: 'The passage explicitly says scientists disagree: Walker sees "overnight therapy", others see a meaningless by-product.',
          evidence: 'The purpose of dreaming, by contrast, remains far more mysterious, and here the scientists themselves disagree.',
        },
      ],
    },
    {
      title: 'Questions 23-26',
      type: 'matching-features',
      instructionHtml: 'Match each finding with the correct researcher. Write the correct letter, A-D.',
      legendHtml:
        '<strong>A</strong>&nbsp; Robert Stickgold &nbsp;·&nbsp; <strong>B</strong>&nbsp; Maiken Nedergaard &nbsp;·&nbsp; <strong>C</strong>&nbsp; Matthew Walker &nbsp;·&nbsp; <strong>D</strong>&nbsp; Jan Vandekerckhove',
      options: ['A', 'B', 'C', 'D'],
      questions: [
        {
          id: 'q23',
          textHtml: 'Sleep may reduce the emotional pain of bad memories.',
          answer: 'C',
          explanation: 'Matthew Walker argues REM sleep takes the painful edge off distressing memories. "Overnight therapy".',
          evidence: 'Matthew Walker argues that REM sleep... helps the brain to process and defuse difficult emotions, gently taking the sharp, painful edge off our most distressing memories.',
        },
        {
          id: 'q24',
          textHtml: 'A lack of sleep is very costly to the economy.',
          answer: 'D',
          explanation: 'Jan Vandekerckhove estimated tiredness drains the global economy of hundreds of billions of dollars a year.',
          evidence: 'the economist Jan Vandekerckhove has estimated that tiredness among the working population drains the global economy of hundreds of billions of dollars every year.',
        },
        {
          id: 'q25',
          textHtml: 'Sleeping after learning improves later performance.',
          answer: 'A',
          explanation: 'Robert Stickgold’s experiments showed people who slept after learning a task performed it markedly better the next day.',
          evidence: 'people who were allowed to sleep after learning a new task performed it markedly better the following day than an otherwise identical group who had been kept awake.',
        },
        {
          id: 'q26',
          textHtml: 'Sleep removes substances connected to brain disease.',
          answer: 'B',
          explanation: 'Maiken Nedergaard discovered the nightly clean-out that flushes waste products linked to diseases like Alzheimer’s.',
          evidence: 'some of those accumulated waste products are the very same substances linked to serious diseases such as Alzheimer’s.',
        },
      ],
    },
  ],
};

// ── Passage 3 — The Value of Space Exploration (Q27-40) ─────────────────────
const passage3: TestPart = {
  label: 'Passage 3',
  stimulus: {
    kind: 'passage',
    label: 'Reading Passage 3',
    title: 'The Value of Space Exploration',
    instructionHtml:
      'You should spend about 20 minutes on <strong>Questions 27-40</strong>, which are based on Reading Passage 3 below.',
    paragraphs: [
      { label: 'A', html: 'Every few years, when the cost of some ambitious new space mission is announced, the same objection is raised, and it is always raised with an air of unanswerable common sense: why spend billions of pounds exploring distant, lifeless worlds when so many pressing problems remain unsolved on our own? Why fund rockets when there are hospitals to build here and mouths to feed? It is a perfectly reasonable question, and the people who ask it are certainly not fools; it deserves a far better and more honest answer than the ones it is usually given. In my own view the case for space exploration is genuinely a strong one. But, as I shall try to argue in what follows, not for the practical, pound-and-pence reasons that its supporters tend to reach for first.' },
      { label: 'B', html: 'The most common defence of space research is that it produces useful inventions here on Earth. Its supporters like to point to satellite navigation, which now guides ships and cars unerringly across the globe, to the weather forecasting that depends entirely on instruments in orbit, and to the many medical devices that can trace their distant origins back to technology first developed for the demands of a space programme. All of this is perfectly true, and none of it should be dismissed. Yet as the central argument for exploration it is surprisingly weak, because almost any large and generously funded research effort, whatever its subject, will throw off useful spin-offs of one kind or another. If practical inventions were genuinely the only thing we were after, then the money would almost certainly be better spent on pursuing those inventions directly and deliberately, rather than merely hoping that they might emerge, by luck, as accidental by-products of a voyage to another planet.' },
      { label: 'C', html: 'A far stronger justification for exploration is a purely scientific one. Studying other planets tells us things about our own world that we could learn in no other way, precisely because it allows us to observe, fully and dramatically played out, natural processes that here on Earth are either painfully slow or hidden from view. The thick, choking, sulphurous atmosphere of Venus, for instance, stands as a vivid natural warning of exactly where an unchecked, runaway greenhouse effect can ultimately lead a planet. The cold, dead, radiation-blasted surface of Mars, meanwhile, shows us plainly what can become of a once-warmer, wetter world after it loses the protective magnetic field that once shielded it. Neither of these sobering lessons could ever be taught half so vividly inside a laboratory. Understanding how such enormous changes came about on our nearest neighbours helps us to understand (and, one hopes, to protect) the delicate and deeply improbable set of conditions that make life on Earth possible in the first place.' },
      { label: 'D', html: 'There is also an argument from sheer long-term survival. Some serious thinkers, including several prominent scientists, insist that humanity must eventually spread out and establish itself beyond the Earth if our species is to survive the great threats that face it over the coming ages, whether those threats come from the chance impact of an asteroid or from our own collective mistakes. I confess that I am rather less persuaded by this particular line of reasoning than many are. Building a genuinely self-sufficient human colony on Mars is so staggeringly difficult, and lies so very far off in the future, that it can be no real substitute at all for taking proper care of the one comfortable and habitable planet we already possess. Worse still, quietly treating space as a kind of insurance policy or emergency escape route may actually weaken our collective resolve to fix our problems here at home, by feeding the dangerous and comforting fantasy that we can always simply pack up and start afresh somewhere else.' },
      { label: 'E', html: 'The best reason of all to explore space, I have come to believe, is in fact the least practical one imaginable. Exploration answers a deep, ancient and restless human need to understand our own place in the wider universe. The very same curiosity that once drove our ancestors to cross uncharted oceans in fragile boats and to map unknown continents at enormous personal risk. The gradual discovery, still going on around us, that our galaxy contains not a mere handful but literally billions of other worlds, and that some fraction of those worlds may perhaps harbour life of their own, is surely among the most profound and humbling in the entire history of human thought. To turn away from a question of that sheer magnitude, simply on the grounds that answering it does not immediately pay for itself in cash, would be to sell terribly short something essential about what it actually means to be a curious, thinking human being.' },
      { label: 'F', html: 'None of this, I should stress, means that we ought to spend without any limit at all, or that we should ignore genuinely urgent and immediate human needs down here on Earth merely in order to gaze dreamily up at the stars. But the choice before us, when it is examined honestly and without exaggeration, is simply not the stark one between space and everything else that its critics like to imagine. The actual sums of money involved in exploration are really very small when they are set beside the truly colossal amounts that the world’s governments already spend, year after year, on a great many far less inspiring things. A wealthy civilisation that can plainly afford to lift its eyes and look outward, and yet deliberately chooses not to, has surely lost something a good deal more valuable than the modest sum of money it flatters itself it is saving.' },
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
          textHtml: 'The usefulness of space inventions is the best argument for exploration.',
          answer: 'No',
          explanation: 'The writer calls the spin-off argument "surprisingly weak" as the central case. Directly against the statement.',
          evidence: 'Yet as the central argument for exploration it is surprisingly weak, because almost any large and generously funded research effort... will throw off useful spin-offs.',
        },
        {
          id: 'q28',
          textHtml: 'Studying other planets can teach us about the Earth.',
          answer: 'Yes',
          explanation: 'The writer says studying other planets tells us things about our own world we could learn no other way.',
          evidence: 'Studying other planets tells us things about our own world that we could learn in no other way.',
        },
        {
          id: 'q29',
          textHtml: 'Humanity should treat Mars as a place to escape to.',
          answer: 'No',
          explanation: 'The writer warns that treating space as an escape route feeds a "dangerous and comforting fantasy".',
          evidence: 'treating space as a kind of insurance policy or emergency escape route may actually weaken our collective resolve to fix our problems here at home.',
        },
        {
          id: 'q30',
          textHtml: 'Governments spend too much on space compared with the military.',
          answer: 'Not Given',
          explanation: 'The writer says space sums are small beside other government spending, but never mentions the military specifically or says spending is "too much".',
          evidence: 'The actual sums of money involved in exploration are really very small when they are set beside the truly colossal amounts that the world’s governments already spend.',
        },
        {
          id: 'q31',
          textHtml: 'The desire to explore is a fundamental part of being human.',
          answer: 'Yes',
          explanation: 'The writer says exploration answers a deep, ancient human need. Part of what it means to be a curious, thinking human being.',
          evidence: 'Exploration answers a deep, ancient and restless human need to understand our own place in the wider universe.',
        },
      ],
    },
    {
      title: 'Questions 32-36',
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
      explanationHtml:
        '<strong>A, B, C</strong> are the spin-offs in paragraph B (satellite navigation, weather forecasting, medical devices); <strong>D</strong> and <strong>F</strong> are the planetary lessons in paragraph C (Venus’s runaway greenhouse effect, Mars losing its magnetic field). <strong>E</strong> (water on the Moon), <strong>G</strong> (air travel) and <strong>H</strong> (a specific cure) are never mentioned in the passage.',
      questions: [
        { id: 'q32', answer: ['A', 'B', 'C', 'D', 'F'] },
        { id: 'q33', answer: ['A', 'B', 'C', 'D', 'F'] },
        { id: 'q34', answer: ['A', 'B', 'C', 'D', 'F'] },
        { id: 'q35', answer: ['A', 'B', 'C', 'D', 'F'] },
        { id: 'q36', answer: ['A', 'B', 'C', 'D', 'F'] },
      ],
    },
    {
      title: 'Questions 37-40',
      type: 'sentence-endings',
      instructionHtml: 'Complete each sentence with the correct ending. Write the correct letter, A-F.',
      legendHtml:
        '<strong>A</strong>&nbsp; a weak way to defend space exploration.<br><strong>B</strong>&nbsp; a warning about the greenhouse effect.<br><strong>C</strong>&nbsp; colonising Mars could ensure humanity’s survival.<br><strong>D</strong>&nbsp; the human need to understand the universe.<br><strong>E</strong>&nbsp; cheaper than most military spending.<br><strong>F</strong>&nbsp; impossible without international cooperation.',
      options: ['A', 'B', 'C', 'D', 'E', 'F'],
      questions: [
        {
          id: 'q37',
          textHtml: 'The writer thinks that pointing to practical inventions is',
          answer: 'A',
          explanation: 'The writer accepts spin-offs are real but calls them a surprisingly weak central argument for exploration.',
          evidence: 'Yet as the central argument for exploration it is surprisingly weak.',
        },
        {
          id: 'q38',
          textHtml: 'The thick atmosphere of Venus serves as',
          answer: 'B',
          explanation: 'Venus is described as a vivid natural warning of where a runaway greenhouse effect can lead.',
          evidence: 'The thick, choking, sulphurous atmosphere of Venus, for instance, stands as a vivid natural warning of exactly where an unchecked, runaway greenhouse effect can ultimately lead a planet.',
        },
        {
          id: 'q39',
          textHtml: 'The writer is not convinced that',
          answer: 'C',
          explanation: 'In paragraph D the writer confesses to being "less persuaded" by the survival-through-colonisation argument.',
          evidence: 'I confess that I am rather less persuaded by this particular line of reasoning than many are.',
        },
        {
          id: 'q40',
          textHtml: 'For the writer, the strongest reason to explore space is',
          answer: 'D',
          explanation: 'Paragraph E gives the writer’s best reason: the deep human need to understand our place in the universe.',
          evidence: 'The best reason of all to explore space, I have come to believe, is in fact the least practical one imaginable. Exploration answers a deep, ancient and restless human need to understand our own place in the wider universe.',
        },
      ],
    },
  ],
};

export const readingFull002: PracticeTest = {
  id: 'reading-full-002',
  skill: 'reading',
  title: 'Academic Reading. Full Test 2',
  description: 'A complete 60-minute Academic Reading exam: three passages on writing, sleep and space exploration, 40 questions across the full range of exam question types.',
  durationMinutes: 60,
  parts: [passage1, passage2, passage3],
};
