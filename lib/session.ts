/**
 * Sessions for the public waitlist app.
 *
 * Signing in already proves who the caller is: the Google and Twitch path verifies
 * an ID token (lib/id-token.ts), the X path completes an OAuth 1.0a exchange, and
 * the Virtualeagues path exchanges a PKCE code. What none of them did was carry
 * that proof forward, so every later profile write had to be told which row to
 * touch, and believed it. This module is the carry: the sign-in routes mint a
 * cookie naming the row they just authenticated, and the profile routes act on
 * that row and no other.
 *
 * A cookie of our own rather than the provider's token because only one of the
 * four sign-in paths yields a token the browser could re-present, and that one is
 * an implicit-flow ID token that expires within the hour with no refresh behind
 * it. Signing the cookie is what makes it worth reading: the payload is a row id,
 * which is exactly the value a caller would otherwise have picked.
 *
 * HttpOnly keeps page scripts (and anything injected into one) from lifting it,
 * and SameSite=Lax keeps another origin from driving a profile write with it.
 */

import { SignJWT, jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

export const SESSION_COOKIE = 'waitlist_session';

const SESSION_ISSUER = 'zenko-waitlist';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const SIGNING_ALGORITHM = 'HS256';

export type SessionResult =
  | { ok: true; userId: string }
  | { ok: false; reason: 'unauthenticated' | 'misconfigured' };

export type SessionGuard =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

function signingKey(): Uint8Array | null {
  const secret = process.env.WAITLIST_SESSION_SECRET;
  if (!secret) {
    console.error('[session] WAITLIST_SESSION_SECRET is not configured');
    return null;
  }
  return new TextEncoder().encode(secret);
}

/** Returns the signed session value, or null when this deployment cannot sign one. */
export async function mintSessionToken(userId: string): Promise<string | null> {
  const key = signingKey();
  if (!key) return null;

  return new SignJWT({})
    .setProtectedHeader({ alg: SIGNING_ALGORITHM })
    .setSubject(userId)
    .setIssuer(SESSION_ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key);
}

/**
 * Resolves the row the caller is signed in as.
 *
 * Fails closed in both directions a caller must handle: `unauthenticated` covers a
 * missing cookie, a bad signature, a wrong issuer, an expired session and a
 * payload with no subject, none of which name a row we may act on. `misconfigured`
 * means this deployment holds no signing secret, which is not the caller's fault
 * and is still not a reason to let anyone through.
 */
export async function readSession(request: NextRequest): Promise<SessionResult> {
  const key = signingKey();
  if (!key) return { ok: false, reason: 'misconfigured' };

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return { ok: false, reason: 'unauthenticated' };

  try {
    const { payload } = await jwtVerify(token, key, {
      issuer: SESSION_ISSUER,
      algorithms: [SIGNING_ALGORITHM],
    });

    return typeof payload.sub === 'string' && payload.sub
      ? { ok: true, userId: payload.sub }
      : { ok: false, reason: 'unauthenticated' };
  } catch {
    return { ok: false, reason: 'unauthenticated' };
  }
}

/**
 * Guard for profile routes: either the row the caller owns, or the response to
 * refuse them with. Returning the refusal rather than a boolean keeps a route from
 * reading the id out of a failed result by accident.
 */
export async function requireSession(request: NextRequest): Promise<SessionGuard> {
  const session = await readSession(request);
  if (session.ok) return session;

  return {
    ok: false,
    response:
      session.reason === 'misconfigured'
        ? NextResponse.json(
            { error: 'Service Unavailable', message: 'Sessions are not configured' },
            { status: 503 }
          )
        : NextResponse.json(
            { error: 'Unauthorized', message: 'Sign in required' },
            { status: 401 }
          ),
  };
}

/**
 * The one way a sign-in route answers, so a body that says someone is signed in
 * cannot leave without the cookie that makes it true.
 */
export async function respondSignedIn<T extends { id: string }>(user: T): Promise<NextResponse> {
  const token = await mintSessionToken(user.id);
  if (!token) {
    return NextResponse.json({ error: 'Sign in unavailable' }, { status: 503 });
  }

  const response = NextResponse.json({ user });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Every deployed environment is https; local `next dev` is not, and a Secure
    // cookie there would be dropped rather than refused, which reads as a broken
    // sign-in with nothing in the log.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
