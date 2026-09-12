/**
 * Binds the X connection a sign-in already proved.
 *
 * Nothing a caller can type is evidence of owning an X account, so this route
 * reads none of it. The one proof this app holds is the OAuth 1.0a exchange in
 * app/api/auth/twitter, which records the verified user id as the row's sign-in
 * identity and writes the verified handle beside it. A row with no such exchange
 * behind it has no X account to bind, and is refused rather than believed.
 */

import { NextRequest, NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncWaitlistUser } from '@/lib/loops/sync';
import { requireSession } from '@/lib/session';

interface VerifiedConnection {
  twitterId: string;
  twitterHandle: string;
}

/**
 * The verified X identity on a row, or null when the row carries none.
 *
 * It reads the sign-in identity rather than the twitter_id column because that
 * is the part no profile write can reach: the exchange is the only writer of
 * oauthProvider and oauthId, so a value found there was proved, not asserted.
 */
function verifiedConnection(user: {
  oauthProvider: string;
  oauthId: string;
  twitterHandle: string | null;
}): VerifiedConnection | null {
  if (user.oauthProvider !== 'twitter' || !user.oauthId || !user.twitterHandle) {
    return null;
  }

  return { twitterId: user.oauthId, twitterHandle: user.twitterHandle };
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    if (!session.ok) return session.response;

    const currentUser = await prisma.waitlistUser.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        oauthProvider: true,
        oauthId: true,
        twitterConnectedAt: true,
        twitterHandle: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not Found', message: 'User not found' },
        { status: 404 }
      );
    }

    const verified = verifiedConnection(currentUser);

    if (!verified) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Sign in with X to connect an X account' },
        { status: 403 }
      );
    }

    // The column is unique, so a row holding this id would make the update throw
    // instead of answer. Reporting the clash is the honest end of that.
    const existingTwitterUser = await prisma.waitlistUser.findFirst({
      where: {
        twitterId: verified.twitterId,
        id: { not: currentUser.id },
      },
    });

    if (existingTwitterUser) {
      return NextResponse.json(
        {
          error: 'Conflict',
          message: 'This X account is already connected to another user'
        },
        { status: 409 }
      );
    }

    const updatedUser = await prisma.waitlistUser.update({
      where: { id: currentUser.id },
      data: {
        twitterId: verified.twitterId,
        twitterHandle: verified.twitterHandle,
        // Re-binding what is already there is not a new connection, so the date
        // the account was first connected survives it.
        twitterConnectedAt: currentUser.twitterConnectedAt ?? new Date(),
      },
    });

    after(() => syncWaitlistUser(updatedUser.id));

    return NextResponse.json({
      success: true,
      message: 'X account connected',
      data: {
        id: updatedUser.id,
        twitterId: updatedUser.twitterId,
        twitterHandle: updatedUser.twitterHandle,
        twitterConnectedAt: updatedUser.twitterConnectedAt,
      },
    });
  } catch (error) {
    console.error('Connect X error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
