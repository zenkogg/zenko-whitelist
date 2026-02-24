import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns a display-friendly username.
 * - Google users: email prefix
 * - Twitter/X users: handle
 * - Others: displayName as-is
 */
export function formatDisplayName(displayName: string, provider?: string, email?: string | null, twitterHandle?: string | null): string {
  if (provider === 'twitter' && twitterHandle) {
    return twitterHandle;
  }
  if (provider === 'google' && email) {
    return email.split('@')[0];
  }
  return displayName;
}
