export function ArticleShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
      <p className="text-sm font-extrabold tracking-wide text-[#087f7b] uppercase">
        {eyebrow}
      </p>
      <h1 className="display-face mt-2 text-5xl font-bold text-[#10243f]">
        {title}
      </h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-[#53647d]">{intro}</p>
      <article className="mt-10 space-y-9 text-base leading-7 text-[#53647d] [&_a]:font-bold [&_a]:text-[#075e5b] [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:text-[#10243f] [&_h3]:text-lg [&_h3]:font-extrabold [&_h3]:text-[#17243b] [&_li]:my-1.5 [&_ul]:list-disc [&_ul]:pl-6">
        {children}
      </article>
    </div>
  );
}
