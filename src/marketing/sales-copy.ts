/* Every sentence on the public sales page, in English, Russian and Kazakh,
   side by side. Kazakh (`kk`, Builder K, 2 October 2026) is here because
   this page is the shop's advertising and price list, which Kazakh law asks
   for in Kazakh as well as Russian; an entry with no Kazakh falls back to
   the Russian, never to the English (salesText). Every Kazakh line was
   written by Claude and is listed for a native speaker's check in
   docs/legal/KAZAKH-REVIEW.md.

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
   one price for 30 days, no automatic renewal. There is no free trial.
   Refunds (Alex, 2 October 2026, replacing "no refunds after purchase"): a
   refund of the unused share on request at any time during the 30 days,
   the used share being the larger of the days started and the AI
   assessments used (src/lib/legal/refund.ts; the full rule and its worked
   example are on the public offer, /terms#refunds). Nothing here promises
   free practice to the public: students Alex teaches get theirs from him
   directly.

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
import { intlLocale } from '../lib/i18n/locale';

export type SalesLocale = 'en' | 'ru' | 'kk';

/** One sentence in every language the sales page speaks. The name is kept
    from when it had two. */
export interface Bilingual {
  en: string;
  ru: string;
  kk: string;
}

export const SALES_COPY = {
  /* Page metadata. */
  'meta.title': {
    en: 'IELTS is EZ | Open the gates to your future',
    ru: 'IELTS is EZ | Откройте ворота в своё будущее',
    kk: 'IELTS is EZ | Болашағыңыздың қақпасын ашыңыз',
  },
  'meta.description': {
    en: 'Every IELTS lesson is free with an account. Practice, timed tests, AI feedback and Mr EZ cost {oneMonth} for 30 days, with no automatic renewal.',
    ru: 'Все уроки IELTS бесплатны с аккаунтом. Практика, тесты на время, разбор от ИИ и Mr EZ стоят {oneMonth} за 30 дней, без автоматического продления.',
    kk: 'Аккаунтпен IELTS-тің барлық сабағы тегін. Практика, уақыты шектелген тесттер, ЖИ талдауы және Mr EZ 30 күнге {oneMonth} тұрады, автоматты ұзартусыз.',
  },
  'skip': { en: 'Skip to content', ru: 'Перейти к содержанию', kk: 'Мазмұнға өту' },
  'review.note': {
    en: 'Sales page preview: prices and terms are agreed. Payment is not connected yet.',
    ru: 'Предварительная версия страницы: цены и условия согласованы, оплата пока не подключена.',
    kk: 'Беттің алдын ала нұсқасы: бағалар мен шарттар келісілген, төлем әлі қосылмаған.',
  },

  /* Header and language switch. */
  'nav.home': { en: 'IELTS is EZ home', ru: 'IELTS is EZ, на главную', kk: 'IELTS is EZ, басты бетке' },
  'nav.main': { en: 'Main navigation', ru: 'Основное меню', kk: 'Негізгі мәзір' },
  'nav.tutor': { en: 'AI tutor', ru: 'ИИ-репетитор', kk: 'ЖИ тәлімгер' },
  'nav.feedback': { en: 'AI feedback', ru: 'Разбор от ИИ', kk: 'ЖИ талдауы' },
  'nav.inside': { en: 'Inside the platform', ru: 'Внутри платформы', kk: 'Платформаның іші' },
  'nav.plan': { en: 'Your plan', ru: 'Ваш план', kk: 'Сіздің жоспарыңыз' },
  'nav.pricing': { en: 'Pricing', ru: 'Цены', kk: 'Бағалар' },
  'nav.signIn': { en: 'Sign in', ru: 'Войти', kk: 'Кіру' },
  // Every way in: the sign-up page (carrying the questionnaire's answers once chosen).
  'nav.signUp': { en: 'Create a free account', ru: 'Создать бесплатный аккаунт', kk: 'Тегін аккаунт ашу' },
  // The header's own copy of it on a phone, where it shares the width with
  // the logo, the language switch and the menu (the full words wrap to three
  // lines in Russian at 320 pixels, and anything longer than one short word
  // pushes the page sideways there). Same link, same destination; the hero
  // line just below says the account is free.
  'nav.signUpShort': { en: 'Start for free', ru: 'Начать бесплатно', kk: 'Тегін бастау' },
  'nav.menuOpen': { en: 'Open menu', ru: 'Открыть меню', kk: 'Мәзірді ашу' },
  'nav.menuClose': { en: 'Close menu', ru: 'Закрыть меню', kk: 'Мәзірді жабу' },
  'lang.group': { en: 'Language', ru: 'Язык', kk: 'Тіл' },

  /* Hero: the gates. */
  'hero.label': { en: 'Every IELTS lesson free with an account', ru: 'Все уроки IELTS бесплатно с аккаунтом', kk: 'Аккаунтпен IELTS-тің барлық сабағы тегін' },
  'hero.title': {
    en: 'Open the gates<br />to <em>your future.</em>',
    ru: 'Откройте ворота<br />в <em>своё будущее.</em>',
    kk: 'Болашағыңыздың<br /><em>қақпасын ашыңыз.</em>',
  },
  'hero.bar': {
    en: 'IELTS is EZ <span class="bar-divider">/</span> Your study space',
    ru: 'IELTS is EZ <span class="bar-divider">/</span> Ваше учебное пространство',
    kk: 'IELTS is EZ <span class="bar-divider">/</span> Сіздің оқу кеңістігіңіз',
  },
  'hero.preview': { en: 'Platform preview', ru: 'Так выглядит платформа', kk: 'Платформа осылай көрінеді' },
  'hero.alt': {
    en: 'The real IELTS is EZ lesson library, with Reading, Writing, Speaking and Listening lessons',
    ru: 'Настоящая библиотека уроков IELTS is EZ: уроки по Reading, Writing, Speaking и Listening',
    kk: 'IELTS is EZ сабақтарының нағыз кітапханасы: Reading, Writing, Speaking және Listening сабақтары',
  },
  'hero.open': { en: 'Your study space', ru: 'Ваше учебное пространство', kk: 'Сіздің оқу кеңістігіңіз' },

  /* Product demos (SalesDemo.astro). */
  'demo.title': {
    en: 'A big ambition.<br /><span>A practical way forward.</span>',
    ru: 'Большая цель.<br /><span>Понятный путь к ней.</span>',
    kk: 'Үлкен мақсат.<br /><span>Оған апаратын түсінікті жол.</span>',
  },
  'demo.lead': {
    en: 'Prepare for Academic IELTS 7.5+ with guided practice, AI feedback, and a clear next step.',
    ru: 'Готовьтесь к Academic IELTS на 7.5+ с пошаговой практикой, разбором от ИИ и понятным следующим шагом.',
    kk: 'Academic IELTS-ке 7.5+ балға қадамдық практикамен, ЖИ талдауымен және түсінікті келесі қадаммен дайындалыңыз.',
  },
  'demo.tabs': { en: 'See how IELTS is EZ works', ru: 'Как работает IELTS is EZ', kk: 'IELTS is EZ қалай жұмыс істейді' },
  'demo.note': {
    en: 'Actual platform screenshots, captured in preview mode. No live AI session is running here.',
    ru: 'Настоящие снимки экрана платформы в режиме предпросмотра. Живой сессии с ИИ здесь нет.',
    kk: 'Платформаның алдын ала қарау режимінде түсірілген нағыз скриншоттары. Мұнда ЖИ-мен тікелей сессия жүріп жатқан жоқ.',
  },
  'demo.speaking.label': { en: 'Practise speaking', ru: 'Практика Speaking', kk: 'Speaking практикасы' },
  'demo.speaking.title': { en: 'Say it out loud. Find your confidence.', ru: 'Говорите вслух. Обретайте уверенность.', kk: 'Дауыстап айтыңыз. Сенімділікке ие болыңыз.' },
  'demo.speaking.text': {
    en: 'Work through an IELTS-style conversation with the AI examiner. Keep answer structures and useful phrases beside you while you practise.',
    ru: 'Пройдите беседу в формате IELTS с ИИ-экзаменатором. Структуры ответов и полезные фразы всё время под рукой.',
    kk: 'ЖИ емтихан алушысымен IELTS форматындағы әңгімеден өтіңіз. Жауап құрылымдары мен пайдалы сөз тіркестері үнемі қол астыңызда.',
  },
  'demo.speaking.alt': {
    en: 'Speaking trainer showing a Part 2 cue card, notes and examiner controls',
    ru: 'Тренажёр Speaking: карточка Part 2, заметки и управление экзаменатором',
    kk: 'Speaking тренажері: Part 2 тапсырма карточкасы, жазбалар және емтихан алушыны басқару',
  },
  'demo.coach.label': { en: 'Get a little guidance', ru: 'Подсказки', kk: 'Кеңестер' },
  'demo.coach.title': { en: 'A method to use when you get stuck.', ru: 'Метод на случай, когда вы застряли.', kk: 'Тығырыққа тірелгенде қолданатын әдіс.' },
  'demo.coach.text': {
    en: 'Open the coach beside your practice. See how to organise an answer, choose useful language and avoid common mistakes.',
    ru: 'Откройте подсказки рядом с заданием: как выстроить ответ, какие фразы использовать и каких ошибок избегать.',
    kk: 'Тапсырманың жанынан кеңестерді ашыңыз: жауапты қалай құру керек, қандай сөз тіркестерін қолдану керек және қандай қателерден сақтану керек.',
  },
  'demo.coach.alt': {
    en: 'Speaking coach with answer planning, phrases, vocabulary and common mistakes',
    ru: 'Подсказки для Speaking: план ответа, фразы, лексика и типичные ошибки',
    kk: 'Speaking бойынша кеңестер: жауап жоспары, сөз тіркестері, лексика және жиі кездесетін қателер',
  },
  'demo.lessons.label': { en: 'Learn the method', ru: 'Уроки', kk: 'Сабақтар' },
  'demo.lessons.title': { en: 'Know what to practise next.', ru: 'Знайте, что тренировать дальше.', kk: 'Ары қарай нені жаттықтыру керек екенін біліңіз.' },
  'demo.lessons.text': {
    en: 'Explore clear lessons for all four IELTS skills. Learn a method, work through the exercises, then put it to use in practice.',
    ru: 'Понятные уроки по всем четырём частям IELTS. Изучите метод, выполните упражнения и примените его на практике.',
    kk: 'IELTS-тің төрт бөлімі бойынша түсінікті сабақтар. Әдісті үйреніп, жаттығуларды орындаңыз да, оны практикада қолданыңыз.',
  },
  'demo.lessons.alt': {
    en: 'IELTS lesson library with lessons organised by skill',
    ru: 'Библиотека уроков IELTS, разделённая по навыкам',
    kk: 'Дағдылар бойынша бөлінген IELTS сабақтарының кітапханасы',
  },
  'demo.speaking.zoom': {
    en: 'View full-size screenshot: Speaking trainer showing a Part 2 cue card, notes and examiner controls',
    ru: 'Открыть снимок экрана целиком: тренажёр Speaking с карточкой Part 2, заметками и управлением экзаменатором',
    kk: 'Скриншотты толық ашу: Part 2 тапсырма карточкасы, жазбалары және емтихан алушыны басқаруы бар Speaking тренажері',
  },
  'demo.coach.zoom': {
    en: 'View full-size screenshot: Speaking coach with answer planning, phrases, vocabulary and common mistakes',
    ru: 'Открыть снимок экрана целиком: подсказки для Speaking с планом ответа, фразами, лексикой и типичными ошибками',
    kk: 'Скриншотты толық ашу: жауап жоспары, сөз тіркестері, лексика және жиі кездесетін қателері бар Speaking кеңестері',
  },
  'demo.lessons.zoom': {
    en: 'View full-size screenshot: IELTS lesson library with lessons organised by skill',
    ru: 'Открыть снимок экрана целиком: библиотека уроков IELTS, разделённая по навыкам',
    kk: 'Скриншотты толық ашу: дағдылар бойынша бөлінген IELTS сабақтарының кітапханасы',
  },

  /* The questionnaire (QuestionJourney.astro, src/scripts/question-journey.ts). */
  'journey.note': { en: 'Your ambition. Your starting point.', ru: 'Ваша цель. Ваша отправная точка.', kk: 'Сіздің мақсатыңыз. Сіздің бастау нүктеңіз.' },
  'journey.title': {
    en: 'A big dream.<br /><span>A plan that feels like you.</span>',
    ru: 'Большая мечта.<br /><span>План, который подходит именно вам.</span>',
    kk: 'Үлкен арман.<br /><span>Дәл сізге лайық жоспар.</span>',
  },
  'journey.lead': {
    en: 'Choose an answer to move to the next question. Your plan is waiting at the end.',
    ru: 'Выберите ответ, чтобы перейти к следующему вопросу. В конце вас ждёт ваш план.',
    kk: 'Келесі сұраққа өту үшін жауапты таңдаңыз. Соңында сізді жоспарыңыз күтіп тұр.',
  },
  'journey.skip': { en: 'Just exploring? Take a look inside', ru: 'Просто знакомитесь? Загляните внутрь', kk: 'Жай танысып жүрсіз бе? Ішіне қараңыз' },
  'journey.answers': { en: 'Your answers', ru: 'Ваши ответы', kk: 'Сіздің жауаптарыңыз' },
  'journey.chip.band': { en: 'Goal', ru: 'Цель', kk: 'Мақсат' },
  'journey.chip.skill': { en: 'Section', ru: 'Часть', kk: 'Бөлім' },
  'journey.chip.focus': { en: 'Focus', ru: 'Фокус', kk: 'Назар' },
  'journey.chip.time': { en: 'Daily time', ru: 'Время в день', kk: 'Күніне уақыт' },
  'journey.step.band': { en: '01 / YOUR GOAL', ru: '01 / Ваша цель', kk: '01 / Сіздің мақсатыңыз' },
  'journey.step.skill': { en: '02 / YOUR CHALLENGE', ru: '02 / Главная трудность', kk: '02 / Басты қиындық' },
  'journey.step.focus': { en: '03 / YOUR FOCUS', ru: '03 / Ваш фокус', kk: '03 / Сіздің назарыңыз' },
  'journey.step.time': { en: '04 / YOUR PACE', ru: '04 / Ваш темп', kk: '04 / Сіздің қарқыныңыз' },
  'journey.q.band': { en: 'What are you aiming for?', ru: 'К какому баллу вы стремитесь?', kk: 'Қандай балға ұмтыласыз?' },
  'journey.n.band': { en: 'Start with the destination.', ru: 'Начнём с цели.', kk: 'Мақсаттан бастайық.' },
  'journey.o.band.7': { en: 'Band 7.0', ru: 'Балл 7.0', kk: 'Band 7.0' },
  'journey.d.band.7': { en: 'A strong next step', ru: 'Уверенный следующий шаг', kk: 'Сенімді келесі қадам' },
  'journey.o.band.7.5': { en: 'Band 7.5', ru: 'Балл 7.5', kk: 'Band 7.5' },
  'journey.d.band.7.5': { en: 'Room for bigger plans', ru: 'Простор для больших планов', kk: 'Үлкен жоспарларға жол' },
  'journey.o.band.8': { en: 'Band 8.0+', ru: 'Балл 8.0+', kk: 'Band 8.0+' },
  'journey.d.band.8': { en: 'Aim a little higher', ru: 'Цель чуть выше', kk: 'Сәл жоғарырақ мақсат' },
  'journey.q.skill': { en: 'Which section feels hardest?', ru: 'Какая часть даётся труднее всего?', kk: 'Қай бөлім ең қиын?' },
  'journey.n.skill': { en: 'We will start where a little support matters most.', ru: 'Начнём там, где поддержка нужнее всего.', kk: 'Қолдау ең керек жерден бастаймыз.' },
  'journey.o.skill.speaking': { en: 'Speaking', ru: 'Speaking', kk: 'Speaking' },
  'journey.d.skill.speaking': { en: 'Finding the words out loud', ru: 'Подобрать слова, когда говорите вслух', kk: 'Дауыстап сөйлегенде сөз табу' },
  'journey.o.skill.writing': { en: 'Writing', ru: 'Writing', kk: 'Writing' },
  'journey.d.skill.writing': { en: 'Turning ideas into an answer', ru: 'Превратить идеи в ответ', kk: 'Ойды жауапқа айналдыру' },
  'journey.o.skill.reading': { en: 'Reading', ru: 'Reading', kk: 'Reading' },
  'journey.d.skill.reading': { en: 'Finding the right evidence', ru: 'Найти в тексте нужное подтверждение', kk: 'Мәтіннен керек дәлелді табу' },
  'journey.o.skill.listening': { en: 'Listening', ru: 'Listening', kk: 'Listening' },
  'journey.d.skill.listening': { en: 'Keeping up with the recording', ru: 'Успевать за записью', kk: 'Жазбаның қарқынынан қалмау' },
  'journey.q.focus': { en: 'What gets in your way?', ru: 'Что вам мешает?', kk: 'Сізге не кедергі?' },
  'journey.n.focus': { en: 'Choose the one you would most like to change.', ru: 'Выберите то, что хочется изменить в первую очередь.', kk: 'Ең алдымен өзгерткіңіз келетінін таңдаңыз.' },
  'journey.o.focus.method': { en: 'Knowing how to answer', ru: 'Не знаю, как отвечать', kk: 'Қалай жауап беру керегін білмеймін' },
  'journey.d.focus.method': { en: 'I need a clear method', ru: 'Мне нужен понятный метод', kk: 'Маған түсінікті әдіс керек' },
  'journey.o.focus.confidence': { en: 'Putting it into practice', ru: 'Трудно применить на практике', kk: 'Практикада қолдану қиын' },
  'journey.d.focus.confidence': { en: 'I know the basics, but get stuck', ru: 'Основы знаю, но застреваю', kk: 'Негізін білемін, бірақ тұйыққа тірелемін' },
  'journey.q.time': { en: 'What fits into your day?', ru: 'Сколько времени у вас есть в день?', kk: 'Күніне қанша уақытыңыз бар?' },
  'journey.n.time': {
    en: 'A routine you can return to is a good place to begin.',
    ru: 'Хорошее начало: привычка, к которой легко возвращаться.',
    kk: 'Жақсы бастама: оңай қайта оралатын әдет.',
  },
  'journey.o.time.15': { en: '15 minutes', ru: '15 минут', kk: '15 минут' },
  'journey.d.time.15': { en: 'A small daily step', ru: 'Небольшой шаг каждый день', kk: 'Күн сайын шағын қадам' },
  'journey.o.time.30': { en: '30 minutes', ru: '30 минут', kk: '30 минут' },
  'journey.d.time.30': { en: 'Time to practise and reflect', ru: 'Время потренироваться и подумать', kk: 'Жаттығуға және ойлануға уақыт' },
  'journey.o.time.60': { en: '60 minutes', ru: '60 минут', kk: '60 минут' },
  'journey.d.time.60': { en: 'Recommended by your teacher', ru: 'Рекомендация преподавателя', kk: 'Мұғалімнің ұсынысы' },
  'journey.result.note': {
    en: 'Where to start',
    ru: 'С чего начать',
    kk: 'Неден бастау керек',
  },
  'journey.result.title': { en: 'Make your goal a daily habit.', ru: 'Превратите цель в ежедневную привычку.', kk: 'Мақсатыңызды күнделікті әдетке айналдырыңыз.' },
  'journey.result.lead': {
    en: 'Four choices. Two lessons to start with.',
    ru: 'Четыре ответа. Два урока для старта.',
    kk: 'Төрт жауап. Бастауға екі сабақ.',
  },
  'journey.action.title': {
    en: 'Start with these lessons.',
    ru: 'Начните с этих уроков.',
    kk: 'Осы сабақтардан бастаңыз.',
  },
  'journey.action.text': {
    en: 'Create a free account to open them. Every lesson is free. Practice tests, feedback on your answers and Mr EZ come with practice and guidance.',
    ru: 'Создайте бесплатный аккаунт, чтобы открыть их. Все уроки бесплатны. Тесты, разбор ваших ответов и Mr EZ входят в доступ «практика и сопровождение».',
    kk: 'Оларды ашу үшін тегін аккаунт ашыңыз. Барлық сабақ тегін. Тесттер, жауаптарыңыздың талдауы және Mr EZ «практика және сүйемелдеу» қолжетімділігіне кіреді.',
  },
  'journey.disclaimer': {
    en: 'A suggestion from your answers, not a level assessment. Your answers go with you when you sign up, and you can change them.',
    ru: 'Это подсказка по вашим ответам, а не оценка уровня. Ответы перейдут в ваш аккаунт, и их можно изменить.',
    kk: 'Бұл жауаптарыңызға негізделген кеңес, деңгейді бағалау емес. Тіркелгенде жауаптарыңыз аккаунтыңызға көшеді, оларды өзгертуге болады.',
  },
  'journey.placeholder': {
    en: 'Choose your goal, your hardest section and your daily pace. The lessons to start with will appear here.',
    ru: 'Выберите цель, самую трудную часть и темп на день. Здесь появятся уроки, с которых стоит начать.',
    kk: 'Мақсатыңызды, ең қиын бөлімді және күндік қарқыныңызды таңдаңыз. Бастауға тұрарлық сабақтар осында пайда болады.',
  },
  'journey.placeholder.cta': { en: 'Find my starting point', ru: 'Найти мою точку старта', kk: 'Бастау нүктемді табу' },

  /* Sentences the questionnaire script writes (src/scripts/question-journey.ts). */
  'journey.progress': {
    en: '{count} of 4 choices made. Finish the questions to see where to start.',
    ru: 'Выбрано ответов: {count} из 4. Ответьте на все вопросы, чтобы увидеть, с чего начать.',
    kk: 'Таңдалған жауаптар: 4 ішінен {count}. Неден бастау керегін көру үшін барлық сұраққа жауап беріңіз.',
  },
  'journey.plan.title': {
    en: 'For Band {band}, start here.',
    ru: 'Для балла {band} начните здесь.',
    kk: 'Band {band} үшін осы жерден бастаңыз.',
  },
  'journey.plan.lead': {
    en: 'You chose {skill} as the hardest section. These two lessons help most with {focus}.',
    ru: 'Самой трудной частью вы выбрали {skill}. Эти два урока больше всего помогут {focus}.',
    kk: 'Ең қиын бөлім ретінде {skill} таңдадыңыз. Мына екі сабақ ең алдымен мынаған көмектеседі: {focus}.',
  },
  'journey.plan.label': { en: '{skill} / {time} minutes a day', ru: '{skill} / {time} минут в день', kk: '{skill} / күніне {time} минут' },
  'journey.plan.focus.method': { en: 'A clear method', ru: 'Понятный метод', kk: 'Түсінікті әдіс' },
  /* {focus} in journey.plan.lead. */
  'journey.plan.help.method': { en: 'knowing how to answer', ru: 'понять, как отвечать', kk: 'қалай жауап беру керегін түсіну' },
  'journey.plan.help.confidence': { en: 'putting it into practice', ru: 'применить знания на практике', kk: 'білімді практикада қолдану' },
  'journey.plan.focus.confidence': { en: 'More confident practice', ru: 'Более уверенная практика', kk: 'Сенімдірек практика' },
  /* The tag on each suggested lesson. */
  'journey.plan.free': { en: 'Free lesson', ru: 'Бесплатный урок', kk: 'Тегін сабақ' },

  /* Mr EZ. */
  'ez.alt': {
    en: 'Mr EZ, your friendly AI tutor, wearing glasses and a forest-green hoodie with orange Mr EZ lettering.',
    ru: 'Mr EZ, ваш дружелюбный ИИ-репетитор, в очках и тёмно-зелёном худи с оранжевой надписью Mr EZ.',
    kk: 'Mr EZ, сіздің мейірімді ЖИ тәлімгеріңіз, көзілдірік киген, қызғылт сары Mr EZ жазуы бар қою жасыл худи киген.',
  },
  'ez.name': { en: 'Mr EZ <small>Your AI study companion</small>', ru: 'Mr EZ <small>Ваш ИИ-помощник в учёбе</small>', kk: 'Mr EZ <small>Оқудағы ЖИ көмекшіңіз</small>' },
  'ez.note': { en: 'A little guidance. A lot more clarity.', ru: 'Немного подсказки. Гораздо больше ясности.', kk: 'Аздаған кеңес. Әлдеқайда көп айқындық.' },
  'ez.title': {
    en: 'Meet Mr EZ.<br /><span>Your next step, <br />made clearer.</span>',
    ru: 'Знакомьтесь: Mr EZ.<br /><span>Ваш следующий шаг <br />станет понятнее.</span>',
    kk: 'Танысыңыз: Mr EZ.<br /><span>Келесі қадамыңыз <br />түсініктірек болады.</span>',
  },
  'ez.lead': {
    en: 'Getting a score is one thing. Knowing what to do next is another. Mr EZ is your AI tutor, here to help you understand your practice and keep moving towards your goal.',
    ru: 'Получить балл и понять, что делать дальше, не одно и то же. Mr EZ, ваш ИИ-репетитор, поможет разобраться в результатах практики и не останавливаться на пути к цели.',
    kk: 'Балл алу бір бөлек, ары қарай не істеу керегін түсіну бір бөлек. ЖИ тәлімгеріңіз Mr EZ практика нәтижелерін түсінуге және мақсатқа қарай тоқтамай жүруге көмектеседі.',
  },
  'ez.example': { en: 'Example conversation with Mr EZ', ru: 'Пример разговора с Mr EZ', kk: 'Mr EZ-пен әңгіме үлгісі' },
  'ez.example.label': { en: 'Example conversation', ru: 'Пример разговора', kk: 'Әңгіме үлгісі' },
  'ez.student': {
    en: '<b>You</b>My answers are too short. What should I add?',
    ru: '<b>Вы</b>Мои ответы слишком короткие. Что добавить?',
    kk: '<b>Сіз</b>Жауаптарым тым қысқа. Не қосуым керек?',
  },
  'ez.reply': {
    en: 'Start with your answer, add a reason, then give one specific example. Try it with <span lang="en">“Do you enjoy studying with other people?”</span>',
    ru: 'Начните с ответа, добавьте причину, затем приведите один конкретный пример. Попробуйте на вопросе <span lang="en">“Do you enjoy studying with other people?”</span>',
    kk: 'Жауаптан бастаңыз, себебін қосыңыз, содан кейін бір нақты мысал келтіріңіз. Мына сұрақпен байқап көріңіз: <span lang="en">“Do you enjoy studying with other people?”</span>',
  },
  'ez.next': { en: 'Your next practice: developing a Part 1 answer.', ru: 'Следующая практика: развёрнутый ответ в Part 1.', kk: 'Келесі практика: Part 1-де толық жауап беру.' },
  'ez.disclaimer': {
    en: 'Illustrative conversation, not a live chat. Mr EZ can explain results, help with study questions and suggest relevant practice.',
    ru: 'Это пример, а не живой чат. Mr EZ объясняет результаты, отвечает на вопросы по учёбе и предлагает подходящую практику.',
    kk: 'Бұл үлгі ғана, тікелей чат емес. Mr EZ нәтижелерді түсіндіреді, оқу бойынша сұрақтарға жауап береді және сәйкес практиканы ұсынады.',
  },
  'ez.access': {
    en: 'Mr EZ comes with practice and guidance. Daily usage limits apply.',
    ru: 'Mr EZ входит в практику и сопровождение. Действуют дневные лимиты использования.',
    kk: 'Mr EZ практика мен сүйемелдеуге кіреді. Күндік пайдалану шектеулері бар.',
  },

  /* Inside the platform: the four skills. */
  'room.note': { en: 'Come on in', ru: 'Заходите', kk: 'Кіріңіз' },
  'room.title': { en: 'One space.<br />Every part of IELTS.', ru: 'Одно пространство.<br />Все части IELTS.', kk: 'Бір кеңістік.<br />IELTS-тің барлық бөлімі.' },
  'room.lead': {
    en: 'Less searching for what to study.<br />More time actually getting somewhere.',
    ru: 'Меньше поисков, что учить.<br />Больше времени на настоящий прогресс.',
    kk: 'Нені оқу керегін іздеуге аз уақыт.<br />Нақты алға жылжуға көп уақыт.',
  },
  'room.choose': { en: 'Choose a skill', ru: 'Выберите навык', kk: 'Дағдыны таңдаңыз' },
  'room.tabs': { en: 'Explore IELTS skills', ru: 'Навыки IELTS', kk: 'IELTS дағдылары' },
  'room.method': { en: 'How we teach it', ru: 'Как мы этому учим', kk: 'Біз мұны қалай үйретеміз' },
  'room.hint': { en: 'Choose a section. Find your next step.', ru: 'Выберите часть. Найдите следующий шаг.', kk: 'Бөлімді таңдаңыз. Келесі қадамыңызды табыңыз.' },
  'room.foot': {
    en: "Learn at your pace. Come back when you're ready.",
    ru: 'Учитесь в своём темпе. Возвращайтесь, когда будете готовы.',
    kk: 'Өз қарқыныңызбен оқыңыз. Дайын болғанда қайта оралыңыз.',
  },
  'skill.reading.headline': { en: 'Find the meaning. Then the answer.', ru: 'Сначала смысл. Потом ответ.', kk: 'Алдымен мағына. Содан кейін жауап.' },
  'skill.reading.text': {
    en: 'Learn to spot paraphrases, follow an argument, and find the evidence that makes an answer right.',
    ru: 'Научитесь замечать перефразирование, следить за ходом мысли и находить подтверждение, которое делает ответ верным.',
    kk: 'Перифразды байқауды, ой желісін қадағалауды және жауапты дұрыс ететін дәлелді табуды үйреніңіз.',
  },
  'skill.reading.m1': { en: 'Recognise paraphrases and question types.', ru: 'Узнавайте перефразирование и типы вопросов.', kk: 'Перифраз бен сұрақ түрлерін танып біліңіз.' },
  'skill.reading.m2': { en: 'Find the evidence in the passage.', ru: 'Находите подтверждение в тексте.', kk: 'Мәтіннен дәлел табыңыз.' },
  'skill.reading.m3': {
    en: 'Apply the method in focused exercises and timed tests.',
    ru: 'Применяйте метод в целевых упражнениях и тестах на время.',
    kk: 'Әдісті мақсатты жаттығулар мен уақыты шектелген тесттерде қолданыңыз.',
  },
  'skill.listening.headline': { en: 'Know what to listen for.', ru: 'Знайте, что слушать.', kk: 'Нені тыңдау керегін біліңіз.' },
  'skill.listening.text': {
    en: 'Predict the missing detail, follow the signposts, and catch the moment a speaker changes their mind.',
    ru: 'Предсказывайте недостающую деталь, следите за сигнальными словами и ловите момент, когда говорящий меняет решение.',
    kk: 'Жетіспейтін мәліметті алдын ала болжап, белгі сөздерді қадағалаңыз және сөйлеуші ойын өзгерткен сәтті байқаңыз.',
  },
  'skill.listening.m1': { en: 'Predict the detail you need before listening.', ru: 'Предсказывайте нужную деталь до прослушивания.', kk: 'Тыңдамас бұрын керек мәліметті болжаңыз.' },
  'skill.listening.m2': { en: 'Follow signposts and notice distractors.', ru: 'Следите за сигнальными словами и замечайте ловушки.', kk: 'Белгі сөздерді қадағалап, тұзақтарды байқаңыз.' },
  'skill.listening.m3': { en: 'Practise with recordings, then review the answers.', ru: 'Тренируйтесь на записях, затем разбирайте ответы.', kk: 'Жазбалармен жаттығып, содан кейін жауаптарды талдаңыз.' },
  'skill.writing.headline': { en: 'Give your ideas a clear direction.', ru: 'Дайте идеям чёткое направление.', kk: 'Ойыңызға нақты бағыт беріңіз.' },
  'skill.writing.text': {
    en: 'Make a plan, develop your argument, and practise with useful phrases and structure beside you.',
    ru: 'Составьте план, развивайте аргумент и тренируйтесь, держа под рукой полезные фразы и структуру.',
    kk: 'Жоспар құрып, дәлеліңізді дамытыңыз және пайдалы сөз тіркестері мен құрылымды қол астыңызда ұстап жаттығыңыз.',
  },
  'skill.writing.m1': { en: 'Plan a clear answer with guided structures.', ru: 'Планируйте чёткий ответ по готовым структурам.', kk: 'Дайын құрылымдармен нақты жауапты жоспарлаңыз.' },
  'skill.writing.m2': {
    en: 'Develop your ideas using examples and useful phrases.',
    ru: 'Развивайте идеи с помощью примеров и полезных фраз.',
    kk: 'Ойыңызды мысалдар мен пайдалы сөз тіркестері арқылы дамытыңыз.',
  },
  'skill.writing.m3': { en: 'Use AI feedback to choose what to revise next.', ru: 'По разбору от ИИ решайте, что исправить дальше.', kk: 'ЖИ талдауына қарап, ары қарай нені түзету керегін шешіңіз.' },
  'skill.speaking.headline': { en: 'Find your words. Keep your voice.', ru: 'Найдите слова. Сохраните свой голос.', kk: 'Сөзіңізді табыңыз. Өз дауысыңызды сақтаңыз.' },
  'skill.speaking.text': {
    en: 'Build fuller, more natural answers with a simple structure, then put them into practice out loud.',
    ru: 'Стройте более полные и естественные ответы по простой структуре, а потом отрабатывайте их вслух.',
    kk: 'Қарапайым құрылыммен толығырақ әрі табиғи жауап құрып, оны дауыстап жаттықтырыңыз.',
  },
  'skill.speaking.m1': { en: 'Build an answer with a reason and an example.', ru: 'Стройте ответ с причиной и примером.', kk: 'Себебі мен мысалы бар жауап құрыңыз.' },
  'skill.speaking.m2': {
    en: 'Practise out loud with structures and vocabulary nearby.',
    ru: 'Тренируйтесь вслух, держа под рукой структуры и лексику.',
    kk: 'Құрылымдар мен лексиканы қол астыңызда ұстап, дауыстап жаттығыңыз.',
  },
  'skill.speaking.m3': { en: 'Review AI feedback and focus your next attempt.', ru: 'Изучайте разбор от ИИ и уточняйте цель следующей попытки.', kk: 'ЖИ талдауын қарап, келесі әрекеттің мақсатын нақтылаңыз.' },

  /* AI feedback. */
  'fb.art': { en: 'Illustrative writing feedback', ru: 'Пример разбора письменной работы', kk: 'Жазба жұмысты талдау үлгісі' },
  'fb.progress': { en: 'Your idea, in progress', ru: 'Ваша идея в работе', kk: 'Сіздің ойыңыз әзірленуде' },
  'fb.comment.title': { en: 'Make the benefit specific.', ru: 'Уточните, в чём польза.', kk: 'Пайдасын нақтылаңыз.' },
  'fb.comment.text': {
    en: 'What can students do in that space? Why does that matter?',
    ru: 'Что студенты могут делать в этом пространстве? Почему это важно?',
    kk: 'Студенттер бұл кеңістікте не істей алады? Бұл неге маңызды?',
  },
  'fb.draft': { en: 'One possible next draft', ru: 'Возможный следующий вариант', kk: 'Келесі нұсқаның бір үлгісі' },
  'fb.sample': { en: 'Illustrative feedback, not a live assessment', ru: 'Пример разбора, а не живая проверка', kk: 'Талдау үлгісі, тікелей тексеру емес' },
  'fb.note': { en: 'AI built into your practice', ru: 'ИИ встроен в вашу практику', kk: 'ЖИ практикаңызға енгізілген' },
  'fb.title': {
    en: 'Understand your band.<br /><span>Know your next step.</span>',
    ru: 'Поймите свой балл.<br /><span>Узнайте следующий шаг.</span>',
    kk: 'Балыңызды түсініңіз.<br /><span>Келесі қадамыңызды біліңіз.</span>',
  },
  'fb.lead': {
    en: 'Write an essay. Record an answer. Get personal AI feedback on demand, without booking a marking session.',
    ru: 'Напишите эссе. Запишите ответ. Получите личный разбор от ИИ, когда вам удобно, без записи на проверку.',
    kk: 'Эссе жазыңыз. Жауабыңызды жазып алыңыз. Тексеруге жазылмай-ақ, өзіңізге ыңғайлы кезде жеке ЖИ талдауын алыңыз.',
  },
  'fb.1.title': { en: 'A band estimate with a reason behind it.', ru: 'Примерный балл с объяснением.', kk: 'Түсіндірмесі бар болжамды балл.' },
  'fb.1.text': {
    en: 'Your writing and speaking are assessed against the official public IELTS band descriptors, with feedback for each criterion.',
    ru: 'Ваши Writing и Speaking оцениваются по официальным открытым критериям IELTS, с разбором по каждому критерию.',
    kk: 'Writing және Speaking жұмыстарыңыз IELTS-тің ресми ашық критерийлері бойынша бағаланады, әр критерий бойынша талдау беріледі.',
  },
  'fb.2.title': { en: 'Advice about your actual answer.', ru: 'Советы по вашему конкретному ответу.', kk: 'Нақты жауабыңызға кеңес.' },
  'fb.2.text': {
    en: 'Get specific changes for your essay or recording, including pronunciation feedback from your audio.',
    ru: 'Конкретные правки для эссе или записи, включая разбор произношения по вашему аудио.',
    kk: 'Эссеңізге немесе жазбаңызға нақты түзетулер, соның ішінде аудиоңыз бойынша айтылым талдауы.',
  },
  'fb.3.title': { en: 'Know what the next band asks of you.', ru: 'Узнайте, что нужно для следующего балла.', kk: 'Келесі балл үшін не керегін біліңіз.' },
  'fb.3.text': { en: 'Choose one improvement, practise it, then try again.', ru: 'Выберите одно улучшение, отработайте его и попробуйте снова.', kk: 'Бір жақсартуды таңдап, оны жаттықтырыңыз да, қайта байқап көріңіз.' },
  'fb.score': {
    en: 'AI assessments take time to process. Bands are practice estimates, not official results or a guarantee of your test score.',
    ru: 'Проверке ИИ нужно немного времени. Баллы примерные, для практики: это не официальный результат и не гарантия балла на экзамене.',
    kk: 'ЖИ тексеруіне біраз уақыт керек. Балдар жаттығуға арналған болжам: бұл ресми нәтиже емес және емтихандағы балыңызға кепілдік бермейді.',
  },
  'fb.criteria.title': { en: 'Official criteria. Transparent practice estimates.', ru: 'Официальные критерии. Прозрачные учебные оценки.', kk: 'Ресми критерийлер. Ашық оқу бағалары.' },
  'fb.criteria.text': {
    en: 'See what your writing and speaking are assessed on.',
    ru: 'Посмотрите, по каким критериям оцениваются ваши Writing и Speaking.',
    kk: 'Writing және Speaking жұмыстарыңыз қандай критерийлер бойынша бағаланатынын қараңыз.',
  },
  'fb.criteria.foot': {
    en: 'Our AI uses these published descriptors to guide its assessments. IELTS does not endorse this platform or issue our practice estimates.',
    ru: 'Наш ИИ опирается на эти опубликованные критерии при оценке. IELTS не одобряет эту платформу и не выдаёт наши учебные оценки.',
    kk: 'Біздің ЖИ бағалау кезінде осы жарияланған критерийлерге сүйенеді. IELTS бұл платформаны мақұлдамайды және біздің оқу бағаларымызды бермейді.',
  },

  /* Free and paid (PricingPlans.astro). Alex, 1 October 2026: every lesson
     is free with an account; practice and guidance are one price for 30
     days, which simply end (no automatic renewal); the unused share is
     refunded on request during the 30 days. Buying is possible only where
     the build has a payments Worker; elsewhere the button stays unavailable
     and the page says so. */
  'price.title': {
    en: 'Every lesson, free.<br /><span>Guidance when you want it.</span>',
    ru: 'Все уроки бесплатно.<br /><span>Сопровождение, когда оно нужно.</span>',
    kk: 'Барлық сабақ тегін.<br /><span>Сүйемелдеу, қажет кезде.</span>',
  },
  'price.lead': {
    en: 'Create a free account to read every lesson.<br />Add practice and guidance for 30 days whenever you are ready.',
    ru: 'Создайте бесплатный аккаунт, чтобы читать все уроки.<br />Добавьте практику и сопровождение на 30 дней, когда будете готовы.',
    kk: 'Барлық сабақты оқу үшін тегін аккаунт ашыңыз.<br />Дайын болғанда 30 күнге практика мен сүйемелдеуді қосыңыз.',
  },
  'price.compare': { en: 'What is free and what is paid', ru: 'Что бесплатно, а что платно', kk: 'Не тегін, не ақылы' },
  'price.free.label': { en: 'Free account', ru: 'Бесплатный аккаунт', kk: 'Тегін аккаунт' },
  'price.free.title': { en: 'Every lesson', ru: 'Все уроки', kk: 'Барлық сабақ' },
  'price.free.amount': { en: 'Free <small>with an account, no payment card</small>', ru: 'Бесплатно <small>с аккаунтом, без банковской карты</small>', kk: 'Тегін <small>аккаунтпен, банк картасыз</small>' },
  'price.free.1': {
    en: 'Every lesson for Reading, Listening, Writing and Speaking',
    ru: 'Все уроки по Reading, Listening, Writing и Speaking',
    kk: 'Reading, Listening, Writing және Speaking бойынша барлық сабақ',
  },
  'price.free.2': { en: 'Worked examples and each lesson’s own short quiz', ru: 'Разобранные примеры и короткий тест к каждому уроку', kk: 'Талданған мысалдар және әр сабақтың қысқа тесті' },
  'price.free.3': { en: 'Vocabulary topic lists and word tables', ru: 'Тематические списки слов и таблицы лексики', kk: 'Тақырыптық сөз тізімдері мен лексика кестелері' },
  'price.free.4': { en: 'The course map and your progress through the lessons', ru: 'Карта курса и ваш прогресс по урокам', kk: 'Курс картасы және сабақтар бойынша үлгеріміңіз' },
  'price.paid.label': { en: 'Practice and guidance', ru: 'Практика и сопровождение', kk: 'Практика және сүйемелдеу' },
  'price.paid.title': { en: 'Practise, get feedback, follow your plan', ru: 'Практика, разбор и личный план', kk: 'Практика, талдау және жеке жоспар' },
  'price.paid.amount': { en: '{oneMonth} <small>for 30 days, paid once</small>', ru: '{oneMonth} <small>за 30 дней, оплата один раз</small>', kk: '{oneMonth} <small>30 күнге, бір рет төленеді</small>' },
  'price.paid.1': {
    en: 'Every practice exercise and timed test, with band estimates',
    ru: 'Все упражнения и тесты на время, с примерной оценкой балла',
    kk: 'Болжамды Band бағасы бар барлық жаттығу мен уақыты шектелген тест',
  },
  'price.paid.2': {
    en: '12 essay assessments and 6 recorded Speaking assessments',
    ru: '12 проверок эссе и 6 проверок записей Speaking',
    kk: '12 эссе тексеруі және 6 Speaking жазбасын тексеру',
  },
  'price.paid.3': {
    en: '2 live interviews with the AI examiner, with feedback',
    ru: '2 устных собеседования с ИИ-экзаменатором, с разбором',
    kk: 'ЖИ емтихан алушысымен талдауы бар 2 ауызша сұхбат',
  },
  'price.paid.4': { en: '2 full mock exams and the placement test', ru: '2 полных пробных экзамена и вступительный тест', kk: '2 толық сынақ емтиханы және деңгейді анықтау тесті' },
  'price.paid.5': {
    en: 'Mr EZ, your personal AI tutor, and your personal study plan',
    ru: 'Mr EZ, ваш личный ИИ-репетитор, и ваш личный учебный план',
    kk: 'Mr EZ, сіздің жеке ЖИ тәлімгеріңіз, және жеке оқу жоспарыңыз',
  },
  'price.paid.small': {
    en: 'No automatic renewal: access simply ends after 30 days. You can ask for a refund during the 30 days, and we pay back the share you have not used. Recorded Speaking assessments last up to 5 minutes and live interviews up to 15. The placement test is once per account. Essays written in a mock exam or the placement test count towards the 12. Unused assessments expire with the 30 days. Mr EZ allows 40 chat messages and 60 lesson-help requests a day.',
    ru: 'Без автоматического продления: доступ просто заканчивается через 30 дней. В течение 30 дней можно попросить возврат, и мы вернём неиспользованную часть оплаты. Запись Speaking длится до 5 минут, устное собеседование до 15 минут. Вступительный тест проходят один раз на аккаунт. Эссе в пробном экзамене и во вступительном тесте входят в 12 проверок. Неиспользованные проверки сгорают через 30 дней. Mr EZ: 40 сообщений в чате и 60 запросов помощи в уроках в день.',
    kk: 'Автоматты ұзарту жоқ: қолжетімділік 30 күннен кейін жай ғана аяқталады. 30 күн ішінде ақшаны қайтаруды сұрай аласыз, біз сіз пайдаланбаған үлесті қайтарамыз. Speaking жазбасы 5 минутқа дейін, ауызша сұхбат 15 минутқа дейін созылады. Деңгейді анықтау тесті бір аккаунтқа бір рет тапсырылады. Сынақ емтиханында және деңгейді анықтау тестінде жазылған эссе 12 тексерудің санына кіреді. Пайдаланылмаған тексерулер 30 күннен кейін күшін жояды. Mr EZ: күніне чатта 40 хабарлама және сабақтағы көмекке 60 сұрау.',
  },
  'price.paid.cta': { en: 'Get practice and guidance', ru: 'Подключить практику и сопровождение', kk: 'Практика мен сүйемелдеуді қосу' },
  'price.status': {
    en: '30 days, no automatic renewal. The unused share is refunded on request. Buying is not switched on yet.',
    ru: '30 дней, без автоматического продления. Неиспользованную часть оплаты можно вернуть по запросу. Покупка пока недоступна.',
    kk: '30 күн, автоматты ұзартусыз. Пайдаланылмаған үлесті сұрау бойынша қайтаруға болады. Сатып алу әзірге қолжетімсіз.',
  },
  'price.status.open': {
    en: '30 days, no automatic renewal. The unused share is refunded on request. Check what is included before you buy.',
    ru: '30 дней, без автоматического продления. Неиспользованную часть оплаты можно вернуть по запросу. Перед покупкой проверьте, что входит в доступ.',
    kk: '30 күн, автоматты ұзартусыз. Пайдаланылмаған үлесті сұрау бойынша қайтаруға болады. Сатып алмас бұрын қолжетімділікке не кіретінін тексеріңіз.',
  },
  'price.plans': { en: 'See the plans', ru: 'Посмотреть тарифы', kk: 'Тарифтерді көру' },

  /* Questions (FAQ). */
  'faq.note': { en: 'Before your first step', ru: 'Перед первым шагом', kk: 'Алғашқы қадам алдында' },
  'faq.title': { en: 'A few things<br />you might wonder.', ru: 'Несколько вопросов,<br />которые могут возникнуть.', kk: 'Туындауы мүмкін<br />бірнеше сұрақ.' },
  'faq.free.q': { en: 'What is free?', ru: 'Что бесплатно?', kk: 'Не тегін?' },
  'faq.free.a': {
    en: 'Every lesson, with an account: the explanations, worked examples, each lesson’s short quiz and the vocabulary lists, for all four IELTS papers. Creating the account is free and needs no payment card.',
    ru: 'Все уроки, с аккаунтом: объяснения, разобранные примеры, короткий тест к каждому уроку и списки слов по всем четырём частям IELTS. Аккаунт создаётся бесплатно, банковская карта не нужна.',
    kk: 'Аккаунтпен барлық сабақ: IELTS-тің төрт бөлімі бойынша түсіндірмелер, талданған мысалдар, әр сабақтың қысқа тесті және сөз тізімдері. Аккаунт тегін ашылады, банк картасы қажет емес.',
  },
  'faq.paid.q': { en: 'What is paid, and why?', ru: 'Что платно и почему?', kk: 'Не ақылы және неге?' },
  'faq.paid.a': {
    en: 'Practice and guidance: practice exercises and timed tests with band estimates, AI feedback on essays and recorded Speaking, live interviews with the AI examiner, full mock exams, the placement test, Mr EZ and the practice in your personal study plan. They are paid because every AI check and every conversation costs real money to run. That is what lets the lessons stay free.',
    ru: 'Практика и сопровождение: упражнения и тесты на время с оценкой балла, разбор эссе и записей Speaking от ИИ, устные собеседования с ИИ-экзаменатором, полные пробные экзамены, вступительный тест, Mr EZ и практика из вашего личного учебного плана. Они платные, потому что каждая проверка ИИ и каждый разговор стоят реальных денег. Благодаря этому уроки остаются бесплатными.',
    kk: 'Практика және сүйемелдеу: болжамды Band бағасы бар жаттығулар мен уақыты шектелген тесттер, эссе мен Speaking жазбаларына ЖИ талдауы, ЖИ емтихан алушысымен ауызша сұхбаттар, толық сынақ емтихандары, деңгейді анықтау тесті, Mr EZ және жеке оқу жоспарыңыздағы практика. Олар ақылы, себебі әр ЖИ тексеруі мен әр әңгіме нақты ақша тұрады. Соның арқасында сабақтар тегін болып қалады.',
  },
  'faq.cost.q': { en: 'How much do practice and guidance cost?', ru: 'Сколько стоят практика и сопровождение?', kk: 'Практика мен сүйемелдеу қанша тұрады?' },
  'faq.cost.a': {
    en: '30 days cost {oneMonth}, paid once. Your lessons stay free with your account whether or not you buy.',
    ru: '30 дней стоят {oneMonth}, оплата один раз. Уроки остаются бесплатными с аккаунтом, даже если вы ничего не покупаете.',
    kk: '30 күн {oneMonth} тұрады, бір рет төленеді. Ештеңе сатып алмасаңыз да, сабақтар аккаунтпен тегін болып қалады.',
  },
  'faq.renewal.q': { en: 'Does it renew automatically?', ru: 'Продлевается ли доступ автоматически?', kk: 'Қолжетімділік автоматты түрде ұзартыла ма?' },
  'faq.renewal.a': {
    en: 'No. Access lasts 30 days and then simply ends, so you are never charged automatically. You can buy again whenever you like. If your access is still running, the new 30 days start when it ends.',
    ru: 'Нет. Доступ действует 30 дней и просто заканчивается, поэтому автоматических списаний не бывает. Купить снова можно в любой момент. Если доступ ещё действует, новые 30 дней начнутся, когда он закончится.',
    kk: 'Жоқ. Қолжетімділік 30 күн әрекет етеді де, жай ғана аяқталады, сондықтан ақша ешқашан автоматты түрде алынбайды. Кез келген уақытта қайта сатып ала аласыз. Қолжетімділік әлі әрекет етіп тұрса, жаңа 30 күн ол аяқталғанда басталады.',
  },
  'faq.refund.q': { en: 'Can I get a refund?', ru: 'Можно ли вернуть деньги?', kk: 'Ақшаны қайтаруға бола ма?' },
  'faq.refund.a': {
    en: 'Yes. You can ask for a refund at any time during your 30 days, and we pay back the share you have not used. The used share is the larger of the days that have started and the AI assessments you have used. Ask through the support form. The public offer has the full rule and a worked example.',
    ru: 'Да. В течение 30 дней можно в любой момент попросить возврат, и мы вернём неиспользованную часть оплаты. Использованная часть считается по большему из двух: сколько дней доступа уже началось и сколько проверок ИИ вы уже использовали. Напишите нам через форму поддержки. Полное правило и пример расчёта есть в публичной оферте.',
    kk: 'Иә. 30 күн ішінде кез келген уақытта ақшаны қайтаруды сұрай аласыз, біз сіз пайдаланбаған үлесті қайтарамыз. Пайдаланылған үлес екеуінің үлкені бойынша есептеледі: басталған күндер және сіз пайдаланған ЖИ тексерулері. Бізге қолдау формасы арқылы жазыңыз. Толық ереже мен есептеу мысалы жария офертада берілген.',
  },
  'faq.unlimited.q': { en: 'Is AI practice unlimited?', ru: 'Практика с ИИ без ограничений?', kk: 'ЖИ-мен практика шектеусіз бе?' },
  'faq.unlimited.a': {
    en: 'No. Each 30 days include 12 essay assessments, 6 recorded Speaking assessments (up to 5 minutes each), 2 live interviews with feedback (up to 15 minutes each), 2 full mock exams, and the placement test once per account. Essays written in a mock exam or the placement test count towards the 12. Unused assessments expire with the 30 days. Reading and Listening practice has no limit. Mr EZ allows 40 chat messages and 60 lesson-help requests a day.',
    ru: 'Нет. За 30 дней: 12 проверок эссе, 6 проверок записей Speaking до 5 минут, 2 устных собеседования с разбором до 15 минут, 2 полных пробных экзамена и вступительный тест, один раз на аккаунт. Эссе в пробном экзамене и во вступительном тесте входят в 12 проверок. Неиспользованные проверки сгорают через 30 дней. Практика Reading и Listening без ограничений. Mr EZ: 40 сообщений в чате и 60 запросов помощи в уроках в день.',
    kk: 'Жоқ. 30 күнге: 12 эссе тексеруі, 5 минутқа дейінгі 6 Speaking жазбасын тексеру, 15 минутқа дейінгі талдауы бар 2 ауызша сұхбат, 2 толық сынақ емтиханы және бір аккаунтқа бір рет деңгейді анықтау тесті. Сынақ емтиханында және деңгейді анықтау тестінде жазылған эссе 12 тексерудің санына кіреді. Пайдаланылмаған тексерулер 30 күннен кейін күшін жояды. Reading және Listening практикасы шектеусіз. Mr EZ: күніне чатта 40 хабарлама және сабақтағы көмекке 60 сұрау.',
  },
  'faq.account.q': { en: 'Do I need an account to read the lessons?', ru: 'Нужен ли аккаунт, чтобы читать уроки?', kk: 'Сабақтарды оқу үшін аккаунт керек пе?' },
  'faq.account.a': {
    en: 'Yes. Lessons open with a free account, which also keeps your progress and shows it on your other devices. You can read this page without one.',
    ru: 'Да. Уроки открываются с бесплатным аккаунтом, который ещё и сохраняет ваш прогресс и показывает его на других устройствах. Эту страницу можно читать без аккаунта.',
    kk: 'Иә. Сабақтар тегін аккаунтпен ашылады, ол сонымен қатар үлгеріміңізді сақтап, оны басқа құрылғыларыңызда көрсетеді. Бұл бетті аккаунтсыз оқи аласыз.',
  },
  'faq.academic.q': { en: 'Which IELTS is it for?', ru: 'Для какого IELTS эта подготовка?', kk: 'Бұл қай IELTS-ке арналған?' },
  'faq.academic.a': {
    en: 'Academic IELTS. The lessons, practice and band estimates are built around the Academic test.',
    ru: 'Для Academic IELTS. Уроки, практика и оценка балла построены вокруг формата Academic.',
    kk: 'Academic IELTS-ке. Сабақтар, практика және балл бағалауы Academic форматына негізделген.',
  },
  'faq.official.q': { en: 'Is the AI feedback an official IELTS score?', ru: 'Является ли разбор от ИИ официальным баллом IELTS?', kk: 'ЖИ талдауы ресми IELTS балы ма?' },
  'faq.official.a': {
    en: 'No. Writing and speaking feedback includes estimated practice bands and suggestions for improvement. Only an official IELTS test can give you an official result.',
    ru: 'Нет. Разбор Writing и Speaking содержит примерные учебные баллы и советы по улучшению. Официальный результат может дать только официальный экзамен IELTS.',
    kk: 'Жоқ. Writing және Speaking талдауында болжамды оқу балдары мен жақсарту бойынша кеңестер бар. Ресми нәтижені тек ресми IELTS емтиханы бере алады.',
  },
  'faq.exam.q': { en: 'Can I practise under exam conditions?', ru: 'Можно ли тренироваться в условиях экзамена?', kk: 'Емтихан жағдайында жаттығуға бола ма?' },
  'faq.exam.a': {
    en: 'Yes, with practice and guidance: timed Reading and Listening tests, full mock exams, and separate Writing and Speaking assessments. Guided trainers keep teaching help nearby; tests let you practise independently.',
    ru: 'Да, с практикой и сопровождением: тесты Reading и Listening на время, полные пробные экзамены и отдельные проверки Writing и Speaking. В тренажёрах подсказки всегда рядом, а в тестах вы работаете самостоятельно.',
    kk: 'Иә, практика мен сүйемелдеумен: уақыты шектелген Reading және Listening тесттері, толық сынақ емтихандары және Writing пен Speaking бойынша жеке тексерулер. Тренажерлерде кеңестер әрдайым жаныңызда, ал тесттерде өз бетіңізше жұмыс істейсіз.',
  },
  'faq.phone.q': { en: 'Can I use it on my phone?', ru: 'Можно ли заниматься с телефона?', kk: 'Телефоннан оқуға бола ма?' },
  'faq.phone.a': {
    en: 'Yes. Lessons and practice pages work on a phone. For longer writing tasks, you may find a laptop more comfortable. Speaking practice needs microphone permission.',
    ru: 'Да. Уроки и практика работают на телефоне. Для длинных письменных заданий удобнее ноутбук. Для практики Speaking нужен доступ к микрофону.',
    kk: 'Иә. Сабақтар мен практика телефонда жұмыс істейді. Ұзын жазбаша тапсырмалар үшін ноутбук ыңғайлырақ болуы мүмкін. Speaking практикасы үшін микрофонға рұқсат қажет.',
  },
  'faq.speed.q': { en: 'How quickly will I get feedback?', ru: 'Как быстро приходит разбор?', kk: 'Талдау қаншалықты тез келеді?' },
  'faq.speed.a': {
    en: 'Exercise checks give you an immediate result. AI writing and recorded speaking assessments process your submission before showing the report, so the wait depends on its length and service availability. You do not need to book a marking session.',
    ru: 'Упражнения проверяются сразу. Проверке Writing и записанного Speaking с помощью ИИ нужно время на обработку до показа отчёта, поэтому ожидание зависит от объёма работы и доступности сервиса. Записываться на проверку не нужно.',
    kk: 'Жаттығулар бірден тексеріледі. ЖИ арқылы Writing пен Speaking жазбасын тексеру есепті көрсетпес бұрын жұмысыңызды өңдейді, сондықтан күту уақыты жұмыстың көлеміне және сервистің қолжетімділігіне байланысты. Тексеруге алдын ала жазылудың қажеті жоқ.',
  },

  /* Closing section and footer. */
  'close.note': { en: 'Your next chapter is yours to write.', ru: 'Следующую главу пишете вы.', kk: 'Келесі тарауды өзіңіз жазасыз.' },
  'close.title': {
    en: 'Your next chapter.<br />Start with a free lesson.',
    ru: 'Ваша следующая глава.<br />Начните с бесплатного урока.',
    kk: 'Сіздің келесі тарауыңыз.<br />Тегін сабақтан бастаңыз.',
  },
  'close.lead': {
    en: 'Create a free account and read every lesson.<br />No payment card required.',
    ru: 'Создайте бесплатный аккаунт и читайте все уроки.<br />Банковская карта не нужна.',
    kk: 'Тегін аккаунт ашып, барлық сабақты оқыңыз.<br />Банк картасы қажет емес.',
  },
  'close.signIn': { en: 'Already have an account? Sign in.', ru: 'Уже есть аккаунт? Войти.', kk: 'Аккаунтыңыз бар ма? Кіру.' },
  'foot.tagline': { en: 'A little guidance.<br />A world of possibility.', ru: 'Немного подсказки.<br />Целый мир возможностей.', kk: 'Аздаған кеңес.<br />Мүмкіндіктердің тұтас әлемі.' },
  'foot.nav': { en: 'Footer navigation', ru: 'Навигация внизу страницы', kk: 'Беттің төменгі мәзірі' },
  'foot.teach': { en: 'How we teach', ru: 'Как мы учим', kk: 'Біз қалай оқытамыз' },
  'foot.ez': { en: 'Meet Mr EZ', ru: 'Знакомьтесь: Mr EZ', kk: 'Танысыңыз: Mr EZ' },
  'foot.questions': { en: 'Questions', ru: 'Вопросы', kk: 'Сұрақтар' },
  'foot.privacy': { en: 'Privacy', ru: 'Конфиденциальность', kk: 'Құпиялылық' },
  'foot.terms': { en: 'Terms', ru: 'Условия', kk: 'Шарттар' },
  'foot.support': { en: 'Ask a person', ru: 'Спросить человека', kk: 'Адамнан сұрау' },
  'foot.independent': {
    en: 'Independent preparation. Not affiliated with or endorsed by IELTS.',
    ru: 'Независимая подготовка. Мы не связаны с IELTS и не получали его одобрения.',
    kk: 'Тәуелсіз дайындық. Біз IELTS ұйымымен байланысты емеспіз және IELTS бізді мақұлдамаған.',
  },
  'foot.top': { en: 'Back to top', ru: 'Наверх', kk: 'Жоғарыға' },
} satisfies Record<string, Bilingual>;

export type SalesKey = keyof typeof SALES_COPY;

export function isSalesKey(key: string): key is SalesKey {
  return Object.prototype.hasOwnProperty.call(SALES_COPY, key);
}

/** Tenge in each language's own style: ₸10,000 in English, 10 000 ₸ in
    Russian and Kazakh (kk-KZ groups digits the same way; ru-RU stands in
    where a browser has no Kazakh number format). */
export function tenge(amount: number, locale: SalesLocale): string {
  if (locale === 'en') return `₸${amount.toLocaleString('en-US')}`;
  return `${amount.toLocaleString(intlLocale(locale, 'en-US'))} ₸`;
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

/** The text of one entry in one language, before its placeholders are
    filled. Kazakh falls back to Russian, and anything empty to English. */
export function pickSalesText(entry: Partial<Bilingual> & { en: string }, locale: SalesLocale): string {
  if (locale === 'kk') return entry.kk || entry.ru || entry.en;
  if (locale === 'ru') return entry.ru || entry.en;
  return entry.en;
}

/** One sentence of the sales page in one language, placeholders filled. */
export function salesText(key: SalesKey, locale: SalesLocale, vars?: Record<string, string | number>): string {
  const text = pickSalesText(SALES_COPY[key], locale);
  return fill(text, { ...salesVars(locale), ...vars });
}

/** The English, for the Astro components that render the page. */
export function sales(key: SalesKey, vars?: Record<string, string | number>): string {
  return salesText(key, 'en', vars);
}
