/**
 * The waitlist hero describes Zenko as skill-based challenges. Money is never
 * the promise, in the hook or the explanation line, open or closed.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { HeroSection } from '@/components/landing/HeroSection';

const text = renderToStaticMarkup(createElement(HeroSection))
  .replace(/<[^>]+>/g, '')
  .replace(/&#x27;/g, "'");

describe('HeroSection', () => {
  it('explains the product as skill-based challenges', () => {
    expect(text).toContain('Compete on skill in challenges built from your own matches.');
  });

  it('keeps the hook about the game mattering, not paying', () => {
    expect(text).toContain("They said it's just a game... we made it count.");
  });

  it('carries no money-as-reward line', () => {
    expect(text).not.toMatch(/real money/i);
    expect(text).not.toMatch(/made it pay/i);
  });
});
