# Pre-Launch Checklist

## Operator and legal

- [ ] Operator legal name, contacts, effective dates, and deployment URL are supplied.
- [ ] Attorney reviewed `TERMS.md`, `PRIVACY.md`, `DISCLAIMER.md`, children/privacy issues,
      limitation language, governing law, dispute process, and indemnification.
- [ ] Public site wording does not claim safety, guilt, intent, legality, fraud, or criminal conduct.
- [ ] Private correction process is staffed, tested, and not routed through public issues.
- [ ] Retention and deletion disclosures match the actual host and mail provider.
- [ ] Maintainers acknowledge that no design or document guarantees zero liability.

## Providers

- [ ] Every enabled provider remains available and genuinely free for this use.
- [ ] No provider requires a credit card, paid trial, enterprise access, or premium plan.
- [ ] `PROJECT_USE_MODE` is accurate.
- [ ] Commercial, sponsorship, donation, advertising, and revenue implications were reviewed.
- [ ] Current quotas and rate-limit headers are configured.
- [ ] Caching, retention, redistribution, data-license, and attribution terms were reviewed.
- [ ] URL disclosure and public-submission behavior are disclosed.
- [ ] Unknown-URL submission and file upload remain disabled.
- [ ] `config/provider-compliance.json` has current review and next-review dates.
- [ ] Restricted or uncertain providers are disabled.

## Security

- [ ] Production HTTPS and exact `APP_BASE_URL` are configured.
- [ ] Provider keys and the rate-limit HMAC secret are in a secret manager.
- [ ] Keys are restricted where possible and absent from browser bundles, logs, errors, and images.
- [ ] Trusted-proxy settings were validated.
- [ ] Multi-instance rate limiting and provider quota coordination use shared storage.
- [ ] Egress isolation blocks internal services and cloud metadata.
- [ ] IPv4/IPv6, encoded IP, DNS rebinding, redirect, timeout, and size tests pass in the host.
- [ ] CSP and security headers are present.
- [ ] Dependency audit, CodeQL, secret scan, container scan, and base-image review are complete.
- [ ] Private vulnerability reporting and security contact work.

## Privacy

- [ ] Query strings and fragments are removed before every disclosure and log.
- [ ] No accounts, trackers, advertising, public profiles, or public scan history were added.
- [ ] Platform logs are minimized and have a short documented retention period.
- [ ] Results remain device-local and scan storage is disabled.
- [ ] Provider disclosure list accurately reflects enabled adapters.
- [ ] Correction forms are private and government identification is not requested.
- [ ] Child-facing language and data-minimization choices were reviewed.

## Product and accessibility

- [ ] Phone, tablet, desktop, keyboard-only, screen-reader, and reduced-motion behavior were tested.
- [ ] Form errors are announced and focus remains visible.
- [ ] Score is not communicated by color alone.
- [ ] Every result shows score caveat, confidence, evidence, freshness, provider status, limitations,
      next steps, correction link, and full short disclaimer.
- [ ] Demo mode is labeled on every page and never accepts arbitrary URLs.
- [ ] Live mode never falls back to mocked results.

## Release

- [ ] `pnpm format:check`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test:unit`
- [ ] `pnpm test:integration`
- [ ] `pnpm build`
- [ ] `pnpm test:e2e`
- [ ] `pnpm audit`
- [ ] Docker build and health check
- [ ] Branch protection, dependency review, CodeQL, Dependabot, and secret scanning
- [ ] `CHANGELOG.md`, provider notices, screenshots, roadmap, and version updated
