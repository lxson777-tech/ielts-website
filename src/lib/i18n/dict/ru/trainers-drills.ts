/* Batch: the names and blurbs of the single-part drills built in
   src/lib/tests/drills.ts, shown on the trainers and in the study plan.

   Small enough to live in the main dictionary, unlike the coaching texts in
   ./parts/. Its own file rather than an existing batch so nothing here
   collides with the test-player batch.

   The passage title and the source test's name arrive as values and stay
   English: they are exam material. "Part" stays English like every other
   Part number on the site. The Russian avoids counted forms ("Вопросов: 13")
   because the numbers come from the test data and could be anything. */

export const strings: Record<string, string> = {
  '{part} Drill: {passage}': '{part}, тренировка: {passage}',
  'One timed passage from "{test}", {questions} questions in {minutes} minutes. Good for practicing pace on a single passage without committing to a full exam.':
    'Один отрывок с таймером из теста "{test}". Вопросов: {questions}, время: {minutes} мин. Хорошо, чтобы потренировать темп на одном отрывке и не браться сразу за весь экзамен.',
  'Test {test} · Part {part}': 'Тест {test} · Part {part}',
  'One timed part from "{test}", {questions} questions in about {minutes} minutes. Good for practicing pace on a single part without committing to a full test.':
    'Одна часть с таймером из теста "{test}". Вопросов: {questions}, время: около {minutes} мин. Хорошо, чтобы потренировать темп на одной части и не браться сразу за весь тест.',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
