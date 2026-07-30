import Link from "next/link";

export default function NotFound(): React.ReactElement {
  return (
    <div className="mx-auto max-w-3xl px-5 py-24 text-center sm:px-8">
      <p className="text-sm font-extrabold tracking-wide text-[#087f7b] uppercase">
        404
      </p>
      <h1 className="display-face mt-3 text-5xl font-bold text-[#10243f]">
        Page not found.
      </h1>
      <p className="mt-5 text-[#53647d]">
        The requested page does not exist or has moved.
      </p>
      <Link
        href="/"
        className="mt-7 inline-flex min-h-12 items-center rounded-xl bg-[#087f7b] px-6 font-extrabold text-white no-underline"
      >
        Return home
      </Link>
    </div>
  );
}
