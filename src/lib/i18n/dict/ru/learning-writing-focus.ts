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
  /* WritingFocusedTask.tsx: the page changed hands, so the screen now holds
     the next student's own draft, or nothing (the follow-up to R2E-02).
     Worded like the essay editor's sentence in trainers-writing-speaking. */
  'The account on this page changed. Any answer in progress was kept for the student who was writing it.':
    'На этой странице сменился аккаунт. Начатый ответ сохранён для того студента, который его писал.',
  'Writing Task 1': 'Writing Task 1',
  'Writing Task 2': 'Writing Task 2',
  'Your overview': 'Ваш overview',
  'Two sentences on the main trends, with no figures.':
    'Два предложения об основных тенденциях, без цифр.',
  '{words} words, aiming for {min} to {max}': '{words} слов, нужно от {min} до {max}',
  'Looking at your overview...': 'Смотрим ваш overview...',
  'Check my overview': 'Проверить мой overview',
  'Check my revision': 'Проверить исправленный вариант',

  /* WritingFocusedTask.tsx: the same workspace, for the other five things a
     written task can ask for (written-focused-task.ts's PIECE_WORDING).
     Whole sentences rather than a noun in a slot: "мой" and "моё" depend on
     the gender of the noun, which a variable cannot decide. */
  'Your paragraph': 'Ваш абзац',
  'Looking at your paragraph...': 'Смотрим ваш абзац...',
  'Check my paragraph': 'Проверить мой абзац',
  'Your introduction': 'Ваше вступление',
  'Looking at your introduction...': 'Смотрим ваше вступление...',
  'Check my introduction': 'Проверить моё вступление',
  'Your conclusion': 'Ваше заключение',
  'Looking at your conclusion...': 'Смотрим ваше заключение...',
  'Check my conclusion': 'Проверить моё заключение',
  'Your sentence': 'Ваше предложение',
  'Looking at your sentence...': 'Смотрим ваше предложение...',
  'Check my sentence': 'Проверить моё предложение',
  'Your answer': 'Ваш ответ',
  'Looking at your answer...': 'Смотрим ваш ответ...',
  'Check my answer': 'Проверить мой ответ',
  'Write it here.': 'Напишите здесь.',

  /* WritingFocusedTask.tsx: the guiding questions */
  'Show the questions that build an overview': 'Показать вопросы, которые помогают собрать overview',
  'Show the questions that lead you to it': 'Показать вопросы, которые к этому ведут',
  'Questions to work through': 'Вопросы, которые стоит пройти',
  'These lead you to your own sentence. Opening them is recorded as help, which is honest rather than a penalty.':
    'Они ведут вас к вашему собственному предложению. То, что вы их открыли, записывается как помощь: это честность, а не наказание.',

  /* WritingFocusedTask.tsx: the verdict */
  'Met: this does what an overview has to do.': 'Выполнено: здесь есть то, что должен делать overview.',
  'Partly: some of what an overview has to do is here.':
    'Частично: часть того, что должен делать overview, здесь есть.',
  'Not yet: this does not do what an overview has to do.':
    'Пока нет: здесь нет того, что должен делать overview.',
  'Met: this does what the paragraph has to do.':
    'Выполнено: здесь есть то, что должен делать абзац.',
  'Partly: some of what the paragraph has to do is here.':
    'Частично: часть того, что должен делать абзац, здесь есть.',
  'Not yet: this does not do what the paragraph has to do.':
    'Пока нет: здесь нет того, что должен делать абзац.',
  'Met: this does what the introduction has to do.':
    'Выполнено: здесь есть то, что должно делать вступление.',
  'Partly: some of what the introduction has to do is here.':
    'Частично: часть того, что должно делать вступление, здесь есть.',
  'Not yet: this does not do what the introduction has to do.':
    'Пока нет: здесь нет того, что должно делать вступление.',
  'Met: this does what the conclusion has to do.':
    'Выполнено: здесь есть то, что должно делать заключение.',
  'Partly: some of what the conclusion has to do is here.':
    'Частично: часть того, что должно делать заключение, здесь есть.',
  'Not yet: this does not do what the conclusion has to do.':
    'Пока нет: здесь нет того, что должно делать заключение.',
  'Met: this does what the sentence has to do.':
    'Выполнено: здесь есть то, что должно делать предложение.',
  'Partly: some of what the sentence has to do is here.':
    'Частично: часть того, что должно делать предложение, здесь есть.',
  'Not yet: this does not do what the sentence has to do.':
    'Пока нет: здесь нет того, что должно делать предложение.',
  'Met: this does what the answer has to do.':
    'Выполнено: здесь есть то, что должен делать ответ.',
  'Partly: some of what the answer has to do is here.':
    'Частично: часть того, что должен делать ответ, здесь есть.',
  'Not yet: this does not do what the answer has to do.':
    'Пока нет: здесь нет того, что должен делать ответ.',
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
  /* The same three sentences, for a Task 2 task: a question rather than a
     visual, and a whole essay rather than a report. */
  'On a question you had not seen, with no guiding questions and no help, Mr EZ judged this against the one objective above.':
    'На незнакомом вам вопросе, без наводящих вопросов и без помощи, Mr EZ оценил это по одной цели, указанной выше.',
  'What one short piece cannot show is whether a whole essay holds up under forty minutes. A full Task 2 marked by the examiner is what shows that.':
    'Один короткий фрагмент не показывает, выдержит ли целое эссе сорок минут. Это показывает полный Task 2, проверенный экзаменатором.',
  'This was practice. The check that follows, on a question you have not seen, is what shows whether the method travels.':
    'Это была практика. Проверка после неё, на незнакомом вам вопросе, покажет, работает ли метод и там.',
  'You wrote this with the guiding questions available, so it shows guided work rather than what you can do on your own.':
    'Вы писали это с доступными наводящими вопросами, поэтому здесь видна работа с подсказками, а не то, что вы можете сами.',
  'You wrote this without opening the guiding questions.': 'Вы написали это, не открывая наводящие вопросы.',
  'This was practice. The check that follows, on a chart you have not seen, is what shows whether the method travels.':
    'Это была практика. Проверка после неё, на незнакомом вам графике, покажет, работает ли метод и там.',
  'Nothing here is a band, and one overview is never mastery.':
    'Ничего из этого не является баллом, и один overview никогда не означает освоенный навык.',
  'Nothing here is a band, and one short piece of writing is never mastery.':
    'Ничего из этого не является баллом, и один короткий текст никогда не означает освоенный навык.',
  'Read your own sentence against the model below and mark the words that meet the objective.':
    'Прочитайте своё предложение рядом с образцом ниже и отметьте слова, которые соответствуют цели.',

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
  'A process diagram this time, which you have not seen. Write only its overview, on your own. Saying how many stages there are is fine: write the number as a word, such as "six stages".':
    'В этот раз незнакомая вам схема процесса. Напишите только её overview, самостоятельно. Назвать число этапов можно: напишите его словом, например "six stages".',
  'A pair of maps, which you have not seen. Write only the overview, on your own.':
    'Две незнакомые вам карты. Напишите только overview, самостоятельно.',

  /* What to notice in the band 8 model, shown only after an attempt. */
  'It opens with a summarising word, so the reader knows at once that this is the big picture and not another detail.':
    'Он начинается с обобщающего слова, поэтому читатель сразу понимает, что это общая картина, а не очередная деталь.',
  'It names the shape of the whole visual, the direction or the standout group, rather than working through the categories one by one.':
    'В нём названа форма всего изображения, направление или выделяющаяся группа, а не перечислены категории одна за другой.',
  'It carries no figures at all. Every number in the model answer is saved for the two detail paragraphs.':
    'В нём вообще нет цифр. Все числа в образце оставлены для двух абзацев с деталями.',
  'It carries no data figures. The one number in it, "nine-stage", gives the shape of the process, which a process overview may state; everything else is saved for the two detail paragraphs.':
    'В нём нет цифр из данных. Единственное число в нём, "nine-stage", описывает форму процесса, а её overview процесса называть может; всё остальное оставлено для двух абзацев с деталями.',

  /* 3 October 2026 content review: the other written focused tasks
     (src/data/focused/writing-*.ts). Each task's "What to notice" list now
     describes the band 8 paragraph actually shown beside it, so these are
     the new sentences; quoted English from the model stays English. */
  'It mixes structures inside one paragraph: a subordinate clause ("while its symptoms are being soothed"), a relative clause ("a patient who feels slightly better each week") and a conditional ("if the underlying cause is stomach cancer").':
    'В одном абзаце смешаны разные конструкции: придаточное ("while its symptoms are being soothed"), относительное придаточное ("a patient who feels slightly better each week") и условное предложение ("if the underlying cause is stomach cancer").',
  'A passive appears where the doer genuinely does not matter ("Alternative practitioners are rarely trained", "Conventional medicine is valued"), not forced in everywhere.':
    'Пассив появляется там, где исполнитель действительно не важен ("Alternative practitioners are rarely trained", "Conventional medicine is valued"), а не вставлен повсюду.',
  'It opens with a reason clause ("because most of what it conveys does not sit in the words") and later adds detail with relative clauses ("which fills stadiums in Latin America", "crowds who learn the lyrics phonetically").':
    'Абзац начинается с придаточного причины ("because most of what it conveys does not sit in the words"), а дальше подробности добавляются относительными придаточными ("which fills stadiums in Latin America", "crowds who learn the lyrics phonetically").',
  'A passive appears where it keeps the right subject in focus ("a listener can be moved by a song"), not forced in everywhere.':
    'Пассив появляется там, где он держит в центре нужное подлежащее ("a listener can be moved by a song"), а не вставлен повсюду.',
  'It then gives a specific example, a passenger who takes the train from London to Paris rather than flying, naming a real situation rather than another general statement. In your own paragraph, signal the example with "for example" or "for instance".':
    'Затем идёт конкретный пример, пассажир, который едет из Лондона в Париж поездом, а не летит самолётом: это реальная ситуация, а не ещё одно общее утверждение. В своём абзаце обозначьте пример словами "for example" или "for instance".',
  'It then gives a specific example, a retired surgeon who spends two days a week supervising trainees, naming a real situation rather than another general statement. In your own paragraph, signal the example with "for example" or "for instance".':
    'Затем идёт конкретный пример, хирург на пенсии, который два дня в неделю руководит практикантами: это реальная ситуация, а не ещё одно общее утверждение. В своём абзаце обозначьте пример словами "for example" или "for instance".',
  'It names the precise things at issue (collisions, mechanical faults, radar and cameras) rather than saying "technology" over and over.':
    'В нём названо именно то, о чём идёт речь (collisions, mechanical faults, radar and cameras), а не повторяется снова и снова "technology".',
  'It names the precise things at issue (investigative journalism, academic publishing, a paywall, a monthly subscription, an ebook) rather than saying "the internet" or "things online" over and over.':
    'В нём названо именно то, о чём идёт речь (investigative journalism, academic publishing, a paywall, a monthly subscription, an ebook), а не повторяется снова и снова "the internet" или "things online".',
  'A question you have not seen, on a different subject. Write one paragraph using precise topic vocabulary, on your own.':
    'Незнакомый вам вопрос на другую тему. Напишите один абзац с точной тематической лексикой, самостоятельно.',
  'It never uses the same trend word twice: openings "plummeted" and then were "recovering", while closures were "easing", "peaking" and "falling back".':
    'Одно и то же слово тенденции не повторяется дважды: открытия "plummeted", а затем были "recovering", а закрытия "easing", "peaking" и "falling back".',
  'Where a figure needs no movement word, it uses a different kind of phrase instead ("at their peak of 8,500", "only 300 apart") rather than repeating a verb.':
    'Там, где цифре не нужно слово движения, используется фраза другого рода ("at their peak of 8,500", "only 300 apart"), а не повтор глагола.',
  'It describes each category with a different expression: food "took only 17%", clothing and footwear "also halved", fuel and power "fell less", and household goods "remain unchanged".':
    'Каждая категория описана своим выражением: food "took only 17%", clothing and footwear "also halved", fuel and power "fell less", а household goods "remain unchanged".',
  'When a second category halved as well, it writes "as did personal goods" instead of repeating "halved".':
    'Когда вдвое сократилась и вторая категория, написано "as did personal goods", а не повторено "halved".',
  'It does not give each category a sentence of its own. It leads with the standout figure, the private studios, and ranks the rest against it.':
    'Каждой категории не отводится отдельное предложение. Сначала идёт самая заметная цифра, private studios, а остальные выстроены по отношению к ней.',
  'It joins contrasting ideas inside one sentence with a subordinating word ("whereas a colleague who moves to a smaller firm... may be uncomfortable for a year"), rather than leaving them as separate simple sentences.':
    'Противоположные мысли соединены в одном предложении подчинительным словом ("whereas a colleague who moves to a smaller firm... may be uncomfortable for a year"), а не оставлены отдельными простыми предложениями.',
  'The joining word matches the logic: "whereas" sets one person against another, and "where she knows nobody" adds detail about the place.':
    'Связующее слово соответствует логике: "whereas" противопоставляет одного человека другому, а "where she knows nobody" добавляет подробность о месте.',
  'Nothing is lost in the combining: both ideas stay in the sentence. Do the same with your own pair, because combining is not the same as cutting one idea to fit the other in.':
    'При соединении ничего не теряется: обе мысли остаются в предложении. Сделайте так же со своей парой предложений, потому что соединить не значит урезать одну мысль, чтобы втиснуть другую.',
  'It builds its sentences around subordinate clauses ("how a child reads failure", "who believes ability is fixed") rather than a run of simple sentences.':
    'Предложения построены вокруг придаточных ("how a child reads failure", "who believes ability is fixed"), а не идут цепочкой простых предложений.',
  'Each clause does a job the logic needs: "who believes ability is fixed" says which pupil is meant, and "that they are not built for the subject" says what the poor result is taken to prove.':
    'Каждое придаточное выполняет нужную логике работу: "who believes ability is fixed" уточняет, о каком ученике речь, а "that they are not built for the subject" говорит, что якобы доказывает плохой результат.',
  'Three agreement slips. "The number of students" is singular, so its verb should be "has risen", not "have risen", while the relative clause inside it needs "choose" to agree with the plural "students", not "chooses". "A number of universities" means "several universities" and is plural, so its verb should be "have struggled", not "has struggled". Decide what the real subject of each verb is before choosing singular or plural.':
    'Три ошибки согласования. "The number of students" стоит в единственном числе, поэтому глагол должен быть "has risen", а не "have risen", а относительному придаточному внутри нужно "choose", в согласии с "students" во множественном числе, а не "chooses". "A number of universities" означает "several universities" и стоит во множественном числе, поэтому глагол должен быть "have struggled", а не "has struggled". Прежде чем выбрать единственное или множественное число, определите настоящее подлежащее каждого глагола.',
  /* Two sentences students already saw in English only: the shown wording
     never matched a dictionary key. */
  'Where it does link two ideas explicitly, it uses a word that says something real about the relationship (however, as a result), not a word that only announces a list.':
    'Там, где связь между идеями всё же явная, использовано слово, которое реально говорит об их отношении (however, as a result), а не слово, которое просто объявляет список.',
  'Two do/make slips, both common. "A mistake" needs MAKE: "make a mistake", not "do a mistake". "Homework" needs DO: "do their homework", not "make their homework". Decide which fixed verb belongs to each noun before choosing do or make.':
    'Две частые ошибки с do/make. "A mistake" требует MAKE: "make a mistake", а не "do a mistake". "Homework" требует DO: "do their homework", а не "make their homework". Прежде чем выбрать do или make, решите, какой устойчивый глагол принадлежит каждому существительному.',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
