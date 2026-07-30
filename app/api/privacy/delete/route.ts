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

const requestSchema = z.object({
  resultId: z.string().trim().min(1).max(100),
});

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
  try {
    requestSchema.parse(await readBoundedJson(request, 1_024));
    return NextResponse.json(
      {
        deletedRecords: 0,
        message:
          "This release does not persist scan results or submitted URLs. Nothing matching this result ID was stored.",
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
    return NextResponse.json(
      {
        error: {
          code: "INVALID_DELETION_REQUEST",
          message: "Provide a valid result reference.",
        },
      },
      { status: 400 },
    );
  }
}
