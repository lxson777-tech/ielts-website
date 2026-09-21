/* Structure guides ported from the writing lessons (universal method plus
   per-variant adaptation in src/content/lesson-bodies/writing-*.html),
   surfaced live as a coaching cheat-sheet during the writing checker instead
   of staying buried in the lesson pages.

   Translation rule for this file: the advice is marked with nt() and put
   through t() by WritingCoachPanel, with the Russian in the lazily loaded
   "structures" dictionary part. The `phrases` column is NOT marked, and must
   never be: those are the English sentence openers a student copies into
   their own essay, which is the whole reason the Language tab exists. */

import { nt } from '../lib/i18n/translate';

export interface WritingParagraph {
  /** Translated: a structural label, not exam wording. */
  name: string;
  /** Translated. English model wording quoted inside stays English. */
  description: string;
}

export interface WritingLanguageRow {
  /** Translated: what this row of phrases is for. */
  job: string;
  /** NEVER translated: the English the student is meant to reuse. */
  phrases: string;
}

export interface WritingStructure {
  label: string;
  paragraphs: WritingParagraph[];
  /** Supplementary bullets: "what to look for" for Task 1,
      pattern-recognition for Task 2. Translated. */
  notes?: string[];
  language: WritingLanguageRow[];
  mistakes: string[];
}

type VariantKey =
  | 'opinion'
  | 'discussion'
  | 'problem-solution'
  | 'advantages-disadvantages'
  | 'two-part'
  | 'chart'
  | 'process'
  | 'map';

/* Shared Task 1 report skeleton (writing-method.html): chart, process and
   map lessons all defer structure to this and only add "what to look for". */
const TASK1_SKELETON: WritingParagraph[] = [
  {
    name: nt('Introduction'),
    description: nt(
      'Paraphrase what the visual shows. Never copy the question wording. Keep the place, units and time period.',
    ),
  },
  {
    name: nt('Overview'),
    description: nt(
      'The most important paragraph. Start with "Overall,". Give the 2-3 key features, saving the figures for the detail paragraphs. Task Achievement asks for a clear overview from Band 6 upwards.',
    ),
  },
  {
    name: nt('Detail 1'),
    description: nt('The first logical group of information, supported with selected figures.'),
  },
  {
    name: nt('Detail 2'),
    description: nt(
      'The remaining group. Every line, stage or area must be mentioned, even briefly. Compare across groups where you can.',
    ),
  },
];

export const WRITING_STRUCTURES: Record<VariantKey, WritingStructure> = {
  opinion: {
    label: nt('Opinion Essay'),
    paragraphs: [
      {
        name: nt('Introduction'),
        description: nt('Paraphrase the statement, then state your position: "While some argue…, I firmly believe…"'),
      },
      { name: nt('Body 1'), description: nt('First reason. Topic sentence → explanation → example (TEE).') },
      {
        name: nt('Body 2'),
        description: nt('Second reason, same TEE shape. Or the concession for a partial-agreement essay ("Admittedly…, however…").'),
      },
      { name: nt('Conclusion'), description: nt('Restate your position in fresh words. No new ideas.') },
    ],
    language: [
      { job: nt('Stating opinion'), phrases: 'I firmly believe that / In my view / I am convinced that' },
      { job: nt('Partial agreement'), phrases: 'While there is some truth in…, I would argue / I agree to a limited extent' },
      { job: nt('Conceding'), phrases: 'Admittedly / It is true that… However,' },
      { job: nt('Supporting'), phrases: 'The main reason is that / This is largely because / A clear illustration of this is' },
      { job: nt('Concluding'), phrases: 'In conclusion / To sum up, … for the reasons outlined above' },
    ],
    mistakes: [
      nt('No clear position. Describing both sides and never choosing'),
      nt('Position flips between introduction and conclusion'),
      nt('Answering a different question than the one asked'),
      nt('New arguments appearing in the conclusion'),
    ],
  },
  discussion: {
    label: nt('Discussion Essay'),
    paragraphs: [
      { name: nt('Introduction'), description: nt('Paraphrase both views + state your opinion.') },
      { name: nt('Body 1'), description: nt('The first view. Why people hold it, with an example.') },
      {
        name: nt('Body 2'),
        description: nt("The second view, same depth. Don't let your preferred view get all the space."),
      },
      {
        name: nt('Body 3 (optional)'),
        description: nt('Your own position developed, especially if it blends the two.'),
      },
      {
        name: nt('Conclusion'),
        description: nt('Summarise both sides in a phrase and restate where you stand.'),
      },
    ],
    language: [
      { job: nt('View A'), phrases: 'Proponents argue that / Those in favour claim / It is often said that' },
      { job: nt('View B'), phrases: 'Opponents counter that / Critics point out / Others take the view that' },
      { job: nt('Weighing'), phrases: 'There is merit in both positions / The stronger argument, however,' },
      { job: nt('Your voice'), phrases: 'In my view / I am inclined to agree with / My own position is that' },
    ],
    mistakes: [
      nt('Discussing only the view you support'),
      nt('Forgetting to give your own opinion at all'),
      nt('Straw-manning the view you dislike in one dismissive sentence'),
      nt('Unsignalled voices. Whose opinion is this sentence?'),
    ],
  },
  'problem-solution': {
    label: nt('Problem / Solution Essay'),
    paragraphs: [
      {
        name: nt('Introduction'),
        description: nt(
          'Paraphrase the situation + roadmap matching your pattern (cause+solution / problem+solution / cause+effect / solution-only).',
        ),
      },
      {
        name: nt('Body 1'),
        description: nt('The first half of your pattern (causes / problems), each explained with a consequence or example.'),
      },
      {
        name: nt('Body 2'),
        description: nt('The second half of your pattern (solutions / effects). Matched one-for-one where the pattern requires it.'),
      },
      { name: nt('Conclusion'), description: nt('One sentence of summary + an outlook.') },
    ],
    notes: [
      nt('Cause + Solution. "What are the causes? What solutions can be proposed?"'),
      nt('Problem + Solution. "What problems does this cause? How can these be solved?"'),
      nt('Cause + Effect: "What are the causes? What effects does it have?" (no solution word anywhere, so don\'t propose any)'),
      nt('Solution-only. "What can be done to address this?" (causes/problems not asked)'),
    ],
    language: [
      { job: nt('Cause'), phrases: 'stems from / is largely driven by / can be traced to' },
      { job: nt('Effect'), phrases: 'leads to / results in / gives rise to / the knock-on effect is' },
      { job: nt('Proposing'), phrases: 'One effective measure would be / Governments should / A practical step is to' },
      { job: nt('Evaluating'), phrases: 'This has already proved successful in / Although costly, this would / The main obstacle is' },
    ],
    mistakes: [
      nt('Adding solutions to a Cause + Effect question that never asked for any'),
      nt('Answering "causes" when the question asked "problems" (or vice versa)'),
      nt("Solutions that don't match any stated problem or cause"),
      nt('A shopping list of five one-line ideas instead of two developed ones'),
    ],
  },
  'advantages-disadvantages': {
    label: nt('Advantages & Disadvantages Essay'),
    paragraphs: [
      {
        name: nt('Introduction'),
        description: nt('Paraphrase the topic. Neutral form: preview both sides. Opinion form: also state your verdict here.'),
      },
      {
        name: nt('Body 1. Advantages'),
        description: nt('Your strongest 1-2 benefits, each with TEE (Topic → Explanation → Example).'),
      },
      {
        name: nt('Body 2 (Disadvantages)'),
        description: nt(
          "Your strongest 1-2 drawbacks, same TEE shape and the same length as Body 1. Don't let one side dominate.",
        ),
      },
      {
        name: nt('Conclusion'),
        description: nt(
          'Neutral form summarises both sides evenly; opinion form restates your verdict, weighing the two against each other.',
        ),
      },
    ],
    notes: [
      nt('Neutral form: "What are the advantages and disadvantages of this?". No opinion required.'),
      nt('Opinion form: "Do the advantages outweigh the disadvantages?". You must state and defend a verdict.'),
    ],
    language: [
      {
        job: nt('Introducing advantages'),
        phrases: 'One major benefit of this is / A key advantage is that / This offers several benefits, chief among them',
      },
      {
        job: nt('Introducing disadvantages'),
        phrases: 'On the other hand, a significant drawback is / However, this approach is not without its problems',
      },
      {
        job: nt('Weighing (opinion form)'),
        phrases: 'On balance, / Weighing these factors, / Despite these benefits, the drawbacks ultimately outweigh them',
      },
      { job: nt('Linking within a side'), phrases: 'In addition / Furthermore / Equally important is' },
    ],
    mistakes: [
      nt('Writing a neutral essay when the question asked "do the advantages outweigh". No verdict given'),
      nt('Sneaking a personal opinion into a neutral-form essay that never asked for one'),
      nt('Giving four rushed one-line points instead of two well-developed ones per side'),
      nt('Devoting three sentences to advantages and one to disadvantages (or vice versa)'),
    ],
  },
  'two-part': {
    label: nt('Two-Part Question Essay'),
    paragraphs: [
      {
        name: nt('Introduction'),
        description: nt('Paraphrase the situation + answer both questions in miniature.'),
      },
      { name: nt('Body 1 = Question 1'), description: nt('Answer it completely, with explanation and example.') },
      {
        name: nt('Body 2 = Question 2'),
        description: nt('Answer it completely. Give it the same length and effort as Body 1.'),
      },
      { name: nt('Conclusion'), description: nt('Both answers restated in one or two sentences.') },
    ],
    notes: [
      nt('One question, rare: still four paragraphs. Split your answer into two distinct angles.'),
      nt('Two questions, the standard form: one body paragraph per question.'),
      nt('Three questions, occasional: five paragraphs, or merge the two most closely related.'),
    ],
    language: [
      { job: nt('Reasons'), phrases: 'The principal driver of this trend is / This is largely explained by / A further factor is' },
      {
        job: nt('Positive / negative'),
        phrases: 'On balance, I see this as / a broadly beneficial development / the drawbacks outweigh the gains',
      },
      { job: nt('Effects'), phrases: 'The most immediate consequence is / In the longer term, this may' },
      { job: nt('Balancing'), phrases: 'Although there are undeniable downsides, / provided that…, the benefits prevail' },
    ],
    mistakes: [
      nt('Spending 80% of the essay on question 1 and a rushed sentence on question 2'),
      nt('Answering "positive or negative?" with a list of both and no verdict'),
      nt('Merging every question into one muddled paragraph, whatever the count'),
      nt('Introduction that only paraphrases and previews nothing'),
    ],
  },
  chart: {
    label: nt('Charts, Graphs & Tables'),
    paragraphs: TASK1_SKELETON,
    notes: [
      nt(
        'Change over time (line graph, dated bars): overall direction, highest peak/lowest point, fastest change, crossovers, start vs end values.',
      ),
      nt(
        'Static comparison (pie, table, one-date bars): largest/smallest categories, anything roughly equal, anything dominant (>50%), striking gaps.',
      ),
      nt('Tables: scan both directions, down the columns and across the rows, and report the extremes, not the middle.'),
      nt(
        'Two visuals together: connect them in the overview ("while X…, Y…"). Never describe them one after another as separate reports.',
      ),
    ],
    language: [
      { job: nt('Up'), phrases: 'rose, climbed, increased, surged / a rise, an increase, an upward trend' },
      { job: nt('Down'), phrases: 'fell, dropped, declined, plummeted / a fall, a drop, a decline' },
      { job: nt('Flat'), phrases: 'remained stable, levelled off, plateaued' },
      { job: nt('Up & down'), phrases: 'fluctuated, varied / a fluctuation, volatility' },
      { job: nt('Extremes'), phrases: 'peaked at, hit a low of / a peak, a high point, a trough' },
      { job: nt('Grading change'), phrases: 'slightly, gradually, steadily, considerably, sharply, dramatically' },
    ],
    mistakes: [
      nt('Copying the question wording into the introduction'),
      nt('No overview. The Band 5 descriptor is written for exactly this, so it holds Task Achievement down'),
      nt('Listing every data point instead of selecting key features'),
      nt('Giving an opinion, or explaining causes the data does not show'),
      nt('Describing categories one by one with no comparison'),
    ],
  },
  process: {
    label: nt('Process Diagram'),
    paragraphs: TASK1_SKELETON,
    notes: [
      nt('How many stages are there?. Goes straight into your overview.'),
      nt('Where does it start and end?. The other half of the overview.'),
      nt('Linear or cyclical? Does it finish, or loop back to the beginning?'),
      nt('Natural (active voice, "the water evaporates") or man-made (passive voice, "the glass is crushed")?'),
      nt('Where will you split the stages for your two detail paragraphs?'),
    ],
    language: [
      { job: nt('Sequencing'), phrases: 'First / To begin with / Next / Following this / Subsequently / After that / Finally' },
      { job: nt('Passive voice'), phrases: 'the bottles are collected / the mixture is heated / the products are then delivered' },
      { job: nt('Purpose'), phrases: 'in order to remove impurities / so that it can be reused' },
      { job: nt('Simultaneity'), phrases: 'meanwhile / at the same time / during this stage' },
      { job: nt('Cycles'), phrases: 'the cycle then repeats / returns to the first stage' },
    ],
    mistakes: [
      nt('Forgetting the overview because "there are no trends". Count the stages instead'),
      nt('Active voice everywhere ("someone collects the bottles")'),
      nt('Skipping stages or inventing extra ones'),
      nt('Only using "then… then… then" to sequence'),
    ],
  },
  map: {
    label: nt('Maps & Plans'),
    paragraphs: TASK1_SKELETON,
    notes: [
      nt('Check the dates. Past → past, or past → present decides your tenses.'),
      nt('Find north and the main fixed reference points.'),
      nt('Scan for four kinds of change: what disappeared, what appeared, what changed use, what grew or shrank.'),
      nt('Name the headline transformation for the overview.'),
      nt('Note what stayed the same. Worth a sentence.'),
    ],
    language: [
      { job: nt('Location'), phrases: 'in the north-east of / on the southern edge / adjacent to / opposite / alongside' },
      { job: nt('Additions'), phrases: 'a marina was constructed / a shopping centre has been built / new housing appeared' },
      { job: nt('Removals'), phrases: 'the forest was cut down / the factory was demolished / the fields disappeared' },
      { job: nt('Replacement'), phrases: 'the farmland was converted into… / gave way to… / was replaced by…' },
      { job: nt('Expansion'), phrases: 'the harbour was extended / the road was widened / the village expanded considerably' },
    ],
    mistakes: [
      nt('Describing each map separately instead of the changes between them'),
      nt('Compass confusion. Check north before you write'),
      nt('Present tense for things that happened between the two dates'),
      nt('Ignoring features that did not change'),
    ],
  },
};

export const PROMPT_VARIANT_STRUCTURE: Record<string, VariantKey> = {
  opinion: 'opinion',
  discussion: 'discussion',
  'problem-solution': 'problem-solution',
  'advantages-disadvantages': 'advantages-disadvantages',
  'two-part': 'two-part',
  chart: 'chart',
  'line-graph': 'chart',
  'bar-chart': 'chart',
  'pie-chart': 'chart',
  table: 'chart',
  combination: 'chart',
  process: 'process',
  map: 'map',
};
