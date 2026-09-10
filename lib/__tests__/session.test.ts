import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

import {
  SESSION_COOKIE,
  mintSessionToken,
  readSession,
  requireSession,
  respondSignedIn,
} from '@/lib/session';

const SECRET = 'test-session-secret-that-is-long-enough-for-hs256';
const OTHER_SECRET = 'a-different-secret-nobody-here-should-accept';
const USER_ID = '11111111-2222-3333-4444-555555555555';

function keyFrom(secret: string) {
  return new TextEncoder().encode(secret);
}

/**
 * Mints a cookie value the way an attacker would: with jose directly, never
 * through the module under test. A forgery signed by the module would only prove
 * the module agrees with itself.
 */
async function forgeToken(options: {
  secret?: string;
  subject?: string;
  expiresIn?: string;
  issuer?: string;
} = {}) {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(options.subject ?? USER_ID)
    .setIssuer(options.issuer ?? 'zenko-waitlist')
    .setIssuedAt()
    .setExpirationTime(options.expiresIn ?? '30d')
    .sign(keyFrom(options.secret ?? SECRET));
}

function requestWithCookie(token: string | null) {
  const headers = new Headers();
  if (token !== null) {
    headers.set('cookie', `${SESSION_COOKIE}=${token}`);
  }
  return new NextRequest('http://localhost/api/user/stats', { method: 'POST', headers });
}

function sessionCookieOn(response: NextResponse) {
  return response.cookies.get(SESSION_COOKIE);
}

beforeEach(() => {
  process.env.WAITLIST_SESSION_SECRET = SECRET;
});

describe('waitlist session', () => {
  it('refuses a request that carries no session at all', async () => {
    const result = await readSession(requestWithCookie(null));

    expect(result).toEqual({ ok: false, reason: 'unauthenticated' });
  });

  it('refuses a session signed by a key this deployment does not hold', async () => {
    const token = await forgeToken({ secret: OTHER_SECRET });

    const result = await readSession(requestWithCookie(token));

    expect(result).toEqual({ ok: false, reason: 'unauthenticated' });
  });

  it('refuses a session whose payload was edited after signing', async () => {
    const token = await forgeToken();
    const [header, , signature] = token.split('.');
    const swappedPayload = Buffer.from(
      JSON.stringify({ sub: 'someone-elses-row', iss: 'zenko-waitlist', exp: 4102444800 })
    ).toString('base64url');

    const result = await readSession(requestWithCookie(`${header}.${swappedPayload}.${signature}`));

    expect(result).toEqual({ ok: false, reason: 'unauthenticated' });
  });

  it('refuses an expired session', async () => {
    const token = await forgeToken({ expiresIn: '-1h' });

    const result = await readSession(requestWithCookie(token));

    expect(result).toEqual({ ok: false, reason: 'unauthenticated' });
  });

  it('refuses a token minted for a different issuer', async () => {
    const token = await forgeToken({ issuer: 'some-other-app' });

    const result = await readSession(requestWithCookie(token));

    expect(result).toEqual({ ok: false, reason: 'unauthenticated' });
  });

  it('refuses garbage in the cookie rather than throwing', async () => {
    const result = await readSession(requestWithCookie('not-a-jwt'));

    expect(result).toEqual({ ok: false, reason: 'unauthenticated' });
  });

  it('refuses every session while the signing secret is unset', async () => {
    const token = await forgeToken();
    delete process.env.WAITLIST_SESSION_SECRET;

    const result = await readSession(requestWithCookie(token));

    expect(result).toEqual({ ok: false, reason: 'misconfigured' });
  });

  it('reads back the row id a minted session names', async () => {
    const token = await mintSessionToken(USER_ID);

    const result = await readSession(requestWithCookie(token!));

    expect(result).toEqual({ ok: true, userId: USER_ID });
  });

  it('mints nothing while the signing secret is unset', async () => {
    delete process.env.WAITLIST_SESSION_SECRET;

    await expect(mintSessionToken(USER_ID)).resolves.toBeNull();
  });

  it('turns a refused session into a 401 the route can return as is', async () => {
    const guard = await requireSession(requestWithCookie(null));

    expect(guard.ok).toBe(false);
    if (guard.ok) return;
    expect(guard.response.status).toBe(401);
    await expect(guard.response.json()).resolves.toEqual({
      error: 'Unauthorized',
      message: 'Sign in required',
    });
  });

  it('turns an unconfigured deployment into a 503, never a pass', async () => {
    const token = await forgeToken();
    delete process.env.WAITLIST_SESSION_SECRET;

    const guard = await requireSession(requestWithCookie(token));

    expect(guard.ok).toBe(false);
    if (guard.ok) return;
    expect(guard.response.status).toBe(503);
  });

  it('hands a verified session straight to the route', async () => {
    const token = await mintSessionToken(USER_ID);

    const guard = await requireSession(requestWithCookie(token!));

    expect(guard).toEqual({ ok: true, userId: USER_ID });
  });

  it('attaches a session the browser cannot read or send cross-site', async () => {
    const response = await respondSignedIn({ id: USER_ID, displayName: 'Player One' });

    const cookie = sessionCookieOn(response);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('lax');
    expect(cookie?.path).toBe('/');
    await expect(response.json()).resolves.toEqual({
      user: { id: USER_ID, displayName: 'Player One' },
    });
  });

  it('signs in nobody while the signing secret is unset', async () => {
    delete process.env.WAITLIST_SESSION_SECRET;

    const response = await respondSignedIn({ id: USER_ID });

    expect(response.status).toBe(503);
    expect(sessionCookieOn(response)).toBeUndefined();
  });

  it('names the signed-in row and nothing else in the cookie payload', async () => {
    const token = await mintSessionToken(USER_ID);
    const [, payload] = token!.split('.');

    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());

    expect(claims.sub).toBe(USER_ID);
    expect(claims.iss).toBe('zenko-waitlist');
    expect(Object.keys(claims).sort()).toEqual(['exp', 'iat', 'iss', 'sub']);
  });
});
