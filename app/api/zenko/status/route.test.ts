/**
 * The waitlist pages ask this route whether Zenko is open; it answers from the
 * main backend's public config and says closed unless that config explicitly
 * reports the sign-in gate off.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

/* The production public config before the backend carried closedBeta. */
const PRODUCTION_TODAY = {
  games: [],
  version: 1,
  wagerLimits: { maxConcurrentWagers: 10 },
  platformConfig: {
    cancelWindowMs: 180000,
    minChallengeCredits: 100,
    composedMoneyEnabled: false,
    composedEntryCap: 500,
  },
};

function backendAnswers(body: unknown, status = 200) {
  const fetchMock = vi.fn(
    async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status })
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GET /api/zenko/status', () => {
  it('says closed for the production response that predates the flag', async () => {
    backendAnswers(PRODUCTION_TODAY);
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ open: false });
  });

  it('says open only when the backend reports the gate off', async () => {
    const fetchMock = backendAnswers({ platformConfig: { closedBeta: false } });
    const res = await GET();
    await expect(res.json()).resolves.toEqual({ open: true });
    expect(fetchMock.mock.calls[0][0]).toBe('https://api-prod.zenko.gg/api/config/games');
  });

  it('says closed while the gate is on', async () => {
    backendAnswers({ platformConfig: { closedBeta: true } });
    await expect((await GET()).json()).resolves.toEqual({ open: false });
  });

  it('says closed when the backend cannot be reached', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      })
    );
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ open: false });
  });

  it('lets the edge share one answer for a minute', async () => {
    backendAnswers(PRODUCTION_TODAY);
    const res = await GET();
    expect(res.headers.get('cache-control')).toBe('public, s-maxage=60, stale-while-revalidate=60');
  });
});
