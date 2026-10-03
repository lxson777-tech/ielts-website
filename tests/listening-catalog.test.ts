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
  /* Fingerprints of every listening answer key, so a reformat of a question
     paper can never quietly change what scores.

     Refreshed 2026-09-16 for deliberate corrections on tests 21 to 30, made
     while writing their explained answer keys. Every one of them was a key
     that rejected what the recording actually says: a course length given as
     20 weeks but keyed as 5 months, "film studios" for "film studies",
     "written reviw", "airlines" for "airliners", the American "color" against
     a speaker saying "colour", "pin-pong tables", an en dash inside an opening
     time no student would type, and about twenty singular or digit forms where
     the speaker says a plural or a word.

     Refreshed again 2026-10-03 for the pre-publishing review
     (docs/audits/content-review-2026-10-03/listening-tests.md): keys that
     contradicted their own recording (Test 6 "Petterson" spelled with a
     double S, Test 18 Q22 phone not video games, "car parking", "sea" for
     "sea level", "southsea", "after 11'o clock"), over-limit forms removed,
     and accepted variants added that IELTS also marks right (numbers as
     words, date orders, heard plurals, British and American spellings
     the marker does not fold). Refreshed once more the same day after the
     doubtful keys were checked against the recordings
     (docs/audits/prepublish-2026-10-03/audio-checks/, segment transcripts): Test 22 Q37
     accepts its three activities in any order (anyOrder, now part of the
     fingerprint), Test 25 Q38 drops "airlines" (he says airliners), Test 29
     Q15 becomes "all day" (heard, and within TWO WORDS), Test 30 Q4 drops
     "5 months" (never said). Re-run tools/refresh_listening_hashes.mjs
     only after deciding a key change is right, and say here why. */
  'da3127400675e0a464aa2d9419106be496bea586d91eb90a6cb6e858a554a378',
  'a818e372b77fc3af187f0621ee44e9a779d7c8e917f577fc159f01dc09e49c59',
  'bcdc0d7539ab9e7b74e7cc3cdf2d9ace16aa8a4915b1ea4c47a5274049492506',
  '49572c358c5c00df061edf9caa19700f0bb50b1b844d4431881b20ca5d8b3fc7',
  '5bac25f509707740b581a6b1dba530d63a25cc114ccc2636470af7d1aa891357',
  '44ae052d79d206cc38e6e066c58b2d3b5e480a4aff6aca0f64a6865023787e05',
  '379f8e628d5848cd242bd77345c1d9eff05405c65fb8d0118345da207453ad98',
  'ac7afd8131509d64216501ccc2020b3bc3b21feded3ef8a85ddfeaf2a2a2e217',
  '316f8c594f3c8f0f5f2a1cac6b5235efa807dfeda71ae9c50404bfac8f834184',
  '94118700a5532a18f2fc505326fb4c06bdff8cf335066e63f0bcfff76562a0f8',
  '1f71423243867022785276f12d81ae9700c80d432301fbcf6dc748e83c8dbd03',
  '753e503eefdac8e4bd17599af1cdb08eac2084f43f5f1b10e5e9e360a55b28c5',
  'd3dbd34b809863b480500b68aa85aab4077ade87e1487eb35caae48b71b2e49f',
  '8a0894debb8933f3634644e08bef17915318eac1325bed91fe91bfc93392a664',
  'b6015188e058aef16d23540da7e580554db59d04b2da124d247eccde7b9e9d32',
  'afcbf244fdbc956ef8d482f4c4551fec20e0df563f225b532f0ff3f156178af3',
  '6e9a5d24ce6984c07c8dc7ff85de70361b2d33b6213f20946a2ab87f377283ce',
  '50b1875c7150aec701431dfcafc761895068b1ba9b8d3e569d065e794a1df7fa',
  '77cefb96fc74a932280b6f898c1100adf34216c9cc5d115c349a4fc7d739741b',
  '9dcde742c68c726b47e1208926601628f5f6a3323f3d54ad2a98570ce00eb721',
  '5b01cd377b1c3bafcfefdd2856e8cf177dee0c308941688b6c6d2c73703d7c07',
  '09377ffaa616ecaeda88ab5cee69a222913674753ce8638ed501fd2aaf255c99',
  '5e89afa81ec938a99ba5d324d43972d9d31f9ffde957adf5ba30833a3adecbfc',
  '9df10d9fa4a06a1a1c43f416ca241928459f27965c166aa18f450c79246f4ccb',
  '9fbee100807f1964c6075a4b61a38eb5cd47d14cff42883ac45f9fc1687fa4ea',
  'f49c0042b3facb2da20d4682549dc112920fc1ba415042bafc6ce68fea4f1018',
  '755f4006a8b461d2919f18fa12c47ad8c74a398fb0a81c788111bc5f7b8de6f1',
  '37aa60c419ca94525a630070d1bcf7547b5c91cd52ac2d7dfdc5c0d75c147c1b',
  'a2e06538a6393223a2609734d20434aecadc4d6dbe2bb586f57b5b1d895dfe09',
  'f2390124bc6c474247bb43eb4edf6995af96a623a12693a6ba5ab8d6fbd289d5',
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
      ['Part 1', 'Part 2', 'Part 3', 'Part 4'],
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
      ({ id, answer, answerPairId, multiSelect, anyOrder }) => ({ id, answer, answerPairId, multiSelect, anyOrder }),
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
