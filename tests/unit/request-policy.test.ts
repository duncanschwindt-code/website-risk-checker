import { describe, expect, it, vi } from "vitest";

import {
  fetchJsonWithBackoff,
  fetchJsonWithPolicy,
  readBoundedJson,
} from "@/lib/security/request";

describe("bounded provider requests", () => {
  it("rejects an oversized declared response", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response("{}", {
        status: 200,
        headers: {
          "content-length": "1000",
          "content-type": "application/json",
        },
      });
    }) as unknown as typeof fetch;
    await expect(
      fetchJsonWithPolicy(
        "https://provider.example/api",
        {},
        { timeoutMs: 100, maxResponseBytes: 10 },
        fetchImpl,
      ),
    ).rejects.toMatchObject({ code: "OVERSIZED_RESPONSE" });
  });

  it("rejects an oversized measured response", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ data: "x".repeat(100) }), {
          status: 200,
        }),
    ) as unknown as typeof fetch;
    await expect(
      fetchJsonWithPolicy(
        "https://provider.example/api",
        {},
        { timeoutMs: 100, maxResponseBytes: 20 },
        fetchImpl,
      ),
    ).rejects.toMatchObject({ code: "OVERSIZED_RESPONSE" });
  });

  it("classifies a timeout without exposing a stack or URL", async () => {
    const fetchImpl = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    ) as unknown as typeof fetch;
    await expect(
      fetchJsonWithPolicy(
        "https://provider.example/api",
        {},
        { timeoutMs: 5, maxResponseBytes: 100 },
        fetchImpl,
      ),
    ).rejects.toMatchObject({ code: "TIMEOUT" });
  });

  it("rejects malformed JSON", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("{not json", { status: 200 }),
    ) as unknown as typeof fetch;
    await expect(
      fetchJsonWithPolicy(
        "https://provider.example/api",
        {},
        { timeoutMs: 100, maxResponseBytes: 100 },
        fetchImpl,
      ),
    ).rejects.toMatchObject({ code: "INVALID_JSON" });
  });

  it("retries transient provider failures with bounded exponential backoff", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockResolvedValueOnce(
        new Response('{"ok":true}', { status: 200 }),
      ) as unknown as typeof fetch;
    const waits: number[] = [];

    const response = await fetchJsonWithBackoff(
      "https://provider.example/api",
      {},
      { timeoutMs: 100, maxResponseBytes: 100 },
      fetchImpl,
      {
        maxRetries: 2,
        baseDelayMs: 100,
        wait: async (delayMs) => {
          waits.push(delayMs);
        },
      },
    );

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(waits).toEqual([100]);
  });

  it("does not retry a provider rate-limit response", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("{}", { status: 429 }),
    ) as unknown as typeof fetch;

    const response = await fetchJsonWithBackoff(
      "https://provider.example/api",
      {},
      { timeoutMs: 100, maxResponseBytes: 100 },
      fetchImpl,
      { maxRetries: 2, baseDelayMs: 100, wait: async () => undefined },
    );

    expect(response.status).toBe(429);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("bounded incoming JSON", () => {
  it("rejects a streamed body that exceeds its byte limit", async () => {
    const request = new Request("https://app.example/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(100) }),
    });

    await expect(readBoundedJson(request, 20)).rejects.toMatchObject({
      code: "REQUEST_TOO_LARGE",
    });
  });

  it("rejects a non-JSON content type", async () => {
    const request = new Request("https://app.example/api", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "{}",
    });

    await expect(readBoundedJson(request, 20)).rejects.toMatchObject({
      code: "UNSUPPORTED_MEDIA_TYPE",
    });
  });
});
