import type { Metadata } from "next";
import { Suspense } from "react";

import { CorrectionForm } from "@/components/correction-form";

export const metadata: Metadata = {
  title: "Request a correction",
  description: "Privately request a review of a Website Risk Checker result.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function CorrectionsPage(): React.ReactElement {
  return (
    <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
      <p className="text-sm font-extrabold tracking-wide text-[#087f7b] uppercase">
        Private correction process
      </p>
      <h1 className="display-face mt-2 text-5xl font-bold text-[#10243f]">
        Ask us to review a result.
      </h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-[#53647d]">
        Website owners and authorized representatives can request a fresh check,
        identify stale data, report a repaired site, or explain why a result may
        be inaccurate.
      </p>
      <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        Correction requests are private. Do not open a public GitHub issue. A
        request does not guarantee that the score will change, and government
        identification is not required.
      </div>
      <div className="mt-8">
        <Suspense fallback={<p>Preparing the private correction form…</p>}>
          <CorrectionForm />
        </Suspense>
      </div>
    </div>
  );
}
