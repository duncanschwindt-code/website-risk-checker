import { describe, expect, it } from "vitest";

import type { LocalFinding } from "@/lib/analysis/heuristics";
import {
  categoryForScore,
  scoreFindings,
  summaryForScore,
} from "@/lib/analysis/scoring";
import { providerResult } from "@/tests/helpers";

const now = new Date("2026-07-30T12:00:00.000Z");

describe("scoring boundaries and safeguards", () => {
  it.each([
    [0, "Lower observed risk"],
    [24, "Lower observed risk"],
    [25, "Some caution recommended"],
    [49, "Some caution recommended"],
    [50, "Elevated observed risk"],
    [74, "Elevated observed risk"],
    [75, "Strong warning indicators"],
    [100, "Strong warning indicators"],
  ])("maps %i to %s", (score, category) => {
    expect(categoryForScore(score)).toBe(category);
  });

  it("caps combined weak signals at 24", () => {
    const ruleIds = [
      "LOCAL_HTTP_ONLY",
      "LOCAL_IP_HOST",
      "LOCAL_PUNYCODE",
      "LOCAL_MIXED_SCRIPT",
      "LOCAL_EXCESSIVE_SUBDOMAINS",
      "LOCAL_LONG_URL",
      "LOCAL_LONG_DOMAIN",
      "LOCAL_SHORTENER",
      "LOCAL_SUSPICIOUS_AT",
      "LOCAL_REDIRECT_DOMAIN_CHANGE",
      "LOCAL_TLS_INVALID",
      "LOCAL_TLS_EXPIRES_SOON",
    ];
    const local: LocalFinding[] = ruleIds.map((ruleId) => ({
      ruleId,
      source: "Test parser",
      finding: ruleId,
      confidence: "LOW",
      explanation: "Reserved test finding.",
    }));
    const scored = scoreFindings([], local, now);
    expect(scored.score).toBe(24);
    expect(scored.category).toBe("Lower observed risk");
    expect(
      scored.indicators.reduce((total, item) => total + item.points, 0),
    ).toBe(24);
  });

  it("gives unavailable providers zero points", () => {
    const scored = scoreFindings(
      [
        providerResult("google-safe-browsing", "UNAVAILABLE"),
        providerResult("virustotal", "RATE_LIMITED"),
        providerResult("urlhaus", "NOT_CONFIGURED"),
      ],
      [],
      now,
    );
    expect(scored.score).toBe(0);
    expect(scored.confidence).toBe("LOW");
  });

  it("adds strong evidence and independent corroboration without duplicating the 60-point rule", () => {
    const scored = scoreFindings(
      [
        providerResult("google-safe-browsing", "MATCH"),
        providerResult("urlhaus", "MATCH"),
      ],
      [],
      now,
    );
    expect(scored.score).toBe(80);
    expect(scored.category).toBe("Strong warning indicators");
    expect(scored.confidence).toBe("HIGH");
  });

  it("does not let OTX community counts reach maximum risk alone", () => {
    const scored = scoreFindings(
      [
        providerResult("otx", "MATCH", {
          metadata: { pulseCount: 500 },
        }),
      ],
      [],
      now,
    );
    expect(scored.score).toBe(22);
  });

  it("requires at least three concerning VirusTotal engines for its scoring rule", () => {
    const two = scoreFindings(
      [
        providerResult("virustotal", "MATCH", {
          metadata: { maliciousEngines: 1, suspiciousEngines: 1 },
        }),
      ],
      [],
      now,
    );
    const three = scoreFindings(
      [
        providerResult("virustotal", "MATCH", {
          metadata: { maliciousEngines: 2, suspiciousEngines: 1 },
        }),
      ],
      [],
      now,
    );
    expect(two.score).toBe(0);
    expect(three.score).toBe(45);
  });

  it("gives stale matches zero points", () => {
    const scored = scoreFindings(
      [
        providerResult("virustotal", "STALE_RESULT", {
          match: false,
          mayBeStale: true,
        }),
      ],
      [],
      now,
    );
    expect(scored.score).toBe(0);
    expect(scored.indicators[0]?.evidenceKind).toBe("EXPIRED_RESULT");
  });

  it("shows provider disagreement without subtracting a match", () => {
    const scored = scoreFindings(
      [
        providerResult("google-safe-browsing", "MATCH"),
        providerResult("phishtank", "NO_MATCH"),
      ],
      [],
      now,
    );
    expect(scored.score).toBe(60);
    expect(scored.indicators).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ evidenceKind: "PROVIDER_DISAGREEMENT" }),
      ]),
    );
  });

  it("uses required cautious low- and high-score wording", () => {
    expect(summaryForScore(0)).toContain("does not guarantee");
    expect(summaryForScore(75)).toContain("independently verify");
    expect(summaryForScore(75).toLowerCase()).not.toContain(
      "definitely a scam",
    );
  });
});
