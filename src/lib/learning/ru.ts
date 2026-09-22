/* Russian for the sentences the LEARNING layer's own CODE writes: the
   planner (planner.ts), session assembly (session.ts) and the activity
   catalogue (catalog.ts). Not the tutor's own sentences, which already have
   their place in src/lib/tutor/ru.ts, and not the model's own prose.

   Why this is a separate file from src/lib/tutor/ru.ts, even though the
   shape is identical. Two reasons: catalog.ts's ~150 objective and
   unavailable-reason sentences belong to this layer, not the tutor's, and
   keeping the planner and session tables next to the sentences they
   translate (rather than merged into an already large tutor file) is what
   keeps "add a sentence, add its Russian" a one-file diff for whoever
   touches planner.ts or session.ts next.

   Why this is not in the site's dictionary (src/lib/i18n/dict/ru/*). Exactly
   architecture section 1.6: that dictionary is a lazy browser chunk read
   through getLocale(), and none of that exists inside the Mr EZ Cloudflare
   Worker, which imports planner.ts, session.ts and catalog.ts directly. So
   the shared layer gets its own map here: small, synchronous,
   dependency-free, importable by the Worker bundle without dragging in a
   loader, a fetch or localStorage.

   The three rules this file lives by, copied from src/lib/tutor/ru.ts on
   purpose so both files read the same way.

   1. THE ENGLISH IS THE KEY. A missing entry falls back to its own English
      text, so nothing can ever render blank or as a key name.
   2. WHOLE SENTENCES ONLY. Every entry is a complete sentence (or a complete
      phrase) with {named} holes, never a fragment glued to another
      fragment.
   3. ENGLISH STAYS ENGLISH WHERE THE EXAM DOES. Question type names, the
      four paper names, Part / Task and IELTS itself are variables filled
      with English and are left English inside the Russian sentence.

   One extra rule this file needs that the tutor's does not: three of
   catalog.ts's sentences (two unavailable reasons and one drill objective)
   are built with a JS template literal INSIDE catalog.ts, so by the time
   planner.ts or session.ts reads `activity.objective` or
   `activity.unavailable.reason` the question type name and paper name are
   already substituted into the English string, and a plain whole-string
   lookup can never match it for every question type. PARAMETRIC below
   matches the shape of those three templates and rebuilds the Russian
   version with the same values (a question type name, a paper name, both
   exam vocabulary that stays English) put back in. */

import type { Locale } from '../i18n/locale';

export type TextVars = Record<string, string | number>;

/** Fill `{name}` holes. Unknown names are left visible rather than blanked,
    so a typo shows up as `{nmae}` instead of vanishing. Same behaviour as
    interpolate() in src/lib/i18n/translate.ts and fill() in
    src/lib/tutor/ru.ts. */
function fill(text: string, vars?: TextVars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole,
  );
}

/** A sentence built from a JS template literal before this module ever sees
    it (see the header). `match` is checked against the whole English string;
    its capture groups are exam vocabulary (a question type label, a paper
    name) and are placed back into the Russian template untranslated, the
    same rule every other entry in this file follows for those two kinds of
    variable. Checked only after an exact match in RU_STRINGS misses, so an
    ordinary sentence that happens to look similar is never mistaken for
    one of these three. */
const PARAMETRIC: { match: RegExp; ru: (groups: string[]) => string }[] = [
  {
    // catalog.ts buildPractiseActivities: coverage.absent
    match: /^No paper in the library contains a (.+) question, so there is nothing real to practise here yet\.$/,
    ru: ([label]) =>
      `В библиотеке нет ни одного текста с вопросом типа ${label}, поэтому здесь пока нечего практиковать.`,
  },
  {
    // catalog.ts buildPractiseActivities: counts.drills === 0
    match: /^No (Reading|Listening) drill contains a (.+) question, because this question type belongs to the other paper\.$/,
    ru: ([paperName, label]) =>
      `Среди тренировок по разделу ${paperName} нет вопроса типа ${label}, потому что этот тип вопросов относится к другому разделу.`,
  },
  {
    // catalog.ts buildPractiseActivities: the per-type drill objective
    match: /^Practise (.+) questions in (Reading|Listening) across short drills\.$/,
    ru: ([label, paperName]) => `Практикуйте вопросы типа ${label} в разделе ${paperName} через короткие тренировки.`,
  },
];

/** One sentence written by code, in the student's language. `english` is
    both the text and the lookup key. Mirrors tutorText() in
    src/lib/tutor/ru.ts exactly, so a caller that already knows that
    function needs nothing new here. */
export function learningText(locale: Locale, english: string, vars?: TextVars): string {
  if (locale === 'en') return fill(english, vars);
  const hit = RU_STRINGS[english];
  if (hit && hit.length > 0) return fill(hit, vars);
  for (const { match, ru } of PARAMETRIC) {
    const groups = match.exec(english);
    if (groups) return fill(ru(groups.slice(1)), vars);
  }
  return fill(english, vars);
}

/* ================================================================== *
 * The planner's own sentences (src/lib/learning/planner.ts)          *
 * ================================================================== */

const PLANNER_RU: Record<string, string> = {
  /* Reasons for today's objective. */
  'You answered {correct} of {items} of these on your own across {occasions} sittings. That is below what {paper} needs for your target, so it is the most useful hour you have.':
    'Вы самостоятельно ответили верно на {correct} из {items} таких вопросов, попытки: {occasions}. Это ниже того, что нужно по разделу {paper} для вашей цели, поэтому сейчас это самый полезный час, который у вас есть.',
  'Your measured {paper} is around band {band} and you need at least {required}. Closing that is the most useful hour you have, and the estimate can still move either way.':
    'Ваш измеренный балл по разделу {paper} примерно {band}, а нужно как минимум {required}. Сократить этот разрыв сейчас самое полезное, чем можно заняться, и оценка ещё может измениться в любую сторону.',
  'One result puts {paper} below what you need. It is a single occasion rather than a settled picture, so this is a second look rather than a conclusion.':
    'Один результат показал по разделу {paper} уровень ниже нужного. Это единичный случай, а не устоявшаяся картина, поэтому сейчас это скорее повторная проверка, чем вывод.',
  'One result puts {paper} around band {band}, against the {required} your goal asks for. It is a single occasion rather than a settled picture, so this is a second look rather than a conclusion.':
    'Один результат показал по разделу {paper} примерно балл {band}, а ваша цель требует {required}. Это единичный случай, а не устоявшаяся картина, поэтому сейчас это скорее повторная проверка, чем вывод.',
  'Nothing has been measured for {paper} yet, so the plan cannot say where you are. A short sample changes that.':
    'По разделу {paper} пока ничего не измерено, поэтому план не может сказать, на каком вы уровне. Короткая проверка это изменит.',
  'You last showed this {days} days ago. Spacing says it is time to prove it again rather than let it fade.':
    'В последний раз вы показывали это {days} дн. назад. По правилам интервального повторения пора подтвердить это снова, а не дать этому забыться.',
  '{paper} has had nothing recorded for {days} days, so it is due a turn before it goes cold.':
    'По разделу {paper} ничего не записывалось уже {days} дн., поэтому пора уделить ему время, пока навык не начал слабеть.',
  'There are {days} days left, and this is work that can still move in that time.':
    'До экзамена осталось {days} дн., и за это время эта работа ещё может дать результат.',
  'You told us {paper} feels hardest. That is your own account rather than a measurement, so it only sets the starting order and the first real result will correct it.':
    'Вы сказали, что раздел {paper} даётся тяжелее всего. Это ваша собственная оценка, а не измерение, поэтому она только задаёт порядок в начале, и первый же реальный результат её поправит.',
  'Nothing has been recorded yet, so this starts with how the paper works rather than with a level nobody has measured.':
    'Пока ничего не записано, поэтому начнём с того, как устроен этот раздел, а не с уровня, который никто ещё не измерял.',
  'Everything measured in {paper} is already at or above what you need, so this keeps it sharp rather than fixing a problem.':
    'Всё измеренное по разделу {paper} уже на нужном уровне или выше, поэтому сейчас это скорее поддержка формы, чем исправление проблемы.',
  'You chose this, so the plan follows it and keeps the evidence it produces.':
    'Вы выбрали это сами, поэтому план следует вашему выбору и сохраняет результаты, которые он даёт.',
  'The exam date on this plan has passed. Nothing here is finished; the plan needs a new date or a new goal before it can pace anything.':
    'Дата экзамена в этом плане уже прошла. Ничего здесь не завершено, плану нужна новая дата или новая цель, чтобы снова задать темп.',

  /* Evidence sentences that sit beside a reason. */
  'Nothing independent recorded for this yet.': 'По этому пункту пока нет ни одной самостоятельной попытки.',
  '{correct} of {items} answered on your own across {occasions} sittings, most recently {days} days ago.':
    '{correct} из {items} отвечено самостоятельно, попытки: {occasions}, последний раз {days} дн. назад.',
  'You need at least band {band} in {paper}.': 'Вам нужен балл не ниже {band} по разделу {paper}.',
  'Due for review since {date}.': 'Пора повторить, ждёт с {date}.',
  'You reported band {band} on {date}, which we have not measured.':
    'Вы указали балл {band} от {date}, но мы сами его не измеряли.',

  /* Change history. */
  'Your plan is set up. Today is {objective}.': 'Ваш план готов. Сегодня: {objective}.',
  'Today moves from {from} to {to}. {why}': 'Сегодняшнее занятие меняется с "{from}" на "{to}". {why}',
  "Today's steps were adjusted around your latest result. The objective is the same: {objective}.":
    'Шаги на сегодня подстроены под ваш последний результат. Цель та же: {objective}.',
  'The plan is now {status}. {why}': 'Теперь план {status}. {why}',
  'You missed {days} study days, so the week was rebuilt from where you actually are rather than piling the old days on top. {dropped}':
    'Вы пропустили {days} дн. занятий, поэтому неделя была перестроена с учётом того, где вы сейчас, а не с добавлением пропущенных дней сверху. {dropped}',
  'Nothing had to be dropped.': 'Ничего не пришлось убирать из плана.',
  '{count} things no longer fit before the exam and were taken off the plan.':
    'Из плана убрано то, что больше не помещается до экзамена, пунктов: {count}.',
  'You asked for a shorter day, so today is {minutes} minutes. Your regular {regular} minutes are unchanged.':
    'Вы попросили более короткий день, поэтому сегодня {minutes} мин. Ваша обычная норма {regular} мин. не меняется.',
  'You chose {paper} today, so the plan follows that and uses whatever it shows.':
    'Сегодня вы выбрали раздел {paper}, поэтому план следует этому выбору и опирается на то, что он покажет.',
  'You accepted a longer session for {label}, so today is given over to it.':
    'Вы согласились на более длинное занятие для {label}, поэтому сегодняшнее время отдано ему.',
  'Your goal or your settings changed, so the priorities were worked out again.':
    'Ваша цель или настройки изменились, поэтому приоритеты были пересчитаны заново.',
  '{objective} has not improved after {attempts} independent tries, so the plan stops offering more of the same drill and moves on. This one is worth a teacher looking at.':
    'Тема "{objective}" не улучшилась после {attempts} самостоятельных попыток, поэтому план перестаёт предлагать ту же тренировку и переходит дальше. Это стоит показать преподавателю.',

  /* Honest scope. */
  'There are {days} study days left and {minutes} minutes a day, which is about {total} minutes in total. That is enough to work on {covered}. {missed} will not get real coverage in the time left. No plan can promise a band.':
    'Осталось {days} дн. занятий по {minutes} мин, всего около {total} мин. Этого хватит, чтобы поработать над: {covered}. {missed} не успеет получить настоящее внимание за оставшееся время. Ни один план не может обещать балл.',
  'There is no exam date on this plan, so the pacing is provisional. Add a date and the plan will pace itself to it.':
    'В этом плане нет даты экзамена, поэтому темп занятий предварительный. Укажите дату, и план подстроится под неё.',
  'The exam date has passed. Set a new date or change the goal, and the plan will rebuild around it.':
    'Дата экзамена уже прошла. Укажите новую дату или измените цель, и план перестроится вокруг неё.',
  'There is nothing short enough in the library to sample {paper} in one sitting yet, so {paper} stays unknown until there is time for a full task.':
    'В библиотеке пока нет достаточно короткого материала, чтобы проверить раздел {paper} за одно занятие, поэтому {paper} остаётся неизвестным разделом, пока не найдётся время на полное задание.',
  'You are picking this back up after {days} missed days, so today is a normal day and nothing has been stacked on it.':
    'Вы возвращаетесь к занятиям после {days} пропущенных дн., поэтому сегодня обычный день, и на него ничего не навалено сверху.',

  /* Milestones. */
  'Take a short {paper} sample so the plan stops guessing': 'Пройти короткую проверку по разделу {paper}, чтобы план перестал гадать',
  '{objective} shown on questions you have not seen': '{objective} на вопросах, которые вы ещё не видели',
  'Sit a full {paper} paper under exam timing': 'Пройти полный тест по разделу {paper} на время',
  'There are not enough study days left before the exam to reach this.':
    'До экзамена не осталось достаточно дней занятий, чтобы успеть это.',

  /* Alternatives. */
  'I have less time today: {minutes} minutes instead': 'Сегодня у меня меньше времени: {minutes} мин вместо обычного',
  'Work on {paper} instead today': 'Заняться сегодня разделом {paper}',
  'Skip the {paper} sample for now and leave it marked unknown': 'Пропустить пока проверку по разделу {paper} и оставить его как неизвестный',

  /* Proposal refusals. */
  'That suggestion was made against an older version of the plan.':
    'Это предложение было сделано для более старой версии плана.',
  'That suggestion was made before your latest result came in.':
    'Это предложение было сделано до того, как пришёл ваш последний результат.',
  'That suggestion was made against an older version of the library.':
    'Это предложение было сделано для более старой версии библиотеки материалов.',
  'That suggestion did not name an activity.': 'В этом предложении не было указано конкретное задание.',
  'That suggestion named something that is not in the library.':
    'Это предложение указывает на то, чего нет в библиотеке материалов.',
  'That activity was not one of the ones offered.': 'Это задание не входило в число предложенных.',
  'Something else has to come first before that one is useful.':
    'Сначала нужно сделать кое-что другое, иначе от этого не будет пользы.',
  'That activity needs {minutes} minutes and today has {budget}.':
    'На это задание нужно {minutes} мин, а на сегодня отведено {budget}.',
  'You asked to skip that one.': 'Вы попросили пропустить именно это.',
  'A timed paper is running, so nothing may be suggested until it is finished.':
    'Сейчас идёт тест на время, поэтому до его завершения ничего нельзя предлагать.',
  'That activity cannot be scheduled: {reason}': 'Это задание нельзя запланировать: {reason}',

  /* The catalogue's synthetic "set a new goal" objective (planningObjective). */
  'Set a new exam date, or change the goal you are working towards.':
    'Укажите новую дату экзамена или измените цель, к которой вы движетесь.',

  /* The rest of the week (buildSchedule), previously outside PLANNER_SENTENCES. */
  'Exam day.': 'День экзамена.',
  'Rest day.': 'День отдыха.',
  'Keep the four papers moving.': 'Не давать ни одному из четырёх разделов застояться.',
  'Go back over {objective}': 'Вернуться к теме "{objective}"',
  'the paper you sat': 'тесту, который вы проходили',
  'the one thing that fits': 'единственному, что успевает войти',
  'Everything else': 'Всё остальное',
  'it needs something you said you cannot use right now.':
    'для этого нужно то, что, по вашим словам, сейчас недоступно.',
};

/* Status descriptions (planner.ts's STATUS_LABEL), substituted into
   'The plan is now {status}. {why}' above. Short phrases, not exam
   vocabulary, so they are translated the same way every other whole unit of
   meaning in this file is. */
const STATUS_RU: Record<string, string> = {
  'running to your exam date': 'идёт по графику к дате вашего экзамена',
  'running without an exam date, so the pacing is provisional': 'идёт без даты экзамена, поэтому темп предварительный',
  'rebuilt after some missed days': 'перестроен после нескольких пропущенных дней',
  'waiting for a new exam date or a new goal': 'ждёт новую дату экзамена или новую цель',
  'on the last day or two before your exam': 'в последних день или два перед вашим экзаменом',
  'showing every requirement met on measured evidence': 'показывает, что все требования выполнены по измеренным данным',
};

/* ================================================================== *
 * The session's own sentences (src/lib/learning/session.ts)          *
 * ================================================================== */

const SESSION_RU: Record<string, string> = {
  'Bring back what you already did on this before anything new.':
    'Сначала вспомните то, что вы уже делали по этой теме, прежде чем переходить к новому.',
  'Bring back the words that are due today before anything new.':
    'Сначала повторите слова, которые пора повторить сегодня, прежде чем переходить к новому.',
  'Bring back the words for what you are working on today.': 'Повторите слова по теме, над которой вы сегодня работаете.',
  'Bring back the words for this topic first. Your marked work keeps coming back lowest on vocabulary, so this is the part that holds the rest back.':
    'Сначала повторите слова по этой теме. В проверенных работах именно лексика раз за разом оказывается самым слабым местом, и именно она сдерживает остальное.',
  'Read the part of the lesson that explains this, not the whole page.':
    'Прочитайте ту часть урока, которая объясняет это, а не всю страницу целиком.',
  'Start with what this question type actually asks you for.':
    'Начните с того, что на самом деле требует этот тип вопросов.',
  'Work through real questions with help available when you get stuck.':
    'Прорабатывайте настоящие вопросы, при этом подсказки доступны, если вы застряли.',
  'Sit this under exam timing, on your own.': 'Пройдите это самостоятельно, в условиях экзаменационного времени.',
  'Answer a short set you have not seen, with no help, so the result means something.':
    'Ответьте на короткий набор вопросов, которых вы ещё не видели, без подсказок, чтобы результат что-то значил.',
  'A short sample to find out where you are. It is too short to be a band.':
    'Короткая проверка, чтобы понять, на каком вы уровне. Она слишком короткая, чтобы дать балл.',
  'A whole paper under timing, to see where this stands now.':
    'Полный тест на время, чтобы посмотреть, на каком уровне это сейчас.',
  'Go back over what you got wrong and say the rule in your own words.':
    'Вернитесь к тому, что вы сделали неверно, и своими словами сформулируйте правило.',
  'Go back over the marked work while it is still fresh.':
    'Просмотрите проверенную работу, пока она ещё свежа в памяти.',
  'This one cannot be cut in half, so it needs more time than today has.':
    'Это задание нельзя разделить пополам, поэтому на него нужно больше времени, чем есть сегодня.',
};

/* ================================================================== *
 * The catalogue's own objective and unavailable-reason sentences     *
 * (src/lib/learning/catalog.ts and the focused-exercise registries   *
 * under src/data/focused/ that catalog.ts assembles into it).        *
 * ================================================================== */

const CATALOG_RU: Record<string, string> = {
  /* Overview lessons */
  'Know how the Reading paper is built, how it is scored and what each question type asks.':
    'Понять, как устроен раздел Reading, как он оценивается и что требует каждый тип вопросов.',
  'Know how the Listening paper is built, how it is scored and what each part sounds like.':
    'Понять, как устроен раздел Listening, как он оценивается и как звучит каждая часть.',
  'Know how the Writing paper is built and how examiners mark the four criteria.':
    'Понять, как устроен раздел Writing и как экзаменаторы оценивают по четырём критериям.',
  'Know how the interview runs, how long each part lasts and how it is marked.':
    'Понять, как проходит собеседование, сколько длится каждая часть и как она оценивается.',
  'Know why vocabulary decides your band and how to build it topic by topic.':
    'Понять, почему словарный запас влияет на балл, и как наращивать его по темам.',

  /* Reading lessons */
  'Recognise the same idea written in different words, which is what every Reading question tests.':
    'Узнавать одну и ту же мысль, выраженную другими словами, ведь именно это проверяет каждый вопрос Reading.',
  'Choose the option the passage actually supports and reject the distractors.':
    'Выбирать вариант, который действительно подтверждается текстом, и отклонять отвлекающие варианты.',
  'Decide whether a statement is True, False or Not Given, and know the difference.':
    'Определять, верно ли утверждение это True, False или Not Given, и понимать разницу между ними.',
  "Decide whether a claim matches the writer's view, or is simply not given.":
    'Определять, совпадает ли утверждение с мнением автора, или оно просто не указано в тексте.',
  'Match a heading to a paragraph by its main idea rather than by a repeated word.':
    'Подбирать заголовок к абзацу по его главной мысли, а не по повторяющемуся слову.',
  'Find which paragraph holds one specific piece of information.':
    'Находить, в каком именно абзаце содержится нужная конкретная информация.',
  'Match each statement to the person, place or thing it belongs to.':
    'Сопоставлять каждое утверждение с тем человеком, местом или предметом, к которому оно относится.',
  'Complete a sentence with the ending the passage supports, in correct grammar.':
    'Дополнять предложение окончанием, которое подтверждается текстом, с правильной грамматикой.',
  'Fill a gap with the exact words from the passage, inside the word limit.':
    'Заполнять пропуск точными словами из текста, не превышая ограничение по количеству слов.',
  'Complete a summary, note, table or flow chart with words taken from the passage.':
    'Дополнять краткое изложение, конспект, таблицу или схему словами, взятыми из текста.',
  'Label a diagram with the exact words the passage uses.':
    'Подписывать схему точными словами, которые использует текст.',
  'Answer a direct question about the passage in the few words the instructions allow.':
    'Отвечать на прямой вопрос по тексту, укладываясь в то количество слов, которое разрешено заданием.',

  /* Listening lessons */
  'Catch names, numbers and spellings in an everyday conversation, including a speaker correcting themselves.':
    'Улавливать имена, числа и написание слов по буквам в бытовом разговоре, включая случаи, когда говорящий сам себя поправляет.',
  'Follow one speaker through a talk or a map by the signposts they use.':
    'Следить за одним говорящим в монологе или на карте по словам-указателям, которые он использует.',
  'Keep track of who says what when several speakers discuss a topic at natural speed.':
    'Отслеживать, кто что говорит, когда несколько говорящих обсуждают тему в естественном темпе.',
  'Follow the structure of an academic lecture and hear where the next answer is coming.':
    'Следить за структурой академической лекции и слышать, откуда придёт следующий ответ.',
  'Choose the option the recording supports and let the distractors go past.':
    'Выбирать вариант, который подтверждается записью, и пропускать мимо отвлекающие варианты.',
  'Match each item to the person, place or category the speaker gives it.':
    'Сопоставлять каждый пункт с тем человеком, местом или категорией, которую называет говорящий.',
  'Label a plan, map or diagram while the speaker moves through it.':
    'Подписывать план, карту или схему по ходу того, как говорящий её описывает.',
  'Complete a form, note, table or flow chart with the exact words you hear.':
    'Дополнять бланк, конспект, таблицу или схему точными словами, которые вы слышите.',
  'Complete a sentence with the exact words you hear, inside the word limit.':
    'Дополнять предложение точными словами, которые вы слышите, не превышая ограничение по количеству слов.',
  'Answer a direct question about the recording in the few words the instructions allow.':
    'Отвечать на прямой вопрос по записи, укладываясь в то количество слов, которое разрешено заданием.',

  /* Writing lessons */
  'Work through a Task 1 report step by step, from reading the visual to checking the wording.':
    'Пройти весь отчёт Task 1 шаг за шагом, от чтения визуального материала до проверки формулировок.',
  'Describe and compare the numbers in a chart, graph or table without listing every figure.':
    'Описывать и сравнивать цифры на диаграмме, графике или в таблице, не перечисляя каждое значение подряд.',
  'Describe the stages of a process in order, using the passive where it belongs.':
    'Описывать этапы процесса по порядку, используя страдательный залог там, где это уместно.',
  'Describe how a place changed between two maps, using location and change language.':
    'Описывать, как изменилось место между двумя картами, используя слова для места и изменений.',
  'Work through a Task 2 essay step by step, from reading the question to the conclusion.':
    'Пройти всё эссе Task 2 шаг за шагом, от чтения вопроса до заключения.',
  'State a clear position on an opinion question and hold it to the end.':
    'Чётко заявить позицию по вопросу типа opinion и удерживать её до конца.',
  'Present both views fairly and then give your own, without sitting on the fence.':
    'Беспристрастно изложить обе точки зрения, а затем дать свою, не уклоняясь от ответа.',
  'Weigh the advantages against the disadvantages and reach a judgement you support.':
    'Сопоставить преимущества и недостатки и прийти к обоснованному выводу.',
  'Name a real cause, propose a workable solution and say why it would work.':
    'Назвать реальную причину, предложить рабочее решение и объяснить, почему оно сработает.',
  'Answer both halves of a two-part question, each in its own paragraph.':
    'Ответить на обе части двухчастного вопроса, каждую в своём абзаце.',

  /* Speaking lessons */
  'Extend a short Part 1 answer into two or three natural sentences.':
    'Развернуть короткий ответ Part 1 в два-три естественных предложения.',
  'Plan a cue card in one minute and speak for the full two minutes.':
    'Спланировать ответ по карточке задания за одну минуту и говорить все положенные две минуты.',
  'Discuss an abstract question with reasons, examples and a comparison.':
    'Обсуждать отвлечённый вопрос, приводя причины, примеры и сравнение.',

  /* Vocabulary lesson */
  "Use this topic's words accurately when you speak and write.":
    'Точно использовать слова этой темы в устной и письменной речи.',

  /* Lesson checks */
  'Check what you took from this lesson on a few real questions.':
    'Проверить, что вы усвоили из этого урока, на нескольких настоящих вопросах.',

  /* Drills (fixed pair, reading/listening) */
  'Work one real Reading passage under time and see every answer explained.':
    'Пройти один настоящий текст Reading на время и увидеть разбор каждого ответа.',
  'Work one real Listening section under time and see every answer explained.':
    'Пройти одну настоящую часть Listening на время и увидеть разбор каждого ответа.',

  /* Vocabulary review */
  "Recall this topic's words from memory, not only recognise them.":
    'Вспоминать слова этой темы по памяти, а не только узнавать их.',
  'Review every word due today by recall, not only by recognition.':
    'Повторить все слова, которые нужно вспомнить сегодня, именно вспоминая их, а не только узнавая.',

  /* Full papers, mock, hubs */
  'Sit a complete Reading paper under exam timing and get a band estimate.':
    'Пройти полный тест Reading в экзаменационное время и получить примерный балл.',
  'Sit a complete Listening paper under exam timing and get a band estimate.':
    'Пройти полный тест Listening в экзаменационное время и получить примерный балл.',
  'Choose a Reading paper from the list and sit it under exam timing.':
    'Выбрать тест Reading из списка и пройти его в экзаменационное время.',
  'Choose a Listening paper from the list and sit it under exam timing.':
    'Выбрать тест Listening из списка и пройти его в экзаменационное время.',
  'Sit all four papers back to back, the closest thing here to the real exam day.':
    'Пройти все четыре раздела подряд, это здесь ближе всего к настоящему дню экзамена.',
  'Practise one Reading passage at a time, filtered to the question type you choose.':
    'Практиковать по одному тексту Reading за раз, отфильтрованному по выбранному вами типу вопросов.',
  'Practise one Listening section at a time, filtered to the question type you choose.':
    'Практиковать по одной части Listening за раз, отфильтрованной по выбранному вами типу вопросов.',
  'Write a full Task 1 or Task 2 under time and get a band on the four criteria.':
    'Написать полное задание Task 1 или Task 2 на время и получить балл по четырём критериям.',
  'Record a full Speaking answer and get a band on the four official criteria.':
    'Записать полный ответ Speaking и получить балл по четырём официальным критериям.',
  'Sit a live mock interview with the AI examiner and get a band report afterwards.':
    'Пройти живое пробное собеседование с ИИ экзаменатором и получить отчёт с баллом после него.',

  /* The full graded Writing task, by prompt form (writing-plans.ts, via
     catalog.ts's TASK1_OBJECTIVE_BY_FORM / TASK2_OBJECTIVE_BY_FORM tables
     and their two fallbacks). */
  'Write a full Task 1 report on a chart, graph or table and get a band on the four criteria.':
    'Написать полный отчёт Task 1 по диаграмме, графику или таблице и получить балл по четырём критериям.',
  'Write a full Task 1 report on two visuals together and get a band on the four criteria.':
    'Написать полный отчёт Task 1 по двум визуальным материалам вместе и получить балл по четырём критериям.',
  'Write a full Task 1 report on a process diagram and get a band on the four criteria.':
    'Написать полный отчёт Task 1 по диаграмме процесса и получить балл по четырём критериям.',
  'Write a full Task 1 report on a pair of maps and get a band on the four criteria.':
    'Написать полный отчёт Task 1 по паре карт и получить балл по четырём критериям.',
  'Write a full Task 2 opinion essay and get a band on the four criteria.':
    'Написать полное эссе Task 2 типа opinion и получить балл по четырём критериям.',
  'Write a full Task 2 discussion essay and get a band on the four criteria.':
    'Написать полное эссе Task 2 типа discussion и получить балл по четырём критериям.',
  'Write a full Task 2 advantages and disadvantages essay and get a band on the four criteria.':
    'Написать полное эссе Task 2 типа advantages and disadvantages и получить балл по четырём критериям.',
  'Write a full Task 2 two-part essay and get a band on the four criteria.':
    'Написать полное эссе Task 2 из двух частей и получить балл по четырём критериям.',
  'Write a full Task 1 report and get a band on the four criteria.':
    'Написать полный отчёт Task 1 и получить балл по четырём критериям.',
  'Write a full Task 2 essay and get a band on the four criteria.':
    'Написать полное эссе Task 2 и получить балл по четырём критериям.',

  /* The full graded Speaking parts (buildSpeakingGradedActivities). */
  'Answer a Part 1 topic out loud and get a band on the four criteria.':
    'Ответить вслух на тему Part 1 и получить балл по четырём критериям.',
  'Plan and deliver a two-minute Part 2 talk and get a band on the four criteria.':
    'Спланировать и произнести двухминутный рассказ Part 2 и получить балл по четырём критериям.',
  'Discuss the Part 3 follow-up questions and get a band on the four criteria.':
    'Обсудить дополнительные вопросы Part 3 и получить балл по четырём критериям.',

  /* Reference tools */
  'See what a band 8 answer does that yours does not do yet.':
    'Увидеть, что делает ответ на балл 8, чего пока не делает ваш.',
  'Read a band 7 cue card answer and the phrases that lift it to band 8.':
    'Прочитать ответ на балл 7 по карточке задания и фразы, которые поднимают его до балла 8.',
  'Read what each band actually requires, in plain words.':
    'Прочитать простыми словами, что на самом деле требуется для каждого балла.',
  'Find the lessons you saved and the notes you wrote on them.':
    'Найти сохранённые уроки и заметки, которые вы к ним написали.',
  'See every result so far, by paper and by question type.':
    'Увидеть все результаты на сегодня, по разделам и по типам вопросов.',
  'Set your target band, your exam date and how many minutes a day you study.':
    'Указать целевой балл, дату экзамена и сколько минут в день вы занимаетесь.',

  /* Focused exercise fallback (rarely reached: exercise.objective is set on
     every real entry, this only covers a missing one) */
  'Practise one thing on a few unseen items, with no help and no timer.':
    'Практиковать одну конкретную вещь на нескольких новых вопросах, без подсказок и без таймера.',

  /* Unavailable */
  'This set was written here and no teacher has checked it yet, so it cannot be used as an independent check.':
    'Этот набор составлен здесь, и его ещё не проверил преподаватель, поэтому его нельзя использовать как самостоятельную проверку.',

  /* ---- Focused exercises (src/data/focused/*.ts), Reading and Listening ---- */

  'Sort each item into the category the speaker settles on, not the first one mentioned.':
    'Отнести каждый пункт к той категории, на которой говорящий останавливается, а не к первой упомянутой.',
  'Show on a recording you have not heard that you can sort items into the right category on your own.':
    'Показать на записи, которую вы ещё не слышали, что вы можете сами правильно распределить пункты по категориям.',
  'Show on a second recording you have not heard that you can sort items into the right category on your own.':
    'Показать на второй записи, которую вы ещё не слышали, что вы можете сами правильно распределить пункты по категориям.',
  'Label a plan or diagram using the direction words that fix each position, not just the object named.':
    'Подписать план или схему, используя слова направления, которые определяют каждую позицию, а не только названный предмет.',
  'Show on a recording you have not heard that you can label a diagram from direction words alone.':
    'Показать на записи, которую вы ещё не слышали, что вы можете подписать схему только по словам направления.',
  'Show on a second recording you have not heard that you can label a diagram from direction words alone.':
    'Показать на второй записи, которую вы ещё не слышали, что вы можете подписать схему только по словам направления.',
  'Match each item to the person, place or service the speaker actually settles on, not the first one mentioned.':
    'Сопоставить каждый пункт с тем человеком, местом или услугой, на которых говорящий действительно останавливается, а не с первыми упомянутыми.',
  'Show on a recording you have not heard that you can match items to the right person or place on your own.':
    'Показать на записи, которую вы ещё не слышали, что вы можете сами правильно сопоставить пункты с человеком или местом.',
  'Show on a second recording you have not heard that you can match items to the right person or place on your own.':
    'Показать на второй записи, которую вы ещё не слышали, что вы можете сами правильно сопоставить пункты с человеком или местом.',
  'Choose the options the recording actually confirms, and keep tracking every option to the end.':
    'Выбрать варианты, которые запись действительно подтверждает, отслеживая каждый вариант до самого конца.',
  'Show on a recording you have not heard that you can choose the right number of confirmed options on your own.':
    'Показать на записи, которую вы ещё не слышали, что вы можете сами выбрать верное количество подтверждённых вариантов.',
  'Show on a second recording you have not heard that you can choose the right number of confirmed options on your own.':
    'Показать на второй записи, которую вы ещё не слышали, что вы можете сами выбрать верное количество подтверждённых вариантов.',
  'Choose the option the recording actually confirms, and let a rejected option go.':
    'Выбрать вариант, который запись действительно подтверждает, и отпустить отклонённый вариант.',
  'Show on a recording you have not heard that you can choose the option the speaker confirms, not just one you recognise.':
    'Показать на записи, которую вы ещё не слышали, что вы можете выбрать вариант, который подтверждает говорящий, а не просто знакомый вам.',
  'Show on a second recording you have not heard that you can choose the option the speaker confirms, not just one you recognise.':
    'Показать на второй записи, которую вы ещё не слышали, что вы можете выбрать вариант, который подтверждает говорящий, а не просто знакомый вам.',
  'Fill each gap with the exact words you hear, and catch it when the speaker corrects themselves.':
    'Заполнить каждый пропуск точными словами, которые вы слышите, и заметить момент, когда говорящий сам себя поправляет.',
  'Show on a recording you have not heard that you can complete sentences with the exact words, inside the word limit.':
    'Показать на записи, которую вы ещё не слышали, что вы можете дополнять предложения точными словами, не превышая ограничение по количеству слов.',
  'Show on a second recording you have not heard that you can complete sentences with the exact words, inside the word limit.':
    'Показать на второй записи, которую вы ещё не слышали, что вы можете дополнять предложения точными словами, не превышая ограничение по количеству слов.',
  'Complete a table, form or set of notes with the exact words you hear, inside the word limit.':
    'Дополнить таблицу, бланк или конспект точными словами, которые вы слышите, не превышая ограничение по количеству слов.',
  'Show on a recording you have not heard that you can complete a table or form with the exact words, inside the word limit.':
    'Показать на записи, которую вы ещё не слышали, что вы можете дополнять таблицу или бланк точными словами, не превышая ограничение по количеству слов.',
  'Show on a second recording you have not heard that you can complete a table or form with the exact words, inside the word limit.':
    'Показать на второй записи, которую вы ещё не слышали, что вы можете дополнять таблицу или бланк точными словами, не превышая ограничение по количеству слов.',
  'Classify a statement under the right person, place or thing from a shared list.':
    'Отнести утверждение к нужному человеку, месту или предмету из общего списка.',
  'Show on a passage you have not seen that you can classify a statement under the right category, on your own.':
    'Показать на тексте, который вы ещё не видели, что вы можете сами правильно отнести утверждение к нужной категории.',
  'Show on a second unseen passage that you can classify a statement under the right category, on your own.':
    'Показать на втором новом тексте, что вы можете сами правильно отнести утверждение к нужной категории.',
  'Match a statement to the person, place or thing it belongs to, not to the one mentioned nearest it.':
    'Сопоставить утверждение с тем человеком, местом или предметом, к которому оно относится, а не с ближайшим по тексту.',
  'Show on a passage you have not seen that you can match statements to the right person, place or thing on your own.':
    'Показать на тексте, который вы ещё не видели, что вы можете сами правильно сопоставлять утверждения.',
  'Show on a second unseen passage that you can match statements to the right person, place or thing on your own.':
    'Показать на втором новом тексте, что вы можете сами правильно сопоставлять утверждения.',
  'Match a heading to a paragraph by what the whole paragraph is about, not by a word it repeats.':
    'Подобрать заголовок к абзацу по тому, о чём весь абзац, а не по повторяющемуся в нём слову.',
  'Show on a passage you have not seen that you can match headings to paragraphs on your own.':
    'Показать на тексте, который вы ещё не видели, что вы можете сами правильно подбирать заголовки к абзацам.',
  'Show on a second unseen passage that you can match headings to paragraphs on your own.':
    'Показать на втором новом тексте, что вы можете сами правильно подбирать заголовки к абзацам.',
  'Choose the two correct statements from a longer list, checking every option against the passage.':
    'Выбрать два верных утверждения из более длинного списка, сверяя каждый вариант с текстом.',
  'Show on a passage you have not seen that you can choose the correct statements from a list, on your own.':
    'Показать на тексте, который вы ещё не видели, что вы можете сами правильно выбирать верные утверждения из списка.',
  'Show on a second unseen passage that you can choose the correct statements from a list, on your own.':
    'Показать на втором новом тексте, что вы можете сами правильно выбирать верные утверждения из списка.',
  'Choose the option the passage actually supports and reject the ones that only sound right.':
    'Выбрать вариант, который действительно подтверждается текстом, и отклонить те, что лишь звучат правдоподобно.',
  'Show on a passage you have not seen that you can choose the option the passage supports, on your own.':
    'Показать на тексте, который вы ещё не видели, что вы можете сами выбирать вариант, который подтверждается текстом.',
  'Show on a second unseen passage that you can choose the option the passage supports, on your own.':
    'Показать на втором новом тексте, что вы можете сами выбирать вариант, который подтверждается текстом.',
  'Find which paragraph holds one specific piece of information, not just the right general topic.':
    'Найти, в каком именно абзаце содержится конкретная информация, а не просто подходящая по теме.',
  'Show on a passage you have not seen that you can find where one piece of information sits, on your own.':
    'Показать на тексте, который вы ещё не видели, что вы можете сами находить, где именно находится нужная информация.',
  'Show on a second unseen passage that you can find where one piece of information sits, on your own.':
    'Показать на втором новом тексте, что вы можете сами находить, где именно находится нужная информация.',
  'Fill a gap with the exact words from the passage, inside the stated word limit.':
    'Заполнить пропуск точными словами из текста, не превышая указанное ограничение по количеству слов.',
  'Show on a passage you have not seen that you can complete a sentence with words taken straight from the passage, on your own.':
    'Показать на тексте, который вы ещё не видели, что вы можете сами дополнять предложение словами прямо из текста.',
  'Show on a second unseen passage that you can complete a sentence with words taken straight from the passage, on your own.':
    'Показать на втором новом тексте, что вы можете сами дополнять предложение словами прямо из текста.',
  'Complete a sentence with the ending the passage actually supports, not just one that fits grammatically.':
    'Дополнить предложение тем окончанием, которое действительно подтверждается текстом, а не просто грамматически подходит.',
  'Complete a table, note or summary with the exact words from the passage, inside the stated word limit.':
    'Дополнить таблицу, конспект или краткое изложение точными словами из текста, не превышая указанное ограничение по количеству слов.',
  'Show on a passage you have not seen that you can complete a table with words taken straight from the passage, on your own.':
    'Показать на тексте, который вы ещё не видели, что вы можете сами дополнять таблицу словами прямо из текста.',
  'Show on a second unseen passage that you can complete a table with words taken straight from the passage, on your own.':
    'Показать на втором новом тексте, что вы можете сами дополнять таблицу словами прямо из текста.',
  'Decide whether a statement is True, False or Not Given, by checking the passage rather than your own knowledge.':
    'Определить, верно ли утверждение это True, False или Not Given, опираясь на текст, а не на собственные знания.',
  'Show on a passage you have not seen that you can decide True, False or Not Given on your own.':
    'Показать на тексте, который вы ещё не видели, что вы можете сами правильно определять True, False или Not Given.',
  'Show on a second unseen passage that you can decide True, False or Not Given on your own.':
    'Показать на втором новом тексте, что вы можете сами правильно определять True, False или Not Given.',
  'Show on a second unseen passage that you can decide Yes, No or Not Given on your own.':
    'Показать на втором новом тексте, что вы можете сами правильно определять Yes, No или Not Given.',
  'Show on a passage you have not seen that you can decide Yes, No or Not Given on your own.':
    'Показать на тексте, который вы ещё не видели, что вы можете сами правильно определять Yes, No или Not Given.',
  "Decide whether a statement matches the writer's opinion, and tell that apart from a fact the passage never gives.":
    'Определить, совпадает ли утверждение с мнением автора, и отличить это от факта, которого в тексте вообще нет.',

  /* ---- Focused exercises, Speaking ---- */

  'Catch yourself before a silence runs long, and keep talking with a filler phrase instead of stopping, rather than pausing until the next idea arrives.':
    'Замечать паузу до того, как она затянется, и продолжать говорить с помощью связующей фразы вместо того, чтобы молчать в ожидании следующей мысли.',
  'Extend a Part 1 answer into two or three sentences using Answer, Reason, Example, instead of stopping after one short answer.':
    'Разворачивать ответ Part 1 в два-три предложения по схеме ответ, причина, пример, вместо того чтобы останавливаться после одной короткой фразы.',
  'Turn one minute of preparation into a real plan for the two-minute talk, covering every bullet point in a clear order.':
    'Превращать одну минуту подготовки в настоящий план для двухминутного рассказа, раскрывая каждый пункт карточки в понятном порядке.',
  'Tell a Part 2 story using more than one tense: the past for what happened, and the present for how things are now or how you feel about it looking back.':
    'Рассказывать историю Part 2, используя больше одного времени: прошедшее для того, что произошло, и настоящее для того, как обстоят дела сейчас или что вы об этом думаете сегодня.',
  'Give an opinion on a Part 3 question, justify it with a reason, and support the reason with a specific example, using the OREO structure.':
    'Высказывать мнение по вопросу Part 3, обосновывать его причиной и подкреплять причину конкретным примером по структуре OREO.',
  'Give a reason for your opinion using a complex sentence with a subordinate clause (because, since, as, although), instead of two short separate sentences.':
    'Обосновывать своё мнение сложноподчинённым предложением с придаточным (because, since, as, although), вместо двух коротких отдельных предложений.',
  'Paraphrase a Part 3 question in your own words before you answer it, rather than launching straight into your answer.':
    'Перефразировать вопрос Part 3 своими словами перед тем, как отвечать на него, а не сразу переходить к ответу.',
  'Compare two sides of a Part 3 question explicitly, using comparing language (compared with, whereas, on the other hand), rather than only answering one side.':
    'Явно сравнивать две стороны вопроса Part 3, используя слова для сравнения (compared with, whereas, on the other hand), а не отвечать только с одной стороны.',
  'Answer a familiar Part 1 topic using a wider range of vocabulary, reaching past the first word that comes to mind for a more specific one.':
    'Отвечать на знакомую тему Part 1, используя более широкий словарный запас, выбирая более точное слово вместо первого, что приходит на ум.',

  /* ---- Focused exercises, Writing ---- */

  'Correct a sentence with two do/make collocation slips, then write your own sentence using one of the same collocations correctly.':
    'Исправить предложение с двумя ошибками в коллокациях do или make, затем написать своё предложение с одной из тех же коллокаций, но уже правильно.',
  'Write a Task 2 body paragraph using precise topic vocabulary for the subject, rather than generic words that could belong to any essay.':
    'Написать основной абзац Task 2, используя точную тематическую лексику по теме, а не общие слова, которые подошли бы к любому эссе.',
  'Correct a sentence with three article slips, then write your own sentence using "the environment" correctly.':
    'Исправить предложение с тремя ошибками в артиклях, затем написать своё предложение со словосочетанием "the environment", использовав артикль правильно.',
  'Correct a sentence with a recurring subject-verb agreement slip, then write your own sentence using the same pattern correctly.':
    'Исправить предложение с повторяющейся ошибкой в согласовании подлежащего и сказуемого, затем написать своё предложение по той же модели, но уже правильно.',
  'Report several figures without repeating the same trend or quantity word: vary rose, fell, a large number of and similar with real synonyms.':
    'Сообщить несколько показателей, не повторяя одно и то же слово для тренда или количества: чередовать rose, fell, a large number of и подобные настоящими синонимами.',
  'Compare the categories directly, using comparative language (than, compared with, whereas, respectively), rather than describing each one in a separate sentence with no link between them.':
    'Сравнивать категории напрямую, используя сравнительные конструкции (than, compared with, whereas, respectively), а не описывать каждую в отдельном не связанном с другими предложении.',
  'Describe the trend with an accurate trend verb (rose, fell, grew, fluctuated, peaked, remained stable) and the exact figure that goes with it, never a figure with no verb to carry it.':
    'Описывать тренд точным глаголом (rose, fell, grew, fluctuated, peaked, remained stable) вместе с точной цифрой, никогда не оставляя цифру без глагола.',
  'Describe one change between the two maps using location and change language (was replaced by, was built, was demolished, changed into, to the north), never trend language borrowed from a chart.':
    'Описывать одно изменение между двумя картами, используя слова для места и изменений (was replaced by, was built, was demolished, changed into, to the north), а не язык трендов, взятый из диаграмм.',
  'Write an overview that states the main trends or the main features of the visual, with no specific figures, clearly separate from the detail.':
    'Написать overview, в котором указаны основные тренды или основные особенности визуального материала, без конкретных цифр, чётко отделённый от деталей.',
  'Describe the stages of the process in the order they happen, marking the sequence with words such as first, then, after that or finally, rather than leaving the order to the diagram alone.':
    'Описывать этапы процесса в том порядке, в котором они происходят, отмечая последовательность словами first, then, after that или finally, а не полагаясь только на саму схему.',
  'Report the two or three most significant features of the visual, grouping related figures together, rather than describing every number in turn.':
    'Сообщить две или три самые значимые особенности визуального материала, объединяя связанные цифры вместе, а не описывая каждое число по очереди.',
  'Connect two sentences so the second genuinely follows from the first, without opening it with a mechanical linker such as Firstly, Moreover or In addition.':
    'Связать два предложения так, чтобы второе действительно вытекало из первого, не начиная его механическим связующим словом вроде Firstly, Moreover или In addition.',
  'Combine two simple sentences into one accurate complex sentence, using a subordinate clause (because, although, since, while, when, if).':
    'Объединить два простых предложения в одно правильное сложноподчинённое, используя придаточное (because, although, since, while, when, if).',
  'Write a conclusion that restates your position and directly answers the question, in one or two sentences, with no new idea introduced this late.':
    'Написать заключение, в котором повторяется ваша позиция и даётся прямой ответ на вопрос, в одном или двух предложениях, без новой мысли на этом позднем этапе.',
  'Open the paragraph with a topic sentence that states its one idea, develop that idea, and close with a sentence that links back to the question.':
    'Начать абзац с topic sentence, которое задаёт его одну мысль, развить эту мысль и закрыть абзац предложением, которое возвращает к вопросу.',
  'Paraphrase the question in your introduction, in your own words, without copying its own wording.':
    'Перефразировать вопрос во вступлении своими словами, не копируя формулировку задания.',
  'State a clear position on the question and, in one sentence, say what each body paragraph will argue, both inside the introduction.':
    'Чётко заявить позицию по вопросу и в одном предложении указать, о чём будет каждый основной абзац, всё это во вступлении.',
  'Write a paragraph that uses more than one kind of sentence structure (a relative clause, a subordinate clause, a passive, a conditional), not the same simple shape repeated.':
    'Написать абзац, в котором использовано больше одного типа конструкции предложения (определительное придаточное, придаточное предложение, пассивный залог, условное предложение), а не одна и та же простая структура снова и снова.',
  'Make one claim, explain why it is true, and give one specific example, so the claim is not left to stand on its own.':
    'Выдвинуть один тезис, объяснить, почему он верен, и привести один конкретный пример, чтобы тезис не остался без подкрепления.',
};

/** Every RU_STRINGS entry, merged from the sections above. One flat map, the
    same shape as src/lib/tutor/ru.ts's RU_STRINGS, so learningText() has one
    place to look regardless of which of the three files a sentence came
    from. */
export const RU_STRINGS: Record<string, string> = {
  ...PLANNER_RU,
  ...STATUS_RU,
  ...SESSION_RU,
  ...CATALOG_RU,
};
