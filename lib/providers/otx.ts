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

const pulseSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  created: z.string().optional(),
  modified: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
});

const otxSchema = z.object({
  pulse_info: z
    .object({
      count: z.number().int().nonnegative().default(0),
      pulses: z.array(pulseSchema).default([]),
    })
    .optional(),
});

export class OtxProvider implements ThreatProvider {
  readonly id = "otx";
  readonly name = "LevelBlue Labs Open Threat Exchange (OTX)";
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

    const endpoint = `https://otx.alienvault.com/api/v1/indicators/url/${encodeURIComponent(url)}/general`;
    try {
      const response = await fetchJsonWithBackoff(
        endpoint,
        {
          method: "GET",
          headers: {
            accept: "application/json",
            "x-otx-api-key": this.apiKey!,
          },
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
      const parsed = otxSchema.safeParse(response.data);
      if (!parsed.success) {
        return baseProviderResult(this.metadata, now, {
          status: "INVALID_RESPONSE",
          errorCode: "SCHEMA_VALIDATION_FAILED",
          explanation:
            "OTX returned an unexpected response. No risk points were added or removed.",
          urlSentToProvider: true,
          providerMayRetainOrShareUrl: true,
        });
      }

      const pulses = parsed.data.pulse_info?.pulses ?? [];
      const count = parsed.data.pulse_info?.count ?? pulses.length;
      const latest = pulses
        .map((pulse) => pulse.modified ?? pulse.created)
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1);
      const latestMs = latest ? Date.parse(latest) : Number.NaN;
      const recent =
        Number.isFinite(latestMs) &&
        now.getTime() - latestMs <= 90 * 24 * 60 * 60 * 1000;
      const matched = count > 0 && recent;
      const tags = [...new Set(pulses.flatMap((pulse) => pulse.tags))].slice(
        0,
        20,
      );
      return baseProviderResult(this.metadata, now, {
        status: matched ? "MATCH" : "NO_MATCH",
        match: matched,
        threatCategory: matched ? "Community threat-intelligence pulse" : null,
        confidence: confidenceFromCount(Math.min(count, 3)),
        detectionDate: latest ?? null,
        lastUpdatedAt: latest ?? null,
        dataFreshness:
          count === 0
            ? "No relevant public pulses were returned"
            : recent
              ? "At least one pulse was updated within 90 days"
              : "Only older community pulse context was returned",
        explanation: matched
          ? `OTX returned ${count} relevant community pulse${count === 1 ? "" : "s"}. Community entries are context, not definitive findings of wrongdoing.`
          : count > 0
            ? "OTX returned only older community context, which does not affect the score."
            : "OTX returned no relevant community pulses. This is not proof of safety.",
        mayBeStale: count > 0 && !recent,
        urlSentToProvider: true,
        providerMayRetainOrShareUrl: true,
        metadata: { pulseCount: count, latestPulseDate: latest ?? null, tags },
      });
    } catch (error) {
      return responsePolicyFailureResult(this.metadata, now, error);
    }
  }
}
