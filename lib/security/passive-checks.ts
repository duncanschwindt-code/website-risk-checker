import tls from "node:tls";

import { Agent, request } from "undici";

import type {
  DnsResolver,
  NormalizedUrl,
  ResolvedAddress,
} from "@/lib/security/url-validation";
import {
  normalizeSubmittedUrl,
  revalidateAndPinAddress,
  UrlValidationError,
} from "@/lib/security/url-validation";

export interface PassiveCheckResult {
  available: boolean;
  finalUrl: string | null;
  finalDomain: string | null;
  redirectCount: number | null;
  redirectedAcrossDomains: boolean;
  httpsObserved: boolean | null;
  tlsValid: boolean | null;
  tlsExpiresAt: string | null;
  tlsExpiresSoon: boolean;
  errorCode: string | null;
  explanation: string;
}

export interface PassiveCheckOptions {
  resolver: DnsResolver;
  connectTimeoutMs: number;
  totalTimeoutMs: number;
  maxRedirects: number;
}

type HeadRequester = (
  target: URL,
  pinned: ResolvedAddress,
  timeoutMs: number,
) => Promise<{ status: number; location: string | null }>;

const defaultHeadRequester: HeadRequester = async (
  target,
  pinned,
  timeoutMs,
) => {
  const agent = new Agent({
    connect: {
      timeout: timeoutMs,
      lookup: (_hostname, options, callback) => {
        if (
          options &&
          typeof options === "object" &&
          "all" in options &&
          options.all
        ) {
          callback(null, [{ address: pinned.address, family: pinned.family }]);
        } else {
          callback(null, pinned.address, pinned.family);
        }
      },
    },
  });

  try {
    const response = await request(target, {
      dispatcher: agent,
      method: "HEAD",
      headers: {
        accept: "*/*",
        "user-agent":
          "TeensAgainstScams-WebsiteRiskChecker/1.0 (+https://github.com/)",
      },
      headersTimeout: timeoutMs,
      bodyTimeout: timeoutMs,
    });
    await response.body.dump();
    const locationHeader = response.headers.location;
    return {
      status: response.statusCode,
      location: Array.isArray(locationHeader)
        ? (locationHeader[0] ?? null)
        : (locationHeader ?? null),
    };
  } finally {
    await agent.close();
  }
};

async function probeTls(
  target: URL,
  pinned: ResolvedAddress,
  timeoutMs: number,
): Promise<{
  valid: boolean | null;
  expiresAt: string | null;
  expiresSoon: boolean;
}> {
  if (target.protocol !== "https:") {
    return { valid: false, expiresAt: null, expiresSoon: false };
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: {
      valid: boolean | null;
      expiresAt: string | null;
      expiresSoon: boolean;
    }) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };
    const socket = tls.connect({
      host: pinned.address,
      port: 443,
      servername: target.hostname,
      rejectUnauthorized: true,
      timeout: timeoutMs,
    });

    socket.once("secureConnect", () => {
      const certificate = socket.getPeerCertificate();
      const expiration = certificate.valid_to
        ? new Date(certificate.valid_to)
        : null;
      const expiresSoon =
        expiration !== null &&
        Number.isFinite(expiration.getTime()) &&
        expiration.getTime() - Date.now() <= 14 * 24 * 60 * 60 * 1000;
      finish({
        valid: socket.authorized,
        expiresAt: expiration?.toISOString() ?? null,
        expiresSoon,
      });
    });
    socket.once("timeout", () =>
      finish({ valid: null, expiresAt: null, expiresSoon: false }),
    );
    socket.once("error", (error: NodeJS.ErrnoException) => {
      const certificateValidationErrors = new Set([
        "CERT_HAS_EXPIRED",
        "DEPTH_ZERO_SELF_SIGNED_CERT",
        "ERR_TLS_CERT_ALTNAME_INVALID",
        "INVALID_CA",
        "SELF_SIGNED_CERT_IN_CHAIN",
        "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
        "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
      ]);
      finish({
        valid: certificateValidationErrors.has(error.code ?? "") ? false : null,
        expiresAt: null,
        expiresSoon: false,
      });
    });
  });
}

export async function runPassiveChecks(
  normalized: NormalizedUrl,
  options: PassiveCheckOptions,
  headRequester: HeadRequester = defaultHeadRequester,
): Promise<PassiveCheckResult> {
  const startedAt = Date.now();
  const seen = new Set<string>();
  let current = normalized.url;
  let redirects = 0;

  try {
    while (true) {
      if (Date.now() - startedAt > options.totalTimeoutMs) {
        throw new Error("TOTAL_TIMEOUT");
      }
      if (seen.has(current.toString())) {
        throw new UrlValidationError(
          "REDIRECT_LOOP",
          "The website returned a redirect loop.",
        );
      }
      seen.add(current.toString());
      const pinned = await revalidateAndPinAddress(
        current.hostname,
        options.resolver,
      );
      const response = await headRequester(
        current,
        pinned,
        options.connectTimeoutMs,
      );
      const isRedirect =
        response.status >= 300 && response.status < 400 && response.location;
      if (!isRedirect) {
        const tlsResult =
          current.protocol === "https:"
            ? await probeTls(current, pinned, options.connectTimeoutMs)
            : { valid: null, expiresAt: null, expiresSoon: false };
        return {
          available: true,
          finalUrl: current.toString(),
          finalDomain: current.hostname,
          redirectCount: redirects,
          redirectedAcrossDomains:
            current.hostname !== normalized.hostnameAscii,
          httpsObserved: current.protocol === "https:",
          tlsValid: tlsResult.valid,
          tlsExpiresAt: tlsResult.expiresAt,
          tlsExpiresSoon: tlsResult.expiresSoon,
          errorCode: null,
          explanation:
            "A limited HEAD request was completed without downloading the page body.",
        };
      }
      if (redirects >= options.maxRedirects) {
        throw new UrlValidationError(
          "TOO_MANY_REDIRECTS",
          "The website returned too many redirects.",
        );
      }
      const redirected = new URL(response.location!, current);
      current = normalizeSubmittedUrl(redirected.toString()).url;
      redirects += 1;
    }
  } catch (error) {
    const errorCode =
      error instanceof UrlValidationError
        ? error.code
        : error instanceof Error && error.message === "TOTAL_TIMEOUT"
          ? "TIMEOUT"
          : "UNAVAILABLE";
    return {
      available: false,
      finalUrl: null,
      finalDomain: null,
      redirectCount: null,
      redirectedAcrossDomains: false,
      httpsObserved: null,
      tlsValid: null,
      tlsExpiresAt: null,
      tlsExpiresSoon: false,
      errorCode,
      explanation:
        "The limited passive connection check could not be completed. No risk points were added or removed for its unavailability.",
    };
  }
}
