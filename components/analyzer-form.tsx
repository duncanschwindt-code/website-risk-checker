"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AnalysisResult, ProviderPublicMetadata } from "@/lib/types";

interface AnalyzerFormProps {
  mode: "live" | "demo";
  providers: ProviderPublicMetadata[];
}

interface ApiError {
  error?: { code?: string; message?: string };
}

export function AnalyzerForm({
  mode,
  providers,
}: AnalyzerFormProps): React.ReactElement {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const enabledProviders = providers.filter(
    (provider) => provider.enabled && provider.configured,
  );

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (mode === "demo") {
      router.push("/demo");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await response.json()) as AnalysisResult | ApiError;
      if (!response.ok || "error" in data) {
        throw new Error(
          "error" in data
            ? (data.error?.message ?? "The check could not be completed.")
            : "Check failed.",
        );
      }
      sessionStorage.setItem("wrc:last-result", JSON.stringify(data));
      router.push("/results");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The check could not be completed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card-shadow rounded-[1.75rem] border border-[#dce4e8] bg-white p-5 sm:p-8">
      <form onSubmit={submit} noValidate>
        <label
          htmlFor="website-url"
          className="block text-sm font-extrabold text-[#10243f]"
        >
          Website address
        </label>
        <p id="url-hint" className="mt-1 text-sm leading-6 text-[#53647d]">
          Enter a public http or https address. Query strings and fragments are
          removed.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            id="website-url"
            name="website-url"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={2048}
            required
            disabled={submitting || mode === "demo"}
            aria-describedby={`url-hint privacy-warning${error ? " form-error" : ""}`}
            aria-invalid={Boolean(error)}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com"
            className="min-h-14 min-w-0 flex-1 rounded-xl border-2 border-slate-300 bg-white px-4 text-base text-[#17243b] placeholder:text-slate-400 disabled:bg-slate-100"
          />
          <button
            type="submit"
            disabled={submitting}
            className="min-h-14 rounded-xl bg-[#087f7b] px-7 text-base font-extrabold text-white shadow-sm transition-colors hover:bg-[#075e5b] disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {mode === "demo"
              ? "Open demonstration"
              : submitting
                ? "Checking…"
                : "Analyze website"}
          </button>
        </div>
        {submitting ? (
          <p
            role="status"
            className="mt-3 text-sm font-semibold text-[#075e5b]"
          >
            Checking available sources and limited passive signals. This can
            take a few seconds.
          </p>
        ) : null}
        {error ? (
          <p
            id="form-error"
            role="alert"
            className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900"
          >
            {error}
          </p>
        ) : null}
      </form>

      <div
        id="privacy-warning"
        className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-950"
      >
        <p className="font-extrabold">Keep private links private.</p>
        <p className="mt-1">
          Do not submit password-reset links, private documents, account links,
          session URLs, invitation links, URLs containing personal information,
          or other confidential addresses. The domain or URL may be checked
          through third-party threat-intelligence services.
        </p>
      </div>

      <div className="mt-5 text-sm leading-6 text-[#53647d]">
        <p className="font-bold text-[#17243b]">
          Provider disclosure for this deployment
        </p>
        {enabledProviders.length > 0 ? (
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {enabledProviders.map((provider) => (
              <li key={provider.id}>
                {provider.name}: {provider.submissionPrivacy}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2">
            No live provider adapter is both enabled and configured. Provider
            unavailability will not change the score.
          </p>
        )}
        <p className="mt-3">
          No unknown URL is submitted for a new public scan.{" "}
          <Link href="/privacy" className="font-bold text-[#075e5b]">
            Read the privacy design
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
