import { NextRequest, NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncWaitlistUser } from '@/lib/loops/sync';
import { requireSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    if (!session.ok) return session.response;

    // Parse request body
    const body = await request.json();
    const { twitterId, twitterHandle } = body;

    // Validate Twitter data
    if (!twitterId || typeof twitterId !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Twitter ID is required' },
        { status: 400 }
      );
    }

    if (!twitterHandle || typeof twitterHandle !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Twitter handle is required' },
        { status: 400 }
      );
    }

    // Normalize Twitter handle (remove @ if present)
    const normalizedHandle = twitterHandle.trim().replace(/^@/, '');

    const currentUser = await prisma.waitlistUser.findUnique({
      where: { id: session.userId },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not Found', message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if Twitter ID is already connected to another user
    const existingTwitterUser = await prisma.waitlistUser.findFirst({
      where: {
        twitterId: twitterId,
        id: { not: currentUser.id }, // Exclude current user
      },
    });

    if (existingTwitterUser) {
      return NextResponse.json(
        {
          error: 'Conflict',
          message: 'This Twitter account is already connected to another user'
        },
        { status: 409 }
      );
    }

    // Update user with Twitter connection
    const updatedUser = await prisma.waitlistUser.update({
      where: { id: currentUser.id },
      data: {
        twitterId,
        twitterHandle: normalizedHandle,
        twitterConnectedAt: new Date(),
      },
    });

    after(() => syncWaitlistUser(updatedUser.id));

    return NextResponse.json({
      success: true,
      message: 'Twitter account connected successfully',
      data: {
        id: updatedUser.id,
        twitterId: updatedUser.twitterId,
        twitterHandle: updatedUser.twitterHandle,
        twitterConnectedAt: updatedUser.twitterConnectedAt,
      },
    });
  } catch (error) {
    console.error('Connect Twitter error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
