import Link from "next/link";

export function SiteFooter(): React.ReactElement {
  return (
    <footer className="mt-20 border-t border-[#dce4e8] bg-[#10243f] text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="text-sm font-bold text-[#75d1cd]">
            Teens Against Scams
          </p>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-300">
            Educational tools for spotting warning signs, asking better
            questions, and getting help before sharing money or personal
            information.
          </p>
        </div>
        <div>
          <p className="text-sm font-bold">Project</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>
              <Link href="/methodology">Scoring methodology</Link>
            </li>
            <li>
              <Link href="/corrections">Request a correction</Link>
            </li>
            <li>
              <Link href="/demo">Demonstration mode</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-bold">Legal &amp; safety</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>
              <Link href="/privacy">Privacy</Link>
            </li>
            <li>
              <Link href="/terms">Terms</Link>
            </li>
            <li>
              <Link href="/disclaimer">Disclaimer</Link>
            </li>
            <li>
              <a href="https://github.com/" rel="noreferrer">
                Source code
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-5 text-center text-xs leading-5 text-slate-400">
        Source code is MIT licensed. The license does not replace privacy
        disclosures, website terms, provider terms, responsible operation,
        security safeguards, or attorney review.
      </div>
    </footer>
  );
}
