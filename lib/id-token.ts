/**
 * ID-token verification for the OpenID providers this app signs people in with.
 *
 * Both entry points (the operator dashboard and the public waitlist sign-in) get
 * an ID token minted for the browser by the implicit flow and post it to a route
 * here. The claims inside one are worth nothing until the issuer's signature over
 * them checks out, pinned to the client id that asked for the token, so this
 * module is the one place that does it and the one place to get it right.
 *
 * Pinning the audience is what makes the identity ours: without it, any token the
 * same issuer minted for any other application would verify. Pinning the issuer
 * per provider is what keeps the two apart, so a token from one cannot be
 * presented as a sign-in with the other.
 */

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

/** Providers whose ID token the browser presents to us directly. */
export type SignInProvider = 'google' | 'twitch';

interface ProviderConfig {
  jwksUrl: URL;
  /** Google mints `iss` both with and without the scheme, so both spellings are the one issuer. */
  issuers: string[];
  audienceEnvVar: string;
}

// Every value below comes from the provider's own OIDC discovery document. Both
// publish RS256 only, so accepting anything else would only widen the surface.
const PROVIDERS: Record<SignInProvider, ProviderConfig> = {
  google: {
    jwksUrl: new URL('https://www.googleapis.com/oauth2/v3/certs'),
    issuers: ['https://accounts.google.com', 'accounts.google.com'],
    audienceEnvVar: 'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
  },
  twitch: {
    jwksUrl: new URL('https://id.twitch.tv/oauth2/keys'),
    issuers: ['https://id.twitch.tv/oauth2'],
    audienceEnvVar: 'NEXT_PUBLIC_TWITCH_CLIENT_ID',
  },
};

const SIGNING_ALGORITHMS = ['RS256'];

const keySets = new Map<SignInProvider, ReturnType<typeof createRemoteJWKSet>>();

function keysFor(provider: SignInProvider) {
  // One key set per provider for the life of the instance: jose caches the
  // published keys behind it, so a per-request set refetches them every call.
  const existing = keySets.get(provider);
  if (existing) return existing;

  const created = createRemoteJWKSet(PROVIDERS[provider].jwksUrl);
  keySets.set(provider, created);
  return created;
}

/** The identity a verified token attests, normalized across providers. */
export interface VerifiedIdentity {
  provider: SignInProvider;
  /** The issuer's stable id for the account. The only safe key for a row. */
  subject: string;
  email?: string;
  /** The issuer's own verdict on the address, never inferred from the provider. */
  emailVerified: boolean;
  displayName?: string;
  avatarUrl?: string;
}

export type IdTokenResult =
  | { ok: true; identity: VerifiedIdentity }
  | { ok: false; reason: 'unverified' | 'misconfigured' };

export function isSignInProvider(value: unknown): value is SignInProvider {
  return value === 'google' || value === 'twitch';
}

function claimString(payload: JWTPayload, claim: string): string | undefined {
  const value = payload[claim];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function identityFrom(provider: SignInProvider, payload: JWTPayload): VerifiedIdentity | null {
  const subject = payload.sub;
  if (typeof subject !== 'string' || !subject) return null;

  // Google carries the profile in `name` and `picture`; Twitch's discovery
  // document publishes `preferred_username` and `picture` and nothing else that
  // names an account.
  const displayName =
    provider === 'twitch' ? claimString(payload, 'preferred_username') : claimString(payload, 'name');

  return {
    provider,
    subject,
    email: claimString(payload, 'email'),
    emailVerified: payload.email_verified === true,
    displayName,
    avatarUrl: claimString(payload, 'picture'),
  };
}

/**
 * Verifies an ID token against the provider's published keys and returns the
 * identity it attests.
 *
 * Fails closed in every direction a caller must handle: `unverified` covers a bad
 * signature, an unknown key, a wrong issuer or audience, an expired token, and a
 * payload with no subject, none of which yield an identity worth acting on.
 * `misconfigured` means this deployment has no client id to pin the audience to,
 * which is not the caller's fault and not something to let through either.
 */
export async function verifyIdToken(
  provider: SignInProvider,
  idToken: string
): Promise<IdTokenResult> {
  const config = PROVIDERS[provider];
  const audience = process.env[config.audienceEnvVar];
  if (!audience) {
    console.error(`[id-token] ${config.audienceEnvVar} is not configured`);
    return { ok: false, reason: 'misconfigured' };
  }

  try {
    const { payload } = await jwtVerify(idToken, keysFor(provider), {
      issuer: config.issuers,
      audience,
      algorithms: SIGNING_ALGORITHMS,
    });

    const identity = identityFrom(provider, payload);
    return identity ? { ok: true, identity } : { ok: false, reason: 'unverified' };
  } catch {
    return { ok: false, reason: 'unverified' };
  }
}
