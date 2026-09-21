/* Extra dictionary part: "how to approach it" advice for reading and
   listening question types.

   Sources: src/data/reading-strategies.ts and
   src/data/listening-strategies.ts, shown by src/components/StrategyPanel.tsx
   during trainer drills. Loaded only by screens that call useT('strategies').

   Question type names (the `label` field of each entry) are deliberately NOT
   here: the student has to recognise "Matching Headings" and "True / False /
   Not Given" on the real paper, so they stay English inside the Russian
   sentence. The same goes for the answer words NOT GIVEN and NO, and for the
   English phrases quoted as examples of what a speaker says. */

export const strings: Record<string, string> = {
  /* ---- Reading: True / False / Not Given ---- */
  'Read each statement carefully and identify keywords.':
    'Внимательно прочитайте каждое утверждение и выделите ключевые слова.',
  'Scan the passage to locate the relevant section (answers appear in order).':
    'Просмотрите текст и найдите нужный фрагмент (ответы идут по порядку).',
  'Read that section and the sentences around it. Not just one line.':
    'Прочитайте этот фрагмент вместе с соседними предложениями, а не одну строку.',
  'Focus on meaning, not just word-matching. The passage will paraphrase the statement.':
    'Смотрите на смысл, а не на совпадение слов: в тексте утверждение будет перефразировано.',
  'Be especially careful with NOT GIVEN. Ask: "does the passage give any information about this at all?"':
    'Особенно осторожно с NOT GIVEN. Спросите себя: есть ли в тексте вообще хоть что-то об этом?',
  '"believed" ≠ factual truth': '"believed" это не то же самое, что факт',
  'numbers without context (increase? decrease?)': 'цифры без контекста (рост? снижение?)',
  'idiomatic expressions. Read for meaning': 'идиомы: читайте по смыслу',

  /* ---- Reading: Multiple Choice ---- */
  'Read the question and all of the options carefully before looking at the passage.':
    'Сначала внимательно прочитайте вопрос и все варианты, и только потом текст.',
  'Identify differences between the options. They may be subtly different.':
    'Найдите, чем варианты отличаются друг от друга: разница бывает очень тонкой.',
  'Prepare paraphrases and synonyms for the question keywords.':
    'Заранее подберите синонимы и перефразировки к ключевым словам вопроса.',
  'Scan the passage for the relevant section (answers come in order).':
    'Найдите в тексте нужный фрагмент (ответы идут по порядку).',
  'Read the surrounding sentences. Not just the one that matches.':
    'Читайте соседние предложения, а не только то, которое совпало.',
  'You may see information about several of the options in the passage. Unless the instructions ask for more than one answer, only one is correct.':
    'В тексте может встретиться информация сразу о нескольких вариантах. Если в инструкции не сказано выбрать больше одного, правильный только один.',
  'Choose based on deeper meaning, not just word-matching.': 'Выбирайте по смыслу, а не по совпадению слов.',
  'every option may appear somewhere in the passage. Appearing is not the same as answering the question':
    'каждый вариант может где-то встретиться в тексте, но встретиться и ответить на вопрос это разные вещи',
  'similar-sounding options with small but crucial differences':
    'похожие варианты с маленькой, но решающей разницей',

  /* ---- Reading: Matching Headings ---- */
  'Read through all the headings first and note synonyms/paraphrases.':
    'Сначала прочитайте все заголовки и отметьте синонимы и перефразировки.',
  'For each paragraph, read to find its central aim. What is the paragraph mainly about?':
    'В каждом абзаце ищите главную мысль: о чём он в основном?',
  'Distinguish between the main idea and supporting examples or details.':
    'Отделяйте главную мысль от примеров и деталей, которые её подкрепляют.',
  'Eliminate headings that only match one sentence in the paragraph.':
    'Отбрасывайте заголовки, которые подходят только к одному предложению абзаца.',
  'Watch for headings that look similar. Compare them carefully.':
    'Следите за похожими заголовками и сравнивайте их внимательно.',
  'Your answer must be a roman numeral, written the way it appears in the list (e.g. iii).':
    'Ответ пишется римской цифрой, ровно так, как она стоит в списке (например, iii).',
  'choosing a heading that matches one detail, not the whole paragraph':
    'взять заголовок, который подходит к одной детали, а не ко всему абзацу',
  'headings with similar wording. Look at meaning, not just words':
    'заголовки с похожими формулировками: смотрите на смысл, а не на слова',

  /* ---- Reading: Matching Information ---- */
  'Read all the statements first and identify keywords and paraphrases.':
    'Сначала прочитайте все утверждения и выделите ключевые слова и возможные перефразировки.',
  'Skim the passage to get a sense of what each paragraph covers.':
    'Быстро просмотрите текст, чтобы понять, о чём каждый абзац.',
  'For each statement, scan the passage for keywords or synonyms.':
    'Для каждого утверждения ищите в тексте ключевые слова или их синонимы.',
  'When you find the relevant section, confirm it contains the information in the statement.':
    'Найдя нужный фрагмент, убедитесь, что в нём действительно есть информация из утверждения.',
  'Remember: a paragraph can answer more than one question. Check the instructions.':
    'Помните: один абзац может отвечать сразу на несколько вопросов. Проверьте инструкцию.',
  'confusing this with Matching Headings': 'спутать это задание с Matching Headings',
  'forgetting that one letter can be used more than once when the instructions allow it':
    'забыть, что одну букву можно использовать несколько раз, если инструкция это разрешает',
  'expecting the answers in passage order. This is one of the types that does not follow it':
    'ждать ответов по порядку текста: как раз в этом типе порядка нет',

  /* ---- Reading: Sentence Completion ---- */
  'Read each incomplete sentence and identify keywords before searching.':
    'Прочитайте каждое незаконченное предложение и выделите ключевые слова, прежде чем искать.',
  'Think about what type of word is missing (noun, verb, adjective, number?).':
    'Подумайте, какая часть речи пропущена: существительное, глагол, прилагательное, число?',
  'Scan the passage using keywords and synonyms to locate the relevant section.':
    'Найдите нужный фрагмент по ключевым словам и синонимам.',
  'Read carefully around that section and identify the exact word(s) that complete the sentence logically and grammatically.':
    'Внимательно прочитайте вокруг этого места и найдите точные слова, которые завершают предложение и по смыслу, и грамматически.',
  'Write the answer. Check spelling and word count.':
    'Запишите ответ и проверьте орфографию и количество слов.',
  'paraphrasing instead of copying exact words':
    'пересказать своими словами вместо того, чтобы списать точные слова',
  'going over the word limit': 'превысить лимит слов',
  'ignoring grammar. The completed sentence must make grammatical sense':
    'не следить за грамматикой: готовое предложение должно быть грамматически верным',

  /* ---- Reading: Diagram / Table Labelling ---- */
  'Study the diagram first. What is it showing? What parts are labelled and what are blank?':
    'Сначала разберитесь в схеме: что на ней показано, какие части подписаны, а какие пустые?',
  'Read the passage and identify the section that describes it.':
    'Прочитайте текст и найдите фрагмент, где схема описана.',
  'Match each blank to the position on the diagram. Think about location/function.':
    'Соотнесите каждый пропуск с местом на схеме: думайте о расположении и назначении.',
  'Find the exact word(s) in the passage that name that part.':
    'Найдите в тексте точные слова, которыми названа эта часть.',
  'Check the word limit. Never exceed it.': 'Проверьте лимит слов и никогда его не превышайте.',
  'writing paraphrases instead of exact passage words': 'писать пересказ вместо точных слов из текста',
  'exceeding the word limit': 'выйти за лимит слов',
  'misspelling technical terms': 'ошибиться в написании термина',

  /* ---- Reading: Matching Features ---- */
  'Read the options carefully. Understand what each one represents (people, theories, places, dates, or groups).':
    'Внимательно прочитайте варианты и поймите, что стоит за каждым: люди, теории, места, даты или группы.',
  'Skim the passage to identify which section refers to each option.':
    'Просмотрите текст и определите, какой фрагмент относится к какому варианту.',
  'Read each statement and identify keywords.':
    'Прочитайте каждое утверждение и выделите ключевые слова.',
  'Locate the relevant passage section and decide which option the information belongs to.':
    'Найдите нужный фрагмент и решите, к какому варианту относится эта информация.',
  "Don't panic if the same letter appears several times. That's normal.":
    'Не пугайтесь, если одна и та же буква встречается несколько раз. Это нормально.',
  'using general knowledge. Rely only on the passage':
    'опираться на общие знания: полагайтесь только на текст',
  'assuming each option is used only once': 'считать, что каждый вариант используется только один раз',

  /* ---- Reading: Yes / No / Not Given ---- */
  'Underline words in the statement that show it is about an opinion, not a fact.':
    'Подчеркните в утверждении слова, которые показывают, что речь о мнении, а не о факте.',
  'Scan for the matching part of the passage. Answers come in the same order as the passage.':
    'Найдите соответствующее место в тексте: ответы идут в том же порядке, что и текст.',
  "Check whose opinion is being reported. A view the writer only quotes from someone else is not automatically the writer's own.":
    'Проверьте, чьё мнение изложено. Взгляд, который автор просто цитирует, не становится автоматически его собственным.',
  "Compare the statement's strength to the writer's: an absolute claim is NO if the writer only hints at something weaker.":
    'Сравните, насколько категорично утверждение и насколько категоричен автор: если автор лишь намекает на нечто более слабое, ответ NO.',
  'If the writer never states a view on the exact point, choose NOT GIVEN. Do not guess what they would probably think.':
    'Если автор нигде не высказывается именно по этому поводу, выбирайте NOT GIVEN. Не додумывайте, что он, скорее всего, думает.',
  "a strong opinion reported from someone else mistaken for the writer's own":
    'принять резкое чужое мнение за мнение самого автора',
  'assuming NOT GIVEN means the writer disagrees, when they simply never mention it':
    'решить, что NOT GIVEN означает несогласие автора, хотя он просто об этом не говорит',

  /* ---- Reading: Matching Sentence Endings ---- */
  'Read every beginning first, and check what grammatical form each one needs to continue naturally.':
    'Сначала прочитайте все начала предложений и посмотрите, какая грамматическая форма нужна каждому для естественного продолжения.',
  'Read every ending too, and note its grammatical form before matching anything.':
    'Прочитайте и все окончания, отметив их грамматическую форму, прежде чем что-то соединять.',
  'Eliminate any ending whose grammar cannot follow a given beginning, even if the topic looks related.':
    'Отбросьте окончания, которые грамматически не могут идти за этим началом, даже если тема похожа.',
  "Scan the passage for the section covering each beginning's topic. Answers appear in passage order.":
    'Найдите в тексте фрагмент по теме каждого начала. Ответы идут в порядке текста.',
  "Confirm the surviving ending against the passage's actual facts, not just how fluent it sounds.":
    'Проверьте оставшееся окончание по фактам из текста, а не по тому, насколько гладко оно звучит.',
  'an ending that fits grammatically but contradicts the passage':
    'окончание, которое подходит грамматически, но противоречит тексту',
  'two endings that both sound plausible for the same beginning':
    'два окончания, которые оба звучат правдоподобно для одного начала',

  /* ---- Reading: Summary, Note, Table & Flow-chart Completion ---- */
  'Read the whole summary, notes, table, or flow-chart first, ignoring the gaps, to see what part of the passage it retells.':
    'Сначала прочитайте весь конспект, таблицу или схему целиком, не обращая внимания на пропуски, чтобы понять, какую часть текста они пересказывают.',
  'For each gap, decide what kind of word is missing (a noun, a number, a process, a name?).':
    'Для каждого пропуска решите, что там пропало: существительное, число, процесс, название?',
  'Find the part of the passage the task is drawn from. The answers usually all sit inside that one part, though not necessarily in the order of the gaps.':
    'Найдите ту часть текста, откуда взято задание. Обычно все ответы находятся внутри неё, хотя и не обязательно в порядке пропусков.',
  'If choosing from a box, compare each remaining option carefully. More than one may look tempting.':
    'Если варианты даны в рамке, внимательно сравнивайте оставшиеся: заманчивых может оказаться несколько.',
  'Reread the completed sentence or step to check it makes grammatical sense and matches the passage.':
    'Перечитайте готовое предложение или шаг и проверьте, что оно грамматически верно и совпадает с текстом.',
  "writing a paraphrase instead of the passage's exact word":
    'написать пересказ вместо точного слова из текста',
  'going over the stated word limit': 'выйти за указанный лимит слов',

  /* ---- Listening: Sentence, Note & Short-answer Completion ---- */
  'Before the audio starts, read the gaps and predict what type of word is missing: a name, a number, a date, a place, or a single noun.':
    'До начала записи прочитайте пропуски и предположите, что там пропущено: имя, число, дата, место или одно существительное.',
  'The answers come in the same order as the recording, so let each gap guide you to the next one as you listen.':
    'Ответы идут в том же порядке, что и запись, поэтому каждый пропуск подсказывает, где вы сейчас находитесь.',
  'Listen for a signal that the speaker is about to correct themselves (for example, "sorry, I mean" or "actually, make that"). When that happens, the later version is the one that counts.':
    'Ловите момент, когда говорящий поправляет себя (например, "sorry, I mean" или "actually, make that"). В этом случае считается более поздний вариант.',
  'Numbers, dates and spellings are usually dictated directly. Write exactly what you hear, including any letters spelled out.':
    'Числа, даты и написание по буквам обычно диктуют прямо. Записывайте ровно то, что слышите, включая продиктованные буквы.',
  'The speaker will often mention a detail first and then reject or change it. Do not commit to the first thing you hear if the sentence keeps going.':
    'Часто говорящий сначала называет деталь, а потом отказывается от неё или меняет её. Не хватайтесь за первое услышанное, если фраза продолжается.',
  'Check the word limit before you listen. A hyphenated word (for example, "well-known") counts as one word even though it has a hyphen.':
    'Проверьте лимит слов до прослушивания. Слово через дефис (например, "well-known") считается одним словом.',
  'Figures are accepted even when the instructions say "words", so write "15" rather than "fifteen" unless the limit says otherwise.':
    'Цифры принимаются, даже если в инструкции сказано "words", так что пишите "15", а не "fifteen", если не сказано иначе.',
  'writing the first number or word you hear, before the speaker corrects it':
    'записать первое услышанное число или слово, пока говорящий его не исправил',
  'missing a spelled-out word because you stopped listening':
    'пропустить продиктованное по буквам слово, потому что перестали слушать',

  /* ---- Listening: Multiple Choice ---- */
  'Read the question and every option before the audio for that part begins. There is no time to read once the speaker starts.':
    'Прочитайте вопрос и все варианты до того, как начнётся запись этой части. Когда говорящий начнёт, читать будет некогда.',
  'Underline the key idea in each option so you know exactly what to listen for.':
    'Подчеркните главную мысль каждого варианта, чтобы точно знать, что слушать.',
  'The recording usually mentions all the options, but only one matches what is actually said. Expect the others to be distractors.':
    'В записи обычно упоминаются все варианты, но сказанному соответствует только один. Остальные это отвлекающие варианты.',
  'Listen for a correction or change of mind ("at first we thought... but actually"). The final statement is the one that counts, not the first.':
    'Слушайте, не передумал ли говорящий ("at first we thought... but actually"). Считается последнее сказанное, а не первое.',
  'Answers come in the same order as the questions, so once the topic of the next question begins, the current one is almost certainly finished.':
    'Ответы идут в порядке вопросов, поэтому как только началась тема следующего вопроса, предыдущий почти наверняка закончен.',
  'Choose the option that matches the meaning of what is said, not just a word you happen to recognise.':
    'Выбирайте вариант по смыслу сказанного, а не по случайно узнанному слову.',
  'choosing an option because you heard its exact wording, when the speaker then rejected it':
    'выбрать вариант, потому что услышали его формулировку, хотя говорящий её потом отверг',
  'picking an answer before the speaker finishes the sentence':
    'выбрать ответ, не дослушав предложение до конца',
  'assuming the first idea mentioned is the final answer':
    'считать, что первая прозвучавшая мысль и есть ответ',

  /* ---- Listening: Table, Form & Note Completion ---- */
  'Look at the table, form or notes before listening. The headings and any given information show what kind of detail (a name, a number, an address) belongs in each gap.':
    'Посмотрите на таблицу, бланк или конспект до прослушивания. Заголовки и уже вписанные данные показывают, какая деталь (имя, число, адрес) нужна в каждом пропуске.',
  'The gaps are filled in the same order as the conversation, so treat each one as a signpost for where you are in the recording.':
    'Пропуски заполняются в порядке разговора, так что каждый из них показывает, где вы находитесь в записи.',
  'Names and addresses are often spelled out letter by letter. Write down each letter as you hear it.':
    'Имена и адреса часто диктуют по буквам. Записывайте каждую букву сразу, как услышали.',
  'Numbers, including phone numbers, dates and prices, are dictated directly. Write the figures, not the words, unless told otherwise.':
    'Числа, включая телефоны, даты и цены, диктуют прямо. Пишите цифрами, а не словами, если не сказано иначе.',
  'If the speaker corrects a detail (for example, changes a date or a spelling), keep the later version.':
    'Если говорящий исправляет деталь (например, меняет дату или написание), оставляйте более поздний вариант.',
  'Check the stated word or figure limit for the gap. A hyphenated word counts as one word.':
    'Проверьте указанный лимит слов или цифр для пропуска. Слово через дефис считается одним словом.',
  'writing a detail that is later corrected by the speaker':
    'записать деталь, которую говорящий потом исправил',
  'missing letters while a name or address is being spelled':
    'потерять буквы, пока диктуют имя или адрес',
  'confusing similar-sounding numbers (for example, thirteen and thirty)':
    'спутать похожие на слух числа (например, thirteen и thirty)',

  /* ---- Listening: Multiple Answer ---- */
  'Read all the options before listening. Note exactly how many you need to choose, the question states it.':
    'Прочитайте все варианты до прослушивания. Отметьте, сколько именно нужно выбрать, это указано в вопросе.',
  'The recording will usually mention every option. Some are confirmed, some are rejected or replaced. Only the confirmed ones count.':
    'В записи обычно упоминается каждый вариант. Одни подтверждают, другие отвергают или заменяют. Считаются только подтверждённые.',
  'Listen to the full discussion of each option. Do not select a choice the moment you hear it named, it may be dismissed moments later.':
    'Дослушайте обсуждение каждого варианта. Не отмечайте его сразу, как услышали название: через пару секунд его могут отбросить.',
  'The correct options are not always confirmed in the same order as the printed list, so keep tracking every option until the part ends.':
    'Правильные варианты подтверждаются не обязательно в том порядке, в каком они напечатаны, поэтому следите за всеми до конца части.',
  'Stop adjusting your answers once the topic clearly moves on. Speakers rarely return to an earlier point.':
    'Как только тема явно сменилась, перестаньте править ответы. Говорящие редко возвращаются к прошлому.',
  'selecting an option as soon as it is mentioned, before hearing whether it is accepted or rejected':
    'отметить вариант сразу после упоминания, не дослушав, приняли его или отвергли',
  'choosing too few or too many options': 'выбрать слишком мало или слишком много вариантов',

  /* ---- Listening: Matching ---- */
  'Read the list of options first and understand what each one represents: a person, a place, an opinion, or a service.':
    'Сначала прочитайте список вариантов и поймите, что стоит за каждым: человек, место, мнение или услуга.',
  'The items to match usually come up in the order they appear in the recording, so follow along in order.':
    'Пункты для сопоставления обычно идут в порядке записи, поэтому двигайтесь по порядку.',
  "Listen for the description or opinion attached to each item, not just the item's name.":
    'Слушайте описание или мнение, привязанное к каждому пункту, а не только его название.',
  'The same option can be used more than once unless the instructions say otherwise. Check the instructions before assuming each is used only once.':
    'Один и тот же вариант можно использовать несколько раз, если в инструкции не сказано иначе. Проверьте инструкцию, прежде чем считать, что каждый идёт один раз.',
  'Distractor options may be mentioned and then ruled out. Rely on what the speaker settles on, not on the first mention.':
    'Отвлекающие варианты могут прозвучать, а потом быть отброшены. Ориентируйтесь на то, к чему говорящий пришёл, а не на первое упоминание.',
  'assuming each option can only be used once when the instructions do not say that':
    'считать, что вариант можно использовать только один раз, хотя в инструкции этого нет',
  "matching by the option's name rather than by the description actually given":
    'сопоставлять по названию варианта, а не по тому описанию, которое дали',

  /* ---- Listening: Categorisation ---- */
  'Read the category headings first and understand what belongs in each group.':
    'Сначала прочитайте названия категорий и поймите, что относится к каждой группе.',
  'Items to sort come up in the order they are discussed, so listen for one at a time.':
    'Пункты для сортировки идут в порядке обсуждения, поэтому слушайте по одному.',
  'The speaker may place an item in one category and then move it, or compare it against another. Keep the final placement, not the first one mentioned.':
    'Говорящий может отнести пункт к одной категории, а потом переставить его или сравнить с другой. Оставляйте итоговое место, а не первое названное.',
  'Some categories may end up with more items than others. Do not force an even split.':
    'В одних категориях может оказаться больше пунктов, чем в других. Не пытайтесь делить поровну.',
  'Listen for the reason given for each placement, it usually contains the exact clue that decides the category.':
    'Слушайте причину, по которой пункт куда-то отнесли: обычно именно в ней и лежит подсказка.',
  'placing an item in the first category mentioned, before hearing the full reasoning':
    'отнести пункт к первой названной категории, не дослушав рассуждение',
  'assuming categories are filled evenly': 'считать, что категории заполняются поровну',

  /* ---- Listening: Diagram / Map Labelling ---- */
  'Study the diagram or map before listening. Identify what is already labelled and where reference points (entrances, north) are.':
    'Изучите схему или карту до прослушивания. Найдите, что уже подписано и где ориентиры (входы, север).',
  'The labels are usually described in a logical order, for example moving around a room or map. Follow the direction as it is described.':
    'Подписи обычно описывают в логическом порядке, например обходя комнату или карту. Двигайтесь в том же направлении.',
  'Listen for prepositions of place and direction (next to, opposite, past, turn left). These fix the exact position, not just the object named.':
    'Слушайте предлоги места и направления (next to, opposite, past, turn left). Именно они задают точное положение, а не само название объекта.',
  'Names and letters are sometimes spelled out. Write them exactly as dictated.':
    'Имена и буквы иногда диктуют по буквам. Записывайте их ровно так, как продиктовали.',
  'If the speaker changes direction or corrects a position, keep the corrected version.':
    'Если говорящий меняет направление или исправляет положение, оставляйте исправленный вариант.',
  'placing a label based on the object mentioned, without listening to the direction word that fixes its position':
    'ставить подпись по названному объекту, не слушая слово направления, которое задаёт его место',
  'losing track of your position on the diagram after a direction change':
    'потерять своё место на схеме после смены направления',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
