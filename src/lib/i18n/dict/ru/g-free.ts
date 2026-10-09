/* Russian for the server's own sentences in the free-account model (Builder
   G, 1 October 2026, docs/paid-access/FREE-ACCOUNT-MODEL.md): the refusals
   the content gate (workers/content-gate) and the AI Workers send back.
   They arrive as `error` beside a machine-readable `code`; a screen that
   shows the sentence passes it through t(), and this is the Russian it
   finds. The English keys are spelled exactly as the Workers send them
   (PAID_REQUIRED_TEXT in src/lib/trial/gate.ts, REFUSALS in the gate). */

export const strings: Record<string, string> = {
  // code 'paid-required' (HTTP 402), from every AI Worker and the gate.
  'Practice and personal guidance come with paid access. Every lesson stays free with your account.':
    'Практика и личное сопровождение доступны с оплатой. Все уроки остаются бесплатными в вашем аккаунте.',
  // code 'taster-used' (HTTP 402): a free account's lifetime AI try is used
  // (TASTER_USED_TEXT in src/lib/trial/gate.ts).
  'You have used your free questions to Mr EZ.': 'Вы использовали бесплатные вопросы к Mr EZ.',
  'You have used your free essay check.': 'Вы использовали бесплатную проверку эссе.',
  'You have used your free Speaking check.': 'Вы использовали бесплатную проверку Speaking.',
  // The content gate's other refusals.
  'Sign in to open this.': 'Войдите, чтобы открыть это.',
  'Complete your profile to open the lessons.': 'Заполните профиль, чтобы открыть уроки.',
  'This is not available.': 'Это недоступно.',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
