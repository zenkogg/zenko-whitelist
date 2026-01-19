import { NextResponse } from 'next/server';
import { render } from '@react-email/render';
import { WelcomeEmail } from '@/emails/WelcomeEmail';

// Only available in development
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  const html = await render(WelcomeEmail());

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
