import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';
import { WAITLIST_CLOSED_MESSAGE } from '@/lib/waitlist-status';
import { TEST_SESSION_SECRET } from '@/lib/__tests__/session-fixtures';

// Virtualeagues sign-in with the code exchange and user read stubbed: the
// provider answers with the account the code belongs to, and these cases are
// about what the route does next.

const VL_SUBJECT = 'vl-subject-1';
const STATE_COOKIE = 'vl_oauth_state';
const STATE = 'state-1';

const db = vi.hoisted(() => ({ findUnique: vi.fn(), create: vi.fn(), update: vi.fn() }));

vi.mock('@/lib/prisma', () => ({
  prisma: { waitlistUser: { findUnique: db.findUnique, create: db.create, update: db.update } },
}));
vi.mock('@/lib/username', () => ({ generateUniqueUsername: vi.fn(async () => 'vl-player') }));
vi.mock('@/lib/virtualeagues', async () => {
  const actual = await vi.importActual<typeof import('@/lib/virtualeagues')>('@/lib/virtualeagues');
  return {
    ...actual,
    vlEnabled: () => true,
    exchangeCode: vi.fn(async () => ({ accessToken: 'access-token' })),
    fetchUser: vi.fn(async () => ({
      sub: VL_SUBJECT,
      displayName: 'VL Player',
      email: 'vl@example.com',
      avatarUrl: null,
    })),
  };
});

import { POST } from './route';

function signInRequest() {
  const cookie = encodeURIComponent(JSON.stringify({ state: STATE, codeVerifier: 'verifier' }));
  return new NextRequest('http://localhost/api/auth/virtualeagues', {
    method: 'POST',
    body: JSON.stringify({ code: 'code-1', state: STATE }),
    headers: { cookie: `${STATE_COOKIE}=${cookie}` },
  });
}

/** The row a response's session names, read straight off the cookie payload. */
function sessionSubject(response: Response): string | undefined {
  const line = response.headers.getSetCookie().find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!line) return undefined;
  const token = line.slice(SESSION_COOKIE.length + 1).split(';')[0];
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub;
}

/** Whether the response tells the browser to drop the cookie, as it reads Set-Cookie. */
function clearsCookie(response: Response, name: string): boolean {
  return response.headers
    .getSetCookie()
    .some((line) => line.startsWith(`${name}=;`) && line.includes('Expires=Thu, 01 Jan 1970 00:00:00 GMT'));
}

beforeEach(() => {
  vi.stubEnv('WAITLIST_SESSION_SECRET', TEST_SESSION_SECRET);
  db.findUnique.mockReset().mockResolvedValue(null);
  db.create.mockReset().mockImplementation(async ({ data }) => ({ id: 'new-user-1', ...data }));
  db.update.mockReset().mockImplementation(async ({ data }) => ({ id: 'existing-user-1', ...data }));
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Virtualeagues sign-in while the waitlist is open', () => {
  it('creates the row for a new account and clears the state cookie', async () => {
    const response = await POST(signInRequest());

    expect(response.status).toBe(200);
    expect(db.create).toHaveBeenCalledTimes(1);
    expect(sessionSubject(response)).toBe('new-user-1');
    expect(clearsCookie(response, STATE_COOKIE)).toBe(true);
  });
});

describe('Virtualeagues sign-in while the waitlist is closed', () => {
  beforeEach(() => {
    vi.stubEnv('WAITLIST_STATUS', 'closed');
  });

  it('refuses a new sign-up, mints no row and clears the state cookie', async () => {
    const response = await POST(signInRequest());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: WAITLIST_CLOSED_MESSAGE });
    expect(db.create).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
    expect(sessionSubject(response)).toBeUndefined();
    expect(clearsCookie(response, STATE_COOKIE)).toBe(true);
  });

  it('still signs a returning player in and leaves their row as it is', async () => {
    db.findUnique.mockResolvedValueOnce({ id: 'existing-user-1', oauthProvider: 'virtualeagues', oauthId: VL_SUBJECT });

    const response = await POST(signInRequest());

    expect(response.status).toBe(200);
    expect(sessionSubject(response)).toBe('existing-user-1');
    expect(db.update).not.toHaveBeenCalled();
    expect(db.create).not.toHaveBeenCalled();
    expect(clearsCookie(response, STATE_COOKIE)).toBe(true);
  });
});
