/**
 * Client-side OAuth for waitlist app
 * Google/Twitch: implicit flow (id_token in hash)
 * Twitter: OAuth 1.0a via server-side request-token endpoint
 */

export type OAuthProvider = 'google' | 'twitch' | 'twitter';

interface OAuthConfig {
  authUrl: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  responseType: string;
}

function getProviderConfig(provider: Exclude<OAuthProvider, 'twitter'>): OAuthConfig {
  const redirectUri = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : 'http://localhost:3000/auth/callback';

  switch (provider) {
    case 'google':
      return {
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        redirectUri,
        scope: 'openid email profile',
        responseType: 'id_token',
      };
    case 'twitch':
      return {
        authUrl: 'https://id.twitch.tv/oauth2/authorize',
        clientId: process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID!,
        redirectUri,
        scope: 'openid user:read:email',
        responseType: 'id_token',
      };
  }
}

export async function signInWithOAuth(provider: OAuthProvider): Promise<void> {
  // Store provider and referral code (if present) in sessionStorage for callback
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('oauth_provider', provider);

    // Preserve referral code from URL
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      sessionStorage.setItem('pending_referral_code', refCode.toUpperCase());
    }
  }

  if (provider === 'twitter') {
    // OAuth 1.0a: get request token from our server first, then redirect
    const response = await fetch('/api/auth/twitter/request-token', { method: 'POST' });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to start X sign in');
    }
    const { oauthToken } = await response.json();
    window.location.href = `https://api.twitter.com/oauth/authenticate?oauth_token=${oauthToken}`;
    return;
  }

  const config = getProviderConfig(provider);
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: config.responseType,
    scope: config.scope,
  });

  // Add a nonce for implicit flow providers
  params.append('nonce', crypto.randomUUID());

  // For Twitch, explicitly request email, picture, and username in ID token
  if (provider === 'twitch') {
    params.append('claims', JSON.stringify({
      id_token: {
        email: null,
        email_verified: null,
        picture: null,
        preferred_username: null,
      },
    }));
  }

  // Redirect to OAuth provider
  window.location.href = `${config.authUrl}?${params.toString()}`;
}

export function extractTokenFromCallback(): string | null {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  return params.get('id_token');
}

export function getStoredProvider(): OAuthProvider | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('oauth_provider') as OAuthProvider | null;
}

export function parseJwtClaims(jwt: string): {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  preferred_username?: string;
  display_name?: string;
  login?: string;
  profile_image_url?: string;
} | null {
  try {
    const [, payloadBase64] = jwt.split('.');
    // Decode base64url → UTF-8 to properly handle non-ASCII names (e.g. Turkish, Chinese)
    const binary = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    return {
      sub: payload.sub,
      email: payload.email,
      // Standard OIDC claims
      name: payload.name,
      picture: payload.picture,
      // Twitch-specific claims
      preferred_username: payload.preferred_username,
      display_name: payload.display_name,
      login: payload.login,
      profile_image_url: payload.profile_image_url,
    };
  } catch {
    return null;
  }
}
