# Threat Model

## Protected assets

- provider API keys and operator contacts;
- internal network services and cloud metadata;
- user privacy, especially query parameters, fragments, tokens, and private links;
- website-owner reputation and correction privacy;
- provider quotas and service availability;
- result integrity and cautious wording;
- maintainer and contributor trust.

## Primary threats

### SSRF and DNS rebinding

An attacker may submit textual IP forms, an internationalized name, a name that resolves to an
internal address, or a public address that changes before connection. A redirect may point to
localhost, metadata, or another internal target.

Controls:

- trusted WHATWG URL parser;
- scheme/credential/port/internal-name rejection;
- `ipaddr.js` canonical address processing;
- public-unicast-only policy for every resolved IPv4/IPv6 address;
- resolution followed by immediate re-resolution;
- pinned DNS lookup in the HTTP dispatcher;
- manual, bounded redirects with full revalidation;
- direct IP pinning for TLS with original hostname as SNI;
- no user URL in a shell command;
- recommendation for infrastructure egress isolation.

Residual risk:

- address registries and DNS behavior evolve;
- network proxies can change connection behavior;
- platform-specific resolver and IPv4-mapped IPv6 edge cases require ongoing tests;
- application-only controls cannot guarantee complete isolation.

### Parser inconsistency and encoded addresses

WHATWG normalization can turn decimal, hexadecimal, octal, mixed, or IPv4-mapped input into an
address different from its visible text. Tests cover these forms and validate the normalized
hostname, not the raw string.

### Malicious redirects and oversized content

Destination redirects are never automatic. The checker follows at most the configured count,
detects loops, uses `HEAD`, discards bodies, and has connection/total time limits. Provider JSON
responses have a declared and measured size cap.

### Provider compromise or malformed responses

Every provider response is schema-validated. Unexpected JSON, HTTP errors, timeouts, quota
responses, and invalid credentials produce normalized score-neutral statuses. Raw payloads are
never rendered.

### Secret exposure

Keys are server-only environment variables, are not returned, are recursively redacted by logging
helpers, and are represented only by placeholders. Forked CI receives no secrets. Google requires a
key in its query string, so request URLs must never be logged.

### Abuse and quota exhaustion

Application requests are rate-limited using HMAC keys. Per-provider process counters track outbound
lookups. Provider queues pace calls, including the VirusTotal public four-per-minute limit, and
stop its queue at the documented 500-request daily limit. HTTP 429/509 responses stop work and add
zero points. Timeouts, network failures, and HTTP 5xx responses use a small, bounded exponential
backoff; quota responses are never retried immediately.

Single-instance counters are insufficient across replicas. Production must use shared storage and
must not rotate keys/accounts to increase free quotas.

### Privacy leakage

Query strings and fragments are removed before provider disclosure. Credential-bearing URLs are
rejected. There is no server scan history, public profile, comment, or accusation board. Results
stay in session storage, and correction content becomes an email draft rather than an application
record.

Hosting proxies can log requests independently; operators must configure and verify them.

### False accusation and misleading certainty

Provider matches are phrased as observations with freshness and attribution. No-match responses do
not imply safety. Weak heuristics are capped. OTX counts cannot create maximum risk. Every result
includes the required disclaimer and private correction path.

### Cross-site request and script injection

POST routes enforce same-origin when an `Origin` header exists and accept bounded JSON. React
escapes displayed strings. A CSP restricts resources, frames, forms, media, and connections.

The Next.js runtime requires inline bootstrap scripts, so the static CSP currently permits
`'unsafe-inline'` scripts. A nonce-based CSP is a recommended hardening item. No third-party scripts
are included.

## Explicitly out of scope

- vulnerability scanning, port scanning, directory discovery, authentication testing, or exploits;
- fetching or executing page scripts;
- form submission, cookies, browser automation, or credential collection;
- content-based scam accusations;
- file, executable, or malware download;
- public reports, profiles, comments, or scan histories;
- new URL submission to providers;
- proof of identity, guilt, legality, safety, or trustworthiness.

## Verification cadence

Run the automated security tests for every pull request. Re-evaluate special-purpose IP handling,
Node/Undici behavior, provider endpoints, hosting proxies, CSP, egress policy, and data retention
before each release and after platform changes.
