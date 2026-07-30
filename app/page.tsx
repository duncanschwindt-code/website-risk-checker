import Link from "next/link";

import { AnalyzerForm } from "@/components/analyzer-form";
import { getServerConfig } from "@/lib/config";
import { getProviderPublicMetadata } from "@/lib/providers";

const steps = [
  {
    number: "01",
    title: "We protect the input",
    text: "Private and internal destinations are blocked. Query strings and fragments are removed before display or lookup.",
  },
  {
    number: "02",
    title: "We compare limited signals",
    text: "Configured threat-intelligence lookups and passive technical checks report observable evidence—not accusations.",
  },
  {
    number: "03",
    title: "You decide what to verify",
    text: "The result explains uncertainty and gives practical next steps. It never guarantees safety or proves wrongdoing.",
  },
];

export default function HomePage(): React.ReactElement {
  const config = getServerConfig();
  const providers = getProviderPublicMetadata(config);
  return (
    <>
      <section className="subtle-grid border-b border-[#dce4e8]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#9bd6d3] bg-[#dff5f4] px-3 py-1.5 text-xs font-extrabold tracking-wide text-[#075e5b] uppercase">
              Educational, careful, transparent
            </div>
            <h1 className="display-face mt-6 max-w-3xl text-5xl leading-[0.98] font-bold text-[#10243f] sm:text-6xl lg:text-7xl">
              Pause before you trust a link.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#53647d] sm:text-xl">
              Website Risk Checker looks for limited, observable warning signs
              and explains what they mean in plain language.
            </p>
            <p className="mt-5 max-w-2xl border-l-4 border-[#f27a62] pl-4 text-sm leading-6 font-bold text-[#17243b]">
              This project identifies observable risk signals. It does not
              determine guilt, intent, legality, safety, or trustworthiness.
            </p>
            <div className="mt-7 flex flex-wrap gap-4 text-sm font-bold">
              <Link href="/methodology" className="text-[#075e5b]">
                See the scoring methodology →
              </Link>
              <Link href="/corrections" className="text-[#075e5b]">
                Request a correction →
              </Link>
            </div>
          </div>
          <AnalyzerForm mode={config.APP_MODE} providers={providers} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.65fr_1.35fr]">
          <div>
            <p className="text-sm font-extrabold tracking-wide text-[#087f7b] uppercase">
              How it works
            </p>
            <h2 className="display-face mt-3 text-4xl font-bold text-[#10243f]">
              Useful signals, without a secret verdict.
            </h2>
          </div>
          <ol className="grid gap-4 sm:grid-cols-3">
            {steps.map((step) => (
              <li
                key={step.number}
                className="rounded-2xl border border-[#dce4e8] bg-white p-5"
              >
                <span className="text-xs font-black tracking-widest text-[#a63f2f]">
                  {step.number}
                </span>
                <h3 className="mt-3 text-lg font-extrabold text-[#10243f]">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#53647d]">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-10 sm:px-8">
        <div className="rounded-[1.75rem] bg-[#10243f] px-6 py-8 text-white sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div>
            <p className="text-sm font-extrabold tracking-wide text-[#75d1cd] uppercase">
              Try it without a live URL
            </p>
            <h2 className="display-face mt-2 text-3xl font-bold">
              Explore clearly labeled example results.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Demonstration cases use reserved example domains and mocked
              provider responses. They never contact a submitted website.
            </p>
          </div>
          <Link
            href="/demo"
            className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-white px-6 font-extrabold text-[#10243f] no-underline lg:mt-0"
          >
            Open demonstration
          </Link>
        </div>
      </section>

      <section
        aria-labelledby="limitations-title"
        className="mx-auto max-w-4xl px-5 py-12 sm:px-8"
      >
        <h2
          id="limitations-title"
          className="text-2xl font-extrabold text-[#10243f]"
        >
          Important limitations
        </h2>
        <p className="mt-4 text-base leading-7 text-[#53647d]">
          Automated results may be incomplete, outdated, or incorrect. New
          threats may not appear in any database, legitimate websites may
          trigger warning indicators, and a compromised website may have been
          repaired. Never use one automated result as the sole basis for sending
          money, sharing personal information, or accusing a person or business.
        </p>
      </section>
    </>
  );
}
