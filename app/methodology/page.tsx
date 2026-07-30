import type { Metadata } from "next";

import { scoringConfig } from "@/lib/analysis/scoring";

export const metadata: Metadata = {
  title: "Scoring methodology",
  description:
    "The transparent, versioned Website Risk Checker scoring methodology.",
};

const ranges = [
  ["0–24", "Lower observed risk"],
  ["25–49", "Some caution recommended"],
  ["50–74", "Elevated observed risk"],
  ["75–100", "Strong warning indicators"],
];

export default function MethodologyPage(): React.ReactElement {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
      <p className="text-sm font-extrabold tracking-wide text-[#087f7b] uppercase">
        Transparent by design
      </p>
      <h1 className="display-face mt-2 text-5xl font-bold text-[#10243f]">
        How the score works.
      </h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-[#53647d]">
        Methodology version {scoringConfig.methodologyVersion} uses published
        rules—no secret model, intent inference, protected characteristics, or
        popularity penalty.
      </p>

      <section aria-labelledby="ranges-title" className="mt-10">
        <h2
          id="ranges-title"
          className="text-2xl font-extrabold text-[#10243f]"
        >
          Score ranges
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ranges.map(([range, label]) => (
            <div
              key={range}
              className="rounded-2xl border border-[#dce4e8] bg-white p-5"
            >
              <p className="display-face text-3xl font-bold text-[#087f7b]">
                {range}
              </p>
              <p className="mt-2 text-sm font-extrabold text-[#10243f]">
                {label}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-6 text-[#53647d]">
          The score reflects limited automated signals available at check time.
          It is not proof that a website is safe, unsafe, legitimate,
          fraudulent, or illegal.
        </p>
      </section>

      <section aria-labelledby="principles-title" className="mt-12">
        <h2
          id="principles-title"
          className="text-2xl font-extrabold text-[#10243f]"
        >
          Scoring principles
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {[
            "Current, confirmed database matches carry substantially more weight than formatting heuristics.",
            `All weak local heuristics together are capped at ${scoringConfig.weakSignalCap} points.`,
            "Unavailable providers, errors, missing keys, and rate limits always contribute zero points.",
            "No-match responses never remove points and are never described as proof of safety.",
            "Multiple independent matches can raise confidence; community entry counts alone cannot create the maximum score.",
            "New, small, foreign, multilingual, inexpensive, individual-run, or unpopular websites are not penalized merely for those traits.",
          ].map((principle) => (
            <p
              key={principle}
              className="rounded-2xl border border-[#dce4e8] bg-white p-5 text-sm leading-6 text-[#53647d]"
            >
              {principle}
            </p>
          ))}
        </div>
      </section>

      <section aria-labelledby="rules-title" className="mt-12">
        <h2 id="rules-title" className="text-2xl font-extrabold text-[#10243f]">
          Published rules
        </h2>
        <div className="mt-5 space-y-4">
          {scoringConfig.rules.map((rule) => (
            <details
              key={rule.id}
              className="group rounded-2xl border border-[#dce4e8] bg-white p-5 open:ring-2 open:ring-[#9bd6d3]"
            >
              <summary className="cursor-pointer list-none font-extrabold text-[#10243f]">
                <span className="flex flex-wrap items-center justify-between gap-3">
                  <span>{rule.name}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                    Up to {rule.maximumContribution} points ·{" "}
                    {rule.signalClass.toLowerCase()}
                  </span>
                </span>
              </summary>
              <dl className="mt-5 grid gap-4 text-sm leading-6 sm:grid-cols-2">
                <div>
                  <dt className="font-extrabold text-[#17243b]">
                    Rule ID and version
                  </dt>
                  <dd className="text-[#53647d]">
                    {rule.id} · {rule.ruleVersion}
                  </dd>
                </div>
                <div>
                  <dt className="font-extrabold text-[#17243b]">Confidence</dt>
                  <dd className="text-[#53647d]">
                    {rule.confidence.toLowerCase()}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-extrabold text-[#17243b]">
                    Evidence required
                  </dt>
                  <dd className="text-[#53647d]">
                    {rule.evidenceRequirements}
                  </dd>
                </div>
                <div>
                  <dt className="font-extrabold text-[#17243b]">
                    Why it matters
                  </dt>
                  <dd className="text-[#53647d]">{rule.explanation}</dd>
                </div>
                <div>
                  <dt className="font-extrabold text-[#17243b]">
                    False-positive considerations
                  </dt>
                  <dd className="text-[#53647d]">
                    {rule.falsePositiveConsiderations}
                  </dd>
                </div>
                <div>
                  <dt className="font-extrabold text-[#17243b]">Expiration</dt>
                  <dd className="text-[#53647d]">{rule.expirationPeriod}</dd>
                </div>
              </dl>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
