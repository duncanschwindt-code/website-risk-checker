import Link from "next/link";

const links = [
  { href: "/", label: "Check a website" },
  { href: "/methodology", label: "Methodology" },
  { href: "/demo", label: "Demonstration" },
  { href: "/corrections", label: "Corrections" },
];

export function SiteHeader(): React.ReactElement {
  return (
    <header className="border-b border-[#dce4e8] bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-3 no-underline"
          aria-label="Website Risk Checker home"
        >
          <span
            aria-hidden="true"
            className="grid size-10 place-items-center rounded-xl bg-[#10243f] text-sm font-black tracking-wider text-white"
          >
            TAS
          </span>
          <span>
            <span className="block text-sm font-extrabold tracking-tight text-[#10243f]">
              Website Risk Checker
            </span>
            <span className="block text-xs font-semibold text-[#087f7b]">
              Teens Against Scams
            </span>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-[#53647d]">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-[#075e5b]">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
