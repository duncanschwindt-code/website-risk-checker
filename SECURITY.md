# Security Policy

## Supported versions

Security updates are provided for the latest release on the `main` branch. Maintainers should not
represent an older deployment as supported unless they are actively backporting fixes.

## Report a vulnerability privately

Do **not** open a public issue for a suspected vulnerability, secret, bypass, private URL, provider
credential, or exploitable finding.

Use GitHub private vulnerability reporting when enabled, or contact:

- Security email: `[PRIVATE SECURITY EMAIL]`
- Encryption key / secure channel: `[OPERATOR TO SUPPLY]`

Include:

- affected version or commit;
- clear reproduction steps using reserved or locally controlled test targets;
- expected and observed behavior;
- impact and preconditions;
- suggested remediation, if known.

Do not test against systems you do not own or have explicit permission to test. Do not send malware,
credentials, private documents, personal information, active exploit URLs, or destructive payloads.

The operator should acknowledge a report within `[ATTORNEY/OPERATOR REVIEWED PERIOD]`. This is a
target, not a guaranteed response or remediation deadline.

## Security design

The application includes:

- strict Zod validation for user input, API bodies, and provider responses;
- `http`/`https` allowlisting and rejection of embedded credentials and nonstandard ports;
- IPv4 and IPv6 private, loopback, link-local, multicast, reserved, and internal-name rejection;
- DNS validation, immediate DNS recheck, address pinning, and per-redirect revalidation;
- limited redirects, connection timeouts, total timeouts, and response-size limits;
- no user-input shell execution, browser automation, script execution, file download, or form
  submission;
- application rate limiting and provider request queues;
- same-origin checks on POST routes;
- CSP, HSTS, frame denial, content-type protection, restricted permissions, and no-referrer policy;
- React output encoding and no raw API-response rendering;
- server-only environment credentials with structured log redaction;
- no persistent scan history and no public correction board;
- fail-neutral behavior for provider errors and quota exhaustion.

Security decisions and residual risks are documented in `docs/THREAT_MODEL.md`.

## Deployment responsibilities

Before launch, operators must:

1. deploy behind HTTPS with a trusted reverse proxy;
2. set `APP_BASE_URL` to the exact public origin;
3. set `TRUST_PROXY=true` only after configuring which proxy supplies client IP headers;
4. replace the rate-limit HMAC secret and use a shared limiter for multiple instances;
5. restrict outbound network access to approved provider hosts and public destination addresses
   where infrastructure permits;
6. isolate destination checks from internal services and cloud metadata networks;
7. store provider keys in a secret manager and rotate them after suspected exposure;
8. verify platform logs and error tools redact URLs, queries, headers, cookies, and secrets;
9. enable GitHub secret scanning, push protection, Dependabot, CodeQL, branch protection, and
   dependency review;
10. run SSRF and DNS-rebinding tests in the actual hosting network.

SSRF defenses are layered but no application-only control can guarantee perfect isolation. Network
egress policy and infrastructure separation are strongly recommended.

## Secret handling

- Never name a credential with `NEXT_PUBLIC_`.
- Never return, log, screenshot, commit, or include a real key in test fixtures.
- Restrict keys by API, origin, IP, or quota where the provider supports it.
- Rotate a key without code changes by updating the environment secret and restarting instances.
- Treat a leaked key as compromised; revoke and replace it.
- Do not place provider authentication in a query unless the official API requires it. Google Safe
  Browsing requires its key parameter; the request URL must never be logged.

Recommended local pre-commit checks include `gitleaks` or `detect-secrets`. CI also runs a
repository secret scan. No scanner is complete; contributors remain responsible for review.

## Dependency and container response

Run `pnpm audit`, review Dependabot alerts, rebuild the container from patched base images, and
avoid dismissing advisories without a documented risk decision. Never expose production secrets to
pull requests from forks.

## Disclosure

Coordinate publication with the maintainer after users have a reasonable opportunity to update.
The project may credit reporters with consent. Do not publish private correction content, user
identifiers, or provider credentials in an advisory.
