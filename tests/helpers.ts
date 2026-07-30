import { getServerConfig, type ServerConfig } from "@/lib/config";
import type { PassiveCheckResult } from "@/lib/security/passive-checks";
import type { ProviderResult, ProviderStatus } from "@/lib/types";

export function testConfig(
  overrides: Partial<Record<keyof ServerConfig, string>> = {},
): ServerConfig {
  return getServerConfig({
    NODE_ENV: "test",
    APP_MODE: "live",
    PROJECT_USE_MODE: "noncommercial",
    APP_BASE_URL: "http://localhost:3000",
    ENABLE_GOOGLE_SAFE_BROWSING: "false",
    ENABLE_URLHAUS: "false",
    ENABLE_PHISHTANK: "false",
    ENABLE_OTX: "false",
    ENABLE_VIRUSTOTAL: "false",
    STRICT_PROVIDER_TERMS: "false",
    RATE_LIMIT_HASH_SECRET: "tests-only-rate-limit-secret-value",
    ...overrides,
  } as NodeJS.ProcessEnv);
}

export function passiveResult(
  overrides: Partial<PassiveCheckResult> = {},
): PassiveCheckResult {
  return {
    available: true,
    finalUrl: "https://example.com/",
    finalDomain: "example.com",
    redirectCount: 0,
    redirectedAcrossDomains: false,
    httpsObserved: true,
    tlsValid: true,
    tlsExpiresAt: "2027-01-01T00:00:00.000Z",
    tlsExpiresSoon: false,
    errorCode: null,
    explanation: "Test-only passive result.",
    ...overrides,
  };
}

export function providerResult(
  providerId: string,
  status: ProviderStatus,
  overrides: Partial<ProviderResult> = {},
): ProviderResult {
  return {
    providerId,
    providerName: providerId,
    status,
    match: status === "MATCH",
    threatCategory: status === "MATCH" ? "Test-only match" : null,
    confidence: status === "MATCH" ? "HIGH" : "MEDIUM",
    checkedAt: "2026-07-30T12:00:00.000Z",
    detectionDate: null,
    lastUpdatedAt: "2026-07-30T12:00:00.000Z",
    dataFreshness: "Test-only fresh result",
    resultType: "DIRECT",
    errorCode: null,
    explanation: "Reserved fixture provider result.",
    attribution: "Test fixture",
    mayBeStale: status === "STALE_RESULT",
    unavailable: [
      "UNAVAILABLE",
      "RATE_LIMITED",
      "NOT_CONFIGURED",
      "TERMS_RESTRICTED",
      "INVALID_RESPONSE",
      "ERROR",
    ].includes(status),
    urlSentToProvider: false,
    providerMayRetainOrShareUrl: false,
    cacheExpiresAt: null,
    ...overrides,
  };
}
