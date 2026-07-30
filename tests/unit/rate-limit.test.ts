import { describe, expect, it, vi } from "vitest";

import {
  FixedWindowRateLimiter,
  privacyPreservingRateKey,
  ProviderQueue,
  ProviderQuotaError,
} from "@/lib/security/rate-limit";

describe("rate-limit controls", () => {
  it("enforces the application window and resets after expiration", () => {
    let time = 1_000;
    const limiter = new FixedWindowRateLimiter(2, 1_000, () => time);
    expect(limiter.consume("key").allowed).toBe(true);
    expect(limiter.consume("key").allowed).toBe(true);
    expect(limiter.consume("key").allowed).toBe(false);
    time = 2_001;
    expect(limiter.consume("key").allowed).toBe(true);
  });

  it("does not expose a raw forwarded IP in a rate key", () => {
    const request = new Request("https://app.example/api", {
      headers: { "x-forwarded-for": "203.0.113.9", "user-agent": "test-agent" },
    });
    const key = privacyPreservingRateKey(request, "a".repeat(32), true);
    expect(key).not.toContain("203.0.113.9");
    expect(key).toMatch(/^[a-f0-9]{64}$/);
  });

  it("serializes provider calls and applies a minimum interval", async () => {
    let time = 0;
    const waits: number[] = [];
    const queue = new ProviderQueue(
      1_000,
      vi.fn(async (delay) => {
        waits.push(delay);
        time += delay;
      }),
      () => time,
    );
    await queue.schedule(async () => "one");
    await queue.schedule(async () => "two");
    expect(waits).toEqual([1_000, 1_000]);
    expect(queue.getUsage()).toMatchObject({
      requestCount: 2,
      quotaCount: null,
      quotaLimit: null,
    });
  });

  it("stops before exceeding a locally tracked provider quota", async () => {
    const queue = new ProviderQueue(
      0,
      async () => undefined,
      () => 1_000,
      { limit: 1, windowMs: 60_000 },
    );
    await expect(queue.schedule(async () => "first")).resolves.toBe("first");
    await expect(queue.schedule(async () => "second")).rejects.toBeInstanceOf(
      ProviderQuotaError,
    );
    expect(queue.getUsage()).toMatchObject({
      requestCount: 1,
      quotaCount: 1,
      quotaLimit: 1,
    });
  });
});
