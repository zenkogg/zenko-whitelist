/**
 * Admin authentication for the waitlist operator dashboard.
 *
 * The dashboard signs in through Google's OIDC implicit flow (see
 * `getGoogleSignInUrl` in app/admin/page.tsx) and presents the resulting ID
 * token as a Bearer. Authenticating it is `verifyIdToken`'s job, shared with the
 * public sign-in path; what lives here is the authorization layered on top.
 *
 * ADMIN_EMAILS is not authentication on its own: an address is a claim anyone can
 * write into a token payload, and this repo is public, so the shape of the check
 * is known. It only means something once the signature over the address holds.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/id-token';

export type AdminAuthResult =
  | { ok: true; email: string; name?: string }
  | { ok: false; reason: 'invalid_token' | 'not_admin' };

function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || '';
  return raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export async function authenticateAdmin(idToken: string): Promise<AdminAuthResult> {
  const verification = await verifyIdToken('google', idToken);
  if (!verification.ok) {
    // A deployment missing its client id and a forged token are equally unusable
    // here, and telling them apart at the boundary would only help an attacker.
    return { ok: false, reason: 'invalid_token' };
  }

  const { email, displayName } = verification.identity;
  if (!email) {
    return { ok: false, reason: 'invalid_token' };
  }

  if (!adminEmails().includes(email.toLowerCase())) {
    return { ok: false, reason: 'not_admin' };
  }

  return { ok: true, email, name: displayName };
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
