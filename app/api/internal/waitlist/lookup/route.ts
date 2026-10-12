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
 *       oauthId: string, register?: boolean }
 *
 *   200 — match:
 *     { match: { id, status, email, displayName, referralCode, createdAt,
 *                reputationPoints, referralCount, referredBy } }
 *
 *   200 — no match:
 *     { match: null }
 *
 * `reputationPoints` is the XP the user earned on the waitlist by referring
 * people. Zenko converts it 1:1 into on-chain reputation once the player
 * creates an Account, so this field is the source of truth for that grant and
 * must be captured at signup. `register: true` freezes further code application
 * before returning the snapshot. Points from other referrals can still accrue;
 * this lookup does not grant them or change the original registration time.
 *
 *   400 — invalid body
 *   401 — bad/missing bearer token
 *   503 — server-side `ZENKO_INTERNAL_TOKEN` not configured
 */

import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInternalToken } from "@/lib/internal-auth";
import { syncWaitlistUser } from "@/lib/loops/sync";

// Whitelist app stores Twitter accounts on `twitterId`/`twitterHandle`, NOT
// on `oauthProvider`/`oauthId` (see prisma/schema.prisma WaitlistUser). So a
// provider="twitter" lookup against the `oauthProvider_oauthId` unique key
// would silently return match:null even for known users — misleading. Stick
// to the providers Zenko signup actually produces (google/twitch/virtualeagues).
const VALID_PROVIDERS = new Set(["google", "twitch", "virtualeagues"]);

interface LookupBody {
  provider?: unknown;
  oauthId?: unknown;
  register?: unknown;
}

export async function POST(req: NextRequest) {
  const unauthorized = requireInternalToken(req);
  if (unauthorized) return unauthorized;

  let body: LookupBody;
  try {
    body = (await req.json()) as LookupBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { provider, oauthId } = body;
  if (body.register !== undefined && typeof body.register !== "boolean") {
    return NextResponse.json(
      { error: "Invalid registration flag" },
      { status: 400 },
    );
  }
  if (typeof provider !== "string" || typeof oauthId !== "string") {
    return NextResponse.json(
      { error: "Body must include `provider` (string) and `oauthId` (string)" },
      { status: 400 },
    );
  }
  if (
    !VALID_PROVIDERS.has(provider) ||
    provider.length === 0 ||
    oauthId.length === 0
  ) {
    return NextResponse.json(
      { error: "Invalid provider or oauthId" },
      { status: 400 },
    );
  }

  try {
    const where = {
      oauthProvider_oauthId: { oauthProvider: provider, oauthId },
    };
    const select = {
      id: true,
      status: true,
      email: true,
      displayName: true,
      referralCode: true,
      usedReferralCode: true,
      createdAt: true,
      reputationPoints: true,
      referralCount: true,
      referredBy: {
        select: {
          id: true,
          referralCode: true,
          displayName: true,
          oauthAvatarUrl: true,
          customAvatarUrl: true,
        },
      },
    } as const;
    // Freeze further waitlist attribution before returning the signup snapshot.
    // A competing apply either commits first and is included, or is refused.
    const row =
      body.register === true
        ? await prisma.$transaction(async (tx) => {
            await tx.waitlistUser.updateMany({
              where: {
                oauthProvider: provider,
                oauthId,
                status: { not: "REGISTERED" },
              },
              data: { status: "REGISTERED", registeredAt: new Date() },
            });
            return tx.waitlistUser.findUnique({ where, select });
          })
        : await prisma.waitlistUser.findUnique({ where, select });

    if (!row) return NextResponse.json({ match: null });
    if (body.register === true) after(() => syncWaitlistUser(row.id));

    return NextResponse.json({
      match: {
        id: row.id,
        status: row.status,
        email: row.email,
        displayName: row.displayName,
        referralCode: row.referralCode,
        usedReferralCode: row.usedReferralCode,
        createdAt: row.createdAt.toISOString(),
        reputationPoints: row.reputationPoints,
        referralCount: row.referralCount,
        referredBy: row.referredBy
          ? {
              id: row.referredBy.id,
              referralCode: row.referredBy.referralCode,
              displayName: row.referredBy.displayName,
              avatarUrl:
                row.referredBy.customAvatarUrl ?? row.referredBy.oauthAvatarUrl,
            }
          : null,
      },
    });
  } catch (err) {
    console.error("[internal/waitlist/lookup] DB error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
