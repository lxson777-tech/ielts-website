/* One small, structured log line per Worker request (4 October 2026).

   Every Worker (workers/*) wraps its handler in withRequestLog, which writes
   ONE object to Cloudflare Workers Logs when the request is answered:

     { event: 'request', worker, method, route, status, ms, ...fields, calls }

   - route is the path with anything id-shaped masked (never the query
     string, which can carry a signed link);
   - fields are the few things a Worker chose to add through trace.set (a
     task kind, a provider, a model name, a count), each a short string, a
     number or a boolean;
   - calls are the outbound requests made while answering, each one
     { to, status, ms }: `to` is a service label and a path ('openai
     /v1/responses', 'supabase /rest/v1/rpc/assessment_reserve'), never a
     query string, a header or a body. That is what makes a slow grade
     findable: the line says which model call took the time.

   WHAT NEVER GOES IN: essay or transcript text, audio, names, emails,
   phone numbers, dates of birth, access tokens, API keys, request bodies,
   model replies. Nothing here reads a body; the only strings are labels
   this file builds itself or values a Worker passes to trace.set, which
   clamps them. tests/worker-log-privacy.test.ts scans every console call
   in the Workers (and the shared code they bundle) for request bodies,
   essays, transcripts and tokens.

   Workers Logs keeps these for a few days (the observability block in each
   wrangler.jsonc). Objects are logged as objects, not strings, so Workers
   Logs indexes every field and a query such as "worker = grade-speaking
   and ms > 30000" works. */

export type LogValue = string | number | boolean | null;

export interface OutboundCall {
  /** Service label and path, e.g. 'openai /v1/responses'. */
  to: string;
  /** HTTP status; 0 when the call threw (network error, timeout). */
  status: number;
  ms: number;
}

export interface RequestTrace {
  /** Adds one short field to this request's log line. Strings are cut to
      60 characters. Only labels belong here (a task kind, a model name, a
      count), never anything a student wrote or said. */
  set(key: string, value: LogValue): void;
  /** Records one outbound call (timedFetch does this for every fetch). */
  call(entry: OutboundCall): void;
}

export interface CollectedTrace extends RequestTrace {
  readonly fields: Record<string, LogValue>;
  readonly calls: OutboundCall[];
  /** Calls beyond MAX_CALLS, counted but not listed. */
  dropped: number;
}

export const MAX_CALLS = 24;
const MAX_STRING = 60;
const MAX_FIELDS = 16;
/** Keys a Worker may not overwrite: the line's own skeleton. */
const RESERVED = new Set(['event', 'worker', 'method', 'route', 'status', 'ms', 'calls', 'dropped', 'error']);

function clampValue(value: LogValue): LogValue {
  if (typeof value === 'string') return value.slice(0, MAX_STRING);
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
  return value;
}

export function createTrace(): CollectedTrace {
  const fields: Record<string, LogValue> = {};
  const calls: OutboundCall[] = [];
  const trace: CollectedTrace = {
    fields,
    calls,
    dropped: 0,
    set(key, value) {
      if (RESERVED.has(key) || !/^[a-zA-Z][a-zA-Z0-9_]{0,31}$/.test(key)) return;
      if (!(key in fields) && Object.keys(fields).length >= MAX_FIELDS) return;
      fields[key] = clampValue(value);
    },
    call(entry) {
      if (calls.length >= MAX_CALLS) {
        trace.dropped += 1;
        return;
      }
      calls.push({ to: entry.to.slice(0, 80), status: entry.status, ms: Math.max(0, Math.round(entry.ms)) });
    },
  };
  return trace;
}

/** A trace that records nothing, for code paths that run without one
    (tests, local tools). */
export const NO_TRACE: RequestTrace = { set() {}, call() {} };

/* A path segment that could identify something (a uuid, a long random
   token, anything with an @ or a long run of digits) is replaced by ':id'.
   The site's own content ids (lesson slugs, paper ids) are short words with
   a few digits and pass through, which keeps routes readable. */
const ID_LIKE = [
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  /@/,
  /\d{6,}/,
  /* A long random token mixes letters and digits; a long table or function
     name (assessment_provider_usage) has no digits and stays readable. */
  /^(?=(?:.*\d){3})(?=.*[A-Za-z])[A-Za-z0-9_-]{20,}$/,
];

export function maskPath(pathname: string): string {
  const segments = pathname.split('/').map((segment) => {
    let decoded = segment;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      /* keep the raw segment */
    }
    return ID_LIKE.some((re) => re.test(decoded)) ? ':id' : segment;
  });
  const joined = segments.join('/') || '/';
  return joined.length > 80 ? `${joined.slice(0, 77)}...` : joined;
}

/** Route label for a request: the masked path, no query string. */
export function routeLabel(url: string): string {
  try {
    return maskPath(new URL(url).pathname.replace(/\/+$/, '') || '/');
  } catch {
    return '?';
  }
}

/** Service label and masked path for an outbound URL. */
export function callLabel(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'unknown';
  }
  const host = parsed.hostname;
  let service = 'site';
  if (host === 'api.openai.com') service = 'openai';
  else if (host === 'generativelanguage.googleapis.com') service = 'gemini';
  else if (host.endsWith('.supabase.co')) service = 'supabase';
  else if (host === '127.0.0.1' || host === 'localhost') service = 'local';
  else if (host === 'challenges.cloudflare.com') service = 'turnstile';
  /* Gemini puts the model name in the path (models/<name>:generateContent),
     which is a label, not an id, so the path is kept as it is there. */
  return `${service} ${maskPath(parsed.pathname)}`;
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return (input as Request).url;
}

/** Wraps a fetch so every outbound call is timed into the trace. The
    request and response are passed through untouched; nothing is read. */
export function timedFetch(fetchFn: typeof fetch, trace: RequestTrace, now: () => number = Date.now): typeof fetch {
  return async (input, init) => {
    const started = now();
    const to = callLabel(urlOf(input));
    try {
      const resp = await fetchFn(input, init);
      trace.call({ to, status: resp.status, ms: now() - started });
      return resp;
    } catch (err) {
      trace.call({ to, status: 0, ms: now() - started });
      throw err;
    }
  };
}

/** The class name of an error, never its message: a message can quote the
    input that failed (JSON.parse does), and the input may be a student's. */
export function errorName(err: unknown): string {
  if (err instanceof Error) return (err.name || 'Error').slice(0, 40);
  return typeof err;
}

export type LogSink = (line: Record<string, unknown>) => void;
const consoleSink: LogSink = (line) => console.log(line);

export interface RequestLogOptions {
  now?: () => number;
  log?: LogSink;
}

/** Wraps a Worker's fetch handler: one structured line per answered request
    (preflight OPTIONS requests are not logged; Cloudflare's own invocation
    log still records them). A handler that throws is logged as status 500
    with its error class, then the error is rethrown so Cloudflare still
    reports it as an exception. */
export function withRequestLog<E>(
  worker: string,
  handle: (request: Request, env: E, trace: RequestTrace) => Promise<Response>,
  opts: RequestLogOptions = {},
): (request: Request, env: E) => Promise<Response> {
  const now = opts.now ?? Date.now;
  const log = opts.log ?? consoleSink;
  return async (request, env) => {
    if (request.method === 'OPTIONS') return handle(request, env, NO_TRACE);
    const started = now();
    const trace = createTrace();
    const line = (status: number, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
      event: 'request',
      worker,
      method: request.method,
      route: routeLabel(request.url),
      status,
      ms: Math.max(0, Math.round(now() - started)),
      ...trace.fields,
      ...extra,
      calls: trace.calls,
      ...(trace.dropped ? { dropped: trace.dropped } : {}),
    });
    let response: Response;
    try {
      response = await handle(request, env, trace);
    } catch (err) {
      safeLog(log, line(500, { error: errorName(err) }));
      throw err;
    }
    safeLog(log, line(response.status));
    return response;
  };
}

/** One structured line for a scheduled (cron) run. `skip` returns true when
    the run did nothing worth a line (the live examiner's minute sweep in
    open mode), so a quiet cron writes nothing of its own. */
export async function logScheduled<R extends Record<string, LogValue>>(
  worker: string,
  run: (trace: RequestTrace) => Promise<R>,
  opts: RequestLogOptions & { skip?: (result: R) => boolean } = {},
): Promise<R> {
  const now = opts.now ?? Date.now;
  const log = opts.log ?? consoleSink;
  const started = now();
  const trace = createTrace();
  let result: R;
  try {
    result = await run(trace);
  } catch (err) {
    safeLog(log, { event: 'scheduled', worker, ok: false, ms: Math.round(now() - started), error: errorName(err), calls: trace.calls });
    throw err;
  }
  if (!opts.skip?.(result)) {
    const fields: Record<string, LogValue> = {};
    for (const [key, value] of Object.entries(result)) {
      if (!RESERVED.has(key)) fields[key] = clampValue(value);
    }
    safeLog(log, { event: 'scheduled', worker, ok: true, ms: Math.round(now() - started), ...fields, calls: trace.calls });
  }
  return result;
}

/** Logging must never turn into a failure of the request it describes. */
function safeLog(log: LogSink, line: Record<string, unknown>): void {
  try {
    log(line);
  } catch {
    /* nothing to do */
  }
}
