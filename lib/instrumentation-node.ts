import { getServerConfig } from "@/lib/config";
import { validateStartupProviderCompliance } from "@/lib/providers";
import { structuredLog } from "@/lib/security/privacy";

export function registerNodeInstrumentation(): void {
  const warnings = validateStartupProviderCompliance(getServerConfig());
  for (const warning of warnings) {
    structuredLog("warn", "provider_compliance_warning", { warning });
  }
}
