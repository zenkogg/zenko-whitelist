import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const referralCode = searchParams.get('ref');

    let userName = 'Join Zenko';
    let avatarUrl = null;
    const referralPoints = process.env.REFERRAL_POINTS_PER_SIGNUP || '10';

    if (referralCode) {
      const user = await prisma.waitlistUser.findUnique({
        where: { referralCode: referralCode.toUpperCase() },
        select: { displayName: true, customAvatarUrl: true },
      });
      if (user) {
        userName = user.displayName || 'Join Zenko';
        avatarUrl = user.customAvatarUrl;
      }
    }

    let absoluteAvatarUrl = avatarUrl;
    if (avatarUrl && !avatarUrl.startsWith('http')) {
      if (!process.env.VERCEL_URL) {
        try {
          const filePath = path.join(process.cwd(), 'public', avatarUrl);
          const fileBuffer = await readFile(filePath);
          const base64 = fileBuffer.toString('base64');
          const mimeType = avatarUrl.endsWith('.png') ? 'image/png' :
                          avatarUrl.endsWith('.jpg') || avatarUrl.endsWith('.jpeg') ? 'image/jpeg' :
                          avatarUrl.endsWith('.webp') ? 'image/webp' : 'image/png';
          absoluteAvatarUrl = `data:${mimeType};base64,${base64}`;
        } catch (err) {
          console.error('Error reading avatar file:', err);
          absoluteAvatarUrl = null;
        }
      } else {
        const baseUrl = `https://${process.env.VERCEL_URL}`;
        absoluteAvatarUrl = `${baseUrl}${avatarUrl}`;
      }
    }

    // Load Zenko logo
    let zenkoLogoDataUrl: string | null = null;
    try {
      const logoPath = path.join(process.cwd(), 'public', 'images', 'zenko-logo.png');
      const logoBuffer = await readFile(logoPath);
      zenkoLogoDataUrl = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch {
      // Logo not critical
    }

    // Satori supports Tailwind via the `tw` prop — much cleaner than inline styles
    // For custom colors not in default Tailwind, we still use `style`
    return new ImageResponse(
      (
        <div tw="flex w-full h-full items-center" style={{ backgroundColor: '#0a0015', backgroundImage: 'radial-gradient(ellipse 80% 60% at 30% 50%, rgba(127, 86, 217, 0.25) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 80% 20%, rgba(88, 40, 180, 0.2) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 70% 80%, rgba(147, 107, 230, 0.12) 0%, transparent 60%)' }}>
          {/* Left: Big Avatar + Name */}
          <div tw="flex flex-col items-center justify-center" style={{ width: 480, height: '100%' }}>
            {/* Avatar */}
            <div tw="flex items-center justify-center rounded-3xl mb-6" style={{ width: 260, height: 260, border: '3px solid rgba(179, 142, 243, 0.25)', backgroundColor: 'rgba(67, 27, 138, 0.3)' }}>
              {absoluteAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={absoluteAvatarUrl} alt="" width={260} height={260} tw="rounded-3xl" />
              ) : (
                <div tw="flex text-8xl" style={{ color: 'rgba(255,255,255,0.25)' }}>?</div>
              )}
            </div>

            {/* Name */}
            <div tw="flex text-3xl font-bold mb-2" style={{ color: '#fdb022' }}>{userName}</div>
            <div tw="flex text-lg" style={{ color: 'rgba(203, 186, 238, 0.5)' }}>invites you to join</div>
          </div>

          {/* Right: Branding + Code */}
          <div tw="flex flex-col justify-center flex-1 pr-12">
            {/* Logo row */}
            <div tw="flex items-center mb-6">
              {zenkoLogoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={zenkoLogoDataUrl} alt="" width={40} height={48} tw="mr-4" />
              ) : null}
              <div tw="flex text-5xl font-bold" style={{ color: '#fdb022', letterSpacing: '-0.02em' }}>Zenko</div>
            </div>

            {/* Headline */}
            <div tw="flex text-4xl font-bold text-white mb-3" style={{ lineHeight: 1.2 }}>
              Join the Founding 1,000
            </div>
            <div tw="flex text-xl mb-10" style={{ color: 'rgba(203, 186, 238, 0.6)', lineHeight: 1.5 }}>
              Secure early access and lock in your OG reputation badge.
            </div>

            {/* Referral Code */}
            <div tw="flex flex-col rounded-2xl py-5 px-8" style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(179, 142, 243, 0.15)' }}>
              <div tw="flex text-xs mb-2" style={{ color: 'rgba(203, 186, 238, 0.45)', letterSpacing: '0.08em' }}>
                REFERRAL CODE
              </div>
              <div tw="flex text-4xl font-bold" style={{ color: '#fdb022', letterSpacing: '0.14em' }}>
                {referralCode ? referralCode.toUpperCase() : 'ZENKO'}
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error('OG image generation error:', error);

    return new ImageResponse(
      (
        <div tw="flex items-center justify-center w-full h-full bg-black">
          <div tw="flex text-7xl font-bold" style={{ color: '#fdb022' }}>Zenko</div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  }
}
