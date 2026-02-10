import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const REFERRAL_MAX_POINTS = parseInt(process.env.REFERRAL_MAX_POINTS || '500');

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in' },
        { status: 401 }
      );
    }

    // Find current user
    const currentUser = await prisma.waitlistUser.findFirst({
      where: { email: session.user.email },
      select: {
        id: true,
        referralCount: true,
        reputationPoints: true,
        createdAt: true,
        status: true,
        displayName: true,
        referralCode: true,
        usedReferralCode: true,
        games: true,
        oauthAvatarUrl: true,
        customAvatarUrl: true,
        twitterHandle: true,
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
    const rankResult = await prisma.$queryRaw<Array<{ rank: bigint }>>`
      WITH ranked_users AS (
        SELECT
          id,
          ROW_NUMBER() OVER (
            ORDER BY
              (1.0 - (ROW_NUMBER() OVER (ORDER BY created_at) / (COUNT(*) OVER ())::float)) * 0.4 +
              (LEAST(reputation_points, ${REFERRAL_MAX_POINTS}) / ${REFERRAL_MAX_POINTS}::float) * 0.6
            DESC
          ) as rank
        FROM waitlist_users
        WHERE status = 'PENDING'
      )
      SELECT rank
      FROM ranked_users
      WHERE id = ${currentUser.id}::uuid;
    `;

    const estimatedRank = rankResult.length > 0 ? Number(rankResult[0].rank) : null;

    // Get total pending users count
    const totalPending = await prisma.waitlistUser.count({
      where: { status: 'PENDING' },
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

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: currentUser.id,
          displayName: currentUser.displayName,
          avatarUrl: currentUser.customAvatarUrl || currentUser.oauthAvatarUrl,
          referralCode: currentUser.referralCode,
          usedReferralCode: currentUser.usedReferralCode,
          games: currentUser.games,
          twitterHandle: currentUser.twitterHandle,
          status: currentUser.status,
          createdAt: currentUser.createdAt,
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
