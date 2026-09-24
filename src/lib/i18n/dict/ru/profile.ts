/* Russian: the student profile and the account settings (24 September 2026).
   Batch owner: the login-rework agent. Nobody else edits this file.

   Covers: src/components/auth/ProfileForm.tsx (/profile, "About you"),
   src/components/AccountSettings.tsx ("Your details and security" on
   /account), the "How did you find us" choices in
   src/components/auth/fields.tsx, the "My details" menu entry in
   src/lib/platform-nav.ts, and the signed-out line on /account in
   src/components/AccountOverview.tsx.

   See docs/I18N-GUIDE.md for the style rules and the glossary. */

export const strings: Record<string, string> = {
  /* platform-nav.ts: the avatar menu. */
  'My details': 'Мои данные',

  /* AccountOverview.tsx: signed out on /account. {loginLink} is replaced by
     a "Sign in" link wherever the sentence puts it. */
  'Saved on this device only. {loginLink} to sync across devices.':
    'Сохранено только на этом устройстве. {loginLink}, чтобы синхронизировать между устройствами.',

  /* ProfileForm.tsx: headings and explanations. */
  'Tell us about yourself': 'Расскажите о себе',
  'Your details': 'Ваши данные',
  'One last step': 'Последний шаг',
  'So the course can call you by name and your teachers know who you are. It takes a minute, and you only do it once.':
    'Чтобы курс обращался к вам по имени, а преподаватели знали, кто вы. Это займёт минуту, и делается один раз.',
  'Keep these up to date. Only you and the teaching centre can see them.':
    'Держите данные в актуальном виде. Их видите только вы и учебный центр.',
  'Sign in first': 'Сначала войдите',
  'Your details belong to your account. Sign in, and this page opens again.':
    'Ваши данные хранятся в аккаунте. Войдите, и эта страница откроется снова.',

  /* ProfileForm.tsx: fields. */
  'First name': 'Имя',
  'Last name': 'Фамилия',
  'Date of birth': 'Дата рождения',
  Day: 'День',
  Month: 'Месяц',
  Year: 'Год',
  Phone: 'Телефон',
  'With the country code, so the centre can reach you.': 'С кодом страны, чтобы центр мог с вами связаться.',
  City: 'Город',
  'School, university or job': 'Школа, вуз или работа',
  'How did you find us?': 'Как вы о нас узнали?',
  'A friend': 'От друга',
  Instagram: 'Instagram',
  'The teaching centre': 'Учебный центр',
  'Somewhere else': 'Другое',
  'A parent or guardian': 'Родитель или опекун',
  'You are under 18, so we also need a parent or guardian who knows you are using the site.':
    'Вам ещё нет 18, поэтому нужен родитель или опекун, который знает, что вы пользуетесь сайтом.',
  "Parent's name": 'Имя родителя',
  "Parent's phone": 'Телефон родителя',
  'My parent or guardian agrees to me using this site': 'Мой родитель или опекун согласен, что я пользуюсь этим сайтом',
  'Save and continue': 'Сохранить и продолжить',
  'Save details': 'Сохранить',
  'Back to my account': 'Назад в аккаунт',
  'We could not save your details: {error}': 'Не удалось сохранить данные: {error}',

  /* ProfileForm.tsx: one sentence per ProfileErrorCode. */
  'Please fill this in.': 'Заполните это поле.',
  'Please choose your date of birth.': 'Выберите дату рождения.',
  'Please choose one.': 'Выберите один вариант.',
  'This is too long. Please shorten it.': 'Слишком длинно. Сократите, пожалуйста.',
  'Please choose a day, month and year that exist.': 'Выберите существующие день, месяц и год.',
  'This date is in the future.': 'Эта дата ещё не наступила.',
  'Please check the year you were born.': 'Проверьте год рождения.',
  'Please enter a phone number with 7 to 15 digits, for example +7 701 234 56 78.':
    'Введите номер телефона от 7 до 15 цифр, например +7 701 234 56 78.',
  'Needed for students under 18.': 'Нужно для учеников младше 18 лет.',
  'A parent or guardian needs to agree before you continue.': 'Чтобы продолжить, нужно согласие родителя или опекуна.',

  /* AccountSettings.tsx: "Your details and security" on /account. */
  'Your details and security': 'Ваши данные и безопасность',
  'Who you are, how you sign in, and where you are signed in.': 'Кто вы, как вы входите и где выполнен вход.',
  'Not filled in yet.': 'Пока не заполнено.',
  Name: 'Имя',
  'Found us through': 'Как узнали о нас',
  'Parent or guardian': 'Родитель или опекун',
  'Edit details': 'Изменить данные',
  'Add details': 'Заполнить данные',
  'Change email': 'Сменить email',
  'New email': 'Новый email',
  'This is already your email.': 'Это и есть ваш текущий email.',
  'We will email a link to the new address. Nothing changes until you open it.':
    'Мы отправим ссылку на новый адрес. Пока вы её не откроете, ничего не изменится.',
  'Send confirmation link': 'Отправить ссылку',
  'We sent a confirmation link to {email}. Your email changes once you open it.':
    'Мы отправили ссылку для подтверждения на {email}. Email сменится, когда вы её откроете.',
  'At least 8 characters, with a letter and a number.': 'Не меньше 8 символов, с буквой и цифрой.',
  'You sign in with Google. You can add a password as well.': 'Вы входите через Google. Можно добавить и пароль.',
  'Change password': 'Сменить пароль',
  'Add a password': 'Добавить пароль',
  'Save new password': 'Сохранить пароль',
  'Password changed.': 'Пароль изменён.',
  Devices: 'Устройства',
  'Lost a phone or used a shared computer? Sign out everywhere at once.':
    'Потеряли телефон или входили с чужого компьютера? Выйдите сразу на всех устройствах.',
  'Sign out on all devices': 'Выйти на всех устройствах',
  'This signs you out here and on every other phone, tablet and computer. Your work stays saved in your account.':
    'Вы выйдете здесь и на всех других телефонах, планшетах и компьютерах. Вся работа останется в аккаунте.',
  'Sign out everywhere': 'Выйти везде',
  'Signing out…': 'Выходим…',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
