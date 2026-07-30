import { z } from "zod";

import scoringJson from "@/config/scoring-rules.json";
import type { LocalFinding } from "@/lib/analysis/heuristics";
import type {
  AnalysisResult,
  Confidence,
  Indicator,
  ProviderResult,
  RiskCategory,
} from "@/lib/types";

const scoringSchema = z.object({
  methodologyVersion: z.string(),
  weakSignalCap: z.number().int().min(0).max(100),
  rules: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      weight: z.number().int().min(0).max(100),
      maximumContribution: z.number().int().min(0).max(100),
      evidenceRequirements: z.string(),
      confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
      explanation: z.string(),
      falsePositiveConsiderations: z.string(),
      expirationPeriod: z.string(),
      ruleVersion: z.string(),
      signalClass: z.enum(["WEAK", "MODERATE", "STRONG"]),
    }),
  ),
});

export const scoringConfig = scoringSchema.parse(scoringJson);
const ruleMap = new Map(scoringConfig.rules.map((rule) => [rule.id, rule]));

export function categoryForScore(score: number): RiskCategory {
  if (score <= 24) return "Lower observed risk";
  if (score <= 49) return "Some caution recommended";
  if (score <= 74) return "Elevated observed risk";
  return "Strong warning indicators";
}

export function summaryForScore(score: number): string {
  return score <= 24
    ? "No major warning indicators were found through the available checks. This does not guarantee that the website is trustworthy."
    : score >= 50
      ? "Multiple warning indicators were detected. Avoid entering personal information or sending money until you independently verify the website."
      : "Some warning indicators were observed. Pause and independently verify the website before sharing information or money.";
}

function providerIndicator(
  provider: ProviderResult,
  points: number,
  ruleId: string | null,
): Indicator {
  const evidenceKind =
    provider.status === "MATCH"
      ? "CONFIRMED_PROVIDER_MATCH"
      : provider.status === "STALE_RESULT"
        ? "EXPIRED_RESULT"
        : provider.status === "NO_MATCH"
          ? "INCOMPLETE_CHECK"
          : provider.status === "INVALID_RESPONSE" ||
              provider.status === "ERROR"
            ? "PROVIDER_ERROR"
            : "INCOMPLETE_CHECK";
  return {
    id: `provider-${provider.providerId}`,
    ruleId,
    source: provider.providerName,
    finding:
      provider.status === "MATCH"
        ? `Known threat-database or community-intelligence match: ${provider.threatCategory ?? "category not reported"}`
        : provider.status === "NO_MATCH"
          ? "No matching threat indicator was returned by this provider."
          : `Provider check status: ${provider.status.replaceAll("_", " ").toLowerCase()}.`,
    observedAt: provider.checkedAt,
    dataFreshness: provider.dataFreshness,
    confidence: provider.confidence,
    explanation: provider.explanation,
    evidenceKind,
    direct: provider.resultType === "DIRECT",
    providerAvailable: !provider.unavailable,
    mayBeStale: provider.mayBeStale,
    points,
  };
}

function localIndicators(
  findings: LocalFinding[],
  now: Date,
): { indicators: Indicator[]; points: number } {
  let uncappedPoints = 0;
  const prepared = findings.map((finding, index) => {
    const rule = ruleMap.get(finding.ruleId);
    const points = Math.min(rule?.weight ?? 0, rule?.maximumContribution ?? 0);
    uncappedPoints += points;
    return {
      id: `local-${index + 1}-${finding.ruleId.toLowerCase()}`,
      ruleId: finding.ruleId,
      source: finding.source,
      finding: finding.finding,
      observedAt: now.toISOString(),
      dataFreshness: "Observed during this check",
      confidence: finding.confidence,
      explanation: finding.explanation,
      evidenceKind: "LOCAL_HEURISTIC" as const,
      direct: false,
      providerAvailable: true,
      mayBeStale: false,
      points,
    };
  });

  const cappedPoints = Math.min(uncappedPoints, scoringConfig.weakSignalCap);
  let remaining = cappedPoints;
  const indicators = prepared.map((indicator) => {
    const applied = Math.min(indicator.points, remaining);
    remaining -= applied;
    return { ...indicator, points: applied };
  });
  return { indicators, points: cappedPoints };
}

function providerPoints(providers: ProviderResult[]): {
  indicators: Indicator[];
  points: number;
  disagreement: boolean;
} {
  const matched = providers.filter(
    (provider) => provider.status === "MATCH" && !provider.mayBeStale,
  );
  const directHighIds = new Set([
    "google-safe-browsing",
    "urlhaus",
    "phishtank",
  ]);
  let strongRuleUsed = false;
  let points = 0;

  const indicators = providers.map((provider) => {
    let contribution = 0;
    let ruleId: string | null = null;
    if (
      provider.status === "MATCH" &&
      directHighIds.has(provider.providerId) &&
      !strongRuleUsed
    ) {
      strongRuleUsed = true;
      ruleId = "TI_CONFIRMED_RECENT_HIGH";
      contribution = ruleMap.get(ruleId)?.weight ?? 60;
    } else if (
      provider.status === "MATCH" &&
      provider.providerId === "virustotal"
    ) {
      const metadata = provider.metadata ?? {};
      const concerning =
        Number(metadata.maliciousEngines ?? 0) +
        Number(metadata.suspiciousEngines ?? 0);
      if (concerning >= 3) {
        ruleId = "TI_VIRUSTOTAL_CONSENSUS";
        contribution = ruleMap.get(ruleId)?.weight ?? 45;
      }
    } else if (provider.status === "MATCH" && provider.providerId === "otx") {
      ruleId = "TI_OTX_RECENT_PULSES";
      contribution = ruleMap.get(ruleId)?.weight ?? 22;
    }
    points += contribution;
    return providerIndicator(provider, contribution, ruleId);
  });

  if (new Set(matched.map((provider) => provider.providerId)).size >= 2) {
    const corroboration = ruleMap.get("TI_INDEPENDENT_CORROBORATION");
    const contribution = corroboration?.weight ?? 20;
    points += contribution;
    indicators.push({
      id: "provider-corroboration",
      ruleId: "TI_INDEPENDENT_CORROBORATION",
      source: "Scoring engine",
      finding:
        "Two or more independently operated providers returned current matches.",
      observedAt: matched[0]?.checkedAt ?? new Date().toISOString(),
      dataFreshness: "Based on the current provider results shown here",
      confidence: "HIGH",
      explanation:
        "Independent agreement raises confidence in the observable signal, but can still reflect overlapping data and does not prove intent.",
      evidenceKind: "CONFIRMED_PROVIDER_MATCH",
      direct: false,
      providerAvailable: true,
      mayBeStale: false,
      points: contribution,
    });
  }

  const disagreement =
    providers.some((provider) => provider.status === "MATCH") &&
    providers.some((provider) => provider.status === "NO_MATCH");
  if (disagreement) {
    indicators.push({
      id: "provider-disagreement",
      ruleId: null,
      source: "Provider comparison",
      finding: "Available providers did not all return the same match status.",
      observedAt: matched[0]?.checkedAt ?? new Date().toISOString(),
      dataFreshness: "Based on the current provider results shown here",
      confidence: "MEDIUM",
      explanation:
        "Providers cover different threats, URLs, and time periods. A no-match result does not cancel a current match from another source.",
      evidenceKind: "PROVIDER_DISAGREEMENT",
      direct: false,
      providerAvailable: true,
      mayBeStale: false,
      points: 0,
    });
  }

  return { indicators, points, disagreement };
}

export function confidenceForResults(
  providers: ProviderResult[],
  score: number,
): { confidence: Confidence; explanation: string } {
  const available = providers.filter(
    (provider) => !provider.unavailable,
  ).length;
  const currentMatches = providers.filter(
    (provider) => provider.status === "MATCH",
  ).length;
  if (currentMatches >= 2 && available >= 2) {
    return {
      confidence: "HIGH",
      explanation:
        "Two or more currently available providers reported corroborating signals.",
    };
  }
  if (available >= 3 || (currentMatches >= 1 && available >= 2)) {
    return {
      confidence: "MEDIUM",
      explanation:
        "Several data sources were available, but automated coverage remains incomplete.",
    };
  }
  return {
    confidence: "LOW",
    explanation:
      score === 0
        ? "Confidence is limited because one or more data sources could not be checked."
        : "Confidence is limited because few independent data sources were available.",
  };
}

export function scoreFindings(
  providers: ProviderResult[],
  localFindings: LocalFinding[],
  now: Date,
  extraIndicators: Indicator[] = [],
): Pick<
  AnalysisResult,
  | "score"
  | "category"
  | "confidence"
  | "confidenceExplanation"
  | "summary"
  | "indicators"
> {
  const providerScore = providerPoints(providers);
  const localScore = localIndicators(localFindings, now);
  const score = Math.max(
    0,
    Math.min(100, providerScore.points + localScore.points),
  );
  const confidence = confidenceForResults(providers, score);
  return {
    score,
    category: categoryForScore(score),
    confidence: confidence.confidence,
    confidenceExplanation: confidence.explanation,
    summary: summaryForScore(score),
    indicators: [
      ...providerScore.indicators,
      ...localScore.indicators,
      ...extraIndicators,
    ],
  };
}
