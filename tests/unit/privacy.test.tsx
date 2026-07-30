import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  hasSensitiveQueryName,
  redactForLog,
  stripSensitiveUrlParts,
  structuredLog,
} from "@/lib/security/privacy";

describe("privacy and output encoding", () => {
  it("removes queries, fragments, and credentials from URLs", () => {
    expect(
      stripSensitiveUrlParts(
        "https://user:pass@example.com/path?token=secret#fragment",
      ),
    ).toBe("https://example.com/path");
  });

  it("recognizes common sensitive query names", () => {
    expect(hasSensitiveQueryName("https://example.com/?invite=abc")).toBe(true);
    expect(hasSensitiveQueryName("https://example.com/?page=2")).toBe(false);
  });

  it("recursively redacts keys and URL details in logs", () => {
    const redacted = redactForLog({
      apiKey: "secret-value",
      nested: { authorization: "Bearer secret" },
      url: "https://example.com/path?token=secret#fragment",
    });
    expect(redacted).toEqual({
      apiKey: "[REDACTED]",
      nested: { authorization: "[REDACTED]" },
      url: "https://example.com/path",
    });
  });

  it("does not log secret values", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    structuredLog("info", "test", {
      apiKey: "never-log-this-key",
      url: "https://example.com/?session=secret",
    });
    expect(spy).toHaveBeenCalledOnce();
    const output = String(spy.mock.calls[0]?.[0]);
    expect(output).not.toContain("never-log-this-key");
    expect(output).not.toContain("session=secret");
    spy.mockRestore();
  });

  it("escapes provider-derived HTML before rendering", () => {
    const output = renderToStaticMarkup(<p>{"<script>alert('x')</script>"}</p>);
    expect(output).toContain("&lt;script&gt;");
    expect(output).not.toContain("<script>");
  });
});
