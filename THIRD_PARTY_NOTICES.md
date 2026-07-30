# Third-Party Notices

This file is an attribution and review aid, not a substitute for the packages' license files or the
providers' current terms.

## Software dependencies

The application uses open-source packages including:

| Project             | Purpose                   | License at review time | Project                                   |
| ------------------- | ------------------------- | ---------------------- | ----------------------------------------- |
| Next.js             | Web framework             | MIT                    | https://nextjs.org/                       |
| React / React DOM   | User interface            | MIT                    | https://react.dev/                        |
| Tailwind CSS        | Styling                   | MIT                    | https://tailwindcss.com/                  |
| Zod                 | Runtime schema validation | MIT                    | https://zod.dev/                          |
| ipaddr.js           | IP address parsing        | MIT                    | https://github.com/whitequark/ipaddr.js   |
| Undici              | Bounded HTTP client       | MIT                    | https://undici.nodejs.org/                |
| Vitest              | Unit/integration tests    | MIT                    | https://vitest.dev/                       |
| Playwright          | End-to-end tests          | Apache-2.0             | https://playwright.dev/                   |
| axe-core Playwright | Accessibility checks      | MPL-2.0                | https://github.com/dequelabs/axe-core-npm |
| ESLint              | Static analysis           | MIT                    | https://eslint.org/                       |
| Prettier            | Formatting                | MIT                    | https://prettier.io/                      |

The lockfile is the exact dependency inventory. Review transitive notices before redistributing a
compiled image. Automated license reports can assist but do not replace review.

## Threat-intelligence providers

Provider data, names, and services are **not** licensed under this repository's MIT License.

### Google Safe Browsing

- Documentation: https://developers.google.com/safe-browsing/reference
- Terms: https://developers.google.com/safe-browsing/terms
- Required match attribution: “Advisory provided by Google” with the applicable advisory link.
- Free API access is noncommercial.

Google attribution is displayed only on the Google-derived provider result, not on warnings derived
from other sources.

### URLhaus

- Community API: https://urlhaus.abuse.ch/api/
- Operated by abuse.ch and Spamhaus.
- Community access is subject to fair-use principles; commercial or for-profit use may require an
  enhanced commercial API.
- Coverage is malware-distribution URLs, not every scam type.

### PhishTank

- API: https://phishtank.org/api_info.php
- Terms: https://phishtank.org/terms.php
- Operated by Cisco Talos.
- Official terms state that API data is available for commercial use without charge at the review
  date; rate limits still apply.
- PhishTank data is provided without an accuracy warranty.

### LevelBlue Labs Open Threat Exchange (OTX)

- API: https://otx.alienvault.com/api
- EULA: https://www.levelblue.com/legal/otx-eula-terms
- Free to end users for noncommercial use at the review date.
- Community pulse data can contain third-party material and remains subject to OTX terms.

### VirusTotal

- Public API: https://docs.virustotal.com/reference/public-vs-premium-api
- Getting started: https://docs.virustotal.com/reference/getting-started
- Public API use is noncommercial and subject to strict quotas.
- Do not attribute partner-engine intelligence individually without permission.
- This project does not redistribute raw reports, upload files, or submit URLs for new analysis.

## Standards and policy text

- `CODE_OF_CONDUCT.md` is adapted from Contributor Covenant 2.1.
- Changelog structure follows Keep a Changelog 1.1.0.
- Security address classifications are informed by IETF special-purpose address registries and the
  `ipaddr.js` implementation.

## Maintainer action

Before each release:

1. inspect the lockfile for added or changed licenses;
2. review provider terms and attribution;
3. update `config/provider-compliance.json`;
4. confirm that screenshots and fixtures contain no third-party confidential data;
5. record material changes in `CHANGELOG.md`.
