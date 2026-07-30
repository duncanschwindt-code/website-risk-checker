import { NextResponse } from "next/server";

import { getServerConfig } from "@/lib/config";
import { getProviderPublicMetadata } from "@/lib/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): NextResponse {
  const config = getServerConfig();
  return NextResponse.json(
    {
      mode: config.APP_MODE,
      projectUseMode: config.PROJECT_USE_MODE,
      providers: getProviderPublicMetadata(config),
      contacts: {
        correctionEmail: config.CORRECTION_EMAIL || null,
        privacyEmail: config.PRIVACY_EMAIL || null,
        securityEmail: config.SECURITY_EMAIL || null,
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
