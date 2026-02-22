import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { RedirectClient } from './redirect-client';

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();

  try {
    const user = await prisma.waitlistUser.findUnique({
      where: { referralCode: code },
      select: {
        displayName: true,
        customAvatarUrl: true,
      },
    });

    const userName = user?.displayName || 'Someone';

    return {
      title: `${userName} invited you to Zenko — Your reputation starts here`,
      description: `They said it's just a game... we made it pay. Join ${userName} on Zenko and use referral code ${code} to earn bonus XP. Every game feeds your name.`,
      openGraph: {
        type: 'website',
        siteName: 'Zenko',
        url: `/r/${code}`,
        title: `${userName} invited you to Zenko — Your reputation starts here`,
        description: `They said it's just a game... we made it pay. Join ${userName} on Zenko and use referral code ${code} to earn bonus XP. Every game feeds your name.`,
        images: [
          {
            url: `/api/og?ref=${code}`,
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
        description: `They said it's just a game... we made it pay. Join ${userName} on Zenko and use referral code ${code} to earn bonus XP. Every game feeds your name.`,
        images: [
          {
            url: `/api/og?ref=${code}`,
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
            url: `/api/og?ref=${code}`,
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

export default async function ReferralPage({ params }: Props) {
  const { code } = await params;
  return <RedirectClient code={code} />;
}
