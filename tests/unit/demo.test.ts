import { describe, expect, it } from "vitest";

import { createDemoResult, DEMO_CASES } from "@/lib/demo";

describe("demonstration mode fixtures", () => {
  it("uses only reserved example domains", () => {
    for (const demo of DEMO_CASES) {
      expect(demo.domain.endsWith(".test")).toBe(true);
    }
  });

  it("labels every simulated result and never claims a live provider was checked", () => {
    const result = createDemoResult(
      "warning",
      new Date("2026-07-30T12:00:00.000Z"),
    );
    expect(result?.mode).toBe("demo");
    expect(result?.limitations).toContain(
      "Demonstration mode uses simulated data. No live threat-intelligence services were checked.",
    );
    expect(
      result?.providers.every((provider) => !provider.urlSentToProvider),
    ).toBe(true);
  });

  it("does not accept arbitrary case identifiers", () => {
    expect(createDemoResult("https://arbitrary.example")).toBeNull();
  });
});
