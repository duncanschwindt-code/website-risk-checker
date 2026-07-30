# Provider Review Procedure

Perform this review before enabling a provider and at least every 90 days.

## Evidence

Use only the provider's official documentation, terms, privacy statement, data license, account
console, and written provider correspondence. Do not use blogs or tutorials to establish
permission.

Record:

- availability and API version;
- free-key/free-access path and whether a credit card or paid trial is required;
- eligible nonprofit, educational, public, noncommercial, and commercial uses;
- minute, hour, daily, and monthly limits;
- attribution;
- caching, retention, download, redistribution, and derived-data restrictions;
- whether lookups or submissions become public;
- whether URLs may be retained, used, or shared;
- whether permission depends on contributing files or URLs;
- last review, next review, and reviewer notes.

## Decision

- **Confirmed:** update the compliance file, tests, and README.
- **Unclear:** keep disabled and seek written clarification.
- **No longer eligible:** disable immediately; never silently switch to a paid provider.
- **Commercial transition:** disable every restricted adapter until appropriate permission or plan
  is obtained.

Do not create extra accounts, rotate free keys, split traffic, cache contrary to terms, or use stale
data to evade limits.

## Adapter review

Verify:

- fixed official endpoint and server-only authentication;
- lookup-only behavior;
- no file upload or new URL submission;
- Zod schema for success and malformed response;
- explicit 401/403, 404, 429/509, 5xx, timeout, and oversized-response handling;
- score-neutral unavailable/error behavior;
- current timestamp, source timestamp, freshness, cache expiration, attribution, and privacy flags;
- mocked fixtures only.

Record material changes in `CHANGELOG.md`.
