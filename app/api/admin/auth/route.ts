import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    const result = await authenticateAdmin(idToken);
    if (!result.ok) {
      return result.reason === 'not_admin'
        ? NextResponse.json({ error: 'Access denied' }, { status: 403 })
        : NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    return NextResponse.json({
      authorized: true,
      email: result.email,
      name: result.name,
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
