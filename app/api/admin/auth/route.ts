import { NextRequest, NextResponse } from 'next/server';

function parseJwtClaims(jwt: string): { email?: string; name?: string } | null {
  try {
    const [, payloadBase64] = jwt.split('.');
    const payload = JSON.parse(atob(payloadBase64));
    return { email: payload.email, name: payload.name };
  } catch {
    return null;
  }
}

function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || '';
  return raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    const claims = parseJwtClaims(idToken);
    if (!claims?.email) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    const adminEmails = getAdminEmails();
    if (!adminEmails.includes(claims.email.toLowerCase())) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({
      authorized: true,
      email: claims.email,
      name: claims.name,
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
