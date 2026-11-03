import Link from "next/link";

// A count in the users table that opens the applications behind it. Zero stays
// plain text: a link to an empty list is a tab stop that leads nowhere.
//
// The label names the person and the column — the bare digit is all a
// screen reader's links list would otherwise read out.
export function CountLink({
  count,
  href,
  label,
}: {
  count: number;
  href: string;
  label: string;
}) {
  if (count === 0) {
    return <>{count}</>;
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className="text-primary font-semibold underline underline-offset-4"
    >
      {count}
    </Link>
  );
}
