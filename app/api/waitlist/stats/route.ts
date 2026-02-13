import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get total count of waitlist users
    const totalCount = await prisma.waitlistUser.count({
      where: { status: 'PENDING' },
    });

    // Get recent users for avatar group
    const recentUsers = await prisma.waitlistUser.findMany({
      where: { status: 'PENDING' },
      select: {
        id: true,
        displayName: true,
        oauthAvatarUrl: true,
        customAvatarUrl: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const users = recentUsers.map(user => ({
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.customAvatarUrl || user.oauthAvatarUrl,
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalCount,
        recentUsers: users,
        waitlistStatus: 'open', // Could be dynamic based on business logic
      },
    });
  } catch (error) {
    console.error('Get waitlist stats error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
