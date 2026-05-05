import { prisma } from '@/lib/prisma';
import type { WaitlistUser } from '@prisma/client';

const SIX_CHAR_CODE_RE = /^[A-Za-z0-9]{6}$/;
const MAX_LENGTH = 30;
const MAX_COLLISION_ATTEMPTS = 50;

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_LENGTH)
    .replace(/-+$/, '');
}

export async function generateUniqueUsername(displayName: string | null | undefined): Promise<string | null> {
  const base = slugify(displayName ?? '');
  if (!base) return null;

  // Don't allow usernames that would be ambiguous with the 6-char referral code namespace.
  const safeBase = SIX_CHAR_CODE_RE.test(base) ? `${base}-1` : base;

  if (!(await prisma.waitlistUser.findUnique({ where: { username: safeBase } }))) {
    return safeBase;
  }

  for (let i = 2; i <= MAX_COLLISION_ATTEMPTS; i++) {
    const candidate = `${safeBase}-${i}`;
    if (!(await prisma.waitlistUser.findUnique({ where: { username: candidate } }))) {
      return candidate;
    }
  }

  // Last resort: append a short random suffix.
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${safeBase}-${suffix}`;
}

export async function resolveReferralIdentifier(input: string): Promise<WaitlistUser | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (SIX_CHAR_CODE_RE.test(trimmed)) {
    return prisma.waitlistUser.findUnique({ where: { referralCode: trimmed.toUpperCase() } });
  }

  return prisma.waitlistUser.findUnique({ where: { username: trimmed.toLowerCase() } });
}
