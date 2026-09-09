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

vi.mock('jose', async () => {
  const actual = await vi.importActual<typeof import('jose')>('jose');
  const google = await actual.generateKeyPair('RS256');
  const foreign = await actual.generateKeyPair('RS256');
  keys.publicKey = google.publicKey;
  keys.privateKey = google.privateKey;
  keys.foreignPrivateKey = foreign.privateKey;
  return { ...actual, createRemoteJWKSet: () => async () => keys.publicKey };
});

import { POST } from './route';

function authRequest(body: unknown) {
  return new NextRequest('http://localhost/api/admin/auth', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  process.env.ADMIN_EMAILS = `${ADMIN_EMAIL}, second@zenko.gg`;
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = TEST_CLIENT_ID;
});

describe('admin auth exchange', () => {
  it('refuses an unsigned token that claims an authorized address', async () => {
    const response = await POST(authRequest({ idToken: forgedAdminToken() }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid token' });
  });

  it('refuses a token signed by a key the issuer does not publish', async () => {
    const idToken = await signIdToken(keys.foreignPrivateKey!);

    const response = await POST(authRequest({ idToken }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid token' });
  });

  it('refuses an expired token', async () => {
    const idToken = await signIdToken(keys.privateKey!, { expirationTime: '-1h' });

    const response = await POST(authRequest({ idToken }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid token' });
  });

  it('refuses a token minted for another application', async () => {
    const idToken = await signIdToken(keys.privateKey!, {
      audience: 'someone-elses-client.apps.googleusercontent.com',
    });

    const response = await POST(authRequest({ idToken }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid token' });
  });

  it('refuses a token from another issuer', async () => {
    const idToken = await signIdToken(keys.privateKey!, {
      issuer: 'https://id.twitch.tv/oauth2',
    });

    const response = await POST(authRequest({ idToken }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid token' });
  });

  it('refuses a validly signed token whose address is not authorized', async () => {
    const idToken = await signIdToken(keys.privateKey!, { email: OUTSIDER_EMAIL });

    const response = await POST(authRequest({ idToken }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Access denied' });
  });

  it('authorizes a validly signed token carrying an authorized address', async () => {
    const idToken = await signIdToken(keys.privateKey!);

    const response = await POST(authRequest({ idToken }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      authorized: true,
      email: ADMIN_EMAIL,
      name: 'Waitlist Admin',
    });
  });

  it('rejects a request with no token', async () => {
    const response = await POST(authRequest({}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Missing idToken' });
  });
});
