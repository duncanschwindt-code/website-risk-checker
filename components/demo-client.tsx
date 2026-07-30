"use client";

import { useState } from "react";

import { ResultView } from "@/components/result-view";
import { DEMO_CASES } from "@/lib/demo";
import type { AnalysisResult } from "@/lib/types";

export function DemoClient(): React.ReactElement {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function openCase(caseId: string): Promise<void> {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/demo?case=${encodeURIComponent(caseId)}`,
      );
      if (!response.ok)
        throw new Error("The demonstration could not be loaded.");
      setResult((await response.json()) as AnalysisResult);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The demonstration could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div
        role="status"
        className="rounded-xl border border-amber-300 bg-amber-100 px-5 py-4 text-sm font-bold text-amber-950"
      >
        Demonstration mode uses simulated data. No live threat-intelligence
        services were checked.
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {DEMO_CASES.map((demo) => (
          <article
            key={demo.id}
            className="rounded-2xl border border-[#dce4e8] bg-white p-5"
          >
            <p className="text-xs font-extrabold tracking-wide text-[#087f7b] uppercase">
              Reserved example domain
            </p>
            <h2 className="mt-2 text-xl font-extrabold text-[#10243f]">
              {demo.label}
            </h2>
            <p className="mt-2 font-mono text-sm text-[#53647d]">
              {demo.domain}
            </p>
            <p className="mt-3 text-sm leading-6 text-[#53647d]">
              {demo.description}
            </p>
            <button
              type="button"
              disabled={loading}
              onClick={() => openCase(demo.id)}
              className="mt-5 min-h-11 rounded-xl bg-[#087f7b] px-5 text-sm font-extrabold text-white disabled:bg-slate-400"
            >
              View this example
            </button>
          </article>
        ))}
      </div>
      {error ? (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-900"
        >
          {error}
        </p>
      ) : null}
      {result ? (
        <div className="mt-12 border-t border-[#dce4e8] pt-10">
          <ResultView result={result} />
        </div>
      ) : null}
    </>
  );
}
