/**
 * POST /api/internal/waitlist/mark-registered
 *
 * Idempotent write-back called by the zenko-mono backend right after a
 * successful waitlist match: flip the `WaitlistUser.status` to
 * `REGISTERED` and stamp `registeredAt` so the whitelist app's own admin
 * views reflect that the user actually signed up on Zenko.
 *
 * Idempotency: calling this twice for the same id is a no-op. We always
 * write `status = REGISTERED` and overwrite `registeredAt` with the
 * provided timestamp (or now), so concurrent calls converge on the same
 * end state.
 *
 * Auth: shared bearer token via `ZENKO_INTERNAL_TOKEN`. See
 * `lib/internal-auth.ts`.
 *
 * Contract (must match
 * `zenko-mono/packages/backend/src/services/waitlist-match.service.ts`):
 *
 *   Request:
 *     { waitlistUserId: string, registeredAt?: string (ISO-8601) }
 *
 *   200:
 *     { ok: true, status: "REGISTERED" }
 *
 *   400 — invalid body / bad timestamp
 *   401 — bad/missing bearer token
 *   404 — unknown waitlistUserId
 *   503 — server-side `ZENKO_INTERNAL_TOKEN` not configured
 */

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireInternalToken } from '@/lib/internal-auth';

interface MarkRegisteredBody {
  waitlistUserId?: unknown;
  registeredAt?: unknown;
}

export async function POST(req: NextRequest) {
  const unauthorized = requireInternalToken(req);
  if (unauthorized) return unauthorized;

  let body: MarkRegisteredBody;
  try {
    body = (await req.json()) as MarkRegisteredBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { waitlistUserId, registeredAt } = body;
  if (typeof waitlistUserId !== 'string' || waitlistUserId.length === 0) {
    return NextResponse.json(
      { error: 'Body must include `waitlistUserId` (string)' },
      { status: 400 }
    );
  }

  let registeredAtDate: Date;
  if (registeredAt === undefined || registeredAt === null) {
    registeredAtDate = new Date();
  } else if (typeof registeredAt === 'string') {
    const parsed = new Date(registeredAt);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json(
        { error: '`registeredAt` must be a valid ISO-8601 timestamp' },
        { status: 400 }
      );
    }
    registeredAtDate = parsed;
  } else {
    return NextResponse.json(
      { error: '`registeredAt` must be an ISO-8601 string if provided' },
      { status: 400 }
    );
  }

  try {
    await prisma.waitlistUser.update({
      where: { id: waitlistUserId },
      data: { status: 'REGISTERED', registeredAt: registeredAtDate },
    });
    return NextResponse.json({ ok: true, status: 'REGISTERED' });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2025'
    ) {
      return NextResponse.json({ error: 'WaitlistUser not found' }, { status: 404 });
    }
    console.error('[internal/waitlist/mark-registered] DB error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
