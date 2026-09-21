/* Extra dictionary parts: the big guidance texts, kept out of the main chunk.

   The main Russian dictionary is about 1,250 short interface phrases and
   every Russian page pays for it once. The coaching material is a different
   animal: the band guides alone are 72 KB of English, and only the two or
   three screens that show them need a word of it. Putting that in the main
   chunk would make a student who never opens the band ladder download it
   anyway.

   So a "part" is a named extra dictionary, loaded by the screens that need
   it and merged into the same lookup. `t()` does not change at all: it still
   reads one dictionary object, which simply grows when a part arrives. Until
   it arrives the English shows, exactly as it does for the first tick of the
   main dictionary, and a part that fails to load leaves English in place
   rather than a blank.

   Adding a part is four things:
     1. a name here, in DICTIONARY_PARTS;
     2. the source files it covers, in PART_SOURCES;
     3. a file `dict/<locale>/parts/<name>.ts` exporting `strings` and
        `plurals`, and a line in PART_LOADERS in dict/index.ts;
     4. nothing in the test, which reads PART_SOURCES to decide where each
        extracted English string has to be translated.

   The point of PART_SOURCES living here rather than in the test is that the
   registry cannot drift: the test asserts that every file named here exists,
   that every part named here has a loader and a dictionary file, and that a
   string extracted from one of these files is translated in that part and
   not somewhere else. */

/** Every extra dictionary part, by name. */
export const DICTIONARY_PARTS = ['strategies', 'structures', 'band-guides'] as const;

export type DictionaryPart = (typeof DICTIONARY_PARTS)[number];

/** Which source files' translatable English lives in which part. Paths are
    relative to `src/`, exactly as the coverage test spells them. A file that
    is not listed here belongs to the main dictionary, which is the normal
    case: a part is only worth it for a big block of text with a small
    audience. */
export const PART_SOURCES: Record<DictionaryPart, readonly string[]> = {
  strategies: ['data/reading-strategies.ts', 'data/listening-strategies.ts'],
  structures: ['data/writing-structures.ts', 'data/speaking-structure-guides.ts'],
  'band-guides': ['data/band-guides.ts'],
};

export function isDictionaryPart(value: unknown): value is DictionaryPart {
  return typeof value === 'string' && (DICTIONARY_PARTS as readonly string[]).includes(value);
}

/** The part a source file's strings belong to, or null for the main
    dictionary. `rel` is a path relative to `src/`, with forward slashes. */
export function partForSourceFile(rel: string): DictionaryPart | null {
  for (const part of DICTIONARY_PARTS) {
    if (PART_SOURCES[part].includes(rel)) return part;
  }
  return null;
}
