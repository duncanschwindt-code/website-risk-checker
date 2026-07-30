import type { Metadata } from "next";

import { DemoClient } from "@/components/demo-client";

export const metadata: Metadata = {
  title: "Demonstration",
  description:
    "Explore simulated Website Risk Checker results using reserved example domains.",
};

export default function DemoPage(): React.ReactElement {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
      <p className="text-sm font-extrabold tracking-wide text-[#087f7b] uppercase">
        Safe practice
      </p>
      <h1 className="display-face mt-2 text-5xl font-bold text-[#10243f]">
        Explore example results.
      </h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-[#53647d]">
        These examples show how scores, evidence, uncertainty, and next steps
        are presented. They use reserved domains and local fixtures—never a live
        suspicious website.
      </p>
      <div className="mt-8">
        <DemoClient />
      </div>
    </div>
  );
}
