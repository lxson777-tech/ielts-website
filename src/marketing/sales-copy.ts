/* Every sentence on the public sales page, in English and in Russian, side
   by side.

   Why the sales page has its own small dictionary instead of the workspace's
   (src/lib/i18n/dict): that dictionary is keyed by plain text and applied
   one text-only element at a time, but the sales page's headlines carry
   their own line breaks and accent spans ("Open the gates<br />to <em>your
   future.</em>"), and its copy has nothing to do with the workspace. Putting
   it in the workspace chunk would make every student download marketing
   copy on every page. What the two DO share is the stored language choice
   (`ielts.locale.v1`, src/lib/i18n/locale.ts): choose Russian here and
   sign-up, profile and workspace open in Russian; choose it in the
   workspace and this page opens in Russian.

   The offer it describes (Alex, 1 October 2026,
   docs/paid-access/FREE-ACCOUNT-MODEL.md): every lesson is free with an
   account; practice, tests and personal guidance are paid ("practice and
   guidance", in Russian "практика и сопровождение", always that one name),
   one price for 30 days, no automatic renewal, no refunds after purchase.
   There is no free trial. Nothing here promises free practice to the
   public: students Alex teaches get theirs from him directly.

   How it is used
   ---------------
   The Astro components render the English at build time from this table:

     <h1 data-sales="hero.title" set:html={sales('hero.title')} />
     <nav aria-label={sales('nav.main')} data-sales-attr="aria-label:nav.main">

   and src/marketing/sales-i18n.ts swaps in the Russian on the visitor's
   device. Values may hold these tags only: <br />, <span>, <em>, <b>,
   <small>, <mark>, <a> (a test checks it, tests/sales-copy.test.ts). They are
   constants written here, never visitor input.

   Rules for the Russian are the workspace's (docs/I18N-GUIDE.md): "вы",
   natural and short, no em or en dashes, and IELTS, Mr EZ, the four paper
   names, Task / Part numbers and official criterion names stay English.
   Placeholders ({oneMonth}, {threeMonths}, {saving}) are filled per
   language by salesVars().

   The allowances (12 essay assessments, 6 recorded Speaking assessments,
   2 live interviews, 2 mock exams, the placement test once per account)
   are written out in the sentences below; tests/sales-copy.test.ts holds
   them to PAID_AI_ALLOWANCE in src/lib/access/plans.ts, the approved
   wording, so the two cannot drift apart. */

import { paidPlan } from '../lib/access/plans';

export type SalesLocale = 'en' | 'ru';

export interface Bilingual {
  en: string;
  ru: string;
}

export const SALES_COPY = {
  /* Page metadata. */
  'meta.title': {
    en: 'IELTS is EZ | Open the gates to your future',
    ru: 'IELTS is EZ | Откройте ворота в своё будущее',
  },
  'meta.description': {
    en: 'Every IELTS lesson is free with an account. Practice, timed tests, AI feedback and Mr EZ cost {oneMonth} for 30 days, with no automatic renewal.',
    ru: 'Все уроки IELTS бесплатны с аккаунтом. Практика, тесты на время, разбор от ИИ и Mr EZ стоят {oneMonth} за 30 дней, без автоматического продления.',
  },
  'skip': { en: 'Skip to content', ru: 'Перейти к содержанию' },
  'review.note': {
    en: 'Sales page preview: prices and terms are agreed. Payment is not connected yet.',
    ru: 'Предварительная версия страницы: цены и условия согласованы, оплата пока не подключена.',
  },

  /* Header and language switch. */
  'nav.home': { en: 'IELTS is EZ home', ru: 'IELTS is EZ, на главную' },
  'nav.main': { en: 'Main navigation', ru: 'Основное меню' },
  'nav.tutor': { en: 'AI tutor', ru: 'ИИ-репетитор' },
  'nav.feedback': { en: 'AI feedback', ru: 'Разбор от ИИ' },
  'nav.inside': { en: 'Inside the platform', ru: 'Внутри платформы' },
  'nav.plan': { en: 'Your plan', ru: 'Ваш план' },
  'nav.pricing': { en: 'Pricing', ru: 'Цены' },
  'nav.signIn': { en: 'Sign in', ru: 'Войти' },
  // Every way in: the sign-up page (carrying the questionnaire's answers once chosen).
  'nav.signUp': { en: 'Create a free account', ru: 'Создать бесплатный аккаунт' },
  // The header's own copy of it shares a phone's width with the logo and the menu.
  'nav.signUpShort': { en: 'Free account', ru: 'Бесплатный аккаунт' },
  'nav.menuOpen': { en: 'Open menu', ru: 'Открыть меню' },
  'nav.menuClose': { en: 'Close menu', ru: 'Закрыть меню' },
  'lang.group': { en: 'Language', ru: 'Язык' },

  /* Hero: the gates. */
  'hero.label': { en: 'Every IELTS lesson free with an account', ru: 'Все уроки IELTS бесплатно с аккаунтом' },
  'hero.title': {
    en: 'Open the gates<br />to <em>your future.</em>',
    ru: 'Откройте ворота<br />в <em>своё будущее.</em>',
  },
  'hero.bar': {
    en: 'IELTS is EZ <span class="bar-divider">/</span> Your study space',
    ru: 'IELTS is EZ <span class="bar-divider">/</span> Ваше учебное пространство',
  },
  'hero.preview': { en: 'Platform preview', ru: 'Так выглядит платформа' },
  'hero.alt': {
    en: 'The real IELTS is EZ lesson library, with Reading, Writing, Speaking and Listening lessons',
    ru: 'Настоящая библиотека уроков IELTS is EZ: уроки по Reading, Writing, Speaking и Listening',
  },
  'hero.open': { en: 'Your study space', ru: 'Ваше учебное пространство' },

  /* Product demos (SalesDemo.astro). */
  'demo.title': {
    en: 'A big ambition.<br /><span>A practical way forward.</span>',
    ru: 'Большая цель.<br /><span>Понятный путь к ней.</span>',
  },
  'demo.lead': {
    en: 'Prepare for Academic IELTS 7.5+ with guided practice, AI feedback, and a clear next step.',
    ru: 'Готовьтесь к Academic IELTS на 7.5+ с пошаговой практикой, разбором от ИИ и понятным следующим шагом.',
  },
  'demo.tabs': { en: 'See how IELTS is EZ works', ru: 'Как работает IELTS is EZ' },
  'demo.note': {
    en: 'Actual platform screenshots, captured in preview mode. No live AI session is running here.',
    ru: 'Настоящие снимки экрана платформы в режиме предпросмотра. Живой сессии с ИИ здесь нет.',
  },
  'demo.speaking.label': { en: 'Practise speaking', ru: 'Практика Speaking' },
  'demo.speaking.title': { en: 'Say it out loud. Find your confidence.', ru: 'Говорите вслух. Обретайте уверенность.' },
  'demo.speaking.text': {
    en: 'Work through an IELTS-style conversation with the AI examiner. Keep answer structures and useful phrases beside you while you practise.',
    ru: 'Пройдите беседу в формате IELTS с ИИ-экзаменатором. Структуры ответов и полезные фразы всё время под рукой.',
  },
  'demo.speaking.alt': {
    en: 'Speaking trainer showing a Part 2 cue card, notes and examiner controls',
    ru: 'Тренажёр Speaking: карточка Part 2, заметки и управление экзаменатором',
  },
  'demo.coach.label': { en: 'Get a little guidance', ru: 'Подсказки' },
  'demo.coach.title': { en: 'A method to use when you get stuck.', ru: 'Метод на случай, когда вы застряли.' },
  'demo.coach.text': {
    en: 'Open the coach beside your practice. See how to organise an answer, choose useful language and avoid common mistakes.',
    ru: 'Откройте подсказки рядом с заданием: как выстроить ответ, какие фразы использовать и каких ошибок избегать.',
  },
  'demo.coach.alt': {
    en: 'Speaking coach with answer planning, phrases, vocabulary and common mistakes',
    ru: 'Подсказки для Speaking: план ответа, фразы, лексика и типичные ошибки',
  },
  'demo.lessons.label': { en: 'Learn the method', ru: 'Уроки' },
  'demo.lessons.title': { en: 'Know what to practise next.', ru: 'Знайте, что тренировать дальше.' },
  'demo.lessons.text': {
    en: 'Explore clear lessons for all four IELTS skills. Learn a method, work through the exercises, then put it to use in practice.',
    ru: 'Понятные уроки по всем четырём частям IELTS. Изучите метод, выполните упражнения и примените его на практике.',
  },
  'demo.lessons.alt': {
    en: 'IELTS lesson library with lessons organised by skill',
    ru: 'Библиотека уроков IELTS, разделённая по навыкам',
  },
  'demo.speaking.zoom': {
    en: 'View full-size screenshot: Speaking trainer showing a Part 2 cue card, notes and examiner controls',
    ru: 'Открыть снимок экрана целиком: тренажёр Speaking с карточкой Part 2, заметками и управлением экзаменатором',
  },
  'demo.coach.zoom': {
    en: 'View full-size screenshot: Speaking coach with answer planning, phrases, vocabulary and common mistakes',
    ru: 'Открыть снимок экрана целиком: подсказки для Speaking с планом ответа, фразами, лексикой и типичными ошибками',
  },
  'demo.lessons.zoom': {
    en: 'View full-size screenshot: IELTS lesson library with lessons organised by skill',
    ru: 'Открыть снимок экрана целиком: библиотека уроков IELTS, разделённая по навыкам',
  },

  /* The questionnaire (QuestionJourney.astro, src/scripts/question-journey.ts). */
  'journey.note': { en: 'Your ambition. Your starting point.', ru: 'Ваша цель. Ваша отправная точка.' },
  'journey.title': {
    en: 'A big dream.<br /><span>A plan that feels like you.</span>',
    ru: 'Большая мечта.<br /><span>План, который подходит именно вам.</span>',
  },
  'journey.lead': {
    en: 'Choose an answer to move to the next question. Your plan is waiting at the end.',
    ru: 'Выберите ответ, чтобы перейти к следующему вопросу. В конце вас ждёт ваш план.',
  },
  'journey.skip': { en: 'Just exploring? Take a look inside', ru: 'Просто знакомитесь? Загляните внутрь' },
  'journey.answers': { en: 'Your answers', ru: 'Ваши ответы' },
  'journey.chip.band': { en: 'Goal', ru: 'Цель' },
  'journey.chip.skill': { en: 'Section', ru: 'Часть' },
  'journey.chip.focus': { en: 'Focus', ru: 'Фокус' },
  'journey.chip.time': { en: 'Daily time', ru: 'Время в день' },
  'journey.step.band': { en: '01 / YOUR GOAL', ru: '01 / Ваша цель' },
  'journey.step.skill': { en: '02 / YOUR CHALLENGE', ru: '02 / Главная трудность' },
  'journey.step.focus': { en: '03 / YOUR FOCUS', ru: '03 / Ваш фокус' },
  'journey.step.time': { en: '04 / YOUR PACE', ru: '04 / Ваш темп' },
  'journey.q.band': { en: 'What are you aiming for?', ru: 'К какому баллу вы стремитесь?' },
  'journey.n.band': { en: 'Start with the destination.', ru: 'Начнём с цели.' },
  'journey.o.band.7': { en: 'Band 7.0', ru: 'Балл 7.0' },
  'journey.d.band.7': { en: 'A strong next step', ru: 'Уверенный следующий шаг' },
  'journey.o.band.7.5': { en: 'Band 7.5', ru: 'Балл 7.5' },
  'journey.d.band.7.5': { en: 'Room for bigger plans', ru: 'Простор для больших планов' },
  'journey.o.band.8': { en: 'Band 8.0+', ru: 'Балл 8.0+' },
  'journey.d.band.8': { en: 'Aim a little higher', ru: 'Цель чуть выше' },
  'journey.q.skill': { en: 'Which section feels hardest?', ru: 'Какая часть даётся труднее всего?' },
  'journey.n.skill': { en: 'We will start where a little support matters most.', ru: 'Начнём там, где поддержка нужнее всего.' },
  'journey.o.skill.speaking': { en: 'Speaking', ru: 'Speaking' },
  'journey.d.skill.speaking': { en: 'Finding the words out loud', ru: 'Подобрать слова, когда говорите вслух' },
  'journey.o.skill.writing': { en: 'Writing', ru: 'Writing' },
  'journey.d.skill.writing': { en: 'Turning ideas into an answer', ru: 'Превратить идеи в ответ' },
  'journey.o.skill.reading': { en: 'Reading', ru: 'Reading' },
  'journey.d.skill.reading': { en: 'Finding the right evidence', ru: 'Найти в тексте нужное подтверждение' },
  'journey.o.skill.listening': { en: 'Listening', ru: 'Listening' },
  'journey.d.skill.listening': { en: 'Keeping up with the recording', ru: 'Успевать за записью' },
  'journey.q.focus': { en: 'What gets in your way?', ru: 'Что вам мешает?' },
  'journey.n.focus': { en: 'Choose the one you would most like to change.', ru: 'Выберите то, что хочется изменить в первую очередь.' },
  'journey.o.focus.method': { en: 'Knowing how to answer', ru: 'Не знаю, как отвечать' },
  'journey.d.focus.method': { en: 'I need a clear method', ru: 'Мне нужен понятный метод' },
  'journey.o.focus.confidence': { en: 'Putting it into practice', ru: 'Трудно применить на практике' },
  'journey.d.focus.confidence': { en: 'I know the basics, but get stuck', ru: 'Основы знаю, но застреваю' },
  'journey.q.time': { en: 'What fits into your day?', ru: 'Сколько времени у вас есть в день?' },
  'journey.n.time': {
    en: 'A routine you can return to is a good place to begin.',
    ru: 'Хорошее начало: привычка, к которой легко возвращаться.',
  },
  'journey.o.time.15': { en: '15 minutes', ru: '15 минут' },
  'journey.d.time.15': { en: 'A small daily step', ru: 'Небольшой шаг каждый день' },
  'journey.o.time.30': { en: '30 minutes', ru: '30 минут' },
  'journey.d.time.30': { en: 'Time to practise and reflect', ru: 'Время потренироваться и подумать' },
  'journey.o.time.60': { en: '60 minutes', ru: '60 минут' },
  'journey.d.time.60': { en: 'Recommended by your teacher', ru: 'Рекомендация преподавателя' },
  'journey.result.note': { en: 'Your suggested starting plan', ru: 'Предложенный план на старт' },
  'journey.result.title': { en: 'Make your goal a daily habit.', ru: 'Превратите цель в ежедневную привычку.' },
  'journey.result.lead': { en: 'Four choices. One clear place to start.', ru: 'Четыре ответа. Одна понятная точка старта.' },
  'journey.routine': { en: 'How to use your daily time', ru: 'Как распределить время в день' },
  'journey.action.title': { en: 'Start with these lessons.', ru: 'Начните с этих уроков.' },
  'journey.action.text': {
    en: 'Create a free account and begin with the lessons in this plan. Every lesson is free. Steps marked practice and guidance need paid access.',
    ru: 'Создайте бесплатный аккаунт и начните с уроков из этого плана. Все уроки бесплатны. Для шагов с пометкой «практика и сопровождение» нужен платный доступ.',
  },
  'journey.copy.summary': { en: 'Keep a copy of my plan', ru: 'Сохранить копию плана' },
  'journey.copy.label': { en: 'Select the plan and copy it to your notes.', ru: 'Выделите план и скопируйте его в заметки.' },
  'journey.disclaimer': {
    en: 'A suggested routine, not a level assessment or guaranteed band. Create your account from here and your answers go with you as a suggestion you can change.',
    ru: 'Это предложенный распорядок, а не оценка уровня и не гарантия балла. Если создать аккаунт отсюда, ваши ответы перейдут с вами как подсказка, которую можно изменить.',
  },
  'journey.placeholder': {
    en: 'Choose your goal, your hardest section and your daily pace. Your short practice plan will appear here.',
    ru: 'Выберите цель, самую трудную часть и темп на день. Здесь появится ваш короткий план практики.',
  },
  'journey.placeholder.cta': { en: 'Find my starting point', ru: 'Найти мою точку старта' },

  /* Sentences the questionnaire script writes (src/scripts/question-journey.ts). */
  'journey.progress': {
    en: '{count} of 4 choices made. Finish the questions to see your suggested plan.',
    ru: 'Выбрано ответов: {count} из 4. Ответьте на все вопросы, чтобы увидеть план.',
  },
  'journey.plan.title': { en: 'Your Band {band} goal. Your first 3 days.', ru: 'Ваша цель: балл {band}. Ваши первые 3 дня.' },
  'journey.plan.lead': {
    en: 'Start with {skill}, the section you want most help with. Set aside {time} minutes each day. Learn one method, practise it, then try a fresh task.',
    ru: 'Начните с {skill}: здесь вам больше всего нужна помощь. Уделяйте занятиям {time} минут в день. Изучите один метод, отработайте его, затем попробуйте новое задание.',
  },
  'journey.plan.label': { en: '{skill} / {time} minutes a day', ru: '{skill} / {time} минут в день' },
  'journey.plan.focus.method': { en: 'A clear method', ru: 'Понятный метод' },
  'journey.plan.focus.confidence': { en: 'More confident practice', ru: 'Более уверенная практика' },
  'journey.plan.day': { en: 'Day {day} / {minutes} minutes', ru: 'День {day} / {minutes} минут' },
  'journey.plan.outcome': { en: 'Take away: {outcome}', ru: 'Итог: {outcome}' },
  /* Which steps a free account can do (journeyDays in src/lib/journey-plan.ts
     says which day is which). */
  'journey.plan.free': { en: 'Free lesson', ru: 'Бесплатный урок' },
  'journey.plan.paid': { en: 'Practice and guidance', ru: 'Практика и сопровождение' },
  'journey.copy.heading': { en: 'IELTS is EZ: suggested three-day plan', ru: 'IELTS is EZ: предложенный план на три дня' },
  'journey.copy.target': {
    en: 'Target Band {band}, {skill}, {time} minutes daily',
    ru: 'Целевой балл {band}, {skill}, {time} минут в день',
  },
  'journey.copy.day': { en: 'Day {day}: {title} ({minutes} min, {access})', ru: 'День {day}: {title} ({minutes} мин, {access})' },
  'journey.copy.guide': { en: 'Daily time guide', ru: 'Как распределить время в день' },

  /* Mr EZ. */
  'ez.alt': {
    en: 'Mr EZ, your friendly AI tutor, wearing glasses and a forest-green hoodie with orange Mr EZ lettering.',
    ru: 'Mr EZ, ваш дружелюбный ИИ-репетитор, в очках и тёмно-зелёном худи с оранжевой надписью Mr EZ.',
  },
  'ez.name': { en: 'Mr EZ <small>Your AI study companion</small>', ru: 'Mr EZ <small>Ваш ИИ-помощник в учёбе</small>' },
  'ez.note': { en: 'A little guidance. A lot more clarity.', ru: 'Немного подсказки. Гораздо больше ясности.' },
  'ez.title': {
    en: 'Meet Mr EZ.<br /><span>Your next step, <br />made clearer.</span>',
    ru: 'Знакомьтесь: Mr EZ.<br /><span>Ваш следующий шаг <br />станет понятнее.</span>',
  },
  'ez.lead': {
    en: 'Getting a score is one thing. Knowing what to do next is another. Mr EZ is your AI tutor, here to help you understand your practice and keep moving towards your goal.',
    ru: 'Получить балл и понять, что делать дальше, не одно и то же. Mr EZ, ваш ИИ-репетитор, поможет разобраться в результатах практики и не останавливаться на пути к цели.',
  },
  'ez.example': { en: 'Example conversation with Mr EZ', ru: 'Пример разговора с Mr EZ' },
  'ez.example.label': { en: 'Example conversation', ru: 'Пример разговора' },
  'ez.student': {
    en: '<b>You</b>My answers are too short. What should I add?',
    ru: '<b>Вы</b>Мои ответы слишком короткие. Что добавить?',
  },
  'ez.reply': {
    en: 'Start with your answer, add a reason, then give one specific example. Try it with <span lang="en">“Do you enjoy studying with other people?”</span>',
    ru: 'Начните с ответа, добавьте причину, затем приведите один конкретный пример. Попробуйте на вопросе <span lang="en">“Do you enjoy studying with other people?”</span>',
  },
  'ez.next': { en: 'Your next practice: developing a Part 1 answer.', ru: 'Следующая практика: развёрнутый ответ в Part 1.' },
  'ez.disclaimer': {
    en: 'Illustrative conversation, not a live chat. Mr EZ can explain results, help with study questions and suggest relevant practice.',
    ru: 'Это пример, а не живой чат. Mr EZ объясняет результаты, отвечает на вопросы по учёбе и предлагает подходящую практику.',
  },
  'ez.access': {
    en: 'Mr EZ comes with practice and guidance. Daily usage limits apply.',
    ru: 'Mr EZ входит в практику и сопровождение. Действуют дневные лимиты использования.',
  },

  /* Inside the platform: the four skills. */
  'room.note': { en: 'Come on in', ru: 'Заходите' },
  'room.title': { en: 'One space.<br />Every part of IELTS.', ru: 'Одно пространство.<br />Все части IELTS.' },
  'room.lead': {
    en: 'Less searching for what to study.<br />More time actually getting somewhere.',
    ru: 'Меньше поисков, что учить.<br />Больше времени на настоящий прогресс.',
  },
  'room.choose': { en: 'Choose a skill', ru: 'Выберите навык' },
  'room.tabs': { en: 'Explore IELTS skills', ru: 'Навыки IELTS' },
  'room.method': { en: 'How we teach it', ru: 'Как мы этому учим' },
  'room.hint': { en: 'Choose a section. Find your next step.', ru: 'Выберите часть. Найдите следующий шаг.' },
  'room.foot': {
    en: "Learn at your pace. Come back when you're ready.",
    ru: 'Учитесь в своём темпе. Возвращайтесь, когда будете готовы.',
  },
  'skill.reading.headline': { en: 'Find the meaning. Then the answer.', ru: 'Сначала смысл. Потом ответ.' },
  'skill.reading.text': {
    en: 'Learn to spot paraphrases, follow an argument, and find the evidence that makes an answer right.',
    ru: 'Научитесь замечать перефразирование, следить за ходом мысли и находить подтверждение, которое делает ответ верным.',
  },
  'skill.reading.m1': { en: 'Recognise paraphrases and question types.', ru: 'Узнавайте перефразирование и типы вопросов.' },
  'skill.reading.m2': { en: 'Find the evidence in the passage.', ru: 'Находите подтверждение в тексте.' },
  'skill.reading.m3': {
    en: 'Apply the method in focused exercises and timed tests.',
    ru: 'Применяйте метод в целевых упражнениях и тестах на время.',
  },
  'skill.listening.headline': { en: 'Know what to listen for.', ru: 'Знайте, что слушать.' },
  'skill.listening.text': {
    en: 'Predict the missing detail, follow the signposts, and catch the moment a speaker changes their mind.',
    ru: 'Предсказывайте недостающую деталь, следите за сигнальными словами и ловите момент, когда говорящий меняет решение.',
  },
  'skill.listening.m1': { en: 'Predict the detail you need before listening.', ru: 'Предсказывайте нужную деталь до прослушивания.' },
  'skill.listening.m2': { en: 'Follow signposts and notice distractors.', ru: 'Следите за сигнальными словами и замечайте ловушки.' },
  'skill.listening.m3': { en: 'Practise with recordings, then review the answers.', ru: 'Тренируйтесь на записях, затем разбирайте ответы.' },
  'skill.writing.headline': { en: 'Give your ideas a clear direction.', ru: 'Дайте идеям чёткое направление.' },
  'skill.writing.text': {
    en: 'Make a plan, develop your argument, and practise with useful phrases and structure beside you.',
    ru: 'Составьте план, развивайте аргумент и тренируйтесь, держа под рукой полезные фразы и структуру.',
  },
  'skill.writing.m1': { en: 'Plan a clear answer with guided structures.', ru: 'Планируйте чёткий ответ по готовым структурам.' },
  'skill.writing.m2': {
    en: 'Develop your ideas using examples and useful phrases.',
    ru: 'Развивайте идеи с помощью примеров и полезных фраз.',
  },
  'skill.writing.m3': { en: 'Use AI feedback to choose what to revise next.', ru: 'По разбору от ИИ решайте, что исправить дальше.' },
  'skill.speaking.headline': { en: 'Find your words. Keep your voice.', ru: 'Найдите слова. Сохраните свой голос.' },
  'skill.speaking.text': {
    en: 'Build fuller, more natural answers with a simple structure, then put them into practice out loud.',
    ru: 'Стройте более полные и естественные ответы по простой структуре, а потом отрабатывайте их вслух.',
  },
  'skill.speaking.m1': { en: 'Build an answer with a reason and an example.', ru: 'Стройте ответ с причиной и примером.' },
  'skill.speaking.m2': {
    en: 'Practise out loud with structures and vocabulary nearby.',
    ru: 'Тренируйтесь вслух, держа под рукой структуры и лексику.',
  },
  'skill.speaking.m3': { en: 'Review AI feedback and focus your next attempt.', ru: 'Изучайте разбор от ИИ и уточняйте цель следующей попытки.' },

  /* AI feedback. */
  'fb.art': { en: 'Illustrative writing feedback', ru: 'Пример разбора письменной работы' },
  'fb.progress': { en: 'Your idea, in progress', ru: 'Ваша идея в работе' },
  'fb.comment.title': { en: 'Make the benefit specific.', ru: 'Уточните, в чём польза.' },
  'fb.comment.text': {
    en: 'What can students do in that space? Why does that matter?',
    ru: 'Что студенты могут делать в этом пространстве? Почему это важно?',
  },
  'fb.draft': { en: 'One possible next draft', ru: 'Возможный следующий вариант' },
  'fb.sample': { en: 'Illustrative feedback, not a live assessment', ru: 'Пример разбора, а не живая проверка' },
  'fb.note': { en: 'AI built into your practice', ru: 'ИИ встроен в вашу практику' },
  'fb.title': {
    en: 'Understand your band.<br /><span>Know your next step.</span>',
    ru: 'Поймите свой балл.<br /><span>Узнайте следующий шаг.</span>',
  },
  'fb.lead': {
    en: 'Write an essay. Record an answer. Get personal AI feedback on demand, without booking a marking session.',
    ru: 'Напишите эссе. Запишите ответ. Получите личный разбор от ИИ, когда вам удобно, без записи на проверку.',
  },
  'fb.1.title': { en: 'A band estimate with a reason behind it.', ru: 'Примерный балл с объяснением.' },
  'fb.1.text': {
    en: 'Your writing and speaking are assessed against the official public IELTS band descriptors, with feedback for each criterion.',
    ru: 'Ваши Writing и Speaking оцениваются по официальным открытым критериям IELTS, с разбором по каждому критерию.',
  },
  'fb.2.title': { en: 'Advice about your actual answer.', ru: 'Советы по вашему конкретному ответу.' },
  'fb.2.text': {
    en: 'Get specific changes for your essay or recording, including pronunciation feedback from your audio.',
    ru: 'Конкретные правки для эссе или записи, включая разбор произношения по вашему аудио.',
  },
  'fb.3.title': { en: 'Know what the next band asks of you.', ru: 'Узнайте, что нужно для следующего балла.' },
  'fb.3.text': { en: 'Choose one improvement, practise it, then try again.', ru: 'Выберите одно улучшение, отработайте его и попробуйте снова.' },
  'fb.score': {
    en: 'AI assessments take time to process. Bands are practice estimates, not official results or a guarantee of your test score.',
    ru: 'Проверке ИИ нужно немного времени. Баллы примерные, для практики: это не официальный результат и не гарантия балла на экзамене.',
  },
  'fb.criteria.title': { en: 'Official criteria. Transparent practice estimates.', ru: 'Официальные критерии. Прозрачные учебные оценки.' },
  'fb.criteria.text': {
    en: 'See what your writing and speaking are assessed on.',
    ru: 'Посмотрите, по каким критериям оцениваются ваши Writing и Speaking.',
  },
  'fb.criteria.foot': {
    en: 'Our AI uses these published descriptors to guide its assessments. IELTS does not endorse this platform or issue our practice estimates.',
    ru: 'Наш ИИ опирается на эти опубликованные критерии при оценке. IELTS не одобряет эту платформу и не выдаёт наши учебные оценки.',
  },

  /* Free and paid (PricingPlans.astro). Alex, 1 October 2026: every lesson
     is free with an account; practice and guidance are one price for 30
     days, which simply end (no automatic renewal), with no refunds after
     purchase. Buying is possible only where the build has a payments
     Worker; elsewhere the button stays unavailable and the page says so. */
  'price.title': {
    en: 'Every lesson, free.<br /><span>Guidance when you want it.</span>',
    ru: 'Все уроки бесплатно.<br /><span>Сопровождение, когда оно нужно.</span>',
  },
  'price.lead': {
    en: 'Create a free account to read every lesson.<br />Add practice and guidance for 30 days whenever you are ready.',
    ru: 'Создайте бесплатный аккаунт, чтобы читать все уроки.<br />Добавьте практику и сопровождение на 30 дней, когда будете готовы.',
  },
  'price.compare': { en: 'What is free and what is paid', ru: 'Что бесплатно, а что платно' },
  'price.free.label': { en: 'Free account', ru: 'Бесплатный аккаунт' },
  'price.free.title': { en: 'Every lesson', ru: 'Все уроки' },
  'price.free.amount': { en: 'Free <small>with an account, no payment card</small>', ru: 'Бесплатно <small>с аккаунтом, без банковской карты</small>' },
  'price.free.1': {
    en: 'Every lesson for Reading, Listening, Writing and Speaking',
    ru: 'Все уроки по Reading, Listening, Writing и Speaking',
  },
  'price.free.2': { en: 'Worked examples and each lesson’s own short quiz', ru: 'Разобранные примеры и короткий тест к каждому уроку' },
  'price.free.3': { en: 'Vocabulary topic lists and word tables', ru: 'Тематические списки слов и таблицы лексики' },
  'price.free.4': { en: 'The course map and your progress through the lessons', ru: 'Карта курса и ваш прогресс по урокам' },
  'price.paid.label': { en: 'Practice and guidance', ru: 'Практика и сопровождение' },
  'price.paid.title': { en: 'Practise, get feedback, follow your plan', ru: 'Практика, разбор и личный план' },
  'price.paid.amount': { en: '{oneMonth} <small>for 30 days, paid once</small>', ru: '{oneMonth} <small>за 30 дней, оплата один раз</small>' },
  'price.paid.1': {
    en: 'Every practice exercise and timed test, with band estimates',
    ru: 'Все упражнения и тесты на время, с примерной оценкой балла',
  },
  'price.paid.2': {
    en: '12 essay assessments and 6 recorded Speaking assessments',
    ru: '12 проверок эссе и 6 проверок записей Speaking',
  },
  'price.paid.3': {
    en: '2 live interviews with the AI examiner, with feedback',
    ru: '2 устных собеседования с ИИ-экзаменатором, с разбором',
  },
  'price.paid.4': { en: '2 full mock exams and the placement test', ru: '2 полных пробных экзамена и вступительный тест' },
  'price.paid.5': {
    en: 'Mr EZ, your personal AI tutor, and your personal study plan',
    ru: 'Mr EZ, ваш личный ИИ-репетитор, и ваш личный учебный план',
  },
  'price.paid.small': {
    en: 'No automatic renewal: access simply ends after 30 days. No refunds after purchase. Recorded Speaking assessments last up to 5 minutes and live interviews up to 15. The placement test is once per account. Essays written in a mock exam or the placement test count towards the 12. Unused assessments expire with the 30 days. Mr EZ allows 40 chat messages and 60 lesson-help requests a day.',
    ru: 'Без автоматического продления: доступ просто заканчивается через 30 дней. После покупки деньги не возвращаются. Запись Speaking длится до 5 минут, устное собеседование до 15 минут. Вступительный тест проходят один раз на аккаунт. Эссе в пробном экзамене и во вступительном тесте входят в 12 проверок. Неиспользованные проверки сгорают через 30 дней. Mr EZ: 40 сообщений в чате и 60 запросов помощи в уроках в день.',
  },
  'price.paid.cta': { en: 'Get practice and guidance', ru: 'Подключить практику и сопровождение' },
  'price.status': {
    en: '30 days, no automatic renewal, no refunds after purchase. Buying is not switched on yet.',
    ru: '30 дней, без автоматического продления, без возврата денег после покупки. Покупка пока недоступна.',
  },
  'price.status.open': {
    en: '30 days, no automatic renewal, no refunds after purchase. Check what is included before you buy.',
    ru: '30 дней, без автоматического продления, без возврата денег после покупки. Перед покупкой проверьте, что входит в доступ.',
  },
  'price.plans': { en: 'See the plans', ru: 'Посмотреть тарифы' },

  /* Questions (FAQ). */
  'faq.note': { en: 'Before your first step', ru: 'Перед первым шагом' },
  'faq.title': { en: 'A few things<br />you might wonder.', ru: 'Несколько вопросов,<br />которые могут возникнуть.' },
  'faq.free.q': { en: 'What is free?', ru: 'Что бесплатно?' },
  'faq.free.a': {
    en: 'Every lesson, with an account: the explanations, worked examples, each lesson’s short quiz and the vocabulary lists, for all four IELTS papers. Creating the account is free and needs no payment card.',
    ru: 'Все уроки, с аккаунтом: объяснения, разобранные примеры, короткий тест к каждому уроку и списки слов по всем четырём частям IELTS. Аккаунт создаётся бесплатно, банковская карта не нужна.',
  },
  'faq.paid.q': { en: 'What is paid, and why?', ru: 'Что платно и почему?' },
  'faq.paid.a': {
    en: 'Practice and guidance: practice exercises and timed tests with band estimates, AI feedback on essays and recorded Speaking, live interviews with the AI examiner, full mock exams, the placement test, Mr EZ and the practice in your personal study plan. They are paid because every AI check and every conversation costs real money to run. That is what lets the lessons stay free.',
    ru: 'Практика и сопровождение: упражнения и тесты на время с оценкой балла, разбор эссе и записей Speaking от ИИ, устные собеседования с ИИ-экзаменатором, полные пробные экзамены, вступительный тест, Mr EZ и практика из вашего личного учебного плана. Они платные, потому что каждая проверка ИИ и каждый разговор стоят реальных денег. Благодаря этому уроки остаются бесплатными.',
  },
  'faq.cost.q': { en: 'How much do practice and guidance cost?', ru: 'Сколько стоят практика и сопровождение?' },
  'faq.cost.a': {
    en: '30 days cost {oneMonth}, paid once. Your lessons stay free with your account whether or not you buy.',
    ru: '30 дней стоят {oneMonth}, оплата один раз. Уроки остаются бесплатными с аккаунтом, даже если вы ничего не покупаете.',
  },
  'faq.renewal.q': { en: 'Does it renew automatically?', ru: 'Продлевается ли доступ автоматически?' },
  'faq.renewal.a': {
    en: 'No. Access lasts 30 days and then simply ends, so you are never charged automatically. You can buy again whenever you like. If your access is still running, the new 30 days start when it ends.',
    ru: 'Нет. Доступ действует 30 дней и просто заканчивается, поэтому автоматических списаний не бывает. Купить снова можно в любой момент. Если доступ ещё действует, новые 30 дней начнутся, когда он закончится.',
  },
  'faq.refund.q': { en: 'Can I get a refund?', ru: 'Можно ли вернуть деньги?' },
  'faq.refund.a': {
    en: 'No. Payments are not refunded after purchase. Every lesson is free with an account, so you can see how the course teaches before you decide. The purchase terms have the details.',
    ru: 'Нет. После покупки деньги не возвращаются. Все уроки бесплатны с аккаунтом, поэтому до решения вы можете посмотреть, как устроено обучение. Подробности в правилах покупки.',
  },
  'faq.unlimited.q': { en: 'Is AI practice unlimited?', ru: 'Практика с ИИ без ограничений?' },
  'faq.unlimited.a': {
    en: 'No. Each 30 days include 12 essay assessments, 6 recorded Speaking assessments (up to 5 minutes each), 2 live interviews with feedback (up to 15 minutes each), 2 full mock exams, and the placement test once per account. Essays written in a mock exam or the placement test count towards the 12. Unused assessments expire with the 30 days. Reading and Listening practice has no limit. Mr EZ allows 40 chat messages and 60 lesson-help requests a day.',
    ru: 'Нет. За 30 дней: 12 проверок эссе, 6 проверок записей Speaking до 5 минут, 2 устных собеседования с разбором до 15 минут, 2 полных пробных экзамена и вступительный тест, один раз на аккаунт. Эссе в пробном экзамене и во вступительном тесте входят в 12 проверок. Неиспользованные проверки сгорают через 30 дней. Практика Reading и Listening без ограничений. Mr EZ: 40 сообщений в чате и 60 запросов помощи в уроках в день.',
  },
  'faq.account.q': { en: 'Do I need an account to read the lessons?', ru: 'Нужен ли аккаунт, чтобы читать уроки?' },
  'faq.account.a': {
    en: 'Yes. Lessons open with a free account, which also keeps your progress and shows it on your other devices. You can read this page without one.',
    ru: 'Да. Уроки открываются с бесплатным аккаунтом, который ещё и сохраняет ваш прогресс и показывает его на других устройствах. Эту страницу можно читать без аккаунта.',
  },
  'faq.academic.q': { en: 'Which IELTS is it for?', ru: 'Для какого IELTS эта подготовка?' },
  'faq.academic.a': {
    en: 'Academic IELTS. The lessons, practice and band estimates are built around the Academic test.',
    ru: 'Для Academic IELTS. Уроки, практика и оценка балла построены вокруг формата Academic.',
  },
  'faq.official.q': { en: 'Is the AI feedback an official IELTS score?', ru: 'Является ли разбор от ИИ официальным баллом IELTS?' },
  'faq.official.a': {
    en: 'No. Writing and speaking feedback includes estimated practice bands and suggestions for improvement. Only an official IELTS test can give you an official result.',
    ru: 'Нет. Разбор Writing и Speaking содержит примерные учебные баллы и советы по улучшению. Официальный результат может дать только официальный экзамен IELTS.',
  },
  'faq.exam.q': { en: 'Can I practise under exam conditions?', ru: 'Можно ли тренироваться в условиях экзамена?' },
  'faq.exam.a': {
    en: 'Yes, with practice and guidance: timed Reading and Listening tests, full mock exams, and separate Writing and Speaking assessments. Guided trainers keep teaching help nearby; tests let you practise independently.',
    ru: 'Да, с практикой и сопровождением: тесты Reading и Listening на время, полные пробные экзамены и отдельные проверки Writing и Speaking. В тренажёрах подсказки всегда рядом, а в тестах вы работаете самостоятельно.',
  },
  'faq.phone.q': { en: 'Can I use it on my phone?', ru: 'Можно ли заниматься с телефона?' },
  'faq.phone.a': {
    en: 'Yes. Lessons and practice pages work on a phone. For longer writing tasks, you may find a laptop more comfortable. Speaking practice needs microphone permission.',
    ru: 'Да. Уроки и практика работают на телефоне. Для длинных письменных заданий удобнее ноутбук. Для практики Speaking нужен доступ к микрофону.',
  },
  'faq.speed.q': { en: 'How quickly will I get feedback?', ru: 'Как быстро приходит разбор?' },
  'faq.speed.a': {
    en: 'Exercise checks give you an immediate result. AI writing and recorded speaking assessments process your submission before showing the report, so the wait depends on its length and service availability. You do not need to book a marking session.',
    ru: 'Упражнения проверяются сразу. Проверке Writing и записанного Speaking с помощью ИИ нужно время на обработку до показа отчёта, поэтому ожидание зависит от объёма работы и доступности сервиса. Записываться на проверку не нужно.',
  },

  /* Closing section and footer. */
  'close.note': { en: 'Your next chapter is yours to write.', ru: 'Следующую главу пишете вы.' },
  'close.title': {
    en: 'Your next chapter.<br />Start with a free lesson.',
    ru: 'Ваша следующая глава.<br />Начните с бесплатного урока.',
  },
  'close.lead': {
    en: 'Create a free account and read every lesson.<br />No payment card required.',
    ru: 'Создайте бесплатный аккаунт и читайте все уроки.<br />Банковская карта не нужна.',
  },
  'close.signIn': { en: 'Already have an account? Sign in.', ru: 'Уже есть аккаунт? Войти.' },
  'foot.tagline': { en: 'A little guidance.<br />A world of possibility.', ru: 'Немного подсказки.<br />Целый мир возможностей.' },
  'foot.nav': { en: 'Footer navigation', ru: 'Навигация внизу страницы' },
  'foot.teach': { en: 'How we teach', ru: 'Как мы учим' },
  'foot.ez': { en: 'Meet Mr EZ', ru: 'Знакомьтесь: Mr EZ' },
  'foot.questions': { en: 'Questions', ru: 'Вопросы' },
  'foot.privacy': { en: 'Privacy', ru: 'Конфиденциальность' },
  'foot.terms': { en: 'Terms', ru: 'Условия' },
  'foot.support': { en: 'Ask a person', ru: 'Спросить человека' },
  'foot.independent': {
    en: 'Independent preparation. Not affiliated with or endorsed by IELTS.',
    ru: 'Независимая подготовка. Мы не связаны с IELTS и не получали его одобрения.',
  },
  'foot.top': { en: 'Back to top', ru: 'Наверх' },
} satisfies Record<string, Bilingual>;

export type SalesKey = keyof typeof SALES_COPY;

export function isSalesKey(key: string): key is SalesKey {
  return Object.prototype.hasOwnProperty.call(SALES_COPY, key);
}

/** Tenge in each language's own style: ₸10,000 in English, 10 000 ₸ in Russian. */
export function tenge(amount: number, locale: SalesLocale): string {
  return locale === 'ru' ? `${amount.toLocaleString('ru-RU')} ₸` : `₸${amount.toLocaleString('en-US')}`;
}

/** The values the copy's {placeholders} stand for, in one language. The
    prices are the plans' own (src/lib/access/plans.ts), never re-typed. */
export function salesVars(locale: SalesLocale): Record<string, string> {
  const oneMonth = paidPlan('month-1')!.amount;
  const threeMonths = paidPlan('month-3')!.amount;
  return {
    oneMonth: tenge(oneMonth, locale),
    threeMonths: tenge(threeMonths, locale),
    saving: tenge(oneMonth * 3 - threeMonths, locale),
  };
}

/** Fill `{name}` holes; an unknown name is left visible, as in t(). */
export function fill(text: string, vars: Record<string, string | number> = {}): string {
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole,
  );
}

/** One sentence of the sales page in one language, placeholders filled. */
export function salesText(key: SalesKey, locale: SalesLocale, vars?: Record<string, string | number>): string {
  const entry = SALES_COPY[key];
  const text = (locale === 'ru' ? entry.ru : entry.en) || entry.en;
  return fill(text, { ...salesVars(locale), ...vars });
}

/** The English, for the Astro components that render the page. */
export function sales(key: SalesKey, vars?: Record<string, string | number>): string {
  return salesText(key, 'en', vars);
}
