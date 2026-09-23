/* Russian: WP20's Writing and Speaking objectives (personal learning
   build, 2026-09-22). Batch owner: WP20, extended by WP20b (2026-09-22,
   the coverage round: docs/personal-learning/TEACHER-REVIEW-writing-
   speaking.md, "Added in the coverage round"). The WP20b additions sit in
   their own section near the end of `strings`, clearly marked, so the two
   batches stay easy to tell apart.

   Covers: the eleven new src/data/focused/writing-*.ts objective files, the
   three new src/data/focused/speaking-*.ts objective files, the
   generalisation of written-focused-task.ts (new automatic checks, the
   generalised gap-finding headlines and bodies) and WorkOnOverview.tsx, and
   the new SpokenFocusedTask.tsx / SpeakingObjectiveHandoff.tsx screens.

   Strings other batches already carry are deliberately NOT repeated here:
   "Guided practice", "Independent check", "Real exam material.", "Added.
   This is your next step now.", "This is already your next step.", "Work
   on this next", "{n} min" and the writing check labels/results from Pilot
   B (summarising-signal, two-main-features, no-figures, length-in-range)
   all come from learning-writing-focus and learning-focus.

   EXAM MATERIAL STAYS ENGLISH. Every prompt, chart, model paragraph,
   guiding question, sentence-correction example and Speaking question stays
   English: a student has to recognise those exact words on the real paper.
   What is translated here is the teaching prose around them: objectives,
   instructions, what to notice, checklists, and the automatic checks' own
   words about what the student typed.

   NEVER A БАЛЛ. See docs/I18N-GUIDE.md. */

export const strings: Record<string, string> = {
  /* ── written-focused-task.ts: the new automatic check labels ──────────── */
  'Does it give at least one figure?': 'Есть ли хотя бы одна цифра?',
  'Does it compare rather than list?': 'Здесь сравнение, а не перечисление?',
  'Does it use a trend verb?': 'Использован ли глагол тенденции?',
  'Does it mark the sequence?': 'Обозначена ли последовательность?',
  'Does it use location or change language?': 'Использована ли лексика места или изменения?',
  'Does it state a position?': 'Заявлена ли позиция?',
  'Does it give a signalled example?': 'Есть ли пример с сигнальным словом?',
  'Is there a topic sentence, development and a link?': 'Есть ли тематическое предложение, развитие мысли и связка?',
  'Does it avoid opening with a mechanical linker?': 'Избегает ли начало механического слова-связки?',
  'Does it signal that this is the conclusion?': 'Обозначено ли, что это заключение?',
  'Did you actually change the sentence?': 'Вы действительно изменили предложение?',

  /* ── written-focused-task.ts: the new automatic check results ──────────── */
  'It gives {count} figure or figures, starting with "{first}".':
    'Здесь {count} цифра или цифры, начиная с "{first}".',
  'No figures at all. A detail paragraph is where the numbers belong.':
    'Цифр совсем нет. Именно в детальном абзаце должны быть числа.',
  'It uses a comparing word, so the relationship between the two is stated rather than left for the reader to find.':
    'Использовано сравнительное слово, поэтому связь между двумя вещами названа, а не оставлена читателю самому искать.',
  'No comparing word (than, compared with, whereas). Check whether this reads as two things listed rather than compared.':
    'Нет сравнительного слова (than, compared with, whereas). Проверьте, не читается ли это как перечисление двух вещей, а не сравнение.',
  'It uses a trend verb, so the direction of the movement is stated.':
    'Использован глагол тенденции, поэтому направление движения названо.',
  'No trend verb found (rose, fell, grew, fluctuated...). A figure with no verb does not say what happened.':
    'Глагол тенденции не найден (rose, fell, grew, fluctuated...). Цифра без глагола не говорит о том, что произошло.',
  'It marks the stages with a sequencing word, so the order is stated.':
    'Этапы обозначены словом последовательности, поэтому порядок назван.',
  'No sequencing word found (first, then, after that, finally). The order is left to the reader to work out.':
    'Слово последовательности не найдено (first, then, after that, finally). Порядок оставлен читателю самому додумать.',
  'It uses location or change language, so the change and where it happened are both stated.':
    'Использована лексика места или изменения, поэтому названы и сама перемена, и место, где она произошла.',
  'No location or change language found (was replaced by, to the north, was built). Check the change is actually named.':
    'Лексика места или изменения не найдена (was replaced by, to the north, was built). Проверьте, действительно ли перемена названа.',
  'It states a position in the first person, so a reader knows where you stand.':
    'Позиция заявлена от первого лица, поэтому читателю понятно, на чьей вы стороне.',
  'No first-person position statement found (I believe, in my opinion). A paraphrase of the question is not the same as a position on it.':
    'Заявление позиции от первого лица не найдено (I believe, in my opinion). Перефразированный вопрос это не то же самое, что позиция по нему.',
  'It signals a specific example, so the claim is not left to stand on its own.':
    'Есть сигнал конкретного примера, поэтому утверждение не остаётся без поддержки.',
  'No example signal found (for example, for instance, such as). Check the claim is actually followed by one.':
    'Сигнал примера не найден (for example, for instance, such as). Проверьте, действительно ли за утверждением следует пример.',
  'It runs to {count} sentences, enough room for a topic sentence, its development and a link.':
    'Здесь {count} предложений, этого достаточно для тематического предложения, развития мысли и связки.',
  'Only {count} sentence or sentences. A topic sentence, its development and a link back to the question need at least three.':
    'Всего {count} предложение или предложения. Для тематического предложения, развития мысли и связки с вопросом нужно минимум три.',
  'It does not open with a mechanical linker, so whatever connects it has to be the sense, not the word.':
    'Абзац не начинается с механического слова-связки, поэтому связь должна идти от смысла, а не от слова.',
  'It opens with a mechanical linker (Firstly, Moreover, In addition). That connects two SENTENCES, not necessarily two IDEAS.':
    'Абзац начинается с механического слова-связки (Firstly, Moreover, In addition). Оно связывает два ПРЕДЛОЖЕНИЯ, но не обязательно две МЫСЛИ.',
  'It signals that this is the conclusion, so a reader knows the essay is closing.':
    'Есть сигнал того, что это заключение, поэтому читателю понятно, что эссе завершается.',
  'No conclusion signal found (in conclusion, overall, to conclude). Check it reads as a close rather than another point.':
    'Сигнал заключения не найден (in conclusion, overall, to conclude). Проверьте, читается ли это как завершение, а не ещё один аргумент.',
  'This is different from the sentence you were shown, which is what a correction has to be.':
    'Это предложение отличается от того, что вам показали, а именно так и должно выглядеть исправление.',
  'This looks the same as the sentence you were shown. A correction has to actually change something.':
    'Это выглядит так же, как показанное вам предложение. Исправление должно что-то реально менять.',

  /* ── written-focused-task.ts: the generalised hand-off ─────────────────── */
  'The examiner who marked this report said something relevant here.':
    'Экзаменатор, который проверял эту работу, сказал что-то важное именно об этом.',
  'An automatic check of your own report found something worth a closer look here. That is a check of the words you typed, not a judgement of your writing.':
    'Автоматическая проверка вашей работы нашла здесь то, на что стоит обратить внимание. Это проверка написанных вами слов, а не оценка вашего письма.',
  "From the marker's comment.": 'Из комментария проверяющего.',
  "From the marker's tip.": 'Из совета проверяющего.',
  'Work on selecting key features': 'Поработайте над выбором ключевых деталей',
  'Work on comparing rather than listing': 'Поработайте над сравнением вместо перечисления',
  'Work on describing the trend accurately': 'Поработайте над точным описанием тенденции',
  'Work on the order of the process': 'Поработайте над порядком процесса',
  'Work on describing the change': 'Поработайте над описанием изменения',
  'Work on your introduction': 'Поработайте над вступлением',
  'Work on supporting your claims': 'Поработайте над поддержкой своих утверждений',
  'Work on organising a body paragraph': 'Поработайте над структурой основного абзаца',
  'Work on cohesion': 'Поработайте над связностью текста',
  'Work on your conclusion': 'Поработайте над заключением',
  'Work on this grammar pattern': 'Поработайте над этой грамматической моделью',

  /* ── WritingFocusedTask.tsx: sentence correction ────────────────────────── */
  'Correct this sentence': 'Исправьте это предложение',
  'Show what was wrong with it': 'Показать, что было не так',
  'What was wrong with it': 'Что было не так',
  'The pattern': 'Модель',
  'Try it on a sentence of your own': 'Попробуйте на своём собственном предложении',

  /* ── WorkOnOverview.tsx: generalised wording ────────────────────────────── */
  'Try a short focused task': 'Попробуйте короткое focused-задание',
  'A few minutes on this one thing. It never changes the band above, which stays what the examiner gave this report.':
    'Всего несколько минут на одну эту вещь. Балл выше не изменится, он остаётся таким, каким его дал экзаменатор для этой работы.',

  /* ── src/data/focused/writing-task1-select-key-features.ts ──────────────── */
  'Report the two or three most significant features of the visual, grouping related figures together, rather than describing every number in turn.':
    'Опишите две-три самые значимые детали на визуале, сгруппировав связанные цифры вместе, вместо того чтобы перечислять каждое число по очереди.',
  'Task 1 key features: guided practice': 'Task 1, ключевые детали: практика с подсказками',
  'Look at the table and write one paragraph naming the two or three features that are actually worth reporting, grouping the related ones together. Leave the rest out.':
    'Посмотрите на таблицу и напишите один абзац, назвав две-три детали, которые действительно стоит упомянуть, сгруппировав похожие вместе. Остальное не включайте.',
  'Task 1 key features: independent check': 'Task 1, ключевые детали: самостоятельная проверка',
  'A chart you have not seen. Write one paragraph naming the two or three features worth reporting, on your own: no guiding questions, no model, no Mr EZ.':
    'Диаграмма, которую вы ещё не видели. Напишите один абзац, назвав две-три детали, достойные упоминания, самостоятельно: без наводящих вопросов, без образца, без Mr EZ.',
  'It does not work through the table row by row. It picks out the two or three rows that stand out and reports those.':
    'Здесь не идёт разбор таблицы строка за строкой. Выбраны две-три выделяющиеся строки, и речь идёт именно о них.',
  'Figures that belong together sit in the same sentence, rather than one sentence per number.':
    'Связанные между собой цифры находятся в одном предложении, а не по одному предложению на каждое число.',
  'Every figure it gives is one of the ones it chose to report, never a passing mention of something it is not really about.':
    'Каждая приведённая цифра из числа тех, что решили упомянуть, а не случайное упоминание чего-то постороннего.',

  /* ── src/data/focused/writing-task1-compare-and-group.ts ────────────────── */
  'Compare the categories directly, using comparative language (than, compared with, whereas, respectively), rather than describing each one in a separate sentence with no link between them.':
    'Сравнивайте категории напрямую, используя сравнительную лексику (than, compared with, whereas, respectively), а не описывайте каждую в отдельном предложении без связи между ними.',
  'Task 1 comparing, not listing: guided practice': 'Task 1, сравнение, а не перечисление: практика с подсказками',
  'Write one paragraph directly comparing the two visuals, using a comparing word in at least one sentence. Do not describe them one after the other with no link.':
    'Напишите один абзац, напрямую сравнивая два визуала, используя сравнительное слово хотя бы в одном предложении. Не описывайте их поочерёдно без связи.',
  'Task 1 comparing, not listing: independent check': 'Task 1, сравнение, а не перечисление: самостоятельная проверка',
  'A chart you have not seen, with several categories. Write one paragraph comparing two or more of them directly, on your own.':
    'Диаграмма с несколькими категориями, которую вы ещё не видели. Напишите один абзац, напрямую сравнив две или больше из них, самостоятельно.',
  'It puts the two things being compared in the same sentence rather than in two sentences that sit next to each other.':
    'Обе сравниваемые вещи находятся в одном предложении, а не в двух соседних предложениях.',
  'It uses a comparing word, such as "than", "compared with" or "whereas", to carry the relationship rather than leaving the reader to work it out.':
    'Использовано сравнительное слово, например "than", "compared with" или "whereas", чтобы передать связь, а не оставлять читателю самому её искать.',
  'It still gives real figures, but the figures serve the comparison instead of replacing it.':
    'Реальные цифры по-прежнему приведены, но они работают на сравнение, а не заменяют его.',

  /* ── src/data/focused/writing-task1-data-language.ts ─────────────────────── */
  'Describe the trend with an accurate trend verb (rose, fell, grew, fluctuated, peaked, remained stable) and the exact figure that goes with it, never a figure with no verb to carry it.':
    'Опишите тенденцию точным глаголом (rose, fell, grew, fluctuated, peaked, remained stable) и точной цифрой к нему, никогда не оставляя цифру без глагола.',
  'Task 1 trend language: guided practice': 'Task 1, лексика тенденций: практика с подсказками',
  'Write one paragraph describing what one line or bar did, using an accurate trend verb for every figure you give.':
    'Напишите один абзац о том, что происходило с одной линией или столбцом, используя точный глагол тенденции для каждой приведённой цифры.',
  'Task 1 trend language: independent check': 'Task 1, лексика тенденций: самостоятельная проверка',
  'A chart you have not seen. Describe one trend in it accurately, on your own.':
    'Диаграмма, которую вы ещё не видели. Точно опишите одну тенденцию на ней, самостоятельно.',
  'Every figure sits beside a trend verb: it never appears on its own with no word for what it did.':
    'Каждая цифра стоит рядом с глаголом тенденции: она никогда не появляется одна, без слова о том, что с ней происходило.',
  'The verb matches the direction on the chart, not a vague word like "changed" that could mean either.':
    'Глагол соответствует направлению на диаграмме, а не расплывчатому слову вроде "changed", которое может значить и то, и другое.',
  'Where the movement is not a straight line, it says so with a word like "fluctuated" rather than picking one point and ignoring the rest.':
    'Там, где движение не идёт по прямой, это показано словом вроде "fluctuated", а не выбором одной точки с игнорированием остального.',

  /* ── src/data/focused/writing-task1-process-sequence.ts ──────────────────── */
  'Describe the stages of the process in the order they happen, marking the sequence with words such as first, then, after that or finally, rather than leaving the order to the diagram alone.':
    'Опишите этапы процесса в том порядке, в котором они происходят, обозначая последовательность словами first, then, after that или finally, а не оставляя порядок только диаграмме.',
  'Task 1 process sequencing: guided practice': 'Task 1, последовательность процесса: практика с подсказками',
  'Write one paragraph describing the first three stages of this process, in order, with a sequencing word for each one.':
    'Напишите один абзац, описав первые три этапа этого процесса по порядку, со словом последовательности для каждого.',
  'Task 1 process sequencing: independent check': 'Task 1, последовательность процесса: самостоятельная проверка',
  'A process diagram you have not seen. Describe its first three stages in order, on your own.':
    'Диаграмма процесса, которую вы ещё не видели. Опишите первые три этапа по порядку, самостоятельно.',
  'Each new stage opens with a word that marks its place in the sequence, so the order is stated rather than assumed.':
    'Каждый новый этап начинается со слова, обозначающего его место в последовательности, поэтому порядок назван, а не подразумевается.',
  'It does not restart the sentence pattern every time. The sequencing words vary (first, once this is done, at the next stage, finally), which is what stops a process paragraph reading like a list.':
    'Структура предложения не повторяется каждый раз одинаково. Слова последовательности меняются (first, once this is done, at the next stage, finally), и именно это не даёт абзацу о процессе звучать как список.',
  'It stays inside the stages that are actually on the diagram: nothing is invented to fill a gap.':
    'Текст не выходит за рамки этапов, которые реально есть на диаграмме: ничего не придумано, чтобы заполнить пробел.',

  /* ── src/data/focused/writing-task1-map-change.ts ────────────────────────── */
  'Describe one change between the two maps using location and change language (was replaced by, was built, was demolished, changed into, to the north), never trend language borrowed from a chart.':
    'Опишите одно изменение между двумя картами, используя лексику места и изменения (was replaced by, was built, was demolished, changed into, to the north), а не лексику тенденций, позаимствованную из диаграммы.',
  'Task 1 map change language: guided practice': 'Task 1, лексика изменений на карте: практика с подсказками',
  'Write one paragraph describing one clear change between the two maps, with its location.':
    'Напишите один абзац, описав одно явное изменение между двумя картами вместе с его расположением.',
  'Task 1 map change language: independent check': 'Task 1, лексика изменений на карте: самостоятельная проверка',
  'A pair of maps you have not seen. Describe one change between them, with its location, on your own.':
    'Пара карт, которую вы ещё не видели. Опишите одно изменение между ними вместе с расположением, самостоятельно.',
  'It names what was there before and what is there now, in the same sentence, rather than describing only the final map.':
    'В одном предложении названо и то, что было раньше, и то, что есть теперь, а не только описание конечной карты.',
  'It uses the passive for what happened to the place itself (was replaced, was built, was demolished), which is the natural voice here because nobody in the picture did the building.':
    'Для того, что произошло с самим местом, использован пассивный залог (was replaced, was built, was demolished): это естественная форма, потому что на картинке никто конкретно не строил.',
  'It gives a location, using a compass direction or a position relative to something fixed on the map, so the change can be placed rather than only named.':
    'Указано расположение, через сторону света или позицию относительно чего-то неизменного на карте, поэтому изменение можно не только назвать, но и разместить.',

  /* ── src/data/focused/writing-task2-position-and-thesis.ts ──────────────── */
  'State a clear position on the question and, in one sentence, say what each body paragraph will argue, both inside the introduction.':
    'Заявите чёткую позицию по вопросу и в одном предложении скажите, о чём будет каждый основной абзац, всё это во вступлении.',
  'Task 2 introduction: guided practice': 'Task 2, вступление: практика с подсказками',
  'Write only the introduction: a paraphrase of the question, your position, and one sentence on what each body paragraph will argue.':
    'Напишите только вступление: перефразированный вопрос, вашу позицию и одно предложение о том, что будет в каждом основном абзаце.',
  'Task 2 introduction: independent check': 'Task 2, вступление: самостоятельная проверка',
  'A question you have not seen. Write only the introduction, on your own.':
    'Вопрос, который вы ещё не видели. Напишите только вступление, самостоятельно.',
  'It states a position in the first person, in one sentence a reader could not mistake for a summary of the question.':
    'Позиция заявлена от первого лица, в предложении, которое читатель не спутает с пересказом вопроса.',
  'It names what each body paragraph is going to argue, before either paragraph has been written.':
    'Названо, о чём будет каждый основной абзац, ещё до того, как они написаны.',
  'It does not restate the whole question. It paraphrases it in one clause and moves straight to the position.':
    'Вопрос не пересказывается целиком. Он перефразирован в одной части предложения, а дальше сразу идёт позиция.',

  /* ── src/data/focused/writing-task2-support-a-claim.ts ───────────────────── */
  'Make one claim, explain why it is true, and give one specific example, so the claim is not left to stand on its own.':
    'Сделайте одно утверждение, объясните, почему оно верно, и приведите один конкретный пример, чтобы утверждение не осталось без поддержки.',
  'Task 2 claim support: guided practice': 'Task 2, поддержка утверждения: практика с подсказками',
  'Write one paragraph: one claim about an advantage or a disadvantage, why it is true, and a specific example.':
    'Напишите один абзац: одно утверждение о преимуществе или недостатке, почему оно верно, и конкретный пример.',
  'Task 2 claim support: independent check': 'Task 2, поддержка утверждения: самостоятельная проверка',
  'A question you have not seen. Write one paragraph: a claim, an explanation and an example, on your own.':
    'Вопрос, который вы ещё не видели. Напишите один абзац: утверждение, объяснение и пример, самостоятельно.',
  'The first sentence makes ONE claim, not two or three run together.':
    'Первое предложение делает ОДНО утверждение, а не два-три вперемешку.',
  'The next sentence explains why that claim is true, in the writer\'s own reasoning rather than repeating the claim in different words.':
    'Следующее предложение объясняет, почему это утверждение верно, собственной логикой автора, а не повтором утверждения другими словами.',
  'It closes with a specific example, signalled by a phrase such as "for example" or "for instance", naming a real situation rather than another general statement.':
    'Абзац завершается конкретным примером с сигнальной фразой вроде "for example" или "for instance", называющим реальную ситуацию, а не ещё одно общее утверждение.',

  /* ── src/data/focused/writing-task2-paragraph-organisation.ts ───────────── */
  'Open the paragraph with a topic sentence that states its one idea, develop that idea, and close with a sentence that links back to the question.':
    'Начните абзац с тематического предложения, называющего его единственную идею, разверните эту идею и завершите предложением, которое связывает абзац с вопросом.',
  'Task 2 body paragraph: guided practice': 'Task 2, основной абзац: практика с подсказками',
  'Write one body paragraph giving ONE of the two views: a topic sentence, its development, and a link back to the question.':
    'Напишите один основной абзац с ОДНОЙ из двух точек зрения: тематическое предложение, его развитие и связку с вопросом.',
  'Task 2 body paragraph: independent check': 'Task 2, основной абзац: самостоятельная проверка',
  'A question you have not seen. Write one body paragraph for one of the two views, on your own.':
    'Вопрос, который вы ещё не видели. Напишите один основной абзац для одной из двух точек зрения, самостоятельно.',
  'The first sentence announces the one idea the paragraph is going to develop. A reader could stop there and still know what the paragraph is about.':
    'Первое предложение заявляет единственную идею, которую абзац будет развивать. Читатель, остановившись там, уже понимает, о чём абзац.',
  'Every sentence after it develops that same idea. None of them introduces a second, unrelated point.':
    'Каждое последующее предложение развивает ту же идею. Ни одно не вводит второй, несвязанный аргумент.',
  'The final sentence links back to the question, rather than simply stopping when the idea runs out.':
    'Последнее предложение связывает абзац с вопросом, а не просто обрывается, когда идея заканчивается.',

  /* ── src/data/focused/writing-task2-cohesion-and-linking.ts ─────────────── */
  'Connect two sentences so the second genuinely follows from the first, without opening it with a mechanical linker such as Firstly, Moreover or In addition.':
    'Свяжите два предложения так, чтобы второе действительно вытекало из первого, не начиная его механическим словом-связкой вроде Firstly, Moreover или In addition.',
  'Task 2 cohesion: guided practice': 'Task 2, связность текста: практика с подсказками',
  'Write two connected sentences that answer one half of this two-part question. Do not start the second sentence with a connector word.':
    'Напишите два связанных предложения, отвечающих на одну половину этого двухчастного вопроса. Не начинайте второе предложение словом-связкой.',
  'Task 2 cohesion: independent check': 'Task 2, связность текста: самостоятельная проверка',
  'A question you have not seen. Write two connected sentences for one half of it, on your own.':
    'Вопрос, который вы ещё не видели. Напишите два связанных предложения для одной его половины, самостоятельно.',
  'The second sentence does not open with a connector word. It connects to the first through what it actually says: a pronoun, a repeated idea, a natural "this".':
    'Второе предложение не начинается словом-связкой. Оно связано с первым по смыслу: через местоимение, повторённую идею, естественное "this".',
  'A reader could remove any connector words in this paragraph and the order would still make sense, because the sense was never carried by the connector.':
    'Если убрать из абзаца все слова-связки, порядок всё равно будет понятен, потому что смысл никогда не держался на связке.',
  'Where it does link two ideas explicitly, it uses a word that says something real about the relationship (however, as a result), not a word that only announces a list (firstly, moreover).':
    'Там, где связь между идеями всё же явная, использовано слово, которое реально говорит об их отношении (however, as a result), а не слово, которое просто объявляет список (firstly, moreover).',

  /* ── src/data/focused/writing-task2-conclusion.ts ────────────────────────── */
  'Write a conclusion that restates your position and directly answers the question, in one or two sentences, with no new idea introduced this late.':
    'Напишите заключение, которое повторяет вашу позицию и напрямую отвечает на вопрос, в одном-двух предложениях, без новой идеи на этом позднем этапе.',
  'Task 2 conclusion: guided practice': 'Task 2, заключение: практика с подсказками',
  'Write only the conclusion for this question: one or two sentences restating your position and answering it directly.':
    'Напишите только заключение к этому вопросу: одно-два предложения, повторяющих позицию и напрямую отвечающих на вопрос.',
  'Task 2 conclusion: independent check': 'Task 2, заключение: самостоятельная проверка',
  'A question you have not seen. Write only its conclusion, on your own.':
    'Вопрос, который вы ещё не видели. Напишите только заключение к нему, самостоятельно.',
  'It opens with a signal such as "In conclusion" or "Overall", so a reader knows the essay is closing rather than adding another body paragraph.':
    'Начинается сигналом вроде "In conclusion" или "Overall", поэтому читателю понятно, что эссе завершается, а не добавляется ещё один абзац.',
  'It restates the position from the introduction in different words, rather than copying the same sentence.':
    'Повторяет позицию из вступления другими словами, а не копирует то же предложение.',
  'It answers the actual question asked, in a way that could be checked against it, and introduces nothing new.':
    'Отвечает именно на заданный вопрос, причём так, что ответ можно проверить по нему, и не вводит ничего нового.',

  /* ── src/data/focused/writing-sentence-correction.ts ─────────────────────── */
  'Correct a sentence with a recurring subject-verb agreement slip, then write your own sentence using the same pattern correctly.':
    'Исправьте предложение с повторяющейся ошибкой согласования подлежащего и сказуемого, затем напишите своё предложение с той же моделью, но правильно.',
  'Sentence correction: "the number of" and "a number of"': 'Исправление предложения: "the number of" и "a number of"',
  'Read the sentence below and rewrite it correctly. Write your correction, not a comment on what is wrong with it.':
    'Прочитайте предложение ниже и перепишите его правильно. Напишите именно исправление, а не комментарий о том, что в нём не так.',
  '"The number of" is followed by a plural noun but takes a SINGULAR verb: "the number of visitors HAS grown".':
    '"The number of" сопровождается существительным во множественном числе, но требует ЕДИНСТВЕННОГО числа глагола: "the number of visitors HAS grown".',
  '"A number of" means "several" and takes a PLURAL verb: "a number of visitors HAVE complained".':
    '"A number of" означает "несколько" и требует МНОЖЕСТВЕННОГО числа глагола: "a number of visitors HAVE complained".',
  'The two phrases look almost identical and take opposite verb forms, which is exactly why this slip keeps recurring.':
    'Эти две фразы выглядят почти одинаково, но требуют противоположных форм глагола, именно поэтому эта ошибка так часто повторяется.',
  'Now write one sentence of your own using "a number of" with a correctly plural verb, about any IELTS topic.':
    'Теперь напишите своё предложение с "a number of" и правильным глаголом во множественном числе на любую тему IELTS.',

  /* ── src/data/focused/speaking-part1-extend-an-answer.ts ─────────────────── */
  'Part 1: extend your answer': 'Part 1: разверните свой ответ',
  'Extend a Part 1 answer into two or three sentences using Answer, Reason, Example, instead of stopping after one short answer.':
    'Разверните ответ в Part 1 до двух-трёх предложений по модели Answer, Reason, Example, вместо того чтобы останавливаться после одного короткого ответа.',
  'Answer one question from the Work topic below. Give your straight answer, then a reason, then a real example, before you stop talking.':
    'Ответьте на один вопрос из темы Work ниже. Дайте прямой ответ, затем причину, затем реальный пример, прежде чем закончить говорить.',
  'Did you answer the question directly, in your first sentence?': 'Вы ответили на вопрос напрямую, в первом же предложении?',
  'Did you give a reason for your answer, not only the answer itself?': 'Вы привели причину своего ответа, а не только сам ответ?',
  'Did you give one real example or a specific detail, rather than stopping after the reason?':
    'Вы привели один реальный пример или конкретную деталь, а не остановились после причины?',
  'Did all three parts (answer, reason, example) stay on the SAME idea?':
    'Все три части (ответ, причина, пример) остались об ОДНОЙ и той же мысли?',

  /* ── src/data/focused/speaking-part2-plan-in-one-minute.ts ───────────────── */
  'Part 2: plan it in one minute': 'Part 2: спланируйте за одну минуту',
  'Turn one minute of preparation into a real plan for the two-minute talk, covering every bullet point in a clear order.':
    'Превратите одну минуту подготовки в настоящий план для двухминутного рассказа, охватив все пункты карточки в чёткой последовательности.',
  'Take one minute to plan this cue card, using the notes method the lesson teaches. Then record your two-minute answer.':
    'Возьмите одну минуту на план этой карточки, используя метод заметок из урока. Затем запишите свой двухминутный ответ.',
  'Did you write a few words for every "you should say" point before you started talking, not partway through?':
    'Вы написали несколько слов по каждому пункту "you should say" до того, как начали говорить, а не по ходу дела?',
  'Did you talk about the points in a sensible order, rather than jumping between them?':
    'Вы рассказывали о пунктах в логичном порядке, а не перескакивали между ними?',
  'Did you keep talking for close to the full two minutes, rather than finishing early?':
    'Вы говорили почти все две минуты, а не закончили раньше?',
  'Did you close with a short final thought, rather than simply stopping?':
    'Вы завершили короткой финальной мыслью, а не просто остановились?',

  /* ── src/data/focused/speaking-fluency-repair.ts ──────────────────────────── */
  'Reducing long pauses': 'Сокращение долгих пауз',
  'Catch yourself before a silence runs long, and keep talking with a filler phrase instead of stopping, rather than pausing until the next idea arrives.':
    'Замечайте момент до того, как тишина затянется, и продолжайте говорить с помощью слова-заполнителя вместо остановки, а не ждите паузой следующую мысль.',
  'Answer one question from the Hometown topic below. If you feel yourself about to go silent, use a filler phrase and keep going rather than stopping.':
    'Ответьте на один вопрос из темы Hometown ниже. Если чувствуете, что вот-вот замолчите, используйте слово-заполнитель и продолжайте, а не останавливайтесь.',
  'Listening back, where is the longest silent gap? Estimate how many seconds it lasted.':
    'Слушая запись заново, где самая долгая тихая пауза? Оцените, сколько секунд она длилась.',
  'When you paused, did you use a filler phrase (such as "let me think" or "that is a good question") to keep the flow going?':
    'Когда вы делали паузу, использовали ли вы слово-заполнитель (например "let me think" или "that is a good question"), чтобы не терять поток речи?',
  'Did any pause run long enough that a listener would have started to wonder if you had finished?':
    'Была ли пауза настолько долгой, что слушатель мог бы подумать, что вы закончили?',
  'Compare this recording with your last one on the same kind of question: are the gaps shorter?':
    'Сравните эту запись с предыдущей на такой же вопрос: паузы стали короче?',

  /* ── Finding 4 (Codex's independent review, 2026-09-22): the independent-
     check entry added to each of the three pilot round Speaking objectives
     above. Only the new title and instruction strings are new; the
     objective and checklist text are shared with the guided task and are
     already translated above. ─────────────────────────────────────────── */
  'Part 1: extend your answer, a different topic': 'Part 1: разверните свой ответ, другая тема',
  'A different topic, transport. Give your straight answer, then a reason, then a real example, on your own.':
    'Другая тема, транспорт. Дайте прямой ответ, затем причину, затем реальный пример, самостоятельно.',
  'Part 2: plan it in one minute, a different cue card': 'Part 2: спланируйте за одну минуту, другая карточка',
  'A different cue card. Take one minute to plan it, then record your two-minute answer, on your own.':
    'Другая карточка. Возьмите одну минуту на план, затем запишите свой двухминутный ответ самостоятельно.',
  'Reducing long pauses, a different topic': 'Сокращение долгих пауз, другая тема',
  'A different topic, music. If you feel yourself about to go silent, use a filler phrase and keep going, on your own.':
    'Другая тема, музыка. Если чувствуете, что вот-вот замолчите, используйте слово-заполнитель и продолжайте самостоятельно.',

  /* ── SpokenFocusedTask.tsx ──────────────────────────────────────────────── */
  'Speaking, Part {part}': 'Speaking, Part {part}',
  'This is self-check practice: nothing here grades you. Record yourself, listen back, and check your own answer against the list below.':
    'Это практика с самопроверкой: здесь вас никто не оценивает. Запишите себя, прослушайте и сверьте свой ответ со списком ниже.',
  'Microphone practice is turned off for your plan right now, so this task is skipped when it comes up.':
    'Практика с микрофоном сейчас отключена в вашем плане, поэтому это задание пропускается, когда до него доходит очередь.',
  'Turn microphone practice back on': 'Снова включить практику с микрофоном',
  'Try again': 'Попробовать ещё раз',
  'Turn off microphone practice for now': 'Пока отключить практику с микрофоном',
  'Your recording': 'Ваша запись',
  'Recording...': 'Идёт запись...',
  'Stop and listen back': 'Остановить и прослушать',
  'Record again': 'Записать заново',
  'Check yourself': 'Проверьте себя',
  'Listen back, then check yourself:': 'Прослушайте запись, затем проверьте себя:',
  '{checked} of {total} checked': 'Отмечено {checked} из {total}',
  'Done for now': 'Готово на сейчас',
  'Recorded as practice. This is a self-check, never a grade, and it never claims mastery.':
    'Записано как практика. Это самопроверка, а не оценка, и она никогда не утверждает, что вы всё освоили.',
  'Want a real band on this? Send the same kind of answer to the Speaking trainer, which grades from your actual recording and costs a real AI check.':
    'Хотите настоящий балл за это? Отправьте похожий ответ в тренажёр Speaking: он оценивает по вашей реальной записи и стоит реальную AI-проверку.',
  'Open the Speaking trainer': 'Открыть тренажёр Speaking',
  /* spoken-task-owner.ts, shown by SpokenFocusedTask.tsx when the page
     changes hands (23 September 2026). The spoken task's own line: a
     recording in progress is dropped, never kept, so it does not borrow
     the exercises' "answers were kept" line from learning-focus. */
  'The account on this page changed. Any recording on this screen was stopped and not kept.':
    'На этой странице сменился аккаунт. Запись на этом экране, если она была, остановлена и не сохранена.',

  /* Recovery text: mic problems (spoken-focused-task.ts's micProblemText,
     nt() marked, rendered elsewhere via t()) */
  'The microphone permission was not given, so nothing was recorded. Allow it in your browser and try again, or turn off microphone practice below.':
    'Доступ к микрофону не был дан, поэтому ничего не записалось. Разрешите его в браузере и попробуйте снова, либо отключите практику с микрофоном ниже.',
  'No microphone was found on this device. Try again on a device with one, or turn off microphone practice below.':
    'На этом устройстве не найден микрофон. Попробуйте на устройстве с микрофоном, либо отключите практику с микрофоном ниже.',
  'The recording did not save properly. Nothing was lost that you had not already recorded; try recording again.':
    'Запись не сохранилась как следует. Ничего из уже записанного не потеряно; попробуйте записать заново.',
  "This browser cannot record audio. Try a recent version of Chrome, Edge, Firefox or Safari, or turn off microphone practice below.":
    'Этот браузер не умеет записывать звук. Попробуйте свежую версию Chrome, Edge, Firefox или Safari, либо отключите практику с микрофоном ниже.',

  /* ── SpeakingObjectiveHandoff.tsx ────────────────────────────────────────── */
  'The examiner who marked this recording said something relevant here.':
    'Экзаменатор, который оценивал эту запись, сказал что-то важное именно об этом.',
  "From the marker's own comment on this recording.": 'Из собственного комментария проверяющего к этой записи.',
  'Try a short self-check task': 'Попробуйте короткое задание с самопроверкой',
  'A short self-check, never a grade. It never changes the band above, which stays what the examiner gave this recording.':
    'Короткая самопроверка, а не оценка. Балл выше не изменится, он остаётся таким, каким его дал экзаменатор для этой записи.',
  'Work on extending your answers': 'Поработайте над развёрнутостью ответов',
  'Work on planning your two minutes': 'Поработайте над планированием своих двух минут',
  'Work on reducing long pauses': 'Поработайте над сокращением долгих пауз',

  /* ════════════════════════════════════════════════════════════════════
     WP20b (2026-09-22): the coverage round. New Writing objectives for
     Lexical Resource and Grammatical Range, new Speaking objectives for
     Lexical Resource, Grammatical Range and Part 3 reasoning, the
     generalised four-criteria Speaking hand-off, and the pronunciation
     re-check card. See docs/personal-learning/TEACHER-REVIEW-writing-
     speaking.md, "Added in the coverage round".
     ════════════════════════════════════════════════════════════════════ */

  /* ── written-focused-task.ts: the six new automatic check labels ──────── */
  'Does it use precise topic vocabulary?': 'Использована ли точная тематическая лексика?',
  'Is it free of informal words?': 'Нет ли разговорных слов?',
  'Is it paraphrased rather than copied?': 'Это перефразировано, а не скопировано?',
  'Does it avoid repeating the same trend or quantity word?': 'Избегает ли текст повтора одного и того же слова тенденции или количества?',
  'Does it use a subordinate clause?': 'Использовано ли придаточное предложение?',
  'Does it use more than one kind of structure?': 'Использовано ли больше одного типа конструкции?',

  /* ── written-focused-task.ts: the six new automatic check results ─────── */
  'It uses {count} topic word or words for this subject, starting with "{first}".':
    'Использовано {count} тематическое слово или слова по этой теме, начиная с "{first}".',
  'It uses {count} topic word or words for this subject, against the {min} this task asks for.':
    'Использовано {count} тематическое слово или слова по этой теме, при том что задание требует минимум {min}.',
  'No informal words found from the short list this check looks for.':
    'Разговорных слов из короткого списка, который проверяет эта проверка, не найдено.',
  'It uses {count} informal word or words, starting with "{first}". A Task 2 paragraph keeps a more formal register.':
    'Использовано {count} разговорное слово или слова, начиная с "{first}". В абзаце Task 2 стиль должен быть более официальным.',
  'It shares {count} word or words with the question\'s own wording, inside the {max} this check allows.':
    'Совпадает {count} слово или слова с формулировкой самого вопроса, что в пределах {max}, допустимых этой проверкой.',
  'It shares {count} word or words with the question\'s own wording, against the {max} this check allows. Try replacing a few with your own.':
    'Совпадает {count} слово или слова с формулировкой самого вопроса, при допустимых этой проверкой {max}. Попробуйте заменить несколько своими словами.',
  'No trend or quantity word repeats, so there is nothing for this check to flag.':
    'Ни одно слово тенденции или количества не повторяется, поэтому этой проверке не на что указать.',
  '"{word}" appears {count} time or times, inside the {max} this check allows.':
    '"{word}" встречается {count} раз, что в пределах {max}, допустимых этой проверкой.',
  '"{word}" appears {count} time or times, against the {max} this check allows. Try a synonym for one of them.':
    '"{word}" встречается {count} раз, при допустимых этой проверкой {max}. Попробуйте заменить одно из повторений синонимом.',
  'It uses a subordinating word (because, although, since...), so the two ideas are joined into one sentence.':
    'Использовано слово подчинительной связи (because, although, since...), поэтому две мысли объединены в одно предложение.',
  'No subordinating word found (because, although, since, while, when, if). The two ideas are not yet joined into one sentence.':
    'Слово подчинительной связи не найдено (because, although, since, while, when, if). Две мысли пока не объединены в одно предложение.',
  'It uses {count} different kind or kinds of structure (a relative clause, a subordinate clause, a passive, a conditional).':
    'Использовано {count} разный тип или типы конструкций (определительное придаточное, придаточное предложение, пассивный залог, условное предложение).',
  'It uses {count} different kind or kinds of structure, against the {min} this check asks for. This counts variety, not whether each one is correct.':
    'Использовано {count} разный тип или типы конструкций, при том что эта проверка требует минимум {min}. Это подсчёт разнообразия, а не оценка правильности каждой конструкции.',

  /* ── written-focused-task.ts: the seven new hand-off headlines ────────── */
  'Work on precise topic vocabulary': 'Поработайте над точной тематической лексикой',
  'Work on paraphrasing the question': 'Поработайте над перефразированием вопроса',
  'Work on varying your trend and quantity words': 'Поработайте над разнообразием слов тенденции и количества',
  'Work on collocation accuracy': 'Поработайте над точностью коллокаций',
  'Work on combining sentences': 'Поработайте над объединением предложений',
  'Work on a range of structures': 'Поработайте над разнообразием конструкций',

  /* ── src/data/focused/writing-lexical-topic-vocabulary.ts ────────────────── */
  'Write a Task 2 body paragraph using precise topic vocabulary for the subject, rather than generic words that could belong to any essay.':
    'Напишите основной абзац Task 2, используя точную тематическую лексику по теме, а не общие слова, которые подошли бы для любого эссе.',
  'Task 2 topic vocabulary: guided practice': 'Task 2, тематическая лексика: практика с подсказками',
  'Task 2 topic vocabulary: independent check': 'Task 2, тематическая лексика: самостоятельная проверка',
  'Write one body paragraph giving your view on driverless vehicles. Use the specific technology words for this topic rather than generic ones.':
    'Напишите один основной абзац с вашим мнением о беспилотных автомобилях. Используйте конкретную техническую лексику по теме, а не общие слова.',
  'A question you have not seen, on the same subject. Write one paragraph using precise topic vocabulary, on your own.':
    'Вопрос на ту же тему, который вы ещё не видели. Напишите один абзац с точной тематической лексикой, самостоятельно.',
  'What is the specific technology at issue here (automation, artificial intelligence, data collection), rather than "technology" in general?':
    'Какая конкретная технология здесь обсуждается (automation, artificial intelligence, data collection), а не просто "technology" в целом?',
  'Which precise word names your real point: innovation, automation, cybersecurity, data privacy?':
    'Какое точное слово называет вашу мысль: innovation, automation, cybersecurity, data privacy?',
  'Read your paragraph back. Could every sentence only be about driverless vehicles, or could it be pasted into any essay?':
    'Перечитайте свой абзац. Каждое ли предложение может быть только о беспилотных автомобилях, или его можно вставить в любое эссе?',
  'It names the specific technology at issue (automation, artificial intelligence, data privacy) rather than saying "technology" over and over.':
    'Названа конкретная технология (automation, artificial intelligence, data privacy), а не повторяется слово "technology" снова и снова.',
  'It avoids the generic words a weaker answer leans on: "a big change", "good for people", "a lot of things".':
    'Текст избегает общих слов, на которые опирается более слабый ответ: "a big change", "good for people", "a lot of things".',
  'Every precise word is used accurately, in a sentence that could only be about this topic, not glued on to sound advanced.':
    'Каждое точное слово использовано верно, в предложении, которое может быть только об этой теме, а не приклеено для видимости продвинутого уровня.',

  /* ── src/data/focused/writing-task2-paraphrase-the-question.ts ──────────── */
  'Paraphrase the question in your introduction, in your own words, without copying its own wording.':
    'Перефразируйте вопрос во вступлении своими словами, не копируя его формулировку.',
  'Task 2 paraphrase: guided practice': 'Task 2, перефразирование: практика с подсказками',
  'Task 2 paraphrase: independent check': 'Task 2, перефразирование: самостоятельная проверка',
  'Write only one sentence: a paraphrase of the question below, in your own words.':
    'Напишите только одно предложение: перефразированный вопрос ниже, своими словами.',
  'A question you have not seen. Write only a paraphrase of it, on your own.':
    'Вопрос, который вы ещё не видели. Напишите только его перефразированную версию, самостоятельно.',
  "What is the question's own key noun, and what is another way to say it?":
    'Какое ключевое существительное есть в вопросе, и как ещё можно его назвать?',
  "What is the question's own key verb or claim, and how could you express the same idea differently?":
    'Какой ключевой глагол или утверждение есть в вопросе, и как ещё можно выразить ту же мысль?',
  'Read your sentence next to the question. Which words are still identical? Change those too.':
    'Сравните своё предложение с вопросом. Какие слова всё ещё совпадают? Замените и их тоже.',
  "It restates the question's own idea using different words and a different sentence shape, not the question's own phrase with one word swapped.":
    'Мысль вопроса передана другими словами и другой структурой предложения, а не той же фразой с заменой одного слова.',
  'A reader who had never seen the question could still tell what it was asking from this sentence alone.':
    'Читатель, никогда не видевший вопрос, всё равно понял бы по одному этому предложению, о чём он был.',
  'It moves straight from the paraphrase into a position, rather than lingering on the question a second time.':
    'После перефразирования сразу идёт позиция, без повторного топтания на месте вокруг вопроса.',

  /* ── src/data/focused/writing-task1-avoid-repetition.ts ─────────────────── */
  'Report several figures without repeating the same trend or quantity word: vary rose, fell, a large number of and similar with real synonyms.':
    'Опишите несколько цифр, не повторяя одно и то же слово тенденции или количества: используйте настоящие синонимы для rose, fell, a large number of и подобных.',
  'Task 1 repetition: guided practice': 'Task 1, повторы: практика с подсказками',
  'Task 1 repetition: independent check': 'Task 1, повторы: самостоятельная проверка',
  'Write one detail paragraph reporting at least three figures from the chart. Use a different trend or quantity word each time, never the same one twice.':
    'Напишите один детальный абзац, назвав минимум три цифры с диаграммы. Каждый раз используйте другое слово тенденции или количества, никогда не повторяя одно и то же дважды.',
  'A chart you have not seen. Write one paragraph reporting several figures with varied language, on your own.':
    'Диаграмма, которую вы ещё не видели. Напишите один абзац с несколькими цифрами, используя разнообразную лексику, самостоятельно.',
  'Which three or four figures are you reporting in this paragraph?':
    'Какие три-четыре цифры вы приводите в этом абзаце?',
  'For each one, what trend word fits (rose, fell, grew, climbed, dropped, declined)? Cross off any word you have already used.':
    'Для каждой из них, какое слово тенденции подходит (rose, fell, grew, climbed, dropped, declined)? Вычёркивайте уже использованные слова.',
  'For quantities, what else could "a large number of" become the second time (the majority of, most, a significant proportion of)?':
    'Для количеств, чем ещё можно заменить "a large number of" во второй раз (the majority of, most, a significant proportion of)?',
  'When two figures move the same way, it does not use the same trend verb twice: it reaches for a synonym (rose, then climbed, then grew).':
    'Когда две цифры движутся одинаково, текст не использует один и тот же глагол тенденции дважды: он берёт синоним (rose, затем climbed, затем grew).',
  'Quantity phrases vary too: "a large number of" the first time, "the majority of" or "most" the second.':
    'Фразы количества тоже меняются: "a large number of" в первый раз, "the majority of" или "most" во второй.',
  'Variety never comes at the cost of accuracy: every synonym still names the right direction and the right figure.':
    'Разнообразие никогда не идёт в ущерб точности: каждый синоним по-прежнему называет верное направление и верную цифру.',

  /* ── src/data/focused/writing-collocation-accuracy.ts ────────────────────── */
  'Correct a sentence with two do/make collocation slips, then write your own sentence using one of the same collocations correctly.':
    'Исправьте предложение с двумя ошибками в коллокациях do/make, затем напишите своё предложение с одной из тех же коллокаций, но правильно.',
  'Collocation accuracy: do or make': 'Точность коллокаций: do или make',
  '"A mistake" collocates with MAKE, not do: "make a mistake", never "do a mistake". "Homework" collocates with DO, not make: "do your homework", never "make your homework". Decide which fixed verb belongs to each noun before choosing do or make.':
    '"A mistake" сочетается с MAKE, а не do: "make a mistake", никогда не "do a mistake". "Homework" сочетается с DO, а не make: "do your homework", никогда не "make your homework". Прежде чем выбрать do или make, определите, какой фиксированный глагол принадлежит каждому существительному.',
  'Now write one sentence of your own using "make a decision" correctly, about any IELTS topic.':
    'Теперь напишите своё предложение с "make a decision", правильно, на любую тему IELTS.',
  'Find every do/make verb in the sentence and ask which noun it is attached to.':
    'Найдите в предложении каждый глагол do/make и определите, к какому существительному он относится.',
  '"A mistake" always takes MAKE.': '"A mistake" всегда требует MAKE.',
  '"Homework" always takes DO.': '"Homework" всегда требует DO.',
  '"A mistake" collocates with MAKE, not do: "make a mistake", never "do a mistake".':
    '"A mistake" сочетается с MAKE, а не do: "make a mistake", никогда не "do a mistake".',
  '"Homework" collocates with DO, not make: "do your homework", never "make your homework".':
    '"Homework" сочетается с DO, а не make: "do your homework", никогда не "make your homework".',
  'There is no logic to learn here, only a pairing to remember: each noun has its own fixed verb, and swapping it is what a Lexical Resource comment calls an inaccurate collocation.':
    'Здесь нет логики, которую можно вывести, только пару, которую нужно запомнить: у каждого существительного свой фиксированный глагол, и его замена это то, что в комментарии по Lexical Resource называют неточной коллокацией.',

  /* ── src/data/focused/writing-task2-complex-sentences.ts ─────────────────── */
  'Combine two simple sentences into one accurate complex sentence, using a subordinate clause (because, although, since, while, when, if).':
    'Объедините два простых предложения в одно правильное сложноподчинённое предложение, используя придаточное (because, although, since, while, when, if).',
  'Task 2 complex sentences: guided practice': 'Task 2, сложные предложения: практика с подсказками',
  'Task 2 complex sentences: independent check': 'Task 2, сложные предложения: самостоятельная проверка',
  'Combine these two simple sentences into ONE complex sentence, using a subordinate clause: "Taking risks can lead to failure." and "Taking risks can also lead to great success."':
    'Объедините эти два простых предложения в ОДНО сложноподчинённое, используя придаточное: "Taking risks can lead to failure." и "Taking risks can also lead to great success."',
  'Combine these two simple sentences into ONE complex sentence, on your own: "Children are often told they can achieve anything." and "Some of them later struggle with disappointment."':
    'Объедините эти два простых предложения в ОДНО сложноподчинённое, самостоятельно: "Children are often told they can achieve anything." и "Some of them later struggle with disappointment."',
  'What is the logical relationship between the two ideas: a contrast, a reason, a condition, a time sequence?':
    'Какая логическая связь между двумя мыслями: противопоставление, причина, условие, последовательность во времени?',
  'Which subordinating word matches that relationship (although and while signal contrast, because signals reason)?':
    'Какое подчинительное слово соответствует этой связи (although и while сигнализируют противопоставление, because сигнализирует причину)?',
  'Which idea goes in the main clause and which in the subordinate clause? Either order can work, so long as the logic is clear.':
    'Какая мысль идёт в главном предложении, а какая в придаточном? Подойдёт любой порядок, если логика понятна.',
  'It joins the two ideas with one subordinate clause, rather than a comma splice or two sentences left as they were.':
    'Две мысли объединены одним придаточным предложением, а не запятой без союза или двумя предложениями, оставленными как есть.',
  'The subordinating word it chooses (although, because, while...) actually matches the logical relationship between the two ideas, not a random one that happens to fit grammatically.':
    'Выбранное подчинительное слово (although, because, while...) действительно соответствует логической связи между мыслями, а не выбрано случайно просто потому, что грамматически подходит.',
  'Nothing from either original sentence is lost. Combining is not the same as cutting one idea to fit the other in.':
    'Ничего из исходных предложений не потеряно. Объединение это не то же самое, что урезание одной мысли ради другой.',

  /* ── src/data/focused/writing-task2-structure-range.ts ───────────────────── */
  'Write a paragraph that uses more than one kind of sentence structure (a relative clause, a subordinate clause, a passive, a conditional), not the same simple shape repeated.':
    'Напишите абзац, в котором использовано больше одного типа конструкции предложения (определительное придаточное, придаточное предложение, пассивный залог, условное предложение), а не одна и та же простая структура снова и снова.',
  'Task 2 range of structures: guided practice': 'Task 2, разнообразие конструкций: практика с подсказками',
  'Task 2 range of structures: independent check': 'Task 2, разнообразие конструкций: самостоятельная проверка',
  'Write one paragraph giving your view on alternative medicine. Try to use at least two different kinds of structure: a relative clause, a subordinate clause, a passive, or a conditional.':
    'Напишите один абзац с вашим мнением об альтернативной медицине. Постарайтесь использовать минимум два разных типа конструкций: определительное придаточное, придаточное предложение, пассивный залог или условное предложение.',
  'A question you have not seen. Write one paragraph using a range of structures, on your own.':
    'Вопрос, который вы ещё не видели. Напишите один абзац с разнообразными конструкциями, самостоятельно.',
  'Where could a relative clause (which, who, that) add extra detail to a noun without starting a new sentence?':
    'Где определительное придаточное (which, who, that) могло бы добавить деталь к существительному, не начиная новое предложение?',
  'Where could a subordinate clause (because, although, while) link a reason or a contrast to your main point?':
    'Где придаточное предложение (because, although, while) могло бы связать причину или противопоставление с вашей главной мыслью?',
  'Is there a sentence where the doer of the action genuinely does not matter, where a passive would read more naturally than an active?':
    'Есть ли предложение, где исполнитель действия действительно не важен, и пассивный залог звучал бы естественнее активного?',
  'It opens with one structure (a subordinate clause: "Although alternative medicine is unregulated...") and closes with a different one (a relative clause: "...a claim which few studies support").':
    'Абзац начинается одной конструкцией (придаточное предложение: "Although alternative medicine is unregulated...") и завершается другой (определительное придаточное: "...a claim which few studies support").',
  'A passive appears where the doer genuinely does not matter ("more research needs to be conducted"), not forced in everywhere.':
    'Пассивный залог появляется там, где исполнитель действительно не важен ("more research needs to be conducted"), а не вставлен насильно повсюду.',
  'The range serves the meaning. Nothing here is a structure for its own sake; each one is the natural way to say that particular sentence.':
    'Разнообразие служит смыслу. Ни одна конструкция здесь не ради самой себя; каждая это естественный способ сказать именно эту мысль.',

  /* ── src/data/focused/writing-recurring-pattern-accuracy.ts ─────────────── */
  'Correct a sentence with three article slips, then write your own sentence using "the environment" correctly.':
    'Исправьте предложение с тремя ошибками в артиклях, затем напишите своё предложение с "the environment", правильно.',
  'Grammar pattern: articles': 'Грамматическая модель: артикли',
  '"Public transport" and "traffic" are uncountable, general nouns here, so they take NO article: "Public transport... reduces traffic", not "the public transport" or "a traffic".':
    '"Public transport" и "traffic" здесь неисчисляемые существительные общего значения, поэтому артикль им НЕ нужен: "Public transport... reduces traffic", а не "the public transport" или "a traffic".',
  '"The environment" is one specific, shared thing, so it always takes "the": "helps the environment", never "helps environment".':
    '"The environment" это одна конкретная, общая для всех вещь, поэтому ей всегда нужен "the": "helps the environment", никогда не "helps environment".',
  'Deciding whether a noun is general or specific, one of many or the one everyone means, is what article accuracy actually tests.':
    'Именно определение того, общее существительное или конкретное, одно из многих или то самое, которое имеют в виду все, и проверяет точность в артиклях.',
  'The public transport should be improved because it reduces a traffic and helps environment in the city.':
    'The public transport should be improved because it reduces a traffic and helps environment in the city.',
  'Three article slips, all from the same confusion between general and specific. "Public transport" and "traffic" are being used generally here, so neither takes an article: "Public transport... reduces traffic". "The environment" is one specific, shared thing, so it always takes "the": "helps THE environment". Ask whether each noun means "one specific thing everyone would recognise" or "this kind of thing in general" before choosing an article.':
    'Три ошибки в артиклях, все из-за одной и той же путаницы между общим и конкретным значением. "Public transport" и "traffic" здесь используются в общем значении, поэтому артикль не нужен ни тому, ни другому: "Public transport... reduces traffic". "The environment" это одна конкретная, общая для всех вещь, поэтому ей всегда нужен "the": "helps THE environment". Прежде чем выбрать артикль, спросите себя: существительное значит "одна конкретная вещь, которую узнают все" или "такого рода вещь вообще"?',
  'Now write one sentence of your own using "the environment" correctly, about any IELTS topic.':
    'Теперь напишите своё предложение с "the environment", правильно, на любую тему IELTS.',
  'Find every noun that could take an article and ask: is this general, or one specific thing?':
    'Найдите каждое существительное, которому может понадобиться артикль, и спросите: это общее значение или одна конкретная вещь?',
  '"Public transport" and "traffic" here are general: no article.':
    '"Public transport" и "traffic" здесь в общем значении: артикль не нужен.',
  '"The environment" is always specific: always "the".':
    '"The environment" всегда конкретно: всегда "the".',

  /* ── src/data/focused/speaking-topic-vocabulary.ts ───────────────────────── */
  'Answer a familiar Part 1 topic using a wider range of vocabulary, reaching past the first word that comes to mind for a more specific one.':
    'Ответьте на знакомую тему Part 1, используя более широкий словарный запас, вместо первого попавшегося слова выбирая более точное.',
  'Part 1: a wider range of vocabulary': 'Part 1: более широкий словарный запас',
  'Part 1: a wider range of vocabulary, a different topic': 'Part 1: более широкий словарный запас, другая тема',
  'Answer one question about your home below. Reach for specific words about the topic (cosy, spacious, within walking distance) rather than the first generic word that comes to mind.':
    'Ответьте на один вопрос о вашем доме ниже. Используйте конкретные слова по теме (cosy, spacious, within walking distance) вместо первого общего слова, которое приходит в голову.',
  'A different topic, food. Answer one question with a wide range of vocabulary, on your own.':
    'Другая тема, еда. Ответьте на один вопрос с широким словарным запасом, самостоятельно.',
  'Did you avoid the most generic word (nice, big, good, bad) at least once, reaching for something more specific instead?':
    'Избежали ли вы хотя бы раз самого общего слова (nice, big, good, bad), выбрав вместо него что-то более конкретное?',
  'Did you use at least one topic word or phrase you would not use for a completely different Part 1 topic?':
    'Использовали ли вы хотя бы одно тематическое слово или фразу, которые не подошли бы для совсем другой темы Part 1?',
  'Did you vary your vocabulary across your answer, rather than repeating the same adjective twice?':
    'Разнообразили ли вы лексику в своём ответе, а не повторили одно и то же прилагательное дважды?',
  'Did the more specific words still sound natural, rather than dropped in just to sound advanced?':
    'Звучали ли более конкретные слова естественно, а не так, будто их вставили просто для эффекта продвинутого уровня?',

  /* ── src/data/focused/speaking-part3-paraphrase-the-question.ts ─────────── */
  'Paraphrase a Part 3 question in your own words before you answer it, rather than launching straight into your answer.':
    'Перефразируйте вопрос Part 3 своими словами перед тем, как ответить на него, вместо того чтобы сразу начинать отвечать.',
  'Part 3: paraphrase the question': 'Part 3: перефразируйте вопрос',
  'Part 3: paraphrase the question, a different one': 'Part 3: перефразируйте вопрос, другой',
  'Answer the follow-up question below. Start by restating it in your own words ("So, whether it is better to learn on your own or with a teacher...") before you give your answer.':
    'Ответьте на дополнительный вопрос ниже. Начните с пересказа своими словами ("So, whether it is better to learn on your own or with a teacher...") перед тем, как дать ответ.',
  'A different follow-up question. Paraphrase it in your own words before answering, on your own.':
    'Другой дополнительный вопрос. Перефразируйте его своими словами перед ответом, самостоятельно.',
  'Did you restate the question in your own words, in one short phrase, before answering?':
    'Пересказали ли вы вопрос своими словами, одной короткой фразой, перед тем как ответить?',
  'Did your paraphrase use different words from the question, not the same words repeated back?':
    'Использовалась ли в пересказе другая лексика, а не те же слова, повторённые обратно?',
  'Did the paraphrase stay accurate, not changing what the question actually asked?':
    'Остался ли пересказ точным, не изменив смысл того, о чём на самом деле спрашивал вопрос?',
  'Did you move on to your real answer straight after, rather than paraphrasing twice?':
    'Перешли ли вы сразу к настоящему ответу, а не пересказали вопрос дважды?',

  /* ── src/data/focused/speaking-part2-tense-range.ts ──────────────────────── */
  'Tell a Part 2 story using more than one tense: the past for what happened, and the present for how things are now or how you feel about it looking back.':
    'Расскажите историю Part 2, используя больше одного времени: прошедшее для того, что случилось, и настоящее для того, как обстоят дела сейчас или что вы об этом думаете сейчас.',
  'Part 2: varying your tenses': 'Part 2: разнообразие времён',
  'Part 2: varying your tenses, a different cue card': 'Part 2: разнообразие времён, другая карточка',
  'Talk for up to two minutes on the cue card below. Use the past tense for the story itself, and the present tense at least once for how things are now.':
    'Говорите до двух минут по карточке ниже. Используйте прошедшее время для самой истории и хотя бы раз настоящее время для того, как обстоят дела сейчас.',
  'A different cue card. Tell the story using more than one tense, on your own.':
    'Другая карточка. Расскажите историю, используя больше одного времени, самостоятельно.',
  'Did you use the past tense for the main events of your story?':
    'Использовали ли вы прошедшее время для основных событий истории?',
  'Did you also use the present tense at least once, for how things are now or how you feel about it today?':
    'Использовали ли вы хотя бы раз настоящее время, для того, как обстоят дела сейчас или что вы об этом думаете сегодня?',
  'If something was already in progress when the main event happened, did you use the past continuous (I was walking when...) rather than the past simple for both?':
    'Если что-то уже происходило, когда случилось основное событие, использовали ли вы прошедшее продолженное (I was walking when...), а не простое прошедшее для обоих?',
  'Did every tense you used match the time you actually meant, rather than a tense chosen at random?':
    'Соответствовало ли каждое использованное время тому моменту, который вы на самом деле имели в виду, а не было выбрано наугад?',

  /* ── src/data/focused/speaking-part3-complex-sentences.ts ───────────────── */
  'Give a reason for your opinion using a complex sentence with a subordinate clause (because, since, as, although), instead of two short separate sentences.':
    'Приведите причину своего мнения, используя сложноподчинённое предложение с придаточным (because, since, as, although), вместо двух коротких отдельных предложений.',
  'Part 3: complex sentences for reasons': 'Part 3: сложные предложения для причин',
  'Part 3: complex sentences for reasons, a different question': 'Part 3: сложные предложения для причин, другой вопрос',
  'Answer the follow-up question below. Give your opinion and your reason in ONE sentence, joined with because, since or as.':
    'Ответьте на дополнительный вопрос ниже. Выразите мнение и причину в ОДНОМ предложении, соединив их через because, since или as.',
  'A different follow-up question. Give your opinion and reason in one complex sentence, on your own.':
    'Другой дополнительный вопрос. Выразите мнение и причину в одном сложном предложении, самостоятельно.',
  'Did you join your opinion and your reason into ONE sentence, using because, since or as?':
    'Объединили ли вы мнение и причину в ОДНО предложение, используя because, since или as?',
  'Did you use at least one more subordinate clause somewhere else in your answer (although, while, if)?':
    'Использовали ли вы ещё хотя бы одно придаточное предложение где-то ещё в ответе (although, while, if)?',
  'Did the subordinate clause actually carry a real reason, rather than being added just for the grammar?':
    'Действительно ли придаточное предложение несло реальную причину, а не было добавлено просто ради грамматики?',
  'Did you still sound natural, rather than stiff or over-rehearsed?':
    'Звучали ли вы по-прежнему естественно, а не скованно или заученно?',

  /* ── src/data/focused/speaking-part3-abstract-opinion.ts ────────────────── */
  'Give an opinion on a Part 3 question, justify it with a reason, and support the reason with a specific example, using the OREO structure.':
    'Выразите мнение по вопросу Part 3, обоснуйте его причиной и подкрепите причину конкретным примером, используя структуру OREO.',
  'Part 3: opinion, reason, example': 'Part 3: мнение, причина, пример',
  'Part 3: opinion, reason, example, a different question': 'Part 3: мнение, причина, пример, другой вопрос',
  'Answer the follow-up question below using the OREO structure: opinion, reason, example, then a short closing thought.':
    'Ответьте на дополнительный вопрос ниже по структуре OREO: мнение, причина, пример, затем короткая заключительная мысль.',
  'A different follow-up question. Use the OREO structure on your own.':
    'Другой дополнительный вопрос. Используйте структуру OREO самостоятельно.',
  'Did you state your opinion clearly, in your first sentence ("I think...", "In my opinion...")?':
    'Чётко ли вы выразили мнение в первом же предложении ("I think...", "In my opinion...")?',
  'Did you give a reason for that opinion, not only the opinion itself?':
    'Привели ли вы причину этого мнения, а не только само мнение?',
  'Did you support the reason with a specific example, signalled by a phrase such as "for example" or "take... as an example"?':
    'Подкрепили ли вы причину конкретным примером с сигнальной фразой вроде "for example" или "take... as an example"?',
  'Did you close by summarising your view, rather than trailing off after the example?':
    'Завершили ли вы кратким итогом своего мнения, а не оборвали мысль сразу после примера?',

  /* ── src/data/focused/speaking-part3-speculate-and-compare.ts ───────────── */
  'Compare two sides of a Part 3 question explicitly, using comparing language (compared with, whereas, on the other hand), rather than only answering one side.':
    'Явно сравните две стороны вопроса Part 3, используя сравнительную лексику (compared with, whereas, on the other hand), а не отвечая только с одной стороны.',
  'Part 3: comparing two sides': 'Part 3: сравнение двух сторон',
  'Part 3: comparing two sides, a different question': 'Part 3: сравнение двух сторон, другой вопрос',
  'Answer the follow-up question below by weighing both sides explicitly, using a comparing phrase, before giving your own view.':
    'Ответьте на дополнительный вопрос ниже, явно взвесив обе стороны с помощью сравнительной фразы, перед тем как высказать своё мнение.',
  'A different follow-up question. Compare both sides on your own.':
    'Другой дополнительный вопрос. Сравните обе стороны самостоятельно.',
  'Did you mention BOTH sides of the question, not only the one you agree with more?':
    'Упомянули ли вы ОБЕ стороны вопроса, а не только ту, с которой согласны больше?',
  'Did you use a comparing phrase (compared with, whereas, on the other hand) to connect the two sides?':
    'Использовали ли вы сравнительную фразу (compared with, whereas, on the other hand), чтобы связать две стороны?',
  'Did you say which side you lean towards, and why, rather than leaving it balanced with no conclusion?':
    'Сказали ли вы, к какой стороне склоняетесь и почему, а не оставили ответ сбалансированным без вывода?',
  'Did comparing the two sides actually make your answer longer and more developed, not just repeat the same point twice?':
    'Сделало ли сравнение двух сторон ваш ответ действительно длиннее и развёрнутее, а не просто повторило одну и ту же мысль дважды?',

  /* ── speaking-gap.ts: the new hand-off headlines ─────────────────────────── */
  'Work on developing your Part 3 answers': 'Поработайте над развёрнутостью ответов в Part 3',
  'Work on comparing both sides': 'Поработайте над сравнением обеих сторон',
  'Work on a wider range of vocabulary': 'Поработайте над расширением словарного запаса',
  'Work on varying your tenses': 'Поработайте над разнообразием времён',
  'Work on complex sentences for reasons': 'Поработайте над сложными предложениями для причин',
  'Work on pronunciation': 'Поработайте над произношением',

  /* ── SpeakingObjectiveHandoff.tsx: the pronunciation re-check card ──────── */
  'Pronunciation can only be checked from a real recording, never from a self-check screen or a transcript. Record a new answer through the Speaking trainer to get a fresh check.':
    'Произношение можно проверить только по реальной записи, никогда не по экрану самопроверки и не по тексту. Запишите новый ответ в тренажёре Speaking, чтобы получить свежую проверку.',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
