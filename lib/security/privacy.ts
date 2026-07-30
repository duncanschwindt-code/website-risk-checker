import { createHash } from "node:crypto";

const SECRET_KEY_PATTERN =
  /(?:api[-_]?key|auth[-_]?key|authorization|token|secret|password|cookie)/i;
const SENSITIVE_QUERY_PATTERN =
  /(?:token|key|code|secret|session|password|email|invite|auth|signature)/i;

export function stripSensitiveUrlParts(value: string): string {
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    url.hash = "";
    url.search = "";
    return url.toString();
  } catch {
    return "[invalid URL redacted]";
  }
}

export function hasSensitiveQueryName(value: string): boolean {
  try {
    const url = new URL(value);
    return [...url.searchParams.keys()].some((key) =>
      SENSITIVE_QUERY_PATTERN.test(key),
    );
  } catch {
    return false;
  }
}

export function hashForEphemeralKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function redactForLog(value: unknown, key = ""): unknown {
  if (SECRET_KEY_PATTERN.test(key)) {
    return "[REDACTED]";
  }
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value)) {
      return stripSensitiveUrlParts(value);
    }
    if (value.length > 200) {
      return `${value.slice(0, 197)}...`;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactForLog(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redactForLog(entryValue, entryKey),
      ]),
    );
  }
  return value;
}

export function structuredLog(
  level: "info" | "warn" | "error",
  event: string,
  fields: Record<string, unknown> = {},
): void {
  const redactedFields = redactForLog(fields);
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...(redactedFields && typeof redactedFields === "object"
      ? redactedFields
      : {}),
  });

  if (level === "error") {
    console.error(entry);
  } else if (level === "warn") {
    console.warn(entry);
  } else {
    console.info(entry);
  }
}
