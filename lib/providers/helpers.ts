import type { ProviderComplianceMetadata } from "@/lib/providers/provider";
import { ResponsePolicyError } from "@/lib/security/request";
import type { Confidence, ProviderResult, ProviderStatus } from "@/lib/types";

export function baseProviderResult(
  metadata: ProviderComplianceMetadata,
  now: Date,
  overrides: Partial<ProviderResult> & { status: ProviderStatus },
): ProviderResult {
  const { status, ...remainingOverrides } = overrides;
  const unavailableStatuses: ProviderStatus[] = [
    "UNAVAILABLE",
    "RATE_LIMITED",
    "NOT_CONFIGURED",
    "TERMS_RESTRICTED",
    "INVALID_RESPONSE",
    "ERROR",
  ];
  return {
    providerId: metadata.id,
    providerName: metadata.name,
    status,
    match: null,
    threatCategory: null,
    confidence: "LOW",
    checkedAt: now.toISOString(),
    detectionDate: null,
    lastUpdatedAt: null,
    dataFreshness: "No usable provider result",
    resultType: "DIRECT",
    errorCode: null,
    explanation: "The provider did not return a usable result.",
    attribution: metadata.attribution,
    mayBeStale: false,
    unavailable: unavailableStatuses.includes(status),
    urlSentToProvider: false,
    providerMayRetainOrShareUrl: false,
    cacheExpiresAt: null,
    ...remainingOverrides,
  };
}

export function preflightProvider(
  metadata: ProviderComplianceMetadata,
  options: {
    enabled: boolean;
    key?: string;
    projectUseMode: "noncommercial" | "commercial";
  },
  now: Date,
): ProviderResult | null {
  if (!options.enabled || !options.key) {
    return baseProviderResult(metadata, now, {
      status: "NOT_CONFIGURED",
      explanation: options.enabled
        ? "This provider is enabled, but its server-side API key is not configured. No risk points were added or removed."
        : "This provider is disabled by the operator. No risk points were added or removed.",
      errorCode: options.enabled ? "MISSING_API_KEY" : "PROVIDER_DISABLED",
    });
  }
  if (metadata.noncommercialOnly && options.projectUseMode === "commercial") {
    return baseProviderResult(metadata, now, {
      status: "TERMS_RESTRICTED",
      explanation:
        "This provider's free access is restricted to noncommercial use and cannot run in commercial mode.",
      errorCode: "NONCOMMERCIAL_ONLY",
    });
  }
  return null;
}

export function httpFailureResult(
  metadata: ProviderComplianceMetadata,
  now: Date,
  status: number,
): ProviderResult {
  if (status === 429 || status === 509) {
    return baseProviderResult(metadata, now, {
      status: "RATE_LIMITED",
      errorCode: "PROVIDER_QUOTA_REACHED",
      explanation:
        "This provider could not be checked because its free usage limit was reached. No risk points were added or removed.",
      urlSentToProvider: true,
      providerMayRetainOrShareUrl: true,
    });
  }
  if (status === 401 || status === 403) {
    return baseProviderResult(metadata, now, {
      status: "ERROR",
      errorCode: "INVALID_API_KEY",
      explanation:
        "The provider rejected its configured credentials. No risk points were added or removed.",
      urlSentToProvider: true,
      providerMayRetainOrShareUrl: true,
    });
  }
  return baseProviderResult(metadata, now, {
    status: "UNAVAILABLE",
    errorCode: `HTTP_${status}`,
    explanation:
      "The provider was unavailable during this check. No risk points were added or removed.",
    urlSentToProvider: true,
    providerMayRetainOrShareUrl: true,
  });
}

export function responsePolicyFailureResult(
  metadata: ProviderComplianceMetadata,
  now: Date,
  error: unknown,
): ProviderResult {
  if (error instanceof ResponsePolicyError) {
    const invalid =
      error.code === "INVALID_JSON" || error.code === "OVERSIZED_RESPONSE";
    return baseProviderResult(metadata, now, {
      status: invalid ? "INVALID_RESPONSE" : "UNAVAILABLE",
      errorCode: error.code,
      explanation: invalid
        ? "The provider returned a response that failed safety or schema validation. No risk points were added or removed."
        : "The provider request failed or timed out. No risk points were added or removed.",
      urlSentToProvider: true,
      providerMayRetainOrShareUrl: true,
    });
  }
  return baseProviderResult(metadata, now, {
    status: "ERROR",
    errorCode: "UNEXPECTED_PROVIDER_ERROR",
    explanation:
      "The provider check failed safely. No risk points were added or removed.",
    urlSentToProvider: true,
    providerMayRetainOrShareUrl: true,
  });
}

export function confidenceFromCount(count: number): Confidence {
  if (count >= 3) return "HIGH";
  if (count >= 1) return "MEDIUM";
  return "LOW";
}

export function addMinutes(date: Date, minutes: number): string {
  return new Date(date.getTime() + minutes * 60_000).toISOString();
}
