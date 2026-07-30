import type { Metadata } from "next";

import { ArticleShell } from "@/components/article-shell";

export const metadata: Metadata = { title: "Terms of use" };

export default function TermsPage(): React.ReactElement {
  return (
    <ArticleShell
      eyebrow="Draft for attorney review"
      title="Terms of use"
      intro="Use this educational service carefully and never treat an automated result as a final verdict."
    >
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
        These terms are a project draft, not completed legal advice. Governing
        law, dispute resolution, indemnification, operator identity, contacts,
        and effective date require attorney review and operator-supplied
        information.
      </p>
      <section>
        <h2>Educational purpose and eligibility</h2>
        <p>
          The service reports limited observable indicators for general
          education. Users under the age required to consent where they live
          should use the service with a parent or guardian.
        </p>
      </section>
      <section>
        <h2>Acceptable use</h2>
        <p>You must not use the service to:</p>
        <ul>
          <li>
            break the law, harass, threaten, defame, or make unsupported
            accusations;
          </li>
          <li>
            submit confidential, private, authenticated, or
            personal-information-bearing URLs;
          </li>
          <li>
            automate abusive traffic, evade limits, test credentials, or scan
            vulnerabilities;
          </li>
          <li>
            bypass provider rules, API keys, quotas, account limits, or
            third-party licenses.
          </li>
        </ul>
      </section>
      <section>
        <h2>No accuracy or availability guarantee</h2>
        <p>
          Results and third-party data may be incomplete, delayed, incorrect, or
          unavailable. A no-match response is not proof of safety, and a match
          does not prove intent, ownership, guilt, fraud, illegality, or
          malicious conduct.
        </p>
      </section>
      <section>
        <h2>Third-party services and open-source code</h2>
        <p>
          Provider use is also governed by each provider’s current terms. The
          MIT License applies to source code; it does not replace these website
          terms, privacy disclosures, provider terms, data licenses, responsible
          operation, security safeguards, or attorney review.
        </p>
      </section>
      <section>
        <h2>Correction process</h2>
        <p>
          Use the private correction page to request review. A request does not
          guarantee a score change. Do not publish disputes or confidential
          details in GitHub issues.
        </p>
      </section>
      <section>
        <h2>Legal sections requiring attorney review</h2>
        <p>
          Warranty disclaimer, limitation of liability, indemnification,
          governing law, dispute resolution, service suspension,
          intellectual-property ownership, and contact provisions appear in the
          repository’s full TERMS.md and must be reviewed before public launch.
        </p>
      </section>
    </ArticleShell>
  );
}
