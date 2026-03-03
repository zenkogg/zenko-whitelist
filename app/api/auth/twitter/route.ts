import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { code, codeVerifier, origin } = await req.json();

    if (!code || !codeVerifier) {
      return NextResponse.json({ error: 'Missing code or code verifier' }, { status: 400 });
    }

    // Capture client info
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      null;
    const userAgent = req.headers.get('user-agent') || null;

    const clientId = process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('Missing Twitter OAuth credentials');
      return NextResponse.json({ error: 'Twitter auth not configured' }, { status: 500 });
    }

    // Redirect URI must match exactly what the client used in the auth request
    const baseUrl = origin || (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000');
    const redirectUri = `${baseUrl}/auth/twitter/callback`;

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      console.error('Twitter token exchange failed:', tokenResponse.status, tokenError);
      return NextResponse.json({ error: 'Failed to exchange token' }, { status: 400 });
    }

    const tokenData = await tokenResponse.json();

    // Decode id_token (OIDC) — no extra API call needed, works on free tier
    const idToken = tokenData.id_token;
    if (!idToken) {
      console.error('Twitter token response missing id_token:', JSON.stringify(tokenData));
      return NextResponse.json({ error: 'Twitter did not return user info' }, { status: 400 });
    }

    const [, payloadB64] = idToken.split('.');
    const payload = JSON.parse(
      Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
    );

    const oauthId = payload.sub;
    const displayName = payload.name || payload.preferred_username || 'User';
    const twitterHandle = payload.preferred_username || null;
    const email: string | null = payload.email || null;

    // Check if user already exists
    const existingUser = await prisma.waitlistUser.findUnique({
      where: {
        oauthProvider_oauthId: {
          oauthProvider: 'twitter',
          oauthId,
        },
      },
    });

    if (existingUser) {
      const updatedUser = await prisma.waitlistUser.update({
        where: { id: existingUser.id },
        data: {
          displayName,
          email: email || existingUser.email,
          twitterId: oauthId,
          twitterHandle,
          twitterConnectedAt: existingUser.twitterConnectedAt || new Date(),
          ipAddress,
          userAgent,
        },
      });
      return NextResponse.json({ user: updatedUser });
    }

    // Generate unique referral code
    const referralCode = await generateUniqueReferralCode();

    // Create new user
    const newUser = await prisma.waitlistUser.create({
      data: {
        oauthProvider: 'twitter',
        oauthId,
        email,
        emailVerified: !!email,
        displayName,
        twitterId: oauthId,
        twitterHandle,
        twitterConnectedAt: new Date(),
        referralCode,
        games: [],
        ipAddress,
        userAgent,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ user: newUser });
  } catch (error) {
    console.error('Twitter auth error:', error instanceof Error ? error.message : error);
    console.error('Twitter auth stack:', error instanceof Error ? error.stack : 'no stack');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function generateUniqueReferralCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  let isUnique = false;

  while (!isUnique) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    const existing = await prisma.waitlistUser.findUnique({
      where: { referralCode: code },
    });
    if (!existing) {
      isUnique = true;
    }
  }

  return code;
}

