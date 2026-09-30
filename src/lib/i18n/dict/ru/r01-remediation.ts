/* Re-audit finding R01 (30 September 2026): support for signed-out visitors
   goes through the support Worker, which limits each sender and can ask for
   a bot check. These are the new sentences the support form shows
   (src/components/support/SupportForm.tsx). */

export const strings: Record<string, string> = {
  // Signed out, and this build has no support Worker: the honest notice.
  'Messages from signed-out visitors are not switched on here. Sign in and you can write to a person from your account.':
    'Сообщения от посетителей, не вошедших в аккаунт, здесь не включены. Войдите, и вы сможете написать человеку из своего аккаунта.',
  'Messages from signed-out visitors are not switched on here. Sign in to send your message.':
    'Сообщения от посетителей, не вошедших в аккаунт, здесь не включены. Войдите, чтобы отправить сообщение.',

  // This sender has had its hour's share (distinct from "many messages are arriving").
  'You have sent several messages in the last hour. We will read them all; please wait an hour before sending more.':
    'За последний час вы уже отправили несколько сообщений. Мы прочитаем их все; следующее, пожалуйста, отправьте через час.',

  // The bot check was missing or did not pass.
  'The security check did not pass. Please complete it again and send your message once more; nothing you wrote is lost.':
    'Проверка безопасности не пройдена. Пройдите её ещё раз и отправьте сообщение снова; написанный текст не пропал.',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
