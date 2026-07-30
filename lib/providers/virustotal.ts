import { z } from "zod";

import {
  baseProviderResult,
  confidenceFromCount,
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

const virusTotalSchema = z.object({
  data: z.object({
    attributes: z.object({
      last_analysis_date: z.number().int().nonnegative().optional(),
      last_analysis_stats: z.object({
        malicious: z.number().int().nonnegative().default(0),
        suspicious: z.number().int().nonnegative().default(0),
        harmless: z.number().int().nonnegative().default(0),
        undetected: z.number().int().nonnegative().default(0),
        timeout: z.number().int().nonnegative().optional().default(0),
      }),
    }),
  }),
});

function urlIdentifier(url: string): string {
  return Buffer.from(url, "utf8").toString("base64url");
}

export class VirusTotalProvider implements ThreatProvider {
  readonly id = "virustotal";
  readonly name = "VirusTotal";
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

    try {
      const response = await fetchJsonWithBackoff(
        `https://www.virustotal.com/api/v3/urls/${urlIdentifier(url)}`,
        {
          method: "GET",
          headers: { accept: "application/json", "x-apikey": this.apiKey! },
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
      if (response.status === 404) {
        return baseProviderResult(this.metadata, now, {
          status: "NO_MATCH",
          match: false,
          confidence: "LOW",
          dataFreshness: "No existing URL report was found",
          explanation:
            "VirusTotal had no existing report for this redacted URL. The URL was not submitted for analysis, and no conclusion about safety can be drawn.",
          urlSentToProvider: true,
          providerMayRetainOrShareUrl: true,
        });
      }
      if (response.status !== 200)
        return httpFailureResult(this.metadata, now, response.status);
      const parsed = virusTotalSchema.safeParse(response.data);
      if (!parsed.success) {
        return baseProviderResult(this.metadata, now, {
          status: "INVALID_RESPONSE",
          errorCode: "SCHEMA_VALIDATION_FAILED",
          explanation:
            "VirusTotal returned an unexpected response. No risk points were added or removed.",
          urlSentToProvider: true,
          providerMayRetainOrShareUrl: true,
        });
      }

      const stats = parsed.data.data.attributes.last_analysis_stats;
      const concerning = stats.malicious + stats.suspicious;
      const lastAnalysisSeconds =
        parsed.data.data.attributes.last_analysis_date;
      const lastUpdatedAt = lastAnalysisSeconds
        ? new Date(lastAnalysisSeconds * 1_000).toISOString()
        : null;
      const stale =
        lastAnalysisSeconds !== undefined &&
        now.getTime() - lastAnalysisSeconds * 1_000 > 90 * 24 * 60 * 60 * 1000;
      const matched = concerning > 0 && !stale;
      return baseProviderResult(this.metadata, now, {
        status: matched
          ? "MATCH"
          : stale && concerning > 0
            ? "STALE_RESULT"
            : "NO_MATCH",
        match: matched,
        threatCategory: matched
          ? "Aggregated malicious or suspicious engine results"
          : null,
        confidence: confidenceFromCount(concerning),
        lastUpdatedAt,
        dataFreshness: stale
          ? "The existing analysis is more than 90 days old"
          : lastUpdatedAt
            ? `Existing analysis dated ${lastUpdatedAt}`
            : "Analysis timestamp not reported",
        explanation: matched
          ? `${concerning} engine result${concerning === 1 ? "" : "s"} reported malicious or suspicious classifications in the existing VirusTotal report. This does not prove intent or wrongdoing.`
          : stale && concerning > 0
            ? "The existing VirusTotal report contained older concerning classifications. It is shown as stale and does not affect the score."
            : "No malicious or suspicious classifications were present in the available existing report. This is not proof of safety.",
        mayBeStale: stale,
        urlSentToProvider: true,
        providerMayRetainOrShareUrl: true,
        metadata: {
          maliciousEngines: stats.malicious,
          suspiciousEngines: stats.suspicious,
          harmlessEngines: stats.harmless,
          undetectedEngines: stats.undetected,
        },
      });
    } catch (error) {
      return responsePolicyFailureResult(this.metadata, now, error);
    }
  }
}
