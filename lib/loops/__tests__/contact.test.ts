import { describe, it, expect } from 'vitest';
import { toLoopsContact, type WaitlistContactInput } from '../contact';

function makeRow(overrides: Partial<WaitlistContactInput> = {}): WaitlistContactInput {
  return {
    id: 'user-1',
    email: 'Player@Example.com',
    status: 'PENDING',
    oauthProvider: 'google',
    displayName: 'Cool Player',
    referralCode: 'ABC123',
    username: 'cool-player',
    twitterHandle: 'coolplayer',
    games: ['lol', 'valorant'],
    referralCount: 3,
    reputationPoints: 30,
    createdAt: new Date('2026-01-02T03:04:05.000Z'),
    invitedAt: null,
    ...overrides,
  };
}

describe('toLoopsContact', () => {
  it('maps the waitlist* namespace and lowercases the email', () => {
    const c = toLoopsContact(makeRow())!;
    expect(c).toMatchObject({
      email: 'player@example.com',
      firstName: 'Cool Player',
      waitlistUserId: 'user-1',
      waitlistStatus: 'PENDING',
      waitlistProvider: 'google',
      waitlistReferralCode: 'ABC123',
      waitlistUsername: 'cool-player',
      waitlistTwitterHandle: 'coolplayer',
      waitlistGames: 'lol,valorant',
      waitlistReferralCount: 3,
      waitlistXp: 30,
      waitlistJoinedAt: '2026-01-02T03:04:05.000Z',
    });
  });

  it('returns null when the row has no email (unsyncable)', () => {
    expect(toLoopsContact(makeRow({ email: null }))).toBeNull();
  });

  it('never emits subscribed or mailingLists on a property sync', () => {
    const c = toLoopsContact(makeRow())!;
    expect(c).not.toHaveProperty('subscribed');
    expect(c).not.toHaveProperty('mailingLists');
  });

  it('omits invitedAt until the user is invited, then sends an ISO string', () => {
    expect(toLoopsContact(makeRow({ invitedAt: null })!)).not.toHaveProperty(
      'waitlistInvitedAt'
    );
    const invited = toLoopsContact(
      makeRow({ status: 'INVITED', invitedAt: new Date('2026-02-03T00:00:00.000Z') })
    )!;
    expect(invited.waitlistInvitedAt).toBe('2026-02-03T00:00:00.000Z');
  });

  it('omits empty optional strings and an empty games list', () => {
    const c = toLoopsContact(
      makeRow({ referralCode: '', username: null, twitterHandle: null, games: [] })
    )!;
    expect(c).not.toHaveProperty('waitlistReferralCode');
    expect(c).not.toHaveProperty('waitlistUsername');
    expect(c).not.toHaveProperty('waitlistTwitterHandle');
    expect(c).not.toHaveProperty('waitlistGames');
  });

  it('caps a long games value at the 500-char Loops limit', () => {
    const many = Array.from({ length: 400 }, (_, i) => `game${i}`);
    const c = toLoopsContact(makeRow({ games: many }))!;
    expect(c.waitlistGames!.length).toBeLessThanOrEqual(500);
  });
});
