import { afterEach, describe, expect, it, vi } from "vitest";

import googleMatch from "@/tests/fixtures/providers/google-match.json";
import googleNoMatch from "@/tests/fixtures/providers/google-no-match.json";
import otxPulses from "@/tests/fixtures/providers/otx-pulses.json";
import phishTankVerified from "@/tests/fixtures/providers/phishtank-verified.json";
import urlhausMatch from "@/tests/fixtures/providers/urlhaus-match.json";
import virusTotalReport from "@/tests/fixtures/providers/virustotal-report.json";
import { providerCompliance } from "@/lib/config";
import { GoogleSafeBrowsingProvider } from "@/lib/providers/google-safe-browsing";
import { OtxProvider } from "@/lib/providers/otx";
import { PhishTankProvider } from "@/lib/providers/phishtank";
import type {
  ProviderCheckContext,
  ProviderComplianceMetadata,
} from "@/lib/providers/provider";
import { UrlhausProvider } from "@/lib/providers/urlhaus";
import { VirusTotalProvider } from "@/lib/providers/virustotal";
import { validateStartupProviderCompliance } from "@/lib/providers";
import { testConfig } from "@/tests/helpers";

function metadata(id: string): ProviderComplianceMetadata {
  const found = providerCompliance.providers.find(
    (provider) => provider.id === id,
  );
  if (!found) throw new Error(`Missing test metadata for ${id}`);
  return found;
}

function mockFetch(
  data: unknown,
  status = 200,
  headers: HeadersInit = {},
): typeof fetch {
  return vi.fn(async () => {
    return new Response(JSON.stringify(data), {
      status,
      headers: { "content-type": "application/json", ...headers },
    });
  }) as unknown as typeof fetch;
}

function context(
  fetchImpl: typeof fetch,
  overrides = {},
): ProviderCheckContext {
  return {
    now: () => new Date("2026-07-30T12:00:00.000Z"),
    fetchImpl,
    config: testConfig(overrides),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("provider adapters", () => {
  it("treats a missing API key as not configured", async () => {
    const fetchImpl = mockFetch(googleNoMatch);
    const provider = new GoogleSafeBrowsingProvider(
      metadata("google-safe-browsing"),
      true,
      undefined,
    );
    const result = await provider.check(
      "https://example.com/",
      context(fetchImpl),
    );
    expect(result.status).toBe("NOT_CONFIGURED");
    expect(result.match).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("normalizes a Google match and honors cache duration", async () => {
    const fetchImpl = mockFetch(googleMatch);
    const provider = new GoogleSafeBrowsingProvider(
      metadata("google-safe-browsing"),
      true,
      "test-key",
    );
    const result = await provider.check(
      "https://example.com/",
      context(fetchImpl),
    );
    expect(result).toMatchObject({
      status: "MATCH",
      match: true,
      confidence: "HIGH",
      urlSentToProvider: true,
    });
    expect(result.cacheExpiresAt).toBe("2026-07-30T12:30:00.000Z");
    expect(JSON.stringify(result)).not.toContain("test-key");
  });

  it("normalizes a Google no-match without safety wording", async () => {
    const provider = new GoogleSafeBrowsingProvider(
      metadata("google-safe-browsing"),
      true,
      "test-key",
    );
    const result = await provider.check(
      "https://example.com/",
      context(mockFetch(googleNoMatch)),
    );
    expect(result.status).toBe("NO_MATCH");
    expect(result.explanation.toLowerCase()).toContain("not proof of safety");
  });

  it("handles an invalid API key without exposing it", async () => {
    const provider = new GoogleSafeBrowsingProvider(
      metadata("google-safe-browsing"),
      true,
      "super-secret-test-key",
    );
    const result = await provider.check(
      "https://example.com/",
      context(mockFetch({}, 403)),
    );
    expect(result).toMatchObject({
      status: "ERROR",
      errorCode: "INVALID_API_KEY",
    });
    expect(JSON.stringify(result)).not.toContain("super-secret-test-key");
  });

  it("handles quota responses as score-neutral normalized state", async () => {
    const provider = new UrlhausProvider(metadata("urlhaus"), true, "test-key");
    const result = await provider.check(
      "https://example.com/",
      context(mockFetch({}, 429)),
    );
    expect(result).toMatchObject({
      status: "RATE_LIMITED",
      match: null,
      errorCode: "PROVIDER_QUOTA_REACHED",
    });
  });

  it("rejects a malformed provider response", async () => {
    const provider = new GoogleSafeBrowsingProvider(
      metadata("google-safe-browsing"),
      true,
      "test-key",
    );
    const result = await provider.check(
      "https://example.com/",
      context(mockFetch({ unexpected: true })),
    );
    expect(result).toMatchObject({
      status: "INVALID_RESPONSE",
      errorCode: "SCHEMA_VALIDATION_FAILED",
    });
  });

  it("normalizes a URLhaus malware-distribution match cautiously", async () => {
    const provider = new UrlhausProvider(metadata("urlhaus"), true, "test-key");
    const result = await provider.check(
      "https://example.com/",
      context(mockFetch(urlhausMatch)),
    );
    expect(result.status).toBe("MATCH");
    expect(result.explanation).toContain(
      "legitimate website that was compromised",
    );
  });

  it("scores only verified and currently valid PhishTank entries as matches", async () => {
    const provider = new PhishTankProvider(
      metadata("phishtank"),
      true,
      "test-key",
    );
    const verified = await provider.check(
      "https://example.com/",
      context(mockFetch(phishTankVerified)),
    );
    const unverified = await provider.check(
      "https://example.com/",
      context(
        mockFetch({
          results: { in_database: true, verified: false, valid: true },
        }),
      ),
    );
    expect(verified.status).toBe("MATCH");
    expect(unverified.status).toBe("NO_MATCH");
    expect(unverified.match).toBe(false);
    expect(unverified.resultType).toBe("INFERRED");
  });

  it("normalizes recent OTX pulses as community context", async () => {
    const provider = new OtxProvider(metadata("otx"), true, "test-key");
    const result = await provider.check(
      "https://example.com/",
      context(mockFetch(otxPulses)),
    );
    expect(result).toMatchObject({
      status: "MATCH",
      threatCategory: "Community threat-intelligence pulse",
    });
    expect(result.explanation).toContain("not definitive");
  });

  it("uses an existing VirusTotal report without submitting a URL", async () => {
    const fetchImpl = mockFetch(virusTotalReport);
    const provider = new VirusTotalProvider(
      metadata("virustotal"),
      true,
      "test-key",
    );
    const result = await provider.check(
      "https://example.com/",
      context(fetchImpl),
    );
    expect(result.status).toBe("MATCH");
    expect(result.metadata).toMatchObject({
      maliciousEngines: 3,
      suspiciousEngines: 1,
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("/api/v3/urls/"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("treats a missing VirusTotal report as no conclusion rather than submitting", async () => {
    const provider = new VirusTotalProvider(
      metadata("virustotal"),
      true,
      "test-key",
    );
    const result = await provider.check(
      "https://example.com/",
      context(mockFetch({}, 404)),
    );
    expect(result.status).toBe("NO_MATCH");
    expect(result.explanation).toContain("not submitted");
  });

  it("refuses startup when a restricted provider is enabled in commercial mode", () => {
    const config = testConfig({
      PROJECT_USE_MODE: "commercial",
      ENABLE_GOOGLE_SAFE_BROWSING: "true",
      GOOGLE_SAFE_BROWSING_API_KEY: "test-key",
    });
    expect(() => validateStartupProviderCompliance(config)).toThrow(
      /cannot start/i,
    );
  });
});
