# Architecture

## Goals

Website Risk Checker is intentionally small and defensive. It:

- describes observable evidence rather than intent;
- makes every provider optional and replaceable;
- minimizes URL disclosure and storage;
- keeps destination checks passive;
- treats unavailable evidence as unknown, never as lower risk;
- remains understandable to student developers.

## Request flow

1. The browser shows privacy and third-party disclosure before submission.
2. `POST /api/analyze` enforces JSON, a small body limit, same-origin policy, and an
   application-level rate limit.
3. The analyzer accepts only `http`/`https`, rejects credentials and nonstandard ports, removes
   query/fragment, and normalizes the hostname.
4. DNS results are checked against private, loopback, link-local, multicast, reserved, and
   special-purpose ranges.
5. Provider lookups call fixed official hosts with the redacted lookup URL.
6. The passive checker re-resolves the destination immediately before connecting, pins the public
   address, performs a bodyless `HEAD`, and validates every redirect in the same way.
7. Provider schemas convert responses to the common `ProviderResult` shape.
8. The scoring engine combines current provider evidence and capped local heuristics.
9. The route returns a no-store JSON response. The browser keeps it only in tab-scoped
   `sessionStorage`.

## Trust boundaries

| Boundary          | Untrusted input                           | Control                                                              |
| ----------------- | ----------------------------------------- | -------------------------------------------------------------------- |
| Browser → API     | URL, headers, JSON                        | Body/type/origin/rate/Zod validation                                 |
| API → DNS         | Hostname and mutable answers              | IP-range allow decision, immediate recheck                           |
| API → destination | URL, redirects, certificate               | Address pinning, manual redirect policy, HEAD only, limits           |
| API → provider    | Redacted URL, third-party response        | Fixed endpoints, server keys, timeout/size/schema limits             |
| API → logs        | Error and event fields                    | Structured allowlist-style events and recursive secret/URL redaction |
| API → browser     | Provider-derived text and normalized data | No raw responses, typed construction, React escaping, no-store       |

## Modules

- `lib/security/url-validation.ts`: parsing, normalization, internal-name rejection, DNS/IP policy.
- `lib/security/passive-checks.ts`: pinned bodyless destination request and redirect handling.
- `lib/security/request.ts`: bounded provider JSON reads and timeout handling.
- `lib/providers/*`: one adapter per provider.
- `lib/providers/index.ts`: adapter construction, short-lived allowed caches, provider queues,
  compliance preflight.
- `lib/analysis/heuristics.ts`: limited, readable local observations.
- `lib/analysis/scoring.ts`: deterministic scoring and cautious wording.
- `lib/analysis/analyze.ts`: dependency-injected orchestration.

## Storage

The initial release has no database because durable scan or correction storage is not necessary.
This reduces privacy, authorization, deletion, breach, and retention risk.

If storage becomes necessary:

1. write and review a data model, purpose, legal basis, retention, deletion, access policy, and
   encryption plan;
2. use Prisma with SQLite only for local development;
3. use a production-capable managed database for deployments;
4. add authorization, migrations, backups, audit logging, and deletion tests;
5. do not store URL query strings, fragments, tokens, or provider secrets;
6. update `PRIVACY.md`, `TERMS.md`, deployment documentation, and the threat model.

## Scaling

In-memory caches and rate limits intentionally fit a single-instance educational deployment. A
multi-instance operator must supply a shared, TTL-capable limiter and provider quota coordinator.
Do not use multiple application instances or keys to evade provider limits.

Destination checks should run in a separate egress-restricted network or service at larger scale.
Application-layer validation remains necessary even with isolation.

## Live/demo separation

Demo mode is not a fallback. `APP_MODE=demo` blocks the live analysis route and permits only built-in
case identifiers. Fixtures use reserved names. Production provider code never imports demo
fixtures, and provider failures never trigger simulated data.
