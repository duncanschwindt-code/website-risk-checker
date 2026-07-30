# Contributing

Thank you for helping Teens Against Scams build careful, educational tools. Contributions must
protect users, website owners, providers, and maintainers from unsupported accusations, privacy
harm, security risk, and misleading conclusions.

By contributing, you confirm that your work is yours or is properly licensed for this repository
and that you have the right to submit it.

## Before opening a change

1. Search existing issues and pull requests.
2. Use an issue template for bugs, features, documentation, or provider proposals.
3. Discuss large architecture, scoring, network, data-retention, legal-text, or provider changes
   before implementation.
4. Report vulnerabilities privately under `SECURITY.md`.
5. Never use a public issue to dispute a website result; use the private correction process.

## Local development

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
APP_MODE=demo pnpm dev
```

Before submitting:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Do not use real provider keys in tests or CI.

## Safety rules

Contributors must:

- avoid unsupported accusations and intent claims;
- never add an individual website to a blacklist merely because it seems suspicious;
- never commit active malicious, phishing, scam, malware, exploit, credential, or private URLs;
- use reserved `example.com`, `.test`, `.invalid`, and `.example` names or local test resolvers;
- use mocked provider responses and local fixtures;
- avoid publishing personal information;
- preserve query/fragment redaction and server-only secret handling;
- respect third-party licenses, attribution, rate limits, retention, redistribution, caching, and
  commercial-use restrictions;
- document every new provider's official documentation and terms review;
- explain false-positive and bias risks;
- add tests for scoring, schema, privacy, and network changes;
- ensure new network requests are protected against SSRF and DNS rebinding;
- keep provider unavailability and errors score-neutral;
- use cautious wording that describes evidence rather than guilt, intent, legality, or safety.

Pull requests that publish an accusation board, unmoderated report, individual blacklist, secret
scoring model, user-provided score signal, vulnerability scanner, or new-URL submission feature
will not be accepted for the initial release.

## Provider contributions

A provider proposal must include:

- official documentation and terms URLs;
- review date and next review date;
- whether free access truly exists without a paid trial;
- key requirements and current quotas;
- commercial/noncommercial eligibility;
- attribution;
- caching, retention, redistribution, and data-license restrictions;
- URL disclosure and public-submission behavior;
- normalized schema and malformed-response handling;
- 401/403, 429/quota, timeout, stale, and no-key tests;
- false-positive considerations.

If any permission is unclear, keep the adapter disabled and document the uncertainty. Never work
around authentication or quota controls.

## Scoring changes

Update `config/scoring-rules.json`, `SCORING.md`, tests, and `CHANGELOG.md`. Bump the methodology
version. Explain:

- evidence required;
- maximum contribution;
- freshness and expiration;
- why the weight is proportionate;
- false-positive and provider-overlap risk;
- why weak heuristics cannot overwhelm stronger evidence;
- potential language, geography, popularity, small-site, and new-site bias.

## Code style

- Use strict TypeScript, small modules, dependency injection, Zod schemas, and defensive error
  handling.
- Keep security-sensitive comments focused on why the control exists.
- Never pass a submitted URL to a shell command.
- Never render raw provider responses.
- Keep user-facing language understandable to a student developer and teenager.
- Preserve keyboard access, visible focus, semantic headings, and reduced-motion behavior.

## Commit and pull-request guidance

Use clear, focused commits. Fill every applicable pull-request checkbox. The maintainer may request
security, privacy, provider, legal, accessibility, or false-positive review before merging.

All continuous-integration checks must pass without real keys. Forked pull requests do not receive
repository secrets.

## License

Unless stated otherwise, contributions are accepted under the MIT License. Do not submit code,
fixtures, screenshots, provider data, or documentation that cannot be distributed under the
applicable license. Provider data is not relicensed under MIT.
