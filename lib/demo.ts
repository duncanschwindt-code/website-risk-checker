import { scoreFindings, scoringConfig } from "@/lib/analysis/scoring";
import type { LocalFinding } from "@/lib/analysis/heuristics";
import type { AnalysisResult, ProviderResult } from "@/lib/types";

export const DEMO_CASES = [
  {
    id: "lower",
    label: "Lower observed risk example",
    domain: "careful-example.test",
    description: "No provider match and no major local warning indicators.",
  },
  {
    id: "caution",
    label: "Some caution example",
    domain: "xn--careful-exmple-7za.test",
    description: "Several weak formatting signals, capped below elevated risk.",
  },
  {
    id: "elevated",
    label: "Elevated observed risk example",
    domain: "compromised-example.test",
    description:
      "An existing multi-engine concern without independent corroboration.",
  },
  {
    id: "warning",
    label: "Strong warning indicators example",
    domain: "known-threat-example.test",
    description: "Two simulated current provider matches.",
  },
] as const;

type DemoCaseId = (typeof DEMO_CASES)[number]["id"];

function provider(
  id: string,
  name: string,
  status: ProviderResult["status"],
  checkedAt: string,
  options: Partial<ProviderResult> = {},
): ProviderResult {
  return {
    providerId: id,
    providerName: name,
    status,
    match: status === "MATCH",
    threatCategory: status === "MATCH" ? "Simulated educational example" : null,
    confidence: status === "MATCH" ? "HIGH" : "MEDIUM",
    checkedAt,
    detectionDate: status === "MATCH" ? checkedAt : null,
    lastUpdatedAt: checkedAt,
    dataFreshness: "Simulated current data",
    resultType: "DIRECT",
    errorCode: null,
    explanation:
      status === "MATCH"
        ? "This is a simulated provider match for demonstration only. It is not a claim about a real website."
        : "This is a simulated no-match result and is not proof of safety.",
    attribution: `${name} simulated response`,
    mayBeStale: false,
    unavailable: false,
    urlSentToProvider: false,
    providerMayRetainOrShareUrl: false,
    cacheExpiresAt: null,
    ...options,
  };
}

export function createDemoResult(
  caseId: string,
  now = new Date(),
): AnalysisResult | null {
  const demo = DEMO_CASES.find((item) => item.id === caseId);
  if (!demo) return null;
  const checkedAt = now.toISOString();
  const providers: ProviderResult[] = [
    provider(
      "google-safe-browsing",
      "Google Safe Browsing",
      "NO_MATCH",
      checkedAt,
    ),
    provider("urlhaus", "URLhaus", "NO_MATCH", checkedAt),
    provider("phishtank", "PhishTank", "NO_MATCH", checkedAt),
    provider("otx", "OTX", "NO_MATCH", checkedAt),
    provider("virustotal", "VirusTotal", "NO_MATCH", checkedAt),
  ];
  const local: LocalFinding[] = [];

  if (demo.id === "caution") {
    local.push(
      {
        ruleId: "LOCAL_PUNYCODE",
        source: "Simulated local parser",
        finding: "The example domain contains a punycode label.",
        confidence: "HIGH",
        explanation: "Punycode is not automatically harmful.",
      },
      {
        ruleId: "LOCAL_MIXED_SCRIPT",
        source: "Simulated local parser",
        finding: "The decoded example combines writing systems.",
        confidence: "MEDIUM",
        explanation: "Multilingual domains can be legitimate.",
      },
      {
        ruleId: "LOCAL_HTTP_ONLY",
        source: "Simulated passive check",
        finding: "No HTTPS was observed in this example.",
        confidence: "MEDIUM",
        explanation: "HTTPS does not prove trustworthiness.",
      },
      {
        ruleId: "LOCAL_LONG_URL",
        source: "Simulated local parser",
        finding: "The example URL is unusually long.",
        confidence: "HIGH",
        explanation: "Long URLs are also common in legitimate applications.",
      },
    );
  } else if (demo.id === "elevated") {
    providers[4] = provider("virustotal", "VirusTotal", "MATCH", checkedAt, {
      confidence: "HIGH",
      metadata: {
        maliciousEngines: 3,
        suspiciousEngines: 1,
        harmlessEngines: 42,
        undetectedEngines: 19,
      },
    });
    local.push({
      ruleId: "LOCAL_REDIRECT_DOMAIN_CHANGE",
      source: "Simulated passive check",
      finding: "The example redirect ended on another domain.",
      confidence: "HIGH",
      explanation: "Legitimate services can also redirect between domains.",
    });
  } else if (demo.id === "warning") {
    providers[0] = provider(
      "google-safe-browsing",
      "Google Safe Browsing",
      "MATCH",
      checkedAt,
    );
    providers[1] = provider("urlhaus", "URLhaus", "MATCH", checkedAt);
  }

  const scored = scoreFindings(providers, local, now);
  return {
    id: `demo-${demo.id}`,
    mode: "demo",
    normalizedDomain: demo.domain,
    originalInputRedacted: `https://${demo.domain}/example`,
    normalizedUrlRedacted: `https://${demo.domain}/example`,
    finalDomain: demo.domain,
    checkedAt,
    cacheExpiresAt: null,
    scoringVersion: scoringConfig.methodologyVersion,
    ...scored,
    providers,
    redirectCount: 0,
    automated: true,
    humanReviewDate: null,
    correctionPending: false,
    limitations: [
      "Demonstration mode uses simulated data. No live threat-intelligence services were checked.",
      "Example domains use reserved names and do not represent real organizations.",
      "Automated results may be incomplete, outdated, or incorrect.",
    ],
    nextSteps: [
      "Check the domain spelling carefully.",
      "Verify the organization using contact information obtained independently.",
      "Tell a trusted adult when a request involves money, pressure, threats, or personal information.",
    ],
  };
}

export function isDemoCaseId(value: string): value is DemoCaseId {
  return DEMO_CASES.some((item) => item.id === value);
}
