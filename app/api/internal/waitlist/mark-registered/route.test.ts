import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';

const state = vi.hoisted(() => ({
  updateMany: vi.fn(),
  findUniqueOrThrow: vi.fn(),
}));
vi.mock('next/server', async () => ({
  ...(await vi.importActual<typeof import('next/server')>('next/server')),
  after: vi.fn(),
}));
vi.mock('@/lib/internal-auth', () => ({ requireInternalToken: () => null }));
vi.mock('@/lib/loops/sync', () => ({ syncWaitlistUser: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: (work: (tx: unknown) => Promise<unknown>) => work({ waitlistUser: state }),
  },
}));
import { POST } from './route';

function request(registeredAt = '2026-10-12T00:00:00.000Z') {
  return new NextRequest('http://localhost/api/internal/waitlist/mark-registered', {
    method: 'POST',
    body: JSON.stringify({ waitlistUserId: 'owner', registeredAt }),
  });
}
beforeEach(() => {
  state.updateMany.mockReset().mockResolvedValue({ count: 0 });
  state.findUniqueOrThrow.mockReset().mockResolvedValue({ id: 'owner' });
});
it('only stamps the first registration, including repeated calls with different dates', async () => {
  let row = { status: 'APPROVED', registeredAt: null as Date | null };
  state.updateMany.mockImplementation(async ({ where, data }) => {
    if (row.status === where.status.not) return { count: 0 };
    row = data;
    return { count: 1 };
  });
  expect((await POST(request('2026-09-01T00:00:00.000Z'))).status).toBe(200);
  expect((await POST(request())).status).toBe(200);
  expect(row.registeredAt).toEqual(new Date('2026-09-01T00:00:00.000Z'));
});
it('continues to distinguish an unknown user from an already registered user', async () => {
  state.findUniqueOrThrow.mockRejectedValue(
    new Prisma.PrismaClientKnownRequestError('missing', {
      code: 'P2025',
      clientVersion: 'test',
    }),
  );
  expect((await POST(request())).status).toBe(404);
});
it('rejects invalid timestamps without writing', async () => {
  expect((await POST(request('invalid'))).status).toBe(400);
  expect(state.updateMany).not.toHaveBeenCalled();
});
