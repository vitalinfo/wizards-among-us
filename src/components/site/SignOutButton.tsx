import { useTranslations } from "next-intl";

import { logout } from "@/app/auth/actions";

// Signing out. It used to live in the site header and was the only control
// that did it anywhere; the header now carries a single round button that
// leads to the account instead, which is what the design draws, so this moved
// to the pages that button leads to — the same place the design's account
// shell puts it.
//
// A form posting to the server action, never a link: signing out is a state
// change, and a GET that ends a session is followable by a prefetcher.
//
// No confirmation. Signing out is not destructive and the cost of an accidental
// one is signing back in, which on Telegram is two taps.
export function SignOutButton({ className }: { className?: string }) {
  const t = useTranslations("common");

  return (
    <form action={logout} className={className}>
      {/* Spelled out rather than built from buttonStyles: that base fixes the
          height at h-13, and overriding it here would leave two height
          utilities in one class string for Tailwind's emit order to settle. */}
      <button
        type="submit"
        className="border-border text-body hover:bg-surface-muted focus-visible:outline-ring inline-flex h-10 items-center justify-center rounded-md border-[1.5px] px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {t("signOut")}
      </button>
    </form>
  );
}
