import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
const state = vi.hoisted(() => ({
  allowed: true,
  findMany: vi.fn(),
  readOnly: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock('@/lib/internal-auth', () => ({
  requireInternalToken: () => (state.allowed ? null : NextResponse.json({}, { status: 401 })),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: { $transaction: state.transaction },
}));
import { GET } from './route';
beforeEach(() => {
  state.allowed = true;
  state.findMany.mockReset().mockResolvedValue([]);
  state.readOnly.mockReset();
  state.transaction.mockReset().mockImplementation((work) =>
    work({
      $executeRawUnsafe: state.readOnly,
      waitlistUser: { findMany: state.findMany },
    }),
  );
});
it('does not expose a snapshot without internal authentication', async () => {
  state.allowed = false;
  expect(
    (await GET(new NextRequest('http://localhost/api/internal/waitlist/referral-snapshot'))).status,
  ).toBe(401);
  expect(state.transaction).not.toHaveBeenCalled();
});
it('takes a read-only consistent snapshot and excludes unrelated personal data', async () => {
  state.findMany.mockResolvedValue([
    {
      id: 'row',
      oauthProvider: 'google',
      oauthId: 'verified-sub',
      displayName: 'Player',
      oauthAvatarUrl: null,
      customAvatarUrl: null,
      username: null,
      referralCode: 'QR2345',
      usedReferralCode: null,
      referredById: null,
      referralCount: 0,
      reputationPoints: 0,
      status: 'PENDING',
      registeredAt: null,
      createdAt: new Date('2026-09-01'),
      updatedAt: new Date('2026-09-02'),
      email: 'private@example.test',
      ipAddress: '127.0.0.1',
      userAgent: 'private-agent',
    },
  ]);
  const response = await GET(
    new NextRequest('http://localhost/api/internal/waitlist/referral-snapshot'),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(state.readOnly).toHaveBeenCalledWith('SET TRANSACTION READ ONLY');
  expect(state.transaction).toHaveBeenCalledWith(expect.any(Function), {
    isolationLevel: 'RepeatableRead',
    timeout: 15000,
  });
  const body = await response.json();
  expect(body.users[0]).toMatchObject({
    providerSub: 'verified-sub',
    createdAt: '2026-09-01T00:00:00.000Z',
  });
  expect(body.users[0]).not.toHaveProperty('email');
  expect(body.users[0]).not.toHaveProperty('ipAddress');
  expect(body.users[0]).not.toHaveProperty('userAgent');
});
