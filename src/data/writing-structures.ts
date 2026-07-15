/* Structure guides ported from the writing lessons (universal method +
   per-variant adaptation in src/content/lesson-bodies/writing-*.html) —
   surfaced live as a coaching cheat-sheet during the writing checker instead
   of staying buried in the lesson pages. */

export interface WritingParagraph {
  name: string;
  description: string;
}

export interface WritingLanguageRow {
  job: string;
  phrases: string;
}

export interface WritingStructure {
  label: string;
  paragraphs: WritingParagraph[];
  /** supplementary bullets — "what to look for" for Task 1, pattern-recognition for Task 2 */
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
  | 'map'
  | 'letter';

/* Shared Task 1 report skeleton (writing-method.html) — chart, process and
   map lessons all defer structure to this and only add "what to look for". */
const TASK1_SKELETON: WritingParagraph[] = [
  { name: 'Introduction', description: 'Paraphrase what the visual shows. Never copy the question wording. Keep the place, units and time period.' },
  { name: 'Overview', description: 'The most important paragraph. Start with "Overall,". Give the 2-3 key features. No numbers. Without this, Task Achievement is capped around Band 5.' },
  { name: 'Detail 1', description: 'The first logical group of information, supported with selected figures.' },
  { name: 'Detail 2', description: 'The remaining group. Every line, stage or area must be mentioned, even briefly. Compare across groups where you can.' },
];

export const WRITING_STRUCTURES: Record<VariantKey, WritingStructure> = {
  opinion: {
    label: 'Opinion Essay',
    paragraphs: [
      { name: 'Introduction', description: 'Paraphrase the statement, then state your position: "While some argue…, I firmly believe…"' },
      { name: 'Body 1', description: 'First reason. Topic sentence → explanation → example (TEE).' },
      { name: 'Body 2', description: 'Second reason, same TEE shape. Or the concession for a partial-agreement essay ("Admittedly…, however…").' },
      { name: 'Conclusion', description: 'Restate your position in fresh words. No new ideas.' },
    ],
    language: [
      { job: 'Stating opinion', phrases: 'I firmly believe that / In my view / I am convinced that' },
      { job: 'Partial agreement', phrases: 'While there is some truth in…, I would argue / I agree to a limited extent' },
      { job: 'Conceding', phrases: 'Admittedly / It is true that… However,' },
      { job: 'Supporting', phrases: 'The main reason is that / This is largely because / A clear illustration of this is' },
      { job: 'Concluding', phrases: 'In conclusion / To sum up, … for the reasons outlined above' },
    ],
    mistakes: [
      'No clear position. Describing both sides and never choosing',
      'Position flips between introduction and conclusion',
      'Answering a different question than the one asked',
      'New arguments appearing in the conclusion',
    ],
  },
  discussion: {
    label: 'Discussion Essay',
    paragraphs: [
      { name: 'Introduction', description: 'Paraphrase both views + state your opinion.' },
      { name: 'Body 1', description: 'The first view. Why people hold it, with an example.' },
      { name: 'Body 2', description: "The second view, same depth. Don't let your preferred view get all the space." },
      { name: 'Body 3 (optional)', description: 'Your own position developed, especially if it blends the two.' },
      { name: 'Conclusion', description: 'Summarise both sides in a phrase and restate where you stand.' },
    ],
    language: [
      { job: 'View A', phrases: 'Proponents argue that / Those in favour claim / It is often said that' },
      { job: 'View B', phrases: 'Opponents counter that / Critics point out / Others take the view that' },
      { job: 'Weighing', phrases: 'There is merit in both positions / The stronger argument, however,' },
      { job: 'Your voice', phrases: 'In my view / I am inclined to agree with / My own position is that' },
    ],
    mistakes: [
      'Discussing only the view you support',
      'Forgetting to give your own opinion at all',
      'Straw-manning the view you dislike in one dismissive sentence',
      'Unsignalled voices. Whose opinion is this sentence?',
    ],
  },
  'problem-solution': {
    label: 'Problem / Solution Essay',
    paragraphs: [
      { name: 'Introduction', description: 'Paraphrase the situation + roadmap matching your pattern (cause+solution / problem+solution / cause+effect / solution-only).' },
      { name: 'Body 1', description: 'The first half of your pattern (causes / problems), each explained with a consequence or example.' },
      { name: 'Body 2', description: 'The second half of your pattern (solutions / effects). Matched one-for-one where the pattern requires it.' },
      { name: 'Conclusion', description: 'One sentence of summary + an outlook.' },
    ],
    notes: [
      'Cause + Solution. "What are the causes? What solutions can be proposed?"',
      'Problem + Solution. "What problems does this cause? How can these be solved?"',
      'Cause + Effect: "What are the causes? What effects does it have?" (no solution word anywhere, so don\'t propose any)',
      'Solution-only. "What can be done to address this?" (causes/problems not asked)',
    ],
    language: [
      { job: 'Cause', phrases: 'stems from / is largely driven by / can be traced to' },
      { job: 'Effect', phrases: 'leads to / results in / gives rise to / the knock-on effect is' },
      { job: 'Proposing', phrases: 'One effective measure would be / Governments should / A practical step is to' },
      { job: 'Evaluating', phrases: 'This has already proved successful in / Although costly, this would / The main obstacle is' },
    ],
    mistakes: [
      'Adding solutions to a Cause + Effect question that never asked for any',
      'Answering "causes" when the question asked "problems" (or vice versa)',
      "Solutions that don't match any stated problem or cause",
      'A shopping list of five one-line ideas instead of two developed ones',
    ],
  },
  'advantages-disadvantages': {
    label: 'Advantages & Disadvantages Essay',
    paragraphs: [
      { name: 'Introduction', description: 'Paraphrase the topic. Neutral form: preview both sides. Opinion form: also state your verdict here.' },
      { name: 'Body 1. Advantages', description: 'Your strongest 1-2 benefits, each with TEE (Topic → Explanation → Example).' },
      { name: 'Body 2 (Disadvantages)', description: "Your strongest 1-2 drawbacks, same TEE shape and the same length as Body 1. Don't let one side dominate." },
      { name: 'Conclusion', description: 'Neutral form summarises both sides evenly; opinion form restates your verdict, weighing the two against each other.' },
    ],
    notes: [
      'Neutral form: "What are the advantages and disadvantages of this?". No opinion required.',
      'Opinion form: "Do the advantages outweigh the disadvantages?". You must state and defend a verdict.',
    ],
    language: [
      { job: 'Introducing advantages', phrases: 'One major benefit of this is / A key advantage is that / This offers several benefits, chief among them' },
      { job: 'Introducing disadvantages', phrases: 'On the other hand, a significant drawback is / However, this approach is not without its problems' },
      { job: 'Weighing (opinion form)', phrases: 'On balance, / Weighing these factors, / Despite these benefits, the drawbacks ultimately outweigh them' },
      { job: 'Linking within a side', phrases: 'In addition / Furthermore / Equally important is' },
    ],
    mistakes: [
      'Writing a neutral essay when the question asked "do the advantages outweigh". No verdict given',
      'Sneaking a personal opinion into a neutral-form essay that never asked for one',
      'Giving four rushed one-line points instead of two well-developed ones per side',
      'Devoting three sentences to advantages and one to disadvantages (or vice versa)',
    ],
  },
  'two-part': {
    label: 'Two-Part Question Essay',
    paragraphs: [
      { name: 'Introduction', description: 'Paraphrase the situation + answer both questions in miniature.' },
      { name: 'Body 1 = Question 1', description: 'Answer it completely, with explanation and example.' },
      { name: 'Body 2 = Question 2', description: 'Answer it completely. Give it the same length and effort as Body 1.' },
      { name: 'Conclusion', description: 'Both answers restated in one or two sentences.' },
    ],
    notes: [
      'One question, rare: still four paragraphs. Split your answer into two distinct angles.',
      'Two questions, the standard form: one body paragraph per question.',
      'Three questions, occasional: five paragraphs, or merge the two most closely related.',
    ],
    language: [
      { job: 'Reasons', phrases: 'The principal driver of this trend is / This is largely explained by / A further factor is' },
      { job: 'Positive / negative', phrases: 'On balance, I see this as / a broadly beneficial development / the drawbacks outweigh the gains' },
      { job: 'Effects', phrases: 'The most immediate consequence is / In the longer term, this may' },
      { job: 'Balancing', phrases: 'Although there are undeniable downsides, / provided that…, the benefits prevail' },
    ],
    mistakes: [
      'Spending 80% of the essay on question 1 and a rushed sentence on question 2',
      'Answering "positive or negative?" with a list of both and no verdict',
      'Merging every question into one muddled paragraph, whatever the count',
      'Introduction that only paraphrases and previews nothing',
    ],
  },
  chart: {
    label: 'Charts, Graphs & Tables',
    paragraphs: TASK1_SKELETON,
    notes: [
      'Change over time (line graph, dated bars): overall direction, highest peak/lowest point, fastest change, crossovers, start vs end values.',
      'Static comparison (pie, table, one-date bars): largest/smallest categories, anything roughly equal, anything dominant (>50%), striking gaps.',
      'Tables: scan both directions, down the columns and across the rows, and report the extremes, not the middle.',
      'Two visuals together: connect them in the overview ("while X…, Y…"). Never describe them one after another as separate reports.',
    ],
    language: [
      { job: 'Up', phrases: 'rose, climbed, increased, surged / a rise, an increase, an upward trend' },
      { job: 'Down', phrases: 'fell, dropped, declined, plummeted / a fall, a drop, a decline' },
      { job: 'Flat', phrases: 'remained stable, levelled off, plateaued' },
      { job: 'Up & down', phrases: 'fluctuated, varied / a fluctuation, volatility' },
      { job: 'Extremes', phrases: 'peaked at, hit a low of / a peak, a high point, a trough' },
      { job: 'Grading change', phrases: 'slightly, gradually, steadily, considerably, sharply, dramatically' },
    ],
    mistakes: [
      'Copying the question wording into the introduction',
      'No overview. An instant Task Achievement ceiling of Band 5',
      'Listing every data point instead of selecting key features',
      'Writing a conclusion or giving an opinion',
      'Describing categories one by one with no comparison',
    ],
  },
  process: {
    label: 'Process Diagram',
    paragraphs: TASK1_SKELETON,
    notes: [
      'How many stages are there?. Goes straight into your overview.',
      'Where does it start and end?. The other half of the overview.',
      'Linear or cyclical? Does it finish, or loop back to the beginning?',
      'Natural (active voice, "the water evaporates") or man-made (passive voice, "the glass is crushed")?',
      'Where will you split the stages for your two detail paragraphs?',
    ],
    language: [
      { job: 'Sequencing', phrases: 'First / To begin with / Next / Following this / Subsequently / After that / Finally' },
      { job: 'Passive voice', phrases: 'the bottles are collected / the mixture is heated / the products are then delivered' },
      { job: 'Purpose', phrases: 'in order to remove impurities / so that it can be reused' },
      { job: 'Simultaneity', phrases: 'meanwhile / at the same time / during this stage' },
      { job: 'Cycles', phrases: 'the cycle then repeats / returns to the first stage' },
    ],
    mistakes: [
      'Forgetting the overview because "there are no trends". Count the stages instead',
      'Active voice everywhere ("someone collects the bottles")',
      'Skipping stages or inventing extra ones',
      'Only using "then… then… then" to sequence',
    ],
  },
  map: {
    label: 'Maps & Plans',
    paragraphs: TASK1_SKELETON,
    notes: [
      'Check the dates. Past → past, or past → present decides your tenses.',
      'Find north and the main fixed reference points.',
      'Scan for four kinds of change: what disappeared, what appeared, what changed use, what grew or shrank.',
      'Name the headline transformation for the overview.',
      'Note what stayed the same. Worth a sentence.',
    ],
    language: [
      { job: 'Location', phrases: 'in the north-east of / on the southern edge / adjacent to / opposite / alongside' },
      { job: 'Additions', phrases: 'a marina was constructed / a shopping centre has been built / new housing appeared' },
      { job: 'Removals', phrases: 'the forest was cut down / the factory was demolished / the fields disappeared' },
      { job: 'Replacement', phrases: 'the farmland was converted into… / gave way to… / was replaced by…' },
      { job: 'Expansion', phrases: 'the harbour was extended / the road was widened / the village expanded considerably' },
    ],
    mistakes: [
      'Describing each map separately instead of the changes between them',
      'Compass confusion. Check north before you write',
      'Present tense for things that happened between the two dates',
      'Ignoring features that did not change',
    ],
  },
  letter: {
    label: 'Letter (General Training)',
    paragraphs: [
      { name: 'Greeting', description: 'Matched to the tone. "Dear Sir or Madam" (formal), "Dear Mr Chen" (semi-formal), "Dear Sam" (informal).' },
      { name: 'Opening', description: 'Why you are writing. "I am writing to…" (formal) or "Just a quick note to…" (informal).' },
      { name: 'One paragraph per bullet', description: 'Three bullets, three paragraphs. Develop each with a detail or example; don\'t just restate the bullet.' },
      { name: 'Closing line', description: 'The action or feeling you want to leave. "I look forward to your reply." / "Can\'t wait to see you!"' },
      { name: 'Sign-off', description: 'Matched to the greeting. "Yours faithfully" only pairs with "Dear Sir or Madam"; "Yours sincerely" with a named greeting.' },
    ],
    language: [
      { job: 'Requesting', phrases: 'I would be grateful if you could… / Could you do me a favour and…?' },
      { job: 'Complaining', phrases: 'I wish to express my dissatisfaction with… / I\'m really not happy about…' },
      { job: 'Apologising', phrases: 'Please accept my sincere apologies for… / I\'m so sorry about…' },
      { job: 'Suggesting', phrases: 'May I suggest that… / How about…?' },
      { job: 'Inviting', phrases: 'I would be delighted if you could join me for… / Fancy coming to…?' },
      { job: 'Thanking', phrases: 'I greatly appreciate your assistance with… / Thanks a million for…' },
    ],
    mistakes: [
      'Missing or rushing one of the three bullet points',
      'Mixed tone. Formal opening, informal body',
      '"Yours faithfully" after "Dear Mr Chen" (it pairs with "Dear Sir or Madam")',
      'No sign-off, or signing a full real name on an informal letter',
    ],
  },
};

export const PROMPT_VARIANT_STRUCTURE: Record<string, VariantKey> = {
  opinion: 'opinion',
  discussion: 'discussion',
  'problem-solution': 'problem-solution',
  'advantages-disadvantages': 'advantages-disadvantages',
  'two-part': 'two-part',
  'line-graph': 'chart',
  'bar-chart': 'chart',
  'pie-chart': 'chart',
  table: 'chart',
  combination: 'chart',
  process: 'process',
  map: 'map',
  letter: 'letter',
};
