/* Speaking practice prompts. Part 1 topics adapted from the material already
   taught in src/content/lesson-bodies/speaking-part1.html; Part 2 cue cards
   are original, in the standard IELTS "you should say" format, each paired
   with matching Part 3 follow-ups. Drives the Speaking Trainer at
   /trainers/speaking; more can be added freely.

   Coaching layers (all optional per the schema, all surfaced by
   SpeakingCoachPanel / IdeaHints):
   - `vocab`: topic vocabulary with meaning + example, tap-to-reveal.
   - question `ideas`: 2-3 short angles a stuck student can build an answer
     from. They suggest directions, never full sentences, so the answer
     stays the student's own.
   - cue-card `ideas`: angles for the two-minute talk, shown in prep. */

import type { CueCard, Part1Topic } from '../lib/speaking/schema';

export const SPEAKING_PART1_TOPICS: Part1Topic[] = [
  {
    id: 'p1-work',
    part: 'part1',
    topic: 'Work',
    questions: [
      {
        id: 'q1',
        text: 'What is your job?',
        ideas: ['Say what you do and where', 'Add how long you\'ve been doing it', 'A student? Describe your studies as your job'],
      },
      {
        id: 'q2',
        text: 'Why did you choose that job?',
        ideas: ['A person who inspired you?', 'Planned choice or happy accident?', 'Money, passion, or family expectations?'],
      },
      {
        id: 'q3',
        text: 'Do you like your job?',
        ideas: ['Name the best part and the worst part', 'Compare it with a job you would hate'],
      },
      {
        id: 'q4',
        text: 'Do you get on well with your colleagues?',
        ideas: ['Think of one colleague you like and why', 'Lunches together? Help when you\'re stuck?'],
      },
      {
        id: 'q5',
        text: 'Would you change your job if you could?',
        ideas: ['Your dream job if money didn\'t matter?', 'What would you miss about the current one?'],
      },
    ],
    vocab: [
      {
        phrase: 'a rewarding job',
        meaning: 'a job that gives you satisfaction beyond money',
        example: 'Teaching is exhausting but genuinely rewarding.',
      },
      {
        phrase: 'nine-to-five routine',
        meaning: 'a standard fixed office schedule',
        example: 'I\'d struggle to go back to a nine-to-five routine.',
      },
      {
        phrase: 'get on well with',
        meaning: 'have a good relationship with someone',
        example: 'I get on really well with my colleagues.',
      },
      {
        phrase: 'career prospects',
        meaning: 'your chances of promotion and future success',
        example: 'The career prospects in IT are excellent here.',
      },
      {
        phrase: 'work-life balance',
        meaning: 'the balance between your job and personal life',
        example: 'Remote work has improved my work-life balance.',
      },
    ],
  },
  {
    id: 'p1-home',
    part: 'part1',
    topic: 'Home',
    questions: [
      {
        id: 'q1',
        text: 'Do you live in a house or a flat?',
        ideas: ['Which floor, how long you\'ve lived there', 'One thing you love about it'],
      },
      {
        id: 'q2',
        text: 'Who do you live with?',
        ideas: ['Family, flatmates, or alone?', 'What\'s good (or hard) about that?'],
      },
      {
        id: 'q3',
        text: 'What is your favourite room and why?',
        ideas: ['Where do you relax best?', 'Describe the light, the furniture, what you do there'],
      },
      {
        id: 'q4',
        text: 'What would you change about your home?',
        ideas: ['More space? New furniture? A balcony garden?', 'What stops you from changing it?'],
      },
    ],
    vocab: [
      {
        phrase: 'a cosy flat',
        meaning: 'small but warm and comfortable',
        example: 'I live in a cosy flat near the centre.',
      },
      {
        phrase: 'spacious',
        meaning: 'with a lot of room',
        example: 'The kitchen is surprisingly spacious.',
      },
      {
        phrase: 'within walking distance',
        meaning: 'close enough to walk to',
        example: 'All the shops are within walking distance.',
      },
      {
        phrase: 'do a place up',
        meaning: 'repair and decorate it',
        example: 'We\'d love to do up the balcony next summer.',
      },
      {
        phrase: 'the heart of the home',
        meaning: 'the room where family life happens',
        example: 'For us the kitchen is the heart of the home.',
      },
    ],
  },
  {
    id: 'p1-hometown',
    part: 'part1',
    topic: 'Hometown',
    questions: [
      {
        id: 'q1',
        text: 'Where is your hometown?',
        ideas: ['Where it is, how big it is', 'One thing it\'s known for'],
      },
      {
        id: 'q2',
        text: 'Do you like your hometown?',
        ideas: ['Yes or no, plus the main reason', 'Would you want to raise a family there?'],
      },
      {
        id: 'q3',
        text: 'What is your hometown like?',
        ideas: ['Busy or calm? Green or concrete?', 'What surprises visitors when they arrive?'],
      },
      {
        id: 'q4',
        text: 'How could your hometown be improved?',
        ideas: ['Transport, parks, jobs, air quality?', 'Pick one fix and explain why it matters most'],
      },
      {
        id: 'q5',
        text: 'Has it changed much since you were a child?',
        ideas: ['New buildings, more people, a new metro?', 'Something that disappeared and you miss?'],
      },
    ],
    vocab: [
      {
        phrase: 'a bustling city',
        meaning: 'busy and full of life',
        example: 'Almaty is a bustling city of two million people.',
      },
      {
        phrase: 'picturesque',
        meaning: 'pretty, like a picture',
        example: 'The old town is really picturesque.',
      },
      {
        phrase: 'local landmarks',
        meaning: 'the famous places in a town',
        example: 'The cathedral is one of our best-known landmarks.',
      },
      {
        phrase: 'born and raised',
        meaning: 'having lived somewhere since birth',
        example: 'I was born and raised in Almaty.',
      },
      {
        phrase: 'undergo rapid development',
        meaning: 'change and grow very quickly',
        example: 'My district has undergone rapid development lately.',
      },
    ],
  },
  {
    id: 'p1-music',
    part: 'part1',
    topic: 'Music',
    questions: [
      {
        id: 'q1',
        text: 'What kind of music do you enjoy?',
        ideas: ['Name a genre and a favourite artist', 'When do you listen: commuting, studying, the gym?'],
      },
      {
        id: 'q2',
        text: 'Did you listen to music as a child?',
        ideas: ['Songs your family played at home', 'A song that instantly brings back a memory'],
      },
      {
        id: 'q3',
        text: 'Do you play a musical instrument?',
        ideas: ['If yes: how you learned, how often you play', 'If no: which one you\'d love to learn and why'],
      },
      {
        id: 'q4',
        text: 'Is music important in your culture?',
        ideas: ['Traditional instruments or festivals', 'Music at weddings and holidays'],
      },
    ],
    vocab: [
      {
        phrase: 'catchy',
        meaning: 'easy to remember and hard to stop humming',
        example: 'That song is so catchy I hum it all day.',
      },
      {
        phrase: 'a broad taste in music',
        meaning: 'enjoying many different genres',
        example: 'I\'ve got quite a broad taste in music.',
      },
      {
        phrase: 'a live performance',
        meaning: 'music played in front of an audience',
        example: 'Nothing beats the energy of a live performance.',
      },
      {
        phrase: 'take up an instrument',
        meaning: 'start learning to play one',
        example: 'I took up the guitar when I was twelve.',
      },
      {
        phrase: 'background music',
        meaning: 'music playing while you do something else',
        example: 'I study with quiet background music on.',
      },
    ],
  },
  {
    id: 'p1-food',
    part: 'part1',
    topic: 'Food',
    questions: [
      {
        id: 'q1',
        text: 'Do you enjoy cooking?',
        ideas: ['If yes: your signature dish', 'If no: who cooks for you, and are they good?'],
      },
      {
        id: 'q2',
        text: 'What is your favourite food?',
        ideas: ['Describe the taste and texture, not just the name', 'Who makes it best, and when do you eat it?'],
      },
      {
        id: 'q3',
        text: 'Is there any food you dislike?',
        ideas: ['A texture or smell you can\'t stand', 'A childhood food you refused to eat'],
      },
      {
        id: 'q4',
        text: 'How important is food in your culture?',
        ideas: ['Dishes for guests and holidays', 'What a shared meal means to your family'],
      },
    ],
    vocab: [
      {
        phrase: 'home-cooked meals',
        meaning: 'food made at home, not bought',
        example: 'Nothing beats my grandmother\'s home-cooked meals.',
      },
      {
        phrase: 'a staple dish',
        meaning: 'a basic dish eaten all the time in a region',
        example: 'Plov is a staple dish across Central Asia.',
      },
      {
        phrase: 'mouth-watering',
        meaning: 'looking or smelling delicious',
        example: 'The bakery smells absolutely mouth-watering.',
      },
      {
        phrase: 'eat out',
        meaning: 'eat at a restaurant instead of at home',
        example: 'We eat out maybe twice a month.',
      },
      {
        phrase: 'an acquired taste',
        meaning: 'something you learn to like over time',
        example: 'Kurt is an acquired taste, honestly.',
      },
    ],
  },
  {
    id: 'p1-transport',
    part: 'part1',
    topic: 'Transport',
    questions: [
      {
        id: 'q1',
        text: 'How do you usually travel around your city?',
        ideas: ['Your usual mode and how long it takes', 'What you do during the ride'],
      },
      {
        id: 'q2',
        text: 'Do you prefer public or private transport?',
        ideas: ['Cost, comfort, traffic, parking?', 'Does the season change your answer?'],
      },
      {
        id: 'q3',
        text: 'Is public transport good in your country?',
        ideas: ['Compare the city and the countryside', 'Price, frequency, cleanliness'],
      },
      {
        id: 'q4',
        text: 'Has transport changed much in your lifetime?',
        ideas: ['New metro lines, bike lanes, taxi apps', 'How your grandparents used to travel'],
      },
    ],
    vocab: [
      {
        phrase: 'rush hour',
        meaning: 'the busiest travel time of the day',
        example: 'The metro is packed during rush hour.',
      },
      {
        phrase: 'commute',
        meaning: 'the regular trip between home and work or school',
        example: 'My commute takes about forty minutes.',
      },
      {
        phrase: 'reliable',
        meaning: 'something you can depend on to arrive on time',
        example: 'Buses here aren\'t very reliable, sadly.',
      },
      {
        phrase: 'traffic congestion',
        meaning: 'heavy, slow-moving traffic',
        example: 'Traffic congestion is the city\'s biggest headache.',
      },
      {
        phrase: 'get around',
        meaning: 'travel from place to place',
        example: 'The easiest way to get around is by bike.',
      },
    ],
  },
];

export const SPEAKING_CUE_CARDS: CueCard[] = [
  {
    id: 'p2-journey',
    part: 'part2and3',
    topic: 'Describe a memorable journey or trip you have taken.',
    bullets: [
      'where you went',
      'who you went with',
      'what you did during the trip',
      'and explain why the journey was memorable',
    ],
    ideas: [
      'A trip that went wrong makes a great story too',
      'Use the senses: what you saw, ate, and heard',
      'End with how the trip changed you',
    ],
    vocab: [
      {
        phrase: 'set off',
        meaning: 'begin a journey',
        example: 'We set off before sunrise to catch the train.',
      },
      {
        phrase: 'breathtaking scenery',
        meaning: 'extremely beautiful views',
        example: 'The mountain pass had breathtaking scenery.',
      },
      {
        phrase: 'off the beaten track',
        meaning: 'far from the usual tourist places',
        example: 'We stayed in a village well off the beaten track.',
      },
      {
        phrase: 'broaden your horizons',
        meaning: 'widen your experience of the world',
        example: 'Travelling alone really broadened my horizons.',
      },
      {
        phrase: 'a once-in-a-lifetime experience',
        meaning: 'something you\'ll probably never get to repeat',
        example: 'Seeing the desert at night was a once-in-a-lifetime experience.',
      },
    ],
    part3Questions: [
      {
        id: 'q1',
        text: 'Why do some people prefer to travel abroad rather than explore their own country?',
        ideas: ['Prestige, curiosity, social media?', 'Cost and convenience play a role too'],
      },
      {
        id: 'q2',
        text: 'How do you think tourism will change in the next twenty years?',
        ideas: ['Space tourism, eco-travel, virtual tours?', 'Cheaper flights, or climate limits on flying?'],
      },
      {
        id: 'q3',
        text: 'What are the benefits and drawbacks of mass tourism for a country?',
        ideas: ['Jobs and income versus crowds and prices', 'The effect on locals and the environment'],
      },
    ],
  },
  {
    id: 'p2-influence',
    part: 'part2and3',
    topic: 'Describe a person who has had a significant influence on your life.',
    bullets: [
      'who this person is',
      'how you know them',
      'what this person has done',
      'and explain why they have had such a significant influence on you',
    ],
    ideas: [
      'A family member, teacher, coach, or friend',
      'One specific moment that shows their influence',
      'Compare who you\'d be without them',
    ],
    vocab: [
      {
        phrase: 'a role model',
        meaning: 'a person whose behaviour you try to copy',
        example: 'My aunt has always been my role model.',
      },
      {
        phrase: 'look up to',
        meaning: 'admire and respect someone',
        example: 'I\'ve looked up to my coach since I was ten.',
      },
      {
        phrase: 'shape someone\'s character',
        meaning: 'influence who a person becomes',
        example: 'Those years with her really shaped my character.',
      },
      {
        phrase: 'lead by example',
        meaning: 'show how to behave through actions, not words',
        example: 'She never lectured us; she led by example.',
      },
      {
        phrase: 'instil values in someone',
        meaning: 'teach values gradually over time',
        example: 'He instilled a love of reading in me.',
      },
    ],
    part3Questions: [
      {
        id: 'q1',
        text: 'Do you think teachers today have as much influence on young people as they used to?',
        ideas: ['Teachers versus online influencers', 'Has respect for the profession changed?'],
      },
      {
        id: 'q2',
        text: 'What qualities make someone a good role model?',
        ideas: ['Honesty, consistency, resilience?', 'Fame versus character'],
      },
      {
        id: 'q3',
        text: 'Is it more common for people to look up to family members or public figures nowadays?',
        ideas: ['Who do young people actually copy?', 'The role social media plays in that'],
      },
    ],
  },
  {
    id: 'p2-skill',
    part: 'part2and3',
    topic: 'Describe a skill you have learned that you consider useful.',
    bullets: [
      'what the skill is',
      'how and when you learned it',
      'how often you use it',
      'and explain why you consider it useful',
    ],
    ideas: [
      'Cooking, driving, a language, an instrument, coding',
      'Tell the story of the first time it actually worked',
      'Who taught you, and what was hardest at the start',
    ],
    vocab: [
      {
        phrase: 'pick up a skill',
        meaning: 'learn it, often informally',
        example: 'I picked up basic coding from online videos.',
      },
      {
        phrase: 'learn the ropes',
        meaning: 'learn how something is done',
        example: 'It took me a month to learn the ropes.',
      },
      {
        phrase: 'trial and error',
        meaning: 'trying repeatedly until something works',
        example: 'I learned mostly through trial and error.',
      },
      {
        phrase: 'come in handy',
        meaning: 'turn out to be useful',
        example: 'Speaking English comes in handy whenever I travel.',
      },
      {
        phrase: 'master a skill',
        meaning: 'become truly expert at it',
        example: 'It takes years to master an instrument.',
      },
    ],
    part3Questions: [
      {
        id: 'q1',
        text: 'What skills do you think will be most important for young people in the future?',
        ideas: ['Tech skills, communication, adaptability?', 'Skills that school doesn\'t teach'],
      },
      {
        id: 'q2',
        text: 'Is it better to learn a skill formally or through practice?',
        ideas: ['Theory versus muscle memory', 'Does it depend on the skill? Surgery versus cooking'],
      },
      {
        id: 'q3',
        text: 'How has technology changed the way people learn new skills?',
        ideas: ['Video tutorials and apps replacing teachers?', 'Is self-taught respected as much as certified?'],
      },
    ],
  },
];
