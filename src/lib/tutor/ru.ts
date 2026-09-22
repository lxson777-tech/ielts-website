/* Russian for the sentences Mr EZ's CODE writes, not the ones his model
   writes.

   Why this is not in the site's dictionary (src/lib/i18n/dict/ru/*). That
   dictionary is lazy: a chunk fetched by the browser, merged into memory,
   read through getLocale(). None of that exists inside a Cloudflare Worker,
   and the same modules (insights, recommend, catalog, week, units) run in
   both places. So the shared layer gets its own map: small, synchronous,
   dependency-free, and importable by the Worker bundle without dragging in
   a loader, a fetch or localStorage. See docs/I18N-GUIDE.md.

   Three rules this file lives by.

   1. THE ENGLISH IS THE KEY, exactly as in the site dictionary. A missing
      entry falls back to its own English text, so nothing can ever render
      blank or as a key name.
   2. WHOLE SENTENCES ONLY. Russian word order and case do not survive
      concatenation, so every entry is a complete sentence (or a complete
      counted phrase) with {named} holes, never a fragment glued to another
      fragment. Counts go through tutorCount, which picks the Russian form
      with Intl.PluralRules.
   3. ENGLISH STAYS ENGLISH WHERE THE EXAM DOES. Question type names, the
      four paper names, criterion names, Part / Task / Passage and IELTS
      itself are variables filled with English and are left English inside
      the Russian sentence. A student has to recognise those exact words on
      the real paper.

   What is NOT here: the FACTS blocks sent to the model (they are English on
   purpose, the model reads English and writes Russian), lesson titles and
   unit names (those live in the site's own dictionary, which the Worker
   cannot read), and anything the model itself writes. */

import type { Locale } from '../i18n/locale';

export type TextVars = Record<string, string | number>;

/** The two English forms a counted phrase is written with at the call site.
    Russian supplies the other two through RU_PLURALS. Mirrors CountForms in
    src/lib/i18n/translate.ts deliberately rather than importing it, so this
    module keeps no runtime dependency on the site's i18n layer. */
export interface CountForms {
  one: string;
  other: string;
}

export interface PluralForms {
  one: string;
  few: string;
  many: string;
  other: string;
}

/** Fill `{name}` holes. Unknown names are left visible rather than blanked,
    so a typo shows up as `{nmae}` instead of vanishing. Same behaviour as
    interpolate() in src/lib/i18n/translate.ts. */
function fill(text: string, vars?: TextVars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole,
  );
}

/** One sentence written by code, in the student's language.
    `english` is both the text and the lookup key. */
export function tutorText(locale: Locale, english: string, vars?: TextVars): string {
  if (locale === 'en') return fill(english, vars);
  const hit = RU_STRINGS[english];
  return fill(hit && hit.length > 0 ? hit : english, vars);
}

let ruRules: Intl.PluralRules | null = null;

function russianCategory(n: number): string {
  ruRules ??= new Intl.PluralRules('ru');
  return ruRules.select(n);
}

/** A counted phrase. English has two forms, Russian four; the call site
    writes the two English ones and this picks the right Russian one.
    `{n}` is always available on top of anything in `vars`. */
export function tutorCount(locale: Locale, n: number, forms: CountForms, vars?: TextVars): string {
  const withCount: TextVars = { n, ...vars };
  if (locale === 'en') return fill(n === 1 ? forms.one : forms.other, withCount);

  // Keyed by the English plural (`other`) form, exactly like the site's own
  // plural dictionary, so one entry covers a phrase whatever its singular
  // happens to look like.
  const entry = RU_PLURALS[forms.other];
  if (!entry) return fill(n === 1 ? forms.one : forms.other, withCount);

  const category = russianCategory(n);
  const chosen =
    (category === 'one' && entry.one) ||
    (category === 'few' && entry.few) ||
    (category === 'many' && entry.many) ||
    entry.other ||
    forms.other;
  return fill(chosen, withCount);
}

/** A date a student reads, written the way their language writes one. The
    input is an ISO instant or an ISO date key; only the calendar date is
    ever shown. Falls back to the plain yyyy-mm-dd if Intl refuses it, which
    is readable rather than empty. */
export function formatDate(iso: string, locale: Locale): string {
  const dateKey = iso.slice(0, 10);
  const parsed = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return dateKey;
  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(parsed);
  } catch {
    return dateKey;
  }
}

/* ── The map ───────────────────────────────────────────────────────────────
   Grouped by the file that writes the sentence, so an English edit in one
   of those files has an obvious place to land here. Never an em dash or an
   en dash, in either language. */

export const RU_STRINGS: Record<string, string> = {
  /* ── src/lib/tutor/insights.ts: what the counting is willing to say ──
     {type} is an official question type name and {skill} is a paper name,
     both English on purpose. */
  '{type} in {skill} is consistently the weakest question type.':
    '{type} в {skill}: это стабильно самый слабый тип вопросов.',
  '{type} in {skill} is consistently weak too, though not as weak as the type above.':
    '{type} в {skill} тоже стабильно слабый тип, хотя и не настолько, как тип выше.',
  '{type} in {skill} went badly the one time it came up. Not enough evidence yet to call it a pattern.':
    '{type} в {skill} прошёл плохо в тот единственный раз, когда встретился. Данных пока мало, чтобы назвать это закономерностью.',
  '{type} in {skill} is reliably strong.': '{type} в {skill} стабильно сильный тип.',
  '{criterion} is the lowest {skill} criterion most times it is marked (average band {band}).':
    '{criterion} чаще всего оказывается самым низким критерием в {skill} (средний балл {band}).',
  '{criterion} was the lowest criterion in the one {skill} piece marked so far (band {band}). One piece is not a pattern.':
    '{criterion} оказался самым низким критерием в единственной проверенной работе по {skill} (балл {band}). Одна работа не закономерность.',
  'No {skill} result recorded yet, so there is no band estimate for that paper.':
    'По {skill} результатов пока нет, поэтому примерного балла за эту часть тоже нет.',
  'Study days have been consistent over the last fortnight.':
    'Последние две недели занятия шли стабильно.',

  /* ── src/lib/tutor/recommend.ts: why this activity, with no model ──
     {claim} and {evidence} are themselves whole translated pieces from the
     observation above, dropped into a translated sentence. */
  '{claim} You have not worked through the lesson on it yet ({evidence}).':
    '{claim} Урок по этой теме вы ещё не прошли ({evidence}).',
  '{claim} These drills are filtered to exactly that type ({evidence}).':
    '{claim} Эти тренировки отфильтрованы ровно по этому типу ({evidence}).',
  'Setting a target band (and an exam date if you have one) is what makes every other suggestion here specific rather than generic.':
    'Целевой балл (и дата экзамена, если она есть) делает все остальные советы здесь конкретными, а не общими.',
  '{claim} Another marked attempt is the fastest way to move it ({evidence}).':
    '{claim} Ещё одна проверенная работа сдвинет это быстрее всего ({evidence}).',
  "Nothing is on record yet, so this is where today's session starts: {objective}":
    'Пока ничего не записано, поэтому сегодняшнее занятие начинается с этого: {objective}',
  '{claim} One attempt gives you a starting point to work from.':
    '{claim} Одна попытка даст точку отсчёта, от которой можно работать.',
  'Every lesson is done, so the useful work now is full papers under exam timing.':
    'Все уроки пройдены, поэтому дальше полезнее всего полные работы в режиме экзамена.',
  /* {objective} is the activity's own objective sentence and arrives in
     English, for the same reason a lesson title does: it lives in the
     catalogue, which the Worker reads and the site's lazy dictionary
     cannot. The sentence around it is Russian. */
  "It is the next step in today's session, which is working on this: {objective}":
    'Это следующий шаг сегодняшнего занятия, которое посвящено вот чему: {objective}',
  'The exam date on your plan has passed. Set a new date or change the goal, and the plan will rebuild around it.':
    'Дата экзамена в вашем плане уже прошла. Укажите новую дату или измените цель, и план перестроится под неё.',
  'It follows directly from this result: {blurb}': 'Это прямо следует из этого результата: {blurb}',

  /* ── src/lib/tutor/catalog.ts: the label and the one-line description on
     a recommendation card. Lesson titles are NOT here: they come from the
     course registry and are translated by the site's own dictionary, which
     the Worker cannot read. */
  'A full Reading test under exam timing': 'Полный тест Reading в режиме экзамена',
  'Forty questions in sixty minutes, scored with a band estimate.':
    'Сорок вопросов за шестьдесят минут, с примерным баллом в конце.',
  'A full Listening test under exam timing': 'Полный тест Listening в режиме экзамена',
  'Forty questions across four parts, scored with a band estimate.':
    'Сорок вопросов в четырёх частях, с примерным баллом в конце.',
  'A complete mock exam': 'Полный пробный экзамен',
  'All papers back to back, the closest thing here to the real day.':
    'Все части подряд, ближе всего к настоящему дню экзамена.',
  'Short Reading drills': 'Короткие тренировки Reading',
  'One passage at a time, filterable by question type.':
    'По одному тексту за раз, с фильтром по типу вопросов.',
  'Short Listening drills': 'Короткие тренировки Listening',
  'One section at a time, filterable by question type.':
    'По одной части за раз, с фильтром по типу вопросов.',
  'Write an essay and get an AI band': 'Написать эссе и получить балл от ИИ',
  'A coached Task 1 or Task 2 with per-criterion feedback.':
    'Task 1 или Task 2 с подсказками и разбором по каждому критерию.',
  'Record a Speaking answer and get an AI band': 'Записать ответ Speaking и получить балл от ИИ',
  'Part 1, 2 or 3, marked on the four official criteria.':
    'Part 1, 2 или 3, с оценкой по четырём официальным критериям.',
  'A live mock interview with the AI examiner': 'Живое пробное интервью с ИИ-экзаменатором',
  'A spoken interview end to end, with a band report afterwards.':
    'Устное интервью целиком, с отчётом по баллам в конце.',
  'Vocabulary flashcards': 'Карточки со словами',
  'Spaced review of the words due today.': 'Повторение слов, которые пора повторить сегодня.',
  'Model answers': 'Образцовые ответы',
  'Band 8 and 9 answers with the examiner reasoning beside them.':
    'Ответы на 8 и 9 баллов с рассуждением экзаменатора рядом.',
  'What each band actually needs': 'Что на самом деле нужно для каждого балла',
  'The official descriptors translated into what to do differently.':
    'Официальные дескрипторы, переведённые в конкретные действия.',
  'Your progress report': 'Ваш отчёт о прогрессе',
  'Every result so far, by paper and by question type.':
    'Все результаты, по частям экзамена и по типам вопросов.',
  'Study plan settings': 'Настройки учебного плана',
  'Target band, exam date, how many minutes a day.':
    'Целевой балл, дата экзамена, сколько минут в день.',
  '{type} drills in {skill}': 'Тренировки {type} в {skill}',
  'Short {skill} drills filtered to {type} questions.':
    'Короткие тренировки {skill}, отфильтрованные по вопросам {type}.',

  /* ── src/lib/tutor/week.ts: the weekly review with no model ── */
  'No study activity was recorded last week. That happens sometimes, and this week is a fresh start.':
    'На прошлой неделе занятий не записано. Так бывает, и эта неделя начинается с чистого листа.',
  'No study activity has been recorded this week yet. There is still time.':
    'На этой неделе занятий пока не записано. Время ещё есть.',
  'Your estimated {skill} band this week is {after}, compared with an estimated {before} before this week.':
    'Ваш примерный балл по {skill} на этой неделе {after}, против примерного {before} до начала недели.',
  'Your estimated {skill} band this week is {after}.':
    'Ваш примерный балл по {skill} на этой неделе {after}.',
  /* WP23, 2026-09-22: quotes PersonalPlanV1.history's own summary sentence
     verbatim, so the quotation marks matter as much in Russian as in
     English (the plan changed, not the review). */
  'Your plan changed: "{summary}"': 'Ваш план изменился: «{summary}»',

  /* ── src/lib/tutor/units.ts: the note at the top of a course unit ──
     {unit} is a unit name from the course registry, so it arrives English
     here and is translated by the site's dictionary when the browser
     renders it. */
  'This unit matters for you right now: {claim} ({evidence}).':
    'Этот раздел важен для вас прямо сейчас: {claim} ({evidence}).',
  'You finished all {count} in {unit}.': 'Вы прошли все {count} в разделе {unit}.',
  'That took {days}.': 'На это ушло {days}.',
  /* Since 2026-09-22: no longer "Next up" (a route). Names the following
     unit in the library only, never as an instruction. */
  '{unit} is next in the library, if you want to keep browsing it in order.':
    '{unit} следующий раздел в библиотеке, если хотите продолжить просматривать по порядку.',
  'That was the last unit in the library.': 'Это был последний раздел библиотеки.',

  /* ── workers/mr-ez/src/index.ts: the clearly-labelled simulation used in
     local development. Russian so the interface can be clicked through in
     Russian; still unmistakably a simulation in both languages. */
  'Simulated tutor reply (no AI was called).':
    'Симулированный ответ репетитора (запрос к ИИ не отправлялся).',
  'Next I would do this: {label}. {reason}': 'Дальше я бы сделал так: {label}. {reason}',
  'Reviewing {count} from {title}.': 'Разбираем {count} из работы {title}.',
  'This is a review of answers, not a mark, so it says nothing about a band.':
    'Это разбор ответов, а не оценка, поэтому о балле здесь ничего не говорится.',
  'You are working towards {goal}, and there are results on record.':
    'Вы идёте к цели: {goal}, и результаты в истории есть.',
  'You are working towards {goal}, and there are no results on record yet, so there is nothing to estimate from.':
    'Вы идёте к цели: {goal}, и результатов в истории пока нет, поэтому оценивать пока не по чему.',
  'band {band}': 'балл {band}',
  'a target band you have not set yet': 'целевой балл, который вы ещё не задали',
  "Every band on this platform is an estimate from its own AI marking, not an official IELTS result.":
    'Любой балл на этой платформе получен по её собственной ИИ-проверке и не является официальным результатом IELTS.',
  'There is no assessment attached to this request.': 'К этому запросу не приложен ни один результат.',
  'Your {kind} result from {date} came out at an estimated band {band}.':
    'Ваш результат ({kind}) от {date}: примерный балл {band}.',
  'You asked: "{message}"': 'Вы спросили: "{message}"',
  'What the record actually shows: {evidence}': 'Что на самом деле показывает история: {evidence}',
  'The record does not yet hold enough work to say anything about strengths or weaknesses.':
    'В истории пока недостаточно работы, чтобы говорить о сильных или слабых сторонах.',
  'With a real model configured, Mr EZ would answer the question itself here, using the same record.':
    'С настоящей моделью Mr EZ ответил бы здесь на сам вопрос, опираясь на ту же историю.',

  /* ── src/lib/learning/ai-prompt.ts: what the three learning tasks say
     when no model answered them. Every one of these is a real answer built
     from the lesson's own words or the exercise's own objective, never an
     apology, and none of them claims anything was judged. {sentence},
     {explanation} and {objective} arrive in English, like every other piece
     of exam material inside a Russian sentence. */
  'A timed paper is running, so there are no hints or answers until it is finished. Mr EZ will go through it with you the moment the timer stops.':
    'Идёт работа на время, поэтому подсказок и ответов не будет, пока она не закончится. Mr EZ разберёт её с вами, как только таймер остановится.',
  'Mr EZ is not answering right now, so here is the example the lesson itself gives under "{heading}": {sentence}':
    'Mr EZ сейчас не отвечает, поэтому вот пример, который даёт сам урок в разделе "{heading}": {sentence}',
  'Mr EZ is not answering right now, and this part of the lesson has no worked example in it. The sentence that carries the method is this one, under "{heading}": {sentence}':
    'Mr EZ сейчас не отвечает, а в этой части урока разобранного примера нет. Вот предложение, в котором лежит сам способ, из раздела "{heading}": {sentence}',
  'Mr EZ is not answering right now. You have already had a go, so here is the explanation this question comes with: {explanation} The lesson puts it this way, under "{heading}": {sentence}':
    'Mr EZ сейчас не отвечает. Вы уже попробовали сами, поэтому вот объяснение, которое идёт с этим вопросом: {explanation} А урок говорит об этом так, в разделе "{heading}": {sentence}',
  'Mr EZ is not answering right now, so here is the sentence from "{heading}" that decides this one: {sentence}':
    'Mr EZ сейчас не отвечает, поэтому вот предложение из раздела "{heading}", которое решает этот вопрос: {sentence}',
  'Nothing was submitted, so there is nothing to look at yet.':
    'Ничего не отправлено, поэтому смотреть пока не на что.',
  'Your writing was saved, but nothing looked at it this time: Mr EZ is not answering right now. This is not a judgement of your work.':
    'Ваш текст сохранён, но в этот раз его никто не разобрал: Mr EZ сейчас не отвечает. Это не оценка вашей работы.',
  'What this exercise was asking for: {objective}': 'Вот о чём было это задание: {objective}',
  'Read your own answer against that one sentence and mark the exact words that meet it. Ask again later and Mr EZ will go through it with you.':
    'Перечитайте свой ответ рядом с этим одним предложением и отметьте те самые слова, которые ему отвечают. Спросите позже, и Mr EZ разберёт это с вами.',
  'This is the next step your plan already chose, and it still fits today.':
    'Это следующий шаг, который ваш план уже выбрал, и он по-прежнему подходит на сегодня.',
};

export const RU_PLURALS: Record<string, PluralForms> = {
  /* ── src/lib/tutor/insights.ts: the evidence behind a claim ── */
  '{correct} of {total} correct across {n} sittings': {
    one: '{correct} из {total} верно за {n} раз',
    few: '{correct} из {total} верно за {n} раза',
    many: '{correct} из {total} верно за {n} раз',
    other: '{correct} из {total} верно за {n} раза',
  },
  'lowest in {lowest} of {n} marked pieces': {
    one: 'самый низкий в {lowest} из {n} проверенной работы',
    few: 'самый низкий в {lowest} из {n} проверенных работ',
    many: 'самый низкий в {lowest} из {n} проверенных работ',
    other: 'самый низкий в {lowest} из {n} проверенных работ',
  },
  '{n} attempts': {
    one: '{n} попытка',
    few: '{n} попытки',
    many: '{n} попыток',
    other: '{n} попытки',
  },
  '{n} active days in the last 14': {
    one: '{n} активный день за последние 14',
    few: '{n} активных дня за последние 14',
    many: '{n} активных дней за последние 14',
    other: '{n} активных дня за последние 14',
  },

  /* ── src/lib/tutor/week.ts ──
     The whole sentence is the counted phrase, because Russian inflects the
     day word inside it. {minutes} arrives as an already-counted phrase of
     its own ("100 минут"), which is a noun phrase in both languages and
     safe to drop in. */
  'Last week you studied on {n} days out of {planned} planned, for {minutes} in total.': {
    one: 'На прошлой неделе вы занимались {n} день из {planned} запланированных, всего {minutes}.',
    few: 'На прошлой неделе вы занимались {n} дня из {planned} запланированных, всего {minutes}.',
    many: 'На прошлой неделе вы занимались {n} дней из {planned} запланированных, всего {minutes}.',
    other: 'На прошлой неделе вы занимались {n} дня из {planned} запланированных, всего {minutes}.',
  },
  'Last week you studied on {n} days, for {minutes} in total.': {
    one: 'На прошлой неделе вы занимались {n} день, всего {minutes}.',
    few: 'На прошлой неделе вы занимались {n} дня, всего {minutes}.',
    many: 'На прошлой неделе вы занимались {n} дней, всего {minutes}.',
    other: 'На прошлой неделе вы занимались {n} дня, всего {minutes}.',
  },
  'So far this week you studied on {n} days out of {planned} planned, for {minutes} in total.': {
    one: 'На этой неделе вы пока занимались {n} день из {planned} запланированных, всего {minutes}.',
    few: 'На этой неделе вы пока занимались {n} дня из {planned} запланированных, всего {minutes}.',
    many: 'На этой неделе вы пока занимались {n} дней из {planned} запланированных, всего {minutes}.',
    other: 'На этой неделе вы пока занимались {n} дня из {planned} запланированных, всего {minutes}.',
  },
  'So far this week you studied on {n} days, for {minutes} in total.': {
    one: 'На этой неделе вы пока занимались {n} день, всего {minutes}.',
    few: 'На этой неделе вы пока занимались {n} дня, всего {minutes}.',
    many: 'На этой неделе вы пока занимались {n} дней, всего {minutes}.',
    other: 'На этой неделе вы пока занимались {n} дня, всего {minutes}.',
  },
  '{n} minutes': {
    one: '{n} минута',
    few: '{n} минуты',
    many: '{n} минут',
    other: '{n} минуты',
  },
  'You completed {n} lessons.': {
    one: 'Вы прошли {n} урок.',
    few: 'Вы прошли {n} урока.',
    many: 'Вы прошли {n} уроков.',
    other: 'Вы прошли {n} урока.',
  },
  'You recorded {n} practice attempts.': {
    one: 'Вы записали {n} тренировочную попытку.',
    few: 'Вы записали {n} тренировочные попытки.',
    many: 'Вы записали {n} тренировочных попыток.',
    other: 'Вы записали {n} тренировочные попытки.',
  },

  /* ── src/lib/tutor/units.ts ── */
  '{n} lessons': {
    one: '{n} урок',
    few: '{n} урока',
    many: '{n} уроков',
    other: '{n} урока',
  },
  '{n} steps': {
    one: '{n} шаг',
    few: '{n} шага',
    many: '{n} шагов',
    other: '{n} шага',
  },
  '{n} days': {
    one: '{n} день',
    few: '{n} дня',
    many: '{n} дней',
    other: '{n} дня',
  },

  /* ── workers/mr-ez/src/index.ts: the next step after a set of wrong
     answers, and the simulated review. */
  '{n} of these wrong answers are {type}, and the lesson that teaches it has not been read yet.': {
    one: '{n} из этих неверных ответов относится к {type}, а урок по этому типу ещё не прочитан.',
    few: '{n} из этих неверных ответов относятся к {type}, а урок по этому типу ещё не прочитан.',
    many: '{n} из этих неверных ответов относятся к {type}, а урок по этому типу ещё не прочитан.',
    other: '{n} из этих неверных ответов относятся к {type}, а урок по этому типу ещё не прочитан.',
  },
  '{n} of these wrong answers are {type}, and these drills are filtered to exactly that type.': {
    one: '{n} из этих неверных ответов относится к {type}, а эти тренировки отфильтрованы ровно по этому типу.',
    few: '{n} из этих неверных ответов относятся к {type}, а эти тренировки отфильтрованы ровно по этому типу.',
    many: '{n} из этих неверных ответов относятся к {type}, а эти тренировки отфильтрованы ровно по этому типу.',
    other: '{n} из этих неверных ответов относятся к {type}, а эти тренировки отфильтрованы ровно по этому типу.',
  },
  '{n} wrong answers': {
    one: '{n} неверный ответ',
    few: '{n} неверных ответа',
    many: '{n} неверных ответов',
    other: '{n} неверных ответа',
  },
  '{n} of them were left blank.': {
    one: '{n} из них оставлен пустым.',
    few: '{n} из них оставлены пустыми.',
    many: '{n} из них оставлены пустыми.',
    other: '{n} из них оставлены пустыми.',
  },
};
