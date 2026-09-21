# Translating the answer explanations into Russian

This is the whole job description. If you are translating a batch of answer
explanations, you need nothing else: read this once, run `template`, write
your batch, run `check`.

Two neighbours with their own guides, which you do not touch:

- interface strings: `docs/I18N-GUIDE.md`, dictionaries in
  `src/lib/i18n/dict/ru/`;
- lesson bodies: `docs/LESSON-TRANSLATION-BRIEF.md`, files in
  `src/content/lesson-bodies/ru/`.

Everything below follows the same house rules as those two. Where this guide
and the lesson brief could disagree, the lesson brief wins and this is the
bug.

---

## 1. What you are translating

After a student submits a practice test, every question on the review screen
can show a short note: **why this is the answer**. Roughly 2,800 of them
exist, about 480,000 characters, spread over 70 practice tests and the
exercises on the lesson pages.

The note is teaching. The question, the passage, the recording and the answer
are the exam. So:

> **The explanation goes into Russian. The exam material stays in English.**

A student should understand *why* they got it wrong at full speed, in their
own language, and should still be looking at the same English words they will
meet on exam day.

When you are unsure which side of the line something falls on, ask: **is the
student meant to understand this, or to find it in the text in front of
them?** Understanding goes into Russian. Anything they have to find, match or
write stays English.

---

## 2. STAYS ENGLISH

Copy these across exactly, character for character.

- **Everything the note quotes.** The explanations quote the passage or the
  recording constantly, in curly single quotes in the reading tests
  (`‘struggle to navigate through the mass of plants’`) and in straight
  double quotes in the listening ones (`"only 300 metres"`). That quotation
  is the evidence: the student has to find it on the page or hear it in the
  clip. Keep it, keep its quote marks, keep it word for word, including any
  `[s]` or `…` the source put inside it.
- **The answer itself**, whenever the note names it: `cow dung`,
  `fermentation`, `biogas digesters`, `Ludlow`, `15 years`.
- **TRUE / FALSE / NOT GIVEN** and **YES / NO**, in the form the note uses
  them. These are printed on the paper in those words.
- **Option letters**: A, B, C, I, J. Write `вариант C`, never `вариант В`
  (the Cyrillic В that looks the same is a different letter and a different
  answer).
- **Proper names out of the passage or recording**: `Lake Victoria`,
  `Kagera`, `Bellerby`, `Plato`, `Simon`, `Student Support`. The student is
  scanning for that exact string.
- **Part / Passage / Section numbers and paper names**: Reading, Listening,
  Part 1, Passage 2, Section 3, Task 1, IELTS, band numbers.
- **Official question type names**: True / False / Not Given, Matching
  Headings, Matching Features, Sentence Completion, Summary Completion,
  Table Completion, Form Completion, Short Answer, Multiple Choice, Diagram
  Labelling, Map Labelling.
- **Timestamps** as written: `На 02:42`, not `На 2 минуте 42 секунде`.

## 3. GOES INTO RUSSIAN

Everything else, which is most of the sentence:

- where the answer is (`В третьем абзаце`, `На 12:07`, `В том же
  предложении`);
- what the evidence means (`то есть растение держали ради красоты`);
- why a wrong answer is wrong, and what the trap was;
- why something is NOT GIVEN (`про это в тексте не сказано ничего`);
- the ordinal words: first, second, third paragraph, the final paragraph.

---

## 4. Tone

You are a good teacher talking to one student who has just got a question
wrong. Two sentences, not a lecture.

- Address the student as **вы**, lowercase, always.
- Warm, plain, unhurried. The English note is calm; keep it calm.
- **Natural Russian, not word for word.** If an English phrase has no
  comfortable Russian equivalent, say the same thing plainly.
- Keep the note's length. It sits in a small grey panel under one question.
  Russian runs 15 to 30 percent longer than English, so cut words, not
  meaning.
- No exclamation marks unless the English has one. Nothing that sounds like
  a government form.
- Russian quotation marks are `«…»`. A quoted piece of **English** keeps the
  exact quote marks the English note used, so the two are visually distinct
  on the page.

### Terminology

The same table as `docs/LESSON-TRANSLATION-BRIEF.md`, which is in turn
consistent with the interface dictionary. If a word is decided there, it is
decided here.

| English | Russian |
|---|---|
| passage / extract | отрывок / фрагмент текста |
| paragraph | абзац |
| transcript | расшифровка |
| recording | запись |
| question | вопрос |
| statement | утверждение |
| answer | ответ |
| option | вариант |
| distractor | отвлекающий вариант |
| keyword | ключевое слово |
| paraphrase | перефразирование |
| gap / blank | пропуск |
| word limit | ограничение по количеству слов |
| marked wrong | засчитают как ошибку |
| trap | ловушка |
| speaker | говорящий |
| practice test | пробный тест |
| band | балл |
| examiner | экзаменатор |

Paper names, IELTS, Task 1 / Task 2, Part 1 / Part 2, the question type names
and the letters stay in English, as in section 2.

---

## 5. Three worked examples, from the two pilot tests

### A reading True / False / Not Given note

`reading-full-001`, question 1. Answer: `True`.

**English**

> The second paragraph says Belgian colonists in Rwanda ‘liked the look of
> its glossy leaves and delicate purple flowers’, showing it was valued as an
> ornamental plant, matching ‘decorative’.

**Russian**

> Во втором абзаце о бельгийских колонистах в Руанде сказано: ‘liked the look
> of its glossy leaves and delicate purple flowers’. Значит, растение держали
> ради красоты, а это то же самое, что ‘decorative’ в утверждении.

What happened: both quotations survived untouched, including their curly
quotes. The English sentence hangs the quotation off "colonists ... liked",
which Russian cannot do in the same shape, so the sentence was rebuilt around
a colon. `‘decorative’` is the word the student has to match against the
statement, so it stays English even though it is a single ordinary word.

### A reading completion note

`reading-full-001`, question 8. Answer: `Cow dung`.

**English**

> The sixth paragraph explains the digesters turn ‘a mix of water hyacinth
> and cow dung into biogas’, giving the exact words needed for this gap.

**Russian**

> В шестом абзаце сказано, что установки перерабатывают ‘a mix of water
> hyacinth and cow dung into biogas’. Это ровно те слова, которых не хватает
> в пропуске.

What happened: the answer is inside the quotation, so keeping the quotation
keeps the answer. Never lift the answer out of the quotation and translate
the rest around it: the student is about to look for that line in the
passage.

### A listening note

`listening-full-001`, question 15. Answer: `H`.

**English**

> At 12:07 Simon says Liz "devotes all her energies to recruiting and
> supporting the large squadron of workers", i.e. staffing.

**Russian**

> На 12:07 Simon говорит, что Liz "devotes all her energies to recruiting and
> supporting the large squadron of workers", то есть отвечает за персонал.
> Это вариант H.

What happened: the timestamp is left as it is, the two names are left as they
are, the quotation keeps its straight double quotes (that is what the
listening tests use), `i.e.` becomes `то есть`, and the option letter is
spelled out at the end in Latin H. The English note leaves the letter to the
interface; saying it once in Russian is clearer and is what the pilots do.

---

## 6. The file you write

One file per test, at `src/data/tests/ru/<id>.json`, UTF-8, no byte-order
mark:

```json
{
  "id": "reading-full-002",
  "locale": "ru",
  "entries": {
    "q1": {
      "sha": "5a7b6b6db3d94f67",
      "ru": "Во втором абзаце сказано: ‘…’. Значит, …"
    },
    "group:q31": {
      "sha": "8c0d11ab3f2a9c17",
      "ru": "<p>И <strong>B</strong>, и <strong>E</strong> названы в конце.</p>"
    }
  }
}
```

- **The key** is the question's id. A key starting `group:` is a note shown
  once under a whole group of questions rather than under one of them, and
  is keyed by that group's first question. A key starting `u` (`u0-q3`)
  belongs to a lesson-page exercise set: unit 0, question 3.
- **`sha`** is the identity of the English note you translated. `template`
  prints it. Never invent one and never re-stamp one without re-reading the
  English: the whole point is that it stops matching when somebody edits the
  English later, which is how a translation gets found and fixed.
- **`ru`** is the note. It is plain text, except for a `group:` entry, which
  is HTML and has to keep the same tags in the same order.
- **A partial file is fine.** Leave out what you have not done. A question
  with no entry simply reads in English, which is where the whole site was
  before this existed. Never write `"ru": ""`.
- Delete the helper fields `template` prints (everything starting with an
  underscore) before you save. They are there to translate from. The site
  publishes only the Russian either way.

### How it reaches the student

`src/pages/data/test-explanations/[locale]/[id].json.ts` publishes your file
as a static file, stripped down to key and Russian.
`src/lib/i18n/test-explanations.ts` fetches it once, only for a Russian
student, and only once they reach a review screen. A missing file, a failed
request or a missing key falls back to English in silence. A **stale** entry
is still shown: a slightly out of date Russian note beats a perfectly current
English one for a student who cannot read the English, and the red `check` is
what gets it fixed.

---

## 7. The commands

No flags, no setup. Run them from the repository root.

```
node tools/explanations-ru.mjs status
```

What is translated, partial, stale or not started, with character counts.

```
node tools/explanations-ru.mjs template reading-full-002 > src/data/tests/ru/reading-full-002.json
```

The skeleton for one test, with everything you need in it: the question as it
is printed, the correct answer, the evidence line, the English note and its
`sha`. You never have to open the 60 KB test file.

```
node tools/explanations-ru.mjs check reading-full-002   # one file
node tools/explanations-ru.mjs check --all              # everything translated
npm test                                                # the same rules, in CI
```

`check` exits 1 if anything is wrong, and every message names the key and the
fix.

### What `check` enforces

1. valid JSON, UTF-8 with no byte-order mark, the right `id` and `locale`;
2. every key is a real question of that test (a mistyped id is silent at
   runtime, which is why it is loud here);
3. every `sha` matches the English as it stands today;
4. there is Cyrillic in every note (nobody pasted the English back);
5. no em dash, en dash, figure dash or horizontal bar, anywhere, in either
   language. House rule. Use a comma, a full stop, a colon or brackets, or
   rewrite the sentence. A hyphen inside a compound word is fine; a hyphen
   standing in for a dash, with spaces around it, is not;
6. every phrase the English note quotes is still there, quoted; TRUE, FALSE,
   NOT GIVEN, YES and NO survive; and the answer survives when the English
   note named it;
7. a `group:` note keeps the same tags in the same order.

### What `check` cannot see

Whether the Russian is any good. That is yours: whether the sentence reads
like a teacher, whether the trap is still explained, whether a student who
knows no English learns something from it.

---

## 8. The batches

The two pilots, `reading-full-001` and `listening-full-001`, are done. They
are the worked examples above; read one before starting.

The remaining 68 tests are 469,592 characters, split into 12 batches balanced
by character count. Reading and listening never share a batch: the two banks
quote differently (curly single quotes against straight doubles) and a
listening note is built around a timestamp, so a translator stays in one
idiom for a whole batch.

| Batch | Tests | Count | Characters |
|---|---|---|---|
| R1 | `reading-full-002` to `reading-full-009` | 8 | 42,863 |
| R2 | `reading-full-010` to `reading-full-018` | 9 | 44,247 |
| R3 | `reading-full-019` to `reading-full-024` | 6 | 44,657 |
| R4 | `reading-full-025` to `reading-full-028` | 4 | 36,784 |
| R5 | `reading-full-029` to `reading-full-032` | 4 | 39,365 |
| R6 | `reading-full-033` to `reading-full-036` | 4 | 37,870 |
| R7 | `reading-full-037` to `reading-full-040` | 4 | 41,297 |
| L1 | `listening-full-002` to `listening-full-011` | 10 | 37,828 |
| L2 | `listening-full-012` to `listening-full-020` | 9 | 40,272 |
| L3 | `listening-full-021` to `listening-full-023` | 3 | 31,906 |
| L4 | `listening-full-024` to `listening-full-027` | 4 | 40,904 |
| L5 | `listening-full-028` to `listening-full-030` | 3 | 31,599 |

Reading: 39 tests, 287,083 characters, batches R1 to R7.
Listening: 29 tests, 182,509 characters, batches L1 to L5.

The character counts are of the English notes only, and come from
`node tools/explanations-ru.mjs status`, which is the number to trust if the
test bank changes.

### The lesson-page exercises, afterwards

The exercises under each question-type lesson (`PracticeQuiz`) carry another
269 notes, 29,268 characters, in 22 small sets. They use the same file
format, the same folder and the same commands, and their ids are
`practice-reading-<slug>` and `practice-listening-<slug>`. One of them,
`practice-listening-map-labelling`, is already done as a sample of the
shape; the other 21 are open:

```
node tools/explanations-ru.mjs template practice-reading-tfng > src/data/tests/ru/practice-reading-tfng.json
```

Two differences worth knowing. Their notes are copied from the test bank by
`tools/build_reading_practice.py`, so many of them are word for word a note
you may already have translated in a test: `status` will not tell you that,
but a familiar sentence is not a coincidence. And a practice question has no
id, so its key is its position (`u0-q3`). If somebody regenerates a set and
the questions move, every moved note's `sha` stops matching and `check` turns
red, which is exactly the signal to re-read before trusting the Russian.

They are small enough to take as one thirteenth batch, or to add to the end
of whichever batch finishes first.
