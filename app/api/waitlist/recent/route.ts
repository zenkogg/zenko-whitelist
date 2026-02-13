import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { limit = 4 } = await request.json();

    // Get recent waitlist users
    const recentUsers = await prisma.waitlistUser.findMany({
      where: { status: 'PENDING' },
      select: {
        id: true,
        displayName: true,
        oauthAvatarUrl: true,
        customAvatarUrl: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const users = recentUsers.map(user => ({
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.customAvatarUrl || user.oauthAvatarUrl,
    }));

    return NextResponse.json({
      success: true,
      data: {
        users,
      },
    });
  } catch (error) {
    console.error('Get recent users error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
