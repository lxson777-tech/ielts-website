/* Russian for the practice exercises inside lessons (pre-publish fix,
   3 October 2026): every set title, set intro and unit intro in
   src/data/reading-practice.ts and src/data/listening-practice.ts, which
   PracticeQuiz.tsx now passes through t(). They are data, so the coverage
   extractor cannot see them; tests/practice-quiz.test.ts checks instead that
   every one of them has an entry here. Change the English in the data and
   that test names the entry to update.

   The passages, questions, options and explanations are exam material and
   stay English. Question type names, Passage, Part, Yes / No / Not Given and
   the paper's own word-limit rubric (NO MORE THAN TWO WORDS and so on) stay
   English inside the Russian, because that is what the student will read on
   the real paper. Kazakh falls back to this file. */
export const strings: Record<string, string> = {
  /* PracticeQuiz.tsx: a repeated answer inside an answer pool */
  '“{answer}” already earned its mark in another blank of this group, and each answer counts once.':
    '«{answer}» уже принёс балл в другом пропуске этой группы, а каждый ответ засчитывается только один раз.',

  /* Reading: set titles and intros */
  'Exercise. Spot the Correct Paraphrase': 'Упражнение. Найдите верный парафраз',
  'Warm-up, written for this lesson: for each "passage" sentence, choose the option that means the same thing. Not the one that just reuses the same words.':
    'Разминка, составленная для этого урока: для каждого предложения из «текста» выберите вариант с тем же смыслом, а не тот, где просто повторяются те же слова.',
  'Every answer below depends on a paraphrase of the passage above: find the sentence that talks about the same idea, then check whether it really makes the same claim. For the Yes / No / Not Given statements: Yes means the passage says the same thing in other words, No means it says the opposite, and Not Given means it never says it.':
    'Каждый ответ ниже зависит от парафраза текста выше: найдите предложение об этой же мысли, а затем проверьте, действительно ли оно утверждает то же самое. Для утверждений Yes / No / Not Given: Yes значит, что текст говорит то же самое другими словами, No значит, что он говорит противоположное, а Not Given значит, что он об этом вообще не говорит.',
  'Exercise. Choose the correct answer (real test questions)': 'Упражнение. Выберите правильный ответ (настоящие вопросы теста)',
  'Exercise. Decide: True, False, or Not Given (real test questions)':
    'Упражнение. Решите: True, False или Not Given (настоящие вопросы теста)',
  'Exercise. Decide: Yes, No, or Not Given (real test questions)':
    'Упражнение. Решите: Yes, No или Not Given (настоящие вопросы теста)',
  'These statements test what the writer claims or believes. Decide whether the writer agrees (Yes), disagrees (No), or does not say (Not Given).':
    'Эти утверждения проверяют, что автор утверждает или считает. Решите, согласен ли с ними автор (Yes), не согласен (No) или ничего об этом не говорит (Not Given).',
  'Exercise. Match each heading to a paragraph (real test questions)':
    'Упражнение. Подберите к каждому абзацу заголовок (настоящие вопросы теста)',
  'For each paragraph, choose the heading that best fits it, using the passage above.':
    'Для каждого абзаца выберите заголовок, который подходит ему лучше всего, опираясь на текст выше.',
  'Exercise. Which paragraph contains the information? (real test questions)':
    'Упражнение. В каком абзаце есть эта информация? (настоящие вопросы теста)',
  'Exercise. Classify each statement (real test questions)': 'Упражнение. Отнесите каждое утверждение к нужному варианту (настоящие вопросы теста)',
  'Read each statement, then choose which option below it matches, using the passage above.':
    'Прочитайте каждое утверждение и выберите, какому варианту под ним оно соответствует, опираясь на текст выше.',
  'Exercise. Match each sentence beginning to its correct ending (real test questions)':
    'Упражнение. Подберите к началу каждого предложения правильное окончание (настоящие вопросы теста)',
  'Choose the ending that correctly completes each sentence beginning, using the passage above.':
    'Выберите окончание, которое правильно завершает начало каждого предложения, опираясь на текст выше.',
  'Exercise. Complete the sentences (real test questions)': 'Упражнение. Закончите предложения (настоящие вопросы теста)',
  'Fill each gap using words taken from the passage above.': 'Заполните каждый пропуск словами из текста выше.',
  'Exercise. Complete the summary, notes or table (real test questions)':
    'Упражнение. Заполните краткое содержание, заметки или таблицу (настоящие вопросы теста)',
  'Fill each gap using words from the passage above, or the word bank where given.':
    'Заполните каждый пропуск словами из текста выше или из списка слов, если он дан.',
  'Exercise. Answer the questions (real test questions)': 'Упражнение. Ответьте на вопросы (настоящие вопросы теста)',
  'Answer using words taken from the passage above.': 'Отвечайте словами из текста выше.',
  'Exercise. Label the diagram (real test questions)': 'Упражнение. Подпишите схему (настоящие вопросы теста)',
  'Use words from the passage above to complete each label. The real diagram from the test is shown below.':
    'Заполните каждую подпись словами из текста выше. Настоящая схема из теста показана ниже.',

  /* Reading: the word limit of each completion unit, as its paper states it */
  'Choose ONE WORD ONLY from the passage for each answer.':
    'Для каждого ответа выберите из текста только одно слово (в задании: ONE WORD ONLY).',
  'Choose NO MORE THAN TWO WORDS from the passage for each answer.':
    'Для каждого ответа выберите из текста не больше двух слов (в задании: NO MORE THAN TWO WORDS).',
  'Choose NO MORE THAN THREE WORDS from the passage for each answer.':
    'Для каждого ответа выберите из текста не больше трёх слов (в задании: NO MORE THAN THREE WORDS).',
  'Write NO MORE THAN THREE WORDS from the passage for each answer.':
    'Для каждого ответа напишите не больше трёх слов из текста (в задании: NO MORE THAN THREE WORDS).',
  'Write the correct letter, A-L, from the box for each answer. Blanks in the same column of the same section of the table take their letters in any order, but each letter counts only once.':
    'Для каждого ответа напишите правильную букву из списка, от A до L. Пропуски в одном столбце одного раздела таблицы можно заполнить их буквами в любом порядке, но каждая буква засчитывается только один раз.',

  /* Listening: set titles and intros */
  'Exercise. Real questions from IELTS Listening Test 1, Part 1': 'Упражнение. Настоящие вопросы из IELTS Listening Test 1, Part 1',
  'Exercise. Real questions from IELTS Listening Test 1, Part 2': 'Упражнение. Настоящие вопросы из IELTS Listening Test 1, Part 2',
  'Exercise. Real questions from IELTS Listening Test 1, Part 3': 'Упражнение. Настоящие вопросы из IELTS Listening Test 1, Part 3',
  'Exercise. Real questions from IELTS Listening Test 1, Part 4': 'Упражнение. Настоящие вопросы из IELTS Listening Test 1, Part 4',
  'Answer using the actual recording below, the same one real students hear on this test.':
    'Отвечайте по настоящей записи ниже: именно её слышат студенты на этом тесте.',
  'Exercise. Choose the correct letter': 'Упражнение. Выберите правильную букву',
  'Real Part 3 questions from two different IELTS Listening tests.': 'Настоящие вопросы Part 3 из двух разных тестов IELTS Listening.',
  'Exercise. Match each item to the correct answer': 'Упражнение. Подберите к каждому пункту правильный ответ',
  'Real questions from two different IELTS Listening tests. Some options in each list are not used.':
    'Настоящие вопросы из двух разных тестов IELTS Listening. Некоторые варианты в каждом списке не используются.',
  'Exercise. Label the map, plan or diagram': 'Упражнение. Подпишите карту, план или схему',
  'Real questions from two different IELTS Listening tests. Use the picture to work out where each answer is.':
    'Настоящие вопросы из двух разных тестов IELTS Listening. По картинке определите, где находится каждый ответ.',
  'Exercise. Complete the form, notes or table': 'Упражнение. Заполните форму, заметки или таблицу',
  'Real questions from two different IELTS Listening tests. Keep to the word limit given for each one.':
    'Настоящие вопросы из двух разных тестов IELTS Listening. Соблюдайте лимит слов, указанный для каждого задания.',
  'Exercise. Complete the sentences': 'Упражнение. Закончите предложения',
  'Exercise. Answer the questions': 'Упражнение. Ответьте на вопросы',

  /* Listening: the word limit of each completion unit, as its paper states it */
  'Write ONE WORD OR A NUMBER for each answer.':
    'Для каждого ответа напишите одно слово или число (в задании: ONE WORD OR A NUMBER).',
  'Questions with a gap: write ONE WORD OR A NUMBER for each answer.':
    'Вопросы с пропуском: для каждого ответа напишите одно слово или число (в задании: ONE WORD OR A NUMBER).',
  'Write NO MORE THAN TWO WORDS OR A NUMBER for each answer.':
    'Для каждого ответа напишите не больше двух слов или число (в задании: NO MORE THAN TWO WORDS OR A NUMBER).',
  'Questions with a gap: write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.':
    'Вопросы с пропуском: для каждого ответа напишите не больше двух слов и/или число (в задании: NO MORE THAN TWO WORDS AND/OR A NUMBER).',
  'Write NO MORE THAN TWO WORDS for each answer.':
    'Для каждого ответа напишите не больше двух слов (в задании: NO MORE THAN TWO WORDS).',
  'Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.':
    'Для каждого ответа напишите не больше двух слов и/или число (в задании: NO MORE THAN TWO WORDS AND/OR A NUMBER).',
  'Write ONE WORD AND/OR A NUMBER for each answer.':
    'Для каждого ответа напишите одно слово и/или число (в задании: ONE WORD AND/OR A NUMBER).',
  'Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.':
    'Для каждого ответа напишите не больше трёх слов и/или число (в задании: NO MORE THAN THREE WORDS AND/OR A NUMBER).',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
