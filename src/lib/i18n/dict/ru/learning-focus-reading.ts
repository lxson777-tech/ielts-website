/* Russian: WP18a's Reading extension (2026-09-22). Batch owner: WP18a.
   Nobody else edits this file.

   Covers the few new literal strings WP18a added to FocusedExercise.tsx
   (a free-text answer, a per-item options select, the authored-practice
   notice), plus the titles, objectives and mistake-reason lists it added to
   src/data/focused/reading-*.ts. The data file strings are never reached by
   the automatic coverage scan (tests/i18n.test.ts only extracts literal
   t()/nt() call arguments, and the data files pass these as plain object
   properties, exactly as learning-focus.ts's own header notes for Pilot
   A), so nothing here is enforced by that test; it is added anyway, on the
   same "every new string gets one" rule BUILDER-RULES sets, and to match
   Pilot A's own practice.

   Exam material stays English: a passage, an item's own label, an ending
   and the shared list of endings are never translated here, even for the
   authored sentence-endings set (LEAD-DECISIONS Q1 treats its material the
   same way a real exam question is treated once it exists, verified or
   not). What is translated is the teaching around it: titles, objectives,
   and the reasons a student picks from after a wrong answer.

   A handful of labels below are the SAME English text as an existing key in
   learning-focus.ts or as another list in this file (e.g. "I wrote more
   words than the limit allowed" is common to sentence completion and table
   completion). Those are defined once and reused; redefining a key with a
   different Russian value is what tests/i18n.test.ts's conflict check
   exists to catch. */

export const strings: Record<string, string> = {
  /* FocusedExercise.tsx: the new per-item answer shapes (WP18a) */
  'Answer for {label}': 'Ответ для {label}',
  'Choose an option': 'Выберите вариант',
  'Up to {n} words.': 'Не более {n} слов.',
  'You wrote {given}. That is not the one.': 'Вы написали {given}. Это не тот ответ.',
  'Written for this site, not a real exam question.':
    'Написано для этого сайта, а не настоящий экзаменационный вопрос.',

  /* src/data/focused/reading-tfng.ts */
  'True / False / Not Given: guided practice': 'True / False / Not Given: практика с подсказками',
  'True / False / Not Given: more guided practice': 'True / False / Not Given: ещё практика с подсказками',
  'True / False / Not Given: independent check': 'True / False / Not Given: самостоятельная проверка',
  'True / False / Not Given: second independent check':
    'True / False / Not Given: вторая самостоятельная проверка',
  'Decide whether a statement is True, False or Not Given, by checking the passage rather than your own knowledge.':
    'Определяйте, верно ли утверждение (True), неверно (False) или в тексте об этом не сказано (Not Given), проверяя текст, а не то, что вы уже знаете.',
  'Show on a passage you have not seen that you can decide True, False or Not Given on your own.':
    'Покажите на незнакомом тексте, что вы можете самостоятельно определять True, False или Not Given.',
  'Show on a second unseen passage that you can decide True, False or Not Given on your own.':
    'Покажите на втором незнакомом тексте, что вы можете самостоятельно определять True, False или Not Given.',

  /* src/data/focused/reading-yes-no-notgiven.ts */
  'Yes / No / Not Given: guided practice': 'Yes / No / Not Given: практика с подсказками',
  'Yes / No / Not Given: more guided practice': 'Yes / No / Not Given: ещё практика с подсказками',
  'Yes / No / Not Given: independent check': 'Yes / No / Not Given: самостоятельная проверка',
  'Yes / No / Not Given: second independent check': 'Yes / No / Not Given: вторая самостоятельная проверка',
  "Decide whether a statement matches the writer's opinion, and tell that apart from a fact the passage never gives.":
    'Определяйте, совпадает ли утверждение с мнением автора, и отличайте это от факта, которого в тексте просто нет.',
  'Show on a passage you have not seen that you can decide Yes, No or Not Given on your own.':
    'Покажите на незнакомом тексте, что вы можете самостоятельно определять Yes, No или Not Given.',
  'Show on a second unseen passage that you can decide Yes, No or Not Given on your own.':
    'Покажите на втором незнакомом тексте, что вы можете самостоятельно определять Yes, No или Not Given.',

  /* src/data/focused/reading-matching-features.ts */
  'Matching Features: guided practice': 'Matching Features: практика с подсказками',
  'Matching Features: more guided practice': 'Matching Features: ещё практика с подсказками',
  'Matching Features: independent check': 'Matching Features: самостоятельная проверка',
  'Matching Features: second independent check': 'Matching Features: вторая самостоятельная проверка',
  'Match a statement to the person, place or thing it belongs to, not to the one mentioned nearest it.':
    'Сопоставляйте утверждение с тем человеком, местом или предметом, к которому оно относится, а не с тем, что упомянуто ближе всего.',
  'Show on a passage you have not seen that you can match statements to the right person, place or thing on your own.':
    'Покажите на незнакомом тексте, что вы можете самостоятельно сопоставлять утверждения с нужным человеком, местом или предметом.',
  'Show on a second unseen passage that you can match statements to the right person, place or thing on your own.':
    'Покажите на втором незнакомом тексте, что вы можете самостоятельно сопоставлять утверждения с нужным человеком, местом или предметом.',

  /* src/data/focused/reading-paragraph-matching.ts */
  'Matching Information: guided practice': 'Matching Information: практика с подсказками',
  'Matching Information: more guided practice': 'Matching Information: ещё практика с подсказками',
  'Matching Information: independent check': 'Matching Information: самостоятельная проверка',
  'Matching Information: second independent check': 'Matching Information: вторая самостоятельная проверка',
  'Find which paragraph holds one specific piece of information, not just the right general topic.':
    'Находите, в каком именно абзаце содержится нужная информация, а не просто абзац на нужную тему.',
  'Show on a passage you have not seen that you can find where one piece of information sits, on your own.':
    'Покажите на незнакомом тексте, что вы можете самостоятельно находить, где именно находится нужная информация.',
  'Show on a second unseen passage that you can find where one piece of information sits, on your own.':
    'Покажите на втором незнакомом тексте, что вы можете самостоятельно находить, где именно находится нужная информация.',

  /* src/data/focused/reading-multiple-choice.ts */
  'Multiple Choice: guided practice': 'Multiple Choice: практика с подсказками',
  'Multiple Choice: more guided practice': 'Multiple Choice: ещё практика с подсказками',
  'Multiple Choice: independent check': 'Multiple Choice: самостоятельная проверка',
  'Multiple Choice: second independent check': 'Multiple Choice: вторая самостоятельная проверка',
  'Choose the option the passage actually supports and reject the ones that only sound right.':
    'Выбирайте вариант, который действительно подтверждается текстом, и отклоняйте варианты, которые просто звучат правдоподобно.',
  'Show on a passage you have not seen that you can choose the option the passage supports, on your own.':
    'Покажите на незнакомом тексте, что вы можете самостоятельно выбирать вариант, который подтверждается текстом.',
  'Show on a second unseen passage that you can choose the option the passage supports, on your own.':
    'Покажите на втором незнакомом тексте, что вы можете самостоятельно выбирать вариант, который подтверждается текстом.',

  /* src/data/focused/reading-sentence-completion.ts */
  'Sentence Completion: guided practice': 'Sentence Completion: практика с подсказками',
  'Sentence Completion: more guided practice': 'Sentence Completion: ещё практика с подсказками',
  'Sentence Completion: independent check': 'Sentence Completion: самостоятельная проверка',
  'Sentence Completion: second independent check': 'Sentence Completion: вторая самостоятельная проверка',
  'Fill a gap with the exact words from the passage, inside the stated word limit.':
    'Заполняйте пропуск точными словами из текста, не превышая указанный лимит слов.',
  'Show on a passage you have not seen that you can complete a sentence with words taken straight from the passage, on your own.':
    'Покажите на незнакомом тексте, что вы можете самостоятельно дополнять предложение словами прямо из текста.',
  'Show on a second unseen passage that you can complete a sentence with words taken straight from the passage, on your own.':
    'Покажите на втором незнакомом тексте, что вы можете самостоятельно дополнять предложение словами прямо из текста.',

  /* src/data/focused/reading-table-completion.ts */
  'Table Completion: guided practice': 'Table Completion: практика с подсказками',
  'Table Completion: more guided practice': 'Table Completion: ещё практика с подсказками',
  'Table Completion: independent check': 'Table Completion: самостоятельная проверка',
  'Table Completion: second independent check': 'Table Completion: вторая самостоятельная проверка',
  'Complete a table, note or summary with the exact words from the passage, inside the stated word limit.':
    'Заполняйте таблицу, конспект или краткое изложение точными словами из текста, не превышая указанный лимит слов.',
  'Show on a passage you have not seen that you can complete a table with words taken straight from the passage, on your own.':
    'Покажите на незнакомом тексте, что вы можете самостоятельно заполнять таблицу словами прямо из текста.',
  'Show on a second unseen passage that you can complete a table with words taken straight from the passage, on your own.':
    'Покажите на втором незнакомом тексте, что вы можете самостоятельно заполнять таблицу словами прямо из текста.',

  /* src/data/focused/reading-multiple-answer.ts */
  'Multiple Answer: guided practice': 'Multiple Answer: практика с подсказками',
  'Multiple Answer: more guided practice': 'Multiple Answer: ещё практика с подсказками',
  'Multiple Answer: independent check': 'Multiple Answer: самостоятельная проверка',
  'Multiple Answer: second independent check': 'Multiple Answer: вторая самостоятельная проверка',
  'Choose the two correct statements from a longer list, checking every option against the passage.':
    'Выбирайте два верных утверждения из более длинного списка, проверяя каждый вариант по тексту.',
  'Show on a passage you have not seen that you can choose the correct statements from a list, on your own.':
    'Покажите на незнакомом тексте, что вы можете самостоятельно выбирать верные утверждения из списка.',
  'Show on a second unseen passage that you can choose the correct statements from a list, on your own.':
    'Покажите на втором незнакомом тексте, что вы можете самостоятельно выбирать верные утверждения из списка.',

  /* src/data/focused/reading-categorisation.ts */
  'Categorisation: guided practice': 'Categorisation: практика с подсказками',
  'Categorisation: more guided practice': 'Categorisation: ещё практика с подсказками',
  'Categorisation: independent check': 'Categorisation: самостоятельная проверка',
  'Categorisation: second independent check': 'Categorisation: вторая самостоятельная проверка',
  'Classify a statement under the right person, place or thing from a shared list.':
    'Относите утверждение к нужному человеку, месту или предмету из общего списка.',
  'Show on a passage you have not seen that you can classify a statement under the right category, on your own.':
    'Покажите на незнакомом тексте, что вы можете самостоятельно относить утверждение к нужной категории.',
  'Show on a second unseen passage that you can classify a statement under the right category, on your own.':
    'Покажите на втором незнакомом тексте, что вы можете самостоятельно относить утверждение к нужной категории.',

  /* src/data/focused/reading-sentence-endings.ts (authored, guided only) */
  'Sentence Endings: guided practice': 'Sentence Endings: практика с подсказками',
  'Complete a sentence with the ending the passage actually supports, not just one that fits grammatically.':
    'Дополняйте предложение тем окончанием, которое подтверждается текстом, а не просто грамматически подходит.',

  /* Reason lists: how the student says they chose, and what that usually
     means (src/data/focused-exercises.ts MISTAKE_REASONS). "I ran out of
     time" and "I guessed" already exist in learning-focus.ts and are not
     repeated here. */

  /* tfng */
  'It repeats the same words as the passage': 'Оно повторяет те же слова, что и в тексте',
  'choosing an answer because the wording matches, rather than checking what the passage actually claims':
    'выбор ответа по совпадению формулировок, а не по тому, что текст утверждает на самом деле',
  'The passage did not mention it, so I chose False': 'В тексте об этом не упоминалось, поэтому я выбрал False',
  'treating information the passage never gives as if it contradicted the statement, which is Not Given rather than False':
    'восприятие отсутствующей в тексте информации как противоречащей утверждению, тогда как это Not Given, а не False',
  'I used what I already know about the topic': 'Я использовал то, что уже знаю по этой теме',
  "answering from outside knowledge instead of from what the passage itself says":
    'ответ на основе собственных знаний, а не того, что говорится в самом тексте',
  'I was not sure what the statement claims': 'Я не был уверен, что именно утверждает высказывание',
  'not pinning down exactly what the statement is asserting before deciding':
    'нет точного понимания, что именно утверждает высказывание, прежде чем принять решение',

  /* yes-no-notgiven */
  'The passage did not mention it, so I chose No': 'В тексте об этом не упоминалось, поэтому я выбрал No',
  'treating an opinion the writer never gives as if it contradicted the statement, which is Not Given rather than No':
    'восприятие мнения, которого автор не высказывал, как противоречащего утверждению, тогда как это Not Given, а не No',
  'I checked whether it was true, not what the writer thinks': 'Я проверял, правда ли это, а не то, что думает автор',
  "answering from the facts in the passage rather than from the writer's own opinion, which is what this question type actually asks for":
    'ответ по фактам из текста вместо мнения автора, хотя именно мнение автора и спрашивает этот тип вопроса',
  'choosing an answer because the wording matches, rather than checking what the writer actually claims':
    'выбор ответа по совпадению формулировок, а не по тому, что на самом деле утверждает автор',

  /* matching-features */
  'It repeats a name or word from the statement': 'Оно повторяет имя или слово из утверждения',
  'matching a repeated word instead of checking who or what the sentence is really about':
    'сопоставление по повторяющемуся слову вместо проверки, о ком или о чём на самом деле утверждение',
  'The person seemed right, but I did not check the exact point': 'Человек казался подходящим, но я не проверил именно этот момент',
  'picking a person mentioned near the right idea instead of the one who actually said or did that specific thing':
    'выбор человека, упомянутого рядом с нужной мыслью, вместо того, кто на самом деле это сказал или сделал',
  'Two people in the list were too similar to me': 'Два человека в списке показались мне слишком похожими',
  'not yet separating two people whose views or actions are close, by the one detail that tells them apart':
    'пока не получается развести двух похожих по взглядам или действиям людей по единственной детали, которая их отличает',
  'I chose the person mentioned first in the passage': 'Я выбрал человека, упомянутого в тексте первым',
  'trusting order of appearance instead of checking who is actually connected to this exact statement':
    'доверие порядку появления в тексте вместо проверки, кто на самом деле связан именно с этим утверждением',

  /* paragraph-matching (label "It repeats words from the paragraph" already
     exists, from matching-headings; only its own diagnosis here is new) */
  'choosing a paragraph because its words appear there, rather than because it actually contains that specific information':
    'выбор абзаца по совпадению слов, а не потому что в нём действительно есть нужная информация',
  'The paragraph was about the right topic, but not this exact detail': 'Абзац был на нужную тему, но не об этой конкретной детали',
  'matching the general subject of the paragraph instead of the one specific fact the question asks for':
    'сопоставление по общей теме абзаца вместо конкретного факта, о котором спрашивает вопрос',
  'The first paragraph I checked seemed to fit': 'Первый проверенный абзац показался подходящим',
  'stopping at the first plausible paragraph instead of checking the others for a closer match':
    'остановка на первом подходящем абзаце вместо проверки остальных на более точное совпадение',
  'The information seemed to be in more than one paragraph': 'Казалось, что информация есть в нескольких абзацах',
  'not yet finding the one paragraph where the detail is stated most precisely':
    'пока не найден тот единственный абзац, где деталь указана точнее всего',

  /* multiple-choice (also used by multiple-answer where noted) */
  'It repeats words from the passage': 'Оно повторяет слова из текста',
  'choosing an option because its wording matches the passage, rather than because it is what the passage actually says':
    'выбор варианта по совпадению формулировок с текстом, а не по тому, что текст говорит на самом деле',
  'It sounded true, even if the passage did not say it': 'Это звучало правдоподобно, даже если текст такого не говорил',
  "choosing an option using outside knowledge or common sense instead of the passage's own words":
    'выбор варианта на основе общих знаний или здравого смысла, а не слов самого текста',
  'It was partly right, so I picked it': 'Это было отчасти верно, поэтому я выбрал этот вариант',
  'choosing an option that is true in part instead of checking whether the whole statement matches':
    'выбор варианта, верного лишь отчасти, вместо проверки, совпадает ли утверждение целиком',
  'I ruled out two options but guessed between the last two': 'Я исключил два варианта, но угадывал между последними двумя',
  'not finding the one detail that separates two remaining options':
    'не найдена та единственная деталь, которая отличает два оставшихся варианта',

  /* sentence-completion (also used by table-completion where noted) */
  'I wrote a word that did not fit the gap grammatically': 'Я написал слово, которое грамматически не подходило к пропуску',
  'not checking what type of word the gap needs (a noun, a number, a name) before writing an answer':
    'нет проверки, какой тип слова нужен в пропуске (существительное, число, имя), перед тем как написать ответ',
  'I wrote more words than the limit allowed': 'Я написал больше слов, чем разрешал лимит',
  'not checking the stated word limit before writing the answer':
    'нет проверки указанного лимита слов перед тем, как написать ответ',
  "I wrote my own words instead of the passage's exact words": 'Я написал свои слова вместо точных слов из текста',
  'paraphrasing instead of copying the exact word or words the passage uses':
    'пересказ своими словами вместо точного слова или слов, которые использует текст',
  'I took the answer from the wrong part of the passage': 'Я взял ответ не из той части текста',
  'not finding the exact part of the passage the sentence is paraphrasing':
    'не найдена именно та часть текста, которую перефразирует предложение',

  /* table-completion's own strings */
  'I filled in the wrong row or column': 'Я заполнил не ту строку или колонку',
  'not matching the gap to the right row before deciding on an answer':
    'нет сопоставления пропуска с нужной строкой перед тем, как выбрать ответ',
  'not finding the exact part of the passage that matches this row':
    'не найдена именно та часть текста, которая соответствует этой строке',

  /* multiple-answer's own strings */
  'choosing an option because its wording matches the passage, rather than because it is one of the actual points made there':
    'выбор варианта по совпадению формулировок с текстом, а не потому что это один из реальных пунктов, упомянутых в тексте',
  'I was confident about one option but guessed the second': 'Я был уверен в одном варианте, но угадывал второй',
  'not checking every remaining option against the passage before settling on the second choice':
    'нет проверки каждого оставшегося варианта по тексту перед тем, как выбрать второй',
  'It seemed like a reasonable answer, even though the passage did not quite say it':
    'Это казалось разумным ответом, хотя текст говорил не совсем это',
  'choosing an option that sounds reasonable instead of one the passage actually states':
    'выбор варианта, который звучит разумно, вместо того, что действительно утверждает текст',
  'I found one correct point but missed where the second one was': 'Я нашёл один верный пункт, но не нашёл, где находится второй',
  'stopping after finding one correct option instead of continuing to check for the other':
    'остановка после нахождения одного верного варианта вместо продолжения поиска второго',

  /* categorisation */
  'It repeats words from the statement': 'Оно повторяет слова из утверждения',
  'matching a repeated word instead of checking which category the statement actually belongs to':
    'сопоставление по повторяющемуся слову вместо проверки, к какой категории утверждение относится на самом деле',
  'Two categories in the list were too similar to me': 'Две категории в списке показались мне слишком похожими',
  'not yet separating two close categories by the one detail that tells them apart':
    'пока не получается развести две похожие категории по единственной детали, которая их отличает',
  'It was about the right topic, but the wrong category': 'Это было на нужную тему, но не та категория',
  'matching the general subject instead of checking which specific category the statement is classified under':
    'сопоставление по общей теме вместо проверки, к какой именно категории отнесено утверждение',
  'I chose the category mentioned first in the passage': 'Я выбрал категорию, упомянутую в тексте первой',
  'trusting order of appearance instead of checking which category this exact statement belongs to':
    'доверие порядку появления в тексте вместо проверки, к какой категории относится именно это утверждение',

  /* sentence-endings */
  'I only checked that the grammar fit, not the meaning': 'Я проверил только грамматику, но не смысл',
  'matching an ending that is grammatically possible instead of checking that it is also true according to the passage':
    'выбор окончания, которое грамматически возможно, без проверки, верно ли оно по содержанию текста',
  'It repeats words from the sentence beginning': 'Оно повторяет слова из начала предложения',
  'choosing an ending because its wording echoes the beginning, rather than because it is the ending the passage actually supports':
    'выбор окончания по созвучию с началом предложения, а не потому что именно его подтверждает текст',
  'It sounded like a reasonable way to finish the sentence': 'Это звучало как разумный способ закончить предложение',
  'choosing an ending that sounds natural instead of the one the passage actually supports':
    'выбор окончания, которое звучит естественно, вместо того, которое подтверждает текст',
  'I matched it to the wrong part of the passage': 'Я сопоставил это не с той частью текста',
  'not finding the exact part of the passage the sentence beginning is paraphrasing':
    'не найдена именно та часть текста, которую перефразирует начало предложения',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
