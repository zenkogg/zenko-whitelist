/**
 * Whether Zenko itself is open to sign-ups, read server-side from the main
 * backend's public config (`platformConfig.closedBeta`, the sign-in gate), so
 * the waitlist switches its copy at the same moment zenko.gg does.
 *
 * Only an explicit `false` opens. A missing field, a failed or slow read and
 * any other value keep the waitlist copy: telling someone Zenko is open while
 * sign-in still refuses them is the one wrong state, and the reverse only
 * leaves the waitlist copy up a little longer.
 */

export const ZENKO_SITE_URL = 'https://zenko.gg';

const DEFAULT_API_URL = 'https://api-prod.zenko.gg';

/* Matches the backend's own 60s cache on this response. */
const REVALIDATE_SECONDS = 60;

/* Short, because a page waits on it and closed is the safe answer. */
const DEFAULT_TIMEOUT_MS = 3000;

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export function zenkoOpenFrom(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false;
  const { platformConfig } = payload as { platformConfig?: unknown };
  if (typeof platformConfig !== 'object' || platformConfig === null) return false;
  return (platformConfig as { closedBeta?: unknown }).closedBeta === false;
}

export async function readZenkoOpen({
  fetchImpl = fetch,
  env = process.env,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: {
  fetchImpl?: FetchLike;
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
} = {}): Promise<boolean> {
  const apiUrl = (env.ZENKO_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');
  try {
    const res = await fetchImpl(`${apiUrl}/api/config/games`, {
      signal: AbortSignal.timeout(timeoutMs),
      // Next's data cache: one backend read per minute, shared by every visitor.
      next: { revalidate: REVALIDATE_SECONDS },
    } as RequestInit);
    if (!res.ok) return false;
    return zenkoOpenFrom(await res.json());
  } catch {
    return false;
  }
}
