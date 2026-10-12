import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("next/server", async () => ({
  ...(await vi.importActual<typeof import("next/server")>("next/server")),
  after: vi.fn(),
}));
vi.mock("@/lib/loops/sync", () => ({ syncWaitlistUser: vi.fn() }));

const state = vi.hoisted(() => ({ findUnique: vi.fn(), updateMany: vi.fn() }));

vi.mock("@/lib/prisma", () => {
  const client = {
    waitlistUser: {
      findUnique: state.findUnique,
      updateMany: state.updateMany,
    },
  };
  return {
    prisma: {
      ...client,
      $transaction: (work: (tx: typeof client) => Promise<unknown>) =>
        work(client),
    },
  };
});
vi.mock("@/lib/internal-auth", () => ({ requireInternalToken: () => null }));

import { POST } from "./route";

beforeEach(() => {
  state.findUnique.mockReset();
  state.updateMany.mockReset();
});

describe("internal waitlist lookup referral history", () => {
  it("returns the denormalized waitlist referral count to the Zenko backend", async () => {
    state.findUnique.mockResolvedValue({
      id: "waitlist-1",
      status: "PENDING",
      email: "player@example.com",
      displayName: "Player",
      referralCode: "ABC123",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      reputationPoints: 30,
      referralCount: 3,
      referredBy: {
        id: "waitlist-referrer",
        displayName: "Inviter",
        oauthAvatarUrl: "https://cdn.example/oauth.png",
        customAvatarUrl: "https://cdn.example/custom.png",
      },
    });
    const request = new NextRequest(
      "http://localhost/api/internal/waitlist/lookup",
      {
        method: "POST",
        body: JSON.stringify({ provider: "google", oauthId: "oauth-1" }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      match: {
        id: "waitlist-1",
        reputationPoints: 30,
        referralCount: 3,
        referredBy: {
          id: "waitlist-referrer",
          displayName: "Inviter",
          avatarUrl: "https://cdn.example/custom.png",
        },
      },
    });
  });

  it("falls back to the OAuth avatar when the referrer has no custom one", async () => {
    state.findUnique.mockResolvedValue({
      id: "waitlist-1",
      status: "PENDING",
      email: "player@example.com",
      displayName: "Player",
      referralCode: "ABC123",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      reputationPoints: 30,
      referralCount: 3,
      referredBy: {
        id: "waitlist-referrer",
        displayName: "Inviter",
        oauthAvatarUrl: "https://cdn.example/oauth.png",
        customAvatarUrl: null,
      },
    });
    const request = new NextRequest(
      "http://localhost/api/internal/waitlist/lookup",
      {
        method: "POST",
        body: JSON.stringify({ provider: "google", oauthId: "oauth-1" }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      match: {
        referredBy: { avatarUrl: "https://cdn.example/oauth.png" },
      },
    });
  });

  // A waitlist user with no referrer must read as an answered question, not as
  // a field the lookup forgot to project. The backend stores this snapshot and
  // cannot distinguish the two once written.
  it("returns an explicit null referrer when the waitlist user has none", async () => {
    state.findUnique.mockResolvedValue({
      id: "waitlist-1",
      status: "PENDING",
      email: "player@example.com",
      displayName: "Player",
      referralCode: "ABC123",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      reputationPoints: 30,
      referralCount: 0,
      referredBy: null,
    });
    const request = new NextRequest(
      "http://localhost/api/internal/waitlist/lookup",
      {
        method: "POST",
        body: JSON.stringify({ provider: "google", oauthId: "oauth-1" }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      match: { referredBy: unknown };
    };
    expect(body.match).toHaveProperty("referredBy");
    expect(body.match.referredBy).toBeNull();
  });
});

it("freezes waitlist attribution before returning the signup snapshot", async () => {
  state.findUnique.mockResolvedValue({
    id: "waitlist-1",
    status: "REGISTERED",
    email: null,
    displayName: "Player",
    referralCode: "LULU23",
    usedReferralCode: "N2K3Q4",
    createdAt: new Date("2026-01-01"),
    reputationPoints: 10,
    referralCount: 0,
    referredBy: {
      id: "old-referrer",
      referralCode: "N2K3Q4",
      displayName: "Inviter",
      oauthAvatarUrl: null,
      customAvatarUrl: null,
    },
  });
  const res = await POST(
    new NextRequest("http://localhost/api/internal/waitlist/lookup", {
      method: "POST",
      body: JSON.stringify({
        provider: "google",
        oauthId: "verified-sub",
        register: true,
      }),
    }),
  );
  expect(state.findUnique).toHaveBeenCalledOnce();
  expect(state.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        oauthProvider: "google",
        oauthId: "verified-sub",
        status: { not: "REGISTERED" },
      },
      data: { status: "REGISTERED", registeredAt: expect.any(Date) },
    }),
  );
  expect(await res.json()).toMatchObject({
    match: {
      referralCode: "LULU23",
      usedReferralCode: "N2K3Q4",
      referredBy: { referralCode: "N2K3Q4" },
    },
  });
});

it("does not accept a non-boolean registration flag", async () => {
  const res = await POST(
    new NextRequest("http://localhost/api/internal/waitlist/lookup", {
      method: "POST",
      body: JSON.stringify({
        provider: "google",
        oauthId: "verified-sub",
        register: "true",
      }),
    }),
  );
  expect(res.status).toBe(400);
  expect(state.updateMany).not.toHaveBeenCalled();
});

it("preserves the original registration timestamp on repeated handoffs", async () => {
  const original = new Date("2026-09-01T00:00:00.000Z");
  const row = {
    id: "waitlist-1",
    status: "REGISTERED",
    registeredAt: original,
    email: null,
    displayName: "Player",
    referralCode: "LULU23",
    usedReferralCode: null,
    createdAt: original,
    reputationPoints: 90,
    referralCount: 8,
    referredBy: null,
  };
  state.findUnique.mockImplementation(async () => ({ ...row }));
  state.updateMany.mockImplementation(async ({ where, data }) => {
    if (where.status?.not === row.status) return { count: 0 };
    Object.assign(row, data);
    return { count: 1 };
  });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const res = await POST(
      new NextRequest("http://localhost/api/internal/waitlist/lookup", {
        method: "POST",
        body: JSON.stringify({
          provider: "google",
          oauthId: "verified-sub",
          register: true,
        }),
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      match: { status: "REGISTERED", reputationPoints: 90, referralCount: 8 },
    });
  }
  expect(row.registeredAt).toEqual(original);
});

it("returns a clean miss when registration finds no waitlist identity", async () => {
  state.updateMany.mockResolvedValue({ count: 0 });
  state.findUnique.mockResolvedValue(null);
  const res = await POST(
    new NextRequest("http://localhost/api/internal/waitlist/lookup", {
      method: "POST",
      body: JSON.stringify({
        provider: "google",
        oauthId: "missing-sub",
        register: true,
      }),
    }),
  );
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ match: null });
});
