import { randomUUID } from "node:crypto";

import {
  collectLocalFindings,
  incompletePassiveIndicator,
} from "@/lib/analysis/heuristics";
import { scoreFindings, scoringConfig } from "@/lib/analysis/scoring";
import { getServerConfig, type ServerConfig } from "@/lib/config";
import {
  checkProviders,
  createProviders,
  validateStartupProviderCompliance,
} from "@/lib/providers";
import type {
  ProviderCheckContext,
  ThreatProvider,
} from "@/lib/providers/provider";
import {
  runPassiveChecks,
  type PassiveCheckResult,
} from "@/lib/security/passive-checks";
import {
  normalizeSubmittedUrl,
  resolvePublicAddresses,
  systemDnsResolver,
  type DnsResolver,
} from "@/lib/security/url-validation";
import type { AnalysisResult, ProviderResult } from "@/lib/types";

export interface AnalysisDependencies {
  config?: ServerConfig;
  resolver?: DnsResolver;
  providers?: ThreatProvider[];
  now?: () => Date;
  id?: () => string;
  fetchImpl?: typeof fetch;
  passiveCheck?: (
    normalized: ReturnType<typeof normalizeSubmittedUrl>,
  ) => Promise<PassiveCheckResult>;
  providerCheck?: (
    url: string,
    providers: ThreatProvider[],
    context: ProviderCheckContext,
  ) => Promise<ProviderResult[]>;
}

const limitations = [
  "Automated results may be incomplete, outdated, or incorrect.",
  "A low score does not guarantee that a website is safe or trustworthy.",
  "A high score does not prove fraud, illegality, malicious intent, or who controlled a website.",
  "Threat databases cover different categories and may contain false positives or false negatives.",
  "The passive check does not load page content, execute JavaScript, submit forms, download files, or scan for vulnerabilities.",
];

const nextSteps = [
  "Do not enter passwords or payment information until the site is independently verified.",
  "Check the domain spelling carefully and find the organization's contact details independently.",
  "Avoid difficult-to-reverse payments to an unverified recipient; use a trusted payment method with dispute protections.",
  "Do not download unexpected files, do not reuse passwords, and enable multifactor authentication.",
  "Tell a trusted adult when a suspicious request involves money, threats, pressure, or personal information.",
];

export async function analyzeUrl(
  input: string,
  dependencies: AnalysisDependencies = {},
): Promise<AnalysisResult> {
  const config = dependencies.config ?? getServerConfig();
  if (config.APP_MODE !== "live") {
    throw new Error("Live analysis is disabled while APP_MODE=demo.");
  }
  validateStartupProviderCompliance(config);

  const now = dependencies.now ?? (() => new Date());
  const checkedAt = now();
  const resolver = dependencies.resolver ?? systemDnsResolver;
  const normalized = normalizeSubmittedUrl(input);

  // Validate the user-controlled destination before any destination connection.
  await resolvePublicAddresses(normalized.hostnameAscii, resolver);

  const providers = dependencies.providers ?? createProviders(config);
  const providerContext: ProviderCheckContext = {
    now,
    fetchImpl: dependencies.fetchImpl ?? fetch,
    config,
  };
  const passivePromise = dependencies.passiveCheck
    ? dependencies.passiveCheck(normalized)
    : runPassiveChecks(normalized, {
        resolver,
        connectTimeoutMs: config.REQUEST_CONNECT_TIMEOUT_MS,
        totalTimeoutMs: config.REQUEST_TOTAL_TIMEOUT_MS,
        maxRedirects: config.MAX_REDIRECTS,
      });
  const providerPromise = (dependencies.providerCheck ?? checkProviders)(
    normalized.lookupUrl,
    providers,
    providerContext,
  );
  const [passive, providerResults] = await Promise.all([
    passivePromise,
    providerPromise,
  ]);

  const localFindings = collectLocalFindings(normalized, passive);
  const passiveIncomplete = incompletePassiveIndicator(checkedAt, passive);
  const scored = scoreFindings(
    providerResults,
    localFindings,
    checkedAt,
    passiveIncomplete ? [passiveIncomplete] : [],
  );
  const cacheExpirations = providerResults
    .map((provider) => provider.cacheExpiresAt)
    .filter((value): value is string => Boolean(value))
    .sort();

  return {
    id: dependencies.id?.() ?? randomUUID(),
    mode: "live",
    normalizedDomain: normalized.hostnameAscii,
    originalInputRedacted: normalized.redactedUrl,
    normalizedUrlRedacted: normalized.redactedUrl,
    finalDomain: passive.finalDomain,
    checkedAt: checkedAt.toISOString(),
    cacheExpiresAt: cacheExpirations[0] ?? null,
    scoringVersion: scoringConfig.methodologyVersion,
    ...scored,
    providers: providerResults,
    redirectCount: passive.redirectCount,
    automated: true,
    humanReviewDate: null,
    correctionPending: false,
    limitations,
    nextSteps,
  };
}
