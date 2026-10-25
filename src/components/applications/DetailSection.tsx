import type { ReactNode } from "react";

// A titled block on the full application card — «Про мрію», «Доставка».
// Children are DetailRows, or any other content when `list` is false.
export function DetailSection({
  title,
  list = true,
  children,
}: {
  title: string;
  list?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold tracking-[-0.03em]">{title}</h2>
      {list ? (
        <dl className="mt-6 flex flex-col gap-[14px]">{children}</dl>
      ) : (
        <div className="mt-6">{children}</div>
      )}
    </section>
  );
}
