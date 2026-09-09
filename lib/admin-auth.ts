/**
 * Admin authentication for the waitlist operator dashboard.
 *
 * The dashboard signs in through Google's OIDC implicit flow (see
 * `getGoogleSignInUrl` in app/admin/page.tsx) and presents the resulting ID
 * token as a Bearer. Authenticating it therefore means verifying Google's
 * signature over it, pinned to the same client id that sign-in URL uses.
 *
 * ADMIN_EMAILS is authorization layered on top of that verified identity. It is
 * not authentication on its own: an address is a claim anyone can write into a
 * token payload, and this repo is public, so the shape of the check is known.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// From Google's OIDC discovery document. It publishes RS256 only, and mints
// `iss` both with and without the scheme, so both spellings are the one issuer.
const GOOGLE_JWKS_URL = new URL('https://www.googleapis.com/oauth2/v3/certs');
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const GOOGLE_SIGNING_ALGORITHMS = ['RS256'];

let googleJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function googleKeys() {
  // One key set for the life of the instance: jose caches Google's keys behind
  // it, so a per-request set would refetch them on every admin call.
  googleJwks ??= createRemoteJWKSet(GOOGLE_JWKS_URL);
  return googleJwks;
}

export type AdminAuthResult =
  | { ok: true; email: string; name?: string }
  | { ok: false; reason: 'invalid_token' | 'not_admin' };

function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || '';
  return raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export async function authenticateAdmin(idToken: string): Promise<AdminAuthResult> {
  const audience = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!audience) {
    // Fail closed. Without an audience to pin, any Google-signed token issued to
    // any other application would verify, which is barely better than no check.
    console.error('[admin-auth] NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured');
    return { ok: false, reason: 'invalid_token' };
  }

  let email: string | undefined;
  let name: string | undefined;

  try {
    const { payload } = await jwtVerify(idToken, googleKeys(), {
      issuer: GOOGLE_ISSUERS,
      audience,
      algorithms: GOOGLE_SIGNING_ALGORITHMS,
    });
    email = typeof payload.email === 'string' ? payload.email : undefined;
    name = typeof payload.name === 'string' ? payload.name : undefined;
  } catch {
    // Covers a bad signature, an unknown key, a wrong issuer or audience, and an
    // expired token alike: none of them yield an identity worth authorizing.
    return { ok: false, reason: 'invalid_token' };
  }

  if (!email) {
    return { ok: false, reason: 'invalid_token' };
  }

  if (!adminEmails().includes(email.toLowerCase())) {
    return { ok: false, reason: 'not_admin' };
  }

  return { ok: true, email, name };
}

/**
 * Guard for admin routes that carry the ID token in an Authorization header.
 * Returns a response to send when the caller is refused, or null when it is not.
 */
export async function requireAdminBearer(request: NextRequest): Promise<NextResponse | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await authenticateAdmin(authHeader.slice('Bearer '.length));
  if (result.ok) {
    return null;
  }

  return result.reason === 'not_admin'
    ? NextResponse.json({ error: 'Access denied' }, { status: 403 })
    : NextResponse.json({ error: 'Invalid token' }, { status: 401 });
}
