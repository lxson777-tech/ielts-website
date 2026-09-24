import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_TESTS } from '../src/data/tests/index.ts';
import { ALL_FOCUSED_EXERCISES } from '../src/data/focused-exercises.ts';
import { focusedSourceSupport } from '../src/lib/tests/focused-source-support.ts';

test('imported focused Listening menus and diagrams are usable from the original question sheets', () => {
  let checked = 0;
  for (const exercise of ALL_FOCUSED_EXERCISES) {
    if (!('source' in exercise) || !('testId' in exercise.source)) continue;
    const source = exercise.source;
    const paper = ALL_TESTS.find(p => p.id === source.testId);
    if (!paper || paper.skill !== 'listening') continue;
    const part = paper.parts[source.partIndex]!;
    const group = part.groups[source.groupIndex]!;
    if (!['categorisation', 'diagram-labelling'].includes(group.type)) continue;
    if (part.stimulus.kind !== 'audio') continue;
    let number = 1;
    for (const p of paper.parts) {
      for (const g of p.groups) {
        if (g === group) break;
        number += g.questions.length;
      }
      if (p === part) break;
    }
    const support = focusedSourceSupport(part.stimulus.questionHtml ?? '', number, group);
    if (group.type === 'categorisation') {
      assert.ok(support.options.length > 1, exercise.id);
      assert.ok(support.legendHtml?.includes('<dl'), exercise.id);
    } else {
      assert.equal(support.freeText, true, exercise.id);
      assert.ok(support.legendHtml?.includes('<img'), exercise.id);
      assert.ok(support.legendHtml?.includes('/pics/'), exercise.id);
    }
    checked++;
  }
  assert.ok(checked >= 7);
});
