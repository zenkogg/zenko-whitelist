/**
 * Internal-API bearer-token check.
 *
 * Used by `app/api/internal/**` routes that are called server-to-server by
 * the zenko-mono backend during signup. The shared secret lives in the
 * `ZENKO_INTERNAL_TOKEN` env var and must match the value zenko-mono sends.
 *
 * Returns a 401 NextResponse when auth fails (so callers can early-return),
 * or `null` when the request is authorized.
 *
 * Hardening notes:
 *   - When the server is missing `ZENKO_INTERNAL_TOKEN`, we reject with 503
 *     rather than letting any caller through. Misconfigured prod >> open prod.
 *   - Use a constant-time compare to avoid leaking the token via timing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

export function requireInternalToken(req: NextRequest): NextResponse | null {
  const expected = (process.env.ZENKO_INTERNAL_TOKEN ?? '').trim();
  if (!expected) {
    console.error('[internal-auth] ZENKO_INTERNAL_TOKEN is not configured');
    return NextResponse.json(
      { error: 'Internal auth not configured' },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const presented = authHeader.slice('Bearer '.length).trim();
  if (presented.length === 0 || presented.length !== expected.length) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (!timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
