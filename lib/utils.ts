import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for merging Tailwind CSS classes with proper deduplication.
 * Used by Catalyst components.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
