/* Speaking practice prompts. Part 1 topics adapted from the material already
   taught in src/content/lesson-bodies/speaking-part1.html; Part 2 cue cards
   are original, in the standard IELTS "you should say" format, each paired
   with matching Part 3 follow-ups. Drives the speaking checker at
   /speaking/checker; more can be added freely. */

import type { CueCard, Part1Topic } from '../lib/speaking/schema';

export const SPEAKING_PART1_TOPICS: Part1Topic[] = [
  {
    id: 'p1-work',
    part: 'part1',
    topic: 'Work',
    questions: [
      { id: 'q1', text: 'What is your job?' },
      { id: 'q2', text: 'Why did you choose that job?' },
      { id: 'q3', text: 'Do you like your job?' },
      { id: 'q4', text: 'Do you get on well with your colleagues?' },
      { id: 'q5', text: 'Would you change your job if you could?' },
    ],
  },
  {
    id: 'p1-home',
    part: 'part1',
    topic: 'Home',
    questions: [
      { id: 'q1', text: 'Do you live in a house or a flat?' },
      { id: 'q2', text: 'Who do you live with?' },
      { id: 'q3', text: 'What is your favourite room and why?' },
      { id: 'q4', text: 'What would you change about your home?' },
    ],
  },
  {
    id: 'p1-hometown',
    part: 'part1',
    topic: 'Hometown',
    questions: [
      { id: 'q1', text: 'Where is your hometown?' },
      { id: 'q2', text: 'Do you like your hometown?' },
      { id: 'q3', text: 'What is your hometown like?' },
      { id: 'q4', text: 'How could your hometown be improved?' },
      { id: 'q5', text: 'Has it changed much since you were a child?' },
    ],
  },
  {
    id: 'p1-music',
    part: 'part1',
    topic: 'Music',
    questions: [
      { id: 'q1', text: 'What kind of music do you enjoy?' },
      { id: 'q2', text: 'Did you listen to music as a child?' },
      { id: 'q3', text: 'Do you play a musical instrument?' },
      { id: 'q4', text: 'Is music important in your culture?' },
    ],
  },
  {
    id: 'p1-food',
    part: 'part1',
    topic: 'Food',
    questions: [
      { id: 'q1', text: 'Do you enjoy cooking?' },
      { id: 'q2', text: 'What is your favourite food?' },
      { id: 'q3', text: 'Is there any food you dislike?' },
      { id: 'q4', text: 'How important is food in your culture?' },
    ],
  },
  {
    id: 'p1-transport',
    part: 'part1',
    topic: 'Transport',
    questions: [
      { id: 'q1', text: 'How do you usually travel around your city?' },
      { id: 'q2', text: 'Do you prefer public or private transport?' },
      { id: 'q3', text: 'Is public transport good in your country?' },
      { id: 'q4', text: 'Has transport changed much in your lifetime?' },
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
    part3Questions: [
      { id: 'q1', text: 'Why do some people prefer to travel abroad rather than explore their own country?' },
      { id: 'q2', text: 'How do you think tourism will change in the next twenty years?' },
      { id: 'q3', text: 'What are the benefits and drawbacks of mass tourism for a country?' },
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
    part3Questions: [
      { id: 'q1', text: 'Do you think teachers today have as much influence on young people as they used to?' },
      { id: 'q2', text: 'What qualities make someone a good role model?' },
      { id: 'q3', text: 'Is it more common for people to look up to family members or public figures nowadays?' },
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
    part3Questions: [
      { id: 'q1', text: 'What skills do you think will be most important for young people in the future?' },
      { id: 'q2', text: 'Is it better to learn a skill formally or through practice?' },
      { id: 'q3', text: 'How has technology changed the way people learn new skills?' },
    ],
  },
];
