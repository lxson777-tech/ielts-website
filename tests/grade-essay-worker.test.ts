import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { createHandler, resolveProvider, buildOpenAiRequest, defaultDeps, validateAssessment } from '../workers/grade-essay/src/index.ts';

const PROD_ORIGIN = 'https://lxson777-tech.github.io';
const WORKER_URL = 'https://ielts-grade-essay.example.workers.dev/';
const DUMMY_OPENAI_KEY = 'sk-test-dummy';
const DUMMY_GEMINI_KEY = 'gk-test-dummy';

function baseEnv(overrides: Record<string, unknown> = {}) {
  return {
    ALLOWED_ORIGINS: `${PROD_ORIGIN},http://localhost:4321`,
    ...overrides,
  } as never;
}

function openaiEnv(overrides: Record<string, unknown> = {}) {
  return baseEnv({ OPENAI_API_KEY: DUMMY_OPENAI_KEY, ...overrides });
}

const VALID_ESSAY =
  'This essay discusses the topic in reasonable depth, offering a clear position with several supporting ' +
  'points and a short conclusion that ties the argument together for the reader to follow easily.';

function gradeRequest(overrides: { prompt?: Record<string, unknown>; essay?: string } = {}) {
  return {
    prompt: {
      task: 'task2',
      promptHtml: '<p>Some people think X. Discuss both views and give your opinion.</p>',
      minWords: 250,
      ...overrides.prompt,
    },
    essay: overrides.essay ?? VALID_ESSAY,
  };
}

function req(method: string, opts: { url?: string; origin?: string | null; body?: unknown } = {}) {
  const headers: Record<string, string> = {};
  if (opts.origin !== null) headers.Origin = opts.origin ?? PROD_ORIGIN;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  return new Request(opts.url ?? WORKER_URL, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
}

/** One assessment the model could plausibly return, at a given whole band
    for every criterion (keeps the median tests simple to read). */
function assessmentAt(band: number) {
  const criterion = () => ({
    evidence: `some quoted evidence at band ${band}`,
    band,
    comment: `Comment for band ${band}.`,
    tip: `Tip to reach band ${band + 1}.`,
  });
  return {
    criteria: {
      taskResponse: criterion(),
      coherenceCohesion: criterion(),
      lexicalResource: criterion(),
      grammaticalRange: criterion(),
    },
    moments: [{ quote: 'a quoted fragment', note: 'why it matters' }],
    strengths: ['a strength'],
    improvements: ['an improvement'],
  };
}

/** Wraps an assessment object the way the OpenAI Responses API wraps its
    structured output: output[] containing a 'reasoning' item (to be ignored)
    and a 'message' item whose content[] carries the JSON as output_text. */
function openaiEnvelope(assessment: unknown, opts: { status?: string } = {}) {
  const body: Record<string, unknown> = {
    output: [
      { type: 'reasoning', id: 'r1' },
      {
        type: 'message',
        id: 'm1',
        content: [{ type: 'output_text', text: JSON.stringify(assessment) }],
      },
    ],
  };
  if (opts.status) body.status = opts.status;
  return body;
}

interface FakeCall {
  url: string;
  init?: RequestInit;
}

function makeFakeFetch(
  responder: (url: string, init: RequestInit | undefined) => { status: number; body: unknown } | 'network-error',
) {
  const calls: FakeCall[] = [];
  const fn = (async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    const result = responder(url, init);
    if (result === 'network-error') throw new Error('network down');
    return new Response(JSON.stringify(result.body), { status: result.status });
  }) as typeof fetch;
  return { fn, calls };
}

function handlerWith(fetchFn: typeof fetch) {
  return createHandler({ fetch: fetchFn });
}

// ---- resolveProvider ----

test('resolveProvider defaults to openai and only switches on an explicit gemini', () => {
  assert.equal(resolveProvider(baseEnv()), 'openai');
  assert.equal(resolveProvider(baseEnv({ GRADER_PROVIDER: 'gemini' })), 'gemini');
  assert.equal(resolveProvider(baseEnv({ GRADER_PROVIDER: 'GEMINI' })), 'gemini');
  assert.equal(resolveProvider(baseEnv({ GRADER_PROVIDER: 'something-else' })), 'openai');
});

// ---- Origins (unchanged behaviour: the Worker never rejects on Origin) ----

test('a request from an allowed origin gets a 200', async () => {
  const { fn } = makeFakeFetch((url) => ({ status: 200, body: openaiEnvelope(assessmentAt(7)) }));
  const handler = handlerWith(fn);
  const res = await handler.fetch(req('POST', { origin: PROD_ORIGIN, body: gradeRequest() }), openaiEnv());
  assert.equal(res.status, 200);
});

test('a request with no Origin header is still allowed, matching current behaviour', async () => {
  const { fn } = makeFakeFetch(() => ({ status: 200, body: openaiEnvelope(assessmentAt(7)) }));
  const handler = handlerWith(fn);
  const res = await handler.fetch(req('POST', { origin: null, body: gradeRequest() }), openaiEnv());
  assert.equal(res.status, 200);
});

// ---- Config / fail-closed ----

test('503 when OPENAI_API_KEY is missing for the (default) openai provider, and OpenAI is never called', async () => {
  const { fn, calls } = makeFakeFetch(() => {
    throw new Error('should not be called');
  });
  const handler = handlerWith(fn);
  const res = await handler.fetch(req('POST', { body: gradeRequest() }), baseEnv());
  assert.equal(res.status, 503);
  const data = await res.json();
  assert.equal(data.error, 'The essay grader is not configured');
  assert.equal(calls.length, 0);
});

test('503 when GEMINI_API_KEY is missing for GRADER_PROVIDER=gemini', async () => {
  const { fn, calls } = makeFakeFetch(() => {
    throw new Error('should not be called');
  });
  const handler = handlerWith(fn);
  const res = await handler.fetch(req('POST', { body: gradeRequest() }), baseEnv({ GRADER_PROVIDER: 'gemini' }));
  assert.equal(res.status, 503);
  assert.equal(calls.length, 0);
});

// ---- Happy path (openai) ----

test('happy path: a stubbed OpenAI reply returns 200 with the shape the site expects, and evidence never reaches the client', async () => {
  const { fn } = makeFakeFetch(() => ({ status: 200, body: openaiEnvelope(assessmentAt(7)) }));
  const handler = handlerWith(fn);
  const res = await handler.fetch(req('POST', { body: gradeRequest() }), openaiEnv({ GRADING_SAMPLES: '1' }));
  assert.equal(res.status, 200);
  const data = await res.json();

  for (const key of ['taskResponse', 'coherenceCohesion', 'lexicalResource', 'grammaticalRange']) {
    assert.equal(data.criteria[key].band, 7);
    assert.equal(typeof data.criteria[key].comment, 'string');
    assert.equal(typeof data.criteria[key].tip, 'string');
    assert.equal('evidence' in data.criteria[key], false, `criteria.${key}.evidence must not leak to the client`);
  }
  assert.ok(Array.isArray(data.moments));
  assert.deepEqual(data.moments[0], { quote: 'a quoted fragment', note: 'why it matters' });
  assert.deepEqual(data.strengths, ['a strength']);
  assert.deepEqual(data.improvements, ['an improvement']);
  assert.equal('corrections' in data, false, 'the old corrections field must not appear');
});

test('the request sent to OpenAI has the right URL, bearer header, model, strict json_schema, reasoning effort, and task-specific rubric text', async () => {
  const { fn, calls } = makeFakeFetch(() => ({ status: 200, body: openaiEnvelope(assessmentAt(6)) }));
  const handler = handlerWith(fn);

  const res2 = await handler.fetch(
    req('POST', { body: gradeRequest({ prompt: { task: 'task2' } }) }),
    openaiEnv({ GRADING_SAMPLES: '1' }),
  );
  assert.equal(res2.status, 200);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.openai.com/v1/responses');
  const headers = new Headers(calls[0].init?.headers);
  assert.equal(headers.get('Authorization'), `Bearer ${DUMMY_OPENAI_KEY}`);
  assert.equal(headers.get('Content-Type'), 'application/json');

  const body = JSON.parse(String(calls[0].init?.body)) as Record<string, any>;
  assert.equal(body.model, 'gpt-5.6-terra');
  assert.equal(body.reasoning.effort, 'medium');
  assert.equal(body.text.format.type, 'json_schema');
  assert.equal(body.text.format.strict, true);
  assert.equal(body.store, false);
  assert.ok(String(body.instructions).includes('Task Response'), 'expected Task 2 instructions to mention Task Response');
  assert.ok(!String(body.instructions).toLowerCase().includes('award the lower'));
  assert.ok(!String(body.instructions).toLowerCase().includes('over-score'));

  // Task 1 uses the Task Achievement descriptor instead.
  const { fn: fn1, calls: calls1 } = makeFakeFetch(() => ({ status: 200, body: openaiEnvelope(assessmentAt(6)) }));
  const handler1 = handlerWith(fn1);
  await handler1.fetch(
    req('POST', { body: gradeRequest({ prompt: { task: 'task1', minWords: 150 } }) }),
    openaiEnv({ GRADING_SAMPLES: '1' }),
  );
  const body1 = JSON.parse(String(calls1[0].init?.body)) as Record<string, any>;
  assert.ok(String(body1.instructions).includes('Task Achievement'), 'expected Task 1 instructions to mention Task Achievement');
});

test('custom OPENAI_MODEL and OPENAI_REASONING_EFFORT vars are honoured', () => {
  const spec = buildOpenAiRequest(
    openaiEnv({ OPENAI_MODEL: 'gpt-custom', OPENAI_REASONING_EFFORT: 'high' }),
    'system text',
    'user text',
  );
  assert.equal(spec.body.model, 'gpt-custom');
  assert.equal((spec.body.reasoning as { effort: string }).effort, 'high');
});

// ---- Failure handling (openai) ----

test('an incomplete OpenAI response is treated as a failed sample and returns 502', async () => {
  const { fn } = makeFakeFetch(() => ({ status: 200, body: openaiEnvelope(assessmentAt(7), { status: 'incomplete' }) }));
  const handler = handlerWith(fn);
  const res = await handler.fetch(req('POST', { body: gradeRequest() }), openaiEnv({ GRADING_SAMPLES: '1' }));
  assert.equal(res.status, 502);
});

test('a 429 from OpenAI is passed through as 429 with the busy message', async () => {
  const { fn } = makeFakeFetch(() => ({ status: 429, body: { error: { message: 'rate limited' } } }));
  const handler = handlerWith(fn);
  const res = await handler.fetch(req('POST', { body: gradeRequest() }), openaiEnv({ GRADING_SAMPLES: '1' }));
  assert.equal(res.status, 429);
  const data = await res.json();
  assert.equal(data.error, 'The grader is busy right now. Please try again in a minute.');
});

test('a 401 from OpenAI is mapped to 502 with a key-rejected message, never leaking the key', async () => {
  const { fn } = makeFakeFetch(() => ({ status: 401, body: { error: { message: 'invalid api key' } } }));
  const handler = handlerWith(fn);
  const res = await handler.fetch(req('POST', { body: gradeRequest() }), openaiEnv({ GRADING_SAMPLES: '1' }));
  assert.equal(res.status, 502);
  const text = await res.text();
  assert.ok(text.includes('The OpenAI key was rejected'));
  assert.ok(!text.includes(DUMMY_OPENAI_KEY));
});

// ---- Median of N ----

test('median-of-3 picks the middle run by mean band, not the best or worst', async () => {
  let call = 0;
  const bands = [5, 6, 9]; // deliberately out of order: worst, middle, best
  const { fn } = makeFakeFetch(() => {
    const band = bands[call++]!;
    return { status: 200, body: openaiEnvelope(assessmentAt(band)) };
  });
  const handler = handlerWith(fn);
  const res = await handler.fetch(req('POST', { body: gradeRequest() }), openaiEnv({ GRADING_SAMPLES: '3' }));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.criteria.taskResponse.band, 6, 'expected the median run (band 6), not the best or worst');
});

// ---- nextBand / actionPlan ----

test('the OpenAI json_schema requires nextBand per criterion and actionPlan at top level, with additionalProperties false throughout', async () => {
  const { fn, calls } = makeFakeFetch(() => ({ status: 200, body: openaiEnvelope(assessmentAt(6)) }));
  const handler = handlerWith(fn);
  await handler.fetch(req('POST', { body: gradeRequest() }), openaiEnv({ GRADING_SAMPLES: '1' }));

  const body = JSON.parse(String(calls[0].init?.body)) as Record<string, any>;
  const schema = body.text.format.schema;
  assert.equal(schema.additionalProperties, false);
  assert.ok(schema.required.includes('actionPlan'), 'actionPlan must be required at the top level');
  assert.deepEqual(schema.properties.actionPlan, { type: 'array', items: { type: 'string' } });

  const criterionSchema = schema.properties.criteria.properties.taskResponse;
  assert.equal(criterionSchema.additionalProperties, false);
  assert.ok(criterionSchema.required.includes('nextBand'), 'nextBand must be required per criterion');

  const nextBandSchema = criterionSchema.properties.nextBand;
  assert.equal(nextBandSchema.additionalProperties, false);
  assert.deepEqual(nextBandSchema.required, ['target', 'gap', 'actions']);

  const actionItemSchema = nextBandSchema.properties.actions.items;
  assert.equal(actionItemSchema.additionalProperties, false);
  assert.deepEqual(actionItemSchema.required, ['do', 'from', 'to']);
});

test('a response carrying nextBand and actionPlan comes back through the handler intact', async () => {
  const nextBand = {
    target: 7,
    gap: 'You need to extend your ideas with more specific support.',
    actions: [
      {
        do: 'Add one concrete example per body paragraph.',
        from: 'This is important.',
        to: 'This is important because it affects millions of workers directly.',
      },
      { do: 'Write a clearer conclusion that restates your position.', from: '', to: '' },
    ],
  };
  const actionPlan = [
    'Task Response: add a specific example to each body paragraph.',
    'Grammar: check subject-verb agreement in every sentence before submitting.',
    'This week: write one practice essay and time yourself at 40 minutes.',
  ];
  const criterion = () => ({
    evidence: 'some quoted evidence',
    band: 6,
    comment: 'Comment for band 6.',
    tip: 'Tip to reach band 7.',
    nextBand,
  });
  const assessment = {
    criteria: {
      taskResponse: criterion(),
      coherenceCohesion: criterion(),
      lexicalResource: criterion(),
      grammaticalRange: criterion(),
    },
    moments: [{ quote: 'a quoted fragment', note: 'why it matters' }],
    strengths: ['a strength'],
    improvements: ['an improvement'],
    actionPlan,
  };
  const { fn } = makeFakeFetch(() => ({ status: 200, body: openaiEnvelope(assessment) }));
  const handler = handlerWith(fn);
  const res = await handler.fetch(req('POST', { body: gradeRequest() }), openaiEnv({ GRADING_SAMPLES: '1' }));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.deepEqual(data.criteria.taskResponse.nextBand, nextBand);
  assert.deepEqual(data.actionPlan, actionPlan);
});

test('a malformed nextBand (e.g. a string) is dropped without failing the grade', async () => {
  const assessment = assessmentAt(6) as Record<string, any>;
  assessment.criteria.taskResponse.nextBand = 'not an object';
  const { fn } = makeFakeFetch(() => ({ status: 200, body: openaiEnvelope(assessment) }));
  const handler = handlerWith(fn);
  const res = await handler.fetch(req('POST', { body: gradeRequest() }), openaiEnv({ GRADING_SAMPLES: '1' }));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal('nextBand' in data.criteria.taskResponse, false);
});

test('a response with no nextBand or actionPlan at all still validates (Gemini-rollback / old-cache compatibility)', async () => {
  // assessmentAt() deliberately builds an assessment without nextBand or
  // actionPlan, exactly like a cached result graded before this feature
  // shipped, or a reply from the Gemini rollback if it ever stops sending
  // these fields. The grade must not fail just because they are absent.
  const { fn } = makeFakeFetch(() => ({ status: 200, body: openaiEnvelope(assessmentAt(6)) }));
  const handler = handlerWith(fn);
  const res = await handler.fetch(req('POST', { body: gradeRequest() }), openaiEnv({ GRADING_SAMPLES: '1' }));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal('nextBand' in data.criteria.taskResponse, false);
  assert.deepEqual(data.actionPlan, []);
});

test('nextBand.actions is capped at 4 items', async () => {
  const assessment = assessmentAt(6) as Record<string, any>;
  assessment.criteria.taskResponse.nextBand = {
    target: 7,
    gap: 'short gap',
    actions: [1, 2, 3, 4, 5].map((n) => ({ do: `action ${n}`, from: '', to: '' })),
  };
  const { fn } = makeFakeFetch(() => ({ status: 200, body: openaiEnvelope(assessment) }));
  const handler = handlerWith(fn);
  const res = await handler.fetch(req('POST', { body: gradeRequest() }), openaiEnv({ GRADING_SAMPLES: '1' }));
  const data = await res.json();
  assert.equal(data.criteria.taskResponse.nextBand.actions.length, 4);
});

test('long nextBand and actionPlan strings are trimmed to their caps, and target is clamped to 1-9', async () => {
  const longGap = 'g'.repeat(600);
  const longDo = 'd'.repeat(400);
  const longFrom = 'x'.repeat(400);
  const longTo = 'y'.repeat(400);
  const longPlanStep = 'p'.repeat(400);
  const assessment = assessmentAt(6) as Record<string, any>;
  assessment.criteria.taskResponse.nextBand = {
    target: 11, // out of range, must clamp to 9
    gap: longGap,
    actions: [{ do: longDo, from: longFrom, to: longTo }],
  };
  assessment.actionPlan = Array.from({ length: 7 }, () => longPlanStep);
  const { fn } = makeFakeFetch(() => ({ status: 200, body: openaiEnvelope(assessment) }));
  const handler = handlerWith(fn);
  const res = await handler.fetch(req('POST', { body: gradeRequest() }), openaiEnv({ GRADING_SAMPLES: '1' }));
  assert.equal(res.status, 200);
  const data = await res.json();
  const nb = data.criteria.taskResponse.nextBand;
  assert.equal(nb.target, 9);
  assert.equal(nb.gap.length, 500);
  assert.equal(nb.actions[0].do.length, 300);
  assert.equal(nb.actions[0].from.length, 300);
  assert.equal(nb.actions[0].to.length, 300);
  assert.equal(data.actionPlan.length, 6, 'actionPlan capped at 6 items');
  assert.equal(data.actionPlan[0].length, 300);
});

// ---- Gemini rollback path ----

test('GRADER_PROVIDER=gemini calls generativelanguage.googleapis.com and still returns the same response shape', async () => {
  const geminiBody = {
    candidates: [{ content: { parts: [{ text: JSON.stringify(assessmentAt(6)) }] } }],
  };
  const { fn, calls } = makeFakeFetch((url) => {
    assert.ok(url.startsWith('https://generativelanguage.googleapis.com/'), `unexpected URL: ${url}`);
    return { status: 200, body: geminiBody };
  });
  const handler = handlerWith(fn);
  const res = await handler.fetch(
    req('POST', { body: gradeRequest() }),
    baseEnv({ GRADER_PROVIDER: 'gemini', GEMINI_API_KEY: DUMMY_GEMINI_KEY, GEMINI_MODEL: 'gemini-2.5-flash', GRADING_SAMPLES: '1' }),
  );
  assert.equal(res.status, 200);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].url.includes('generativelanguage.googleapis.com'));
  const data = await res.json();
  assert.equal(data.criteria.taskResponse.band, 6);
  assert.ok(Array.isArray(data.moments));
});

// ---- defaultDeps / default export wiring ----

test('defaultDeps.fetch is a wrapper function, not the bare global fetch reference', async () => {
  // Regression check: `{ fetch }` (the bare global) throws "Illegal invocation"
  // in the Workers runtime when called as `deps.fetch(...)`, because the call
  // loses its required `this` binding. defaultDeps must wrap it in a plain
  // function instead, so `deps.fetch(...)` never needs that binding.
  assert.equal(typeof defaultDeps.fetch, 'function');
  assert.notEqual(defaultDeps.fetch, fetch, 'defaultDeps.fetch must not be the bare global fetch reference');
  // Detach it exactly as `deps.fetch(...)` does, and call it against an
  // address nothing listens on, so this stays fast and needs no real
  // network access. The only thing under test is that the call itself is
  // accepted (no synchronous "Illegal invocation" TypeError) — a network
  // failure from the rejected connection is expected and fine.
  const detached = defaultDeps.fetch;
  await assert.doesNotReject(() => detached('http://127.0.0.1:1/', { method: 'GET' }).catch(() => {}));
});

test('OPTIONS returns 204 and an unsupported method returns 405', async () => {
  const env = openaiEnv();
  const res1 = await worker.fetch(req('OPTIONS'), env);
  assert.equal(res1.status, 204);
  const res2 = await worker.fetch(req('PUT'), env);
  assert.equal(res2.status, 405);
});

// ---- Rubric: exact descriptor wording ----

test('the four descriptor scales contain the exact band 9 and band 6 wording from the official public descriptors', async () => {
  // Capture the real system text the Worker sends for a Task 2 essay, the
  // same way the "request sent to OpenAI" test does.
  const { fn, calls } = makeFakeFetch(() => ({ status: 200, body: openaiEnvelope(assessmentAt(6)) }));
  const handler = handlerWith(fn);
  await handler.fetch(req('POST', { body: gradeRequest() }), openaiEnv({ GRADING_SAMPLES: '1' }));
  const body = JSON.parse(String(calls[0].init?.body)) as Record<string, any>;
  const instructions = String(body.instructions);

  // Task response (Task 2), band 9 and band 6, copied verbatim from
  // docs/writing-descriptors-task-2.txt.
  assert.ok(
    instructions.includes(
      'presents a fully developed position in answer to the question with relevant, fully extended and well supported ideas',
    ),
  );
  assert.ok(
    instructions.includes('presents a relevant position although the conclusions may become unclear or repetitive'),
  );

  // Lexical resource, band 9 and band 6, copied verbatim (shared by both tasks).
  assert.ok(
    instructions.includes('uses a wide range of vocabulary with very natural and sophisticated control of lexical features'),
  );
  assert.ok(instructions.includes('attempts to use less common vocabulary but with some inaccuracy'));

  // Grammatical range and accuracy, band 9 and band 6.
  assert.ok(instructions.includes('uses a wide range of structures with full flexibility and accuracy'));
  assert.ok(instructions.includes('uses a mix of simple and complex sentence forms'));

  // Coherence and cohesion, band 9 and band 6.
  assert.ok(instructions.includes('uses cohesion in such a way that it attracts no attention'));
  assert.ok(instructions.includes('uses paragraphing, but not always logically'));
});

test('Task 1 uses the Academic Task Achievement scale (band 9 and band 6 wording, GT lines excluded)', async () => {
  const { fn, calls } = makeFakeFetch(() => ({ status: 200, body: openaiEnvelope(assessmentAt(6)) }));
  const handler = handlerWith(fn);
  await handler.fetch(
    req('POST', { body: gradeRequest({ prompt: { task: 'task1', minWords: 150 } }) }),
    openaiEnv({ GRADING_SAMPLES: '1' }),
  );
  const body = JSON.parse(String(calls[0].init?.body)) as Record<string, any>;
  const instructions = String(body.instructions);
  assert.ok(instructions.includes('fully satisfies all the requirements of the task'));
  assert.ok(instructions.includes('presents an overview with information appropriately selected'));
  // General Training lines must never appear (Academic-only site).
  assert.ok(!instructions.includes('(GT)'));
});

test('validateAssessment replaces em and en dashes in every string of the response', () => {
  const raw = {
    criteria: Object.fromEntries(
      ['taskResponse', 'coherenceCohesion', 'lexicalResource', 'grammaticalRange'].map((k) => [
        k,
        { band: 6, comment: 'Clear position — mostly supported', tip: 'Check subject–verb agreement', nextBand: { target: 7, gap: 'Band 7 asks for more — and better', actions: [{ do: 'Write 2–3 examples', from: '', to: '' }] } },
      ]),
    ),
    moments: [{ quote: 'a — b', note: 'n' }],
    strengths: ['s'],
    improvements: ['i'],
    actionPlan: ['Grammar — fix articles'],
  };
  const out = validateAssessment(raw) as Record<string, any>;
  const text = JSON.stringify(out);
  assert.ok(!text.includes('\u2014') && !text.includes('\u2013'), 'no dashes survive');
  assert.equal(out.criteria.taskResponse.comment, 'Clear position, mostly supported');
  assert.equal(out.criteria.taskResponse.tip, 'Check subject, verb agreement');
  assert.equal(out.criteria.taskResponse.nextBand.actions[0].do, 'Write 2-3 examples');
  assert.equal(out.actionPlan[0], 'Grammar, fix articles');
});

test('validateAssessment strips model-added numbering from the action plan', () => {
  const crit = { band: 6, comment: 'c', tip: 't' };
  const raw = { criteria: { taskResponse: crit, coherenceCohesion: crit, lexicalResource: crit, grammaticalRange: crit }, moments: [], strengths: [], improvements: [], actionPlan: ['1. Task: answer all parts', '2) Grammar: articles', 'Step 3: practise'] };
  const out = validateAssessment(raw) as Record<string, any>;
  assert.deepEqual(out.actionPlan, ['Task: answer all parts', 'Grammar: articles', 'practise']);
});
