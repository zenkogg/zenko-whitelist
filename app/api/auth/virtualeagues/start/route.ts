import { NextResponse } from 'next/server';
import {
  buildAuthorizeUrl,
  deriveCodeChallenge,
  generateCodeVerifier,
  generateState,
  vlConfigured,
} from '@/lib/virtualeagues';

const COOKIE_NAME = 'vl_oauth_state';
const COOKIE_MAX_AGE = 600; // 10 min

export async function POST() {
  if (!vlConfigured()) {
    return NextResponse.json({ error: 'Virtualeagues OAuth not configured' }, { status: 500 });
  }

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = deriveCodeChallenge(codeVerifier);

  const authorizeUrl = buildAuthorizeUrl({ state, codeChallenge });

  const res = NextResponse.json({ authorizeUrl });
  res.cookies.set(COOKIE_NAME, JSON.stringify({ state, codeVerifier }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
  return res;
}
