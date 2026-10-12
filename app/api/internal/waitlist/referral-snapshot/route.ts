import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInternalToken } from "@/lib/internal-auth";
import { readReferralSnapshot } from "@/lib/referral-snapshot";

export async function GET(req: NextRequest) {
  const unauthorized = requireInternalToken(req);
  if (unauthorized) return unauthorized;
  try {
    const snapshot = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
        return readReferralSnapshot(tx);
      },
      { isolationLevel: "RepeatableRead", timeout: 15000 },
    );
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[waitlist/referral-snapshot] Snapshot failed:", error);
    return NextResponse.json(
      { error: "Snapshot unavailable" },
      { status: 503 },
    );
  }
}
