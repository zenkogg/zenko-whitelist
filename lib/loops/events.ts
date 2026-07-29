/**
 * Loops event names and helpers (pure — no I/O, unit-tested).
 *
 * Event ownership is split across two writers (see docs / the Loops plan): the
 * waitlist app owns the `waitlist_*` events, the zenko-mono backend owns the
 * `zenko_*` ones. REGISTERED is deliberately NOT an event here — the backend
 * owns `zenko_registered`, so a status transition into REGISTERED yields no
 * waitlist-side event (only a `waitlistStatus` property update).
 */

import type { WaitlistStatus } from '@prisma/client';

export const LOOPS_EVENTS = {
  WAITLIST_JOINED: 'waitlist_joined',
  WAITLIST_REFERRAL_APPLIED: 'waitlist_referral_applied',
  WAITLIST_REFERRAL_EARNED: 'waitlist_referral_earned',
  WAITLIST_APPROVED: 'waitlist_approved',
  WAITLIST_INVITED: 'waitlist_invited',
} as const;

export type LoopsEventName = (typeof LOOPS_EVENTS)[keyof typeof LOOPS_EVENTS];

/**
 * The event (if any) a waitlist status transition should fire.
 *
 * Only forward moves into APPROVED / INVITED produce an event; a no-op
 * transition (prev === next) or a move into PENDING / REGISTERED returns null.
 * REGISTERED is intentionally silent here: the backend fires `zenko_registered`
 * at Zenko signup, so firing a waitlist-side event too would double-trigger any
 * loop keyed on "registered".
 */
export function statusEventFor(
  prev: WaitlistStatus | null | undefined,
  next: WaitlistStatus
): LoopsEventName | null {
  if (prev === next) return null;
  switch (next) {
    case 'APPROVED':
      return LOOPS_EVENTS.WAITLIST_APPROVED;
    case 'INVITED':
      return LOOPS_EVENTS.WAITLIST_INVITED;
    default:
      return null;
  }
}

/** Loops caps the Idempotency-Key header at 100 chars (24h dedup window). */
export const IDEMPOTENCY_KEY_MAX = 100;

/**
 * Build an Idempotency-Key from an event name and the id(s) that make the
 * event unique. `waitlist_joined:<userId>` for once-per-row events;
 * `waitlist_referral_earned:<referrerId>:<referredId>` for the one event that
 * legitimately recurs for a single contact. Truncated to the 100-char cap.
 */
export function idempotencyKey(eventName: string, ...ids: string[]): string {
  return [eventName, ...ids].join(':').slice(0, IDEMPOTENCY_KEY_MAX);
}
