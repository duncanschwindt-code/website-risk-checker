import { describe, expect, it } from "vitest";

import { analyzeUrl } from "@/lib/analysis/analyze";
import type { DnsResolver } from "@/lib/security/url-validation";
import { passiveResult, providerResult, testConfig } from "@/tests/helpers";

const publicResolver: DnsResolver = async () => [
  { address: "8.8.8.8", family: 4 },
];

describe("analysis orchestration", () => {
  it("redacts sensitive URL components and reports unavailable sources without changing score", async () => {
    const result = await analyzeUrl(
      "https://example.com/path?token=secret#private",
      {
        config: testConfig(),
        resolver: publicResolver,
        providers: [],
        now: () => new Date("2026-07-30T12:00:00.000Z"),
        id: () => "test-result-1",
        passiveCheck: async () => passiveResult(),
        providerCheck: async () => [
          providerResult("google-safe-browsing", "NOT_CONFIGURED"),
          providerResult("virustotal", "RATE_LIMITED"),
        ],
      },
    );

    expect(result).toMatchObject({
      id: "test-result-1",
      normalizedDomain: "example.com",
      originalInputRedacted: "https://example.com/path",
      score: 0,
      category: "Lower observed risk",
      confidence: "LOW",
    });
    expect(JSON.stringify(result)).not.toContain("token=secret");
    expect(JSON.stringify(result)).not.toContain("#private");
    expect(result.summary).toContain("does not guarantee");
  });

  it("preserves a current match when another provider returns no match", async () => {
    const result = await analyzeUrl("https://example.com/", {
      config: testConfig(),
      resolver: publicResolver,
      providers: [],
      now: () => new Date("2026-07-30T12:00:00.000Z"),
      passiveCheck: async () => passiveResult(),
      providerCheck: async () => [
        providerResult("google-safe-browsing", "MATCH"),
        providerResult("phishtank", "NO_MATCH"),
      ],
    });
    expect(result.score).toBe(60);
    expect(result.category).toBe("Elevated observed risk");
    expect(result.indicators).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ evidenceKind: "PROVIDER_DISAGREEMENT" }),
      ]),
    );
  });

  it("caps a collection of local heuristics below elevated risk", async () => {
    const result = await analyzeUrl(
      "http://a.b.c.d.e.f.xn--bcher-kva.example/" +
        "long/".repeat(40) +
        "@name",
      {
        config: testConfig(),
        resolver: publicResolver,
        providers: [],
        now: () => new Date("2026-07-30T12:00:00.000Z"),
        passiveCheck: async () =>
          passiveResult({
            finalUrl: "http://a.b.c.d.e.f.xn--bcher-kva.example/",
            finalDomain: "a.b.c.d.e.f.xn--bcher-kva.example",
            httpsObserved: false,
            tlsValid: null,
            tlsExpiresAt: null,
          }),
        providerCheck: async () => [],
      },
    );
    expect(result.score).toBeLessThanOrEqual(24);
    expect(result.category).toBe("Lower observed risk");
  });

  it("uses no live provider or destination network in the injected integration path", async () => {
    let providerCalled = 0;
    let passiveCalled = 0;
    await analyzeUrl("https://example.com/", {
      config: testConfig(),
      resolver: publicResolver,
      providers: [],
      passiveCheck: async () => {
        passiveCalled += 1;
        return passiveResult();
      },
      providerCheck: async () => {
        providerCalled += 1;
        return [];
      },
    });
    expect({ providerCalled, passiveCalled }).toEqual({
      providerCalled: 1,
      passiveCalled: 1,
    });
  });
});
