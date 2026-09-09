/**
 * Google ID-token builders for the admin auth suites.
 *
 * Tokens are minted locally so the suites can exercise real signature checking
 * without reaching accounts.google.com. The forged builder deliberately produces
 * the cheapest attack a public repo invites: a well-formed, entirely unsigned
 * token whose payload claims an authorized address.
 */

import { SignJWT } from 'jose';

export const TEST_CLIENT_ID = '320694089423-test.apps.googleusercontent.com';
export const GOOGLE_ISSUER = 'https://accounts.google.com';
export const ADMIN_EMAIL = 'admin@zenko.gg';
export const OUTSIDER_EMAIL = 'outsider@example.com';

export function forgeUnsignedToken(claims: Record<string, unknown>): string {
  const segment = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${segment({ alg: 'none', typ: 'JWT' })}.${segment(claims)}.`;
}

export function forgedAdminToken(email: string = ADMIN_EMAIL): string {
  return forgeUnsignedToken({
    iss: GOOGLE_ISSUER,
    aud: TEST_CLIENT_ID,
    sub: 'forged-subject',
    email,
    name: 'Not The Admin',
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
}

export function signIdToken(
  privateKey: CryptoKey,
  overrides: {
    email?: string;
    name?: string;
    issuer?: string;
    audience?: string;
    expirationTime?: string;
  } = {}
): Promise<string> {
  return new SignJWT({
    email: overrides.email ?? ADMIN_EMAIL,
    name: overrides.name ?? 'Waitlist Admin',
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setSubject('google-subject-1')
    .setIssuer(overrides.issuer ?? GOOGLE_ISSUER)
    .setAudience(overrides.audience ?? TEST_CLIENT_ID)
    .setIssuedAt()
    .setExpirationTime(overrides.expirationTime ?? '1h')
    .sign(privateKey);
}
