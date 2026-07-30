import { NextResponse } from "next/server";

import { getServerConfig } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): NextResponse {
  const config = getServerConfig();
  return NextResponse.json(
    {
      status: "ok",
      mode: config.APP_MODE,
      timestamp: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
