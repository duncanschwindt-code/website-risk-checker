import { isIP } from "node:net";

import type { NormalizedUrl } from "@/lib/security/url-validation";
import type { PassiveCheckResult } from "@/lib/security/passive-checks";
import type { Confidence, Indicator } from "@/lib/types";

const SHORTENER_HOSTS = new Set([
  "bit.ly",
  "buff.ly",
  "cutt.ly",
  "goo.gl",
  "is.gd",
  "ow.ly",
  "rebrand.ly",
  "shorturl.at",
  "tiny.cc",
  "tinyurl.com",
  "t.co",
]);

const WRITING_SYSTEMS = [
  { name: "Latin", pattern: /\p{Script=Latin}/u },
  { name: "Cyrillic", pattern: /\p{Script=Cyrillic}/u },
  { name: "Greek", pattern: /\p{Script=Greek}/u },
  { name: "Han", pattern: /\p{Script=Han}/u },
  { name: "Arabic", pattern: /\p{Script=Arabic}/u },
  { name: "Hebrew", pattern: /\p{Script=Hebrew}/u },
  { name: "Devanagari", pattern: /\p{Script=Devanagari}/u },
  { name: "Hiragana", pattern: /\p{Script=Hiragana}/u },
  { name: "Katakana", pattern: /\p{Script=Katakana}/u },
];

export interface LocalFinding {
  ruleId: string;
  source: string;
  finding: string;
  confidence: Confidence;
  explanation: string;
}

function writingSystems(value: string): string[] {
  return WRITING_SYSTEMS.filter(({ pattern }) => pattern.test(value)).map(
    ({ name }) => name,
  );
}

export function collectLocalFindings(
  normalized: NormalizedUrl,
  passive: PassiveCheckResult,
): LocalFinding[] {
  const findings: LocalFinding[] = [];
  const urlText = normalized.redactedUrl;
  const hostname = normalized.hostnameAscii;
  const labels = hostname.split(".");
  const scripts = writingSystems(normalized.hostnameUnicode);

  if (urlText.length > 160) {
    findings.push({
      ruleId: "LOCAL_LONG_URL",
      source: "Local URL parser",
      finding: "The redacted URL is unusually long.",
      confidence: "HIGH",
      explanation:
        "Long addresses can make the destination harder to inspect, but are also common in legitimate apps.",
    });
  }
  if (hostname.length > 50) {
    findings.push({
      ruleId: "LOCAL_LONG_DOMAIN",
      source: "Local URL parser",
      finding: "The hostname is unusually long.",
      confidence: "HIGH",
      explanation:
        "A long hostname deserves careful spelling review and is not, by itself, evidence of wrongdoing.",
    });
  }
  if (labels.length > 5) {
    findings.push({
      ruleId: "LOCAL_EXCESSIVE_SUBDOMAINS",
      source: "Local URL parser",
      finding: "The address contains many subdomain levels.",
      confidence: "LOW",
      explanation:
        "Several subdomains can obscure the important domain label, while many legitimate services also use them.",
    });
  }
  if (isIP(hostname)) {
    findings.push({
      ruleId: "LOCAL_IP_HOST",
      source: "Local URL parser",
      finding: "The address uses a public IP address instead of a domain name.",
      confidence: "HIGH",
      explanation:
        "Direct public-IP links deserve extra verification, although legitimate services can use them.",
    });
  }
  if (labels.some((label) => label.startsWith("xn--"))) {
    findings.push({
      ruleId: "LOCAL_PUNYCODE",
      source: "Local URL parser",
      finding: "The domain contains an internationalized punycode label.",
      confidence: "HIGH",
      explanation:
        "Punycode supports legitimate internationalized domains and can also make lookalike spelling harder to notice.",
    });
  }
  if (scripts.length > 1) {
    findings.push({
      ruleId: "LOCAL_MIXED_SCRIPT",
      source: "Local URL parser",
      finding: `The decoded domain combines multiple writing systems: ${scripts.join(", ")}.`,
      confidence: "MEDIUM",
      explanation:
        "Multilingual domains can be legitimate; compare the spelling with an independently obtained address.",
    });
  }
  if (SHORTENER_HOSTS.has(hostname)) {
    findings.push({
      ruleId: "LOCAL_SHORTENER",
      source: "Local URL parser",
      finding: "The address uses a widely used URL-shortening service.",
      confidence: "MEDIUM",
      explanation:
        "Short links hide the eventual destination but are also used routinely for legitimate sharing.",
    });
  }
  if (normalized.url.pathname.includes("@")) {
    findings.push({
      ruleId: "LOCAL_SUSPICIOUS_AT",
      source: "Local URL parser",
      finding:
        "The path contains an at-sign that may make the address harder to read.",
      confidence: "MEDIUM",
      explanation: "An at-sign in a path is not automatically harmful.",
    });
  }
  if (passive.available && passive.httpsObserved === false) {
    findings.push({
      ruleId: "LOCAL_HTTP_ONLY",
      source: "Limited passive connection check",
      finding: "No HTTPS connection was observed during the limited check.",
      confidence: "MEDIUM",
      explanation:
        "Plain HTTP does not protect information in transit; HTTPS alone still does not prove trustworthiness.",
    });
  }
  if (passive.available && passive.redirectedAcrossDomains) {
    findings.push({
      ruleId: "LOCAL_REDIRECT_DOMAIN_CHANGE",
      source: "Limited passive connection check",
      finding: "The limited redirect check ended on a different domain.",
      confidence: "HIGH",
      explanation:
        "Legitimate services can change domains during redirects; verify the final spelling independently.",
    });
  }
  if (
    passive.available &&
    passive.httpsObserved &&
    passive.tlsValid === false
  ) {
    findings.push({
      ruleId: "LOCAL_TLS_INVALID",
      source: "Pinned TLS handshake",
      finding: "The TLS certificate could not be validated during this check.",
      confidence: "HIGH",
      explanation:
        "A certificate problem warrants caution but can also come from a temporary configuration issue.",
    });
  }
  if (passive.available && passive.tlsExpiresSoon) {
    findings.push({
      ruleId: "LOCAL_TLS_EXPIRES_SOON",
      source: "Pinned TLS handshake",
      finding: "The TLS certificate appears to expire within 14 days.",
      confidence: "MEDIUM",
      explanation:
        "Many legitimate sites renew automatically close to expiration.",
    });
  }

  return findings;
}

export function incompletePassiveIndicator(
  now: Date,
  passive: PassiveCheckResult,
): Indicator | null {
  if (passive.available) return null;
  return {
    id: "passive-check-incomplete",
    ruleId: null,
    source: "Limited passive connection check",
    finding: "The passive connection check was incomplete.",
    observedAt: now.toISOString(),
    dataFreshness: "No connection result",
    confidence: "LOW",
    explanation: passive.explanation,
    evidenceKind: "INCOMPLETE_CHECK",
    direct: true,
    providerAvailable: false,
    mayBeStale: false,
    points: 0,
  };
}
