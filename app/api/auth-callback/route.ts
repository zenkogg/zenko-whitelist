import { NextRequest, NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isSignInProvider, verifyIdToken } from '@/lib/id-token';
import { respondSignedIn } from '@/lib/session';
import { put } from '@vercel/blob';
import { serverFetch } from '@/lib/server-fetch';
import { generateUniqueUsername } from '@/lib/username';
import { formatDisplayName } from '@/lib/utils';
import { syncWaitlistUser } from '@/lib/loops/sync';
import { LOOPS_EVENTS } from '@/lib/loops/events';
import { betaMailingLists } from '@/lib/loops/client';

export async function POST(req: NextRequest) {
  try {
    const { idToken, provider } = await req.json();

    if (typeof idToken !== 'string' || !idToken || !provider) {
      return NextResponse.json({ error: 'Missing token or provider' }, { status: 400 });
    }

    // The other sign-in options (X, Virtualeagues) never reach this route: their
    // routes exchange a code server side, so the provider names the account there.
    if (!isSignInProvider(provider)) {
      return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
    }

    // Capture client info
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      null;
    const userAgent = req.headers.get('user-agent') || null;

    // The row this mints or refreshes is keyed on the identity in the token, so
    // the issuer's signature over it is the only thing standing between a
    // hand-written payload and someone else's place on the waitlist.
    const verification = await verifyIdToken(provider, idToken);
    if (!verification.ok) {
      return verification.reason === 'misconfigured'
        ? NextResponse.json({ error: 'Sign in unavailable' }, { status: 500 })
        : NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const identity = verification.identity;
    const displayName = identity.displayName || 'User';
    const avatarUrl = identity.avatarUrl || null;

    // Check if user already exists
    const existingUser = await prisma.waitlistUser.findUnique({
      where: {
        oauthProvider_oauthId: {
          oauthProvider: provider,
          oauthId: identity.subject,
        },
      },
    });

    if (existingUser) {
      // Always update on login to refresh username, avatar, and client info
      const updatedUser = await prisma.waitlistUser.update({
        where: { id: existingUser.id },
        data: {
          displayName,
          oauthAvatarUrl: avatarUrl,
          email: identity.email || existingUser.email,
          emailVerified: identity.emailVerified,
          ipAddress,
          userAgent,
        },
      });

      // Returning login: refresh the Loops contact's properties, no event.
      after(() => syncWaitlistUser(updatedUser.id));
      return respondSignedIn(updatedUser);
    }

    // Generate unique referral code
    const referralCode = await generateUniqueReferralCode();

    // Slug derives from the same identity the profile card shows (formatDisplayName),
    // so /r/{username} matches what users see as their name.
    const username = await generateUniqueUsername(
      formatDisplayName(displayName, provider, identity.email, null)
    );

    // Create user first to get the user ID
    const newUser = await prisma.waitlistUser.create({
      data: {
        oauthProvider: provider,
        oauthId: identity.subject,
        email: identity.email || null,
        // The issuer's verdict, not an inference from which provider it is: a
        // signed-in address is only as confirmed as the token says it is. It
        // records the fact rather than gating sign-up, which would turn any
        // provider quirk into a closed door for everyone using that provider.
        emailVerified: identity.emailVerified,
        displayName,
        oauthAvatarUrl: avatarUrl,
        referralCode,
        username,
        games: [],
        status: 'PENDING',
        ipAddress,
        userAgent,
      },
    });

    // New signup: create the Loops contact, fire waitlist_joined, and add them
    // to the beta list (the one event that carries mailingLists). syncWaitlistUser
    // re-reads the row, so this is correct regardless of the avatar update below.
    after(() =>
      syncWaitlistUser(newUser.id, {
        event: LOOPS_EVENTS.WAITLIST_JOINED,
        mailingLists: betaMailingLists(),
      })
    );

    // Download and upload OAuth avatar to blob storage for new users
    if (avatarUrl) {
      const customAvatarUrl = await downloadAndUploadOAuthAvatar(
        avatarUrl,
        newUser.id,
        provider
      );

      // Update user with custom avatar URL if upload was successful
      if (customAvatarUrl) {
        const updatedUser = await prisma.waitlistUser.update({
          where: { id: newUser.id },
          data: { customAvatarUrl },
        });
        return respondSignedIn(updatedUser);
      }
    }

    return respondSignedIn(newUser);
  } catch (error) {
    console.error('Auth callback error:', error);
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

/**
 * Downloads OAuth avatar and uploads it to Vercel Blob storage
 * Returns the blob URL or null if download/upload fails
 */
async function downloadAndUploadOAuthAvatar(
  oauthAvatarUrl: string,
  userId: string,
  provider: string
): Promise<string | null> {
  try {
    console.log(`Downloading OAuth avatar for user ${userId} from ${provider}:`, oauthAvatarUrl);

    // Download the image from OAuth provider
    const response = await serverFetch(oauthAvatarUrl);
    if (!response.ok) {
      console.error('Failed to download OAuth avatar, status:', response.status);
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      console.error('OAuth avatar URL is not an image:', contentType);
      return null;
    }

    // Get the image as a buffer
    const imageBuffer = await response.buffer();

    // Determine file extension from content type
    const extensionMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    const extension = extensionMap[contentType] || 'jpg';

    // Generate unique filename
    const filename = `${userId}-oauth-${Date.now()}.${extension}`;

    // Determine environment prefix
    const isProduction = process.env.VERCEL_ENV === 'production';
    const envPrefix = isProduction ? 'production' : 'staging';
    const blobPath = `${envPrefix}/avatars/${filename}`;

    console.log('Uploading OAuth avatar to Vercel Blob:', {
      path: blobPath,
      size: imageBuffer.length,
      type: contentType,
      environment: envPrefix,
    });

    // Upload to Vercel Blob
    const blob = await put(blobPath, imageBuffer, {
      access: 'public',
      contentType: contentType,
    });

    console.log('OAuth avatar upload successful:', blob.url);
    return blob.url;
  } catch (error) {
    console.error('Failed to download and upload OAuth avatar:', error);
    return null;
  }
}
