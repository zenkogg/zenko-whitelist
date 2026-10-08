/**
 * The waitlist shows its "Zenko is open" copy only when the main backend says
 * the sign-in gate is off. Absent, unread, slow and malformed all keep today's
 * waitlist copy, because telling someone Zenko is open while sign-in still
 * refuses them is the one wrong state.
 */

import { describe, expect, it, vi } from 'vitest';

import { readZenkoOpen, zenkoOpenFrom } from '@/lib/zenko-open';

/* GET https://api-prod.zenko.gg/api/config/games as production served it before
   the backend learned to say whether sign-in is gated: no closedBeta key. The
   games list is cut to one entry; nothing reads it. */
const PRODUCTION_TODAY = {
  games: [{ id: 'lol', name: 'League of Legends' }],
  version: 1,
  wagerLimits: { maxConcurrentWagers: 10 },
  platformConfig: {
    cancelWindowMs: 180000,
    challengeDisputeWindowMs: 14400000,
    tournamentDisputeWindowMs: 43200000,
    minChallengeCredits: 100,
    minRedemptionUsdsui: 20000000,
    tournamentFeeBps: 500,
    tournamentMaxWinners: 25,
    tournamentMaxParticipants: 50,
    tournamentPlacementBps: {
      placement1: 4000,
      placement2: 2500,
      placement3: 1000,
      placement4Plus: 100,
    },
    repDisputeOpen: 50,
    composedMoneyEnabled: false,
    composedEntryCap: 500,
  },
};

const GATE_OFF = { games: [], platformConfig: { closedBeta: false } };
const GATE_ON = { games: [], platformConfig: { closedBeta: true } };

function answering(body: unknown, status = 200) {
  return vi.fn(
    async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status })
  );
}

describe('zenkoOpenFrom', () => {
  it('keeps the waitlist copy for the production response that predates the flag', () => {
    expect(zenkoOpenFrom(PRODUCTION_TODAY)).toBe(false);
  });

  it('keeps the waitlist copy when there is no payload or no platformConfig', () => {
    expect(zenkoOpenFrom(undefined)).toBe(false);
    expect(zenkoOpenFrom(null)).toBe(false);
    expect(zenkoOpenFrom({ games: [] })).toBe(false);
    expect(zenkoOpenFrom({ platformConfig: null })).toBe(false);
  });

  it('keeps the waitlist copy while the gate is on', () => {
    expect(zenkoOpenFrom(GATE_ON)).toBe(false);
  });

  it('reads anything but an explicit false as closed', () => {
    for (const value of [null, undefined, 'false', 0, '', {}]) {
      expect(zenkoOpenFrom({ platformConfig: { closedBeta: value } })).toBe(false);
    }
  });

  it('opens only when the backend says the gate is off', () => {
    expect(zenkoOpenFrom(GATE_OFF)).toBe(true);
  });
});

describe('readZenkoOpen', () => {
  it('asks the production public config by default', async () => {
    const fetchImpl = answering(PRODUCTION_TODAY);
    await readZenkoOpen({ fetchImpl, env: {} });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api-prod.zenko.gg/api/config/games');
  });

  it('asks the API named by ZENKO_API_URL when it is set', async () => {
    const fetchImpl = answering(GATE_ON);
    await readZenkoOpen({ fetchImpl, env: { ZENKO_API_URL: 'http://localhost:3001/' } });
    expect(fetchImpl.mock.calls[0][0]).toBe('http://localhost:3001/api/config/games');
  });

  it('keeps the waitlist copy for the production response that predates the flag', async () => {
    await expect(readZenkoOpen({ fetchImpl: answering(PRODUCTION_TODAY), env: {} })).resolves.toBe(
      false
    );
  });

  it('opens when the backend answers with the gate off', async () => {
    await expect(readZenkoOpen({ fetchImpl: answering(GATE_OFF), env: {} })).resolves.toBe(true);
  });

  it('keeps the waitlist copy when the backend answers with the gate on', async () => {
    await expect(readZenkoOpen({ fetchImpl: answering(GATE_ON), env: {} })).resolves.toBe(false);
  });

  it('keeps the waitlist copy when the read fails outright', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit): Promise<Response> => {
      throw new TypeError('fetch failed');
    });
    await expect(readZenkoOpen({ fetchImpl, env: {} })).resolves.toBe(false);
  });

  it('keeps the waitlist copy on an error status, whatever the body says', async () => {
    await expect(readZenkoOpen({ fetchImpl: answering(GATE_OFF, 503), env: {} })).resolves.toBe(
      false
    );
  });

  it('keeps the waitlist copy when the body is not JSON', async () => {
    const fetchImpl = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response('<html>bad gateway</html>', { status: 200 })
    );
    await expect(readZenkoOpen({ fetchImpl, env: {} })).resolves.toBe(false);
  });

  it('gives up after the timeout and keeps the waitlist copy', async () => {
    // Answers the gate-off payload, but only long after the reader stopped waiting.
    const fetchImpl = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((resolve, reject) => {
          const late = setTimeout(() => resolve(new Response(JSON.stringify(GATE_OFF))), 5000);
          init?.signal?.addEventListener('abort', () => {
            clearTimeout(late);
            reject(init.signal?.reason);
          });
        })
    );
    const started = Date.now();
    await expect(readZenkoOpen({ fetchImpl, env: {}, timeoutMs: 50 })).resolves.toBe(false);
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('caches the read for a minute and bounds it with a signal', async () => {
    const fetchImpl = answering(GATE_ON);
    await readZenkoOpen({ fetchImpl, env: {} });
    const init = fetchImpl.mock.calls[0][1] as RequestInit & { next?: { revalidate?: number } };
    expect(init.next?.revalidate).toBe(60);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});
