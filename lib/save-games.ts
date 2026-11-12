/**
 * Saves a signed-in player's game picks from the onboarding step, and turns any
 * refusal into the line the player sees. Never throws, so the step can always
 * show something.
 */

export const SAVE_GAMES_FAILED = 'Failed to save game selection. Please try again.';

export type SaveGamesResult = { ok: true; games: string[] } | { ok: false; message: string };

export async function saveGames(
  games: string[],
  send: typeof fetch = fetch
): Promise<SaveGamesResult> {
  try {
    const response = await send('/api/user/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ games }),
    });
    if (!response.ok) return { ok: false, message: await refusalMessage(response) };
    const { data } = await response.json();
    return { ok: true, games: data.games };
  } catch (error) {
    console.error('Save error:', error);
    return { ok: false, message: SAVE_GAMES_FAILED };
  }
}

/**
 * The server's own `message`, as the referral, username and avatar paths read
 * it: a closed waitlist answers every save with one, and a retry line would
 * leave the player trying forever.
 */
async function refusalMessage(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  const message =
    typeof body === 'object' && body !== null ? (body as { message?: unknown }).message : undefined;
  return typeof message === 'string' && message.trim() ? message : SAVE_GAMES_FAILED;
}
