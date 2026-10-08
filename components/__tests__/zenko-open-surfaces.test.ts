/**
 * Every waitlist surface that changes once Zenko is open. Rendered to static
 * markup, so a test sees what a visitor would before any client effect runs.
 * Each closed case is driven through the gate reader with the backend body that
 * produces it, including production's body with no closedBeta field, so a
 * surface is pinned to the gate and not only to its own prop.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { WaitlistStatusBadge } from '@/components/Navbar';
import { ZenkoOpenBanner } from '@/components/ZenkoOpenBanner';
import { AvatarGroup } from '@/components/dashboard/AvatarGroup';
import { FAQ } from '@/components/dashboard/FAQ';
import { ReferralProgress } from '@/components/dashboard/ReferralProgress';
import { WaitlistSignIn, type WaitlistStats } from '@/components/landing/WaitlistSignIn';
import { openFromStatus, useZenkoOpen } from '@/hooks/useZenkoOpen';
import { zenkoOpenFrom } from '@/lib/zenko-open';
import { GATE_OFF, GATE_ON, PRODUCTION_TODAY } from '@/lib/__tests__/zenko-config-fixtures';

const textOf = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');

const CLOSED_CONFIGS = [
  ['production config with no closedBeta field', PRODUCTION_TODAY],
  ['config with the gate on', GATE_ON],
] as const;

const OPEN = zenkoOpenFrom(GATE_OFF);

function progress(props: {
  status: string;
  waitlistStatus?: 'open' | 'closed';
  zenkoOpen?: boolean;
}) {
  return renderToStaticMarkup(
    createElement(ReferralProgress, {
      referralCount: 3,
      reputationPoints: 40,
      waitlistStatus: 'open',
      ...props,
    })
  );
}

function signIn(zenkoOpen: boolean, waitlistStatus: 'open' | 'closed' = 'open') {
  const stats: WaitlistStats = { totalCount: 312, recentUsers: [], waitlistStatus };
  return renderToStaticMarkup(
    createElement(WaitlistSignIn, { zenkoOpen, stats, onSignIn: () => {} })
  );
}

describe('the gate reading the fixtures', () => {
  it('reads closed for both closed bodies and open for the gate off', () => {
    for (const [, payload] of CLOSED_CONFIGS) expect(zenkoOpenFrom(payload)).toBe(false);
    expect(OPEN).toBe(true);
  });
});

describe('ZenkoOpenBanner', () => {
  it('renders nothing while Zenko is not open', () => {
    expect(renderToStaticMarkup(createElement(ZenkoOpenBanner, { open: false }))).toBe('');
  });

  it('tells the visitor Zenko is open and links to it', () => {
    const html = renderToStaticMarkup(createElement(ZenkoOpenBanner, { open: true }));
    expect(textOf(html)).toBe('Zenko is open, sign up at zenko.gg');
    expect(html).toContain('href="https://zenko.gg"');
  });

  it('stays hidden on first render, before the status read has answered', () => {
    function LandingProbe() {
      return createElement(ZenkoOpenBanner, { open: useZenkoOpen() });
    }
    expect(renderToStaticMarkup(createElement(LandingProbe))).toBe('');
  });
});

describe('openFromStatus', () => {
  it('opens only on an explicit true from the status route', () => {
    expect(openFromStatus({ open: true })).toBe(true);
    for (const payload of [undefined, null, {}, { open: false }, { open: 'true' }, { open: 1 }]) {
      expect(openFromStatus(payload)).toBe(false);
    }
  });
});

describe('Navbar waitlist badge', () => {
  const badge = (waitlistStatus: 'open' | 'closed' | null, zenkoOpen: boolean) =>
    textOf(renderToStaticMarkup(createElement(WaitlistStatusBadge, { waitlistStatus, zenkoOpen })));

  it.each(CLOSED_CONFIGS)('reads as today with the %s', (_label, payload) => {
    const zenkoOpen = zenkoOpenFrom(payload);
    expect(badge('open', zenkoOpen)).toBe('Waitlist Open');
    expect(badge('closed', zenkoOpen)).toBe('Waitlist Closed');
  });

  it('renders nothing before the waitlist status has loaded', () => {
    expect(badge(null, false)).toBe('');
  });

  it('is hidden once Zenko is open, whatever the waitlist status says', () => {
    expect(badge('open', OPEN)).toBe('');
    expect(badge('closed', OPEN)).toBe('');
  });
});

describe('landing sign-in panel', () => {
  it.each(CLOSED_CONFIGS)('reads as today with the %s', (_label, payload) => {
    const text = textOf(signIn(zenkoOpenFrom(payload)));
    expect(text).toContain('Waitlist open');
    expect(text).toContain('Join Zenko. Be a Day One.');
    expect(text).toContain(
      'Before the awards. Before the spotlight. This is where the names that matter started.'
    );
    expect(text).not.toContain('Zenko is open');
  });

  it('keeps the closed pill while the waitlist itself is closed and Zenko is not open', () => {
    expect(textOf(signIn(false, 'closed'))).toContain('Waitlist closed');
  });

  it('points a visitor to zenko.gg once Zenko is open and drops the waitlist pill', () => {
    for (const waitlistStatus of ['open', 'closed'] as const) {
      const text = textOf(signIn(OPEN, waitlistStatus));
      expect(text).toContain('Zenko is open, sign up at zenko.gg');
      expect(text).toContain('Already on the waitlist? Sign in to see your XP.');
      expect(text).toContain(
        'Your XP comes with you when you sign up at zenko.gg with the same Google or Twitch account.'
      );
      expect(text).not.toContain('Waitlist open');
      expect(text).not.toContain('Waitlist closed');
      expect(text).not.toContain('Day One');
      expect(text).not.toContain('Before the awards');
    }
  });

  it('keeps the waitlist sign-in buttons in both states', () => {
    for (const zenkoOpen of [false, OPEN]) {
      const text = textOf(signIn(zenkoOpen));
      expect(text).toContain('Sign in with Google');
      expect(text).toContain('Sign in with Twitch');
    }
  });
});

describe('ReferralProgress card copy', () => {
  it.each(CLOSED_CONFIGS)('reads as today with the %s', (_label, payload) => {
    const text = textOf(progress({ status: 'PENDING', zenkoOpen: zenkoOpenFrom(payload) }));
    expect(text).toContain('Gain priority access');
    expect(text).toContain(
      'Refer friends to boost your rank. Each referral earns you +10 XP and moves you up the waitlist.'
    );
  });

  it('tells the player their XP carries over once Zenko is open', () => {
    const text = textOf(progress({ status: 'PENDING', zenkoOpen: OPEN }));
    expect(text).toContain('Take your XP to Zenko');
    expect(text).toContain(
      'Sign up at zenko.gg with the same Google or Twitch account and your XP comes with you.'
    );
    expect(text).not.toContain('priority');
    expect(text).not.toContain('up the waitlist');
  });
});

describe('ReferralProgress Early Access badge', () => {
  it('reads On Waitlist for a pending player when nothing says Zenko is open', () => {
    const text = textOf(progress({ status: 'PENDING' }));
    expect(text).toContain('On Waitlist');
    expect(text).not.toContain('sign up at zenko.gg');
  });

  it('reads On Waitlist for a pending player while Zenko is closed', () => {
    expect(textOf(progress({ status: 'PENDING', zenkoOpen: false }))).toContain('On Waitlist');
  });

  it('points a pending player at zenko.gg once Zenko is open', () => {
    const html = progress({ status: 'PENDING', zenkoOpen: true });
    expect(textOf(html)).toContain('Open, sign up at zenko.gg');
    expect(textOf(html)).not.toContain('On Waitlist');
    expect(html).toContain('href="https://zenko.gg"');
  });

  it('never shows Not Selected once Zenko is open, even with the waitlist closed', () => {
    const text = textOf(progress({ status: 'PENDING', waitlistStatus: 'closed', zenkoOpen: true }));
    expect(text).not.toContain('Not Selected');
    expect(text).toContain('Open, sign up at zenko.gg');
  });

  it('keeps Access Granted for an approved player either way', () => {
    expect(textOf(progress({ status: 'APPROVED', zenkoOpen: true }))).toContain('Access Granted');
    expect(textOf(progress({ status: 'APPROVED' }))).toContain('Access Granted');
  });

  it('keeps the points history in the open state', () => {
    const text = textOf(progress({ status: 'PENDING', zenkoOpen: true }));
    expect(text).toContain('40 XP');
    expect(text).toContain('3 total referrals');
  });
});

describe('FAQ', () => {
  const faq = (zenkoOpen: boolean) => renderToStaticMarkup(createElement(FAQ, { zenkoOpen }));

  it.each(CLOSED_CONFIGS)('reads as today, without em dashes, with the %s', (_label, payload) => {
    const html = faq(zenkoOpenFrom(payload));
    const text = textOf(html);
    expect(text).toContain(
      '• Invite friends: share your referral code and earn +10 XP every time someone signs up with it'
    );
    expect(text).toContain(
      "• Use a friend's code: entering someone else's referral code earns you +10 XP too"
    );
    expect(text).toContain('• Hit 10 referrals: reach the goal to unlock priority access to the beta');
    expect(html).not.toContain('\u2014');
  });

  it('replaces the priority-access line with the carry-over once Zenko is open', () => {
    const html = faq(OPEN);
    const text = textOf(html);
    expect(text).toContain(
      '• Invite friends: share your referral code and earn +10 XP every time someone signs up with it'
    );
    expect(text).toContain(
      '• Take it to Zenko: sign up at zenko.gg with the same Google or Twitch account and your XP carries over'
    );
    expect(text).not.toContain('priority access');
    expect(html).not.toContain('\u2014');
  });

  it('defaults to the closed copy when no gate answer is passed', () => {
    expect(textOf(renderToStaticMarkup(createElement(FAQ)))).toContain(
      'unlock priority access to the beta'
    );
  });
});

describe('AvatarGroup count', () => {
  const count = (zenkoOpen?: boolean) =>
    textOf(renderToStaticMarkup(createElement(AvatarGroup, { totalWaitlistUsers: 312, zenkoOpen })));

  it.each(CLOSED_CONFIGS)('reads as today with the %s', (_label, payload) => {
    expect(count(zenkoOpenFrom(payload))).toBe('312 joined the waitlist');
  });

  it('defaults to the closed copy when no gate answer is passed', () => {
    expect(count()).toBe('312 joined the waitlist');
  });

  it('drops the waitlist once Zenko is open', () => {
    expect(count(OPEN)).toBe('312 joined early');
  });
});
