/* Russian: the intake (WP10).
   Batch owner: the intake agent. Nobody else edits this file.

   Covers: src/components/plan/Intake.tsx, src/components/learning/intake/*,
   src/pages/plan-settings.astro's editor, and the honest plan-outcome
   sentences in src/lib/plan/summary.ts (planOutcome()).

   A few short keys this screen also uses ('Band {band}', 'Band', 'Every
   day', 'Weekdays only', 'Same as target', 'Exam date', 'Continue', 'Back',
   'Next') already have a Russian entry in another batch file with the same
   wording this file would have chosen, so they are deliberately left out
   here rather than duplicated (see ru/index.ts's note on conflicting
   duplicates).

   See docs/I18N-GUIDE.md for the style rules and the glossary. */

export const strings: Record<string, string> = {
  'What overall band are you aiming for?': 'На какой общий балл вы нацелены?',
  'This course currently covers Academic IELTS.': 'Этот курс сейчас охватывает Academic IELTS.',
  'Set a different minimum for each paper': 'Задать свой минимум для каждого раздела',
  'Set these only if you need a minimum in every paper, for example 6.5 overall with nothing below 6.0. Leave one blank and it uses your overall target.':
    'Указывайте это, только если вам нужен минимум по каждому разделу, например 6.5 в среднем и не ниже 6.0 по каждому разделу. Если поле пустое, используется ваш общий целевой балл.',
  Reading: 'Чтение',
  Listening: 'Аудирование',
  Writing: 'Письмо',
  Speaking: 'Говорение',
  'When is your exam?': 'Когда у вас экзамен?',
  'I do not have a date yet': 'У меня пока нет даты',
  'Which days can you study?': 'В какие дни вы можете заниматься?',
  'How long can you study each day?': 'Сколько времени вы можете заниматься каждый день?',
  'On a hard day you can always ask for less time just for that day, from Today. It will not change this regular plan.':
    'В трудный день вы всегда можете попросить меньше времени только на этот день, на странице «Сегодня». Это не изменит ваш обычный план.',
  '{minutes} minutes': '{minutes} минут',
  "Your teacher's recommendation": 'Рекомендация вашего преподавателя',
  'Can you really give {minutes} minutes most days?': 'Сможете ли вы действительно уделять {minutes} минут почти каждый день?',
  'Yes, I can commit to this': 'Да, я справлюсь',
  "Let's be realistic": 'Будем реалистами',
  'Which language should explanations be in?': 'На каком языке объяснять материал?',
  'Lessons, questions, passages and model answers always stay in English. This only changes the language Mr EZ explains things in.':
    'Уроки, задания, тексты и образцы ответов всегда остаются на английском. Это меняет только язык объяснений Mr EZ.',
  'Tell us which paper feels hardest': 'Скажите, какой раздел кажется самым сложным',
  'Which paper feels hardest right now?': 'Какой раздел сейчас кажется самым сложным?',
  'A guess is fine. This is just a starting hint, real results replace it fast.':
    'Можно ответить примерно. Это лишь первая подсказка, реальные результаты быстро её заменят.',
  'Add a recent score, if you have one': 'Добавить недавний результат, если он у вас есть',
  'This is self-reported. It helps us get started, but it is never treated as a measured result.':
    'Это указано вами самостоятельно. Это помогает начать, но никогда не считается измеренным результатом.',
  'Band {band}, self-reported, {date}': 'Балл {band}, указан самостоятельно, {date}',
  Select: 'Выбрать',
  'Paper (optional)': 'Раздел (необязательно)',
  Overall: 'Общий балл',
  'Date you took it': 'Дата сдачи',
  'Add this score': 'Добавить этот результат',
  'Saved as self-reported.': 'Сохранено как указанное самостоятельно.',
  'Your plan is saved.': 'Ваш план сохранён.',
  'Save changes': 'Сохранить изменения',
  'Save my plan': 'Сохранить мой план',
  'Answer later': 'Ответить позже',
  'Your changes are saved.': 'Ваши изменения сохранены.',

  /* src/lib/plan/summary.ts, planOutcome() */
  'Your exam date has passed. Set a new date, or a new goal, to bring the plan back on track.':
    'Дата вашего экзамена уже прошла. Задайте новую дату или новую цель, чтобы вернуть план в нужное русло.',
  'No exam date yet, so this plan is provisional. It paces itself from {minutes} minutes a day and will settle down the moment you add a date.':
    'Дата экзамена пока не задана, поэтому этот план предварительный. Он рассчитан на {minutes} минут в день и станет окончательным, как только вы укажете дату.',
  'A few study days were missed, so the plan was rebuilt around what is realistically reachable from here.':
    'Было пропущено несколько дней занятий, поэтому план пересобран с учётом того, что реально успеть с этого момента.',
  'Your exam is very close. The plan is focused on what can still help in the time left, not on new material.':
    'Ваш экзамен уже совсем близко. План сосредоточен на том, что ещё может помочь за оставшееся время, а не на новом материале.',
  'Measured evidence shows you meeting your confirmed goal.': 'Измеренные результаты показывают, что вы достигли своей подтверждённой цели.',
  '{minutes} minutes a day is enough to make steady, honest progress toward your goal.':
    '{minutes} минут в день достаточно для стабильного и честного продвижения к вашей цели.',

  /* The tight-scope pair: said instead of the "is enough" sentence above
     whenever the planner itself had to leave real work out. Neither one may
     use the word "enough" in any language, and neither promises a band. */
  'With {pace} until the exam, {minutes} minutes a day can cover a few priorities properly. It cannot cover everything your goal needs, and it cannot promise a band.':
    'До экзамена осталось {pace}, и за {minutes} минут в день можно как следует разобрать лишь несколько главных тем. Всё, что нужно для вашей цели, в это время не уместится, и никакой план не может обещать балл.',
  '{minutes} minutes a day can cover a few priorities properly. It cannot cover everything your goal needs, and it cannot promise a band.':
    'За {minutes} минут в день можно как следует разобрать лишь несколько главных тем. Всё, что нужно для вашей цели, в это время не уместится, и никакой план не может обещать балл.',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {
  /* Keyed by the English "other" form exactly as written at the call site
     (docs/I18N-GUIDE.md), not the singular. The collapsed disclosure over
     the milestones the planner dropped, in src/components/learning/intake/ui.tsx. */
  'What will not fit before the exam ({n} things)': {
    one: 'Что не уместится до экзамена ({n} пункт)',
    few: 'Что не уместится до экзамена ({n} пункта)',
    many: 'Что не уместится до экзамена ({n} пунктов)',
    other: 'Что не уместится до экзамена ({n} пункта)',
  },
};
