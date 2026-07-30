import { NextResponse } from "next/server";

import { createDemoResult, isDemoCaseId } from "@/lib/demo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request): NextResponse {
  const caseId = new URL(request.url).searchParams.get("case") ?? "";
  if (!isDemoCaseId(caseId)) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_DEMO_CASE",
          message: "Choose one of the built-in examples.",
        },
      },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }
  return NextResponse.json(createDemoResult(caseId), {
    headers: { "cache-control": "no-store" },
  });
}
