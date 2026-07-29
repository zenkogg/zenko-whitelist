import { NextRequest, NextResponse, after } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isUsernameAvailable, validateUsernameInput } from '@/lib/username';
import { syncWaitlistUser } from '@/lib/loops/sync';

// GET /api/user/username?username=foo&userId=bar
// Lightweight availability check used by the edit-mode live feedback.
// Treats the caller's own current username as available (no false 'taken' on no-op).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('username') ?? '';
  const userId = searchParams.get('userId') ?? '';

  const validation = validateUsernameInput(raw);
  if (!validation.ok) {
    return NextResponse.json({ available: false, error: validation.error });
  }

  const available = await isUsernameAvailable(validation.value, userId);
  if (!available) {
    return NextResponse.json({ available: false, error: 'Already taken' });
  }
  return NextResponse.json({ available: true, value: validation.value });
}

// PATCH /api/user/username
// Body: { userId: string, username: string }
// Validates + persists. Server is the source of truth — uniqueness enforced by the
// Prisma unique index, and we surface P2002 as a 409 in case two users race.
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, username } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User ID is required' },
        { status: 401 }
      );
    }
    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Username is required' },
        { status: 400 }
      );
    }

    const validation = validateUsernameInput(username);
    if (!validation.ok) {
      return NextResponse.json(
        { error: 'Bad Request', message: validation.error },
        { status: 400 }
      );
    }

    try {
      const updated = await prisma.waitlistUser.update({
        where: { id: userId },
        data: { username: validation.value },
        select: { id: true, username: true },
      });
      after(() => syncWaitlistUser(updated.id));
      return NextResponse.json({ success: true, data: { user: updated } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
          return NextResponse.json(
            { error: 'Conflict', message: 'That username is already taken' },
            { status: 409 }
          );
        }
        if (err.code === 'P2025') {
          return NextResponse.json(
            { error: 'Not Found', message: 'User not found' },
            { status: 404 }
          );
        }
      }
      throw err;
    }
  } catch (error) {
    console.error('Update username error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
