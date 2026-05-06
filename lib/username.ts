import { prisma } from '@/lib/prisma';
import type { WaitlistUser } from '@prisma/client';

const SIX_CHAR_CODE_RE = /^[A-Za-z0-9]{6}$/;
const MAX_LENGTH = 30;
const MAX_COLLISION_ATTEMPTS = 50;

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = MAX_LENGTH;
// Lowercase alphanumerics + internal hyphens. No leading/trailing hyphen, no underscores.
const USERNAME_FORMAT_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

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

export type UsernameValidation =
  | { ok: true; value: string }
  | { ok: false; error: string };

// Validates user-supplied username input (used by the edit flow).
// Stricter than slugify: enforces a minimum length and a clean format,
// since these are explicit user choices rather than auto-derived slugs.
export function validateUsernameInput(input: string): UsernameValidation {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return { ok: false, error: 'Username is required' };
  if (trimmed.length < USERNAME_MIN_LENGTH) {
    return { ok: false, error: `Must be at least ${USERNAME_MIN_LENGTH} characters` };
  }
  if (trimmed.length > USERNAME_MAX_LENGTH) {
    return { ok: false, error: `Must be at most ${USERNAME_MAX_LENGTH} characters` };
  }
  if (!USERNAME_FORMAT_RE.test(trimmed)) {
    return { ok: false, error: 'Letters, numbers, and hyphens only — no leading or trailing hyphen' };
  }
  if (SIX_CHAR_CODE_RE.test(trimmed)) {
    return { ok: false, error: 'That format is reserved for referral codes' };
  }
  return { ok: true, value: trimmed };
}

// Returns true if the username is free, OR is already owned by `excludeUserId`
// (so a user re-saving their own username doesn't get a false 'taken' result).
export async function isUsernameAvailable(username: string, excludeUserId: string): Promise<boolean> {
  const existing = await prisma.waitlistUser.findUnique({
    where: { username },
    select: { id: true },
  });
  return !existing || existing.id === excludeUserId;
}

export async function resolveReferralIdentifier(input: string): Promise<WaitlistUser | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (SIX_CHAR_CODE_RE.test(trimmed)) {
    return prisma.waitlistUser.findUnique({ where: { referralCode: trimmed.toUpperCase() } });
  }

  return prisma.waitlistUser.findUnique({ where: { username: trimmed.toLowerCase() } });
}
