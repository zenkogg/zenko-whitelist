import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exchangeCode, fetchUser, VlOAuthError, vlEnabled } from '@/lib/virtualeagues';
import { generateUniqueUsername } from '@/lib/username';
import { formatDisplayName } from '@/lib/utils';

const COOKIE_NAME = 'vl_oauth_state';
const VL_PROVIDER = 'virtualeagues';

interface StateCookie {
  state: string;
  codeVerifier: string;
}

function parseStateCookie(value: string | undefined): StateCookie | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.state === 'string' &&
      typeof parsed.codeVerifier === 'string'
    ) {
      return { state: parsed.state, codeVerifier: parsed.codeVerifier };
    }
  } catch {
    // fall through
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (!vlEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  try {
    const { code, state } = await req.json();

    if (!code || !state) {
      return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
    }

    const cookie = parseStateCookie(req.cookies.get(COOKIE_NAME)?.value);
    if (!cookie) {
      return NextResponse.json(
        { error: 'Session expired, please try again' },
        { status: 400 }
      );
    }

    if (cookie.state !== state) {
      return NextResponse.json({ error: 'State mismatch' }, { status: 400 });
    }

    // Capture client info
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      null;
    const userAgent = req.headers.get('user-agent') || null;

    // Exchange code for tokens, then fetch the VL user.
    const tokens = await exchangeCode({ code, codeVerifier: cookie.codeVerifier });
    const vlUser = await fetchUser({ accessToken: tokens.accessToken });

    const displayName = vlUser.displayName || 'User';
    const oauthAvatarUrl = vlUser.avatarUrl || null;

    const existingUser = await prisma.waitlistUser.findUnique({
      where: { oauthProvider_oauthId: { oauthProvider: VL_PROVIDER, oauthId: vlUser.sub } },
    });

    const user = existingUser
      ? await prisma.waitlistUser.update({
          where: { id: existingUser.id },
          data: {
            displayName,
            oauthAvatarUrl,
            email: vlUser.email || existingUser.email,
            ipAddress,
            userAgent,
          },
        })
      : await prisma.waitlistUser.create({
          data: {
            oauthProvider: VL_PROVIDER,
            oauthId: vlUser.sub,
            email: vlUser.email || null,
            emailVerified: false,
            displayName,
            oauthAvatarUrl,
            referralCode: await generateUniqueReferralCode(),
            username: await generateUniqueUsername(
              formatDisplayName(displayName, VL_PROVIDER, vlUser.email ?? null, null)
            ),
            games: [],
            ipAddress,
            userAgent,
            status: 'PENDING',
          },
        });

    const res = NextResponse.json({ user });
    res.cookies.delete(COOKIE_NAME);
    return res;
  } catch (error) {
    if (error instanceof VlOAuthError) {
      console.error('Virtualeagues auth error:', error.code, error.message, error.raw);
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status ?? 400 }
      );
    }
    console.error('Virtualeagues auth error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function generateUniqueReferralCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  let isUnique = false;

  while (!isUnique) {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const existing = await prisma.waitlistUser.findUnique({ where: { referralCode: code } });
    if (!existing) isUnique = true;
  }

  return code;
}
