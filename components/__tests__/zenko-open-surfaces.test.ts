/**
 * The two waitlist surfaces that change once Zenko is open: the banner and the
 * Early Access badge. Rendered to static markup, so a test sees what a visitor
 * would before any client effect runs: the waitlist copy, until the read says
 * otherwise.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ZenkoOpenBanner } from '@/components/ZenkoOpenBanner';
import { ReferralProgress } from '@/components/dashboard/ReferralProgress';
import { openFromStatus, useZenkoOpen } from '@/hooks/useZenkoOpen';

const textOf = (html: string) => html.replace(/<[^>]+>/g, '');

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
