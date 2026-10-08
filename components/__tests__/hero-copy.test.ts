/**
 * The waitlist hero describes Zenko as skill-based challenges. Money is never
 * the promise in its explanation line, open or closed.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { HeroSection } from '@/components/landing/HeroSection';

const text = renderToStaticMarkup(createElement(HeroSection)).replace(/<[^>]+>/g, '');

describe('HeroSection', () => {
  it('explains the product as skill-based challenges', () => {
    expect(text).toContain('Compete on skill in challenges built from your own matches.');
  });

  it('carries no money-as-reward line', () => {
    expect(text).not.toMatch(/real money/i);
  });
});
