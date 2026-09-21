/* Russian: checkpoint recommendations on the tests hub, the client-side
   assessment boundary in Mr EZ, the mock exam's honest results summary, and
   the deep-link notes on the supporting reference libraries (model answers,
   cue cards, the band ladder, saved lessons and notes).
   Batch owner: WP22 (personal learning build). Nobody else edits this file.

   Covers: src/lib/learning/checkpoints.ts, src/components/learning/
   TestsHubCheckpoints.tsx, src/components/tutor/mrez-boundary.ts (and the
   strings it feeds into MrEzPanel.tsx), src/components/mock-summary.ts (and
   the results screen in MockExam.tsx that reads it), src/components/
   library-links.ts, and the small additions to ModelAnswers.tsx,
   CueCardBank.tsx, BandLadder.tsx and SavedItems.tsx that use it.

   Exam material stays English. "Reading" and "Listening" as paper names are
   never translated here, the same rule every other batch follows; only the
   teaching and interface prose around them is.

   See docs/I18N-GUIDE.md for the style rules and the glossary. */

export const strings: Record<string, string> = {
  /* checkpoints.ts: CHECKPOINT_REASON_SENTENCES, shown on the tests hub */
  'None of this paper has come up before, so a result here is about where you really stand, not what you remember.':
    'Этот тест вам ещё не встречался, поэтому результат здесь покажет, где вы находитесь на самом деле, а не то, что вы запомнили.',
  'Held back for a short independent check elsewhere in the plan. Still usable here once nothing else is unseen.':
    'Отложен для короткой самостоятельной проверки в другом месте плана. Здесь его всё равно можно использовать, если незнакомых тестов больше не осталось.',
  'About {percent}% of this paper has already come up in practice, so a fresh result here is partly about material you have already met.':
    'Около {percent}% этого теста уже встречалось вам на практике, поэтому новый результат здесь будет частично про знакомый материал.',
  'This whole paper has already been used. Sitting it again is useful practice, but it cannot raise certainty, because none of it is unseen.':
    'Этот тест уже пройден целиком. Пройти его снова полезно для практики, но это не повысит точность оценки, потому что незнакомого материала в нём не осталось.',

  /* TestsHubCheckpoints.tsx */
  Unseen: 'Незнакомый',
  'Already sat': 'Уже пройден',
  'Partly seen · {percent}%': 'Частично знаком · {percent}%',
  'A paper you have not met yet shows where you really stand. One you have already drilled or sat mostly shows what you remember.':
    'Незнакомый тест показывает, где вы находитесь на самом деле. Тот, который вы уже разбирали или проходили, в основном показывает, что вы запомнили.',
  'Recommended checkpoint': 'Рекомендованный контрольный тест',
  '{skill} checkpoint · in today’s plan': 'Контрольный тест: {skill} · уже в сегодняшнем плане',
  '{skill} checkpoint': 'Контрольный тест: {skill}',
  'Only {n} unseen {skill} papers left after this one.': 'После этого останется всего {n} незнакомых тестов: {skill}.',
  'Start this checkpoint': 'Начать этот контрольный тест',

  /* mrez-boundary.ts, read by MrEzPanel.tsx */
  'No hints, examples or answers while the clock is running. Ask me again once you submit, this conversation will still be here.':
    'Пока идёт время, подсказок, примеров и ответов не будет. Спросите меня снова после того, как сдадите работу, этот разговор никуда не денется.',
  'Mr EZ is stepping back until you submit': 'Mr EZ подождёт, пока вы не сдадите работу',

  /* mock-summary.ts, read by MockExam.tsx's ResultsScreen */
  'Each paper below stands on its own.': 'Каждый результат ниже стоит отдельно, сам по себе.',
  "There is no single overall band on this screen. Writing isn't graded during the mock, so an honest overall would need a fourth number this sitting does not have yet. Send your essays to the Writing Checker afterwards, then read each paper's result for what it is.":
    'Единого общего балла на этом экране нет. Writing не оценивается во время пробного экзамена, поэтому честный общий балл требует четвёртого числа, которого у этой попытки пока нет. Отправьте эссе в Writing Checker позже, а пока читайте результат каждой части отдельно.',

  /* library-links.ts: LIBRARY_REASON_SENTENCES, shown as a short banner on
     ModelAnswers.tsx, CueCardBank.tsx, BandLadder.tsx and SavedItems.tsx
     when a link arrived with a reason attached. */
  'Compare this with what you just wrote. Notice what the model states in its first two sentences that yours does not yet.':
    'Сравните это с тем, что вы только что написали. Обратите внимание, что модельный ответ говорит в первых двух предложениях, а ваш пока нет.',
  'This is close to the band your result pointed to. Notice how it handles the same part of the task.':
    'Это близко к баллу, на который указал ваш результат. Обратите внимание, как здесь решена та же часть задания.',
  'From the same family as the card you just practised, so the vocabulary you just used still applies.':
    'Из той же группы тем, что и карточка, которую вы только что отрабатывали, поэтому только что использованная лексика всё ещё подходит.',
  'The exact part of the lesson you saved.': 'Именно та часть урока, которую вы сохранили.',
  'Sent here for a reason: read the note above before you move on.': 'Вас отправили сюда не просто так: прочитайте заметку выше, прежде чем двигаться дальше.',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
