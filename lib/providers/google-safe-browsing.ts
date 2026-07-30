import { z } from "zod";

import type {
  ProviderCheckContext,
  ProviderComplianceMetadata,
  ThreatProvider,
} from "@/lib/providers/provider";
import {
  baseProviderResult,
  httpFailureResult,
  preflightProvider,
  responsePolicyFailureResult,
} from "@/lib/providers/helpers";
import { fetchJsonWithBackoff } from "@/lib/security/request";
import type { ProviderResult } from "@/lib/types";

const responseSchema = z.object({
  threats: z
    .array(
      z.object({
        url: z.string(),
        threatTypes: z.array(z.string()),
      }),
    )
    .default([]),
  cacheDuration: z.string().regex(/^\d+(?:\.\d+)?s$/),
});

function cacheExpiration(now: Date, duration: string): string {
  const seconds = Math.max(
    0,
    Math.min(Number.parseFloat(duration), 24 * 60 * 60),
  );
  return new Date(now.getTime() + seconds * 1_000).toISOString();
}

export class GoogleSafeBrowsingProvider implements ThreatProvider {
  readonly id = "google-safe-browsing";
  readonly name = "Google Safe Browsing";
  get networkConfigured(): boolean {
    return this.enabled && Boolean(this.apiKey);
  }

  constructor(
    private readonly metadata: ProviderComplianceMetadata,
    private readonly enabled: boolean,
    private readonly apiKey?: string,
  ) {}

  async check(
    url: string,
    context: ProviderCheckContext,
  ): Promise<ProviderResult> {
    const now = context.now();
    const preflight = preflightProvider(
      this.metadata,
      {
        enabled: this.enabled,
        key: this.apiKey,
        projectUseMode: context.config.PROJECT_USE_MODE,
      },
      now,
    );
    if (preflight) return preflight;

    const endpoint = new URL(
      "https://safebrowsing.googleapis.com/v5/urls:search",
    );
    endpoint.searchParams.append("urls", url);
    endpoint.searchParams.set("key", this.apiKey!);

    try {
      const response = await fetchJsonWithBackoff(
        endpoint.toString(),
        { method: "GET", headers: { accept: "application/json" } },
        {
          timeoutMs: context.config.REQUEST_TOTAL_TIMEOUT_MS,
          maxResponseBytes: context.config.MAX_PROVIDER_RESPONSE_BYTES,
        },
        context.fetchImpl,
        {
          maxRetries: context.config.PROVIDER_MAX_RETRIES,
          baseDelayMs: context.config.PROVIDER_RETRY_BASE_MS,
        },
      );
      if (response.status !== 200)
        return httpFailureResult(this.metadata, now, response.status);
      const parsed = responseSchema.safeParse(response.data);
      if (!parsed.success) {
        return baseProviderResult(this.metadata, now, {
          status: "INVALID_RESPONSE",
          errorCode: "SCHEMA_VALIDATION_FAILED",
          explanation:
            "Google Safe Browsing returned an unexpected response. No risk points were added or removed.",
          urlSentToProvider: true,
          providerMayRetainOrShareUrl: true,
        });
      }

      const matched = parsed.data.threats.length > 0;
      const categories = [
        ...new Set(parsed.data.threats.flatMap((threat) => threat.threatTypes)),
      ];
      return baseProviderResult(this.metadata, now, {
        status: matched ? "MATCH" : "NO_MATCH",
        match: matched,
        threatCategory: matched
          ? categories.join(", ") || "Known threat-database match"
          : null,
        confidence: matched ? "HIGH" : "MEDIUM",
        dataFreshness: `Fresh until ${cacheExpiration(now, parsed.data.cacheDuration)}`,
        explanation: matched
          ? "Google Safe Browsing reported a current potential-threat match. This finding does not prove fraudulent or malicious intent."
          : "Google Safe Browsing returned no match for the redacted URL during this lookup. This is not proof of safety.",
        attribution: "Advisory provided by Google",
        urlSentToProvider: true,
        providerMayRetainOrShareUrl: true,
        cacheExpiresAt: cacheExpiration(now, parsed.data.cacheDuration),
        metadata: { threatTypes: categories },
      });
    } catch (error) {
      return responsePolicyFailureResult(this.metadata, now, error);
    }
  }
}
