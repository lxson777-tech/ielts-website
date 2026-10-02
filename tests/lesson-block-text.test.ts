/* The text the lesson help falls back on is the lesson's, never the help
 * control's own buttons. On 3 October 2026 a student whose daily questions had
 * run out was quoted "Asking Mr EZ...Show me an example" as "the sentence that
 * decides this one", because the control sits inside the block it serves.
 *
 *   node --import ./tests/ts-extension-loader.mjs --test tests/lesson-block-text.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const { blockTextOf } = await import('../src/components/learning/lesson-block-help.ts');

interface FakeNode {
  tagName: string;
  textContent: string;
  nextElementSibling: FakeNode | null;
  classList: { contains(name: string): boolean };
}

function chain(...items: Array<[string, string, string?]>): FakeNode {
  let next: FakeNode | null = null;
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const [tagName, textContent, cls] = items[i]!;
    next = { tagName, textContent, nextElementSibling: next, classList: { contains: (name) => name === cls } };
  }
  return next!;
}

test('the help control at the end of a block is not read as lesson text', () => {
  const heading = chain(
    ['H3', 'Everyday Conversation'],
    ['P', 'Part 1 is a conversation between two speakers.'],
    ['DIV', 'Asking Mr EZ...Show me an example', 'lesson-block-help'],
    ['H3', 'Next block'],
  );
  const text = blockTextOf(heading as unknown as HTMLElement);
  assert.equal(text, 'Everyday Conversation\nPart 1 is a conversation between two speakers.');
  assert.doesNotMatch(text, /Asking Mr EZ|Show me an example/);
});

test('a block stops at the next heading', () => {
  const heading = chain(['H2', 'One'], ['P', 'First.'], ['H2', 'Two'], ['P', 'Second.']);
  assert.equal(blockTextOf(heading as unknown as HTMLElement), 'One\nFirst.');
});
