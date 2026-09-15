import test from 'node:test';
import assert from 'node:assert/strict';
import { toRoute, isAppRoute } from '../src/lib/platform-nav.ts';

test('toRoute strips the base path, a build-time .html suffix and index', () => {
  assert.equal(toRoute('/ielts-website/dashboard.html', '/ielts-website'), '/dashboard');
  assert.equal(toRoute('/ielts-website/dashboard', '/ielts-website/'), '/dashboard');
  assert.equal(toRoute('/ielts-website/trainers/writing.html', '/ielts-website'), '/trainers/writing');
  assert.equal(toRoute('/ielts-website/index.html', '/ielts-website'), '/');
  assert.equal(toRoute('/ielts-website', '/ielts-website'), '/');
});

test('every top-level workspace page counts as an app route when built as a file', () => {
  for (const page of ['dashboard', 'start', 'trainers', 'tests', 'review', 'report', 'account', 'learn']) {
    assert.ok(isAppRoute(toRoute(`/ielts-website/${page}.html`, '/ielts-website')), page);
  }
});
