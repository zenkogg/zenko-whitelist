import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createLoopsClient } from '../client';

const ORIGINAL = { ...process.env };

beforeEach(() => {
  vi.restoreAllMocks();
  delete process.env.LOOPS_API_KEY;
  delete process.env.LOOPS_DRY_RUN;
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('Loops client resilience', () => {
  it('no-ops (disabled) with no API key and never calls fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await createLoopsClient().updateContact({ email: 'a@b.com' });

    expect(res).toEqual({ ok: false, status: 0, disabled: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('dry-run logs instead of sending', async () => {
    process.env.LOOPS_API_KEY = 'key';
    process.env.LOOPS_DRY_RUN = '1';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await createLoopsClient().sendEvent({ email: 'a@b.com', eventName: 'x' });

    expect(res).toEqual({ ok: true, status: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns ok on a 2xx', async () => {
    process.env.LOOPS_API_KEY = 'key';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));

    const res = await createLoopsClient().updateContact({ email: 'a@b.com' });
    expect(res).toEqual({ ok: true, status: 200 });
  });

  it('surfaces a non-2xx as a result, never throwing', async () => {
    process.env.LOOPS_API_KEY = 'key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ message: 'bad email' }),
      })
    );

    const res = await createLoopsClient().updateContact({ email: 'nope' });
    expect(res.ok).toBe(false);
    expect(res.status).toBe(400);
    expect(res.error).toContain('bad email');
  });

  it('retries once on 429 then succeeds', async () => {
    process.env.LOOPS_API_KEY = 'key';
    // Make the backoff instant so the test stays fast/deterministic.
    vi.stubGlobal('setTimeout', ((fn: () => void) => fn()) as unknown as typeof setTimeout);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    const res = await createLoopsClient().sendEvent({ email: 'a@b.com', eventName: 'x' });
    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never throws when fetch rejects (network error)', async () => {
    process.env.LOOPS_API_KEY = 'key';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')));

    const res = await createLoopsClient().updateContact({ email: 'a@b.com' });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('ECONNRESET');
  });
});
