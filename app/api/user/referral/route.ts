import { NextRequest, NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { REFERRAL_MAX_COUNT, REFERRAL_POINTS_PER_SIGNUP, REFERRAL_POINTS_PER_USAGE } from '@/lib/referral-config';
import { resolveReferralIdentifier } from '@/lib/username';
import { syncWaitlistUser } from '@/lib/loops/sync';
import { LOOPS_EVENTS, idempotencyKey } from '@/lib/loops/events';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { referralCode, userId } = body;

    // Validate userId
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User ID is required' },
        { status: 401 }
      );
    }

    // Validate referral code
    if (!referralCode || typeof referralCode !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Referral code is required' },
        { status: 400 }
      );
    }

    // Resolve referrer up front (accepts either 6-char code or username slug).
    const referrer = await resolveReferralIdentifier(referralCode);
    if (!referrer) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Invalid referral code' },
        { status: 404 }
      );
    }

    // Use transaction to handle race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Find current user by ID
      const currentUser = await tx.waitlistUser.findUnique({
        where: { id: userId },
      });

      if (!currentUser) {
        throw new Error('USER_NOT_FOUND');
      }

      // Check if user already used a referral code
      if (currentUser.usedReferralCode) {
        throw new Error('ALREADY_USED_CODE');
      }

      // Check if user is trying to use their own code
      if (referrer.id === currentUser.id) {
        throw new Error('CANNOT_USE_OWN_CODE');
      }

      // Referrer earns points only for the first REFERRAL_MAX_COUNT referrals
      const referrerEarnsPoints = referrer.referralCount < REFERRAL_MAX_COUNT;

      // Update current user: apply referral code and add points.
      // Always store the canonical 6-char referrer code, even if the visitor
      // arrived via a username slug — keeps downstream attribution / stats logic untouched.
      const updatedUser = await tx.waitlistUser.update({
        where: { id: currentUser.id },
        data: {
          usedReferralCode: referrer.referralCode,
          referredById: referrer.id,
          reputationPoints: { increment: REFERRAL_POINTS_PER_USAGE },
        },
      });

      // Update referrer: always increment count, only add points if under cap
      const updatedReferrer = await tx.waitlistUser.update({
        where: { id: referrer.id },
        data: {
          referralCount: { increment: 1 },
          ...(referrerEarnsPoints && { reputationPoints: { increment: REFERRAL_POINTS_PER_SIGNUP } }),
        },
      });

      return { updatedUser, updatedReferrer };
    });

    // Both sides changed: the referred user applied a code, the referrer earned one.
    // referral_earned can legitimately recur for a referrer, so key it on both ids.
    //
    // Awaited, not fire-and-forget: `after` only extends the serverless
    // invocation for the promise its callback RETURNS (Next hands that one to
    // Vercel's waitUntil). A floating promise inside a sync callback is untracked
    // and dies when the invocation is torn down, silently dropping both events.
    after(async () => {
      await Promise.all([
        syncWaitlistUser(result.updatedUser.id, {
          event: LOOPS_EVENTS.WAITLIST_REFERRAL_APPLIED,
          eventProperties: { referralCode: result.updatedUser.usedReferralCode ?? '' },
        }),
        syncWaitlistUser(result.updatedReferrer.id, {
          event: LOOPS_EVENTS.WAITLIST_REFERRAL_EARNED,
          eventProperties: { referralCount: result.updatedReferrer.referralCount },
          idempotencyKey: idempotencyKey(
            LOOPS_EVENTS.WAITLIST_REFERRAL_EARNED,
            result.updatedReferrer.id,
            result.updatedUser.id
          ),
        }),
      ]);
    });

    return NextResponse.json({
      success: true,
      message: 'Referral code applied successfully',
      data: {
        user: {
          id: result.updatedUser.id,
          usedReferralCode: result.updatedUser.usedReferralCode,
          reputationPoints: result.updatedUser.reputationPoints,
        },
        referrer: {
          displayName: result.updatedReferrer.displayName,
          referralCount: result.updatedReferrer.referralCount,
        },
      },
    });
  } catch (error) {
    console.error('Apply referral code error:', error);

    // Handle custom errors
    if (error instanceof Error) {
      switch (error.message) {
        case 'USER_NOT_FOUND':
          return NextResponse.json(
            { error: 'Not Found', message: 'User not found' },
            { status: 404 }
          );
        case 'ALREADY_USED_CODE':
          return NextResponse.json(
            { error: 'Conflict', message: 'You have already used a referral code' },
            { status: 409 }
          );
        case 'CANNOT_USE_OWN_CODE':
          return NextResponse.json(
            { error: 'Bad Request', message: 'You cannot use your own referral code' },
            { status: 400 }
          );
      }
    }

    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
