# Translating a lesson into Russian

This is the whole job description. If you are translating one of the lesson
pages, you need nothing else: read this once, do your batch, run the checker.

Interface strings are a different job with a different guide
(`docs/I18N-GUIDE.md`, dictionaries in `src/lib/i18n/dict/ru/`). Do not touch
those files. The plan behind both is `docs/RUSSIAN-TRANSLATION-PLAN.md`.

---

## 1. The goal, in the site owner's words

Our students are Russian speakers in Almaty preparing for an English exam.

**The explanation goes into Russian. The exam material stays in English.**

A student should be able to read *how the task works, what the examiner
rewards, where people lose marks* in their own language, at full speed, with
nothing lost. And they should still practise on the same English they will
meet on exam day. A lesson that translates the practice passage has destroyed
the exercise. A lesson that leaves the strategy in English has helped nobody.

When you are unsure which side of that line something falls on, ask one
question: **is the student meant to understand this, or to learn to handle it
in English?** Understanding goes into Russian. Handling stays English.

---

## 2. STAYS ENGLISH

Copy these across exactly as they are, character for character.

- **Reading passages and extracts.** Anything inside a `.passage-box`, and
  any quoted stretch of a text the student is meant to read.
- **Listening transcripts** and anything quoted from a recording
  (`<strong>Recording:</strong> "…"`).
- **Practice questions, statements, options and their answers.** Question
  stems, gapped sentences, the statements in a True/False exercise, the
  options A to E, and the answers themselves: TRUE, FALSE, NOT GIVEN, YES,
  NO, and bare letters.
- **Model answers, sample essays, sample speaking answers** and any example
  sentence whose job is to demonstrate English.
- **Useful-language phrases and sentence starters** the student is meant to
  learn and reuse: "There is growing evidence that…", "given that…", the
  collocation lists, the linking-word lists.
- **Rubric wording quoted from the exam paper**, such as
  *"Do the following statements agree with the information given in Reading
  Passage 1?"* or *(NO MORE THAN THREE WORDS)*.
- **Speaking cue cards**, whole (`.cue-card`): the task line, "You should
  say:", the bullets and the one-minute note are all printed on the real
  card.
- **IELTS** itself, and **band numbers** (band 7, Band 6.5).
- **The four paper names**: Reading, Listening, Writing, Speaking. In English
  even inside a Russian sentence. Same for **Task 1 / Task 2** and
  **Part 1 / Part 2 / Part 3 / Part 4**.
- **Official question type names**, in English: True / False / Not Given,
  Yes / No / Not Given, Matching Headings, Matching Features, Matching
  Information, Sentence Completion, Summary Completion, Note Completion,
  Table Completion, Form Completion, Short Answer, Multiple Choice, Diagram
  Labelling, Map Labelling.

### IELTS task names on first mention

**Keep the English name in bold, nothing else.** No Russian gloss, no
transliteration, no bracketed translation. The student must recognise that
exact string on the paper, and a Russian gloss beside it only teaches a word
they will never see on exam day.

```html
<!-- yes -->
<p>Официальное название задания: <strong>True / False / Not Given</strong>.</p>

<!-- no -->
<p>Официальное название задания: верно / неверно / не указано
   (<strong>True / False / Not Given</strong>).</p>
```

The one exception is the paragraph that *defines* the name, where a plain
Russian sentence explaining what each answer means is exactly the point. That
is not a gloss on the name, it is the lesson.

### Mini-examples built out of English wording

Many lessons make a point with a two-line example: what the passage says
versus what the statement says. The trap lives in the English words, so the
example stays English and only the label and the commentary move:

```html
<!-- English -->
<td>Passage: up to 50 pairs of birds nest on the island. Statement: 50 pairs
    of birds nest on the island. "Up to 50" is equally satisfied by 12.</td>

<!-- Russian -->
<td>В тексте: up to 50 pairs of birds nest on the island. В утверждении:
    50 pairs of birds nest on the island. "Up to 50" одинаково верно и
    для 12 пар.</td>
```

### The short English labels inside a frozen block

`.passage-box`, `.type-example-question`, `.cue-card` and `.speaking-answer`
are frozen **whole**, including their small labels ("Passage extract",
"Recording:", "Question:"). The checker enforces this, so do not translate
inside one even when the label alone looks harmless. Labels that sit *outside*
the block (`.type-example-label`, an `<h3>` above it, the `.label` chip on a
`.good-answer`) are yours to translate.

---

## 3. GOES INTO RUSSIAN

- Every heading: `<h2>`, `<h3>`, `<summary>`, the `.tag` eyebrow.
- Explanations, strategy steps, numbered methods, the "how to approach it"
  lists.
- Tips, warnings, common-mistake notes: `.tip-pill`, `.good-pill`,
  `.note-box`, and the prose in `.card`.
- **The commentary that explains why an answer is right or wrong.** The
  English evidence quoted inside that commentary stays English:

  ```html
  <li><strong>Что говорит текст:</strong> "the money for its construction
      came from a group of local merchants".</li>
  ```

- Table headers, including the headers of a vocabulary table.
- Button-like labels inside the body: "Show Practice Exercise", "Show the
  answers", the text of a `<summary>`.
- `title`, `alt` and `aria-label` text.

---

## 4. Vocabulary tables: the owner's decision, fixed

In a table whose first header is **Word / Phrase**:

| Column | What happens |
|---|---|
| Word / Phrase | **English, unchanged.** This is the thing being learned. |
| Meaning | **Russian.** This is the one translated column. |
| Example in Context | **English, unchanged.** It shows the word in use. |
| any other column | **English, unchanged.** |

The header row itself **is** translated. Part of speech, collocation lists
and the "Useful Essay Phrases" card stay English.

The checker enforces the columns. It finds the table by its English first
header and compares by position, which is why the headers are free.

**Before**, from `src/content/lesson-bodies/vocabulary-education.html`:

```html
<table class="vocab-table">
  <thead><tr><th>Word / Phrase</th><th>Meaning</th><th>Example in Context</th></tr></thead>
  <tbody>
    <tr><td>rote learning</td><td>memorisation of information through repetition without deep understanding</td><td>"Critics argue that rote learning discourages creativity and problem-solving."</td></tr>
  </tbody>
</table>
```

**After**, from `src/content/lesson-bodies/ru/vocabulary-education.html`:

```html
<table class="vocab-table">
  <thead><tr><th>Слово или фраза</th><th>Значение</th><th>Пример в контексте</th></tr></thead>
  <tbody>
    <tr><td>rote learning</td><td>заучивание наизусть через повторение, без глубокого понимания</td><td>"Critics argue that rote learning discourages creativity and problem-solving."</td></tr>
  </tbody>
</table>
```

---

## 5. Tone

You are a good teacher talking to one student, not a manual.

- Address the student as **вы**, lowercase, always.
- Warm, plain, unhurried. The English is already calm; keep it calm.
- **Natural Russian, not word for word.** If the English metaphor has no
  comfortable Russian equivalent, say the same thing plainly instead.
  "Feelings are not repeatable, so they cannot be trained" becomes "Ощущение
  не повторяется от раза к разу, поэтому натренировать его нельзя", not a
  literal rendering of "repeatable".
- Prefer the imperative the English uses ("Прочитайте", "Смотрите на смысл").
- No exclamation marks unless the English has one. No "дорогой студент", no
  "необходимо осуществить". If a sentence sounds like a government form,
  rewrite it.
- Russian runs 15 to 30 percent longer than English. Cut words, not meaning.
- Russian quotation marks are `«…»`. A quoted piece of **English** keeps the
  straight `"…"` the source used, so the two are visually distinct on the
  page.

### Terminology

Consistent with the interface dictionary in `src/lib/i18n/dict/ru/`. If a word
is already decided there, it is decided here.

| English | Russian |
|---|---|
| lesson | урок |
| course | курс |
| unit | раздел |
| section (of a lesson) | раздел |
| overview | обзор |
| practice | практика |
| exercise | упражнение |
| practice test | пробный тест |
| mock exam | пробный экзамен |
| band | балл |
| target band | целевой балл |
| estimated band | примерный балл |
| band descriptors | дескрипторы баллов |
| criterion | критерий |
| examiner | экзаменатор |
| study plan | учебный план |
| feedback | разбор |
| essay | эссе |
| passage / extract | отрывок / фрагмент текста |
| transcript | расшифровка |
| question paper | лист заданий |
| answer sheet | бланк ответов |
| question | вопрос |
| statement | утверждение |
| answer | ответ |
| option | вариант |
| distractor | отвлекающий вариант |
| keyword | ключевое слово |
| to scan / to skim | просмотреть текст / прочитать бегло |
| paraphrase | перефразирование |
| gap / blank | пропуск |
| word limit | ограничение по количеству слов |
| marked wrong | засчитают как ошибку |
| trap | ловушка |
| vocabulary (topic) | тематическая лексика |
| collocation | коллокация |
| linking words | слова-связки |
| cue card | карточка задания |
| model answer | образец ответа |
| introduction | вступление |
| body paragraph | основной абзац |
| conclusion | заключение |
| opinion | мнение |
| tense | время (глагола) |
| line graph | линейный график |
| bar chart | столбчатая диаграмма |
| pie chart | круговая диаграмма |
| process diagram | диаграмма процесса |
| map | карта |

Paper names, IELTS, Task 1 / Task 2, Part 1 / Part 2 and the official
question type names stay in English, as in section 2.

---

## 6. Mechanical rules

The file you write is dropped straight into the page in place of the English,
so its shape has to match the English exactly.

1. **Translate text only.** Every tag, every attribute, every `id`, `class`,
   `style`, `href`, `src`, `data-*`, every HTML comment and every entity
   stays exactly where it is, in the same order. Do not tidy the markup, do
   not merge two `<p>` into one, do not add a tag "because Russian needs it".
   `title`, `alt` and `aria-label` are the only attributes whose *values* you
   translate.
2. **Comments are load-bearing.** `<!-- lesson-cards -->` is where the
   runtime cuts the file into the two halves that sit either side of a
   generated card grid. Copy every comment across unchanged and in place.
3. **Line 1 is the source hash**, on its own line, nothing before it:

   ```
   <!-- i18n-source-sha256: b59debfd9f7a0583a88db179f279051ebd5b1e76d49a6662d004e5472c779434 -->
   ```

   Get it with:

   ```
   node tools/lesson-ru.mjs hash reading-tfng
   ```

   It records which version of the English you translated. When somebody
   edits the English later, the hash stops matching and the checker reports
   the translation as stale, which is exactly what it is.
4. **Check your work before you call it done:**

   ```
   node tools/lesson-ru.mjs check reading-tfng     # one lesson
   node tools/lesson-ru.mjs check --all            # everything translated
   node tools/lesson-ru.mjs status                 # what is done, missing, stale
   npm test                                        # the same rules, in CI
   ```

   Every message names the place and the fix. Exit code 1 means something is
   wrong.
5. **No em dash (—) and no en dash (–), anywhere, in either language.** House
   rule, and the checker fails on it. Use a comma, a full stop, a colon or
   brackets, or rewrite the sentence. A plain hyphen inside a compound word
   is fine. A hyphen standing in for a dash, with spaces around it, is not:
   restructure the sentence instead.
6. **Entities stay valid.** `&amp;`, `&nbsp;`, `&hellip;`, `&rarr;`,
   `&#9888;` (the warning triangle), `&#10003;` (tick), `&#10007;` (cross)
   and friends are copied as they are. Never write a bare `&`. If the English
   heading is `Education &amp; Learning` and the Russian has no ampersand,
   the entity simply disappears with the word, which is fine.
7. **UTF-8 without a BOM, LF line endings.** The file goes into the page
   as-is; a byte-order mark shows up on screen as rubbish.
8. **The file name is the slug**, e.g.
   `src/content/lesson-bodies/ru/reading-tfng.html`. Nothing registers it;
   the route publishes whatever is in the folder.

### What the checker does not check

It cannot tell whether a sentence is good Russian, and it cannot tell whether
you translated a model answer that happens not to sit in a frozen block.
These stay your responsibility:

- collocation lists, useful-phrase cards and sentence starters;
- example sentences and model answers outside `.passage-box`,
  `.type-example-question`, `.cue-card` and `.speaking-answer`;
- practice statements inside an `.exercise-box`;
- the headword answer in a `.good-answer` / `.bad-answer` pair (the `.label`
  chip and the explanation below it are Russian, the answer itself is not);
- whether the Russian is natural.

---

## 7. Worked examples

### An explanation paragraph

**Before** (`reading-tfng.html`):

```html
<h3>How to Approach It</h3>
<ol>
  <li>Read each statement carefully and identify keywords.</li>
  <li>Focus on <strong>meaning</strong>, not just word-matching. The passage will paraphrase the statement.</li>
</ol>
```

**After** (`ru/reading-tfng.html`):

```html
<h3>Как подходить к заданию</h3>
<ol>
  <li>Внимательно прочитайте каждое утверждение и выделите ключевые слова.</li>
  <li>Смотрите на <strong>смысл</strong>, а не на совпадение слов. Текст перескажет утверждение другими словами.</li>
</ol>
```

Both `<strong>` tags are still there, in the same place, around the same
idea.

### A quiz item and its explanation

The statement is exam material and does not move. The labels and the
reasoning do. The quoted evidence inside the reasoning does not.

**Before:**

```html
<h3>Statement 1</h3>
<p><em>"Marta Lind paid for the construction of the Halden Bridge."</em></p>
<ul style="margin-top:0.6rem;">
  <li><strong>What would make this FALSE:</strong> the passage saying the money came from somebody other than Lind.</li>
  <li><strong>What the passage says:</strong> "the money for its construction came from a group of local merchants".</li>
  <li><strong>Decision:</strong> that is the FALSE sentence, word for word in meaning. The answer is <strong>FALSE</strong>.</li>
</ul>
```

**After:**

```html
<h3>Утверждение 1</h3>
<p><em>"Marta Lind paid for the construction of the Halden Bridge."</em></p>
<ul style="margin-top:0.6rem;">
  <li><strong>Что сделало бы его FALSE:</strong> если бы в тексте говорилось, что деньги пришли не от Линд, а от кого-то другого.</li>
  <li><strong>Что говорит текст:</strong> "the money for its construction came from a group of local merchants".</li>
  <li><strong>Решение:</strong> это и есть то самое предложение FALSE, слово в слово по смыслу. Ответ <strong>FALSE</strong>.</li>
</ul>
```

### A vocabulary row

**Before:**

```html
<tr><td>tuition fees</td><td>money charged for university education</td><td>"Rising tuition fees are deterring students from lower-income families."</td></tr>
```

**After:**

```html
<tr><td>tuition fees</td><td>плата за обучение в университете</td><td>"Rising tuition fees are deterring students from lower-income families."</td></tr>
```

The two reference translations to read before you start are
`src/content/lesson-bodies/ru/reading-tfng.html` and
`src/content/lesson-bodies/ru/vocabulary-education.html`.

---

## 8. The batches

52 lessons remain. `reading-tfng` and `vocabulary-education` are the pilots
and are done.

Sizes are the English file in bytes with LF line endings, which is what
`node tools/lesson-ru.mjs status` prints. Batches are balanced by total
bytes (37 KB to 45 KB each) and keep a skill together wherever balance
allowed, so terminology stays consistent inside a skill. Reading is two
batches, Speaking is two, Listening is two, Writing is two, and the
vocabulary topics are spread over the four smaller ones.

**One agent per batch. Do not touch a lesson outside your batch.**

### Batch A: Speaking, the overview and Part 1 (37,092 bytes, 2 files)

| Slug | Bytes |
|---|---|
| speaking | 3,798 |
| speaking-part1 | 33,294 |

### Batch B: Speaking, Parts 2 and 3 (44,674 bytes, 2 files)

| Slug | Bytes |
|---|---|
| speaking-part2 | 29,346 |
| speaking-part3 | 15,328 |

### Batch C: Reading, the overview and the judgement tasks (37,366 bytes, 5 files)

| Slug | Bytes |
|---|---|
| reading-task1 | 13,015 |
| reading-ynng | 15,687 |
| reading-mc | 3,308 |
| reading-paraphrase | 3,211 |
| reading-headings | 2,145 |

`reading-task1` is split on a `<!-- lesson-cards -->` comment. Keep it in the
same position or the page will not assemble.

### Batch D: Reading, completion and matching (40,480 bytes, 7 files)

| Slug | Bytes |
|---|---|
| reading-short-answer | 8,643 |
| reading-summary-completion | 8,508 |
| reading-diagram | 7,519 |
| reading-sentence | 7,481 |
| reading-matching-sentence-endings | 3,498 |
| reading-matching-features | 2,443 |
| reading-matching-information | 2,388 |

### Batch E: Listening, the overview and Parts 1 to 4, plus general vocabulary (44,014 bytes, 12 files)

| Slug | Bytes |
|---|---|
| listening | 4,532 |
| listening-part1 | 2,639 |
| listening-part2 | 2,970 |
| listening-part3 | 2,187 |
| listening-part4 | 2,278 |
| listening-map-labelling | 3,331 |
| listening-matching | 2,984 |
| listening-multiple-choice | 3,429 |
| vocabulary | 2,050 |
| vocabulary-ai | 4,371 |
| vocabulary-conjunctions | 8,872 |
| vocabulary-crime | 4,371 |

`listening` is split on a `<!-- lesson-cards -->` comment. Keep it in place.
`vocabulary-conjunctions` holds six Word / Phrase tables; section 4 applies to
every one of them.

### Batch F: Listening completion tasks, plus society vocabulary (44,771 bytes, 7 files)

| Slug | Bytes |
|---|---|
| listening-form-completion | 9,141 |
| listening-sentence-completion | 9,243 |
| listening-short-answer | 9,018 |
| vocabulary-environment | 4,093 |
| vocabulary-family | 4,478 |
| vocabulary-government | 4,449 |
| vocabulary-health | 4,349 |

### Batch G: Writing Task 1, plus everyday vocabulary (40,360 bytes, 8 files)

| Slug | Bytes |
|---|---|
| writing | 4,132 |
| writing-charts | 7,772 |
| writing-method | 6,872 |
| writing-maps | 4,014 |
| writing-process | 4,014 |
| vocabulary-housing | 4,365 |
| vocabulary-social-media | 4,532 |
| vocabulary-society | 4,659 |

### Batch H: Writing Task 2, plus work and travel vocabulary (42,195 bytes, 9 files)

| Slug | Bytes |
|---|---|
| writing-task2-method | 8,018 |
| writing-problem | 5,128 |
| writing-twopart | 4,803 |
| writing-advantages | 4,039 |
| writing-discussion | 3,806 |
| writing-opinion | 3,489 |
| vocabulary-technology | 4,010 |
| vocabulary-travel | 4,573 |
| vocabulary-work | 4,329 |
