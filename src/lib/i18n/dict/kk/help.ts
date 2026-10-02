/* Kazakh for the Help page's buying, refund and contact answers
   (src/pages/help.astro; Builder K, 2 October 2026). The rest of the Help
   page (how lessons, tests and Mr EZ work) is course help, not consumer
   information, and reads Russian for a Kazakh reader.
   To be checked by a native speaker (docs/legal/KAZAKH-REVIEW.md). */
export const strings: Record<string, string> = {
  'What is free, and what is paid?': 'Не тегін, не ақылы?',
  'Every lesson is free with an account: the explanations, worked examples, each lesson’s own short quiz and the vocabulary lists.':
    'Аккаунтпен барлық сабақ тегін: түсіндірмелер, талданған мысалдар, әр сабақтың қысқа тесті және сөздік тізімдері.',
  'Practice and guidance are paid: practice exercises and timed tests with band estimates, AI feedback on essays and recorded Speaking, live interviews with the AI examiner, full mock exams, the placement test, Mr EZ and the practice in your personal study plan.':
    'Практика мен сүйемелдеу ақылы: болжамды Band бағасы бар жаттығулар мен уақыты шектелген тесттер, эссе мен Speaking жазбаларына ЖИ талдауы, ЖИ емтихан алушысымен ауызша сұхбаттар, толық сынақ емтихандары, деңгейді анықтау тесті, Mr EZ және жеке оқу жоспарыңыздағы практика.',
  'Practice and guidance last 30 days and then simply end. Nothing renews. The Plans page shows the price and what 30 days include.':
    'Практика мен сүйемелдеу 30 күн әрекет етеді, содан кейін жай ғана аяқталады. Ештеңе ұзартылмайды. Бағасы мен 30 күнге не кіретіні Тарифтер бетінде көрсетілген.',
  'Can I get a refund?': 'Ақшаны қайтаруға бола ма?',
  'Yes. You can ask for a refund at any time during the 30 days, and we pay back the share you have not used. The used share is the larger of the days that have started and the AI assessments you have used.':
    'Иә. 30 күн ішінде кез келген уақытта ақшаны қайтаруды сұрай аласыз, біз сіз пайдаланбаған үлесті қайтарамыз. Пайдаланылған үлес екеуінің үлкені бойынша есептеледі: басталған күндер және сіз пайдаланған ЖИ тексерулері.',
  'Ask through the support form, choosing a refund, or by email to the seller. The public offer has the full rule and a worked example.':
    'Қолдау формасы арқылы ақшаны қайтаруды таңдап жазыңыз немесе сатушыға электрондық хат жіберіңіз. Толық ереже мен есептеу мысалы жария офертада берілген.',
  'How do I get practice and guidance?': 'Практика мен сүйемелдеуді қалай қосуға болады?',
  'Open the Plans page, sign in and pay once for 30 days. Your access starts as soon as the payment is confirmed, and your Account page shows when it ends.':
    'Тарифтер бетін ашып, аккаунтқа кіріңіз және 30 күн үшін бір рет төлеңіз. Қолжетімділік төлем расталған бойда ашылады, ал оның қашан аяқталатыны Аккаунт бетінде көрсетіледі.',
  'When you reach for something that comes with practice and guidance, the platform tells you what it adds and links to the Plans page. Your lessons stay open either way.':
    'Практика мен сүйемелдеуге кіретін нәрсені ашқанда, платформа олар не қосатынын түсіндіріп, Тарифтер бетіне апарады. Сабақтар кез келген жағдайда ашық қалады.',
  'Buying practice and guidance is not open yet. The Plans page shows the price and what 30 days include.':
    'Практика мен сүйемелдеуді сатып алу әзірге қолжетімсіз. Бағасы мен 30 күнге не кіретіні Тарифтер бетінде көрсетілген.',
  'Talk to a person': 'Адамға жазу',
  'Something not working, or a question these answers do not cover? Write to us. A person reads every message and replies by email.':
    'Бірдеңе жұмыс істемей ме немесе сұрағыңызға мұнда жауап жоқ па? Бізге жазыңыз. Әр хабарламаны адам оқиды және электрондық пошта арқылы жауап береді.',
  'Or write directly:': 'Немесе тікелей жазыңыз:',
  'Ask a person': 'Адамнан сұрау',
  "Go to today's session": 'Бүгінгі сабаққа өту',
  'Terms of use': 'Пайдалану шарттары',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
