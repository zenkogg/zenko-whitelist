import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { LoopsClient, LoopsResult } from '../client';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    waitlistUser: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { syncWaitlistUser } from '../sync';

const findUnique = prisma.waitlistUser.findUnique as unknown as ReturnType<typeof vi.fn>;
const update = prisma.waitlistUser.update as unknown as ReturnType<typeof vi.fn>;

const OK: LoopsResult = { ok: true, status: 200 };

function fakeClient(over: Partial<LoopsClient> = {}): LoopsClient {
  return {
    updateContact: vi.fn().mockResolvedValue(OK),
    sendEvent: vi.fn().mockResolvedValue(OK),
    deleteContact: vi.fn().mockResolvedValue(OK),
    ...over,
  };
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'a@b.com',
    status: 'PENDING',
    oauthProvider: 'google',
    displayName: 'A',
    referralCode: 'ABC123',
    username: 'a',
    twitterHandle: null,
    games: [],
    referralCount: 0,
    reputationPoints: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    invitedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  findUnique.mockReset();
  update.mockReset().mockResolvedValue({});
});

describe('syncWaitlistUser', () => {
  it('skips a row with no email and never touches Loops', async () => {
    findUnique.mockResolvedValue(row({ email: null }));
    const client = fakeClient();

    const res = await syncWaitlistUser('user-1', {}, { client });

    expect(res).toEqual({ outcome: 'skipped', reason: 'no-email' });
    expect(client.updateContact).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('upserts the contact, fires the event with a default idempotency key, and stamps success', async () => {
    findUnique.mockResolvedValue(row());
    const client = fakeClient();

    const res = await syncWaitlistUser('user-1', { event: 'waitlist_invited' }, { client });

    expect(res).toEqual({ outcome: 'synced' });
    expect(client.updateContact).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@b.com', waitlistStatus: 'PENDING' })
    );
    expect(client.sendEvent).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@b.com', eventName: 'waitlist_invited' }),
      'waitlist_invited:user-1'
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({ loopsSyncError: null }),
      })
    );
    expect(update.mock.calls[0][0].data.loopsSyncedAt).toBeInstanceOf(Date);
  });

  it('records the error and does not fire the event when the contact upsert fails', async () => {
    findUnique.mockResolvedValue(row());
    const client = fakeClient({
      updateContact: vi.fn().mockResolvedValue({ ok: false, status: 500, error: 'HTTP 500' }),
    });

    const res = await syncWaitlistUser('user-1', { event: 'waitlist_invited' }, { client });

    expect(res).toEqual({ outcome: 'failed', error: 'HTTP 500' });
    expect(client.sendEvent).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { loopsSyncError: 'HTTP 500' } })
    );
  });

  it('honours a caller-supplied idempotency key (referral-earned)', async () => {
    findUnique.mockResolvedValue(row());
    const client = fakeClient();

    await syncWaitlistUser(
      'ref-1',
      { event: 'waitlist_referral_earned', idempotencyKey: 'waitlist_referral_earned:ref-1:ref-2' },
      { client }
    );

    expect(client.sendEvent).toHaveBeenCalledWith(
      expect.anything(),
      'waitlist_referral_earned:ref-1:ref-2'
    );
  });

  it('reports disabled (no key) as a skip, not a failure', async () => {
    findUnique.mockResolvedValue(row());
    const client = fakeClient({
      updateContact: vi.fn().mockResolvedValue({ ok: false, status: 0, disabled: true }),
    });

    const res = await syncWaitlistUser('user-1', {}, { client });
    expect(res).toEqual({ outcome: 'skipped', reason: 'disabled' });
    expect(update).not.toHaveBeenCalled();
  });
});
