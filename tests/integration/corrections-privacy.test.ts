import { afterEach, describe, expect, it, vi } from "vitest";

import {
  correctionRequestSchema,
  createCorrectionReference,
  POST as correctionPost,
} from "@/app/api/corrections/reference/route";
import { POST as deletePost } from "@/app/api/privacy/delete/route";
import { resetConfigForTests } from "@/lib/config";

afterEach(() => {
  vi.unstubAllEnvs();
  resetConfigForTests();
});

describe("private correction and deletion handling", () => {
  it("creates a deterministic, non-identifying reference", () => {
    const reference = createCorrectionReference(
      new Date("2026-07-30T12:00:00.000Z"),
      Buffer.from("0102030405", "hex"),
    );
    expect(reference).toBe("WRC-20260730-0102030405");
  });

  it("validates the correction fields without accepting underspecified explanations", () => {
    const parsed = correctionRequestSchema.safeParse({
      resultId: "result-1",
      reason: "site-repaired",
      explanation: "too short",
      contactEmail: "owner@example.com",
    });
    expect(parsed.success).toBe(false);
  });

  it("prepares a private mail draft without storing the request", async () => {
    vi.stubEnv("APP_BASE_URL", "http://localhost:3000");
    vi.stubEnv("CORRECTION_EMAIL", "corrections@example.com");
    vi.stubEnv("RATE_LIMIT_HASH_SECRET", "tests-only-rate-limit-secret-value");
    resetConfigForTests();

    const response = await correctionPost(
      new Request("http://localhost:3000/api/corrections/reference", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          resultId: "result-1",
          reason: "site-repaired",
          explanation:
            "The previously compromised test site has been repaired and rechecked.",
          supportingInformation: "Reserved integration-test information.",
          contactEmail: "owner@example.com",
        }),
      }),
    );
    const body = (await response.json()) as {
      reference: string;
      mailto: string;
      stored: boolean;
    };
    expect(response.status).toBe(200);
    expect(body.stored).toBe(false);
    expect(body.mailto).toContain("mailto:corrections@example.com");
    expect(body.reference).toMatch(/^WRC-\d{8}-[A-F0-9]{10}$/);
  });

  it("confirms that the initial release has no persisted scan record to delete", async () => {
    vi.stubEnv("APP_BASE_URL", "http://localhost:3000");
    vi.stubEnv("RATE_LIMIT_HASH_SECRET", "tests-only-rate-limit-secret-value");
    resetConfigForTests();
    const response = await deletePost(
      new Request("http://localhost:3000/api/privacy/delete", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ resultId: "result-1" }),
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ deletedRecords: 0 });
  });

  it("rejects a cross-origin correction request", async () => {
    vi.stubEnv("APP_BASE_URL", "http://localhost:3000");
    vi.stubEnv("CORRECTION_EMAIL", "corrections@example.com");
    vi.stubEnv("RATE_LIMIT_HASH_SECRET", "tests-only-rate-limit-secret-value");
    resetConfigForTests();
    const response = await correctionPost(
      new Request("http://localhost:3000/api/corrections/reference", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://attacker.example",
        },
        body: "{}",
      }),
    );
    expect(response.status).toBe(403);
  });
});
