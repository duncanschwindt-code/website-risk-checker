export const PROVIDER_STATUSES = [
  "MATCH",
  "NO_MATCH",
  "UNAVAILABLE",
  "RATE_LIMITED",
  "NOT_CONFIGURED",
  "TERMS_RESTRICTED",
  "STALE_RESULT",
  "INVALID_RESPONSE",
  "ERROR",
] as const;

export type ProviderStatus = (typeof PROVIDER_STATUSES)[number];
export type Confidence = "LOW" | "MEDIUM" | "HIGH";
export type EvidenceKind =
  | "CONFIRMED_PROVIDER_MATCH"
  | "LOCAL_HEURISTIC"
  | "INCOMPLETE_CHECK"
  | "PROVIDER_ERROR"
  | "PROVIDER_DISAGREEMENT"
  | "EXPIRED_RESULT"
  | "CACHED_RESULT"
  | "UNVERIFIED_REPORT";

export interface ProviderResult {
  providerId: string;
  providerName: string;
  status: ProviderStatus;
  match: boolean | null;
  threatCategory: string | null;
  confidence: Confidence;
  checkedAt: string;
  detectionDate: string | null;
  lastUpdatedAt: string | null;
  dataFreshness: string;
  resultType: "DIRECT" | "INFERRED";
  errorCode: string | null;
  explanation: string;
  attribution: string;
  mayBeStale: boolean;
  unavailable: boolean;
  urlSentToProvider: boolean;
  providerMayRetainOrShareUrl: boolean;
  cacheExpiresAt: string | null;
  metadata?: Record<string, string | number | boolean | string[] | null>;
}

export interface Indicator {
  id: string;
  ruleId: string | null;
  source: string;
  finding: string;
  observedAt: string;
  dataFreshness: string;
  confidence: Confidence;
  explanation: string;
  evidenceKind: EvidenceKind;
  direct: boolean;
  providerAvailable: boolean;
  mayBeStale: boolean;
  points: number;
}

export type RiskCategory =
  | "Lower observed risk"
  | "Some caution recommended"
  | "Elevated observed risk"
  | "Strong warning indicators";

export interface AnalysisResult {
  id: string;
  mode: "live" | "demo";
  normalizedDomain: string;
  originalInputRedacted: string;
  normalizedUrlRedacted: string;
  finalDomain: string | null;
  checkedAt: string;
  cacheExpiresAt: string | null;
  scoringVersion: string;
  score: number;
  category: RiskCategory;
  confidence: Confidence;
  confidenceExplanation: string;
  summary: string;
  providers: ProviderResult[];
  indicators: Indicator[];
  redirectCount: number | null;
  automated: true;
  humanReviewDate: null;
  correctionPending: false;
  limitations: string[];
  nextSteps: string[];
}

export interface ProviderPublicMetadata {
  id: string;
  name: string;
  enabled: boolean;
  configured: boolean;
  noncommercialOnly: boolean;
  attribution: string;
  submissionPrivacy: string;
  documentationUrl: string;
  lastReviewed: string;
}
