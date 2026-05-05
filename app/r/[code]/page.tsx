import { Metadata } from 'next';
import { resolveReferralIdentifier } from '@/lib/username';
import { RedirectClient } from './redirect-client';

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code: rawCode } = await params;
  const code = rawCode.trim();

  try {
    const user = await resolveReferralIdentifier(code);
    const userName = user?.displayName || 'Someone';
    // Canonical forms — 6-char code for the referral copy, username (or code) for the URL slug.
    // Keeps OG copy correct and og:url stable regardless of which casing was typed.
    // URL slug rendered uppercase to match the share card and the existing referral-code style.
    const canonicalRef = user?.referralCode || normalizeForDisplay(code);
    const canonicalSlug = (user?.username || canonicalRef).toUpperCase();
    const description = `They said it's just a game... we made it pay. Join ${userName} on Zenko and use referral code ${canonicalRef} to earn bonus XP. Every game feeds your name.`;

    return {
      title: `${userName} invited you to Zenko — Your reputation starts here`,
      description,
      openGraph: {
        type: 'website',
        siteName: 'Zenko',
        url: `/r/${canonicalSlug}`,
        title: `${userName} invited you to Zenko — Your reputation starts here`,
        description,
        images: [
          {
            url: `/api/og?ref=${canonicalRef}`,
            width: 1200,
            height: 630,
            alt: `Join ${userName} on Zenko`,
            type: 'image/png',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        site: '@zenkogginc',
        title: `${userName} invited you to Zenko — Your reputation starts here`,
        description,
        images: [
          {
            url: `/api/og?ref=${canonicalRef}`,
            width: 1200,
            height: 630,
            alt: `Join ${userName} on Zenko`,
          },
        ],
      },
    };
  } catch (error) {
    console.error('Error generating referral metadata:', error);

    return {
      title: 'Join Zenko | Reputation has no off-season',
      description: 'Every game feeds your name. Join The Origin.',
      openGraph: {
        siteName: 'Zenko',
        images: [
          {
            url: `/api/og?ref=${normalizeForDisplay(code)}`,
            width: 1200,
            height: 630,
            alt: 'Join Zenko',
            type: 'image/png',
          },
        ],
      },
    };
  }
}

// 6-char alphanumerics canonicalize as uppercase (referral codes); anything else is treated
// as a username slug and lowercased.
function normalizeForDisplay(input: string): string {
  return /^[A-Za-z0-9]{6}$/.test(input) ? input.toUpperCase() : input.toLowerCase();
}

export default async function ReferralPage({ params }: Props) {
  const { code } = await params;
  return <RedirectClient code={code} />;
}
