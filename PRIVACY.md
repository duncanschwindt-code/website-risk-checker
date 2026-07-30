# Privacy Policy

> **Technical starting point—attorney review required.** This policy must be reviewed for the laws
> that apply to the project's operator, users, deployment, and providers. It does not claim
> compliance with every privacy law.

Effective date: `[OPERATOR TO SUPPLY]`  
Operator: `[OPERATOR LEGAL NAME]`  
Privacy contact: `[PRIVATE PRIVACY EMAIL]`

## Plain-language summary

Website Risk Checker is designed to work without accounts or permanent scan storage. It removes URL
query strings and fragments early, does not create a public history, and does not use advertising
trackers. A redacted URL may be sent to each threat-intelligence provider that the operator has
enabled.

Do not submit confidential or personal links.

## Information submitted

The application temporarily processes the website address entered by a user. Before provider
lookup, display, cache, analytics, error reporting, or structured operational logging, it:

- rejects embedded usernames and passwords;
- removes the fragment;
- removes the entire query string, whether or not a sensitive parameter name is recognized;
- normalizes the hostname and protocol;
- rejects local, private, reserved, link-local, loopback, multicast, internal, metadata, and
  unsupported destinations.

Do not submit password-reset links, session URLs, private documents, invitations, account links,
addresses containing tokens, personal information, or other confidential resources.

## Information processed automatically

The service may process:

- a normalized hostname and redacted URL;
- timestamps and a random result reference;
- passive connection metadata such as redirects, HTTPS observation, and certificate dates;
- normalized provider status, categories, timestamps, and limited counts;
- a privacy-preserving short-lived application rate-limit key;
- minimal operational events needed for reliability and security.

The default logging functions redact secret-like fields and URL queries. Operators must confirm
their hosting platform, reverse proxy, firewall, and observability tools do the same.

## Third-party disclosures

Before a check, the home page lists providers that are enabled and configured. A redacted lookup URL
may be sent to:

- [Google Safe Browsing](https://developers.google.com/safe-browsing/terms);
- [URLhaus](https://urlhaus.abuse.ch/api/);
- [PhishTank](https://phishtank.org/terms.php);
- [LevelBlue Labs OTX](https://www.levelblue.com/legal/otx-eula-terms);
- [VirusTotal](https://docs.virustotal.com/reference/getting-started).

Each provider controls its own retention, sharing, account, security, and legal practices. Some
providers state that submitted content or URLs may be retained, used, or shared. This project uses
lookup endpoints only and does not submit an unknown URL for a new scan, upload files, or request a
URL rescan.

Operators must update this section if provider behavior changes.

## Storage and retention

Default first-release behavior:

- submitted URLs and scan results are **not persisted** in a database;
- the result is written to tab-scoped browser `sessionStorage` and disappears when cleared or the
  browser removes the tab session;
- provider result caches exist only in application memory, use a one-way hash as the key, and expire
  when the provider-authorized lifetime ends;
- providers whose caching permission has not been confirmed are not cached;
- application rate-limit keys use an HMAC and expire at the end of the configured window;
- correction forms are not stored by the application; the browser prepares an email draft for the
  user to review and send.

Provider-side retention is controlled by provider terms, not this application. Hosting-platform
logs may have separate retention configured by the operator; the operator must document the actual
period here before launch: `[HOST LOG RETENTION]`.

## Cookies, local storage, and analytics

The application does not require accounts and does not set advertising or behavioral cookies. It
uses tab-scoped session storage for the last result. No third-party analytics is included by
default.

An operator who adds cookies, analytics, monitoring identifiers, personalization, or advertising
must complete a separate privacy and legal review, update this policy, and add any required consent
controls before enabling them.

## Security monitoring and logs

Short-term security processing may be necessary to rate-limit abuse, investigate availability, or
respond to an attack. Raw IP addresses should not be retained unless strictly necessary and
lawfully approved. Access to logs must be restricted. API keys, full URLs, queries, fragments, and
correction content must not appear in logs.

See `SECURITY.md` for safeguards and reporting.

## Children’s privacy

The service may be useful to teenagers but does not knowingly collect personal information from
children under 13. It does not ask for names, birthdays, schools, addresses, locations, public
profiles, contact uploads, direct messages, or social-network connections.

Children should not place personal information in a URL or correction request. A parent or guardian
can contact `[PRIVATE PRIVACY EMAIL]` with a privacy inquiry.

## Correction requests

The private correction page can generate a reference and email draft for a website owner or
authorized representative. The user chooses whether to send the email. Once sent, the operator's
mail provider processes the correction content under its own policy. The operator must state the
actual correction-mail retention before launch: `[CORRECTION RETENTION]`.

Do not provide government identification unless an attorney-reviewed process later requires it.
The initial workflow does not request it.

## Access, deletion, and choices

Because the application does not persist scans, it normally has no scan record to access or delete.
Users can clear the device-only result from the results page. For provider-side data, users may need
to contact the provider. For operator logs or sent correction mail, contact `[PRIVATE PRIVACY
EMAIL]`.

The operator will evaluate requests under applicable law and cannot promise a particular outcome
before verifying the request and the laws involved.

## Changes

Material policy changes should be recorded in `CHANGELOG.md`, dated here, and presented before
continued use where required. Provider terms should be reviewed at least every 90 days.

## Contacts

- Privacy: `[PRIVATE PRIVACY EMAIL]`
- Corrections: `[PRIVATE CORRECTION EMAIL]`
- Security: `[PRIVATE SECURITY EMAIL]`
- Legal: `[LEGAL CONTACT]`

Replace every placeholder before public launch.
