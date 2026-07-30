import { describe, expect, it } from "vitest";

import { runPassiveChecks } from "@/lib/security/passive-checks";
import {
  normalizeSubmittedUrl,
  type DnsResolver,
} from "@/lib/security/url-validation";

const publicResolver: DnsResolver = async () => [
  { address: "8.8.8.8", family: 4 },
];

describe("passive destination checks", () => {
  it("blocks a redirect to localhost before it is requested", async () => {
    const requested: string[] = [];
    const result = await runPassiveChecks(
      normalizeSubmittedUrl("http://example.com"),
      {
        resolver: publicResolver,
        connectTimeoutMs: 100,
        totalTimeoutMs: 1_000,
        maxRedirects: 3,
      },
      async (target) => {
        requested.push(target.toString());
        return { status: 302, location: "http://localhost/" };
      },
    );
    expect(result.available).toBe(false);
    expect(result.errorCode).toBe("INTERNAL_HOSTNAME");
    expect(requested).toHaveLength(1);
  });

  it("blocks a redirect whose DNS answer is private", async () => {
    const resolver: DnsResolver = async (hostname) =>
      hostname === "private.example"
        ? [{ address: "10.0.0.2", family: 4 }]
        : [{ address: "8.8.8.8", family: 4 }];
    const result = await runPassiveChecks(
      normalizeSubmittedUrl("http://example.com"),
      {
        resolver,
        connectTimeoutMs: 100,
        totalTimeoutMs: 1_000,
        maxRedirects: 3,
      },
      async () => ({ status: 302, location: "http://private.example/" }),
    );
    expect(result.available).toBe(false);
    expect(result.errorCode).toBe("PRIVATE_ADDRESS");
  });

  it("detects redirect loops", async () => {
    const result = await runPassiveChecks(
      normalizeSubmittedUrl("http://example.com"),
      {
        resolver: publicResolver,
        connectTimeoutMs: 100,
        totalTimeoutMs: 1_000,
        maxRedirects: 3,
      },
      async () => ({ status: 302, location: "http://example.com/" }),
    );
    expect(result.available).toBe(false);
    expect(result.errorCode).toBe("REDIRECT_LOOP");
  });

  it("limits excessive redirects", async () => {
    let index = 0;
    const result = await runPassiveChecks(
      normalizeSubmittedUrl("http://example.com"),
      {
        resolver: publicResolver,
        connectTimeoutMs: 100,
        totalTimeoutMs: 1_000,
        maxRedirects: 1,
      },
      async () => {
        index += 1;
        return { status: 302, location: `http://redirect-${index}.example/` };
      },
    );
    expect(result.available).toBe(false);
    expect(result.errorCode).toBe("TOO_MANY_REDIRECTS");
  });

  it("reports a successful bodyless HTTP check", async () => {
    const result = await runPassiveChecks(
      normalizeSubmittedUrl("http://example.com"),
      {
        resolver: publicResolver,
        connectTimeoutMs: 100,
        totalTimeoutMs: 1_000,
        maxRedirects: 3,
      },
      async () => ({ status: 200, location: null }),
    );
    expect(result).toMatchObject({
      available: true,
      httpsObserved: false,
      finalDomain: "example.com",
      redirectCount: 0,
    });
  });
});
