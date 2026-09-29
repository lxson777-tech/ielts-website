/* The rules behind the vocabulary lesson's search box
   (src/components/LessonVocabularySearch.astro), kept free of the DOM so
   tests/vocab-search.test.ts can pin them. Audit 2026-09-29, F11: the
   overview showed "Find a word in this lesson" over topic cards it could not
   search, and "No matches" before the student had typed anything. */

export type VocabSearchMode = 'words' | 'topics' | 'none';

/** A word table wins (a word lesson); topic cards alone make it a topic
 *  search (the overview); a page with neither gets no search at all. */
export function vocabSearchMode(wordRows: number, topicCards: number): VocabSearchMode {
  if (wordRows > 0) return 'words';
  if (topicCards > 0) return 'topics';
  return 'none';
}

/** Case-insensitive, whitespace-collapsed, and ё read as е, so a student who
 *  types "еда" finds "Еда" and one who types "ecology" finds "Ecology". */
export function normaliseForSearch(text: string): string {
  return text.toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

export function vocabSearchMatches(haystack: string, query: string): boolean {
  const q = normaliseForSearch(query);
  if (!q) return true;
  return normaliseForSearch(haystack).includes(q);
}

/** "No matches" only once the student has asked something and nothing
 *  answered: never on an empty box. */
export function showNoMatches(query: string, matches: number): boolean {
  return normaliseForSearch(query).length > 0 && matches === 0;
}
