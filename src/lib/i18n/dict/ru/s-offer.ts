/* Russian: the review of the paid offer, 1 October 2026 (Builder S).
   Batch owner: Builder S. Nobody else edits this file.

   Covers: the allowance refusals (src/components/access/assessment-refusal.ts)
   shown by the Writing Checker, recorded Speaking, the live examiner, the
   placement test and Mock Exam Day; "Assessments left"
   (AssessmentBalance.tsx); the "what this uses" lines before a placement
   test or a mock exam (AllowanceNote.tsx); the trial's used assessment
   (TrialBlock.tsx).

   The English sentences the Workers send (src/lib/access/assessment.ts) are
   here too, so a refusal this site has no sentence of its own for is still
   shown in Russian.

   Paper names (Reading, Listening, Writing, Speaking), IELTS and Mr EZ stay
   in English inside the Russian sentences, per docs/I18N-GUIDE.md. */

export const strings: Record<string, string> = {
  /* When the allowance comes back */
  'Your next 30-day period starts on {date}, with a fresh set of assessments.':
    'Следующий 30-дневный период начнётся {date}, с новым набором проверок.',
  'This 30-day period ends on {date}. Another purchase on the Plans page starts a new period after it, with a fresh set of assessments.':
    'Этот 30-дневный период закончится {date}. Новая покупка на странице тарифов начнёт следующий период после него, с новым набором проверок.',
  'Another purchase on the Plans page starts a new 30-day period with a fresh set of assessments.':
    'Новая покупка на странице тарифов начнёт новый 30-дневный период с новым набором проверок.',

  /* What is kept */
  'Your essay is safe on this page.': 'Ваше эссе сохранено на этой странице.',
  'Your recorded answers are still on this page.': 'Ваши записанные ответы остаются на этой странице.',

  /* Used up */
  'Your one trial AI assessment has been used. Writing and recorded Speaking share it. Paid access includes more assessments.':
    'Ваша единственная пробная проверка ИИ уже использована. Она общая для Writing и записи Speaking. В платный доступ входит больше проверок.',
  'You have used all {n} essay assessments in this 30-day period.':
    'Вы использовали все {n} проверок эссе в этом 30-дневном периоде.',
  'You have used all {n} recorded Speaking assessments in this 30-day period.':
    'Вы использовали все {n} проверок записей Speaking в этом 30-дневном периоде.',
  'You have used both full mock exams in this 30-day period.':
    'Вы использовали оба полных пробных экзамена в этом 30-дневном периоде.',
  'You have used both live interviews in this 30-day period.':
    'Вы использовали оба устных собеседования в этом 30-дневном периоде.',
  'You have used both full mock exams in this 30-day period, so this Speaking interview cannot start.':
    'Вы использовали оба полных пробных экзамена в этом 30-дневном периоде, поэтому это собеседование Speaking начать нельзя.',
  'The placement test is taken once per account, and this account has already taken it. Your plan already uses that result.':
    'Вступительный тест проходят один раз на аккаунт, и на этом аккаунте он уже пройден. Ваш план уже учитывает этот результат.',
  'Your trial has ended, so this cannot be assessed. Lessons stay free, and paid access includes AI assessments.':
    'Пробный период закончился, поэтому проверить это нельзя. Уроки остаются бесплатными, а в платный доступ входят проверки ИИ.',
  "Today's safety limit for assessments is reached. Nothing was used: please try again tomorrow.":
    'Достигнут дневной защитный лимит проверок. Ничего не списано: попробуйте снова завтра.',
  'Live interviews are included with paid access. Recorded Speaking and Writing assessments are on the Plans page too.':
    'Устные собеседования входят в платный доступ. Проверки записей Speaking и Writing тоже описаны на странице тарифов.',
  'This is already being assessed. Give it a moment, then refresh the page to see the result.':
    'Это уже проверяется. Подождите немного, затем обновите страницу, чтобы увидеть результат.',
  'Feedback needs a live interview taken from your own account in the last day.':
    'Для разбора нужно устное собеседование, пройденное с вашего аккаунта за последние сутки.',
  'This assessment cannot be started right now. Nothing was used.':
    'Сейчас эту проверку начать нельзя. Ничего не списано.',
  'If grading was interrupted before a result appeared, that assessment is given back automatically after a short while, and you can send it again.':
    'Если проверка прервалась до появления результата, она автоматически вернётся к вам через некоторое время, и вы сможете отправить работу снова.',
  'See plans and what is included': 'Посмотреть тарифы и что в них входит',
  'You can carry on and leave Writing as not yet assessed.': 'Можно продолжить, а Writing останется пока без оценки.',

  /* The Workers' own sentences (src/lib/access/assessment.ts) */
  'Your assessment allowance is used. Your lessons, practice and saved results are still available.':
    'Ваши проверки использованы. Уроки, практика и сохранённые результаты по-прежнему доступны.',
  "Today's assessment safety limit is reached. Please try again tomorrow.":
    'Достигнут дневной защитный лимит проверок. Попробуйте снова завтра.',
  'Live interviews are included with paid access.': 'Устные собеседования входят в платный доступ.',
  'This interview already has a feedback request.': 'Разбор этого собеседования уже запрошен.',
  'Feedback needs a live interview from your own account.': 'Для разбора нужно устное собеседование с вашего аккаунта.',
  'Start an active trial or buy access to request an assessment.':
    'Чтобы запросить проверку, начните пробный период или купите доступ.',
  'You have used the two full mock exams of this purchase. Your lessons, practice and saved results are still available.':
    'Вы использовали оба полных пробных экзамена этой покупки. Уроки, практика и сохранённые результаты по-прежнему доступны.',
  'The placement test can be taken once per account, and yours is already taken.':
    'Вступительный тест можно пройти один раз на аккаунт, и вы его уже прошли.',

  /* A live interview given back */
  'The interview ended before the examiner began, so it was given back: it does not count as one of your full mock exams.':
    'Собеседование закончилось до того, как экзаменатор начал, поэтому оно возвращено: оно не засчитывается как один из ваших полных пробных экзаменов.',
  'The interview ended before the examiner began, so it was given back: your placement interview is still yours to take.':
    'Собеседование закончилось до того, как экзаменатор начал, поэтому оно возвращено: собеседование вступительного теста по-прежнему доступно вам.',
  'The interview ended before the examiner began, so it was given back: it does not count as one of your live interviews.':
    'Собеседование закончилось до того, как экзаменатор начал, поэтому оно возвращено: оно не засчитывается как одно из ваших устных собеседований.',

  /* Assessments left */
  'Assessments left in this 30-day period': 'Осталось проверок в этом 30-дневном периоде',
  'Recorded Speaking': 'Запись Speaking',
  'Live interviews': 'Устные собеседования',
  'Full mock exams': 'Полные пробные экзамены',
  '{left} of {total}': '{left} из {total}',
  'Your next 30-day period starts on {date}.': 'Следующий 30-дневный период начнётся {date}.',
  'This period ends on {date}. Unused assessments do not carry over.':
    'Этот период закончится {date}. Неиспользованные проверки не переносятся.',

  /* What a placement test or a mock exam uses */
  'The placement test is taken once per account.': 'Вступительный тест проходят один раз на аккаунт.',
  'Its Speaking interview does not use your live interviews ({n} of {total} left).':
    'Его собеседование Speaking не тратит ваши устные собеседования (осталось {n} из {total}).',
  'Its Writing report is marked as one of your essay assessments ({n} of {total} left in this 30-day period).':
    'Его отчёт Writing проверяется как одна из ваших проверок эссе (в этом 30-дневном периоде осталось {n} из {total}).',
  'You have used all {n} essay assessments in this 30-day period, so this report cannot be marked now. You can carry on without marking.':
    'Вы использовали все {n} проверок эссе в этом 30-дневном периоде, поэтому сейчас этот отчёт оценить нельзя. Можно продолжить без оценки.',
  'Marking this report uses one of your essay assessments ({n} of {total} left in this 30-day period).':
    'Оценка этого отчёта тратит одну проверку эссе (в этом 30-дневном периоде осталось {n} из {total}).',
  'This interview is part of your once-per-account placement test. It does not use your live interviews ({n} of {total} left).':
    'Это собеседование входит во вступительный тест, который проходят один раз на аккаунт. Оно не тратит ваши устные собеседования (осталось {n} из {total}).',
  'Full mock exams: {n} of {total} left in this 30-day period. Its Speaking interview does not use your live interviews.':
    'Полные пробные экзамены: в этом 30-дневном периоде осталось {n} из {total}. Собеседование Speaking в экзамене не тратит ваши устные собеседования.',
  'Writing is not graded during the mock. Essays you check afterwards in the Writing Checker use your essay assessments ({n} of {total} left).':
    'Во время пробного экзамена Writing не оценивается. Эссе, которые вы потом отправите на проверку эссе, тратят ваши проверки эссе (осталось {n} из {total}).',
  'You have used both full mock exams in this 30-day period, so this Speaking interview cannot start. You can skip Speaking and keep your other papers.':
    'Вы использовали оба полных пробных экзамена в этом 30-дневном периоде, поэтому это собеседование Speaking начать нельзя. Можно пропустить Speaking и сохранить остальные части.',
  'This interview counts as one of your {total} full mock exams for this 30-day period ({n} left). It does not use your live interviews.':
    'Это собеседование засчитывается как один из {total} полных пробных экзаменов этого 30-дневного периода (осталось {n}). Оно не тратит ваши устные собеседования.',

  /* The trial's used assessment (TrialBlock) */
  'Writing and recorded Speaking share one trial assessment, and yours has been used. Lessons stay free, and your Reading and Listening tests stay open while your trial runs.':
    'Для Writing и записи Speaking есть одна общая пробная проверка, и она уже использована. Уроки остаются бесплатными, а тесты Reading и Listening открыты, пока идёт пробный период.',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
