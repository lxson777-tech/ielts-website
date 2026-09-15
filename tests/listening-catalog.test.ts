import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ALL_TESTS } from '../src/data/tests/index.ts';
import { questionCount, type PracticeTest } from '../src/lib/tests/schema.ts';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function allQuestions(testRecord: PracticeTest) {
  return testRecord.parts.flatMap((part) => part.groups.flatMap((group) => group.questions));
}

function localAssetPath(publicPath: string): string {
  assert.match(publicPath, /^\//, `asset path must be local: ${publicPath}`);
  assert.doesNotMatch(publicPath, /^\/\//, `asset path must not be protocol-relative: ${publicPath}`);
  return join(projectRoot, 'public', publicPath.slice(1));
}

function assertLocalAsset(publicPath: string, minimumBytes = 1) {
  const diskPath = localAssetPath(publicPath);
  assert.equal(existsSync(diskPath), true, `missing local asset: ${publicPath}`);
  assert.ok(statSync(diskPath).size >= minimumBytes, `empty or incomplete local asset: ${publicPath}`);
}

function htmlImageSources(html: string): string[] {
  return [...html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)].map((match) => match[1]!);
}

const importedListeningAnswerHashes = [
  'aea3178c89ec70541617ae872308f757ced63e0191491f3bd907dad17d6cf86f',
  '7340117d6f6a403b7081660021a3c4bbf7227fce4103ea570061c3a9f2912d54',
  '4b6e196cf04ea2dae9cdd836cd36c4b307ba4a2c6921305b4e0ecda5f12e545b',
  'f53d7db088f307574e283aa1d357b98d4e6339653dd8958300f08d35bdfdfd65',
  '3992c4ec296a2e579fea6007ee9c2623d78ecb4cbf8f2d9d6bdb2fadd0382cfd',
  '36c45f2696dfca000ad7720548a3d13d9e52e3bf498f4ad433a7bba239a3e8b6',
  '0fd58f67b51727a5cafec564ca88ba61d35a167238001056f9872e1c8e3b7891',
  '63f3e27048a98c91d59ebfdc95b524ae76d884da9c9cf1315909d86346897619',
  '54538f8233a5e56bee09429a8a4134fccd2b325ccac4b3c15729063b64305906',
  '9316a528e71ceb388a34478b73ae0b2c88d49b1c1a6535ee0e430443ce5bbe8f',
  '7babfba4c9c1f6d1308ee4ca8193cdd726bf9c9982672056619d89a6cd3dfde4',
  '70bfdccbec4911dbd6d615b263a5b7cede5ac750ba62a1254f3fe201b197195c',
  '4a0c21f1fe7379606a0950e0622c8274b7bcc5870bfccc9c94b042d9e39e1f80',
  'af5048cd1c8b56931a2af4c5f13f8a244952cd95f26edf01ed9db22b61968b0a',
  '6c5105ae8b72bd25ae9443b314a4d4e03661a53e335437445f9dae9a26612c8c',
  'afcbf244fdbc956ef8d482f4c4551fec20e0df563f225b532f0ff3f156178af3',
  '6e9a5d24ce6984c07c8dc7ff85de70361b2d33b6213f20946a2ab87f377283ce',
  '511c8af8e5ddefdd89b4b2139e42ace6b13ba79d313485843b30d5964fc160bd',
  'c987b1c2ae6927ac3993a09f2f67c1eca2a3cd5f94bac08111133785015a0c9a',
  '707edbe339e6523420f1ddd10adc4852c1247be18dddb032026f5df3ba85b0d6',
  // tests 21 to 30, imported 2026-09-14 and verified against the source answer keys by tools/validate_listening.py
  '6349eba5a92eb9eb8e70117296f9fac5a7a36a569daf0f9a5b9761e91e1f4e4c',
  '6056cc4306bf365180b17ae833b0d1f65524da9be5a441cfd9c1bdda609baf06',
  'dbab849866075a7738aae33cdc56afffb919db52ea769dda3c6c9b1466aebfd6',
  '9d1492e36806bdc4f7bde72d7e3e01a288a11418e41b3649381429a95a4360dc',
  'd277c23b992c47f3d276effad096cc2820f7b63f873b4d1581ffa6b62d2eb0ee',
  'f278d23e1bbbb4f3993ce9719e4f1c2efdd4a2a3d1e7f8e8c885c7b6e245953e',
  '9d940d132b007220072bbcfe10a9c32bfbac0a959042f378910ba9182de1e1c2',
  '868bf0e49779dd6d736f8a6e272771d446a1104d0c2b2a341564f8cceffc1c48',
  '1cc383644081385a58e593e782d85fb1aadda9d9fdf4425ec1aba13ca9a6e46e',
  '3046fc225db8982c007cfd1c0d97ace1c63ed13901ccbe4f16a1eca7f84d64ee',
];

test('catalog contains only authentic (sourced) reading tests and thirty distinct listening tests', () => {
  const ids = ALL_TESTS.map((testRecord) => testRecord.id);
  assert.equal(new Set(ids).size, ids.length, 'test ids must be unique');

  const reading = ALL_TESTS.filter((testRecord) => testRecord.skill === 'reading');
  const listening = ALL_TESTS.filter((testRecord) => testRecord.skill === 'listening');
  for (const testRecord of reading) {
    assert.ok(testRecord.source, `reading test ${testRecord.id} must carry a source (in-house tests are not allowed)`);
  }
  assert.equal(listening.length, 30);

  const readingFingerprints = reading.map((testRecord) => JSON.stringify(testRecord.parts));
  const listeningFingerprints = listening.map((testRecord) => JSON.stringify(testRecord.parts));
  assert.equal(new Set(readingFingerprints).size, reading.length, 'reading tests must remain distinct');
  assert.equal(new Set(listeningFingerprints).size, listening.length, 'listening tests must be distinct');
});

test('every listening test has four sections and exactly q1 through q40 once', () => {
  const listening = ALL_TESTS.filter((testRecord) => testRecord.skill === 'listening');
  const expectedIds = Array.from({ length: 40 }, (_, index) => `q${index + 1}`);

  for (const testRecord of listening) {
    assert.equal(testRecord.parts.length, 4, `${testRecord.id} must have four sections`);
    assert.deepEqual(
      testRecord.parts.map((part) => part.label),
      ['Section 1', 'Section 2', 'Section 3', 'Section 4'],
      `${testRecord.id} section labels`,
    );
    assert.equal(questionCount(testRecord), 40, `${testRecord.id} question count`);

    const questions = allQuestions(testRecord);
    const ids = questions.map((question) => question.id);
    assert.equal(new Set(ids).size, 40, `${testRecord.id} question ids must be unique`);
    assert.deepEqual(
      [...ids].sort((left, right) => Number(left.slice(1)) - Number(right.slice(1))),
      expectedIds,
      `${testRecord.id} must contain q1 through q40`,
    );

    for (const question of questions) {
      const accepted = Array.isArray(question.answer) ? question.answer : [question.answer];
      assert.ok(accepted.length > 0, `${testRecord.id} ${question.id} needs an answer`);
      assert.ok(
        accepted.every((answer) => answer.trim().length > 0),
        `${testRecord.id} ${question.id} has an empty accepted answer`,
      );
    }
  }
});

test('question paper reformatting does not change any listening answer key', () => {
  const listening = ALL_TESTS.filter((testRecord) => testRecord.skill === 'listening');

  const currentHashes = listening.map((testRecord) => {
    const answerContract = allQuestions(testRecord).map(
      ({ id, answer, answerPairId, multiSelect }) => ({ id, answer, answerPairId, multiSelect }),
    );
    return createHash('sha256').update(JSON.stringify(answerContract)).digest('hex');
  });

  assert.deepEqual(currentHashes, importedListeningAnswerHashes);
});

test('only the publisher-missing Test 11 question is excluded from scoring', () => {
  const listening = ALL_TESTS.filter((testRecord) => testRecord.skill === 'listening');

  for (const testRecord of listening) {
    const unscored = allQuestions(testRecord).filter((question) => question.scored === false);
    const expected = testRecord.id === 'listening-full-011' ? ['q14'] : [];
    assert.deepEqual(
      unscored.map((question) => question.id),
      expected,
      `${testRecord.id} unscored question contract`,
    );
    assert.equal(
      allQuestions(testRecord).filter((question) => question.scored !== false).length,
      testRecord.id === 'listening-full-011' ? 39 : 40,
      `${testRecord.id} scored total`,
    );
  }
});

test('per-question multi-select stays separate from shared unordered answer groups', () => {
  const test16 = ALL_TESTS.find((testRecord) => testRecord.id === 'listening-full-016');
  assert.ok(test16, 'listening test 16 must be registered');

  const multiSelectQuestions = test16.parts.flatMap((part) =>
    part.groups.flatMap((group) =>
      group.questions
        .filter((question) => question.multiSelect)
        .map((question) => ({ group, question })),
    ),
  );
  assert.deepEqual(
    multiSelectQuestions.map(({ question }) => question.id),
    ['q11', 'q12', 'q13', 'q14'],
  );

  for (const { group, question } of multiSelectQuestions) {
    assert.equal(question.answerPairId, undefined, `${question.id} must be worth one mark, not two shared marks`);
    assert.equal(question.multiSelect!.selectCount, 2, `${question.id} must require two selections`);
    assert.equal(new Set(question.multiSelect!.correctValues).size, 2, `${question.id} needs two distinct answers`);
    const choices = new Set(group.choices?.map((choice) => choice.value) ?? []);
    assert.ok(choices.size >= 2, `${question.id} needs its visible checkbox choices`);
    for (const answer of question.multiSelect!.correctValues) {
      assert.equal(choices.has(answer), true, `${question.id} answer ${answer} must exist in its visible choices`);
    }
  }
});

test('every listening recording and referenced image is a usable local asset', () => {
  const listening = ALL_TESTS.filter((testRecord) => testRecord.skill === 'listening');

  for (const testRecord of listening) {
    assert.ok(testRecord.audioSrc, `${testRecord.id} needs one persistent recording`);
    assertLocalAsset(testRecord.audioSrc, 100_000);

    const audioBytes = readFileSync(localAssetPath(testRecord.audioSrc), { encoding: null });
    const hasId3Header = audioBytes.subarray(0, 3).toString('ascii') === 'ID3';
    const hasMpegFrame = audioBytes[0] === 0xff && (audioBytes[1]! & 0xe0) === 0xe0;
    assert.ok(hasId3Header || hasMpegFrame, `${testRecord.audioSrc} does not look like an MP3`);

    for (const part of testRecord.parts) {
      assert.equal(part.stimulus.kind, 'audio', `${testRecord.id} contains a non-audio section`);
      if (part.stimulus.kind !== 'audio') continue;
      assert.equal(part.stimulus.src, testRecord.audioSrc, `${testRecord.id} must keep one recording across sections`);

      const htmlImages = htmlImageSources(part.stimulus.questionHtml ?? '');
      for (const image of htmlImages) assertLocalAsset(image);
      for (const group of part.groups) if (group.diagram) assertLocalAsset(group.diagram.image);

      const diagramGroups = part.groups.filter((group) => group.type === 'diagram-labelling').length;
      const visibleDiagrams = htmlImages.length + part.groups.filter((group) => group.diagram).length;
      assert.ok(
        visibleDiagrams >= diagramGroups,
        `${testRecord.id} ${part.label} has a diagram question without a visible local image`,
      );
    }
  }
});

test('imported listening tests retain permission attribution and source links', () => {
  const listening = ALL_TESTS.filter((testRecord) => testRecord.skill === 'listening');

  for (const testRecord of listening) {
    assert.equal(testRecord.source?.name, 'PracticePTEOnline', `${testRecord.id} source name`);
    assert.match(testRecord.source?.url ?? '', /^https:\/\/practicepteonline\.com\//, `${testRecord.id} source url`);
    assert.match(testRecord.source?.permission ?? '', /permission/i, `${testRecord.id} permission note`);
  }


  assert.equal(
    listening.find((testRecord) => testRecord.id === 'listening-full-006')?.source?.url,
    'https://practicepteonline.com/ielts-listening-6/',
  );
  assert.equal(
    listening.find((testRecord) => testRecord.id === 'listening-full-015')?.source?.url,
    'https://practicepteonline.com/listening-15/',
  );
});
