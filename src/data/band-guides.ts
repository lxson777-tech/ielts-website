/* "How to reach the next band" static guides for IELTS Writing and Speaking.
   Every claim in `whatChanges`, `doThis`, and `stopThis` is a plain-language
   rephrasing of the official public IELTS Band Descriptors, quoted verbatim
   in workers/grade-essay/src/index.ts (TR_TASK2, TA_TASK1_ACADEMIC, CC_SCALE,
   LR_SCALE, GRA_SCALE) and workers/grade-speaking/src/index.ts (FC_SCALE,
   LR_SCALE, GRA_SCALE, PRON_SCALE).

   Named pronunciation features (word stress, sentence stress, chunking,
   intonation, weak forms, linking, individual sounds) are the concrete
   things examiners are listening for when the descriptors say "a range of
   pronunciation features" (they are not verbatim band text themselves).

   `task1Note` (writing, taskResponse only) flags where Task 1 Academic (Task
   Achievement) asks for something materially different from the Task 2
   scale these guides otherwise follow, mainly the overview requirement.

   One `BandStepGuide[]` per criterion, five steps each (4 to 5 through 8 to 9).
   `guideFor()` picks the right step for a given whole band, clamped to the
   guide's range. Paired with the AI graders' dynamic `nextBand` advice
   (src/lib/grading/next-band.ts) in the band report: `nextBand` speaks to
   this specific piece of work, this file is the general playbook behind it. */

import type { CriterionKey } from '../lib/writing/schema';
import type { SpeakingCriterionKey } from '../lib/speaking/schema';

export interface BandStepGuide {
  /** the band the student is at now (whole band) */
  from: number;
  /** the band this step reaches */
  to: number;
  /** what examiners require at `to` that they do not require at `from`, in plain words, traceable to the descriptors */
  whatChanges: string;
  /** 3 to 4 concrete, checkable instructions, each starts with a verb */
  doThis: string[];
  /** 1 to 2 things students at `from` typically do that hold them back, phrased as "Stop ..." */
  stopThis: string[];
  /** a before/after pair showing the change */
  example: { before: string; after: string; why: string };
  /** one 10 to 20 minute practice routine the student can do today */
  practice: string;
  /** writing taskResponse only: set where Task 1 Academic's Task Achievement scale asks for something materially different */
  task1Note?: string;
}

export const WRITING_BAND_GUIDES: Record<CriterionKey, BandStepGuide[]> = {
  taskResponse: [
    {
      from: 4,
      to: 5,
      whatChanges:
        'At band 4 the essay format can be wrong and your position can be unclear. At band 5 the descriptors ask you to at least use the right format, take a position (even if the development is not always clear), and state main ideas that a reader can identify, even if they are limited.',
      doThis: [
        'Write in the correct essay format: an introduction, two or more body paragraphs, and a conclusion. Not a list, not a letter.',
        'State your opinion or position in one clear sentence in the introduction.',
        'Give each main idea its own paragraph, at least two body paragraphs.',
        'Check that your answer responds to the exact question asked, not a related question you find easier.',
      ],
      stopThis: [
        'Stop writing a response vague enough to answer several different questions. Tie every sentence to the exact wording of the prompt.',
        'Stop leaving your opinion out of opinion essays.',
      ],
      example: {
        before: 'Many people think about this topic. There are different opinions. Some good some bad.',
        after: 'In my opinion, working from home benefits both employees and companies, and this essay will explain why.',
        why: 'The first version states no position and could belong to almost any essay. The second names a clear opinion in one sentence, which band 5 requires even if the rest of the essay stays simple.',
      },
      practice:
        'Take 5 past Task 2 questions. Spend 2 minutes each writing only a one-sentence thesis statement that states your position. 10 to 15 minutes total, no essays.',
      task1Note:
        'Task 1 (Academic) is scored on Task Achievement, not Task Response: at band 5 you generally address the task and describe some detail, but there is no clear overview and there may be no data used to support the description. Focus first on covering every key feature of the chart or diagram.',
    },
    {
      from: 5,
      to: 6,
      whatChanges:
        'Band 6 asks you to address the task even if some parts get more coverage than others, keep a relevant position (even if the conclusion becomes repetitive), and present relevant main ideas even if some are under-developed. Band 5 allows a task addressed only partially, with unclear development and possibly no conclusion.',
      doThis: [
        'Give every part of a multi-part question real attention, at least several sentences, not one throwaway line.',
        'Write an actual concluding sentence that restates your position in different words, not a copy of the introduction.',
        'Delete any sentence that does not support one of your main ideas.',
        'Keep your position identical from your introduction to your conclusion.',
      ],
      stopThis: [
        'Stop giving the part of the question you find less interesting only one sentence.',
        'Stop adding facts or examples that do not connect to the point you are making.',
      ],
      example: {
        before: 'To conclude, this essay has looked at both sides of the question.',
        after: 'In conclusion, while there are some benefits to remote work, the advantages for employee wellbeing make it the better choice overall.',
        why: 'The first sentence only announces that a conclusion is happening. The second restates the actual position in fresh words, which band 6 requires for a "relevant position" to hold through the end.',
      },
      practice:
        'Write one full conclusion paragraph (3 sentences: summary, restated position, closing thought) for a question you already have an essay plan for. 10 minutes.',
    },
    {
      from: 6,
      to: 7,
      whatChanges:
        'Band 7 requires addressing ALL parts of the task in full, not some parts more than others, a clear position held THROUGHOUT the response (not one that becomes unclear or repetitive), and main ideas that are extended and supported, not just stated. The descriptor still allows some over-generalising at band 7.',
      doThis: [
        'Give equal, full development to every part of the question, including the part you find harder.',
        'Extend every main idea with a specific reason, cause, or example, not just a stated claim.',
        'Repeat your position explicitly in each body paragraph, so a reader never has to guess where you stand.',
        'Replace vague generalisations ("many people believe") with a concrete, specific detail where you can.',
      ],
      stopThis: [
        'Stop stating an idea and moving straight to the next one without extending it.',
        'Stop letting your position drift into vague "both sides have a point" language by the conclusion.',
      ],
      example: {
        before: 'Social media affects young people. It can be good or bad depending on how it is used.',
        after: 'Excessive social media use damages teenagers\' concentration, since constant notifications interrupt the sustained attention that schoolwork demands.',
        why: 'The first pair of sentences states a claim without extending it. The second names the specific effect and the reason behind it, which is what "extends and supports" means at band 7.',
      },
      practice:
        'Pick one body paragraph from an old essay. Rewrite it by adding one sentence of explanation and one specific example. 15 minutes.',
    },
    {
      from: 7,
      to: 8,
      whatChanges:
        'Band 8 requires all parts sufficiently addressed with a well-developed response, and ideas that are relevant, extended and supported, without the tendency to over-generalise that band 7 still allows. Support needs to be concrete, not a broad statement dressed up as an example.',
      doThis: [
        'Support every main idea with a specific, concrete example: a named scenario, a real situation, a precise fact, not a general statement.',
        'Build each body paragraph from at least two or three connected sentences, not one.',
        'Check each claim for a hidden generalisation ("everyone", "in today\'s society") and replace it with something specific.',
        'Balance the depth of every part of the task so none feels thinner than the rest.',
      ],
      stopThis: [
        'Stop supporting points with sweeping generalisations. Name a specific case instead.',
        'Stop giving one paragraph noticeably less development than the others.',
      ],
      example: {
        before: 'Many countries are investing in renewable energy and this is a good thing for everyone.',
        after: 'Denmark now generates over half its electricity from wind power, showing that a heavy reliance on fossil fuels is not inevitable even for an industrialised economy.',
        why: 'The first sentence is a broad claim with no real support. The second grounds the same point in a specific, checkable fact, which is what removes the "over-generalise" weakness band 7 still allows.',
      },
      practice:
        'Take 3 general claims from a past essay and rewrite each with one specific, named example in place of the vague statement. 15 minutes.',
    },
    {
      from: 8,
      to: 9,
      whatChanges:
        'Band 9 requires fully addressing all parts of the task, a fully developed position, and ideas that are fully extended and well supported, with no gaps anywhere. This band is rare: it means excellent task handling with no weak spot at all, not just strong writing overall.',
      doThis: [
        'Address every angle of the question, including implications the prompt does not spell out directly.',
        'Extend every idea as far as it reasonably goes: cause, effect, example, and a brief acknowledgement of a counterpoint.',
        'Re-read the prompt after finishing and confirm nothing was left implicit or half-answered.',
      ],
      stopThis: [
        'Stop treating any single part of the task as "good enough". At band 9 every part needs full development.',
      ],
      example: {
        before: 'Higher taxes on sugary drinks would reduce consumption and improve public health.',
        after: 'Higher taxes on sugary drinks would likely reduce consumption among price-sensitive groups such as teenagers, though critics rightly note they can burden low-income households disproportionately, which is why several countries pair the tax with subsidised healthy alternatives.',
        why: 'The first sentence states a position without engaging its complexity. The second extends the idea fully: who is affected, a fair counterpoint, and how the counterpoint is addressed, which is the standard band 9 asks for.',
      },
      practice:
        'Choose one already-strong essay. For each body paragraph, add one sentence that acknowledges a counterpoint or limitation. 20 minutes.',
      task1Note:
        'For Task 1 (Academic), band 9 Task Achievement means fully satisfying every requirement of the task with a fully developed response and a clear, accurate overview. At this level the overview should already read as complete; the remaining work is making every supporting detail precise.',
    },
  ],

  coherenceCohesion: [
    {
      from: 4,
      to: 5,
      whatChanges:
        'At band 4 the essay may have no real paragraphing and no progression at all. Band 5 asks for at least some organisation and, even if paragraphing is inadequate, an attempt at paragraphs rather than one unbroken block of text.',
      doThis: [
        'Break your essay into clear paragraphs: introduction, body paragraphs, conclusion, each starting on a new line.',
        'Use at least one linking word per paragraph (however, because, for example).',
        'Open each paragraph with a sentence that names its main idea.',
        'Use a pronoun (it, this, they) to refer back to something already named, instead of repeating the same noun every time.',
      ],
      stopThis: [
        'Stop writing without paragraph breaks.',
        'Stop repeating the same word three or more times in one paragraph when a pronoun or synonym would work.',
      ],
      example: {
        before: 'Cars cause pollution. Cars are everywhere in cities. Cars need to be reduced.',
        after: 'Cars cause serious pollution in cities. Since they are now everywhere, their numbers need to be reduced.',
        why: 'The first version repeats "cars" three times with no connection between the sentences. The second uses "they" and "their" to refer back, and links the ideas with "since", which is the basic referencing band 5 is checking for.',
      },
      practice:
        'Take one paragraph you have already written. Underline every repeated noun and replace at least half of them with a pronoun or synonym. 10 minutes.',
    },
    {
      from: 5,
      to: 6,
      whatChanges:
        'Band 6 asks for information arranged coherently with a clear overall progression, and cohesive devices used effectively even if sometimes mechanical. Band 5 allows a lack of overall progression and inaccurate or over-used cohesive devices.',
      doThis: [
        'Make each paragraph follow logically from the one before it, using a transition sentence at the start.',
        'Use referencing words (this, these, such) instead of repeating full noun phrases.',
        'Limit yourself to one or two linking words per paragraph rather than one per sentence.',
        'Give every paragraph one clear topic. Do not mix two ideas in the same paragraph.',
      ],
      stopThis: [
        'Stop starting three sentences in a row with the same linking word ("Moreover... Moreover... Furthermore...").',
        'Stop mixing unrelated ideas inside a single paragraph.',
      ],
      example: {
        before: 'Moreover, tourism brings jobs. Moreover, it brings money to local businesses. Moreover, it can also damage the environment.',
        after: 'Tourism brings clear economic benefits, creating jobs and bringing money to local businesses. However, this growth can come at a cost to the environment.',
        why: 'Repeating "Moreover" three times is the over-use band 5 struggles with. The revised version links the first two related ideas naturally and marks the contrast with "However", which reads as effective rather than mechanical.',
      },
      practice:
        'Find every linking word in a past essay. Circle any word used more than twice and replace at least two with a different connective or with no connective at all where the logic is already clear. 15 minutes.',
    },
    {
      from: 6,
      to: 7,
      whatChanges:
        'Band 7 requires clear progression THROUGHOUT the whole response, not just overall, a RANGE of cohesive devices used appropriately, and a clear central topic within EACH paragraph, not most of them.',
      doThis: [
        'Use a variety of linking devices across the essay: addition, contrast, cause and result, and example connectors, not just "however" and "moreover" repeated.',
        'Give every single paragraph one clear central topic sentence, with no exceptions.',
        'Make sure referencing words (it, this, these) are always unambiguous: a reader must know exactly what they point to.',
        'Read through the whole essay and check that each paragraph flows into the next without a logical jump.',
      ],
      stopThis: [
        'Stop using "and" or "also" as your main way of connecting ideas across the whole essay.',
        'Stop letting a paragraph drift onto a second, unrelated idea partway through.',
      ],
      example: {
        before: 'Also, technology helps students learn. Also, it can be a distraction in class.',
        after: 'Technology can genuinely help students learn, for instance through instant access to research. That said, the same device can just as easily become a distraction during class.',
        why: 'Using "also" twice treats an addition and a contrast as if they were the same relationship. "For instance" and "that said" mark the actual logical relationships, which is the range of devices band 7 is looking for.',
      },
      practice:
        'Write the topic sentence only for each paragraph of a planned essay. Check each one states a single, distinct idea with no overlap. 10 minutes.',
    },
    {
      from: 7,
      to: 8,
      whatChanges:
        'Band 8 requires managing all aspects of cohesion well and sequencing ideas logically, with paragraphing that is both sufficient and appropriate. Band 7 still allows some under-use or over-use of cohesive devices; band 8 should feel controlled rather than occasionally mismatched.',
      doThis: [
        'Remove any linking word that is not needed. Let logical order do some of the work instead of a connector on every sentence.',
        'Vary paragraph length according to content. Do not force every paragraph to the same length if an idea genuinely needs more room.',
        'Combine cohesive techniques inside one paragraph (a reference word, a substitution, and one linking word) instead of relying on a single repeated device.',
        'Reread specifically for over-use of "however", "moreover", and "furthermore", and cut or vary as needed.',
      ],
      stopThis: [
        'Stop opening every paragraph with the same formulaic linker. Vary how paragraphs begin.',
        'Stop inserting a linking word where the logic is already obvious without one.',
      ],
      example: {
        before: 'Furthermore, this problem also affects rural communities in a similar way to urban ones.',
        after: 'Rural communities face a similar problem, though the causes there tend to differ.',
        why: 'The original stacks "Furthermore" onto a sentence that does not need it and buries the actual point. The revision drops the unneeded connector and lets the sentence structure itself carry the logical link, which reads as more controlled at band 8.',
      },
      practice:
        'Take a finished essay and delete every linking word you can remove without losing meaning. Compare the two versions for clarity. 15 minutes.',
    },
    {
      from: 8,
      to: 9,
      whatChanges:
        'Band 9 requires cohesion managed so well it "attracts no attention", with skilful paragraphing throughout. This is a rare band: the organisation should be essentially invisible, carried by word choice and sentence order rather than visible connecting devices.',
      doThis: [
        'Let ideas connect through meaning and word choice rather than visible linking words. Aim for at least one paragraph with no explicit connector that still flows perfectly.',
        'Vary sentence openings so the essay never leans on a small, repeated set of transition phrases.',
        'Check that your topic sentences alone, read in order, summarise the whole essay clearly.',
      ],
      stopThis: [
        'Stop relying on any single connecting device more than once or twice in the whole essay.',
      ],
      example: {
        before: 'In addition, remote work also improves employee wellbeing, which is another benefit.',
        after: 'Remote work also protects something harder to measure: employee wellbeing.',
        why: 'The first sentence signals its logic with two separate connective phrases stacked together. The second achieves the same addition through word choice ("also") and sentence rhythm alone, which is closer to the invisible cohesion band 9 describes.',
      },
      practice:
        'Rewrite one paragraph with zero linking words, relying only on sentence order and word choice to carry the logic. Check it still reads clearly. 15 minutes.',
    },
  ],

  lexicalResource: [
    {
      from: 4,
      to: 5,
      whatChanges:
        'Band 4 vocabulary is only basic and often repetitive or inappropriate for the task, with errors that can strain the reader. Band 5 asks for a range that is minimally adequate, so noticeable spelling or word-formation errors are allowed as long as they do not go beyond causing "some difficulty".',
      doThis: [
        'Replace repeated general words (good, bad, big, very) with a more specific word each time you would otherwise repeat one.',
        'Learn 5 to 10 words specific to common essay topics (environment, education, technology) and use them where relevant.',
        'Check the spelling of any word you use more than once in the essay.',
        'Use a full sentence to express an idea rather than a fragment that avoids using more vocabulary.',
      ],
      stopThis: [
        'Stop using the exact same adjective or verb throughout the whole essay.',
      ],
      example: {
        before: 'This is a very big problem. It is very bad for people.',
        after: 'This is a serious problem. It has a harmful effect on people\'s health.',
        why: 'The first version relies entirely on "very" plus a basic adjective, repeated twice. The second uses two different, more precise words, which is the minimally adequate range band 5 is checking for.',
      },
      practice:
        'List the 5 words you use most often in your essays (usually good, bad, big, important, very). Find one stronger alternative for each and use it in a practice sentence. 10 minutes.',
    },
    {
      from: 5,
      to: 6,
      whatChanges:
        'Band 6 asks for an adequate range of vocabulary for the task, with an attempt at less common words even if not always accurate, and spelling or word-formation errors that do not get in the way of communication. Band 5 vocabulary is described as only "minimally adequate".',
      doThis: [
        'Use at least three or four topic-specific words or phrases per paragraph, tied to the essay\'s actual subject.',
        'Attempt one or two less common words per paragraph, even if you are not fully confident in them.',
        'Paraphrase the question\'s own key terms in your introduction rather than repeating them exactly.',
        'Double-check the spelling of the key content words you use repeatedly across the essay.',
      ],
      stopThis: [
        'Stop copying the exact wording of the question into your essay.',
      ],
      example: {
        before: 'The question asks about young people using phones too much. This is a problem for young people.',
        after: 'The question raises concerns about excessive smartphone use among teenagers, a habit that is now widespread.',
        why: 'The first version simply repeats the question\'s own words. The second paraphrases "young people using phones too much" into different vocabulary ("excessive smartphone use among teenagers"), which is the attempt at less common vocabulary band 6 rewards.',
      },
      practice:
        'Take one past essay question. Rewrite the question in your own words twice, using different vocabulary each time. 10 minutes.',
    },
    {
      from: 6,
      to: 7,
      whatChanges:
        'Band 7 asks for a sufficient range of vocabulary allowing some flexibility and precision, and the use of less common lexical items with some awareness of style and collocation (natural word pairings, like "heavy traffic" not "big traffic"). Occasional errors in word choice, spelling, or word formation are still allowed.',
      doThis: [
        'Use at least one natural word pairing (collocation) per paragraph, such as "raise awareness" or "make a decision".',
        'Paraphrase the question\'s key terms fully in your introduction, using entirely different vocabulary.',
        'Replace at least three basic words per essay (good, bad, big, very) with a more precise alternative.',
        'Vary your vocabulary so the same content noun is not repeated more than twice across the essay.',
      ],
      stopThis: [
        'Stop writing "very + adjective" (very important, very good). Use one stronger word instead.',
        'Stop copying phrases directly from the question into your essay.',
      ],
      example: {
        before: 'It is very important for governments to make good decisions about this issue.',
        after: 'Governments have a responsibility to make sound decisions on this issue, since the consequences affect entire communities.',
        why: '"Very important" and "good decisions" are safe, general phrases. "Have a responsibility" and "sound decisions" are natural collocations with more precision, which shows the awareness of style and collocation band 7 asks for.',
      },
      practice:
        'Look up 5 common collocations for your weakest essay topic (for example, environment: "carbon emissions", "renewable sources", "raise awareness"). Write one sentence using each. 15 minutes.',
    },
    {
      from: 7,
      to: 8,
      whatChanges:
        'Band 8 asks you to use a wide range of vocabulary fluently and flexibly to convey precise meaning, skilfully using uncommon lexical items, with only occasional inaccuracies in word choice or collocation and only rare spelling errors. Band 7 still allows occasional errors in word choice and word formation more broadly.',
      doThis: [
        'Use at least one uncommon or idiomatic phrase per paragraph, used accurately, not just inserted for effect.',
        'Choose the most precise word for each idea rather than the first word that comes to mind. Check a synonym if you are unsure.',
        'Spend the final two minutes of proofreading purely on the spelling of your key vocabulary.',
        'Use collocations naturally throughout the essay, not just once as a one-off flourish.',
      ],
      stopThis: [
        'Stop settling for the first vocabulary choice that comes to mind. Review word choices for precision on your final read-through.',
        'Stop letting spelling slips appear on words you use more than once.',
      ],
      example: {
        before: 'This has good effects and bad effects that need to be considered.',
        after: 'This carries both tangible benefits and hidden costs that policymakers need to weigh carefully.',
        why: '"Good effects and bad effects" is accurate but generic. "Tangible benefits and hidden costs" conveys a more precise meaning while still being accurate, which is the fluent, flexible use of a wide range band 8 requires.',
      },
      practice:
        'Take 3 sentences from a past essay using "good" or "bad". Rewrite each with a more precise word pair. Check spelling of every new word used. 15 minutes.',
    },
    {
      from: 8,
      to: 9,
      whatChanges:
        'Band 9 asks for a wide range of vocabulary with very natural and sophisticated control, where rare minor errors occur only as "slips", momentary mistakes rather than gaps in knowledge. This band is rare: the vocabulary should read as native-like, not merely advanced.',
      doThis: [
        'Choose vocabulary a native speaker discussing the same topic would naturally use, not vocabulary that reads as deliberately "advanced".',
        'Vary word choice so no content word appears more than two or three times across the whole essay.',
        'Check every collocation you use is completely natural, aiming for zero avoidable inaccuracies.',
      ],
      stopThis: [
        'Stop inserting an advanced word purely to impress if it does not fit naturally in context. Only use vocabulary you are certain is accurate.',
      ],
      example: {
        before: 'This phenomenon has multifarious ramifications for contemporary society.',
        after: 'This trend has far-reaching consequences for how we live today.',
        why: 'The first sentence uses rare words that sound inserted for effect rather than natural. The second conveys the same idea with vocabulary that a highly competent native writer would actually choose, which is what "natural and sophisticated control" means at band 9.',
      },
      practice:
        'Read one paragraph aloud. Flag any word that feels forced rather than natural, and replace it with a simpler, more natural choice. 15 minutes.',
    },
  ],

  grammaticalRange: [
    {
      from: 4,
      to: 5,
      whatChanges:
        'Band 4 uses only a very limited range of structures with rare subordinate clauses, and errors predominate. Band 5 asks for an attempt at complex sentences, even if they tend to be less accurate than simple ones, and simple sentence forms that are usually correct.',
      doThis: [
        'Attempt at least one complex sentence per paragraph using because, although, which, or if, even if it is not perfect.',
        'End every sentence with correct punctuation. Avoid running two sentences together with just a comma.',
        'Write in complete sentences. Avoid fragments that lack a main verb or subject.',
        'Keep subject-verb agreement correct in your simple sentences at minimum ("she goes", not "she go").',
      ],
      stopThis: [
        'Stop writing only short, simple sentences throughout the entire essay.',
        'Stop mixing up basic tense forms within the same paragraph.',
      ],
      example: {
        before: 'People use social media. It is popular. Many problem happen.',
        after: 'People use social media because it lets them stay connected, although this constant connection can cause problems.',
        why: 'The first version is three disconnected simple sentences with a subject-verb agreement error ("many problem happen"). The second links the ideas with "because" and "although", which is the attempted complex sentence band 5 is looking for.',
      },
      practice:
        'Write 5 sentences about a familiar topic, each using a different connector: because, although, if, when, which. 15 minutes.',
    },
    {
      from: 5,
      to: 6,
      whatChanges:
        'Band 6 asks for a mix of simple and complex sentence forms, with errors in grammar and punctuation that rarely reduce communication. Band 5 attempts complex sentences but they tend to be less accurate than the simple ones, and errors can cause the reader some real difficulty.',
      doThis: [
        'Use both simple and complex sentences in every paragraph, aiming for at least two complex sentences per paragraph.',
        'Use a comma correctly before or after a subordinate clause (for example, "Although it rained, we went out.").',
        'Check subject-verb agreement and articles (a, an, the) on your key nouns.',
        'Vary sentence openings. Do not start every sentence with the subject.',
      ],
      stopThis: [
        'Stop overusing a single complex structure (only "because" clauses, for example). Mix in others.',
        'Stop letting a grammar error change the actual meaning of a sentence.',
      ],
      example: {
        before: 'Government should to build more school because many child not go to school.',
        after: 'The government should build more schools, because many children currently have no access to education.',
        why: 'The original has a verb-form error ("should to build") and a subject-verb agreement error ("many child not go"). The revision fixes both while keeping the same complex "because" structure, so the error no longer risks confusing the reader.',
      },
      practice:
        'Take 5 sentences from a past essay. Circle the subject and verb in each and check they agree. Fix any article (a/an/the) that is missing or wrong. 15 minutes.',
    },
    {
      from: 6,
      to: 7,
      whatChanges:
        'Band 7 asks for a variety of complex structures, frequent error-free sentences, and good control of grammar and punctuation with only a few errors. Band 6 allows errors that only "rarely reduce communication" but does not require frequent error-free sentences or a variety of complex forms.',
      doThis: [
        'Use at least three different complex structures across the essay: relative clauses, conditionals, passive voice, and comparatives.',
        'Aim for at least two completely error-free complex sentences per paragraph.',
        'Check that every verb tense matches the timeframe you are describing.',
        'Proofread specifically for punctuation: commas around clauses, and correct use of semicolons if you use them.',
      ],
      stopThis: [
        'Stop relying on the same complex structure repeatedly. Mix in relative clauses, conditionals, and passive voice.',
        'Stop leaving comma splices (two full sentences joined only by a comma) uncorrected.',
      ],
      example: {
        before: 'Many people think that this is a good idea, they want to try it.',
        after: 'Many people believe this is a good idea, an opinion that has grown as more evidence has emerged.',
        why: 'The first sentence is a comma splice joining two independent clauses incorrectly. The second uses a relative clause ("an opinion that has grown") to connect the ideas correctly, which is the variety of complex structures band 7 asks for.',
      },
      practice:
        'Write one sentence using a relative clause (who/which/that), one using a conditional (if...), and one using the passive voice, all about the same topic. 15 minutes.',
    },
    {
      from: 7,
      to: 8,
      whatChanges:
        'Band 8 asks for a wide range of structures where the majority of sentences are error-free, with only very occasional errors or inappropriacies. Band 7 requires frequent error-free sentences but "a few errors" are still expected.',
      doThis: [
        'Reread your essay and check that more than half of your sentences have zero grammar errors.',
        'Combine structures within the same paragraph, for example a conditional, a relative clause, and a passive construction used together.',
        'Read every complex sentence aloud. If it does not sound natural, simplify it or fix it.',
        'Fix every article (a/an/the) and preposition error you can spot while proofreading.',
      ],
      stopThis: [
        'Stop attempting a complex structure you are unsure of without checking it. Use a simpler, correct structure instead if in doubt.',
        'Stop leaving more than one or two errors uncorrected after proofreading.',
      ],
      example: {
        before: 'If government will invest on education, more people can get benefit from it.',
        after: 'If the government invests in education, more people will benefit from it in the long run.',
        why: 'The original has three errors in one sentence (wrong tense after "if", wrong preposition, and an unnecessary "get"). The revision is the same idea with zero errors, which is what "the majority of sentences are error-free" requires at band 8.',
      },
      practice:
        'Take one paragraph. Mark every error you can find, however small. Rewrite the paragraph with all of them fixed and read it aloud. 20 minutes.',
    },
    {
      from: 8,
      to: 9,
      whatChanges:
        'Band 9 asks for a wide range of structures used with full flexibility and accuracy, where rare minor errors occur only as "slips", the kind of small mistake even a highly proficient writer occasionally makes. This band is genuinely rare: it means essentially no grammar weakness anywhere in the essay.',
      doThis: [
        'Write every sentence so that, on a careful reread, you cannot find a grammar error in it.',
        'Use complex structures so naturally that they never feel inserted for display.',
        'Proofread twice: once purely for meaning, and once purely for grammar and punctuation.',
      ],
      stopThis: [
        'Stop treating any error as acceptable. At this level, even one avoidable slip should be caught on rereading.',
      ],
      example: {
        before: 'Had the policy been implement earlier, the results would have been better probably.',
        after: 'Had the policy been implemented earlier, the results would probably have been better.',
        why: 'The original has a word-form error ("implement" instead of "implemented") and an awkward word order at the end. The revision is grammatically flawless and reads naturally, which is what "full flexibility and accuracy" at band 9 looks like in practice.',
      },
      practice:
        'Write 3 conditional sentences about a serious topic ("Had the government..."). Check each one twice: once for the conditional form, once for every other word in the sentence. 15 minutes.',
    },
  ],
};

export const SPEAKING_BAND_GUIDES: Record<SpeakingCriterionKey, BandStepGuide[]> = {
  fluencyCoherence: [
    {
      from: 4,
      to: 5,
      whatChanges:
        'At band 4 you cannot respond without noticeable pauses and may speak slowly with frequent repetition. Band 5 asks you to usually maintain the flow of speech, even if you use repetition, self-correction, or slower speech to keep going. Simple speech should come fluently, even if more complex ideas still cause problems.',
      doThis: [
        'Answer every question immediately, without a long silent pause first, even if the answer starts simply.',
        'Use a short filler phrase ("let me think", "that\'s an interesting question") instead of silence when you need a second.',
        'Practise giving full-sentence answers to simple personal questions until they come without hesitation.',
        'Link two simple sentences together with and, but, or so, instead of stopping after each one.',
      ],
      stopThis: [
        'Stop pausing silently for several seconds before you start answering.',
        'Stop giving one-word or single-sentence answers when you actually have more to say.',
      ],
      example: {
        before: '(long pause) ...I like... (pause) ...football.',
        after: 'I really enjoy playing football, and I try to play with friends most weekends.',
        why: 'The first answer has long silent pauses and stops after two words. The second keeps going without a gap and links two ideas with "and", which is the flow band 5 asks for even in simple speech.',
      },
      practice:
        'Record yourself answering 8 Part 1 style questions (favourite food, hometown, weekend plans) out loud, starting within 2 seconds of hearing each question. 15 minutes.',
    },
    {
      from: 5,
      to: 6,
      whatChanges:
        'Band 6 means being willing to speak at length, even if coherence is sometimes lost through occasional repetition, self-correction, or hesitation, and using a range of connectives and discourse markers, even if not always appropriately. Band 5 tends to over-use a small number of connectives and struggles once the topic gets more complex.',
      doThis: [
        'Extend every answer to at least 3 to 4 sentences, even for simple Part 1 questions.',
        'Use a range of connecting words (also, however, because, so, actually) rather than the same one repeatedly.',
        'When you lose your thread, restart the sentence rather than trailing off in silence.',
        'Give a reason or example after every opinion you state.',
      ],
      stopThis: [
        'Stop giving answers shorter than two sentences on any question.',
        'Stop trailing off mid-sentence without finishing the thought.',
      ],
      example: {
        before: 'I like my hometown. It is nice.',
        after: 'I really like my hometown, because it has a good mix of parks and shopping areas, so there is always something to do at the weekend.',
        why: 'The first answer is two short, disconnected sentences. The second extends the idea with "because" and "so" and gives a reason, which is the willingness to speak at length band 6 is checking for.',
      },
      practice:
        'Pick 5 Part 1 questions. Answer each with at least 3 connected sentences, using a different connecting word each time. 15 minutes.',
    },
    {
      from: 6,
      to: 7,
      whatChanges:
        'Band 7 means speaking at length WITHOUT noticeable effort or loss of coherence, using a range of connectives and discourse markers with some flexibility. Some language-related hesitation and self-correction are still allowed. Band 6 may lose coherence at times and does not always use its connectives appropriately.',
      doThis: [
        'Keep talking for the full time available in Part 2 (up to 2 minutes) without long unplanned pauses.',
        'Use discourse markers that organise a longer answer: firstly, what\'s more, on top of that, having said that.',
        'Self-correct smoothly by simply restating the word or phrase, rather than stopping and apologising.',
        'Practise extended answers on abstract Part 3 topics, not only familiar Part 1 ones.',
      ],
      stopThis: [
        'Stop stopping every few seconds to search for a word. If a word will not come, paraphrase around it and keep moving.',
        'Stop finishing Part 2 answers well under the 2-minute mark.',
      ],
      example: {
        before: 'I think... um... it is good for... um... the environment, I think.',
        after: 'I think it\'s good for the environment, mainly because it cuts down on the amount of packaging waste we produce every day.',
        why: 'The first answer stalls twice searching for what to say next. The second develops the same opinion in one continuous stretch with a discourse marker ("mainly because"), which is speaking at length without noticeable effort.',
      },
      practice:
        'Take one Part 2 cue card. Speak for the full 2 minutes without stopping, even if you repeat a point, then note where you paused longest. 20 minutes.',
    },
    {
      from: 7,
      to: 8,
      whatChanges:
        'Band 8 means speaking fluently with only OCCASIONAL repetition or self-correction, where hesitation is usually content-related rather than a search for words or grammar, and topics are developed coherently and appropriately. Band 7 still allows language-related hesitation and some repetition at times.',
      doThis: [
        'Prepare and practise topic vocabulary in advance so it becomes automatic, reducing hesitation caused by searching for words.',
        'Develop each Part 3 answer with a clear structure: point, explanation, example, in that order.',
        'Let any pause come from thinking about the idea itself, not from struggling with grammar or vocabulary.',
        'Record yourself and count self-corrections. Aim for no more than one or two per answer.',
      ],
      stopThis: [
        'Stop self-correcting grammar mid-sentence more than once or twice per answer.',
        'Stop hesitating specifically because you are translating from your first language in your head.',
      ],
      example: {
        before: 'It make... it makes people, um, more... more happy, I think, in the... in the long term.',
        after: 'It makes people happier in the long term, mainly because it gives them a stronger sense of purpose.',
        why: 'The first answer self-corrects grammar and searches for words twice. The second is fluent throughout, with any thinking happening about the content rather than the language itself, which is the occasional-only hesitation band 8 asks for.',
      },
      practice:
        'Prepare 8 topic-specific words for a Part 3 theme (work, environment, technology). Answer 3 questions on that theme using at least 2 of the words each time. 20 minutes.',
    },
    {
      from: 8,
      to: 9,
      whatChanges:
        'Band 9 means speaking fluently with only RARE repetition or self-correction, where any hesitation is content-related rather than related to language at all, with fully appropriate cohesive features and topics developed fully and appropriately. This band is rare: it describes control close to a native speaker\'s.',
      doThis: [
        'Aim to eliminate language-related hesitation entirely. Any pause should come from forming a thought, not from searching for a word or structure.',
        'Develop topics as fully as a native speaker would in casual conversation, including nuance and qualification.',
        'Use cohesive devices so naturally that a listener would not notice them as a technique.',
      ],
      stopThis: [
        'Stop treating any remaining hesitation as acceptable if it comes from language rather than thinking. Work specifically on removing it.',
      ],
      example: {
        before: 'It has a lot of benefits for society, generally speaking, and also some drawbacks too.',
        after: 'It clearly benefits society on the whole, though I\'d say the drawbacks matter more for certain groups than others.',
        why: 'Both answers are fluent, but the second develops the idea further, with a genuine qualification ("though I\'d say... for certain groups"), showing the fuller development band 9 expects even at speed.',
      },
      practice:
        'Record a full mock interview (all 3 parts). Listen back and mark every hesitation. Note whether each was about the idea or about the language. 20 minutes.',
    },
  ],

  lexicalResource: [
    {
      from: 4,
      to: 5,
      whatChanges:
        'Band 4 can only convey basic meaning on unfamiliar topics and rarely attempts paraphrase. Band 5 asks you to manage familiar AND unfamiliar topics, even with limited flexibility, and to attempt paraphrase, even with mixed success.',
      doThis: [
        'Practise describing topics outside your daily routine (technology, environment, society) using simple vocabulary you already know.',
        'When you do not know a word, describe it instead of stopping (a paraphrase, such as "the thing you use to...").',
        'Learn 5 to 10 words for the IELTS topics you find hardest (education, work, environment).',
        'Answer every Part 3 question even if the topic feels unfamiliar, using general vocabulary rather than staying silent.',
      ],
      stopThis: [
        'Stop going silent when a topic feels unfamiliar. Use general words to talk around it instead.',
      ],
      example: {
        before: 'I don\'t know about this. I have no idea about environment.',
        after: 'I haven\'t studied this much, but I think it\'s about the thing that happens when factories put smoke into the air.',
        why: 'The first response gives up on the topic entirely. The second attempts a paraphrase of "pollution" using simple, available vocabulary, which is the "attempt paraphrase" band 5 is checking for, even without full success.',
      },
      practice:
        'Pick 3 unfamiliar Part 3 topics (space exploration, urban planning, climate policy). Answer each with 2 sentences of simple, general vocabulary rather than staying silent. 15 minutes.',
    },
    {
      from: 5,
      to: 6,
      whatChanges:
        'Band 6 asks for a wide enough vocabulary to discuss topics at length and make meaning clear despite some inappropriate word choices, and to generally paraphrase successfully. Band 5 manages this with limited flexibility and mixed success at paraphrase.',
      doThis: [
        'Build your answers to 4 to 6 sentences using vocabulary specific to the topic, not just general words.',
        'Paraphrase the question\'s key word at least once in your answer instead of repeating it.',
        'Learn topic-specific vocabulary sets of 10 to 15 words for common Part 3 themes: technology, environment, education, work, society.',
        'Use a synonym whenever you would otherwise repeat the same word twice in one answer.',
      ],
      stopThis: [
        'Stop relying on the exact words from the question in your answer.',
        'Stop using the same 3 to 4 all-purpose adjectives (good, bad, nice, interesting) for everything.',
      ],
      example: {
        before: 'Do you think technology is good for education? Yes, technology is good for education.',
        after: 'Definitely. Digital tools have made learning far more accessible, especially for students in remote areas.',
        why: 'The first answer just repeats "technology" and "education" from the question with the vague word "good". The second paraphrases into "digital tools" and "learning" and adds a specific benefit, which is the successful paraphrase band 6 rewards.',
      },
      practice:
        'Take 5 Part 3 questions. Answer each without repeating any key noun from the question itself, using a paraphrase instead. 15 minutes.',
    },
    {
      from: 6,
      to: 7,
      whatChanges:
        'Band 7 asks you to use your vocabulary flexibly to discuss a variety of topics, including some less common or idiomatic vocabulary with some awareness of style and collocation (natural word pairings), and to paraphrase effectively. Some inappropriate word choices are still allowed at this level.',
      doThis: [
        'Use at least one less common word or natural idiomatic phrase per answer, where it genuinely fits.',
        'Match your vocabulary\'s formality to the topic: more casual for Part 1, more precise for Part 3.',
        'Practise common collocations for IELTS topics (raise awareness, tackle a problem, strike a balance) and use them naturally.',
        'Paraphrase the question fully in your opening sentence rather than repeating any of its wording.',
      ],
      stopThis: [
        'Stop using only textbook-safe vocabulary. Take the risk of a less common word even if it is occasionally imperfect.',
        'Stop giving the same simple answer style throughout Part 3 as you did in Part 1.',
      ],
      example: {
        before: 'I think we need to do more about this problem. It is a big problem.',
        after: 'I think we need to tackle this issue more seriously, since it\'s becoming a growing concern for a lot of people.',
        why: 'The first answer repeats "problem" and uses "do more about" loosely. The second uses the natural collocation "tackle this issue" and "growing concern", which shows the awareness of style and collocation band 7 asks for.',
      },
      practice:
        'Learn 5 collocations for one Part 3 theme. Answer 3 questions on that theme, using at least one collocation naturally in each answer. 15 minutes.',
    },
    {
      from: 7,
      to: 8,
      whatChanges:
        'Band 8 asks you to use a wide vocabulary readily and flexibly to convey precise meaning, skilfully using less common and idiomatic vocabulary, with only occasional inaccuracies, and to paraphrase effectively whenever needed. Band 7 allows some inappropriate word choices more broadly.',
      doThis: [
        'Choose the most precise word for each idea, not just an acceptable one, for example "meticulous" instead of "very careful" where it fits.',
        'Use idiomatic expressions confidently and naturally, not as a one-off "showcase" phrase.',
        'Paraphrase confidently the moment a word does not come to mind, without breaking your fluency to search for it.',
        'Vary vocabulary across the whole test so words are not repeated when a synonym is available.',
      ],
      stopThis: [
        'Stop using an idiom or advanced phrase that does not quite fit, just to sound impressive. Precision matters more than difficulty.',
        'Stop breaking your flow to visibly search for a "better" word.',
      ],
      example: {
        before: 'I think it\'s a good way to save money, and it\'s good for the planet too.',
        after: 'I think it\'s a cost-effective option, and it has the added benefit of being environmentally friendly.',
        why: 'The first answer uses "good" twice for two different qualities. The second chooses two precise, natural phrases ("cost-effective" and "environmentally friendly"), which is the precise, flexible use band 8 requires.',
      },
      practice:
        'Take one answer you gave using "good" or "bad" twice. Rewrite it choosing a precise, different word for each instance. 15 minutes.',
    },
    {
      from: 8,
      to: 9,
      whatChanges:
        'Band 9 asks for full flexibility and precision in ALL topics, with idiomatic language used naturally and accurately. This band is very rare: it means near-native command that holds up even on unfamiliar or abstract topics, with no dip anywhere in the test.',
      doThis: [
        'Use precise, natural vocabulary on every topic without exception, including unfamiliar or abstract ones.',
        'Use idiomatic language the way a native speaker would, in context, not as a rehearsed insert.',
        'Keep vocabulary control consistent for the full 11 to 14 minutes, with no dip in quality on harder Part 3 questions.',
      ],
      stopThis: [
        'Stop letting vocabulary quality drop on the topics you have not specifically prepared for.',
      ],
      example: {
        before: 'I think this trend will probably keep growing in the future, and it will affect a lot of people.',
        after: 'I\'d expect this trend to keep gathering momentum, and its ripple effects will be felt well beyond the industries it starts in.',
        why: 'Both are fluent, but the second uses natural, idiomatic phrasing ("gathering momentum", "ripple effects") that a native speaker would reach for without effort, which is the full flexibility band 9 describes.',
      },
      practice:
        'Answer one unfamiliar, abstract Part 3 question (for example, on globalisation or urban planning) and check your vocabulary control matches your best-prepared topic. 15 minutes.',
    },
  ],

  grammaticalRange: [
    {
      from: 4,
      to: 5,
      whatChanges:
        'Band 4 produces basic sentence forms with subordinate structures rare, and errors are frequent enough to cause misunderstanding. Band 5 asks for basic sentence forms with reasonable accuracy and a limited range of more complex structures, even if these usually contain errors.',
      doThis: [
        'Attempt at least one subordinate clause per answer (because, when, if, which), even if it is not perfect.',
        'Practise simple present, past, and future tense forms until they are accurate on familiar topics.',
        'Build answers around two connected sentences rather than isolated fragments.',
        'Correct yourself out loud when you notice a tense mistake, rather than continuing past it.',
      ],
      stopThis: [
        'Stop relying only on memorised phrases for common questions.',
        'Stop avoiding subordinate clauses altogether.',
      ],
      example: {
        before: 'I go to work. I like my job. Is good.',
        after: 'I go to work because I really like my job, even though it can be tiring sometimes.',
        why: 'The first version is three short, disconnected sentences with a grammar error ("Is good"). The second links them with "because" and "even though", which is the attempted subordinate structure band 5 asks for.',
      },
      practice:
        'Answer 5 familiar Part 1 questions, each using one subordinate clause (because, when, if, which). 15 minutes.',
    },
    {
      from: 5,
      to: 6,
      whatChanges:
        'Band 6 asks for a mix of simple and complex structures, even with limited flexibility, where mistakes with complex structures rarely cause comprehension problems. Band 5 basic sentences are usually accurate, but the limited range of complex attempts usually contains errors that can cause some difficulty.',
      doThis: [
        'Use both simple and complex sentences within the same answer, aiming for at least one complex sentence per answer.',
        'Practise one complex structure at a time (for example, relative clauses with who, which, that) until it becomes automatic before adding another.',
        'Keep basic tense and subject-verb agreement accurate even while attempting harder structures.',
        'Notice which specific error you make most often and drill it in isolation.',
      ],
      stopThis: [
        'Stop attempting a complex structure so unfamiliar that the sentence collapses. Simplify instead if it is not ready yet.',
        'Stop making the same basic tense error repeatedly across the test.',
      ],
      example: {
        before: 'I have a friend. She work in hospital. She is very busy.',
        after: 'I have a friend who works at a hospital, and she\'s always very busy because of the long shifts.',
        why: 'The original has a subject-verb agreement error and three disconnected sentences. The revision uses a relative clause ("who works") correctly and links the ideas, which is the mix of simple and complex forms band 6 asks for.',
      },
      practice:
        'Describe 3 people you know, each time using a relative clause with who or which. Check subject-verb agreement in every sentence. 15 minutes.',
    },
    {
      from: 6,
      to: 7,
      whatChanges:
        'Band 7 asks for a range of complex structures used with some flexibility, and sentences that are frequently error-free. Band 6 allows frequent mistakes with complex structures as long as they rarely cause comprehension problems, without requiring frequent error-free sentences.',
      doThis: [
        'Use at least two different complex structures per longer answer (Part 2 or Part 3): conditionals, relative clauses, comparatives, or passive voice.',
        'Aim for most of your sentences on familiar topics to come out completely accurate.',
        'Practise conditionals specifically (if I had..., if I were...), since they stand out clearly at band 7.',
        'Vary sentence length: mix short, direct sentences with longer complex ones.',
      ],
      stopThis: [
        'Stop using only one type of complex structure throughout the whole test.',
        'Stop letting grammar mistakes persist on the same familiar-topic sentences you have already practised.',
      ],
      example: {
        before: 'If I have more time, I will travel more, I think it is important.',
        after: 'If I had more time, I would definitely travel more, since I think it broadens the way you see the world.',
        why: 'The original mixes present and future forms incorrectly for a hypothetical idea. The revision uses the correct second conditional ("If I had... I would...") and adds a relative-style justification, which is the range and accuracy band 7 asks for.',
      },
      practice:
        'Answer 4 questions using a second conditional each time ("If I had...", "If I were..."). Check the verb forms carefully. 15 minutes.',
    },
    {
      from: 7,
      to: 8,
      whatChanges:
        'Band 8 asks for a wide range of structures used flexibly, where the majority of sentences are error-free, with only very occasional inappropriacies or basic errors. Band 7 already produces frequent error-free sentences, but some grammatical mistakes still persist regularly.',
      doThis: [
        'Use a wide range of structures within a single answer, mixing tenses, conditionals, passive voice, and relative clauses naturally.',
        'Check on a recording that more than half of all your sentences across the test are completely error-free.',
        'Practise unscripted, spontaneous complex sentences on unfamiliar Part 3 topics, not memorised ones.',
        'Fix any remaining systematic error (one you make the same way repeatedly) through targeted drilling.',
      ],
      stopThis: [
        'Stop making the same grammar mistake in a pattern across multiple answers. That counts as systematic, not occasional.',
        'Stop relying on complex structures only in prepared, memorised sections.',
      ],
      example: {
        before: 'This is a policy that has been introduce by many governments, and it help a lot of people.',
        after: 'This is a policy that has been introduced by many governments, and it has helped a great number of people.',
        why: 'The original repeats a past-participle error ("introduce" instead of "introduced") and a subject-verb agreement error ("it help"). The revision fixes both, matching the "majority of sentences error-free" standard at band 8.',
      },
      practice:
        'Record yourself answering 3 unfamiliar Part 3 questions without preparation. Listen back and mark every recurring error type, then drill that one specifically. 20 minutes.',
    },
    {
      from: 8,
      to: 9,
      whatChanges:
        'Band 9 asks for a full range of structures used naturally and appropriately, with consistently accurate structures apart from slips characteristic of native speaker speech. This band is extremely rare: it describes accuracy that holds up even under the pressure of real-time speech.',
      doThis: [
        'Use complex structures so naturally they are indistinguishable from spontaneous native speech, with no visible effort attached to them.',
        'Keep accuracy consistent across all topics, in both prepared and unprepared answers.',
        'Accept that only slips a native speaker might also make (a false start, a minor self-correction) should remain.',
      ],
      stopThis: [
        'Stop treating any non-native-style error as a "slip". At this level, accuracy should hold even under pressure.',
      ],
      example: {
        before: 'What I would say is that, if the trend continues, it\'s going to have a big impact on how people work.',
        after: 'If the trend continues, it\'s going to reshape how people work, and probably faster than most people expect.',
        why: 'Both are fluent and accurate, but the second is tighter and more natural, dropping the filler opener and using "reshape" and a spontaneous-sounding addition, which reads closer to unscripted native speech at band 9.',
      },
      practice:
        'Record a full mock Part 3 discussion. Listen for any grammar error and judge honestly whether a native speaker would ever make that particular one. 20 minutes.',
    },
  ],

  pronunciation: [
    {
      from: 4,
      to: 5,
      whatChanges:
        'Band 4 has a limited range of pronunciation features with frequent mispronunciations that cause the listener some difficulty. Band 5 shows all the positive features of band 4 plus some, but not all, of band 6: fewer frequent lapses, and some effective use of a wider range of features beginning to appear.',
      doThis: [
        'Identify your 3 to 5 most frequently mispronounced sounds (many students struggle with th, r/l, or final consonants) and drill them daily.',
        'Mark word stress on new vocabulary when you learn it, and say the word aloud stressing the right syllable.',
        'Practise linking words together in short phrases ("an apple", not "a... napple... pause") instead of pronouncing every word separately.',
        'Slow down slightly so individual sounds come out clearly. Speed can come later.',
      ],
      stopThis: [
        'Stop speaking so fast that individual sounds get dropped or blurred.',
        'Stop guessing at stress placement on multi-syllable words. Look it up and practise it.',
      ],
      example: {
        before: '"comfortable" said as com-for-TAB-le, with the wrong syllable stressed and each syllable given equal weight.',
        after: '"comfortable" said as COM-fter-bl, with the stress clearly on the first syllable and the middle syllables shortened naturally.',
        why: 'Wrong word stress is one of the clearest causes of the "frequent mispronunciation" that band 4 describes. Fixing stress on individual words is a concrete first step toward the more controlled features band 5 begins to show.',
      },
      practice:
        'Pick 5 words you use often and often mis-stress. Look up their stress pattern and say each one aloud 10 times, exaggerating the stressed syllable. 15 minutes.',
    },
    {
      from: 5,
      to: 6,
      whatChanges:
        'Band 6 uses a range of pronunciation features with mixed control: some effective use, though not sustained, and the speaker can generally be understood throughout even though individual word or sound mispronunciations reduce clarity at times. Band 5 only shows some, not most, of these features.',
      doThis: [
        'Practise sentence stress: stress the key content words (nouns, verbs, adjectives) in each sentence rather than every word equally.',
        'Use chunking: group words into short meaningful phrases with a brief pause between them, rather than one long run-on stream.',
        'Record a short answer and check whether a listener could understand it throughout, even with some mispronounced words.',
        'Work specifically on the individual sounds that most often confuse listeners for your first language background.',
      ],
      stopThis: [
        'Stop pronouncing every word with equal, flat stress.',
        'Stop running all your words together without any chunking or phrase breaks.',
      ],
      example: {
        before: 'A flat, evenly stressed reading of "I think it\'s a really good idea" with no word standing out.',
        after: 'The same sentence with clear stress on THINK and GOOD, and a small pause after "I think", so the key words stand out.',
        why: 'Flat stress makes speech harder to follow even when every sound is correct. Adding sentence stress and a chunking pause is the "some effective use of features" band 6 is listening for, even if it is not yet sustained throughout.',
      },
      practice:
        'Take one memorised sentence. Say it 5 times, each time stressing a different word, and notice how the meaning shifts. Then say it naturally, stressing only the key content words. 15 minutes.',
    },
    {
      from: 6,
      to: 7,
      whatChanges:
        'Band 7 shows all the positive features of band 6 and some, but not all, of band 8: sustained control moving toward a wide range of features with only occasional lapses, easy to understand throughout, with accent having minimal effect on intelligibility.',
      doThis: [
        'Extend your control of stress and chunking so it holds up for longer answers (Part 2\'s 2-minute monologue), not just short Part 1 answers.',
        'Add intonation that shows attitude and meaning: a rising tone for surprise or a question, a falling tone to sound confident and final.',
        'Practise weak forms: the quick, unstressed pronunciation of small words like "to", "and", "of" in fast natural speech (for example, "cup of tea" sounding like "cuppa tea").',
        'Check that listeners understand you throughout a whole answer, not just in short bursts.',
      ],
      stopThis: [
        'Stop letting your pronunciation control drop in the second half of longer answers.',
        'Stop pronouncing every small function word (to, of, and) fully and heavily, as if reading aloud.',
      ],
      example: {
        before: '"I go to the CIty CENter EVery WEEKend to MEET my FRIENDS" said with every word stressed equally and no pause anywhere.',
        after: '"I go to the city CENTRE every WEEKEND | to meet my FRIENDS" with stress only on the key content words (centre, weekend, friends) and one chunk break (marked here as |) before the final phrase.',
        why: 'Stressing every word equally, as the first version does, buries the words that actually carry the meaning. Putting sentence stress on centre, weekend and friends, and pausing briefly at one natural phrase boundary, is the chunking and stress control band 7 asks for.',
      },
      practice:
        'Speak on one Part 2 cue card for the full 2 minutes. Record it, then compare your pronunciation control in the first 30 seconds versus the last 30 seconds. 20 minutes.',
    },
    {
      from: 7,
      to: 8,
      whatChanges:
        'Band 8 uses a wide range of pronunciation features and sustains flexible use of them with only occasional lapses, is easy to understand throughout, and any L1 accent has minimal effect on intelligibility. Band 7 shows only some of these positive features, not all of them.',
      doThis: [
        'Sustain strong stress, chunking, and intonation control across the entire test, all three parts, not just your strongest moments.',
        'Use intonation deliberately to signal meaning (contrast, emphasis, a list), rather than by accident.',
        'Reduce lapses on your hardest individual sounds until they appear rarely, not routinely.',
        'Get feedback from a fluent English speaker on whether your accent ever actually blocks understanding, and target only those specific moments.',
      ],
      stopThis: [
        'Stop accepting occasional unintelligible words as normal. At this level, lapses should be rare, not routine.',
        'Stop worrying about removing your accent entirely. The goal is intelligibility, not sounding native.',
      ],
      example: {
        before: '"I like the city but I prefer the countryside" said with flat, level pitch throughout, so the contrast the word "but" signals is not audible.',
        after: '"I like the city↗ but I prefer the countryside↘" with the pitch rising on city and falling on countryside, so the contrast is heard, not just stated.',
        why: 'Band 7 can produce the right words for a contrast without the intonation to match it. Using a rise on the first item and a fall on the second is a concrete, controllable way to make that contrast audible, which is the deliberate use of intonation band 8 asks for.',
      },
      practice:
        'Do a full 3-part mock speaking test. Rate your own pronunciation control out of 5 for each part separately, and note exactly where it drops. 20 minutes.',
    },
    {
      from: 8,
      to: 9,
      whatChanges:
        'Band 9 uses a full range of pronunciation features with precision and subtlety, sustains flexible use of them throughout, and is effortless to understand at every point. This band is extremely rare: it describes control with no noticeable dip anywhere in the test.',
      doThis: [
        'Use the full range of stress, chunking, intonation, and linking with precision in every part of the test, with no noticeable dip in control.',
        'Aim for speech that requires zero effort from the listener to follow, at any point across the 11 to 14 minutes.',
      ],
      stopThis: [
        'Stop treating any remaining lapse as acceptable. At band 9, control is sustained without exception.',
      ],
      example: {
        before: 'Clear, easy-to-follow speech throughout, with rare moments where a listener has to concentrate slightly harder to catch a word.',
        after: 'The same speech with those rare moments removed entirely, so understanding it takes no conscious effort at any point.',
        why: 'Band 8 already allows "occasional lapses". Band 9 asks for the same wide range of features but with the last of those occasional lapses removed, so listening feels completely effortless throughout.',
      },
      practice:
        'Record a full mock interview. Mark the exact moments, if any, where a listener would need to concentrate to understand you, and work on those specific sounds or words. 20 minutes.',
    },
  ],
};

/** Picks the guide step for a whole band, clamped to the guide's own range:
    a band below the lowest step gets the lowest step (4 to 5), a band at or
    above the highest gets the highest (8 to 9). */
export function guideFor(guides: BandStepGuide[], band: number): BandStepGuide | undefined {
  if (guides.length === 0) return undefined;
  const min = guides[0]!.from;
  const max = guides[guides.length - 1]!.from;
  const whole = Math.max(min, Math.min(max, Math.round(band)));
  return guides.find((g) => g.from === whole);
}
