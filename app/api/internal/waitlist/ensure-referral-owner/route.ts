import { NextRequest, NextResponse, after } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireInternalToken } from "@/lib/internal-auth";
import { syncWaitlistUser } from "@/lib/loops/sync";
import {
  referralSnapshotRow,
  referralSnapshotSelect,
} from "@/lib/referral-snapshot";

function parseOwner(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (
    !Array.isArray(body.identities) ||
    body.identities.length < 1 ||
    body.identities.length > 10
  )
    return null;
  const identities: Array<{ provider: string; providerSub: string }> = [];
  for (const candidate of body.identities as unknown[]) {
    if (!candidate || typeof candidate !== "object") return null;
    const identity = candidate as Record<string, unknown>;
    if (
      typeof identity.provider !== "string" ||
      !["google", "twitch", "virtualeagues"].includes(identity.provider) ||
      typeof identity.providerSub !== "string" ||
      !identity.providerSub.length ||
      identity.providerSub.length > 512
    )
      return null;
    identities.push({
      provider: identity.provider,
      providerSub: identity.providerSub,
    });
  }
  if (
    typeof body.referralCode !== "string" ||
    !/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/.test(body.referralCode)
  )
    return null;
  if (
    body.displayName !== null &&
    (typeof body.displayName !== "string" || body.displayName.length > 256)
  )
    return null;
  if (body.avatarUrl !== null) {
    if (typeof body.avatarUrl !== "string" || body.avatarUrl.length > 2048)
      return null;
    try {
      if (!["http:", "https:"].includes(new URL(body.avatarUrl).protocol))
        return null;
    } catch {
      return null;
    }
  }
  return {
    identities,
    referralCode: body.referralCode,
    displayName: body.displayName as string | null,
    avatarUrl: body.avatarUrl as string | null,
  };
}

export async function POST(req: NextRequest) {
  const unauthorized = requireInternalToken(req);
  if (unauthorized) return unauthorized;
  const input = parseOwner(await req.json().catch(() => null));
  if (!input)
    return NextResponse.json(
      { error: "Invalid referral owner" },
      { status: 400 },
    );
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const profile = await prisma.$transaction(async (tx) => {
        const matches = await tx.waitlistUser.findMany({
          where: {
            OR: input.identities.map((i) => ({
              oauthProvider: i.provider,
              oauthId: i.providerSub,
            })),
          },
          select: { id: true },
          take: 2,
        });
        if (matches.length > 1) return null;
        if (matches[0]) {
          await tx.waitlistUser.updateMany({
            where: { id: matches[0].id, status: { not: "REGISTERED" } },
            data: { status: "REGISTERED", registeredAt: new Date() },
          });
          return tx.waitlistUser.findUniqueOrThrow({
            where: { id: matches[0].id },
            select: referralSnapshotSelect,
          });
        }
        const identity = input.identities[0];
        return tx.waitlistUser.create({
          data: {
            oauthProvider: identity.provider,
            oauthId: identity.providerSub,
            referralCode: input.referralCode,
            displayName: input.displayName,
            oauthAvatarUrl: input.avatarUrl,
            games: [],
            status: "REGISTERED",
            registeredAt: new Date(),
          },
          select: referralSnapshotSelect,
        });
      });
      if (!profile)
        return NextResponse.json(
          { error: "Conflicting waitlist identities" },
          { status: 409 },
        );
      after(() => syncWaitlistUser(profile.id));
      return NextResponse.json({ profile: referralSnapshotRow(profile) });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        if (attempt === 0) continue;
        return NextResponse.json(
          { error: "Referral code is already owned" },
          { status: 409 },
        );
      }
      console.error(
        "[waitlist/ensure-referral-owner] Could not prepare owner:",
        error,
      );
      return NextResponse.json(
        { error: "Referral owner unavailable" },
        { status: 503 },
      );
    }
  }
  return NextResponse.json(
    { error: "Referral owner unavailable" },
    { status: 503 },
  );
}
