/* Extra dictionary part: essay and speaking structure guidance.

   Sources: src/data/writing-structures.ts and
   src/data/speaking-structure-guides.ts, shown by WritingCoachPanel and
   SpeakingCoachPanel. Loaded only by screens that call useT('structures').

   What is NOT here, on purpose: the model sentences, sentence starters and
   useful phrases. Those are the English a student is meant to copy into
   their own answer, so translating them would take away the thing the panel
   exists to give. The stage names of A.R.E., PEEL and OREO stay English too,
   because they spell the method out. Task names (Task 1, Task 2), Part
   numbers, band numbers and criterion names (Task Achievement, Fluency and
   Coherence) stay English as everywhere else. */

export const strings: Record<string, string> = {
  /* ================= Speaking: A.R.E. (Part 1) ================= */
  'A.R.E. method': 'Метод A.R.E.',
  'Answer every question in 2 to 4 sentences: one direct answer, then a reason or example. Never just "yes" or "no".':
    'Отвечайте на каждый вопрос двумя, тремя или четырьмя предложениями: сначала прямой ответ, затем причина или пример. Никогда не ограничивайтесь "yes" или "no".',
  'Match the tense of the question: "Did you…?" needs a past answer, "Would you…?" needs would.':
    'Подстраивайте время под вопрос: "Did you…?" требует прошедшего, "Would you…?" требует would.',
  "It's a friendly conversation about you, so relaxed, natural language beats formal essay words here.":
    'Это дружеский разговор о вас, поэтому спокойная, живая речь здесь лучше формальных слов из эссе.',
  "Respond directly in one sentence. Yes, no, sometimes, rarely. Don't dodge or ramble before getting to the point.":
    'Ответьте прямо одним предложением: yes, no, sometimes, rarely. Не уходите от ответа и не растекайтесь перед ним.',
  'Give the reason behind your answer with a conjunction more advanced than a plain "because".':
    'Назовите причину ответа, используя союз посложнее, чем обычное "because".',
  'Add a specific example, memory, or contrasting detail. Connects two ideas in one breath instead of two flat sentences.':
    'Добавьте конкретный пример, воспоминание или контрастную деталь. Так две мысли соединяются в одном дыхании, а не в двух плоских предложениях.',
  'Buying a second to think': 'Выиграть секунду на подумать',
  'Giving a reason': 'Назвать причину',
  'Adding an example': 'Добавить пример',
  Contrasting: 'Противопоставить',
  'One-word answers': 'Ответы из одного слова',
  'Reciting a memorised speech': 'Заученная наизусть речь',
  'Repeating the exact words of the question': 'Повторять слова вопроса дословно',
  'Long silences instead of a thinking phrase': 'Долгие паузы вместо фразы для раздумья',
  'Formal essay language ("Furthermore…")': 'Формальный язык эссе ("Furthermore…")',

  /* ================= Speaking: PEEL (Part 2) ================= */
  'PEEL method': 'Метод PEEL',
  'In the prep minute, write one or two words per bullet. Your notes are a map, not a script.':
    'За минуту подготовки напишите по одному или два слова на каждый пункт. Заметки это карта, а не текст выступления.',
  'Keep talking until the examiner stops you. Stopping well short leaves the examiner little to assess and pulls Fluency and Coherence down; small details and mini-stories fill the time naturally.':
    'Говорите, пока экзаменатор вас не остановит. Если закончить сильно раньше, оценивать будет почти нечего, и Fluency and Coherence просядет; мелкие детали и короткие истории заполняют время сами собой.',
  "It's fine to invent or exaggerate. The examiner grades your English, not your honesty.":
    'Можно придумать или приукрасить. Экзаменатор оценивает ваш английский, а не вашу честность.',
  '15-20s': '15-20 сек',
  '60-70s': '60-70 сек',
  '20-25s': '20-25 сек',
  '10-15s': '10-15 сек',
  'Introduce your topic clearly. Briefly cover the who/what/where.':
    'Понятно обозначьте тему. Коротко скажите кто, что и где.',
  'Work through each bullet point on the cue card in turn, with specific details and examples.':
    'По очереди пройдите каждый пункт карточки задания, с конкретными деталями и примерами.',
  'Expand beyond the bullet points with your personal reaction. How did you feel, what stood out?':
    'Выйдите за пункты карточки и добавьте свою реакцию. Что вы почувствовали, что запомнилось?',
  'Round off your talk with a brief reflection.': 'Завершите рассказ короткой мыслью.',
  'Opening your talk': 'Начать рассказ',
  'Telling the story': 'Рассказывать историю',
  'Your reaction': 'Ваша реакция',
  'Rounding off': 'Завершить',
  'Stopping after 40 or 50 seconds': 'Закончить через 40 или 50 секунд',
  'Reading your notes as a script': 'Читать заметки как готовый текст',
  'Listing the bullets like a checklist': 'Перечислять пункты карточки как список',
  'Skipping the final "explain why" bullet (it carries the talk)':
    'Пропустить последний пункт "explain why" (на нём держится весь рассказ)',
  'Freezing on an unfamiliar topic instead of making something up':
    'Замереть на незнакомой теме вместо того, чтобы что-то придумать',

  /* ================= Speaking: OREO (Part 3) ================= */
  'OREO formula': 'Формула OREO',
  'Part 3 is about people and society in general, not about you. Push each answer past your first sentence.':
    'Part 3 о людях и обществе в целом, а не о вас. Каждый ответ продолжайте дальше первого предложения.',
  "There is no right opinion. You're graded on how you build and defend one.":
    'Правильного мнения не существует. Оценивают то, как вы его выстраиваете и защищаете.',
  'Aim for 3 to 5 sentences per answer: opinion, reason, example, then concede or conclude.':
    'Держите ответ в три, четыре или пять предложений: мнение, причина, пример, затем уступка или вывод.',
  'State your position clearly.': 'Чётко обозначьте свою позицию.',
  'Explain why you hold this view.': 'Объясните, почему вы так считаете.',
  'Give a specific illustration.': 'Приведите конкретную иллюстрацию.',
  'Summarise or acknowledge the other side.': 'Подведите итог или признайте другую сторону.',
  'Giving an opinion': 'Высказать мнение',
  Speculating: 'Предположить',
  Comparing: 'Сравнить',
  Balancing: 'Уравновесить',
  'Buying time': 'Выиграть время',
  'Answering only about yourself instead of people in general':
    'Отвечать только про себя вместо людей в целом',
  'One-sentence answers': 'Ответы из одного предложения',
  'Saying "I don\'t know" and stopping, instead of speculating':
    'Сказать "I don\'t know" и замолчать вместо того, чтобы предположить',
  'Repeating your Part 2 story': 'Повторять свою историю из Part 2',
  'Ignoring the other side of the argument': 'Не замечать другую сторону спора',

  /* ================= Writing: the shared Task 1 skeleton ================= */
  Introduction: 'Вступление',
  'Paraphrase what the visual shows. Never copy the question wording. Keep the place, units and time period.':
    'Перефразируйте то, что показано на изображении. Никогда не копируйте формулировку задания. Сохраните место, единицы измерения и период времени.',
  Overview: 'Обзор',
  'The most important paragraph. Start with "Overall,". Give the 2-3 key features, saving the figures for the detail paragraphs. Task Achievement asks for a clear overview from Band 6 upwards.':
    'Самый важный абзац. Начните с "Overall,". Назовите 2-3 ключевые особенности, а цифры оставьте для абзацев с деталями. Task Achievement требует внятного обзора начиная с Band 6.',
  'Detail 1': 'Детали 1',
  'The first logical group of information, supported with selected figures.':
    'Первая логичная группа данных, подкреплённая выбранными цифрами.',
  'Detail 2': 'Детали 2',
  'The remaining group. Every line, stage or area must be mentioned, even briefly. Compare across groups where you can.':
    'Оставшаяся группа. Каждая линия, стадия или зона должна быть упомянута, пусть кратко. Где можно, сравнивайте группы между собой.',

  /* ================= Writing: Opinion ================= */
  'Opinion Essay': 'Эссе с мнением',
  'Paraphrase the statement, then state your position: "While some argue…, I firmly believe…"':
    'Перефразируйте утверждение, затем заявите свою позицию: "While some argue…, I firmly believe…"',
  'Body 1': 'Основной абзац 1',
  'First reason. Topic sentence → explanation → example (TEE).':
    'Первая причина. Тезис → объяснение → пример (TEE).',
  'Body 2': 'Основной абзац 2',
  'Second reason, same TEE shape. Or the concession for a partial-agreement essay ("Admittedly…, however…").':
    'Вторая причина, та же схема TEE. Или уступка, если вы согласны лишь частично ("Admittedly…, however…").',
  Conclusion: 'Заключение',
  'Restate your position in fresh words. No new ideas.':
    'Повторите свою позицию другими словами. Никаких новых мыслей.',
  'Stating opinion': 'Заявить мнение',
  'Partial agreement': 'Частичное согласие',
  Conceding: 'Уступка',
  Supporting: 'Подкрепить',
  Concluding: 'Завершить',
  'No clear position. Describing both sides and never choosing':
    'Нет чёткой позиции: описали обе стороны и так и не выбрали',
  'Position flips between introduction and conclusion':
    'Позиция меняется между вступлением и заключением',
  'Answering a different question than the one asked': 'Ответ не на тот вопрос, который задали',
  'New arguments appearing in the conclusion': 'В заключении появляются новые аргументы',

  /* ================= Writing: Discussion ================= */
  'Discussion Essay': 'Эссе с двумя точками зрения',
  'Paraphrase both views + state your opinion.':
    'Перефразируйте обе точки зрения и заявите своё мнение.',
  'The first view. Why people hold it, with an example.':
    'Первая точка зрения. Почему её придерживаются, с примером.',
  "The second view, same depth. Don't let your preferred view get all the space.":
    'Вторая точка зрения, с той же глубиной. Не отдавайте всё место той, которая вам ближе.',
  'Body 3 (optional)': 'Основной абзац 3 (по желанию)',
  'Your own position developed, especially if it blends the two.':
    'Развёрнутая собственная позиция, особенно если она смешивает обе.',
  'Summarise both sides in a phrase and restate where you stand.':
    'Сведите обе стороны в одну фразу и повторите, на чём вы стоите.',
  'View A': 'Точка зрения A',
  'View B': 'Точка зрения B',
  Weighing: 'Взвесить',
  'Your voice': 'Ваш голос',
  'Discussing only the view you support':
    'Обсуждать только ту точку зрения, которую поддерживаете',
  'Forgetting to give your own opinion at all': 'Совсем забыть высказать своё мнение',
  'Straw-manning the view you dislike in one dismissive sentence':
    'Отмахнуться от неудобной точки зрения одним пренебрежительным предложением',
  'Unsignalled voices. Whose opinion is this sentence?':
    'Непонятно, чей голос: чьё мнение в этом предложении?',

  /* ================= Writing: Problem / Solution ================= */
  'Problem / Solution Essay': 'Эссе о проблеме и решении',
  'Paraphrase the situation + roadmap matching your pattern (cause+solution / problem+solution / cause+effect / solution-only).':
    'Перефразируйте ситуацию и наметьте план по своему типу (причина и решение / проблема и решение / причина и следствие / только решение).',
  'The first half of your pattern (causes / problems), each explained with a consequence or example.':
    'Первая половина вашего типа (причины или проблемы), каждая с последствием или примером.',
  'The second half of your pattern (solutions / effects). Matched one-for-one where the pattern requires it.':
    'Вторая половина вашего типа (решения или следствия). Одно к одному, если тип этого требует.',
  'One sentence of summary + an outlook.': 'Одно предложение итога и взгляд вперёд.',
  'Cause + Solution. "What are the causes? What solutions can be proposed?"':
    'Причина и решение. "What are the causes? What solutions can be proposed?"',
  'Problem + Solution. "What problems does this cause? How can these be solved?"':
    'Проблема и решение. "What problems does this cause? How can these be solved?"',
  'Cause + Effect: "What are the causes? What effects does it have?" (no solution word anywhere, so don\'t propose any)':
    'Причина и следствие: "What are the causes? What effects does it have?" (слова о решении нет нигде, значит и предлагать его не нужно)',
  'Solution-only. "What can be done to address this?" (causes/problems not asked)':
    'Только решение. "What can be done to address this?" (про причины и проблемы не спрашивают)',
  Cause: 'Причина',
  Effect: 'Следствие',
  Proposing: 'Предложить',
  Evaluating: 'Оценить',
  'Adding solutions to a Cause + Effect question that never asked for any':
    'Добавить решения в вопрос про причины и следствия, где их не просили',
  'Answering "causes" when the question asked "problems" (or vice versa)':
    'Отвечать про "causes", когда спросили про "problems", и наоборот',
  "Solutions that don't match any stated problem or cause":
    'Решения, которые не отвечают ни одной названной проблеме или причине',
  'A shopping list of five one-line ideas instead of two developed ones':
    'Список из пяти идей по строчке вместо двух развёрнутых',

  /* ================= Writing: Advantages & Disadvantages ================= */
  'Advantages & Disadvantages Essay': 'Эссе о плюсах и минусах',
  'Paraphrase the topic. Neutral form: preview both sides. Opinion form: also state your verdict here.':
    'Перефразируйте тему. Нейтральная форма: анонсируйте обе стороны. Форма с мнением: здесь же заявите свой вывод.',
  'Body 1. Advantages': 'Основной абзац 1. Плюсы',
  'Your strongest 1-2 benefits, each with TEE (Topic → Explanation → Example).':
    'Ваши самые сильные 1-2 плюса, каждый по схеме TEE (Topic → Explanation → Example).',
  'Body 2 (Disadvantages)': 'Основной абзац 2 (минусы)',
  "Your strongest 1-2 drawbacks, same TEE shape and the same length as Body 1. Don't let one side dominate.":
    'Ваши самые сильные 1-2 минуса, та же схема TEE и та же длина, что у первого абзаца. Не давайте одной стороне перевесить.',
  'Neutral form summarises both sides evenly; opinion form restates your verdict, weighing the two against each other.':
    'Нейтральная форма поровну подводит итог обеим сторонам; форма с мнением повторяет ваш вывод, взвешивая одно против другого.',
  'Neutral form: "What are the advantages and disadvantages of this?". No opinion required.':
    'Нейтральная форма: "What are the advantages and disadvantages of this?". Мнение не требуется.',
  'Opinion form: "Do the advantages outweigh the disadvantages?". You must state and defend a verdict.':
    'Форма с мнением: "Do the advantages outweigh the disadvantages?". Нужно заявить и защитить свой вывод.',
  'Introducing advantages': 'Ввести плюсы',
  'Introducing disadvantages': 'Ввести минусы',
  'Weighing (opinion form)': 'Взвесить (форма с мнением)',
  'Linking within a side': 'Связки внутри одной стороны',
  'Writing a neutral essay when the question asked "do the advantages outweigh". No verdict given':
    'Написать нейтральное эссе, когда спросили "do the advantages outweigh". Вывода нет',
  'Sneaking a personal opinion into a neutral-form essay that never asked for one':
    'Протащить личное мнение в нейтральное эссе, где его не просили',
  'Giving four rushed one-line points instead of two well-developed ones per side':
    'Дать четыре торопливых пункта по строчке вместо двух развёрнутых на каждую сторону',
  'Devoting three sentences to advantages and one to disadvantages (or vice versa)':
    'Отдать три предложения плюсам и одно минусам, или наоборот',

  /* ================= Writing: Two-Part Question ================= */
  'Two-Part Question Essay': 'Эссе с двумя вопросами',
  'Paraphrase the situation + answer both questions in miniature.':
    'Перефразируйте ситуацию и в миниатюре ответьте на оба вопроса.',
  'Body 1 = Question 1': 'Основной абзац 1 = вопрос 1',
  'Answer it completely, with explanation and example.':
    'Ответьте на него полностью, с объяснением и примером.',
  'Body 2 = Question 2': 'Основной абзац 2 = вопрос 2',
  'Answer it completely. Give it the same length and effort as Body 1.':
    'Ответьте полностью. Дайте ему столько же места и сил, сколько первому абзацу.',
  'Both answers restated in one or two sentences.':
    'Оба ответа, повторённые в одном или двух предложениях.',
  'One question, rare: still four paragraphs. Split your answer into two distinct angles.':
    'Один вопрос, редкий случай: всё равно четыре абзаца. Разделите ответ на два разных угла.',
  'Two questions, the standard form: one body paragraph per question.':
    'Два вопроса, обычный случай: по одному основному абзацу на вопрос.',
  'Three questions, occasional: five paragraphs, or merge the two most closely related.':
    'Три вопроса, иногда: пять абзацев или объединить два самых близких.',
  Reasons: 'Причины',
  'Positive / negative': 'Плюс или минус',
  Effects: 'Следствия',
  'Spending 80% of the essay on question 1 and a rushed sentence on question 2':
    'Отдать 80% эссе первому вопросу и одно торопливое предложение второму',
  'Answering "positive or negative?" with a list of both and no verdict':
    'На "positive or negative?" перечислить и то и другое без вывода',
  'Merging every question into one muddled paragraph, whatever the count':
    'Слить все вопросы в один путаный абзац, сколько бы их ни было',
  'Introduction that only paraphrases and previews nothing':
    'Вступление, которое только перефразирует и ничего не анонсирует',

  /* ================= Writing: Charts, Graphs & Tables ================= */
  // Wording matched to dict/ru/course-data.ts, which already translates this
  // lesson title: the same words must not mean two things on one page.
  'Charts, Graphs & Tables': 'Диаграммы, графики и таблицы',
  'Change over time (line graph, dated bars): overall direction, highest peak/lowest point, fastest change, crossovers, start vs end values.':
    'Изменение во времени (линейный график, столбцы с датами): общее направление, самый высокий пик и самая низкая точка, самое быстрое изменение, пересечения, значения в начале и в конце.',
  'Static comparison (pie, table, one-date bars): largest/smallest categories, anything roughly equal, anything dominant (>50%), striking gaps.':
    'Статичное сравнение (круговая диаграмма, таблица, столбцы на одну дату): самые крупные и самые мелкие категории, примерно равные, всё, что заметно преобладает (>50%), резкие разрывы.',
  'Tables: scan both directions, down the columns and across the rows, and report the extremes, not the middle.':
    'Таблицы: просматривайте в обе стороны, вниз по столбцам и вдоль строк, и описывайте крайности, а не середину.',
  'Two visuals together: connect them in the overview ("while X…, Y…"). Never describe them one after another as separate reports.':
    'Два изображения вместе: свяжите их в обзоре ("while X…, Y…"). Никогда не описывайте их одно за другим как два отдельных отчёта.',
  Up: 'Рост',
  Down: 'Падение',
  Flat: 'Без изменений',
  'Up & down': 'Колебания',
  Extremes: 'Крайние значения',
  'Grading change': 'Насколько сильное изменение',
  'Copying the question wording into the introduction':
    'Скопировать формулировку задания во вступление',
  'No overview. The Band 5 descriptor is written for exactly this, so it holds Task Achievement down':
    'Нет обзора. Дескриптор Band 5 написан ровно про это, поэтому Task Achievement не поднимется',
  'Listing every data point instead of selecting key features':
    'Перечислить все данные вместо того, чтобы выбрать ключевые особенности',
  'Giving an opinion, or explaining causes the data does not show':
    'Высказать мнение или объяснить причины, которых в данных нет',
  'Describing categories one by one with no comparison':
    'Описывать категории по одной, без сравнения',

  /* ================= Writing: Process Diagram ================= */
  'Process Diagram': 'Диаграмма процесса',
  'How many stages are there?. Goes straight into your overview.':
    'Сколько здесь стадий? Это сразу идёт в обзор.',
  'Where does it start and end?. The other half of the overview.':
    'Где начало и где конец? Вторая половина обзора.',
  'Linear or cyclical? Does it finish, or loop back to the beginning?':
    'Линейный процесс или цикличный? Он заканчивается или возвращается к началу?',
  'Natural (active voice, "the water evaporates") or man-made (passive voice, "the glass is crushed")?':
    'Природный (активный залог, "the water evaporates") или созданный человеком (пассивный залог, "the glass is crushed")?',
  'Where will you split the stages for your two detail paragraphs?':
    'Где вы разделите стадии на два абзаца с деталями?',
  Sequencing: 'Последовательность',
  'Passive voice': 'Пассивный залог',
  Purpose: 'Цель',
  Simultaneity: 'Одновременность',
  Cycles: 'Циклы',
  'Forgetting the overview because "there are no trends". Count the stages instead':
    'Забыть обзор, потому что "тут нет трендов". Посчитайте стадии',
  'Active voice everywhere ("someone collects the bottles")':
    'Везде активный залог ("someone collects the bottles")',
  'Skipping stages or inventing extra ones': 'Пропустить стадии или придумать лишние',
  'Only using "then… then… then" to sequence':
    'Связывать всё только через "then… then… then"',

  /* ================= Writing: Maps & Plans ================= */
  'Maps & Plans': 'Карты и планы',
  'Check the dates. Past → past, or past → present decides your tenses.':
    'Проверьте даты. Прошлое → прошлое или прошлое → настоящее решает, какие времена использовать.',
  'Find north and the main fixed reference points.':
    'Найдите север и главные неподвижные ориентиры.',
  'Scan for four kinds of change: what disappeared, what appeared, what changed use, what grew or shrank.':
    'Ищите четыре вида изменений: что исчезло, что появилось, что сменило назначение, что выросло или уменьшилось.',
  'Name the headline transformation for the overview.':
    'Назовите главное преобразование для обзора.',
  'Note what stayed the same. Worth a sentence.':
    'Отметьте, что осталось прежним. Это стоит отдельного предложения.',
  Location: 'Расположение',
  Additions: 'Что появилось',
  Removals: 'Что исчезло',
  Replacement: 'Замена',
  Expansion: 'Расширение',
  'Describing each map separately instead of the changes between them':
    'Описывать каждую карту отдельно вместо изменений между ними',
  'Compass confusion. Check north before you write':
    'Путаница со сторонами света. Проверьте, где север, прежде чем писать',
  'Present tense for things that happened between the two dates':
    'Настоящее время для того, что произошло между двумя датами',
  'Ignoring features that did not change': 'Не замечать то, что не изменилось',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
