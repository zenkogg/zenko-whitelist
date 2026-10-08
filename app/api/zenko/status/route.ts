/**
 * Tells the waitlist pages whether Zenko is open, so they can show the
 * "Zenko is open" banner. The backend read happens here on the server, where
 * it is cached and bounded (see lib/zenko-open); any failure answers closed.
 */

import { NextResponse } from 'next/server';
import { readZenkoOpen } from '@/lib/zenko-open';

export async function GET() {
  const open = await readZenkoOpen();
  return NextResponse.json(
    { open },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60' } }
  );
}
