/**
 * The line that sends a waitlist visitor to zenko.gg once Zenko is open.
 * Renders nothing otherwise, so the waitlist pages read as they always have.
 */

import { ZENKO_SITE_URL } from '@/lib/zenko-open';

export function ZenkoOpenBanner({ open }: { open: boolean }) {
  if (!open) return null;

  return (
    <div
      role="status"
      className="mx-auto w-full max-w-md rounded-xl border-2 border-success-300/30 bg-success-300/10 px-4 py-3 text-center text-sm font-medium text-success-300"
    >
      Zenko is open, sign up at{' '}
      <a
        href={ZENKO_SITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold underline decoration-success-300/60 underline-offset-2 hover:decoration-success-300"
      >
        zenko.gg
      </a>
    </div>
  );
}
