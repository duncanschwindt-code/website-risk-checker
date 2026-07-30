import { createHmac } from "node:crypto";

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  consume(key: string): RateLimitDecision {
    const currentTime = this.now();
    const existing = this.buckets.get(key);
    const bucket =
      existing && existing.resetAt > currentTime
        ? existing
        : { count: 0, resetAt: currentTime + this.windowMs };
    bucket.count += 1;
    this.buckets.set(key, bucket);
    this.removeExpired(currentTime);

    const allowed = bucket.count <= this.limit;
    return {
      allowed,
      limit: this.limit,
      remaining: Math.max(0, this.limit - bucket.count),
      retryAfterSeconds: allowed
        ? 0
        : Math.max(1, Math.ceil((bucket.resetAt - currentTime) / 1000)),
    };
  }

  private removeExpired(currentTime: number): void {
    if (this.buckets.size < 1_000) return;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= currentTime) this.buckets.delete(key);
    }
  }
}

export function privacyPreservingRateKey(
  request: Request,
  secret: string,
  trustProxy: boolean,
): string {
  const forwarded = trustProxy
    ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    : null;
  const source = forwarded || request.headers.get("user-agent") || "anonymous";
  return createHmac("sha256", secret).update(source).digest("hex");
}

export class ProviderQueue {
  private chain: Promise<unknown> = Promise.resolve();
  private lastStartedAt = 0;
  private requestCount = 0;
  private trackingStartedAt = 0;
  private quotaCount = 0;
  private quotaResetAt = 0;

  constructor(
    private readonly minimumIntervalMs: number,
    private readonly wait: (delayMs: number) => Promise<void> = (delayMs) =>
      new Promise((resolve) => setTimeout(resolve, delayMs)),
    private readonly now: () => number = Date.now,
    private readonly quota?: { limit: number; windowMs: number },
  ) {}

  schedule<T>(operation: () => Promise<T>): Promise<T> {
    const run = async (): Promise<T> => {
      if (this.quota) {
        const currentTime = this.now();
        if (this.quotaResetAt <= currentTime) {
          this.quotaCount = 0;
          this.quotaResetAt = currentTime + this.quota.windowMs;
        }
        if (this.quotaCount >= this.quota.limit) {
          throw new ProviderQuotaError(
            Math.max(1, Math.ceil((this.quotaResetAt - currentTime) / 1_000)),
          );
        }
        this.quotaCount += 1;
      }
      const delay = Math.max(
        0,
        this.lastStartedAt + this.minimumIntervalMs - this.now(),
      );
      if (delay > 0) await this.wait(delay);
      this.lastStartedAt = this.now();
      if (this.trackingStartedAt === 0) {
        this.trackingStartedAt = this.lastStartedAt;
      }
      this.requestCount += 1;
      return operation();
    };

    const scheduled = this.chain.then(run, run);
    this.chain = scheduled.then(
      () => undefined,
      () => undefined,
    );
    return scheduled;
  }

  getUsage(): {
    requestCount: number;
    trackingStartedAt: number | null;
    quotaCount: number | null;
    quotaLimit: number | null;
    quotaResetAt: number | null;
  } {
    return {
      requestCount: this.requestCount,
      trackingStartedAt:
        this.trackingStartedAt === 0 ? null : this.trackingStartedAt,
      quotaCount: this.quota ? this.quotaCount : null,
      quotaLimit: this.quota?.limit ?? null,
      quotaResetAt: this.quota ? this.quotaResetAt : null,
    };
  }
}

export class ProviderQuotaError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("The internal provider quota has been reached.");
    this.name = "ProviderQuotaError";
  }
}
