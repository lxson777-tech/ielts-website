/* The questionnaire's suggested three-day plan, in English and Russian.

   Every sentence is written whole for each language and each section; only
   the minutes are filled in. Paper names (Reading, Listening, Writing,
   Speaking) and Part numbers stay English in the Russian, as everywhere on
   the site. The sales page (src/scripts/question-journey.ts) passes the
   visitor's language; anything else that shows this plan passes its own. */

export type JourneyLocale = 'en' | 'ru';

interface SkillCopy {
  name: string;
  route: string;
  method: string;
  practice: string;
  review: string;
  /** Step one of the routine for a student who knows the method but gets stuck. */
  chooseTask: string;
  /** Day one for the same student. */
  warmup: string;
  /** Day three: a fresh attempt. */
  fresh: string;
}

const SKILLS: Record<JourneyLocale, Record<string, SkillCopy>> = {
  en: {
    speaking: {
      name: 'Speaking',
      route: '/trainers/speaking',
      method: 'Use a reason and a specific example to develop a short answer.',
      practice: 'Answer a speaking question out loud using a reason and an example.',
      review: 'Review the speaking feedback, choose one focus and try another answer.',
      chooseTask: 'Choose one speaking task and a single thing to improve.',
      warmup: 'Start with a short speaking task. Note the exact moment you get stuck, then review the relevant method.',
      fresh: 'Answer a fresh Part 1 question without the structure beside you. Compare how fully you develop your answer.',
    },
    writing: {
      name: 'Writing',
      route: '/trainers/writing',
      method: 'Plan a clear position, two main points and supporting examples.',
      practice: 'Write one focused paragraph with a clear point and example.',
      review: 'Check how each sentence supports your point. Revise one weak sentence.',
      chooseTask: 'Choose one writing task and a single thing to improve.',
      warmup: 'Start with a short writing task. Note the exact moment you get stuck, then review the relevant method.',
      fresh: 'Write a paragraph for a different topic without the guide. Check for a clear point, explanation and example.',
    },
    reading: {
      name: 'Reading',
      route: '/lessons/reading/paraphrase',
      method: 'Learn to recognise the same idea expressed in different words.',
      practice: 'Find a question phrase and match it to evidence in a passage.',
      review: 'Explain why your evidence supports the answer before moving on.',
      chooseTask: 'Choose one reading task and a single thing to improve.',
      warmup: 'Start with a short reading task. Note the exact moment you get stuck, then review the relevant method.',
      fresh: 'Try a fresh passage question. Underline the evidence and explain why the other answers do not fit.',
    },
    listening: {
      name: 'Listening',
      route: '/lessons/listening/section1',
      method: 'Predict what type of information fills each gap before listening.',
      practice: 'Try a short listening exercise and note where you lose the thread.',
      review: 'Replay that part and identify the words that signalled the answer.',
      chooseTask: 'Choose one listening task and a single thing to improve.',
      warmup: 'Start with a short listening task. Note the exact moment you get stuck, then review the relevant method.',
      fresh: 'Try a fresh recording task. Predict the missing information first, then check the detail you heard.',
    },
  },
  ru: {
    speaking: {
      name: 'Speaking',
      route: '/trainers/speaking',
      method: 'Развивайте короткий ответ с помощью причины и конкретного примера.',
      practice: 'Ответьте на вопрос Speaking вслух, используя причину и пример.',
      review: 'Посмотрите разбор ответа, выберите одну цель и попробуйте ответить ещё раз.',
      chooseTask: 'Выберите одно задание Speaking и одну вещь, которую хотите улучшить.',
      warmup: 'Начните с короткого задания Speaking. Отметьте момент, где вы застряли, и повторите нужный метод.',
      fresh: 'Ответьте на новый вопрос Part 1 без подсказки со структурой. Сравните, насколько полно вы развиваете ответ.',
    },
    writing: {
      name: 'Writing',
      route: '/trainers/writing',
      method: 'Спланируйте ясную позицию, два главных довода и примеры в их поддержку.',
      practice: 'Напишите один абзац с ясной мыслью и примером.',
      review: 'Проверьте, как каждое предложение поддерживает мысль. Исправьте одно слабое предложение.',
      chooseTask: 'Выберите одно задание Writing и одну вещь, которую хотите улучшить.',
      warmup: 'Начните с короткого задания Writing. Отметьте момент, где вы застряли, и повторите нужный метод.',
      fresh: 'Напишите абзац на другую тему без подсказок. Проверьте, есть ли ясная мысль, объяснение и пример.',
    },
    reading: {
      name: 'Reading',
      route: '/lessons/reading/paraphrase',
      method: 'Научитесь узнавать одну и ту же мысль, выраженную другими словами.',
      practice: 'Найдите фразу из вопроса и сопоставьте её с доказательством в тексте.',
      review: 'Прежде чем идти дальше, объясните, почему это доказательство подтверждает ответ.',
      chooseTask: 'Выберите одно задание Reading и одну вещь, которую хотите улучшить.',
      warmup: 'Начните с короткого задания Reading. Отметьте момент, где вы застряли, и повторите нужный метод.',
      fresh: 'Попробуйте вопрос к новому тексту. Подчеркните доказательство и объясните, почему другие ответы не подходят.',
    },
    listening: {
      name: 'Listening',
      route: '/lessons/listening/section1',
      method: 'Перед прослушиванием предскажите, какая информация должна стоять в каждом пропуске.',
      practice: 'Выполните короткое упражнение Listening и отметьте, где вы теряете нить.',
      review: 'Переслушайте этот фрагмент и найдите слова, которые подсказывали ответ.',
      chooseTask: 'Выберите одно задание Listening и одну вещь, которую хотите улучшить.',
      warmup: 'Начните с короткого задания Listening. Отметьте момент, где вы застряли, и повторите нужный метод.',
      fresh: 'Попробуйте задание к новой записи. Сначала предскажите недостающую информацию, затем проверьте услышанную деталь.',
    },
  },
};

const DAY_COPY: Record<JourneyLocale, { titles: [string, string, string]; methodOutcome: string; obstacleOutcome: string; practiceOutcome: string; freshOutcome: string; step: string }> = {
  en: {
    titles: ['Find your starting point', 'Practise with support', 'Try something fresh'],
    methodOutcome: 'One method you can explain in your own words.',
    obstacleOutcome: 'One specific obstacle to focus on.',
    practiceOutcome: 'One revised answer or corrected mistake, with a reason.',
    freshOutcome: 'A fresh attempt to compare with your starting point.',
    step: '{minutes} min: {text}',
  },
  ru: {
    titles: ['Найдите точку старта', 'Тренируйтесь с поддержкой', 'Попробуйте новое задание'],
    methodOutcome: 'Один метод, который вы можете объяснить своими словами.',
    obstacleOutcome: 'Одна конкретная трудность, над которой стоит работать.',
    practiceOutcome: 'Один исправленный ответ или ошибка, с объяснением почему.',
    freshOutcome: 'Новая попытка, которую можно сравнить с точкой старта.',
    step: '{minutes} мин: {text}',
  },
};

/** The English copy, kept under its original name for existing callers. */
export const journeySkills: Record<string, { name: string; route: string; method: string; practice: string; review: string }> = SKILLS.en;

/** A section's copy in one language. */
export function journeySkill(skill: string, locale: JourneyLocale = 'en'): SkillCopy {
  return SKILLS[locale][skill] ?? SKILLS.en[skill]!;
}

export type JourneyAnswers={band:string;skill:string;focus:string;time:string};
export function validJourney(value:Record<string,unknown>): value is JourneyAnswers {
 return ['7','7.5','8'].includes(String(value.band)) && Object.hasOwn(journeySkills,String(value.skill)) && ['method','confidence'].includes(String(value.focus)) && ['15','30','60'].includes(String(value.time));
}

function step(locale: JourneyLocale, minutes: number, text: string): string {
 return DAY_COPY[locale].step.replace('{minutes}', String(minutes)).replace('{text}', text);
}

export function journeySteps(answers:JourneyAnswers, locale: JourneyLocale = 'en'){
 const skill=journeySkill(answers.skill, locale),time=Number(answers.time);
 return answers.focus==='method'
  ?[step(locale,time===15?5:time===30?10:20,skill.method),step(locale,time===15?7:time===30?15:30,skill.practice),step(locale,time===15?3:time===30?5:10,skill.review)]
  :[step(locale,time===15?2:time===30?5:10,skill.chooseTask),step(locale,time===15?10:time===30?20:40,skill.practice),step(locale,time===15?3:time===30?5:10,skill.review)];
}

/** Which kind of step a day is, under the free-account model (Alex, 1 October
    2026): day one is the lesson, open to every free account; days two and
    three are practice and feedback, which come with practice and guidance.
    The sales page labels each day with it. */
export type JourneyAccess = 'free' | 'paid';

export function journeyDays(answers: JourneyAnswers, locale: JourneyLocale = 'en') {
 const skill = journeySkill(answers.skill, locale);
 const copy = DAY_COPY[locale];
 const method = answers.focus === 'method';
 const days: { title: string; text: string; outcome: string; access: JourneyAccess }[] = [
  {title:copy.titles[0],text:method?skill.method:skill.warmup,outcome:method?copy.methodOutcome:copy.obstacleOutcome,access:'free'},
  {title:copy.titles[1],text:`${skill.practice} ${skill.review}`,outcome:copy.practiceOutcome,access:'paid'},
  {title:copy.titles[2],text:skill.fresh,outcome:copy.freshOutcome,access:'paid'},
 ];
 return days.map((day,index)=>({...day,day:index+1,minutes:Number(answers.time)}));
}

/** The query string that carries the four answers
    (`?journey=1&band=7&skill=writing&focus=method&time=30`), read back by
    questionnaireFromSearch in src/lib/trial/offer.ts. The sales page puts it
    on the address the student lands on after sign-up and the profile
    (`/sign-up?next=/dashboard?journey=1&...`), so the answers survive the
    whole round trip, email confirmation and Google sign-in included. The
    answers are a suggested starting point, never an assessed level.
    tests/journey-plan.test.ts checks the reader reads exactly what this
    writes. */
export function journeyQuery(answers: JourneyAnswers): string {
 const params = new URLSearchParams({ journey: '1', band: answers.band, skill: answers.skill, focus: answers.focus, time: answers.time });
 return `?${params.toString()}`;
}

/** The old name, from when the answers went to the trial page. */
export const trialQuery = journeyQuery;

/** Where the questionnaire's sign-up link sends a new student once the
    account and profile exist: the dashboard, with the answers. */
export const JOURNEY_LANDING = '/dashboard';
