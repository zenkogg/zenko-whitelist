import { describe, it, expect } from 'vitest';
import {
  statusEventFor,
  idempotencyKey,
  IDEMPOTENCY_KEY_MAX,
  LOOPS_EVENTS,
} from '../events';

describe('statusEventFor', () => {
  it('maps APPROVED and INVITED to their events', () => {
    expect(statusEventFor('PENDING', 'APPROVED')).toBe(LOOPS_EVENTS.WAITLIST_APPROVED);
    expect(statusEventFor('APPROVED', 'INVITED')).toBe(LOOPS_EVENTS.WAITLIST_INVITED);
  });

  it('returns null for REGISTERED — the backend owns zenko_registered', () => {
    expect(statusEventFor('INVITED', 'REGISTERED')).toBeNull();
  });

  it('returns null for a no-op transition (same status)', () => {
    expect(statusEventFor('INVITED', 'INVITED')).toBeNull();
  });

  it('returns null for a move back to PENDING', () => {
    expect(statusEventFor('APPROVED', 'PENDING')).toBeNull();
  });

  it('treats a null previous status as a fresh transition', () => {
    expect(statusEventFor(null, 'INVITED')).toBe(LOOPS_EVENTS.WAITLIST_INVITED);
  });
});

describe('idempotencyKey', () => {
  it('joins event name and ids with colons', () => {
    expect(idempotencyKey('waitlist_invited', 'user-1')).toBe('waitlist_invited:user-1');
    expect(idempotencyKey('waitlist_referral_earned', 'ref-1', 'ref-2')).toBe(
      'waitlist_referral_earned:ref-1:ref-2'
    );
  });

  it('truncates to the 100-char Loops cap', () => {
    const key = idempotencyKey('waitlist_joined', 'x'.repeat(200));
    expect(key.length).toBe(IDEMPOTENCY_KEY_MAX);
  });
});
