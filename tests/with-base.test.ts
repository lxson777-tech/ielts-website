/* withBase: internal paths get the site's prefix, complete addresses never do
   (2 October 2026: a signed recording link became /ielts-website/http://... on
   every focused Listening exercise). Under plain Node there is no base, so the
   prefix is empty here; what this pins is that a complete address passes
   through untouched and a path keeps its leading slash. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { withBase } from '../src/lib/url.ts';

test('a complete address is returned unchanged', () => {
  for (const url of [
    'http://127.0.0.1:8841/content/audio/test-008.mp3?exp=1&sig=x',
    'https://content.example.com/audio/test-001.mp3',
    '//cdn.example.com/a.png',
    'data:image/png;base64,AAAA',
    'blob:http://localhost/123',
    'mailto:help@example.com',
  ]) {
    assert.equal(withBase(url), url);
  }
});

test('an internal path stays a root-relative path', () => {
  assert.equal(withBase('/lessons/reading-task1'), '/lessons/reading-task1');
  assert.equal(withBase('pics/hero.png'), '/pics/hero.png');
  assert.equal(withBase('/'), '/');
});

test('the Writing lessons that publish a worked example are exactly the ones that have one', async () => {
  const { hasLessonExample, lessonExample } = await import('../src/lib/access/lesson-examples.server.ts');
  for (const lesson of ['method', 'charts', 'process', 'maps', 'task2-method', 'opinion', 'discussion', 'advantages', 'problem', 'twopart']) {
    assert.equal(hasLessonExample(lesson), lessonExample(lesson) !== null, lesson);
  }
  // The question bank has no problem-solution task yet, so that lesson has no example and asks for none.
  assert.equal(hasLessonExample('problem'), false);
});
