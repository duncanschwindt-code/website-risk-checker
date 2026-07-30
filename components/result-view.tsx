import Link from "next/link";

import type { AnalysisResult, ProviderStatus, RiskCategory } from "@/lib/types";

const categoryTone: Record<
  RiskCategory,
  { panel: string; bar: string; label: string }
> = {
  "Lower observed risk": {
    panel: "border-sky-200 bg-sky-50",
    bar: "bg-sky-600",
    label: "text-sky-950",
  },
  "Some caution recommended": {
    panel: "border-amber-200 bg-amber-50",
    bar: "bg-amber-500",
    label: "text-amber-950",
  },
  "Elevated observed risk": {
    panel: "border-orange-200 bg-orange-50",
    bar: "bg-orange-600",
    label: "text-orange-950",
  },
  "Strong warning indicators": {
    panel: "border-rose-200 bg-rose-50",
    bar: "bg-rose-700",
    label: "text-rose-950",
  },
};

const statusLabel: Record<ProviderStatus, string> = {
  MATCH: "Match",
  NO_MATCH: "No match",
  UNAVAILABLE: "Unavailable",
  RATE_LIMITED: "Rate limited",
  NOT_CONFIGURED: "Not configured",
  TERMS_RESTRICTED: "Terms restricted",
  STALE_RESULT: "Stale result",
  INVALID_RESPONSE: "Invalid response",
  ERROR: "Error",
};

function formatDate(value: string | null): string {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(date) + " UTC";
}

function providerStatusClass(status: ProviderStatus): string {
  if (status === "MATCH") return "border-rose-200 bg-rose-50 text-rose-900";
  if (status === "NO_MATCH") return "border-sky-200 bg-sky-50 text-sky-900";
  if (status === "STALE_RESULT")
    return "border-amber-200 bg-amber-50 text-amber-950";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

export function ResultView({
  result,
}: {
  result: AnalysisResult;
}): React.ReactElement {
  const tone = categoryTone[result.category];
  const providerCounts = {
    checked: result.providers.filter((provider) => !provider.unavailable)
      .length,
    unavailable: result.providers.filter((provider) => provider.unavailable)
      .length,
    rateLimited: result.providers.filter(
      (provider) => provider.status === "RATE_LIMITED",
    ).length,
    notConfigured: result.providers.filter(
      (provider) => provider.status === "NOT_CONFIGURED",
    ).length,
  };

  return (
    <div className="space-y-8">
      {result.mode === "demo" ? (
        <div
          role="status"
          className="rounded-xl border border-amber-300 bg-amber-100 px-5 py-4 text-sm font-bold text-amber-950"
        >
          Demonstration mode uses simulated data. No live threat-intelligence
          services were checked.
        </div>
      ) : null}

      <section
        aria-labelledby="score-heading"
        className={`card-shadow rounded-[1.75rem] border p-6 sm:p-8 ${tone.panel}`}
      >
        <div className="grid gap-8 lg:grid-cols-[0.65fr_1.35fr] lg:items-center">
          <div>
            <p className="text-sm font-extrabold tracking-wide uppercase">
              Observed risk score
            </p>
            <div className="mt-2 flex items-end gap-2">
              <span
                className={`display-face text-7xl leading-none font-bold ${tone.label}`}
              >
                {result.score}
              </span>
              <span className="pb-2 text-lg font-bold text-[#53647d]">
                / 100
              </span>
            </div>
            <div
              className="mt-5 h-3 overflow-hidden rounded-full bg-white/80"
              role="meter"
              aria-label={`Observed risk score: ${result.score} out of 100`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={result.score}
            >
              <div
                className={`progress-stripes h-full ${tone.bar}`}
                style={{ width: `${result.score}%` }}
              />
            </div>
          </div>
          <div>
            <h1
              id="score-heading"
              className={`display-face text-4xl font-bold ${tone.label}`}
            >
              {result.category}
            </h1>
            <p className="mt-3 text-base leading-7 font-semibold text-[#17243b]">
              {result.summary}
            </p>
            <p className="mt-4 rounded-xl border border-black/10 bg-white/70 px-4 py-3 text-sm leading-6 text-[#17243b]">
              This score reflects limited automated signals available at the
              time of the check. It is not proof that a website is safe, unsafe,
              legitimate, fraudulent, or illegal.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="check-details-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-extrabold tracking-wide text-[#087f7b] uppercase">
              Check record
            </p>
            <h2
              id="check-details-title"
              className="mt-1 text-2xl font-extrabold text-[#10243f]"
            >
              What was assessed
            </h2>
          </div>
          <p className="text-xs font-bold text-[#53647d]">
            Automated result · ID {result.id}
          </p>
        </div>
        <dl className="mt-5 grid overflow-hidden rounded-2xl border border-[#dce4e8] bg-white sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Normalized domain", result.normalizedDomain],
            ["Original input (redacted)", result.originalInputRedacted],
            [
              "Final domain after redirects",
              result.finalDomain ?? "Not available",
            ],
            ["Checked", formatDate(result.checkedAt)],
            ["Scoring version", result.scoringVersion],
            ["Cache expiration", formatDate(result.cacheExpiresAt)],
          ].map(([term, value]) => (
            <div
              key={term}
              className="border-b border-[#dce4e8] p-5 last:border-b-0 sm:border-r"
            >
              <dt className="text-xs font-extrabold tracking-wide text-[#53647d] uppercase">
                {term}
              </dt>
              <dd className="mt-2 text-sm font-semibold break-words text-[#17243b]">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        aria-labelledby="confidence-title"
        className="rounded-2xl border border-[#dce4e8] bg-white p-6"
      >
        <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="grid size-20 place-items-center rounded-full bg-[#dff5f4] text-center">
            <span className="text-sm font-black text-[#075e5b]">
              {result.confidence}
            </span>
          </div>
          <div>
            <h2
              id="confidence-title"
              className="text-xl font-extrabold text-[#10243f]"
            >
              {result.confidence
                .toLowerCase()
                .replace(/^./, (letter) => letter.toUpperCase())}{" "}
              confidence
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#53647d]">
              {result.confidenceExplanation}
            </p>
            <p className="mt-2 text-xs font-semibold text-[#53647d]">
              {providerCounts.checked} checked · {providerCounts.notConfigured}{" "}
              not configured · {providerCounts.unavailable} unavailable ·{" "}
              {providerCounts.rateLimited} rate limited
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="providers-title">
        <h2
          id="providers-title"
          className="text-2xl font-extrabold text-[#10243f]"
        >
          Threat-intelligence providers
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#53647d]">
          A no-match response is not proof of safety. A missing, unavailable, or
          rate-limited provider contributes zero points.
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {result.providers.map((provider) => (
            <article
              key={provider.providerId}
              className="rounded-2xl border border-[#dce4e8] bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="font-extrabold text-[#10243f]">
                  {provider.providerName}
                </h3>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-extrabold ${providerStatusClass(provider.status)}`}
                >
                  {statusLabel[provider.status]}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#53647d]">
                {provider.explanation}
              </p>
              <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                <div>
                  <dt className="font-extrabold text-[#53647d] uppercase">
                    Freshness
                  </dt>
                  <dd className="mt-1 text-[#17243b]">
                    {provider.dataFreshness}
                  </dd>
                </div>
                <div>
                  <dt className="font-extrabold text-[#53647d] uppercase">
                    Last update
                  </dt>
                  <dd className="mt-1 text-[#17243b]">
                    {formatDate(provider.lastUpdatedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="font-extrabold text-[#53647d] uppercase">
                    URL disclosed
                  </dt>
                  <dd className="mt-1 text-[#17243b]">
                    {provider.urlSentToProvider
                      ? "Yes, redacted lookup URL"
                      : "No"}
                  </dd>
                </div>
                <div>
                  <dt className="font-extrabold text-[#53647d] uppercase">
                    Finding type
                  </dt>
                  <dd className="mt-1 text-[#17243b]">
                    {provider.resultType.toLowerCase()} ·{" "}
                    {provider.confidence.toLowerCase()} confidence
                  </dd>
                </div>
              </dl>
              <p className="mt-4 border-t border-[#dce4e8] pt-3 text-xs leading-5 text-[#53647d]">
                {provider.attribution}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="evidence-title">
        <h2
          id="evidence-title"
          className="text-2xl font-extrabold text-[#10243f]"
        >
          Evidence and incomplete checks
        </h2>
        {result.indicators.length > 0 ? (
          <ol className="mt-5 space-y-4">
            {result.indicators.map((indicator) => (
              <li
                key={indicator.id}
                className="rounded-2xl border border-[#dce4e8] bg-white p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold tracking-wide text-[#087f7b] uppercase">
                      {indicator.source}
                    </p>
                    <h3 className="mt-1 font-extrabold text-[#10243f]">
                      {indicator.finding}
                    </h3>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-extrabold text-slate-700">
                    {indicator.points > 0
                      ? `+${indicator.points} points`
                      : "0 points"}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#53647d]">
                  {indicator.explanation}
                </p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-[#53647d]">
                  <span>
                    {indicator.evidenceKind.replaceAll("_", " ").toLowerCase()}
                  </span>
                  <span>
                    {indicator.direct ? "Direct" : "Inferred"} finding
                  </span>
                  <span>{indicator.confidence.toLowerCase()} confidence</span>
                  <span>{indicator.dataFreshness}</span>
                  {indicator.mayBeStale ? <span>May be stale</span> : null}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 rounded-2xl border border-[#dce4e8] bg-white p-5 text-sm text-[#53647d]">
            No indicators were available to display. This is not proof of
            safety.
          </p>
        )}
      </section>

      <section
        aria-labelledby="next-steps-title"
        className="rounded-[1.75rem] bg-[#10243f] p-6 text-white sm:p-8"
      >
        <h2 id="next-steps-title" className="display-face text-3xl font-bold">
          Practical next steps
        </h2>
        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {result.nextSteps.map((step) => (
            <li
              key={step}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-200"
            >
              {step}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="limitations-result-title">
        <h2
          id="limitations-result-title"
          className="text-2xl font-extrabold text-[#10243f]"
        >
          Limitations
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-[#53647d]">
          {result.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
        <p className="mt-5 rounded-xl border border-[#dce4e8] bg-white p-5 text-sm leading-6 font-semibold text-[#17243b]">
          Website Risk Checker is an educational tool that reports limited
          automated risk indicators. Results may be incomplete, outdated, or
          incorrect. A low score does not guarantee that a website is safe, and
          a high score does not prove fraud, illegality, or malicious intent. Do
          not rely on this tool as the sole basis for sending money, sharing
          personal information, accusing another person or business, or making
          legal, financial, or cybersecurity decisions.
        </p>
        <div className="no-print mt-5 flex flex-wrap gap-5 text-sm font-extrabold text-[#075e5b]">
          <Link href={`/corrections?result=${encodeURIComponent(result.id)}`}>
            Request a correction →
          </Link>
          <Link href="/methodology">Review the scoring system →</Link>
          <Link href="/disclaimer">Read the full disclaimer →</Link>
        </div>
      </section>
    </div>
  );
}
