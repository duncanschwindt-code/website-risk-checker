import type { Metadata } from "next";

import { ArticleShell } from "@/components/article-shell";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage(): React.ReactElement {
  return (
    <ArticleShell
      eyebrow="Plain-language policy"
      title="Privacy"
      intro="This release minimizes collection: there are no accounts, public profiles, advertising trackers, or public scan histories."
    >
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
        This policy is a technical starting point and must be reviewed for the
        laws that apply to the project’s operator and users. Effective date:
        [OPERATOR TO SUPPLY].
      </p>

      <section>
        <h2>What is processed</h2>
        <p>
          The server temporarily processes the website address you submit, basic
          request metadata needed to rate-limit abuse, and provider responses.
          Query strings and fragments are removed before logging, caching,
          display, or provider lookup. Links with embedded credentials are
          rejected.
        </p>
      </section>
      <section>
        <h2>Provider disclosure</h2>
        <p>
          A redacted URL may be sent to each provider that the operator has
          explicitly enabled and configured. The home page lists those providers
          before submission. Providers may retain or share lookups under their
          own terms. This project never submits an unknown URL for a new public
          scan.
        </p>
      </section>
      <section>
        <h2>Storage and retention</h2>
        <ul>
          <li>
            Scan results and submitted URLs are not persisted by this release.
          </li>
          <li>
            The result is stored only in the current browser tab using session
            storage.
          </li>
          <li>
            In-memory provider cache keys use one-way URL hashes and expire
            automatically.
          </li>
          <li>
            Short-lived rate-limit keys use an HMAC rather than retaining a raw
            IP address.
          </li>
          <li>
            Operational logs must not include full URLs, query strings,
            fragments, or API keys.
          </li>
        </ul>
      </section>
      <section>
        <h2>Cookies, analytics, and advertising</h2>
        <p>
          The application sets no advertising or behavioral-tracking cookies and
          includes no third-party analytics by default. Operators must update
          this policy before adding any cookies or analytics.
        </p>
      </section>
      <section>
        <h2>Children’s privacy</h2>
        <p>
          The service does not knowingly collect names, birthdays, school
          details, locations, contact lists, or other personal information from
          children under 13. Do not place personal information in a submitted
          URL or correction explanation.
        </p>
      </section>
      <section>
        <h2>Deletion, corrections, and security</h2>
        <p>
          Because scans are not persisted, the application normally has no scan
          record to delete. Use the private correction process for
          provider-result disputes, a fresh check, or a deletion inquiry.
          Privacy contact: [OPERATOR TO SUPPLY]. Security contact: [OPERATOR TO
          SUPPLY].
        </p>
      </section>
    </ArticleShell>
  );
}
