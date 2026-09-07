import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock('@/lib/prisma', () => ({
  prisma: { waitlistUser: { findUnique: state.findUnique } },
}));
vi.mock('@/lib/internal-auth', () => ({ requireInternalToken: () => null }));

import { POST } from './route';

beforeEach(() => state.findUnique.mockReset());

describe('internal waitlist lookup referral history', () => {
  it('returns the denormalized waitlist referral count to the Zenko backend', async () => {
    state.findUnique.mockResolvedValue({
      id: 'waitlist-1',
      status: 'PENDING',
      email: 'player@example.com',
      displayName: 'Player',
      referralCode: 'ABC123',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      reputationPoints: 30,
      referralCount: 3,
    });
    const request = new NextRequest('http://localhost/api/internal/waitlist/lookup', {
      method: 'POST',
      body: JSON.stringify({ provider: 'google', oauthId: 'oauth-1' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      match: { id: 'waitlist-1', reputationPoints: 30, referralCount: 3 },
    });
  });
});
