/* Russian: the written focused task, and the hand-off that sends a student
   to one. Batch owner: WP17 (personal learning build). Nobody else edits
   this file.

   Covers: src/components/learning/WritingFocusedTask.tsx,
   WorkOnOverview.tsx, written-focused-task.ts, and the English written into
   src/data/focused/writing-task1-overview.ts (titles, the objective, the
   instructions and what to notice in the model).

   Strings other batches already carry are deliberately NOT repeated: the
   dictionary is one merged object and every caller finds them there.
   "Guided practice", "Real exam material.", "What changed:", "Read the
   method again" and "Simulated, not a real Mr EZ reply." come from
   learning-focus; "Independent check" from learning-today; "Build your
   overview" from trainers-writing-speaking; the three "added to your plan"
   sentences from learning-account; "The task" from course-lessons.

   EXAM MATERIAL STAYS ENGLISH. The prompt, its chart, the band 8 model
   overview and the prompt's own guiding questions are never translated
   here: a student has to recognise those exact words on the real paper.
   What is translated is the teaching around them.

   NEVER A BALL. The one word this file must get right every time is that
   nothing here is a балл. See docs/I18N-GUIDE.md for the style rules and
   the glossary. */

export const strings: Record<string, string> = {
  /* WritingFocusedTask.tsx: the rules of a check, and the workspace */
  'No guiding questions, no model answer and no Mr EZ on this one. That is what makes the result mean something.':
    'Здесь нет ни наводящих вопросов, ни образца ответа, ни Mr EZ. Именно поэтому результат что-то значит.',
  'This browser is not saving your work right now, so this attempt cannot be added to your record.':
    'Этот браузер сейчас не сохраняет вашу работу, поэтому эту попытку не получится добавить в ваш профиль.',
  'Writing Task 1': 'Writing Task 1',
  'Your overview': 'Ваш overview',
  'Two sentences on the main trends, with no figures.':
    'Два предложения об основных тенденциях, без цифр.',
  '{words} words, aiming for {min} to {max}': '{words} слов, нужно от {min} до {max}',
  'Looking at your overview...': 'Смотрим ваш overview...',
  'Check my overview': 'Проверить мой overview',
  'Check my revision': 'Проверить исправленный вариант',

  /* WritingFocusedTask.tsx: the guiding questions */
  'Show the questions that build an overview': 'Показать вопросы, которые помогают собрать overview',
  'These lead you to your own sentence. Opening them is recorded as help, which is honest rather than a penalty.':
    'Они ведут вас к вашему собственному предложению. То, что вы их открыли, записывается как помощь: это честность, а не наказание.',

  /* WritingFocusedTask.tsx: the verdict */
  'Met: this does what an overview has to do.': 'Выполнено: здесь есть то, что должен делать overview.',
  'Partly: some of what an overview has to do is here.':
    'Частично: часть того, что должен делать overview, здесь есть.',
  'Not yet: this does not do what an overview has to do.':
    'Пока нет: здесь нет того, что должен делать overview.',
  'The one thing to change:': 'Одна вещь, которую стоит изменить:',
  'This is one objective, judged on two sentences. It is not a band and it does not change your Writing score.':
    'Это одна конкретная цель, оценённая по двум предложениям. Это не балл, и это не меняет вашу оценку за Writing.',
  'Automatic checks of the words you typed. They are not a judgement of your writing and they do not add up to one.':
    'Автоматические проверки написанных вами слов. Это не оценка вашего текста, и вместе они тоже не складываются в оценку.',

  /* WritingFocusedTask.tsx: the model, afterwards only */
  'Show one way to write it': 'Показать один из вариантов',
  'One way to write it, from the Band 8 model': 'Один из вариантов, из образца на Band 8',
  'What to notice': 'На что обратить внимание',
  'One way, not the answer. Compare it with your own sentence rather than replacing yours with it.':
    'Это один из вариантов, а не правильный ответ. Сравните его со своим предложением, а не заменяйте своё этим.',

  /* WritingFocusedTask.tsx: before and after */
  'What you wrote first': 'Что вы написали сначала',
  'Your revision': 'Ваш исправленный вариант',
  'Write it again': 'Написать ещё раз',

  /* written-focused-task.ts: the automatic checks, as labels and results */
  'Does it open as a summary?': 'Начинается ли он как обобщение?',
  'Does it make more than one point?': 'Есть ли в нём больше одной мысли?',
  'Is it free of figures?': 'Обходится ли он без цифр?',
  'Is it about the right length?': 'Подходит ли его длина?',
  'It opens with a summarising word, so a reader knows straight away that this is the big picture.':
    'Он начинается с обобщающего слова, поэтому читатель сразу понимает, что это общая картина.',
  'No sentence starts with a summarising word such as "Overall". An examiner looks for the overview first, so it is worth signalling.':
    'Ни одно предложение не начинается с обобщающего слова вроде "Overall". Экзаменатор ищет overview в первую очередь, поэтому его стоит обозначить.',
  'Counting sentences and joining words such as "while", this makes {count} points.':
    'Если считать предложения и союзы вроде "while", здесь {count} мысли.',
  'Counting sentences and joining words such as "while", this makes {count} point. The descriptor asks for the main features, which is more than one.':
    'Если считать предложения и союзы вроде "while", здесь {count} мысль. В дескрипторе говорится про основные особенности, а это больше одной.',
  'No figures, which is what keeps an overview an overview.':
    'Цифр нет, а именно это и делает overview обобщением.',
  'This contains {count} figure or figures, starting with "{first}". Figures belong in the detail paragraphs.':
    'Здесь есть цифры ({count}), первая из них "{first}". Цифрам место в абзацах с деталями.',
  '{words} words, inside the {min} to {max} this task asks for.':
    '{words} слов, это внутри нужного диапазона от {min} до {max}.',
  '{words} words, against the {min} to {max} this task asks for.':
    '{words} слов при нужном диапазоне от {min} до {max}.',

  /* written-focused-task.ts: what the closing panel says */
  'Nothing looked at your writing this time, so there is no judgement of it here. The checks below are automatic: they look at the words you typed and nothing else.':
    'В этот раз ваш текст никто не посмотрел, поэтому здесь нет его оценки. Проверки ниже автоматические: они смотрят только на написанные вами слова.',
  'This is recorded as written but not judged, which is what it is. It changes nothing about what your plan thinks you can do.':
    'Это записано как написанное, но не оценённое, потому что так и есть. На то, что ваш план думает о ваших умениях, это никак не влияет.',
  'Read your own answer against that one sentence and mark the exact words that meet it.':
    'Прочитайте свой ответ рядом с этим одним предложением и отметьте слова, которые ему соответствуют.',
  'On a visual you had not seen, with no guiding questions and no help, Mr EZ judged this against the one objective above.':
    'На незнакомом вам изображении, без наводящих вопросов и без помощи, Mr EZ оценил это по одной цели, указанной выше.',
  'That is one short sample judged against one objective. It is enough to move what your plan works on next, and it is not a band and not a score for a whole report.':
    'Это один короткий фрагмент, оценённый по одной цели. Этого достаточно, чтобы изменить то, чем план займётся дальше, но это не балл и не оценка за весь отчёт.',
  'What two sentences cannot show is whether the rest of the report holds up under twenty minutes. A full Task 1 marked by the examiner is what shows that.':
    'Два предложения не показывают, выдержит ли остальной отчёт двадцать минут. Это показывает полный Task 1, проверенный экзаменатором.',
  'You wrote this with the guiding questions available, so it shows guided work rather than what you can do on your own.':
    'Вы писали это с доступными наводящими вопросами, поэтому здесь видна работа с подсказками, а не то, что вы можете сами.',
  'You wrote this without opening the guiding questions.': 'Вы написали это, не открывая наводящие вопросы.',
  'This was practice. The check that follows, on a chart you have not seen, is what shows whether the method travels.':
    'Это была практика. Проверка после неё, на незнакомом вам графике, покажет, работает ли метод и там.',
  'Nothing here is a band, and one overview is never mastery.':
    'Ничего из этого не является баллом, и один overview никогда не означает освоенный навык.',

  /* WorkOnOverview.tsx: the hand-off from a marked report */
  'Work on your overview': 'Поработайте над своим overview',
  'The examiner who marked this report said something about your overview.':
    'Экзаменатор, проверявший этот отчёт, написал кое-что про ваш overview.',
  'An automatic check of your own report found no sentence that opens as a summary. That is a check of the words you typed, not a judgement of your writing.':
    'Автоматическая проверка вашего отчёта не нашла ни одного предложения, которое начинается как обобщение. Это проверка написанных вами слов, а не оценка вашего текста.',
  'An automatic check of your own report found figures inside the sentence that summarises it. That is a check of the words you typed, not a judgement of your writing.':
    'Автоматическая проверка вашего отчёта нашла цифры в обобщающем предложении. Это проверка написанных вами слов, а не оценка вашего текста.',
  'From your Task Achievement comment.': 'Из комментария по критерию Task Achievement.',
  "From the marker's tip on Task Achievement.": 'Из совета проверяющего по критерию Task Achievement.',
  "From the marker's advice on reaching the next band.":
    'Из совета проверяющего о том, как подняться на следующий балл.',
  'From a moment the marker quoted from your report.':
    'Из фрагмента, который проверяющий процитировал из вашего отчёта.',
  "From the marker's list of what to improve.": 'Из списка того, что проверяющий советует улучшить.',
  'Work on this next': 'Заняться этим дальше',
  'Try a short overview task': 'Попробовать короткое задание на overview',
  'Eight minutes on the overview alone. It never changes the band above, which stays what the examiner gave this report.':
    'Восемь минут на один только overview. Балл выше от этого не меняется: он остаётся таким, каким его поставил экзаменатор.',

  /* src/data/focused/writing-task1-overview.ts: titles, the objective and
     the instructions. "Task 1" and "overview" are the exam's own words and
     stay in English, the way every question type name does on this site. */
  'Task 1 overview: guided practice': 'Task 1 overview: практика с подсказками',
  'Task 1 overview: independent check': 'Task 1 overview: самостоятельная проверка',
  'Task 1 overview: a different kind of visual': 'Task 1 overview: изображение другого типа',
  'Task 1 overview: a third unseen visual': 'Task 1 overview: третье незнакомое изображение',
  'Write an overview that states the main trends or the main features of the visual, with no specific figures, clearly separate from the detail.':
    'Напишите overview, в котором названы основные тенденции или основные особенности изображения, без конкретных цифр и отдельно от деталей.',
  'Write the overview for this chart and nothing else. One or two sentences on the main trends, with no figures.':
    'Напишите только overview для этого графика. Одно или два предложения об основных тенденциях, без цифр.',
  'A chart you have not seen. Write only its overview, on your own: no guiding questions, no model, no Mr EZ.':
    'Незнакомый вам график. Напишите только его overview, самостоятельно: без наводящих вопросов, без образца, без Mr EZ.',
  'A process diagram this time, which you have not seen. Write only its overview, on your own.':
    'В этот раз незнакомая вам схема процесса. Напишите только её overview, самостоятельно.',
  'A pair of maps, which you have not seen. Write only the overview, on your own.':
    'Две незнакомые вам карты. Напишите только overview, самостоятельно.',

  /* What to notice in the band 8 model, shown only after an attempt. */
  'It opens with a summarising word, so the reader knows at once that this is the big picture and not another detail.':
    'Он начинается с обобщающего слова, поэтому читатель сразу понимает, что это общая картина, а не очередная деталь.',
  'It names the shape of the whole visual, the direction or the standout group, rather than working through the categories one by one.':
    'В нём названа форма всего изображения, направление или выделяющаяся группа, а не перечислены категории одна за другой.',
  'It carries no figures at all. Every number in the model answer is saved for the two detail paragraphs.':
    'В нём вообще нет цифр. Все числа в образце оставлены для двух абзацев с деталями.',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
