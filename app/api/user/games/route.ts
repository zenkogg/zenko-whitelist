import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { games, userId } = body;

    // Validate user ID
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User ID is required' },
        { status: 401 }
      );
    }

    // Validate games input
    if (!games || !Array.isArray(games)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Games must be an array' },
        { status: 400 }
      );
    }

    if (games.length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'At least one game must be selected' },
        { status: 400 }
      );
    }

    // Validate game values
    const allowedGames = [
      'lol',
      'tft',
      'valorant',
      'cs2',
      'dota2',
      'overwatch2',
      'apex',
      'fortnite',
      'fc26',
      'cod',
      'gta',
    ];

    const invalidGames = games.filter((game: string) => !allowedGames.includes(game));
    if (invalidGames.length > 0) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: `Invalid games: ${invalidGames.join(', ')}`,
          allowedGames,
        },
        { status: 400 }
      );
    }

    // Find user by ID
    const user = await prisma.waitlistUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Not Found', message: 'User not found' },
        { status: 404 }
      );
    }

    // Update user's games and mark registration complete
    const updatedUser = await prisma.waitlistUser.update({
      where: { id: user.id },
      data: {
        games,
        registeredAt: user.registeredAt || new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser.id,
        games: updatedUser.games,
        displayName: updatedUser.displayName,
        referralCode: updatedUser.referralCode,
      },
    });
  } catch (error) {
    console.error('Update games error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
