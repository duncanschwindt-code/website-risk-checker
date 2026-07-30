"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  return (
    <div className="mx-auto max-w-3xl px-5 py-24 text-center sm:px-8">
      <h1 className="display-face text-5xl font-bold text-[#10243f]">
        Something went wrong.
      </h1>
      <p className="mt-5 text-[#53647d]">
        No result should be treated as complete. Try again, or return later.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-7 min-h-12 rounded-xl bg-[#087f7b] px-6 font-extrabold text-white"
      >
        Try again
      </button>
    </div>
  );
}
