/* Kazakh for signing up and the profile form (Builder K, 2 October 2026):
   SignUpForm.tsx (where the consent is given), ProfileForm.tsx (where the
   parent or guardian's declaration is given, under 18), and the two
   pieces both forms are built from (fields.tsx, shell.tsx).

   A short key here ("Continue", "Show", "Saved") is the same key
   everywhere on the site, so its Kazakh has to read correctly on every
   screen that uses it, not only on these forms.
   To be checked by a native speaker (docs/legal/KAZAKH-REVIEW.md). */
export const strings: Record<string, string> = {
  /* Sign-up (SignUpForm.tsx) */
  'Check your email': 'Поштаңызды тексеріңіз',
  'We sent a confirmation link to {email}. Open it on this device to finish creating your account.':
    'Растау сілтемесін мына мекенжайға жібердік: {email}. Аккаунт ашуды аяқтау үшін оны осы құрылғыда ашыңыз.',
  'No email after a few minutes? Check your spam folder, or try again with a different address.':
    'Бірнеше минуттан кейін де хат келмеді ме? «Спам» қалтасын тексеріңіз немесе басқа мекенжаймен қайталап көріңіз.',
  'Back to sign in': 'Кіру бетіне оралу',
  'Please enter a valid email address.': 'Дұрыс электрондық пошта мекенжайын енгізіңіз.',
  "Passwords don't match.": 'Құпиясөздер сәйкес келмейді.',
  'Create your account': 'Аккаунт ашыңыз',
  'Your course, scores and essays are saved to your account and follow you to any device.':
    'Курсыңыз, нәтижелеріңіз және эсселеріңіз аккаунтыңызда сақталады және кез келген құрылғыда қолжетімді болады.',
  Password: 'Құпиясөз',
  'Confirm password': 'Құпиясөзді растаңыз',
  'Creating your account…': 'Аккаунт ашылуда…',
  'Create account': 'Аккаунт ашу',
  'Next, we ask for a few details about you, such as your name, date of birth and phone number. Only you and the person who runs the site can see them.':
    'Келесі қадамда сіз туралы бірнеше дерек сұраймыз: атыңыз, туған күніңіз және телефон нөміріңіз. Оларды тек сіз және сайтты жүргізетін адам көре алады.',
  or: 'немесе',
  'Already have an account?': 'Аккаунтыңыз бар ма?',

  /* The profile form (ProfileForm.tsx) */
  'Please choose your date of birth.': 'Туған күніңізді таңдаңыз.',
  'Please choose one.': 'Бір нұсқаны таңдаңыз.',
  'Please fill this in.': 'Бұл жолды толтырыңыз.',
  'This is too long. Please shorten it.': 'Тым ұзын. Қысқартыңыз.',
  'Please choose a day, month and year that exist.': 'Бар күнді, айды және жылды таңдаңыз.',
  'This date is in the future.': 'Бұл күн әлі келген жоқ.',
  'Please check the year you were born.': 'Туған жылыңызды тексеріңіз.',
  'Please enter a phone number with 7 to 15 digits, for example +7 701 234 56 78.':
    '7 мен 15 цифр аралығындағы телефон нөмірін енгізіңіз, мысалы +7 701 234 56 78.',
  'Needed for students under 18.': '18 жасқа толмаған оқушылар үшін қажет.',
  'A parent or guardian needs to agree before you continue.': 'Жалғастыру үшін ата-анаңыздың немесе қамқоршыңыздың келісімі қажет.',
  Day: 'Күн',
  Month: 'Ай',
  Year: 'Жыл',
  'Sign in first': 'Алдымен кіріңіз',
  'Your details belong to your account. Sign in, and this page opens again.':
    'Деректеріңіз аккаунтыңызда сақталады. Кірсеңіз, бұл бет қайта ашылады.',
  'We could not save your details: {error}': 'Деректеріңізді сақтау мүмкін болмады: {error}',
  'Tell us about yourself': 'Өзіңіз туралы айтып беріңіз',
  'Your details': 'Деректеріңіз',
  'We ask once, so the course can call you by name and we can reach you about your studies or your account. It takes a minute.':
    'Курс сізге атыңызбен жүгінуі және оқуыңызға немесе аккаунтыңызға қатысты сізбен байланыса алуымыз үшін бір рет сұраймыз. Бұл бір минут алады.',
  'Keep these up to date.': 'Бұл деректерді өзекті күйде ұстаңыз.',
  'One last step': 'Соңғы қадам',
  'Only you and the person who runs the site can see these details.': 'Бұл деректерді тек сіз және сайтты жүргізетін адам көре алады.',
  'Why we ask for each one': 'Әрқайсысы не үшін сұралады',
  'First name': 'Аты',
  'Last name': 'Тегі',
  'With the country code, so we can reach you about your studies or your account.':
    'Оқуыңызға немесе аккаунтыңызға қатысты сізбен байланыса алуымыз үшін ел кодымен бірге.',
  City: 'Қала',
  'School, university or job': 'Мектеп, жоғары оқу орны немесе жұмыс',
  'How did you find us?': 'Бізді қалай таптыңыз?',
  'A parent or guardian': 'Ата-ана немесе қамқоршы',
  'You are under 18, so we also need a parent or guardian who knows you are using the site.':
    'Сіз 18 жасқа толмағансыз, сондықтан сайтты пайдаланып жүргеніңізді білетін ата-анаңыз немесе қамқоршыңыз да қажет.',
  "Parent's name": 'Ата-ананың аты',
  "Parent's phone": 'Ата-ананың телефоны',
  Saved: 'Сақталған',
  'Saving…': 'Сақталуда…',
  'Save and continue': 'Сақтап, жалғастыру',
  'Save details': 'Деректерді сақтау',
  'Back to my account': 'Аккаунтыма оралу',

  /* Shared form pieces (fields.tsx) */
  Hide: 'Жасыру',
  Show: 'Көрсету',
  Strong: 'Күшті',
  Fair: 'Орташа',
  Weak: 'Әлсіз',
  'Password strength': 'Құпиясөздің беріктігі',
  'Use at least 8 characters.': 'Кемінде 8 таңба қолданыңыз.',
  'Add at least one letter.': 'Кемінде бір әріп қосыңыз.',
  'Add at least one number.': 'Кемінде бір цифр қосыңыз.',
  'A friend': 'Досымнан',
  Instagram: 'Instagram',
  'The teaching centre': 'Оқу орталығынан',
  'Somewhere else': 'Басқа жерден',
  'At least 8 characters': 'Кемінде 8 таңба',
  'At least one letter': 'Кемінде бір әріп',
  'At least one number': 'Кемінде бір цифр',

  /* The sign-in shell (shell.tsx) */
  'Accounts are not available': 'Аккаунттар қолжетімсіз',
  'Accounts are not configured for this site yet.': 'Бұл сайтта аккаунттар әлі бапталмаған.',
  'Go to my dashboard': 'Басты бетке өту',
  'You are signed in': 'Сіз аккаунтқа кірдіңіз',
  'Signed in as {email}.': 'Кірген аккаунт: {email}.',
  Continue: 'Жалғастыру',
  'Sign out': 'Шығу',
  'Continue with Google': 'Google арқылы жалғастыру',
  'That email and password do not match. Check them and try again.':
    'Электрондық пошта мен құпиясөз сәйкес келмейді. Тексеріп, қайталап көріңіз.',
  'Please open the confirmation link we emailed you first.': 'Алдымен біз хатпен жіберген растау сілтемесін ашыңыз.',
  'There is already an account with this email. Sign in instead.': 'Бұл электрондық поштамен аккаунт бұрыннан бар. Жай ғана кіріңіз.',
  'The security check did not go through. Please try again.': 'Қауіпсіздік тексерісінен өту мүмкін болмады. Қайталап көріңіз.',
  'Too many attempts. Please wait a minute and try again.': 'Әрекет тым көп. Бір минут күтіп, қайталап көріңіз.',
  'This password has appeared in a data leak elsewhere. Please choose a different one.':
    'Бұл құпиясөз басқа сайттардағы деректердің жария болуында кездескен. Басқа құпиясөз таңдаңыз.',
  'The new password must be different from the old one.': 'Жаңа құпиясөз ескісінен өзгеше болуы керек.',
  'Could not reach the server. Check your connection and try again.': 'Сервермен байланысу мүмкін болмады. Байланысты тексеріп, қайталап көріңіз.',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
