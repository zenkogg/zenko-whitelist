import { NextRequest, NextResponse, after } from 'next/server';
import type { WaitlistStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { syncWaitlistUser } from '@/lib/loops/sync';
import { statusEventFor } from '@/lib/loops/events';

function parseJwtClaims(jwt: string): { email?: string } | null {
  try {
    const [, payloadBase64] = jwt.split('.');
    const payload = JSON.parse(atob(payloadBase64));
    return { email: payload.email };
  } catch {
    return null;
  }
}

function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || '';
  return raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const claims = parseJwtClaims(token);
  if (!claims?.email) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const adminEmails = getAdminEmails();
  if (!adminEmails.includes(claims.email.toLowerCase())) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const users = await prisma.waitlistUser.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      oauthProvider: true,
      email: true,
      displayName: true,
      games: true,
      referralCode: true,
      referralCount: true,
      reputationPoints: true,
      status: true,
      createdAt: true,
      usedReferralCode: true,
      referredBy: { select: { displayName: true, email: true } },
      referrals: { select: { displayName: true, email: true } },
    },
  });

  return NextResponse.json({ users });
}

const VALID_STATUSES = ['PENDING', 'APPROVED', 'INVITED', 'REGISTERED'] as const;

export async function PATCH(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const claims = parseJwtClaims(token);
  if (!claims?.email) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const adminEmails = getAdminEmails();
  if (!adminEmails.includes(claims.email.toLowerCase())) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const body = await request.json();
  const { userId, status } = body as { userId?: string; status?: string };

  if (!userId || !status || !VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
    return NextResponse.json({ error: 'Invalid userId or status' }, { status: 400 });
  }

  // Read the current status BEFORE the update: the Loops event depends on the
  // old→new transition, and syncWaitlistUser re-reads only the post-update row.
  const before = await prisma.waitlistUser.findUnique({
    where: { id: userId },
    select: { status: true },
  });

  const data: Record<string, unknown> = { status };
  if (status === 'INVITED') data.invitedAt = new Date();
  if (status === 'REGISTERED') data.registeredAt = new Date();

  const updated = await prisma.waitlistUser.update({
    where: { id: userId },
    data,
    select: { id: true, status: true },
  });

  // Fire waitlist_approved / waitlist_invited on the transition (REGISTERED is
  // owned by the backend's zenko_registered event, so it yields no event here).
  const event = statusEventFor(before?.status, status as WaitlistStatus);
  after(() => syncWaitlistUser(userId, event ? { event } : {}));

  return NextResponse.json({ user: updated });
}
