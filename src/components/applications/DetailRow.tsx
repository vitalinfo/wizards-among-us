import type { ReactNode } from "react";

// One labelled line on the full application card: the label in a fixed column
// from lg, stacked on a phone, exactly as the design draws both. A row with
// nothing to show is not drawn — a draft is mostly empty.
export function DetailRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string | null;
  children?: ReactNode;
}) {
  if (!children && !value) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2 text-sm tracking-[-0.03em] lg:flex-row lg:gap-[21px]">
      <dt className="text-muted-foreground lg:w-[203px] lg:shrink-0">
        {label}
      </dt>
      <dd className="min-w-0 whitespace-pre-wrap lg:max-w-[504px]">
        {children ?? value}
      </dd>
    </div>
  );
}
