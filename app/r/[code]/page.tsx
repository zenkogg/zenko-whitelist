import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

interface Props {
  params: { code: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const code = params.code.toUpperCase();

  try {
    const user = await prisma.waitlistUser.findUnique({
      where: { referralCode: code },
      select: {
        displayName: true,
        customAvatarUrl: true,
      },
    });

    const userName = user?.displayName || 'Someone';
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://waitlist.zenko.gg';

    return {
      title: `${userName} invited you to Zenko | Where Real Performance Determines the Outcome`,
      description: `Join ${userName} on Zenko - the ultimate platform where skill matters. Use referral code ${code} to skip the waitlist!`,
      openGraph: {
        type: 'website',
        url: `${baseUrl}/r/${code}`,
        title: `${userName} invited you to Zenko`,
        description: `Join ${userName} on Zenko - where real performance determines the outcome. Use code ${code}!`,
        images: [
          {
            url: `${baseUrl}/api/og?ref=${code}`,
            width: 1200,
            height: 630,
            alt: `Join ${userName} on Zenko`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${userName} invited you to Zenko`,
        description: `Join ${userName} on Zenko - where real performance determines the outcome. Use code ${code}!`,
        images: [`${baseUrl}/api/og?ref=${code}`],
      },
    };
  } catch (error) {
    console.error('Error generating referral metadata:', error);

    // Fallback metadata
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://waitlist.zenko.gg';

    return {
      title: 'Join Zenko Waitlist | Where Real Performance Determines the Outcome',
      description: 'Join Zenko - the ultimate platform where skill matters.',
      openGraph: {
        images: [`${baseUrl}/api/og?ref=${code}`],
      },
    };
  }
}

export default function ReferralPage({ params }: Props) {
  // Redirect to home with referral code in query param
  redirect(`/?ref=${params.code}`);
}
