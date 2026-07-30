# Deployment Guide

Website Risk Checker requires a server-capable platform for live mode. GitHub Pages cannot safely
host live provider keys or Next.js route handlers. GitHub is the source host; deploy the application
as a Node.js service or container.

## 1. Legal and provider gate

Before provisioning:

- obtain attorney review of `TERMS.md`, `PRIVACY.md`, and `DISCLAIMER.md`;
- supply the operator identity, contacts, jurisdiction, and effective dates;
- review every official provider term and privacy page;
- confirm each enabled provider remains free for the exact use;
- confirm `PROJECT_USE_MODE` is truthful;
- obtain any written permission needed for sponsorship, advertising, or revenue;
- disable any provider whose permission, quota, attribution, or caching terms are unclear;
- update `config/provider-compliance.json`.

## 2. Build

Node deployment:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm check
pnpm build
NODE_ENV=production pnpm start
```

Container deployment:

```bash
docker build --pull -t website-risk-checker:1.0.0 .
docker run --read-only --cap-drop=ALL --security-opt=no-new-privileges \
  --env-file .env -p 3000:3000 website-risk-checker:1.0.0
```

Never bake `.env` or secrets into the image.

## 3. Production environment

Set:

- `APP_MODE=live`
- `PROJECT_USE_MODE=noncommercial` unless every provider is authorized otherwise
- exact HTTPS `APP_BASE_URL`
- a random 32+ character `RATE_LIMIT_HASH_SECRET`
- explicit provider enable flags and keys
- `STRICT_PROVIDER_TERMS=true`
- conservative application, provider, connection, redirect, and response limits
- private correction, privacy, and security contacts

Use the platform secret manager. Restrict and rotate keys where supported. Never prefix a secret
with `NEXT_PUBLIC_`.

## 4. Network isolation

Recommended design:

- run destination checks in a dedicated service or network segment;
- deny access to RFC 1918, loopback, link-local, carrier-grade NAT, special-purpose, and cloud
  metadata networks at the network layer;
- permit provider egress only to documented official hosts;
- use a DNS resolver whose behavior is understood and monitored;
- prevent the outbound service from reaching the app, database, admin panels, orchestrator, or
  service mesh control plane;
- preserve application-level DNS and redirect validation.

Do not configure a forward proxy that silently bypasses destination address pinning without a new
security review.

## 5. Proxy and rate limits

Terminate HTTPS at a trusted reverse proxy. Set `TRUST_PROXY=true` only if:

1. direct access to the app is blocked;
2. the proxy overwrites, rather than appends untrusted, client-IP headers;
3. the operator knows which header and hop identify the client.

The built-in limiter is per process. Multi-instance production requires a shared limiter with short
TTL keys. Provider quotas also need shared coordination. Never scale replicas or keys to evade a
free quota.

## 6. Logging and retention

- disable request-body and full-URL access logs;
- redact query strings, fragments, authorization, cookies, and secret-like fields;
- restrict staff access;
- select a short documented retention period;
- confirm error-reporting tools do not capture bodies, environment variables, or provider request
  URLs;
- update `PRIVACY.md` with actual platform behavior.

The initial app stores no scan records. If a platform persists traffic data, disclose it.

## 7. Smoke tests

Using only reserved/local fixtures:

- demo banner appears and live API is blocked in demo mode;
- live mode rejects localhost, internal names, private IPv4/IPv6, decimal/hex IP forms, credentials,
  and ports;
- redirect-to-private and redirect loops fail safely;
- provider missing-key, invalid-key, 429, timeout, malformed, and stale responses add zero points;
- queries/fragments do not appear in result, cache key, logs, errors, screenshots, or provider mock;
- secrets do not appear in client bundles;
- correction email stays private;
- accessibility checks pass at phone, tablet, and desktop viewports;
- health check reports no secret or provider detail.

Run E2E against the production image in demo mode before live keys are added.

## 8. GitHub controls

- protect `main`;
- require CI, CodeQL, and dependency-review checks;
- require review and conversation resolution;
- enable private vulnerability reporting;
- enable secret scanning and push protection where available;
- enable Dependabot;
- prevent production environments from running on untrusted forks;
- restrict workflow permissions to read by default.

## 9. Ongoing operation

- monitor quota and provider error status without logging URLs;
- re-review provider terms at least every 90 days;
- patch dependencies and base images;
- rotate keys;
- test recovery and correction handling;
- disable a provider immediately when eligibility or security is uncertain;
- update legal and privacy documents when the deployment changes;
- avoid monetization until permissions are reviewed.

No deployment design, provider review, disclaimer, license, or legal document can guarantee zero
liability.
