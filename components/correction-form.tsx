"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

interface CorrectionResponse {
  reference: string;
  mailto: string;
  stored: boolean;
  message: string;
}

interface CorrectionError {
  error?: { message?: string };
}

export function CorrectionForm(): React.ReactElement {
  const searchParams = useSearchParams();
  const [resultId, setResultId] = useState(searchParams.get("result") ?? "");
  const [reason, setReason] = useState("fresh-check");
  const [explanation, setExplanation] = useState("");
  const [supportingInformation, setSupportingInformation] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [response, setResponse] = useState<CorrectionResponse | null>(null);

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setResponse(null);
    try {
      const apiResponse = await fetch("/api/corrections/reference", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          resultId,
          reason,
          explanation,
          supportingInformation,
          contactEmail,
        }),
      });
      const data = (await apiResponse.json()) as
        CorrectionResponse | CorrectionError;
      if (!apiResponse.ok || !("reference" in data)) {
        throw new Error(
          "error" in data
            ? (data.error?.message ?? "The request could not be prepared.")
            : "The request could not be prepared.",
        );
      }
      setResponse(data);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The request could not be prepared.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="card-shadow rounded-[1.75rem] border border-[#dce4e8] bg-white p-6 sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-extrabold text-[#17243b]">
            Result ID
          </span>
          <input
            value={resultId}
            onChange={(event) => setResultId(event.target.value)}
            required
            maxLength={100}
            autoComplete="off"
            className="mt-2 min-h-12 w-full rounded-xl border-2 border-slate-300 px-4"
          />
        </label>
        <label className="block">
          <span className="text-sm font-extrabold text-[#17243b]">
            Request type
          </span>
          <select
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl border-2 border-slate-300 bg-white px-4"
          >
            <option value="fresh-check">Request a fresh check</option>
            <option value="inaccurate-result">
              Explain a potentially inaccurate result
            </option>
            <option value="expired-result">
              Report an expired provider result
            </option>
            <option value="site-repaired">Report a repaired website</option>
            <option value="deletion-request">
              Request deletion of retained information
            </option>
            <option value="other">Other correction</option>
          </select>
        </label>
      </div>
      <label className="mt-5 block">
        <span className="text-sm font-extrabold text-[#17243b]">
          What should be reviewed?
        </span>
        <textarea
          value={explanation}
          onChange={(event) => setExplanation(event.target.value)}
          required
          minLength={20}
          maxLength={4_000}
          rows={6}
          className="mt-2 w-full rounded-xl border-2 border-slate-300 p-4"
          aria-describedby="explanation-help"
        />
        <span
          id="explanation-help"
          className="mt-1 block text-xs text-[#53647d]"
        >
          Give specific dates and provider names where possible. Do not include
          government ID or unrelated personal information.
        </span>
      </label>
      <label className="mt-5 block">
        <span className="text-sm font-extrabold text-[#17243b]">
          Supporting information (optional)
        </span>
        <textarea
          value={supportingInformation}
          onChange={(event) => setSupportingInformation(event.target.value)}
          maxLength={2_000}
          rows={3}
          className="mt-2 w-full rounded-xl border-2 border-slate-300 p-4"
        />
      </label>
      <label className="mt-5 block max-w-lg">
        <span className="text-sm font-extrabold text-[#17243b]">
          Reply email
        </span>
        <input
          type="email"
          value={contactEmail}
          onChange={(event) => setContactEmail(event.target.value)}
          required
          maxLength={254}
          autoComplete="email"
          className="mt-2 min-h-12 w-full rounded-xl border-2 border-slate-300 px-4"
        />
      </label>
      <p className="mt-5 rounded-xl bg-[#dff5f4] px-4 py-3 text-sm leading-6 text-[#075e5b]">
        This form prepares a private email draft and reference number. The
        application does not store the form. Review the draft and send it from
        your email program to complete the request.
      </p>
      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-900"
        >
          {error}
        </p>
      ) : null}
      {response ? (
        <div
          role="status"
          className="mt-4 rounded-xl border border-[#9bd6d3] bg-[#dff5f4] p-5 text-sm text-[#075e5b]"
        >
          <p className="font-extrabold">Reference: {response.reference}</p>
          <p className="mt-2 leading-6">{response.message}</p>
          <a
            href={response.mailto}
            className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#087f7b] px-5 font-extrabold text-white no-underline"
          >
            Review private email draft
          </a>
        </div>
      ) : null}
      <button
        type="submit"
        disabled={submitting}
        className="mt-6 min-h-12 rounded-xl bg-[#087f7b] px-6 font-extrabold text-white disabled:bg-slate-400"
      >
        {submitting ? "Preparing…" : "Generate private reference"}
      </button>
    </form>
  );
}
