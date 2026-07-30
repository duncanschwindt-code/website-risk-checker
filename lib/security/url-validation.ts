import { resolve4, resolve6 } from "node:dns/promises";
import { isIP } from "node:net";
import { domainToUnicode } from "node:url";

import ipaddr from "ipaddr.js";
import { z } from "zod";

const rawUrlSchema = z
  .string()
  .trim()
  .min(1, "Enter a website address.")
  .max(2048, "The website address is too long.")
  .refine(
    (value) => !/[\u0000-\u001f\u007f]/.test(value),
    "Control characters are not allowed.",
  );

const INTERNAL_HOST_SUFFIXES = [
  ".internal",
  ".intranet",
  ".lan",
  ".local",
  ".localhost",
  ".home",
  ".test",
  ".invalid",
];

export type UrlValidationCode =
  | "INVALID_URL"
  | "UNSUPPORTED_PROTOCOL"
  | "EMBEDDED_CREDENTIALS"
  | "NONSTANDARD_PORT"
  | "INTERNAL_HOSTNAME"
  | "PRIVATE_ADDRESS"
  | "DNS_UNRESOLVED"
  | "DNS_REBINDING"
  | "REDIRECT_LOOP"
  | "TOO_MANY_REDIRECTS";

export class UrlValidationError extends Error {
  constructor(
    public readonly code: UrlValidationCode,
    message: string,
  ) {
    super(message);
    this.name = "UrlValidationError";
  }
}

export interface NormalizedUrl {
  url: URL;
  redactedUrl: string;
  lookupUrl: string;
  hostnameAscii: string;
  hostnameUnicode: string;
  queryWasRemoved: boolean;
  fragmentWasRemoved: boolean;
  addedDefaultScheme: boolean;
}

export interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

export type DnsResolver = (hostname: string) => Promise<ResolvedAddress[]>;

export const systemDnsResolver: DnsResolver = async (hostname) => {
  if (isIP(hostname)) {
    return [{ address: hostname, family: isIP(hostname) as 4 | 6 }];
  }

  const [ipv4, ipv6] = await Promise.allSettled([
    resolve4(hostname),
    resolve6(hostname),
  ]);
  const addresses: ResolvedAddress[] = [];
  if (ipv4.status === "fulfilled") {
    addresses.push(
      ...ipv4.value.map((address) => ({ address, family: 4 as const })),
    );
  }
  if (ipv6.status === "fulfilled") {
    addresses.push(
      ...ipv6.value.map((address) => ({ address, family: 6 as const })),
    );
  }
  return addresses;
};

function normalizeCandidate(raw: string): {
  candidate: string;
  addedDefaultScheme: boolean;
} {
  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(raw);
  return {
    candidate: hasScheme ? raw : `https://${raw}`,
    addedDefaultScheme: !hasScheme,
  };
}

export function normalizeSubmittedUrl(raw: string): NormalizedUrl {
  const parsedRaw = rawUrlSchema.safeParse(raw);
  if (!parsedRaw.success) {
    throw new UrlValidationError(
      "INVALID_URL",
      parsedRaw.error.issues[0]?.message ?? "Invalid URL.",
    );
  }

  const { candidate, addedDefaultScheme } = normalizeCandidate(parsedRaw.data);
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new UrlValidationError(
      "INVALID_URL",
      "Enter a valid public website address.",
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UrlValidationError(
      "UNSUPPORTED_PROTOCOL",
      "Only http and https website addresses are allowed.",
    );
  }
  if (url.username || url.password) {
    throw new UrlValidationError(
      "EMBEDDED_CREDENTIALS",
      "Links containing a username or password cannot be checked.",
    );
  }
  if (url.port) {
    throw new UrlValidationError(
      "NONSTANDARD_PORT",
      "Only the standard web ports are allowed for this check.",
    );
  }

  let hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || hostname.length > 253) {
    throw new UrlValidationError(
      "INVALID_URL",
      "The hostname is missing or too long.",
    );
  }
  if (hostname === "localhost" || hostname.indexOf(".") === -1) {
    throw new UrlValidationError(
      "INTERNAL_HOSTNAME",
      "Local and internal hostnames cannot be checked.",
    );
  }
  if (INTERNAL_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    throw new UrlValidationError(
      "INTERNAL_HOSTNAME",
      "Local and internal hostnames cannot be checked.",
    );
  }

  const queryWasRemoved = url.search.length > 0;
  const fragmentWasRemoved = url.hash.length > 0;
  url.hostname = hostname;
  url.search = "";
  url.hash = "";
  url.username = "";
  url.password = "";

  hostname = url.hostname;
  const lookupUrl = url.toString();
  return {
    url,
    redactedUrl: lookupUrl,
    lookupUrl,
    hostnameAscii: hostname,
    hostnameUnicode: domainToUnicode(hostname),
    queryWasRemoved,
    fragmentWasRemoved,
    addedDefaultScheme,
  };
}

export function isPublicAddress(address: string): boolean {
  try {
    const parsed = ipaddr.parse(address);
    if (
      parsed.kind() === "ipv6" &&
      (parsed as ipaddr.IPv6).isIPv4MappedAddress()
    ) {
      return (parsed as ipaddr.IPv6).toIPv4Address().range() === "unicast";
    }
    return parsed.range() === "unicast";
  } catch {
    return false;
  }
}

function uniqueAddresses(addresses: ResolvedAddress[]): ResolvedAddress[] {
  const seen = new Set<string>();
  return addresses.filter(({ address }) => {
    const canonical = ipaddr.process(address).toString();
    if (seen.has(canonical)) return false;
    seen.add(canonical);
    return true;
  });
}

export async function resolvePublicAddresses(
  hostname: string,
  resolver: DnsResolver = systemDnsResolver,
): Promise<ResolvedAddress[]> {
  const addresses = uniqueAddresses(await resolver(hostname));
  if (addresses.length === 0) {
    throw new UrlValidationError(
      "DNS_UNRESOLVED",
      "The hostname could not be resolved.",
    );
  }
  if (addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new UrlValidationError(
      "PRIVATE_ADDRESS",
      "The hostname resolves to a private, local, reserved, or otherwise restricted address.",
    );
  }
  return addresses;
}

export async function revalidateAndPinAddress(
  hostname: string,
  resolver: DnsResolver = systemDnsResolver,
): Promise<ResolvedAddress> {
  await resolvePublicAddresses(hostname, resolver);
  const immediatelyRechecked = await resolvePublicAddresses(hostname, resolver);
  const pinned = immediatelyRechecked[0];
  if (!pinned) {
    throw new UrlValidationError(
      "DNS_REBINDING",
      "The destination changed during validation and was not contacted.",
    );
  }
  return pinned;
}
