/* Russian for the policy and help pages under the free-account model
   (Builder W, 1 October 2026): /terms (TermsDocument.tsx), the purchase
   facts beside the plans (PurchaseTerms.tsx), /privacy and /help.

   "Практика и сопровождение" is the one name for what paying adds, as in
   access-model.ts and on the sales page; "вступительный тест" is the
   placement test and "пробный экзамен" a full mock exam, as elsewhere. The
   sales page itself keeps its own bilingual table (src/marketing/sales-copy.ts). */
export const strings: Record<string, string> = {
  /* /terms */
  'What a free account includes, what practice and guidance add, and what happens when your access ends.':
    'Что даёт бесплатный аккаунт, что добавляют практика и сопровождение и что происходит, когда доступ заканчивается.',
  'Updated 1 October 2026': 'Обновлено 1 октября 2026 года',
  'Buying practice and guidance is not open yet. The terms for it below will apply once it opens.':
    'Покупка практики и сопровождения пока недоступна. Условия ниже начнут действовать, когда она откроется.',
  'Your free account': 'Ваш бесплатный аккаунт',
  'Every lesson is free: the explanations, worked examples, each lesson’s own short quiz and the vocabulary lists.':
    'Все уроки бесплатны: объяснения, разобранные примеры, короткий тест к каждому уроку и списки слов.',
  'Lessons open once you are signed in to a free account.': 'Уроки открываются, когда вы вошли в бесплатный аккаунт.',
  'Creating an account is free and needs no payment card. A free account never turns into a paid one by itself.':
    'Аккаунт создаётся бесплатно, банковская карта не нужна. Бесплатный аккаунт никогда не становится платным сам по себе.',
  'Practice and guidance': 'Практика и сопровождение',
  'Practice and guidance cost {price} for 30 days, paid once.': 'Практика и сопровождение стоят {price} за 30 дней, оплата один раз.',
  'They add every practice exercise and timed test with band estimates, AI feedback on essays and recorded Speaking, live interviews with the AI examiner, full mock exams, the placement test, Mr EZ and the practice in your personal study plan.':
    'В них входят все упражнения и тесты на время с оценкой балла, разбор эссе и записей Speaking от ИИ, устные собеседования с ИИ-экзаменатором, полные пробные экзамены, вступительный тест, Mr EZ и практика из вашего личного учебного плана.',
  'If you buy again while your access is running, the new 30 days start when the current ones end.':
    'Если купить снова, пока доступ ещё действует, новые 30 дней начнутся, когда закончатся текущие.',
  'Payments are not refunded after purchase. Every lesson is free with an account, so you can see how the course teaches before you buy.':
    'После покупки деньги не возвращаются. Все уроки бесплатны с аккаунтом, поэтому до покупки вы можете посмотреть, как устроено обучение.',
  'What 30 days include': 'Что входит в 30 дней',
  '12 essay assessments, 6 recorded Speaking assessments (up to 5 minutes each), 2 live interviews with feedback (up to 15 minutes each) and 2 full mock exams.':
    '12 проверок эссе, 6 проверок записей Speaking (до 5 минут каждая), 2 устных собеседования с разбором (до 15 минут каждое) и 2 полных пробных экзамена.',
  'The placement test, once per account. Essays written in a mock exam or the placement test count towards the 12 essay assessments.':
    'Вступительный тест, один раз на аккаунт. Эссе, написанные в пробном экзамене или во вступительном тесте, входят в 12 проверок эссе.',
  'Unused assessments expire at the end of the 30 days. Reading and Listening practice has no limit.':
    'Неиспользованные проверки сгорают в конце 30 дней. Практика Reading и Listening без ограничений.',
  'Mr EZ answers up to 40 chat messages and 60 lesson-help requests a day.':
    'Mr EZ отвечает не больше чем на 40 сообщений в чате и 60 запросов помощи в уроках в день.',
  'Your lessons stay open with your free account. Practice, tests, AI feedback and Mr EZ need practice and guidance again.':
    'Уроки остаются открытыми в вашем бесплатном аккаунте. Для практики, тестов, разбора от ИИ и Mr EZ снова понадобятся практика и сопровождение.',

  /* /privacy */
  'If you took the free trial while it was offered: when it started, which trial tests and Mr EZ messages you used, and your answers to the short questions about your goals. The trial is no longer offered, so no new trial records are made.':
    'Если вы проходили бесплатный пробный период, пока он предлагался: когда он начался, какие пробные тесты и сообщения Mr EZ вы использовали, и ваши ответы на короткие вопросы о целях. Пробный период больше не предлагается, поэтому новые записи о нём не создаются.',
  'When you buy practice and guidance, or are given it, the site keeps these records:':
    'Когда вы покупаете практику и сопровождение или получаете их бесплатно, сайт хранит такие записи:',
  'How many of the included assessments you have used: each essay, recorded Speaking, live interview and mock exam or placement interview, with its time and whether it finished.':
    'Сколько включённых проверок вы использовали: каждое эссе, запись Speaking, устное собеседование и собеседование в пробном экзамене или вступительном тесте, со временем и отметкой, завершилась ли проверка.',
  'For each AI assessment, the AI service’s usage figures and the result of the call, to keep costs in check. Your essay, your recording and the feedback text are not part of this record.':
    'Для каждой проверки ИИ: данные сервиса ИИ об объёме работы и результат запроса, чтобы следить за расходами. Ваше эссе, запись и текст разбора в эту запись не входят.',
  'If the person who runs the site gives you free access, the dates it starts and ends and who gave it.':
    'Если человек, который ведёт сайт, даёт вам бесплатный доступ: даты его начала и окончания и кто его выдал.',

  /* /help */
  'Short answers about free lessons, practice and guidance, tests, scores, saving your work and Mr EZ.':
    'Короткие ответы о бесплатных уроках, практике и сопровождении, тестах, баллах, сохранении работы и Mr EZ.',
  'What is free, and what is paid?': 'Что бесплатно, а что платно?',
  'Every lesson is free with an account: the explanations, worked examples, each lesson’s own short quiz and the vocabulary lists.':
    'Все уроки бесплатны с аккаунтом: объяснения, разобранные примеры, короткий тест к каждому уроку и списки слов.',
  'Practice and guidance are paid: practice exercises and timed tests with band estimates, AI feedback on essays and recorded Speaking, live interviews with the AI examiner, full mock exams, the placement test, Mr EZ and the practice in your personal study plan.':
    'Практика и сопровождение платные: упражнения и тесты на время с оценкой балла, разбор эссе и записей Speaking от ИИ, устные собеседования с ИИ-экзаменатором, полные пробные экзамены, вступительный тест, Mr EZ и практика из вашего личного учебного плана.',
  'Practice and guidance last 30 days and then simply end. Nothing renews, and payments are not refunded after purchase. The Plans page shows the price and what 30 days include.':
    'Практика и сопровождение действуют 30 дней и просто заканчиваются. Ничего не продлевается, а после покупки деньги не возвращаются. Цена и то, что входит в 30 дней, указаны на странице тарифов.',
  'How do I get practice and guidance?': 'Как подключить практику и сопровождение?',
  'Open the Plans page, sign in and pay once for 30 days. Your access starts as soon as the payment is confirmed, and your Account page shows when it ends.':
    'Откройте страницу тарифов, войдите в аккаунт и оплатите 30 дней один раз. Доступ откроется, как только оплата подтвердится, а на странице аккаунта видно, когда он закончится.',
  'When you reach for something that comes with practice and guidance, the platform tells you what it adds and links to the Plans page. Your lessons stay open either way.':
    'Когда вы открываете то, что входит в практику и сопровождение, платформа объясняет, что они добавляют, и ведёт на страницу тарифов. Уроки остаются открытыми в любом случае.',
  'Buying practice and guidance is not open yet. The Plans page shows the price and what 30 days include.':
    'Покупка практики и сопровождения пока недоступна. Цена и то, что входит в 30 дней, указаны на странице тарифов.',
  'Mr EZ is your AI tutor, and he comes with practice and guidance. He explains results, suggests what to practise next and answers questions about your own work, reading only your own results.':
    'Mr EZ, ваш ИИ-репетитор, входит в практику и сопровождение. Он объясняет результаты, подсказывает, что тренировать дальше, и отвечает на вопросы о вашей работе, читая только ваши собственные результаты.',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
