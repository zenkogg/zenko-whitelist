/**
 * `WAITLIST_STATUS=closed` freezes the waitlist for its sunset: the final
 * referral snapshot taken after it must equal the database, so nothing a player
 * does may change a row any more. Sign-ups, code use and profile edits are
 * refused; a returning player can still sign in and see their dashboard.
 *
 * The internal routes the Zenko backend calls stay open on purpose. A player
 * who joins Zenko before the archive switch is still linked through them, and
 * the backend stops calling them itself once its archive lookup is on.
 */

import { NextResponse } from 'next/server';

type Env = Record<string, string | undefined>;

export type WaitlistStatus = 'open' | 'closed';

export const WAITLIST_CLOSED_MESSAGE = 'The waitlist is closed. Sign up at zenko.gg.';

export function waitlistStatus(env: Env = process.env): WaitlistStatus {
  return env.WAITLIST_STATUS === 'closed' ? 'closed' : 'open';
}

export function isWaitlistClosed(env: Env = process.env): boolean {
  return waitlistStatus(env) === 'closed';
}

/** The refusal a signed-in player's write gets once the waitlist is closed. */
export function waitlistClosedResponse() {
  return NextResponse.json(
    { error: 'Conflict', message: WAITLIST_CLOSED_MESSAGE },
    { status: 409 }
  );
}
