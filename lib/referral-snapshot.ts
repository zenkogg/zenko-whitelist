import type { Prisma } from '@prisma/client';

export const referralSnapshotSelect = {
  id: true,
  oauthProvider: true,
  oauthId: true,
  displayName: true,
  oauthAvatarUrl: true,
  customAvatarUrl: true,
  username: true,
  referralCode: true,
  usedReferralCode: true,
  referredById: true,
  referralCount: true,
  reputationPoints: true,
  status: true,
  registeredAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export function referralSnapshotRow(
  row: Prisma.WaitlistUserGetPayload<{ select: typeof referralSnapshotSelect }>,
) {
  return {
    id: row.id,
    provider: row.oauthProvider,
    providerSub: row.oauthId,
    displayName: row.displayName,
    avatarUrl: row.customAvatarUrl ?? row.oauthAvatarUrl,
    username: row.username,
    referralCode: row.referralCode,
    usedReferralCode: row.usedReferralCode,
    referrerId: row.referredById,
    referralCount: row.referralCount,
    reputationPoints: row.reputationPoints,
    status: row.status,
    registeredAt: row.registeredAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function readReferralSnapshot(tx: Prisma.TransactionClient) {
  const exportedAt = new Date().toISOString();
  const users: ReturnType<typeof referralSnapshotRow>[] = [];
  let cursor: string | undefined;
  for (;;) {
    const rows = await tx.waitlistUser.findMany({
      orderBy: { id: 'asc' },
      take: 500,
      select: referralSnapshotSelect,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    users.push(...rows.map(referralSnapshotRow));
    if (users.length > 100_000) throw new Error('Waitlist snapshot exceeds the import limit');
    if (rows.length < 500) break;
    cursor = rows.at(-1)!.id;
  }
  return { version: 1, exportedAt, users };
}
