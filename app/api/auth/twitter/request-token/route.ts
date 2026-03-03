import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { proxyFetch } from '@/lib/proxy-fetch';

function buildOAuthParams(consumerKey: string, extra: Record<string, string> = {}) {
  return {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
    ...extra,
  };
}

function sign(method: string, url: string, params: Record<string, string>, consumerSecret: string, tokenSecret = '') {
  const sorted = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const base = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(sorted)}`;
  const key = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  return crypto.createHmac('sha1', key).update(base).digest('base64');
}

function authHeader(params: Record<string, string>) {
  const parts = Object.entries(params)
    .filter(([k]) => k.startsWith('oauth_'))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(', ');
  return `OAuth ${parts}`;
}

export async function POST(req: NextRequest) {
  const consumerKey = process.env.TWITTER_API_KEY;
  const consumerSecret = process.env.TWITTER_API_SECRET;

  if (!consumerKey || !consumerSecret) {
    return NextResponse.json({ error: 'Twitter API not configured' }, { status: 500 });
  }

  const origin = req.headers.get('origin') || 'http://localhost:3000';
  const callbackUrl = `${origin}/auth/twitter/callback`;
  const url = 'https://api.twitter.com/oauth/request_token';

  const params = buildOAuthParams(consumerKey, { oauth_callback: callbackUrl });
  const signature = sign('POST', url, params, consumerSecret);
  const header = authHeader({ ...params, oauth_signature: signature });

  const response = await proxyFetch(url, {
    method: 'POST',
    headers: { Authorization: header },
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Twitter request_token failed:', response.status, err);
    return NextResponse.json({ error: 'Failed to get request token from X' }, { status: 400 });
  }

  const text = await response.text();
  const parsed = new URLSearchParams(text);
  const oauthToken = parsed.get('oauth_token');
  const oauthTokenSecret = parsed.get('oauth_token_secret');

  if (!oauthToken || !oauthTokenSecret) {
    console.error('Missing oauth_token or oauth_token_secret in response:', text);
    return NextResponse.json({ error: 'Invalid response from X' }, { status: 400 });
  }

  const res = NextResponse.json({ oauthToken });
  res.cookies.set('twitter_oauth_secret', oauthTokenSecret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300, // 5 minutes
    path: '/',
  });
  return res;
}
