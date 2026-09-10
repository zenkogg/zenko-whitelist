/**
 * Session fixtures for the profile-route tests.
 *
 * Cookies here are minted with jose directly rather than through lib/session, so
 * a route test proves the route accepts a correctly signed session and not merely
 * that the module agrees with itself. `forgedSession` is what an attacker can
 * actually build: a well-formed token signed by a key this deployment never held.
 */

import { NextRequest } from 'next/server';
import { SignJWT } from 'jose';

export const TEST_SESSION_SECRET = 'test-session-secret-that-is-long-enough';
const ATTACKER_SECRET = 'a-secret-this-deployment-never-held';
const SESSION_ISSUER = 'zenko-waitlist';
const SESSION_COOKIE = 'waitlist_session';

/** The row the test caller is signed in as. */
export const OWNER_ID = 'owner-row-1';
/** A row the test caller has no claim to, used as the target of every forgery. */
export const STRANGER_ID = 'stranger-row-2';

async function mint(userId: string, secret: string, expiresIn = '30d') {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer(SESSION_ISSUER)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(secret));
}

/** A session this deployment should accept. */
export function sessionFor(userId: string) {
  return mint(userId, TEST_SESSION_SECRET);
}

/** A session signed by a key this deployment does not hold. */
export function forgedSession(userId: string) {
  return mint(userId, ATTACKER_SECRET);
}

/** A session this deployment signed, but too long ago to still honour. */
export function expiredSession(userId: string) {
  return mint(userId, TEST_SESSION_SECRET, '-1h');
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  form?: Record<string, string | Blob>;
  search?: Record<string, string>;
}

/** Builds a request carrying the exact cookie value given, or none when null. */
export function requestWithSession(
  url: string,
  token: string | null,
  options: RequestOptions = {}
): NextRequest {
  const target = new URL(url);
  for (const [key, value] of Object.entries(options.search ?? {})) {
    target.searchParams.set(key, value);
  }

  const headers = new Headers();
  if (token !== null) {
    headers.set('cookie', `${SESSION_COOKIE}=${token}`);
  }

  let body: BodyInit | undefined;
  if (options.form) {
    const form = new FormData();
    for (const [key, value] of Object.entries(options.form)) {
      form.append(key, value);
    }
    body = form;
  } else if (options.body !== undefined) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(options.body);
  }

  return new NextRequest(target, { method: options.method ?? 'POST', headers, body });
}

/** Builds a request signed in as the given row. */
export async function requestAs(
  url: string,
  userId: string,
  options: RequestOptions = {}
): Promise<NextRequest> {
  return requestWithSession(url, await sessionFor(userId), options);
}
