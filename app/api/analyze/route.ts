import { NextResponse } from "next/server";
import { z } from "zod";

import { analyzeUrl } from "@/lib/analysis/analyze";
import { getServerConfig } from "@/lib/config";
import { structuredLog } from "@/lib/security/privacy";
import {
  FixedWindowRateLimiter,
  privacyPreservingRateKey,
} from "@/lib/security/rate-limit";
import {
  JsonBodyError,
  readBoundedJson,
  sameOriginRequest,
} from "@/lib/security/request";
import { UrlValidationError } from "@/lib/security/url-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  url: z.string().trim().min(1).max(2048),
});

const initialConfig = getServerConfig();
const limiter = new FixedWindowRateLimiter(
  initialConfig.APP_RATE_LIMIT_MAX_REQUESTS,
  initialConfig.APP_RATE_LIMIT_WINDOW_SECONDS * 1_000,
);

function errorResponse(
  status: number,
  code: string,
  message: string,
  headers?: HeadersInit,
) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "cache-control": "no-store", ...headers } },
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  const config = getServerConfig();
  if (!sameOriginRequest(request, config.APP_BASE_URL)) {
    return errorResponse(
      403,
      "ORIGIN_REJECTED",
      "The request origin was not accepted.",
    );
  }
  if (config.APP_MODE !== "live") {
    return errorResponse(
      403,
      "DEMO_MODE_ONLY",
      "Live checks are disabled in demonstration mode. Choose a built-in demonstration case.",
    );
  }
  const rateKey = privacyPreservingRateKey(
    request,
    config.RATE_LIMIT_HASH_SECRET,
    config.TRUST_PROXY,
  );
  const decision = limiter.consume(rateKey);
  if (!decision.allowed) {
    return errorResponse(
      429,
      "APPLICATION_RATE_LIMITED",
      "Too many checks were requested. Wait before trying again.",
      {
        "retry-after": String(decision.retryAfterSeconds),
        "x-ratelimit-limit": String(decision.limit),
        "x-ratelimit-remaining": String(decision.remaining),
      },
    );
  }

  try {
    const body = requestSchema.parse(await readBoundedJson(request, 8_192));
    const result = await analyzeUrl(body.url, { config });
    structuredLog("info", "analysis_completed", {
      analysisId: result.id,
      normalizedDomain: result.normalizedDomain,
      score: result.score,
      providerStatuses: result.providers.map((provider) => ({
        providerId: provider.providerId,
        status: provider.status,
      })),
    });
    return NextResponse.json(result, {
      headers: {
        "cache-control": "no-store",
        "x-ratelimit-limit": String(decision.limit),
        "x-ratelimit-remaining": String(decision.remaining),
      },
    });
  } catch (error) {
    if (error instanceof JsonBodyError) {
      const status = error.code === "UNSUPPORTED_MEDIA_TYPE" ? 415 : 413;
      return errorResponse(
        error.code === "INVALID_JSON" ? 400 : status,
        error.code,
        error.message,
      );
    }
    if (error instanceof UrlValidationError) {
      return errorResponse(400, error.code, error.message);
    }
    if (error instanceof z.ZodError) {
      return errorResponse(
        400,
        "INVALID_REQUEST",
        "Enter a valid website address.",
      );
    }
    structuredLog("error", "analysis_failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return errorResponse(
      500,
      "ANALYSIS_FAILED",
      "The check could not be completed. No result was stored. Try again later.",
    );
  }
}
