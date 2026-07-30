import { afterEach, describe, expect, it } from "vitest";

import { checkProviders, clearProviderCacheForTests } from "@/lib/providers";
import type {
  ProviderCheckContext,
  ThreatProvider,
} from "@/lib/providers/provider";
import { providerResult, testConfig } from "@/tests/helpers";

afterEach(() => {
  clearProviderCacheForTests();
});

describe("provider orchestration", () => {
  it("reuses an allowed cache entry only until its expiration", async () => {
    let currentTime = new Date("2026-07-30T12:00:00.000Z");
    let calls = 0;
    const provider: ThreatProvider = {
      id: "google-safe-browsing",
      name: "Google Safe Browsing",
      networkConfigured: false,
      async check() {
        calls += 1;
        return providerResult("google-safe-browsing", "NO_MATCH", {
          checkedAt: currentTime.toISOString(),
          cacheExpiresAt: new Date(
            currentTime.getTime() + 60_000,
          ).toISOString(),
        });
      },
    };
    const context: ProviderCheckContext = {
      now: () => currentTime,
      fetchImpl: fetch,
      config: testConfig(),
    };

    await checkProviders("https://example.com/", [provider], context);
    currentTime = new Date("2026-07-30T12:00:30.000Z");
    const cached = await checkProviders(
      "https://example.com/",
      [provider],
      context,
    );
    expect(calls).toBe(1);
    expect(cached[0]?.metadata).toMatchObject({ cached: true });

    currentTime = new Date("2026-07-30T12:01:01.000Z");
    await checkProviders("https://example.com/", [provider], context);
    expect(calls).toBe(2);
  });
});
