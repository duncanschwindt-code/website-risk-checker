## Summary

Describe the user need, implementation, and limits.

## Evidence and false-positive review

Explain test coverage, provider evidence, privacy effects, security boundaries, accessibility, and
how false positives or misleading wording were considered.

## Checklist

- [ ] Tests pass locally.
- [ ] Formatting, linting, type checking, and the production build pass.
- [ ] No secrets or real provider keys are included.
- [ ] No personal information, private URLs, or active malicious URLs are included.
- [ ] No unsupported accusations, guilt claims, intent claims, or individual blacklist entries are
      included.
- [ ] Third-party API/data/license terms were reviewed from official sources.
- [ ] False-positive effects and stale data were considered.
- [ ] Documentation and `CHANGELOG.md` were updated.
- [ ] Scoring changes include tests and a methodology version update.
- [ ] New network requests are protected against SSRF, DNS rebinding, redirects, timeouts, and
      oversized responses.
- [ ] New providers use only permitted free access and never evade authentication, accounts, or
      quotas.
- [ ] Provider errors, missing keys, unavailability, and rate limits remain score-neutral.
- [ ] Accessibility, keyboard use, responsive behavior, and reduced motion were checked.
- [ ] Security-sensitive findings are being disclosed privately rather than in this pull request.
