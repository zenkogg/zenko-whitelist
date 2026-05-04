import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { REFERRAL_MAX_POINTS } from '@/lib/referral-config';
import { formatDisplayName } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    // Get userId from request body
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User ID is required' },
        { status: 401 }
      );
    }

    // Find current user by ID
    const currentUser = await prisma.waitlistUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        referralCount: true,
        reputationPoints: true,
        createdAt: true,
        status: true,
        displayName: true,
        referralCode: true,
        username: true,
        usedReferralCode: true,
        games: true,
        oauthAvatarUrl: true,
        customAvatarUrl: true,
        twitterHandle: true,
        oauthProvider: true,
        email: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not Found', message: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate rank using weighted score formula from WAITLIST.md
    // Score = 40% registration order + 60% reputation points
    const rankResult = await prisma.$queryRaw<Array<{ rank: bigint; registration_order: bigint }>>`
      WITH user_order AS (
        SELECT
          id,
          ROW_NUMBER() OVER (ORDER BY created_at) as registration_order,
          COUNT(*) OVER () as total_users,
          reputation_points
        FROM waitlist_users
        WHERE status IN ('PENDING', 'APPROVED')
      ),
      ranked_users AS (
        SELECT
          id,
          registration_order,
          ROW_NUMBER() OVER (
            ORDER BY
              (1.0 - (registration_order / total_users::float)) * 0.4 +
              (LEAST(reputation_points, ${REFERRAL_MAX_POINTS}) / ${REFERRAL_MAX_POINTS}::float) * 0.6
            DESC
          ) as rank
        FROM user_order
      )
      SELECT rank::int as rank, registration_order::int as registration_order
      FROM ranked_users
      WHERE id::text = ${currentUser.id};
    `;

    const estimatedRank = rankResult.length > 0 ? Number(rankResult[0].rank) : null;

    // Registration order across ALL users (not just PENDING) so it always shows
    const regOrderResult = await prisma.$queryRaw<Array<{ registration_order: bigint }>>`
      SELECT registration_order::int as registration_order
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as registration_order
        FROM waitlist_users
      ) t
      WHERE id::text = ${currentUser.id};
    `;
    const registrationOrder = regOrderResult.length > 0 ? Number(regOrderResult[0].registration_order) : null;

    // Get total ranked users count (PENDING + APPROVED)
    const totalPending = await prisma.waitlistUser.count({
      where: { status: { in: ['PENDING', 'APPROVED'] } },
    });

    // Get referral stats for user's referrals
    const referralStats = await prisma.waitlistUser.findMany({
      where: { referredById: currentUser.id },
      select: {
        id: true,
        displayName: true,
        oauthAvatarUrl: true,
        customAvatarUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get referrer info if user used a referral code
    let referrerInfo = null;
    if (currentUser.usedReferralCode) {
      const referrer = await prisma.waitlistUser.findUnique({
        where: { referralCode: currentUser.usedReferralCode },
        select: {
          displayName: true,
          email: true,
          oauthAvatarUrl: true,
          customAvatarUrl: true,
          oauthProvider: true,
          twitterHandle: true,
        },
      });

      if (referrer) {
        referrerInfo = {
          displayName: formatDisplayName(referrer.displayName || 'User', referrer.oauthProvider, referrer.email, referrer.twitterHandle),
          avatarUrl: referrer.customAvatarUrl || referrer.oauthAvatarUrl,
          oauthProvider: referrer.oauthProvider,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: currentUser.id,
          displayName: formatDisplayName(currentUser.displayName || 'User', currentUser.oauthProvider, currentUser.email, currentUser.twitterHandle),
          avatarUrl: currentUser.customAvatarUrl || currentUser.oauthAvatarUrl,
          referralCode: currentUser.referralCode,
          username: currentUser.username,
          usedReferralCode: currentUser.usedReferralCode,
          games: currentUser.games,
          twitterHandle: currentUser.twitterHandle,
          status: currentUser.status,
          createdAt: currentUser.createdAt,
          registrationOrder,
        },
        stats: {
          referralCount: currentUser.referralCount,
          reputationPoints: currentUser.reputationPoints,
          estimatedRank,
          totalPending,
          rankPercentile: estimatedRank && totalPending > 0
            ? Math.round((1 - (estimatedRank / totalPending)) * 100)
            : null,
        },
        referrals: referralStats.map(ref => ({
          id: ref.id,
          displayName: ref.displayName,
          avatarUrl: ref.customAvatarUrl || ref.oauthAvatarUrl,
          joinedAt: ref.createdAt,
        })),
        referrerInfo,
        waitlistStatus: process.env.WAITLIST_STATUS === 'closed' ? 'closed' : 'open',
      },
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
