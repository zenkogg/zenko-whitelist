import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatDisplayName } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { userId, limit = 10 } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User ID is required' },
        { status: 401 }
      );
    }

    // Get top users ranked by referral count only
    const leaderboardResult = await prisma.$queryRaw<Array<{
      id: string;
      display_name: string;
      oauth_provider: string;
      email: string | null;
      twitter_handle: string | null;
      oauth_avatar_url: string | null;
      custom_avatar_url: string | null;
      referral_count: number;
      registration_order: bigint;
      rank: bigint;
    }>>`
      WITH user_order AS (
        SELECT
          id,
          display_name,
          oauth_provider,
          email,
          twitter_handle,
          oauth_avatar_url,
          custom_avatar_url,
          referral_count,
          ROW_NUMBER() OVER (ORDER BY created_at) as registration_order
        FROM waitlist_users
        WHERE status IN ('PENDING', 'APPROVED')
      ),
      ranked_users AS (
        SELECT
          id,
          display_name,
          oauth_provider,
          email,
          twitter_handle,
          oauth_avatar_url,
          custom_avatar_url,
          referral_count,
          registration_order,
          ROW_NUMBER() OVER (
            ORDER BY referral_count DESC, registration_order ASC
          ) as rank
        FROM user_order
      )
      SELECT
        id::text,
        display_name,
        oauth_provider,
        email,
        twitter_handle,
        oauth_avatar_url,
        custom_avatar_url,
        referral_count::int,
        registration_order::int,
        rank::int
      FROM ranked_users
      ORDER BY rank
      LIMIT ${limit};
    `;

    const leaderboard = leaderboardResult.map(entry => ({
      rank: Number(entry.rank),
      displayName: formatDisplayName(entry.display_name, entry.oauth_provider, entry.email, entry.twitter_handle),
      avatarUrl: entry.custom_avatar_url || entry.oauth_avatar_url,
      referralCount: entry.referral_count,
      registrationOrder: Number(entry.registration_order),
      isCurrentUser: entry.id === userId,
    }));

    // Get current user's position if not in top leaderboard
    const currentUserInTop = leaderboard.some(entry => entry.isCurrentUser);
    let currentUserEntry = null;

    if (!currentUserInTop) {
      const userResult = await prisma.$queryRaw<Array<{
        id: string;
        display_name: string;
        oauth_provider: string;
        email: string | null;
        twitter_handle: string | null;
        oauth_avatar_url: string | null;
        custom_avatar_url: string | null;
        referral_count: number;
        registration_order: bigint;
        rank: bigint;
      }>>`
        WITH user_order AS (
          SELECT
            id,
            display_name,
            oauth_provider,
            email,
            twitter_handle,
            oauth_avatar_url,
            custom_avatar_url,
            referral_count,
            ROW_NUMBER() OVER (ORDER BY created_at) as registration_order
          FROM waitlist_users
          WHERE status IN ('PENDING', 'APPROVED')
        ),
        ranked_users AS (
          SELECT
            id,
            display_name,
            oauth_provider,
            email,
            twitter_handle,
            oauth_avatar_url,
            custom_avatar_url,
            referral_count,
            registration_order,
            ROW_NUMBER() OVER (
              ORDER BY referral_count DESC, registration_order ASC
            ) as rank
          FROM user_order
        )
        SELECT
          id::text,
          display_name,
          oauth_provider,
          email,
          twitter_handle,
          oauth_avatar_url,
          custom_avatar_url,
          referral_count::int,
          registration_order::int,
          rank::int
        FROM ranked_users
        WHERE id::text = ${userId};
      `;

      if (userResult.length > 0) {
        const entry = userResult[0];
        currentUserEntry = {
          rank: Number(entry.rank),
          displayName: formatDisplayName(entry.display_name, entry.oauth_provider, entry.email, entry.twitter_handle),
          avatarUrl: entry.custom_avatar_url || entry.oauth_avatar_url,
          referralCount: entry.referral_count,
          registrationOrder: Number(entry.registration_order),
          isCurrentUser: true,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        leaderboard,
        currentUserEntry,
      },
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
