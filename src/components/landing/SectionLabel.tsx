import type { ReactNode } from "react";

// The small solid-blue pill above each section heading («Про проєкт», «Як це
// працює», «Наші ініціативи», «FAQ», «Галерея»).
//
// Not `ui/Badge`: that one is a TINTED status chip used inside the app to
// carry meaning (approved / claimed / …). This is a decorative section label
// on a marketing page, it is solid, and it must never be mistaken for state.
// Same shape, different job — so a different component rather than a variant.
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="bg-primary text-primary-foreground inline-flex items-center rounded-full px-2 py-2 text-[13px] leading-5 font-medium lg:px-3 lg:py-3 lg:text-sm">
      {children}
    </span>
  );
}
