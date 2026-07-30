import { z } from "zod";

import complianceJson from "@/config/provider-compliance.json";

const booleanFromEnv = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const serverConfigSchema = z.object({
  APP_MODE: z.enum(["live", "demo"]).default("live"),
  PROJECT_USE_MODE: z
    .enum(["noncommercial", "commercial"])
    .default("noncommercial"),
  APP_BASE_URL: z.url().default("http://localhost:3000"),
  ENABLE_GOOGLE_SAFE_BROWSING: booleanFromEnv,
  ENABLE_URLHAUS: booleanFromEnv,
  ENABLE_PHISHTANK: booleanFromEnv,
  ENABLE_OTX: booleanFromEnv,
  ENABLE_VIRUSTOTAL: booleanFromEnv,
  GOOGLE_SAFE_BROWSING_API_KEY: z.string().optional(),
  URLHAUS_AUTH_KEY: z.string().optional(),
  PHISHTANK_APP_KEY: z.string().optional(),
  OTX_API_KEY: z.string().optional(),
  VIRUSTOTAL_API_KEY: z.string().optional(),
  STRICT_PROVIDER_TERMS: booleanFromEnv,
  PROVIDER_REVIEW_MAX_AGE_DAYS: z.coerce
    .number()
    .int()
    .min(30)
    .max(365)
    .default(90),
  APP_RATE_LIMIT_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .min(10)
    .max(86400)
    .default(600),
  APP_RATE_LIMIT_MAX_REQUESTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(10),
  REQUEST_CONNECT_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(250)
    .max(15000)
    .default(3000),
  REQUEST_TOTAL_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(500)
    .max(30000)
    .default(7000),
  MAX_REDIRECTS: z.coerce.number().int().min(0).max(5).default(3),
  MAX_PROVIDER_RESPONSE_BYTES: z.coerce
    .number()
    .int()
    .min(1024)
    .max(2_000_000)
    .default(524_288),
  PROVIDER_MAX_RETRIES: z.coerce.number().int().min(0).max(2).default(1),
  PROVIDER_RETRY_BASE_MS: z.coerce
    .number()
    .int()
    .min(50)
    .max(2_000)
    .default(250),
  TRUST_PROXY: booleanFromEnv,
  RATE_LIMIT_HASH_SECRET: z
    .string()
    .min(32)
    .default("development-only-rate-limit-secret"),
  CORRECTION_EMAIL: z.email().optional().or(z.literal("")),
  PRIVACY_EMAIL: z.email().optional().or(z.literal("")),
  SECURITY_EMAIL: z.email().optional().or(z.literal("")),
  LEGAL_CONTACT: z.string().max(200).optional(),
  OPERATOR_LEGAL_NAME: z.string().max(200).optional(),
  GOVERNING_JURISDICTION: z.string().max(200).optional(),
  LEGAL_EFFECTIVE_DATE: z.string().max(40).optional(),
});

export type ServerConfig = z.infer<typeof serverConfigSchema>;

let memoizedConfig: ServerConfig | undefined;

export function getServerConfig(
  env: NodeJS.ProcessEnv = process.env,
): ServerConfig {
  if (env === process.env && memoizedConfig) {
    return memoizedConfig;
  }

  const parsed = serverConfigSchema.safeParse(env);
  if (!parsed.success) {
    const fields = parsed.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(
      `Invalid server configuration. Review these fields: ${fields}`,
    );
  }

  if (env === process.env) {
    memoizedConfig = parsed.data;
  }
  return parsed.data;
}

export const providerComplianceSchema = z.object({
  reviewedAsOf: z.string(),
  reviewIntervalDays: z.number(),
  providers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      enabled: z.boolean(),
      freeAccessConfirmed: z.boolean(),
      keyRequired: z.boolean(),
      commercialUseAllowed: z.boolean(),
      noncommercialOnly: z.boolean(),
      typicalQuota: z.string(),
      rateLimit: z.string(),
      termsUrl: z.url(),
      documentationUrl: z.url(),
      lastReviewed: z.string(),
      nextReviewDue: z.string(),
      retentionNotes: z.string(),
      cachingAllowed: z.boolean(),
      attribution: z.string(),
      attributionRequired: z.boolean(),
      submissionPrivacy: z.string(),
      submitsUnknownUrls: z.boolean(),
      operatorNotes: z.string(),
    }),
  ),
});

export const providerCompliance =
  providerComplianceSchema.parse(complianceJson);

export const providerEnvMap = {
  "google-safe-browsing": {
    enabled: "ENABLE_GOOGLE_SAFE_BROWSING",
    key: "GOOGLE_SAFE_BROWSING_API_KEY",
  },
  urlhaus: { enabled: "ENABLE_URLHAUS", key: "URLHAUS_AUTH_KEY" },
  phishtank: { enabled: "ENABLE_PHISHTANK", key: "PHISHTANK_APP_KEY" },
  otx: { enabled: "ENABLE_OTX", key: "OTX_API_KEY" },
  virustotal: { enabled: "ENABLE_VIRUSTOTAL", key: "VIRUSTOTAL_API_KEY" },
} as const;

export function resetConfigForTests(): void {
  memoizedConfig = undefined;
}
