/* Model-answer bank for the Writing section. Original material, written to
   sit alongside writing-prompts.ts: every Task 2 prompt gets a Band 6.0,
   7.0 and 8.0 sample (or 7.0/8.0 only, once the twelve-prompt cap is
   reached, see the note below); every Task 1 prompt gets a Band 7.0 and
   8.5 sample. Drives /writing/models. Prompt text stays in
   writing-prompts.ts; this file references prompts by id only.

   There are ten Task 2 prompts in writing-prompts.ts as of writing, so all
   ten get the full three-band set, so the "first twelve get three bands"
   fallback in the brief never triggers today, but MODEL_ANSWERS is written
   defensively (see getModelAnswers) so a future eleventh or twelfth Task 2
   prompt still resolves sensibly even without a matching entry here. */

import type { WritingTask } from '../lib/writing/schema';

export type ModelBand = 6 | 7 | 8 | 8.5;

export interface ModelAnswerCriteria {
  /** Task 2 only. */
  taskResponse?: string;
  /** Task 1 only. */
  taskAchievement?: string;
  coherence: string;
  lexical: string;
  grammar: string;
}

export interface ModelHighlight {
  /** Exact substring of the essay text (must appear in one of the
      paragraphs) that gets wrapped and made hoverable in the UI. */
  phrase: string;
  note: string;
}

export interface ModelAnswer {
  promptId: string;
  task: WritingTask;
  band: ModelBand;
  /** Paragraphs, in order. Joined with blank lines for word counting and
      rendered as separate <p> elements. */
  text: string[];
  highlights: ModelHighlight[];
  criteria: ModelAnswerCriteria;
}

export const MODEL_ANSWERS: ModelAnswer[] = [
  /* ───────────────────────── w2-technology-social ───────────────────────── */
  {
    promptId: 'w2-technology-social',
    task: 'task2',
    band: 6,
    text: [
      'Nowadays, a lot of people believe that modern technology such as smartphones and social media are making people less sociable. In my opinion, I agree with this statement, because technology often replace real communication with virtual communication and this cause problems in relationships.',
      'Firstly, when people use their phones all the time, they do not talk to their family or friends face-to-face. For example, many young people spend hours on social media apps instead of going outside and meeting their friends in person. This is a big problem because face-to-face interaction is very important for building a strong relationship. Also, it is common now to see a group of friends sitting in a restaurant who are all looking at their phones instead of talking with each other. This shows how technology can reduce sociability in everyday life, even when people are physically together.',
      'Secondly, technology can also cause social isolation, especially for older people who does not know how to use new apps. They may feel lonely because their children communicate with them only by messages, not by visiting them. However, some people think technology help people to stay connected with others who live far away, for example through video calls. But in my opinion, this kind of virtual connection is not the same as a real connection, because a person cannot feel the same emotion or warmth through a screen as they can in person.',
      'In conclusion, I believe that modern technology is making people less sociable, because it reduce the amount of face-to-face interaction and can lead to social isolation. Although technology has some benefit, people should try to spend more time talking with others in real life.',
    ],
    highlights: [
      { phrase: 'technology such as smartphones and social media are making people less sociable', note: "grammar slip: 'technology' takes a singular verb, so this should read 'is making'" },
      { phrase: 'This is a big problem because', note: 'a formulaic way of marking importance, the claim is asserted rather than explained' },
      { phrase: 'older people who does not know how to use new apps', note: "grammar slip: subject-verb agreement, should be 'who do not know'" },
      { phrase: 'In my opinion, I agree with this statement', note: 'position is clear but the wording is simple and close to what appears again in the conclusion' },
      { phrase: 'it reduce the amount of face-to-face interaction', note: "grammar slip: missing third-person 's', should be 'it reduces'" },
    ],
    criteria: {
      taskResponse: 'The essay states a clear position early and keeps it throughout, but the ideas are underdeveloped, leaning on one example per paragraph rather than a fuller explanation. The restaurant example largely restates the point already made about face-to-face contact rather than adding a new angle.',
      coherence: "Paragraphing is logical, with an introduction, two body paragraphs and a conclusion, and basic linkers like 'Firstly' and 'Secondly' guide the reader through it. Cohesion within paragraphs, though, rests on a narrow set of devices, mainly 'because', 'Also' and 'For example', rather than a varied range.",
      lexical: "Vocabulary is adequate for the topic (face-to-face interaction, social isolation) but limited in range, with 'people' and 'communication' leaned on repeatedly instead of being paraphrased. There is little attempt at less common vocabulary beyond the topic phrases the question invites.",
      grammar: "A mix of simple and complex sentences is attempted, but subject-verb agreement slips ('social media are making', 'people who does not know', 'it reduce') recur throughout the response. These errors rarely block understanding, but their frequency is what keeps accuracy at this band.",
    },
  },
  {
    promptId: 'w2-technology-social',
    task: 'task2',
    band: 7,
    text: [
      'It is often argued that modern technology, particularly smartphones and social media, is making people less sociable than in the past. I largely agree with this view, since technology increasingly replaces genuine face-to-face contact with a more superficial, screen-based form of interaction.',
      'The main reason is that constant phone use displaces real conversation. Many young people now spend several hours a day scrolling through social media rather than meeting friends in person, and this has a noticeable effect on their social skills. A clear illustration of this is the common sight of a group of friends sitting together in a cafe, each absorbed in their own device instead of talking to one another. Although they are physically present, the quality of their interaction is arguably lower than it would have been a generation ago, which suggests that technology is eroding traditional social habits rather than simply changing them.',
      'A further concern is the isolation that can result from excessive reliance on digital communication, particularly among older adults who struggle to adapt to new platforms. Their children may message them regularly, yet rarely visit, leaving a gap that text alone cannot fill. It is true that technology also offers genuine benefits, such as video calls that let families stay in touch across long distances. Nevertheless, a virtual connection maintained mainly through a screen cannot fully replace the warmth of face-to-face contact, and it should be seen as a supplement to real relationships rather than a replacement for them.',
      'In conclusion, while technology has undoubtedly made communication more convenient, I believe it has also made people less sociable overall, by reducing face-to-face interaction and, for some groups, deepening social isolation.',
    ],
    highlights: [
      { phrase: 'I largely agree with this view', note: 'clear position stated in the introduction and maintained to the end' },
      { phrase: 'eroding traditional social habits', note: 'precise, less common vocabulary used accurately' },
      { phrase: 'Although they are physically present', note: 'concession used to sharpen the argument rather than just add another fact' },
      { phrase: 'It is true that technology also offers genuine benefits', note: "hedging: acknowledges the opposing view before returning to the essay's position" },
      { phrase: 'Nevertheless', note: "cohesive device that signals contrast without repeating 'however' again" },
    ],
    criteria: {
      taskResponse: 'The essay takes a clear, consistent position and develops two distinct, well-explained reasons rather than a list of loosely connected points. Each is extended with a specific illustration, which keeps the response focused on the exact question asked rather than drifting into general comment.',
      coherence: "Paragraphing is logical and each body paragraph opens with a clear topic sentence, so the argument is easy to follow from start to finish. A wider range of cohesive devices is used ('A further concern', 'Nevertheless', 'which suggests that') rather than relying only on 'Firstly' and 'Secondly'.",
      lexical: "Less common vocabulary ('eroding', 'displaces', 'superficial') is used with reasonable precision, and topic-specific phrases are woven naturally into the argument rather than dropped in awkwardly. Some repetition of simpler words ('technology', 'interaction') keeps this just short of Band 8.",
      grammar: "A good range of complex structures appears, including concession clauses ('Although they are physically present') and relative clauses, mostly controlled with accuracy. The few remaining slips are minor and do not affect meaning, which is consistent with a Band 7 script.",
    },
  },
  {
    promptId: 'w2-technology-social',
    task: 'task2',
    band: 8,
    text: [
      'Few would dispute that technology now occupies an ever-greater share of daily life, and many observers claim it is quietly making people less sociable. I share this view: for all its convenience, technology has tended to substitute shallow, screen-mediated contact for the richer exchanges that face-to-face conversation once demanded.',
      'To begin with, the sheer amount of time spent on devices leaves little room for spontaneous social contact. Where a previous generation might have called a friend or arranged to meet, many young people now default to a quick message or a scroll through social media, a habit that quietly erodes the skills needed to sustain deeper relationships. Nowhere is this more visible than in a restaurant or cafe, where groups of friends sit together yet remain absorbed in separate screens, physically present but socially absent. Such scenes illustrate how technology can hollow out togetherness even as it appears to bring people closer.',
      'Equally significant is the isolation technology can impose on those least equipped to navigate it, most notably the elderly. Grandparents who once received regular visits may now hear from family only through brief, infrequent messages, a thinner substitute for genuine company. Admittedly, video calling has done much to narrow the distance between separated relatives, and it would be churlish to deny its value. Even so, a relationship conducted largely through a screen inevitably lacks the warmth, spontaneity and nuance of one built in person, so at best it complements, rather than replaces, real human contact.',
      'On balance, then, while technology has transformed how easily people can connect, it has simultaneously undermined the depth and frequency of genuine interaction, leaving many people more connected on paper yet less sociable in practice.',
    ],
    highlights: [
      { phrase: 'hollow out togetherness even as it appears to bring people closer', note: "skilful, image-driven phrasing that captures the essay's central paradox" },
      { phrase: 'physically present but socially absent', note: 'concise, parallel structure used for emphasis' },
      { phrase: 'Admittedly', note: "signals a concession clearly before the argument returns to the essay's main position" },
      { phrase: 'it would be churlish to deny its value', note: 'idiomatic, precise phrasing rarely seen below Band 8' },
      { phrase: 'On balance, then', note: "sophisticated cohesive opener that ties the conclusion back to the essay's central tension" },
    ],
    criteria: {
      taskResponse: "The response develops a fully extended, nuanced argument rather than a simple list of reasons, weighing technology's convenience against its social cost throughout. Every idea is fully developed and directly relevant to the question, and the conclusion sharpens the position rather than merely repeating the introduction.",
      coherence: "Paragraphing and sequencing are logical and skilful, with each paragraph building on the last rather than sitting as an isolated point. A wide, varied range of cohesive devices ('Equally significant', 'Admittedly', 'Even so', 'On balance') links ideas naturally without ever feeling mechanical.",
      lexical: "Vocabulary is used with precision and flexibility ('hollow out', 'churlish', 'nuance'), including less common collocations that sound natural rather than inserted for effect. Word choice is varied throughout, with almost no unnecessary repetition of common terms.",
      grammar: 'A wide range of complex structures, including concession clauses, parallel structures and varied sentence openings, is used with full control and no noticeable errors. Sentence length and pattern are varied deliberately for effect, which is characteristic of a Band 8 script.',
    },
  },
  /* ───────────────────────── w2-university-purpose ───────────────────────── */
  {
    promptId: 'w2-university-purpose',
    task: 'task2',
    band: 6,
    text: [
      'Nowadays, there is a debate about what university education is really for. Some people think the main purpose is to prepare students for a job, but other people believe it should give knowledge for its own value. In this essay, I will discuss both views and give my opinion.',
      'On the one hand, many people believe that university should focus on job. This is because the world is very competitive now, and student need practical skill to find a good job after they graduate. For example, subjects like engineering or business teach student skills that companies want directly. If university only teach theory with no connection to real job, students may finish their studies but still cannot find employment. This is why many parents want their children to choose a vocational subject instead of a general one.',
      'On the other hand, other people think university should develop knowledge for its own sake, not just for a job. They believe that learning about history, philosophy or art make a person more well-rounded, even if it does not lead directly to a career. In my opinion, I agree with this view a little, because not every student go to university only to get a job, some of they want to learn and grow as a person. However, I think both views are important and university should try to balance job skills and general knowledge together.',
      'In conclusion, while some people believe university is for preparing student for employment, others think it should develop knowledge for its own sake. In my opinion, both purposes are valuable and university should not focus on only one of them.',
    ],
    highlights: [
      { phrase: 'In this essay, I will discuss both views and give my opinion', note: 'clear essay roadmap, though a fairly formulaic way of signalling it' },
      { phrase: 'student need practical skill to find a good job', note: "grammar slip: missing plural forms, should be 'students need practical skills'" },
      { phrase: 'some of they want to learn and grow as a person', note: "grammar slip: wrong pronoun form, should be 'some of them'" },
      { phrase: 'history, philosophy or art make a person more well-rounded', note: "grammar slip: subject-verb agreement, should be 'makes'" },
      { phrase: 'both views are important', note: 'balanced language for a discussion essay, but a fairly generic way to bridge toward a merged opinion' },
    ],
    criteria: {
      taskResponse: "Both views are presented and a personal opinion is given, which meets the basic requirement of the task, but the discussion of each view stays fairly general rather than fully developed. The writer's own opinion in the second body paragraph is stated but not argued for with much depth.",
      coherence: "The essay follows a standard four-paragraph discussion structure, and 'On the one hand' / 'On the other hand' clearly separate the two views for the reader. Beyond this pairing, the range of linking language is narrow, and some sentences are joined only with 'and' or 'but'.",
      lexical: "Topic vocabulary such as 'vocational subject' and 'well-rounded' is used correctly, but general vocabulary is repeated ('people think', 'believe') rather than varied. Word forms occasionally slip, with a plural idea sometimes expressed through a singular noun.",
      grammar: "Simple and some complex sentences are attempted, but plural and subject-verb agreement errors ('student need', 'some of they') appear more than once. These do not seriously affect communication, but their frequency is typical of a Band 6 script.",
    },
  },
  {
    promptId: 'w2-university-purpose',
    task: 'task2',
    band: 7,
    text: [
      'There is ongoing debate about the true purpose of a university education: some believe it exists chiefly to prepare students for the workplace, while others argue its value lies in knowledge pursued for its own sake. This essay will discuss both perspectives before concluding that neither should be pursued at the expense of the other.',
      'Those who prioritise employability point out that graduates now enter an increasingly competitive job market, where practical, job-ready skills are essential. Degrees in fields such as engineering, medicine or business are valued precisely because they equip students with abilities employers actively seek. Without this vocational focus, some argue, universities risk producing graduates who are academically capable yet unprepared for the realities of work, leaving them at a disadvantage compared with peers who studied more directly applicable subjects.',
      'Others, however, maintain that university should cultivate intellectual curiosity rather than simply serve the labour market. Subjects such as philosophy or literature rarely lead directly to a specific career, yet they sharpen critical thinking and produce well-rounded graduates capable of adapting to change. From this perspective, reducing education to job training narrows its purpose considerably, ignoring the broader personal and societal benefits that come from studying a subject purely because it interests the learner. This is particularly true in fields where the exact skills employers demand shift faster than any curriculum could realistically be redesigned to match.',
      'In my view, both purposes matter and need not be mutually exclusive; a university that combines practical training with genuine intellectual breadth is better placed to serve its students than one committed to either aim alone.',
    ],
    highlights: [
      { phrase: 'This essay will discuss both perspectives before concluding that neither should be pursued at the expense of the other', note: "clear roadmap that also previews the essay's final position" },
      { phrase: 'equip students with abilities employers actively seek', note: 'precise collocation used accurately' },
      { phrase: 'sharpen critical thinking', note: 'less common verb-noun pairing, used naturally' },
      { phrase: 'reducing education to job training narrows its purpose considerably', note: 'clear, confident evaluation of the opposing extreme' },
      { phrase: 'need not be mutually exclusive', note: 'hedging phrase that softens the claim while keeping the position clear' },
    ],
    criteria: {
      taskResponse: "Both views are discussed with genuine development rather than a single sentence each, and the writer's own opinion is clearly signalled and returned to in the conclusion. The response stays fully on topic throughout, addressing exactly what the question asks.",
      coherence: "Paragraphing is clear and logical, and topic sentences at the start of each body paragraph make the structure easy to follow without needing to say 'On the one hand' or 'On the other hand' explicitly. Cohesion across sentences is achieved through a range of devices, including reference words and logical connectors, not just simple linkers.",
      lexical: "Less common vocabulary ('employability', 'intellectual curiosity', 'mutually exclusive') is used accurately and appropriately for an academic register. There is little repetition, and word choice supports precision rather than just filling space.",
      grammar: 'A wide range of sentence structures, including a colon-introduced list and subordinate clauses, is used accurately throughout. The rare minor slip does not interfere with meaning, which is typical of Band 7 control.',
    },
  },
  {
    promptId: 'w2-university-purpose',
    task: 'task2',
    band: 8,
    text: [
      'Whether a university exists primarily to prepare students for work or to cultivate knowledge for its own sake is a long-standing question with no simple answer. I would argue that the two aims are not rivals at all, but complementary strands of the same broader purpose.',
      'Proponents of the vocational view rightly note that graduates now compete in an unforgiving labour market, where employers increasingly favour candidates with demonstrable, job-ready skills. A degree in engineering or nursing, for instance, confers immediate practical value, and universities that ignore this reality risk leaving their graduates ill-equipped for employment. Yet framing education solely in economic terms overlooks the fact that the most adaptable workers are often those who can think critically and communicate clearly, qualities that a narrowly vocational curriculum does not always cultivate. This point matters more, not less, in an era when entire job categories can disappear within a single generation.',
      "Advocates of knowledge for its own sake, meanwhile, contend that a university's deeper purpose is to nurture curiosity and independent thought, regardless of any career payoff. Studying philosophy or literature may never translate directly into a job title, yet it hones exactly the analytical and communicative faculties employers claim to prize. Seen this way, the supposedly impractical subjects are, paradoxically, among the most transferable, precisely because they train the mind rather than a narrow skill set that could be obsolete within a decade.",
      'Ultimately, a university that marries rigorous academic enquiry with genuine preparation for the workplace serves students far better than one that sacrifices either aim, since employability and intellectual growth are, on closer inspection, mutually reinforcing rather than opposed.',
    ],
    highlights: [
      { phrase: 'complementary strands of the same broader purpose', note: "precise, image-based phrase that frames the whole essay's argument" },
      { phrase: 'framing education solely in economic terms overlooks the fact that', note: "sophisticated way of introducing a counterpoint without a simple 'however'" },
      { phrase: 'hones exactly the analytical and communicative faculties employers claim to prize', note: 'wide, precise vocabulary used with full control' },
      { phrase: 'paradoxically', note: "single-word cohesive device that signals a twist in the argument efficiently" },
      { phrase: 'mutually reinforcing rather than opposed', note: "skilful final contrast that closes the essay's argument precisely" },
    ],
    criteria: {
      taskResponse: 'The essay develops a genuinely nuanced position, showing how the two views relate to each other rather than simply listing them side by side. Every paragraph directly advances the argument, and the conclusion offers real insight rather than a restatement of the introduction.',
      coherence: 'Ideas progress with clear logical development from paragraph to paragraph, each building on a tension raised in the last. Cohesion is achieved through sophisticated means, including paraphrase and logical sequencing, rather than a checklist of simple linking words.',
      lexical: "Vocabulary is precise, wide-ranging and used with natural collocation throughout ('ill-equipped', 'transferable', 'mutually reinforcing'). There is no repetition of basic vocabulary and no sign of vocabulary being used just to sound impressive rather than to communicate meaning.",
      grammar: 'A wide range of complex structures is used flawlessly, including embedded clauses and parallel contrastive structures, with full flexibility and control. Sentence length and rhythm vary deliberately, giving the writing the fluency associated with the top of the band scale.',
    },
  },
  /* ───────────────────────── w2-city-traffic ───────────────────────── */
  {
    promptId: 'w2-city-traffic',
    task: 'task2',
    band: 6,
    text: [
      'Traffic congestion is a serious problem in many big cities today and it is getting worse every year. This essay will explain what problems this cause and suggest some measures that government can take to solve them.',
      'Traffic congestion cause many problems for people who live in cities. Firstly, it wastes a lot of time, because commuter must sit in their car for long time instead of doing something useful. This can make people feel stressed and tired before they even arrive at work. Secondly, traffic jam also increase pollution, because car engines produce more carbon emissions when they are stuck in gridlock and not moving. This is bad for environment and also for people health, especially children and old people who breathe the polluted air every day near busy road.',
      'There are several measures government can take to solve this problem. One solution is to invest more money in public transport network, such as bus and train, so people do not need to use their own car. Another measure is to introduce a congestion charge in city centre, which will make driver think twice before entering busy area with their car. Some cities like London already do this successfully. Government could also build more cycle lane to encourage people to ride bicycle instead of driving, which is cheaper and better for environment too. If government use all these measure together, traffic in the city centre could become much less over time.',
      'In conclusion, traffic congestion in cities cause wasted time and more pollution, but government can solve these problem by improving public transport, charging driver to enter city centre, and building more cycle lane for people.',
    ],
    highlights: [
      { phrase: 'Traffic congestion cause many problems for people who live in cities', note: "grammar slip: subject-verb agreement, should be 'causes'" },
      { phrase: 'This is bad for environment and also for people health', note: "grammar slip: missing article and possessive, should be 'the environment' and 'people's health'" },
      { phrase: 'Some cities like London already do this successfully', note: 'good real-world reference, though it is not developed any further' },
      { phrase: 'invest more money in public transport network', note: 'topic vocabulary used correctly' },
      { phrase: 'solve these problem by improving public transport', note: "grammar slip: should be 'these problems'" },
    ],
    criteria: {
      taskResponse: "Both the problems and the solutions asked for in the question are addressed, and the two-part structure is easy to identify, but each point is explained only briefly rather than developed with a specific example. The solutions given are relevant but read as a simple list rather than an evaluated set.",
      coherence: "The essay is organised into a clear problems paragraph and a clear solutions paragraph, matching the question's two parts. Within each paragraph, 'Firstly' and 'Secondly' organise the points, though the range of connecting language beyond this is limited.",
      lexical: "Topic vocabulary for this subject ('gridlock', 'carbon emissions', 'congestion charge') is used appropriately, showing preparation for this kind of question. General vocabulary is more repetitive, with 'problem' and 'people' both appearing several times.",
      grammar: "Sentence forms are mostly simple, with occasional complex sentences using 'because' or 'which'. Plural and subject-verb agreement slips ('congestion cause', 'traffic jam also increase', 'these problem') recur and are typical of this band.",
    },
  },
  {
    promptId: 'w2-city-traffic',
    task: 'task2',
    band: 7,
    text: [
      'Traffic congestion in major cities is worsening year on year, bringing with it a range of problems for residents and the environment alike. This essay will outline the main problems this trend causes before considering several measures governments could realistically take to address them.',
      'The most immediate problem is the sheer amount of time lost by commuters stuck in gridlock, time that could otherwise be spent working, resting or with family. Beyond the personal cost, idling engines burn fuel far less efficiently than moving traffic, which drives up carbon emissions and worsens air quality in already densely populated areas. Children and elderly residents, who are more vulnerable to poor air quality, are disproportionately affected by pollution concentrated around busy roads, making this as much a public health issue as an economic one.',
      "Governments have several effective options for tackling this. Investing heavily in a reliable public transport network gives commuters a genuine alternative to driving, reducing the number of vehicles on the road in the first place. A congestion charge, of the kind introduced in London, further discourages unnecessary car journeys into city centres by attaching a direct cost to them. Expanding dedicated cycle lanes offers a third avenue, encouraging shorter journeys to be made by bicycle rather than car, which cuts both congestion and emissions simultaneously. None of these measures works especially well in isolation, but together they can shift enough journeys away from private cars to make a genuine difference.",
      'In conclusion, unchecked traffic congestion imposes real costs in wasted time and worsening pollution, but a combination of stronger public transport, congestion pricing and cycling infrastructure could meaningfully ease the problem in most cities.',
    ],
    highlights: [
      { phrase: 'bringing with it a range of problems for residents and the environment alike', note: 'wide topic vocabulary introduced smoothly in the introduction' },
      { phrase: 'disproportionately affected', note: 'precise, less common phrase used accurately' },
      { phrase: 'of the kind introduced in London', note: 'specific real-world reference used to support the argument rather than as an isolated fact' },
      { phrase: 'which cuts both congestion and emissions simultaneously', note: 'clear evaluation of the proposed solution, not just a description of it' },
      { phrase: 'a combination of', note: 'cohesive device that ties the three solutions together in the conclusion' },
    ],
    criteria: {
      taskResponse: 'The essay directly answers both parts of the question, problems and solutions, with each point explained and, in most cases, linked to a specific consequence or example. The solutions are not just listed but briefly evaluated for how they address the problems raised earlier.',
      coherence: "Paragraphing matches the two-part question precisely, and each paragraph opens with a topic sentence that previews its content. A good range of cohesive devices, including reference ('this trend', 'this') and logical connectors, links ideas without over-relying on simple linkers.",
      lexical: "A strong range of topic vocabulary ('gridlock', 'congestion charge', 'carbon emissions') is used accurately and naturally within the argument rather than inserted mechanically. Some repetition of general vocabulary is present but does not undermine the overall range.",
      grammar: 'A variety of complex sentence structures, including non-defining relative clauses and comparative structures, is used with good control. Minor errors appear occasionally but never interfere with meaning, consistent with Band 7.',
    },
  },
  {
    promptId: 'w2-city-traffic',
    task: 'task2',
    band: 8,
    text: [
      "As cities grow, traffic congestion has become one of urban life's most persistent frustrations, imposing costs that extend well beyond the daily commute. This essay examines the problems such congestion creates before turning to measures capable of genuinely relieving it.",
      'Chief among these problems is the sheer waste of productive time, as commuters sit motionless in queues that lengthen year after year, eroding both wellbeing and economic output. Less visible but arguably more damaging is the environmental toll: idling engines burn fuel inefficiently, pushing carbon emissions higher precisely where population density, and therefore exposure, is greatest. Children and the elderly, whose lungs are least equipped to cope with polluted air, bear a disproportionate share of this burden, turning what looks like an inconvenience into a genuine public health concern that policymakers can no longer afford to treat as a secondary issue.',
      "Tackling this convincingly requires more than piecemeal measures. A well-funded public transport network gives commuters a credible alternative to the car, while a congestion charge, as London's experience demonstrates, sharpens the incentive to use it by making unnecessary driving costly. Investment in cycling infrastructure complements both, offering a low-cost, low-emission option for shorter journeys that public transport alone cannot always serve efficiently. Deployed together rather than in isolation, these measures tend to reinforce one another's effect, each making the others somewhat more attractive to commuters weighing up their options.",
      "Ultimately, traffic congestion is too complex a problem for any single fix, but cities that pair robust public transport with pricing and cycling investment stand the best chance of easing both the economic and environmental costs it imposes on residents.",
    ],
    highlights: [
      { phrase: 'imposing costs that extend well beyond the daily commute', note: "sets up the essay's argument with precise, economical phrasing" },
      { phrase: 'turning what looks like an inconvenience into a genuine public health concern', note: "skilful reframing that elevates the argument's stakes" },
      { phrase: "as London's experience demonstrates", note: 'real-world evidence integrated smoothly into the sentence rather than bolted on' },
      { phrase: 'Deployed together rather than in isolation', note: 'sophisticated structure linking the three solutions as a system, not a list' },
      { phrase: 'too complex a problem for any single fix', note: 'confident, precise final evaluation rather than a simple restatement' },
    ],
    criteria: {
      taskResponse: 'The response develops a genuinely coherent argument connecting the problems and solutions, rather than treating them as two disconnected halves. The final point about combining measures shows sophisticated task fulfilment, going beyond simply answering both parts of the question.',
      coherence: 'The argument develops with clear logical progression both within and between paragraphs, and the concluding sentence draws the whole essay together precisely. Cohesion is achieved through sophisticated reference and paraphrase rather than a reliance on stock linking phrases.',
      lexical: "Precise, wide-ranging vocabulary ('piecemeal', 'disproportionate share', 'sharpens the incentive') is used with full accuracy and natural collocation throughout. There is no repetition of basic vocabulary, and topic-specific terms are integrated fluently into more general academic language.",
      grammar: 'A wide range of complex structures, including non-finite clauses and sophisticated comparatives, is used with complete control and no errors. Sentence length and structure vary deliberately to manage emphasis, a hallmark of top-band writing.',
    },
  },
  /* ───────────────────────── w2-adv-disadv-remote-work ───────────────────────── */
  {
    promptId: 'w2-adv-disadv-remote-work',
    task: 'task2',
    band: 6,
    text: [
      'In recent years, more and more company allow their staff to work from home instead of going to the office. This essay will look at both the advantages and disadvantages of this growing trend.',
      'There are several advantage of working from home. Firstly, employee do not need to commute every day, which save them a lot of time and money on transport. This extra time can be used to relax, exercise, or spend time with family. Secondly, many worker feel they have a better work-life balance when they work from home, because they can manage their own schedule more flexible. For example, a parent can pick up their children from school and still finish their work later in the evening. This flexible working arrangement make people happier in their job overall, and some worker even say they feel less stressed than before.',
      'However, there are also some disadvantage to this trend. One problem is that some manager worry that productivity go down when staff are not in the office, because there is less direct supervision. Another disadvantage is isolation, some employee feel lonely when they work alone at home every day without seeing their colleague in person. This can make people feel disconnect from their company and also make teamwork more difficult, because face to face meeting are sometimes better for solving problem quickly.',
      'In conclusion, working from home has clear advantage like saving time and improving work-life balance, but it also has disadvantage such as lower productivity and isolation. Overall, I think company should let employee choose what work arrangement suit them best.',
    ],
    highlights: [
      { phrase: 'There are several advantage of working from home', note: "grammar slip: missing plural, should be 'advantages'" },
      { phrase: 'manage their own schedule more flexible', note: "grammar slip: should be the adverb 'flexibly'" },
      { phrase: 'productivity go down when staff are not in the office', note: "grammar slip: subject-verb agreement, should be 'goes down'" },
      { phrase: 'feel disconnect from their company', note: "grammar slip: should be the adjective 'disconnected'" },
      { phrase: 'Overall, I think company should let employee choose', note: 'the question asks only for advantages and disadvantages, so this closing opinion drifts slightly beyond what was asked' },
    ],
    criteria: {
      taskResponse: "The essay covers relevant advantages and disadvantages with one clear example for each side, addressing the neutral question that was actually asked. The conclusion adds a personal recommendation the question did not ask for, a minor but noticeable drift from the task.",
      coherence: "The two-part structure (advantages, then disadvantages) is clear, and each paragraph is internally organised around 'Firstly' and 'Secondly' or 'One problem... Another disadvantage'. Cohesion beyond this pattern is limited, with several sentences joined only by 'and' or 'because'.",
      lexical: "Relevant topic vocabulary ('work-life balance', 'flexible working arrangement') is used correctly, but plural and word-form errors reduce the accuracy of the range attempted. General vocabulary such as 'advantage' and 'disadvantage' is repeated rather than paraphrased.",
      grammar: "A mix of simple and complex sentences is used, but plural nouns and subject-verb agreement are inconsistent ('several advantage', 'productivity go down', 'some employee feel'), appearing several times across the essay. These are typical Band 6 slips that do not block understanding.",
    },
  },
  {
    promptId: 'w2-adv-disadv-remote-work',
    task: 'task2',
    band: 7,
    text: [
      'In recent years, a growing number of companies have allowed employees to work from home rather than commute to a central office. While this shift brings genuine benefits, it also introduces new challenges, both of which this essay will examine before offering a brief final assessment.',
      'The most obvious advantage is the time and money saved by eliminating the daily commute, time that employees can redirect towards rest, family or personal projects. This flexibility also allows staff to structure their day around personal commitments, such as childcare, without necessarily working fewer hours. As a result, many employees report a markedly improved work-life balance, which in turn tends to boost morale and, according to several surveys, long-term staff retention. Companies themselves often benefit too, since a happier, less stressed workforce tends to take fewer sick days and stay in post for longer.',
      'On the other hand, remote working is not without drawbacks. Some managers worry that productivity quietly declines without the structure and accountability of an office environment, though evidence on this point remains genuinely mixed. A more consistent concern is isolation: employees who work alone for extended periods can feel cut off from colleagues, and the resulting lack of spontaneous interaction can make collaborative problem-solving noticeably slower than it would be face to face. New employees in particular can struggle to build the informal relationships that usually develop naturally in a shared office.',
      'On balance, the benefits of remote working, particularly for wellbeing and flexibility, appear to outweigh its drawbacks for many employees, provided companies actively address the risks of isolation and reduced team cohesion.',
    ],
    highlights: [
      { phrase: 'both of which this essay will examine before offering a brief final assessment', note: 'clear roadmap that signals the neutral structure the question calls for' },
      { phrase: 'which in turn tends to boost morale', note: "cause-and-effect language used precisely to link the paragraph's ideas" },
      { phrase: 'though evidence on this point remains genuinely mixed', note: 'hedging: qualifies a claim rather than overstating it' },
      { phrase: 'cut off from colleagues', note: 'natural, idiomatic collocation used accurately' },
      { phrase: 'On balance', note: 'cohesive device suited to a discussion where both sides carry genuine weight' },
    ],
    criteria: {
      taskResponse: 'The essay addresses both advantages and disadvantages fully and proportionately, with the neutral framing the question calls for maintained until a brief, appropriately hedged final assessment. Each point is developed with a clear explanation rather than left as a bare claim.',
      coherence: "Paragraphing is clear and logically ordered, and cohesive devices such as 'As a result' and 'On the other hand' connect ideas smoothly across sentences. Reference words ('this shift', 'this point') are used accurately to avoid repeating full noun phrases.",
      lexical: "A good range of less common vocabulary ('morale', 'accountability', 'cohesion') is used accurately and appropriately for the topic. Collocations are generally natural, and there is minimal repetition of basic vocabulary.",
      grammar: 'A range of complex structures, including a non-defining relative clause and a conditional in the conclusion, is used with good control. Occasional minor slips do not affect meaning, consistent with Band 7.',
    },
  },
  {
    promptId: 'w2-adv-disadv-remote-work',
    task: 'task2',
    band: 8,
    text: [
      'The steady rise of remote working has reshaped how millions of people experience their jobs, trading the daily commute for the comfort, and complications, of the home office. This essay weighs the principal benefits of this shift against its less obvious costs.',
      'Chief among the advantages is the reclaimed time and money once spent commuting, which employees now redirect towards family, exercise or simply rest, with measurable benefits for wellbeing. Remote working also grants a degree of autonomy over how, and when, tasks get done, allowing staff to fold personal commitments around their working hours rather than the reverse. Unsurprisingly, surveys consistently link this flexibility to stronger morale and, over time, to lower staff turnover, a benefit that extends well beyond the individual employee and directly reduces the cost of constant recruitment for the organisation.',
      "The drawbacks, though less visible, are no less real. Productivity concerns persist, not because remote staff necessarily work less, but because the absence of an office's natural rhythm can blur the boundary between work and rest for some employees. More significant still is the risk of isolation: prolonged solitary working erodes the casual, incidental exchanges through which much genuine collaboration and troubleshooting actually happens, leaving teams slower to solve problems that a five-minute conversation would once have settled. Junior staff appear especially exposed to this, since they typically rely most heavily on the informal mentoring a shared office provides.",
      "Weighed together, remote working's gains in flexibility and wellbeing seem, for most employees, to outweigh its costs, though companies that ignore the risk of isolation do so at their teams' expense.",
    ],
    highlights: [
      { phrase: 'trading the daily commute for the comfort, and complications, of the home office', note: 'elegant parallel structure that previews both sides of the essay' },
      { phrase: 'fold personal commitments around their working hours rather than the reverse', note: 'precise, image-driven phrasing rather than a generic claim' },
      { phrase: 'erodes the casual, incidental exchanges through which much genuine collaboration and troubleshooting actually happens', note: 'sophisticated explanation of why isolation matters, not just that it exists' },
      { phrase: 'Weighed together', note: 'economical cohesive opener that signals the final balancing judgement' },
      { phrase: "do so at their teams' expense", note: 'idiomatic closing phrase used with full control' },
    ],
    criteria: {
      taskResponse: 'The essay offers a genuinely balanced, well-developed treatment of both sides, explaining the mechanism behind each advantage and disadvantage rather than simply naming it. The final assessment is precise and appropriately qualified rather than an unsupported flat verdict.',
      coherence: 'Ideas are sequenced with clear logical progression, and the essay reads as a single developing argument rather than two separate lists. Cohesion is achieved through sophisticated means, including parallel structure and precise reference, rather than repeated stock connectors.',
      lexical: "Vocabulary is precise and wide-ranging throughout ('autonomy', 'incidental exchanges', 'staff turnover'), with natural collocation and no repetition of basic terms. Word choice consistently sharpens meaning rather than simply filling space.",
      grammar: 'A wide range of complex grammatical structures is used with full accuracy, including parallel contrastive clauses and precise use of modality in the conclusion. Sentence variety is deliberate and controlled throughout, characteristic of Band 8.',
    },
  },
  /* ───────────────────────── w2-two-part-language-learning ───────────────────────── */
  {
    promptId: 'w2-two-part-language-learning',
    task: 'task2',
    band: 6,
    text: [
      'Many parents today believe that children should start learning a foreign language as early as possible. This essay will explain why some people hold this opinion, and then discuss the possible disadvantage of learning a language at a young age.',
      'There are several reason why parents want their child to learn language early. Firstly, many people believe that young children have a special ability to learn language more easy than adult, this is sometimes call the critical period. Because of this, parents think if their child start early, they will become fluent more quickly and naturally, almost like learning their own mother tongue. Secondly, some parents believe learning a second language early also help children cognitive development in general, not only their language skill, so it make their child smarter in other subject too.',
      'However, there are also some disadvantage to this approach. One problem is that young children may become confused between two language, especially if they are learn both at the same time without enough support. This can sometimes slow down their development in their mother tongue at the beginning. Another disadvantage is that learning a language can overburden young learner, because they already have many other thing to learn at school, and adding extra language lesson may make them feel stressed or tired, especially if they attend immersion programme after a long school day.',
      'In conclusion, some parents believe early language learning benefit their child cognitive development and fluency, but it can also cause confusion and put too much pressure on young learner. Both side should be consider carefully.',
    ],
    highlights: [
      { phrase: 'learn language more easy than adult', note: "grammar slip: should be 'more easily than adults'" },
      { phrase: 'sometimes call the critical period', note: "grammar slip: should be 'sometimes called'" },
      { phrase: 'help children cognitive development in general', note: "grammar slip: subject-verb agreement, should be 'helps'" },
      { phrase: 'may become confused between two language', note: "grammar slip: missing plural, should be 'languages'" },
      { phrase: 'Both side should be consider carefully', note: "grammar slip: should be 'Both sides should be considered carefully'" },
    ],
    criteria: {
      taskResponse: 'Both parts of the two-part question, why some people hold the view and what the disadvantages might be, are addressed directly, which meets the basic demand of the task. Each reason and disadvantage is named but only briefly explained, without a fully developed example for either.',
      coherence: "The essay is organised so that the first body paragraph answers the first question and the second body paragraph answers the second, an appropriate structure for this question type. Linking words such as 'Firstly', 'Secondly' and 'However' are used correctly but form a narrow, repeated set.",
      lexical: "Topic-specific vocabulary ('critical period', 'cognitive development', 'immersion programme') is used correctly, showing preparation for the topic. Plural nouns are frequently missing or misused, which affects the accuracy of an otherwise adequate range.",
      grammar: "Some complex sentences with 'because' and 'if' are attempted, but plural forms and subject-verb agreement are inconsistent throughout ('several reason', 'help children', 'two language'). This level of error is typical for Band 6 rather than a single isolated slip.",
    },
  },
  {
    promptId: 'w2-two-part-language-learning',
    task: 'task2',
    band: 7,
    text: [
      'Many parents today are keen for their children to begin learning a foreign language as early as possible, convinced that childhood offers a unique window for acquiring it. This essay will explore the reasoning behind this belief before considering the disadvantages that can accompany learning a language at a young age.',
      "The belief rests largely on the idea of a critical period in early childhood, during which the brain is thought to absorb language more naturally and effortlessly than at any later stage. Parents who accept this view often hope that early exposure will produce genuine fluency, closer to a second mother tongue than a subject learned through effort. There is also a widely held assumption that early bilingual learning supports broader cognitive development, sharpening a child's memory and problem-solving skills well beyond language itself, which makes an early start seem doubly worthwhile.",
      'Despite these appealing arguments, several disadvantages deserve consideration. Learning two languages simultaneously can, at least temporarily, confuse a young child and slow their progress in their mother tongue, particularly if support at home is inconsistent. There is also a real risk of overburdening children who are already adjusting to the demands of early schooling; adding structured language lessons, or an intensive immersion programme, on top of this can leave some children fatigued rather than genuinely engaged with learning.',
      'In conclusion, while the promise of natural fluency and cognitive benefits explains why many parents favour an early start, the risk of temporary confusion and excessive pressure means the approach should be introduced thoughtfully rather than assumed to suit every child.',
    ],
    highlights: [
      { phrase: 'convinced that childhood offers a unique window for acquiring it', note: 'precise, natural metaphor used accurately' },
      { phrase: 'which makes an early start seem doubly worthwhile', note: "clear link back to the paragraph's opening claim" },
      { phrase: 'Despite these appealing arguments', note: "cohesive device that signals the shift to the essay's second question" },
      { phrase: 'overburdening children who are already adjusting to the demands of early schooling', note: 'topic vocabulary used with precision in context' },
      { phrase: 'should be introduced thoughtfully rather than assumed to suit every child', note: 'measured final judgement rather than a flat yes or no' },
    ],
    criteria: {
      taskResponse: 'Both parts of the two-part question are answered fully and in a logical order, with each reason and disadvantage explained through a plausible mechanism rather than simply named. The conclusion offers a genuine synthesis rather than a repeated list of the points already made.',
      coherence: "Each body paragraph answers one part of the question clearly, and topic sentences make this structure explicit without needing repeated 'Firstly, Secondly' markers. A good range of cohesive devices links sentences within paragraphs, including reference and logical connectors.",
      lexical: "Topic vocabulary ('critical period', 'cognitive development', 'immersion programme') is integrated accurately into more general academic language, rather than sitting as isolated inserted phrases. Range is good, with limited repetition of basic vocabulary.",
      grammar: 'A range of complex structures, including a semicolon-linked sentence and a non-defining relative clause, is used accurately. Errors are rare and minor, consistent with Band 7 control of grammar.',
    },
  },
  {
    promptId: 'w2-two-part-language-learning',
    task: 'task2',
    band: 8,
    text: [
      'The conviction that children should learn a foreign language as early as possible rests on a compelling, if contested, idea: that early childhood offers a biological window for language acquisition unmatched at any later age. This essay considers that reasoning, and the disadvantages that can accompany acting on it too readily.',
      'Central to this belief is the notion of a critical period, during which children are thought to absorb a second language with the same apparent ease as their first, free of the self-consciousness that hampers adult learners. Parents drawn to this idea often anticipate a fluency closer to native command than to classroom competence, a prospect few later opportunities can match. Compounding this appeal is the widespread assumption that early bilingualism sharpens cognitive faculties well beyond language itself, from memory to flexible problem-solving, making an early start seem, to many parents, simply too valuable to pass up.',
      'Yet this reasoning can obscure real costs. Introducing two languages simultaneously risks temporary confusion, and in some cases a measurable, if usually short-lived, delay in a child\'s command of their mother tongue, particularly where support at home is patchy. More insidious is the danger of overburdening children already stretched by the ordinary demands of early schooling; layering intensive immersion on top of this can quietly tip enthusiasm into fatigue, undermining the very engagement early exposure is meant to foster.',
      'Ultimately, the case for an early start is genuinely strong, but it is strongest when tempered by attentiveness to the individual child, since a benefit pursued too aggressively can just as easily become a burden.',
    ],
    highlights: [
      { phrase: 'a compelling, if contested, idea', note: 'concise concession embedded within the sentence itself' },
      { phrase: 'free of the self-consciousness that hampers adult learners', note: 'precise, insightful detail rather than a generic claim' },
      { phrase: 'Compounding this appeal', note: "sophisticated cohesive device linking the paragraph's two supporting ideas" },
      { phrase: 'quietly tip enthusiasm into fatigue', note: 'vivid, precise phrasing capturing a subtle process' },
      { phrase: 'a benefit pursued too aggressively can just as easily become a burden', note: 'sharp, memorable closing judgement that ties both halves of the essay together' },
    ],
    criteria: {
      taskResponse: 'The response fully and skilfully answers both parts of the question, with the disadvantages paragraph explicitly building on tensions already hinted at in the first, so the essay reads as one connected argument rather than two separate answers. The conclusion offers a genuinely considered synthesis rather than a summary.',
      coherence: 'Development is logical and sophisticated throughout, with each paragraph anticipating and setting up the next. Cohesion relies on precise reference and paraphrase rather than a visible scaffold of linking words, giving the essay a notably fluent feel.',
      lexical: "Vocabulary is used with real precision and range throughout ('insidious', 'patchy', 'tempered by'), and topic-specific terms are woven naturally into more sophisticated general language. There is no repetition of basic vocabulary anywhere in the response.",
      grammar: 'A wide range of complex structures, including embedded concessive clauses and a semicolon-linked sentence, is used with complete accuracy and control. The writing shows genuine flexibility of expression, the hallmark of Band 8 grammatical range.',
    },
  },
  /* ───────────────────────── w2-opinion-environment-responsibility ───────────────────────── */
  {
    promptId: 'w2-opinion-environment-responsibility',
    task: 'task2',
    band: 6,
    text: [
      'Many people believe that government, not individual, should be mainly responsible for protecting the environment. In my opinion, I agree with this idea, because government have more power and money to make big change than one single person can do alone.',
      'Firstly, government can make law that force company and factory to reduce pollution, which is something individual cannot do by themself. For example, government can create environmental legislation that punish business who pollute the river or air with heavy fine. This kind of large scale action is much more effective than one person recycling their rubbish at home. Also, government have enough money to invest in renewable energy like solar or wind power, which can reduce the country whole carbon footprint much faster than individual action alone.',
      'Secondly, government can hold big company accountable in a way normal citizen cannot. Many environment problem, such as deforestation or industrial pollution, are cause by large business, not by ordinary people. If government do not create strict rule and punish company who break them, these problem will continue no matter how many individual try to live a green lifestyle. Of course, individual also have some responsibility, like reducing their own waste, but this alone cannot solve the bigger environmental crisis the world is facing, because one family recycling more will not stop a factory polluting a river.',
      'In conclusion, I believe government should take the primary responsibility for protecting the environment, because they have the power, money and law to make a real difference, although individual action is also important and should not be ignore completely.',
    ],
    highlights: [
      { phrase: 'government have more power and money to make big change', note: "grammar slip: subject-verb agreement, should be 'has'" },
      { phrase: 'environmental legislation that punish business who pollute', note: "grammar slip: should be 'punishes'" },
      { phrase: 'reduce the country whole carbon footprint', note: "grammar slip: missing possessive, should be 'the country's whole carbon footprint'" },
      { phrase: 'hold big company accountable in a way normal citizen cannot', note: 'topic vocabulary used correctly' },
      { phrase: 'should not be ignore completely', note: "grammar slip: should be 'ignored'" },
    ],
    criteria: {
      taskResponse: 'A clear position, that government bears the main responsibility, is given in the introduction and maintained throughout the essay. The two main reasons are relevant, but the idea that individual action also matters is only mentioned briefly rather than properly weighed against the main argument.',
      coherence: "The essay follows a simple, logical four-paragraph structure with 'Firstly' and 'Secondly' clearly marking the two reasons. Cohesion within paragraphs relies mainly on 'because' and 'which', giving the writing a somewhat repetitive feel.",
      lexical: "Topic vocabulary ('environmental legislation', 'carbon footprint', 'hold big company accountable') is used correctly and shows good preparation for the subject. Basic vocabulary such as 'big' and 'government' is repeated often, limiting the overall range.",
      grammar: "Simple sentences dominate, with some attempts at complex structures using 'because' and 'although'. Subject-verb agreement and possessive errors ('government have', 'country whole carbon footprint') appear repeatedly and are typical of this band.",
    },
  },
  {
    promptId: 'w2-opinion-environment-responsibility',
    task: 'task2',
    band: 7,
    text: [
      'Many people argue that the government, rather than individuals, should bear primary responsibility for protecting the environment. I largely agree with this position, since governments possess the legislative power and financial resources to enact change on a scale that individual effort alone simply cannot match.',
      "The clearest advantage governments hold is the ability to legislate. Through environmental legislation, they can compel industries to cut emissions or face substantial fines, a form of large-scale accountability no individual could impose. Beyond regulation, governments also control the funding necessary for major infrastructure projects, such as renewable energy schemes, that can shrink a nation's carbon footprint far more quickly than millions of small personal choices ever could, however well-intentioned those choices are. No amount of individual thrift can replace the sheer scale of investment a national grid overhaul requires.",
      'Equally important is the fact that most significant environmental damage, deforestation and industrial pollution among them, is caused by large corporations rather than private individuals. Without robust government intervention to hold these companies accountable, such damage is likely to continue regardless of how conscientiously ordinary citizens live. This is not to dismiss individual responsibility entirely; personal choices around waste and consumption still matter. However, they operate at a scale too small to address a crisis of this magnitude on their own, and treating them as a substitute for regulation risks letting the biggest polluters off the hook entirely.',
      'In conclusion, while individuals should certainly act responsibly, I believe governments must take the lead in environmental protection, since only they command the legal and financial tools capable of producing change at the necessary scale.',
    ],
    highlights: [
      { phrase: 'possess the legislative power and financial resources to enact change on a scale that individual effort alone simply cannot match', note: 'clear position with precise supporting reasoning built into the same sentence' },
      { phrase: 'a form of large-scale accountability no individual could impose', note: "precise vocabulary used to sharpen the essay's central contrast" },
      { phrase: 'This is not to dismiss individual responsibility entirely', note: "hedging: concedes a point without weakening the essay's overall position" },
      { phrase: 'operate at a scale too small to address a crisis of this magnitude on their own', note: 'measured, precise qualification of the concession just made' },
      { phrase: 'command the legal and financial tools', note: 'natural collocation reused deliberately from the introduction to reinforce the argument' },
    ],
    criteria: {
      taskResponse: 'A clear, well-argued position is presented and sustained throughout, with two distinct, well-developed reasons rather than a repeated single point. The essay also acknowledges the opposing view briefly and explains why it does not change the overall position, which strengthens the response.',
      coherence: "Paragraphing is logical, and topic sentences make the structure of the argument easy to follow without needing explicit 'Firstly, Secondly' signposting. A good range of cohesive devices, including reference and concession markers, connects ideas smoothly.",
      lexical: "Less common vocabulary ('legislative power', 'accountable', 'conscientiously') is used accurately and appropriately for the topic. There is minimal repetition, and topic-specific phrases are integrated naturally into the argument.",
      grammar: 'A range of complex structures, including a semicolon-linked sentence and concession clauses, is used with good control throughout. Minor slips are rare and do not affect meaning, consistent with Band 7.',
    },
  },
  {
    promptId: 'w2-opinion-environment-responsibility',
    task: 'task2',
    band: 8,
    text: [
      'That governments, rather than individuals, should shoulder primary responsibility for protecting the environment strikes me as broadly correct, though not because individual action is worthless. It is simply that only the state commands the legislative reach and financial weight needed to act at the scale the crisis demands.',
      "Legislation is the government's clearest advantage. A single piece of environmental law can compel every business in a sector to cut emissions overnight, a form of leverage no individual choice, however conscientious, could ever replicate. Governments also control the capital required for transformative infrastructure, from national grids of renewable energy to public transport networks that quietly shrink a country's aggregate carbon footprint far faster than millions of separate, well-meaning household decisions ever could, decisions that, taken alone, barely register against the scale of the problem.",
      'It is also worth noting where the damage originates. Deforestation and industrial pollution are overwhelmingly the work of large corporations pursuing profit, not of ordinary citizens recycling at home, and only a government willing to hold such corporations to account can meaningfully interrupt that pattern. None of this absolves individuals of responsibility; modest, everyday choices still matter, and collectively they set the social expectations that make ambitious government policy politically possible in the first place. But expecting private virtue alone to substitute for public power is, at best, wishful thinking.',
      'Ultimately, then, responsibility is shared in practice, but leadership cannot be: only governments possess the authority to convert scattered individual goodwill into the coordinated, binding action the environment genuinely requires from every corner of society, industry included.',
    ],
    highlights: [
      { phrase: 'It is simply that only the state commands the legislative reach and financial weight', note: "precise, confident clarification that sharpens the essay's position" },
      { phrase: 'a form of leverage no individual choice, however conscientious, could ever replicate', note: 'sophisticated concession embedded mid-sentence without losing momentum' },
      { phrase: 'None of this absolves individuals of responsibility', note: 'skilful concession that anticipates and defuses the obvious counter-argument' },
      { phrase: 'expecting private virtue alone to substitute for public power is, at best, wishful thinking', note: "memorable, idiomatic closing judgement on the paragraph's argument" },
      { phrase: 'convert scattered individual goodwill into the coordinated, binding action', note: "precise, image-based phrasing that closes the essay's argument with real economy" },
    ],
    criteria: {
      taskResponse: 'The essay develops a fully nuanced position, explicitly distinguishing shared responsibility from the question of leadership, rather than treating the issue as simply one side versus the other. Every paragraph advances this distinction, and the conclusion resolves it with genuine insight rather than a restatement.',
      coherence: 'The argument builds with clear, sophisticated logic across paragraphs, and the final sentence draws every earlier thread together precisely. Cohesion depends on paraphrase and logical sequencing far more than on visible linking phrases.',
      lexical: "Vocabulary is precise and wide-ranging throughout ('leverage', 'absolves', 'coordinated, binding action'), used with natural collocation and no repetition of basic terms. Word choice consistently sharpens the argument rather than merely decorating it.",
      grammar: 'A wide range of complex structures, including embedded concessive clauses and a colon-introduced final sentence, is used with complete control. Sentence rhythm and length vary deliberately for effect, characteristic of Band 8 writing.',
    },
  },
  /* ───────────────────────── w2-discussion-prison-vs-community ───────────────────────── */
  {
    promptId: 'w2-discussion-prison-vs-community',
    task: 'task2',
    band: 6,
    text: [
      'Some people think prison is the best way to punish criminal, while other people believe community based punishment, such as unpaid work, is more effective. In this essay, I will discuss both view and then give my own opinion at the end.',
      'On the one hand, many people believe prison is the most effective way to deal with criminal. This is because prison act as a strong deterrent, people are afraid of losing their freedom, so they may think twice before committing a crime. Also, putting criminal in prison keep society safe, because dangerous person cannot hurt other people while they are lock up. For serious crime like violence, many people believe prison is necessary to protect the public and also to punish the criminal properly for what they have done.',
      'On the other hand, other people think community based punishment, like unpaid work, is more effective, especially for less serious crime. This is because studies suggest offender who do community service are less likely to reoffend compare to those who go to prison. Community punishment also help offender reintegrate into society more easily, because they can keep their job and stay connect with their family, instead of losing everything while they are in prison. In my opinion, I agree that community punishment is better for minor crime, but prison is still necessary for serious criminal.',
      'In conclusion, while prison act as a deterrent and protect society from dangerous criminal, community based punishment can help offender reintegrate and reduce reoffending for less serious crime. Both method have their place depend on the crime.',
    ],
    highlights: [
      { phrase: 'prison act as a strong deterrent', note: "grammar slip: subject-verb agreement, should be 'acts'" },
      { phrase: 'offender who do community service are less likely to reoffend compare to those', note: "grammar slip: should be 'offenders who do... are... compared to those'" },
      { phrase: 'Community punishment also help offender reintegrate into society more easily', note: "grammar slip: should be 'helps offenders'" },
      { phrase: 'stay connect with their family', note: "grammar slip: should be 'stay connected'" },
      { phrase: 'Both method have their place depend on the crime', note: "grammar slip: should be 'Both methods have their place depending on the crime'" },
    ],
    criteria: {
      taskResponse: 'Both views are presented with a relevant reason each, and a personal opinion is given at the end, meeting the basic requirements of a discussion essay. The opinion given, that it depends on the crime, is reasonable but arrives quite late and is not developed with its own example.',
      coherence: "The clear 'On the one hand' / 'On the other hand' structure makes the two views easy to identify. Within paragraphs, ideas are joined mainly with 'because' and 'also', giving a limited variety of cohesive device.",
      lexical: "Topic vocabulary ('deterrent', 'reoffend', 'reintegrate into society') is used correctly and appropriately. General vocabulary such as 'people believe' and 'effective' is repeated across both paragraphs.",
      grammar: "Sentence structure is mostly simple with some attempts at complex forms using 'because' and 'while'. Plural nouns and subject-verb agreement are inconsistent throughout ('prison act', 'offender who do'), which is typical for Band 6.",
    },
  },
  {
    promptId: 'w2-discussion-prison-vs-community',
    task: 'task2',
    band: 7,
    text: [
      'There is ongoing debate about whether prison or community-based punishment, such as unpaid work, is the more effective response to crime. This essay will discuss both approaches before arguing that the more suitable option ultimately depends on the severity of the offence.',
      "Supporters of prison argue that it functions as a powerful deterrent, since the prospect of losing one's freedom discourages many people from offending in the first place. Beyond deterrence, imprisonment also incapacitates dangerous individuals, physically preventing them from harming others while they serve their sentence. For serious or violent crimes in particular, many would argue that removing the offender from society is not only a practical necessity but also a proportionate response to the harm caused, and one that victims and the wider public are entitled to expect.",
      'Advocates of community-based punishment, however, point to evidence that offenders given such sentences are less likely to reoffend than those sent to prison, particularly for less serious crimes. Unpaid work and similar sentences also allow offenders to retain their jobs and family ties, easing their reintegration into society rather than severing it. Custodial sentences, by contrast, can leave former prisoners socially and economically isolated upon release, arguably making reoffending more, rather than less, likely in the long run, especially once a criminal record makes finding steady work considerably harder.',
      'In my view, community-based punishment is generally the more effective option for minor offences, given its consistently lower reoffending rates, whereas prison remains necessary for serious crimes where public safety must take clear priority over any concern for the offender involved.',
    ],
    highlights: [
      { phrase: 'the more suitable option ultimately depends on the severity of the offence', note: "clear, nuanced position stated early, previewing the essay's final judgement" },
      { phrase: 'incapacitates dangerous individuals', note: 'precise, less common vocabulary used accurately' },
      { phrase: 'easing their reintegration into society rather than severing it', note: 'parallel structure that sharpens the contrast between the two approaches' },
      { phrase: 'arguably making reoffending more, rather than less, likely in the long run', note: "hedged but confident claim that develops the paragraph's argument further" },
      { phrase: 'given its consistently lower reoffending rates', note: 'concise reference back to evidence introduced earlier in the essay' },
    ],
    criteria: {
      taskResponse: "Both views are discussed with clear, well-developed reasoning rather than a single sentence each, and the writer's own opinion is nuanced and directly tied to the discussion that precedes it. The essay stays tightly focused on the exact question asked throughout.",
      coherence: "Paragraphing is logical, with each body paragraph opening on a clear topic sentence rather than relying on 'On the one hand / On the other hand'. A good range of cohesive devices, including contrastive linkers and reference, connects ideas smoothly.",
      lexical: "Vocabulary is accurate and appropriately varied ('deterrent', 'incapacitates', 'custodial sentences'), reflecting good preparation for the topic. There is little unnecessary repetition of general vocabulary.",
      grammar: 'A range of complex structures, including a comparative structure in the final body paragraph and a non-defining relative clause, is used accurately. The rare minor slip does not affect meaning, consistent with Band 7.',
    },
  },
  {
    promptId: 'w2-discussion-prison-vs-community',
    task: 'task2',
    band: 8,
    text: [
      'Whether prison or community-based punishment, such as unpaid work, more effectively addresses crime is a question that resists a single answer. I would argue that each has its place, and that the more pressing question is which offences call for which response.',
      "Proponents of imprisonment rightly stress its deterrent power: the prospect of losing one's liberty gives many would-be offenders genuine pause. Prison also physically incapacitates those who pose an ongoing danger, removing them from the public they might otherwise harm. For serious or violent offences, this combination of deterrence and protection is difficult to replicate through any community-based alternative, which is presumably why even the staunchest critics of mass incarceration rarely call for its wholesale abolition, however loudly they argue for reforming how prisons are run.",
      'For less serious offences, however, the case for community-based punishment is compelling. Evidence consistently suggests that offenders sentenced to unpaid work reoffend less often than those sent to prison, likely because such sentences preserve employment and family ties rather than severing them. A custodial sentence, by contrast, can strip an offender of precisely the stability that discourages future crime, leaving them more isolated, and arguably more likely to reoffend, upon release, trapped in a cycle the original sentence was meant to break.',
      'On balance, then, the two approaches are best understood as complementary rather than competing: prison for offences demanding public protection, community-based punishment for those where rehabilitation offers the surer path to preventing future crime, with the seriousness of the offence, not ideology, deciding which one is genuinely more appropriate in each individual case.',
    ],
    highlights: [
      { phrase: 'the more pressing question is which offences call for which response', note: 'reframes the debate rather than simply picking a side' },
      { phrase: 'which is presumably why even the staunchest critics of mass incarceration rarely call for its wholesale abolition', note: 'sophisticated supporting observation, not just an assertion' },
      { phrase: 'strip an offender of precisely the stability that discourages future crime', note: 'precise, causally reasoned phrasing' },
      { phrase: 'complementary rather than competing', note: 'concise, memorable contrast that resolves the discussion' },
      { phrase: 'the surer path to preventing future crime', note: 'confident, precise closing phrase rather than a vague summary' },
    ],
    criteria: {
      taskResponse: 'The essay reframes the discussion with genuine sophistication, arguing that the two approaches serve different purposes rather than competing for the same role, which goes well beyond a simple weighing of two sides. Every point made directly supports this central, well-argued distinction.',
      coherence: "Ideas develop with clear, logical progression across paragraphs, each building toward the conclusion's synthesis rather than sitting as an isolated point. Cohesion is achieved through sophisticated reference and paraphrase rather than a visible scaffold of linking words.",
      lexical: "Precise, wide-ranging vocabulary ('incapacitates', 'wholesale abolition', 'complementary') is used with natural collocation and full accuracy throughout. There is no repetition of basic vocabulary anywhere in the response.",
      grammar: 'A wide range of complex structures, including an embedded relative clause and a parallel contrastive final sentence, is used with complete control. Sentence variety is deliberate throughout, a hallmark of Band 8 writing.',
    },
  },
  /* ───────────────────────── w2-adv-disadv-ageing-population ───────────────────────── */
  {
    promptId: 'w2-adv-disadv-ageing-population',
    task: 'task2',
    band: 6,
    text: [
      'Nowadays, many country have an ageing population, which mean there are more elderly people than before. This essay will discuss the advantages and disadvantages of this development for society.',
      'There are some advantage of having more elderly people in society. Firstly, older people often have a lot of experience and knowledge, which they can pass to younger generation, for example by working part time or helping to take care of grandchildren. This allow younger parents to continue working while their children are looked after by family member they trust. Secondly, an ageing population also show that a country healthcare system and standard of living is improving, because people are living longer than before due to better medicine and lifestyle. This is generally seen as a good sign for a country, not a bad one.',
      'However, there are also disadvantage to this trend. One major problem is the pressure on pension system, because there are more retire people receiving pension but less young worker paying into the system. This create a high dependency ratio, where a smaller workforce must support a larger number of dependents. Another disadvantage is the healthcare burden, because elderly people usually need more medical care than younger people, which cost the government a lot of money and put pressure on hospital and doctor. Some hospital in country with a very old population already struggle to find enough staff and bed for their patient.',
      'In conclusion, an ageing population bring some advantage like experience and knowledge for younger generation, but it also cause disadvantage such as pressure on pension system and healthcare burden. Government need to plan carefully for this change.',
    ],
    highlights: [
      { phrase: 'Nowadays, many country have an ageing population, which mean there are more elderly people', note: "grammar slip: should be 'countries have... which means'" },
      { phrase: 'There are some advantage of having more elderly people', note: "grammar slip: should be 'advantages'" },
      { phrase: 'This create a high dependency ratio', note: "grammar slip: should be 'creates'" },
      { phrase: 'put pressure on hospital and doctor', note: "grammar slip: missing plurals, should be 'hospitals and doctors'" },
      { phrase: 'Government need to plan carefully for this change', note: "grammar slip: should be 'needs'" },
    ],
    criteria: {
      taskResponse: 'The essay identifies relevant advantages and disadvantages and explains each with a brief reason, addressing the neutral question as it was asked. Development is limited, though, with each point receiving only one or two sentences rather than a fully worked example.',
      coherence: "The advantages and disadvantages are clearly separated into their own paragraphs, and 'Firstly' and 'Secondly' organise the points within each. Cohesion between sentences relies heavily on 'because' and 'which', with little variety beyond this.",
      lexical: "Topic vocabulary ('pension system', 'dependency ratio', 'healthcare burden') is used correctly and appropriately for the subject. Plural forms are frequently missing, which limits the accuracy of the range on display.",
      grammar: "Simple sentences dominate, and subject-verb agreement is inconsistent throughout ('country have', 'this create', 'government need'). This pattern of recurring, minor errors is typical of Band 6 rather than occasional slips.",
    },
  },
  {
    promptId: 'w2-adv-disadv-ageing-population',
    task: 'task2',
    band: 7,
    text: [
      'Many countries today have an ageing population, meaning a growing proportion of elderly citizens relative to the working-age population. This trend brings both genuine benefits and significant challenges for society, both of which this essay will examine before a brief concluding assessment.',
      'One clear advantage is the accumulated experience and knowledge older generations can pass on, whether informally within families or through continued part-time work in fields that value expertise over speed. Many grandparents, for instance, provide childcare that allows younger parents to remain in the workforce, a contribution that is rarely counted economically yet is genuinely valuable. An ageing population can also be read as a mark of social progress, reflecting improvements in healthcare and living standards that allow people to live longer, healthier lives than previous generations did.',
      'The disadvantages, however, are considerable. A shrinking working-age population must support a growing number of retirees, placing severe strain on pension systems that were designed for a very different demographic balance. This rising dependency ratio also extends to healthcare, since elderly citizens typically require more frequent and costly medical care, adding further pressure to public budgets and hospital resources already stretched thin. Left unaddressed, these combined pressures could ultimately threaten the sustainability of the very systems that support an ageing population in the first place, forcing difficult choices about taxation or benefits further down the line.',
      'On balance, while an ageing population offers valuable continuity of knowledge and reflects genuine social progress, the strain it places on pensions and healthcare means governments must plan carefully, and early, to manage its consequences.',
    ],
    highlights: [
      { phrase: 'a contribution that is rarely counted economically yet is genuinely valuable', note: 'precise evaluative comment that develops the point beyond a simple example' },
      { phrase: 'can also be read as a mark of social progress', note: 'reframes a demographic fact as a positive outcome, showing genuine task development' },
      { phrase: 'This rising dependency ratio also extends to healthcare', note: 'cohesive device that links the two disadvantages within the same paragraph' },
      { phrase: 'Left unaddressed, these combined pressures could ultimately threaten the sustainability of', note: 'conditional structure used to extend the argument into a consequence' },
      { phrase: 'On balance', note: 'signals a genuinely weighed conclusion rather than a simple summary' },
    ],
    criteria: {
      taskResponse: 'The essay develops both advantages and disadvantages with clear explanation and, in places, an evaluative comment rather than a bare list. The neutral framing of the question is respected, with the brief final assessment appropriately hedged rather than an unsupported verdict.',
      coherence: "Paragraphing is clear and logical, and topic sentences preview each paragraph's content without needing explicit 'Firstly, Secondly' markers. Devices such as 'This rising dependency ratio' link ideas across sentences smoothly.",
      lexical: "Vocabulary is accurate and reasonably wide-ranging ('dependency ratio', 'demographic balance', 'sustainability'), reflecting solid preparation for the topic. Some repetition of general vocabulary is present but does not undermine overall range.",
      grammar: "A range of complex structures, including a conditional opening ('Left unaddressed') and non-defining relative clauses, is used accurately. Minor slips are rare and do not affect meaning, consistent with Band 7.",
    },
  },
  {
    promptId: 'w2-adv-disadv-ageing-population',
    task: 'task2',
    band: 8,
    text: [
      'As life expectancy rises and birth rates fall across much of the world, an ageing population has become one of the defining demographic shifts of the century. This essay considers what society stands to gain from this shift, and what it must guard against.',
      "The benefits are easy to underestimate precisely because they are diffuse. Older generations carry accumulated expertise that younger workers cannot simply acquire faster, and many continue contributing well past traditional retirement, whether through part-time work or the informal childcare that quietly underwrites countless younger households' careers. More broadly, a population living longer, healthier lives is itself a marker of social progress, the cumulative payoff of decades of advances in medicine and living standards rather than a problem to be solved, and one that few societies would willingly trade away.",
      "Set against this are pressures that are considerably harder to ignore. A shrinking workforce supporting a growing retired population strains pension systems built for a very different demographic pyramid, while the elderly's greater healthcare needs place mounting demands on hospitals and public budgets alike. Left unmanaged, a rising dependency ratio threatens to become self-reinforcing: as costs climb, the working-age population footing the bill shrinks further still, precisely when its contributions are needed most, leaving governments to choose between raising taxes, cutting benefits, or both.",
      'On balance, an ageing population is neither an unambiguous blessing nor a crisis to be feared, but a structural shift that rewards early, deliberate planning, and punishes governments that treat it as someone else\'s problem to solve later, once the numbers have grown too large to manage cheaply.',
    ],
    highlights: [
      { phrase: 'The benefits are easy to underestimate precisely because they are diffuse', note: 'sophisticated opening observation that frames the whole paragraph' },
      { phrase: "the informal childcare that quietly underwrites countless younger households' careers", note: 'precise, image-driven phrase capturing an uncounted economic contribution' },
      { phrase: 'threatens to become self-reinforcing', note: 'precise vocabulary describing a feedback loop, not just a static problem' },
      { phrase: 'precisely when its contributions are needed most', note: "sharpens the paragraph's final point with economical phrasing" },
      { phrase: 'punishes governments that treat it as someone else\'s problem to solve later', note: 'memorable, idiomatic closing judgement' },
    ],
    criteria: {
      taskResponse: 'The response develops a genuinely sophisticated treatment of both sides, explaining mechanisms (a self-reinforcing dependency ratio, uncounted informal contributions) rather than simply listing outcomes. The conclusion offers real insight into how the issue should be approached, not just a summary of points already made.',
      coherence: 'Ideas progress with clear, deliberate logic within and between paragraphs, and the concluding sentence draws the whole argument together precisely. Cohesion depends on sophisticated reference and paraphrase rather than a visible scaffold of stock linking words.',
      lexical: "Vocabulary is precise and wide-ranging throughout ('diffuse', 'demographic pyramid', 'self-reinforcing'), used with natural collocation and no repetition of basic terms. Word choice consistently sharpens meaning rather than decorating the sentence.",
      grammar: 'A wide range of complex structures, including a colon-introduced explanatory clause and parallel contrastive structures, is used with complete accuracy. Sentence length and rhythm vary deliberately throughout, characteristic of Band 8.',
    },
  },
  /* ───────────────────────── w2-problem-solution-housing-affordability ───────────────────────── */
  {
    promptId: 'w2-problem-solution-housing-affordability',
    task: 'task2',
    band: 6,
    text: [
      'In many big city, house prices have increased so much that young people can no longer afford to buy their own home. This essay will discuss the problem this cause, and then suggest some solution.',
      'This situation cause several problem for young people. Firstly, many young people cannot get onto the property ladder, so they must continue renting for many year, which is often more expensive in the long term than paying a mortgage. This can make young people feel frustrated and hopeless about their future, especially compare to their parents generation, who could buy a house much more easily. Secondly, some young people are forced to live with their parents for longer, because they cannot afford to move out, which can delay other big decision in life, such as getting married or having children.',
      'There are several solution government can consider. One solution is to give subsidies or financial help to first-time buyer, so it become easier for them to save for a deposit and get a mortgage. Another solution is to increase the housing supply by building more affordable home, especially in city where demand is high but supply is low. Government could also introduce a rent-to-own scheme, which allow young people to rent a property while slowly buying it, instead of needing a large amount of money immediately. If government use more than one of these solution together, the situation could improve much faster.',
      'In conclusion, unaffordable housing cause serious problem for young people, such as delaying their independence, but government can help solve this by supporting first-time buyer and increasing housing supply.',
    ],
    highlights: [
      { phrase: 'This situation cause several problem for young people', note: "grammar slip: should be 'causes several problems'" },
      { phrase: 'compare to their parents generation', note: "grammar slip: should be 'compared to their parents' generation'" },
      { phrase: 'There are several solution government can consider', note: "grammar slip: should be 'solutions'" },
      { phrase: 'a rent-to-own scheme, which allow young people to rent', note: "grammar slip: should be 'allows'" },
      { phrase: 'increasing housing supply', note: 'topic vocabulary used correctly and relevantly' },
    ],
    criteria: {
      taskResponse: 'The essay identifies relevant problems and offers matching solutions, addressing both parts of the question the way this question type requires. Each point, however, is explained only briefly, and the connection between a specific problem and a specific solution is not always made explicit.',
      coherence: "The problems and solutions are placed in separate, clearly ordered paragraphs, which suits this question type well. Linking language within paragraphs is limited mainly to 'Firstly', 'Secondly' and 'because', reducing variety.",
      lexical: "Relevant topic vocabulary ('property ladder', 'first-time buyer', 'rent-to-own scheme') is used correctly, showing good topic preparation. Plural nouns are frequently missing, which reduces the accuracy of the vocabulary on display.",
      grammar: "Simple sentences dominate the response, with occasional complex structures using 'because' and 'which'. Plural and subject-verb agreement slips ('this cause', 'several solution', 'which allow') recur throughout, typical of Band 6.",
    },
  },
  {
    promptId: 'w2-problem-solution-housing-affordability',
    task: 'task2',
    band: 7,
    text: [
      'In many major cities, house prices have risen so sharply that young people increasingly struggle to afford a home of their own. This essay will outline the main problems this creates before considering some practical solutions governments could pursue.',
      'The most immediate problem is that young people are effectively locked out of the property ladder, forced instead into long-term renting that is often less financially secure, and ultimately more expensive, than paying off a mortgage. This growing gap between wages and house prices can leave an entire generation feeling that homeownership, once a realistic milestone, is now permanently out of reach. A related consequence is delayed independence: many young adults remain living with their parents well into their twenties or thirties, postponing decisions such as marriage or starting a family that homeownership has traditionally supported.',
      'Several solutions could ease this pressure. Government subsidies targeted specifically at first-time buyers would make saving for a deposit considerably more achievable, directly addressing the affordability gap described above. Increasing housing supply, particularly in high-demand urban areas where construction has lagged behind population growth, would also help bring prices down over time by easing the imbalance between demand and supply. A rent-to-own scheme offers a further option, letting young people build equity gradually while living in a property, rather than needing a substantial lump sum upfront, a barrier that currently excludes many otherwise capable buyers.',
      'In conclusion, unaffordable housing is delaying an entire generation\'s independence, but a combination of targeted subsidies, expanded housing supply and more flexible schemes like rent-to-own could meaningfully improve the situation.',
    ],
    highlights: [
      { phrase: 'forced instead into long-term renting that is often less financially secure, and ultimately more expensive', note: 'precise comparison that develops the problem beyond a simple statement' },
      { phrase: 'once a realistic milestone, is now permanently out of reach', note: "vivid phrasing that sharpens the essay's central concern" },
      { phrase: 'directly addressing the affordability gap described above', note: 'explicit link between a solution and the problem it solves, tying the two body paragraphs together' },
      { phrase: 'easing the imbalance between demand and supply', note: 'precise economic vocabulary used accurately' },
      { phrase: 'letting young people build equity gradually while living in a property', note: 'clear, specific explanation of how the solution actually works' },
    ],
    criteria: {
      taskResponse: 'The essay explains each problem and connects each solution explicitly back to it, which is a more developed response than simply listing problems and solutions in parallel. Explanation throughout goes beyond a single sentence, giving the reader a clear sense of cause and effect.',
      coherence: "Paragraphing matches the two-part question precisely, and topic sentences preview each paragraph clearly. A good range of cohesive devices, including reference back to earlier points ('described above'), links the two halves of the essay.",
      lexical: "A strong range of topic vocabulary ('property ladder', 'first-time buyer', 'rent-to-own scheme') is used accurately and naturally within the argument. Some repetition of general vocabulary is present but does not undermine the overall range.",
      grammar: 'A range of complex structures, including a colon-introduced explanation and non-finite clauses, is used with good control. Minor errors are rare and do not affect meaning, consistent with Band 7.',
    },
  },
  {
    promptId: 'w2-problem-solution-housing-affordability',
    task: 'task2',
    band: 8,
    text: [
      'Across many major cities, house prices have climbed so far beyond wages that homeownership is slipping out of reach for an entire generation of young people. This essay examines the consequences of that shift before turning to measures capable of narrowing the gap.',
      "The most pressing consequence is a generation effectively priced out of the property ladder, left renting indefinitely in a market where rent, over time, frequently exceeds what a mortgage on the same property would cost. Beyond the immediate financial strain, this delays milestones once closely tied to homeownership, marriage, starting a family, financial independence, leaving many young adults living with parents well into adulthood, not by choice but by economic necessity. The result is a slow erosion of the assumption, taken for granted by previous generations, that hard work eventually buys a place of one's own.",
      'Addressing this convincingly demands more than a single lever. Targeted subsidies for first-time buyers can narrow the deposit gap directly, but they do little if the underlying housing supply remains constrained, so expanding construction in high-demand urban areas matters just as much, gradually easing prices by correcting the imbalance between demand and supply. Rent-to-own schemes offer a further, complementary route, letting young people accumulate equity while they live in a property rather than facing the impossible hurdle of a lump-sum deposit all at once, a barrier that shuts out otherwise capable buyers.',
      'Ultimately, unaffordable housing threatens to redefine what an entire generation can reasonably expect from adulthood, but subsidies, expanded supply and more flexible ownership schemes, pursued together, offer a credible path back towards genuine affordability.',
    ],
    highlights: [
      { phrase: 'slipping out of reach for an entire generation of young people', note: "precise, economical phrase that frames the whole essay's stakes" },
      { phrase: "a slow erosion of the assumption, taken for granted by previous generations, that hard work eventually buys a place of one's own", note: 'sophisticated abstraction that elevates the argument beyond a simple list of problems' },
      { phrase: 'they do little if the underlying housing supply remains constrained', note: 'shows how one solution depends on another, a genuinely developed argument rather than a list' },
      { phrase: 'facing the impossible hurdle of a lump-sum deposit all at once', note: 'vivid, precise phrasing that clarifies exactly why the solution helps' },
      { phrase: 'pursued together, offer a credible path back towards genuine affordability', note: 'confident, precise closing judgement rather than a vague restatement' },
    ],
    criteria: {
      taskResponse: "The response develops a genuinely sophisticated argument, showing how the solutions interact with and depend on one another rather than functioning as an unconnected list. The essay's framing of housing as reshaping an entire generation's expectations goes well beyond simply answering the question's two parts.",
      coherence: 'Ideas progress with clear, deliberate logic, and the second body paragraph explicitly builds on and complicates the first solution offered, showing real sophistication in how the argument develops. Cohesion is achieved through precise reference and paraphrase rather than a visible scaffold of linking words.',
      lexical: "Vocabulary is precise and wide-ranging throughout ('priced out', 'erosion', 'complementary route'), used with natural collocation and no repetition of basic terms. Word choice consistently sharpens the argument's meaning.",
      grammar: "A wide range of complex structures, including layered subordination and a parallel triadic list in the conclusion, is used with complete control. Sentence length and rhythm vary deliberately throughout, characteristic of Band 8.",
    },
  },
  /* ───────────────────────── w2-two-part-space-exploration ───────────────────────── */
  {
    promptId: 'w2-two-part-space-exploration',
    task: 'task2',
    band: 6,
    text: [
      'Some government spend a large amount of money on exploring space, while other people believe this money should be spend on problem here on Earth instead. This essay will explain why some government continue to invest in space exploration, and then discuss if the benefit outweigh the cost.',
      'There are several reason why government continue to fund space exploration. Firstly, space programme can bring scientific advancement that help many other area of life, not just astronomy. For example, technology first invented for space mission, such as satellite navigation, are now use in everyday life by ordinary people. Secondly, some government invest in space exploration for national prestige, because being a leader in space technology make a country look powerful and advanced to the rest of the world. This can also inspire young people to study science and engineering, which benefit the country long term.',
      'In my opinion, the benefit of space exploration do outweigh the cost, but only to some extent. On one hand, the technological spin-off from space programme, like satellite navigation and better weather forecast, have improve many people life around the world. On the other hand, critics argue that the opportunity cost is too high, because this money could be spend on immediate problem on Earth, such as poverty or healthcare, which affect people directly right now. I think government should continue space exploration, but not spend too much money that important problem on Earth are ignore.',
      'In conclusion, government invest in space exploration for scientific advancement and national prestige, and I believe the benefit generally outweigh the cost, as long as government do not ignore urgent problem on Earth at the same time.',
    ],
    highlights: [
      { phrase: 'this money should be spend on problem here on Earth', note: "grammar slip: should be 'spent'" },
      { phrase: 'There are several reason why government continue to fund', note: "grammar slip: should be 'reasons', 'governments continue'" },
      { phrase: 'have improve many people life around the world', note: "grammar slip: should be 'have improved many people's lives'" },
      { phrase: 'the benefit of space exploration do outweigh the cost', note: "grammar slip: subject-verb agreement, should be 'does outweigh'" },
      { phrase: 'important problem on Earth are ignore', note: "grammar slip: should be 'problems... are ignored'" },
    ],
    criteria: {
      taskResponse: 'Both parts of the question, why governments fund space exploration and whether the benefits outweigh the costs, are addressed, meeting the basic requirement of this question type. The second question is answered with a clear but simply worded personal opinion, supported by only one example on each side.',
      coherence: "The essay is organised so the first body paragraph answers the first question and the second addresses the benefit-versus-cost question, an appropriate structure for this prompt. Cohesion relies mainly on 'Firstly', 'Secondly' and 'on the one hand / on the other hand', with limited variety beyond this.",
      lexical: "Topic-specific vocabulary ('scientific advancement', 'national prestige', 'technological spin-off') is used correctly and appropriately. Grammatical word-form errors reduce the accuracy of an otherwise adequate vocabulary range.",
      grammar: "Sentence structure is mostly simple, with some attempted complex forms using 'because' and 'while'. Verb form and subject-verb agreement errors ('should be spend', 'benefit... do outweigh') recur throughout, typical of Band 6.",
    },
  },
  {
    promptId: 'w2-two-part-space-exploration',
    task: 'task2',
    band: 7,
    text: [
      'While some governments devote considerable funding to space exploration, others argue this money would be better spent addressing pressing problems on Earth. This essay will explain why governments continue to invest in space programmes before considering whether the resulting benefits genuinely outweigh the costs.',
      'Governments continue funding space exploration for several interconnected reasons. Space research consistently produces technological spin-offs that benefit fields far removed from astronomy; satellite navigation, now central to everyday life, originated directly from early space missions. National prestige also plays a significant role, since leadership in space technology signals scientific and industrial capability to the rest of the world, often translating into diplomatic and economic influence. Beyond these practical motivations, space programmes tend to inspire younger generations towards careers in science and engineering, an educational benefit with long-term economic value.',
      'Whether these benefits outweigh the costs depends largely on perspective. Proponents point to genuine, tangible spin-offs, improved weather forecasting and global communication among them, that have measurably improved daily life worldwide. Critics, however, highlight the opportunity cost: funds directed towards space exploration could instead address immediate problems on Earth, such as poverty or inadequate healthcare, where the benefits would be felt more directly and urgently. On balance, I believe space exploration is justified provided it does not come at the expense of underfunding these more pressing domestic priorities.',
      'In conclusion, governments invest in space exploration for both scientific and strategic reasons, and while its benefits are real, they can only be considered to outweigh the costs when pursued alongside, rather than instead of, addressing urgent problems closer to home.',
    ],
    highlights: [
      { phrase: 'several interconnected reasons', note: "signals that the paragraph's points are related, not just listed separately" },
      { phrase: 'often translating into diplomatic and economic influence', note: 'develops the idea of national prestige with a concrete consequence' },
      { phrase: 'Whether these benefits outweigh the costs depends largely on perspective', note: "clear, balanced framing before the essay states its own position" },
      { phrase: 'the opportunity cost', note: 'precise topic vocabulary used accurately in context' },
      { phrase: 'provided it does not come at the expense of underfunding these more pressing domestic priorities', note: 'conditional hedge that keeps the position clear but appropriately qualified' },
    ],
    criteria: {
      taskResponse: 'Both parts of the two-part question are answered fully, with several distinct reasons given for the first and a clearly reasoned, appropriately hedged opinion given for the second. Ideas are explained rather than simply listed, keeping the response closely tied to the exact question asked.',
      coherence: 'Each body paragraph clearly answers one part of the question, and topic sentences make the structure explicit without repetitive signposting. A good range of cohesive devices, including reference and conditional structures, connects ideas smoothly across the essay.',
      lexical: "Topic vocabulary ('technological spin-off', 'opportunity cost', 'national prestige') is integrated accurately into more general academic language. Range is good, with little repetition of basic vocabulary.",
      grammar: 'A range of complex structures, including a conditional clause and non-defining relative clauses, is used accurately throughout. Errors are rare and minor, consistent with Band 7 control of grammar.',
    },
  },
  {
    promptId: 'w2-two-part-space-exploration',
    task: 'task2',
    band: 8,
    text: [
      'Governments continue to pour significant sums into space exploration even as critics insist that money would achieve more spent on problems closer to home. This essay considers why that investment persists, and whether, on balance, its benefits genuinely justify the cost.',
      'The rationale for continued investment is more layered than it first appears. Space research has a well-documented habit of generating technology with applications far beyond its original purpose, satellite navigation being the clearest example of a space-age innovation now woven into daily life. National prestige matters too: mastery of space technology functions as a visible proxy for a country\'s broader scientific and industrial capability, carrying diplomatic weight that a purely domestic programme could never match. Less tangibly, ambitious space missions capture public imagination in a way few other government projects do, drawing successive generations into science and engineering.',
      'Whether these benefits justify the expense is a genuinely finer judgement than either side typically admits. The technological and educational spin-offs are real and durable, not the speculative promises critics sometimes suggest. Yet the opportunity cost is equally real: funds spent reaching for the stars are, definitionally, not spent on poverty or healthcare, where the return on investment is immediate and unambiguous. My own view is that the benefits do outweigh the costs, but only where space budgets remain proportionate, a fraction of public spending rather than a competitor to domestic priorities.',
      'Ultimately, space exploration earns its funding through genuine scientific and strategic returns, but that justification holds only so long as governments resist the temptation to let ambition abroad crowd out obligations at home.',
    ],
    highlights: [
      { phrase: 'The rationale for continued investment is more layered than it first appears', note: 'signals a nuanced argument rather than a simple list of reasons' },
      { phrase: 'carrying diplomatic weight that a purely domestic programme could never match', note: 'precise comparative phrasing that develops the national-prestige point further' },
      { phrase: 'not the speculative promises critics sometimes suggest', note: 'directly engages with and rebuts an opposing view within the same sentence' },
      { phrase: 'a fraction of public spending rather than a competitor to domestic priorities', note: "precise, image-based qualification that keeps the essay's position carefully bounded" },
      { phrase: 'let ambition abroad crowd out obligations at home', note: "vivid, idiomatic closing phrase that captures the essay's central tension" },
    ],
    criteria: {
      taskResponse: 'The response develops a genuinely sophisticated answer to both parts of the question, directly engaging with and rebutting the opposing view rather than merely stating its own position alongside it. The conclusion offers a precisely bounded judgement rather than a vague or unqualified verdict.',
      coherence: 'Ideas progress with clear, deliberate logic, and the second body paragraph explicitly weighs competing considerations against each other rather than presenting them side by side. Cohesion depends on sophisticated reference and paraphrase rather than a visible scaffold of linking words.',
      lexical: "Vocabulary is precise and wide-ranging throughout ('rationale', 'proxy', 'crowd out'), used with natural collocation and no repetition of basic terms. Word choice consistently sharpens the argument's precision.",
      grammar: 'A wide range of complex structures, including an appositive clause and a precisely qualified conditional in the final body paragraph, is used with complete control. Sentence rhythm and length vary deliberately, characteristic of Band 8 writing.',
    },
  },
  /* ───────────────────────── w1-letter-neighbour ───────────────────────── */
  {
    promptId: 'w1-letter-neighbour',
    task: 'task1',
    band: 7,
    text: [
      'Dear Mr Ahmadi,',
      'I am writing to let you know that I am planning to hold a small party at my home this Saturday evening, and I wanted to give you advance notice in case the noise causes you any inconvenience.',
      "The party is to celebrate my sister's graduation, with around fifteen guests expected between seven and eleven in the evening. I am aware that music and conversation can carry quite easily between our flats, so I will keep the volume low after nine and ask everyone to keep the windows closed.",
      'I would also like to invite you to join us for an hour or two if you are free. It would be a lovely chance to catch up properly, rather than just seeing each other in the corridor.',
      'Please let me know if Saturday is not convenient for you, and I will do everything I can to keep things quiet at your end.',
      'Yours sincerely,\nAmira',
    ],
    highlights: [
      { phrase: 'I wanted to give you advance notice in case the noise causes you any inconvenience', note: 'clear purpose stated early, appropriate for a semi-formal letter' },
      { phrase: 'I will keep the volume low after nine and ask everyone to keep the windows closed', note: 'specific, practical detail rather than a vague promise' },
      { phrase: 'It would be a lovely chance to catch up properly', note: 'warm, appropriately semi-formal tone for a neighbour rather than a stranger' },
      { phrase: 'Please let me know if Saturday is not convenient for you', note: 'polite closing that invites a reply, useful ahead of an event' },
      { phrase: 'Yours sincerely', note: 'correctly paired with a named greeting (Dear Mr Ahmadi)' },
    ],
    criteria: {
      taskAchievement: 'All three bullet points, the reason for the party, the noise-limiting plan and the invitation, are covered clearly and in a sensible order. The tone stays consistently semi-formal throughout, appropriate for a neighbour who is not a close friend.',
      coherence: 'The letter is organised into a logical sequence: reason, reassurance, invitation, and a polite closing request. Paragraphing is clear, with each bullet point given its own paragraph.',
      lexical: "Vocabulary is appropriate and varied for the context ('advance notice', 'inconvenience', 'catch up'), without being overly formal for a neighbour. There is no repetition of basic vocabulary across the short letter.",
      grammar: 'A range of sentence structures, including a conditional in the closing paragraph, is used accurately. The letter reads naturally, with no errors that affect meaning.',
    },
  },
  {
    promptId: 'w1-letter-neighbour',
    task: 'task1',
    band: 8.5,
    text: [
      'Dear Mr Ahmadi,',
      'I hope you do not mind me writing ahead of time, but I wanted to let you know that I will be hosting a small gathering at my flat this Saturday evening, and to reassure you that I have thought carefully about the noise.',
      'The occasion is my sister\'s graduation, and around fifteen friends will be joining us from seven until roughly eleven. Since sound tends to travel between our flats more than either of us would like, I intend to keep the music at a modest volume, close the windows after dark, and make sure things wind down well before midnight.',
      'I would also love for you to drop by, even briefly, if you are free that evening; it would be far nicer than simply apologising for the noise afterwards.',
      'Do let me know if the timing is inconvenient in any way, and I will happily make adjustments so the evening causes you as little disruption as possible.',
      'Yours sincerely,\nAmira',
    ],
    highlights: [
      { phrase: 'I wanted to let you know that I will be hosting a small gathering at my flat this Saturday evening, and to reassure you that I have thought carefully about the noise', note: 'two purposes combined smoothly in one sentence, a more sophisticated opening than a simple announcement' },
      { phrase: 'Since sound tends to travel between our flats more than either of us would like', note: 'polished, slightly self-deprecating phrasing that softens the request that follows' },
      { phrase: 'it would be far nicer than simply apologising for the noise afterwards', note: 'natural, idiomatic reasoning behind the invitation, not just a bare offer' },
      { phrase: 'Do let me know if the timing is inconvenient in any way', note: 'polite imperative used confidently, a more natural register than a plain question' },
      { phrase: 'make adjustments so the evening causes you as little disruption as possible', note: "precise, considerate closing that ties back to the letter's opening concern" },
    ],
    criteria: {
      taskAchievement: 'All three bullet points are covered fully and woven together naturally rather than addressed as separate, disconnected items. The tone is judged precisely for a semi-formal relationship with a neighbour, warm without becoming overly casual.',
      coherence: 'The letter flows as a single, well-managed piece of writing, with each paragraph developing logically from the one before. Cohesion is achieved through natural reference and connected reasoning rather than mechanical linking phrases.',
      lexical: "A wide range of natural, precise vocabulary and collocation is used throughout ('wind down', 'drop by', 'as little disruption as possible'), appropriate to the semi-formal register the task calls for. There is no repetition and no vocabulary that feels inserted for effect.",
      grammar: 'A wide range of structures, including a semicolon-linked sentence and a purpose clause, is used with complete accuracy and control. The letter reads fluently from start to finish, with no errors of any kind.',
    },
  },
  /* ───────────────────────── w1-line-museum-visitors ───────────────────────── */
  {
    promptId: 'w1-line-museum-visitors',
    task: 'task1',
    band: 7,
    text: [
      'The line graph illustrates the number of annual visitors, in millions, to three London museums, the Science Museum, the Natural History Museum and Tate Modern, between 2010 and 2019.',
      'Overall, Tate Modern doubled its audience over the decade and ended the period as the most visited of the three, while the Natural History Museum moved in the opposite direction, falling steadily until it was level with the Science Museum in 2019.',
      'In 2010, the Natural History Museum was comfortably the most popular of the three, with 5 million visitors, ahead of Tate Modern at 3 million and the Science Museum at only 2 million. Over the next few years Tate Modern climbed sharply while the Natural History Museum declined, and the two lines crossed in 2014 at around 4.3 million.',
      'From that point the gap between them widened quickly. Tate Modern continued to rise, reaching 6 million by 2019, whereas the Natural History Museum slipped to 3 million. The Science Museum, meanwhile, grew gently but consistently throughout, adding a million visitors across the decade to finish level with the Natural History Museum.',
    ],
    highlights: [
      { phrase: 'Tate Modern doubled its audience over the decade and ended the period as the most visited of the three', note: 'overview opens with the single most important change on the graph' },
      { phrase: 'while the Natural History Museum moved in the opposite direction', note: 'the one falling line is contrasted with the others rather than reported separately' },
      { phrase: 'the two lines crossed in 2014 at around 4.3 million', note: 'the crossover is given a figure as well as a year' },
      { phrase: 'grew gently but consistently throughout', note: 'the rate of change is graded, not just its direction' },
      { phrase: 'to finish level with the Natural History Museum', note: 'closes on a comparison between two museums rather than an isolated final figure' },
    ],
    criteria: {
      taskAchievement: "The overview picks out the two features that matter most, Tate Modern's rise to first place and the Natural History Museum's steady fall, instead of describing each line in turn. Figures are selected at the start, the crossover and the end of the decade, which is enough to support every comparison made.",
      coherence: 'The report moves logically from an overview to earlier, then later, detail, which is a clear and appropriate structure for a line graph showing change over time. Paragraphing separates the introduction, overview and two time periods clearly.',
      lexical: "A good range of graph-specific vocabulary ('climbed sharply', 'declined', 'slipped', 'crossed') is used accurately. Numbers are rounded and expressed naturally rather than copied point by point from the graph.",
      grammar: 'A range of past tense forms, comparatives and contrastive clauses is used accurately throughout, appropriate for describing a completed historical trend. Minor errors are rare and do not affect meaning.',
    },
  },
  {
    promptId: 'w1-line-museum-visitors',
    task: 'task1',
    band: 8.5,
    text: [
      'The line graph charts annual visitor numbers, in millions, at three London museums, the Science Museum, the Natural History Museum and Tate Modern, across the decade from 2010 to 2019.',
      "Overall, the decade reversed the original order: Tate Modern's audience doubled and carried it from second place to first, while the Natural History Museum, which began well ahead of the others, lost ground every year and ended tied with the Science Museum.",
      "In 2010 the Natural History Museum was the clear leader, drawing 5 million visitors against Tate Modern's 3 million and the Science Museum's 2 million. The two larger galleries then moved steadily towards one another, crossing at roughly 4.3 million in 2014.",
      'Thereafter Tate Modern pulled away decisively, adding a further 1.7 million to close on 6 million in 2019, twice its opening figure. The Natural History Museum continued its slow decline to 3 million, where the Science Museum, which had risen quietly but without interruption throughout the decade, finally caught up with it.',
    ],
    highlights: [
      { phrase: 'the decade reversed the original order', note: 'captures the whole graph in a single precise phrase before any figures are given' },
      { phrase: 'carried it from second place to first', note: 'describes a change in ranking, not merely a rise in numbers' },
      { phrase: 'lost ground every year and ended tied with the Science Museum', note: 'the falling line and the convergence are handled together in one clause' },
      { phrase: 'crossing at roughly 4.3 million in 2014', note: 'the crossover is quantified as well as dated' },
      { phrase: 'twice its opening figure', note: 'a ratio comparison that says more than simply repeating the figure' },
    ],
    criteria: {
      taskAchievement: 'The overview is built on the reversal of rank across the decade, the single most significant feature of the graph, and accounts for all three lines in one controlled sentence. Every figure chosen, the opening values, the crossover and the closing values, serves a comparison rather than restating a data point.',
      coherence: "The report is organised with clear, logical progression from overview to early, then later, detail, and transitions between paragraphs feel natural rather than mechanical. Cohesion is achieved through precise reference ('thereafter', 'the two larger galleries') rather than repeated simple linkers.",
      lexical: "A wide, precise range of graph vocabulary ('pulled away decisively', 'lost ground', 'risen quietly but without interruption') is used accurately and naturally throughout. Figures are compared flexibly, including in ratio form, rather than mechanically restated.",
      grammar: 'A wide range of complex structures, including two non-defining relative clauses and a past perfect used for the Science Museum, is handled with complete accuracy. The report reads fluently, with no errors of any kind.',
    },
  },
  /* ───────────────────────── w1-bar-internet-access ───────────────────────── */
  {
    promptId: 'w1-bar-internet-access',
    task: 'task1',
    band: 7,
    text: [
      'The bar chart compares the percentage of households with internet access in the UK, Brazil, Nigeria and India in 2000 and 2020.',
      'Overall, internet access increased substantially in all four countries over the period, although the extent of the increase varied considerably, with the UK starting from a much higher base than the other three.',
      'In 2000, the UK already had a relatively high level of internet penetration, at 44%, whereas the figure for the other three countries stood at 6% or less. By 2020, the UK had climbed to 96%, close to saturation, which is a comparatively modest rise given its high starting point.',
      'The most dramatic changes occurred in Brazil and India, where household access rose from 6% and 1% in 2000 to 81% and 60% respectively by 2020. Nigeria improved on a comparable scale, climbing from 1% to 55%, but it remained the country with the lowest household internet access of the four at the end of the period shown in the chart.',
    ],
    highlights: [
      { phrase: 'internet access increased substantially in all four countries over the period, although the extent of the increase varied considerably', note: 'overview gives both the shared trend and the key difference between countries' },
      { phrase: 'with the UK starting from a much higher base than the other three', note: 'important context that explains the comparisons that follow' },
      { phrase: 'a comparatively modest rise given its high starting point', note: "evaluates the UK's growth relative to its starting figure, not just in isolation" },
      { phrase: 'The most dramatic changes occurred in Brazil and India', note: 'clearly selects the most significant features rather than describing every country equally' },
      { phrase: 'remained the country with the lowest household internet access of the four', note: 'accurate superlative comparison closing the report logically' },
    ],
    criteria: {
      taskAchievement: 'The overview correctly identifies both the shared upward trend and the key difference in starting points, which together explain the pattern seen across all four countries. Figures are taken straight from the chart and paired across the two years so that each one supports a comparison rather than standing alone.',
      coherence: "The report moves logically from an overview to the UK's more modest change, then to the more dramatic changes elsewhere, a clear and sensible way to organise a bar chart with this pattern. Paragraphing supports this structure clearly.",
      lexical: "A good range of vocabulary for describing change and comparison ('internet penetration', 'dramatic', 'modest rise') is used accurately. There is little unnecessary repetition of figures or phrasing.",
      grammar: 'A range of comparative and superlative structures is used accurately, appropriate for comparing four data sets. Minor errors are rare and do not affect meaning.',
    },
  },
  {
    promptId: 'w1-bar-internet-access',
    task: 'task1',
    band: 8.5,
    text: [
      'The bar chart illustrates the percentage of households with internet access in the UK, Brazil, Nigeria and India in 2000 and 2020.',
      'The most striking feature is the scale of the digital divide narrowing over the period: while the UK began the two decades far ahead of the other three countries, all four had made substantial progress by 2020, albeit from very different starting points.',
      'In 2000, UK household connectivity already stood at 44%, compared with 6% in Brazil and a mere 1% in both Nigeria and India. Two decades later, the UK had approached near-universal access at 96%, though this represented a far smaller proportional leap than the gains made elsewhere.',
      'Brazil recorded the most striking transformation of all, climbing to 81%, a gain of seventy-five percentage points. India reached 60% from the same 1% base as Nigeria, which, despite a marked improvement to 55%, remained the country with the least widespread broadband access of the four by the end of 2020.',
    ],
    highlights: [
      { phrase: 'The most striking feature is the scale of the digital divide narrowing over the period', note: "identifies the overarching pattern precisely, rather than simply restating the chart's title" },
      { phrase: 'albeit from very different starting points', note: 'concise qualifying phrase that anticipates the detail that follows' },
      { phrase: 'a far smaller proportional leap than the gains made elsewhere', note: 'sophisticated relative comparison, not just an absolute figure' },
      { phrase: 'recorded the most striking transformation of all', note: 'precise, evaluative vocabulary singling out the largest change in the chart' },
      { phrase: 'remained the country with the least widespread broadband access of the four', note: "accurate, varied phrasing for a superlative comparison, avoiding repetition of 'lowest'" },
    ],
    criteria: {
      taskAchievement: 'The overview identifies a genuinely analytical feature, the narrowing digital divide, rather than simply describing each country in turn, which reflects a sophisticated reading of the data. Every figure selected serves a clear comparative purpose.',
      coherence: 'The report develops with a clear, logical structure, and transitions between paragraphs feel natural rather than templated. Cohesion is achieved through precise reference and comparison rather than repeated simple linkers.',
      lexical: "A wide, precise range of vocabulary ('digital divide', 'near-universal access', 'proportional leap') is used accurately and naturally throughout. There is no repetition of basic vocabulary anywhere in the report.",
      grammar: 'A wide range of complex structures, including a concessive clause and a comparative built around a relative proportion, is used with complete accuracy. The report reads fluently from start to finish.',
    },
  },
  /* ───────────────────────── w1-pie-household-spending ───────────────────────── */
  {
    promptId: 'w1-pie-household-spending',
    task: 'task1',
    band: 7,
    text: [
      'The two pie charts compare the proportion of household spending across five categories, food, housing, transport, leisure and other, in a European country in 1980 and in 2020.',
      'Overall, the most significant change is that housing replaced food as the largest single item of household spending, as the share going to food halved over the forty-year period, while the proportion spent on leisure doubled.',
      'In 1980, food accounted for the largest share of spending, at 40% of the total, followed by housing at a quarter of the budget. Transport made up a further 15%, while leisure and other expenses each took 10%, making them the two smallest categories that year.',
      'By 2020, housing had become the dominant category, rising to 35%, while the share spent on food had fallen to 20%. Leisure was the other clear mover, growing from 10% to 20% of the budget, whereas transport and other expenses were unchanged at 15% and 10% respectively.',
    ],
    highlights: [
      { phrase: 'housing replaced food as the largest single item of household spending', note: 'overview identifies the most important feature, a reversal of ranking, rather than listing every category' },
      { phrase: 'while the proportion spent on leisure doubled', note: 'second key feature added to complete a proper two-part overview' },
      { phrase: 'food accounted for the largest share of spending', note: 'clear superlative used to open the detail on the earlier chart' },
      { phrase: 'housing had become the dominant category', note: 'precise vocabulary marking the reversal in ranking between the two charts' },
      { phrase: 'whereas transport and other expenses were unchanged at 15% and 10% respectively', note: 'the categories that did not move are accounted for, which completes the comparison' },
    ],
    criteria: {
      taskAchievement: 'The overview correctly identifies the two changes that matter, the swap between housing and food at the top of the budget and the doubling of leisure spending, which is exactly what this pair of pie charts calls for. Figures are quoted exactly and paired across the two charts, and no attempt is made to guess at causes the charts do not show.',
      coherence: 'The report is organised by chart, 1980 then 2020, with the overview drawing the two together beforehand, a clear and logical structure for this task. Paragraphing supports the two-part comparison clearly.',
      lexical: "Topic vocabulary ('the largest share', 'the dominant category', 'the budget') is used accurately and appropriately. There is minimal repetition of basic vocabulary across the report.",
      grammar: 'A range of past tense and comparative structures is used accurately, appropriate for comparing two points in time. Minor errors are rare and do not affect meaning.',
    },
  },
  {
    promptId: 'w1-pie-household-spending',
    task: 'task1',
    band: 8.5,
    text: [
      'The two pie charts compare how average household spending was divided across five categories, food, housing, transport, leisure and other, in a European country in 1980 and 2020.',
      'The clearest development across the whole forty-year period shown is a marked reallocation of the household budget away from food and towards housing, which overtook food to become the largest single category by 2020, with leisure the only other item to change appreciably.',
      'In 1980, food dominated household spending at 40%, with housing a distant second at 25%; transport took a further 15%, while leisure and other expenses, at 10% apiece, were the smallest items in the budget.',
      'By 2020, this hierarchy had reversed entirely: housing had climbed to 35% of the budget, while the share devoted to food had halved to 20%. Leisure moved in the opposite direction, doubling to 20% and drawing level with food, whereas transport and other expenses held steady at 15% and 10%.',
    ],
    highlights: [
      { phrase: 'a marked reallocation of the household budget away from food and towards housing', note: 'precise, analytical framing of the overview rather than a simple list of increases and decreases' },
      { phrase: 'which overtook food to become the largest single category by 2020', note: 'captures the reversal in ranking economically within the overview itself' },
      { phrase: 'food dominated household spending at 40%, with housing a distant second at 25%', note: 'two figures compared naturally within a single sentence' },
      { phrase: 'this hierarchy had reversed', note: 'concise, precise way of signalling the key change between the two charts' },
      { phrase: 'Leisure moved in the opposite direction, doubling to 20% and drawing level with food', note: 'the second movement is set against the first rather than reported as a separate fact' },
    ],
    criteria: {
      taskAchievement: 'The overview offers a genuinely analytical summary, describing the reallocation between categories rather than listing figures in isolation, and it flags leisure as the one further change worth reporting. Every figure supports a clear, purposeful comparison, and the report resists explaining causes the charts do not show.',
      coherence: "The report develops with clear, logical structure and transitions ('by 2020, this hierarchy had reversed entirely') that link the two charts precisely rather than mechanically. Cohesion is achieved through sophisticated reference rather than repeated simple linkers.",
      lexical: "Precise, wide-ranging vocabulary ('reallocation', 'distant second', 'drawing level', 'held steady') is used accurately and naturally throughout. There is no repetition of basic vocabulary anywhere in the report.",
      grammar: 'A wide range of complex structures, including a semicolon-linked sentence and a precise use of the past perfect for the 2020 comparison, is used with complete accuracy. The report reads fluently from start to finish.',
    },
  },
  /* ───────────────────────── w1-table-rent-prices ───────────────────────── */
  {
    promptId: 'w1-table-rent-prices',
    task: 'task1',
    band: 7,
    text: [
      'The table shows the average monthly rent, in US dollars, for a one-bedroom, city-centre apartment in London, New York, Tokyo and Berlin in 2000, 2010 and 2020.',
      'Overall, rent rose steadily in three of the four cities over the period, and New York, the second most expensive city in 2000, finished with the highest rent of all, while Tokyo was the only city where prices did not consistently increase.',
      'In 2000, rent ranged from $500 in Berlin to $1,400 in Tokyo, with London and New York in between at $900 and $1,100 respectively. Over the following decade, all four cities saw rent increase, with London and New York rising most sharply to reach $1,500 and $1,800.',
      "By 2020, New York had the highest rent at $2,600, followed by London at $2,200. Tokyo's rent, in contrast, largely stagnated after 2010 and had even fallen slightly to $1,500, while Berlin, despite starting from the lowest base, nearly doubled to reach $950.",
    ],
    highlights: [
      { phrase: 'New York, the second most expensive city in 2000, finished with the highest rent of all, while Tokyo was the only city where prices did not consistently increase', note: 'overview correctly identifies both the general pattern and the clearest exception' },
      { phrase: 'ranged from $500 in Berlin to $1,400 in Tokyo', note: 'efficient way of giving the extremes of a data set in one phrase' },
      { phrase: 'rising most sharply to reach $1,500 and $1,800', note: 'selects and compares the two fastest-growing cities rather than listing all four again' },
      { phrase: "Tokyo's rent, in contrast, largely stagnated after 2010", note: 'precise vocabulary for describing a flat trend, used accurately' },
      { phrase: 'despite starting from the lowest base, nearly doubled to reach $950', note: 'combines two features of the same city into a single, well-linked comparison' },
    ],
    criteria: {
      taskAchievement: 'The overview correctly identifies the general upward trend and highlights Tokyo as the clear exception, which are the two most important features of this table. Selected figures from each decade support the comparisons made rather than repeating the entire table.',
      coherence: 'The report moves logically through the three time periods shown in the table, comparing across cities at each point rather than describing one city at a time. Paragraphing supports this structure clearly.',
      lexical: "A good range of vocabulary for describing change ('stagnated', 'nearly doubled', 'rose steadily') is used accurately. Numbers are selected and rounded appropriately rather than repeating every cell of the table.",
      grammar: 'A range of past tense and comparative structures is used accurately throughout, appropriate for describing change over three time points. Minor errors are rare and do not affect meaning.',
    },
  },
  {
    promptId: 'w1-table-rent-prices',
    task: 'task1',
    band: 8.5,
    text: [
      'The table details average monthly rent, in US dollars, for a one-bedroom, city-centre apartment in London, New York, Tokyo and Berlin across three time points: 2000, 2010 and 2020.',
      'The standout feature is the sharp divergence between the three cities where rent climbed relentlessly and Tokyo, where it essentially stagnated, even dipping slightly after 2010, despite starting from the highest base of all four cities in 2000.',
      'At the turn of the century, rent varied considerably, from $500 in Berlin to $1,400 in Tokyo, with London and New York occupying the middle ground at $900 and $1,100. Over the next twenty years, London, New York and Berlin all saw sustained increases, with New York overtaking Tokyo by 2010 and ultimately reaching $2,600 by 2020, the highest figure in the table.',
      'Berlin, meanwhile, nearly doubled from its modest starting point to $950, while Tokyo alone ended the period barely above where it started, having risen just $100 in twenty years.',
    ],
    highlights: [
      { phrase: 'the sharp divergence between the three cities where rent climbed relentlessly and Tokyo, where it essentially stagnated', note: "single, precisely constructed sentence capturing the table's central contrast" },
      { phrase: 'despite starting from the highest base of all four cities in 2000', note: "adds a layer of nuance that strengthens the overview's central claim" },
      { phrase: 'rent varied considerably, from $500 in Berlin to $1,400 in Tokyo', note: 'efficient way of establishing the range before the detail that follows' },
      { phrase: 'New York overtaking Tokyo by 2010', note: 'precise description of a crossover in ranking, not just a rise in figures' },
      { phrase: 'Tokyo alone ended the period barely above where it started, having risen just $100 in twenty years', note: "sophisticated closing observation that quantifies the table's most surprising feature" },
    ],
    criteria: {
      taskAchievement: "The overview identifies a genuinely analytical contrast, three rising cities against one broadly flat one, and immediately adds the nuance of Tokyo's high starting point, which shows real command of the data. Every figure selected serves a clear comparative purpose rather than restating the table.",
      coherence: "The report is organised with clear, logical progression across the three time points, and precise reference ('meanwhile', 'Tokyo alone') links cities and periods without repetition. Structure and paragraphing are sophisticated throughout.",
      lexical: "Precise, wide-ranging vocabulary ('divergence', 'stagnated', 'occupying the middle ground') is used accurately and naturally throughout. There is no repetition of basic vocabulary anywhere in the report.",
      grammar: 'A wide range of complex structures, including a concessive clause and a precisely qualified comparative in the final sentence, is used with complete accuracy. The report reads fluently from start to finish.',
    },
  },
  /* ───────────────────────── w1-process-plastic-recycling ───────────────────────── */
  {
    promptId: 'w1-process-plastic-recycling',
    task: 'task1',
    band: 7,
    text: [
      'The diagram illustrates the process by which plastic bottles are recycled, from initial collection through to the manufacture of new products.',
      'Overall, the process consists of seven stages, beginning with the collection of used bottles and ending with the production of new plastic goods, and it is entirely man-made, with each stage carried out mechanically.',
      'The process begins when plastic bottles are collected from households and public collection points across a town or city, and then transported to a recycling facility. There, the bottles are sorted by colour and plastic type, before being washed to remove any remaining liquid or dirt.',
      'Once cleaned, the bottles are shredded into small fragments, which are then heated until molten. The molten plastic is subsequently cooled and cut into small pellets. Finally, these pellets serve as the raw material from which a wide range of new plastic products are manufactured and sold on to other industries.',
    ],
    highlights: [
      { phrase: 'the process consists of seven stages, beginning with the collection of used bottles and ending with the production of new plastic goods', note: 'gives the number of stages and the start/end points, exactly what a process overview needs' },
      { phrase: 'it is entirely man-made, with each stage carried out mechanically', note: 'correctly identifies the process as man-made, which determines the passive voice used throughout' },
      { phrase: 'sorted by colour and plastic type, before being washed', note: 'clear sequencing of two consecutive stages within one sentence' },
      { phrase: 'heated until molten', note: 'precise, accurate topic vocabulary used correctly' },
      { phrase: 'these pellets serve as the raw material from which a wide range of new plastic products are manufactured', note: "closes the description by linking back to the process's final purpose" },
    ],
    criteria: {
      taskAchievement: 'The overview correctly states the number of stages and identifies the start and end points of the process, which is exactly what this question type requires. Every stage shown in the diagram is mentioned, in the correct order, with no stages invented or omitted.',
      coherence: 'The report follows the process in strict chronological order, grouped sensibly into two detail paragraphs, which is a clear and logical way to describe a linear process. Sequencing language moves the reader through each stage smoothly.',
      lexical: "Accurate process vocabulary ('shredded', 'molten', 'pellets') is used correctly throughout. Passive voice is used consistently and appropriately for a man-made process.",
      grammar: 'The passive voice is used accurately and consistently throughout, which is exactly right for this type of man-made process. Sequencing structures are varied and controlled, with no errors that affect meaning.',
    },
  },
  {
    promptId: 'w1-process-plastic-recycling',
    task: 'task1',
    band: 8.5,
    text: [
      'The diagram outlines the process through which plastic bottles are recycled, tracing seven distinct stages from initial collection to the manufacture of new products.',
      'As a man-made, linear process rather than a natural or cyclical one, it relies throughout on mechanical intervention, and is best summarised as a straightforward journey from waste bottle to raw material for new manufacturing.',
      'The process is initiated when used bottles are gathered from households and from public collection points, and are then transported to a dedicated recycling facility. Here, they undergo sorting by colour and plastic type, followed by a thorough washing stage to eliminate any residual liquid or contamination.',
      'Once cleaned, the bottles are mechanically shredded into small fragments, which are subsequently heated to a molten state. This molten plastic is then cooled and formed into compact pellets, the raw material from which an extensive range of new plastic products is ultimately manufactured and sold.',
    ],
    highlights: [
      { phrase: 'tracing seven distinct stages from initial collection to the manufacture of new products', note: 'efficient overview combining stage count and start/end points in one clause' },
      { phrase: 'As a man-made, linear process rather than a natural or cyclical one', note: 'explicitly classifies the process type, showing full understanding of what the overview should establish' },
      { phrase: 'undergo sorting by colour and plastic type, followed by a thorough washing stage to eliminate any residual liquid or contamination', note: 'precise, varied vocabulary describing two consecutive stages fluently' },
      { phrase: 'heated to a molten state', note: 'precise, natural collocation, more sophisticated than a bare adjective' },
      { phrase: 'the raw material from which an extensive range of new plastic products is ultimately manufactured', note: "closes the report by linking the final stage back to the process's overall purpose" },
    ],
    criteria: {
      taskAchievement: 'The overview both states the number of stages and explicitly classifies the process as man-made and linear, which shows full command of what a strong Task 1 overview for a process diagram requires. Every stage is covered accurately, in the correct order, with appropriate detail.',
      coherence: "The report follows the process in clear chronological order, with sophisticated sequencing language ('Once cleaned', 'This molten plastic is then') linking each stage smoothly to the next. Paragraphing is logical and purposeful throughout.",
      lexical: "A wide, precise range of process vocabulary ('mechanically shredded', 'molten state', 'residual liquid or contamination') is used accurately and naturally throughout. There is no repetition of basic vocabulary anywhere in the report.",
      grammar: 'The passive voice is used with complete accuracy and control throughout, exactly appropriate for this man-made process. A wide range of structures, including non-finite clauses, adds fluency without ever sacrificing accuracy.',
    },
  },
  /* ───────────────────────── w1-map-riverside-town ───────────────────────── */
  {
    promptId: 'w1-map-riverside-town',
    task: 'task1',
    band: 7,
    text: [
      'The two maps show the town of Riverside in 1995 and today, illustrating how the town has developed over this period.',
      'Overall, the most significant changes are the replacement of the Post Office with a school and the conversion of most of the farmland into a shopping centre, while the river, bridge and original houses have remained unchanged.',
      'In 1995, Riverside consisted mainly of farmland to the south, a small cluster of houses on the northern bank, and a Post Office standing to the west of the farmland. The river ran through the middle of the town, crossed by a single bridge connecting the two halves.',
      "Today, the Post Office has been demolished and replaced by a school on the same site, while most of the farmland to the south has been converted into a large shopping centre, leaving only a narrow strip of fields along its southern edge. In addition, new housing has been built to the east of the existing homes on the northern bank, considerably expanding the town's residential area, although the river, bridge and original houses remain exactly as they were.",
    ],
    highlights: [
      { phrase: 'the replacement of the Post Office with a school and the conversion of most of the farmland into a shopping centre', note: 'overview correctly selects the two biggest changes rather than listing every difference' },
      { phrase: 'the river, bridge and original houses have remained unchanged', note: 'important feature: what stayed the same is worth a sentence, as the notes on this question type suggest' },
      { phrase: 'has been demolished and replaced by a school on the same site', note: 'precise passive structure appropriate for describing a man-made change' },
      { phrase: "considerably expanding the town's residential area", note: 'accurate topic vocabulary describing the scale of the new housing' },
      { phrase: 'remain exactly as they were', note: 'clear, simple way of confirming what did not change, closing the report logically' },
    ],
    criteria: {
      taskAchievement: 'The overview correctly identifies the two most significant changes and also notes what stayed the same, which reflects a full understanding of what this map task requires. Every change shown on the maps is covered, with no invented or missing detail.',
      coherence: 'The report is organised by map, 1995 then today, with the overview drawing the comparison together beforehand, a clear and logical structure for this task. Paragraphing supports this two-part comparison clearly.',
      lexical: "Accurate map vocabulary ('farmland', 'residential area', 'demolished') is used correctly throughout. There is little unnecessary repetition of basic vocabulary.",
      grammar: 'The passive voice is used accurately to describe changes made to the town, appropriate for this type of man-made development. A range of past and present perfect structures is used correctly throughout.',
    },
  },
  {
    promptId: 'w1-map-riverside-town',
    task: 'task1',
    band: 8.5,
    text: [
      'The two maps depict the town of Riverside in 1995 and at the present day, charting the considerable urban development that has taken place over the intervening period.',
      "The clearest transformation is the town's shift from a largely rural layout towards a more built-up one: the Post Office has given way to a school, and most of the farmland has been replaced by a shopping centre, while the river, bridge and original housing have been left entirely untouched.",
      'In 1995, the town was dominated by farmland to the south, with a modest cluster of houses along the northern bank and a Post Office standing alone to the west of the fields, the two halves of the town linked by a single bridge.',
      'Today, that Post Office site now houses a school, and most of the former farmland has given way to a substantial shopping centre, with only a thin band of fields surviving along its southern edge. New residential development has also considerably expanded the northern bank eastwards, even as the river, bridge and original houses persist exactly as they were, untouched by the surrounding change.',
    ],
    highlights: [
      { phrase: 'charting the considerable urban development that has taken place over the intervening period', note: "sophisticated framing of the overview's purpose before the detail begins" },
      { phrase: "the town's shift from a largely rural layout towards a more built-up one", note: 'captures the overall transformation in a single, precise phrase rather than a list of separate changes' },
      { phrase: 'the Post Office has given way to a school', note: 'natural, idiomatic collocation used to describe a man-made replacement' },
      { phrase: 'the river, bridge and original housing have been left entirely untouched', note: 'precise, emphatic way of covering what stayed the same, a feature many candidates forget' },
      { phrase: 'untouched by the surrounding change', note: "elegant closing phrase that reinforces the overview's central contrast" },
    ],
    criteria: {
      taskAchievement: 'The overview identifies a genuinely analytical transformation, from rural to built-up, rather than simply listing individual changes, which is a sophisticated reading of the two maps. Both what changed and what stayed the same are covered fully and precisely.',
      coherence: "The report develops with clear, logical structure and precise reference ('that Post Office site', 'the former farmland') linking the two maps without repetition. Paragraphing and sequencing are sophisticated throughout.",
      lexical: "Precise, wide-ranging vocabulary ('given way to', 'substantial', 'untouched') is used accurately and naturally throughout. There is no repetition of basic vocabulary anywhere in the report.",
      grammar: 'A wide range of complex structures, including a present perfect used for unfinished relevance and a concessive clause in the final sentence, is used with complete accuracy. The report reads fluently from start to finish.',
    },
  },
  /* ───────────────────────── w1-combination-water-usage ───────────────────────── */
  {
    promptId: 'w1-combination-water-usage',
    task: 'task1',
    band: 7,
    text: [
      'The bar chart shows the proportion of water used by three sectors, agriculture, industry and domestic use, in a country in 2020, while the table shows total daily water consumption over three years.',
      'Overall, agriculture consumed by far the largest share of water in 2020, and total water consumption rose steadily between 2000 and 2020, increasing in each of the decades shown in the table.',
      'According to the bar chart, agriculture accounted for 70% of water use in 2020, considerably more than industry at 25% and domestic use, which made up only 5% of the total. Agriculture therefore used almost three times as much water as industry, and fourteen times as much as households.',
      'The table shows that total consumption rose from 18.2 billion litres per day in 2000 to 21.6 billion in 2010, and further to 25.9 billion by 2020. The increase was slightly larger in the second decade than in the first, and amounted to a rise of roughly 42% across the twenty years as a whole.',
    ],
    highlights: [
      { phrase: 'agriculture consumed by far the largest share of water in 2020, and total water consumption rose steadily between 2000 and 2020', note: 'overview links a feature from each visual, connecting them rather than describing them separately' },
      { phrase: 'considerably more than industry at 25% and domestic use, which made up only 5%', note: 'efficient comparison of all three sectors within a single sentence' },
      { phrase: 'almost three times as much water as industry, and fourteen times as much as households', note: 'turns the three percentages into ratios, a real comparison rather than a restatement' },
      { phrase: 'rose from 18.2 billion litres per day in 2000 to 21.6 billion in 2010, and further to 25.9 billion by 2020', note: 'clear description of change across three time points using accurate figures' },
      { phrase: 'The increase was slightly larger in the second decade than in the first', note: 'compares the two decades instead of simply listing the three figures again' },
    ],
    criteria: {
      taskAchievement: 'The overview connects the two visuals rather than describing them as two separate reports, which is exactly what a combination Task 1 requires. Key figures from both the chart and the table are selected accurately to support the comparisons made.',
      coherence: 'The report addresses the bar chart and the table in turn, with the overview linking them beforehand, a clear and logical structure for this type of combined task. Paragraphing separates the two visuals clearly while the overview ties them together.',
      lexical: "Topic vocabulary ('sector', 'consumption', 'domestic use') is used accurately throughout. There is little unnecessary repetition of basic vocabulary across the report.",
      grammar: 'A range of structures, including a non-defining relative clause and a concessive clause in the final sentence, is used accurately. Minor errors are rare and do not affect meaning.',
    },
  },
  {
    promptId: 'w1-combination-water-usage',
    task: 'task1',
    band: 8.5,
    text: [
      'The bar chart illustrates how water use was distributed across three sectors, agriculture, industry and domestic use, in 2020, while the accompanying table tracks total daily water consumption over the preceding two decades.',
      'Taken together, the two visuals reveal a country where agriculture dominates water use overwhelmingly, and where total demand has climbed without interruption across the two decades that the accompanying table covers.',
      "As the bar chart shows, agriculture alone accounted for 70% of water consumption in 2020, dwarfing industry's 25% share and domestic use's mere 5%, underlining just how central farming is to the country's overall water demand.",
      'Meanwhile, the table reveals a steady upward trajectory in total consumption, climbing from 18.2 billion litres per day in 2000 to 21.6 billion in 2010, and reaching 25.9 billion by 2020. That amounts to an overall increase of roughly 42% across the twenty years, with the second decade adding slightly more in absolute terms than the first.',
    ],
    highlights: [
      { phrase: 'Taken together, the two visuals reveal a country where agriculture dominates water use overwhelmingly', note: 'explicitly synthesises the two visuals rather than treating them as separate reports' },
      { phrase: "dwarfing industry's 25% share and domestic use's mere 5%", note: 'precise, vivid vocabulary comparing all three sectors economically' },
      { phrase: "underlining just how central farming is to the country's overall water demand", note: 'confident interpretation that follows logically from the figures just given' },
      { phrase: 'a steady upward trajectory in total consumption', note: "precise vocabulary describing the shape of the table's trend before the figures are given" },
      { phrase: 'an overall increase of roughly 42% across the twenty years, with the second decade adding slightly more in absolute terms than the first', note: 'closes with a calculated comparison drawn from the table rather than a guess at causes' },
    ],
    criteria: {
      taskAchievement: 'The overview genuinely synthesises the two visuals into a single insight, rather than summarising each one in isolation, which is the mark of a strong combination-task response. The closing sentence quantifies the overall increase and weighs one decade against the other, which is far more informative than repeating the three figures.',
      coherence: "The report is organised with clear, logical structure, and the final sentence explicitly connects the bar chart and the table, giving the response real unity. Cohesion is achieved through sophisticated reference ('Meanwhile', 'Read alongside') rather than repeated simple linkers.",
      lexical: "Precise, wide-ranging vocabulary ('dwarfing', 'trajectory', 'principal force') is used accurately and naturally throughout. There is no repetition of basic vocabulary anywhere in the report.",
      grammar: 'A wide range of complex structures, including a non-finite clause and a passive construction in the final sentence, is used with complete accuracy. The report reads fluently from start to finish.',
    },
  },
  /* ───────────────────────── w1-line-social-media-time ───────────────────────── */
  {
    promptId: 'w1-line-social-media-time',
    task: 'task1',
    band: 7,
    text: [
      'The line graph shows average daily time spent on social media by three age groups, teenagers, young adults and older adults, between 2015 and 2023.',
      'Overall, social media use increased steadily across all three age groups over the period, with teenagers consistently spending the most time online, although young adults narrowed the gap considerably by the end of the period.',
      'In 2015, teenagers spent around ninety minutes a day on social media, compared with roughly fifty-five minutes for young adults and only fifteen minutes for older adults. All three figures rose steadily over the following years, with the gap between teenagers and young adults gradually shrinking.',
      "By 2023, teenagers' daily average had more than doubled to just over three hours, while young adults had risen even more sharply, tripling to nearly three hours and closing in on teenagers' figure. Older adults also increased their usage, reaching a little over an hour, though they remained well behind the other two groups throughout.",
    ],
    highlights: [
      { phrase: 'social media use increased steadily across all three age groups over the period, with teenagers consistently spending the most time online, although young adults narrowed the gap considerably by the end of the period', note: 'overview gives the shared trend plus the key relationship between two of the lines' },
      { phrase: 'compared with roughly fifty-five minutes for young adults and only fifteen minutes for older adults', note: 'efficient three-way comparison within a single sentence' },
      { phrase: 'the gap between teenagers and young adults gradually shrinking', note: 'describes the relationship between two lines, not just their individual values' },
      { phrase: "closing in on teenagers' figure", note: 'precise phrase describing convergence, directly relevant to the graph\'s key feature' },
      { phrase: 'remained well behind the other two groups throughout', note: 'clear closing comparison for the third line' },
    ],
    criteria: {
      taskAchievement: 'The overview identifies both the shared upward trend and the narrowing gap between teenagers and young adults, which is exactly the kind of relationship this graph calls for. Figures are selected from the start and end of the period to support clear comparison.',
      coherence: 'The report moves logically from an overview to the 2015 starting figures, then to the 2023 end figures, a clear and appropriate structure for a line graph covering this length of time. Paragraphing supports this structure clearly.',
      lexical: "A good range of vocabulary for describing trends and comparison ('narrowed the gap', 'closing in on', 'more than doubled') is used accurately. Numbers are rounded and expressed naturally.",
      grammar: 'A range of comparative structures and past tense forms is used accurately throughout, appropriate for describing change over the period shown. Minor errors are rare and do not affect meaning.',
    },
  },
  {
    promptId: 'w1-line-social-media-time',
    task: 'task1',
    band: 8.5,
    text: [
      'The line graph tracks average daily social media use among three age groups, teenagers, young adults and older adults, over the eight years from 2015 to 2023.',
      "While all three groups spent progressively more time on social media across the period, the standout feature is how sharply young adults' usage accelerated, closing what had been a substantial gap with teenagers by the final year shown.",
      'In 2015, teenagers led clearly at roughly ninety minutes a day, well over half as much again as the fifty-five minutes recorded for young adults and six times the fifteen minutes typical of older adults. All three lines rose steadily thereafter, though not at an equal pace.',
      "By 2023, teenagers' average had climbed to just over three hours, but young adults had risen far more steeply, more than tripling to around two hours and fifty-five minutes and all but converging with teenagers by the end of the period. Older adults, while also increasing their usage considerably, remained the clear outlier throughout, never approaching the levels seen among younger users.",
    ],
    highlights: [
      { phrase: "the standout feature is how sharply young adults' usage accelerated, closing what had been a substantial gap with teenagers", note: "precisely identifies the graph's most significant feature, not just a general trend" },
      { phrase: 'six times the fifteen minutes typical of older adults', note: 'precise ratio-based comparison rather than a simple figure' },
      { phrase: 'though not at an equal pace', note: 'concise phrase that sets up the more detailed comparison in the following paragraph' },
      { phrase: 'all but converging with teenagers by the end of the period', note: "sophisticated, precise vocabulary describing near-convergence rather than a vaguer 'similar'" },
      { phrase: 'remained the clear outlier throughout, never approaching the levels seen among younger users', note: "confident closing comparison that reinforces the overview's central claim" },
    ],
    criteria: {
      taskAchievement: 'The overview identifies a genuinely specific, analytical feature, the acceleration and near-convergence of young adults with teenagers, rather than a generic description of three rising lines. Figures throughout are selected and compared precisely to support this central claim.',
      coherence: "The report develops with clear, logical progression from overview to early, then late, detail, and precise reference ('all three lines rose steadily thereafter, though not at an equal pace') links the paragraphs smoothly. Structure is sophisticated throughout.",
      lexical: "Precise, wide-ranging vocabulary ('converging', 'clear outlier', 'accelerated') is used accurately and naturally throughout. There is no repetition of basic vocabulary anywhere in the report.",
      grammar: 'A wide range of complex structures, including a non-finite clause and a precisely qualified comparative, is used with complete accuracy. The report reads fluently from start to finish.',
    },
  },
  /* ───────────────────────── w1-bar-tourist-arrivals ───────────────────────── */
  {
    promptId: 'w1-bar-tourist-arrivals',
    task: 'task1',
    band: 7,
    text: [
      'The bar chart shows the number of international tourists, in millions, visiting France, Spain, Thailand and Mexico in 2015 and 2023.',
      'Overall, tourist arrivals increased in three of the four countries over the period, with Mexico growing fastest in proportional terms, while Thailand was the only country to see a decline in visitor numbers.',
      'In 2015, France received the most tourists at 84 million, followed by Spain at 68 million, with Thailand and Mexico further behind at 30 million and 32 million respectively. By 2023, France had grown further to reach 100 million visitors, maintaining its position as the most visited country of the four.',
      'Spain grew by a similar amount, reaching 85 million by 2023, while Mexico added 13 million to reach 45 million, a gain of around 40% and the steepest proportional rise in the chart. Thailand, in contrast, was the sole country to see arrivals fall, slipping slightly to 28 million.',
    ],
    highlights: [
      { phrase: 'tourist arrivals increased in three of the four countries over the period, with Mexico growing fastest in proportional terms, while Thailand was the only country to see a decline', note: 'overview correctly identifies both the general pattern and the clear exception' },
      { phrase: 'France received the most tourists at 84 million, followed by Spain at 68 million', note: 'efficient ranking of the top two countries within a single sentence' },
      { phrase: 'maintaining its position as the most visited country of the four', note: 'accurate comparison across both years, not just within one' },
      { phrase: 'a gain of around 40% and the steepest proportional rise in the chart', note: "grades the change in proportional terms, which distinguishes Mexico from the larger absolute rises" },
      { phrase: 'the sole country to see arrivals fall', note: "confident superlative used to highlight the chart's key exception" },
    ],
    criteria: {
      taskAchievement: 'The overview correctly identifies the general upward trend and clearly highlights Thailand as the exception, which are the two most important features of this bar chart. Figures are selected from both years to support comparison across all four countries, and proportional change is distinguished from absolute change.',
      coherence: 'The report compares all four countries within each year before moving to the next, which is a clear and logical way to organise a bar chart with two time points. Paragraphing supports this structure clearly.',
      lexical: "A good range of vocabulary for describing change ('steepest proportional rise', 'slipping slightly', 'maintaining its position') is used accurately. Numbers are compared naturally rather than simply listed.",
      grammar: 'A range of comparative and superlative structures is used accurately throughout, appropriate for comparing four countries across two years. Minor errors are rare and do not affect meaning.',
    },
  },
  {
    promptId: 'w1-bar-tourist-arrivals',
    task: 'task1',
    band: 8.5,
    text: [
      'The bar chart compares the number of international tourist arrivals, in millions, to France, Spain, Thailand and Mexico in 2015 and 2023.',
      'The clearest feature is the contrast between three countries enjoying continued growth in arrivals and Thailand, which stands out as the only one of the four to see numbers fall over the period, with France maintaining its lead throughout.',
      "In 2015, France was already the most visited of the four, drawing 84 million tourists, well ahead of Spain's 68 million and considerably further ahead of Thailand and Mexico, which each attracted roughly 30 million. By 2023, France had climbed to 100 million visitors, though an almost identical gain by Spain left the gap between them essentially unchanged.",
      "Spain grew by seventeen million to reach 85 million, the largest absolute increase in the chart, while Mexico's rise from 32 to 45 million was the steepest in proportional terms. Thailand, uniquely among the four, saw arrivals edge down to 28 million, a modest fall that nonetheless leaves it visibly adrift from the other three by 2023.",
    ],
    highlights: [
      { phrase: 'The clearest feature is the contrast between three countries enjoying continued growth in arrivals and Thailand, which stands out as the only one of the four to see numbers fall', note: 'overview frames the whole chart around a single, precise contrast' },
      { phrase: 'considerably further ahead of Thailand and Mexico, which each attracted roughly 30 million', note: 'groups two similar figures together economically within one sentence' },
      { phrase: 'an almost identical gain by Spain left the gap between them essentially unchanged', note: "notices that the leader's advantage did not actually widen, a detail most candidates miss" },
      { phrase: "Mexico's rise from 32 to 45 million was the steepest in proportional terms", note: 'separates proportional from absolute change within a single sentence' },
      { phrase: 'a modest fall that nonetheless leaves it visibly adrift from the other three by 2023', note: "sophisticated closing image that reinforces the overview's central contrast" },
    ],
    criteria: {
      taskAchievement: "The overview is built entirely around the chart's most significant contrast, three rising countries against one falling, rather than listing each country's change separately, which reflects a sophisticated reading of the data. Every figure selected supports a genuine comparison.",
      coherence: "The report develops with clear, logical structure, comparing all four countries within each year before moving on, and precise reference ('the gap between them', 'uniquely among the four') links the two years smoothly. Structure is sophisticated throughout.",
      lexical: "Precise, wide-ranging vocabulary ('adrift', 'in proportional terms', 'essentially unchanged') is used accurately and naturally throughout. There is no repetition of basic vocabulary anywhere in the report.",
      grammar: 'A wide range of complex structures, including a non-defining relative clause and a precisely qualified comparative, is used with complete accuracy. The report reads fluently from start to finish.',
    },
  },
  /* ───────────────────────── w1-pie-public-transport-reasons ───────────────────────── */
  {
    promptId: 'w1-pie-public-transport-reasons',
    task: 'task1',
    band: 7,
    text: [
      'The pie chart shows the main reasons that people gave for choosing to use public transport in a recent survey.',
      'Overall, cost was clearly the most commonly cited reason, followed by convenience, while environmental concerns, lack of a car and other reasons accounted for smaller shares of responses.',
      'According to the survey, 35% of respondents identified cost as their primary reason for using public transport, making it by some distance the single most common answer given. Convenience was the second most popular reason, chosen by a quarter of respondents, so that cost and convenience between them accounted for 60% of all the answers given.',
      'Environmental concern was cited by a smaller but still notable 20% of respondents, ranking as the third most common reason overall. Meanwhile, only 12% of respondents said they used public transport because they had no car available, and the remaining 8% gave other, unspecified reasons for their choice.',
    ],
    highlights: [
      { phrase: 'cost was clearly the most commonly cited reason, followed by convenience', note: 'clear overview ranking the top two categories, appropriate for a single pie chart' },
      { phrase: '35% of respondents identified cost as their primary reason', note: "accurate, specific figure used to support the overview's opening claim" },
      { phrase: 'cost and convenience between them accounted for 60% of all the answers given', note: 'groups the top two categories into a single figure, a comparison rather than a restatement' },
      { phrase: 'ranking as the third most common reason', note: 'precise ordinal comparison that keeps the ranking clear throughout the report' },
      { phrase: 'the remaining 8% gave other, unspecified reasons', note: 'closes the report by accounting for the final, smallest category' },
    ],
    criteria: {
      taskAchievement: 'The overview correctly identifies the two most significant categories, cost and convenience, which is exactly what this single pie chart calls for. All five categories are covered accurately, with figures used to support a clear ranking.',
      coherence: 'The report moves through the categories in descending order of size, a clear and logical way to organise a single pie chart. Paragraphing groups related categories together sensibly.',
      lexical: "Accurate topic vocabulary ('respondents', 'environmental concern', 'primary reason') is used correctly throughout. There is little unnecessary repetition of basic vocabulary.",
      grammar: 'A range of structures, including passive forms and ordinal comparisons, is used accurately throughout. Minor errors are rare and do not affect meaning.',
    },
  },
  {
    promptId: 'w1-pie-public-transport-reasons',
    task: 'task1',
    band: 8.5,
    text: [
      'The pie chart illustrates the main reasons that survey respondents gave for choosing to use public transport.',
      'Cost clearly dominates as the leading motivation, cited by over a third of respondents, while convenience and environmental concern together account for a further 45%, leaving car ownership and other factors as comparatively minor considerations by comparison.',
      "Specifically, 35% of respondents named cost as their primary reason for using public transport, underlining the financial appeal buses and trains hold over running a private car. A quarter cited convenience, suggesting that practicality, not just price, shapes many people's transport choices, while a further 20% pointed to environmental concern, reflecting a genuine, if secondary, awareness of transport's ecological footprint.",
      'The remaining categories were considerably smaller: just 12% of respondents lacked access to a car, and a final 8% offered other, unspecified reasons, together accounting for only a fifth of all responses collected in the survey.',
    ],
    highlights: [
      { phrase: 'Cost clearly dominates as the leading motivation, cited by over a third of respondents', note: 'confident, precise overview statement combining ranking and figure in one clause' },
      { phrase: 'convenience and environmental concern together account for a further 45%', note: 'groups two categories together for an efficient, higher-level comparison' },
      { phrase: 'underlining the financial appeal buses and trains hold over running a private car', note: 'sophisticated interpretation that goes beyond simply restating the figure' },
      { phrase: "a genuine, if secondary, awareness of transport's ecological footprint", note: 'precise, nuanced phrasing that qualifies the significance of the third category' },
      { phrase: 'together accounting for only a fifth of all responses', note: 'closes the report with a clear, calculated comparison rather than two isolated figures' },
    ],
    criteria: {
      taskAchievement: 'The overview groups the categories meaningfully, cost alone against convenience and environment combined against the two minor categories, which is a more sophisticated structure than simply listing five percentages. Every figure is accurate and used to support a genuine comparison.',
      coherence: "The report develops with clear, logical structure, moving from the dominant category through to the smallest, and precise reference ('a further', 'together accounting for') links figures without repetition. Structure is sophisticated throughout.",
      lexical: "Precise, wide-ranging vocabulary ('dominates', 'ecological footprint', 'comparatively minor') is used accurately and naturally throughout. There is no repetition of basic vocabulary anywhere in the report.",
      grammar: "A wide range of complex structures, including a concessive aside ('if secondary') and precise quantifying phrases, is used with complete accuracy. The report reads fluently from start to finish.",
    },
  },
  /* ───────────────────────── w1-table-working-hours ───────────────────────── */
  {
    promptId: 'w1-table-working-hours',
    task: 'task1',
    band: 7,
    text: [
      'The table shows the average number of working hours per week in Germany, Japan, South Korea, Mexico and Sweden in 1990, 2010 and 2020.',
      'Overall, working hours declined in all five countries over the thirty-year period, although the extent of the decline varied considerably, with South Korea seeing the largest fall and Mexico the smallest.',
      'In 1990, South Korea recorded the longest working week at 48 hours, followed by Mexico at 45 and Japan at 44, while Germany and Sweden had noticeably shorter working weeks of 40 and 38 hours respectively. By 2020, all five countries had reduced their working hours to some extent.',
      "South Korea saw the sharpest decline, falling to 40 hours by 2020, though this remained above Germany's 34 hours, the lowest figure in the table. Mexico's working week, in contrast, barely changed, falling only slightly to 43 hours and remaining the highest of the five by 2020.",
    ],
    highlights: [
      { phrase: 'working hours declined in all five countries over the thirty-year period, although the extent of the decline varied considerably', note: 'overview gives the shared trend plus the key variation between countries' },
      { phrase: 'South Korea recorded the longest working week at 48 hours, followed by Mexico at 45 and Japan at 44', note: 'efficient ranking of three countries within a single sentence' },
      { phrase: 'noticeably shorter working weeks of 40 and 38 hours respectively', note: 'groups two similar figures together for an efficient comparison' },
      { phrase: 'South Korea saw the sharpest decline, falling to 40 hours by 2020', note: 'clearly selects and quantifies the largest change in the table' },
      { phrase: 'barely changed, falling only slightly to 43 hours and remaining the highest of the five by 2020', note: 'accurate closing comparison identifying the smallest change and the final ranking together' },
    ],
    criteria: {
      taskAchievement: "The overview correctly identifies the shared downward trend and highlights the two extremes, South Korea's large fall and Mexico's small one, which are the most important features of this table. Figures are selected from all three years to support clear comparison.",
      coherence: 'The report compares all five countries within 1990 before moving to changes by 2020, a clear and logical way to organise a table with several categories and time points. Paragraphing supports this structure clearly.',
      lexical: "A good range of vocabulary for describing change ('declined', 'sharpest decline', 'barely changed') is used accurately. Numbers are selected and compared appropriately rather than listing every cell.",
      grammar: 'A range of comparative and superlative structures is used accurately throughout, appropriate for comparing five countries across three time points. Minor errors are rare and do not affect meaning.',
    },
  },
  {
    promptId: 'w1-table-working-hours',
    task: 'task1',
    band: 8.5,
    text: [
      'The table details the average working week, in hours, in Germany, Japan, South Korea, Mexico and Sweden across three time points: 1990, 2010 and 2020.',
      "The dominant trend is a general decline in working hours across all five countries, though the pace of that decline diverges sharply, ranging from South Korea's dramatic fall to Mexico's near stagnation.",
      "In 1990, South Korea worked longest at 48 hours a week, appreciably ahead of Mexico's 45 and Japan's 44, while Germany and Sweden already worked noticeably shorter weeks of 40 and 38 hours respectively. Three decades on, every country had reduced its working hours, but by strikingly different margins.",
      "South Korea's decline was the most dramatic, shedding eight hours to reach 40 by 2020, yet even that left it six hours above Germany, which fell to just 34 hours, the shortest working week in the table. Mexico, by contrast, saw scarcely any change, edging down to 43 hours and remaining, by a considerable margin, the country with the longest working week of the five.",
    ],
    highlights: [
      { phrase: "the pace of that decline diverges sharply, ranging from South Korea's dramatic fall to Mexico's near stagnation", note: "overview frames the whole table around the contrast in the rate of change, not just its direction" },
      { phrase: "appreciably ahead of Mexico's 45 and Japan's 44", note: 'precise comparative phrase linking three figures economically' },
      { phrase: 'but by strikingly different margins', note: 'concise transition that sets up the detailed contrast in the following paragraph' },
      { phrase: 'shedding eight hours to reach 40 by 2020, yet even that left it six hours above Germany', note: 'combines two comparisons, the size of the change and the final ranking, in one sentence' },
      { phrase: 'remaining, by a considerable margin, the country with the longest working week of the five', note: 'precise, emphatic superlative closing the report' },
    ],
    criteria: {
      taskAchievement: 'The overview is built around the contrast in the pace of change rather than simply stating that hours fell everywhere, which is a sophisticated reading of a table with five categories and three time points. Every figure selected supports a genuine, purposeful comparison.',
      coherence: "The report develops with clear, logical structure, moving from 1990 rankings to the scale of change by 2020, and precise reference ('three decades on', 'by contrast') links the two halves smoothly. Structure is sophisticated throughout.",
      lexical: "Precise, wide-ranging vocabulary ('diverges sharply', 'near stagnation', 'shedding eight hours') is used accurately and naturally throughout. There is no repetition of basic vocabulary anywhere in the report.",
      grammar: 'A wide range of complex structures, including a non-defining relative clause and a precisely qualified superlative, is used with complete accuracy. The report reads fluently from start to finish.',
    },
  },
  /* ───────────────────────── w1-letter-faulty-appliance ───────────────────────── */
  {
    promptId: 'w1-letter-faulty-appliance',
    task: 'task1',
    band: 7,
    text: [
      'Dear Sir or Madam,',
      'I am writing to report a problem with a washing machine that I purchased from your store last month, which has stopped working correctly after only a short period of use.',
      'The machine began making a loud noise during the spin cycle after about two weeks, and it has now stopped functioning altogether. I contacted your customer service team by phone last week to explain the issue, and I was told that a technician would call me back to arrange a repair, but I have not heard anything since.',
      'As the appliance is still well within its warranty period, I would like it to be either repaired or replaced as soon as possible. If neither option is available quickly, I would appreciate a full refund instead.',
      'I would be grateful if you could look into this matter and get back to me at your earliest convenience.',
      'Yours faithfully,\nDaniyar Suleimenov',
    ],
    highlights: [
      { phrase: 'I am writing to report a problem with a washing machine that I purchased from your store last month', note: 'clear purpose stated in the opening sentence, appropriate for a formal complaint letter' },
      { phrase: 'I was told that a technician would call me back to arrange a repair, but I have not heard anything since', note: 'clearly explains what happened when the shop was contacted, covering the second bullet point directly' },
      { phrase: 'As the appliance is still well within its warranty period', note: 'relevant topic vocabulary used to justify the request that follows' },
      { phrase: 'I would appreciate a full refund instead', note: 'clear, polite statement of what the writer wants, covering the third bullet point' },
      { phrase: 'Yours faithfully', note: "correctly paired with the unnamed greeting 'Dear Sir or Madam'" },
    ],
    criteria: {
      taskAchievement: 'All three bullet points, the item and problem, what happened when the shop was contacted, and what the writer wants done, are covered clearly and in a logical order. The tone is consistently formal throughout, appropriate for writing to a shop rather than to someone known personally.',
      coherence: 'The letter follows a clear structure: problem, previous contact, request, and a polite closing line. Each bullet point is given its own paragraph, making the sequence easy to follow.',
      lexical: "Appropriate formal vocabulary ('warranty period', 'customer service', 'at your earliest convenience') is used accurately throughout. There is no repetition of basic vocabulary across the letter.",
      grammar: 'A range of structures, including a relative clause in the opening sentence and a conditional in the third paragraph, is used accurately. The letter reads clearly, with no errors that affect meaning.',
    },
  },
  {
    promptId: 'w1-letter-faulty-appliance',
    task: 'task1',
    band: 8.5,
    text: [
      'Dear Sir or Madam,',
      'I am writing to express my dissatisfaction with a washing machine purchased from your store last month, which malfunctioned after only a fortnight of normal use and has since stopped working entirely.',
      'The problem first became apparent as an unusually loud noise during the spin cycle, which quickly worsened until the machine ceased functioning altogether. I telephoned your customer service department promptly to report the fault and was assured that a technician would be in touch to arrange a repair; despite this assurance, however, no one has yet contacted me.',
      'Given that the appliance remains well within its warranty period, I would ask that it be repaired or replaced without further delay. Should neither be possible in a reasonably short timeframe, I would expect a full refund to be issued instead.',
      'I trust you will treat this matter with the urgency it deserves, and I look forward to your prompt response.',
      'Yours faithfully,\nDaniyar Suleimenov',
    ],
    highlights: [
      { phrase: 'I am writing to express my dissatisfaction with a washing machine purchased from your store last month, which malfunctioned after only a fortnight of normal use', note: 'sophisticated opening combining purpose, timeframe and problem in one precisely controlled sentence' },
      { phrase: 'despite this assurance, however, no one has yet contacted me', note: 'polished way of expressing frustration while remaining formally appropriate' },
      { phrase: 'Given that the appliance remains well within its warranty period', note: 'formal, precise justification leading naturally into the request that follows' },
      { phrase: 'Should neither be possible in a reasonably short timeframe, I would expect a full refund to be issued instead', note: "sophisticated inverted conditional, more formal than a plain 'if' clause" },
      { phrase: 'I trust you will treat this matter with the urgency it deserves', note: 'confident, idiomatic closing line rarely seen below the top bands' },
    ],
    criteria: {
      taskAchievement: 'All three bullet points are addressed fully and precisely, with the request in particular laid out as a clear, reasoned sequence of preferred outcomes. The formal tone is judged accurately and maintained without a single lapse throughout the letter.',
      coherence: 'The letter develops as a single, well-managed piece of formal correspondence, with each paragraph flowing logically from the one before. Cohesion is achieved through sophisticated reference and connected reasoning rather than mechanical linking phrases.',
      lexical: "A wide range of precise, formal vocabulary and collocation ('malfunctioned', 'without further delay', 'the urgency it deserves') is used accurately throughout. There is no repetition and no vocabulary that feels inserted for effect.",
      grammar: 'A wide range of structures, including an inverted conditional (Should neither be possible) and a non-defining relative clause, is used with complete accuracy and control. The letter reads fluently from start to finish, with no errors of any kind.',
    },
  },
];

/** All model answers for a given prompt, in ascending band order. */
export function getModelAnswers(promptId: string): ModelAnswer[] {
  return MODEL_ANSWERS.filter((m) => m.promptId === promptId).sort((a, b) => a.band - b.band);
}

/** The distinct bands available for a prompt (3 for most Task 2 prompts,
    2 for Task 1 and any Task 2 prompt past the twelve-prompt cap). */
export function getModelBands(promptId: string): ModelBand[] {
  return getModelAnswers(promptId).map((m) => m.band);
}
