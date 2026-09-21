/* Russian: the course, the lessons library and lesson chrome.
   Batch owner: the course/lessons agent. Nobody else edits this file.

   Covers: src/components/Course.tsx, src/components/UnitNote.tsx,
   src/layouts/LessonLayout.astro, src/pages/start.astro,
   src/pages/learn/*, and the lesson/unit titles and blurbs in
   src/data/lessons.ts and src/data/course.ts.

   Lesson BODY prose (src/content/lesson-bodies/*.html) is out of scope.

   See docs/I18N-GUIDE.md for the style rules and the glossary. */

export const strings: Record<string, string> = {
  /* Course.tsx: settings strip, editor form. */
  Close: 'Закрыть',
  Change: 'Изменить',
  "Your saved target was Band {band}. The course now starts at Band 6.5, so we've set that here, pick a different band if you'd like.":
    'Ваш сохранённый целевой балл был {band}. Теперь курс начинается с балла 6.5, поэтому мы поставили его здесь, вы можете выбрать другой балл.',
  'Target band': 'Целевой балл',
  'Exam date': 'Дата экзамена',
  '(optional)': '(необязательно)',
  'Band {band}': 'Балл {band}',
  'Daily study time': 'Время занятий в день',
  '{minutes} min/day': '{minutes} мин/день',
  'Study days': 'Дни занятий',
  'Every day': 'Каждый день',
  'Weekdays only': 'Только будни',
  'Minimum in each paper': 'Минимум по каждой части',
  'Set these if your university asks for a minimum in every paper, for example 6.5 overall with nothing below 6.0. Leave one blank and it uses your target band.':
    'Заполните это, если университет требует минимум по каждой части, например 6.5 в целом и не ниже 6.0 по каждой части. Оставьте поле пустым, чтобы использовать целевой балл.',
  'Same as target': 'Как целевой балл',
  Save: 'Сохранить',
  'Your plan settings are saved.': 'Настройки плана сохранены.',
  'Back to your dashboard': 'Назад на главную',
  '{done} of {total} lessons done': '{done} из {total} уроков пройдено',
  'Start with': 'Начните с',
  'Continue with': 'Продолжите с',
  'Every lesson complete. Move on to Exam readiness below.':
    'Все уроки пройдены. Переходите к разделу «Готовность к экзамену» ниже.',
  'Eight learning units, usually one per week. Start each paper with its overview, learn the method, then practise. Your calendar adjusts to your available dates; your completed lessons stay saved.':
    'Восемь учебных разделов, обычно по одному в неделю. Начинайте каждую часть с обзора, изучайте метод, затем практикуйтесь. Календарь подстраивается под ваши даты, а пройденные уроки всегда сохраняются.',
  '{done}/{total} done': '{done}/{total} пройдено',
  'Mark complete: {label}': 'Отметить как пройдено: {label}',
  'verbOpen': 'Открыть',
  'Lessons tick themselves off when you mark them complete on the lesson page.':
    'Уроки отмечаются автоматически, когда вы отмечаете их как пройденные на странице урока.',

  /* CourseSections.tsx. */
  '{done} of {total} done': '{done} из {total} пройдено',
  '{n} min': '{n} мин',

  /* LessonLibrary.tsx. */
  'Lesson library': 'Библиотека уроков',
  'Learn at your pace.': 'Учитесь в своём темпе.',
  'Choose a skill, open a lesson, and mark it complete when you are ready to move on.':
    'Выберите часть, откройте урок и отметьте его пройденным, когда будете готовы двигаться дальше.',
  'Search lessons': 'Поиск уроков',
  'Filter lessons': 'Фильтр уроков',
  All: 'Все',
  Overview: 'Обзор',
  'statusComplete': 'Пройдено',
  'Open lesson': 'Открыть урок',
  'Build your {skill} skills with this focused lesson.': 'Развивайте навыки по теме {skill} с помощью этого урока.',
  'No lessons match that search yet. Try another skill or phrase.':
    'По этому запросу уроков не найдено. Попробуйте другую часть или фразу.',

  /* LessonModelExample.tsx. */
  'What a Band 8 answer looks like': 'Как выглядит ответ на 8 баллов',
  "A real exam task of this type, answered at Band 8, with the examiner's reasons.":
    'Настоящее экзаменационное задание этого типа с ответом на 8 баллов и пояснениями экзаменатора.',
  'Another example': 'Другой пример',
  'The task': 'Задание',
  'Show the Band 8 answer': 'Показать ответ на 8 баллов',
  'Or write this one yourself first': 'Или сначала напишите его сами',
  'Write one of these yourself': 'Напишите один из них сами',
  'Open it with the phrases highlighted': 'Открыть с выделенными фразами',

  /* CourseGate.tsx. */
  'Course view': 'Вид курса',
  'In order': 'По порядку',
  'By section': 'По разделам',
  'Your course lives in your account': 'Ваш курс хранится в вашем аккаунте',
  'A course only works if it remembers where you got to. Create a free account so your place in the course, completed lessons and scores are saved and follow you to any device.':
    'Курс работает только тогда, когда он помнит, на чём вы остановились. Создайте бесплатный аккаунт, чтобы ваш прогресс, пройденные уроки и результаты сохранялись и были доступны на любом устройстве.',
  'Create my free account': 'Создать бесплатный аккаунт',
  'course-gateLog in': 'Войти',
  'Free, takes under a minute. Lessons and practice tests stay open to everyone.':
    'Бесплатно, занимает меньше минуты. Уроки и пробные тесты остаются открытыми для всех.',

  /* CourseSections.tsx, LessonTypeGrid.astro, PartGrid.astro (data-i18n): section
     labels/blurbs, lesson titles/blurbs and eyebrows come through as plain
     data-i18n text, keyed by whatever English the data registry holds. */

  /* LessonStep.astro (ctx "lesson-step" disambiguates from other uses of the
     bare words "Lesson"/"of" elsewhere in the app). */
  'lesson-stepLesson': 'Урок',
  'lesson-stepof': 'из',

  /* LessonTypeGrid.astro, PartGrid.astro. */
  'Start here': 'Начните здесь',
  min: 'мин',

  /* PracticeOrTest.astro. */
  Practice: 'Практика',
  Tests: 'Тесты',
  "What's the difference between Practice and Tests?": 'В чём разница между Практикой и Тестами?',
  'Guided practice for one skill, with a coach on screen': 'Практика по одной части с коучем на экране',
  'Use it while you are still learning the format': 'Используйте, пока ещё изучаете формат',
  'Hints, model phrases and feedback on every attempt': 'Подсказки, образцы фраз и разбор каждой попытки',
  'A full test, exactly like the real exam': 'Полный тест, точно как настоящий экзамен',
  'Use it when you want to know your band': 'Используйте, когда хотите узнать свой балл',
  'Timed, no hints, a band estimate and review after': 'На время, без подсказок, с оценкой балла и разбором после',
  'Go to Practice': 'Перейти к Практике',
  'Go to Tests': 'Перейти к Тестам',

  /* ProgressBar.astro: label is passed in by the caller, translated as
     whatever plain data-i18n text it renders. No fixed key of its own here. */

  /* LessonLayout.astro: lesson page chrome. */
  Breadcrumb: 'Хлебные крошки',
  Home: 'Главная',
  'Vocabulary quick check': 'Быстрая проверка слова',
  'Click to test yourself on this vocabulary word': 'Нажмите, чтобы проверить себя по этому слову',
  'Quick check': 'Быстрая проверка',
  'Which definition is correct?': 'Какое определение верное?',
  'Mark lesson as complete': 'Отметить урок как пройденный',
  'Lesson completed, tap to undo': 'Урок пройден, нажмите, чтобы отменить',
  'Save lesson': 'Сохранить урок',
  'Saved, tap to remove': 'Сохранено, нажмите, чтобы убрать',
  'Back to course': 'Назад к курсу',
  'Guided course': 'Курс по программе',
  'Next in course:': 'Далее в курсе:',
  'My notes': 'Мои заметки',
  'Jot down anything you want to remember about this lesson.': 'Запишите всё, что хотите запомнить об этом уроке.',
  'lesson-notesSaved': 'Сохранено',
  Completed: 'Пройдено',

  /* Tabs.tsx: labels arrive from callers as plain data, translated where
     rendered. No fixed key of its own here. */

  /* StrategyPanel.tsx: only the panel's own chrome; the strategy content
     itself (label, steps, traps) is data, out of scope for this batch. */
  'How to approach {type}': 'Как подступиться к теме {type}',

  /* PracticeQuiz.tsx: only interface chrome around the practice exercise.
     Passages, questions, options, explanations, transcripts and sources are
     exam material and are left untranslated. */
  'practice-audioListening recording': 'Аудиозапись',
  'Recording unavailable.': 'Запись недоступна.',
  'This clip covers {start} to {end} of the full recording.':
    'Этот отрывок соответствует части записи с {start} по {end}.',
  'Expand passage': 'Развернуть текст',
  'Collapse passage': 'Свернуть текст',
  paragraph: 'абзац',
  ending: 'окончание',
  '{noun} for {prompt}': '{noun} к вопросу «{prompt}»',
  '{noun} {value}': '{noun} {value}',
  'Choose {noun}…': 'Выберите {noun}…',
  'Type your answer…': 'Введите ваш ответ…',
  'Answer to question {n}': 'Ответ на вопрос {n}',
  'Nice one!': 'Отлично!',
  'Exactly right!': 'Точно!',
  'Well spotted!': 'Хорошо подмечено!',
  'Perfect!': 'Идеально!',
  'Correct!': 'Верно!',
  'Not quite. The answer is “{answer}”.': 'Не совсем. Правильный ответ: «{answer}».',
  'Source: {source}': 'Источник: {source}',
  Transcript: 'Транскрипт',
  '{correct} / {total} correct': '{correct} / {total} верно',
  'Try this passage again': 'Пройти этот отрывок снова',
  '{done} of {total} answered': '{done} из {total} отвечено',
  'Check answers': 'Проверить ответы',
  'Questions checked': 'Проверено вопросов',
  'Flawless! You have mastered this question type. 🏆': 'Безупречно! Вы освоили этот тип вопросов. 🏆',
  'Excellent work, almost perfect! 🌟': 'Отличная работа, почти идеально! 🌟',
  'Good job! Review the explanations you missed and go again. 💪':
    'Хорошая работа! Разберите то, что пропустили, и попробуйте снова. 💪',
  'Getting there. Reread the strategy above and try again. 📖':
    'Уже близко. Перечитайте стратегию выше и попробуйте снова. 📖',
  'Tough round! Study the explanations, then hit Try again. 🔄':
    'Непростой раунд! Изучите разборы и нажмите «Попробовать снова». 🔄',
  'practice-quizTry again': 'Попробовать снова',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {
  'About {n} lessons a week.': {
    one: 'Около {n} урок в неделю.',
    few: 'Около {n} урока в неделю.',
    many: 'Около {n} уроков в неделю.',
    other: 'Около {n} урока в неделю.',
  },
  'lessons shown': {
    one: 'урок показан',
    few: 'урока показано',
    many: 'уроков показано',
    other: 'урока показано',
  },
  'Band {band} answer · {n} words': {
    one: 'Ответ на {band} балл · {n} слово',
    few: 'Ответ на {band} балл · {n} слова',
    many: 'Ответ на {band} балл · {n} слов',
    other: 'Ответ на {band} балл · {n} слова',
  },
  '{n} lessons': {
    one: '{n} урок',
    few: '{n} урока',
    many: '{n} уроков',
    other: '{n} урока',
  },
};
