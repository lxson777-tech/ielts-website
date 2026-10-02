import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { publicLessonHtml } from '../src/lib/access/public-lessons.ts';
import { lessonExample, LESSON_EXAMPLE_VARIANTS } from '../src/lib/access/lesson-examples.server.ts';
import { TRIAL_WRITING } from '../src/lib/trial/offer.ts';

test('every public English and Russian lesson is teaching prose without interactive exercises', () => {
  let count = 0;
  for (const folder of ['src/content/lesson-bodies', 'src/content/lesson-bodies/ru']) {
    for (const name of readdirSync(folder).filter(n => n.endsWith('.html'))) {
      const body = readFileSync(`${folder}/${name}`, 'utf8');
      assert.equal(publicLessonHtml(body), body, name);
      count++;
    }
  }
  assert.ok(count > 100);
  for (const unsafe of ['<input data-answer="secret">', '<SELECT>', '<audio src="private.mp3">', '<div data-quiz="reading">', '<script>answers=[]</script>']) {
    assert.throws(() => publicLessonHtml(unsafe));
  }
});

test('public worked examples match their task and never reveal the trial essay answer', () => {
  for (const lesson of Object.keys(LESSON_EXAMPLE_VARIANTS)) {
    const example = lessonExample(lesson);
    assert.ok(example, lesson);
    assert.equal(example.model.promptId, example.prompt.id);
    assert.notEqual(example.prompt.id, TRIAL_WRITING.essayPromptId);
    assert.ok(example.model.text.length > 0);
    if (example.prompt.task === 'task1') assert.match(example.prompt.imageUrl ?? example.prompt.promptHtml, /data:image\//);
  }
  // Since 2 October 2026 the Problem / Solution lesson has one too (test 87, causes + solutions).
  assert.equal(lessonExample('problem')?.prompt.id, 'pte-wt-87-task2');
  assert.equal(lessonExample('unknown'), null);
});
