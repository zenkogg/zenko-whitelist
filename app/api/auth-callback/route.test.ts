import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';
import {
  GOOGLE_ISSUER,
  TEST_CLIENT_ID,
  TEST_TWITCH_CLIENT_ID,
  TWITCH_ISSUER,
  forgeUnsignedToken,
  signIdTokenWithClaims,
} from '@/lib/__tests__/id-token-fixtures';

// A locally generated key pair per issuer stands in for each published JWKS,
// handed out by the URL the verifier asks for. That keeps the suite off the
// network and makes a token signed by one issuer's key fail as the other, which
// is the property a single shared key set would quietly hide.
const keys = vi.hoisted(() => ({
  googlePublic: null as CryptoKey | null,
  googlePrivate: null as CryptoKey | null,
  twitchPublic: null as CryptoKey | null,
  twitchPrivate: null as CryptoKey | null,
  foreignPrivate: null as CryptoKey | null,
}));

const db = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock('jose', async () => {
  const actual = await vi.importActual<typeof import('jose')>('jose');
  const google = await actual.generateKeyPair('RS256');
  const twitch = await actual.generateKeyPair('RS256');
  const foreign = await actual.generateKeyPair('RS256');
  keys.googlePublic = google.publicKey;
  keys.googlePrivate = google.privateKey;
  keys.twitchPublic = twitch.publicKey;
  keys.twitchPrivate = twitch.privateKey;
  keys.foreignPrivate = foreign.privateKey;
  return {
    ...actual,
    createRemoteJWKSet: (url: URL) => async () =>
      url.href.includes('twitch') ? keys.twitchPublic : keys.googlePublic,
  };
});

// `after` needs a request scope it has no way to get here, and the Loops sync it
// schedules is not what these cases are about.
vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server');
  return { ...actual, after: () => undefined };
});

vi.mock('@/lib/prisma', () => ({
  prisma: {
    waitlistUser: { findUnique: db.findUnique, create: db.create, update: db.update },
  },
}));
vi.mock('@/lib/loops/sync', () => ({ syncWaitlistUser: vi.fn() }));

import { POST } from './route';

const GOOGLE_SUBJECT = 'google-subject-1';
const TWITCH_SUBJECT = 'twitch-subject-1';

function callbackRequest(body: unknown) {
  return new NextRequest('http://localhost/api/auth-callback', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function googleIdToken(
  options: Parameters<typeof signIdTokenWithClaims>[1] = {},
  privateKey: CryptoKey = keys.googlePrivate!
) {
  return signIdTokenWithClaims(privateKey, {
    issuer: GOOGLE_ISSUER,
    audience: TEST_CLIENT_ID,
    subject: GOOGLE_SUBJECT,
    claims: { email: 'player@example.com', email_verified: true, name: 'Player One' },
    ...options,
  });
}

function twitchIdToken(options: Parameters<typeof signIdTokenWithClaims>[1] = {}) {
  return signIdTokenWithClaims(keys.twitchPrivate!, {
    issuer: TWITCH_ISSUER,
    audience: TEST_TWITCH_CLIENT_ID,
    subject: TWITCH_SUBJECT,
    claims: {
      email: 'streamer@example.com',
      email_verified: true,
      preferred_username: 'streamer_one',
    },
    ...options,
  });
}

function createdRowData() {
  return db.create.mock.calls[0][0].data;
}

/** The row a response's session names, read straight off the cookie payload. */
function sessionSubject(response: NextResponse): string | undefined {
  const token = response.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return undefined;
  const [, payload] = token.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString()).sub;
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = TEST_CLIENT_ID;
  process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID = TEST_TWITCH_CLIENT_ID;
  process.env.WAITLIST_SESSION_SECRET = 'test-session-secret-that-is-long-enough';
  db.findUnique.mockReset().mockResolvedValue(null);
  db.create.mockReset().mockImplementation(async ({ data }) => ({ id: 'new-user-1', ...data }));
  db.update.mockReset().mockImplementation(async ({ data }) => ({ id: 'existing-user-1', ...data }));
});

describe('waitlist sign-in callback', () => {
  it('refuses an unsigned token and mints no row for it', async () => {
    const idToken = forgeUnsignedToken({
      iss: GOOGLE_ISSUER,
      aud: TEST_CLIENT_ID,
      sub: GOOGLE_SUBJECT,
      email: 'player@example.com',
      name: 'Player One',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const response = await POST(callbackRequest({ idToken, provider: 'google' }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid token' });
    expect(db.create).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it('refuses a token signed by a key the issuer does not publish', async () => {
    const idToken = await googleIdToken({}, keys.foreignPrivate!);

    const response = await POST(callbackRequest({ idToken, provider: 'google' }));

    expect(response.status).toBe(401);
    expect(db.create).not.toHaveBeenCalled();
  });

  it('refuses an expired token', async () => {
    const idToken = await googleIdToken({ expirationTime: '-1h' });

    const response = await POST(callbackRequest({ idToken, provider: 'google' }));

    expect(response.status).toBe(401);
    expect(db.create).not.toHaveBeenCalled();
  });

  it('refuses a token minted for another application', async () => {
    const idToken = await googleIdToken({
      audience: 'someone-elses-client.apps.googleusercontent.com',
    });

    const response = await POST(callbackRequest({ idToken, provider: 'google' }));

    expect(response.status).toBe(401);
    expect(db.create).not.toHaveBeenCalled();
  });

  it('refuses a token from one issuer presented as the other provider', async () => {
    const idToken = await googleIdToken();

    const response = await POST(callbackRequest({ idToken, provider: 'twitch' }));

    expect(response.status).toBe(401);
    expect(db.create).not.toHaveBeenCalled();
  });

  it('refuses a provider this route does not sign anyone in with', async () => {
    const idToken = await googleIdToken();

    const response = await POST(callbackRequest({ idToken, provider: 'twitter' }));

    expect(response.status).toBe(400);
    expect(db.findUnique).not.toHaveBeenCalled();
    expect(db.create).not.toHaveBeenCalled();
  });

  it('refuses every token while the audience to pin is unconfigured', async () => {
    const idToken = await googleIdToken();
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    const response = await POST(callbackRequest({ idToken, provider: 'google' }));

    expect(response.status).toBe(500);
    expect(db.create).not.toHaveBeenCalled();
  });

  it('creates a waitlist row from a valid Google token', async () => {
    const idToken = await googleIdToken();

    const response = await POST(callbackRequest({ idToken, provider: 'google' }));

    expect(response.status).toBe(200);
    expect(db.create).toHaveBeenCalledTimes(1);
    expect(createdRowData()).toMatchObject({
      oauthProvider: 'google',
      oauthId: GOOGLE_SUBJECT,
      email: 'player@example.com',
      emailVerified: true,
      displayName: 'Player One',
    });
  });

  it('names a Twitch row from the verified preferred_username', async () => {
    const idToken = await twitchIdToken();

    const response = await POST(callbackRequest({ idToken, provider: 'twitch' }));

    expect(response.status).toBe(200);
    expect(db.create).toHaveBeenCalledTimes(1);
    expect(createdRowData()).toMatchObject({
      oauthProvider: 'twitch',
      oauthId: TWITCH_SUBJECT,
      email: 'streamer@example.com',
      emailVerified: true,
      displayName: 'streamer_one',
    });
  });

  it('keeps a non-ASCII name intact through verification', async () => {
    const idToken = await googleIdToken({
      claims: { email: 'player@example.com', email_verified: true, name: 'Zeynep Çağlar 张伟' },
    });

    const response = await POST(callbackRequest({ idToken, provider: 'google' }));

    expect(response.status).toBe(200);
    expect(createdRowData()).toMatchObject({ displayName: 'Zeynep Çağlar 张伟' });
  });

  it('records an unverified address as unverified rather than trusting the provider', async () => {
    const idToken = await googleIdToken({
      claims: { email: 'player@example.com', email_verified: false, name: 'Player One' },
    });

    const response = await POST(callbackRequest({ idToken, provider: 'google' }));

    expect(response.status).toBe(200);
    expect(createdRowData()).toMatchObject({ emailVerified: false });
  });

  it('refreshes the row the verified subject already owns', async () => {
    db.findUnique.mockResolvedValueOnce({ id: 'existing-user-1', email: 'old@example.com' });
    const idToken = await googleIdToken();

    const response = await POST(callbackRequest({ idToken, provider: 'google' }));

    expect(response.status).toBe(200);
    expect(db.create).not.toHaveBeenCalled();
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(db.update.mock.calls[0][0]).toMatchObject({
      where: { id: 'existing-user-1' },
      data: { displayName: 'Player One', email: 'player@example.com' },
    });
  });

  it('rejects a request with no token', async () => {
    const response = await POST(callbackRequest({ provider: 'google' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Missing token or provider' });
  });

  it('leaves a new signup holding a session for the row it just created', async () => {
    const idToken = await googleIdToken();

    const response = await POST(callbackRequest({ idToken, provider: 'google' }));

    expect(response.status).toBe(200);
    expect(sessionSubject(response)).toBe('new-user-1');
  });

  it('leaves a returning signin holding a session for the row it refreshed', async () => {
    db.findUnique.mockResolvedValueOnce({ id: 'existing-user-1', email: 'old@example.com' });
    const idToken = await googleIdToken();

    const response = await POST(callbackRequest({ idToken, provider: 'google' }));

    expect(response.status).toBe(200);
    expect(sessionSubject(response)).toBe('existing-user-1');
  });

  it('hands a refused token no session at all', async () => {
    const idToken = await googleIdToken({}, keys.foreignPrivate!);

    const response = await POST(callbackRequest({ idToken, provider: 'google' }));

    expect(response.status).toBe(401);
    expect(sessionSubject(response)).toBeUndefined();
  });

  it('refuses to sign anyone in while the session secret is unset', async () => {
    const idToken = await googleIdToken();
    delete process.env.WAITLIST_SESSION_SECRET;

    const response = await POST(callbackRequest({ idToken, provider: 'google' }));

    expect(response.status).toBe(503);
    expect(sessionSubject(response)).toBeUndefined();
  });
});
