import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  ADMIN_EMAIL,
  OUTSIDER_EMAIL,
  TEST_CLIENT_ID,
  forgedAdminToken,
  signIdToken,
} from '@/lib/__tests__/google-id-token-fixtures';

// A locally generated key pair stands in for Google's published JWKS, so every
// case below verifies a real RS256 signature and no case reaches the network.
const keys = vi.hoisted(() => ({
  publicKey: null as CryptoKey | null,
  privateKey: null as CryptoKey | null,
  foreignPrivateKey: null as CryptoKey | null,
}));

const db = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock('jose', async () => {
  const actual = await vi.importActual<typeof import('jose')>('jose');
  const google = await actual.generateKeyPair('RS256');
  const foreign = await actual.generateKeyPair('RS256');
  keys.publicKey = google.publicKey;
  keys.privateKey = google.privateKey;
  keys.foreignPrivateKey = foreign.privateKey;
  return { ...actual, createRemoteJWKSet: () => async () => keys.publicKey };
});

// `after` needs a request scope it has no way to get here, and the Loops sync it
// schedules is not what these cases are about.
vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server');
  return { ...actual, after: () => undefined };
});

vi.mock('@/lib/prisma', () => ({
  prisma: {
    waitlistUser: { findMany: db.findMany, findUnique: db.findUnique, update: db.update },
  },
}));
vi.mock('@/lib/loops/sync', () => ({ syncWaitlistUser: vi.fn() }));

import { GET, PATCH } from './route';

function listRequest(token: string | null) {
  return new NextRequest('http://localhost/api/admin/users', {
    method: 'GET',
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

function patchRequest(token: string) {
  return new NextRequest('http://localhost/api/admin/users', {
    method: 'PATCH',
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({ userId: 'waitlist-1', status: 'APPROVED' }),
  });
}

beforeEach(() => {
  process.env.ADMIN_EMAILS = `${ADMIN_EMAIL}, second@zenko.gg`;
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = TEST_CLIENT_ID;
  db.findMany.mockReset().mockResolvedValue([]);
  db.findUnique.mockReset().mockResolvedValue({ status: 'PENDING' });
  db.update.mockReset().mockResolvedValue({ id: 'waitlist-1', status: 'APPROVED' });
});

describe('admin waitlist reads', () => {
  it('refuses an unsigned token that claims an authorized address', async () => {
    const response = await GET(listRequest(forgedAdminToken()));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid token' });
    expect(db.findMany).not.toHaveBeenCalled();
  });

  it('refuses a token signed by a key the issuer does not publish', async () => {
    const idToken = await signIdToken(keys.foreignPrivateKey!);

    const response = await GET(listRequest(idToken));

    expect(response.status).toBe(401);
    expect(db.findMany).not.toHaveBeenCalled();
  });

  it('refuses an expired token', async () => {
    const idToken = await signIdToken(keys.privateKey!, { expirationTime: '-1h' });

    const response = await GET(listRequest(idToken));

    expect(response.status).toBe(401);
    expect(db.findMany).not.toHaveBeenCalled();
  });

  it('refuses a token minted for another application', async () => {
    const idToken = await signIdToken(keys.privateKey!, {
      audience: 'someone-elses-client.apps.googleusercontent.com',
    });

    const response = await GET(listRequest(idToken));

    expect(response.status).toBe(401);
    expect(db.findMany).not.toHaveBeenCalled();
  });

  it('refuses a token from another issuer', async () => {
    const idToken = await signIdToken(keys.privateKey!, {
      issuer: 'https://id.twitch.tv/oauth2',
    });

    const response = await GET(listRequest(idToken));

    expect(response.status).toBe(401);
    expect(db.findMany).not.toHaveBeenCalled();
  });

  it('rejects a request with no bearer', async () => {
    const response = await GET(listRequest(null));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('refuses a validly signed token whose address is not authorized', async () => {
    const idToken = await signIdToken(keys.privateKey!, { email: OUTSIDER_EMAIL });

    const response = await GET(listRequest(idToken));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Access denied' });
    expect(db.findMany).not.toHaveBeenCalled();
  });

  it('serves the waitlist to a validly signed authorized address', async () => {
    db.findMany.mockResolvedValue([{ id: 'waitlist-1', email: 'player@example.com' }]);
    const idToken = await signIdToken(keys.privateKey!);

    const response = await GET(listRequest(idToken));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      users: [{ id: 'waitlist-1', email: 'player@example.com' }],
    });
  });
});

describe('admin waitlist mutations', () => {
  it('refuses an unsigned token that claims an authorized address', async () => {
    const response = await PATCH(patchRequest(forgedAdminToken()));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid token' });
    expect(db.update).not.toHaveBeenCalled();
  });

  it('refuses a validly signed token whose address is not authorized', async () => {
    const idToken = await signIdToken(keys.privateKey!, { email: OUTSIDER_EMAIL });

    const response = await PATCH(patchRequest(idToken));

    expect(response.status).toBe(403);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('applies a status change for a validly signed authorized address', async () => {
    const idToken = await signIdToken(keys.privateKey!);

    const response = await PATCH(patchRequest(idToken));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      user: { id: 'waitlist-1', status: 'APPROVED' },
    });
    expect(db.update).toHaveBeenCalledTimes(1);
  });
});
