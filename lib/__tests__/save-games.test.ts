import { describe, expect, it, vi } from 'vitest';
import { SAVE_GAMES_FAILED, saveGames } from '@/lib/save-games';
import { WAITLIST_CLOSED_MESSAGE, waitlistClosedResponse } from '@/lib/waitlist-status';

// The refusal comes from the producer every closed write route returns, so the
// step is pinned to what the server really sends rather than to a copy of it.

function answer(body: unknown, status = 200) {
  return vi.fn(async () =>
    new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

describe('saving game picks', () => {
  it('posts the picks and hands back the games the server saved', async () => {
    const send = answer({ success: true, data: { id: 'row-1', games: ['lol', 'tft'] } });

    const result = await saveGames(['lol', 'tft'], send);

    expect(result).toEqual({ ok: true, games: ['lol', 'tft'] });
    expect(send).toHaveBeenCalledWith(
      '/api/user/games',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ games: ['lol', 'tft'] }) })
    );
  });

  it('shows a closed waitlist its own message, not a retry line', async () => {
    const result = await saveGames(['lol'], async () => waitlistClosedResponse());

    expect(result).toEqual({ ok: false, message: WAITLIST_CLOSED_MESSAGE });
  });

  it('falls back to the retry line when a refusal carries no message', async () => {
    const result = await saveGames(['lol'], answer('<html>Bad gateway</html>', 502));

    expect(result).toEqual({ ok: false, message: SAVE_GAMES_FAILED });
  });

  it('falls back to the retry line when the request never lands', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await saveGames(['lol'], async () => {
      throw new TypeError('Failed to fetch');
    });

    expect(result).toEqual({ ok: false, message: SAVE_GAMES_FAILED });
  });
});
