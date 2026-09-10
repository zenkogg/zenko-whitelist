import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  OWNER_ID,
  STRANGER_ID,
  TEST_SESSION_SECRET,
  forgedSession,
  requestAs,
  requestWithSession,
} from '@/lib/__tests__/session-fixtures';

const db = vi.hoisted(() => ({ findUnique: vi.fn(), update: vi.fn(), transaction: vi.fn() }));
const referral = vi.hoisted(() => ({ resolve: vi.fn() }));

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server');
  return { ...actual, after: () => undefined };
});
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: db.transaction,
    waitlistUser: { findUnique: db.findUnique, update: db.update },
  },
}));
vi.mock('@/lib/username', () => ({ resolveReferralIdentifier: referral.resolve }));
vi.mock('@/lib/loops/sync', () => ({ syncWaitlistUser: vi.fn() }));

import { POST } from './route';

const URL = 'http://localhost/api/user/referral';
const REFERRER_ID = 'referrer-row-3';

beforeEach(() => {
  process.env.WAITLIST_SESSION_SECRET = TEST_SESSION_SECRET;
  referral.resolve.mockReset().mockResolvedValue({
    id: REFERRER_ID,
    referralCode: 'XYZ789',
    referralCount: 0,
    displayName: 'Referrer',
  });
  db.findUnique.mockReset().mockResolvedValue({
    id: OWNER_ID,
    usedReferralCode: null,
    reputationPoints: 0,
  });
  db.update.mockReset().mockImplementation(async ({ where }) => ({
    id: where.id,
    usedReferralCode: 'XYZ789',
    reputationPoints: 10,
    referralCount: 1,
    displayName: where.id === REFERRER_ID ? 'Referrer' : 'Player One',
  }));
  // The route's transaction body takes a client with the same shape.
  db.transaction.mockReset().mockImplementation(async (fn) =>
    fn({ waitlistUser: { findUnique: db.findUnique, update: db.update } })
  );
});

/** The row the transaction applied the code to, which is the one being credited. */
function creditedRowId() {
  return db.update.mock.calls[0][0].where.id;
}

describe('applying a referral code', () => {
  it('refuses a caller with no session', async () => {
    const response = await POST(requestWithSession(URL, null, { body: { referralCode: 'XYZ789' } }));

    expect(response.status).toBe(401);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('refuses to credit a row named only in the body', async () => {
    const response = await POST(
      requestWithSession(URL, null, { body: { referralCode: 'XYZ789', userId: STRANGER_ID } })
    );

    expect(response.status).toBe(401);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('refuses a session signed by a key this deployment does not hold', async () => {
    const response = await POST(
      requestWithSession(URL, await forgedSession(STRANGER_ID), {
        body: { referralCode: 'XYZ789' },
      })
    );

    expect(response.status).toBe(401);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('credits the signed-in row even when the body names another', async () => {
    const response = await POST(
      await requestAs(URL, OWNER_ID, { body: { referralCode: 'XYZ789', userId: STRANGER_ID } })
    );

    expect(response.status).toBe(200);
    expect(creditedRowId()).toBe(OWNER_ID);
  });

  it('applies the code to the signed-in row and credits the referrer', async () => {
    const response = await POST(await requestAs(URL, OWNER_ID, { body: { referralCode: 'XYZ789' } }));

    expect(response.status).toBe(200);
    expect(db.update.mock.calls[0][0].data.usedReferralCode).toBe('XYZ789');
    expect(db.update.mock.calls[1][0].where.id).toBe(REFERRER_ID);
  });

  it('still refuses a code that resolves to nobody', async () => {
    referral.resolve.mockResolvedValueOnce(null);

    const response = await POST(await requestAs(URL, OWNER_ID, { body: { referralCode: 'NOPE00' } }));

    expect(response.status).toBe(404);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('still refuses a caller using their own code', async () => {
    referral.resolve.mockResolvedValueOnce({
      id: OWNER_ID,
      referralCode: 'ABC123',
      referralCount: 0,
    });

    const response = await POST(await requestAs(URL, OWNER_ID, { body: { referralCode: 'ABC123' } }));

    expect(response.status).toBe(400);
  });

  it('still refuses a caller who already used a code', async () => {
    db.findUnique.mockResolvedValueOnce({ id: OWNER_ID, usedReferralCode: 'OLD123' });

    const response = await POST(await requestAs(URL, OWNER_ID, { body: { referralCode: 'XYZ789' } }));

    expect(response.status).toBe(409);
  });
});
