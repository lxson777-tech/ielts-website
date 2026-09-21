/* Extra dictionary part: the band guides, by far the biggest block of
   guidance on the site.

   Source: src/data/band-guides.ts, shown by BandLadder (/learn/bands) and by
   BandReport inside WritingTester, WritingHistory, SpeakingTester and
   LiveExaminer. Loaded only by screens that call useT('band-guides'), which
   is the whole point: this is roughly 70 KB of English, and a Russian
   student who never opens the band ladder should never download a Russian
   copy of it. See src/lib/i18n/dict/parts.ts.

   What stays English, and why:
   - Band numbers and the word Band, exactly as an examiner report prints
     them ("band 7", "Band 9").
   - The criterion names: Task Response, Task Achievement, Coherence and
     Cohesion, Lexical Resource, Grammatical Range and Accuracy, Fluency and
     Coherence, Pronunciation.
   - Task 1 / Task 2 and Part 1 / Part 2 / Part 3.
   - Short phrases quoted from the official descriptors, in quotation marks,
     so a student can recognise them if they read the real thing.
   - The example sentences themselves (example.before / example.after in the
     data file). They are not marked for translation at all: they are the
     English a student writes or says, and the pair only means something in
     English.

   Everything else is advice, and is here in Russian. Ordered exactly as the
   strings appear in src/data/band-guides.ts, criterion by criterion and band
   step by band step, so the two files can be read side by side. */

export const strings: Record<string, string> = {
  "At band 4 the essay format can be wrong and your position can be unclear. At band 5 the descriptors ask you to at least use the right format, take a position (even if the development is not always clear), and state main ideas that a reader can identify, even if they are limited.":
    "На band 4 формат эссе может быть неверным, а позиция неясной. На band 5 дескрипторы требуют хотя бы верного формата, заявленной позиции (пусть развитие не всегда понятно) и главных мыслей, которые читатель может различить, пусть их и немного.",
  "Write in the correct essay format: an introduction, two or more body paragraphs, and a conclusion. Not a list, not a letter.":
    "Пишите в правильном формате эссе: вступление, два или больше основных абзаца и заключение. Не список и не письмо.",
  "State your opinion or position in one clear sentence in the introduction.":
    "Заявите своё мнение или позицию одним ясным предложением во вступлении.",
  "Give each main idea its own paragraph, at least two body paragraphs.":
    "Дайте каждой главной мысли отдельный абзац, минимум два основных абзаца.",
  "Check that your answer responds to the exact question asked, not a related question you find easier.":
    "Проверьте, что вы отвечаете именно на заданный вопрос, а не на похожий, который кажется легче.",
  "Stop writing a response vague enough to answer several different questions. Tie every sentence to the exact wording of the prompt.":
    "Перестаньте писать ответ настолько общий, что он подошёл бы к нескольким разным вопросам. Привяжите каждое предложение к точной формулировке задания.",
  "Stop leaving your opinion out of opinion essays.":
    "Перестаньте обходиться без своего мнения в эссе, где мнение требуется.",
  "The first version states no position and could belong to almost any essay. The second names a clear opinion in one sentence, which band 5 requires even if the rest of the essay stays simple.":
    "В первом варианте позиции нет, он подошёл бы почти к любому эссе. Во втором мнение названо одним предложением, а это и требуется на band 5, даже если дальше эссе остаётся простым.",
  "Take 5 past Task 2 questions. Spend 2 minutes each writing only a one-sentence thesis statement that states your position. 10 to 15 minutes total, no essays.":
    "Возьмите 5 прошлых вопросов Task 2. На каждый потратьте 2 минуты и напишите только одно предложение со своей позицией. Всего 10-15 минут, эссе писать не нужно.",
  "Task 1 (Academic) is scored on Task Achievement, not Task Response: at band 5 you generally address the task and describe some detail, but there is no clear overview and there may be no data used to support the description. Focus first on covering every key feature of the chart or diagram.":
    "Task 1 (Academic) оценивается по Task Achievement, а не по Task Response: на band 5 вы в целом отвечаете на задание и описываете какие-то детали, но внятного обзора нет, и данные могут не подкреплять описание. Сначала добейтесь того, чтобы были названы все ключевые особенности графика или схемы.",
  "Band 6 asks you to address the task even if some parts get more coverage than others, keep a relevant position (even if the conclusion becomes repetitive), and present relevant main ideas even if some are under-developed. Band 5 allows a task addressed only partially, with unclear development and possibly no conclusion.":
    "Band 6 требует раскрыть задание, пусть одни части и подробнее других, держать уместную позицию (даже если заключение выходит повторяющимся) и приводить уместные главные мысли, пусть некоторые и недоразвиты. Band 5 допускает задание, раскрытое лишь частично, с непонятным развитием и, возможно, без заключения.",
  "Give every part of a multi-part question real attention, at least several sentences, not one throwaway line.":
    "Уделите каждой части составного вопроса настоящее внимание, хотя бы несколько предложений, а не одну проходную строчку.",
  "Write an actual concluding sentence that restates your position in different words, not a copy of the introduction.":
    "Напишите настоящее завершающее предложение, которое повторяет вашу позицию другими словами, а не копирует вступление.",
  "Delete any sentence that does not support one of your main ideas.":
    "Удалите все предложения, которые не работают ни на одну из ваших главных мыслей.",
  "Keep your position identical from your introduction to your conclusion.":
    "Держите позицию одной и той же от вступления до заключения.",
  "Stop giving the part of the question you find less interesting only one sentence.":
    "Перестаньте отделываться одним предложением от той части вопроса, которая вам менее интересна.",
  "Stop adding facts or examples that do not connect to the point you are making.":
    "Перестаньте добавлять факты и примеры, которые не связаны с вашей мыслью.",
  "The first sentence only announces that a conclusion is happening. The second restates the actual position in fresh words, which band 6 requires for a \"relevant position\" to hold through the end.":
    "Первое предложение только объявляет, что начинается заключение. Второе повторяет саму позицию свежими словами, а это и нужно на band 6, чтобы \"relevant position\" дожила до конца.",
  "Write one full conclusion paragraph (3 sentences: summary, restated position, closing thought) for a question you already have an essay plan for. 10 minutes.":
    "Напишите один полный абзац заключения (3 предложения: итог, повтор позиции, завершающая мысль) к вопросу, план эссе для которого у вас уже есть. 10 минут.",
  "Band 7 requires addressing ALL parts of the task in full, not some parts more than others, a clear position held THROUGHOUT the response (not one that becomes unclear or repetitive), and main ideas that are extended and supported, not just stated. The descriptor still allows some over-generalising at band 7.":
    "Band 7 требует раскрыть ВСЕ части задания полностью, а не одни подробнее других, держать ясную позицию НА ПРОТЯЖЕНИИ всего ответа, а не такую, которая теряется или сводится к повторам, и развивать и подкреплять главные мысли, а не просто заявлять их. Некоторые обобщения на band 7 дескриптор ещё допускает.",
  "Give equal, full development to every part of the question, including the part you find harder.":
    "Развивайте каждую часть вопроса одинаково полно, включая ту, которая даётся труднее.",
  "Extend every main idea with a specific reason, cause, or example, not just a stated claim.":
    "Продолжайте каждую главную мысль конкретной причиной, поводом или примером, а не одним заявлением.",
  "Repeat your position explicitly in each body paragraph, so a reader never has to guess where you stand.":
    "Прямо повторяйте свою позицию в каждом основном абзаце, чтобы читателю не приходилось догадываться, на чём вы стоите.",
  "Replace vague generalisations (\"many people believe\") with a concrete, specific detail where you can.":
    "Заменяйте расплывчатые обобщения (\"many people believe\") конкретной деталью там, где это возможно.",
  "Stop stating an idea and moving straight to the next one without extending it.":
    "Перестаньте заявлять мысль и сразу переходить к следующей, не развив её.",
  "Stop letting your position drift into vague \"both sides have a point\" language by the conclusion.":
    "Перестаньте позволять позиции сползти к расплывчатому \"both sides have a point\" к заключению.",
  "The first pair of sentences states a claim without extending it. The second names the specific effect and the reason behind it, which is what \"extends and supports\" means at band 7.":
    "Первая пара предложений заявляет мысль и не развивает её. Вторая называет конкретное следствие и причину за ним, а это и означает \"extends and supports\" на band 7.",
  "Pick one body paragraph from an old essay. Rewrite it by adding one sentence of explanation and one specific example. 15 minutes.":
    "Возьмите один основной абзац из старого эссе. Перепишите его, добавив одно предложение с объяснением и один конкретный пример. 15 минут.",
  "Band 8 requires all parts sufficiently addressed with a well-developed response, and ideas that are relevant, extended and supported, without the tendency to over-generalise that band 7 still allows. Support needs to be concrete, not a broad statement dressed up as an example.":
    "Band 8 требует, чтобы все части были раскрыты достаточно, ответ был хорошо развит, а мысли были уместными, развёрнутыми и подкреплёнными, без склонности к обобщениям, которую band 7 ещё допускает. Подкрепление должно быть конкретным, а не общим утверждением под видом примера.",
  "Support every main idea with a specific, concrete example: a named scenario, a real situation, a precise fact, not a general statement.":
    "Подкрепляйте каждую главную мысль конкретным примером: названным случаем, реальной ситуацией, точным фактом, а не общим утверждением.",
  "Build each body paragraph from at least two or three connected sentences, not one.":
    "Стройте каждый основной абзац хотя бы из двух или трёх связанных предложений, а не из одного.",
  "Check each claim for a hidden generalisation (\"everyone\", \"in today's society\") and replace it with something specific.":
    "Проверяйте каждое утверждение на скрытое обобщение (\"everyone\", \"in today's society\") и заменяйте его чем-то конкретным.",
  "Balance the depth of every part of the task so none feels thinner than the rest.":
    "Выровняйте глубину всех частей задания, чтобы ни одна не выглядела жиже остальных.",
  "Stop supporting points with sweeping generalisations. Name a specific case instead.":
    "Перестаньте подкреплять мысли широкими обобщениями. Называйте конкретный случай.",
  "Stop giving one paragraph noticeably less development than the others.":
    "Перестаньте развивать один абзац заметно слабее остальных.",
  "The first sentence is a broad claim with no real support. The second grounds the same point in a specific, checkable fact, which is what removes the \"over-generalise\" weakness band 7 still allows.":
    "Первое предложение это широкое утверждение без настоящего подкрепления. Второе ставит ту же мысль на конкретный, проверяемый факт, и именно это убирает слабость с обобщениями, которую band 7 ещё допускает.",
  "Take 3 general claims from a past essay and rewrite each with one specific, named example in place of the vague statement. 15 minutes.":
    "Возьмите 3 общих утверждения из прошлого эссе и перепишите каждое, поставив вместо расплывчатой фразы конкретный названный пример. 15 минут.",
  "Band 9 requires fully addressing all parts of the task, a fully developed position, and ideas that are fully extended and well supported, with no gaps anywhere. This band is rare: it means excellent task handling with no weak spot at all, not just strong writing overall.":
    "Band 9 требует полностью раскрыть все части задания, полностью развить позицию и полностью развернуть и подкрепить мысли, без пробелов где бы то ни было. Этот балл редкий: он означает безупречную работу с заданием без единого слабого места, а не просто сильное письмо в целом.",
  "Address every angle of the question, including implications the prompt does not spell out directly.":
    "Раскройте вопрос со всех сторон, включая следствия, которые в задании прямо не названы.",
  "Extend every idea as far as it reasonably goes: cause, effect, example, and a brief acknowledgement of a counterpoint.":
    "Разворачивайте каждую мысль настолько, насколько это разумно: причина, следствие, пример и короткое признание контраргумента.",
  "Re-read the prompt after finishing and confirm nothing was left implicit or half-answered.":
    "Перечитайте задание после того, как закончили, и убедитесь, что ничего не осталось недосказанным или раскрытым наполовину.",
  "Stop treating any single part of the task as \"good enough\". At band 9 every part needs full development.":
    "Перестаньте считать какую-либо часть задания достаточной. На band 9 каждая часть требует полного развития.",
  "The first sentence states a position without engaging its complexity. The second extends the idea fully: who is affected, a fair counterpoint, and how the counterpoint is addressed, which is the standard band 9 asks for.":
    "Первое предложение заявляет позицию, не вникая в её сложность. Второе разворачивает мысль полностью: кого это касается, честный контраргумент и как на него отвечают, а это и есть уровень band 9.",
  "Choose one already-strong essay. For each body paragraph, add one sentence that acknowledges a counterpoint or limitation. 20 minutes.":
    "Возьмите одно уже сильное эссе. К каждому основному абзацу добавьте по предложению, которое признаёт контраргумент или ограничение. 20 минут.",
  "For Task 1 (Academic), band 9 Task Achievement means fully satisfying every requirement of the task with a fully developed response and a clear, accurate overview. At this level the overview should already read as complete; the remaining work is making every supporting detail precise.":
    "Для Task 1 (Academic) band 9 по Task Achievement означает полное выполнение всех требований задания, полностью развитый ответ и ясный, точный обзор. На этом уровне обзор уже должен читаться как завершённый; остаётся сделать точной каждую подкрепляющую деталь.",
  "At band 4 the essay may have no real paragraphing and no progression at all. Band 5 asks for at least some organisation and, even if paragraphing is inadequate, an attempt at paragraphs rather than one unbroken block of text.":
    "На band 4 эссе может быть вообще без абзацев и без всякого продвижения мысли. Band 5 требует хотя бы какой-то организации и попытки делить текст на абзацы, пусть и неудачной, вместо одного сплошного куска.",
  "Break your essay into clear paragraphs: introduction, body paragraphs, conclusion, each starting on a new line.":
    "Разбейте эссе на ясные абзацы: вступление, основные абзацы, заключение, каждый с новой строки.",
  "Use at least one linking word per paragraph (however, because, for example).":
    "Используйте хотя бы одно слово-связку на абзац (however, because, for example).",
  "Open each paragraph with a sentence that names its main idea.":
    "Начинайте каждый абзац с предложения, которое называет его главную мысль.",
  "Use a pronoun (it, this, they) to refer back to something already named, instead of repeating the same noun every time.":
    "Используйте местоимение (it, this, they), чтобы сослаться на уже названное, вместо того чтобы каждый раз повторять одно и то же существительное.",
  "Stop writing without paragraph breaks.":
    "Перестаньте писать без деления на абзацы.",
  "Stop repeating the same word three or more times in one paragraph when a pronoun or synonym would work.":
    "Перестаньте повторять одно слово три раза и больше в одном абзаце, если подошло бы местоимение или синоним.",
  "The first version repeats \"cars\" three times with no connection between the sentences. The second uses \"they\" and \"their\" to refer back, and links the ideas with \"since\", which is the basic referencing band 5 is checking for.":
    "В первом варианте \"cars\" повторяется три раза, а предложения ничем не связаны. Во втором есть \"they\" и \"their\", которые отсылают назад, и связка \"since\": это и есть базовая связность, которую проверяет band 5.",
  "Take one paragraph you have already written. Underline every repeated noun and replace at least half of them with a pronoun or synonym. 10 minutes.":
    "Возьмите уже написанный абзац. Подчеркните каждое повторяющееся существительное и замените хотя бы половину местоимением или синонимом. 10 минут.",
  "Band 6 asks for information arranged coherently with a clear overall progression, and cohesive devices used effectively even if sometimes mechanical. Band 5 allows a lack of overall progression and inaccurate or over-used cohesive devices.":
    "Band 6 требует связно выстроенной информации с ясным общим продвижением мысли и средств связи, которые работают, пусть иногда и механически. Band 5 допускает отсутствие общего продвижения и неточные или заезженные средства связи.",
  "Make each paragraph follow logically from the one before it, using a transition sentence at the start.":
    "Сделайте так, чтобы каждый абзац логично следовал из предыдущего, с переходным предложением в начале.",
  "Use referencing words (this, these, such) instead of repeating full noun phrases.":
    "Используйте отсылающие слова (this, these, such) вместо повтора целых именных групп.",
  "Limit yourself to one or two linking words per paragraph rather than one per sentence.":
    "Ограничьтесь одним или двумя словами-связками на абзац, а не одним на каждое предложение.",
  "Give every paragraph one clear topic. Do not mix two ideas in the same paragraph.":
    "Дайте каждому абзацу одну ясную тему. Не смешивайте две мысли в одном абзаце.",
  "Stop starting three sentences in a row with the same linking word (\"Moreover... Moreover... Furthermore...\").":
    "Перестаньте начинать три предложения подряд одной и той же связкой (\"Moreover... Moreover... Furthermore...\").",
  "Stop mixing unrelated ideas inside a single paragraph.":
    "Перестаньте смешивать несвязанные мысли внутри одного абзаца.",
  "Repeating \"Moreover\" three times is the over-use band 5 struggles with. The revised version links the first two related ideas naturally and marks the contrast with \"However\", which reads as effective rather than mechanical.":
    "Три \"Moreover\" подряд это как раз то злоупотребление, с которым застревает band 5. В исправленном варианте две близкие мысли связаны естественно, а противопоставление помечено через \"However\", и это читается как рабочая связь, а не как механическая.",
  "Find every linking word in a past essay. Circle any word used more than twice and replace at least two with a different connective or with no connective at all where the logic is already clear. 15 minutes.":
    "Найдите все слова-связки в прошлом эссе. Обведите те, что встречаются больше двух раз, и замените хотя бы две другой связкой или вовсе уберите, если логика и так ясна. 15 минут.",
  "Band 7 requires clear progression THROUGHOUT the whole response, not just overall, a RANGE of cohesive devices used appropriately, and a clear central topic within EACH paragraph, not most of them.":
    "Band 7 требует ясного продвижения мысли НА ПРОТЯЖЕНИИ всего ответа, а не только в целом, РАЗНООБРАЗИЯ средств связи, использованных уместно, и ясной центральной темы в КАЖДОМ абзаце, а не в большинстве.",
  "Use a variety of linking devices across the essay: addition, contrast, cause and result, and example connectors, not just \"however\" and \"moreover\" repeated.":
    "Используйте разные средства связи по всему эссе: для добавления, противопоставления, причины и следствия, примера, а не одни только повторяющиеся \"however\" и \"moreover\".",
  "Give every single paragraph one clear central topic sentence, with no exceptions.":
    "Дайте абсолютно каждому абзацу одно ясное тематическое предложение, без исключений.",
  "Make sure referencing words (it, this, these) are always unambiguous: a reader must know exactly what they point to.":
    "Следите, чтобы отсылающие слова (it, this, these) всегда были однозначны: читатель должен точно понимать, на что они указывают.",
  "Read through the whole essay and check that each paragraph flows into the next without a logical jump.":
    "Перечитайте эссе целиком и проверьте, что каждый абзац переходит в следующий без логического скачка.",
  "Stop using \"and\" or \"also\" as your main way of connecting ideas across the whole essay.":
    "Перестаньте связывать мысли по всему эссе в основном через \"and\" и \"also\".",
  "Stop letting a paragraph drift onto a second, unrelated idea partway through.":
    "Перестаньте позволять абзацу уезжать на вторую, постороннюю мысль посередине.",
  "Using \"also\" twice treats an addition and a contrast as if they were the same relationship. \"For instance\" and \"that said\" mark the actual logical relationships, which is the range of devices band 7 is looking for.":
    "Два \"also\" подряд подают добавление и противопоставление как одно и то же отношение. \"For instance\" и \"that said\" помечают настоящие логические связи, а это и есть то разнообразие средств, которое ищет band 7.",
  "Write the topic sentence only for each paragraph of a planned essay. Check each one states a single, distinct idea with no overlap. 10 minutes.":
    "Напишите только тематические предложения для каждого абзаца запланированного эссе. Проверьте, что каждое называет одну отдельную мысль и они не накладываются. 10 минут.",
  "Band 8 requires managing all aspects of cohesion well and sequencing ideas logically, with paragraphing that is both sufficient and appropriate. Band 7 still allows some under-use or over-use of cohesive devices; band 8 should feel controlled rather than occasionally mismatched.":
    "Band 8 требует хорошо управлять всеми сторонами связности и выстраивать мысли логично, с делением на абзацы, которого достаточно и которое уместно. Band 7 ещё допускает, что средств связи где-то мало, а где-то много; на band 8 это должно ощущаться как контроль, а не как случайные промахи.",
  "Remove any linking word that is not needed. Let logical order do some of the work instead of a connector on every sentence.":
    "Уберите все слова-связки, без которых можно обойтись. Пусть часть работы делает сам порядок мыслей, а не связка на каждом предложении.",
  "Vary paragraph length according to content. Do not force every paragraph to the same length if an idea genuinely needs more room.":
    "Меняйте длину абзацев по содержанию. Не подгоняйте все абзацы под одну длину, если какой-то мысли действительно нужно больше места.",
  "Combine cohesive techniques inside one paragraph (a reference word, a substitution, and one linking word) instead of relying on a single repeated device.":
    "Сочетайте приёмы связности внутри одного абзаца (отсылающее слово, замена и одна связка) вместо одного повторяющегося средства.",
  "Reread specifically for over-use of \"however\", \"moreover\", and \"furthermore\", and cut or vary as needed.":
    "Перечитайте специально ради \"however\", \"moreover\" и \"furthermore\": где их слишком много, уберите или замените.",
  "Stop opening every paragraph with the same formulaic linker. Vary how paragraphs begin.":
    "Перестаньте начинать каждый абзац одной и той же дежурной связкой. Меняйте начала абзацев.",
  "Stop inserting a linking word where the logic is already obvious without one.":
    "Перестаньте вставлять связку там, где логика и без неё очевидна.",
  "The original stacks \"Furthermore\" onto a sentence that does not need it and buries the actual point. The revision drops the unneeded connector and lets the sentence structure itself carry the logical link, which reads as more controlled at band 8.":
    "В исходном варианте \"Furthermore\" приклеено к предложению, которому оно не нужно, и главная мысль тонет. В исправленном лишняя связка убрана, а логику несёт само строение предложения, что на band 8 читается как больший контроль.",
  "Take a finished essay and delete every linking word you can remove without losing meaning. Compare the two versions for clarity. 15 minutes.":
    "Возьмите готовое эссе и удалите все слова-связки, которые можно убрать без потери смысла. Сравните два варианта на ясность. 15 минут.",
  "Band 9 requires cohesion managed so well it \"attracts no attention\", with skilful paragraphing throughout. This is a rare band: the organisation should be essentially invisible, carried by word choice and sentence order rather than visible connecting devices.":
    "Band 9 требует настолько хорошо выстроенной связности, что она \"attracts no attention\", и умелого деления на абзацы по всему тексту. Это редкий балл: организация должна быть по сути незаметной, её несут выбор слов и порядок предложений, а не видимые связки.",
  "Let ideas connect through meaning and word choice rather than visible linking words. Aim for at least one paragraph with no explicit connector that still flows perfectly.":
    "Пусть мысли связываются через смысл и выбор слов, а не через видимые связки. Добейтесь хотя бы одного абзаца без единой явной связки, который при этом читается безупречно.",
  "Vary sentence openings so the essay never leans on a small, repeated set of transition phrases.":
    "Меняйте начала предложений, чтобы эссе не держалось на небольшом наборе повторяющихся переходных фраз.",
  "Check that your topic sentences alone, read in order, summarise the whole essay clearly.":
    "Проверьте, что одни только ваши тематические предложения, прочитанные подряд, ясно пересказывают всё эссе.",
  "Stop relying on any single connecting device more than once or twice in the whole essay.":
    "Перестаньте опираться на одну и ту же связку больше одного или двух раз на всё эссе.",
  "The first sentence signals its logic with two separate connective phrases stacked together. The second achieves the same addition through word choice (\"also\") and sentence rhythm alone, which is closer to the invisible cohesion band 9 describes.":
    "В первом предложении логика помечена сразу двумя связками подряд. Второе добивается того же добавления одним лишь выбором слова (\"also\") и ритмом фразы, а это ближе к той незаметной связности, которую описывает band 9.",
  "Rewrite one paragraph with zero linking words, relying only on sentence order and word choice to carry the logic. Check it still reads clearly. 15 minutes.":
    "Перепишите один абзац вообще без слов-связок, опираясь только на порядок предложений и выбор слов. Проверьте, что он по-прежнему ясен. 15 минут.",
  "Band 4 vocabulary is only basic and often repetitive or inappropriate for the task, with errors that can strain the reader. Band 5 asks for a range that is minimally adequate, so noticeable spelling or word-formation errors are allowed as long as they do not go beyond causing \"some difficulty\".":
    "На band 4 лексика только базовая, часто повторяющаяся или не подходящая заданию, а ошибки могут затруднять чтение. Band 5 требует минимально достаточного запаса слов, так что заметные ошибки в написании и словообразовании допустимы, пока они не выходят за пределы \"some difficulty\".",
  "Replace repeated general words (good, bad, big, very) with a more specific word each time you would otherwise repeat one.":
    "Заменяйте повторяющиеся общие слова (good, bad, big, very) более точным словом каждый раз, когда собираетесь повторить одно и то же.",
  "Learn 5 to 10 words specific to common essay topics (environment, education, technology) and use them where relevant.":
    "Выучите 5-10 слов по частым темам эссе (окружающая среда, образование, технологии) и используйте их там, где они уместны.",
  "Check the spelling of any word you use more than once in the essay.":
    "Проверьте написание каждого слова, которое встречается в эссе больше одного раза.",
  "Use a full sentence to express an idea rather than a fragment that avoids using more vocabulary.":
    "Выражайте мысль полным предложением, а не обрывком, который позволяет обойтись меньшим запасом слов.",
  "Stop using the exact same adjective or verb throughout the whole essay.":
    "Перестаньте использовать одно и то же прилагательное или глагол на всё эссе.",
  "The first version relies entirely on \"very\" plus a basic adjective, repeated twice. The second uses two different, more precise words, which is the minimally adequate range band 5 is checking for.":
    "Первый вариант держится только на \"very\" с базовым прилагательным, и так дважды. Во втором два разных, более точных слова, а это и есть тот минимально достаточный запас, который проверяет band 5.",
  "List the 5 words you use most often in your essays (usually good, bad, big, important, very). Find one stronger alternative for each and use it in a practice sentence. 10 minutes.":
    "Выпишите 5 слов, которые чаще всего попадаются в ваших эссе (обычно good, bad, big, important, very). Найдите к каждому по одной более сильной замене и используйте её в тренировочном предложении. 10 минут.",
  "Band 6 asks for an adequate range of vocabulary for the task, with an attempt at less common words even if not always accurate, and spelling or word-formation errors that do not get in the way of communication. Band 5 vocabulary is described as only \"minimally adequate\".":
    "Band 6 требует достаточного для задания запаса слов, попыток использовать менее частотную лексику, пусть и не всегда точно, и ошибок в написании и словообразовании, которые не мешают понять мысль. Лексику band 5 дескриптор называет лишь \"minimally adequate\".",
  "Use at least three or four topic-specific words or phrases per paragraph, tied to the essay's actual subject.":
    "Используйте хотя бы три или четыре тематических слова или выражения на абзац, привязанных к реальному предмету эссе.",
  "Attempt one or two less common words per paragraph, even if you are not fully confident in them.":
    "Пробуйте одно или два менее частотных слова на абзац, даже если не до конца в них уверены.",
  "Paraphrase the question's own key terms in your introduction rather than repeating them exactly.":
    "Перефразируйте ключевые слова задания во вступлении, а не повторяйте их дословно.",
  "Double-check the spelling of the key content words you use repeatedly across the essay.":
    "Перепроверьте написание ключевых содержательных слов, которые повторяются по всему эссе.",
  "Stop copying the exact wording of the question into your essay.":
    "Перестаньте переносить формулировку задания в эссе дословно.",
  "The first version simply repeats the question's own words. The second paraphrases \"young people using phones too much\" into different vocabulary (\"excessive smartphone use among teenagers\"), which is the attempt at less common vocabulary band 6 rewards.":
    "Первый вариант просто повторяет слова самого задания. Второй перефразирует \"young people using phones too much\" другой лексикой (\"excessive smartphone use among teenagers\"), а именно такие попытки менее частотной лексики и вознаграждает band 6.",
  "Take one past essay question. Rewrite the question in your own words twice, using different vocabulary each time. 10 minutes.":
    "Возьмите один прошлый вопрос для эссе. Дважды перепишите его своими словами, каждый раз другой лексикой. 10 минут.",
  "Band 7 asks for a sufficient range of vocabulary allowing some flexibility and precision, and the use of less common lexical items with some awareness of style and collocation (natural word pairings, like \"heavy traffic\" not \"big traffic\"). Occasional errors in word choice, spelling, or word formation are still allowed.":
    "Band 7 требует запаса слов, которого хватает на некоторую гибкость и точность, и менее частотной лексики с пониманием стиля и сочетаемости (естественных пар слов: \"heavy traffic\", а не \"big traffic\"). Редкие ошибки в выборе слова, написании и словообразовании всё ещё допустимы.",
  "Use at least one natural word pairing (collocation) per paragraph, such as \"raise awareness\" or \"make a decision\".":
    "Используйте хотя бы одну естественную пару слов (коллокацию) на абзац, например \"raise awareness\" или \"make a decision\".",
  "Paraphrase the question's key terms fully in your introduction, using entirely different vocabulary.":
    "Полностью перефразируйте ключевые слова задания во вступлении, совсем другой лексикой.",
  "Replace at least three basic words per essay (good, bad, big, very) with a more precise alternative.":
    "Заменяйте хотя бы три базовых слова на эссе (good, bad, big, very) более точной альтернативой.",
  "Vary your vocabulary so the same content noun is not repeated more than twice across the essay.":
    "Меняйте лексику так, чтобы одно и то же содержательное существительное не повторялось больше двух раз на всё эссе.",
  "Stop writing \"very + adjective\" (very important, very good). Use one stronger word instead.":
    "Перестаньте писать \"very + прилагательное\" (very important, very good). Возьмите одно более сильное слово.",
  "Stop copying phrases directly from the question into your essay.":
    "Перестаньте переносить фразы из задания в эссе напрямую.",
  "\"Very important\" and \"good decisions\" are safe, general phrases. \"Have a responsibility\" and \"sound decisions\" are natural collocations with more precision, which shows the awareness of style and collocation band 7 asks for.":
    "\"Very important\" и \"good decisions\" это безопасные общие фразы. \"Have a responsibility\" и \"sound decisions\" это естественные коллокации с большей точностью, и именно такое чувство стиля и сочетаемости требует band 7.",
  "Look up 5 common collocations for your weakest essay topic (for example, environment: \"carbon emissions\", \"renewable sources\", \"raise awareness\"). Write one sentence using each. 15 minutes.":
    "Найдите 5 частых коллокаций по вашей самой слабой теме эссе (например, окружающая среда: \"carbon emissions\", \"renewable sources\", \"raise awareness\"). Напишите по одному предложению с каждой. 15 минут.",
  "Band 8 asks you to use a wide range of vocabulary fluently and flexibly to convey precise meaning, skilfully using uncommon lexical items, with only occasional inaccuracies in word choice or collocation and only rare spelling errors. Band 7 still allows occasional errors in word choice and word formation more broadly.":
    "Band 8 требует свободно и гибко пользоваться широким запасом слов, чтобы передавать точный смысл, умело брать нечастотную лексику, с редкими неточностями в выборе слова или сочетаемости и совсем редкими ошибками в написании. Band 7 ещё допускает более широкий круг случайных ошибок в выборе слова и словообразовании.",
  "Use at least one uncommon or idiomatic phrase per paragraph, used accurately, not just inserted for effect.":
    "Используйте хотя бы одно нечастотное или идиоматическое выражение на абзац, причём точно, а не вставленное ради эффекта.",
  "Choose the most precise word for each idea rather than the first word that comes to mind. Check a synonym if you are unsure.":
    "Выбирайте для каждой мысли самое точное слово, а не первое пришедшее в голову. Если не уверены, проверьте синоним.",
  "Spend the final two minutes of proofreading purely on the spelling of your key vocabulary.":
    "Последние две минуты проверки потратьте только на написание ключевых слов.",
  "Use collocations naturally throughout the essay, not just once as a one-off flourish.":
    "Используйте коллокации естественно по всему эссе, а не один раз для красоты.",
  "Stop settling for the first vocabulary choice that comes to mind. Review word choices for precision on your final read-through.":
    "Перестаньте довольствоваться первым пришедшим словом. На последнем перечитывании проверьте выбор слов на точность.",
  "Stop letting spelling slips appear on words you use more than once.":
    "Перестаньте допускать описки в словах, которые встречаются больше одного раза.",
  "\"Good effects and bad effects\" is accurate but generic. \"Tangible benefits and hidden costs\" conveys a more precise meaning while still being accurate, which is the fluent, flexible use of a wide range band 8 requires.":
    "\"Good effects and bad effects\" точно, но безлико. \"Tangible benefits and hidden costs\" передаёт более точный смысл и при этом остаётся верным, а это и есть свободное, гибкое владение широким запасом слов на band 8.",
  "Take 3 sentences from a past essay using \"good\" or \"bad\". Rewrite each with a more precise word pair. Check spelling of every new word used. 15 minutes.":
    "Возьмите 3 предложения из прошлого эссе со словами \"good\" или \"bad\". Перепишите каждое более точной парой слов. Проверьте написание каждого нового слова. 15 минут.",
  "Band 9 asks for a wide range of vocabulary with very natural and sophisticated control, where rare minor errors occur only as \"slips\", momentary mistakes rather than gaps in knowledge. This band is rare: the vocabulary should read as native-like, not merely advanced.":
    "Band 9 требует широкого запаса слов с очень естественным и тонким владением, где редкие мелкие ошибки случаются только как \"slips\", минутные оплошности, а не пробелы в знаниях. Балл редкий: лексика должна читаться как у носителя, а не просто как продвинутая.",
  "Choose vocabulary a native speaker discussing the same topic would naturally use, not vocabulary that reads as deliberately \"advanced\".":
    "Выбирайте те слова, которые естественно взял бы носитель языка, говорящий на ту же тему, а не те, что читаются как нарочито \"продвинутые\".",
  "Vary word choice so no content word appears more than two or three times across the whole essay.":
    "Меняйте выбор слов так, чтобы ни одно содержательное слово не встречалось больше двух или трёх раз на всё эссе.",
  "Check every collocation you use is completely natural, aiming for zero avoidable inaccuracies.":
    "Проверьте, что все ваши коллокации совершенно естественны: цель это ноль неточностей, которых можно было избежать.",
  "Stop inserting an advanced word purely to impress if it does not fit naturally in context. Only use vocabulary you are certain is accurate.":
    "Перестаньте вставлять сложное слово только ради впечатления, если оно не ложится в контекст. Берите лексику, в точности которой вы уверены.",
  "The first sentence uses rare words that sound inserted for effect rather than natural. The second conveys the same idea with vocabulary that a highly competent native writer would actually choose, which is what \"natural and sophisticated control\" means at band 9.":
    "В первом предложении редкие слова звучат вставленными ради эффекта, а не естественно. Второе передаёт ту же мысль лексикой, которую действительно выбрал бы очень сильный носитель, а это и означает \"natural and sophisticated control\" на band 9.",
  "Read one paragraph aloud. Flag any word that feels forced rather than natural, and replace it with a simpler, more natural choice. 15 minutes.":
    "Прочитайте один абзац вслух. Отметьте каждое слово, которое звучит натужно, и замените его более простым и естественным. 15 минут.",
  "Band 4 uses only a very limited range of structures with rare subordinate clauses, and errors predominate. Band 5 asks for an attempt at complex sentences, even if they tend to be less accurate than simple ones, and simple sentence forms that are usually correct.":
    "На band 4 набор конструкций очень узкий, придаточные встречаются редко, и ошибок больше, чем верных мест. Band 5 требует попыток строить сложные предложения, пусть они и выходят менее точными, чем простые, и простых предложений, которые в основном верны.",
  "Attempt at least one complex sentence per paragraph using because, although, which, or if, even if it is not perfect.":
    "Пробуйте хотя бы одно сложное предложение на абзац, с because, although, which или if, даже если получится не идеально.",
  "End every sentence with correct punctuation. Avoid running two sentences together with just a comma.":
    "Заканчивайте каждое предложение верным знаком. Не склеивайте два предложения одной запятой.",
  "Write in complete sentences. Avoid fragments that lack a main verb or subject.":
    "Пишите полными предложениями. Избегайте обрывков без сказуемого или подлежащего.",
  "Keep subject-verb agreement correct in your simple sentences at minimum (\"she goes\", not \"she go\").":
    "Следите за согласованием подлежащего и сказуемого хотя бы в простых предложениях (\"she goes\", а не \"she go\").",
  "Stop writing only short, simple sentences throughout the entire essay.":
    "Перестаньте писать всё эссе одними короткими простыми предложениями.",
  "Stop mixing up basic tense forms within the same paragraph.":
    "Перестаньте путать базовые формы времён внутри одного абзаца.",
  "The first version is three disconnected simple sentences with a subject-verb agreement error (\"many problem happen\"). The second links the ideas with \"because\" and \"although\", which is the attempted complex sentence band 5 is looking for.":
    "В первом варианте три несвязанных простых предложения и ошибка в согласовании (\"many problem happen\"). Во втором мысли связаны через \"because\" и \"although\", а это и есть та попытка сложного предложения, которую ищет band 5.",
  "Write 5 sentences about a familiar topic, each using a different connector: because, although, if, when, which. 15 minutes.":
    "Напишите 5 предложений на знакомую тему, каждое с новой связкой: because, although, if, when, which. 15 минут.",
  "Band 6 asks for a mix of simple and complex sentence forms, with errors in grammar and punctuation that rarely reduce communication. Band 5 attempts complex sentences but they tend to be less accurate than the simple ones, and errors can cause the reader some real difficulty.":
    "Band 6 требует смешивать простые и сложные предложения, а ошибки в грамматике и пунктуации должны редко мешать пониманию. На band 5 сложные предложения пробуют, но они выходят менее точными, чем простые, и ошибки могут по-настоящему затруднять чтение.",
  "Use both simple and complex sentences in every paragraph, aiming for at least two complex sentences per paragraph.":
    "Используйте и простые, и сложные предложения в каждом абзаце, минимум по два сложных на абзац.",
  "Use a comma correctly before or after a subordinate clause (for example, \"Although it rained, we went out.\").":
    "Ставьте запятую перед придаточным или после него правильно (например, \"Although it rained, we went out.\").",
  "Check subject-verb agreement and articles (a, an, the) on your key nouns.":
    "Проверьте согласование подлежащего со сказуемым и артикли (a, an, the) у ключевых существительных.",
  "Vary sentence openings. Do not start every sentence with the subject.":
    "Меняйте начала предложений. Не начинайте каждое с подлежащего.",
  "Stop overusing a single complex structure (only \"because\" clauses, for example). Mix in others.":
    "Перестаньте злоупотреблять одной конструкцией (например, только придаточными с \"because\"). Подмешивайте другие.",
  "Stop letting a grammar error change the actual meaning of a sentence.":
    "Перестаньте допускать грамматические ошибки, которые меняют смысл предложения.",
  "The original has a verb-form error (\"should to build\") and a subject-verb agreement error (\"many child not go\"). The revision fixes both while keeping the same complex \"because\" structure, so the error no longer risks confusing the reader.":
    "В исходном варианте ошибка в форме глагола (\"should to build\") и в согласовании (\"many child not go\"). В исправленном обе убраны, а сложная конструкция с \"because\" сохранена, так что ошибка больше не рискует сбить читателя.",
  "Take 5 sentences from a past essay. Circle the subject and verb in each and check they agree. Fix any article (a/an/the) that is missing or wrong. 15 minutes.":
    "Возьмите 5 предложений из прошлого эссе. Обведите в каждом подлежащее и сказуемое и проверьте, что они согласованы. Исправьте пропущенные и неверные артикли (a/an/the). 15 минут.",
  "Band 7 asks for a variety of complex structures, frequent error-free sentences, and good control of grammar and punctuation with only a few errors. Band 6 allows errors that only \"rarely reduce communication\" but does not require frequent error-free sentences or a variety of complex forms.":
    "Band 7 требует разнообразия сложных конструкций, частых предложений без единой ошибки и хорошего владения грамматикой и пунктуацией, с немногими ошибками. Band 6 допускает ошибки, которые лишь \"редко мешают пониманию\", но не требует ни частых безошибочных предложений, ни разнообразия сложных форм.",
  "Use at least three different complex structures across the essay: relative clauses, conditionals, passive voice, and comparatives.":
    "Используйте по всему эссе хотя бы три разные сложные конструкции: определительные придаточные, условные предложения, пассивный залог и сравнения.",
  "Aim for at least two completely error-free complex sentences per paragraph.":
    "Добивайтесь хотя бы двух полностью безошибочных сложных предложений на абзац.",
  "Check that every verb tense matches the timeframe you are describing.":
    "Проверьте, что каждое время глагола соответствует тому периоду, о котором вы пишете.",
  "Proofread specifically for punctuation: commas around clauses, and correct use of semicolons if you use them.":
    "Перечитайте отдельно ради пунктуации: запятые вокруг придаточных и верное употребление точки с запятой, если вы её используете.",
  "Stop relying on the same complex structure repeatedly. Mix in relative clauses, conditionals, and passive voice.":
    "Перестаньте опираться на одну и ту же сложную конструкцию. Подмешивайте определительные придаточные, условные предложения и пассивный залог.",
  "Stop leaving comma splices (two full sentences joined only by a comma) uncorrected.":
    "Перестаньте оставлять склейки запятой (два полноценных предложения, соединённых только запятой).",
  "The first sentence is a comma splice joining two independent clauses incorrectly. The second uses a relative clause (\"an opinion that has grown\") to connect the ideas correctly, which is the variety of complex structures band 7 asks for.":
    "Первое предложение это склейка запятой: две независимые части соединены неверно. Во втором мысли связаны определительным придаточным (\"an opinion that has grown\"), а это и есть то разнообразие сложных конструкций, которого требует band 7.",
  "Write one sentence using a relative clause (who/which/that), one using a conditional (if...), and one using the passive voice, all about the same topic. 15 minutes.":
    "Напишите одно предложение с определительным придаточным (who/which/that), одно условное (if...) и одно в пассивном залоге, все на одну тему. 15 минут.",
  "Band 8 asks for a wide range of structures where the majority of sentences are error-free, with only very occasional errors or inappropriacies. Band 7 requires frequent error-free sentences but \"a few errors\" are still expected.":
    "Band 8 требует широкого набора конструкций, при котором большинство предложений без ошибок, а ошибки и неуместности встречаются совсем изредка. Band 7 требует частых безошибочных предложений, но \"немного ошибок\" там всё ещё ожидаемы.",
  "Reread your essay and check that more than half of your sentences have zero grammar errors.":
    "Перечитайте эссе и проверьте, что больше половины предложений совсем без грамматических ошибок.",
  "Combine structures within the same paragraph, for example a conditional, a relative clause, and a passive construction used together.":
    "Сочетайте конструкции внутри одного абзаца, например условное предложение, определительное придаточное и пассив вместе.",
  "Read every complex sentence aloud. If it does not sound natural, simplify it or fix it.":
    "Прочитайте каждое сложное предложение вслух. Если оно звучит неестественно, упростите или исправьте.",
  "Fix every article (a/an/the) and preposition error you can spot while proofreading.":
    "Исправьте все ошибки в артиклях (a/an/the) и предлогах, которые заметите при проверке.",
  "Stop attempting a complex structure you are unsure of without checking it. Use a simpler, correct structure instead if in doubt.":
    "Перестаньте брать сложную конструкцию, в которой не уверены, не проверив её. В сомнении возьмите более простую, но верную.",
  "Stop leaving more than one or two errors uncorrected after proofreading.":
    "Перестаньте оставлять после проверки больше одной или двух ошибок.",
  "The original has three errors in one sentence (wrong tense after \"if\", wrong preposition, and an unnecessary \"get\"). The revision is the same idea with zero errors, which is what \"the majority of sentences are error-free\" requires at band 8.":
    "В исходном варианте три ошибки в одном предложении (неверное время после \"if\", неверный предлог и лишнее \"get\"). В исправленном та же мысль без единой ошибки, а это и требует band 8 своим \"большинство предложений без ошибок\".",
  "Take one paragraph. Mark every error you can find, however small. Rewrite the paragraph with all of them fixed and read it aloud. 20 minutes.":
    "Возьмите один абзац. Отметьте каждую ошибку, которую найдёте, даже мелкую. Перепишите абзац со всеми исправлениями и прочитайте вслух. 20 минут.",
  "Band 9 asks for a wide range of structures used with full flexibility and accuracy, where rare minor errors occur only as \"slips\", the kind of small mistake even a highly proficient writer occasionally makes. This band is genuinely rare: it means essentially no grammar weakness anywhere in the essay.":
    "Band 9 требует широкого набора конструкций при полной гибкости и точности, где редкие мелкие ошибки случаются только как \"slips\", такие оплошности иногда допускает и очень сильный автор. Балл по-настоящему редкий: он означает, что слабых мест в грамматике в эссе практически нет.",
  "Write every sentence so that, on a careful reread, you cannot find a grammar error in it.":
    "Пишите так, чтобы при внимательном перечитывании вы не смогли найти в предложении грамматической ошибки.",
  "Use complex structures so naturally that they never feel inserted for display.":
    "Используйте сложные конструкции настолько естественно, чтобы они никогда не выглядели вставленными напоказ.",
  "Proofread twice: once purely for meaning, and once purely for grammar and punctuation.":
    "Перечитайте дважды: один раз только ради смысла, второй только ради грамматики и пунктуации.",
  "Stop treating any error as acceptable. At this level, even one avoidable slip should be caught on rereading.":
    "Перестаньте считать хоть какую-то ошибку допустимой. На этом уровне даже одна оплошность, которой можно было избежать, должна ловиться при перечитывании.",
  "The original has a word-form error (\"implement\" instead of \"implemented\") and an awkward word order at the end. The revision is grammatically flawless and reads naturally, which is what \"full flexibility and accuracy\" at band 9 looks like in practice.":
    "В исходном варианте ошибка в форме слова (\"implement\" вместо \"implemented\") и неловкий порядок слов в конце. Исправленный безупречен грамматически и звучит естественно, а так на практике и выглядит \"full flexibility and accuracy\" на band 9.",
  "Write 3 conditional sentences about a serious topic (\"Had the government...\"). Check each one twice: once for the conditional form, once for every other word in the sentence. 15 minutes.":
    "Напишите 3 условных предложения на серьёзную тему (\"Had the government...\"). Проверьте каждое дважды: один раз форму условного, второй раз каждое остальное слово. 15 минут.",
  "At band 4 you cannot respond without noticeable pauses and may speak slowly with frequent repetition. Band 5 asks you to usually maintain the flow of speech, even if you use repetition, self-correction, or slower speech to keep going. Simple speech should come fluently, even if more complex ideas still cause problems.":
    "На band 4 без заметных пауз ответить не получается, речь может быть медленной и с частыми повторами. Band 5 требует в целом удерживать течение речи, пусть и с повторами, самоисправлениями или замедлением. Простая речь должна идти свободно, даже если мысли посложнее пока даются тяжело.",
  "Answer every question immediately, without a long silent pause first, even if the answer starts simply.":
    "Отвечайте на каждый вопрос сразу, без долгой паузы в начале, пусть даже ответ начнётся просто.",
  "Use a short filler phrase (\"let me think\", \"that's an interesting question\") instead of silence when you need a second.":
    "Вместо молчания используйте короткую фразу-заполнитель (\"let me think\", \"that's an interesting question\"), когда нужна секунда.",
  "Practise giving full-sentence answers to simple personal questions until they come without hesitation.":
    "Тренируйтесь отвечать полными предложениями на простые вопросы о себе, пока они не начнут получаться без запинки.",
  "Link two simple sentences together with and, but, or so, instead of stopping after each one.":
    "Соединяйте два простых предложения через and, but или so, а не останавливайтесь после каждого.",
  "Stop pausing silently for several seconds before you start answering.":
    "Перестаньте молчать по несколько секунд перед началом ответа.",
  "Stop giving one-word or single-sentence answers when you actually have more to say.":
    "Перестаньте отвечать одним словом или одним предложением, когда вам есть что добавить.",
  "The first answer has long silent pauses and stops after two words. The second keeps going without a gap and links two ideas with \"and\", which is the flow band 5 asks for even in simple speech.":
    "В первом ответе долгие паузы, и он обрывается на двух словах. Во втором речь идёт без провалов, а две мысли связаны через \"and\", и это то течение речи, которого band 5 ждёт даже от простых фраз.",
  "Record yourself answering 8 Part 1 style questions (favourite food, hometown, weekend plans) out loud, starting within 2 seconds of hearing each question. 15 minutes.":
    "Запишите себя, отвечая вслух на 8 вопросов в духе Part 1 (любимая еда, родной город, планы на выходные), начиная не позже чем через 2 секунды после вопроса. 15 минут.",
  "Band 6 means being willing to speak at length, even if coherence is sometimes lost through occasional repetition, self-correction, or hesitation, and using a range of connectives and discourse markers, even if not always appropriately. Band 5 tends to over-use a small number of connectives and struggles once the topic gets more complex.":
    "Band 6 означает готовность говорить развёрнуто, пусть связность иногда и теряется из-за повторов, самоисправлений или запинок, и использование разных связок и дискурсивных маркеров, пусть не всегда уместно. На band 5 обычно злоупотребляют небольшим набором связок и теряются, как только тема усложняется.",
  "Extend every answer to at least 3 to 4 sentences, even for simple Part 1 questions.":
    "Растягивайте каждый ответ хотя бы до 3-4 предложений, даже на простые вопросы Part 1.",
  "Use a range of connecting words (also, however, because, so, actually) rather than the same one repeatedly.":
    "Используйте разные связки (also, however, because, so, actually), а не одну и ту же снова и снова.",
  "When you lose your thread, restart the sentence rather than trailing off in silence.":
    "Если потеряли мысль, начните предложение заново, а не замолкайте на полуслове.",
  "Give a reason or example after every opinion you state.":
    "После каждого высказанного мнения приводите причину или пример.",
  "Stop giving answers shorter than two sentences on any question.":
    "Перестаньте отвечать короче двух предложений на любой вопрос.",
  "Stop trailing off mid-sentence without finishing the thought.":
    "Перестаньте затихать на середине предложения, не договорив мысль.",
  "The first answer is two short, disconnected sentences. The second extends the idea with \"because\" and \"so\" and gives a reason, which is the willingness to speak at length band 6 is checking for.":
    "Первый ответ это два коротких несвязанных предложения. Второй разворачивает мысль через \"because\" и \"so\" и даёт причину, а это и есть та готовность говорить развёрнуто, которую проверяет band 6.",
  "Pick 5 Part 1 questions. Answer each with at least 3 connected sentences, using a different connecting word each time. 15 minutes.":
    "Возьмите 5 вопросов Part 1. Ответьте на каждый хотя бы тремя связанными предложениями, каждый раз с новой связкой. 15 минут.",
  "Band 7 means speaking at length WITHOUT noticeable effort or loss of coherence, using a range of connectives and discourse markers with some flexibility. Some language-related hesitation and self-correction are still allowed. Band 6 may lose coherence at times and does not always use its connectives appropriately.":
    "Band 7 означает говорить развёрнуто БЕЗ заметного усилия и без потери связности, с разными связками и дискурсивными маркерами и некоторой гибкостью. Запинки и самоисправления из-за языка ещё допустимы. Band 6 местами теряет связность и не всегда использует связки уместно.",
  "Keep talking for the full time available in Part 2 (up to 2 minutes) without long unplanned pauses.":
    "Говорите всё отведённое в Part 2 время (до 2 минут) без долгих незапланированных пауз.",
  "Use discourse markers that organise a longer answer: firstly, what's more, on top of that, having said that.":
    "Используйте маркеры, которые выстраивают длинный ответ: firstly, what's more, on top of that, having said that.",
  "Self-correct smoothly by simply restating the word or phrase, rather than stopping and apologising.":
    "Исправляйтесь плавно, просто повторив слово или фразу заново, а не останавливаясь и извиняясь.",
  "Practise extended answers on abstract Part 3 topics, not only familiar Part 1 ones.":
    "Тренируйте развёрнутые ответы на отвлечённые темы Part 3, а не только на знакомые вопросы Part 1.",
  "Stop stopping every few seconds to search for a word. If a word will not come, paraphrase around it and keep moving.":
    "Перестаньте останавливаться каждые несколько секунд в поисках слова. Если слово не приходит, обойдите его описанием и двигайтесь дальше.",
  "Stop finishing Part 2 answers well under the 2-minute mark.":
    "Перестаньте заканчивать ответ в Part 2 сильно раньше двух минут.",
  "The first answer stalls twice searching for what to say next. The second develops the same opinion in one continuous stretch with a discourse marker (\"mainly because\"), which is speaking at length without noticeable effort.":
    "Первый ответ дважды буксует в поисках продолжения. Второй разворачивает то же мнение одним непрерывным куском, с маркером (\"mainly because\"), а это и есть развёрнутая речь без заметного усилия.",
  "Take one Part 2 cue card. Speak for the full 2 minutes without stopping, even if you repeat a point, then note where you paused longest. 20 minutes.":
    "Возьмите одну карточку Part 2. Говорите все 2 минуты не останавливаясь, даже если повторитесь, потом отметьте, где пауза была самой длинной. 20 минут.",
  "Band 8 means speaking fluently with only OCCASIONAL repetition or self-correction, where hesitation is usually content-related rather than a search for words or grammar, and topics are developed coherently and appropriately. Band 7 still allows language-related hesitation and some repetition at times.":
    "Band 8 означает свободную речь лишь с ИЗРЕДКА встречающимися повторами и самоисправлениями, где заминка обычно связана с содержанием, а не с поиском слов или грамматики, и темы раскрываются связно и уместно. Band 7 ещё допускает запинки из-за языка и местами повторы.",
  "Prepare and practise topic vocabulary in advance so it becomes automatic, reducing hesitation caused by searching for words.":
    "Заранее готовьте и отрабатывайте тематическую лексику, чтобы она приходила сама и не приходилось искать слова.",
  "Develop each Part 3 answer with a clear structure: point, explanation, example, in that order.":
    "Стройте каждый ответ в Part 3 по ясной схеме: мысль, объяснение, пример, именно в этом порядке.",
  "Let any pause come from thinking about the idea itself, not from struggling with grammar or vocabulary.":
    "Пусть любая пауза возникает из размышления над самой мыслью, а не из борьбы с грамматикой или лексикой.",
  "Record yourself and count self-corrections. Aim for no more than one or two per answer.":
    "Запишите себя и посчитайте самоисправления. Цель это не больше одного или двух на ответ.",
  "Stop self-correcting grammar mid-sentence more than once or twice per answer.":
    "Перестаньте править грамматику на середине фразы чаще одного или двух раз за ответ.",
  "Stop hesitating specifically because you are translating from your first language in your head.":
    "Перестаньте запинаться из-за того, что переводите про себя с родного языка.",
  "The first answer self-corrects grammar and searches for words twice. The second is fluent throughout, with any thinking happening about the content rather than the language itself, which is the occasional-only hesitation band 8 asks for.":
    "В первом ответе дважды правится грамматика и ищутся слова. Второй свободен от начала до конца, а думает говорящий о содержании, а не о языке, и это те редкие заминки, которых требует band 8.",
  "Prepare 8 topic-specific words for a Part 3 theme (work, environment, technology). Answer 3 questions on that theme using at least 2 of the words each time. 20 minutes.":
    "Подготовьте 8 тематических слов к одной теме Part 3 (работа, окружающая среда, технологии). Ответьте на 3 вопроса по этой теме, каждый раз используя минимум два слова. 20 минут.",
  "Band 9 means speaking fluently with only RARE repetition or self-correction, where any hesitation is content-related rather than related to language at all, with fully appropriate cohesive features and topics developed fully and appropriately. This band is rare: it describes control close to a native speaker's.":
    "Band 9 означает свободную речь с РЕДКИМИ повторами и самоисправлениями, где любая заминка связана с содержанием и совсем не с языком, со вполне уместными средствами связи и полностью раскрытыми темами. Балл редкий: он описывает владение, близкое к носителю.",
  "Aim to eliminate language-related hesitation entirely. Any pause should come from forming a thought, not from searching for a word or structure.":
    "Стремитесь убрать языковые заминки совсем. Любая пауза должна идти от того, что вы формулируете мысль, а не ищете слово или конструкцию.",
  "Develop topics as fully as a native speaker would in casual conversation, including nuance and qualification.":
    "Раскрывайте темы так же полно, как это сделал бы носитель в обычном разговоре, с оттенками и оговорками.",
  "Use cohesive devices so naturally that a listener would not notice them as a technique.":
    "Используйте средства связи настолько естественно, чтобы слушатель не замечал их как приём.",
  "Stop treating any remaining hesitation as acceptable if it comes from language rather than thinking. Work specifically on removing it.":
    "Перестаньте считать допустимой оставшуюся заминку, если она идёт от языка, а не от мысли. Работайте именно над тем, чтобы её убрать.",
  "Both answers are fluent, but the second develops the idea further, with a genuine qualification (\"though I'd say... for certain groups\"), showing the fuller development band 9 expects even at speed.":
    "Оба ответа свободны, но второй разворачивает мысль дальше, с настоящей оговоркой (\"though I'd say... for certain groups\"), и показывает ту полноту, которой band 9 ждёт даже на высокой скорости.",
  "Record a full mock interview (all 3 parts). Listen back and mark every hesitation. Note whether each was about the idea or about the language. 20 minutes.":
    "Запишите полное пробное интервью (все 3 части). Прослушайте и отметьте каждую заминку. Отметьте, была она про мысль или про язык. 20 минут.",
  "Band 4 can only convey basic meaning on unfamiliar topics and rarely attempts paraphrase. Band 5 asks you to manage familiar AND unfamiliar topics, even with limited flexibility, and to attempt paraphrase, even with mixed success.":
    "На band 4 на незнакомые темы удаётся передать только самый базовый смысл, а описать слово другими словами почти не пробуют. Band 5 требует справляться и со знакомыми, И с незнакомыми темами, пусть гибкости немного, и пробовать перефразировать, пусть и с переменным успехом.",
  "Practise describing topics outside your daily routine (technology, environment, society) using simple vocabulary you already know.":
    "Тренируйтесь говорить о темах вне повседневности (технологии, окружающая среда, общество) той простой лексикой, которая у вас уже есть.",
  "When you do not know a word, describe it instead of stopping (a paraphrase, such as \"the thing you use to...\").":
    "Если слова не знаете, опишите его вместо того, чтобы замолчать (например, \"the thing you use to...\").",
  "Learn 5 to 10 words for the IELTS topics you find hardest (education, work, environment).":
    "Выучите 5-10 слов по тем темам IELTS, которые даются вам тяжелее всего (образование, работа, окружающая среда).",
  "Answer every Part 3 question even if the topic feels unfamiliar, using general vocabulary rather than staying silent.":
    "Отвечайте на каждый вопрос Part 3, даже если тема незнакома: берите общие слова, но не молчите.",
  "Stop going silent when a topic feels unfamiliar. Use general words to talk around it instead.":
    "Перестаньте замолкать на незнакомой теме. Обходите её общими словами.",
  "The first response gives up on the topic entirely. The second attempts a paraphrase of \"pollution\" using simple, available vocabulary, which is the \"attempt paraphrase\" band 5 is checking for, even without full success.":
    "Первый ответ просто сдаётся. Во втором \"pollution\" описано своими словами из того запаса, что есть под рукой, а это и есть та попытка перефразировать, которую проверяет band 5, пусть и не вполне удачная.",
  "Pick 3 unfamiliar Part 3 topics (space exploration, urban planning, climate policy). Answer each with 2 sentences of simple, general vocabulary rather than staying silent. 15 minutes.":
    "Возьмите 3 незнакомые темы Part 3 (освоение космоса, городское планирование, климатическая политика). Ответьте на каждую двумя предложениями простыми общими словами, вместо того чтобы молчать. 15 минут.",
  "Band 6 asks for a wide enough vocabulary to discuss topics at length and make meaning clear despite some inappropriate word choices, and to generally paraphrase successfully. Band 5 manages this with limited flexibility and mixed success at paraphrase.":
    "Band 6 требует запаса слов, которого хватает, чтобы говорить на тему развёрнуто и оставаться понятным, несмотря на местами неудачный выбор слов, и в целом успешно перефразировать. Band 5 справляется с этим с ограниченной гибкостью и с переменным успехом.",
  "Build your answers to 4 to 6 sentences using vocabulary specific to the topic, not just general words.":
    "Доводите ответы до 4-6 предложений, используя лексику именно по теме, а не одни общие слова.",
  "Paraphrase the question's key word at least once in your answer instead of repeating it.":
    "Хотя бы раз перефразируйте ключевое слово вопроса в ответе, вместо того чтобы повторить его.",
  "Learn topic-specific vocabulary sets of 10 to 15 words for common Part 3 themes: technology, environment, education, work, society.":
    "Выучите наборы по 10-15 тематических слов к частым темам Part 3: технологии, окружающая среда, образование, работа, общество.",
  "Use a synonym whenever you would otherwise repeat the same word twice in one answer.":
    "Берите синоним всякий раз, когда иначе повторили бы одно слово дважды в одном ответе.",
  "Stop relying on the exact words from the question in your answer.":
    "Перестаньте опираться в ответе на точные слова вопроса.",
  "Stop using the same 3 to 4 all-purpose adjectives (good, bad, nice, interesting) for everything.":
    "Перестаньте подставлять ко всему одни и те же 3-4 универсальных прилагательных (good, bad, nice, interesting).",
  "The first answer just repeats \"technology\" and \"education\" from the question with the vague word \"good\". The second paraphrases into \"digital tools\" and \"learning\" and adds a specific benefit, which is the successful paraphrase band 6 rewards.":
    "Первый ответ просто повторяет \"technology\" и \"education\" из вопроса вместе с размытым \"good\". Второй перефразирует их в \"digital tools\" и \"learning\" и добавляет конкретную пользу, а именно такое удачное перефразирование и вознаграждает band 6.",
  "Take 5 Part 3 questions. Answer each without repeating any key noun from the question itself, using a paraphrase instead. 15 minutes.":
    "Возьмите 5 вопросов Part 3. Ответьте на каждый, не повторив ни одного ключевого существительного из самого вопроса, заменив его описанием. 15 минут.",
  "Band 7 asks you to use your vocabulary flexibly to discuss a variety of topics, including some less common or idiomatic vocabulary with some awareness of style and collocation (natural word pairings), and to paraphrase effectively. Some inappropriate word choices are still allowed at this level.":
    "Band 7 требует гибко пользоваться своим запасом слов на разных темах, включая менее частотную и идиоматическую лексику, с пониманием стиля и сочетаемости (естественных пар слов), и уверенно перефразировать. Местами неудачный выбор слова на этом уровне ещё допустим.",
  "Use at least one less common word or natural idiomatic phrase per answer, where it genuinely fits.":
    "Используйте хотя бы одно менее частотное слово или естественное идиоматическое выражение на ответ, там где оно по-настоящему уместно.",
  "Match your vocabulary's formality to the topic: more casual for Part 1, more precise for Part 3.":
    "Подстраивайте регистр лексики под тему: попроще в Part 1, поточнее в Part 3.",
  "Practise common collocations for IELTS topics (raise awareness, tackle a problem, strike a balance) and use them naturally.":
    "Отрабатывайте частые коллокации по темам IELTS (raise awareness, tackle a problem, strike a balance) и вставляйте их естественно.",
  "Paraphrase the question fully in your opening sentence rather than repeating any of its wording.":
    "Полностью перефразируйте вопрос в первом же предложении ответа, не повторяя его формулировок.",
  "Stop using only textbook-safe vocabulary. Take the risk of a less common word even if it is occasionally imperfect.":
    "Перестаньте держаться одной безопасной учебниковой лексики. Рискните взять менее частотное слово, даже если иногда выйдет не идеально.",
  "Stop giving the same simple answer style throughout Part 3 as you did in Part 1.":
    "Перестаньте отвечать в Part 3 в том же простом стиле, что и в Part 1.",
  "The first answer repeats \"problem\" and uses \"do more about\" loosely. The second uses the natural collocation \"tackle this issue\" and \"growing concern\", which shows the awareness of style and collocation band 7 asks for.":
    "Первый ответ повторяет \"problem\" и обходится расплывчатым \"do more about\". Второй берёт естественные коллокации \"tackle this issue\" и \"growing concern\", а это и есть то чувство стиля и сочетаемости, которого требует band 7.",
  "Learn 5 collocations for one Part 3 theme. Answer 3 questions on that theme, using at least one collocation naturally in each answer. 15 minutes.":
    "Выучите 5 коллокаций к одной теме Part 3. Ответьте на 3 вопроса по ней, естественно вставив хотя бы одну коллокацию в каждый ответ. 15 минут.",
  "Band 8 asks you to use a wide vocabulary readily and flexibly to convey precise meaning, skilfully using less common and idiomatic vocabulary, with only occasional inaccuracies, and to paraphrase effectively whenever needed. Band 7 allows some inappropriate word choices more broadly.":
    "Band 8 требует легко и гибко пользоваться широким запасом слов, чтобы передавать точный смысл, умело брать менее частотную и идиоматическую лексику, лишь с редкими неточностями, и перефразировать всякий раз, когда это нужно. Band 7 допускает неудачный выбор слов заметно шире.",
  "Choose the most precise word for each idea, not just an acceptable one, for example \"meticulous\" instead of \"very careful\" where it fits.":
    "Выбирайте для каждой мысли самое точное слово, а не просто приемлемое, например \"meticulous\" вместо \"very careful\", где оно подходит.",
  "Use idiomatic expressions confidently and naturally, not as a one-off \"showcase\" phrase.":
    "Используйте идиомы уверенно и естественно, а не как единственную фразу напоказ.",
  "Paraphrase confidently the moment a word does not come to mind, without breaking your fluency to search for it.":
    "Уверенно переходите к описанию, как только слово не приходит, не ломая течение речи ради его поисков.",
  "Vary vocabulary across the whole test so words are not repeated when a synonym is available.":
    "Меняйте лексику на протяжении всего экзамена, чтобы слова не повторялись там, где есть синоним.",
  "Stop using an idiom or advanced phrase that does not quite fit, just to sound impressive. Precision matters more than difficulty.":
    "Перестаньте вставлять идиому или сложную фразу, которая не совсем подходит, ради впечатления. Точность важнее сложности.",
  "Stop breaking your flow to visibly search for a \"better\" word.":
    "Перестаньте прерывать речь, заметно подыскивая слово получше.",
  "The first answer uses \"good\" twice for two different qualities. The second chooses two precise, natural phrases (\"cost-effective\" and \"environmentally friendly\"), which is the precise, flexible use band 8 requires.":
    "В первом ответе \"good\" стоит дважды для двух разных свойств. Во втором выбраны две точные естественные фразы (\"cost-effective\" и \"environmentally friendly\"), а это и есть точное, гибкое владение, которого требует band 8.",
  "Take one answer you gave using \"good\" or \"bad\" twice. Rewrite it choosing a precise, different word for each instance. 15 minutes.":
    "Возьмите свой ответ, где \"good\" или \"bad\" встретилось дважды. Перепишите его, подобрав для каждого случая своё точное слово. 15 минут.",
  "Band 9 asks for full flexibility and precision in ALL topics, with idiomatic language used naturally and accurately. This band is very rare: it means near-native command that holds up even on unfamiliar or abstract topics, with no dip anywhere in the test.":
    "Band 9 требует полной гибкости и точности на ВСЕХ темах, с идиоматикой, которая звучит естественно и верно. Балл очень редкий: он означает владение почти как у носителя, которое держится и на незнакомых или отвлечённых темах, без провалов нигде на экзамене.",
  "Use precise, natural vocabulary on every topic without exception, including unfamiliar or abstract ones.":
    "Держите точную, естественную лексику на каждой теме без исключения, включая незнакомые и отвлечённые.",
  "Use idiomatic language the way a native speaker would, in context, not as a rehearsed insert.":
    "Используйте идиомы так, как их использует носитель: к месту, а не как заученную вставку.",
  "Keep vocabulary control consistent for the full 11 to 14 minutes, with no dip in quality on harder Part 3 questions.":
    "Держите уровень лексики ровным все 11-14 минут, без провала на трудных вопросах Part 3.",
  "Stop letting vocabulary quality drop on the topics you have not specifically prepared for.":
    "Перестаньте терять в лексике на тех темах, к которым вы специально не готовились.",
  "Both are fluent, but the second uses natural, idiomatic phrasing (\"gathering momentum\", \"ripple effects\") that a native speaker would reach for without effort, which is the full flexibility band 9 describes.":
    "Оба ответа свободны, но во втором звучат естественные идиоматические обороты (\"gathering momentum\", \"ripple effects\"), к которым носитель тянется без усилия, а это и есть полная гибкость, описанная в band 9.",
  "Answer one unfamiliar, abstract Part 3 question (for example, on globalisation or urban planning) and check your vocabulary control matches your best-prepared topic. 15 minutes.":
    "Ответьте на один незнакомый отвлечённый вопрос Part 3 (например, про глобализацию или городское планирование) и проверьте, что лексика держится на уровне вашей самой подготовленной темы. 15 минут.",
  "Band 4 produces basic sentence forms with subordinate structures rare, and errors are frequent enough to cause misunderstanding. Band 5 asks for basic sentence forms with reasonable accuracy and a limited range of more complex structures, even if these usually contain errors.":
    "На band 4 предложения базовые, придаточные встречаются редко, а ошибок столько, что вас могут не понять. Band 5 требует базовых предложений с приемлемой точностью и небольшого набора конструкций посложнее, пусть в них обычно и есть ошибки.",
  "Attempt at least one subordinate clause per answer (because, when, if, which), even if it is not perfect.":
    "Пробуйте хотя бы одно придаточное на ответ (because, when, if, which), даже если выйдет не идеально.",
  "Practise simple present, past, and future tense forms until they are accurate on familiar topics.":
    "Отрабатывайте простые формы настоящего, прошедшего и будущего, пока они не станут точными на знакомых темах.",
  "Build answers around two connected sentences rather than isolated fragments.":
    "Стройте ответ вокруг двух связанных предложений, а не отдельных обрывков.",
  "Correct yourself out loud when you notice a tense mistake, rather than continuing past it.":
    "Заметив ошибку во времени, поправьтесь вслух, а не проезжайте мимо.",
  "Stop relying only on memorised phrases for common questions.":
    "Перестаньте отвечать на частые вопросы одними заученными фразами.",
  "Stop avoiding subordinate clauses altogether.":
    "Перестаньте вовсе обходиться без придаточных.",
  "The first version is three short, disconnected sentences with a grammar error (\"Is good\"). The second links them with \"because\" and \"even though\", which is the attempted subordinate structure band 5 asks for.":
    "Первый вариант это три коротких несвязанных предложения с грамматической ошибкой (\"Is good\"). Во втором они связаны через \"because\" и \"even though\", а это и есть та попытка придаточного, которой требует band 5.",
  "Answer 5 familiar Part 1 questions, each using one subordinate clause (because, when, if, which). 15 minutes.":
    "Ответьте на 5 знакомых вопросов Part 1, каждый раз с одним придаточным (because, when, if, which). 15 минут.",
  "Band 6 asks for a mix of simple and complex structures, even with limited flexibility, where mistakes with complex structures rarely cause comprehension problems. Band 5 basic sentences are usually accurate, but the limited range of complex attempts usually contains errors that can cause some difficulty.":
    "Band 6 требует смешивать простые и сложные конструкции, пусть гибкости и немного, и чтобы ошибки в сложных конструкциях редко мешали понимать. На band 5 базовые предложения обычно верны, но в немногих сложных попытках обычно есть ошибки, которые могут затруднять понимание.",
  "Use both simple and complex sentences within the same answer, aiming for at least one complex sentence per answer.":
    "Используйте в одном ответе и простые, и сложные предложения, минимум одно сложное на ответ.",
  "Practise one complex structure at a time (for example, relative clauses with who, which, that) until it becomes automatic before adding another.":
    "Отрабатывайте по одной сложной конструкции за раз (например, определительные придаточные с who, which, that), пока она не пойдёт сама, и только потом беритесь за следующую.",
  "Keep basic tense and subject-verb agreement accurate even while attempting harder structures.":
    "Держите базовые времена и согласование подлежащего со сказуемым точными даже тогда, когда беретесь за конструкции потруднее.",
  "Notice which specific error you make most often and drill it in isolation.":
    "Заметьте, какую именно ошибку вы делаете чаще всего, и отработайте её отдельно.",
  "Stop attempting a complex structure so unfamiliar that the sentence collapses. Simplify instead if it is not ready yet.":
    "Перестаньте браться за настолько незнакомую конструкцию, что предложение разваливается. Если она ещё не готова, скажите проще.",
  "Stop making the same basic tense error repeatedly across the test.":
    "Перестаньте повторять одну и ту же базовую ошибку во времени на протяжении экзамена.",
  "The original has a subject-verb agreement error and three disconnected sentences. The revision uses a relative clause (\"who works\") correctly and links the ideas, which is the mix of simple and complex forms band 6 asks for.":
    "В исходном варианте ошибка в согласовании и три несвязанных предложения. В исправленном верно использовано определительное придаточное (\"who works\") и мысли связаны, а это и есть то сочетание простых и сложных форм, которого требует band 6.",
  "Describe 3 people you know, each time using a relative clause with who or which. Check subject-verb agreement in every sentence. 15 minutes.":
    "Опишите 3 знакомых людей, каждый раз с определительным придаточным с who или which. Проверьте согласование в каждом предложении. 15 минут.",
  "Band 7 asks for a range of complex structures used with some flexibility, and sentences that are frequently error-free. Band 6 allows frequent mistakes with complex structures as long as they rarely cause comprehension problems, without requiring frequent error-free sentences.":
    "Band 7 требует набора сложных конструкций, использованных с некоторой гибкостью, и частых предложений без ошибок. Band 6 допускает частые ошибки в сложных конструкциях, лишь бы они редко мешали понимать, и не требует частых безошибочных предложений.",
  "Use at least two different complex structures per longer answer (Part 2 or Part 3): conditionals, relative clauses, comparatives, or passive voice.":
    "Используйте хотя бы две разные сложные конструкции в каждом длинном ответе (Part 2 или Part 3): условные предложения, определительные придаточные, сравнения или пассив.",
  "Aim for most of your sentences on familiar topics to come out completely accurate.":
    "Добивайтесь того, чтобы на знакомых темах большинство предложений выходило полностью верными.",
  "Practise conditionals specifically (if I had..., if I were...), since they stand out clearly at band 7.":
    "Отрабатывайте отдельно условные предложения (if I had..., if I were...): на band 7 они заметны сразу.",
  "Vary sentence length: mix short, direct sentences with longer complex ones.":
    "Меняйте длину предложений: мешайте короткие прямые с длинными сложными.",
  "Stop using only one type of complex structure throughout the whole test.":
    "Перестаньте использовать на весь экзамен одну и ту же сложную конструкцию.",
  "Stop letting grammar mistakes persist on the same familiar-topic sentences you have already practised.":
    "Перестаньте оставлять грамматические ошибки в тех предложениях на знакомые темы, которые вы уже отрабатывали.",
  "The original mixes present and future forms incorrectly for a hypothetical idea. The revision uses the correct second conditional (\"If I had... I would...\") and adds a relative-style justification, which is the range and accuracy band 7 asks for.":
    "В исходном варианте настоящее и будущее смешаны неверно для гипотетической мысли. В исправленном взят верный second conditional (\"If I had... I would...\") и добавлено пояснение, а это и есть то разнообразие и та точность, которых требует band 7.",
  "Answer 4 questions using a second conditional each time (\"If I had...\", \"If I were...\"). Check the verb forms carefully. 15 minutes.":
    "Ответьте на 4 вопроса, каждый раз со вторым типом условного (\"If I had...\", \"If I were...\"). Внимательно проверьте формы глаголов. 15 минут.",
  "Band 8 asks for a wide range of structures used flexibly, where the majority of sentences are error-free, with only very occasional inappropriacies or basic errors. Band 7 already produces frequent error-free sentences, but some grammatical mistakes still persist regularly.":
    "Band 8 требует широкого набора конструкций, использованных гибко, при котором большинство предложений без ошибок, а неуместности и базовые ошибки встречаются совсем изредка. Band 7 уже даёт частые безошибочные предложения, но грамматические ошибки там ещё регулярны.",
  "Use a wide range of structures within a single answer, mixing tenses, conditionals, passive voice, and relative clauses naturally.":
    "Используйте широкий набор конструкций в одном ответе, естественно смешивая времена, условные предложения, пассив и определительные придаточные.",
  "Check on a recording that more than half of all your sentences across the test are completely error-free.":
    "Проверьте по записи, что больше половины всех предложений за экзамен полностью без ошибок.",
  "Practise unscripted, spontaneous complex sentences on unfamiliar Part 3 topics, not memorised ones.":
    "Тренируйте спонтанные, незаученные сложные предложения на незнакомых темах Part 3.",
  "Fix any remaining systematic error (one you make the same way repeatedly) through targeted drilling.":
    "Уберите оставшуюся системную ошибку (ту, которую вы повторяете одинаково) через точечную отработку.",
  "Stop making the same grammar mistake in a pattern across multiple answers. That counts as systematic, not occasional.":
    "Перестаньте повторять одну и ту же грамматическую ошибку из ответа в ответ. Это уже системная ошибка, а не случайная.",
  "Stop relying on complex structures only in prepared, memorised sections.":
    "Перестаньте использовать сложные конструкции только в подготовленных, заученных кусках.",
  "The original repeats a past-participle error (\"introduce\" instead of \"introduced\") and a subject-verb agreement error (\"it help\"). The revision fixes both, matching the \"majority of sentences error-free\" standard at band 8.":
    "В исходном варианте повторяется ошибка в причастии (\"introduce\" вместо \"introduced\") и ошибка в согласовании (\"it help\"). В исправленном обе убраны, и это отвечает требованию band 8: большинство предложений без ошибок.",
  "Record yourself answering 3 unfamiliar Part 3 questions without preparation. Listen back and mark every recurring error type, then drill that one specifically. 20 minutes.":
    "Запишите себя, отвечая без подготовки на 3 незнакомых вопроса Part 3. Прослушайте и отметьте каждый повторяющийся тип ошибки, затем отработайте именно его. 20 минут.",
  "Band 9 asks for a full range of structures used naturally and appropriately, with consistently accurate structures apart from slips characteristic of native speaker speech. This band is extremely rare: it describes accuracy that holds up even under the pressure of real-time speech.":
    "Band 9 требует полного набора конструкций, использованных естественно и уместно, и стабильно точной грамматики, если не считать оплошностей, свойственных и речи носителя. Балл исключительно редкий: он описывает точность, которая держится даже под давлением живой речи.",
  "Use complex structures so naturally they are indistinguishable from spontaneous native speech, with no visible effort attached to them.":
    "Используйте сложные конструкции настолько естественно, чтобы они были неотличимы от спонтанной речи носителя и за ними не читалось усилия.",
  "Keep accuracy consistent across all topics, in both prepared and unprepared answers.":
    "Держите точность ровной на всех темах, и в подготовленных ответах, и в неподготовленных.",
  "Accept that only slips a native speaker might also make (a false start, a minor self-correction) should remain.":
    "Смиритесь с тем, что остаться могут только оплошности, которые допустил бы и носитель (фальстарт, мелкое самоисправление).",
  "Stop treating any non-native-style error as a \"slip\". At this level, accuracy should hold even under pressure.":
    "Перестаньте называть \"оплошностью\" ошибку, которую носитель не сделал бы. На этом уровне точность должна держаться и под давлением.",
  "Both are fluent and accurate, but the second is tighter and more natural, dropping the filler opener and using \"reshape\" and a spontaneous-sounding addition, which reads closer to unscripted native speech at band 9.":
    "Оба ответа свободны и верны, но второй собраннее и естественнее: в нём нет дежурного зачина, есть \"reshape\" и добавление, которое звучит спонтанно, и это ближе к неподготовленной речи носителя на band 9.",
  "Record a full mock Part 3 discussion. Listen for any grammar error and judge honestly whether a native speaker would ever make that particular one. 20 minutes.":
    "Запишите полное пробное обсуждение Part 3. Прислушайтесь к каждой грамматической ошибке и честно решите, сделал бы носитель именно такую. 20 минут.",
  "Band 4 has a limited range of pronunciation features with frequent mispronunciations that cause the listener some difficulty. Band 5 shows all the positive features of band 4 plus some, but not all, of band 6: fewer frequent lapses, and some effective use of a wider range of features beginning to appear.":
    "На band 4 набор произносительных средств узкий, а частые ошибки в произношении местами затрудняют слушателя. Band 5 показывает всё хорошее из band 4 плюс кое-что, но не всё, из band 6: срывов меньше, и начинает появляться удачное использование более широкого набора средств.",
  "Identify your 3 to 5 most frequently mispronounced sounds (many students struggle with th, r/l, or final consonants) and drill them daily.":
    "Определите 3-5 звуков, которые вы чаще всего произносите неверно (многим трудно даются th, r и l, конечные согласные), и отрабатывайте их каждый день.",
  "Mark word stress on new vocabulary when you learn it, and say the word aloud stressing the right syllable.":
    "Помечайте ударение в новых словах, когда их учите, и произносите слово вслух с верным ударным слогом.",
  "Practise linking words together in short phrases (\"an apple\", not \"a... napple... pause\") instead of pronouncing every word separately.":
    "Тренируйте слитное произношение коротких сочетаний (\"an apple\", а не \"a... napple... пауза\"), вместо того чтобы выговаривать каждое слово отдельно.",
  "Slow down slightly so individual sounds come out clearly. Speed can come later.":
    "Немного замедлитесь, чтобы отдельные звуки выходили чисто. Скорость придёт позже.",
  "Stop speaking so fast that individual sounds get dropped or blurred.":
    "Перестаньте говорить так быстро, что отдельные звуки пропадают или смазываются.",
  "Stop guessing at stress placement on multi-syllable words. Look it up and practise it.":
    "Перестаньте угадывать ударение в многосложных словах. Посмотрите и отработайте.",
  "Wrong word stress is one of the clearest causes of the \"frequent mispronunciation\" that band 4 describes. Fixing stress on individual words is a concrete first step toward the more controlled features band 5 begins to show.":
    "Неверное ударение это одна из самых явных причин тех \"частых ошибок в произношении\", о которых говорит band 4. Починить ударение в отдельных словах это конкретный первый шаг к тому более управляемому произношению, которое начинает появляться на band 5.",
  "Pick 5 words you use often and often mis-stress. Look up their stress pattern and say each one aloud 10 times, exaggerating the stressed syllable. 15 minutes.":
    "Возьмите 5 слов, которые вы часто используете и часто произносите с неверным ударением. Посмотрите схему ударения и скажите каждое вслух 10 раз, подчёркнуто выделяя ударный слог. 15 минут.",
  "Band 6 uses a range of pronunciation features with mixed control: some effective use, though not sustained, and the speaker can generally be understood throughout even though individual word or sound mispronunciations reduce clarity at times. Band 5 only shows some, not most, of these features.":
    "На band 6 набор произносительных средств уже есть, но владение неровное: местами удачно, хотя и не постоянно, и вас в целом понимают на протяжении всей речи, пусть отдельные слова и звуки местами снижают ясность. Band 5 показывает лишь некоторые из этих черт, а не большинство.",
  "Practise sentence stress: stress the key content words (nouns, verbs, adjectives) in each sentence rather than every word equally.":
    "Отрабатывайте фразовое ударение: выделяйте в предложении ключевые слова (существительные, глаголы, прилагательные), а не все подряд одинаково.",
  "Use chunking: group words into short meaningful phrases with a brief pause between them, rather than one long run-on stream.":
    "Делите речь на смысловые куски: объединяйте слова в короткие осмысленные группы с маленькой паузой между ними, вместо одного длинного потока.",
  "Record a short answer and check whether a listener could understand it throughout, even with some mispronounced words.":
    "Запишите короткий ответ и проверьте, понял бы вас слушатель от начала до конца, даже при паре неверно произнесённых слов.",
  "Work specifically on the individual sounds that most often confuse listeners for your first language background.":
    "Отработайте отдельно те звуки, которые чаще всего сбивают слушателя именно у носителей вашего родного языка.",
  "Stop pronouncing every word with equal, flat stress.":
    "Перестаньте произносить все слова с одинаковым, ровным ударением.",
  "Stop running all your words together without any chunking or phrase breaks.":
    "Перестаньте сливать всё в один поток без смысловых групп и пауз.",
  "Flat stress makes speech harder to follow even when every sound is correct. Adding sentence stress and a chunking pause is the \"some effective use of features\" band 6 is listening for, even if it is not yet sustained throughout.":
    "Ровное ударение делает речь труднее для восприятия, даже когда все звуки верны. Фразовое ударение и пауза между смысловыми группами это и есть то \"местами удачное\" использование средств, которое слушает band 6, пусть оно ещё и непостоянно.",
  "Take one memorised sentence. Say it 5 times, each time stressing a different word, and notice how the meaning shifts. Then say it naturally, stressing only the key content words. 15 minutes.":
    "Возьмите одно выученное предложение. Скажите его 5 раз, каждый раз выделяя другое слово, и заметьте, как меняется смысл. Потом скажите естественно, выделяя только ключевые слова. 15 минут.",
  "Band 7 shows all the positive features of band 6 and some, but not all, of band 8: sustained control moving toward a wide range of features with only occasional lapses, easy to understand throughout, with accent having minimal effect on intelligibility.":
    "Band 7 показывает всё хорошее из band 6 и кое-что, но не всё, из band 8: устойчивое владение, которое движется к широкому набору средств, лишь с редкими срывами, речь понятна на всём протяжении, а акцент почти не мешает.",
  "Extend your control of stress and chunking so it holds up for longer answers (Part 2's 2-minute monologue), not just short Part 1 answers.":
    "Растяните контроль над ударением и смысловыми группами на длинные ответы (двухминутный монолог в Part 2), а не только на короткие ответы Part 1.",
  "Add intonation that shows attitude and meaning: a rising tone for surprise or a question, a falling tone to sound confident and final.":
    "Добавьте интонацию, которая передаёт отношение и смысл: восходящий тон для удивления или вопроса, нисходящий, чтобы прозвучать уверенно и завершённо.",
  "Practise weak forms: the quick, unstressed pronunciation of small words like \"to\", \"and\", \"of\" in fast natural speech (for example, \"cup of tea\" sounding like \"cuppa tea\").":
    "Отрабатывайте слабые формы: быстрое безударное произношение мелких слов вроде \"to\", \"and\", \"of\" в естественной беглой речи (например, \"cup of tea\" звучит почти как \"cuppa tea\").",
  "Check that listeners understand you throughout a whole answer, not just in short bursts.":
    "Проверьте, что вас понимают на протяжении всего ответа, а не только короткими отрезками.",
  "Stop letting your pronunciation control drop in the second half of longer answers.":
    "Перестаньте терять контроль над произношением во второй половине длинных ответов.",
  "Stop pronouncing every small function word (to, of, and) fully and heavily, as if reading aloud.":
    "Перестаньте выговаривать каждое служебное слово (to, of, and) полно и тяжело, как при чтении вслух.",
  "Stressing every word equally, as the first version does, buries the words that actually carry the meaning. Putting sentence stress on centre, weekend and friends, and pausing briefly at one natural phrase boundary, is the chunking and stress control band 7 asks for.":
    "Одинаковое ударение на каждом слове, как в первом варианте, хоронит те слова, которые и несут смысл. Фразовое ударение на centre, weekend и friends и короткая пауза на естественной границе это и есть тот контроль над ударением и смысловыми группами, которого требует band 7.",
  "Speak on one Part 2 cue card for the full 2 minutes. Record it, then compare your pronunciation control in the first 30 seconds versus the last 30 seconds. 20 minutes.":
    "Говорите по одной карточке Part 2 все 2 минуты. Запишите, потом сравните контроль над произношением в первые 30 секунд и в последние 30. 20 минут.",
  "Band 8 uses a wide range of pronunciation features and sustains flexible use of them with only occasional lapses, is easy to understand throughout, and any L1 accent has minimal effect on intelligibility. Band 7 shows only some of these positive features, not all of them.":
    "Band 8 использует широкий набор произносительных средств и держит их гибко, лишь с редкими срывами, речь понятна на всём протяжении, а родной акцент почти не мешает восприятию. Band 7 показывает лишь часть этих черт, а не все.",
  "Sustain strong stress, chunking, and intonation control across the entire test, all three parts, not just your strongest moments.":
    "Держите уверенное ударение, деление на смысловые группы и интонацию весь экзамен, все три части, а не только в лучшие моменты.",
  "Use intonation deliberately to signal meaning (contrast, emphasis, a list), rather than by accident.":
    "Используйте интонацию осознанно, чтобы показать смысл (противопоставление, выделение, перечисление), а не случайно.",
  "Reduce lapses on your hardest individual sounds until they appear rarely, not routinely.":
    "Доведите срывы на самых трудных для вас звуках до редких, а не привычных.",
  "Get feedback from a fluent English speaker on whether your accent ever actually blocks understanding, and target only those specific moments.":
    "Попросите человека, свободно владеющего английским, сказать, действительно ли ваш акцент где-то мешает понять, и работайте только над этими местами.",
  "Stop accepting occasional unintelligible words as normal. At this level, lapses should be rare, not routine.":
    "Перестаньте считать нормой отдельные непонятные слова. На этом уровне срывы должны быть редкими, а не обычными.",
  "Stop worrying about removing your accent entirely. The goal is intelligibility, not sounding native.":
    "Перестаньте переживать из-за акцента как такового. Цель это понятность, а не звучать как носитель.",
  "Band 7 can produce the right words for a contrast without the intonation to match it. Using a rise on the first item and a fall on the second is a concrete, controllable way to make that contrast audible, which is the deliberate use of intonation band 8 asks for.":
    "На band 7 можно подобрать верные слова для противопоставления и не поддержать его интонацией. Подъём на первом элементе и падение на втором это конкретный, управляемый способ сделать противопоставление слышимым, а это и есть осознанная интонация, которой требует band 8.",
  "Do a full 3-part mock speaking test. Rate your own pronunciation control out of 5 for each part separately, and note exactly where it drops. 20 minutes.":
    "Проведите полный пробный экзамен из трёх частей. Оцените своё произношение по пятибалльной шкале отдельно за каждую часть и отметьте, где именно оно проседает. 20 минут.",
  "Band 9 uses a full range of pronunciation features with precision and subtlety, sustains flexible use of them throughout, and is effortless to understand at every point. This band is extremely rare: it describes control with no noticeable dip anywhere in the test.":
    "Band 9 использует полный набор произносительных средств точно и тонко, держит их гибко на всём протяжении, и понимать вас легко в любой момент. Балл исключительно редкий: он описывает владение без единого заметного провала за весь экзамен.",
  "Use the full range of stress, chunking, intonation, and linking with precision in every part of the test, with no noticeable dip in control.":
    "Используйте весь набор: ударение, смысловые группы, интонацию и слитность, точно и в каждой части экзамена, без заметных провалов.",
  "Aim for speech that requires zero effort from the listener to follow, at any point across the 11 to 14 minutes.":
    "Стремитесь к речи, которая не требует от слушателя ни малейшего усилия, в любую минуту из 11-14.",
  "Stop treating any remaining lapse as acceptable. At band 9, control is sustained without exception.":
    "Перестаньте считать допустимым любой оставшийся срыв. На band 9 контроль держится без исключений.",
  "Band 8 already allows \"occasional lapses\". Band 9 asks for the same wide range of features but with the last of those occasional lapses removed, so listening feels completely effortless throughout.":
    "Band 8 уже допускает \"occasional lapses\". Band 9 требует того же широкого набора средств, но без последних из этих редких срывов, так что слушать становится совсем легко.",
  "Record a full mock interview. Mark the exact moments, if any, where a listener would need to concentrate to understand you, and work on those specific sounds or words. 20 minutes.":
    "Запишите полное пробное интервью. Отметьте точные моменты, если они есть, где слушателю пришлось бы вслушиваться, и поработайте именно над этими звуками или словами. 20 минут.",
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
