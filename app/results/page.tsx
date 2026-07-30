import type { Metadata } from "next";

import { ResultsClient } from "@/components/results-client";

export const metadata: Metadata = {
  title: "Your result",
  description: "A private, device-local Website Risk Checker result.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function ResultsPage(): React.ReactElement {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <ResultsClient />
    </div>
  );
}
