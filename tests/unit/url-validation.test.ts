import { describe, expect, it } from "vitest";

import {
  isPublicAddress,
  normalizeSubmittedUrl,
  revalidateAndPinAddress,
  resolvePublicAddresses,
  type DnsResolver,
  UrlValidationError,
} from "@/lib/security/url-validation";

describe("URL normalization", () => {
  it("accepts a public URL and removes query and fragment", () => {
    const result = normalizeSubmittedUrl(
      "https://Example.COM/path?token=secret#private",
    );
    expect(result.hostnameAscii).toBe("example.com");
    expect(result.redactedUrl).toBe("https://example.com/path");
    expect(result.queryWasRemoved).toBe(true);
    expect(result.fragmentWasRemoved).toBe(true);
  });

  it("adds https when a scheme is omitted", () => {
    const result = normalizeSubmittedUrl("example.com/path");
    expect(result.addedDefaultScheme).toBe(true);
    expect(result.redactedUrl).toBe("https://example.com/path");
  });

  it("normalizes Unicode domains to punycode and preserves a Unicode display form", () => {
    const result = normalizeSubmittedUrl("https://bücher.example/");
    expect(result.hostnameAscii).toBe("xn--bcher-kva.example");
    expect(result.hostnameUnicode).toBe("bücher.example");
  });

  it.each([
    ["file:///etc/passwd", "UNSUPPORTED_PROTOCOL"],
    ["javascript:alert(1)", "UNSUPPORTED_PROTOCOL"],
    ["ftp://example.com", "UNSUPPORTED_PROTOCOL"],
    ["https://user:password@example.com", "EMBEDDED_CREDENTIALS"],
    ["https://example.com:8443", "NONSTANDARD_PORT"],
    ["http://localhost", "INTERNAL_HOSTNAME"],
    ["http://service.internal", "INTERNAL_HOSTNAME"],
    ["http://singlelabel", "INTERNAL_HOSTNAME"],
  ])("rejects %s", (input, code) => {
    expect(() => normalizeSubmittedUrl(input)).toThrowError(
      expect.objectContaining({ code }) as UrlValidationError,
    );
  });

  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "0.0.0.0",
    "100.64.0.1",
    "192.0.2.1",
    "198.51.100.1",
    "203.0.113.1",
    "::1",
    "::",
    "fe80::1",
    "fc00::1",
    "ff02::1",
    "::ffff:127.0.0.1",
    "2001:db8::1",
  ])("rejects private or reserved address %s", (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });

  it.each(["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])(
    "allows public unicast address %s",
    (address) => {
      expect(isPublicAddress(address)).toBe(true);
    },
  );

  it.each([
    "http://2130706433/",
    "http://0x7f000001/",
    "http://0177.0.0.1/",
    "http://127.0x0.0.1/",
  ])("normalizes and rejects unusual private IP notation %s", async (input) => {
    const result = normalizeSubmittedUrl(input);
    await expect(
      resolvePublicAddresses(result.hostnameAscii),
    ).rejects.toMatchObject({
      code: "PRIVATE_ADDRESS",
    });
  });

  it("rejects a hostname when any DNS answer is private", async () => {
    const resolver: DnsResolver = async () => [
      { address: "8.8.8.8", family: 4 },
      { address: "10.0.0.1", family: 4 },
    ];
    await expect(
      resolvePublicAddresses("example.com", resolver),
    ).rejects.toMatchObject({
      code: "PRIVATE_ADDRESS",
    });
  });

  it("blocks DNS rebinding when the immediate recheck becomes private", async () => {
    let calls = 0;
    const resolver: DnsResolver = async () => {
      calls += 1;
      return calls === 1
        ? [{ address: "8.8.8.8", family: 4 }]
        : [{ address: "127.0.0.1", family: 4 }];
    };
    await expect(
      revalidateAndPinAddress("example.com", resolver),
    ).rejects.toMatchObject({
      code: "PRIVATE_ADDRESS",
    });
  });
});
