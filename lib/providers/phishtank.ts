import { z } from "zod";

import {
  addMinutes,
  baseProviderResult,
  httpFailureResult,
  preflightProvider,
  responsePolicyFailureResult,
} from "@/lib/providers/helpers";
import type {
  ProviderCheckContext,
  ProviderComplianceMetadata,
  ThreatProvider,
} from "@/lib/providers/provider";
import { fetchJsonWithBackoff } from "@/lib/security/request";
import type { ProviderResult } from "@/lib/types";

const boolLike = z
  .union([z.boolean(), z.enum(["y", "n", "true", "false"])])
  .transform((value) => value === true || value === "y" || value === "true");

const phishTankSchema = z.object({
  results: z.object({
    in_database: boolLike,
    verified: boolLike.optional().default(false),
    valid: boolLike.optional().default(false),
    verified_at: z.string().nullable().optional(),
    submitted_at: z.string().nullable().optional(),
    phish_id: z.union([z.string(), z.number()]).nullable().optional(),
  }),
});

export class PhishTankProvider implements ThreatProvider {
  readonly id = "phishtank";
  readonly name = "PhishTank";
  get networkConfigured(): boolean {
    return this.enabled && Boolean(this.appKey);
  }

  constructor(
    private readonly metadata: ProviderComplianceMetadata,
    private readonly enabled: boolean,
    private readonly appKey?: string,
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
        key: this.appKey,
        projectUseMode: context.config.PROJECT_USE_MODE,
      },
      now,
    );
    if (preflight) return preflight;

    try {
      const body = new URLSearchParams({
        url,
        app_key: this.appKey!,
        format: "json",
      });
      const response = await fetchJsonWithBackoff(
        "https://checkurl.phishtank.com/checkurl/",
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/x-www-form-urlencoded",
            "user-agent": "TeensAgainstScams-WebsiteRiskChecker/1.0",
          },
          body,
        },
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
      const parsed = phishTankSchema.safeParse(response.data);
      if (!parsed.success) {
        return baseProviderResult(this.metadata, now, {
          status: "INVALID_RESPONSE",
          errorCode: "SCHEMA_VALIDATION_FAILED",
          explanation:
            "PhishTank returned an unexpected response. No risk points were added or removed.",
          urlSentToProvider: true,
          providerMayRetainOrShareUrl: true,
        });
      }

      const result = parsed.data.results;
      const confirmedMatch =
        result.in_database && result.verified && result.valid;
      const unverified = result.in_database && !confirmedMatch;
      return baseProviderResult(this.metadata, now, {
        status: confirmedMatch ? "MATCH" : "NO_MATCH",
        match: confirmedMatch,
        threatCategory: confirmedMatch ? "Verified phishing entry" : null,
        confidence: confirmedMatch ? "HIGH" : unverified ? "LOW" : "MEDIUM",
        detectionDate: result.submitted_at ?? null,
        lastUpdatedAt: result.verified_at ?? null,
        dataFreshness: confirmedMatch
          ? "PhishTank reports the entry as verified and currently valid"
          : unverified
            ? "An entry exists but is not both verified and currently valid"
            : "No matching entry was returned",
        explanation: confirmedMatch
          ? "PhishTank returned a verified, currently valid phishing entry. This finding does not prove who operated the page or their intent."
          : unverified
            ? "PhishTank returned an unverified or no-longer-valid community entry. It does not affect the score."
            : "PhishTank returned no matching entry. This is not proof of safety.",
        resultType: unverified ? "INFERRED" : "DIRECT",
        mayBeStale: unverified,
        urlSentToProvider: true,
        providerMayRetainOrShareUrl: true,
        cacheExpiresAt: addMinutes(now, 15),
        metadata: {
          inDatabase: result.in_database,
          verified: result.verified,
          valid: result.valid,
        },
      });
    } catch (error) {
      return responsePolicyFailureResult(this.metadata, now, error);
    }
  }
}
