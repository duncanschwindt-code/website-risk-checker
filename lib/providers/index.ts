import {
  getServerConfig,
  providerCompliance,
  providerEnvMap,
  type ServerConfig,
} from "@/lib/config";
import { GoogleSafeBrowsingProvider } from "@/lib/providers/google-safe-browsing";
import { OtxProvider } from "@/lib/providers/otx";
import { baseProviderResult } from "@/lib/providers/helpers";
import { PhishTankProvider } from "@/lib/providers/phishtank";
import type {
  ProviderCheckContext,
  ProviderComplianceMetadata,
  ThreatProvider,
} from "@/lib/providers/provider";
import { UrlhausProvider } from "@/lib/providers/urlhaus";
import { VirusTotalProvider } from "@/lib/providers/virustotal";
import { ProviderQueue, ProviderQuotaError } from "@/lib/security/rate-limit";
import { hashForEphemeralKey, structuredLog } from "@/lib/security/privacy";
import type { ProviderPublicMetadata, ProviderResult } from "@/lib/types";

type ProviderId = keyof typeof providerEnvMap;

const providerQueues: Record<ProviderId, ProviderQueue> = {
  "google-safe-browsing": new ProviderQueue(100),
  urlhaus: new ProviderQueue(1_000),
  phishtank: new ProviderQueue(1_000),
  otx: new ProviderQueue(1_000),
  virustotal: new ProviderQueue(15_000, undefined, undefined, {
    limit: 500,
    windowMs: 24 * 60 * 60 * 1_000,
  }),
};

const resultCache = new Map<string, ProviderResult>();

function metadata(id: ProviderId): ProviderComplianceMetadata {
  const provider = providerCompliance.providers.find((item) => item.id === id);
  if (!provider) throw new Error(`Missing compliance metadata for ${id}`);
  return provider;
}

function envEnabled(config: ServerConfig, id: ProviderId): boolean {
  return Boolean(config[providerEnvMap[id].enabled]);
}

function envKey(config: ServerConfig, id: ProviderId): string | undefined {
  return config[providerEnvMap[id].key] || undefined;
}

export function validateStartupProviderCompliance(
  config = getServerConfig(),
): string[] {
  const warnings: string[] = [];
  for (const provider of providerCompliance.providers) {
    if (!envEnabled(config, provider.id as ProviderId)) continue;
    if (
      provider.noncommercialOnly &&
      config.PROJECT_USE_MODE === "commercial"
    ) {
      throw new Error(
        `${provider.name} cannot start: its configured free access is restricted to noncommercial use.`,
      );
    }
    const overdue =
      Date.now() >
      new Date(provider.lastReviewed).getTime() +
        config.PROVIDER_REVIEW_MAX_AGE_DAYS * 24 * 60 * 60 * 1_000;
    if (overdue) {
      const warning = `${provider.name} terms review is overdue. Confirm the current official terms before continued use.`;
      warnings.push(warning);
      structuredLog("warn", "provider_terms_review_overdue", {
        providerId: provider.id,
        lastReviewed: provider.lastReviewed,
      });
      if (config.STRICT_PROVIDER_TERMS) {
        throw new Error(
          `${provider.name} cannot start in strict mode until its terms review is updated.`,
        );
      }
    }
    if (provider.noncommercialOnly) {
      warnings.push(
        `${provider.name}: This provider's free API access may be limited to noncommercial use. Confirm that your deployment complies with the provider's current official terms.`,
      );
    }
  }
  return warnings;
}

export function createProviders(config = getServerConfig()): ThreatProvider[] {
  return [
    new GoogleSafeBrowsingProvider(
      metadata("google-safe-browsing"),
      envEnabled(config, "google-safe-browsing"),
      envKey(config, "google-safe-browsing"),
    ),
    new UrlhausProvider(
      metadata("urlhaus"),
      envEnabled(config, "urlhaus"),
      envKey(config, "urlhaus"),
    ),
    new PhishTankProvider(
      metadata("phishtank"),
      envEnabled(config, "phishtank"),
      envKey(config, "phishtank"),
    ),
    new OtxProvider(
      metadata("otx"),
      envEnabled(config, "otx"),
      envKey(config, "otx"),
    ),
    new VirusTotalProvider(
      metadata("virustotal"),
      envEnabled(config, "virustotal"),
      envKey(config, "virustotal"),
    ),
  ];
}

export async function checkProviders(
  url: string,
  providers: ThreatProvider[],
  context: ProviderCheckContext,
): Promise<ProviderResult[]> {
  return Promise.all(
    providers.map(async (provider) => {
      const compliance = metadata(provider.id as ProviderId);
      const cacheKey = `${provider.id}:${hashForEphemeralKey(url)}`;
      const cached = resultCache.get(cacheKey);
      if (
        compliance.cachingAllowed &&
        cached?.cacheExpiresAt &&
        Date.parse(cached.cacheExpiresAt) > context.now().getTime()
      ) {
        return {
          ...cached,
          dataFreshness: `${cached.dataFreshness}; cached result reused`,
          metadata: { ...cached.metadata, cached: true },
        };
      }

      const providerQueue = providerQueues[provider.id as ProviderId];
      const result = provider.networkConfigured
        ? await providerQueue
            .schedule(() => provider.check(url, context))
            .catch((error: unknown) => {
              if (error instanceof ProviderQuotaError) {
                return baseProviderResult(compliance, context.now(), {
                  status: "RATE_LIMITED",
                  errorCode: "INTERNAL_PROVIDER_QUOTA_REACHED",
                  explanation:
                    "This provider was not contacted because its locally tracked free usage limit was reached. No risk points were added or removed.",
                  metadata: {
                    retryAfterSeconds: error.retryAfterSeconds,
                  },
                });
              }
              throw error;
            })
        : await provider.check(url, context);
      if (provider.networkConfigured) {
        structuredLog("info", "provider_request_completed", {
          providerId: provider.id,
          status: result.status,
          ...providerQueue.getUsage(),
        });
      }
      if (
        compliance.cachingAllowed &&
        result.cacheExpiresAt &&
        Date.parse(result.cacheExpiresAt) > context.now().getTime()
      ) {
        resultCache.set(cacheKey, result);
      }
      return result;
    }),
  );
}

export function getProviderPublicMetadata(
  config = getServerConfig(),
): ProviderPublicMetadata[] {
  return providerCompliance.providers.map((provider) => ({
    id: provider.id,
    name: provider.name,
    enabled: envEnabled(config, provider.id as ProviderId),
    configured: Boolean(envKey(config, provider.id as ProviderId)),
    noncommercialOnly: provider.noncommercialOnly,
    attribution: provider.attribution,
    submissionPrivacy: provider.submissionPrivacy,
    documentationUrl: provider.documentationUrl,
    lastReviewed: provider.lastReviewed,
  }));
}

export function clearProviderCacheForTests(): void {
  resultCache.clear();
}
