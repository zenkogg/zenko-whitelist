import { PrismaClient } from '@prisma/client';

// Prisma Client Singleton Pattern
// Prevents multiple instances in development (hot reload)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Export types for use in API routes
export type { WhitelistEntry, Status } from '@prisma/client';
