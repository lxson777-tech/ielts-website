/* Turns a full PracticeTest (passage text, transcripts, every distractor
   option) into the small, flat shape Mr EZ actually needs to explain a
   wrong answer: one question's prompt, key, explanation and evidence.

   Why this file exists at all: `src/data/tests` is 3.9 MB of reading
   passages and listening transcripts, and the tutor runs in a Cloudflare
   Worker with its own small bundle. The Worker cannot import that data
   directly, so the site publishes one compact JSON file per test at build
   time (see src/pages/data/tests/[id].json.ts) and the Worker fetches it by
   test id instead. Publishing the answers this way is not a new exposure:
   they already ship to every browser inside the test pages themselves.

   CRITICAL: this file is imported by the Worker build. It must never import
   `../../data/tests` (or anything that does) — only types from the test
   schema, plus the two small sibling modules below. */

import type { PracticeTest, Question, QuestionGroup } from '../tests/schema';
import { questionTypeLabel } from '../tests/question-types';
import { isRecord, sanitiseText } from './schema';

/** One question, flattened to what the tutor needs. Every string is plain
    text: HTML stripped, entities decoded, whitespace collapsed, length
    capped — never re-rendered as HTML by the model or the client. */
export interface SiteQuestion {
  id: string; // 'q1' .. 'q40', unique within the test
  part: number; // 1-based part / passage / section number
  type: string; // the QuestionType key, e.g. 'tfng'
  typeLabel: string; // questionTypeLabel(type)
  prompt: string; // what the student was asked, max 300 chars
  answer: string; // accepted answer(s); an array joined with ' / ', max 120 chars
  explanation: string; // Question.explanation, else the group's explanationHtml stripped, else ''; max 500 chars
  evidence: string; // Question.evidence or ''; max 300 chars
}

export interface SiteTest {
  id: string;
  skill: 'reading' | 'listening';
  title: string;
  questions: SiteQuestion[];
}

/** How many wrong-answer items a single "explain my results" turn will ever
    walk through. A full test is 40 questions; this is a generous ceiling
    against a malformed or replayed request, not a real limit students hit. */
export const MAX_REVIEW_ITEMS = 40;

/** Longest a student's own typed answer is kept, once sanitised. Long enough
    for a genuine free-text answer, short enough that a pasted essay can't be
    smuggled in through a "review" request. */
export const MAX_GIVEN_CHARS = 120;

const MAX_PROMPT_CHARS = 300;
const MAX_ANSWER_CHARS = 120;
const MAX_EXPLANATION_CHARS = 500;
const MAX_EVIDENCE_CHARS = 300;

/* Only the handful of named entities that show up in this content (curly
   quotes, dashes, the usual markup escapes) plus numeric references. Real
   attacker-controlled markup is never the input here — this runs over the
   site's own authored test content and the JSON built from it — but a
   Worker also re-validates anything it fetches with isSiteTest below, so a
   truncated or tampered file is rejected rather than trusted. */
/* ndash/mdash both decode to a plain hyphen, never a real en/em dash
   character: house style bans those in anything a student could see, and a
   dash inside a stripped passage quote is exactly that. */
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '-',
  mdash: '-',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, ref: string) => {
    if (ref[0] === '#') {
      const code = ref[1] === 'x' || ref[1] === 'X' ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[ref] ?? match;
  });
}

/** Strip tags, decode entities, collapse whitespace, trim, cap length. Used
    on every field that might carry the site's rich-text markup (question
    text, group titles used as a fallback) so nothing but plain prose ever
    reaches the model or a JSON response. */
export function plainText(html: string, maxChars: number): string {
  const noTags = html.replace(/<[^>]*>/g, ' ');
  const decoded = decodeEntities(noTags);
  // Source passages are scraped text and sometimes carry a literal en/em
  // dash character (not just the HTML entity form above). House style bans
  // both in anything a student could see, so every path is normalised here
  // to a plain hyphen, not only the entity-decoded one.
  const noDashes = decoded.replace(/[‒–—―−]/g, '-');
  const collapsed = noDashes.replace(/\s+/g, ' ').trim();
  return collapsed.slice(0, maxChars);
}

/** What the student was asked, before HTML stripping: textHtml when the
    question has its own body; for sentence-completion-style questions with
    before/after, the inline blank spelled out; otherwise the group's title,
    which is the closest thing to a prompt a bare numbered slot has. */
function rawPrompt(question: Question, group: QuestionGroup): string {
  if (question.textHtml && question.textHtml.trim() !== '') return question.textHtml;
  if (question.before !== undefined || question.after !== undefined) {
    return `${question.before ?? ''} ____ ${question.after ?? ''}`;
  }
  return group.title;
}

function rawAnswer(question: Question): string {
  if (question.multiSelect) return question.multiSelect.correctValues.join(' / ');
  return Array.isArray(question.answer) ? question.answer.join(' / ') : question.answer;
}

function rawExplanation(question: Question, group: QuestionGroup): string {
  if (question.explanation) return question.explanation;
  if (group.explanationHtml) return group.explanationHtml;
  return '';
}

export function toSiteTest(test: PracticeTest): SiteTest {
  const questions: SiteQuestion[] = [];
  test.parts.forEach((part, partIndex) => {
    for (const group of part.groups) {
      for (const question of group.questions) {
        questions.push({
          id: question.id,
          part: partIndex + 1,
          type: group.type,
          typeLabel: questionTypeLabel(group.type),
          prompt: plainText(rawPrompt(question, group), MAX_PROMPT_CHARS),
          answer: plainText(rawAnswer(question), MAX_ANSWER_CHARS),
          explanation: plainText(rawExplanation(question, group), MAX_EXPLANATION_CHARS),
          evidence: plainText(question.evidence ?? '', MAX_EVIDENCE_CHARS),
        });
      }
    }
  });
  return { id: test.id, skill: test.skill, title: test.title, questions };
}

/* A drill id borrows its source test's question ids wholesale (see
   drills.ts: `${sourceTestId}-drill-p${partIndex + 1}`), so a review of a
   drill attempt is answered from the one published file for the full test
   it was lifted from — there is no separate published JSON per drill. */
const DRILL_SUFFIX_RE = /-drill-p\d+$/;

/** 'reading-full-003-drill-p2' -> 'reading-full-003'; any other id unchanged. */
export function sourceTestId(id: string): string {
  return id.replace(DRILL_SUFFIX_RE, '');
}

/* Matches exactly the ids this build ever publishes a JSON file for (see
   ALL_TESTS: '<skill>-full-<nnn>', a zero-padded three-digit number).
   Deliberately strict rather than merely "safe": this id is about to become
   part of a URL path, and anything looser (variable digit counts, other
   skills) would accept ids we never actually publish, turning a 404 into a
   confusing failure further down the line. */
const PUBLISHED_TEST_ID_RE = /^(?:reading|listening)-full-\d{3}$/;

/** True only for ids shaped like 'reading-full-001' or 'listening-full-012'
    (after sourceTestId). Used before the id is ever put into a URL. */
export function isPublishedTestId(id: string): boolean {
  return typeof id === 'string' && PUBLISHED_TEST_ID_RE.test(id);
}

function isSiteQuestion(value: unknown): value is SiteQuestion {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.part === 'number' &&
    typeof value.type === 'string' &&
    typeof value.typeLabel === 'string' &&
    typeof value.prompt === 'string' &&
    typeof value.answer === 'string' &&
    typeof value.explanation === 'string' &&
    typeof value.evidence === 'string'
  );
}

/** Runtime validation of JSON fetched over the network. Reject anything
    malformed rather than trusting it: the Worker fetches this from the
    site's own static build, but "fetched over HTTP" is never trusted just
    because we expect it to be ours. */
export function isSiteTest(value: unknown): value is SiteTest {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string') return false;
  if (value.skill !== 'reading' && value.skill !== 'listening') return false;
  if (typeof value.title !== 'string') return false;
  if (!Array.isArray(value.questions)) return false;
  return value.questions.every(isSiteQuestion);
}

export interface GivenItem {
  questionId: string;
  given: string;
}

export interface ResolvedItem {
  question: SiteQuestion;
  given: string;
}

/** Match the student's items to real questions. Unknown question ids are
    dropped, duplicates keep the first, `given` is sanitised and capped at
    MAX_GIVEN_CHARS (an empty string means the student left it blank), and at
    most MAX_REVIEW_ITEMS are returned, in test order. */
export function resolveItems(test: SiteTest, items: GivenItem[]): ResolvedItem[] {
  const givenByQuestionId = new Map<string, string>();
  for (const item of items) {
    if (!isRecord(item) || typeof item.questionId !== 'string' || typeof item.given !== 'string') continue;
    if (givenByQuestionId.has(item.questionId)) continue; // duplicates keep the first
    givenByQuestionId.set(item.questionId, sanitiseText(item.given, MAX_GIVEN_CHARS));
  }

  const resolved: ResolvedItem[] = [];
  for (const question of test.questions) {
    const given = givenByQuestionId.get(question.id);
    if (given === undefined) continue;
    resolved.push({ question, given });
    if (resolved.length >= MAX_REVIEW_ITEMS) break;
  }
  return resolved;
}

/** Wrong-answer counts per question type, most wrong first, for the
    prompt's summary line. */
export function summariseByType(items: ResolvedItem[]): { type: string; typeLabel: string; wrong: number }[] {
  const counts = new Map<string, { typeLabel: string; wrong: number }>();
  for (const item of items) {
    const existing = counts.get(item.question.type);
    if (existing) {
      existing.wrong += 1;
    } else {
      counts.set(item.question.type, { typeLabel: item.question.typeLabel, wrong: 1 });
    }
  }
  return [...counts.entries()]
    .map(([type, { typeLabel, wrong }]) => ({ type, typeLabel, wrong }))
    .sort((a, b) => b.wrong - a.wrong);
}
