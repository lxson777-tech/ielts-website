/* Russian: the three-day trial.
   Batch owner: the trial integration (23 September 2026). Nobody else edits
   this file.

   Covers: src/components/trial/*, the trial lines in
   src/components/TestPlayer.tsx, src/components/WritingTester.tsx and
   src/components/tutor/MrEzPanel.tsx, and the trial refusals in
   src/lib/tutor/errors.ts.

   Paper names (Reading, Listening, Writing, Speaking), IELTS, Mr EZ and the
   tenge amounts stay as they are inside the Russian sentences, per
   docs/I18N-GUIDE.md. Short words that already have entries elsewhere
   (Sign in, Try again, Start test, Open lesson, and so on) are not repeated.

   See docs/I18N-GUIDE.md for the style rules and the glossary. */

export const strings: Record<string, string> = {
  /* Joining */
  'Your next chapter': 'Ваша следующая глава',
  'starts with a small step.': 'начинается с маленького шага.',
  'Try your study space for three days. No payment card needed.': 'Попробуйте учебное пространство три дня. Банковская карта не нужна.',
  'A selected introduction to each IELTS section': 'Вводный урок по каждой части IELTS',
  'One test each for Reading, Listening, Writing and Speaking': 'По одному тесту для Reading, Listening, Writing и Speaking',
  '{n} Mr EZ messages per section across your trial': '{n} сообщений Mr EZ на каждую часть за весь пробный период',
  'Create a free account': 'Создать бесплатный аккаунт',
  'I already have an account': 'У меня уже есть аккаунт',
  'The trial belongs to your account, so it is the same on every device and signing out never restarts it.':
    'Пробный период привязан к вашему аккаунту: он одинаков на любом устройстве, а выход из аккаунта не запускает его заново.',
  'Mr EZ, your AI study companion': 'Mr EZ, ваш помощник в учёбе на основе ИИ',
  'A little guidance, right beside you.': 'Немного подсказок, всегда рядом.',
  'Your answers came with you': 'Ваши ответы сохранились',
  'We will suggest starting with {section}, about {minutes} minutes a day, aiming for Band {band}. It is a starting point you chose, not a level test, and you can change it.':
    'Предложим начать с {section}, примерно {minutes} минут в день, с целью Band {band}. Это отправная точка, которую выбрали вы, а не тест уровня, и её можно изменить.',
  'The trial is not switched on here': 'Пробный период здесь не включён',
  'This site is running as the open, free version, so there is nothing to start.':
    'Сайт работает в открытой бесплатной версии, поэтому запускать нечего.',
  'Go to my dashboard': 'Перейти на главную',
  'Your trial is already running': 'Ваш пробный период уже идёт',
  'Each account has one trial, and yours started earlier. {time}': 'У каждого аккаунта один пробный период, и ваш уже начался. {time}',
  'Each account has one trial. Your results stay saved.': 'У каждого аккаунта один пробный период. Ваши результаты сохранены.',
  'Go to my trial': 'Перейти к пробному периоду',
  'Before you begin': 'Перед началом',
  'Your three days start when you press the button below, by our clock, not your device’s.':
    'Три дня начнутся, когда вы нажмёте кнопку ниже. Время считаем по нашим часам, а не по часам вашего устройства.',
  'Three days of access, with no payment card and nothing to cancel.': 'Три дня доступа без банковской карты, отменять ничего не нужно.',
  'One test per section: Reading, Listening, Writing and Speaking. Once you start a section’s test, it is your test for that section. If something fails on our side, it is not used.':
    'По одному тесту на каждую часть: Reading, Listening, Writing и Speaking. Начатый тест становится вашим тестом по этой части. Если что-то сломается на нашей стороне, тест не расходуется.',
  'The Speaking test opens once its length is confirmed.': 'Тест Speaking откроется, когда будет утверждена его длительность.',
  '{n} Mr EZ messages in each section for the whole trial. Only answered messages count, and they do not reset each day.':
    '{n} сообщений Mr EZ по каждой части на весь пробный период. Считаются только сообщения с ответом, и каждый день они не обновляются.',
  'Your trial is kept with your account, so it is the same on any device you sign in on.':
    'Пробный период хранится в вашем аккаунте, поэтому он одинаков на любом устройстве, где вы вошли.',
  'Starting your trial…': 'Запускаем пробный период…',
  'Start my 3-day trial': 'Начать 3 дня бесплатно',
  'You seem to be offline. Nothing has started: try again once you are connected.':
    'Похоже, нет подключения к интернету. Ничего не началось: попробуйте снова, когда связь появится.',
  'We could not start your trial just now. Nothing has started: please try again.':
    'Не получилось запустить пробный период. Ничего не началось: попробуйте ещё раз.',

  /* The trial home */
  'Your 3-day trial': 'Ваши 3 дня пробного доступа',
  'Your trial has ended': 'Пробный период закончился',
  'New lessons, tests and Mr EZ replies are locked. Your results stay saved.':
    'Новые уроки, тесты и ответы Mr EZ закрыты. Ваши результаты сохранены.',
  'See full access': 'Полный доступ',
  'A little practice. A clearer next step.': 'Немного практики. Понятный следующий шаг.',
  'Your trial gives you a focused introduction to each part of IELTS.': 'Пробный период знакомит с каждой частью IELTS.',
  'Suggested from your answers': 'Предложено по вашим ответам',
  'Start with {section}, about {minutes} minutes a day, aiming for Band {band}. A starting point you chose, not a level test.':
    'Начните с {section}, примерно {minutes} минут в день, с целью Band {band}. Это выбранная вами отправная точка, а не тест уровня.',
  'IELTS section': 'Часть IELTS',
  'Selected introduction': 'Вводный урок',
  'Open my first lesson': 'Открыть первый урок',
  'Explore full access': 'Узнать о полном доступе',
  'Your {section} allowance': 'Ваш лимит по {section}',
  'Trial test': 'Пробный тест',
  '1 available': '1 доступен',
  'In progress': 'Начат',
  Used: 'Использован',
  'Not open yet': 'Пока закрыт',
  'Trial ended': 'Пробный период закончился',
  'Mr EZ messages': 'Сообщения Mr EZ',
  '{left} of {limit} left': 'Осталось {left} из {limit}',
  'Introductory lesson': 'Вводный урок',
  Included: 'Включён',
  Locked: 'Закрыто',
  'Each section has its own allowance. It does not reset each day.': 'У каждой части свой лимит. Каждый день он не обновляется.',
  'Inside your course': 'Что есть в курсе',
  '{first} and {second} left': 'Осталось {first} и {second}',
  '{time} left': 'Осталось {time}',
  'One test included': 'Один тест включён',
  'You have started this test. It is still yours to finish.': 'Вы начали этот тест. Его можно закончить.',
  'Your included test has been used': 'Включённый тест уже использован',
  'Not open yet: its length is still being decided': 'Пока закрыт: длительность ещё уточняется',
  'Included in your trial': 'Входит в пробный период',
  'Continue test': 'Продолжить тест',
  'Available with full access': 'Доступно с полным доступом',
  'See what full access includes in {section}': 'Что входит в полный доступ по {section}',
  'Your trial opens one introduction and one test in each section. Everything else stays listed, so you can see what full access adds.':
    'В пробном периоде открыт один вводный урок и один тест в каждой части. Остальное видно в списке, чтобы вы знали, что даёт полный доступ.',

  /* Gates and refusals */
  'Checking your trial…': 'Проверяем пробный период…',
  'Sign in to continue your trial': 'Войдите, чтобы продолжить пробный период',
  'Your trial belongs to your account, so it is the same on every device. Signing out never restarts it.':
    'Пробный период привязан к вашему аккаунту, поэтому он одинаков на любом устройстве. Выход из аккаунта не запускает его заново.',
  'New here? Start a free 3-day trial': 'Впервые здесь? 3 дня бесплатно',
  'Accounts are not available on this build': 'В этой версии нет аккаунтов',
  'The trial needs an account, and accounts are not configured here.': 'Для пробного периода нужен аккаунт, а аккаунты здесь не настроены.',
  'We could not check your trial': 'Не удалось проверить пробный период',
  'You seem to be offline. Your trial and your work are safe; this page opens again once you are connected.':
    'Похоже, нет подключения к интернету. Пробный период и ваша работа в сохранности, страница откроется, когда связь появится.',
  'Something went wrong on our side. Your trial and your work are safe. Please try again.':
    'Что-то пошло не так на нашей стороне. Пробный период и ваша работа в сохранности. Попробуйте ещё раз.',
  'Start your free trial to open this': 'Начните бесплатный пробный период, чтобы открыть это',
  'Three days, no payment card. A selected introduction and one test in each IELTS section.':
    'Три дня без банковской карты. Вводный урок и один тест в каждой части IELTS.',
  'Start my free trial': 'Начать бесплатно',
  'New lessons, tests and Mr EZ replies are locked. Choose full access to continue learning.':
    'Новые уроки, тесты и ответы Mr EZ закрыты. Выберите полный доступ, чтобы продолжить учёбу.',
  'The Speaking test is not open yet': 'Тест Speaking пока закрыт',
  'We are finalising how long the trial Speaking test lasts. Your Speaking introduction lesson is ready in the meantime.':
    'Мы уточняем, сколько будет длиться пробный тест Speaking. А пока вас ждёт вводный урок по Speaking.',
  'You have used this section’s trial test': 'Вы уже использовали пробный тест этой части',
  'Your result is saved in your progress. The other sections still have their own test while your trial is active.':
    'Результат сохранён в вашем прогрессе. В других частях остаётся свой тест, пока идёт пробный период.',
  'You have already started your {section} test': 'Вы уже начали тест {section}',
  'Your trial includes one test per section. Finish the one you started from your trial page.':
    'В пробный период входит один тест на каждую часть. Закончите начатый тест со страницы пробного периода.',
  'Your trial includes one selected introduction and one test in each section. This page is part of the full course.':
    'В пробный период входит один вводный урок и один тест в каждой части. Эта страница относится к полному курсу.',
  'Back to my trial': 'Вернуться к пробному периоду',
  'View plans': 'Посмотреть тарифы',

  /* The test player and the Writing checker */
  'Starting uses your one Reading test for this trial. If something goes wrong before it starts, nothing is used.':
    'Начав, вы используете единственный тест Reading пробного периода. Если что-то сломается до начала, ничего не расходуется.',
  'Starting uses your one Listening test for this trial. If something goes wrong before it starts, nothing is used.':
    'Начав, вы используете единственный тест Listening пробного периода. Если что-то сломается до начала, ничего не расходуется.',
  'Starting…': 'Начинаем…',
  'You seem to be offline. Nothing was used: press Start again once you are connected.':
    'Похоже, нет подключения к интернету. Ничего не израсходовано: нажмите «Начать тест» снова, когда связь появится.',
  'This section’s trial test is already used.': 'Пробный тест этой части уже использован.',
  'Your trial has ended.': 'Пробный период закончился.',
  'We could not start the test just now. Nothing was used: please try again.':
    'Не получилось начать тест. Ничего не израсходовано: попробуйте ещё раз.',
  'This is your one Writing test for the trial. It is used when your essay is graded; if grading fails, you can submit again.':
    'Это ваш единственный тест Writing в пробном периоде. Он расходуется, когда эссе оценено. Если оценка не получится, можно отправить снова.',
  'Your trial Writing test has already been graded. Your essay is safe on this page.':
    'Пробный тест Writing уже оценён. Ваше эссе сохранено на этой странице.',
  'Sign in again to have your essay graded. Your essay is safe on this page.':
    'Войдите снова, чтобы эссе оценили. Ваше эссе сохранено на этой странице.',
  'Your trial could not accept this essay for grading. Your essay is safe on this page.':
    'Пробный период не смог принять это эссе на оценку. Ваше эссе сохранено на этой странице.',
  'We could not reach the grading service. Your essay is safe on this page and your Writing test has not been used; try again in a minute.':
    'Не удалось связаться с сервисом оценки. Эссе сохранено на этой странице, а тест Writing не израсходован. Попробуйте через минуту.',

  /* The locked door (src/lib/i18n/lesson-body.ts) */
  'This lesson could not be loaded just now. Check your connection and reload the page.':
    'Не удалось загрузить урок. Проверьте подключение и обновите страницу.',

  /* Mr EZ */
  'Start your free trial to talk to Mr EZ.': 'Начните бесплатный пробный период, чтобы поговорить с Mr EZ.',
  'Your trial has ended, so Mr EZ cannot reply to new questions.': 'Пробный период закончился, поэтому Mr EZ не может ответить на новые вопросы.',
  'You have used your five Mr EZ messages for this section. The other sections have their own.':
    'Вы использовали пять сообщений Mr EZ по этой части. У других частей свой лимит.',
  'During your trial, Mr EZ answers questions about the lessons and tests your trial includes.':
    'В пробный период Mr EZ отвечает на вопросы об уроках и тестах, которые в него входят.',
  'During your trial, Mr EZ answers questions about one section at a time. Open a trial lesson, or choose a section on your trial page.':
    'В пробный период Mr EZ отвечает на вопросы по одной части за раз. Откройте урок пробного периода или выберите часть на странице пробного периода.',
  'You have used your five messages for {section}. The other sections have their own.':
    'Вы использовали пять сообщений по {section}. У других частей свой лимит.',
  '{section}: {left} of {limit} messages left. Only answered messages count.':
    '{section}: осталось {left} из {limit} сообщений. Считаются только сообщения с ответом.',

  /* Full access */
  'Keep your momentum.': 'Сохраните темп.',
  'Choose more time for your IELTS preparation.': 'Выберите, сколько времени добавить к подготовке к IELTS.',
  'One month': 'Один месяц',
  'Three months': 'Три месяца',
  total: 'всего',
  'The full course and every practice test for one month.': 'Полный курс и все тренировочные тесты на один месяц.',
  'Save {amount} compared with three monthly purchases.': 'Экономия {amount} по сравнению с тремя месячными покупками.',
  'Payment not connected yet': 'Оплата пока не подключена',
  'Buying is not open yet. Paid Mr EZ allowances and purchase terms are still being confirmed, so this page cannot take a payment and will not ask for one.':
    'Покупка пока недоступна. Платные лимиты Mr EZ и условия покупки ещё уточняются, поэтому эта страница не принимает оплату и не будет её просить.',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {
  '{n} hours': { one: '{n} час', few: '{n} часа', many: '{n} часов', other: '{n} часа' },
  '{n} minutes': { one: '{n} минута', few: '{n} минуты', many: '{n} минут', other: '{n} минуты' },
  '{n} messages left': {
    one: 'осталось {n} сообщение',
    few: 'осталось {n} сообщения',
    many: 'осталось {n} сообщений',
    other: 'осталось {n} сообщения',
  },
  '{n} more guided lessons': {
    one: 'Ещё {n} урок с объяснениями',
    few: 'Ещё {n} урока с объяснениями',
    many: 'Ещё {n} уроков с объяснениями',
    other: 'Ещё {n} урока с объяснениями',
  },
};
