/* Layer 1 of the hybrid grader: fast, deterministic checks that run entirely
   in the browser — no API, no key, no cost. Produces a MechanicsReport that
   is both shown to the student directly and fed to the model as signals.
   All functions are pure so they can be unit-tested in isolation. */

import type { EssayInput, MechanicsReport } from './schema';

/* Small, high-frequency function words. Excluded from content-word stats
   (overuse, topic overlap) so the signal reflects meaning, not grammar. */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'of', 'to', 'in', 'on', 'at', 'by',
  'for', 'with', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we',
  'they', 'them', 'his', 'her', 'their', 'our', 'my', 'me', 'us', 'him',
  'do', 'does', 'did', 'have', 'has', 'had', 'will', 'would', 'can', 'could',
  'should', 'may', 'might', 'must', 'not', 'no', 'so', 'than', 'then', 'there',
  'here', 'from', 'up', 'out', 'about', 'into', 'over', 'after', 'more', 'most',
  'some', 'any', 'all', 'such', 'own', 'other', 'which', 'who', 'whom', 'what',
  'when', 'where', 'why', 'how', 'because', 'while', 'also', 'both', 'each',
]);

/* Cohesive devices IELTS rewards — grouped so we can flag both absence and
   over-reliance on mechanical ones. Matched as whole phrases, case-insensitive. */
const LINKERS = [
  'however', 'moreover', 'furthermore', 'therefore', 'thus', 'consequently',
  'nevertheless', 'nonetheless', 'meanwhile', 'similarly', 'likewise',
  'in addition', 'for example', 'for instance', 'in contrast', 'on the other hand',
  'on the one hand', 'as a result', 'in conclusion', 'to conclude', 'to sum up',
  'in summary', 'firstly', 'secondly', 'thirdly', 'finally', 'in particular',
  'in fact', 'indeed', 'despite', 'although', 'whereas', 'in other words',
  'overall', 'by contrast', 'that is why', 'for this reason',
];

/* Common IELTS misspellings → correction. A deliberately small starter map:
   catches frequent slips offline with no dictionary payload. Extend freely. */
const MISSPELLINGS: Record<string, string> = {
  alot: 'a lot',
  recieve: 'receive',
  recieved: 'received',
  beacause: 'because',
  becuase: 'because',
  goverment: 'government',
  enviroment: 'environment',
  enviromental: 'environmental',
  wich: 'which',
  teh: 'the',
  thier: 'their',
  seperate: 'separate',
  definately: 'definitely',
  occured: 'occurred',
  untill: 'until',
  succesful: 'successful',
  succes: 'success',
  begining: 'beginning',
  beleive: 'believe',
  acheive: 'achieve',
  arguement: 'argument',
  developement: 'development',
  neccessary: 'necessary',
  oppinion: 'opinion',
  advantagous: 'advantageous',
  comunication: 'communication',
  responsability: 'responsibility',
  knowlege: 'knowledge',
  goernment: 'government',
  benefial: 'beneficial',
  everydays: 'every day',
  childrens: "children's / children",
};

const words = (text: string): string[] => text.toLowerCase().match(/[a-z']+/g) ?? [];

const sentences = (text: string): string[] =>
  text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

function stdev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
  return Math.sqrt(variance);
}

function countLinkers(lower: string): { word: string; count: number }[] {
  const found: { word: string; count: number }[] = [];
  for (const linker of LINKERS) {
    // whole-phrase, word-boundary match
    const re = new RegExp(`(^|[^a-z])${linker.replace(/ /g, '\\s+')}([^a-z]|$)`, 'g');
    const count = (lower.match(re) ?? []).length;
    if (count > 0) found.push({ word: linker, count });
  }
  return found.sort((a, b) => b.count - a.count);
}

function overused(contentWords: string[]): { word: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const w of contentWords) {
    if (w.length <= 3 || STOPWORDS.has(w)) continue;
    counts[w] = (counts[w] ?? 0) + 1;
  }
  return Object.entries(counts)
    .filter(([, c]) => c >= 4)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

function spellingFlags(essayWords: string[]): { word: string; suggestion?: string }[] {
  const seen = new Set<string>();
  const flags: { word: string; suggestion?: string }[] = [];
  for (const w of essayWords) {
    if (seen.has(w)) continue;
    if (MISSPELLINGS[w]) {
      seen.add(w);
      flags.push({ word: w, suggestion: MISSPELLINGS[w] });
    }
  }
  return flags;
}

/** Fraction of the prompt's distinct content words that appear in the essay. */
function topicOverlap(promptText: string, essayWords: string[]): number {
  const promptKeys = new Set(
    words(promptText).filter((w) => w.length > 3 && !STOPWORDS.has(w)),
  );
  if (promptKeys.size === 0) return 1;
  const essaySet = new Set(essayWords);
  let hit = 0;
  for (const k of promptKeys) if (essaySet.has(k)) hit += 1;
  return hit / promptKeys.size;
}

/** Strip HTML tags from the prompt so we compare against its words only. */
const stripHtml = (html: string): string => html.replace(/<[^>]+>/g, ' ');

export function analyzeEssay(input: EssayInput): MechanicsReport {
  const { essay, prompt } = input;
  const essayWords = words(essay);
  const sents = sentences(essay);
  const sentLengths = sents.map((s) => words(s).length);

  const wordCount = essayWords.length;
  const sentenceCount = sents.length;
  const avgSentenceLength = sentenceCount ? wordCount / sentenceCount : 0;
  const sentenceLengthSpread = stdev(sentLengths);

  const uniqueWords = new Set(essayWords).size;
  const lexicalDiversity = wordCount ? uniqueWords / wordCount : 0;

  const overusedWords = overused(essayWords);
  const linkingDevices = countLinkers(essay.toLowerCase());
  const linkerTotal = linkingDevices.reduce((a, l) => a + l.count, 0);
  const connectiveDensity = sentenceCount ? linkerTotal / sentenceCount : 0;

  const flags = spellingFlags(essayWords);
  const overlap = topicOverlap(stripHtml(prompt.promptHtml), essayWords);

  const underLength = wordCount < prompt.minWords;
  const offTopicRisk = wordCount > 40 && overlap < 0.25;

  const notes: string[] = [];
  if (underLength) {
    notes.push(
      `Under the ${prompt.minWords}-word minimum (${wordCount} words), which caps your Task Achievement band.`,
    );
  } else {
    notes.push(`${wordCount} words, comfortably over the ${prompt.minWords}-word minimum.`);
  }
  if (sentenceCount >= 3) {
    if (sentenceLengthSpread < 3) {
      notes.push('Sentence lengths are very uniform. Mix short and long sentences for rhythm.');
    } else if (avgSentenceLength > 30) {
      notes.push('Your sentences are long on average. Check for run-ons you could split.');
    } else {
      notes.push('Good variation in sentence length.');
    }
  }
  if (lexicalDiversity < 0.42) {
    notes.push('Vocabulary is quite repetitive. Vary word choice to lift Lexical Resource.');
  } else if (lexicalDiversity >= 0.55) {
    notes.push('Varied vocabulary: a strong Lexical Resource signal.');
  }
  if (overusedWords.length) {
    const top = overusedWords[0]!;
    notes.push(`You repeat "${top.word}" ${top.count} times. Try synonyms.`);
  }
  if (linkerTotal === 0 && sentenceCount > 3) {
    notes.push('No linking words detected. Add cohesive devices (However, Moreover, For example…).');
  } else if (connectiveDensity > 0.8) {
    notes.push('Heavy use of linking words: a few are being overused; let some ideas connect naturally.');
  }
  if (flags.length) {
    notes.push(`${flags.length} likely spelling slip${flags.length > 1 ? 's' : ''} detected.`);
  }
  if (offTopicRisk) {
    notes.push('Low overlap with the question wording. Make sure you are answering the prompt directly.');
  }

  return {
    wordCount,
    minWords: prompt.minWords,
    underLength,
    sentenceCount,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    sentenceLengthSpread: Math.round(sentenceLengthSpread * 10) / 10,
    lexicalDiversity: Math.round(lexicalDiversity * 100) / 100,
    overusedWords,
    linkingDevices,
    connectiveDensity: Math.round(connectiveDensity * 100) / 100,
    spellingFlags: flags,
    topicOverlap: Math.round(overlap * 100) / 100,
    offTopicRisk,
    notes,
  };
}

/** Live word count for the editor (no full analysis). */
export function countWords(text: string): number {
  return words(text).length;
}
