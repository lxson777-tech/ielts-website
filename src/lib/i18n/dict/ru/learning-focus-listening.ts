/* Russian: Listening's audio stimulus inside a focused exercise.
   Batch owner: WP18b/WP19 (personal learning build, 2026-09-22). Nobody
   else edits this file.

   Covers: src/components/learning/AudioSegmentPlayer.tsx, the audio-panel
   additions to src/components/learning/FocusedExercise.tsx, and the English
   written into src/data/focused-exercises.ts (the seven listening-* reason
   lists) and src/data/focused/listening-*.ts (exercise titles and
   objectives). Everything Listening shares with Reading (the passage-side
   strings, the check/guided header, the reason-note field, "I guessed")
   already lives in dict/ru/learning-focus.ts and is deliberately NOT
   repeated here: the dictionary is one merged object.

   Exam material stays English: a paper's title, a recording's own words
   and a publisher's attribution are never translated. What is translated
   is the teaching and the interface around them.

   See docs/I18N-GUIDE.md for the style rules and the glossary. */

export const strings: Record<string, string> = {
  /* AudioSegmentPlayer.tsx */
  'Recording finished, {position} of {duration}.': 'Запись закончилась, {position} из {duration}.',
  'Playing, {position} of {duration}.': 'Звучит, {position} из {duration}.',
  'Paused, {position} of {duration}.': 'На паузе, {position} из {duration}.',
  'Ready to play, {duration} in total.': 'Готово к воспроизведению, всего {duration}.',
  'Play the recording': 'Включить запись',
  Pause: 'Пауза',
  Play: 'Слушать',
  'Position in the recording': 'Положение в записи',
  Replay: 'Переслушать',

  /* FocusedExercise.tsx: the audio panel */
  Recording: 'Запись',
  'The section covering these questions': 'Отрывок, который охватывает эти вопросы',
  'The whole part this exercise is from': 'Вся часть, из которой взято это упражнение',
  'It plays once, exactly like the real recording. There is no way to pause, rewind or hear it again.':
    'Запись звучит один раз, как на настоящем экзамене. Поставить на паузу, перемотать назад или переслушать нельзя.',
  'Play, pause and replay as often as you like. Each replay is recorded as help, the same as a hint.':
    'Слушайте, ставьте на паузу и переслушивайте сколько угодно раз. Каждое повторное прослушивание засчитывается как помощь, так же как подсказка.',
  'Hear that again': 'Послушать это ещё раз',

  /* src/data/focused/listening-sentence-completion.ts */
  'Sentence Completion: guided practice': 'Sentence Completion: практика с подсказками',
  'Sentence Completion: more guided practice': 'Sentence Completion: ещё практика с подсказками',
  'Fill each gap with the exact words you hear, and catch it when the speaker corrects themselves.':
    'Заполняйте пропуски точными словами, которые слышите, и замечайте, когда говорящий сам себя поправляет.',
  'Sentence Completion: independent check': 'Sentence Completion: самостоятельная проверка',
  'Show on a recording you have not heard that you can complete sentences with the exact words, inside the word limit.':
    'Покажите на незнакомой записи, что вы можете дополнять предложения точными словами, не превышая лимит слов.',
  'Sentence Completion: second independent check': 'Sentence Completion: вторая самостоятельная проверка',
  'Show on a second recording you have not heard that you can complete sentences with the exact words, inside the word limit.':
    'Покажите на второй незнакомой записи, что вы можете дополнять предложения точными словами, не превышая лимит слов.',

  /* src/data/focused/listening-multiple-choice.ts */
  'Multiple Choice: guided practice': 'Multiple Choice: практика с подсказками',
  'Multiple Choice: more guided practice': 'Multiple Choice: ещё практика с подсказками',
  'Choose the option the recording actually confirms, and let a rejected option go.':
    'Выбирайте вариант, который запись действительно подтверждает, и отпускайте отклонённый вариант.',
  'Multiple Choice: independent check': 'Multiple Choice: самостоятельная проверка',
  'Show on a recording you have not heard that you can choose the option the speaker confirms, not just one you recognise.':
    'Покажите на незнакомой записи, что вы можете выбрать вариант, который подтверждает говорящий, а не просто узнанное слово.',
  'Multiple Choice: second independent check': 'Multiple Choice: вторая самостоятельная проверка',
  'Show on a second recording you have not heard that you can choose the option the speaker confirms, not just one you recognise.':
    'Покажите на второй незнакомой записи, что вы можете выбрать вариант, который подтверждает говорящий, а не просто узнанное слово.',

  /* src/data/focused/listening-table-completion.ts */
  'Table Completion: guided practice': 'Table Completion: практика с подсказками',
  'Table Completion: more guided practice': 'Table Completion: ещё практика с подсказками',
  'Complete a table, form or set of notes with the exact words you hear, inside the word limit.':
    'Заполняйте таблицу, бланк или конспект точными словами, которые слышите, не превышая лимит слов.',
  'Table Completion: independent check': 'Table Completion: самостоятельная проверка',
  'Show on a recording you have not heard that you can complete a table or form with the exact words, inside the word limit.':
    'Покажите на незнакомой записи, что вы можете заполнить таблицу или бланк точными словами, не превышая лимит слов.',
  'Table Completion: second independent check': 'Table Completion: вторая самостоятельная проверка',
  'Show on a second recording you have not heard that you can complete a table or form with the exact words, inside the word limit.':
    'Покажите на второй незнакомой записи, что вы можете заполнить таблицу или бланк точными словами, не превышая лимит слов.',

  /* src/data/focused/listening-matching-features.ts */
  'Matching: guided practice': 'Matching: практика с подсказками',
  'Matching: more guided practice': 'Matching: ещё практика с подсказками',
  'Match each item to the person, place or service the speaker actually settles on, not the first one mentioned.':
    'Сопоставляйте каждый пункт с тем человеком, местом или услугой, на которых говорящий действительно останавливается, а не с первым упомянутым.',
  'Matching: independent check': 'Matching: самостоятельная проверка',
  'Show on a recording you have not heard that you can match items to the right person or place on your own.':
    'Покажите на незнакомой записи, что вы можете самостоятельно сопоставлять пункты с нужным человеком или местом.',
  'Matching: second independent check': 'Matching: вторая самостоятельная проверка',
  'Show on a second recording you have not heard that you can match items to the right person or place on your own.':
    'Покажите на второй незнакомой записи, что вы можете самостоятельно сопоставлять пункты с нужным человеком или местом.',

  /* src/data/focused/listening-multiple-answer.ts */
  'Multiple Answer: guided practice': 'Multiple Answer: практика с подсказками',
  'Multiple Answer: more guided practice': 'Multiple Answer: ещё практика с подсказками',
  'Choose the options the recording actually confirms, and keep tracking every option to the end.':
    'Выбирайте варианты, которые запись действительно подтверждает, и следите за каждым вариантом до самого конца.',
  'Multiple Answer: independent check': 'Multiple Answer: самостоятельная проверка',
  'Show on a recording you have not heard that you can choose the right number of confirmed options on your own.':
    'Покажите на незнакомой записи, что вы можете самостоятельно выбрать нужное количество подтверждённых вариантов.',
  'Multiple Answer: second independent check': 'Multiple Answer: вторая самостоятельная проверка',
  'Show on a second recording you have not heard that you can choose the right number of confirmed options on your own.':
    'Покажите на второй незнакомой записи, что вы можете самостоятельно выбрать нужное количество подтверждённых вариантов.',

  /* src/data/focused/listening-categorisation.ts */
  'Categorisation: guided practice': 'Categorisation: практика с подсказками',
  'Categorisation: more guided practice': 'Categorisation: ещё практика с подсказками',
  'Sort each item into the category the speaker settles on, not the first one mentioned.':
    'Распределяйте каждый пункт по той категории, на которой говорящий в итоге останавливается, а не по первой упомянутой.',
  'Categorisation: independent check': 'Categorisation: самостоятельная проверка',
  'Show on a recording you have not heard that you can sort items into the right category on your own.':
    'Покажите на незнакомой записи, что вы можете самостоятельно распределять пункты по нужным категориям.',
  'Categorisation: second independent check': 'Categorisation: вторая самостоятельная проверка',
  'Show on a second recording you have not heard that you can sort items into the right category on your own.':
    'Покажите на второй незнакомой записи, что вы можете самостоятельно распределять пункты по нужным категориям.',

  /* src/data/focused/listening-diagram-labelling.ts */
  'Diagram Labelling: guided practice': 'Diagram Labelling: практика с подсказками',
  'Diagram Labelling: more guided practice': 'Diagram Labelling: ещё практика с подсказками',
  'Label a plan or diagram using the direction words that fix each position, not just the object named.':
    'Подписывайте план или схему, используя слова направления, которые определяют каждое место, а не только названный предмет.',
  'Diagram Labelling: independent check': 'Diagram Labelling: самостоятельная проверка',
  'Show on a recording you have not heard that you can label a diagram from direction words alone.':
    'Покажите на незнакомой записи, что вы можете подписать схему, ориентируясь только на слова направления.',
  'Diagram Labelling: second independent check': 'Diagram Labelling: вторая самостоятельная проверка',
  'Show on a second recording you have not heard that you can label a diagram from direction words alone.':
    'Покажите на второй незнакомой записи, что вы можете подписать схему, ориентируясь только на слова направления.',

  /* src/data/focused-exercises.ts: MISTAKE_REASONS, listening-sentence-completion */
  'The speaker corrected themselves and I kept the first thing I heard':
    'Говорящий сам себя поправил, а я оставил первое, что услышал',
  'writing down the first detail before the speaker changed or corrected it':
    'запись первой детали до того, как говорящий её изменил или поправил',
  'I did not catch how it was spelled': 'Я не расслышал, как это было продиктовано по буквам',
  'losing the letters while a word or name was being spelled out':
    'потеря букв, пока слово или имя диктовали по буквам',
  'I wrote more words than the limit allowed': 'Я написал больше слов, чем разрешал лимит',
  'not checking the stated word limit before answering': 'ответ без проверки указанного лимита слов',
  'I lost my place and missed the next answer': 'Я потерял место и пропустил следующий ответ',
  'losing track of where the recording was among the gaps': 'потеря места в записи среди пропусков',
  'It was too fast for me to write it down': 'Это было слишком быстро, чтобы я успел записать',

  /* listening-multiple-choice */
  'I heard an option mentioned and picked it straight away': 'Я услышал упоминание варианта и сразу его выбрал',
  'choosing the first option mentioned rather than waiting to hear what was actually confirmed':
    'выбор первого упомянутого варианта вместо того, чтобы дождаться, что подтвердится на самом деле',
  'The speaker changed their mind and I kept the first thing they said':
    'Говорящий передумал, а я оставил то, что он сказал сначала',
  'trusting an early statement instead of the correction that followed it':
    'доверие раннему высказыванию вместо последовавшей за ним поправки',
  'I chose it because I heard the exact words from the option':
    'Я выбрал это, потому что услышал точные слова из варианта',
  'matching the wording of an option rather than what it actually meant':
    'совпадение формулировки варианта, а не того, что он на самом деле означал',
  'I lost track of which question the recording had reached': 'Я потерял, до какого вопроса дошла запись',
  'losing track of where the recording was among the questions': 'потеря места в записи среди вопросов',
  'It was too fast to follow the options and the recording at once':
    'Было слишком быстро следить одновременно за вариантами и записью',

  /* listening-table-completion */
  'The speaker corrected a detail and I kept the first version': 'Говорящий поправил деталь, а я оставил первый вариант',
  'writing down a detail before the speaker corrected it': 'запись детали до того, как говорящий её поправил',
  'I lost letters while a name or address was being spelled': 'Я потерял буквы, пока диктовали по буквам имя или адрес',
  'losing letters while something was being spelled out': 'потеря букв, пока что-то диктовали по буквам',
  'not checking the stated word or figure limit': 'ответ без проверки указанного лимита слов или цифр',
  'I lost track of which row or box I was filling in': 'Я потерял, какую строку или ячейку заполняю',
  'losing track of position inside the table or form while listening':
    'потеря позиции внутри таблицы или бланка во время прослушивания',
  'I mixed up two similar sounding numbers': 'Я перепутал два похожих по звучанию числа',
  'confusing two similar sounding numbers, such as thirteen and thirty':
    'путаница между двумя похожими по звучанию числами, например тринадцать и тридцать',

  /* listening-matching-features */
  'I matched it by the name, not by what was said about it': 'Я сопоставил по названию, а не по тому, что о нём сказали',
  "matching by an option's name rather than the description actually given":
    'сопоставление по названию варианта, а не по данному описанию',
  'I chose the first option mentioned instead of waiting to hear it confirmed':
    'Я выбрал первый упомянутый вариант, не дождавшись подтверждения',
  'relying on the first mention rather than what the speaker settled on':
    'опора на первое упоминание, а не на то, на чём остановился говорящий',
  'I assumed each option could only be used once': 'Я решил, что каждый вариант можно использовать только один раз',
  'assuming an option could only be used once when the instructions did not say that':
    'предположение, что вариант можно использовать только один раз, хотя в инструкции это не было сказано',
  'I lost my place in the list while listening': 'Я потерял место в списке во время прослушивания',
  'losing track of which item the recording had reached': 'потеря того, до какого пункта дошла запись',
  'It was too fast to match everything in time': 'Было слишком быстро, чтобы успеть всё сопоставить',

  /* listening-multiple-answer */
  'I selected an option as soon as it was mentioned': 'Я выбрал вариант, как только его упомянули',
  'selecting an option as soon as it was mentioned, before hearing whether it was accepted or rejected':
    'выбор варианта сразу после упоминания, до того как стало ясно, принят он или отклонён',
  'I chose too few or too many options': 'Я выбрал слишком мало или слишком много вариантов',
  'not keeping to the number of options the question asked for': 'несоблюдение количества вариантов, которое требовал вопрос',
  'The speaker rejected an option and I kept it anyway': 'Говорящий отклонил вариант, а я всё равно его оставил',
  'keeping an option after the speaker had actually ruled it out':
    'сохранение варианта после того, как говорящий на самом деле его исключил',
  'I stopped tracking once the topic seemed to move on': 'Я перестал следить, как только тема, казалось, сменилась',
  'stopping tracking an option before the discussion of it was really finished':
    'прекращение отслеживания варианта до того, как его обсуждение действительно закончилось',
  'It was too fast to track every option': 'Было слишком быстро, чтобы следить за каждым вариантом',

  /* listening-categorisation */
  'The speaker moved an item to another category and I kept the first one':
    'Говорящий перенёс пункт в другую категорию, а я оставил первую',
  'keeping the first category mentioned instead of the final placement':
    'сохранение первой упомянутой категории вместо окончательного распределения',
  'I placed it by a word I recognised rather than the reason given':
    'Я разместил это по узнанному слову, а не по данной причине',
  'placing an item by a recognised word rather than the reason actually given for it':
    'распределение пункта по узнанному слову, а не по действительно данной причине',
  'I assumed the categories should end up with an even number of items':
    'Я решил, что в категориях должно получиться поровну пунктов',
  'forcing an even split between categories rather than following what was actually said':
    'искусственное равное распределение по категориям вместо того, чтобы следовать сказанному',
  'I lost track of which item was being discussed': 'Я потерял, какой пункт обсуждается',
  'It was too fast to sort everything in time': 'Было слишком быстро, чтобы успеть всё распределить',

  /* listening-diagram-labelling */
  'I confused left and right, or another direction word': 'Я перепутал лево и право или другое слово направления',
  'confusing a direction word such as left, right or opposite':
    'путаница в слове направления, например лево, право или напротив',
  'The speaker changed direction or corrected a position and I kept the first one':
    'Говорящий изменил направление или поправил положение, а я оставил первое',
  'keeping the first position mentioned instead of the corrected one':
    'сохранение первого упомянутого положения вместо исправленного',
  'I placed the label by the object named, without listening to the direction word':
    'Я разместил подпись по названному предмету, не прислушавшись к слову направления',
  "placing a label by the object named rather than the direction word that fixed its position":
    'размещение подписи по названному предмету, а не по слову направления, которое определяло его место',
  'I lost my place on the diagram partway through': 'Я потерял место на схеме на середине',
  'losing track of position on the diagram after a direction change':
    'потеря позиции на схеме после смены направления',
  'I lost the letters while a label was being spelled out': 'Я потерял буквы, пока подпись диктовали по буквам',
  'losing letters while a name was spelled out': 'потеря букв, пока имя диктовали по буквам',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
