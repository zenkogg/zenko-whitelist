import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

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
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://waitlist.zenko.gg';

    return {
      title: `${userName} invited you to Zenko | Reputation has no off-season`,
      description: `Join ${userName} on Zenko — every game feeds your name. Use referral code ${code} to join The Origin`,
      openGraph: {
        type: 'website',
        url: `${baseUrl}/r/${code}`,
        title: `${userName} invited you to Zenko`,
        description: `Reputation has no off-season. Use code ${code} to join The Origin`,
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
        description: `Reputation has no off-season. Use code ${code} to join The Origin`,
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
      title: 'Join Zenko | Reputation has no off-season',
      description: 'Every game feeds your name. Join The Origin.',
      openGraph: {
        images: [`${baseUrl}/api/og?ref=${code}`],
      },
    };
  }
}

export default async function ReferralPage({ params }: Props) {
  const { code } = await params;
  // Redirect to home with referral code in query param
  redirect(`/?ref=${code}`);
}
