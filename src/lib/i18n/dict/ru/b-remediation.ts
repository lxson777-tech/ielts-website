/* Russian: the trial-honesty remediation (audit F02, F03 and F08, 29
   September 2026). Batch owner: Builder B. Nobody else edits this file.

   Covers: the shared trial summary in src/lib/trial/offer.ts, the trial
   test actions in src/lib/trial/hub.ts, the trial wording on the Tests
   (src/pages/tests/index.astro) and Practice (src/pages/trainers/index.astro)
   pages, the history lines on the trainer and Writing Checker pages, the
   trial page and Today (src/components/trial/TrialJoin.tsx, TrialHome.tsx),
   and "Your suggested three days" (src/lib/trial/routine.ts), including
   every sentence the questionnaire's generator (src/lib/journey-plan.ts)
   can hand it. tests/trial-routine.test.ts fails if one is missing.

   Paper names (Reading, Listening, Writing, Speaking), IELTS, Academic,
   Task 1, Task 2, Part 1, Band and Mr EZ stay in English inside the Russian
   sentences, per docs/I18N-GUIDE.md. */

export const strings: Record<string, string> = {
  /* The one description of the trial (src/lib/trial/offer.ts) */
  'Academic IELTS: the lessons and tests follow the Academic papers.':
    'Academic IELTS: уроки и тесты построены по экзамену Academic.',
  'Three days, with no payment card and nothing to cancel.':
    'Три дня, без банковской карты, и ничего не нужно отменять.',
  'One selected lesson in each section: Reading, Listening, Writing and Speaking.':
    'Один избранный урок в каждой части: Reading, Listening, Writing и Speaking.',
  'One test in each section: a full Reading test, a full Listening test, one Writing Task 2 essay, and a Speaking Part 1 interview of about five minutes.':
    'Один тест в каждой части: полный тест Reading, полный тест Listening, одно эссе Writing Task 2 и собеседование Speaking Part 1 примерно на пять минут.',
  'Five Mr EZ messages in each section, for the whole trial.':
    'Пять сообщений Mr EZ в каждой части на весь пробный период.',
  'Your trial includes one full Reading test. The other Reading papers come with full access.':
    'В пробный период входит один полный тест Reading. Остальные варианты Reading открываются с полным доступом.',
  'Your trial includes one full Listening test. The other Listening papers come with full access.':
    'В пробный период входит один полный тест Listening. Остальные варианты Listening открываются с полным доступом.',
  'Your trial includes one Writing Task 2 essay on a set question, with AI feedback. Task 1 and more questions come with full access.':
    'В пробный период входит одно эссе Writing Task 2 на заданную тему с отзывом ИИ. Task 1 и другие задания открываются с полным доступом.',
  'Your trial includes a Speaking Part 1 interview of about five minutes. The full three-part interview comes with full access.':
    'В пробный период входит собеседование Speaking Part 1 примерно на пять минут. Полное собеседование из трёх частей открывается с полным доступом.',

  /* Test actions (src/lib/trial/hub.ts) */
  'Start your {section} test': 'Начать тест {section}',
  'Start your 3-day trial': 'Начать 3 дня пробного доступа',
  'Start your trial to use your included {section} test.':
    'Начните пробный период, чтобы пройти включённый в него тест {section}.',
  'Sign in or create a free account to use your included {section} test.':
    'Войдите или создайте бесплатный аккаунт, чтобы пройти включённый тест {section}.',
  'Included in your trial. Starting it uses your one {section} test.':
    'Входит в пробный период. Начав его, вы используете свой единственный тест {section}.',
  'You have started your trial {section} test. It is still yours to finish.':
    'Вы начали пробный тест {section}. Его ещё можно закончить.',
  'You have used your trial’s {section} test. More tests come with full access.':
    'Вы уже использовали пробный тест {section}. Другие тесты открываются с полным доступом.',
  'Your trial has ended. Your results stay saved.': 'Пробный период закончился. Ваши результаты сохранены.',
  'This test is not open yet.': 'Этот тест пока закрыт.',

  /* Tests page, trial build */
  'Full timed tests, exactly like the real exam: no hints, no coaching, just the question and the clock. You get a band estimate and a full answer review afterwards, saved with your account.':
    'Полные тесты на время, как на настоящем экзамене: без подсказок и помощи, только задание и таймер. После теста вы получаете оценку балла и полный разбор ответов, и всё сохраняется в вашем аккаунте.',
  'Your attempts are saved with your account, so you see them on any device you sign in on.':
    'Ваши попытки сохраняются в аккаунте, поэтому вы видите их на любом устройстве, где входите в него.',
  'Only have 20 minutes? Open your included Reading lesson': 'Есть только 20 минут? Откройте свой урок Reading',
  'Learn how Listening Part 1 works in your included lesson': 'Узнайте, как устроена Listening Part 1, в своём уроке',
  '1 Task 2 essay': '1 эссе Task 2',
  'One set Task 2 question. No coaching aids.': 'Одно заданное задание Task 2. Без подсказок.',
  'New to Task 2? Read your included lesson first': 'Впервые пишете Task 2? Сначала прочитайте свой урок',
  'About 5 minutes': 'Около 5 минут',
  'Learn how Part 1 works in your included lesson': 'Узнайте, как устроена Part 1, в своём уроке',
  'In your trial': 'В пробном периоде',
  'Full access': 'Полный доступ',

  /* Practice page, trial build */
  'Guided practice comes with full access. Your trial includes one lesson and one test in each section, linked on each card below.':
    'Тренировка с подсказками открывается с полным доступом. В пробный период входят один урок и один тест в каждой части, ссылки на них есть в каждой карточке ниже.',
  'Open the included lesson': 'Открыть свой урок',
  'Take the included test': 'Пройти свой тест',

  /* Writing Checker, trial build */
  'Exam conditions: you get a task and a clock, nothing else. Write your answer and an AI examiner grades it against the four official IELTS Writing criteria.':
    'Условия экзамена: только задание и таймер. Напишите ответ, и ИИ-экзаменатор оценит его по четырём официальным критериям IELTS Writing.',
  'Saved with your account, so you see them on any device you sign in on.':
    'Сохраняются в аккаунте, поэтому вы видите их на любом устройстве, где входите в него.',
  'Still learning the format? Read how to answer Task 2 first': 'Ещё осваиваете формат? Сначала прочитайте, как отвечать на Task 2',

  /* Trial page */
  'Once you start a section’s test, it is your test for that section. If something fails on our side, it is not used.':
    'Начатый тест становится вашим тестом по этой части. Если что-то сломается на нашей стороне, он не расходуется.',

  /* Today: what the trial includes, and the suggested three days */
  'What your trial includes': 'Что входит в пробный период',
  'Your suggested three days': 'Ваши три дня: предложенный план',
  '{section}, about {minutes} minutes a day': '{section}, около {minutes} минут в день',
  'Open the lesson': 'Открыть урок',
  'Practise in the lesson': 'Потренироваться в уроке',
  'Short daily practice and a timed test need different time. Your {section} test is a separate sitting of about {minutes} minutes, so choose a day when you have that time.':
    'Короткая ежедневная практика и тест на время требуют разного времени. Тест {section} проходится отдельно и занимает около {minutes} минут, поэтому выберите день, когда у вас есть это время.',
  'Your {section} test takes about {minutes} minutes, so it fits inside a day of practice.':
    'Тест {section} занимает около {minutes} минут, поэтому он помещается в один день занятий.',
  'Day {day} · timed test, about {minutes} minutes': 'День {day} · тест на время, около {minutes} минут',
  'Day {day} · about {minutes} minutes': 'День {day} · около {minutes} минут',
  'Take away: {outcome}': 'Итог: {outcome}',
  'The practice questions are at the end of the lesson.': 'Практические вопросы находятся в конце урока.',
  'Use the method and the Band 8 example in the lesson as your support.':
    'Опирайтесь на метод и пример на Band 8 из урока.',
  'Use the practice questions in the lesson. Answer them out loud, then compare with the lesson’s advice.':
    'Используйте практические вопросы из урока. Отвечайте вслух, а потом сравните ответ с советами урока.',

  /* The questionnaire's three days (src/lib/journey-plan.ts), as the
     generator writes them */
  'Practise with support': 'Тренируйтесь с поддержкой',
  'Try something fresh': 'Попробуйте новое задание',
  'One method you can explain in your own words.': 'Один метод, который вы можете объяснить своими словами.',
  'One specific obstacle to focus on.': 'Одна конкретная трудность, над которой стоит работать.',
  'One revised answer or corrected mistake, with a reason.': 'Один исправленный ответ или ошибка, с объяснением почему.',
  'A fresh attempt to compare with your starting point.': 'Новая попытка, которую можно сравнить с точкой старта.',
  'Learn to recognise the same idea expressed in different words.': 'Научитесь узнавать одну и ту же мысль, выраженную другими словами.',
  'Find a question phrase and match it to evidence in a passage. Explain why your evidence supports the answer before moving on.':
    'Найдите фразу из вопроса и сопоставьте её с доказательством в тексте. Прежде чем идти дальше, объясните, почему это доказательство подтверждает ответ.',
  'Try a fresh passage question. Underline the evidence and explain why the other answers do not fit.':
    'Попробуйте вопрос к новому тексту. Подчеркните доказательство и объясните, почему другие ответы не подходят.',
  'Start with a short reading task. Note the exact moment you get stuck, then review the relevant method.':
    'Начните с короткого задания по чтению. Отметьте момент, когда вы застряли, а затем повторите нужный метод.',
  'Predict what type of information fills each gap before listening.':
    'Перед прослушиванием предскажите, какая информация должна стоять в каждом пропуске.',
  'Try a short listening exercise and note where you lose the thread. Replay that part and identify the words that signalled the answer.':
    'Выполните короткое упражнение на аудирование и отметьте, где вы теряете нить. Переслушайте этот фрагмент и найдите слова, которые подсказывали ответ.',
  'Try a fresh recording task. Predict the missing information first, then check the detail you heard.':
    'Попробуйте задание к новой записи. Сначала предскажите недостающую информацию, затем проверьте услышанную деталь.',
  'Start with a short listening task. Note the exact moment you get stuck, then review the relevant method.':
    'Начните с короткого задания на аудирование. Отметьте момент, когда вы застряли, а затем повторите нужный метод.',
  'Plan a clear position, two main points and supporting examples.':
    'Спланируйте ясную позицию, два главных довода и примеры в их поддержку.',
  'Write one focused paragraph with a clear point and example. Check how each sentence supports your point. Revise one weak sentence.':
    'Напишите один абзац с ясной мыслью и примером. Проверьте, как каждое предложение поддерживает мысль. Исправьте одно слабое предложение.',
  'Write a paragraph for a different topic without the guide. Check for a clear point, explanation and example.':
    'Напишите абзац на другую тему без подсказок. Проверьте, есть ли ясная мысль, объяснение и пример.',
  'Start with a short writing task. Note the exact moment you get stuck, then review the relevant method.':
    'Начните с короткого письменного задания. Отметьте момент, когда вы застряли, а затем повторите нужный метод.',
  'Use a reason and a specific example to develop a short answer.':
    'Развивайте короткий ответ с помощью причины и конкретного примера.',
  'Answer a speaking question out loud using a reason and an example. Review the speaking feedback, choose one focus and try another answer.':
    'Ответьте на вопрос вслух, используя причину и пример. Разберите отзыв о речи, выберите одну цель и попробуйте ответить ещё раз.',
  'Answer a fresh Part 1 question without the structure beside you. Compare how fully you develop your answer.':
    'Ответьте на новый вопрос Part 1 без подсказки со структурой. Сравните, насколько полно вы развиваете ответ.',
  'Start with a short speaking task. Note the exact moment you get stuck, then review the relevant method.':
    'Начните с короткого задания по говорению. Отметьте момент, когда вы застряли, а затем повторите нужный метод.',
};

strings['One full Reading test, one full Listening test, and one AI assessment: choose a Writing Task 2 essay or recorded Speaking (up to five minutes).'] = 'Один полный тест Reading, один полный тест Listening и одна проверка ИИ на выбор: эссе Writing Task 2 или запись Speaking до пяти минут.';
strings['Choose a Writing Task 2 essay for your one trial AI assessment, or choose recorded Speaking. More assessments come with paid access.'] = 'Выберите эссе Writing Task 2 для одной пробной проверки ИИ или выберите запись Speaking. Дополнительные проверки доступны после покупки.';
strings['Choose recorded Speaking (up to five minutes) for your one trial AI assessment, or choose Writing. Live interviews come with paid access.'] = 'Выберите запись Speaking до пяти минут для одной пробной проверки ИИ или выберите Writing. Устные собеседования доступны после покупки.';
strings['30 days of access. It ends on its own. Nothing renews, so you are never charged automatically.'] = 'Доступ на 30 дней. Он заканчивается сам. Автоматического продления и списания нет.';
strings['Each 30-day purchase includes 12 essay assessments, 6 recorded Speaking assessments (up to 5 minutes each), and 2 live interviews with feedback (up to 15 minutes each). Unused assessments expire with that purchase. Lessons remain free for everyone. Paid access includes unlimited Reading and Listening practice. Mr EZ includes 40 chat messages and 60 lesson-help requests per day.'] = 'За каждые 30 дней: 12 проверок эссе, 6 проверок записей Speaking до 5 минут и 2 устных собеседования с разбором до 15 минут. Неиспользованные проверки сгорают в конце срока. Уроки бесплатны для всех. Платный доступ включает практику Reading и Listening без ограничений. Mr EZ: 40 сообщений в чате и 60 запросов помощи в уроках в день.';
strings['Your trial AI assessment is used'] = 'Пробная проверка ИИ уже использована';
strings['Writing and recorded Speaking share one trial assessment. Your result is saved. You can still use your included lessons, Reading and Listening.'] = 'Для Writing и записи Speaking доступна одна общая пробная проверка. Ваш результат сохранён. Доступные уроки, Reading и Listening остаются открытыми.';
export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
strings['Lessons remain free. Choose paid access to continue practice and AI feedback.'] = 'Уроки остаются бесплатными. Выберите платный доступ, чтобы продолжить практику и получать разбор от ИИ.';

strings["All lesson explanations and worked examples are free, without an account."] = "Все объяснения и разобранные примеры в уроках бесплатны без регистрации.";
strings["Lessons are free. Put them into practice."] = "Уроки бесплатны. Примените знания на практике.";
strings["Read every lesson without an account. Sign in for practice and AI, with trial or paid access."] = "Читайте все уроки без регистрации. Для практики и ИИ войдите в аккаунт с пробным или платным доступом.";
strings["Open practice"] = "Открыть практику";
strings["Open my trial"] = "Открыть пробный доступ";
strings["Sign in to practise"] = "Войти для практики";
strings["Practice this skill"] = "Практика этого навыка";
strings["Free lesson, no account needed"] = "Бесплатный урок без регистрации";
strings["Browse free lessons"] = "Открыть бесплатные уроки";
strings["Writing task chart"] = "Изображение к заданию Writing";
