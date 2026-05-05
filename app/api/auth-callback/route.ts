import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseJwtClaims } from '@/lib/oauth-client';
import { put } from '@vercel/blob';
import { serverFetch } from '@/lib/server-fetch';
import { generateUniqueUsername } from '@/lib/username';
import { formatDisplayName } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const { idToken, provider } = await req.json();

    if (!idToken || !provider) {
      return NextResponse.json({ error: 'Missing token or provider' }, { status: 400 });
    }

    // Capture client info
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      null;
    const userAgent = req.headers.get('user-agent') || null;

    // Parse claims from JWT (in production, you'd verify the signature)
    const claims = parseJwtClaims(idToken);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    // Log claims for debugging (remove in production)
    console.log('OAuth claims received:', JSON.stringify(claims, null, 2));

    // Check if user already exists
    const existingUser = await prisma.waitlistUser.findUnique({
      where: {
        oauthProvider_oauthId: {
          oauthProvider: provider,
          oauthId: claims.sub,
        },
      },
    });

    if (existingUser) {
      // Always update user info on login to keep data fresh
      // Extract displayName from OAuth claims
      const displayName =
        provider === 'twitch'
          ? claims.preferred_username || claims.login || claims.display_name || 'User'
          : claims.name || 'User';

      const avatarUrl =
        provider === 'twitch'
          ? claims.profile_image_url || claims.picture || null
          : claims.picture || null;

      // Always update on login to refresh username, avatar, and client info
      const updatedUser = await prisma.waitlistUser.update({
        where: { id: existingUser.id },
        data: {
          displayName,
          oauthAvatarUrl: avatarUrl,
          email: claims.email || existingUser.email,
          ipAddress,
          userAgent,
        },
      });

      console.log(`Updated user ${updatedUser.id} with displayName: ${displayName}`);
      return NextResponse.json({ user: updatedUser });
    }

    // Generate unique referral code
    const referralCode = await generateUniqueReferralCode();

    // Create new waitlist user
    const displayName =
      provider === 'twitch'
        ? claims.preferred_username || claims.login || claims.display_name || 'User'
        : claims.name || 'User';

    const oauthAvatarUrl =
      provider === 'twitch'
        ? claims.profile_image_url || claims.picture || null
        : claims.picture || null;

    // Slug derives from the same identity the profile card shows (formatDisplayName),
    // so /r/{username} matches what users see as their name.
    const username = await generateUniqueUsername(
      formatDisplayName(displayName, provider, claims.email, null)
    );

    // Create user first to get the user ID
    const newUser = await prisma.waitlistUser.create({
      data: {
        oauthProvider: provider,
        oauthId: claims.sub,
        email: claims.email || null,
        emailVerified: provider === 'google',
        displayName,
        oauthAvatarUrl: oauthAvatarUrl,
        referralCode,
        username,
        games: [],
        status: 'PENDING',
        ipAddress,
        userAgent,
      },
    });

    // Download and upload OAuth avatar to blob storage for new users
    if (oauthAvatarUrl) {
      const customAvatarUrl = await downloadAndUploadOAuthAvatar(
        oauthAvatarUrl,
        newUser.id,
        provider
      );

      // Update user with custom avatar URL if upload was successful
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
