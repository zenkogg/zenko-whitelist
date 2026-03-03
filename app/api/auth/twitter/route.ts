import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

function buildOAuthParams(consumerKey: string, oauthToken: string, extra: Record<string, string> = {}) {
  return {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: oauthToken,
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
  try {
    const { oauthToken, oauthVerifier } = await req.json();
    const oauthTokenSecret = req.cookies.get('twitter_oauth_secret')?.value;

    if (!oauthToken || !oauthVerifier) {
      return NextResponse.json({ error: 'Missing oauth_token or oauth_verifier' }, { status: 400 });
    }
    if (!oauthTokenSecret) {
      return NextResponse.json({ error: 'Session expired, please try again' }, { status: 400 });
    }

    const consumerKey = process.env.TWITTER_API_KEY;
    const consumerSecret = process.env.TWITTER_API_SECRET;

    if (!consumerKey || !consumerSecret) {
      return NextResponse.json({ error: 'Twitter API not configured' }, { status: 500 });
    }

    // Capture client info
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      null;
    const userAgent = req.headers.get('user-agent') || null;

    const url = 'https://api.twitter.com/oauth/access_token';
    const params = buildOAuthParams(consumerKey, oauthToken, { oauth_verifier: oauthVerifier });
    const signature = sign('POST', url, params, consumerSecret, oauthTokenSecret);
    const header = authHeader({ ...params, oauth_signature: signature });

    const tokenResponse = await fetch(url, {
      method: 'POST',
      headers: { Authorization: header },
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      console.error('Twitter access_token failed:', tokenResponse.status, err);
      return NextResponse.json({ error: 'Failed to authenticate with X' }, { status: 400 });
    }

    const text = await tokenResponse.text();
    const parsed = new URLSearchParams(text);

    const oauthId = parsed.get('user_id');
    const screenName = parsed.get('screen_name');

    if (!oauthId || !screenName) {
      console.error('Missing user_id or screen_name in access_token response:', text);
      return NextResponse.json({ error: 'Invalid response from X' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.waitlistUser.findUnique({
      where: { oauthProvider_oauthId: { oauthProvider: 'twitter', oauthId } },
    });

    const res = existingUser
      ? NextResponse.json({
          user: await prisma.waitlistUser.update({
            where: { id: existingUser.id },
            data: {
              twitterId: oauthId,
              twitterHandle: screenName,
              twitterConnectedAt: existingUser.twitterConnectedAt || new Date(),
              ipAddress,
              userAgent,
            },
          }),
        })
      : NextResponse.json({
          user: await prisma.waitlistUser.create({
            data: {
              oauthProvider: 'twitter',
              oauthId,
              email: null,
              emailVerified: false,
              displayName: screenName,
              twitterId: oauthId,
              twitterHandle: screenName,
              twitterConnectedAt: new Date(),
              referralCode: await generateUniqueReferralCode(),
              games: [],
              ipAddress,
              userAgent,
              status: 'PENDING',
            },
          }),
        });

    // Clear the temporary oauth secret cookie
    res.cookies.delete('twitter_oauth_secret');
    return res;
  } catch (error) {
    console.error('Twitter auth error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function generateUniqueReferralCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  let isUnique = false;

  while (!isUnique) {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const existing = await prisma.waitlistUser.findUnique({ where: { referralCode: code } });
    if (!existing) isUnique = true;
  }

  return code;
}
