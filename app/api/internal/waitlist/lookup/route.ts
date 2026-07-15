/**
 * POST /api/internal/waitlist/lookup
 *
 * Server-to-server lookup called by the zenko-mono backend during Zenko
 * signup. Given an OAuth identity `(provider, oauthId)`, return the matching
 * `WaitlistUser` record (a minimal projection — see the contract below) or
 * `{ match: null }` if there's no row.
 *
 * Auth: shared bearer token via `ZENKO_INTERNAL_TOKEN`. See
 * `lib/internal-auth.ts`.
 *
 * Contract (must match
 * `zenko-mono/packages/backend/src/services/waitlist-match.service.ts`):
 *
 *   Request:
 *     { provider: "google" | "twitch" | "virtualeagues",
 *       oauthId: string }
 *
 *   200 — match:
 *     { match: { id, status, email, displayName, referralCode, createdAt,
 *                reputationPoints } }
 *
 *   200 — no match:
 *     { match: null }
 *
 * `reputationPoints` is the XP the user earned on the waitlist by referring
 * people. Zenko converts it 1:1 into on-chain reputation once the player
 * creates an Account, so this field is the source of truth for that grant and
 * must be captured at signup: `status` flips to REGISTERED moments later, and
 * the points themselves keep accruing if their referrals keep signing up.
 *
 *   400 — invalid body
 *   401 — bad/missing bearer token
 *   503 — server-side `ZENKO_INTERNAL_TOKEN` not configured
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireInternalToken } from '@/lib/internal-auth';

// Whitelist app stores Twitter accounts on `twitterId`/`twitterHandle`, NOT
// on `oauthProvider`/`oauthId` (see prisma/schema.prisma WaitlistUser). So a
// provider="twitter" lookup against the `oauthProvider_oauthId` unique key
// would silently return match:null even for known users — misleading. Stick
// to the providers Zenko signup actually produces (google/twitch/virtualeagues).
const VALID_PROVIDERS = new Set(['google', 'twitch', 'virtualeagues']);

interface LookupBody {
  provider?: unknown;
  oauthId?: unknown;
}

export async function POST(req: NextRequest) {
  const unauthorized = requireInternalToken(req);
  if (unauthorized) return unauthorized;

  let body: LookupBody;
  try {
    body = (await req.json()) as LookupBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { provider, oauthId } = body;
  if (typeof provider !== 'string' || typeof oauthId !== 'string') {
    return NextResponse.json(
      { error: 'Body must include `provider` (string) and `oauthId` (string)' },
      { status: 400 }
    );
  }
  if (!VALID_PROVIDERS.has(provider) || provider.length === 0 || oauthId.length === 0) {
    return NextResponse.json({ error: 'Invalid provider or oauthId' }, { status: 400 });
  }

  try {
    const row = await prisma.waitlistUser.findUnique({
      where: {
        oauthProvider_oauthId: { oauthProvider: provider, oauthId },
      },
      select: {
        id: true,
        status: true,
        email: true,
        displayName: true,
        referralCode: true,
        createdAt: true,
        reputationPoints: true,
      },
    });

    if (!row) return NextResponse.json({ match: null });

    return NextResponse.json({
      match: {
        id: row.id,
        status: row.status,
        email: row.email,
        displayName: row.displayName,
        referralCode: row.referralCode,
        createdAt: row.createdAt.toISOString(),
        reputationPoints: row.reputationPoints,
      },
    });
  } catch (err) {
    console.error('[internal/waitlist/lookup] DB error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
