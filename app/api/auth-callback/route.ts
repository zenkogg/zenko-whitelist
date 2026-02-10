import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseJwtClaims } from '@/lib/oauth-client';

export async function POST(req: NextRequest) {
  try {
    const { idToken, provider } = await req.json();

    if (!idToken || !provider) {
      return NextResponse.json({ error: 'Missing token or provider' }, { status: 400 });
    }

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
      // Update user if we have better information
      const displayName =
        provider === 'twitch'
          ? claims.preferred_username || claims.login || claims.display_name || existingUser.displayName
          : claims.name || existingUser.displayName;

      const avatarUrl =
        provider === 'twitch'
          ? claims.profile_image_url || claims.picture || existingUser.oauthAvatarUrl
          : claims.picture || existingUser.oauthAvatarUrl;

      const shouldUpdate =
        (displayName && displayName !== existingUser.displayName) ||
        (avatarUrl && avatarUrl !== existingUser.oauthAvatarUrl) ||
        (claims.email && claims.email !== existingUser.email);

      if (shouldUpdate) {
        const updatedUser = await prisma.waitlistUser.update({
          where: { id: existingUser.id },
          data: {
            displayName,
            oauthAvatarUrl: avatarUrl,
            email: claims.email || existingUser.email,
          },
        });
        return NextResponse.json({ user: updatedUser });
      }

      return NextResponse.json({ user: existingUser });
    }

    // Generate unique referral code
    const referralCode = await generateUniqueReferralCode();

    // Create new waitlist user
    const displayName =
      provider === 'twitch'
        ? claims.preferred_username || claims.login || claims.display_name || 'User'
        : claims.name || 'User';

    const avatarUrl =
      provider === 'twitch'
        ? claims.profile_image_url || claims.picture || null
        : claims.picture || null;

    const newUser = await prisma.waitlistUser.create({
      data: {
        oauthProvider: provider,
        oauthId: claims.sub,
        email: claims.email || null,
        emailVerified: provider === 'google',
        displayName,
        oauthAvatarUrl: avatarUrl,
        referralCode,
        games: [],
        status: 'PENDING',
      },
    });

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
