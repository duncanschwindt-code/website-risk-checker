import type { Metadata } from "next";

import { ArticleShell } from "@/components/article-shell";

export const metadata: Metadata = { title: "Disclaimer" };

export default function DisclaimerPage(): React.ReactElement {
  return (
    <ArticleShell
      eyebrow="Important limitations"
      title="Disclaimer"
      intro="Website Risk Checker offers general educational information—not a safety guarantee or professional opinion."
    >
      <section>
        <h2>No professional advice</h2>
        <p>
          Results are not legal, financial, or professional cybersecurity
          advice. Independently investigate important decisions and consult a
          qualified professional where appropriate.
        </p>
      </section>
      <section>
        <h2>No guarantee</h2>
        <p>
          The project does not guarantee accuracy, completeness, availability,
          or timeliness. Third-party databases can contain errors; new threats
          may not be listed; legitimate sites may trigger indicators; and a site
          may be compromised without its owner’s knowledge.
        </p>
      </section>
      <section>
        <h2>Do not infer wrongdoing</h2>
        <p>
          The operator does not independently verify every third-party result.
          Do not use a result to harass, threaten, defame, or accuse a person or
          business. A high score does not prove fraud, illegality, criminal
          intent, ownership, or malicious conduct.
        </p>
      </section>
      <section>
        <h2>Use at your own risk</h2>
        <p>
          The software is provided without warranties to the extent permitted by
          law. Liability limitations apply only to the extent permitted by law
          and do not waive rights that cannot legally be waived.
        </p>
      </section>
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 font-semibold text-amber-950">
        Legal documents must be reviewed by an attorney before public launch. No
        technical design, disclaimer, license, or terms document can guarantee
        zero liability or make a project “lawsuit-proof.”
      </p>
    </ArticleShell>
  );
}
