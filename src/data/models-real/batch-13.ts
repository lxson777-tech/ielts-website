/* Batch 13 (2 October 2026): Band 8 models for the three problem-solution
   tasks added to the bank (tests 87, 38 and 95; see the note at the top of
   writing-prompts-imported.ts). Each follows the Problem / Solution lesson
   (src/content/lesson-bodies/writing-problem.html): four paragraphs, the
   pattern named in the introduction's roadmap, two developed points per
   body paragraph, every solution matched to a cause and given an actor, and
   for the cause + effect question (test 95) no solutions at all. Test 87 is
   the first of them in the bank, so it is the lesson's worked example. */

import type { ModelAnswer } from '../model-answers';

export const BATCH_13: ModelAnswer[] = [
  /* pte-wt-87-task2: cause + solution */
  {
    promptId: 'pte-wt-87-task2',
    task: 'task2',
    band: 8,
    text: [
      'In many countries, offences committed by teenagers have risen sharply. This essay argues that the increase stems largely from weakened supervision at home and from the lack of purpose many young people feel, and it proposes two measures that answer those causes directly.',
      'The first cause can be traced to the home. Where both parents work long or irregular hours, many teenagers spend their evenings unsupervised, and the youth clubs that once filled those hours have closed in a number of cities to save money. The hours between the end of school and a parent returning from work are exactly when much petty crime, from shoplifting to vandalism, takes place. The second cause is a lack of purpose. Pupils who are struggling at school often see little reward in staying there and no route into work beyond it. With nothing to aim for, some drift into gangs that offer the status and belonging they lack.',
      'Each cause suggests its own remedy. To fill the unsupervised hours, local governments should fund after-school programmes that keep schools open until early evening, offering sport, homework help and supervised clubs. Iceland, which built its youth policy around organised after-school activity in the late 1990s, saw teenage drinking and drug use fall steeply over the following two decades. To address the lack of purpose, schools and employers could work together on mentoring and apprenticeship schemes that give struggling pupils a visible route into work. The main obstacle is cost, but mentoring is far cheaper than detaining a young offender, and a teenager with a goal has something to lose.',
      'In conclusion, youth crime is rising chiefly because teenagers are left unsupervised and without a sense of direction. Funded after-school provision and practical routes into work tackle those causes at their root; without them, harsher punishment alone will only fill prisons with the next generation.',
    ],
    highlights: [
      { phrase: 'it proposes two measures that answer those causes directly', note: 'Task response: the roadmap names the pattern (causes, then matched solutions) before the essay begins, exactly as the lesson asks.' },
      { phrase: 'between the end of school and a parent returning from work are exactly when much petty crime', note: 'Task response: the cause is explained through its consequence, not just named.' },
      { phrase: 'Each cause suggests its own remedy.', note: 'Coherence: one short sentence signals the matching principle, so the reader expects one solution per cause.' },
      { phrase: 'local governments should fund after-school programmes', note: 'Task response: the solution has an actor and answers the first cause, unsupervised time, rather than appearing from nowhere.' },
      { phrase: 'The main obstacle is cost', note: 'Task response: the solution is evaluated briefly, which separates a developed proposal from a slogan.' },
    ],
    criteria: {
      taskResponse: 'Both parts of the question are answered in full: two causes are explained in the first body paragraph and two solutions in the second, and each solution answers one cause in the same terms (unsupervised hours, a lack of purpose) and is given someone to carry it out. The position is clear from the introduction, examples are specific, and the Iceland example is used carefully for what it showed rather than stretched into a claim about crime. It stops short of Band 9 because the second cause rests on a general claim about struggling pupils rather than a specific illustration like the one given for unsupervised hours.',
      coherence: 'The four-paragraph structure mirrors the cause + solution pattern, and "The first cause" and "The second cause" are balanced by "To fill the unsupervised hours" and "To address the lack of purpose", which ties every solution back to its cause in the same words. Referencing ("those causes", "Each cause") keeps the argument connected across paragraphs. The second body paragraph carries two proposals, an example and an evaluation, so it is dense, although each proposal is clearly introduced by its own "To..." phrase.',
      lexical: 'Vocabulary is precise and natural for the topic: "stems largely from", "petty crime", "a lack of purpose", "a visible route into work" and "tackle those causes at their root" all collocate correctly, and cause and effect language is varied rather than repeated. Less common phrasing such as "drift into gangs" and "a teenager with a goal has something to lose" is used with control. Occasional reliance on familiar topic phrases keeps it from the very top band.',
      grammar: 'A wide range of structures is used accurately, including a non-defining relative clause about Iceland, a fronted conditional ("Where both parents work"), a defining relative clause ("the youth clubs that once filled those hours") and a semicolon joining the final two clauses. Errors are absent and sentence length is varied deliberately, with the short "The second cause is a lack of purpose." set against longer explanations. One or two sentences carry a heavy load of clauses, which slightly reduces fluency at a Band 9 standard.',
    },
  },
  /* pte-wt-38-task2: cause + solution */
  {
    promptId: 'pte-wt-38-task2',
    task: 'task2',
    band: 8,
    text: [
      'People today are noticeably less fit and less active than earlier generations. This essay argues that the decline is driven mainly by modern work and transport, which have removed movement from daily life, and by screen-based leisure, and it proposes a measure for each cause.',
      'The most fundamental change is that physical effort is no longer built into ordinary routines. A century ago most people walked to work and did manual jobs, whereas a typical office employee today drives or takes a bus to a desk and may sit for eight hours, taking only a few thousand steps. Leisure has followed the same path. Streaming services, video games and social media are designed to hold attention, and an evening that once might have included a game of football is now often spent sitting down, particularly among children.',
      'Because the problem lies in daily routine, the most effective response is to put movement back into it rather than to rely on willpower. City authorities can make walking and cycling the easiest way to travel by building protected cycle lanes and car-free streets; Copenhagen, where almost half of all journeys to work and study are made by bicycle, shows that this changes behaviour on a large scale. The second cause, screen-based leisure, is best addressed in childhood, when habits form. Schools should guarantee at least an hour of physical activity every day and keep their sports facilities open to families in the evenings. Although this requires investment, it costs far less than treating the illnesses that inactivity causes later in life.',
      'In conclusion, people have become less active because sedentary work, motorised transport and screen-based entertainment have squeezed exercise out of everyday life. Redesigning cities around walking and cycling, and making daily activity a fixed part of school, would restore it; without such changes, each generation is likely to be less active than the last.',
    ],
    highlights: [
      { phrase: 'proposes a measure for each', note: 'Task response: the roadmap promises matched solutions, so the reader can check the second body paragraph against the first.' },
      { phrase: 'physical effort is no longer built into ordinary routines', note: 'Task response: identifies the underlying cause rather than listing symptoms such as "people are lazy".' },
      { phrase: 'Because the problem lies in daily routine', note: 'Coherence: the solution paragraph opens by naming the cause it answers, the matching principle in action.' },
      { phrase: 'City authorities can make walking and cycling the easiest way to travel', note: 'Task response: an actor and a concrete action, not the slogan "people should exercise more".' },
      { phrase: 'Although this requires investment', note: 'Task response: a brief evaluation that weighs cost against benefit.' },
    ],
    criteria: {
      taskResponse: 'Both questions are answered fully and in proportion: the first body paragraph explains two causes, sedentary routines and screen-based leisure, and the second proposes a measure matched to each, with named actors (city authorities and schools) and a real example. The position is consistent from introduction to conclusion and avoids the vague advice that weakens many answers to this question. It falls short of Band 9 because the first reason relies on one extended comparison where a second illustration would have strengthened it.',
      coherence: 'Information is sequenced logically and the matching between causes and solutions is made explicit ("Because the problem lies in daily routine", "The second cause, screen-based leisure"), so the structure is easy to follow without heavy linking words. Paragraphing is clear and each body paragraph has a recognisable central idea. Cohesion through reference ("the same path", "it") is skilful, though the second body paragraph is long enough that a reader has to hold several points at once.',
      lexical: 'The vocabulary is wide and well chosen: "built into ordinary routines", "designed to hold attention", "protected cycle lanes", "sedentary work" and "squeezed exercise out of everyday life" are precise and natural. Topic words are paraphrased rather than repeated ("less active", "inactivity", "movement"). Very occasional familiar phrasing, such as "on a large scale", keeps it below the highest band.',
      grammar: 'A wide range of structures is controlled accurately: a contrast with "whereas", a non-defining relative clause about Copenhagen, a concessive "Although" clause and a participle phrase ("taking only a few thousand steps"). There are no errors, and long and short sentences are mixed for effect ("Leisure has followed the same path."). A Band 9 script would show slightly more variety in how sentences begin.',
    },
  },
  /* pte-wt-95-task2: cause + effect, so no solutions */
  {
    promptId: 'pte-wt-95-task2',
    task: 'task2',
    band: 8,
    text: [
      'In many societies the family meal, once a fixed part of the day, is becoming rare. This essay argues that clashing timetables and the ease of convenience food are mainly responsible, and that the result is less conversation within families and weaker social skills in society as a whole.',
      'The main cause is the way working and school timetables have fragmented. When parents work shifts or commute long distances, and children have evening tuition, sports training or part-time jobs, there may be no hour at which everyone is at home together. The second cause is that convenience food has removed much of the remaining incentive to gather: when a meal can be heated in three minutes or delivered to the door, nobody needs to wait for anyone else. Each person therefore eats when it suits them, often alone in another room with a phone or a television for company.',
      'Within the family, the loss is mainly one of conversation. The dinner table is often the only daily occasion on which parents hear about a child\'s day, notice that something is wrong or pass on values informally, so its disappearance can leave relatives living side by side but knowing little about one another. A teenager who eats alone every evening may go weeks without mentioning a problem at school. For society, the effects are slower but real. Children learn patience, table manners and the give-and-take of discussion at shared meals, and a generation that rarely practises them may find cooperation and respectful disagreement harder in classrooms and workplaces.',
      'In conclusion, family meals are disappearing because of mismatched schedules and the convenience of eating alone, and the result is weaker communication at home and the gradual erosion of social skills once learned at the table. If the trend continues, the table may stop being the place where one generation teaches the next.',
    ],
    highlights: [
      { phrase: 'clashing timetables and the ease of convenience food are mainly responsible', note: 'Task response: the roadmap names the actual causes and effects, matching the cause + effect pattern and promising no solutions, because the question asks for none.' },
      { phrase: 'there may be no hour at which everyone is at home together', note: 'Task response: the cause is explained through what it does to the day, not just named.' },
      { phrase: 'Within the family, the loss is mainly one of conversation.', note: 'Coherence: the effects paragraph follows the order the question gives, family first and then society.' },
      { phrase: 'For society, the effects are slower but real.', note: 'Coherence: a short topic sentence marks the turn from family to society.' },
      { phrase: 'the gradual erosion of social skills', note: 'Task response: the conclusion summarises the causes and effects and ends with an outlook but, correctly, proposes nothing: this is the trap the lesson warns about.' },
    ],
    criteria: {
      taskResponse: 'The question asks for causes and effects, and that is exactly what is answered: two causes in the first body paragraph and two effects, one on the family and one on society, in the second, with no solutions added anywhere, which is the most common way candidates lose marks on this pattern. Each point is supported with a specific illustration, such as evening tuition, delivered meals and a teenager who goes weeks without mentioning a problem at school. It stops short of Band 9 because the effect on society is argued from general experience rather than illustrated as concretely as the effect on the family.',
      coherence: 'The essay follows the order of the question, and the effects paragraph is organised by its two audiences, "Within the family" and "For society", so the structure is clear without numbered signposting. The introduction names both causes and both effects before the body develops them, and the causes are signalled naturally ("The main cause", "The second cause"). Linking in the first body paragraph leans on two "when" clauses, which a Band 9 script would vary.',
      lexical: 'Vocabulary is flexible and precise: "fragmented", "remaining incentive to gather", "pass on values informally", "living side by side", "the give-and-take of discussion" and "the gradual erosion" are natural and well collocated, and the key idea of family meals is paraphrased throughout ("the dinner table", "shared meals", "the table"). Some phrasing is familiar rather than striking, which keeps it below the top band.',
      grammar: 'A wide range of structures is used accurately: a complex time clause with "When", a colon introducing an explanation, a result clause with "so", a reduced relative clause ("social skills once learned at the table") and a coordinated list of verb phrases ("hear about a child\'s day, notice that something is wrong or pass on values informally"). Sentences are error free and of varied length. Slightly more variety in sentence openings would be expected at Band 9.',
    },
  },
];
