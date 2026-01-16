import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, games } = body;

    // Validate required fields
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!games || !Array.isArray(games) || games.length === 0) {
      return NextResponse.json(
        { error: 'At least one game must be selected' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Get client info for tracking
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null;
    const userAgent = request.headers.get('user-agent') || null;

    // Check if email already exists
    const existingEntry = await prisma.whitelistEntry.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingEntry) {
      // Update the existing entry with new games (merge)
      const updatedEntry = await prisma.whitelistEntry.update({
        where: { email: email.toLowerCase() },
        data: {
          games: Array.from(new Set([...existingEntry.games, ...games])),
          ipAddress,
          userAgent,
        },
      });

      return NextResponse.json(
        { message: 'Whitelist entry updated', id: updatedEntry.id },
        { status: 200 }
      );
    }

    // Create new whitelist entry
    const entry = await prisma.whitelistEntry.create({
      data: {
        email: email.toLowerCase(),
        games,
        ipAddress,
        userAgent,
      },
    });

    return NextResponse.json(
      { message: 'Successfully joined whitelist', id: entry.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Whitelist API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
