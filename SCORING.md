# Transparent Scoring Methodology

Current methodology version: **1.0.0**

Website Risk Checker reports observable evidence. The numerical score is an educational summary,
not a probability, certification, accusation, legal conclusion, or guarantee.

## Categories

| Score  | Category                  | Required wording                                                                                                              |
| ------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 0–24   | Lower observed risk       | No major warning indicators were found through the available checks. This does not guarantee that the website is trustworthy. |
| 25–49  | Some caution recommended  | Some warning indicators were observed. Pause and independently verify the website.                                            |
| 50–74  | Elevated observed risk    | Multiple warning indicators were detected. Avoid entering personal information or sending money until independently verified. |
| 75–100 | Strong warning indicators | Multiple strong or corroborated indicators were detected; the result still does not prove intent or wrongdoing.               |

Every result states:

> This score reflects limited automated signals available at the time of the check. It is not proof
> that a website is safe, unsafe, legitimate, fraudulent, or illegal.

## Safety properties

- Missing API keys, errors, timeouts, invalid responses, rate limits, and unavailable providers add
  and remove **zero** points.
- No-match responses remove **zero** points and are never proof of safety.
- All weak local heuristics together are capped at **24 points**.
- Domain age is not scored in version 1.0.0 because a dependable, privacy-reviewed RDAP integration
  is not enabled.
- HTTPS never subtracts risk points or implies safety.
- A new, small, unpopular, foreign, multilingual, individual-run, or inexpensively hosted website
  is not penalized merely for that characteristic.
- No protected characteristic, demographic assumption, secret model, or unexplained machine
  learning is used.
- Stale provider findings are displayed but add zero points.

## Rules

The source of truth is [`config/scoring-rules.json`](config/scoring-rules.json). Every rule contains
an ID, name, weight, maximum contribution, evidence requirements, confidence, explanation,
false-positive considerations, expiration period, and version.

### Strong provider rules

| Rule                           |     Points | Evidence                                                                                                                                                                              |
| ------------------------------ | ---------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TI_CONFIRMED_RECENT_HIGH`     | 60 maximum | One current direct match from Google Safe Browsing, URLhaus, or a verified and valid PhishTank entry. Only one 60-point contribution is applied even if several such providers match. |
| `TI_VIRUSTOTAL_CONSENSUS`      |         45 | Existing, recent VirusTotal report with at least three malicious or suspicious engine results. No URL is submitted for analysis.                                                      |
| `TI_INDEPENDENT_CORROBORATION` |         20 | Two or more independently operated providers return current `MATCH` results.                                                                                                          |

Two providers may use overlapping upstream intelligence, so corroboration raises confidence without
proving independent factual verification.

### Moderate community rule

| Rule                   | Points | Evidence                                                |
| ---------------------- | -----: | ------------------------------------------------------- |
| `TI_OTX_RECENT_PULSES` |     22 | At least one relevant OTX pulse updated within 90 days. |

Pulse count alone cannot create the maximum score. OTX community context can be broad, duplicated,
or incorrect.

### Weak local rules

| Rule                           | Points before combined cap | Explanation                                                       |
| ------------------------------ | -------------------------: | ----------------------------------------------------------------- |
| `LOCAL_HTTP_ONLY`              |                          8 | No HTTPS observed during the limited check.                       |
| `LOCAL_IP_HOST`                |                         12 | A validated public IP appears as the host.                        |
| `LOCAL_PUNYCODE`               |                          6 | Internationalized punycode label observed.                        |
| `LOCAL_MIXED_SCRIPT`           |                         10 | Multiple writing systems observed in a decoded hostname.          |
| `LOCAL_EXCESSIVE_SUBDOMAINS`   |                          5 | More than five total hostname labels.                             |
| `LOCAL_LONG_URL`               |                          3 | Redacted URL exceeds 160 characters.                              |
| `LOCAL_LONG_DOMAIN`            |                          3 | Hostname exceeds 50 characters.                                   |
| `LOCAL_SHORTENER`              |                          4 | Host matches the small published local shortener set.             |
| `LOCAL_SUSPICIOUS_AT`          |                          6 | An at-sign appears in the path; credentials are rejected earlier. |
| `LOCAL_REDIRECT_DOMAIN_CHANGE` |                          6 | The validated limited redirect chain ends on another hostname.    |
| `LOCAL_TLS_INVALID`            |                         10 | A pinned TLS handshake cannot validate the certificate.           |
| `LOCAL_TLS_EXPIRES_SOON`       |                          3 | Reported expiration is within 14 days.                            |

The scoring engine applies weak indicators in deterministic rule-discovery order until the 24-point
cap is reached. The evidence list shows the actual applied contribution for each item.

## Confidence

Confidence describes available-source coverage, not certainty about a website:

- **High:** at least two current provider matches and at least two providers available.
- **Medium:** at least three providers were available, or one current match with at least two
  providers available.
- **Low:** fewer sources were available.

Where providers disagree, a visible zero-point `PROVIDER_DISAGREEMENT` indicator explains that
coverage, category, timing, and upstream sources differ. A no-match does not cancel a current match.

## Freshness

- Google v5 results obey the returned `cacheDuration`.
- URLhaus individual results use a five-minute application cache.
- PhishTank individual results use a 15-minute application cache.
- OTX and VirusTotal results are not cached until the operator confirms current permission.
- Stale OTX context and VirusTotal analysis older than 90 days do not affect the score.
- Passive network findings are point-in-time observations and are not persisted.

Operators must review provider terms before changing any caching period.

## Changing the methodology

A scoring change requires:

1. a new methodology version;
2. an updated machine-readable rule;
3. unit tests for boundaries, caps, staleness, unavailability, and false-positive behavior;
4. documented evidence requirements and expiration;
5. review for protected-characteristic, geographic, language, popularity, and small-site bias;
6. `SCORING.md`, `README.md`, and `CHANGELOG.md` updates;
7. an explanation in the pull request.

Do not use a user report, contributor suspicion, page wording, or private blacklist as confirmed
evidence.
