/* Cue Card Bank: 24 original Part 2 cue cards covering the topic families
   that recur in the real exam (person, place, object, event, activity,
   media, plan, skill). Independent of SPEAKING_CUE_CARDS in
   speaking-prompts.ts (which drives the Speaking Trainer's live rotation);
   this bank is a browsable reference + "prepare and speak" timer at
   /speaking/cue-cards, not part of that rotation. British spelling
   throughout, no em or en dashes, no invented statistics, no named real
   people, topics culturally neutral or fitting a student from Kazakhstan. */

export type CueCardFamily =
  | 'person'
  | 'place'
  | 'object'
  | 'event'
  | 'activity'
  | 'media'
  | 'plan'
  | 'skill';

export interface CueCardFamilyMeta {
  id: CueCardFamily;
  label: string;
}

export const CUE_CARD_FAMILIES: CueCardFamilyMeta[] = [
  { id: 'person', label: 'A person' },
  { id: 'place', label: 'A place' },
  { id: 'object', label: 'An object' },
  { id: 'event', label: 'An event' },
  { id: 'activity', label: 'An activity' },
  { id: 'media', label: 'Media' },
  { id: 'plan', label: 'A plan' },
  { id: 'skill', label: 'A skill' },
];

export interface CueCard {
  id: string;
  family: CueCardFamily;
  /** short label for the grid card and browser tab, not the exam wording */
  title: string;
  card: {
    /** the exact "Describe a..." headline, as it would appear on the real card */
    topic: string;
    /** the "you should say" bullets, without the final "and explain" line */
    points: string[];
    /** the final "and explain..." instruction, kept separate from points */
    explain: string;
  };
  /** 5 to 7 short notes, the way a student would jot them in the 1-minute prep */
  notes: string[];
  /** Band 7.0 model answer, 200 to 240 words, spoken paragraphs */
  model: string[];
  /** 4 to 5 Band 8 upgrade phrases with a note on what each does */
  upgrades: { phrase: string; note: string }[];
  /** two rounding-off questions the examiner might ask right after the talk */
  roundingOff: { q: string; a: string }[];
  /** three Part 3 follow-up questions, 60 to 90 word discussion answers */
  part3: { q: string; a: string }[];
}

export const CUE_CARDS: CueCard[] = [
  {
    id: 'person-family-admire',
    family: 'person',
    title: 'A family member you admire',
    card: {
      topic: 'Describe a family member you admire.',
      points: ['who this person is', 'what they do', 'how much time you spend with them'],
      explain: 'and explain why you admire them',
    },
    notes: [
      'aunt Aigerim, mum\'s younger sister',
      'runs a small bakery, self-taught',
      'see her most weekends',
      'started with nothing, patient, calm',
      'taught me to bake, never gives up',
      'why: hard work and kindness',
    ],
    model: [
      "I'd like to talk about my aunt, Aigerim, who's actually my mother's younger sister. She's someone I've looked up to for as long as I can remember, mainly because of the way she built her own small bakery from almost nothing.",
      "In terms of what she does, she runs a tiny bakery near the central market, and she basically taught herself everything, from baking to bookkeeping, by watching videos online and just, well, trying things out until they worked. I see her most weekends, actually, because I help her out at the counter sometimes, and we usually end up chatting for hours while customers come and go. What always strikes me is how calm she stays even when the ovens break down or an order gets mixed up.",
      "What I admire most about her, though, isn't really the business side of things. It's her patience. She never once made me feel stupid when I burned an entire batch of bread as a teenager; she just laughed and showed me again. Looking back, I think she's shaped the way I approach my own mistakes now, because I try to be as forgiving with myself as she is with everyone else. All in all, she's proof that you don't need a fancy education to build something you're proud of.",
    ],
    upgrades: [
      { phrase: "who's actually my mother's younger sister", note: 'a natural relative clause in the opening line shows grammatical range without sounding rehearsed' },
      { phrase: 'what always strikes me is', note: 'a stronger way to introduce an observation than a flat "I think"' },
      { phrase: 'even when the ovens break down', note: 'a concrete example beats a vague generalisation like "even when things go wrong"' },
      { phrase: "she's proof that", note: 'a confident closing structure that avoids a stock "in conclusion"' },
      { phrase: 'as forgiving with myself as she is with everyone else', note: 'an as...as comparison that ties the talk back to the speaker, not just the person described' },
    ],
    roundingOff: [
      { q: 'Do you see her often?', a: 'Yes, most weekends, usually at her bakery.' },
      { q: 'Would you like to run your own business one day?', a: "Possibly, though I'd want her patience first." },
    ],
    part3: [
      {
        q: 'Why do people admire family members more than celebrities?',
        a: "I think it's because you actually witness the effort, not just the finished result. With a celebrity you only see the success, whereas with a family member you've watched them struggle, fail and try again, which makes the achievement feel more genuine. There's also the personal connection; admiring someone who has shaped your daily life tends to mean more than admiring a stranger you'll never meet.",
      },
      {
        q: 'Do you think younger generations respect older family members as much as before?',
        a: "To some extent, yes, though I'd say the relationship has changed rather than weakened. Younger people might not follow every piece of advice automatically the way past generations did, but there's still a lot of respect, especially for practical skills or life experience. If anything, social media has made it easier to stay close to relatives, even when everyone's busy.",
      },
      {
        q: 'What qualities make someone a good role model?',
        a: "Consistency, mainly. Anyone can be inspiring for a single moment, but a real role model behaves the same way whether people are watching or not. Honesty and patience matter too, I think, because those are the qualities you actually absorb over time just from being around someone, rather than from anything they explicitly teach you. It's less about grand gestures and more about small, repeated behaviour that people gradually start to copy without even noticing.",
      },
    ],
  },
  {
    id: 'person-friend',
    family: 'person',
    title: 'A close friend',
    card: {
      topic: 'Describe a friend who is important to you.',
      points: ['how you met this friend', 'how long you have known each other', 'what you usually do together'],
      explain: 'and explain why this friendship is important to you',
    },
    notes: [
      'Dana, met in first year of university',
      'same dorm corridor, 2019',
      'study together, long walks',
      'always honest, calls me out',
      'helped during a hard exam period',
      'important: reliability',
    ],
    model: [
      "I'd like to talk about my friend Dana, who I actually met during my very first week at university. We ended up living on the same corridor in the dormitory, and I remember we started talking simply because neither of us knew how to work the washing machine.",
      "We've known each other for about five years now, and in terms of what we usually do together, it's mostly quite ordinary things, studying in the library, walking around the city when we need a break, or just sitting somewhere and complaining about deadlines. What makes the friendship work, I think, is that we're honest with each other in a way that isn't always comfortable but is always useful. She's the kind of person who'll tell you your essay plan doesn't make sense instead of just saying it's fine.",
      "There was one exam period, in my second year, when I was completely overwhelmed, and she basically restructured my entire revision schedule for me and checked in every single day. Looking back, that's really why this friendship matters so much to me. It's not built on having fun together, although we do, it's built on the fact that she shows up when it actually counts, and I try to do the same for her.",
    ],
    upgrades: [
      { phrase: 'simply because neither of us knew', note: 'a concrete, slightly funny reason beats a generic "we got along well"' },
      { phrase: "isn't always comfortable but is always useful", note: 'a but contrast shows a more balanced, mature view of the friendship' },
      { phrase: 'the kind of person who', note: 'a natural relative-clause pattern for describing someone\'s character' },
      { phrase: 'checked in every single day', note: 'a precise detail is stronger than a vague "she helped me a lot"' },
      { phrase: 'shows up when it actually counts', note: 'an idiomatic phrase that sounds like natural spoken English rather than a textbook line' },
    ],
    roundingOff: [
      { q: 'Do you still see this friend regularly?', a: 'Yes, we still message most days and meet often.' },
      { q: 'Have you ever had a serious argument?', a: 'A couple, but we always talk it through.' },
    ],
    part3: [
      {
        q: "Do you think it's important to have close friends, or is family enough?",
        a: "I'd say both matter, but for different reasons. Family gives you unconditional support, whereas friends are people you actively choose, which means the relationship often reflects who you are at a particular stage of life. Close friends can also understand things, like career pressure or a shared sense of humour, that family members sometimes can't relate to as easily. Ideally, I think, the two work together rather than one replacing the other.",
      },
      {
        q: 'How has technology changed the way people maintain friendships?',
        a: "Enormously, I think. Messaging apps mean you can stay in daily contact with someone even if you live in different cities, which simply wasn't possible before. That said, I do worry it makes friendships feel less effortful; sending a quick message is easy, but it doesn't always replace properly spending time with someone in person. I try to balance the two deliberately, keeping messaging for small updates and saving in-person time for anything that actually matters.",
      },
      {
        q: 'Do you think it is harder to make friends as an adult than as a child?',
        a: "Definitely harder, in my experience. As a child you're placed in the same environment as your peers every day, school, the playground, whereas adults have to make a real effort to create those opportunities. There's also less patience for it; children form friendships quickly, but adults tend to be more guarded until trust is built. I've noticed this myself since starting university, where forming close friendships has taken noticeably longer than it did at school.",
      },
    ],
  },
  {
    id: 'person-teacher',
    family: 'person',
    title: 'An influential teacher',
    card: {
      topic: 'Describe a teacher who has influenced you.',
      points: ['who this teacher was', 'what subject they taught', 'what this teacher was like'],
      explain: 'and explain how they influenced you',
    },
    notes: [
      'Mr Bekov, secondary school',
      'taught English literature',
      'strict but funny, high standards',
      'pushed me to enter a speaking contest',
      'influence: confidence speaking English',
      'still use his advice today',
    ],
    model: [
      "The teacher I'd like to describe is a man called Mr Bekov, who taught me English literature for the last two years of secondary school. He was, without exaggeration, the strictest teacher in the entire building, but also somehow the funniest.",
      "In terms of what he was like, he had this habit of refusing to accept a lazy answer. If you said a poem was 'sad', he'd stop the whole class and ask you to explain exactly why, using the actual language of the text. At the time it was quite intimidating, to be honest, but it forced everyone to think properly instead of just repeating vague opinions. He also had a dry sense of humour that somehow made even grammar lessons bearable.",
      "What really influenced me, though, was that he pushed me to enter a school speaking competition I was convinced I'd embarrass myself in. He spent weeks going over my pronunciation and argument structure with me after class, for no extra pay, purely because he thought I could do it. I didn't win, as it happens, but I came away with a level of confidence in speaking English that I simply hadn't had before. Honestly, I probably wouldn't be taking this exam so calmly if it weren't for the habits he built in me back then.",
    ],
    upgrades: [
      { phrase: 'without exaggeration', note: 'a short intensifying phrase for emphasis without overstating' },
      { phrase: 'forced everyone to think properly instead of just repeating vague opinions', note: 'a precise contrast structure that shows analytical vocabulary' },
      { phrase: 'for no extra pay, purely because he thought I could do it', note: 'a reason clause that shows real motivation, not just a fact' },
      { phrase: "I probably wouldn't be taking this exam so calmly if it weren't for", note: 'a mixed conditional linking the past to the present, strong grammatical range' },
      { phrase: 'somehow made even grammar lessons bearable', note: 'a natural understatement with a touch of humour' },
    ],
    roundingOff: [
      { q: 'Are you still in touch with this teacher?', a: 'Occasionally, mostly around results season.' },
      { q: 'Did he teach you anything outside English?', a: 'Indirectly, mostly about discipline and effort.' },
    ],
    part3: [
      {
        q: 'Do you think teachers have as much influence on students today as they used to?',
        a: "I'd say their influence has changed shape rather than disappeared. Students now have countless other sources of information, so a teacher isn't the sole authority the way they might once have been. But for things like confidence, discipline and genuine mentorship, I don't think anything online really replaces a good teacher who actually knows a student personally. That personal knowledge is really what allows a teacher to push a specific student at exactly the right moment.",
      },
      {
        q: 'What qualities make someone a good teacher?',
        a: "High expectations combined with genuine patience, I think, which sounds contradictory but really isn't. A good teacher pushes students to do better rather than accepting an easy answer, but they also take the time to explain why, rather than just criticising. Without that patience, high standards alone can just feel discouraging rather than motivating. A sense of humour helps too, honestly, since it makes long lessons far easier for students to actually sit through.",
      },
      {
        q: 'Do you think teaching is a respected profession in your country?',
        a: "Reasonably respected socially, yes, though I don't think that respect is always reflected in salary or working conditions, which can be quite demanding. I think there's a slight mismatch there; people genuinely value good teachers when they encounter one, but the profession as a whole isn't always supported in a way that matches that appreciation. I'd like to see that appreciation reflected more concretely in how teachers are actually paid and supported.",
      },
    ],
  },
  {
    id: 'place-relax',
    family: 'place',
    title: 'A quiet place to relax',
    card: {
      topic: 'Describe a quiet place you like to go to relax.',
      points: ['where this place is', 'how you found out about it', 'how often you go there'],
      explain: 'and explain why you find it relaxing',
    },
    notes: [
      'small park behind the old observatory',
      'found by accident, walking home',
      'go maybe twice a month',
      'almost empty, big pine trees',
      'bring a book, no phone',
      'why: silence and the view of the mountains',
    ],
    model: [
      "I'd like to talk about a small park just behind the old observatory near where I live. It's not somewhere most people know about, which is exactly what makes it special to me.",
      "I actually found it completely by accident a couple of years ago, when I took a wrong turn on the way home and ended up walking through it instead of around it. As far as how often I go, it's probably twice a month, usually on a Sunday afternoon when I need to switch my brain off for an hour or two. There are a few benches under some enormous pine trees, and because it's slightly out of the way, it's almost always empty, even in summer.",
      "What I usually do there is bring a book and leave my phone in my bag, which sounds small, but it makes a real difference. In terms of why I find it relaxing, I think it's mainly the combination of silence and the view, you can see the mountains from one corner of the park, and there's something about that scale that puts my own worries into perspective. Looking back, I probably wouldn't have discovered how much I needed a place like that if I hadn't got lost that one afternoon.",
    ],
    upgrades: [
      { phrase: 'which is exactly what makes it special', note: 'a natural way to justify a claim without repeating it flatly' },
      { phrase: 'puts my own worries into perspective', note: 'an idiomatic phrase for describing an emotional effect' },
      { phrase: 'slightly out of the way', note: 'softer and more natural than "far" or "hidden"' },
      { phrase: 'sounds small, but it makes a real difference', note: 'a concession structure that adds nuance to a simple habit' },
      { phrase: 'when I took a wrong turn... and ended up walking', note: 'mixing past simple with ended up + gerund shows tense range' },
    ],
    roundingOff: [
      { q: 'Do you ever take anyone there with you?', a: "Rarely, it's really my time alone." },
      { q: 'Is it far from your home?', a: 'No, about a ten-minute walk.' },
    ],
    part3: [
      {
        q: 'Why do you think people need quiet places in modern life?',
        a: "Mainly because so much of daily life is deliberately noisy and demanding, notifications, traffic, constant conversation. A quiet space gives your mind a chance to actually process things instead of just reacting to the next thing. I'd also say it's become rarer, which almost makes it more valuable; a hundred years ago silence wasn't something you had to search for.",
      },
      {
        q: 'Are public parks well maintained in your country?',
        a: "It varies a lot, honestly. The larger, more central parks tend to be well looked after because they get more visitors and more funding, but smaller neighbourhood ones are sometimes neglected. I think local authorities could do more to maintain the smaller green spaces, since those are often the ones people actually use day to day. A bit more consistent funding across neighbourhoods would probably make a noticeable difference fairly quickly.",
      },
      {
        q: 'Do you think cities are becoming too noisy to live in?',
        a: "In some ways, yes. Traffic and construction seem to be constant in most cities I know, and it's easy to underestimate how tiring that background noise is until you leave it for a while. That said, I don't think the solution is avoiding cities altogether, more that planners should protect quiet green spaces within them. Even a handful of well-placed quiet areas can make a surprisingly large difference to how a city actually feels.",
      },
    ],
  },
  {
    id: 'place-city-visit',
    family: 'place',
    title: 'A city you want to visit',
    card: {
      topic: 'Describe a city you would like to visit in the future.',
      points: ['which city this is', 'how you first heard about it', 'what you would like to do there'],
      explain: 'and explain why you would like to visit this particular city',
    },
    notes: [
      'Kyoto, Japan',
      "saw photos from a friend's trip",
      'temples, old wooden streets',
      'want to try local food, a tea ceremony',
      'calm pace vs busy Tokyo',
      'why: mix of history and design',
    ],
    model: [
      "The city I'd like to talk about is Kyoto, in Japan. I first properly heard about it a couple of years ago, when a friend of mine went travelling around Asia and kept sending me photographs of wooden streets and temples that honestly didn't look real.",
      "In terms of what I'd like to do there, I'd want to spend most of my time just walking, to be honest, through the older districts with the traditional houses, rather than rushing between famous landmarks. I've read that you can join a proper tea ceremony there, which is something I'd love to experience rather than just read about. Trying the local food is high on the list too, particularly anything involving matcha, since that's something I've only ever had a poor imitation of back home.",
      "What draws me to Kyoto specifically, rather than somewhere like Tokyo, is the pace. From what I understand, it's a lot calmer and more historic, whereas Tokyo seems to be all about speed and modern design. I suppose what appeals to me is that combination of centuries-old architecture existing right alongside everyday modern life. If I'm honest, it's been on my list for years now, and I'm hoping to finally go once I've finished my studies.",
    ],
    upgrades: [
      { phrase: "didn't look real", note: 'a natural exaggeration that sounds spoken, not written' },
      { phrase: 'rather than rushing... rather than somewhere like Tokyo', note: 'repeating a rather than structure shows controlled comparison across the talk' },
      { phrase: 'from what I understand', note: 'a natural hedge for speculating about a place you have not visited yet' },
      { phrase: 'high on the list', note: 'an informal idiom for priority' },
      { phrase: "it's been on my list for years now", note: 'a natural closing line that avoids a flat "in conclusion"' },
    ],
    roundingOff: [
      { q: 'Do you think you will go there soon?', a: 'Hopefully within the next couple of years.' },
      { q: 'Would you travel there alone or with someone?', a: "I'd prefer to go with a friend." },
    ],
    part3: [
      {
        q: "Why do people want to travel to places they've only seen in photos or videos?",
        a: "I think images create a kind of curiosity that's hard to satisfy any other way. A photo gives you an idea of a place, but it can't show you the atmosphere, the sounds, or how it actually feels to be there, so people travel to close that gap. Social media has probably made this stronger too, since we're exposed to far more places now than previous generations ever were.",
      },
      {
        q: 'Do you think tourism changes a city for better or worse?',
        a: "Honestly, it can go either way. Tourism brings income and can help preserve historic areas that might otherwise be neglected, which is a clear benefit. On the other hand, when a place becomes too popular, prices rise for local residents and the original character can start to disappear under souvenir shops. I'd say the key is managing numbers rather than avoiding tourism altogether.",
      },
      {
        q: 'Is it better to plan a trip carefully or travel spontaneously?',
        a: "I lean towards a mix of both, actually. Some planning is useful so you don't waste time or miss something important, but leaving gaps in the schedule allows for the kind of unexpected discovery that guided plans rarely offer. I think it depends on the traveller too; some people find spontaneity stressful rather than exciting. Personally, I like having the basics arranged in advance, accommodation and transport, while leaving each day fairly open.",
      },
    ],
  },
  {
    id: 'place-interesting-building',
    family: 'place',
    title: 'An interesting building',
    card: {
      topic: 'Describe an interesting building you have visited.',
      points: ['what the building is', 'where it is located', 'what you did there'],
      explain: 'and explain why you found the building interesting',
    },
    notes: [
      'Central State Museum, Almaty',
      'visited on a school trip, later again alone',
      'huge domed roof, old exhibits',
      'wandered the history section for hours',
      'why: scale plus an unexpected detail, a yurt model',
      'want to take my own children someday',
    ],
    model: [
      "I'd like to describe the Central State Museum here in Almaty, which I first visited on a school trip when I was maybe eleven, and then again by myself a few years later, out of curiosity more than anything.",
      "It's located fairly close to the centre of the city, and structurally it's quite striking, it has this huge domed roof that you can see from a distance, and the inside feels almost like a smaller version of a national gallery. On my second visit, I basically wandered through the history section for a couple of hours, reading every single description board, which I definitely didn't have the patience for as a child.",
      "What made it genuinely interesting to me, rather than just educational, was a full-scale model of a traditional yurt inside one of the halls, complete with the original textiles and tools laid out exactly as they would have been used. I hadn't expected something that detailed inside a formal museum building, and it gave me a much clearer sense of everyday life generations ago than any textbook had managed. All in all, it's the kind of place I think I appreciated far more as an adult, and I'd genuinely like to take my own children there one day, once they're old enough to sit still for longer than ten minutes.",
    ],
    upgrades: [
      { phrase: 'out of curiosity more than anything', note: 'a natural reason clause that avoids a flat "because I wanted to"' },
      { phrase: "structurally it's quite striking", note: 'a precise adjective for architecture rather than a generic "big" or "nice"' },
      { phrase: 'rather than just educational', note: 'a comparative phrase that adds nuance to a simple opinion' },
      { phrase: 'gave me a much clearer sense of', note: 'a natural way to state an abstract effect' },
      { phrase: 'once they\'re old enough to sit still for longer than ten minutes', note: 'a light, humorous closing detail that keeps the ending natural' },
    ],
    roundingOff: [
      { q: 'Do you visit museums often?', a: 'Not that often, maybe once or twice a year.' },
      { q: 'Would you recommend it to a visitor?', a: "Definitely, it's one of the better ones in the city." },
    ],
    part3: [
      {
        q: 'Why do you think some people are not interested in visiting museums?',
        a: "I think it often comes down to how museums are presented rather than a lack of interest in the subject itself. If information is displayed as long blocks of text, it can feel more like studying than exploring, which puts casual visitors off. Museums that use interactive displays or storytelling tend to attract a much wider audience, including people who wouldn't normally go.",
      },
      {
        q: 'Should governments spend money preserving old buildings?',
        a: "I'd say yes, within reason. Historic buildings connect a country to its own identity in a way that's difficult to replace once they're gone, so some public investment seems justified. That said, spending needs to be balanced against more urgent needs like housing or healthcare, so I don't think preservation should always come first. I'd say it should be treated as a long-term priority rather than something addressed only when convenient.",
      },
      {
        q: 'How do you think modern architecture differs from older architecture?',
        a: "Modern buildings tend to prioritise function and efficiency, glass, steel, open floor plans, whereas older architecture often invested heavily in decoration and symbolism, even where it wasn't strictly necessary. I think that's partly about cost and speed of construction today, but it does mean a lot of modern buildings feel less distinctive than older ones. That said, some contemporary buildings do try to reintroduce character through unusual shapes or materials.",
      },
    ],
  },
  {
    id: 'object-technology',
    family: 'object',
    title: 'A useful piece of technology',
    card: {
      topic: 'Describe a piece of technology you find useful.',
      points: ['what it is', 'how long you have had it', 'how you use it'],
      explain: 'and explain why you find it useful',
    },
    notes: [
      'noise-cancelling headphones',
      'had them about two years',
      'use for studying, commuting, calls',
      'block out neighbours, focus better',
      'a gift from parents before exams',
      'why: concentration and sleep on trips',
    ],
    model: [
      "The piece of technology I'd like to talk about is a pair of noise-cancelling headphones, which my parents actually gave me as a gift a couple of years ago, right before a particularly stressful set of exams.",
      "I use them pretty much every day, if I'm honest. Mainly for studying, since I share a flat and it's not always quiet, but also during my commute and for online calls when the background noise would otherwise be distracting. What I like about them is that you can adjust exactly how much outside sound gets through, so I'm not completely cut off if someone actually needs to talk to me.",
      "In terms of why I find them so useful, it really comes down to concentration. Before I had them, I'd get distracted constantly, a door closing, someone's music through the wall, and I'd lose my train of thought completely. Now I can more or less create my own quiet space wherever I am, which has made a noticeable difference to how much I get done. They've also been genuinely useful on long journeys, since I can actually sleep on a bus or a plane without every sound waking me up. Looking back, it's a fairly small object, but it's probably had more impact on my daily routine than almost anything else I own.",
    ],
    upgrades: [
      { phrase: 'right before a particularly stressful set of exams', note: 'a specific timing detail adds credibility to the story' },
      { phrase: "not completely cut off", note: 'a natural way to add a limitation to a claim, showing nuance' },
      { phrase: 'lose my train of thought', note: 'an idiomatic phrase for describing distraction' },
      { phrase: 'create my own quiet space', note: 'figurative language that sounds natural rather than literal' },
      { phrase: 'a fairly small object, but it has had more impact than almost anything else I own', note: 'a but contrast for a strong, memorable ending' },
    ],
    roundingOff: [
      { q: 'Would you recommend them to a friend?', a: 'Yes, especially anyone who studies in a noisy flat.' },
      { q: 'Do you use them every day?', a: 'Almost every day, yes.' },
    ],
    part3: [
      {
        q: 'How has technology changed the way students study?',
        a: "Enormously. Students now have access to endless resources, videos, forums, translation tools, that simply didn't exist for earlier generations, which makes independent study far more possible. At the same time, I think it's created a new problem: it's easier than ever to get distracted by the same device you're supposed to be studying on, so students need more self-discipline than before, not less.",
      },
      {
        q: 'Do you think people rely too much on technology nowadays?',
        a: "In some areas, definitely. Simple things like remembering phone numbers or navigating without a map have almost disappeared as skills, since a device does it for us instantly. I wouldn't say that's entirely negative, it frees up mental energy for other things, but there's a risk of losing basic abilities that used to be second nature. I'd say a bit of intentional practice without a device now and then probably isn't a bad idea.",
      },
      {
        q: 'What impact might future technology have on jobs?',
        a: "I imagine a lot of repetitive tasks will be automated further, which will probably eliminate certain roles but also create new ones we can't fully predict yet, much like previous waves of technology have done. I think the bigger challenge will be making sure workers are retrained quickly enough, rather than technology itself being the problem. Governments and companies will probably need to invest a lot more in retraining programmes than they currently do.",
      },
    ],
  },
  {
    id: 'object-gift',
    family: 'object',
    title: 'A gift you liked',
    card: {
      topic: 'Describe a gift you received that you liked.',
      points: ['what the gift was', 'who gave it to you', 'when you received it'],
      explain: 'and explain why you liked this gift',
    },
    notes: [
      "old pocket watch, grandfather's",
      'given by grandmother after he passed away',
      'received at my eighteenth birthday',
      'not expensive, but meaningful',
      'keep in a drawer, look at it sometimes',
      'why: connection to him, the story behind it',
    ],
    model: [
      "I'd like to talk about an old pocket watch that belonged to my grandfather, which my grandmother gave me on my eighteenth birthday, a couple of years after he'd passed away.",
      "It's not a particularly valuable object in financial terms; the metal casing is slightly worn, and it doesn't even keep perfect time anymore. My grandmother gave it to me quite unexpectedly, actually, during a fairly ordinary family dinner. She just placed it in front of me and said he would have wanted me to have it, since I was named after him in a sense, sharing his middle name.",
      "What made the gift so meaningful wasn't really the object itself, but the story attached to it. Apparently he carried it through some genuinely difficult years, and my grandmother told me a couple of stories that evening I'd honestly never heard before. I don't wear it or use it day to day, it mostly stays in a drawer in my room, but I take it out every so often, especially around his birthday, and just hold it for a minute or two. Looking back, I think it taught me that the best gifts aren't necessarily the most expensive ones; they're the ones that carry a piece of someone else's history along with them.",
    ],
    upgrades: [
      { phrase: 'not a particularly valuable object in financial terms', note: 'a precise qualifier that sets up the contrast with emotional value' },
      { phrase: 'quite unexpectedly, actually', note: 'a natural filler plus adverb combination for spoken emphasis' },
      { phrase: 'he would have wanted me to have it', note: 'a would have + past participle structure showing grammatical range' },
      { phrase: "carry a piece of someone else's history", note: 'a figurative closing phrase that lifts the ending' },
      { phrase: 'every so often', note: 'a natural frequency expression, more spoken than "occasionally"' },
    ],
    roundingOff: [
      { q: 'Do you still have this gift?', a: "Yes, it's kept safely in my room." },
      { q: 'Do you often give sentimental gifts yourself?', a: 'Sometimes, when I can think of something meaningful.' },
    ],
    part3: [
      {
        q: 'Do you think people value sentimental gifts more than expensive ones?',
        a: "I think it depends on the person and the relationship, but generally, yes, sentimental value tends to last longer than the excitement of an expensive item. A gift that shows someone understood you, or that connects you to a memory, tends to be kept and appreciated for years, whereas an expensive gift can be forgotten fairly quickly once the novelty wears off.",
      },
      {
        q: 'Is gift-giving an important tradition in your culture?',
        a: "Very much so. Gifts are exchanged at almost every major occasion, birthdays, weddings, even simple visits to someone's home, and there's a strong expectation that a guest shouldn't arrive empty-handed. I think it functions less as an obligation and more as a way of showing respect and maintaining relationships between families. Even a small, thoughtful gift is generally seen as more meaningful than an expensive one chosen carelessly.",
      },
      {
        q: 'Do you think online shopping has changed how people choose gifts?',
        a: "Definitely. It's made gift-giving faster and more convenient, you can compare options and have something delivered within days, but I do think it's reduced the effort involved in choosing something. Browsing a physical shop for the right item used to take real thought, whereas now it's easy to select something quickly without considering it as carefully. I try to resist that a little myself, since the extra thought usually shows in the end result.",
      },
    ],
  },
  {
    id: 'object-clothing',
    family: 'object',
    title: 'A favourite item of clothing',
    card: {
      topic: 'Describe an item of clothing you like to wear.',
      points: ['what the item is', 'where you got it', 'when you usually wear it'],
      explain: 'and explain why you like it',
    },
    notes: [
      'old denim jacket',
      'bought secondhand at a market',
      'wear it most of autumn',
      'fits oddly but comfortable',
      'got compliments, feels like "me"',
      'why: comfort plus individuality',
    ],
    model: [
      "The item of clothing I'd like to describe is a denim jacket I bought secondhand from a small market stall a couple of years ago. It's nothing special to look at, honestly, slightly faded and a bit too big in the shoulders, but it's become one of my favourite things to wear.",
      "I picked it up almost by accident; I wasn't actually looking for a jacket that day, but the stallholder was closing up and gave me a good price, so I tried it on and just liked how it felt. I tend to wear it throughout autumn, mostly, over a jumper when it's not quite cold enough for a proper coat yet.",
      "In terms of why I like it so much, I think it's partly comfort, it's been washed so many times that the fabric feels almost soft rather than stiff, unlike a lot of new denim. But it's also because it doesn't look like anything else I own; a few people have actually stopped me to ask where I got it, which never happens with clothes I buy new. It sounds a bit silly, but wearing it genuinely makes me feel more like myself than most of my wardrobe does, maybe because it wasn't chosen to match a trend, it was chosen because it just felt right at the time.",
    ],
    upgrades: [
      { phrase: 'nothing special to look at, honestly', note: 'a natural understatement before a positive turn later in the talk' },
      { phrase: 'almost by accident', note: 'a natural phrase for describing an unplanned purchase' },
      { phrase: 'unlike a lot of new denim', note: 'a comparative clause that adds specific, concrete detail' },
      { phrase: 'it sounds a bit silly, but', note: 'a hedge that softens a personal, emotional claim' },
      { phrase: 'chosen because it just felt right', note: 'a natural closing line that avoids a flat "in conclusion"' },
    ],
    roundingOff: [
      { q: 'Do you still wear it often?', a: 'Yes, all through autumn most years.' },
      { q: 'Do you prefer buying new or secondhand clothes?', a: 'Secondhand, generally, for the character it has.' },
    ],
    part3: [
      {
        q: 'Why do you think secondhand clothing has become more popular recently?',
        a: "I'd say it's a mix of cost and awareness about the environment. Secondhand items are usually cheaper than buying new, which matters a lot to younger people especially, but there's also growing concern about how much waste the fashion industry produces. Buying secondhand feels like a small, practical way of reducing that impact without giving up on personal style. Social media has probably helped too, since secondhand finds are now shared and celebrated rather than hidden.",
      },
      {
        q: "Do you think clothing says something about a person's personality?",
        a: "To some extent, yes, though I wouldn't say it's a reliable indicator. What someone wears can reflect their mood, their budget, or simply what's practical for their day, rather than a deep statement about who they are. That said, people do often use clothing deliberately to express identity, so it's not entirely meaningless either. I'd say it reveals fragments of personality rather than the full picture, if that makes sense.",
      },
      {
        q: 'How has fashion changed in your country over the past few decades?',
        a: "It's become far more international, I think. Global brands and online shopping mean that trends spread almost instantly now, whereas in the past, fashion was probably more shaped by what was locally available. I'd say traditional clothing is still worn for specific occasions, but everyday fashion looks a lot more similar to what you'd see elsewhere in the world. Older generations sometimes find that a little disappointing, actually, since regional style used to be far more distinctive.",
      },
    ],
  },
  {
    id: 'event-celebration',
    family: 'event',
    title: 'A festival you enjoyed',
    card: {
      topic: 'Describe a celebration or festival you enjoyed attending.',
      points: ['what the celebration was', 'where and when it took place', 'what happened during it'],
      explain: 'and explain why you enjoyed it',
    },
    notes: [
      'Nauryz celebration, city square',
      'spring, a few years ago',
      'traditional food, music, games',
      'huge shared table, met strangers',
      'why: sense of community, colour',
    ],
    model: [
      "I'd like to talk about a Nauryz celebration I attended in the main square of my city a few years ago, in March, when spring properly starts here.",
      "The whole square had been transformed for the occasion. There were traditional yurts set up, musicians playing throughout the day, and a genuinely enormous shared table stretching almost the length of the street, with different families contributing dishes to it. What happened, essentially, was that people just kept arriving, eating, talking, and joining in with various games and competitions, some involving horses, which I'd never actually seen up close before.",
      "What I enjoyed most about it wasn't any single event, but the atmosphere as a whole. I ended up sitting next to a family I'd never met before, and within about ten minutes we were sharing food and they were explaining a game I hadn't understood. That sense of community really struck me, everyone seemed to belong there equally, regardless of who they'd come with. Looking back, I think what makes it memorable is that it wasn't about watching a performance from a distance; it was something you were actively part of from the moment you arrived. I try to go most years now if I'm in the city at the right time.",
    ],
    upgrades: [
      { phrase: 'properly starts here', note: 'a natural, slightly informal phrase for describing seasonal change' },
      { phrase: 'genuinely enormous', note: 'an intensifier that sounds spoken rather than written' },
      { phrase: 'within about ten minutes', note: 'a precise timing detail that adds realism to the story' },
      { phrase: "regardless of who they'd come with", note: 'a past perfect clause after regardless of for grammatical range' },
      { phrase: 'actively part of, rather than watching from a distance', note: 'a contrast structure that makes a strong, memorable closing point' },
    ],
    roundingOff: [
      { q: 'Do you go to this festival every year?', a: "Most years, if I'm in the city." },
      { q: 'Would you take a foreign friend to see it?', a: "Definitely, it's a great introduction to the culture." },
    ],
    part3: [
      {
        q: 'Why do you think traditional festivals remain popular in modern society?',
        a: "I think they offer something modern life often lacks, a shared sense of identity and community that isn't tied to work or technology. Even people who aren't especially traditional in daily life often still value the connection to history and family that a festival provides. There's also a simple appeal to having a fixed date each year that brings people together deliberately.",
      },
      {
        q: 'Do you think festivals should be funded by the government or by private companies?',
        a: "I'd lean towards a mix of both, actually. Government funding helps keep events accessible and free for everyone, regardless of income, which matters for something meant to unite a community. Private sponsorship, on the other hand, can bring extra resources and scale, though it can risk making an event feel more commercial than traditional if it's not managed carefully. A clear set of guidelines around sponsorship would probably help keep the balance right.",
      },
      {
        q: 'How do celebrations differ between generations in your country?',
        a: "Older generations tend to focus more on the traditional and religious elements, whereas younger people often treat the same festivals more socially, as an opportunity to meet friends or take photos for social media. I wouldn't say either approach is wrong, but it does mean the meaning of certain celebrations is gradually shifting rather than staying exactly the same. I don't think that's necessarily a bad thing, just a natural part of how traditions evolve over time.",
      },
    ],
  },
  {
    id: 'event-helped-someone',
    family: 'event',
    title: 'A time you helped someone',
    card: {
      topic: 'Describe a time you helped someone.',
      points: ['who you helped', 'what the situation was', 'what you did'],
      explain: 'and explain how you felt about helping them',
    },
    notes: [
      'neighbour, elderly woman, Ms Orazova',
      'locked out during a snowstorm',
      'let her in, called a locksmith, made tea',
      'waited with her for two hours',
      'felt useful, slightly proud',
      'she still greets me warmly now',
    ],
    model: [
      "I'd like to describe a time I helped my elderly neighbour, a woman named Ms Orazova, who got locked out of her flat during a fairly severe snowstorm a couple of winters ago.",
      "I happened to be coming home at the time and found her standing in the corridor, clearly cold and a bit shaken, since her phone had also run out of battery. What I did was fairly simple, really; I brought her into my flat, made her some tea to warm her up, and used my own phone to call a locksmith, since none of us had a spare key. The locksmith couldn't come for almost two hours, given the weather, so I basically just sat with her the whole time, and we ended up talking about her late husband and her garden, things I'd genuinely never have learned otherwise.",
      "In terms of how I felt about it, I was mainly just glad I happened to be there at the right moment, but I did feel a quiet sense of pride afterwards, knowing I hadn't just walked past. It wasn't a huge gesture in the grand scheme of things, but she still stops to say hello warmly whenever we pass each other now, and that small change in our relationship has stayed with me. It made me realise how little effort it can actually take to make a real difference to someone.",
    ],
    upgrades: [
      { phrase: 'clearly cold and a bit shaken', note: 'a precise descriptive detail rather than a vague "upset"' },
      { phrase: 'given the weather', note: 'a concise reason clause, natural spoken shorthand' },
      { phrase: "things I'd genuinely never have learned otherwise", note: 'a third conditional style structure for grammatical range' },
      { phrase: 'in the grand scheme of things', note: 'a natural idiom for minimising something while still valuing it' },
      { phrase: 'that small change... has stayed with me', note: 'a reflective closing line that avoids a flat conclusion' },
    ],
    roundingOff: [
      { q: 'Do you still see this neighbour?', a: 'Yes, we say hello most days now.' },
      { q: 'Do you think you would do the same again?', a: 'Without question, yes.' },
    ],
    part3: [
      {
        q: 'Do you think people are generally willing to help strangers nowadays?',
        a: "I'd say most people are willing, but hesitant, partly out of caution rather than a lack of kindness. People worry about overstepping or misjudging a situation, especially in cities where interactions with strangers are less common than they used to be. That said, in a genuine emergency, I think most people still step in without much hesitation. I'd like to think most people are simply waiting for a clear enough reason to act.",
      },
      {
        q: 'Should schools teach children about helping others in the community?',
        a: "I think they should, yes, because kindness isn't always something children pick up naturally without some guidance. Community projects or simple volunteering activities can show children the practical impact of helping someone, rather than just hearing about it as an abstract value. It also tends to build habits that carry through into adulthood. Starting early seems to matter quite a lot, from what I understand about how habits actually form.",
      },
      {
        q: 'Do you think helping others makes people happier?',
        a: "Generally, yes, from what I've noticed in my own life and others'. There's a real sense of purpose that comes from doing something for someone else, which is quite different from the satisfaction of achieving something purely for yourself. I'd also say it strengthens relationships, which contributes to long-term happiness far more than most material things do. It's the kind of happiness that tends to last rather than fade quickly, in my experience.",
      },
    ],
  },
  {
    id: 'event-very-happy',
    family: 'event',
    title: 'A time you felt very happy',
    card: {
      topic: 'Describe a time when you felt very happy.',
      points: ['when this was', 'where you were', 'what happened'],
      explain: 'and explain why you felt so happy',
    },
    notes: [
      'results day, university offer',
      'kitchen, early morning, checking email',
      'screamed, woke the whole family up',
      'called my best friend immediately',
      'why: months of work paid off',
      "family's reaction added to it",
    ],
    model: [
      "I'd like to talk about the morning I received my university offer letter, which arrived a lot earlier than I expected, while I was actually standing in the kitchen making breakfast before school.",
      "I'd been checking my email obsessively for about a week by that point, so when the notification finally came through, I nearly dropped the plate I was holding. I remember reading the first line twice just to make sure I hadn't misunderstood it, and then I genuinely screamed, loudly enough that I woke up my parents, who came running in thinking something was wrong. Once they realised what had actually happened, my mother started crying, and my father, who isn't usually very expressive, just kept repeating that he was proud of me, which honestly meant more than the offer itself in that moment.",
      "The first thing I did afterwards was call my closest friend, who'd been going through the same application process, and we ended up talking for almost an hour, half laughing, half still in disbelief. In terms of why I felt so happy, I think it was really about relief as much as excitement, months of studying and uncertainty suddenly resolving into one definite, positive outcome. It's still one of the clearest memories I have, mainly because of how unexpectedly ordinary the morning had started before everything changed.",
    ],
    upgrades: [
      { phrase: 'nearly dropped the plate I was holding', note: 'a physical detail that shows emotion without naming it directly' },
      { phrase: 'loudly enough that I woke up my parents', note: 'a so...that result clause for grammatical range' },
      { phrase: 'which honestly meant more than the offer itself', note: 'a reflective aside that deepens the emotional detail' },
      { phrase: 'half laughing, half still in disbelief', note: 'a parallel structure for describing a mixed emotion' },
      { phrase: 'unexpectedly ordinary the morning had started', note: 'a past perfect clause for contrast between before and after' },
    ],
    roundingOff: [
      { q: 'Do you remember the exact date?', a: 'Roughly, yes, it was early spring.' },
      { q: 'Did you celebrate that day?', a: 'We went out for dinner as a family that evening.' },
    ],
    part3: [
      {
        q: 'Do you think happiness usually comes from big events or small everyday moments?',
        a: "I'd say small everyday moments contribute more overall, simply because big events like that happen rarely, whereas ordinary happiness, a good conversation, a nice meal, needs to sustain you most of the time. That said, big moments tend to be more memorable, so people often overestimate how much they contribute to overall happiness compared with daily life. I try to remind myself of that whenever I catch myself waiting for the next big thing.",
      },
      {
        q: 'Is it healthy to share good news on social media?',
        a: "It can be, in moderation. Sharing achievements allows friends and family who aren't physically nearby to celebrate with you, which is genuinely nice. The concern, I think, is when sharing becomes more about seeking validation than actually expressing joy, in which case it can end up affecting someone's happiness rather than reflecting it. I try to share things because I genuinely want to, rather than checking how people respond afterwards.",
      },
      {
        q: 'Do you think success is more about hard work or luck?',
        a: "Honestly, I think it's usually a combination, though the balance depends on the situation. Hard work creates the conditions for an opportunity, but luck, timing, circumstances beyond your control, often determines whether that opportunity actually appears. I'd say hard work matters more in the long run, since it tends to produce more consistent results over time. Luck might explain a single lucky break, but it rarely explains a whole career.",
      },
    ],
  },
  {
    id: 'event-difficult-decision',
    family: 'event',
    title: 'A difficult decision',
    card: {
      topic: 'Describe a difficult decision you made.',
      points: ['what the decision was', 'when you made it', 'what the alternatives were'],
      explain: 'and explain why the decision was difficult',
    },
    notes: [
      'choosing a university subject',
      'had to decide by the application deadline',
      'alternatives: languages vs business',
      'both parents had opinions',
      'difficult: unsure, pressure, permanence',
      'eventually chose based on my own interest',
    ],
    model: [
      "The decision I'd like to talk about is choosing which subject to study at university, which I had to finalise around eighteen months ago, right before the application deadline.",
      "The main alternatives I was weighing up were foreign languages, which I'd always genuinely enjoyed, and business studies, which felt more practical in terms of future job prospects. My parents, understandably, had fairly strong opinions of their own, my father leaned towards business, while my mother thought I should follow whatever I actually cared about. So on top of the usual uncertainty, I had to somehow factor in everyone else's expectations as well.",
      "What made the decision so difficult was partly that it felt so permanent, or at least it did at the time, and partly that I genuinely couldn't predict which option I'd regret less in five years. I spent weeks going back and forth, making lists of pros and cons that never seemed to settle the matter either way. In the end, I chose languages, mainly because I realised I was more excited imagining myself studying it than I was imagining the salary from the other option. Looking back, I still don't know for certain it was the objectively correct choice, but it was the honest one, and that's ultimately what settled it for me.",
    ],
    upgrades: [
      { phrase: 'understandably', note: 'a one-word adverb that adds nuance without needing a full clause' },
      { phrase: 'on top of the usual uncertainty', note: 'a natural way to layer complexity into an answer' },
      { phrase: 'going back and forth', note: 'an idiomatic phrase for indecision' },
      { phrase: 'more excited imagining myself... than I was imagining...', note: 'a comparative structure with parallel gerunds' },
      { phrase: "the honest one, and that's ultimately what settled it", note: 'a reflective, slightly philosophical closing line' },
    ],
    roundingOff: [
      { q: 'Do you regret the decision at all?', a: "Not really, no, I'm happy with it so far." },
      { q: 'Did your parents accept your choice?', a: 'Eventually, yes, once they saw I was serious.' },
    ],
    part3: [
      {
        q: 'Do you think it is better to make decisions quickly or take time to think them through?',
        a: "It depends heavily on the type of decision, I think. For small, low-stakes choices, overthinking can actually waste time and energy for no real benefit. But for something significant, like a career path, taking time usually leads to a more considered outcome, even if it feels uncomfortable in the moment. I'd rather regret time spent thinking than regret rushing something important.",
      },
      {
        q: "Should parents be involved in their children's major life decisions?",
        a: "To some degree, yes, since parents often have experience and perspective a young person simply doesn't have yet. However, I think involvement should mean offering advice rather than making the decision for someone, otherwise the child never really learns to trust their own judgement. It's a balance that probably needs to shift as someone gets older. By the time someone reaches university age, I think the decision should really rest with them.",
      },
      {
        q: 'Do you think people generally make better decisions when they are under pressure or when they are relaxed?',
        a: "Generally when relaxed, I'd say, since pressure tends to narrow your thinking towards the most obvious or safest option rather than the best one. That said, a small amount of pressure, a deadline, for instance, can also stop people overanalysing indefinitely, so I think a moderate amount actually helps more than either extreme. Complete calm can sometimes lead to procrastination rather than genuinely better thinking.",
      },
    ],
  },
  {
    id: 'activity-hobby',
    family: 'activity',
    title: 'A hobby you enjoy',
    card: {
      topic: 'Describe a hobby you enjoy in your free time.',
      points: ['what the hobby is', 'how you started doing it', 'how much time you spend on it'],
      explain: 'and explain why you enjoy it',
    },
    notes: [
      'baking bread, sourdough specifically',
      'started during a quiet period, bored',
      'watched videos, failed a lot at first',
      'bake once or twice a week now',
      'why: the process is calming, sharing with others',
      'like the smell filling the flat',
    ],
    model: [
      "The hobby I'd like to talk about is baking, sourdough bread in particular, which I actually got into a couple of years ago during quite a quiet, uneventful period when I had a lot of extra time on my hands.",
      "I started completely from scratch, watching videos online and following recipes step by step, and my first few attempts were genuinely disastrous, dense, undercooked, barely edible. I nearly gave up a couple of times, if I'm honest, but something about the process kept pulling me back. These days I bake maybe once or twice a week, usually at the weekend, since the whole process, from mixing the dough to the final bake, takes the better part of a day.",
      "In terms of why I enjoy it, I think it's mainly the process itself rather than the result, though obviously eating fresh bread is a nice bonus. There's something quite calming about kneading dough by hand, it forces you to slow down completely, which is rare in an otherwise fairly hectic week. I also like that the whole flat ends up smelling incredible by the evening, and that I usually end up sharing a loaf with a neighbour or a friend, which has genuinely become a small way of staying connected with people around me.",
    ],
    upgrades: [
      { phrase: 'completely from scratch', note: 'an idiomatic phrase that plays naturally on the bread theme and the idea of starting point' },
      { phrase: 'dense, undercooked, barely edible', note: 'a tricolon of adjectives for vivid, natural spoken description' },
      { phrase: 'something about the process kept pulling me back', note: 'figurative language for describing motivation' },
      { phrase: 'the better part of a day', note: 'a natural time expression instead of a plain number' },
      { phrase: 'a small way of staying connected with people around me', note: 'a reflective closing that links the hobby to relationships' },
    ],
    roundingOff: [
      { q: 'Do you bake for other people too?', a: 'Yes, I usually share a loaf with neighbours.' },
      { q: 'Would you ever turn this into a business?', a: "Maybe eventually, though it's mainly for relaxation now." },
    ],
    part3: [
      {
        q: "Why do you think hobbies are important for people's wellbeing?",
        a: "I think hobbies give people a sense of achievement that's separate from work or study, which tends to be judged by other people's standards. When you're doing something purely because you enjoy it, there's less pressure attached, which is genuinely restorative. They also often provide a rhythm to free time that stops it feeling wasted or aimless. Without something like that, free time can start to feel oddly unsatisfying rather than restful.",
      },
      {
        q: 'Do you think people have less free time for hobbies than in the past?',
        a: "In some ways, yes, particularly because of how connected everyone is now; even downtime often gets filled with messages or notifications from work. On the other hand, I'd say some traditional time pressures, like long commutes, have reduced for certain people, so it's probably less about total free time and more about how easily it gets interrupted. Protecting a fixed block of time for a hobby seems to matter more now than it used to.",
      },
      {
        q: 'Should hobbies be taught in schools, or are they something people should discover independently?',
        a: "I think schools can usefully expose children to a wide range of activities, since you can't develop an interest in something you've never tried. That said, I don't think a hobby should be compulsory in the way academic subjects are, because part of what makes a hobby enjoyable is that you've chosen it freely rather than been assigned it. Exposure without obligation seems like the right balance to me.",
      },
    ],
  },
  {
    id: 'activity-sport',
    family: 'activity',
    title: 'A sport you follow',
    card: {
      topic: 'Describe a sport you enjoy watching or playing.',
      points: ['what the sport is', 'when you first became interested in it', 'how often you watch or play it'],
      explain: 'and explain why you enjoy this sport',
    },
    notes: [
      'football, mainly watching',
      'became interested around age ten, with my father',
      'watch most weekends during the season',
      'occasionally play with friends, badly',
      "why: unpredictability, shared experience with dad",
      'a stadium atmosphere once, unforgettable',
    ],
    model: [
      "I'd like to talk about football, which I mostly enjoy as a spectator rather than a player, although I do occasionally kick a ball around with friends, badly, it has to be said.",
      "I first became properly interested when I was around ten, mainly because my father used to watch matches every weekend, and I'd sit with him without really understanding the rules at first. Over time I started actually following it properly, and now, during the season, I watch matches most weekends, sometimes alone and sometimes still with my father, which has become a bit of a routine between us.",
      "What I enjoy most about it is probably the unpredictability, you genuinely never know what's going to happen until the final whistle, which keeps every match interesting even when the two teams aren't particularly exciting on paper. I also went to an actual stadium once, a few years ago, and the atmosphere there was completely unlike watching on television, the noise, the shared reaction of thousands of people at once, it's honestly hard to describe unless you've experienced it yourself. Beyond the sport itself, though, I think what I value most is that it's given my father and me something consistent to talk about, regardless of whatever else is going on in our lives.",
    ],
    upgrades: [
      { phrase: 'badly, it has to be said', note: 'a self-deprecating aside that sounds naturally spoken' },
      { phrase: 'without really understanding the rules at first', note: 'an honest admission that adds authenticity to the story' },
      { phrase: 'you genuinely never know... until the final whistle', note: 'an idiomatic sporting phrase used naturally in context' },
      { phrase: 'completely unlike watching on television', note: 'a comparative structure for vivid contrast' },
      { phrase: 'something consistent to talk about', note: 'a reflective closing that links the sport to the relationship' },
    ],
    roundingOff: [
      { q: 'Do you play football yourself?', a: 'Occasionally, just casually with friends.' },
      { q: 'Do you support a particular team?', a: 'Yes, the same one my father supports.' },
    ],
    part3: [
      {
        q: 'Why are team sports so popular around the world?',
        a: "I think it's because they combine skill with genuine unpredictability, no single player controls the outcome, which creates suspense that individual activities don't always have. There's also a strong social element; supporting a team gives people an easy shared identity and something to talk about with strangers, which probably explains why it crosses cultures so easily. It also gives people something to belong to without needing to know each other personally.",
      },
      {
        q: 'Do you think professional athletes are paid too much?',
        a: "In some sports, I'd say yes, the sums involved can seem disconnected from the actual value being created. That said, athletic careers are usually short and physically demanding, and the revenue comes from genuine public demand, ticket sales, broadcasting, so I don't think it's entirely unreasonable either. It's more a reflection of how much people are willing to pay to watch.",
      },
      {
        q: 'Should schools focus more on sport or on academic subjects?',
        a: "I think both matter, honestly, just for different reasons. Academic subjects build knowledge and analytical skills, whereas sport teaches things like teamwork, discipline and handling both winning and losing, which are equally useful in life. I'd be cautious about schools cutting sport to focus purely on academics, since the benefits aren't something you can easily replace elsewhere. A reasonable balance between the two probably serves students better than favouring either one heavily.",
      },
    ],
  },
  {
    id: 'activity-outdoor',
    family: 'activity',
    title: 'An outdoor activity',
    card: {
      topic: 'Describe an outdoor activity you enjoy doing.',
      points: ['what the activity is', 'where you usually do it', 'who you usually do it with'],
      explain: 'and explain why you enjoy this activity',
    },
    notes: [
      'hiking in the mountains near the city',
      'trails about an hour away',
      'go with two university friends',
      'weekend mornings, weather permitting',
      'why: contrast with city life, exercise',
      'conversations feel different outdoors',
    ],
    model: [
      "The outdoor activity I'd like to describe is hiking, which I'm lucky enough to be able to do fairly easily, since there are some good trails only about an hour from where I live in the mountains.",
      "I usually go with two friends from university, and we try to make it a semi-regular thing, weekend mornings when the weather cooperates, which admittedly isn't always the case here. We don't attempt anything too extreme, mostly moderate trails that take three or four hours there and back, with a proper stop somewhere with a view to eat lunch and just sit for a while.",
      "In terms of why I enjoy it, the physical side matters, obviously, it's good exercise and a nice contrast to sitting at a desk all week. But honestly, what keeps me going back is more about the mental shift; there's something about being surrounded by mountains rather than buildings that genuinely changes how I think, conversations with my friends feel different out there too, slower and more honest somehow, without the usual distractions of the city pulling our attention away. Some of the most memorable conversations I've had over the past couple of years happened halfway up a trail rather than anywhere more obvious, which says a lot about why I keep making the effort to go.",
    ],
    upgrades: [
      { phrase: 'weather permitting', note: 'a concise, natural conditional phrase' },
      { phrase: "admittedly isn't always the case", note: 'an honest hedge that adds realism to the plan' },
      { phrase: 'mental shift', note: 'an abstract noun phrase for describing a psychological effect' },
      { phrase: 'slower and more honest somehow', note: 'a natural, slightly vague intensifier that sounds spoken rather than written' },
      { phrase: 'says a lot about why', note: 'a reflective closing that ties a small detail back to the main point' },
    ],
    roundingOff: [
      { q: 'Do you go hiking all year round?', a: 'Mostly spring to autumn, less in winter.' },
      { q: 'Would you try a more difficult trail?', a: 'Possibly, with more preparation first.' },
    ],
    part3: [
      {
        q: 'Why do you think outdoor activities have become more popular recently?',
        a: "I think it's partly a reaction to how much time people now spend indoors, in front of screens, working or studying, so there's a natural pull back towards physical, unplugged activity. Increased awareness of mental health has probably played a role too; being outdoors is widely recognised now as genuinely beneficial, not just a nice extra. I'd say that shift in attitude has genuinely encouraged more people to make time for it.",
      },
      {
        q: 'Should governments invest more in protecting natural areas for outdoor activities?',
        a: "I'd say yes, definitely. Once a natural area is damaged or built over, it's extremely difficult, sometimes impossible, to restore, whereas the benefits of protecting it, for recreation, for wellbeing, for the environment, are long term. It seems like a fairly clear case where short-term development costs are outweighed by longer-term value. Once a landscape is lost, no amount of later investment can really bring it back the same way.",
      },
      {
        q: 'Do you think city life makes people less connected to nature?',
        a: "To a large extent, yes. Many city residents can go through an entire week surrounded almost entirely by concrete and screens, with very little direct contact with anything natural. I think that disconnect can genuinely affect wellbeing over time, which is probably why activities like hiking or simply spending time in parks have become more consciously valued rather than taken for granted.",
      },
    ],
  },
  {
    id: 'media-book',
    family: 'media',
    title: 'An interesting book',
    card: {
      topic: 'Describe a book you have read that you found interesting.',
      points: ['what the book was about', 'when you read it', 'why you decided to read it'],
      explain: 'and explain why you found it interesting',
    },
    notes: [
      'a novel about a family across generations',
      'read it last winter, during the holidays',
      'recommended by a friend, borrowed copy',
      'unusual structure, jumps in time',
      'why: made me think about my own family',
      'finished it in about four days',
    ],
    model: [
      "I'd like to talk about a novel that follows one family across several generations, which I read last winter, during the university holidays when I finally had time to sit down with something that wasn't a textbook.",
      "I decided to read it because a close friend of mine recommended it quite insistently, actually lending me her own copy, which I think made me feel slightly more obliged to finish it than I might have otherwise. Structurally, it's quite unusual, the story jumps backwards and forwards in time between different family members, so you're piecing together the full picture gradually rather than following one straightforward timeline.",
      "What I found genuinely interesting about it was how ordinary the events were, arguments, small betrayals, quiet acts of kindness, and yet somehow they built into something much larger about how family patterns repeat across generations without anyone fully realising it. It made me think about my own family quite differently, actually, noticing habits or attitudes that seem to have been passed down without anyone ever discussing them directly. I ended up finishing the whole thing in about four days, which is fast for me, mostly because I kept wanting to know how the different timelines would eventually connect.",
    ],
    upgrades: [
      { phrase: 'slightly more obliged to finish it than I might have otherwise', note: 'an honest, self-aware admission that adds authenticity' },
      { phrase: 'piecing together the full picture gradually', note: 'a figurative phrase describing narrative structure' },
      { phrase: 'without anyone fully realising it', note: 'a phrase reused later in the reflection as a cohesive device' },
      { phrase: 'fast for me', note: 'a natural, personal comparison rather than a general statement' },
      { phrase: 'stayed with me the longest', note: 'an idiomatic closing phrase for describing lasting impact' },
    ],
    roundingOff: [
      { q: 'Would you recommend this book to others?', a: 'Yes, especially to anyone who enjoys family stories.' },
      { q: 'Do you read often?', a: 'Fairly often, mostly during holidays.' },
    ],
    part3: [
      {
        q: 'Do you think reading fiction has any real benefits, or is it just entertainment?',
        a: "I'd argue it has real benefits beyond entertainment. Fiction puts you inside someone else's perspective in a way that's hard to replicate elsewhere, which builds empathy over time. There's also evidence that regular reading improves vocabulary and concentration, so even though it feels purely enjoyable, there's a genuine cognitive benefit happening alongside that. I'd say it's rare for an activity to be relaxing and quietly beneficial at the same time.",
      },
      {
        q: 'Do you think people read less now than in the past, because of the internet?',
        a: "In terms of traditional books, probably yes, since attention is constantly pulled towards shorter content online. That said, I'd push back slightly on the idea that people read less overall; a lot of daily reading now happens through articles, messages and social media, just in smaller, more fragmented amounts than a full novel. Whether that counts as reading in the traditional sense is probably a separate question altogether.",
      },
      {
        q: 'Should schools encourage children to read for pleasure, not just for study?',
        a: "Definitely. Reading that's tied purely to assessment can start to feel like a chore rather than something enjoyable, which risks putting children off books altogether. If schools can show that reading is also a source of genuine pleasure, by allowing choice in what students read, it's far more likely to become a lifelong habit rather than something abandoned after exams.",
      },
    ],
  },
  {
    id: 'media-film',
    family: 'media',
    title: 'A film you enjoyed',
    card: {
      topic: 'Describe a film you enjoyed watching.',
      points: ['what the film was about', 'when and where you watched it', 'who you watched it with'],
      explain: 'and explain why you enjoyed it',
    },
    notes: [
      'an animated film about memory and growing up',
      'watched at the cinema, opening weekend',
      'went with my younger sister',
      'both cried, unexpectedly',
      'why: visuals plus emotional honesty',
      'rewatched it at home since',
    ],
    model: [
      "The film I'd like to talk about is an animated film centred on memory and growing up, which I watched at the cinema on its opening weekend, together with my younger sister.",
      "We'd both seen the trailer and expected something fairly light and colourful, aimed mostly at children, if I'm honest, so neither of us was quite prepared for how emotional it actually turned out to be. Without giving too much away, it deals with a character slowly losing certain childhood memories, and there's a scene about halfway through that had both of us properly crying in the cinema, which was slightly embarrassing at the time but also strangely bonding.",
      "In terms of why I enjoyed it so much, it's partly the visual style, the animation is genuinely beautiful, full of colour and small, thoughtful details that reward paying close attention. But mostly it's the emotional honesty of the story; it doesn't try to resolve everything neatly, which made it feel more truthful than a lot of films aimed at a general audience usually are. I've actually rewatched it at home a couple of times since, and it holds up just as well, maybe even more, once you already know what's coming and can notice details you missed the first time around.",
    ],
    upgrades: [
      { phrase: "if I'm honest", note: 'a natural spoken hedge that leads into an honest admission' },
      { phrase: 'properly crying', note: 'an informal intensifier, more natural than "cried a lot"' },
      { phrase: 'slightly embarrassing at the time but also strangely bonding', note: 'a contrast structure combining two emotions at once' },
      { phrase: "doesn't try to resolve everything neatly", note: 'a nuanced, critical observation rather than simple praise' },
      { phrase: 'holds up just as well, maybe even more', note: 'a natural spoken hedge with self-correction mid-sentence' },
    ],
    roundingOff: [
      { q: 'Would you watch it again?', a: 'I already have, a couple of times.' },
      { q: 'Do you usually watch films at the cinema or at home?', a: 'Mostly at home, but I love the cinema for a big release.' },
    ],
    part3: [
      {
        q: 'Do you think animated films are only for children?',
        a: "Not at all, honestly, that's quite an outdated view at this point. Some of the most emotionally complex storytelling I've seen recently has actually come from animated films, partly because the format allows for ideas that would be difficult to show realistically otherwise. I think the assumption that animation equals 'for kids' has been fading for a while now. I think audiences are starting to judge animation by its storytelling rather than its format.",
      },
      {
        q: 'How do you think streaming services have changed the way people watch films?',
        a: "Quite significantly. People now watch films whenever suits them, often alone, rather than as a planned shared event like going to the cinema used to be. I think that's convenient, but it does mean some of the communal experience, the shared reaction in a cinema, for instance, has become slightly less common than it was before. I still make a point of going to the cinema occasionally just to get that experience back.",
      },
      {
        q: 'Should films be used more often as an educational tool in schools?',
        a: "I think they can be genuinely useful, particularly for engaging students who find purely text-based learning difficult. A well-chosen film can communicate historical or emotional context very quickly and memorably. That said, I don't think film should replace reading or discussion entirely, more that it works well as one additional tool alongside them. Used thoughtfully, it can make a difficult topic feel far more immediate to students.",
      },
    ],
  },
  {
    id: 'media-website',
    family: 'media',
    title: 'A website you use often',
    card: {
      topic: 'Describe a website you often use.',
      points: ['what the website is', 'what you use it for', 'how you first found out about it'],
      explain: 'and explain why you find it useful',
    },
    notes: [
      'a language exchange website',
      'practise English with native speakers via chat and calls',
      'found through a university classmate',
      'use it a few times a week',
      'why: real conversation practice, free',
      'made an actual friend through it',
    ],
    model: [
      "The website I'd like to talk about is a language exchange platform, which connects people who want to practise each other's languages, so I chat and occasionally video-call with native English speakers who happen to be learning Russian or Kazakh in return.",
      "I first heard about it through a classmate at university, who mentioned she'd been using it to prepare for an exam not unlike this one, and I decided to try it myself soon afterwards. I use it maybe three or four times a week now, usually for twenty or thirty minutes at a time, since longer than that tends to get tiring for both people involved.",
      "What makes it genuinely useful, in my opinion, is that it forces real, unscripted conversation, rather than practising set phrases from a textbook, you have to actually think on your feet, ask questions, and sometimes admit you didn't understand something. It's also completely free, which matters, since private tutoring isn't something everyone can easily afford. Beyond the language practice itself, I've actually kept in touch with one particular person from the site for almost a year now, and what started as a fairly formal exchange has genuinely turned into an actual friendship, which I honestly didn't expect when I first signed up.",
    ],
    upgrades: [
      { phrase: 'who happen to be learning', note: 'a relative clause adding natural, unforced detail' },
      { phrase: 'not unlike this one', note: 'an indirect, slightly formal reference used naturally in speech' },
      { phrase: 'forces real, unscripted conversation', note: 'a precise contrast with textbook-style learning' },
      { phrase: 'think on your feet', note: 'an idiomatic phrase for spontaneous thinking' },
      { phrase: 'genuinely turned into an actual friendship', note: 'a reflective closing that exceeds the original practical purpose' },
    ],
    roundingOff: [
      { q: 'Do you still use this website?', a: 'Yes, a few times a week still.' },
      { q: 'Would you recommend it to other students?', a: 'Definitely, especially for speaking practice.' },
    ],
    part3: [
      {
        q: 'Do you think websites are an effective way to learn a language?',
        a: "They can be, particularly for practising speaking and listening, which are hard to develop from a textbook alone. That said, I don't think they work well in isolation; grammar and structured feedback are still easier to get from a proper course or teacher. I'd say the most effective approach probably combines both rather than relying entirely on one. Used together, they seem to cover each other's weaknesses fairly well.",
      },
      {
        q: 'Do you think it is safe to talk to strangers online for language practice?',
        a: "Reasonably safe, as long as people are sensible about what personal information they share and stick to the platform's own messaging or calling features rather than moving too quickly to something more private. Most language exchange sites also have some form of verification or reporting system, which helps, though of course some caution is always sensible with strangers online. I'd generally recommend sticking to well-established platforms rather than less regulated alternatives.",
      },
      {
        q: 'How do you think websites like this will develop in the future?',
        a: "I'd imagine artificial intelligence will play a bigger role, perhaps suggesting better conversation partners or even providing real-time correction during a chat. I do hope the human element stays central, though, since a large part of the value comes from genuine cultural exchange between real people, which an algorithm alone couldn't really replace. I'd rather see technology support that human connection than try to substitute for it entirely.",
      },
    ],
  },
  {
    id: 'plan-near-future',
    family: 'plan',
    title: 'A near-future plan',
    card: {
      topic: 'Describe a plan you have for the near future.',
      points: ['what the plan is', 'when you intend to do it', 'what you need to do to prepare'],
      explain: 'and explain why this plan is important to you',
    },
    notes: [
      'plan: take this IELTS exam, apply abroad',
      'aiming within the next six months',
      'prep: study daily, mock tests, save money',
      'important: opens study opportunities abroad',
      'family fully supportive',
      'a bit nervous but mostly excited',
    ],
    model: [
      "The plan I'd like to talk about is sitting this IELTS exam and then using the result to apply to study abroad, which I'm hoping to have sorted within the next six months or so.",
      "In terms of preparing for it, I've been studying most days, working through practice tests and trying to improve the weaker areas, listening especially, since I tend to lose concentration towards the end of longer recordings. Alongside the studying itself, I've also been saving money gradually, since application fees and, eventually, tuition aren't exactly small amounts, and I'd rather not put that pressure entirely on my parents.",
      "This plan matters to me quite a lot, honestly, because it feels like the first genuinely major decision I'm making largely on my own terms, rather than following a path that was already fairly set out for me. My family has been supportive throughout, which I'm grateful for, though I know they'll also miss having me around once I actually leave. If I'm honest, I feel a mixture of nerves and excitement about it, nerves about whether everything will actually come together in time, but mostly excitement about the opportunities it could open up that simply wouldn't exist otherwise. Either way, this exam is really the first concrete step.",
    ],
    upgrades: [
      { phrase: 'sorted within the next six months or so', note: 'a natural, slightly vague time frame appropriate for describing a future plan' },
      { phrase: "rather not put that pressure entirely on my parents", note: 'considerate, mature reasoning that adds depth to the answer' },
      { phrase: 'largely on my own terms', note: 'an idiomatic phrase for independence' },
      { phrase: 'nerves about... but mostly excitement about...', note: 'a balanced contrast structure for expressing mixed feelings' },
      { phrase: 'the first concrete step', note: 'a closing phrase that frames the exam within a bigger picture' },
    ],
    roundingOff: [
      { q: 'Do you feel ready for this plan?', a: 'Mostly, yes, though there is still work to do.' },
      { q: 'Is your family supportive of the plan?', a: "Very much so, they've encouraged me throughout." },
    ],
    part3: [
      {
        q: 'Do you think young people today plan their futures more carefully than previous generations?',
        a: "In some ways, yes, mainly because there's simply more information available now about different paths, careers, countries, courses, which makes careful planning both possible and almost necessary. At the same time, I think the range of options can also make decisions more overwhelming than they were for previous generations, who often had fewer, more fixed choices to begin with. I think that abundance of choice is a genuine advantage, even if it doesn't always feel that way.",
      },
      {
        q: 'Is it better to have a fixed plan or to stay flexible about the future?',
        a: "I'd lean towards a balance of both, honestly. A general direction is useful, it gives you something to work towards and measure progress against, but being too rigidly attached to one specific plan can mean missing good opportunities that appear unexpectedly. I think successful people often combine clear intentions with a willingness to adjust when circumstances change. I try to apply that same balance to my own plans whenever I can.",
      },
      {
        q: 'Do you think studying abroad benefits young people more than studying in their home country?',
        a: "It depends on the individual and the field, I think, but generally there are real benefits, exposure to different teaching styles, independence, a wider international network. That said, studying at home has its own advantages too, staying close to family and existing support systems, so I wouldn't say one option is objectively better, more that it depends on what someone values most.",
      },
    ],
  },
  {
    id: 'plan-ambition',
    family: 'plan',
    title: 'An ambition to fulfil',
    card: {
      topic: 'Describe an ambition you would like to fulfil.',
      points: ['what the ambition is', 'how long you have had this ambition', 'what you have done so far to achieve it'],
      explain: 'and explain why this ambition is important to you',
    },
    notes: [
      'ambition: open a small business with a friend',
      'had the idea for about two years',
      'so far: saved money, written a rough plan',
      'taken a short course on the basics',
      'why: independence, building something lasting',
      "inspired partly by my aunt's bakery",
    ],
    model: [
      "The ambition I'd like to talk about is starting a small business of my own, together with a close friend, which is something we've actually been talking about, half-seriously at first, for around two years now.",
      "So far, what we've actually done is fairly modest, if I'm honest. We've both been putting money aside gradually, we've written a rough business plan, admittedly one that's changed direction more than once, and I recently completed a short course covering the basics of running a small company, budgeting, that sort of thing. It's still very much in the planning stage rather than anything close to reality yet, but it feels less like a vague daydream than it used to.",
      "In terms of why this ambition matters to me, I think it partly comes from watching my aunt build her own small bakery from almost nothing, which showed me it was actually a realistic thing to attempt rather than just something people talk about. There's also something appealing about the independence of it, building something that's genuinely ours, rather than working entirely within someone else's structure and decisions. I know it'll probably take years before it becomes anything substantial, but I'd honestly rather try properly and fail than never attempt it in the first place.",
    ],
    upgrades: [
      { phrase: 'half-seriously at first', note: 'an honest qualifier that adds realism to the timeline' },
      { phrase: "admittedly one that's changed direction more than once", note: 'a self-aware aside that shows honesty rather than a polished story' },
      { phrase: 'less like a vague daydream than it used to', note: 'a comparative phrase tracking progress over time' },
      { phrase: "rather than working entirely within someone else's structure", note: 'a precise contrast for expressing independence' },
      { phrase: 'rather try properly and fail than never attempt it', note: 'a parallel structure for a strong, resolute closing' },
    ],
    roundingOff: [
      { q: 'Have you told many people about this plan?', a: 'Just close family and friends so far.' },
      { q: 'How confident are you it will happen?', a: 'Fairly confident, though it will take time.' },
    ],
    part3: [
      {
        q: 'Do you think starting a business is riskier now than in the past?',
        a: "In some ways it's actually less risky, since starting costs for many businesses have dropped, you can reach customers online without expensive premises, for instance. But competition has increased enormously too, because anyone anywhere can start something similar, so I'd say the risk has shifted rather than simply increased or decreased overall. Understanding exactly where that new risk sits matters more than the old assumptions about business in general.",
      },
      {
        q: 'What qualities do you think successful entrepreneurs share?',
        a: "Persistence, mainly, I think, since most businesses don't succeed on the first attempt, and giving up too early is probably the most common reason people fail. Adaptability matters too, being willing to change an original plan once reality doesn't match expectations, rather than stubbornly sticking to it. I'd say those two qualities matter more than raw talent or even a brilliant original idea.",
      },
      {
        q: 'Should governments do more to support young people who want to start businesses?',
        a: "I think so, yes, particularly through things like reduced taxes or simplified regulations for new small businesses, since the early stages tend to be the most financially fragile. That kind of support doesn't need to be expensive for the government, but it can make a real difference in whether someone actually attempts an idea or decides it's simply too risky.",
      },
    ],
  },
  {
    id: 'skill-useful',
    family: 'skill',
    title: 'A useful skill',
    card: {
      topic: 'Describe a skill you have learned that you find useful.',
      points: ['what the skill is', 'how and when you learned it', 'how often you use it'],
      explain: 'and explain why you find it useful',
    },
    notes: [
      'learned to drive',
      'learned at eighteen, with a local instructor',
      'took about three months, failed the test once',
      'use it almost daily now',
      'why: independence, saves time',
      'helped family with errands too',
    ],
    model: [
      "The skill I'd like to talk about is driving, which I learned when I was eighteen, mostly with a local instructor, though my older brother also took me out practising whenever he had free time and the patience for it.",
      "It took about three months altogether, and I'll admit I failed the actual test once before passing on my second attempt, which was fairly humbling at the time, given how confident I'd felt beforehand. These days I use it almost every day, honestly, whether that's commuting, running errands, or just getting somewhere faster than public transport would allow, especially now that I live slightly further from the city centre than I used to.",
      "In terms of why I find it so useful, the obvious answer is independence, I no longer have to plan my entire day around bus timetables or ask someone else for a lift, which used to genuinely limit what I could do. But it's also been useful in more practical, everyday ways within my family, I can take my grandmother to appointments, help with shopping, or drive at short notice if something urgent comes up, which has taken some pressure off my parents. Looking back, it's probably one of the most immediately practical skills I've ever learned, in the sense that I use it constantly, rather than occasionally, unlike a lot of things I've studied.",
    ],
    upgrades: [
      { phrase: "fairly humbling at the time, given how confident I'd felt beforehand", note: 'a past perfect clause for contrast between expectation and reality' },
      { phrase: 'genuinely limit what I could do', note: 'precise phrasing for describing a past constraint' },
      { phrase: 'at short notice', note: 'a natural collocation for describing urgency' },
      { phrase: 'taken some pressure off my parents', note: 'an idiomatic phrase for reduced burden on others' },
      { phrase: "rather than occasionally, unlike a lot of things I've studied", note: 'a comparative closing that emphasises practicality' },
    ],
    roundingOff: [
      { q: 'Do you enjoy driving?', a: 'Mostly, yes, though not in heavy traffic.' },
      { q: 'Was it difficult to learn?', a: 'Fairly, especially parking, at first.' },
    ],
    part3: [
      {
        q: 'At what age do you think people should be allowed to learn to drive?',
        a: "I think the current age in most countries, around seventeen or eighteen, seems roughly reasonable, since it's usually tied to a certain level of maturity and judgement. Lowering it much further would probably raise safety concerns, given how much responsibility driving actually requires, whereas raising it significantly might just delay independence without a clear corresponding benefit. I think the current balance in most places reflects that trade-off reasonably sensibly.",
      },
      {
        q: 'Do you think public transport should be improved instead of encouraging car ownership?',
        a: "Ideally, yes, particularly in large cities, since heavy car use contributes significantly to traffic and pollution. Good public transport can reduce a lot of that pressure while still giving people reliable independence. That said, in areas where public transport genuinely isn't practical, rural regions, for example, cars will probably remain necessary regardless of how much transport infrastructure improves. The two probably need to develop alongside each other rather than one entirely replacing the other.",
      },
      {
        q: 'How do you think self-driving cars might change society in the future?',
        a: "I imagine they could reduce accidents significantly, since human error causes most of them currently, and they might also free up time people currently spend concentrating on the road. At the same time, I think there'll be real questions around trust and legal responsibility that take a long time to fully resolve, so widespread adoption is probably still further away than people sometimes assume.",
      },
    ],
  },
  {
    id: 'skill-language',
    family: 'skill',
    title: 'A language to learn',
    card: {
      topic: 'Describe a foreign language you would like to learn.',
      points: ['what language this is', 'why you have not learned it yet', 'how you would go about learning it'],
      explain: 'and explain why you would like to learn this language',
    },
    notes: [
      'Spanish',
      'always wanted to, never had consistent time',
      'would use apps plus find a conversation partner',
      'ideally take a short course abroad eventually',
      'why: love the sound, useful for travel',
      'a friend speaks it, motivating',
    ],
    model: [
      "The language I'd like to talk about is Spanish, which I've wanted to learn properly for quite a while now, though I'll admit I've never actually committed to it in any consistent way.",
      "The main reason I haven't learned it yet is mostly a matter of time and priorities, to be honest; between studying English intensively for this exam and everything else at university, adding a third language always seemed to slip further down the list. If I did start, though, I think I'd begin with an app for the basic vocabulary and grammar, just to build a foundation, and then try to find a conversation partner fairly early on, since I've learned from English that speaking regularly matters far more than memorising rules in isolation.",
      "In terms of why Spanish specifically, part of it is simply the sound of it, it feels warm and expressive in a way that's hard to describe without sounding a bit dramatic. But there's also a practical side; I have a friend who's fluent, and hearing her speak it so naturally has made me genuinely want to reach that level myself, rather than staying at the stage of recognising a few words on holiday. Eventually, I'd love to take a short course somewhere Spanish-speaking, since I think being surrounded by a language properly is really the only way to learn it well.",
    ],
    upgrades: [
      { phrase: 'slip further down the list', note: 'an idiomatic phrase describing shifting priorities' },
      { phrase: 'just to build a foundation', note: 'a natural purpose clause' },
      { phrase: 'hard to describe without sounding a bit dramatic', note: 'a self-aware hedge that adds humour and honesty' },
      { phrase: 'rather than staying at the stage of', note: 'a comparative structure showing ambition beyond a basic level' },
      { phrase: 'being surrounded by a language properly', note: 'a natural phrase for describing immersion' },
    ],
    roundingOff: [
      { q: 'Have you started learning it at all?', a: 'Only a few words so far, nothing formal.' },
      { q: 'When do you plan to start properly?', a: 'Hopefully once this exam is behind me.' },
    ],
    part3: [
      {
        q: 'Do you think it is easier to learn a language as a child or as an adult?',
        a: "Children generally pick up pronunciation and natural rhythm more easily, since their brains are simply more adaptable to new sounds at that age. Adults, on the other hand, tend to learn grammar and structure faster because they can apply conscious study strategies a child wouldn't use. So I'd say each has an advantage, just in different areas of language learning.",
      },
      {
        q: 'Do you think everyone should learn a second language at school?',
        a: "I do think it's valuable, yes, even for students who never end up using the language regularly, since it builds an awareness of how language works generally, which can improve their own native language too. That said, I think schools should offer some choice in which language is taught, since motivation matters enormously, and a language a student actually wants to learn tends to stick far better.",
      },
      {
        q: 'Do you think technology like translation apps will reduce the need to learn foreign languages?',
        a: "To some extent for basic, practical situations, ordering food, asking for directions, yes, translation apps probably reduce urgency. But I don't think they'll replace genuine language learning, since real fluency allows for humour, nuance and relationship-building that an app simply can't provide in real time. I'd say technology will change why people learn languages rather than eliminate the need entirely.",
      },
    ],
  },
  {
    id: 'skill-recent-learning',
    family: 'skill',
    title: 'Something learned recently',
    card: {
      topic: 'Describe something new you learned recently.',
      points: ['what you learned', 'how you learned it', 'how difficult it was to learn'],
      explain: 'and explain why you decided to learn it',
    },
    notes: [
      'basic video editing',
      'learned from online tutorials, trial and error',
      'fairly difficult at first, many failed exports',
      'decided to learn for a university project',
      'why: wanted to present my work more professionally',
      'now use it for personal projects too',
    ],
    model: [
      "Something I learned fairly recently is basic video editing, which I picked up mostly through online tutorials and, honestly, a lot of frustrating trial and error over a couple of months.",
      "I decided to learn it because of a university project that required a short presentation video, and rather than relying on someone else or using the most basic tools available, I wanted to actually understand how to do it properly myself. It was fairly difficult at first, if I'm honest; I remember exporting the same three-minute clip about six times because the audio kept falling out of sync with the video, which was genuinely maddening at the time.",
      "Once I got past that initial stage, though, it became a lot more manageable, and I actually started enjoying the process, cutting between clips, adding simple transitions, timing things to match music properly. In terms of why I decided to commit to learning it beyond just that one project, I think it was mainly about wanting to present my work more professionally in general, rather than settling for something that looked obviously unfinished. Since then I've actually used the skill for a few personal projects too, small clips for family occasions, that sort of thing, which wasn't something I'd originally planned for but has turned out to be a nice, unexpected benefit.",
    ],
    upgrades: [
      { phrase: 'a lot of frustrating trial and error', note: 'an honest, natural phrase for describing self-teaching' },
      { phrase: 'genuinely maddening at the time', note: 'an informal intensifier for describing frustration' },
      { phrase: 'got past that initial stage', note: 'a natural phrase for describing a learning curve' },
      { phrase: 'settling for something that looked obviously unfinished', note: 'a precise phrase expressing a personal standard' },
      { phrase: 'unexpected benefit', note: 'a reflective closing that broadens the answer beyond the original purpose' },
    ],
    roundingOff: [
      { q: 'Do you still use this skill?', a: 'Yes, occasionally, for small personal projects.' },
      { q: 'Was it hard to learn on your own?', a: 'Quite hard at first, but it got easier.' },
    ],
    part3: [
      {
        q: 'Do you think it is better to learn new skills through formal courses or by teaching yourself?',
        a: "I think it depends on the skill and how much structure it needs. Something technical and cumulative, like coding, probably benefits from formal teaching, since gaps in understanding can compound. But more practical, hands-on skills, like the video editing I mentioned, can often be picked up perfectly well through self-teaching, especially now that so many tutorials are freely available online.",
      },
      {
        q: 'Do you think online tutorials have made learning new skills easier overall?',
        a: "Definitely, in terms of access. Skills that once required expensive courses or specialist teachers are now available to almost anyone with an internet connection, which has genuinely levelled the playing field to some degree. The challenge now is less about access and more about motivation, since there's no external structure forcing you to actually finish what you start. That's probably the main reason so many people start courses online but never actually complete them.",
      },
      {
        q: 'How important do you think it is for adults to keep learning new skills throughout their lives?',
        a: "Very important, I'd say, both practically and personally. Industries change quickly now, so skills that were sufficient a decade ago aren't always enough today, which makes continuous learning almost necessary for staying employable. Beyond that, though, I think learning something new simply keeps people mentally engaged, which matters for wellbeing quite separately from any career benefit. I try to treat learning something new as a habit now, rather than an occasional event.",
      },
    ],
  },
];
