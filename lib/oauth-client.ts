/**
 * Client-side OAuth for waitlist app
 * Uses implicit flow to avoid server-side HTTP requests
 */

export type OAuthProvider = 'google' | 'twitch' | 'twitter';

interface OAuthConfig {
  authUrl: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  responseType: string;
}

function getProviderConfig(provider: OAuthProvider): OAuthConfig {
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
    case 'twitter':
      return {
        authUrl: 'https://twitter.com/i/oauth2/authorize',
        clientId: process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID!,
        redirectUri: typeof window !== 'undefined'
          ? `${window.location.origin}/auth/twitter/callback`
          : 'http://localhost:3000/auth/twitter/callback',
        scope: 'tweet.read users.read',
        responseType: 'code',
      };
  }
}

/**
 * Generate PKCE code verifier and challenge for Twitter OAuth 2.0
 */
async function generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return { codeVerifier, codeChallenge };
}

export async function signInWithOAuth(provider: OAuthProvider): Promise<void> {
  const config = getProviderConfig(provider);

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

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: config.responseType,
    scope: config.scope,
  });

  if (provider === 'twitter') {
    // Twitter requires PKCE with S256
    const { codeVerifier, codeChallenge } = await generatePKCE();
    localStorage.setItem('twitter_code_verifier', codeVerifier);
    params.append('code_challenge', codeChallenge);
    params.append('code_challenge_method', 'S256');
    params.append('state', crypto.randomUUID());
  } else {
    // Add a nonce for implicit flow providers
    params.append('nonce', crypto.randomUUID());
  }

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
