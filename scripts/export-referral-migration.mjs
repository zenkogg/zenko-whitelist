import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const output = process.argv[2];
if (!output || !path.isAbsolute(output)) {
  throw new Error(
    'Usage: node scripts/export-referral-migration.mjs /absolute/private/snapshot.json',
  );
}
const prisma = new PrismaClient();
try {
  const snapshot = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      const exportedAt = new Date().toISOString();
      const users = [];
      let cursor;
      for (;;) {
        const rows = await tx.waitlistUser.findMany({
          orderBy: { id: 'asc' },
          take: 500,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          select: {
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
          },
        });
        users.push(
          ...rows.map((row) => ({
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
            registeredAt: row.registeredAt,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          })),
        );
        if (rows.length < 500) break;
        cursor = rows.at(-1).id;
      }
      return { version: 1, exportedAt, users };
    },
    { isolationLevel: 'RepeatableRead', timeout: 300000 },
  );
  const text = JSON.stringify(snapshot);
  await writeFile(output, text, { mode: 0o600, flag: 'wx' });
  console.info(
    JSON.stringify({
      rows: snapshot.users.length,
      sha256: createHash('sha256').update(text).digest('hex'),
    }),
  );
} finally {
  await prisma.$disconnect();
}
