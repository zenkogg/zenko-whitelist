/**
 * Map a WaitlistUser row to its Loops contact payload (pure — unit-tested).
 *
 * Two load-bearing rules, both enforced here:
 *
 * 1. DISJOINT NAMESPACE. This writer only ever sets `waitlist*` keys. The
 *    zenko-mono backend writes the `zenko*` family onto the SAME email-keyed
 *    contact. `PUT /v1/contacts/update` only touches keys present in the body,
 *    so as long as neither side strays into the other's namespace, concurrent
 *    writes never clobber each other. Do not add `zenko*` keys here.
 *
 * 2. NO `subscribed` / `mailingLists` ON A PROPERTY SYNC. `update` upserts with
 *    `subscribed: true` by default, so we never need to send it — and sending it
 *    could resurrect someone who unsubscribed. List membership rides only the
 *    one-time `waitlist_joined` event (see sync.ts), never a steady-state sync.
 *
 * Returns `null` when the row has no email: Loops contacts are email-keyed and
 * an emailless row (a Twitch/VL user who withheld their email) cannot be one.
 */

import type { WaitlistUser } from '@prisma/client';
import { LOOPS_VALUE_MAX } from './client';

/** The subset of a WaitlistUser this mapper reads. */
export type WaitlistContactInput = Pick<
  WaitlistUser,
  | 'id'
  | 'email'
  | 'status'
  | 'oauthProvider'
  | 'displayName'
  | 'referralCode'
  | 'username'
  | 'twitterHandle'
  | 'games'
  | 'referralCount'
  | 'reputationPoints'
  | 'createdAt'
  | 'invitedAt'
>;

/** Loops rejects any value longer than 500 chars, so every string is capped. */
function cap(value: string): string {
  return value.length > LOOPS_VALUE_MAX ? value.slice(0, LOOPS_VALUE_MAX) : value;
}

export interface LoopsWaitlistContact {
  email: string;
  /** Greeting name for templates; sourced from displayName. */
  firstName?: string;
  waitlistUserId: string;
  waitlistStatus: string;
  waitlistProvider: string;
  waitlistReferralCode?: string;
  waitlistUsername?: string;
  waitlistTwitterHandle?: string;
  waitlistGames?: string;
  waitlistReferralCount: number;
  waitlistXp: number;
  waitlistJoinedAt: string;
  waitlistInvitedAt?: string;
}

export function toLoopsContact(row: WaitlistContactInput): LoopsWaitlistContact | null {
  if (!row.email) return null;

  const contact: LoopsWaitlistContact = {
    email: row.email.toLowerCase(),
    waitlistUserId: row.id,
    waitlistStatus: row.status,
    waitlistProvider: row.oauthProvider,
    waitlistReferralCount: row.referralCount,
    waitlistXp: row.reputationPoints,
    waitlistJoinedAt: row.createdAt.toISOString(),
  };

  if (row.displayName) contact.firstName = cap(row.displayName);
  if (row.referralCode) contact.waitlistReferralCode = row.referralCode;
  if (row.username) contact.waitlistUsername = row.username;
  if (row.twitterHandle) contact.waitlistTwitterHandle = cap(row.twitterHandle);
  if (row.games.length > 0) contact.waitlistGames = cap(row.games.join(','));
  if (row.invitedAt) contact.waitlistInvitedAt = row.invitedAt.toISOString();

  return contact;
}
