import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import path from 'path';

// Use Node.js runtime for Prisma compatibility
export const runtime = 'nodejs';

// Cache OG images for 1 hour (3600 seconds)
export const revalidate = 3600;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const referralCode = searchParams.get('ref');

    let userName = 'Join Zenko';
    let avatarUrl = null;
    const referralPoints = process.env.REFERRAL_POINTS_PER_SIGNUP || '10';

    // If referral code provided, fetch user data
    if (referralCode) {
      const user = await prisma.waitlistUser.findUnique({
        where: { referralCode: referralCode.toUpperCase() },
        select: {
          displayName: true,
          customAvatarUrl: true,
        },
      });

      if (user) {
        userName = user.displayName || 'Join Zenko';
        avatarUrl = user.customAvatarUrl;
      }
    }

    // Convert avatar URL to absolute URL or data URL for local files
    let absoluteAvatarUrl = avatarUrl;
    if (avatarUrl && !avatarUrl.startsWith('http')) {
      // Check if we're in local development (no VERCEL_URL)
      if (!process.env.VERCEL_URL) {
        // In local dev, read the file and convert to data URL
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
          absoluteAvatarUrl = null; // Fall back to default avatar
        }
      } else {
        // In production, use the absolute URL
        const baseUrl = `https://${process.env.VERCEL_URL}`;
        absoluteAvatarUrl = `${baseUrl}${avatarUrl}`;
      }
    }

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000',
            backgroundImage: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
            position: 'relative',
          }}
        >
          {/* Purple gradient overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at 50% 50%, rgba(127, 86, 217, 0.3) 0%, transparent 70%)',
            }}
          />

          {/* Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            {/* Avatar */}
            {absoluteAvatarUrl ? (
              <img
                src={absoluteAvatarUrl}
                alt="Avatar"
                width={150}
                height={150}
                style={{
                  borderRadius: '50%',
                  border: '4px solid rgba(127, 86, 217, 0.6)',
                  marginBottom: 30,
                }}
              />
            ) : (
              <div
                style={{
                  width: 150,
                  height: 150,
                  borderRadius: '50%',
                  backgroundColor: '#7F56D9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 30,
                  border: '4px solid rgba(127, 86, 217, 0.6)',
                }}
              >
                <svg
                  width="80"
                  height="80"
                  viewBox="0 0 200 200"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="100" cy="80" r="35" fill="#fff" />
                  <path
                    d="M40 160 C40 140, 60 120, 100 120 C140 120, 160 140, 160 160 L160 180 C160 190, 150 200, 140 200 L60 200 C50 200, 40 190, 40 180 Z"
                    fill="#fff"
                  />
                </svg>
              </div>
            )}

            {/* User Name */}
            <div
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: '#fff',
                marginBottom: 20,
                textAlign: 'center',
              }}
            >
              {userName}
            </div>

            {/* Invitation Text */}
            <div
              style={{
                fontSize: 28,
                color: '#cbbaee',
                marginBottom: 20,
                textAlign: 'center',
              }}
            >
              invites you to join the waitlist
            </div>

            {/* Zenko Logo */}
            <div
              style={{
                fontSize: 72,
                fontWeight: 700,
                color: '#fdb022',
                marginBottom: 20,
                letterSpacing: '-0.02em',
              }}
            >
              Zenko
            </div>

            {/* Tagline */}
            <div
              style={{
                fontSize: 26,
                fontWeight: 600,
                color: '#fff',
                marginBottom: 10,
                textAlign: 'center',
              }}
            >
              Get access to Zenko Closed Beta
            </div>

            {/* XP Points */}
            <div
              style={{
                fontSize: 22,
                color: '#fdb022',
                marginBottom: 30,
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              + {referralPoints} XP points
            </div>

            {/* Referral Code Badge */}
            {referralCode && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(127, 86, 217, 0.2)',
                  border: '2px solid rgba(127, 86, 217, 0.5)',
                  borderRadius: 12,
                  padding: '16px 32px',
                }}
              >
                <div
                  style={{
                    fontSize: 20,
                    color: '#cbbaee',
                    marginRight: 12,
                  }}
                >
                  Use referral code:
                </div>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 700,
                    color: '#fdb022',
                    letterSpacing: '0.1em',
                  }}
                >
                  {referralCode.toUpperCase()}
                </div>
              </div>
            )}
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

    // Return a fallback image
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000',
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: '#fdb022',
            }}
          >
            Zenko
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
  }
}
