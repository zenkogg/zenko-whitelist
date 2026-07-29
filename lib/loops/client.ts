/**
 * Minimal Loops (loops.so) HTTP client.
 *
 * Mirrors the resilience contract of zenko-mono's cross-service callers
 * (services/waitlist-match.service.ts): every method returns a result object,
 * NEVER throws, and short-circuits to a no-op when `LOOPS_API_KEY` is unset —
 * so a Loops outage, a bad key, or a missing key can never break a signup.
 *
 * `LOOPS_DRY_RUN=1` logs the payload instead of sending; this is how the
 * integration is exercised locally without touching a real Loops workspace.
 */

const LOOPS_BASE_URL = 'https://app.loops.so/api/v1';
const REQUEST_TIMEOUT_MS = 3000;
const RATE_LIMIT_RETRY_DELAY_MS = 1000;

/** Loops rejects any body value longer than 500 chars. */
export const LOOPS_VALUE_MAX = 500;

export interface LoopsResult {
  ok: boolean;
  /** HTTP status, or 0 when no request was attempted (disabled / dry-run). */
  status: number;
  error?: string;
  /** True when `LOOPS_API_KEY` is unset — callers treat this as "nothing happened". */
  disabled?: boolean;
}

type PropertyValue = string | number | boolean | null;

/**
 * Standard contact fields. Custom `waitlist*` / `zenko*` properties are NOT
 * listed here — they ride on the runtime object built by the typed mappers
 * (lib/loops/contact.ts) and serialize via JSON.stringify. The mapper is the
 * type authority for those; the client only needs `email` to be present.
 */
export interface LoopsContactPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  userId?: string;
  subscribed?: boolean;
  source?: string;
  environment?: string;
  mailingLists?: Record<string, boolean>;
}

export interface LoopsEventPayload {
  email: string;
  eventName: string;
  userId?: string;
  eventProperties?: Record<string, PropertyValue>;
  contactProperties?: Record<string, PropertyValue>;
  mailingLists?: Record<string, boolean>;
}

export interface LoopsClient {
  /** `PUT /v1/contacts/update` — upserts by email. */
  updateContact(payload: LoopsContactPayload): Promise<LoopsResult>;
  /** `POST /v1/events/send`. */
  sendEvent(payload: LoopsEventPayload, idempotencyKey?: string): Promise<LoopsResult>;
  /** `POST /v1/contacts/delete` — for future erasure requests. */
  deleteContact(email: string): Promise<LoopsResult>;
}

function isDryRun(): boolean {
  return (process.env.LOOPS_DRY_RUN ?? '').trim() === '1';
}

async function request(
  method: 'PUT' | 'POST',
  path: string,
  body: unknown,
  extraHeaders?: Record<string, string>
): Promise<LoopsResult> {
  const apiKey = (process.env.LOOPS_API_KEY ?? '').trim();
  if (!apiKey) return { ok: false, status: 0, disabled: true };

  if (isDryRun()) {
    console.info(`[loops] DRY_RUN ${method} ${path}`, JSON.stringify(body));
    return { ok: true, status: 0 };
  }

  const send = () =>
    fetch(`${LOOPS_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

  try {
    let res = await send();

    // One retry on rate-limit (10 req/s per team). A single short backoff is
    // enough to clear a burst; we do not loop, to bound request latency.
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_RETRY_DELAY_MS));
      res = await send();
    }

    if (res.ok) return { ok: true, status: res.status };
    return { ok: false, status: res.status, error: await describeError(res) };
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

async function describeError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: unknown; error?: unknown };
    if (typeof body.message === 'string') return `HTTP ${res.status}: ${body.message}`;
    if (typeof body.error === 'string') return `HTTP ${res.status}: ${body.error}`;
  } catch {
    // fall through to status-only
  }
  return `HTTP ${res.status}`;
}

/** Strip `undefined` keys so they are omitted from the JSON body entirely. */
function compact<T extends object>(obj: T): T {
  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (record[key] === undefined) delete record[key];
  }
  return obj;
}

export function createLoopsClient(): LoopsClient {
  return {
    updateContact(payload) {
      return request('PUT', '/contacts/update', compact({ ...payload }));
    },
    sendEvent(payload, idempotencyKey) {
      return request(
        'POST',
        '/events/send',
        compact({ ...payload }),
        idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined
      );
    },
    deleteContact(email) {
      return request('POST', '/contacts/delete', { email });
    },
  };
}

/** Shared default client. Injectable elsewhere for tests. */
export const loops = createLoopsClient();

/**
 * Beta mailing-list membership `{ id: true }`, or `undefined` when
 * `LOOPS_MAILING_LIST_ID` is unset. Attach ONLY to the one-time `waitlist_joined`
 * event, never to a steady-state sync — otherwise a repeat could re-subscribe
 * someone who left the list. See lib/loops/sync.ts.
 */
export function betaMailingLists(): Record<string, boolean> | undefined {
  const id = (process.env.LOOPS_MAILING_LIST_ID ?? '').trim();
  return id ? { [id]: true } : undefined;
}

/**
 * Deployment tag stamped on every Loops contact so staging / local test
 * contacts can be excluded from real sends (`environment is production`).
 * Mirrors the app's existing VERCEL_ENV convention (see the avatar blob-path
 * split in app/api/auth-callback): anything that is not the Vercel production
 * deployment counts as staging.
 */
export function loopsEnvironment(): string {
  return process.env.VERCEL_ENV === 'production' ? 'production' : 'staging';
}
