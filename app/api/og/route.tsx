import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import path from 'path';
import { REFERRAL_POINTS_PER_SIGNUP } from '@/lib/referral-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const referralCode = searchParams.get('ref');

    let userName = 'Join Zenko';
    let avatarUrl = null;
    let oauthProvider = 'google';
    let twitterHandle: string | null = null;
    const referralPoints = String(REFERRAL_POINTS_PER_SIGNUP);

    if (referralCode) {
      const user = await prisma.waitlistUser.findUnique({
        where: { referralCode: referralCode.toUpperCase() },
        select: { displayName: true, customAvatarUrl: true, oauthProvider: true, twitterHandle: true },
      });
      if (user) {
        oauthProvider = user.oauthProvider;
        twitterHandle = user.twitterHandle;
        // For Google, show display name. For X/Twitch, show username/handle.
        if (oauthProvider === 'twitter' && twitterHandle) {
          userName = `@${twitterHandle}`;
        } else {
          userName = user.displayName || 'Join Zenko';
        }
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

    // Load fonts
    const fetchGoogleFont = async (family: string, weight: number) => {
      try {
        const css = await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&display=swap`).then(r => r.text());
        const match = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
        return match ? await fetch(match[1]).then(r => r.arrayBuffer()) : null;
      } catch { return null; }
    };

    const [soraFont, interFont] = await Promise.all([
      fetchGoogleFont('Sora', 700),
      fetchGoogleFont('Inter', 400),
    ]);

    // Platform icon as JSX for Satori
    const platformIcon = oauthProvider === 'twitter'
      ? (
        <svg viewBox="0 0 24 24" width="28" height="28">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="white" />
        </svg>
      )
      : oauthProvider === 'twitch'
        ? (
          <svg viewBox="0 0 24 24" width="28" height="28">
            <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" fill="#9146FF" />
          </svg>
        )
        : null;

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

            {/* Name with platform icon */}
            <div tw="flex items-center mb-2">
              {platformIcon && (
                <div tw="flex mr-2">{platformIcon}</div>
              )}
              <div tw="flex text-2xl font-bold" style={{ color: '#fdb022', fontFamily: 'Sora' }}>{userName}</div>
            </div>
            <div tw="flex text-xl" style={{ color: 'rgba(203, 186, 238, 0.7)', fontFamily: 'Inter' }}>invites you to join</div>
          </div>

          {/* Right: Branding + Code */}
          <div tw="flex flex-col justify-center flex-1 pr-12">
            {/* Logo row */}
            <div tw="flex items-center mb-6">
              {zenkoLogoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={zenkoLogoDataUrl} alt="" width={40} height={48} tw="mr-4" />
              ) : null}
              <div tw="flex text-4xl" style={{ color: '#7F56D9', letterSpacing: '-0.02em', fontFamily: 'Inter' }}>Zenko</div>
            </div>

            {/* Headline */}
            <div tw="flex text-4xl font-bold text-white mb-3" style={{ lineHeight: 1.2, fontFamily: 'Sora' }}>
              Reputation has no off-season.
            </div>
            <div tw="flex text-xl mb-10" style={{ color: 'rgba(203, 186, 238, 0.6)', lineHeight: 1.5, fontFamily: 'Inter' }}>
              Join Zenko. Earn +{referralPoints} XP with this code
            </div>

            {/* Referral Code */}
            <div tw="flex flex-col rounded-2xl py-6 px-8" style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(179, 142, 243, 0.15)' }}>
              <div tw="flex text-xs mb-3" style={{ color: 'rgba(203, 186, 238, 0.45)', letterSpacing: '0.08em', fontFamily: 'Inter' }}>
                REFERRAL CODE
              </div>
              <div tw="flex text-5xl font-bold" style={{ color: '#fdb022', letterSpacing: '0.18em', fontFamily: 'Sora' }}>
                {referralCode ? referralCode.toUpperCase() : 'ZENKO'}
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          ...(soraFont ? [{
            name: 'Sora',
            data: soraFont,
            weight: 700 as const,
            style: 'normal' as const,
          }] : []),
          ...(interFont ? [{
            name: 'Inter',
            data: interFont,
            weight: 400 as const,
            style: 'normal' as const,
          }] : []),
        ],
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
          <div tw="flex text-7xl font-bold" style={{ color: '#7F56D9' }}>Zenko</div>
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
