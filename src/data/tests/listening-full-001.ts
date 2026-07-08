import type { PracticeTest, TestPart } from '../../lib/tests/schema';

/* Academic/General Training Listening — Full Test 1. Original material, full
   exam length (4 sections, 40 questions). Audio has not been produced yet —
   `stimulus.src` points at a file that does not exist on disk. Do not
   register this test in `index.ts` until real audio is generated and the
   `src` path is confirmed to resolve; the transcript is complete and can
   drive TTS generation directly. */

// ── Section 1 — Booking swimming lessons (Q1–10) ───────────────────────────
const section1: TestPart = {
  label: 'Section 1',
  stimulus: {
    kind: 'audio',
    label: 'Section 1',
    src: '/audio/listening-001-s1.mp3',
    transcriptHtml: `
      <p><strong>Receptionist:</strong> Good morning, Redwood Leisure Centre, how can I help you?</p>
      <p><strong>Caller:</strong> Oh hello, I'd like to book my daughter in for swimming lessons, please.</p>
      <p><strong>Receptionist:</strong> Of course. Could I take her name first?</p>
      <p><strong>Caller:</strong> Yes, it's Isla Marchetti. That's M-A-R-C-H-E-T-T-I.</p>
      <p><strong>Receptionist:</strong> Thank you. And how old is Isla?</p>
      <p><strong>Caller:</strong> She's seven.</p>
      <p><strong>Receptionist:</strong> Great, that puts her in our Improvers group rather than the beginners. Do you have a preferred day?</p>
      <p><strong>Caller:</strong> Thursdays would be best for us, if that's possible.</p>
      <p><strong>Receptionist:</strong> Let me check... yes, we have a Thursday class at half past four.</p>
      <p><strong>Caller:</strong> That sounds perfect.</p>
      <p><strong>Receptionist:</strong> Lovely. The Improvers course runs for eight weeks and costs sixty-five pounds in total.</p>
      <p><strong>Caller:</strong> Ok, and when does the course actually start?</p>
      <p><strong>Receptionist:</strong> The next course starts on the ninth of September.</p>
      <p><strong>Caller:</strong> Great. Do I need to bring anything on the first day?</p>
      <p><strong>Receptionist:</strong> Just a swimming costume and a towel — we provide all the kickboards and floats. Could I take a contact number, in case we need to reach you?</p>
      <p><strong>Caller:</strong> Yes, it's oh-seven-seven-double-oh, two-two-six, eight-nine-four.</p>
      <p><strong>Receptionist:</strong> Thank you. And finally, could I take the name of someone we should contact in an emergency, other than yourself?</p>
      <p><strong>Caller:</strong> That would be my husband, Marco Marchetti.</p>
      <p><strong>Receptionist:</strong> Perfect, that's everything I need. We'll see Isla on the ninth of September.</p>
    `,
  },
  groups: [
    {
      title: 'Questions 1–10',
      type: 'table-completion',
      wordLimit: 3,
      instructionHtml:
        'Complete the booking form below. Write <strong>NO MORE THAN THREE WORDS AND/OR A NUMBER</strong> for each answer.',
      legendHtml: '<strong>SWIMMING LESSON BOOKING FORM</strong><br>Child’s first name: <em>Isla</em>',
      table: {
        headerRow: ['Field', 'Answer'],
        rows: [
          ['Child’s surname', { questionId: 'q1' }],
          ['Age', { questionId: 'q2' }],
          ['Group', { questionId: 'q3' }],
          ['Class day', { questionId: 'q4' }],
          ['Class time', { questionId: 'q5' }],
          ['Length of course (weeks)', { questionId: 'q6' }],
          ['Price', { questionId: 'q7' }],
          ['Course start date', { questionId: 'q8' }],
          ['Contact phone number', { questionId: 'q9' }],
          ['Emergency contact name', { questionId: 'q10' }],
        ],
      },
      questions: [
        {
          id: 'q1',
          answer: 'Marchetti',
          explanation: 'The caller spells the surname: M-A-R-C-H-E-T-T-I.',
          evidence: 'Yes, it’s Isla Marchetti. That’s M-A-R-C-H-E-T-T-I.',
        },
        {
          id: 'q2',
          answer: ['7', 'seven'],
          explanation: 'Isla is seven years old.',
          evidence: 'And how old is Isla? — She’s seven.',
        },
        {
          id: 'q3',
          answer: 'Improvers',
          explanation: 'Being seven puts her in the Improvers group rather than the beginners.',
          evidence: 'that puts her in our Improvers group rather than the beginners.',
        },
        {
          id: 'q4',
          answer: 'Thursday',
          explanation: 'The caller asks for Thursdays.',
          evidence: 'Thursdays would be best for us, if that’s possible.',
        },
        {
          id: 'q5',
          answer: ['4.30', '4:30', 'half past four', '4.30pm', '4:30pm'],
          explanation: 'The Thursday class is at half past four.',
          evidence: 'we have a Thursday class at half past four.',
        },
        {
          id: 'q6',
          answer: ['8', 'eight'],
          explanation: 'The Improvers course runs for eight weeks.',
          evidence: 'The Improvers course runs for eight weeks and costs sixty-five pounds in total.',
        },
        {
          id: 'q7',
          answer: ['65', '£65', 'sixty-five pounds'],
          explanation: 'The course costs sixty-five pounds in total.',
          evidence: 'costs sixty-five pounds in total.',
        },
        {
          id: 'q8',
          answer: ['9 September', '9th September', 'September 9', 'ninth of September'],
          explanation: 'The next course starts on the ninth of September.',
          evidence: 'The next course starts on the ninth of September.',
        },
        {
          id: 'q9',
          answer: ['07700 226894', '07700226894'],
          explanation: 'The caller gives the number oh-seven-seven-double-oh, two-two-six, eight-nine-four.',
          evidence: 'it’s oh-seven-seven-double-oh, two-two-six, eight-nine-four.',
        },
        {
          id: 'q10',
          answer: 'Marco Marchetti',
          explanation: 'The emergency contact is the caller’s husband, Marco Marchetti.',
          evidence: 'That would be my husband, Marco Marchetti.',
        },
      ],
    },
  ],
};

// ── Section 2 — Fenwick Country Park guide (Q11–20) ────────────────────────
const section2: TestPart = {
  label: 'Section 2',
  stimulus: {
    kind: 'audio',
    label: 'Section 2',
    src: '/audio/listening-001-s2.mp3',
    transcriptHtml: `
      <p>Good afternoon everyone, and welcome to Fenwick Country Park. Before you set off, let me just run through the layout and a few practical points.</p>
      <p>If you look at the park map you’ve been given, you’ll see the main car park is right by the entrance, where we are now. From here, the path splits in two directions. If you take the path to the left, after about five minutes you’ll reach the Visitor Centre — that’s the building with the red roof, where you can pick up leaflets, use the toilets, and ask our staff any questions.</p>
      <p>Carrying on past the Visitor Centre, and bearing left along the edge of the lake, you’ll come to the Café, which serves hot drinks and light lunches until four o’clock every day. It’s a lovely spot to sit outside and watch the ducks.</p>
      <p>If instead you take the path to the right from the entrance, you’ll pass the Adventure Playground first, which is suitable for children up to the age of twelve. Continuing along that same path, just beyond the playground, is our Picnic Area, with a dozen wooden tables under the trees — that’s the best place for a packed lunch if the weather’s fine.</p>
      <p>Finally, right at the far end of the park, past the picnic area, you’ll find the Bird Hide, a quiet wooden shelter where you can watch the wildlife on the lake without disturbing it. It’s normally open every day, but please note it closes in high winds for safety reasons.</p>
      <p>Now, a few practical points before you head off. The park is open from eight in the morning until six in the evening between April and September, but only until half past four during the winter months. Entry to the park itself is free, but there is a small charge for parking — three pounds for the whole day, payable at the machine near the entrance.</p>
      <p>Dogs are welcome throughout the park, but they must be kept on a lead near the lake, to protect the nesting birds. Cycling is permitted on the main path, but not on any of the smaller trails, and swimming in the lake is not allowed at any time, as the water can be very cold and the currents are stronger than they look.</p>
      <p>Finally, if you’d like to join one of our guided walks, these leave from the Visitor Centre every Saturday at ten in the morning, and no booking is required — just turn up a few minutes early.</p>
    `,
  },
  groups: [
    {
      title: 'Questions 11–15',
      type: 'diagram-labelling',
      wordLimit: 3,
      instructionHtml:
        'Label the map below. Write <strong>NO MORE THAN THREE WORDS</strong> for each answer.',
      diagram: {
        image: '/pics/listening/park-map.svg',
        alt: 'Map of Fenwick Country Park with five numbered but unlabelled locations',
        markers: [
          { x: 24, y: 51 }, // 11 Visitor Centre
          { x: 18, y: 73 }, // 12 Café
          { x: 76, y: 56 }, // 13 Adventure Playground
          { x: 80, y: 40 }, // 14 Picnic Area
          { x: 86, y: 26 }, // 15 Bird Hide
        ],
      },
      questions: [
        {
          id: 'q11',
          answer: ['Visitor Centre', 'the Visitor Centre'],
          explanation: 'The path to the left from the entrance leads to the Visitor Centre.',
          evidence: 'after about five minutes you’ll reach the Visitor Centre.',
        },
        {
          id: 'q12',
          answer: ['Café', 'the Café', 'Cafe', 'the Cafe'],
          explanation: 'Past the Visitor Centre, along the lake, is the Café.',
          evidence: 'bearing left along the edge of the lake, you’ll come to the Café.',
        },
        {
          id: 'q13',
          answer: ['Adventure Playground', 'the Adventure Playground'],
          explanation: 'The path to the right from the entrance passes the Adventure Playground first.',
          evidence: 'you’ll pass the Adventure Playground first.',
        },
        {
          id: 'q14',
          answer: ['Picnic Area', 'the Picnic Area'],
          explanation: 'Just beyond the playground is the Picnic Area.',
          evidence: 'just beyond the playground, is our Picnic Area.',
        },
        {
          id: 'q15',
          answer: ['Bird Hide', 'the Bird Hide'],
          explanation: 'Right at the far end of the park, past the picnic area, is the Bird Hide.',
          evidence: 'past the picnic area, you’ll find the Bird Hide.',
        },
      ],
    },
    {
      title: 'Questions 16–20',
      type: 'multiple-choice',
      instructionHtml: 'Choose the correct letter, <strong>A</strong>, <strong>B</strong> or <strong>C</strong>.',
      questions: [
        {
          id: 'q16',
          textHtml: 'During the winter months, the park closes at',
          options: ['4.30 pm.', '8.00 am.', '6.00 pm.'],
          answer: 'A',
          explanation: 'The park is open until six in the evening in summer, but only until half past four in winter.',
          evidence: 'only until half past four during the winter months.',
        },
        {
          id: 'q17',
          textHtml: 'The cost of parking for a whole day is',
          options: ['ten pounds.', 'three pounds.', 'free.'],
          answer: 'B',
          explanation: 'Parking costs three pounds for the whole day.',
          evidence: 'there is a small charge for parking — three pounds for the whole day.',
        },
        {
          id: 'q18',
          textHtml: 'Near the lake, dogs must be',
          options: ['kept on a lead.', 'left at home.', 'allowed off the lead.'],
          answer: 'A',
          explanation: 'Dogs must be kept on a lead near the lake, to protect the nesting birds.',
          evidence: 'they must be kept on a lead near the lake, to protect the nesting birds.',
        },
        {
          id: 'q19',
          textHtml: 'Cycling is allowed',
          options: ['on any path in the park.', 'only on the main path.', 'nowhere in the park.'],
          answer: 'B',
          explanation: 'Cycling is permitted on the main path, but not on the smaller trails.',
          evidence: 'Cycling is permitted on the main path, but not on any of the smaller trails.',
        },
        {
          id: 'q20',
          textHtml: 'The Saturday guided walk',
          options: ['must be booked in advance.', 'leaves from the Café.', 'requires no booking.'],
          answer: 'C',
          explanation: 'No booking is required for the guided walk — visitors just turn up.',
          evidence: 'no booking is required — just turn up a few minutes early.',
        },
      ],
    },
  ],
};

// ── Section 3 — Food-waste research project meeting (Q21–30) ──────────────
const section3: TestPart = {
  label: 'Section 3',
  stimulus: {
    kind: 'audio',
    label: 'Section 3',
    src: '/audio/listening-001-s3.mp3',
    transcriptHtml: `
      <p><strong>Dr Whitfield:</strong> Come in, both of you. So, how’s the food waste project coming along?</p>
      <p><strong>Ben:</strong> Pretty well, I think. We’ve decided to focus on the two main canteens on campus rather than trying to cover every catering outlet.</p>
      <p><strong>Dr Whitfield:</strong> That sounds sensible — keeps it manageable. What’s your main research question at this stage?</p>
      <p><strong>Sara:</strong> We want to find out how much plate waste students leave, and whether portion size is the main cause, or whether it’s more about food quality.</p>
      <p><strong>Dr Whitfield:</strong> And how do you plan to collect that data?</p>
      <p><strong>Ben:</strong> I think we should weigh the food waste bins after each mealtime for two weeks. It’s more reliable than asking people how much they think they waste.</p>
      <p><strong>Sara:</strong> I actually disagree with Ben there — I think a short survey would give us useful information too, about why people leave food, not just how much.</p>
      <p><strong>Dr Whitfield:</strong> You’re both right, in a sense — weighing gives you hard numbers, but a survey explains the reasons behind them. I’d suggest doing both, if you have time.</p>
      <p><strong>Ben:</strong> Fair enough. I can take charge of the bin-weighing, since I’ve already borrowed some scales from the labs.</p>
      <p><strong>Sara:</strong> And I’ll design the survey questions, and get the ethics form approved — that has to happen before we hand anything out.</p>
      <p><strong>Dr Whitfield:</strong> Good. Have you thought about a control comparison, by the way? It would strengthen your findings.</p>
      <p><strong>Sara:</strong> We were thinking of comparing weekday lunches with weekend brunches, since weekend numbers are much smaller.</p>
      <p><strong>Dr Whitfield:</strong> That could work, though I’d actually suggest comparing the two canteens against each other instead — one serves buffet-style, the other a fixed menu, doesn’t it?</p>
      <p><strong>Ben:</strong> That’s true, and that difference in itself might explain some of the waste.</p>
      <p><strong>Dr Whitfield:</strong> Exactly. I think that comparison will be more revealing for your report.</p>
      <p><strong>Sara:</strong> Ok, we’ll switch to that. Who’s writing up the literature review?</p>
      <p><strong>Ben:</strong> I can do that part, actually, since I’ve already read most of the key studies for another module.</p>
      <p><strong>Dr Whitfield:</strong> Good, and Sara, could you contact the catering manager for permission to access the bins and put up posters?</p>
      <p><strong>Sara:</strong> Yes, I’ll email her this week.</p>
      <p><strong>Dr Whitfield:</strong> And one more thing — before our next meeting, I’d like three things done: the one-page proposal from you both, Sara’s email to the catering manager, and the survey questions ready for the ethics form. Can you manage that?</p>
      <p><strong>Ben:</strong> We can have all of that ready by Friday.</p>
      <p><strong>Dr Whitfield:</strong> Perfect. I’ll see you both again in two weeks, then.</p>
    `,
  },
  groups: [
    {
      title: 'Questions 21–24',
      type: 'matching-features',
      instructionHtml:
        'What does each speaker say about the project? Choose the correct letter, <strong>A</strong>, <strong>B</strong> or <strong>C</strong>. You may use any letter more than once.',
      legendHtml: '<strong>A</strong>&nbsp; Ben &nbsp;·&nbsp; <strong>B</strong>&nbsp; Sara &nbsp;·&nbsp; <strong>C</strong>&nbsp; Dr Whitfield',
      options: ['A', 'B', 'C'],
      questions: [
        {
          id: 'q21',
          textHtml: 'Suggests weighing the food waste bins.',
          answer: 'A',
          explanation: 'Ben suggests weighing the bins after each mealtime.',
          evidence: 'I think we should weigh the food waste bins after each mealtime for two weeks.',
        },
        {
          id: 'q22',
          textHtml: 'Proposes asking students directly why they leave food.',
          answer: 'B',
          explanation: 'Sara proposes a survey about the reasons behind the waste.',
          evidence: 'I think a short survey would give us useful information too, about why people leave food.',
        },
        {
          id: 'q23',
          textHtml: 'Recommends comparing the two canteens rather than weekday versus weekend.',
          answer: 'C',
          explanation: 'Dr Whitfield suggests comparing the two canteens instead.',
          evidence: 'I’d actually suggest comparing the two canteens against each other instead.',
        },
        {
          id: 'q24',
          textHtml: 'Will write the literature review.',
          answer: 'A',
          explanation: 'Ben volunteers to write the literature review.',
          evidence: 'I can do that part, actually, since I’ve already read most of the key studies.',
        },
      ],
    },
    {
      title: 'Questions 25–27',
      type: 'sentence-endings',
      instructionHtml:
        'Complete each sentence with the correct ending. Choose the correct letter, <strong>A</strong>–<strong>F</strong>.',
      legendHtml:
        '<strong>A</strong>&nbsp; by Friday.<br><strong>B</strong>&nbsp; because it gives concrete numbers.<br><strong>C</strong>&nbsp; because it compares two different serving styles.<br><strong>D</strong>&nbsp; before handing out any surveys.<br><strong>E</strong>&nbsp; because weekend numbers are too small.<br><strong>F</strong>&nbsp; after two weeks of weighing.',
      options: ['A', 'B', 'C', 'D', 'E', 'F'],
      questions: [
        {
          id: 'q25',
          textHtml: 'The ethics form must be approved',
          answer: 'D',
          explanation: 'Sara says ethics approval has to happen before anything is handed out.',
          evidence: 'get the ethics form approved — that has to happen before we hand anything out.',
        },
        {
          id: 'q26',
          textHtml: 'Dr Whitfield prefers comparing the two canteens',
          answer: 'C',
          explanation: 'Dr Whitfield notes the two canteens use different serving styles, buffet versus fixed menu.',
          evidence: 'one serves buffet-style, the other a fixed menu, doesn’t it?',
        },
        {
          id: 'q27',
          textHtml: 'The one-page proposal will be ready',
          answer: 'A',
          explanation: 'Ben confirms the proposal will be ready by Friday.',
          evidence: 'We can have all of that ready by Friday.',
        },
      ],
    },
    {
      title: 'Questions 28–30',
      type: 'multiple-answer',
      instructionHtml:
        'Which <strong>THREE</strong> tasks does Dr Whitfield want completed before the next meeting? Choose three.',
      selectCount: 3,
      choices: [
        { value: 'A', label: 'weigh the canteen food waste bins' },
        { value: 'B', label: 'design the survey questions for the ethics form' },
        { value: 'C', label: 'contact the catering manager' },
        { value: 'D', label: 'write the literature review' },
        { value: 'E', label: 'submit a one-page research proposal' },
        { value: 'F', label: 'present initial findings to the department' },
      ],
      explanationHtml:
        'Dr Whitfield lists exactly three things: <strong>the one-page proposal</strong>, <strong>Sara’s email to the catering manager</strong>, and <strong>the survey questions ready for the ethics form</strong>.',
      questions: [
        { id: 'q28', answer: ['B', 'C', 'E'] },
        { id: 'q29', answer: ['B', 'C', 'E'] },
        { id: 'q30', answer: ['B', 'C', 'E'] },
      ],
    },
  ],
};

// ── Section 4 — The science of habit formation (Q31–40) ────────────────────
const section4: TestPart = {
  label: 'Section 4',
  stimulus: {
    kind: 'audio',
    label: 'Section 4',
    src: '/audio/listening-001-s4.mp3',
    transcriptHtml: `
      <p>Today I want to look at something psychologists call the habit loop, and why understanding it matters far beyond the discipline of psychology itself — in public health, in marketing, even in how cities are designed.</p>
      <p>Let’s start with a definition. A habit is a behaviour that has become so automatic that we perform it with very little conscious thought — brushing your teeth, checking a phone, taking the same route to work. Researchers have identified a three-part structure behind almost every habit, known as the habit loop. The first part is the cue, a trigger that tells the brain to go into automatic mode. This might be a time of day, a particular location, an emotional state, or the presence of certain other people. The second part is the routine itself — the behaviour, whether physical, mental or emotional. And the third part is the reward, the benefit the brain gets from the behaviour, which is what teaches the brain to remember this particular loop in the future.</p>
      <p>Crucially, over time, the brain begins to crave the reward before the routine has even started, once it recognises the cue. This is what makes habits so powerful, and so difficult to break: the craving itself becomes automatic, operating below the level of conscious awareness.</p>
      <p>One of the most useful discoveries in this field is the idea of the keystone habit — a single habit that, once changed, tends to trigger a cascade of other positive changes, seemingly unrelated to the original habit. A famous example comes from a study of people who took up regular exercise. Researchers found that, without being told to, many of these people also started eating better, becoming more productive at work, and smoking less. Exercise, in this case, functioned as a keystone habit, even though none of those other changes were the direct goal.</p>
      <p>So how can this research actually help someone who wants to change a habit? The standard advice from psychologists is not to try to eliminate the cue — that’s often impossible, since cues like stress or boredom are a normal part of life. Instead, the recommendation is to keep the same cue and the same reward, but inserting a new, healthier routine in between. For example, someone who habitually eats a biscuit whenever they feel bored at their desk — the cue being boredom, the reward being a brief distraction and a sugar boost — might instead go for a two-minute walk. If the walk provides a similar sense of distraction and a comparable lift in mood, the brain may accept the substitution, and over time the new routine can become just as automatic as the old one.</p>
      <p>This research has also shaped public health campaigns. In several countries, road safety officials noticed that reminding drivers of statistics about accidents had very little effect on seatbelt use. What did work, surprisingly, was a short, simple cue — a warning chime that sounds the moment the car engine starts, if the belt is not fastened. The chime supplies an immediate, unmissable cue, and fastening the belt quickly becomes the easiest way to make the irritating sound stop — the reward, in this case, being simply relief.</p>
      <p>Retailers, too, have taken a close interest in this research, since customer habits are extremely valuable — a shopper who habitually buys the same brand of coffee, for instance, rarely compares prices or considers alternatives. Some supermarkets have used loyalty-card data specifically to identify major life changes — moving house, having a baby — because these are moments when old habits are disrupted and customers are unusually open to forming new ones.</p>
      <p>Finally, it’s worth noting that habit change is rarely instant. Contrary to the popular claim that a new habit takes exactly twenty-one days to form, actual research suggests the true figure varies enormously between people and behaviours, ranging from around three weeks for something simple, to several months for something more complex. The most reliable predictor of success, in the end, is not willpower alone, but how carefully the new routine has been designed to deliver a reward similar to the one the old habit provided.</p>
    `,
  },
  groups: [
    {
      title: 'Questions 31–40',
      type: 'sentence-completion',
      wordLimit: 2,
      instructionHtml: 'Complete the notes below. Choose <strong>NO MORE THAN TWO WORDS</strong> from the recording for each answer.',
      questions: [
        {
          id: 'q31',
          before: 'A habit is performed with very little conscious',
          after: '.',
          answer: 'thought',
          explanation: 'A habit is a behaviour performed with very little conscious thought.',
          evidence: 'we perform it with very little conscious thought.',
        },
        {
          id: 'q32',
          before: 'The first part of the habit loop is called the',
          after: '.',
          answer: 'cue',
          explanation: 'The first part is the cue, a trigger that starts the automatic behaviour.',
          evidence: 'The first part is the cue, a trigger that tells the brain to go into automatic mode.',
        },
        {
          id: 'q33',
          before: 'The second part, the behaviour itself, is called the',
          after: '.',
          answer: 'routine',
          explanation: 'The second part is the routine itself.',
          evidence: 'The second part is the routine itself — the behaviour.',
        },
        {
          id: 'q34',
          before: 'Over time, the brain begins to',
          after: 'the reward before the routine starts.',
          answer: 'crave',
          explanation: 'The brain begins to crave the reward once it recognises the cue.',
          evidence: 'the brain begins to crave the reward before the routine has even started.',
        },
        {
          id: 'q35',
          before: 'A habit that triggers a cascade of other positive changes is called a',
          after: 'habit.',
          answer: 'keystone',
          explanation: 'This is called a keystone habit.',
          evidence: 'the idea of the keystone habit.',
        },
        {
          id: 'q36',
          before: 'In the exercise study, participants also began smoking',
          after: '.',
          answer: 'less',
          explanation: 'Participants who exercised also started smoking less.',
          evidence: 'becoming more productive at work, and smoking less.',
        },
        {
          id: 'q37',
          before: 'Psychologists recommend keeping the same cue and reward, but inserting a new',
          after: '.',
          answer: ['routine', 'healthier routine'],
          explanation: 'The recommendation is to insert a new, healthier routine between the same cue and reward.',
          evidence: 'inserting a new, healthier routine in between.',
        },
        {
          id: 'q38',
          before: 'Reminding drivers of',
          after: 'about accidents had little effect on seatbelt use.',
          answer: 'statistics',
          explanation: 'Reminding drivers of statistics about accidents had very little effect.',
          evidence: 'reminding drivers of statistics about accidents had very little effect on seatbelt use.',
        },
        {
          id: 'q39',
          before: 'A warning',
          after: 'that sounds when the engine starts encourages seatbelt use.',
          answer: 'chime',
          explanation: 'A warning chime sounds the moment the engine starts.',
          evidence: 'a warning chime that sounds the moment the car engine starts.',
        },
        {
          id: 'q40',
          before: 'New habits can take from three weeks to several',
          after: 'to form.',
          answer: 'months',
          explanation: 'Forming a new habit can take from three weeks to several months.',
          evidence: 'ranging from around three weeks for something simple, to several months for something more complex.',
        },
      ],
    },
  ],
};

export const listeningFull001: PracticeTest = {
  id: 'listening-full-001',
  skill: 'listening',
  title: 'Listening — Full Test 1',
  description:
    'A complete 4-section Listening exam: booking swimming lessons, a country park guide, a student research-project meeting, and a lecture on habit formation. 40 questions.',
  durationMinutes: 30,
  parts: [section1, section2, section3, section4],
};
