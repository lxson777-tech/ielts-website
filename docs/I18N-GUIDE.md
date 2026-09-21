# Translating the interface

Written 2026-09-21 with the i18n foundation. Read this before wrapping a
single string. The plan behind it is `docs/RUSSIAN-TRANSLATION-PLAN.md`
(Option B: one set of URLs, a client-side language switch).

## The one idea

**The English text is the key.** You keep the English literal exactly where
it is and wrap it. For English the wrapper returns the literal untouched, so
today's students get byte-identical output. A key with no Russian yet falls
back to its own English text, so a missed string is readable, never blank and
never a raw key name.

```
t('Progress report')      ->  en: "Progress report"   ru: "Отчёт о прогрессе"
t('Nothing here yet')     ->  en: "Nothing here yet"  ru: "Nothing here yet"  (until translated)
```

The English stays the source of truth. If you change the English wording, you
have changed the key: add the new Russian entry and delete the old one.

## How to wrap a string

### In a React island (`.tsx`)

```tsx
import { useT } from '../lib/i18n/react';

export default function ScoreHistory() {
  const { t, tn } = useT();
  return (
    <section>
      <h2>{t('Your scores')}</h2>
      <p>{t('Best band so far: {band}', { band: best })}</p>
      <button aria-label={t('Close')}>{t('Close')}</button>
    </section>
  );
}
```

`useT()` re-renders the component when the language changes and again when the
Russian dictionary finishes loading. Never call `getLocale()` yourself inside
a component.

### In a plain `.ts` module

```ts
import { t, tn } from './i18n/translate';

export function nextStepLabel(count: number): string {
  return tn(count, { one: '{n} lesson left', other: '{n} lessons left' });
}
```

If the module can run somewhere with no browser (a Worker, a test), pass the
locale explicitly as the last argument: `t('Done', undefined, undefined, locale)`.

For English that lives in a **data registry** and is rendered somewhere else
(nav labels, lesson titles, unit names), wrap it in `nt()` instead. `nt()`
returns its argument unchanged, but the coverage test extracts it exactly like
`t()`, so the Russian entry is still required:

```ts
import { nt } from './i18n/translate';

export const WORKSPACE_TABS = [{ href: '/dashboard', label: nt('Today'), icon: 'today' }];
```

### In an `.astro` template

Astro renders at build time, so the English is baked into the HTML file. Mark
it and a small runtime swaps it in place:

```astro
<a class="ws-skip" href="#workspace-content" data-i18n>Skip to content</a>

<nav aria-label="Workspace" data-i18n-attr="aria-label">…</nav>

<input placeholder="Search lessons" aria-label="Search lessons"
       data-i18n-attr="placeholder,aria-label" />

<button data-i18n data-i18n-ctx="verb">Open</button>
```

Rules for `data-i18n`:

- Put it on the **innermost element that holds only text**. An element with
  `data-i18n` that contains child elements is skipped (and warned about in
  dev), because replacing its text would delete those children. Wrap the text
  in its own `<span data-i18n>` instead.
- The element may hold an expression (`{tab.label}`) rather than a literal.
  That works at runtime, but the coverage test cannot read it, so the English
  literal must be wrapped with `nt()` wherever it is actually written.
- The English original is remembered on the element, so switching back to
  English restores it exactly, and re-running is harmless.

## Counted phrases

English has two forms, Russian has four. The call site gives the two English
ones; the dictionary supplies the rest.

```tsx
tn(lessons, { one: '{n} lesson', other: '{n} lessons' })
```

```ts
// in your batch file
export const plurals = {
  '{n} lessons': { one: '{n} урок', few: '{n} урока', many: '{n} уроков', other: '{n} урока' },
};
```

The plural dictionary is keyed by the **English `other` form**, exactly as
written at the call site. `{n}` is always available as a placeholder. The form
is chosen with `Intl.PluralRules`, so 1, 21 and 101 take `one`; 2 and 22 take
`few`; 5, 11 and 111 take `many`.

Never hand-roll `count === 1 ? 'lesson' : 'lessons'` in a string you are
translating. Never build a counted phrase by concatenation.

## When to use `ctx`

Only when the same English text needs two different Russian words. The
classic case is one English word doing two jobs: "Open" the verb on a button
versus "Open" the adjective in a status line.

```tsx
t('Open', undefined, 'verb')       // Открыть
t('Open', undefined, 'adjective')  // Открытый
```

The coverage test fails if two batch files give the same key two different
Russian values. **The fix for a genuine conflict is a `ctx`**, not renaming
the English.

## Placeholders

`{name}` holes are filled **after** lookup, so Russian may reorder them
freely:

```
'Ready in {days} days'  ->  'Через {days} дня будет готово'
'{done} of {total} done' -> 'Готово: {done} из {total}'
```

Every placeholder in the English key must appear in the Russian value; the
coverage test checks this. An unknown placeholder is left visible rather than
blanked, so a typo shows up as `{nmae}` instead of vanishing.

## What must never be translated

- **Exam material**: reading passages, listening transcripts, questions and
  answer options, essay prompts, cue cards, model answers, vocabulary items.
- **The four paper names**, in English even inside a Russian sentence:
  Reading, Listening, Writing, Speaking.
- **IELTS** itself, and the product wordmark **IELTS is EZ**.
- **Official question type names**: True / False / Not Given, Yes / No / Not
  Given, Matching Headings, Matching Features, Matching Information, Sentence
  Completion, Summary Completion, Note Completion, Table Completion, Form
  Completion, Short Answer, Multiple Choice, Diagram Labelling, Map Labelling.

The reason for the last two is the same: the student has to recognise those
exact words on the real exam paper. A Russian sentence containing an English
term is correct here, for example "Сегодня тренируем Matching Headings в
Reading".

Also off limits to every batch: `src/data/tests/`, `src/content/`,
`workers/`, `supabase/`, and any grading code.

## Russian style

- Natural, warm, concise Russian, the way a good Russian learning app writes.
- Address the student as **вы**, lowercase. Neutral imperative and impersonal
  forms where they read naturally ("Начните", "Можно продолжить").
- **Short.** Russian runs 15 to 30 percent longer than English, and the
  capsule tabs and phone dock are tight. Cut words before you cut clarity.
- **No em dashes (—) and no en dashes (–), anywhere.** The coverage test fails
  on them. Rephrase, or use a comma, a colon or parentheses. A plain hyphen in
  a compound word is fine.
- Keep the calm, unhurried tone of the English. No exclamation marks unless
  the English has one.
- Do not translate a metaphor literally if Russian has a plainer way to say
  the same thing.

### Starter glossary

| English | Russian |
|---|---|
| lesson | урок |
| course | курс |
| unit | раздел |
| practice | практика |
| drill | тренировка |
| practice test | пробный тест |
| mock exam | пробный экзамен |
| band | балл |
| target band | целевой балл |
| estimated band | примерный балл |
| streak | серия |
| study plan | учебный план |
| progress report | отчёт о прогрессе |
| essay | эссе |
| feedback | разбор |
| sign in | войти |
| sign out | выйти |
| account | аккаунт |

Paper names, IELTS and question type names stay in English (see above).

## Which file do I write to?

Each batch owns one file under `src/lib/i18n/dict/ru/`, so parallel agents
never edit the same file. Add your entries to yours and nothing else.

| Area | File |
|---|---|
| Workspace shell: tabs, avatar menu, app footer, skip link (done) | `shell.ts` |
| Dashboard, study plan, weekly review, report | `dashboard-plan.ts` |
| Course, units, lessons library, lesson chrome | `course-lessons.ts` |
| Tests hub, test player, analytics, debrief, mock exam | `tests-player.ts` |
| Writing and speaking trainers, band report, live examiner | `trainers-writing-speaking.ts` |
| Account, sign-in, password reset, vocabulary and word of the day | `account-auth-vocab.ts` |
| Mr EZ's interface and his deterministic sentences | `tutor.ts` |
| Page-level copy in `src/pages`, marketing nav and footer | `pages.ts` |

Every batch file exports two objects, both required even if one stays empty:

```ts
export const strings: Record<string, string> = {};
export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
```

`dict/ru/index.ts` merges them. A new batch file needs one import there and
one line in `BATCH_FILES` in `tests/i18n.test.ts`.

## Running the coverage test on its own

```
node --import ./tests/ts-extension-loader.mjs --test tests/i18n.test.ts
```

The whole suite is `npm test`.

The coverage test scans every `.ts`, `.tsx` and `.astro` file under `src`
(skipping `src/lib/i18n`, `src/data/tests` and `src/content`) and asserts:

1. every extracted English key has a non-empty Russian value;
2. every `{placeholder}` in an English key appears in its Russian value;
3. no Russian value contains an em dash or en dash;
4. no key has two different Russian values across batch files;
5. every batch file exports both `strings` and `plurals`, and the merged
   index contains everything.

Failure messages name the file and the key, so a red test tells you exactly
what you missed. Anything dynamic is skipped rather than guessed at (a
template literal, a variable, an Astro expression inside `data-i18n`), which
is why data registries need `nt()`.

## Adding a third language later

Kazakh is: a new `dict/kk/` folder with the same batch files, one entry in
`LOADERS` in `src/lib/i18n/dict/index.ts`, and `'kk'` added to
`SUPPORTED_LOCALES` and `LOCALE_LABEL` in `src/lib/i18n/locale.ts`. No
component changes, no new routes. `Intl.PluralRules` handles its plural forms
for free.

## Pitfalls found while building this

- **Hydration.** React islands render English for their hydration pass on
  purpose (`useSyncExternalStore` with a server snapshot of `en`), then
  re-render in Russian a tick later. Do not try to read the locale during
  render in some other way to "fix" the flicker: you will reintroduce a
  hydration mismatch, which is a far worse bug. The layout keeps the page
  hidden until the Astro-rendered text is translated, so the only thing that
  can flicker is an island's own content.
- **Persisted islands.** The header, the phone tab bar and the Mr EZ panel use
  `transition:persist`. Their DOM survives a client-side navigation, so
  nothing re-renders them on its own. The layout re-runs `applyTranslations()`
  on `astro:after-swap`, `astro:page-load` and every locale change, and the
  runtime is idempotent, which is what keeps them correct.
- **Strings built by concatenation.** `'You have ' + n + ' lessons left'`
  cannot be translated: Russian will not put those pieces in that order.
  Rewrite it as one string with a placeholder, or as a `tn()` call, before
  you translate it.
- **Text split across JSX children.** `<p>Finish <b>{name}</b> to continue</p>`
  is three fragments, none of which is a sentence. Either move the whole
  sentence into one `t()` call with a placeholder and drop the inline markup,
  or give the sentence its own wrapper and keep the bold part as a separate
  labelled value. Never translate "Finish " and " to continue" separately.
- **`data-i18n` on a wrapper.** If an element has child elements, the runtime
  leaves it alone. Move the attribute inward.
- **Changing English wording is a key change.** Old Russian entries become
  dead weight and the new English falls back to English. Search the dictionary
  for the old text when you edit a label.
- **`define:vars` on an Astro script.** Do not add `is:inline` alongside it.
  `define:vars` already makes the script inline, and the explicit directive
  makes the type-checker try to resolve the injected names and report them as
  undefined.
