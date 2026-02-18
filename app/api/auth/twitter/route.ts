import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';
import { serverFetch } from '@/lib/server-fetch';

export async function POST(req: NextRequest) {
  try {
    const { code, codeVerifier } = await req.json();

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

    // Determine redirect URI (must match what was used in the auth request)
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    const redirectUri = `${baseUrl}/auth/twitter/callback`;

    // Exchange authorization code for access token
    const tokenResponse = await serverFetch('https://api.twitter.com/2/oauth2/token', {
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
      console.error('Twitter token exchange failed:', tokenError);
      return NextResponse.json({ error: 'Failed to exchange token' }, { status: 400 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Fetch user profile from Twitter
    const userResponse = await serverFetch('https://api.twitter.com/2/users/me?user.fields=id,name,username,profile_image_url,verified_type', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      const userError = await userResponse.text();
      console.error('Twitter user fetch failed:', userError);
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 400 });
    }

    const userJson = await userResponse.json();
    const twitterUser = userJson.data;

    const oauthId = twitterUser.id;
    const displayName = twitterUser.name || twitterUser.username || 'User';
    const twitterHandle = twitterUser.username || null;
    const email = twitterUser.email || null;
    const oauthAvatarUrl = twitterUser.profile_image_url?.replace('_normal', '_400x400') || null;

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
      // Re-upload avatar if missing
      let customAvatarUrl = existingUser.customAvatarUrl;
      if (!customAvatarUrl && oauthAvatarUrl) {
        customAvatarUrl = await downloadAndUploadAvatar(oauthAvatarUrl, existingUser.id);
      }

      const updatedUser = await prisma.waitlistUser.update({
        where: { id: existingUser.id },
        data: {
          displayName,
          oauthAvatarUrl,
          email: email || existingUser.email,
          twitterId: oauthId,
          twitterHandle,
          twitterConnectedAt: existingUser.twitterConnectedAt || new Date(),
          ipAddress,
          userAgent,
          ...(customAvatarUrl && !existingUser.customAvatarUrl ? { customAvatarUrl } : {}),
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
        email: email,
        emailVerified: !!email,
        displayName,
        oauthAvatarUrl,
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

    // Download and upload avatar to blob storage
    if (oauthAvatarUrl) {
      const customAvatarUrl = await downloadAndUploadAvatar(oauthAvatarUrl, newUser.id);
      if (customAvatarUrl) {
        const updatedUser = await prisma.waitlistUser.update({
          where: { id: newUser.id },
          data: { customAvatarUrl },
        });
        return NextResponse.json({ user: updatedUser });
      }
    }

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

async function downloadAndUploadAvatar(
  avatarUrl: string,
  userId: string
): Promise<string | null> {
  try {
    const response = await serverFetch(avatarUrl);
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) return null;

    const imageBuffer = await response.buffer();
    const extensionMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const extension = extensionMap[contentType] || 'jpg';
    const filename = `${userId}-oauth-${Date.now()}.${extension}`;

    const isProduction = process.env.VERCEL_ENV === 'production';
    const envPrefix = isProduction ? 'production' : 'staging';
    const blobPath = `${envPrefix}/avatars/${filename}`;

    const blob = await put(blobPath, imageBuffer, {
      access: 'public',
      contentType,
    });

    return blob.url;
  } catch (error) {
    console.error('Failed to download/upload Twitter avatar:', error);
    return null;
  }
}
