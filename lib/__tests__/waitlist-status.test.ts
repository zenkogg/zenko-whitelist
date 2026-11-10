import { describe, expect, it } from 'vitest';
import { isWaitlistClosed, waitlistStatus } from '@/lib/waitlist-status';

describe('waitlist status', () => {
  it('is closed only when the deployment says exactly closed', () => {
    expect(waitlistStatus({ WAITLIST_STATUS: 'closed' })).toBe('closed');
    expect(isWaitlistClosed({ WAITLIST_STATUS: 'closed' })).toBe(true);
  });

  it('stays open when unset, open, or anything else', () => {
    for (const value of [undefined, '', 'open', 'CLOSED', 'close', 'true']) {
      expect(waitlistStatus({ WAITLIST_STATUS: value })).toBe('open');
      expect(isWaitlistClosed({ WAITLIST_STATUS: value })).toBe(false);
    }
  });
});
