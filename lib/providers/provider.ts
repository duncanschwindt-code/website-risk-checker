import type { ServerConfig } from "@/lib/config";
import type { ProviderResult } from "@/lib/types";

export interface ProviderCheckContext {
  now: () => Date;
  fetchImpl: typeof fetch;
  config: ServerConfig;
}

export interface ThreatProvider {
  readonly id: string;
  readonly name: string;
  readonly networkConfigured: boolean;
  check(url: string, context: ProviderCheckContext): Promise<ProviderResult>;
}

export interface ProviderComplianceMetadata {
  id: string;
  name: string;
  noncommercialOnly: boolean;
  lastReviewed: string;
  nextReviewDue: string;
  attribution: string;
  submissionPrivacy: string;
  cachingAllowed: boolean;
}
