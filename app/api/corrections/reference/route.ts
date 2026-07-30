import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerConfig } from "@/lib/config";
import {
  JsonBodyError,
  readBoundedJson,
  sameOriginRequest,
} from "@/lib/security/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const correctionRequestSchema = z.object({
  resultId: z.string().trim().min(1).max(100),
  reason: z.enum([
    "fresh-check",
    "inaccurate-result",
    "expired-result",
    "site-repaired",
    "deletion-request",
    "other",
  ]),
  explanation: z.string().trim().min(20).max(4_000),
  supportingInformation: z.string().trim().max(2_000).optional().default(""),
  contactEmail: z.email().max(254),
});

export function createCorrectionReference(
  now = new Date(),
  random = randomBytes(5),
): string {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  return `WRC-${date}-${random.toString("hex").toUpperCase()}`;
}

export async function POST(request: Request): Promise<NextResponse> {
  const config = getServerConfig();
  if (!sameOriginRequest(request, config.APP_BASE_URL)) {
    return NextResponse.json(
      {
        error: {
          code: "ORIGIN_REJECTED",
          message: "The request origin was not accepted.",
        },
      },
      { status: 403 },
    );
  }
  if (!config.CORRECTION_EMAIL) {
    return NextResponse.json(
      {
        error: {
          code: "CORRECTION_CONTACT_NOT_CONFIGURED",
          message:
            "The operator must configure a private correction email before launch.",
        },
      },
      { status: 503 },
    );
  }

  try {
    const correction = correctionRequestSchema.parse(
      await readBoundedJson(request, 8_192),
    );
    const reference = createCorrectionReference();
    const subject = `Website Risk Checker correction ${reference}`;
    const body = [
      `Reference: ${reference}`,
      `Result ID: ${correction.resultId}`,
      `Reason: ${correction.reason}`,
      `Reply email: ${correction.contactEmail}`,
      "",
      "Explanation:",
      correction.explanation,
      "",
      "Supporting information:",
      correction.supportingInformation || "None provided",
      "",
      "This draft has not been sent. Review it before sending.",
    ].join("\n");
    return NextResponse.json(
      {
        reference,
        mailto: `mailto:${config.CORRECTION_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
        stored: false,
        message:
          "Your reference was generated. Review and send the private email draft to complete the request.",
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof JsonBodyError) {
      const status =
        error.code === "UNSUPPORTED_MEDIA_TYPE"
          ? 415
          : error.code === "REQUEST_TOO_LARGE"
            ? 413
            : 400;
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status, headers: { "cache-control": "no-store" } },
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_CORRECTION_REQUEST",
            message: "Review the correction form and try again.",
          },
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        error: {
          code: "CORRECTION_FAILED",
          message: "A reference could not be generated.",
        },
      },
      { status: 500 },
    );
  }
}
