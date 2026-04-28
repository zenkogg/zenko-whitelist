/**
 * Virtualeagues OAuth client (whitelist port of zenko-mono's service).
 *
 * Authorization Code + PKCE (S256). Confidential client — `client_secret` is
 * sent at the token endpoint, so this module is server-only. Do not import
 * from a client component.
 *
 * The whitelist app does not persist VL tokens (unlike zenko-mono); we only
 * need them long enough to fetch the userinfo and upsert a WaitlistUser. So
 * `refresh` and `revoke` are intentionally omitted.
 */
import { createHash, randomBytes } from 'crypto';
import { proxyFetch } from './proxy-fetch';

const AUTHORIZE_URL =
  process.env.VL_AUTHORIZE_URL || 'https://www.virtualeagues.com/oauth/authorize';
const TOKEN_URL = process.env.VL_TOKEN_URL || 'https://www.virtualeagues.com/api/oauth/token';
const USERINFO_URL =
  process.env.VL_USERINFO_URL || 'https://www.virtualeagues.com/api/oauth/user';
const SCOPES = process.env.VL_SCOPES || 'profile:read email:read';

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generateCodeVerifier(): string {
  return base64UrlEncode(randomBytes(32));
}

export function deriveCodeChallenge(codeVerifier: string): string {
  return base64UrlEncode(createHash('sha256').update(codeVerifier).digest());
}

export function generateState(): string {
  return base64UrlEncode(randomBytes(32));
}

export interface VlTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  grantedScopes: string[];
}

export interface VlUser {
  sub: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  raw: Record<string, unknown>;
}

export type VlOAuthErrorCode =
  | 'invalid_client'
  | 'invalid_grant'
  | 'invalid_request'
  | 'rate_limited'
  | 'unauthorized'
  | 'network_error'
  | 'unexpected_response';

export class VlOAuthError extends Error {
  constructor(
    public readonly code: VlOAuthErrorCode,
    message: string,
    public readonly status?: number,
    public readonly raw?: unknown
  ) {
    super(message);
    this.name = 'VlOAuthError';
  }
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

export function vlConfigured(): boolean {
  return !!process.env.VL_CLIENT_ID && !!process.env.VL_CLIENT_SECRET && !!process.env.VL_REDIRECT_URI;
}

export function buildAuthorizeUrl(input: {
  state: string;
  codeChallenge: string;
  scopes?: string;
}): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: requireEnv('VL_CLIENT_ID'),
    redirect_uri: requireEnv('VL_REDIRECT_URI'),
    scope: input.scopes ?? SCOPES,
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCode(input: {
  code: string;
  codeVerifier: string;
}): Promise<VlTokens> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: input.code,
    redirect_uri: requireEnv('VL_REDIRECT_URI'),
    client_id: requireEnv('VL_CLIENT_ID'),
    client_secret: requireEnv('VL_CLIENT_SECRET'),
    code_verifier: input.codeVerifier,
  });

  const response = await safeFetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });

  // VL returns HTTP 481 for invalid_client (per their docs — non-standard).
  if (response.status === 401 || response.status === 481) {
    throw new VlOAuthError(
      'invalid_client',
      'VL rejected the client credentials. Check VL_CLIENT_ID and VL_CLIENT_SECRET.',
      response.status,
      await safeJson(response)
    );
  }
  if (response.status === 429) {
    throw new VlOAuthError(
      'rate_limited',
      'VL token endpoint rate-limited',
      429,
      await safeJson(response)
    );
  }

  const raw = await safeJson(response);

  if (!response.ok) {
    const errCode = (isRecord(raw) && stringField(raw, 'error')) || 'unexpected_response';
    throw new VlOAuthError(
      mapOAuthError(errCode),
      `VL token endpoint returned HTTP ${response.status} (${errCode})`,
      response.status,
      raw
    );
  }

  if (!isRecord(raw)) {
    throw new VlOAuthError('unexpected_response', 'VL token endpoint returned non-object body', 200, raw);
  }

  const accessToken = stringField(raw, 'access_token');
  const refreshToken = stringField(raw, 'refresh_token');
  const expiresIn = numberField(raw, 'expires_in');

  if (!accessToken || !refreshToken || !expiresIn) {
    throw new VlOAuthError(
      'unexpected_response',
      'VL token response missing access_token / refresh_token / expires_in',
      200,
      raw
    );
  }

  const scopeRaw = stringField(raw, 'scope');
  const grantedScopes = scopeRaw
    ? scopeRaw.split(/\s+/).filter(Boolean)
    : SCOPES.split(/\s+/).filter(Boolean);

  return { accessToken, refreshToken, expiresIn, grantedScopes };
}

export async function fetchUser(input: { accessToken: string }): Promise<VlUser> {
  const response = await safeFetch(USERINFO_URL, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      Accept: 'application/json',
    },
  });

  if (response.status === 401 || response.status === 481) {
    throw new VlOAuthError('invalid_client', 'VL userinfo rejected the access token', response.status);
  }
  if (response.status === 403) {
    throw new VlOAuthError('unauthorized', 'VL userinfo denied access', 403);
  }
  if (response.status === 429) {
    throw new VlOAuthError('rate_limited', 'VL userinfo rate-limited', 429);
  }
  if (!response.ok) {
    throw new VlOAuthError(
      'unexpected_response',
      `VL userinfo returned HTTP ${response.status}`,
      response.status
    );
  }

  const raw = (await response.json()) as Record<string, unknown>;
  // VL sends `id` (UUID) today; accept `sub` for forward-compat.
  const sub = stringField(raw, 'sub') ?? stringField(raw, 'id');
  if (!sub) {
    throw new VlOAuthError(
      'unexpected_response',
      'VL userinfo missing required stable identifier (`sub` or `id`)',
      200,
      raw
    );
  }

  return {
    sub,
    email: stringField(raw, 'email'),
    displayName:
      stringField(raw, 'displayName') ?? stringField(raw, 'name') ?? stringField(raw, 'username'),
    avatarUrl: stringField(raw, 'avatarUrl') ?? stringField(raw, 'avatar_url'),
    raw,
  };
}

function mapOAuthError(code: string): VlOAuthErrorCode {
  switch (code) {
    case 'invalid_client':
    case 'unauthorized_client':
      return 'invalid_client';
    case 'invalid_grant':
      return 'invalid_grant';
    case 'invalid_request':
    case 'invalid_scope':
    case 'unsupported_grant_type':
      return 'invalid_request';
    case 'rate_limited':
      return 'rate_limited';
    default:
      return 'unexpected_response';
  }
}

async function safeFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await proxyFetch(url, init);
  } catch (err) {
    throw new VlOAuthError(
      'network_error',
      `Network error talking to VL: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function stringField(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function numberField(obj: Record<string, unknown>, key: string): number | undefined {
  const v = obj[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}
