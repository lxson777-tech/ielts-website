/* Kazakh for the plans and buying screens (Builder K, 2 October 2026):
   /plans (TrialPlans.tsx), the purchase return page (PurchaseReturn.tsx),
   the receipt (Receipt.tsx), Account > Access (AccountAccess.tsx), the
   shared pieces in src/components/access/ (AccessParts, AllowanceNote,
   AssessmentBalance, PaidLocked, UpgradeDialog, access-state.ts and the
   refusals in assessment-refusal.ts) and the upgrade pitch
   (src/lib/access/upgrade-pitch.ts).

   A date placeholder is never inflected: a Kazakh date from Intl
   ("2026 ж. 31 қазан") cannot take a case ending, so sentences put it
   after a colon ("аяқталу күні: {date}") instead of "{date} дейін",
   which would need the dative.
   To be checked by a native speaker (docs/legal/KAZAKH-REVIEW.md). */
export const strings: Record<string, string> = {
  /* /plans */
  'Keep your momentum.': 'Қарқынды жоғалтпаңыз.',
  'Choose more time for your IELTS preparation.': 'IELTS-ке дайындыққа қанша уақыт қосатыныңызды таңдаңыз.',
  'One month': 'Бір ай',
  total: 'барлығы',
  'The full course and every practice test for one month.': 'Бір айға толық курс және барлық жаттығу тесттері.',
  'Payment not connected yet': 'Төлем әзірге қосылмаған',
  'Back to Today': 'Бүгінгі жоспарға оралу',
  'Back to my trial': 'Сынақ мерзіміне оралу',
  'Purchase history': 'Сатып алу тарихы',
  'Add more time.': 'Уақыт қосыңыз.',
  'Taking you to payment…': 'Төлемге өтудеміз…',
  'This takes a few seconds. Please keep this page open.': 'Бұл бірнеше секунд алады. Бұл бетті жаппаңыз.',
  'Try again': 'Қайталап көру',
  'Save {amount} compared with three monthly purchases.': 'Үш айлық жеке сатып алумен салыстырғанда үнемдеу: {amount}.',
  'Buy three months': 'Үш айды сатып алу',
  'Buy one month': 'Бір айды сатып алу',
  'Sign in to buy': 'Сатып алу үшін кіріңіз',
  'Adds to your current access, which then runs until {date}.': 'Қазіргі қолжетімділігіңізге қосылады, сонда ол мына күнге дейін созылады: {date}.',

  /* Shared access pieces (AccessParts.tsx) */
  'SIMULATED payments': 'ТӨЛЕМ СИМУЛЯЦИЯСЫ',
  'This is a local test. No money is taken and nothing here is a real purchase.':
    'Бұл жергілікті тексеріс. Ақша алынбайды және мұндағы ештеңе шын сатып алу емес.',
  'Checking your access…': 'Қолжетімділігіңізді тексеріп жатырмыз…',
  'You are not signed in': 'Сіз аккаунтқа кірмегенсіз',
  'Sign in to buy. Your access belongs to your account and works on every device.':
    'Сатып алу үшін кіріңіз. Қолжетімділік аккаунтыңызға тиесілі және кез келген құрылғыда жұмыс істейді.',
  'We could not check your access': 'Қолжетімділігіңізді тексеру мүмкін болмады',
  'Your purchases and your work are safe. Please try again.': 'Сатып алуларыңыз бен жұмысыңыз сақтаулы. Қайталап көріңіз.',
  'Payment confirmed': 'Төлем расталды',
  'Full access until {date}': 'Толық қолжетімділік, аяқталу күні: {date}',
  'Your access has been updated.': 'Қолжетімділігіңіз жаңартылды.',
  'That payment was not completed': 'Бұл төлем аяқталмады',
  'Your access has not changed. You can choose a plan again whenever you like.':
    'Қолжетімділігіңіз өзгерген жоқ. Тарифті кез келген уақытта қайта таңдай аласыз.',
  'You have an unfinished purchase': 'Сізде аяқталмаған сатып алу бар',
  '{plan}, started on {date}. If you closed the payment page, you can check it again or start again.':
    '{plan}, басталған күні: {date}. Төлем бетін жапқан болсаңыз, оны қайта тексеруге немесе қайтадан бастауға болады.',
  'We have not had a confirmation for it yet. If you already paid, give it a few minutes and check again. If you did not finish paying, start again.':
    'Әзірге растау келген жоқ. Төлеп қойған болсаңыз, бірнеше минут күтіп, қайта тексеріңіз. Төлемді аяқтамаған болсаңыз, қайтадан бастаңыз.',
  'We could not check it just now. Nothing has changed. Please try again.':
    'Қазір мұны тексеру мүмкін болмады. Ештеңе өзгерген жоқ. Қайталап көріңіз.',
  'Checking…': 'Тексерілуде…',
  'Check again': 'Қайта тексеру',
  'Start again': 'Қайтадан бастау',

  /* The account page's frame and tabs (src/pages/account.astro), around
     Account > Profile and Account > Access */
  'Log in to see your details, your saved work and your results.': 'Деректеріңізді, сақталған жұмыстарыңызды және нәтижелеріңізді көру үшін кіріңіз.',
  'Log in': 'Кіру',
  'Create a free account': 'Тегін аккаунт ашу',
  Profile: 'Профиль',
  Access: 'Қолжетімділік',
  'Saved and results': 'Сақталғандар мен нәтижелер',

  /* Account > Access (AccountAccess.tsx) */
  'Add more time': 'Уақыт қосу',
  'Buy access again': 'Қолжетімділікті қайта сатып алу',
  'View plans': 'Тарифтерді көру',
  'Your access': 'Қолжетімділігіңіз',
  'What your account can open, and every purchase you have made.': 'Аккаунтыңызда не ашық және сіздің барлық сатып алуларыңыз.',
  'Full access includes': 'Толық қолжетімділікке кіреді:',
  'The full course and every practice test.': 'Толық курс және барлық жаттығу тесттері.',
  'We could not load your purchases just now. Please try again.': 'Сатып алуларыңызды қазір жүктеу мүмкін болмады. Қайталап көріңіз.',
  'No purchases yet.': 'Әзірге сатып алу жоқ.',
  Receipt: 'Түбіртек',

  /* Allowance notes (AllowanceNote.tsx) */
  'The placement test is taken once per account, and this account has already taken it. Your plan already uses that result.':
    'Деңгейді анықтау тесті бір аккаунтқа бір рет тапсырылады, бұл аккаунтта ол тапсырылып қойған. Жоспарыңыз сол нәтижені ескеріп отыр.',
  'The placement test is taken once per account.': 'Деңгейді анықтау тесті бір аккаунтқа бір рет тапсырылады.',
  'Its Speaking interview does not use your live interviews ({n} of {total} left).':
    'Оның Speaking сұхбаты ауызша сұхбаттарыңызды жұмсамайды ({total} ішінен {n} қалды).',
  'Its Writing report is marked as one of your essay assessments ({n} of {total} left in this 30-day period).':
    'Оның Writing жұмысы эссе тексерулеріңіздің бірі ретінде бағаланады (осы 30 күндік кезеңде {total} ішінен {n} қалды).',
  'You have used all {n} essay assessments in this 30-day period, so this report cannot be marked now. You can carry on without marking.':
    'Осы 30 күндік кезеңде {n} эссе тексеруінің бәрін пайдаландыңыз, сондықтан бұл жұмысты қазір бағалау мүмкін емес. Бағаламай-ақ жалғастыра аласыз.',
  'Marking this report uses one of your essay assessments ({n} of {total} left in this 30-day period).':
    'Бұл жұмысты бағалау бір эссе тексеруін жұмсайды (осы 30 күндік кезеңде {total} ішінен {n} қалды).',
  'This interview is part of your once-per-account placement test. It does not use your live interviews ({n} of {total} left).':
    'Бұл сұхбат бір аккаунтқа бір рет тапсырылатын деңгейді анықтау тестінің бөлігі. Ол ауызша сұхбаттарыңызды жұмсамайды ({total} ішінен {n} қалды).',
  'Full mock exams: {n} of {total} left in this 30-day period. Its Speaking interview does not use your live interviews.':
    'Толық сынақ емтихандары: осы 30 күндік кезеңде {total} ішінен {n} қалды. Емтихандағы Speaking сұхбаты ауызша сұхбаттарыңызды жұмсамайды.',
  'Writing is not graded during the mock. Essays you check afterwards in the Writing Checker use your essay assessments ({n} of {total} left).':
    'Сынақ емтиханы кезінде Writing бағаланбайды. Кейін эссе тексеру құралында тексерген эсселеріңіз эссе тексерулеріңізді жұмсайды ({total} ішінен {n} қалды).',
  'You have used both full mock exams in this 30-day period, so this Speaking interview cannot start. You can skip Speaking and keep your other papers.':
    'Осы 30 күндік кезеңде екі толық сынақ емтиханын да пайдаландыңыз, сондықтан бұл Speaking сұхбатын бастау мүмкін емес. Speaking бөлімін өткізіп жіберіп, қалған бөлімдерді сақтай аласыз.',
  'Your next 30-day period starts on {date}.': 'Келесі 30 күндік кезең басталатын күн: {date}.',
  'This interview counts as one of your {total} full mock exams for this 30-day period ({n} left). It does not use your live interviews.':
    'Бұл сұхбат осы 30 күндік кезеңдегі {total} толық сынақ емтиханының бірі болып саналады ({n} қалды). Ол ауызша сұхбаттарыңызды жұмсамайды.',
  'See plans and what is included': 'Тарифтерді және оларға не кіретінін көру',

  /* After paying (PurchaseReturn.tsx) */
  'We could not find this purchase': 'Бұл сатып алуды табу мүмкін болмады',
  'This link does not name a purchase. Your plans and any purchases you made are in your account.':
    'Бұл сілтемеде сатып алу көрсетілмеген. Тарифтер мен барлық сатып алуларыңыз аккаунтыңызда.',
  'Back to plans': 'Тарифтерге оралу',
  'Your account': 'Аккаунтыңыз',
  'Sign in to see this purchase': 'Бұл сатып алуды көру үшін кіріңіз',
  'A purchase belongs to the account that made it. Sign in with that account and this page will check it.':
    'Сатып алу оны жасаған аккаунтқа тиесілі. Сол аккаунтқа кірсеңіз, бұл бет оны тексереді.',
  'Sign in': 'Кіру',
  'Confirming your payment…': 'Төлеміңізді растап жатырмыз…',
  'This usually takes a few seconds. Please keep this page open.': 'Әдетте бұл бірнеше секунд алады. Бұл бетті жаппаңыз.',
  'You’re in.': 'Дайын, сіз бізбенсіз.',
  'You have full access until {date}. Every lesson, test and practice tool is open.':
    'Сізде толық қолжетімділік бар, аяқталу күні: {date}. Барлық сабақ, тест және жаттығу құралы ашық.',
  'Your full access is open. Every lesson, test and practice tool is open.':
    'Толық қолжетімділігіңіз ашық. Барлық сабақ, тест және жаттығу құралы ашық.',
  'purchase\u0004Plan': 'Тариф',
  'Receipt number': 'Түбіртек нөмірі',
  'Go to Today': '«Бүгін» бетіне өту',
  'View receipt': 'Түбіртекті көру',
  'We’re confirming your payment': 'Төлеміңізді растап жатырмыз',
  'The payment provider has not confirmed it yet. If you paid, your access opens as soon as it does, on any device. If you closed the payment page before paying, you can start again from the plans page.':
    'Төлем жүйесі әзірге төлемді растаған жоқ. Төлеген болсаңыз, қолжетімділік расталған бойда кез келген құрылғыда ашылады. Төлем бетін төлемей жапқан болсаңыз, Тарифтер бетінен қайтадан бастай аласыз.',
  'You cancelled the payment': 'Сіз төлемді тоқтаттыңыз',
  'Payment was not completed': 'Төлем аяқталмады',
  'Payment was not completed. Your access has not changed.': 'Төлем аяқталмады. Қолжетімділігіңіз өзгерген жоқ.',
  'The payment did not go through. Your access has not changed.': 'Төлем өтпеді. Қолжетімділігіңіз өзгерген жоқ.',
  'This purchase was refunded': 'Бұл сатып алудың ақшасы қайтарылды',
  'The access it paid for has ended. Your results are kept.': 'Осы сатып алу бойынша қолжетімділік аяқталды. Нәтижелеріңіз сақталды.',
  'It is not on the account you are signed in with. If you bought with a different account, sign in with that one.':
    'Ол сіз кірген аккаунтта жоқ. Басқа аккаунттан сатып алған болсаңыз, сол аккаунтқа кіріңіз.',
  'We could not check this purchase just now': 'Бұл сатып алуды қазір тексеру мүмкін болмады',
  'Nothing has changed on our side. If you paid, your access opens as soon as the payment is confirmed. Please try again.':
    'Біздің тарапта ештеңе өзгерген жоқ. Төлеген болсаңыз, қолжетімділік төлем расталған бойда ашылады. Қайталап көріңіз.',

  /* The receipt (Receipt.tsx) */
  'Back to your account': 'Аккаунтқа оралу',
  'We could not find this receipt': 'Бұл түбіртекті табу мүмкін болмады',
  'This link does not name a purchase.': 'Бұл сілтемеде сатып алу көрсетілмеген.',
  'Sign in to see this receipt': 'Бұл түбіртекті көру үшін кіріңіз',
  'A receipt belongs to the account that made the purchase.': 'Түбіртек сатып алу жасалған аккаунтқа тиесілі.',
  'It is not on the account you are signed in with.': 'Ол сіз кірген аккаунтта жоқ.',
  'We could not load this receipt just now': 'Бұл түбіртекті қазір жүктеу мүмкін болмады',
  'Nothing has changed. Please try again.': 'Ештеңе өзгерген жоқ. Қайталап көріңіз.',
  'There is no receipt for this purchase': 'Бұл сатып алудың түбіртегі жоқ',
  'A receipt is issued once a payment is confirmed. This purchase was not paid.':
    'Түбіртек төлем расталған соң беріледі. Бұл сатып алу төленбеген.',
  'SIMULATED payment': 'ТӨЛЕМ СИМУЛЯЦИЯСЫ',
  'No money was taken. This receipt is a local test, not a real one.': 'Ақша алынған жоқ. Бұл түбіртек жергілікті тексерістен алынған, шын түбіртек емес.',
  'This purchase was refunded.': 'Бұл сатып алудың ақшасы қайтарылды.',
  Account: 'Аккаунт',
  'Print or save as PDF': 'Басып шығару немесе PDF ретінде сақтау',
  'Loading…': 'Жүктелуде…',

  /* After the first lesson (UpgradeDialog.tsx) */
  'Lessons stay free. When you want to practise what you have learned, with feedback on your own work, this is what practice and guidance adds.':
    'Сабақтар тегін болып қала береді. Үйренгеніңізді бекітіп, өз жұмысыңызға талдау алғыңыз келгенде, практика мен сүйемелдеу мынаны қосады.',
  'You finished your first lesson': 'Сіз алғашқы сабағыңызды аяқтадыңыз',
  'Add practice and guidance': 'Практика мен сүйемелдеуді қосыңыз',
  Close: 'Жабу',
  'Get practice and guidance': 'Практика мен сүйемелдеуді қосу',
  'Keep reading lessons': 'Сабақтарды оқуды жалғастыру',
  'Create a free account first: every lesson is free with an account.': 'Алдымен тегін аккаунт ашыңыз: аккаунтпен барлық сабақ тегін.',

  /* Access states (access-state.ts) */
  'Practice and guidance until {date}': 'Практика және сүйемелдеу, аяқталу күні: {date}',
  'Buying again adds more time after this date. Nothing renews by itself.':
    'Қайта сатып алу осы күннен кейін уақыт қосады. Ештеңе өздігінен ұзартылмайды.',
  'Free access from your teacher until {date}': 'Мұғаліміңіз берген тегін қолжетімділік, аяқталу күні: {date}',
  'It opens everything practice and guidance includes. Your teacher renews or stops it.':
    'Ол практика мен сүйемелдеуге кіретіннің бәрін ашады. Оны мұғаліміңіз ұзартады немесе тоқтатады.',
  'Practice and guidance ended on {date}': 'Практика мен сүйемелдеу аяқталған күн: {date}',
  'Every lesson stays open, and your results are kept. Choose practice and guidance again to continue.':
    'Барлық сабақ ашық күйінде қалады, нәтижелеріңіз сақталды. Жалғастыру үшін практика мен сүйемелдеуді қайта қосыңыз.',
  'Free account': 'Тегін аккаунт',
  'Every lesson is free with your account. Practice and guidance starts as soon as your payment is confirmed.':
    'Аккаунтыңызбен барлық сабақ тегін. Практика мен сүйемелдеу төлеміңіз расталған бойда басталады.',
  'This plan is not available right now.': 'Бұл тариф қазір қолжетімсіз.',
  'You have started too many purchases in the last hour. Please try again in an hour.':
    'Соңғы бір сағатта тым көп сатып алу бастадыңыз. Бір сағаттан кейін қайталап көріңіз.',
  'The payment page could not be opened. Nothing was charged. Please try again shortly.':
    'Төлем бетін ашу мүмкін болмады. Ақша алынған жоқ. Біраздан кейін қайталап көріңіз.',
  'Payment is not connected yet.': 'Төлем әзірге қосылмаған.',
  'Please sign in again to buy access.': 'Қолжетімділікті сатып алу үшін қайта кіріңіз.',
  'You seem to be offline. Nothing has changed. Please try again once you are connected.':
    'Интернетке қосылмаған сияқтысыз. Ештеңе өзгерген жоқ. Байланыс қалпына келгенде қайталап көріңіз.',
  'We could not reach payments just now. Nothing has changed. Please try again.':
    'Төлем жүйесімен қазір байланысу мүмкін болмады. Ештеңе өзгерген жоқ. Қайталап көріңіз.',
  Date: 'Күні',
  'Access period': 'Қолжетімділік мерзімі',
  '{from} to {to}': 'басталуы: {from}, аяқталуы: {to}',
  Amount: 'Сомасы',
  Status: 'Күйі',
  'Refunded on {date}': 'Ақша қайтарылған күн: {date}',
  Refunded: 'Ақша қайтарылды',
  Paid: 'Төленді',
  'Not completed': 'Аяқталмады',
  Cancelled: 'Тоқтатылды',
  'Not finished': 'Аяқталмаған',

  /* Assessment refusals (assessment-refusal.ts) */
  'Your next 30-day period starts on {date}, with a fresh set of assessments.':
    'Келесі 30 күндік кезең жаңа тексерулер жиынтығымен басталады. Басталатын күні: {date}.',
  'This 30-day period ends on {date}. Another purchase on the Plans page starts a new period after it, with a fresh set of assessments.':
    'Осы 30 күндік кезең аяқталатын күн: {date}. Тарифтер бетіндегі жаңа сатып алу одан кейін жаңа тексерулер жиынтығымен жаңа кезеңді бастайды.',
  'Another purchase on the Plans page starts a new 30-day period with a fresh set of assessments.':
    'Тарифтер бетіндегі жаңа сатып алу жаңа тексерулер жиынтығымен жаңа 30 күндік кезеңді бастайды.',
  'Your essay is safe on this page.': 'Эссеңіз осы бетте сақтаулы.',
  'Your recorded answers are still on this page.': 'Жазылған жауаптарыңыз осы бетте қалды.',
  'Your one trial AI assessment has been used. Writing and recorded Speaking share it. Paid access includes more assessments.':
    'Жалғыз сынақ ЖИ тексеруіңіз пайдаланылды. Ол Writing пен Speaking жазбасына ортақ. Ақылы қолжетімділікке көбірек тексеру кіреді.',
  'You have used all {n} essay assessments in this 30-day period.': 'Осы 30 күндік кезеңде {n} эссе тексеруінің бәрін пайдаландыңыз.',
  'You have used all {n} recorded Speaking assessments in this 30-day period.':
    'Осы 30 күндік кезеңде Speaking жазбасын тексерудің {n} мүмкіндігінің бәрін пайдаландыңыз.',
  'You have used both full mock exams in this 30-day period.': 'Осы 30 күндік кезеңде екі толық сынақ емтиханын да пайдаландыңыз.',
  'You have used both live interviews in this 30-day period.': 'Осы 30 күндік кезеңде екі ауызша сұхбатты да пайдаландыңыз.',
  'You have used both full mock exams in this 30-day period, so this Speaking interview cannot start.':
    'Осы 30 күндік кезеңде екі толық сынақ емтиханын да пайдаландыңыз, сондықтан бұл Speaking сұхбатын бастау мүмкін емес.',
  'Your trial has ended, so this cannot be assessed. Lessons stay free, and paid access includes AI assessments.':
    'Сынақ мерзіміңіз аяқталды, сондықтан мұны бағалау мүмкін емес. Сабақтар тегін болып қалады, ал ақылы қолжетімділікке ЖИ тексерулері кіреді.',
  "Today's safety limit for assessments is reached. Nothing was used: please try again tomorrow.":
    'Тексерулердің бүгінгі қауіпсіздік шегіне жеттіңіз. Ештеңе жұмсалған жоқ: ертең қайталап көріңіз.',
  'Live interviews are included with paid access. Recorded Speaking and Writing assessments are on the Plans page too.':
    'Ауызша сұхбаттар ақылы қолжетімділікке кіреді. Speaking жазбалары мен Writing тексерулері де Тарифтер бетінде сипатталған.',
  'AI feedback comes with practice and guidance. Nothing was used.': 'ЖИ талдауы практика мен сүйемелдеуге кіреді. Ештеңе жұмсалған жоқ.',
  'This is already being assessed. Give it a moment, then refresh the page to see the result.':
    'Бұл қазір тексерілуде. Сәл күтіп, нәтижені көру үшін бетті жаңартыңыз.',
  'Feedback needs a live interview taken from your own account in the last day.':
    'Талдау үшін соңғы бір тәулікте өз аккаунтыңыздан өткен ауызша сұхбат қажет.',
  'This assessment cannot be started right now. Nothing was used.': 'Бұл тексеруді қазір бастау мүмкін емес. Ештеңе жұмсалған жоқ.',
  'The interview ended before the examiner began, so it was given back: it does not count as one of your full mock exams.':
    'Сұхбат емтихан алушы бастамай тұрып аяқталды, сондықтан ол қайтарылды: ол толық сынақ емтихандарыңыздың бірі болып саналмайды.',
  'The interview ended before the examiner began, so it was given back: your placement interview is still yours to take.':
    'Сұхбат емтихан алушы бастамай тұрып аяқталды, сондықтан ол қайтарылды: деңгейді анықтау тестінің сұхбатын әлі де тапсыра аласыз.',
  'The interview ended before the examiner began, so it was given back: it does not count as one of your live interviews.':
    'Сұхбат емтихан алушы бастамай тұрып аяқталды, сондықтан ол қайтарылды: ол ауызша сұхбаттарыңыздың бірі болып саналмайды.',
  'If grading was interrupted before a result appeared, that assessment is given back automatically after a short while, and you can send it again.':
    'Егер бағалау нәтиже шықпай тұрып үзілсе, ол тексеру біраз уақыттан кейін автоматты түрде қайтарылады және жұмысты қайта жібере аласыз.',

  /* Locked paid screens (PaidLocked.tsx) */
  'Your practice and guidance has ended': 'Практика мен сүйемелдеу мерзімі аяқталды',
  'Part of practice and guidance': 'Практика мен сүйемелдеуге кіреді',
  'Every lesson stays open, and your results are saved. Choose practice and guidance again to continue.':
    'Барлық сабақ ашық күйінде қалады, нәтижелеріңіз сақталды. Жалғастыру үшін практика мен сүйемелдеуді қайта қосыңыз.',
  'See what practice and guidance adds': 'Практика мен сүйемелдеу не беретінін көру',

  /* What is left (AssessmentBalance.tsx) */
  'Recorded Speaking': 'Speaking жазбасы',
  'Live interviews': 'Ауызша сұхбаттар',
  'Full mock exams': 'Толық сынақ емтихандары',
  'Assessments left in this 30-day period': 'Осы 30 күндік кезеңде қалған тексерулер',
  '{left} of {total}': '{total} ішінен {left}',
  'This period ends on {date}. Unused assessments do not carry over.':
    'Бұл кезең аяқталатын күн: {date}. Пайдаланылмаған тексерулер келесі кезеңге ауыспайды.',

  /* The upgrade pitch (src/lib/access/upgrade-pitch.ts) */
  'The full practice library, and timed tests with band estimates': 'Толық жаттығу кітапханасы және болжамды Band бағасы бар уақыты шектелген тесттер',
  '{essays} essay checks and {speaking} recorded Speaking checks': 'Эссе тексерулері: {essays}, Speaking жазбасын тексеру: {speaking}',
  '{live} live interviews, {mock} mock exams and the placement test':
    'Ауызша сұхбаттар: {live}, сынақ емтихандары: {mock}, және деңгейді анықтау тесті',
  'Mr EZ guidance on everything you study': 'Оқитыныңыздың бәрі бойынша Mr EZ сүйемелдеуі',
  'Your personal study plan, with practice every day': 'Күн сайынғы практикасы бар жеке оқу жоспарыңыз',
  '{price} for {days} days. No automatic renewal.': '{days} күнге {price}. Автоматты ұзарту жоқ.',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
