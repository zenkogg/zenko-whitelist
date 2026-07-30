/**
 * Push a WaitlistUser to Loops (the runtime, real-time path).
 *
 * Call this fire-and-forget from route handlers via `after()` — it must never
 * be awaited in a way that blocks the response, and it never throws. It:
 *   1. re-reads the row (never trusts a passed-in copy — a concurrent handler
 *      may have written newer props),
 *   2. upserts the Loops contact (`waitlist*` namespace only),
 *   3. optionally sends one event (caller-supplied — see below),
 *   4. stamps `loopsSyncedAt` / clears `loopsSyncError` on success, or records
 *      the failure in `loopsSyncError` (the SQL->CSV heal work-list) on failure.
 *
 * The `event` is caller-supplied, NOT derived here: the re-read sees only the
 * post-update row, so a status transition (old -> new) must be computed by the
 * caller that still holds the old value (the admin PATCH). See events.ts
 * `statusEventFor`.
 *
 * A row with no email is skipped (not an error): Loops contacts are email-keyed.
 */

import { prisma } from '@/lib/prisma';
import { loops as defaultClient, loopsEnvironment, type LoopsClient } from './client';
import { toLoopsContact } from './contact';
import { idempotencyKey } from './events';

type PropertyValue = string | number | boolean | null;

export interface SyncOptions {
  /** A Loops event to fire alongside the contact upsert. */
  event?: string;
  eventProperties?: Record<string, PropertyValue>;
  /**
   * List membership. Attach ONLY on the one-time `waitlist_joined` event — never
   * on a steady-state sync — so a repeat can't re-subscribe someone who left.
   */
  mailingLists?: Record<string, boolean>;
  /** Overrides the default `<event>:<userId>` idempotency key. */
  idempotencyKey?: string;
}

export interface SyncDeps {
  client?: LoopsClient;
}

export type SyncOutcome =
  | { outcome: 'synced' }
  | { outcome: 'skipped'; reason: 'no-email' | 'not-found' | 'disabled' }
  | { outcome: 'failed'; error: string };

export async function syncWaitlistUser(
  id: string,
  options: SyncOptions = {},
  deps: SyncDeps = {}
): Promise<SyncOutcome> {
  const client = deps.client ?? defaultClient;

  try {
    const row = await prisma.waitlistUser.findUnique({ where: { id } });
    if (!row) return { outcome: 'skipped', reason: 'not-found' };

    const contact = toLoopsContact(row);
    if (!contact) return { outcome: 'skipped', reason: 'no-email' };

    const contactResult = await client.updateContact({
      ...contact,
      environment: loopsEnvironment(),
    });
    if (contactResult.disabled) return { outcome: 'skipped', reason: 'disabled' };

    let error: string | undefined = contactResult.ok ? undefined : contactResult.error;

    if (options.event && contactResult.ok) {
      const key = options.idempotencyKey ?? idempotencyKey(options.event, id);
      const eventResult = await client.sendEvent(
        {
          email: contact.email,
          eventName: options.event,
          eventProperties: options.eventProperties,
          mailingLists: options.mailingLists,
        },
        key
      );
      if (!eventResult.ok && !eventResult.disabled) {
        error = eventResult.error ?? 'event send failed';
      }
    }

    if (error) {
      await stamp(id, { loopsSyncError: error });
      return { outcome: 'failed', error };
    }

    await stamp(id, { loopsSyncedAt: new Date(), loopsSyncError: null });
    return { outcome: 'synced' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await stamp(id, { loopsSyncError: message }).catch(() => {});
    return { outcome: 'failed', error: message };
  }
}

async function stamp(
  id: string,
  data: { loopsSyncedAt?: Date; loopsSyncError?: string | null }
): Promise<void> {
  await prisma.waitlistUser.update({ where: { id }, data });
}
