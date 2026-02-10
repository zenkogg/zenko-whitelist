import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Configuration from environment or defaults
const REFERRAL_POINTS_PER_SIGNUP = parseInt(process.env.REFERRAL_POINTS_PER_SIGNUP || '10');
const REFERRAL_POINTS_PER_USAGE = parseInt(process.env.REFERRAL_POINTS_PER_USAGE || '10');
const REFERRAL_MAX_COUNT = parseInt(process.env.REFERRAL_MAX_COUNT || '50');

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { referralCode } = body;

    // Validate referral code
    if (!referralCode || typeof referralCode !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Referral code is required' },
        { status: 400 }
      );
    }

    // Normalize referral code (uppercase, trim)
    const normalizedCode = referralCode.trim().toUpperCase();

    if (normalizedCode.length !== 6) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Referral code must be 6 characters' },
        { status: 400 }
      );
    }

    // Use transaction to handle race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Find current user
      const currentUser = await tx.waitlistUser.findFirst({
        where: { email: session.user.email },
      });

      if (!currentUser) {
        throw new Error('USER_NOT_FOUND');
      }

      // Check if user already used a referral code
      if (currentUser.usedReferralCode) {
        throw new Error('ALREADY_USED_CODE');
      }

      // Find referrer by code
      const referrer = await tx.waitlistUser.findUnique({
        where: { referralCode: normalizedCode },
      });

      if (!referrer) {
        throw new Error('INVALID_CODE');
      }

      // Check if user is trying to use their own code
      if (referrer.id === currentUser.id) {
        throw new Error('CANNOT_USE_OWN_CODE');
      }

      // Check if referrer has reached max referral count
      if (referrer.referralCount >= REFERRAL_MAX_COUNT) {
        throw new Error('REFERRER_MAX_REACHED');
      }

      // Update current user: apply referral code and add points
      const updatedUser = await tx.waitlistUser.update({
        where: { id: currentUser.id },
        data: {
          usedReferralCode: normalizedCode,
          referredById: referrer.id,
          reputationPoints: { increment: REFERRAL_POINTS_PER_USAGE },
        },
      });

      // Update referrer: increment referral count and add points
      const updatedReferrer = await tx.waitlistUser.update({
        where: { id: referrer.id },
        data: {
          referralCount: { increment: 1 },
          reputationPoints: { increment: REFERRAL_POINTS_PER_SIGNUP },
        },
      });

      return { updatedUser, updatedReferrer };
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
        case 'INVALID_CODE':
          return NextResponse.json(
            { error: 'Not Found', message: 'Invalid referral code' },
            { status: 404 }
          );
        case 'CANNOT_USE_OWN_CODE':
          return NextResponse.json(
            { error: 'Bad Request', message: 'You cannot use your own referral code' },
            { status: 400 }
          );
        case 'REFERRER_MAX_REACHED':
          return NextResponse.json(
            {
              error: 'Conflict',
              message: `This referral code has reached the maximum limit of ${REFERRAL_MAX_COUNT} referrals`
            },
            { status: 409 }
          );
      }
    }

    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
