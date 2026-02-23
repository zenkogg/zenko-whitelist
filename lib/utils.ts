import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns a display-friendly username.
 * For Google users, shows email prefix instead of full name.
 */
export function formatDisplayName(displayName: string, provider?: string, email?: string | null): string {
  if (provider === 'google' && email) {
    return email.split('@')[0];
  }
  return displayName;
}
