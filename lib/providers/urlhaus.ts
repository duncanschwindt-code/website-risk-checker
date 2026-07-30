import { z } from "zod";

import {
  baseProviderResult,
  addMinutes,
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

const urlhausSchema = z.object({
  query_status: z.string(),
  url_status: z.string().optional(),
  threat: z.string().nullable().optional(),
  date_added: z.string().nullable().optional(),
  last_online: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
});

export class UrlhausProvider implements ThreatProvider {
  readonly id = "urlhaus";
  readonly name = "URLhaus";
  get networkConfigured(): boolean {
    return this.enabled && Boolean(this.authKey);
  }

  constructor(
    private readonly metadata: ProviderComplianceMetadata,
    private readonly enabled: boolean,
    private readonly authKey?: string,
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
        key: this.authKey,
        projectUseMode: context.config.PROJECT_USE_MODE,
      },
      now,
    );
    if (preflight) return preflight;

    try {
      const body = new URLSearchParams({ url });
      const response = await fetchJsonWithBackoff(
        "https://urlhaus-api.abuse.ch/v1/url/",
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "auth-key": this.authKey!,
            "content-type": "application/x-www-form-urlencoded",
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
      const parsed = urlhausSchema.safeParse(response.data);
      if (!parsed.success) {
        return baseProviderResult(this.metadata, now, {
          status: "INVALID_RESPONSE",
          errorCode: "SCHEMA_VALIDATION_FAILED",
          explanation:
            "URLhaus returned an unexpected response. No risk points were added or removed.",
          urlSentToProvider: true,
          providerMayRetainOrShareUrl: true,
        });
      }

      const matched = parsed.data.query_status === "ok";
      return baseProviderResult(this.metadata, now, {
        status: matched ? "MATCH" : "NO_MATCH",
        match: matched,
        threatCategory: matched
          ? parsed.data.threat || "Malware distribution"
          : null,
        confidence: matched ? "HIGH" : "MEDIUM",
        detectionDate: matched ? (parsed.data.date_added ?? null) : null,
        lastUpdatedAt: matched ? (parsed.data.last_online ?? null) : null,
        dataFreshness: matched
          ? `URL status: ${parsed.data.url_status ?? "not reported"}`
          : "No matching URL record was returned",
        explanation: matched
          ? "URLhaus has associated this URL with malware distribution. This may indicate a malicious website or a legitimate website that was compromised."
          : "URLhaus returned no malware-distribution URL match. URLhaus is not a database of every type of scam, and this is not proof of safety.",
        urlSentToProvider: true,
        providerMayRetainOrShareUrl: true,
        cacheExpiresAt: addMinutes(now, 5),
        metadata: {
          urlStatus: parsed.data.url_status ?? null,
          tags: parsed.data.tags ?? [],
        },
      });
    } catch (error) {
      return responsePolicyFailureResult(this.metadata, now, error);
    }
  }
}
