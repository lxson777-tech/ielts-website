/* Speaking practice prompts, refreshed for the 2026 IELTS Speaking question
   pool (2026 Sep 15 refresh). Replaces the previous small hand-written bank
   with a much larger one covering the topics currently being reported by
   test takers across all three 2026 rotation windows (Jan to Apr, May to
   Aug, Sep to Dec), plus the handful of "core" topics (Work, Home,
   Hometown, Food) that recur in every window and were kept from the
   original bank because they are still current.

   Every question was rewritten in the project's own words, in plain
   examiner-style phrasing; none of it is copied from any source site.
   Each Part 1 topic and cue card carries an optional `period` field (see
   Part1Topic / CueCard in ../lib/speaking/schema) recording which 2026
   window it was reported in, or "core" if it recurs in all three.

   Sources consulted while researching which topics and cue cards are
   currently being reported for 2026 (read 2026-09-15):
   - Cathoven IELTS Speaking resources, Part 1 topics 2026
     https://resources.cathoven.com/ielts-speaking/topics-2026
   - Cathoven IELTS Speaking Part 2 cue card bank, May to Aug 2026
     https://resources.cathoven.com/ielts-speaking/cue-card-bank
   - IELTS Liz, IELTS Speaking Topics 2026
     https://ieltsliz.com/ielts-speaking-topics-2026/
   - ReadingIELTS, IELTS Speaking Part 2 from September to December 2026
     https://www.readingielts.com/ielts-speaking-part-2-from-september-to-december-2026
   - ReadingIELTS, IELTS Speaking Part 1 from September to December 2026
     https://www.readingielts.com/ielts-speaking-part-1-from-september-to-december-2026
   - simplyIELTS, IELTS Speaking Topics January to April 2026
     https://simplyielts.com/ielts-speaking-topics-january-to-april-2026/
   - IELTS Fever, January 2026 to April 2026 cue cards
     https://ieltsfever.org/january-2026-to-april-2026-cue-cards-with-answers-updating-weekly/
   - IELTS9, IELTS Speaking Part 2 cue cards, May to August 2026
     https://ielts9.io/blog/ielts-speaking-cue-cards-may-august-2026
   - Engnovate, IELTS Academic Speaking Forecast, Q2 2026
     https://engnovate.com/ielts-exam-topics/ielts-academic-speaking-forecast-q2-2026/

   Coaching layers (all optional per the schema, all surfaced by
   SpeakingCoachPanel / IdeaHints):
   - `vocab`: topic vocabulary with meaning + example, tap-to-reveal.
   - question `ideas`: 2 to 3 short angles a stuck student can build an
     answer from. They suggest directions, never full sentences, so the
     answer stays the student's own.
   - cue-card `ideas`: angles for the two-minute talk, shown in prep.

   Drives the Speaking Trainer at /trainers/speaking and the live voice
   examiner at /speaking/examiner (both draw randomly from the full pool
   below via nextInRotation, see src/lib/rotation.ts). More can be added
   freely; keep ids in the "p1-2026-xx" / "cc-2026-xx" format. */

import type { CueCard, Part1Topic } from "../lib/speaking/schema";

export const SPEAKING_PART1_TOPICS: Part1Topic[] = [
  {
    id: "p1-work",
    part: "part1",
    topic: "Work",
    period: "2026 (core topic, tested in every window)",
    questions: [
      { id: "q1", text: "What do you do for work or study?", ideas: ["Say your job or course and where", "Add how long you have been doing it"] },
      { id: "q2", text: "Why did you choose that field?", ideas: ["A person who inspired the choice?", "Was it planned or more of an accident?"] },
      { id: "q3", text: "What do you enjoy most about it?", ideas: ["One specific part of the day you like", "Compare it with a task you dislike"] },
      { id: "q4", text: "Would you change your job or course if you could?", ideas: ["Your dream job if money did not matter?", "What would you miss about the current one?"] },
    ],
    vocab: [
      { phrase: "a rewarding job", meaning: "a job that gives you satisfaction beyond money", example: "Teaching is exhausting but genuinely rewarding." },
      { phrase: "nine-to-five routine", meaning: "a standard fixed office schedule", example: "I would struggle to go back to a nine-to-five routine." },
      { phrase: "get on well with", meaning: "have a good relationship with someone", example: "I get on really well with my colleagues." },
      { phrase: "work-life balance", meaning: "the balance between your job and personal life", example: "Remote work has improved my work-life balance." },
    ],
  },
  {
    id: "p1-home",
    part: "part1",
    topic: "Home",
    period: "2026 (core topic, tested in every window)",
    questions: [
      { id: "q1", text: "Do you live in a house or a flat?", ideas: ["Which floor, how long you have lived there", "One thing you love about it"] },
      { id: "q2", text: "Who do you live with?", ideas: ["Family, flatmates, or alone?", "What is good, or hard, about that?"] },
      { id: "q3", text: "What is your favourite room and why?", ideas: ["Where do you relax best?", "Describe the light, the furniture, what you do there"] },
      { id: "q4", text: "What would you change about your home?", ideas: ["More space? New furniture? A balcony garden?", "What stops you from changing it?"] },
    ],
    vocab: [
      { phrase: "a cosy flat", meaning: "small but warm and comfortable", example: "I live in a cosy flat near the centre." },
      { phrase: "spacious", meaning: "with a lot of room", example: "The kitchen is surprisingly spacious." },
      { phrase: "within walking distance", meaning: "close enough to walk to", example: "All the shops are within walking distance." },
      { phrase: "the heart of the home", meaning: "the room where family life happens", example: "For us the kitchen is the heart of the home." },
    ],
  },
  {
    id: "p1-hometown",
    part: "part1",
    topic: "Hometown",
    period: "2026 (core topic, tested in every window)",
    questions: [
      { id: "q1", text: "Where is your hometown?", ideas: ["Where it is, how big it is", "One thing it is known for"] },
      { id: "q2", text: "Do you like your hometown?", ideas: ["Yes or no, plus the main reason", "Would you want to raise a family there?"] },
      { id: "q3", text: "What is your hometown like?", ideas: ["Busy or calm? Green or concrete?", "What surprises visitors when they arrive?"] },
      { id: "q4", text: "Has it changed much since you were a child?", ideas: ["New buildings, more people, a new metro?", "Something that disappeared and you miss?"] },
    ],
    vocab: [
      { phrase: "a bustling city", meaning: "busy and full of life", example: "Almaty is a bustling city of two million people." },
      { phrase: "picturesque", meaning: "pretty, like a picture", example: "The old town is really picturesque." },
      { phrase: "local landmarks", meaning: "the famous places in a town", example: "The cathedral is one of our best-known landmarks." },
      { phrase: "undergo rapid development", meaning: "change and grow very quickly", example: "My district has undergone rapid development lately." },
    ],
  },
  {
    id: "p1-food",
    part: "part1",
    topic: "Food",
    period: "2026 (core topic, tested in every window)",
    questions: [
      { id: "q1", text: "Do you enjoy cooking?", ideas: ["If yes, your signature dish", "If no, who cooks for you, and are they good?"] },
      { id: "q2", text: "What is your favourite food?", ideas: ["Describe the taste and texture, not just the name", "Who makes it best, and when do you eat it?"] },
      { id: "q3", text: "Is there any food you dislike?", ideas: ["A texture or smell you cannot stand", "A childhood food you refused to eat"] },
      { id: "q4", text: "How important is food in your culture?", ideas: ["Dishes for guests and holidays", "What a shared meal means to your family"] },
    ],
    vocab: [
      { phrase: "home-cooked meals", meaning: "food made at home, not bought", example: "Nothing beats my grandmother's home-cooked meals." },
      { phrase: "a staple dish", meaning: "a basic dish eaten all the time in a region", example: "Plov is a staple dish across Central Asia." },
      { phrase: "mouth-watering", meaning: "looking or smelling delicious", example: "The bakery smells absolutely mouth-watering." },
      { phrase: "an acquired taste", meaning: "something you learn to like over time", example: "Kurt is an acquired taste, honestly." },
    ],
  },
  {
    id: "p1-transport",
    part: "part1",
    topic: "Transport",
    period: "2026 Jan to Apr",
    questions: [
      { id: "q1", text: "How do you usually travel around your city?", ideas: ["Your usual mode and how long it takes", "What you do during the ride"] },
      { id: "q2", text: "Do you prefer public or private transport?", ideas: ["Cost, comfort, traffic, parking?", "Does the season change your answer?"] },
      { id: "q3", text: "Is public transport good in your country?", ideas: ["Compare the city and the countryside", "Price, frequency, cleanliness"] },
      { id: "q4", text: "Has transport changed much in your lifetime?", ideas: ["New metro lines, bike lanes, taxi apps", "How your grandparents used to travel"] },
    ],
    vocab: [
      { phrase: "rush hour", meaning: "the busiest travel time of the day", example: "The metro is packed during rush hour." },
      { phrase: "commute", meaning: "the regular trip between home and work or school", example: "My commute takes about forty minutes." },
      { phrase: "reliable", meaning: "something you can depend on to arrive on time", example: "Buses here are not very reliable, sadly." },
      { phrase: "traffic congestion", meaning: "heavy, slow-moving traffic", example: "Traffic congestion is the city's biggest headache." },
    ],
  },
  {
    id: "p1-2026-06",
    part: "part1",
    topic: "Reading",
    period: "2026 Jan to Apr",
    questions: [
      { id: "q1", text: "Do you enjoy reading?", ideas: ["Fiction, non-fiction, or both?", "When you last picked up a book"] },
      { id: "q2", text: "What kind of books did you read as a child?", ideas: ["A story a parent or teacher read to you", "A book you reread many times"] },
      { id: "q3", text: "Do you prefer reading on paper or on a screen?", ideas: ["Comfort versus convenience", "Does it depend on where you are?"] },
    ],
    vocab: [
      { phrase: "get lost in a book", meaning: "lose track of time while reading", example: "I get so lost in a book I forget to eat." },
      { phrase: "a page-turner", meaning: "a book that is exciting and hard to put down", example: "The ending made it a real page-turner." },
      { phrase: "skim through", meaning: "read quickly without close attention", example: "I skim through the news most mornings." },
      { phrase: "an avid reader", meaning: "someone who reads a great deal", example: "My sister has always been an avid reader." },
    ],
  },
  {
    id: "p1-2026-07",
    part: "part1",
    topic: "Mobile Phones",
    period: "2026 Jan to Apr",
    questions: [
      { id: "q1", text: "How often do you use your phone?", ideas: ["Roughly how many hours a day", "Which app you open first"] },
      { id: "q2", text: "What do you mainly use your phone for?", ideas: ["Messaging, work, entertainment?", "One task it has replaced completely"] },
      { id: "q3", text: "Do you think people rely on phones too much?", ideas: ["A moment you noticed this in others", "Would you cope well without one for a day?"] },
    ],
    vocab: [
      { phrase: "glued to your phone", meaning: "paying constant attention to a phone", example: "He is glued to his phone at every meal." },
      { phrase: "notifications", meaning: "alerts a phone sends for messages or updates", example: "I turn off notifications when I study." },
      { phrase: "screen time", meaning: "the amount of time spent looking at a device", example: "My screen time went up a lot last year." },
      { phrase: "stay connected", meaning: "keep in touch with people through technology", example: "It helps me stay connected with old friends." },
    ],
  },
  {
    id: "p1-2026-08",
    part: "part1",
    topic: "New Year Goals",
    period: "2026 Jan to Apr",
    questions: [
      { id: "q1", text: "Do you usually make New Year resolutions?", ideas: ["A goal you set this year", "Did last year's goal work out?"] },
      { id: "q2", text: "What is one thing you would like to achieve this year?", ideas: ["Health, career, or a skill?", "The first step you have already taken"] },
      { id: "q3", text: "Do you think it is useful to set goals at the start of a year?", ideas: ["A fresh start versus any random date", "Do written goals work better than spoken ones?"] },
    ],
    vocab: [
      { phrase: "a New Year resolution", meaning: "a promise to change something at the start of the year", example: "My resolution was to exercise more." },
      { phrase: "stick to a plan", meaning: "continue following a plan without giving up", example: "It is hard to stick to a diet in winter." },
      { phrase: "a fresh start", meaning: "a new beginning, leaving old habits behind", example: "January always feels like a fresh start." },
      { phrase: "set a target", meaning: "decide on a goal to aim for", example: "I set a target to save money each month." },
    ],
  },
  {
    id: "p1-2026-09",
    part: "part1",
    topic: "Weather",
    period: "2026 Jan to Apr",
    questions: [
      { id: "q1", text: "What is the weather like in your country at the moment?", ideas: ["The current season and typical temperature", "How it affects your mood"] },
      { id: "q2", text: "What is your favourite kind of weather?", ideas: ["Sunny, rainy, or snowy, and why", "An activity that weather makes possible"] },
      { id: "q3", text: "Has the weather in your country changed over the years?", ideas: ["Hotter summers or colder winters?", "Something older relatives mention"] },
    ],
    vocab: [
      { phrase: "freezing cold", meaning: "extremely cold", example: "It was freezing cold on the way to work." },
      { phrase: "a heatwave", meaning: "a period of unusually hot weather", example: "We had a heatwave in July this year." },
      { phrase: "unpredictable", meaning: "changing often and hard to plan around", example: "The weather here is completely unpredictable." },
      { phrase: "wrap up warm", meaning: "dress in warm clothing", example: "You should wrap up warm before you go out." },
    ],
  },
  {
    id: "p1-2026-10",
    part: "part1",
    topic: "Public Gardens and Parks",
    period: "2026 Jan to Apr",
    questions: [
      { id: "q1", text: "Is there a park near where you live?", ideas: ["How far it is and how often you visit", "What people usually do there"] },
      { id: "q2", text: "What do you like to do in a park?", ideas: ["Walking, exercise, or just sitting?", "Alone or with other people"] },
      { id: "q3", text: "Do you think cities need more green spaces?", ideas: ["Health and air quality benefits", "A city that does this particularly well"] },
    ],
    vocab: [
      { phrase: "green space", meaning: "an area with grass, trees, or plants in a city", example: "Our district has very little green space." },
      { phrase: "take a stroll", meaning: "go for a relaxed, slow walk", example: "We took a stroll around the lake." },
      { phrase: "unwind", meaning: "relax after a stressful period", example: "A park is a great place to unwind after work." },
      { phrase: "well-maintained", meaning: "kept in good condition", example: "The paths in the park are well-maintained." },
    ],
  },
  {
    id: "p1-2026-11",
    part: "part1",
    topic: "Pets and Animals",
    period: "2026 Jan to Apr",
    questions: [
      { id: "q1", text: "Do you have any pets?", ideas: ["What kind, and for how long", "If not, one you would like to have"] },
      { id: "q2", text: "Did you have pets when you were a child?", ideas: ["A memory of playing with it", "Who looked after it mainly"] },
      { id: "q3", text: "Do you think keeping pets is good for people?", ideas: ["Company, responsibility, comfort?", "Any downside worth mentioning"] },
    ],
    vocab: [
      { phrase: "a loyal companion", meaning: "a pet that is faithful and dependable", example: "My dog has been a loyal companion for years." },
      { phrase: "look after", meaning: "take care of", example: "My brother looks after our cat when I travel." },
      { phrase: "house-trained", meaning: "taught not to make a mess indoors", example: "It took months to get the puppy house-trained." },
      { phrase: "attached to", meaning: "emotionally close to", example: "I got really attached to that cat quickly." },
    ],
  },
  {
    id: "p1-2026-12",
    part: "part1",
    topic: "Sport",
    period: "2026 Jan to Apr",
    questions: [
      { id: "q1", text: "Do you play any sports?", ideas: ["Team sport or individual?", "How often you play"] },
      { id: "q2", text: "Did you do much sport when you were younger?", ideas: ["A school team or a family activity", "Something you wish you had tried"] },
      { id: "q3", text: "Do you prefer watching sport or playing it?", ideas: ["The atmosphere of watching live", "The satisfaction of playing yourself"] },
    ],
    vocab: [
      { phrase: "keep fit", meaning: "stay in good physical condition", example: "I play football mainly to keep fit." },
      { phrase: "a team player", meaning: "someone who works well within a group", example: "Sport taught me to be a team player." },
      { phrase: "a close match", meaning: "a game where the result is uncertain until the end", example: "It was a close match right until the final minute." },
      { phrase: "take up a sport", meaning: "start doing a sport", example: "I took up swimming last winter." },
    ],
  },
  {
    id: "p1-2026-13",
    part: "part1",
    topic: "Books",
    period: "2026 Jan to Apr",
    questions: [
      { id: "q1", text: "What kind of books do you usually choose?", ideas: ["A genre you keep returning to", "Fiction versus real stories"] },
      { id: "q2", text: "Who recommends books to you?", ideas: ["Friends, family, or online reviews?", "A book someone convinced you to try"] },
      { id: "q3", text: "Do you think it is important for children to read?", ideas: ["Imagination and vocabulary", "A childhood book you still remember"] },
    ],
    vocab: [
      { phrase: "a gripping story", meaning: "a story that holds your attention completely", example: "It was such a gripping story I finished it in a day." },
      { phrase: "broaden your mind", meaning: "expand your understanding of the world", example: "Reading widely really broadens your mind." },
      { phrase: "put a book down", meaning: "stop reading, usually temporarily", example: "I could not put that book down." },
      { phrase: "a plot twist", meaning: "an unexpected turn in a story", example: "The plot twist at the end surprised everyone." },
    ],
  },
  {
    id: "p1-2026-14",
    part: "part1",
    topic: "Friends",
    period: "2026 Jan to Apr",
    questions: [
      { id: "q1", text: "How do you usually spend time with your friends?", ideas: ["A regular activity you share", "In person or mostly online"] },
      { id: "q2", text: "What do you value most in a friend?", ideas: ["Honesty, humour, reliability?", "A moment that showed this quality"] },
      { id: "q3", text: "Is it easy to make new friends as an adult?", ideas: ["Compared with making friends at school", "Where adults tend to meet new people"] },
    ],
    vocab: [
      { phrase: "a close-knit group", meaning: "a group of friends who are very connected", example: "We are a close-knit group from university." },
      { phrase: "get along with", meaning: "have a friendly relationship with", example: "I get along with almost everyone at work." },
      { phrase: "keep in touch", meaning: "stay in contact over time", example: "We still keep in touch despite living apart." },
      { phrase: "a shoulder to cry on", meaning: "someone who offers comfort in hard times", example: "She has always been a shoulder to cry on." },
    ],
  },
  {
    id: "p1-2026-15",
    part: "part1",
    topic: "Shopping",
    period: "2026 Jan to Apr",
    questions: [
      { id: "q1", text: "Do you enjoy shopping?", ideas: ["What you enjoy buying most", "Shopping alone or with others"] },
      { id: "q2", text: "Do you prefer shopping in stores or online?", ideas: ["Speed versus being able to try things on", "A recent purchase either way"] },
      { id: "q3", text: "Has the way you shop changed in recent years?", ideas: ["More online, less in person?", "A habit you have picked up recently"] },
    ],
    vocab: [
      { phrase: "window shopping", meaning: "looking at shops without intending to buy", example: "We spent the afternoon window shopping." },
      { phrase: "a bargain", meaning: "something bought at a good price", example: "I found a real bargain in the sale." },
      { phrase: "impulse buy", meaning: "a purchase made without planning", example: "That jacket was a total impulse buy." },
      { phrase: "browse", meaning: "look through items casually", example: "I like to browse before I decide on anything." },
    ],
  },
  {
    id: "p1-2026-16",
    part: "part1",
    topic: "History",
    period: "2026 Jan to Apr",
    questions: [
      { id: "q1", text: "Are you interested in history?", ideas: ["A period or event that interests you", "Where that interest came from"] },
      { id: "q2", text: "How did you learn about history as a child?", ideas: ["School lessons, family stories, museums?", "A history lesson you actually enjoyed"] },
      { id: "q3", text: "Do you think it is important to study history?", ideas: ["Lessons for the present day", "A mistake worth not repeating"] },
    ],
    vocab: [
      { phrase: "a historical figure", meaning: "a real person from the past who is well known", example: "We studied several historical figures at school." },
      { phrase: "pass down", meaning: "share knowledge or traditions across generations", example: "These stories were passed down by my grandmother." },
      { phrase: "a turning point", meaning: "a moment that changed the direction of events", example: "That battle was a turning point in the war." },
      { phrase: "dig into the past", meaning: "research and learn about earlier times", example: "I enjoy digging into my family's past." },
    ],
  },
  {
    id: "p1-music",
    part: "part1",
    topic: "Music",
    period: "2026 May to Aug",
    questions: [
      { id: "q1", text: "What kind of music do you enjoy?", ideas: ["Name a genre and a favourite artist", "When do you listen, commuting, studying, the gym?"] },
      { id: "q2", text: "Did you listen to music as a child?", ideas: ["Songs your family played at home", "A song that instantly brings back a memory"] },
      { id: "q3", text: "Do you play a musical instrument?", ideas: ["If yes, how you learned, how often you play", "If no, which one you would love to learn and why"] },
      { id: "q4", text: "Is music important in your culture?", ideas: ["Traditional instruments or festivals", "Music at weddings and holidays"] },
    ],
    vocab: [
      { phrase: "catchy", meaning: "easy to remember and hard to stop humming", example: "That song is so catchy I hum it all day." },
      { phrase: "a broad taste in music", meaning: "enjoying many different genres", example: "I have got quite a broad taste in music." },
      { phrase: "a live performance", meaning: "music played in front of an audience", example: "Nothing beats the energy of a live performance." },
      { phrase: "take up an instrument", meaning: "start learning to play one", example: "I took up the guitar when I was twelve." },
      { phrase: "background music", meaning: "music playing while you do something else", example: "I study with quiet background music on." },
    ],
  },
  {
    id: "p1-2026-18",
    part: "part1",
    topic: "Travel and Holidays",
    period: "2026 May to Aug",
    questions: [
      { id: "q1", text: "Do you prefer travelling alone or with other people?", ideas: ["Freedom versus shared memories", "Who you usually travel with"] },
      { id: "q2", text: "What kind of holiday do you enjoy most?", ideas: ["Beach, city, or countryside?", "Active or mostly relaxing"] },
      { id: "q3", text: "How do you usually plan a trip?", ideas: ["Everything booked in advance, or more spontaneous?", "Who decides where you go"] },
    ],
    vocab: [
      { phrase: "book in advance", meaning: "arrange something ahead of time", example: "We always book flights in advance." },
      { phrase: "off the beaten path", meaning: "away from popular tourist areas", example: "We prefer places off the beaten path." },
      { phrase: "a getaway", meaning: "a short trip to relax", example: "We need a quick getaway this weekend." },
      { phrase: "pack light", meaning: "travel with only a small amount of luggage", example: "I have learned to pack light for short trips." },
    ],
  },
  {
    id: "p1-2026-19",
    part: "part1",
    topic: "Clothes",
    period: "2026 May to Aug",
    questions: [
      { id: "q1", text: "What kind of clothes do you usually wear?", ideas: ["Casual, formal, or a mix?", "Comfort versus appearance"] },
      { id: "q2", text: "Do you enjoy shopping for clothes?", ideas: ["A favourite shop or brand", "Trying things on versus buying online"] },
      { id: "q3", text: "Has your style changed since you were younger?", ideas: ["A trend you used to follow", "Something you would never wear again"] },
    ],
    vocab: [
      { phrase: "dress code", meaning: "rules about what clothing is appropriate", example: "The office has quite a relaxed dress code." },
      { phrase: "a wardrobe staple", meaning: "an item you wear often and rely on", example: "A plain white shirt is a wardrobe staple." },
      { phrase: "on trend", meaning: "fashionable at the moment", example: "That colour is very on trend this year." },
      { phrase: "hand-me-downs", meaning: "clothes passed from one person to another", example: "I wore a lot of hand-me-downs as a child." },
    ],
  },
  {
    id: "p1-2026-20",
    part: "part1",
    topic: "Art",
    period: "2026 May to Aug",
    questions: [
      { id: "q1", text: "Do you like visiting art galleries or museums?", ideas: ["How often, and with whom", "A piece that stayed in your memory"] },
      { id: "q2", text: "Did you study art at school?", ideas: ["Drawing, painting, or something else", "Were you any good at it"] },
      { id: "q3", text: "Why do you think art is important to people?", ideas: ["Self-expression versus decoration", "A way art has affected your own mood"] },
    ],
    vocab: [
      { phrase: "a masterpiece", meaning: "an outstanding work of art", example: "The painting is considered a masterpiece." },
      { phrase: "an exhibition", meaning: "a public display of art or objects", example: "We went to a photography exhibition last month." },
      { phrase: "self-expression", meaning: "showing your feelings or ideas through creativity", example: "Art gives children a form of self-expression." },
      { phrase: "abstract", meaning: "art that does not show realistic objects", example: "I find abstract paintings hard to interpret." },
    ],
  },
  {
    id: "p1-2026-21",
    part: "part1",
    topic: "Health",
    period: "2026 May to Aug",
    questions: [
      { id: "q1", text: "Do you try to live a healthy lifestyle?", ideas: ["Diet, exercise, or sleep", "What is hardest to keep up"] },
      { id: "q2", text: "What do you do to stay healthy?", ideas: ["A regular habit you have", "Something you know you should do more"] },
      { id: "q3", text: "Do you think people today are more health-conscious than before?", ideas: ["Compare with your parents' generation", "The role of information online"] },
    ],
    vocab: [
      { phrase: "a balanced diet", meaning: "eating a healthy variety of foods", example: "She always talks about eating a balanced diet." },
      { phrase: "work out", meaning: "exercise, usually at a gym", example: "I try to work out three times a week." },
      { phrase: "get enough sleep", meaning: "rest for a sufficient number of hours", example: "I rarely get enough sleep during exams." },
      { phrase: "health-conscious", meaning: "paying close attention to your health", example: "More young people are health-conscious nowadays." },
    ],
  },
  {
    id: "p1-2026-22",
    part: "part1",
    topic: "Nature",
    period: "2026 May to Aug",
    questions: [
      { id: "q1", text: "Do you enjoy spending time outdoors?", ideas: ["A favourite outdoor spot", "How often you manage to go"] },
      { id: "q2", text: "What kind of natural scenery do you like best?", ideas: ["Mountains, forests, or the sea?", "A place that left a strong impression"] },
      { id: "q3", text: "Do you think people today spend enough time in nature?", ideas: ["City life versus rural life", "What stops people from going outside more"] },
    ],
    vocab: [
      { phrase: "breathtaking scenery", meaning: "extremely beautiful natural views", example: "The valley had breathtaking scenery." },
      { phrase: "get back to nature", meaning: "spend time away from cities in natural surroundings", example: "We try to get back to nature every summer." },
      { phrase: "untouched", meaning: "not changed or damaged by people", example: "The forest there is still largely untouched." },
      { phrase: "fresh air", meaning: "clean, outdoor air", example: "A walk in the fresh air always clears my head." },
    ],
  },
  {
    id: "p1-2026-23",
    part: "part1",
    topic: "Social Media",
    period: "2026 May to Aug",
    questions: [
      { id: "q1", text: "Which social media platforms do you use?", ideas: ["Which one you use most", "What you mainly use it for"] },
      { id: "q2", text: "How much time do you spend on social media each day?", ideas: ["A rough estimate", "Whether you think that is too much"] },
      { id: "q3", text: "Do you think social media has a positive or negative effect on people?", ideas: ["Staying in touch versus comparison and pressure", "A change you have noticed in yourself"] },
    ],
    vocab: [
      { phrase: "scroll through", meaning: "move down a feed looking at posts", example: "I scroll through my feed before bed, which is a bad habit." },
      { phrase: "go viral", meaning: "spread quickly and widely online", example: "That video went viral within a day." },
      { phrase: "an online presence", meaning: "how a person appears and is seen online", example: "Many young people care about their online presence." },
      { phrase: "compare yourself to others", meaning: "measure your own life against what others post", example: "It is easy to compare yourself to others online." },
    ],
  },
  {
    id: "p1-2026-24",
    part: "part1",
    topic: "Films and Cinema",
    period: "2026 May to Aug",
    questions: [
      { id: "q1", text: "Do you often go to the cinema?", ideas: ["Cinema versus watching at home", "Who you usually go with"] },
      { id: "q2", text: "What kind of films do you enjoy?", ideas: ["A genre and a favourite example", "What draws you to that genre"] },
      { id: "q3", text: "Do you think cinemas will still be popular in the future?", ideas: ["Streaming services as an alternative", "What the cinema offers that home does not"] },
    ],
    vocab: [
      { phrase: "a box-office hit", meaning: "a film that sells very well", example: "It became one of the year's box-office hits." },
      { phrase: "a plot", meaning: "the sequence of events in a film or story", example: "The plot was a little confusing at first." },
      { phrase: "subtitles", meaning: "translated text shown on screen", example: "I watch foreign films with subtitles." },
      { phrase: "on the edge of your seat", meaning: "feeling very tense or excited", example: "The chase scene kept me on the edge of my seat." },
    ],
  },
  {
    id: "p1-2026-25",
    part: "part1",
    topic: "Science",
    period: "2026 May to Aug",
    questions: [
      { id: "q1", text: "Were you interested in science at school?", ideas: ["A subject you enjoyed or disliked", "A teacher who made it interesting"] },
      { id: "q2", text: "What area of science interests you most?", ideas: ["Space, biology, technology?", "Where that interest came from"] },
      { id: "q3", text: "Do you think science news is well explained to the public?", ideas: ["Simple explanations versus technical detail", "A discovery you heard about recently"] },
    ],
    vocab: [
      { phrase: "a discovery", meaning: "something newly found through research", example: "That was a major scientific discovery." },
      { phrase: "conduct an experiment", meaning: "carry out a scientific test", example: "We conducted a simple experiment in class." },
      { phrase: "cutting-edge", meaning: "the most advanced or modern", example: "The lab uses cutting-edge equipment." },
      { phrase: "curious about", meaning: "wanting to learn more about something", example: "I have always been curious about space." },
    ],
  },
  {
    id: "p1-2026-26",
    part: "part1",
    topic: "Teachers",
    period: "2026 May to Aug",
    questions: [
      { id: "q1", text: "Did you have a favourite teacher?", ideas: ["What subject they taught", "What made them stand out"] },
      { id: "q2", text: "What makes someone a good teacher?", ideas: ["Patience, clarity, enthusiasm?", "A specific moment that showed this"] },
      { id: "q3", text: "Do you think teaching is a respected profession in your country?", ideas: ["Compare with other professions", "Has this changed over time"] },
    ],
    vocab: [
      { phrase: "inspire", meaning: "encourage someone strongly toward something", example: "She inspired me to study languages." },
      { phrase: "patient", meaning: "calm and able to deal with difficulty without frustration", example: "A good teacher needs to be patient." },
      { phrase: "explain clearly", meaning: "make something easy to understand", example: "He always explained things clearly." },
      { phrase: "a role model", meaning: "someone whose behaviour others try to follow", example: "My teacher was a real role model for me." },
    ],
  },
  {
    id: "p1-2026-27",
    part: "part1",
    topic: "Gifts",
    period: "2026 May to Aug",
    questions: [
      { id: "q1", text: "Do you enjoy giving gifts?", ideas: ["Choosing something versus giving money", "A gift you were proud of choosing"] },
      { id: "q2", text: "What is the best gift you have ever received?", ideas: ["Who gave it and why it mattered", "Was it expensive or just thoughtful"] },
      { id: "q3", text: "Do you think it is the thought or the price that matters most with gifts?", ideas: ["A cheap gift that meant a lot", "When price does seem to matter"] },
    ],
    vocab: [
      { phrase: "thoughtful", meaning: "showing careful consideration of someone's needs", example: "It was such a thoughtful gift." },
      { phrase: "wrap a present", meaning: "cover a gift in paper before giving it", example: "I am terrible at wrapping presents neatly." },
      { phrase: "spoil someone", meaning: "give someone a lot of gifts or treats", example: "We like to spoil our parents on their birthdays." },
      { phrase: "a gesture", meaning: "an action that shows a feeling", example: "It was a small gesture, but it meant a lot." },
    ],
  },
  {
    id: "p1-2026-28",
    part: "part1",
    topic: "Old Buildings",
    period: "2026 May to Aug",
    questions: [
      { id: "q1", text: "Are there any old buildings where you live?", ideas: ["How old, and what they are used for now", "Whether you have been inside one"] },
      { id: "q2", text: "Do you think old buildings should be preserved or replaced with new ones?", ideas: ["History versus modern needs", "An example from your own city"] },
      { id: "q3", text: "What can old buildings tell us about the past?", ideas: ["Architecture reflecting the period", "A building that surprised you with its history"] },
    ],
    vocab: [
      { phrase: "preserve", meaning: "protect something from damage or change", example: "The city works hard to preserve its old buildings." },
      { phrase: "architecture", meaning: "the design and style of buildings", example: "The architecture in the old town is stunning." },
      { phrase: "restore", meaning: "repair something to its original condition", example: "They spent years restoring the old theatre." },
      { phrase: "a landmark", meaning: "a well-known building or feature of a place", example: "That tower is a landmark in our city." },
    ],
  },
  {
    id: "p1-2026-29",
    part: "part1",
    topic: "Learning New Skills",
    period: "2026 Sep to Dec",
    questions: [
      { id: "q1", text: "Have you learned any new skills recently?", ideas: ["What it is and why you started", "How you are learning it"] },
      { id: "q2", text: "Do you prefer learning with a teacher or by yourself?", ideas: ["Structure versus flexibility", "An example from your own experience"] },
      { id: "q3", text: "What skill would you like to learn in the future?", ideas: ["Why that particular skill", "What is stopping you from starting now"] },
    ],
    vocab: [
      { phrase: "pick up a skill", meaning: "learn something, often informally", example: "I picked up some basic design skills online." },
      { phrase: "practice makes perfect", meaning: "repeated effort leads to improvement", example: "It is a cliche, but practice really does make perfect." },
      { phrase: "a steep learning curve", meaning: "a skill that is difficult to learn quickly", example: "Coding had a steep learning curve for me." },
      { phrase: "self-taught", meaning: "having learned something without formal instruction", example: "She is completely self-taught on the piano." },
    ],
  },
  {
    id: "p1-2026-30",
    part: "part1",
    topic: "Celebrations and Festivals",
    period: "2026 Sep to Dec",
    questions: [
      { id: "q1", text: "What festivals or celebrations are important in your country?", ideas: ["One you look forward to most", "What people typically do"] },
      { id: "q2", text: "How do you usually celebrate your birthday?", ideas: ["Big gathering or a quiet day", "A birthday that stands out in memory"] },
      { id: "q3", text: "Do you think celebrations are as important today as in the past?", ideas: ["Changes in how people celebrate", "The role of technology in celebrations now"] },
    ],
    vocab: [
      { phrase: "a family gathering", meaning: "an occasion when relatives meet together", example: "New Year is always a big family gathering for us." },
      { phrase: "a tradition", meaning: "a custom passed down over time", example: "Sharing a meal together is a family tradition." },
      { phrase: "festive", meaning: "having the cheerful atmosphere of a celebration", example: "The whole street feels festive in December." },
      { phrase: "mark the occasion", meaning: "celebrate an event in a special way", example: "We baked a cake to mark the occasion." },
    ],
  },
  {
    id: "p1-2026-31",
    part: "part1",
    topic: "Photography",
    period: "2026 Sep to Dec",
    questions: [
      { id: "q1", text: "Do you enjoy taking photographs?", ideas: ["Your phone or a proper camera", "What you usually photograph"] },
      { id: "q2", text: "What kind of things do you like to photograph?", ideas: ["People, places, or food?", "A photo you are especially proud of"] },
      { id: "q3", text: "Do you think people take too many photos nowadays?", ideas: ["Living in the moment versus capturing it", "How phones have changed this habit"] },
    ],
    vocab: [
      { phrase: "capture a moment", meaning: "take a photo that records something meaningful", example: "That photo really captures the moment." },
      { phrase: "in focus", meaning: "clear and sharp in a photo", example: "Half my photos are not even in focus." },
      { phrase: "a candid shot", meaning: "a natural photo taken without posing", example: "I prefer candid shots to posed ones." },
      { phrase: "edit a photo", meaning: "adjust or improve a picture after taking it", example: "I sometimes edit photos before posting them." },
    ],
  },
  {
    id: "p1-2026-32",
    part: "part1",
    topic: "Future Plans",
    period: "2026 Sep to Dec",
    questions: [
      { id: "q1", text: "What are your plans for the next few years?", ideas: ["Career, study, or travel plans", "How firm those plans are"] },
      { id: "q2", text: "Do you prefer to plan ahead or take life as it comes?", ideas: ["An example of each approach", "Which has worked out better for you"] },
      { id: "q3", text: "Do you think it is important to have long-term goals?", ideas: ["Direction versus flexibility", "A goal that changed as you grew older"] },
    ],
    vocab: [
      { phrase: "a long-term goal", meaning: "an aim you work toward over years", example: "Buying a home is a long-term goal of mine." },
      { phrase: "take things as they come", meaning: "not plan too far ahead", example: "I try to take things as they come these days." },
      { phrase: "a career path", meaning: "the direction a person's working life takes", example: "I am still figuring out my career path." },
      { phrase: "set out to do something", meaning: "decide firmly to achieve a goal", example: "I set out to learn English properly this year." },
    ],
  },
  {
    id: "p1-2026-33",
    part: "part1",
    topic: "Computers",
    period: "2026 Sep to Dec",
    questions: [
      { id: "q1", text: "How often do you use a computer?", ideas: ["Work, study, or leisure use", "Laptop, desktop, or mainly a phone"] },
      { id: "q2", text: "What do you mainly use a computer for?", ideas: ["Work tasks versus entertainment", "A programme or tool you rely on"] },
      { id: "q3", text: "Do you think computer skills are essential nowadays?", ideas: ["Jobs that now require them", "A skill you wish you had learned earlier"] },
    ],
    vocab: [
      { phrase: "a shortcut", meaning: "a faster way of doing something on a computer", example: "I use keyboard shortcuts to save time." },
      { phrase: "back up your files", meaning: "save a copy of data in case it is lost", example: "Always back up your files before an update." },
      { phrase: "crash", meaning: "stop working suddenly, for software or a device", example: "My laptop crashed right before I saved the file." },
      { phrase: "tech-savvy", meaning: "skilled and comfortable with technology", example: "My younger cousin is really tech-savvy." },
    ],
  },
  {
    id: "p1-2026-34",
    part: "part1",
    topic: "Secondary School",
    period: "2026 Sep to Dec",
    questions: [
      { id: "q1", text: "What was your secondary school like?", ideas: ["Big or small, strict or relaxed", "How you got there each day"] },
      { id: "q2", text: "What was your favourite subject at secondary school?", ideas: ["Why you liked it", "A teacher connected to that subject"] },
      { id: "q3", text: "Looking back, is there anything you would change about your school years?", ideas: ["A subject you wish you had studied", "Something you would take more seriously now"] },
    ],
    vocab: [
      { phrase: "a strict school", meaning: "a school with firm rules and discipline", example: "My school was quite strict about uniforms." },
      { phrase: "extracurricular activities", meaning: "activities outside normal lessons", example: "I joined several extracurricular activities." },
      { phrase: "sit an exam", meaning: "take a formal test", example: "We sat our final exams in June." },
      { phrase: "look back on", meaning: "think about something from the past", example: "I look back on those years quite fondly." },
    ],
  },
  {
    id: "p1-2026-35",
    part: "part1",
    topic: "Advertisements",
    period: "2026 Sep to Dec",
    questions: [
      { id: "q1", text: "Do you pay attention to advertisements?", ideas: ["Where you see them most, TV, online, street", "One that has stuck in your memory"] },
      { id: "q2", text: "Do advertisements ever influence what you buy?", ideas: ["An honest example if you can think of one", "Do you trust them, generally"] },
      { id: "q3", text: "Do you think there is too much advertising nowadays?", ideas: ["Online ads versus older forms like posters", "A place you wish had fewer adverts"] },
    ],
    vocab: [
      { phrase: "catch someone's eye", meaning: "attract attention visually", example: "That poster really caught my eye." },
      { phrase: "a slogan", meaning: "a short, memorable advertising phrase", example: "The brand's slogan is stuck in my head." },
      { phrase: "a target audience", meaning: "the group of people an advert is aimed at", example: "The advert was clearly aimed at a younger target audience." },
      { phrase: "eye-catching", meaning: "visually striking and attention-grabbing", example: "The packaging is bright and eye-catching." },
    ],
  },
  {
    id: "p1-2026-36",
    part: "part1",
    topic: "Noise and Quiet Places",
    period: "2026 Sep to Dec",
    questions: [
      { id: "q1", text: "Do you prefer noisy or quiet places?", ideas: ["Where you go to think or relax", "A noisy place you actually enjoy"] },
      { id: "q2", text: "Is your home a quiet place?", ideas: ["Traffic, neighbours, or family noise", "What you do when it gets too noisy"] },
      { id: "q3", text: "Do you think cities are becoming noisier?", ideas: ["Traffic, construction, crowds", "A change you have noticed yourself"] },
    ],
    vocab: [
      { phrase: "peace and quiet", meaning: "a calm state without noise or disturbance", example: "I just want some peace and quiet after work." },
      { phrase: "hustle and bustle", meaning: "busy, noisy activity, especially in a city", example: "I love the hustle and bustle of the market." },
      { phrase: "soundproof", meaning: "designed to block outside noise", example: "Our new windows are almost soundproof." },
      { phrase: "deafening", meaning: "extremely loud", example: "The music at the concert was deafening." },
    ],
  },
  {
    id: "p1-2026-37",
    part: "part1",
    topic: "Technology Devices",
    period: "2026 Sep to Dec",
    questions: [
      { id: "q1", text: "What piece of technology do you use most often?", ideas: ["Phone, laptop, or something else", "What you would struggle without"] },
      { id: "q2", text: "Is there a device you would like to own in the future?", ideas: ["What it does and why you want it", "How it would change your daily life"] },
      { id: "q3", text: "How has technology changed daily life in your country?", ideas: ["Compare with a generation ago", "One change you consider mostly positive"] },
    ],
    vocab: [
      { phrase: "a gadget", meaning: "a small, useful electronic device", example: "He loves collecting new gadgets." },
      { phrase: "user-friendly", meaning: "easy to use", example: "The new app is very user-friendly." },
      { phrase: "upgrade", meaning: "replace something with a newer, better version", example: "I need to upgrade my old laptop soon." },
      { phrase: "indispensable", meaning: "so useful that you cannot do without it", example: "My phone has become indispensable." },
    ],
  },
  {
    id: "p1-2026-38",
    part: "part1",
    topic: "Evening Routines",
    period: "2026 Sep to Dec",
    questions: [
      { id: "q1", text: "What do you usually do in the evening?", ideas: ["A typical weekday evening", "Alone or with family or friends"] },
      { id: "q2", text: "Do you prefer spending evenings at home or going out?", ideas: ["What decides it on a given day", "A favourite way to unwind"] },
      { id: "q3", text: "Has your evening routine changed since you were younger?", ideas: ["Compare a school-day evening with now", "Something you do now that you never used to"] },
    ],
    vocab: [
      { phrase: "wind down", meaning: "relax gradually before sleeping", example: "I read a little to wind down before bed." },
      { phrase: "a routine", meaning: "a fixed, regular way of doing things", example: "I have a pretty fixed evening routine." },
      { phrase: "catch up with someone", meaning: "talk with someone you have not seen recently", example: "We caught up over dinner last night." },
      { phrase: "call it a night", meaning: "decide to stop and go to sleep", example: "We usually call it a night by eleven." },
    ],
  },
  {
    id: "p1-2026-39",
    part: "part1",
    topic: "Confidence",
    period: "2026 Sep to Dec",
    questions: [
      { id: "q1", text: "Would you describe yourself as a confident person?", ideas: ["A situation where you feel confident", "One where you do not"] },
      { id: "q2", text: "What helps you feel more confident?", ideas: ["Preparation, support from others, practice?", "An example that worked for you"] },
      { id: "q3", text: "Do you think confidence can be taught?", ideas: ["Natural personality versus learned skill", "Someone who helped build your confidence"] },
    ],
    vocab: [
      { phrase: "self-assured", meaning: "confident and sure of yourself", example: "She always seems so self-assured in interviews." },
      { phrase: "nerve-wracking", meaning: "causing anxiety or nervousness", example: "Public speaking is nerve-wracking for me." },
      { phrase: "build up confidence", meaning: "gradually become more confident", example: "Practice helped me build up confidence." },
      { phrase: "step out of your comfort zone", meaning: "try something unfamiliar or difficult", example: "Moving abroad forced me out of my comfort zone." },
    ],
  },
  {
    id: "p1-2026-40",
    part: "part1",
    topic: "Numbers",
    period: "2026 Sep to Dec",
    questions: [
      { id: "q1", text: "Do you enjoy working with numbers?", ideas: ["Maths at school, or numbers in daily life", "A job that involves numbers"] },
      { id: "q2", text: "Do you have a favourite or lucky number?", ideas: ["Where that number comes from", "A superstition connected to numbers"] },
      { id: "q3", text: "Were you good at mathematics at school?", ideas: ["A memory, good or bad, from maths class", "How useful maths has been since then"] },
    ],
    vocab: [
      { phrase: "do the maths", meaning: "calculate or work something out", example: "Let me just do the maths quickly." },
      { phrase: "a rough estimate", meaning: "an approximate number, not exact", example: "That is just a rough estimate, not exact." },
      { phrase: "add up", meaning: "calculate a total, or make logical sense", example: "The figures simply did not add up." },
      { phrase: "numerate", meaning: "good with numbers and basic maths", example: "You need to be numerate for that job." },
    ],
  },
];

export const SPEAKING_CUE_CARDS: CueCard[] = [
  {
    id: "p2-journey",
    part: "part2and3",
    topic: "Describe a memorable journey or trip you have taken.",
    period: "2026 (core topic, tested in every window)",
    bullets: [
      "where you went",
      "who you went with",
      "what you did during the trip",
      "and explain why the journey was memorable",
    ],
    ideas: [
      "A trip that went wrong makes a great story too",
      "Use the senses, what you saw, ate, and heard",
      "End with how the trip changed you",
    ],
    vocab: [
      { phrase: "set off", meaning: "begin a journey", example: "We set off before sunrise to catch the train." },
      { phrase: "breathtaking scenery", meaning: "extremely beautiful views", example: "The mountain pass had breathtaking scenery." },
      { phrase: "off the beaten track", meaning: "far from the usual tourist places", example: "We stayed in a village well off the beaten track." },
      { phrase: "broaden your horizons", meaning: "widen your experience of the world", example: "Travelling alone really broadened my horizons." },
      { phrase: "a once-in-a-lifetime experience", meaning: "something you will probably never get to repeat", example: "Seeing the desert at night was a once-in-a-lifetime experience." },
    ],
    part3Questions: [
      { id: "q1", text: "Why do some people prefer to travel abroad rather than explore their own country?", ideas: ["Prestige, curiosity, social media?", "Cost and convenience play a role too"] },
      { id: "q2", text: "How do you think tourism will change in the next twenty years?", ideas: ["Space tourism, eco-travel, virtual tours?", "Cheaper flights, or climate limits on flying?"] },
      { id: "q3", text: "What are the benefits and drawbacks of mass tourism for a country?", ideas: ["Jobs and income versus crowds and prices", "The effect on locals and the environment"] },
    ],
  },
  {
    id: "p2-influence",
    part: "part2and3",
    topic: "Describe a person who has had a significant influence on your life.",
    period: "2026 (core topic, tested in every window)",
    bullets: [
      "who this person is",
      "how you know them",
      "what this person has done",
      "and explain why they have had such a significant influence on you",
    ],
    ideas: [
      "A family member, teacher, coach, or friend",
      "One specific moment that shows their influence",
      "Compare who you would be without them",
    ],
    vocab: [
      { phrase: "a role model", meaning: "a person whose behaviour you try to copy", example: "My aunt has always been my role model." },
      { phrase: "look up to", meaning: "admire and respect someone", example: "I have looked up to my coach since I was ten." },
      { phrase: "shape someone's character", meaning: "influence who a person becomes", example: "Those years with her really shaped my character." },
      { phrase: "lead by example", meaning: "show how to behave through actions, not words", example: "She never lectured us, she led by example." },
      { phrase: "instil values in someone", meaning: "teach values gradually over time", example: "He instilled a love of reading in me." },
    ],
    part3Questions: [
      { id: "q1", text: "Do you think teachers today have as much influence on young people as they used to?", ideas: ["Teachers versus online influencers", "Has respect for the profession changed?"] },
      { id: "q2", text: "What qualities make someone a good role model?", ideas: ["Honesty, consistency, resilience?", "Fame versus character"] },
      { id: "q3", text: "Is it more common for people to look up to family members or public figures nowadays?", ideas: ["Who do young people actually copy?", "The role social media plays in that"] },
    ],
  },
  {
    id: "p2-skill",
    part: "part2and3",
    topic: "Describe a skill you have learned that you consider useful.",
    period: "2026 (core topic, tested in every window)",
    bullets: [
      "what the skill is",
      "how and when you learned it",
      "how often you use it",
      "and explain why you consider it useful",
    ],
    ideas: [
      "Cooking, driving, a language, an instrument, coding",
      "Tell the story of the first time it actually worked",
      "Who taught you, and what was hardest at the start",
    ],
    vocab: [
      { phrase: "pick up a skill", meaning: "learn it, often informally", example: "I picked up basic coding from online videos." },
      { phrase: "learn the ropes", meaning: "learn how something is done", example: "It took me a month to learn the ropes." },
      { phrase: "trial and error", meaning: "trying repeatedly until something works", example: "I learned mostly through trial and error." },
      { phrase: "come in handy", meaning: "turn out to be useful", example: "Speaking English comes in handy whenever I travel." },
      { phrase: "master a skill", meaning: "become truly expert at it", example: "It takes years to master an instrument." },
    ],
    part3Questions: [
      { id: "q1", text: "What skills do you think will be most important for young people in the future?", ideas: ["Tech skills, communication, adaptability?", "Skills that school does not teach"] },
      { id: "q2", text: "Is it better to learn a skill formally or through practice?", ideas: ["Theory versus muscle memory", "Does it depend on the skill? Surgery versus cooking"] },
      { id: "q3", text: "How has technology changed the way people learn new skills?", ideas: ["Video tutorials and apps replacing teachers?", "Is self-taught knowledge respected as much as certified?"] },
    ],
  },
  {
    id: "cc-2026-04",
    part: "part2and3",
    topic: "Describe a skill you taught yourself without a teacher.",
    period: "2026 Jan to Apr",
    bullets: [
      "what the skill is",
      "how you taught yourself",
      "how long it took to learn",
      "and explain how you felt once you could do it",
    ],
    ideas: [
      "Cooking, a language, an instrument, a sport",
      "Videos, books, or simple trial and error",
      "Mention one moment it finally clicked",
    ],
    vocab: [
      { phrase: "self-taught", meaning: "learned without a teacher or formal course", example: "I am completely self-taught on the guitar." },
      { phrase: "trial and error", meaning: "learning by trying repeatedly and fixing mistakes", example: "I learned mostly through trial and error." },
      { phrase: "it finally clicked", meaning: "something suddenly became clear or possible", example: "After weeks of practice, it finally clicked." },
      { phrase: "a steep learning curve", meaning: "something difficult to learn at first", example: "Coding had a steep learning curve for me." },
    ],
    part3Questions: [
      { id: "q1", text: "Is it better to learn skills from a teacher or by yourself?", ideas: ["Structure and feedback versus freedom", "Does it depend on the skill?"] },
      { id: "q2", text: "How has the internet changed the way people learn new skills?", ideas: ["Free videos replacing paid lessons", "Is self-taught knowledge as reliable?"] },
      { id: "q3", text: "What skills do you think schools should teach but currently do not?", ideas: ["Practical life skills versus academic ones", "A skill you wish you had learned earlier"] },
    ],
  },
  {
    id: "cc-2026-05",
    part: "part2and3",
    topic: "Describe a piece of technology, other than a phone, that you would like to own.",
    period: "2026 Jan to Apr",
    bullets: [
      "what it is",
      "what it does",
      "how much it costs",
      "and explain why you would like to own it",
    ],
    ideas: [
      "A laptop, a smart device, a camera, a kitchen gadget",
      "What problem it would solve for you",
      "Where you first saw or heard about it",
    ],
    vocab: [
      { phrase: "a must-have gadget", meaning: "a device many people consider essential", example: "Noise-cancelling headphones feel like a must-have gadget now." },
      { phrase: "worth the investment", meaning: "good value despite the cost", example: "A good laptop is worth the investment." },
      { phrase: "state of the art", meaning: "using the most modern technology available", example: "The device uses state of the art sensors." },
      { phrase: "save time and effort", meaning: "make a task faster and easier", example: "It would save me a lot of time and effort." },
    ],
    part3Questions: [
      { id: "q1", text: "How important is new technology in people's lives today?", ideas: ["Work, communication, entertainment", "Could people manage without it?"] },
      { id: "q2", text: "Do you think new gadgets always make life easier?", ideas: ["A device that added complexity instead", "Convenience versus distraction"] },
      { id: "q3", text: "Should governments regulate how technology companies release new products?", ideas: ["Safety and privacy concerns", "Innovation versus caution"] },
    ],
  },
  {
    id: "cc-2026-06",
    part: "part2and3",
    topic: "Describe an occasion when you were not able to use your phone.",
    period: "2026 Jan to Apr",
    bullets: [
      "when this happened",
      "why you could not use it",
      "how you felt about it",
      "and explain how you managed without it",
    ],
    ideas: [
      "A flight, a dead battery, a lost phone, a rule at work or school",
      "The first thing you reached for instead",
      "Whether it was more relaxing or more stressful",
    ],
    vocab: [
      { phrase: "out of battery", meaning: "a device with no power left", example: "My phone was out of battery all afternoon." },
      { phrase: "cut off from the world", meaning: "unable to communicate with anyone", example: "I felt completely cut off from the world." },
      { phrase: "go cold turkey", meaning: "stop something suddenly and completely", example: "I went cold turkey on my phone for a weekend." },
      { phrase: "a welcome break", meaning: "a pause that turns out to be pleasant", example: "It ended up being a welcome break." },
    ],
    part3Questions: [
      { id: "q1", text: "Do you think people should take regular breaks from their phones?", ideas: ["Mental health and focus", "Realistic ways to do this"] },
      { id: "q2", text: "How do you think children's phone use should be managed by parents?", ideas: ["Time limits versus trust", "Balancing safety and independence"] },
      { id: "q3", text: "What are the risks of being too dependent on a phone?", ideas: ["Losing skills like memory or navigation", "What happens in an emergency"] },
    ],
  },
  {
    id: "cc-2026-07",
    part: "part2and3",
    topic: "Describe a story or book you read recently and enjoyed.",
    period: "2026 Jan to Apr",
    bullets: [
      "what it was about",
      "why you chose to read it",
      "how long it took you to finish",
      "and explain why you enjoyed it",
    ],
    ideas: [
      "Fiction or a true story",
      "A recommendation from someone, or your own choice",
      "A character or scene that stayed with you",
    ],
    vocab: [
      { phrase: "a gripping plot", meaning: "a storyline that holds your attention", example: "The book has a genuinely gripping plot." },
      { phrase: "hard to put down", meaning: "so interesting you keep reading", example: "It was hard to put down once I started." },
      { phrase: "relate to a character", meaning: "feel similar to or understand a character", example: "I really related to the main character." },
      { phrase: "a satisfying ending", meaning: "a conclusion that feels complete and fitting", example: "The book had a really satisfying ending." },
    ],
    part3Questions: [
      { id: "q1", text: "Do you think reading fiction is as valuable as reading non-fiction?", ideas: ["Imagination versus information", "What each teaches a reader"] },
      { id: "q2", text: "Will people still read printed books in the future?", ideas: ["E-readers and audiobooks as alternatives", "What paper books offer that screens do not"] },
      { id: "q3", text: "How can parents encourage children to read more?", ideas: ["Reading together versus buying books", "Making reading feel like a choice, not a chore"] },
    ],
  },
  {
    id: "cc-2026-08",
    part: "part2and3",
    topic: "Describe an app you use often.",
    period: "2026 Jan to Apr",
    bullets: [
      "what the app is",
      "what it is used for",
      "how you found out about it",
      "and explain why you use it so often",
    ],
    ideas: [
      "A messaging, study, fitness, or productivity app",
      "A feature that makes it genuinely useful",
      "How your daily routine would change without it",
    ],
    vocab: [
      { phrase: "a handy app", meaning: "an app that is very useful", example: "It is such a handy app for planning trips." },
      { phrase: "user-friendly", meaning: "easy to use", example: "The interface is really user-friendly." },
      { phrase: "in-app features", meaning: "functions available inside an app", example: "The in-app features keep getting better." },
      { phrase: "rely on", meaning: "depend on something regularly", example: "I rely on that app every single day." },
    ],
    part3Questions: [
      { id: "q1", text: "How have apps changed the way people manage their daily lives?", ideas: ["Banking, shopping, learning, health", "One task that used to take much longer"] },
      { id: "q2", text: "What makes an app successful?", ideas: ["Design, usefulness, word of mouth", "An app that failed despite a good idea"] },
      { id: "q3", text: "Are there any downsides to relying heavily on apps?", ideas: ["Privacy and data concerns", "Losing the ability to do things manually"] },
    ],
  },
  {
    id: "cc-2026-09",
    part: "part2and3",
    topic: "Describe a child you know who loves drawing.",
    period: "2026 Jan to Apr",
    bullets: [
      "who this child is",
      "what they usually draw",
      "how they became interested in drawing",
      "and explain how you feel about their drawings",
    ],
    ideas: [
      "A relative, a neighbour's child, a friend's child",
      "Animals, people, imaginary worlds",
      "Whether anyone encourages or teaches them",
    ],
    vocab: [
      { phrase: "a vivid imagination", meaning: "a strong, creative imagination", example: "She has such a vivid imagination for her age." },
      { phrase: "scribble", meaning: "draw or write quickly and carelessly", example: "He was scribbling away happily on the floor." },
      { phrase: "a natural talent", meaning: "an ability someone seems to be born with", example: "Drawing seems to be a natural talent of hers." },
      { phrase: "encourage creativity", meaning: "support and nurture imaginative activity", example: "We try to encourage creativity at home." },
    ],
    part3Questions: [
      { id: "q1", text: "Why do you think art is important for children's development?", ideas: ["Imagination, confidence, fine motor skills", "A skill drawing might build beyond art itself"] },
      { id: "q2", text: "Should art classes be a bigger part of the school curriculum?", ideas: ["Balance with academic subjects", "Countries that already prioritise it"] },
      { id: "q3", text: "Do you think talent matters more than practice in art?", ideas: ["Natural ability versus years of effort", "An artist who improved mainly through practice"] },
    ],
  },
  {
    id: "cc-2026-10",
    part: "part2and3",
    topic: "Describe a person you know who is good at planning.",
    period: "2026 Jan to Apr",
    bullets: [
      "who this person is",
      "what kind of things they plan",
      "how they stay organised",
      "and explain why you think they are good at it",
    ],
    ideas: [
      "A colleague, family member, or friend",
      "Trips, events, work projects, budgets",
      "Lists, calendars, or just a clear head",
    ],
    vocab: [
      { phrase: "meticulous", meaning: "extremely careful and detail-focused", example: "She is meticulous about every detail." },
      { phrase: "stay on top of things", meaning: "keep everything under control and managed", example: "He always stays on top of things at work." },
      { phrase: "a contingency plan", meaning: "a backup plan in case something goes wrong", example: "She always has a contingency plan ready." },
      { phrase: "organised", meaning: "arranged in a clear, efficient way", example: "Her whole week is neatly organised." },
    ],
    part3Questions: [
      { id: "q1", text: "Do you think planning ahead is more important than being flexible?", ideas: ["Situations that reward each approach", "Can someone be both?"] },
      { id: "q2", text: "How can children be taught to plan and organise their time?", ideas: ["School timetables, chores, homework routines", "A method that worked for you"] },
      { id: "q3", text: "Are good planning skills more useful in some jobs than others?", ideas: ["Project management versus creative work", "An example from a job you know well"] },
    ],
  },
  {
    id: "cc-2026-11",
    part: "part2and3",
    topic: "Describe a foreign country you would like to work in for a short time.",
    period: "2026 Jan to Apr",
    bullets: [
      "which country it is",
      "what kind of work you would like to do there",
      "how you would prepare for it",
      "and explain why you would like to work there",
    ],
    ideas: [
      "Language, culture, climate, or career reasons",
      "Learning the language versus using English",
      "What you hope to bring back from the experience",
    ],
    vocab: [
      { phrase: "broaden your horizons", meaning: "gain wider experience of the world", example: "Working abroad would really broaden my horizons." },
      { phrase: "adapt to a new culture", meaning: "adjust your behaviour to fit a different culture", example: "It takes time to adapt to a new culture." },
      { phrase: "a work placement", meaning: "a temporary period of work, often for experience", example: "I applied for a work placement abroad." },
      { phrase: "step outside your comfort zone", meaning: "try something unfamiliar or challenging", example: "Working abroad would push me outside my comfort zone." },
    ],
    part3Questions: [
      { id: "q1", text: "What are the main benefits of working in a foreign country?", ideas: ["New skills, language, networks", "Compare with staying in your home country"] },
      { id: "q2", text: "What difficulties might someone face working abroad?", ideas: ["Homesickness, language barriers, visas", "How people usually adjust over time"] },
      { id: "q3", text: "Do you think more young people should try working abroad?", ideas: ["Career benefits versus family ties", "A friend's experience, if relevant"] },
    ],
  },
  {
    id: "cc-2026-12",
    part: "part2and3",
    topic: "Describe a time when you gave advice to someone.",
    period: "2026 Jan to Apr",
    bullets: [
      "who you gave advice to",
      "what the advice was about",
      "why they asked you for it",
      "and explain whether the advice helped them",
    ],
    ideas: [
      "A friend, sibling, or colleague",
      "A decision about work, study, or relationships",
      "Whether you were confident giving the advice",
    ],
    vocab: [
      { phrase: "weigh up the options", meaning: "consider the choices carefully", example: "I helped them weigh up the options." },
      { phrase: "take advice on board", meaning: "seriously consider and use advice given", example: "She really took my advice on board." },
      { phrase: "see things from another angle", meaning: "consider a different perspective", example: "It helped him see things from another angle." },
      { phrase: "in hindsight", meaning: "looking back, now that you know more", example: "In hindsight, it was the right advice." },
    ],
    part3Questions: [
      { id: "q1", text: "Do people generally prefer advice from friends or from experts?", ideas: ["Trust versus expertise", "Does the topic change the answer?"] },
      { id: "q2", text: "Why do some people find it difficult to accept advice?", ideas: ["Pride, independence, past experience", "A time advice was hard to accept"] },
      { id: "q3", text: "Has the internet changed where people go for advice?", ideas: ["Forums and social media versus people you know", "Reliability of online advice"] },
    ],
  },
  {
    id: "cc-2026-13",
    part: "part2and3",
    topic: "Describe something important that has been kept in your family for a long time.",
    period: "2026 Jan to Apr",
    bullets: [
      "what the item is",
      "who it originally belonged to",
      "how it has been looked after",
      "and explain why it is important to your family",
    ],
    ideas: [
      "A photograph, jewellery, a document, furniture",
      "A story attached to how it was obtained",
      "Who will look after it next",
    ],
    vocab: [
      { phrase: "a family heirloom", meaning: "a valuable item passed down through generations", example: "The watch is a family heirloom." },
      { phrase: "sentimental value", meaning: "emotional rather than financial worth", example: "It has huge sentimental value for us." },
      { phrase: "passed down", meaning: "given from one generation to the next", example: "It has been passed down for three generations." },
      { phrase: "treasure", meaning: "value something highly", example: "We treasure it more than anything else we own." },
    ],
    part3Questions: [
      { id: "q1", text: "Why do families keep certain objects for many generations?", ideas: ["Memory, identity, connection to ancestors", "An object type that is commonly kept"] },
      { id: "q2", text: "Do you think young people today value family history as much as before?", ideas: ["Busy lives versus tradition", "A way families keep history alive now"] },
      { id: "q3", text: "Should old family items be kept privately or shown in museums?", ideas: ["Personal meaning versus public education", "Who should decide"] },
    ],
  },
  {
    id: "cc-2026-14",
    part: "part2and3",
    topic: "Describe a shopping centre you know well.",
    period: "2026 Jan to Apr",
    bullets: [
      "where it is",
      "what kind of shops it has",
      "how often you go there",
      "and explain what you think of it",
    ],
    ideas: [
      "Size, layout, and atmosphere",
      "What you usually buy there",
      "How it compares with shopping online",
    ],
    vocab: [
      { phrase: "a wide range of shops", meaning: "many different types of shops", example: "It has a wide range of shops under one roof." },
      { phrase: "crowded", meaning: "full of people", example: "It gets really crowded at weekends." },
      { phrase: "convenient", meaning: "easy and useful for a purpose", example: "It is convenient because everything is in one place." },
      { phrase: "a food court", meaning: "an area with several food stalls or restaurants", example: "We usually meet at the food court." },
    ],
    part3Questions: [
      { id: "q1", text: "Do you think large shopping centres are good for local communities?", ideas: ["Jobs and convenience versus small shops closing", "An example from your own city"] },
      { id: "q2", text: "How do you think shopping habits will change in the future?", ideas: ["Online shopping growth", "What might keep physical shops relevant"] },
      { id: "q3", text: "What makes a shopping centre popular with different age groups?", ideas: ["Entertainment, food, price range", "A shopping centre that does this well"] },
    ],
  },
  {
    id: "cc-2026-15",
    part: "part2and3",
    topic: "Describe a car or motorbike trip you would like to take.",
    period: "2026 Jan to Apr",
    bullets: [
      "where you would go",
      "who you would go with",
      "what route you would take",
      "and explain why this trip appeals to you",
    ],
    ideas: [
      "A coastal road, mountains, or a cross-country route",
      "Music, stops, or scenery along the way",
      "What makes road trips different from flying",
    ],
    vocab: [
      { phrase: "hit the road", meaning: "start a car journey", example: "We plan to hit the road early in the morning." },
      { phrase: "a scenic route", meaning: "a route with beautiful views", example: "We would take the scenic route along the coast." },
      { phrase: "a pit stop", meaning: "a short break during a journey", example: "We will make a pit stop for lunch." },
      { phrase: "the open road", meaning: "long stretches of road with little traffic", example: "There is something freeing about the open road." },
    ],
    part3Questions: [
      { id: "q1", text: "Do you think road trips are more popular now than in the past?", ideas: ["Fuel costs, flights, changing attitudes", "Compare with your parents' generation"] },
      { id: "q2", text: "What are the advantages of travelling by car compared with public transport?", ideas: ["Flexibility versus cost and traffic", "A situation where each is better"] },
      { id: "q3", text: "How might self-driving cars change the way people travel?", ideas: ["Safety, convenience, long journeys", "Concerns people might still have"] },
    ],
  },
  {
    id: "cc-2026-16",
    part: "part2and3",
    topic: "Describe a person who solved a problem in a clever way.",
    period: "2026 Jan to Apr",
    bullets: [
      "who this person is",
      "what the problem was",
      "how they solved it",
      "and explain why you think their solution was clever",
    ],
    ideas: [
      "A colleague, friend, or family member",
      "A practical problem versus a personal one",
      "Whether the solution surprised you",
    ],
    vocab: [
      { phrase: "think outside the box", meaning: "think creatively, beyond usual methods", example: "She really thought outside the box." },
      { phrase: "come up with a solution", meaning: "produce an idea that solves a problem", example: "He came up with a solution nobody expected." },
      { phrase: "resourceful", meaning: "good at finding quick, clever ways to solve problems", example: "She is incredibly resourceful in a crisis." },
      { phrase: "a workaround", meaning: "a way to solve a problem despite obstacles", example: "He found a clever workaround." },
    ],
    part3Questions: [
      { id: "q1", text: "Do you think problem-solving skills can be taught, or are they natural?", ideas: ["Practice versus personality", "A method schools use to teach this"] },
      { id: "q2", text: "Are people more creative when working alone or in groups?", ideas: ["Brainstorming versus focused individual thought", "An example either way"] },
      { id: "q3", text: "How important is problem-solving ability in the modern workplace?", ideas: ["Fast-changing jobs and technology", "A job where this matters especially"] },
    ],
  },
  {
    id: "cc-2026-17",
    part: "part2and3",
    topic: "Describe a person who encouraged you to care about the environment.",
    period: "2026 May to Aug",
    bullets: [
      "who this person is",
      "how they showed care for the environment",
      "what they encouraged you to do",
      "and explain how this has affected your own habits",
    ],
    ideas: [
      "A teacher, parent, or friend",
      "Recycling, reducing waste, saving energy",
      "A specific habit you picked up because of them",
    ],
    vocab: [
      { phrase: "raise awareness", meaning: "help people notice and understand an issue", example: "She tries to raise awareness about plastic waste." },
      { phrase: "eco-friendly", meaning: "not harmful to the environment", example: "He switched to eco-friendly products." },
      { phrase: "lead by example", meaning: "show good behaviour through your own actions", example: "She leads by example with her own recycling habits." },
      { phrase: "cut down on waste", meaning: "reduce the amount of waste produced", example: "We have cut down on waste at home a lot." },
    ],
    part3Questions: [
      { id: "q1", text: "What can individuals realistically do to help protect the environment?", ideas: ["Small daily habits versus bigger lifestyle changes", "One change that made a real difference"] },
      { id: "q2", text: "Do you think governments or individuals hold more responsibility for environmental protection?", ideas: ["Policy and regulation versus personal choice", "Where the biggest impact tends to come from"] },
      { id: "q3", text: "How effective is environmental education in schools?", ideas: ["What is taught versus what is practised", "A way schools could do this better"] },
    ],
  },
  {
    id: "cc-2026-18",
    part: "part2and3",
    topic: "Describe a friend of yours who taught themselves a skill.",
    period: "2026 May to Aug",
    bullets: [
      "who this friend is",
      "what skill they taught themselves",
      "how they went about learning it",
      "and explain how you feel about what they achieved",
    ],
    ideas: [
      "A practical skill, a craft, or a sport",
      "Online resources, books, pure practice",
      "Whether it inspired you to try something similar",
    ],
    vocab: [
      { phrase: "a natural aptitude", meaning: "a built-in ability for something", example: "He has a natural aptitude for languages." },
      { phrase: "put in the hours", meaning: "spend a lot of time practising", example: "She really put in the hours to get good." },
      { phrase: "impressive", meaning: "causing admiration because of quality or skill", example: "What she achieved is genuinely impressive." },
      { phrase: "determined", meaning: "having a firm intention to achieve something", example: "He was determined to master it alone." },
    ],
    part3Questions: [
      { id: "q1", text: "Why do some people prefer learning independently rather than in a class?", ideas: ["Pace, cost, personal style", "A downside of learning entirely alone"] },
      { id: "q2", text: "What qualities help someone succeed at teaching themselves something new?", ideas: ["Discipline, curiosity, patience", "A quality you think matters most"] },
      { id: "q3", text: "Do you think online tutorials are as effective as traditional lessons?", ideas: ["Feedback and correction versus flexibility", "A skill better suited to each method"] },
    ],
  },
  {
    id: "cc-2026-19",
    part: "part2and3",
    topic: "Describe a live music event you went to but did not enjoy.",
    period: "2026 May to Aug",
    bullets: [
      "what the event was",
      "when and where it took place",
      "why you decided to go",
      "and explain why you did not enjoy it",
    ],
    ideas: [
      "Weather, crowd, sound quality, the performance itself",
      "Who you went with",
      "Whether you would go to something similar again",
    ],
    vocab: [
      { phrase: "a letdown", meaning: "something disappointing compared to expectations", example: "Honestly, the concert was a letdown." },
      { phrase: "poor sound quality", meaning: "audio that is unclear or badly balanced", example: "The poor sound quality ruined it a little." },
      { phrase: "live up to expectations", meaning: "be as good as hoped", example: "It did not quite live up to expectations." },
      { phrase: "packed", meaning: "extremely crowded", example: "The venue was completely packed." },
    ],
    part3Questions: [
      { id: "q1", text: "Why do people enjoy going to live music events despite the cost?", ideas: ["Atmosphere versus listening at home", "What a recording cannot offer"] },
      { id: "q2", text: "How has streaming changed the way people experience music?", ideas: ["Access to more music versus fewer shared experiences", "An effect on live concerts themselves"] },
      { id: "q3", text: "Do you think ticket prices for concerts are fair?", ideas: ["Cost of production versus what fans can afford", "Who benefits most from high prices"] },
    ],
  },
  {
    id: "cc-2026-20",
    part: "part2and3",
    topic: "Describe a film you watched recently and liked.",
    period: "2026 May to Aug",
    bullets: [
      "what the film was about",
      "when and where you watched it",
      "who recommended it, if anyone",
      "and explain why you liked it",
    ],
    ideas: [
      "Genre, main character, or a memorable scene",
      "Cinema versus watching at home",
      "Whether it stayed with you afterward",
    ],
    vocab: [
      { phrase: "a strong performance", meaning: "acting that is impressive and convincing", example: "The lead actor gave a strong performance." },
      { phrase: "well-directed", meaning: "skilfully made by the director", example: "It was a beautifully well-directed film." },
      { phrase: "a memorable scene", meaning: "a part of a film that stays in your memory", example: "The final scene was especially memorable." },
      { phrase: "critically acclaimed", meaning: "praised highly by critics", example: "It is a critically acclaimed film this year." },
    ],
    part3Questions: [
      { id: "q1", text: "Do you think film critics influence what people choose to watch?", ideas: ["Reviews versus word of mouth", "How much you personally trust reviews"] },
      { id: "q2", text: "How have streaming services changed the film industry?", ideas: ["Cinema releases versus straight to streaming", "Effects on smaller films"] },
      { id: "q3", text: "What makes a film successful in different countries?", ideas: ["Universal themes versus local culture", "An example of a film that travelled well"] },
    ],
  },
  {
    id: "cc-2026-21",
    part: "part2and3",
    topic: "Describe a time when you had to use your imagination.",
    period: "2026 May to Aug",
    bullets: [
      "when this happened",
      "what the situation was",
      "what you imagined or came up with",
      "and explain how it helped you",
    ],
    ideas: [
      "Solving a problem, writing, entertaining a child, a creative task at work",
      "A moment nothing obvious worked, so you improvised",
      "Whether the result surprised you",
    ],
    vocab: [
      { phrase: "come up with an idea", meaning: "think of a new idea", example: "I had to come up with an idea quickly." },
      { phrase: "think on your feet", meaning: "react quickly and cleverly to a situation", example: "You really have to think on your feet." },
      { phrase: "improvise", meaning: "do something without preparation, using what is available", example: "We had to improvise with what we had." },
      { phrase: "a creative solution", meaning: "an original way of solving a problem", example: "It turned out to be a creative solution." },
    ],
    part3Questions: [
      { id: "q1", text: "Do you think imagination is more important in childhood or adulthood?", ideas: ["Play versus problem-solving at work", "How imagination changes as people age"] },
      { id: "q2", text: "How can adults keep their imagination active?", ideas: ["Hobbies, reading, creative work", "A habit that helps you personally"] },
      { id: "q3", text: "Is imagination equally important in science and in art?", ideas: ["Creative thinking behind discoveries", "An example from either field"] },
    ],
  },
  {
    id: "cc-2026-22",
    part: "part2and3",
    topic: "Describe an interesting building you have seen.",
    period: "2026 May to Aug",
    bullets: [
      "where the building is",
      "what it looks like",
      "what it is used for",
      "and explain why you find it interesting",
    ],
    ideas: [
      "Its shape, age, or materials",
      "A building you saw on a trip or in your own city",
      "Whether you have been inside it",
    ],
    vocab: [
      { phrase: "striking", meaning: "very noticeable and impressive", example: "The design is genuinely striking." },
      { phrase: "blend in with", meaning: "match its surroundings well", example: "It blends in with the older buildings nearby." },
      { phrase: "a landmark", meaning: "a well-known building or feature of a place", example: "It has become a landmark in the city." },
      { phrase: "architectural style", meaning: "the particular design approach of a building", example: "It has a very distinctive architectural style." },
    ],
    part3Questions: [
      { id: "q1", text: "Do you think modern buildings are as interesting as older ones?", ideas: ["Innovation versus tradition", "An example of each"] },
      { id: "q2", text: "How important is it for cities to protect their historic buildings?", ideas: ["Identity and tourism versus development needs", "A city that balances this well"] },
      { id: "q3", text: "What factors should architects consider when designing new buildings?", ideas: ["Function, environment, community needs", "A factor you think is often overlooked"] },
    ],
  },
  {
    id: "cc-2026-23",
    part: "part2and3",
    topic: "Describe a person you know who often helps other people.",
    period: "2026 May to Aug",
    bullets: [
      "who this person is",
      "how they help others",
      "why they do it",
      "and explain how you feel about what they do",
    ],
    ideas: [
      "A family member, neighbour, colleague, or volunteer",
      "Practical help versus emotional support",
      "Whether they have influenced your own behaviour",
    ],
    vocab: [
      { phrase: "go out of your way", meaning: "make a special effort for someone", example: "She always goes out of her way to help." },
      { phrase: "selfless", meaning: "caring more about others than yourself", example: "It was a genuinely selfless thing to do." },
      { phrase: "lend a hand", meaning: "help someone with a task", example: "He is always happy to lend a hand." },
      { phrase: "community-minded", meaning: "caring about the wellbeing of a wider community", example: "She is very community-minded." },
    ],
    part3Questions: [
      { id: "q1", text: "Why do you think some people are more willing to help others than others?", ideas: ["Upbringing, personality, culture", "A moment that shaped someone's willingness"] },
      { id: "q2", text: "Do you think volunteering benefits the volunteer as much as the people helped?", ideas: ["Skills, connection, sense of purpose", "An example either way"] },
      { id: "q3", text: "How can communities encourage more people to help each other?", ideas: ["Organised programmes versus informal culture", "An idea you think would work well"] },
    ],
  },
  {
    id: "cc-2026-24",
    part: "part2and3",
    topic: "Describe something you bought that cost more than you expected.",
    period: "2026 May to Aug",
    bullets: [
      "what you bought",
      "where you bought it",
      "why it cost more than expected",
      "and explain how you felt about the purchase afterward",
    ],
    ideas: [
      "A big purchase or something surprisingly small but pricey",
      "Hidden costs, taxes, or a change in price",
      "Whether you regretted it or thought it was worth it",
    ],
    vocab: [
      { phrase: "break the bank", meaning: "cost much more than expected or affordable", example: "It nearly broke the bank, to be honest." },
      { phrase: "worth every penny", meaning: "good value despite a high price", example: "In the end, it was worth every penny." },
      { phrase: "overpriced", meaning: "priced higher than something is really worth", example: "I thought it was a little overpriced." },
      { phrase: "a hidden cost", meaning: "an extra expense not obvious at first", example: "There was a hidden cost I had not noticed." },
    ],
    part3Questions: [
      { id: "q1", text: "Do you think people spend too much on things they do not really need?", ideas: ["Advertising and social pressure", "Where you personally draw the line"] },
      { id: "q2", text: "How do people usually decide whether a purchase is worth the price?", ideas: ["Quality, brand, necessity, reviews", "A factor that matters most to you"] },
      { id: "q3", text: "Has online shopping made people more or less careful with money?", ideas: ["Ease of buying versus price comparison tools", "Your own experience either way"] },
    ],
  },
  {
    id: "cc-2026-25",
    part: "part2and3",
    topic: "Describe a time you encouraged someone to try something new.",
    period: "2026 May to Aug",
    bullets: [
      "who you encouraged",
      "what you encouraged them to try",
      "why you thought they should try it",
      "and explain what happened as a result",
    ],
    ideas: [
      "A hobby, food, place, or challenge",
      "How you convinced them",
      "Whether they thanked you afterward",
    ],
    vocab: [
      { phrase: "talk someone into something", meaning: "persuade someone to do something", example: "I talked her into trying it." },
      { phrase: "take a leap", meaning: "do something bold despite uncertainty", example: "He finally took a leap and gave it a go." },
      { phrase: "step out of your comfort zone", meaning: "try something unfamiliar", example: "It pushed her out of her comfort zone." },
      { phrase: "pay off", meaning: "produce good results in the end", example: "My encouragement really paid off." },
    ],
    part3Questions: [
      { id: "q1", text: "Why are some people more resistant to trying new things than others?", ideas: ["Fear of failure, personality, past experience", "How this changes with age"] },
      { id: "q2", text: "Do you think trying new experiences becomes harder as people get older?", ideas: ["Routine and responsibility versus curiosity", "An example that goes against this"] },
      { id: "q3", text: "What role do friends and family play in encouraging personal growth?", ideas: ["Support, honest feedback, pushing gently", "A specific example from your own life"] },
    ],
  },
  {
    id: "cc-2026-26",
    part: "part2and3",
    topic: "Describe a TV programme or online series you enjoy watching.",
    period: "2026 May to Aug",
    bullets: [
      "what the programme is",
      "what it is about",
      "how often you watch it",
      "and explain why you enjoy it",
    ],
    ideas: [
      "Drama, comedy, documentary, or something else",
      "Who you usually watch it with",
      "A character or storyline you particularly like",
    ],
    vocab: [
      { phrase: "binge-watch", meaning: "watch many episodes in a row", example: "I binge-watched the whole series in a weekend." },
      { phrase: "a season finale", meaning: "the final episode of a season", example: "The season finale was full of surprises." },
      { phrase: "well written", meaning: "skilfully scripted", example: "The dialogue is really well written." },
      { phrase: "keep you hooked", meaning: "keep you very interested and wanting more", example: "Each episode keeps you hooked." },
    ],
    part3Questions: [
      { id: "q1", text: "How has streaming changed the way people watch television?", ideas: ["Binge-watching versus weekly episodes", "Effects on how shows are made"] },
      { id: "q2", text: "Do you think TV programmes can influence people's opinions and behaviour?", ideas: ["Representation, normalising ideas, advertising", "An example that shows this clearly"] },
      { id: "q3", text: "What kinds of programmes do you think are most beneficial for children to watch?", ideas: ["Educational content versus pure entertainment", "Balance between the two"] },
    ],
  },
  {
    id: "cc-2026-27",
    part: "part2and3",
    topic: "Describe a short-term job in a foreign country that you would like to try.",
    period: "2026 May to Aug",
    bullets: [
      "what the job would be",
      "which country you would go to",
      "what skills it would require",
      "and explain why this job appeals to you",
    ],
    ideas: [
      "Seasonal work, an internship, volunteering with pay",
      "Language skills you would need to prepare",
      "What you would want to gain from it",
    ],
    vocab: [
      { phrase: "gain experience", meaning: "build practical knowledge through doing something", example: "It would help me gain valuable experience." },
      { phrase: "a seasonal job", meaning: "work available only during a certain time of year", example: "It is more of a seasonal job." },
      { phrase: "immerse yourself in", meaning: "become fully involved in something", example: "I would love to immerse myself in a new culture." },
      { phrase: "a career boost", meaning: "something that helps advance your career", example: "It could be a real career boost." },
    ],
    part3Questions: [
      { id: "q1", text: "What skills do employers value most in someone applying for work abroad?", ideas: ["Language, adaptability, independence", "A skill you would need to develop"] },
      { id: "q2", text: "Do you think short-term work abroad is more valuable than studying abroad?", ideas: ["Practical experience versus formal education", "Could someone benefit from both?"] },
      { id: "q3", text: "What challenges might someone face finding short-term work in another country?", ideas: ["Visas, language, local job markets", "How people usually overcome these"] },
    ],
  },
  {
    id: "cc-2026-28",
    part: "part2and3",
    topic: "Describe a close friend who matters a lot to you.",
    period: "2026 May to Aug",
    bullets: [
      "who this friend is",
      "how you met",
      "what you usually do together",
      "and explain why this friendship matters to you",
    ],
    ideas: [
      "Childhood friend, university friend, or a more recent one",
      "A memory that shows what they mean to you",
      "How the friendship has changed over time",
    ],
    vocab: [
      { phrase: "a kindred spirit", meaning: "someone who shares your values or interests closely", example: "She is a kindred spirit, really." },
      { phrase: "through thick and thin", meaning: "in both good times and bad", example: "We have stuck together through thick and thin." },
      { phrase: "see eye to eye", meaning: "agree with or understand each other well", example: "We see eye to eye on most things." },
      { phrase: "reliable", meaning: "someone you can depend on", example: "He has always been incredibly reliable." },
    ],
    part3Questions: [
      { id: "q1", text: "What do you think makes a friendship last a long time?", ideas: ["Trust, shared history, effort", "A friendship that has lasted despite distance"] },
      { id: "q2", text: "Is it harder to maintain friendships as people get older?", ideas: ["Work, family, distance", "How people adapt to this"] },
      { id: "q3", text: "Do you think online friendships can be as meaningful as in-person ones?", ideas: ["Depth versus convenience", "An example either way"] },
    ],
  },
  {
    id: "cc-2026-29",
    part: "part2and3",
    topic: "Describe a wild animal you would like to learn more about.",
    period: "2026 May to Aug",
    bullets: [
      "what animal it is",
      "where it usually lives",
      "what you already know about it",
      "and explain why you would like to learn more about it",
    ],
    ideas: [
      "Something you saw in a documentary, zoo, or in person",
      "A behaviour or ability that fascinates you",
      "Whether it is endangered or under threat",
    ],
    vocab: [
      { phrase: "a natural habitat", meaning: "the environment an animal naturally lives in", example: "It thrives in its natural habitat." },
      { phrase: "endangered", meaning: "at risk of disappearing entirely", example: "The species is sadly endangered." },
      { phrase: "fascinating", meaning: "extremely interesting", example: "Its behaviour is absolutely fascinating." },
      { phrase: "adapt to", meaning: "change to survive in certain conditions", example: "It has adapted to survive in extreme cold." },
    ],
    part3Questions: [
      { id: "q1", text: "Why do you think some people are so interested in wildlife?", ideas: ["Curiosity, connection to nature, documentaries", "What sparked your own interest, if any"] },
      { id: "q2", text: "What can be done to protect endangered animals?", ideas: ["Habitat protection, laws, education", "An organisation or effort you know of"] },
      { id: "q3", text: "Do zoos play a useful role in protecting wildlife?", ideas: ["Conservation and education versus animal welfare concerns", "Your own view, briefly"] },
    ],
  },
  {
    id: "cc-2026-30",
    part: "part2and3",
    topic: "Describe a friend of yours who is talented at music or singing.",
    period: "2026 May to Aug",
    bullets: [
      "who this friend is",
      "how you found out about their talent",
      "how they developed this talent",
      "and explain how you feel about their ability",
    ],
    ideas: [
      "An instrument, singing, or both",
      "Lessons versus self-teaching",
      "A performance you have seen them give",
    ],
    vocab: [
      { phrase: "gifted", meaning: "having a natural, strong talent", example: "She is genuinely gifted musically." },
      { phrase: "hit every note", meaning: "sing or play accurately and well", example: "He hits every note perfectly." },
      { phrase: "practise for hours", meaning: "spend a long time rehearsing", example: "She practises for hours every week." },
      { phrase: "a natural performer", meaning: "someone who is comfortable and skilled performing", example: "He is a real natural performer." },
    ],
    part3Questions: [
      { id: "q1", text: "Do you think musical talent is mostly natural or mostly learned?", ideas: ["Nature versus years of practice", "An example that supports either view"] },
      { id: "q2", text: "How important is music education in schools?", ideas: ["Confidence, discipline, creativity", "Whether your own school offered much music"] },
      { id: "q3", text: "Has technology made it easier for musicians to become known?", ideas: ["Social media versus traditional routes", "An example of an artist discovered online"] },
    ],
  },
  {
    id: "cc-2026-31",
    part: "part2and3",
    topic: "Describe a time when you changed an important decision.",
    period: "2026 Sep to Dec",
    bullets: [
      "what the original decision was",
      "what made you change it",
      "how difficult the change was",
      "and explain how you felt afterward",
    ],
    ideas: [
      "A decision about study, work, or a relationship",
      "New information or advice that changed your mind",
      "Whether you think it was the right choice",
    ],
    vocab: [
      { phrase: "have second thoughts", meaning: "begin to doubt a decision already made", example: "I started having second thoughts halfway through." },
      { phrase: "change your mind", meaning: "decide differently from before", example: "I changed my mind at the last moment." },
      { phrase: "weigh up the pros and cons", meaning: "consider the advantages and disadvantages", example: "I weighed up the pros and cons carefully." },
      { phrase: "a leap of faith", meaning: "a decision made with uncertainty but hope", example: "It felt like a leap of faith." },
    ],
    part3Questions: [
      { id: "q1", text: "Why do people sometimes find it hard to change a decision once it is made?", ideas: ["Pride, sunk effort, fear of judgement", "An example that shows this"] },
      { id: "q2", text: "Do you think it is better to make decisions quickly or take time?", ideas: ["Depends on the type of decision", "A situation where speed mattered, or backfired"] },
      { id: "q3", text: "How much should other people's opinions influence our decisions?", ideas: ["Advice versus independent judgement", "Where you personally draw the line"] },
    ],
  },
  {
    id: "cc-2026-32",
    part: "part2and3",
    topic: "Describe a noisy place you have visited.",
    period: "2026 Sep to Dec",
    bullets: [
      "where this place was",
      "when you went there",
      "what caused the noise",
      "and explain how the noise made you feel",
    ],
    ideas: [
      "A market, a concert, a busy street, an airport",
      "Whether the noise was pleasant or unpleasant",
      "How you coped with it",
    ],
    vocab: [
      { phrase: "deafening", meaning: "extremely loud", example: "The traffic noise was almost deafening." },
      { phrase: "a cacophony of sound", meaning: "a loud, confusing mixture of noises", example: "It was a cacophony of sound and colour." },
      { phrase: "overwhelming", meaning: "so intense it is hard to cope with", example: "The noise was honestly overwhelming." },
      { phrase: "drown out", meaning: "be so loud it covers other sounds", example: "The music drowned out our conversation." },
    ],
    part3Questions: [
      { id: "q1", text: "Do you think noise pollution is a serious problem in cities?", ideas: ["Traffic, construction, crowds", "Effects on health and concentration"] },
      { id: "q2", text: "What can city planners do to reduce noise in urban areas?", ideas: ["Green spaces, quiet zones, regulation", "An example from a city you know"] },
      { id: "q3", text: "Are people more sensitive to noise than they used to be?", ideas: ["Busier cities versus greater awareness of wellbeing", "Your own observation"] },
    ],
  },
  {
    id: "cc-2026-33",
    part: "part2and3",
    topic: "Describe an older person that you admire.",
    period: "2026 Sep to Dec",
    bullets: [
      "who this person is",
      "how you know them",
      "what they have done that you admire",
      "and explain why you admire them",
    ],
    ideas: [
      "A grandparent, older relative, neighbour, or mentor",
      "A quality like patience, wisdom, or resilience",
      "A story that shows this quality clearly",
    ],
    vocab: [
      { phrase: "wise beyond words", meaning: "showing great wisdom", example: "She is wise beyond words, honestly." },
      { phrase: "resilient", meaning: "able to recover quickly from difficulty", example: "He has remained remarkably resilient." },
      { phrase: "a wealth of experience", meaning: "a great deal of life experience", example: "She has a wealth of experience to share." },
      { phrase: "age gracefully", meaning: "grow older with dignity and calm", example: "She has aged so gracefully." },
    ],
    part3Questions: [
      { id: "q1", text: "What can younger people learn from older generations?", ideas: ["Patience, perspective, practical knowledge", "A lesson you personally learned"] },
      { id: "q2", text: "Do you think older people are respected enough in modern society?", ideas: ["Compare cultures or generations", "A change you have noticed"] },
      { id: "q3", text: "How can communities better support elderly people?", ideas: ["Social contact, healthcare, involvement", "An idea you think would help"] },
    ],
  },
  {
    id: "cc-2026-34",
    part: "part2and3",
    topic: "Describe an activity you do regularly that you think is a waste of time.",
    period: "2026 Sep to Dec",
    bullets: [
      "what the activity is",
      "how often you do it",
      "why you keep doing it anyway",
      "and explain why you consider it a waste of time",
    ],
    ideas: [
      "Scrolling on a phone, commuting, a chore, a habit",
      "Whether it is genuinely useless or just feels that way",
      "What you would do instead if you stopped",
    ],
    vocab: [
      { phrase: "a time-waster", meaning: "something that uses up time without much benefit", example: "Honestly, it is a bit of a time-waster." },
      { phrase: "mindless", meaning: "done without much thought", example: "It is fairly mindless, if I am honest." },
      { phrase: "cut back on", meaning: "reduce how much you do something", example: "I have tried to cut back on it lately." },
      { phrase: "a guilty pleasure", meaning: "something enjoyable you feel slightly bad about doing", example: "It has become a bit of a guilty pleasure." },
    ],
    part3Questions: [
      { id: "q1", text: "Why do people continue habits they know are not useful?", ideas: ["Comfort, routine, lack of alternatives", "A habit you personally struggled to break"] },
      { id: "q2", text: "Do you think free time should always be spent productively?", ideas: ["Rest versus productivity", "Where the balance lies for you"] },
      { id: "q3", text: "How has technology changed the way people spend their free time?", ideas: ["Phones and streaming versus older habits", "A change you have noticed in yourself"] },
    ],
  },
  {
    id: "cc-2026-35",
    part: "part2and3",
    topic: "Describe a time you received excellent service in a shop.",
    period: "2026 Sep to Dec",
    bullets: [
      "where this happened",
      "what you were buying",
      "what the staff member did",
      "and explain why the service impressed you",
    ],
    ideas: [
      "A small local shop or a large store",
      "A specific moment of helpfulness",
      "Whether it made you a returning customer",
    ],
    vocab: [
      { phrase: "go above and beyond", meaning: "do much more than expected", example: "The staff went above and beyond to help." },
      { phrase: "attentive", meaning: "paying close, helpful attention", example: "The assistant was really attentive." },
      { phrase: "leave a lasting impression", meaning: "be remembered well afterward", example: "It left a lasting impression on me." },
      { phrase: "customer loyalty", meaning: "a customer's tendency to keep returning", example: "Good service really builds customer loyalty." },
    ],
    part3Questions: [
      { id: "q1", text: "What makes customer service good or bad, in your opinion?", ideas: ["Attitude, speed, problem-solving", "An example of poor service, briefly"] },
      { id: "q2", text: "Do you think online shopping has affected the quality of customer service?", ideas: ["Fewer human interactions versus convenience", "Where service still matters most"] },
      { id: "q3", text: "How important is good customer service for a business's success?", ideas: ["Repeat customers, reputation, word of mouth", "A business that stands out for this"] },
    ],
  },
  {
    id: "cc-2026-36",
    part: "part2and3",
    topic: "Describe a city you have visited and would like to visit again.",
    period: "2026 Sep to Dec",
    bullets: [
      "which city it was",
      "when you visited",
      "what you did there",
      "and explain why you would like to go back",
    ],
    ideas: [
      "Something you did not have time to see",
      "The atmosphere or people you remember",
      "Who you would take with you next time",
    ],
    vocab: [
      { phrase: "a vibrant atmosphere", meaning: "a lively, energetic feeling in a place", example: "The city has such a vibrant atmosphere." },
      { phrase: "leave a mark", meaning: "have a lasting effect or impression", example: "That trip really left a mark on me." },
      { phrase: "barely scratch the surface", meaning: "experience only a small part of something", example: "We barely scratched the surface of the city." },
      { phrase: "a hidden gem", meaning: "a wonderful place that is not widely known", example: "We found a hidden gem of a cafe there." },
    ],
    part3Questions: [
      { id: "q1", text: "Why do you think some cities attract far more tourists than others?", ideas: ["History, culture, marketing, transport links", "A city you think is underrated"] },
      { id: "q2", text: "How can cities manage the effects of mass tourism?", ideas: ["Crowds, prices, environmental impact", "An example of a city managing this well"] },
      { id: "q3", text: "Do you think revisiting a place is better than exploring somewhere new?", ideas: ["Familiarity versus novelty", "Your own preference and why"] },
    ],
  },
  {
    id: "cc-2026-37",
    part: "part2and3",
    topic: "Describe someone you know who overcame a difficult challenge.",
    period: "2026 Sep to Dec",
    bullets: [
      "who this person is",
      "what the challenge was",
      "how they dealt with it",
      "and explain how you feel about what they achieved",
    ],
    ideas: [
      "A health issue, a setback at work or study, a personal loss",
      "What kept them going",
      "Whether it changed them as a person",
    ],
    vocab: [
      { phrase: "overcome an obstacle", meaning: "successfully deal with a difficulty", example: "She overcame every obstacle in her way." },
      { phrase: "persevere", meaning: "continue trying despite difficulty", example: "He persevered even when things looked bleak." },
      { phrase: "a turning point", meaning: "a moment that changes the course of events", example: "That year was a real turning point for her." },
      { phrase: "come out stronger", meaning: "become more capable after a hard experience", example: "She came out stronger on the other side." },
    ],
    part3Questions: [
      { id: "q1", text: "What qualities help people overcome major setbacks in life?", ideas: ["Support, determination, a positive outlook", "A quality you think matters most"] },
      { id: "q2", text: "Does facing difficulty always make a person stronger?", ideas: ["Positive versus negative outcomes", "An example either way"] },
      { id: "q3", text: "How important is support from others when someone is going through a hard time?", ideas: ["Family, friends, professional help", "A time support made a real difference"] },
    ],
  },
  {
    id: "cc-2026-38",
    part: "part2and3",
    topic: "Describe a well-known person from your local area.",
    period: "2026 Sep to Dec",
    bullets: [
      "who this person is",
      "what they are known for",
      "how you first heard of them",
      "and explain what you think of them",
    ],
    ideas: [
      "An artist, sportsperson, business owner, or activist",
      "Local fame versus national fame",
      "Whether you have ever met them",
    ],
    vocab: [
      { phrase: "a household name", meaning: "someone very widely known locally or nationally", example: "She has become a household name here." },
      { phrase: "make a name for yourself", meaning: "become known for an achievement", example: "He made a name for himself through his charity work." },
      { phrase: "a local legend", meaning: "someone admired and well known in a community", example: "He is a bit of a local legend." },
      { phrase: "give back to the community", meaning: "help the community that supported you", example: "She always tries to give back to the community." },
    ],
    part3Questions: [
      { id: "q1", text: "Why do some local figures become well known beyond their own area?", ideas: ["Talent, media coverage, social media", "An example you know of"] },
      { id: "q2", text: "Do you think local celebrities have a responsibility to their community?", ideas: ["Setting an example versus private life", "Your own view"] },
      { id: "q3", text: "How has social media changed how people become well known?", ideas: ["Traditional media versus online fame", "An example of someone who became known this way"] },
    ],
  },
  {
    id: "cc-2026-39",
    part: "part2and3",
    topic: "Describe a happy person you know.",
    period: "2026 Sep to Dec",
    bullets: [
      "who this person is",
      "how you know them",
      "what makes them happy",
      "and explain why you think they are such a happy person",
    ],
    ideas: [
      "A friend, relative, or colleague",
      "Their outlook on life versus their circumstances",
      "How being around them affects you",
    ],
    vocab: [
      { phrase: "upbeat", meaning: "positive and cheerful", example: "She is always upbeat, even on hard days." },
      { phrase: "content", meaning: "satisfied and at peace", example: "He seems genuinely content with his life." },
      { phrase: "a positive outlook", meaning: "a tendency to see things optimistically", example: "She has such a positive outlook on everything." },
      { phrase: "infectious laughter", meaning: "laughter that makes others laugh too", example: "Her laughter is completely infectious." },
    ],
    part3Questions: [
      { id: "q1", text: "Do you think happiness depends more on circumstances or on attitude?", ideas: ["Wealth and health versus mindset", "An example that shows this"] },
      { id: "q2", text: "Has modern life made people happier or less happy overall?", ideas: ["Convenience versus pressure and comparison", "Your own view, briefly"] },
      { id: "q3", text: "What role does money play in a person's happiness?", ideas: ["Basic needs versus beyond a certain point", "A view you have heard or agree with"] },
    ],
  },
  {
    id: "cc-2026-40",
    part: "part2and3",
    topic: "Describe a well-organised person you know.",
    period: "2026 Sep to Dec",
    bullets: [
      "who this person is",
      "how you know them",
      "how they stay organised",
      "and explain how their organisation affects their life",
    ],
    ideas: [
      "Lists, routines, calendars",
      "A colleague, friend, or family member",
      "Whether you have tried to copy their habits",
    ],
    vocab: [
      { phrase: "methodical", meaning: "doing things in a careful, ordered way", example: "He is very methodical about everything." },
      { phrase: "a to-do list", meaning: "a written list of tasks to complete", example: "She never goes anywhere without a to-do list." },
      { phrase: "punctual", meaning: "always on time", example: "She is always punctual, without fail." },
      { phrase: "keep everything in order", meaning: "maintain a tidy, well-managed system", example: "He keeps everything in order at work." },
    ],
    part3Questions: [
      { id: "q1", text: "Do you think organisational skills can be learned, or are they natural?", ideas: ["Habit and practice versus personality", "An example that supports your view"] },
      { id: "q2", text: "How does being organised affect someone's performance at work or study?", ideas: ["Time management, stress, reliability", "An example from your own experience"] },
      { id: "q3", text: "Are digital tools like apps making people more or less organised?", ideas: ["Reminders and calendars versus over-reliance", "Your own experience with these tools"] },
    ],
  },
  {
    id: "cc-2026-41",
    part: "part2and3",
    topic: "Describe a natural place in a city that you like.",
    period: "2026 Sep to Dec",
    bullets: [
      "where it is",
      "what it looks like",
      "how often you go there",
      "and explain why you like this place",
    ],
    ideas: [
      "A park, riverbank, garden, or hill within the city",
      "What you do there",
      "How it compares with the rest of the city",
    ],
    vocab: [
      { phrase: "an urban oasis", meaning: "a calm, green place within a busy city", example: "It feels like a real urban oasis." },
      { phrase: "lush greenery", meaning: "thick, healthy plant growth", example: "The park is full of lush greenery." },
      { phrase: "a peaceful retreat", meaning: "a calm place to escape to", example: "It has become my peaceful retreat after work." },
      { phrase: "tranquil", meaning: "calm and quiet", example: "It is remarkably tranquil for somewhere so central." },
    ],
    part3Questions: [
      { id: "q1", text: "Why is it important for cities to have natural spaces?", ideas: ["Mental health, air quality, community", "A benefit you have noticed yourself"] },
      { id: "q2", text: "Do you think enough is being done to protect green spaces in cities?", ideas: ["Development pressure versus conservation", "An example either way"] },
      { id: "q3", text: "How might city parks change in the future?", ideas: ["Climate concerns, technology, design trends", "A change you would like to see"] },
    ],
  },
  {
    id: "cc-2026-42",
    part: "part2and3",
    topic: "Describe a skill you learned when you were a child.",
    period: "2026 Sep to Dec",
    bullets: [
      "what the skill was",
      "who taught you",
      "how long it took to learn",
      "and explain how this skill has been useful to you since",
    ],
    ideas: [
      "Swimming, cycling, cooking, a craft, an instrument",
      "A parent, grandparent, or teacher",
      "Whether you still use it today",
    ],
    vocab: [
      { phrase: "master a skill", meaning: "become highly capable at something", example: "It took years to master it fully." },
      { phrase: "second nature", meaning: "something so familiar it needs no thought", example: "It became second nature after a while." },
      { phrase: "hands-on learning", meaning: "learning by doing, not just watching", example: "It was all hands-on learning." },
      { phrase: "stick with you", meaning: "remain useful or remembered over time", example: "That skill really stuck with me." },
    ],
    part3Questions: [
      { id: "q1", text: "What skills do you think all children should learn early in life?", ideas: ["Practical, social, or academic skills", "A skill you wish had been taught earlier"] },
      { id: "q2", text: "Do children learn skills differently from adults?", ideas: ["Playfulness, less fear of mistakes", "An example that shows this"] },
      { id: "q3", text: "How important are parents in teaching children practical skills?", ideas: ["Compared with schools or other sources", "Your own experience"] },
    ],
  },
  {
    id: "cc-2026-43",
    part: "part2and3",
    topic: "Describe someone you know whose hobby is photography.",
    period: "2026 Sep to Dec",
    bullets: [
      "who this person is",
      "how they became interested in photography",
      "what they usually photograph",
      "and explain how good you think they are at it",
    ],
    ideas: [
      "A friend, relative, or colleague",
      "Equipment they use, phone or camera",
      "A photo of theirs that stayed with you",
    ],
    vocab: [
      { phrase: "a keen eye", meaning: "a natural ability to notice good detail or composition", example: "She has a real keen eye for detail." },
      { phrase: "composition", meaning: "how elements are arranged within a photo", example: "The composition of her shots is excellent." },
      { phrase: "an amateur photographer", meaning: "someone who takes photos as a hobby, not professionally", example: "He is just an amateur photographer, but very good." },
      { phrase: "develop an eye for", meaning: "gradually become skilled at noticing something", example: "She has developed a real eye for light." },
    ],
    part3Questions: [
      { id: "q1", text: "How has technology changed photography as a hobby?", ideas: ["Phones versus traditional cameras", "Editing and sharing photos instantly"] },
      { id: "q2", text: "Do you think photography should be considered a form of art?", ideas: ["Technical skill versus creative vision", "Your own view, briefly"] },
      { id: "q3", text: "Why do people enjoy taking photos of everyday moments?", ideas: ["Memory, sharing, mindfulness", "A moment you were glad you photographed"] },
    ],
  },
];
