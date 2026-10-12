import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
vi.mock('next/server', async () => ({
  ...(await vi.importActual<typeof import('next/server')>('next/server')),
  after: vi.fn(),
}));
vi.mock('@/lib/loops/sync', () => ({ syncWaitlistUser: vi.fn() }));

const state = vi.hoisted(() => ({
  allowed: true,
  findMany: vi.fn(),
  updateMany: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  create: vi.fn(),
}));
vi.mock('@/lib/internal-auth', () => ({
  requireInternalToken: () =>
    state.allowed ? null : NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: async (work: (tx: unknown) => Promise<unknown>) => work({ waitlistUser: state }),
  },
}));
import { POST } from './route';

const profile = {
  id: 'verified-owner',
  oauthProvider: 'google',
  oauthId: 'verified-sub',
  displayName: 'Inviter',
  oauthAvatarUrl: null,
  customAvatarUrl: null,
  username: null,
  referralCode: 'QR2345',
  usedReferralCode: null,
  referredById: null,
  referralCount: 0,
  reputationPoints: 0,
  status: 'REGISTERED',
  registeredAt: new Date('2026-09-01'),
  createdAt: new Date('2026-09-01'),
  updatedAt: new Date('2026-09-01'),
};
const input = {
  identities: [{ provider: 'google', providerSub: 'verified-sub' }],
  referralCode: 'QT2345',
  displayName: 'Inviter',
  avatarUrl: null,
};
function request(body: unknown = input) {
  return new NextRequest('http://localhost/api/internal/waitlist/ensure-referral-owner', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  state.allowed = true;
  state.findMany.mockReset().mockResolvedValue([{ id: profile.id }]);
  state.findUniqueOrThrow.mockReset().mockResolvedValue(profile);
  state.updateMany.mockReset().mockResolvedValue({ count: 0 });
  state.create.mockReset().mockResolvedValue({ ...profile, referralCode: input.referralCode });
});
describe('preparing a verified Zenko inviter on the waitlist', () => {
  it('requires the internal caller before looking up identities', async () => {
    state.allowed = false;
    expect((await POST(request())).status).toBe(401);
    expect(state.findMany).not.toHaveBeenCalled();
  });
  it('keeps the existing code and original registration time', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      profile: {
        referralCode: profile.referralCode,
        registeredAt: '2026-09-01T00:00:00.000Z',
      },
    });
    expect(state.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: profile.id, status: { not: 'REGISTERED' } },
      }),
    );
    expect(state.create).not.toHaveBeenCalled();
  });
  it('creates an already-registered inviter with the native code, not another referral or bonus', async () => {
    state.findMany.mockResolvedValue([]);
    expect((await POST(request())).status).toBe(200);
    expect(state.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          oauthProvider: 'google',
          oauthId: 'verified-sub',
          referralCode: input.referralCode,
          displayName: input.displayName,
          oauthAvatarUrl: null,
          games: [],
          status: 'REGISTERED',
          registeredAt: expect.any(Date),
        },
      }),
    );
  });
  it('refuses two matching profiles instead of merging identities', async () => {
    state.findMany.mockResolvedValue([{ id: 'first' }, { id: 'second' }]);
    expect((await POST(request())).status).toBe(409);
    expect(state.create).not.toHaveBeenCalled();
    expect(state.updateMany).not.toHaveBeenCalled();
  });
  it('recovers a concurrent creation by reading the verified identity again', async () => {
    state.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: profile.id }]);
    state.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    expect((await POST(request())).status).toBe(200);
    expect(state.findMany).toHaveBeenCalledTimes(2);
  });
  it('does not take a code belonging to another identity', async () => {
    state.findMany.mockResolvedValue([]);
    state.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    expect((await POST(request())).status).toBe(409);
  });
  it.each([
    null,
    {},
    { ...input, identities: [] },
    { ...input, referralCode: 'bad' },
    { ...input, avatarUrl: 'javascript:alert(1)' },
  ])('rejects invalid owner input %#', async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(state.findMany).not.toHaveBeenCalled();
  });
});
