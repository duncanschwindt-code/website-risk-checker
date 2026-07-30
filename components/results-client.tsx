"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { ResultView } from "@/components/result-view";
import type { AnalysisResult } from "@/lib/types";

const RESULT_STORAGE_KEY = "wrc:last-result";
const RESULT_CHANGE_EVENT = "wrc-result-change";

function subscribeToResult(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(RESULT_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(RESULT_CHANGE_EVENT, onStoreChange);
  };
}

function getResultSnapshot(): string | null {
  return sessionStorage.getItem(RESULT_STORAGE_KEY);
}

function getServerResultSnapshot(): null {
  return null;
}

function appearsToBeResult(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AnalysisResult>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.score === "number" &&
    typeof candidate.normalizedDomain === "string" &&
    Array.isArray(candidate.providers) &&
    Array.isArray(candidate.indicators)
  );
}

export function ResultsClient(): React.ReactElement {
  const stored = useSyncExternalStore(
    subscribeToResult,
    getResultSnapshot,
    getServerResultSnapshot,
  );
  let result: AnalysisResult | null = null;
  try {
    const parsed: unknown = stored ? JSON.parse(stored) : null;
    result = appearsToBeResult(parsed) ? parsed : null;
  } catch {
    result = null;
  }

  if (!result) {
    return (
      <section className="rounded-[1.75rem] border border-[#dce4e8] bg-white p-8 text-center">
        <h1 className="display-face text-4xl font-bold text-[#10243f]">
          No result is stored here.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#53647d]">
          Results are kept only in this browser tab and are not placed in a
          public history.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-[#087f7b] px-6 font-extrabold text-white no-underline"
        >
          Check a website
        </Link>
      </section>
    );
  }

  return (
    <>
      <ResultView result={result} />
      <div className="no-print mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-11 rounded-xl border-2 border-[#087f7b] px-5 text-sm font-extrabold text-[#075e5b]"
        >
          Print this result
        </button>
        <button
          type="button"
          onClick={() => {
            sessionStorage.removeItem(RESULT_STORAGE_KEY);
            window.dispatchEvent(new Event(RESULT_CHANGE_EVENT));
          }}
          className="min-h-11 rounded-xl border-2 border-slate-300 px-5 text-sm font-extrabold text-slate-700"
        >
          Clear this device-only result
        </button>
      </div>
    </>
  );
}
