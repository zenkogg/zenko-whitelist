import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  OWNER_ID,
  STRANGER_ID,
  TEST_SESSION_SECRET,
  forgedSession,
  requestAs,
  requestWithSession,
} from '@/lib/__tests__/session-fixtures';

const db = vi.hoisted(() => ({ findUnique: vi.fn(), update: vi.fn() }));
const blob = vi.hoisted(() => ({ put: vi.fn(), del: vi.fn() }));
const rekognition = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('@/lib/prisma', () => ({
  prisma: { waitlistUser: { findUnique: db.findUnique, update: db.update } },
}));
vi.mock('@vercel/blob', () => ({ put: blob.put, del: blob.del }));
vi.mock('@aws-sdk/client-rekognition', () => ({
  RekognitionClient: class {
    send = rekognition.send;
  },
  DetectModerationLabelsCommand: class {
    constructor(public input: unknown) {}
  },
}));

import { DELETE, POST } from './route';

const URL = 'http://localhost/api/user/avatar';

function pngFile() {
  return new File([new Uint8Array([1, 2, 3, 4])], 'face.png', { type: 'image/png' });
}

beforeEach(() => {
  process.env.WAITLIST_SESSION_SECRET = TEST_SESSION_SECRET;
  db.findUnique.mockReset().mockResolvedValue({ id: OWNER_ID, customAvatarUrl: null });
  db.update.mockReset().mockImplementation(async ({ where, data }) => ({
    id: where.id,
    customAvatarUrl: data.customAvatarUrl,
  }));
  blob.put.mockReset().mockResolvedValue({ url: 'https://blob.example/avatar.png' });
  blob.del.mockReset().mockResolvedValue(undefined);
  rekognition.send.mockReset().mockResolvedValue({ ModerationLabels: [] });
});

describe('avatar upload', () => {
  it('refuses a caller with no session', async () => {
    const response = await POST(
      requestWithSession(URL, null, { form: { avatar: pngFile() } })
    );

    expect(response.status).toBe(401);
    expect(blob.put).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it('refuses to write an avatar onto a row named only in the form', async () => {
    const response = await POST(
      requestWithSession(URL, null, { form: { avatar: pngFile(), userId: STRANGER_ID } })
    );

    expect(response.status).toBe(401);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('refuses a session signed by a key this deployment does not hold', async () => {
    const response = await POST(
      requestWithSession(URL, await forgedSession(STRANGER_ID), { form: { avatar: pngFile() } })
    );

    expect(response.status).toBe(401);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('writes the avatar onto the signed-in row even when the form names another', async () => {
    const response = await POST(
      await requestAs(URL, OWNER_ID, { form: { avatar: pngFile(), userId: STRANGER_ID } })
    );

    expect(response.status).toBe(200);
    expect(db.update.mock.calls[0][0].where.id).toBe(OWNER_ID);
  });

  it('stores the uploaded image for the signed-in caller', async () => {
    const response = await POST(await requestAs(URL, OWNER_ID, { form: { avatar: pngFile() } }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { avatarUrl: 'https://blob.example/avatar.png' },
    });
  });

  it('still refuses a file type it does not accept', async () => {
    const bad = new File([new Uint8Array([1])], 'payload.svg', { type: 'image/svg+xml' });

    const response = await POST(await requestAs(URL, OWNER_ID, { form: { avatar: bad } }));

    expect(response.status).toBe(400);
    expect(blob.put).not.toHaveBeenCalled();
  });

  it('still refuses an image moderation flags', async () => {
    rekognition.send.mockResolvedValueOnce({
      ModerationLabels: [{ Name: 'Explicit Nudity', Confidence: 99 }],
    });

    const response = await POST(await requestAs(URL, OWNER_ID, { form: { avatar: pngFile() } }));

    expect(response.status).toBe(400);
    expect(blob.put).not.toHaveBeenCalled();
  });

  it('still refuses an upload with no file', async () => {
    const response = await POST(await requestAs(URL, OWNER_ID, { form: {} }));

    expect(response.status).toBe(400);
    expect(blob.put).not.toHaveBeenCalled();
  });
});

describe('avatar removal', () => {
  it('refuses a caller with no session', async () => {
    const response = await DELETE(requestWithSession(URL, null, { method: 'DELETE' }));

    expect(response.status).toBe(401);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('refuses to clear a row named only in the body', async () => {
    const response = await DELETE(
      requestWithSession(URL, null, { method: 'DELETE', body: { userId: STRANGER_ID } })
    );

    expect(response.status).toBe(401);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('clears the signed-in row even when the body names another', async () => {
    const response = await DELETE(
      await requestAs(URL, OWNER_ID, { method: 'DELETE', body: { userId: STRANGER_ID } })
    );

    expect(response.status).toBe(200);
    expect(db.update.mock.calls[0][0].where.id).toBe(OWNER_ID);
  });

  it('clears the avatar for a signed-in caller sending no body at all', async () => {
    const response = await DELETE(await requestAs(URL, OWNER_ID, { method: 'DELETE' }));

    expect(response.status).toBe(200);
    expect(db.update.mock.calls[0][0].data).toEqual({ customAvatarUrl: null });
  });

  it('deletes the stored image it was holding', async () => {
    db.findUnique.mockResolvedValueOnce({
      id: OWNER_ID,
      customAvatarUrl: 'https://x.blob.vercel-storage.com/old.png',
    });

    const response = await DELETE(await requestAs(URL, OWNER_ID, { method: 'DELETE' }));

    expect(response.status).toBe(200);
    expect(blob.del).toHaveBeenCalledWith('https://x.blob.vercel-storage.com/old.png');
  });
});
